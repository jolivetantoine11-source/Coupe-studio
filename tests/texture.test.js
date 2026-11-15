/* Tests série 4 d'Antoine (15 novembre) : Front par défaut, changement de texture, rallongement.
   1. Front sans frange choisie : « no fringe, no bangs, no curtain bangs, forehead uncovered as in the original ».
   2. Changement de texture (lissé, kératine, permanente, défrisage, boucles…) :
      ligne Head pose dans [COUPE], ligne d'exception juste avant « Strict rules: »,
      avertissement « Changement de texture » sur l'écran Résultat.
   3. Longueur demandée > longueur actuelle : avertissement « Rallongement » sur l'écran Résultat.
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
const POSE = 'Head pose: keep the exact head tilt and rotation of the original; change only the hair texture';
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

  console.log('2. Changement de texture');
  const cas = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const P = window.PROMPTS;
    const fait = (id, k, reglages) => {
      const c = A.coupeDuCatalogue(id);
      const x = { coupe: c, reglages: Object.assign(A.reglagesParDefaut(c), reglages || {}), caracteristiques: k, couleurLibre: '', profil: {} };
      const d = A.descAnglaise(x);
      return { desc: d, prompt: P.image(d, false, A.changementDemande(x)), changement: A.changementDemande(x) };
    };
    const r = {};
    ['lisse', 'keratine', 'permanente', 'defrisage', 'boucles', 'ondulations', 'twists', 'vanilles'].forEach((k) => { r[k] = fait('long-droit', [k]); });
    r.barbeTexture = fait('skin-fade', ['permanente'], { barbe: 'courte' });
    r.barbe = fait('skin-fade', [], { barbe: 'courte' });
    r.rien = fait('skin-fade', []);
    r.boucleDefaut = fait('carre-boucle', []);
    return r;
  });
  const avantRegles = (prompt, ligne) => prompt.includes('.\n' + ligne + '\nStrict rules:\n');
  const textures = ['lisse', 'keratine', 'permanente', 'defrisage', 'boucles', 'ondulations', 'twists', 'vanilles'];
  const ligneTexture = EXCEPTION.replace('[CHANGEMENT]', 'a texture change').replace('[CE_CHANGEMENT]', 'that change');
  verifier('kératine et défrisage existent, dans le groupe exclusif texture', await page.evaluate(() => {
    const g = window.CARACTERISTIQUES.groupes.find((x) => x.id === 'texture');
    return g.ids.includes('keratine') && g.ids.includes('defrisage');
  }));
  verifier('les 8 textures : [COUPE] finit par la ligne Head pose', textures.filter((k) => !cas[k].desc.endsWith('. ' + POSE)).join(), '');
  verifier('les 8 textures : ligne d’exception juste avant « Strict rules: »', textures.filter((k) => !avantRegles(cas[k].prompt, ligneTexture)).join(), '');
  verifier('…et pas à la fin', textures.filter((k) => cas[k].prompt.endsWith(ligneTexture)).join(), '');
  verifier('texture + barbe : « those changes », avant « Strict rules: »',
    avantRegles(cas.barbeTexture.prompt, EXCEPTION.replace('[CHANGEMENT]', 'a beard change and a texture change').replace('[CE_CHANGEMENT]', 'those changes')) && cas.barbeTexture.desc.endsWith('. ' + POSE));
  verifier('barbe seule changée : ligne à la fin, pas de Head pose',
    cas.barbe.prompt.endsWith('\n' + EXCEPTION.replace('[CHANGEMENT]', 'a beard change').replace('[CE_CHANGEMENT]', 'that change')) && !cas.barbe.desc.includes('Head pose'));
  verifier('rien de changé : prompt image inchangé', cas.rien.prompt, IMAGE.replace('[COUPE]', cas.rien.desc));
  verifier('texture par défaut du carré bouclé : ni Head pose ni exception', !cas.boucleDefaut.desc.includes('Head pose') && !cas.boucleDefaut.prompt.includes('Exception'));

  console.log('3. Avertissements de l’écran Résultat');
  await page.click('[data-mode="salon"]');
  await page.click('#action-accueil');
  await page.click('[data-question="longueur"][data-valeur="courte"]');
  await page.click('#ecran-client .btn');
  await page.click('#ecran-choix a[href="#catalogue"]');
  await page.click('#ecran-catalogue [data-coupe="long-droit"]');
  await page.click('#vers-caracteristiques');
  await page.click('[data-caracteristique="keratine"]');
  await page.click('#ecran-personnalise .btn');
  const alertes = () => page.$$eval('#alertes-resultat .alerte', (a) => a.map((x) => x.querySelector('b').textContent + ' : ' + x.querySelector('span').textContent).join(' | '));
  verifier('kératine + long sur cheveux courts : les deux avertissements', await alertes(),
    'Changement de texture : Vérifie que la tête et le visage n’ont pas bougé. Sinon, relance. | Rallongement : Environ 1 cm par mois de pousse. Sinon, extensions.');
  verifier('le prompt affiché a bien la ligne avant « Strict rules: »', avantRegles(await page.textContent('#prompt-2'), ligneTexture));
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
