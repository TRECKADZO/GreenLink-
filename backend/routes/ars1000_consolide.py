"""
Tableau de Bord Consolide ARS 1000
Agregation des 6 modules strategiques en un score de readiness global.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
import logging
import io

from database import db
from routes.auth import get_current_user
from routes.cooperative import verify_cooperative

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ars1000-consolide", tags=["ARS 1000 Consolide"])


def get_coop_id(user):
    return str(user.get("coop_id") or user.get("_id") or user.get("id", ""))


@router.get("/dashboard")
async def get_consolidated_dashboard(current_user: dict = Depends(get_current_user)):
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    modules = {}

    # ─── 1. MEMBRES (clauses 4.2, 4.3) ───
    m_total = await db.membres_adhesions.count_documents({"coop_id": coop_id})
    m_valides = await db.membres_adhesions.count_documents({"coop_id": coop_id, "statut": "valide"})
    m_perimetre = await db.membres_perimetres.count_documents({"coop_id": coop_id})
    m_score_items = []
    if m_total > 0:
        m_score_items.append(min(100, m_valides / max(m_total, 1) * 100))
    m_score_items.append(100 if m_perimetre > 0 else 0)
    m_score = round(sum(m_score_items) / len(m_score_items)) if m_score_items else 0
    modules["membres"] = {
        "titre": "Membres & Enregistrement",
        "clauses": "4.2.2, 4.2.3, 4.3",
        "score": m_score,
        "indicateurs": [
            {"label": "Membres enregistres", "valeur": m_total, "cible": max(m_total, 10)},
            {"label": "Membres valides", "valeur": m_valides, "cible": m_total or 1},
            {"label": "Perimetre SM defini", "valeur": min(m_perimetre, 1), "cible": 1},
        ],
        "actions": _actions(m_score, m_total == 0, "Enregistrer les producteurs", m_perimetre == 0, "Definir le perimetre SM"),
    }

    # ─── 2. GOUVERNANCE (clauses 5.1, 5.2, 5.3, 9.3) ───
    from routes.gouvernance import POSTES_ARS1000
    g_assignments = await db.gouvernance_postes.find({"coop_id": coop_id}).to_list(50)
    g_pourvus = sum(1 for a in g_assignments if a.get("titulaire_nom"))
    g_total_postes = len(POSTES_ARS1000)
    g_pols = await db.gouvernance_politiques.find({"coop_id": coop_id}).to_list(10)
    g_pol_validee = any(p.get("statut") == "validee" or p.get("diffusee") for p in g_pols)
    g_revues = await db.gouvernance_revues.find({"coop_id": coop_id}).to_list(10)
    g_revue_validee = any(r.get("statut") == "validee" for r in g_revues)

    g_items = [g_pourvus / g_total_postes * 100 if g_total_postes else 0, 100 if g_pol_validee else 0, 100 if g_revue_validee else 0]
    g_score = round(sum(g_items) / len(g_items))
    modules["gouvernance"] = {
        "titre": "Gouvernance & Direction",
        "clauses": "5.1, 5.2, 5.3, 9.3",
        "score": g_score,
        "indicateurs": [
            {"label": "Postes pourvus", "valeur": g_pourvus, "cible": g_total_postes},
            {"label": "Politique validee", "valeur": 1 if g_pol_validee else 0, "cible": 1},
            {"label": "Revue direction", "valeur": 1 if g_revue_validee else 0, "cible": 1},
        ],
        "actions": _actions(g_score, g_pourvus < g_total_postes, f"Pourvoir {g_total_postes - g_pourvus} poste(s) vacant(s)", not g_pol_validee, "Valider la politique de management"),
    }

    # ─── 3. FORMATION (clauses 7.3, 7.4, 12.x, 13.x) ───
    f_sessions = await db.formation_sessions.find({"coop_id": coop_id}).to_list(500)
    f_total = len(f_sessions)
    f_completees = sum(1 for s in f_sessions if s.get("statut") == "completee")
    f_participants = sum(len(s.get("participants", [])) for s in f_sessions)
    f_themes_codes = set(s.get("theme_code") for s in f_sessions if s.get("statut") == "completee")
    f_themes_complets = len(f_themes_codes)

    f_items = [min(100, f_themes_complets / 12 * 100), min(100, f_completees / max(f_total, 1) * 100) if f_total else 0]
    f_score = round(sum(f_items) / len(f_items))
    modules["formation"] = {
        "titre": "Formation & Sensibilisation",
        "clauses": "7.3, 7.4, 12.2-12.10, 13.1",
        "score": f_score,
        "indicateurs": [
            {"label": "Themes couverts", "valeur": f_themes_complets, "cible": 12},
            {"label": "Sessions completees", "valeur": f_completees, "cible": max(f_total, 1)},
            {"label": "Participants formes", "valeur": f_participants, "cible": max(f_participants, 50)},
        ],
        "actions": _actions(f_score, f_themes_complets < 12, f"{12 - f_themes_complets} theme(s) obligatoire(s) restant(s)", f_total == 0, "Planifier des sessions de formation"),
    }

    # ─── 4. PDC (clauses 8.x, 11.x) ───
    p_total = await db.pdc_v2.count_documents({"coop_id": coop_id})
    p_score = min(100, round(p_total / max(m_valides, 1) * 100)) if m_valides > 0 else (100 if p_total > 0 else 0)
    modules["pdc"] = {
        "titre": "PDC Digital",
        "clauses": "8.1, 8.2, 11.1-11.3",
        "score": p_score,
        "indicateurs": [
            {"label": "PDC enregistres", "valeur": p_total, "cible": max(m_valides, p_total, 1)},
        ],
        "actions": _actions(p_score, p_total == 0, "Creer les PDC pour les producteurs"),
    }

    # ─── 5. TRACABILITE (clauses ARS 1000-2: 11-16) ───
    t_lots = await db.traceability_lots.count_documents({"coop_id": coop_id})
    t_certifies = await db.traceability_lots.count_documents({"coop_id": coop_id, "certifie_ars1000": True})
    t_exported = await db.traceability_lots.count_documents({"coop_id": coop_id, "etape_courante": "export"})

    t_items = [min(100, t_lots / max(t_lots, 5) * 100) if t_lots else 0, t_certifies / max(t_lots, 1) * 100 if t_lots else 0]
    t_score = round(sum(t_items) / len(t_items))
    modules["tracabilite"] = {
        "titre": "Tracabilite",
        "clauses": "ARS 1000-2 (11-16)",
        "score": t_score,
        "indicateurs": [
            {"label": "Lots traces", "valeur": t_lots, "cible": max(t_lots, 5)},
            {"label": "Lots certifies", "valeur": t_certifies, "cible": max(t_lots, 1)},
            {"label": "Lots exportes", "valeur": t_exported, "cible": max(t_lots, 1)},
        ],
        "actions": _actions(t_score, t_lots == 0, "Enregistrer les lots de cacao"),
    }

    # ─── 6. AUDIT (clauses 9.2, 9.3) ───
    a_session = await db.audit_sessions.find_one({"coop_id": coop_id}, sort=[("created_at", -1)])

    # ─── 6b. RISQUES (clauses 6.1, 6.2) ───
    r_total = await db.risques_registre.count_documents({"coop_id": coop_id})
    r_mitigees = await db.risques_registre.count_documents({"coop_id": coop_id, "statut": "en_mitigation"})
    r_critiques = await db.risques_registre.count_documents({"coop_id": coop_id, "niveau": "Critique"})
    r_score = 0
    if r_total > 0:
        r_score = min(100, round((r_mitigees / r_total) * 100))
    modules["risques"] = {
        "titre": "Risques & Durabilite",
        "clauses": "6.1, 6.2",
        "score": r_score,
        "indicateurs": [
            {"label": "Risques identifies", "valeur": r_total, "cible": max(r_total, 5)},
            {"label": "Risques mitigees", "valeur": r_mitigees, "cible": max(r_total, 1)},
            {"label": "Risques critiques", "valeur": r_critiques, "cible": 0},
        ],
        "actions": _actions(r_score, r_total == 0, "Identifier les risques de durabilite", r_critiques > 0, f"{r_critiques} risque(s) critique(s) a traiter"),
    }
    a_score = 0
    a_indicateurs = [{"label": "Session d'audit", "valeur": 0, "cible": 1}]
    a_actions_list = ["Creer une session d'audit interne"]

    if a_session:
        sid = a_session.get("session_id")
        a_items = await db.audit_checklist_items.find({"session_id": sid, "coop_id": coop_id}).to_list(500)
        a_total = len(a_items)
        a_c = sum(1 for i in a_items if i.get("conformite") == "C")
        a_nc = sum(1 for i in a_items if i.get("conformite") == "NC")
        a_na = sum(1 for i in a_items if i.get("conformite") == "NA")
        a_app = a_total - a_na
        a_taux = round(a_c / a_app * 100, 1) if a_app > 0 else 0

        ncs = await db.audit_non_conformites.count_documents({"coop_id": coop_id, "audit_session_id": sid, "statut": "ouvert"})

        a_score = round(a_taux)
        a_indicateurs = [
            {"label": "Taux conformite", "valeur": a_taux, "cible": 100},
            {"label": "Exigences evaluees", "valeur": a_c + a_nc + a_na, "cible": a_total},
            {"label": "NC ouvertes", "valeur": ncs, "cible": 0},
        ]
        a_actions_list = []
        if a_c + a_nc + a_na < a_total:
            a_actions_list.append(f"Evaluer {a_total - a_c - a_nc - a_na} exigence(s) restante(s)")
        if ncs > 0:
            a_actions_list.append(f"Resoudre {ncs} NC ouverte(s)")

    modules["audit"] = {
        "titre": "Audit Interne & NC",
        "clauses": "9.2, 9.3",
        "score": a_score,
        "indicateurs": a_indicateurs,
        "actions": a_actions_list,
    }

    # ─── SCORE GLOBAL ───
    scores = [m["score"] for m in modules.values()]
    score_global = round(sum(scores) / len(scores)) if scores else 0

    # Readiness level
    if score_global >= 80:
        readiness = "Pret pour l'audit"
        readiness_color = "emerald"
    elif score_global >= 50:
        readiness = "En bonne voie"
        readiness_color = "amber"
    else:
        readiness = "Actions requises"
        readiness_color = "red"

    # Top actions
    all_actions = []
    for key, mod in modules.items():
        for a in mod.get("actions", []):
            all_actions.append({"module": mod["titre"], "action": a, "module_key": key})

    return {
        "score_global": score_global,
        "readiness": readiness,
        "readiness_color": readiness_color,
        "modules": modules,
        "actions_prioritaires": all_actions[:8],
        "date_calcul": datetime.now(timezone.utc).isoformat(),
    }


def _actions(score, cond1=False, msg1="", cond2=False, msg2=""):
    actions = []
    if cond1 and msg1:
        actions.append(msg1)
    if cond2 and msg2:
        actions.append(msg2)
    return actions


@router.get("/export/pdf")
async def export_readiness_pdf(current_user: dict = Depends(get_current_user)):
    """Export du rapport de readiness ARS 1000 en PDF"""
    verify_cooperative(current_user)
    coop_id = get_coop_id(current_user)

    # Reuse dashboard data
    dash = await get_consolidated_dashboard(current_user)

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
    normal_s = ParagraphStyle("N", parent=styles["Normal"], fontSize=9)

    el.append(Paragraph("RAPPORT DE READINESS ARS 1000", title_s))
    el.append(Paragraph(f"Score global: {dash['score_global']}% - {dash['readiness']}", ParagraphStyle("Sub", parent=styles["Normal"], alignment=1, fontSize=14, textColor=colors.HexColor("#1A3622"))))
    el.append(Paragraph(f"Date: {datetime.now(timezone.utc).strftime('%d/%m/%Y')}", ParagraphStyle("D", parent=styles["Normal"], alignment=1, fontSize=9)))
    el.append(Spacer(1, 1*cm))

    # Modules table
    headers = ["Module", "Clauses", "Score", "Statut"]
    rows = [headers]
    for key, m in dash["modules"].items():
        s = m["score"]
        statut = "Conforme" if s >= 80 else "En cours" if s >= 50 else "A ameliorer"
        rows.append([m["titre"], m["clauses"], f"{s}%", statut])

    t = Table(rows, colWidths=[5*cm, 4*cm, 2.5*cm, 3*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A3622")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E5E0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    el.append(t)
    el.append(Spacer(1, 0.8*cm))

    # Actions prioritaires
    if dash["actions_prioritaires"]:
        el.append(Paragraph("Actions Prioritaires", h2_s))
        el.append(Spacer(1, 0.3*cm))
        for i, a in enumerate(dash["actions_prioritaires"], 1):
            el.append(Paragraph(f"{i}. [{a['module']}] {a['action']}", normal_s))
        el.append(Spacer(1, 0.5*cm))

    # Detail per module
    for key, m in dash["modules"].items():
        el.append(Paragraph(f"{m['titre']} ({m['clauses']}) - {m['score']}%", h2_s))
        for ind in m.get("indicateurs", []):
            el.append(Paragraph(f"  - {ind['label']}: {ind['valeur']} / {ind['cible']}", normal_s))
        el.append(Spacer(1, 0.3*cm))

    doc.build(el)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": "attachment; filename=readiness_ars1000.pdf"
    })
