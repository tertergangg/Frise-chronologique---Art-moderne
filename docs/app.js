/* =====================================================================
   Frise de l’art moderne — affichage
   Les données viennent de data.js (window.FRISE), produit par construire.py.

   Trois vues :
   - « détail »     : la frise complète, une carte par œuvre (vue par défaut)
   - « ensemble »   : toute la période d’un coup d’œil, sans défilement
   - « mouvement »  : un mouvement en grand, avec une ligne par artiste
   ===================================================================== */

/* ---------- Réglages : tu peux modifier ces valeurs ---------- */
const REGLAGES = {
  debut: 1860,           // première année affichée
  fin: 1966,             // dernière année affichée
  depart: 1870,          // année affichée à gauche au chargement
  pxParAn: 66,           // largeur d’une année en vue détaillée, en pixels
  largeurCarte: 196,     // largeur d’une carte d’œuvre, en pixels
  hauteurLigne: 48,      // hauteur d’une ligne de cartes dans un couloir
  largeurEtiquettes: 220, // largeur de la colonne des noms à gauche
  margeAvant: 10,        // vue mouvement : on montre aussi les œuvres jusqu’à 10 ans avant le début (les œuvres fondatrices)
  margeApres: 5          // … et jusqu’à 5 ans après la fin du mouvement
};

/* ---------- Outils ---------- */
const D = window.FRISE;
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const indexer = (liste) => Object.fromEntries(liste.map((x) => [x.id, x]));
const MOUV = indexer(D.mouvements), ART = indexer(D.artistes), OEU = indexer(D.oeuvres), EVT = indexer(D.evenements);
const couleur = (id) => (MOUV[id] ? MOUV[id].couleur : "#8A8F99");
const lien = (id, texte) => `<a href="#${esc(id)}" data-id="${esc(id)}">${esc(texte)}</a>`;
const mouvementsTries = [...D.mouvements].sort((a, b) => a.debut - b.debut);
const petitEcran = () => window.matchMedia("(max-width: 720px)").matches;
const reduireMouvement = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const douceur = () => (reduireMouvement() ? "auto" : "smooth");

// Nom court des artistes : le dernier mot du nom, sauf exceptions
const NOMS_COURTS = { "Vincent van Gogh": "Van Gogh", "Willem de Kooning": "De Kooning" };
const nomCourt = (nom) => NOMS_COURTS[nom] || nom.split(" ").pop();

const etat = { vue: "detail", mouvement: null, majeures: true };
const defile = $("#defile"), toile = $("#toile");

// Les œuvres d’un mouvement, y compris celles un peu avant ou après ses dates (voir les marges)
function oeuvresDuMouvement(m) {
  return D.oeuvres.filter((o) => o.mouvement === m.id && o.annee != null
    && o.annee >= m.debut - REGLAGES.margeAvant && o.annee <= m.fin + REGLAGES.margeApres);
}

/* ---------- Fenêtre : quelle période, à quelle échelle ---------- */
function fenetre() {
  const mobile = petitEcran();
  const lab = mobile ? 112 : REGLAGES.largeurEtiquettes;
  const carte = mobile ? REGLAGES.largeurCarte * 0.82 : REGLAGES.largeurCarte;
  const place = defile.clientWidth - lab - 16;   // largeur disponible pour la frise
  if (etat.vue === "ensemble") {
    const debut = REGLAGES.debut, fin = REGLAGES.fin;
    return { debut, fin, lab: 0, carte, ppa: (defile.clientWidth - 40) / (fin - debut) };
  }
  if (etat.vue === "mouvement") {
    const m = MOUV[etat.mouvement];
    const annees = oeuvresDuMouvement(m).map((o) => o.annee);
    const debut = Math.min(m.debut, ...annees) - 1;        // la fenêtre s’élargit pour inclure les œuvres fondatrices
    const fin = Math.max(m.fin + 1, ...annees, debut + 9) + 1;
    return { debut, fin, lab, carte, ppa: Math.max(mobile ? 60 : 70, place / (fin - debut)) };
  }
  return { debut: REGLAGES.debut, fin: REGLAGES.fin, lab, carte, ppa: mobile ? REGLAGES.pxParAn * 0.75 : REGLAGES.pxParAn };
}
const xAn = (annee, f) => (annee - f.debut) * f.ppa;

// Range les éléments en lignes sans chevauchement
function empiler(elements, largeur) {
  const finLigne = [];
  for (const el of [...elements].sort((a, b) => a.x - b.x)) {
    let ligne = finLigne.findIndex((fin) => fin + 8 <= el.x);
    if (ligne === -1) { ligne = finLigne.length; finLigne.push(0); }
    finLigne[ligne] = el.x + largeur;
    el.ligne = ligne;
  }
  return Math.max(1, finLigne.length);
}

/* ---------- Morceaux de frise réutilisables ---------- */
function axe(f, largeurPiste) {
  const pas = etat.vue === "ensemble" ? (petitEcran() ? 20 : 10) : etat.vue === "mouvement" ? 1 : 5;
  let graduations = "";
  for (let a = Math.ceil((f.debut + 0.5) / pas) * pas; a <= f.fin; a += pas) {
    const fort = etat.vue === "mouvement" ? a % 5 === 0 : a % 10 === 0 || etat.vue === "ensemble";
    const texte = fort || !petitEcran() ? a : "";
    graduations += `<span class="an${fort ? " decennie" : ""}" style="left:${xAn(a, f)}px">${texte}</span>`;
  }
  return `<div class="axe"><div class="coin"></div><div class="piste" style="width:${largeurPiste}px">${graduations}</div></div>`;
}

function couloirContexte(f, largeurPiste) {
  if (etat.vue === "ensemble") return "";   // la vue d’ensemble reste sans détail
  const evts = D.evenements.filter((x) => x.annee != null && x.annee >= f.debut && x.annee <= f.fin)
    .map((x) => ({ ...x, x: xAn(x.annee, f) }));
  const lignes = empiler(evts, f.carte * 0.9);
  return `<section class="couloir contexte">
    <div class="etiquette"><strong>Contexte</strong><small>Expositions et manifestes</small></div>
    <div class="piste" style="width:${largeurPiste}px;min-height:${lignes * 28 + 12}px">
      ${evts.map((x) => `<button class="evenement" data-id="${esc(x.id)}" style="left:${x.x}px;top:${6 + x.ligne * 28}px" title="${esc(x.titre)}, ${esc(x.date || x.annee)}"><span class="repere"></span><span class="t">${esc(x.titre)}</span></button>`).join("")}
    </div></section>`;
}

// Une œuvre est « hors période » si elle date d’avant ou d’après son mouvement
function horsPeriode(o) {
  const m = MOUV[o.mouvement];
  if (!m || o.annee == null) return "";
  return o.annee < m.debut ? "avant" : o.annee > m.fin ? "apres" : "";
}
const carteOeuvre = (o, haut) =>
  `<button class="carte${o.majeure && !etat.majeures ? " majeure" : ""}${horsPeriode(o) ? " hors-periode" : ""}" data-id="${esc(o.id)}" data-artiste="${esc(o.artiste)}" data-apercu="${esc(o.id)}" style="left:${o.x}px;top:${haut}px"><span class="vignette"></span><span class="texte"><span class="t">${esc(o.titre)}</span><span class="a">${esc(ART[o.artiste]?.nom ?? "")}, ${o.annee}</span></span></button>`;

const bande = (m, f) =>
  `<div class="bande" data-mouvement="${esc(m.id)}" style="left:${xAn(m.debut, f)}px;width:${xAn(m.fin + 1, f) - xAn(m.debut, f)}px"></div>`;

/* ---------- Vue détaillée : un couloir par mouvement ---------- */
function vueDetail(f, largeurPiste) {
  const oeuvres = D.oeuvres.filter((o) => o.annee != null && MOUV[o.mouvement] && (!etat.majeures || o.majeure));
  return mouvementsTries.map((m) => {
    const artistes = D.artistes.filter((a) => a.mouvement === m.id);
    const siennes = oeuvres.filter((o) => o.mouvement === m.id).map((o) => ({ ...o, x: xAn(o.annee, f) }));
    const lignes = empiler(siennes, f.carte);
    return `<section class="couloir" id="couloir-${esc(m.id)}" style="--c:${m.couleur}">
      <div class="etiquette" data-aller="${esc(m.id)}" data-bulle="Aller au début du mouvement">
        <button class="nom" data-id="${esc(m.id)}" data-bulle="${esc(m.resume || "")}">${esc(m.nom)}</button>
        <small>${m.debut}–${m.fin}</small>
        <span class="puces">${artistes.map((a) => `<button class="puce" data-id="${esc(a.id)}" data-artiste="${esc(a.id)}" data-bulle="${esc(a.phrase || "")}">${esc(nomCourt(a.nom))}</button>`).join("")}</span>
      </div>
      <div class="piste" style="width:${largeurPiste}px;min-height:${16 + lignes * REGLAGES.hauteurLigne}px">
        ${bande(m, f)}
        ${siennes.map((o) => carteOeuvre(o, 12 + o.ligne * REGLAGES.hauteurLigne)).join("")}
      </div></section>`;
  }).join("");
}

/* ---------- Vue d’ensemble : les mouvements et leurs périodes, sur tout le siècle ---------- */
function vueEnsemble(f, largeurPiste) {
  return mouvementsTries.map((m) => {
    const gauche = xAn(m.debut, f), largeur = xAn(m.fin + 1, f) - gauche;
    // Si la bande est trop étroite pour son nom, le nom passe à côté (à droite, ou à gauche en fin de frise)
    // (sur téléphone, le nom est toujours écrit au-dessus de la bande)
    const mobile = petitEcran();
    const largeurNom = m.nom.length * (mobile ? 8.5 : 11) + 30;
    const etroite = !mobile && largeur < largeurNom;
    const aGauche = mobile ? gauche + largeurNom > largeurPiste : etroite && gauche + largeur + largeurNom > largeurPiste;
    return `<section class="couloir global" style="--c:${m.couleur}">
      <div class="piste" style="width:${largeurPiste}px;min-height:${mobile ? 80 : m.resume ? 66 : 50}px">
        <button class="bande-globale${etroite ? " etroite" : ""}${aGauche ? " a-gauche" : ""}" data-mouvement="${esc(m.id)}" style="left:${gauche}px;width:${largeur}px" data-bulle="Explorer ce mouvement en grand">
          <span class="texte"><strong>${esc(m.nom)}</strong><span>${m.debut}–${m.fin}</span></span>
        </button>
        ${m.resume ? `<span class="resume-globale" style="${gauche + m.resume.length * 6.6 + 20 > largeurPiste
          ? `right:${largeurPiste - gauche - largeur}px;text-align:right` : `left:${gauche}px`}">${esc(m.resume)}</span>` : ""}
      </div></section>`;
  }).join("");
}

/* ---------- Vue mouvement : une ligne par artiste ---------- */
function vueMouvement(f, largeurPiste) {
  const m = MOUV[etat.mouvement];
  const oeuvres = oeuvresDuMouvement(m);
  const artistes = D.artistes.filter((a) => a.mouvement === m.id || oeuvres.some((o) => o.artiste === a.id));
  return artistes.map((a) => {
    const siennes = oeuvres.filter((o) => o.artiste === a.id).map((o) => ({ ...o, x: xAn(o.annee, f) }));
    const lignes = empiler(siennes, f.carte);
    const vie = [Math.max(a.naissance ?? f.debut, f.debut), Math.min(a.deces ?? f.fin, f.fin + 1)];
    return `<section class="couloir artiste" style="--c:${m.couleur}">
      <div class="etiquette">
        <button class="nom" data-id="${esc(a.id)}" data-bulle="${esc(a.phrase || "")}">${esc(a.nom)}</button>
        <small>${a.naissance ?? "?"}–${a.deces ?? "?"}</small>
      </div>
      <div class="piste" style="width:${largeurPiste}px;min-height:${16 + lignes * REGLAGES.hauteurLigne}px">
        ${bande(m, f)}
        <div class="vie" style="left:${xAn(vie[0], f)}px;width:${xAn(vie[1], f) - xAn(vie[0], f)}px"></div>
        ${siennes.map((o) => carteOeuvre(o, 12 + o.ligne * REGLAGES.hauteurLigne)).join("")}
      </div></section>`;
  }).join("");
}

/* ---------- Dessin de la frise ---------- */
function dessiner() {
  const f = fenetre();
  const largeurPiste = (f.fin - f.debut) * f.ppa;
  toile.style.setProperty("--lab", f.lab + "px");
  toile.style.setProperty("--carte", f.carte + "px");
  toile.style.setProperty("--ligne", REGLAGES.hauteurLigne + "px");
  toile.style.setProperty("--ppa", f.ppa + "px");
  toile.style.setProperty("--grille-pas", etat.vue === "mouvement" ? f.ppa + "px" : f.ppa * 10 + "px");
  toile.style.setProperty("--grille-depart", -((f.debut % (etat.vue === "mouvement" ? 1 : 10)) * f.ppa) + "px");
  toile.style.width = f.lab + largeurPiste + "px";
  document.body.dataset.vue = etat.vue;

  const corps = etat.vue === "ensemble" ? vueEnsemble(f, largeurPiste)
    : etat.vue === "mouvement" ? vueMouvement(f, largeurPiste)
    : vueDetail(f, largeurPiste);
  toile.innerHTML = axe(f, largeurPiste) + couloirContexte(f, largeurPiste) + corps;

  // Bandeau de la vue mouvement
  const bandeau = $("#bandeau");
  if (etat.vue === "mouvement") {
    const m = MOUV[etat.mouvement];
    bandeau.hidden = false;
    bandeau.style.setProperty("--c", m.couleur);
    bandeau.innerHTML = `<button type="button" class="retour" data-action="detail">‹ Toute la frise</button>
      <strong>${esc(m.nom)}</strong><span>${m.debut}–${m.fin}, une ligne par artiste, toutes les œuvres</span>
      <button type="button" class="retour lire" data-id="${esc(m.id)}">Lire la fiche</button>`;
  } else bandeau.hidden = true;

  // Bouton « Vue d’ensemble »
  $("[data-vue-bascule]").setAttribute("aria-pressed", String(etat.vue === "ensemble"));
  majDecennies();
}

// Change de vue ; « annee » = année à placer au bord gauche ensuite
function changerVue(vue, options = {}) {
  etat.vue = vue;
  if (options.mouvement) etat.mouvement = options.mouvement;
  dessiner();
  defile.scrollTop = 0;
  if (vue === "detail") allerAnnee(options.annee ?? REGLAGES.depart, false);
  else defile.scrollLeft = 0;
}
function explorer(idMouvement) {
  fermer();
  changerVue("mouvement", { mouvement: idMouvement });
}

/* ---------- Navigation dans le temps ---------- */
// Fait défiler pour que l’année donnée soit au bord gauche de la frise
function allerAnnee(annee, doux = true) {
  defile.scrollTo({ left: xAn(annee, fenetre()) - 24, behavior: doux ? douceur() : "auto" });
}
// Année visible au bord gauche
const anneeGauche = () => { const f = fenetre(); return f.debut + (defile.scrollLeft + 24) / f.ppa; };

// Barre des décennies, en bas
const decennies = [];
for (let a = Math.floor(REGLAGES.debut / 10) * 10; a < REGLAGES.fin; a += 10) decennies.push(a);
const barre = $("#decennies");
barre.innerHTML = `<button type="button" class="ensemble" data-vue-bascule aria-pressed="false">Vue d’ensemble</button>
  <button type="button" class="fleche" data-pas="-1" aria-label="Reculer">‹</button>
  <div class="liste">${decennies.map((a) => `<button type="button" class="decennie" data-annee="${a}">${a}</button>`).join("")}</div>
  <button type="button" class="fleche" data-pas="1" aria-label="Avancer">›</button>`;
barre.addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  if ("vueBascule" in b.dataset) {
    const annee = etat.vue === "mouvement" ? MOUV[etat.mouvement].debut - 2 : undefined;
    changerVue(etat.vue === "ensemble" ? "detail" : "ensemble", { annee });
  } else if (b.dataset.annee) {
    if (etat.vue !== "detail") changerVue("detail", { annee: Number(b.dataset.annee) });
    else allerAnnee(Number(b.dataset.annee));
  } else {
    defile.scrollBy({ left: Number(b.dataset.pas) * (defile.clientWidth - fenetre().lab) * 0.8, behavior: douceur() });
  }
});
// Une seule décennie en noir : celle qui est au bord gauche de la frise
function majDecennies() {
  const courante = etat.vue === "detail" ? Math.floor((anneeGauche() + 0.5) / 10) * 10 : null;
  barre.querySelectorAll(".decennie").forEach((b) => b.classList.toggle("visible", Number(b.dataset.annee) === courante));
}
defile.addEventListener("scroll", majDecennies, { passive: true });

// Glisser la frise avec la souris
let glisse = null, aGlisse = false;
defile.addEventListener("pointerdown", (ev) => {
  if (ev.pointerType !== "mouse" || ev.button !== 0 || ev.target.closest(".carte, .puce, .nom, .evenement, .bande-globale, a")) return;
  glisse = { x: ev.clientX, y: ev.clientY, gauche: defile.scrollLeft, haut: defile.scrollTop };
  aGlisse = false;
});
window.addEventListener("pointermove", (ev) => {
  if (!glisse) return;
  const dx = ev.clientX - glisse.x, dy = ev.clientY - glisse.y;
  if (!aGlisse && Math.hypot(dx, dy) > 4) { aGlisse = true; defile.classList.add("saisi"); }
  if (aGlisse) { defile.scrollLeft = glisse.gauche - dx; defile.scrollTop = glisse.haut - dy; }
});
window.addEventListener("pointerup", () => { glisse = null; defile.classList.remove("saisi"); setTimeout(() => { aGlisse = false; }, 0); });

// Flèches du clavier
defile.addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowRight") { defile.scrollBy({ left: 300 }); ev.preventDefault(); }
  if (ev.key === "ArrowLeft") { defile.scrollBy({ left: -300 }); ev.preventDefault(); }
});

/* ---------- Retour depuis la vue mouvement, et sommaire des mouvements ---------- */
$("#bandeau").addEventListener("click", (ev) => {
  if (ev.target.closest("[data-action='detail']")) changerVue("detail", { annee: MOUV[etat.mouvement].debut - 2 });
  const lire = ev.target.closest("[data-id]");
  if (lire) ouvrir(lire.dataset.id);
});

const sommaire = $("#sommaire");
sommaire.innerHTML = mouvementsTries.map((m) =>
  `<button type="button" class="filtre" data-mouvement="${esc(m.id)}" style="--c:${m.couleur}"><span class="pastille"></span>${esc(m.nom)}</button>`).join("");
sommaire.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-mouvement]");
  if (b) explorer(b.dataset.mouvement);
});

const caseMajeures = $("#majeures");
caseMajeures.checked = etat.majeures;
caseMajeures.addEventListener("change", () => { etat.majeures = caseMajeures.checked; dessiner(); });

/* ---------- Survol d’un artiste : ses œuvres ressortent ---------- */
toile.addEventListener("pointerover", (ev) => {
  const puce = ev.target.closest(".puce");
  toile.querySelectorAll(".allume").forEach((n) => n.classList.remove("allume"));
  toile.classList.toggle("focus", Boolean(puce));
  if (puce) toile.querySelectorAll(`[data-artiste="${puce.dataset.artiste}"]`).forEach((n) => n.classList.add("allume"));
});
toile.addEventListener("pointerleave", () => toile.classList.remove("focus"));

/* ---------- Bulles au survol : la phrase-clé d’un artiste, le résumé d’un mouvement ---------- */
const bulle = $("#bulle");
function placerBulle(ev) {
  const marge = 14, largeur = bulle.offsetWidth, hauteur = bulle.offsetHeight;
  let x = ev.clientX + marge, y = ev.clientY + marge + 4;
  if (x + largeur > window.innerWidth - 8) x = ev.clientX - largeur - marge;
  if (y + hauteur > window.innerHeight - 8) y = ev.clientY - hauteur - marge;
  bulle.style.left = x + "px";
  bulle.style.top = y + "px";
}
const estImage = (lien) => lien && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(lien);

// Aperçu d’une œuvre au survol de sa carte : image, titre, artiste, date, résumé
function apercu(o) {
  const m = MOUV[o.mouvement], hp = horsPeriode(o);
  const note = hp && m ? `<span class="note">${hp === "avant" ? "Antérieure" : "Postérieure"} au mouvement (${m.debut}–${m.fin})</span>` : "";
  return `${estImage(o.image) ? `<img src="${esc(o.image)}" alt="">` : ""}
    <strong>${esc(o.titre)}</strong>
    <span>${esc(ART[o.artiste]?.nom ?? "")}, ${esc(o.dateAffichee || o.annee)}</span>
    ${o.resume ? `<span class="resume-apercu">${esc(o.resume)}</span>` : ""}${note}`;
}

document.addEventListener("pointerover", (ev) => {
  const el = ev.target.closest("[data-apercu], [data-bulle]");
  const oeuvre = el && el.dataset.apercu ? OEU[el.dataset.apercu] : null;
  if (!el || ev.pointerType !== "mouse" || (!oeuvre && !el.dataset.bulle)) { bulle.hidden = true; return; }
  const couloir = el.closest("[style*='--c']");
  bulle.style.setProperty("--c", couloir ? getComputedStyle(couloir).getPropertyValue("--c") : "#8A8F99");
  bulle.classList.toggle("riche", Boolean(oeuvre));
  if (oeuvre) {
    bulle.innerHTML = apercu(oeuvre);
    const img = bulle.querySelector("img");
    if (img) img.addEventListener("load", () => placerBulle(ev), { once: true });   // l’image change la taille de la bulle
  } else {
    bulle.textContent = el.dataset.bulle;
  }
  bulle.hidden = false;
  placerBulle(ev);
});
document.addEventListener("pointermove", (ev) => { if (!bulle.hidden) placerBulle(ev); });
document.addEventListener("pointerdown", () => { bulle.hidden = true; });
defile.addEventListener("scroll", () => { bulle.hidden = true; }, { passive: true });

/* ---------- Clics dans la frise ---------- */
toile.addEventListener("click", (ev) => {
  if (aGlisse) return;                                   // c’était un glisser, pas un clic
  const element = ev.target.closest("[data-id]");
  if (element) { ouvrir(element.dataset.id); return; }
  const etiquette = ev.target.closest("[data-aller]");     // fond coloré de l’étiquette
  if (etiquette) { allerAnnee(MOUV[etiquette.dataset.aller].debut - 2); return; }
  const zone = ev.target.closest(".bande[data-mouvement], .bande-globale");
  if (zone && etat.vue !== "mouvement") explorer(zone.dataset.mouvement);
});

/* ---------- Recherche ---------- */
const sansAccent = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const index = [
  ...D.mouvements.map((m) => ({ id: m.id, texte: m.nom, detail: `Mouvement, ${m.debut}–${m.fin}` })),
  ...D.artistes.map((a) => ({ id: a.id, texte: a.nom, detail: `Artiste, ${a.naissance ?? "?"}–${a.deces ?? "?"}` })),
  ...D.oeuvres.map((o) => ({ id: o.id, texte: o.titre, detail: `${ART[o.artiste]?.nom ?? ""}, ${o.annee ?? ""}` })),
  ...D.evenements.map((x) => ({ id: x.id, texte: x.titre, detail: `Événement, ${x.annee}` })),
];
const champ = $("#champ-recherche"), resultats = $("#resultats");
let choix = 0, trouves = [];
champ.addEventListener("input", () => {
  const q = sansAccent(champ.value.trim());
  trouves = q.length < 2 ? [] : index.filter((x) => sansAccent(x.texte).includes(q)).slice(0, 12);
  choix = 0; afficherResultats();
});
champ.addEventListener("keydown", (ev) => {
  if (!trouves.length) return;
  if (ev.key === "ArrowDown") { choix = (choix + 1) % trouves.length; afficherResultats(); ev.preventDefault(); }
  if (ev.key === "ArrowUp") { choix = (choix - 1 + trouves.length) % trouves.length; afficherResultats(); ev.preventDefault(); }
  if (ev.key === "Enter") { choisir(trouves[choix].id); ev.preventDefault(); }
});
function afficherResultats() {
  resultats.hidden = !trouves.length && champ.value.trim().length < 2;
  resultats.innerHTML = trouves.length
    ? trouves.map((x, i) => `<li role="option" data-id="${esc(x.id)}" aria-selected="${i === choix}">${esc(x.texte)}<small>${esc(x.detail)}</small></li>`).join("")
    : `<li aria-disabled="true">Aucun résultat<small>Essaie un nom d’artiste ou un titre.</small></li>`;
}
resultats.addEventListener("click", (ev) => { const li = ev.target.closest("li[data-id]"); if (li) choisir(li.dataset.id); });
function choisir(id) { champ.value = ""; trouves = []; resultats.hidden = true; ouvrir(id, true); }
document.addEventListener("click", (ev) => { if (!ev.target.closest(".recherche")) resultats.hidden = true; });

/* ---------- Fiches ---------- */
const panneau = $("#panneau"), contenu = $("#contenu-panneau");

function markdown(md) {
  if (!md) return "";
  const avecLiens = md.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id, texte) => {
    const cible = MOUV[id] || ART[id] || OEU[id] || EVT[id];
    return `[${texte || (cible ? cible.nom || cible.titre : id)}](#${id})`;
  });
  return `<div class="corps">${window.marked ? marked.parse(avecLiens) : esc(avecLiens)}</div>`;
}
const aVenir = (quoi) => `<p class="a-venir">La fiche ${quoi} est à venir.</p>`;
const listeOeuvres = (liste, avecArtiste = false) => liste.length ? `<ul class="liens-liste">${[...liste]
  .sort((a, b) => (a.annee ?? 0) - (b.annee ?? 0))
  .map((o) => `<li><span class="an">${o.annee ?? ""}</span><span>${lien(o.id, o.titre)}${avecArtiste && ART[o.artiste] ? `<small>${esc(ART[o.artiste].nom)}</small>` : ""}</span></li>`).join("")}</ul>` : "";

function ficheOeuvre(o) {
  const a = ART[o.artiste], m = MOUV[o.mouvement];
  const lieu = [o.musee, o.ville].filter(Boolean).join(", ");
  const image = estImage(o.image) ? `<img class="image" src="${esc(o.image)}" alt="${esc(o.titre)}">` : "";
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
  return `<h2>${esc(a.nom)}</h2>
    <p class="sous-titre">${a.naissance ?? "?"}–${a.deces ?? "?"}${a.nationalite ? ", " + esc(a.nationalite) : ""}</p>
    <dl>
      ${a.role ? `<dt>Rôle</dt><dd>${esc(a.role)}</dd>` : ""}
      ${m ? `<dt>Mouvement</dt><dd>${lien(m.id, m.nom)}</dd>` : ""}
      ${a.autres ? `<dt>Aussi</dt><dd>${esc(a.autres)}</dd>` : ""}
    </dl>
    ${a.ficheVide ? aVenir("de cet artiste") : markdown(a.fiche)}
    ${oeuvres.length ? `<h3>Œuvres</h3>${listeOeuvres(oeuvres)}` : ""}
    ${relations ? `<h3>Liens</h3><ul class="liens-liste">${relations}</ul>` : ""}`;
}

function ficheMouvement(m) {
  const artistes = D.artistes.filter((a) => a.mouvement === m.id);
  const oeuvres = D.oeuvres.filter((o) => o.mouvement === m.id);
  const evts = D.evenements.filter((x) => x.mouvement === m.id);
  return `<h2>${esc(m.nom)}</h2>
    <p class="sous-titre">${m.debut}–${m.fin}${m.lieu ? ", " + esc(m.lieu) : ""}</p>
    ${etat.vue !== "mouvement" ? `<button type="button" class="explorer" data-explorer="${esc(m.id)}">Explorer ce mouvement en grand</button>` : ""}
    ${m.ficheVide ? aVenir("de ce mouvement") : markdown(m.fiche)}
    ${artistes.length ? `<h3>Artistes</h3><ul class="liens-liste">${artistes.map((a) => `<li><span class="an">${a.naissance ?? ""}</span><span>${lien(a.id, a.nom)}</span></li>`).join("")}</ul>` : ""}
    ${evts.length ? `<h3>Moments clés</h3><ul class="liens-liste">${evts.map((x) => `<li><span class="an">${x.annee}</span><span>${lien(x.id, x.titre)}</span></li>`).join("")}</ul>` : ""}
    ${oeuvres.length ? `<h3>Œuvres</h3>${listeOeuvres(oeuvres, true)}` : ""}`;
}

function ficheEvenement(x) {
  const m = MOUV[x.mouvement];
  return `<h2>${esc(x.titre)}</h2>
    <p class="sous-titre">${esc(x.date || x.annee)}${x.lieu ? ", " + esc(x.lieu) : ""}</p>
    ${x.description ? `<p class="resume">${esc(x.description)}</p>` : `<p class="a-venir">La description de cet événement est à venir.</p>`}
    ${m ? `<dl><dt>Mouvement</dt><dd>${lien(m.id, m.nom)}</dd></dl>` : ""}`;
}

// Ouvre la fiche d’un élément, quel que soit son type
function ouvrir(id, centrer = false) {
  let html = "", c = "#8A8F99", annee = null;
  if (OEU[id]) { html = ficheOeuvre(OEU[id]); c = couleur(OEU[id].mouvement); annee = OEU[id].annee; }
  else if (ART[id]) { html = ficheArtiste(ART[id]); c = couleur(ART[id].mouvement); }
  else if (MOUV[id]) { html = ficheMouvement(MOUV[id]); c = MOUV[id].couleur; }
  else if (EVT[id]) { html = ficheEvenement(EVT[id]); c = couleur(EVT[id].mouvement); annee = EVT[id].annee; }
  else return;
  contenu.innerHTML = `<article class="fiche" style="--c:${c}"><div class="filet"></div>${html}</article>`;
  panneau.hidden = false;
  panneau.scrollTop = 0;
  toile.querySelectorAll(".choisi").forEach((n) => n.classList.remove("choisi"));
  toile.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach((n) => n.classList.add("choisi"));
  if (centrer && annee && etat.vue === "detail") allerAnnee(annee - 3);
  try { history.replaceState(null, "", "#" + id); } catch (err) { /* aperçu sans historique */ }
}
function fermer() {
  panneau.hidden = true;
  toile.querySelectorAll(".choisi").forEach((n) => n.classList.remove("choisi"));
  try { history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* idem */ }
}
$("#fermer").addEventListener("click", fermer);

/* ---------- Largeur de la fiche : glisser son bord gauche pour l’agrandir ou la rétrécir ---------- */
const poignee = $("#poignee");
const LARGEUR_MIN = 380;                                         // en pixels
const largeurMax = () => Math.min(960, window.innerWidth * 0.75);
function fixerLargeur(px) {
  const largeur = Math.round(Math.min(largeurMax(), Math.max(LARGEUR_MIN, px)));
  panneau.style.setProperty("--largeur-panneau", largeur + "px");
  try { localStorage.setItem("largeurFiche", largeur); } catch (err) { /* stockage indisponible */ }
}
try { const memo = Number(localStorage.getItem("largeurFiche")); if (memo) fixerLargeur(memo); } catch (err) { /* idem */ }

let redimension = false;
poignee.addEventListener("pointerdown", (ev) => {
  redimension = true;
  poignee.setPointerCapture(ev.pointerId);
  document.body.classList.add("redimension");
  ev.preventDefault();
});
poignee.addEventListener("pointermove", (ev) => { if (redimension) fixerLargeur(window.innerWidth - ev.clientX); });
poignee.addEventListener("pointerup", () => { redimension = false; document.body.classList.remove("redimension"); });
poignee.addEventListener("dblclick", () => fixerLargeur(window.innerWidth * 0.4));   // double-clic : taille par défaut
poignee.addEventListener("keydown", (ev) => {                                         // au clavier : flèches
  const actuelle = panneau.getBoundingClientRect().width;
  if (ev.key === "ArrowLeft") { fixerLargeur(actuelle + 40); ev.preventDefault(); }
  if (ev.key === "ArrowRight") { fixerLargeur(actuelle - 40); ev.preventDefault(); }
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !panneau.hidden) fermer(); });
contenu.addEventListener("click", (ev) => {
  const bouton = ev.target.closest("[data-explorer]");
  if (bouton) { explorer(bouton.dataset.explorer); return; }
  const a = ev.target.closest("a[data-id], a[href^='#']");
  if (!a) return;
  ev.preventDefault();
  ouvrir(a.dataset.id || a.getAttribute("href").slice(1), true);
});


/* ---------- Démarrage ---------- */
dessiner();
allerAnnee(REGLAGES.depart, false);
let attente;
window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(dessiner, 150); });
const depart = decodeURIComponent(location.hash.slice(1));
if (depart) ouvrir(depart, true);
