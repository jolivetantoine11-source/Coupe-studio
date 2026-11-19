# DESIGN.md — Coupe Studio

> Sources : règles de l'utilisateur + conseils du fil r/ClaudeAI « Tips for building apps w/ Claude » (choisir la direction avant le code, maquette avant appli, un seul jeu de composants, captures pour vérifier, un écran à la fois, contraste mesuré, relecteur adverse).

À lire en premier, à chaque session, avant de toucher à un écran.
Ces règles ont priorité sur toute idée de style. En cas de doute, ne pas inventer : copier l'écran existant le plus proche.

## 1. Principes

- Appli mobile d'abord (largeur 390 px), utilisée debout en boutique, à une main.
- Lisible en 2 secondes : un écran = une action principale.
- Un seul style d'écran à l'autre. L'écran n°7 doit ressembler à l'écran n°1.
- Un parcours page par page, comme une appli native : pas de barre d'onglets. Une flèche retour en haut à gauche (sauf sur l'Accueil). Revenir en arrière n'efface jamais un choix.
- Sobre : pas de dégradés, pas d'ombres, pas d'emojis comme décor, sauf si ce fichier le dit.

## 2. Trois thèmes, une seule structure

Le thème change avec le mode choisi à l'accueil. Seuls changent : couleurs, police des titres, arrondi. Tout le reste (espacements, tailles, composants, mise en page) est identique.

| Thème | Quand | Ambiance |
|---|---|---|
| `neutre` | Accueil, établissement mixte | Propre, pro, sans genre |
| `salon` | Mode Salon | Doux, lumineux, élégant |
| `barber` | Mode Barber | Sombre, franc, atelier |

### Couleurs (5 par thème, nommées)

| Nom | neutre | salon | barber |
|---|---|---|---|
| `fond` | #F4F5F6 | #FBF8F7 | #F2F0EB |
| `surface` (cartes, champs) | #FFFFFF | #FFFFFF | #FFFFFF |
| `texte` | #14181B | #2E2321 | #111111 |
| `principale` (boutons, accent) | #0F5C6B | #A35A66 | #C8102E (rouge) |
| `alerte` (avertissements) | #B3261E | #B3261E | #B36B00 (ambre) |

Thème `barber` : style rétro de salon de barbier, fond blanc cassé et texte noir avec les couleurs de l'enseigne (rouge, blanc, bleu) ; bordures plus marquées (35 %). Il a une 6e couleur nommée `selection` (#2B59C3, bleu) pour les choix actifs (boutons à bascule), avec texte blanc ; onglet actif de la barre en bleu #2B59C3. Le rouge sert aux boutons principaux, l'ambre aux avertissements (le rouge ne signale jamais une alerte dans ce thème). Un bandeau de rayures en biais rouge / blanc / bleu (aplats, sans dégradé) orne le haut de chaque écran.

Règles de couleur :
- `principale` est réservée au **bouton principal**, jamais au texte courant.
- **Sélection uniforme** (décision du 15 novembre 2026) : tout ce qui est sélectionné ou actif (bouton à bascule, carte choisie, pastille, curseur, badge, contour de focus) utilise `selection`. En `neutre` et `salon`, `selection` = `principale` ; en `barber`, c'est le bleu #2B59C3. Le rouge du thème `barber` n'apparaît donc que sur le bouton principal (et dans le bandeau de rayures).
- Texte secondaire = `texte` à 70 % d'opacité. Bordures = `texte` à 15 %. Pas d'autre gris.
- Contrastes mesurés (WCAG, minimum 4,5:1) : texte/fond 16,4 · 14,4 · 16,6 ; bouton 7,0 · 4,7 · 5,9 ; bleu sur fond 5,5 (neutre · salon · barber). Toute nouvelle couleur doit être mesurée avant d'être ajoutée.
- Contraste texte/fond minimum 4,5:1. Le thème `barber` reste lisible en plein jour : texte noir sur blanc cassé, jamais de gris moyen.
- Texte sur bouton `principale` : `fond` du thème `neutre`/`salon`, blanc pour `barber`.
- Le fond derrière une photo générée ne change jamais le thème de l'appli.

### Typographie

| Rôle | neutre | salon | barber |
|---|---|---|---|
| Titres | Space Grotesk 600 | Fraunces 600 | Oswald 600, MAJUSCULES |
| Texte courant | Inter 400 / 500 | Inter 400 / 500 | Inter 400 / 500 |

Échelle (px) : 12 légende / 16 texte / 20 sous-titre / 28 titre d'écran. Pas d'autre taille.
Texte courant jamais sous 16 px. Interligne 1,5. Lignes de texte limitées à 65 caractères.

### Arrondi (un seul par thème, partout)

`neutre` 12 px · `salon` 16 px · `barber` 4 px.
Boutons, cartes, champs, vignettes : même valeur. Rien de pilule, rien de carré s'il n'est pas dans le thème.

## 3. Espacements

Multiples de 8 uniquement : 8, 16, 24, 32, 48.
- Marge latérale de l'écran : 16.
- Espace entre deux éléments liés : 8. Entre deux blocs : 24.
- Intérieur d'une carte : 16.
- Zone tactile minimum : 48 × 48.

## 4. Composants

- **Bouton principal** : fond `principale`, hauteur 56, pleine largeur, un seul par écran. Il vit dans une barre fixe en bas de la page : il reste visible même si la page défile.
- **Bouton secondaire** : contour 1 px `texte` à 15 %, fond transparent, hauteur 48.
- **Carte de coupe** (Catalogue coupe) : carte texte compacte, sans image : nom (16, police des titres du thème), une ligne de description en texte secondaire, badges. Grille de 2 colonnes. Carte choisie : bordure `selection`. (Les silhouettes ont été retirées le 15 novembre 2026 : plus de coupes visibles sans défiler. En V2/V3, de vraies photos du salon, avec consentement écrit.)
- **Carte de caractéristique** (Catalogue personnalisé) : la même carte texte, nom seul. Sélection multiple.
- **Carte de retouche** (Retouches IA) : la même carte, avec un pictogramme au trait au-dessus du nom. Seul catalogue qui garde des pictogrammes.
- **Badge** (« Conseillée ») : texte 12, graisse 500, couleur `selection`. Pas de fond, pas de pilule.
- **Avertissement court** (badge d'avertissement sur une carte de coupe) : bordure gauche 4 px `alerte`, texte 12, un ou deux mots (« Golfes », « Lissage nécessaire », « Pousse nécessaire »).
- **Message de conflit** (Catalogue personnalisé) : un avertissement (bordure gauche `alerte`) qui dit ce qui entre en conflit, suivi de deux boutons secondaires « Garder X » / « Garder Y ». Jamais de fenêtre du navigateur.
- **Réglage remplacé** (Réglages) : à la place des boutons du réglage, la phrase « Côtés remplacés par : rasé sur un côté » en texte secondaire et un bouton secondaire « Modifier ».
- **Gros bouton de choix** (page « Que veux-tu faire ? ») : une carte entière touchable, titre 20 dans la police des titres, une ligne d'explication en texte secondaire.
- **Champ / sélecteur** : fond `surface`, bordure 1 px, hauteur 48. Choix rapides en boutons à bascule plutôt qu'en listes déroulantes.
- **En-tête** : une bande en haut de chaque page sauf l'Accueil, avec la **flèche retour** à gauche (icône au trait, zone tactile 48 × 48, sans fond ni bordure). Il n'y a plus de barre d'onglets.
- **Éditeur photo** (Retouches sans IA), à la manière de l'éditeur d'Instagram : la photo est fixée en haut de la page, 45 % de la hauteur de l'écran au plus, arrondi du thème, aucun effet autour (ni ombre, ni cadre décoratif). Dessous, une rangée de boutons à bascule choisit l'outil (un seul actif), puis le contrôle de cet outil. Seule la partie sous la photo défile. Appui long sur la photo : l'original s'affiche tant qu'on appuie ; une légende 12 le rappelle.
- **Confirmation dans la page** (« Nouveau client ») : la question et deux boutons secondaires remplacent les boutons habituels. Jamais de fenêtre du navigateur.
- **Bloc de prompt** (écran Résultat) : texte en police à chasse fixe, deux boutons : « Copier » puis « Ouvrir Gemini ». Après « Copier », le bouton affiche « Copié ».
- **Avertissement** (pousse, lissage, golfes) : bordure gauche 4 px `alerte`, texte `texte`. Jamais de rouge en aplat.
- **Génération dans l'appli** (V2, écran Résultat, seulement si le Worker est réglé) : une carte avec le champ « Code d'accès du salon », la consigne photo, une **photo jointe** (vignette 48 × 48 à l'arrondi du thème, puis un bouton secondaire « Photo du client » / « Changer la photo du client ») et la case d'accord.
- **Diagnostic · Photo** (premier écran après l'Accueil) : petit libellé « Diagnostic » (12, texte secondaire) au-dessus du titre « Photo du client », la consigne photo en sous-titre. Une seule action : la photo. Le bouton principal dit « Prendre la photo », puis « Continuer » une fois la photo prise ; « Passer » en bouton secondaire. Dessous : l'aperçu de la photo (32 % de la hauteur de l'écran au plus, arrondi du thème), « Changer la photo », le champ du code d'accès s'il manque, la case d'accord (si le Worker est réglé), l'état de l'analyse (légende 12) et le message d'erreur (avertissement).
- **Diagnostic · Questions** : libellé « Diagnostic », titre « Ce que veut le client ». En haut, soit la carte « D'après la photo » (une **ligne de profil** par réponse), soit « Le client » et ses questions en boutons à bascule ; dessous « Ce qu'il veut » et ses 3 questions en boutons à bascule. Bouton principal « Voir les propositions », bouton secondaire « Voir les catalogues ».
- **Diagnostic · Propositions** : libellé « Diagnostic », titre « Propositions ». 3 **cartes de coupe** empilées (badge « Hors catalogue » s'il y a lieu, nom, ligne, pourquoi, puis le verdict : **badge** « Faisable », ou **avertissement court** « Après 4 mois de pousse » / « Avec lissage »), une seule sélectionnable (bordure `selection`). Bouton principal « Valider ce choix », puis « Variantes » ; bouton secondaire « Voir les catalogues ». Après validation : la carte choisie, agrandie (titre 20, ligne, pourquoi, détails en texte secondaire, « Croquis » en bouton secondaire bloqué avec la légende « Bientôt », lien « Essayer sur le client » en bouton secondaire), puis les 2 autres en **lignes de profil** (nom à gauche, « Changer » à droite). Attente : une légende 12 ; erreur : un avertissement au-dessus des cartes.
- **Ligne de profil** : un bouton pleine largeur, hauteur 48 au moins, contour 1 px `texte` à 15 %, arrondi du thème, fond transparent. Le nom à gauche en texte secondaire, la réponse à droite (graisse 500). Ouverte pour correction : contour `selection`, et ses réponses en boutons à bascule juste dessous.
- **Case d'accord** : une vraie case à cocher de 24 px, couleur `selection`, suivie de sa phrase. La ligne entière est tactile (48 de haut).
- **Résultat généré** (V2) : dans la carte de l'étape, à la place du bloc de prompt. Texte (diagnostic, fiche) : bloc à bordure 1 px sur `fond`, police courante, lisible en entier, puis « Copier » et « Relancer ». Image : « Avant » et « Après » côte à côte, légende 12 dessous, puis « Relancer » et « Enregistrer ». En cas d'erreur : un avertissement, puis le bloc de prompt habituel.
- **Bouton secondaire bloqué** : contour en tirets, texte secondaire. Une légende 12 dit ce qui manque (« Ajoute la photo du client. »).

## 5. Icônes et images

- Icônes au trait, épaisseur 2 px, une seule famille.
- Pictogrammes des retouches IA et des outils photo : même cadrage, même trait, une couleur (`texte`). Plus de silhouettes de coupes ni de pictogrammes de caractéristiques depuis le 15 novembre 2026 : les catalogues sont en texte.
- Aucune photo de personne dans l'appli ni dans les démos sans consentement écrit. Seule exception : dans le Catalogue fond, le coiffeur charge sa propre photo. Elle est traitée dans son téléphone, jamais envoyée ni stockée, et n'influence jamais le thème. En V2, la photo du client part à Google pour l'essai, seulement après la case d'accord ; elle n'est jamais stockée.

## 6. Ton des textes

- Français, tutoiement côté coiffeur. Phrases courtes.
- Un bouton dit ce qu'il fait : « Copier », « Enregistrer », « Choisir cette coupe ».
- Le mot « recette » n'est plus utilisé : on dit « coupe personnalisée ».
- Une erreur dit ce qui ne va pas et quoi faire.
- Vocabulaire du métier : sabot, dégradé, couches, frange, nuque. Pas de jargon IA affiché.

## 7. Interdits (sauf mention écrite ici)

- Dégradés, ombres portées, flou, effets de verre.
- Plus de 2 polices par thème, plus de 4 tailles de texte.
- Couleurs hors des 5 du thème.
- Animations longues. Transitions de 150 ms maximum.
- Nouveau composant sans l'avoir ajouté à la section 4.

## 8. Méthode pour chaque nouvel écran

1. Relire ce fichier.
2. Réutiliser un composant existant avant d'en créer un.
3. Utiliser uniquement les variables de thème (`--fond`, `--texte`, `--principale`, `--alerte`, `--surface`, `--rayon`), jamais une couleur écrite en dur.
4. Tester les 3 thèmes sur l'écran terminé.
5. Vérifier à 390 px de large, sans défilement horizontal.

## 9. Directions et références (choisies avant le code)

| Thème | Mood en une ligne | Titres + texte | Accent | À regarder (références visuelles) |
|---|---|---|---|---|
| `neutre` | Outil pro, calme et clair | Space Grotesk + Inter | Bleu pétrole #0F5C6B | Planity (clarté, lisibilité), Linear (sobriété) |
| `salon` | Magazine de coiffure, doux | Fraunces + Inter | Vieux rose #A35A66 | Pages produit Kérastase / Aveda (photo grande, texte aéré) |
| `barber` | Barbier rétro, blanc cassé et noir, rouge et bleu | Oswald + Inter | Blanc cassé et noir, rouge #C8102E, bleu #2B59C3 | Sites de barbershops à fond noir (type affiches, majuscules) |

Les références sont des sites à observer pour la densité, l'espacement et la typo. Antoine peut les remplacer par ses propres captures d'écran : une capture et « j'aime ça : l'espacement, la typo » valent mieux que « moderne et épuré ». Ne jamais copier une marque, seulement s'en inspirer.

## 10. Processus de travail (ordre obligatoire)

1. **Maquette avant code.** Faire d'abord une page HTML statique des écrans dans les 3 thèmes. On la corrige jusqu'à validation, puis seulement on branche la logique. `maquettes.html` reste la référence de style ; sa structure à onglets est dépassée depuis le 14 novembre 2026 (voir `CLAUDE.md`, section 4).
2. **Un seul jeu de composants.** Chaque bouton, carte, champ et onglet vient d'une classe CSS unique (`.btn`, `.carte`, `.champ`, `.onglet`). Interdit de redéfinir un style sur un écran.
3. **Un écran à la fois.** Terminer et valider un écran avant le suivant. Jamais de « améliore toute l'interface ».
4. **Vérifier ce qui est construit.** Après chaque écran : capture à 390 px et à 1280 px, dans les 3 thèmes, comparée à la maquette. Corriger débordements et espacements.
5. **Relecteur adverse.** Un second regard (autre agent ou autre passe) juge la conformité à ce fichier : couleurs hors liste, espacement hors multiples de 8, ombre ou dégradé, taille de texte hors échelle. L'écran n'est validé que sans écart.
6. **Prouver avant d'affirmer.** « C'est corrigé » ou « les prompts sont identiques » se démontre : capture, test, comparaison de texte. Aucune mise en ligne sans aperçu.
7. **Prompts intacts.** Le texte des 4 prompts vit dans `prompts.js` et se compare mot pour mot aux fichiers Word d'origine avant publication.

## 11. Hors périmètre pour la V1

Pas de bibliothèque de composants externe (page unique, sans installation), pas de statistiques d'usage, pas de compte. À rouvrir pour la V2.
