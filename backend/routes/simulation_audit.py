"""
Mode Simulation d'Audit ARS 1000
Audit blanc interactif clause par clause, score final, recommandations.
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
router = APIRouter(prefix="/api/simulation-audit", tags=["Simulation Audit ARS 1000"])

# ============= CLAUSES DE SIMULATION =============

SIMULATION_CLAUSES = [
    # Gouvernance & Organisation
    {"id": "4.2", "section": "Organisation", "titre": "Enregistrement des membres", "exigence": "Tous les producteurs sont enregistres avec les informations 4.2.3.2 (a-n) et ont signe un bulletin d'adhesion.", "type": "Majeure", "module": "membres", "preuve": "Registre des membres, bulletins signes", "recommandation_nc": "Completer l'enregistrement de tous les producteurs avec les 14 champs obligatoires et les bulletins d'adhesion signes."},
    {"id": "4.3", "section": "Organisation", "titre": "Perimetre du SM", "exigence": "Le perimetre d'application du systeme de management est defini, documente et valide par la Direction.", "type": "Majeure", "module": "membres", "preuve": "Document de perimetre valide", "recommandation_nc": "Definir et faire valider le perimetre du SM par la Direction."},
    {"id": "5.1", "section": "Gouvernance", "titre": "Leadership & Engagement", "exigence": "La Direction demontre son leadership par la definition de la politique et l'allocation des ressources.", "type": "Majeure", "module": "gouvernance", "preuve": "Politique validee, PV AG, budget alloue", "recommandation_nc": "Formaliser l'engagement de la Direction par une politique validee et des ressources allouees."},
    {"id": "5.2", "section": "Gouvernance", "titre": "Politique de management", "exigence": "La politique de management est definie, validee par l'AG, et diffusee a tous les membres.", "type": "Majeure", "module": "gouvernance", "preuve": "Politique signee, PV AG, accuses de reception", "recommandation_nc": "Rediger, faire valider et diffuser la politique de management a tous les membres."},
    {"id": "5.3", "section": "Gouvernance", "titre": "Roles & Responsabilites", "exigence": "L'organigramme est complet avec tous les postes exiges (Resp SMCD, Coach, Charge risques TE, etc.).", "type": "Majeure", "module": "gouvernance", "preuve": "Organigramme, fiches de poste, contrats", "recommandation_nc": "Pourvoir tous les postes exiges par la norme et etablir les fiches de poste."},
    # Planification & Risques
    {"id": "6.1", "section": "Planification", "titre": "Analyse des risques", "exigence": "Les risques de durabilite sont identifies, analyses et des actions de mitigation sont planifiees.", "type": "Mineure", "module": "gouvernance", "preuve": "Registre des risques, plan de mitigation", "recommandation_nc": "Realiser une analyse des risques de durabilite et documenter les actions de mitigation."},
    # Formation
    {"id": "7.3", "section": "Formation", "titre": "Programme de formation", "exigence": "Un programme annuel de formation couvre les 12 themes obligatoires ARS 1000.", "type": "Majeure", "module": "formation", "preuve": "Programme annuel, PV de sessions, listes de presence", "recommandation_nc": "Elaborer et executer le programme annuel couvrant tous les themes obligatoires."},
    {"id": "7.4", "section": "Formation", "titre": "Competences & Sensibilisation", "exigence": "Les producteurs et travailleurs sont formes et des attestations sont delivrees.", "type": "Mineure", "module": "formation", "preuve": "Attestations, PV, listes de presence", "recommandation_nc": "Delivrer des attestations individuelles pour chaque formation completee."},
    # PDC & Production
    {"id": "8.1", "section": "Production", "titre": "Plan de Developpement (PDC)", "exigence": "Chaque producteur dispose d'un PDC conforme incluant diagnostic, plan d'action et suivi.", "type": "Majeure", "module": "pdc", "preuve": "PDC documentes par producteur", "recommandation_nc": "Etablir un PDC pour chaque producteur membre conforme au format officiel."},
    # Audit
    {"id": "9.2", "section": "Audit", "titre": "Audit interne", "exigence": "Un audit interne complet est realise couvrant toutes les exigences ARS 1000-1 et ARS 1000-2.", "type": "Majeure", "module": "audit", "preuve": "Rapport d'audit, checklist remplie, tableau NC", "recommandation_nc": "Realiser l'audit interne complet et documenter les resultats dans la checklist."},
    {"id": "9.3", "section": "Audit", "titre": "Revue de direction", "exigence": "Une revue de direction annuelle est realisee avec les elements d'entree et de sortie exiges.", "type": "Majeure", "module": "gouvernance", "preuve": "PV de revue de direction signe", "recommandation_nc": "Conduire la revue de direction annuelle avec tous les elements exiges par la clause 9.3."},
    # Tracabilite
    {"id": "11-16", "section": "Tracabilite", "titre": "Tracabilite du cacao", "exigence": "La tracabilite est assuree de la parcelle a l'export avec segregation physique certifie/non-certifie.", "type": "Majeure", "module": "tracabilite", "preuve": "Registre des lots, QR codes, rapports de segregation", "recommandation_nc": "Mettre en place la tracabilite complete avec segregation et QR codes."},
    # Social
    {"id": "12.2", "section": "Social", "titre": "Droits de l'homme", "exigence": "La politique en matiere de droits de l'homme est definie et les formations realisees.", "type": "Majeure", "module": "formation", "preuve": "Politique, PV de formation, listes de presence", "recommandation_nc": "Former tous les producteurs et travailleurs sur les droits de l'homme."},
    {"id": "12.5", "section": "Social", "titre": "Travail des enfants (SSRTE)", "exigence": "Le systeme SSRTE est operationnel avec identification, suivi et remediation.", "type": "Majeure", "module": "formation", "preuve": "Rapports SSRTE, registre des cas, preuves de remediation", "recommandation_nc": "Mettre en oeuvre le systeme SSRTE complet avec formation des producteurs."},
    {"id": "12.8", "section": "Social", "titre": "Sante & Securite au Travail", "exigence": "Les formations SST sont realisees et les EPI sont disponibles.", "type": "Mineure", "module": "formation", "preuve": "PV de formation SST, registre EPI", "recommandation_nc": "Former les travailleurs a la SST et fournir les EPI necessaires."},
    # Environnement
    {"id": "13.2", "section": "Environnement", "titre": "Protection des eaux", "exigence": "Des mesures de protection des plans d'eau sont en place avec zones tampons.", "type": "Mineure", "module": "formation", "preuve": "Cartographie zones tampons, PV de formation", "recommandation_nc": "Identifier les plans d'eau et mettre en place les zones tampons reglementaires."},
    {"id": "13.3", "section": "Environnement", "titre": "Gestion agrochimiques", "exigence": "Les produits agrochimiques sont geres en securite avec formation des applicateurs.", "type": "Mineure", "module": "formation", "preuve": "Registre des produits, PV de formation applicateurs", "recommandation_nc": "Former les applicateurs et documenter la gestion securisee des agrochimiques."},
]


def get_coop_id(user):
    return str(user.get("coop_id") or user.get("_id") or user.get("id", ""))


class SimulationCreate(BaseModel):
    titre: str = "Simulation d'audit ARS 1000"
    auditeur: str = ""

class ClauseEvaluation(BaseModel):
    clause_id: str
    conformite: str  # C / NC / NA
    observations: str = ""


# ============= ENDPOINTS =============

@router.get("/clauses")
async def get_simulation_clauses():
    """Liste des clauses pour la simulation"""
    return {"clauses": SIMULATION_CLAUSES, "total": len(SIMULATION_CLAUSES)}


@router.post("/start")
async def start_simulation(data: SimulationCreate, current_user: dict = Depends(get_current_user)):
    """Demarrer une nouvelle simulation d'audit"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    sim_id = str(uuid.uuid4())
    evaluations = []
    for clause in SIMULATION_CLAUSES:
        evaluations.append({
            "clause_id": clause["id"],
            "section": clause["section"],
            "titre": clause["titre"],
            "type": clause["type"],
            "module": clause["module"],
            "conformite": "",
            "observations": "",
        })

    doc = {
        "simulation_id": sim_id,
        "coop_id": coop_id,
        "titre": data.titre,
        "auditeur": data.auditeur,
        "evaluations": evaluations,
        "statut": "en_cours",
        "score": 0,
        "created_by": current_user.get("full_name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": "",
    }

    await db.simulation_audits.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "simulation": doc}


@router.get("/list")
async def list_simulations(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    sims = await db.simulation_audits.find({"coop_id": coop_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"simulations": sims}


@router.get("/{simulation_id}")
async def get_simulation(simulation_id: str, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)
    sim = await db.simulation_audits.find_one({"simulation_id": simulation_id, "coop_id": coop_id}, {"_id": 0})
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation non trouvee")
    return {"simulation": sim}


@router.put("/{simulation_id}/evaluate")
async def evaluate_clause(simulation_id: str, data: ClauseEvaluation, current_user: dict = Depends(get_current_user)):
    """Evaluer une clause dans la simulation"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    sim = await db.simulation_audits.find_one({"simulation_id": simulation_id, "coop_id": coop_id})
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation non trouvee")

    evaluations = sim.get("evaluations", [])
    updated = False
    for ev in evaluations:
        if ev["clause_id"] == data.clause_id:
            ev["conformite"] = data.conformite
            ev["observations"] = data.observations
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Clause non trouvee")

    # Recalculate score
    evaluated = [e for e in evaluations if e.get("conformite")]
    conformes = sum(1 for e in evaluated if e["conformite"] == "C")
    non_na = [e for e in evaluated if e["conformite"] != "NA"]
    score = round(conformes / len(non_na) * 100) if non_na else 0

    await db.simulation_audits.update_one(
        {"simulation_id": simulation_id},
        {"$set": {"evaluations": evaluations, "score": score}}
    )

    return {"status": "success", "score": score, "evaluated": len(evaluated), "total": len(evaluations)}


@router.put("/{simulation_id}/complete")
async def complete_simulation(simulation_id: str, current_user: dict = Depends(get_current_user)):
    """Terminer la simulation et generer les recommandations"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    sim = await db.simulation_audits.find_one({"simulation_id": simulation_id, "coop_id": coop_id})
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation non trouvee")

    evaluations = sim.get("evaluations", [])
    evaluated = [e for e in evaluations if e.get("conformite")]
    conformes = sum(1 for e in evaluated if e["conformite"] == "C")
    nc_list = [e for e in evaluated if e["conformite"] == "NC"]
    na_list = [e for e in evaluated if e["conformite"] == "NA"]
    non_na = [e for e in evaluated if e["conformite"] != "NA"]
    score = round(conformes / len(non_na) * 100) if non_na else 0

    # Build recommendations
    recommandations = []
    clause_map = {c["id"]: c for c in SIMULATION_CLAUSES}
    nc_majeures = []
    nc_mineures = []

    for nc in nc_list:
        clause_ref = clause_map.get(nc["clause_id"], {})
        rec = {
            "clause": nc["clause_id"],
            "titre": nc["titre"],
            "type": nc["type"],
            "observations": nc.get("observations", ""),
            "recommandation": clause_ref.get("recommandation_nc", ""),
            "module": nc.get("module", ""),
            "priorite": "haute" if nc["type"] == "Majeure" else "moyenne",
        }
        recommandations.append(rec)
        if nc["type"] == "Majeure":
            nc_majeures.append(rec)
        else:
            nc_mineures.append(rec)

    # Verdict
    if score >= 80 and len(nc_majeures) == 0:
        verdict = "FAVORABLE"
        verdict_detail = "La cooperative est prete pour l'audit externe. Aucune NC majeure."
    elif score >= 60 and len(nc_majeures) <= 2:
        verdict = "FAVORABLE AVEC RESERVES"
        verdict_detail = f"Bon niveau de conformite mais {len(nc_majeures)} NC majeure(s) a resoudre avant l'audit."
    else:
        verdict = "DEFAVORABLE"
        verdict_detail = f"Des actions significatives sont necessaires. {len(nc_majeures)} NC majeure(s) et {len(nc_mineures)} NC mineure(s)."

    result = {
        "score": score,
        "verdict": verdict,
        "verdict_detail": verdict_detail,
        "total_clauses": len(evaluations),
        "evaluees": len(evaluated),
        "conformes": conformes,
        "nc_total": len(nc_list),
        "nc_majeures": len(nc_majeures),
        "nc_mineures": len(nc_mineures),
        "na": len(na_list),
        "recommandations": recommandations,
    }

    await db.simulation_audits.update_one(
        {"simulation_id": simulation_id},
        {"$set": {
            "statut": "termine",
            "score": score,
            "resultat": result,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {"status": "success", "resultat": result}


@router.get("/{simulation_id}/rapport/pdf")
async def export_rapport_pdf(simulation_id: str, current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    sim = await db.simulation_audits.find_one({"simulation_id": simulation_id, "coop_id": coop_id}, {"_id": 0})
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation non trouvee")

    result = sim.get("resultat", {})

    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    el = []

    title_s = ParagraphStyle("T", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#1A3622"), alignment=1)
    h2_s = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#1A3622"))

    el.append(Paragraph("RAPPORT DE SIMULATION D'AUDIT ARS 1000", title_s))
    el.append(Spacer(1, 0.3*cm))
    el.append(Paragraph(f"{sim.get('titre', '')} | Auditeur: {sim.get('auditeur', '')} | Date: {sim.get('completed_at', '')[:10]}", ParagraphStyle("Sub", parent=styles["Normal"], alignment=1, fontSize=9)))
    el.append(Spacer(1, 1*cm))

    # Verdict
    v_color = colors.HexColor("#065F46") if result.get("verdict") == "FAVORABLE" else colors.HexColor("#92400E") if "RESERVES" in result.get("verdict", "") else colors.HexColor("#C25E30")
    el.append(Paragraph(f"VERDICT: {result.get('verdict', '')}", ParagraphStyle("V", parent=styles["Heading1"], fontSize=16, textColor=v_color, alignment=1)))
    el.append(Paragraph(result.get("verdict_detail", ""), ParagraphStyle("VD", parent=styles["Normal"], alignment=1, fontSize=10)))
    el.append(Spacer(1, 0.5*cm))

    # KPIs
    kpi_data = [
        ["Score", f"{result.get('score', 0)}%"],
        ["Clauses evaluees", f"{result.get('evaluees', 0)} / {result.get('total_clauses', 0)}"],
        ["Conformes", str(result.get("conformes", 0))],
        ["NC Majeures", str(result.get("nc_majeures", 0))],
        ["NC Mineures", str(result.get("nc_mineures", 0))],
    ]
    kt = Table(kpi_data, colWidths=[6*cm, 6*cm])
    kt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E8F0EA")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E5E0")),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    el.append(kt)
    el.append(Spacer(1, 1*cm))

    # Recommandations
    recs = result.get("recommandations", [])
    if recs:
        el.append(Paragraph("RECOMMANDATIONS", h2_s))
        el.append(Spacer(1, 0.3*cm))
        rec_headers = ["Clause", "Type", "Recommandation"]
        rec_rows = [rec_headers]
        for r in recs:
            rec_rows.append([r.get("clause", ""), r.get("type", ""), r.get("recommandation", "")[:80]])

        rt = Table(rec_rows, colWidths=[2*cm, 2.5*cm, 12*cm])
        rt.setStyle(TableStyle([
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
        el.append(rt)

    doc.build(el)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=simulation_audit_{simulation_id[:8]}.pdf"
    })
