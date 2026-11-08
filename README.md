# Frise de l’art moderne, 1874–1960

Un site gratuit d’histoire de l’art moderne, pour les étudiants et les curieux : une frise chronologique interactive, de l’impressionnisme aux années 1960, puis une page par mouvement, par artiste et par œuvre.

Site en ligne (adresse provisoire) : https://frise-chronologique---art-moderne.tjimblet.workers.dev

Ce fichier est le mode d’emploi. Le fonctionnement du site est décrit dans `suivi_projet/02-ARCHITECTURE.md`.

## Le principe

Le site a deux sources : le tableur `donnees/frise_art_moderne_base.xlsx` et les fiches Markdown du dossier `fiches/`. Tout le reste est fabriqué à partir d’elles :

```
tableur + fiches ─> python construire.py ─> src/data/frise.json ─> npm run build ─> dist/ ─> Cloudflare
```

Cloudflare n’a pas Python : `src/data/frise.json` est donc enregistré dans Git, et doit être à jour avant chaque commit.

## Installer (une seule fois)

1. Installe [Python](https://www.python.org). Sous Windows, coche « Add Python to PATH ».
2. Installe [Node.js](https://nodejs.org), dans une version au moins égale à celle du champ `engines` de `package.json`.
3. Dans un terminal ouvert dans le dossier du projet (dans VS Code : Terminal > Nouveau terminal), tape :
   ```
   pip install openpyxl
   npm install
   ```

## Travailler sur le contenu

1. **Tableur** : modifie-le dans Excel, sans changer son nom ni son format .xlsx.
2. **Fiches** : rédige-les dans VS Code. Pour lier une autre fiche : `[[derain]]`, ou `[[derain|Derain]]` pour choisir le texte du lien.
3. **Vérifier** : `python construire.py`. Le script affiche le bilan du contenu, puis les points à vérifier. L’avertissement `Data Validation extension is not supported` est sans danger.
4. **Voir le résultat** : `npm run dev`, puis ouvre l’adresse affichée : la frise est à `/`, les répertoires à `/mouvements/`, `/artistes/` et `/oeuvres/`, une œuvre documentée à `/oeuvres/<id>/`, et la liste de toutes les pages à `/plan-du-site/`. Recharge la page après chaque modification ; `Ctrl + C` arrête l’aperçu. Pour tester la version qui sera publiée : `npm run build`, puis `npm run preview`.
5. **Contrôler le site construit** : après `npm run build`, `npm run verifier` vérifie les liens, les ancres et le sitemap des pages de `dist/`. Il répond « Aucun lien cassé », ou donne la liste des problèmes.

Une fiche s’affiche dès qu’elle contient du vrai texte. Sinon, le site indique « fiche à venir ».

## Ajouter un élément

| Pour ajouter…                                          | Fais ceci                                                                                                   |
|--------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| un mouvement, un artiste, une œuvre                    | ajoute sa ligne dans l’onglet du tableur, puis copie le gabarit de `fiches/_gabarits/` dans `fiches/mouvements/`, `artistes/` ou `oeuvres/`, renommé `<id>.md` |
| un groupe, un événement, une relation, un terme du glossaire | ajoute sa ligne dans l’onglet du tableur, sans fiche                                                  |
| un parcours, une comparaison                           | copie le gabarit dans `fiches/parcours/` ou `fiches/comparaisons/` (crée le dossier la première fois), renommé `<id>.md`, puis remplis son en-tête |

Lance ensuite `python construire.py` pour vérifier.

- **Fiche œuvre** : la présentation suffit à publier la page. L’analyse, facultative, va sous le titre `## Analyse`, qu’il ne faut pas renommer.
- **Image d’une œuvre** : seulement si l’œuvre est dans le domaine public (artiste mort depuis plus de 70 ans). Range le fichier dans `public/images/`, avec un nom en minuscules, écris son chemin (`/images/<nom>.jpg`) dans « Lien image », et sa source et sa licence dans « Crédit image » (par exemple « Wikimedia Commons, domaine public »). Pour une œuvre protégée, mets plutôt la page de l’œuvre sur le site du musée dans « Lien de l’œuvre ». construire.py vérifie tout cela.
- **Identifiant** : en minuscules, sans accents, avec des tirets (`les-demoiselles-d-avignon`). C’est le même dans la colonne ID, dans le nom de la fiche et dans l’adresse de la page, et il est unique sur tout le site. Une fois le site public, on ne le change plus : cela casserait les liens.
- **Fiche en avance** : une fiche rédigée avant que sa ligne existe va dans `fiches/_en-attente/<type>/`. On la ramène dans son dossier en ajoutant la ligne.

## Publier

Une branche par tâche, testée sur sa version de test avant d’aller dans `main` :

```
git switch -c nom-de-la-tache
python construire.py                 si le tableur ou les fiches ont changé
git status                           puis relire le diff dans VS Code
git add <fichier>                    un par un, sans oublier src/data/frise.json s’il a changé
git commit -m "Court résumé du changement"
git push -u origin nom-de-la-tache
```

Cloudflare publie alors une version de test de la branche, visible dans son tableau de bord. Si tout va bien, et si `npm run build` puis `npm run verifier` ne signalent rien :

```
git switch main
git pull
git merge nom-de-la-tache
git push
```

La branche `main` est le site en ligne. Le dépôt est public : le tableur et les fiches sont visibles par tous.

## Où modifier quoi

| Pour changer…                                                         | Où                                                                       |
|-----------------------------------------------------------------------|--------------------------------------------------------------------------|
| un mouvement, un groupe, un artiste, une œuvre, un événement, une relation, un terme | le tableur                                                |
| la couleur d’un mouvement                                             | la colonne « Couleur » de l’onglet Mouvements                            |
| le texte d’une fiche, d’un parcours, d’une comparaison                | `fiches/<dossier>/<id>.md`                                               |
| un modèle de fiche                                                    | `fiches/_gabarits/`                                                      |
| les vérifications des données                                         | `construire.py`                                                          |
| les couleurs et polices du site                                       | les variables `:root` de `public/style.css`, et `:root[data-theme="dark"]` pour le mode sombre |
| le titre, le sous-titre, les boutons de l’en-tête de la frise         | `src/pages/index.astro`                                                  |
| l’aide « Comment lire la frise », l’Index                             | `src/scripts/app.js`                                                     |
| les rubriques des fiches du panneau                                   | `src/lib/fiches.js`                                                      |
| la période affichée, l’année de départ, les zooms, la taille des cartes | l’objet `REGLAGES`, en haut de `src/scripts/app.js`                    |
| le nom court d’un artiste (« Van Gogh »)                              | `NOMS_COURTS`, dans `src/lib/outils.js`                                  |
| l’apparence des pages                                                 | `public/pages.css`                                                       |
| l’en-tête, le menu, le fil d’Ariane et le pied de page des pages     | `src/layouts/Base.astro`                                                 |
| la composition d’une page de mouvement, d’artiste ou d’œuvre          | `src/pages/mouvements/[id].astro`, `src/pages/artistes/[id].astro`, `src/pages/oeuvres/[id].astro` |
| la phrase de l’encart d’une œuvre protégée                            | `encartDroits()`, dans `src/lib/fiches.js`                               |
| la durée de protection des œuvres (70 ans)                            | `DUREE_PROTECTION`, en haut de `construire.py`                           |
| les répertoires et le catalogue                                       | `src/pages/mouvements/index.astro`, `src/pages/artistes/index.astro`, `src/pages/oeuvres/index.astro` |
| la description d’une page (moteurs de recherche)                      | le résumé court ou la phrase-clé du tableur ; pour la frise, les répertoires et les pages fixes, leur fichier dans `src/pages/` |
| l’adresse du site (canoniques, sitemap, robots.txt)                   | le champ `site` d’`astro.config.mjs`                                     |
| le texte de la page À propos, l’adresse de contact                    | `src/pages/a-propos.astro` (l’adresse : constante `COURRIEL`)            |
| ajouter une page fixe                                                 | son fichier dans `src/pages/`, puis `PAGES_FIXES` dans `src/pages/sitemap.xml.js` et dans `src/pages/plan-du-site.astro` ; `PIED` dans `Base.astro` ou `PAGES_SITE` dans `src/scripts/app.js` pour y mener |
| le contrôle des liens du site construit                               | `verifier_dist.mjs`                                                      |
| une ligne de liste, une carte, l’en-tête d’une fiche, le sommaire     | `src/components/`                                                        |
| quelles fiches ont une page, où mène un lien                          | `aUnePage()` et `adresse()`, dans `src/lib/fiches.js`                    |
| la source d’une image, le lien vers le musée                          | les colonnes « Crédit image » et « Lien de l’œuvre » de l’onglet Œuvres |