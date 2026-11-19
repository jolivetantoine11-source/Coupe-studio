# PROMPTS.md — les prompts de référence (texte exact)

Source : les fichiers Word validés après les tests. Chaque bloc de code ci-dessous (8 blocs) doit se retrouver MOT POUR MOT dans `prompts.js` (vérifier par un test de comparaison). Seul le marqueur `[COUPE]` est remplacé par l'appli.
La ligne « Consigne » de chaque section s'affiche dans l'appli au-dessus du bloc, elle ne fait pas partie du texte copié.

---

## 1. Diagnostic (texte, Gemini 3.1 Pro)

Consigne : À envoyer en premier, avec le modèle 3.1 Pro et le selfie joint. Remplace [COUPE] par la coupe demandée.

```text
Tu es un barbier expert. Voici la photo d'un client et la coupe qu'il souhaite : [COUPE].
Avant toute génération d'image, analyse la faisabilité à partir de ce que tu VOIS sur la photo :
- Longueur actuelle de chaque zone (côtés, nuque, dessus) : suffisante, limite ou insuffisante ? Les cheveux poussent d'environ 1 cm par mois.
- Ligne frontale et densité : golfes, zones clairsemées, calvitie.
- Texture : la coupe demande-t-elle un lissage, des boucles ou une texture que le client n'a pas ?
- Couleur : la coupe demande-t-elle une coloration ?
- Ampleur du changement : combien de centimètres seront coupés ?
Donne UN verdict parmi :
✅ FAISABLE MAINTENANT
⏳ FAISABLE APRÈS POUSSE (indique le nombre de mois)
⚠️ FAISABLE AVEC TECHNIQUE (lissage, coloration, coiffage spécifique : précise laquelle)
❌ NON FAISABLE (la densité ou la ligne frontale ne le permettent pas)
Format de réponse, 6 lignes maximum :
VERDICT : …
RAISON : une phrase, factuelle et bienveillante
ALTERNATIVE 1 : nom en français — puis la description en anglais entre guillemets, prête à coller dans le prompt image
ALTERNATIVE 2 : idem (optionnel)
Règles :
- Si le verdict est ✅, n'écris pas d'alternative.
- Si le verdict est ⏳, propose une coupe intermédiaire réalisable maintenant qui va dans la direction souhaitée.
- Les alternatives doivent être réalisables MAINTENANT sur ce client et garder l'esprit de la coupe demandée.
- Si plus de 10 cm sont coupés, signale dans RAISON que le changement est radical et donne le temps de repousse, même si le verdict est ✅.
```

---

## 1b. Diagnostic salon (texte, Gemini 3.1 Pro)

Validé par Antoine le 15 novembre 2026. C'est le diagnostic de la section 1 avec seulement 4 remplacements :
« Tu es un barbier expert. » → « Tu es un coiffeur expert. » ; « Voici la photo d'un client et la coupe qu'il souhaite » → « Voici la photo d'une cliente ou d'un client et la coupe souhaitée » ; « (côtés, nuque, dessus) » → « (devant, côtés, nuque, longueurs) » ; « sur ce client » → « sur cette personne ». Le reste est identique mot pour mot. Utilisé quand la coupe est en mode salon.

Consigne : À envoyer en premier, avec le modèle 3.1 Pro et le selfie joint. Remplace [COUPE] par la coupe demandée.

```text
Tu es un coiffeur expert. Voici la photo d'une cliente ou d'un client et la coupe souhaitée : [COUPE].
Avant toute génération d'image, analyse la faisabilité à partir de ce que tu VOIS sur la photo :
- Longueur actuelle de chaque zone (devant, côtés, nuque, longueurs) : suffisante, limite ou insuffisante ? Les cheveux poussent d'environ 1 cm par mois.
- Ligne frontale et densité : golfes, zones clairsemées, calvitie.
- Texture : la coupe demande-t-elle un lissage, des boucles ou une texture que le client n'a pas ?
- Couleur : la coupe demande-t-elle une coloration ?
- Ampleur du changement : combien de centimètres seront coupés ?
Donne UN verdict parmi :
✅ FAISABLE MAINTENANT
⏳ FAISABLE APRÈS POUSSE (indique le nombre de mois)
⚠️ FAISABLE AVEC TECHNIQUE (lissage, coloration, coiffage spécifique : précise laquelle)
❌ NON FAISABLE (la densité ou la ligne frontale ne le permettent pas)
Format de réponse, 6 lignes maximum :
VERDICT : …
RAISON : une phrase, factuelle et bienveillante
ALTERNATIVE 1 : nom en français — puis la description en anglais entre guillemets, prête à coller dans le prompt image
ALTERNATIVE 2 : idem (optionnel)
Règles :
- Si le verdict est ✅, n'écris pas d'alternative.
- Si le verdict est ⏳, propose une coupe intermédiaire réalisable maintenant qui va dans la direction souhaitée.
- Les alternatives doivent être réalisables MAINTENANT sur cette personne et garder l'esprit de la coupe demandée.
- Si plus de 10 cm sont coupés, signale dans RAISON que le changement est radical et donne le temps de repousse, même si le verdict est ✅.
```

---

## 2. Création d'image (+ variantes barbe seule et photo de référence)

Mise à jour du 15 novembre 2026 (demande d'Antoine) : 3 règles ajoutées à « Strict rules » : position de la tête, rien d'ajouté sans demande (frange, bijoux), ligne frontale gardée quand la longueur demandée dépasse la longueur actuelle.

Consigne : À envoyer après le diagnostic, avec le selfie joint. Remplace [COUPE] par la coupe validée ou par l'alternative proposée.

```text
Edit this photo: change ONLY the haircut to: [COUPE].
Strict rules:
- Modify ONLY the hair. Everything else must stay identical: face, expression, skin, beard, eyebrows, glasses, earrings, clothing (including logos and text), background, framing and lighting.
- Keep the face shape exactly as it is: do not slim, reshape, smooth or rejuvenate the face, jaw or skin.
- Keep the head pose and orientation exactly as in the original: do not rotate, tilt or mirror the head.
- Keep the EXACT original hair color, including highlights, grey hair and natural reflections. Do not darken, lighten or recolor, unless the requested haircut explicitly includes a color change.
- Keep the natural hairline and hair density exactly as in the original: receding temples, thinning areas or a high forehead must remain visible. Never add hair where the person has none.
- If the requested length is longer than the current hair, keep the original hairline exactly; never lower it or fill receding areas.
- Respect the natural hair texture (straight, wavy, curly or coily). Keep the same curl pattern and the same level of curl definition. Do not invent curls, straighten the hair, or make curls more defined, looser, smoother or shinier than they naturally are.
- Do not add a fringe, bangs or any element that is not explicitly requested. Keep jewelry identical.
- The new haircut must be clearly visible and different from the original.
- The haircut must be realistic and achievable by a real barber on this type of hair.
- Photorealistic result, like a real photo taken right after leaving the barbershop. No filter, no beauty retouching, keep the original image quality and grain.
```

### Variante barbe seule

Consigne : Ajoute cette ligne à la fin du prompt :

Ligne ajoutée à la fin du prompt image :

```text
Change ONLY the beard as described, keep the hair on top exactly as it is.
```

### Variante exception barbe

Ajoutée le 16 novembre 2026 à la demande d'Antoine. Placée juste avant « Strict rules: » (sur sa propre ligne) quand l'utilisateur a choisi un changement dans la zone Beard (hors barbe seule). [CHANGEMENT] vaut « a beard change », [CE_CHANGEMENT] « that change ». Seul un choix de l'utilisateur (réglage ou caractéristique) déclenche cette ligne. Sinon le prompt image est inchangé.

Depuis la série contrôle (16 novembre) : « the rules below » au lieu de « above », et la texture n'est plus dans le prompt image : elle a son étape (2a).

Ligne ajoutée avant « Strict rules: » :

```text
Exception to the rules below: the requested haircut explicitly asks for [CHANGEMENT]. Apply only [CE_CHANGEMENT] as described, and keep every other rule.
```

### Variante photo de référence

Consigne : Joins 2 images : le selfie du client, puis la photo de référence.

```text
Image 1 is the client. Image 2 is a haircut reference.
Apply the haircut from image 2 onto the person in image 1.
Keep the face, skin, beard, glasses, pose, lighting and background of image 1 100% identical. Do not slim or rejuvenate the face.
Keep the client's exact hair color, hairline and density. Never add hair where the client has none.
Adapt the haircut realistically to the client's hair type and texture.
Photorealistic result.
```

---

## 2a. Texture (sur l'image générée)

Ajoutée le 16 novembre 2026 à la demande d'Antoine (série contrôle) : un changement de texture choisi par l'utilisateur (lissé, kératine, permanente, défrisage, boucles…) se fait dans une étape à part, comme la couleur. L'étape Image ne contient alors ni la zone Texture ni de ligne d'exception texture. Ordre : Image → Texture → Couleur. [TEXTURE] = le texte anglais de la texture choisie. Le texte par défaut d'une coupe (dégradé bouclé, carré bouclé) reste dans le prompt image.

Consigne : À envoyer après l'étape Image, en joignant l'image générée.

```text
Edit this photo: keep the haircut, length and shape exactly as they are. Texture: [TEXTURE].
Strict rules:
- Change ONLY the hair texture. Everything else must stay identical: face, expression, skin, beard, eyebrows, glasses, earrings, clothing (including logos and text), background, framing and lighting.
- Keep the haircut identical: same length, shape, volume, parting, hairline and hair edges.
- Keep the head pose and orientation exactly as in the original: do not rotate, tilt or mirror the head.
- Keep the EXACT original hair color: do not lighten or darken it.
- Photorealistic result, keep the original image quality and grain.
```

---

## 2b. Couleur (sur l'image générée)

Ajoutée le 15 novembre 2026 à la demande d'Antoine : une coupe avec un changement de couleur se fait en 2 étapes. L'étape Image ne décrit que la coupe (sans la zone Color) ; cette étape applique ensuite la couleur sur l'image générée. [COULEUR] = la couleur choisie (réglage ou caractéristique), sans « change to » (ex. « blonde highlights »). « Poivre et sel gardé » n'est pas un changement : pas d'étape Couleur.

La première phrase est celle d'Antoine. **Les « Strict rules » ont été rédigées par Claude : à valider par Antoine.**

Consigne : À envoyer après l'étape précédente (Image, ou Texture s'il y en a une), en joignant la dernière image générée.

```text
Edit this photo: keep the haircut, length and shape exactly as they are. Color: [COULEUR], subtle and natural.
Strict rules:
- Change ONLY the hair color. Everything else must stay identical: face, expression, skin, beard, eyebrows, glasses, earrings, clothing (including logos and text), background, framing and lighting.
- Keep the haircut identical: same length, shape, volume, parting, hairline and hair edges.
- Keep the head pose and orientation exactly as in the original: do not rotate, tilt or mirror the head.
- Respect the natural hair texture and curl pattern: do not straighten the hair or add curls.
- The new color must look realistic on this hair, with natural depth, roots and shine. No flat or painted look.
- Photorealistic result, keep the original image quality and grain.
```

---

## 3a. Fiche technique barber

Consigne : À envoyer avec le modèle 3.1 Pro, en joignant le selfie d'origine (image 1) puis l'image générée (image 2). Ne nomme pas la coupe dans ta demande : écris juste « image 2 ».

```text
Tu es un barbier expert. Image 1 = le client avant. Image 2 = la coupe souhaitée (générée par IA).
Rédige une fiche technique en français, 12 lignes maximum, lisible en 20 secondes.
Règles générales :
- Décris uniquement ce que tu VOIS sur l'image 2. Le nom de la coupe et le sens du coiffage (avant, arrière, côté) sortent de l'image, jamais de la demande.
- N'écris une ligne que si elle s'applique à cette photo. Pas de « non concerné » ni de « aucune » (par exemple, pas de ligne BARBE s'il n'y a pas de barbe).
- Ne te contredis jamais.
Coupe et mesures :
- « Dégradé » = fade à la tondeuse, du plus court en bas au plus long en haut. Indique les sabots du bas vers le haut, en ordre croissant. Pour des couches aux ciseaux, écris « coupe en couches », pas « dégradé ».
- Repères sabots : 0,5 = 1,5 mm / 1 = 3 mm / 1,5 = 4,5 mm / 2 = 6 mm / 3 = 9 mm / 4 = 12 mm.
- Si le bas est au sabot 0 ou 0,5, écris « à blanc » ou « quasi à blanc ». S'il n'y a pas de dégradé (côtés aux ciseaux), dis-le.
- Les longueurs sont des estimations : donne des fourchettes (ex. 4-6 cm).
- Ne donne jamais la longueur actuelle en cm : indique seulement si elle est suffisante, limite ou insuffisante.
Faisabilité :
- Compare la longueur de chaque zone (côtés, nuque, dessus) entre l'image 1 et l'image 2. Si une seule zone est plus longue sur l'image 2, une pousse est nécessaire : indique combien de mois (environ 1 cm par mois).
- Analyse la ligne frontale et la densité sur l'image 1 (golfes, zones clairsemées). Si l'image 2 ne les respecte pas, dis-le et propose une alternative réaliste.
- Cheveux bouclés, frisés ou crépus : tiens compte du rétrécissement (shrinkage), indique s'il faut couper sur cheveux étirés ou au naturel, et la longueur réelle à laisser.
- Si le rendu dépend d'une technique de coiffage (vanilles, twists, finger coils, brushing, lissage), écris-le.
- En cas de chaleur (sèche-cheveux, fer), mentionne le protecteur thermique.
- Si la barbe de l'image 1 cache la mâchoire ou le menton, précise que leur forme sur l'image 2 est une estimation de l'IA.
- Si la personne porte des lunettes, adapte le contour des oreilles aux branches et indique de vérifier le contour avec les lunettes remises.
- Si plus de 10 cm sont coupés, signale que le changement est radical et donne le temps de repousse.
- Couleur : signale toute coloration ou décoloration visible sur l'image 1 et si la coupe va en supprimer une partie. Si la couleur de l'image 2 est différente, précise que ce n'est pas un effet de la coupe.
- Si le résultat réel sera différent de l'image 2 (couleur, volume, texture, visage), écris-le dans À VALIDER AVEC LE CLIENT.
Format :
COUPE : nom
CÔTÉS : type + sabots du bas vers le haut
NUQUE / CONTOURS : forme
DESSUS : longueur estimée + technique
BARBE : action (seulement s'il y a une barbe)
COULEUR : constat + effet de la coupe
COIFFAGE : produit + geste
ENTRETIEN : fréquence
⚠️ À VALIDER AVEC LE CLIENT : 3 points maximum, du plus important au moins important
```

---

## 3b. Fiche technique salon

Consigne : Version salon de coiffure de la fiche barber. À envoyer avec le modèle 3.1 Pro, en joignant le selfie d'origine (image 1) puis l'image générée (image 2). Ne nomme pas la coupe dans ta demande : écris juste « image 2 ».

```text
Tu es un coiffeur expert. Image 1 = la cliente ou le client avant. Image 2 = la coupe souhaitée (générée par IA).
Rédige une fiche technique en français, 12 lignes maximum, lisible en 20 secondes.
Règles générales :
- Décris uniquement ce que tu VOIS sur l'image 2. Le nom de la coupe et le sens du coiffage (raie, frange, mouvement) sortent de l'image, jamais de la demande.
- N'écris une ligne que si elle s'applique à cette photo. Pas de « non concerné » ni de « aucune ».
- Ne te contredis jamais.
Coupe et mesures :
- Utilise le vocabulaire de salon : couches, effilage, désépaississage, carré (droit, plongeant, flou), frange (droite, rideau, effilée), dégradé = couches aux ciseaux.
- Donne les longueurs en fourchettes de cm avec un repère (ex. 25-30 cm, aux épaules / au menton / aux omoplates).
- Indique des sabots uniquement si une zone est à la tondeuse (nuque, undercut), du plus court au plus long.
- Ne donne jamais la longueur actuelle en cm : indique seulement si elle est suffisante, limite ou insuffisante.
- Précise si la coupe se fait sur cheveux secs ou mouillés.
Faisabilité :
- Compare la longueur de chaque zone (devant, côtés, nuque, longueurs) entre l'image 1 et l'image 2. Si une seule zone est plus longue sur l'image 2, une pousse est nécessaire : indique combien de mois (environ 1 cm par mois).
- Si plus de 10 cm sont coupés, signale que le changement est radical et donne le temps de repousse.
- Analyse la ligne frontale et la densité sur l'image 1 (cheveux fins, zones clairsemées). Si l'image 2 montre plus de volume ou de densité, dis-le et propose une forme adaptée.
- Cheveux bouclés, frisés ou crépus : tiens compte du rétrécissement (shrinkage), indique s'il faut couper sur cheveux étirés ou au naturel, et la longueur réelle à laisser.
- Si le rendu dépend d'une technique (brushing, lissage, boucleur, wavy, vanilles), écris-le.
- En cas de chaleur (sèche-cheveux, fer, lisseur), mentionne le protecteur thermique.
- Vérifie les épis, surtout pour une frange ou un changement de raie.
Couleur :
- Décris la couleur de l'image 1 (naturelle, colorée, mèches, racines, cheveux blancs) et celle de l'image 2.
- Si elles diffèrent, indique la prestation nécessaire (coloration, balayage, mèches, patine, décoloration), si un éclaircissement est nécessaire, et le nombre de séances probable.
- Signale les risques : cheveux déjà colorés, éclaircissement important, cheveux fragilisés. Recommande un test de mèche si besoin.
- Si la coupe supprime des longueurs colorées ou éclaircies, dis-le.
- Si le résultat réel sera différent de l'image 2 (couleur, volume, texture, visage), écris-le dans À VALIDER EN CONSULTATION.
Format :
COUPE : nom
LONGUEURS : longueur estimée + repère + forme (droite, en couches, plongeante)
FRANGE / DEVANT : type (seulement s'il y a une frange ou des mèches devant)
NUQUE : forme (seulement si elle est courte ou dégagée)
TECHNIQUE : ciseaux, effilage, désépaississage, sur cheveux secs ou mouillés
COULEUR : constat + prestation nécessaire
COIFFAGE : produit + geste
ENTRETIEN : fréquence de la coupe et de la couleur
⚠️ À VALIDER EN CONSULTATION : 3 points maximum, du plus important au moins important
```

---

## 0. Pré-diagnostic (photo du client, avant les questions)

Ajouté le 19 novembre 2026 à la demande d'Antoine (parcours « Diagnostic d'abord », étape 1). Envoyé par l'appli au Worker (`/texte`, réponse JSON demandée), avec la photo du client, quand le Worker est réglé, le code saisi et l'accord coché. Jamais en V1 ni après « Passer ».

La réponse remplit le profil du client (`etat.profil`) : `visage` (`long` devient `allonge`, la valeur de l'appli), `texture`, `front` (`fins` seulement en mode salon), `longueur`, `lunettes`, `peau`, `yeux`, `style`, `remarque`. Une valeur absente, `null` ou inconnue laisse le champ tel qu'il était.

**[RÉFÉRENTIEL]** : emplacement réservé au référentiel de diagnostic de l'associé d'Antoine. Vide pour l'instant : tant qu'il est vide, sa ligne est retirée du prompt. Il sera ajouté ici, dans son propre bloc, puis recopié dans `prompts.js` (`TEXTES.referentiel`).

Placé à la fin de ce fichier pour ne pas décaler la numérotation des autres blocs.

```text
You are an expert hairdresser. Analyze the attached photo of a client and describe only what you SEE.
Ignore the background and other people. If hair is hidden (cap, hood, scarf), use null for texture, front and longueur.
[RÉFÉRENTIEL]
Reply with a single JSON object and nothing else, with exactly these keys:
- "visage": face shape, one of "ovale", "rond", "carre", "long", "coeur"
- "texture": hair texture, one of "lisses", "ondules", "boucles", "crepus"
- "front": hairline and density, one of "normale", "golfes-legers", "golfes-marques", "clairsemes", "chauve", "fins"
- "longueur": current hair length, one of "courte", "moyenne", "longue"
- "lunettes": glasses worn on the photo, "oui" or "non"
- "peau": skin tone, one of "claire", "mate", "foncee"
- "yeux": eye color, "clairs" or "fonces"
- "style": one short sentence in French describing the person's overall look (clothing, accessories, attitude)
- "remarque": one short sentence in French for the hairdresser: what matters most when choosing a haircut for this person
If a value cannot be seen on the photo, use null. Do not guess age, origin or anything not listed.
```

---

## 0b. Propositions (après les questions)

Ajouté le 19 novembre 2026 à la demande d'Antoine (parcours « Diagnostic d'abord », étape 3). Envoyé par l'appli au Worker (`/texte`, réponse JSON et recherche web demandées) quand le Worker est réglé et le code saisi ; la photo du client est jointe seulement si l'accord est coché. Sans Worker, ou en cas d'erreur : les propositions locales de l'appli (règles de la section 7 de CLAUDE.md).

Repères remplis par l'appli :
- [MODE] : `barbershop` (barber), `hair salon` (salon), `hair salon or barbershop` (thème neutre).
- [PROFIL] : le profil en anglais (face, hair texture, hairline and density, current length, glasses, skin, eyes), puis le style et la remarque du pré-diagnostic en français ; `not specified` s'il est vide.
- [ENVIES] : les 3 réponses de l'écran Questions en anglais (change, transformation, daily styling) ; `not specified` si aucune.
- [CATALOGUE] : une ligne par coupe du mode, « id: nom anglais — ligne française ».
- [IMPOSSIBLES] : tête chauve ou rasée → `bald or shaved head: only a buzz cut or a beard-only change` ; golfes marqués ou clairsemés → `thin hair or receding hairline: no fringe, no added volume, keep the current top length` ; sinon `none`.
- [RÉFÉRENTIEL] : emplacement réservé au référentiel de l'associé d'Antoine, vide pour l'instant ; tant qu'il est vide, sa ligne est retirée (`TEXTES.referentielPropositions` dans `prompts.js`).

Réponse attendue : un tableau JSON de 3 objets `{ id, nom, ligne, description_en, pourquoi }`. `id` = une coupe du catalogue, sinon `null` : la coupe devient alors une coupe personnalisée (nom, ligne, description anglaise), comme « Ajouter ma coupe ».

```text
You are an expert hairdresser and style consultant working in a [MODE] in France.
Analyze the client's personal style from the attached photo, if there is one (clothing, accessories, overall look), and from the information below.
Then propose the 3 haircuts that would suit this client best, inspired by current haircut trends and by what people with a similar style wear. You may search the web for current trends.
Client profile: [PROFIL]
What the client wants: [ENVIES]
Haircut catalogue (id: name — description):
[CATALOGUE]
[RÉFÉRENTIEL]
Rules:
- If a haircut of the catalogue fits, use its id. Otherwise use null and describe a new haircut.
- Never propose a haircut that is impossible for this client: [IMPOSSIBLES]
- Never propose a haircut that needs more hair or a lower hairline than the client has.
- Match the requested change: refresh = close to the current cut; evolve = same base with one new detail; change completely = a clearly different cut.
- Respect the natural hair texture unless the client asks for a texture change.
- Respect the daily styling time: no cut that needs more styling than the client accepts.
- The 3 haircuts must be clearly different from each other.
- Do not return images, links or names of real people.
Reply with a single JSON array of exactly 3 objects and nothing else, each with these keys:
- "id": the catalogue id, or null
- "nom": the haircut name in French
- "ligne": one short line in French describing the haircut (6 words maximum)
- "description_en": the haircut described zone by zone in English, only the zones that matter, in this order and format: "Length: … Layers: … Sides: … Top: … Front: … Neckline: … Texture: … Color: … Beard: …"
- "pourquoi": one short sentence in French for the hairdresser: why this haircut suits this client
```
