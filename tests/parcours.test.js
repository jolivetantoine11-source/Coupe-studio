/* Test de parcours : l'appli fait bien ce que CLAUDE.md demande, du choix du mode au prompt copié.
   Lancer : node tests/parcours.test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { RACINE, ADRESSE, chromium } = require('./outils');

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
const [FOND] = blocs('CLAUDE.md');
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
const ecran = (page) => page.evaluate(() => window.location.hash.replace('#', ''));
const texte = async (page, selecteur) => (await page.textContent(selecteur)).trim();
const desc = (page) => page.evaluate(() => window.CoupeStudio.descAnglaise(window.CoupeStudio.etat.coupe, window.CoupeStudio.etat.reglages));
const idsGrille = (page) => page.$$eval('#grille-coupes [data-coupe]', (cartes) => cartes.map((c) => c.getAttribute('data-coupe')));
const idsProposes = (page) => page.$$eval('#propositions [data-coupe]', (cartes) => cartes.map((c) => c.getAttribute('data-coupe')));
const alertes = (page) => page.$$eval('#avertissements .alerte b', (b) => b.map((x) => x.textContent));
const regler = (page, id, valeur) => page.evaluate(([i, v]) => {
  const c = document.getElementById(i);
  c.value = String(v);
  c.dispatchEvent(new Event('input', { bubbles: true }));
}, [id, valeur]);
const presse = (page, selecteur) => page.getAttribute(selecteur, 'aria-pressed');
const aller = async (page, e) => { await page.click('.onglet[data-onglet="' + e + '"]'); };
const pressePapiers = (page) => page.evaluate(() => navigator.clipboard.readText());

(async () => {
  const navigateur = await chromium.launch();

  /* ============ A. Accueil et mode ============ */
  console.log('A. Accueil : mode, thème, mémoire');
  let { contexte, page } = await nouvelle(navigateur);
  verifier('premier lancement : thème neutre', await theme(page), 'neutre');
  verifier('titre « Coupe Studio »', await texte(page, '#titre-accueil'), 'Coupe Studio');
  verifier('sous-titre', await texte(page, '#ecran-accueil .sous-titre'), 'Montre la coupe avant de la faire.');
  await aller(page, 'catalogue');
  let ids = await idsGrille(page);
  let modes = await page.evaluate((liste) => liste.map((id) => window.CoupeStudio.coupeDuCatalogue(id).mode), ids);
  verifier('thème neutre : 12 coupes', ids.length, 12);
  verifier('thème neutre : 6 barber et 6 salon', modes.filter((m) => m === 'barber').length + '/' + modes.filter((m) => m === 'salon').length, '6/6');
  await aller(page, 'accueil');
  await page.click('[data-mode="barber"]');
  verifier('choisir Barber : thème barber', await theme(page), 'barber');
  await page.reload();
  verifier('le mode est mémorisé après rechargement', await theme(page), 'barber');
  await page.click('[data-mode="barber"]');
  verifier('retoucher le mode actif : retour au thème neutre', await theme(page), 'neutre');
  await page.click('[data-mode="barber"]');
  await page.click('#ecran-accueil .btn');
  verifier('« Choisir une coupe » ouvre le catalogue', await ecran(page), 'catalogue');
  ids = await idsGrille(page);
  modes = await page.evaluate((liste) => liste.map((id) => window.CoupeStudio.coupeDuCatalogue(id).mode), ids);
  verifier('mode barber : 12 coupes barber', modes.filter((m) => m === 'barber').length, 12);

  /* ============ B. Recette barber ============ */
  console.log('B. Recette barber : réglages, résumé, description anglaise');
  await page.click('[data-coupe="skin-fade"]');
  verifier('toucher une carte ouvre Recette', await ecran(page), 'recette');
  verifier('titre = nom de la coupe', await texte(page, '#titre-recette'), 'Skin fade');
  verifier('résumé de départ', await texte(page, '#resume-recette'), 'Skin fade, sabot 0, dessus 5 cm');
  const descSkin = await page.evaluate(() => window.CoupeStudio.coupeDuCatalogue('skin-fade').desc);
  verifier('aucun réglage modifié : rien n’est ajouté à desc', await desc(page), descSkin);
  await page.click('[data-reglage="sabot"][data-valeur="0.5"]');
  await page.click('[data-reglage="barbe"][data-valeur="entretenue"]');
  verifier('résumé = exemple de CLAUDE.md', await texte(page, '#resume-recette'), 'Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue');
  verifier('fragments anglais des réglages modifiés', await desc(page), descSkin + ', starting at clipper guard 0.5, well-groomed beard with clean cheek lines');
  await regler(page, 'curseur-dessus', 7);
  verifier('curseur Dessus : valeur affichée', await texte(page, '#valeur-dessus'), '7 cm');
  verifier('curseur Dessus : fragment', (await desc(page)).includes(', about 7 cm on top'));
  await regler(page, 'curseur-dessus', 5);
  verifier('curseur revenu à la valeur de la coupe : fragment retiré', !(await desc(page)).includes('cm on top'));
  await page.click('[data-reglage="coiffage"][data-valeur="arriere"]');
  verifier('Coiffage : choix actif', await presse(page, '[data-reglage="coiffage"][data-valeur="arriere"]'), 'true');
  await page.click('[data-reglage="coiffage"][data-valeur="arriere"]');
  verifier('Coiffage (vide au départ) : retoucher le retire', await presse(page, '[data-reglage="coiffage"][data-valeur="arriere"]'), 'false');
  await page.click('[data-reglage="cotes"][data-valeur="blanc"]');
  verifier('Côtés (imposé par la coupe) : retoucher ne le retire pas', await presse(page, '[data-reglage="cotes"][data-valeur="blanc"]'), 'true');
  verifier('« Ne changer que la barbe » visible quand la barbe change', await page.isVisible('#bloc-barbe-seule'));
  await page.click('[data-barbe-seule="oui"]');
  verifier('barbe seule : résumé', await texte(page, '#resume-recette'), 'Barbe seule : barbe entretenue, cheveux inchangés');
  verifier('barbe seule : [COUPE] = la barbe seulement', await desc(page), 'well-groomed beard with clean cheek lines');
  await aller(page, 'resultat');
  verifier('barbe seule : ligne de la variante ajoutée à la fin du prompt image', await page.textContent('#prompt-2'),
    avec(IMAGE, '[COUPE]', 'well-groomed beard with clean cheek lines') + '\n' + BARBE_SEULE);
  await aller(page, 'recette');
  await page.click('[data-reglage="barbe"][data-valeur="inchangee"]');
  verifier('barbe inchangée : l’option barbe seule disparaît', await page.isHidden('#bloc-barbe-seule'));
  await page.click('[data-reglage="barbe"][data-valeur="entretenue"]');
  verifier('barbe seule remise à Non', await presse(page, '[data-barbe-seule="non"]'), 'true');

  await page.goBack();
  verifier('bouton Retour du téléphone : écran précédent', (await ecran(page)) + ' / ' + (await page.isVisible('#ecran-resultat')), 'resultat / true');
  await page.goForward();
  verifier('bouton Suivant : retour à Recette', await page.isVisible('#ecran-recette'));

  /* ============ C. Fond ============ */
  console.log('C. Fond');
  await page.click('[data-ouvrir-fond="recette"]');
  verifier('bouton « Fond » ouvre l’écran Fond', await ecran(page), 'fond');
  verifier('onglet actif pendant Fond : Recette', await page.getAttribute('.onglet[data-onglet="recette"]', 'aria-current'), 'page');
  verifier('phrase fixe', await texte(page, '#ecran-fond .sous-titre'), 'Le fond change, la coiffure reste identique.');
  verifier('6 options de fond', (await page.$$('#choix-fond [data-fond]')).length, 6);
  verifier('pastilles cachées tant que « Couleur unie » n’est pas choisi', await page.isHidden('#bloc-couleur-unie'));
  await page.click('[data-fond="couleur"]');
  verifier('« Couleur unie » ouvre 4 pastilles', (await page.$$('#pastilles [data-couleur]:visible')).length, 4);
  await page.click('[data-couleur="mauve"]');
  await page.click('#appliquer-fond');
  verifier('« Appliquer » revient à l’écran précédent', await ecran(page), 'recette');
  verifier('le choix est enregistré', await texte(page, '[data-ouvrir-fond="recette"]'), 'Fond : couleur unie, mauve');
  await page.click('[data-ouvrir-fond="recette"]');
  await page.click('[data-fond="gris"]');
  await aller(page, 'recette');
  verifier('quitter Fond sans « Appliquer » ne change rien', await texte(page, '[data-ouvrir-fond="recette"]'), 'Fond : couleur unie, mauve');

  /* ============ D. Client ============ */
  console.log('D. Client : questions, propositions, avertissements');
  await page.click('#action-recette');
  verifier('« Voir le profil client » ouvre Client', await ecran(page), 'client');
  verifier('5 questions', (await page.$$('#questions .groupe')).length, 5);
  verifier('« Cheveux fins » absent en barber', (await page.$$('[data-question="front"][data-valeur="fins"]')).length, 0);
  verifier('sans réponse : les 3 plus demandées', (await idsProposes(page)).join(), 'skin-fade,crop-texture,taper-bas');
  await page.click('[data-question="front"][data-valeur="golfes-marques"]');
  verifier('golfes marqués : crop, buzz, crew', (await idsProposes(page)).join(), 'crop-texture,buzz-cut,crew-cut');
  await page.click('[data-question="front"][data-valeur="golfes-marques"]');
  await page.click('[data-question="visage"][data-valeur="rond"]');
  ids = await idsProposes(page);
  verifier('visage rond : quiff et crop d’abord, pas de buzz cut', ids[0] + ',' + ids[1] + ',' + ids.includes('buzz-cut'), 'crop-texture,quiff,false');
  await page.click('[data-question="texture"][data-valeur="boucles"]');
  verifier('bouclés : le dégradé bouclé est proposé', (await idsProposes(page)).includes('degrade-boucle'));
  await page.click('[data-question="lunettes"][data-valeur="oui"]');
  verifier('lunettes : rappel du contour d’oreille', (await alertes(page)).join(), 'Lunettes');
  const cas = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const vide = { texture: null, visage: null, front: null, longueur: null, lunettes: null };
    const titres = (id, profil, reglages) => {
      const c = A.coupeDuCatalogue(id);
      const r = Object.assign(A.recetteParDefaut(c), reglages || {});
      return A.avertissements(c, r, Object.assign({}, vide, profil)).map((a) => a.titre + ' : ' + a.texte).join(' | ');
    };
    return {
      golfes: titres('quiff', { front: 'golfes-marques' }),
      golfesSlick: titres('slick-back', { front: 'golfes-marques' }),
      lissage: titres('slick-back', { texture: 'boucles' }),
      lissageSalon: titres('long-droit', { texture: 'crepus', longueur: 'longue' }),
      pousse: titres('mi-long-flow', { longueur: 'courte' }),
      radical: titres('buzz-cut', { longueur: 'longue' }),
      radicalSalon: titres('pixie', { longueur: 'longue' }),
      fins: titres('shag', { front: 'fins' }),
      finsCouches: titres('carre-plongeant', { front: 'fins' }, { couches: 'marquees' }),
      rien: titres('skin-fade', { texture: 'lisses', visage: 'ovale', front: 'normale', longueur: 'moyenne', lunettes: 'non' }),
      barbeSeule: titres('quiff', { front: 'golfes-marques', lunettes: 'oui' }, { barbe: 'rasee', barbeSeule: true })
    };
  });
  verifier('Golfes : quiff', cas.golfes, 'Golfes marqués : Ces coupes dégagent le front : garder du dessus pour couvrir la ligne frontale.');
  verifier('Golfes : slick back', cas.golfesSlick.startsWith('Golfes marqués'));
  verifier('Lissage : slick back sur bouclés', cas.lissage, 'Lissage : Le rendu demande un lissage ou un brushing.');
  verifier('Lissage : long droit sur crépus', cas.lissageSalon, 'Lissage : Le rendu demande un lissage ou un brushing.');
  verifier('Pousse : mi-long demandé, cheveux courts', cas.pousse, 'Pousse : Il faut laisser pousser : environ 1 cm par mois.');
  verifier('Changement radical : longue vers buzz cut', cas.radical, 'Changement radical : Plus de 10 cm coupés : changement radical, plusieurs mois pour revenir en arrière.');
  verifier('Changement radical : longue vers pixie', cas.radicalSalon.startsWith('Changement radical'));
  verifier('Cheveux fins : shag', cas.fins, 'Cheveux fins : Garder du volume en haut : une coupe très dégradée aplatit la forme.');
  verifier('Cheveux fins : couches marquées', cas.finsCouches.startsWith('Cheveux fins'));
  verifier('aucun avertissement quand rien ne s’applique', cas.rien, '');
  verifier('barbe seule : pas d’avertissement sur les cheveux', cas.barbeSeule, '');
  await page.setViewportSize({ width: 320, height: 568 });
  const visible = await page.evaluate(() => {
    const r = document.querySelector('#action-client').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  });
  verifier('petit écran (320 × 568) : « Générer les prompts » reste visible', visible);
  await page.setViewportSize({ width: 390, height: 844 });

  /* ============ E. Résultat ============ */
  console.log('E. Résultat : prompts, copie, Gemini, photo de référence');
  await page.click('#action-client');
  verifier('« Générer les prompts » ouvre Résultat', await ecran(page), 'resultat');
  const coupeFr = 'Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue';
  const coupeEn = descSkin + ', starting at clipper guard 0.5, well-groomed beard with clean cheek lines';
  verifier('4 étapes quand le fond change', (await page.$$('#etapes .carte')).length, 4);
  verifier('étapes dans l’ordre', (await page.$$eval('#etapes .etape', (e) => e.map((x) => x.textContent))).join(' | '),
    'Étape 1 · Diagnostic | Étape 2 · Image | Étape 3 · Fiche | Étape 4 · Fond');
  verifier('étape 1 = prompt diagnostic, [COUPE] en français', await page.textContent('#prompt-1'), avec(DIAGNOSTIC, '[COUPE]', coupeFr));
  verifier('étape 2 = prompt image, [COUPE] en anglais', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', coupeEn));
  verifier('étape 3 = fiche barber', await page.textContent('#prompt-3'), FICHE_BARBER);
  verifier('étape 4 = prompt de fond', await page.textContent('#prompt-4'), avec(FOND, '[FOND]', 'a plain solid soft mauve backdrop'));
  verifier('chaque carte affiche sa consigne', (await page.$$eval('#etapes .consigne:not([hidden])', (c) => c.filter((x) => x.textContent.trim()).length)), 4);
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
  verifier('photo de référence : les autres étapes ne changent pas', await page.textContent('#prompt-1'), avec(DIAGNOSTIC, '[COUPE]', coupeFr));
  await page.click('[data-reference="non"]');
  verifier('sans photo de référence : retour au prompt image', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', coupeEn));
  await page.reload();
  verifier('rechargement (retour de Gemini) : la recette est toujours là', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', coupeEn));
  await page.click('[data-ouvrir-fond="resultat"]');
  verifier('Fond s’ouvre aussi depuis Résultat', await page.getAttribute('.onglet[data-onglet="resultat"]', 'aria-current'), 'page');
  await page.click('[data-fond="origine"]');
  await page.click('#appliquer-fond');
  verifier('retour à Résultat après « Appliquer »', await ecran(page), 'resultat');
  verifier('fond d’origine : 3 étapes, pas d’étape Fond', (await page.$$('#etapes .carte')).length, 3);

  /* ============ F. Enregistrer ============ */
  console.log('F. Enregistrer et recharger une recette');
  await page.click('#enregistrer');
  verifier('« Enregistrer » confirme', await texte(page, '#enregistrer'), 'Enregistrée');
  await page.click('#enregistrer');
  await aller(page, 'accueil');
  verifier('la recette apparaît dans « Mes recettes », sans doublon', (await page.$$eval('#liste-recettes .carte-titre', (t) => t.map((x) => x.textContent))).join(' | '), coupeFr);
  verifier('date affichée', await texte(page, '#liste-recettes .carte .discret'), 'Enregistrée aujourd’hui');
  await aller(page, 'recette');
  await page.click('[data-reglage="sabot"][data-valeur="1"]');
  await aller(page, 'resultat');
  await page.click('#enregistrer');
  await aller(page, 'accueil');
  const titres = await page.$$eval('#liste-recettes .carte-titre', (t) => t.map((x) => x.textContent));
  verifier('la plus récente en haut', titres.join(' | '), 'Skin fade, sabot 1, dessus 5 cm, barbe entretenue | ' + coupeFr);
  await page.click('#liste-recettes .carte:nth-child(2)');
  verifier('toucher une recette la recharge dans Recette', (await ecran(page)) + ' : ' + (await texte(page, '#resume-recette')), 'recette : ' + coupeFr);
  const profilRecharge = await page.evaluate(() => window.CoupeStudio.etat.profil);
  verifier('le profil est rechargé avec la recette', profilRecharge.visage + ',' + profilRecharge.texture + ',' + profilRecharge.lunettes, 'rond,boucles,oui');

  /* ============ G. Partager ============ */
  console.log('G. Partager un lien');
  await aller(page, 'resultat');
  await page.click('#partager');
  await page.waitForTimeout(150);
  verifier('« Partager » confirme', await texte(page, '#partager'), 'Lien copié');
  const lien = await pressePapiers(page);
  verifier('le lien contient ?r=', /\/index\.html\?r=[A-Za-z0-9_-]+$/.test(lien));
  const contenu = JSON.parse(Buffer.from(lien.split('?r=')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  verifier('le lien ne contient que la coupe, les réglages et le fond (pas le profil du client)', Object.keys(contenu).sort().join(), 'c,f,r,v');
  await contexte.close();
  ({ contexte, page } = await nouvelle(navigateur, { adresse: lien }));
  verifier('ouvrir le lien charge la recette', (await texte(page, '#titre-recette')) + ' : ' + (await texte(page, '#resume-recette')), 'Skin fade : ' + coupeFr);
  verifier('l’adresse est nettoyée après chargement', await page.evaluate(() => window.location.search + window.location.hash), '#recette');
  await contexte.close();
  ({ contexte, page } = await nouvelle(navigateur, { adresse: ADRESSE + '?r=pas-une-recette' }));
  verifier('lien illisible : message clair sur l’accueil', await texte(page, '#message-accueil'), 'Ce lien de recette est illisible. Demande un nouveau lien, ou choisis une coupe.');
  await contexte.close();
  const piege = Buffer.from(JSON.stringify({ v: 1, c: 'skin-fade', r: { cotes: '<img src=x onerror=alert(1)>', dessus: 999, barbe: 'inconnue' }, f: { type: 'x' } })).toString('base64url');
  ({ contexte, page } = await nouvelle(navigateur, { adresse: ADRESSE + '?r=' + piege }));
  verifier('lien trafiqué : valeurs inconnues ignorées, curseur borné', await texte(page, '#resume-recette'), 'Skin fade, sabot 0, dessus 15 cm');
  await contexte.close();

  /* ============ H. Salon ============ */
  console.log('H. Mode salon');
  ({ contexte, page } = await nouvelle(navigateur));
  await page.click('[data-mode="salon"]');
  verifier('choisir Salon : thème salon', await theme(page), 'salon');
  await aller(page, 'catalogue');
  ids = await idsGrille(page);
  modes = await page.evaluate((liste) => liste.map((id) => window.CoupeStudio.coupeDuCatalogue(id).mode), ids);
  verifier('mode salon : 12 coupes salon', modes.filter((m) => m === 'salon').length, 12);
  await page.click('[data-coupe="carre-plongeant"]');
  const descCarre = await page.evaluate(() => window.CoupeStudio.coupeDuCatalogue('carre-plongeant').desc);
  verifier('résumé de départ', await texte(page, '#resume-recette'), 'Carré plongeant, longueur au menton, 22 cm');
  verifier('6 réglages salon', (await page.$$eval('#reglages .etiquette', (e) => e.map((x) => x.textContent))).join(' | '),
    'Longueur | Longueur en centimètres | Forme | Couches | Frange | Raie | Couleur | Couleur voulue, en anglais');
  await page.click('[data-repere="epaules"]');
  verifier('repère Épaules : fragment de longueur', await desc(page), descCarre + ', length at the shoulders, about 32 cm');
  await regler(page, 'curseur-longueur', 50);
  verifier('curseur à 50 cm : le repère suit', (await presse(page, '[data-repere="omoplates"]')) + ' / ' + (await texte(page, '#valeur-longueur')), 'true / 50 cm, aux omoplates');
  await regler(page, 'curseur-longueur', 22);
  await page.click('[data-reglage="couleur"][data-valeur="balayage"]');
  verifier('Balayage : le changement de couleur est écrit', await desc(page), descCarre + ', with a soft natural balayage');
  await page.click('[data-reglage="couleur"][data-valeur="autre"]');
  verifier('« Autre » ouvre le champ libre', await page.isVisible('#couleur-autre'));
  verifier('« Autre » sans texte : rien n’est ajouté', await desc(page), descCarre);
  await page.fill('#couleur-autre', 'copper red');
  verifier('« Autre » : couleur écrite dans desc', await desc(page), descCarre + ', hair color changed to copper red');
  verifier('« Autre » : couleur dans le résumé', await texte(page, '#resume-recette'), 'Carré plongeant, longueur au menton, 22 cm, couleur : copper red');
  await page.click('[data-reglage="couleur"][data-valeur="inchangee"]');
  await page.click('[data-reglage="couches"][data-valeur="marquees"]');
  await page.click('[data-reglage="raie"][data-valeur="cote"]');
  verifier('couches et raie', await desc(page), descCarre + ', strong layers, side part');
  await aller(page, 'client');
  verifier('« Cheveux fins » proposé en salon', (await page.$$('[data-question="front"][data-valeur="fins"]')).length, 1);
  await page.click('[data-question="front"][data-valeur="fins"]');
  verifier('cheveux fins + couches marquées : avertissement', (await alertes(page)).join(), 'Cheveux fins');
  await page.click('[data-question="visage"][data-valeur="carre"]');
  verifier('visage carré en salon : carré flou et frange rideau', (await idsProposes(page)).slice(0, 2).sort().join(), 'carre-flou,frange-rideau');
  await page.click('#action-client');
  verifier('étape 3 = fiche salon', await page.textContent('#prompt-3'), FICHE_SALON);
  verifier('étape 1 = diagnostic tel quel (pas de version salon validée)', await page.textContent('#prompt-1'),
    avec(DIAGNOSTIC, '[COUPE]', 'Carré plongeant, longueur au menton, 22 cm, couches marquées, raie sur le côté'));
  await aller(page, 'catalogue');
  await page.click('[data-coupe="shag"]');
  await page.click('[data-reglage="frange"][data-valeur="sans"]');
  verifier('retirer la frange d’une coupe qui en a une : écrit dans desc', (await desc(page)).endsWith(', no fringe'));

  /* ============ I. Ajouter ma coupe ============ */
  console.log('I. Ajouter ma coupe');
  await aller(page, 'catalogue');
  await page.click('#ouvrir-ajout');
  await page.click('#form-ajout .btn');
  verifier('formulaire vide : l’erreur dit quoi faire', await texte(page, '#ajout-erreur'), 'Il manque le nom : écris comment tu appelles cette coupe.');
  await page.fill('#ajout-nom', 'Coupe <b>Léa</b>');
  await page.fill('#ajout-ligne', 'Carré court effilé, nuque dégagée');
  await page.click('#form-ajout .btn');
  verifier('la coupe ajoutée s’ouvre dans Recette', await texte(page, '#titre-recette'), 'Coupe <b>Léa</b>');
  verifier('sans anglais : la description française part dans le prompt', await desc(page), 'Carré court effilé, nuque dégagée');
  await page.click('[data-reglage="frange"][data-valeur="rideau"]');
  await aller(page, 'resultat');
  verifier('coupe ajoutée : diagnostic avec nom et description', await page.textContent('#prompt-1'),
    avec(DIAGNOSTIC, '[COUPE]', 'Coupe <b>Léa</b> (Carré court effilé, nuque dégagée), frange rideau'));
  verifier('coupe ajoutée : prompt image', await page.textContent('#prompt-2'), avec(IMAGE, '[COUPE]', 'Carré court effilé, nuque dégagée, curtain bangs'));
  await aller(page, 'catalogue');
  verifier('affichée en fin de grille', (await idsGrille(page)).length + ' : ' + (await texte(page, '#grille-coupes .coupe:last-child .coupe-nom')), '13 : Coupe <b>Léa</b>');
  verifier('le nom saisi n’est jamais interprété comme du code', (await page.$$('#grille-coupes b')).length, 0);
  await page.reload();
  verifier('toujours là après rechargement', (await idsGrille(page)).length, 13);
  await page.click('#ouvrir-ajout');
  await page.fill('#ajout-nom', 'Bob Anna');
  await page.fill('#ajout-ligne', 'Carré aux épaules');
  await page.fill('#ajout-en', 'shoulder-length bob with soft ends');
  await page.click('#form-ajout .btn');
  verifier('avec anglais : c’est lui qui part dans le prompt', await desc(page), 'shoulder-length bob with soft ends');
  await page.click('#supprimer-coupe');
  verifier('supprimer demande une seconde touche', await texte(page, '#supprimer-coupe'), 'Touche encore pour supprimer');
  await page.click('#supprimer-coupe');
  verifier('coupe supprimée : retour au catalogue', (await ecran(page)) + ' : ' + (await idsGrille(page)).length, 'catalogue : 13');
  await aller(page, 'accueil');
  await page.click('[data-mode="salon"]');
  await aller(page, 'catalogue');
  await page.click('#ouvrir-ajout');
  await page.fill('#ajout-nom', 'Test');
  await page.fill('#ajout-ligne', 'Test');
  await page.click('#form-ajout .btn');
  verifier('thème neutre : il faut dire Barber ou Salon', await texte(page, '#ajout-erreur'), 'Choisis Barber ou Salon : cela fixe les réglages de la recette.');
  await contexte.close();

  /* ============ J. Stockage bloqué ============ */
  console.log('J. Stockage du navigateur bloqué');
  ({ contexte, page } = await nouvelle(navigateur, {
    avant: () => {
      const refus = () => { throw new Error('stockage bloqué'); };
      Storage.prototype.getItem = refus;
      Storage.prototype.setItem = refus;
      Storage.prototype.removeItem = refus;
    }
  }));
  verifier('l’appli démarre', await texte(page, '#titre-accueil'), 'Coupe Studio');
  await page.click('[data-mode="barber"]');
  verifier('le mode change quand même', await theme(page), 'barber');
  await aller(page, 'catalogue');
  await page.click('[data-coupe="quiff"]');
  await aller(page, 'resultat');
  verifier('les prompts sont produits', await page.textContent('#prompt-2'),
    avec(IMAGE, '[COUPE]', await page.evaluate(() => window.CoupeStudio.coupeDuCatalogue('quiff').desc)));
  await page.click('#enregistrer');
  verifier('enregistrer : message clair', await texte(page, '#message-resultat'),
    'Recette gardée pour cette visite seulement : le stockage du navigateur est bloqué ou plein. Touche « Partager » pour la conserver.');
  await aller(page, 'accueil');
  verifier('la recette reste disponible pendant la visite', await texte(page, '#liste-recettes .carte-titre'), 'Quiff, dessus 8 cm');
  await contexte.close();

  /* ============ K. Presse-papiers refusé ============ */
  console.log('K. Presse-papiers refusé');
  ({ contexte, page } = await nouvelle(navigateur, {
    sansPressePapiers: true,
    avant: () => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('refusé')) }, configurable: true });
      document.execCommand = () => false;
    }
  }));
  await aller(page, 'catalogue');
  await page.click('[data-coupe="quiff"]');
  await aller(page, 'resultat');
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
  verifier('aucun bouton n’appelle generateImage', (source.match(/generateImage\(/g) || []).length, 1);
  verifier('aucun champ d’envoi de photo', (await page.$$('input[type="file"]')).length, 0);
  verifier('aucune image de personne (seulement des tracés SVG)', (await page.$$('img, picture, video')).length, 0);
  const requetes = [];
  page.on('request', (r) => requetes.push(r.url()));
  await page.reload();
  await page.waitForTimeout(300);
  const externes = [...new Set(requetes.filter((u) => !u.startsWith('file://')).map((u) => new URL(u).host))];
  verifier('seul appel réseau : les polices Google', externes.sort().join(), 'fonts.googleapis.com,fonts.gstatic.com');
  await contexte.close();

  await navigateur.close();
  verifier('aucune erreur JavaScript pendant tout le parcours', erreursJs.join(' | '), '');
  console.log(echecs === 0 ? '\nPARCOURS : ' + reussites + ' vérifications réussies.' : '\nPARCOURS : ' + echecs + ' échec(s) sur ' + (reussites + echecs) + '.');
  process.exit(echecs === 0 ? 0 : 1);
})();
