"""
Module Gouvernance & Revue de Direction - ARS 1000
GreenLink Agritech

Organigramme, fiches de poste, politique de management,
revue de direction, tableau de bord gouvernance.
Conforme aux clauses 5.1, 5.2, 5.3, 9.3.
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
router = APIRouter(prefix="/api/gouvernance", tags=["Gouvernance & Direction"])

# ============= POSTES EXIGES ARS 1000 =============

POSTES_ARS1000 = [
    {"code": "RESP_SMCD", "titre": "Responsable SMCD", "clause": "5.3", "description": "Responsable du Systeme de Management du Cacao Durable. Coordonne la mise en oeuvre de la norme ARS 1000, supervise les audits internes et la conformite.", "responsabilites": ["Coordonner la mise en oeuvre du SMCD", "Superviser les audits internes", "Gerer la documentation et les informations documentees", "Assurer la communication interne et externe", "Piloter le plan d'amelioration continue"], "competences": ["Connaissance de l'ARS 1000", "Gestion de projet", "Audit interne", "Communication"], "niveau": "Direction"},
    {"code": "COACH_FORMATEUR", "titre": "Coach Formateur", "clause": "7.2, 7.3", "description": "Responsable de la formation et sensibilisation des producteurs et travailleurs sur les bonnes pratiques agricoles et les exigences ARS 1000.", "responsabilites": ["Elaborer le programme annuel de formation", "Animer les sessions de sensibilisation", "Assurer le suivi post-formation", "Produire les rapports de formation"], "competences": ["Pedagogie", "Bonnes pratiques agricoles", "ARS 1000", "Agroforesterie"], "niveau": "Operationnel"},
    {"code": "CHARGE_RISQUES_TE", "titre": "Charge risques travail des enfants / travail force", "clause": "12.5-6", "description": "En charge du systeme SSRTE, identification et remediation des cas de travail des enfants et de travail force.", "responsabilites": ["Mettre en oeuvre le SSRTE", "Identifier les cas de travail des enfants", "Coordonner la remediation", "Produire les rapports SSRTE", "Former les producteurs"], "competences": ["Droits de l'enfant", "SSRTE", "Remediation", "Sensibilisation communautaire"], "niveau": "Operationnel"},
    {"code": "CHARGE_ENCADREMENT", "titre": "Charge encadrement producteurs", "clause": "8.1, 8.2", "description": "Responsable de l'accompagnement technique des producteurs dans la mise en oeuvre du PDC et des bonnes pratiques.", "responsabilites": ["Accompagner les producteurs sur le terrain", "Suivre la mise en oeuvre des PDC", "Collecter les donnees de terrain", "Rapporter les ecarts et non-conformites"], "competences": ["Agronomie", "Cacaoculture", "PDC", "Communication terrain"], "niveau": "Operationnel"},
    {"code": "CHARGE_DURABILITE", "titre": "Charge gestion risques durabilite & PDC", "clause": "6.1, 6.2", "description": "Gestion des risques lies a la durabilite, pilotage des Plans de Developpement des Cacaoyeres.", "responsabilites": ["Analyser les risques de durabilite", "Piloter les PDC", "Suivre les indicateurs environnementaux", "Coordonner les actions de resilience climatique"], "competences": ["Developpement durable", "Gestion des risques", "PDC", "Changement climatique"], "niveau": "Operationnel"},
    {"code": "DIRECTION", "titre": "Direction / CA / CG", "clause": "5.1", "description": "Leadership et engagement. La direction demontre son leadership par la definition de la politique, l'allocation des ressources et la revue de direction.", "responsabilites": ["Definir la politique de durabilite", "Allouer les ressources", "Conduire la revue de direction", "Valider les objectifs de management", "Representer la cooperative"], "competences": ["Leadership", "Gestion strategique", "Gouvernance cooperative"], "niveau": "Direction"},
    {"code": "RESP_TRACABILITE", "titre": "Responsable Tracabilite", "clause": "ARS 1000-2", "description": "Responsable de la tracabilite du cacao de la parcelle a l'export, segregation et controles qualite.", "responsabilites": ["Assurer la tracabilite des lots", "Gerer la segregation physique", "Superviser les controles qualite", "Generer les rapports de tracabilite"], "competences": ["Tracabilite", "Qualite", "ARS 1000-2", "Logistique"], "niveau": "Operationnel"},
]


# ============= MODELS =============

class PosteAssignment(BaseModel):
    code_poste: str
    titulaire_nom: str = ""
    titulaire_email: str = ""
    titulaire_telephone: str = ""
    date_prise_poste: str = ""
    notes: str = ""

class PolitiqueCreate(BaseModel):
    titre: str = "Politique de Management du Cacao Durable"
    contenu: str = ""
    date_validation: str = ""
    validee_par: str = ""
    pv_ag_reference: str = ""

class PolitiqueUpdate(BaseModel):
    contenu: Optional[str] = None
    statut: Optional[str] = None
    date_validation: Optional[str] = None
    validee_par: Optional[str] = None
    pv_ag_reference: Optional[str] = None

class RevueDirectionCreate(BaseModel):
    titre: str = "Revue de direction annuelle"
    date_revue: str = ""
    participants: str = ""
    # Entrees (inputs)
    actions_precedentes: str = ""
    resultats_audit: str = ""
    retour_parties_prenantes: str = ""
    performance_processus: str = ""
    non_conformites: str = ""
    resultats_surveillance: str = ""
    changements_contexte: str = ""
    opportunites_amelioration: str = ""
    # Donnees modules
    donnees_pdc: str = ""
    donnees_tracabilite: str = ""
    donnees_formation: str = ""
    donnees_audit: str = ""
    # Sorties (outputs)
    decisions: str = ""
    actions_correctives: str = ""
    besoins_ressources: str = ""
    objectifs_prochaine_periode: str = ""
    plan_actions: str = ""
    prochaine_revue: str = ""


def get_coop_id(user):
    return str(user.get("coop_id") or user.get("_id") or user.get("id", ""))


# ============= ORGANIGRAMME & ROLES =============

@router.get("/postes")
async def get_postes_reference():
    """Liste des postes exiges par l'ARS 1000"""
    return {"postes": POSTES_ARS1000}


@router.get("/organigramme")
async def get_organigramme(current_user: dict = Depends(get_current_user)):
    """Organigramme de la cooperative avec affectations"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    assignments = await db.gouvernance_postes.find(
        {"coop_id": coop_id}, {"_id": 0}
    ).to_list(50)

    assignment_map = {a["code_poste"]: a for a in assignments}

    organigramme = []
    for poste in POSTES_ARS1000:
        assigned = assignment_map.get(poste["code"])
        organigramme.append({
            **poste,
            "pourvu": assigned is not None and bool(assigned.get("titulaire_nom")),
            "titulaire_nom": assigned.get("titulaire_nom", "") if assigned else "",
            "titulaire_email": assigned.get("titulaire_email", "") if assigned else "",
            "titulaire_telephone": assigned.get("titulaire_telephone", "") if assigned else "",
            "date_prise_poste": assigned.get("date_prise_poste", "") if assigned else "",
            "notes": assigned.get("notes", "") if assigned else "",
        })

    postes_pourvus = sum(1 for p in organigramme if p["pourvu"])

    return {
        "organigramme": organigramme,
        "stats": {"total": len(POSTES_ARS1000), "pourvus": postes_pourvus, "vacants": len(POSTES_ARS1000) - postes_pourvus},
    }


@router.put("/organigramme/{code_poste}")
async def assign_poste(code_poste: str, data: PosteAssignment, current_user: dict = Depends(get_current_user)):
    """Affecter ou mettre a jour un titulaire de poste"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    if not any(p["code"] == code_poste for p in POSTES_ARS1000):
        raise HTTPException(status_code=400, detail="Code poste invalide")

    doc = {
        "coop_id": coop_id,
        "code_poste": code_poste,
        "titulaire_nom": data.titulaire_nom,
        "titulaire_email": data.titulaire_email,
        "titulaire_telephone": data.titulaire_telephone,
        "date_prise_poste": data.date_prise_poste,
        "notes": data.notes,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.get("full_name", ""),
    }

    await db.gouvernance_postes.update_one(
        {"coop_id": coop_id, "code_poste": code_poste},
        {"$set": doc},
        upsert=True,
    )

    return {"status": "success", "poste": doc}


# ============= POLITIQUE DE MANAGEMENT =============

@router.post("/politique")
async def create_politique(data: PolitiqueCreate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    doc = {
        "politique_id": str(uuid.uuid4()),
        "coop_id": coop_id,
        "titre": data.titre,
        "contenu": data.contenu,
        "statut": "brouillon",
        "date_validation": data.date_validation,
        "validee_par": data.validee_par,
        "pv_ag_reference": data.pv_ag_reference,
        "diffusee": False,
        "accuses_reception": 0,
        "historique": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.gouvernance_politiques.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "politique": doc}


@router.get("/politique")
async def get_politiques(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    pols = await db.gouvernance_politiques.find({"coop_id": coop_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"politiques": pols}


@router.put("/politique/{politique_id}")
async def update_politique(politique_id: str, update: PolitiqueUpdate, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    history = {"date": datetime.now(timezone.utc).isoformat(), "user": current_user.get("full_name", ""), "changes": list(update_data.keys())}

    result = await db.gouvernance_politiques.update_one(
        {"politique_id": politique_id, "coop_id": coop_id},
        {"$set": update_data, "$push": {"historique": history}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Politique non trouvee")

    pol = await db.gouvernance_politiques.find_one({"politique_id": politique_id}, {"_id": 0})
    return {"status": "success", "politique": pol}


@router.put("/politique/{politique_id}/diffuser")
async def diffuser_politique(politique_id: str, current_user: dict = Depends(get_current_user)):
    """Marquer la politique comme diffusee"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    result = await db.gouvernance_politiques.update_one(
        {"politique_id": politique_id, "coop_id": coop_id},
        {"$set": {"diffusee": True, "date_diffusion": datetime.now(timezone.utc).isoformat(), "statut": "validee"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Politique non trouvee")

    total_members = await db.users.count_documents({"coop_id": coop_id})
    await db.gouvernance_politiques.update_one(
        {"politique_id": politique_id}, {"$set": {"accuses_reception": total_members}}
    )

    return {"status": "success", "message": "Politique diffusee"}


# ============= REVUE DE DIRECTION =============

@router.post("/revue-direction")
async def create_revue(data: RevueDirectionCreate, current_user: dict = Depends(get_current_user)):
    """Creer une revue de direction (clause 9.3)"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    revue_id = str(uuid.uuid4())

    # Auto-fetch data from other modules
    auto_data = await _fetch_module_data(coop_id)

    doc = {
        "revue_id": revue_id,
        "coop_id": coop_id,
        "titre": data.titre,
        "date_revue": data.date_revue or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "participants": data.participants,
        # Entrees
        "entrees": {
            "actions_precedentes": data.actions_precedentes,
            "resultats_audit": data.resultats_audit or auto_data.get("audit_summary", ""),
            "retour_parties_prenantes": data.retour_parties_prenantes,
            "performance_processus": data.performance_processus,
            "non_conformites": data.non_conformites or auto_data.get("nc_summary", ""),
            "resultats_surveillance": data.resultats_surveillance,
            "changements_contexte": data.changements_contexte,
            "opportunites_amelioration": data.opportunites_amelioration,
        },
        "donnees_modules": {
            "pdc": data.donnees_pdc or auto_data.get("pdc_summary", ""),
            "tracabilite": data.donnees_tracabilite or auto_data.get("trace_summary", ""),
            "formation": data.donnees_formation or auto_data.get("formation_summary", ""),
            "audit": data.donnees_audit or auto_data.get("audit_detail", ""),
        },
        # Sorties
        "sorties": {
            "decisions": data.decisions,
            "actions_correctives": data.actions_correctives,
            "besoins_ressources": data.besoins_ressources,
            "objectifs_prochaine_periode": data.objectifs_prochaine_periode,
            "plan_actions": data.plan_actions,
            "prochaine_revue": data.prochaine_revue,
        },
        "statut": "brouillon",
        "created_by": current_user.get("full_name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.gouvernance_revues.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "revue": doc}


async def _fetch_module_data(coop_id: str) -> dict:
    """Recupere automatiquement les donnees des autres modules"""
    result = {}

    # Audit data
    audit_session = await db.audit_sessions.find_one({"coop_id": coop_id}, {"_id": 0}, sort=[("created_at", -1)])
    if audit_session:
        sid = audit_session.get("session_id")
        items = await db.audit_checklist_items.find({"session_id": sid, "coop_id": coop_id}, {"_id": 0}).to_list(500)
        total = len(items)
        c = sum(1 for i in items if i.get("conformite") == "C")
        nc = sum(1 for i in items if i.get("conformite") == "NC")
        na = sum(1 for i in items if i.get("conformite") == "NA")
        app = total - na
        taux = round(c / app * 100, 1) if app > 0 else 0
        result["audit_summary"] = f"Audit {audit_session.get('titre', '')}: {c} conformes, {nc} NC sur {total} exigences ({taux}% conformite)"
        result["audit_detail"] = f"Session: {audit_session.get('titre', '')} | Campagne: {audit_session.get('campagne', '')} | Taux: {taux}%"

        ncs = await db.audit_non_conformites.find({"coop_id": coop_id, "audit_session_id": sid}, {"_id": 0}).to_list(100)
        ouv = sum(1 for n in ncs if n.get("statut") == "ouvert")
        result["nc_summary"] = f"{len(ncs)} NC totales, {ouv} ouvertes"

    # Traceability data
    trace_lots = await db.traceability_lots.count_documents({"coop_id": coop_id})
    trace_cert = await db.traceability_lots.count_documents({"coop_id": coop_id, "certifie_ars1000": True})
    result["trace_summary"] = f"{trace_lots} lots traces, {trace_cert} certifies ARS 1000"

    # Formation data
    f_sessions = await db.formation_sessions.find({"coop_id": coop_id}, {"_id": 0}).to_list(500)
    f_total = len(f_sessions)
    f_comp = sum(1 for s in f_sessions if s.get("statut") == "completee")
    f_parts = sum(len(s.get("participants", [])) for s in f_sessions)
    result["formation_summary"] = f"{f_total} sessions ({f_comp} completees), {f_parts} participants formes"

    # PDC data
    pdc_count = await db.pdc_v2.count_documents({"coop_id": coop_id})
    result["pdc_summary"] = f"{pdc_count} PDC enregistres"

    return result


@router.get("/revue-direction")
async def list_revues(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    revues = await db.gouvernance_revues.find({"coop_id": coop_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"revues": revues}


@router.get("/revue-direction/{revue_id}")
async def get_revue(revue_id: str, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    r = await db.gouvernance_revues.find_one({"revue_id": revue_id, "coop_id": coop_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Revue non trouvee")
    return {"revue": r}


@router.put("/revue-direction/{revue_id}/valider")
async def valider_revue(revue_id: str, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    result = await db.gouvernance_revues.update_one(
        {"revue_id": revue_id, "coop_id": coop_id},
        {"$set": {"statut": "validee", "date_validation": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Revue non trouvee")
    return {"status": "success"}


# ============= DASHBOARD =============

@router.get("/dashboard")
async def get_gouvernance_dashboard(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    # Organigramme
    assignments = await db.gouvernance_postes.find({"coop_id": coop_id}, {"_id": 0}).to_list(50)
    postes_pourvus = sum(1 for a in assignments if a.get("titulaire_nom"))
    postes_total = len(POSTES_ARS1000)

    # Politiques
    pols = await db.gouvernance_politiques.find({"coop_id": coop_id}, {"_id": 0}).to_list(50)
    pols_validees = sum(1 for p in pols if p.get("statut") == "validee")
    pols_diffusees = sum(1 for p in pols if p.get("diffusee"))

    # Revues
    revues = await db.gouvernance_revues.find({"coop_id": coop_id}, {"_id": 0}).to_list(50)
    revues_validees = sum(1 for r in revues if r.get("statut") == "validee")
    derniere_revue = revues[0] if revues else None

    # Module data
    auto_data = await _fetch_module_data(coop_id)

    # Conformite gouvernance
    scores = []
    if postes_total > 0:
        scores.append(postes_pourvus / postes_total * 100)
    if pols:
        scores.append(pols_validees / len(pols) * 100 if pols else 0)
    if revues:
        scores.append(100 if revues_validees > 0 else 50)
    conformite_globale = round(sum(scores) / len(scores)) if scores else 0

    # Alertes
    alertes = []
    if postes_pourvus < postes_total:
        vacants = [p["titre"] for p in POSTES_ARS1000 if p["code"] not in {a["code_poste"] for a in assignments if a.get("titulaire_nom")}]
        for v in vacants[:3]:
            alertes.append({"severity": "error", "message": f"Poste vacant: {v}"})
    if not pols:
        alertes.append({"severity": "error", "message": "Aucune politique de management definie"})
    elif not pols_diffusees:
        alertes.append({"severity": "warning", "message": "Politique non diffusee aux membres"})
    if not revues:
        alertes.append({"severity": "error", "message": "Aucune revue de direction realisee"})

    return {
        "kpis": {
            "postes_pourvus": postes_pourvus,
            "postes_total": postes_total,
            "taux_postes": round(postes_pourvus / postes_total * 100) if postes_total > 0 else 0,
            "politiques": len(pols),
            "politiques_validees": pols_validees,
            "politiques_diffusees": pols_diffusees,
            "revues": len(revues),
            "revues_validees": revues_validees,
            "conformite_globale": conformite_globale,
        },
        "derniere_revue": derniere_revue,
        "module_data": auto_data,
        "alertes": alertes,
    }


# ============= EXPORT PDF =============

@router.get("/revue-direction/{revue_id}/pdf")
async def export_revue_pdf(revue_id: str, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    r = await db.gouvernance_revues.find_one({"revue_id": revue_id, "coop_id": coop_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Revue non trouvee")

    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    el = []

    title_s = ParagraphStyle("T", parent=styles["Title"], fontSize=16, textColor=colors.HexColor("#1A3622"))
    h2_s = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#1A3622"))
    normal_s = ParagraphStyle("N", parent=styles["Normal"], fontSize=9, leading=12)

    el.append(Paragraph("RAPPORT DE REVUE DE DIRECTION", title_s))
    el.append(Paragraph(f"Clause 9.3 ARS 1000 | {r.get('titre', '')}", normal_s))
    el.append(Paragraph(f"Date: {r.get('date_revue', '')} | Participants: {r.get('participants', '')}", normal_s))
    el.append(Spacer(1, 0.8*cm))

    def section(title, data_dict):
        el.append(Paragraph(title, h2_s))
        el.append(Spacer(1, 0.2*cm))
        rows = [[k.replace("_", " ").capitalize(), str(v)[:200]] for k, v in data_dict.items() if v]
        if rows:
            t = Table(rows, colWidths=[5*cm, 11*cm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E8F0EA")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E5E0")),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
            ]))
            el.append(t)
        el.append(Spacer(1, 0.5*cm))

    section("ELEMENTS D'ENTREE", r.get("entrees", {}))
    section("DONNEES DES MODULES", r.get("donnees_modules", {}))
    section("ELEMENTS DE SORTIE", r.get("sorties", {}))

    el.append(Spacer(1, 1*cm))
    el.append(Paragraph("Signature Direction: ________________     Date: ________________", normal_s))

    doc.build(el)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=revue_direction_{revue_id[:8]}.pdf"
    })


@router.get("/organigramme/pdf")
async def export_organigramme_pdf(current_user: dict = Depends(get_current_user)):
    """Exporter l'organigramme en PDF"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    assignments = await db.gouvernance_postes.find({"coop_id": coop_id}, {"_id": 0}).to_list(50)
    assignment_map = {a["code_poste"]: a for a in assignments}

    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    el = []

    title_s = ParagraphStyle("T", parent=styles["Title"], fontSize=16, textColor=colors.HexColor("#1A3622"))
    el.append(Paragraph("ORGANIGRAMME SMCD - ARS 1000", title_s))
    el.append(Spacer(1, 0.5*cm))

    headers = ["Poste", "Clause", "Titulaire", "Contact", "Date prise poste"]
    rows = [headers]
    for p in POSTES_ARS1000:
        a = assignment_map.get(p["code"])
        rows.append([
            p["titre"][:25], p["clause"],
            a.get("titulaire_nom", "VACANT") if a else "VACANT",
            a.get("titulaire_telephone", "") if a else "",
            a.get("date_prise_poste", "") if a else "",
        ])

    t = Table(rows, colWidths=[5*cm, 2.5*cm, 4*cm, 3*cm, 2.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A3622")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E5E0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    el.append(t)

    doc.build(el)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": "attachment; filename=organigramme_smcd.pdf"
    })
