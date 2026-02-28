"""
PDF Report Generation Service for EUDR Compliance and Carbon Reports
"""

import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import base64


class PDFReportGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#1a5f4a'),
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.HexColor('#2d5a4d')
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubTitle',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.gray,
            alignment=TA_CENTER,
            spaceAfter=20
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomBodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=8
        ))
        
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.gray
        ))
    
    def generate_eudr_report(self, data: dict) -> bytes:
        """Generate EUDR Compliance Report PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        # Title
        story.append(Paragraph("RAPPORT DE CONFORMITÉ EUDR", self.styles['ReportTitle']))
        story.append(Paragraph("Règlement (UE) 2023/1115 - Anti-Déforestation", self.styles['SubTitle']))
        story.append(Spacer(1, 20))
        
        # Cooperative Info
        coop = data.get('cooperative', {})
        story.append(Paragraph("Informations de la Coopérative", self.styles['SectionTitle']))
        
        coop_data = [
            ['Nom:', coop.get('name', 'N/A')],
            ['Code:', coop.get('code', 'N/A')],
            ['Certifications:', ', '.join(coop.get('certifications', []))],
            ['Date du rapport:', datetime.now().strftime('%d/%m/%Y à %H:%M')]
        ]
        
        coop_table = Table(coop_data, colWidths=[4*cm, 12*cm])
        coop_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2d5a4d')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(coop_table)
        story.append(Spacer(1, 20))
        
        # Compliance Status
        compliance = data.get('compliance', {})
        story.append(Paragraph("État de Conformité", self.styles['SectionTitle']))
        
        compliance_rate = compliance.get('compliance_rate', 0)
        
        compliance_data = [
            ['Indicateur', 'Valeur', 'Statut'],
            ['Taux de conformité global', f"{compliance_rate}%", '✓ Conforme' if compliance_rate >= 90 else '⚠ À améliorer'],
            ['Taux de géolocalisation', f"{compliance.get('geolocation_rate', 0)}%", '✓' if compliance.get('geolocation_rate', 0) >= 85 else '⚠'],
            ['Parcelles géolocalisées', f"{compliance.get('geolocated_parcels', 0)} / {compliance.get('total_parcels', 0)}", ''],
            ['Alertes déforestation', str(compliance.get('deforestation_alerts', 0)), '✓ Aucune' if compliance.get('deforestation_alerts', 0) == 0 else '⚠'],
        ]
        
        compliance_table = Table(compliance_data, colWidths=[7*cm, 4*cm, 5*cm])
        compliance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d5a4d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(compliance_table)
        story.append(Spacer(1, 20))
        
        # Statistics
        stats = data.get('statistics', {})
        story.append(Paragraph("Statistiques Globales", self.styles['SectionTitle']))
        
        stats_data = [
            ['Métrique', 'Valeur'],
            ['Membres actifs', str(stats.get('total_members', 0))],
            ['Surface totale', f"{stats.get('total_hectares', 0)} hectares"],
            ['CO₂ capturé', f"{stats.get('total_co2_tonnes', 0)} tonnes"],
            ['Score carbone moyen', f"{stats.get('average_carbon_score', 0)}/10"],
        ]
        
        stats_table = Table(stats_data, colWidths=[8*cm, 8*cm])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a9079')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 20))
        
        # Certifications
        certs = data.get('eudr_compliance', {}).get('certification_coverage', {})
        if certs:
            story.append(Paragraph("Couverture des Certifications", self.styles['SectionTitle']))
            
            cert_data = [['Certification', 'Parcelles', 'Pourcentage']]
            total_parcels = compliance.get('total_parcels', 1)
            for cert_name, count in certs.items():
                pct = round(count / total_parcels * 100, 1) if total_parcels > 0 else 0
                cert_data.append([cert_name.replace('_', ' ').title(), str(count), f"{pct}%"])
            
            cert_table = Table(cert_data, colWidths=[7*cm, 4*cm, 5*cm])
            cert_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6b8e7a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(cert_table)
            story.append(Spacer(1, 20))
        
        # Declaration
        story.append(Paragraph("Déclaration de Conformité", self.styles['SectionTitle']))
        declaration_text = f"""
        Je soussigné(e), représentant de la coopérative {coop.get('name', 'N/A')}, certifie que:
        
        • Les informations contenues dans ce rapport sont exactes et vérifiables.
        • Toutes les parcelles déclarées ont été vérifiées conformément au Règlement (UE) 2023/1115.
        • Aucune déforestation n'a eu lieu sur les parcelles après le 31 décembre 2020.
        • Les coordonnées GPS des parcelles sont disponibles et vérifiables.
        
        Ce rapport est généré automatiquement par la plateforme GreenLink Agritech.
        """
        story.append(Paragraph(declaration_text, self.styles['CustomBodyText']))
        story.append(Spacer(1, 30))
        
        # Signature
        story.append(Paragraph("_" * 40, self.styles['CustomBodyText']))
        story.append(Paragraph("Signature du représentant", self.styles['SmallText']))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"Date: {datetime.now().strftime('%d/%m/%Y')}", self.styles['SmallText']))
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph(
            "Ce document est conforme aux exigences du Règlement (UE) 2023/1115 relatif à la mise à disposition sur le marché de l'Union ainsi qu'à l'exportation de certains produits de base et produits dérivés associés à la déforestation et à la dégradation des forêts.",
            self.styles['SmallText']
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def generate_carbon_report(self, data: dict) -> bytes:
        """Generate Carbon Credits Report PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        # Title
        story.append(Paragraph("RAPPORT CRÉDITS CARBONE", self.styles['ReportTitle']))
        story.append(Paragraph("Impact Environnemental et Durabilité", self.styles['SubTitle']))
        story.append(Spacer(1, 20))
        
        # Cooperative Info
        coop = data.get('cooperative', {})
        story.append(Paragraph("Coopérative", self.styles['SectionTitle']))
        story.append(Paragraph(f"<b>{coop.get('name', 'N/A')}</b> - Code: {coop.get('code', 'N/A')}", self.styles['CustomBodyText']))
        story.append(Paragraph(f"Date: {datetime.now().strftime('%d/%m/%Y')}", self.styles['SmallText']))
        story.append(Spacer(1, 20))
        
        # Carbon Capture
        sustainability = data.get('sustainability', {})
        story.append(Paragraph("Capture de Carbone", self.styles['SectionTitle']))
        
        carbon_data = [
            ['Métrique', 'Valeur'],
            ['CO₂ total capturé', f"{sustainability.get('total_co2_captured_tonnes', 0)} tonnes"],
            ['Crédits carbone générés', str(sustainability.get('carbon_credits_generated', 0))],
            ['Crédits vendus', str(sustainability.get('carbon_credits_sold', 0))],
            ['Crédits disponibles', str(sustainability.get('carbon_credits_available', 0))],
            ['Revenus carbone', f"{sustainability.get('carbon_revenue_fcfa', 0):,.0f} FCFA"],
            ['Score carbone moyen', f"{sustainability.get('average_carbon_score', 0)}/10"],
            ['Taux zéro déforestation', f"{sustainability.get('deforestation_free_rate', 0)}%"],
        ]
        
        carbon_table = Table(carbon_data, colWidths=[8*cm, 8*cm])
        carbon_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d5a4d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0f7f4')),
        ]))
        story.append(carbon_table)
        story.append(Spacer(1, 20))
        
        # Environmental Impact
        story.append(Paragraph("Impact Environnemental Équivalent", self.styles['SectionTitle']))
        
        co2_tonnes = sustainability.get('total_co2_captured_tonnes', 0)
        impact_data = [
            ['Équivalence', 'Valeur'],
            ['Arbres plantés équivalents', f"{int(co2_tonnes * 45):,}"],
            ['Voitures compensées (1 an)', f"{int(co2_tonnes / 4.6):,}"],
            ['Vols Paris-New York compensés', f"{int(co2_tonnes / 0.9):,}"],
            ['Hectares de forêt protégés', f"{round(co2_tonnes / 5, 1)}"],
        ]
        
        impact_table = Table(impact_data, colWidths=[10*cm, 6*cm])
        impact_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a9079')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(impact_table)
        story.append(Spacer(1, 20))
        
        # SDG Alignment
        story.append(Paragraph("Alignement Objectifs de Développement Durable (ODD)", self.styles['SectionTitle']))
        
        sdg_text = """
        Ce projet contribue directement aux Objectifs de Développement Durable suivants:
        
        • <b>ODD 1</b> - Pas de pauvreté: Augmentation des revenus des agriculteurs
        • <b>ODD 2</b> - Faim zéro: Sécurité alimentaire et agriculture durable
        • <b>ODD 8</b> - Travail décent: Création d'emplois ruraux
        • <b>ODD 13</b> - Action climatique: Séquestration du carbone
        • <b>ODD 15</b> - Vie terrestre: Protection des forêts et biodiversité
        """
        story.append(Paragraph(sdg_text, self.styles['CustomBodyText']))
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph(
            f"Rapport généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} par GreenLink Agritech",
            self.styles['SmallText']
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def generate_distribution_report(self, data: dict) -> bytes:
        """Generate Premium Distribution Report PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        # Title
        story.append(Paragraph("RAPPORT DE DISTRIBUTION DES PRIMES", self.styles['ReportTitle']))
        story.append(Paragraph("Redistribution des Primes Carbone aux Membres", self.styles['SubTitle']))
        story.append(Spacer(1, 20))
        
        # Distribution Info
        dist = data.get('distribution', {})
        story.append(Paragraph("Détails de la Distribution", self.styles['SectionTitle']))
        
        dist_data = [
            ['Information', 'Valeur'],
            ['Lot concerné', dist.get('lot_name', 'N/A')],
            ['Date de distribution', datetime.now().strftime('%d/%m/%Y')],
            ['Prime totale reçue', f"{dist.get('total_premium', 0):,.0f} FCFA"],
            ['Commission coopérative (10%)', f"{dist.get('commission_amount', 0):,.0f} FCFA"],
            ['Montant à distribuer', f"{dist.get('amount_distributed', 0):,.0f} FCFA"],
            ['Nombre de bénéficiaires', str(dist.get('beneficiaries_count', 0))],
            ['Statut', dist.get('status', 'N/A').replace('_', ' ').title()],
        ]
        
        dist_table = Table(dist_data, colWidths=[8*cm, 8*cm])
        dist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d5a4d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(dist_table)
        story.append(Spacer(1, 20))
        
        # Beneficiaries
        beneficiaries = data.get('beneficiaries', [])
        if beneficiaries:
            story.append(Paragraph("Liste des Bénéficiaires", self.styles['SectionTitle']))
            
            ben_data = [['Nom', 'Téléphone', 'Montant (FCFA)', 'Statut']]
            for ben in beneficiaries[:20]:  # Limit to 20
                ben_data.append([
                    ben.get('name', 'N/A'),
                    ben.get('phone', 'N/A'),
                    f"{ben.get('amount', 0):,.0f}",
                    '✓ Payé' if ben.get('paid') else 'En attente'
                ])
            
            ben_table = Table(ben_data, colWidths=[5*cm, 4*cm, 4*cm, 3*cm])
            ben_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a9079')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
                ('ALIGN', (3, 0), (3, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(ben_table)
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph(
            f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - GreenLink Agritech",
            self.styles['SmallText']
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def generate_member_receipt(self, data: dict) -> bytes:
        """Generate Individual Member Payment Receipt PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        # Title
        story.append(Paragraph("REÇU DE PAIEMENT", self.styles['ReportTitle']))
        story.append(Paragraph("Prime Carbone - Certification Durable", self.styles['SubTitle']))
        story.append(Spacer(1, 20))
        
        # Cooperative Info
        coop = data.get('cooperative', {})
        story.append(Paragraph("Coopérative Émettrice", self.styles['SectionTitle']))
        
        coop_data = [
            ['Nom:', coop.get('name', 'N/A')],
            ['Code:', coop.get('code', 'N/A')],
            ['Région:', coop.get('headquarters_region', 'N/A')]
        ]
        
        coop_table = Table(coop_data, colWidths=[4*cm, 12*cm])
        coop_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2d5a4d')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(coop_table)
        story.append(Spacer(1, 20))
        
        # Member/Beneficiary Info
        member = data.get('member', {})
        story.append(Paragraph("Bénéficiaire", self.styles['SectionTitle']))
        
        member_data = [
            ['Nom complet:', member.get('name', 'N/A')],
            ['Téléphone:', member.get('phone', 'N/A')],
            ['Village:', member.get('village', 'N/A')],
            ['N° CNI:', member.get('cni_number', 'N/A') or 'Non renseigné']
        ]
        
        member_table = Table(member_data, colWidths=[4*cm, 12*cm])
        member_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f5f9f7')),
        ]))
        story.append(member_table)
        story.append(Spacer(1, 20))
        
        # Payment Details
        payment = data.get('payment', {})
        story.append(Paragraph("Détails du Paiement", self.styles['SectionTitle']))
        
        # Main payment amount - highlighted
        amount = payment.get('amount', 0)
        story.append(Paragraph(
            f"<b>Montant reçu: {amount:,.0f} FCFA</b>",
            ParagraphStyle(
                'AmountStyle',
                parent=self.styles['Normal'],
                fontSize=18,
                textColor=colors.HexColor('#1a5f4a'),
                spaceAfter=15,
                alignment=TA_CENTER
            )
        ))
        
        payment_data = [
            ['Information', 'Valeur'],
            ['Lot de vente', payment.get('lot_name', 'N/A')],
            ['Part de distribution', f"{payment.get('share_percentage', 0)}%"],
            ['Parcelles contributives', str(payment.get('parcels_count', 0))],
            ['Surface totale', f"{payment.get('total_hectares', 0)} ha"],
            ['Score carbone moyen', f"{payment.get('average_score', 0)}/10"],
            ['Statut du paiement', payment.get('payment_status', 'N/A').replace('_', ' ').title()],
            ['N° Transaction', payment.get('transaction_id', 'N/A') or 'En attente'],
        ]
        
        payment_table = Table(payment_data, colWidths=[8*cm, 8*cm])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d5a4d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(payment_table)
        story.append(Spacer(1, 20))
        
        # Environmental Impact
        story.append(Paragraph("Impact Environnemental", self.styles['SectionTitle']))
        
        hectares = payment.get('total_hectares', 0)
        score = payment.get('average_score', 0)
        estimated_co2 = round(hectares * score * 2.5, 1)
        
        impact_text = f"""
        Grâce à vos pratiques agricoles durables:<br/><br/>
        • <b>CO₂ capturé estimé:</b> {estimated_co2} tonnes<br/>
        • <b>Équivalent arbres plantés:</b> {int(estimated_co2 * 45)} arbres<br/>
        • <b>Contribution au climat:</b> Vous aidez à lutter contre le changement climatique<br/><br/>
        Votre engagement dans une agriculture durable permet de préserver l'environnement 
        tout en améliorant vos revenus.
        """
        story.append(Paragraph(impact_text, self.styles['CustomBodyText']))
        story.append(Spacer(1, 20))
        
        # Certification
        story.append(Paragraph("Certification", self.styles['SectionTitle']))
        
        dist_date = data.get('distribution_date')
        if isinstance(dist_date, datetime):
            date_str = dist_date.strftime('%d/%m/%Y à %H:%M')
        else:
            date_str = str(dist_date) if dist_date else datetime.now().strftime('%d/%m/%Y')
        
        cert_text = f"""
        Ce document certifie que le paiement ci-dessus a été effectué dans le cadre 
        du programme de primes carbone de la coopérative {coop.get('name', '')}.<br/><br/>
        Ce paiement est conforme aux exigences de traçabilité et de durabilité
        du Règlement (UE) 2023/1115 (EUDR).<br/><br/>
        <b>Date de distribution:</b> {date_str}<br/>
        <b>Date d'émission du reçu:</b> {datetime.now().strftime('%d/%m/%Y à %H:%M')}
        """
        story.append(Paragraph(cert_text, self.styles['CustomBodyText']))
        story.append(Spacer(1, 30))
        
        # Signature area
        story.append(Paragraph("Cachet et signature de la coopérative:", self.styles['SmallText']))
        story.append(Spacer(1, 40))
        story.append(Paragraph("_" * 30, self.styles['CustomBodyText']))
        story.append(Spacer(1, 20))
        
        # Footer
        story.append(Paragraph(
            f"Reçu généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - GreenLink Agritech Platform",
            self.styles['SmallText']
        ))
        story.append(Paragraph(
            "Ce document fait foi pour justifier le paiement de la prime carbone au bénéficiaire mentionné.",
            self.styles['SmallText']
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()


# Create singleton instance
pdf_generator = PDFReportGenerator()
