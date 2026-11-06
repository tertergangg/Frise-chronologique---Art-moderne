/* =====================================================================
   Contenu des fiches
   Fabrique le HTML d’une fiche d’œuvre, d’artiste, de mouvement ou d’événement.
   Affiché aujourd’hui dans le panneau de la frise ; à partir de l’étape 2e, aussi sur les pages.
   Rien ici ne touche à la page : ces fonctions renvoient du texte HTML, et c’est l’appelant qui l’affiche.
   ===================================================================== */

// marked convertit le Markdown des fiches en HTML. Installé par npm (version exacte dans package.json),
// il est intégré au script publié, comme les données.
import { marked } from "marked";
import { D, MOUV, ART, OEU, EVT } from "./donnees.js";
import { esc, nomCourt, estImage } from "./outils.js";

// Lien vers la fiche d’un élément. Dans la frise, « #id » ouvre la fiche dans le panneau.
const lien = (id, texte) => `<a href="#${esc(id)}" data-id="${esc(id)}">${esc(texte)}</a>`;

// Texte d’une fiche : les liens [[id]] et [[id|texte]] deviennent des liens Markdown, puis marked convertit le tout.
// La même forme de lien est vérifiée par verifier_liens(), dans construire.py : les deux règles doivent rester identiques.
function markdown(md) {
  if (!md) return "";
  const avecLiens = md.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, texte) => {
    const cible = MOUV[id] || ART[id] || OEU[id] || EVT[id];
    return `[${texte || (cible ? cible.nom || cible.titre : id)}](#${id})`;
  });
  return `<div class="corps">${marked.parse(avecLiens)}</div>`;
}
const aVenir = (quoi) => `<p class="a-venir">La fiche ${quoi} est à venir.</p>`;

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

function ficheOeuvre(o) {
  const a = ART[o.artiste], m = MOUV[o.mouvement];
  const lieu = [o.musee, o.ville].filter(Boolean).join(", ");
  const image = estImage(o.image)
    ? `<button type="button" class="agrandir" data-agrandir aria-label="Agrandir l’image : ${esc(o.titre)}"><img class="image" src="${esc(o.image)}" alt="${esc(o.titre)}"></button>` : "";
  return `${image}<h2>${esc(o.titre)}</h2>
    <p class="sous-titre">${a ? lien(a.id, a.nom) + ", " : ""}${esc(o.dateAffichee || o.annee)}</p>
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
    return `<li><span>${verbe} ${lien(autre.id, autre.nom)}${i.explication ? `<small>${esc(i.explication)}</small>` : ""}</span></li>`;
  }).join("");
  // Un mouvement connu devient un lien ; une valeur inconnue (signalée par construire.py) reste du texte
  const aussi = a.autres.map((x) => (MOUV[x] ? lien(x, MOUV[x].nom) : esc(x))).join(", ");
  return `<h2>${esc(a.nom)}</h2>
    <p class="sous-titre">${a.naissance ?? "?"}–${a.deces ?? "?"}</p>
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
  return `<h2>${esc(m.nom)}</h2>
    <p class="sous-titre">${m.debut}–${m.fin}${m.lieu ? ", " + esc(m.lieu) : ""}</p>
    ${avecExplorer ? `<button type="button" class="explorer" data-explorer="${esc(m.id)}">Explorer ce mouvement en grand</button>` : ""}
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

export { ficheOeuvre, ficheArtiste, ficheMouvement, ficheEvenement };