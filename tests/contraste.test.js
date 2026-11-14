/* Test de contraste (WCAG) : chaque paire texte/fond des 3 thèmes doit atteindre 4,5:1.
   1) Calcul sur les couleurs déclarées dans styles.css.
   2) Mesure réelle : chaque texte affiché, sur chaque écran, dans les 3 thèmes, aux 2 largeurs.
   Lancer : node tests/contraste.test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { RACINE, THEMES, FORMATS, ECRANS, VARIANTES, ouvrir, auditer, chromium } = require('./outils');

const css = fs.readFileSync(path.join(RACINE, 'styles.css'), 'utf8');

function variables(selecteur) {
  const debut = css.indexOf(selecteur + ' {');
  if (debut < 0) throw new Error('bloc introuvable : ' + selecteur);
  const corps = css.slice(css.indexOf('{', debut) + 1, css.indexOf('}', debut));
  const v = {};
  corps.split(';').forEach((d) => {
    const m = /(--[\w-]+)\s*:\s*(.+)/s.exec(d);
    if (m) v[m[1]] = m[2].trim();
  });
  return v;
}

const base = variables(':root');
const themes = {
  neutre: base,
  salon: Object.assign({}, base, variables(':root[data-theme="salon"]')),
  barber: Object.assign({}, base, variables(':root[data-theme="barber"]'))
};

function couleur(vars, nom) {
  let v = vars[nom];
  let garde = 0;
  while (/^var\(/.test(v) && garde++ < 5) v = vars[/var\((--[\w-]+)\)/.exec(v)[1]];
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
  m = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/.exec(v);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
  throw new Error('couleur illisible : ' + nom + ' = ' + v);
}
const melanger = (dessus, dessous) => ({
  r: dessus.r * dessus.a + dessous.r * (1 - dessus.a),
  g: dessus.g * dessus.a + dessous.g * (1 - dessus.a),
  b: dessus.b * dessus.a + dessous.b * (1 - dessus.a),
  a: 1
});
const luminance = (c) => {
  const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const rapport = (texte, fond) => {
  const a = luminance(melanger(texte, fond)), b = luminance(fond);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/* [nom, couleur du texte, couleur du fond] : toutes les paires réellement utilisées par styles.css. */
const PAIRES_TEXTE = [
  ['texte sur fond', '--texte', '--fond'],
  ['texte sur surface (cartes, champs, boutons à bascule)', '--texte', '--surface'],
  ['texte secondaire sur fond', '--texte-2', '--fond'],
  ['texte secondaire sur surface (cartes, texte d’exemple)', '--texte-2', '--surface'],
  ['texte du bouton principal', '--sur-principale', '--principale'],
  ['texte du choix actif', '--sur-selection', '--selection'],
  ['badge « Conseillée » sur surface', '--selection', '--surface']
];
/* Éléments non textuels (bordures, traits) : seuil WCAG de 3:1. */
const PAIRES_TRAIT = [
  ['bordure d’avertissement sur surface', '--alerte', '--surface'],
  ['bordure de carte choisie sur surface', '--principale', '--surface'],
  ['contour de focus sur fond', '--selection', '--fond'],
  ['silhouettes et icônes sur surface', '--texte', '--surface']
];

let echecs = 0;
console.log('1. Couleurs déclarées dans styles.css');
for (const theme of THEMES) {
  const vars = themes[theme];
  console.log('  Thème ' + theme);
  for (const [nom, t, f] of PAIRES_TEXTE) {
    const r = rapport(couleur(vars, t), couleur(vars, f));
    const ok = r >= 4.5;
    if (!ok) echecs++;
    console.log('    ' + (ok ? 'OK    ' : 'ÉCHEC ') + r.toFixed(1).replace('.', ',').padStart(4) + ':1  ' + nom);
  }
  for (const [nom, t, f] of PAIRES_TRAIT) {
    const r = rapport(couleur(vars, t), couleur(vars, f));
    const ok = r >= 3;
    if (!ok) echecs++;
    console.log('    ' + (ok ? 'OK    ' : 'ÉCHEC ') + r.toFixed(1).replace('.', ',').padStart(4) + ':1  ' + nom + ' (trait, seuil 3:1)');
  }
  /* Le texte secondaire et les bordures sont bien la couleur `texte` rendue transparente (DESIGN.md). */
  const texte = couleur(vars, '--texte');
  for (const [nom, opacite] of [['--texte-2', 0.7], ['--bordure', theme === 'barber' ? 0.35 : 0.15]]) {
    const c = couleur(vars, nom);
    const ok = c.r === texte.r && c.g === texte.g && c.b === texte.b && c.a === opacite;
    if (!ok) echecs++;
    console.log('    ' + (ok ? 'OK    ' : 'ÉCHEC ') + '        ' + nom + ' = texte à ' + Math.round(opacite * 100) + ' %');
  }
}

(async () => {
  console.log('2. Textes réellement affichés (toutes les pages, 3 thèmes, 2 largeurs)');
  const navigateur = await chromium.launch();
  const minimum = {};
  let mesures = 0;
  for (const ecran of ECRANS) {
    for (const variante of VARIANTES[ecran]) {
      for (const theme of THEMES) {
        for (const format of FORMATS) {
          const { contexte, page } = await ouvrir(navigateur, { theme, format, ecran, variante });
          const audit = await auditer(page);
          mesures++;
          audit.problemes.filter((p) => p.regle.startsWith('contraste')).forEach((p) => {
            echecs++;
            console.log('    ÉCHEC ' + variante.nom + ' / ' + theme + ' / ' + format.nom + ' : ' + p.element + ' [' + p.detail + ']');
          });
          if (!minimum[theme] || audit.contrasteMin.valeur < minimum[theme].valeur) {
            minimum[theme] = { valeur: audit.contrasteMin.valeur, ou: variante.nom + ' : ' + audit.contrasteMin.element };
          }
          await contexte.close();
        }
      }
    }
  }
  await navigateur.close();
  for (const theme of THEMES) {
    console.log('    ' + (minimum[theme].valeur >= 4.5 ? 'OK    ' : 'ÉCHEC ') + minimum[theme].valeur.toFixed(2).replace('.', ',') +
      ':1  plus faible contraste du thème ' + theme + ' (' + minimum[theme].ou + ')');
  }
  console.log('    ' + mesures + ' états d’écran mesurés.');
  console.log(echecs === 0 ? '\nCONTRASTE : toutes les paires atteignent 4,5:1.' : '\nCONTRASTE : ' + echecs + ' échec(s).');
  process.exit(echecs === 0 ? 0 : 1);
})();
