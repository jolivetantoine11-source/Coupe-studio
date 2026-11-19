/* Tests série 4 (15 novembre) puis série contrôle (16 novembre) d'Antoine.
   1. Front sans frange choisie : « no fringe, no bangs, no curtain bangs, forehead uncovered as in the original ».
   2. Changement de texture (lissé, kératine, permanente, défrisage, boucles…) : étape Texture à part,
      après Image et avant Couleur. Le prompt image ne contient plus ni la texture, ni Head pose,
      ni d'exception texture. Avertissement « Changement de texture » sur l'écran Résultat.
   3. Exception barbe : « the rules below », juste avant « Strict rules: ».
   4. Longueur demandée > longueur actuelle : avertissement « Rallongement ».
   5. Consigne photo de l'étape Diagnostic.
   Lancer : node tests/texture.test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { RACINE, ADRESSE, chromium } = require('./outils');

let echecs = 0;
let reussites = 0;
function verifier(nom, obtenu, attendu) {
  const ok = arguments.length === 2 ? obtenu === true : obtenu === attendu;
  if (ok) { reussites++; console.log('  OK      ' + nom); return; }
  echecs++;
  console.log('  ÉCHEC   ' + nom + '\n            attendu : ' + JSON.stringify(attendu) + '\n            obtenu  : ' + JSON.stringify(obtenu));
}

const blocs = fs.readFileSync(path.join(RACINE, 'PROMPTS.md'), 'utf8').match(/```text\n[\s\S]*?\n```/g).map((b) => b.slice(8, -4));
const IMAGE = blocs[2];
const EXCEPTION = blocs[4];
const TEXTURE = blocs[6];
const FRONT = 'Front: no fringe, no bangs, no curtain bangs, forehead uncovered as in the original';

(async () => {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto(ADRESSE);

  console.log('1. Front par défaut');
  const front = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const c = A.coupeDuCatalogue('long-droit');
    return A.descAnglaise({ coupe: c, reglages: A.reglagesParDefaut(c), caracteristiques: [], couleurLibre: '', profil: {} }).split('. ').find((p) => p.startsWith('Front:'));
  });
  verifier('texte demandé par Antoine', front, FRONT);

  console.log('2. Changement de texture : étape à part');
  const cas = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const fait = (id, k, reglages) => {
      const c = A.coupeDuCatalogue(id);
      A.etat.coupe = c;
      A.etat.reglages = Object.assign(A.reglagesParDefaut(c), reglages || {});
      A.etat.caracteristiques = k;
      A.etat.avecCoupe = true;
      A.etat.reference = false;
      const etapes = A.etapesResultat();
      const image = etapes.find((e) => e.id === 'image').texte;
      const texture = etapes.find((e) => e.id === 'texture');
      return { ids: etapes.map((e) => e.id).join(' '), image, texture: texture ? texture.texte : null, joindre: texture ? texture.joindre.join() : null };
    };
    const r = {};
    ['lisse', 'keratine', 'permanente', 'defrisage', 'boucles', 'ondulations', 'twists', 'vanilles'].forEach((k) => { r[k] = fait('long-droit', [k]); });
    r.complet = fait('skin-fade', ['permanente', 'platine'], { barbe: 'courte' });
    r.barbe = fait('skin-fade', [], { barbe: 'courte' });
    r.rien = fait('skin-fade', []);
    r.boucleDefaut = fait('carre-boucle', []);
    r.boucleLisse = fait('carre-boucle', ['lisse']);
    return r;
  });
  const textes = await page.evaluate(() => {
    const t = {}; window.CARACTERISTIQUES.categories.forEach((cat) => cat.liste.forEach((c) => { t[c.id] = c.en; })); return t;
  });
  const textures = ['lisse', 'keratine', 'permanente', 'defrisage', 'boucles', 'ondulations', 'twists', 'vanilles'];
  verifier('kératine et défrisage existent, dans le groupe exclusif texture', await page.evaluate(() => {
    const g = window.CARACTERISTIQUES.groupes.find((x) => x.id === 'texture');
    return g.ids.includes('keratine') && g.ids.includes('defrisage');
  }));
  verifier('les 8 textures : étapes Diagnostic, Image, Texture, Fiche', textures.filter((k) => cas[k].ids !== 'diagnostic image texture fiche').join(), '');
  verifier('les 8 textures : prompt image sans Texture, sans Head pose, sans exception', textures.filter((k) => /Texture:|Head pose|Exception/.test(cas[k].image)).join(), '');
  verifier('kératine : prompt Texture exact', cas.keratine.texture, TEXTURE.replace('[TEXTURE]', 'keratin-smoothed, sleek and frizz-free'));
  verifier('les 8 textures : [TEXTURE] = le texte de la caractéristique', textures.filter((k) => cas[k].texture !== TEXTURE.replace('[TEXTURE]', textes[k])).join(), '');
  verifier('étape Texture : joindre l’image générée', cas.keratine.joindre, 'image-generee');
  verifier('texture + couleur + barbe : Image → Texture → Couleur → Fiche', cas.complet.ids, 'diagnostic image texture couleur fiche');
  verifier('…le prompt image n’a que l’exception barbe, avant « Strict rules: »',
    cas.complet.image.includes('.\n' + EXCEPTION.replace('[CHANGEMENT]', 'a beard change').replace('[CE_CHANGEMENT]', 'that change') + '\nStrict rules:\n') && !/texture change|Texture:|Color:/.test(cas.complet.image));
  verifier('rien de changé : prompt image inchangé, pas d’étape Texture', cas.rien.ids === 'diagnostic image fiche' && !cas.rien.image.includes('Exception'));
  verifier('texture par défaut du carré bouclé : reste dans l’image, pas d’étape Texture', cas.boucleDefaut.ids === 'diagnostic image fiche' && cas.boucleDefaut.image.includes('Texture: natural curls') && !cas.boucleDefaut.image.includes('Exception'));
  verifier('carré bouclé + lissé : la texture part dans l’étape Texture', cas.boucleLisse.ids === 'diagnostic image texture fiche' && !cas.boucleLisse.image.includes('Texture:'));

  console.log('3. Exception barbe');
  const ligneBarbe = EXCEPTION.replace('[CHANGEMENT]', 'a beard change').replace('[CE_CHANGEMENT]', 'that change');
  verifier('« the rules below »', ligneBarbe.startsWith('Exception to the rules below:'));
  verifier('juste avant « Strict rules: », plus à la fin', cas.barbe.image.includes('.\n' + ligneBarbe + '\nStrict rules:\n') && !cas.barbe.image.endsWith(ligneBarbe));

  console.log('4. Avertissements de l’écran Résultat');
  await page.goto(ADRESSE);
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto(ADRESSE);
  await page.click('[data-mode="salon"]');
  await page.click('#action-accueil');
  await page.click('#passer-photo');
  await page.click('[data-question="longueur"][data-valeur="courte"]');
  await page.click('#action-questions');
  await page.click('#vers-catalogues');
  await page.click('#ecran-choix a[href="#catalogue"]');
  await page.click('#ecran-catalogue [data-coupe="long-droit"]');
  await page.click('#vers-caracteristiques');
  await page.click('[data-caracteristique="keratine"]');
  await page.click('#ecran-personnalise .btn');
  const alertes = () => page.$$eval('#alertes-resultat .alerte', (a) => a.map((x) => x.querySelector('b').textContent + ' : ' + x.querySelector('span').textContent).join(' | '));
  verifier('kératine + long sur cheveux courts : les deux avertissements', await alertes(),
    'Changement de texture : Vérifie que la tête et le visage n’ont pas bougé. Sinon, relance. | Rallongement : Environ 1 cm par mois de pousse. Sinon, extensions.');
  verifier('étape 3 = Texture', await page.textContent('#etapes .carte:nth-child(3) .etape'), 'Étape 3 · Texture');
  verifier('consigne photo de l’étape Diagnostic', await page.$eval('#etapes .carte', (c) => c.querySelector('.consigne').textContent), 'Tête droite, face à l’objectif. Si elle est tournée, Gemini la redresse.');
  await page.click('#retour');
  await page.click('[data-caracteristique="keratine"]');
  await page.click('#retour');
  await page.click('#retour');
  await page.click('#ecran-catalogue [data-coupe="carre-droit"]');
  await page.click('#action-reglages');
  verifier('carré au menton sur cheveux courts, sans texture : rallongement seul', await alertes(), 'Rallongement : Environ 1 cm par mois de pousse. Sinon, extensions.');
  await page.click('#retour');
  await page.click('#retour');
  await page.click('#ecran-catalogue [data-coupe="pixie"]');
  await page.click('#action-reglages');
  verifier('pixie sur cheveux courts : aucun avertissement', await page.isHidden('#alertes-resultat'));

  await navigateur.close();
  verifier('aucune erreur JavaScript', erreurs.join(' | '), '');
  console.log(echecs === 0 ? '\nTEXTURE : ' + reussites + ' vérifications réussies.' : '\nTEXTURE : ' + echecs + ' échec(s).');
  process.exit(echecs === 0 ? 0 : 1);
})();
