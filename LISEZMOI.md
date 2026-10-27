# Frise de l’art moderne, 1874–1960

## Ce que contient ce dossier

- `donnees/` : le tableur (mouvements, artistes, œuvres, événements, influences).
- `fiches/` : les fiches détaillées en Markdown. Ouvre ce dossier dans Obsidian (« Ouvrir un dossier comme coffre »).
- `docs/` : le site. `index.html` est la page, `style.css` son apparence, `app.js` son fonctionnement, `data.js` les données.
- `construire.py` : le script qui transforme le tableur et les fiches en `docs/data.js`.

## Installation (une seule fois)

1. Installe Python depuis python.org. Sous Windows, coche « Add Python to PATH » pendant l’installation.
2. Ouvre un terminal dans ce dossier.
   - Windows : dans l’explorateur, clic droit dans le dossier, puis « Ouvrir dans le terminal ».
   - Mac : ouvre Terminal, tape `cd ` (avec l’espace), glisse le dossier dans la fenêtre, puis Entrée.
3. Tape `pip install openpyxl` puis Entrée.

## Le cycle de travail

1. **Tableur** : modifie-le dans Google Sheets, puis Fichier > Télécharger > Microsoft Excel (.xlsx). Remplace `donnees/frise_art_moderne_base.xlsx` par ce fichier, en gardant exactement le même nom.
2. **Fiches** : rédige-les dans Obsidian. Pour lier une autre fiche, écris son identifiant entre doubles crochets : `[[derain]]`, ou `[[derain|Derain]]` pour choisir le texte du lien.
3. **Construction** : dans le terminal, tape `python construire.py`. Le script affiche le nombre de fiches rédigées et la liste des points à vérifier (identifiant inconnu, fiche manquante, année absente).
4. **Aperçu** : double-clique sur `docs/index.html`. Une fiche s’affiche sur le site dès qu’elle contient du vrai texte ; sinon, la mention « fiche à venir » apparaît.

## Ajouter un élément

Ajoute la ligne dans le tableur, puis crée sa fiche en copiant le gabarit correspondant de `fiches/_gabarits/` dans le bon dossier, renommé avec l’identifiant (par exemple `fiches/artistes/van-dongen.md`).

## Mettre le site en ligne (GitHub Pages, gratuit)

1. Crée un compte sur github.com et installe GitHub Desktop.
2. Dans GitHub Desktop : File > Add local repository, choisis ce dossier, puis accepte de créer un dépôt.
3. Clique sur « Publish repository ». Avec un compte gratuit, le dépôt doit être public pour que le site fonctionne : le tableur et les fiches seront donc visibles aussi.
4. Sur github.com, ouvre ton dépôt, puis Settings > Pages. Choisis « Deploy from a branch », la branche `main` et le dossier `/docs`, puis Save. Ton site sera disponible quelques minutes plus tard à l’adresse `https://ton-pseudo.github.io/nom-du-depot/`.
5. Pour chaque mise à jour : lance `python construire.py`, puis dans GitHub Desktop, écris un court résumé, clique sur « Commit », puis sur « Push origin ».

## Où modifier quoi

- Couleurs et polices : le haut de `docs/style.css` (les variables du bloc `:root`).
- Couleur d’un mouvement : la colonne « Couleur » du tableur.
- Textes de l’interface : `docs/index.html`.
- Réglages de la frise (période affichée au départ, zoom) : le bloc `new vis.Timeline` dans `docs/app.js`.
