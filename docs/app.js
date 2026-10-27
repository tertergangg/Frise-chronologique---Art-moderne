/* Frise de l’art moderne — affichage et fiches.
   Les données viennent de data.js (window.FRISE), produit par construire.py. */

const D = window.FRISE;
const par = (liste) => Object.fromEntries(liste.map((x) => [x.id, x]));
const MOUV = par(D.mouvements), ART = par(D.artistes), OEU = par(D.oeuvres), EVT = par(D.evenements);

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const an = (y, fin = false) => new Date(y, fin ? 11 : 0, fin ? 31 : 1);
const couleur = (idMouv) => (MOUV[idMouv] ? MOUV[idMouv].couleur : "#8A8F99");
const lien = (id, texte) => `<a href="#${esc(id)}" data-id="${esc(id)}">${esc(texte)}</a>`;

/* ---------- Construction de la frise ---------- */
const mouvementsTries = [...D.mouvements].sort((a, b) => a.debut - b.debut);
const groupes = new vis.DataSet([
  { id: "contexte", order: 0, content: etiquetteContexte() },
  ...mouvementsTries.map((m, i) => ({ id: m.id, order: i + 1, content: etiquetteMouvement(m) })),
]);

function etiquetteMouvement(m) {
  const el = document.createElement("div");
  el.className = "etiquette";
  el.style.setProperty("--c", m.couleur);
  el.innerHTML = `<span class="barre"></span><span><strong>${esc(m.nom)}</strong><small>${m.debut}–${m.fin}</small></span>`;
  return el;
}
function etiquetteContexte() {
  const el = document.createElement("div");
  el.className = "etiquette contexte";
  el.innerHTML = `<span><strong>Contexte</strong><small>expositions, manifestes</small></span>`;
  return el;
}

function elementsFrise() {
  const seulementMajeures = $("#majeures").checked;
  const items = [];
  for (const m of D.mouvements) {
    items.push({ id: "bande:" + m.id, group: m.id, type: "background",
      start: an(m.debut), end: an(m.fin, true), style: `background-color:${m.couleur}26` });
  }
  for (const o of D.oeuvres) {
    if (o.annee == null || !MOUV[o.mouvement]) continue;
    if (seulementMajeures && !o.majeure) continue;
    const artiste = ART[o.artiste] ? ART[o.artiste].nom : "";
    items.push({ id: o.id, group: o.mouvement, type: "point", start: an(o.annee),
      content: esc(o.titre), className: o.majeure && !seulementMajeures ? "majeure" : "",
      style: `--c:${couleur(o.mouvement)}`,
      title: `<strong>${esc(o.titre)}</strong><br>${esc(artiste)}, ${esc(o.dateAffichee || o.annee)}` });
  }
  for (const e of D.evenements) {
    if (e.annee == null) continue;
    items.push({ id: e.id, group: "contexte", type: "point", start: an(e.annee),
      content: esc(e.titre), className: "evenement",
      title: `<strong>${esc(e.titre)}</strong><br>${esc(e.date || e.annee)}, ${esc(e.lieu)}` });
  }
  return items;
}

const elements = new vis.DataSet(elementsFrise());
const petitEcran = window.matchMedia("(max-width: 720px)").matches;
const vueInitiale = petitEcran ? [an(1870), an(1915)] : [an(1868), an(1966)];
const frise = new vis.Timeline($("#frise"), elements, groupes, {
  stack: true,
  start: vueInitiale[0], end: vueInitiale[1],
  min: an(1840), max: an(1990, true),
  zoomMin: 1000 * 60 * 60 * 24 * 365 * 6,
  zoomMax: 1000 * 60 * 60 * 24 * 365 * 150,
  orientation: { axis: "top", item: "top" },
  showCurrentTime: false,
  verticalScroll: true,
  zoomKey: "ctrlKey",
  height: "100%",
  margin: { item: { horizontal: 6, vertical: 4 }, axis: 8 },
  groupHeightMode: "auto",
  format: { minorLabels: { year: "YYYY" }, majorLabels: { year: "" } },
  tooltip: { followMouse: false, overflowMethod: "cap" },
  selectable: true,
});

frise.on("click", (p) => {
  if (p.what === "group-label" && MOUV[p.group]) ouvrir(p.group);
  else if (p.item && !String(p.item).startsWith("bande:")) ouvrir(p.item);
});

/* ---------- Filtres ---------- */
const nav = $("#filtres");
for (const m of mouvementsTries) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "filtre"; b.setAttribute("aria-pressed", "true");
  b.style.setProperty("--c", m.couleur);
  b.innerHTML = `<span class="pastille"></span>${esc(m.nom)}`;
  b.addEventListener("click", () => {
    const visible = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(visible));
    groupes.update({ id: m.id, visible });
  });
  nav.appendChild(b);
}
$("#majeures").addEventListener("change", () => { elements.clear(); elements.add(elementsFrise()); });

$("#zoom-plus").addEventListener("click", () => frise.zoomIn(0.4));
$("#zoom-moins").addEventListener("click", () => frise.zoomOut(0.4));
$("#tout-voir").addEventListener("click", () => frise.setWindow(an(1868), an(1966)));

/* ---------- Recherche ---------- */
const sansAccent = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const index = [
  ...D.mouvements.map((m) => ({ id: m.id, texte: m.nom, detail: `Mouvement, ${m.debut}–${m.fin}` })),
  ...D.artistes.map((a) => ({ id: a.id, texte: a.nom, detail: `Artiste, ${a.naissance ?? "?"}–${a.deces ?? "?"}` })),
  ...D.oeuvres.map((o) => ({ id: o.id, texte: o.titre, detail: `${ART[o.artiste]?.nom ?? ""}, ${o.annee ?? ""}` })),
  ...D.evenements.map((e) => ({ id: e.id, texte: e.titre, detail: `Événement, ${e.annee}` })),
];
const champ = $("#champ-recherche"), resultats = $("#resultats");
let choix = 0, trouves = [];
champ.addEventListener("input", () => {
  const q = sansAccent(champ.value.trim());
  trouves = q.length < 2 ? [] : index.filter((x) => sansAccent(x.texte).includes(q)).slice(0, 12);
  choix = 0; afficherResultats();
});
champ.addEventListener("keydown", (e) => {
  if (!trouves.length) return;
  if (e.key === "ArrowDown") { choix = (choix + 1) % trouves.length; afficherResultats(); e.preventDefault(); }
  if (e.key === "ArrowUp") { choix = (choix - 1 + trouves.length) % trouves.length; afficherResultats(); e.preventDefault(); }
  if (e.key === "Enter") { choisir(trouves[choix].id); e.preventDefault(); }
});
function afficherResultats() {
  resultats.hidden = !trouves.length && !champ.value.trim();
  resultats.innerHTML = trouves.length
    ? trouves.map((x, i) => `<li role="option" data-id="${esc(x.id)}" aria-selected="${i === choix}">${esc(x.texte)}<small>${esc(x.detail)}</small></li>`).join("")
    : champ.value.trim().length >= 2 ? `<li aria-disabled="true">Aucun résultat<small>Essaie un nom d’artiste ou un titre.</small></li>` : "";
}
resultats.addEventListener("click", (e) => { const li = e.target.closest("li[data-id]"); if (li) choisir(li.dataset.id); });
function choisir(id) { champ.value = ""; trouves = []; resultats.hidden = true; ouvrir(id, true); }
document.addEventListener("click", (e) => { if (!e.target.closest(".recherche")) resultats.hidden = true; });

/* ---------- Fiches ---------- */
const panneau = $("#panneau"), contenu = $("#contenu-panneau");

function markdown(md) {
  if (!md) return "";
  const avecLiens = md.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, texte) => {
    const cible = MOUV[id] || ART[id] || OEU[id] || EVT[id];
    return `[${texte || (cible ? cible.nom || cible.titre : id)}](#${id})`;
  });
  return `<div class="corps">${marked.parse(avecLiens)}</div>`;
}
const aVenir = (quoi) => `<p class="a-venir">La fiche ${quoi} est à venir.</p>`;
const listeOeuvres = (liste, avecArtiste = false) => liste.length ? `<ul class="liens">${liste
  .sort((a, b) => (a.annee ?? 0) - (b.annee ?? 0))
  .map((o) => `<li><span class="an">${o.annee ?? ""}</span><span>${lien(o.id, o.titre)}${avecArtiste && ART[o.artiste] ? `<br><small>${esc(ART[o.artiste].nom)}</small>` : ""}</span></li>`).join("")}</ul>` : "";

function ficheOeuvre(o) {
  const a = ART[o.artiste], m = MOUV[o.mouvement];
  const lieu = [o.musee, o.ville].filter(Boolean).join(", ");
  const image = o.image && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(o.image)
    ? `<img class="image" src="${esc(o.image)}" alt="${esc(o.titre)}">` : "";
  return `${image}<h2>${esc(o.titre)}</h2>
    <p class="sous-titre">${a ? lien(a.id, a.nom) : ""}${a ? ", " : ""}${esc(o.dateAffichee || o.annee)}</p>
    ${o.resume ? `<p class="resume">${esc(o.resume)}</p>` : ""}
    <dl>
      ${m ? `<dt>Mouvement</dt><dd>${lien(m.id, m.nom)}</dd>` : ""}
      ${o.type ? `<dt>Technique</dt><dd>${esc(o.type)}</dd>` : ""}
      ${lieu ? `<dt>Où la voir</dt><dd>${esc(lieu)}</dd>` : ""}
      ${o.image && !image ? `<dt>Image</dt><dd><a href="${esc(o.image)}" target="_blank" rel="noopener">Voir l’œuvre</a></dd>` : ""}
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
    return `<li><span>${verbe} ${lien(autre.id, autre.nom)}${i.explication ? `<br><small>${esc(i.explication)}</small>` : ""}</span></li>`;
  }).join("");
  return `<h2>${esc(a.nom)}</h2>
    <p class="sous-titre">${a.naissance ?? "?"}–${a.deces ?? "?"}${a.nationalite ? ", " + esc(a.nationalite) : ""}</p>
    ${a.phrase ? `<p class="resume">${esc(a.phrase)}</p>` : ""}
    <dl>
      ${a.role ? `<dt>Rôle</dt><dd>${esc(a.role)}</dd>` : ""}
      ${m ? `<dt>Mouvement</dt><dd>${lien(m.id, m.nom)}</dd>` : ""}
      ${a.autres ? `<dt>Aussi</dt><dd>${esc(a.autres)}</dd>` : ""}
    </dl>
    ${a.ficheVide ? aVenir("de cet artiste") : markdown(a.fiche)}
    ${oeuvres.length ? `<h3 class="liste-titre">Œuvres sur la frise</h3>${listeOeuvres(oeuvres)}` : ""}
    ${relations ? `<h3 class="liste-titre">Liens</h3><ul class="liens">${relations}</ul>` : ""}`;
}

function ficheMouvement(m) {
  const artistes = D.artistes.filter((a) => a.mouvement === m.id);
  const oeuvres = D.oeuvres.filter((o) => o.mouvement === m.id);
  const evts = D.evenements.filter((e) => e.mouvement === m.id);
  return `<h2>${esc(m.nom)}</h2>
    <p class="sous-titre">${m.debut}–${m.fin}${m.lieu ? ", " + esc(m.lieu) : ""}</p>
    ${m.resume ? `<p class="resume">${esc(m.resume)}</p>` : ""}
    ${m.ficheVide ? aVenir("de ce mouvement") : markdown(m.fiche)}
    ${artistes.length ? `<h3 class="liste-titre">Artistes</h3><ul class="liens">${artistes
      .map((a) => `<li><span class="an">${a.naissance ?? ""}</span><span>${lien(a.id, a.nom)}</span></li>`).join("")}</ul>` : ""}
    ${evts.length ? `<h3 class="liste-titre">Moments clés</h3><ul class="liens">${evts
      .map((e) => `<li><span class="an">${e.annee}</span><span>${lien(e.id, e.titre)}</span></li>`).join("")}</ul>` : ""}
    ${oeuvres.length ? `<h3 class="liste-titre">Œuvres</h3>${listeOeuvres(oeuvres, true)}` : ""}`;
}

function ficheEvenement(e) {
  const m = MOUV[e.mouvement];
  return `<h2>${esc(e.titre)}</h2>
    <p class="sous-titre">${esc(e.date || e.annee)}${e.lieu ? ", " + esc(e.lieu) : ""}</p>
    ${e.description ? `<p class="resume">${esc(e.description)}</p>` : `<p class="a-venir">La description de cet événement est à venir.</p>`}
    ${m ? `<dl><dt>Mouvement</dt><dd>${lien(m.id, m.nom)}</dd></dl>` : ""}`;
}

function ouvrir(id, centrer = false) {
  let html = "", c = "#8A8F99";
  if (OEU[id]) { html = ficheOeuvre(OEU[id]); c = couleur(OEU[id].mouvement); }
  else if (ART[id]) { html = ficheArtiste(ART[id]); c = couleur(ART[id].mouvement); }
  else if (MOUV[id]) { html = ficheMouvement(MOUV[id]); c = MOUV[id].couleur; }
  else if (EVT[id]) { html = ficheEvenement(EVT[id]); c = couleur(EVT[id].mouvement); }
  else return;
  contenu.innerHTML = `<article class="fiche" style="--c:${c}"><div class="fiche-filet"></div>${html}</article>`;
  panneau.hidden = false;
  panneau.scrollTop = 0;
  if (elements.get(id)) {
    frise.setSelection(id);
    if (centrer) frise.focus(id, { animation: { duration: 400 }, zoom: false });
  } else frise.setSelection([]);
  try { history.replaceState(null, "", "#" + id); } catch (e) { /* aperçu sans historique */ }
}
function fermer() {
  panneau.hidden = true; frise.setSelection([]);
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* idem */ }
}
$("#fermer").addEventListener("click", fermer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panneau.hidden) fermer(); });
contenu.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-id], a[href^='#']");
  if (!a) return;
  e.preventDefault();
  ouvrir(a.dataset.id || a.getAttribute("href").slice(1), true);
});

const depart = decodeURIComponent(location.hash.slice(1));
if (depart) ouvrir(depart, true);
