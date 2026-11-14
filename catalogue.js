/* Coupe Studio — catalogue.js
   Les 24 coupes découpées par zone (CLAUDE.md, section 5), leurs réglages par défaut et
   les réglages possibles (section 6). Les fonds sont dans fonds.js, les caractéristiques
   dans caracteristiques.js.

   Réglages par défaut d'une coupe : on ne préremplit que ce que ses zones affirment.
   Un réglage que la coupe ne précise pas reste vide (null). Ainsi l'écran ne montre
   jamais un choix que le prompt ne dit pas. */
(function (racine) {
  'use strict';

  /* Pictogramme au trait (cadre de 64 × 64), utilisé par le Catalogue fond.
     `contenu` : des tracés SVG constants. */
  var TETE = '<ellipse cx="32" cy="38" rx="12" ry="15"/><path d="M26 52V58M38 52V58"/>';
  function picto(contenu, avecTete) {
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + (avecTete ? TETE : '') + contenu + '</svg>';
  }

  /* ---------- Zones d'une coupe ----------
     [COUPE] s'écrit zone par zone, dans cet ordre, en n'écrivant que les zones qui ont une valeur :
     « <nom anglais>. Length: … Layers: … Sides: … Top: … Front: … Neckline: … Texture: … Color: … Beard: … »
     Chaque zone a des emplacements (`parts`). Une coupe, un réglage ou une caractéristique
     écrit dans UN emplacement : la valeur la plus précise remplace les autres, rien ne s'ajoute
     en vrac à la fin. Ordre de priorité dans un emplacement :
       caractéristique choisie  >  réglage modifié  >  texte de la coupe. */
  var ZONES = [
    { id: 'length', en: 'Length', fr: 'Longueur', parts: ['length', 'shape'] },
    { id: 'layers', en: 'Layers', fr: 'Couches', parts: ['layers'] },
    { id: 'sides', en: 'Sides', fr: 'Côtés', parts: ['style', 'guard', 'extra'] },
    { id: 'top', en: 'Top', fr: 'Dessus', parts: ['length', 'style', 'part'] },
    { id: 'front', en: 'Front', fr: 'Devant', parts: ['style', 'extra'] },
    { id: 'nape', en: 'Neckline', fr: 'Nuque et contours', parts: ['shape', 'edges'] },
    { id: 'texture', en: 'Texture', fr: 'Texture', parts: ['texture'] },
    { id: 'color', en: 'Color', fr: 'Couleur', parts: ['color'] },
    { id: 'beard', en: 'Beard', fr: 'Barbe', parts: ['style', 'extra'] }
  ];

  /* ---------- Réglages d'une coupe ----------
     slot  = l'emplacement qu'il remplit (zone.part)
     fr    = libellé du bouton        res = morceau du résumé français
     en    = texte anglais de l'emplacement quand le réglage est modifié ('' = vide l'emplacement)
     accord = « remplacé(s/e/es) », pour la phrase « Côtés remplacés par : … » */
  var REGLAGES = {
    barber: [
      { id: 'cotes', nom: 'Côtés', slot: 'sides.style', accord: 'remplacés', type: 'choix', options: [
        { v: 'blanc', fr: 'Dégradé à blanc', res: 'dégradé à blanc', en: 'skin fade' },
        { v: 'degrade', fr: 'Dégradé', res: 'dégradé', en: 'fade' },
        { v: 'taper', fr: 'Taper', res: 'taper', en: 'low taper' },
        { v: 'ciseaux', fr: 'Ciseaux', res: 'côtés aux ciseaux', en: 'cut with scissors, no clipper fade' }
      ] },
      { id: 'sabot', nom: 'Sabot du bas', slot: 'sides.guard', accord: 'remplacé', type: 'choix', toujours: true, options: [
        { v: '0', fr: '0', res: 'sabot 0', en: 'starting at clipper guard 0 at the bottom' },
        { v: '0.5', fr: '0,5', res: 'sabot 0,5', en: 'starting at clipper guard 0.5 at the bottom' },
        { v: '1', fr: '1', res: 'sabot 1', en: 'starting at clipper guard 1 at the bottom' },
        { v: '1.5', fr: '1,5', res: 'sabot 1,5', en: 'starting at clipper guard 1.5 at the bottom' },
        { v: '2', fr: '2', res: 'sabot 2', en: 'starting at clipper guard 2 at the bottom' },
        { v: '3', fr: '3', res: 'sabot 3', en: 'starting at clipper guard 3 at the bottom' }
      ] },
      { id: 'dessus', nom: 'Dessus', slot: 'top.length', accord: 'remplacé', type: 'curseur', min: 1, max: 15, depart: 5,
        vide: 'longueur gardée', res: 'dessus X cm', en: 'about X cm' },
      /* Coiffage par zone (décision d'Antoine du 14 novembre 2026). */
      { id: 'devant', nom: 'Coiffage, devant et frange', slot: 'front.style', accord: 'remplacé', type: 'choix', options: [
        { v: 'avant', fr: 'Vers l’avant', res: 'devant vers l’avant', en: 'styled forward' },
        { v: 'releve', fr: 'Relevé', res: 'devant relevé', en: 'lifted up' },
        { v: 'cote', fr: 'Sur le côté', res: 'devant sur le côté', en: 'swept to the side' },
        { v: 'arriere', fr: 'En arrière', res: 'devant en arrière', en: 'pushed back' }
      ] },
      { id: 'coiffage', nom: 'Coiffage, dessus', slot: 'top.style', accord: 'remplacé', type: 'choix', options: [
        { v: 'arriere', fr: 'En arrière', res: 'coiffé en arrière', en: 'styled back' },
        { v: 'cote', fr: 'Sur le côté', res: 'coiffé sur le côté', en: 'styled to the side' },
        { v: 'naturel', fr: 'Naturel', res: 'coiffage naturel', en: 'natural, unstyled' },
        { v: 'decoiffe', fr: 'Décoiffé', res: 'décoiffé', en: 'messy and textured' }
      ] },
      { id: 'contours', nom: 'Contours', slot: 'nape.edges', accord: 'remplacés', type: 'choix', options: [
        { v: 'nets', fr: 'Nets', res: 'contours nets', en: 'sharp line-up' },
        { v: 'naturels', fr: 'Naturels', res: 'contours naturels', en: 'natural soft hairline edges' }
      ] },
      /* « Barbe seule » est un choix à part dans ce groupe : voir app.js, barbeSeule(). */
      { id: 'barbe', nom: 'Barbe', slot: 'beard.style', accord: 'remplacée', type: 'choix', options: [
        { v: 'inchangee', fr: 'Inchangée', res: '', en: '' },
        { v: 'courte', fr: 'Taillée courte', res: 'barbe taillée courte', en: 'trimmed short and neat' },
        { v: 'entretenue', fr: 'Entretenue', res: 'barbe entretenue', en: 'well-groomed with clean cheek lines' },
        { v: 'rasee', fr: 'Rasée', res: 'barbe rasée', en: 'clean-shaven' }
      ] }
    ],
    salon: [
      { id: 'longueur', nom: 'Longueur', slot: 'length.length', accord: 'remplacée', type: 'longueur', min: 10, max: 60, depart: 35,
        vide: 'longueur gardée', res: 'longueur X, Y cm', en: 'X length, about Y cm',
        /* Le curseur et les repères sont liés : chaque repère couvre une plage de centimètres. */
        reperes: [
          { v: 'menton', fr: 'Menton', res: 'au menton', en: 'chin', cm: 22, jusqua: 27 },
          { v: 'epaules', fr: 'Épaules', res: 'aux épaules', en: 'shoulder', cm: 32, jusqua: 39 },
          { v: 'omoplates', fr: 'Omoplates', res: 'aux omoplates', en: 'shoulder-blade', cm: 46, jusqua: 52 },
          { v: 'dos', fr: 'Milieu du dos', res: 'au milieu du dos', en: 'mid-back', cm: 56, jusqua: 60 }
        ] },
      { id: 'forme', nom: 'Forme', slot: 'length.shape', accord: 'remplacée', type: 'choix', options: [
        { v: 'droite', fr: 'Droite', res: 'forme droite', en: 'blunt one-length ends' },
        { v: 'plongeante', fr: 'Plongeante', res: 'forme plongeante', en: 'angled, longer at the front' },
        { v: 'arrondie', fr: 'Arrondie', res: 'forme arrondie', en: 'rounded shape' }
      ] },
      { id: 'couches', nom: 'Couches', slot: 'layers.layers', accord: 'remplacées', type: 'choix', options: [
        { v: 'aucune', fr: 'Aucune', res: 'sans couches', en: 'no layers' },
        { v: 'legeres', fr: 'Légères', res: 'couches légères', en: 'light layers' },
        { v: 'marquees', fr: 'Marquées', res: 'couches marquées', en: 'strong layers' }
      ] },
      { id: 'frange', nom: 'Frange', slot: 'front.style', accord: 'remplacée', type: 'choix', options: [
        { v: 'sans', fr: 'Sans', res: 'sans frange', en: 'no fringe' },
        { v: 'rideau', fr: 'Rideau', res: 'frange rideau', en: 'curtain bangs' },
        { v: 'droite', fr: 'Droite', res: 'frange droite', en: 'straight blunt fringe' },
        { v: 'effilee', fr: 'Effilée', res: 'frange effilée', en: 'wispy fringe' }
      ] },
      { id: 'raie', nom: 'Raie', slot: 'top.part', accord: 'remplacée', type: 'choix', options: [
        { v: 'milieu', fr: 'Milieu', res: 'raie au milieu', en: 'middle part' },
        { v: 'cote', fr: 'Côté', res: 'raie sur le côté', en: 'side part' },
        { v: 'naturelle', fr: 'Naturelle', res: 'raie naturelle', en: '' }
      ] },
      { id: 'couleur', nom: 'Couleur', slot: 'color.color', accord: 'remplacée', type: 'choix', options: [
        { v: 'inchangee', fr: 'Inchangée', res: '', en: '' },
        { v: 'balayage', fr: 'Balayage', res: 'balayage', en: 'change to a soft natural balayage' },
        /* « Autre » : le texte du champ libre est écrit à la place de X. */
        { v: 'autre', fr: 'Autre', res: 'couleur : X', en: 'change to X', libre: true }
      ] }
    ]
  };

  /* Valeurs de départ communes à toutes les coupes d'un mode. */
  var BASE = {
    barber: { cotes: null, sabot: null, dessus: null, devant: null, coiffage: null, contours: null, barbe: 'inchangee', barbeSeule: false },
    salon: { longueur: null, forme: null, couches: null, frange: null, raie: 'naturelle', couleur: 'inchangee', couleurAutre: '' }
  };

  /* ---------- Les 24 coupes ----------
     fr     : nom affiché          ligne : une ligne de description affichée
     en     : nom anglais, en tête de [COUPE]
     zones  : texte anglais de la coupe, emplacement par emplacement (CLAUDE.md, section 5)
     reglages : valeurs de départ des réglages, cohérentes avec les zones
     classe : longueur de la coupe quand le curseur est vide (sert aux avertissements)
     lisse  : coupe qui demande des cheveux lisses      front : coupe qui dégage le front */
  function coupe(mode, id, fr, ligne, en, zones, reglages, plus) {
    var c = { id: id, mode: mode, fr: fr, ligne: ligne, en: en, zones: zones, recette: reglages || {} };
    for (var k in plus) { if (Object.prototype.hasOwnProperty.call(plus, k)) c[k] = plus[k]; }
    return c;
  }

  var COUPES = [
    coupe('barber', 'buzz-cut', 'Buzz cut', 'Tondeuse sur toute la tête', 'Buzz cut',
      { 'sides.guard': 'clipper guard 2 (6 mm)', 'top.length': 'clipper guard 2 (6 mm), even all over', 'nape.edges': 'natural hairline kept' },
      { sabot: '2', dessus: 1, contours: 'naturels' }),
    coupe('barber', 'crew-cut', 'Crew cut', 'Court, dessus un peu plus long', 'Crew cut',
      { 'sides.style': 'short and tapered', 'sides.guard': 'clipper guard 2', 'top.length': '2-3 cm', 'front.style': 'slightly longer than the rest of the top' },
      { cotes: 'taper', sabot: '2', dessus: 3 }),
    coupe('barber', 'crop-texture', 'Crop texturé', 'Frange courte, côtés nets', 'Textured French crop',
      { 'sides.style': 'faded', 'top.length': '3-5 cm', 'top.style': 'textured', 'front.style': 'a short straight fringe' },
      { cotes: 'degrade', dessus: 4, devant: 'avant' }),
    coupe('barber', 'taper-bas', 'Taper bas', 'Fondu discret sur la nuque', 'Low taper fade',
      { 'sides.style': 'low taper fade at the temples and nape only', 'top.length': 'length kept', 'nape.edges': 'clean natural neckline' },
      { cotes: 'taper', contours: 'naturels' }),
    coupe('barber', 'skin-fade', 'Skin fade', 'Fondu à blanc, dessus court', 'Skin fade',
      { 'sides.style': 'mid skin fade', 'sides.guard': 'from guard 0 at the bottom to guard 2 at the top', 'top.length': '4-6 cm', 'top.style': 'textured' },
      { cotes: 'blanc', sabot: '0', dessus: 5 }),
    coupe('barber', 'raie-cote', 'Raie sur le côté', 'Classique, raie marquée', 'Classic side part',
      { 'sides.style': 'tapered', 'sides.guard': 'clipper guard 2-3', 'top.length': '5-7 cm', 'top.style': 'combed to the side', 'top.part': 'a defined part line' },
      { cotes: 'taper', sabot: '2', dessus: 6, coiffage: 'cote' }),
    coupe('barber', 'quiff', 'Quiff', 'Dessus relevé vers l’avant', 'Quiff',
      { 'sides.style': 'short and faded', 'top.length': '7-9 cm', 'front.style': 'styled up and back with volume' },
      { cotes: 'degrade', dessus: 8, devant: 'releve' }, { front: true }),
    coupe('barber', 'slick-back', 'Slick back', 'Peigné en arrière', 'Slick back',
      { 'sides.style': 'tapered', 'top.length': '8-10 cm', 'top.style': 'combed straight back with a light natural shine', 'front.style': 'combed back' },
      { cotes: 'taper', dessus: 9, devant: 'arriere', coiffage: 'arriere' }, { front: true, lisse: true }),
    coupe('barber', 'degrade-boucle', 'Dégradé bouclé', 'Fondu, boucles sur le dessus', 'Curly top with a mid fade',
      { 'sides.style': 'mid fade', 'sides.guard': 'from guard 0.5 at the bottom to guard 2 at the top', 'top.length': '4-6 cm', 'top.style': 'natural, unstyled', 'texture.texture': 'natural defined curls on top' },
      { cotes: 'degrade', sabot: '0.5', dessus: 5, coiffage: 'naturel' }),
    coupe('barber', 'classique-ciseaux', 'Classique aux ciseaux', 'Sans tondeuse, net', 'Classic scissor cut',
      { 'sides.style': 'short sides and back cut with scissors, no clipper fade', 'top.length': '4-5 cm', 'top.style': 'neat natural finish' },
      { cotes: 'ciseaux', dessus: 4 }),
    coupe('barber', 'mi-long-flow', 'Mi-long flow', 'Mi-long, rejeté en arrière', 'Medium length flow',
      { 'sides.style': 'falling behind the ears', 'top.length': '10-14 cm', 'top.style': 'swept back with natural movement' },
      { dessus: 12, coiffage: 'arriere' }),
    coupe('barber', 'mulet-moderne', 'Mulet moderne', 'Court devant, long derrière', 'Modern mullet',
      { 'sides.style': 'short and faded', 'top.style': 'textured', 'nape.shape': 'longer back reaching the nape' },
      { cotes: 'degrade' }),

    coupe('salon', 'pixie', 'Pixie', 'Court, dégagé sur la nuque', 'Pixie cut',
      { 'layers.layers': 'very short layers', 'sides.style': 'short', 'top.style': 'slightly longer and textured', 'front.style': 'a side-swept fringe', 'nape.shape': 'short' },
      { couches: 'legeres' }, { classe: 'courte' }),
    coupe('salon', 'carre-droit', 'Carré droit', 'Une longueur, au menton', 'Blunt bob',
      { 'length.length': 'chin length', 'length.shape': 'one length, straight cut ends' },
      { longueur: 22, forme: 'droite', couches: 'aucune' }, { lisse: true }),
    coupe('salon', 'carre-plongeant', 'Carré plongeant', 'Plus long devant', 'Angled bob',
      { 'length.length': 'reaching the chin at the front', 'length.shape': 'shorter at the nape, longer at the front' },
      { longueur: 22, forme: 'plongeante' }),
    coupe('salon', 'carre-flou', 'Carré flou', 'Mouvement, pointes effilées', 'Soft textured bob',
      { 'length.length': 'between the jaw and the collarbone', 'length.shape': 'piecey ends, effortless movement' },
      { longueur: 26 }),
    coupe('salon', 'carre-boucle', 'Carré bouclé', 'Arrondi sur boucles', 'Curly bob',
      { 'length.length': 'chin length', 'length.shape': 'rounded silhouette shaped to the natural curls', 'texture.texture': 'natural curls' },
      { longueur: 22, forme: 'arrondie' }),
    coupe('salon', 'mi-long-couches', 'Mi-long en couches', 'Aux épaules, encadrant', 'Shoulder-length layered cut',
      { 'length.length': 'shoulder length', 'layers.layers': 'face-framing layers' },
      { longueur: 32, couches: 'legeres' }),
    coupe('salon', 'long-couches', 'Long en couches', 'Longueur gardée, mouvement', 'Long layered cut',
      { 'length.length': 'below the shoulder blades', 'layers.layers': 'soft face-framing layers' },
      { longueur: 48, couches: 'legeres' }),
    coupe('salon', 'long-droit', 'Long droit', 'Une longueur', 'Long one-length cut',
      { 'length.length': 'below the shoulder blades', 'length.shape': 'one length, straight healthy ends' },
      { longueur: 48, forme: 'droite', couches: 'aucune' }, { lisse: true }),
    coupe('salon', 'frange-rideau', 'Frange rideau', 'Ouverte au milieu', 'Curtain bangs',
      { 'length.length': 'length kept', 'top.part': 'middle part', 'front.style': 'curtain bangs falling at cheekbone level' },
      { frange: 'rideau', raie: 'milieu' }),
    coupe('salon', 'shag', 'Shag', 'Couches marquées, volume', 'Shag cut',
      { 'length.shape': 'textured ends', 'layers.layers': 'choppy layers on the crown', 'front.style': 'a wispy fringe' },
      { couches: 'marquees', frange: 'effilee' }),
    coupe('salon', 'wolf-cut', 'Wolf cut', 'Couches et longueurs mêlées', 'Wolf cut',
      { 'length.shape': 'longer wispy lengths at the back', 'layers.layers': 'heavy layers on top, shaggy texture' },
      { couches: 'marquees' }),
    coupe('salon', 'butterfly-cut', 'Butterfly cut', 'Long, couches courtes devant', 'Butterfly cut',
      { 'length.length': 'long length kept', 'layers.layers': 'short face-framing layers starting at the chin', 'top.style': 'voluminous blow-dry' },
      { couches: 'legeres' }, { classe: 'longue' })
  ];

  /* Ordre d'affichage : les 6 premières de chaque mode suivent la maquette validée.
     Cet ordre sert aussi de classement « les plus demandées » pour les coupes conseillées
     (hypothèse à confirmer par Antoine). */
  var ORDRE = {
    barber: ['skin-fade', 'crop-texture', 'taper-bas', 'quiff', 'slick-back', 'buzz-cut',
      'crew-cut', 'raie-cote', 'degrade-boucle', 'classique-ciseaux', 'mi-long-flow', 'mulet-moderne'],
    salon: ['carre-plongeant', 'pixie', 'shag', 'wolf-cut', 'frange-rideau', 'long-couches',
      'carre-droit', 'carre-flou', 'carre-boucle', 'mi-long-couches', 'long-droit', 'butterfly-cut'],
    /* Thème neutre : 6 barber et 6 salon mêlées. */
    neutre: ['skin-fade', 'carre-plongeant', 'crop-texture', 'shag', 'quiff', 'pixie',
      'taper-bas', 'wolf-cut', 'slick-back', 'frange-rideau', 'buzz-cut', 'long-couches']
  };

  var CATALOGUE = {
    coupes: COUPES,
    ordre: ORDRE,
    reglages: REGLAGES,
    base: BASE,
    zones: ZONES,
    picto: picto
  };

  racine.CATALOGUE = CATALOGUE;
  if (typeof module !== 'undefined' && module.exports) { module.exports = CATALOGUE; }
})(typeof window !== 'undefined' ? window : globalThis);
