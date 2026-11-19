/* Test du retour arrière (CLAUDE.md, section 4.0 et section 9).
   RÈGLE ABSOLUE : revenir en arrière n'efface JAMAIS les choix faits.
   Le test remplit le profil, choisit une coupe, change des réglages, revient 3 fois en arrière
   puis revient en avant, et vérifie que tous les choix sont toujours là. Il vérifie aussi la
   flèche, le glissement depuis le bord gauche, le rechargement et « Nouveau client ».
   Lancer : node tests/retour.test.js */
'use strict';
const { ADRESSE, PHOTO_TEST, chromium } = require('./outils');

let echecs = 0;
let reussites = 0;
function verifier(nom, obtenu, attendu) {
  const ok = arguments.length === 2 ? obtenu === true : obtenu === attendu;
  if (ok) { reussites++; console.log('  OK      ' + nom); return; }
  echecs++;
  console.log('  ÉCHEC   ' + nom);
  if (arguments.length === 3) {
    console.log('            attendu : ' + JSON.stringify(attendu));
    console.log('            obtenu  : ' + JSON.stringify(obtenu));
  }
}

const ecran = (page) => page.evaluate(() => window.CoupeStudio.etat.ecran);
const adresse = (page) => page.evaluate(() => window.location.hash.replace('#', ''));
const texte = async (page, selecteur) => (await page.textContent(selecteur)).trim();
const presse = (page, selecteur) => page.getAttribute(selecteur, 'aria-pressed');
const session = (page) => page.evaluate(() => window.sessionStorage.getItem('coupe-studio:session'));
const regler = (page, id, valeur) => page.evaluate(([i, v]) => {
  const c = document.getElementById(i);
  c.value = String(v);
  c.dispatchEvent(new Event('input', { bubbles: true }));
}, [id, valeur]);

/* Tout ce que le coiffeur a choisi, lu dans l'état de l'appli. */
const choix = (page) => page.evaluate(() => {
  const e = window.CoupeStudio.etat;
  return JSON.stringify({
    profil: e.profil,
    coupe: e.coupe && e.coupe.id,
    reglages: e.reglages,
    avecCoupe: e.avecCoupe,
    caracteristiques: e.caracteristiques,
    couleurLibre: e.couleurLibre,
    retouche: e.retouche,
    retoucheIa: e.retoucheIa
  });
});

/* Glissement du doigt depuis le bord gauche de l'écran. */
const glisser = (page, departX, arriveeX) => page.evaluate(([x0, x1]) => {
  const cible = document.elementFromPoint(Math.max(x0, 1), 400) || document.body;
  const doigt = (x) => new Touch({ identifier: 1, target: cible, clientX: x, clientY: 400 });
  cible.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [doigt(x0)], changedTouches: [doigt(x0)] }));
  cible.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, touches: [doigt(x1)], changedTouches: [doigt(x1)] }));
  cible.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [doigt(x1)] }));
}, [departX, arriveeX]);

(async () => {
  const navigateur = await chromium.launch();
  const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.goto(ADRESSE);

  console.log('1. Le parcours : profil, coupe, réglages');
  verifier('pas de flèche retour sur l’Accueil', await page.isHidden('#retour'));
  verifier('plus de barre d’onglets', (await page.$$('.onglets, .onglet')).length, 0);
  await page.click('[data-mode="barber"]');
  await page.click('#action-accueil');
  verifier('Accueil → Diagnostic · Photo', await ecran(page), 'photo');
  await page.click('#passer-photo');
  verifier('Photo → « Passer » → Profil client', await ecran(page), 'questions');
  verifier('flèche retour visible, zone tactile 48 × 48', await page.evaluate(() => {
    const r = document.querySelector('#retour').getBoundingClientRect();
    return r.width >= 48 && r.height >= 48 && r.left >= 0 && r.top >= 0 && r.left < 24;
  }));
  await page.click('[data-question="texture"][data-valeur="ondules"]');
  await page.click('[data-question="visage"][data-valeur="rond"]');
  await page.click('[data-question="front"][data-valeur="golfes-legers"]');
  await page.click('[data-question="longueur"][data-valeur="moyenne"]');
  await page.click('[data-question="lunettes"][data-valeur="oui"]');
  await page.click('#vers-catalogues');
  verifier('Profil client → Que veux-tu faire ?', await ecran(page), 'choix');
  await page.click('#ecran-choix a[href="#catalogue"]');
  verifier('→ Catalogue coupe', await ecran(page), 'catalogue');
  await page.click('#ecran-catalogue [data-coupe="skin-fade"]');
  verifier('toucher une coupe ouvre directement Réglages', await ecran(page), 'reglages');
  await page.click('[data-reglage="sabot"][data-valeur="1"]');
  await regler(page, 'curseur-dessus', 8);
  await page.click('[data-reglage="devant"][data-valeur="releve"]');
  await page.click('[data-reglage="coiffage"][data-valeur="decoiffe"]');
  await page.click('[data-reglage="barbe"][data-valeur="courte"]');
  const resumeAttendu = 'Dégradé mi-hauteur, sabot 1, dessus 8 cm, décoiffé, devant relevé, barbe taillée courte'; // sabot 1 : le skin fade devient un dégradé
  verifier('réglages changés', await texte(page, '#resume-reglages'), resumeAttendu);
  const avant = await choix(page);
  const sessionAvant = await session(page);
  verifier('une entrée d’historique par page (6 pages ouvertes)', await page.evaluate(() => window.history.state && window.history.state.rang), 5);

  console.log('2. Trois retours en arrière, puis trois pas en avant');
  await page.goBack();
  verifier('retour 1 : Catalogue coupe', (await ecran(page)) + ' / ' + (await adresse(page)), 'catalogue / catalogue');
  verifier('la coupe choisie est toujours marquée', await presse(page, '#ecran-catalogue [data-coupe="skin-fade"]'), 'true');
  verifier('rien n’a changé après le retour 1', await choix(page), avant);
  await page.goBack();
  verifier('retour 2 : Que veux-tu faire ?', await ecran(page), 'choix');
  verifier('rien n’a changé après le retour 2', await choix(page), avant);
  await page.goBack();
  verifier('retour 3 : Profil client', await ecran(page), 'questions');
  verifier('rien n’a changé après le retour 3', await choix(page), avant);
  verifier('le profil est toujours affiché', [
    await presse(page, '[data-question="texture"][data-valeur="ondules"]'),
    await presse(page, '[data-question="visage"][data-valeur="rond"]'),
    await presse(page, '[data-question="front"][data-valeur="golfes-legers"]'),
    await presse(page, '[data-question="longueur"][data-valeur="moyenne"]'),
    await presse(page, '[data-question="lunettes"][data-valeur="oui"]')
  ].join(), 'true,true,true,true,true');
  verifier('la mémoire de session est identique', await session(page), sessionAvant);
  await page.goForward();
  await page.goForward();
  await page.goForward();
  verifier('3 pas en avant : retour sur Réglages', await ecran(page), 'reglages');
  verifier('tous les choix sont toujours là', await choix(page), avant);
  verifier('les réglages sont affichés comme avant', [
    await texte(page, '#resume-reglages'),
    await presse(page, '[data-reglage="sabot"][data-valeur="1"]'),
    await page.inputValue('#curseur-dessus'),
    await presse(page, '[data-reglage="devant"][data-valeur="releve"]'),
    await presse(page, '[data-reglage="coiffage"][data-valeur="decoiffe"]'),
    await presse(page, '[data-reglage="barbe"][data-valeur="courte"]')
  ].join(' | '), resumeAttendu + ' | true | 8 | true | true | true');

  console.log('3. La flèche et le glissement depuis le bord gauche');
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'catalogue');
  verifier('la flèche recule d’une page', await adresse(page), 'catalogue');
  verifier('rien n’a changé après la flèche', await choix(page), avant);
  await page.goForward();
  await glisser(page, 6, 180);
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'catalogue');
  verifier('glisser depuis le bord gauche recule d’une page', await adresse(page), 'catalogue');
  verifier('rien n’a changé après le glissement', await choix(page), avant);
  await page.goForward();
  await glisser(page, 120, 300);
  await page.waitForTimeout(250);
  verifier('glisser au milieu de l’écran ne fait rien', await ecran(page), 'reglages');
  await glisser(page, 6, 30);
  await page.waitForTimeout(250);
  verifier('un glissement trop court ne fait rien', await ecran(page), 'reglages');

  console.log('4. Caractéristiques, changement de coupe, rechargement');
  await page.click('#vers-caracteristiques');
  verifier('« Ajouter des caractéristiques » ouvre le Catalogue personnalisé', await ecran(page), 'personnalise');
  verifier('la coupe est gardée', (await texte(page, '#bloc-base [data-base="oui"]')) + ' ' + (await presse(page, '#bloc-base [data-base="oui"]')), 'Skin fade true');
  await page.click('[data-caracteristique="meche-cote"]');
  await page.click('[data-caracteristique="trait-rase"]');
  const avecCaracteristiques = await choix(page);
  await page.goBack();
  await page.goBack();
  verifier('2 retours : Catalogue coupe', await ecran(page), 'catalogue');
  verifier('les caractéristiques sont gardées', await choix(page), avecCaracteristiques);
  await page.click('#ecran-catalogue [data-coupe="quiff"]');
  verifier('autre coupe choisie', await texte(page, '#titre-reglages'), 'Quiff');
  await page.goBack();
  await page.click('#ecran-catalogue [data-coupe="skin-fade"]');
  verifier('revenir à la première coupe retrouve ses réglages, caractéristiques à leur place', await texte(page, '#resume-reglages'),
    'Dégradé mi-hauteur, sabot 1, trait rasé (motif), dessus 8 cm, décoiffé, mèche sur le côté, barbe taillée courte');
  verifier('le coiffage devant est remplacé par la mèche, et la page le dit', await texte(page, '#texte-remplace-devant'), 'Coiffage, devant et frange remplacé par : mèche sur le côté');
  verifier('le réglage remplacé garde sa valeur (retirer la mèche le rendra)', await page.evaluate(() => window.CoupeStudio.etat.reglages.devant), 'releve');
  await page.reload();
  verifier('après rechargement : même page', await ecran(page), 'reglages');
  verifier('après rechargement : tous les choix sont là', await choix(page), avecCaracteristiques);
  await page.goBack();
  verifier('après rechargement : le retour marche encore', await ecran(page), 'catalogue');

  console.log('5. Retouches : elles survivent aussi au retour');
  await page.goBack();
  verifier('retour jusqu’à Que veux-tu faire ?', await ecran(page), 'choix');
  await page.click('#ecran-choix a[href="#fond"]');
  await page.click('#ecran-fond a[href="#retouche"]');
  await page.setInputFiles('#fichier-photo', PHOTO_TEST);
  await page.waitForSelector('#zone-apercu:not([hidden])');
  await regler(page, 'retouche-luminosite', 20);
  await page.click('[data-outil="format"]');
  await page.click('[data-format="1-1"]');
  await page.goBack();
  await page.click('#ecran-fond a[href="#retouche-ia"]');
  await page.click('[data-retouche-ia="flou"]');
  const avecRetouches = await choix(page);
  await page.goBack();
  await page.goBack();
  verifier('2 retours : Que veux-tu faire ?', await ecran(page), 'choix');
  verifier('retouches gardées', await choix(page), avecRetouches);
  await page.goForward();
  await page.goForward();
  verifier('retouche IA toujours choisie', await presse(page, '[data-retouche-ia="flou"]'), 'true');
  await page.goBack();
  await page.click('#ecran-fond a[href="#retouche"]');
  verifier('la photo est toujours là, avec ses réglages', [
    await page.isVisible('#apercu'),
    await page.inputValue('#retouche-luminosite'),
    await presse(page, '[data-format="1-1"]'),
    await presse(page, '[data-outil="format"]')
  ].join(), 'true,20,true,true');

  console.log('6. « Nouveau client » : le seul geste qui remet à zéro');
  await page.evaluate(() => { window.confirmAppele = false; window.confirm = () => { window.confirmAppele = true; return true; }; });
  await page.goBack();
  await page.goBack();
  await page.click('#ecran-choix a[href="#catalogue"]');
  await page.click('#ecran-catalogue [data-coupe="skin-fade"]');
  await page.click('#action-reglages');
  verifier('→ Résultat', await ecran(page), 'resultat');
  await page.click('#ecran-resultat [data-nouveau-client]');
  verifier('confirmation affichée dans la page', await page.isVisible('#ecran-resultat [data-confirmer-nouveau]'));
  verifier('rien n’est effacé avant la confirmation', await choix(page), avecRetouches);
  await page.click('#ecran-resultat [data-annuler-nouveau]');
  verifier('« Annuler » garde tout', JSON.parse(await choix(page)).coupe, 'skin-fade');
  await page.click('#ecran-resultat [data-nouveau-client]');
  await page.click('#ecran-resultat [data-confirmer-nouveau]');
  verifier('après confirmation : Diagnostic · Photo', await ecran(page), 'photo');
  const vide = JSON.parse(await choix(page));
  verifier('tout est remis à zéro', JSON.stringify([vide.profil.texture, vide.profil.visage, vide.coupe, vide.reglages, vide.caracteristiques, vide.retouche.luminosite, vide.retoucheIa.choix]),
    JSON.stringify([null, null, null, null, [], 0, []]));
  verifier('la photo est oubliée', await page.evaluate(() => window.CoupeStudio.photos.apres === null));
  verifier('aucune fenêtre confirm() du navigateur', await page.evaluate(() => window.confirmAppele), false);
  verifier('le mode est gardé', await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'barber');
  await page.goBack();
  verifier('retour après « Nouveau client » : la page s’affiche, vide', (await ecran(page)) + ' : ' + (await texte(page, '#sous-titre-resultat')), 'resultat : Rien à générer pour l’instant. Choisis une coupe ou des caractéristiques.');

  console.log('7. Page ouverte directement, sans historique');
  const autre = await contexte.newPage();
  await autre.goto(ADRESSE + '#reglages');
  await autre.click('#retour');
  verifier('la flèche mène à la page précédente du parcours', await autre.evaluate(() => window.CoupeStudio.etat.ecran), 'catalogue');
  await autre.click('#retour');
  verifier('Catalogue coupe → Diagnostic · Questions (« Voir les propositions » y mène)', await autre.evaluate(() => window.CoupeStudio.etat.ecran), 'questions');
  await autre.click('#retour');
  await autre.click('#retour');
  verifier('puis jusqu’à l’Accueil, par Diagnostic · Photo', await autre.evaluate(() => window.CoupeStudio.etat.ecran), 'accueil');

  await navigateur.close();
  verifier('aucune erreur JavaScript', erreurs.join(' | '), '');
  console.log(echecs === 0 ? '\nRETOUR ARRIÈRE : ' + reussites + ' vérifications réussies.' : '\nRETOUR ARRIÈRE : ' + echecs + ' échec(s) sur ' + (reussites + echecs) + '.');
  process.exit(echecs === 0 ? 0 : 1);
})();
