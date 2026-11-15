# CLAUDE.md — Coupe Studio (V1)

À lire au début de chaque session, avant toute ligne de code, avec `DESIGN.md` et `PROMPTS.md`.

Version du 16 novembre 2026 : hauteur du dégradé barber et ligne d'exception barbe / texture dans le prompt image (sections 6 et 4.8).

Version du 15 novembre 2026, après la deuxième revue d'Antoine : description [COUPE] structurée par zone, groupes de caractéristiques exclusifs, catalogues en texte, éditeur photo à la manière d'Instagram, option « Barbe seule », sélection en bleu dans le thème barber, diagnostic salon.

(Version du 14 novembre : parcours page par page, plus de barre d'onglets, profil client en premier, catalogue personnalisé, catalogue fond.)

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
  - `catalogue.js` : les zones de [COUPE], les 24 coupes découpées par zone, leurs réglages par défaut
  - `caracteristiques.js` : les caractéristiques du Catalogue personnalisé et leurs groupes exclusifs (section 13). Facile à compléter.
  - `fonds.js` : les retouches du Catalogue fond (section 8). Facile à compléter.
  - `retouche.js` : les retouches sans IA, calculées sur un canvas
  - `tests/` : tests Playwright (captures, contrastes, comparaison des prompts, parcours, retour arrière, contradictions) et `tests/tableaux.js`, qui écrit et vérifie les tableaux de ce fichier
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
- Cartes texte compactes, grille de 2 colonnes : nom (police des titres du thème), une ligne de description, badges. Plus de silhouettes : on voit plus de coupes sans défiler.
- Si le profil est rempli : en haut, « Conseillées pour ce client », 3 coupes avec le badge « Conseillée » (règles en section 7). Puis « Autres coupes », SANS répéter les coupes conseillées.
- 12 coupes du mode actif (section 5). Thème neutre : 6 barber et 6 salon mêlées.
- Si le profil rend la coupe risquée, la carte porte un badge d'avertissement court : « Golfes », « Lissage nécessaire », « Pousse nécessaire ».
- Toucher une carte ouvre directement Réglages. Si cette coupe a déjà été réglée pour ce client, ses réglages sont retrouvés.
- Bouton secondaire « Ajouter ma coupe » : nom + description libre en français + description anglaise facultative. Enregistrée en localStorage, affichée en fin de grille.

### 4.5 Réglages (ex-« recette »)
- Titre = nom de la coupe. Réglages en boutons à bascule et curseurs (section 6), préremplis par la coupe.
- Groupe Barbe (barber) : les 4 styles, puis le choix « Barbe seule (ne pas toucher aux cheveux) ». Sur Oui, [COUPE] ne décrit que la barbe et la ligne de la variante barbe seule de PROMPTS.md est ajoutée à la fin du prompt image. Si aucune barbe n'est choisie, un message demande d'en choisir une.
- Un réglage remplacé par une caractéristique (même emplacement, section 6) ne montre plus ses boutons mais la phrase « Côtés remplacés par : rasé sur un côté » et un bouton « Modifier » qui ouvre le Catalogue personnalisé.
- Sous les réglages : les avertissements qui s'appliquent à ce client (section 7).
- Un résumé en une ligne en bas, mis à jour en direct, dans l'ordre des zones (ex. « Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue »).
- Lien « Ajouter des caractéristiques » (secondaire) vers le Catalogue personnalisé, coupe gardée.
- Bouton principal « Voir le résultat ».

### 4.6 Catalogue personnalisé
Magazine de caractéristiques (section 13), en cartes texte comme le Catalogue coupe (nom seul, plus de pictogrammes), par catégorie. Sélection multiple.
- Deux usages : ajouter des caractéristiques à la coupe choisie, ou partir uniquement des caractéristiques (coupe 100 % personnalisée).
- Si une coupe est choisie, un choix « Coupe de départ » (la coupe / Aucune) dit si elle sert de base. « Aucune » ne l'efface pas.
- **Groupes exclusifs** (section 13) : choisir une caractéristique d'un groupe déjà occupé ne l'ajoute pas tout de suite. Un message dans la page dit ce qui entre en conflit et propose « Garder X » / « Garder Y ». Jamais de `confirm()`.
- **RÈGLE : le prompt final ne contient jamais deux consignes contradictoires pour une même zone.** Une caractéristique remplace la coupe et les réglages de son emplacement ; un test le vérifie sur toutes les paires de chaque groupe.
- Bouton principal « Voir le résultat ».

### 4.7 Catalogue fond
Voir section 8. Une page d'entrée présente les deux familles, clairement séparées : « Retouches sans IA » et « Retouches IA ».

### 4.8 Résultat
Les étapes, dans l'ordre, chacune dans une carte :
1. **Diagnostic** : consigne photo « Photo de face, regard caméra, cheveux bien visibles. », consigne + bloc de prompt. Diagnostic barber ou diagnostic salon (PROMPTS.md, 1 et 1b) selon la coupe : le mode de la coupe, sinon le mode de l'accueil, sinon le choix Barber / Salon de la page.
2. **Image** : consigne + bloc. Si « Barbe seule » est sur Oui, la ligne de la variante barbe seule est ajoutée à la fin. Sinon, si l'utilisateur a choisi un changement de barbe ou de texture (réglage modifié ou caractéristique, jamais le texte par défaut d'une coupe comme le dégradé bouclé ou le carré bouclé), la ligne « Exception to the rules above… » de PROMPTS.md est ajoutée à la fin, avec « a beard change » / « a texture change » + « Apply only that change », ou « a beard change and a texture change » + « Apply only those changes ». Sinon, le prompt image est inchangé. Sous le prompt image : « Résultat bizarre (tête tournée, frange en trop) ? Relance la génération. »
3. **Couleur** (seulement si une couleur est demandée, décision du 15 novembre) : coupe + couleur = 2 étapes. L'étape Image ne contient alors pas la zone Color ; l'étape Couleur (PROMPTS.md, 2b) applique la couleur sur l'image générée. « Poivre et sel gardé » n'est pas un changement : pas d'étape Couleur.
4. **Fiche** : fiche barber ou fiche salon, selon la même règle. Pour une coupe 100 % personnalisée en thème neutre, un choix Barber / Salon est proposé ; il vaut pour le diagnostic et la fiche.

Il n'y a plus d'étape Fond : le fond se retouche dans le Catalogue fond, indépendamment de la coupe.

Chaque carte : « Copier » (devient « Copié » 1,5 s, repli si le presse-papiers est refusé : sélectionner le texte) et « Ouvrir Gemini » (lien `https://gemini.google.com/app`, nouvel onglet). L'appli ne peut pas coller le prompt dans Gemini : le geste est Copier, Ouvrir, Coller.

Sous les cartes :
- Choix « J'ai une photo de référence » : remplace l'étape Image par la variante photo de référence.
- « Enregistrer » : sauve la coupe personnalisée (coupe, réglages, caractéristiques, profil) en localStorage.
- « Partager » : copie un lien qui contient la coupe personnalisée (paramètre `?r=` en JSON encodé base64url). Ouvrir ce lien la charge. Aucune donnée personnelle dans le lien : ni profil, ni photo.
- « Nouveau client ».

## 5. Description [COUPE] structurée par zone

Avant le 15 novembre, les fragments des réglages s'ajoutaient à la fin de la description de la coupe et devenaient ambigus (« …textured top with a short straight fringe, starting at clipper guard 0.5 » : le sabot vise-t-il les côtés ou le dessus ?). Désormais [COUPE] s'écrit zone par zone :

```
<nom anglais de la coupe>. Length: … Layers: … Sides: … Top: … Front: … Neckline: … Texture: … Color: … Beard: …
```

- On n'écrit que les zones qui ont une valeur. Pas de point final : le prompt image en ajoute déjà un après [COUPE].
- Chaque zone a des emplacements (ex. Sides = style, sabot, en plus). Dans un emplacement, la valeur la plus précise remplace les autres : **caractéristique choisie > réglage modifié > texte de la coupe**. Rien ne s'ajoute en vrac à la fin.
- Length et Layers servent surtout au salon, Texture aux coupes bouclées et aux caractéristiques de texture. Elles complètent la liste d'Antoine (Sides, Top, Front, Neckline, Color, Beard) sans en changer l'ordre.
- Coupe ajoutée (« Ajouter ma coupe ») : « <nom> : <description> », puis les zones des réglages et caractéristiques.
- Coupe 100 % personnalisée : « Custom haircut », puis les zones.
- Barbe seule : seulement « Beard: … ».
- **Front toujours écrit** (décision du 15 novembre) : sans frange, mèche ni coiffage du devant (coupe, réglage ou caractéristique), Front = « no fringe, forehead uncovered, keep the front as in the original ». Barber et salon, coupe 100 % personnalisée comprise.
- Le résumé français (diagnostic et barre du bas) suit le même ordre de zones.

### Zones et emplacements

<!-- tableau:zones -->
| Ordre | Zone dans [COUPE] | Nom français | Emplacements |
|---|---|---|---|
| 1 | Length | Longueur | longueur, forme |
| 2 | Layers | Couches | couches |
| 3 | Sides | Côtés | style, sabot, en plus |
| 4 | Top | Dessus | longueur, style, raie |
| 5 | Front | Devant | style, en plus |
| 6 | Neckline | Nuque et contours | forme, contours |
| 7 | Texture | Texture | texture |
| 8 | Color | Couleur | couleur |
| 9 | Beard | Barbe | style, en plus |
<!-- /tableau:zones -->

### Coupe → zones (à relire par Antoine)

`fr` = nom affiché et utilisé dans le diagnostic. Le texte de chaque zone est en anglais, tel qu'il part dans [COUPE].

<!-- tableau:coupes -->
#### Barber

| fr | Ligne affichée | Nom anglais | Zones (texte anglais) |
|---|---|---|---|
| Buzz cut | Tondeuse sur toute la tête | Buzz cut | **Sides** : clipper guard 2 (6 mm)<br>**Top** : clipper guard 2 (6 mm), even all over<br>**Neckline** : natural hairline kept |
| Crew cut | Court, dessus un peu plus long | Crew cut | **Sides** : short and tapered, clipper guard 2<br>**Top** : 2-3 cm<br>**Front** : slightly longer than the rest of the top |
| Crop texturé | Frange courte, côtés nets | Textured French crop | **Sides** : mid fade (réglages), from guard 0.5 at the bottom to guard 2 at the top<br>**Top** : 3-5 cm, textured<br>**Front** : a short straight fringe |
| Taper bas | Fondu discret sur la nuque | Low taper fade | **Sides** : low taper fade at the temples and nape only<br>**Top** : length kept<br>**Neckline** : clean natural neckline |
| Skin fade | Fondu à blanc, dessus court | Skin fade | **Sides** : mid skin fade (réglages), from guard 0 at the bottom to guard 2 at the top<br>**Top** : 4-6 cm, textured |
| Raie sur le côté | Classique, raie marquée | Classic side part | **Sides** : tapered, clipper guard 2-3<br>**Top** : 5-7 cm, combed to the side, a defined part line |
| Quiff | Dessus relevé vers l’avant | Quiff | **Sides** : mid fade (réglages), from guard 1 at the bottom to guard 3 at the top<br>**Top** : 7-9 cm<br>**Front** : styled up and back with volume |
| Slick back | Peigné en arrière | Slick back | **Sides** : tapered<br>**Top** : 8-10 cm, combed straight back with a light natural shine<br>**Front** : combed back |
| Dégradé bouclé | Fondu, boucles sur le dessus | Curly top with a fade | **Sides** : mid fade (réglages), from guard 0.5 at the bottom to guard 2 at the top<br>**Top** : 4-6 cm, natural, unstyled<br>**Texture** : natural defined curls on top |
| Classique aux ciseaux | Sans tondeuse, net | Classic scissor cut | **Sides** : short sides and back cut with scissors, no clipper fade<br>**Top** : 4-5 cm, neat natural finish |
| Mi-long flow | Mi-long, rejeté en arrière | Medium length flow | **Sides** : falling behind the ears<br>**Top** : 10-14 cm, swept back with natural movement |
| Mulet moderne | Court devant, long derrière | Modern mullet | **Sides** : low fade (réglages), from guard 1 at the bottom to guard 3 at the top<br>**Top** : textured<br>**Neckline** : longer back reaching the nape |

#### Salon

| fr | Ligne affichée | Nom anglais | Zones (texte anglais) |
|---|---|---|---|
| Pixie | Court, dégagé sur la nuque | Pixie cut | **Layers** : very short layers<br>**Sides** : short<br>**Top** : slightly longer and textured<br>**Front** : a side-swept fringe<br>**Neckline** : short |
| Carré droit | Une longueur, au menton | Blunt bob | **Length** : chin length, one length, straight cut ends |
| Carré plongeant | Plus long devant | Angled bob | **Length** : reaching the chin at the front, shorter at the nape, longer at the front |
| Carré flou | Mouvement, pointes effilées | Soft textured bob | **Length** : between the jaw and the collarbone, piecey ends, effortless movement |
| Carré bouclé | Arrondi sur boucles | Curly bob | **Length** : chin length, rounded silhouette shaped to the natural curls<br>**Texture** : natural curls |
| Mi-long en couches | Aux épaules, encadrant | Shoulder-length layered cut | **Length** : shoulder length<br>**Layers** : face-framing layers |
| Long en couches | Longueur gardée, mouvement | Long layered cut | **Length** : below the shoulder blades<br>**Layers** : soft face-framing layers |
| Long droit | Une longueur | Long one-length cut | **Length** : below the shoulder blades, one length, straight healthy ends |
| Frange rideau | Ouverte au milieu | Curtain bangs | **Length** : length kept<br>**Top** : middle part<br>**Front** : curtain bangs falling at cheekbone level |
| Shag | Couches marquées, volume | Shag cut | **Length** : textured ends<br>**Layers** : choppy layers on the crown<br>**Front** : a wispy fringe |
| Wolf cut | Couches et longueurs mêlées | Wolf cut | **Length** : longer wispy lengths at the back<br>**Layers** : heavy layers on top, shaggy texture |
| Butterfly cut | Long, couches courtes devant | Butterfly cut | **Length** : long length kept<br>**Layers** : short face-framing layers starting at the chin<br>**Top** : voluminous blow-dry |
<!-- /tableau:coupes -->

## 6. Réglages d'une coupe et leur traduction

Chaque réglage écrit dans UN emplacement. Laissé à la valeur de la coupe, il garde le texte de la coupe. Modifié, il remplace ce texte. Une coupe ne préremplit que ce que ses zones affirment : un réglage qu'elle ne précise pas reste vide. Une caractéristique choisie dans le même emplacement remplace le réglage (section 4.5).

<!-- tableau:reglages -->
#### Mode barber

| Réglage | Emplacement | Options (texte anglais) |
|---|---|---|
| Côtés | Sides / style | Dégradé à blanc (`skin fade`) · Dégradé (`fade`) · Taper (`low taper`) · Ciseaux (`cut with scissors, no clipper fade`) |
| Hauteur | Sides / style | Bas (`low`) · Mi (`mid`) · Haut (`high`) |
| Sabot du bas | Sides / sabot | 0 (`starting at clipper guard 0 at the bottom`) · 0,5 (`starting at clipper guard 0.5 at the bottom`) · 1 (`starting at clipper guard 1 at the bottom`) · 1,5 (`starting at clipper guard 1.5 at the bottom`) · 2 (`starting at clipper guard 2 at the bottom`) · 3 (`starting at clipper guard 3 at the bottom`) |
| Dessus | Top / longueur | curseur 1-15 cm (`about X cm`) |
| Coiffage, devant et frange | Front / style | Vers l’avant (`styled forward`) · Relevé (`lifted up`) · Sur le côté (`swept to the side`) · En arrière (`pushed back`) |
| Coiffage, dessus | Top / style | En arrière (`styled back`) · Sur le côté (`styled to the side`) · Naturel (`natural, unstyled`) · Décoiffé (`messy and textured`) |
| Contours | Neckline / contours | Nets (`sharp line-up`) · Naturels (`natural soft hairline edges`) |
| Barbe | Beard / style | Inchangée (rien) · Taillée courte (`trimmed short and neat`) · Entretenue (`well-groomed with clean cheek lines`) · Rasée (`clean-shaven`) |

#### Mode salon

| Réglage | Emplacement | Options (texte anglais) |
|---|---|---|
| Longueur | Length / longueur | Menton (`chin`) · Épaules (`shoulder`) · Omoplates (`shoulder-blade`) · Milieu du dos (`mid-back`), curseur 10-60 cm (`X length, about Y cm`) |
| Forme | Length / forme | Droite (`blunt one-length ends`) · Plongeante (`angled, longer at the front`) · Arrondie (`rounded shape`) |
| Couches | Layers / couches | Aucune (`no layers`) · Légères (`light layers`) · Marquées (`strong layers`) |
| Frange | Front / style | Sans (`no fringe`) · Rideau (`curtain bangs`) · Droite (`straight blunt fringe`) · Effilée (`wispy fringe`) |
| Raie | Top / raie | Milieu (`middle part`) · Côté (`side part`) · Naturelle (rien) |
| Couleur | Color / couleur | Inchangée (rien) · Balayage (`change to a soft natural balayage`) · Autre (`change to X`) |
<!-- /tableau:reglages -->

- **Côtés en dégradé** (Dégradé à blanc ou Dégradé, décision du 16 novembre) : le réglage « Hauteur » (Bas / Mi / Haut) apparaît, préréglé par la coupe. Sides s'écrit « <low|mid|high> <skin fade|fade>, from guard X at the bottom to guard Y at the top ». X = sabot du bas ; Y vient de la coupe (`sabotHaut`, 2 par défaut ; omis si Y ≤ X). Changer le sabot du bas ne remplace que X. Sabot 0 = skin fade (« dégradé à blanc »), sinon fade (« dégradé ») : les boutons Côtés et Sabot se mettent d'accord tout seuls, et le nom suit (le skin fade devient « Fade » / « Dégradé » dès que le sabot n'est pas 0).
- Longueur (salon) : curseur 10-60 cm et repères liés (menton jusqu'à 27 cm, épaules jusqu'à 39, omoplates jusqu'à 52, milieu du dos au-delà). Texte : « chin length, about 22 cm ».
- Barbe seule : choix à part dans le groupe Barbe (section 4.5).
- Le coiffage se choisit par zone (décision d'Antoine du 14 novembre), en mode barber. Le mode salon garde Frange et Raie, qui jouent ce rôle.
- Une couleur autre que « Inchangée » écrit clairement le changement (« change to … »), puisque le prompt image garde la couleur d'origine sinon.

Le diagnostic reçoit `[COUPE]` = nom français + résumé français (ex. « Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue »). Le résumé donne le nom, puis, dans l'ordre des zones, les mesures (sabot, dessus, longueur) toujours, les autres réglages s'ils sont modifiés, et les caractéristiques. Un réglage remplacé n'y figure pas.

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
- **Changement léger** : longueur demandée dans la même classe que la longueur actuelle (courte / moyenne / longue). « Changement léger : le rendu sera peu visible. »

## 8. Catalogue fond (remplace l'ancien écran Fond)

But : un coiffeur rend une photo DÉJÀ PRISE plus belle pour Instagram, SANS JAMAIS modifier les cheveux ni la personne. Indépendant de la coupe. La liste des retouches vit dans `fonds.js` (nom français, famille, fragment anglais) : elle se complète selon les retours des pros.

Deux familles, clairement séparées.

### a) Retouches sans IA (dans l'appli, sur canvas, cheveux intacts garantis)

Luminosité · Contraste · Chaleur (chaud / froid) · Noir et blanc · Recadrage 4:5 (post), 9:16 (story), 1:1 · Montage avant/après côte à côte.

- La photo est choisie dans le téléphone, traitée localement, jamais envoyée ni stockée. C'est la seule exception à « pas de photo dans l'appli » : aucune photo n'est fournie avec l'appli, et celle du coiffeur ne quitte pas son téléphone.
- Bouton « Enregistrer l'image ». L'image est aussi affichée en grand avec « appui long pour enregistrer », pour le cas où le téléchargement est bloqué.
- Mise en page à la manière de l'éditeur d'Instagram (décision du 15 novembre) : la photo reste fixée en haut de l'écran (45 % de la hauteur au plus) pendant qu'on règle ; seuls les réglages défilent dessous. Un réglage à la fois, choisi par une rangée de boutons (Luminosité, Contraste, Chaleur, N&B, Recadrage, Avant/après) ; le contrôle du réglage actif s'affiche sous la photo.
- Appui long sur la photo : l'original s'affiche tant qu'on appuie (même cadrage, sans lumière ni couleur retouchées), puis la photo retouchée revient.
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
6. **Test des prompts** : un test compare le texte de `prompts.js` aux blocs de `PROMPTS.md` (dont le diagnostic salon, vérifié comme le diagnostic barber avec les 4 seuls remplacements validés) et de la section 8 (mot pour mot, hors `[COUPE]`/`[FOND]`). Il doit passer avant toute livraison.
7. **Test de contraste** : un script vérifie que chaque paire texte/fond des 3 thèmes atteint 4,5:1.
8. **Test des contradictions** : pour chaque paire d'un même groupe exclusif (et chaque réglage remplacé par une caractéristique), le prompt final ne contient qu'une seule des deux consignes.
9. **Tableaux à jour** : `node tests/tableaux.js` vérifie que les tableaux de ce fichier correspondent aux fichiers de données (`--ecrire` les régénère).
10. **Test du retour arrière** : un test remplit le profil, choisit une coupe, change des réglages, revient 3 fois en arrière puis revient en avant, et vérifie que tous les choix sont toujours là.
11. Ne jamais dire « c'est corrigé » ou « ça marche » sans la preuve (capture, test qui passe).
12. Ne jamais modifier le texte d'un prompt de son propre chef. Proposer la modification à Antoine.

## 10. Hors périmètre V1

Pas de compte, pas de serveur, pas de génération d'image dans l'appli, pas de statistiques, pas de bibliothèque de composants externe, pas de photo de vraie personne fournie avec l'appli (catalogue et démos), pas d'envoi de photo : la photo du client reste dans Gemini, et la photo retouchée dans le Catalogue fond reste dans le téléphone.

## 11. Points ouverts à confirmer avec Antoine

- Le nom définitif de l'appli.
- Le prompt de fond (section 8) n'a jamais été testé. Trois retouches (« Lumière studio douce », « Corriger le contre-jour », « Retirer les cheveux coupés ») ne sont pas des changements de fond : elles tiennent mal dans la phrase « replace ONLY the background with [FOND] », et « Retirer les cheveux coupés » contredit « Keep the person 100% identical: … clothing ». À tester, et à réécrire si Gemini les ignore.
- Le prompt image dit de garder la barbe et la texture des cheveux à l'identique (« Everything else must stay identical: … beard », « Do not invent curls, straighten the hair… »). La zone Beard (hors barbe seule) et la zone Texture le contredisent : depuis le 16 novembre, la ligne d'exception (PROMPTS.md) le dit à Gemini. À tester sur de vraies photos. Elle ne se déclenche que sur un choix de l'utilisateur, pas pour le texte par défaut des coupes bouclées.
- Les « Strict rules » de l'étape Couleur (PROMPTS.md, 2b) ont été rédigées par Claude : à valider.
- Le découpage coupe → zones (section 5), les textes des réglages (section 6) et des caractéristiques (section 13) sont à relire.
- Le glissement depuis le bord gauche et l'appui long sur la photo n'ont pas été essayés sur un vrai iPhone.

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

Décidé par Antoine (15 novembre, deuxième revue) :
- Groupes de caractéristiques exclusifs, message « Garder X » / « Garder Y », une caractéristique remplace le réglage de sa zone.
- [COUPE] structurée par zone ; tableau coupe → zones à relire.
- Catalogue coupe et Catalogue personnalisé en cartes texte, sans silhouettes. « Autres coupes » ne répète pas les conseillées. Les pictogrammes des retouches IA restent.
- Retouches sans IA : photo fixée en haut, un réglage à la fois, appui long pour voir l'original.
- « Barbe seule (ne pas toucher aux cheveux) » dans le groupe Barbe.
- Thème barber : tout ce qui est sélectionné est en bleu `selection` ; le rouge est réservé au bouton principal.
- Diagnostic salon (PROMPTS.md, 1b) : le diagnostic avec 4 remplacements seulement.

Décidé par Antoine (16 novembre) :
- Réglage « Hauteur » du dégradé, sabot 0 = skin fade, sinon fade ; le sabot du bas ne remplace que X.
- Ligne d'exception barbe / texture à la fin du prompt image (PROMPTS.md).

Décidé par Antoine (15 novembre, ajustements) :
- La ligne d'exception ne vient que d'un choix de l'utilisateur, jamais du texte par défaut de la coupe ; accord « that change » / « those changes ».
- Préréglages de hauteur et de sabot du haut validés (skin fade mi, 0 → 2 ; crop texturé mi, 0,5 → 2 ; quiff mi, 1 → 3 ; dégradé bouclé mi, 0,5 → 2 ; mulet moderne bas, 1 → 3).

Décidé par Antoine (15 novembre, suite) :
- Coupe + couleur = 2 étapes (Image sans Color, puis Couleur sur l'image générée).
- Avertissement « Changement léger » quand la longueur demandée est proche de la longueur actuelle.

Choix faits par Claude, à confirmer :
- **Étape Couleur** : « Strict rules » rédigées par Claude ; [COULEUR] sans « change to » ; placée entre Image et Fiche.
- **« Proche de la longueur actuelle »** : même classe de longueur (courte / moyenne / longue, seuils de l'avertissement Pousse).
- **Nom anglais du dégradé bouclé** : « Curly top with a fade », pour ne pas contredire la hauteur.
- **Côtés passés en dégradé sur une autre coupe** (ex. raie sur le côté) : hauteur Mi, sabot du haut 2.
- **Zones ajoutées** : Length, Layers et Texture, en plus de Sides, Top, Front, Neckline, Color, Beard. Ordre : Length, Layers, Sides, Top, Front, Neckline, Texture, Color, Beard.
- **Réglage modifié** : il remplace le texte de la coupe dans son emplacement (pour les côtés en dégradé, le sabot du bas ne remplace que X, voir section 6).
- **Côtés** : une caractéristique de côtés (rasé sur un côté, undercut, dégradé à blanc) remplace aussi le sabot.
- **Moustache, bouc** : ils remplacent la barbe « Rasée » des réglages, pas les autres barbes.
- **Contours** : rangés dans la zone Neckline (« Neckline: squared, sharp line-up »).
- **Messages souples supprimés** : « frange courte + dessus relevé » et « raie marquée + dessus décoiffé » ne sont plus signalés ; seuls les groupes d'Antoine comptent.
- **Appui long** : l'original garde le cadrage choisi, pour que la photo ne saute pas.
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

Chaque caractéristique choisie écrit son texte anglais dans son emplacement de [COUPE] (section 5) et y remplace la coupe et les réglages. Plusieurs caractéristiques compatibles d'un même emplacement s'écrivent ensemble. Sans coupe de départ, [COUPE] commence par « Custom haircut ». Dans le diagnostic, `[COUPE]` reçoit les noms français (« Coupe personnalisée : … » s'il n'y a pas de coupe de départ). La liste vit dans `caracteristiques.js`.

<!-- tableau:caracteristiques -->
| Catégorie | Caractéristique | Emplacement | Texte anglais | Groupe exclusif |
|---|---|---|---|---|
| Côtés | Rasé sur un côté | Sides / style (vide aussi Sides / sabot) | `one side shaved very short, the other side kept longer` | côtés |
| Côtés | Undercut | Sides / style (vide aussi Sides / sabot) | `undercut, clipped short and disconnected from a longer top` | côtés |
| Côtés | Dégradé à blanc | Sides / style (vide aussi Sides / sabot) | `skin fade` | côtés |
| Côtés | Tempes dégagées | Sides / en plus | `clean tapered temples` | — |
| Côtés | Trait rasé (motif) | Sides / en plus | `a thin shaved line design on one side` | — |
| Devant et dessus | Mèche sur le côté | Front / style | `a side-swept lock` | — |
| Devant et dessus | Mèche longue devant | Front / style | `a long strand falling over the forehead` | frange |
| Devant et dessus | Frange courte droite | Front / style | `a short straight fringe` | frange |
| Devant et dessus | Frange rideau | Front / style | `curtain bangs parted in the middle` | frange |
| Devant et dessus | Dessus relevé | Top / style | `lifted up with volume` | — |
| Devant et dessus | Dessus décoiffé | Top / style | `messy and textured` | — |
| Devant et dessus | Raie marquée | Top / raie | `a defined hard part line` | — |
| Devant et dessus | Couches | Layers / couches | `visible layers` | — |
| Couleur | Mèches blondes | Color / couleur | `change to blonde highlights` | couleur |
| Couleur | Balayage | Color / couleur | `change to a soft natural balayage` | couleur |
| Couleur | Pointes décolorées | Color / couleur | `change to bleached tips` | couleur |
| Couleur | Platine | Color / couleur | `change to full platinum blonde` | couleur |
| Couleur | Reflets cuivrés | Color / couleur | `change to copper tones` | couleur |
| Couleur | Poivre et sel gardé | Color / couleur | `natural salt-and-pepper grey kept, no coloring` | couleur |
| Couleur | Couleur libre | Color / couleur | `change to ` + le texte saisi | couleur |
| Texture | Boucles définies | Texture / texture | `defined curls` | texture |
| Texture | Ondulations | Texture / texture | `soft waves` | texture |
| Texture | Permanente | Texture / texture | `permed curls` | texture |
| Texture | Lissé | Texture / texture | `straightened and sleek` | texture |
| Texture | Twists | Texture / texture | `short twists` | texture |
| Texture | Vanilles | Texture / texture | `two-strand twists` | texture |
| Barbe | Taillée courte | Beard / style | `trimmed short and neat` | barbe |
| Barbe | Dégradé dans la barbe | Beard / style | `faded into the sideburns` | barbe |
| Barbe | Rasée | Beard / style | `clean-shaven` | barbe ; pas avec moustache, bouc |
| Barbe | Moustache | Beard / en plus (remplace la barbe « Rasée » des réglages) | `a neat moustache` | pas avec barbe-rasee |
| Barbe | Bouc | Beard / en plus (remplace la barbe « Rasée » des réglages) | `a goatee` | pas avec barbe-rasee |
| Nuque et contours | Nuque dégagée | Neckline / forme | `clean tapered nape` | nuque |
| Nuque et contours | Nuque arrondie | Neckline / forme | `rounded` | nuque |
| Nuque et contours | Nuque carrée | Neckline / forme | `squared` | nuque |
| Nuque et contours | Contours nets | Neckline / contours | `sharp line-up` | — |
<!-- /tableau:caracteristiques -->

Une caractéristique de couleur écrit clairement le changement (« change to … »), puisque le prompt image garde la couleur d'origine sinon. « Poivre et sel gardé » n'est pas un changement.

### Groupes exclusifs (décision d'Antoine du 15 novembre)

Une seule caractéristique par groupe. En choisir une deuxième ouvre un message « Garder X » / « Garder Y ».

<!-- tableau:groupes -->
| Groupe | Caractéristiques exclusives entre elles |
|---|---|
| côtés | rasé sur un côté / undercut / dégradé à blanc |
| frange | frange courte droite / frange rideau / mèche longue devant |
| couleur | platine / mèches blondes / balayage / pointes décolorées / reflets cuivrés / poivre et sel gardé / couleur libre |
| texture | lissé / boucles définies / ondulations / permanente / twists / vanilles |
| barbe | rasée / taillée courte / dégradé dans la barbe |
| nuque | nuque dégagée / nuque arrondie / nuque carrée |
| barbe (paire) | rasée / moustache |
| barbe (paire) | rasée / bouc |
<!-- /tableau:groupes -->

« Barbe seule » sur Oui avec des caractéristiques hors barbe : un message dit qu'elles ne partent pas dans le prompt.

## 14. V2 et V3 (plus tard, NE PAS faire maintenant)

- Génération d'image directe dans l'appli via l'API Gemini, derrière un petit serveur qui garde la clé (hook `generateImage`).
- Connexion et comptes.
- Catalogue propre à chaque coiffeur.
- Photos de vraies coupes du salon (anciens clients, avec leur consentement écrit) à la place des cartes texte du Catalogue coupe.
- Pages RGPD et mentions légales.
- Statistiques d'usage, bibliothèque de composants externe.

### Vision : tout dans l'appli, sans copier-coller

Après les réglages, l'appli ouvre l'appareil photo, on prend la ou les photos, elles partent directement à l'IA et le résultat (diagnostic, image, fiche) revient dans l'appli, sans copier-coller ni quitter l'appli.

Ce que la V1 prépare déjà pour s'y brancher sans tout refaire :
- `etapesResultat()` (app.js) renvoie les étapes sous forme de données : `{ id, titre, consigne, texte, joindre }`, où `id` vaut `diagnostic`, `image` ou `fiche`, `texte` est le prompt final et `joindre` dit quelles photos envoyer, dans l'ordre (`selfie`, `reference`, `image-generee`). La V2 n'a qu'à parcourir cette liste.
- `generateImage(photo, prompt)` (app.js) est le point d'entrée prévu pour l'étape `image` ; le diagnostic et la fiche demanderont une fonction sœur (texte en sortie).
- L'affichage du Résultat lit ces mêmes étapes : il suffira d'afficher la réponse de l'IA à la place du bouton « Copier ».
- Les retouches IA du Catalogue fond suivent la même forme (un prompt + la photo à joindre).
