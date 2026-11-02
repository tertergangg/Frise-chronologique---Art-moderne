"""
construire.py — transforme le tableur et les fiches en données pour le site.

Utilisation (depuis le dossier du projet) :
    python construire.py

Ce que fait le script :
  1. lit le tableur  donnees/frise_art_moderne_base.xlsx
  2. lit les fiches   fiches/mouvements, fiches/artistes, fiches/oeuvres
  3. vérifie la cohérence (identifiants inconnus, fiches manquantes…)
  4. écrit            docs/data.js, que la page docs/index.html affiche

Prérequis : pip install openpyxl
"""
import json, re, sys
from pathlib import Path
from openpyxl import load_workbook

ICI = Path(__file__).parent
TABLEUR = ICI / "donnees" / "frise_art_moderne_base.xlsx"
FICHES = ICI / "fiches"
SORTIE = ICI / "public" / "data.js"

avertissements = []


def avertir(msg):
    avertissements.append(msg)


def typo(texte):
    """Apostrophes typographiques pour l'affichage (les identifiants ne sont jamais modifiés)."""
    if not isinstance(texte, str):
        return texte
    return texte.replace("'", "\u2019")


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


def annee(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def main():
    if not TABLEUR.exists():
        sys.exit(f"Tableur introuvable : {TABLEUR}")
    wb = load_workbook(TABLEUR, data_only=True)

    mouvements = []
    for m in lire_onglet(wb, "Mouvements"):
        md, vide = lire_fiche("mouvements", m["ID"])
        mouvements.append({
            "id": m["ID"], "nom": typo(m.get("Nom")), "debut": annee(m.get("Début")), "fin": annee(m.get("Fin")),
            "lieu": typo(m.get("Lieu")), "couleur": m.get("Couleur") or "#777777",
            "resume": typo(m.get("Résumé court (1 phrase)")), "fiche": md, "ficheVide": vide,
        })
    ids_mouv = {m["id"] for m in mouvements}

    artistes = []
    for a in lire_onglet(wb, "Artistes"):
        md, vide = lire_fiche("artistes", a["ID"])
        if a.get("Mouvement principal") not in ids_mouv:
            avertir(f"Artiste {a['ID']} : mouvement inconnu « {a.get('Mouvement principal')} »")
        artistes.append({
            "id": a["ID"], "nom": typo(a.get("Nom complet")), "naissance": annee(a.get("Naissance")),
            "deces": annee(a.get("Décès")), "nationalite": typo(a.get("Nationalité")), "role": typo(a.get("Rôle")),
            "mouvement": a.get("Mouvement principal"), "autres": typo(a.get("Autres mouvements")),
            "phrase": typo(a.get("Phrase-clé (1 phrase)")), "fiche": md, "ficheVide": vide,
        })
    ids_art = {a["id"] for a in artistes}

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

    evenements = []
    for e in lire_onglet(wb, "Événements"):
        if e.get("Mouvement") and e.get("Mouvement") not in ids_mouv:
            avertir(f"Événement {e['ID']} : mouvement inconnu « {e.get('Mouvement')} »")
        evenements.append({
            "id": e["ID"], "annee": annee(e.get("Année")), "date": typo(e.get("Date précise")),
            "titre": typo(e.get("Titre")), "lieu": typo(e.get("Lieu")), "mouvement": e.get("Mouvement"),
            "description": typo(e.get("Description (1-2 phrases)")),
        })

    influences = []
    for i in lire_onglet(wb, "Influences"):
        for cle in ("De (ID)", "Vers (ID)"):
            if i.get(cle) not in ids_art:
                avertir(f"Influence {i['ID']} : artiste inconnu « {i.get(cle)} »")
        influences.append({"de": i.get("De (ID)"), "vers": i.get("Vers (ID)"), "type": i.get("Type"),
                           "explication": typo(i.get("Explication (1-2 phrases)"))})

    tous = [x["id"] for x in mouvements + artistes + oeuvres + evenements]
    for doublon in sorted({x for x in tous if tous.count(x) > 1}):
        avertir(f"Identifiant utilisé deux fois : {doublon}")

    donnees = {"mouvements": mouvements, "artistes": artistes, "oeuvres": oeuvres,
               "evenements": evenements, "influences": influences}
    SORTIE.parent.mkdir(exist_ok=True)
    SORTIE.write_text("window.FRISE = " + json.dumps(donnees, ensure_ascii=False, indent=1) + ";\n",
                      encoding="utf-8")

    fiches = mouvements + artistes + oeuvres
    redigees = sum(not x["ficheVide"] for x in fiches)
    print(f"{len(mouvements)} mouvements, {len(artistes)} artistes, {len(oeuvres)} œuvres, "
          f"{len(evenements)} événements, {len(influences)} influences")
    print(f"{redigees} fiche(s) rédigée(s) sur {len(fiches)}")
    print(f"Données écrites dans {SORTIE.relative_to(ICI)}")
    if avertissements:
        print(f"\n{len(avertissements)} point(s) à vérifier :")
        for a in avertissements:
            print("  - " + a)


if __name__ == "__main__":
    main()
