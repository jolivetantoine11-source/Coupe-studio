/* Captures : chaque écran à 390 px et 1280 px de large, dans les 3 thèmes, avec l'audit DESIGN.md.
   Lancer : node tests/captures.js            (tous les écrans)
            node tests/captures.js accueil    (un seul écran)
   Sorties : tests/captures/<état>-<thème>-<largeur>.png et tests/captures/planches/<état>.png */
'use strict';
const fs = require('fs');
const path = require('path');
const { THEMES, FORMATS, ECRANS, VARIANTES, ouvrir, auditer, chromium } = require('./outils');

const DOSSIER = path.join(__dirname, 'captures');
const PLANCHES = path.join(DOSSIER, 'planches');

async function planche(navigateur, nom, lignes) {
  const html = '<body style="margin:0;background:#888;font:14px sans-serif">' + lignes.map((l) =>
    '<div style="display:flex;gap:8px;padding:8px 8px 0;align-items:flex-start">' + l.map((f) =>
      '<img src="file://' + f.fichier + '" style="width:' + f.largeur + 'px;display:block">').join('') + '</div>').join('') +
    '<div style="height:8px"></div></body>';
  const page = await navigateur.newPage({ viewport: { width: 1202, height: 600 }, deviceScaleFactor: 1 });
  /* Les images locales ne se chargent que depuis une page locale : on passe par un fichier temporaire. */
  const temporaire = path.join(PLANCHES, nom + '.tmp.html');
  fs.writeFileSync(temporaire, html);
  await page.goto('file://' + temporaire);
  const fichier = path.join(PLANCHES, nom + '.png');
  await page.screenshot({ path: fichier, fullPage: true });
  await page.close();
  fs.unlinkSync(temporaire);
  return fichier;
}

(async () => {
  const demandes = process.argv.slice(2).filter((a) => ECRANS.includes(a));
  const ecrans = demandes.length ? demandes : ECRANS;
  fs.mkdirSync(PLANCHES, { recursive: true });
  const navigateur = await chromium.launch();
  let total = 0;

  for (const ecran of ecrans) {
    for (const variante of VARIANTES[ecran]) {
      const haut = [], bas = [], large = [];
      for (const theme of THEMES) {
        for (const format of FORMATS) {
          const { contexte, page, erreurs } = await ouvrir(navigateur, { theme, format, ecran, variante });
          const base = path.join(DOSSIER, variante.nom + '-' + theme + '-' + format.nom);
          await page.screenshot({ path: base + '.png' });
          const audit = await auditer(page);
          const soucis = audit.problemes.map((p) => p.regle + ' : ' + p.element + (p.detail ? ' [' + p.detail + ']' : ''))
            .concat(erreurs.map((e) => 'erreur JavaScript : ' + e));
          if (audit.theme !== theme) soucis.push('thème affiché « ' + audit.theme + ' » au lieu de « ' + theme + ' »');
          total += soucis.length;
          console.log((soucis.length ? 'ÉCART  ' : 'OK     ') + variante.nom + ' / ' + theme + ' / ' + format.nom +
            '  (contraste mini ' + audit.contrasteMin.valeur.toFixed(2) + ', polices ' + Object.keys(audit.polices).join(' + ') + ')');
          [...new Set(soucis)].forEach((s) => console.log('         - ' + s));

          if (format.nom === '390') {
            haut.push({ fichier: base + '.png', largeur: 390 });
            /* Si l'écran défile, on capture aussi le bas. */
            const defile = await page.evaluate(() => {
              const d = document.querySelector('.ecran:not([hidden]) .defile');
              if (!d || d.scrollHeight <= d.clientHeight + 1) return false;
              d.scrollTop = d.scrollHeight;
              return true;
            });
            if (defile) {
              await page.waitForTimeout(50);
              await page.screenshot({ path: base + '-bas.png' });
              bas.push({ fichier: base + '-bas.png', largeur: 390 });
            }
          } else {
            large.push({ fichier: base + '.png', largeur: 390 });
          }
          await contexte.close();
        }
      }
      const lignes = [haut];
      if (bas.length) lignes.push(bas);
      lignes.push(large);
      await planche(navigateur, variante.nom, lignes);
    }
  }
  await navigateur.close();
  console.log(total === 0 ? '\nCAPTURES : aucun écart.' : '\nCAPTURES : ' + total + ' écart(s).');
  process.exit(total === 0 ? 0 : 1);
})();
