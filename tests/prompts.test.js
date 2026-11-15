/* Test des prompts : le texte de prompts.js doit être identique, caractère pour caractère,
   aux blocs de code de PROMPTS.md (et, pour le fond, au bloc de CLAUDE.md section 8).
   Lancer : node tests/prompts.test.js */
'use strict';
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const PROMPTS = require(path.join(racine, 'prompts.js'));

function blocs(fichier) {
  const texte = fs.readFileSync(path.join(racine, fichier), 'utf8').replace(/\r\n/g, '\n');
  const trouves = [];
  const lignes = texte.split('\n');
  let courant = null;
  for (const ligne of lignes) {
    if (courant === null && ligne.trim() === '```text') { courant = []; continue; }
    if (courant !== null && ligne.trim() === '```') { trouves.push(courant.join('\n')); courant = null; continue; }
    if (courant !== null) courant.push(ligne);
  }
  return trouves;
}

let echecs = 0;
function verifier(nom, obtenu, attendu) {
  if (obtenu === attendu) {
    console.log('  OK      ' + nom + ' (' + attendu.length + ' caractères)');
    return;
  }
  echecs++;
  let i = 0;
  while (i < obtenu.length && i < attendu.length && obtenu[i] === attendu[i]) i++;
  console.log('  ÉCHEC   ' + nom + ' : premier écart au caractère ' + i);
  console.log('    attendu : ' + JSON.stringify(attendu.slice(Math.max(0, i - 30), i + 30)));
  console.log('    obtenu  : ' + JSON.stringify(String(obtenu).slice(Math.max(0, i - 30), i + 30)));
}

const ref = blocs('PROMPTS.md');
const refFond = blocs('CLAUDE.md');

console.log('1. Textes de prompts.js comparés à PROMPTS.md');
if (ref.length !== 8) { console.log('  ÉCHEC   PROMPTS.md doit contenir 8 blocs, trouvé ' + ref.length); echecs++; }
const NOMS = ['diagnostic', 'diagnosticSalon', 'image', 'barbeSeule', 'exception', 'reference', 'ficheBarber', 'ficheSalon'];
NOMS.forEach((nom, i) => {
  verifier(nom, PROMPTS.textes[nom], ref[i]);
});
const [R_DIAG, R_DIAG_SALON, R_IMAGE, R_BARBE, R_EXCEPTION, R_REF, R_FICHE_B, R_FICHE_S] = ref;
verifier('ligne d’exception demandée par Antoine (avec accord)', R_EXCEPTION, 'Exception to the rules above: the requested haircut explicitly asks for [CHANGEMENT]. Apply only [CE_CHANGEMENT] as described, and keep every other rule.');

console.log('1b. Diagnostic salon = diagnostic barber avec les 4 seuls remplacements validés par Antoine');
const REMPLACEMENTS = [
  ['Tu es un barbier expert.', 'Tu es un coiffeur expert.'],
  ["Voici la photo d'un client et la coupe qu'il souhaite", "Voici la photo d'une cliente ou d'un client et la coupe souhaitée"],
  ['(côtés, nuque, dessus)', '(devant, côtés, nuque, longueurs)'],
  ['sur ce client', 'sur cette personne']
];
let attenduSalon = R_DIAG;
REMPLACEMENTS.forEach(([avant, apres]) => {
  const n = attenduSalon.split(avant).length - 1;
  if (n !== 1) { echecs++; console.log('  ÉCHEC   « ' + avant + ' » apparaît ' + n + ' fois dans le diagnostic (attendu : 1)'); }
  attenduSalon = attenduSalon.split(avant).join(apres);
});
verifier('diagnostic salon de PROMPTS.md', R_DIAG_SALON, attenduSalon);
verifier('diagnostic salon de prompts.js', PROMPTS.textes.diagnosticSalon, attenduSalon);

console.log('2. Prompt de fond comparé à CLAUDE.md, section 8');
if (refFond.length !== 2) { console.log('  ÉCHEC   CLAUDE.md doit contenir 2 blocs (fond, règle ajoutée), trouvé ' + refFond.length); echecs++; }
verifier('fond', PROMPTS.textes.fond, refFond[0]);
verifier('règle ajoutée au prompt de retouche', PROMPTS.textes.regleRetouche, refFond[1]);
verifier('règle demandée par Antoine', refFond[1], 'The hair and the person must stay pixel-identical: same haircut, same hair edges, same color, same face, same body.');

console.log('3. Assemblage : seuls [COUPE] et [FOND] changent');
const COUPE = 'Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue $& $1';
const DESC = 'mid skin fade, starting at clipper guard 0.5 $& $1';
const FOND = 'a plain light grey photo studio backdrop';
verifier('diagnostic barber assemblé', PROMPTS.diagnostic(COUPE, 'barber'), R_DIAG.split('[COUPE]').join(COUPE));
verifier('diagnostic salon assemblé', PROMPTS.diagnostic(COUPE, 'salon'), R_DIAG_SALON.split('[COUPE]').join(COUPE));
verifier('image assemblée', PROMPTS.image(DESC, false), R_IMAGE.split('[COUPE]').join(DESC));
verifier('image + barbe seule', PROMPTS.image(DESC, true), R_IMAGE.split('[COUPE]').join(DESC) + '\n' + R_BARBE);
[['barbe', 'a beard change', 'that change'], ['texture', 'a texture change', 'that change'], ['barbe-texture', 'a beard change and a texture change', 'those changes']].forEach(([cle, valeur, accord]) => {
  verifier('image + exception ' + cle + ' (« ' + accord + ' »)', PROMPTS.image(DESC, false, cle), R_IMAGE.split('[COUPE]').join(DESC) + '\n' + R_EXCEPTION.split('[CHANGEMENT]').join(valeur).split('[CE_CHANGEMENT]').join(accord));
});
verifier('sans barbe ni texture : prompt image inchangé', PROMPTS.image(DESC, false, null), R_IMAGE.split('[COUPE]').join(DESC));
verifier('barbe seule : pas de ligne d’exception', PROMPTS.image(DESC, true, 'barbe'), R_IMAGE.split('[COUPE]').join(DESC) + '\n' + R_BARBE);
verifier('photo de référence', PROMPTS.reference(), R_REF);
verifier('fiche barber', PROMPTS.fiche('barber'), R_FICHE_B);
verifier('fiche salon', PROMPTS.fiche('salon'), R_FICHE_S);
verifier('retouche assemblée : prompt de fond + règle', PROMPTS.retouche(FOND), refFond[0].split('[FOND]').join(FOND) + '\n' + refFond[1]);

console.log('4. Marqueurs');
[['diagnostic', '[COUPE]', 1], ['diagnosticSalon', '[COUPE]', 1], ['image', '[COUPE]', 1], ['exception', '[CHANGEMENT]', 1], ['exception', '[CE_CHANGEMENT]', 1], ['fond', '[FOND]', 1], ['reference', '[COUPE]', 0],
  ['ficheBarber', '[COUPE]', 0], ['ficheSalon', '[COUPE]', 0]].forEach(([nom, marqueur, n]) => {
  const compte = PROMPTS.textes[nom].split(marqueur).length - 1;
  if (compte === n) console.log('  OK      ' + nom + ' contient ' + n + ' fois ' + marqueur);
  else { echecs++; console.log('  ÉCHEC   ' + nom + ' contient ' + compte + ' fois ' + marqueur + ', attendu ' + n); }
});
if (/\[COUPE\]|\[FOND\]/.test(PROMPTS.diagnostic('x', 'barber') + PROMPTS.diagnostic('x', 'salon') + PROMPTS.image('x', true) + PROMPTS.retouche('x'))) {
  echecs++; console.log('  ÉCHEC   un marqueur reste dans un prompt assemblé');
} else console.log('  OK      aucun marqueur ne reste après assemblage');

console.log(echecs === 0 ? '\nPROMPTS : tout est identique.' : '\nPROMPTS : ' + echecs + ' écart(s).');
process.exit(echecs === 0 ? 0 : 1);
