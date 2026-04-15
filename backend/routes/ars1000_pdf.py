"""
ARS 1000 - Générateur PDF officiel
GreenLink Agritech - Côte d'Ivoire

PDC officiel 10 pages, rapport d'essai ARS 1000-2, fiche traçabilité lot
"""

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
import io
import logging

from database import db
from routes.auth import get_current_user
from routes.ars1000_agroforesterie import diagnostic_agroforesterie, ESPECES_INTERDITES

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white, gray
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ars1000/pdf", tags=["ARS 1000 - PDF"])

GREEN = HexColor('#065F46')
GREEN_LIGHT = HexColor('#D1FAE5')
AMBER = HexColor('#92400E')
BLUE = HexColor('#1E40AF')
RED = HexColor('#DC2626')
GRAY_BG = HexColor('#F3F4F6')
GRAY_BORDER = HexColor('#D1D5DB')


def get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('Title_Custom', parent=styles['Title'], fontSize=18, textColor=GREEN, spaceAfter=6, alignment=TA_CENTER, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle('H1', parent=styles['Heading1'], fontSize=14, textColor=GREEN, spaceBefore=12, spaceAfter=6, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle('H2', parent=styles['Heading2'], fontSize=11, textColor=HexColor('#374151'), spaceBefore=8, spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle('Body', parent=styles['Normal'], fontSize=9, leading=12, textColor=HexColor('#374151')))
    styles.add(ParagraphStyle('Small', parent=styles['Normal'], fontSize=7, leading=9, textColor=HexColor('#6B7280')))
    styles.add(ParagraphStyle('Center', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=HexColor('#374151')))
    styles.add(ParagraphStyle('Right', parent=styles['Normal'], fontSize=9, alignment=TA_RIGHT, textColor=HexColor('#6B7280')))
    styles.add(ParagraphStyle('Bold', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=HexColor('#111827')))
    styles.add(ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, alignment=TA_CENTER, textColor=HexColor('#9CA3AF')))
    return styles


def make_header_table(title, subtitle, styles):
    data = [[
        Paragraph(f'<b>{title}</b>', styles['Title_Custom']),
    ], [
        Paragraph(subtitle, styles['Center']),
    ]]
    t = Table(data, colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), GREEN_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOX', (0, 0), (-1, -1), 0.5, GREEN),
    ]))
    return t


def make_section_title(text, styles):
    return Paragraph(f'<font color="#065F46"><b>{text}</b></font>', styles['H1'])


def make_key_value_table(data_pairs, styles, col_widths=None):
    rows = []
    for label, value in data_pairs:
        rows.append([
            Paragraph(f'<b>{label}</b>', styles['Body']),
            Paragraph(str(value or '-'), styles['Body']),
        ])
    if not col_widths:
        col_widths = [60 * mm, 110 * mm]
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), GRAY_BG),
        ('GRID', (0, 0), (-1, -1), 0.3, GRAY_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


def make_data_table(headers, rows, col_widths=None):
    styles = get_styles()
    header_row = [Paragraph(f'<b>{h}</b>', styles['Small']) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(cell), styles['Small']) for cell in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.3, GRAY_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), GRAY_BG))
    t.setStyle(TableStyle(style_cmds))
    return t


def conforme_text(val, seuil, unit=''):
    if val is None:
        return '-'
    ok = val >= seuil if isinstance(seuil, (int, float)) else bool(val)
    color = '#065F46' if ok else '#DC2626'
    symbol = 'CONFORME' if ok else 'NON CONFORME'
    return f'<font color="{color}"><b>{val}{unit} ({symbol})</b></font>'


# ============= PDC PDF (10 pages) =============

@router.get("/pdc/{pdc_id}")
async def generate_pdc_pdf(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Générer le PDF officiel du PDC (10 pages, format ARS 1000-1)"""
    if not ObjectId.is_valid(pdc_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    pdc = await db.pdc.find_one({"_id": ObjectId(pdc_id)})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")

    styles = get_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15 * mm, bottomMargin=15 * mm, leftMargin=15 * mm, rightMargin=15 * mm)
    story = []
    ident = pdc.get("identification", {})
    menage = pdc.get("menage", {})
    parcelles = pdc.get("parcelles", [])
    arbres = pdc.get("arbres_ombrage", {})
    materiel = pdc.get("materiel_agricole", {})
    strategie = pdc.get("matrice_strategique", {})
    conformite = pdc.get("pourcentage_conformite", 0)

    # === PAGE 1: COUVERTURE ===
    story.append(Spacer(1, 30 * mm))
    story.append(make_header_table(
        'PLAN DE DEVELOPPEMENT<br/>DE LA CACAOYERE (PDC)',
        'Norme ARS 1000-1 | Cacao Durable Cote d\'Ivoire',
        styles
    ))
    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph(f'<b>Producteur :</b> {ident.get("nom", "")} {ident.get("prenoms", "")}', styles['H1']))
    story.append(Paragraph(f'Village : {ident.get("village", "-")} | Region : {ident.get("region", "-")}', styles['Body']))
    story.append(Spacer(1, 10 * mm))

    conf_color = '#065F46' if conformite >= 80 else '#92400E' if conformite >= 50 else '#DC2626'
    story.append(Paragraph(f'<font color="{conf_color}" size="24"><b>Conformite : {conformite}%</b></font>', styles['Center']))
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph(f'Statut : {pdc.get("statut", "brouillon").upper()}', styles['Center']))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(f'Date de creation : {pdc.get("created_at", "-")[:10]}', styles['Right']))
    story.append(Paragraph(f'Derniere mise a jour : {pdc.get("updated_at", "-")[:10]}', styles['Right']))
    story.append(PageBreak())

    # === PAGE 2: IDENTIFICATION ===
    story.append(make_section_title('1. IDENTIFICATION DU PRODUCTEUR', styles))
    story.append(make_key_value_table([
        ('Nom', ident.get('nom', '-')),
        ('Prenoms', ident.get('prenoms', '-')),
        ('Date de naissance', ident.get('date_naissance', '-')),
        ('Genre', ident.get('genre', '-')),
        ("N° d'identification", ident.get('numero_identification', '-')),
        ('Telephone', ident.get('telephone', '-')),
        ('Localite', ident.get('localite', '-')),
        ('Village', ident.get('village', '-')),
        ('Sous-prefecture', ident.get('sous_prefecture', '-')),
        ('Departement', ident.get('department', '-')),
        ('Region', ident.get('region', '-')),
        ('Statut foncier', ident.get('statut_foncier', '-')),
        ('Membre groupe', 'Oui' if ident.get('membre_groupe') else 'Non'),
    ], styles))
    story.append(PageBreak())

    # === PAGE 3: MENAGE ===
    story.append(make_section_title('2. COMPOSITION DU MENAGE', styles))
    story.append(make_key_value_table([
        ('Taille du menage', menage.get('taille_menage', 0)),
        ('Nombre de femmes', menage.get('nombre_femmes', 0)),
        ("Nombre d'enfants (<18)", menage.get('nombre_enfants', 0)),
        ('Enfants scolarises', menage.get('enfants_scolarises', 0)),
        ('Travailleurs permanents', menage.get('travailleurs_permanents', 0)),
        ('Travailleurs temporaires', menage.get('travailleurs_temporaires', 0)),
        ('Depenses mensuelles (FCFA)', f"{menage.get('depenses_mensuelles', 0):,.0f}"),
        ('Acces bancaire', 'Oui' if menage.get('acces_banque') else 'Non'),
        ('Mobile Money', 'Oui' if menage.get('mobile_money') else 'Non'),
    ], styles))
    story.append(PageBreak())

    # === PAGE 4-5: PARCELLES ===
    story.append(make_section_title('3. PARCELLES CACAOYERES', styles))
    if parcelles:
        for i, p in enumerate(parcelles):
            story.append(Paragraph(f'<b>Parcelle {i + 1} : {p.get("nom_parcelle", "-")}</b>', styles['H2']))
            story.append(make_key_value_table([
                ('Superficie (ha)', p.get('superficie_ha', 0)),
                ('Coordonnees GPS', f"{p.get('latitude', '-')}, {p.get('longitude', '-')}"),
                ('Annee creation', p.get('annee_creation', '-')),
                ('Age arbres (ans)', p.get('age_arbres_ans', '-')),
                ('Densite (arbres/ha)', p.get('densite_arbres_ha', '-')),
                ('Variete cacao', p.get('variete_cacao', '-')),
                ('Rendement estime (kg/ha)', p.get('rendement_estime_kg_ha', 0)),
                ('Etat sanitaire', p.get('etat_sanitaire', '-')),
            ], styles))
            story.append(Spacer(1, 5 * mm))
    else:
        story.append(Paragraph('Aucune parcelle declaree', styles['Body']))
    story.append(PageBreak())

    # === PAGE 6: ARBRES D'OMBRAGE ===
    story.append(make_section_title('4. ARBRES D\'OMBRAGE - AGROFORESTERIE', styles))

    # Run diagnostic
    total_ha = sum(p.get("superficie_ha", 0) for p in parcelles) or 1
    diag = diagnostic_agroforesterie({"superficie_ha": total_ha}, arbres, pdc.get("inventaire_arbres", []))

    story.append(make_key_value_table([
        ('Nombre total d\'arbres', arbres.get('nombre_total', 0)),
        ('Densite par hectare', arbres.get('densite_par_ha', 0)),
        ('Nombre d\'especes', arbres.get('nombre_especes', 0)),
        ('Especes', ', '.join(arbres.get('especes', []))),
        ('Strate haute', arbres.get('strate_haute', 0)),
        ('Strate moyenne', arbres.get('strate_moyenne', 0)),
        ('Strate basse', arbres.get('strate_basse', 0)),
        ('Conforme agroforesterie', 'OUI' if arbres.get('conforme_agroforesterie') else 'NON'),
    ], styles))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph(f'<b>Score diagnostic agroforesterie : {diag["score"]}%</b>', styles['H2']))

    if diag.get("recommandations"):
        story.append(Paragraph('<b>Recommandations :</b>', styles['Bold']))
        for r in diag["recommandations"]:
            story.append(Paragraph(f'  - {r}', styles['Body']))

    # Inventaire individuel
    inv = pdc.get("inventaire_arbres", [])
    if inv:
        story.append(Spacer(1, 5 * mm))
        story.append(Paragraph('<b>Inventaire detaille des arbres</b>', styles['H2']))
        rows = [[a.get("espece", "-"), a.get("circonference_cm", "-"), a.get("strate", "-"), a.get("decision", "-"),
                 f'{a.get("latitude", "-")}, {a.get("longitude", "-")}'] for a in inv[:30]]
        story.append(make_data_table(['Espece', 'Circ. (cm)', 'Strate', 'Decision', 'GPS'], rows,
                                     col_widths=[40 * mm, 25 * mm, 25 * mm, 25 * mm, 50 * mm]))
    story.append(PageBreak())

    # === PAGE 7: MATERIEL ===
    story.append(make_section_title('5. MATERIEL AGRICOLE', styles))
    story.append(make_key_value_table([
        ('Outils', ', '.join(materiel.get('outils', [])) or '-'),
        ('Equipements protection', ', '.join(materiel.get('equipements_protection', [])) or '-'),
        ('Produits phytosanitaires', ', '.join(materiel.get('produits_phytosanitaires', [])) or '-'),
        ('Engrais', ', '.join(materiel.get('engrais', [])) or '-'),
        ('Acces intrants', 'Oui' if materiel.get('acces_intrants') else 'Non'),
    ], styles))
    story.append(PageBreak())

    # === PAGE 8: STRATEGIE ===
    story.append(make_section_title('6. MATRICE STRATEGIQUE', styles))
    story.append(make_key_value_table([
        ('Objectif rendement (kg/ha)', strategie.get('objectif_rendement_kg_ha', 0)),
        ('Horizon (annees)', strategie.get('horizon_annees', 5)),
        ('Cout total estime (FCFA)', f"{strategie.get('cout_total_estime', 0):,.0f}"),
        ('Risques identifies', ', '.join(strategie.get('risques_identifies', [])) or '-'),
        ('Actions prioritaires', ', '.join(strategie.get('actions_prioritaires', [])) or '-'),
    ], styles))
    story.append(PageBreak())

    # === PAGE 9: CONFORMITE ===
    story.append(make_section_title('7. SYNTHESE DE CONFORMITE ARS 1000-1', styles))
    story.append(Paragraph(f'<font size="20" color="{conf_color}"><b>Conformite globale : {conformite}%</b></font>', styles['Center']))
    story.append(Spacer(1, 8 * mm))

    # Conformity criteria table
    if diag.get("criteres"):
        crit_rows = []
        for key, c in diag["criteres"].items():
            status = 'CONFORME' if c['conforme'] else 'NON CONFORME'
            crit_rows.append([c['label'], str(c['valeur']), c['requis'], status, str(c['poids'])])
        story.append(make_data_table(
            ['Critere', 'Valeur actuelle', 'Requis', 'Statut', 'Points'],
            crit_rows,
            col_widths=[45 * mm, 30 * mm, 35 * mm, 30 * mm, 20 * mm]
        ))
    story.append(PageBreak())

    # === PAGE 10: SIGNATURES ===
    story.append(make_section_title('8. SIGNATURES', styles))
    sigs = pdc.get("signatures", [])
    if sigs:
        for s in sigs:
            story.append(Paragraph(f'<b>{s.get("role", "-").upper()}</b> : {s.get("signataire", "-")}', styles['Bold']))
            story.append(Paragraph(f'Date : {s.get("date_signature", "-")[:10] if s.get("date_signature") else "-"}', styles['Body']))
            story.append(Spacer(1, 3 * mm))
            story.append(HRFlowable(width="50%", thickness=0.5, color=GRAY_BORDER))
            story.append(Spacer(1, 5 * mm))
    else:
        story.append(Paragraph('Aucune signature', styles['Body']))

    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph('<b>Cachet de la cooperative :</b>', styles['Bold']))
    story.append(Spacer(1, 20 * mm))
    story.append(HRFlowable(width="40%", thickness=0.5, color=GRAY_BORDER))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(f'Document genere le {datetime.now(timezone.utc).strftime("%d/%m/%Y a %H:%M")} UTC', styles['Footer']))
    story.append(Paragraph('GreenLink Agritech - Norme ARS 1000-1 - Cacao Durable Cote d\'Ivoire', styles['Footer']))

    doc.build(story)
    buffer.seek(0)

    farmer_name = f"{ident.get('nom', 'PDC')}_{ident.get('prenoms', '')}".replace(' ', '_')
    filename = f"PDC_{farmer_name}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ============= RAPPORT D'ESSAI PDF (ARS 1000-2) =============

@router.get("/rapport-essai/{lot_id}")
async def generate_rapport_essai_pdf(lot_id: str, current_user: dict = Depends(get_current_user)):
    """Générer le rapport d'essai PDF (ARS 1000-2)"""
    if not ObjectId.is_valid(lot_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    lot = await db.lots_traceabilite.find_one({"_id": ObjectId(lot_id)})
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    styles = get_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15 * mm, bottomMargin=15 * mm, leftMargin=15 * mm, rightMargin=15 * mm)
    story = []
    cq = lot.get("controles_qualite", {})

    # HEADER
    story.append(make_header_table(
        'RAPPORT D\'ESSAI',
        'Norme ARS 1000-2 | Controle Qualite Cacao',
        styles
    ))
    story.append(Spacer(1, 10 * mm))

    # Lot info
    story.append(make_section_title('1. IDENTIFICATION DE L\'ECHANTILLON', styles))
    story.append(make_key_value_table([
        ('Code lot', lot.get('lot_code', '-')),
        ('Campagne', lot.get('campagne', '-')),
        ('Origine', lot.get('origine_village', '-')),
        ('Poids total (kg)', lot.get('poids_total_kg', 0)),
        ('Type produit', lot.get('type_produit', 'cacao')),
        ('Date reception', lot.get('created_at', '-')[:10]),
        ('Segregation physique', 'Oui' if lot.get('segregation_physique') else 'Non'),
    ], styles))

    story.append(Spacer(1, 8 * mm))

    # Quality controls
    story.append(make_section_title('2. RESULTATS DES CONTROLES', styles))

    h = cq.get("humidite", {})
    t = cq.get("tamisage", {})
    ce = cq.get("corps_etrangers", {})
    ec = cq.get("epreuve_coupe", {})
    f = cq.get("fermentation", {})

    story.append(Paragraph('<b>2.1 Taux d\'humidite (Annexe F - ARS 1000-2)</b>', styles['H2']))
    story.append(make_key_value_table([
        ('Taux mesure', conforme_text(h.get('taux_humidite'), 8, '%')),
        ('Seuil maximum', '8%'),
        ('Methode', h.get('methode', 'Four 103°C, 16h')),
    ], styles))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph('<b>2.2 Tamisage (Annexe B - ARS 1000-2)</b>', styles['H2']))
    story.append(make_key_value_table([
        ('Taux debris', conforme_text(t.get('taux_debris'), 1.5, '%')),
        ('Seuil maximum', '1.5%'),
    ], styles))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph('<b>2.3 Corps etrangers (Annexe C - ARS 1000-2)</b>', styles['H2']))
    story.append(make_key_value_table([
        ('Corps etrangers', conforme_text(ce.get('taux_corps_etrangers'), 0.75, '%')),
        ('Elements connexes', f"{ce.get('taux_elements_connexes', 0)}%"),
        ('Feves plates', f"{ce.get('taux_feves_plates', 0)}%"),
        ('Seuils max', 'CE: 0.75% | EC: 3.5% | FP: 1.5%'),
    ], styles))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph('<b>2.4 Epreuve a la coupe (Annexe E - ARS 1000-2)</b>', styles['H2']))
    story.append(make_key_value_table([
        ('Nombre de feves', ec.get('nombre_feves', 300)),
        ('Feves moisies', f"{ec.get('moisies_pct', 0)}%"),
        ('Feves ardoisees', f"{ec.get('ardoisees_pct', 0)}%"),
        ('Insectes/germees', f"{ec.get('insectes_germees_pct', 0)}%"),
        ('Grade determine', ec.get('grade', '-')),
    ], styles))

    # Grade table
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph('<b>Barème de classification (Table 2 - ARS 1000-2)</b>', styles['Small']))
    story.append(make_data_table(
        ['Grade', 'Moisies max', 'Ardoisees max', 'Insectes max'],
        [['Grade 1', '1%', '3%', '5%'], ['Grade 2', '2%', '4%', '8%'], ['Grade 3', '3%', '6%', '6%']],
        col_widths=[35 * mm, 35 * mm, 35 * mm, 35 * mm]
    ))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph('<b>2.5 Fermentation</b>', styles['H2']))
    story.append(make_key_value_table([
        ('Type fermentation', f.get('type_fermentation', '-')),
        ('Duree (jours)', f.get('duree_jours', '-')),
        ('Temperature max', f"{f.get('temperature_max', '-')}°C" if f.get('temperature_max') else '-'),
    ], styles))

    story.append(PageBreak())

    # Score global
    story.append(make_section_title('3. SYNTHESE', styles))
    score = cq.get("score_qualite_global", 0)
    conforme = cq.get("conforme_global", False)
    c_color = '#065F46' if conforme else '#DC2626'
    story.append(Paragraph(f'<font size="18" color="{c_color}"><b>Score qualite : {score}% - {"CONFORME" if conforme else "NON CONFORME"}</b></font>', styles['Center']))

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph('<b>Methodes de reference :</b>', styles['Bold']))
    for m in ['Humidite: Methode du four (103C, 16h) - ARS 1000-2 Annexe F',
              'Tamisage: Tamis 5mm - ARS 1000-2 Annexe B',
              'Corps etrangers: Separation manuelle - ARS 1000-2 Annexe C',
              'Epreuve coupe: 300 feves - ARS 1000-2 Annexe E']:
        story.append(Paragraph(f'  - {m}', styles['Small']))

    # Marquage
    marquage = lot.get("marquage", {})
    if marquage:
        story.append(Spacer(1, 8 * mm))
        story.append(make_section_title('4. MARQUAGE DU LOT', styles))
        story.append(make_key_value_table([
            ('Pays d\'origine', marquage.get('pays_origine', 'Cote d\'Ivoire')),
            ('Produit', marquage.get('nom_produit', 'Cacao durable')),
            ('Campagne', marquage.get('campagne', '-')),
            ('Code lot', marquage.get('lot_code', '-')),
            ('Norme', marquage.get('norme', 'ARS 1000')),
        ], styles))

    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph(f'Document genere le {datetime.now(timezone.utc).strftime("%d/%m/%Y a %H:%M")} UTC', styles['Footer']))
    story.append(Paragraph('GreenLink Agritech - Norme ARS 1000-2 - Cacao Durable', styles['Footer']))

    doc.build(story)
    buffer.seek(0)

    filename = f"Rapport_Essai_{lot.get('lot_code', 'LOT')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ============= FICHE TRACABILITE LOT PDF =============

@router.get("/tracabilite/{lot_id}")
async def generate_tracabilite_pdf(lot_id: str, current_user: dict = Depends(get_current_user)):
    """Générer la fiche de traçabilité du lot"""
    if not ObjectId.is_valid(lot_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    lot = await db.lots_traceabilite.find_one({"_id": ObjectId(lot_id)})
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    styles = get_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15 * mm, bottomMargin=15 * mm, leftMargin=15 * mm, rightMargin=15 * mm)
    story = []
    cq = lot.get("controles_qualite", {})

    # HEADER
    story.append(make_header_table(
        'FICHE DE TRACABILITE',
        f'Lot {lot.get("lot_code", "-")} | ARS 1000',
        styles
    ))
    story.append(Spacer(1, 8 * mm))

    # Info lot
    story.append(make_section_title('IDENTIFICATION DU LOT', styles))
    story.append(make_key_value_table([
        ('Code lot', lot.get('lot_code', '-')),
        ('Campagne', lot.get('campagne', '-')),
        ('Origine', lot.get('origine_village', '-')),
        ('Region', lot.get('origine_region', '-')),
        ('Poids total (kg)', lot.get('poids_total_kg', 0)),
        ('Statut', lot.get('statut', '-')),
        ('Segregation', 'Oui' if lot.get('segregation_physique') else 'Non'),
        ('Date reception', lot.get('created_at', '-')[:10]),
    ], styles))

    story.append(Spacer(1, 5 * mm))
    story.append(make_section_title('CONTROLES QUALITE', styles))

    score = cq.get("score_qualite_global", 0)
    conforme = cq.get("conforme_global", False)
    grade = cq.get("epreuve_coupe", {}).get("grade", "-")

    story.append(make_data_table(
        ['Controle', 'Valeur', 'Seuil', 'Conforme'],
        [
            ['Humidite', f'{cq.get("humidite", {}).get("taux_humidite", 0)}%', '≤ 8%', 'Oui' if cq.get("humidite", {}).get("conforme") else 'Non'],
            ['Tamisage', f'{cq.get("tamisage", {}).get("taux_debris", 0)}%', '≤ 1.5%', 'Oui' if cq.get("tamisage", {}).get("conforme") else 'Non'],
            ['Corps etrangers', f'{cq.get("corps_etrangers", {}).get("taux_corps_etrangers", 0)}%', '≤ 0.75%', 'Oui' if cq.get("corps_etrangers", {}).get("conforme") else 'Non'],
            ['Grade', grade, 'Grade 1/2/3', 'Oui' if 'Grade' in str(grade) else 'Non'],
            ['Fermentation', cq.get("fermentation", {}).get("type_fermentation", "-"), 'Bonne/Satisfaisante', 'Oui' if cq.get("fermentation", {}).get("type_fermentation") in ("bonne", "satisfaisante") else 'Non'],
        ],
        col_widths=[40 * mm, 35 * mm, 40 * mm, 30 * mm]
    ))

    story.append(Spacer(1, 5 * mm))
    c_color = '#065F46' if conforme else '#DC2626'
    story.append(Paragraph(f'<font size="14" color="{c_color}"><b>SCORE QUALITE : {score}% - {"CONFORME" if conforme else "NON CONFORME"}</b></font>', styles['Center']))

    # Marquage
    marquage = lot.get("marquage", {})
    if marquage:
        story.append(Spacer(1, 8 * mm))
        story.append(make_section_title('MARQUAGE', styles))
        story.append(make_key_value_table([
            ('Pays d\'origine', marquage.get('pays_origine', '-')),
            ('Produit', marquage.get('nom_produit', '-')),
            ('Norme', marquage.get('norme', '-')),
        ], styles))

    story.append(Spacer(1, 15 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_BORDER))
    story.append(Paragraph(f'Document genere le {datetime.now(timezone.utc).strftime("%d/%m/%Y")} | GreenLink Agritech - ARS 1000', styles['Footer']))

    doc.build(story)
    buffer.seek(0)

    filename = f"Tracabilite_{lot.get('lot_code', 'LOT')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})
