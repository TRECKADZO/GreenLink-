"""
REDD+ MRV PDF Export - Rapport professionnel
Generates comprehensive PDF reports for REDD+ MRV data
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from io import BytesIO
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.platypus.flowables import HRFlowable
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/redd/pdf", tags=["REDD+ PDF Reports"])

# Brand colors
GREEN = colors.HexColor('#059669')
GREEN_DARK = colors.HexColor('#064e3b')
GREEN_LIGHT = colors.HexColor('#d1fae5')
SLATE = colors.HexColor('#1e293b')
SLATE_LIGHT = colors.HexColor('#64748b')
AMBER = colors.HexColor('#d97706')
RED = colors.HexColor('#dc2626')
BLUE = colors.HexColor('#2563eb')
BG_LIGHT = colors.HexColor('#f8fafc')
WHITE = colors.white


async def verify_access(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin', 'cooperative']:
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs ou cooperatives")
    return current_user


def get_pdf_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('Brand', parent=styles['Heading1'], fontSize=22, textColor=GREEN_DARK, alignment=TA_CENTER, spaceAfter=5))
    styles.add(ParagraphStyle('ReportTitle', parent=styles['Heading1'], fontSize=16, textColor=SLATE, alignment=TA_CENTER, spaceAfter=5))
    styles.add(ParagraphStyle('ReportSub', parent=styles['Normal'], fontSize=10, textColor=SLATE_LIGHT, alignment=TA_CENTER, spaceAfter=15))
    styles.add(ParagraphStyle('SectionHead', parent=styles['Heading2'], fontSize=13, textColor=GREEN_DARK, spaceBefore=18, spaceAfter=8, borderWidth=0))
    styles.add(ParagraphStyle('CellText', parent=styles['Normal'], fontSize=8, textColor=SLATE, leading=10))
    styles.add(ParagraphStyle('CellBold', parent=styles['Normal'], fontSize=8, textColor=SLATE, fontName='Helvetica-Bold', leading=10))
    styles.add(ParagraphStyle('SmallNote', parent=styles['Normal'], fontSize=7, textColor=SLATE_LIGHT, alignment=TA_CENTER))
    styles.add(ParagraphStyle('RecoText', parent=styles['Normal'], fontSize=9, textColor=SLATE, spaceBefore=4, spaceAfter=4, leftIndent=10))
    return styles


def make_kpi_row(metrics):
    """Create a row of KPI boxes."""
    cells = []
    for val, label, col in metrics:
        cell_data = [
            [Paragraph(f'<font color="{col}" size="18"><b>{val}</b></font>', getSampleStyleSheet()['Normal'])],
            [Paragraph(f'<font color="#64748b" size="8">{label}</font>', getSampleStyleSheet()['Normal'])]
        ]
        t = Table(cell_data, colWidths=[3.5 * cm])
        t.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor(col)),
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        cells.append(t)
    row = Table([cells], colWidths=[3.8 * cm] * len(cells))
    row.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    return row


def make_practice_bar(label, pct, count, total, bar_color):
    """Create a visual progress bar row for practice adoption."""
    bar_w = 6 * cm
    drawing = Drawing(bar_w, 12)
    drawing.add(Rect(0, 2, bar_w, 8, fillColor=colors.HexColor('#e2e8f0'), strokeColor=None))
    fill_w = bar_w * min(pct, 100) / 100
    if fill_w > 0:
        drawing.add(Rect(0, 2, fill_w, 8, fillColor=bar_color, strokeColor=None))
    return [label, drawing, f"{count}/{total} ({pct}%)"]


@router.get("/mrv-report")
async def export_mrv_pdf(current_user: dict = Depends(verify_access)):
    """Generate comprehensive MRV REDD+ PDF report."""
    now = datetime.now(timezone.utc)

    # Fetch data
    farmers_data = await db.ars_farmer_data.find({}, {"_id": 0}).sort("updated_at", -1).to_list(2000)
    ssrte_data = await db.ssrte_responses.find({}, {"_id": 0}).to_list(2000)

    total = len(farmers_data)

    # Aggregations
    total_ha = round(sum(float(f.get("hectares", 0)) for f in farmers_data), 1)
    total_arbres = sum(int(f.get("arbres_total", 0)) for f in farmers_data)
    avg_score = round(sum(float(f.get("score_carbone", 0)) for f in farmers_data) / max(total, 1), 1)

    # Practice counts
    agro_count = sum(1 for f in farmers_data if f.get("agroforesterie") == "oui")
    compost_count = sum(1 for f in farmers_data if f.get("compost") == "oui")
    couvert_count = sum(1 for f in farmers_data if f.get("couverture_sol") == "oui")
    no_brulage = sum(1 for f in farmers_data if f.get("brulage") == "non")
    no_engrais = sum(1 for f in farmers_data if f.get("engrais") == "non")
    biochar_count = sum(1 for f in farmers_data if f.get("biochar") == "oui")
    zero_defo = sum(1 for f in farmers_data if f.get("zero_deforestation") == "oui")
    reboise = sum(1 for f in farmers_data if f.get("reboisement") == "oui")

    # REDD+ scores
    redd_scores = []
    for f in farmers_data:
        rs = 0
        if f.get("agroforesterie") == "oui": rs += 1.5
        if f.get("compost") == "oui": rs += 1.0
        if f.get("couverture_sol") == "oui": rs += 0.5
        if f.get("brulage") == "non": rs += 1.0
        if f.get("engrais") == "non": rs += 0.5
        if f.get("biochar") == "oui": rs += 0.5
        if f.get("zero_deforestation") == "oui": rs += 1.0
        if f.get("reboisement") == "oui": rs += 0.5
        ha = float(f.get("hectares", 1))
        aph = int(f.get("arbres_total", 0)) / max(ha, 0.1)
        if aph >= 60: rs += 1.5
        elif aph >= 30: rs += 1.0
        elif aph >= 15: rs += 0.5
        redd_scores.append(min(round(rs, 1), 10))

    avg_redd = round(sum(redd_scores) / max(len(redd_scores), 1), 1) if redd_scores else 0

    # ARS distribution
    ars_dist = {}
    for f in farmers_data:
        lvl = f.get("ars_level", "N/A")
        ars_dist[lvl] = ars_dist.get(lvl, 0) + 1

    # REDD levels
    redd_dist = {
        "Excellence": sum(1 for s in redd_scores if s >= 8),
        "Avance": sum(1 for s in redd_scores if 6 <= s < 8),
        "Intermediaire": sum(1 for s in redd_scores if 4 <= s < 6),
        "Debutant": sum(1 for s in redd_scores if 2 <= s < 4),
        "Non conforme": sum(1 for s in redd_scores if s < 2),
    }

    # SSRTE stats
    ssrte_total = len(ssrte_data)
    ssrte_alertes = sum(1 for s in ssrte_data if s.get("statut") == "alerte_ici")
    ssrte_conformes = ssrte_total - ssrte_alertes

    # Build PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5 * cm, leftMargin=1.5 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    story = []
    styles = get_pdf_styles()
    page_w = A4[0] - 3 * cm

    # ===== PAGE 1: COVER =====
    story.append(Spacer(1, 40))
    story.append(Paragraph("GreenLink Agritech", styles['Brand']))
    story.append(Paragraph("Agriculture Durable - Cote d'Ivoire", styles['SmallNote']))
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="60%", thickness=2, color=GREEN, hAlign='CENTER'))
    story.append(Spacer(1, 15))
    story.append(Paragraph("Rapport Pratiques Durables", styles['ReportTitle']))
    story.append(Paragraph("Monitoring, Rapportage et Verification", styles['ReportSub']))
    story.append(Paragraph(f"Genere le {now.strftime('%d/%m/%Y a %H:%M UTC')}", styles['SmallNote']))
    story.append(Spacer(1, 25))

    # KPIs
    story.append(make_kpi_row([
        (str(total), "Planteurs", "#059669"),
        (str(total_ha), "Hectares", "#2563eb"),
        (f"{total_arbres:,}", "Arbres", "#059669"),
        (f"{avg_score}/10", "Score Carbone", "#d97706"),
        (f"{avg_redd}/10", "Score Environnemental", "#059669"),
    ]))
    story.append(Spacer(1, 20))

    # ===== SECTION 2: ADOPTION DES PRATIQUES =====
    story.append(Paragraph("1. Adoption des Pratiques Durables", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=GREEN_LIGHT))
    story.append(Spacer(1, 8))

    practices_data = [
        ["Pratique", "Progression", "Adoption"],
        *[make_practice_bar("Agroforesterie", round(agro_count / max(total, 1) * 100), agro_count, total, GREEN)],
        *[make_practice_bar("Compostage/Paillage", round(compost_count / max(total, 1) * 100), compost_count, total, colors.HexColor('#d97706'))],
        *[make_practice_bar("Couverture vegetale", round(couvert_count / max(total, 1) * 100), couvert_count, total, colors.HexColor('#0d9488'))],
        *[make_practice_bar("Zero brulage", round(no_brulage / max(total, 1) * 100), no_brulage, total, BLUE)],
        *[make_practice_bar("Sans engrais chimiques", round(no_engrais / max(total, 1) * 100), no_engrais, total, colors.HexColor('#7c3aed'))],
        *[make_practice_bar("Biochar", round(biochar_count / max(total, 1) * 100), biochar_count, total, colors.HexColor('#ea580c'))],
        *[make_practice_bar("Zero deforestation", round(zero_defo / max(total, 1) * 100), zero_defo, total, colors.HexColor('#0284c7'))],
        *[make_practice_bar("Reboisement", round(reboise / max(total, 1) * 100), reboise, total, colors.HexColor('#16a34a'))],
    ]

    # Build rows properly
    header = [
        Paragraph('<b>Pratique</b>', styles['CellBold']),
        Paragraph('<b>Progression</b>', styles['CellBold']),
        Paragraph('<b>Adoption</b>', styles['CellBold']),
    ]
    rows = [header]
    practice_items = [
        ("Agroforesterie", agro_count, GREEN),
        ("Compostage / Paillage", compost_count, colors.HexColor('#d97706')),
        ("Couverture vegetale", couvert_count, colors.HexColor('#0d9488')),
        ("Zero brulage", no_brulage, BLUE),
        ("Sans engrais chimiques", no_engrais, colors.HexColor('#7c3aed')),
        ("Biochar (REDD+)", biochar_count, colors.HexColor('#ea580c')),
        ("Zero deforestation (REDD+)", zero_defo, colors.HexColor('#0284c7')),
        ("Reboisement (REDD+)", reboise, colors.HexColor('#16a34a')),
    ]
    for label, count, bar_color in practice_items:
        pct = round(count / max(total, 1) * 100)
        bar_w = 5 * cm
        d = Drawing(bar_w, 10)
        d.add(Rect(0, 1, bar_w, 8, fillColor=colors.HexColor('#e2e8f0'), strokeColor=None))
        fill = bar_w * min(pct, 100) / 100
        if fill > 0:
            d.add(Rect(0, 1, fill, 8, fillColor=bar_color, strokeColor=None))
        rows.append([
            Paragraph(label, styles['CellText']),
            d,
            Paragraph(f"{count}/{total} ({pct}%)", styles['CellText']),
        ])

    pt = Table(rows, colWidths=[5.5 * cm, 5.5 * cm, 3.5 * cm])
    pt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN_LIGHT),
        ('TEXTCOLOR', (0, 0), (-1, 0), GREEN_DARK),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(pt)
    story.append(Spacer(1, 15))

    # ===== SECTION 3: DISTRIBUTION NIVEAUX =====
    story.append(Paragraph("2. Distribution des Niveaux de Pratiques Durables", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=GREEN_LIGHT))
    story.append(Spacer(1, 8))

    dist_header = [Paragraph('<b>Niveau</b>', styles['CellBold']), Paragraph('<b>Planteurs</b>', styles['CellBold']), Paragraph('<b>%</b>', styles['CellBold'])]
    dist_rows = [dist_header]
    level_colors = {
        "Excellence": GREEN, "Avance": BLUE, "Intermediaire": AMBER,
        "Debutant": colors.HexColor('#ea580c'), "Non conforme": RED,
    }
    for lvl, cnt in redd_dist.items():
        pct = round(cnt / max(total, 1) * 100)
        lc = level_colors.get(lvl, SLATE)
        dist_rows.append([
            Paragraph(f'<font color="{lc.hexval()}">{lvl}</font>', styles['CellText']),
            Paragraph(str(cnt), styles['CellText']),
            Paragraph(f"{pct}%", styles['CellText']),
        ])

    # ARS rows
    dist_rows.append([Paragraph('<b>--- Certification Qualite ---</b>', styles['CellBold']), Paragraph('', styles['CellText']), Paragraph('', styles['CellText'])])
    ars_colors = {"Or": colors.HexColor('#eab308'), "Argent": SLATE_LIGHT, "Bronze": colors.HexColor('#ea580c'), "Non conforme": RED}
    for lvl, cnt in ars_dist.items():
        pct = round(cnt / max(total, 1) * 100)
        ac = ars_colors.get(lvl, SLATE)
        dist_rows.append([
            Paragraph(f'<font color="{ac.hexval()}">{lvl}</font>', styles['CellText']),
            Paragraph(str(cnt), styles['CellText']),
            Paragraph(f"{pct}%", styles['CellText']),
        ])

    dt = Table(dist_rows, colWidths=[6 * cm, 4 * cm, 4 * cm])
    dt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN_LIGHT),
        ('TEXTCOLOR', (0, 0), (-1, 0), GREEN_DARK),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(dt)
    story.append(Spacer(1, 15))

    # ===== SECTION 4: SSRTE / ICI =====
    story.append(Paragraph("3. Safeguards - SSRTE / ICI (Travail des Enfants)", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=GREEN_LIGHT))
    story.append(Spacer(1, 8))

    story.append(make_kpi_row([
        (str(ssrte_total), "Reponses USSD", "#2563eb"),
        (str(ssrte_alertes), "Alertes ICI", "#dc2626"),
        (str(ssrte_conformes), "Conformes", "#059669"),
    ]))
    story.append(Spacer(1, 15))

    # ===== SECTION 5: TABLEAU PLANTEURS =====
    story.append(Paragraph("4. Donnees MRV Detaillees par Planteur", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=GREEN_LIGHT))
    story.append(Spacer(1, 8))

    if farmers_data:
        f_header = [
            Paragraph('<b>Nom</b>', styles['CellBold']),
            Paragraph('<b>Tel</b>', styles['CellBold']),
            Paragraph('<b>Ha</b>', styles['CellBold']),
            Paragraph('<b>Arbres</b>', styles['CellBold']),
            Paragraph('<b>Carbone</b>', styles['CellBold']),
            Paragraph('<b>Env.</b>', styles['CellBold']),
            Paragraph('<b>ARS</b>', styles['CellBold']),
            Paragraph('<b>Pratiques</b>', styles['CellBold']),
        ]
        f_rows = [f_header]

        for i, f in enumerate(farmers_data[:100]):
            practices = []
            if f.get("agroforesterie") == "oui": practices.append("Agro")
            if f.get("compost") == "oui": practices.append("Comp")
            if f.get("couverture_sol") == "oui": practices.append("Couv")
            if f.get("brulage") == "non": practices.append("0Brul")
            if f.get("biochar") == "oui": practices.append("Bio")
            if f.get("zero_deforestation") == "oui": practices.append("0Def")
            if f.get("reboisement") == "oui": practices.append("Reb")

            rs = redd_scores[i] if i < len(redd_scores) else 0
            if rs >= 8: rl = "Exc"
            elif rs >= 6: rl = "Ava"
            elif rs >= 4: rl = "Int"
            elif rs >= 2: rl = "Deb"
            else: rl = "NC"

            f_rows.append([
                Paragraph(str(f.get("farmer_name", "N/A"))[:18], styles['CellText']),
                Paragraph(str(f.get("phone", ""))[-8:], styles['CellText']),
                Paragraph(str(f.get("hectares", 0)), styles['CellText']),
                Paragraph(str(f.get("arbres_total", 0)), styles['CellText']),
                Paragraph(f"{f.get('score_carbone', 0)}/10", styles['CellText']),
                Paragraph(f"{rs} ({rl})", styles['CellText']),
                Paragraph(str(f.get("ars_level", "N/A")), styles['CellText']),
                Paragraph(", ".join(practices[:4]), styles['CellText']),
            ])

        ft = Table(f_rows, colWidths=[2.5 * cm, 1.8 * cm, 1.2 * cm, 1.3 * cm, 1.5 * cm, 1.8 * cm, 1.5 * cm, 3 * cm])
        ft.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), GREEN_LIGHT),
            ('TEXTCOLOR', (0, 0), (-1, 0), GREEN_DARK),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
        ]))
        story.append(ft)
    else:
        story.append(Paragraph("Aucune donnee MRV disponible. Les donnees apparaitront apres que les planteurs utilisent le USSD *144*99#.", styles['CellText']))

    story.append(Spacer(1, 20))

    # ===== SECTION 6: RECOMMANDATIONS =====
    story.append(Paragraph("5. Recommandations", styles['SectionHead']))
    story.append(HRFlowable(width="100%", thickness=1, color=GREEN_LIGHT))
    story.append(Spacer(1, 8))

    recommendations = []
    if total > 0:
        agro_pct = round(agro_count / total * 100)
        if agro_pct < 50:
            recommendations.append(f"Priorite: Seulement {agro_pct}% des planteurs pratiquent l'agroforesterie. Objectif: atteindre 80% pour maximiser les credits carbone.")
        no_brul_pct = round(no_brulage / total * 100)
        if no_brul_pct < 70:
            recommendations.append(f"Urgent: {100 - no_brul_pct}% des planteurs pratiquent encore le brulage. Former les producteurs aux alternatives (compostage, paillage).")
        if compost_count / max(total, 1) < 0.5:
            recommendations.append("Developper les formations sur le compostage organique pour reduire la dependance aux engrais chimiques.")
        if biochar_count / max(total, 1) < 0.3:
            recommendations.append("Le biochar est peu adopte. Organiser des demonstrations pratiques pour promouvoir cette technique de stockage carbone.")
        if zero_defo / max(total, 1) < 0.6:
            recommendations.append("Renforcer les engagements zero-deforestation aupres des planteurs. Essentiel pour l'eligibilite aux credits carbone.")
        if ssrte_alertes > 0:
            recommendations.append(f"SSRTE/ICI: {ssrte_alertes} alerte(s) de travail des enfants detectee(s). Interventions d'accompagnement a planifier.")
    else:
        recommendations.append("Aucune donnee disponible. Encourager les planteurs a utiliser le USSD *144*99# pour enregistrer leurs pratiques.")

    recommendations.append("Poursuivre la collecte de donnees MRV pour alimenter les rapports du programme juridictionnel Tai et du Bureau du Marche Carbone (BMC).")

    for i, rec in enumerate(recommendations):
        story.append(Paragraph(f"<b>{i+1}.</b> {rec}", styles['RecoText']))

    story.append(Spacer(1, 30))

    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=GREEN))
    story.append(Spacer(1, 5))
    story.append(Paragraph("GreenLink Agritech - Rapport Pratiques Durables - Confidentiel", styles['SmallNote']))
    story.append(Paragraph(f"Genere automatiquement le {now.strftime('%d/%m/%Y')} | Sources: Strategie Nationale CI, FCPF Tai, BMC", styles['SmallNote']))

    # Build
    doc.build(story)
    buffer.seek(0)

    filename = f"GreenLink_MRV_REDD_{now.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
