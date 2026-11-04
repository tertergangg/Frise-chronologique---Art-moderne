# Roadmap

**Étape en cours : préparation de la phase 2.** Dans l’ordre : mettre les documents dans le dépôt (D12), fixer la version de wrangler (D16), puis trier les « Idées à trier » dans une conversation dédiée. Viennent ensuite la phase 2, le lot 4 (téléphone), puis la phase 3 (ouverture au public).

---

## Terminé
Le détail est dans le JOURNAL et dans l’historique Git.
- **Phase 1 · Migration vers Astro, à l’identique** · 2 novembre 2026. Même site, fabriqué par Astro et publié par Cloudflare depuis `main`.
- **Lot 1 · Corrections de la V1** · 2 novembre 2026. Bulle d’aperçu, poignée du panneau, croix.
- **Lot 2 · Fiches** · 2 novembre 2026. Nationalité, Disciplines, « Aussi » cliquable, fiche mouvement en deux listes d’œuvres, image en grand.
- **Lot 3 · Design** · 4 novembre 2026. Couleurs, bandeau du haut, Index, bouton clair/sombre, étiquettes d’artistes, zoom « Moyen », barre du bas en vue mouvement. La croix actuelle est gardée.
- **Phase 0 · Remettre de l’ordre** · 4 novembre 2026. Fiches orphelines rangées et signalées, README, fin de GitHub Pages (D11), style.css rangé par élément de la page.

## Préparation de la phase 2
1. Mettre les six documents dans le dépôt, dans `projet/` (D12).
2. Ajouter wrangler aux `devDependencies`, à une version exacte (D16). Vérifier dans le journal de déploiement de Cloudflare que c’est bien cette version qui est utilisée.
3. Trier les « Idées à trier », dans une conversation dédiée (voir plus bas).

## Phase 2 · Une page par fiche
Objectif : une page par fiche rédigée (D13), la frise restant à `/` (D14) et identique à aujourd’hui. Une étape = une branche, testée sur l’aperçu Cloudflare avant d’aller dans `main`.
- **2a · Vérifications.** construire.py signale un lien `[[id]]` vers un identifiant inconnu, et un chemin d’image qui ne commence ni par `/` ni par `http`. Dans le tableur, le chemin `images/impression-soleil-levant.jpg` devient `/images/impression-soleil-levant.jpg` : un chemin relatif casserait sur les pages comme `/oeuvres/…/`.
- **2b · Les données et la frise passent dans Astro.** construire.py écrit `src/data/frise.json` au lieu de `public/data.js` (D7, D8). Le script de la frise devient un module traité par Astro qui lit ces données (D15), sans aucun autre changement. C’est l’étape la plus risquée de la phase : elle se fait seule.
- **2c · Découpage d’app.js.** Les fonctions qui fabriquent les fiches et les outils qu’elles utilisent vont dans `src/lib/`, le reste dans `src/scripts/` (navigation, vues, recherche, Index…). Sans renommage. À trancher à cette étape : `marked` reste-t-il chargé depuis le CDN ?
- **2d · Les pages.** Un gabarit commun (`Base.astro`) et une page par mouvement, artiste et œuvre rédigés, dans le style du panneau. Les liens `[[id]]` mènent aux pages, et le panneau de la frise propose « Ouvrir la page ».
- **2e · Référencement de base.** Titre de page, description (le résumé court du tableur), adresse canonique, sitemap.xml, robots.txt. Un contrôle des liens de `dist/` (outil à choisir à cette étape, sans dépendance si possible).
- **2f · Finitions.** Une page « À propos ». L’Index reçoit les liens vers les nouvelles pages.

**Terminé quand** : chaque fiche rédigée a sa page ; aucun lien interne n’est cassé (construire.py à l’étape 2a, contrôle de `dist/` à l’étape 2e) ; le sitemap est généré ; la frise fonctionne comme avant, sur ordinateur et sur téléphone.

## Lot 4 · Version téléphone
Phase dédiée, dans sa propre conversation, après la phase 2 et avant l’ouverture au public.
- Revoir toute l’expérience sur petit écran, pages de la phase 2 comprises.
- Bandeau : la première ligne devra tenir le titre, l’Index et « Au hasard » ; le bouton de thème est déjà sur la deuxième ligne, à côté de la case « Œuvres majeures seulement ». Piste : ranger « Au hasard » dans le tiroir Index sur téléphone.
- Les règles téléphone ajoutées aux étapes 2a et 2b du lot 3 (libellé court « Au hasard », recherche sur toute la largeur, liste des résultats accrochée à gauche, bouton « Index » dans la même ligne) sont provisoires. La ligne des outils déborde sans doute.
- Étiquettes d’artistes de la vue mouvement : sur téléphone, les compléments (nombre d’œuvres, nationalité, disciplines, « Surtout ») sont cachés (classe `.complement`). À revoir si l’étiquette s’élargit.
- Barre du bas : avec les trois boutons de zoom, elle est serrée sur téléphone (libellés à 0,75 rem).

## Après D10
- Œuvre protégée : message du type « Nous n’avons pas encore les droits pour afficher cette œuvre, mais vous pouvez la retrouver ici », avec un lien. Piste : le « cartel de musée » (voir « Idées à trier »).

## Plus tard : contenu
- Ajouter le néo-impressionnisme à l’onglet Mouvements (avec sa fiche), puis remplacer « néo-impressionnisme » par son identifiant dans la colonne « Autres mouvements » de Seurat. `construire.py` suggérera l’identifiant.
- Ajouter au tableur Ball, Eluard, Manet et Miró, avec leurs œuvres, puis ramener leurs fiches de `fiches/_en-attente/` dans `fiches/artistes` et `fiches/oeuvres`. Retirer au passage la section « Sources » des 4 fiches artistes.

## Idées à trier (proposées par Lovable le 3 novembre 2026)
Ces idées ne sont pas validées. Une conversation dédiée, avant le début de la phase 2, décidera de ce qu’on garde, sous quelle forme et dans quelle phase. Pour chaque idée retenue, il faudra aussi dire quel contenu est à rédiger : les sections de contenu demandent surtout de l’écriture. Garder sous la main les captures des maquettes Lovable (hors du dépôt).
- **Page d’accueil distincte de la frise** (maquette Lovable) : grand titre, image, grille des mouvements, accès à la frise. C’est un changement d’architecture : aujourd’hui, la frise est la page d’accueil. Meilleur pour Google. D14 la reporte : à décider avant la phase 3.
- **Modèles pour les pages de la phase 2** (maquettes Lovable) : galerie d’œuvres filtrée par mouvement, page mouvement avec son texte, ses artistes et ses œuvres.
- **Œuvres sans image** : un « cartel de musée » typographique (titre, date, technique, lieu, lien vers le site du musée). Les initiales proposées par Lovable ne conviennent pas (« Vv » pour van Gogh, et les mêmes initiales sur toutes les œuvres d’un artiste).
- **Fiches de révision** : comparer deux mouvements (contexte, idées, techniques, manifeste, artistes), par exemple fauvisme et expressionnisme.
- **Lexique & manifestes** : 20 à 30 définitions (pointillisme, primitivisme, ready-made…) et des extraits de manifestes (futurisme, 1909…). Droits à vérifier pour chaque extrait, traductions comprises.
- **Chronologie des ruptures** : 10 à 15 repères d’histoire générale (Première Guerre mondiale, photographie, tube de peinture…) mis en regard de la frise, sans la surcharger.
- **Rendre plus visibles deux éléments existants**, que Lovable n’a pas remarqués : le couloir « Contexte » (événements) et la rubrique « Liens » des fiches artistes (influences).

## Phase 3 · Nom de domaine et ouverture au public
- Décider de la page d’accueil (D14) : la frise reste-t-elle à `/`, ou une page d’accueil distincte y mène-t-elle ? Dans le second cas, choisir l’adresse de la frise, qui ne changera plus (D9).
- Choisir le nom, acheter le .com et le brancher sur Cloudflare.
- Ajouter une page 404, un favicon (à la place des logos d’Astro) et un aperçu pour le partage sur les réseaux (Open Graph).
- Déclarer le site dans Google Search Console.

## Phase 4 · Parcours thématiques
Format à définir avant de commencer. Les fiches de révision, le lexique et la chronologie des ruptures pourraient en faire partie (voir « Idées à trier »).

## Phase 5 · Version anglaise
L’organisation des fichiers et des adresses (`/en/…`) est à décider avant de commencer.
