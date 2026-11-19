/* Coupe Studio — Worker Cloudflare (V2, étape 1).
   Garde la clé Gemini côté serveur et relaie deux demandes de l'appli :
     POST /image  { photos: [base64 JPEG…], prompt }  →  { image: base64, mime, reste }
     POST /texte  { photos: [base64 JPEG…], prompt, json? }  →  { texte, reste }  (json: true = réponse JSON seule)
     Erreur : { erreur: CODE } avec CODE = ORIGINE, ACCES, QUOTA (+ limite), DEMANDE, REFUS, QUOTA_GOOGLE, DELAI, SERVEUR.
     GET  /etat                                        →  { ok, images, textes } (quota restant, pour vérifier l'installation)

   Règles :
   - La clé (GEMINI_API_KEY) et les codes d'accès des salons (ACCES, séparés par des virgules)
     sont des secrets Wrangler. Ils ne sont jamais dans le dépôt.
   - CORS : seule l'origine ORIGINE (le site GitHub Pages) est servie. Toute autre origine reçoit 403.
   - En-tête X-Acces obligatoire : le code du salon.
   - Quota par code et par jour (heure de Paris) : QUOTA_IMAGES images, QUOTA_TEXTES textes.
   - Rien n'est stocké : ni photo, ni prompt, ni réponse. Le KV ne garde qu'un compteur
     (empreinte du code + date + nombre), effacé au bout de 2 jours. Aucun contenu n'est écrit
     dans les journaux. Chez Google, `store: false` empêche la conservation de l'échange.

   API Gemini : « Interactions API » (doc Google AI lue le 16 novembre 2026).
   Les noms des modèles sont dans wrangler.toml (MODELE_IMAGE, MODELE_TEXTE). */

const ADRESSE_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const REVISION_API = '2026-05-20';
const DELAI_MS = 80000;
const PHOTOS_MAX = 3;
const TAILLE_PHOTO_MAX = 2_000_000; // caractères base64 : une photo de 1024 px en pèse 100 000 à 400 000
const TAILLE_PROMPT_MAX = 12000;
const TAILLE_CORPS_MAX = 7_000_000;
const DUREE_COMPTEUR_S = 172800; // 2 jours

/* Codes d'erreur de Google qui veulent dire « demande refusée » (doc : Generation blocked codes). */
const REFUS_GOOGLE = ['safety', 'recitation', 'language', 'prohibited_content', 'spii', 'blocklist',
  'image_safety', 'image_prohibited_content', 'image_recitation', 'image_other', 'content_blocked', 'no_image'];
const SATURATION_GOOGLE = ['rate_limit_exceeded', 'quota_exceeded', 'too_many_requests', 'service_unavailable'];

function origines(env) {
  return String(env.ORIGINE || '').split(',').map((o) => o.trim()).filter(Boolean);
}

function entetesCors(origine) {
  return {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Acces',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  };
}

function reponse(statut, corps, origine) {
  const entetes = origine ? entetesCors(origine) : { 'Cache-Control': 'no-store' };
  entetes['Content-Type'] = 'application/json; charset=utf-8';
  return new Response(JSON.stringify(corps), { status: statut, headers: entetes });
}

function erreur(statut, code, origine) {
  return reponse(statut, { erreur: code }, origine);
}

async function empreinte(texte) {
  const octets = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)));
  return Array.from(octets).map((o) => o.toString(16).padStart(2, '0')).join('');
}

/* Le code envoyé est-il l'un des codes du secret ACCES ? On compare des empreintes, pas les textes. */
async function codeValide(code, env) {
  const codes = String(env.ACCES || '').split(',').map((c) => c.trim()).filter(Boolean);
  if (!code || !codes.length) return null;
  const recu = await empreinte(code);
  let trouve = false;
  for (const c of codes) { if ((await empreinte(c)) === recu) trouve = true; }
  return trouve ? recu.slice(0, 16) : null;
}

/* Date du jour à Paris, « 2026-11-16 ». */
function jourParis(maintenant) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(maintenant || new Date());
}

function limite(env, type) {
  const n = parseInt(type === 'image' ? env.QUOTA_IMAGES : env.QUOTA_TEXTES, 10);
  return Number.isFinite(n) && n >= 0 ? n : (type === 'image' ? 30 : 60);
}

function cleCompteur(idCode, type) {
  return 'q:' + idCode + ':' + jourParis() + ':' + type;
}

async function compte(env, idCode, type) {
  const n = parseInt(await env.QUOTAS.get(cleCompteur(idCode, type)), 10);
  return Number.isFinite(n) ? n : 0;
}

async function compterUn(env, idCode, type, deja) {
  await env.QUOTAS.put(cleCompteur(idCode, type), String(deja + 1), { expirationTtl: DUREE_COMPTEUR_S });
}

function base64Valide(texte) {
  return typeof texte === 'string' && texte.length > 100 && texte.length <= TAILLE_PHOTO_MAX && /^[A-Za-z0-9+/]+={0,2}$/.test(texte);
}

/* Lit et vérifie { photos, prompt }. Renvoie null si la demande est mal formée. */
async function lireDemande(requete) {
  if (parseInt(requete.headers.get('Content-Length') || '0', 10) > TAILLE_CORPS_MAX) return null;
  const brut = await requete.text();
  if (!brut || brut.length > TAILLE_CORPS_MAX) return null;
  let corps;
  try { corps = JSON.parse(brut); } catch (e) { return null; }
  if (!corps || typeof corps.prompt !== 'string') return null;
  const prompt = corps.prompt.trim();
  if (!prompt || prompt.length > TAILLE_PROMPT_MAX) return null;
  const photos = Array.isArray(corps.photos) ? corps.photos : [];
  if (photos.length < 1 || photos.length > PHOTOS_MAX || !photos.every(base64Valide)) return null;
  return { prompt, photos, json: corps.json === true };
}

/* Appelle Gemini. Renvoie { image, mime } ou { texte }, ou { erreur: code }. */
async function appelerGemini(env, type, demande) {
  const corps = {
    model: type === 'image' ? env.MODELE_IMAGE : env.MODELE_TEXTE,
    input: [{ type: 'text', text: demande.prompt }].concat(demande.photos.map((data) => ({ type: 'image', mime_type: 'image/jpeg', data }))),
    store: false // Google ne garde pas l'échange
  };
  if (type === 'image') corps.response_format = { type: 'image', mime_type: 'image/jpeg' };
  /* Texte en JSON (pré-diagnostic) : Google renvoie un JSON seul. */
  else if (demande.json) corps.response_format = { type: 'text', mime_type: 'application/json' };

  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), DELAI_MS);
  let rep;
  let json = null;
  try {
    rep = await fetch(ADRESSE_GEMINI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY, 'Api-Revision': REVISION_API },
      body: JSON.stringify(corps),
      signal: controle.signal
    });
    try { json = await rep.json(); } catch (e) { json = null; }
  } catch (e) {
    return { erreur: e && e.name === 'AbortError' ? 'DELAI' : 'SERVEUR' };
  } finally {
    clearTimeout(minuterie);
  }

  const codeGoogle = json && json.error && typeof json.error.code === 'string' ? json.error.code : null;
  if (!rep.ok || codeGoogle) {
    /* Journal : le statut et le code de Google seulement. Jamais le message (il peut citer la demande). */
    console.error('gemini', rep.status, codeGoogle || 'sans-code');
    if (REFUS_GOOGLE.indexOf(codeGoogle) >= 0) return { erreur: 'REFUS' };
    if (rep.status === 429 || rep.status === 503 || SATURATION_GOOGLE.indexOf(codeGoogle) >= 0) return { erreur: 'QUOTA_GOOGLE' };
    if (rep.status === 504 || codeGoogle === 'deadline_exceeded') return { erreur: 'DELAI' };
    return { erreur: 'SERVEUR' };
  }

  const morceaux = [];
  (json && Array.isArray(json.steps) ? json.steps : []).forEach((etape) => {
    if (etape && etape.type === 'model_output' && Array.isArray(etape.content)) etape.content.forEach((c) => morceaux.push(c));
  });
  if (type === 'image') {
    const image = morceaux.filter((c) => c && c.type === 'image' && typeof c.data === 'string' && c.data)[0];
    if (!image) { console.error('gemini', 'sans-image', json && json.status); return { erreur: 'REFUS' }; }
    return { image: image.data, mime: image.mime_type || 'image/jpeg' };
  }
  const texte = morceaux.filter((c) => c && c.type === 'text' && typeof c.text === 'string').map((c) => c.text).join('').trim();
  if (!texte) { console.error('gemini', 'sans-texte', json && json.status); return { erreur: 'REFUS' }; }
  return { texte };
}

export default {
  async fetch(requete, env) {
    const origine = requete.headers.get('Origin');
    if (!origine || origines(env).indexOf(origine) < 0) return erreur(403, 'ORIGINE', null);
    if (requete.method === 'OPTIONS') return new Response(null, { status: 204, headers: entetesCors(origine) });

    const chemin = new URL(requete.url).pathname.replace(/\/+$/, '') || '/';
    const type = chemin === '/image' ? 'image' : (chemin === '/texte' ? 'texte' : null);
    const etat = chemin === '/etat' && requete.method === 'GET';
    if (!etat && !(type && requete.method === 'POST')) return erreur(404, 'INCONNU', origine);

    if (!env.GEMINI_API_KEY || !env.ACCES || !env.QUOTAS) { console.error('reglage', 'secret ou KV manquant'); return erreur(500, 'SERVEUR', origine); }
    const idCode = await codeValide(requete.headers.get('X-Acces'), env);
    if (!idCode) return erreur(401, 'ACCES', origine);

    if (etat) {
      return reponse(200, {
        ok: true,
        images: Math.max(0, limite(env, 'image') - await compte(env, idCode, 'image')),
        textes: Math.max(0, limite(env, 'texte') - await compte(env, idCode, 'texte'))
      }, origine);
    }

    const deja = await compte(env, idCode, type);
    if (deja >= limite(env, type)) return reponse(429, { erreur: 'QUOTA', limite: limite(env, type) }, origine);

    const demande = await lireDemande(requete);
    if (!demande) return erreur(400, 'DEMANDE', origine);

    const resultat = await appelerGemini(env, type, demande);
    if (resultat.erreur) {
      const statut = { REFUS: 422, QUOTA_GOOGLE: 503, DELAI: 504 }[resultat.erreur] || 502;
      return erreur(statut, resultat.erreur, origine);
    }
    /* Seules les réponses réussies comptent dans le quota du jour. */
    await compterUn(env, idCode, type, deja);
    resultat.reste = Math.max(0, limite(env, type) - deja - 1);
    return reponse(200, resultat, origine);
  }
};
