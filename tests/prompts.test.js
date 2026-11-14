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
if (ref.length !== 6) { console.log('  ÉCHEC   PROMPTS.md doit contenir 6 blocs, trouvé ' + ref.length); echecs++; }
['diagnostic', 'image', 'barbeSeule', 'reference', 'ficheBarber', 'ficheSalon'].forEach((nom, i) => {
  verifier(nom, PROMPTS.textes[nom], ref[i]);
});

console.log('2. Prompt de fond comparé à CLAUDE.md, section 8');
if (refFond.length !== 2) { console.log('  ÉCHEC   CLAUDE.md doit contenir 2 blocs (fond, règle ajoutée), trouvé ' + refFond.length); echecs++; }
verifier('fond', PROMPTS.textes.fond, refFond[0]);
verifier('règle ajoutée au prompt de retouche', PROMPTS.textes.regleRetouche, refFond[1]);
verifier('règle demandée par Antoine', refFond[1], 'The hair and the person must stay pixel-identical: same haircut, same hair edges, same color, same face, same body.');

console.log('3. Assemblage : seuls [COUPE] et [FOND] changent');
const COUPE = 'Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue $& $1';
const DESC = 'mid skin fade, starting at clipper guard 0.5 $& $1';
const FOND = 'a plain light grey photo studio backdrop';
verifier('diagnostic assemblé', PROMPTS.diagnostic(COUPE), ref[0].split('[COUPE]').join(COUPE));
verifier('image assemblée', PROMPTS.image(DESC, false), ref[1].split('[COUPE]').join(DESC));
verifier('image + barbe seule', PROMPTS.image(DESC, true), ref[1].split('[COUPE]').join(DESC) + '\n' + ref[2]);
verifier('photo de référence', PROMPTS.reference(), ref[3]);
verifier('fiche barber', PROMPTS.fiche('barber'), ref[4]);
verifier('fiche salon', PROMPTS.fiche('salon'), ref[5]);
verifier('retouche assemblée : prompt de fond + règle', PROMPTS.retouche(FOND), refFond[0].split('[FOND]').join(FOND) + '\n' + refFond[1]);

console.log('4. Marqueurs');
[['diagnostic', '[COUPE]', 1], ['image', '[COUPE]', 1], ['fond', '[FOND]', 1], ['reference', '[COUPE]', 0],
  ['ficheBarber', '[COUPE]', 0], ['ficheSalon', '[COUPE]', 0]].forEach(([nom, marqueur, n]) => {
  const compte = PROMPTS.textes[nom].split(marqueur).length - 1;
  if (compte === n) console.log('  OK      ' + nom + ' contient ' + n + ' fois ' + marqueur);
  else { echecs++; console.log('  ÉCHEC   ' + nom + ' contient ' + compte + ' fois ' + marqueur + ', attendu ' + n); }
});
if (/\[COUPE\]|\[FOND\]/.test(PROMPTS.diagnostic('x') + PROMPTS.image('x', true) + PROMPTS.retouche('x'))) {
  echecs++; console.log('  ÉCHEC   un marqueur reste dans un prompt assemblé');
} else console.log('  OK      aucun marqueur ne reste après assemblage');

console.log(echecs === 0 ? '\nPROMPTS : tout est identique.' : '\nPROMPTS : ' + echecs + ' écart(s).');
process.exit(echecs === 0 ? 0 : 1);
