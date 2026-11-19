/* Tests du Worker, sans réseau : Google est simulé (fetch remplacé), le KV aussi.
   Lancer : node worker/test.mjs */
import worker from './src/index.js';

let echecs = 0;
let reussites = 0;
function verifier(nom, obtenu, attendu) {
  const ok = arguments.length === 2 ? obtenu === true : JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (ok) { reussites++; console.log('  OK      ' + nom); return; }
  echecs++;
  console.log('  ÉCHEC   ' + nom + '\n            attendu : ' + JSON.stringify(attendu) + '\n            obtenu  : ' + JSON.stringify(obtenu));
}

const SITE = 'https://jolivetantoine11-source.github.io';
const PHOTO = 'A'.repeat(400);
const CLE = 'cle-secrete-de-test';

function kv() {
  const donnees = new Map();
  return { donnees, ecritures: [], async get(k) { return donnees.has(k) ? donnees.get(k) : null; }, async put(k, v, o) { donnees.set(k, v); this.ecritures.push({ k, v, o }); } };
}
function env(plus) {
  return Object.assign({ GEMINI_API_KEY: CLE, ACCES: 'salon-a, salon-b', ORIGINE: SITE, MODELE_IMAGE: 'modele-image', MODELE_TEXTE: 'modele-texte', QUOTA_IMAGES: '2', QUOTA_TEXTES: '3', QUOTAS: kv() }, plus || {});
}
function requete(chemin, options) {
  const o = Object.assign({ methode: 'POST', origine: SITE, acces: 'salon-a', corps: { photos: [PHOTO], prompt: 'Edit this photo' } }, options || {});
  const entetes = { 'Content-Type': 'application/json' };
  if (o.origine) entetes.Origin = o.origine;
  if (o.acces) entetes['X-Acces'] = o.acces;
  return new Request('https://worker.test' + chemin, { method: o.methode, headers: entetes, body: o.methode === 'POST' ? (typeof o.corps === 'string' ? o.corps : JSON.stringify(o.corps)) : undefined });
}

/* Google simulé. */
let appels = [];
let reponseGoogle = null;
globalThis.fetch = async (url, options) => {
  appels.push({ url, entetes: options.headers, corps: JSON.parse(options.body) });
  if (reponseGoogle instanceof Error) throw reponseGoogle;
  return new Response(JSON.stringify(reponseGoogle.corps), { status: reponseGoogle.statut || 200 });
};
const IMAGE_OK = { corps: { status: 'completed', steps: [{ type: 'thought', signature: 'x' }, { type: 'model_output', content: [{ type: 'image', mime_type: 'image/jpeg', data: 'SU1BR0U=' }] }] } };
const TEXTE_OK = { corps: { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'VERDICT : ' }, { type: 'text', text: 'faisable' }] }] } };

/* Rien ne doit partir dans les journaux, sauf un statut et un code. */
const journal = [];
console.error = (...a) => journal.push(a.join(' '));
console.warn = (...a) => journal.push(a.join(' '));
const logOrigine = console.log;
console.log = (...a) => { if (String(a[0]).startsWith('  ') || String(a[0]).match(/^\d\.|^\n?WORKER/)) logOrigine(...a); else journal.push(a.join(' ')); };

const lire = async (r) => ({ statut: r.status, corps: r.status === 204 ? null : await r.json(), cors: r.headers.get('Access-Control-Allow-Origin') });

console.log('1. Origine (CORS)');
let e = env();
let r = await lire(await worker.fetch(requete('/image', { origine: 'https://ailleurs.example' }), e));
verifier('autre origine : 403, sans en-tête CORS', [r.statut, r.corps, r.cors], [403, { erreur: 'ORIGINE' }, null]);
r = await lire(await worker.fetch(requete('/image', { origine: null }), e));
verifier('pas d’origine (curl) : 403', r.statut, 403);
r = await worker.fetch(requete('/image', { methode: 'OPTIONS' }), e);
verifier('pré-vérification OPTIONS : 204, origine du site, en-tête X-Acces autorisé',
  [r.status, r.headers.get('Access-Control-Allow-Origin'), r.headers.get('Access-Control-Allow-Headers')], [204, SITE, 'Content-Type, X-Acces']);
verifier('aucun appel à Google jusqu’ici', appels.length, 0);

console.log('2. Code d’accès');
r = await lire(await worker.fetch(requete('/image', { acces: null }), e));
verifier('sans code : 401', [r.statut, r.corps, r.cors], [401, { erreur: 'ACCES' }, SITE]);
r = await lire(await worker.fetch(requete('/image', { acces: 'mauvais' }), e));
verifier('mauvais code : 401', [r.statut, r.corps], [401, { erreur: 'ACCES' }]);
r = await lire(await worker.fetch(requete('/image', { acces: 'salon' }), e));
verifier('début d’un vrai code : 401', r.statut, 401);
verifier('toujours aucun appel à Google', appels.length, 0);

console.log('3. Image');
reponseGoogle = IMAGE_OK;
r = await lire(await worker.fetch(requete('/image', { corps: { photos: [PHOTO, PHOTO], prompt: '  Edit this photo  ' } }), e));
verifier('réponse : image, type, reste', [r.statut, r.corps], [200, { image: 'SU1BR0U=', mime: 'image/jpeg', reste: 1 }]);
const a = appels[0];
verifier('adresse de l’API Interactions', a.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
verifier('clé dans l’en-tête x-goog-api-key, révision de l’API', [a.entetes['x-goog-api-key'], a.entetes['Api-Revision']], [CLE, '2026-05-20']);
verifier('modèle image, store: false, sortie image', [a.corps.model, a.corps.store, a.corps.response_format], ['modele-image', false, { type: 'image', mime_type: 'image/jpeg' }]);
verifier('entrée : le prompt puis les photos, dans l’ordre', a.corps.input,
  [{ type: 'text', text: 'Edit this photo' }, { type: 'image', mime_type: 'image/jpeg', data: PHOTO }, { type: 'image', mime_type: 'image/jpeg', data: PHOTO }]);

console.log('4. Texte');
reponseGoogle = TEXTE_OK;
r = await lire(await worker.fetch(requete('/texte'), e));
verifier('réponse : texte assemblé, reste', [r.statut, r.corps], [200, { texte: 'VERDICT : faisable', reste: 2 }]);
verifier('modèle texte, store: false, pas de format image', [appels[1].corps.model, appels[1].corps.store, appels[1].corps.response_format], ['modele-texte', false, undefined]);
r = await lire(await worker.fetch(requete('/texte', { corps: { photos: [PHOTO], prompt: 'Analyze', json: true } }), e));
verifier('json: true : Google doit répondre en JSON seul', [r.statut, appels[2].corps.response_format], [200, { type: 'text', mime_type: 'application/json' }]);

console.log('5. Quota par code et par jour');
reponseGoogle = IMAGE_OK;
r = await lire(await worker.fetch(requete('/image'), e));
verifier('2e image : acceptée, reste 0', [r.statut, r.corps.reste], [200, 0]);
const avant = appels.length;
r = await lire(await worker.fetch(requete('/image'), e));
verifier('3e image (limite 2) : 429 QUOTA, Google n’est pas appelé', [r.statut, r.corps, appels.length], [429, { erreur: 'QUOTA', limite: 2 }, avant]);
r = await lire(await worker.fetch(requete('/image', { acces: 'salon-b' }), e));
verifier('un autre code a son propre quota', r.statut, 200);
reponseGoogle = TEXTE_OK;
r = await lire(await worker.fetch(requete('/texte'), e));
verifier('les textes ont leur propre compteur', [r.statut, r.corps.reste], [200, 0]);
r = await lire(await worker.fetch(requete('/etat', { methode: 'GET' }), e));
verifier('GET /etat : quota restant', [r.statut, r.corps], [200, { ok: true, images: 0, textes: 0 }]);
const cles = Array.from(e.QUOTAS.donnees.keys());
verifier('KV : seulement des compteurs « q:<empreinte>:<date>:<type> »', cles.every((k) => /^q:[0-9a-f]{16}:\d{4}-\d{2}-\d{2}:(image|texte)$/.test(k)));
verifier('KV : le code d’accès n’y est pas écrit, les valeurs sont des nombres', !JSON.stringify(Array.from(e.QUOTAS.donnees)).includes('salon') && Array.from(e.QUOTAS.donnees.values()).every((v) => /^\d+$/.test(v)));
verifier('KV : compteurs effacés au bout de 2 jours', e.QUOTAS.ecritures.every((x) => x.o.expirationTtl === 172800));

console.log('6. Erreurs');
e = env({ QUOTA_IMAGES: '30' });
const cas = async (google, chemin) => { reponseGoogle = google; const x = await lire(await worker.fetch(requete(chemin || '/image'), e)); return [x.statut, x.corps]; };
verifier('Google refuse (image_safety) : REFUS', await cas({ statut: 400, corps: { error: { code: 'image_safety', message: 'bloqué' } } }), [422, { erreur: 'REFUS' }]);
verifier('Google ne rend pas d’image : REFUS', await cas({ corps: { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Je ne peux pas.' }] }] } }), [422, { erreur: 'REFUS' }]);
verifier('Google saturé (429) : QUOTA_GOOGLE', await cas({ statut: 429, corps: { error: { code: 'rate_limit_exceeded', message: 'x' } } }), [503, { erreur: 'QUOTA_GOOGLE' }]);
verifier('clé refusée par Google (401) : SERVEUR', await cas({ statut: 401, corps: { error: { code: 'authentication', message: 'x' } } }), [502, { erreur: 'SERVEUR' }]);
verifier('réseau coupé vers Google : SERVEUR', await cas(new Error('coupure')), [502, { erreur: 'SERVEUR' }]);
verifier('texte vide : REFUS', await cas({ corps: { status: 'completed', steps: [] } }, '/texte'), [422, { erreur: 'REFUS' }]);
verifier('une erreur ne compte pas dans le quota', Array.from(e.QUOTAS.donnees.keys()).length, 0);
const mal = async (corps) => (await lire(await worker.fetch(requete('/image', { corps }), e))).corps;
verifier('demande mal formée : DEMANDE', [await mal('pas du json'), await mal({ prompt: 'x' }), await mal({ photos: [PHOTO], prompt: '' }), await mal({ photos: ['<script>'.repeat(30)], prompt: 'x' }), await mal({ photos: [PHOTO, PHOTO, PHOTO, PHOTO], prompt: 'x' })],
  Array(5).fill({ erreur: 'DEMANDE' }));
r = await lire(await worker.fetch(requete('/autre'), e));
verifier('autre chemin : 404', r.statut, 404);
r = await lire(await worker.fetch(requete('/image'), env({ GEMINI_API_KEY: '' })));
verifier('secret manquant : 500 SERVEUR', [r.statut, r.corps], [500, { erreur: 'SERVEUR' }]);

console.log('7. Rien de stocké, rien dans les journaux');
const tout = journal.join('\n');
verifier('journaux : ni photo, ni prompt, ni clé, ni code, ni message de Google', !tout.includes(PHOTO) && !tout.includes('Edit this photo') && !tout.includes(CLE) && !tout.includes('salon-a') && !tout.includes('bloqué'));
verifier('journaux : seulement des statuts et des codes', journal.every((l) => /^(gemini|reglage) /.test(l)));

console.log(echecs === 0 ? '\nWORKER : ' + reussites + ' vérifications réussies.' : '\nWORKER : ' + echecs + ' échec(s).');
process.exit(echecs === 0 ? 0 : 1);
