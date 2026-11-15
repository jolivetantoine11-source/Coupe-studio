/* Test de parcours : l'appli fait bien ce que CLAUDE.md demande, de l'accueil au prompt copié,
   au catalogue personnalisé et au catalogue fond.
   Lancer : node tests/parcours.test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { RACINE, ADRESSE, PHOTO_TEST, chromium } = require('./outils');

/* Les blocs de référence, lus directement dans PROMPTS.md et CLAUDE.md. */
function blocs(fichier) {
  const sortie = [];
  let courant = null;
  for (const ligne of fs.readFileSync(path.join(RACINE, fichier), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    if (courant === null && ligne.trim() === '```text') { courant = []; continue; }
    if (courant !== null && ligne.trim() === '```') { sortie.push(courant.join('\n')); courant = null; continue; }
    if (courant !== null) courant.push(ligne);
  }
  return sortie;
}
const [DIAGNOSTIC, DIAGNOSTIC_SALON, IMAGE, BARBE_SEULE, EXCEPTION, REFERENCE, COULEUR, FICHE_BARBER, FICHE_SALON] = blocs('PROMPTS.md');
/* Le prompt image, avec la ligne d'exception si [COUPE] demande un changement de barbe ou de texture. */
const imageAvec = (coupe, changement) => avec(IMAGE, '[COUPE]', coupe) + (changement ? '\n' + avec(avec(EXCEPTION, '[CHANGEMENT]', changement), '[CE_CHANGEMENT]', changement.includes(' and ') ? 'those changes' : 'that change') : '');
const [FOND, REGLE] = blocs('CLAUDE.md');
const avec = (bloc, marqueur, valeur) => bloc.split(marqueur).join(valeur);

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

const erreursJs = [];
async function nouvelle(navigateur, options) {
  const o = options || {};
  const contexte = await navigateur.newContext({ viewport: { width: o.largeur || 390, height: o.hauteur || 844 } });
  if (!o.sansPressePapiers) await contexte.grantPermissions(['clipboard-read', 'clipboard-write']);
  if (o.avant) await contexte.addInitScript(o.avant);
  const page = await contexte.newPage();
  page.on('pageerror', (e) => erreursJs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreursJs.push(m.text()); });
  await page.goto(o.adresse || ADRESSE);
  return { contexte, page };
}
const theme = (page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
const ecran = (page) => page.evaluate(() => window.CoupeStudio.etat.ecran);
const texte = async (page, selecteur) => (await page.textContent(selecteur)).trim();
const desc = (page) => page.evaluate(() => window.CoupeStudio.descAnglaise(window.CoupeStudio.creation()));
const ids = (page, selecteur, attribut) => page.$$eval(selecteur, (n, a) => n.map((x) => x.getAttribute(a)), attribut);
const regler = (page, id, valeur) => page.evaluate(([i, v]) => {
  const c = document.getElementById(i);
  c.value = String(v);
  c.dispatchEvent(new Event('input', { bubbles: true }));
}, [id, valeur]);
const presse = (page, selecteur) => page.getAttribute(selecteur, 'aria-pressed');
const pressePapiers = (page) => page.evaluate(() => navigator.clipboard.readText());
const modesDe = (page, liste) => page.evaluate((l) => l.map((id) => window.CoupeStudio.coupeDuCatalogue(id).mode), liste);
/* Va de l'accueil au Catalogue coupe en passant le profil. */
async function jusquAuCatalogue(page) {
  await page.click('#action-accueil');
  await page.click('#passer-profil');
  await page.click('#ecran-choix a[href="#catalogue"]');
}
const pixel = (page, x, y) => page.evaluate(([px, py]) => {
  const c = document.querySelector('#apercu');
  return Array.from(c.getContext('2d').getImageData(Math.round(c.width * px), Math.round(c.height * py), 1, 1).data.slice(0, 3));
}, [x, y]);
const tailleApercu = (page) => page.evaluate(() => { const c = document.querySelector('#apercu'); return c.width + ' × ' + c.height; });

(async () => {
  const navigateur = await chromium.launch();

  /* ============ A. Accueil et structure ============ */
  console.log('A. Accueil, mode, structure page par page');
  let { contexte, page } = await nouvelle(navigateur);
  verifier('premier lancement : thème neutre', await theme(page), 'neutre');
  verifier('titre et sous-titre', (await texte(page, '#titre-accueil')) + ' / ' + (await texte(page, '#ecran-accueil .sous-titre')), 'Coupe Studio / Montre la coupe avant de la faire.');
  verifier('plus de barre d’onglets', (await page.$$('nav, .onglets, .onglet')).length, 0);
  verifier('bouton principal « Commencer »', await texte(page, '#action-accueil'), 'Commencer');
  await page.click('[data-mode="barber"]');
  verifier('choisir Barber : thème barber', await theme(page), 'barber');
  await page.reload();
  verifier('le mode est mémorisé après rechargement', await theme(page), 'barber');
  await page.click('[data-mode="barber"]');
  verifier('retoucher le mode actif : retour au thème neutre', await theme(page), 'neutre');
  await page.click('#action-accueil');
  verifier('« Commencer » ouvre le Profil client', await ecran(page), 'client');
  await page.click('#passer-profil');
  verifier('« Passer » ouvre « Que veux-tu faire ? »', await ecran(page), 'choix');
  verifier('3 gros boutons', (await page.$$eval('#ecran-choix .carte-grand-titre', (t) => t.map((x) => x.textContent))).join(' | '), 'Catalogue coupe | Catalogue personnalisé | Catalogue fond');
  await page.click('#ecran-choix a[href="#catalogue"]');
  let liste = await ids(page, '#grille-coupes [data-coupe]', 'data-coupe');
  let modes = await modesDe(page, liste);
  verifier('thème neutre : 6 barber et 6 salon', modes.filter((m) => m === 'barber').length + '/' + modes.filter((m) => m === 'salon').length, '6/6');
  verifier('profil passé : pas de bloc « Conseillées »', await page.isHidden('#bloc-conseillees'));
  verifier('profil passé : aucune coupe marquée à risque', (await page.$$('#grille-coupes .risque')).length, 0);
  await contexte.close();

  /* ============ B. Profil en premier, coupes conseillées ============ */
  console.log('B. Profil client en premier : coupes conseillées et coupes à risque');
  ({ contexte, page } = await nouvelle(navigateur));
  await page.click('[data-mode="barber"]');
  await page.click('#action-accueil');
  verifier('5 questions', (await page.$$('#questions .groupe')).length, 5);
  verifier('« Cheveux fins » absent en barber', (await page.$$('[data-question="front"][data-valeur="fins"]')).length, 0);
  await page.click('[data-question="texture"][data-valeur="boucles"]');
  await page.click('[data-question="front"][data-valeur="golfes-marques"]');
  await page.click('[data-question="longueur"][data-valeur="courte"]');
  await page.click('[data-question="lunettes"][data-valeur="oui"]');
  await page.click('#ecran-client .btn');
  await page.click('#ecran-choix a[href="#catalogue"]');
  liste = await ids(page, '#ecran-catalogue [data-coupe]', 'data-coupe');
  modes = await modesDe(page, liste);
  verifier('mode barber : 12 coupes barber en tout', modes.filter((m) => m === 'barber').length + ' / ' + liste.length, '12 / 12');
  verifier('« Autres coupes » ne répète pas les conseillées', (await ids(page, '#grille-coupes [data-coupe]', 'data-coupe')).filter((id) => ['buzz-cut', 'crop-texture', 'crew-cut'].includes(id)).length + ' / ' + (await texte(page, '#titre-toutes')), '0 / Autres coupes');
  verifier('cartes en texte : aucune silhouette', (await page.$$('#ecran-catalogue .coupe svg, #ecran-catalogue img')).length, 0);
  verifier('carte : nom, une ligne, badges', await page.$eval('#conseillees .coupe', (c) => Array.from(c.children).map((x) => x.className).join(' ')), 'badge coupe-nom coupe-ligne');
  verifier('« Conseillées pour ce client » en haut', await texte(page, '#bloc-conseillees h2'), 'Conseillées pour ce client');
  verifier('3 coupes conseillées : bouclés + golfes marqués', (await ids(page, '#conseillees [data-coupe]', 'data-coupe')).join(), 'buzz-cut,crop-texture,crew-cut');
  verifier('badge « Conseillée » sur les 3', (await page.$$eval('#conseillees .badge', (b) => b.map((x) => x.textContent))).join(), 'Conseillée,Conseillée,Conseillée');
  const risquesDe = (id) => page.$$eval('#ecran-catalogue [data-coupe="' + id + '"] .risque', (r) => r.map((x) => x.textContent).join(' + '));
  verifier('slick back : pousse, lissage, golfes', await risquesDe('slick-back'), 'Pousse nécessaire + Lissage nécessaire + Golfes');
  verifier('quiff : pousse, golfes', await risquesDe('quiff'), 'Pousse nécessaire + Golfes');
  verifier('skin fade : aucun risque', await risquesDe('skin-fade'), '');
  const regles = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const vide = { texture: null, visage: null, front: null, longueur: null, lunettes: null };
    const p = (profil) => A.propositions(Object.assign({}, vide, profil)).map((c) => c.id).join();
    return { ovale: p({ visage: 'ovale' }), rond: p({ visage: 'rond' }), carre: p({ visage: 'carre' }), allonge: p({ visage: 'allonge' }) };
  });
  verifier('visage ovale : les 3 plus demandées', regles.ovale, 'skin-fade,crop-texture,taper-bas');
  verifier('visage rond : crop et quiff d’abord, pas de buzz cut', regles.rond.startsWith('crop-texture,quiff') && !regles.rond.includes('buzz-cut'));
  verifier('visage carré : raie sur le côté et mi-long flow', regles.carre.startsWith('raie-cote,mi-long-flow'));
  verifier('visage allongé : crop et crew cut, pas de quiff', regles.allonge.startsWith('crop-texture,crew-cut') && !regles.allonge.includes('quiff'));

  /* ============ C. Réglages ============ */
  /* Le profil de la section B a « Golfes marqués » : [COUPE] finit donc par la ligne Density. */
  console.log('C. Réglages d’une coupe : [COUPE] structurée par zone, coiffage par zone, barbe seule');
  await page.click('#ecran-catalogue [data-coupe="skin-fade"]');
  verifier('toucher une coupe ouvre directement Réglages', await ecran(page), 'reglages');
  verifier('titre = nom de la coupe', await texte(page, '#titre-reglages'), 'Skin fade');
  verifier('résumé de départ', await texte(page, '#resume-reglages'), 'Skin fade, sabot 0, dessus 5 cm');
  verifier('[COUPE] structurée par zone, nom anglais en tête', await desc(page),
    'Skin fade. Sides: mid skin fade, from guard 0 at the bottom to guard 2 at the top. Top: 4-6 cm, textured. Front: no fringe, forehead uncovered, keep the front as in the original. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original');
  verifier('réglages barber, coiffage par zone', (await page.$$eval('#zone-reglages .etiquette', (e) => e.map((x) => x.textContent))).join(' | '),
    'Côtés | Hauteur | Sabot du bas | Dessus | Coiffage, devant et frange | Coiffage, dessus | Contours | Barbe');
  verifier('zone devant : 4 choix', (await page.$$eval('[data-reglage="devant"]', (b) => b.map((x) => x.textContent))).join(' · '), 'Vers l’avant · Relevé · Sur le côté · En arrière');
  verifier('zone dessus : 4 choix', (await page.$$eval('[data-reglage="coiffage"]', (b) => b.map((x) => x.textContent))).join(' · '), 'En arrière · Sur le côté · Naturel · Décoiffé');
  /* Dégradé : hauteur, sabot 0 = skin fade, sinon fade (décision du 16 novembre). */
  verifier('Hauteur visible quand les côtés sont en dégradé, préréglée par la coupe', (await page.isVisible('#reglage-hauteur')) + ' / ' + (await presse(page, '[data-reglage="hauteur"][data-valeur="mi"]')), 'true / true');
  await page.click('[data-reglage="hauteur"][data-valeur="haut"]');
  verifier('hauteur Haut', (await desc(page)).split('. ')[1], 'Sides: high skin fade, from guard 0 at the bottom to guard 2 at the top');
  await page.click('[data-reglage="hauteur"][data-valeur="haut"]');
  verifier('retoucher la hauteur ne la retire pas', await presse(page, '[data-reglage="hauteur"][data-valeur="haut"]'), 'true');
  await page.click('[data-reglage="sabot"][data-valeur="0.5"]');
  verifier('[COUPE] « skin fade, sabot 0,5, hauteur Haut » : fade, seul X change, le nom suit', await desc(page), 'Fade. Sides: high fade, from guard 0.5 at the bottom to guard 2 at the top. Top: 4-6 cm, textured. Front: no fringe, forehead uncovered, keep the front as in the original. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original');
  verifier('sabot 0,5 : Côtés passe tout seul à « Dégradé », le résumé suit', (await presse(page, '[data-reglage="cotes"][data-valeur="degrade"]')) + ' / ' + (await texte(page, '#resume-reglages')), 'true / Dégradé haut, sabot 0,5, dessus 5 cm');
  await page.click('[data-reglage="sabot"][data-valeur="0"]');
  verifier('sabot 0 : retour au skin fade et au nom « Skin fade »', (await presse(page, '[data-reglage="cotes"][data-valeur="blanc"]')) + ' / ' + (await desc(page)).split('. ').slice(0, 2).join('. '), 'true / Skin fade. Sides: high skin fade, from guard 0 at the bottom to guard 2 at the top');
  await page.click('[data-reglage="cotes"][data-valeur="degrade"]');
  verifier('« Dégradé » choisi avec sabot 0 : le sabot passe à 0,5', await presse(page, '[data-reglage="sabot"][data-valeur="0.5"]'), 'true');
  await page.click('[data-reglage="cotes"][data-valeur="taper"]');
  verifier('côtés en taper : Hauteur cachée, le sabot reprend son texte', (await page.isHidden('#reglage-hauteur')) + ' / ' + (await desc(page)).split('. ')[1], 'true / Sides: low taper, starting at clipper guard 0.5 at the bottom');
  await page.click('[data-reglage="cotes"][data-valeur="blanc"]');
  await page.click('[data-reglage="hauteur"][data-valeur="mi"]');
  verifier('retour aux réglages de la coupe', await desc(page), 'Skin fade. Sides: mid skin fade, from guard 0 at the bottom to guard 2 at the top. Top: 4-6 cm, textured. Front: no fringe, forehead uncovered, keep the front as in the original. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original');
  const degrades = await page.evaluate(() => ['crop-texture', 'quiff', 'degrade-boucle', 'mulet-moderne'].map((id) => {
    const A = window.CoupeStudio;
    const c = A.coupeDuCatalogue(id);
    return A.descAnglaise({ coupe: c, reglages: A.reglagesParDefaut(c), caracteristiques: [], couleurLibre: '' }).split('. ')[1];
  }).join(' | '));
  verifier('hauteurs et sabots préréglés par coupe', degrades, 'Sides: mid fade, from guard 0.5 at the bottom to guard 2 at the top | Sides: mid fade, from guard 1 at the bottom to guard 3 at the top | Sides: mid fade, from guard 0.5 at the bottom to guard 2 at the top | Sides: low fade, from guard 1 at the bottom to guard 3 at the top');
  await page.click('[data-reglage="sabot"][data-valeur="0.5"]');
  await page.click('[data-reglage="barbe"][data-valeur="entretenue"]');
  verifier('résumé', await texte(page, '#resume-reglages'), 'Dégradé mi-hauteur, sabot 0,5, dessus 5 cm, barbe entretenue');
  const BASE = 'Fade. Sides: mid fade, from guard 0.5 at the bottom to guard 2 at the top. Top: 4-6 cm, textured. Front: no fringe, forehead uncovered, keep the front as in the original. Beard: well-groomed with clean cheek lines. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original';
  verifier('le sabot ne remplace que X (plus d’ambiguïté)', await desc(page), BASE);
  await page.click('[data-reglage="devant"][data-valeur="releve"]');
  await page.click('[data-reglage="coiffage"][data-valeur="decoiffe"]');
  verifier('chaque réglage écrit dans sa zone', await desc(page),
    'Fade. Sides: mid fade, from guard 0.5 at the bottom to guard 2 at the top. Top: 4-6 cm, messy and textured. Front: lifted up. Beard: well-groomed with clean cheek lines. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original');
  verifier('résumé dans l’ordre des zones', await texte(page, '#resume-reglages'), 'Dégradé mi-hauteur, sabot 0,5, dessus 5 cm, décoiffé, devant relevé, barbe entretenue');
  /* Chaque option de chaque réglage s'écrit dans la zone de son emplacement, et une seule fois. */
  const options = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const C = window.CATALOGUE;
    const fautes = [];
    let n = 0;
    ['raie-cote', 'carre-plongeant'].forEach((id) => {
      const c = A.coupeDuCatalogue(id);
      C.reglages[c.mode].forEach((g) => {
        if (g.siDegrade || ((g.id === 'cotes') && ['blanc', 'degrade'].includes(c.recette.cotes))) return; // dégradé : testé à part
        const zone = C.zones.find((z) => z.id === g.slot.split('.')[0]);
        const valeurs = g.type === 'choix' ? g.options.filter((o) => o.en && !o.libre).map((o) => [o.v, o.en]) : [[g.min + 1, null]];
        valeurs.forEach(([v, en]) => {
          if (A.reglagesParDefaut(c)[g.id] === v) return; // valeur de la coupe : son texte reste
          const reglages = C.accorderDegrade(Object.assign(A.reglagesParDefaut(c), { [g.id]: v }), g.id); // comme un clic
          const d = A.descAnglaise({ coupe: c, reglages, caracteristiques: [], couleurLibre: '' });
          const phrase = d.split('. ').find((p) => p.startsWith(zone.en + ': ')) || '';
          n++;
          if (en && !phrase.includes(en)) fautes.push(g.id + '=' + v + ' absent de « ' + zone.en + ' » : ' + d);
          if (en && phrase.split(en).length !== 2) fautes.push(g.id + '=' + v + ' écrit ' + (phrase.split(en).length - 1) + ' fois dans « ' + phrase + ' »');
          if (!en && !phrase) fautes.push(g.id + '=' + v + ' : zone ' + zone.en + ' vide');
        });
      });
    });
    return n + ' options ; ' + fautes.join(' | ');
  });
  verifier('chaque option de réglage s’écrit une fois, dans sa zone', options.replace(/^\d+ options ; /, ''), '');
  await page.click('[data-reglage="devant"][data-valeur="releve"]');
  await page.click('[data-reglage="coiffage"][data-valeur="decoiffe"]');
  verifier('retoucher un coiffage (vide au départ) le retire', await texte(page, '#resume-reglages'), 'Dégradé mi-hauteur, sabot 0,5, dessus 5 cm, barbe entretenue');
  await page.click('[data-reglage="cotes"][data-valeur="blanc"]');
  verifier('Côtés (imposé par la coupe) : retoucher ne le retire pas', await presse(page, '[data-reglage="cotes"][data-valeur="blanc"]'), 'true');
  await regler(page, 'curseur-dessus', 7);
  verifier('curseur Dessus', (await texte(page, '#valeur-dessus')) + ' / ' + (await desc(page)).includes('Top: about 7 cm, textured'), '7 cm / true');
  verifier('avertissements sur la page Réglages (pousse, lunettes)', (await page.$$eval('#avertissements .alerte b', (b) => b.map((x) => x.textContent))).join(), 'Pousse,Lunettes');
  await regler(page, 'curseur-dessus', 5);
  verifier('dessus revenu à 5 cm : plus de pousse, mais changement léger (courte → courte)', (await page.$$eval('#avertissements .alerte b', (b) => b.map((x) => x.textContent))).join(), 'Changement léger,Lunettes');
  verifier('texte de l’avertissement « Changement léger »', await page.$eval('#avertissements .alerte', (a) => a.textContent), 'Changement légerLe rendu sera peu visible.');
  const cas = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const vide = { texture: null, visage: null, front: null, longueur: null, lunettes: null };
    const titres = (id, profil, reglages) => {
      const c = A.coupeDuCatalogue(id);
      return A.avertissements(c, Object.assign(A.reglagesParDefaut(c), reglages || {}), Object.assign({}, vide, profil)).map((a) => a.titre + ' : ' + a.texte).join(' | ');
    };
    return {
      golfes: titres('quiff', { front: 'golfes-marques' }),
      lissage: titres('long-droit', { texture: 'crepus', longueur: 'longue' }),
      pousse: titres('mi-long-flow', { longueur: 'courte' }),
      radical: titres('buzz-cut', { longueur: 'longue' }),
      fins: titres('shag', { front: 'fins' }),
      lunettes: titres('skin-fade', { lunettes: 'oui' }),
      rien: titres('skin-fade', { texture: 'lisses', visage: 'ovale', front: 'normale', longueur: 'moyenne', lunettes: 'non' }),
      barbeSeule: titres('quiff', { front: 'golfes-marques', lunettes: 'oui' }, { barbe: 'rasee', barbeSeule: true })
    };
  });
  verifier('Golfes', cas.golfes, 'Golfes marqués : Ces coupes dégagent le front : garder du dessus pour couvrir la ligne frontale.');
  verifier('Lissage (et changement léger : longue → longue)', cas.lissage, 'Lissage : Le rendu demande un lissage ou un brushing. | Changement léger : Le rendu sera peu visible.');
  verifier('Pousse', cas.pousse, 'Pousse : Il faut laisser pousser : environ 1 cm par mois.');
  verifier('Changement radical', cas.radical, 'Changement radical : Plus de 10 cm coupés : changement radical, plusieurs mois pour revenir en arrière.');
  verifier('Cheveux fins', cas.fins, 'Cheveux fins : Garder du volume en haut : une coupe très dégradée aplatit la forme.');
  verifier('Lunettes', cas.lunettes, 'Lunettes : Vérifie le contour d’oreille avec les lunettes remises.');
  verifier('aucun avertissement quand rien ne s’applique', cas.rien, '');
  verifier('barbe seule : pas d’avertissement sur les cheveux', cas.barbeSeule, '');
  verifier('« Barbe seule » est dans le groupe Barbe, toujours visible', (await texte(page, '#reglage-barbe [data-barbe-seule]')) + ' / ' + (await page.isVisible('#reglage-barbe [data-barbe-seule]')), 'Barbe seule (ne pas toucher aux cheveux) / true');
  await page.click('[data-barbe-seule="oui"]');
  verifier('barbe seule : résumé et [COUPE]', (await texte(page, '#resume-reglages')) + ' / ' + (await desc(page)), 'Barbe seule : barbe entretenue, cheveux inchangés / Beard: well-groomed with clean cheek lines. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original');
  await page.click('#action-reglages');
  verifier('« Voir le résultat » ouvre Résultat', await ecran(page), 'resultat');
  verifier('barbe seule : ligne de la variante ajoutée à la fin du prompt image', await page.textContent('#prompt-2'),
    avec(IMAGE, '[COUPE]', 'Beard: well-groomed with clean cheek lines. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original') + '\n' + BARBE_SEULE);
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'reglages');
  await page.click('[data-reglage="barbe"][data-valeur="inchangee"]');
  verifier('barbe seule sans barbe choisie : message, et le prompt garde les cheveux', (await page.isVisible('#message-barbe-seule')) + ' / ' + (await desc(page)).startsWith('Skin fade. Sides:'), 'true / true');
  await page.click('[data-reglage="barbe"][data-valeur="entretenue"]');
  await page.click('[data-barbe-seule="oui"]');
  verifier('retoucher « Barbe seule » la retire', await presse(page, '[data-barbe-seule="oui"]'), 'false');

  /* ============ D. Catalogue personnalisé ============ */
  console.log('D. Catalogue personnalisé : caractéristiques, groupes exclusifs, remplacement des réglages');
  await page.click('#vers-caracteristiques');
  verifier('« Ajouter des caractéristiques » ouvre le Catalogue personnalisé', await ecran(page), 'personnalise');
  verifier('6 catégories', (await page.$$eval('#categories h2', (h) => h.map((x) => x.textContent))).join(' | '), 'Côtés | Devant et dessus | Couleur | Texture | Barbe | Nuque et contours');
  verifier('35 caractéristiques, en texte, sans pictogramme', await page.$$eval('#categories [data-caracteristique]', (c) => c.length + ' / ' + c.filter((x) => x.querySelector('svg')).length), '35 / 0');
  verifier('coupe gardée comme coupe de départ', (await texte(page, '#bloc-base [data-base="oui"]')) + ' ' + (await presse(page, '#bloc-base [data-base="oui"]')), 'Skin fade true');
  await page.click('[data-caracteristique="meche-cote"]');
  await page.click('[data-caracteristique="undercut"]');
  verifier('sélection multiple', (await presse(page, '[data-caracteristique="meche-cote"]')) + (await presse(page, '[data-caracteristique="undercut"]')), 'truetrue');
  const AVEC_UNDERCUT = 'Skin fade. Sides: undercut, clipped short and disconnected from a longer top. Top: 4-6 cm, textured. Front: a side-swept lock. Beard: well-groomed with clean cheek lines. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original';
  verifier('la caractéristique remplace la coupe et les réglages de sa zone (sabot compris)', await desc(page), AVEC_UNDERCUT);
  verifier('résumé dans l’ordre des zones', await texte(page, '#resume-personnalise'), 'Skin fade, undercut, dessus 5 cm, mèche sur le côté, barbe entretenue');
  verifier('pas de message sans conflit', (await page.isHidden('#conflit')) && (await page.isHidden('#contradictions')));
  await page.click('[data-caracteristique="degrade-blanc"]');
  verifier('groupe occupé : message dans la page', await texte(page, '#texte-conflit'), '« Dégradé à blanc » et « Undercut » se contredisent (côtés). Laquelle garder ?');
  verifier('« Garder X » / « Garder Y »', (await texte(page, '#garder-existantes')) + ' / ' + (await texte(page, '#garder-nouvelle')), 'Garder Undercut / Garder Dégradé à blanc');
  verifier('tant qu’on n’a pas choisi : rien ne change dans le prompt', (await presse(page, '[data-caracteristique="degrade-blanc"]')) + ' / ' + ((await desc(page)) === AVEC_UNDERCUT), 'false / true');
  await page.click('#garder-nouvelle');
  verifier('« Garder Dégradé à blanc » : l’undercut est retiré', (await presse(page, '[data-caracteristique="undercut"]')) + (await presse(page, '[data-caracteristique="degrade-blanc"]')) + ' / ' + (await page.isHidden('#conflit')), 'falsetrue / true');
  verifier('une seule consigne pour les côtés', (await desc(page)).split('. ').find((p) => p.startsWith('Sides:')), 'Sides: skin fade');
  await page.click('[data-caracteristique="undercut"]');
  await page.click('#garder-existantes');
  verifier('« Garder Dégradé à blanc » (déjà là) : rien ne change', (await presse(page, '[data-caracteristique="undercut"]')) + (await presse(page, '[data-caracteristique="degrade-blanc"]')), 'falsetrue');
  await page.click('[data-caracteristique="degrade-blanc"]');
  verifier('retoucher une carte la retire : les côtés des réglages reviennent', (await desc(page)).split('. ').find((p) => p.startsWith('Sides:')), 'Sides: mid skin fade, from guard 0 at the bottom to guard 2 at the top');
  verifier('champ « Couleur libre » caché tant qu’elle n’est pas choisie', await page.isHidden('#couleur-libre'));
  await page.click('[data-caracteristique="couleur-libre"]');
  verifier('« Couleur libre » sans texte : rien n’est ajouté', (await desc(page)).includes('Color:'), false);
  await page.fill('#couleur-libre', 'copper red');
  verifier('couleur libre : le changement est écrit clairement', (await desc(page)).endsWith('Color: change to copper red. Beard: well-groomed with clean cheek lines. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original'));
  await page.click('[data-caracteristique="platine"]');
  await page.click('#garder-nouvelle');
  verifier('une seule couleur à la fois', (await desc(page)).split('. ').filter((p) => p.startsWith('Color:')).join(), 'Color: change to full platinum blonde');
  await page.click('[data-caracteristique="platine"]');
  await page.click('[data-caracteristique="moustache"]');
  await page.click('[data-caracteristique="bouc"]');
  verifier('moustache et bouc vont ensemble', (await desc(page)).split('. ').find((p) => p.startsWith('Beard:')), 'Beard: well-groomed with clean cheek lines, a neat moustache, a goatee');
  await page.click('[data-caracteristique="barbe-rasee"]');
  verifier('barbe rasée contre moustache et bouc', (await texte(page, '#texte-conflit')) + ' / ' + (await texte(page, '#garder-existantes')),
    '« Rasée » et « Moustache » et « Bouc » se contredisent (barbe). Laquelle garder ? / Garder Moustache et Bouc');
  await page.click('#garder-existantes');
  await page.click('[data-caracteristique="moustache"]');
  await page.click('[data-caracteristique="bouc"]');
  await page.click('[data-caracteristique="dessus-decoiffe"]');
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'reglages');
  verifier('retour aux réglages : le lien indique les caractéristiques', await texte(page, '#vers-caracteristiques'), '2 caractéristiques ajoutées : modifier');
  verifier('réglage remplacé : la page le dit', await texte(page, '#texte-remplace-devant'), 'Coiffage, devant et frange remplacé par : mèche sur le côté');
  verifier('réglage remplacé : ses boutons sont cachés', await page.isHidden('[data-controles="devant"]'));
  verifier('« Coiffage, dessus » remplacé par « Dessus décoiffé »', await texte(page, '#texte-remplace-coiffage'), 'Coiffage, dessus remplacé par : dessus décoiffé');
  verifier('« messy and textured » n’est écrit qu’une fois', ((await desc(page)).match(/messy and textured/g) || []).length, 1);
  await page.click('#reglage-devant [data-remplace] a');
  verifier('« Modifier » ouvre le Catalogue personnalisé', await ecran(page), 'personnalise');
  await page.click('[data-caracteristique="dessus-decoiffe"]');
  await page.click('[data-base="non"]');
  verifier('« Aucune » : coupe 100 % personnalisée', await desc(page), 'Custom haircut. Front: a side-swept lock. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original');
  verifier('résumé sans coupe de départ', await texte(page, '#resume-personnalise'), 'Coupe personnalisée : mèche sur le côté');
  verifier('« Aucune » n’efface pas la coupe', await page.evaluate(() => window.CoupeStudio.etat.coupe.id + ' / ' + window.CoupeStudio.etat.reglages.sabot), 'skin-fade / 0');
  await page.click('#ecran-personnalise .btn');
  verifier('100 % personnalisée : diagnostic', await page.textContent('#prompt-1'), avec(DIAGNOSTIC, '[COUPE]', 'Coupe personnalisée : mèche sur le côté'));
  verifier('100 % personnalisée : prompt image', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', 'Custom haircut. Front: a side-swept lock. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original'));
  verifier('100 % personnalisée en mode barber : fiche barber', await page.textContent('#prompt-3'), FICHE_BARBER);
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'personnalise');
  await page.click('[data-base="oui"]');
  await page.click('#ecran-personnalise .btn');

  /* ============ E. Résultat ============ */
  console.log('E. Résultat : prompts, copie, Gemini, photo de référence');
  const coupeFr = 'Skin fade, sabot 0, dessus 5 cm, mèche sur le côté, barbe entretenue';
  const coupeEn = 'Skin fade. Sides: mid skin fade, from guard 0 at the bottom to guard 2 at the top. Top: 4-6 cm, textured. Front: a side-swept lock. Beard: well-groomed with clean cheek lines. Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original';
  verifier('3 étapes, plus d’étape Fond', (await page.$$eval('#etapes .etape', (e) => e.map((x) => x.textContent))).join(' | '), 'Étape 1 · Diagnostic | Étape 2 · Image | Étape 3 · Fiche');
  verifier('étape 1 = prompt diagnostic, [COUPE] en français', await page.textContent('#prompt-1'), avec(DIAGNOSTIC, '[COUPE]', coupeFr));
  verifier('étape 2 = prompt image, [COUPE] en anglais, ligne d’exception car la barbe change', await page.textContent('#prompt-2'), imageAvec(coupeEn, 'a beard change'));
  const exceptions = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const x = (id, reglages, k) => { const c = A.coupeDuCatalogue(id); return { coupe: c, reglages: Object.assign(A.reglagesParDefaut(c), reglages), caracteristiques: k, couleurLibre: '' }; };
    return [x('skin-fade', {}, []), x('skin-fade', {}, ['boucles']), x('crop-texture', { barbe: 'courte' }, ['permanente']),
      x('skin-fade', { barbe: 'courte', barbeSeule: true }, []), x('skin-fade', {}, ['moustache']),
      x('degrade-boucle', {}, []), x('carre-boucle', {}, []), x('carre-boucle', {}, ['lisse']), x('degrade-boucle', { barbe: 'rasee' }, [])].map((c) => A.changementDemande(c) || 'aucun').join(' | ');
  });
  const couleurs = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const x = (id, reglages, k, libre) => { const c = id ? A.coupeDuCatalogue(id) : null; return { coupe: c, reglages: c ? Object.assign(A.reglagesParDefaut(c), reglages) : null, caracteristiques: k, couleurLibre: libre || '' }; };
    return [x('skin-fade', {}, []), x('skin-fade', {}, ['meches-blondes']), x('skin-fade', {}, ['poivre-sel']), x('carre-plongeant', { couleur: 'balayage' }, []),
      x('carre-plongeant', { couleur: 'autre', couleurAutre: 'copper red' }, []), x(null, {}, ['couleur-libre'], 'dark auburn'), x('skin-fade', { barbe: 'courte', barbeSeule: true }, ['platine'])]
      .map((c) => (A.couleurDemandee(c) || 'aucune') + ' / ' + A.etapesResultat.length).join(' | ').replace(/ \/ \d+/g, '');
  });
  verifier('étape Couleur seulement pour un vrai changement de couleur choisi', couleurs, 'aucune | blonde highlights | aucune | a soft natural balayage | copper red | dark auburn | aucune');
  verifier('ligne d’exception : seulement si l’utilisateur change Beard (hors barbe seule) ou Texture', exceptions,
    'aucun | texture | barbe-texture | aucun | barbe | aucun | aucun | texture | barbe');
  const boucles = await page.evaluate(() => ['degrade-boucle', 'carre-boucle'].map((id) => {
    const A = window.CoupeStudio;
    const c = A.coupeDuCatalogue(id);
    const x = { coupe: c, reglages: A.reglagesParDefaut(c), caracteristiques: [], couleurLibre: '' };
    return /Texture: /.test(A.descAnglaise(x)) + '/' + /Exception to the rules above/.test(window.PROMPTS.image(A.descAnglaise(x), false, A.changementDemande(x)));
  }).join(' | '));
  verifier('dégradé bouclé et carré bouclé par défaut : zone Texture écrite, mais pas de ligne d’exception', boucles, 'true/false | true/false');
  verifier('étape 3 = fiche barber', await page.textContent('#prompt-3'), FICHE_BARBER);
  verifier('les étapes disent quelles photos joindre (prêt pour la V2)', await page.evaluate(() => window.CoupeStudio.etapesResultat().map((e) => e.id + ':' + e.joindre.join('+')).join(' | ')),
    'diagnostic:selfie | image:selfie | fiche:selfie+image-generee');
  verifier('chaque carte affiche sa consigne', await page.$$eval('#etapes .carte', (c) => c.filter((x) => x.querySelector('.consigne:not(.discret):not(.carte-titre):not(.alerte)').textContent.trim()).length), 3);
  verifier('consigne photo avant le diagnostic', await page.$eval('#etapes .carte', (c) => c.querySelector('.consigne').textContent), 'Photo de face, regard caméra, cheveux bien visibles.');
  verifier('sous le prompt image : relancer si le résultat est bizarre', await page.$eval('#etapes .carte:nth-child(2) .consigne.discret', (p) => p.textContent), 'Résultat bizarre (tête tournée, frange en trop) ? Relance la génération.');
  const fronts = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const front = (id, reglages, k) => { const c = id ? A.coupeDuCatalogue(id) : null; return A.descAnglaise({ coupe: c, reglages: c ? Object.assign(A.reglagesParDefaut(c), reglages) : null, caracteristiques: k, couleurLibre: '' }).split('. ').find((p) => p.startsWith('Front:')) || 'aucune zone Front'; };
    return [front('skin-fade', {}, []), front('long-droit', {}, []), front(null, {}, ['balayage']), front('crop-texture', {}, []), front('skin-fade', { devant: 'releve' }, []), front('skin-fade', {}, ['meche-cote']), front('carre-droit', { frange: 'rideau' }, []), front('skin-fade', { barbe: 'courte', barbeSeule: true }, [])].join(' | ');
  });
  verifier('Front toujours écrit, barber et salon : par défaut « no fringe… », sinon le choix', fronts,
    ['Front: no fringe, forehead uncovered, keep the front as in the original', 'Front: no fringe, forehead uncovered, keep the front as in the original', 'Front: no fringe, forehead uncovered, keep the front as in the original',
     'Front: a short straight fringe', 'Front: lifted up', 'Front: a side-swept lock', 'Front: curtain bangs', 'aucune zone Front'].join(' | '));
  const liens = await page.$$eval('#etapes a', (a) => a.map((x) => [x.textContent, x.href, x.target, x.rel].join('|')));
  verifier('« Ouvrir Gemini » : bon lien, nouvel onglet', [...new Set(liens)].join(), 'Ouvrir Gemini|https://gemini.google.com/app|_blank|noopener');
  await page.click('[data-copier="prompt-2"]');
  await page.waitForTimeout(150);
  verifier('« Copier » devient « Copié »', await texte(page, '[data-copier="prompt-2"]'), 'Copié');
  verifier('le presse-papiers contient le prompt exact', await pressePapiers(page), imageAvec(coupeEn, 'a beard change'));
  await page.waitForTimeout(1600);
  verifier('« Copié » redevient « Copier » après 1,5 s', await texte(page, '[data-copier="prompt-2"]'), 'Copier');
  await page.click('[data-reference="oui"]');
  verifier('photo de référence : remplace l’étape Image', await page.textContent('#prompt-2'), REFERENCE);
  await page.click('[data-reference="non"]');
  verifier('sans photo de référence : retour au prompt image', await page.textContent('#prompt-2'), imageAvec(coupeEn, 'a beard change'));
  await page.reload();
  verifier('rechargement (retour de Gemini) : tout est toujours là', await page.textContent('#prompt-2'), imageAvec(coupeEn, 'a beard change'));

  /* ============ F. Enregistrer et partager ============ */
  console.log('F. Enregistrer et partager une coupe personnalisée');
  await page.click('#enregistrer');
  verifier('« Enregistrer » confirme', await texte(page, '#enregistrer'), 'Enregistrée');
  await page.click('#enregistrer');
  await page.click('#partager');
  await page.waitForTimeout(150);
  verifier('« Partager » confirme', await texte(page, '#partager'), 'Lien copié');
  const lien = await pressePapiers(page);
  verifier('le lien contient ?r=', /\/index\.html\?r=[A-Za-z0-9_-]+$/.test(lien));
  const contenu = JSON.parse(Buffer.from(lien.split('?r=')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  verifier('le lien ne contient ni profil ni photo', Object.keys(contenu).sort().join(), 'c,k,kl,r,v');
  await page.goto(ADRESSE);
  verifier('« Mes coupes personnalisées » sur l’accueil, sans doublon', (await page.$$eval('#liste-creations .carte-titre', (t) => t.map((x) => x.textContent))).join(' | '), coupeFr);
  verifier('client en cours : le bouton principal dit « Continuer »', await texte(page, '#action-accueil'), 'Continuer');
  await page.click('#liste-creations .carte');
  verifier('toucher une coupe enregistrée la recharge dans Réglages', (await ecran(page)) + ' : ' + (await texte(page, '#resume-reglages')), 'reglages : ' + coupeFr);
  await contexte.close();
  ({ contexte, page } = await nouvelle(navigateur, { adresse: lien }));
  verifier('ouvrir le lien charge la coupe personnalisée', (await texte(page, '#titre-reglages')) + ' : ' + (await texte(page, '#resume-reglages')), 'Skin fade : ' + coupeFr);
  verifier('l’adresse est nettoyée après chargement', await page.evaluate(() => window.location.search + window.location.hash), '#reglages');
  await contexte.close();
  ({ contexte, page } = await nouvelle(navigateur, { adresse: ADRESSE + '?r=pas-un-lien' }));
  verifier('lien illisible : message clair sur l’accueil', await texte(page, '#message-accueil'), 'Ce lien est illisible. Demande un nouveau lien, ou commence avec un client.');
  await contexte.close();
  const piege = Buffer.from(JSON.stringify({ v: 2, c: 'skin-fade', r: { cotes: '<img src=x onerror=alert(1)>', dessus: 999, barbe: 'inconnue' }, k: ['inconnue', 'undercut', 'undercut'], kl: 5 })).toString('base64url');
  ({ contexte, page } = await nouvelle(navigateur, { adresse: ADRESSE + '?r=' + piege }));
  verifier('lien trafiqué : valeurs inconnues ignorées, curseur borné', await texte(page, '#resume-reglages'), 'Skin fade, undercut, dessus 15 cm');
  await contexte.close();
  const deuxCotes = Buffer.from(JSON.stringify({ v: 2, c: 'skin-fade', r: {}, k: ['undercut', 'rase-cote', 'platine', 'balayage'], kl: '' })).toString('base64url');
  ({ contexte, page } = await nouvelle(navigateur, { adresse: ADRESSE + '?r=' + deuxCotes }));
  verifier('lien avec deux caractéristiques d’un même groupe : une seule est gardée', await page.evaluate(() => window.CoupeStudio.etat.caracteristiques.join()), 'undercut,platine');
  await contexte.close();
  const ancien = Buffer.from(JSON.stringify({ v: 1, c: 'quiff', r: { cotes: 'degrade', dessus: 9, coiffage: 'avant' }, f: { type: 'gris' } })).toString('base64url');
  ({ contexte, page } = await nouvelle(navigateur, { adresse: ADRESSE + '?r=' + ancien }));
  verifier('un lien de la version précédente s’ouvre encore', await texte(page, '#resume-reglages'), 'Quiff, sabot 1, dessus 9 cm');
  await contexte.close();

  /* ============ G. Salon ============ */
  console.log('G. Mode salon');
  ({ contexte, page } = await nouvelle(navigateur));
  await page.click('[data-mode="salon"]');
  verifier('choisir Salon : thème salon', await theme(page), 'salon');
  await page.click('#action-accueil');
  verifier('« Cheveux fins » proposé en salon', (await page.$$('[data-question="front"][data-valeur="fins"]')).length, 1);
  await page.click('[data-question="front"][data-valeur="fins"]');
  await page.click('[data-question="visage"][data-valeur="carre"]');
  await page.click('#ecran-client .btn');
  await page.click('#ecran-choix a[href="#catalogue"]');
  liste = await ids(page, '#ecran-catalogue [data-coupe]', 'data-coupe');
  modes = await modesDe(page, liste);
  verifier('mode salon : 12 coupes salon', modes.filter((m) => m === 'salon').length, 12);
  verifier('visage carré en salon : carré flou et frange rideau conseillés', (await ids(page, '#conseillees [data-coupe]', 'data-coupe')).slice(0, 2).sort().join(), 'carre-flou,frange-rideau');
  await page.click('#ecran-catalogue [data-coupe="carre-plongeant"]');
  verifier('résumé de départ', await texte(page, '#resume-reglages'), 'Carré plongeant, longueur au menton, 22 cm');
  verifier('[COUPE] salon : zone Length', await desc(page), 'Angled bob. Length: reaching the chin at the front, shorter at the nape, longer at the front. Front: no fringe, forehead uncovered, keep the front as in the original');
  verifier('réglages salon', (await page.$$eval('#zone-reglages .etiquette', (e) => e.map((x) => x.textContent))).join(' | '),
    'Longueur | Longueur en centimètres | Forme | Couches | Frange | Raie | Couleur | Couleur voulue, en anglais');
  await page.click('[data-repere="epaules"]');
  verifier('repère Épaules : la longueur remplace celle de la coupe', await desc(page), 'Angled bob. Length: shoulder length, about 32 cm, shorter at the nape, longer at the front. Front: no fringe, forehead uncovered, keep the front as in the original');
  await regler(page, 'curseur-longueur', 50);
  verifier('curseur à 50 cm : le repère suit', (await presse(page, '[data-repere="omoplates"]')) + ' / ' + (await texte(page, '#valeur-longueur')), 'true / 50 cm, aux omoplates');
  await regler(page, 'curseur-longueur', 22);
  await page.click('[data-reglage="couleur"][data-valeur="autre"]');
  await page.fill('#couleur-autre', 'copper red');
  verifier('couleur « Autre » : zone Color', (await desc(page)).endsWith('. Color: change to copper red'));
  await page.click('[data-reglage="couleur"][data-valeur="inchangee"]');
  await page.click('[data-reglage="couches"][data-valeur="marquees"]');
  verifier('cheveux fins + couches marquées : avertissement', (await page.$$eval('#avertissements .alerte b', (b) => b.map((x) => x.textContent))).join(), 'Cheveux fins');
  await page.click('#action-reglages');
  verifier('étape 3 = fiche salon', await page.textContent('#prompt-3'), FICHE_SALON);
  verifier('étape 1 = diagnostic salon (PROMPTS.md, 1b)', await page.textContent('#prompt-1'),
    avec(DIAGNOSTIC_SALON, '[COUPE]', 'Carré plongeant, longueur au menton, 22 cm, couches marquées'));
  verifier('le diagnostic salon commence par « Tu es un coiffeur expert. »', (await page.textContent('#prompt-1')).startsWith('Tu es un coiffeur expert. Voici la photo d\'une cliente ou d\'un client et la coupe souhaitée : '));
  await contexte.close();

  /* ============ H. Coupe 100 % personnalisée en thème neutre, coupe ajoutée ============ */
  console.log('H. Thème neutre sans coupe, et « Ajouter ma coupe »');
  ({ contexte, page } = await nouvelle(navigateur));
  await page.click('#action-accueil');
  await page.click('#passer-profil');
  await page.click('#ecran-choix a[href="#personnalise"]');
  verifier('sans coupe choisie : pas de « Coupe de départ »', await page.isHidden('#bloc-base'));
  verifier('rien de choisi', await texte(page, '#resume-personnalise'), 'Aucune caractéristique choisie.');
  await page.click('#ecran-personnalise .btn');
  verifier('rien à générer : message et bouton', (await texte(page, '#sous-titre-resultat')) + ' / ' + (await texte(page, '#actions-resultat .btn')), 'Rien à générer pour l’instant. Choisis une coupe ou des caractéristiques. / Choisir quoi faire');
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'personnalise');
  await page.click('[data-caracteristique="frange-rideau"]');
  await page.click('[data-caracteristique="balayage"]');
  await page.click('#ecran-personnalise .btn');
  verifier('coupe + couleur : l’étape Image ne contient pas la couleur', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', 'Custom haircut. Front: curtain bangs parted in the middle'));
  verifier('coupe + couleur : 4 étapes, Couleur après Image', (await page.$$eval('#etapes .etape', (e) => e.map((x) => x.textContent))).join(' | '), 'Étape 1 · Diagnostic | Étape 2 · Image | Étape 3 · Couleur | Étape 4 · Fiche');
  verifier('étape Couleur : prompt de PROMPTS.md (2b), couleur sans « change to »', await page.textContent('#prompt-3'), avec(COULEUR, '[COULEUR]', 'a soft natural balayage'));
  verifier('étape Couleur : à envoyer sur l’image générée', (await page.$$eval('#etapes .carte:nth-child(3) .consigne', (c) => c.map((x) => x.textContent).filter(Boolean))).join(), 'À envoyer après l’étape Image, en joignant l’image générée.');
  verifier('thème neutre sans coupe : choix de la fiche proposé', await page.isVisible('#bloc-fiche'));
  verifier('diagnostic et fiche barber par défaut', ((await page.textContent('#prompt-4')) === FICHE_BARBER) + ' / ' + (await page.textContent('#prompt-1')).startsWith('Tu es un barbier expert.'), 'true / true');
  await page.click('[data-fiche="salon"]');
  verifier('salon sur demande : fiche salon et diagnostic salon', ((await page.textContent('#prompt-4')) === FICHE_SALON) + ' / ' + (await page.textContent('#prompt-1')).startsWith('Tu es un coiffeur expert.'), 'true / true');
  await page.goto(ADRESSE);
  await jusquAuCatalogue(page);
  await page.click('#ouvrir-ajout');
  await page.click('#form-ajout .btn');
  verifier('formulaire vide : l’erreur dit quoi faire', await texte(page, '#ajout-erreur'), 'Il manque le nom : écris comment tu appelles cette coupe.');
  await page.fill('#ajout-nom', 'Coupe <b>Léa</b>');
  await page.fill('#ajout-ligne', 'Carré court effilé, nuque dégagée');
  await page.click('#form-ajout .btn');
  verifier('thème neutre : il faut dire Barber ou Salon', await texte(page, '#ajout-erreur'), 'Choisis Barber ou Salon : cela fixe les réglages proposés.');
  await page.click('#ajout-type [data-type="salon"]');
  await page.click('#form-ajout .btn');
  verifier('la coupe ajoutée s’ouvre dans Réglages', await texte(page, '#titre-reglages'), 'Coupe <b>Léa</b>');
  verifier('sans anglais : la description française part dans le prompt', await desc(page), 'Coupe <b>Léa</b>: Carré court effilé, nuque dégagée. Front: curtain bangs parted in the middle. Color: change to a soft natural balayage');
  await page.click('#action-reglages');
  verifier('coupe ajoutée : diagnostic avec nom et description', await page.textContent('#prompt-1'),
    avec(DIAGNOSTIC_SALON, '[COUPE]', 'Coupe <b>Léa</b> (Carré court effilé, nuque dégagée), frange rideau, balayage'));
  await page.click('#retour');
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'catalogue');
  verifier('affichée en fin de grille', (await ids(page, '#grille-coupes [data-coupe]', 'data-coupe')).length + ' : ' + (await texte(page, '#grille-coupes .coupe:last-child .coupe-nom')), '13 : Coupe <b>Léa</b>');
  verifier('le nom saisi n’est jamais interprété comme du code', (await page.$$('#grille-coupes b')).length, 0);
  await page.click('#grille-coupes .coupe:last-child');
  await page.click('#supprimer-coupe');
  verifier('supprimer demande une seconde touche', await texte(page, '#supprimer-coupe'), 'Touche encore pour supprimer');
  await page.click('#supprimer-coupe');
  verifier('coupe supprimée : retour au catalogue', (await ecran(page)) + ' : ' + (await ids(page, '#grille-coupes [data-coupe]', 'data-coupe')).length, 'catalogue : 12');
  await contexte.close();

  /* ============ I. Catalogue fond ============ */
  console.log('I. Catalogue fond : retouches sans IA');
  ({ contexte, page } = await nouvelle(navigateur));
  const requetes = [];
  page.on('request', (r) => requetes.push(r.url()));
  await page.click('#action-accueil');
  await page.click('#passer-profil');
  await page.click('#ecran-choix a[href="#fond"]');
  verifier('deux familles, clairement séparées', (await page.$$eval('#ecran-fond .carte-grand-titre', (t) => t.map((x) => x.textContent))).join(' | '), 'Retouches sans IA | Retouches IA');
  verifier('famille sans IA : la liste', await texte(page, '#liste-sans-ia'), 'Luminosité, contraste, chaleur, noir et blanc, recadrage, montage avant/après.');
  await page.click('#ecran-fond a[href="#retouche"]');
  verifier('sans photo : le bouton principal propose d’en choisir une', await texte(page, '#action-retouche'), 'Choisir une photo');
  const [selecteur] = await Promise.all([page.waitForEvent('filechooser'), page.click('#action-retouche')]);
  await selecteur.setFiles(PHOTO_TEST);
  await page.waitForSelector('#zone-apercu:not([hidden])');
  await page.waitForTimeout(150);
  verifier('photo chargée : aperçu affiché', await tailleApercu(page), '540 × 720');
  verifier('rangée d’outils, comme l’éditeur d’Instagram', (await page.$$eval('#barre-outils [data-outil]', (t) => t.map((x) => x.textContent))).join(' | '), 'Luminosité | Contraste | Chaleur | N&B | Recadrage | Avant/après');
  verifier('un seul outil à la fois : Luminosité au départ', (await page.$$eval('#panneaux-outils [data-panneau]', (p) => p.filter((x) => !x.hidden).map((x) => x.getAttribute('data-panneau')))).join(), 'luminosite');
  const placePhoto = () => page.evaluate(() => {
    const r = document.querySelector('#apercu').getBoundingClientRect();
    return Math.round(r.top) + ' / ' + (r.height <= window.innerHeight * 0.45 + 1);
  });
  const avantDefilement = await placePhoto();
  verifier('la photo tient dans 45 % de la hauteur de l’écran', avantDefilement.endsWith(' / true'));
  await page.evaluate(() => { const d = document.querySelector('#ecran-retouche .defile'); d.scrollTop = d.scrollHeight; });
  verifier('la photo reste fixée en haut quand les réglages défilent', await placePhoto(), avantDefilement);
  await page.click('[data-outil="contraste"]');
  verifier('changer d’outil : son réglage s’affiche sous la photo', (await page.$$eval('#panneaux-outils [data-panneau]', (p) => p.filter((x) => !x.hidden).map((x) => x.getAttribute('data-panneau')))).join() + ' / ' + (await presse(page, '[data-outil="contraste"]')), 'contraste / true');
  await page.click('[data-outil="luminosite"]');
  verifier('le bouton principal devient « Enregistrer l’image »', await texte(page, '#action-retouche'), 'Enregistrer l’image');
  const origine = await pixel(page, 0.05, 0.05);
  await regler(page, 'retouche-luminosite', 40);
  await page.waitForTimeout(150);
  const clair = await pixel(page, 0.05, 0.05);
  verifier('luminosité +40 : l’image est plus claire', clair[0] > origine[0] && clair[1] > origine[1] && clair[2] > origine[2]);
  await regler(page, 'retouche-luminosite', 0);
  await regler(page, 'retouche-chaleur', 40);
  await page.waitForTimeout(150);
  const chaud = await pixel(page, 0.05, 0.05);
  verifier('chaleur +40 : plus de rouge, moins de bleu', chaud[0] > origine[0] && chaud[2] < origine[2] && chaud[1] === origine[1]);
  await regler(page, 'retouche-chaleur', 0);
  await regler(page, 'retouche-contraste', 40);
  await page.waitForTimeout(150);
  const contraste = await pixel(page, 0.5, 0.9);
  await regler(page, 'retouche-contraste', 0);
  await page.waitForTimeout(150);
  const sombre = await pixel(page, 0.5, 0.9);
  verifier('contraste +40 : une zone sombre devient plus sombre', contraste[0] + contraste[1] + contraste[2] < sombre[0] + sombre[1] + sombre[2]);
  verifier('tout à zéro : l’image est exactement celle d’origine', (await pixel(page, 0.05, 0.05)).join(), origine.join());
  await page.click('[data-outil="nb"]');
  await page.click('[data-bascule="nb"][data-valeur="oui"]');
  await page.waitForTimeout(150);
  const gris = await pixel(page, 0.05, 0.05);
  verifier('noir et blanc', gris[0] === gris[1] && gris[1] === gris[2]);
  await page.click('[data-bascule="nb"][data-valeur="non"]');
  await page.click('[data-outil="format"]');
  await page.click('[data-format="4-5"]');
  await page.waitForTimeout(150);
  verifier('recadrage 4:5 (post)', await tailleApercu(page), '576 × 720');
  await page.click('[data-format="9-16"]');
  await page.waitForTimeout(150);
  verifier('recadrage 9:16 (story)', await tailleApercu(page), '405 × 720');
  await page.click('[data-format="1-1"]');
  await page.waitForTimeout(150);
  verifier('recadrage 1:1', await tailleApercu(page), '720 × 720');
  await page.click('[data-format="original"]');
  await page.click('[data-outil="montage"]');
  verifier('montage : choix masqué tant qu’il n’y a pas de photo d’avant', await page.isHidden('#groupe-montage'));
  await page.setInputFiles('#fichier-avant', PHOTO_TEST);
  await page.waitForSelector('#groupe-montage:not([hidden])');
  await page.waitForTimeout(150);
  verifier('montage avant/après côte à côte : deux fois plus large', await tailleApercu(page), '720 × 480');
  verifier('montage : les deux moitiés montrent la même photo de test', (await pixel(page, 0.02, 0.05)).join(), (await pixel(page, 0.52, 0.05)).join());
  await page.click('[data-outil="format"]');
  await page.click('[data-format="9-16"]');
  await page.waitForTimeout(150);
  verifier('montage en 9:16 : l’une au-dessus de l’autre', await tailleApercu(page), '405 × 720');
  await page.click('[data-format="original"]');
  await page.click('[data-outil="montage"]');
  await page.click('[data-montage="non"]');
  await page.waitForTimeout(150);
  verifier('sans montage : retour à la photo seule', await tailleApercu(page), '540 × 720');
  await regler(page, 'retouche-luminosite', 40);
  await page.waitForTimeout(150);
  const retouchee = await pixel(page, 0.05, 0.05);
  const centre = await page.evaluate(() => { const r = document.querySelector('#apercu').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.move(centre[0], centre[1]);
  await page.mouse.down();
  await page.waitForTimeout(450);
  verifier('appui long sur la photo : l’original s’affiche', (await pixel(page, 0.05, 0.05)).join() + ' / ' + (await texte(page, '#legende-apercu')), origine.join() + ' / Original : relâche pour revoir la retouche.');
  await page.mouse.up();
  await page.waitForTimeout(150);
  verifier('relâcher : la retouche revient', (await pixel(page, 0.05, 0.05)).join() + ' / ' + (await texte(page, '#legende-apercu')), retouchee.join() + ' / Appui long sur la photo : voir l’original.');
  await page.mouse.move(centre[0], centre[1]);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(400);
  verifier('un appui court ne montre pas l’original', (await pixel(page, 0.05, 0.05)).join(), retouchee.join());
  await regler(page, 'retouche-luminosite', 10);
  const [telechargement] = await Promise.all([page.waitForEvent('download'), page.click('#action-retouche')]);
  verifier('« Enregistrer l’image » : un fichier JPEG', telechargement.suggestedFilename(), 'coupe-studio.jpg');
  await page.waitForSelector('#image-enregistree:not([hidden])');
  verifier('l’image est aussi affichée en grand, avec « appui long »', await page.evaluate(() => {
    const i = document.querySelector('#image-finale');
    return i.src.startsWith('blob:') && i.naturalWidth === 900 && i.naturalHeight === 1200 &&
      document.querySelector('#texte-image-enregistree').textContent.includes('appui long sur l’image');
  }));
  const stockage = await page.evaluate(() => JSON.stringify(window.sessionStorage) + JSON.stringify(window.localStorage));
  verifier('la photo n’est jamais stockée', !/blob:|data:image|base64/.test(stockage) && stockage.length < 3000);
  await page.click('#remettre-retouches');
  verifier('« Remettre les réglages à zéro »', await page.inputValue('#retouche-luminosite'), '0');

  console.log('J. Catalogue fond : retouches IA');
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'fond');
  await page.click('#ecran-fond a[href="#retouche-ia"]');
  verifier('9 retouches IA', (await page.$$eval('#cartes-ia .coupe-nom', (t) => t.map((x) => x.textContent))).join(' | '),
    'Flouter le fond | Ranger le fond | Retirer une personne derrière | Fond studio gris | Fond studio blanc | Fond studio couleur | Lumière studio douce | Corriger le contre-jour | Retirer les cheveux coupés');
  verifier('rien de choisi : pas de prompt', await page.isHidden('#carte-prompt-ia'));
  await page.click('[data-retouche-ia="flou"]');
  await page.click('[data-retouche-ia="lumiere"]');
  const promptIa = (fond) => avec(FOND, '[FOND]', fond) + '\n' + REGLE;
  verifier('prompt = prompt de fond de la section 8 + règle « pixel-identical »', await page.textContent('#prompt-ia'),
    promptIa('the same background, softly blurred with a shallow depth-of-field portrait effect; also use soft, even studio lighting'));
  verifier('la règle est la dernière ligne', (await page.textContent('#prompt-ia')).split('\n').pop(), 'The hair and the person must stay pixel-identical: same haircut, same hair edges, same color, same face, same body.');
  verifier('texte affiché sous le prompt', await texte(page, '#apres-prompt-ia'), 'L’IA régénère l’image : vérifie toujours les cheveux avant de publier. Pour une retouche garantie sans changement, utilise les retouches sans IA.');
  verifier('consigne', await texte(page, '#consigne-ia'), 'À envoyer avec la photo à retoucher jointe.');
  await page.click('[data-copier="prompt-ia"]');
  await page.waitForTimeout(150);
  verifier('copie du prompt de retouche', await pressePapiers(page), await page.textContent('#prompt-ia'));
  await page.click('[data-retouche-ia="flou"]');
  await page.click('[data-retouche-ia="lumiere"]');
  await page.click('[data-retouche-ia="cheveux-coupes"]');
  verifier('retouche qui n’est pas un fond', await page.textContent('#prompt-ia'), promptIa('the same background, unchanged; also remove the loose cut hair clippings from the shoulders and the cape'));
  await page.click('[data-retouche-ia="cheveux-coupes"]');
  verifier('pastilles cachées sans « Fond studio couleur »', await page.isHidden('#bloc-couleur-fond'));
  await page.click('[data-retouche-ia="studio-couleur"]');
  await page.click('[data-couleur="sauge"]');
  verifier('fond studio couleur : la teinte choisie', await page.textContent('#prompt-ia'), promptIa('a plain solid sage green backdrop'));
  await page.click('[data-retouche-ia="studio-gris"]');
  verifier('deux fonds studio : contradiction signalée, sans bloquer', (await texte(page, '#contradictions-ia .alerte')) + ' / ' + (await page.isVisible('#prompt-ia')),
    '« Fond studio gris » et « Fond studio couleur » se contredisent. Garde un seul des deux, sauf si c’est voulu. / true');
  const fragmentsIa = await page.evaluate(() => window.FONDS.ia.map((r) => r.fr + ' | ' + r.en));
  const doc = fs.readFileSync(path.join(RACINE, 'CLAUDE.md'), 'utf8');
  const absents = fragmentsIa.filter((ligne) => { const [fr, en] = ligne.split(' | '); return !doc.split('\n').some((l) => l.startsWith('| ' + fr) && l.includes('`' + en + '`')); });
  verifier('le tableau des retouches IA de CLAUDE.md contient les 9 fragments', absents.join(' ; '), '');
  await page.waitForTimeout(300);
  const externes = [...new Set(requetes.filter((u) => !u.startsWith('file://') && !u.startsWith('blob:')).map((u) => new URL(u).host))];
  verifier('aucun appel réseau pendant tout le Catalogue fond : la photo ne part nulle part', externes.sort().join(), '');
  await contexte.close();

  /* ============ K. Stockage bloqué, presse-papiers refusé ============ */
  console.log('K. Stockage bloqué, presse-papiers refusé');
  ({ contexte, page } = await nouvelle(navigateur, {
    avant: () => {
      const refus = () => { throw new Error('stockage bloqué'); };
      Storage.prototype.getItem = refus;
      Storage.prototype.setItem = refus;
      Storage.prototype.removeItem = refus;
    }
  }));
  verifier('stockage bloqué : l’appli démarre', await texte(page, '#titre-accueil'), 'Coupe Studio');
  await page.click('[data-mode="barber"]');
  await jusquAuCatalogue(page);
  await page.click('#ecran-catalogue [data-coupe="quiff"]');
  await page.click('#action-reglages');
  verifier('les prompts sont produits', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', 'Quiff. Sides: mid fade, from guard 1 at the bottom to guard 3 at the top. Top: 7-9 cm. Front: styled up and back with volume'));
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'reglages');
  verifier('le retour garde la coupe, même sans stockage', await texte(page, '#titre-reglages'), 'Quiff');
  await page.click('#action-reglages');
  await page.click('#enregistrer');
  verifier('enregistrer : message clair', await texte(page, '#message-resultat'),
    'Coupe gardée pour cette visite seulement : le stockage du navigateur est bloqué ou plein. Touche « Partager » pour la conserver.');
  await contexte.close();
  ({ contexte, page } = await nouvelle(navigateur, {
    sansPressePapiers: true,
    avant: () => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('refusé')) }, configurable: true });
      document.execCommand = () => false;
    }
  }));
  await jusquAuCatalogue(page);
  await page.click('#ecran-catalogue [data-coupe="quiff"]');
  await page.click('#action-reglages');
  await page.click('[data-copier="prompt-1"]');
  await page.waitForTimeout(150);
  verifier('copie refusée : message', await texte(page, '#message-prompt-1'), 'Copie refusée par le navigateur. Le texte est sélectionné : copie-le à la main.');
  verifier('copie refusée : le texte du prompt est sélectionné', await page.evaluate(() => window.getSelection().toString() === document.querySelector('#prompt-1').textContent));
  verifier('copie refusée : le bouton ne ment pas', await texte(page, '[data-copier="prompt-1"]'), 'Copier');
  await page.click('#partager');
  await page.waitForTimeout(150);
  verifier('partage refusé : le lien est affiché et sélectionné', await page.evaluate(() => {
    const c = document.querySelector('#lien-partage');
    return !c.hidden && c.value.includes('?r=') && c.selectionStart === 0 && c.selectionEnd === c.value.length;
  }));
  await contexte.close();

  /* ============ L. Hook V2 et périmètre ============ */
  console.log('L. Hook V2 et périmètre V1');
  ({ contexte, page } = await nouvelle(navigateur));
  const v2 = await page.evaluate(() => window.CoupeStudio.generateImage(null, 'x').then(() => 'résolue', (e) => e.message));
  verifier('generateImage renvoie une erreur claire', v2.startsWith('Disponible en V2'));
  const source = fs.readFileSync(path.join(RACINE, 'app.js'), 'utf8');
  verifier('aucun bouton n’appelle generateImage (une seule occurrence : sa définition)', (source.match(/generateImage\(/g) || []).length, 1);
  verifier('aucune fenêtre du navigateur (confirm, alert, prompt)', /\b(confirm|alert|prompt)\(/.test(source.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  verifier('aucune photo fournie avec l’appli', await page.evaluate(() => Array.from(document.querySelectorAll('img')).filter((i) => i.getAttribute('src')).length), 0);
  verifier('les seuls champs de fichier sont ceux du Catalogue fond', (await ids(page, 'input[type="file"]', 'id')).join(), 'fichier-photo,fichier-avant');
  await contexte.close();

  await navigateur.close();
  verifier('aucune erreur JavaScript pendant tout le parcours', erreursJs.join(' | '), '');
  console.log(echecs === 0 ? '\nPARCOURS : ' + reussites + ' vérifications réussies.' : '\nPARCOURS : ' + echecs + ' échec(s) sur ' + (reussites + echecs) + '.');
  process.exit(echecs === 0 ? 0 : 1);
})();
