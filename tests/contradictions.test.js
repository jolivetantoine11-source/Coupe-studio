/* Test des contradictions (CLAUDE.md, sections 4.6 et 13).
   RÈGLE : le prompt final ne contient jamais deux consignes contradictoires pour une même zone.
   1. Toutes les paires de chaque groupe exclusif (et les paires moustache / bouc contre barbe rasée),
      dans la page : choisir la deuxième ouvre le message « Garder X » / « Garder Y », et le prompt
      ne contient jamais les deux consignes, ni avant, ni après le choix.
   2. Les mêmes paires arrivées autrement (lien partagé, mémoire) : une seule est gardée.
   3. Chaque réglage face à chaque caractéristique de son emplacement : la caractéristique
      remplace le réglage, et la page Réglages l'indique.
   Lancer : node tests/contradictions.test.js */
'use strict';
const { ADRESSE, chromium } = require('./outils');
const K = require('../caracteristiques.js');

let echecs = 0;
let reussites = 0;
const fautes = [];
function compter(ok, texte) {
  if (ok) { reussites++; return; }
  echecs++;
  fautes.push(texte);
}
function verifier(nom, obtenu, attendu) {
  const ok = arguments.length === 2 ? obtenu === true : obtenu === attendu;
  if (ok) { reussites++; console.log('  OK      ' + nom); return; }
  echecs++;
  console.log('  ÉCHEC   ' + nom);
  if (arguments.length === 3) console.log('            attendu : ' + JSON.stringify(attendu) + '\n            obtenu  : ' + JSON.stringify(obtenu));
}

const TOUTES = K.categories.flatMap((c) => c.liste);
const carac = (id) => TOUTES.find((x) => x.id === id);
const COULEUR_LIBRE = 'copper red';
const enDe = (id) => carac(id).libre ? carac(id).en.replace('X', COULEUR_LIBRE) : carac(id).en;

/* Toutes les paires à vérifier : chaque paire de chaque groupe, puis les exclusions. */
const PAIRES = [];
K.groupes.forEach((g) => {
  for (let i = 0; i < g.ids.length; i++) for (let j = i + 1; j < g.ids.length; j++) PAIRES.push([g.ids[i], g.ids[j], g.nom]);
});
K.exclusions.forEach((e) => PAIRES.push([e.ids[0], e.ids[1], e.nom]));

/* Combien de fois une consigne apparaît dans [COUPE]. */
const occurrences = (texte, morceau) => texte.split(morceau).length - 1;

(async () => {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto(ADRESSE);
  await page.click('[data-mode="barber"]');
  await page.click('#action-accueil');
  await page.click('#passer-photo');
  await page.click('#passer-profil');
  await page.click('#ecran-choix a[href="#personnalise"]');
  await page.evaluate((t) => { window.CoupeStudio.etat.couleurLibre = t; }, COULEUR_LIBRE);
  const desc = () => page.evaluate(() => window.CoupeStudio.descAnglaise(window.CoupeStudio.creation()));
  const presse = (id) => page.getAttribute('[data-caracteristique="' + id + '"]', 'aria-pressed');
  const choisies = () => page.evaluate(() => window.CoupeStudio.etat.caracteristiques.slice());

  console.log('1. Toutes les paires de chaque groupe, dans la page (' + PAIRES.length + ' paires)');
  for (const [a, b, groupe] of PAIRES) {
    const nom = carac(a).fr + ' / ' + carac(b).fr;
    await page.click('[data-caracteristique="' + a + '"]');
    await page.click('[data-caracteristique="' + b + '"]');
    let d = await desc();
    if (!(await page.isVisible('#conflit'))) {
      compter(false, nom + ' : pas de message de conflit, [COUPE] = ' + d);
      for (const id of await choisies()) await page.click('[data-caracteristique="' + id + '"]');
      continue;
    }
    compter((await page.textContent('#texte-conflit')).includes('(' + groupe + ')'), nom + ' : le message ne nomme pas le groupe « ' + groupe + ' »');
    compter((await page.textContent('#garder-existantes')) === 'Garder ' + carac(a).fr && (await page.textContent('#garder-nouvelle')) === 'Garder ' + carac(b).fr, nom + ' : boutons « Garder » faux');
    compter((await presse(b)) === 'false', nom + ' : la deuxième est ajoutée sans attendre le choix');
    compter(occurrences(d, enDe(a)) === 1 && occurrences(d, enDe(b)) === 0, nom + ' : avant le choix, [COUPE] = ' + d);
    await page.click('#garder-nouvelle');
    d = await desc();
    compter((await presse(a)) === 'false' && (await presse(b)) === 'true', nom + ' : « Garder ' + carac(b).fr + ' » n’a pas remplacé');
    compter(occurrences(d, enDe(a)) === 0 && occurrences(d, enDe(b)) === 1, nom + ' : après « Garder », [COUPE] = ' + d);
    await page.click('[data-caracteristique="' + a + '"]');
    await page.click('#garder-existantes');
    d = await desc();
    compter((await presse(a)) === 'false' && (await presse(b)) === 'true' && occurrences(d, enDe(a)) === 0, nom + ' : « Garder » la caractéristique déjà là n’a pas tout gardé');
    await page.click('[data-caracteristique="' + b + '"]');
    compter((await choisies()).length === 0, nom + ' : il reste des caractéristiques choisies');
  }
  verifier(PAIRES.length + ' paires : message, « Garder X » / « Garder Y », jamais deux consignes', fautes.splice(0).join('\n            '), '');

  console.log('2. Les mêmes paires arrivées par un lien ou par la mémoire : une seule est gardée');
  const viaDonnees = await page.evaluate((paires) => {
    const A = window.CoupeStudio;
    return paires.map(([a, b]) => A.validerCaracteristiques([a, b, a]).join()).join(' | ');
  }, PAIRES);
  verifier('validation : la première de chaque paire est gardée', viaDonnees, PAIRES.map(([a]) => a).join(' | '));

  console.log('3. Chaque réglage face aux caractéristiques de son emplacement');
  const reglages = await page.evaluate((libre) => {
    const A = window.CoupeStudio;
    const C = window.CATALOGUE;
    const K2 = window.CARACTERISTIQUES;
    const fautesR = [];
    let n = 0;
    ['skin-fade', 'carre-plongeant', 'crop-texture', 'frange-rideau'].forEach((idCoupe) => {
      const coupe = A.coupeDuCatalogue(idCoupe);
      K2.categories.flatMap((c) => c.liste).forEach((c) => {
        C.reglages[coupe.mode].forEach((g) => {
          const touche = g.slot === c.slot || (c.efface || []).includes(g.slot) || (c.exclutReglage && c.exclutReglage[g.id]);
          if (!touche) return;
          const valeurs = g.type === 'choix'
            ? g.options.filter((o) => o.en && !o.libre && (!c.exclutReglage || c.exclutReglage[g.id].includes(o.v))).map((o) => [o.v, o.en])
            : [[g.min + 2, null]];
          valeurs.forEach(([v, en]) => {
            n++;
            const r = Object.assign(A.reglagesParDefaut(coupe), { [g.id]: v });
            const x = { coupe, reglages: r, caracteristiques: [c.id], couleurLibre: libre };
            const d = A.descAnglaise(x);
            const zone = C.zones.find((z) => z.id === g.slot.split('.')[0]);
            const phrase = d.split('. ').find((p) => p.startsWith(zone.en + ': ')) || '';
            const enC = c.libre ? c.en.replace('X', libre) : c.en;
            const nom = coupe.fr + ' + ' + g.nom + ' = ' + v + ' + « ' + c.fr + ' »';
            if (en && en !== enC && !enC.includes(en) && phrase.includes(en)) fautesR.push(nom + ' : le réglage reste dans « ' + phrase + ' »');
            if (!d.includes(enC)) fautesR.push(nom + ' : la caractéristique manque : ' + d);
            if (!A.composer(x).remplaces[g.id]) fautesR.push(nom + ' : le réglage n’est pas marqué comme remplacé');
          });
        });
      });
    });
    return { n, fautes: fautesR };
  }, COULEUR_LIBRE);
  verifier(reglages.n + ' combinaisons réglage + caractéristique : la caractéristique remplace le réglage', reglages.fautes.join('\n            '), '');

  /* Dans la page : « Côtés remplacés par : rasé sur un côté ». */
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'choix');
  await page.click('#ecran-choix a[href="#catalogue"]');
  await page.click('#ecran-catalogue [data-coupe="skin-fade"]');
  await page.click('[data-reglage="cotes"][data-valeur="degrade"]');
  await page.click('[data-reglage="sabot"][data-valeur="1"]');
  await page.click('#vers-caracteristiques');
  await page.click('[data-caracteristique="rase-cote"]');
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'reglages');
  verifier('Réglages : « Côtés remplacés par : rasé sur un côté »', await page.textContent('#texte-remplace-cotes'), 'Côtés remplacés par : rasé sur un côté');
  verifier('Réglages : « Sabot du bas remplacé par : rasé sur un côté »', await page.textContent('#texte-remplace-sabot'), 'Sabot du bas remplacé par : rasé sur un côté');
  const d = await desc();
  verifier('[COUPE] : une seule consigne pour les côtés', d.split('. ').find((p) => p.startsWith('Sides:')), 'Sides: one side shaved very short, the other side kept longer');
  verifier('le dégradé et le sabot des réglages ne sont pas écrits', /\bfade\b(?! from)|clipper guard 1/.test(d.replace('Skin fade.', '')), false);
  verifier('les valeurs des réglages sont gardées : retirer la caractéristique les rend', await page.evaluate(() => window.CoupeStudio.etat.reglages.cotes + ' ' + window.CoupeStudio.etat.reglages.sabot), 'degrade 1');
  await page.click('#reglage-cotes [data-remplace] a');
  await page.click('[data-caracteristique="rase-cote"]');
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'reglages');
  verifier('caractéristique retirée : le réglage revient', (await desc()).split('. ').find((p) => p.startsWith('Sides:')), 'Sides: mid fade, from guard 1 at the bottom to guard 2 at the top');

  await navigateur.close();
  verifier('aucune erreur JavaScript', erreurs.join(' | '), '');
  console.log(echecs === 0 ? '\nCONTRADICTIONS : ' + reussites + ' vérifications réussies, jamais deux consignes contraires dans une zone.' : '\nCONTRADICTIONS : ' + echecs + ' échec(s).');
  process.exit(echecs === 0 ? 0 : 1);
})();
