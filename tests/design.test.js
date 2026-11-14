/* Relecture adverse automatique : cherche tout écart à DESIGN.md.
   1) Lecture de styles.css : couleur hors thème, espacement hors multiples de 8, taille de texte
      hors échelle, ombre, dégradé, flou, animation, arrondi hors thème, style propre à un écran.
   2) Lecture de index.html et app.js : aucune couleur ni style écrits en dur.
   3) Audit de chaque écran affiché (3 thèmes, 2 largeurs) : mêmes règles sur le rendu réel,
      plus zones tactiles, débordements, textes coupés, bouton principal visible.
   Lancer : node tests/design.test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { RACINE, THEMES, FORMATS, ECRANS, VARIANTES, ouvrir, auditer, chromium } = require('./outils');

let echecs = 0;
const echec = (texte) => { echecs++; console.log('    ÉCART  ' + texte); };

/* ---------- 1. styles.css ---------- */
console.log('1. styles.css');
const css = fs.readFileSync(path.join(RACINE, 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const regles = [];
(function lire(texte, contexte) {
  const re = /([^{}]+)\{((?:[^{}]|\{[^{}]*\})*)\}/g;
  let m;
  while ((m = re.exec(texte))) {
    const selecteur = m[1].trim();
    if (selecteur.startsWith('@media')) lire(m[2], selecteur);
    else regles.push({ selecteur, contexte, declarations: m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const i = d.indexOf(':');
      return { propriete: d.slice(0, i).trim(), valeur: d.slice(i + 1).trim() };
    }) });
  }
})(css, '');

const ECHELLE = ['12px', '16px', '20px', '28px'];
const estTheme = (s) => /^:root(\[data-theme="(salon|barber)"\])?$/.test(s);
const pixels = (v) => (v.match(/-?\d*\.?\d+px/g) || []).map(parseFloat);
const COULEUR_EN_DUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\b(white|black|red|blue|green|gray|grey|silver|orange|yellow|pink|purple)\b/;

for (const r of regles) {
  const ou = r.selecteur.replace(/\s+/g, ' ');
  if (/#[a-z]/i.test(r.selecteur)) echec(ou + ' : style attaché à un identifiant (style propre à un écran)');
  for (const { propriete, valeur } of r.declarations) {
    const d = ou + ' { ' + propriete + ': ' + valeur + ' }';
    if (estTheme(r.selecteur)) {
      if (!propriete.startsWith('--')) echec(d + ' : un bloc de thème ne contient que des variables');
      continue;
    }
    if (COULEUR_EN_DUR.test(valeur)) echec(d + ' : couleur écrite en dur');
    if (/shadow/.test(propriete)) echec(d + ' : ombre');
    if (/gradient/.test(valeur)) echec(d + ' : dégradé');
    if (/^(filter|backdrop-filter)$/.test(propriete) || /blur\(/.test(valeur)) echec(d + ' : flou ou effet de verre');
    if (/^animation/.test(propriete)) echec(d + ' : animation');
    if (propriete === 'opacity' && valeur !== '1') echec(d + ' : opacité (le texte secondaire passe par --texte-2)');
    if (propriete === 'font-size' && !ECHELLE.includes(valeur)) echec(d + ' : taille hors échelle 12 / 16 / 20 / 28');
    if (propriete === 'font') {
      const taille = /(\d+px)/.exec(valeur);
      if (taille && !ECHELLE.includes(taille[1])) echec(d + ' : taille hors échelle 12 / 16 / 20 / 28');
    }
    if (/^(margin|padding|gap|row-gap|column-gap)(-|$)/.test(propriete)) {
      pixels(valeur).forEach((n) => { if (n % 8 !== 0) echec(d + ' : espacement hors multiples de 8'); });
    }
    if (/^(min-|max-)?(width|height)$/.test(propriete)) {
      pixels(valeur).forEach((n) => { if (n % 8 !== 0) echec(d + ' : dimension hors multiples de 8'); });
    }
    if (propriete === 'border-radius' && !/^(0|var\(--rayon\))(\s+(0|var\(--rayon\)))*$/.test(valeur)) echec(d + ' : arrondi hors thème');
    if (/^border(-(top|right|bottom|left))?(-width)?$/.test(propriete)) {
      pixels(valeur).forEach((n) => { if (![0, 1, 2, 4].includes(n)) echec(d + ' : épaisseur de bordure'); });
    }
    if (propriete === 'transition') {
      (valeur.match(/\d*\.?\d+m?s/g) || []).forEach((t) => {
        const ms = t.endsWith('ms') ? parseFloat(t) : parseFloat(t) * 1000;
        if (ms > 150) echec(d + ' : transition de plus de 150 ms');
      });
    }
  }
}
if (/@keyframes/.test(css)) echec('@keyframes : animation');

/* Un seul jeu de composants : chaque classe de composant est définie une seule fois. */
for (const composant of ['.btn', '.btn-2', '.choix', '.carte', '.champ', '.retour', '.badge', '.risque', '.alerte', '.prompt', '.curseur', '.apercu']) {
  const n = regles.filter((r) => r.contexte === '' && r.selecteur === composant).length;
  if (n !== 1) echec(composant + ' est défini ' + n + ' fois (attendu : 1)');
}
/* Deux polices par thème : celle des titres et Inter. (Le bloc de prompt est à chasse fixe, DESIGN.md section 4.) */
const polices = new Set((css.match(/--police-titres:\s*([^,;]+)/g) || []).map((x) => x.split(':')[1].trim().replace(/"/g, '')));
if (polices.size !== 3) echec('polices de titres : ' + [...polices].join(', '));
console.log('    ' + regles.length + ' règles lues.');

/* ---------- 2. index.html et app.js ---------- */
console.log('2. index.html et app.js');
const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(RACINE, 'app.js'), 'utf8');
if (/\sstyle=/.test(html)) echec('index.html contient un attribut style');
if (/#[0-9a-fA-F]{6}\b/.test(html)) echec('index.html contient une couleur écrite en dur');
if (/#[0-9a-fA-F]{6}\b|rgba?\(/.test(js)) echec('app.js contient une couleur écrite en dur');
if (/<script[^>]+src="http/.test(html)) echec('index.html charge un script externe');
if (/\bfetch\(|XMLHttpRequest|sendBeacon/.test(js)) echec('app.js envoie des données sur le réseau');
console.log('    lus.');

/* ---------- 3. Rendu réel ---------- */
(async () => {
  console.log('3. Écrans affichés');
  const navigateur = await chromium.launch();
  let etats = 0;
  for (const ecran of ECRANS) {
    for (const variante of VARIANTES[ecran]) {
      const vus = new Set();
      for (const theme of THEMES) {
        for (const format of FORMATS) {
          const { contexte, page, erreurs } = await ouvrir(navigateur, { theme, format, ecran, variante });
          const audit = await auditer(page);
          etats++;
          audit.problemes.forEach((p) => vus.add(theme + ' / ' + format.nom + ' : ' + p.regle + ' : ' + p.element + (p.detail ? ' [' + p.detail + ']' : '')));
          erreurs.forEach((e) => vus.add(theme + ' / ' + format.nom + ' : erreur JavaScript : ' + e));
          await contexte.close();
        }
      }
      if (vus.size === 0) console.log('    OK     ' + variante.nom);
      vus.forEach((v) => echec(variante.nom + ' / ' + v));
    }
  }
  await navigateur.close();
  console.log('    ' + etats + ' états d’écran audités.');
  console.log(echecs === 0 ? '\nDESIGN : aucun écart à DESIGN.md.' : '\nDESIGN : ' + echecs + ' écart(s).');
  process.exit(echecs === 0 ? 0 : 1);
})();
