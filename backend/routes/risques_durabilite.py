"""
Module Gestion des Risques & Durabilite - ARS 1000-1 Clause 6.1
Cartographie des Risques du SMCD - Processus en 5 etapes

Etape 1: Mesure des criteres (G: Gravite 1-5, F: Frequence 1-5)
Etape 2: Determination du niveau de risque NR = G x F et decision
Etape 3: Evaluation des mesures de prevention existantes (M: A-E)
Etape 4: Evaluation finale du risque (EFR = croisement NR/M)
Etape 5: Decision face au risque et plan de traitement
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
import logging
import io
import uuid

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/risques", tags=["Risques & Durabilite"])


# ============= REFERENTIEL ARS 1000-1 CH 6.1 =============

CONTEXTES = [
    {"code": "ENJEUX", "label": "Questions pertinentes pour l'existence (Enjeux)"},
    {"code": "FAIBLESSES", "label": "Faiblesses issues de l'analyse 4.1"},
    {"code": "MENACES", "label": "Menaces issues de l'analyse 4.1"},
    {"code": "PLANTATION", "label": "Plantation"},
    {"code": "TRANSPORT", "label": "Transport"},
    {"code": "STOCKAGE", "label": "Stockage"},
    {"code": "TRANSFORMATION", "label": "Transformation"},
    {"code": "ADMINISTRATION", "label": "Administration"},
]

CATEGORIES_RISQUES = [
    {"code": "ENVIRONNEMENT", "label": "Environnement", "exemples": "Deforestation, degradation sols, pollution eau, perte biodiversite"},
    {"code": "SOCIAL", "label": "Social", "exemples": "Travail enfants, travail force, discrimination, SST"},
    {"code": "ECONOMIQUE", "label": "Economique", "exemples": "Volatilite prix, acces marche, endettement producteurs"},
    {"code": "CLIMATIQUE", "label": "Climatique", "exemples": "Secheresse, inondations, maladies cacaoyer, temperature"},
    {"code": "GOUVERNANCE", "label": "Gouvernance", "exemples": "Corruption, transparence, conformite reglementaire"},
    {"code": "TRACABILITE", "label": "Tracabilite", "exemples": "Melange lots, perte tracabilite, fraude origine"},
    {"code": "SST", "label": "Sante & Securite au Travail", "exemples": "Blessures, intoxication, EPI, produits chimiques"},
]

# Etape 1: Echelles G et F (1 a 5)
ECHELLE_GRAVITE = [
    {"valeur": 1, "label": "Negligeable", "description": "Consequence minime, pas d'impact notable"},
    {"valeur": 2, "label": "Mineure", "description": "Impact faible, gerable sans difficulte"},
    {"valeur": 3, "label": "Moderee", "description": "Impact significatif, necessite attention"},
    {"valeur": 4, "label": "Majeure", "description": "Impact grave, pertes importantes"},
    {"valeur": 5, "label": "Critique", "description": "Catastrophique, menace l'existence"},
]

ECHELLE_FREQUENCE = [
    {"valeur": 1, "label": "Rare", "description": "Moins d'une fois par an"},
    {"valeur": 2, "label": "Peu probable", "description": "Une fois par an"},
    {"valeur": 3, "label": "Possible", "description": "Plusieurs fois par an"},
    {"valeur": 4, "label": "Probable", "description": "Mensuel"},
    {"valeur": 5, "label": "Quasi certain", "description": "Hebdomadaire ou plus"},
]

# Etape 2: Echelle de decision NR (G x F)
ECHELLE_NR = [
    {"code": "I", "min": 1, "max": 2, "label": "Tres faible", "couleur": "#10B981"},
    {"code": "II", "min": 3, "max": 4, "label": "Faible", "couleur": "#6EE7B7"},
    {"code": "III", "min": 5, "max": 6, "label": "Peu faible", "couleur": "#FBBF24"},
    {"code": "IV", "min": 7, "max": 8, "label": "Fort", "couleur": "#F59E0B"},
    {"code": "V", "min": 9, "max": 25, "label": "Tres fort", "couleur": "#EF4444"},
]

# Etape 3: Echelle M (mesure de prevention existante)
ECHELLE_M = [
    {"code": "A", "min": 0.1, "max": 0.2, "label": "Tres pertinente", "couleur": "#10B981"},
    {"code": "B", "min": 0.3, "max": 0.4, "label": "Pertinente", "couleur": "#6EE7B7"},
    {"code": "C", "min": 0.5, "max": 0.6, "label": "Peu pertinente", "couleur": "#FBBF24"},
    {"code": "D", "min": 0.6, "max": 0.7, "label": "Tres peu pertinente", "couleur": "#F59E0B"},
    {"code": "E", "min": 0.7, "max": 1.0, "label": "Pas pertinente", "couleur": "#EF4444"},
]

# Etape 5: Decisions
DECISIONS = {
    "vert": "Mesure de maitrise tres pertinente. Aucune action supplementaire n'est a envisager.",
    "jaune": "Mesure de maitrise pertinente. D'autres mesures peuvent etre envisagees si simples et peu couteuses.",
    "rouge": "Mesure insuffisante. Action a mener immediatement, sans delai, quelles que soient les ressources necessaires.",
}

PRIORITES = [
    {"valeur": 1, "label": "Faible"},
    {"valeur": 2, "label": "Moyen"},
    {"valeur": 3, "label": "Fort"},
]


def get_coop_id(user):
    return str(user.get("coop_id") or user.get("_id") or user.get("id", ""))


def _calc_nr(g: int, f: int) -> int:
    return g * f


def _code_nr(nr: int) -> str:
    for e in ECHELLE_NR:
        if e["min"] <= nr <= e["max"]:
            return e["code"]
    return "V" if nr > 8 else "I"


def _label_nr(code: str) -> str:
    for e in ECHELLE_NR:
        if e["code"] == code:
            return e["label"]
    return ""


def _decision_efr(nr_code: str, m_code: str) -> str:
    """Determine la couleur de decision EFR selon la matrice NR x M"""
    nr_idx = ["I", "II", "III", "IV", "V"].index(nr_code) if nr_code in ["I", "II", "III", "IV", "V"] else 0
    m_idx = ["A", "B", "C", "D", "E"].index(m_code) if m_code in ["A", "B", "C", "D", "E"] else 2
    # Matrice simplifiee
    if nr_idx <= 1 and m_idx <= 1:
        return "vert"
    if nr_idx >= 3 or m_idx >= 3:
        return "rouge"
    return "jaune"


# ============= MODELS =============

class ActionTraitement(BaseModel):
    libelle: str = ""
    responsable: str = ""
    contributeur: str = ""
    echeance: str = ""

class Surveillance(BaseModel):
    methode: str = ""
    responsable: str = ""
    echeance: str = ""

class EvaluationEfficacite(BaseModel):
    critere: str = ""
    methode: str = ""
    responsable: str = ""
    date: str = ""
    enregistrements: str = ""
    efficace: str = ""  # Oui / Non / En cours
    decision: str = ""


class RisqueCreate(BaseModel):
    # Contexte
    contexte: str = ""
    libelle_enjeu: str = ""
    # Identification
    titre: str
    categorie: str = ""
    danger: str = ""
    description: str = ""
    # Etape 1: G et F
    gravite: int = 3
    frequence: int = 3
    # Etape 3: Mesure prevention existante
    mesure_prevention: str = ""
    mesure_m_code: str = "C"
    # Priorite
    priorite: int = 2
    # Causes
    causes: str = ""
    # Actions de traitement
    actions: List[ActionTraitement] = []
    # Surveillance
    surveillance: Surveillance = Surveillance()
    # Objectifs
    objectif_g: int = 0
    objectif_f: int = 0
    # Evaluation efficacite
    evaluation: EvaluationEfficacite = EvaluationEfficacite()
    # Legacy compat
    zone: str = ""
    parties_prenantes: str = ""
    cause_racine: str = ""
    probabilite: str = "Possible"
    impact: str = "Modere"


class RisqueUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    danger: Optional[str] = None
    gravite: Optional[int] = None
    frequence: Optional[int] = None
    mesure_prevention: Optional[str] = None
    mesure_m_code: Optional[str] = None
    priorite: Optional[int] = None
    causes: Optional[str] = None
    actions: Optional[List[ActionTraitement]] = None
    surveillance: Optional[Surveillance] = None
    objectif_g: Optional[int] = None
    objectif_f: Optional[int] = None
    evaluation: Optional[EvaluationEfficacite] = None
    statut: Optional[str] = None
    zone: Optional[str] = None
    probabilite: Optional[str] = None
    impact: Optional[str] = None


class MitigationCreate(BaseModel):
    risque_id: str
    action: str
    responsable: str = ""
    echeance: str = ""
    ressources: str = ""


class IndicateurCreate(BaseModel):
    nom: str
    categorie: str = "ENVIRONNEMENT"
    valeur: float = 0
    unite: str = ""
    cible: float = 0
    periode: str = ""


def _build_risque_doc(data: RisqueCreate, coop_id: str, created_by: str) -> dict:
    """Build complete risk document following ARS 1000-1 Ch 6.1"""
    g = max(1, min(5, data.gravite))
    f = max(1, min(5, data.frequence))
    nr = _calc_nr(g, f)
    nr_code = _code_nr(nr)
    m_code = data.mesure_m_code if data.mesure_m_code in ["A", "B", "C", "D", "E"] else "C"
    efr_decision = _decision_efr(nr_code, m_code)

    # Legacy score for backwards compat
    legacy_niveaux = {"vert": "Faible", "jaune": "Moyen", "rouge": "Critique"}

    return {
        "risque_id": str(uuid.uuid4()),
        "coop_id": coop_id,
        # Contexte
        "contexte": data.contexte,
        "libelle_enjeu": data.libelle_enjeu,
        # Identification
        "titre": data.titre,
        "categorie": data.categorie,
        "danger": data.danger,
        "description": data.description,
        # Etape 1: Notation (G x F)
        "gravite": g,
        "frequence": f,
        "nr": nr,
        "nr_code": nr_code,
        "nr_label": _label_nr(nr_code),
        # Etape 3: Mesure de prevention
        "mesure_prevention": data.mesure_prevention,
        "mesure_m_code": m_code,
        # Etape 4: EFR
        "efr_nr": nr,
        "efr_m": m_code,
        "efr_decision": efr_decision,
        "efr_decision_texte": DECISIONS.get(efr_decision, ""),
        # Priorite de traitement
        "priorite": max(1, min(3, data.priorite)),
        # Causes
        "causes": data.causes or data.cause_racine,
        # Actions de traitement
        "actions": [a.model_dump() for a in data.actions],
        # Surveillance
        "surveillance": data.surveillance.model_dump(),
        # Objectifs
        "objectif_g": data.objectif_g,
        "objectif_f": data.objectif_f,
        # Evaluation efficacite
        "evaluation": data.evaluation.model_dump(),
        # Legacy compat
        "probabilite": data.probabilite,
        "impact": data.impact,
        "score": nr,
        "niveau": legacy_niveaux.get(efr_decision, "Moyen"),
        "zone": data.zone,
        "parties_prenantes": data.parties_prenantes,
        "cause_racine": data.causes or data.cause_racine,
        "statut": "ouvert",
        "mitigations": [],
        # Meta
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ============= RISQUES CRUD =============

@router.post("/registre")
async def create_risque(data: RisqueCreate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    doc = _build_risque_doc(data, coop_id, current_user.get("full_name", ""))
    await db.risques_registre.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "risque": doc}


@router.get("/registre")
async def list_risques(
    current_user: dict = Depends(get_current_user),
    categorie: Optional[str] = None,
    statut: Optional[str] = None,
    niveau: Optional[str] = None,
):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    query = {"coop_id": coop_id}
    if categorie:
        query["categorie"] = categorie
    if statut:
        query["statut"] = statut
    if niveau:
        query["niveau"] = niveau

    risques = await db.risques_registre.find(query, {"_id": 0}).sort("nr", -1).to_list(500)

    total = len(risques)
    critiques = sum(1 for r in risques if r.get("efr_decision") == "rouge" or r.get("niveau") == "Critique")
    eleves = sum(1 for r in risques if r.get("nr_code") in ["IV", "V"] or r.get("niveau") == "Eleve")
    ouverts = sum(1 for r in risques if r.get("statut") == "ouvert")
    mitigees = sum(1 for r in risques if r.get("statut") in ["mitige", "en_mitigation"])

    return {
        "risques": risques,
        "stats": {"total": total, "critiques": critiques, "eleves": eleves, "ouverts": ouverts, "mitigees": mitigees},
    }


@router.put("/registre/{risque_id}")
async def update_risque(risque_id: str, update: RisqueUpdate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}

    # Recalc NR if G or F changed
    if "gravite" in update_data or "frequence" in update_data:
        r = await db.risques_registre.find_one({"risque_id": risque_id, "coop_id": coop_id})
        if r:
            g = update_data.get("gravite", r.get("gravite", 3))
            f = update_data.get("frequence", r.get("frequence", 3))
            m_code = update_data.get("mesure_m_code", r.get("mesure_m_code", "C"))
            nr = _calc_nr(g, f)
            nr_code = _code_nr(nr)
            efr_decision = _decision_efr(nr_code, m_code)
            update_data.update({
                "nr": nr, "nr_code": nr_code, "nr_label": _label_nr(nr_code),
                "efr_nr": nr, "efr_m": m_code, "efr_decision": efr_decision,
                "efr_decision_texte": DECISIONS.get(efr_decision, ""),
                "score": nr,
            })

    if "mesure_m_code" in update_data:
        r = await db.risques_registre.find_one({"risque_id": risque_id, "coop_id": coop_id})
        if r:
            nr_code = r.get("nr_code", "III")
            m_code = update_data["mesure_m_code"]
            efr_decision = _decision_efr(nr_code, m_code)
            update_data.update({
                "efr_m": m_code, "efr_decision": efr_decision,
                "efr_decision_texte": DECISIONS.get(efr_decision, ""),
            })

    # Serialize nested models
    if "actions" in update_data and isinstance(update_data["actions"], list):
        update_data["actions"] = [a.model_dump() if hasattr(a, "model_dump") else a for a in update_data["actions"]]
    if "surveillance" in update_data and hasattr(update_data["surveillance"], "model_dump"):
        update_data["surveillance"] = update_data["surveillance"].model_dump()
    if "evaluation" in update_data and hasattr(update_data["evaluation"], "model_dump"):
        update_data["evaluation"] = update_data["evaluation"].model_dump()

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.risques_registre.update_one(
        {"risque_id": risque_id, "coop_id": coop_id}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Risque non trouve")

    r = await db.risques_registre.find_one({"risque_id": risque_id}, {"_id": 0})
    return {"status": "success", "risque": r}


# ============= MITIGATIONS =============

@router.post("/registre/{risque_id}/mitigation")
async def add_mitigation(risque_id: str, data: MitigationCreate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    mit = {
        "mitigation_id": str(uuid.uuid4()),
        "action": data.action,
        "responsable": data.responsable,
        "echeance": data.echeance,
        "ressources": data.ressources,
        "statut": "planifie",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.risques_registre.update_one(
        {"risque_id": risque_id, "coop_id": coop_id},
        {"$push": {"mitigations": mit}, "$set": {"statut": "en_mitigation", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Risque non trouve")

    return {"status": "success", "mitigation": mit}


# ============= INDICATEURS =============

@router.post("/indicateurs")
async def add_indicateur(data: IndicateurCreate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    doc = {
        "indicateur_id": str(uuid.uuid4()),
        "coop_id": coop_id,
        "nom": data.nom,
        "categorie": data.categorie,
        "valeur": data.valeur,
        "unite": data.unite,
        "cible": data.cible,
        "periode": data.periode or datetime.now(timezone.utc).strftime("%Y-%m"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.risques_indicateurs.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "indicateur": doc}


@router.get("/indicateurs")
async def list_indicateurs(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    inds = await db.risques_indicateurs.find({"coop_id": coop_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"indicateurs": inds}


# ============= DASHBOARD =============

@router.get("/dashboard")
async def get_risques_dashboard(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    risques = await db.risques_registre.find({"coop_id": coop_id}, {"_id": 0}).to_list(500)
    indicateurs = await db.risques_indicateurs.find({"coop_id": coop_id}, {"_id": 0}).to_list(200)

    total = len(risques)
    critiques = sum(1 for r in risques if r.get("efr_decision") == "rouge" or r.get("niveau") == "Critique")
    eleves = sum(1 for r in risques if r.get("nr_code") in ["IV", "V"] or r.get("niveau") == "Eleve")
    ouverts = sum(1 for r in risques if r.get("statut") == "ouvert")
    mitigees = sum(1 for r in risques if r.get("statut") in ["mitige", "en_mitigation"])

    # Matrice 5x5 (G x F)
    matrice = [[0]*5 for _ in range(5)]
    for r in risques:
        g = r.get("gravite", 0)
        f = r.get("frequence", 0)
        if 1 <= g <= 5 and 1 <= f <= 5:
            matrice[g-1][f-1] += 1

    # Repartition par EFR
    repartition_efr = {"vert": 0, "jaune": 0, "rouge": 0}
    for r in risques:
        d = r.get("efr_decision", "jaune")
        if d in repartition_efr:
            repartition_efr[d] += 1

    # Par categorie
    par_categorie = {}
    for r in risques:
        cat = r.get("categorie", "Autre")
        if cat not in par_categorie:
            par_categorie[cat] = {"count": 0, "score_moyen": 0, "critiques": 0}
        par_categorie[cat]["count"] += 1
        par_categorie[cat]["score_moyen"] += r.get("nr", r.get("score", 0))
        if r.get("efr_decision") == "rouge":
            par_categorie[cat]["critiques"] += 1
    for cat in par_categorie:
        if par_categorie[cat]["count"] > 0:
            par_categorie[cat]["score_moyen"] = round(par_categorie[cat]["score_moyen"] / par_categorie[cat]["count"], 1)

    categories_list = [{"categorie": k, **v} for k, v in par_categorie.items()]

    return {
        "kpis": {
            "total": total, "critiques": critiques, "eleves": eleves,
            "ouverts": ouverts, "mitigees": mitigees,
            "indicateurs": len(indicateurs),
        },
        "matrice_5x5": matrice,
        "repartition_efr": repartition_efr,
        "par_categorie": categories_list,
        "categories_reference": CATEGORIES_RISQUES,
        "top_risques": sorted(risques, key=lambda x: x.get("nr", x.get("score", 0)), reverse=True)[:5],
    }


# ============= REFERENCE =============

@router.get("/reference/categories")
async def get_categories():
    return {"categories": CATEGORIES_RISQUES}


@router.get("/reference/contextes")
async def get_contextes():
    return {"contextes": CONTEXTES}


@router.get("/reference/echelles")
async def get_echelles():
    return {
        "gravite": ECHELLE_GRAVITE,
        "frequence": ECHELLE_FREQUENCE,
        "nr": ECHELLE_NR,
        "m": ECHELLE_M,
        "priorites": PRIORITES,
        "decisions": DECISIONS,
    }


@router.get("/reference/niveaux")
async def get_niveaux():
    """Legacy endpoint compat"""
    return {
        "probabilite": [e["label"] for e in ECHELLE_FREQUENCE],
        "impact": [e["label"] for e in ECHELLE_GRAVITE],
    }


# ============= EXPORT EXCEL =============

@router.get("/export/excel")
async def export_cartographie_excel(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    risques = await db.risques_registre.find({"coop_id": coop_id}, {"_id": 0}).sort("nr", -1).to_list(500)

    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Cartographie des Risques"
    hf = PatternFill(start_color="1A3622", end_color="1A3622", fill_type="solid")
    sf = PatternFill(start_color="D4AF37", end_color="D4AF37", fill_type="solid")
    hfont = Font(color="FFFFFF", bold=True, size=8)
    sfont = Font(color="000000", bold=True, size=8)
    tb = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

    # Title
    ws.merge_cells("A1:AC1")
    c = ws["A1"]
    c.value = "CARTOGRAPHIE DES RISQUES DU SMCD - ARS 1000-1 Clause 6.1"
    c.fill = hf
    c.font = Font(color="FFFFFF", bold=True, size=11)
    c.alignment = Alignment(horizontal='center')

    # Section headers row 2
    sections = [
        ("A", "D", "IDENTIFICATION"),
        ("E", "G", "NOTATION NR (G x F)"),
        ("H", "I", "MESURE PREVENTION"),
        ("J", "L", "EFR"),
        ("M", "M", "PRIORITE"),
        ("N", "N", "CAUSES"),
        ("O", "R", "ACTIONS DE TRAITEMENT"),
        ("S", "U", "SURVEILLANCE"),
        ("V", "W", "OBJECTIFS"),
        ("X", "AC", "EVALUATION EFFICACITE"),
    ]
    for start, end, title in sections:
        cell = ws[f"{start}2"]
        cell.value = title
        cell.fill = sf
        cell.font = sfont
        cell.alignment = Alignment(horizontal='center', wrap_text=True)
        if start != end:
            ws.merge_cells(f"{start}2:{end}2")

    # Column headers row 3
    headers = [
        "Contexte", "Enjeu / Activite", "Danger", "Risque",
        "G", "F", "NR (GxF)",
        "Mesure prevention", "M",
        "NR", "M", "Decision",
        "Priorite",
        "Causes",
        "Action", "Responsable", "Contributeur", "Echeance",
        "Methode", "Responsable", "Echeance",
        "G cible", "F cible",
        "Critere efficacite", "Methode", "Responsable", "Date", "Enregistrements", "Efficace?"
    ]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col, value=h)
        cell.fill = PatternFill(start_color="E8F0EA", end_color="E8F0EA", fill_type="solid")
        cell.font = Font(bold=True, size=7)
        cell.border = tb
        cell.alignment = Alignment(wrap_text=True)

    for row, r in enumerate(risques, 4):
        surv = r.get("surveillance", {})
        ev = r.get("evaluation", {})
        acts = r.get("actions", [])
        act = acts[0] if acts else {}

        vals = [
            r.get("contexte", ""), r.get("libelle_enjeu", ""), r.get("danger", ""), r.get("titre", ""),
            r.get("gravite", ""), r.get("frequence", ""), r.get("nr", ""),
            r.get("mesure_prevention", ""), r.get("mesure_m_code", ""),
            r.get("efr_nr", ""), r.get("efr_m", ""), r.get("efr_decision", ""),
            r.get("priorite", ""),
            r.get("causes", ""),
            act.get("libelle", ""), act.get("responsable", ""), act.get("contributeur", ""), act.get("echeance", ""),
            surv.get("methode", ""), surv.get("responsable", ""), surv.get("echeance", ""),
            r.get("objectif_g", ""), r.get("objectif_f", ""),
            ev.get("critere", ""), ev.get("methode", ""), ev.get("responsable", ""), ev.get("date", ""), ev.get("enregistrements", ""), ev.get("efficace", ""),
        ]
        for col, val in enumerate(vals, 1):
            ws.cell(row=row, column=col, value=val).border = tb

    # Auto-width
    from openpyxl.cell.cell import MergedCell
    for col in ws.columns:
        cells = [cell for cell in col if not isinstance(cell, MergedCell)]
        if cells:
            max_len = max(len(str(cell.value or "")) for cell in cells)
            ws.column_dimensions[cells[0].column_letter].width = min(max(max_len + 2, 8), 22)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
        "Content-Disposition": "attachment; filename=cartographie_risques_ars1000.xlsx"
    })
