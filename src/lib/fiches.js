/* =====================================================================
   Contenu des fiches
   Fabrique le HTML d’une fiche d’œuvre, d’artiste, de mouvement ou d’événement, pour le panneau de la frise,
   et l’encart d’une œuvre encore protégée par le droit d’auteur (D10).
   Fournit aussi aux pages ce qu’elles partagent avec le panneau : le texte des fiches (markdown),
   les liens (lien) et l’adresse de chaque élément (aUnePage, adresse).
   Rien ici ne touche à la page : ces fonctions renvoient du texte HTML, et c’est l’appelant qui l’affiche.
   ===================================================================== */

// marked convertit le Markdown des fiches en HTML. Installé par npm (version exacte dans package.json),
// il est intégré au script publié, comme les données.
import { marked } from "marked";
import { D, MOUV, ART, OEU, EVT, GRP } from "./donnees.js";
import { esc, nomCourt, estImage, sansAccent } from "./outils.js";

// Un élément a-t-il sa propre page ? C’est la seule fonction qui en décide (D13, D21).
// Un mouvement ou un artiste en a une dès que sa fiche est rédigée ; une œuvre, dès qu’elle est documentée
// (son niveau, calculé par construire.py, n’est plus « referencee »).
// Les groupes, les événements, les termes, les parcours et les comparaisons n’en ont pas.
function aUnePage(id) {
  if (OEU[id]) return OEU[id].niveau !== "referencee";
  const element = MOUV[id] || ART[id];
  return Boolean(element && !element.ficheVide);
}

// Adresse d’un élément, vue depuis une page du site (ARCHITECTURE, partie B, « Liens »).
// Sans page, l’élément s’ouvre dans la frise (/#id), comme le prévoit D13.
function adresse(id) {
  if (MOUV[id] && aUnePage(id)) return `/mouvements/${id}/`;
  if (ART[id] && aUnePage(id)) return `/artistes/${id}/`;
  if (OEU[id] && aUnePage(id)) return `/oeuvres/${id}/`;
  // Un groupe est une section de la page de son mouvement (D22).
  // Si ce mouvement n’a pas encore de page, on ouvre sa fiche dans la frise.
  const groupe = GRP[id];
  if (groupe) return aUnePage(groupe.mouvement) ? `/mouvements/${groupe.mouvement}/#${id}` : `/#${groupe.mouvement}`;
  return `/#${id}`;
}

// Lien vers un élément. Dans le panneau de la frise (par défaut), « #id » ouvre la fiche sur place, grâce à data-id ;
// sur une page (surPage), le lien mène à l’adresse de l’élément.
function lien(id, texte, surPage = false) {
  if (surPage) return `<a href="${esc(adresse(id))}">${esc(texte)}</a>`;
  return `<a href="#${esc(id)}" data-id="${esc(id)}">${esc(texte)}</a>`;
}

// Destination d’un lien dans le panneau de la frise : « #id » ouvre la fiche sur place.
// Un groupe n’a pas de fiche : il mène à la page de son mouvement (D22). Si ce mouvement n’a pas encore de page,
// il ouvre sa fiche dans le panneau ; adresse() donnerait « /#mouvement », un lien que le panneau n’intercepte pas
// et qui ne ferait rien, puisque seul le # de l’adresse changerait.
function destinationPanneau(id) {
  const groupe = GRP[id];
  if (!groupe) return `#${id}`;
  return aUnePage(groupe.mouvement) ? adresse(id) : `#${groupe.mouvement}`;
}

// Texte d’une fiche : les liens [[id]] et [[id|texte]] deviennent des liens Markdown, puis marked convertit le tout.
// Comme pour lien(), « surPage » fait viser l’adresse de l’élément au lieu de la destination du panneau.
// La même forme de lien est vérifiée par verifier_liens(), dans construire.py : les deux règles doivent rester identiques.
function markdown(md, surPage = false) {
  if (!md) return "";
  const avecLiens = md.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, texte) => {
    // Le texte du lien par défaut : le nom (mouvement, artiste, groupe) ou le titre (œuvre, événement)
    const cible = MOUV[id] || ART[id] || OEU[id] || EVT[id] || GRP[id];
    const destination = surPage ? adresse(id) : destinationPanneau(id);
    return `[${texte || (cible ? cible.nom || cible.titre : id)}](${destination})`;
  });
  return `<div class="corps">${marked.parse(avecLiens)}</div>`;
}

// Texte d’une fiche pour sa page : chaque titre ## reçoit un id, pour que le sommaire « Dans cette page » puisse y mener.
// « pris » : les ids déjà utilisés par la page (ses sections calculées, ses groupes), à ne pas réutiliser.
// Renvoie { html, titres } : titres est la liste des { id, texte } des titres ##, dans l’ordre du texte.
function textePage(md, pris = []) {
  if (!md) return { html: "", titres: [] };
  const titres = [];
  // Les titres ## du Markdown, dans l’ordre : chacun reçoit un id tiré de son texte, sans accents
  for (const [, ligne] of md.matchAll(/^## (.+)$/gm)) {
    const texte = ligne.replace(/[*_`]/g, "").trim();
    let id = sansAccent(texte).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    while (pris.includes(id) || titres.some((t) => t.id === id)) id += "-2";
    titres.push({ id, texte });
  }
  // marked écrit les titres ## en <h2>, dans le même ordre : on leur donne leur id un par un
  let rang = 0;
  const html = markdown(md, true)
    .replace(/<h2>/g, () => (titres[rang] ? `<h2 id="${titres[rang++].id}">` : "<h2>"));
  return { html, titres };
}

const aVenir = (quoi) => `<p class="a-venir">La fiche ${quoi} est à venir.</p>`;

// Lien « Lire la page » du panneau de la frise (D19), seulement si l’élément a sa page (D13).
// C’est un vrai lien vers l’adresse de la page, et non un « #id » : le panneau le laisse donc passer sans l’intercepter.
function lirePage(id) {
  if (!aUnePage(id)) return "";
  return `<a class="lire-page" href="${esc(adresse(id))}">Lire la page <span aria-hidden="true">↗</span></a>`;
}

// Liste d’œuvres triée par année ; avec « avecArtiste », le nom court de l’artiste s’affiche à droite de la ligne
function listeOeuvres(liste, avecArtiste = false) {
  if (!liste.length) return "";
  const lignes = [...liste]
    .sort((a, b) => (a.annee ?? 0) - (b.annee ?? 0))
    .map((o) => {
      const artiste = avecArtiste && ART[o.artiste]
        ? `<small class="artiste">${esc(nomCourt(ART[o.artiste].nom))}</small>` : "";
      return `<li><span class="an">${o.annee ?? ""}</span><span>${lien(o.id, o.titre)}</span>${artiste}</li>`;
    }).join("");
  return `<ul class="liens-liste${avecArtiste ? " avec-artiste" : ""}">${lignes}</ul>`;
}

// Encart d’une œuvre encore protégée par le droit d’auteur, à la place de son image (D10).
// La date d’entrée dans le domaine public n’est donnée que si construire.py l’a calculée : une protection forcée
// dans le tableur (une exception) n’en a pas. Le lien vers la page de l’œuvre n’apparaît que s’il est rempli.
function encartDroits(o) {
  const entree = o.entreeDomainePublic
    ? `<p class="entree-domaine">Elle entrera dans le domaine public le 1<sup>er</sup> janvier ${o.entreeDomainePublic}.</p>` : "";
  const voir = o.lienOeuvre
    ? `<a class="voir-oeuvre" href="${esc(o.lienOeuvre)}" target="_blank" rel="noopener">Voir l’œuvre sur le site du musée <span aria-hidden="true">↗</span></a>` : "";
  return `<div class="encart-droits">
      <p class="titre-encart">Œuvre protégée</p>
      <p>Cette œuvre est encore protégée par le droit d’auteur : nous ne pouvons pas la reproduire ici.</p>
      ${entree}${voir}
    </div>`;
}

// Le haut d’une fiche d’œuvre : son image et son crédit si elle est dans le domaine public, l’encart sinon.
// L’image est dans un bouton, pour s’ouvrir en grand aussi au clavier.
function visuelOeuvre(o) {
  if (!o.domainePublic) return encartDroits(o);
  if (!estImage(o.image)) return "";
  const credit = o.credit ? `<figcaption class="credit">${esc(o.credit)}</figcaption>` : "";
  return `<figure class="visuel">
      <button type="button" class="agrandir" data-agrandir aria-label="Agrandir l’image : ${esc(o.titre)}"><img class="image" src="${esc(o.image)}" alt="${esc(o.titre)}"></button>
      ${credit}
    </figure>`;
}

// Fiche d’une œuvre : l’image ou l’encart, le titre, l’artiste et la date, « Lire la page », le résumé, les rubriques, le texte
function ficheOeuvre(o) {
  const a = ART[o.artiste], m = MOUV[o.mouvement];
  const lieu = [o.musee, o.ville].filter(Boolean).join(", ");
  return `${visuelOeuvre(o)}<h2>${esc(o.titre)}</h2>
    <p class="sous-titre sous-titre-oeuvre">${a ? lien(a.id, a.nom) + ", " : ""}${esc(o.dateAffichee || o.annee)}</p>
    ${lirePage(o.id)}
    ${o.resume ? `<p class="resume">${esc(o.resume)}</p>` : ""}
    <dl>
      ${m ? `<dt>Mouvement</dt><dd>${lien(m.id, m.nom)}</dd>` : ""}
      ${o.type ? `<dt>Technique</dt><dd>${esc(o.type)}</dd>` : ""}
      ${lieu ? `<dt>Où la voir</dt><dd>${esc(lieu)}</dd>` : ""}
    </dl>
    ${o.ficheVide ? aVenir("de cette œuvre") : markdown(o.fiche)}`;
}

function ficheArtiste(a) {
  const m = MOUV[a.mouvement];
  const oeuvres = D.oeuvres.filter((o) => o.artiste === a.id);
  const relations = D.influences.filter((i) => i.de === a.id || i.vers === a.id).map((i) => {
    const autre = ART[i.de === a.id ? i.vers : i.de];
    if (!autre) return "";
    const verbe = i.type === "influence" ? (i.de === a.id ? "A influencé" : "Influencé par")
      : i.type === "collaboration" ? "Collaboration avec" : i.type === "rivalité" ? "Rivalité avec" : "Lien avec";
    return `<li><span>${verbe} ${lien(autre.id, autre.nom)}${i.explication ? `<small>${esc(i.explication)}</small>` : ""}</span></li>`;
  }).join("");
  // Un mouvement connu devient un lien ; une valeur inconnue (signalée par construire.py) reste du texte
  const aussi = a.autres.map((x) => (MOUV[x] ? lien(x, MOUV[x].nom) : esc(x))).join(", ");
  return `<h2>${esc(a.nom)}</h2>
    <p class="sous-titre">${a.naissance ?? "?"}–${a.deces ?? "?"}</p>
        ${lirePage(a.id)}
    <dl>
      ${a.nationalite ? `<dt>Nationalité</dt><dd>${esc(a.nationalite)}</dd>` : ""}
      ${a.role ? `<dt>Disciplines</dt><dd>${esc(a.role)}</dd>` : ""}
      ${m ? `<dt>Mouvement</dt><dd>${lien(m.id, m.nom)}</dd>` : ""}
      ${aussi ? `<dt>Aussi</dt><dd>${aussi}</dd>` : ""}
    </dl>
    ${a.ficheVide ? aVenir("de cet artiste") : markdown(a.fiche)}
    ${oeuvres.length ? `<h3>Œuvres</h3>${listeOeuvres(oeuvres)}` : ""}
    ${relations ? `<h3>Liens</h3><ul class="liens-liste">${relations}</ul>` : ""}`;
}

// « avecExplorer » : afficher le bouton « Explorer ce mouvement en grand ».
// La frise le demande hors de la vue mouvement ; les pages n’en auront pas besoin.
function ficheMouvement(m, avecExplorer = false) {
  const artistes = D.artistes.filter((a) => a.mouvement === m.id);
  const oeuvres = D.oeuvres.filter((o) => o.mouvement === m.id);
  // Les œuvres majeures (colonne « Majeure (Bible) ») sont les seules à recevoir une analyse : elles passent en premier
  const majeures = oeuvres.filter((o) => o.majeure);
  const autresOeuvres = oeuvres.filter((o) => !o.majeure);
  const evts = D.evenements.filter((x) => x.mouvement === m.id);
  // « Lire la page » et « Explorer… » côte à côte, dans un bloc qui aligne leurs cadres ; pas de bloc si aucun ne s’affiche
  const boutons = lirePage(m.id)
    + (avecExplorer ? `<button type="button" class="explorer" data-explorer="${esc(m.id)}">Explorer ce mouvement en grand</button>` : "");
  return `<h2>${esc(m.nom)}</h2>
    <p class="sous-titre">${m.debut}–${m.fin}${m.lieu ? ", " + esc(m.lieu) : ""}</p>
    ${boutons ? `<div class="actions-fiche">${boutons}</div>` : ""}
    ${m.ficheVide ? aVenir("de ce mouvement") : markdown(m.fiche)}
    ${artistes.length ? `<h3>Artistes majeurs</h3><ul class="liens-liste">${artistes.map((a) => `<li><span class="an">${a.naissance ?? ""}</span><span>${lien(a.id, a.nom)}</span></li>`).join("")}</ul>` : ""}
    ${evts.length ? `<h3>Moments clés</h3><ul class="liens-liste">${evts.map((x) => `<li><span class="an">${x.annee}</span><span>${lien(x.id, x.titre)}</span></li>`).join("")}</ul>` : ""}
    ${majeures.length ? `<h3>Œuvres majeures</h3>${listeOeuvres(majeures, true)}` : ""}
    ${autresOeuvres.length ? `<h3>Autres œuvres</h3>${listeOeuvres(autresOeuvres, true)}` : ""}`;
}

function ficheEvenement(x) {
  const m = MOUV[x.mouvement];
  return `<h2>${esc(x.titre)}</h2>
    <p class="sous-titre">${esc(x.date || x.annee)}${x.lieu ? ", " + esc(x.lieu) : ""}</p>
    ${x.description ? `<p class="resume">${esc(x.description)}</p>` : `<p class="a-venir">La description de cet événement est à venir.</p>`}
    ${m ? `<dl><dt>Mouvement</dt><dd>${lien(m.id, m.nom)}</dd></dl>` : ""}`;
}

export { ficheOeuvre, ficheArtiste, ficheMouvement, ficheEvenement, encartDroits, aUnePage, adresse, lien, markdown, textePage };