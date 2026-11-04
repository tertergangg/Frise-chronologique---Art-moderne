# Contexte du projet

## En bref
Un site gratuit d’histoire de l’art moderne, pour les étudiants et les curieux. Il est né de la « Bible de l’art », un document personnel de son auteur sur la peinture, surtout moderne. Sa première brique est une frise chronologique interactive de l’art moderne, d’environ 1874 à 1960. La frise ne sera qu’une partie du site : chaque fiche aura ensuite sa propre page, puis viendront des parcours thématiques et une version anglaise.

## L’auteur
Térence, étudiant, seul à développer et à maintenir le site. Il n’est pas développeur, mais il utilise Git, GitHub et VS Code, et il apprend Python et JavaScript. Il veut comprendre le code de son site pour pouvoir le retoucher lui-même.

## Objectifs, par ordre de priorité
1. Une frise claire et agréable, qui garde son design actuel.
2. Un site bien référencé sur Google, grâce à une page par mouvement, par artiste et par œuvre.
3. Un site gratuit à héberger et simple à mettre à jour.
4. Plus tard : des parcours thématiques, puis une version anglaise.

## Contraintes
- **Hébergement** : Cloudflare, avec un compte lié à GitHub. Le code est dans le dépôt public `tertergangg/Frise-chronologique---Art-moderne`.
- **Adresse** : un nom de domaine en .com, sans « github » dans l’adresse. Le nom du site n’est pas encore choisi.
- **Coût** : nul, en dehors du nom de domaine.
- **Simplicité** : une seule personne, débutante, maintient le site. Une solution simple et compréhensible vaut mieux qu’une solution techniquement élégante.
- **Droits** : le tableur prévoit une colonne « Domaine public ? » pour les artistes et les œuvres. Les droits sur les images sont donc un point à surveiller.

## Le contenu
- Le **tableur Excel** `donnees/frise_art_moderne_base.xlsx` est la base de données du site. Il contient les mouvements, les artistes, les œuvres, les événements et les influences. Il est modifié dans Excel.
- Les **fiches** sont en Markdown, dans `fiches/`, et sont modifiées dans VS Code.
  - Les fiches mouvements et artistes ont été rédigées avec Claude à partir de la Bible, dans le style de l’auteur, sans plagiat et sans section « Sources ». Elles conservent ses citations.
  - L’auteur rédige lui-même les fiches œuvres.
- Ce projet Claude porte sur le **code** du site. On ne touche au texte des fiches que sur demande explicite.
