# ICI PDF Report Generator
# Génération automatique de rapports PDF pour les données ICI

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timedelta
from io import BytesIO
import logging

from database import db
from routes.auth import get_current_user

# Using fpdf2 for PDF generation (lighter than reportlab)
from fpdf import FPDF

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ici-pdf", tags=["ICI PDF Reports"])

# ============= AUTHENTICATION =============

async def get_admin_or_coop_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin', 'cooperative']:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs ou coopératives")
    return current_user

# ============= PDF GENERATOR CLASS =============

class ICIReport(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=15)
        
    def header(self):
        # Logo placeholder
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(34, 139, 34)  # Forest green
        self.cell(0, 10, 'GreenLink - Rapport ICI', align='C', new_x='LMARGIN', new_y='NEXT')
        self.set_font('Helvetica', '', 10)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, 'International Cocoa Initiative - Suivi Travail des Enfants', align='C', new_x='LMARGIN', new_y='NEXT')
        self.ln(5)
        # Line separator
        self.set_draw_color(34, 139, 34)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(10)
        
    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}} - Généré le {datetime.now().strftime("%d/%m/%Y %H:%M")}', align='C')
        
    def chapter_title(self, title):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(0, 100, 0)
        self.cell(0, 10, title, new_x='LMARGIN', new_y='NEXT')
        self.ln(2)
        
    def section_title(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(50, 50, 50)
        self.cell(0, 8, title, new_x='LMARGIN', new_y='NEXT')
        
    def add_metric_box(self, label, value, color=(34, 139, 34)):
        self.set_fill_color(*color)
        self.set_text_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 12)
        self.cell(45, 8, str(value), align='C', fill=True)
        self.set_text_color(50, 50, 50)
        self.set_font('Helvetica', '', 9)
        self.cell(45, 8, label, new_x='RIGHT')
        
    def add_table(self, headers, data, col_widths=None):
        if col_widths is None:
            col_widths = [190 // len(headers)] * len(headers)
            
        # Header
        self.set_font('Helvetica', 'B', 9)
        self.set_fill_color(34, 139, 34)
        self.set_text_color(255, 255, 255)
        for i, header in enumerate(headers):
            self.cell(col_widths[i], 7, header, border=1, align='C', fill=True)
        self.ln()
        
        # Data
        self.set_font('Helvetica', '', 8)
        self.set_text_color(0, 0, 0)
        fill = False
        for row in data:
            if fill:
                self.set_fill_color(240, 240, 240)
            else:
                self.set_fill_color(255, 255, 255)
            for i, cell in enumerate(row):
                self.cell(col_widths[i], 6, str(cell)[:30], border=1, align='C', fill=True)
            self.ln()
            fill = not fill

# ============= PDF REPORT ENDPOINTS =============

@router.get("/summary-report")
async def generate_summary_report(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Générer un rapport PDF résumé des données ICI"""
    
    # Fetch data
    total_profiles = await db.ici_profiles.count_documents({})
    total_visits = await db.ssrte_visits.count_documents({})
    total_alerts = await db.ici_alerts.count_documents({})
    alerts_active = await db.ici_alerts.count_documents({"resolved": False})
    
    # Risk distribution
    high_risk = await db.ici_profiles.count_documents({"niveau_risque": "ÉLEVÉ"})
    mod_risk = await db.ici_profiles.count_documents({"niveau_risque": "MODÉRÉ"})
    low_risk = await db.ici_profiles.count_documents({"niveau_risque": "FAIBLE"})
    
    # Recent visits
    recent_visits = await db.ssrte_visits.find({}).sort("date_visite", -1).limit(10).to_list(10)
    
    # Recent alerts
    recent_alerts = await db.ici_alerts.find({}).sort("created_at", -1).limit(10).to_list(10)
    
    # Generate PDF
    pdf = ICIReport()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Title
    pdf.set_font('Helvetica', 'B', 20)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 15, 'Rapport Résumé ICI', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, f'Période: Données cumulées au {datetime.now().strftime("%d/%m/%Y")}', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(10)
    
    # Key Metrics
    pdf.chapter_title('1. Indicateurs Clés')
    pdf.ln(5)
    
    # Metrics boxes
    pdf.add_metric_box('Producteurs profilés', total_profiles, (34, 139, 34))
    pdf.add_metric_box('Visites SSRTE', total_visits, (30, 144, 255))
    pdf.ln(12)
    pdf.add_metric_box('Alertes totales', total_alerts, (255, 165, 0))
    pdf.add_metric_box('Alertes actives', alerts_active, (220, 20, 60))
    pdf.ln(15)
    
    # Risk Distribution
    pdf.chapter_title('2. Distribution des Risques')
    pdf.ln(5)
    
    risk_data = [
        ['Risque Élevé', str(high_risk), f'{(high_risk/total_profiles*100):.1f}%' if total_profiles > 0 else '0%'],
        ['Risque Modéré', str(mod_risk), f'{(mod_risk/total_profiles*100):.1f}%' if total_profiles > 0 else '0%'],
        ['Risque Faible', str(low_risk), f'{(low_risk/total_profiles*100):.1f}%' if total_profiles > 0 else '0%']
    ]
    pdf.add_table(['Niveau', 'Nombre', 'Pourcentage'], risk_data, [70, 60, 60])
    pdf.ln(10)
    
    # Recent Visits
    if recent_visits:
        pdf.chapter_title('3. Dernières Visites SSRTE')
        pdf.ln(5)
        visits_data = []
        for v in recent_visits[:5]:
            date_str = v.get('date_visite', datetime.now()).strftime('%d/%m/%Y') if isinstance(v.get('date_visite'), datetime) else 'N/A'
            visits_data.append([
                date_str,
                str(v.get('farmer_id', 'N/A'))[-8:],
                str(v.get('enfants_observes_travaillant', 0)),
                v.get('niveau_risque', 'N/A').upper()
            ])
        pdf.add_table(['Date', 'Producteur', 'Enfants obs.', 'Risque'], visits_data, [40, 50, 50, 50])
        pdf.ln(10)
    
    # Recent Alerts
    if recent_alerts:
        pdf.chapter_title('4. Alertes Récentes')
        pdf.ln(5)
        alerts_data = []
        for a in recent_alerts[:5]:
            date_str = a.get('created_at', datetime.now()).strftime('%d/%m/%Y') if isinstance(a.get('created_at'), datetime) else 'N/A'
            alerts_data.append([
                date_str,
                a.get('severity', 'N/A').upper(),
                a.get('type', 'N/A')[:15],
                'Oui' if a.get('resolved') else 'Non'
            ])
        pdf.add_table(['Date', 'Sévérité', 'Type', 'Résolu'], alerts_data, [40, 40, 60, 50])
    
    # Recommendations
    pdf.add_page()
    pdf.chapter_title('5. Recommandations')
    pdf.ln(5)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(50, 50, 50)
    
    recommendations = [
        f"• Poursuivre le profilage ICI des {max(0, 100 - total_profiles)} producteurs restants",
        f"• Traiter les {alerts_active} alertes actives en priorité",
        "• Intensifier les visites SSRTE dans les zones à risque élevé",
        "• Former les coopératives à l'utilisation du système de suivi",
        "• Planifier des sessions de sensibilisation communautaire"
    ]
    
    for rec in recommendations:
        pdf.multi_cell(0, 7, rec)
        pdf.ln(2)
    
    # Generate response
    pdf_output = BytesIO()
    pdf.output(pdf_output)
    pdf_output.seek(0)
    
    return StreamingResponse(
        pdf_output,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_ici_resume_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )

@router.get("/cooperative-report/{coop_id}")
async def generate_cooperative_report(
    coop_id: str,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Générer un rapport PDF pour une coopérative spécifique"""
    from bson import ObjectId
    
    # Get cooperative
    coop = await db.users.find_one({"_id": ObjectId(coop_id), "user_type": "cooperative"})
    if not coop:
        raise HTTPException(status_code=404, detail="Coopérative non trouvée")
    
    coop_name = coop.get("coop_name", coop.get("full_name", "Coopérative"))
    
    # Get members
    members = await db.coop_members.find({"cooperative_id": coop_id}).to_list(1000)
    member_ids = [str(m["_id"]) for m in members]
    
    # Get ICI profiles
    profiles = await db.ici_profiles.find({"farmer_id": {"$in": member_ids}}).to_list(1000)
    
    # Get SSRTE visits
    visits = await db.ssrte_visits.find({"farmer_id": {"$in": member_ids}}).to_list(1000)
    
    # Get alerts
    alerts = await db.ici_alerts.find({"farmer_id": {"$in": member_ids}}).to_list(1000)
    
    # Generate PDF
    pdf = ICIReport()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Title
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 12, f'Rapport ICI - {coop_name}', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f'Code: {coop.get("coop_code", "N/A")} | Région: {coop.get("headquarters_region", "N/A")}', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 6, f'Généré le {datetime.now().strftime("%d/%m/%Y à %H:%M")}', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(10)
    
    # Summary
    pdf.chapter_title('1. Résumé')
    pdf.ln(5)
    
    high_risk = len([p for p in profiles if p.get("niveau_risque") == "ÉLEVÉ"])
    active_alerts = len([a for a in alerts if not a.get("resolved")])
    
    summary_data = [
        ['Total membres', str(len(members))],
        ['Profils ICI complétés', str(len(profiles))],
        ['Taux de complétion', f'{(len(profiles)/len(members)*100):.1f}%' if members else '0%'],
        ['Visites SSRTE', str(len(visits))],
        ['Producteurs à risque élevé', str(high_risk)],
        ['Alertes actives', str(active_alerts)]
    ]
    pdf.add_table(['Indicateur', 'Valeur'], summary_data, [100, 90])
    pdf.ln(10)
    
    # Members list
    pdf.chapter_title('2. Liste des Membres')
    pdf.ln(5)
    
    members_data = []
    for m in members[:20]:  # Limit to 20
        member_id = str(m["_id"])
        profile = next((p for p in profiles if p.get("farmer_id") == member_id), None)
        risk = profile.get("niveau_risque", "N/A") if profile else "Non profilé"
        members_data.append([
            m.get("full_name", m.get("name", "N/A"))[:20],
            m.get("phone_number", m.get("phone", "N/A")),
            risk
        ])
    
    pdf.add_table(['Nom', 'Téléphone', 'Risque ICI'], members_data, [70, 60, 60])
    
    if len(members) > 20:
        pdf.ln(3)
        pdf.set_font('Helvetica', 'I', 8)
        pdf.cell(0, 5, f'... et {len(members) - 20} autres membres', align='C')
    
    # Generate response
    pdf_output = BytesIO()
    pdf.output(pdf_output)
    pdf_output.seek(0)
    
    filename = f"rapport_ici_{coop_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_output,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/farmer-report/{farmer_id}")
async def generate_farmer_report(
    farmer_id: str,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Générer un rapport PDF individuel pour un producteur"""
    from bson import ObjectId
    
    # Get farmer
    farmer = await db.users.find_one({"_id": ObjectId(farmer_id)})
    if not farmer:
        farmer = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Producteur non trouvé")
    
    farmer_name = farmer.get("full_name", farmer.get("name", "Producteur"))
    
    # Get ICI profile
    profile = await db.ici_profiles.find_one({"farmer_id": farmer_id})
    
    # Get SSRTE visits
    visits = await db.ssrte_visits.find({"farmer_id": farmer_id}).sort("date_visite", -1).to_list(20)
    
    # Get alerts
    alerts = await db.ici_alerts.find({"farmer_id": farmer_id}).sort("created_at", -1).to_list(20)
    
    # Generate PDF
    pdf = ICIReport()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Title
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, f'Fiche Producteur ICI', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 8, farmer_name, align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(10)
    
    # Personal info
    pdf.chapter_title('1. Informations Personnelles')
    pdf.ln(5)
    
    info_data = [
        ['Téléphone', farmer.get("phone_number", farmer.get("phone", "N/A"))],
        ['Département', farmer.get("department", "N/A")],
        ['Village', farmer.get("village", "N/A")]
    ]
    
    if profile:
        info_data.extend([
            ['Genre', profile.get("genre", "N/A")],
            ['Niveau éducation', profile.get("niveau_education", "N/A")],
            ['Taille ménage', str(profile.get("taille_menage", "N/A"))]
        ])
        
        if profile.get("household_children"):
            info_data.append(['Nombre enfants', str(profile["household_children"].get("total_enfants", "N/A"))])
    
    pdf.add_table(['Information', 'Valeur'], info_data, [80, 110])
    pdf.ln(10)
    
    # Risk assessment
    pdf.chapter_title('2. Évaluation des Risques')
    pdf.ln(5)
    
    if profile and profile.get("zone_risque"):
        zone = profile["zone_risque"]
        risk_data = [
            ['Catégorie zone', zone.get("categorie", "N/A").replace("_", " ").upper()],
            ['Niveau de risque', profile.get("niveau_risque", zone.get("niveau_risque", "N/A"))],
            ['Score de risque', f'{profile.get("risk_score", "N/A")}/100'],
            ['Priorité intervention', str(zone.get("priorite_intervention", "N/A"))]
        ]
        pdf.add_table(['Critère', 'Valeur'], risk_data, [80, 110])
    else:
        pdf.set_font('Helvetica', 'I', 10)
        pdf.cell(0, 8, 'Profil ICI non encore complété', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(10)
    
    # SSRTE visits history
    pdf.chapter_title('3. Historique Visites SSRTE')
    pdf.ln(5)
    
    if visits:
        visits_data = []
        for v in visits[:10]:
            date_str = v.get('date_visite', datetime.now()).strftime('%d/%m/%Y') if isinstance(v.get('date_visite'), datetime) else 'N/A'
            visits_data.append([
                date_str,
                str(v.get('enfants_observes_travaillant', 0)),
                v.get('niveau_risque', 'N/A'),
                str(v.get('taches_dangereuses_count', 0))
            ])
        pdf.add_table(['Date', 'Enfants obs.', 'Risque', 'Tâches dang.'], visits_data, [50, 45, 50, 45])
    else:
        pdf.set_font('Helvetica', 'I', 10)
        pdf.cell(0, 8, 'Aucune visite SSRTE enregistrée', new_x='LMARGIN', new_y='NEXT')
    
    # Generate response
    pdf_output = BytesIO()
    pdf.output(pdf_output)
    pdf_output.seek(0)
    
    filename = f"fiche_producteur_{farmer_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_output,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/weekly-report")
async def generate_weekly_report(
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """Générer le rapport hebdomadaire automatique"""
    
    # Date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    # Fetch weekly data
    new_profiles = await db.ici_profiles.count_documents({
        "created_at": {"$gte": start_date, "$lte": end_date}
    })
    
    weekly_visits = await db.ssrte_visits.find({
        "date_visite": {"$gte": start_date, "$lte": end_date}
    }).to_list(100)
    
    weekly_alerts = await db.ici_alerts.find({
        "created_at": {"$gte": start_date, "$lte": end_date}
    }).to_list(100)
    
    resolved_alerts = len([a for a in weekly_alerts if a.get("resolved")])
    
    # Generate PDF
    pdf = ICIReport()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Title
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 12, 'Rapport Hebdomadaire ICI', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f'Période: {start_date.strftime("%d/%m/%Y")} - {end_date.strftime("%d/%m/%Y")}', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(15)
    
    # Weekly summary
    pdf.chapter_title('Résumé de la Semaine')
    pdf.ln(5)
    
    summary_data = [
        ['Nouveaux profils ICI', str(new_profiles)],
        ['Visites SSRTE effectuées', str(len(weekly_visits))],
        ['Nouvelles alertes', str(len(weekly_alerts))],
        ['Alertes résolues', str(resolved_alerts)],
        ['Enfants identifiés (visites)', str(sum(v.get('enfants_observes_travaillant', 0) for v in weekly_visits))]
    ]
    pdf.add_table(['Indicateur', 'Cette semaine'], summary_data, [100, 90])
    pdf.ln(10)
    
    # Weekly visits detail
    if weekly_visits:
        pdf.chapter_title('Détail des Visites')
        pdf.ln(5)
        visits_data = []
        for v in weekly_visits[:15]:
            date_str = v.get('date_visite', datetime.now()).strftime('%d/%m') if isinstance(v.get('date_visite'), datetime) else 'N/A'
            visits_data.append([
                date_str,
                str(v.get('farmer_id', 'N/A'))[-6:],
                str(v.get('enfants_observes_travaillant', 0)),
                v.get('niveau_risque', 'N/A')
            ])
        pdf.add_table(['Date', 'ID', 'Enfants', 'Risque'], visits_data, [35, 50, 50, 55])
    
    # Generate response
    pdf_output = BytesIO()
    pdf.output(pdf_output)
    pdf_output.seek(0)
    
    return StreamingResponse(
        pdf_output,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=rapport_hebdo_ici_{end_date.strftime('%Y%m%d')}.pdf"
        }
    )
