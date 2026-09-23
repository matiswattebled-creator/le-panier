// Logique pure : rayons, équivalences France vers Canada, lecture des lignes d'ingrédients, quantités.

export const RAYONS_DEFAUT = [
  'Fruits et légumes', 'Boulangerie', 'Boucherie', 'Poissonnerie', 'Crémerie',
  'Épicerie', 'Surgelés', 'Boissons', 'Animaux', 'Entretien et hygiène', 'Liquor Mart'
];

export const MAGASIN_SEPARE = 'Liquor Mart';

export const PLACARD_DEFAUT = ['Sel', 'Poivre', 'Huile d’olive', 'Sucre', 'Farine', 'Vinaigre'];

export function normaliser(texte) {
  return String(texte || '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

// Clé stable pour reconnaître un même produit, au singulier.
export function cleProduit(nom) {
  return normaliser(nom).split(' ').filter(Boolean).map(function (m) {
    if (m.length > 3 && (m.endsWith('s') || m.endsWith('x'))) { return m.slice(0, -1); }
    return m;
  }).join(' ');
}

const MOTS = {
  'Fruits et légumes': ['courgette', 'tomate', 'tomate cerise', 'oignon', 'oignon vert', 'echalote', 'ail', 'salade', 'laitue', 'roquette', 'epinard', 'mache', 'citron', 'lime', 'pomme', 'pomme de terre', 'patate', 'patate douce', 'banane', 'carotte', 'poireau', 'champignon', 'poivron', 'piment', 'concombre', 'avocat', 'orange', 'clementine', 'mandarine', 'pamplemousse', 'fraise', 'framboise', 'bleuet', 'myrtille', 'raisin', 'poire', 'peche', 'nectarine', 'abricot', 'prune', 'cerise', 'mangue', 'ananas', 'kiwi', 'melon', 'pasteque', 'brocoli', 'chou', 'chou fleur', 'chou de bruxelles', 'celeri', 'celeri rave', 'navet', 'betterave', 'radis', 'courge', 'butternut', 'citrouille', 'aubergine', 'haricot vert', 'haricots verts', 'gingembre', 'persil', 'basilic', 'coriandre', 'menthe', 'ciboulette', 'aneth', 'thym', 'romarin', 'estragon', 'sauge', 'fenouil', 'asperge', 'artichaut', 'endive', 'cresson', 'legume', 'fruit', 'panais', 'mais en epi', 'pousse', 'germe'],
  'Boulangerie': ['pain', 'baguette', 'croissant', 'brioche', 'bagel', 'tortilla', 'pita', 'muffin', 'pain de mie', 'naan', 'wrap', 'pain a burger', 'pain hamburger', 'pain a hot dog', 'viennoiserie', 'focaccia'],
  'Boucherie': ['poulet', 'blanc de poulet', 'cuisse', 'pilon', 'dinde', 'boeuf', 'steak', 'steak hache', 'viande hachee', 'hache', 'porc', 'cotelette', 'filet mignon', 'echine', 'roti', 'veau', 'agneau', 'gigot', 'lardon', 'bacon', 'pancetta', 'jambon', 'jambon blanc', 'saucisse', 'merguez', 'chorizo', 'saucisson', 'salami', 'prosciutto', 'canard', 'magret', 'bavette', 'onglet', 'faux filet', 'entrecote', 'bourguignon', 'caille', 'lapin', 'viande', 'bouillon de boeuf frais', 'charcuterie'],
  'Poissonnerie': ['saumon', 'thon', 'poisson', 'crevette', 'cabillaud', 'morue', 'truite', 'moule', 'huitre', 'sole', 'colin', 'tilapia', 'fletan', 'petoncle', 'homard', 'crabe', 'calmar', 'fruits de mer', 'dore'],
  'Crémerie': ['lait', 'beurre', 'creme', 'creme fraiche', 'creme sure', 'sour cream', 'whipping cream', 'creme a cuisson', 'creme liquide', 'fromage', 'fromage rape', 'fromage blanc', 'yaourt', 'yogourt', 'yoghourt', 'oeuf', 'parmesan', 'mozzarella', 'cheddar', 'gruyere', 'emmental', 'ricotta', 'feta', 'chevre', 'mascarpone', 'brie', 'camembert', 'comte', 'raclette', 'reblochon', 'quark', 'petit suisse', 'kefir', 'halloumi', 'burrata', 'pate a pizza', 'tofu', 'houmous', 'hummus'],
  'Épicerie': ['lait de coco', 'creme de coco', 'tomate pelee', 'tomates pelees', 'tomate concassee', 'concentre de tomate', 'coulis de tomate', 'sauce tomate', 'passata', 'jus de citron', 'creme de marron', 'beurre de cacahuete', 'beurre d arachide', 'pate a tartiner', 'pate', 'pates', 'spaghetti', 'penne', 'fusilli', 'tagliatelle', 'linguine', 'lasagne', 'macaroni', 'nouille', 'vermicelle', 'gnocchi', 'riz', 'farine', 'sucre', 'sucre glace', 'sucre vanille', 'cassonade', 'sel', 'poivre', 'huile', 'huile d olive', 'vinaigre', 'vinaigre balsamique', 'bouillon', 'cube', 'conserve', 'haricot', 'haricot rouge', 'haricot blanc', 'lentille', 'pois chiche', 'moutarde', 'ketchup', 'mayonnaise', 'miel', 'confiture', 'chocolat', 'cacao', 'cereale', 'avoine', 'flocon', 'biscuit', 'craquelin', 'noix', 'amande', 'noisette', 'pistache', 'cajou', 'arachide', 'graine', 'epice', 'curry', 'paprika', 'cumin', 'cannelle', 'muscade', 'curcuma', 'garam masala', 'herbes de provence', 'origan', 'laurier', 'piment d espelette', 'levure', 'levure chimique', 'bicarbonate', 'maizena', 'fecule', 'semoule', 'quinoa', 'couscous', 'boulgour', 'sauce soja', 'sauce', 'olive', 'cornichon', 'capre', 'sirop', 'sirop d erable', 'the', 'cafe', 'tisane', 'chapelure', 'vanille', 'extrait de vanille', 'thon en boite', 'thon en conserve', 'sardine', 'mais en conserve', 'raisin sec', 'chips', 'croustille', 'popcorn', 'gelatine', 'agar'],
  'Surgelés': ['surgele', 'glace', 'creme glacee', 'frites', 'pizza surgelee', 'legumes surgeles', 'poisson pane', 'edamame', 'pate brisee', 'pate feuilletee', 'pate sablee', 'fond de tarte', 'petits pois'],
  'Boissons': ['eau', 'eau petillante', 'eau gazeuse', 'jus', 'jus d orange', 'jus de pomme', 'soda', 'limonade', 'perrier', 'coca', 'kombucha', 'boisson', 'lait d avoine', 'lait d amande', 'boisson vegetale'],
  'Animaux': ['croquette', 'litiere', 'patee', 'friandise pour chien', 'friandise pour chat', 'nourriture pour chien', 'nourriture pour chat', 'os a macher'],
  'Entretien et hygiène': ['lessive', 'savon', 'papier toilette', 'essuie tout', 'sopalin', 'eponge', 'sac poubelle', 'sacs poubelle', 'liquide vaisselle', 'pastille lave vaisselle', 'tablette lave vaisselle', 'nettoyant', 'javel', 'dentifrice', 'brosse a dent', 'shampoing', 'shampooing', 'apres shampoing', 'gel douche', 'deodorant', 'mouchoir', 'coton', 'rasoir', 'papier aluminium', 'papier alu', 'film alimentaire', 'papier cuisson', 'papier sulfurise', 'sac congelation', 'adoucissant'],
  'Liquor Mart': ['vin', 'vin blanc', 'vin rouge', 'vin rose', 'biere', 'cidre', 'champagne', 'prosecco', 'cremant', 'rhum', 'whisky', 'vodka', 'gin', 'porto', 'cognac', 'calvados', 'pastis', 'liqueur', 'vermouth', 'tequila', 'sake']
};

const ENTREES_RAYON = [];
Object.keys(MOTS).forEach(function (rayon) {
  MOTS[rayon].forEach(function (mot) { ENTREES_RAYON.push({ k: normaliser(mot), rayon: rayon }); });
});

function trouve(t, k, motEntier) {
  let depart = t.indexOf(' ' + k);
  while (depart !== -1) {
    if (!motEntier) { return true; }
    const apres = t.slice(depart + 1 + k.length);
    if (/^(s|x)? /.test(apres)) { return true; }
    depart = t.indexOf(' ' + k, depart + 1);
  }
  return false;
}

function meilleurMot(texteNorm, entrees, motEntier) {
  const t = ' ' + texteNorm + ' ';
  let meilleur = null;
  for (let i = 0; i < entrees.length; i++) {
    const e = entrees[i];
    if (trouve(t, e.k, motEntier)) {
      if (!meilleur || e.k.length > meilleur.k.length) { meilleur = e; }
    }
  }
  return meilleur;
}

export function devinerRayon(nom, appris) {
  const cle = cleProduit(nom);
  if (appris && appris[cle]) { return appris[cle]; }
  const m = meilleurMot(normaliser(nom), ENTREES_RAYON);
  return m ? m.rayon : 'Épicerie';
}

export const EQUIVALENCES = [
  { cat: 'Crémerie', cles: ['creme fraiche', 'creme epaisse'], fr: 'Crème fraîche épaisse', ca: 'Sour cream 14 % à froid, whipping cream 35 % en cuisson', verdict: 'substitut', note: 'Rien d’identique ici. La sour cream tranche à feu vif, donc pour une sauce chaude prenez la whipping cream.' },
  { cat: 'Crémerie', cles: ['creme liquide', 'creme entiere', 'creme fleurette'], fr: 'Crème liquide entière 30 %', ca: 'Whipping cream 35 %', verdict: 'equivalent', note: 'Vendue en 473 ml et 1 L, entre 32 et 36 % de matière grasse.' },
  { cat: 'Crémerie', cles: ['creme legere', 'creme 15', 'creme allegee'], fr: 'Crème légère 15 %', ca: 'Table cream 18 % ou crème à cuisson 15 %', verdict: 'equivalent', note: 'La half-and-half descend à 10 %.' },
  { cat: 'Crémerie', cles: ['fromage blanc', 'faisselle'], fr: 'Fromage blanc', ca: 'Quark, ou yogourt grec égoutté', verdict: 'substitut', note: 'Le quark se trouve au rayon des yogourts nature.' },
  { cat: 'Crémerie', cles: ['petit suisse'], fr: 'Petits-suisses', ca: 'Introuvable', verdict: 'introuvable', note: 'Un yogourt grec nature fait l’affaire.' },
  { cat: 'Crémerie', cles: ['beurre demi sel', 'beurre sale'], fr: 'Beurre demi-sel', ca: 'Salted butter', verdict: 'substitut', note: 'Moins salé qu’en France. La brique standard fait 454 g.' },
  { cat: 'Crémerie', cles: ['gruyere'], fr: 'Gruyère râpé', ca: 'Swiss ou emmental râpé', verdict: 'substitut', note: 'Le vrai gruyère existe au comptoir fromage, à prix d’importation.' },
  { cat: 'Crémerie', cles: ['parmesan'], fr: 'Parmesan', ca: 'Parmigiano Reggiano au comptoir fromage', verdict: 'substitut', note: 'Le parmesan râpé en pot est souvent un fromage générique.' },
  { cat: 'Crémerie', cles: ['oeuf'], fr: 'Œufs par 6', ca: 'Vendus par 12', verdict: 'format', note: 'Le calibre Large correspond au calibre moyen français.', dansListe: false },
  { cat: 'Épicerie', cles: ['farine t55', 'farine t 55', 'farine de ble'], fr: 'Farine T55', ca: 'All-purpose flour', verdict: 'equivalent', note: '' },
  { cat: 'Épicerie', cles: ['farine t45', 'farine t 45'], fr: 'Farine T45', ca: 'Pastry flour', verdict: 'substitut', note: 'La all-purpose fait l’affaire pour la plupart des gâteaux.' },
  { cat: 'Épicerie', cles: ['farine t65', 'farine t 65'], fr: 'Farine T65', ca: 'Bread flour', verdict: 'equivalent', note: '' },
  { cat: 'Épicerie', cles: ['maizena'], fr: 'Maïzena', ca: 'Cornstarch', verdict: 'equivalent', note: '' },
  { cat: 'Épicerie', cles: ['sucre glace'], fr: 'Sucre glace', ca: 'Icing sugar', verdict: 'equivalent', note: '' },
  { cat: 'Épicerie', cles: ['cassonade', 'sucre roux'], fr: 'Cassonade', ca: 'Brown sugar', verdict: 'equivalent', note: 'Plus humide qu’en France.' },
  { cat: 'Épicerie', cles: ['sucre vanille'], fr: 'Sucre vanillé', ca: 'Extrait de vanille', verdict: 'introuvable', note: 'Le sachet n’existe pas. Une demi cuillère à thé d’extrait par sachet.' },
  { cat: 'Épicerie', cles: ['levure chimique'], fr: 'Levure chimique, sachet 11 g', ca: 'Baking powder, 2 c. à thé', verdict: 'equivalent', note: 'Vendu en pot, jamais en sachet.' },
  { cat: 'Épicerie', cles: ['levure boulangere', 'levure de boulanger'], fr: 'Levure de boulanger', ca: 'Instant yeast ou active dry yeast', verdict: 'equivalent', note: '' },
  { cat: 'Épicerie', cles: ['cornichon'], fr: 'Cornichons', ca: 'French cornichons', verdict: 'substitut', note: 'Les gherkins nord-américains sont sucrés.' },
  { cat: 'Épicerie', cles: ['creme de marron'], fr: 'Crème de marrons', ca: 'Épicerie fine seulement', verdict: 'introuvable', note: '' },
  { cat: 'Épicerie', cles: ['moutarde', 'moutarde de dijon'], fr: 'Moutarde de Dijon', ca: 'Maille ou Grey Poupon', verdict: 'equivalent', note: 'La moutarde jaune américaine n’a rien à voir.', dansListe: false },
  { cat: 'Surgelés', cles: ['pate brisee', 'pate sablee', 'fond de tarte'], fr: 'Pâte brisée', ca: 'Pie crust, souvent au rayon surgelés', verdict: 'substitut', note: 'Vendue en fonds déjà moulés. Plus sucrée que la pâte française.' },
  { cat: 'Surgelés', cles: ['pate feuilletee'], fr: 'Pâte feuilletée', ca: 'Puff pastry, au rayon surgelés', verdict: 'equivalent', note: 'À décongeler au frigo la veille.' },
  { cat: 'Boucherie', cles: ['lardon'], fr: 'Lardons', ca: 'Bacon en dés ou pancetta', verdict: 'substitut', note: 'Le bacon d’ici est plus sucré, souvent à l’érable.' },
  { cat: 'Boucherie', cles: ['echine'], fr: 'Échine de porc', ca: 'Pork shoulder, ou pork butt', verdict: 'equivalent', note: '' },
  { cat: 'Boucherie', cles: ['bavette'], fr: 'Bavette', ca: 'Flank steak', verdict: 'equivalent', note: '' },
  { cat: 'Boucherie', cles: ['onglet'], fr: 'Onglet', ca: 'Hanger steak, au comptoir', verdict: 'substitut', note: 'Presque jamais en libre service.' },
  { cat: 'Boucherie', cles: ['faux filet'], fr: 'Faux-filet', ca: 'Striploin', verdict: 'equivalent', note: '' },
  { cat: 'Boucherie', cles: ['entrecote'], fr: 'Entrecôte', ca: 'Rib steak ou ribeye', verdict: 'equivalent', note: '' },
  { cat: 'Boucherie', cles: ['jambon blanc'], fr: 'Jambon blanc', ca: 'Black Forest ham, au comptoir deli', verdict: 'substitut', note: '' },
  { cat: 'Ailleurs', cles: ['vin', 'biere', 'cidre', 'champagne', 'prosecco', 'cremant', 'rhum', 'whisky', 'vodka', 'gin', 'porto', 'cognac', 'calvados', 'pastis', 'liqueur', 'vermouth'], fr: 'Vin, bière, alcools', ca: 'Liquor Mart', verdict: 'ailleurs', note: 'Aucun alcool en épicerie au Manitoba : Liquor Marts, beer vendors d’hôtel, ou magasins de vin spécialisés.' }
];

const ENTREES_EQUIV = [];
EQUIVALENCES.forEach(function (e, i) {
  e.cles.forEach(function (c) { ENTREES_EQUIV.push({ k: normaliser(c), i: i }); });
});

export function trouverEquivalence(nom) {
  const m = meilleurMot(normaliser(nom), ENTREES_EQUIV, true);
  if (!m) { return null; }
  const e = EQUIVALENCES[m.i];
  return e;
}

// Quantités

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };
const MOTS_NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, demi: 0.5, demie: 0.5, quelques: 3 };

const UNITES = [
  ['kg', ['kg', 'kgs', 'kilo', 'kilos', 'kilogramme', 'kilogrammes']],
  ['g', ['g', 'gr', 'grs', 'gramme', 'grammes']],
  ['mg', ['mg']],
  ['l', ['l', 'litre', 'litres', 'lt']],
  ['dl', ['dl']],
  ['cl', ['cl']],
  ['ml', ['ml']],
  ['c. à soupe', ['c a soupe', 'c a s', 'cas', 'cs', 'cuillere a soupe', 'cuilleres a soupe', 'cuil a soupe', 'cuilleree a soupe', 'cuillerees a soupe', 'c soupe', 'tbsp', 'cuillere soupe']],
  ['c. à thé', ['c a the', 'c a cafe', 'cac', 'cc', 'c a c', 'cuillere a cafe', 'cuilleres a cafe', 'cuillere a the', 'cuilleres a the', 'cuilleree a cafe', 'cuillerees a cafe', 'tsp', 'c cafe', 'c the']],
  ['tasse', ['tasse', 'tasses', 'cup', 'cups']],
  ['lb', ['lb', 'lbs', 'livre', 'livres']],
  ['oz', ['oz', 'once', 'onces']],
  ['pincée', ['pincee', 'pincees']],
  ['sachet', ['sachet', 'sachets']],
  ['boîte', ['boite', 'boites', 'conserve', 'conserves', 'canne', 'cannes']],
  ['tranche', ['tranche', 'tranches']],
  ['gousse', ['gousse', 'gousses']],
  ['botte', ['botte', 'bottes', 'bouquet', 'bouquets']],
  ['brin', ['brin', 'brins']],
  ['feuille', ['feuille', 'feuilles']],
  ['bouteille', ['bouteille', 'bouteilles']],
  ['pot', ['pot', 'pots']],
  ['paquet', ['paquet', 'paquets']],
  ['poignée', ['poignee', 'poignees']],
  ['morceau', ['morceau', 'morceaux']],
  ['verre', ['verre', 'verres']],
  ['douzaine', ['douzaine', 'douzaines']]
];

const VARIANTES = {};
UNITES.forEach(function (u) { u[1].forEach(function (v) { VARIANTES[v] = u[0]; }); });

const MASSE = { mg: 0.001, g: 1, kg: 1000, lb: 453.6, oz: 28.35 };
const VOLUME = { ml: 1, cl: 10, dl: 100, l: 1000, 'c. à soupe': 15, 'c. à thé': 5, tasse: 250 };
const DENOMBRABLES = ['', 'tranche', 'gousse', 'boîte', 'sachet', 'bouteille', 'pot', 'paquet', 'botte', 'morceau', 'feuille', 'brin', 'douzaine'];

function lireNombre(jeton) {
  if (jeton == null) { return null; }
  const j = String(jeton).trim();
  if (/^\d+([.,]\d+)?$/.test(j)) { return parseFloat(j.replace(',', '.')); }
  if (/^\d+\/\d+$/.test(j)) { const p = j.split('/'); return parseInt(p[0], 10) / parseInt(p[1], 10); }
  if (FRACTIONS[j] != null) { return FRACTIONS[j]; }
  const n = normaliser(j);
  if (MOTS_NOMBRES[n] != null) { return MOTS_NOMBRES[n]; }
  return null;
}

function capitaliser(t) {
  const s = String(t || '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Lit une ligne comme « 150 g de riz arborio » et rend une liste d'ingrédients.
export function lireLigne(ligne) {
  let brut = String(ligne || '').replace(/ /g, ' ').trim();
  brut = brut.replace(/^[\s\-•*·•◦▪>]+/, '').replace(/^\d+[.)]\s+(?=\D)/, '').trim();
  if (!brut) { return []; }

  let note = '';
  brut = brut.replace(/\(([^)]*)\)/g, function (_, contenu) { note = note ? note + ', ' + contenu.trim() : contenu.trim(); return ' '; });

  Object.keys(FRACTIONS).forEach(function (f) { brut = brut.split(f).join(' ' + f + ' '); });
  brut = brut.replace(/(\d)\s*[-–]\s*(\d)/g, '$1 à $2');
  brut = brut.replace(/(\d)([a-zA-Zàâçéèêëîïôûùüÿ])/g, '$1 $2');
  brut = brut.replace(/\s+/g, ' ').trim();

  // Quantité placée à la fin : « Lait de coco 40 cl »
  if (!/^\S*\d/.test(brut) && lireNombre(brut.split(' ')[0]) == null) {
    const fin = brut.match(/^(.*\D)[\s,:]+(\d+(?:[.,]\d+)?)\s*([a-zA-Zàé.\s]{0,18})$/);
    if (fin && (!fin[3].trim() || VARIANTES[normaliser(fin[3])])) {
      brut = fin[2] + ' ' + (fin[3].trim() ? fin[3].trim() + ' de ' : '') + fin[1].trim();
    }
  }

  const jetons = [];
  brut.split(' ').forEach(function (j) {
    const m = j.match(/^([dDlL])['’](.+)$/);
    if (m) { jetons.push(m[1] + '’'); jetons.push(m[2]); } else { jetons.push(j); }
  });
  const normes = jetons.map(function (j) { return normaliser(j); });

  let i = 0;
  let quantite = null;

  while (i < jetons.length) {
    const n = lireNombre(jetons[i]);
    if (n == null) { break; }
    if ((normes[i] === 'quelques') && quantite != null) { break; }
    quantite = (quantite || 0) + n;
    i++;
    if ((normes[i] === 'a' || normes[i] === 'ou') && lireNombre(jetons[i + 1]) != null) {
      quantite = Math.max(quantite, lireNombre(jetons[i + 1]));
      i += 2;
    }
  }

  let unite = '';
  for (let taille = 4; taille >= 1; taille--) {
    const morceau = normes.slice(i, i + taille).filter(Boolean).join(' ');
    if (taille > 1 && normes.slice(i, i + taille).length < taille) { continue; }
    if (morceau && VARIANTES[morceau]) {
      const suivant = normes[i + taille];
      const estUnite = quantite != null || ['de', 'd', 'du', 'des'].indexOf(suivant) !== -1;
      if (estUnite) {
        unite = VARIANTES[morceau];
        i += taille;
        if (quantite == null) { quantite = 1; }
      }
      break;
    }
  }

  if (['de', 'd', 'du', 'des'].indexOf(normes[i]) !== -1 && i < jetons.length - 1) { i++; }

  let nom = jetons.slice(i).join(' ').replace(/([dDlL]’) /g, '$1').replace(/^[,;:.\s]+|[,;:.\s]+$/g, '').trim();
  nom = nom.replace(/\s+,/g, ',');

  if (!nom) { return []; }

  if (quantite == null) {
    const morceaux = nom.split(/\s*,\s*|\s+et\s+/i).map(function (p) { return p.trim(); }).filter(Boolean);
    const courts = morceaux.every(function (p) { return p.split(' ').length <= 3; });
    if (morceaux.length > 1 && courts) {
      return morceaux.map(function (p) {
        return { nom: capitaliser(p), quantite: null, unite: '', note: note };
      });
    }
  }

  return [{ nom: capitaliser(nom), quantite: quantite, unite: unite, note: note }];
}

export function lireLignes(texte) {
  const resultat = [];
  String(texte || '').split(/\r?\n/).forEach(function (l) {
    lireLigne(l).forEach(function (x) { resultat.push(x); });
  });
  return resultat;
}

function arrondir(n, pas) { return Math.round(n / pas) * pas; }

function nombreFr(n, fractions) {
  if (fractions) {
    const entier = Math.floor(n + 1e-9);
    const reste = n - entier;
    const table = [[0.5, '½'], [0.25, '¼'], [0.75, '¾'], [1 / 3, '⅓'], [2 / 3, '⅔']];
    for (let k = 0; k < table.length; k++) {
      if (Math.abs(reste - table[k][0]) < 0.02) { return entier ? entier + ' ' + table[k][1] : table[k][1]; }
    }
  }
  const v = Math.round(n * 100) / 100;
  return String(v).replace('.', ',');
}

function pluriel(unite, n) {
  if (!unite || n <= 1) { return unite; }
  if (['g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'lb', 'oz', 'c. à soupe', 'c. à thé'].indexOf(unite) !== -1) { return unite; }
  if (unite === 'morceau') { return 'morceaux'; }
  return unite + 's';
}

export function formaterQuantite(quantite, unite) {
  if (quantite == null || isNaN(quantite)) { return ''; }
  let q = quantite;
  let u = unite || '';
  if (u === 'g' && q >= 1000) { q = q / 1000; u = 'kg'; }
  else if (u === 'ml' && q >= 1000) { q = q / 1000; u = 'l'; }
  else if (u === 'cl' && q >= 100) { q = q / 100; u = 'l'; }
  if (u === 'g') { q = q < 20 ? Math.round(q) : arrondir(q, 5); }
  if (u === 'ml') { q = q < 20 ? Math.round(q) : arrondir(q, 5); }
  const avecFractions = DENOMBRABLES.indexOf(u) !== -1 || ['c. à soupe', 'c. à thé', 'tasse', 'pincée', 'poignée', 'verre'].indexOf(u) !== -1;
  const texte = nombreFr(q, avecFractions);
  const affichage = u === 'l' ? 'L' : pluriel(u, q);
  return affichage ? texte + ' ' + affichage : texte;
}

// Additionne deux quantités si elles sont compatibles.
export function additionner(a, b) {
  if (a.quantite == null) { return { quantite: b.quantite, unite: b.unite, reste: '' }; }
  if (b.quantite == null) { return { quantite: a.quantite, unite: a.unite, reste: '' }; }
  if ((a.unite || '') === (b.unite || '')) { return { quantite: a.quantite + b.quantite, unite: a.unite || '', reste: '' }; }
  if (MASSE[a.unite] && MASSE[b.unite]) {
    return { quantite: a.quantite * MASSE[a.unite] + b.quantite * MASSE[b.unite], unite: 'g', reste: '' };
  }
  if (VOLUME[a.unite] && VOLUME[b.unite]) {
    return { quantite: a.quantite * VOLUME[a.unite] + b.quantite * VOLUME[b.unite], unite: 'ml', reste: '' };
  }
  return { quantite: a.quantite, unite: a.unite, reste: formaterQuantite(b.quantite, b.unite) };
}

// Pour les courses : on n'achète pas une demi-courgette.
export function arrondirPourCourses(quantite, unite) {
  if (quantite == null) { return null; }
  if (DENOMBRABLES.indexOf(unite || '') !== -1) { return Math.max(1, Math.ceil(quantite - 0.05)); }
  return quantite;
}

export function mettreALechelle(quantite, facteur) {
  if (quantite == null) { return null; }
  return quantite * facteur;
}

// Lit le texte complet d'une recette copiée d'un site ou d'une note.
export function lireRecette(texte) {
  const lignes = String(texte || '').replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); });
  const nonVides = lignes.filter(Boolean);
  const resultat = { titre: '', parts: null, temps: null, ingredients: [], etapes: [] };
  if (!nonVides.length) { return resultat; }

  const texteNorm = normaliser(nonVides.join(' '));
  const mParts = texteNorm.match(/(?:pour|portions?|parts?|personnes?|serves|rendement)\s*:?\s*(\d{1,2})/) || texteNorm.match(/(\d{1,2})\s*(?:personnes|portions|parts|pers)\b/);
  if (mParts) { resultat.parts = parseInt(mParts[1], 10); }

  let minutes = 0;
  const reTemps = /(\d+)\s*(h|heure|heures|min|mn|minutes?)\b\s*(\d+)?/g;
  let mt;
  const blocTemps = normaliser(nonVides.filter(function (l) { return /temps|pr[ée]paration|cuisson|total|min|heure/i.test(l) && l.length < 60; }).join(' '));
  while ((mt = reTemps.exec(blocTemps)) !== null) {
    const n = parseInt(mt[1], 10);
    if (mt[2].charAt(0) === 'h') { minutes += n * 60 + (mt[3] ? parseInt(mt[3], 10) : 0); } else { minutes += n; }
  }
  if (minutes > 0 && minutes < 24 * 60) { resultat.temps = minutes; }

  const estTitreIngr = function (l) { return /^(ingr[ée]dients?|ingredients?)\b\s*:?/i.test(l) && l.length < 40; };
  const estTitreEtapes = function (l) { return /^(pr[ée]paration|[ée]tapes?|instructions?|m[ée]thode|d[ée]roul[ée]|la recette|directions?|steps?)\b\s*:?/i.test(l) && l.length < 40; };
  const ressembleIngredient = function (l) {
    return /^[\-•*·•]?\s*(\d|½|¼|¾|une?\s|deux\s|trois\s|quatre\s|quelques\s|sel\b|poivre\b)/i.test(l) || (l.length < 45 && !/[.!?]$/.test(l));
  };

  let mode = 'avant';
  const ingredientsBruts = [];
  const etapesBrutes = [];
  const iIngr = lignes.findIndex(estTitreIngr);

  lignes.forEach(function (l, idx) {
    if (!l) { return; }
    if (estTitreIngr(l)) { mode = 'ingr'; return; }
    if (estTitreEtapes(l)) { mode = 'etapes'; return; }
    if (mode === 'avant') {
      if (!resultat.titre && l.length < 80 && !/^\d/.test(l)) { resultat.titre = l; return; }
      if (iIngr === -1 && ressembleIngredient(l) && !/temps|pour \d|portions?|personnes/i.test(l)) { ingredientsBruts.push(l); return; }
      if (iIngr === -1 && l.length >= 45) { etapesBrutes.push(l); }
      return;
    }
    if (mode === 'ingr') { ingredientsBruts.push(l); return; }
    etapesBrutes.push(l);
  });

  resultat.ingredients = [];
  ingredientsBruts.forEach(function (l) {
    if (/^(pour|temps|portions?|parts?)\b/i.test(l)) { return; }
    lireLigne(l).forEach(function (x) { resultat.ingredients.push(x); });
  });

  resultat.etapes = etapesBrutes
    .map(function (l) { return l.replace(/^(étape|etape|step)?\s*\d+\s*[.):\-]?\s*/i, '').trim(); })
    .filter(function (l) { return l.length > 3; });

  if (!resultat.titre) { resultat.titre = 'Nouvelle recette'; }
  return resultat;
}

export function ligneTexte(ing) {
  const q = formaterQuantite(ing.quantite, ing.unite);
  let nom = String(ing.nom || '');
  if (q && nom && !/^[A-Z]{2}/.test(nom)) { nom = nom.charAt(0).toLowerCase() + nom.slice(1); }
  let liaison = '';
  if (q && ing.unite) { liaison = /^[aeiouyhàâéèêëîïôûùœ]/i.test(nom) ? 'd\u2019' : 'de '; }
  return (q ? q + ' ' + liaison : '') + nom + (ing.note ? ' (' + ing.note + ')' : '');
}

// Un produit est-il dans le placard permanent ?
const MOTS_NEUTRES = ['noir', 'blanc', 'gris', 'moulu', 'fin', 'fine', 'gro', 'mer', 'moulin', 'poudre', 'grain', 'guerande', 'tout', 'usage', 'extra', 'vierge', 'neutre', 'table', 't55', 'ble', 'blanche', 'cristallise', 'vin', 'cidre', 'de', 'du', 'en', 'd', 'au', 'gout'];

export function estAuPlacard(nom, placard) {
  const n = cleProduit(nom);
  return (placard || []).some(function (p) {
    const k = cleProduit(p);
    if (!k) { return false; }
    if (n === k) { return true; }
    if (n.indexOf(k + ' ') !== 0) { return false; }
    return n.slice(k.length + 1).split(' ').every(function (m) { return MOTS_NEUTRES.indexOf(m) !== -1; });
  });
}
