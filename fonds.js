/* Coupe Studio — fonds.js
   Le Catalogue fond (CLAUDE.md, section 8) : embellir une photo déjà prise,
   sans jamais modifier les cheveux ni la personne. Deux familles :
     « sans-ia » : retouche calculée dans l'appli (retouche.js). Cheveux intacts, garanti.
     « ia »      : un prompt à copier dans Gemini. L'IA régénère l'image : à vérifier.

   POUR AJOUTER UNE RETOUCHE IA : ajoute une ligne dans RETOUCHES_IA.
     id    : nom court sans espace ni accent, unique
     fr    : nom affiché sur la carte
     role  : comment le fragment s'insère à la place de [FOND]
               'meme' : décrit le même fond, modifié   (« the same background, <en> »)
               'neuf' : décrit un nouveau fond          (« <en> »)
               'plus' : une retouche en plus du fond    (« …; also <en> »)
     en    : fragment anglais
     trace : dessin au trait du pictogramme (cadre de 64 × 64)
   Puis reporte la ligne dans le tableau de CLAUDE.md, section 8, pour qu'Antoine la valide.

   Une retouche SANS IA demande aussi du code dans retouche.js : la liste ci-dessous
   fixe seulement son nom, son ordre et son type de réglage. */
(function (racine) {
  'use strict';

  var t = function (d) { return '<path d="' + d + '"/>'; };
  /* Un buste de face, commun aux pictogrammes des retouches IA. */
  var BUSTE = '<circle cx="32" cy="28" r="8"/>' + t('M16 54C16 42 48 42 48 54');

  var RETOUCHES_SANS_IA = [
    { id: 'luminosite', fr: 'Luminosité', famille: 'sans-ia', type: 'curseur', min: -50, max: 50, gauche: 'Plus sombre', droite: 'Plus clair',
      trace: '<circle cx="32" cy="32" r="9"/>' + t('M32 10V16M32 48V54M10 32H16M48 32H54M16 16L20 20M44 44L48 48M48 16L44 20M20 44L16 48') },
    { id: 'contraste', fr: 'Contraste', famille: 'sans-ia', type: 'curseur', min: -50, max: 50, gauche: 'Plus doux', droite: 'Plus marqué',
      trace: '<circle cx="32" cy="32" r="18"/>' + t('M32 14V50M32 22H46M32 32H50M32 42H46') },
    { id: 'chaleur', fr: 'Chaleur', famille: 'sans-ia', type: 'curseur', min: -50, max: 50, gauche: 'Plus froid', droite: 'Plus chaud',
      trace: t('M27 14C27 8 37 8 37 14V34C44 38 44 52 32 52C20 52 20 38 27 34ZM32 28V42') },
    { id: 'nb', fr: 'Noir et blanc', famille: 'sans-ia', type: 'bascule',
      trace: '<rect x="12" y="12" width="40" height="40"/>' + t('M12 52L52 12M22 52L52 22M32 52L52 32M42 52L52 42') },
    { id: 'format', fr: 'Recadrage', famille: 'sans-ia', type: 'format',
      trace: t('M20 8V44H56M8 20H44V56') },
    { id: 'montage', fr: 'Montage avant/après', famille: 'sans-ia', type: 'montage',
      trace: '<rect x="8" y="16" width="22" height="32"/><rect x="34" y="16" width="22" height="32"/>' }
  ];

  /* Formats de recadrage : largeur / hauteur. */
  var FORMATS = [
    { id: 'original', fr: 'Original', ratio: null },
    { id: '4-5', fr: '4:5 post', ratio: 4 / 5 },
    { id: '9-16', fr: '9:16 story', ratio: 9 / 16 },
    { id: '1-1', fr: '1:1', ratio: 1 }
  ];

  var RETOUCHES_IA = [
    { id: 'flou', fr: 'Flouter le fond', famille: 'ia', role: 'meme', en: 'softly blurred with a shallow depth-of-field portrait effect',
      trace: BUSTE + t('M10 14h.01M20 10h.01M12 26h.01M52 12h.01M44 10h.01M54 24h.01M10 38h.01M54 38h.01') },
    { id: 'ranger', fr: 'Ranger le fond', famille: 'ia', role: 'meme', en: 'tidied up, with clutter, objects, cables and products removed',
      trace: BUSTE + '<rect x="8" y="10" width="10" height="10"/>' + t('M46 10L56 20M56 10L46 20') },
    { id: 'personne', fr: 'Retirer une personne derrière', famille: 'ia', role: 'meme', en: 'without the person standing behind',
      trace: BUSTE + '<circle cx="50" cy="16" r="5"/>' + t('M42 8L58 24') },
    { id: 'studio-gris', fr: 'Fond studio gris', famille: 'ia', role: 'neuf', en: 'a plain light grey photo studio backdrop',
      trace: BUSTE + '<rect x="8" y="8" width="48" height="48"/>' + t('M8 16H20M8 24H16M44 16H56M48 24H56') },
    { id: 'studio-blanc', fr: 'Fond studio blanc', famille: 'ia', role: 'neuf', en: 'a plain off-white wall',
      trace: BUSTE + '<rect x="8" y="8" width="48" height="48"/>' },
    { id: 'studio-couleur', fr: 'Fond studio couleur', famille: 'ia', role: 'neuf', en: 'a plain solid [couleur] backdrop', couleurs: true,
      trace: BUSTE + '<rect x="8" y="8" width="48" height="48"/>' + t('M47 13C44 17 43 19 43 21C43 26 51 26 51 21C51 19 50 17 47 13Z') },
    { id: 'lumiere', fr: 'Lumière studio douce', famille: 'ia', role: 'plus', en: 'use soft, even studio lighting',
      trace: BUSTE + t('M8 8H22L26 20H4ZM10 26L12 30M16 26V31M22 26L20 30') },
    { id: 'contre-jour', fr: 'Corriger le contre-jour', famille: 'ia', role: 'plus', en: 'correct the backlight so the person is evenly lit',
      trace: BUSTE + t('M18 22C18 4 46 4 46 22M12 12L8 8M52 12L56 8M32 4V2') },
    { id: 'cheveux-coupes', fr: 'Retirer les cheveux coupés', famille: 'ia', role: 'plus', en: 'remove the loose cut hair clippings from the shoulders and the cape',
      trace: BUSTE + t('M20 46L23 48M27 44L29 47M36 44L34 47M43 46L40 48M24 51L27 52M38 51L41 50') }
  ];

  /* Teintes du « Fond studio couleur ». `teinte` colore la pastille : c'est un contenu, pas une couleur du thème. */
  var COULEURS = [
    { id: 'bleu-gris', fr: 'Bleu gris', en: 'blue-grey', teinte: '#7C93A8' },
    { id: 'beige', fr: 'Beige', en: 'warm beige', teinte: '#B8A28A' },
    { id: 'sauge', fr: 'Vert sauge', en: 'sage green', teinte: '#8FA58F' },
    { id: 'mauve', fr: 'Mauve', en: 'soft mauve', teinte: '#A08FA8' }
  ];

  /* Assemble la valeur de [FOND] à partir des retouches IA choisies (ids) et de la teinte. */
  function combinaison(ids, couleurId) {
    var meme = [];
    var neuf = [];
    var plus = [];
    RETOUCHES_IA.forEach(function (r) {
      if (ids.indexOf(r.id) < 0) return;
      var en = r.en;
      if (r.couleurs) {
        var couleur = COULEURS[0];
        COULEURS.forEach(function (c) { if (c.id === couleurId) couleur = c; });
        en = en.split('[couleur]').join(couleur.en);
      }
      (r.role === 'neuf' ? neuf : (r.role === 'meme' ? meme : plus)).push(en);
    });
    var texte;
    if (neuf.length) texte = neuf.concat(meme).join(', ');
    else texte = 'the same background, ' + (meme.length ? meme.join(', ') : 'unchanged');
    if (plus.length) texte += '; also ' + plus.join(', and ');
    return texte;
  }

  /* Paires contradictoires parmi les retouches IA choisies : deux nouveaux fonds,
     ou un nouveau fond avec une retouche du même fond. Renvoie des paires de noms. */
  function contradictions(ids) {
    var choisies = RETOUCHES_IA.filter(function (r) { return ids.indexOf(r.id) >= 0; });
    var neufs = choisies.filter(function (r) { return r.role === 'neuf'; });
    var memes = choisies.filter(function (r) { return r.role === 'meme'; });
    var paires = [];
    for (var i = 0; i < neufs.length; i++) {
      for (var j = i + 1; j < neufs.length; j++) paires.push([neufs[i].fr, neufs[j].fr]);
    }
    if (neufs.length) memes.forEach(function (m) { paires.push([neufs[0].fr, m.fr]); });
    return paires;
  }

  var FONDS = {
    sansIa: RETOUCHES_SANS_IA,
    formats: FORMATS,
    ia: RETOUCHES_IA,
    couleurs: COULEURS,
    combinaison: combinaison,
    contradictions: contradictions
  };

  racine.FONDS = FONDS;
  if (typeof module !== 'undefined' && module.exports) { module.exports = FONDS; }
})(typeof window !== 'undefined' ? window : globalThis);
