# V2 : installer la génération dans l'appli

But : le coiffeur touche « Générer » dans l'appli. Plus de copier-coller dans Gemini.

Comment ça marche : l'appli envoie la photo à un petit serveur (un « Worker » Cloudflare). Le Worker garde ta clé Gemini et appelle Google. La clé n'est jamais dans l'appli ni dans le dépôt.

Tant que tu n'as pas fait l'étape 7, l'appli reste en V1. Rien ne change pour les coiffeurs.

Durée : 20 minutes. Il faut un ordinateur (pas un téléphone).

## Ce qu'il te faut

- Ta clé Gemini (Google AI Studio), avec la facturation activée.
- Un compte Cloudflare gratuit.
- Node.js sur l'ordinateur. Pour vérifier :

```bash
node --version
```

S'il n'y a pas de numéro de version, installe Node.js depuis nodejs.org (version « LTS »).

## 1. La clé Gemini

1. Ouvre https://aistudio.google.com/apikey
2. Crée une clé, ou reprends la tienne.
3. Vérifie que la facturation est active sur ce projet. Le modèle d'image n'existe pas en offre gratuite.
4. Garde la clé sous la main. Ne l'envoie à personne. Ne la colle jamais dans un fichier du dépôt.

## 2. Le compte Cloudflare

1. Crée un compte sur https://dash.cloudflare.com/sign-up
2. L'offre gratuite suffit.

## 3. Récupérer le projet

```bash
git clone https://github.com/jolivetantoine11-source/Coupe-studio.git
```

```bash
cd Coupe-studio/worker
```

## 4. Connecter l'ordinateur à Cloudflare

```bash
npx wrangler login
```

Une page s'ouvre dans le navigateur. Clique sur « Allow ».

## 5. Créer le compteur de quota

```bash
npx wrangler kv namespace create QUOTAS
```

La commande affiche une ligne `id = "…"`. Copie cette suite de lettres et de chiffres.

Ouvre `worker/wrangler.toml`. Remplace `REMPLACE_PAR_L_ID_DU_KV` par cet id. Enregistre.

Ce compteur ne contient que des nombres : combien d'images et de textes par code et par jour. Aucune photo.

## 6. Mettre le Worker en ligne, puis les secrets

```bash
npx wrangler deploy
```

La commande affiche l'adresse du Worker. Elle ressemble à `https://coupe-studio.ton-compte.workers.dev`. Note-la.

Ensuite la clé Gemini :

```bash
npx wrangler secret put GEMINI_API_KEY
```

Colle ta clé quand la commande la demande, puis Entrée.

Puis les codes d'accès des salons :

```bash
npx wrangler secret put ACCES
```

Tape un code par salon, séparés par des virgules. Exemple : `barber-lyon-7421,salon-croix-rousse-3305`. Choisis des codes longs, difficiles à deviner.

Chaque code a droit à 30 images et 60 textes par jour.

## 7. Donner l'adresse à l'appli

Ouvre `config.js`, à la racine du projet. Mets l'adresse du Worker :

```js
window.CONFIG = {
  worker: 'https://coupe-studio.ton-compte.workers.dev'
};
```

Envoie la modification sur GitHub :

```bash
cd ..
```

```bash
git add config.js worker/wrangler.toml
```

```bash
git commit -m "V2 : adresse du Worker"
```

```bash
git push origin main
```

Le site se met à jour en 1 à 2 minutes. Tu peux aussi me donner l'adresse et l'id : je le fais pour toi.

## 8. Vérifier sans dépenser

Remplace l'adresse et le code par les tiens :

```bash
curl -H "Origin: https://jolivetantoine11-source.github.io" -H "X-Acces: barber-lyon-7421" https://coupe-studio.ton-compte.workers.dev/etat
```

Réponse attendue : `{"ok":true,"images":30,"textes":60}`.

- `{"erreur":"ACCES"}` : le code n'est pas dans le secret ACCES.
- `{"erreur":"ORIGINE"}` : l'en-tête Origin n'est pas celui du site.
- `{"erreur":"SERVEUR"}` : un secret ou le compteur manque (étapes 5 et 6).

## 9. Premier essai dans l'appli

1. Ouvre https://jolivetantoine11-source.github.io/Coupe-studio/
2. Choisis une coupe, va jusqu'à « Résultat ».
3. Une carte « Génération dans l'appli » est apparue. Saisis le code d'accès du salon.
4. Touche « Photo du client ». Prends la photo, tête droite.
5. Coche « Le client accepte que sa photo soit envoyée à Google pour l'essai. »
6. Touche « Générer » sur chaque étape, dans l'ordre.

Le code reste dans le téléphone. On ne le saisit qu'une fois.

**Ce premier essai est le vrai test.** Le Worker a été testé avec un Google simulé, d'après la doc de Google. Il n'a jamais appelé le vrai Gemini : je n'ai pas de clé. Si une étape affiche « Le service a rencontré un problème », dis-le-moi avec l'étape concernée.

## Au quotidien

**Ajouter ou retirer un salon.** Relance la commande et retape toute la liste des codes :

```bash
npx wrangler secret put ACCES
```

**Après une mise à jour du Worker** (par exemple la recherche web des propositions, 19 novembre) : récupère le projet à jour, puis relance :

```bash
npx wrangler deploy
```

**Changer les limites.** Dans `worker/wrangler.toml`, modifie `QUOTA_IMAGES` ou `QUOTA_TEXTES`, puis :

```bash
npx wrangler deploy
```

**Changer de modèle.** Même fichier, lignes `MODELE_IMAGE` et `MODELE_TEXTE`, puis `npx wrangler deploy`.

- Image : `gemini-nano-banana-2.1`. C'est la version stable que Google recommande (doc lue le 16 novembre 2026).
- Texte : `gemini-4-hydrogen`. Stable, le moins cher. Pour un diagnostic plus fin : `gemini-4-argon`, plus cher.

**Revenir à la V1.** Remets `worker: ''` dans `config.js` et pousse. Les boutons « Copier / Ouvrir Gemini » reviennent partout.

**Si la clé fuit.** Supprime-la dans AI Studio, crées-en une autre, et relance `npx wrangler secret put GEMINI_API_KEY`.

## Combien ça coûte

Prix de Google au 16 novembre 2026. À revérifier sur https://ai.google.dev/gemini-api/docs/pricing

- Une image : environ 0,03 $ (0,034 $ en taille 1K).
- Un diagnostic ou une fiche : environ 0,01 à 0,02 $ (cela dépend de la longueur de la réflexion du modèle).
- Un client complet (diagnostic, image, fiche) : environ 0,06 $. Avec texture et couleur : environ 0,13 $.
- Au maximum par salon et par jour (30 images, 60 textes) : environ 2 $.
- Propositions (recherche web de Gemini) : 5 000 recherches gratuites par mois, puis 14 $ les 1 000.
- Cloudflare : l'offre gratuite suffit pour démarrer. De mémoire, elle s'arrête vers 1 000 générations par jour, tous salons confondus (limite d'écritures du compteur). Au-delà : offre à 5 $ par mois. À vérifier sur le site de Cloudflare.

## Données et vie privée

- La photo du client part à Google, seulement après la case d'accord.
- Le Worker ne garde rien : ni photo, ni prompt, ni réponse. Les journaux sont coupés.
- Le Worker demande à Google de ne pas conserver l'échange (`store: false`).
- L'appli ne stocke pas la photo. Elle disparaît au rechargement de la page ou avec « Nouveau client ».
- Garde la facturation activée sur la clé. D'après ce que je sais (non vérifié dans la doc lue), en offre gratuite Google peut utiliser les données pour améliorer ses produits. Avec la facturation, non.
- Les pages RGPD et mentions légales sont prévues plus tard (CLAUDE.md, section 14). Avec l'envoi de photos, elles deviennent plus urgentes.

## Tester sans rien installer

```bash
node worker/test.mjs
```

```bash
node tests/v2.test.js
```

Le premier teste le Worker seul. Le second teste tout le parcours dans l'appli, avec le vrai code du Worker et un Google simulé.
