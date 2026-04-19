"""
Institutional Impact PDF Report
Format bailleur : ONU SDG / UE EUDR / Banque Mondiale / BAD / CFI
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from routes.admin_analytics import (
    _fetch_all_dashboard_data, _classify_users,
    _build_sdg_section, _build_eudr_section, _build_regional_section, _build_cfi_section,
)
from routes.auth import get_current_user

router = APIRouter(prefix="/api/admin/analytics", tags=["Institutional PDF"])


FOREST = colors.HexColor("#1A3622")
GOLD = colors.HexColor("#D4AF37")
LIGHT_BG = colors.HexColor("#FAF9F6")
MUTED = colors.HexColor("#6B7280")
BORDER = colors.HexColor("#E5E5E0")


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("HCenter", parent=s["Heading1"], fontSize=18, textColor=FOREST, alignment=TA_CENTER, spaceAfter=4, fontName="Helvetica-Bold"))
    s.add(ParagraphStyle("SubCenter", parent=s["Normal"], fontSize=9, textColor=MUTED, alignment=TA_CENTER, spaceAfter=12))
    s.add(ParagraphStyle("Sec", parent=s["Heading2"], fontSize=12, textColor=FOREST, spaceBefore=14, spaceAfter=6, fontName="Helvetica-Bold"))
    s.add(ParagraphStyle("Body", parent=s["Normal"], fontSize=9, textColor=colors.HexColor("#111827"), leading=11))
    s.add(ParagraphStyle("Small", parent=s["Normal"], fontSize=7, textColor=MUTED, leading=9))
    s.add(ParagraphStyle("Cell", parent=s["Normal"], fontSize=8, textColor=colors.HexColor("#111827"), leading=10))
    return s


def _fmt(n):
    if n is None:
        return "-"
    if isinstance(n, (int, float)):
        return f"{n:,.0f}".replace(",", " ") if n == int(n) else f"{n:,.1f}".replace(",", " ")
    return str(n)


def _headline_grid(headline, styles):
    items = [
        ("Bénéficiaires", _fmt(headline.get("beneficiaires_total", 0))),
        ("Coopératives", _fmt(headline.get("cooperatives", 0))),
        ("Hectares suivis", f"{_fmt(headline.get('hectares_suivis', 0))} ha"),
        ("CO₂ séquestré", f"{_fmt(headline.get('co2_sequestre_tonnes', 0))} t"),
        ("Primes redistr.", f"{_fmt(headline.get('primes_redistribuees_xof', 0))} FCFA"),
        ("EUDR", f"{headline.get('eudr_compliance_rate', 0)}%"),
        ("Régions", _fmt(headline.get("regions_couvertes", 0))),
    ]
    cells = []
    for label, value in items:
        cells.append([
            Paragraph(f'<font size="14" color="{FOREST.hexval()}"><b>{value}</b></font>', styles["Body"]),
            Paragraph(f'<font size="7" color="{MUTED.hexval()}">{label.upper()}</font>', styles["Body"]),
        ])
    t = Table([cells], colWidths=[2.3 * cm] * 7)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _sdg_table(sdg, styles):
    rows = [[
        Paragraph("<b>ODD</b>", styles["Cell"]),
        Paragraph("<b>Objectif ONU</b>", styles["Cell"]),
        Paragraph("<b>Indicateurs clés</b>", styles["Cell"]),
    ]]
    for g in sdg.get("goals", []):
        metrics_str = "<br/>".join([f"• {m['label']} : <b>{m['value']}</b> {m.get('unit', '')}" for m in g["metrics"]])
        rows.append([
            Paragraph(f'<font color="{g["color"]}"><b>{g["sdg"]}</b></font>', styles["Cell"]),
            Paragraph(g["name"], styles["Cell"]),
            Paragraph(metrics_str, styles["Cell"]),
        ])
    t = Table(rows, colWidths=[1.2 * cm, 4.5 * cm, 11 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def _eudr_table(eudr, styles):
    rows = [[
        Paragraph("<b>Dimension</b>", styles["Cell"]),
        Paragraph("<b>Score</b>", styles["Cell"]),
        Paragraph("<b>Pondération</b>", styles["Cell"]),
    ]]
    for d in eudr.get("risk_dimensions", []):
        rows.append([
            Paragraph(d["name"], styles["Cell"]),
            Paragraph(f"{d['score']}%", styles["Cell"]),
            Paragraph(f"{d['weight']}%", styles["Cell"]),
        ])
    rows.append([
        Paragraph("<b>Conformité globale</b>", styles["Cell"]),
        Paragraph(f"<b>{eudr.get('eudr_compliance_rate', 0)}%</b>", styles["Cell"]),
        Paragraph("100%", styles["Cell"]),
    ])
    t = Table(rows, colWidths=[8 * cm, 4 * cm, 4 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, -1), (-1, -1), GOLD),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def _regional_table(regional, styles):
    rows = [[
        Paragraph("<b>Région</b>", styles["Cell"]),
        Paragraph("<b>Coop.</b>", styles["Cell"]),
        Paragraph("<b>Membres</b>", styles["Cell"]),
        Paragraph("<b>Parcelles</b>", styles["Cell"]),
        Paragraph("<b>Hectares</b>", styles["Cell"]),
        Paragraph("<b>CO₂ (t)</b>", styles["Cell"]),
        Paragraph("<b>Score /10</b>", styles["Cell"]),
    ]]
    for r in regional.get("rows", [])[:30]:  # Limit to top 30
        rows.append([
            Paragraph(r.get("region", "-"), styles["Cell"]),
            Paragraph(str(r.get("cooperatives", 0)), styles["Cell"]),
            Paragraph(str(r.get("members", 0)), styles["Cell"]),
            Paragraph(str(r.get("parcels", 0)), styles["Cell"]),
            Paragraph(str(r.get("hectares", 0)), styles["Cell"]),
            Paragraph(str(r.get("co2_tonnes", 0)), styles["Cell"]),
            Paragraph(str(r.get("avg_carbon_score", 0)), styles["Cell"]),
        ])
    t = Table(rows, colWidths=[4 * cm, 1.8 * cm, 2 * cm, 2 * cm, 2 * cm, 2.2 * cm, 2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ]))
    return t


@router.get("/institutional-report-pdf")
async def institutional_report_pdf(current_user: dict = Depends(get_current_user)):
    """Generate an institutional-grade PDF report (format bailleur)."""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Réservé au Super Admin")

    data = await _fetch_all_dashboard_data()
    farmers, cooperatives, carbon_auditors, dual_role_agents, field_agents = _classify_users(data["users"])

    sdg = _build_sdg_section(
        farmers, data["coop_members"], data["parcels"], data["harvests"],
        data["carbon_payments"], data["ici_profiles"], cooperatives, field_agents,
    )
    eudr = _build_eudr_section(data["parcels"], data["coop_members"], cooperatives, data["ssrte_visits"], data["ici_profiles"])
    regional = _build_regional_section(data["parcels"], data["coop_members"], cooperatives, data["harvests"])
    cfi = _build_cfi_section(data["parcels"], data["ssrte_visits"])

    total_co2 = sum(p.get("co2_captured_tonnes", 0) for p in data["parcels"])
    total_ha = sum(p.get("area_hectares", 0) for p in data["parcels"])
    total_premium = sum(p.get("amount", 0) for p in data["carbon_payments"])
    headline = {
        "beneficiaires_total": len(farmers) + len(data["coop_members"]),
        "cooperatives": len(cooperatives),
        "hectares_suivis": round(total_ha, 1),
        "co2_sequestre_tonnes": round(total_co2, 1),
        "primes_redistribuees_xof": round(total_premium),
        "eudr_compliance_rate": eudr.get("eudr_compliance_rate", 0),
        "regions_couvertes": regional.get("total_regions_covered", 0),
    }

    styles = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.2 * cm, rightMargin=1.2 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        title="Rapport d'Impact Institutionnel GreenLink",
    )

    story = []
    today = datetime.now(timezone.utc)

    # Cover
    story.append(Paragraph("GreenLink Agritech", styles["HCenter"]))
    story.append(Paragraph(f"Rapport d'Impact Institutionnel — {today.strftime('%B %Y')}", styles["SubCenter"]))
    story.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=4, spaceAfter=12))
    story.append(Paragraph(
        "Document destiné aux partenaires institutionnels : ONU (ODD), Union Européenne (Règlement EUDR 2023/1115), "
        "Banque Mondiale, Banque Africaine de Développement (BAD), World Cocoa Foundation (CFI), ICI Côte d'Ivoire, "
        "Conseil Café-Cacao (CCC). Données agrégées et vérifiables.",
        styles["Body"],
    ))
    story.append(Spacer(1, 0.5 * cm))

    # Section 1 - Headline
    story.append(Paragraph("1. Chiffres clés", styles["Sec"]))
    story.append(_headline_grid(headline, styles))

    # Section 2 - SDG
    story.append(Paragraph("2. Alignement aux Objectifs de Développement Durable (ONU)", styles["Sec"]))
    story.append(Paragraph(
        "GreenLink contribue directement à 6 des 17 ODD des Nations Unies via la plateforme carbone, "
        "la certification ARS 1000 et le suivi ICI du travail des enfants.",
        styles["Body"],
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(_sdg_table(sdg, styles))

    story.append(PageBreak())

    # Section 3 - EUDR
    story.append(Paragraph("3. Conformité EUDR (UE 2023/1115)", styles["Sec"]))
    story.append(Paragraph(
        f"Score global de conformité : <b>{eudr.get('eudr_compliance_rate', 0)}%</b>. "
        f"Parcelles géolocalisées : {eudr.get('geolocated_parcels', 0)} / {eudr.get('total_parcels', 0)} "
        f"({eudr.get('geolocation_rate', 0)}%). Polygones GPS : {eudr.get('geo_polygon_count', 0)}, "
        f"Points GPS : {eudr.get('geo_point_count', 0)}, sans GPS : {eudr.get('geo_none_count', 0)}.",
        styles["Body"],
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(_eudr_table(eudr, styles))

    # Section 4 - CFI
    story.append(Paragraph("4. Cocoa & Forests Initiative (CFI)", styles["Sec"]))
    story.append(Paragraph(
        f"Adhésion aux engagements CFI du secteur cacao-forêts (CI/Ghana) :<br/>"
        f"• Parcelles cartographiées : <b>{cfi.get('parcels_mapped_pct', 0)}%</b><br/>"
        f"• Adoption agroforesterie : <b>{cfi.get('agroforestry_adoption_pct', 0)}%</b><br/>"
        f"• Visites de monitoring SSRTE : <b>{cfi.get('monitoring_visits', 0)}</b><br/>"
        f"• Engagement zéro-déforestation : <b>✓ Actif</b><br/>"
        f"• Objectif ombrage ARS 1000 : <b>{cfi.get('shade_trees_target_per_ha', '-')} arbres/ha</b>",
        styles["Body"],
    ))

    # Section 5 - Regional
    story.append(PageBreak())
    story.append(Paragraph(f"5. KPIs par région ({regional.get('total_regions_covered', 0)} régions couvertes)", styles["Sec"]))
    story.append(Paragraph(
        "Répartition territoriale pour les ministères, collectivités locales et bailleurs régionaux.",
        styles["Body"],
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(_regional_table(regional, styles))

    # Signature / sources
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f"<b>Sources :</b> Nations Unies (Agenda 2030 – ODD), Union Européenne (Règlement EUDR 2023/1115), "
        f"World Cocoa Foundation (CFI), International Cocoa Initiative (ICI Côte d'Ivoire), "
        f"Norme ARS 1000-1 (Cacao Durable – Afrique de l'Ouest).",
        styles["Small"],
    ))
    story.append(Paragraph(
        f"<b>Généré le :</b> {today.strftime('%d/%m/%Y à %H:%M UTC')} · "
        f"<b>Par :</b> {current_user.get('full_name', 'Admin GreenLink')} · "
        f"<b>Plateforme :</b> GreenLink Agritech",
        styles["Small"],
    ))

    doc.build(story)
    buf.seek(0)

    filename = f"greenlink_impact_institutionnel_{today.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
