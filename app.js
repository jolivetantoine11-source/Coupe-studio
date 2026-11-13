/* Coupe Studio — app.js
   Navigation, état, logique de recette et de profil, génération des prompts.
   Dépend de catalogue.js (CATALOGUE) et de prompts.js (PROMPTS). Aucun serveur, aucun compte. */
(function () {
  'use strict';

  var C = window.CATALOGUE;
  var P = window.PROMPTS;

  /* ===================================================================
     1. Stockage : toujours dans un try/catch. L'appli marche sans.
     =================================================================== */
  var CLES = {
    mode: 'coupe-studio:mode',
    recettes: 'coupe-studio:recettes',
    coupes: 'coupe-studio:coupes',
    session: 'coupe-studio:session'
  };
  var MAX_RECETTES = 30;

  /* Si le stockage est bloqué ou plein, les données vivent en mémoire le temps de la visite. */
  var memoire = {};

  function lire(cle, defaut) {
    try {
      var brut = window.localStorage.getItem(cle);
      if (brut !== null) return JSON.parse(brut);
    } catch (e) { /* stockage bloqué ou donnée illisible */ }
    return Object.prototype.hasOwnProperty.call(memoire, cle) ? memoire[cle] : defaut;
  }

  /* Renvoie true si la valeur est gardée dans le navigateur, false si elle ne vit qu'en mémoire. */
  function ecrire(cle, valeur) {
    try {
      window.localStorage.setItem(cle, JSON.stringify(valeur));
      delete memoire[cle];
      return true;
    } catch (e) {
      memoire[cle] = valeur;
      return false;
    }
  }

  /* ===================================================================
     2. État
     =================================================================== */
  var ECRANS = ['accueil', 'catalogue', 'recette', 'client', 'fond', 'resultat'];

  var QUESTIONS = [
    { id: 'texture', nom: 'Texture', options: [['lisses', 'Lisses'], ['ondules', 'Ondulés'], ['boucles', 'Bouclés'], ['crepus', 'Crépus']] },
    { id: 'visage', nom: 'Visage', options: [['ovale', 'Ovale'], ['rond', 'Rond'], ['carre', 'Carré'], ['allonge', 'Allongé']] },
    /* « Cheveux fins » n'est proposé qu'en salon. */
    { id: 'front', nom: 'Ligne frontale et densité', options: [['normale', 'Normale'], ['golfes-legers', 'Golfes légers'], ['golfes-marques', 'Golfes marqués'], ['fins', 'Cheveux fins', 'salon']] },
    { id: 'longueur', nom: 'Longueur actuelle', options: [['courte', 'Courte'], ['moyenne', 'Moyenne'], ['longue', 'Longue']] },
    { id: 'lunettes', nom: 'Lunettes', options: [['oui', 'Oui'], ['non', 'Non']] }
  ];

  var etat = {
    mode: null,            // null (thème neutre), 'barber' ou 'salon'
    ecran: 'accueil',
    coupe: null,           // la coupe choisie (objet du catalogue ou coupe ajoutée)
    reglages: null,        // la recette en cours
    profil: profilVide(),
    fond: { type: 'origine', couleur: 'bleu-gris' },
    reference: false,      // « J'ai une photo de référence »
    retourFond: 'recette', // écran d'où l'on a ouvert Fond
    brouillonFond: null
  };

  function profilVide() {
    return { texture: null, visage: null, front: null, longueur: null, lunettes: null };
  }

  /* ===================================================================
     3. Outils
     =================================================================== */
  function copie(objet) {
    var c = {};
    for (var k in objet) { if (Object.prototype.hasOwnProperty.call(objet, k)) c[k] = objet[k]; }
    return c;
  }

  /* Crée un élément. Le texte passe toujours par textContent : rien de saisi n'est interprété. */
  function el(balise, attributs, enfants) {
    var n = document.createElement(balise);
    for (var k in attributs) {
      if (!Object.prototype.hasOwnProperty.call(attributs, k)) continue;
      var v = attributs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'texte') n.textContent = v;
      else if (k === 'svg') n.innerHTML = v; // uniquement des tracés constants du code
      else n.setAttribute(k, v === true ? '' : v);
    }
    (enfants || []).forEach(function (e) {
      if (e === null || e === undefined || e === false) return;
      n.appendChild(typeof e === 'string' ? document.createTextNode(e) : e);
    });
    return n;
  }

  function vider(noeud) {
    while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
  }

  function $(selecteur, racine) {
    return (racine || document).querySelector(selecteur);
  }

  function tous(selecteur, racine) {
    return Array.prototype.slice.call((racine || document).querySelectorAll(selecteur));
  }

  function texteCourt(valeur, max) {
    if (typeof valeur !== 'string') return '';
    return valeur.replace(/\s+/g, ' ').trim().slice(0, max);
  }

  /* Remplace un repère (X ou Y) sans interpréter la valeur insérée. */
  function inserer(modele, repereTexte, valeur) {
    return modele.split(repereTexte).join(String(valeur));
  }

  var ICONE_COCHE = '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12L10 17L19 7"/></svg>';

  /* ===================================================================
     4. Coupes : catalogue + coupes ajoutées
     =================================================================== */
  function coupeDuCatalogue(id) {
    for (var i = 0; i < C.coupes.length; i++) { if (C.coupes[i].id === id) return C.coupes[i]; }
    return null;
  }

  /* Vérifie une coupe ajoutée (venue du stockage ou d'un lien partagé). */
  function validerCoupePerso(o) {
    if (!o || typeof o !== 'object') return null;
    var nom = texteCourt(o.nom, 40);
    var ligne = texteCourt(o.ligne, 200);
    if (!nom || !ligne) return null;
    if (o.mode !== 'barber' && o.mode !== 'salon') return null;
    var id = typeof o.id === 'string' && /^perso-[a-z0-9]{1,20}$/.test(o.id) ? o.id : 'perso-partagee';
    return { id: id, perso: true, mode: o.mode, fr: nom, ligne: ligne, desc: texteCourt(o.en, 200), sil: 'perso', recette: {} };
  }

  function coupesPerso() {
    var liste = lire(CLES.coupes, []);
    if (!Array.isArray(liste)) return [];
    return liste.map(validerCoupePerso).filter(Boolean);
  }

  function trouverCoupe(id) {
    var c = coupeDuCatalogue(id);
    if (c) return c;
    var perso = coupesPerso();
    for (var i = 0; i < perso.length; i++) { if (perso[i].id === id) return perso[i]; }
    return null;
  }

  function coupePersoVersDonnees(c) {
    return { id: c.id, nom: c.fr, ligne: c.ligne, en: c.desc, mode: c.mode };
  }

  /* Les coupes affichées : 12 du mode actif (ou 6 + 6 en thème neutre), puis les coupes ajoutées. */
  function coupesDuMode() {
    return C.ordre[etat.mode || 'neutre'].map(coupeDuCatalogue);
  }

  function coupesAffichees() {
    var perso = coupesPerso().filter(function (c) { return !etat.mode || c.mode === etat.mode; });
    return coupesDuMode().concat(perso);
  }

  /* ===================================================================
     5. Recette : valeurs par défaut, résumé français, description anglaise
     =================================================================== */
  function recetteParDefaut(coupe) {
    var r = copie(C.base[coupe.mode]);
    for (var k in coupe.recette) { if (Object.prototype.hasOwnProperty.call(coupe.recette, k)) r[k] = coupe.recette[k]; }
    return r;
  }

  function reglage(coupe, id) {
    var liste = C.reglages[coupe.mode];
    for (var i = 0; i < liste.length; i++) { if (liste[i].id === id) return liste[i]; }
    return null;
  }

  function option(g, valeur) {
    for (var i = 0; i < g.options.length; i++) { if (g.options[i].v === valeur) return g.options[i]; }
    return null;
  }

  /* Repère de longueur (menton, épaules…) qui correspond à une longueur en cm. */
  function repere(g, cm) {
    for (var i = 0; i < g.reperes.length; i++) { if (cm <= g.reperes[i].jusqua) return g.reperes[i]; }
    return g.reperes[g.reperes.length - 1];
  }

  /* Morceaux de la recette.
     en : un fragment anglais par réglage MODIFIÉ (un réglage laissé à la valeur de la coupe n'ajoute rien).
     fr : résumé français. Les mesures (sabot, dessus, longueur) y figurent toujours, le reste si modifié. */
  function morceaux(coupe, r) {
    var base = recetteParDefaut(coupe);
    var fr = [];
    var en = [];
    C.reglages[coupe.mode].forEach(function (g) {
      var v = r[g.id];
      if (v === null || v === undefined) return;
      var modifie = v !== base[g.id];
      if (g.type === 'choix') {
        var o = option(g, v);
        if (!o) return;
        if (o.libre) {
          if (!r.couleurAutre) return;
          fr.push(inserer(o.res, 'X', r.couleurAutre));
          en.push(inserer(o.en, 'X', r.couleurAutre));
          return;
        }
        if (modifie && o.en) en.push(o.en);
        if ((modifie || g.toujours) && o.res) fr.push(o.res);
      } else if (g.type === 'curseur') {
        if (modifie) en.push(inserer(g.en, 'X', v));
        fr.push(inserer(g.res, 'X', v));
      } else if (g.type === 'longueur') {
        var rp = repere(g, v);
        if (modifie) en.push(inserer(inserer(g.en, 'Y', v), 'X', rp.en));
        fr.push(inserer(inserer(g.res, 'Y', v), 'X', rp.res));
      }
    });
    return { fr: fr, en: en };
  }

  /* Vrai si la recette ne change que la barbe (interrupteur « Ne changer que la barbe »). */
  function barbeSeule(coupe, r) {
    return coupe.mode === 'barber' && r.barbeSeule === true && r.barbe !== 'inchangee';
  }

  /* Texte anglais qui remplace [COUPE] dans le prompt image.
     Coupe ajoutée sans description anglaise : on envoie la description française. */
  function descAnglaise(coupe, r) {
    if (barbeSeule(coupe, r)) return option(reglage(coupe, 'barbe'), r.barbe).en;
    return [coupe.desc || coupe.ligne].concat(morceaux(coupe, r).en).join(', ');
  }

  /* Résumé en une ligne, ex. « Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue ». */
  function resume(coupe, r) {
    if (barbeSeule(coupe, r)) return 'Barbe seule : ' + option(reglage(coupe, 'barbe'), r.barbe).res + ', cheveux inchangés';
    return [coupe.fr].concat(morceaux(coupe, r).fr).join(', ');
  }

  /* Texte français qui remplace [COUPE] dans le diagnostic : nom + résumé.
     Une coupe ajoutée n'est pas connue de Gemini : on joint sa description. */
  function coupePourDiagnostic(coupe, r) {
    if (!coupe.perso || barbeSeule(coupe, r)) return resume(coupe, r);
    return [coupe.fr + ' (' + coupe.ligne + ')'].concat(morceaux(coupe, r).fr).join(', ');
  }

  function choisirCoupe(coupe) {
    etat.coupe = coupe;
    etat.reglages = recetteParDefaut(coupe);
    memoriserSession();
  }

  /* ===================================================================
     6. Enregistrer, partager, recharger : un seul format de données
     =================================================================== */
  function validerReglages(coupe, r) {
    var base = recetteParDefaut(coupe);
    if (!r || typeof r !== 'object') return base;
    var propre = copie(base);
    C.reglages[coupe.mode].forEach(function (g) {
      var v = r[g.id];
      if (g.type === 'choix') {
        if (v === null && base[g.id] === null) propre[g.id] = null;
        else if (typeof v === 'string' && option(g, v)) propre[g.id] = v;
      } else if (typeof v === 'number' && isFinite(v)) {
        propre[g.id] = Math.min(g.max, Math.max(g.min, Math.round(v)));
      }
    });
    if (coupe.mode === 'barber') propre.barbeSeule = r.barbeSeule === true && propre.barbe !== 'inchangee';
    if (coupe.mode === 'salon') propre.couleurAutre = texteCourt(r.couleurAutre, 80);
    return propre;
  }

  function validerProfil(p) {
    var propre = profilVide();
    if (!p || typeof p !== 'object') return propre;
    QUESTIONS.forEach(function (q) {
      q.options.forEach(function (o) { if (p[q.id] === o[0]) propre[q.id] = o[0]; });
    });
    return propre;
  }

  function validerFond(f) {
    var propre = { type: 'origine', couleur: 'bleu-gris' };
    if (!f || typeof f !== 'object') return propre;
    C.fonds.forEach(function (x) { if (f.type === x.id) propre.type = x.id; });
    C.couleursUnies.forEach(function (x) { if (f.couleur === x.id) propre.couleur = x.id; });
    return propre;
  }

  /* La recette en cours, sous forme de données simples. Le lien partagé n'emporte pas le profil du client. */
  function versDonnees(avecProfil) {
    var d = {
      v: 1,
      c: etat.coupe.perso ? coupePersoVersDonnees(etat.coupe) : etat.coupe.id,
      r: copie(etat.reglages),
      f: copie(etat.fond)
    };
    if (avecProfil) d.p = copie(etat.profil);
    return d;
  }

  /* Relit des données (stockage ou lien). Tout est vérifié : une valeur inconnue est ignorée. */
  function depuisDonnees(d) {
    if (!d || typeof d !== 'object') return null;
    var coupe = typeof d.c === 'string' ? coupeDuCatalogue(d.c) : validerCoupePerso(d.c);
    if (!coupe) return null;
    return { coupe: coupe, reglages: validerReglages(coupe, d.r), profil: validerProfil(d.p), fond: validerFond(d.f) };
  }

  function charger(recette) {
    etat.coupe = recette.coupe;
    etat.reglages = recette.reglages;
    etat.profil = recette.profil;
    etat.fond = recette.fond;
    etat.reference = false;
    memoriserSession();
  }

  /* La session en cours est mémorisée : quand le téléphone recharge l'onglet au retour de Gemini, rien n'est perdu. */
  function memoriserSession() {
    if (!etat.coupe) return;
    var d = versDonnees(true);
    d.ref = etat.reference;
    ecrire(CLES.session, d);
  }

  function recettesEnregistrees() {
    var liste = lire(CLES.recettes, []);
    return Array.isArray(liste) ? liste : [];
  }

  /* base64url d'un JSON (UTF-8). */
  function encoder(objet) {
    var octets = new TextEncoder().encode(JSON.stringify(objet));
    var binaire = '';
    for (var i = 0; i < octets.length; i++) binaire += String.fromCharCode(octets[i]);
    return window.btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decoder(texte) {
    var b64 = texte.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var binaire = window.atob(b64);
    var octets = new Uint8Array(binaire.length);
    for (var i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(octets));
  }

  function dateRelative(horodatage) {
    var jour = 24 * 60 * 60 * 1000;
    var d = new Date(horodatage);
    if (isNaN(d.getTime())) return 'Enregistrée';
    var debutAujourdhui = new Date();
    debutAujourdhui.setHours(0, 0, 0, 0);
    if (d.getTime() >= debutAujourdhui.getTime()) return 'Enregistrée aujourd’hui';
    if (d.getTime() >= debutAujourdhui.getTime() - jour) return 'Enregistrée hier';
    return 'Enregistrée le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  /* ===================================================================
     7. Navigation et thème
     =================================================================== */
  var RENDUS = {};
  var premierAffichage = true;

  function ecranDepuisAdresse() {
    var h = (window.location.hash || '').replace(/^#/, '');
    return ECRANS.indexOf(h) >= 0 && $('#ecran-' + h) ? h : 'accueil';
  }

  /* Change d'écran tout de suite, puis met l'adresse à jour (pour le bouton Retour du téléphone). */
  function aller(ecran) {
    if (!$('#ecran-' + ecran)) ecran = 'accueil';
    afficher(ecran);
    if (ecranDepuisAdresse() !== ecran || !window.location.hash) window.location.hash = ecran;
  }

  /* Bouton Retour ou adresse saisie : on suit l'adresse, sauf si l'écran est déjà affiché. */
  function suivreAdresse() {
    var ecran = ecranDepuisAdresse();
    if (ecran !== etat.ecran) afficher(ecran);
  }

  /* Liens internes (onglets, boutons principaux) : même chemin que `aller`. */
  document.addEventListener('click', function (evenement) {
    var lien = evenement.target.closest('a[href^="#"]');
    if (!lien) return;
    var cible = lien.getAttribute('href').slice(1);
    if (ECRANS.indexOf(cible) < 0) return;
    evenement.preventDefault();
    aller(cible);
  });

  function appliquerTheme() {
    document.documentElement.setAttribute('data-theme', etat.mode || 'neutre');
  }

  function afficher(ecran) {
    etat.ecran = ecran;
    if (RENDUS[ecran]) RENDUS[ecran]();
    ECRANS.forEach(function (e) {
      var section = $('#ecran-' + e);
      if (section) section.hidden = e !== ecran;
    });
    var ongletActif = ecran === 'fond' ? etat.retourFond : ecran;
    tous('.onglet').forEach(function (o) {
      if (o.getAttribute('data-onglet') === ongletActif) o.setAttribute('aria-current', 'page');
      else o.removeAttribute('aria-current');
    });
    var section = $('#ecran-' + ecran);
    var defile = $('.defile', section);
    if (defile) defile.scrollTop = 0;
    if (!premierAffichage) {
      var titre = $('h1', section);
      if (titre) titre.focus({ preventScroll: true });
    }
    premierAffichage = false;
  }

  /* ===================================================================
     8. Écran Accueil
     =================================================================== */
  RENDUS.accueil = function () {
    tous('#ecran-accueil [data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === etat.mode));
    });
    var liste = $('#liste-recettes');
    vider(liste);
    var n = 0;
    recettesEnregistrees().forEach(function (donnees, index) {
      var recette = depuisDonnees(donnees);
      if (!recette) return;
      n++;
      liste.appendChild(el('button', { type: 'button', 'class': 'carte pile', 'data-recette': String(index) }, [
        el('span', { 'class': 'carte-titre', texte: resume(recette.coupe, recette.reglages) }),
        el('span', { 'class': 'discret', texte: dateRelative(donnees.date) })
      ]));
    });
    if (n === 0) {
      liste.appendChild(el('p', { 'class': 'discret', texte: 'Aucune recette pour l’instant. Enregistre-en une depuis l’écran Résultat.' }));
    }
  };

  $('#ecran-accueil').addEventListener('click', function (evenement) {
    var boutonMode = evenement.target.closest('[data-mode]');
    if (boutonMode) {
      var mode = boutonMode.getAttribute('data-mode');
      /* Retoucher le mode actif le retire : retour au thème neutre (établissement mixte). */
      etat.mode = etat.mode === mode ? null : mode;
      ecrire(CLES.mode, etat.mode);
      appliquerTheme();
      RENDUS.accueil();
      return;
    }
    var carte = evenement.target.closest('[data-recette]');
    if (carte) {
      var recette = depuisDonnees(recettesEnregistrees()[Number(carte.getAttribute('data-recette'))]);
      if (!recette) return;
      charger(recette);
      aller('recette');
    }
  });

  /* ===================================================================
     9. Écran Catalogue
     =================================================================== */
  /* Carte de coupe : silhouette, nom, une ligne. `compacte` : sans la ligne (propositions). */
  function carteCoupe(c, compacte) {
    var carte = el('button', {
      type: 'button',
      'class': 'carte coupe',
      'data-coupe': c.id,
      'aria-pressed': compacte ? null : String(!!etat.coupe && etat.coupe.id === c.id)
    });
    carte.innerHTML = C.silhouette(c.sil); // tracé constant de catalogue.js
    carte.appendChild(el('span', { 'class': 'coupe-nom', texte: c.fr }));
    if (!compacte) carte.appendChild(el('span', { 'class': 'coupe-ligne', texte: c.ligne }));
    return carte;
  }

  var typeAjout = null; // en thème neutre, la coupe ajoutée doit dire si elle se règle en barber ou en salon

  function fermerAjout() {
    $('#form-ajout').hidden = true;
    $('#form-ajout').reset();
    $('#ajout-erreur').hidden = true;
    $('#ouvrir-ajout').setAttribute('aria-expanded', 'false');
    typeAjout = null;
    tous('#ajout-type [data-type]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  }

  RENDUS.catalogue = function () {
    var liste = coupesAffichees();
    var ajoutees = liste.length - 12;
    var sousTitre = etat.mode === 'salon' ? '12 coupes salon' : (etat.mode === 'barber' ? '12 coupes barber' : 'Barber et salon');
    if (ajoutees === 1) sousTitre += ', 1 ajoutée';
    if (ajoutees > 1) sousTitre += ', ' + ajoutees + ' ajoutées';
    $('#sous-titre-catalogue').textContent = sousTitre;
    var grille = $('#grille-coupes');
    vider(grille);
    liste.forEach(function (c) { grille.appendChild(carteCoupe(c, false)); });
    $('#ajout-type').hidden = !!etat.mode;
    fermerAjout();
  };

  $('#grille-coupes').addEventListener('click', function (evenement) {
    var carte = evenement.target.closest('[data-coupe]');
    if (!carte) return;
    var c = trouverCoupe(carte.getAttribute('data-coupe'));
    if (!c) return;
    choisirCoupe(c);
    aller('recette');
  });

  $('#ouvrir-ajout').addEventListener('click', function () {
    var formulaire = $('#form-ajout');
    if (!formulaire.hidden) { fermerAjout(); return; }
    formulaire.hidden = false;
    $('#ouvrir-ajout').setAttribute('aria-expanded', 'true');
    $('#ajout-nom').focus();
    formulaire.scrollIntoView({ block: 'start' });
  });

  $('#annuler-ajout').addEventListener('click', function () {
    fermerAjout();
    $('#ouvrir-ajout').focus();
  });

  $('#ajout-type').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('[data-type]');
    if (!b) return;
    typeAjout = b.getAttribute('data-type');
    tous('#ajout-type [data-type]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
  });

  $('#form-ajout').addEventListener('submit', function (evenement) {
    evenement.preventDefault();
    var nom = texteCourt($('#ajout-nom').value, 40);
    var ligne = texteCourt($('#ajout-ligne').value, 140);
    var mode = etat.mode || typeAjout;
    var erreur = '';
    var fautif = null;
    if (!nom) { erreur = 'Il manque le nom : écris comment tu appelles cette coupe.'; fautif = $('#ajout-nom'); }
    else if (!ligne) { erreur = 'Il manque la description : décris la coupe en une phrase, c’est elle qui part dans le prompt.'; fautif = $('#ajout-ligne'); }
    else if (!mode) { erreur = 'Choisis Barber ou Salon : cela fixe les réglages de la recette.'; fautif = $('#ajout-type [data-type]'); }
    if (erreur) {
      $('#ajout-erreur').textContent = erreur;
      $('#ajout-erreur').hidden = false;
      fautif.focus();
      return;
    }
    var nouvelle = { id: 'perso-' + Date.now().toString(36), nom: nom, ligne: ligne, en: texteCourt($('#ajout-en').value, 200), mode: mode };
    var brutes = lire(CLES.coupes, []);
    if (!Array.isArray(brutes)) brutes = [];
    brutes.push(nouvelle);
    ecrire(CLES.coupes, brutes);
    choisirCoupe(validerCoupePerso(nouvelle));
    aller('recette');
  });

  /* ===================================================================
     10. Écran Recette
     =================================================================== */
  function libelleFond(fond) {
    var texte = '';
    C.fonds.forEach(function (f) { if (f.id === fond.type) texte = f.fr; });
    if (fond.type === 'couleur') {
      C.couleursUnies.forEach(function (c) { if (c.id === fond.couleur) texte += ', ' + c.fr; });
    }
    return texte.toLowerCase();
  }

  function boutonChoix(texte, attributs) {
    var a = { type: 'button', 'class': 'choix', 'aria-pressed': 'false', texte: texte };
    for (var k in attributs) { if (Object.prototype.hasOwnProperty.call(attributs, k)) a[k] = attributs[k]; }
    return el('button', a);
  }

  /* Un bloc « étiquette + boutons à bascule ». */
  function blocChoix(id, nom, boutons) {
    return el('div', { id: 'bloc-' + id }, [
      el('span', { 'class': 'etiquette', id: 'etiquette-' + id, texte: nom }),
      el('div', { 'class': 'groupe', role: 'group', 'aria-labelledby': 'etiquette-' + id }, boutons)
    ]);
  }

  function blocCurseur(g) {
    return el('div', { id: 'bloc-curseur-' + g.id }, [
      el('label', { 'class': 'etiquette', 'for': 'curseur-' + g.id, texte: g.type === 'longueur' ? 'Longueur en centimètres' : g.nom }),
      el('input', { 'class': 'curseur', type: 'range', id: 'curseur-' + g.id, 'data-curseur': g.id, min: String(g.min), max: String(g.max), step: '1' }),
      el('div', { 'class': 'graduations' }, [
        el('span', { texte: g.min + ' cm' }),
        el('span', { id: 'valeur-' + g.id }),
        el('span', { texte: g.max + ' cm' })
      ])
    ]);
  }

  function construireReglages() {
    var zone = $('#reglages');
    vider(zone);
    C.reglages[etat.coupe.mode].forEach(function (g) {
      if (g.type === 'curseur') { zone.appendChild(blocCurseur(g)); return; }
      if (g.type === 'longueur') {
        zone.appendChild(blocChoix(g.id, g.nom, g.reperes.map(function (rp) {
          return boutonChoix(rp.fr, { 'data-repere': rp.v });
        })));
        zone.appendChild(blocCurseur(g));
        return;
      }
      zone.appendChild(blocChoix(g.id, g.nom, g.options.map(function (o) {
        return boutonChoix(o.fr, { 'data-reglage': g.id, 'data-valeur': o.v });
      })));
      if (g.id === 'barbe') {
        zone.appendChild(blocChoix('barbe-seule', 'Ne changer que la barbe', [
          boutonChoix('Non', { 'data-barbe-seule': 'non' }),
          boutonChoix('Oui', { 'data-barbe-seule': 'oui' })
        ]));
      }
      if (g.id === 'couleur') {
        zone.appendChild(el('div', { id: 'bloc-couleur-autre' }, [
          el('label', { 'class': 'etiquette', 'for': 'couleur-autre', texte: 'Couleur voulue, en anglais' }),
          el('input', { 'class': 'champ', type: 'text', id: 'couleur-autre', maxlength: '80', lang: 'en', autocomplete: 'off', placeholder: 'copper red' })
        ]));
      }
    });
  }

  /* Met l'écran en accord avec la recette : boutons actifs, curseurs, blocs conditionnels, résumé. */
  function synchroniserRecette() {
    var r = etat.reglages;
    var coupe = etat.coupe;
    tous('#reglages [data-reglage]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(r[b.getAttribute('data-reglage')] === b.getAttribute('data-valeur')));
    });
    C.reglages[coupe.mode].forEach(function (g) {
      if (g.type === 'choix') return;
      var v = r[g.id];
      var curseur = $('#curseur-' + g.id);
      var texte = g.vide;
      if (v !== null) {
        texte = v + ' cm';
        if (g.type === 'longueur') texte += ', ' + repere(g, v).res;
      }
      curseur.value = String(v === null ? g.depart : v);
      curseur.setAttribute('aria-valuetext', texte);
      $('#valeur-' + g.id).textContent = texte;
      if (g.type === 'longueur') {
        tous('#reglages [data-repere]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(v !== null && repere(g, v).v === b.getAttribute('data-repere')));
        });
      }
    });
    if (coupe.mode === 'barber') {
      $('#bloc-barbe-seule').hidden = r.barbe === 'inchangee';
      tous('#reglages [data-barbe-seule]').forEach(function (b) {
        b.setAttribute('aria-pressed', String((b.getAttribute('data-barbe-seule') === 'oui') === r.barbeSeule));
      });
    }
    if (coupe.mode === 'salon') {
      var champ = $('#couleur-autre');
      $('#bloc-couleur-autre').hidden = r.couleur !== 'autre';
      if (document.activeElement !== champ) champ.value = r.couleurAutre;
    }
    $('#resume-recette').textContent = resume(coupe, r);
    memoriserSession();
  }

  function libellesFond() {
    tous('[data-ouvrir-fond]').forEach(function (b) { b.textContent = 'Fond : ' + libelleFond(etat.fond); });
  }

  var minuterieSuppression = null;

  RENDUS.recette = function () {
    var vide = !etat.coupe;
    $('#titre-recette').textContent = vide ? 'Recette' : etat.coupe.fr;
    $('#sous-titre-recette').textContent = vide ? 'Aucune coupe choisie. Choisis-en une dans le catalogue pour la régler.' : 'Règle chaque ingrédient.';
    $('#reglages').hidden = vide;
    $('#recette-secondaires').hidden = vide;
    $('#resume-recette').hidden = vide;
    var action = $('#action-recette');
    action.textContent = vide ? 'Choisir une coupe' : 'Voir le profil client';
    action.setAttribute('href', vide ? '#catalogue' : '#client');
    if (vide) return;
    construireReglages();
    synchroniserRecette();
    libellesFond();
    window.clearTimeout(minuterieSuppression);
    var supprimer = $('#supprimer-coupe');
    supprimer.hidden = !etat.coupe.perso;
    supprimer.textContent = 'Supprimer cette coupe';
    supprimer.removeAttribute('data-confirmer');
  };

  $('#reglages').addEventListener('click', function (evenement) {
    var r = etat.reglages;
    var b = evenement.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-reglage')) {
      var id = b.getAttribute('data-reglage');
      var valeur = b.getAttribute('data-valeur');
      if (r[id] !== valeur) r[id] = valeur;
      /* Retoucher un choix actif le retire, mais seulement si la coupe ne l'imposait pas. */
      else if (recetteParDefaut(etat.coupe)[id] === null) r[id] = null;
      if (id === 'barbe' && r.barbe === 'inchangee') r.barbeSeule = false;
      if (id === 'cotes' && r.cotes === 'ciseaux') r.sabot = null; // pas de sabot aux ciseaux
    } else if (b.hasAttribute('data-repere')) {
      var g = reglage(etat.coupe, 'longueur');
      var cible = b.getAttribute('data-repere');
      var actif = r.longueur !== null && repere(g, r.longueur).v === cible;
      if (!actif) g.reperes.forEach(function (rp) { if (rp.v === cible) r.longueur = rp.cm; });
      else if (recetteParDefaut(etat.coupe).longueur === null) r.longueur = null;
    } else if (b.hasAttribute('data-barbe-seule')) {
      r.barbeSeule = b.getAttribute('data-barbe-seule') === 'oui';
    } else {
      return;
    }
    synchroniserRecette();
  });

  $('#reglages').addEventListener('input', function (evenement) {
    var cible = evenement.target;
    if (cible.hasAttribute('data-curseur')) etat.reglages[cible.getAttribute('data-curseur')] = Number(cible.value);
    else if (cible.id === 'couleur-autre') etat.reglages.couleurAutre = texteCourt(cible.value, 80);
    else return;
    synchroniserRecette();
  });

  /* Suppression d'une coupe ajoutée : deux touches, pour éviter l'erreur. */
  $('#supprimer-coupe').addEventListener('click', function () {
    var bouton = $('#supprimer-coupe');
    if (!bouton.hasAttribute('data-confirmer')) {
      bouton.setAttribute('data-confirmer', '');
      bouton.textContent = 'Touche encore pour supprimer';
      minuterieSuppression = window.setTimeout(function () {
        bouton.removeAttribute('data-confirmer');
        bouton.textContent = 'Supprimer cette coupe';
      }, 3000);
      return;
    }
    window.clearTimeout(minuterieSuppression);
    var id = etat.coupe.id;
    var brutes = lire(CLES.coupes, []);
    if (!Array.isArray(brutes)) brutes = [];
    ecrire(CLES.coupes, brutes.filter(function (c) { return !c || c.id !== id; }));
    etat.coupe = null;
    etat.reglages = null;
    ecrire(CLES.session, null);
    aller('catalogue');
  });

  /* Ouvre l'écran Fond depuis Recette ou Résultat, et s'en souvient pour y revenir. */
  document.addEventListener('click', function (evenement) {
    var b = evenement.target.closest('[data-ouvrir-fond]');
    if (!b) return;
    etat.retourFond = b.getAttribute('data-ouvrir-fond');
    aller('fond');
  });

  /* ===================================================================
     11. Écran Client : questions, propositions, avertissements
     =================================================================== */

  /* Le mode qui compte pour la recette : celui de la coupe choisie, sinon celui de l'accueil. */
  function modeRecette() {
    return etat.coupe ? etat.coupe.mode : etat.mode;
  }

  /* ---- Propositions (CLAUDE.md, section 7) ----
     Règles simples : chaque réponse du profil favorise des coupes (+2 points chacune)
     ou en écarte (retirées de la liste). On garde les 3 meilleures du mode actif.
     À égalité, l'ordre du catalogue départage : les plus demandées d'abord.
     Visage ovale : aucune règle, donc les 3 plus demandées. */
  var REGLES = [
    /* Rond : volume en hauteur, côtés courts. Éviter buzz cut et carré arrondi au menton. */
    { question: 'visage', reponses: ['rond'], favorise: ['quiff', 'crop-texture', 'carre-plongeant', 'long-couches'], ecarte: ['buzz-cut', 'carre-boucle'] },
    /* Carré : adoucir. */
    { question: 'visage', reponses: ['carre'], favorise: ['raie-cote', 'mi-long-flow', 'carre-flou', 'frange-rideau'], ecarte: [] },
    /* Allongé : éviter la hauteur, garder de la largeur. « Frange droite » est un réglage,
       pas une coupe : en salon on propose donc le carré droit puis les coupes à frange. */
    { question: 'visage', reponses: ['allonge'], favorise: ['crew-cut', 'crop-texture', 'carre-droit', 'frange-rideau', 'shag'], ecarte: ['quiff'] },
    /* Bouclés ou crépus. */
    { question: 'texture', reponses: ['boucles', 'crepus'], favorise: ['degrade-boucle', 'buzz-cut', 'carre-boucle', 'shag'], ecarte: [] },
    /* Golfes marqués. */
    { question: 'front', reponses: ['golfes-marques'], favorise: ['crop-texture', 'buzz-cut', 'crew-cut'], ecarte: ['slick-back', 'quiff'] }
  ];

  function propositions(profil) {
    var points = {};
    var ecartees = {};
    REGLES.forEach(function (regle) {
      if (regle.reponses.indexOf(profil[regle.question]) < 0) return;
      regle.favorise.forEach(function (id) { points[id] = (points[id] || 0) + 2; });
      regle.ecarte.forEach(function (id) { ecartees[id] = true; });
    });
    return coupesDuMode()
      .map(function (c, rang) { return { coupe: c, points: points[c.id] || 0, rang: rang }; })
      .filter(function (x) { return !ecartees[x.coupe.id]; })
      .sort(function (a, b) { return b.points - a.points || a.rang - b.rang; })
      .slice(0, 3)
      .map(function (x) { return x.coupe; });
  }

  /* ---- Avertissements ---- */
  var RANG_LONGUEUR = { courte: 0, moyenne: 1, longue: 2 };
  /* Limites en cm entre courte, moyenne et longue. Barber : longueur du dessus. Salon : longueur totale. */
  var SEUILS_LONGUEUR = { barber: [5, 10], salon: [19, 39] };

  function longueurDemandee(coupe, r) {
    var cm = coupe.mode === 'barber' ? r.dessus : r.longueur;
    if (cm === null || cm === undefined) return coupe.classe || null;
    var seuils = SEUILS_LONGUEUR[coupe.mode];
    return cm <= seuils[0] ? 'courte' : (cm <= seuils[1] ? 'moyenne' : 'longue');
  }

  function avertissements(coupe, r, profil) {
    var liste = [];
    if (!coupe || barbeSeule(coupe, r)) return liste; // barbe seule : les cheveux ne changent pas
    var demandee = longueurDemandee(coupe, r);
    var boucles = profil.texture === 'boucles' || profil.texture === 'crepus';
    if (demandee && profil.longueur && RANG_LONGUEUR[demandee] > RANG_LONGUEUR[profil.longueur]) {
      liste.push({ titre: 'Pousse', texte: 'Il faut laisser pousser : environ 1 cm par mois.' });
    }
    if (coupe.lisse && boucles) {
      liste.push({ titre: 'Lissage', texte: 'Le rendu demande un lissage ou un brushing.' });
    }
    if (coupe.front && profil.front === 'golfes-marques') {
      liste.push({ titre: 'Golfes marqués', texte: 'Ces coupes dégagent le front : garder du dessus pour couvrir la ligne frontale.' });
    }
    if (profil.longueur === 'longue' && demandee === 'courte') {
      liste.push({ titre: 'Changement radical', texte: 'Plus de 10 cm coupés : changement radical, plusieurs mois pour revenir en arrière.' });
    }
    if (coupe.mode === 'salon' && profil.front === 'fins' && (r.couches === 'marquees' || coupe.id === 'shag' || coupe.id === 'wolf-cut')) {
      liste.push({ titre: 'Cheveux fins', texte: 'Garder du volume en haut : une coupe très dégradée aplatit la forme.' });
    }
    if (profil.lunettes === 'oui') {
      liste.push({ titre: 'Lunettes', texte: 'Vérifie le contour d’oreille avec les lunettes remises.' });
    }
    return liste;
  }

  function construireQuestions() {
    var zone = $('#questions');
    vider(zone);
    QUESTIONS.forEach(function (q) {
      var boutons = [];
      q.options.forEach(function (o) {
        if (o[2] && modeRecette() === 'barber') return; // « Cheveux fins » : salon seulement
        boutons.push(boutonChoix(o[1], { 'data-question': q.id, 'data-valeur': o[0] }));
      });
      zone.appendChild(blocChoix('question-' + q.id, q.nom, boutons));
    });
  }

  function synchroniserClient() {
    tous('#questions [data-question]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(etat.profil[b.getAttribute('data-question')] === b.getAttribute('data-valeur')));
    });
    var zone = $('#propositions');
    vider(zone);
    propositions(etat.profil).forEach(function (c) { zone.appendChild(carteCoupe(c, true)); });
    var alertes = $('#avertissements');
    vider(alertes);
    avertissements(etat.coupe, etat.reglages, etat.profil).forEach(function (a) {
      alertes.appendChild(el('div', { 'class': 'alerte' }, [
        el('b', { texte: a.titre }),
        el('span', { 'class': 'discret', texte: a.texte })
      ]));
    });
    alertes.hidden = !alertes.firstChild;
    memoriserSession();
  }

  RENDUS.client = function () {
    if (modeRecette() === 'barber' && etat.profil.front === 'fins') etat.profil.front = null;
    construireQuestions();
    synchroniserClient();
    var action = $('#action-client');
    action.textContent = etat.coupe ? 'Générer les prompts' : 'Choisir une coupe';
    action.setAttribute('href', etat.coupe ? '#resultat' : '#catalogue');
  };

  $('#questions').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('[data-question]');
    if (!b) return;
    var id = b.getAttribute('data-question');
    var valeur = b.getAttribute('data-valeur');
    etat.profil[id] = etat.profil[id] === valeur ? null : valeur; // retoucher une réponse la retire
    synchroniserClient();
  });

  $('#propositions').addEventListener('click', function (evenement) {
    var carte = evenement.target.closest('[data-coupe]');
    if (!carte) return;
    var c = trouverCoupe(carte.getAttribute('data-coupe'));
    if (!c) return;
    choisirCoupe(c);
    aller('recette');
  });

  /* ===================================================================
     12. Écran Fond
     Le choix reste un brouillon tant qu'on n'a pas touché « Appliquer ».
     =================================================================== */
  function couleurUnie(id) {
    for (var i = 0; i < C.couleursUnies.length; i++) { if (C.couleursUnies[i].id === id) return C.couleursUnies[i]; }
    return C.couleursUnies[0];
  }

  function synchroniserFond() {
    var brouillon = etat.brouillonFond;
    var zone = $('#choix-fond');
    vider(zone);
    C.fonds.forEach(function (f) {
      var actif = brouillon.type === f.id;
      var teinte = f.id === 'couleur' ? couleurUnie(brouillon.couleur).teinte : f.teinte;
      var echantillon = el('span', {
        'class': 'echantillon' + (f.id === 'origine' ? ' echantillon-origine' : ''),
        style: teinte ? '--teinte:' + teinte : null,
        svg: actif ? ICONE_COCHE : ''
      });
      zone.appendChild(el('button', { type: 'button', 'class': 'fond-option', 'data-fond': f.id, 'aria-pressed': String(actif) }, [echantillon, f.fr]));
    });
    $('#bloc-couleur-unie').hidden = brouillon.type !== 'couleur';
    var pastilles = $('#pastilles');
    vider(pastilles);
    C.couleursUnies.forEach(function (c) {
      var active = brouillon.couleur === c.id;
      pastilles.appendChild(el('button', {
        type: 'button', 'class': 'choix pastille', 'data-couleur': c.id, 'aria-label': c.fr,
        'aria-pressed': String(active), style: '--teinte:' + c.teinte, svg: active ? ICONE_COCHE : ''
      }));
    });
  }

  RENDUS.fond = function () {
    etat.brouillonFond = copie(etat.fond);
    synchroniserFond();
  };

  $('#ecran-fond').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-fond')) {
      etat.brouillonFond.type = b.getAttribute('data-fond');
      synchroniserFond();
      $('#choix-fond [data-fond="' + etat.brouillonFond.type + '"]').focus();
    } else if (b.hasAttribute('data-couleur')) {
      etat.brouillonFond.couleur = b.getAttribute('data-couleur');
      synchroniserFond();
      $('#pastilles [data-couleur="' + etat.brouillonFond.couleur + '"]').focus();
    } else if (b.id === 'appliquer-fond') {
      etat.fond = validerFond(etat.brouillonFond);
      memoriserSession();
      aller(etat.retourFond);
    }
  });

  /* ===================================================================
     13. Écran Résultat : les prompts à copier dans Gemini
     =================================================================== */
  var ADRESSE_GEMINI = 'https://gemini.google.com/app';

  /* Valeur de [FOND], ou null si le fond reste celui d'origine (pas d'étape 4). */
  function fondAnglais(fond) {
    var texte = null;
    C.fonds.forEach(function (f) { if (f.id === fond.type) texte = f.en; });
    if (fond.type === 'couleur') texte = inserer(texte, '[couleur]', couleurUnie(fond.couleur).en);
    return texte;
  }

  /* Les étapes, dans l'ordre : Diagnostic, Image, Fiche, puis Fond s'il change. */
  function etapesResultat() {
    var coupe = etat.coupe;
    var r = etat.reglages;
    var seule = barbeSeule(coupe, r);
    var etapes = [{ titre: 'Diagnostic', consigne: P.consignes.diagnostic, texte: P.diagnostic(coupePourDiagnostic(coupe, r)) }];
    if (etat.reference) {
      etapes.push({ titre: 'Image', consigne: P.consignes.reference, texte: P.reference() });
    } else {
      etapes.push({
        titre: 'Image',
        consigne: P.consignes.image + (seule ? ' ' + P.consignes.barbeSeule : ''),
        texte: P.image(descAnglaise(coupe, r), seule)
      });
    }
    etapes.push({
      titre: 'Fiche',
      consigne: coupe.mode === 'salon' ? P.consignes.ficheSalon : P.consignes.ficheBarber,
      texte: P.fiche(coupe.mode)
    });
    var fond = fondAnglais(etat.fond);
    if (fond) etapes.push({ titre: 'Fond', consigne: P.consignes.fond, texte: P.fond(fond) });
    return etapes;
  }

  function selectionner(noeud) {
    if (noeud.select) { noeud.focus(); noeud.select(); return; }
    var plage = document.createRange();
    plage.selectNodeContents(noeud);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(plage);
  }

  /* Copie un texte. Si le presse-papiers est refusé : on sélectionne le texte affiché
     et on tente l'ancienne commande. Renvoie une promesse : true si la copie a réussi. */
  function copier(texte, noeudAffiche) {
    function repli() {
      selectionner(noeudAffiche);
      try { return document.execCommand('copy') === true; } catch (e) { return false; }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(texte).then(function () { return true; }, repli);
      }
    } catch (e) { /* presse-papiers indisponible */ }
    return Promise.resolve(repli());
  }

  /* Change le libellé d'un bouton pendant 1,5 s (« Copié », « Enregistrée »…). */
  function confirmer(bouton, texte) {
    var initial = bouton.getAttribute('data-libelle') || bouton.textContent;
    bouton.setAttribute('data-libelle', initial);
    bouton.textContent = texte;
    window.clearTimeout(bouton.minuterie);
    bouton.minuterie = window.setTimeout(function () { bouton.textContent = initial; }, 1500);
  }

  function messageResultat(texte) {
    var m = $('#message-resultat');
    m.textContent = texte || '';
    m.hidden = !texte;
  }

  function construireEtapes() {
    var zone = $('#etapes');
    vider(zone);
    etapesResultat().forEach(function (etape, i) {
      var n = i + 1;
      zone.appendChild(el('div', { 'class': 'carte' }, [
        el('p', { 'class': 'etape', texte: 'Étape ' + n + ' · ' + etape.titre }),
        el('p', { 'class': 'consigne', texte: etape.consigne }),
        el('pre', { 'class': 'prompt', id: 'prompt-' + n, tabindex: '0', role: 'group', 'aria-label': 'Prompt de l’étape ' + n, texte: etape.texte }),
        el('div', { 'class': 'rangee' }, [
          el('button', { type: 'button', 'class': 'btn-2', 'data-copier': 'prompt-' + n, texte: 'Copier' }),
          el('a', { 'class': 'btn-2', href: ADRESSE_GEMINI, target: '_blank', rel: 'noopener', texte: 'Ouvrir Gemini' })
        ]),
        el('p', { 'class': 'alerte consigne', id: 'message-prompt-' + n, role: 'alert', hidden: true })
      ]));
    });
  }

  RENDUS.resultat = function () {
    var vide = !etat.coupe;
    $('#sous-titre-resultat').textContent = vide
      ? 'Aucune coupe choisie. Choisis-en une dans le catalogue pour obtenir les prompts.'
      : 'Copie, ouvre Gemini, colle, joins la photo.';
    $('#etapes').hidden = vide;
    $('#bloc-reference').hidden = vide;
    $('#resultat-secondaires').hidden = vide;
    $('#actions-resultat').hidden = !vide;
    messageResultat('');
    $('#lien-partage').hidden = true;
    if (vide) return;
    construireEtapes();
    libellesFond();
    tous('#bloc-reference [data-reference]').forEach(function (b) {
      b.setAttribute('aria-pressed', String((b.getAttribute('data-reference') === 'oui') === etat.reference));
    });
  };

  $('#ecran-resultat').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('button');
    if (!b) return;

    if (b.hasAttribute('data-copier')) {
      var bloc = $('#' + b.getAttribute('data-copier'));
      var message = $('#message-' + b.getAttribute('data-copier'));
      copier(bloc.textContent, bloc).then(function (reussi) {
        message.hidden = reussi;
        if (reussi) confirmer(b, 'Copié');
        else message.textContent = 'Copie refusée par le navigateur. Le texte est sélectionné : copie-le à la main.';
      });
      return;
    }

    if (b.hasAttribute('data-reference')) {
      etat.reference = b.getAttribute('data-reference') === 'oui';
      memoriserSession();
      RENDUS.resultat();
      $('#bloc-reference [data-reference="' + (etat.reference ? 'oui' : 'non') + '"]').focus();
      return;
    }

    if (b.id === 'enregistrer') {
      var donnees = versDonnees(true);
      var empreinte = JSON.stringify(donnees);
      /* Une recette déjà enregistrée à l'identique remonte en tête au lieu d'être doublée. */
      var liste = recettesEnregistrees().filter(function (x) {
        var sansDate = copie(x);
        delete sansDate.id;
        delete sansDate.date;
        return JSON.stringify(sansDate) !== empreinte;
      });
      donnees.id = Date.now();
      donnees.date = Date.now();
      liste.unshift(donnees);
      var gardee = ecrire(CLES.recettes, liste.slice(0, MAX_RECETTES));
      confirmer(b, 'Enregistrée');
      messageResultat(gardee ? '' : 'Recette gardée pour cette visite seulement : le stockage du navigateur est bloqué ou plein. Touche « Partager » pour la conserver.');
      return;
    }

    if (b.id === 'partager') {
      /* Le lien ne contient que la coupe, les réglages et le fond : rien sur le client. */
      var lien = window.location.href.split('#')[0].split('?')[0] + '?r=' + encoder(versDonnees(false));
      var champ = $('#lien-partage');
      champ.value = lien;
      champ.hidden = false;
      copier(lien, champ).then(function (reussi) {
        if (reussi) { champ.hidden = true; confirmer(b, 'Lien copié'); messageResultat(''); }
        else messageResultat('Copie refusée par le navigateur. Le lien est sélectionné ci-dessous : copie-le à la main.');
      });
    }
  });

  /* ===================================================================
     Hook V2 : génération d'image dans l'appli. Présent mais vide en V1,
     aucun bouton ne l'appelle.
     =================================================================== */
  function generateImage(photo, prompt) { // eslint-disable-line no-unused-vars
    return Promise.reject(new Error('Disponible en V2 : en V1, copie le prompt et colle-le dans Gemini.'));
  }

  /* ===================================================================
     Démarrage
     =================================================================== */
  function demarrer() {
    var mode = lire(CLES.mode, null);
    etat.mode = mode === 'barber' || mode === 'salon' ? mode : null;
    appliquerTheme();

    var session = lire(CLES.session, null);
    var reprise = depuisDonnees(session);
    if (reprise) {
      charger(reprise);
      etat.reference = session.ref === true;
    }

    /* Lien partagé : ?r=<recette en base64url>. On charge la recette puis on nettoie l'adresse. */
    var parametre = /[?&]r=([A-Za-z0-9_-]+)/.exec(window.location.search);
    if (parametre) {
      var partagee = null;
      try { partagee = depuisDonnees(decoder(parametre[1])); } catch (e) { partagee = null; }
      if (partagee) charger(partagee);
      else {
        $('#message-accueil').textContent = 'Ce lien de recette est illisible. Demande un nouveau lien, ou choisis une coupe.';
        $('#message-accueil').hidden = false;
      }
      try {
        window.history.replaceState(null, '', window.location.pathname + (partagee ? '#recette' : '#accueil'));
      } catch (e) { /* adresse non modifiable : sans gravité */ }
      window.addEventListener('hashchange', suivreAdresse);
      afficher(partagee ? 'recette' : 'accueil');
      return;
    }

    window.addEventListener('hashchange', suivreAdresse);
    afficher(ecranDepuisAdresse());
  }

  /* Accès pour les tests et pour la V2. */
  window.CoupeStudio = {
    etat: etat,
    generateImage: generateImage,
    resume: resume,
    descAnglaise: descAnglaise,
    coupePourDiagnostic: coupePourDiagnostic,
    recetteParDefaut: recetteParDefaut,
    coupeDuCatalogue: coupeDuCatalogue,
    propositions: propositions,
    avertissements: avertissements,
    etapesResultat: etapesResultat,
    encoder: encoder,
    decoder: decoder
  };

  demarrer();
})();
