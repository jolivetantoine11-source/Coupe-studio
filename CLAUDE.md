# CLAUDE.md — Coupe Studio (V1)

À lire au début de chaque session, avant toute ligne de code, avec `DESIGN.md` et `PROMPTS.md`.

Mise à jour « Diagnostic d'abord », étape 1 (19 novembre) : nouvel écran « Diagnostic · Photo » après l'Accueil (photo, accord, code si besoin, pré-diagnostic par l'IA qui remplit le profil). Le Profil client reste en pont temporaire jusqu'à l'étape 2 (sections 3, 4, 7, 11, 12 ; PROMPTS.md, 0).

Mise à jour V2, étape 1 (16 novembre) : génération dans l'appli par un Worker Cloudflare, seulement si `config.js` donne son adresse et si le code d'accès est saisi. Sans cela, la V1 est inchangée (sections 3, 4.8, 10, 12, 14 ; `docs/V2-installation.md`).

Mise à jour série contrôle (16 novembre) : densité faible (Density après le nom, pas de frange, dessus gardé), étape Texture à part (Image → Texture → Couleur), exception barbe « rules below » avant « Strict rules: », nouvelle consigne photo (sections 4.8, 5, 11, 12).

Mise à jour série 4 (tests d'Antoine) : Front par défaut, ligne Head pose et exception texture avant « Strict rules: », avertissements « Changement de texture » et « Rallongement » sur Résultat (sections 4.8, 5, 12).

Version du 16 novembre 2026 : hauteur du dégradé barber et ligne d'exception barbe / texture dans le prompt image (sections 6 et 4.8).

Version du 15 novembre 2026, après la deuxième revue d'Antoine : description [COUPE] structurée par zone, groupes de caractéristiques exclusifs, catalogues en texte, éditeur photo à la manière d'Instagram, option « Barbe seule », sélection en bleu dans le thème barber, diagnostic salon.

(Version du 14 novembre : parcours page par page, plus de barre d'onglets, profil client en premier, catalogue personnalisé, catalogue fond.)

## 1. Le projet en bref

Antoine, étudiant entrepreneur à Lyon, propose aux barbers et aux salons de coiffure un service d'essayage de coupes par IA. Le coiffeur prend un selfie du client, Gemini génère la photo avec la nouvelle coupe, puis une fiche technique.

**Coupe Studio** (nom provisoire) est l'outil du coiffeur. On décrit le client en quelques clics, on choisit une coupe dans un catalogue ou on la compose avec des caractéristiques, et l'appli produit les prompts prêts à copier dans Gemini. Un troisième outil, le Catalogue fond, embellit une photo déjà prise pour Instagram sans toucher aux cheveux.

- **V1** : site statique, sans serveur, sans compte. L'appli fabrique des prompts, l'utilisateur les colle dans l'appli Gemini.
- **V2, étape 1 (faite et activée le 16 novembre : `config.js` pointe sur `https://coupe-studio.coupestudio.workers.dev`)** : génération dans l'appli, par un Worker Cloudflare qui garde la clé Gemini. Elle ne s'active que si `config.js` donne l'adresse du Worker et si le coiffeur a saisi le code d'accès du salon. Sinon l'appli reste en V1, à l'identique. Voir sections 4.8 et 14.

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
  - `config.js` : l'adresse du Worker (V2), en place depuis le 16 novembre. Vide = retour à la V1. Jamais de clé ni de code d'accès ici.
  - `worker/` : le Worker Cloudflare de la V2 (`src/index.js`, `wrangler.toml`, `test.mjs`). Les secrets `GEMINI_API_KEY` et `ACCES` sont dans Wrangler, jamais dans le dépôt.
  - `docs/V2-installation.md` : les étapes d'installation pour Antoine
  - `tests/` : tests Playwright (captures, contrastes, comparaison des prompts, parcours, retour arrière, contradictions) et `tests/tableaux.js`, qui écrit et vérifie les tableaux de ce fichier
- Polices via Google Fonts (Space Grotesk, Fraunces, Oswald, Inter), avec polices de secours.
- Stockage :
  - `sessionStorage` : l'état du client en cours (profil, coupe, réglages, caractéristiques, retouches).
  - `localStorage` : le mode, les coupes personnalisées enregistrées, les coupes ajoutées et, en V2, le code d'accès du salon.
  - En mémoire seulement (V2) : la photo du client, la photo de référence, l'accord et les résultats générés. Ils survivent au retour arrière, pas au rechargement.
  - Toujours dans un `try/catch`. L'appli doit marcher si le stockage est vide ou bloqué.
- Hébergement : GitHub Pages (dépôt `jolivetantoine11-source/Coupe-studio`, branche `main`). L'appli doit aussi marcher en ouvrant `index.html` en local.
- V2 : `generateImage(photos, prompt)` et `genererTexte(photos, prompt)` (app.js) appellent le Worker. Sans adresse de Worker, elles renvoient une erreur claire et aucun bouton ne les appelle.

## 4. Parcours et pages

Il n'y a plus de barre d'onglets. L'appli est un parcours page par page, comme une appli native.

Parcours visé (« Diagnostic d'abord », décision d'Antoine du 19 novembre), construit une étape à la fois :
Accueil → Diagnostic · Photo → Diagnostic · Questions → Diagnostic · Propositions → (Réglages ou Résultat). « Que veux-tu faire ? » reste accessible par « Voir les catalogues » sur l'écran Propositions. L'étape 1 (Photo) est faite ; en attendant l'étape 2, l'écran Profil client sert de pont.

Parcours actuel :

```
Accueil
  → Diagnostic · Photo (bouton « Passer » possible)
  → Profil client, prérempli par le pré-diagnostic (pont temporaire, bouton « Passer » possible)
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
- Bouton principal : « Commencer » (« Continuer » si un client est en cours) vers Diagnostic · Photo.
- Bouton secondaire : « Nouveau client ».

### 4.1b Diagnostic · Photo (étape 1 du parcours « Diagnostic d'abord », 19 novembre)
- Libellé « Diagnostic » au-dessus du titre « Photo du client », consigne photo en sous-titre.
- Bouton principal : « Prendre la photo » (appareil photo ou galerie), puis « Continuer ». Bouton secondaire : « Passer ». « Changer la photo » une fois la photo prise.
- Photo réduite à 1024 px, gardée en mémoire seulement. C'est la même photo qui sert ensuite à Résultat (V2) : pas de 2e prise.
- Si le Worker est réglé : case d'accord « Le client accepte que sa photo soit envoyée à Google pour l'essai. » (déplacée depuis la carte V2 de Résultat), et champ « Code d'accès du salon » seulement s'il n'est pas déjà enregistré (ou s'il vient d'être refusé). Une fois affiché, le champ reste là pendant la saisie et la correction (photo prise, case cochée, lettres effacées), jusqu'à ce que le Worker accepte le code ou qu'on quitte l'écran (correction du 19 novembre : il disparaissait à la première lettre).
- « Continuer » avec photo, Worker, code et accord : pré-diagnostic (PROMPTS.md, 0) envoyé à `/texte` avec `json: true`. Le JSON reçu remplit `etat.profil` (texture, visage, front, longueur, lunettes, plus peau, yeux, style, remarque). « long » devient « allonge », « fins » n'est gardé qu'en salon, une valeur absente, `null` ou inconnue ne change rien. Les règles (densité, chauve, avertissements…) ne changent pas : elles lisent ce profil comme si le coiffeur avait répondu. Une même photo n'est analysée qu'une fois.
- Pendant l'analyse : « Analyse en cours… » et une légende. « Passer » abandonne l'analyse.
- Erreur (code refusé, limite du jour, Google saturé, réponse illisible…) : message en français dans la page, suivi de « Touche « Continuer » pour réessayer, ou « Passer ». » ; on reste sur l'écran.
- Sans Worker, ou avec « Passer » : pas d'IA, le profil se remplit à la main.
- « Nouveau client » efface la photo, l'accord et le profil, et ramène à cet écran.

### 4.2 Profil client (pont temporaire jusqu'à l'étape 2)
- 5 questions maximum, en boutons à bascule (section 7). Retoucher une réponse la retire.
- Bouton principal « Continuer », bouton secondaire « Passer ». Les deux ouvrent « Que veux-tu faire ? ».

### 4.3 Que veux-tu faire ?
Trois gros boutons : « Catalogue coupe », « Catalogue personnalisé », « Catalogue fond », chacun avec une ligne d'explication.

### 4.4 Catalogue coupe
- Cartes texte compactes, grille de 2 colonnes : nom (police des titres du thème), une ligne de description, badges. Plus de silhouettes : on voit plus de coupes sans défiler.
- Si le profil est rempli : en haut, « Conseillées pour ce client », 3 coupes avec le badge « Conseillée » (règles en section 7). Puis « Autres coupes », SANS répéter les coupes conseillées.
- 12 coupes du mode actif (section 5). Thème neutre : 6 barber et 6 salon mêlées.
- Profil « Chauve / rasé » : seules les coupes sans longueur (buzz cut) restent actives ; les autres sont grisées avec « Impossible sans cheveux ». La barbe seule reste possible depuis les réglages du buzz cut. Une coupe déjà choisie avant n'est jamais effacée, et Réglages affiche l'avertissement « Impossible sans cheveux ».
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
- Profil « Chauve / rasé » : seules les caractéristiques de barbe restent actives ; les autres sont grisées avec « Impossible sans cheveux » (une carte déjà choisie reste touchable pour la retirer).
- **Groupes exclusifs** (section 13) : choisir une caractéristique d'un groupe déjà occupé ne l'ajoute pas tout de suite. Un message dans la page dit ce qui entre en conflit et propose « Garder X » / « Garder Y ». Jamais de `confirm()`.
- **RÈGLE : le prompt final ne contient jamais deux consignes contradictoires pour une même zone.** Une caractéristique remplace la coupe et les réglages de son emplacement ; un test le vérifie sur toutes les paires de chaque groupe.
- Bouton principal « Voir le résultat ».

### 4.7 Catalogue fond
Voir section 8. Une page d'entrée présente les deux familles, clairement séparées : « Retouches sans IA » et « Retouches IA ».

### 4.8 Résultat
Les étapes, dans l'ordre, chacune dans une carte :
1. **Diagnostic** : consigne photo « Tête droite, face à l'objectif. Si elle est tournée, Gemini la redresse. », consigne + bloc de prompt. Diagnostic barber ou diagnostic salon (PROMPTS.md, 1 et 1b) selon la coupe : le mode de la coupe, sinon le mode de l'accueil, sinon le choix Barber / Salon de la page.
2. **Image** : consigne + bloc. Si « Barbe seule » est sur Oui, la ligne de la variante barbe seule est ajoutée à la fin. Sinon, si l'utilisateur a choisi un changement de barbe (réglage modifié ou caractéristique), la ligne « Exception to the rules below… » de PROMPTS.md (« a beard change », « Apply only that change ») est placée juste avant « Strict rules: ». Sinon, le prompt image est inchangé. Le prompt image ne contient jamais la texture choisie par l'utilisateur (elle a son étape) ; le texte par défaut d'une coupe bouclée y reste. Sous le prompt image : « Résultat bizarre (tête tournée, frange en trop) ? Relance la génération. »
3. **Texture** (seulement si l'utilisateur a choisi une texture, décision du 16 novembre) : PROMPTS.md, 2a, sur l'image générée.
4. **Couleur** (seulement si une couleur est demandée, décision du 15 novembre) : coupe + couleur = 2 étapes. L'étape Image ne contient alors pas la zone Color ; l'étape Couleur (PROMPTS.md, 2b) applique la couleur sur la dernière image générée (après Texture s'il y en a une). « Poivre et sel gardé » n'est pas un changement : pas d'étape Couleur.
5. **Fiche** : fiche barber ou fiche salon, selon la même règle. Pour une coupe 100 % personnalisée en thème neutre, un choix Barber / Salon est proposé ; il vaut pour le diagnostic et la fiche.

Au-dessus des étapes, des avertissements (composant alerte) :
- **Changement de texture** (lissé, kératine, permanente, défrisage, boucles…, choisi par l'utilisateur, donc étape Texture) : « Vérifie que la tête et le visage n'ont pas bougé. Sinon, relance. »
- **Rallongement** (longueur demandée au-dessus de la longueur actuelle du profil) : « Environ 1 cm par mois de pousse. Sinon, extensions. »

Il n'y a plus d'étape Fond : le fond se retouche dans le Catalogue fond, indépendamment de la coupe.

**V2 : génération dans l'appli** (seulement si `config.js` donne l'adresse du Worker) :
- Une carte « Génération dans l'appli » apparaît au-dessus des étapes : champ « Code d'accès du salon » (gardé dans le téléphone), puis, une fois le code saisi, la consigne photo, la photo prise sur l'écran Diagnostic · Photo avec « Changer la photo du client », et « Photo de référence » si l'option est sur Oui. Sans photo ou sans accord, le bouton « Ajouter la photo du client » (ou « Cocher l'accord du client ») ramène à l'écran Diagnostic · Photo. La case d'accord n'est plus sur Résultat (19 novembre).
- Code saisi : chaque étape montre « Générer » à la place du prompt et de « Copier / Ouvrir Gemini ». Étape par étape seulement, pas de « Tout générer ».
- Une étape n'est prête que si ce qu'elle joint existe (`joindre`) : la photo du client, la photo de référence, ou `image-generee` = l'image de l'étape d'image juste avant (Image, puis Texture, puis Couleur). Sinon le bouton est bloqué et une légende dit ce qui manque (« Ajoute la photo du client. », « Coche l'accord du client. », « Génère d'abord l'étape Image. »).
- Résultat d'un texte (diagnostic, fiche) : le texte, « Copier », « Relancer ». Résultat d'une image : « Avant » (la photo du client) et « Après » côte à côte, « Relancer », « Enregistrer » (téléchargement, avec le rappel de l'appui long).
- Relancer une image, ou changer la coupe, marque les résultats qui en dépendent « À refaire ». Changer de photo efface les résultats.
- Photos réduites à 1024 px (JPEG) avant l'envoi. Jamais stockées : en mémoire seulement.
- Erreurs en français (réseau, délai, code refusé, limite du jour, Google saturé, refus de Gemini), toutes suivies de « Relance ou passe par Gemini (Copier). » ; le prompt et les boutons de la V1 reviennent alors sur l'étape.
- « Nouveau client » efface les photos, l'accord et les résultats. Le code d'accès reste.

Sans adresse de Worker, ou sans code saisi, les cartes sont celles de la V1.

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
- **Density** (décision du 15 novembre, tests série 3 ; place et effets revus le 16 novembre, série contrôle) : si le profil dit Golfes marqués, Clairsemés ou Chauve / rasé :
  - la ligne « Density: use only the existing hair; keep the original thin density and receding hairline, scalp visible as in the original » vient juste après le nom de la coupe (en barbe seule, qui n'a pas de nom, elle reste après « Beard: … ») ;
  - Front est forcé au texte par défaut ci-dessous, même si la coupe, un réglage ou une caractéristique demande une frange ou une mèche ;
  - la longueur du dessus (Top / longueur) devient « kept at the current length, no added volume », même sans Top dans la coupe (salon). Exceptions choisies par Claude : le buzz cut garde sa tondeuse (c'est sa définition et il ne rallonge rien) ; un coiffage du dessus « avec volume » (« Dessus relevé », « voluminous blow-dry » du butterfly) est retiré, pour ne pas contredire « no added volume ».
- **Texture choisie** (16 novembre, série contrôle) : elle ne part plus dans [COUPE] mais dans l'étape Texture. La ligne Head pose de la série 4 est supprimée (le prompt Texture a sa règle de pose).
- **Front toujours écrit** (décision du 15 novembre) : sans frange, mèche ni coiffage du devant (coupe, réglage ou caractéristique), Front = « no fringe, no bangs, no curtain bangs, forehead uncovered as in the original ». Barber et salon, coupe 100 % personnalisée comprise.
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

Le profil se remplit en premier, mais reste facultatif : par le pré-diagnostic de la photo (page 4.1b) ou à la main (page 4.2). Le pré-diagnostic ajoute peau, yeux, style et remarque, qui ne servent encore à aucune règle (ils serviront aux questions et aux propositions des étapes 2 et 3).

Questions (une ligne chacune, boutons à bascule) :
- Texture : Lisses · Ondulés · Bouclés · Crépus
- Visage : Ovale · Rond · Carré · Allongé · Cœur (Cœur ajouté le 19 novembre pour le pré-diagnostic ; aucune règle de coupes conseillées ne s'en sert encore)
- Ligne frontale et densité : Normale · Golfes légers · Golfes marqués · Clairsemés · Chauve / rasé · Cheveux fins (salon)
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
- **Impossible sans cheveux** : profil Chauve / rasé et coupe avec longueur. « Sur une tête chauve ou rasée, seuls le buzz cut et la barbe seule sont possibles. »
- **Décoloration** : couleur fantaisie ou fort éclaircissement (platine, mèches blondes, pointes décolorées, couleur libre contenant blond, platinum, silver, grey, pastel, pink, blue, green, purple…). « Sur cheveux foncés : nécessite une décoloration, souvent en plusieurs séances. » Aussi affiché dans le Catalogue personnalisé.
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
5b. **Tests de la V2** : `node tests/photo.test.js` (écran Diagnostic · Photo, pré-diagnostic, erreurs, « Passer », sans Worker), `node worker/test.mjs` (le Worker seul : origine, code, quota, erreurs, rien dans les journaux) et `node tests/v2.test.js` (parcours complet dans l'appli avec le vrai code du Worker et un Google simulé). La section L de `tests/parcours.test.js` vérifie que la V1 est intacte sans Worker.
6. **Test des prompts** : un test compare le texte de `prompts.js` aux blocs de `PROMPTS.md` (dont le diagnostic salon, vérifié comme le diagnostic barber avec les 4 seuls remplacements validés) et de la section 8 (mot pour mot, hors `[COUPE]`/`[FOND]`). Il doit passer avant toute livraison.
7. **Test de contraste** : un script vérifie que chaque paire texte/fond des 3 thèmes atteint 4,5:1.
8. **Test des contradictions** : pour chaque paire d'un même groupe exclusif (et chaque réglage remplacé par une caractéristique), le prompt final ne contient qu'une seule des deux consignes.
9. **Tableaux à jour** : `node tests/tableaux.js` vérifie que les tableaux de ce fichier correspondent aux fichiers de données (`--ecrire` les régénère).
10. **Test du retour arrière** : un test remplit le profil, choisit une coupe, change des réglages, revient 3 fois en arrière puis revient en avant, et vérifie que tous les choix sont toujours là.
11. Ne jamais dire « c'est corrigé » ou « ça marche » sans la preuve (capture, test qui passe).
12. Ne jamais modifier le texte d'un prompt de son propre chef. Proposer la modification à Antoine.

## 10. Hors périmètre

Pas de compte, pas de statistiques, pas de bibliothèque de composants externe, pas de photo de vraie personne fournie avec l'appli (catalogue et démos). La photo retouchée dans le Catalogue fond reste dans le téléphone.

En V1 (pas d'adresse de Worker) : pas de serveur, pas de génération dans l'appli, pas d'envoi de photo ; la photo du client reste dans Gemini. En V2 : la photo du client part au Worker puis à Google, seulement après la case d'accord, et n'est stockée nulle part.

## 11. Points ouverts à confirmer avec Antoine

- Le nom définitif de l'appli.
- Pré-diagnostic : prompt validé par Antoine (19 novembre), jamais essayé sur le vrai Gemini. `[RÉFÉRENTIEL]` est vide en attendant le référentiel de son associé. Il faut relancer `npx wrangler deploy` pour que le Worker demande une réponse JSON à Google (sans cela, l'appli lit quand même le JSON dans le texte).
- V2 : le Worker n'a jamais appelé le vrai Gemini (pas de clé ici). Il est écrit d'après la doc Google AI lue le 16 novembre 2026 (API Interactions) et testé avec un Google simulé. Le premier essai d'Antoine est le vrai test.
- V2 : modèle de texte `gemini-4-hydrogen` choisi par Claude (stable, le moins cher) ; `gemini-4-argon` est plus fin et plus cher. Les consignes de la V1 parlent encore du « modèle 3.1 Pro ».
- V2 : les alternatives proposées par le diagnostic ne sont pas reprises automatiquement dans le prompt image.
- Le prompt de fond (section 8) n'a jamais été testé. Trois retouches (« Lumière studio douce », « Corriger le contre-jour », « Retirer les cheveux coupés ») ne sont pas des changements de fond : elles tiennent mal dans la phrase « replace ONLY the background with [FOND] », et « Retirer les cheveux coupés » contredit « Keep the person 100% identical: … clothing ». À tester, et à réécrire si Gemini les ignore.
- Le prompt image dit de garder la barbe et la texture à l'identique. Un changement de barbe choisi est signalé par la ligne d'exception (avant « Strict rules: ») ; une texture choisie part dans l'étape Texture. Le texte par défaut des coupes bouclées (« natural curls ») reste dans le prompt image, sans exception : à tester sur cheveux lisses.
- L'étape Texture (PROMPTS.md, 2a) n'a pas encore été testée sur de vraies photos.
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

Décidé par Antoine (15 novembre, tests série 3) :
- Densité : « Clairsemés » et « Chauve / rasé » ; ligne Density dans [COUPE] ; tête chauve = buzz cut, barbe seule et caractéristiques de barbe seulement.
- Avertissement décoloration pour une couleur fantaisie ou un fort éclaircissement.

Décidé par Antoine (15 novembre, suite) :
- Coupe + couleur = 2 étapes (Image sans Color, puis Couleur sur l'image générée).
- Avertissement « Changement léger » quand la longueur demandée est proche de la longueur actuelle.

Décidé par Antoine (15 novembre, série 4) :
- Front par défaut : « no fringe, no bangs, no curtain bangs, forehead uncovered as in the original ».
- Changement de texture : ligne Head pose dans [COUPE], ligne d'exception avant « Strict rules: », avertissement « Changement de texture » sur Résultat. (remplacé le 16 novembre : étape Texture)
- Avertissement « Rallongement » sur Résultat.

Décidé par Antoine (16 novembre, série contrôle) :
- Densité faible : Density juste après le nom, Front forcé sans frange, dessus « kept at the current length, no added volume ».
- Texture = étape séparée, comme Couleur ; ordre Image → Texture → Couleur ; plus de texture ni de Head pose dans le prompt image.
- Exception barbe : « Exception to the rules below », placée avant « Strict rules: ».
- Consigne photo : « Tête droite, face à l'objectif. Si elle est tournée, Gemini la redresse. »

Décidé par Antoine (16 novembre, V2 étape 1) :
- Génération dans l'appli par un Worker Cloudflare ; le mode V1 ne change pas.
- Modèle d'image : la version stable recommandée par Google, pas une preview (`gemini-nano-banana-2.1`).
- Quota : 30 images et 60 textes par jour et par code, compté dans Cloudflare KV (empreinte du code, date, nombre ; effacé au bout de 2 jours).
- Étape par étape seulement, pas de « Tout générer ».
- Case d'accord obligatoire avant la première génération. Facturation activée sur la clé.

Décidé par Antoine (19 novembre, « Diagnostic d'abord », étape 1) :
- Parcours Accueil → Diagnostic · Photo → Questions → Propositions ; le Profil client disparaîtra à l'étape 2 (pont temporaire en attendant).
- Écran Photo : photo, case d'accord (déplacée depuis Résultat), « Passer », code demandé seulement s'il n'est pas enregistré.
- Pré-diagnostic en JSON qui remplit le profil, sans changer les règles ; prompt validé, avec les lignes « Ignore the background… » et l'emplacement `[RÉFÉRENTIEL]`.

Choix faits par Claude, à confirmer :
- **Diagnostic · Photo** : sans Worker, la photo peut être prise mais rien n'est envoyé et l'accord n'est pas demandé ; le bouton principal fait « Prendre la photo » puis « Continuer » (pas de bouton principal bloqué) ; en cas d'erreur on reste sur l'écran ; un `null` de l'IA n'efface pas une réponse donnée à la main ; le pré-diagnostic compte pour 1 texte dans le quota ; aperçu limité à 32 % de la hauteur pour garder l'accord et les messages en vue ; le prompt est placé à la fin de PROMPTS.md (« 0. Pré-diagnostic ») pour ne pas décaler les autres blocs.
- **V2** : `POST /image` prend un tableau `photos` (la variante photo de référence en envoie 2) ; `GET /etat` donne le quota restant, pour vérifier l'installation ; seules les réponses réussies comptent dans le quota ; `store: false` côté Google ; journaux Cloudflare coupés ; une demande sans en-tête Origin est refusée ; « Avant » montre toujours la photo du client ; l'accord vaut pour un client (remis à zéro par « Nouveau client ») ; délai de 90 s.
- **Densité faible** : le buzz cut garde sa tondeuse au lieu de « kept at the current length » ; un coiffage du dessus avec volume est retiré ; la ligne Top est écrite aussi en salon. En barbe seule, Density reste après Beard.
- **Étape Texture** : seulement pour une texture choisie par l'utilisateur ; le texte par défaut du dégradé bouclé et du carré bouclé reste dans le prompt image. Consigne de l'étape Couleur : « À envoyer après l'étape précédente (Image, ou Texture s'il y en a une), en joignant la dernière image générée. »
- **Kératine et Défrisage** ajoutés aux caractéristiques de texture (groupe exclusif texture), pour couvrir la liste d'Antoine.
- **Décoloration** : le profil ne demande pas la couleur actuelle des cheveux (5 questions au plus) ; l'avertissement dit donc « Sur cheveux foncés : … » au lieu de deviner. Couleurs concernées : voir section 7.
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
| Texture | Kératine | Texture / texture | `keratin-smoothed, sleek and frizz-free` | texture |
| Texture | Défrisage | Texture / texture | `chemically relaxed and straightened` | texture |
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
| texture | lissé / boucles définies / ondulations / permanente / twists / vanilles / kératine / défrisage |
| barbe | rasée / taillée courte / dégradé dans la barbe |
| nuque | nuque dégagée / nuque arrondie / nuque carrée |
| barbe (paire) | rasée / moustache |
| barbe (paire) | rasée / bouc |
<!-- /tableau:groupes -->

« Barbe seule » sur Oui avec des caractéristiques hors barbe : un message dit qu'elles ne partent pas dans le prompt.

## 14. V2 et V3

### V2, étape 1 : faite (16 novembre)

Génération dans l'appli via l'API Gemini, derrière un Worker Cloudflare qui garde la clé. Installation : `docs/V2-installation.md`.

- **Worker** (`worker/src/index.js`) : `POST /image` `{ photos: [base64 JPEG…], prompt }` → `{ image, mime, reste }` ; `POST /texte` `{ photos, prompt }` → `{ texte, reste }` ; `GET /etat` → quota restant. Erreurs : `{ erreur: CODE }` avec ORIGINE, ACCES, QUOTA (+ `limite`), DEMANDE, REFUS, QUOTA_GOOGLE, DELAI, SERVEUR.
- **Sécurité** : secrets Wrangler `GEMINI_API_KEY` et `ACCES` (codes séparés par des virgules) ; CORS limité à `https://jolivetantoine11-source.github.io` ; en-tête `X-Acces` ; 30 images et 60 textes par jour et par code (heure de Paris).
- **Rien de stocké** : ni photo, ni prompt, ni réponse ; le KV ne garde que des compteurs ; journaux coupés ; `store: false` chez Google.
- **API Google** : « Interactions API » (`POST https://generativelanguage.googleapis.com/v1beta/interactions`, en-têtes `x-goog-api-key` et `Api-Revision: 2026-05-20`). Modèles dans `worker/wrangler.toml` : `gemini-nano-banana-2.1` (image, stable, recommandé) et `gemini-4-hydrogen` (texte). Doc lue le 16 novembre 2026 ; à relire avant de changer de modèle.
- **Appli** : voir section 4.8.

### Plus tard (NE PAS faire maintenant)

- Enchaînement automatique (« Tout générer ») et reprise des alternatives du diagnostic dans le prompt image.
- Retouches IA du Catalogue fond générées dans l'appli (même forme : un prompt + la photo à joindre).
- Connexion et comptes.
- Catalogue propre à chaque coiffeur.
- Photos de vraies coupes du salon (anciens clients, avec leur consentement écrit) à la place des cartes texte du Catalogue coupe.
- Pages RGPD et mentions légales (plus urgentes depuis que la photo part à Google).
- Statistiques d'usage, bibliothèque de composants externe.

### Vision : tout dans l'appli, sans copier-coller

Après les réglages, l'appli ouvre l'appareil photo, on prend la ou les photos, elles partent directement à l'IA et le résultat (diagnostic, image, fiche) revient dans l'appli, sans copier-coller ni quitter l'appli.

Ce que la V2, étape 1, utilise déjà :
- `etapesResultat()` (app.js) renvoie les étapes sous forme de données : `{ id, titre, consigne, texte, joindre }`, où `id` vaut `diagnostic`, `image`, `texture`, `couleur` ou `fiche`, `texte` est le prompt final et `joindre` dit quelles photos envoyer, dans l'ordre (`selfie`, `reference`, `image-generee`). La V2 parcourt cette liste.
- `generateImage(photos, prompt)` pour les étapes d'image, `genererTexte(photos, prompt)` pour le diagnostic et la fiche.
- L'affichage du Résultat lit ces mêmes étapes et montre la réponse à la place du prompt.

Reste à faire pour la vision complète : ouvrir l'appareil photo directement après les réglages, enchaîner sans toucher chaque étape, et brancher les retouches IA du Catalogue fond.
