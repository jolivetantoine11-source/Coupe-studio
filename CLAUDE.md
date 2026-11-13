# CLAUDE.md — Coupe Studio (V1)

À lire au début de chaque session, avant toute ligne de code, avec `DESIGN.md` et `PROMPTS.md`.

## 1. Le projet en bref

Antoine, étudiant entrepreneur à Lyon, propose aux barbers et aux salons de coiffure un service d'essayage de coupes par IA. Le coiffeur prend un selfie du client, Gemini génère la photo avec la nouvelle coupe, puis une fiche technique.

**Coupe Studio** (nom provisoire) est l'outil du coiffeur. On choisit une coupe dans un catalogue (« le magazine »), on la règle (« la recette »), on décrit le client en quelques clics, et l'appli produit les prompts prêts à copier dans Gemini.

- **V1 (à construire)** : site statique, sans serveur, sans compte. L'appli fabrique des prompts, l'utilisateur les colle dans l'appli Gemini.
- **V2 (plus tard)** : génération d'image directe dans l'appli via l'API Gemini, derrière un petit serveur qui garde la clé.

Utilisateur : un coiffeur, debout en boutique, sur téléphone, à une main, avec un client devant lui. Tout doit se faire en moins d'une minute.

## 2. Fichiers de référence (fournis)

| Fichier | Rôle | Règle |
|---|---|---|
| `DESIGN.md` | Les 3 thèmes, couleurs, typo, espacements, composants, interdits | Loi. Aucun style hors de ce fichier. |
| `PROMPTS.md` | Les prompts validés par les tests | Texte copié mot pour mot dans `prompts.js`. |
| `maquettes.html` | Maquette validée des 6 écrans dans les 3 thèmes | Référence visuelle. Le rendu final doit lui correspondre. |

## 3. Pile technique

- HTML, CSS et JavaScript simples. Pas de framework, pas de build, pas de dépendance npm à l'exécution.
- Fichiers :
  - `index.html` : structure et écrans
  - `styles.css` : variables des 3 thèmes et composants (une classe par composant)
  - `app.js` : navigation, état, logique de recette et de profil, génération des prompts
  - `prompts.js` : les prompts (texte exact de `PROMPTS.md`) et les fonctions d'assemblage
  - `catalogue.js` : les 24 coupes et leurs recettes par défaut
  - `tests/` : tests Playwright (captures, contrastes, comparaison des prompts)
- Polices via Google Fonts (Space Grotesk, Fraunces, Oswald, Inter), avec polices de secours.
- Stockage : `localStorage` pour les recettes enregistrées et les coupes ajoutées, toujours dans un `try/catch`. L'appli doit marcher si le stockage est vide ou bloqué.
- Hébergement visé : statique et gratuit (GitHub Pages ou Netlify). L'appli doit marcher en ouvrant `index.html` en local.
- Hook V2 : une fonction `generateImage(photo, prompt)` dans `app.js`, présente mais vide, qui renvoie une erreur claire « Disponible en V2 ». Aucun bouton visible ne l'appelle en V1.

## 4. Écrans

Barre d'onglets en bas : Accueil, Catalogue, Recette, Client, Résultat. L'écran Fond s'ouvre depuis Recette (bouton « Fond ») et depuis Résultat.

### 4.1 Accueil
- Titre « Coupe Studio » et sous-titre « Montre la coupe avant de la faire. »
- Choix du mode : Barber / Salon. Le mode fixe le thème (`barber` ou `salon`) et le catalogue. Avant tout choix, thème `neutre`.
- Le mode choisi est mémorisé (localStorage).
- « Mes recettes » : les recettes enregistrées, la plus récente en haut. Toucher une recette la recharge dans Recette.
- Bouton principal : « Choisir une coupe » vers Catalogue.

### 4.2 Catalogue
- Grille de 2 colonnes, 12 coupes du mode actif (section 5). Thème neutre : 6 barber et 6 salon mêlées.
- Carte : silhouette au trait (SVG inline, même cadrage pour toutes, jamais de photo de personne), nom, une ligne de description.
- Toucher une carte la sélectionne et ouvre Recette préremplie.
- Bouton secondaire « Ajouter ma coupe » : nom + description libre en français + description anglaise facultative. Enregistrée en localStorage, affichée en fin de grille.

### 4.3 Recette
- Titre = nom de la coupe. Réglages en boutons à bascule et curseurs (section 6), préremplis par la coupe.
- Un résumé en une ligne en bas, mis à jour en direct (ex. « Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue »).
- Boutons : « Fond » (secondaire) et « Voir le profil client » (principal).

### 4.4 Client
- 5 questions maximum, en boutons à bascule (section 7).
- Sous les questions : 3 coupes proposées pour ce profil (cartes compactes, toucher = charger dans Recette), puis les avertissements qui s'appliquent.
- Bouton principal : « Générer les prompts ».
- Le bouton principal doit toujours rester visible (barre fixe au-dessus des onglets), même si l'écran défile. La maquette le coupait sur petit écran : à corriger.

### 4.5 Fond
- 6 options (section 8). « Couleur unie » ouvre 4 pastilles de couleur.
- Phrase fixe : « Le fond change, la coiffure reste identique. »
- Bouton principal « Appliquer » : enregistre le choix et revient à l'écran précédent.

### 4.6 Résultat
Les étapes, dans l'ordre, chacune dans une carte :
1. **Diagnostic** : consigne + bloc de prompt.
2. **Image** : consigne + bloc. Si la recette ne change que la barbe (option « Barbe seule »), ajouter la ligne de la variante barbe seule à la fin.
3. **Fiche** : fiche barber ou fiche salon selon le mode.
4. **Fond** (seulement si un fond autre que « D'origine » est choisi) : prompt de fond, à envoyer sur l'image générée.

Chaque carte : « Copier » (devient « Copié » 1,5 s, repli si le presse-papiers est refusé : sélectionner le texte) et « Ouvrir Gemini » (lien `https://gemini.google.com/app`, nouvel onglet). L'appli ne peut pas coller le prompt dans Gemini : le geste est Copier, Ouvrir, Coller.

Sous les cartes :
- Interrupteur « J'ai une photo de référence » : remplace l'étape Image par la variante photo de référence.
- « Enregistrer » : sauve la recette (coupe, réglages, profil, fond) en localStorage.
- « Partager » : copie un lien qui contient la recette (paramètre `?r=` en JSON encodé base64url). Ouvrir ce lien charge la recette. Aucune donnée personnelle dans le lien, uniquement les réglages.

## 5. Catalogue (catalogue.js)

`desc` = texte anglais qui remplace `[COUPE]` dans le prompt image. `fr` = nom affiché et utilisé dans le diagnostic.

### Barber
| fr | Ligne affichée | desc (anglais) |
|---|---|---|
| Buzz cut | Tondeuse sur toute la tête | even buzz cut with clipper guard 2 (6 mm) all over, natural hairline kept |
| Crew cut | Court, dessus un peu plus long | crew cut: short tapered sides with guard 2, top 2-3 cm, slightly longer at the front |
| Crop texturé | Frange courte, côtés nets | textured French crop: faded sides, 3-5 cm textured top with a short straight fringe |
| Taper bas | Fondu discret sur la nuque | low taper fade at the temples and nape only, top length kept, clean natural neckline |
| Skin fade | Fondu à blanc, dessus court | mid skin fade from 0 at the bottom to guard 2 at the top of the sides, 4-6 cm textured top |
| Raie sur le côté | Classique, raie marquée | classic side part: tapered sides with guard 2-3, 5-7 cm top combed to the side with a defined part line |
| Quiff | Dessus relevé vers l'avant | quiff: short faded sides, 7-9 cm top styled up and back at the front with volume |
| Slick back | Peigné en arrière | slick back: 8-10 cm top combed straight back with a light natural shine, tapered sides |
| Dégradé bouclé | Fondu, boucles sur le dessus | curly top with a mid fade: sides faded from guard 0.5 to 2, natural defined curls on top 4-6 cm |
| Classique aux ciseaux | Sans tondeuse, net | classic scissor cut: short sides and back cut with scissors, no clipper fade, 4-5 cm top, neat natural finish |
| Mi-long flow | Mi-long, rejeté en arrière | medium length flow: 10-14 cm hair swept back and falling behind the ears, natural movement |
| Mulet moderne | Court devant, long derrière | modern mullet: short faded sides, textured top, longer back reaching the nape |

### Salon
| fr | Ligne affichée | desc (anglais) |
|---|---|---|
| Pixie | Court, dégagé sur la nuque | pixie cut: very short layered cut, short at the nape and sides, slightly longer textured top with a side-swept fringe |
| Carré droit | Une longueur, au menton | blunt chin-length bob, one length, straight cut ends |
| Carré plongeant | Plus long devant | angled bob: shorter at the nape, longer at the front reaching the chin |
| Carré flou | Mouvement, pointes effilées | soft textured bob between jaw and collarbone, piecey ends, effortless movement |
| Carré bouclé | Arrondi sur boucles | curly bob at chin length, shaped to the natural curls, rounded silhouette |
| Mi-long en couches | Aux épaules, encadrant | shoulder-length layered cut with face-framing layers |
| Long en couches | Longueur gardée, mouvement | long layered cut below the shoulder blades with soft face-framing layers |
| Long droit | Une longueur | long one-length cut below the shoulder blades, straight healthy ends |
| Frange rideau | Ouverte au milieu | curtain bangs parted in the middle, falling at cheekbone level, length kept |
| Shag | Couches marquées, volume | shag cut: choppy layers on the crown, wispy fringe, textured ends |
| Wolf cut | Couches et longueurs mêlées | wolf cut: heavy layers on top, shaggy texture, longer wispy lengths at the back |
| Butterfly cut | Long, couches courtes devant | butterfly cut: long length kept with short face-framing layers starting at the chin, voluminous blow-dry |

## 6. Réglages de la recette et leur traduction

Chaque réglage modifié par l'utilisateur ajoute un fragment anglais à `desc`, séparé par une virgule. Un réglage laissé à sa valeur par défaut n'ajoute rien.

### Mode barber
| Réglage | Options (fragment anglais) |
|---|---|
| Côtés | Dégradé à blanc (`skin fade on the sides`) · Dégradé (`fade on the sides`) · Taper (`low taper on the sides`) · Ciseaux (`sides cut with scissors, no fade`) |
| Sabot du bas | 0 · 0,5 · 1 · 1,5 · 2 · 3 (`starting at clipper guard X`) |
| Dessus | curseur 1-15 cm (`about X cm on top`) |
| Coiffage | Vers l'avant (`styled forward`) · En arrière (`styled back`) · Sur le côté (`styled to the side`) · Naturel (`natural, unstyled`) |
| Contours | Nets (`sharp line-up`) · Naturels (`natural soft hairline edges`) |
| Barbe | Inchangée (rien) · Taillée courte (`beard trimmed short and neat`) · Entretenue (`well-groomed beard with clean cheek lines`) · Rasée (`clean-shaven`) · Barbe seule (déclenche la variante barbe seule) |

### Mode salon
| Réglage | Options (fragment anglais) |
|---|---|
| Longueur | Menton · Épaules · Omoplates · Milieu du dos, avec curseur 10-60 cm (`length at the X, about Y cm`) |
| Forme | Droite (`blunt one-length ends`) · Plongeante (`angled, longer at the front`) · Arrondie (`rounded shape`) |
| Couches | Aucune · Légères (`light layers`) · Marquées (`strong layers`) |
| Frange | Sans · Rideau (`curtain bangs`) · Droite (`straight blunt fringe`) · Effilée (`wispy fringe`) |
| Raie | Milieu (`middle part`) · Côté (`side part`) · Naturelle (rien) |
| Couleur | Inchangée (rien) · Balayage (`with a soft natural balayage`) · Autre (champ libre en anglais) |

Règle : le prompt image garde la couleur d'origine, sauf si la coupe demande explicitement un changement. Une option de couleur autre que « Inchangée » doit donc écrire clairement le changement dans `desc`.

Le diagnostic reçoit `[COUPE]` = nom français + résumé français de la recette (ex. « Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue »).

## 7. Profil client, propositions, avertissements

Questions (une ligne chacune, boutons à bascule) :
- Texture : Lisses · Ondulés · Bouclés · Crépus
- Visage : Ovale · Rond · Carré · Allongé
- Ligne frontale / densité : Normale · Golfes légers · Golfes marqués · Cheveux fins (salon)
- Longueur actuelle : Courte · Moyenne · Longue
- Lunettes : Oui · Non

Propositions (3 coupes du mode actif, règles simples, documentées dans `app.js`) :
- Visage rond : favoriser le volume en hauteur et les côtés courts (quiff, crop texturé, carré plongeant, long en couches). Éviter buzz cut, carré arrondi au menton.
- Visage carré : adoucir (raie sur le côté, mi-long flow, carré flou, frange rideau).
- Visage allongé : éviter la hauteur, garder de la largeur (crew cut, crop avec frange, carré droit, frange droite).
- Visage ovale : tout convient, proposer les 3 coupes les plus demandées du mode.
- Bouclés / crépus : préférer dégradé bouclé, buzz cut, carré bouclé, shag.
- Golfes marqués : préférer crop texturé, buzz cut, crew cut. Écarter slick back et quiff.

Avertissements (affichés en bloc « alerte » selon DESIGN.md) :
- **Pousse** : longueur demandée nettement supérieure à la longueur actuelle. « Il faut laisser pousser : environ 1 cm par mois. »
- **Lissage** : coupe lisse demandée (slick back, long droit, carré droit) sur cheveux bouclés ou crépus. « Le rendu demande un lissage ou un brushing. »
- **Golfes** : quiff ou slick back avec golfes marqués. « Ces coupes dégagent le front : garder du dessus pour couvrir la ligne frontale. »
- **Changement radical** : passage de Longue à Courte. « Plus de 10 cm coupés : changement radical, plusieurs mois pour revenir en arrière. »
- **Lunettes** : rappel de vérifier le contour d'oreille avec les lunettes remises.

## 8. Fonds et prompt de fond (nouveau, à tester)

Le prompt image interdit de changer le fond. Le fond se change donc dans une étape séparée, sur l'image déjà générée. Ce prompt n'a pas encore été testé : le signaler à Antoine.

Options et valeur de `[FOND]` :
- D'origine : pas d'étape 4
- Gris studio : `a plain light grey photo studio backdrop`
- Blanc uni : `a plain off-white wall`
- Couleur unie : `a plain solid [couleur en anglais] backdrop`
- Salon flou : `a softly blurred modern hair salon interior`
- Dehors flou : `a softly blurred outdoor street scene in daylight`

Texte du prompt de fond :

```text
Edit this photo: replace ONLY the background with [FOND].
Keep the person 100% identical: face, haircut, hair color, hair texture, hairline, beard, glasses, clothing, pose and framing.
Do not retouch, smooth or cut the hair edges, and do not change the haircut in any way.
Adapt the light on the person naturally to the new background without changing the skin tone.
Photorealistic result, keep the original image quality and grain.
```

Consigne affichée : « À envoyer en dernier, en joignant l'image générée. »

## 9. Processus de travail (obligatoire)

1. Lire `DESIGN.md`, `PROMPTS.md`, ce fichier, et ouvrir `maquettes.html`.
2. Poser les questions bloquantes à Antoine avant de coder, en une seule fois.
3. Construire **un écran à la fois**, dans l'ordre : Accueil, Catalogue, Recette, Client, Fond, Résultat. Ne pas passer au suivant avant que l'écran soit conforme.
4. Après chaque écran : captures Playwright à 390 px et 1280 px de large, dans les 3 thèmes, comparées à `maquettes.html`. Corriger débordements, espacements, textes coupés.
5. **Relecture adverse** : avant de déclarer un écran fini, une seconde passe (ou un sous-agent) cherche les écarts à `DESIGN.md` : couleur hors liste, espacement hors multiples de 8, taille de texte hors échelle, ombre, dégradé, nouveau style de bouton.
6. **Test des prompts** : un test compare le texte de `prompts.js` aux blocs de `PROMPTS.md` (mot pour mot, hors `[COUPE]`/`[FOND]`). Il doit passer avant toute livraison.
7. **Test de contraste** : un script vérifie que chaque paire texte/fond des 3 thèmes atteint 4,5:1.
8. Ne jamais dire « c'est corrigé » ou « ça marche » sans la preuve (capture, test qui passe).
9. Ne jamais modifier le texte d'un prompt de son propre chef. Proposer la modification à Antoine.

## 10. Hors périmètre V1

Pas de compte, pas de serveur, pas de génération d'image dans l'appli, pas de statistiques, pas de bibliothèque de composants externe, pas de photo de vraie personne (catalogue et démos), pas d'upload de photo client (la photo reste dans Gemini).

## 11. Points ouverts à confirmer avec Antoine

- Le prompt de diagnostic est rédigé pour un barbier (« Tu es un barbier expert… client »). En mode salon, il est utilisé tel quel en attendant une version salon validée.
- Le nom définitif de l'appli.
- Le prompt de fond (section 8) est à tester sur 3 photos avant de le considérer validé.

## 12. Décisions prises pendant la construction de la V1 (13 novembre 2026)

Cette section complète les sections 4 à 8. En cas de contradiction, elle l'emporte.

Décidé par Antoine :
- **Barbe seule** n'est pas un 5e bouton de la rangée Barbe. C'est un choix séparé « Ne changer que la barbe » (Non / Oui), affiché dès que la barbe change. Sur Oui, `[COUPE]` ne contient que la barbe choisie et la ligne de la variante est ajoutée à la fin du prompt image.
- **6e avertissement « Cheveux fins »** (salon) : profil « Cheveux fins » avec couches marquées, shag ou wolf cut. « Garder du volume en haut : une coupe très dégradée aplatit la forme. »
- **Coupe ajoutée sans description anglaise** : la description française part telle quelle dans le prompt image.

Choix faits par Claude, à confirmer :
- **Recettes par défaut** : une coupe ne préremplit que ce que son `desc` affirme. Un réglage qu'elle ne précise pas reste vide (aucun bouton actif, curseur sur « longueur gardée »).
- **Résumé** : le nom, puis les mesures (sabot, dessus, longueur) toujours, puis les autres réglages seulement s'ils sont modifiés.
- **Fragments ajoutés** : `no layers` et `no fringe` quand on retire les couches ou la frange d'une coupe qui en a. Couleur « Autre » : `hair color changed to` + le texte saisi.
- **Longueur salon** : le curseur et les repères sont liés (menton jusqu'à 27 cm, épaules jusqu'à 39, omoplates jusqu'à 52, milieu du dos au-delà).
- **Avertissements Pousse et Changement radical** : longueur demandée classée courte / moyenne / longue (barber, dessus : 5 et 10 cm ; salon : 19 et 39 cm), comparée à la longueur actuelle.
- **« Les plus demandées »** : c'est l'ordre du catalogue, lui-même repris de la maquette.
- **Consignes affichées** : celles de PROMPTS.md sans « Remplace [COUPE]… », puisque l'appli le fait.
- **Lien partagé** : coupe, réglages et fond. Le profil du client n'y figure pas.
- **Couleurs unies** : bleu gris (`blue-grey`), beige (`warm beige`), vert sauge (`sage green`), mauve (`soft mauve`).
- **Mémoire** : la recette en cours est gardée dans le navigateur (le téléphone peut recharger l'onglet au retour de Gemini). 30 recettes enregistrées au plus.
- **Bouton principal** : dans une barre fixe au-dessus des onglets sur tous les écrans, pas seulement Client. Boutons à bascule : 48 px de large au minimum.
- **Variables CSS ajoutées**, toutes dérivées de DESIGN.md : `--sur-principale`, `--selection`, `--sur-selection`, `--texte-2` (texte à 70 %), `--bordure` (texte à 15 % ou 35 %).
