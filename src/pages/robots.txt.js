// robots.txt : ce que les robots des moteurs de recherche ont le droit de lire, et où trouver le sitemap.
// Tout est permis. L’adresse du sitemap vient du champ site d’astro.config.mjs : elle suivra le .com en phase 3.
export function GET({ site }) {
  const texte = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${new URL("/sitemap.xml", site).href}`,
    "",
  ].join("\n");
  return new Response(texte);
}