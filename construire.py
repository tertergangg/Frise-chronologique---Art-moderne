"""
construire.py — transforme le tableur et les fiches en données pour le site.

Utilisation (depuis le dossier du projet) :
    python construire.py

Ce que fait le script :
  1. lit le tableur  donnees/frise_art_moderne_base.xlsx (mouvements, groupes, artistes, œuvres, événements, influences, glossaire)
  2. lit les fiches   fiches/mouvements, fiches/artistes, fiches/oeuvres (et en déduit le niveau des œuvres),
                      puis fiches/parcours et fiches/comparaisons
  3. vérifie la cohérence (identifiants inconnus, fiches manquantes ou sans ligne dans le tableur…)
  4. écrit            src/data/frise.json, que lit la frise (par src/lib/donnees.js)

src/data/frise.json est commité (décision D8) : relancer le script avant chaque commit
qui touche le tableur ou les fiches.

Prérequis : pip install openpyxl
"""
import json, re, sys
from pathlib import Path
from openpyxl import load_workbook

ICI = Path(__file__).parent
TABLEUR = ICI / "donnees" / "frise_art_moderne_base.xlsx"
FICHES = ICI / "fiches"
SORTIE = ICI / "src" / "data" / "frise.json"
PUBLIC = ICI / "public"

avertissements = []


def avertir(msg):
    avertissements.append(msg)


def typo(texte):
    """Apostrophes typographiques pour l'affichage (les identifiants ne sont jamais modifiés)."""
    if not isinstance(texte, str):
        return texte
    return texte.replace("'", "\u2019")

def majuscule(texte):
    """Majuscule à la première lettre, sans toucher au reste : « peintre, sculpteur » -> « Peintre, sculpteur »."""
    if not isinstance(texte, str) or not texte:
        return texte
    return texte[0].upper() + texte[1:]


def lire_onglet(wb, nom):
    """Renvoie une liste de dictionnaires {en-tête: valeur}, une par ligne remplie."""
    if nom not in wb.sheetnames:
        sys.exit(f"Onglet introuvable dans le tableur : « {nom} »")
    ws = wb[nom]
    lignes = list(ws.iter_rows(values_only=True))
    entetes = [str(h).strip() if h else "" for h in lignes[0]]
    resultat = []
    for ligne in lignes[1:]:
        d = dict(zip(entetes, ligne))
        if d.get("ID"):
            resultat.append({k: (v.strip() if isinstance(v, str) else v) for k, v in d.items()})
    return resultat


def sans_texte(texte):
    """Vrai si le texte ne contient encore aucun vrai texte : seulement des titres, les commentaires du gabarit,
    des puces vides… La limite est d'une vingtaine de lettres ou de chiffres."""
    reste = re.sub(r"<!--.*?-->", "", texte, flags=re.S)                 # commentaires du gabarit
    reste = re.sub(r"^#+ .*$|^[-*>]\s*$|\*\*\.+\*\*\s*:", "", reste, flags=re.M)
    return len(re.sub(r"\W", "", reste)) < 20

def lire_fiche(dossier, ident):
    """Renvoie (markdown, vide). « vide » = la fiche ne contient encore aucun vrai texte."""
    chemin = FICHES / dossier / f"{ident}.md"
    if not chemin.exists():
        avertir(f"Fiche manquante : {chemin.relative_to(ICI)}")
        return "", True
    texte = chemin.read_text(encoding="utf-8")
    texte = re.sub(r"^---\n.*?\n---\n", "", texte, flags=re.S)       # en-tête YAML
    texte = re.sub(r"^# .*\n", "", texte, count=1, flags=re.M)         # titre (déjà affiché)
    vide = sans_texte(texte)
    return ("" if vide else texte.strip()), vide

# Le titre qui ouvre l'analyse d'une fiche œuvre (D21) : il doit être écrit exactement ainsi, seul sur sa ligne
TITRE_ANALYSE = re.compile(r"^## Analyse[ \t]*$", flags=re.M)

def niveau_oeuvre(ident, md, vide):
    """Le niveau d'une œuvre, déduit de sa fiche (D21) : renvoie (niveau, markdown à afficher).
    « referencee » : fiche vide. « analysee » : la partie qui suit « ## Analyse » contient du vrai texte.
    « documentee » : tout le reste. Une analyse vide est retirée du Markdown, pour que son titre ne s'affiche pas seul."""
    if vide:
        return "referencee", md
    morceaux = TITRE_ANALYSE.split(md)
    if len(morceaux) > 2:
        avertir(f"Fiche {ident} : le titre « ## Analyse » est écrit plusieurs fois")
    presentation, analyse = morceaux[0], "".join(morceaux[1:])
    if sans_texte(analyse):
        return "documentee", presentation.strip()
    if sans_texte(presentation):
        avertir(f"Fiche {ident} : analyse rédigée, mais présentation vide")
    return "analysee", md

def verifier_orphelines(dossier, ids):
    """Signale les fiches d'un dossier qui ne correspondent à aucune ligne du tableur.
    Le site ne les affiche pas : sans cet avertissement, elles passeraient inaperçues."""
    for chemin in sorted((FICHES / dossier).glob("*.md")):
        if chemin.stem not in ids:
            avertir(f"Fiche sans ligne dans le tableur : {chemin.relative_to(ICI)}")

def verifier_liens(elements, ids, ids_pas_encore_affiches=frozenset()):
    """Signale les liens [[id]] ou [[id|texte]] des fiches qui ne mèneraient nulle part.
    « ids_pas_encore_affiches » : des identifiants valides, mais que la frise ne sait pas encore afficher.
    La forme attendue est celle de la fonction markdown() de src/lib/fiches.js : les deux règles doivent rester identiques."""
    for x in elements:
        texte = re.sub(r"<!--.*?-->", "", x["fiche"], flags=re.S)   # les commentaires ne s'affichent pas
        for contenu in re.findall(r"\[\[([^\]]*)\]\]", texte):
            forme = re.fullmatch(r"([a-z0-9-]+)(?:\|[^\]]+)?", contenu)
            if not forme:
                avertir(f"Fiche {x['id']} : lien mal formé « [[{contenu}]] » "
                        "(identifiant en minuscules, sans accents ni espaces)")
            elif forme.group(1) not in ids:
                avertir(f"Fiche {x['id']} : lien vers un identifiant inconnu « {forme.group(1)} »")
            elif forme.group(1) in ids_pas_encore_affiches:
                avertir(f"Fiche {x['id']} : lien vers « {forme.group(1)} », que la frise ne sait pas encore afficher "
                        "(elle montrerait l'identifiant, sans lien utile)")

def verifier_image(oeuvre):
    """Signale un chemin d'image qui casserait sur les pages de la phase 2, ou un fichier absent de public/."""
    image = oeuvre["image"]
    if not isinstance(image, str) or image.startswith(("http://", "https://")):
        return   # pas d'image, ou image sur un autre site : rien à vérifier ici
    if not image.startswith("/"):
        avertir(f"Œuvre {oeuvre['id']} : chemin d'image relatif « {image} » "
                f"(il doit commencer par /, par exemple « /{image} »)")
    elif not (PUBLIC / image.lstrip("/")).exists():
        avertir(f"Œuvre {oeuvre['id']} : image introuvable dans public/ « {image} »")

def annees_ecrites(texte):
    """Les années que couvre une date affichée : « 1884-1886 » -> (1884, 1886), « vers 1893 » -> (1893, 1893),
    « années 1920 » -> (1920, 1929). Renvoie None si le texte ne contient aucune année."""
    if not isinstance(texte, str):
        return None
    annees = [int(a) for a in re.findall(r"\b\d{4}\b", texte)]
    if not annees:
        return None
    fin = max(annees)
    if re.search(rf"années {fin}\b", texte):   # une décennie entière
        fin += 9
    return min(annees), fin

def verifier_date(oeuvre):
    """Signale une œuvre dont l'année (qui place la carte sur la frise) sort de sa date affichée (celle de la fiche)."""
    bornes = annees_ecrites(oeuvre["dateAffichee"])
    if bornes and oeuvre["annee"] is not None and not bornes[0] <= oeuvre["annee"] <= bornes[1]:
        avertir(f"Œuvre {oeuvre['id']} : l'année {oeuvre['annee']} ne correspond pas à la date affichée "
                f"« {oeuvre['dateAffichee']} »")

def annee(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None

def decouper(valeur):
    """Découpe une cellule « a, b, c » en liste ["a", "b", "c"], sans les morceaux vides."""
    if not isinstance(valeur, str):
        return []
    return [morceau.strip() for morceau in valeur.split(",") if morceau.strip()]

def lire_autres(valeur, ident, ids_mouv, noms_mouv):
    """Découpe la colonne « Autres mouvements » en liste d'identifiants.
    Une valeur inconnue est signalée et gardée en texte simple, pour être affichée sans lien."""
    liste = []
    for morceau in decouper(valeur):
        if morceau not in ids_mouv:
            suggestion = noms_mouv.get(typo(morceau).lower())
            conseil = f" (identifiant : « {suggestion} » ?)" if suggestion else ""
            avertir(f"Artiste {ident} : autre mouvement inconnu « {morceau} »{conseil}")
            morceau = majuscule(typo(morceau))
        liste.append(morceau)
    return liste

def lire_mouvements(wb):
    """Onglet Mouvements, avec les fiches de fiches/mouvements."""
    mouvements = []
    for m in lire_onglet(wb, "Mouvements"):
        md, vide = lire_fiche("mouvements", m["ID"])
        mouvements.append({
            "id": m["ID"], "nom": typo(m.get("Nom")), "debut": annee(m.get("Début")), "fin": annee(m.get("Fin")),
            "lieu": typo(m.get("Lieu")), "couleur": m.get("Couleur") or "#777777",
            "resume": typo(m.get("Résumé court (1 phrase)")), "fiche": md, "ficheVide": vide,
        })
    return mouvements

def lire_groupes_artiste(valeur, ident, ids_groupes, noms_groupes):
    """Découpe la colonne « Groupes » d'un artiste en liste d'identifiants.
    Une valeur inconnue est signalée et écartée : un groupe n'existe que par sa ligne dans l'onglet Groupes."""
    liste = []
    for morceau in decouper(valeur):
        if morceau in ids_groupes:
            liste.append(morceau)
            continue
        suggestion = noms_groupes.get(typo(morceau).lower())
        conseil = f" (identifiant : « {suggestion} » ?)" if suggestion else ""
        avertir(f"Artiste {ident} : groupe inconnu « {morceau} »{conseil}")
    return liste

def lire_groupes(wb, ids_mouv):
    """Onglet Groupes (pas de fiche, D22). Vérifie le mouvement de rattachement et l'ordre des dates."""
    groupes = []
    for g in lire_onglet(wb, "Groupes"):
        if g.get("Mouvement") not in ids_mouv:
            avertir(f"Groupe {g['ID']} : mouvement inconnu « {g.get('Mouvement')} »")
        debut, fin = annee(g.get("Début")), annee(g.get("Fin"))
        if debut is not None and fin is not None and debut > fin:
            avertir(f"Groupe {g['ID']} : début ({debut}) après la fin ({fin})")
        groupes.append({
            "id": g["ID"], "nom": typo(g.get("Nom")), "mouvement": g.get("Mouvement"),
            "debut": debut, "fin": fin, "lieu": typo(g.get("Lieu")),
            "resume": typo(g.get("Résumé court (1 phrase)")),
        })
    return groupes

def lire_artistes(wb, ids_mouv, noms_mouv, ids_groupes, noms_groupes):
    """Onglet Artistes, avec les fiches de fiches/artistes. Vérifie le mouvement principal et les groupes."""
    artistes = []
    for a in lire_onglet(wb, "Artistes"):
        md, vide = lire_fiche("artistes", a["ID"])
        if a.get("Mouvement principal") not in ids_mouv:
            avertir(f"Artiste {a['ID']} : mouvement inconnu « {a.get('Mouvement principal')} »")
        artistes.append({
            "id": a["ID"], "nom": typo(a.get("Nom complet")), "naissance": annee(a.get("Naissance")),
            "deces": annee(a.get("Décès")), "nationalite": majuscule(typo(a.get("Nationalité"))),
            "role": majuscule(typo(a.get("Rôle"))),
            "mouvement": a.get("Mouvement principal"),
            "autres": lire_autres(a.get("Autres mouvements"), a["ID"], ids_mouv, noms_mouv),
            "groupes": lire_groupes_artiste(a.get("Groupes"), a["ID"], ids_groupes, noms_groupes),
            "phrase": typo(a.get("Phrase-clé (1 phrase)")), "fiche": md, "ficheVide": vide,
        })
    return artistes

def lire_oeuvres(wb, ids_mouv, ids_art):
    """Onglet Œuvres, avec les fiches de fiches/oeuvres. Vérifie l'artiste, le mouvement et l'année."""
    oeuvres = []
    for o in lire_onglet(wb, "Œuvres"):
        md, vide = lire_fiche("oeuvres", o["ID"])
        niveau, md = niveau_oeuvre(o["ID"], md, vide)
        if o.get("Artiste (ID)") not in ids_art:
            avertir(f"Œuvre {o['ID']} : artiste inconnu « {o.get('Artiste (ID)')} »")
        if o.get("Mouvement") not in ids_mouv:
            avertir(f"Œuvre {o['ID']} : mouvement inconnu « {o.get('Mouvement')} »")
        if annee(o.get("Année")) is None:
            avertir(f"Œuvre {o['ID']} : année manquante, elle n'apparaîtra pas sur la frise")
        oeuvres.append({
            "id": o["ID"], "titre": typo(o.get("Titre")), "artiste": o.get("Artiste (ID)"),
            "annee": annee(o.get("Année")), "mouvement": o.get("Mouvement"),
            "dateAffichee": typo(o.get("Date affichée")), "type": typo(o.get("Type")),
            "musee": typo(o.get("Musée")), "ville": typo(o.get("Ville")),
            "majeure": str(o.get("Majeure (Bible)") or "").lower() == "oui",
            "image": o.get("Lien image"), "resume": typo(o.get("Résumé court (1 phrase)")),
            "fiche": md, "ficheVide": vide, "niveau": niveau,
        })
    return oeuvres

def lire_evenements(wb, ids_mouv):
    """Onglet Événements (pas de fiche). Vérifie le mouvement, qui peut rester vide."""
    evenements = []
    for e in lire_onglet(wb, "Événements"):
        if e.get("Mouvement") and e.get("Mouvement") not in ids_mouv:
            avertir(f"Événement {e['ID']} : mouvement inconnu « {e.get('Mouvement')} »")
        evenements.append({
            "id": e["ID"], "annee": annee(e.get("Année")), "date": typo(e.get("Date précise")),
            "titre": typo(e.get("Titre")), "lieu": typo(e.get("Lieu")), "mouvement": e.get("Mouvement"),
            "description": typo(e.get("Description (1-2 phrases)")),
        })
    return evenements

# Les types de relations (D23) et, pour chacun, ce qu'il relie : (genres possibles au départ, genres possibles à l'arrivée)
TYPES_RELATIONS = {
    "influence": ({"artiste"}, {"artiste", "mouvement"}),
    "collaboration": ({"artiste"}, {"artiste"}),
    "rivalité": ({"artiste"}, {"artiste"}),
    "filiation": ({"mouvement"}, {"mouvement"}),
    "réaction": ({"mouvement"}, {"mouvement"}),
}
GENRES = {"artiste": "un artiste", "mouvement": "un mouvement", "oeuvre": "une œuvre"}   # pour écrire les avertissements

def lire_influences(wb, ids_art, ids_mouv):
    """Onglet Influences, qui réunit toutes les relations (D23).
    Vérifie que chaque bout est un artiste ou un mouvement connu, et que le type relie les bons genres d'éléments."""
    def genre(ident):
        """« artiste », « mouvement », ou None pour un identifiant inconnu."""
        return "artiste" if ident in ids_art else "mouvement" if ident in ids_mouv else None

    influences = []
    for i in lire_onglet(wb, "Influences"):
        de, vers, sorte = i.get("De (ID)"), i.get("Vers (ID)"), i.get("Type")
        for ident in (de, vers):
            if genre(ident) is None:
                avertir(f"Relation {i['ID']} : identifiant inconnu « {ident} » (ni un artiste ni un mouvement)")
        if not sorte:
            avertir(f"Relation {i['ID']} : type manquant")
        elif sorte not in TYPES_RELATIONS:
            avertir(f"Relation {i['ID']} : type inconnu « {sorte} » (types possibles : {', '.join(TYPES_RELATIONS)})")
        elif genre(de) and genre(vers):
            depart, arrivee = TYPES_RELATIONS[sorte]
            if genre(de) not in depart or genre(vers) not in arrivee:
                avertir(f"Relation {i['ID']} : une relation « {sorte} » ne peut pas relier "
                        f"{GENRES[genre(de)]} à {GENRES[genre(vers)]}")
        influences.append({"de": de, "vers": vers, "type": sorte,
                           "explication": typo(i.get("Explication (1-2 phrases)"))})
    return influences

def lire_glossaire(wb):
    """Onglet Glossaire (pas de fiche, D24). Vérifie que chaque terme a un nom et une définition.
    Une définition manquante est permise, mais signalée : on peut lister les termes avant de les définir.
    « Voir aussi » est vérifié dans verifier_ensemble(), car il peut viser n'importe quel élément du site."""
    glossaire = []
    for t in lire_onglet(wb, "Glossaire"):
        if not t.get("Terme"):
            avertir(f"Terme {t['ID']} : nom du terme manquant")
        if not t.get("Définition"):
            avertir(f"Terme {t['ID']} : définition manquante")
        glossaire.append({
            "id": t["ID"], "terme": typo(t.get("Terme")), "definition": typo(t.get("Définition")),
            "voirAussi": decouper(t.get("Voir aussi")),
        })
    return glossaire

def lire_entete(texte):
    """Les champs de l'en-tête YAML d'une fiche, en dictionnaire {clé: texte}.
    Ne lit que des lignes simples « clé: valeur », ce qui suffit aux fiches du site sans librairie YAML."""
    entete = re.match(r"^---\n(.*?)\n---\n", texte, flags=re.S)
    champs = {}
    for ligne in (entete.group(1).splitlines() if entete else []):
        cle, separateur, valeur = ligne.partition(":")
        if separateur:
            champs[cle.strip()] = valeur.strip()
    return champs

def lire_articles(dossier, sorte, champ):
    """Les fiches d'un dossier qui n'a pas d'onglet dans le tableur : parcours et comparaisons (D24).
    L'identifiant est le nom du fichier, le titre est la ligne « # », et le champ « champ » de l'en-tête
    liste les identifiants reliés, séparés par des virgules. Ceux-ci sont vérifiés dans verifier_articles()."""
    articles = []
    for chemin in sorted((FICHES / dossier).glob("*.md")):   # un dossier absent ne contient aucune fiche
        ident, nom = chemin.stem, chemin.relative_to(ICI)
        texte = chemin.read_text(encoding="utf-8")
        entete = lire_entete(texte)
        if entete.get("id") != ident:
            avertir(f"Fiche {nom} : l'id de l'en-tête « {entete.get('id', '')} » n'est pas le nom du fichier")
        if entete.get("type") != sorte:
            avertir(f"Fiche {nom} : type « {entete.get('type', '')} » au lieu de « {sorte} »")
        titre = re.search(r"^# (.+)$", re.sub(r"^---\n.*?\n---\n", "", texte, flags=re.S), flags=re.M)
        if not titre:
            avertir(f"Fiche {nom} : titre « # » manquant")
        md, vide = lire_fiche(dossier, ident)
        articles.append({
            "id": ident, "titre": typo(titre.group(1).strip()) if titre else None,
            champ: decouper(entete.get(champ)), "fiche": md, "ficheVide": vide,
        })
    return articles

def verifier_articles(parcours, comparaisons, ids_connus, genres):
    """Ce que relient les parcours et les comparaisons doit exister.
    Un parcours a au moins deux étapes ; une comparaison relie deux éléments distincts du même genre
    (deux mouvements, deux artistes ou deux œuvres)."""
    for p in parcours:
        if len(p["etapes"]) < 2:
            avertir(f"Parcours {p['id']} : il faut au moins deux étapes (champ « etapes » de l'en-tête)")
        for ident in p["etapes"]:
            if ident not in ids_connus:
                avertir(f"Parcours {p['id']} : étape inconnue « {ident} »")
    for c in comparaisons:
        elements = c["elements"]
        for ident in elements:
            if ident not in ids_connus:
                avertir(f"Comparaison {c['id']} : élément inconnu « {ident} »")
        if len(elements) != 2:
            avertir(f"Comparaison {c['id']} : il faut exactement deux éléments (champ « elements » de l'en-tête)")
        elif elements[0] == elements[1]:
            avertir(f"Comparaison {c['id']} : les deux éléments sont identiques")
        elif all(ident in ids_connus for ident in elements):
            premier, second = genres.get(elements[0]), genres.get(elements[1])
            if premier is None or premier != second:
                quoi = " et ".join(GENRES.get(genres.get(i), f"« {i} »") for i in elements)
                avertir(f"Comparaison {c['id']} : elle relie {quoi} (deux mouvements, deux artistes ou deux œuvres)")

def verifier_ensemble(donnees):
    """Les vérifications qui demandent d'avoir lu tous les onglets : fiches orphelines, liens, images, doublons."""
    mouvements, groupes, artistes = donnees["mouvements"], donnees["groupes"], donnees["artistes"]
    oeuvres, evenements, glossaire = donnees["oeuvres"], donnees["evenements"], donnees["glossaire"]
    parcours, comparaisons = donnees["parcours"], donnees["comparaisons"]
    ids_mouv = {m["id"] for m in mouvements}
    ids_art = {a["id"] for a in artistes}
    ids_oeu = {o["id"] for o in oeuvres}

    # Le contrôle inverse de « Fiche manquante » : une fiche présente, mais sans ligne dans le tableur
    verifier_orphelines("mouvements", ids_mouv)
    verifier_orphelines("artistes", ids_art)
    verifier_orphelines("oeuvres", ids_oeu)

    # Les liens [[id]] peuvent viser un mouvement, un groupe, un artiste, une œuvre, un événement, un terme,
    # un parcours ou une comparaison. Un lien vers un groupe mène à la page de son mouvement (D22).
    # Un lien vers un terme, un parcours ou une comparaison est permis (D24), mais il est signalé :
    # la frise ne sait pas encore les afficher (phase 4).
    ids_groupes = {g["id"] for g in groupes}
    ids_termes = {t["id"] for t in glossaire}
    ids_articles = {x["id"] for x in parcours + comparaisons}
    ids_connus = (ids_mouv | ids_groupes | ids_art | ids_oeu | {e["id"] for e in evenements}
                  | ids_termes | ids_articles)
    verifier_liens(mouvements + artistes + oeuvres + parcours + comparaisons, ids_connus,
                   ids_termes | ids_articles)

    # Le genre de chaque élément qu'une comparaison peut relier
    genres = {**{i: "mouvement" for i in ids_mouv}, **{i: "artiste" for i in ids_art}, **{i: "oeuvre" for i in ids_oeu}}
    verifier_articles(parcours, comparaisons, ids_connus, genres)

    # « Voir aussi » d'un terme peut viser n'importe quel élément : un autre terme, un artiste, une œuvre…
    for t in glossaire:
        for ident in t["voirAussi"]:
            if ident not in ids_connus:
                avertir(f"Terme {t['id']} : « Voir aussi » vers un identifiant inconnu « {ident} »")
            elif ident == t["id"]:
                avertir(f"Terme {t['id']} : « Voir aussi » renvoie au terme lui-même")
    for o in oeuvres:
        verifier_image(o)
        verifier_date(o)

    # Un identifiant est unique sur tout le site, tous types confondus (D9)
    tous = [x["id"] for x in mouvements + groupes + artistes + oeuvres + evenements + glossaire
            + parcours + comparaisons]
    for doublon in sorted({x for x in tous if tous.count(x) > 1}):
        avertir(f"Identifiant utilisé deux fois : {doublon}")

def ecrire(donnees):
    """Écrit les données dans SORTIE, en JSON : app.js les importe, les pages les liront au build."""
    SORTIE.parent.mkdir(parents=True, exist_ok=True)   # crée src/data/ s'il n'existe pas encore
    SORTIE.write_text(json.dumps(donnees, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

def afficher_bilan(donnees):
    """Affiche les chiffres du site, puis les avertissements."""
    mouvements, artistes, oeuvres = donnees["mouvements"], donnees["artistes"], donnees["oeuvres"]
    fiches = mouvements + artistes + oeuvres
    redigees = sum(not x["ficheVide"] for x in fiches)
    print(f"{len(mouvements)} mouvements, {len(donnees['groupes'])} groupe(s), {len(artistes)} artistes, {len(oeuvres)} œuvres, "
          f"{len(donnees['evenements'])} événements, {len(donnees['influences'])} influences, "
          f"{len(donnees['glossaire'])} terme(s) du glossaire, "
          f"{len(donnees['parcours'])} parcours, {len(donnees['comparaisons'])} comparaison(s)")
    print(f"{redigees} fiche(s) rédigée(s) sur {len(fiches)}")
    # Une œuvre a sa page dès qu'elle est documentée (D21) : les œuvres analysées en font partie
    avec_page = sum(o["niveau"] != "referencee" for o in oeuvres)
    analysees = sum(o["niveau"] == "analysee" for o in oeuvres)
    print(f"Œuvres documentées : {avec_page} sur {len(oeuvres)}, dont {analysees} analysée(s)")
    print(f"Données écrites dans {SORTIE.relative_to(ICI)}")
    if avertissements:
        print(f"\n{len(avertissements)} point(s) à vérifier :")
        for a in avertissements:
            print("  - " + a)

def main():
    if not TABLEUR.exists():
        sys.exit(f"Tableur introuvable : {TABLEUR}")
    wb = load_workbook(TABLEUR, data_only=True)

    # L'ordre compte : chaque onglet est vérifié avec les identifiants des onglets lus avant lui
    mouvements = lire_mouvements(wb)
    ids_mouv = {m["id"] for m in mouvements}
    noms_mouv = {m["nom"].lower(): m["id"] for m in mouvements if m["nom"]}   # pour suggérer l'identifiant
    groupes = lire_groupes(wb, ids_mouv)
    ids_groupes = {g["id"] for g in groupes}
    noms_groupes = {g["nom"].lower(): g["id"] for g in groupes if g["nom"]}
    artistes = lire_artistes(wb, ids_mouv, noms_mouv, ids_groupes, noms_groupes)
    ids_art = {a["id"] for a in artistes}
    oeuvres = lire_oeuvres(wb, ids_mouv, ids_art)
    evenements = lire_evenements(wb, ids_mouv)
    influences = lire_influences(wb, ids_art, ids_mouv)
    glossaire = lire_glossaire(wb)   # « Voir aussi » est vérifié plus bas, une fois tous les identifiants connus
    parcours = lire_articles("parcours", "parcours", "etapes")
    comparaisons = lire_articles("comparaisons", "comparaison", "elements")

    donnees = {"mouvements": mouvements, "groupes": groupes, "artistes": artistes, "oeuvres": oeuvres,
               "evenements": evenements, "influences": influences, "glossaire": glossaire,
               "parcours": parcours, "comparaisons": comparaisons}
    verifier_ensemble(donnees)
    ecrire(donnees)
    afficher_bilan(donnees)


if __name__ == "__main__":
    main()