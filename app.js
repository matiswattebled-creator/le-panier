import * as C from './cuisine.js';

// Configuration Firebase du foyer. Laissée vide, l'app tourne en mode démo sur ce seul appareil.
const CONFIG_FIREBASE = {
  apiKey: 'AIzaSyB6DELfO7bctQJeWkTIYQJ0EjwabOBuOGY',
  authDomain: 'le-panier-b42d1.firebaseapp.com',
  projectId: 'le-panier-b42d1',
  storageBucket: 'le-panier-b42d1.firebasestorage.app',
  messagingSenderId: '56342358750',
  appId: '1:56342358750:web:97f51a64fce1998792b04f'
};

const VERSION = '2.2';
const $ = function (id) { return document.getElementById(id); };
const params = new URLSearchParams(location.search);
const MODE_DEMO = params.has('demo') || !CONFIG_FIREBASE.apiKey;

const D = {
  foyer: { personnes: 2, placard: C.PLACARD_DEFAUT.slice(), rayons: C.RAYONS_DEFAUT.slice() },
  articles: new Map(),
  recettes: new Map(),
  repas: new Map(),
  historique: new Map(),
  membres: new Map(),
  moi: { uid: 'local', nom: '' },
  foyerId: null,
  pret: false,
  enLigne: navigator.onLine
};

const UI = {
  vue: 'liste',
  magasin: false,
  semaine: 0,
  recherche: '',
  saisie: '',
  guide: 'Crémerie',
  rendu: 0,
  feuille: null,
  annuler: null,
  minuteurToast: 0
};

let S = null;

// Outils

function echapper(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nouvelId(prefixe) {
  return prefixe + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function lireLocal(cle, defaut) {
  try { const v = localStorage.getItem('lepanier.' + cle); return v == null ? defaut : JSON.parse(v); } catch (e) { return defaut; }
}

function ecrireLocal(cle, valeur) {
  try { localStorage.setItem('lepanier.' + cle, JSON.stringify(valeur)); } catch (e) { /* stockage indisponible */ }
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function cleDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function aujourdhuiCle() { return cleDate(new Date()); }

function joursSemaine(decalage) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + decalage * 7);
  const auj = aujourdhuiCle();
  const liste = [];
  for (let i = 0; i < 7; i++) {
    const j = new Date(d);
    j.setDate(d.getDate() + i);
    const cle = cleDate(j);
    liste.push({
      cle: cle,
      date: j,
      nom: JOURS[i],
      abr: JOURS[i].slice(0, 3).toUpperCase(),
      num: j.getDate(),
      aujourdhui: cle === auj,
      passe: cle < auj
    });
  }
  return liste;
}

function libelleJour(cle) {
  const p = cle.split('-');
  const d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 12);
  return JOURS[(d.getDay() + 6) % 7] + ' ' + d.getDate();
}

function couleurDe(texte) {
  const teintes = ['#1E7A4C', '#B8572A', '#2A5BA6', '#8A5A9E', '#946B20', '#3F7F86'];
  let h = 0;
  const s = String(texte || '');
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return teintes[h % teintes.length];
}

function appris() {
  const carte = {};
  D.historique.forEach(function (h) { if (h.rayon && h.nom) { carte[C.cleProduit(h.nom)] = h.rayon; } });
  return carte;
}

function idHistorique(nom) {
  return C.cleProduit(nom).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || nouvelId('h');
}

function nomMembre(uid) {
  const m = D.membres.get(uid);
  return m && m.nom ? m.nom : '';
}

function membresDistincts() {
  const vus = {};
  const liste = [];
  D.membres.forEach(function (m, uid) {
    const n = (m.nom || '').trim();
    const cle = n.toLowerCase() || uid;
    if (!vus[cle]) { vus[cle] = true; liste.push({ uid: uid, nom: n || 'Sans prénom' }); }
  });
  return liste;
}

// Icônes

const ICONES = {
  coche: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sur-accent)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  info: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5.5M12 7.6v.1"/></svg>',
  chevron: '<svg class="chevron" width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m1.5 1.5 6 6-6 6"/></svg>',
  gauche: '<svg width="11" height="18" viewBox="0 0 11 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2 2 9l7 7"/></svg>',
  droite: '<svg width="11" height="18" viewBox="0 0 11 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 2 7 7-7 7"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  chariot: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.2l2.3 11h10.2l2-8H6.4"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="16.5" cy="19.5" r="1.3"/></svg>',
  croix: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  haut: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
  bas: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  panier: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.3 10.4a2 2 0 0 1-2 1.6H8.3a2 2 0 0 1-2-1.6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'
};

// Stockage local (mode démo)

function creerStockageLocal() {
  const CLE = 'lepanier.v2';
  const COLLECTIONS = ['articles', 'recettes', 'repas', 'historique', 'membres'];

  function sauver() {
    try {
      const o = { foyer: D.foyer, moi: D.moi };
      COLLECTIONS.forEach(function (c) { o[c] = Array.from(D[c].entries()); });
      localStorage.setItem(CLE, JSON.stringify(o));
    } catch (e) { /* stockage indisponible */ }
  }

  function charger() {
    try {
      const o = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (!o) { return false; }
      D.foyer = Object.assign({}, D.foyer, o.foyer || {});
      D.moi = o.moi || D.moi;
      COLLECTIONS.forEach(function (c) { D[c] = new Map(o[c] || []); });
      return true;
    } catch (e) { return false; }
  }

  return {
    type: 'local',
    demarrer: async function () {
      if (!charger()) {
        D.moi = { uid: 'local', nom: 'Moi' };
        D.membres.set('local', { nom: 'Moi' });
        graines().forEach(function (op) { appliquerLocal(op); });
        sauver();
      }
      D.foyerId = 'demo';
      D.pret = true;
      planifierRendu();
    },
    ecrire: function (ops) {
      ops.forEach(appliquerLocal);
      sauver();
      planifierRendu();
    }
  };
}

function appliquerLocal(op) {
  if (op.c === 'foyer') { D.foyer = Object.assign({}, D.foyer, op.d); return; }
  const carte = D[op.c];
  if (!carte) { return; }
  if (op.t === 'suppr') { carte.delete(op.id); return; }
  if (op.t === 'set') { carte.set(op.id, Object.assign({}, op.d)); return; }
  const avant = carte.get(op.id) || {};
  const apres = Object.assign({}, avant, op.d);
  if (op.t === 'incr') { apres[op.champ] = (avant[op.champ] || 0) + 1; }
  carte.set(op.id, apres);
}

// Stockage partagé (Firebase)

async function creerStockageDistant() {
  const FB = await import('./firebase.js');
  const app = FB.initializeApp(CONFIG_FIREBASE);
  let db;
  try {
    db = FB.initializeFirestore(app, { localCache: FB.persistentLocalCache({ tabManager: FB.persistentMultipleTabManager() }) });
  } catch (e) {
    db = FB.initializeFirestore(app, { localCache: FB.memoryLocalCache() });
  }
  const auth = FB.getAuth(app);
  const abonnements = [];

  function refDoc(c, id) {
    return c === 'foyer' ? FB.doc(db, 'foyers', D.foyerId) : FB.doc(db, 'foyers', D.foyerId, c, id);
  }

  async function utilisateur() {
    const deja = await new Promise(function (resoudre) {
      const stop = FB.onAuthStateChanged(auth, function (u) { stop(); resoudre(u); });
    });
    if (deja) { return deja; }
    const r = await FB.signInAnonymously(auth);
    return r.user;
  }

  function brancher(foyerId) {
    abonnements.forEach(function (stop) { stop(); });
    abonnements.length = 0;
    D.foyerId = foyerId;
    ecrireLocal('foyer', foyerId);
    try { history.replaceState(null, '', location.pathname + '?foyer=' + encodeURIComponent(foyerId)); } catch (e) { /* ignore */ }

    abonnements.push(FB.onSnapshot(FB.doc(db, 'foyers', foyerId), function (snap) {
      if (!snap.exists()) { return; }
      const d = snap.data();
      D.foyer = {
        personnes: d.personnes || 2,
        placard: Array.isArray(d.placard) ? d.placard : C.PLACARD_DEFAUT.slice(),
        rayons: Array.isArray(d.rayons) && d.rayons.length ? d.rayons : C.RAYONS_DEFAUT.slice(),
        membres: d.membres || []
      };
      if (!D.pret) { D.pret = true; masquerAccueil(); }
      planifierRendu();
    }, function () {
      afficherAccueil('rejoindre', foyerId, 'Ce foyer n’est plus accessible depuis ce téléphone. Rejoins-le à nouveau avec ton prénom.');
    }));

    ['articles', 'recettes', 'repas', 'historique', 'membres'].forEach(function (c) {
      abonnements.push(FB.onSnapshot(FB.collection(db, 'foyers', foyerId, c), function (snap) {
        const carte = new Map();
        snap.forEach(function (doc) { carte.set(doc.id, doc.data()); });
        D[c] = carte;
        if (c === 'membres') { D.moi.nom = nomMembre(D.moi.uid) || D.moi.nom; }
        planifierRendu();
      }, function () { /* erreurs traitées par l'abonnement au foyer */ }));
    });
  }

  return {
    type: 'distant',
    demarrer: async function () {
      afficherAccueil('chargement');
      let u;
      try { u = await utilisateur(); } catch (e) {
        afficherAccueil('erreur', null, 'Il faut une connexion internet pour la toute première ouverture.');
        return;
      }
      D.moi.uid = u.uid;
      let foyerId = null;
      try {
        const snap = await FB.getDoc(FB.doc(db, 'utilisateurs', u.uid));
        if (snap.exists()) { foyerId = snap.data().foyer || null; }
      } catch (e) { foyerId = lireLocal('foyer', null); }
      const code = extraireCode(params.get('foyer') || params.get('rejoindre') || '');
      if (foyerId) { brancher(foyerId); return; }
      if (code) { afficherAccueil('rejoindre', code); return; }
      afficherAccueil('creer');
    },
    creer: async function (nom) {
      const ref = FB.doc(FB.collection(db, 'foyers'));
      await FB.setDoc(ref, {
        membres: [D.moi.uid], cree: FB.serverTimestamp(), personnes: 2,
        placard: C.PLACARD_DEFAUT.slice(), rayons: C.RAYONS_DEFAUT.slice()
      });
      D.foyerId = ref.id;
      const lot = FB.writeBatch(db);
      lot.set(FB.doc(db, 'utilisateurs', D.moi.uid), { foyer: ref.id });
      lot.set(FB.doc(db, 'foyers', ref.id, 'membres', D.moi.uid), { nom: nom, arrive: Date.now() });
      graines().forEach(function (op) { lot.set(FB.doc(db, 'foyers', ref.id, op.c, op.id), op.d); });
      await lot.commit();
      D.moi.nom = nom;
      brancher(ref.id);
    },
    rejoindre: async function (code, nom) {
      await FB.updateDoc(FB.doc(db, 'foyers', code), { membres: FB.arrayUnion(D.moi.uid) });
      D.foyerId = code;
      const lot = FB.writeBatch(db);
      lot.set(FB.doc(db, 'utilisateurs', D.moi.uid), { foyer: code });
      lot.set(FB.doc(db, 'foyers', code, 'membres', D.moi.uid), { nom: nom, arrive: Date.now() });
      await lot.commit();
      D.moi.nom = nom;
      brancher(code);
    },
    ecrire: function (ops) {
      if (!D.foyerId || !ops.length) { return; }
      const lot = FB.writeBatch(db);
      ops.forEach(function (op) {
        const ref = refDoc(op.c, op.id);
        if (op.t === 'set') { lot.set(ref, op.d); }
        else if (op.t === 'maj') { lot.set(ref, op.d, { merge: true }); }
        else if (op.t === 'suppr') { lot.delete(ref); }
        else if (op.t === 'incr') {
          const d = Object.assign({}, op.d);
          d[op.champ] = FB.increment(1);
          lot.set(ref, d, { merge: true });
        }
      });
      lot.commit().catch(function () {
        montrerToast('Une modification n’a pas pu être enregistrée. Vérifie la connexion puis réessaie.');
      });
    }
  };
}

function extraireCode(texte) {
  const t = String(texte || '').trim();
  if (!t) { return ''; }
  const m = t.match(/[?&](?:foyer|rejoindre)=([A-Za-z0-9_-]+)/);
  if (m) { return m[1]; }
  return /^[A-Za-z0-9_-]{8,}$/.test(t) ? t : '';
}

function ecrire(ops) { if (S) { S.ecrire(ops); } }

// Recettes de départ

function graines() {
  const maintenant = Date.now();
  const recettes = [
    {
      id: 'r-risotto', titre: 'Risotto aux courgettes', parts: 2, temps: 35,
      ingredients: '150 g de riz arborio\n2 courgettes\n50 g de parmesan\n1 oignon\n50 cl de bouillon de volaille\n10 cl de vin blanc sec\n15 g de beurre\nSel, poivre',
      etapes: ['Couper les courgettes en petits dés et émincer l’oignon.', 'Faire revenir l’oignon dans le beurre, puis nacrer le riz deux minutes.', 'Déglacer au vin blanc, puis verser le bouillon chaud louche par louche en remuant, environ 18 minutes.', 'Ajouter les courgettes à mi-cuisson.', 'Hors du feu, incorporer le parmesan, saler et poivrer.']
    },
    {
      id: 'r-quiche', titre: 'Quiche aux lardons', parts: 4, temps: 50,
      ingredients: '1 pâte brisée\n200 g de lardons\n3 oeufs\n25 cl de crème liquide\n100 g d’emmental râpé\n1 pincée de muscade',
      etapes: ['Préchauffer le four à 180 °C (350 °F).', 'Faire dorer les lardons à sec, puis les égoutter.', 'Battre les oeufs avec la crème, la muscade et un peu de poivre.', 'Garnir le fond de tarte avec les lardons et le fromage, verser l’appareil.', 'Cuire 35 minutes, jusqu’à ce que le dessus soit doré.']
    },
    {
      id: 'r-poulet', titre: 'Poulet rôti au citron', parts: 4, temps: 75,
      ingredients: '1 poulet entier\n2 citrons\n1 kg de pommes de terre\n1 botte de thym\n4 gousses d’ail\n3 c. à soupe d’huile d’olive\nSel, poivre',
      etapes: ['Préchauffer le four à 200 °C (400 °F).', 'Glisser un citron coupé en deux et le thym dans le poulet.', 'Disposer les pommes de terre en quartiers et l’ail autour, arroser d’huile.', 'Enfourner 1 h 10 en arrosant le poulet à mi-cuisson.']
    },
    {
      id: 'r-dahl', titre: 'Dahl de lentilles corail', parts: 4, temps: 30,
      ingredients: '250 g de lentilles corail\n40 cl de lait de coco\n1 boîte de tomates concassées\n1 oignon\n1 morceau de gingembre\n2 c. à thé de curry\n1 botte de coriandre',
      etapes: ['Faire revenir l’oignon et le gingembre râpé avec le curry.', 'Ajouter les lentilles rincées, les tomates, le lait de coco et 30 cl d’eau.', 'Laisser mijoter 20 minutes en remuant, jusqu’à ce que les lentilles fondent.', 'Servir avec la coriandre ciselée et du riz basmati.']
    }
  ];
  return recettes.map(function (r, i) {
    return {
      t: 'set', c: 'recettes', id: r.id,
      d: {
        titre: r.titre, parts: r.parts, temps: r.temps,
        ingredients: C.lireLignes(r.ingredients),
        etapes: r.etapes, cree: maintenant + i, par: D.moi.uid, exemple: true
      }
    };
  });
}

// Rendu

function planifierRendu() {
  if (UI.rendu) { return; }
  const lancer = function () { UI.rendu = 0; rendre(); };
  // Une page en arrière-plan ne reçoit pas d'image d'animation : on passe par un minuteur.
  UI.rendu = document.hidden ? setTimeout(lancer, 0) : requestAnimationFrame(lancer);
}

function remplacer(el, html) {
  if (!el) { return; }
  const actif = document.activeElement;
  let id = null;
  let valeur = null;
  let debut = null;
  let fin = null;
  if (actif && actif.id && el.contains(actif)) {
    id = actif.id; valeur = actif.value;
    try { debut = actif.selectionStart; fin = actif.selectionEnd; } catch (e) { /* ignore */ }
  }
  el.innerHTML = html;
  if (id) {
    const nouveau = document.getElementById(id);
    if (nouveau) {
      if (valeur != null) { nouveau.value = valeur; }
      nouveau.focus({ preventScroll: true });
      try { if (debut != null) { nouveau.setSelectionRange(debut, fin); } } catch (e) { /* ignore */ }
    }
  }
}

function rendre() {
  if (!D.pret) { return; }
  const vues = ['liste', 'semaine', 'recettes', 'foyer'];
  vues.forEach(function (v) { $('vue-' + v).hidden = v !== UI.vue; });
  document.querySelectorAll('.onglet').forEach(function (b) {
    const actif = b.getAttribute('data-vue') === UI.vue;
    b.classList.toggle('actif', actif);
    if (actif) { b.setAttribute('aria-current', 'page'); } else { b.removeAttribute('aria-current'); }
  });

  const aPrendre = Array.from(D.articles.values()).filter(function (a) { return !a.coche; }).length;
  const pastille = $('pastille-liste');
  pastille.hidden = UI.vue === 'liste' || aPrendre === 0;
  pastille.textContent = aPrendre > 99 ? '99+' : String(aPrendre);

  if (UI.vue === 'liste') { rendreListe(); }
  else if (UI.vue === 'semaine') { rendreSemaine(); }
  else if (UI.vue === 'recettes') { rendreRecettes(); }
  else { rendreFoyer(); }

  if (UI.feuille && UI.feuille.vivante) { rendreFeuille(); }
}

function entete(titre, sous, actions) {
  $('titre').textContent = titre;
  $('sous-titre').textContent = sous || ' ';
  $('entete-actions').innerHTML = actions || '';
}

// Liste

function articlesTries() {
  const rayons = D.foyer.rayons || C.RAYONS_DEFAUT;
  const groupes = {};
  const pris = [];
  D.articles.forEach(function (a, id) {
    const item = Object.assign({ id: id }, a);
    if (a.coche) { pris.push(item); return; }
    const r = a.rayon || 'Épicerie';
    (groupes[r] = groupes[r] || []).push(item);
  });
  const ordre = rayons.slice();
  Object.keys(groupes).forEach(function (r) { if (ordre.indexOf(r) === -1) { ordre.push(r); } });
  const magasin = ordre.filter(function (r) { return r !== C.MAGASIN_SEPARE; });
  if (ordre.indexOf(C.MAGASIN_SEPARE) !== -1) { magasin.push(C.MAGASIN_SEPARE); }
  const sections = magasin.filter(function (r) { return groupes[r] && groupes[r].length; }).map(function (r) {
    return { rayon: r, items: groupes[r].sort(function (a, b) { return (a.cree || 0) - (b.cree || 0); }) };
  });
  pris.sort(function (a, b) { return (b.cocheLe || 0) - (a.cocheLe || 0); });
  return { sections: sections, pris: pris };
}

function resumerOrigines(origines) {
  const parRecette = {};
  const ordre = [];
  origines.forEach(function (o) {
    const m = String(o).match(/^(.*), (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)$/);
    const titre = m ? m[1] : String(o);
    if (!parRecette[titre]) { parRecette[titre] = []; ordre.push(titre); }
    if (m) { parRecette[titre].push(m[2].slice(0, 3) + '.'); }
  });
  return ordre.map(function (t) { return parRecette[t].length ? t + ' (' + parRecette[t].join(', ') + ')' : t; }).join(' · ');
}

function ligneArticle(a, plusieurs) {
  const qte = C.formaterQuantite(a.quantite, a.unite) + (a.reste ? ' + ' + a.reste : '');
  const eq = C.trouverEquivalence(a.nom);
  const indice = eq && eq.dansListe !== false && !a.coche && eq.verdict !== 'ailleurs'
    ? '<span class="indice ' + eq.verdict + '">Ici : ' + echapper(eq.ca) + '</span>' : '';
  const sous = [];
  if (!UI.magasin && a.origines && a.origines.length) { sous.push(resumerOrigines(a.origines)); }
  if (a.note) { sous.push(a.note); }
  const auteur = plusieurs && a.par ? nomMembre(a.par) : '';
  const puceAuteur = auteur
    ? '<span class="auteur' + (a.par === D.moi.uid ? '' : ' autre') + '" title="Ajouté par ' + echapper(auteur) + '">' + echapper(auteur.charAt(0).toUpperCase()) + '</span>'
    : '';
  return '<div class="ligne-bloc' + (a.coche ? ' fait' : '') + '">'
    + '<button type="button" class="article-principal" data-action="cocher" data-id="' + echapper(a.id) + '" aria-pressed="' + (a.coche ? 'true' : 'false') + '">'
    + '<span class="coche">' + ICONES.coche + '</span>'
    + '<span class="article-textes"><span class="article-nom">' + echapper(a.nom) + '</span>'
    + (sous.length ? '<span class="article-sous" style="display:block">' + echapper(sous.join(' · ')) + '</span>' : '')
    + indice + '</span>'
    + (qte ? '<span class="article-qte">' + echapper(qte) + '</span>' : '')
    + puceAuteur
    + '</button>'
    + '<button type="button" class="bouton-info" data-action="modifier-article" data-id="' + echapper(a.id) + '" aria-label="Modifier ' + echapper(a.nom) + '">' + ICONES.info + '</button>'
    + '</div>';
}

function rendreListe() {
  const t = articlesTries();
  const nbPris = t.pris.length;
  const nbAPrendre = t.sections.reduce(function (s, x) { return s + x.items.length; }, 0);
  let sous = nbAPrendre === 0 ? (nbPris ? 'Tout est dans le panier' : 'Rien à acheter') : nbAPrendre + ' à prendre' + (nbPris ? ' · ' + nbPris + ' dans le panier' : '');
  if (UI.magasin) { sous = 'Mode magasin · ' + sous.toLowerCase(); }
  entete('Courses', sous,
    '<button type="button" class="bouton-rond' + (UI.magasin ? ' actif' : '') + '" data-action="magasin" aria-pressed="' + (UI.magasin ? 'true' : 'false') + '">' + ICONES.chariot + '<span>Magasin</span></button>');

  rendreSuggestions();

  const plusieurs = membresDistincts().length > 1;
  let html = '';

  if (!estInstallee() && !lireLocal('astuce-ecran', false)) {
    html += '<div class="bandeau info" style="display:flex; gap:10px; align-items:flex-start;"><span style="flex-grow:1">Pour l’avoir comme une vraie app : bouton Partager de Safari, puis « Sur l’écran d’accueil ».</span><button type="button" class="mini" data-action="masquer-astuce" aria-label="Masquer ce conseil" style="background:transparent; color:inherit; width:28px; height:28px;">' + ICONES.croix + '</button></div>';
  }
  if (!D.enLigne && S && S.type === 'distant') {
    html += '<div class="bandeau">Hors ligne. Tes changements sont gardés et partiront dès le retour du réseau.</div>';
  }

  if (!nbAPrendre && !nbPris) {
    html += '<div class="vide"><strong>Rien à acheter</strong>Ajoute un article en haut, ou planifie tes repas dans Semaine pour remplir la liste d’un coup.<div style="margin-top:18px"><button type="button" class="bouton second" data-action="vue" data-vue="semaine">Planifier la semaine</button></div></div>';
  }

  t.sections.forEach(function (s) {
    const ailleurs = s.rayon === C.MAGASIN_SEPARE;
    html += '<div class="titre-section' + (ailleurs ? ' ailleurs' : '') + '"><span>' + (ailleurs ? 'Autre magasin · ' : '') + echapper(s.rayon) + '</span><span class="compte">' + s.items.length + '</span></div>';
    html += '<div class="groupe' + (UI.magasin ? ' magasin' : '') + '">' + s.items.map(function (a) { return ligneArticle(a, plusieurs); }).join('') + '</div>';
    if (ailleurs && !UI.magasin) {
      html += '<p class="aide" style="margin: 7px 32px 0 32px;">Pas d’alcool en épicerie au Manitoba : Liquor Mart ou beer vendor.</p>';
    }
  });

  if (nbPris) {
    html += '<div class="titre-section"><span>Dans le panier</span><span class="compte">' + nbPris + '</span></div>';
    html += '<div class="groupe' + (UI.magasin ? ' magasin' : '') + '">' + t.pris.map(function (a) { return ligneArticle(a, plusieurs); }).join('') + '</div>';
    html += '<div class="pied-liste"><button type="button" class="bouton large" data-action="terminer">Terminer les courses</button>'
      + '<p class="aide" style="text-align:center; margin-top:0">Retire les articles pris de la liste. L’app retient ce que vous achetez souvent.</p></div>';
  }

  remplacer($('liste-contenu'), html);
}

function rendreSuggestions() {
  const saisie = C.normaliser(UI.saisie);
  const dansListe = {};
  D.articles.forEach(function (a) { if (!a.coche) { dansListe[C.cleProduit(a.nom)] = true; } });
  let noms = [];

  if (!saisie) {
    noms = Array.from(D.historique.entries())
      .filter(function (e) { return e[1].nom && e[1].fois && !dansListe[C.cleProduit(e[1].nom)]; })
      .sort(function (a, b) { return (b[1].fois || 0) - (a[1].fois || 0) || (b[1].dernier || 0) - (a[1].dernier || 0); })
      .slice(0, 10)
      .map(function (e) { return e[1].nom; });
  } else {
    const analyse = C.lireLigne(UI.saisie)[0];
    const cherche = C.normaliser(analyse ? analyse.nom : UI.saisie);
    if (cherche.length >= 2) {
      const vus = {};
      const candidats = [];
      D.historique.forEach(function (h) { candidats.push({ nom: h.nom, poids: 100 + (h.fois || 0) }); });
      D.recettes.forEach(function (r) { (r.ingredients || []).forEach(function (i) { candidats.push({ nom: i.nom, poids: 10 }); }); });
      candidats.sort(function (a, b) { return b.poids - a.poids; }).forEach(function (c) {
        const n = C.normaliser(c.nom);
        const cle = C.cleProduit(c.nom);
        if (vus[cle] || dansListe[cle]) { return; }
        if ((' ' + n).indexOf(' ' + cherche) !== -1 && n !== cherche) { vus[cle] = true; noms.push(c.nom); }
      });
      noms = noms.slice(0, 8);
    }
  }

  const el = $('suggestions');
  el.hidden = !noms.length;
  el.innerHTML = noms.map(function (n) {
    return '<button type="button" class="puce" data-action="suggestion" data-nom="' + echapper(n) + '"><span class="plus">+</span>' + echapper(n) + '</button>';
  }).join('');
}

function ajouterArticles(entrees, origine) {
  const carteAppris = appris();
  const existants = {};
  D.articles.forEach(function (a, id) { if (!a.coche) { existants[C.cleProduit(a.nom)] = Object.assign({ id: id }, a); } });
  const modifies = {};
  let ajoutes = 0;
  let fusionnes = 0;

  entrees.forEach(function (e) {
    if (!e || !e.nom) { return; }
    const cle = C.cleProduit(e.nom);
    const source = e.origine || origine || '';
    const cible = modifies[cle] || existants[cle];
    if (cible) {
      const somme = C.additionner({ quantite: cible.quantite, unite: cible.unite }, { quantite: e.quantite, unite: e.unite });
      cible.quantite = somme.quantite;
      cible.unite = somme.unite;
      if (somme.reste) { cible.reste = cible.reste ? cible.reste + ' + ' + somme.reste : somme.reste; }
      if (source && (cible.origines || []).indexOf(source) === -1) { cible.origines = (cible.origines || []).concat([source]); }
      if (!modifies[cle] && existants[cle]) { fusionnes++; }
      modifies[cle] = cible;
      return;
    }
    const nouveau = {
      id: nouvelId('a'),
      nom: e.nom,
      quantite: e.quantite == null ? null : e.quantite,
      unite: e.unite || '',
      reste: '',
      note: e.note || '',
      rayon: C.devinerRayon(e.nom, carteAppris),
      coche: false,
      origines: source ? [source] : [],
      par: D.moi.uid,
      cree: Date.now() + ajoutes
    };
    modifies[cle] = nouveau;
    ajoutes++;
  });

  const ops = Object.keys(modifies).map(function (cle) {
    const a = modifies[cle];
    const q = C.arrondirPourCourses(a.quantite, a.unite);
    const d = {
      nom: a.nom, quantite: q == null ? null : q, unite: a.unite || '', reste: a.reste || '', note: a.note || '',
      rayon: a.rayon, coche: false, origines: a.origines || [], par: a.par || D.moi.uid, cree: a.cree || Date.now()
    };
    return { t: 'set', c: 'articles', id: a.id, d: d };
  });
  ecrire(ops);
  return { ajoutes: ajoutes, fusionnes: fusionnes };
}

function terminerCourses() {
  const pris = [];
  D.articles.forEach(function (a, id) { if (a.coche) { pris.push(Object.assign({ id: id }, a)); } });
  if (!pris.length) { return; }
  const ops = [];
  pris.forEach(function (a) {
    ops.push({ t: 'incr', c: 'historique', id: idHistorique(a.nom), champ: 'fois', d: { nom: a.nom, rayon: a.rayon, dernier: Date.now() } });
    ops.push({ t: 'suppr', c: 'articles', id: a.id });
  });
  ecrire(ops);
  montrerToast(pris.length + ' articles rangés. Bonne semaine !', function () {
    ecrire(pris.map(function (a) {
      const d = Object.assign({}, a);
      delete d.id;
      return { t: 'set', c: 'articles', id: a.id, d: d };
    }));
  });
}

// Semaine

function rendreSemaine() {
  const jours = joursSemaine(UI.semaine);
  const debut = jours[0].date;
  const fin = jours[6].date;
  const sous = debut.getMonth() === fin.getMonth()
    ? debut.getDate() + ' au ' + fin.getDate() + ' ' + MOIS[fin.getMonth()]
    : debut.getDate() + ' ' + MOIS[debut.getMonth()] + ' au ' + fin.getDate() + ' ' + MOIS[fin.getMonth()];
  entete(UI.semaine === 0 ? 'Cette semaine' : (UI.semaine === 1 ? 'La semaine prochaine' : (UI.semaine === -1 ? 'La semaine dernière' : 'Semaine')), sous,
    '<div class="semaine-nav">'
    + '<button type="button" class="bouton-rond" data-action="semaine-prec" aria-label="Semaine précédente">' + ICONES.gauche + '</button>'
    + (UI.semaine !== 0 ? '<button type="button" class="bouton-rond" data-action="semaine-auj">Auj.</button>' : '')
    + '<button type="button" class="bouton-rond" data-action="semaine-suiv" aria-label="Semaine suivante">' + ICONES.droite + '</button>'
    + '</div>');

  let html = '';
  if (!D.recettes.size) {
    html += '<div class="bandeau info">Ajoute d’abord quelques recettes dans l’onglet Recettes, puis choisis-les ici jour par jour.</div>';
  }

  html += '<div class="titre-section"><span>Dîners</span></div><div class="groupe">';
  jours.forEach(function (j) {
    const r = D.repas.get(j.cle);
    const rec = r && r.recetteId ? D.recettes.get(r.recetteId) : null;
    let titre = 'Rien de prévu';
    let detail = '';
    let vide = true;
    if (r) {
      vide = false;
      titre = rec ? rec.titre : (r.titre || 'Repas');
      if (rec) {
        const parts = r.parts || rec.parts || 4;
        detail = 'Pour ' + parts + (rec.temps ? ' · ' + rec.temps + ' min' : '') + (r.ajoute ? ' · dans la liste' : '');
      }
    }
    html += '<button type="button" class="jour' + (j.aujourdhui ? ' aujourdhui' : '') + (j.passe ? ' passe' : '') + '" data-action="choisir-repas" data-jour="' + j.cle + '">'
      + '<span class="jour-date"><span class="jour-abr" style="display:block">' + j.abr + '</span><span class="jour-num" style="display:block">' + j.num + '</span></span>'
      + '<span class="jour-repas' + (vide ? ' vide' : '') + '">' + echapper(titre) + (detail ? '<span class="jour-detail" style="display:block">' + echapper(detail) + '</span>' : '') + '</span>'
      + ICONES.chevron + '</button>';
  });
  html += '</div>';

  const aAjouter = repasAAjouter();
  const libres = jours.filter(function (j) { return !j.passe && !D.repas.get(j.cle); }).length;

  html += '<div class="pied-liste">';
  if (aAjouter.length) {
    html += '<button type="button" class="bouton large" data-action="generer">Ajouter les ingrédients de ' + aAjouter.length + ' repas</button>';
  } else if (Array.from(D.repas.keys()).some(function (k) { return jours.some(function (j) { return j.cle === k && !j.passe; }); })) {
    html += '<p class="aide" style="text-align:center">Les ingrédients des repas à venir sont déjà dans la liste.</p>';
  }
  if (libres && D.recettes.size) {
    html += '<button type="button" class="bouton second large" data-action="proposer">Proposer des idées pour ' + libres + ' jour' + (libres > 1 ? 's' : '') + ' libre' + (libres > 1 ? 's' : '') + '</button>';
  }
  html += '<p class="aide" style="text-align:center; margin-top:0">Les quantités suivent le nombre de parts de chaque repas. Ce qui est toujours à la maison n’est pas ajouté.</p>';
  html += '</div>';

  remplacer($('semaine-contenu'), html);
}

function repasAAjouter() {
  const auj = aujourdhuiCle();
  const jours = joursSemaine(UI.semaine);
  return jours.filter(function (j) {
    const r = D.repas.get(j.cle);
    return j.cle >= auj && r && r.recetteId && !r.ajoute && D.recettes.get(r.recetteId);
  });
}

function genererListe() {
  const jours = repasAAjouter();
  const entrees = [];
  const ignores = {};
  const ops = [];
  jours.forEach(function (j) {
    const r = D.repas.get(j.cle);
    const rec = D.recettes.get(r.recetteId);
    const facteur = (r.parts || rec.parts || 4) / (rec.parts || 4);
    const origine = rec.titre + ', ' + j.nom;
    (rec.ingredients || []).forEach(function (ing) {
      if (C.estAuPlacard(ing.nom, D.foyer.placard)) { ignores[C.cleProduit(ing.nom)] = true; return; }
      entrees.push({ nom: ing.nom, quantite: C.mettreALechelle(ing.quantite, facteur), unite: ing.unite, origine: origine });
    });
    ops.push({ t: 'maj', c: 'repas', id: j.cle, d: { ajoute: Date.now() } });
  });
  const total = ajouterArticles(entrees, '');
  ecrire(ops);
  const nIgn = Object.keys(ignores).length;
  const nb = total.ajoutes + total.fusionnes;
  montrerToast(nb + ' article' + (nb > 1 ? 's' : '') + ' dans la liste' + (nIgn ? ', ' + nIgn + ' déjà à la maison' : '') + '.');
  UI.vue = 'liste';
  planifierRendu();
}

function proposerRepas() {
  const jours = joursSemaine(UI.semaine).filter(function (j) { return !j.passe && !D.repas.get(j.cle); });
  if (!jours.length || !D.recettes.size) { return; }
  const dernier = {};
  D.repas.forEach(function (r, cle) { if (r.recetteId && (!dernier[r.recetteId] || cle > dernier[r.recetteId])) { dernier[r.recetteId] = cle; } });
  const semaine = {};
  joursSemaine(UI.semaine).forEach(function (j) { const r = D.repas.get(j.cle); if (r && r.recetteId) { semaine[r.recetteId] = true; } });
  let pool = Array.from(D.recettes.keys()).filter(function (id) { return !semaine[id]; });
  if (!pool.length) { pool = Array.from(D.recettes.keys()); }
  pool.sort(function (a, b) {
    const da = dernier[a] || '0000';
    const db = dernier[b] || '0000';
    if (da !== db) { return da < db ? -1 : 1; }
    return Math.random() - 0.5;
  });
  const ops = [];
  const poses = [];
  jours.forEach(function (j, i) {
    const id = pool[i % pool.length];
    const rec = D.recettes.get(id);
    ops.push({ t: 'set', c: 'repas', id: j.cle, d: { recetteId: id, titre: rec.titre, parts: rec.parts || 4, par: D.moi.uid } });
    poses.push(j.cle);
  });
  ecrire(ops);
  montrerToast(poses.length + ' repas proposés. Touche un jour pour changer.', function () {
    ecrire(poses.map(function (cle) { return { t: 'suppr', c: 'repas', id: cle }; }));
  });
}

// Recettes

function rendreRecettes() {
  entete('Recettes', D.recettes.size + ' recette' + (D.recettes.size > 1 ? 's' : ''),
    '<button type="button" class="bouton-rond" data-action="nouvelle-recette">' + ICONES.plus + '<span>Ajouter</span></button>');

  const q = C.normaliser(UI.recherche);
  const liste = Array.from(D.recettes.entries()).map(function (e) { return Object.assign({ id: e[0] }, e[1]); })
    .filter(function (r) {
      if (!q) { return true; }
      const texte = C.normaliser(r.titre + ' ' + (r.ingredients || []).map(function (i) { return i.nom; }).join(' '));
      return (' ' + texte).indexOf(' ' + q) !== -1;
    })
    .sort(function (a, b) { return a.titre.localeCompare(b.titre, 'fr'); });

  const planifiees = {};
  const auj = aujourdhuiCle();
  D.repas.forEach(function (r, cle) { if (r.recetteId && cle >= auj && (!planifiees[r.recetteId] || cle < planifiees[r.recetteId])) { planifiees[r.recetteId] = cle; } });

  let html = '';
  if (!liste.length) {
    html = q
      ? '<div class="vide"><strong>Aucune recette trouvée</strong>Essaie un autre mot, ou un ingrédient.</div>'
      : '<div class="vide"><strong>Pas encore de recette</strong>Colle le texte d’une recette trouvée sur un site ou dans tes notes, l’app la range toute seule.<div style="margin-top:18px"><button type="button" class="bouton" data-action="nouvelle-recette">Ajouter une recette</button></div></div>';
  } else {
    html += '<div class="groupe" style="margin-top:8px">';
    liste.forEach(function (r) {
      const meta = ['Pour ' + (r.parts || 4)];
      if (r.temps) { meta.push(r.temps + ' min'); }
      meta.push((r.ingredients || []).length + ' ingrédients');
      if (planifiees[r.id]) { meta.push('prévue ' + libelleJour(planifiees[r.id])); }
      html += '<button type="button" class="recette-ligne" data-action="ouvrir-recette" data-id="' + echapper(r.id) + '">'
        + '<span class="vignette" style="background:' + couleurDe(r.titre) + '">' + echapper(r.titre.charAt(0).toUpperCase()) + '</span>'
        + '<span style="flex-grow:1; min-width:0"><span class="recette-titre" style="display:block">' + echapper(r.titre) + '</span>'
        + '<span class="recette-meta" style="display:block">' + echapper(meta.join(' · ')) + '</span></span>'
        + ICONES.chevron + '</button>';
    });
    html += '</div>';
  }
  remplacer($('recettes-contenu'), html);
}

// Foyer

function rendreFoyer() {
  const etat = S && S.type === 'distant'
    ? '<span class="etat' + (D.enLigne ? '' : ' hors') + '"><i></i>' + (D.enLigne ? 'Synchronisé' : 'Hors ligne') + '</span>'
    : '<span class="etat hors"><i></i>Démo</span>';
  entete('Foyer', '', etat);

  let html = '';
  const membres = membresDistincts();

  html += '<div class="titre-section"><span>Nous</span></div><div class="groupe simple">';
  membres.forEach(function (m) {
    const moi = m.uid === D.moi.uid || (m.nom && m.nom === D.moi.nom);
    html += '<div class="ligne"><span class="auteur' + (moi ? '' : ' autre') + '" style="width:30px;height:30px;border-radius:15px;font-size:14px">' + echapper(m.nom.charAt(0).toUpperCase()) + '</span>'
      + '<span style="flex-grow:1">' + echapper(m.nom) + (moi ? ' <span style="color:var(--secondaire)">(toi)</span>' : '') + '</span>'
      + (moi ? '<button type="button" class="bouton discret" data-action="renommer" style="min-height:36px;padding:0 4px">Modifier</button>' : '')
      + '</div>';
  });
  html += '<button type="button" class="ligne" data-action="inviter" style="color:var(--accent)">' + ICONES.plus + '<span style="flex-grow:1;font-weight:600">Inviter quelqu’un sur son téléphone</span></button>';
  html += '</div>';
  html += '<p class="aide" style="margin:7px 32px 0 32px">Le lien d’invitation donne accès à tout le foyer. Envoie-le seulement aux personnes de la maison.</p>';

  html += '<div class="titre-section"><span>Toujours à la maison</span></div><div class="groupe"><div class="chips">';
  (D.foyer.placard || []).forEach(function (p, i) {
    html += '<button type="button" class="chip" data-action="placard-retirer" data-i="' + i + '" aria-label="Retirer ' + echapper(p) + '">' + echapper(p) + ICONES.croix + '</button>';
  });
  html += '</div><form class="barre-ajout" data-form="placard" style="background:transparent; padding-top:0; padding-bottom:12px"><label for="placard-saisie" class="sr">Ajouter un produit toujours à la maison</label><input class="champ" id="placard-saisie" type="text" placeholder="Ajouter, par exemple sauce soja"><button type="submit" class="bouton" style="min-width:50px;padding:0 14px" aria-label="Ajouter">' + ICONES.plus + '</button></form></div>';
  html += '<p class="aide" style="margin:7px 32px 0 32px">Ces produits ne sont jamais ajoutés depuis une recette.</p>';

  const rayons = D.foyer.rayons || C.RAYONS_DEFAUT;
  html += '<div class="titre-section"><span>Ordre des rayons</span></div><div class="groupe">';
  rayons.forEach(function (r, i) {
    html += '<div class="rayon-ligne"><span>' + echapper(r) + '</span>'
      + '<button type="button" class="mini" data-action="rayon-haut" data-i="' + i + '" aria-label="Monter ' + echapper(r) + '"' + (i === 0 ? ' disabled' : '') + '>' + ICONES.haut + '</button>'
      + '<button type="button" class="mini" data-action="rayon-bas" data-i="' + i + '" aria-label="Descendre ' + echapper(r) + '"' + (i === rayons.length - 1 ? ' disabled' : '') + '>' + ICONES.bas + '</button></div>';
  });
  html += '</div><p class="aide" style="margin:7px 32px 0 32px">Dans l’ordre où tu parcours ton magasin, de l’entrée à la caisse.</p>';

  const cats = ['Crémerie', 'Épicerie', 'Surgelés', 'Boucherie', 'Ailleurs'];
  html += '<div class="titre-section"><span>France vers Canada</span></div>';
  html += '<div class="puces" style="background:transparent; padding-bottom:8px">' + cats.map(function (c) {
    return '<button type="button" class="puce' + (c === UI.guide ? ' choisie' : '') + '" data-action="guide" data-cat="' + c + '">' + c + '</button>';
  }).join('') + '</div><div class="groupe">';
  const libelles = { equivalent: 'Équivalent', substitut: 'Substitut', introuvable: 'Introuvable', ailleurs: 'Autre magasin', format: 'Format' };
  C.EQUIVALENCES.filter(function (e) { return e.cat === UI.guide; }).forEach(function (e) {
    html += '<div class="guide-ligne"><div class="guide-haut"><span class="guide-fr">' + echapper(e.fr) + '</span><span class="indice ' + e.verdict + '" style="margin-top:0">' + libelles[e.verdict] + '</span></div>'
      + '<div class="guide-ca">' + echapper(e.ca) + '</div>'
      + (e.note ? '<div class="guide-note">' + echapper(e.note) + '</div>' : '') + '</div>';
  });
  html += '</div>';

  html += '<div class="titre-section"><span>Conversions</span></div><div class="groupe simple">'
    + [['1 tasse canadienne', '250 ml'], ['1 cup américaine', '237 ml'], ['1 lb', '454 g'], ['1 oz', '28 g'], ['350 °F', '180 °C'], ['400 °F', '200 °C']].map(function (c) {
      return '<div class="ligne" style="min-height:44px"><span style="flex-grow:1">' + c[0] + '</span><span style="font-weight:600;font-variant-numeric:tabular-nums">' + c[1] + '</span></div>';
    }).join('') + '</div>';

  html += '<p class="aide" style="text-align:center; margin:24px 32px 0 32px">Le Panier ' + VERSION + (MODE_DEMO ? ' · mode démo, rien n’est partagé' : '') + '</p>';

  remplacer($('foyer-contenu'), html);
}

// Feuilles

function ouvrirFeuille(titre, etat) {
  UI.feuille = etat;
  $('feuille-titre').textContent = titre;
  rendreFeuille();
  const voile = $('voile');
  const feuille = $('feuille');
  voile.hidden = false;
  feuille.hidden = false;
  $('feuille-corps').scrollTop = 0;
  requestAnimationFrame(function () {
    voile.classList.add('ouvert');
    feuille.classList.add('ouvert');
  });
}

function fermerFeuille() {
  const voile = $('voile');
  const feuille = $('feuille');
  voile.classList.remove('ouvert');
  feuille.classList.remove('ouvert');
  UI.feuille = null;
  setTimeout(function () {
    if (!UI.feuille) { voile.hidden = true; feuille.hidden = true; $('feuille-corps').innerHTML = ''; }
  }, 280);
}

function rendreFeuille() {
  const f = UI.feuille;
  if (!f) { return; }
  let html = '';
  if (f.type === 'article') { html = feuilleArticle(f); }
  else if (f.type === 'recette') { html = feuilleRecette(f); }
  else if (f.type === 'edition') { html = feuilleEdition(f); }
  else if (f.type === 'repas') { html = feuilleRepas(f); }
  else if (f.type === 'nom') { html = feuilleNom(f); }
  remplacer($('feuille-corps'), html);
}

function feuilleArticle(f) {
  const a = D.articles.get(f.id);
  if (!a) { return '<div class="vide">Cet article n’est plus dans la liste.</div>'; }
  const rayons = (D.foyer.rayons || C.RAYONS_DEFAUT).slice();
  if (rayons.indexOf(a.rayon) === -1) { rayons.push(a.rayon); }
  const eq = C.trouverEquivalence(a.nom);
  const qte = C.formaterQuantite(a.quantite, a.unite) + (a.reste ? ' + ' + a.reste : '');
  return '<form class="formulaire" data-form="article">'
    + '<div><label class="etiquette" for="art-nom">Produit</label><input class="champ" id="art-nom" value="' + echapper(a.nom) + '"></div>'
    + '<div><label class="etiquette" for="art-qte">Quantité</label><input class="champ" id="art-qte" value="' + echapper(qte) + '" placeholder="Par exemple 500 g, 2, 1 boîte"></div>'
    + '<div><label class="etiquette" for="art-rayon">Rayon</label><select class="champ" id="art-rayon">' + rayons.map(function (r) {
      return '<option' + (r === a.rayon ? ' selected' : '') + '>' + echapper(r) + '</option>';
    }).join('') + '</select><p class="aide">L’app retient ton choix pour la prochaine fois.</p></div>'
    + '<div><label class="etiquette" for="art-note">Note</label><input class="champ" id="art-note" value="' + echapper(a.note || '') + '" placeholder="Marque, format, bio"></div>'
    + (eq ? '<div class="bandeau" style="margin:0">' + echapper(eq.fr) + ' → ' + echapper(eq.ca) + (eq.note ? '. ' + echapper(eq.note) : '') + '</div>' : '')
    + (a.origines && a.origines.length ? '<p class="aide" style="margin-top:0">Pour : ' + echapper(resumerOrigines(a.origines)) + '</p>' : '')
    + '<button type="submit" class="bouton large">Enregistrer</button>'
    + '<button type="button" class="bouton danger large" data-action="supprimer-article" data-id="' + echapper(f.id) + '">Retirer de la liste</button>'
    + '</form>';
}

function feuilleRecette(f) {
  const r = D.recettes.get(f.id);
  if (!r) { return '<div class="vide">Cette recette a été supprimée.</div>'; }
  const parts = f.parts || r.parts || 4;
  const facteur = parts / (r.parts || 4);
  const meta = [];
  if (r.temps) { meta.push(r.temps + ' min'); }
  meta.push((r.ingredients || []).length + ' ingrédients');
  let html = '<div class="formulaire" style="gap:0">';
  html += '<div style="display:flex; align-items:center; gap:12px; padding: 0 4px 6px 4px"><span style="flex-grow:1; color:var(--secondaire); font-size:15px">' + echapper(meta.join(' · ')) + '</span>'
    + '<span class="compteur"><button type="button" data-action="parts-moins" aria-label="Une part de moins">−</button><output>' + parts + '</output><button type="button" data-action="parts-plus" aria-label="Une part de plus">+</button></span></div>';
  html += '</div>';

  html += '<div class="titre-section" style="padding-top:12px"><span>Ingrédients</span><span class="compte">pour ' + parts + '</span></div><div class="groupe simple">';
  (r.ingredients || []).forEach(function (ing) {
    const q = C.formaterQuantite(C.mettreALechelle(ing.quantite, facteur), ing.unite);
    const maison = C.estAuPlacard(ing.nom, D.foyer.placard);
    const eq = C.trouverEquivalence(ing.nom);
    let indice = '';
    if (maison) { indice = '<span class="indice maison">Toujours à la maison</span>'; }
    else if (eq && eq.dansListe !== false) { indice = '<span class="indice ' + eq.verdict + '">' + (eq.verdict === 'ailleurs' ? 'Liquor Mart' : 'Ici : ' + echapper(eq.ca)) + '</span>'; }
    html += '<div class="ligne" style="align-items:flex-start"><span style="flex-grow:1; min-width:0"><span style="display:block">' + echapper(ing.nom) + (ing.note ? ' <span style="color:var(--secondaire)">(' + echapper(ing.note) + ')</span>' : '') + '</span>' + indice + '</span>'
      + '<span class="article-qte" style="padding-top:1px">' + echapper(q) + '</span></div>';
  });
  html += '</div>';

  if (r.etapes && r.etapes.length) {
    html += '<div class="titre-section"><span>Préparation</span></div><div class="groupe">';
    r.etapes.forEach(function (e, i) {
      html += '<div class="etape"><span class="etape-num">' + (i + 1) + '</span><span>' + echapper(e) + '</span></div>';
    });
    html += '</div>';
  }

  html += '<div class="titre-section"><span>Planifier un dîner</span></div><div class="choix-jours">';
  const auj = new Date();
  for (let i = 0; i < 10; i++) {
    const d = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + i, 12);
    const cle = cleDate(d);
    const pris = D.repas.get(cle);
    html += '<button type="button" class="choix-jour' + (pris ? ' pris' : '') + '" data-action="planifier-recette" data-jour="' + cle + '" aria-label="Planifier ' + libelleJour(cle) + (pris ? ', remplace le repas prévu' : '') + '">'
      + '<span class="jour-abr" style="display:block">' + (i === 0 ? 'AUJ.' : JOURS[(d.getDay() + 6) % 7].slice(0, 3).toUpperCase()) + '</span>'
      + '<span class="jour-num" style="display:block">' + d.getDate() + '</span></button>';
  }
  html += '</div>';

  html += '<div class="pied-liste">'
    + '<button type="button" class="bouton large" data-action="recette-vers-liste">Ajouter les ingrédients à la liste</button>'
    + '<div class="rangee"><button type="button" class="bouton second" data-action="modifier-recette">Modifier</button>'
    + '<button type="button" class="bouton ' + (f.confirmer ? 'danger' : 'second') + '" data-action="supprimer-recette">' + (f.confirmer ? 'Confirmer' : 'Supprimer') + '</button></div>'
    + '</div>';
  return html;
}

function feuilleEdition(f) {
  const r = f.id ? D.recettes.get(f.id) : null;
  const titre = r ? r.titre : '';
  const parts = r ? r.parts : 4;
  const temps = r && r.temps ? r.temps : '';
  const ingredients = r ? (r.ingredients || []).map(C.ligneTexte).join('\n') : '';
  const etapes = r ? (r.etapes || []).join('\n') : '';
  let html = '<form class="formulaire" data-form="recette">';
  if (!r) {
    html += '<div><label class="etiquette" for="rec-colle">Coller une recette entière</label>'
      + '<textarea class="champ" id="rec-colle" rows="5" placeholder="Copie le texte d’une recette depuis un site, un message ou tes notes, puis colle-le ici."></textarea>'
      + '<button type="button" class="bouton second large" data-action="lire-recette" style="margin-top:8px">Remplir automatiquement</button>'
      + '<p class="aide">Titre, nombre de parts, ingrédients et étapes sont repérés tout seuls. Vérifie avant d’enregistrer.</p></div>'
      + '<div class="separation">puis vérifie</div>';
  }
  html += '<div><label class="etiquette" for="rec-titre">Titre</label><input class="champ" id="rec-titre" value="' + echapper(titre) + '" placeholder="Risotto aux champignons"></div>'
    + '<div class="rangee"><div><label class="etiquette" for="rec-parts">Parts</label><input class="champ" id="rec-parts" type="number" inputmode="numeric" min="1" max="30" value="' + echapper(parts) + '"></div>'
    + '<div><label class="etiquette" for="rec-temps">Minutes</label><input class="champ" id="rec-temps" type="number" inputmode="numeric" min="0" max="1440" value="' + echapper(temps) + '" placeholder="35"></div></div>'
    + '<div><label class="etiquette" for="rec-ingredients">Ingrédients, un par ligne</label><textarea class="champ" id="rec-ingredients" rows="8" placeholder="300 g de riz arborio&#10;250 g de champignons&#10;1 oignon">' + echapper(ingredients) + '</textarea></div>'
    + '<div><label class="etiquette" for="rec-etapes">Étapes, une par ligne</label><textarea class="champ" id="rec-etapes" rows="6" placeholder="Émincer l’oignon.&#10;Nacrer le riz.">' + echapper(etapes) + '</textarea></div>'
    + '<button type="submit" class="bouton large">Enregistrer la recette</button>'
    + '</form>';
  return html;
}

function feuilleRepas(f) {
  const r = D.repas.get(f.jour);
  const q = C.normaliser(f.recherche || '');
  const recettes = Array.from(D.recettes.entries()).map(function (e) { return Object.assign({ id: e[0] }, e[1]); })
    .filter(function (x) { return !q || (' ' + C.normaliser(x.titre)).indexOf(' ' + q) !== -1; })
    .sort(function (a, b) { return a.titre.localeCompare(b.titre, 'fr'); });
  const recChoisie = r && r.recetteId ? D.recettes.get(r.recetteId) : null;
  const parts = f.parts || (r && r.parts) || (recChoisie && recChoisie.parts) || 4;
  let html = '<div class="formulaire" style="gap:10px">';
  if (recChoisie) {
    html += '<div style="display:flex; align-items:center; gap:12px"><span style="flex-grow:1">Parts pour ce repas</span><span class="compteur"><button type="button" data-action="repas-moins" aria-label="Une part de moins">−</button><output>' + parts + '</output><button type="button" data-action="repas-plus" aria-label="Une part de plus">+</button></span></div>';
  }
  html += '<div><label for="repas-recherche" class="sr">Chercher une recette</label><input class="champ" id="repas-recherche" type="search" placeholder="Chercher une recette" value="' + echapper(f.recherche || '') + '"></div>';
  html += '</div>';
  html += '<div class="puces" style="background:transparent; padding-top:10px">' + ['Restes', 'Resto', 'Soirée libre'].map(function (t) {
    return '<button type="button" class="puce" data-action="repas-libre" data-titre="' + t + '">' + t + '</button>';
  }).join('') + '</div>';
  html += '<div class="groupe">';
  if (!recettes.length) {
    html += '<div class="vide" style="padding:28px 20px">' + (q ? 'Aucune recette ne correspond.' : 'Pas encore de recette enregistrée.') + '</div>';
  }
  recettes.forEach(function (x) {
    const choisie = r && r.recetteId === x.id;
    html += '<button type="button" class="recette-ligne" data-action="choisir-recette-repas" data-id="' + echapper(x.id) + '">'
      + '<span class="vignette" style="background:' + couleurDe(x.titre) + '">' + echapper(x.titre.charAt(0).toUpperCase()) + '</span>'
      + '<span style="flex-grow:1; min-width:0"><span class="recette-titre" style="display:block">' + echapper(x.titre) + '</span>'
      + '<span class="recette-meta" style="display:block">' + (x.temps ? x.temps + ' min · ' : '') + (x.ingredients || []).length + ' ingrédients</span></span>'
      + (choisie ? '<span style="color:var(--accent)">' + ICONES.coche.replace('var(--sur-accent)', 'currentColor') + '</span>' : '')
      + '</button>';
  });
  html += '</div>';
  if (r) {
    html += '<div class="pied-liste"><button type="button" class="bouton danger large" data-action="retirer-repas">Retirer ce repas</button></div>';
  }
  return html;
}

function feuilleNom() {
  return '<form class="formulaire" data-form="nom"><div><label class="etiquette" for="nom-saisie">Ton prénom</label><input class="champ" id="nom-saisie" value="' + echapper(D.moi.nom || '') + '" autocomplete="given-name"></div><button type="submit" class="bouton large">Enregistrer</button></form>';
}

// Accueil

function afficherAccueil(mode, code, message) {
  const el = $('accueil');
  let html = '<div class="accueil-contenu"><div class="logo">' + ICONES.panier + '</div>';
  if (mode === 'chargement') {
    html += '<h1>Le Panier</h1><p>Ouverture de votre liste…</p>';
  } else if (mode === 'erreur') {
    html += '<h1>Le Panier</h1><p>' + echapper(message) + '</p><button type="button" class="bouton large" data-action="reessayer">Réessayer</button>';
  } else if (mode === 'rejoindre') {
    html += '<h1>Rejoindre le foyer</h1><p>' + echapper(message || 'Tu as été invité à partager la liste de courses, les repas de la semaine et les recettes.') + '</p>'
      + '<form class="formulaire" data-form="rejoindre" data-code="' + echapper(code) + '" style="padding:0"><div><label class="etiquette" for="accueil-nom">Ton prénom</label><input class="champ" id="accueil-nom" autocomplete="given-name" required value="' + echapper(lireLocal('prenom', '')) + '"></div>'
      + '<button type="submit" class="bouton large">Rejoindre</button><p class="aide" id="accueil-erreur" hidden></p></form>';
  } else {
    html += '<h1>Le Panier</h1><p>Vos courses triées par rayon, vos repas de la semaine et vos recettes, partagés en direct entre vos téléphones.</p>'
      + '<form class="formulaire" data-form="creer" style="padding:0"><div><label class="etiquette" for="accueil-nom">Ton prénom</label><input class="champ" id="accueil-nom" autocomplete="given-name" required value="' + echapper(lireLocal('prenom', '')) + '"></div>'
      + '<button type="submit" class="bouton large">Créer notre foyer</button><p class="aide" id="accueil-erreur" hidden></p></form>'
      + '<div class="separation">ou</div>'
      + '<form class="formulaire" data-form="code" style="padding:0"><div><label class="etiquette" for="accueil-code">Lien d’invitation reçu</label><input class="champ" id="accueil-code" placeholder="Colle le lien ici"></div>'
      + '<button type="submit" class="bouton second large">Rejoindre avec ce lien</button></form>';
  }
  html += '</div>';
  el.innerHTML = html;
  el.hidden = false;
}

function masquerAccueil() { $('accueil').hidden = true; }

// Messages

function montrerToast(texte, annulation) {
  const t = $('toast');
  $('toast-texte').textContent = texte;
  UI.annuler = annulation || null;
  $('toast-action').hidden = !annulation;
  t.classList.add('visible');
  clearTimeout(UI.minuteurToast);
  UI.minuteurToast = setTimeout(function () { t.classList.remove('visible'); UI.annuler = null; }, annulation ? 6000 : 3200);
}

// Écran allumé en magasin

let verrouEcran = null;
async function garderEcranAllume(actif) {
  try {
    if (actif && 'wakeLock' in navigator) { verrouEcran = await navigator.wakeLock.request('screen'); }
    else if (!actif && verrouEcran) { await verrouEcran.release(); verrouEcran = null; }
  } catch (e) { verrouEcran = null; }
}

function estInstallee() {
  return window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}

// Actions

async function partagerInvitation() {
  if (MODE_DEMO || !D.foyerId) {
    montrerToast('En mode démo, rien n’est partagé. Il faut d’abord brancher la base Firebase.');
    return;
  }
  const lien = location.origin + location.pathname + '?foyer=' + encodeURIComponent(D.foyerId);
  const texte = 'Rejoins notre liste de courses Le Panier : ouvre ce lien sur ton iPhone.';
  try {
    if (navigator.share) { await navigator.share({ title: 'Le Panier', text: texte, url: lien }); return; }
  } catch (e) { if (e && e.name === 'AbortError') { return; } }
  try {
    await navigator.clipboard.writeText(lien);
    montrerToast('Lien copié. Envoie-le par message.');
  } catch (e) {
    montrerToast(lien);
  }
}

function modifierPersonnes(delta) {
  const n = Math.max(1, Math.min(12, (D.foyer.personnes || 2) + delta));
  ecrire([{ t: 'maj', c: 'foyer', d: { personnes: n } }]);
}

function deplacerRayon(i, delta) {
  const r = (D.foyer.rayons || C.RAYONS_DEFAUT).slice();
  const j = i + delta;
  if (j < 0 || j >= r.length) { return; }
  const x = r[i]; r[i] = r[j]; r[j] = x;
  ecrire([{ t: 'maj', c: 'foyer', d: { rayons: r } }]);
}

function enregistrerRecette() {
  const titre = $('rec-titre').value.trim();
  if (!titre) { $('rec-titre').focus(); montrerToast('Donne un titre à la recette.'); return; }
  const parts = Math.max(1, parseInt($('rec-parts').value, 10) || 4);
  const temps = parseInt($('rec-temps').value, 10) || null;
  const ingredients = C.lireLignes($('rec-ingredients').value);
  const etapes = $('rec-etapes').value.split(/\n+/).map(function (l) { return l.replace(/^\s*\d+\s*[.)\-:]\s*/, '').trim(); }).filter(Boolean);
  const id = UI.feuille && UI.feuille.id ? UI.feuille.id : nouvelId('r');
  const avant = D.recettes.get(id) || {};
  ecrire([{ t: 'set', c: 'recettes', id: id, d: { titre: titre, parts: parts, temps: temps, ingredients: ingredients, etapes: etapes, cree: avant.cree || Date.now(), par: avant.par || D.moi.uid } }]);
  montrerToast(avant.titre ? 'Recette mise à jour.' : 'Recette ajoutée.');
  ouvrirFeuille(titre, { type: 'recette', id: id, vivante: true });
}

function lireRecetteCollee() {
  const texte = $('rec-colle').value;
  if (!texte.trim()) { $('rec-colle').focus(); return; }
  const r = C.lireRecette(texte);
  $('rec-titre').value = r.titre;
  if (r.parts) { $('rec-parts').value = r.parts; }
  if (r.temps) { $('rec-temps').value = r.temps; }
  $('rec-ingredients').value = r.ingredients.map(C.ligneTexte).join('\n');
  $('rec-etapes').value = r.etapes.join('\n');
  montrerToast(r.ingredients.length + ' ingrédients et ' + r.etapes.length + ' étapes repérés. Vérifie puis enregistre.');
  $('rec-titre').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('click', function (ev) {
  const cible = ev.target.closest('[data-action]');
  if (!cible) { return; }
  const action = cible.getAttribute('data-action');
  const id = cible.getAttribute('data-id');
  const f = UI.feuille;

  switch (action) {
    case 'vue':
      UI.vue = cible.getAttribute('data-vue');
      planifierRendu();
      break;
    case 'cocher': {
      const a = D.articles.get(id);
      if (a) {
        ecrire([{ t: 'maj', c: 'articles', id: id, d: { coche: !a.coche, cocheLe: Date.now(), cochePar: D.moi.uid } }]);
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* ignore */ } }
      }
      break;
    }
    case 'modifier-article': {
      const a = D.articles.get(id);
      if (a) { ouvrirFeuille(a.nom, { type: 'article', id: id }); }
      break;
    }
    case 'supprimer-article': {
      const a = D.articles.get(id);
      if (a) {
        const sauvegarde = Object.assign({}, a);
        ecrire([{ t: 'suppr', c: 'articles', id: id }]);
        fermerFeuille();
        montrerToast(a.nom + ' retiré.', function () { ecrire([{ t: 'set', c: 'articles', id: id, d: sauvegarde }]); });
      }
      break;
    }
    case 'suggestion': {
      const nom = cible.getAttribute('data-nom');
      const analyse = C.lireLigne(UI.saisie)[0];
      ajouterArticles([{ nom: nom, quantite: analyse ? analyse.quantite : null, unite: analyse ? analyse.unite : '' }], '');
      $('saisie').value = '';
      UI.saisie = '';
      rendreSuggestions();
      break;
    }
    case 'terminer':
      terminerCourses();
      break;
    case 'magasin':
      UI.magasin = !UI.magasin;
      garderEcranAllume(UI.magasin);
      planifierRendu();
      break;
    case 'masquer-astuce':
      ecrireLocal('astuce-ecran', true);
      planifierRendu();
      break;
    case 'semaine-prec': UI.semaine--; planifierRendu(); break;
    case 'semaine-suiv': UI.semaine++; planifierRendu(); break;
    case 'semaine-auj': UI.semaine = 0; planifierRendu(); break;
    case 'choisir-repas': {
      const jour = cible.getAttribute('data-jour');
      const r = D.repas.get(jour);
      ouvrirFeuille(libelleJour(jour).replace(/^./, function (c) { return c.toUpperCase(); }), { type: 'repas', jour: jour, parts: r && r.parts, recherche: '' });
      break;
    }
    case 'repas-moins':
    case 'repas-plus':
      if (f) {
        const r = D.repas.get(f.jour);
        const rec = r && r.recetteId ? D.recettes.get(r.recetteId) : null;
        f.parts = Math.max(1, Math.min(20, (f.parts || (r && r.parts) || (rec && rec.parts) || 4) + (action === 'repas-plus' ? 1 : -1)));
        if (r && r.recetteId) { ecrire([{ t: 'maj', c: 'repas', id: f.jour, d: { parts: f.parts, ajoute: null } }]); }
        rendreFeuille();
      }
      break;
    case 'choisir-recette-repas': {
      const rec = D.recettes.get(id);
      if (f && rec) {
        ecrire([{ t: 'set', c: 'repas', id: f.jour, d: { recetteId: id, titre: rec.titre, parts: f.parts || rec.parts || 4, par: D.moi.uid } }]);
        fermerFeuille();
      }
      break;
    }
    case 'repas-libre':
      if (f) {
        ecrire([{ t: 'set', c: 'repas', id: f.jour, d: { recetteId: null, titre: cible.getAttribute('data-titre'), par: D.moi.uid } }]);
        fermerFeuille();
      }
      break;
    case 'retirer-repas':
      if (f) { ecrire([{ t: 'suppr', c: 'repas', id: f.jour }]); fermerFeuille(); }
      break;
    case 'generer':
      genererListe();
      break;
    case 'proposer':
      proposerRepas();
      break;
    case 'nouvelle-recette':
      ouvrirFeuille('Nouvelle recette', { type: 'edition', id: null });
      break;
    case 'lire-recette':
      lireRecetteCollee();
      break;
    case 'ouvrir-recette': {
      const r = D.recettes.get(id);
      if (r) { ouvrirFeuille(r.titre, { type: 'recette', id: id, parts: null, vivante: true }); }
      break;
    }
    case 'parts-moins':
    case 'parts-plus':
      if (f && f.type === 'recette') {
        const r = D.recettes.get(f.id);
        f.parts = Math.max(1, Math.min(30, (f.parts || (r && r.parts) || 4) + (action === 'parts-plus' ? 1 : -1)));
        rendreFeuille();
      }
      break;
    case 'recette-vers-liste': {
      const r = f && D.recettes.get(f.id);
      if (r) {
        const facteur = (f.parts || r.parts || 4) / (r.parts || 4);
        const ignores = [];
        const entrees = (r.ingredients || []).filter(function (i) {
          if (C.estAuPlacard(i.nom, D.foyer.placard)) { ignores.push(i.nom); return false; }
          return true;
        }).map(function (i) { return { nom: i.nom, quantite: C.mettreALechelle(i.quantite, facteur), unite: i.unite }; });
        const res = ajouterArticles(entrees, r.titre);
        fermerFeuille();
        montrerToast((res.ajoutes + res.fusionnes) + ' articles dans la liste' + (ignores.length ? ', ' + ignores.length + ' déjà à la maison' : '') + '.');
      }
      break;
    }
    case 'planifier-recette': {
      const r = f && D.recettes.get(f.id);
      const jour = cible.getAttribute('data-jour');
      if (r) {
        ecrire([{ t: 'set', c: 'repas', id: jour, d: { recetteId: f.id, titre: r.titre, parts: f.parts || r.parts || 4, par: D.moi.uid } }]);
        montrerToast(r.titre + ' prévu ' + libelleJour(jour) + '.');
      }
      break;
    }
    case 'modifier-recette': {
      const r = f && D.recettes.get(f.id);
      if (r) { ouvrirFeuille('Modifier la recette', { type: 'edition', id: f.id }); }
      break;
    }
    case 'supprimer-recette': {
      if (!f) { break; }
      if (!f.confirmer) { f.confirmer = true; rendreFeuille(); break; }
      const r = D.recettes.get(f.id);
      const sauvegarde = Object.assign({}, r);
      const rid = f.id;
      ecrire([{ t: 'suppr', c: 'recettes', id: rid }]);
      fermerFeuille();
      montrerToast('Recette supprimée.', function () { ecrire([{ t: 'set', c: 'recettes', id: rid, d: sauvegarde }]); });
      break;
    }
    case 'personnes-moins': modifierPersonnes(-1); break;
    case 'personnes-plus': modifierPersonnes(1); break;
    case 'placard-retirer': {
      const i = parseInt(cible.getAttribute('data-i'), 10);
      const p = (D.foyer.placard || []).slice();
      p.splice(i, 1);
      ecrire([{ t: 'maj', c: 'foyer', d: { placard: p } }]);
      break;
    }
    case 'rayon-haut': deplacerRayon(parseInt(cible.getAttribute('data-i'), 10), -1); break;
    case 'rayon-bas': deplacerRayon(parseInt(cible.getAttribute('data-i'), 10), 1); break;
    case 'guide': UI.guide = cible.getAttribute('data-cat'); planifierRendu(); break;
    case 'inviter': partagerInvitation(); break;
    case 'renommer': ouvrirFeuille('Ton prénom', { type: 'nom' }); break;
    case 'reessayer': location.reload(); break;
    default: break;
  }
});

document.addEventListener('submit', async function (ev) {
  const form = ev.target;
  ev.preventDefault();

  if (form.id === 'form-ajout') {
    const champ = $('saisie');
    const lignes = C.lireLigne(champ.value);
    if (lignes.length) { ajouterArticles(lignes, ''); }
    champ.value = '';
    UI.saisie = '';
    rendreSuggestions();
    champ.focus();
    return;
  }

  const type = form.getAttribute('data-form');

  if (type === 'placard') {
    const champ = $('placard-saisie');
    const v = champ.value.trim();
    if (v) {
      const p = (D.foyer.placard || []).slice();
      if (!p.some(function (x) { return C.cleProduit(x) === C.cleProduit(v); })) { p.push(v.charAt(0).toUpperCase() + v.slice(1)); }
      ecrire([{ t: 'maj', c: 'foyer', d: { placard: p } }]);
    }
    champ.value = '';
    return;
  }

  if (type === 'article' && UI.feuille) {
    const id = UI.feuille.id;
    const a = D.articles.get(id);
    if (!a) { fermerFeuille(); return; }
    const nom = $('art-nom').value.trim() || a.nom;
    const texteQte = $('art-qte').value.trim();
    let quantite = null;
    let unite = '';
    if (texteQte) {
      const lu = C.lireLigne(texteQte + ' x')[0];
      if (lu && lu.quantite != null) { quantite = lu.quantite; unite = lu.unite; }
    }
    const rayon = $('art-rayon').value;
    const ops = [{ t: 'maj', c: 'articles', id: id, d: { nom: nom, quantite: quantite, unite: unite, reste: '', rayon: rayon, note: $('art-note').value.trim() } }];
    if (rayon !== a.rayon) {
      ops.push({ t: 'maj', c: 'historique', id: idHistorique(nom), d: { nom: nom, rayon: rayon } });
    }
    ecrire(ops);
    fermerFeuille();
    return;
  }

  if (type === 'recette') { enregistrerRecette(); return; }

  if (type === 'nom') {
    const nom = $('nom-saisie').value.trim();
    if (nom) {
      D.moi.nom = nom;
      ecrireLocal('prenom', nom);
      ecrire([{ t: 'maj', c: 'membres', id: D.moi.uid, d: { nom: nom } }]);
    }
    fermerFeuille();
    return;
  }

  if (type === 'creer' || type === 'rejoindre' || type === 'code') {
    const erreur = $('accueil-erreur');
    const bouton = form.querySelector('button[type="submit"]');
    let code = form.getAttribute('data-code');
    if (type === 'code') {
      code = extraireCode($('accueil-code').value);
      if (!code) { montrerToast('Ce lien ne ressemble pas à une invitation Le Panier.'); return; }
      afficherAccueil('rejoindre', code);
      return;
    }
    const nom = $('accueil-nom').value.trim();
    if (!nom) { $('accueil-nom').focus(); return; }
    ecrireLocal('prenom', nom);
    bouton.disabled = true;
    try {
      if (type === 'creer') { await S.creer(nom); } else { await S.rejoindre(code, nom); }
    } catch (e) {
      bouton.disabled = false;
      if (erreur) {
        erreur.hidden = false;
        erreur.textContent = type === 'creer'
          ? 'Impossible de créer le foyer pour l’instant. Vérifie la connexion et réessaie.'
          : 'Ce lien d’invitation ne fonctionne pas. Demande à l’autre personne de te le renvoyer.';
      }
    }
  }
});

document.addEventListener('input', function (ev) {
  const t = ev.target;
  if (t.id === 'saisie') { UI.saisie = t.value; rendreSuggestions(); }
  else if (t.id === 'recherche') { UI.recherche = t.value; rendreRecettes(); }
  else if (t.id === 'repas-recherche' && UI.feuille) { UI.feuille.recherche = t.value; rendreFeuille(); }
});

document.querySelectorAll('.onglet').forEach(function (b) {
  b.addEventListener('click', function () {
    const v = b.getAttribute('data-vue');
    if (v === UI.vue) {
      const defile = $('vue-' + v).querySelector('.defile');
      if (defile) { defile.scrollTo({ top: 0, behavior: 'smooth' }); }
    }
  });
});

$('voile').addEventListener('click', fermerFeuille);
$('feuille-fermer').addEventListener('click', fermerFeuille);
$('toast-action').addEventListener('click', function () {
  if (UI.annuler) { const f = UI.annuler; UI.annuler = null; f(); }
  $('toast').classList.remove('visible');
});

document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && UI.feuille) { fermerFeuille(); }
});

window.addEventListener('online', function () { D.enLigne = true; planifierRendu(); });
window.addEventListener('offline', function () { D.enLigne = false; planifierRendu(); });
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') {
    if (UI.magasin) { garderEcranAllume(true); }
    planifierRendu();
  }
});

// Démarrage

async function demarrer() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* hors ligne indisponible */ });
  }
  if (MODE_DEMO) {
    S = creerStockageLocal();
  } else {
    try { S = await creerStockageDistant(); } catch (e) {
      S = creerStockageLocal();
      montrerToast('La synchronisation n’a pas pu démarrer. Mode démo sur ce téléphone.');
    }
  }
  await S.demarrer();
}

demarrer();
