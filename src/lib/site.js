/* =====================================================================
   Pages fixes du site
   Les pages qui existent quel que soit le contenu, écrites une seule fois.
   Le menu, le pied de page, l’Index de la frise, le plan du site et le sitemap
   y prennent chacun ce qui les concerne.
   ===================================================================== */

// Chaque page :
//   cle    son identifiant ; pour une rubrique, la valeur de « rubrique » que la page passe à Base.astro
//   texte  le libellé court, dans le menu, le pied de page et l’Index
//   titre  le libellé du plan du site, s’il diffère du texte (facultatif)
//   href   l’adresse, toujours avec la barre finale
//   menu   la page est une entrée du menu (D18) ; Comprendre n’y entrera qu’avec son contenu, en phase 4
//   pied   la page est dans le pied de page des pages (D18)
const PAGES_FIXES = [
  { cle: "frise", texte: "Frise", titre: "Frise chronologique", href: "/", menu: true, pied: false },
  { cle: "mouvements", texte: "Mouvements", href: "/mouvements/", menu: true, pied: false },
  { cle: "artistes", texte: "Artistes", href: "/artistes/", menu: true, pied: false },
  { cle: "oeuvres", texte: "Œuvres", href: "/oeuvres/", menu: true, pied: false },
  { cle: "a-propos", texte: "À propos", href: "/a-propos/", menu: false, pied: true },
  { cle: "plan-du-site", texte: "Plan du site", href: "/plan-du-site/", menu: false, pied: true }
];

export { PAGES_FIXES };