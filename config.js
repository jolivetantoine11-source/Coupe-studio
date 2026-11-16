/* Coupe Studio — config.js
   V2 : adresse du Worker Cloudflare qui génère les images et les textes (docs/V2-installation.md).
   Exemple : 'https://coupe-studio.ton-compte.workers.dev'
   Vide = V1 : l'appli fabrique seulement les prompts à copier dans Gemini.
   Ce fichier ne contient jamais de clé ni de code d'accès. */
window.CONFIG = {
  worker: 'https://coupe-studio.coupestudio.workers.dev'
};
