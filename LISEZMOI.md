# Frise de l’art moderne, 1874–1960

## Ce que contient ce dossier

- `donnees/` : le tableur Excel (mouvements, artistes, œuvres, événements, influences).
- `fiches/` : les fiches détaillées en Markdown, une par fichier `<id>.md`.
  - `mouvements/`, `artistes/`, `oeuvres/` : les fiches que lit le site.
  - `_gabarits/` : les modèles à copier pour créer une fiche.
  - `_en-attente/` : des fiches dont l’élément n’a pas encore de ligne dans le tableur. Le site ne les lit pas.
- `construire.py` : le script qui transforme le tableur et les fiches en `public/data.js`.
- `src/pages/index.astro` : la structure de la page de la frise.
- `public/` : les fichiers publiés tels quels. `style.css` est l’apparence, `app.js` le fonctionnement, `data.js` les données, `images/` les images des œuvres.
- `package.json` et `astro.config.mjs` : le projet Astro, qui fabrique le site. `wrangler.jsonc` : les réglages de Cloudflare, qui le publie.

`public/data.js` est fabriqué par `construire.py` : ne le modifie jamais à la main.

## Installation (une seule fois)

1. Installe Python depuis python.org. Sous Windows, coche « Add Python to PATH » pendant l’installation.
2. Installe Node.js depuis nodejs.org, dans une version au moins égale à celle indiquée dans `package.json` (champ `engines`).
3. Ouvre un terminal dans ce dossier.
   - Dans VS Code : Terminal > Nouveau terminal.
   - Windows : dans l’explorateur, clic droit dans le dossier, puis « Ouvrir dans le terminal ».
   - Mac : ouvre Terminal, tape `cd ` (avec l’espace), glisse le dossier dans la fenêtre, puis Entrée.
4. Tape `pip install openpyxl`, puis Entrée.
5. Tape `npm install`, puis Entrée. Cela installe Astro dans le dossier `node_modules/`, que Git ignore.

## Le cycle de travail

1. **Tableur** : modifie `donnees/frise_art_moderne_base.xlsx` dans Excel, et enregistre-le au même endroit, sous le même nom et au format .xlsx.
2. **Fiches** : rédige-les dans VS Code. Pour lier une autre fiche, écris son identifiant entre doubles crochets : `[[derain]]`, ou `[[derain|Derain]]` pour choisir le texte du lien.
3. **Construction** : dans le terminal, tape `python construire.py`. Le script affiche le nombre de fiches rédigées et la liste des points à vérifier (identifiant inconnu ou en double, fiche manquante, fiche sans ligne dans le tableur, année absente). L’avertissement d’openpyxl `Data Validation extension is not supported` est sans danger : il vient des listes déroulantes du tableur.
4. **Aperçu** : tape `npm run dev`, puis ouvre dans ton navigateur l’adresse affichée dans le terminal (en général `http://localhost:4321`). Recharge la page après chaque modification. `Ctrl + C` arrête l’aperçu. Une fiche s’affiche dès qu’elle contient du vrai texte ; sinon, la mention « fiche à venir » apparaît.

## Ajouter un élément

Ajoute la ligne dans le tableur, puis crée sa fiche en copiant le gabarit correspondant de `fiches/_gabarits/` dans le bon dossier, renommé avec l’identifiant (par exemple `fiches/artistes/van-dongen.md`).

L’identifiant s’écrit en minuscules, sans accents, avec des tirets (`les-demoiselles-d-avignon`). C’est le même dans la colonne ID du tableur, dans le nom de la fiche et dans l’adresse de la page, et il doit être unique sur tout le site. Une fois le site ouvert au public, on ne le change plus : cela casserait les liens.

Une fiche prête avant sa ligne du tableur va dans `fiches/_en-attente/<type>/`. Ramène-la dans son dossier quand tu ajoutes la ligne ; sinon, `construire.py` signale une fiche manquante.

## Mettre le site en ligne (Cloudflare, gratuit)

Le site est hébergé par Cloudflare, relié au dépôt GitHub. À chaque `git push`, Cloudflare fabrique le site avec Astro (la commande `npm run build`, indiquée dans `wrangler.jsonc`) et publie le résultat. Cloudflare n’a pas Python : c’est pour cela que `public/data.js` est enregistré dans Git.

- La branche `main` est le site en ligne : https://frise-chronologique---art-moderne.tjimblet.workers.dev
- Toute autre branche reçoit une version de test, visible dans le tableau de bord de Cloudflare.
- Dans le tableau de bord, la « Build command » de la production reste vide : c’est `wrangler.jsonc` qui lance la fabrication.
- Le dépôt est public : le tableur et les fiches sont donc visibles aussi.
- GitHub Pages n’est plus utilisé depuis le 4 novembre 2026.

Pour chaque mise à jour :

1. Crée une branche pour la tâche : `git switch -c nom-de-la-tache`.
2. Si tu as modifié le tableur ou les fiches, lance `python construire.py`.
3. Lance `git status`, relis le diff dans VS Code, puis ajoute les fichiers un par un avec `git add`, sans oublier `public/data.js` s’il a changé.
4. Tape `git commit -m "Court résumé du changement"`, puis `git push -u origin nom-de-la-tache`.
5. Vérifie la version de test sur Cloudflare.
6. Fusionne dans `main` :
   ```
   git switch main
   git pull
   git merge nom-de-la-tache
   git push
   ```

## Où modifier quoi

- Couleurs et polices : les variables du bloc `:root` de la section « Apparence » de `public/style.css`, et le bloc `:root[data-theme="dark"]` qui le suit, pour le mode sombre. Chaque couleur doit avoir une valeur dans les deux.
- Couleur d’un mouvement : la colonne « Couleur » du tableur.
- Textes fixes de la page (titre, sous-titre, boutons) : `src/pages/index.astro`.
- Textes fabriqués par le script (aide « Comment lire la frise », rubriques des fiches, Index) : `public/app.js`.
- Réglages de la frise (période affichée, année de départ, échelle des zooms Détail et Moyen, taille des cartes, marges de la vue mouvement) : l’objet `REGLAGES`, en haut de `public/app.js`.
- Nom court d’un artiste, quand le dernier mot de son nom ne convient pas (« Van Gogh ») : `NOMS_COURTS`, dans `public/app.js`.