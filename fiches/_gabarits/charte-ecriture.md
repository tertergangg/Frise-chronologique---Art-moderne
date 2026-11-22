# Charte d’écriture des fiches œuvres

À relire avant chaque fiche. Elle détaille D62. Les exemples viennent des deux fiches de référence : *La Danse* (`fiches/oeuvres/la-danse-matisse.md`, analysée) et *La Femme au chapeau* (documentée).

Ce dossier n’est pas lu par construire.py : ce fichier n’apparaît pas sur le site.

---

## L’intention

Le lecteur vient comprendre pourquoi une œuvre compte, apprendre à la regarder, et la ressentir. Le texte doit être à la hauteur de l’œuvre : émerveillé, incisif, jamais neutre. Ce n’est pas une notice de musée. Ce n’est pas non plus une lettre à un ami : le ton reste soutenu, et la force passe par le rythme et les images, pas par la familiarité.

## La voix

- Le lecteur est embarqué par « nous » ou « on ». Il n’est jamais interpellé : ni « vous », ni « tu ».
- Pas de « je ». Pas de mots crus.
- Le présent de narration : « Matisse balaie tout cela », pas « Matisse balaya ».
- L’émerveillement s’assume, mais il se gagne. Il vient après un détail concret, jamais à sa place.

## Les procédés à garder

**L’alternance d’une phrase longue et de phrases très courtes.** La longue décrit, les courtes frappent.
> Cinq corps nus, rouges, se tiennent par la main et tournent sur une colline verte, sous un ciel bleu. Rien d’autre.

**La question du sceptique, puis la réponse.** On formule le doute du lecteur avant lui, pour le retourner. Une question par rubrique au plus.
> Un rouge, un bleu, un vert. Est-ce bien sérieux, pour une toile de près de quatre mètres ?

**La comparaison avec ce qui précède.** L’Académie, la tradition, une version antérieure de l’œuvre : la rupture ne se mesure qu’à ce qu’elle brise.
> Pendant des siècles, un portrait se jugeait à la peau : nacrée, rosée, si lisse qu’on en oubliait le pinceau.

**Un détail concret à regarder.** Dire où poser les yeux. C’est ce qui apprend à regarder, et ce qu’aucune autre fiche ne pourrait dire.
> Il faut regarder le premier plan, à gauche. Deux danseurs tendent le bras l’un vers l’autre, et leurs mains ne se touchent pas.

**L’accueil de l’époque comme preuve de l’audace.** Les rires, les sarcasmes, le collectionneur qui recule : ils mesurent la rupture mieux qu’un adjectif.
> Exposée au Salon d’automne de 1910, la toile est accueillie par des sarcasmes. Chtchoukine lui-même recule, avant de se raviser.

**Une pointe d’ironie par fiche, pas plus.**
> L’équilibre et la pureté, *La Danse* les a. La tranquillité, beaucoup moins.

**La chute.** La dernière phrase d’une rubrique, et surtout de la fiche, retourne l’idée ou la condense en une image.
> Le fauvisme vient de naître, et il a le visage de Madame Matisse.
> Nous ne regardons pas *La Danse* : nous entrons dans la ronde.

## À proscrire

**Les antithèses abstraites toutes faites.** Elles sonnent juste et ne disent rien : on pourrait les écrire sur n’importe quelle œuvre. C’est ce qui fait « texte d’IA ».

Avant :
> Qui a déjà vu une peau verte ? Personne, et Matisse le sait. La couleur ne copie plus le modèle : elle dit ce que le peintre éprouve devant lui. Le portrait cesse d’être une ressemblance pour devenir une sensation.

Après :
> Pendant des siècles, un portrait se jugeait à la peau : nacrée, rosée, si lisse qu’on en oubliait le pinceau. Matisse, lui, laisse chaque coup de brosse à vif et pose ses couleurs à pleine charge. Ce visage-là n’existe nulle part, sauf dans son œil. Et c’est lui qu’il nous jette en pleine figure.

La seconde version compare, montre un geste précis, et finit sur une image.

**Les formules à bannir**, et leurs cousines :
- « X cesse d’être Y pour devenir Z »
- « Personne, et il le sait »
- « Rien n’est à sa place, et pourtant tout tient »
- « Plus qu’un tableau, c’est… »
- « Il ne s’agit pas de…, mais de… », quand rien de concret ne suit

**Les intensifs empilés.** « Complètement », « totalement », « absolument », « véritablement » : un seul par fiche, et seulement s’il porte. À force, ils s’annulent.

**Les superlatifs vides.** « Chef-d’œuvre absolu », « génie incontesté », « œuvre incontournable » : montrer pourquoi, au lieu de l’affirmer.

**La même idée redite.** Dans 150 mots, une idée forte, dite une fois.

**Le jargon non expliqué.** Un mot technique (aplat, cerne, perspective) s’explique dans la phrase même.

**Une interprétation présentée comme un fait.** Elle s’annonce : « On y a souvent vu… », « On peut y lire… ».

## Les formats

**Œuvre non majeure : documentée.** La présentation seule, 100 à 150 mots, en trois rubriques construites comme une seule courbe :
- **Ce qu’on voit** : ce que l’œil rencontre, concrètement, avant toute idée.
- **Ce qui est nouveau** : la rupture, mesurée à ce qui précède.
- **Contexte** : la date, le lieu, l’accueil, ce qui suit ; la rubrique finit sur la chute de la fiche.

La fiche courte se suffit à elle-même : elle ne doit pas ressembler au début d’une analyse coupée.

**Œuvre majeure : analysée.** La même présentation, puis une analyse sous `## Analyse`, d’environ 500 mots (400 à 600) :
- trois à cinq intertitres `###`, propres à l’œuvre, courts et intrigants : « La main qui manque », pas « Composition » ;
- une idée par intertitre ;
- le dernier dit pourquoi l’œuvre compte encore, et finit sur le ressenti.

**Le « Résumé » du tableur.** Une phrase de 10 à 15 mots : elle sert de chapeau à la page et de description dans Google.
> Cinq corps rouges, trois couleurs, une ronde : avec presque rien, Matisse peint l’élan pur.

## La forme

- Apostrophe typographique (’) et guillemets français (« »).
- Les titres d’œuvres en italique : *La Musique*.
- Liens : un seul par cible, à la première mention. `[[id]]` affiche le nom de la fiche avec sa majuscule ; en milieu de phrase, donner le libellé : `[[fauvisme|fauvisme]]`, `[[matisse|Matisse]]`.
- Les citations sont brèves, entre guillemets, avec leur source dans la phrase.
- Les chiffres parlent mieux arrondis : « près de quatre mètres » plutôt que « 260 × 391 cm », que donne déjà le cartel.

## Les faits

- Chaque fait se vérifie avant publication, avec le site du musée ou un ouvrage : date, lieu de conservation, commanditaire, accueil, anecdotes.
- Une anecdote qu’on ne peut pas vérifier sort de la fiche, même si elle est belle.
- En cas de doute sur une date ou une attribution, on le dit ou on n’en parle pas.

## Avant de valider une fiche

- [ ] La longueur est dans la cible : 100 à 150 mots pour la présentation, 400 à 600 pour l’analyse.
- [ ] Il y a au moins un détail concret à regarder.
- [ ] La rupture est comparée à ce qui précède.
- [ ] Chaque rubrique finit sur une phrase qui frappe ; la fiche, sur une chute.
- [ ] Aucune formule de la liste à proscrire, et au plus un intensif.
- [ ] Ni « vous », ni « tu », ni « je ».
- [ ] Les liens ont le bon libellé, et les titres d’œuvres sont en italique.
- [ ] Les faits sont vérifiés, les interprétations annoncées comme telles.
- [ ] Relue à voix haute : si une phrase sonne comme n’importe quel texte sur l’art, la réécrire.
