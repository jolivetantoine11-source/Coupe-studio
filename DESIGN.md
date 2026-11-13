# DESIGN.md — Coupe Studio

> Sources : règles de l'utilisateur + conseils du fil r/ClaudeAI « Tips for building apps w/ Claude » (choisir la direction avant le code, maquette avant appli, un seul jeu de composants, captures pour vérifier, un écran à la fois, contraste mesuré, relecteur adverse).

À lire en premier, à chaque session, avant de toucher à un écran.
Ces règles ont priorité sur toute idée de style. En cas de doute, ne pas inventer : copier l'écran existant le plus proche.

## 1. Principes

- Appli mobile d'abord (largeur 390 px), utilisée debout en boutique, à une main.
- Lisible en 2 secondes : un écran = une action principale.
- Un seul style d'écran à l'autre. L'écran n°7 doit ressembler à l'écran n°1.
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
- `principale` sert aux boutons et à l'élément actif, jamais au texte courant.
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

- **Bouton principal** : fond `principale`, hauteur 56, pleine largeur, un seul par écran.
- **Bouton secondaire** : contour 1 px `texte` à 15 %, fond transparent, hauteur 48.
- **Carte de coupe** (catalogue) : vignette silhouette dessinée (jamais de photo de vraie personne), nom, une ligne de description. Grille de 2 colonnes.
- **Champ / sélecteur** : fond `surface`, bordure 1 px, hauteur 48. Choix rapides en boutons à bascule plutôt qu'en listes déroulantes.
- **Barre d'onglets du bas** : 5 entrées max (Accueil, Catalogue, Recette, Client, Résultat), icône + libellé, l'actif en `principale`.
- **Bloc de prompt** (écran Résultat) : texte en police à chasse fixe, deux boutons : « Copier » puis « Ouvrir Gemini ». Après « Copier », le bouton affiche « Copié ».
- **Avertissement** (pousse, lissage, golfes) : bordure gauche 4 px `alerte`, texte `texte`. Jamais de rouge en aplat.

## 5. Icônes et images

- Icônes au trait, épaisseur 2 px, une seule famille.
- Silhouettes de coupes : même cadrage, même trait, une couleur (`texte`).
- Aucune photo de personne dans l'appli ni dans les démos sans consentement écrit.

## 6. Ton des textes

- Français, tutoiement côté coiffeur. Phrases courtes.
- Un bouton dit ce qu'il fait : « Copier », « Enregistrer », « Choisir cette coupe ».
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

1. **Maquette avant code.** Faire d'abord une page HTML statique des écrans (Accueil, Catalogue, Recette, Client, Fond, Résultat) dans les 3 thèmes. On la corrige jusqu'à validation, puis seulement on branche la logique.
2. **Un seul jeu de composants.** Chaque bouton, carte, champ et onglet vient d'une classe CSS unique (`.btn`, `.carte`, `.champ`, `.onglet`). Interdit de redéfinir un style sur un écran.
3. **Un écran à la fois.** Terminer et valider un écran avant le suivant. Jamais de « améliore toute l'interface ».
4. **Vérifier ce qui est construit.** Après chaque écran : capture à 390 px et à 1280 px, dans les 3 thèmes, comparée à la maquette. Corriger débordements et espacements.
5. **Relecteur adverse.** Un second regard (autre agent ou autre passe) juge la conformité à ce fichier : couleurs hors liste, espacement hors multiples de 8, ombre ou dégradé, taille de texte hors échelle. L'écran n'est validé que sans écart.
6. **Prouver avant d'affirmer.** « C'est corrigé » ou « les prompts sont identiques » se démontre : capture, test, comparaison de texte. Aucune mise en ligne sans aperçu.
7. **Prompts intacts.** Le texte des 4 prompts vit dans `prompts.js` et se compare mot pour mot aux fichiers Word d'origine avant publication.

## 11. Hors périmètre pour la V1

Pas de bibliothèque de composants externe (page unique, sans installation), pas de statistiques d'usage, pas de compte. À rouvrir pour la V2.
