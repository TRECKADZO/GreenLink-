"""
ARS 1000 - Base de données officielle des espèces d'arbres
Lignes directrices agroforesterie en cacaoculture - Côte d'Ivoire

Espèces compatibles (Annexes 1.1, 1.2, 1.3) + Espèces interdites (Annexe 2)
Guide interactif, diagnostic parcelle, calendrier pépinière, protection environnementale
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ars1000/agroforesterie", tags=["ARS 1000 - Agroforesterie"])


# ============= BASE DE DONNÉES ESPÈCES OFFICIELLES =============

ESPECES_STRATE3 = [
    {"id": "S3-01", "nom_scientifique": "Ricinodendron heudelotii", "nom_local": "Akpi, Eho", "strate": "3", "hauteur_max_m": 40, "reproduction": "Semis", "duree_pepiniere_mois": 4, "fructification": "Août-Octobre", "usages": ["Alimentation", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S3-02", "nom_scientifique": "Triplochiton scleroxylon", "nom_local": "Samba", "strate": "3", "hauteur_max_m": 50, "reproduction": "Semis, Bouturage", "duree_pepiniere_mois": 6, "fructification": "Février-Mars", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-03", "nom_scientifique": "Milicia excelsa", "nom_local": "Iroko", "strate": "3", "hauteur_max_m": 50, "reproduction": "Semis", "duree_pepiniere_mois": 8, "fructification": "Avril-Juin", "usages": ["Bois d'œuvre", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S3-04", "nom_scientifique": "Terminalia superba", "nom_local": "Fraké", "strate": "3", "hauteur_max_m": 45, "reproduction": "Semis", "duree_pepiniere_mois": 4, "fructification": "Décembre-Février", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-05", "nom_scientifique": "Terminalia ivorensis", "nom_local": "Framiré", "strate": "3", "hauteur_max_m": 45, "reproduction": "Semis", "duree_pepiniere_mois": 5, "fructification": "Janvier-Mars", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-06", "nom_scientifique": "Entandrophragma angolense", "nom_local": "Tiama", "strate": "3", "hauteur_max_m": 45, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Janvier-Mars", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-07", "nom_scientifique": "Entandrophragma cylindricum", "nom_local": "Sapelli", "strate": "3", "hauteur_max_m": 50, "reproduction": "Semis", "duree_pepiniere_mois": 8, "fructification": "Décembre-Février", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-08", "nom_scientifique": "Entandrophragma utile", "nom_local": "Sipo", "strate": "3", "hauteur_max_m": 50, "reproduction": "Semis", "duree_pepiniere_mois": 8, "fructification": "Janvier-Mars", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-09", "nom_scientifique": "Khaya ivorensis", "nom_local": "Acajou", "strate": "3", "hauteur_max_m": 40, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Décembre-Février", "usages": ["Bois d'œuvre", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S3-10", "nom_scientifique": "Pericopsis elata", "nom_local": "Assamela", "strate": "3", "hauteur_max_m": 45, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Mars-Mai", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-11", "nom_scientifique": "Mansonia altissima", "nom_local": "Bété", "strate": "3", "hauteur_max_m": 35, "reproduction": "Semis", "duree_pepiniere_mois": 5, "fructification": "Février-Avril", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-12", "nom_scientifique": "Piptadeniastrum africanum", "nom_local": "Dabéma", "strate": "3", "hauteur_max_m": 40, "reproduction": "Semis", "duree_pepiniere_mois": 4, "fructification": "Janvier-Mars", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "S3-13", "nom_scientifique": "Parkia bicolor", "nom_local": "Néré", "strate": "3", "hauteur_max_m": 35, "reproduction": "Semis", "duree_pepiniere_mois": 3, "fructification": "Mars-Mai", "usages": ["Alimentation", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S3-14", "nom_scientifique": "Canarium schweinfurthii", "nom_local": "Aïélé", "strate": "3", "hauteur_max_m": 40, "reproduction": "Semis", "duree_pepiniere_mois": 5, "fructification": "Août-Octobre", "usages": ["Alimentation", "Résine"], "compatible_cacao": True},
]

ESPECES_STRATE2 = [
    {"id": "S2-01", "nom_scientifique": "Persea americana", "nom_local": "Avocatier", "strate": "2", "hauteur_max_m": 20, "reproduction": "Semis, Greffage", "duree_pepiniere_mois": 6, "fructification": "Mars-Juin", "usages": ["Alimentation", "Revenu"], "compatible_cacao": True},
    {"id": "S2-02", "nom_scientifique": "Mangifera indica", "nom_local": "Manguier", "strate": "2", "hauteur_max_m": 25, "reproduction": "Semis, Greffage", "duree_pepiniere_mois": 6, "fructification": "Mars-Juin", "usages": ["Alimentation", "Revenu"], "compatible_cacao": True},
    {"id": "S2-03", "nom_scientifique": "Irvingia gabonensis", "nom_local": "Sauvage (Kplé)", "strate": "2", "hauteur_max_m": 25, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Juillet-Septembre", "usages": ["Alimentation", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S2-04", "nom_scientifique": "Cocos nucifera", "nom_local": "Cocotier", "strate": "2", "hauteur_max_m": 25, "reproduction": "Semis", "duree_pepiniere_mois": 8, "fructification": "Toute l'année", "usages": ["Alimentation", "Revenu"], "compatible_cacao": True},
    {"id": "S2-05", "nom_scientifique": "Garcinia kola", "nom_local": "Petit Cola", "strate": "2", "hauteur_max_m": 15, "reproduction": "Semis", "duree_pepiniere_mois": 12, "fructification": "Juillet-Septembre", "usages": ["Pharmacopée", "Alimentation"], "compatible_cacao": True},
    {"id": "S2-06", "nom_scientifique": "Cola nitida", "nom_local": "Colatier", "strate": "2", "hauteur_max_m": 15, "reproduction": "Semis", "duree_pepiniere_mois": 8, "fructification": "Août-Décembre", "usages": ["Alimentation", "Revenu", "Culture"], "compatible_cacao": True},
    {"id": "S2-07", "nom_scientifique": "Xylopia aethiopica", "nom_local": "Poivre long", "strate": "2", "hauteur_max_m": 20, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Mars-Mai", "usages": ["Épice", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S2-08", "nom_scientifique": "Funtumia elastica", "nom_local": "Pouo, Arbre à caoutchouc", "strate": "2", "hauteur_max_m": 25, "reproduction": "Semis", "duree_pepiniere_mois": 4, "fructification": "Mai-Juillet", "usages": ["Latex"], "compatible_cacao": True},
    {"id": "S2-09", "nom_scientifique": "Spathodea campanulata", "nom_local": "Tulipier d'Afrique", "strate": "2", "hauteur_max_m": 20, "reproduction": "Semis, Bouturage", "duree_pepiniere_mois": 4, "fructification": "Toute l'année", "usages": ["Ornemental", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S2-10", "nom_scientifique": "Albizia adianthifolia", "nom_local": "Albizia", "strate": "2", "hauteur_max_m": 25, "reproduction": "Semis", "duree_pepiniere_mois": 3, "fructification": "Décembre-Mars", "usages": ["Fixation azote", "Bois"], "compatible_cacao": True},
    {"id": "S2-11", "nom_scientifique": "Dacryodes klaineana", "nom_local": "Adjouaba, Safoutier", "strate": "2", "hauteur_max_m": 20, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Août-Octobre", "usages": ["Alimentation"], "compatible_cacao": True},
    {"id": "S2-12", "nom_scientifique": "Ficus capensis", "nom_local": "Aloma", "strate": "2", "hauteur_max_m": 15, "reproduction": "Bouturage", "duree_pepiniere_mois": 3, "fructification": "Toute l'année", "usages": ["Alimentation", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S2-13", "nom_scientifique": "Blighia sapida", "nom_local": "Akée", "strate": "2", "hauteur_max_m": 20, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Janvier-Mars", "usages": ["Alimentation"], "compatible_cacao": True},
    {"id": "S2-14", "nom_scientifique": "Strombosia pustulata", "nom_local": "Poé", "strate": "2", "hauteur_max_m": 20, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Juin-Août", "usages": ["Bois"], "compatible_cacao": True},
]

ESPECES_STRATE1 = [
    {"id": "S1-01", "nom_scientifique": "Citrus sinensis", "nom_local": "Oranger", "strate": "1", "hauteur_max_m": 5, "reproduction": "Greffage, Semis", "duree_pepiniere_mois": 12, "fructification": "Novembre-Février", "usages": ["Alimentation", "Revenu"], "compatible_cacao": True},
    {"id": "S1-02", "nom_scientifique": "Citrus limon", "nom_local": "Citronnier", "strate": "1", "hauteur_max_m": 4, "reproduction": "Greffage, Semis", "duree_pepiniere_mois": 10, "fructification": "Toute l'année", "usages": ["Alimentation", "Revenu"], "compatible_cacao": True},
    {"id": "S1-03", "nom_scientifique": "Citrus reticulata", "nom_local": "Mandarinier", "strate": "1", "hauteur_max_m": 4, "reproduction": "Greffage", "duree_pepiniere_mois": 12, "fructification": "Octobre-Janvier", "usages": ["Alimentation", "Revenu"], "compatible_cacao": True},
    {"id": "S1-04", "nom_scientifique": "Citrus grandis", "nom_local": "Pamplemousse", "strate": "1", "hauteur_max_m": 5, "reproduction": "Greffage", "duree_pepiniere_mois": 12, "fructification": "Novembre-Mars", "usages": ["Alimentation"], "compatible_cacao": True},
    {"id": "S1-05", "nom_scientifique": "Psidium guajava", "nom_local": "Goyavier", "strate": "1", "hauteur_max_m": 4, "reproduction": "Semis, Bouturage", "duree_pepiniere_mois": 4, "fructification": "Toute l'année", "usages": ["Alimentation", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S1-06", "nom_scientifique": "Annona muricata", "nom_local": "Corossolier", "strate": "1", "hauteur_max_m": 5, "reproduction": "Semis, Greffage", "duree_pepiniere_mois": 6, "fructification": "Juillet-Septembre", "usages": ["Alimentation", "Pharmacopée"], "compatible_cacao": True},
    {"id": "S1-07", "nom_scientifique": "Moringa oleifera", "nom_local": "Moringa", "strate": "1", "hauteur_max_m": 5, "reproduction": "Semis, Bouturage", "duree_pepiniere_mois": 2, "fructification": "Toute l'année", "usages": ["Alimentation", "Pharmacopée"], "compatible_cacao": True},
]

ESPECES_BORDURE = [
    {"id": "B-01", "nom_scientifique": "Gmelina arborea", "nom_local": "Gmelina", "strate": "bordure", "hauteur_max_m": 25, "reproduction": "Semis, Bouturage", "duree_pepiniere_mois": 4, "fructification": "Mai-Juillet", "usages": ["Bois", "Haie"], "compatible_cacao": True},
    {"id": "B-02", "nom_scientifique": "Tectona grandis", "nom_local": "Teck", "strate": "bordure", "hauteur_max_m": 30, "reproduction": "Semis", "duree_pepiniere_mois": 6, "fructification": "Janvier-Mars", "usages": ["Bois d'œuvre"], "compatible_cacao": True},
    {"id": "B-03", "nom_scientifique": "Newbouldia laevis", "nom_local": "Isope africaine", "strate": "bordure", "hauteur_max_m": 10, "reproduction": "Bouturage", "duree_pepiniere_mois": 3, "fructification": "Mai-Août", "usages": ["Haie", "Pharmacopée"], "compatible_cacao": True},
    {"id": "B-04", "nom_scientifique": "Coffea canephora", "nom_local": "Caféier", "strate": "bordure", "hauteur_max_m": 5, "reproduction": "Semis, Bouturage", "duree_pepiniere_mois": 8, "fructification": "Avril-Juin", "usages": ["Revenu", "Alimentation"], "compatible_cacao": True},
    {"id": "B-05", "nom_scientifique": "Elaeis guineensis", "nom_local": "Palmier à huile", "strate": "bordure", "hauteur_max_m": 20, "reproduction": "Semis", "duree_pepiniere_mois": 12, "fructification": "Toute l'année", "usages": ["Alimentation", "Revenu"], "compatible_cacao": True},
]

ESPECES_JACHERE = [
    {"id": "J-01", "nom_scientifique": "Gliricidia sepium", "nom_local": "Gliricidia", "strate": "jachère", "hauteur_max_m": 12, "reproduction": "Bouturage, Semis", "duree_pepiniere_mois": 2, "fructification": "Février-Avril", "usages": ["Fixation azote", "Fourrage", "Bois énergie"], "compatible_cacao": True},
    {"id": "J-02", "nom_scientifique": "Albizia spp.", "nom_local": "Albizzia", "strate": "jachère", "hauteur_max_m": 25, "reproduction": "Semis", "duree_pepiniere_mois": 3, "fructification": "Décembre-Mars", "usages": ["Fixation azote", "Bois"], "compatible_cacao": True},
    {"id": "J-03", "nom_scientifique": "Acacia mangium", "nom_local": "Acacia océanien", "strate": "jachère", "hauteur_max_m": 25, "reproduction": "Semis", "duree_pepiniere_mois": 3, "fructification": "Mars-Mai", "usages": ["Fixation azote", "Bois énergie"], "compatible_cacao": True},
    {"id": "J-04", "nom_scientifique": "Acacia auriculiformis", "nom_local": "Acacia océanien", "strate": "jachère", "hauteur_max_m": 20, "reproduction": "Semis", "duree_pepiniere_mois": 3, "fructification": "Mars-Mai", "usages": ["Fixation azote", "Bois énergie"], "compatible_cacao": True},
]

ESPECES_INTERDITES = [
    {"id": "X-01", "nom_scientifique": "Adansonia digitata", "nom_local": "Baobab", "raison": "Compétition eau et lumière, racines envahissantes"},
    {"id": "X-02", "nom_scientifique": "Bombax buonopozense", "nom_local": "Kapokier rouge", "raison": "Ombrage excessif, compétition racinaire"},
    {"id": "X-03", "nom_scientifique": "Carica papaya", "nom_local": "Papayer", "raison": "Hôte de maladies, croissance rapide incompatible"},
    {"id": "X-04", "nom_scientifique": "Ceiba pentandra", "nom_local": "Fromager", "raison": "Ombrage excessif (canopée > 60%), racines superficielles"},
    {"id": "X-05", "nom_scientifique": "Cola cordifolia", "nom_local": "Cola sauvage", "raison": "Compétition hydrique intense"},
    {"id": "X-06", "nom_scientifique": "Cola chlamydantha", "nom_local": "Cola", "raison": "Compétition avec cacaoyers"},
    {"id": "X-07", "nom_scientifique": "Cola gigantea", "nom_local": "Grand Cola", "raison": "Ombrage excessif, grande taille"},
    {"id": "X-08", "nom_scientifique": "Pterygota macrocarpa", "nom_local": "Koto", "raison": "Racines envahissantes"},
    {"id": "X-09", "nom_scientifique": "Spondias mombin", "nom_local": "Trondjô", "raison": "Hôte de parasites du cacaoyer"},
    {"id": "X-10", "nom_scientifique": "Sterculia tragacantha", "nom_local": "Poré-poré", "raison": "Compétition, ombrage excessif"},
]

ALL_ESPECES = ESPECES_STRATE3 + ESPECES_STRATE2 + ESPECES_STRATE1 + ESPECES_BORDURE + ESPECES_JACHERE


def get_all_especes_map():
    """Retourne un dictionnaire id -> espèce"""
    return {e["id"]: e for e in ALL_ESPECES}


def get_espece_names_set():
    """Retourne l'ensemble des noms scientifiques autorisés"""
    return {e["nom_scientifique"].lower() for e in ALL_ESPECES}


def get_especes_interdites_names():
    """Retourne l'ensemble des noms scientifiques interdits"""
    return {e["nom_scientifique"].lower() for e in ESPECES_INTERDITES}


# ============= CONFORMITÉ AVANCÉE =============

def diagnostic_agroforesterie(parcelle_data: dict, arbres_data: dict, inventaire: list = None) -> dict:
    """
    Diagnostic complet de conformité agroforestière selon les Lignes Directrices ARS 1000.
    Retourne un score détaillé + recommandations.
    """
    superficie_ha = parcelle_data.get("superficie_ha", 0) or 1
    total_arbres = arbres_data.get("nombre_total", 0)
    especes = arbres_data.get("especes", [])
    densite = total_arbres / max(superficie_ha, 0.01)
    nb_especes = len(especes)
    strate_haute = arbres_data.get("strate_haute", 0)
    strate_moyenne = arbres_data.get("strate_moyenne", 0)
    strate_basse = arbres_data.get("strate_basse", 0)

    # Check species from inventaire if available
    especes_interdites = get_especes_interdites_names()
    especes_autorisees = get_espece_names_set()
    especes_liste_noire = []
    especes_non_reconnues = []
    a_strate3 = False

    if inventaire:
        for arbre in inventaire:
            nom = (arbre.get("espece", "") or "").strip().lower()
            if nom in especes_interdites:
                especes_liste_noire.append(arbre.get("espece", ""))
            sci_names_s3 = {e["nom_scientifique"].lower() for e in ESPECES_STRATE3}
            local_names_s3 = set()
            for e in ESPECES_STRATE3:
                for n in e["nom_local"].lower().split(","):
                    local_names_s3.add(n.strip())
            if nom in sci_names_s3 or nom in local_names_s3:
                a_strate3 = True
    else:
        for e in especes:
            nom = e.strip().lower()
            if nom in especes_interdites:
                especes_liste_noire.append(e)
            sci_names_s3 = {e2["nom_scientifique"].lower() for e2 in ESPECES_STRATE3}
            local_names_s3 = set()
            for e2 in ESPECES_STRATE3:
                for n in e2["nom_local"].lower().split(","):
                    local_names_s3.add(n.strip())
            if nom in sci_names_s3 or nom in local_names_s3:
                a_strate3 = True

    if strate_haute > 0:
        a_strate3 = True

    # Critères de conformité
    criteres = {
        "densite": {
            "label": "Densité (25-40 arbres/ha)",
            "conforme": 25 <= densite <= 40,
            "valeur": round(densite, 1),
            "requis": "25-40 arbres/ha",
            "poids": 20,
        },
        "nb_especes": {
            "label": "Diversité (min 3 espèces)",
            "conforme": nb_especes >= 3,
            "valeur": nb_especes,
            "requis": "min 3 espèces différentes",
            "poids": 15,
        },
        "strate3": {
            "label": "Espèce de strate 3 (> 30m)",
            "conforme": a_strate3,
            "valeur": "Oui" if a_strate3 else "Non",
            "requis": "min 1 espèce de strate 3",
            "poids": 20,
        },
        "deux_strates": {
            "label": "Au moins 2 strates au-dessus du cacaoyer",
            "conforme": sum([strate_haute > 0, strate_moyenne > 0, strate_basse > 0]) >= 2,
            "valeur": f"H:{strate_haute} M:{strate_moyenne} B:{strate_basse}",
            "requis": "min 2 strates actives",
            "poids": 15,
        },
        "ombrage_max": {
            "label": "Ombrage ≤ 60%",
            "conforme": densite <= 45,  # Approximation: > 45 arbres/ha = > 60% shade
            "valeur": f"{min(round(densite * 1.3, 0), 100)}% estimé",
            "requis": "max 60%",
            "poids": 10,
        },
        "liste_noire": {
            "label": "Aucune espèce interdite",
            "conforme": len(especes_liste_noire) == 0,
            "valeur": ", ".join(especes_liste_noire) if especes_liste_noire else "Aucune",
            "requis": "0 espèce de la liste noire",
            "poids": 20,
        },
    }

    # Calcul du score
    score = 0
    max_score = 0
    for c in criteres.values():
        max_score += c["poids"]
        if c["conforme"]:
            score += c["poids"]

    pourcentage = round((score / max_score) * 100, 1) if max_score > 0 else 0

    # Recommandations
    recommandations = []
    if not criteres["densite"]["conforme"]:
        if densite < 25:
            manquant = int((25 - densite) * superficie_ha)
            recommandations.append(f"Planter au moins {manquant} arbres supplémentaires pour atteindre 25 arbres/ha")
        else:
            recommandations.append(f"Réduire le nombre d'arbres (éclaircir) : densité actuelle {round(densite)}/ha dépasse 40/ha")

    if not criteres["nb_especes"]["conforme"]:
        manquant = 3 - nb_especes
        recommandations.append(f"Ajouter {manquant} espèce(s) différente(s). Suggestions : " +
                               ", ".join([e["nom_local"] for e in ESPECES_STRATE2[:manquant]]))

    if not criteres["strate3"]["conforme"]:
        recommandations.append("Planter au moins 1 espèce de strate 3 (>30m) : Iroko, Fraké, Samba ou Akpi")

    if not criteres["deux_strates"]["conforme"]:
        recommandations.append("Assurer la présence d'arbres dans au moins 2 strates (haute + moyenne ou basse)")

    if especes_liste_noire:
        recommandations.append(f"Retirer les espèces interdites : {', '.join(especes_liste_noire)}")

    return {
        "score": pourcentage,
        "conforme": pourcentage >= 80,
        "criteres": criteres,
        "recommandations": recommandations,
        "superficie_ha": superficie_ha,
        "total_arbres": total_arbres,
        "densite_calculee": round(densite, 1),
        "especes_interdites_detectees": especes_liste_noire,
    }


# ============= ENDPOINTS =============

@router.get("/especes")
async def get_especes(
    strate: Optional[str] = Query(None, description="Filtrer par strate: 1, 2, 3, bordure, jachère"),
    usage: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_interdites: bool = Query(False),
):
    """Liste complète des espèces d'arbres officielles ARS 1000"""
    result = list(ALL_ESPECES)

    if strate:
        result = [e for e in result if e["strate"] == strate]

    if usage:
        result = [e for e in result if any(usage.lower() in u.lower() for u in e.get("usages", []))]

    if search:
        s = search.lower()
        result = [e for e in result if s in e["nom_scientifique"].lower() or s in e["nom_local"].lower()]

    interdites = list(ESPECES_INTERDITES) if include_interdites else []

    return {
        "especes_compatibles": result,
        "especes_interdites": interdites,
        "total_compatibles": len(result),
        "total_interdites": len(ESPECES_INTERDITES),
        "strates": {
            "strate_3": {"label": "Strate 3 (> 30m)", "count": len(ESPECES_STRATE3)},
            "strate_2": {"label": "Strate 2 (5-30m)", "count": len(ESPECES_STRATE2)},
            "strate_1": {"label": "Strate 1 (3-5m)", "count": len(ESPECES_STRATE1)},
            "bordure": {"label": "Bordure de parcelle", "count": len(ESPECES_BORDURE)},
            "jachere": {"label": "Jachère améliorée", "count": len(ESPECES_JACHERE)},
        }
    }


@router.get("/especes/{espece_id}")
async def get_espece_detail(espece_id: str):
    """Fiche détaillée d'une espèce"""
    especes_map = get_all_especes_map()
    if espece_id in especes_map:
        return especes_map[espece_id]
    # Check interdites
    for e in ESPECES_INTERDITES:
        if e["id"] == espece_id:
            return {**e, "compatible_cacao": False}
    raise HTTPException(status_code=404, detail="Espèce introuvable")


@router.get("/especes-interdites")
async def get_especes_interdites():
    """Liste des espèces interdites avec raisons"""
    return {"especes": ESPECES_INTERDITES, "total": len(ESPECES_INTERDITES)}


@router.post("/diagnostic")
async def run_diagnostic(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Diagnostic de conformité agroforestière avancé.
    Body: { parcelle: {superficie_ha}, arbres: {nombre_total, especes, strate_haute/moyenne/basse}, inventaire: [...] }
    """
    parcelle = data.get("parcelle", {})
    arbres = data.get("arbres", {})
    inventaire = data.get("inventaire", [])
    result = diagnostic_agroforesterie(parcelle, arbres, inventaire)
    return result


@router.get("/diagnostic/farmer/{farmer_id}")
async def diagnostic_farmer(farmer_id: str, current_user: dict = Depends(get_current_user)):
    """Diagnostic automatique basé sur le PDC d'un planteur"""
    pdc = await db.pdc.find_one({"farmer_id": farmer_id, "statut": {"$ne": "archive"}})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable pour ce planteur")

    parcelle = pdc.get("parcelles", [{}])[0] if pdc.get("parcelles") else {}
    arbres = pdc.get("arbres_ombrage", {})
    inventaire = pdc.get("inventaire_arbres", [])
    total_ha = sum(p.get("superficie_ha", 0) for p in pdc.get("parcelles", []))
    parcelle["superficie_ha"] = total_ha

    result = diagnostic_agroforesterie(parcelle, arbres, inventaire)
    result["farmer_id"] = farmer_id
    result["pdc_id"] = str(pdc["_id"])
    result["farmer_name"] = f"{pdc.get('identification', {}).get('nom', '')} {pdc.get('identification', {}).get('prenoms', '')}"
    return result


@router.get("/diagnostic/cooperative")
async def diagnostic_cooperative(current_user: dict = Depends(get_current_user)):
    """Diagnostic global agroforesterie de la coopérative"""
    user_type = current_user.get("user_type", "")
    if user_type not in ("cooperative", "admin"):
        raise HTTPException(status_code=403, detail="Accès réservé aux coopératives")

    coop_id = str(current_user["_id"])
    pdcs = await db.pdc.find({"coop_id": coop_id, "statut": {"$ne": "archive"}}).to_list(500)

    diagnostics = []
    total_score = 0
    conformes = 0
    problemes_frequents = {}

    for pdc in pdcs:
        parcelle = pdc.get("parcelles", [{}])[0] if pdc.get("parcelles") else {}
        total_ha = sum(p.get("superficie_ha", 0) for p in pdc.get("parcelles", []))
        parcelle["superficie_ha"] = total_ha
        arbres = pdc.get("arbres_ombrage", {})
        inventaire = pdc.get("inventaire_arbres", [])

        diag = diagnostic_agroforesterie(parcelle, arbres, inventaire)
        diag["farmer_name"] = f"{pdc.get('identification', {}).get('nom', '')} {pdc.get('identification', {}).get('prenoms', '')}"
        diag["pdc_id"] = str(pdc["_id"])
        diagnostics.append(diag)
        total_score += diag["score"]
        if diag["conforme"]:
            conformes += 1

        for rec in diag.get("recommandations", []):
            key = rec[:50]
            problemes_frequents[key] = problemes_frequents.get(key, 0) + 1

    avg_score = round(total_score / len(pdcs), 1) if pdcs else 0
    top_problemes = sorted(problemes_frequents.items(), key=lambda x: -x[1])[:5]

    return {
        "total_pdcs": len(pdcs),
        "conformes": conformes,
        "non_conformes": len(pdcs) - conformes,
        "score_moyen": avg_score,
        "problemes_frequents": [{"probleme": p[0], "count": p[1]} for p in top_problemes],
        "diagnostics": diagnostics[:50],
    }


# ============= RECOMMANDATION INTELLIGENTE =============

def recommander_arbres(parcelle_data: dict, arbres_data: dict, inventaire: list = None) -> dict:
    """
    Système de recommandation intelligent d'arbres d'ombrage.
    Analyse les manques par rapport aux critères ARS 1000 et suggère des espèces
    spécifiques avec quantités, strates cibles et calendrier de plantation.
    """
    superficie_ha = parcelle_data.get("superficie_ha", 0) or 1
    total_arbres = arbres_data.get("nombre_total", 0)
    especes = arbres_data.get("especes", [])
    densite = total_arbres / max(superficie_ha, 0.01)
    nb_especes = len(especes)
    strate_haute = arbres_data.get("strate_haute", 0)
    strate_moyenne = arbres_data.get("strate_moyenne", 0)
    strate_basse = arbres_data.get("strate_basse", 0)

    # Run diagnostic first
    diag = diagnostic_agroforesterie(parcelle_data, arbres_data, inventaire)

    recommendations = []
    plan_plantation = []
    arbres_a_planter = 0

    # Existing species (lowercase)
    especes_existantes = set()
    if inventaire:
        for a in inventaire:
            especes_existantes.add((a.get("espece", "") or "").strip().lower())
    for e in especes:
        especes_existantes.add(e.strip().lower())

    # 1. DENSITY CHECK
    if densite < 25:
        manquant = int((25 - densite) * superficie_ha)
        arbres_a_planter += manquant
        recommendations.append({
            "critere": "densite",
            "priorite": "haute",
            "message": f"Planter {manquant} arbres pour atteindre la densité minimale de 25 arbres/ha",
            "arbres_necessaires": manquant,
        })
    elif densite > 40:
        excedent = int((densite - 40) * superficie_ha)
        recommendations.append({
            "critere": "densite",
            "priorite": "moyenne",
            "message": f"Eclaircir {excedent} arbres pour réduire la densité sous 40 arbres/ha",
            "arbres_a_retirer": excedent,
        })

    # 2. STRATE 3 (haute > 30m) CHECK
    has_strate3 = strate_haute > 0
    if inventaire:
        sci_s3 = {e["nom_scientifique"].lower() for e in ESPECES_STRATE3}
        local_s3 = set()
        for e in ESPECES_STRATE3:
            for n in e["nom_local"].lower().split(","):
                local_s3.add(n.strip())
        for a in inventaire:
            nom = (a.get("espece", "") or "").strip().lower()
            if nom in sci_s3 or nom in local_s3:
                has_strate3 = True
                break

    if not has_strate3:
        # Suggest best strate 3 species (bois d'oeuvre priority = economic value)
        suggested_s3 = []
        for sp in ESPECES_STRATE3:
            if sp["nom_scientifique"].lower() not in especes_existantes and sp["nom_local"].lower().split(",")[0].strip() not in especes_existantes:
                suggested_s3.append(sp)
            if len(suggested_s3) >= 3:
                break

        recommendations.append({
            "critere": "strate3",
            "priorite": "haute",
            "message": "Aucun arbre de strate 3 (>30m) détecté. Planter au minimum 1 espèce de strate haute.",
            "especes_suggerees": [{
                "id": s["id"],
                "nom_scientifique": s["nom_scientifique"],
                "nom_local": s["nom_local"],
                "hauteur_max_m": s["hauteur_max_m"],
                "usages": s["usages"],
                "duree_pepiniere_mois": s["duree_pepiniere_mois"],
                "reproduction": s["reproduction"],
            } for s in suggested_s3],
            "quantite_min": max(2, int(superficie_ha * 3)),
        })
        if not suggested_s3:
            suggested_s3 = ESPECES_STRATE3[:3]
        for sp in suggested_s3[:2]:
            qty = max(1, int(superficie_ha * 2))
            plan_plantation.append({
                "espece": sp["nom_local"].split(",")[0].strip(),
                "nom_scientifique": sp["nom_scientifique"],
                "strate": "3 (haute, >30m)",
                "quantite": qty,
                "pepiniere_mois": sp["duree_pepiniere_mois"],
                "reproduction": sp["reproduction"],
            })
            arbres_a_planter += qty

    # 3. SPECIES DIVERSITY CHECK (min 3)
    if nb_especes < 3:
        manquant_sp = 3 - nb_especes
        suggested_div = []
        # Suggest from strate 2 (fruitiers = diversification revenus)
        for sp in ESPECES_STRATE2:
            nom_lower = sp["nom_scientifique"].lower()
            local_lower = sp["nom_local"].lower().split(",")[0].strip()
            if nom_lower not in especes_existantes and local_lower not in especes_existantes:
                suggested_div.append(sp)
            if len(suggested_div) >= manquant_sp + 1:
                break

        recommendations.append({
            "critere": "diversite",
            "priorite": "haute",
            "message": f"Ajouter {manquant_sp} espèce(s) différente(s) pour atteindre le minimum de 3",
            "especes_suggerees": [{
                "id": s["id"],
                "nom_scientifique": s["nom_scientifique"],
                "nom_local": s["nom_local"],
                "usages": s["usages"],
                "duree_pepiniere_mois": s["duree_pepiniere_mois"],
            } for s in suggested_div],
        })
        for sp in suggested_div[:manquant_sp]:
            qty = max(2, int(superficie_ha * 2))
            plan_plantation.append({
                "espece": sp["nom_local"].split(",")[0].strip(),
                "nom_scientifique": sp["nom_scientifique"],
                "strate": f"2 (moyenne, {sp['hauteur_max_m']}m max)",
                "quantite": qty,
                "pepiniere_mois": sp["duree_pepiniere_mois"],
                "reproduction": sp["reproduction"],
            })
            arbres_a_planter += qty

    # 4. TWO STRATE CHECK
    strates_actives = sum([strate_haute > 0, strate_moyenne > 0, strate_basse > 0])
    if strates_actives < 2:
        missing_strates = []
        if strate_moyenne == 0:
            missing_strates.append("moyenne")
        if strate_basse == 0:
            missing_strates.append("basse")
        if strate_haute == 0:
            missing_strates.append("haute")

        sugg_strate = []
        if "basse" in missing_strates:
            for sp in ESPECES_STRATE1:
                if sp["nom_scientifique"].lower() not in especes_existantes:
                    sugg_strate.append(sp)
                if len(sugg_strate) >= 2:
                    break
            for sp in sugg_strate:
                qty = max(3, int(superficie_ha * 4))
                plan_plantation.append({
                    "espece": sp["nom_local"].split(",")[0].strip(),
                    "nom_scientifique": sp["nom_scientifique"],
                    "strate": "1 (basse, 3-5m)",
                    "quantite": qty,
                    "pepiniere_mois": sp["duree_pepiniere_mois"],
                    "reproduction": sp["reproduction"],
                })
                arbres_a_planter += qty

        if "moyenne" in missing_strates:
            sugg_m = []
            for sp in ESPECES_STRATE2:
                if sp["nom_scientifique"].lower() not in especes_existantes:
                    sugg_m.append(sp)
                if len(sugg_m) >= 2:
                    break
            for sp in sugg_m:
                qty = max(2, int(superficie_ha * 3))
                plan_plantation.append({
                    "espece": sp["nom_local"].split(",")[0].strip(),
                    "nom_scientifique": sp["nom_scientifique"],
                    "strate": f"2 (moyenne, {sp['hauteur_max_m']}m max)",
                    "quantite": qty,
                    "pepiniere_mois": sp["duree_pepiniere_mois"],
                    "reproduction": sp["reproduction"],
                })
                arbres_a_planter += qty

        recommendations.append({
            "critere": "strates",
            "priorite": "moyenne",
            "message": f"Strates manquantes : {', '.join(missing_strates)}. Diversifier la canopée.",
        })

    # 5. BLACKLISTED SPECIES CHECK
    especes_interdites_noms = get_especes_interdites_names()
    blacklisted_found = []
    if inventaire:
        for a in inventaire:
            nom = (a.get("espece", "") or "").strip().lower()
            if nom in especes_interdites_noms:
                blacklisted_found.append(a.get("espece", ""))
    for e in especes:
        if e.strip().lower() in especes_interdites_noms:
            blacklisted_found.append(e)

    if blacklisted_found:
        remplacement = []
        for sp in ESPECES_STRATE2[:3]:
            remplacement.append({"nom": sp["nom_local"], "nom_scientifique": sp["nom_scientifique"]})
        recommendations.append({
            "critere": "especes_interdites",
            "priorite": "critique",
            "message": f"Retirer les espèces interdites : {', '.join(set(blacklisted_found))}",
            "especes_a_retirer": list(set(blacklisted_found)),
            "remplacement_suggere": remplacement,
        })

    # 6. BORDER PLANTING SUGGESTION
    if densite < 30 and superficie_ha >= 1:
        recommendations.append({
            "critere": "bordure",
            "priorite": "basse",
            "message": "Planter des espèces de bordure (Teck, Gmelina) pour protéger la parcelle et augmenter la densité",
            "especes_suggerees": [{
                "nom": sp["nom_local"],
                "nom_scientifique": sp["nom_scientifique"],
                "usages": sp["usages"],
            } for sp in ESPECES_BORDURE[:3]],
        })

    # Build timeline
    if plan_plantation:
        plan_plantation.sort(key=lambda x: x["pepiniere_mois"])

    # Score impact projection
    projected_total = total_arbres + arbres_a_planter
    projected_densite = projected_total / max(superficie_ha, 0.01)
    projected_nb_especes = nb_especes + sum(1 for p in plan_plantation if p["espece"].lower() not in especes_existantes)

    return {
        "diagnostic": diag,
        "recommendations": recommendations,
        "plan_plantation": plan_plantation,
        "total_arbres_a_planter": arbres_a_planter,
        "projection": {
            "densite_actuelle": round(densite, 1),
            "densite_projetee": round(projected_densite, 1),
            "especes_actuelles": nb_especes,
            "especes_projetees": projected_nb_especes,
            "score_actuel": diag["score"],
            "score_projete": min(100, diag["score"] + len([r for r in recommendations if r["priorite"] in ("haute", "critique")]) * 15),
        },
        "conforme_apres_plan": projected_densite >= 25 and projected_densite <= 40 and projected_nb_especes >= 3,
    }


@router.get("/recommandations/farmer/{farmer_id}")
async def get_recommandations_farmer(farmer_id: str, current_user: dict = Depends(get_current_user)):
    """Recommandations intelligentes d'arbres d'ombrage pour un planteur"""
    pdc = await db.pdc.find_one({"farmer_id": farmer_id, "statut": {"$ne": "archive"}})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable pour ce planteur")

    total_ha = sum(p.get("superficie_ha", 0) for p in pdc.get("parcelles", []))
    parcelle = {"superficie_ha": total_ha or 1}
    arbres = pdc.get("arbres_ombrage", {})
    inventaire = pdc.get("inventaire_arbres", [])

    result = recommander_arbres(parcelle, arbres, inventaire)
    result["farmer_id"] = farmer_id
    result["pdc_id"] = str(pdc["_id"])
    result["farmer_name"] = f"{pdc.get('identification', {}).get('nom', '')} {pdc.get('identification', {}).get('prenoms', '')}"
    return result


@router.post("/recommandations")
async def get_recommandations(data: dict, current_user: dict = Depends(get_current_user)):
    """Recommandations intelligentes basées sur des données brutes"""
    parcelle = data.get("parcelle", {})
    arbres = data.get("arbres", {})
    inventaire = data.get("inventaire", [])
    return recommander_arbres(parcelle, arbres, inventaire)


# ============= CALENDRIER PÉPINIÈRE =============

@router.get("/pepiniere/calendrier")
async def get_calendrier_pepiniere():
    """Calendrier de pépinière avec durées et techniques par espèce"""
    calendrier = []
    for esp in ALL_ESPECES:
        calendrier.append({
            "id": esp["id"],
            "nom_scientifique": esp["nom_scientifique"],
            "nom_local": esp["nom_local"],
            "strate": esp["strate"],
            "duree_pepiniere_mois": esp["duree_pepiniere_mois"],
            "reproduction": esp["reproduction"],
            "fructification": esp["fructification"],
        })

    # Trier par durée
    calendrier.sort(key=lambda x: x["duree_pepiniere_mois"])

    stats = {
        "duree_min_mois": min(e["duree_pepiniere_mois"] for e in calendrier),
        "duree_max_mois": max(e["duree_pepiniere_mois"] for e in calendrier),
        "par_technique": {},
    }
    for e in calendrier:
        for tech in e["reproduction"].split(", "):
            tech = tech.strip()
            stats["par_technique"][tech] = stats["par_technique"].get(tech, 0) + 1

    return {"calendrier": calendrier, "total": len(calendrier), "stats": stats}


# ============= PROTECTION ENVIRONNEMENTALE =============

class ProtectionEnvCreate(BaseModel):
    type_protection: str  # cours_eau, anti_erosion, reforestation, zone_risque
    description: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    parcelle_id: Optional[str] = None
    mesures_prises: List[str] = []
    distance_cours_eau_m: Optional[float] = None
    superficie_reboisee_ha: Optional[float] = None
    especes_plantees: List[str] = []


@router.post("/protection-env")
async def add_protection_env(data: ProtectionEnvCreate, current_user: dict = Depends(get_current_user)):
    """Enregistrer une mesure de protection environnementale"""
    user_id = str(current_user["_id"])
    user_type = current_user.get("user_type", "")
    coop_id = ""
    if user_type == "cooperative":
        coop_id = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        coop_id = current_user.get("cooperative_id", "")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "coop_id": coop_id,
        "created_by": user_id,
        "type_protection": data.type_protection,
        "description": data.description,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "parcelle_id": data.parcelle_id,
        "mesures_prises": data.mesures_prises,
        "distance_cours_eau_m": data.distance_cours_eau_m,
        "superficie_reboisee_ha": data.superficie_reboisee_ha,
        "especes_plantees": data.especes_plantees,
        "conforme_distance_eau": (data.distance_cours_eau_m or 0) >= 10 if data.type_protection == "cours_eau" else None,
        "created_at": now,
    }

    result = await db.protection_environnementale.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Mesure enregistrée", "conforme_distance_eau": doc.get("conforme_distance_eau")}


@router.get("/protection-env")
async def get_protection_env(current_user: dict = Depends(get_current_user)):
    """Liste des mesures de protection environnementale"""
    user_type = current_user.get("user_type", "")
    user_id = str(current_user["_id"])

    query = {}
    if user_type == "cooperative":
        query["coop_id"] = user_id
    elif user_type in ("field_agent", "agent_terrain"):
        query["coop_id"] = current_user.get("cooperative_id", "")

    docs = await db.protection_environnementale.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

    stats = {"cours_eau": 0, "anti_erosion": 0, "reforestation": 0, "zone_risque": 0}
    for d in docs:
        t = d.get("type_protection", "")
        if t in stats:
            stats[t] += 1

    return {"mesures": docs, "total": len(docs), "par_type": stats}
