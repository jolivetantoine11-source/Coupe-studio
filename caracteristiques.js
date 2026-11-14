/* Coupe Studio — caracteristiques.js
   Le Catalogue personnalisé : un magazine de caractéristiques (CLAUDE.md, section 13).

   POUR AJOUTER UNE CARACTÉRISTIQUE : ajoute une ligne dans la bonne catégorie.
     id    : nom court sans espace ni accent, unique
     fr    : nom affiché sur la carte
     res   : (facultatif) texte du résumé français, si le nom seul prête à confusion
     en    : fragment anglais ajouté à [COUPE]. Une couleur doit écrire le changement
             (« hair color change: … »), sinon le prompt image garde la couleur d'origine.
     trace : dessin au trait du pictogramme (tracés SVG dans un cadre de 64 × 64)
     tete  : true pour dessiner la tête sous le tracé
   Puis reporte la ligne dans le tableau de CLAUDE.md, section 13, pour qu'Antoine la valide.

   POUR SIGNALER UNE CONTRADICTION : ajoute une ligne à `contradictions` (tout en bas). */
(function (racine) {
  'use strict';

  var t = function (d) { return '<path d="' + d + '"/>'; };
  var CALOTTE = 'M19 36C17 15 47 15 45 36';            // cheveux courts, de face
  var MECHE = 'M24 8C18 24 20 42 31 58C39 44 45 28 40 8Z'; // une mèche de cheveux (catégorie Couleur)

  var CATEGORIES = [
    { id: 'cotes', nom: 'Côtés', liste: [
      { id: 'rase-cote', fr: 'Rasé sur un côté', en: 'one side of the head shaved very short, the other side kept longer',
        tete: true, trace: t('M20 30C22 14 48 12 46 36V46M22 34L24 32M22 39L25 36M23 28L26 25') },
      { id: 'undercut', fr: 'Undercut', en: 'undercut: sides and back clipped short, disconnected from a longer top',
        tete: true, trace: t('M19 28C18 10 46 10 45 28H19M21 33V37M43 33V37') },
      { id: 'degrade-blanc', fr: 'Dégradé à blanc', en: 'skin fade on the sides',
        tete: true, trace: t('M20 36C18 18 46 18 44 36M22 27C28 22 38 22 42 27') },
      { id: 'tempes', fr: 'Tempes dégagées', en: 'clean tapered temples',
        tete: true, trace: t(CALOTTE + 'M19 31H25M45 31H39') },
      { id: 'trait-rase', fr: 'Trait rasé (motif)', en: 'a thin shaved line design on one side',
        tete: true, trace: t(CALOTTE + 'M20 33L29 25') }
    ] },
    { id: 'devant', nom: 'Devant et dessus', liste: [
      { id: 'meche-cote', fr: 'Mèche sur le côté', en: 'a side-swept lock at the front',
        tete: true, trace: t(CALOTTE + 'M41 18C34 20 27 24 22 32') },
      { id: 'meche-longue', fr: 'Mèche longue devant', en: 'a long strand falling over the forehead',
        tete: true, trace: t(CALOTTE + 'M31 16C28 24 27 32 28 41') },
      { id: 'frange-courte', fr: 'Frange courte droite', en: 'a short straight fringe',
        tete: true, trace: t(CALOTTE + 'M21 27H43') },
      { id: 'frange-rideau', fr: 'Frange rideau', en: 'curtain bangs parted in the middle',
        tete: true, trace: t(CALOTTE + 'M32 16C27 22 24 27 22 33M32 16C37 22 40 27 42 33') },
      { id: 'dessus-releve', fr: 'Dessus relevé', en: 'top lifted up with volume',
        tete: true, trace: t('M19 36C14 14 38 6 48 22C46 28 45 32 45 36') },
      { id: 'dessus-decoiffe', fr: 'Dessus décoiffé', en: 'messy, textured top',
        tete: true, trace: t('M19 36C18 30 19 26 21 23L19 16L25 20L27 12L31 18L35 11L37 19L43 14L42 22C44 26 45 30 45 36') },
      { id: 'raie-marquee', fr: 'Raie marquée', en: 'a defined hard part line',
        tete: true, trace: t(CALOTTE + 'M28 16L25 28') },
      { id: 'couches', fr: 'Couches', en: 'visible layers',
        tete: true, trace: t('M16 55V30C16 9 48 9 48 30V55M20 34L18 44M44 34L46 44') }
    ] },
    { id: 'couleur', nom: 'Couleur', liste: [
      { id: 'meches-blondes', fr: 'Mèches blondes', en: 'hair color change: blonde highlights',
        trace: t(MECHE + 'M28 14C26 26 27 38 31 48M35 13C36 24 35 34 33 42') },
      { id: 'balayage', fr: 'Balayage', en: 'hair color change: soft natural balayage',
        trace: t(MECHE + 'M22 34C27 30 35 36 41 31M28 42L29 48M34 40L33 46') },
      { id: 'pointes-decolorees', fr: 'Pointes décolorées', en: 'hair color change: bleached tips',
        trace: t(MECHE + 'M25 45H36') },
      { id: 'platine', fr: 'Platine', en: 'hair color change: full platinum blonde',
        trace: t(MECHE + 'M50 12V22M45 17H55M12 40V46M9 43H15') },
      { id: 'reflets-cuivres', fr: 'Reflets cuivrés', en: 'hair color change: copper tones',
        trace: t(MECHE + 'M30 16C28 26 29 34 32 42') + '<circle cx="50" cy="18" r="4"/>' },
      { id: 'poivre-sel', fr: 'Poivre et sel gardé', en: 'natural salt-and-pepper grey kept, no coloring',
        trace: t(MECHE + 'M28 18h.01M35 22h.01M27 28h.01M34 32h.01M30 38h.01M36 14h.01M31 46h.01') },
      { id: 'couleur-libre', fr: 'Couleur libre', res: 'couleur', en: 'hair color change: X', libre: true,
        trace: t(MECHE + 'M50 12V24M44 18H56') }
    ] },
    { id: 'texture', nom: 'Texture', liste: [
      { id: 'boucles', fr: 'Boucles définies', en: 'defined curls',
        tete: true, trace: t('M20 36C19 31 20 28 21 25M44 36C45 31 44 28 43 25M21 25C16 21 21 15 25 19C25 12 32 12 32 18C32 12 39 12 39 19C43 15 48 21 43 25') },
      { id: 'ondulations', fr: 'Ondulations', en: 'soft waves',
        tete: true, trace: t('M17 52C13 46 20 42 17 36C15 30 16 10 32 10C48 10 49 30 47 36C44 42 51 46 47 52') },
      { id: 'permanente', fr: 'Permanente', en: 'permed curls',
        tete: true, trace: t('M21 50C15 48 16 43 19 41C14 38 15 32 19 31C15 26 18 20 22 19C23 12 30 12 32 15C34 12 41 12 42 19C46 20 49 26 45 31C49 32 50 38 45 41C48 43 49 48 43 50') },
      { id: 'lisse', fr: 'Lissé', en: 'straightened, sleek hair',
        tete: true, trace: t('M15 58V30C15 8 49 8 49 30V58M15 58H21M49 58H43') },
      { id: 'twists', fr: 'Twists', en: 'short twists',
        tete: true, trace: t('M20 35C20 31 20 28 21 26M44 35C44 31 44 28 43 26M21 25L23 18L25 24M27 22L29 13L31 21M33 21L35 13L37 22M39 24L41 18L43 25') },
      { id: 'vanilles', fr: 'Vanilles', en: 'two-strand twists',
        tete: true, trace: t('M19 30C18 13 46 13 45 30M19 30C16 34 22 37 19 41C16 45 22 48 19 52M45 30C48 34 42 37 45 41C48 45 42 48 45 52M26 15V21M32 13V20M38 15V21') }
    ] },
    { id: 'barbe', nom: 'Barbe', liste: [
      { id: 'barbe-courte', fr: 'Taillée courte', res: 'barbe taillée courte', en: 'beard trimmed short and neat',
        tete: true, trace: t('M20 33C20 20 44 20 44 33M20 42C22 58 42 58 44 42') },
      { id: 'barbe-degradee', fr: 'Dégradé dans la barbe', en: 'beard faded into the sideburns',
        tete: true, trace: t('M20 33C20 20 44 20 44 33M21 46C24 58 40 58 43 46M19 36V39M45 36V39') },
      { id: 'moustache', fr: 'Moustache', en: 'a neat moustache',
        tete: true, trace: t('M20 33C20 20 44 20 44 33M26 46C28 43 31 43 32 45C33 43 36 43 38 46') },
      { id: 'bouc', fr: 'Bouc', en: 'a goatee',
        tete: true, trace: t('M20 33C20 20 44 20 44 33M28 45H36M29 48C29 56 35 56 35 48') },
      { id: 'barbe-rasee', fr: 'Rasée', res: 'barbe rasée', en: 'clean-shaven',
        tete: true, trace: t('M20 33C20 20 44 20 44 33M50 40L56 46M53 36L59 42M48 44L44 48') }
    ] },
    { id: 'nuque', nom: 'Nuque et contours', liste: [
      { id: 'nuque-degagee', fr: 'Nuque dégagée', en: 'clean tapered nape',
        tete: true, trace: t(CALOTTE + 'M21 44L25 50M43 44L39 50') },
      { id: 'nuque-arrondie', fr: 'Nuque arrondie', en: 'rounded neckline',
        tete: true, trace: t('M19 38C17 15 47 15 45 38C45 50 38 55 32 55C26 55 19 50 19 38') },
      { id: 'nuque-carree', fr: 'Nuque carrée', en: 'squared neckline',
        tete: true, trace: t('M19 38C17 15 47 15 45 38V52H19V38') },
      { id: 'contours-nets', fr: 'Contours nets', en: 'sharp line-up',
        tete: true, trace: t('M20 36V26H44V36M20 26C22 15 42 15 44 26') }
    ] }
  ];

  /* Combinaisons contradictoires : [une caractéristique, [celles qui la contredisent]].
     L'appli affiche un message, sans bloquer. */
  var CONTRADICTIONS = [
    ['nuque-arrondie', ['nuque-carree']],
    ['barbe-rasee', ['barbe-courte', 'barbe-degradee', 'moustache', 'bouc']],
    ['lisse', ['boucles', 'ondulations', 'permanente', 'twists', 'vanilles']],
    ['twists', ['vanilles']],
    ['platine', ['meches-blondes', 'balayage', 'pointes-decolorees', 'reflets-cuivres']],
    ['poivre-sel', ['meches-blondes', 'balayage', 'pointes-decolorees', 'platine', 'reflets-cuivres', 'couleur-libre']],
    ['frange-courte', ['frange-rideau', 'meche-longue', 'dessus-releve']],
    ['raie-marquee', ['dessus-decoiffe']],
    ['undercut', ['degrade-blanc']]
  ];

  var CARACTERISTIQUES = { categories: CATEGORIES, contradictions: CONTRADICTIONS };

  racine.CARACTERISTIQUES = CARACTERISTIQUES;
  if (typeof module !== 'undefined' && module.exports) { module.exports = CARACTERISTIQUES; }
})(typeof window !== 'undefined' ? window : globalThis);
