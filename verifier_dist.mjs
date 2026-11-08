// verifier_dist.mjs : contrôle des liens du site construit (dist/), sans dépendance.
// À lancer après « npm run build », par « npm run verifier », avant de fusionner une branche dans main.
// Dans chaque page HTML de dist/, il vérifie :
//   1. qu’un lien interne (href ou src qui commence par /) mène à un fichier qui existe ;
//   2. qu’une ancre (#id) correspond à un id de la page visée, sauf vers la frise ;
//   3. que les pages de dist/ et les adresses de sitemap.xml concordent.
// Les liens que la frise fabrique en JavaScript (panneau, Index) lui échappent : construire.py les vérifie à la source.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const DIST = "dist";
// La frise fabrique ses fiches en JavaScript : leurs id (/#matisse) n’existent pas dans son HTML
const FRISE = join(DIST, "index.html");

// Ce qu’on lit dans le HTML, par des expressions régulières : Astro écrit toujours ses attributs entre guillemets doubles.
// Le \s avant le nom écarte les attributs qui finissent par « src » ou « id » (data-src, aria-hidden…).
const LIEN = /\s(?:href|src)="([^"]*)"/g;
const ID = /\sid="([^"]*)"/g;
const LOC = /<loc>([^<]*)<\/loc>/g;

const problemes = [];
const signaler = (ou, message) => problemes.push(`${ou} : ${message}`);

// L’adresse d’une page à partir de son fichier : « mouvements\fauvisme\index.html » donne « /mouvements/fauvisme/ »
function adresseDePage(fichier) {
  const chemin = "/" + fichier.split(sep).join("/");
  return chemin.endsWith("/index.html") ? chemin.slice(0, -"index.html".length) : chemin;
}

// Le fichier de dist/ que sert une adresse, ou null s’il n’existe pas.
// Une adresse qui finit par « / » sert le index.html de ce dossier ; sans la barre, Cloudflare sert aussi ce dossier.
function fichierVise(chemin) {
  const cible = join(DIST, chemin);
  if (!chemin.endsWith("/") && existsSync(cible) && statSync(cible).isFile()) return cible;
  const index = join(cible, "index.html");
  return existsSync(index) ? index : null;
}

// Les id d’une page, lus une seule fois par page (une Map garde ceux déjà lus)
const idsLus = new Map();
function idsDe(fichier) {
  if (!idsLus.has(fichier)) {
    const html = readFileSync(fichier, "utf8");
    idsLus.set(fichier, new Set([...html.matchAll(ID)].map((m) => m[1])));
  }
  return idsLus.get(fichier);
}

// 1 et 2 : les liens et les ancres d’une page
function verifierLiens(fichier, page) {
  const html = readFileSync(fichier, "utf8");
  for (const [, valeur] of html.matchAll(LIEN)) {
    // Seuls « /… » et « #… » sont des liens internes ; « //… » est un lien externe sans https:
    if (!(valeur.startsWith("/") || valeur.startsWith("#")) || valeur.startsWith("//")) continue;
    const [avant, ancre = ""] = valeur.split("#");
    const chemin = avant.split("?")[0];
    // « #groupes » seul vise la page elle-même
    const vise = chemin === "" ? fichier : fichierVise(chemin);
    if (!vise) {
      signaler(page, `lien cassé ${valeur}`);
    } else if (ancre && vise !== FRISE && !idsDe(vise).has(ancre)) {
      signaler(page, `ancre introuvable ${valeur}`);
    }
  }
}

// 3 : le sitemap liste toutes les pages de dist/, et rien d’autre
function verifierSitemap(pages) {
  const fichier = join(DIST, "sitemap.xml");
  if (!existsSync(fichier)) {
    signaler("sitemap.xml", "fichier absent");
    return;
  }
  const xml = readFileSync(fichier, "utf8");
  const listees = new Set([...xml.matchAll(LOC)].map((m) => new URL(m[1].replaceAll("&amp;", "&")).pathname));
  for (const page of pages) if (!listees.has(page)) signaler("sitemap.xml", `page absente du sitemap ${page}`);
  for (const adresse of listees) if (!pages.has(adresse)) signaler("sitemap.xml", `adresse sans page ${adresse}`);
}

if (!existsSync(DIST)) {
  console.error("Le dossier dist/ n’existe pas : lance d’abord « npm run build ».");
  process.exit(1);
}

const fichiers = readdirSync(DIST, { recursive: true }).filter((f) => f.endsWith(".html"));
for (const f of fichiers) verifierLiens(join(DIST, f), adresseDePage(f));
verifierSitemap(new Set(fichiers.map(adresseDePage)));

if (problemes.length > 0) {
  console.log(`${problemes.length} problème(s) dans dist/ :`);
  for (const p of problemes) console.log(`  ${p}`);
  // Un code de sortie différent de 0 signale l’échec au terminal (et à un outil qui lancerait ce script)
  process.exitCode = 1;
} else {
  console.log(`Aucun lien cassé (${fichiers.length} pages vérifiées).`);
}