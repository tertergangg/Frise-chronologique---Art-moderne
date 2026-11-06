"""
construire.py — transforme le tableur et les fiches en données pour le site.

Utilisation (depuis le dossier du projet) :
    python construire.py

Ce que fait le script :
  1. lit le tableur  donnees/frise_art_moderne_base.xlsx
  2. lit les fiches   fiches/mouvements, fiches/artistes, fiches/oeuvres
  3. vérifie la cohérence (identifiants inconnus, fiches manquantes ou sans ligne dans le tableur…)
  4. écrit            public/data.js, que lit la frise (src/pages/index.astro)

public/data.js est commité (décision D8) : relancer le script avant chaque commit
qui touche le tableur ou les fiches.

Prérequis : pip install openpyxl
"""
import json, re, sys
from pathlib import Path
from openpyxl import load_workbook

ICI = Path(__file__).parent
TABLEUR = ICI / "donnees" / "frise_art_moderne_base.xlsx"
FICHES = ICI / "fiches"
SORTIE = ICI / "public" / "data.js"
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
    ws = wb[nom]
    lignes = list(ws.iter_rows(values_only=True))
    entetes = [str(h).strip() if h else "" for h in lignes[0]]
    resultat = []
    for ligne in lignes[1:]:
        d = dict(zip(entetes, ligne))
        if d.get("ID"):
            resultat.append({k: (v.strip() if isinstance(v, str) else v) for k, v in d.items()})
    return resultat


def lire_fiche(dossier, ident):
    """Renvoie (markdown, vide). « vide » = la fiche ne contient encore aucun vrai texte."""
    chemin = FICHES / dossier / f"{ident}.md"
    if not chemin.exists():
        avertir(f"Fiche manquante : {chemin.relative_to(ICI)}")
        return "", True
    texte = chemin.read_text(encoding="utf-8")
    texte = re.sub(r"^---\n.*?\n---\n", "", texte, flags=re.S)       # en-tête YAML
    texte = re.sub(r"^# .*\n", "", texte, count=1, flags=re.M)         # titre (déjà affiché)
    reste = re.sub(r"<!--.*?-->", "", texte, flags=re.S)                 # commentaires du gabarit
    reste = re.sub(r"^#+ .*$|^[-*>]\s*$|\*\*\.+\*\*\s*:", "", reste, flags=re.M)
    vide = len(re.sub(r"\W", "", reste)) < 20
    return ("" if vide else texte.strip()), vide

def verifier_orphelines(dossier, ids):
    """Signale les fiches d'un dossier qui ne correspondent à aucune ligne du tableur.
    Le site ne les affiche pas : sans cet avertissement, elles passeraient inaperçues."""
    for chemin in sorted((FICHES / dossier).glob("*.md")):
        if chemin.stem not in ids:
            avertir(f"Fiche sans ligne dans le tableur : {chemin.relative_to(ICI)}")

def verifier_liens(elements, ids):
    """Signale les liens [[id]] ou [[id|texte]] des fiches qui ne mèneraient nulle part.
    La forme attendue est celle de la fonction markdown() d'app.js : les deux règles doivent rester identiques."""
    for x in elements:
        texte = re.sub(r"<!--.*?-->", "", x["fiche"], flags=re.S)   # les commentaires ne s'affichent pas
        for contenu in re.findall(r"\[\[([^\]]*)\]\]", texte):
            forme = re.fullmatch(r"([a-z0-9-]+)(?:\|[^\]]+)?", contenu)
            if not forme:
                avertir(f"Fiche {x['id']} : lien mal formé « [[{contenu}]] » "
                        "(identifiant en minuscules, sans accents ni espaces)")
            elif forme.group(1) not in ids:
                avertir(f"Fiche {x['id']} : lien vers un identifiant inconnu « {forme.group(1)} »")

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

def annee(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None

def lire_autres(valeur, ident, ids_mouv, noms_mouv):
    """Découpe la colonne « Autres mouvements » en liste d'identifiants.
    Une valeur inconnue est signalée et gardée en texte simple, pour être affichée sans lien."""
    if not isinstance(valeur, str):
        return []
    liste = []
    for morceau in valeur.split(","):
        morceau = morceau.strip()
        if not morceau:
            continue
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

def lire_artistes(wb, ids_mouv, noms_mouv):
    """Onglet Artistes, avec les fiches de fiches/artistes. Vérifie le mouvement principal."""
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
            "phrase": typo(a.get("Phrase-clé (1 phrase)")), "fiche": md, "ficheVide": vide,
        })
    return artistes

def lire_oeuvres(wb, ids_mouv, ids_art):
    """Onglet Œuvres, avec les fiches de fiches/oeuvres. Vérifie l'artiste, le mouvement et l'année."""
    oeuvres = []
    for o in lire_onglet(wb, "Œuvres"):
        md, vide = lire_fiche("oeuvres", o["ID"])
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
            "fiche": md, "ficheVide": vide,
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

def lire_influences(wb, ids_art):
    """Onglet Influences. Vérifie que les deux bouts sont des artistes connus."""
    influences = []
    for i in lire_onglet(wb, "Influences"):
        for cle in ("De (ID)", "Vers (ID)"):
            if i.get(cle) not in ids_art:
                avertir(f"Influence {i['ID']} : artiste inconnu « {i.get(cle)} »")
        influences.append({"de": i.get("De (ID)"), "vers": i.get("Vers (ID)"), "type": i.get("Type"),
                           "explication": typo(i.get("Explication (1-2 phrases)"))})
    return influences

def verifier_ensemble(donnees):
    """Les vérifications qui demandent d'avoir lu tous les onglets : fiches orphelines, liens, images, doublons."""
    mouvements, artistes = donnees["mouvements"], donnees["artistes"]
    oeuvres, evenements = donnees["oeuvres"], donnees["evenements"]
    ids_mouv = {m["id"] for m in mouvements}
    ids_art = {a["id"] for a in artistes}
    ids_oeu = {o["id"] for o in oeuvres}

    # Le contrôle inverse de « Fiche manquante » : une fiche présente, mais sans ligne dans le tableur
    verifier_orphelines("mouvements", ids_mouv)
    verifier_orphelines("artistes", ids_art)
    verifier_orphelines("oeuvres", ids_oeu)

    # Les liens [[id]] peuvent viser un mouvement, un artiste, une œuvre ou un événement (comme dans app.js)
    ids_connus = ids_mouv | ids_art | ids_oeu | {e["id"] for e in evenements}
    verifier_liens(mouvements + artistes + oeuvres, ids_connus)
    for o in oeuvres:
        verifier_image(o)

    tous = [x["id"] for x in mouvements + artistes + oeuvres + evenements]
    for doublon in sorted({x for x in tous if tous.count(x) > 1}):
        avertir(f"Identifiant utilisé deux fois : {doublon}")

def ecrire(donnees):
    """Écrit les données dans SORTIE, au format que lit la frise."""
    SORTIE.parent.mkdir(exist_ok=True)
    SORTIE.write_text("window.FRISE = " + json.dumps(donnees, ensure_ascii=False, indent=1) + ";\n",
                      encoding="utf-8")

def afficher_bilan(donnees):
    """Affiche les chiffres du site, puis les avertissements."""
    mouvements, artistes, oeuvres = donnees["mouvements"], donnees["artistes"], donnees["oeuvres"]
    fiches = mouvements + artistes + oeuvres
    redigees = sum(not x["ficheVide"] for x in fiches)
    print(f"{len(mouvements)} mouvements, {len(artistes)} artistes, {len(oeuvres)} œuvres, "
          f"{len(donnees['evenements'])} événements, {len(donnees['influences'])} influences")
    print(f"{redigees} fiche(s) rédigée(s) sur {len(fiches)}")
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
    artistes = lire_artistes(wb, ids_mouv, noms_mouv)
    ids_art = {a["id"] for a in artistes}
    oeuvres = lire_oeuvres(wb, ids_mouv, ids_art)
    evenements = lire_evenements(wb, ids_mouv)
    influences = lire_influences(wb, ids_art)

    donnees = {"mouvements": mouvements, "artistes": artistes, "oeuvres": oeuvres,
               "evenements": evenements, "influences": influences}
    verifier_ensemble(donnees)
    ecrire(donnees)
    afficher_bilan(donnees)


if __name__ == "__main__":
    main()