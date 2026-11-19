/* Test du parcours V2 : génération dans l'appli.
   Le VRAI code du Worker (worker/src/index.js) tourne ici, dans un petit serveur local.
   Seul Google est simulé (aucun appel réseau vers Gemini, aucune clé).
   Les photos sont des images de synthèse (formes géométriques) : aucune personne.
   Lancer : node tests/v2.test.js */
'use strict';
const http = require('http');
const path = require('path');
const { pathToFileURL } = require('url');
const { RACINE, ADRESSE, chromium } = require('./outils');

let echecs = 0;
let reussites = 0;
function verifier(nom, obtenu, attendu) {
  const ok = arguments.length === 2 ? obtenu === true : JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (ok) { reussites++; console.log('  OK      ' + nom); return; }
  echecs++;
  console.log('  ÉCHEC   ' + nom + '\n            attendu : ' + JSON.stringify(attendu) + '\n            obtenu  : ' + JSON.stringify(obtenu));
}

const SUITE = ' Relance ou passe par Gemini (Copier).';
const CONSENTEMENT = 'Le client accepte que sa photo soit envoyée à Google pour l’essai.';
const CLE = 'cle-google-de-test';

/* Largeur et hauteur d'un JPEG en base64 (marqueur SOF). */
function tailleJpeg(base64) {
  const o = Buffer.from(base64, 'base64');
  if (o[0] !== 0xFF || o[1] !== 0xD8) return 'pas un JPEG';
  let i = 2;
  while (i < o.length) {
    if (o[i] !== 0xFF) { i++; continue; }
    const m = o[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return o.readUInt16BE(i + 7) + 'x' + o.readUInt16BE(i + 5);
    i += 2 + o.readUInt16BE(i + 2);
  }
  return 'taille inconnue';
}

(async () => {
  const worker = (await import(pathToFileURL(path.join(RACINE, 'worker', 'src', 'index.js')).href)).default;

  /* ---- Google simulé : une image de taille différente à chaque appel, pour suivre l'enchaînement. ---- */
  const google = { appels: [], mode: 'ok', images: [], preDiagnostic: { visage: 'long', texture: 'boucles', front: 'golfes-marques', longueur: 'courte', lunettes: 'non', peau: 'mate', yeux: 'fonces', style: 'Sweat à capuche, allure décontractée.', remarque: 'Golfes marqués : éviter de dégager le front.' }, texte: 'VERDICT : ✅ FAISABLE MAINTENANT\nRAISON : longueur suffisante.' };
  const fetchReel = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return fetchReel(url, options);
    const corps = JSON.parse(options.body);
    const appel = { modele: corps.model, store: corps.store, format: corps.response_format, cle: options.headers['x-goog-api-key'], prompt: corps.input[0].text, photos: corps.input.slice(1).map((p) => tailleJpeg(p.data)) };
    google.appels.push(appel);
    const json = (statut, c) => new Response(JSON.stringify(c), { status: statut });
    if (google.mode === 'sature') return json(429, { error: { code: 'rate_limit_exceeded', message: 'x' } });
    if (google.mode === 'refus') return json(400, { error: { code: 'image_safety', message: 'x' } });
    if (corps.model === 'modele-texte' && appel.prompt.startsWith('You are an expert hairdresser. Analyze')) {
      return json(200, { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(google.preDiagnostic) }] }] });
    }
    if (corps.model === 'modele-texte') return json(200, { status: 'completed', steps: [{ type: 'thought', signature: 's' }, { type: 'model_output', content: [{ type: 'text', text: google.texte }] }] });
    const n = google.appels.filter((a) => a.modele === 'modele-image').length;
    return json(200, { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'image', mime_type: 'image/png', data: google.images[(n - 1) % google.images.length] }] }] });
  };

  /* ---- Le Worker, servi en local. L'appli est ouverte en file:// : son origine est « null ». ---- */
  const kv = new Map();
  const env = {
    GEMINI_API_KEY: CLE, ACCES: 'salon-test', ORIGINE: 'null', MODELE_IMAGE: 'modele-image', MODELE_TEXTE: 'modele-texte',
    QUOTA_IMAGES: '30', QUOTA_TEXTES: '60',
    QUOTAS: { async get(k) { return kv.has(k) ? kv.get(k) : null; }, async put(k, v) { kv.set(k, v); } }
  };
  const recues = [];
  const serveur = http.createServer((req, res) => {
    const morceaux = [];
    req.on('data', (m) => morceaux.push(m));
    req.on('end', async () => {
      const corps = Buffer.concat(morceaux);
      if (req.method !== 'OPTIONS') recues.push({ chemin: req.url, acces: req.headers['x-acces'] || null, origine: req.headers.origin || null });
      const rep = await worker.fetch(new Request('http://127.0.0.1' + req.url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? corps : undefined }), env);
      const entetes = {};
      rep.headers.forEach((v, k) => { entetes[k] = v; });
      res.writeHead(rep.status, entetes);
      res.end(Buffer.from(await rep.arrayBuffer()));
    });
  });
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  const ADRESSE_WORKER = 'http://127.0.0.1:' + serveur.address().port;

  const navigateur = await chromium.launch();
  const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  /* config.js est livré vide : le test donne l'adresse du Worker local à sa place. */
  await contexte.addInitScript((adresse) => {
    Object.defineProperty(window, 'CONFIG', { get() { return { worker: adresse + '/' }; }, set() { /* config.js ignoré */ } });
  }, ADRESSE_WORKER);
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto(ADRESSE);

  /* Images de synthèse, fabriquées dans le navigateur. */
  const dessin = (l, h, type) => page.evaluate(([largeur, hauteur, t]) => {
    const c = document.createElement('canvas');
    c.width = largeur; c.height = hauteur;
    const x = c.getContext('2d');
    x.fillStyle = '#9aa7b1'; x.fillRect(0, 0, largeur, hauteur);
    x.fillStyle = '#4b5a66'; x.beginPath(); x.arc(largeur / 2, hauteur / 2, Math.min(largeur, hauteur) / 3, 0, 7); x.fill();
    x.fillStyle = '#e8e2d5'; x.fillRect(largeur / 8, hauteur / 8, largeur / 5, hauteur / 5);
    return c.toDataURL(t).split(',')[1];
  }, [l, h, type]);
  const selfie = Buffer.from(await dessin(3000, 2000, 'image/jpeg'), 'base64'); // plus grande que 1024 px
  const reference = Buffer.from(await dessin(800, 1600, 'image/png'), 'base64');
  google.images = [await dessin(210, 300, 'image/png'), await dessin(220, 300, 'image/png'), await dessin(230, 300, 'image/png'), await dessin(240, 300, 'image/png'), await dessin(250, 300, 'image/png'), await dessin(260, 300, 'image/png')];

  const A = (f, arg) => page.evaluate(f, arg);
  const etape = (id) => '#etapes [data-etape="' + id + '"]';
  const boutons = (id) => page.$$eval(etape(id) + ' .btn-2', (b) => b.map((x) => x.textContent + (x.disabled ? ' (bloqué)' : '')).join(' + '));
  const manque = async (id) => (await page.$(etape(id) + ' [data-manque]')) ? page.textContent(etape(id) + ' [data-manque]') : '';
  const erreurDe = async (id) => (await page.$(etape(id) + ' [data-erreur]')) ? page.textContent(etape(id) + ' [data-erreur]') : '';
  const generer = async (id) => {
    await page.click(etape(id) + ' [data-generer]');
    await page.waitForFunction(() => window.CoupeStudio.v2.enCours === null);
  };
  const prompts = () => A(() => { const p = {}; window.CoupeStudio.etapesResultat().forEach((e) => { p[e.id] = e.texte; }); return p; });
  const dernier = () => google.appels[google.appels.length - 1];

  /* ============ 1. Avant la photo ============ */
  console.log('1. « Passer » la photo : à Résultat, le code puis « Ajouter la photo du client »');
  await page.click('[data-mode="barber"]');
  await page.click('#action-accueil');
  verifier('« Commencer » ouvre Diagnostic · Photo', await A(() => window.CoupeStudio.etat.ecran), 'photo');
  verifier('Worker réglé, pas de code : champ du code et case d’accord affichés', [await page.isVisible('#bloc-code-photo'), await page.isVisible('#accord-photo')], [true, true]);
  await page.click('#passer-photo');
  await page.click('#vers-catalogues');
  await page.click('#ecran-choix a[href="#catalogue"]');
  await page.click('#ecran-catalogue [data-coupe="skin-fade"]');
  await page.click('#vers-caracteristiques');
  await page.click('[data-caracteristique="permanente"]');
  await page.click('[data-caracteristique="platine"]');
  await page.click('#ecran-personnalise .btn');
  verifier('carte « Génération dans l’appli » visible', (await page.isVisible('#generation')) && (await page.textContent('#generation h2')) === 'Génération dans l’appli');
  verifier('sans code : aide affichée, photos cachées', [await page.isVisible('#generation-aide'), await page.isVisible('#generation-photos')], [true, false]);
  verifier('sans code : les étapes gardent « Copier » et « Ouvrir Gemini »', await boutons('diagnostic'), 'Copier + Ouvrir Gemini');
  verifier('5 étapes : Diagnostic, Image, Texture, Couleur, Fiche', await page.$$eval('#etapes [data-etape]', (c) => c.map((x) => x.getAttribute('data-etape')).join(' ')), 'diagnostic image texture couleur fiche');
  await page.fill('#code-acces', 'mauvais-code');
  verifier('code saisi : « Générer » à la place de « Copier / Ouvrir Gemini »', [await boutons('diagnostic'), await boutons('image'), await page.$$eval('#etapes .prompt', (p) => p.length)], ['Générer (bloqué)', 'Générer (bloqué)', 0]);
  verifier('sous-titre de la V2', await page.textContent('#sous-titre-resultat'), 'Ajoute la photo du client, puis génère chaque étape.');
  verifier('plus de case d’accord sur Résultat', await page.$$eval('#ecran-resultat input[type="checkbox"]', (c) => c.length), 0);
  verifier('sans photo : « Ajoute la photo du client. » et le bouton « Ajouter la photo du client »', [await manque('diagnostic'), await page.textContent('#choisir-selfie')], ['Ajoute la photo du client.', 'Ajouter la photo du client']);

  /* ============ 2. Écran Photo : photo, accord, code refusé, pré-diagnostic ============ */
  console.log('2. Diagnostic · Photo : photo, accord, code refusé, pré-diagnostic');
  await page.click('#choisir-selfie');
  verifier('« Ajouter la photo du client » ramène à Diagnostic · Photo', await A(() => window.CoupeStudio.etat.ecran), 'photo');
  verifier('code déjà enregistré : le champ du code n’est plus demandé', await page.isVisible('#bloc-code-photo'), false);
  verifier('consigne photo', await page.textContent('#consigne-photo-client'), 'Tête droite, face à l’objectif. Si elle est tournée, Gemini la redresse.');
  verifier('sans photo, le bouton principal prend la photo', await page.textContent('#action-photo'), 'Prendre la photo');
  await page.setInputFiles('#fichier-selfie', { name: 'client.jpg', mimeType: 'image/jpeg', buffer: selfie });
  await page.waitForFunction(() => !!window.CoupeStudio.v2.selfie);
  verifier('photo réduite à 1024 px au plus grand côté, en JPEG', tailleJpeg((await A(() => window.CoupeStudio.v2.selfie)).split(',')[1]), '1024x683');
  verifier('aperçu, « Changer la photo », bouton « Continuer »', [await page.isVisible('#apercu-client'), await page.isVisible('#changer-photo-client'), await page.textContent('#action-photo')], [true, true, 'Continuer']);
  verifier('texte de l’accord, non coché par défaut', [await page.textContent('#texte-consentement'), await page.isChecked('#consentement')], [CONSENTEMENT, false]);
  await page.click('#action-photo');
  verifier('sans accord : message, rien n’est envoyé', [await page.textContent('#message-photo'), recues.length], ['Coche l’accord du client, ou touche « Passer ».', 0]);
  await page.check('#consentement');
  await page.click('#action-photo');
  await page.waitForFunction(() => !window.CoupeStudio.v2.analyse);
  verifier('code refusé : message, le champ du code revient', [await page.textContent('#message-photo'), await page.isVisible('#bloc-code-photo')],
    ['Code d’accès refusé. Vérifie le code du salon. Touche « Continuer » pour réessayer, ou « Passer ».', true]);
  verifier('Google n’a pas été appelé', google.appels.length, 0);
  await page.fill('#code-acces-photo', 'salon-test');
  verifier('nouveau code : le message disparaît', await page.isVisible('#message-photo'), false);
  await page.click('#action-photo');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'questions');
  verifier('pré-diagnostic : /texte, avec la photo, réponse JSON demandée', [recues[recues.length - 1].chemin, dernier().photos, dernier().format], ['/texte', ['1024x683'], { type: 'text', mime_type: 'application/json' }]);
  verifier('pré-diagnostic : prompt de PROMPTS.md, sans la ligne [RÉFÉRENTIEL]', dernier().prompt, await A(() => window.PROMPTS.preDiagnostic()));
  verifier('le JSON remplit le profil (« long » → « allonge »)', await A(() => window.CoupeStudio.etat.profil),
    { texture: 'boucles', visage: 'allonge', front: 'golfes-marques', longueur: 'courte', lunettes: 'non', peau: 'mate', yeux: 'fonces', style: 'Sweat à capuche, allure décontractée.', remarque: 'Golfes marqués : éviter de dégager le front.' });
  verifier('le profil s’affiche dans le résumé', await page.$$eval('#lignes-profil [data-ligne] .carte-titre', (b) => b.map((x) => x.textContent).join(', ')), 'Bouclés, Allongé, Golfes marqués, Courte, Non, Mate, Foncés');
  verifier('les règles suivent le profil (densité faible : ligne Density)', await A(() => window.CoupeStudio.descAnglaise(window.CoupeStudio.creation()).includes('Density: use only the existing hair')));
  await page.goBack();
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'photo');
  await page.click('#action-photo');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'questions');
  verifier('même photo : pas de 2e analyse', google.appels.length, 1);
  await page.goBack();
  await page.goBack();
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'resultat');
  verifier('retour à Résultat : la même photo, pas de 2e prise', [await page.isVisible('#vignette-selfie'), await page.textContent('#choisir-selfie')], [true, 'Changer la photo du client']);
  verifier('le code corrigé sur l’écran Photo vaut aussi ici', await page.inputValue('#code-acces'), 'salon-test');
  verifier('photo et accord donnés : Diagnostic et Image prêts', [await boutons('diagnostic'), await boutons('image')], ['Générer', 'Générer']);
  verifier('Texture attend l’image, Couleur attend la texture, Fiche attend la couleur', [await manque('texture'), await manque('couleur'), await manque('fiche')],
    ['Génère d’abord l’étape Image.', 'Génère d’abord l’étape Texture.', 'Génère d’abord l’étape Couleur.']);

  /* ============ 4. Enchaînement ============ */
  console.log('4. Étapes enchaînées selon « joindre »');
  const P = await prompts();
  await generer('diagnostic');
  verifier('diagnostic : le texte de Gemini s’affiche', await page.textContent(etape('diagnostic') + ' .reponse'), google.texte);
  verifier('diagnostic : « Copier » et « Relancer »', await boutons('diagnostic'), 'Copier + Relancer');
  verifier('envoi : /texte, code en en-tête, origine du site', recues[recues.length - 1], { chemin: '/texte', acces: 'salon-test', origine: 'null' });
  verifier('Gemini reçoit le prompt exact du diagnostic, la photo à 1024 px, store: false, la clé du Worker',
    dernier(), { modele: 'modele-texte', store: false, cle: CLE, prompt: P.diagnostic, photos: ['1024x683'] });
  await generer('image');
  verifier('image : prompt image exact, la photo du client', [dernier().modele, dernier().prompt === P.image, dernier().photos], ['modele-image', true, ['1024x683']]);
  verifier('image : avant / après côte à côte', await page.$$eval(etape('image') + ' .avant-apres figure', (f) => f.map((x) => x.querySelector('figcaption').textContent + ':' + x.querySelector('img').naturalWidth).join(' ')), 'Avant:1024 Après:210');
  verifier('image : « Relancer » et « Enregistrer »', await boutons('image'), 'Relancer + Enregistrer');
  verifier('sous l’image : relancer si le résultat est bizarre', await page.textContent(etape('image') + ' .consigne.discret'), 'Résultat bizarre (tête tournée, frange en trop) ? Relance la génération.');
  verifier('Texture devient prête, Couleur attend encore', [await boutons('texture'), await manque('couleur')], ['Générer', 'Génère d’abord l’étape Texture.']);
  await generer('texture');
  verifier('texture : reçoit l’image de l’étape Image (210 px), prompt Texture exact', [dernier().photos, dernier().prompt === P.texture], [['210x300'], true]);
  await generer('couleur');
  verifier('couleur : reçoit l’image de l’étape Texture (220 px), prompt Couleur exact', [dernier().photos, dernier().prompt === P.couleur], [['220x300'], true]);
  await generer('fiche');
  verifier('fiche : la photo du client puis la dernière image (Couleur, 230 px), prompt de la fiche', [dernier().modele, dernier().photos, dernier().prompt === P.fiche], ['modele-texte', ['1024x683', '230x300'], true]);
  verifier('pré-diagnostic + 5 générations : 6 appels à Google', google.appels.length, 6);

  /* ============ 5. Relancer, Enregistrer ============ */
  console.log('5. Relancer et Enregistrer');
  await generer('image');
  verifier('image relancée : nouvelle image affichée', await page.$eval(etape('image') + ' [data-image-generee]', (i) => i.naturalWidth), 240);
  verifier('les étapes qui partaient de l’ancienne image sont « à refaire »', await page.$$eval('#etapes [data-etape]', (c) => c.filter((x) => Array.from(x.querySelectorAll('.alerte')).some((a) => a.textContent === 'À refaire : l’image d’avant a changé.')).map((x) => x.getAttribute('data-etape')).join(' ')), 'texture couleur fiche');
  verifier('le diagnostic n’est pas touché', await page.$$eval(etape('diagnostic') + ' .alerte:not([hidden])', (a) => a.length), 0);
  verifier('Couleur est bloquée tant que Texture n’est pas refaite', [await boutons('couleur'), await manque('couleur')], ['Relancer (bloqué) + Enregistrer', 'Génère d’abord l’étape Texture.']);
  await generer('texture');
  verifier('texture refaite : part de la nouvelle image (240 px)', dernier().photos, ['240x300']);
  const telechargement = page.waitForEvent('download');
  await page.click(etape('texture') + ' [data-enregistrer-image]');
  verifier('« Enregistrer » télécharge l’image', (await telechargement).suggestedFilename(), 'coupe-studio-texture.jpg');
  verifier('…et rappelle l’appui long', await page.textContent('#aide-image-texture'), 'Image envoyée dans tes téléchargements. Si rien ne s’est passé : appui long sur l’image « Après », puis « Enregistrer ».');

  /* ============ 6. Retour arrière, réglage changé ============ */
  console.log('6. Retour arrière : rien n’est perdu ; coupe changée : à refaire');
  await page.goBack();
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'personnalise');
  await page.goForward();
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'resultat');
  verifier('après un retour arrière : photo, accord et résultats toujours là', [await page.isVisible('#vignette-selfie'), await page.isChecked('#consentement'), await page.$$eval('#etapes .avant-apres', (a) => a.length), await page.$$eval('#etapes .reponse', (a) => a.length)], [true, true, 3, 2]);
  await page.goBack();
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'personnalise');
  await page.click('[data-caracteristique="contours-nets"]');
  await page.click('#ecran-personnalise .btn');
  verifier('coupe modifiée : l’image est « à refaire : la coupe a changé »', await page.$$eval(etape('image') + ' .alerte', (a) => a.map((x) => x.textContent).join()), 'À refaire : la coupe a changé.');
  verifier('…et ne sert plus d’entrée à l’étape Texture', await manque('texture'), 'Génère d’abord l’étape Image.');
  await page.goBack();
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'personnalise');
  await page.click('[data-caracteristique="contours-nets"]');
  await page.click('#ecran-personnalise .btn');

  /* ============ 7. Erreurs ============ */
  console.log('7. Erreurs en français');
  google.mode = 'sature';
  await generer('image');
  verifier('Google saturé', await erreurDe('image'), 'Google est saturé pour le moment. Attends une minute.' + SUITE);
  verifier('en erreur : l’ancienne image reste, et la V1 est proposée', [await page.$$eval(etape('image') + ' .avant-apres', (a) => a.length), await boutons('image')], [1, 'Relancer + Enregistrer + Copier + Ouvrir Gemini']);
  google.mode = 'refus';
  await generer('image');
  verifier('refus de Gemini', await erreurDe('image'), 'Gemini a refusé cette demande ou n’a rien rendu.' + SUITE);
  google.mode = 'ok';
  await page.route(ADRESSE_WORKER + '/**', (route) => route.abort());
  await generer('diagnostic');
  verifier('réseau coupé', await erreurDe('diagnostic'), 'Pas de connexion au service. Vérifie le réseau.' + SUITE);
  await page.unroute(ADRESSE_WORKER + '/**');
  env.QUOTA_IMAGES = '3';
  await generer('image');
  verifier('quota du jour atteint (limite donnée par le Worker)', await erreurDe('image'), 'Limite du jour atteinte : 3 images par jour.' + SUITE);
  env.QUOTA_IMAGES = '30';
  env.QUOTA_TEXTES = '2';
  await generer('diagnostic');
  verifier('quota des textes', await erreurDe('diagnostic'), 'Limite du jour atteinte : 2 textes par jour.' + SUITE);
  env.QUOTA_TEXTES = '60';
  await generer('image');
  verifier('après une relance réussie : l’erreur disparaît', await erreurDe('image'), '');

  /* ============ 8. Photo de référence ============ */
  console.log('8. Photo de référence');
  await page.click('[data-reference="oui"]');
  verifier('bouton « Photo de référence » affiché, l’étape Image l’attend', [await page.isVisible('#choisir-reference'), await manque('image')], [true, 'Ajoute la photo de référence.']);
  await page.setInputFiles('#fichier-reference', { name: 'reference.png', mimeType: 'image/png', buffer: reference });
  await page.waitForFunction(() => !!window.CoupeStudio.v2.reference);
  await generer('image');
  verifier('envoi : la photo du client puis la référence (1024 px au plus), prompt de la variante', [dernier().photos, dernier().prompt === (await prompts()).image, dernier().prompt.startsWith('Image 1 is the client.')], [['1024x683', '512x1024'], true, true]);
  await page.click('[data-reference="non"]');

  /* ============ 9. Rien de stocké ============ */
  console.log('9. Rien de stocké, Nouveau client');
  const stockage = await A(() => JSON.stringify(Object.assign({}, window.localStorage)) + JSON.stringify(Object.assign({}, window.sessionStorage)));
  verifier('stockage du navigateur : ni photo, ni résultat', !stockage.includes('data:image') && !stockage.includes('VERDICT') && !stockage.includes('base64'));
  verifier('le code d’accès est gardé sur le téléphone', await A(() => JSON.parse(window.localStorage.getItem('coupe-studio:acces'))), 'salon-test');
  verifier('KV du Worker : seulement des compteurs', Array.from(kv.keys()).every((k) => /^q:[0-9a-f]{16}:\d{4}-\d{2}-\d{2}:(image|texte)$/.test(k)) && Array.from(kv.values()).every((v) => /^\d+$/.test(v)));
  await page.click('#ecran-resultat [data-nouveau-client]');
  await page.click('#ecran-resultat [data-confirmer-nouveau]');
  verifier('« Nouveau client » : photos, accord et résultats effacés', await A(() => { const v = window.CoupeStudio.v2; return [v.selfie, v.reference, v.consentement, Object.keys(v.resultats).length, Object.keys(v.erreurs).length]; }), [null, null, false, 0, 0]);
  verifier('…le code reste', await A(() => window.CoupeStudio.v2Active()), true);
  await page.reload();
  verifier('après un rechargement : la photo n’est plus là (jamais stockée)', await A(() => window.CoupeStudio.v2.selfie), null);

  await navigateur.close();
  await new Promise((r) => serveur.close(r));
  verifier('aucune erreur JavaScript', erreurs.join(' | '), '');
  console.log(echecs === 0 ? '\nV2 : ' + reussites + ' vérifications réussies.' : '\nV2 : ' + echecs + ' échec(s).');
  process.exit(echecs === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
