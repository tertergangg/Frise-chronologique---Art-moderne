# Conventions

Ces règles décrivent le style déjà en place dans le code. Le nouveau code doit leur ressembler.

## Langue
- Les noms de variables, de fonctions et de classes CSS sont en français, sans accents : `dessiner`, `oeuvres`, `REGLAGES`, `.panneau`.
- Les commentaires sont en français.
- Les mots imposés par un outil restent en anglais : Astro, npm, les noms de propriétés HTML et CSS.

## JavaScript
- JavaScript moderne et sans framework : `const` par défaut, `let` si la valeur change, jamais `var`.
- Guillemets doubles, points-virgules, indentation de deux espaces.
- Des fonctions courtes qui font une seule chose, avec un nom qui dit ce qu’elles font.
- Pas de nouveau nombre magique : un réglage qu’on peut vouloir modifier va dans `REGLAGES`, une valeur fixe dans une constante nommée. Le code existant en contient encore (largeurs sur téléphone, pas des flèches du clavier…) : on nomme une valeur quand on la touche.
- Un commentaire au-dessus de chaque bloc dont l’intention n’est pas évidente. On explique pourquoi, pas ce que dit déjà le code.
- Tout texte venant des données et inséré dans du HTML passe par `esc()`.

## CSS
- Les couleurs, polices et tailles passent par les variables de `:root`. Chaque nouvelle couleur a sa valeur pour le mode sombre.
- Exceptions voulues, identiques dans les deux modes :
  - le blanc (`#FFFFFF` et ses transparences) et les fonds noirs translucides posés sur les couleurs des mouvements ;
  - les lignes `--grille-bande`, tracées par-dessus ces couleurs ;
  - le voile de l’image en grand, écrit en dur car `::backdrop` ne voit pas toujours les variables.
- Pas de style écrit en dur dans index.astro (ni, plus tard, dans les autres gabarits). Dans app.js, l’attribut `style` ne sert qu’aux valeurs calculées : positions et largeurs (`left`, `width`) et couleur du mouvement (`--c`). Tout le reste va dans style.css.
- Une nouvelle règle va dans la section de son élément, et sa version téléphone dans le bloc `@media (max-width: 720px)` de cette section.
- On garde le focus visible et le respect de `prefers-reduced-motion`.

## Python (construire.py)
- Indentation de quatre espaces, noms en français.
- Toute nouvelle règle de cohérence passe par `avertir()`, pour être affichée avec les autres.

## Identifiants
- En minuscules, sans accents, avec des tirets : `van-gogh`, `les-demoiselles-d-avignon`.
- L’identifiant est le même dans le tableur (colonne ID), dans le nom de la fiche (`<id>.md`) et dans l’adresse de la page.
- Il est unique sur tout le site, tous types confondus.
- On ne le change plus une fois le site public (D9).

## Fiches
- Un en-tête YAML avec `id` et `type`, puis un titre `#`, puis les rubriques du gabarit correspondant dans `fiches/_gabarits/`.
- Pour lier une autre fiche : `[[id]]` ou `[[id|texte du lien]]`.
- Les commentaires `<!-- -->` des gabarits ne s’affichent pas.
- Les fiches mouvements et artistes n’ont pas de section « Sources ».

## Typographie des textes affichés
- Apostrophe typographique (’), guillemets français (« ») et tiret demi-cadratin entre deux dates (1874–1960).
- Dans le code, on garde les guillemets et apostrophes droits (' et ").

## Documents du projet
- Les six documents sont dans `projet/` (D12). Ils sont mis à jour à la clôture de chaque conversation, dans un commit à part.
- **JOURNAL** : 5 à 10 lignes par entrée (fait, reste à faire, décisions). Une entrée ne recopie pas les problèmes ouverts : la liste en tête du JOURNAL est tenue à jour, et un problème réglé en sort.
- Un défaut propre au téléphone va dans la ROADMAP, au lot 4, et pas dans la liste des problèmes ouverts.
- **ARCHITECTURE** décrit le flux, les fichiers, les formats et les principes, pas chaque fonction : le détail est dans les commentaires du code.

## Git
- Une branche par tâche, avec un nom court : `astro`, `pages-fiches`, `correction-recherche`.
- On fait un commit avant de demander une modification à Claude, puis un commit par étape qui fonctionne.
- Messages courts en français, qui décrivent le changement : « Recherche insensible aux accents ».
- On relit le diff dans VS Code avant chaque commit.
- On lance `python construire.py` avant tout commit qui touche le tableur ou les fiches.
