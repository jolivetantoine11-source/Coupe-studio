/* Coupe Studio — retouche.js
   Retouches sans IA : tout est calculé ici, sur un canvas, dans le téléphone.
   La photo n'est jamais envoyée ni stockée. Aucun pixel n'est inventé : on recadre
   et on change la lumière, le contraste et la teinte de l'image entière. Les cheveux
   et la personne restent donc exactement ceux de la photo. */
(function (racine) {
  'use strict';

  var COTE_MAX = 2048; // plus grand côté de l'image enregistrée, en pixels

  /* Zone gardée d'une image de l × h pour un format largeur/hauteur donné (recadrage centré).
     `ratio` nul : image entière. */
  function cadre(l, h, ratio) {
    if (!ratio) return { x: 0, y: 0, l: l, h: h };
    if (l / h > ratio) {
      var largeur = Math.round(h * ratio);
      return { x: Math.round((l - largeur) / 2), y: 0, l: largeur, h: h };
    }
    var hauteur = Math.round(l / ratio);
    return { x: 0, y: Math.round((h - hauteur) / 2), l: l, h: hauteur };
  }

  /* Réduit des dimensions pour que le plus grand côté ne dépasse pas `max`. */
  function reduire(l, h, max) {
    var facteur = Math.min(1, max / Math.max(l, h));
    return { l: Math.max(1, Math.round(l * facteur)), h: Math.max(1, Math.round(h * facteur)) };
  }

  /* Applique noir et blanc, luminosité, contraste et chaleur aux pixels (tableau RGBA).
     Curseurs de -50 à +50, 0 = inchangé. */
  function regler(pixels, r) {
    var nb = r.nb === true;
    var lum = (r.luminosite || 0) * 1.2;
    var c = (r.contraste || 0) * 2;
    var facteur = (259 * (c + 255)) / (255 * (259 - c));
    var chaud = (r.chaleur || 0) * 0.6;
    if (!nb && !lum && !c && !chaud) return pixels;
    for (var i = 0; i < pixels.length; i += 4) {
      var rouge = pixels[i];
      var vert = pixels[i + 1];
      var bleu = pixels[i + 2];
      if (nb) { rouge = vert = bleu = 0.299 * rouge + 0.587 * vert + 0.114 * bleu; }
      rouge = facteur * (rouge + lum - 128) + 128 + chaud;
      vert = facteur * (vert + lum - 128) + 128;
      bleu = facteur * (bleu + lum - 128) + 128 - chaud;
      pixels[i] = rouge;       // un Uint8ClampedArray borne tout seul entre 0 et 255
      pixels[i + 1] = vert;
      pixels[i + 2] = bleu;
    }
    return pixels;
  }

  /* Dessine l'image retouchée dans `canvas`.
     photo  : l'image à retoucher            avant : l'image « avant » du montage (ou null)
     r      : { luminosite, contraste, chaleur, nb, ratio, montage }
     max    : plus grand côté voulu (aperçu : petit ; enregistrement : COTE_MAX) */
  function dessiner(canvas, photo, avant, r, max) {
    var montage = r.montage === true && !!avant;
    var ratio = r.ratio || null;
    var empile = montage && ratio !== null && ratio < 0.7; // en 9:16, l'avant va au-dessus de l'après
    /* Format de chaque moitié du montage : la moitié du format final. */
    var ratioPhoto = ratio;
    if (montage && ratio !== null) ratioPhoto = empile ? ratio * 2 : ratio / 2;

    var zone = cadre(photo.naturalWidth || photo.width, photo.naturalHeight || photo.height, ratioPhoto);
    var total = montage ? (empile ? { l: zone.l, h: zone.h * 2 } : { l: zone.l * 2, h: zone.h }) : { l: zone.l, h: zone.h };
    var taille = reduire(total.l, total.h, max || COTE_MAX);
    var l = montage && !empile ? Math.round(taille.l / 2) : taille.l;
    var h = montage && empile ? Math.round(taille.h / 2) : taille.h;
    canvas.width = montage && !empile ? l * 2 : l;
    canvas.height = montage && empile ? h * 2 : h;

    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (montage) {
      var zoneAvant = cadre(avant.naturalWidth || avant.width, avant.naturalHeight || avant.height, zone.l / zone.h);
      ctx.drawImage(avant, zoneAvant.x, zoneAvant.y, zoneAvant.l, zoneAvant.h, 0, 0, l, h);
      ctx.drawImage(photo, zone.x, zone.y, zone.l, zone.h, empile ? 0 : l, empile ? h : 0, l, h);
    } else {
      ctx.drawImage(photo, zone.x, zone.y, zone.l, zone.h, 0, 0, l, h);
    }
    var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    regler(image.data, r);
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  var RETOUCHE = { COTE_MAX: COTE_MAX, cadre: cadre, reduire: reduire, regler: regler, dessiner: dessiner };

  racine.RETOUCHE = RETOUCHE;
  if (typeof module !== 'undefined' && module.exports) { module.exports = RETOUCHE; }
})(typeof window !== 'undefined' ? window : globalThis);
