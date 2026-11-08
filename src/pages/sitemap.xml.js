// sitemap.xml : la liste des pages du site, que les moteurs de recherche lisent pour n’en oublier aucune.
// Astro appelle GET() au build et écrit ce qu’elle renvoie dans dist/sitemap.xml.
// La liste suit la même règle que les pages : seuls les éléments dont aUnePage() est vrai y entrent (D13, D40).
// Les groupes n’y sont pas : ce sont des sections de la page de leur mouvement, pas des pages.
import { D } from "../lib/donnees.js";
import { aUnePage, adresse } from "../lib/fiches.js";
import { esc } from "../lib/outils.js";

// Les pages qui existent quel que soit le contenu : la frise et les trois répertoires.
// À compléter quand une page fixe s’ajoute (À propos et plan du site, étape 2h).
const PAGES_FIXES = ["/", "/mouvements/", "/artistes/", "/oeuvres/"];

// « site » vient du champ site d’astro.config.mjs : les adresses du sitemap doivent être complètes
export function GET({ site }) {
  const fiches = [...D.mouvements, ...D.artistes, ...D.oeuvres]
    .filter((x) => aUnePage(x.id))
    .map((x) => adresse(x.id));
  const lignes = [...PAGES_FIXES, ...fiches]
    .map((chemin) => `  <url><loc>${esc(new URL(chemin, site).href)}</loc></url>`);
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...lignes,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(xml);
}