"""
Dashboard PDF Export - Rapport complet cooperative
KPIs + REDD+ + SSRTE/ICI + Tendances mensuelles
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.platypus.flowables import HRFlowable
from reportlab.graphics.shapes import Drawing, Rect, String, Circle
from reportlab.graphics.charts.barcharts import VerticalBarChart, HorizontalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from bson import ObjectId

from database import db
from routes.auth import get_current_user

router = APIRouter(prefix="/api/cooperative/pdf", tags=["Cooperative PDF Reports"])

# Brand colors matching the dashboard design system
FOREST = colors.HexColor('#1A3622')
FOREST_LIGHT = colors.HexColor('#E8F0EA')
GOLD = colors.HexColor('#D4AF37')
TERRACOTTA = colors.HexColor('#C25E30')
BONE = colors.HexColor('#FAF9F6')
MUTED = colors.HexColor('#6B7280')
DARK = colors.HexColor('#111827')
BORDER = colors.HexColor('#E5E5E0')
WHITE = colors.white
RED_RISK = colors.HexColor('#B91C1C')


def coop_id_query(coop_id):
    or_conditions = [{"coop_id": coop_id}, {"cooperative_id": coop_id}]
    if ObjectId.is_valid(coop_id):
        or_conditions.extend([{"coop_id": ObjectId(coop_id)}, {"cooperative_id": ObjectId(coop_id)}])
    return {"$or": or_conditions}


def get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('Brand', parent=styles['Heading1'], fontSize=20, textColor=FOREST, alignment=TA_CENTER, spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle('SubTitle', parent=styles['Normal'], fontSize=10, textColor=MUTED, alignment=TA_CENTER, spaceAfter=12))
    styles.add(ParagraphStyle('Section', parent=styles['Heading2'], fontSize=13, textColor=FOREST, spaceBefore=16, spaceAfter=8, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle('Cell', parent=styles['Normal'], fontSize=8, textColor=DARK, leading=10))
    styles.add(ParagraphStyle('CellBold', parent=styles['Normal'], fontSize=8, textColor=DARK, fontName='Helvetica-Bold', leading=10))
    styles.add(ParagraphStyle('CellCenter', parent=styles['Normal'], fontSize=8, textColor=DARK, leading=10, alignment=TA_CENTER))
    styles.add(ParagraphStyle('Note', parent=styles['Normal'], fontSize=7, textColor=MUTED, alignment=TA_CENTER, spaceBefore=4))
    styles.add(ParagraphStyle('KPIValue', parent=styles['Normal'], fontSize=16, textColor=FOREST, fontName='Helvetica-Bold', alignment=TA_CENTER))
    styles.add(ParagraphStyle('KPILabel', parent=styles['Normal'], fontSize=7, textColor=MUTED, alignment=TA_CENTER))
    return styles


def make_kpi_box(value, label, accent=FOREST):
    cell = [[Paragraph(f'<font color="{accent.hexval()}" size="16"><b>{value}</b></font>', getSampleStyleSheet()['Normal'])],
            [Paragraph(f'<font color="#6B7280" size="7">{label}</font>', getSampleStyleSheet()['Normal'])]]
    t = Table(cell, colWidths=[3.5 * cm])
    t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 0.5, accent), ('BACKGROUND', (0, 0), (-1, -1), BONE),
        ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t


def make_progress_bar(label, pct, bar_color=FOREST):
    w = 6 * cm
    d = Drawing(w, 12)
    d.add(Rect(0, 2, w, 8, fillColor=colors.HexColor('#F3F4F6'), strokeColor=None))
    fill_w = w * min(pct, 100) / 100
    if fill_w > 0:
        d.add(Rect(0, 2, fill_w, 8, fillColor=bar_color, strokeColor=None))
    return [label, d, f"{pct}%"]


def make_risk_chart(risk_data):
    d = Drawing(260, 100)
    chart = VerticalBarChart()
    chart.x, chart.y, chart.width, chart.height = 30, 10, 200, 75
    chart.data = [[risk_data.get('critique', 0), risk_data.get('eleve', 0), risk_data.get('modere', 0), risk_data.get('faible', 0)]]
    chart.categoryAxis.categoryNames = ['Critique', 'Eleve', 'Modere', 'Faible']
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.fillColor = MUTED
    chart.valueAxis.labels.fontSize = 7
    chart.valueAxis.labels.fillColor = MUTED
    chart.valueAxis.valueMin = 0
    chart.bars[0].fillColor = FOREST
    chart.bars.strokeWidth = 0
    for i, c in enumerate([RED_RISK, TERRACOTTA, GOLD, FOREST]):
        chart.bars[0].fillColor = c
        # ReportLab doesn't support per-bar colors in simple mode, use alternating
    d.add(chart)
    return d


@router.get("/dashboard-report")
async def export_dashboard_pdf(current_user: dict = Depends(get_current_user)):
    """Generate complete dashboard PDF report — acces gratuit pour toutes les cooperatives."""
    if current_user.get("user_type") not in ["cooperative", "admin"]:
        raise HTTPException(status_code=403, detail="Acces reserve")

    coop_id = str(current_user["_id"])
    coop_name = current_user.get("coop_name") or current_user.get("full_name", "Cooperative")
    now = datetime.now(timezone.utc)
    cq = coop_id_query(coop_id)
    styles = get_styles()

    # ===== Fetch all data =====
    members_raw = await db.coop_members.find(cq).to_list(5000)
    members = []
    for m in members_raw:
        m["id"] = str(m.pop("_id"))
        members.append(m)
    total_members = len(members)
    active_members = sum(1 for m in members if m.get("status") == "active" or m.get("is_activated"))
    total_ha = round(sum(float(m.get("superficie_ha", 0)) for m in members), 1)

    redd_visits = await db.redd_tracking_visits.find(cq, {"_id": 0}).to_list(5000)
    total_redd = len(redd_visits)
    avg_redd = round(sum(v.get("redd_score", 0) for v in redd_visits) / max(total_redd, 1), 1)
    avg_conf = round(sum(v.get("conformity_pct", 0) for v in redd_visits) / max(total_redd, 1))

    # Level distribution
    levels = {}
    for v in redd_visits:
        lvl = v.get("redd_level", "Non conforme")
        levels[lvl] = levels.get(lvl, 0) + 1

    # Practices
    ars_data = await db.ars_farmer_data.find(cq, {"_id": 0}).to_list(5000)
    total_ars = len(ars_data)
    practices = {}
    if total_ars > 0:
        for key, label in [("agroforesterie", "Agroforesterie"), ("compost", "Compostage"),
                           ("couverture_sol", "Couverture sol"), ("brulage", "Zero brulage")]:
            val = "oui" if key != "brulage" else "non"
            cnt = sum(1 for f in ars_data if f.get(key) == val)
            practices[label] = {"count": cnt, "pct": round(cnt / total_ars * 100)}

    # SSRTE
    ssrte_visits = await db.ssrte_visits.find(cq, {"_id": 0}).to_list(5000)
    total_ssrte = len(ssrte_visits)
    risk_dist = {"critique": 0, "eleve": 0, "modere": 0, "faible": 0}
    risk_map = {"high": "eleve", "low": "faible", "medium": "modere", "critical": "critique"}
    total_enfants = 0
    for v in ssrte_visits:
        r = v.get("niveau_risque") or v.get("risk_level", "faible")
        mapped = risk_map.get(r, r)
        if mapped in risk_dist:
            risk_dist[mapped] += 1
        total_enfants += (v.get("enfants_observes_travaillant", 0) or 0) + (v.get("children_at_risk", 0) or 0)

    unique_farmers = len(set(v.get("farmer_id") or v.get("member_id", "") for v in ssrte_visits))
    coverage = round(unique_farmers / max(total_members, 1) * 100, 1)

    # ICI
    cases = await db.ssrte_cases.find(cq, {"_id": 0}).to_list(1000)
    total_cases = len(cases)
    resolved = sum(1 for c in cases if c.get("status") in ["resolved", "closed"])
    in_progress = sum(1 for c in cases if c.get("status") == "in_progress")
    resolution_rate = round(resolved / max(total_cases, 1) * 100, 1)

    # Monthly data (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        d = now - timedelta(days=i * 30)
        start = datetime(d.year, d.month, 1, tzinfo=timezone.utc)
        nm = d.month + 1 if d.month < 12 else 1
        ny = d.year if d.month < 12 else d.year + 1
        end = datetime(ny, nm, 1, tzinfo=timezone.utc)
        label = d.strftime("%b %Y")

        rv = [v for v in redd_visits if _in_range(v.get("created_at"), start, end)]
        sv = [v for v in ssrte_visits if _in_range(v.get("created_at"), start, end)]

        monthly_data.append({
            "month": label,
            "redd_visites": len(rv),
            "redd_score": round(sum(v.get("redd_score", 0) for v in rv) / max(len(rv), 1), 1),
            "ssrte_visites": len(sv),
            "ssrte_enfants": sum((v.get("enfants_observes_travaillant", 0) or 0) + (v.get("children_at_risk", 0) or 0) for v in sv),
        })

    # Risk by zone - build member lookup
    member_by_id = {}
    for m in members:
        mid = m.get("id", "")
        member_by_id[str(mid)] = m
        if m.get("phone_number"):
            member_by_id[m["phone_number"]] = m

    zone_risks = {}
    for v in ssrte_visits:
        fid = v.get("farmer_id") or v.get("member_id", "")
        member = member_by_id.get(str(fid))
        zone = (member or {}).get("village") or v.get("village") or "Autre"
        if zone not in zone_risks:
            zone_risks[zone] = {"total": 0, "critique": 0, "eleve": 0, "modere": 0, "faible": 0}
        zone_risks[zone]["total"] += 1
        r = v.get("niveau_risque") or v.get("risk_level", "faible")
        mapped = risk_map.get(r, r)
        if mapped in zone_risks[zone]:
            zone_risks[zone][mapped] += 1
    top_zones = sorted(zone_risks.items(), key=lambda x: x[1]["critique"] + x[1]["eleve"], reverse=True)[:10]

    # ===== Build PDF =====
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm,
                            leftMargin=2 * cm, rightMargin=2 * cm)
    story = []

    # --- Header ---
    story.append(Paragraph(coop_name, styles['Brand']))
    story.append(Paragraph(f"Rapport Dashboard — {now.strftime('%d/%m/%Y')}", styles['SubTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=FOREST, spaceAfter=12))

    # --- KPI Row ---
    story.append(Paragraph("Indicateurs Cles", styles['Section']))
    kpis = [
        make_kpi_box(f"{active_members}/{total_members}", "Membres Actifs", FOREST),
        make_kpi_box(f"{total_ha} ha", "Superficie", GOLD),
        make_kpi_box(str(total_redd), "Visites terrain", FOREST),
        make_kpi_box(f"{avg_redd}/10", "Score environnemental", TERRACOTTA),
    ]
    row = Table([kpis], colWidths=[4.1 * cm] * 4)
    row.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(row)
    story.append(Spacer(1, 6))

    kpis2 = [
        make_kpi_box(str(total_ssrte), "Visites SSRTE", FOREST),
        make_kpi_box(str(total_enfants), "Enfants Identifies", TERRACOTTA),
        make_kpi_box(f"{coverage}%", "Couverture", FOREST),
        make_kpi_box(f"{total_cases}", "Cas ICI", GOLD),
    ]
    row2 = Table([kpis2], colWidths=[4.1 * cm] * 4)
    row2.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(row2)

    # --- REDD+ Section ---
    story.append(Paragraph("Durabilite & MRV", styles['Section']))
    story.append(Paragraph(f"Score moyen : <b>{avg_redd}/10</b> | Conformite moyenne : <b>{avg_conf}%</b> | Producteurs evalues : <b>{total_ars}</b>", styles['Cell']))
    story.append(Spacer(1, 8))

    # Levels table
    if levels:
        level_order = ["Excellence", "Avance", "Intermediaire", "Debutant", "Non conforme"]
        level_colors = {"Excellence": FOREST, "Avance": colors.HexColor('#065F46'), "Intermediaire": GOLD, "Debutant": TERRACOTTA, "Non conforme": MUTED}
        header = [Paragraph(f'<b>{l}</b>', styles['CellCenter']) for l in level_order]
        values = [Paragraph(f'<font color="{level_colors.get(l, MUTED).hexval()}" size="12"><b>{levels.get(l, 0)}</b></font>', styles['CellCenter']) for l in level_order]
        lt = Table([header, values], colWidths=[3.2 * cm] * 5)
        lt.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER), ('BACKGROUND', (0, 0), (-1, 0), FOREST_LIGHT),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(lt)
        story.append(Spacer(1, 8))

    # Practices bars
    if practices:
        story.append(Paragraph("Adoption des Pratiques Durables", styles['CellBold']))
        story.append(Spacer(1, 4))
        rows = [make_progress_bar(Paragraph(f'<b>{lab}</b>', styles['Cell']), data["pct"], FOREST) for lab, data in practices.items()]
        pt = Table(rows, colWidths=[4 * cm, 6.5 * cm, 2 * cm])
        pt.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(pt)

    # --- SSRTE/ICI Section ---
    story.append(Paragraph("SSRTE & ICI — Travail des Enfants", styles['Section']))

    # Risk grid
    risk_header = ['', 'Critique', 'Eleve', 'Modere', 'Faible', 'Total']
    risk_vals = ['Visites', str(risk_dist['critique']), str(risk_dist['eleve']), str(risk_dist['modere']), str(risk_dist['faible']), str(total_ssrte)]
    risk_colors_row = [MUTED, RED_RISK, TERRACOTTA, GOLD, FOREST, DARK]
    colored_vals = [Paragraph(f'<font color="{c.hexval()}" size="11"><b>{v}</b></font>', styles['CellCenter']) for v, c in zip(risk_vals, risk_colors_row)]
    rt = Table([[Paragraph(f'<b>{h}</b>', styles['CellCenter']) for h in risk_header], colored_vals],
               colWidths=[2.2 * cm, 2.2 * cm, 2.2 * cm, 2.2 * cm, 2.2 * cm, 2.2 * cm])
    rt.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER), ('BACKGROUND', (0, 0), (-1, 0), FOREST_LIGHT),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(rt)
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"Enfants identifies : <b>{total_enfants}</b> | Producteurs visites : <b>{unique_farmers}</b> ({coverage}% couverture)", styles['Cell']))

    # ICI Remediation
    if total_cases > 0:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Remediation ICI", styles['CellBold']))
        ici_data = [
            ['Total Cas', 'Resolus', 'En Cours', 'Taux'],
            [str(total_cases), str(resolved), str(in_progress), f"{resolution_rate}%"]
        ]
        it = Table(ici_data, colWidths=[3 * cm, 3 * cm, 3 * cm, 3 * cm])
        it.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER), ('BACKGROUND', (0, 0), (-1, 0), FOREST_LIGHT),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9), ('TEXTCOLOR', (0, 1), (-1, -1), DARK),
            ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(it)

    # --- Risk by Zone ---
    if top_zones:
        story.append(Paragraph("Risque par Zone", styles['Section']))
        zone_header = [Paragraph(f'<b>{h}</b>', styles['CellCenter']) for h in ['Zone', 'Total', 'Critique', 'Eleve', 'Modere', 'Faible']]
        zone_rows = [zone_header]
        for zone_name, zd in top_zones:
            zone_rows.append([
                Paragraph(zone_name, styles['Cell']),
                Paragraph(str(zd['total']), styles['CellCenter']),
                Paragraph(f'<font color="#B91C1C"><b>{zd["critique"]}</b></font>', styles['CellCenter']) if zd['critique'] > 0 else Paragraph('0', styles['CellCenter']),
                Paragraph(f'<font color="#C25E30"><b>{zd["eleve"]}</b></font>', styles['CellCenter']) if zd['eleve'] > 0 else Paragraph('0', styles['CellCenter']),
                Paragraph(str(zd['modere']), styles['CellCenter']),
                Paragraph(str(zd['faible']), styles['CellCenter']),
            ])
        zt = Table(zone_rows, colWidths=[3.5 * cm, 2 * cm, 2 * cm, 2 * cm, 2 * cm, 2 * cm])
        zt.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER), ('BACKGROUND', (0, 0), (-1, 0), FOREST_LIGHT),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(zt)

    # --- Monthly Trends ---
    story.append(Paragraph("Tendances Mensuelles (6 mois)", styles['Section']))
    trend_header = [Paragraph(f'<b>{h}</b>', styles['CellCenter']) for h in ['Mois', 'Visites Terrain', 'Score Moyen', 'SSRTE Visites', 'Enfants']]
    trend_rows = [trend_header]
    for m in monthly_data:
        trend_rows.append([
            Paragraph(m['month'], styles['Cell']),
            Paragraph(str(m['redd_visites']), styles['CellCenter']),
            Paragraph(str(m['redd_score']), styles['CellCenter']),
            Paragraph(str(m['ssrte_visites']), styles['CellCenter']),
            Paragraph(f'<font color="#C25E30"><b>{m["ssrte_enfants"]}</b></font>' if m['ssrte_enfants'] > 0 else '0', styles['CellCenter']),
        ])
    tt = Table(trend_rows, colWidths=[3 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm])
    tt.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER), ('BACKGROUND', (0, 0), (-1, 0), FOREST_LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(tt)

    # --- Footer ---
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=6))
    story.append(Paragraph(f"GreenLink Agritech — Rapport genere le {now.strftime('%d/%m/%Y a %H:%M UTC')} — Confidentiel", styles['Note']))

    doc.build(story)
    buf.seek(0)
    filename = f"dashboard_{coop_name.replace(' ', '_')}_{now.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})


def _in_range(dt_val, start, end):
    """Check if a datetime value (string or datetime) falls within range."""
    if not dt_val:
        return False
    if isinstance(dt_val, str):
        try:
            dt_val = datetime.fromisoformat(dt_val.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return False
    if not hasattr(dt_val, 'year'):
        return False
    if dt_val.tzinfo is None:
        dt_val = dt_val.replace(tzinfo=timezone.utc)
    return start <= dt_val < end
