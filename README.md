# Frise de l’art moderne, 1874–1960

Un site gratuit d’histoire de l’art moderne, pour les étudiants et les curieux. Sa première partie est une frise chronologique interactive, de l’impressionnisme aux années 1960. Viendront ensuite une page par mouvement, par artiste et par œuvre, des parcours thématiques, puis une version anglaise.

Site en ligne (adresse provisoire) : https://frise-chronologique---art-moderne.tjimblet.workers.dev

## Comment ça marche

Le site a deux sources : le tableur et les fiches. Tout le reste est fabriqué à partir d’elles.

```
donnees/frise_art_moderne_base.xlsx ─┐
                                     ├─> python construire.py ─> public/data.js ─> npm run build ─> dist/ ─> Cloudflare
fiches/<type>/<id>.md ───────────────┘
```

- `construire.py` lit le tableur et les fiches, vérifie leur cohérence et écrit `public/data.js`.
- Astro fabrique le site dans `dist/`, à partir de `src/pages/index.astro` et du dossier `public/`.
- Cloudflare publie `dist/` à chaque `git push`.

Cloudflare n’a pas Python : `public/data.js` doit donc être enregistré dans Git, à jour.

## Organisation des fichiers

```
README.md              ce fichier
construire.py          tableur + fiches -> public/data.js
package.json           projet Astro : dépendance et commandes npm
astro.config.mjs       réglages d’Astro
wrangler.jsonc         réglages de Cloudflare
projet/                documents de suivi du projet (contexte, architecture, décisions, roadmap, conventions, journal)
donnees/
  frise_art_moderne_base.xlsx
fiches/
  mouvements/  artistes/  oeuvres/   une fiche = un fichier <id>.md
  _gabarits/                       modèles de fiches
  _en-attente/                     fiches sans ligne dans le tableur, ignorées par le site
src/
  pages/index.astro                structure de la page de la frise
public/                            copié tel quel sur le site
  style.css                        apparence
  app.js                           fonctionnement de la frise
  data.js                          FABRIQUÉ par construire.py : ne jamais le modifier à la main
  images/                          images des œuvres
```

## Installer (une seule fois)

1. Installe [Python](https://www.python.org). Sous Windows, coche « Add Python to PATH ».
2. Installe [Node.js](https://nodejs.org), dans une version au moins égale à celle du champ `engines` de `package.json`.
3. Ouvre un terminal dans le dossier du projet (dans VS Code : Terminal > Nouveau terminal), puis tape :
   ```
   pip install openpyxl
   npm install
   ```

## Travailler sur le contenu

1. **Tableur** : modifie `donnees/frise_art_moderne_base.xlsx` dans Excel. Garde son nom et son format .xlsx.
2. **Fiches** : rédige-les dans VS Code. Pour lier une autre fiche : `[[derain]]`, ou `[[derain|Derain]]` pour choisir le texte du lien.
3. **Construire** : `python construire.py`. Le script affiche le nombre de fiches rédigées et les points à vérifier : identifiant inconnu ou en double, fiche manquante, fiche sans ligne dans le tableur, année absente, lien `[[id]]` cassé, chemin d’image relatif ou image introuvable. L’avertissement `Data Validation extension is not supported` d’openpyxl est sans danger.
4. **Voir le résultat** : `npm run dev`, puis ouvre l’adresse affichée dans le terminal. Recharge la page après chaque modification ; `Ctrl + C` arrête l’aperçu. Pour tester la version qui sera publiée : `npm run build`, puis `npm run preview`.

Une fiche s’affiche dès qu’elle contient du vrai texte. Sinon, le site indique « fiche à venir ».

## Ajouter un mouvement, un artiste ou une œuvre

1. Ajoute sa ligne dans l’onglet correspondant du tableur.
2. Copie le gabarit de `fiches/_gabarits/` dans `fiches/mouvements/`, `fiches/artistes/` ou `fiches/oeuvres/`, et renomme-le avec l’identifiant : `fiches/artistes/van-dongen.md`.
3. Lance `python construire.py` pour vérifier.

L’identifiant s’écrit en minuscules, sans accents, avec des tirets (`les-demoiselles-d-avignon`). C’est le même dans la colonne ID, dans le nom de la fiche et dans l’adresse de la page, et il est unique sur tout le site. Une fois le site ouvert au public, on ne le change plus : cela casserait les liens.

Une fiche rédigée avant que sa ligne existe va dans `fiches/_en-attente/<type>/`. On la ramène dans son dossier en ajoutant la ligne.

## Publier

Une branche par tâche, testée sur sa version de test avant d’aller dans `main` :

```
git switch -c nom-de-la-tache
python construire.py                 si le tableur ou les fiches ont changé
git status                           puis relire le diff dans VS Code
git add <fichier>                    un par un, sans oublier public/data.js s’il a changé
git commit -m "Court résumé du changement"
git push -u origin nom-de-la-tache
```

Cloudflare publie alors une version de test de la branche, visible dans son tableau de bord. Si tout va bien :

```
git switch main
git pull
git merge nom-de-la-tache
git push
```

La branche `main` est le site en ligne. Dans le tableau de bord de Cloudflare, la « Build command » de la production reste vide : c’est `wrangler.jsonc` qui lance `npm run build`.

Le dépôt est public : le tableur et les fiches sont visibles par tous.

## Où modifier quoi

| Pour changer…                                                    | Où                                                                                                             |
|------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| un mouvement, un artiste, une œuvre, un événement, une influence | le tableur                                                                                                     |
| la couleur d’un mouvement                                        | la colonne « Couleur » du tableur                                                                              |
| le texte d’une fiche                                             | `fiches/<type>/<id>.md`                                                                                        |
| les couleurs et polices du site                                  | les variables `:root` de la section « Variables » de `public/style.css`, et `:root[data-theme="dark"]` pour le mode sombre |
| le titre, le sous-titre, les boutons de l’en-tête                | `src/pages/index.astro`                                                                                        |
| l’aide « Comment lire la frise », les rubriques des fiches, l’Index | `public/app.js`                                                                                             |
| la période affichée, l’année de départ, l’échelle des zooms, la taille des cartes | l’objet `REGLAGES`, en haut de `public/app.js`                                                |
| le nom court d’un artiste (« Van Gogh »)                         | `NOMS_COURTS`, dans `public/app.js`                                                                            |