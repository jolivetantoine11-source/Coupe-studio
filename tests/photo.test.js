/* Test de l'écran « Diagnostic · Photo » (parcours « Diagnostic d'abord », étape 1).
   Un petit Worker simulé (serveur local) répond au pré-diagnostic ; aucune clé, aucun appel à Google.
   Les photos sont des images de synthèse : aucune personne.
   Lancer : node tests/photo.test.js */
'use strict';
const http = require('http');
const { ADRESSE, chromium } = require('./outils');

let echecs = 0;
let reussites = 0;
function verifier(nom, obtenu, attendu) {
  const ok = arguments.length === 2 ? obtenu === true : JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (ok) { reussites++; console.log('  OK      ' + nom); return; }
  echecs++;
  console.log('  ÉCHEC   ' + nom + '\n            attendu : ' + JSON.stringify(attendu) + '\n            obtenu  : ' + JSON.stringify(obtenu));
}

const SUITE = ' Touche « Continuer » pour réessayer, ou « Passer ».';
const PROFIL_VIDE = { texture: null, visage: null, front: null, longueur: null, lunettes: null, peau: null, yeux: null, style: null, remarque: null };

(async () => {
  /* ---- Worker simulé : la réponse est réglée par le test (`reponse`), chaque demande est notée. ---- */
  const recues = [];
  let reponse = { statut: 200, corps: { texte: '{}' } };
  let attente = 0;
  const serveur = http.createServer((req, res) => {
    const morceaux = [];
    req.on('data', (m) => morceaux.push(m));
    req.on('end', () => {
      const entetes = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Acces', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
      if (req.method === 'OPTIONS') { res.writeHead(204, entetes); res.end(); return; }
      recues.push({ chemin: req.url, acces: req.headers['x-acces'], corps: JSON.parse(Buffer.concat(morceaux).toString('utf8')) });
      setTimeout(() => { res.writeHead(reponse.statut, entetes); res.end(JSON.stringify(reponse.corps)); }, attente);
    });
  });
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  const WORKER = 'http://127.0.0.1:' + serveur.address().port;

  const navigateur = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (avecWorker, code) => {
    const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
    await contexte.addInitScript(([adresse, c]) => {
      Object.defineProperty(window, 'CONFIG', { get() { return { worker: adresse }; }, set() { /* config.js ignoré */ } });
      if (c) { try { localStorage.setItem('coupe-studio:acces', JSON.stringify(c)); } catch (e) { /* bloqué */ } }
    }, [avecWorker ? WORKER : '', code || '']);
    const page = await contexte.newPage();
    page.on('pageerror', (e) => erreurs.push(e.message));
    await page.goto(ADRESSE);
    return { contexte, page };
  };
  const A = (page, f, arg) => page.evaluate(f, arg);
  const ecran = (page) => A(page, () => window.CoupeStudio.etat.ecran);
  const profil = (page) => A(page, () => window.CoupeStudio.etat.profil);
  const dessin = (page) => page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1600; c.height = 1200;
    const x = c.getContext('2d');
    x.fillStyle = '#9aa7b1'; x.fillRect(0, 0, 1600, 1200);
    x.fillStyle = '#4b5a66'; x.beginPath(); x.arc(800, 600, 300, 0, 7); x.fill();
    return c.toDataURL('image/jpeg').split(',')[1];
  });
  const photo = async (page) => {
    const buffer = Buffer.from(await dessin(page), 'base64');
    await page.setInputFiles('#fichier-selfie', { name: 'client.jpg', mimeType: 'image/jpeg', buffer });
    await page.waitForFunction(() => !!window.CoupeStudio.v2.selfie);
  };
  const analyser = async (page) => {
    await page.click('#action-photo');
    await page.waitForFunction(() => !window.CoupeStudio.v2.analyse);
  };
  const message = (page) => page.isVisible('#message-photo').then((v) => (v ? page.textContent('#message-photo') : ''));

  /* ============ 1. Sans Worker : V1, pas d'IA ============ */
  console.log('1. Sans Worker : photo possible, pas d’accord demandé, aucun envoi');
  let { contexte, page } = await ouvrir(false);
  const reseau = [];
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url()) && !/fonts\.(googleapis|gstatic)\.com/.test(r.url())) reseau.push(r.url()); });
  await page.click('[data-mode="salon"]');
  await page.click('#action-accueil');
  verifier('« Commencer » ouvre Diagnostic · Photo', await ecran(page), 'photo');
  verifier('titre, étape, consigne', [await page.textContent('#titre-photo'), await page.textContent('#ecran-photo .etape'), await page.textContent('#consigne-photo-client')],
    ['Photo du client', 'Diagnostic', 'Tête droite, face à l’objectif. Si elle est tournée, Gemini la redresse.']);
  verifier('ni code ni case d’accord sans Worker', [await page.isVisible('#bloc-code-photo'), await page.isVisible('#accord-photo')], [false, false]);
  verifier('boutons : « Prendre la photo » et « Passer »', [await page.textContent('#action-photo'), await page.textContent('#passer-photo')], ['Prendre la photo', 'Passer']);
  const choix = page.waitForEvent('filechooser');
  await page.click('#action-photo');
  verifier('« Prendre la photo » ouvre l’appareil photo ou la galerie', !!(await choix));
  await photo(page);
  await page.click('#action-photo');
  verifier('« Continuer » sans Worker : profil, sans IA', [await ecran(page), await profil(page)], ['questions', PROFIL_VIDE]);
  verifier('aucune demande réseau', reseau.join(), '');
  await page.goBack();
  verifier('retour arrière : la photo est toujours là', [await ecran(page), await page.isVisible('#apercu-client'), await page.textContent('#action-photo')], ['photo', true, 'Continuer']);
  await contexte.close();

  /* ============ 2. Avec Worker : réponses du pré-diagnostic ============ */
  console.log('2. Pré-diagnostic : JSON lu, valeurs vérifiées');
  ({ contexte, page } = await ouvrir(true, 'salon-test'));
  await page.click('[data-mode="barber"]');
  await page.click('#action-accueil');
  verifier('code déjà enregistré : pas de champ du code', await page.isVisible('#bloc-code-photo'), false);
  await photo(page);
  await page.check('#consentement');
  /* JSON entouré de texte, valeurs inconnues, « fins » en barber, phrases trop longues. */
  reponse = { statut: 200, corps: { texte: 'Voici :\n```json\n' + JSON.stringify({ visage: 'coeur', texture: 'ondules', front: 'fins', longueur: 'moyenne', lunettes: 'oui', peau: 'violette', yeux: 'clairs', style: 'Veste en jean. '.repeat(30), remarque: null, age: 40 }) + '\n```' } };
  await analyser(page);
  const p1 = await profil(page);
  verifier('JSON lu même entouré de texte ; « coeur » accepté', [await ecran(page), p1.visage, p1.texture, p1.longueur, p1.lunettes, p1.yeux], ['questions', 'coeur', 'ondules', 'moyenne', 'oui', 'clairs']);
  verifier('« fins » ignoré en barber, valeur inconnue ignorée, champ en trop ignoré', [p1.front, p1.peau, p1.age], [null, null, undefined]);
  verifier('phrases coupées à 200 caractères ; null laisse vide', [p1.style.length, p1.remarque], [200, null]);
  verifier('demande : code, photo à 1024 px, prompt du pré-diagnostic, json: true',
    [recues[0].chemin, recues[0].acces, recues[0].corps.photos.length, recues[0].corps.json, recues[0].corps.prompt === await A(page, () => window.PROMPTS.preDiagnostic())], ['/texte', 'salon-test', 1, true, true]);
  verifier('profil venu de la photo : résumé en lignes, questions compactes cachées', [await page.isVisible('#profil-ia'), await page.isVisible('#questions-profil')], [true, false]);
  verifier('ligne Visage : « Cœur »', await page.textContent('[data-ligne="visage"] .carte-titre'), 'Cœur');
  /* Une réponse donnée à la main n'est pas effacée par un null de l'IA. */
  await page.click('[data-ligne="front"]');
  await page.click('[data-question="front"][data-valeur="normale"]');
  await page.goBack();
  await photo(page);
  reponse = { statut: 200, corps: { texte: JSON.stringify({ visage: null, texture: null, front: null, longueur: null, lunettes: null, peau: 'foncee', yeux: null, style: null, remarque: 'Cheveux cachés par une casquette.' }) } };
  await analyser(page);
  const p2 = await profil(page);
  verifier('nouvelle photo : nouvelle analyse ; les null ne changent rien', [recues.length, p2.front, p2.visage, p2.peau, p2.remarque], [2, 'normale', 'coeur', 'foncee', 'Cheveux cachés par une casquette.']);
  await contexte.close();

  /* ============ 3. Erreurs ============ */
  console.log('3. Erreurs : message en français, on reste sur l’écran');
  ({ contexte, page } = await ouvrir(true, 'salon-test'));
  await page.click('#action-accueil');
  await photo(page);
  await page.check('#consentement');
  const cas = [
    [{ statut: 429, corps: { erreur: 'QUOTA', limite: 60 } }, 'Limite du jour atteinte : 60 textes par jour.' + SUITE],
    [{ statut: 503, corps: { erreur: 'QUOTA_GOOGLE' } }, 'Google est saturé pour le moment. Attends une minute.' + SUITE],
    [{ statut: 200, corps: { texte: 'Je ne peux pas analyser cette photo.' } }, 'L’analyse de la photo n’a rien donné.' + SUITE],
    [{ statut: 422, corps: { erreur: 'REFUS' } }, 'L’analyse de la photo n’a rien donné.' + SUITE]
  ];
  for (const [r, attendu] of cas) {
    reponse = r;
    await analyser(page);
    verifier('erreur ' + (r.corps.erreur || 'JSON illisible') + ' : ' + attendu.slice(0, 40) + '…', [await ecran(page), await message(page)], ['photo', attendu]);
  }
  verifier('le message se voit entier, au-dessus de la barre du bas', await page.evaluate(() => {
    const m = document.querySelector('#message-photo').getBoundingClientRect();
    const barre = document.querySelector('#ecran-photo .actions').getBoundingClientRect();
    return m.top >= 0 && m.bottom <= barre.top;
  }));
  verifier('après les erreurs, le profil est vide', await profil(page), PROFIL_VIDE);
  await page.click('#passer-photo');
  verifier('« Passer » après une erreur : profil, sans IA', await ecran(page), 'questions');
  await contexte.close();

  /* ============ 4. « Passer » pendant l'analyse, accord, code ============ */
  console.log('4. « Passer » pendant l’analyse, accord obligatoire, code demandé');
  ({ contexte, page } = await ouvrir(true, ''));
  await page.click('#action-accueil');
  verifier('pas de code enregistré : champ du code affiché', await page.isVisible('#bloc-code-photo'), true);
  await photo(page);
  const envoisAvant = recues.length;
  await page.click('#action-photo');
  verifier('sans accord : message, rien n’est envoyé', [await message(page), recues.length], ['Coche l’accord du client, ou touche « Passer ».', envoisAvant]);
  await page.check('#consentement');
  await page.click('#action-photo');
  verifier('sans code : message', await message(page), 'Saisis le code d’accès du salon, ou touche « Passer ».');
  await page.fill('#code-acces-photo', 'salon-test');
  verifier('code gardé dans le téléphone', await A(page, () => JSON.parse(localStorage.getItem('coupe-studio:acces'))), 'salon-test');
  reponse = { statut: 200, corps: { texte: JSON.stringify({ visage: 'rond' }) } };
  attente = 1500;
  await page.click('#action-photo');
  verifier('analyse en cours : bouton et message', [await page.textContent('#action-photo'), await page.textContent('#etat-analyse'), await page.getAttribute('#action-photo', 'aria-busy')],
    ['Analyse en cours…', 'Analyse de la photo… Cela peut prendre 30 secondes.', 'true']);
  await page.click('#passer-photo');
  verifier('« Passer » pendant l’analyse : on avance tout de suite', await ecran(page), 'questions');
  await page.waitForTimeout(2000);
  verifier('…et la réponse arrivée après est ignorée', (await profil(page)).visage, null);
  attente = 0;

  /* ============ 4b. Code mal tapé, puis corrigé ============ */
  console.log('4b. Code mal tapé : le champ reste là pour le corriger');
  await contexte.close();
  ({ contexte, page } = await ouvrir(true, ''));
  await page.click('#action-accueil');
  const champCode = () => page.isVisible('#code-acces-photo');
  await page.type('#code-acces-photo', 'salon-tset');
  await photo(page);
  verifier('code tapé puis photo prise : le champ reste affiché', [await champCode(), await page.inputValue('#code-acces-photo')], [true, 'salon-tset']);
  await page.check('#consentement');
  verifier('accord coché : le champ reste affiché', await champCode(), true);
  reponse = { statut: 401, corps: { erreur: 'ACCES' } };
  await analyser(page);
  verifier('code refusé : message et champ', [await message(page), await champCode()], ['Code d’accès refusé. Vérifie le code du salon.' + SUITE, true]);
  await page.focus('#code-acces-photo');
  await page.press('#code-acces-photo', 'End');
  for (let i = 0; i < 4; i++) await page.press('#code-acces-photo', 'Backspace');
  verifier('correction lettre par lettre : le champ reste affiché, le focus aussi', [await champCode(), await page.inputValue('#code-acces-photo'), await page.evaluate(() => document.activeElement.id)], [true, 'salon-', 'code-acces-photo']);
  await page.type('#code-acces-photo', 'test');
  verifier('code corrigé, gardé dans le téléphone', await A(page, () => JSON.parse(localStorage.getItem('coupe-studio:acces'))), 'salon-test');
  reponse = { statut: 200, corps: { texte: JSON.stringify({ visage: 'rond' }) } };
  await analyser(page);
  verifier('code accepté : on avance, le profil est rempli', [await ecran(page), (await profil(page)).visage], ['questions', 'rond']);
  await page.goBack();
  verifier('de retour sur l’écran : le code accepté n’est plus demandé', await champCode(), false);

  /* ============ 5. Nouveau client ============ */
  console.log('5. Nouveau client');
  await page.goto(ADRESSE);
  verifier('rechargement : la photo n’est plus là (jamais stockée)', await A(page, () => window.CoupeStudio.v2.selfie), null);
  await page.click('#action-accueil');
  await photo(page);
  await page.check('#consentement');
  await page.goBack();
  await page.click('#ecran-accueil [data-nouveau-client]');
  verifier('une photo prise : « Nouveau client » demande confirmation', await page.isVisible('#ecran-accueil [data-confirmer-nouveau]'));
  await page.click('#ecran-accueil [data-confirmer-nouveau]');
  verifier('« Nouveau client » : écran Photo, sans photo ni accord', [await ecran(page), await A(page, () => window.CoupeStudio.v2.selfie), await page.isChecked('#consentement'), await page.textContent('#action-photo')],
    ['photo', null, false, 'Prendre la photo']);
  await contexte.close();

  await navigateur.close();
  await new Promise((r) => serveur.close(r));
  verifier('aucune erreur JavaScript', erreurs.join(' | '), '');
  console.log(echecs === 0 ? '\nPHOTO : ' + reussites + ' vérifications réussies.' : '\nPHOTO : ' + echecs + ' échec(s).');
  process.exit(echecs === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
