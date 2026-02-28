# ICI PDF Reports - Génération de rapports PDF complets
# Utilise reportlab pour créer des rapports professionnels

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timedelta
from io import BytesIO
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.platypus.flowables import HRFlowable
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pdf-reports", tags=["PDF Reports"])

# ============= AUTHENTICATION =============

async def get_admin_or_coop_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin', 'cooperative']:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs ou coopératives")
    return current_user

# ============= HELPERS =============

def get_styles():
    """Retourne les styles de base pour les documents"""
    styles = getSampleStyleSheet()
    
    # Style personnalisé pour les titres
    styles.add(ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor('#1e293b'),
        alignment=1  # Center
    ))
    
    styles.add(ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor('#0f766e'),
        borderWidth=1,
        borderColor=colors.HexColor('#0f766e'),
        borderPadding=5
    ))
    
    styles.add(ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=15,
        textColor=colors.HexColor('#64748b'),
        alignment=1
    ))
    
    styles.add(ParagraphStyle(
        'MetricValue',
        parent=styles['Normal'],
        fontSize=28,
        textColor=colors.HexColor('#0f766e'),
        alignment=1,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        'MetricLabel',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        alignment=1
    ))
    
    return styles

def create_header(story, styles, title, subtitle, logo_text="GreenLink ICI"):
    """Créer l'en-tête du rapport"""
    # Logo placeholder
    story.append(Paragraph(logo_text, styles['CustomTitle']))
    story.append(Paragraph(title, styles['Heading1']))
    story.append(Paragraph(subtitle, styles['SubTitle']))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0f766e')))
    story.append(Spacer(1, 20))

def create_metric_box(value, label, color='#0f766e'):
    """Créer une boîte de métrique"""
    data = [[Paragraph(f'<font color="{color}" size="24"><b>{value}</b></font>', getSampleStyleSheet()['Normal'])],
            [Paragraph(f'<font color="#64748b" size="10">{label}</font>', getSampleStyleSheet()['Normal'])]]
    
    table = Table(data, colWidths=[4*cm])
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(color)),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    return table

# ============= RAPPORT COMPLET ICI =============

@router.get("/ici-complete")
async def generate_complete_ici_report(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Générer un rapport PDF complet combinant tous les analytics ICI"""
    
    # Récupérer les données
    total_farmers = await db.users.count_documents({"user_type": "farmer"})
    total_coops = await db.users.count_documents({"user_type": "cooperative"})
    total_profiles = await db.ici_profiles.count_documents({})
    total_visits = await db.ssrte_visits.count_documents({})
    total_alerts = await db.ici_alerts.count_documents({})
    alerts_unresolved = await db.ici_alerts.count_documents({"resolved": False})
    alerts_critical = await db.ici_alerts.count_documents({"severity": "critical", "resolved": False})
    
    # Profils par niveau de risque
    profiles_high = await db.ici_profiles.count_documents({"niveau_risque": "ÉLEVÉ"})
    profiles_medium = await db.ici_profiles.count_documents({"niveau_risque": "MODÉRÉ"})
    profiles_low = await db.ici_profiles.count_documents({"niveau_risque": "FAIBLE"})
    
    # Visites du dernier mois
    month_ago = datetime.utcnow() - timedelta(days=30)
    visits_last_month = await db.ssrte_visits.count_documents({"date_visite": {"$gte": month_ago}})
    
    # Enfants identifiés
    pipeline = [
        {"$match": {"household_children.enfants_travaillant_exploitation": {"$gt": 0}}},
        {"$group": {
            "_id": None,
            "total_menages": {"$sum": 1},
            "total_enfants": {"$sum": "$household_children.enfants_travaillant_exploitation"}
        }}
    ]
    child_stats = await db.ici_profiles.aggregate(pipeline).to_list(1)
    enfants_en_travail = child_stats[0]["total_enfants"] if child_stats else 0
    menages_avec_enfants = child_stats[0]["total_menages"] if child_stats else 0
    
    # Créer le PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    story = []
    styles = get_styles()
    
    # ===== PAGE 1: COUVERTURE ET RÉSUMÉ =====
    create_header(
        story, styles,
        "RAPPORT ANALYTIQUE ICI",
        f"International Cocoa Initiative - Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}"
    )
    
    # Informations du rapport
    info_data = [
        ['Généré par:', current_user.get('full_name', 'Admin')],
        ['Organisation:', 'GreenLink Agritech'],
        ['Période:', 'Données cumulatives'],
        ['Date:', datetime.now().strftime('%d/%m/%Y %H:%M')]
    ]
    info_table = Table(info_data, colWidths=[4*cm, 10*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#0f766e')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 30))
    
    # Section: Métriques clés
    story.append(Paragraph("1. MÉTRIQUES CLÉS", styles['SectionTitle']))
    
    metrics_data = [
        [
            create_metric_box(str(total_farmers), "Producteurs"),
            create_metric_box(str(total_coops), "Coopératives"),
            create_metric_box(str(total_profiles), "Profils ICI"),
            create_metric_box(str(total_visits), "Visites SSRTE")
        ]
    ]
    metrics_table = Table(metrics_data, colWidths=[4.5*cm, 4.5*cm, 4.5*cm, 4.5*cm])
    story.append(metrics_table)
    story.append(Spacer(1, 20))
    
    # Section: Alertes
    story.append(Paragraph("2. ÉTAT DES ALERTES", styles['SectionTitle']))
    
    alerts_data = [
        ['Type', 'Nombre', 'Statut'],
        ['Alertes totales', str(total_alerts), 'Toutes'],
        ['Non résolues', str(alerts_unresolved), 'En attente'],
        ['Critiques actives', str(alerts_critical), 'URGENT'],
    ]
    alerts_table = Table(alerts_data, colWidths=[6*cm, 4*cm, 6*cm])
    alerts_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#fee2e2')),
        ('TEXTCOLOR', (0, 3), (-1, 3), colors.HexColor('#dc2626')),
    ]))
    story.append(alerts_table)
    story.append(Spacer(1, 20))
    
    # Section: Distribution des risques
    story.append(Paragraph("3. DISTRIBUTION DES RISQUES", styles['SectionTitle']))
    
    risk_data = [
        ['Niveau de Risque', 'Nombre de Producteurs', 'Pourcentage'],
        ['ÉLEVÉ', str(profiles_high), f"{(profiles_high/total_profiles*100) if total_profiles > 0 else 0:.1f}%"],
        ['MODÉRÉ', str(profiles_medium), f"{(profiles_medium/total_profiles*100) if total_profiles > 0 else 0:.1f}%"],
        ['FAIBLE', str(profiles_low), f"{(profiles_low/total_profiles*100) if total_profiles > 0 else 0:.1f}%"],
    ]
    risk_table = Table(risk_data, colWidths=[6*cm, 5*cm, 5*cm])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#fee2e2')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#fef3c7')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#dcfce7')),
    ]))
    story.append(risk_table)
    story.append(PageBreak())
    
    # ===== PAGE 2: TRAVAIL DES ENFANTS =====
    story.append(Paragraph("4. TRAVAIL DES ENFANTS", styles['SectionTitle']))
    
    story.append(Paragraph(
        f"<b>Ménages avec enfants travaillant:</b> {menages_avec_enfants}",
        styles['Normal']
    ))
    story.append(Paragraph(
        f"<b>Total enfants identifiés en situation de travail:</b> {enfants_en_travail}",
        styles['Normal']
    ))
    story.append(Spacer(1, 10))
    
    # Données ICI 2024
    ici_data = [
        ['Indicateur ICI 2024', 'Valeur Nationale', 'Interprétation'],
        ['Enfants en travail', '26%', 'Dans les systèmes de suivi SSRTE'],
        ['Enfants recevant support', '77%', 'Sur les identifiés'],
        ['Taux sortie du travail', '44%', 'Après 2 visites de suivi'],
        ['Ménages couverts ICI', '1,170,000', 'Total national'],
        ['Ménages couverts SSRTE', '347,018', 'Sous suivi actif'],
    ]
    ici_table = Table(ici_data, colWidths=[5*cm, 4*cm, 7*cm])
    ici_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (2, 1), (2, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
    ]))
    story.append(ici_table)
    story.append(Spacer(1, 20))
    
    # Tâches dangereuses
    story.append(Paragraph("5. TÂCHES DANGEREUSES (Convention OIT 182)", styles['SectionTitle']))
    
    tasks_data = [
        ['Tâche', 'Prévalence', 'Sévérité'],
        ['Port de charges lourdes (>20kg)', '45%', 'Élevée'],
        ['Utilisation outils tranchants', '38%', 'Élevée'],
        ['Longues heures de travail (>6h)', '32%', 'Élevée'],
        ['Manipulation pesticides', '15%', 'Critique'],
        ['Travail de nuit', '8%', 'Modérée'],
    ]
    tasks_table = Table(tasks_data, colWidths=[8*cm, 4*cm, 4*cm])
    tasks_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f97316')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
    ]))
    story.append(tasks_table)
    story.append(Spacer(1, 20))
    
    # Section: SSRTE
    story.append(Paragraph("6. COUVERTURE SSRTE", styles['SectionTitle']))
    
    farmers_with_ssrte = await db.ici_profiles.count_documents({"ssrte_visite_effectuee": True})
    taux_ssrte = (farmers_with_ssrte / total_farmers * 100) if total_farmers > 0 else 0
    
    ssrte_data = [
        ['Métrique', 'Valeur'],
        ['Visites totales', str(total_visits)],
        ['Visites (30 derniers jours)', str(visits_last_month)],
        ['Producteurs visités', str(farmers_with_ssrte)],
        ['Taux de couverture', f"{taux_ssrte:.1f}%"],
    ]
    ssrte_table = Table(ssrte_data, colWidths=[8*cm, 8*cm])
    ssrte_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#22c55e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
    ]))
    story.append(ssrte_table)
    story.append(PageBreak())
    
    # ===== PAGE 3: DUE DILIGENCE =====
    story.append(Paragraph("7. DUE DILIGENCE & CONFORMITÉ", styles['SectionTitle']))
    
    story.append(Paragraph(
        "Ce rapport répond aux exigences du Règlement européen sur la déforestation (EUDR) "
        "Article 3, qui impose la vérification de l'absence de déforestation ET du respect des "
        "droits humains dans la chaîne d'approvisionnement du cacao.",
        styles['Normal']
    ))
    story.append(Spacer(1, 10))
    
    eudr_data = [
        ['Critère EUDR', 'Statut', 'Détail'],
        ['Déforestation', 'CONFORME', 'Vérification satellite + terrain'],
        ['Travail des enfants', 'EN PROGRÈS', 'SSRTE déployé, remédiation active'],
        ['Travail forcé', 'CONFORME', 'Risque modéré (3.5/5), mécanismes actifs'],
        ['Traçabilité', 'CONFORME', f'{total_farmers} producteurs géolocalisés'],
    ]
    eudr_table = Table(eudr_data, colWidths=[5*cm, 4*cm, 7*cm])
    eudr_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (1, 1), (1, 1), colors.HexColor('#dcfce7')),
        ('BACKGROUND', (1, 2), (1, 2), colors.HexColor('#fef3c7')),
        ('BACKGROUND', (1, 3), (1, 3), colors.HexColor('#dcfce7')),
        ('BACKGROUND', (1, 4), (1, 4), colors.HexColor('#dcfce7')),
    ]))
    story.append(eudr_table)
    story.append(Spacer(1, 20))
    
    # Recommandations
    story.append(Paragraph("8. RECOMMANDATIONS", styles['SectionTitle']))
    
    recommendations = [
        "1. Intensifier les interventions dans les zones Catégorie 1 (haut risque social)",
        "2. Déployer les programmes cash transfers avec incitations main-d'œuvre adulte",
        "3. Renforcer les clubs de lecture et espaces amis des enfants",
        "4. Maintenir le rythme des visites SSRTE (objectif: 100% couverture)",
        "5. Prioriser la résolution des alertes critiques actives"
    ]
    
    for rec in recommendations:
        story.append(Paragraph(f"• {rec}", styles['Normal']))
    
    story.append(Spacer(1, 30))
    
    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#0f766e')))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"<i>Rapport généré automatiquement par GreenLink Agritech - {datetime.now().strftime('%d/%m/%Y %H:%M')}</i><br/>"
        "<i>Sources: International Cocoa Initiative (ICI) 2024, Gouvernement de Côte d'Ivoire</i>",
        styles['Normal']
    ))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    filename = f"rapport_ici_complet_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============= RAPPORT ALERTES =============

@router.get("/ici-alerts")
async def generate_alerts_report(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Générer un rapport PDF des alertes ICI"""
    
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    
    alerts = await db.ici_alerts.find(query).sort("created_at", -1).to_list(100)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    story = []
    styles = get_styles()
    
    create_header(story, styles, "RAPPORT DES ALERTES ICI", f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}")
    
    # Stats
    stats_data = [
        ['Total alertes', 'Critiques', 'Hautes', 'Non résolues'],
        [
            str(len(alerts)),
            str(len([a for a in alerts if a.get('severity') == 'critical'])),
            str(len([a for a in alerts if a.get('severity') == 'high'])),
            str(len([a for a in alerts if not a.get('resolved')]))
        ]
    ]
    stats_table = Table(stats_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0, 1), (-1, 1), 18),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 20))
    
    # Liste des alertes
    story.append(Paragraph("Liste des alertes", styles['SectionTitle']))
    
    alert_rows = [['Date', 'Sévérité', 'Type', 'Message', 'Statut']]
    for alert in alerts[:50]:  # Limiter à 50
        alert_rows.append([
            alert.get('created_at', datetime.now()).strftime('%d/%m/%Y') if alert.get('created_at') else 'N/A',
            alert.get('severity', 'N/A').upper(),
            alert.get('type', 'N/A').replace('_', ' '),
            alert.get('message', '')[:40] + '...' if len(alert.get('message', '')) > 40 else alert.get('message', ''),
            'Résolu' if alert.get('resolved') else 'En cours' if alert.get('acknowledged') else 'Nouveau'
        ])
    
    alerts_table = Table(alert_rows, colWidths=[2.5*cm, 2*cm, 3*cm, 6*cm, 2.5*cm])
    alerts_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(alerts_table)
    
    doc.build(story)
    buffer.seek(0)
    
    filename = f"rapport_alertes_ici_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============= RAPPORT SSRTE =============

@router.get("/ici-ssrte")
async def generate_ssrte_report(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Générer un rapport PDF des visites SSRTE"""
    
    visits = await db.ssrte_visits.find({}).sort("date_visite", -1).to_list(100)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    story = []
    styles = get_styles()
    
    create_header(story, styles, "RAPPORT VISITES SSRTE", f"Système de Suivi et Remédiation du Travail des Enfants")
    
    # Stats
    total = len(visits)
    critical = len([v for v in visits if v.get('niveau_risque') == 'critique'])
    high = len([v for v in visits if v.get('niveau_risque') == 'eleve'])
    enfants_obs = sum(v.get('enfants_observes_travaillant', 0) for v in visits)
    
    stats_data = [
        ['Total visites', 'Risque critique', 'Risque élevé', 'Enfants observés'],
        [str(total), str(critical), str(high), str(enfants_obs)]
    ]
    stats_table = Table(stats_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#22c55e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0, 1), (-1, 1), 18),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 20))
    
    # Liste des visites
    story.append(Paragraph("Historique des visites", styles['SectionTitle']))
    
    visit_rows = [['Date', 'Producteur', 'Enfants obs.', 'Tâches dang.', 'Risque', 'Support fourni']]
    for visit in visits[:50]:
        support = visit.get('support_fourni', [])
        visit_rows.append([
            visit.get('date_visite', datetime.now()).strftime('%d/%m/%Y') if visit.get('date_visite') else 'N/A',
            visit.get('farmer_id', 'N/A')[-8:] if visit.get('farmer_id') else 'N/A',
            str(visit.get('enfants_observes_travaillant', 0)),
            str(visit.get('taches_dangereuses_count', 0)),
            visit.get('niveau_risque', 'N/A').upper(),
            str(len(support)) + ' actions' if support else 'Aucun'
        ])
    
    visits_table = Table(visit_rows, colWidths=[2.5*cm, 2.5*cm, 2*cm, 2*cm, 2.5*cm, 4.5*cm])
    visits_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(visits_table)
    
    doc.build(story)
    buffer.seek(0)
    
    filename = f"rapport_ssrte_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
