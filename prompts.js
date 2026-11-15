/* Coupe Studio — prompts.js
   Les prompts validés, copiés MOT POUR MOT depuis PROMPTS.md (et, pour le fond et sa
   règle ajoutée, depuis CLAUDE.md section 8), plus les fonctions qui remplacent [COUPE] et [FOND].

   NE PAS MODIFIER CE TEXTE À LA MAIN. Toute modification se propose d'abord à Antoine,
   se fait dans PROMPTS.md, puis se recopie ici. Le test tests/prompts.test.js compare
   les deux fichiers et doit passer avant toute livraison. */
(function (racine) {
  'use strict';

  var TEXTES = {
    diagnostic: [
      "Tu es un barbier expert. Voici la photo d'un client et la coupe qu'il souhaite : [COUPE].",
      "Avant toute génération d'image, analyse la faisabilité à partir de ce que tu VOIS sur la photo :",
      "- Longueur actuelle de chaque zone (côtés, nuque, dessus) : suffisante, limite ou insuffisante ? Les cheveux poussent d'environ 1 cm par mois.",
      "- Ligne frontale et densité : golfes, zones clairsemées, calvitie.",
      "- Texture : la coupe demande-t-elle un lissage, des boucles ou une texture que le client n'a pas ?",
      "- Couleur : la coupe demande-t-elle une coloration ?",
      "- Ampleur du changement : combien de centimètres seront coupés ?",
      "Donne UN verdict parmi :",
      "✅ FAISABLE MAINTENANT",
      "⏳ FAISABLE APRÈS POUSSE (indique le nombre de mois)",
      "⚠️ FAISABLE AVEC TECHNIQUE (lissage, coloration, coiffage spécifique : précise laquelle)",
      "❌ NON FAISABLE (la densité ou la ligne frontale ne le permettent pas)",
      "Format de réponse, 6 lignes maximum :",
      "VERDICT : …",
      "RAISON : une phrase, factuelle et bienveillante",
      "ALTERNATIVE 1 : nom en français — puis la description en anglais entre guillemets, prête à coller dans le prompt image",
      "ALTERNATIVE 2 : idem (optionnel)",
      "Règles :",
      "- Si le verdict est ✅, n'écris pas d'alternative.",
      "- Si le verdict est ⏳, propose une coupe intermédiaire réalisable maintenant qui va dans la direction souhaitée.",
      "- Les alternatives doivent être réalisables MAINTENANT sur ce client et garder l'esprit de la coupe demandée.",
      "- Si plus de 10 cm sont coupés, signale dans RAISON que le changement est radical et donne le temps de repousse, même si le verdict est ✅."
    ].join('\n'),

    diagnosticSalon: [
      "Tu es un coiffeur expert. Voici la photo d'une cliente ou d'un client et la coupe souhaitée : [COUPE].",
      "Avant toute génération d'image, analyse la faisabilité à partir de ce que tu VOIS sur la photo :",
      "- Longueur actuelle de chaque zone (devant, côtés, nuque, longueurs) : suffisante, limite ou insuffisante ? Les cheveux poussent d'environ 1 cm par mois.",
      "- Ligne frontale et densité : golfes, zones clairsemées, calvitie.",
      "- Texture : la coupe demande-t-elle un lissage, des boucles ou une texture que le client n'a pas ?",
      "- Couleur : la coupe demande-t-elle une coloration ?",
      "- Ampleur du changement : combien de centimètres seront coupés ?",
      "Donne UN verdict parmi :",
      "✅ FAISABLE MAINTENANT",
      "⏳ FAISABLE APRÈS POUSSE (indique le nombre de mois)",
      "⚠️ FAISABLE AVEC TECHNIQUE (lissage, coloration, coiffage spécifique : précise laquelle)",
      "❌ NON FAISABLE (la densité ou la ligne frontale ne le permettent pas)",
      "Format de réponse, 6 lignes maximum :",
      "VERDICT : …",
      "RAISON : une phrase, factuelle et bienveillante",
      "ALTERNATIVE 1 : nom en français — puis la description en anglais entre guillemets, prête à coller dans le prompt image",
      "ALTERNATIVE 2 : idem (optionnel)",
      "Règles :",
      "- Si le verdict est ✅, n'écris pas d'alternative.",
      "- Si le verdict est ⏳, propose une coupe intermédiaire réalisable maintenant qui va dans la direction souhaitée.",
      "- Les alternatives doivent être réalisables MAINTENANT sur cette personne et garder l'esprit de la coupe demandée.",
      "- Si plus de 10 cm sont coupés, signale dans RAISON que le changement est radical et donne le temps de repousse, même si le verdict est ✅."
    ].join('\n'),

    image: [
      "Edit this photo: change ONLY the haircut to: [COUPE].",
      "Strict rules:",
      "- Modify ONLY the hair. Everything else must stay identical: face, expression, skin, beard, eyebrows, glasses, earrings, clothing (including logos and text), background, framing and lighting.",
      "- Keep the face shape exactly as it is: do not slim, reshape, smooth or rejuvenate the face, jaw or skin.",
      "- Keep the head pose and orientation exactly as in the original: do not rotate, tilt or mirror the head.",
      "- Keep the EXACT original hair color, including highlights, grey hair and natural reflections. Do not darken, lighten or recolor, unless the requested haircut explicitly includes a color change.",
      "- Keep the natural hairline and hair density exactly as in the original: receding temples, thinning areas or a high forehead must remain visible. Never add hair where the person has none.",
      "- If the requested length is longer than the current hair, keep the original hairline exactly; never lower it or fill receding areas.",
      "- Respect the natural hair texture (straight, wavy, curly or coily). Keep the same curl pattern and the same level of curl definition. Do not invent curls, straighten the hair, or make curls more defined, looser, smoother or shinier than they naturally are.",
      "- Do not add a fringe, bangs or any element that is not explicitly requested. Keep jewelry identical.",
      "- The new haircut must be clearly visible and different from the original.",
      "- The haircut must be realistic and achievable by a real barber on this type of hair.",
      "- Photorealistic result, like a real photo taken right after leaving the barbershop. No filter, no beauty retouching, keep the original image quality and grain."
    ].join('\n'),

    barbeSeule: [
      "Change ONLY the beard as described, keep the hair on top exactly as it is."
    ].join('\n'),

    exception: [
      "Exception to the rules above: the requested haircut explicitly asks for [CHANGEMENT]. Apply only [CE_CHANGEMENT] as described, and keep every other rule."
    ].join('\n'),

    reference: [
      "Image 1 is the client. Image 2 is a haircut reference.",
      "Apply the haircut from image 2 onto the person in image 1.",
      "Keep the face, skin, beard, glasses, pose, lighting and background of image 1 100% identical. Do not slim or rejuvenate the face.",
      "Keep the client's exact hair color, hairline and density. Never add hair where the client has none.",
      "Adapt the haircut realistically to the client's hair type and texture.",
      "Photorealistic result."
    ].join('\n'),

    ficheBarber: [
      "Tu es un barbier expert. Image 1 = le client avant. Image 2 = la coupe souhaitée (générée par IA).",
      "Rédige une fiche technique en français, 12 lignes maximum, lisible en 20 secondes.",
      "Règles générales :",
      "- Décris uniquement ce que tu VOIS sur l'image 2. Le nom de la coupe et le sens du coiffage (avant, arrière, côté) sortent de l'image, jamais de la demande.",
      "- N'écris une ligne que si elle s'applique à cette photo. Pas de « non concerné » ni de « aucune » (par exemple, pas de ligne BARBE s'il n'y a pas de barbe).",
      "- Ne te contredis jamais.",
      "Coupe et mesures :",
      "- « Dégradé » = fade à la tondeuse, du plus court en bas au plus long en haut. Indique les sabots du bas vers le haut, en ordre croissant. Pour des couches aux ciseaux, écris « coupe en couches », pas « dégradé ».",
      "- Repères sabots : 0,5 = 1,5 mm / 1 = 3 mm / 1,5 = 4,5 mm / 2 = 6 mm / 3 = 9 mm / 4 = 12 mm.",
      "- Si le bas est au sabot 0 ou 0,5, écris « à blanc » ou « quasi à blanc ». S'il n'y a pas de dégradé (côtés aux ciseaux), dis-le.",
      "- Les longueurs sont des estimations : donne des fourchettes (ex. 4-6 cm).",
      "- Ne donne jamais la longueur actuelle en cm : indique seulement si elle est suffisante, limite ou insuffisante.",
      "Faisabilité :",
      "- Compare la longueur de chaque zone (côtés, nuque, dessus) entre l'image 1 et l'image 2. Si une seule zone est plus longue sur l'image 2, une pousse est nécessaire : indique combien de mois (environ 1 cm par mois).",
      "- Analyse la ligne frontale et la densité sur l'image 1 (golfes, zones clairsemées). Si l'image 2 ne les respecte pas, dis-le et propose une alternative réaliste.",
      "- Cheveux bouclés, frisés ou crépus : tiens compte du rétrécissement (shrinkage), indique s'il faut couper sur cheveux étirés ou au naturel, et la longueur réelle à laisser.",
      "- Si le rendu dépend d'une technique de coiffage (vanilles, twists, finger coils, brushing, lissage), écris-le.",
      "- En cas de chaleur (sèche-cheveux, fer), mentionne le protecteur thermique.",
      "- Si la barbe de l'image 1 cache la mâchoire ou le menton, précise que leur forme sur l'image 2 est une estimation de l'IA.",
      "- Si la personne porte des lunettes, adapte le contour des oreilles aux branches et indique de vérifier le contour avec les lunettes remises.",
      "- Si plus de 10 cm sont coupés, signale que le changement est radical et donne le temps de repousse.",
      "- Couleur : signale toute coloration ou décoloration visible sur l'image 1 et si la coupe va en supprimer une partie. Si la couleur de l'image 2 est différente, précise que ce n'est pas un effet de la coupe.",
      "- Si le résultat réel sera différent de l'image 2 (couleur, volume, texture, visage), écris-le dans À VALIDER AVEC LE CLIENT.",
      "Format :",
      "COUPE : nom",
      "CÔTÉS : type + sabots du bas vers le haut",
      "NUQUE / CONTOURS : forme",
      "DESSUS : longueur estimée + technique",
      "BARBE : action (seulement s'il y a une barbe)",
      "COULEUR : constat + effet de la coupe",
      "COIFFAGE : produit + geste",
      "ENTRETIEN : fréquence",
      "⚠️ À VALIDER AVEC LE CLIENT : 3 points maximum, du plus important au moins important"
    ].join('\n'),

    ficheSalon: [
      "Tu es un coiffeur expert. Image 1 = la cliente ou le client avant. Image 2 = la coupe souhaitée (générée par IA).",
      "Rédige une fiche technique en français, 12 lignes maximum, lisible en 20 secondes.",
      "Règles générales :",
      "- Décris uniquement ce que tu VOIS sur l'image 2. Le nom de la coupe et le sens du coiffage (raie, frange, mouvement) sortent de l'image, jamais de la demande.",
      "- N'écris une ligne que si elle s'applique à cette photo. Pas de « non concerné » ni de « aucune ».",
      "- Ne te contredis jamais.",
      "Coupe et mesures :",
      "- Utilise le vocabulaire de salon : couches, effilage, désépaississage, carré (droit, plongeant, flou), frange (droite, rideau, effilée), dégradé = couches aux ciseaux.",
      "- Donne les longueurs en fourchettes de cm avec un repère (ex. 25-30 cm, aux épaules / au menton / aux omoplates).",
      "- Indique des sabots uniquement si une zone est à la tondeuse (nuque, undercut), du plus court au plus long.",
      "- Ne donne jamais la longueur actuelle en cm : indique seulement si elle est suffisante, limite ou insuffisante.",
      "- Précise si la coupe se fait sur cheveux secs ou mouillés.",
      "Faisabilité :",
      "- Compare la longueur de chaque zone (devant, côtés, nuque, longueurs) entre l'image 1 et l'image 2. Si une seule zone est plus longue sur l'image 2, une pousse est nécessaire : indique combien de mois (environ 1 cm par mois).",
      "- Si plus de 10 cm sont coupés, signale que le changement est radical et donne le temps de repousse.",
      "- Analyse la ligne frontale et la densité sur l'image 1 (cheveux fins, zones clairsemées). Si l'image 2 montre plus de volume ou de densité, dis-le et propose une forme adaptée.",
      "- Cheveux bouclés, frisés ou crépus : tiens compte du rétrécissement (shrinkage), indique s'il faut couper sur cheveux étirés ou au naturel, et la longueur réelle à laisser.",
      "- Si le rendu dépend d'une technique (brushing, lissage, boucleur, wavy, vanilles), écris-le.",
      "- En cas de chaleur (sèche-cheveux, fer, lisseur), mentionne le protecteur thermique.",
      "- Vérifie les épis, surtout pour une frange ou un changement de raie.",
      "Couleur :",
      "- Décris la couleur de l'image 1 (naturelle, colorée, mèches, racines, cheveux blancs) et celle de l'image 2.",
      "- Si elles diffèrent, indique la prestation nécessaire (coloration, balayage, mèches, patine, décoloration), si un éclaircissement est nécessaire, et le nombre de séances probable.",
      "- Signale les risques : cheveux déjà colorés, éclaircissement important, cheveux fragilisés. Recommande un test de mèche si besoin.",
      "- Si la coupe supprime des longueurs colorées ou éclaircies, dis-le.",
      "- Si le résultat réel sera différent de l'image 2 (couleur, volume, texture, visage), écris-le dans À VALIDER EN CONSULTATION.",
      "Format :",
      "COUPE : nom",
      "LONGUEURS : longueur estimée + repère + forme (droite, en couches, plongeante)",
      "FRANGE / DEVANT : type (seulement s'il y a une frange ou des mèches devant)",
      "NUQUE : forme (seulement si elle est courte ou dégagée)",
      "TECHNIQUE : ciseaux, effilage, désépaississage, sur cheveux secs ou mouillés",
      "COULEUR : constat + prestation nécessaire",
      "COIFFAGE : produit + geste",
      "ENTRETIEN : fréquence de la coupe et de la couleur",
      "⚠️ À VALIDER EN CONSULTATION : 3 points maximum, du plus important au moins important"
    ].join('\n'),

    fond: [
      "Edit this photo: replace ONLY the background with [FOND].",
      "Keep the person 100% identical: face, haircut, hair color, hair texture, hairline, beard, glasses, clothing, pose and framing.",
      "Do not retouch, smooth or cut the hair edges, and do not change the haircut in any way.",
      "Adapt the light on the person naturally to the new background without changing the skin tone.",
      "Photorealistic result, keep the original image quality and grain."
    ].join('\n'),

    regleRetouche: [
      "The hair and the person must stay pixel-identical: same haircut, same hair edges, same color, same face, same body."
    ].join('\n')
  };

  /* Consignes affichées au-dessus de chaque bloc (elles ne sont pas copiées).
     Reprises de PROMPTS.md, sans la phrase « Remplace [COUPE]… » : l'appli le fait déjà. */
  var CONSIGNES = {
    diagnostic: 'À envoyer en premier, avec le modèle 3.1 Pro et le selfie joint.',
    image: 'À envoyer après le diagnostic, avec le selfie joint. Si le diagnostic propose une alternative, remplace la description de la coupe par la sienne.',
    barbeSeule: 'Barbe seule : la ligne qui garde les cheveux intacts est déjà ajoutée à la fin.',
    reference: 'Joins 2 images : le selfie du client, puis la photo de référence.',
    ficheBarber: 'À envoyer avec le modèle 3.1 Pro, en joignant le selfie d’origine (image 1) puis l’image générée (image 2). Ne nomme pas la coupe dans ta demande : écris juste « image 2 ».',
    ficheSalon: 'À envoyer avec le modèle 3.1 Pro, en joignant le selfie d’origine (image 1) puis l’image générée (image 2). Ne nomme pas la coupe dans ta demande : écris juste « image 2 ».',
    retouche: 'À envoyer avec la photo à retoucher jointe.',
    /* Affiché SOUS le prompt de retouche IA. */
    apresRetouche: 'L’IA régénère l’image : vérifie toujours les cheveux avant de publier. Pour une retouche garantie sans changement, utilise les retouches sans IA.'
  };

  /* Remplace un marqueur sans interpréter le texte inséré (pas de motif `$&`). */
  function remplacer(texte, marqueur, valeur) {
    return texte.split(marqueur).join(String(valeur));
  }

  /* Étape 1 : [COUPE] = nom français + résumé français.
     Mode salon : le diagnostic salon (PROMPTS.md, 1b). */
  function diagnostic(coupeFr, mode) {
    return remplacer(mode === 'salon' ? TEXTES.diagnosticSalon : TEXTES.diagnostic, '[COUPE]', coupeFr);
  }

  /* Étape 2 : [COUPE] = description anglaise. `barbeSeule` ajoute la ligne de la variante à la fin. */
  /* Valeurs de [CHANGEMENT] dans la ligne d'exception (PROMPTS.md, variante exception barbe / texture). */
  var CHANGEMENTS = {
    barbe: ['a beard change', 'that change'],
    texture: ['a texture change', 'that change'],
    'barbe-texture': ['a beard change and a texture change', 'those changes']
  };

  /* `barbeSeule` ajoute la ligne de la variante barbe seule.
     `changement` ('barbe', 'texture', 'barbe-texture' ou rien) ajoute la ligne d'exception. */
  function image(descAnglaise, barbeSeule, changement) {
    var t = remplacer(TEXTES.image, '[COUPE]', descAnglaise);
    if (barbeSeule) return t + '\n' + TEXTES.barbeSeule;
    var c = CHANGEMENTS[changement];
    if (c) t += '\n' + remplacer(remplacer(TEXTES.exception, '[CHANGEMENT]', c[0]), '[CE_CHANGEMENT]', c[1]);
    return t;
  }

  /* Étape 2, variante photo de référence : texte fixe. */
  function reference() {
    return TEXTES.reference;
  }

  /* Étape 3 : fiche barber ou fiche salon. */
  function fiche(mode) {
    return mode === 'salon' ? TEXTES.ficheSalon : TEXTES.ficheBarber;
  }

  /* Catalogue fond, retouches IA : [FOND] = la combinaison choisie, puis la règle
     « pixel-identical » sur une nouvelle ligne (CLAUDE.md, section 8). */
  function retouche(fondAnglais) {
    return remplacer(TEXTES.fond, '[FOND]', fondAnglais) + '\n' + TEXTES.regleRetouche;
  }

  var PROMPTS = {
    textes: TEXTES,
    consignes: CONSIGNES,
    diagnostic: diagnostic,
    image: image,
    reference: reference,
    fiche: fiche,
    retouche: retouche
  };

  racine.PROMPTS = PROMPTS;
  if (typeof module !== 'undefined' && module.exports) { module.exports = PROMPTS; }
})(typeof window !== 'undefined' ? window : globalThis);
