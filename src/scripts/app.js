/* =====================================================================
   Frise de l’art moderne — affichage
   Les données viennent de src/data/frise.json, produit par construire.py.

   Trois vues :
   - « détail »     : la frise complète, une carte par œuvre (vue par défaut)
   - « ensemble »   : toute la période d’un coup d’œil, sans défilement
   - « mouvement »  : un mouvement en grand, avec une ligne par artiste
   ===================================================================== */

// Les données du site et l’accès par identifiant : src/lib/donnees.js, partagé avec les pages
import { D, MOUV, ART, OEU, EVT, couleur, mouvementsTries } from "../lib/donnees.js";
// Petits outils partagés avec les pages : src/lib/outils.js
import { esc, sansAccent, nomCourt, ONGLETS_INDEX, compter, estImage } from "../lib/outils.js";
// Le contenu des fiches, partagé avec les pages : src/lib/fiches.js
import { ficheOeuvre, ficheArtiste, ficheMouvement, ficheEvenement } from "../lib/fiches.js";
// Les pages fixes du site (menu, pied de page, Index) et les mots « #index » et « #hasard » : src/lib/site.js, partagé avec les pages
import { PAGES_FIXES, ANCRES_FRISE } from "../lib/site.js";

/* ---------- Réglages : tu peux modifier ces valeurs ---------- */
const REGLAGES = {
  debut: 1860,           // première année affichée
  fin: 1966,             // dernière année affichée
  depart: 1870,          // année affichée à gauche au chargement
  pxParAn: 66,           // largeur d’une année en vue détaillée, en pixels
  largeurCarte: 196,     // largeur d’une carte d’œuvre, en pixels
  pxParAnMoyen: 28,      // largeur d’une année au zoom « Intermédiaire », en pixels
  largeurCarteMoyenne: 140, // largeur d’une carte au zoom « Intermédiaire », en pixels
  hauteurLigne: 48,      // hauteur d’une ligne de cartes dans un couloir
  largeurEtiquettes: 220, // largeur de la colonne des noms à gauche
  margeAvant: 10,        // vue mouvement : on montre aussi les œuvres jusqu’à 10 ans avant le début (les œuvres fondatrices)
  margeApres: 5          // … et jusqu’à 5 ans après la fin du mouvement
};

/* ---------- Outils ---------- */
const $ = (sel) => document.querySelector(sel);
const petitEcran = () => window.matchMedia("(max-width: 720px)").matches;
const reduireMouvement = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const douceur = () => (reduireMouvement() ? "auto" : "smooth");

// « moyen » : la vue détail au zoom « Intermédiaire » (barre du bas). C’est le zoom d’ouverture de la frise.
// Il est gardé quand on passe dans une autre vue, pour retrouver le même zoom en revenant à la frise.
const etat = { vue: "detail", mouvement: null, majeures: true, moyen: true };
const zoomMoyen = () => etat.vue === "detail" && etat.moyen;
// Le niveau affiché, tel que le nomment les boutons de la barre du bas ("mouvement" n’a pas de bouton)
const niveauAffiche = () => (etat.vue === "detail" ? (etat.moyen ? "moyen" : "detail") : etat.vue);
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
  const largeurCarte = zoomMoyen() ? REGLAGES.largeurCarteMoyenne : REGLAGES.largeurCarte;
  const carte = mobile ? largeurCarte * 0.82 : largeurCarte;
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
  // Vue détail, à l’un de ses deux niveaux de zoom : « Détail » ou « Intermédiaire »
  const pxParAn = zoomMoyen() ? REGLAGES.pxParAnMoyen : REGLAGES.pxParAn;
  return { debut: REGLAGES.debut, fin: REGLAGES.fin, lab, carte, ppa: mobile ? pxParAn * 0.75 : pxParAn };
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
// Au zoom « Intermédiaire », la carte est plus étroite : le nom court de l’artiste suffit (l’aperçu au survol garde le nom complet)
function artisteCarte(o) {
  const a = ART[o.artiste];
  if (!a) return "";
  return zoomMoyen() ? nomCourt(a.nom) : a.nom;
}
const carteOeuvre = (o, haut) =>
  `<button class="carte${o.majeure && !etat.majeures ? " majeure" : ""}${horsPeriode(o) ? " hors-periode" : ""}" data-id="${esc(o.id)}" data-artiste="${esc(o.artiste)}" data-apercu="${esc(o.id)}" style="left:${o.x}px;top:${haut}px"><span class="vignette"></span><span class="texte"><span class="t">${esc(o.titre)}</span><span class="a">${esc(artisteCarte(o))}, ${o.annee}</span></span></button>`;

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
// Premier mot de la nationalité, en minuscule : « Roumaine (puis française) » donne « roumaine ».
// construire.py y a mis une majuscule, mais ici le mot suit « Nationalité ». Le texte complet reste dans la fiche.
function nationaliteCourte(texte) {
  return String(texte ?? "").trim().split(/[\s,(]/)[0].toLowerCase();
}

// Étiquette d’un artiste : nom, dates, nombre d’œuvres affichées, nationalité et disciplines,
// et son mouvement principal s’il vient d’ailleurs (un artiste « invité »).
// Les éléments « complement » sont cachés sur téléphone (style.css), où l’étiquette est étroite.
function etiquetteArtiste(a, m, nombre) {
  const compte = nombre ? `<span class="complement"> · ${compter(nombre, "oeuvres")} ici</span>` : "";
  const nationalite = nationaliteCourte(a.nationalite);
  const details = [nationalite ? `Nationalité ${nationalite}` : "", a.role].filter(Boolean).join(" · ");
  const ailleurs = a.mouvement !== m.id ? MOUV[a.mouvement] : null;
  return `<div class="etiquette">
        <button class="nom" data-id="${esc(a.id)}" data-bulle="${esc(a.phrase || "")}">${esc(a.nom)}</button>
        <small>${a.naissance ?? "?"}–${a.deces ?? "?"}${compte}</small>
        ${details ? `<small class="complement">${esc(details)}</small>` : ""}
        ${ailleurs ? `<small class="complement">Surtout : ${esc(ailleurs.nom)}</small>` : ""}
      </div>`;
}

function vueMouvement(f, largeurPiste) {
  const m = MOUV[etat.mouvement];
  const oeuvres = oeuvresDuMouvement(m);
  const artistes = D.artistes.filter((a) => a.mouvement === m.id || oeuvres.some((o) => o.artiste === a.id));
  return artistes.map((a) => {
    const siennes = oeuvres.filter((o) => o.artiste === a.id).map((o) => ({ ...o, x: xAn(o.annee, f) }));
    const lignes = empiler(siennes, f.carte);
    return `<section class="couloir artiste" style="--c:${m.couleur}">
      ${etiquetteArtiste(a, m, siennes.length)}
      <div class="piste" style="width:${largeurPiste}px;min-height:${16 + lignes * REGLAGES.hauteurLigne}px">
        ${bande(m, f)}
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

  // Boutons de zoom : seul celui du niveau affiché est enfoncé (aucun en vue mouvement)
  barre.querySelectorAll("[data-niveau]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.niveau === niveauAffiche())));
  boutonMajeures.setAttribute("aria-pressed", String(etat.majeures));
  marquerMouvementOuvert();
  remplirReperes(f);
  majDecennies();
}

// L’adresse suit la vue (D38) : « ?mouvement=<id> » en vue mouvement, rien dans les autres vues.
// Le « #id » de la fiche ouverte est gardé. replaceState change l’adresse sans recharger la page
// et sans ajouter d’étape à l’historique, comme pour les fiches.
function majAdresseVue() {
  const recherche = etat.vue === "mouvement" ? `?mouvement=${encodeURIComponent(etat.mouvement)}` : "";
  try { history.replaceState(null, "", location.pathname + recherche + location.hash); } catch (err) { /* aperçu sans historique */ }
}

// Change de vue ; « annee » = année à placer au bord gauche ensuite
function changerVue(vue, options = {}) {
  etat.vue = vue;
  if (options.mouvement) etat.mouvement = options.mouvement;
  dessiner();
  majAdresseVue();
  defile.scrollTop = 0;
  if (vue === "detail") allerAnnee(options.annee ?? REGLAGES.depart, false);
  else defile.scrollLeft = 0;
}
function explorer(idMouvement) {
  fermer();
  changerVue("mouvement", { mouvement: idMouvement });
}

/* ---------- Navigation dans le temps ---------- */
// Fait défiler pour que l’année donnée soit au bord gauche de la frise ;
// « haut », s’il est donné, règle aussi le défilement vertical dans le même mouvement
function allerAnnee(annee, doux = true, haut = null) {
  const options = { left: xAn(annee, fenetre()) - 24, behavior: doux ? douceur() : "auto" };
  if (haut != null) options.top = haut;
  defile.scrollTo(options);
}
// Année visible au bord gauche
const anneeGauche = () => { const f = fenetre(); return f.debut + (defile.scrollLeft + 24) / f.ppa; };

// Barre du bas : les niveaux de zoom, les flèches et la liste des repères.
// La liste est remplie par remplirReperes() à chaque dessin, car ses repères dépendent de la vue.
const barre = $("#decennies");
barre.innerHTML = `<div class="niveaux" role="group" aria-label="Niveau de zoom">
    <button type="button" class="niveau" data-niveau="ensemble" aria-pressed="false">Ensemble</button>
    <button type="button" class="niveau" data-niveau="moyen" aria-pressed="true">Intermédiaire</button>
    <button type="button" class="niveau" data-niveau="detail" aria-pressed="false">Détail</button>
  </div>
  <button type="button" class="fleche" data-pas="-1" aria-label="Reculer">‹</button>
  <div class="liste"></div>
  <button type="button" class="fleche" data-pas="1" aria-label="Avancer">›</button>`;
const listeReperes = barre.querySelector(".liste");

// Vue mouvement : pas possibles des repères, du plus fin au plus large, et nombre maximal de repères
const PAS_REPERES = [1, 2, 5, 10];
const REPERES_MAX = 11;
// Les années déjà affichées dans la liste : on ne la refait que si elles changent
let clefReperes = "";

// Les multiples du pas, du début de la fenêtre jusqu’à sa fin (exclue)
function anneesReperes(debut, fin, pas) {
  const annees = [];
  for (let a = Math.ceil(debut / pas) * pas; a < fin; a += pas) annees.push(a);
  return annees;
}

// Les décennies hors de la vue mouvement ; dans cette vue, qui ne couvre qu’une ou deux décennies,
// le pas le plus fin qui donne au plus REPERES_MAX repères
function pasReperes(f) {
  if (etat.vue !== "mouvement") return 10;
  return PAS_REPERES.find((pas) => anneesReperes(f.debut, f.fin, pas).length <= REPERES_MAX) ?? 10;
}

// Refaire la liste ferait perdre le focus clavier à un repère, par exemple au redimensionnement :
// on ne la refait donc que si ses années changent
function remplirReperes(f) {
  const pas = pasReperes(f);
  const annees = anneesReperes(f.debut, f.fin, pas);
  const clef = annees.join(",");
  if (clef === clefReperes) return;
  clefReperes = clef;
  listeReperes.innerHTML = annees.map((a) => `<button type="button" class="decennie" data-annee="${a}">${a}</button>`).join("");
  barre.setAttribute("aria-label", pas === 10 ? "Aller à une décennie" : "Aller à une année");
}

// Hauteur de l’axe des années, collé en haut de la frise : les couloirs visibles commencent juste en dessous
const hauteurAxe = () => toile.querySelector(".axe").offsetHeight;

// Repère du défilement vertical : quel couloir est en haut de la frise (juste sous l’axe des années),
// et à quelle hauteur dans ce couloir, en proportion (0 = son bord haut, 0.5 = son milieu)
function repereVertical() {
  const haut = defile.scrollTop + hauteurAxe();
  const couloirs = [...toile.querySelectorAll(".couloir")];
  const index = couloirs.findIndex((c) => c.offsetTop + c.offsetHeight > haut);
  if (index === -1) return null;
  const c = couloirs[index];
  return { index, part: (haut - c.offsetTop) / c.offsetHeight };
}

// Le défilement vertical qui remet ce repère en haut de la frise, une fois la frise redessinée
function hautRepere(repere) {
  if (!repere) return null;
  const c = toile.querySelectorAll(".couloir")[repere.index];
  if (!c) return null;
  return c.offsetTop + repere.part * c.offsetHeight - hauteurAxe();
}

// Entre « Détail » et « Intermédiaire », on garde sa place : la même année à gauche, le même couloir en haut.
// Les deux repères se lisent avant de redessiner, car ils dépendent de l’échelle actuelle.
function changerZoom(moyen) {
  const annee = anneeGauche();
  const repere = repereVertical();
  etat.moyen = moyen;
  dessiner();
  allerAnnee(annee, false, hautRepere(repere));
}

// Passe à un niveau de zoom. Depuis la vue d’ensemble ou la vue mouvement, on arrive en haut de la frise ;
// depuis la vue mouvement, à l’année qui était au bord gauche, comme avec « ‹ Toute la frise ».
// anneeGauche() se lit avant de changer de vue, car elle dépend de l’échelle de la vue affichée.
function choisirNiveau(niveau) {
  if (niveau === niveauAffiche()) return;          // déjà affiché : on ne perd pas sa place
  if (niveau === "ensemble") { changerVue("ensemble"); return; }
  if (etat.vue === "detail") { changerZoom(niveau === "moyen"); return; }
  const annee = etat.vue === "mouvement" ? anneeGauche() : undefined;
  etat.moyen = niveau === "moyen";
  changerVue("detail", { annee });
}

barre.addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  if (b.dataset.niveau) {
    choisirNiveau(b.dataset.niveau);
  } else if (b.dataset.annee) {
    // La vue d’ensemble ne défile pas : on passe à la frise. Les vues détail et mouvement, elles, défilent.
    if (etat.vue === "ensemble") changerVue("detail", { annee: Number(b.dataset.annee) });
    else allerAnnee(Number(b.dataset.annee));
  } else {
    defile.scrollBy({ left: Number(b.dataset.pas) * (defile.clientWidth - fenetre().lab) * 0.8, behavior: douceur() });
  }
});
// Un seul repère en noir, en vue détail : le dernier déjà passé au bord gauche de la frise, ou le premier si aucun ne l’est.
// En vue mouvement et en vue d’ensemble, aucun : ces vues défilent peu ou pas du tout.
function majDecennies() {
  const boutons = [...listeReperes.querySelectorAll(".decennie")];
  const gauche = anneeGauche() + 0.5;
  const passes = boutons.filter((b) => Number(b.dataset.annee) <= gauche);
  const courant = etat.vue === "detail" ? passes.at(-1) ?? boutons[0] : null;
  boutons.forEach((b) => b.classList.toggle("visible", b === courant));
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
  // Comme les boutons Détail et Intermédiaire : on retrouve la frise à l’année qui était au bord gauche
  if (ev.target.closest("[data-action='detail']")) changerVue("detail", { annee: anneeGauche() });
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
// En vue mouvement, le bouton du mouvement ouvert reste rempli de sa couleur (D54) : aria-current le signale
// aussi aux lecteurs d’écran. Dans les autres vues, aucun bouton n’est marqué.
function marquerMouvementOuvert() {
  sommaire.querySelectorAll("[data-mouvement]").forEach((b) => {
    if (etat.vue === "mouvement" && b.dataset.mouvement === etat.mouvement) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
}

// L’étoile « Œuvres majeures seulement », au bout de la ligne des mouvements : un bouton à deux états,
// dont dessiner() tient à jour l’attribut aria-pressed
const boutonMajeures = $("#majeures");
boutonMajeures.addEventListener("click", () => { etat.majeures = !etat.majeures; dessiner(); });

let dernierHasard = null;
function oeuvreAuHasard() {
  const possibles = D.oeuvres.filter((o) => o.annee != null && MOUV[o.mouvement]
    && (!etat.majeures || o.majeure) && o.id !== dernierHasard);
  if (!possibles.length) return null;
  return possibles[Math.floor(Math.random() * possibles.length)];
}
// Tire une œuvre et ouvre sa fiche : c’est le bouton « Au hasard », et l’adresse /#hasard (voir « Démarrage »)
function ouvrirAuHasard() {
  const o = oeuvreAuHasard();
  if (!o) return;
  dernierHasard = o.id;
  if (etat.vue !== "detail") changerVue("detail");   // seule la vue détail montre toutes les œuvres
  ouvrir(o.id, true);
}
$("#hasard").addEventListener("click", ouvrirAuHasard);

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

/* ---------- Fiches ---------- */
// Le contenu des fiches est fabriqué par src/lib/fiches.js ; ici, le panneau qui les affiche
const panneau = $("#panneau"), contenu = $("#contenu-panneau");

// L’élément qui avait le focus quand le panneau s’est ouvert (bouton Index, « Au hasard », carte…) :
// fermer() le lui rend, pour qu’on reprenne au clavier là où on était (D53)
let declencheur = null;

// Affiche le panneau ; s’il était fermé, retient d’où l’on vient. Passer d’une fiche à l’autre ne change pas ce point de départ.
function montrerPanneau() {
  if (panneau.hidden) declencheur = document.activeElement;
  panneau.hidden = false;
}

// Rend le focus au déclencheur. S’il a disparu (la frise a été redessinée) ou si rien n’avait le focus
// (ouverture par l’adresse, ou clic dans Safari, qui ne donne pas le focus aux boutons), le focus va à la frise.
// preventScroll : la frise ne défile pas pour montrer l’élément
function rendreFocus() {
  const cible = declencheur?.isConnected && declencheur !== document.body ? declencheur : defile;
  declencheur = null;
  cible.focus({ preventScroll: true });
}

// Défilement vertical qui place au milieu de la frise la carte d’une œuvre ou le repère d’un événement.
// Renvoie null si l’élément n’est pas affiché (par exemple une œuvre non majeure quand la case est cochée).
function hautCentre(id) {
  const el = toile.querySelector(`.carte[data-id="${CSS.escape(id)}"], .evenement[data-id="${CSS.escape(id)}"]`);
  if (!el) return null;
  const haut = el.getBoundingClientRect().top - defile.getBoundingClientRect().top + defile.scrollTop;
  return haut - (defile.clientHeight - el.offsetHeight) / 2;
}

// Ouvre la fiche d’un élément, quel que soit son type
function ouvrir(id, centrer = false) {
  let html = "", c = "#8A8F99", annee = null;
  if (OEU[id]) { html = ficheOeuvre(OEU[id]); c = couleur(OEU[id].mouvement); annee = OEU[id].annee; }
  else if (ART[id]) { html = ficheArtiste(ART[id]); c = couleur(ART[id].mouvement); }
  else if (MOUV[id]) { html = ficheMouvement(MOUV[id], etat.vue !== "mouvement"); c = MOUV[id].couleur; }
  else if (EVT[id]) { html = ficheEvenement(EVT[id]); c = couleur(EVT[id].mouvement); annee = EVT[id].annee; }
  else return;
  const retour = etatIndex.actif ? `<button type="button" class="retour-index" data-retour-index>‹ Retour à l’index</button>` : "";
  contenu.innerHTML = `${retour}<article class="fiche" style="--c:${c}"><div class="filet"></div>${html}</article>`;
  montrerPanneau();
  panneau.setAttribute("aria-live", "polite");   // l’Index coupe l’annonce automatique : une fiche la remet
  $("#interieur-panneau").scrollTop = 0;
  toile.querySelectorAll(".choisi").forEach((n) => n.classList.remove("choisi"));
  toile.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach((n) => n.classList.add("choisi"));
  // La carte arrive à la même distance du bord gauche à tous les zooms : celle de 3 ans au zoom « Détail ».
  // Le décalage se compte en pixels, puis se convertit en années à l’échelle du zoom affiché (fenetre().ppa).
  if (centrer && annee && etat.vue === "detail") {
    const decalage = 3 * REGLAGES.pxParAn * (petitEcran() ? 0.75 : 1);
    allerAnnee(annee - decalage / fenetre().ppa, true, hautCentre(id));
  }
  try { history.replaceState(null, "", "#" + id); } catch (err) { /* aperçu sans historique */ }
}
function fermer() {
  // À regarder avant de cacher le panneau : si le focus est ailleurs (dans la frise), on ne le déplace pas
  const focusDansPanneau = panneau.contains(document.activeElement);
  panneau.hidden = true;
  etatIndex.actif = false;   // à la prochaine ouverture du panneau, pas de lien de retour
  toile.querySelectorAll(".choisi").forEach((n) => n.classList.remove("choisi"));
  try { history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* idem */ }
  if (focusDansPanneau) rendreFocus();
}
$("#fermer").addEventListener("click", fermer);

/* ---------- Index : les mouvements, les artistes et les œuvres, dans le panneau des fiches ---------- */
// L’Index prend la place d’une fiche dans le panneau : il en garde la croix, la poignée et la touche Échap.
// etatIndex retient l’onglet choisi et le texte cherché, pour retrouver l’Index tel qu’on l’a laissé.
// « actif » : l’Index a été ouvert depuis la dernière ouverture du panneau ; les fiches affichent alors le lien de retour
const etatIndex = { onglet: "mouvements", recherche: "", actif: false };

// Le texte d’aide retiré du bandeau à l’étape 2a
const AIDE_FRISE = "Avance dans le temps avec les décennies en bas de page ou en faisant glisser la frise, "
  + "et prends du recul avec la vue d’ensemble. Clique sur une bande de couleur pour explorer un mouvement en grand, "
  + "sur un nom ou une œuvre pour ouvrir sa fiche.";

// Le texte dans lequel cherche le champ de l’Index : les noms donnés, réunis et sans accents
const texteRecherche = (...noms) => sansAccent(noms.filter(Boolean).join(" "));

// Les lignes d’un onglet, déjà triées : { id, titre, detail, cherche }
// « cherche » : le nom de l’élément et ceux de ce qui lui est lié, pour qu’on trouve un artiste par son mouvement
// et une œuvre par son artiste ou son mouvement
function lignesIndex(onglet) {
  if (onglet === "mouvements") {
    return mouvementsTries.map((m) => ({
      id: m.id, titre: m.nom, detail: [`${m.debut}–${m.fin}`, m.lieu].filter(Boolean).join(" · "),
      cherche: texteRecherche(m.nom)
    }));
  }
  if (onglet === "artistes") {
    // localeCompare trie à la française : « Édouard » se range avec les E, et non après le Z
    return [...D.artistes]
      .sort((a, b) => nomCourt(a.nom).localeCompare(nomCourt(b.nom), "fr"))
      .map((a) => ({
        id: a.id, titre: a.nom,
        detail: [`${a.naissance ?? "?"}–${a.deces ?? "?"}`, MOUV[a.mouvement]?.nom].filter(Boolean).join(" · "),
        cherche: texteRecherche(a.nom, MOUV[a.mouvement]?.nom)
      }));
  }
  // Œuvres par année, puis par titre ; une œuvre sans année (Infinity) passe en fin de liste
  return [...D.oeuvres]
    .sort((a, b) => ((a.annee ?? Infinity) - (b.annee ?? Infinity)) || String(a.titre ?? "").localeCompare(String(b.titre ?? ""), "fr"))
    .map((o) => ({
      id: o.id, titre: o.titre, detail: [o.annee, ART[o.artiste]?.nom].filter(Boolean).join(" · "),
      cherche: texteRecherche(o.titre, ART[o.artiste]?.nom, MOUV[o.mouvement]?.nom)
    }));
}

// Le compteur et la liste, filtrés par le texte cherché (sans tenir compte des accents)
function htmlListeIndex() {
  const q = sansAccent(etatIndex.recherche.trim());
  const lignes = lignesIndex(etatIndex.onglet).filter((x) => x.cherche.includes(q));
  const liste = lignes.length
    ? `<ul class="index-liste">${lignes.map((x) => `<li><a href="#${esc(x.id)}" data-id="${esc(x.id)}">
        <span class="index-nom">${esc(x.titre)}</span>
        <span class="index-detail">${esc(x.detail)}</span>
        <span class="index-fleche" aria-hidden="true">↗</span></a></li>`).join("")}</ul>`
    : `<p class="index-vide">Aucun résultat. Essaie un autre mot, ou un autre onglet.</p>`;
  return `<p class="compteur">${compter(lignes.length, etatIndex.onglet)}</p>${liste}`;
}

// Ne redessine que le compteur et la liste : redessiner tout l’Index ferait sortir le curseur du champ
function majListeIndex() {
  $("#liste-index").innerHTML = htmlListeIndex();
}

// Au bas de l’Index, les pages du pied de page des pages (À propos, Plan du site) : la frise n’a pas de pied de page (D55).
// Ce sont de vrais liens : le clic du panneau n’intercepte que les liens « #id ».
const PAGES_BAS_INDEX = PAGES_FIXES.filter((p) => p.pied);

function afficherIndex() {
  etatIndex.actif = true;
  const onglets = Object.entries(ONGLETS_INDEX).map(([cle, o]) =>
    `<button type="button" class="onglet" data-onglet="${cle}" aria-pressed="${cle === etatIndex.onglet}">${o.titre}</button>`).join("");
  const basIndex = `<nav class="pages-site" aria-label="Pages du site">
      <ul>${PAGES_BAS_INDEX.map((p) => `<li><a href="${p.href}">${p.texte}</a></li>`).join("")}</ul>
    </nav>`;
  contenu.innerHTML = `<section class="index" aria-label="Index">
    <h2>Index.</h2>
    <details class="comment-lire"><summary>Comment lire la frise</summary><p>${AIDE_FRISE}</p></details>
    <div class="onglets">${onglets}</div>
    <label for="champ-index" class="visuellement-cache">Rechercher dans l’index</label>
    <input id="champ-index" class="champ-index" type="search" placeholder="Rechercher…" autocomplete="off" value="${esc(etatIndex.recherche)}">
    <div id="liste-index">${htmlListeIndex()}</div>
    ${basIndex}
  </section>`;
  montrerPanneau();
  // Sans cela, un lecteur d’écran lirait tout l’Index à l’ouverture, puis à chaque lettre tapée
  panneau.setAttribute("aria-live", "off");
  $("#interieur-panneau").scrollTop = 0;
  toile.querySelectorAll(".choisi").forEach((n) => n.classList.remove("choisi"));
  // L’adresse /#index rouvre l’Index au rechargement : c’est aussi là que mène le bouton Index des pages (D53)
  try { history.replaceState(null, "", `${location.pathname}${location.search}#${ANCRES_FRISE.index}`); } catch (err) { /* aperçu sans historique */ }
  // Sur téléphone, le clavier s’ouvrirait d’office et cacherait la liste
  if (!petitEcran()) $("#champ-index").focus();
}

function choisirOnglet(onglet) {
  etatIndex.onglet = onglet;
  contenu.querySelectorAll("[data-onglet]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.onglet === onglet)));
  majListeIndex();
}

$("#ouvrir-index").addEventListener("click", afficherIndex);
// Le champ est recréé à chaque ouverture de l’Index : on écoute donc sur « contenu », qui, lui, ne change pas
contenu.addEventListener("input", (ev) => {
  if (ev.target.id !== "champ-index") return;
  etatIndex.recherche = ev.target.value;
  majListeIndex();
});
// Entrée, dans le champ : ouvre le premier résultat
contenu.addEventListener("keydown", (ev) => {
  if (ev.target.id !== "champ-index" || ev.key !== "Enter") return;
  const premier = $("#liste-index a[data-id]");
  if (!premier) return;
  ev.preventDefault();
  ouvrir(premier.dataset.id, true);
});

/* ---------- Image d’une œuvre en grand ---------- */
// <dialog> est un élément HTML natif : showModal() l’ouvre par-dessus la page, garde le focus dedans,
// le ferme avec Échap et rend ensuite le focus au bouton qui l’a ouvert
const visionneuse = $("#visionneuse"), imageGrande = $("#image-grande");
function agrandir(img) {
  imageGrande.src = img.src;
  imageGrande.alt = img.alt;
  visionneuse.showModal();
}
// Un clic n’importe où (image, voile sombre ou croix) referme l’image
visionneuse.addEventListener("click", () => visionneuse.close());

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
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !panneau.hidden && !visionneuse.open) fermer(); });
contenu.addEventListener("click", (ev) => {
  const bouton = ev.target.closest("[data-explorer]");
  if (bouton) { explorer(bouton.dataset.explorer); return; }
  const boutonImage = ev.target.closest("[data-agrandir]");
  if (boutonImage) { agrandir(boutonImage.querySelector("img")); return; }
  const onglet = ev.target.closest("[data-onglet]");                                 // onglets de l’Index
  if (onglet) { choisirOnglet(onglet.dataset.onglet); return; }
  if (ev.target.closest("[data-retour-index]")) { afficherIndex(); return; }
  const a = ev.target.closest("a[data-id], a[href^='#']");
  if (!a) return;
  ev.preventDefault();
  ouvrir(a.dataset.id || a.getAttribute("href").slice(1), true);
});

/* ---------- Démarrage ---------- */
// « ?mouvement=<id> » ouvre la vue mouvement (D38) : c’est l’adresse que vise « Voir dans la frise » depuis une page mouvement.
// URLSearchParams lit la partie « ?… » de l’adresse ; get() renvoie null si le paramètre est absent.
// Object.hasOwn, et non MOUV[…] seul : MOUV["constructor"] existe sur tout objet JavaScript, et ouvrirait une vue vide.
const mouvementDepart = new URLSearchParams(location.search).get("mouvement");
if (mouvementDepart !== null && Object.hasOwn(MOUV, mouvementDepart)) {
  changerVue("mouvement", { mouvement: mouvementDepart });
} else {
  dessiner();
  allerAnnee(REGLAGES.depart, false);
  // Un mouvement inconnu : on retire de l’adresse ce paramètre, qui ne mène à rien
  if (mouvementDepart !== null) majAdresseVue();
}
let attente;
window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(dessiner, 150); });
// Le « #… » de l’adresse, lu une fois la vue affichée : « #index » ouvre l’Index, « #hasard » une œuvre au hasard
// (les adresses des boutons de l’en-tête des pages), tout autre mot la fiche de cet identifiant.
// En vue mouvement, la fiche d’un mouvement n’a pas « Explorer… »
const depart = decodeURIComponent(location.hash.slice(1));
if (depart === ANCRES_FRISE.index) afficherIndex();
else if (depart === ANCRES_FRISE.hasard) ouvrirAuHasard();
else if (depart) ouvrir(depart, true);