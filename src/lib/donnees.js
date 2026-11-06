/* =====================================================================
   Données du site
   Lit src/data/frise.json (produit par construire.py) et prépare l’accès à chaque élément par son identifiant.
   Partagé par la frise et, à partir de l’étape 2e, par les pages : rien ici ne touche à la page.
   ===================================================================== */

// Astro (via Vite) intègre ce fichier JSON au script publié ; les pages le liront au build
import D from "../data/frise.json";

// Transforme une liste en objet { identifiant: élément }, pour retrouver un élément sans parcourir la liste
const indexer = (liste) => Object.fromEntries(liste.map((x) => [x.id, x]));
const MOUV = indexer(D.mouvements), ART = indexer(D.artistes), OEU = indexer(D.oeuvres), EVT = indexer(D.evenements);
// Les groupes (D22) : ils n’ont pas de fiche, mais les liens des pages doivent trouver leur mouvement
const GRP = indexer(D.groupes);

// Couleur d’un mouvement, ou un gris neutre si l’identifiant est inconnu
const couleur = (id) => (MOUV[id] ? MOUV[id].couleur : "#8A8F99");

// Les mouvements dans l’ordre chronologique de leur début
const mouvementsTries = [...D.mouvements].sort((a, b) => a.debut - b.debut);

export { D, MOUV, ART, OEU, EVT, GRP, couleur, mouvementsTries };