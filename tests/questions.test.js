/* Test de l'écran « Diagnostic · Questions » (parcours « Diagnostic d'abord », étape 2).
   Sans pré-diagnostic : le profil en boutons compacts. Avec : le résumé en lignes, un toucher pour corriger.
   Puis les 3 questions, « Voir les propositions », « Voir les catalogues », retour arrière, Nouveau client.
   Lancer : node tests/questions.test.js */
'use strict';
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
  const navigateur = await chromium.launch();
  const erreurs = [];
  const ouvrir = async (session) => {
    const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 } });
    if (session) await contexte.addInitScript((s) => { try { sessionStorage.setItem('coupe-studio:session', JSON.stringify(s)); } catch (e) { /* bloqué */ } }, session);
    const page = await contexte.newPage();
    page.on('pageerror', (e) => erreurs.push(e.message));
    await page.goto(ADRESSE);
    return { contexte, page };
  };
  const A = (page, f) => page.evaluate(f);
  const ecran = (page) => A(page, () => window.CoupeStudio.etat.ecran);
  const presses = (page, sel) => page.$$eval(sel + ' [aria-pressed="true"]', (b) => b.map((x) => x.textContent).join(', '));
  const lignes = (page) => page.$$eval('#lignes-profil [data-ligne]', (b) => b.map((x) => x.querySelector('.discret').textContent + ' : ' + x.querySelector('.carte-titre').textContent).join(' | '));

  /* ============ 1. Sans pré-diagnostic ============ */
  console.log('1. Sans photo : le profil en boutons compacts, puis les 3 questions');
  let { contexte, page } = await ouvrir();
  await page.click('[data-mode="barber"]');
  await page.click('#action-accueil');
  await page.click('#passer-photo');
  verifier('« Passer » la photo ouvre Diagnostic · Questions', await ecran(page), 'questions');
  verifier('libellé, titre', [await page.textContent('#ecran-questions .etape'), await page.textContent('#titre-questions')], ['Diagnostic', 'Ce que veut le client']);
  verifier('pas de résumé de photo ; profil en boutons compacts', [await page.isVisible('#profil-ia'), await page.isVisible('#questions-profil')], [false, true]);
  verifier('les 5 questions du profil', await page.$$eval('#questions-profil .etiquette', (e) => e.map((x) => x.textContent).join(', ')), 'Texture, Visage, Ligne frontale et densité, Longueur actuelle, Lunettes');
  verifier('« Cheveux fins » caché en barber', await page.$$eval('#questions-profil [data-question="front"]', (b) => b.map((x) => x.textContent).join(', ')), 'Normale, Golfes légers, Golfes marqués, Clairsemés, Chauve / rasé');
  verifier('les 3 questions, 3 réponses chacune', await page.$$eval('#envies .etiquette', (e) => e.map((x) => x.textContent + ' : ' + Array.from(x.parentNode.querySelectorAll('[data-envie]')).map((b) => b.textContent).join(' / ')).join(' | ')),
    'Changement : Rafraîchir / Faire évoluer / Changer complètement | Transformation : Longueur / Forme et volume / Couleur | Habitudes : Aucun coiffage / 5 min / Plus de 10 min');
  verifier('bouton principal et lien secondaire', [await page.textContent('#action-questions'), await page.textContent('#vers-catalogues')], ['Voir les propositions', 'Voir les catalogues']);
  await page.click('[data-question="visage"][data-valeur="rond"]');
  await page.click('[data-question="front"][data-valeur="golfes-marques"]');
  await page.click('[data-envie="changement"][data-valeur="evoluer"]');
  await page.click('[data-envie="transformation"][data-valeur="couleur"]');
  await page.click('[data-envie="habitudes"][data-valeur="cinq"]');
  verifier('réponses marquées', [await presses(page, '#questions-profil'), await presses(page, '#envies')], ['Rond, Golfes marqués', 'Faire évoluer, Couleur, 5 min']);
  await page.click('[data-envie="transformation"][data-valeur="longueur"]');
  verifier('une seule réponse par question', await presses(page, '#envies'), 'Faire évoluer, Longueur, 5 min');
  await page.click('[data-envie="habitudes"][data-valeur="cinq"]');
  verifier('retoucher une réponse la retire', await A(page, () => window.CoupeStudio.etat.envies), { changement: 'evoluer', transformation: 'longueur', habitudes: null });

  console.log('2. Les deux sorties, le retour arrière, le rechargement');
  await page.click('#action-questions');
  verifier('« Voir les propositions » : le Catalogue coupe, avec les coupes conseillées (pont jusqu’à l’étape 3)', [await ecran(page), await page.isVisible('#bloc-conseillees')], ['catalogue', true]);
  await page.goBack();
  verifier('retour : les réponses sont toujours là', [await ecran(page), await presses(page, '#questions-profil'), await presses(page, '#envies')], ['questions', 'Rond, Golfes marqués', 'Faire évoluer, Longueur']);
  await page.click('#vers-catalogues');
  verifier('« Voir les catalogues » : Que veux-tu faire ?', await ecran(page), 'choix');
  await page.goBack();
  await page.reload();
  verifier('après un rechargement : tout est gardé', [await ecran(page), await presses(page, '#questions-profil'), await presses(page, '#envies')], ['questions', 'Rond, Golfes marqués', 'Faire évoluer, Longueur']);
  await page.goBack();
  await page.goBack();
  await page.click('#ecran-accueil [data-nouveau-client]');
  verifier('des réponses données : « Nouveau client » demande confirmation', await page.isVisible('#ecran-accueil [data-confirmer-nouveau]'));
  await page.click('#ecran-accueil [data-confirmer-nouveau]');
  await page.click('#passer-photo');
  verifier('« Nouveau client » : profil et réponses vides', [await presses(page, '#questions-profil'), await presses(page, '#envies'), await A(page, () => window.CoupeStudio.etat.profilIa)], ['', '', false]);
  await contexte.close();

  /* ============ 3. Avec le pré-diagnostic ============ */
  console.log('3. Profil venu de la photo : résumé, un toucher pour corriger');
  ({ contexte, page } = await ouvrir({
    v: 2, pi: true,
    p: { texture: 'boucles', visage: 'allonge', front: 'golfes-marques', longueur: 'courte', lunettes: null, peau: 'mate', yeux: 'fonces', style: 'Veste en jean, allure décontractée.', remarque: 'Garder du volume devant.' },
    e: { changement: 'rafraichir', transformation: null, habitudes: null }
  }));
  await page.goto(ADRESSE + '#questions');
  verifier('résumé visible, questions compactes cachées', [await page.isVisible('#profil-ia'), await page.isVisible('#questions-profil')], [true, false]);
  verifier('titre et aide du résumé', [await page.textContent('#profil-ia h2'), await page.textContent('#profil-ia .legende')], ['D’après la photo', 'Touche une ligne pour la corriger.']);
  verifier('une ligne par réponse ; « À préciser » si l’IA n’a rien vu', await lignes(page),
    'Texture : Bouclés | Visage : Allongé | Ligne frontale et densité : Golfes marqués | Longueur actuelle : Courte | Lunettes : À préciser | Peau : Mate | Yeux : Foncés');
  verifier('style et remarque affichés', [await page.textContent('#style-ia'), await page.textContent('#remarque-ia')], ['Style : Veste en jean, allure décontractée.', 'Garder du volume devant.']);
  verifier('les lignes sont fermées', await page.$$eval('#lignes-profil [data-ligne]', (b) => b.every((x) => x.getAttribute('aria-expanded') === 'false')));
  await page.click('[data-ligne="visage"]');
  verifier('toucher « Visage » : ses réponses s’ouvrent, la réponse actuelle marquée', [await page.getAttribute('[data-ligne="visage"]', 'aria-expanded'), await page.$$eval('#options-visage [data-question]', (b) => b.length), await presses(page, '#options-visage')], ['true', 5, 'Allongé']);
  await page.click('#options-visage [data-valeur="rond"]');
  verifier('choisir « Rond » : la ligne est corrigée et se referme', [await page.textContent('[data-ligne="visage"] .carte-titre'), await page.getAttribute('[data-ligne="visage"]', 'aria-expanded'), await A(page, () => window.CoupeStudio.etat.profil.visage)], ['Rond', 'false', 'rond']);
  verifier('le focus revient sur la ligne', await A(page, () => document.activeElement.getAttribute('data-ligne')), 'visage');
  await page.click('[data-ligne="lunettes"]');
  await page.click('#options-lunettes [data-valeur="oui"]');
  await page.click('[data-ligne="peau"]');
  await page.click('#options-peau [data-valeur="mate"]');
  verifier('Lunettes ajoutées ; retoucher « Mate » retire la peau', [await page.textContent('[data-ligne="lunettes"] .carte-titre'), await page.textContent('[data-ligne="peau"] .carte-titre')], ['Oui', 'À préciser']);
  await page.click('[data-ligne="yeux"]');
  await page.click('[data-ligne="yeux"]');
  verifier('retoucher une ligne ouverte la referme sans rien changer', [await page.getAttribute('[data-ligne="yeux"]', 'aria-expanded'), await page.textContent('[data-ligne="yeux"] .carte-titre')], ['false', 'Foncés']);
  verifier('les 3 questions sont aussi là, réponse gardée', await presses(page, '#envies'), 'Rafraîchir');
  await page.click('[data-ligne="front"]');
  await page.click('#options-front [data-valeur="chauve"]');
  await page.click('#action-questions');
  verifier('corriger le front en « Chauve / rasé » : les règles suivent (seul le buzz cut reste actif)', await page.$$eval('#ecran-catalogue [data-coupe]:not([disabled])', (c) => c.map((x) => x.getAttribute('data-coupe')).join()), 'buzz-cut');
  await contexte.close();

  await navigateur.close();
  verifier('aucune erreur JavaScript', erreurs.join(' | '), '');
  console.log(echecs === 0 ? '\nQUESTIONS : ' + reussites + ' vérifications réussies.' : '\nQUESTIONS : ' + echecs + ' échec(s).');
  process.exit(echecs === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
