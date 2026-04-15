"""
Module Gestion des Membres & Enregistrement ARS 1000
Clauses 4.2.2, 4.2.3, 4.3

Procedure d'adhesion digitale, bulletin/contrat, perimetre SM.
S'appuie sur la collection coop_members existante.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import StreamingResponse
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId
import logging
import io
import uuid

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/membres", tags=["Membres & Enregistrement ARS 1000"])

# ============= CHAMPS NORME 4.2.3.2 (a-n) =============

CHAMPS_4232 = [
    {"code": "a", "label": "Nom et prenoms complets", "field": "full_name", "required": True},
    {"code": "b", "label": "Date de naissance", "field": "date_naissance", "required": False},
    {"code": "c", "label": "Sexe", "field": "sexe", "required": True},
    {"code": "d", "label": "Numero de piece d'identite (CNI)", "field": "cni_number", "required": True},
    {"code": "e", "label": "Numero de telephone", "field": "phone_number", "required": True},
    {"code": "f", "label": "Village / Localite", "field": "village", "required": True},
    {"code": "g", "label": "Departement / Sous-prefecture", "field": "department", "required": False},
    {"code": "h", "label": "Zone / Section", "field": "zone", "required": False},
    {"code": "i", "label": "Nombre de parcelles", "field": "nombre_parcelles", "required": False},
    {"code": "j", "label": "Superficie totale (hectares)", "field": "hectares_approx", "required": False},
    {"code": "k", "label": "GPS parcelle principale", "field": "gps_parcelle", "required": False},
    {"code": "l", "label": "Nombre de travailleurs", "field": "nombre_travailleurs", "required": False},
    {"code": "m", "label": "Date d'adhesion", "field": "date_adhesion", "required": False},
    {"code": "n", "label": "Statut du producteur", "field": "statut_producteur", "required": False},
]

ETAPES_ADHESION = [
    {"etape": 1, "titre": "Sensibilisation", "description": "Information sur les objectifs et la portee de la norme ARS 1000, les activites de durabilite."},
    {"etape": 2, "titre": "Collecte des informations", "description": "Saisie des informations obligatoires exigees par la norme 4.2.3.2 (a-n)."},
    {"etape": 3, "titre": "Bulletin d'adhesion", "description": "Signature du bulletin/contrat d'adhesion par le producteur et 2 temoins."},
    {"etape": 4, "titre": "Validation", "description": "Validation par le Responsable SMCD ou le CA/CG."},
]


def get_coop_id(user):
    return str(user.get("coop_id") or user.get("_id") or user.get("id", ""))


# ============= MODELS =============

class AdhesionCreate(BaseModel):
    # Step 1: Sensibilisation
    sensibilisation_faite: bool = False
    sensibilisation_date: str = ""
    sensibilisation_accuse: bool = False
    # Step 2: Info 4.2.3.2
    full_name: str
    date_naissance: str = ""
    sexe: str = ""
    cni_number: str = ""
    phone_number: str = ""
    village: str = ""
    department: str = ""
    zone: str = ""
    nombre_parcelles: int = 0
    hectares_approx: float = 0
    gps_parcelle: str = ""
    nombre_travailleurs: int = 0
    statut_producteur: str = "actif"
    # Step 3: Bulletin
    signature_producteur: bool = False
    temoin_1_nom: str = ""
    temoin_1_signature: bool = False
    temoin_2_nom: str = ""
    temoin_2_signature: bool = False
    notes: str = ""

class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    date_naissance: Optional[str] = None
    sexe: Optional[str] = None
    cni_number: Optional[str] = None
    phone_number: Optional[str] = None
    village: Optional[str] = None
    department: Optional[str] = None
    zone: Optional[str] = None
    nombre_parcelles: Optional[int] = None
    hectares_approx: Optional[float] = None
    gps_parcelle: Optional[str] = None
    nombre_travailleurs: Optional[int] = None
    statut_producteur: Optional[str] = None
    notes: Optional[str] = None

class PerimetreUpdate(BaseModel):
    description: str = ""
    producteurs_inclus: int = 0
    parcelles_incluses: int = 0
    exclusions: str = ""
    date_validation: str = ""
    valide_par: str = ""


# ============= PROCEDURE D'ADHESION =============

@router.post("/adhesion")
async def create_adhesion(data: AdhesionCreate, current_user: dict = Depends(get_current_user)):
    """Creer une demande d'adhesion complete (4 etapes)"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    adhesion_id = str(uuid.uuid4())
    code_membre = f"MBR-{uuid.uuid4().hex[:6].upper()}"

    # Determine etape courante
    etape = 1
    if data.sensibilisation_faite:
        etape = 2
    if data.full_name and data.phone_number:
        etape = 3
    if data.signature_producteur:
        etape = 4

    doc = {
        "adhesion_id": adhesion_id,
        "code_membre": code_membre,
        "coop_id": coop_id,
        # Etape 1
        "sensibilisation_faite": data.sensibilisation_faite,
        "sensibilisation_date": data.sensibilisation_date,
        "sensibilisation_accuse": data.sensibilisation_accuse,
        # Etape 2: Info 4.2.3.2
        "full_name": data.full_name,
        "date_naissance": data.date_naissance,
        "sexe": data.sexe,
        "cni_number": data.cni_number,
        "phone_number": data.phone_number,
        "village": data.village,
        "department": data.department,
        "zone": data.zone,
        "nombre_parcelles": data.nombre_parcelles,
        "hectares_approx": data.hectares_approx,
        "gps_parcelle": data.gps_parcelle,
        "nombre_travailleurs": data.nombre_travailleurs,
        "statut_producteur": data.statut_producteur,
        "date_adhesion": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        # Etape 3: Bulletin
        "signature_producteur": data.signature_producteur,
        "temoin_1_nom": data.temoin_1_nom,
        "temoin_1_signature": data.temoin_1_signature,
        "temoin_2_nom": data.temoin_2_nom,
        "temoin_2_signature": data.temoin_2_signature,
        # Meta
        "etape_courante": etape,
        "statut": "en_cours" if etape < 4 else "en_attente_validation",
        "validation": {"validee": False, "validee_par": "", "date_validation": ""},
        "notes": data.notes,
        "historique": [],
        "created_by": current_user.get("full_name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.membres_adhesions.insert_one(doc)
    doc.pop("_id", None)

    return {"status": "success", "adhesion": doc, "code_membre": code_membre}


@router.get("/adhesions")
async def list_adhesions(
    current_user: dict = Depends(get_current_user),
    statut: Optional[str] = None,
    search: Optional[str] = None,
):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    query = {"coop_id": coop_id}
    if statut:
        query["statut"] = statut
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"code_membre": {"$regex": search, "$options": "i"}},
            {"village": {"$regex": search, "$options": "i"}},
        ]

    adhesions = await db.membres_adhesions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    total = len(adhesions)
    en_cours = sum(1 for a in adhesions if a.get("statut") == "en_cours")
    en_attente = sum(1 for a in adhesions if a.get("statut") == "en_attente_validation")
    valides = sum(1 for a in adhesions if a.get("statut") == "valide")
    retrait = sum(1 for a in adhesions if a.get("statut") == "retrait")

    return {
        "adhesions": adhesions,
        "stats": {"total": total, "en_cours": en_cours, "en_attente_validation": en_attente, "valides": valides, "retrait": retrait},
    }


@router.put("/adhesion/{adhesion_id}/valider")
async def valider_adhesion(adhesion_id: str, current_user: dict = Depends(get_current_user)):
    """Valider une adhesion (etape 4 - par Resp SMCD ou CA/CG)"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    result = await db.membres_adhesions.update_one(
        {"adhesion_id": adhesion_id, "coop_id": coop_id},
        {"$set": {
            "statut": "valide",
            "etape_courante": 4,
            "validation.validee": True,
            "validation.validee_par": current_user.get("full_name", ""),
            "validation.date_validation": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Adhesion non trouvee")

    return {"status": "success", "message": "Adhesion validee"}


@router.put("/adhesion/{adhesion_id}/retrait")
async def retrait_membre(adhesion_id: str, current_user: dict = Depends(get_current_user)):
    """Marquer un retrait de membre"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    result = await db.membres_adhesions.update_one(
        {"adhesion_id": adhesion_id, "coop_id": coop_id},
        {"$set": {"statut": "retrait", "date_retrait": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Adhesion non trouvee")

    return {"status": "success"}


# ============= BULLETIN PDF =============

@router.get("/adhesion/{adhesion_id}/bulletin/pdf")
async def generate_bulletin_pdf(adhesion_id: str, current_user: dict = Depends(get_current_user)):
    """Generer le bulletin/contrat d'adhesion en PDF"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    a = await db.membres_adhesions.find_one({"adhesion_id": adhesion_id, "coop_id": coop_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Adhesion non trouvee")

    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    el = []

    title_s = ParagraphStyle("T", parent=styles["Title"], fontSize=16, textColor=colors.HexColor("#1A3622"), alignment=1)
    center_s = ParagraphStyle("C", parent=styles["Normal"], alignment=1, fontSize=10)
    normal_s = ParagraphStyle("N", parent=styles["Normal"], fontSize=9, leading=12)

    el.append(Paragraph("BULLETIN D'ADHESION", title_s))
    el.append(Paragraph("Contrat de membre - Norme ARS 1000", center_s))
    el.append(Spacer(1, 0.8*cm))

    info = [
        ["Code membre", a.get("code_membre", "")],
        ["Nom complet (a)", a.get("full_name", "")],
        ["Date de naissance (b)", a.get("date_naissance", "")],
        ["Sexe (c)", a.get("sexe", "")],
        ["N CNI (d)", a.get("cni_number", "")],
        ["Telephone (e)", a.get("phone_number", "")],
        ["Village (f)", a.get("village", "")],
        ["Departement (g)", a.get("department", "")],
        ["Zone (h)", a.get("zone", "")],
        ["Parcelles (i)", str(a.get("nombre_parcelles", 0))],
        ["Superficie ha (j)", str(a.get("hectares_approx", 0))],
        ["GPS (k)", a.get("gps_parcelle", "")],
        ["Travailleurs (l)", str(a.get("nombre_travailleurs", 0))],
        ["Date adhesion (m)", a.get("date_adhesion", "")],
    ]
    t = Table(info, colWidths=[5*cm, 11*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E8F0EA")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E5E0")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    el.append(t)
    el.append(Spacer(1, 0.8*cm))

    el.append(Paragraph("En signant ce bulletin, je m'engage a respecter les statuts, le reglement interieur et la charte de la cooperative, ainsi que les exigences de la norme ARS 1000 pour la durabilite du cacao.", normal_s))
    el.append(Spacer(1, 1*cm))

    sigs = [
        ["Signature du producteur", "Oui" if a.get("signature_producteur") else "______"],
        ["Temoin 1: " + a.get("temoin_1_nom", "______"), "Oui" if a.get("temoin_1_signature") else "______"],
        ["Temoin 2: " + a.get("temoin_2_nom", "______"), "Oui" if a.get("temoin_2_signature") else "______"],
    ]
    st = Table(sigs, colWidths=[8*cm, 8*cm])
    st.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E5E0")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
    ]))
    el.append(st)

    el.append(Spacer(1, 0.5*cm))
    v = a.get("validation", {})
    if v.get("validee"):
        el.append(Paragraph(f"Valide par: {v.get('validee_par', '')} le {v.get('date_validation', '')}", normal_s))

    el.append(Spacer(1, 0.5*cm))
    el.append(Paragraph("Cachet de la Cooperative: ________________", normal_s))

    doc.build(el)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=bulletin_{a.get('code_membre', '')}.pdf"
    })


# ============= BASE DE DONNEES MEMBRES =============

@router.get("/registre")
async def get_registre_membres(
    current_user: dict = Depends(get_current_user),
    statut: Optional[str] = None,
    village: Optional[str] = None,
    sexe: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    """Registre complet des membres (champs 4.2.3.2 a-n)"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    query = {"coop_id": coop_id}
    if statut:
        query["statut"] = statut
    if village:
        query["village"] = {"$regex": village, "$options": "i"}
    if sexe:
        query["sexe"] = sexe
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"code_membre": {"$regex": search, "$options": "i"}},
            {"phone_number": {"$regex": search, "$options": "i"}},
            {"cni_number": {"$regex": search, "$options": "i"}},
        ]

    total = await db.membres_adhesions.count_documents(query)
    membres = await db.membres_adhesions.find(query, {"_id": 0}).sort("full_name", 1).skip(skip).limit(limit).to_list(limit)

    return {"membres": membres, "total": total, "skip": skip, "limit": limit}


@router.put("/registre/{adhesion_id}")
async def update_membre(adhesion_id: str, update: MemberUpdate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    history = {"date": datetime.now(timezone.utc).isoformat(), "user": current_user.get("full_name", ""), "fields": list(update_data.keys())}

    result = await db.membres_adhesions.update_one(
        {"adhesion_id": adhesion_id, "coop_id": coop_id},
        {"$set": update_data, "$push": {"historique": history}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Membre non trouve")

    m = await db.membres_adhesions.find_one({"adhesion_id": adhesion_id}, {"_id": 0})
    return {"status": "success", "membre": m}


# ============= PERIMETRE SM (clause 4.3) =============

@router.post("/perimetre")
async def save_perimetre(data: PerimetreUpdate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    # Count members
    total_membres = await db.membres_adhesions.count_documents({"coop_id": coop_id, "statut": "valide"})
    total_hectares_pipeline = [
        {"$match": {"coop_id": coop_id, "statut": "valide"}},
        {"$group": {"_id": None, "total": {"$sum": "$hectares_approx"}}},
    ]
    ha_result = await db.membres_adhesions.aggregate(total_hectares_pipeline).to_list(1)
    total_ha = ha_result[0]["total"] if ha_result else 0

    doc = {
        "perimetre_id": str(uuid.uuid4()),
        "coop_id": coop_id,
        "description": data.description,
        "producteurs_inclus": data.producteurs_inclus or total_membres,
        "parcelles_incluses": data.parcelles_incluses,
        "superficie_totale_ha": round(total_ha, 2),
        "exclusions": data.exclusions,
        "date_validation": data.date_validation,
        "valide_par": data.valide_par,
        "auto_stats": {"total_membres_valides": total_membres, "total_hectares": round(total_ha, 2)},
        "created_by": current_user.get("full_name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.membres_perimetres.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "perimetre": doc}


@router.get("/perimetre")
async def get_perimetres(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    perimetres = await db.membres_perimetres.find({"coop_id": coop_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"perimetres": perimetres}


# ============= DASHBOARD =============

@router.get("/dashboard")
async def get_membres_dashboard(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    total = await db.membres_adhesions.count_documents({"coop_id": coop_id})
    valides = await db.membres_adhesions.count_documents({"coop_id": coop_id, "statut": "valide"})
    en_cours = await db.membres_adhesions.count_documents({"coop_id": coop_id, "statut": "en_cours"})
    en_attente = await db.membres_adhesions.count_documents({"coop_id": coop_id, "statut": "en_attente_validation"})
    retrait = await db.membres_adhesions.count_documents({"coop_id": coop_id, "statut": "retrait"})

    # By sex
    sexe_pipeline = [
        {"$match": {"coop_id": coop_id, "statut": {"$ne": "retrait"}}},
        {"$group": {"_id": "$sexe", "count": {"$sum": 1}}},
    ]
    sexe_result = await db.membres_adhesions.aggregate(sexe_pipeline).to_list(10)
    par_sexe = {r["_id"]: r["count"] for r in sexe_result if r["_id"]}

    # By village
    village_pipeline = [
        {"$match": {"coop_id": coop_id, "statut": {"$ne": "retrait"}}},
        {"$group": {"_id": "$village", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    village_result = await db.membres_adhesions.aggregate(village_pipeline).to_list(10)
    par_village = [{"village": r["_id"] or "Non defini", "count": r["count"]} for r in village_result]

    # Total hectares
    ha_pipeline = [
        {"$match": {"coop_id": coop_id, "statut": "valide"}},
        {"$group": {"_id": None, "total": {"$sum": "$hectares_approx"}}},
    ]
    ha_result = await db.membres_adhesions.aggregate(ha_pipeline).to_list(1)
    total_ha = round(ha_result[0]["total"], 1) if ha_result else 0

    # Perimetre
    perimetre = await db.membres_perimetres.find_one({"coop_id": coop_id}, {"_id": 0}, sort=[("created_at", -1)])

    return {
        "kpis": {
            "total": total,
            "valides": valides,
            "en_cours": en_cours,
            "en_attente_validation": en_attente,
            "retrait": retrait,
            "hommes": par_sexe.get("M", 0),
            "femmes": par_sexe.get("F", 0),
            "total_hectares": total_ha,
        },
        "par_village": par_village,
        "perimetre": perimetre,
    }


# ============= EXPORT EXCEL =============

@router.get("/export/excel")
async def export_registre_excel(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    membres = await db.membres_adhesions.find({"coop_id": coop_id}, {"_id": 0}).sort("full_name", 1).to_list(5000)

    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Registre des Membres"
    hf = PatternFill(start_color="1A3622", end_color="1A3622", fill_type="solid")
    hfont = Font(color="FFFFFF", bold=True, size=9)
    tb = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

    headers = ["Code", "Nom (a)", "Naissance (b)", "Sexe (c)", "CNI (d)", "Tel (e)", "Village (f)", "Dept (g)", "Zone (h)", "Parcelles (i)", "Hectares (j)", "GPS (k)", "Travailleurs (l)", "Adhesion (m)", "Statut (n)", "Sensib.", "Signature", "Temoin1", "Temoin2", "Valide"]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.fill = hf
        cell.font = hfont
        cell.border = tb

    for row, m in enumerate(membres, 2):
        v = m.get("validation", {})
        vals = [m.get("code_membre", ""), m.get("full_name", ""), m.get("date_naissance", ""), m.get("sexe", ""), m.get("cni_number", ""), m.get("phone_number", ""), m.get("village", ""), m.get("department", ""), m.get("zone", ""), m.get("nombre_parcelles", 0), m.get("hectares_approx", 0), m.get("gps_parcelle", ""), m.get("nombre_travailleurs", 0), m.get("date_adhesion", ""), m.get("statut", ""), "Oui" if m.get("sensibilisation_faite") else "Non", "Oui" if m.get("signature_producteur") else "Non", m.get("temoin_1_nom", ""), m.get("temoin_2_nom", ""), "Oui" if v.get("validee") else "Non"]
        for col, val in enumerate(vals, 1):
            ws.cell(row=row, column=col, value=val).border = tb

    for i in range(1, 21):
        ws.column_dimensions[chr(64 + i) if i < 27 else 'A'].width = 14

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
        "Content-Disposition": "attachment; filename=registre_membres_ars1000.xlsx"
    })


# ============= ETAPES & CHAMPS REFERENCE =============

@router.get("/reference/etapes")
async def get_etapes():
    return {"etapes": ETAPES_ADHESION}

@router.get("/reference/champs")
async def get_champs():
    return {"champs": CHAMPS_4232}
