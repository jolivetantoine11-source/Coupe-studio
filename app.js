/* Coupe Studio — app.js
   Navigation page par page, état unique du client en cours, réglages d'une coupe,
   profil, catalogue personnalisé, catalogue fond, génération des prompts.
   Dépend de catalogue.js, caracteristiques.js, fonds.js, retouche.js et prompts.js.
   Aucun serveur, aucun compte : rien ne quitte le téléphone. */
(function () {
  'use strict';

  var C = window.CATALOGUE;
  var K = window.CARACTERISTIQUES;
  var F = window.FONDS;
  var R = window.RETOUCHE;
  var P = window.PROMPTS;

  /* ===================================================================
     1. Stockage : toujours dans un try/catch. L'appli marche sans.
        localStorage   : mode, coupes personnalisées enregistrées, coupes ajoutées
        sessionStorage : le client en cours
     =================================================================== */
  var CLES = {
    mode: 'coupe-studio:mode',
    enregistrees: 'coupe-studio:recettes', // nom de clé d'origine, gardé pour ne rien perdre
    coupes: 'coupe-studio:coupes',
    session: 'coupe-studio:session'
  };
  var MAX_ENREGISTREES = 30;

  /* Si le stockage est bloqué ou plein, les données vivent en mémoire le temps de la visite. */
  var memoire = {};

  function lire(cle, defaut, session) {
    try {
      var brut = window[session ? 'sessionStorage' : 'localStorage'].getItem(cle);
      if (brut !== null) return JSON.parse(brut);
    } catch (e) { /* stockage bloqué ou donnée illisible */ }
    return Object.prototype.hasOwnProperty.call(memoire, cle) ? memoire[cle] : defaut;
  }

  /* Renvoie true si la valeur est gardée dans le navigateur, false si elle ne vit qu'en mémoire. */
  function ecrire(cle, valeur, session) {
    try {
      window[session ? 'sessionStorage' : 'localStorage'].setItem(cle, JSON.stringify(valeur));
      delete memoire[cle];
      return true;
    } catch (e) {
      memoire[cle] = valeur;
      return false;
    }
  }

  /* ===================================================================
     2. État unique
     Tout ce que le coiffeur a choisi pour le client en cours vit ici.
     Changer de page (en avant ou en arrière) ne le modifie jamais :
     seul « Nouveau client » le remet à zéro.
     =================================================================== */
  var ECRANS = ['accueil', 'client', 'choix', 'catalogue', 'reglages', 'personnalise', 'resultat', 'fond', 'retouche', 'retouche-ia'];

  var QUESTIONS = [
    { id: 'texture', nom: 'Texture', options: [['lisses', 'Lisses'], ['ondules', 'Ondulés'], ['boucles', 'Bouclés'], ['crepus', 'Crépus']] },
    { id: 'visage', nom: 'Visage', options: [['ovale', 'Ovale'], ['rond', 'Rond'], ['carre', 'Carré'], ['allonge', 'Allongé']] },
    /* « Cheveux fins » n'est proposé qu'en salon. */
    { id: 'front', nom: 'Ligne frontale et densité', options: [['normale', 'Normale'], ['golfes-legers', 'Golfes légers'], ['golfes-marques', 'Golfes marqués'], ['fins', 'Cheveux fins', 'salon']] },
    { id: 'longueur', nom: 'Longueur actuelle', options: [['courte', 'Courte'], ['moyenne', 'Moyenne'], ['longue', 'Longue']] },
    { id: 'lunettes', nom: 'Lunettes', options: [['oui', 'Oui'], ['non', 'Non']] }
  ];

  function profilVide() {
    return { texture: null, visage: null, front: null, longueur: null, lunettes: null };
  }

  function retoucheVide() {
    return { outil: 'luminosite', luminosite: 0, contraste: 0, chaleur: 0, nb: false, format: 'original', montage: false };
  }

  /* Le client en cours, vide. */
  function clientVide() {
    return {
      profil: profilVide(),
      coupe: null,            // la coupe choisie (catalogue ou coupe ajoutée)
      reglages: null,         // ses réglages
      reglagesParCoupe: {},   // les réglages de chaque coupe déjà réglée pour ce client
      avecCoupe: true,        // la coupe sert-elle de départ ? (« Coupe de départ » du Catalogue personnalisé)
      caracteristiques: [],   // caractéristiques choisies (ids)
      couleurLibre: '',       // texte de « Couleur libre »
      reference: false,       // « J'ai une photo de référence »
      fiche: 'barber',        // fiche voulue quand ni le mode ni la coupe ne le disent
      retouche: retoucheVide(),                        // retouches sans IA
      retoucheIa: { choix: [], couleur: 'bleu-gris' }  // retouches IA
    };
  }

  var etat = clientVide();
  etat.mode = null;       // null (thème neutre), 'barber' ou 'salon'
  etat.ecran = 'accueil';

  /* Photos du Catalogue fond : en mémoire seulement, jamais stockées ni envoyées. */
  var photos = { apres: null, avant: null, urlApres: null, urlAvant: null, urlFinale: null };

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

  function sansDoublons(liste) {
    return liste.filter(function (x, i) { return liste.indexOf(x) === i; });
  }

  var ICONE_COCHE = '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12L10 17L19 7"/></svg>';

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

  function alerte(titre, texte) {
    return el('div', { 'class': 'alerte' }, [
      titre ? el('b', { texte: titre }) : null,
      el('span', { 'class': titre ? 'discret' : null, texte: texte })
    ]);
  }

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
    return etat.coupe && etat.coupe.id === id ? etat.coupe : null;
  }

  function coupeVersDonnees(c) {
    if (!c) return null;
    return c.perso ? { id: c.id, nom: c.fr, ligne: c.ligne, en: c.desc, mode: c.mode } : c.id;
  }

  function coupeDepuisDonnees(x) {
    return typeof x === 'string' ? coupeDuCatalogue(x) : validerCoupePerso(x);
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
     5. Réglages d'une coupe : valeurs par défaut, résumé français, description anglaise
     =================================================================== */
  function reglagesParDefaut(coupe) {
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

  /* Texte d'un réglage pour sa valeur actuelle : { en, fr }, ou null s'il est vide. */
  function texteReglage(g, r) {
    var v = r[g.id];
    if (v === null || v === undefined) return null;
    if (g.type === 'curseur') return { en: inserer(g.en, 'X', v), fr: inserer(g.res, 'X', v) };
    if (g.type === 'longueur') {
      var rp = repere(g, v);
      return { en: inserer(inserer(g.en, 'Y', v), 'X', rp.en), fr: inserer(inserer(g.res, 'Y', v), 'X', rp.res) };
    }
    var o = option(g, v);
    if (!o) return null;
    if (o.libre) {
      if (!r.couleurAutre) return { en: '', fr: '' };
      return { en: inserer(o.en, 'X', r.couleurAutre), fr: inserer(o.res, 'X', r.couleurAutre) };
    }
    return { en: o.en, fr: o.res };
  }

  /* ===================================================================
     6. Caractéristiques (Catalogue personnalisé)
     =================================================================== */
  function caracteristique(id) {
    for (var i = 0; i < K.categories.length; i++) {
      var liste = K.categories[i].liste;
      for (var j = 0; j < liste.length; j++) { if (liste[j].id === id) return liste[j]; }
    }
    return null;
  }

  /* Une seule caractéristique par groupe exclusif : la première rencontrée est gardée.
     Protège aussi contre un lien partagé ou une mémoire qui en contiendrait deux. */
  function validerCaracteristiques(liste) {
    if (!Array.isArray(liste)) return [];
    var propre = [];
    liste.forEach(function (id) {
      if (typeof id !== 'string' || !caracteristique(id) || propre.indexOf(id) >= 0) return;
      if (propre.some(function (autre) { return K.conflit(id, autre); })) return;
      propre.push(id);
    });
    return propre;
  }

  /* Les caractéristiques choisies qui comptent, dans l'ordre du catalogue.
     « Couleur libre » sans texte ne compte pas. */
  function caracteristiquesActives(x) {
    var liste = [];
    K.categories.forEach(function (categorie) {
      categorie.liste.forEach(function (c) {
        if (x.caracteristiques.indexOf(c.id) < 0) return;
        if (c.libre && !x.couleurLibre) return;
        liste.push(c);
      });
    });
    return liste;
  }

  function texteCaracteristique(c, x) {
    if (c.libre) return { en: inserer(c.en, 'X', x.couleurLibre), fr: c.res + ' ' + x.couleurLibre };
    return { en: c.en, fr: c.res || c.fr.toLowerCase() };
  }

  /* ===================================================================
     7. La coupe personnalisée, emplacement par emplacement
     Une « création » = { coupe, reglages, caracteristiques, couleurLibre }.
     Dans chaque emplacement (zone.part, voir catalogue.js), la valeur la plus précise
     REMPLACE les autres :  caractéristique choisie > réglage modifié > texte de la coupe.
     Rien ne s'ajoute en vrac à la fin : deux consignes contraires ne peuvent pas
     cohabiter dans une même zone.
     =================================================================== */
  function creation() {
    var avec = etat.avecCoupe && !!etat.coupe;
    return {
      coupe: avec ? etat.coupe : null,
      reglages: avec ? etat.reglages : null,
      caracteristiques: etat.caracteristiques,
      couleurLibre: etat.couleurLibre
    };
  }

  /* Compose la coupe. Renvoie :
       slots     : { 'sides.style': [{ en, fr }], … }  (fr null : texte de la coupe, absent du résumé)
       remplaces : { idDuReglage: caractéristique qui le remplace } */
  function composer(x) {
    var slots = {};
    var remplaces = {};
    var actives = caracteristiquesActives(x);
    var parSlot = {};
    var effaces = {};
    actives.forEach(function (c) {
      (parSlot[c.slot] = parSlot[c.slot] || []).push(c);
      (c.efface || []).forEach(function (slot) { if (!effaces[slot]) effaces[slot] = c; });
    });

    /* 1. Le texte de la coupe. */
    if (x.coupe && x.coupe.zones) {
      Object.keys(x.coupe.zones).forEach(function (slot) { slots[slot] = [{ en: x.coupe.zones[slot], fr: null, choix: false }]; });
    }

    /* 2. Les réglages : un réglage modifié remplace le texte de la coupe dans son emplacement. */
    var degrade = x.coupe ? C.texteDegrade(x.coupe, x.reglages) : null;
    if (x.coupe) {
      var base = reglagesParDefaut(x.coupe);
      C.reglages[x.coupe.mode].forEach(function (g) {
        var remplacant = (parSlot[g.slot] && parSlot[g.slot][0]) || effaces[g.slot] || null;
        if (!remplacant) {
          actives.forEach(function (c) {
            if (!remplacant && c.exclutReglage && (c.exclutReglage[g.id] || []).indexOf(x.reglages[g.id]) >= 0) remplacant = c;
          });
          if (remplacant) slots[g.slot] = [];
        }
        if (remplacant) { remplaces[g.id] = remplacant; return; }
        /* Côtés en dégradé : écrits d'un bloc plus bas (hauteur, skin fade ou fade, sabots). */
        if (degrade && (g.slot === 'sides.style' || g.slot === 'sides.guard')) return;
        if (g.siDegrade) return;
        var t = texteReglage(g, x.reglages);
        if (!t) return;
        var toujours = g.toujours || g.type !== 'choix'; // les mesures (sabot, dessus, longueur) figurent toujours dans le résumé
        if (x.reglages[g.id] !== base[g.id]) {
          slots[g.slot] = t.en || t.fr ? [{ en: t.en, fr: t.fr || null, choix: true }] : [];
        } else if (slots[g.slot] && slots[g.slot].length) {
          if (toujours) slots[g.slot][0].fr = t.fr;
        } else if (t.en) {
          slots[g.slot] = [{ en: t.en, fr: toujours ? t.fr : null, choix: false }];
        }
      });
    }

    /* Côtés en dégradé, s'ils ne sont pas remplacés par une caractéristique :
       « <low|mid|high> <skin fade|fade>, from guard X at the bottom to guard Y at the top ». */
    if (degrade) {
      var styleModifie = ['cotes', 'hauteur'].some(function (id) { return x.reglages[id] !== base[id]; });
      if (!remplaces.cotes && !remplaces.hauteur) slots['sides.style'] = [{ en: degrade.style.en, fr: styleModifie ? degrade.style.fr : null, choix: styleModifie }];
      if (!remplaces.sabot) slots['sides.guard'] = [{ en: degrade.guard.en, fr: degrade.guard.fr, choix: x.reglages.sabot !== base.sabot }];
    }

    /* 3. Les caractéristiques remplacent tout le reste dans leur emplacement. */
    Object.keys(parSlot).forEach(function (slot) {
      slots[slot] = parSlot[slot].map(function (c) { var t = texteCaracteristique(c, x); t.choix = true; return t; });
    });
    Object.keys(effaces).forEach(function (slot) { if (!parSlot[slot]) slots[slot] = []; });
    return { slots: slots, remplaces: remplaces };
  }

  /* Les morceaux d'une zone, dans l'ordre de ses emplacements. */
  function entreesZone(slots, zone) {
    var entrees = [];
    zone.parts.forEach(function (part) { (slots[zone.id + '.' + part] || []).forEach(function (e) { entrees.push(e); }); });
    return entrees;
  }

  function zoneBarbe() {
    for (var i = 0; i < C.zones.length; i++) { if (C.zones[i].id === 'beard') return C.zones[i]; }
    return null;
  }

  /* « Barbe seule » : choisie dans le groupe Barbe, et une barbe est bien décrite. */
  function barbeSeule(x) {
    if (!x.coupe || x.coupe.mode !== 'barber' || !x.reglages || x.reglages.barbeSeule !== true) return false;
    return entreesZone(composer(x).slots, zoneBarbe()).some(function (e) { return e.en; });
  }

  /* Vrai si rien n'est à générer. */
  function creationVide(x) {
    if (x.coupe) return false;
    var slots = composer(x).slots;
    return !Object.keys(slots).some(function (k) { return slots[k].some(function (e) { return e.en; }); });
  }

  function sansPointFinal(texte) {
    return String(texte).replace(/[\s.]+$/, '');
  }

  var FRONT_PAR_DEFAUT = 'no fringe, forehead uncovered, keep the front as in the original';

  /* [COUPE] du prompt image :
     « <nom anglais>. Length: … Sides: … Top: … Front: … Neckline: … Color: … Beard: … »
     Seules les zones qui ont une valeur sont écrites. Pas de point final : le prompt en a un. */
  function descAnglaise(x, sansCouleur) {
    var slots = composer(x).slots;
    var ligne = function (zone) {
      var en = entreesZone(slots, zone).map(function (e) { return e.en; }).filter(Boolean);
      return en.length ? zone.en + ': ' + sansDoublons(en).join(', ') : null;
    };
    if (barbeSeule(x)) return ligne(zoneBarbe());
    var tete = 'Custom haircut';
    if (x.coupe) tete = x.coupe.perso ? x.coupe.fr + ': ' + sansPointFinal(x.coupe.desc || x.coupe.ligne) : C.nomCoupe(x.coupe, x.reglages).en;
    /* Front toujours écrit (décision du 15 novembre) : sans frange ni mèche choisie, on le dit
       explicitement, pour que Gemini n'en invente pas. */
    return [sansPointFinal(tete)].concat(C.zones.map(function (zone) {
      if (sansCouleur && zone.id === 'color') return null; // la couleur a son étape à elle
      return ligne(zone) || (zone.id === 'front' ? zone.en + ': ' + FRONT_PAR_DEFAUT : null);
    }).filter(Boolean)).join('. ');
  }

  /* Résumé français en une ligne, dans l'ordre des zones,
     ex. « Skin fade, sabot 0,5, dessus 5 cm, barbe entretenue ». */
  function resume(x, nomDeLaCoupe) {
    var slots = composer(x).slots;
    var fr = function (zones) {
      var morceaux = [];
      zones.forEach(function (zone) {
        entreesZone(slots, zone).forEach(function (e) { if (e.fr) morceaux.push(e.fr); });
      });
      return sansDoublons(morceaux);
    };
    if (barbeSeule(x)) return 'Barbe seule : ' + fr([zoneBarbe()]).join(', ') + ', cheveux inchangés';
    var morceaux = fr(C.zones);
    if (!x.coupe) return morceaux.length ? 'Coupe personnalisée : ' + morceaux.join(', ') : '';
    var nom = nomDeLaCoupe || C.nomCoupe(x.coupe, x.reglages).fr;
    /* « Dégradé » + « dégradé haut » s'écrit « Dégradé haut ». */
    if (morceaux.length && morceaux[0].indexOf(nom.toLowerCase() + ' ') === 0) nom += morceaux.shift().slice(nom.length);
    return [nom].concat(morceaux).join(', ');
  }

  /* Couleur demandée par l'utilisateur (réglage ou caractéristique), sans « change to »,
     ou null. « Poivre et sel gardé » n'est pas un changement. Sert à l'étape Couleur. */
  function couleurDemandee(x) {
    if (!x.coupe && creationVide(x)) return null;
    if (barbeSeule(x)) return null;
    var zone = C.zones.filter(function (z) { return z.id === 'color'; })[0];
    var changements = entreesZone(composer(x).slots, zone)
      .filter(function (e) { return e.choix === true && /^change to /.test(e.en); })
      .map(function (e) { return e.en.replace(/^change to /, ''); });
    return changements.length ? changements.join(', ') : null;
  }

  /* Le prompt image interdit de toucher à la barbe et à la texture. Si l'utilisateur en demande un
     changement (réglage modifié ou caractéristique dans la zone Beard hors barbe seule, ou Texture),
     la ligne d'exception de PROMPTS.md est ajoutée. Le texte par défaut de la coupe (ex. « natural
     curls » du carré bouclé) ne la déclenche jamais.
     Renvoie 'barbe', 'texture', 'barbe-texture' ou null. */
  function changementDemande(x) {
    if (barbeSeule(x)) return null;
    var slots = composer(x).slots;
    var remplie = function (id) {
      var zone = C.zones.filter(function (z) { return z.id === id; })[0];
      return entreesZone(slots, zone).some(function (e) { return e.en && e.choix === true; });
    };
    var barbe = remplie('beard');
    var texture = remplie('texture');
    if (barbe && texture) return 'barbe-texture';
    return barbe ? 'barbe' : (texture ? 'texture' : null);
  }

  /* Texte français qui remplace [COUPE] dans le diagnostic.
     Une coupe ajoutée n'est pas connue de Gemini : on joint sa description. */
  function coupePourDiagnostic(x) {
    if (x.coupe && x.coupe.perso && !barbeSeule(x)) return resume(x, x.coupe.fr + ' (' + x.coupe.ligne + ')');
    return resume(x);
  }

  /* Choisir une coupe : ses réglages déjà faits pour ce client sont retrouvés. */
  function choisirCoupe(coupe) {
    etat.coupe = coupe;
    etat.reglages = etat.reglagesParCoupe[coupe.id] || reglagesParDefaut(coupe);
    etat.reglagesParCoupe[coupe.id] = etat.reglages;
    etat.avecCoupe = true;
    memoriser();
  }

  /* ===================================================================
     8. Mémoire : session en cours, coupes enregistrées, lien partagé
     =================================================================== */
  function validerReglages(coupe, r) {
    var base = reglagesParDefaut(coupe);
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
    if (coupe.mode === 'barber') {
      propre.barbeSeule = r.barbeSeule === true;
      C.accorderDegrade(propre, null);
    }
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

  function validerRetouche(t) {
    var propre = retoucheVide();
    if (!t || typeof t !== 'object') return propre;
    ['luminosite', 'contraste', 'chaleur'].forEach(function (k) {
      if (typeof t[k] === 'number' && isFinite(t[k])) propre[k] = Math.min(50, Math.max(-50, Math.round(t[k])));
    });
    propre.nb = t.nb === true;
    propre.montage = t.montage === true;
    F.formats.forEach(function (f) { if (t.format === f.id) propre.format = f.id; });
    F.sansIa.forEach(function (o) { if (t.outil === o.id) propre.outil = o.id; });
    return propre;
  }

  function validerRetoucheIa(t) {
    var propre = { choix: [], couleur: 'bleu-gris' };
    if (!t || typeof t !== 'object') return propre;
    if (Array.isArray(t.choix)) F.ia.forEach(function (r) { if (t.choix.indexOf(r.id) >= 0) propre.choix.push(r.id); });
    F.couleurs.forEach(function (c) { if (t.couleur === c.id) propre.couleur = c.id; });
    return propre;
  }

  /* La coupe personnalisée en cours, sous forme de données simples (enregistrement, lien partagé).
     Le lien partagé n'emporte pas le profil du client. */
  function versDonnees(avecProfil) {
    var x = creation();
    var d = { v: 2, c: coupeVersDonnees(x.coupe), r: x.reglages ? copie(x.reglages) : null, k: x.caracteristiques.slice(), kl: x.couleurLibre };
    if (avecProfil) d.p = copie(etat.profil);
    return d;
  }

  /* Relit des données (stockage ou lien). Tout est vérifié : une valeur inconnue est ignorée. */
  function depuisDonnees(d) {
    if (!d || typeof d !== 'object') return null;
    var coupe = d.c ? coupeDepuisDonnees(d.c) : null;
    if (d.c && !coupe) return null;
    var x = {
      coupe: coupe,
      reglages: coupe ? validerReglages(coupe, d.r) : null,
      caracteristiques: validerCaracteristiques(d.k),
      couleurLibre: texteCourt(d.kl, 80),
      profil: d.p ? validerProfil(d.p) : null
    };
    return creationVide(x) ? null : x;
  }

  /* Charge une coupe personnalisée enregistrée ou partagée dans le client en cours. */
  function charger(x) {
    if (x.coupe) {
      etat.coupe = x.coupe;
      etat.reglages = x.reglages;
      etat.reglagesParCoupe[x.coupe.id] = x.reglages;
    }
    etat.avecCoupe = !!x.coupe;
    etat.caracteristiques = x.caracteristiques;
    etat.couleurLibre = x.couleurLibre;
    if (x.profil) etat.profil = x.profil;
    etat.reference = false;
    memoriser();
  }

  /* Tout l'état du client part dans sessionStorage à chaque changement :
     un retour arrière ou un rechargement de la page ne perd rien. */
  function memoriser() {
    var parCoupe = {};
    for (var id in etat.reglagesParCoupe) {
      if (Object.prototype.hasOwnProperty.call(etat.reglagesParCoupe, id)) parCoupe[id] = etat.reglagesParCoupe[id];
    }
    ecrire(CLES.session, {
      v: 2,
      p: etat.profil,
      c: coupeVersDonnees(etat.coupe),
      r: etat.reglages,
      rp: parCoupe,
      b: etat.avecCoupe,
      k: etat.caracteristiques,
      kl: etat.couleurLibre,
      ref: etat.reference,
      fi: etat.fiche,
      t: etat.retouche,
      ti: etat.retoucheIa
    }, true);
  }

  function restaurer() {
    var d = lire(CLES.session, null, true);
    if (!d || typeof d !== 'object') return;
    etat.profil = validerProfil(d.p);
    var coupe = d.c ? coupeDepuisDonnees(d.c) : null;
    if (coupe) {
      etat.coupe = coupe;
      etat.reglages = validerReglages(coupe, d.r);
    }
    if (d.rp && typeof d.rp === 'object') {
      Object.keys(d.rp).forEach(function (id) {
        var c = trouverCoupe(id);
        if (c) etat.reglagesParCoupe[id] = validerReglages(c, d.rp[id]);
      });
    }
    if (coupe) etat.reglagesParCoupe[coupe.id] = etat.reglages;
    etat.avecCoupe = d.b !== false;
    etat.caracteristiques = validerCaracteristiques(d.k);
    etat.couleurLibre = texteCourt(d.kl, 80);
    etat.reference = d.ref === true;
    etat.fiche = d.fi === 'salon' ? 'salon' : 'barber';
    etat.retouche = validerRetouche(d.t);
    etat.retoucheIa = validerRetoucheIa(d.ti);
  }

  /* Vrai si rien n'a encore été choisi pour ce client. */
  function clientEstVide() {
    var p = etat.profil;
    var t = etat.retouche;
    var profilRenseigne = QUESTIONS.some(function (q) { return p[q.id] !== null; });
    var retouche = t.luminosite || t.contraste || t.chaleur || t.nb || t.montage || t.format !== 'original';
    return !profilRenseigne && !etat.coupe && etat.caracteristiques.length === 0 && !etat.couleurLibre &&
      !retouche && etat.retoucheIa.choix.length === 0 && !photos.apres && !photos.avant;
  }

  function oublierPhoto(cle) {
    var cleUrl = cle === 'apres' ? 'urlApres' : 'urlAvant';
    if (photos[cleUrl]) { try { window.URL.revokeObjectURL(photos[cleUrl]); } catch (e) { /* sans gravité */ } }
    photos[cle] = null;
    photos[cleUrl] = null;
  }

  /* « Nouveau client » : le seul geste qui remet tout à zéro. Le mode et les coupes enregistrées restent. */
  function nouveauClient() {
    var vide = clientVide();
    for (var k in vide) { if (Object.prototype.hasOwnProperty.call(vide, k)) etat[k] = vide[k]; }
    oublierPhoto('apres');
    oublierPhoto('avant');
    memoriser();
  }

  function enregistrees() {
    var liste = lire(CLES.enregistrees, []);
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
     9. Navigation : une entrée d'historique par page
     La flèche, le glissement depuis le bord gauche et le bouton retour du
     téléphone font tous la même chose : history.back(). Aucun ne touche à l'état.
     =================================================================== */
  var RENDUS = {};
  var premierAffichage = true;
  var rang = 0; // nombre de pages de l'appli derrière nous dans l'historique

  function ecranDepuisAdresse() {
    var h = (window.location.hash || '').replace(/^#/, '');
    return ECRANS.indexOf(h) >= 0 && $('#ecran-' + h) ? h : 'accueil';
  }

  /* La page d'où l'on vient logiquement, si l'historique est vide (lien ouvert directement). */
  function parent(ecran) {
    var x = creation();
    switch (ecran) {
      case 'client': return 'accueil';
      case 'choix': return 'client';
      case 'reglages': return 'catalogue';
      case 'resultat': return x.coupe ? 'reglages' : 'personnalise';
      case 'retouche':
      case 'retouche-ia': return 'fond';
      case 'accueil': return 'accueil';
      default: return 'choix';
    }
  }

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
    $('#entete').hidden = ecran === 'accueil';
    var section = $('#ecran-' + ecran);
    var defile = $('.defile', section);
    if (defile) defile.scrollTop = 0;
    if (!premierAffichage) {
      var titre = $('h1', section);
      if (titre) titre.focus({ preventScroll: true });
    }
    premierAffichage = false;
  }

  /* Avancer : affiche la page tout de suite et ajoute une entrée à l'historique. */
  function aller(ecran) {
    if (!$('#ecran-' + ecran)) ecran = 'accueil';
    if (ecran === etat.ecran) { afficher(ecran); return; }
    rang++;
    try {
      window.history.pushState({ rang: rang }, '', '#' + ecran);
    } catch (e) {
      window.location.hash = ecran;
    }
    afficher(ecran);
  }

  /* Reculer d'une page. */
  function retour() {
    if (etat.ecran === 'accueil') return;
    if (rang > 0) { window.history.back(); return; }
    var cible = parent(etat.ecran);
    try { window.history.replaceState({ rang: 0 }, '', '#' + cible); } catch (e) { /* sans gravité */ }
    afficher(cible);
  }

  /* Bouton retour du téléphone, geste natif, flèche : l'historique a bougé, on affiche la page. */
  window.addEventListener('popstate', function (evenement) {
    rang = evenement.state && typeof evenement.state.rang === 'number' ? evenement.state.rang : 0;
    var ecran = ecranDepuisAdresse();
    if (ecran !== etat.ecran) afficher(ecran);
  });

  window.addEventListener('hashchange', function () {
    var ecran = ecranDepuisAdresse();
    if (ecran !== etat.ecran) afficher(ecran);
  });

  $('#retour').addEventListener('click', retour);

  /* Liens internes (boutons principaux, gros boutons) : même chemin que `aller`. */
  document.addEventListener('click', function (evenement) {
    var lien = evenement.target.closest('a[href^="#"]');
    if (!lien) return;
    var cible = lien.getAttribute('href').slice(1);
    if (ECRANS.indexOf(cible) < 0) return;
    evenement.preventDefault();
    aller(cible);
  });

  /* Glissement depuis le bord gauche : retour. Sur iPhone, le geste natif de Safari fait
     déjà reculer l'historique ; on attend donc un instant et on ne recule que si la page
     n'a pas déjà changé. */
  var glissement = null;
  document.addEventListener('touchstart', function (evenement) {
    glissement = null;
    if (etat.ecran === 'accueil' || evenement.touches.length !== 1) return;
    var doigt = evenement.touches[0];
    if (doigt.clientX > 24) return;
    if (evenement.target.closest && evenement.target.closest('input[type="range"]')) return;
    glissement = { x: doigt.clientX, y: doigt.clientY, ecran: etat.ecran };
  }, { passive: true });

  document.addEventListener('touchend', function (evenement) {
    if (!glissement) return;
    var doigt = evenement.changedTouches[0];
    var depart = glissement;
    glissement = null;
    if (doigt.clientX - depart.x < 64 || Math.abs(doigt.clientY - depart.y) > 48) return;
    window.setTimeout(function () { if (etat.ecran === depart.ecran) retour(); }, 80);
  }, { passive: true });

  document.addEventListener('touchcancel', function () { glissement = null; }, { passive: true });

  /* ---- « Nouveau client » : confirmation dans la page, jamais de confirm() ---- */
  function fermerConfirmations() {
    tous('[data-zone-nouveau]').forEach(function (zone) {
      $('[data-nouveau-normal]', zone).hidden = false;
      $('[data-nouveau-confirmation]', zone).hidden = true;
    });
  }

  document.addEventListener('click', function (evenement) {
    var b = evenement.target.closest('button');
    if (!b) return;
    var zone = b.closest('[data-zone-nouveau]');
    if (!zone) return;
    if (b.hasAttribute('data-nouveau-client')) {
      if (clientEstVide()) { aller('client'); return; }
      $('[data-nouveau-normal]', zone).hidden = true;
      $('[data-nouveau-confirmation]', zone).hidden = false;
      $('[data-confirmer-nouveau]', zone).focus();
    } else if (b.hasAttribute('data-confirmer-nouveau')) {
      nouveauClient();
      fermerConfirmations();
      aller('client');
    } else if (b.hasAttribute('data-annuler-nouveau')) {
      fermerConfirmations();
      $('[data-nouveau-client]', zone).focus();
    }
  });

  /* ---- Copier un texte (prompts, lien) ---- */
  function selectionner(noeud) {
    if (noeud.select) { noeud.focus(); noeud.select(); return; }
    var plage = document.createRange();
    plage.selectNodeContents(noeud);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(plage);
  }

  /* Si le presse-papiers est refusé : on sélectionne le texte affiché et on tente
     l'ancienne commande. Renvoie une promesse : true si la copie a réussi. */
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

  document.addEventListener('click', function (evenement) {
    var b = evenement.target.closest('[data-copier]');
    if (!b) return;
    var bloc = $('#' + b.getAttribute('data-copier'));
    var message = $('#message-' + b.getAttribute('data-copier'));
    copier(bloc.textContent, bloc).then(function (reussi) {
      message.hidden = reussi;
      if (reussi) confirmer(b, 'Copié');
      else message.textContent = 'Copie refusée par le navigateur. Le texte est sélectionné : copie-le à la main.';
    });
  });

  /* ===================================================================
     10. Accueil
     =================================================================== */
  RENDUS.accueil = function () {
    tous('#ecran-accueil [data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === etat.mode));
    });
    var liste = $('#liste-creations');
    vider(liste);
    var n = 0;
    enregistrees().forEach(function (donnees, index) {
      var x = depuisDonnees(donnees);
      if (!x) return;
      n++;
      liste.appendChild(el('button', { type: 'button', 'class': 'carte pile', 'data-enregistree': String(index) }, [
        el('span', { 'class': 'carte-titre', texte: resume(x) }),
        el('span', { 'class': 'discret', texte: dateRelative(donnees.date) })
      ]));
    });
    if (n === 0) {
      liste.appendChild(el('p', { 'class': 'discret', texte: 'Aucune pour l’instant. Touche « Enregistrer » sur la page Résultat pour en garder une.' }));
    }
    $('#action-accueil').textContent = clientEstVide() ? 'Commencer' : 'Continuer';
    fermerConfirmations();
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
    var carte = evenement.target.closest('[data-enregistree]');
    if (carte) {
      var x = depuisDonnees(enregistrees()[Number(carte.getAttribute('data-enregistree'))]);
      if (!x) return;
      charger(x);
      aller(x.coupe ? 'reglages' : 'personnalise');
    }
  });

  /* ===================================================================
     11. Profil client (en premier dans le parcours, facultatif)
     =================================================================== */
  /* Le mode qui compte pour une coupe : le sien, sinon celui de l'accueil. */
  function modeDeLaCoupe() {
    return etat.coupe && etat.avecCoupe ? etat.coupe.mode : etat.mode;
  }

  function profilRenseigne() {
    return QUESTIONS.some(function (q) { return etat.profil[q.id] !== null; });
  }

  function synchroniserClient() {
    tous('#questions [data-question]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(etat.profil[b.getAttribute('data-question')] === b.getAttribute('data-valeur')));
    });
  }

  RENDUS.client = function () {
    var zone = $('#questions');
    vider(zone);
    QUESTIONS.forEach(function (q) {
      var boutons = [];
      q.options.forEach(function (o) {
        /* « Cheveux fins » : salon seulement. Une réponse déjà donnée reste affichée. */
        if (o[2] && etat.mode === 'barber' && etat.profil[q.id] !== o[0]) return;
        boutons.push(boutonChoix(o[1], { 'data-question': q.id, 'data-valeur': o[0] }));
      });
      zone.appendChild(blocChoix('question-' + q.id, q.nom, boutons));
    });
    synchroniserClient();
  };

  $('#questions').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('[data-question]');
    if (!b) return;
    var id = b.getAttribute('data-question');
    var valeur = b.getAttribute('data-valeur');
    etat.profil[id] = etat.profil[id] === valeur ? null : valeur; // retoucher une réponse la retire
    memoriser();
    synchroniserClient();
  });

  /* ---- Avertissements (CLAUDE.md, section 7) ---- */
  var RANG_LONGUEUR = { courte: 0, moyenne: 1, longue: 2 };
  /* Limites en cm entre courte, moyenne et longue. Barber : longueur du dessus. Salon : longueur totale. */
  var SEUILS_LONGUEUR = { barber: [5, 10], salon: [19, 39] };

  function longueurDemandee(coupe, r) {
    var cm = coupe.mode === 'barber' ? r.dessus : r.longueur;
    if (cm === null || cm === undefined) return coupe.classe || null;
    var seuils = SEUILS_LONGUEUR[coupe.mode];
    return cm <= seuils[0] ? 'courte' : (cm <= seuils[1] ? 'moyenne' : 'longue');
  }

  /* Avertissements complets pour une coupe réglée (page Réglages). `court` sert aux cartes du catalogue. */
  function avertissements(coupe, r, profil) {
    var liste = [];
    /* Barbe seule : les cheveux ne changent pas. */
    if (!coupe || barbeSeule({ coupe: coupe, reglages: r, caracteristiques: etat.caracteristiques, couleurLibre: etat.couleurLibre })) return liste;
    var demandee = longueurDemandee(coupe, r);
    var boucles = profil.texture === 'boucles' || profil.texture === 'crepus';
    if (demandee && profil.longueur && RANG_LONGUEUR[demandee] > RANG_LONGUEUR[profil.longueur]) {
      liste.push({ id: 'pousse', court: 'Pousse nécessaire', titre: 'Pousse', texte: 'Il faut laisser pousser : environ 1 cm par mois.' });
    }
    if (coupe.lisse && boucles) {
      liste.push({ id: 'lissage', court: 'Lissage nécessaire', titre: 'Lissage', texte: 'Le rendu demande un lissage ou un brushing.' });
    }
    if (coupe.front && profil.front === 'golfes-marques') {
      liste.push({ id: 'golfes', court: 'Golfes', titre: 'Golfes marqués', texte: 'Ces coupes dégagent le front : garder du dessus pour couvrir la ligne frontale.' });
    }
    if (profil.longueur === 'longue' && demandee === 'courte') {
      liste.push({ id: 'radical', titre: 'Changement radical', texte: 'Plus de 10 cm coupés : changement radical, plusieurs mois pour revenir en arrière.' });
    }
    if (demandee && profil.longueur && demandee === profil.longueur) {
      liste.push({ id: 'leger', titre: 'Changement léger', texte: 'Le rendu sera peu visible.' });
    }
    if (coupe.mode === 'salon' && profil.front === 'fins' && (r.couches === 'marquees' || coupe.id === 'shag' || coupe.id === 'wolf-cut')) {
      liste.push({ id: 'fins', titre: 'Cheveux fins', texte: 'Garder du volume en haut : une coupe très dégradée aplatit la forme.' });
    }
    if (profil.lunettes === 'oui') {
      liste.push({ id: 'lunettes', titre: 'Lunettes', texte: 'Vérifie le contour d’oreille avec les lunettes remises.' });
    }
    return liste;
  }

  /* Coupe à risque pour ce client : golfes, lissage nécessaire, pousse nécessaire. */
  function risques(coupe, profil) {
    return avertissements(coupe, reglagesParDefaut(coupe), profil)
      .filter(function (a) { return a.court; })
      .map(function (a) { return a.court; });
  }

  /* ---- Coupes conseillées (CLAUDE.md, section 7) ----
     Règles simples : chaque réponse du profil favorise des coupes (+2 points chacune)
     ou en écarte (retirées de la liste). Une coupe à risque perd 1 point par risque.
     On garde les 3 meilleures du mode actif. À égalité, l'ordre du catalogue départage :
     les plus demandées d'abord. Visage ovale : aucune règle, donc les 3 plus demandées. */
  var REGLES = [
    /* Rond : volume en hauteur, côtés courts. Éviter buzz cut et carré arrondi au menton. */
    { question: 'visage', reponses: ['rond'], favorise: ['quiff', 'crop-texture', 'carre-plongeant', 'long-couches'], ecarte: ['buzz-cut', 'carre-boucle'] },
    /* Carré : adoucir. */
    { question: 'visage', reponses: ['carre'], favorise: ['raie-cote', 'mi-long-flow', 'carre-flou', 'frange-rideau'], ecarte: [] },
    /* Allongé : éviter la hauteur, garder de la largeur. En salon : carré droit et coupes à frange. */
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
      .map(function (c, ordre) { return { coupe: c, points: (points[c.id] || 0) - risques(c, profil).length, ordre: ordre }; })
      .filter(function (x) { return !ecartees[x.coupe.id]; })
      .sort(function (a, b) { return b.points - a.points || a.ordre - b.ordre; })
      .slice(0, 3)
      .map(function (x) { return x.coupe; });
  }

  /* ===================================================================
     12. Catalogue coupe
     =================================================================== */
  /* Carte de coupe, en texte : nom, une ligne, badges (« Conseillée », risques). */
  function carteCoupe(c, o) {
    o = o || {};
    var carte = el('button', {
      type: 'button',
      'class': 'carte coupe',
      'data-coupe': c.id,
      'aria-pressed': String(!!etat.coupe && etat.avecCoupe && etat.coupe.id === c.id)
    }, [
      o.badge ? el('span', { 'class': 'badge', texte: 'Conseillée' }) : null,
      el('span', { 'class': 'coupe-nom', texte: c.fr }),
      el('span', { 'class': 'coupe-ligne', texte: c.ligne })
    ]);
    (o.risques || []).forEach(function (r) { carte.appendChild(el('span', { 'class': 'risque', texte: r })); });
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

    /* Profil rempli : 3 coupes conseillées en haut, et les coupes à risque sont marquées. */
    var avecProfil = profilRenseigne();
    var conseillees = avecProfil ? propositions(etat.profil) : [];
    var zone = $('#conseillees');
    vider(zone);
    conseillees.forEach(function (c) { zone.appendChild(carteCoupe(c, { badge: true, risques: risques(c, etat.profil) })); });
    $('#bloc-conseillees').hidden = !avecProfil;
    $('#titre-toutes').hidden = !avecProfil;

    /* « Autres coupes » : sans répéter les conseillées. */
    var grille = $('#grille-coupes');
    vider(grille);
    liste.forEach(function (c) {
      if (conseillees.indexOf(c) >= 0) return;
      grille.appendChild(carteCoupe(c, { risques: avecProfil ? risques(c, etat.profil) : [] }));
    });
    $('#ajout-type').hidden = !!etat.mode;
    fermerAjout();
  };

  $('#ecran-catalogue').addEventListener('click', function (evenement) {
    var carte = evenement.target.closest('[data-coupe]');
    if (!carte) return;
    var c = trouverCoupe(carte.getAttribute('data-coupe'));
    if (!c) return;
    choisirCoupe(c);
    aller('reglages');
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
    else if (!mode) { erreur = 'Choisis Barber ou Salon : cela fixe les réglages proposés.'; fautif = $('#ajout-type [data-type]'); }
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
    aller('reglages');
  });

  /* ===================================================================
     13. Réglages d'une coupe
     =================================================================== */
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

  /* Chaque réglage vit dans une enveloppe : ses contrôles, ou la phrase « Côtés remplacés par : … »
     quand une caractéristique du même emplacement le remplace. */
  function construireReglages() {
    var zone = $('#zone-reglages');
    vider(zone);
    C.reglages[etat.coupe.mode].forEach(function (g) {
      var controles;
      if (g.type === 'curseur') {
        controles = [blocCurseur(g)];
      } else if (g.type === 'longueur') {
        controles = [
          blocChoix(g.id, g.nom, g.reperes.map(function (rp) { return boutonChoix(rp.fr, { 'data-repere': rp.v }); })),
          blocCurseur(g)
        ];
      } else {
        controles = [blocChoix(g.id, g.nom, g.options.map(function (o) {
          return boutonChoix(o.fr, { 'data-reglage': g.id, 'data-valeur': o.v });
        }))];
        if (g.id === 'couleur') {
          controles.push(el('div', { id: 'bloc-couleur-autre' }, [
            el('label', { 'class': 'etiquette', 'for': 'couleur-autre', texte: 'Couleur voulue, en anglais' }),
            el('input', { 'class': 'champ', type: 'text', id: 'couleur-autre', maxlength: '80', lang: 'en', autocomplete: 'off', placeholder: 'copper red' })
          ]));
        }
      }
      var enveloppe = el('div', { 'class': 'pile', id: 'reglage-' + g.id }, [
        el('div', { 'class': 'blocs', 'data-controles': g.id }, controles),
        el('div', { 'class': 'pile', 'data-remplace': g.id, hidden: true }, [
          el('p', { 'class': 'discret', id: 'texte-remplace-' + g.id }),
          el('a', { 'class': 'btn-2', href: '#personnalise', texte: 'Modifier' })
        ])
      ]);
      /* « Barbe seule » : dans le groupe Barbe, sous les styles. */
      if (g.id === 'barbe') {
        enveloppe.appendChild(el('div', { 'class': 'groupe', role: 'group', 'aria-label': 'Barbe seule' }, [
          boutonChoix('Barbe seule (ne pas toucher aux cheveux)', { 'data-barbe-seule': 'oui' })
        ]));
        enveloppe.appendChild(el('p', { 'class': 'alerte', id: 'message-barbe-seule', hidden: true,
          texte: 'Barbe seule : choisis aussi la barbe voulue (au-dessus ou dans le Catalogue personnalisé).' }));
      }
      zone.appendChild(enveloppe);
    });
  }

  /* Met la page en accord avec les réglages : boutons actifs, curseurs, réglages remplacés,
     blocs conditionnels, avertissements, résumé. */
  function synchroniserReglages() {
    var r = etat.reglages;
    var coupe = etat.coupe;
    var x = { coupe: coupe, reglages: r, caracteristiques: etat.caracteristiques, couleurLibre: etat.couleurLibre };
    var remplaces = composer(x).remplaces;
    tous('#zone-reglages [data-reglage]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(r[b.getAttribute('data-reglage')] === b.getAttribute('data-valeur')));
    });
    C.reglages[coupe.mode].forEach(function (g) {
      if (g.siDegrade) $('#reglage-' + g.id).hidden = !C.estDegrade(r);
      var remplacant = remplaces[g.id];
      $('[data-controles="' + g.id + '"]').hidden = !!remplacant;
      $('[data-remplace="' + g.id + '"]').hidden = !remplacant;
      if (remplacant) $('#texte-remplace-' + g.id).textContent = g.nom + ' ' + g.accord + ' par : ' + remplacant.fr.toLowerCase();
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
        tous('#zone-reglages [data-repere]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(v !== null && repere(g, v).v === b.getAttribute('data-repere')));
        });
      }
    });
    if (coupe.mode === 'barber') {
      $('#zone-reglages [data-barbe-seule]').setAttribute('aria-pressed', String(r.barbeSeule === true));
      $('#message-barbe-seule').hidden = !(r.barbeSeule === true && !barbeSeule(x));
    }
    if (coupe.mode === 'salon') {
      var champ = $('#couleur-autre');
      $('#bloc-couleur-autre').hidden = r.couleur !== 'autre';
      if (document.activeElement !== champ) champ.value = r.couleurAutre;
    }
    var zone = $('#avertissements');
    vider(zone);
    avertissements(coupe, r, etat.profil).forEach(function (a) { zone.appendChild(alerte(a.titre, a.texte)); });
    zone.hidden = !zone.firstChild;
    /* Le résumé de cette page décrit toujours la coupe affichée. */
    $('#resume-reglages').textContent = resume(x);
    memoriser();
  }

  var minuterieSuppression = null;

  RENDUS.reglages = function () {
    var vide = !etat.coupe;
    $('#titre-reglages').textContent = vide ? 'Réglages' : etat.coupe.fr;
    $('#sous-titre-reglages').textContent = vide ? 'Aucune coupe choisie. Choisis-en une dans le catalogue pour la régler.' : 'Règle chaque détail.';
    $('#zone-reglages').hidden = vide;
    $('#avertissements').hidden = vide;
    $('#reglages-secondaires').hidden = vide;
    $('#resume-reglages').hidden = vide;
    var action = $('#action-reglages');
    action.textContent = vide ? 'Choisir une coupe' : 'Voir le résultat';
    action.setAttribute('href', vide ? '#catalogue' : '#resultat');
    if (vide) return;
    construireReglages();
    synchroniserReglages();
    var n = etat.caracteristiques.length;
    $('#vers-caracteristiques').textContent = n === 0 ? 'Ajouter des caractéristiques'
      : (n === 1 ? '1 caractéristique ajoutée : modifier' : n + ' caractéristiques ajoutées : modifier');
    window.clearTimeout(minuterieSuppression);
    var supprimer = $('#supprimer-coupe');
    supprimer.hidden = !etat.coupe.perso;
    supprimer.textContent = 'Supprimer cette coupe';
    supprimer.removeAttribute('data-confirmer');
  };

  /* Agir sur cette page (régler, continuer), c'est prendre cette coupe comme coupe de départ.
     Simplement y revenir en arrière ne change rien. */
  $('#ecran-reglages').addEventListener('click', function (evenement) {
    if (!etat.coupe || etat.avecCoupe) return;
    if (!evenement.target.closest('button, a')) return;
    etat.avecCoupe = true;
    memoriser();
  }, true);

  $('#zone-reglages').addEventListener('click', function (evenement) {
    var r = etat.reglages;
    var b = evenement.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-reglage')) {
      var id = b.getAttribute('data-reglage');
      var valeur = b.getAttribute('data-valeur');
      if (r[id] !== valeur) r[id] = valeur;
      /* Retoucher un choix actif le retire, mais seulement si la coupe ne l'imposait pas
         (et jamais le sabot ou la hauteur d'un dégradé, qui en ont besoin). */
      else if (reglagesParDefaut(etat.coupe)[id] === null && !(C.estDegrade(r) && (id === 'sabot' || id === 'hauteur'))) r[id] = null;
      if (id === 'cotes' || id === 'sabot') C.accorderDegrade(r, id);
      if (id === 'cotes' && r.cotes === 'ciseaux') r.sabot = null; // pas de sabot aux ciseaux
    } else if (b.hasAttribute('data-repere')) {
      var g = reglage(etat.coupe, 'longueur');
      var cible = b.getAttribute('data-repere');
      var actif = r.longueur !== null && repere(g, r.longueur).v === cible;
      if (!actif) g.reperes.forEach(function (rp) { if (rp.v === cible) r.longueur = rp.cm; });
      else if (reglagesParDefaut(etat.coupe).longueur === null) r.longueur = null;
    } else if (b.hasAttribute('data-barbe-seule')) {
      r.barbeSeule = r.barbeSeule !== true;
    } else {
      return;
    }
    synchroniserReglages();
  });

  $('#zone-reglages').addEventListener('input', function (evenement) {
    var cible = evenement.target;
    if (cible.hasAttribute('data-curseur')) etat.reglages[cible.getAttribute('data-curseur')] = Number(cible.value);
    else if (cible.id === 'couleur-autre') etat.reglages.couleurAutre = texteCourt(cible.value, 80);
    else return;
    synchroniserReglages();
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
    delete etat.reglagesParCoupe[id];
    etat.coupe = null;
    etat.reglages = null;
    memoriser();
    aller('catalogue');
  });

  /* ===================================================================
     14. Catalogue personnalisé : magazine de caractéristiques
     =================================================================== */
  /* Conflit en attente : la caractéristique touchée et celles qu'elle contredit.
     En mémoire seulement : ce n'est pas encore un choix. */
  var conflit = null;

  function nomCarac(id) {
    return caracteristique(id).fr;
  }

  /* Messages qui ne bloquent rien. */
  function messagesPersonnalise() {
    var liste = [];
    var x = creation();
    var horsBarbe = caracteristiquesActives(x).filter(function (c) { return c.slot.split('.')[0] !== 'beard'; });
    if (horsBarbe.length && barbeSeule(x)) {
      liste.push('« Barbe seule » est choisi dans les réglages : seules les caractéristiques de barbe partent dans le prompt.');
    }
    return liste;
  }

  function synchroniserPersonnalise() {
    tous('#categories [data-caracteristique]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(etat.caracteristiques.indexOf(b.getAttribute('data-caracteristique')) >= 0));
    });
    var champ = $('#couleur-libre');
    $('#bloc-couleur-libre').hidden = etat.caracteristiques.indexOf('couleur-libre') < 0;
    if (document.activeElement !== champ) champ.value = etat.couleurLibre;

    var aUneCoupe = !!etat.coupe;
    $('#bloc-base').hidden = !aUneCoupe;
    if (aUneCoupe) {
      $('#bloc-base [data-base="oui"]').textContent = etat.coupe.fr;
      tous('#bloc-base [data-base]').forEach(function (b) {
        b.setAttribute('aria-pressed', String((b.getAttribute('data-base') === 'oui') === etat.avecCoupe));
      });
    }

    /* Conflit en attente : « Garder X » / « Garder Y ». */
    var zoneConflit = $('#conflit');
    zoneConflit.hidden = !conflit;
    if (conflit) {
      var existantes = conflit.existantes.map(nomCarac);
      $('#texte-conflit').textContent = '« ' + nomCarac(conflit.nouvelle) + ' » et « ' + existantes.join(' » et « ') +
        ' » se contredisent (' + conflit.groupe + '). Laquelle garder ?';
      $('#garder-existantes').textContent = 'Garder ' + existantes.join(' et ');
      $('#garder-nouvelle').textContent = 'Garder ' + nomCarac(conflit.nouvelle);
    }

    var zone = $('#contradictions');
    vider(zone);
    messagesPersonnalise().forEach(function (texte) { zone.appendChild(alerte('', texte)); });
    zone.hidden = !zone.firstChild;
    $('#resume-personnalise').textContent = resume(creation()) || 'Aucune caractéristique choisie.';
    memoriser();
  }

  RENDUS.personnalise = function () {
    conflit = null;
    var zone = $('#categories');
    vider(zone);
    K.categories.forEach(function (categorie) {
      var grille = el('div', { 'class': 'coupes' });
      categorie.liste.forEach(function (c) {
        grille.appendChild(el('button', { type: 'button', 'class': 'carte coupe', 'data-caracteristique': c.id, 'aria-pressed': 'false' }, [
          el('span', { 'class': 'coupe-nom', texte: c.fr })
        ]));
      });
      zone.appendChild(el('div', {}, [el('h2', { texte: categorie.nom }), grille]));
      if (categorie.liste.some(function (c) { return c.libre; })) {
        zone.appendChild(el('div', { id: 'bloc-couleur-libre' }, [
          el('label', { 'class': 'etiquette', 'for': 'couleur-libre', texte: 'Couleur voulue, en anglais' }),
          el('input', { 'class': 'champ', type: 'text', id: 'couleur-libre', maxlength: '80', lang: 'en', autocomplete: 'off', placeholder: 'copper red' })
        ]));
      }
    });
    synchroniserPersonnalise();
  };

  /* Toucher une carte : l'ajoute, la retire, ou ouvre un conflit si son groupe est déjà occupé. */
  function toucherCaracteristique(id) {
    var i = etat.caracteristiques.indexOf(id);
    if (i >= 0) { etat.caracteristiques.splice(i, 1); conflit = null; return; }
    var groupe = null;
    var existantes = etat.caracteristiques.filter(function (autre) {
      var g = K.conflit(id, autre);
      if (g && !groupe) groupe = g;
      return !!g;
    });
    if (existantes.length) { conflit = { nouvelle: id, existantes: existantes, groupe: groupe }; return; }
    conflit = null;
    etat.caracteristiques.push(id);
  }

  $('#ecran-personnalise').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-caracteristique')) {
      toucherCaracteristique(b.getAttribute('data-caracteristique'));
    } else if (b.hasAttribute('data-base')) {
      etat.avecCoupe = b.getAttribute('data-base') === 'oui'; // « Aucune » n'efface pas la coupe
    } else if ((b.id === 'garder-nouvelle' || b.id === 'garder-existantes') && conflit) {
      var c = conflit;
      var gardee = b.id === 'garder-nouvelle' ? c.nouvelle : c.existantes[0];
      if (b.id === 'garder-nouvelle') {
        etat.caracteristiques = etat.caracteristiques.filter(function (id) { return c.existantes.indexOf(id) < 0; });
        etat.caracteristiques.push(c.nouvelle);
      }
      conflit = null;
      synchroniserPersonnalise();
      $('#categories [data-caracteristique="' + gardee + '"]').focus();
      return;
    } else {
      return;
    }
    synchroniserPersonnalise();
    if (conflit) $('#garder-existantes').focus();
  });

  $('#ecran-personnalise').addEventListener('input', function (evenement) {
    if (evenement.target.id !== 'couleur-libre') return;
    etat.couleurLibre = texteCourt(evenement.target.value, 80);
    synchroniserPersonnalise();
  });

  /* ===================================================================
     15. Résultat : les prompts à copier dans Gemini
     =================================================================== */
  var ADRESSE_GEMINI = 'https://gemini.google.com/app';

  /* Barber ou salon, pour le diagnostic et la fiche : la coupe le dit, sinon le mode de l'accueil,
     sinon le choix fait sur la page Résultat. */
  function modePrompts(x) {
    if (x.coupe) return x.coupe.mode;
    return etat.mode || etat.fiche;
  }

  /* Les étapes, dans l'ordre : Diagnostic, Image, Fiche.
     Chaque étape est une donnée complète, prête pour la V2 (CLAUDE.md, section 14) :
       id      : 'diagnostic' | 'image' | 'fiche'
       texte   : le prompt final, sans marqueur
       joindre : les photos à envoyer avec, dans l'ordre ('selfie', 'reference', 'image-generee')
     En V1, l'écran les affiche ; en V2, l'appli les enverra elle-même (generateImage). */
  function etapesResultat() {
    var x = creation();
    var seule = barbeSeule(x);
    var mode = modePrompts(x);
    var etapes = [{
      id: 'diagnostic', titre: 'Diagnostic', consigne: P.consignes.diagnostic, photo: P.consignes.photo,
      texte: P.diagnostic(coupePourDiagnostic(x), mode), joindre: ['selfie']
    }];
    if (etat.reference) {
      etapes.push({ id: 'image', titre: 'Image', consigne: P.consignes.reference, texte: P.reference(), joindre: ['selfie', 'reference'], apres: P.consignes.apresImage });
    } else {
      etapes.push({
        id: 'image', titre: 'Image',
        consigne: P.consignes.image + (seule ? ' ' + P.consignes.barbeSeule : ''),
        texte: P.image(descAnglaise(x, !!couleurDemandee(x)), seule, changementDemande(x)), joindre: ['selfie'], apres: P.consignes.apresImage
      });
    }
    /* Coupe + couleur = 2 étapes : l'image ne décrit que la coupe, la couleur vient ensuite. */
    var couleur = couleurDemandee(x);
    if (couleur) {
      etapes.push({ id: 'couleur', titre: 'Couleur', consigne: P.consignes.couleur, texte: P.couleur(couleur), joindre: ['image-generee'] });
    }
    etapes.push({
      id: 'fiche', titre: 'Fiche', consigne: mode === 'salon' ? P.consignes.ficheSalon : P.consignes.ficheBarber,
      texte: P.fiche(mode), joindre: ['selfie', 'image-generee']
    });
    return etapes;
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
        etape.photo ? el('p', { 'class': 'consigne carte-titre', texte: etape.photo }) : null,
        el('p', { 'class': 'consigne', texte: etape.consigne }),
        el('pre', { 'class': 'prompt', id: 'prompt-' + n, tabindex: '0', role: 'group', 'aria-label': 'Prompt de l’étape ' + n, texte: etape.texte }),
        el('div', { 'class': 'rangee' }, [
          el('button', { type: 'button', 'class': 'btn-2', 'data-copier': 'prompt-' + n, texte: 'Copier' }),
          el('a', { 'class': 'btn-2', href: ADRESSE_GEMINI, target: '_blank', rel: 'noopener', texte: 'Ouvrir Gemini' })
        ]),
        etape.apres ? el('p', { 'class': 'consigne discret', texte: etape.apres }) : null,
        el('p', { 'class': 'alerte consigne', id: 'message-prompt-' + n, role: 'alert', hidden: true })
      ]));
    });
  }

  RENDUS.resultat = function () {
    var x = creation();
    var vide = creationVide(x);
    $('#sous-titre-resultat').textContent = vide
      ? 'Rien à générer pour l’instant. Choisis une coupe ou des caractéristiques.'
      : 'Copie, ouvre Gemini, colle, joins la photo.';
    $('#etapes').hidden = vide;
    $('#bloc-reference').hidden = vide;
    $('#resultat-secondaires').hidden = vide;
    $('#actions-resultat').hidden = !vide;
    $('#bloc-fiche').hidden = vide || !!x.coupe || !!etat.mode;
    messageResultat('');
    $('#lien-partage').hidden = true;
    fermerConfirmations();
    if (vide) return;
    construireEtapes();
    tous('#bloc-reference [data-reference]').forEach(function (b) {
      b.setAttribute('aria-pressed', String((b.getAttribute('data-reference') === 'oui') === etat.reference));
    });
    tous('#bloc-fiche [data-fiche]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-fiche') === etat.fiche));
    });
  };

  $('#ecran-resultat').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('button');
    if (!b) return;

    if (b.hasAttribute('data-reference')) {
      etat.reference = b.getAttribute('data-reference') === 'oui';
      memoriser();
      RENDUS.resultat();
      $('#bloc-reference [data-reference="' + (etat.reference ? 'oui' : 'non') + '"]').focus();
      return;
    }

    if (b.hasAttribute('data-fiche')) {
      etat.fiche = b.getAttribute('data-fiche');
      memoriser();
      RENDUS.resultat();
      $('#bloc-fiche [data-fiche="' + etat.fiche + '"]').focus();
      return;
    }

    if (b.id === 'enregistrer') {
      var donnees = versDonnees(true);
      var empreinte = JSON.stringify(donnees);
      /* Une coupe déjà enregistrée à l'identique remonte en tête au lieu d'être doublée. */
      var liste = enregistrees().filter(function (e) {
        var sansDate = copie(e);
        delete sansDate.id;
        delete sansDate.date;
        return JSON.stringify(sansDate) !== empreinte;
      });
      donnees.id = Date.now();
      donnees.date = Date.now();
      liste.unshift(donnees);
      var gardee = ecrire(CLES.enregistrees, liste.slice(0, MAX_ENREGISTREES));
      confirmer(b, 'Enregistrée');
      messageResultat(gardee ? '' : 'Coupe gardée pour cette visite seulement : le stockage du navigateur est bloqué ou plein. Touche « Partager » pour la conserver.');
      return;
    }

    if (b.id === 'partager') {
      /* Le lien ne contient que la coupe, ses réglages et les caractéristiques : rien sur le client. */
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
     16. Catalogue fond : page d'entrée, les deux familles
     =================================================================== */
  function enumerer(liste) {
    return liste.map(function (r) { return r.fr.toLowerCase(); }).join(', ') + '.';
  }

  RENDUS.fond = function () {
    var sansIa = enumerer(F.sansIa);
    var ia = enumerer(F.ia);
    $('#liste-sans-ia').textContent = sansIa.charAt(0).toUpperCase() + sansIa.slice(1);
    $('#liste-ia').textContent = ia.charAt(0).toUpperCase() + ia.slice(1);
  };

  /* ===================================================================
     17. Retouches sans IA : tout se passe sur un canvas, dans le téléphone.
     La photo n'est jamais envoyée ni stockée. Les cheveux restent intacts.
     =================================================================== */
  var COTE_APERCU = 720;
  var dessinDemande = false;

  function formatChoisi() {
    for (var i = 0; i < F.formats.length; i++) { if (F.formats[i].id === etat.retouche.format) return F.formats[i]; }
    return F.formats[0];
  }

  function reglagesRetouche() {
    var t = etat.retouche;
    return { luminosite: t.luminosite, contraste: t.contraste, chaleur: t.chaleur, nb: t.nb, ratio: formatChoisi().ratio, montage: t.montage };
  }

  function messageRetouche(texte) {
    var m = $('#message-retouche');
    m.textContent = texte || '';
    m.hidden = !texte;
  }

  /* Appui long sur la photo : l'original s'affiche tant qu'on appuie. */
  var voirOriginal = false;

  function dessinerApercu() {
    if (dessinDemande || !photos.apres) return;
    dessinDemande = true;
    window.requestAnimationFrame(function () {
      dessinDemande = false;
      if (!photos.apres) return;
      var r = reglagesRetouche();
      /* L'original garde le cadrage choisi, pour que la photo ne saute pas. */
      if (voirOriginal) { r.luminosite = 0; r.contraste = 0; r.chaleur = 0; r.nb = false; }
      try {
        R.dessiner($('#apercu'), photos.apres, photos.avant, r, COTE_APERCU);
      } catch (e) {
        messageRetouche('Cette photo ne peut pas être affichée. Essaie avec une autre photo.');
      }
    });
  }

  function signe(n) {
    return n > 0 ? '+' + n : String(n);
  }

  /* Un panneau par outil ; seul celui de l'outil actif est visible, sous la photo. */
  function construireOutils() {
    var barre = $('#barre-outils');
    var zone = $('#panneaux-outils');
    vider(barre);
    vider(zone);
    F.sansIa.forEach(function (outil) {
      barre.appendChild(boutonChoix(outil.court, { 'data-outil': outil.id, 'aria-controls': 'panneau-' + outil.id }));
      var contenu;
      if (outil.type === 'curseur') {
        contenu = [
          el('label', { 'class': 'etiquette', 'for': 'retouche-' + outil.id, texte: outil.fr }),
          el('input', { 'class': 'curseur', type: 'range', id: 'retouche-' + outil.id, 'data-retouche': outil.id, min: String(outil.min), max: String(outil.max), step: '1' }),
          el('div', { 'class': 'graduations' }, [
            el('span', { texte: outil.gauche }),
            el('span', { id: 'valeur-retouche-' + outil.id }),
            el('span', { texte: outil.droite })
          ])
        ];
      } else if (outil.type === 'bascule') {
        contenu = [
          el('span', { 'class': 'etiquette', id: 'titre-outil-' + outil.id, texte: outil.fr }),
          el('div', { 'class': 'groupe', role: 'group', 'aria-labelledby': 'titre-outil-' + outil.id }, [
            boutonChoix('Non', { 'data-bascule': outil.id, 'data-valeur': 'non' }),
            boutonChoix('Oui', { 'data-bascule': outil.id, 'data-valeur': 'oui' })
          ])
        ];
      } else if (outil.type === 'format') {
        contenu = [
          el('span', { 'class': 'etiquette', id: 'titre-outil-' + outil.id, texte: outil.fr }),
          el('div', { 'class': 'groupe', role: 'group', 'aria-labelledby': 'titre-outil-' + outil.id }, F.formats.map(function (f) {
            return boutonChoix(f.fr, { 'data-format': f.id });
          }))
        ];
      } else {
        contenu = [
          el('span', { 'class': 'etiquette', id: 'titre-outil-' + outil.id, texte: outil.fr }),
          el('div', { 'class': 'pile' }, [
            el('p', { 'class': 'discret', texte: 'La photo d’avant à gauche, la photo retouchée à droite.' }),
            el('button', { type: 'button', 'class': 'btn-2', id: 'choisir-avant', texte: 'Choisir la photo d’avant' }),
            el('div', { 'class': 'groupe', id: 'groupe-montage', role: 'group', 'aria-labelledby': 'titre-outil-' + outil.id }, [
              boutonChoix('Sans montage', { 'data-montage': 'non' }),
              boutonChoix('Avec montage', { 'data-montage': 'oui' })
            ])
          ])
        ];
      }
      zone.appendChild(el('div', { id: 'panneau-' + outil.id, 'data-panneau': outil.id }, contenu));
    });
  }

  function synchroniserRetouche() {
    var t = etat.retouche;
    tous('#barre-outils [data-outil]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-outil') === t.outil));
    });
    tous('#panneaux-outils [data-panneau]').forEach(function (p) { p.hidden = p.getAttribute('data-panneau') !== t.outil; });
    F.sansIa.forEach(function (outil) {
      if (outil.type === 'curseur') {
        var curseur = $('#retouche-' + outil.id);
        curseur.value = String(t[outil.id]);
        curseur.setAttribute('aria-valuetext', signe(t[outil.id]));
        $('#valeur-retouche-' + outil.id).textContent = signe(t[outil.id]);
      } else if (outil.type === 'bascule') {
        tous('#panneaux-outils [data-bascule="' + outil.id + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String((b.getAttribute('data-valeur') === 'oui') === t[outil.id]));
        });
      }
    });
    tous('#panneaux-outils [data-format]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-format') === t.format));
    });
    $('#groupe-montage').hidden = !photos.avant;
    $('#choisir-avant').textContent = photos.avant ? 'Changer la photo d’avant' : 'Choisir la photo d’avant';
    tous('#panneaux-outils [data-montage]').forEach(function (b) {
      b.setAttribute('aria-pressed', String((b.getAttribute('data-montage') === 'oui') === t.montage));
    });
    $('#image-enregistree').hidden = true; // l'image enregistrée ne correspond plus aux réglages
    memoriser();
    dessinerApercu();
  }

  RENDUS.retouche = function () {
    var aPhoto = !!photos.apres;
    voirOriginal = false;
    $('#zone-apercu').hidden = !aPhoto;
    $('#legende-apercu').hidden = !aPhoto;
    $('#legende-apercu').textContent = 'Appui long sur la photo : voir l’original.';
    $('#intro-retouche').hidden = aPhoto;
    $('#barre-outils').hidden = !aPhoto;
    $('#panneaux-outils').hidden = !aPhoto;
    $('#retouche-secondaires').hidden = !aPhoto;
    $('#action-retouche').textContent = aPhoto ? 'Enregistrer l’image' : 'Choisir une photo';
    if (!$('#barre-outils').firstChild) construireOutils();
    synchroniserRetouche();
  };

  /* Appui long sur la photo (doigt, souris ou stylet). */
  var minuterieOriginal = null;

  function montrerOriginal(oui) {
    window.clearTimeout(minuterieOriginal);
    if (voirOriginal === oui) return;
    voirOriginal = oui;
    $('#legende-apercu').textContent = oui ? 'Original : relâche pour revoir la retouche.' : 'Appui long sur la photo : voir l’original.';
    dessinerApercu();
  }

  $('#apercu').addEventListener('pointerdown', function () {
    window.clearTimeout(minuterieOriginal);
    minuterieOriginal = window.setTimeout(function () { montrerOriginal(true); }, 250);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
    $('#apercu').addEventListener(type, function () { montrerOriginal(false); });
  });
  $('#apercu').addEventListener('contextmenu', function (evenement) { evenement.preventDefault(); });

  /* Ouvre une photo du téléphone. Elle reste en mémoire : ni envoi, ni stockage. */
  function ouvrirPhoto(fichier, cle) {
    if (!fichier) return;
    var url;
    try { url = window.URL.createObjectURL(fichier); } catch (e) { url = null; }
    if (!url) { messageRetouche('Cette photo ne peut pas être ouverte. Choisis une photo JPEG ou PNG.'); return; }
    var image = new window.Image();
    image.onload = function () {
      oublierPhoto(cle);
      photos[cle] = image;
      photos[cle === 'apres' ? 'urlApres' : 'urlAvant'] = url;
      if (cle === 'avant') etat.retouche.montage = true;
      messageRetouche('');
      RENDUS.retouche();
    };
    image.onerror = function () {
      try { window.URL.revokeObjectURL(url); } catch (e) { /* sans gravité */ }
      messageRetouche('Cette photo ne peut pas être ouverte. Choisis une photo JPEG ou PNG.');
    };
    image.src = url;
  }

  $('#fichier-photo').addEventListener('change', function (evenement) {
    ouvrirPhoto(evenement.target.files && evenement.target.files[0], 'apres');
    evenement.target.value = '';
  });

  $('#fichier-avant').addEventListener('change', function (evenement) {
    ouvrirPhoto(evenement.target.files && evenement.target.files[0], 'avant');
    evenement.target.value = '';
  });

  function enregistrerImage() {
    var toile = document.createElement('canvas');
    try {
      R.dessiner(toile, photos.apres, photos.avant, reglagesRetouche(), R.COTE_MAX);
    } catch (e) {
      messageRetouche('L’image n’a pas pu être préparée. Essaie avec une photo plus petite.');
      return;
    }
    toile.toBlob(function (blob) {
      if (!blob) { messageRetouche('L’image n’a pas pu être préparée. Essaie avec une photo plus petite.'); return; }
      if (photos.urlFinale) { try { window.URL.revokeObjectURL(photos.urlFinale); } catch (e) { /* sans gravité */ } }
      photos.urlFinale = window.URL.createObjectURL(blob);
      var telechargee = false;
      try {
        var lien = document.createElement('a');
        if ('download' in lien) {
          lien.href = photos.urlFinale;
          lien.download = 'coupe-studio.jpg';
          lien.hidden = true;
          document.body.appendChild(lien);
          lien.click();
          document.body.removeChild(lien);
          telechargee = true;
        }
      } catch (e) { telechargee = false; }
      /* Si le téléchargement est bloqué, l'image est là, en grand : appui long pour l'enregistrer. */
      $('#image-finale').src = photos.urlFinale;
      $('#texte-image-enregistree').textContent = telechargee
        ? 'Image envoyée dans tes téléchargements. Si rien ne s’est passé : appui long sur l’image ci-dessous, puis « Enregistrer ».'
        : 'Appui long sur l’image ci-dessous, puis « Enregistrer ».';
      $('#image-enregistree').hidden = false;
      $('#image-enregistree').scrollIntoView({ block: 'start' });
    }, 'image/jpeg', 0.92);
  }

  $('#ecran-retouche').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('button');
    if (!b) return;
    var t = etat.retouche;
    if (b.id === 'action-retouche') {
      if (photos.apres) enregistrerImage();
      else $('#fichier-photo').click();
      return;
    }
    if (b.id === 'changer-photo') { $('#fichier-photo').click(); return; }
    if (b.id === 'choisir-avant') { $('#fichier-avant').click(); return; }
    if (b.id === 'remettre-retouches') {
      etat.retouche = retoucheVide();
      etat.retouche.outil = t.outil;
      etat.retouche.montage = !!photos.avant && t.montage;
    } else if (b.hasAttribute('data-outil')) t.outil = b.getAttribute('data-outil');
    else if (b.hasAttribute('data-bascule')) t[b.getAttribute('data-bascule')] = b.getAttribute('data-valeur') === 'oui';
    else if (b.hasAttribute('data-format')) t.format = b.getAttribute('data-format');
    else if (b.hasAttribute('data-montage')) t.montage = b.getAttribute('data-montage') === 'oui';
    else return;
    synchroniserRetouche();
  });

  $('#ecran-retouche').addEventListener('input', function (evenement) {
    var cible = evenement.target;
    if (!cible.hasAttribute('data-retouche')) return;
    etat.retouche[cible.getAttribute('data-retouche')] = Number(cible.value);
    synchroniserRetouche();
  });

  /* ===================================================================
     18. Retouches IA : un prompt à copier dans Gemini
     =================================================================== */
  function synchroniserRetoucheIa() {
    var t = etat.retoucheIa;
    tous('#cartes-ia [data-retouche-ia]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(t.choix.indexOf(b.getAttribute('data-retouche-ia')) >= 0));
    });
    var avecCouleur = F.ia.some(function (r) { return r.couleurs && t.choix.indexOf(r.id) >= 0; });
    $('#bloc-couleur-fond').hidden = !avecCouleur;
    var pastilles = $('#pastilles');
    vider(pastilles);
    F.couleurs.forEach(function (c) {
      var active = t.couleur === c.id;
      pastilles.appendChild(el('button', {
        type: 'button', 'class': 'choix pastille', 'data-couleur': c.id, 'aria-label': c.fr,
        'aria-pressed': String(active), style: '--teinte:' + c.teinte, svg: active ? ICONE_COCHE : ''
      }));
    });
    var zone = $('#contradictions-ia');
    vider(zone);
    F.contradictions(t.choix).forEach(function (paire) {
      zone.appendChild(alerte('', '« ' + paire[0] + ' » et « ' + paire[1] + ' » se contredisent. Garde un seul des deux, sauf si c’est voulu.'));
    });
    zone.hidden = !zone.firstChild;
    var vide = t.choix.length === 0;
    $('#carte-prompt-ia').hidden = vide;
    $('#apres-prompt-ia').hidden = vide;
    $('#message-prompt-ia').hidden = true;
    if (!vide) $('#prompt-ia').textContent = P.retouche(F.combinaison(t.choix, t.couleur));
    memoriser();
  }

  RENDUS['retouche-ia'] = function () {
    var zone = $('#cartes-ia');
    vider(zone);
    F.ia.forEach(function (r) {
      var carte = el('button', { type: 'button', 'class': 'carte coupe', 'data-retouche-ia': r.id, 'aria-pressed': 'false' });
      carte.innerHTML = C.picto(r.trace, false); // tracé constant de fonds.js
      carte.appendChild(el('span', { 'class': 'coupe-nom', texte: r.fr }));
      zone.appendChild(carte);
    });
    $('#consigne-ia').textContent = P.consignes.retouche;
    $('#apres-prompt-ia').textContent = P.consignes.apresRetouche;
    synchroniserRetoucheIa();
  };

  $('#ecran-retouche-ia').addEventListener('click', function (evenement) {
    var b = evenement.target.closest('button');
    if (!b) return;
    var t = etat.retoucheIa;
    if (b.hasAttribute('data-retouche-ia')) {
      var id = b.getAttribute('data-retouche-ia');
      var i = t.choix.indexOf(id);
      if (i >= 0) t.choix.splice(i, 1);
      else t.choix.push(id);
      synchroniserRetoucheIa();
    } else if (b.hasAttribute('data-couleur')) {
      t.couleur = b.getAttribute('data-couleur');
      synchroniserRetoucheIa();
      $('#pastilles [data-couleur="' + t.couleur + '"]').focus();
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
    restaurer();

    var etatHistorique = null;
    try { etatHistorique = window.history.state; } catch (e) { etatHistorique = null; }
    rang = etatHistorique && typeof etatHistorique.rang === 'number' ? etatHistorique.rang : 0;

    /* Lien partagé : ?r=<coupe personnalisée en base64url>. On la charge puis on nettoie l'adresse. */
    var parametre = /[?&]r=([A-Za-z0-9_-]+)/.exec(window.location.search);
    if (parametre) {
      var partagee = null;
      try { partagee = depuisDonnees(decoder(parametre[1])); } catch (e) { partagee = null; }
      var cible = 'accueil';
      if (partagee) {
        charger(partagee);
        cible = partagee.coupe ? 'reglages' : 'personnalise';
      } else {
        $('#message-accueil').textContent = 'Ce lien est illisible. Demande un nouveau lien, ou commence avec un client.';
        $('#message-accueil').hidden = false;
      }
      rang = 0;
      try {
        window.history.replaceState({ rang: 0 }, '', window.location.pathname + '#' + cible);
      } catch (e) { /* adresse non modifiable : sans gravité */ }
      afficher(cible);
      return;
    }

    afficher(ecranDepuisAdresse());
  }

  /* Accès pour les tests et pour la V2. */
  window.CoupeStudio = {
    etat: etat,
    photos: photos,
    generateImage: generateImage,
    creation: creation,
    composer: composer,
    validerCaracteristiques: validerCaracteristiques,
    resume: resume,
    descAnglaise: descAnglaise,
    changementDemande: changementDemande,
    couleurDemandee: couleurDemandee,
    coupePourDiagnostic: coupePourDiagnostic,
    reglagesParDefaut: reglagesParDefaut,
    coupeDuCatalogue: coupeDuCatalogue,
    propositions: propositions,
    avertissements: avertissements,
    risques: risques,
    contradictions: contradictions,
    etapesResultat: etapesResultat,
    encoder: encoder,
    decoder: decoder
  };

  demarrer();
})();
