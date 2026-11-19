/* Outils communs aux tests : ouvrir l'appli dans un état connu, et auditer un écran
   contre DESIGN.md (couleurs, tailles, espacements, arrondis, contrastes, débordements). */
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..');
const ADRESSE = 'file://' + path.join(RACINE, 'index.html'); // l'appli doit marcher en ouvrant index.html en local
const THEMES = ['neutre', 'salon', 'barber'];
const FORMATS = [
  { nom: '390', largeur: 390, hauteur: 844 },
  { nom: '1280', largeur: 1280, hauteur: 800 }
];

const PHOTO_TEST = path.join(__dirname, 'photo-test.png'); // image de synthèse (formes géométriques), aucune personne

/* État de départ : un client en cours et deux coupes personnalisées enregistrées, selon le thème.
   `local` va dans localStorage, `session` dans sessionStorage. */
function graine(theme) {
  const jour = 24 * 3600 * 1000;
  const barber = {
    v: 2, c: 'skin-fade',
    r: { cotes: 'blanc', sabot: '0.5', dessus: 5, devant: null, coiffage: 'decoiffe', contours: null, barbe: 'entretenue', barbeSeule: false },
    p: { texture: 'boucles', visage: 'ovale', front: 'golfes-marques', longueur: 'courte', lunettes: 'oui' },
    k: ['meche-cote', 'contours-nets'], kl: ''
  };
  const salon = {
    v: 2, c: 'carre-plongeant',
    r: { longueur: 24, forme: 'plongeante', couches: 'marquees', frange: null, raie: 'naturelle', couleur: 'balayage', couleurAutre: '' },
    p: { texture: 'boucles', visage: 'ovale', front: 'fins', longueur: 'courte', lunettes: 'non' },
    k: ['frange-rideau', 'reflets-cuivres'], kl: ''
  };
  const client = theme === 'salon' ? salon : barber;
  const autre = theme === 'salon'
    ? { v: 2, c: null, r: null, k: ['frange-rideau', 'balayage', 'couches'], kl: '' }
    : { v: 2, c: 'quiff', r: { cotes: 'degrade', dessus: 9, barbe: 'inchangee' }, k: [], kl: '' };
  return {
    local: {
      'coupe-studio:mode': theme === 'neutre' ? null : theme,
      'coupe-studio:recettes': [
        Object.assign({ id: 2, date: Date.now() - jour }, client),
        Object.assign({ id: 1, date: Date.now() - 9 * jour }, autre)
      ],
      'coupe-studio:coupes': []
    },
    session: {
      'coupe-studio:session': Object.assign({}, client, {
        b: true, rp: {}, ref: false, fi: 'barber',
        t: { luminosite: 12, contraste: 8, chaleur: 6, nb: false, format: '4-5', montage: false },
        ti: { choix: ['flou', 'lumiere'], couleur: 'bleu-gris' }
      })
    }
  };
}

/* Les états capturés et audités pour chaque page, dans l'ordre du parcours. */
const VARIANTES = {
  accueil: [
    { nom: 'accueil' },
    { nom: 'accueil-vide', graine: (g) => { g.local['coupe-studio:recettes'] = []; g.session = {}; } },
    { nom: 'accueil-confirmation', action: async (page) => { await page.click('#ecran-accueil [data-nouveau-client]'); } }
  ],
  /* Diagnostic · Photo. Les variantes avec Worker utilisent une adresse factice : aucun envoi. */
  photo: [
    { nom: 'photo' },
    { nom: 'photo-code', action: async (page) => { await photoV2(page, { code: false }); } },
    { nom: 'photo-prise', action: async (page) => { await photoV2(page, { photo: true }); } },
    { nom: 'photo-analyse', action: async (page) => { await photoV2(page, { photo: true, analyse: true }); } },
    { nom: 'photo-erreur', action: async (page) => { await photoV2(page, { photo: true, erreur: true }); } }
  ],
  client: [
    { nom: 'client' }
  ],
  choix: [
    { nom: 'choix' }
  ],
  catalogue: [
    { nom: 'catalogue' },
    { nom: 'catalogue-sans-profil', graine: (g) => { g.session['coupe-studio:session'].p = {}; } },
    { nom: 'catalogue-ajout', action: async (page) => { await page.click('#ouvrir-ajout'); } },
    { nom: 'catalogue-chauve', graine: (g) => { g.session['coupe-studio:session'].p.front = 'chauve'; } }
  ],
  reglages: [
    { nom: 'reglages' },
    { nom: 'reglages-remplaces', graine: (g, theme) => {
      const s = g.session['coupe-studio:session'];
      s.k = theme === 'salon' ? ['frange-courte', 'platine'] : ['rase-cote', 'barbe-courte'];
      if (theme !== 'salon') s.r.barbeSeule = true;
    } },
    { nom: 'reglages-vide', graine: (g) => { g.session = {}; } }
  ],
  personnalise: [
    { nom: 'personnalise' },
    { nom: 'personnalise-conflit', graine: (g) => {
      const s = g.session['coupe-studio:session'];
      s.b = false; s.k = ['undercut', 'couleur-libre', 'lisse']; s.kl = 'copper red';
    }, action: async (page) => { await page.click('[data-caracteristique="rase-cote"]'); } },
    { nom: 'personnalise-chauve', graine: (g) => {
      const s = g.session['coupe-studio:session'];
      s.p.front = 'chauve'; s.k = ['moustache', 'platine'];
    } }
  ],
  resultat: [
    { nom: 'resultat' },
    { nom: 'resultat-reference', action: async (page) => { await page.click('[data-reference="oui"]'); } },
    { nom: 'resultat-confirmation', action: async (page) => { await page.click('#ecran-resultat [data-nouveau-client]'); } },
    /* V2 : Worker réglé (adresse factice), code saisi. Images de synthèse, aucun appel réseau réussi. */
    { nom: 'resultat-v2', action: async (page) => { await activerV2(page, false); } },
    { nom: 'resultat-v2-resultats', action: async (page) => { await activerV2(page, true); } },
    { nom: 'resultat-v2-erreur', action: async (page) => {
      await activerV2(page, true);
      await page.evaluate(() => {
        window.CoupeStudio.v2.erreurs.image = 'Google est saturé pour le moment. Attends une minute. Relance ou passe par Gemini (Copier).';
        document.querySelector('#consentement').dispatchEvent(new Event('change')); // redessine les étapes
      });
    } }
  ],
  fond: [
    { nom: 'fond' }
  ],
  retouche: [
    { nom: 'retouche' },
    { nom: 'retouche-photo', action: async (page) => {
      await page.setInputFiles('#fichier-photo', PHOTO_TEST);
      await page.waitForSelector('#zone-apercu:not([hidden])');
    } },
    { nom: 'retouche-recadrage', action: async (page) => {
      await page.setInputFiles('#fichier-photo', PHOTO_TEST);
      await page.waitForSelector('#zone-apercu:not([hidden])');
      await page.click('[data-outil="format"]');
      await page.click('[data-format="4-5"]');
    } },
    { nom: 'retouche-montage', action: async (page) => {
      await page.setInputFiles('#fichier-photo', PHOTO_TEST);
      await page.waitForSelector('#zone-apercu:not([hidden])');
      await page.click('[data-outil="montage"]');
      await page.setInputFiles('#fichier-avant', PHOTO_TEST);
      await page.waitForSelector('#groupe-montage:not([hidden])');
    } }
  ],
  'retouche-ia': [
    { nom: 'retouche-ia' },
    { nom: 'retouche-ia-couleur', graine: (g) => {
      g.session['coupe-studio:session'].ti = { choix: ['studio-couleur', 'ranger'], couleur: 'sauge' };
    } }
  ]
};
/* Met l'écran Résultat en V2 sans Worker réel : adresse factice, code saisi et, si `avecResultats`,
   une photo de synthèse, l'accord coché et un résultat par étape. */
async function activerV2(page, avecResultats) {
  await page.evaluate((remplir) => {
    window.CONFIG.worker = 'https://worker.invalid';
    const A = window.CoupeStudio;
    if (remplir) {
      const dessin = (fond, forme) => {
        const c = document.createElement('canvas');
        c.width = 600; c.height = 800;
        const x = c.getContext('2d');
        x.fillStyle = fond; x.fillRect(0, 0, 600, 800);
        x.fillStyle = forme; x.beginPath(); x.arc(300, 360, 180, 0, 7); x.fill();
        x.fillRect(180, 560, 240, 240);
        return c.toDataURL('image/jpeg', 0.9);
      };
      A.v2.selfie = dessin('#9aa7b1', '#4b5a66');
      A.v2.consentement = true;
      A.etapesResultat().forEach((e) => {
        A.v2.resultats[e.id] = ['image', 'texture', 'couleur'].indexOf(e.id) >= 0
          ? { prompt: e.texte, image: dessin('#9aa7b1', '#2f3b45'), envoi: A.v2.selfie, avant: A.v2.selfie }
          : { prompt: e.texte, texte: 'VERDICT : ✅ FAISABLE MAINTENANT\nRAISON : la longueur du dessus est suffisante, les côtés aussi.' };
      });
    }
    const champ = document.querySelector('#code-acces');
    champ.value = 'salon-test';
    champ.dispatchEvent(new Event('input'));
  }, avecResultats);
}

/* Met l'écran « Diagnostic · Photo » dans l'état voulu : Worker factice, code (ou non), photo de synthèse,
   analyse en cours, message d'erreur. */
async function photoV2(page, o) {
  await page.evaluate((opt) => {
    window.CONFIG.worker = 'https://worker.invalid';
    try { localStorage.setItem('coupe-studio:acces', JSON.stringify(opt.code === false ? '' : 'salon-test')); } catch (e) { /* bloqué */ }
    const v2 = window.CoupeStudio.v2;
    if (opt.photo) {
      const c = document.createElement('canvas');
      c.width = 600; c.height = 800;
      const x = c.getContext('2d');
      x.fillStyle = '#9aa7b1'; x.fillRect(0, 0, 600, 800);
      x.fillStyle = '#4b5a66'; x.beginPath(); x.arc(300, 360, 180, 0, 7); x.fill();
      x.fillRect(180, 560, 240, 240);
      v2.selfie = c.toDataURL('image/jpeg', 0.9);
      v2.consentement = true;
    }
    if (opt.analyse) v2.analyse = true;
    if (opt.erreur) v2.messagePhoto = 'Google est saturé pour le moment. Attends une minute. Touche « Continuer » pour réessayer, ou « Passer ».';
    window.CoupeStudio.rendre();
  }, o);
}

const ECRANS = Object.keys(VARIANTES);

async function ouvrir(navigateur, { theme, format, ecran, variante }) {
  const contexte = await navigateur.newContext({
    viewport: { width: format.largeur, height: format.hauteur },
    deviceScaleFactor: 1
  });
  const g = graine(theme);
  if (variante && variante.graine) variante.graine(g, theme);
  await contexte.addInitScript((donnees) => {
    try {
      for (const cle in donnees.local) window.localStorage.setItem(cle, JSON.stringify(donnees.local[cle]));
      for (const cle in donnees.session) window.sessionStorage.setItem(cle, JSON.stringify(donnees.session[cle]));
    } catch (e) { /* stockage bloqué */ }
  }, g);
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.goto(ADRESSE + '#' + ecran);
  if (variante && variante.action) {
    await variante.action(page);
    await page.evaluate(() => { window.auditApresAction = true; }); // l'action a pu faire défiler la page : c'est voulu
  }
  await page.waitForTimeout(250); // fin des transitions (150 ms)
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  return { contexte, page, erreurs };
}

/* Audit exécuté DANS la page. Renvoie { problemes: [...], contrasteMin, polices }. */
function auditDansLaPage() {
  const problemes = [];
  const racine = document.documentElement;
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  const ECHELLE = [12, 16, 20, 28];
  const BORDURES = [0, 1, 2, 4];

  const decrire = (e) => {
    const classes = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '';
    const texte = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28);
    return e.tagName.toLowerCase() + classes + (texte ? ' « ' + texte + ' »' : '');
  };
  const signaler = (regle, e, detail) => problemes.push({ regle, element: e ? decrire(e) : '', detail: detail || '' });

  const lireCouleur = (texte) => {
    const m = /rgba?\(([^)]+)\)/.exec(texte || '');
    if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const cle = (c) => [c.r, c.g, c.b, Math.round(c.a * 100) / 100].join(',');
  const melanger = (dessus, dessous) => ({
    r: dessus.r * dessus.a + dessous.r * (1 - dessus.a),
    g: dessus.g * dessus.a + dessous.g * (1 - dessus.a),
    b: dessus.b * dessus.a + dessous.b * (1 - dessus.a),
    a: 1
  });
  const luminance = (c) => {
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const rapport = (a, b) => {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  /* Palette du thème actif, lue dans les variables CSS. */
  const sonde = document.createElement('span');
  document.body.appendChild(sonde);
  const palette = {};
  ['--fond', '--surface', '--texte', '--principale', '--alerte', '--sur-principale', '--selection', '--sur-selection', '--texte-2', '--bordure'].forEach((v) => {
    sonde.style.color = 'var(' + v + ')';
    palette[cle(lireCouleur(getComputedStyle(sonde).color))] = v;
  });
  sonde.remove();
  const rayon = parseFloat(getComputedStyle(racine).getPropertyValue('--rayon'));
  const dansPalette = (c) => c.a === 0 || palette[cle(c)] !== undefined;

  const visible = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(e);
    return s.visibility !== 'hidden' && s.display !== 'none';
  };
  const aDuTexte = (e) => {
    if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') return e.type !== 'range';
    for (const n of e.childNodes) { if (n.nodeType === 3 && n.textContent.trim()) return true; }
    return false;
  };
  const fondEffectif = (e) => {
    const couches = [];
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const c = lireCouleur(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { couches.push(c); if (c.a === 1) break; }
    }
    let fond = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = couches.length - 1; i >= 0; i--) fond = melanger(couches[i], fond);
    return fond;
  };
  const px = (v) => parseFloat(v) || 0;
  const multipleDe8 = (v) => Math.abs(px(v) / 8 - Math.round(px(v) / 8)) < 0.01;

  let contrasteMin = { valeur: Infinity, element: '' };
  const polices = {};

  if (racine.scrollWidth > largeur) signaler('défilement horizontal', null, racine.scrollWidth + ' > ' + largeur);
  if (racine.scrollHeight > hauteur + 1) signaler('la page entière défile', null, racine.scrollHeight + ' > ' + hauteur);

  const elements = Array.from(document.querySelectorAll('.app, .app *')).filter(visible);
  elements.forEach((e) => {
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const dansSvg = !!e.closest('svg');

    /* Débordement horizontal. */
    if (r.left < -0.5 || r.right > largeur + 0.5) signaler('déborde de l’écran', e, Math.round(r.left) + ' → ' + Math.round(r.right));

    /* Ombres, dégradés, flous. */
    if (s.boxShadow !== 'none') signaler('ombre', e, s.boxShadow);
    if (s.textShadow !== 'none') signaler('ombre de texte', e, s.textShadow);
    if (s.backgroundImage !== 'none') signaler('image ou dégradé de fond', e, s.backgroundImage.slice(0, 40));
    if (s.filter !== 'none') signaler('filtre', e, s.filter);
    if (s.backdropFilter && s.backdropFilter !== 'none') signaler('effet de verre', e, s.backdropFilter);

    /* Transitions : 150 ms au plus. Pas d'animation. */
    s.transitionDuration.split(',').forEach((d) => {
      const ms = d.trim().endsWith('ms') ? parseFloat(d) : parseFloat(d) * 1000;
      if (ms > 150.5) signaler('transition trop longue', e, d.trim());
    });
    if (s.animationName !== 'none') signaler('animation', e, s.animationName);

    if (dansSvg) {
      /* Tracés : couleur du thème, trait de 2. */
      if (e.tagName.toLowerCase() !== 'svg' && !e.closest('defs')) {
        ['fill', 'stroke'].forEach((p) => {
          const c = lireCouleur(s[p]);
          if (c && !dansPalette(c)) signaler('couleur hors thème (' + p + ')', e, s[p]);
        });
        if (s.stroke !== 'none' && px(s.strokeWidth) !== 2) signaler('épaisseur de trait', e, s.strokeWidth);
      }
      return;
    }

    /* Couleurs : uniquement celles du thème. Une teinte d'échantillon de fond photo est un contenu. */
    const teinte = e.style.getPropertyValue('--teinte');
    const fond = lireCouleur(s.backgroundColor);
    if (fond && !dansPalette(fond) && !teinte) signaler('couleur de fond hors thème', e, s.backgroundColor);
    ['Top', 'Right', 'Bottom', 'Left'].forEach((cote) => {
      const ep = px(s['border' + cote + 'Width']);
      if (ep === 0) return;
      if (BORDURES.indexOf(ep) < 0) signaler('épaisseur de bordure', e, ep + 'px');
      const c = lireCouleur(s['border' + cote + 'Color']);
      if (c && !dansPalette(c)) signaler('couleur de bordure hors thème', e, s['border' + cote + 'Color']);
    });
    if (e.tagName === 'INPUT' && e.type === 'range') {
      const c = lireCouleur(s.accentColor);
      if (c && !dansPalette(c)) signaler('couleur du curseur hors thème', e, s.accentColor);
    }

    /* Thème barber : le rouge (principale) est réservé au bouton principal. Tout ce qui est
       sélectionné utilise le bleu de sélection (DESIGN.md, sélection uniforme). */
    if (racine.getAttribute('data-theme') === 'barber' && !e.matches('.btn')) {
      const rouges = [['fond', s.backgroundColor], ['texte', s.color], ['bordure', s.borderTopColor], ['bordure', s.borderLeftColor],
        ['curseur', e.tagName === 'INPUT' ? s.accentColor : null], ['contour', s.outlineStyle !== 'none' ? s.outlineColor : null]];
      rouges.forEach(([quoi, valeur]) => {
        const c = lireCouleur(valeur);
        if (!c || c.a === 0) return;
        if (quoi === 'bordure' && px(s.borderTopWidth) === 0 && px(s.borderLeftWidth) === 0) return;
        if (palette[cle(c)] === '--principale') signaler('rouge hors bouton principal (' + quoi + ')', e, valeur);
      });
    }

    /* Espacements : multiples de 8. */
    ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom'].forEach((p) => {
      if (!multipleDe8(s[p])) signaler('espacement hors multiples de 8', e, p + ' ' + s[p]);
    });
    ['rowGap', 'columnGap'].forEach((p) => {
      if (s[p] !== 'normal' && !multipleDe8(s[p])) signaler('espacement hors multiples de 8', e, p + ' ' + s[p]);
    });

    /* Arrondi : celui du thème, ou rien. */
    ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].forEach((p) => {
      const v = px(s[p]);
      if (v !== 0 && v !== rayon) signaler('arrondi hors thème', e, p + ' ' + s[p]);
    });

    /* Zones tactiles : 48 × 48 au moins. */
    if (e.matches('button, a[href], input, textarea, select')) {
      /* Une case à cocher dans son étiquette : la zone tactile est l'étiquette entière. */
      const zone = e.matches('input[type="checkbox"]') && e.closest('label') ? e.closest('label').getBoundingClientRect() : r;
      if (zone.width < 47.5 || zone.height < 47.5) signaler('zone tactile sous 48 × 48', e, Math.round(zone.width) + ' × ' + Math.round(zone.height));
    }

    /* Texte : taille dans l'échelle, couleur du thème, contraste 4,5:1, pas de texte coupé. */
    if (aDuTexte(e)) {
      const taille = px(s.fontSize);
      if (ECHELLE.indexOf(taille) < 0) signaler('taille de texte hors échelle', e, s.fontSize);
      const famille = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      polices[famille] = (polices[famille] || 0) + 1;
      const couleur = lireCouleur(s.color);
      if (couleur && !dansPalette(couleur)) signaler('couleur de texte hors thème', e, s.color);
      if (couleur) {
        const fondTexte = fondEffectif(e);
        const ratio = rapport(melanger(couleur, fondTexte), fondTexte);
        if (ratio < contrasteMin.valeur) contrasteMin = { valeur: ratio, element: decrire(e) };
        if (ratio < 4.5) signaler('contraste sous 4,5:1', e, ratio.toFixed(2));
      }
      const coupeX = (s.overflowX === 'hidden' || s.overflowX === 'clip') && e.scrollWidth > e.clientWidth + 1;
      const coupeY = (s.overflowY === 'hidden' || s.overflowY === 'clip') && e.scrollHeight > e.clientHeight + 1;
      if (coupeX || coupeY) signaler('texte coupé', e);
    }
  });

  /* Le texte d'un bouton, d'une carte ou d'une alerte ne sort pas de sa boîte. */
  document.querySelectorAll('.app button, .app a, .app .carte, .app .alerte').forEach((boite) => {
    if (!visible(boite)) return;
    const rb = boite.getBoundingClientRect();
    const marcheur = document.createTreeWalker(boite, NodeFilter.SHOW_TEXT);
    for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
      if (!n.textContent.trim()) continue;
      const zone = n.parentElement.closest('.prompt');
      if (zone) continue; // le bloc de prompt défile, c'est voulu
      const plage = document.createRange();
      plage.selectNodeContents(n);
      const rt = plage.getBoundingClientRect();
      if (rt.width === 0) continue;
      if (rt.left < rb.left - 1 || rt.right > rb.right + 1 || rt.top < rb.top - 1 || rt.bottom > rb.bottom + 1) {
        signaler('texte qui sort de sa boîte', boite, n.textContent.trim().slice(0, 24));
      }
    }
  });

  /* Le bouton principal et les onglets restent visibles et touchables. */
  const principaux = Array.from(document.querySelectorAll('.app .btn')).filter(visible);
  if (principaux.length > 1) signaler('plus d’un bouton principal', principaux[1]);
  principaux.forEach((b) => {
    const r = b.getBoundingClientRect();
    if (r.top < 0 || r.bottom > hauteur + 0.5) signaler('bouton principal hors de l’écran', b, Math.round(r.top) + ' → ' + Math.round(r.bottom));
    const auCentre = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (auCentre && !b.contains(auCentre)) signaler('bouton principal recouvert', b);
  });
  /* La flèche retour est là sur toutes les pages sauf l'Accueil, visible et assez grande. */
  const accueil = document.querySelector('#ecran-accueil');
  const fleche = document.querySelector('#retour');
  const flecheVisible = fleche && visible(fleche);
  if (accueil && accueil.hidden && !flecheVisible) signaler('flèche retour absente', null);
  if (accueil && !accueil.hidden && flecheVisible) signaler('flèche retour sur l\u2019accueil', fleche);
  if (document.querySelector('.onglets, .onglet')) signaler('barre d\u2019onglets encore présente', null);
  /* Aucun élément ne porte le nom d'une page : sinon le navigateur défile jusqu'à lui à l'ouverture. */
  document.querySelectorAll('.ecran').forEach((e) => {
    const nom = e.id.replace('ecran-', '');
    if (document.getElementById(nom)) signaler('un élément porte le nom de la page « ' + nom + ' »', document.getElementById(nom));
  });
  /* À l'ouverture, le titre de la page est visible en haut. */
  const titre = document.querySelector('.ecran:not([hidden]) h1');
  const defile = document.querySelector('.ecran:not([hidden]) .defile');
  if (titre && defile && defile.scrollTop === 0 && titre.getBoundingClientRect().top < 0) signaler('titre de la page hors de l\u2019écran', titre);
  if (defile && defile.scrollTop !== 0 && !window.auditApresAction) signaler('la page ne s\u2019ouvre pas en haut', defile, 'défilement ' + defile.scrollTop);
  /* Le mot « recette » ne doit plus apparaître. */
  if (/recette/i.test(document.querySelector('.app').innerText)) signaler('le mot « recette » est affiché', null);

  return { problemes, contrasteMin, polices, theme: racine.getAttribute('data-theme') };
}

async function auditer(page) {
  return page.evaluate(auditDansLaPage);
}

module.exports = { RACINE, ADRESSE, THEMES, FORMATS, ECRANS, VARIANTES, PHOTO_TEST, graine, ouvrir, auditer, chromium };
