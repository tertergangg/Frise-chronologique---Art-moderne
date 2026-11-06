/* =====================================================================
   Outils partagés
   De petites fonctions qui ne touchent pas à la page, utilisées par la frise et,
   à partir de l’étape 2e, par les pages.
   ===================================================================== */

// Échappe les caractères spéciaux du HTML : tout texte venant des données passe par ici avant d’être inséré
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Minuscules sans accents, pour qu’une recherche « edouard » trouve « Édouard » (recherche, Index)
const sansAccent = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Nom court des artistes : le dernier mot du nom, sauf exceptions
const NOMS_COURTS = { "Vincent van Gogh": "Van Gogh", "Willem de Kooning": "De Kooning" };
const nomCourt = (nom) => NOMS_COURTS[nom] || nom.split(" ").pop();

// Les mots de chaque type d’élément : le titre d’un onglet de l’Index, et le singulier et le pluriel de compter()
const ONGLETS_INDEX = {
  mouvements: { titre: "Mouvements", singulier: "mouvement", pluriel: "mouvements" },
  artistes: { titre: "Artistes", singulier: "artiste", pluriel: "artistes" },
  oeuvres: { titre: "Œuvres", singulier: "œuvre", pluriel: "œuvres" }
};

// « 1 œuvre », « 2 œuvres » ; en français, zéro prend le singulier
function compter(nombre, onglet) {
  const mots = ONGLETS_INDEX[onglet];
  return `${nombre} ${nombre > 1 ? mots.pluriel : mots.singulier}`;
}

// Le lien mène-t-il à un fichier image (et non à une page web) ? Si oui, la fiche et l’aperçu l’affichent.
const estImage = (lien) => lien && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(lien);

export { esc, sansAccent, nomCourt, ONGLETS_INDEX, compter, estImage };