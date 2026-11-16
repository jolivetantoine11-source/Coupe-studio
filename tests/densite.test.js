/* Tests série 3 d'Antoine (15 novembre) : densité, tête chauve ou rasée, décoloration.
   1. Profil : « Clairsemés » et « Chauve / rasé » dans la question densité (barber et salon).
   2. Golfes marqués, clairsemés ou chauve : ligne Density juste après le nom de la coupe (série contrôle),
      Front forcé sans frange, longueur du dessus « kept at the current length, no added volume ».
   3. Chauve / rasé : seules les coupes sans longueur (buzz cut) et les caractéristiques de barbe ;
      le reste est grisé avec « Impossible sans cheveux ».
   4. Couleur fantaisie ou fort éclaircissement : avertissement de décoloration.
   Lancer : node tests/densite.test.js */
'use strict';
const { ADRESSE, chromium } = require('./outils');

let echecs = 0;
let reussites = 0;
function verifier(nom, obtenu, attendu) {
  const ok = arguments.length === 2 ? obtenu === true : obtenu === attendu;
  if (ok) { reussites++; console.log('  OK      ' + nom); return; }
  echecs++;
  console.log('  ÉCHEC   ' + nom + '\n            attendu : ' + JSON.stringify(attendu) + '\n            obtenu  : ' + JSON.stringify(obtenu));
}

const DENSITE = 'Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original';

(async () => {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto(ADRESSE);
  const options = () => page.$$eval('[data-question="front"]', (b) => b.map((x) => x.textContent).join(' · '));
  const ecran = () => page.evaluate(() => window.CoupeStudio.etat.ecran);

  console.log('1. Profil client : deux nouvelles réponses');
  await page.click('[data-mode="barber"]');
  await page.click('#action-accueil');
  verifier('barber', await options(), 'Normale · Golfes légers · Golfes marqués · Clairsemés · Chauve / rasé');
  await page.goto(ADRESSE);
  await page.click('[data-mode="salon"]');
  await page.click('#action-accueil');
  verifier('salon', await options(), 'Normale · Golfes légers · Golfes marqués · Clairsemés · Chauve / rasé · Cheveux fins');

  console.log('2. Ligne Density juste après le nom de la coupe');
  const densites = await page.evaluate((D) => {
    const A = window.CoupeStudio;
    const vide = { texture: null, visage: null, front: null, longueur: null, lunettes: null };
    const fin = (front, id, reglages, k) => {
      const c = id ? A.coupeDuCatalogue(id) : null;
      const d = A.descAnglaise({ coupe: c, reglages: c ? Object.assign(A.reglagesParDefaut(c), reglages || {}) : null, caracteristiques: k || [], couleurLibre: '', profil: Object.assign({}, vide, { front }) });
      const morceaux = d.split('. ');
      return morceaux[1] === D || (morceaux[0].startsWith('Beard:') && d.endsWith('. ' + D)) ? 'oui' : 'non';
    };
    return ['normale', 'golfes-legers', 'golfes-marques', 'clairsemes', 'chauve', 'fins'].map((f) => fin(f, 'skin-fade')).join(' ') +
      ' | salon ' + fin('clairsemes', 'long-droit') + ' | sans coupe ' + fin('golfes-marques', null, {}, ['balayage']) +
      ' | barbe seule ' + fin('chauve', 'buzz-cut', { barbe: 'courte', barbeSeule: true });
  }, DENSITE);
  verifier('seulement pour golfes marqués, clairsemés, chauve ; partout', densites, 'non non oui oui oui non | salon oui | sans coupe oui | barbe seule oui');
  const exemple = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const c = A.coupeDuCatalogue('buzz-cut');
    return A.descAnglaise({ coupe: c, reglages: A.reglagesParDefaut(c), caracteristiques: [], couleurLibre: '', profil: { front: 'chauve' } });
  });
  verifier('buzz cut : texte exact, la tondeuse du dessus est gardée', exemple, 'Buzz cut. ' + DENSITE + '. Sides: clipper guard 2 (6 mm). Top: clipper guard 2 (6 mm), even all over. Front: no fringe, no bangs, no curtain bangs, forehead uncovered as in the original. Neckline: natural hairline kept');
  const zones = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const d = (id, front, k, reglages) => {
      const c = A.coupeDuCatalogue(id);
      const desc = A.descAnglaise({ coupe: c, reglages: Object.assign(A.reglagesParDefaut(c), reglages || {}), caracteristiques: k || [], couleurLibre: '', profil: { front } });
      const z = {}; desc.split('. ').forEach((m) => { const i = m.indexOf(': '); if (i > 0) z[m.slice(0, i)] = m.slice(i + 2); });
      return z;
    };
    return {
      crop: d('crop-texture', 'golfes-marques'),
      cropNormal: d('crop-texture', 'normale'),
      rideau: d('frange-rideau', 'clairsemes', ['frange-rideau', 'meche-cote']),
      skin: d('skin-fade', 'golfes-marques', [], { dessus: 9 }),
      releve: d('skin-fade', 'golfes-marques', ['dessus-releve']),
      butterfly: d('butterfly-cut', 'clairsemes'),
      carre: d('carre-droit', 'clairsemes')
    };
  });
  const F = 'no fringe, no bangs, no curtain bangs, forehead uncovered as in the original';
  const T = 'kept at the current length, no added volume';
  verifier('crop texturé (frange courte) : Front forcé sans frange', zones.crop.Front, F);
  verifier('…mais gardé sur un profil normal', zones.cropNormal.Front, 'a short straight fringe');
  verifier('frange rideau + caractéristiques frange et mèche : Front forcé', zones.rideau.Front, F);
  verifier('crop texturé : Top, longueur remplacée, style gardé', zones.crop.Top, T + ', textured');
  verifier('skin fade, dessus réglé à 9 cm : remplacé aussi', zones.skin.Top, T + ', textured');
  verifier('« Dessus relevé » (volume) retiré : pas de contradiction', zones.releve.Top, T);
  verifier('butterfly : « voluminous blow-dry » retiré', zones.butterfly.Top, T);
  verifier('carré droit (salon, pas de Top) : Top écrit', zones.carre.Top, T);

  console.log('3. Chauve / rasé : seulement le buzz cut et la barbe');
  await page.goto(ADRESSE);
  await page.click('[data-mode="barber"]');
  await page.click('#action-accueil');
  await page.click('[data-question="front"][data-valeur="chauve"]');
  await page.click('#ecran-client .btn');
  await page.click('#ecran-choix a[href="#catalogue"]');
  const etats = await page.$$eval('#ecran-catalogue [data-coupe]', (c) => c.map((x) => x.getAttribute('data-coupe') + (x.disabled ? ':grisée' : ':active')));
  verifier('conseillées : seulement le buzz cut', (await page.$$eval('#conseillees [data-coupe]', (c) => c.map((x) => x.getAttribute('data-coupe')))).join(), 'buzz-cut');
  verifier('toutes les autres coupes grisées', etats.filter((e) => e.endsWith(':active')).join(), 'buzz-cut:active');
  verifier('11 coupes grisées, chacune avec « Impossible sans cheveux »', await page.$$eval('#grille-coupes .coupe:disabled', (c) => c.length + ' / ' + c.filter((x) => x.querySelector('.legende') && x.querySelector('.legende').textContent === 'Impossible sans cheveux').length), '11 / 11');
  await page.click('#grille-coupes [data-coupe="skin-fade"]', { force: true });
  verifier('toucher une coupe grisée ne l’ouvre pas', await ecran(), 'catalogue');
  await page.click('#conseillees [data-coupe="buzz-cut"]');
  verifier('le buzz cut s’ouvre', await ecran(), 'reglages');
  verifier('la barbe seule reste possible', await page.isEnabled('[data-barbe-seule="oui"]'));
  await page.click('[data-reglage="barbe"][data-valeur="courte"]');
  await page.click('[data-barbe-seule="oui"]');
  verifier('barbe seule sur tête rasée : [COUPE]', await page.evaluate(() => window.CoupeStudio.descAnglaise(window.CoupeStudio.creation())), 'Beard: trimmed short and neat. ' + DENSITE);
  await page.click('[data-barbe-seule="oui"]');
  await page.click('#vers-caracteristiques');
  const cartes = await page.$$eval('#categories [data-caracteristique]', (c) => c.map((x) => (x.disabled ? 'g' : 'a') + ':' + x.getAttribute('data-categorie')));
  verifier('Catalogue personnalisé : seules les 5 caractéristiques de barbe sont actives', cartes.filter((c) => c.startsWith('a')).join(), 'a:barbe,a:barbe,a:barbe,a:barbe,a:barbe');
  verifier('les autres sont grisées avec « Impossible sans cheveux »', await page.$$eval('#categories [data-caracteristique]:disabled .legende:not([hidden])', (l) => l.length), 32);
  await page.click('[data-caracteristique="moustache"]');
  verifier('une caractéristique de barbe se choisit', await page.getAttribute('[data-caracteristique="moustache"]', 'aria-pressed'), 'true');
  /* Une coupe choisie AVANT de répondre « chauve » est gardée (on n'efface jamais un choix). */
  const p2 = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  p2.on('pageerror', (e) => erreurs.push(e.message));
  await p2.goto(ADRESSE);
  await p2.click('#action-accueil');
  await p2.click('#passer-profil');
  await p2.click('#ecran-choix a[href="#catalogue"]');
  await p2.click('#ecran-catalogue [data-coupe="skin-fade"]');
  await p2.goBack();
  await p2.goBack();
  await p2.goBack();
  await p2.click('[data-question="front"][data-valeur="chauve"]');
  verifier('coupe choisie avant de passer en « chauve » : gardée (on n’efface jamais)', await p2.evaluate(() => window.CoupeStudio.etat.coupe.id + ' / ' + window.CoupeStudio.etat.ecran), 'skin-fade / client');
  await p2.close();
  const alertes = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const c = A.coupeDuCatalogue('skin-fade');
    return A.avertissements(c, A.reglagesParDefaut(c), { texture: null, visage: null, front: 'chauve', longueur: null, lunettes: null }).map((a) => a.titre + ' : ' + a.texte).join(' | ');
  });
  verifier('Réglages d’une coupe avec longueur sur tête chauve : avertissement', alertes, 'Impossible sans cheveux : Sur une tête chauve ou rasée, seuls le buzz cut et la barbe seule sont possibles.');

  console.log('4. Décoloration : couleur fantaisie ou fort éclaircissement');
  const deco = await page.evaluate(() => {
    const A = window.CoupeStudio;
    const x = (k, libre) => ({ caracteristiques: k, couleurLibre: libre || '' });
    const r = (couleur, autre) => ({ couleur, couleurAutre: autre || '' });
    return [
      A.decolorationNecessaire(null, x(['platine'])), A.decolorationNecessaire(null, x(['meches-blondes'])), A.decolorationNecessaire(null, x(['pointes-decolorees'])),
      A.decolorationNecessaire(null, x(['couleur-libre'], 'pastel pink')), A.decolorationNecessaire(null, x(['couleur-libre'], 'icy silver')),
      A.decolorationNecessaire(r('autre', 'electric blue'), x([])),
      A.decolorationNecessaire(null, x(['balayage'])), A.decolorationNecessaire(null, x(['reflets-cuivres'])), A.decolorationNecessaire(null, x(['poivre-sel'])),
      A.decolorationNecessaire(null, x(['couleur-libre'], 'dark auburn')), A.decolorationNecessaire(r('balayage'), x([]))
    ].map((v) => (v ? 'oui' : 'non')).join(' ');
  });
  verifier('platine, mèches blondes, pointes décolorées, fantaisie : oui ; balayage, cuivré, poivre et sel, auburn : non', deco, 'oui oui oui oui oui oui non non non non non');
  /* Nouveau client : le profil « chauve » d'avant ne compte plus. */
  await page.goto(ADRESSE);
  await page.click('#ecran-accueil [data-nouveau-client]');
  await page.click('#ecran-accueil [data-confirmer-nouveau]');
  await page.click('#passer-profil');
  await page.click('#ecran-choix a[href="#catalogue"]');
  await page.click('#ecran-catalogue [data-coupe="skin-fade"]');
  await page.click('#vers-caracteristiques');
  await page.click('[data-caracteristique="platine"]');
  verifier('Catalogue personnalisé : message de décoloration', await page.textContent('#contradictions'), 'Sur cheveux foncés : nécessite une décoloration, souvent en plusieurs séances.');
  await page.click('#retour');
  verifier('Réglages : avertissement « Décoloration »', (await page.$$eval('#avertissements .alerte', (a) => a.map((x) => x.textContent))).join(' | '), 'DécolorationSur cheveux foncés : nécessite une décoloration, souvent en plusieurs séances.');

  await navigateur.close();
  verifier('aucune erreur JavaScript', erreurs.join(' | '), '');
  console.log(echecs === 0 ? '\nDENSITÉ : ' + reussites + ' vérifications réussies.' : '\nDENSITÉ : ' + echecs + ' échec(s).');
  process.exit(echecs === 0 ? 0 : 1);
})();
