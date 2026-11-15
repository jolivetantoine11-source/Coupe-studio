/* Coupe Studio — caracteristiques.js
   Le Catalogue personnalisé : un magazine de caractéristiques (CLAUDE.md, section 13).

   POUR AJOUTER UNE CARACTÉRISTIQUE : ajoute une ligne dans la bonne catégorie.
     id     : nom court sans espace ni accent, unique
     fr     : nom affiché sur la carte
     res    : (facultatif) texte du résumé français, si le nom seul prête à confusion
     slot   : l'emplacement de [COUPE] qu'elle remplit (zone.part, voir ZONES dans catalogue.js).
              Elle REMPLACE ce que la coupe et les réglages mettaient dans cet emplacement.
     efface : (facultatif) d'autres emplacements qu'elle vide (ex. le sabot quand on rase un côté)
     exclutReglage : (facultatif) { réglage: [valeurs] } qu'elle remplace aussi (ex. moustache
              remplace la barbe « Rasée » des réglages)
     eclaircit : (facultatif) couleur qui demande un fort éclaircissement (avertissement décoloration)
     en     : texte anglais écrit dans l'emplacement. Une couleur doit écrire le changement
              (« change to … »), sinon le prompt image garde la couleur d'origine.
   Puis, si elle contredit d'autres caractéristiques, ajoute-la à un GROUPE (tout en bas).
   Enfin, mets à jour le tableau de CLAUDE.md, section 13, pour qu'Antoine le valide. */
(function (racine) {
  'use strict';

  var COTES = { slot: 'sides.style', efface: ['sides.guard'] };

  function c(id, fr, en, place, plus) {
    var x = { id: id, fr: fr, en: en, slot: place.slot };
    if (place.efface) x.efface = place.efface;
    for (var k in plus) { if (Object.prototype.hasOwnProperty.call(plus, k)) x[k] = plus[k]; }
    return x;
  }

  var CATEGORIES = [
    { id: 'cotes', nom: 'Côtés', liste: [
      c('rase-cote', 'Rasé sur un côté', 'one side shaved very short, the other side kept longer', COTES),
      c('undercut', 'Undercut', 'undercut, clipped short and disconnected from a longer top', COTES),
      c('degrade-blanc', 'Dégradé à blanc', 'skin fade', COTES),
      c('tempes', 'Tempes dégagées', 'clean tapered temples', { slot: 'sides.extra' }),
      c('trait-rase', 'Trait rasé (motif)', 'a thin shaved line design on one side', { slot: 'sides.extra' })
    ] },
    { id: 'devant', nom: 'Devant et dessus', liste: [
      c('meche-cote', 'Mèche sur le côté', 'a side-swept lock', { slot: 'front.style' }),
      c('meche-longue', 'Mèche longue devant', 'a long strand falling over the forehead', { slot: 'front.style' }),
      c('frange-courte', 'Frange courte droite', 'a short straight fringe', { slot: 'front.style' }),
      c('frange-rideau', 'Frange rideau', 'curtain bangs parted in the middle', { slot: 'front.style' }),
      c('dessus-releve', 'Dessus relevé', 'lifted up with volume', { slot: 'top.style' }),
      c('dessus-decoiffe', 'Dessus décoiffé', 'messy and textured', { slot: 'top.style' }),
      c('raie-marquee', 'Raie marquée', 'a defined hard part line', { slot: 'top.part' }),
      c('couches', 'Couches', 'visible layers', { slot: 'layers.layers' })
    ] },
    { id: 'couleur', nom: 'Couleur', liste: [
      c('meches-blondes', 'Mèches blondes', 'change to blonde highlights', { slot: 'color.color' }, { eclaircit: true }),
      c('balayage', 'Balayage', 'change to a soft natural balayage', { slot: 'color.color' }),
      c('pointes-decolorees', 'Pointes décolorées', 'change to bleached tips', { slot: 'color.color' }, { eclaircit: true }),
      c('platine', 'Platine', 'change to full platinum blonde', { slot: 'color.color' }, { eclaircit: true }),
      c('reflets-cuivres', 'Reflets cuivrés', 'change to copper tones', { slot: 'color.color' }),
      c('poivre-sel', 'Poivre et sel gardé', 'natural salt-and-pepper grey kept, no coloring', { slot: 'color.color' }),
      c('couleur-libre', 'Couleur libre', 'change to X', { slot: 'color.color' }, { res: 'couleur', libre: true })
    ] },
    { id: 'texture', nom: 'Texture', liste: [
      c('boucles', 'Boucles définies', 'defined curls', { slot: 'texture.texture' }),
      c('ondulations', 'Ondulations', 'soft waves', { slot: 'texture.texture' }),
      c('permanente', 'Permanente', 'permed curls', { slot: 'texture.texture' }),
      c('lisse', 'Lissé', 'straightened and sleek', { slot: 'texture.texture' }),
      c('twists', 'Twists', 'short twists', { slot: 'texture.texture' }),
      c('vanilles', 'Vanilles', 'two-strand twists', { slot: 'texture.texture' }),
      c('keratine', 'Kératine', 'keratin-smoothed, sleek and frizz-free', { slot: 'texture.texture' }),
      c('defrisage', 'Défrisage', 'chemically relaxed and straightened', { slot: 'texture.texture' })
    ] },
    { id: 'barbe', nom: 'Barbe', liste: [
      c('barbe-courte', 'Taillée courte', 'trimmed short and neat', { slot: 'beard.style' }, { res: 'barbe taillée courte' }),
      c('barbe-degradee', 'Dégradé dans la barbe', 'faded into the sideburns', { slot: 'beard.style' }),
      c('barbe-rasee', 'Rasée', 'clean-shaven', { slot: 'beard.style' }, { res: 'barbe rasée' }),
      c('moustache', 'Moustache', 'a neat moustache', { slot: 'beard.extra' }, { exclutReglage: { barbe: ['rasee'] } }),
      c('bouc', 'Bouc', 'a goatee', { slot: 'beard.extra' }, { exclutReglage: { barbe: ['rasee'] } })
    ] },
    { id: 'nuque', nom: 'Nuque et contours', liste: [
      c('nuque-degagee', 'Nuque dégagée', 'clean tapered nape', { slot: 'nape.shape' }),
      c('nuque-arrondie', 'Nuque arrondie', 'rounded', { slot: 'nape.shape' }),
      c('nuque-carree', 'Nuque carrée', 'squared', { slot: 'nape.shape' }),
      c('contours-nets', 'Contours nets', 'sharp line-up', { slot: 'nape.edges' })
    ] }
  ];

  /* Groupes exclusifs (décision d'Antoine du 15 novembre 2026) : une seule caractéristique
     par groupe. En choisir une deuxième ouvre un message « Garder X » / « Garder Y ». */
  var GROUPES = [
    { id: 'cotes', nom: 'côtés', ids: ['rase-cote', 'undercut', 'degrade-blanc'] },
    { id: 'frange', nom: 'frange', ids: ['frange-courte', 'frange-rideau', 'meche-longue'] },
    { id: 'couleur', nom: 'couleur', ids: ['platine', 'meches-blondes', 'balayage', 'pointes-decolorees', 'reflets-cuivres', 'poivre-sel', 'couleur-libre'] },
    { id: 'texture', nom: 'texture', ids: ['lisse', 'boucles', 'ondulations', 'permanente', 'twists', 'vanilles', 'keratine', 'defrisage'] },
    { id: 'barbe', nom: 'barbe', ids: ['barbe-rasee', 'barbe-courte', 'barbe-degradee'] },
    { id: 'nuque', nom: 'nuque', ids: ['nuque-degagee', 'nuque-arrondie', 'nuque-carree'] }
  ];

  /* Paires exclusives hors groupe : moustache et bouc vont ensemble, pas avec une barbe rasée. */
  var EXCLUSIONS = [
    { nom: 'barbe', ids: ['barbe-rasee', 'moustache'] },
    { nom: 'barbe', ids: ['barbe-rasee', 'bouc'] }
  ];

  /* Le nom du groupe qui oppose deux caractéristiques, ou null si elles sont compatibles. */
  function conflit(a, b) {
    if (a === b) return null;
    for (var i = 0; i < GROUPES.length; i++) {
      if (GROUPES[i].ids.indexOf(a) >= 0 && GROUPES[i].ids.indexOf(b) >= 0) return GROUPES[i].nom;
    }
    for (var j = 0; j < EXCLUSIONS.length; j++) {
      if (EXCLUSIONS[j].ids.indexOf(a) >= 0 && EXCLUSIONS[j].ids.indexOf(b) >= 0) return EXCLUSIONS[j].nom;
    }
    return null;
  }

  var CARACTERISTIQUES = { categories: CATEGORIES, groupes: GROUPES, exclusions: EXCLUSIONS, conflit: conflit };

  racine.CARACTERISTIQUES = CARACTERISTIQUES;
  if (typeof module !== 'undefined' && module.exports) { module.exports = CARACTERISTIQUES; }
})(typeof window !== 'undefined' ? window : globalThis);
