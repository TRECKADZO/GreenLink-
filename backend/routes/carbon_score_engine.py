"""
Formule unifiee de calcul du Score Carbone GreenLink Agritech
=============================================================
Une seule formule utilisee partout (creation, verification, USSD, REDD+).

Score: 0 a 10 (10 = excellence en pratiques durables)

Decomposition:
  Base                                    : 1.0
  Densite arbres (ponderee par strate)    : 0 - 2.0
  Couverture ombragee + maturite          : 0 - 1.5
  Brulage (penalite -1.5 / bonus +0.5)   : -1.5 / +0.5
  Engrais chimiques (penalite/bonus)      : -0.5 / +0.3
  Pratiques ecologiques (5 pratiques)     : 0 - 1.2
  Pratiques REDD+ (21, 5 categories)      : 0 - 2.5
  Age des cacaoyers                       : 0 - 0.5
  Surface (>5ha)                          : 0 - 0.3
  Certification                           : 0 - 0.2
  -------------------------------------------
  MAX THEORIQUE (sans penalites)          : 10.0
  Avec brulage + engrais chimiques        : max ~8.0
"""


# Biomass coefficients per tree strata (allometric AGB ~ D^2 * H)
COEFF_STRATE1 = 0.3   # Petits (3-5m)  - young trees, low biomass
COEFF_STRATE2 = 0.7   # Moyens (5-30m) - maturing trees, moderate biomass
COEFF_STRATE3 = 1.0   # Grands (>30m)  - mature trees, full biomass

# Ecological practices scoring
PRATIQUES_ECO = {
    "compostage": 0.3,
    "paillage": 0.2,
    "absence_pesticides": 0.3,
    "gestion_dechets": 0.2,
    "protection_cours_eau": 0.2,
    "couverture_sol": 0.2,
    "agroforesterie": 0.3,
}
MAX_PRATIQUES_ECO = 1.2

# REDD+ categories
REDD_SCORES = {
    "agroforesterie": 0.3,       # AGF1-AGF4
    "zero_deforestation": 0.3,   # ZD1-ZD4
    "gestion_sols": 0.2,         # SOL1-SOL5
    "restauration": 0.3,         # REST1-REST4
    "tracabilite": 0.15,         # TRAC1-TRAC4
}
REDD_CAPS = {
    "agroforesterie": 1.0,
    "zero_deforestation": 0.6,
    "gestion_sols": 0.5,
    "restauration": 0.5,
    "tracabilite": 0.3,
}
MAX_REDD = 2.5


def calculate_carbon_score(
    area_hectares: float = 0,
    arbres_petits: int = 0,
    arbres_moyens: int = 0,
    arbres_grands: int = 0,
    nombre_arbres: int = 0,
    couverture_ombragee: float = 0,
    pratique_brulage: bool = None,        # True = brule, False = ne brule pas, None = inconnu
    engrais_chimique: bool = None,        # True = utilise, False = n'utilise pas, None = inconnu
    pratiques_ecologiques: list = None,   # ["compostage", "paillage", ...]
    redd_practices: list = None,          # [{code, category}, ...]
    age_cacaoyers: str = None,            # "jeune" | "mature" | "vieux"
    certification: str = None,            # Any certification name or None
    existing_practices: list = None,      # From parcel doc (backward compat)
) -> dict:
    """
    Calcule le score carbone unifie (0-10) avec decomposition detaillee.
    
    Returns:
        dict with 'score', 'details' (breakdown), 'niveau', 'recommandations'
    """
    details = {}
    recommandations = []

    # === BASE ===
    score = 1.0
    details["base"] = 1.0

    # === 1. DENSITE ARBRES PONDEREE (max 2.0) ===
    n_p = int(arbres_petits or 0)
    n_m = int(arbres_moyens or 0)
    n_g = int(arbres_grands or 0)
    total_cat = n_p + n_m + n_g

    # Backward compatibility: if only total provided
    if nombre_arbres and total_cat == 0:
        n_m = int(nombre_arbres)
        total_cat = n_m

    weighted = (n_p * COEFF_STRATE1) + (n_m * COEFF_STRATE2) + (n_g * COEFF_STRATE3)
    area = max(float(area_hectares or 0), 0.01)
    density = weighted / area

    tree_bonus = 0
    if total_cat > 0:
        if density >= 80:
            tree_bonus = 2.0
        elif density >= 50:
            tree_bonus = 1.5
        elif density >= 20:
            tree_bonus = 1.0
        elif density >= 5:
            tree_bonus = 0.5
        else:
            recommandations.append("Augmentez le nombre d'arbres d'ombrage (objectif: 20-60 arbres ponderes/ha)")

    score += tree_bonus
    details["densite_arbres"] = round(tree_bonus, 2)
    details["arbres_total"] = total_cat
    details["densite_ponderee_ha"] = round(density, 1)

    # === 2. COUVERTURE OMBRAGEE (max 1.5) ===
    couv = float(couverture_ombragee or 0)
    mature_ratio = n_g / total_cat if total_cat > 0 else 0
    maturity_bonus = 0.2 * mature_ratio  # Up to +0.2 for mature tree dominance

    couv_bonus = 0
    if couv >= 60:
        couv_bonus = 1.3
    elif couv >= 40:
        couv_bonus = 1.0
    elif couv >= 20:
        couv_bonus = 0.6
    elif couv >= 10:
        couv_bonus = 0.3
    else:
        if total_cat > 0:
            recommandations.append("Ameliorez la couverture ombragee (objectif: 40-60%)")

    couv_total = min(couv_bonus + maturity_bonus, 1.5)
    score += couv_total
    details["couverture_ombragee"] = round(couv_total, 2)

    # === 3. BRULAGE (penalite -1.5 / bonus +0.5) ===
    brulage_pts = 0
    if pratique_brulage is True:
        brulage_pts = -1.5
        recommandations.append("URGENT: Arretez la pratique du brulage (-1.5 points)")
    elif pratique_brulage is False:
        brulage_pts = 0.5
    # None = inconnu, no impact
    score += brulage_pts
    details["brulage"] = round(brulage_pts, 2)

    # === 4. ENGRAIS CHIMIQUES (penalite -0.5 / bonus +0.3) ===
    engrais_pts = 0
    if engrais_chimique is True:
        engrais_pts = -0.5
        recommandations.append("Remplacez les engrais chimiques par du compost (-0.5 points)")
    elif engrais_chimique is False:
        engrais_pts = 0.3
    score += engrais_pts
    details["engrais_chimique"] = round(engrais_pts, 2)

    # === 5. PRATIQUES ECOLOGIQUES (max 1.2) ===
    all_pratiques = list(pratiques_ecologiques or []) + list(existing_practices or [])
    seen = set()
    eco_bonus = 0
    pratiques_adoptees = []
    for p in all_pratiques:
        p_lower = p.lower().strip() if isinstance(p, str) else ""
        if p_lower and p_lower not in seen:
            seen.add(p_lower)
            pts = PRATIQUES_ECO.get(p_lower, 0.1)  # 0.1 default for unknown practices
            eco_bonus += pts
            pratiques_adoptees.append(p_lower)

    eco_total = min(eco_bonus, MAX_PRATIQUES_ECO)
    score += eco_total
    details["pratiques_ecologiques"] = round(eco_total, 2)
    details["pratiques_adoptees"] = pratiques_adoptees

    # === 6. PRATIQUES REDD+ (max 2.5) ===
    redd_bonus = 0
    if redd_practices:
        cat_totals = {}
        for rp in redd_practices:
            cat = rp.get("category", "")
            if cat in REDD_SCORES:
                cat_totals[cat] = cat_totals.get(cat, 0) + REDD_SCORES[cat]
        for cat, total in cat_totals.items():
            capped = min(total, REDD_CAPS.get(cat, 0.5))
            redd_bonus += capped
    redd_total = min(redd_bonus, MAX_REDD)
    score += redd_total
    details["redd_practices"] = round(redd_total, 2)

    if redd_total < 0.5:
        recommandations.append("Adoptez des pratiques REDD+ pour gagner jusqu'a +2.5 points")

    # === 7. AGE DES CACAOYERS (max 0.5) ===
    age_pts = 0
    age = (age_cacaoyers or "").lower().strip()
    if age == "mature":
        age_pts = 0.5
    elif age == "vieux":
        age_pts = 0.3
    elif age == "jeune":
        age_pts = 0.1
    score += age_pts
    details["age_cacaoyers"] = round(age_pts, 2)

    # === 8. SURFACE (max 0.3) ===
    area_pts = 0
    if area >= 5:
        area_pts = 0.3
    elif area >= 3:
        area_pts = 0.2
    elif area >= 1:
        area_pts = 0.1
    score += area_pts
    details["surface"] = round(area_pts, 2)

    # === 9. CERTIFICATION (max 0.2) ===
    cert_pts = 0.2 if certification else 0
    score += cert_pts
    details["certification"] = round(cert_pts, 2)

    # === FINAL ===
    final_score = round(max(0, min(10, score)), 1)

    # Niveau
    if final_score >= 8:
        niveau = "Excellent"
    elif final_score >= 6:
        niveau = "Tres Bon"
    elif final_score >= 4:
        niveau = "Bon"
    elif final_score >= 2:
        niveau = "En Progression"
    else:
        niveau = "Insuffisant"

    # CO2 capture estimate
    co2_per_ha = 2 + (final_score / 10) * 6  # 2-8 tonnes CO2/ha/an
    co2_total = round(area * co2_per_ha, 2)

    return {
        "score": final_score,
        "niveau": niveau,
        "details": details,
        "co2_tonnes": co2_total,
        "co2_per_ha": round(co2_per_ha, 2),
        "recommandations": recommandations[:5],  # Top 5 recommendations
    }


def calculate_carbon_score_simple(
    area_hectares=0, arbres_petits=0, arbres_moyens=0, arbres_grands=0,
    nombre_arbres=0, couverture_ombragee=0, certification=None,
    pratiques_ecologiques=None, redd_practices=None,
    pratique_brulage=None, engrais_chimique=None, age_cacaoyers=None,
    existing_practices=None,
):
    """Shortcut: returns just the score (float) for backward compatibility."""
    result = calculate_carbon_score(
        area_hectares=area_hectares,
        arbres_petits=arbres_petits, arbres_moyens=arbres_moyens, arbres_grands=arbres_grands,
        nombre_arbres=nombre_arbres, couverture_ombragee=couverture_ombragee,
        certification=certification, pratiques_ecologiques=pratiques_ecologiques,
        redd_practices=redd_practices, pratique_brulage=pratique_brulage,
        engrais_chimique=engrais_chimique, age_cacaoyers=age_cacaoyers,
        existing_practices=existing_practices,
    )
    return result["score"]



# ============= API: Simulateur de score =============
from fastapi import APIRouter
_router = APIRouter()

@_router.post("/simulate")
async def simulate_carbon_score(data: dict):
    """
    Simule le calcul du score carbone avec decomposition detaillee.
    Accessible sans authentification pour encourager les planteurs.
    """
    result = calculate_carbon_score(
        area_hectares=data.get("area_hectares", 1),
        arbres_petits=data.get("arbres_petits", 0),
        arbres_moyens=data.get("arbres_moyens", 0),
        arbres_grands=data.get("arbres_grands", 0),
        nombre_arbres=data.get("nombre_arbres", 0),
        couverture_ombragee=data.get("couverture_ombragee", 0),
        pratique_brulage=data.get("pratique_brulage"),
        engrais_chimique=data.get("engrais_chimique"),
        pratiques_ecologiques=data.get("pratiques_ecologiques", []),
        redd_practices=data.get("redd_practices", []),
        age_cacaoyers=data.get("age_cacaoyers"),
        certification=data.get("certification"),
    )
    return result


@_router.get("/decomposition")
async def get_score_decomposition():
    """
    Retourne la grille de decomposition du score carbone.
    Documentation pedagogique pour les cooperatives et planteurs.
    """
    return {
        "version": "2.0",
        "max_score": 10.0,
        "criteres": [
            {"nom": "Base", "max": 1.0, "description": "Score de base pour toute parcelle enregistree"},
            {"nom": "Densite d'arbres ombrages", "max": 2.0, "description": "Pondere par strate: Strate 3 (>30m)=1.0, Strate 2 (5-30m)=0.7, Strate 1 (3-5m)=0.3. Objectif: 20-60 arbres ponderes/ha"},
            {"nom": "Couverture ombragee", "max": 1.5, "description": "Pourcentage de couverture + bonus maturite des arbres. Objectif: 40-60%"},
            {"nom": "Absence de brulage", "max": 0.5, "penalite": -1.5, "description": "Bonus si pas de brulage. Penalite forte de -1.5 si brulage pratique"},
            {"nom": "Absence d'engrais chimiques", "max": 0.3, "penalite": -0.5, "description": "Bonus si pas d'engrais chimiques. Penalite de -0.5 si utilisation"},
            {"nom": "Pratiques ecologiques", "max": 1.2, "description": "Compostage, paillage, absence pesticides, gestion dechets, protection cours d'eau, couverture sol, agroforesterie"},
            {"nom": "Pratiques REDD+ durables", "max": 2.5, "description": "21 pratiques en 5 categories: agroforesterie, zero deforestation, gestion sols, restauration, tracabilite"},
            {"nom": "Age des cacaoyers", "max": 0.5, "description": "Mature=0.5, Vieux=0.3, Jeune=0.1"},
            {"nom": "Surface", "max": 0.3, "description": "Bonus pour les grandes parcelles (>5ha=0.3, >3ha=0.2, >1ha=0.1)"},
            {"nom": "Certification", "max": 0.2, "description": "Bonus si la parcelle est certifiee (Bio, Fairtrade, ARS, etc.)"},
        ],
        "niveaux": [
            {"nom": "Excellent", "seuil": "8-10", "description": "Pratiques durables exemplaires"},
            {"nom": "Tres Bon", "seuil": "6-8", "description": "Bonnes pratiques avec marge d'amelioration"},
            {"nom": "Bon", "seuil": "4-6", "description": "Engagement en progression"},
            {"nom": "En Progression", "seuil": "2-4", "description": "Debut du parcours durable"},
            {"nom": "Insuffisant", "seuil": "0-2", "description": "Pratiques non durables detectees"},
        ]
    }
