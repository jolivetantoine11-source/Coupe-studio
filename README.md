# Coupe Studio (V1)

Montre la coupe avant de la faire. L'appli fabrique les prompts, tu les colles dans Gemini.

Site statique : aucun serveur, aucun compte, aucune installation.

## Ouvrir

Double-clique sur `index.html`. C'est tout.

## Mettre en ligne (GitHub Pages)

Dans le dépôt GitHub : Settings, Pages, Source « Deploy from a branch », branche `main`, dossier `/ (root)`.
Netlify marche aussi : dépose le dossier tel quel.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure et les 6 écrans |
| `styles.css` | Les 3 thèmes et les composants |
| `app.js` | Navigation, recette, profil, génération des prompts |
| `prompts.js` | Les prompts, mot pour mot ceux de `PROMPTS.md` |
| `catalogue.js` | Les 24 coupes, les réglages, les fonds |
| `tests/` | Tests et captures |
| `CLAUDE.md`, `DESIGN.md`, `PROMPTS.md`, `maquettes.html` | Références. Les décisions prises en cours de route sont dans `CLAUDE.md`, section 12. |

## Tests

Les tests demandent Node et Playwright (une seule fois : `npm install` puis `npx playwright install chromium`).

| Commande | Ce qu'elle prouve |
|---|---|
| `node tests/prompts.test.js` | `prompts.js` est identique à `PROMPTS.md`, caractère pour caractère |
| `node tests/contraste.test.js` | Chaque paire texte/fond des 3 thèmes atteint 4,5:1 |
| `node tests/design.test.js` | Aucun écart à `DESIGN.md` (couleurs, espacements, tailles, ombres, dégradés) |
| `node tests/parcours.test.js` | Le parcours complet marche : mode, recette, profil, prompts, copie, enregistrement, partage |
| `node tests/captures.js` | Captures de chaque écran à 390 et 1280 px, dans les 3 thèmes (`tests/captures/planches/`) |

`npm test` lance les quatre premiers.

## Modifier un prompt

Jamais directement dans `prompts.js`. Modifie `PROMPTS.md`, recopie le bloc dans `prompts.js`, puis lance `node tests/prompts.test.js`.
