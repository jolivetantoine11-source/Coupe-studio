/* Les tableaux de CLAUDE.md (zones, coupe → zones, réglages, caractéristiques, groupes) sont
   générés depuis les fichiers de données, pour ne jamais diverger.
   node tests/tableaux.js            vérifie qu'ils sont à jour (sortie 1 sinon)
   node tests/tableaux.js --ecrire   les réécrit dans CLAUDE.md */
'use strict';
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const C = require(path.join(RACINE, 'catalogue.js'));
const K = require(path.join(RACINE, 'caracteristiques.js'));

const NOMS_PARTS = { length: 'longueur', shape: 'forme', layers: 'couches', style: 'style', guard: 'sabot', extra: 'en plus', part: 'raie', edges: 'contours', texture: 'texture', color: 'couleur' };
const code = (t) => '`' + t + '`';
const zone = (slot) => C.zones.find((z) => z.id === slot.split('.')[0]);
const nomSlot = (slot) => zone(slot).en + ' / ' + NOMS_PARTS[slot.split('.')[1]];

function tableauZones() {
  const lignes = ['| Ordre | Zone dans [COUPE] | Nom français | Emplacements |', '|---|---|---|---|'];
  C.zones.forEach((z, i) => lignes.push('| ' + (i + 1) + ' | ' + z.en + ' | ' + z.fr + ' | ' + z.parts.map((p) => NOMS_PARTS[p]).join(', ') + ' |'));
  return lignes.join('\n');
}

function tableauCoupes() {
  const lignes = [];
  ['barber', 'salon'].forEach((mode) => {
    lignes.push('#### ' + (mode === 'barber' ? 'Barber' : 'Salon'), '', '| fr | Ligne affichée | Nom anglais | Zones (texte anglais) |', '|---|---|---|---|');
    C.coupes.filter((c) => c.mode === mode).forEach((c) => {
      const zones = C.zones.map((z) => {
        const parts = z.parts.map((p) => c.zones[z.id + '.' + p]).filter(Boolean);
        return parts.length ? '**' + z.en + '** : ' + parts.join(', ') : null;
      }).filter(Boolean).join('<br>');
      lignes.push('| ' + c.fr + ' | ' + c.ligne + ' | ' + c.en + ' | ' + zones + ' |');
    });
    lignes.push('');
  });
  return lignes.join('\n').trim();
}

function tableauReglages() {
  const lignes = [];
  ['barber', 'salon'].forEach((mode) => {
    lignes.push('#### Mode ' + mode, '', '| Réglage | Emplacement | Options (texte anglais) |', '|---|---|---|');
    C.reglages[mode].forEach((g) => {
      let options;
      if (g.type === 'curseur') options = 'curseur ' + g.min + '-' + g.max + ' cm (' + code(g.en) + ')';
      else if (g.type === 'longueur') options = g.reperes.map((r) => r.fr + ' (' + code(r.en) + ')').join(' · ') + ', curseur ' + g.min + '-' + g.max + ' cm (' + code(g.en) + ')';
      else options = g.options.map((o) => o.fr + ' (' + (o.en ? code(o.en) : 'rien') + ')').join(' · ');
      lignes.push('| ' + g.nom + ' | ' + nomSlot(g.slot) + ' | ' + options + ' |');
    });
    lignes.push('');
  });
  return lignes.join('\n').trim();
}

function groupeDe(id) {
  const g = K.groupes.find((x) => x.ids.includes(id));
  const e = K.exclusions.filter((x) => x.ids.includes(id)).map((x) => x.ids.find((y) => y !== id));
  const morceaux = [];
  if (g) morceaux.push(g.nom);
  if (e.length) morceaux.push('pas avec ' + e.join(', '));
  return morceaux.join(' ; ') || '—';
}

function tableauCaracteristiques() {
  const lignes = ['| Catégorie | Caractéristique | Emplacement | Texte anglais | Groupe exclusif |', '|---|---|---|---|---|'];
  K.categories.forEach((cat) => cat.liste.forEach((x) => {
    const en = x.libre ? code(x.en.replace(' X', ' ')) + ' + le texte saisi' : code(x.en);
    let place = nomSlot(x.slot);
    if (x.efface) place += ' (vide aussi ' + x.efface.map(nomSlot).join(', ') + ')';
    if (x.exclutReglage) place += ' (remplace la barbe « Rasée » des réglages)';
    lignes.push('| ' + cat.nom + ' | ' + x.fr + ' | ' + place + ' | ' + en + ' | ' + groupeDe(x.id) + ' |');
  }));
  return lignes.join('\n');
}

function tableauGroupes() {
  const nom = (id) => K.categories.flatMap((c) => c.liste).find((x) => x.id === id).fr.toLowerCase();
  const lignes = ['| Groupe | Caractéristiques exclusives entre elles |', '|---|---|'];
  K.groupes.forEach((g) => lignes.push('| ' + g.nom + ' | ' + g.ids.map(nom).join(' / ') + ' |'));
  K.exclusions.forEach((e) => lignes.push('| ' + e.nom + ' (paire) | ' + e.ids.map(nom).join(' / ') + ' |'));
  return lignes.join('\n');
}

const TABLEAUX = { zones: tableauZones, coupes: tableauCoupes, reglages: tableauReglages, caracteristiques: tableauCaracteristiques, groupes: tableauGroupes };

const fichier = path.join(RACINE, 'CLAUDE.md');
let doc = fs.readFileSync(fichier, 'utf8');
let ecarts = 0;
for (const [nom, fabriquer] of Object.entries(TABLEAUX)) {
  const debut = '<!-- tableau:' + nom + ' -->';
  const fin = '<!-- /tableau:' + nom + ' -->';
  const i = doc.indexOf(debut);
  const j = doc.indexOf(fin);
  if (i < 0 || j < i) { console.log('  ÉCHEC   repères absents pour le tableau « ' + nom + ' »'); ecarts++; continue; }
  const attendu = '\n' + fabriquer() + '\n';
  const actuel = doc.slice(i + debut.length, j);
  if (actuel === attendu) { console.log('  OK      tableau « ' + nom + ' » à jour'); continue; }
  if (process.argv.includes('--ecrire')) {
    doc = doc.slice(0, i + debut.length) + attendu + doc.slice(j);
    console.log('  ÉCRIT   tableau « ' + nom + ' »');
  } else {
    ecarts++;
    console.log('  ÉCHEC   tableau « ' + nom + ' » différent des données (lance node tests/tableaux.js --ecrire)');
  }
}
if (process.argv.includes('--ecrire')) fs.writeFileSync(fichier, doc);
console.log(ecarts === 0 ? '\nTABLEAUX : CLAUDE.md est à jour.' : '\nTABLEAUX : ' + ecarts + ' tableau(x) à mettre à jour.');
process.exit(ecarts === 0 ? 0 : 1);
