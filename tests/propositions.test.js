/* Test de l'écran « Diagnostic · Propositions » (parcours « Diagnostic d'abord », étape 3).
   Un petit Worker simulé (serveur local) répond aux propositions ; aucune clé, aucun appel à Google.
   Lancer : node tests/propositions.test.js */
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

(async () => {
  /* ---- Worker simulé ---- */
  const recues = [];
  let reponse = { statut: 200, corps: { texte: '[]' } };
  let attente = 0;
  const serveur = http.createServer((req, res) => {
    const morceaux = [];
    req.on('data', (m) => morceaux.push(m));
    req.on('end', () => {
      const entetes = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Acces', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
      if (req.method === 'OPTIONS') { res.writeHead(204, entetes); res.end(); return; }
      recues.push({ chemin: req.url, corps: JSON.parse(Buffer.concat(morceaux).toString('utf8')) });
      setTimeout(() => { res.writeHead(reponse.statut, entetes); res.end(JSON.stringify(reponse.corps)); }, attente);
    });
  });
  await new Promise((r) => serveur.listen(0, '127.0.0.1', r));
  const WORKER = 'http://127.0.0.1:' + serveur.address().port;

  const navigateur = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (avecWorker, session) => {
    const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    await contexte.addInitScript(([adresse, s]) => {
      Object.defineProperty(window, 'CONFIG', { get() { return { worker: adresse }; }, set() { /* config.js ignoré */ } });
      try {
        localStorage.setItem('coupe-studio:mode', JSON.stringify('barber'));
        if (adresse) localStorage.setItem('coupe-studio:acces', JSON.stringify('salon-test'));
        if (s && !sessionStorage.getItem('coupe-studio:session')) sessionStorage.setItem('coupe-studio:session', JSON.stringify(s));
      } catch (e) { /* bloqué */ }
    }, [avecWorker ? WORKER : '', session || null]);
    const page = await contexte.newPage();
    page.on('pageerror', (e) => erreurs.push(e.message));
    await page.goto(ADRESSE);
    return { contexte, page };
  };
  const A = (page, f) => page.evaluate(f);
  const ecran = (page) => A(page, () => window.CoupeStudio.etat.ecran);
  const cartes = (page) => page.$$eval('#liste-propositions [data-proposition]', (c) => c.map((x) => (x.querySelector('.badge') ? '[hors] ' : '') + x.querySelector('.coupe-nom').textContent + (x.getAttribute('aria-pressed') === 'true' ? ' *' : '')).join(' | '));
  /* En V2, Résultat montre « Générer » au lieu du prompt : on lit le prompt dans les étapes. */
  const promptImage = (page) => page.evaluate(() => window.CoupeStudio.etapesResultat().find((e) => e.id === 'image').texte);
  const pret = (page) => page.waitForFunction(() => document.querySelector('#etat-propositions').hidden);
  const aller = async (page) => { await page.goto(ADRESSE + '#propositions'); await pret(page); };
  const PROFIL = { texture: 'boucles', visage: 'rond', front: 'normale', longueur: 'courte', lunettes: 'non', peau: 'mate', yeux: 'fonces', style: 'Veste en jean, allure décontractée.', remarque: null };

  /* ============ 1. Sans Worker : propositions locales ============ */
  console.log('1. Sans Worker : les 3 coupes conseillées par l’appli');
  let { contexte, page } = await ouvrir(false, { v: 2, p: PROFIL, e: { changement: 'evoluer', transformation: null, habitudes: null } });
  const reseau = [];
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url()) && !/fonts\.(googleapis|gstatic)\.com/.test(r.url())) reseau.push(r.url()); });
  await page.goto(ADRESSE + '#questions');
  await page.click('#action-questions');
  await pret(page);
  verifier('« Voir les propositions » ouvre Diagnostic · Propositions', [await ecran(page), await page.textContent('#titre-propositions'), await page.textContent('#ecran-propositions .etape')], ['propositions', 'Propositions', 'Diagnostic']);
  verifier('3 cartes, celles des règles locales (visage rond, cheveux bouclés)', await cartes(page), 'Crop texturé | Dégradé bouclé | Quiff');
  verifier('chaque carte dit pourquoi', await page.$$eval('#liste-propositions [data-proposition]', (c) => c.map((x) => x.lastElementChild.textContent)),
    ['Convient à : visage rond.', 'Convient à : cheveux bouclés.', 'Convient à : visage rond.']);
  verifier('pas de message d’erreur, aucun envoi', [await page.isVisible('#message-propositions'), reseau.join()], [false, '']);
  verifier('boutons : « Valider ce choix », « Voir les catalogues »', [await page.textContent('#action-propositions'), await page.textContent('#vers-catalogues')], ['Valider ce choix', 'Voir les catalogues']);
  await page.click('#action-propositions');
  verifier('valider sans choix : « Choisis une proposition. »', await page.textContent('#aide-propositions'), 'Choisis une proposition.');
  await page.click('[data-proposition="0"]');
  await page.click('[data-proposition="1"]');
  verifier('une seule carte choisie à la fois (bordure selection)', await cartes(page), 'Crop texturé | Dégradé bouclé * | Quiff');

  console.log('2. Valider : la carte s’agrandit, les autres se replient');
  await page.click('#action-propositions');
  verifier('carte agrandie : nom, ligne, pourquoi, détails', await page.$eval('#proposition-choisie', (c) => [c.querySelector('h2').textContent, c.querySelector('.coupe-ligne').textContent, c.querySelectorAll('p')[0].textContent, c.querySelector('p.discret').textContent]),
    ['Dégradé bouclé', 'Fondu, boucles sur le dessus', 'Convient à : cheveux bouclés.', 'Détails : Dégradé bouclé, sabot 0,5, dessus 5 cm']);
  verifier('la coupe du client est choisie', await A(page, () => window.CoupeStudio.etat.coupe.id), 'degrade-boucle');
  verifier('les 2 autres repliées, avec « Changer »', await page.$$eval('#liste-propositions [data-changer]', (b) => b.map((x) => x.textContent).join(' | ')), 'Crop texturéChanger | QuiffChanger');
  verifier('« Croquis » désactivé, « Bientôt »', [await page.isDisabled('#croquis'), await page.textContent('#bientot-croquis')], [true, 'Bientôt']);
  verifier('bouton principal : « Variantes » ; lien « Essayer sur le client »', [await page.textContent('#action-propositions'), await page.textContent('#essayer-client')], ['Variantes', 'Essayer sur le client']);
  await page.click('#action-propositions');
  verifier('« Variantes » : Réglages, coupe déjà choisie', [await ecran(page), await page.textContent('#titre-reglages')], ['reglages', 'Dégradé bouclé']);
  await page.goBack();
  verifier('retour : la carte est toujours agrandie', [await ecran(page), await page.isVisible('#proposition-choisie')], ['propositions', true]);
  await page.click('#essayer-client');
  verifier('« Essayer sur le client » : Résultat', [await ecran(page), (await page.textContent('#prompt-2')).includes('Curly top with a fade')], ['resultat', true]);
  await page.goBack();
  await page.click('[data-changer="2"]');
  verifier('« Changer » : retour aux 3 cartes, la carte touchée est choisie', [await cartes(page), await page.textContent('#action-propositions')], ['Crop texturé | Dégradé bouclé | Quiff *', 'Valider ce choix']);
  verifier('la coupe d’avant n’est pas effacée tant qu’on ne valide pas', await A(page, () => window.CoupeStudio.etat.coupe.id), 'degrade-boucle');
  await page.click('#vers-catalogues');
  verifier('« Voir les catalogues » : Que veux-tu faire ?', await ecran(page), 'choix');
  await contexte.close();

  /* ============ 3. Avec Worker : propositions de l'IA ============ */
  console.log('3. Avec Worker : demande, coupe hors catalogue, id inventé');
  ({ contexte, page } = await ouvrir(true, { v: 2, p: PROFIL, e: { changement: 'changer', transformation: 'forme', habitudes: 'cinq' } }));
  reponse = { statut: 200, corps: { texte: '```json\n' + JSON.stringify([
    { id: 'mulet-moderne', nom: 'Mulet', ligne: 'x', description_en: 'x', pourquoi: 'Le mulet suit son style décontracté.' },
    { id: null, nom: 'Afro taper', ligne: 'Boucles hautes, tempes nettes', description_en: 'Sides: low taper at the temples. Top: 6-8 cm of natural defined curls. Front: natural curls, forehead visible.', pourquoi: 'Garde ses boucles et donne de la hauteur.' },
    { id: 'coupe-inventee', nom: 'Coupe inventée', pourquoi: 'x' },
    { id: 'mulet-moderne', nom: 'Doublon', pourquoi: 'x' }
  ]) + '\n```' } };
  await aller(page);
  const d = recues[recues.length - 1];
  verifier('demande : /texte, JSON, recherche web, sans photo (pas de photo ni d’accord)', [d.chemin, d.corps.json, d.corps.recherche, d.corps.photos], ['/texte', true, true, []]);
  const prompt = d.corps.prompt;
  verifier('prompt : mode, profil en anglais, envies, impossibles', [
    prompt.startsWith('You are an expert hairdresser and style consultant working in a barbershop in France.'),
    prompt.includes('Client profile: face: round; hair texture: curly; hairline and density: normal; current length: short; glasses: no; skin: tan; eyes: dark; style (in French): Veste en jean, allure décontractée.'),
    prompt.includes('What the client wants: change: change completely; transformation: shape and volume; daily styling: 5 minutes'),
    prompt.includes('impossible for this client: none')], [true, true, true, true]);
  verifier('prompt : le catalogue du mode, une ligne par coupe', prompt.includes('skin-fade: Skin fade — Fondu à blanc, dessus court\ncrop-texture: Textured French crop — Frange courte, côtés nets'));
  verifier('prompt : [RÉFÉRENTIEL] vide, sa ligne retirée', !prompt.includes('[RÉFÉRENTIEL]') && prompt.includes('[CATALOGUE]') === false && prompt.includes('nets\n') && prompt.split('\n').some((l, i, t) => l === 'Rules:' && t[i - 1].includes('—')));
  verifier('3 cartes : mulet (catalogue), afro taper (hors catalogue), puis une locale ; id inventé et doublon écartés', await cartes(page), 'Mulet moderne | [hors] Afro taper | Crop texturé');
  verifier('le pourquoi de l’IA est gardé ; le nom du catalogue l’emporte', await page.$eval('[data-proposition="0"]', (c) => c.lastElementChild.textContent), 'Le mulet suit son style décontracté.');
  await page.click('[data-proposition="1"]');
  await page.click('#action-propositions');
  const perso = await A(page, () => { const c = window.CoupeStudio.etat.coupe; return [c.perso, c.fr, c.ligne, c.desc, c.mode]; });
  verifier('hors catalogue : devient une coupe personnalisée (nom, ligne, description anglaise)', perso,
    [true, 'Afro taper', 'Boucles hautes, tempes nettes', 'Sides: low taper at the temples. Top: 6-8 cm of natural defined curls. Front: natural curls, forehead visible', 'barber']);
  verifier('…carte agrandie avec le badge « Hors catalogue »', await page.$eval('#proposition-choisie', (c) => c.querySelector('.badge').textContent + ' / ' + c.querySelector('h2').textContent), 'Hors catalogue / Afro taper');
  await page.click('#action-propositions');
  verifier('…Variantes : Réglages de cette coupe', [await ecran(page), await page.textContent('#titre-reglages')], ['reglages', 'Afro taper']);
  await page.click('#action-reglages');
  verifier('…Résultat : sa description part dans le prompt image', (await promptImage(page)).includes('Afro taper: Sides: low taper at the temples. Top: 6-8 cm of natural defined curls'));
  const n = recues.length;
  await page.goBack(); await page.goBack();
  await page.reload();
  await pret(page);
  verifier('retour et rechargement : rien n’est redemandé, le choix est gardé', [recues.length, await ecran(page), await page.textContent('#proposition-choisie h2')], [n, 'propositions', 'Afro taper']);
  await page.goto(ADRESSE + '#questions');
  await page.click('[data-envie="habitudes"][data-valeur="aucun"]');
  reponse = { statut: 200, corps: { texte: JSON.stringify([{ id: 'buzz-cut', nom: 'Buzz', pourquoi: 'Aucun coiffage.' }, { id: 'crew-cut', nom: 'Crew', pourquoi: 'Très simple.' }, { id: 'skin-fade', nom: 'Skin', pourquoi: 'Net.' }]) } };
  await page.click('#action-questions');
  await pret(page);
  verifier('une réponse changée : nouvelle demande, nouvelles cartes, rien de choisi', [recues.length, await cartes(page), await page.textContent('#action-propositions')], [n + 1, 'Buzz cut | Crew cut | Skin fade', 'Valider ce choix']);
  verifier('…le prompt suit la nouvelle réponse', recues[recues.length - 1].corps.prompt.includes('daily styling: no styling'));
  await contexte.close();

  /* ============ 4. Tête chauve, densité faible ============ */
  console.log('4. Coupes impossibles');
  ({ contexte, page } = await ouvrir(true, { v: 2, p: Object.assign({}, PROFIL, { front: 'chauve' }) }));
  reponse = { statut: 200, corps: { texte: JSON.stringify([{ id: 'skin-fade', pourquoi: 'x' }, { id: null, nom: 'Coupe longue', description_en: 'Top: long', pourquoi: 'x' }, { id: 'buzz-cut', pourquoi: 'Seule coupe possible.' }]) } };
  await aller(page);
  verifier('chauve : le prompt le dit', recues[recues.length - 1].corps.prompt.includes('impossible for this client: bald or shaved head: only a buzz cut or a beard-only change'));
  verifier('chauve : seul le buzz cut est gardé (skin fade et hors catalogue écartés)', await cartes(page), 'Buzz cut');
  await contexte.close();
  ({ contexte, page } = await ouvrir(true, { v: 2, p: Object.assign({}, PROFIL, { front: 'golfes-marques' }) }));
  reponse = { statut: 200, corps: { texte: JSON.stringify([{ id: 'crop-texture', pourquoi: 'x' }, { id: 'crew-cut', pourquoi: 'x' }, { id: 'buzz-cut', pourquoi: 'x' }]) } };
  await aller(page);
  verifier('golfes marqués : le prompt le dit', recues[recues.length - 1].corps.prompt.includes('impossible for this client: thin hair or receding hairline: no fringe, no added volume, keep the current top length'));
  await page.click('[data-proposition="0"]');
  await page.click('#action-propositions');
  await page.click('#essayer-client');
  verifier('…et la règle de densité s’applique toute seule au prompt image (pas de frange)', (await promptImage(page)).includes('Front: no fringe, no bangs, no curtain bangs, forehead uncovered as in the original'));
  await contexte.close();

  /* ============ 5. Erreurs, attente ============ */
  console.log('5. Erreurs : message et propositions locales ; attente');
  ({ contexte, page } = await ouvrir(true, { v: 2, p: PROFIL }));
  reponse = { statut: 429, corps: { erreur: 'QUOTA', limite: 60 } };
  await aller(page);
  verifier('quota : message, puis les conseils de l’appli', [await page.textContent('#message-propositions'), await cartes(page)],
    ['Propositions de l’IA indisponibles : Limite du jour atteinte : 60 textes par jour. Voici les conseils de l’appli.', 'Crop texturé | Dégradé bouclé | Quiff']);
  await page.goto(ADRESSE + '#questions');
  await page.click('[data-question="lunettes"][data-valeur="oui"]');
  reponse = { statut: 200, corps: { texte: 'Désolé, je ne peux pas.' } };
  await page.click('#action-questions');
  await pret(page);
  verifier('réponse illisible : message, conseils de l’appli', await page.textContent('#message-propositions'), 'Propositions de l’IA indisponibles : L’IA n’a rien proposé d’utilisable. Voici les conseils de l’appli.');
  await page.goto(ADRESSE + '#questions');
  await page.click('[data-question="lunettes"][data-valeur="oui"]');
  attente = 1500;
  reponse = { statut: 200, corps: { texte: JSON.stringify([{ id: 'quiff', pourquoi: 'x' }]) } };
  await page.click('#action-questions');
  verifier('pendant la demande : message d’attente, pas de cartes', [await page.textContent('#etat-propositions'), await page.$$eval('#liste-propositions > *', (c) => c.length)], ['Recherche des propositions… Cela peut prendre 30 secondes.', 0]);
  await page.click('#action-propositions');
  verifier('« Valider ce choix » ne fait rien pendant la demande', await page.isVisible('#aide-propositions'), false);
  await pret(page);
  attente = 0;
  verifier('…puis les cartes : quiff, complété par les conseils locaux', await cartes(page), 'Quiff | Crop texturé | Dégradé bouclé');
  await page.goto(ADRESSE);
  await page.click('#ecran-accueil [data-nouveau-client]');
  await page.click('#ecran-accueil [data-confirmer-nouveau]');
  verifier('« Nouveau client » : propositions effacées', await A(page, () => window.CoupeStudio.etat.propositions.liste.length), 0);
  await contexte.close();

  await navigateur.close();
  await new Promise((r) => serveur.close(r));
  verifier('aucune erreur JavaScript', erreurs.join(' | '), '');
  console.log(echecs === 0 ? '\nPROPOSITIONS : ' + reussites + ' vérifications réussies.' : '\nPROPOSITIONS : ' + echecs + ' échec(s).');
  process.exit(echecs === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
