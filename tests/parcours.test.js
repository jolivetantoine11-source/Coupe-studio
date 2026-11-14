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
const [DIAGNOSTIC, IMAGE, BARBE_SEULE, REFERENCE, FICHE_BARBER, FICHE_SALON] = blocs('PROMPTS.md');
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
  liste = await ids(page, '#grille-coupes [data-coupe]', 'data-coupe');
  modes = await modesDe(page, liste);
  verifier('mode barber : 12 coupes barber', modes.filter((m) => m === 'barber').length, 12);
  verifier('« Conseillées pour ce client » en haut', await texte(page, '#bloc-conseillees h2'), 'Conseillées pour ce client');
  verifier('3 coupes conseillées : bouclés + golfes marqués', (await ids(page, '#conseillees [data-coupe]', 'data-coupe')).join(), 'buzz-cut,crop-texture,crew-cut');
  verifier('badge « Conseillée » sur les 3', (await page.$$eval('#conseillees .badge', (b) => b.map((x) => x.textContent))).join(), 'Conseillée,Conseillée,Conseillée');
  verifier('le badge est repris dans la grille', (await page.$$eval('#grille-coupes .coupe', (c) => c.filter((x) => x.querySelector('.badge')).map((x) => x.getAttribute('data-coupe')))).join(), 'crop-texture,buzz-cut,crew-cut');
  const risquesDe = (id) => page.$$eval('#grille-coupes [data-coupe="' + id + '"] .risque', (r) => r.map((x) => x.textContent).join(' + '));
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
  console.log('C. Réglages d’une coupe : résumé, coiffage par zone, description anglaise');
  await page.click('#grille-coupes [data-coupe="skin-fade"]');
  verifier('toucher une coupe ouvre directement Réglages', await ecran(page), 'reglages');
  verifier('titre = nom de la coupe', await texte(page, '#titre-reglages'), 'Skin fade');
  verifier('résumé de départ', await texte(page, '#resume-reglages'), 'Skin fade, sabot 0, dessus 5 cm');
  const descSkin = await page.evaluate(() => window.CoupeStudio.coupeDuCatalogue('skin-fade').desc);
  verifier('aucun réglage modifié : rien n’est ajouté à desc', await desc(page), descSkin);
  verifier('réglages barber, coiffage par zone', (await page.$$eval('#zone-reglages .etiquette', (e) => e.map((x) => x.textContent))).join(' | '),
    'Côtés | Sabot du bas | Dessus | Coiffage, devant et frange | Coiffage, dessus | Contours | Barbe | Ne changer que la barbe');
  verifier('zone devant : 4 choix', (await page.$$eval('[data-reglage="devant"]', (b) => b.map((x) => x.textContent))).join(' · '), 'Vers l’avant · Relevé · Sur le côté · En arrière');
  verifier('zone dessus : 4 choix', (await page.$$eval('[data-reglage="coiffage"]', (b) => b.map((x) => x.textContent))).join(' · '), 'En arrière · Sur le côté · Naturel · Décoiffé');
  await page.click('[data-reglage="sabot"][data-valeur="0.5"]');
  await page.click('[data-reglage="barbe"][data-valeur="entretenue"]');
  verifier('résumé = exemple de CLAUDE.md', await texte(page, '#resume-reglages'), 'Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue');
  verifier('fragments anglais des réglages modifiés', await desc(page), descSkin + ', starting at clipper guard 0.5, well-groomed beard with clean cheek lines');
  await page.click('[data-reglage="devant"][data-valeur="releve"]');
  await page.click('[data-reglage="coiffage"][data-valeur="decoiffe"]');
  verifier('chaque zone produit son fragment', await desc(page), descSkin + ', starting at clipper guard 0.5, front lifted up, messy, textured top, well-groomed beard with clean cheek lines');
  verifier('résumé avec les deux zones', await texte(page, '#resume-reglages'), 'Skin fade, sabot 0,5, dessus 5 cm, devant relevé, décoiffé, barbe entretenue');
  const zones = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const en = (id, reglages) => { const c = A.coupeDuCatalogue(id); return A.descAnglaise({ coupe: c, reglages: Object.assign(A.reglagesParDefaut(c), reglages), caracteristiques: [], couleurLibre: '' }).slice(c.desc.length); };
    return [en('skin-fade', { devant: 'avant' }), en('skin-fade', { devant: 'cote' }), en('skin-fade', { devant: 'arriere' }),
      en('skin-fade', { coiffage: 'arriere' }), en('skin-fade', { coiffage: 'cote' }), en('skin-fade', { coiffage: 'naturel' }),
      en('slick-back', {}), en('quiff', {})].join(' | ');
  });
  verifier('tous les fragments de coiffage', zones, ', front styled forward | , front swept to the side | , front pushed back | , top styled back | , top styled to the side | , top left natural, unstyled |  | ');
  await page.click('[data-reglage="devant"][data-valeur="releve"]');
  await page.click('[data-reglage="coiffage"][data-valeur="decoiffe"]');
  verifier('retoucher un coiffage (vide au départ) le retire', await texte(page, '#resume-reglages'), 'Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue');
  await page.click('[data-reglage="cotes"][data-valeur="blanc"]');
  verifier('Côtés (imposé par la coupe) : retoucher ne le retire pas', await presse(page, '[data-reglage="cotes"][data-valeur="blanc"]'), 'true');
  await regler(page, 'curseur-dessus', 7);
  verifier('curseur Dessus', (await texte(page, '#valeur-dessus')) + ' / ' + (await desc(page)).includes(', about 7 cm on top'), '7 cm / true');
  verifier('avertissements sur la page Réglages (pousse, lunettes)', (await page.$$eval('#avertissements .alerte b', (b) => b.map((x) => x.textContent))).join(), 'Pousse,Lunettes');
  await regler(page, 'curseur-dessus', 5);
  verifier('dessus revenu à 5 cm : plus d’avertissement de pousse', (await page.$$eval('#avertissements .alerte b', (b) => b.map((x) => x.textContent))).join(), 'Lunettes');
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
  verifier('Lissage', cas.lissage, 'Lissage : Le rendu demande un lissage ou un brushing.');
  verifier('Pousse', cas.pousse, 'Pousse : Il faut laisser pousser : environ 1 cm par mois.');
  verifier('Changement radical', cas.radical, 'Changement radical : Plus de 10 cm coupés : changement radical, plusieurs mois pour revenir en arrière.');
  verifier('Cheveux fins', cas.fins, 'Cheveux fins : Garder du volume en haut : une coupe très dégradée aplatit la forme.');
  verifier('Lunettes', cas.lunettes, 'Lunettes : Vérifie le contour d’oreille avec les lunettes remises.');
  verifier('aucun avertissement quand rien ne s’applique', cas.rien, '');
  verifier('barbe seule : pas d’avertissement sur les cheveux', cas.barbeSeule, '');
  await page.click('[data-barbe-seule="oui"]');
  verifier('barbe seule : résumé et [COUPE]', (await texte(page, '#resume-reglages')) + ' / ' + (await desc(page)), 'Barbe seule : barbe entretenue, cheveux inchangés / well-groomed beard with clean cheek lines');
  await page.click('#action-reglages');
  verifier('« Voir le résultat » ouvre Résultat', await ecran(page), 'resultat');
  verifier('barbe seule : ligne de la variante ajoutée à la fin du prompt image', await page.textContent('#prompt-2'),
    avec(IMAGE, '[COUPE]', 'well-groomed beard with clean cheek lines') + '\n' + BARBE_SEULE);
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'reglages');
  await page.click('[data-barbe-seule="non"]');

  /* ============ D. Catalogue personnalisé ============ */
  console.log('D. Catalogue personnalisé : caractéristiques');
  await page.click('#vers-caracteristiques');
  verifier('« Ajouter des caractéristiques » ouvre le Catalogue personnalisé', await ecran(page), 'personnalise');
  verifier('6 catégories', (await page.$$eval('#categories h2', (h) => h.map((x) => x.textContent))).join(' | '), 'Côtés | Devant et dessus | Couleur | Texture | Barbe | Nuque et contours');
  verifier('35 caractéristiques, chacune avec un pictogramme au trait', await page.$$eval('#categories [data-caracteristique]', (c) => c.length + ' / ' + c.filter((x) => x.querySelector('svg path')).length), '35 / 35');
  verifier('coupe gardée comme coupe de départ', (await texte(page, '#bloc-base [data-base="oui"]')) + ' ' + (await presse(page, '#bloc-base [data-base="oui"]')), 'Skin fade true');
  const base = descSkin + ', starting at clipper guard 0.5, well-groomed beard with clean cheek lines';
  await page.click('[data-caracteristique="meche-cote"]');
  await page.click('[data-caracteristique="undercut"]');
  verifier('sélection multiple', (await presse(page, '[data-caracteristique="meche-cote"]')) + (await presse(page, '[data-caracteristique="undercut"]')), 'truetrue');
  verifier('fragments ajoutés à [COUPE], après la coupe', await desc(page), base + ', undercut: sides and back clipped short, disconnected from a longer top, a side-swept lock at the front');
  verifier('résumé mis à jour', await texte(page, '#resume-personnalise'), 'Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue, undercut, mèche sur le côté');
  verifier('pas de message sans contradiction', await page.isHidden('#contradictions'));
  await page.click('[data-caracteristique="degrade-blanc"]');
  verifier('contradiction signalée par un message', await texte(page, '#contradictions .alerte'), '« Undercut » et « Dégradé à blanc » se contredisent. Garde un seul des deux, sauf si c’est voulu.');
  verifier('sans bloquer : les deux restent choisies', (await presse(page, '[data-caracteristique="undercut"]')) + (await presse(page, '[data-caracteristique="degrade-blanc"]')), 'truetrue');
  await page.click('[data-caracteristique="degrade-blanc"]');
  await page.click('[data-caracteristique="undercut"]');
  verifier('retoucher une carte la retire', await desc(page), base + ', a side-swept lock at the front');
  verifier('champ « Couleur libre » caché tant qu’elle n’est pas choisie', await page.isHidden('#couleur-libre'));
  await page.click('[data-caracteristique="couleur-libre"]');
  verifier('« Couleur libre » sans texte : rien n’est ajouté', await desc(page), base + ', a side-swept lock at the front');
  await page.fill('#couleur-libre', 'copper red');
  verifier('couleur libre : le changement est écrit clairement', await desc(page), base + ', a side-swept lock at the front, hair color change: copper red');
  await page.click('[data-caracteristique="couleur-libre"]');
  await page.click('[data-caracteristique="platine"]');
  verifier('une couleur écrit « hair color change »', (await desc(page)).endsWith(', hair color change: full platinum blonde'));
  await page.click('[data-caracteristique="platine"]');
  const tableau = await page.evaluate(() => window.CARACTERISTIQUES.categories.map((c) => c.liste.map((x) => c.nom + ' | ' + x.fr + ' | ' + x.en).join('\n')).join('\n'));
  const doc = fs.readFileSync(path.join(RACINE, 'CLAUDE.md'), 'utf8');
  const manquantes = tableau.split('\n').filter((ligne) => {
    const [categorie, fr, en] = ligne.split(' | ');
    const fragment = en.endsWith(' X') ? en.slice(0, -1) : en;
    return !doc.split('\n').some((l) => l.startsWith('| ' + categorie + ' | ' + fr) && l.includes('`' + fragment));
  });
  verifier('le tableau FR → EN de CLAUDE.md contient les 35 fragments', manquantes.join(' ; '), '');
  await page.click('[data-caracteristique="dessus-decoiffe"]');
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'reglages');
  verifier('retour aux réglages : le lien indique les caractéristiques', await texte(page, '#vers-caracteristiques'), '2 caractéristiques ajoutées : modifier');
  await page.click('[data-reglage="coiffage"][data-valeur="decoiffe"]');
  verifier('un fragment identique n’est écrit qu’une fois', ((await desc(page)).match(/messy, textured top/g) || []).length, 1);
  await page.click('[data-reglage="coiffage"][data-valeur="decoiffe"]');
  await page.click('#vers-caracteristiques');
  await page.click('[data-caracteristique="dessus-decoiffe"]');
  await page.click('[data-base="non"]');
  verifier('« Aucune » : coupe 100 % personnalisée', await desc(page), 'a side-swept lock at the front');
  verifier('résumé sans coupe de départ', await texte(page, '#resume-personnalise'), 'Coupe personnalisée : mèche sur le côté');
  verifier('« Aucune » n’efface pas la coupe', await page.evaluate(() => window.CoupeStudio.etat.coupe.id + ' / ' + window.CoupeStudio.etat.reglages.sabot), 'skin-fade / 0.5');
  await page.click('#ecran-personnalise .btn');
  verifier('100 % personnalisée : diagnostic', await page.textContent('#prompt-1'), avec(DIAGNOSTIC, '[COUPE]', 'Coupe personnalisée : mèche sur le côté'));
  verifier('100 % personnalisée : prompt image', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', 'a side-swept lock at the front'));
  verifier('100 % personnalisée en mode barber : fiche barber', await page.textContent('#prompt-3'), FICHE_BARBER);
  await page.click('#retour');
  await page.waitForFunction(() => window.CoupeStudio.etat.ecran === 'personnalise');
  await page.click('[data-base="oui"]');
  await page.click('#ecran-personnalise .btn');

  /* ============ E. Résultat ============ */
  console.log('E. Résultat : prompts, copie, Gemini, photo de référence');
  const coupeFr = 'Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue, mèche sur le côté';
  const coupeEn = base + ', a side-swept lock at the front';
  verifier('3 étapes, plus d’étape Fond', (await page.$$eval('#etapes .etape', (e) => e.map((x) => x.textContent))).join(' | '), 'Étape 1 · Diagnostic | Étape 2 · Image | Étape 3 · Fiche');
  verifier('étape 1 = prompt diagnostic, [COUPE] en français', await page.textContent('#prompt-1'), avec(DIAGNOSTIC, '[COUPE]', coupeFr));
  verifier('étape 2 = prompt image, [COUPE] en anglais', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', coupeEn));
  verifier('étape 3 = fiche barber', await page.textContent('#prompt-3'), FICHE_BARBER);
  verifier('chaque carte affiche sa consigne', await page.$$eval('#etapes .consigne:not([hidden])', (c) => c.filter((x) => x.textContent.trim()).length), 3);
  const liens = await page.$$eval('#etapes a', (a) => a.map((x) => [x.textContent, x.href, x.target, x.rel].join('|')));
  verifier('« Ouvrir Gemini » : bon lien, nouvel onglet', [...new Set(liens)].join(), 'Ouvrir Gemini|https://gemini.google.com/app|_blank|noopener');
  await page.click('[data-copier="prompt-2"]');
  await page.waitForTimeout(150);
  verifier('« Copier » devient « Copié »', await texte(page, '[data-copier="prompt-2"]'), 'Copié');
  verifier('le presse-papiers contient le prompt exact', await pressePapiers(page), avec(IMAGE, '[COUPE]', coupeEn));
  await page.waitForTimeout(1600);
  verifier('« Copié » redevient « Copier » après 1,5 s', await texte(page, '[data-copier="prompt-2"]'), 'Copier');
  await page.click('[data-reference="oui"]');
  verifier('photo de référence : remplace l’étape Image', await page.textContent('#prompt-2'), REFERENCE);
  await page.click('[data-reference="non"]');
  verifier('sans photo de référence : retour au prompt image', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', coupeEn));
  await page.reload();
  verifier('rechargement (retour de Gemini) : tout est toujours là', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', coupeEn));

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
  verifier('lien trafiqué : valeurs inconnues ignorées, curseur borné', await texte(page, '#resume-reglages'), 'Skin fade, sabot 0, dessus 15 cm, undercut');
  await contexte.close();
  const ancien = Buffer.from(JSON.stringify({ v: 1, c: 'quiff', r: { cotes: 'degrade', dessus: 9, coiffage: 'avant' }, f: { type: 'gris' } })).toString('base64url');
  ({ contexte, page } = await nouvelle(navigateur, { adresse: ADRESSE + '?r=' + ancien }));
  verifier('un lien de la version précédente s’ouvre encore', await texte(page, '#resume-reglages'), 'Quiff, dessus 9 cm');
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
  liste = await ids(page, '#grille-coupes [data-coupe]', 'data-coupe');
  modes = await modesDe(page, liste);
  verifier('mode salon : 12 coupes salon', modes.filter((m) => m === 'salon').length, 12);
  verifier('visage carré en salon : carré flou et frange rideau conseillés', (await ids(page, '#conseillees [data-coupe]', 'data-coupe')).slice(0, 2).sort().join(), 'carre-flou,frange-rideau');
  await page.click('#grille-coupes [data-coupe="carre-plongeant"]');
  const descCarre = await page.evaluate(() => window.CoupeStudio.coupeDuCatalogue('carre-plongeant').desc);
  verifier('résumé de départ', await texte(page, '#resume-reglages'), 'Carré plongeant, longueur au menton, 22 cm');
  verifier('réglages salon', (await page.$$eval('#zone-reglages .etiquette', (e) => e.map((x) => x.textContent))).join(' | '),
    'Longueur | Longueur en centimètres | Forme | Couches | Frange | Raie | Couleur | Couleur voulue, en anglais');
  await page.click('[data-repere="epaules"]');
  verifier('repère Épaules : fragment de longueur', await desc(page), descCarre + ', length at the shoulders, about 32 cm');
  await regler(page, 'curseur-longueur', 50);
  verifier('curseur à 50 cm : le repère suit', (await presse(page, '[data-repere="omoplates"]')) + ' / ' + (await texte(page, '#valeur-longueur')), 'true / 50 cm, aux omoplates');
  await regler(page, 'curseur-longueur', 22);
  await page.click('[data-reglage="couleur"][data-valeur="autre"]');
  await page.fill('#couleur-autre', 'copper red');
  verifier('couleur « Autre » écrite dans desc', await desc(page), descCarre + ', hair color changed to copper red');
  await page.click('[data-reglage="couleur"][data-valeur="inchangee"]');
  await page.click('[data-reglage="couches"][data-valeur="marquees"]');
  verifier('cheveux fins + couches marquées : avertissement', (await page.$$eval('#avertissements .alerte b', (b) => b.map((x) => x.textContent))).join(), 'Cheveux fins');
  await page.click('#action-reglages');
  verifier('étape 3 = fiche salon', await page.textContent('#prompt-3'), FICHE_SALON);
  verifier('étape 1 = diagnostic tel quel (pas de version salon validée)', await page.textContent('#prompt-1'),
    avec(DIAGNOSTIC, '[COUPE]', 'Carré plongeant, longueur au menton, 22 cm, couches marquées'));
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
  verifier('prompt image fait des seules caractéristiques', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', 'curtain bangs parted in the middle, hair color change: soft natural balayage'));
  verifier('thème neutre sans coupe : choix de la fiche proposé', await page.isVisible('#bloc-fiche'));
  verifier('fiche barber par défaut', await page.textContent('#prompt-3'), FICHE_BARBER);
  await page.click('[data-fiche="salon"]');
  verifier('fiche salon sur demande', await page.textContent('#prompt-3'), FICHE_SALON);
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
  verifier('sans anglais : la description française part dans le prompt', await desc(page), 'Carré court effilé, nuque dégagée, curtain bangs parted in the middle, hair color change: soft natural balayage');
  await page.click('#action-reglages');
  verifier('coupe ajoutée : diagnostic avec nom et description', await page.textContent('#prompt-1'),
    avec(DIAGNOSTIC, '[COUPE]', 'Coupe <b>Léa</b> (Carré court effilé, nuque dégagée), frange rideau, balayage'));
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
  verifier('6 retouches sans IA', (await page.$$eval('#outils-retouche .outil-titre', (t) => t.map((x) => x.textContent))).join(' | '), 'Luminosité | Contraste | Chaleur | Noir et blanc | Recadrage | Montage avant/après');
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
  await page.click('[data-bascule="nb"][data-valeur="oui"]');
  await page.waitForTimeout(150);
  const gris = await pixel(page, 0.05, 0.05);
  verifier('noir et blanc', gris[0] === gris[1] && gris[1] === gris[2]);
  await page.click('[data-bascule="nb"][data-valeur="non"]');
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
  verifier('montage : choix masqué tant qu’il n’y a pas de photo d’avant', await page.isHidden('#groupe-montage'));
  await page.setInputFiles('#fichier-avant', PHOTO_TEST);
  await page.waitForSelector('#groupe-montage:not([hidden])');
  await page.waitForTimeout(150);
  verifier('montage avant/après côte à côte : deux fois plus large', await tailleApercu(page), '720 × 480');
  verifier('montage : les deux moitiés montrent la même photo de test', (await pixel(page, 0.02, 0.05)).join(), (await pixel(page, 0.52, 0.05)).join());
  await page.click('[data-format="9-16"]');
  await page.waitForTimeout(150);
  verifier('montage en 9:16 : l’une au-dessus de l’autre', await tailleApercu(page), '405 × 720');
  await page.click('[data-format="original"]');
  await page.click('[data-montage="non"]');
  await page.waitForTimeout(150);
  verifier('sans montage : retour à la photo seule', await tailleApercu(page), '540 × 720');
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
  await page.click('#grille-coupes [data-coupe="quiff"]');
  await page.click('#action-reglages');
  verifier('les prompts sont produits', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', await page.evaluate(() => window.CoupeStudio.coupeDuCatalogue('quiff').desc)));
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
  await page.click('#grille-coupes [data-coupe="quiff"]');
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
