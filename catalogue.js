/* Coupe Studio — catalogue.js
   Les 24 coupes (CLAUDE.md, section 5), leurs réglages par défaut et les réglages
   possibles (section 6). Les fonds sont dans fonds.js, les caractéristiques dans caracteristiques.js.

   Réglages par défaut d'une coupe : on ne préremplit que ce que sa description
   anglaise (`desc`) affirme. Un réglage que la coupe ne précise pas reste vide
   (null). Ainsi l'écran ne montre jamais un choix que le prompt ne dit pas. */
(function (racine) {
  'use strict';

  /* ---------- Silhouettes au trait : même tête, même cadrage, seul le tracé des cheveux change ---------- */
  var TETE = '<ellipse cx="32" cy="38" rx="12" ry="15"/><path d="M26 52V58M38 52V58"/>';
  var CHEVEUX = {
    fade: 'M20 36C18 18 46 18 44 36M22 27C28 22 38 22 42 27',
    crop: 'M19 36C17 15 47 15 45 36M21 27H43',
    quiff: 'M19 36C14 14 38 6 48 22C46 28 45 32 45 36',
    slick: 'M19 36C18 17 46 17 45 36M24 22C32 19 38 20 43 26',
    buzz: 'M20 33C20 20 44 20 44 33',
    taper: 'M19 36C18 16 46 16 45 36M26 20C30 24 36 24 40 20',
    crew: 'M20 35V28C20 18 44 18 44 28V35M23 25H41',
    raie: 'M19 36C17 15 47 15 45 36M27 17C27 21 26 24 24 27M27 20C33 21 40 24 44 30',
    boucle: 'M20 36C19 31 20 28 21 25M44 36C45 31 44 28 43 25M21 25C16 21 21 15 25 19C25 12 32 12 32 18C32 12 39 12 39 19C43 15 48 21 43 25',
    ciseaux: 'M18 39C14 13 50 13 46 39M22 29C26 22 36 20 43 27',
    flow: 'M18 47C13 31 15 12 32 12C49 12 51 31 46 47M24 21C30 16 38 17 43 24',
    mulet: 'M19 36C17 15 47 15 45 36M21 27C27 22 37 22 43 27M21 46L17 58M43 46L47 58',
    carre: 'M17 52V30C17 10 47 10 47 30V52M17 52H22M47 52H42',
    carredroit: 'M18 48V30C18 11 46 11 46 30V48M18 48H22M46 48H42M32 12V20',
    carreflou: 'M17 50L18 30C18 10 46 10 46 30L47 50M17 50L20 46M47 50L44 46M27 15C25 21 23 25 21 30',
    carreboucle: 'M21 50C15 48 16 43 19 41C14 38 15 32 19 31C15 26 18 20 22 19C23 12 30 12 32 15C34 12 41 12 42 19C46 20 49 26 45 31C49 32 50 38 45 41C48 43 49 48 43 50',
    pixie: 'M19 36C17 15 47 15 45 36M19 36L22 44M45 36L42 44',
    milong: 'M16 55V30C16 9 48 9 48 30V55M20 34L18 44M44 34L46 44',
    long: 'M15 58V30C15 8 49 8 49 30V58',
    longdroit: 'M15 58V30C15 8 49 8 49 30V58M15 58H21M49 58H43',
    rideau: 'M17 50V30C17 10 47 10 47 30V50M32 14C26 22 24 28 24 32M32 14C38 22 40 28 40 32',
    shag: 'M16 50L18 30C18 10 46 10 46 30L48 50M24 18L22 28M40 18L42 28',
    wolf: 'M15 54L17 30C17 10 47 10 47 30L49 54M22 20C28 28 36 28 42 20',
    butterfly: 'M14 58C12 45 16 38 16 30C16 9 48 9 48 30C48 38 52 45 50 58M32 12C27 20 22 26 19 36M32 12C37 20 42 26 45 36',
    perso: 'M19 36C17 15 47 15 45 36'
  };

  function silhouette(cle) {
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + TETE +
      '<path d="' + (CHEVEUX[cle] || CHEVEUX.perso) + '"/></svg>';
  }

  /* Pictogramme au trait, dans le même cadre que les silhouettes.
     `contenu` : des tracés SVG constants. `avecTete` : dessine aussi la tête. */
  function picto(contenu, avecTete) {
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + (avecTete ? TETE : '') + contenu + '</svg>';
  }

  /* ---------- Réglages d'une coupe ----------
     fr  = libellé du bouton        res = morceau du résumé français
     en  = fragment anglais ajouté à `desc` quand le réglage est modifié */
  var REGLAGES = {
    barber: [
      { id: 'cotes', nom: 'Côtés', type: 'choix', options: [
        { v: 'blanc', fr: 'Dégradé à blanc', res: 'dégradé à blanc', en: 'skin fade on the sides' },
        { v: 'degrade', fr: 'Dégradé', res: 'dégradé', en: 'fade on the sides' },
        { v: 'taper', fr: 'Taper', res: 'taper', en: 'low taper on the sides' },
        { v: 'ciseaux', fr: 'Ciseaux', res: 'côtés aux ciseaux', en: 'sides cut with scissors, no fade' }
      ] },
      { id: 'sabot', nom: 'Sabot du bas', type: 'choix', toujours: true, options: [
        { v: '0', fr: '0', res: 'sabot 0', en: 'starting at clipper guard 0' },
        { v: '0.5', fr: '0,5', res: 'sabot 0,5', en: 'starting at clipper guard 0.5' },
        { v: '1', fr: '1', res: 'sabot 1', en: 'starting at clipper guard 1' },
        { v: '1.5', fr: '1,5', res: 'sabot 1,5', en: 'starting at clipper guard 1.5' },
        { v: '2', fr: '2', res: 'sabot 2', en: 'starting at clipper guard 2' },
        { v: '3', fr: '3', res: 'sabot 3', en: 'starting at clipper guard 3' }
      ] },
      { id: 'dessus', nom: 'Dessus', type: 'curseur', min: 1, max: 15, depart: 5,
        vide: 'longueur gardée', res: 'dessus X cm', en: 'about X cm on top' },
      /* Coiffage par zone (décision d'Antoine du 14 novembre 2026). */
      { id: 'devant', nom: 'Coiffage, devant et frange', type: 'choix', options: [
        { v: 'avant', fr: 'Vers l’avant', res: 'devant vers l’avant', en: 'front styled forward' },
        { v: 'releve', fr: 'Relevé', res: 'devant relevé', en: 'front lifted up' },
        { v: 'cote', fr: 'Sur le côté', res: 'devant sur le côté', en: 'front swept to the side' },
        { v: 'arriere', fr: 'En arrière', res: 'devant en arrière', en: 'front pushed back' }
      ] },
      { id: 'coiffage', nom: 'Coiffage, dessus', type: 'choix', options: [
        { v: 'arriere', fr: 'En arrière', res: 'coiffé en arrière', en: 'top styled back' },
        { v: 'cote', fr: 'Sur le côté', res: 'coiffé sur le côté', en: 'top styled to the side' },
        { v: 'naturel', fr: 'Naturel', res: 'coiffage naturel', en: 'top left natural, unstyled' },
        { v: 'decoiffe', fr: 'Décoiffé', res: 'décoiffé', en: 'messy, textured top' }
      ] },
      { id: 'contours', nom: 'Contours', type: 'choix', options: [
        { v: 'nets', fr: 'Nets', res: 'contours nets', en: 'sharp line-up' },
        { v: 'naturels', fr: 'Naturels', res: 'contours naturels', en: 'natural soft hairline edges' }
      ] },
      { id: 'barbe', nom: 'Barbe', type: 'choix', options: [
        { v: 'inchangee', fr: 'Inchangée', res: '', en: '' },
        { v: 'courte', fr: 'Taillée courte', res: 'barbe taillée courte', en: 'beard trimmed short and neat' },
        { v: 'entretenue', fr: 'Entretenue', res: 'barbe entretenue', en: 'well-groomed beard with clean cheek lines' },
        { v: 'rasee', fr: 'Rasée', res: 'barbe rasée', en: 'clean-shaven' }
      ] }
    ],
    salon: [
      { id: 'longueur', nom: 'Longueur', type: 'longueur', min: 10, max: 60, depart: 35,
        vide: 'longueur gardée', res: 'longueur X, Y cm', en: 'length at the X, about Y cm',
        /* Le curseur et les repères sont liés : chaque repère couvre une plage de centimètres. */
        reperes: [
          { v: 'menton', fr: 'Menton', res: 'au menton', en: 'chin', cm: 22, jusqua: 27 },
          { v: 'epaules', fr: 'Épaules', res: 'aux épaules', en: 'shoulders', cm: 32, jusqua: 39 },
          { v: 'omoplates', fr: 'Omoplates', res: 'aux omoplates', en: 'shoulder blades', cm: 46, jusqua: 52 },
          { v: 'dos', fr: 'Milieu du dos', res: 'au milieu du dos', en: 'mid-back', cm: 56, jusqua: 60 }
        ] },
      { id: 'forme', nom: 'Forme', type: 'choix', options: [
        { v: 'droite', fr: 'Droite', res: 'forme droite', en: 'blunt one-length ends' },
        { v: 'plongeante', fr: 'Plongeante', res: 'forme plongeante', en: 'angled, longer at the front' },
        { v: 'arrondie', fr: 'Arrondie', res: 'forme arrondie', en: 'rounded shape' }
      ] },
      /* « Aucune » et « Sans » n'ajoutent rien quand c'est la valeur de la coupe. Si la coupe
         avait des couches ou une frange et qu'on les retire, il faut le dire au prompt :
         d'où `no layers` et `no fringe` (ajout signalé à Antoine). */
      { id: 'couches', nom: 'Couches', type: 'choix', options: [
        { v: 'aucune', fr: 'Aucune', res: 'sans couches', en: 'no layers' },
        { v: 'legeres', fr: 'Légères', res: 'couches légères', en: 'light layers' },
        { v: 'marquees', fr: 'Marquées', res: 'couches marquées', en: 'strong layers' }
      ] },
      { id: 'frange', nom: 'Frange', type: 'choix', options: [
        { v: 'sans', fr: 'Sans', res: 'sans frange', en: 'no fringe' },
        { v: 'rideau', fr: 'Rideau', res: 'frange rideau', en: 'curtain bangs' },
        { v: 'droite', fr: 'Droite', res: 'frange droite', en: 'straight blunt fringe' },
        { v: 'effilee', fr: 'Effilée', res: 'frange effilée', en: 'wispy fringe' }
      ] },
      { id: 'raie', nom: 'Raie', type: 'choix', options: [
        { v: 'milieu', fr: 'Milieu', res: 'raie au milieu', en: 'middle part' },
        { v: 'cote', fr: 'Côté', res: 'raie sur le côté', en: 'side part' },
        { v: 'naturelle', fr: 'Naturelle', res: 'raie naturelle', en: '' }
      ] },
      { id: 'couleur', nom: 'Couleur', type: 'choix', options: [
        { v: 'inchangee', fr: 'Inchangée', res: '', en: '' },
        { v: 'balayage', fr: 'Balayage', res: 'balayage', en: 'with a soft natural balayage' },
        /* « Autre » : le texte du champ libre est écrit dans le prompt après `hair color changed to`. */
        { v: 'autre', fr: 'Autre', res: 'couleur : X', en: 'hair color changed to X', libre: true }
      ] }
    ]
  };

  /* Valeurs de départ communes à toutes les coupes d'un mode. */
  var BASE = {
    barber: { cotes: null, sabot: null, dessus: null, devant: null, coiffage: null, contours: null, barbe: 'inchangee', barbeSeule: false },
    salon: { longueur: null, forme: null, couches: null, frange: null, raie: 'naturelle', couleur: 'inchangee', couleurAutre: '' }
  };

  /* ---------- Les 24 coupes ----------
     classe : longueur de la coupe quand le curseur est vide (sert aux avertissements).
     lisse  : coupe qui demande des cheveux lisses.  front : coupe qui dégage le front. */
  function coupe(mode, id, fr, ligne, desc, sil, recette, plus) {
    var c = { id: id, mode: mode, fr: fr, ligne: ligne, desc: desc, sil: sil, recette: recette || {} };
    for (var k in plus) { if (Object.prototype.hasOwnProperty.call(plus, k)) c[k] = plus[k]; }
    return c;
  }

  var COUPES = [
    coupe('barber', 'buzz-cut', 'Buzz cut', 'Tondeuse sur toute la tête',
      'even buzz cut with clipper guard 2 (6 mm) all over, natural hairline kept',
      'buzz', { sabot: '2', dessus: 1, contours: 'naturels' }),
    coupe('barber', 'crew-cut', 'Crew cut', 'Court, dessus un peu plus long',
      'crew cut: short tapered sides with guard 2, top 2-3 cm, slightly longer at the front',
      'crew', { cotes: 'taper', sabot: '2', dessus: 3 }),
    coupe('barber', 'crop-texture', 'Crop texturé', 'Frange courte, côtés nets',
      'textured French crop: faded sides, 3-5 cm textured top with a short straight fringe',
      'crop', { cotes: 'degrade', dessus: 4, devant: 'avant' }),
    coupe('barber', 'taper-bas', 'Taper bas', 'Fondu discret sur la nuque',
      'low taper fade at the temples and nape only, top length kept, clean natural neckline',
      'taper', { cotes: 'taper', contours: 'naturels' }),
    coupe('barber', 'skin-fade', 'Skin fade', 'Fondu à blanc, dessus court',
      'mid skin fade from 0 at the bottom to guard 2 at the top of the sides, 4-6 cm textured top',
      'fade', { cotes: 'blanc', sabot: '0', dessus: 5 }),
    coupe('barber', 'raie-cote', 'Raie sur le côté', 'Classique, raie marquée',
      'classic side part: tapered sides with guard 2-3, 5-7 cm top combed to the side with a defined part line',
      'raie', { cotes: 'taper', sabot: '2', dessus: 6, coiffage: 'cote' }),
    coupe('barber', 'quiff', 'Quiff', 'Dessus relevé vers l’avant',
      'quiff: short faded sides, 7-9 cm top styled up and back at the front with volume',
      'quiff', { cotes: 'degrade', dessus: 8, devant: 'releve' }, { front: true }),
    coupe('barber', 'slick-back', 'Slick back', 'Peigné en arrière',
      'slick back: 8-10 cm top combed straight back with a light natural shine, tapered sides',
      'slick', { cotes: 'taper', dessus: 9, devant: 'arriere', coiffage: 'arriere' }, { front: true, lisse: true }),
    coupe('barber', 'degrade-boucle', 'Dégradé bouclé', 'Fondu, boucles sur le dessus',
      'curly top with a mid fade: sides faded from guard 0.5 to 2, natural defined curls on top 4-6 cm',
      'boucle', { cotes: 'degrade', sabot: '0.5', dessus: 5, coiffage: 'naturel' }),
    coupe('barber', 'classique-ciseaux', 'Classique aux ciseaux', 'Sans tondeuse, net',
      'classic scissor cut: short sides and back cut with scissors, no clipper fade, 4-5 cm top, neat natural finish',
      'ciseaux', { cotes: 'ciseaux', dessus: 4 }),
    coupe('barber', 'mi-long-flow', 'Mi-long flow', 'Mi-long, rejeté en arrière',
      'medium length flow: 10-14 cm hair swept back and falling behind the ears, natural movement',
      'flow', { dessus: 12, coiffage: 'arriere' }),
    coupe('barber', 'mulet-moderne', 'Mulet moderne', 'Court devant, long derrière',
      'modern mullet: short faded sides, textured top, longer back reaching the nape',
      'mulet', { cotes: 'degrade' }),

    coupe('salon', 'pixie', 'Pixie', 'Court, dégagé sur la nuque',
      'pixie cut: very short layered cut, short at the nape and sides, slightly longer textured top with a side-swept fringe',
      'pixie', { couches: 'legeres' }, { classe: 'courte' }),
    coupe('salon', 'carre-droit', 'Carré droit', 'Une longueur, au menton',
      'blunt chin-length bob, one length, straight cut ends',
      'carredroit', { longueur: 22, forme: 'droite', couches: 'aucune' }, { lisse: true }),
    coupe('salon', 'carre-plongeant', 'Carré plongeant', 'Plus long devant',
      'angled bob: shorter at the nape, longer at the front reaching the chin',
      'carre', { longueur: 22, forme: 'plongeante' }),
    coupe('salon', 'carre-flou', 'Carré flou', 'Mouvement, pointes effilées',
      'soft textured bob between jaw and collarbone, piecey ends, effortless movement',
      'carreflou', { longueur: 26 }),
    coupe('salon', 'carre-boucle', 'Carré bouclé', 'Arrondi sur boucles',
      'curly bob at chin length, shaped to the natural curls, rounded silhouette',
      'carreboucle', { longueur: 22, forme: 'arrondie' }),
    coupe('salon', 'mi-long-couches', 'Mi-long en couches', 'Aux épaules, encadrant',
      'shoulder-length layered cut with face-framing layers',
      'milong', { longueur: 32, couches: 'legeres' }),
    coupe('salon', 'long-couches', 'Long en couches', 'Longueur gardée, mouvement',
      'long layered cut below the shoulder blades with soft face-framing layers',
      'long', { longueur: 48, couches: 'legeres' }),
    coupe('salon', 'long-droit', 'Long droit', 'Une longueur',
      'long one-length cut below the shoulder blades, straight healthy ends',
      'longdroit', { longueur: 48, forme: 'droite', couches: 'aucune' }, { lisse: true }),
    coupe('salon', 'frange-rideau', 'Frange rideau', 'Ouverte au milieu',
      'curtain bangs parted in the middle, falling at cheekbone level, length kept',
      'rideau', { frange: 'rideau', raie: 'milieu' }),
    coupe('salon', 'shag', 'Shag', 'Couches marquées, volume',
      'shag cut: choppy layers on the crown, wispy fringe, textured ends',
      'shag', { couches: 'marquees', frange: 'effilee' }),
    coupe('salon', 'wolf-cut', 'Wolf cut', 'Couches et longueurs mêlées',
      'wolf cut: heavy layers on top, shaggy texture, longer wispy lengths at the back',
      'wolf', { couches: 'marquees' }),
    coupe('salon', 'butterfly-cut', 'Butterfly cut', 'Long, couches courtes devant',
      'butterfly cut: long length kept with short face-framing layers starting at the chin, voluminous blow-dry',
      'butterfly', { couches: 'legeres' }, { classe: 'longue' })
  ];

  /* Ordre d'affichage : les 6 premières de chaque mode suivent la maquette validée.
     Cet ordre sert aussi de classement « les plus demandées » pour les propositions
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
    silhouette: silhouette,
    picto: picto
  };

  racine.CATALOGUE = CATALOGUE;
  if (typeof module !== 'undefined' && module.exports) { module.exports = CATALOGUE; }
})(typeof window !== 'undefined' ? window : globalThis);
