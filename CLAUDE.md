# CLAUDE.md — Coupe Studio (V1)

À lire au début de chaque session, avant toute ligne de code, avec `DESIGN.md` et `PROMPTS.md`.

Version du 14 novembre 2026 : nouvelle structure après le premier test d'Antoine (parcours page par page, plus de barre d'onglets, profil client en premier, catalogue personnalisé, catalogue fond).

## 1. Le projet en bref

Antoine, étudiant entrepreneur à Lyon, propose aux barbers et aux salons de coiffure un service d'essayage de coupes par IA. Le coiffeur prend un selfie du client, Gemini génère la photo avec la nouvelle coupe, puis une fiche technique.

**Coupe Studio** (nom provisoire) est l'outil du coiffeur. On décrit le client en quelques clics, on choisit une coupe dans un catalogue ou on la compose avec des caractéristiques, et l'appli produit les prompts prêts à copier dans Gemini. Un troisième outil, le Catalogue fond, embellit une photo déjà prise pour Instagram sans toucher aux cheveux.

- **V1** : site statique, sans serveur, sans compte. L'appli fabrique des prompts, l'utilisateur les colle dans l'appli Gemini.
- **V2 (plus tard)** : voir section 14.

Utilisateur : un coiffeur, debout en boutique, sur téléphone, à une main, avec un client devant lui. Tout doit se faire en moins d'une minute.

Vocabulaire : le mot « recette » n'apparaît plus nulle part dans l'appli. On dit « coupe personnalisée ». La page qui règle une coupe s'appelle « Réglages ».

## 2. Fichiers de référence (fournis)

| Fichier | Rôle | Règle |
|---|---|---|
| `DESIGN.md` | Les 3 thèmes, couleurs, typo, espacements, composants, interdits | Loi. Aucun style hors de ce fichier. |
| `PROMPTS.md` | Les prompts validés par les tests | Texte copié mot pour mot dans `prompts.js`. |
| `maquettes.html` | Maquette d'origine des 6 premiers écrans dans les 3 thèmes | Référence visuelle pour le style (couleurs, typo, cartes, boutons). Sa structure (barre d'onglets, ordre des écrans) est dépassée : c'est ce fichier-ci qui fait foi. |

## 3. Pile technique

- HTML, CSS et JavaScript simples. Pas de framework, pas de build, pas de dépendance npm à l'exécution.
- Fichiers :
  - `index.html` : structure et pages
  - `styles.css` : variables des 3 thèmes et composants (une classe par composant)
  - `app.js` : navigation, état, logique des réglages et du profil, génération des prompts
  - `prompts.js` : les prompts (texte exact de `PROMPTS.md`) et les fonctions d'assemblage
  - `catalogue.js` : les 24 coupes, leurs réglages par défaut, les pictogrammes
  - `caracteristiques.js` : les caractéristiques du Catalogue personnalisé (section 13). Facile à compléter.
  - `fonds.js` : les retouches du Catalogue fond (section 8). Facile à compléter.
  - `retouche.js` : les retouches sans IA, calculées sur un canvas
  - `tests/` : tests Playwright (captures, contrastes, comparaison des prompts, parcours, retour arrière)
- Polices via Google Fonts (Space Grotesk, Fraunces, Oswald, Inter), avec polices de secours.
- Stockage :
  - `sessionStorage` : l'état du client en cours (profil, coupe, réglages, caractéristiques, retouches).
  - `localStorage` : le mode, les coupes personnalisées enregistrées et les coupes ajoutées.
  - Toujours dans un `try/catch`. L'appli doit marcher si le stockage est vide ou bloqué.
- Hébergement : GitHub Pages (dépôt `jolivetantoine11-source/Coupe-studio`, branche `main`). L'appli doit aussi marcher en ouvrant `index.html` en local.
- Hook V2 : une fonction `generateImage(photo, prompt)` dans `app.js`, présente mais vide, qui renvoie une erreur claire « Disponible en V2 ». Aucun bouton visible ne l'appelle en V1.

## 4. Parcours et pages

Il n'y a plus de barre d'onglets. L'appli est un parcours page par page, comme une appli native.

```
Accueil
  → Profil client (bouton « Passer » possible)
    → Que veux-tu faire ?
        • Catalogue coupe → Réglages → Résultat
        • Catalogue personnalisé → Résultat
        • Catalogue fond → Retouches sans IA / Retouches IA
```

Depuis Réglages, le lien « Ajouter des caractéristiques » ouvre le Catalogue personnalisé avec la coupe gardée.

### 4.0 Règles de navigation (toutes les pages)

- **Retour** : une flèche en haut à gauche sur toutes les pages sauf l'Accueil (zone tactile 48 × 48), ET un glissement depuis le bord gauche, ET le bouton retour du téléphone ou du navigateur. L'appli utilise l'historique du navigateur, une entrée par page, pour que le geste natif de l'iPhone marche aussi.
- **RÈGLE ABSOLUE : revenir en arrière n'efface JAMAIS les choix faits.** Le profil client, la coupe choisie, les réglages (gardés coupe par coupe), les caractéristiques et les retouches vivent dans un état unique (en mémoire + `sessionStorage`) et sont restaurés à chaque retour, et après un rechargement de la page.
- Seul le bouton explicite **« Nouveau client »** (sur l'Accueil et sur Résultat) remet tout à zéro, après une confirmation affichée dans la page (jamais de `confirm()`). Il ne touche pas aux coupes personnalisées enregistrées.
- La photo chargée dans le Catalogue fond reste en mémoire seulement : elle survit au retour arrière, pas au rechargement de la page (elle n'est jamais stockée).
- Le bouton principal d'une page reste toujours visible, dans une barre fixe en bas.

### 4.1 Accueil
- Titre « Coupe Studio » et sous-titre « Montre la coupe avant de la faire. »
- Choix du mode : Barber / Salon. Le mode fixe le thème (`barber` ou `salon`) et le catalogue. Avant tout choix, thème `neutre`. Retoucher le mode actif le retire.
- Le mode choisi est mémorisé (localStorage).
- « Mes coupes personnalisées » : les coupes enregistrées, la plus récente en haut. En toucher une la recharge et ouvre Réglages (ou le Catalogue personnalisé si elle n'a pas de coupe de départ).
- Bouton principal : « Commencer » (« Continuer » si un client est en cours) vers Profil client.
- Bouton secondaire : « Nouveau client ».

### 4.2 Profil client
- 5 questions maximum, en boutons à bascule (section 7). Retoucher une réponse la retire.
- Bouton principal « Continuer », bouton secondaire « Passer ». Les deux ouvrent « Que veux-tu faire ? ».

### 4.3 Que veux-tu faire ?
Trois gros boutons : « Catalogue coupe », « Catalogue personnalisé », « Catalogue fond », chacun avec une ligne d'explication.

### 4.4 Catalogue coupe
- Si le profil est rempli : en haut, « Conseillées pour ce client », 3 coupes avec le badge « Conseillée » (règles en section 7).
- Grille de 2 colonnes, 12 coupes du mode actif (section 5). Thème neutre : 6 barber et 6 salon mêlées.
- Carte : silhouette au trait (SVG inline, même cadrage pour toutes, jamais de photo de personne), nom, une ligne de description. Si le profil rend la coupe risquée, la carte porte un avertissement court : « Golfes », « Lissage nécessaire », « Pousse nécessaire ».
- Toucher une carte ouvre directement Réglages. Si cette coupe a déjà été réglée pour ce client, ses réglages sont retrouvés.
- Bouton secondaire « Ajouter ma coupe » : nom + description libre en français + description anglaise facultative. Enregistrée en localStorage, affichée en fin de grille.

### 4.5 Réglages (ex-« recette »)
- Titre = nom de la coupe. Réglages en boutons à bascule et curseurs (section 6), préremplis par la coupe.
- Sous les réglages : les avertissements qui s'appliquent à ce client (section 7).
- Un résumé en une ligne en bas, mis à jour en direct (ex. « Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue »).
- Lien « Ajouter des caractéristiques » (secondaire) vers le Catalogue personnalisé, coupe gardée.
- Bouton principal « Voir le résultat ».

### 4.6 Catalogue personnalisé
Magazine de caractéristiques (section 13). Même présentation que le Catalogue coupe : grille de cartes, pictogrammes au trait, par catégorie. Sélection multiple.
- Deux usages : ajouter des caractéristiques à la coupe choisie, ou partir uniquement des caractéristiques (coupe 100 % personnalisée).
- Si une coupe est choisie, un choix « Coupe de départ » (la coupe / Aucune) dit si elle sert de base. « Aucune » ne l'efface pas.
- Les combinaisons contradictoires sont signalées par un message, sans bloquer.
- Bouton principal « Voir le résultat ».

### 4.7 Catalogue fond
Voir section 8. Une page d'entrée présente les deux familles, clairement séparées : « Retouches sans IA » et « Retouches IA ».

### 4.8 Résultat
Les étapes, dans l'ordre, chacune dans une carte :
1. **Diagnostic** : consigne + bloc de prompt.
2. **Image** : consigne + bloc. Si « Ne changer que la barbe » est sur Oui, la ligne de la variante barbe seule est ajoutée à la fin.
3. **Fiche** : fiche barber ou fiche salon selon la coupe. Pour une coupe 100 % personnalisée en thème neutre, un choix Barber / Salon est proposé.

Il n'y a plus d'étape Fond : le fond se retouche dans le Catalogue fond, indépendamment de la coupe.

Chaque carte : « Copier » (devient « Copié » 1,5 s, repli si le presse-papiers est refusé : sélectionner le texte) et « Ouvrir Gemini » (lien `https://gemini.google.com/app`, nouvel onglet). L'appli ne peut pas coller le prompt dans Gemini : le geste est Copier, Ouvrir, Coller.

Sous les cartes :
- Choix « J'ai une photo de référence » : remplace l'étape Image par la variante photo de référence.
- « Enregistrer » : sauve la coupe personnalisée (coupe, réglages, caractéristiques, profil) en localStorage.
- « Partager » : copie un lien qui contient la coupe personnalisée (paramètre `?r=` en JSON encodé base64url). Ouvrir ce lien la charge. Aucune donnée personnelle dans le lien : ni profil, ni photo.
- « Nouveau client ».

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

## 6. Réglages d'une coupe et leur traduction

Chaque réglage modifié par l'utilisateur ajoute un fragment anglais à `desc`, séparé par une virgule. Un réglage laissé à la valeur de la coupe n'ajoute rien. Une coupe ne préremplit que ce que son `desc` affirme : un réglage qu'elle ne précise pas reste vide.

### Mode barber
| Réglage | Options (fragment anglais) |
|---|---|
| Côtés | Dégradé à blanc (`skin fade on the sides`) · Dégradé (`fade on the sides`) · Taper (`low taper on the sides`) · Ciseaux (`sides cut with scissors, no fade`) |
| Sabot du bas | 0 · 0,5 · 1 · 1,5 · 2 · 3 (`starting at clipper guard X`) |
| Dessus | curseur 1-15 cm (`about X cm on top`) |
| Coiffage, devant et frange | Vers l'avant (`front styled forward`) · Relevé (`front lifted up`) · Sur le côté (`front swept to the side`) · En arrière (`front pushed back`) |
| Coiffage, dessus | En arrière (`top styled back`) · Sur le côté (`top styled to the side`) · Naturel (`top left natural, unstyled`) · Décoiffé (`messy, textured top`) |
| Contours | Nets (`sharp line-up`) · Naturels (`natural soft hairline edges`) |
| Barbe | Inchangée (rien) · Taillée courte (`beard trimmed short and neat`) · Entretenue (`well-groomed beard with clean cheek lines`) · Rasée (`clean-shaven`) |
| Ne changer que la barbe | Non · Oui. Affiché dès que la barbe change. Sur Oui, `[COUPE]` ne contient que la barbe et la ligne de la variante barbe seule est ajoutée à la fin du prompt image. |

Le coiffage se choisit par zone (décision d'Antoine du 14 novembre). Les fragments des deux zones sont à valider par Antoine. Le mode salon garde Frange et Raie, qui jouent ce rôle.

### Mode salon
| Réglage | Options (fragment anglais) |
|---|---|
| Longueur | Menton · Épaules · Omoplates · Milieu du dos, avec curseur 10-60 cm (`length at the X, about Y cm`). Curseur et repères liés : menton jusqu'à 27 cm, épaules jusqu'à 39, omoplates jusqu'à 52, milieu du dos au-delà. |
| Forme | Droite (`blunt one-length ends`) · Plongeante (`angled, longer at the front`) · Arrondie (`rounded shape`) |
| Couches | Aucune (`no layers`, seulement si la coupe en avait) · Légères (`light layers`) · Marquées (`strong layers`) |
| Frange | Sans (`no fringe`, seulement si la coupe en avait une) · Rideau (`curtain bangs`) · Droite (`straight blunt fringe`) · Effilée (`wispy fringe`) |
| Raie | Milieu (`middle part`) · Côté (`side part`) · Naturelle (rien) |
| Couleur | Inchangée (rien) · Balayage (`with a soft natural balayage`) · Autre (`hair color changed to` + texte libre en anglais) |

Règle : le prompt image garde la couleur d'origine, sauf si la coupe demande explicitement un changement. Une option de couleur autre que « Inchangée » doit donc écrire clairement le changement dans `desc`.

Le diagnostic reçoit `[COUPE]` = nom français + résumé français (ex. « Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue »). Le résumé donne le nom, puis les mesures (sabot, dessus, longueur) toujours, puis les autres réglages seulement s'ils sont modifiés, puis les caractéristiques ajoutées.

## 7. Profil client, coupes conseillées, avertissements

Le profil se remplit en premier (page 4.2), mais reste facultatif.

Questions (une ligne chacune, boutons à bascule) :
- Texture : Lisses · Ondulés · Bouclés · Crépus
- Visage : Ovale · Rond · Carré · Allongé
- Ligne frontale et densité : Normale · Golfes légers · Golfes marqués · Cheveux fins (salon)
- Longueur actuelle : Courte · Moyenne · Longue
- Lunettes : Oui · Non

Coupes conseillées (3 coupes du mode actif, affichées en haut du Catalogue coupe avec le badge « Conseillée » ; règles simples, documentées dans `app.js`) :
- Visage rond : favoriser le volume en hauteur et les côtés courts (quiff, crop texturé, carré plongeant, long en couches). Éviter buzz cut, carré arrondi au menton.
- Visage carré : adoucir (raie sur le côté, mi-long flow, carré flou, frange rideau).
- Visage allongé : éviter la hauteur, garder de la largeur (crew cut, crop avec frange, carré droit, coupes à frange).
- Visage ovale : tout convient, proposer les 3 coupes les plus demandées du mode (l'ordre du catalogue).
- Bouclés / crépus : préférer dégradé bouclé, buzz cut, carré bouclé, shag.
- Golfes marqués : préférer crop texturé, buzz cut, crew cut. Écarter slick back et quiff.
- Une coupe à risque pour ce client (voir ci-dessous) perd un point par risque.

Coupes à risque, marquées dans le Catalogue coupe : « Golfes » (quiff ou slick back avec golfes marqués), « Lissage nécessaire » (slick back, long droit, carré droit sur cheveux bouclés ou crépus), « Pousse nécessaire » (coupe plus longue que la longueur actuelle).

Avertissements complets, affichés sur la page Réglages (bloc « alerte » selon DESIGN.md) :
- **Pousse** : longueur demandée supérieure à la longueur actuelle. « Il faut laisser pousser : environ 1 cm par mois. » Longueur demandée classée courte / moyenne / longue (barber, dessus : jusqu'à 5 cm, jusqu'à 10 cm, au-delà ; salon : jusqu'à 19 cm, jusqu'à 39 cm, au-delà).
- **Lissage** : coupe lisse demandée sur cheveux bouclés ou crépus. « Le rendu demande un lissage ou un brushing. »
- **Golfes marqués** : quiff ou slick back avec golfes marqués. « Ces coupes dégagent le front : garder du dessus pour couvrir la ligne frontale. »
- **Changement radical** : passage de Longue à Courte. « Plus de 10 cm coupés : changement radical, plusieurs mois pour revenir en arrière. »
- **Cheveux fins** (salon) : profil « Cheveux fins » avec couches marquées, shag ou wolf cut. « Garder du volume en haut : une coupe très dégradée aplatit la forme. »
- **Lunettes** : « Vérifie le contour d'oreille avec les lunettes remises. »

## 8. Catalogue fond (remplace l'ancien écran Fond)

But : un coiffeur rend une photo DÉJÀ PRISE plus belle pour Instagram, SANS JAMAIS modifier les cheveux ni la personne. Indépendant de la coupe. La liste des retouches vit dans `fonds.js` (nom français, famille, fragment anglais) : elle se complète selon les retours des pros.

Deux familles, clairement séparées.

### a) Retouches sans IA (dans l'appli, sur canvas, cheveux intacts garantis)

Luminosité · Contraste · Chaleur (chaud / froid) · Noir et blanc · Recadrage 4:5 (post), 9:16 (story), 1:1 · Montage avant/après côte à côte.

- La photo est choisie dans le téléphone, traitée localement, jamais envoyée ni stockée. C'est la seule exception à « pas de photo dans l'appli » : aucune photo n'est fournie avec l'appli, et celle du coiffeur ne quitte pas son téléphone.
- Bouton « Enregistrer l'image ». L'image est aussi affichée en grand avec « appui long pour enregistrer », pour le cas où le téléchargement est bloqué.
- Montage avant/après : la photo « avant » à gauche, la photo retouchée à droite (l'une au-dessus de l'autre en 9:16). Les réglages s'appliquent aux deux.

### b) Retouches IA (prompt à copier dans Gemini)

| Retouche | Rôle | Fragment anglais |
|---|---|---|
| Flouter le fond (effet portrait) | même fond | `softly blurred with a shallow depth-of-field portrait effect` |
| Ranger le fond | même fond | `tidied up, with clutter, objects, cables and products removed` |
| Retirer une personne derrière | même fond | `without the person standing behind` |
| Fond studio gris | nouveau fond | `a plain light grey photo studio backdrop` |
| Fond studio blanc | nouveau fond | `a plain off-white wall` |
| Fond studio couleur | nouveau fond | `a plain solid [couleur] backdrop` (bleu gris `blue-grey`, beige `warm beige`, vert sauge `sage green`, mauve `soft mauve`) |
| Lumière studio douce | en plus | `use soft, even studio lighting` |
| Corriger le contre-jour | en plus | `correct the backlight so the person is evenly lit` |
| Retirer les cheveux coupés (épaules, cape) | en plus | `remove the loose cut hair clippings from the shoulders and the cape` |

Assemblage de `[FOND]` (la « combinaison choisie ») :
- un nouveau fond : son fragment ;
- sinon : `the same background`, suivi des fragments « même fond » séparés par des virgules, ou de `, unchanged` s'il n'y en a pas ;
- puis, s'il y a des retouches « en plus » : `; also ` suivi de leurs fragments reliés par `, and `.

Exemple : « Flouter le fond » + « Lumière studio douce » donne `the same background, softly blurred with a shallow depth-of-field portrait effect; also use soft, even studio lighting`.

Texte du prompt de fond (inchangé) :

```text
Edit this photo: replace ONLY the background with [FOND].
Keep the person 100% identical: face, haircut, hair color, hair texture, hairline, beard, glasses, clothing, pose and framing.
Do not retouch, smooth or cut the hair edges, and do not change the haircut in any way.
Adapt the light on the person naturally to the new background without changing the skin tone.
Photorealistic result, keep the original image quality and grain.
```

Règle ajoutée à la fin du prompt, sur une nouvelle ligne (décision d'Antoine du 14 novembre) :

```text
The hair and the person must stay pixel-identical: same haircut, same hair edges, same color, same face, same body.
```

Consigne affichée au-dessus : « À envoyer avec la photo à retoucher jointe. »

Texte affiché sous le prompt : « L'IA régénère l'image : vérifie toujours les cheveux avant de publier. Pour une retouche garantie sans changement, utilise les retouches sans IA. »

Ce prompt n'a toujours pas été testé : le signaler à Antoine. Les combinaisons contradictoires (deux fonds studio, ou un fond studio avec « Ranger le fond ») sont signalées par un message, sans bloquer.

## 9. Processus de travail (obligatoire)

1. Lire `DESIGN.md`, `PROMPTS.md`, ce fichier, et ouvrir `maquettes.html`.
2. Poser les questions bloquantes à Antoine avant de coder, en une seule fois.
3. Construire **une page à la fois**, dans l'ordre du parcours : Accueil, Profil client, Que veux-tu faire ?, Catalogue coupe, Réglages, Catalogue personnalisé, Résultat, Catalogue fond, Retouches sans IA, Retouches IA. Ne pas passer à la suivante avant que la page soit conforme.
4. Après chaque page : captures Playwright à 390 px et 1280 px de large, dans les 3 thèmes. Corriger débordements, espacements, textes coupés.
5. **Relecture adverse** : avant de déclarer une page finie, une seconde passe (ou un sous-agent) cherche les écarts à `DESIGN.md` : couleur hors liste, espacement hors multiples de 8, taille de texte hors échelle, ombre, dégradé, nouveau style de bouton.
6. **Test des prompts** : un test compare le texte de `prompts.js` aux blocs de `PROMPTS.md` et de la section 8 (mot pour mot, hors `[COUPE]`/`[FOND]`). Il doit passer avant toute livraison.
7. **Test de contraste** : un script vérifie que chaque paire texte/fond des 3 thèmes atteint 4,5:1.
8. **Test du retour arrière** : un test remplit le profil, choisit une coupe, change des réglages, revient 3 fois en arrière puis revient en avant, et vérifie que tous les choix sont toujours là.
9. Ne jamais dire « c'est corrigé » ou « ça marche » sans la preuve (capture, test qui passe).
10. Ne jamais modifier le texte d'un prompt de son propre chef. Proposer la modification à Antoine.

## 10. Hors périmètre V1

Pas de compte, pas de serveur, pas de génération d'image dans l'appli, pas de statistiques, pas de bibliothèque de composants externe, pas de photo de vraie personne fournie avec l'appli (catalogue et démos), pas d'envoi de photo : la photo du client reste dans Gemini, et la photo retouchée dans le Catalogue fond reste dans le téléphone.

## 11. Points ouverts à confirmer avec Antoine

- Le prompt de diagnostic est rédigé pour un barbier (« Tu es un barbier expert… client »). En mode salon, il est utilisé tel quel en attendant une version salon validée.
- Le nom définitif de l'appli.
- Le prompt de fond (section 8) n'a jamais été testé. Trois retouches (« Lumière studio douce », « Corriger le contre-jour », « Retirer les cheveux coupés ») ne sont pas des changements de fond : elles tiennent mal dans la phrase « replace ONLY the background with [FOND] », et « Retirer les cheveux coupés » contredit « Keep the person 100% identical: … clothing ». À tester, et à réécrire si Gemini les ignore.
- Le prompt image dit de garder la barbe et la texture des cheveux à l'identique (« Everything else must stay identical: … beard », « Do not invent curls, straighten the hair… »). Les réglages et caractéristiques de **barbe** et de **texture** (boucles, permanente, lissé, twists, vanilles) le contredisent. Le prompt n'a pas été modifié. À tester, et à ajuster si Gemini les ignore.
- Les fragments anglais des caractéristiques (section 13), du coiffage par zone (section 6) et des retouches IA (section 8) sont à valider.
- Le glissement depuis le bord gauche n'a pas pu être essayé sur un vrai iPhone.

## 12. Décisions prises

Décidé par Antoine (13 novembre) :
- **Barbe seule** n'est pas un 5e bouton de la rangée Barbe. C'est un choix séparé « Ne changer que la barbe » (Non / Oui).
- **Avertissement « Cheveux fins »** (salon).
- **Coupe ajoutée sans description anglaise** : la description française part telle quelle dans le prompt image.

Décidé par Antoine (14 novembre, après test du site) :
- Plus de barre d'onglets : parcours page par page, flèche retour, glissement, historique du navigateur.
- Revenir en arrière n'efface jamais rien. Seul « Nouveau client » remet à zéro, après confirmation dans la page.
- Profil client en premier, avec « Passer ». Coupes conseillées et coupes à risque dans le Catalogue coupe.
- Le mot « recette » disparaît : « coupe personnalisée ».
- Coiffage par zone (devant / frange, dessus).
- Catalogue personnalisé : magazine de caractéristiques (section 13).
- Catalogue fond : retouches sans IA et retouches IA (section 8), avec la règle « pixel-identical » ajoutée au prompt.

Choix faits par Claude, à confirmer :
- **« Les plus demandées »** : c'est l'ordre du catalogue, lui-même repris de la maquette.
- **Consignes affichées** : celles de PROMPTS.md sans « Remplace [COUPE]… », puisque l'appli le fait.
- **Réglages gardés coupe par coupe** : si on change de coupe puis qu'on revient à la première, ses réglages sont retrouvés.
- **« Coupe de départ »** dans le Catalogue personnalisé : la coupe choisie sert de base tant qu'on ne touche pas « Aucune ».
- **Coiffage par zone** : en mode barber seulement.
- **Catalogue fond en trois pages** : une page d'entrée, puis une page par famille, pour que les deux familles ne se mélangent pas.
- **Montage avant/après** : sans étiquettes « Avant » / « Après » sur l'image.
- **Enregistrement de l'image** : JPEG, 2048 px au plus grand côté.
- **Mémoire** : 30 coupes personnalisées enregistrées au plus.
- **Boutons à bascule** : 48 px de large au minimum.
- **Variables CSS ajoutées**, toutes dérivées de DESIGN.md : `--sur-principale`, `--selection`, `--sur-selection`, `--texte-2` (texte à 70 %), `--bordure` (texte à 15 % ou 35 %).

## 13. Catalogue personnalisé : caractéristiques et fragments (à valider par Antoine)

Chaque caractéristique choisie ajoute son fragment anglais à `[COUPE]`, après la coupe et ses réglages, séparé par une virgule. Sans coupe de départ, `[COUPE]` ne contient que les fragments. Dans le diagnostic, `[COUPE]` reçoit les noms français (« Coupe personnalisée : … » s'il n'y a pas de coupe de départ). La liste vit dans `caracteristiques.js`.

| Catégorie | Caractéristique | Fragment anglais |
|---|---|---|
| Côtés | Rasé sur un côté | `one side of the head shaved very short, the other side kept longer` |
| Côtés | Undercut | `undercut: sides and back clipped short, disconnected from a longer top` |
| Côtés | Dégradé à blanc | `skin fade on the sides` |
| Côtés | Tempes dégagées | `clean tapered temples` |
| Côtés | Trait rasé (motif) | `a thin shaved line design on one side` |
| Devant et dessus | Mèche sur le côté | `a side-swept lock at the front` |
| Devant et dessus | Mèche longue devant | `a long strand falling over the forehead` |
| Devant et dessus | Frange courte droite | `a short straight fringe` |
| Devant et dessus | Frange rideau | `curtain bangs parted in the middle` |
| Devant et dessus | Dessus relevé | `top lifted up with volume` |
| Devant et dessus | Dessus décoiffé | `messy, textured top` |
| Devant et dessus | Raie marquée | `a defined hard part line` |
| Devant et dessus | Couches | `visible layers` |
| Couleur | Mèches blondes | `hair color change: blonde highlights` |
| Couleur | Balayage | `hair color change: soft natural balayage` |
| Couleur | Pointes décolorées | `hair color change: bleached tips` |
| Couleur | Platine | `hair color change: full platinum blonde` |
| Couleur | Reflets cuivrés | `hair color change: copper tones` |
| Couleur | Poivre et sel gardé | `natural salt-and-pepper grey kept, no coloring` |
| Couleur | Couleur libre (champ texte, en anglais) | `hair color change: ` + le texte saisi |
| Texture | Boucles définies | `defined curls` |
| Texture | Ondulations | `soft waves` |
| Texture | Permanente | `permed curls` |
| Texture | Lissé | `straightened, sleek hair` |
| Texture | Twists | `short twists` |
| Texture | Vanilles | `two-strand twists` |
| Barbe | Taillée courte | `beard trimmed short and neat` |
| Barbe | Dégradé dans la barbe | `beard faded into the sideburns` |
| Barbe | Moustache | `a neat moustache` |
| Barbe | Bouc | `a goatee` |
| Barbe | Rasée | `clean-shaven` |
| Nuque et contours | Nuque dégagée | `clean tapered nape` |
| Nuque et contours | Nuque arrondie | `rounded neckline` |
| Nuque et contours | Nuque carrée | `squared neckline` |
| Nuque et contours | Contours nets | `sharp line-up` |

Une caractéristique de couleur écrit clairement le changement (`hair color change: …`), puisque le prompt image garde la couleur d'origine sinon. « Poivre et sel gardé » n'est pas un changement.

Combinaisons signalées comme contradictoires (message, sans bloquer) : deux formes de nuque ; barbe rasée avec une autre barbe ; lissé avec boucles, ondulations, permanente, twists ou vanilles ; twists avec vanilles ; platine avec mèches blondes, balayage, pointes décolorées ou reflets cuivrés ; poivre et sel gardé avec tout changement de couleur ; frange courte droite avec frange rideau, mèche longue devant ou dessus relevé ; raie marquée avec dessus décoiffé ; undercut avec dégradé à blanc ; « Ne changer que la barbe » sur Oui avec des caractéristiques.

## 14. V2 (plus tard, NE PAS faire maintenant)

- Génération d'image directe dans l'appli via l'API Gemini, derrière un petit serveur qui garde la clé (hook `generateImage`).
- Connexion et comptes.
- Catalogue propre à chaque coiffeur.
- Pages RGPD et mentions légales.
- Statistiques d'usage, bibliothèque de composants externe.
