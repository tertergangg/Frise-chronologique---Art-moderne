/* =====================================================================
   Bouton de thème clair ou sombre
   Partagé par la frise et les pages, chargé par le composant BoutonTheme.astro.
   Le script du <head> (ScriptTheme.astro) a déjà posé data-theme sur <html> avant l’affichage :
   ici, on l’inverse au clic et on retient le choix pour les prochaines visites.
   La clé « theme » et les valeurs « light » et « dark » sont aussi écrites dans ScriptTheme.astro.
   ===================================================================== */

const racine = document.documentElement;
const boutonTheme = document.querySelector("#bouton-theme");
const LIBELLES_THEME = { light: "Passer en mode sombre", dark: "Passer en mode clair" };

// Le libellé décrit l’action du bouton ; sur la frise, data-bulle l’affiche aussi au survol
function majBoutonTheme() {
  const libelle = LIBELLES_THEME[racine.dataset.theme] ?? LIBELLES_THEME.light;
  boutonTheme.setAttribute("aria-label", libelle);
  boutonTheme.dataset.bulle = libelle;
}

function changerTheme() {
  const theme = racine.dataset.theme === "dark" ? "light" : "dark";
  racine.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch (err) { /* stockage indisponible */ }
  majBoutonTheme();
}

// Par prudence : une page sans bouton ne doit pas faire planter le script
if (boutonTheme) {
  boutonTheme.addEventListener("click", changerTheme);
  majBoutonTheme();
}