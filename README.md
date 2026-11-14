# Coupe Studio (V1)

Montre la coupe avant de la faire. L'appli fabrique les prompts, tu les colles dans Gemini.

Site statique : aucun serveur, aucun compte, aucune installation. Rien ne quitte le téléphone.

## Le parcours

Accueil → Profil client (ou « Passer ») → Que veux-tu faire ?

- **Catalogue coupe** → Réglages → Résultat
- **Catalogue personnalisé** (caractéristiques) → Résultat
- **Catalogue fond** : retouches sans IA (dans l'appli) ou retouches IA (prompt pour Gemini)

Flèche en haut à gauche, glissement depuis le bord gauche ou bouton retour du téléphone : revenir en arrière n'efface jamais un choix. Seul « Nouveau client » remet tout à zéro.

## Ouvrir

En ligne : https://jolivetantoine11-source.github.io/Coupe-studio/

En local : double-clique sur `index.html`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure et pages |
| `styles.css` | Les 3 thèmes et les composants |
| `app.js` | Navigation, état du client, réglages, profil, génération des prompts |
| `prompts.js` | Les prompts, mot pour mot ceux de `PROMPTS.md` |
| `catalogue.js` | Les 24 coupes et leurs réglages |
| `caracteristiques.js` | Les caractéristiques du Catalogue personnalisé. **Pour en ajouter une : une ligne dans ce fichier.** |
| `fonds.js` | Les retouches du Catalogue fond. **Pour en ajouter une : une ligne dans ce fichier.** |
| `retouche.js` | Le calcul des retouches sans IA (canvas) |
| `tests/` | Tests et captures |
| `CLAUDE.md`, `DESIGN.md`, `PROMPTS.md`, `maquettes.html` | Références. Les tableaux de fragments français → anglais sont dans `CLAUDE.md`, sections 6, 8 et 13. |

## Tests

Les tests demandent Node et Playwright (une seule fois : `npm install` puis `npx playwright install chromium`).

| Commande | Ce qu'elle prouve |
|---|---|
| `node tests/prompts.test.js` | `prompts.js` est identique à `PROMPTS.md` et à `CLAUDE.md` section 8, caractère pour caractère |
| `node tests/retour.test.js` | Revenir en arrière (3 fois, puis en avant) ne perd aucun choix ; flèche, glissement, rechargement, « Nouveau client » |
| `node tests/parcours.test.js` | Tout le parcours marche : profil, coupes conseillées, réglages, caractéristiques, prompts, retouches photo |
| `node tests/contraste.test.js` | Chaque paire texte/fond des 3 thèmes atteint 4,5:1 |
| `node tests/design.test.js` | Aucun écart à `DESIGN.md` (couleurs, espacements, tailles, ombres, dégradés) |
| `node tests/captures.js` | Captures de chaque page à 390 et 1280 px, dans les 3 thèmes (`tests/captures/planches/`) |

`npm test` lance les cinq premiers.

## Modifier un prompt

Jamais directement dans `prompts.js`. Modifie `PROMPTS.md` (ou `CLAUDE.md` section 8 pour le fond), recopie le bloc dans `prompts.js`, puis lance `node tests/prompts.test.js`.
