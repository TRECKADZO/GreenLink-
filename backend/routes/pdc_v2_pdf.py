"""
PDC v2 - Generateur PDF officiel
GreenLink Agritech - Cote d'Ivoire

PDF officiel du Plan de Developpement de la Cacaoyere (8 fiches / 3 annexes)
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
import io
import logging

from database import db
from routes.auth import get_current_user

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import base64

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pdc-v2/pdf", tags=["PDC v2 - PDF"])

# Colors
PRIMARY = HexColor('#1A3622')
PRIMARY_LIGHT = HexColor('#E8F0EA')
ACCENT = HexColor('#D4AF37')
GRAY_BG = HexColor('#F3F4F6')
GRAY_BORDER = HexColor('#D1D5DB')
BODY_COLOR = HexColor('#374151')
MUTED = HexColor('#6B7280')


def _styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle('DocTitle', parent=s['Title'], fontSize=20, textColor=PRIMARY, spaceAfter=4, alignment=TA_CENTER, fontName='Helvetica-Bold'))
    s.add(ParagraphStyle('DocSubtitle', parent=s['Normal'], fontSize=11, textColor=MUTED, alignment=TA_CENTER, spaceAfter=10))
    s.add(ParagraphStyle('SectionTitle', parent=s['Heading1'], fontSize=13, textColor=PRIMARY, spaceBefore=10, spaceAfter=5, fontName='Helvetica-Bold'))
    s.add(ParagraphStyle('SubTitle', parent=s['Heading2'], fontSize=10, textColor=HexColor('#111827'), spaceBefore=6, spaceAfter=3, fontName='Helvetica-Bold'))
    s.add(ParagraphStyle('Body', parent=s['Normal'], fontSize=9, leading=12, textColor=BODY_COLOR))
    s.add(ParagraphStyle('Small', parent=s['Normal'], fontSize=7, leading=9, textColor=MUTED))
    s.add(ParagraphStyle('CenterText', parent=s['Normal'], fontSize=9, alignment=TA_CENTER, textColor=BODY_COLOR))
    s.add(ParagraphStyle('RightText', parent=s['Normal'], fontSize=8, alignment=TA_RIGHT, textColor=MUTED))
    s.add(ParagraphStyle('BoldBody', parent=s['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=HexColor('#111827')))
    s.add(ParagraphStyle('Footer', parent=s['Normal'], fontSize=7, alignment=TA_CENTER, textColor=MUTED))
    return s


def _header_banner(title, subtitle, styles):
    data = [
        [Paragraph(f'<b>{title}</b>', styles['DocTitle'])],
        [Paragraph(subtitle, styles['DocSubtitle'])],
    ]
    t = Table(data, colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOX', (0, 0), (-1, -1), 0.5, PRIMARY),
    ]))
    return t


def _section(text, styles):
    return Paragraph(f'<font color="#1A3622"><b>{text}</b></font>', styles['SectionTitle'])


def _kv_table(pairs, styles, col_widths=None):
    rows = []
    for label, value in pairs:
        rows.append([
            Paragraph(f'<b>{label}</b>', styles['Body']),
            Paragraph(str(value if value not in (None, '', []) else '-'), styles['Body']),
        ])
    if not rows:
        return Spacer(1, 1)
    if not col_widths:
        col_widths = [60 * mm, 110 * mm]
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), GRAY_BG),
        ('GRID', (0, 0), (-1, -1), 0.3, GRAY_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


def _data_table(headers, rows_data, col_widths=None):
    styles = _styles()
    header_row = [Paragraph(f'<b>{h}</b>', styles['Small']) for h in headers]
    data = [header_row]
    for row in rows_data:
        data.append([Paragraph(str(c if c not in (None, '') else '-'), styles['Small']) for c in row])
    if len(data) == 1:
        data.append([Paragraph('-', styles['Small'])] * len(headers))
    t = Table(data, colWidths=col_widths, repeatRows=1)
    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.3, GRAY_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]
    for i in range(2, len(data), 2):
        cmds.append(('BACKGROUND', (0, i), (-1, i), GRAY_BG))
    t.setStyle(TableStyle(cmds))
    return t


def _val(d, *keys, default='-'):
    """Safely get nested dict value"""
    obj = d
    for k in keys:
        if isinstance(obj, dict):
            obj = obj.get(k)
        else:
            return default
    return obj if obj not in (None, '', []) else default


def _select_label(val, mapping):
    return mapping.get(val, val or '-')


# ============= PDF ENDPOINT =============

@router.get("/{pdc_id}")
async def generate_pdc_v2_pdf(pdc_id: str, current_user: dict = Depends(get_current_user)):
    """Generer le PDF officiel du PDC v2 (8 fiches)"""
    if not ObjectId.is_valid(pdc_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    pdc = await db.pdc_v2.find_one({"_id": ObjectId(pdc_id)})
    if not pdc:
        raise HTTPException(status_code=404, detail="PDC introuvable")

    styles = _styles()
    buffer = io.BytesIO()

    def _page_template(canvas, doc):
        """Header + footer on every page"""
        canvas.saveState()
        # Header line
        canvas.setStrokeColor(PRIMARY)
        canvas.setLineWidth(0.5)
        canvas.line(12 * mm, A4[1] - 10 * mm, A4[0] - 12 * mm, A4[1] - 10 * mm)
        canvas.setFont('Helvetica-Bold', 7)
        canvas.setFillColor(PRIMARY)
        canvas.drawString(12 * mm, A4[1] - 9 * mm, 'GreenLink Agritech')
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(A4[0] - 12 * mm, A4[1] - 9 * mm, 'Plan de Developpement de la Cacaoyere')
        # Footer
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(12 * mm, 8 * mm, f'GreenLink Agritech - PDC v2 - {datetime.now(timezone.utc).strftime("%d/%m/%Y")}')
        canvas.drawRightString(A4[0] - 12 * mm, 8 * mm, f'Page {doc.page}')
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=14 * mm, bottomMargin=14 * mm,
        leftMargin=12 * mm, rightMargin=12 * mm,
    )
    story = []

    step1 = pdc.get("step1", {})
    step2 = pdc.get("step2", {})
    step3 = pdc.get("step3", {})
    f1 = step1.get("fiche1", {})
    f2 = step1.get("fiche2", {})
    f3 = step1.get("fiche3", {})
    f4 = step1.get("fiche4", {})
    f5 = step2.get("fiche5", {})
    f6 = step3.get("fiche6", {})
    f7 = step3.get("fiche7", {})
    f8 = step3.get("fiche8", {})

    prod = f1.get("producteur", {})
    enq = f1.get("enqueteur", {})
    farmer_name = pdc.get("farmer_name", f"{prod.get('nom', '')}".strip()) or "Planteur"
    statut = pdc.get("statut", "brouillon")
    is_valid = statut == "valide"

    # === PAGE DE COUVERTURE — PDC DU PLANTEUR ===
    story.append(Spacer(1, 30 * mm))
    story.append(_header_banner(
        'PLAN DE DEVELOPPEMENT<br/>DE LA CACAOYERE (PDC)',
        'CERTIFICATION DU CACAO IVOIRIEN SELON LA NORME AFRICAINE<br/>ARS 1000 POUR LE CACAO DURABLE',
        styles,
    ))
    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph(f'<b>Producteur :</b> {farmer_name}', styles['SectionTitle']))
    story.append(Paragraph(f"Village : {_val(prod, 'village')} | Departement : {_val(prod, 'departement')}", styles['Body']))
    story.append(Paragraph(f"Code national : {_val(prod, 'code_national')}", styles['Body']))
    story.append(Spacer(1, 10 * mm))

    status_label = 'VALIDE' if is_valid else statut.upper().replace('_', ' ')
    status_color = '#1A3622' if is_valid else '#92400E'
    story.append(Paragraph(f'<font color="{status_color}" size="16"><b>{status_label}</b></font>', styles['CenterText']))

    if is_valid and pdc.get("validated_at"):
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph(f'Valide par {pdc.get("validated_by_name", "-")} le {pdc["validated_at"][:10]}', styles['CenterText']))

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(f'Date de creation : {pdc.get("created_at", "-")[:10]}', styles['RightText']))
    story.append(PageBreak())

    # ============================================
    # SECTION 1 : IDENTIFICATION DU PRODUCTEUR
    # ============================================
    story.append(_section('IDENTIFICATION DU PRODUCTEUR', styles))
    story.append(_kv_table([
        ('Nom et prenoms', _val(prod, 'nom')),
        ('Contact (Tel)', _val(prod, 'contact_tel', default=_val(enq, 'contact_tel'))),
        ('Code National du producteur (CCC)', _val(prod, 'code_national')),
        ('Code groupe', _val(prod, 'code_groupe')),
        ('Nom Entite reconnue', _val(prod, 'nom_entite')),
        ('Code Entite reconnue', _val(prod, 'code_entite')),
        ('Delegation Regionale du CCC', _val(prod, 'delegation_regionale')),
        ('Departement', _val(prod, 'departement')),
        ('Sous-Prefecture', _val(prod, 'sous_prefecture')),
        ('Village', _val(prod, 'village')),
        ('Campement', _val(prod, 'campement')),
    ], styles))
    story.append(Spacer(1, 5 * mm))

    # ============================================
    # SECTION 2 : INFORMATION SUR LE MENAGE
    # ============================================
    story.append(_section('INFORMATION SUR LE MENAGE', styles))

    # --- Situation de l'epargne ---
    story.append(Paragraph('<b>Situation de l\'epargne</b>', styles['SubTitle']))
    epargne = f4.get("epargne", [])
    ep_rows = []
    for e in epargne:
        type_label = {'mobile_money': 'Mobile Money', 'microfinance': 'Microfinance', 'banque': 'Banque', 'autre': 'Autres'}.get(e.get('type', ''), e.get('type', '-'))
        ep_rows.append([
            type_label,
            'X' if e.get('a_compte') == 'oui' else '', 'X' if e.get('a_compte') == 'non' else '',
            'X' if e.get('argent_compte') == 'oui' else '', 'X' if e.get('argent_compte') == 'non' else '',
            'X' if e.get('financement') == 'oui' else '', 'X' if e.get('financement') == 'non' else '',
            e.get('montant_financement', '-'),
        ])
    if not ep_rows:
        ep_rows = [['Mobile Money', '', '', '', '', '', '', '-'], ['Microfinance', '', '', '', '', '', '', '-'], ['Banque', '', '', '', '', '', '', '-'], ['Autres', '', '', '', '', '', '', '-']]
    story.append(_data_table(
        ['Epargne', 'Compte Oui', 'Compte Non', 'Argent Oui', 'Argent Non', 'Financ. Oui', 'Financ. Non', 'Montant'],
        ep_rows, col_widths=[24*mm, 16*mm, 16*mm, 16*mm, 16*mm, 16*mm, 16*mm, 22*mm],
    ))
    story.append(Spacer(1, 3 * mm))

    # --- Situation du menage (categories du PDC du planteur) ---
    story.append(Paragraph('<b>Situation du menage</b>', styles['SubTitle']))
    membres = f1.get("membres_menage", [])
    from datetime import datetime as dt
    current_year = dt.utcnow().year

    def _count_menage_cat(cat_filter):
        """Count members and stats for a category"""
        matched = [m for m in membres if cat_filter(m)]
        total = len(matched)
        a_ecole = sum(1 for m in matched if m.get('statut_scolaire') == 'scolarise')
        niv = {'aucun': 0, 'primaire': 0, 'secondaire': 0, 'superieur': 0}
        for m in matched:
            n = (m.get('niveau_instruction') or '').lower()
            if n in niv:
                niv[n] += 1
        plein = sum(1 for m in matched if m.get('statut_plantation') in ('proprietaire', 'mo_permanente'))
        occas = sum(1 for m in matched if m.get('statut_plantation') in ('mo_temporaire', 'occasionnel'))
        return [str(total), str(a_ecole), str(niv['aucun']), str(niv['primaire']), str(niv['secondaire']), str(niv['superieur']), str(plein), str(occas)]

    def _age(m):
        try:
            return current_year - int(m.get('annee_naissance', 0))
        except (ValueError, TypeError):
            return 0

    menage_rows = [
        ['Proprietaire de l\'exploitation'] + _count_menage_cat(lambda m: m.get('statut_famille') == 'chef_menage'),
        ['Gerant ou representant'] + _count_menage_cat(lambda m: m.get('statut_famille') == 'gerant'),
        ['Conjoints'] + _count_menage_cat(lambda m: m.get('statut_famille') == 'conjoint'),
        ['Enfants 0-6 ans'] + _count_menage_cat(lambda m: m.get('statut_famille') == 'enfant' and _age(m) <= 6),
        ['Enfants 6-18 ans'] + _count_menage_cat(lambda m: m.get('statut_famille') == 'enfant' and 6 < _age(m) <= 18),
        ['Enfants +18 ans'] + _count_menage_cat(lambda m: m.get('statut_famille') == 'enfant' and _age(m) > 18),
        ['Manoeuvres'] + _count_menage_cat(lambda m: m.get('statut_famille') in ('manoeuvre', 'autre')),
    ]
    story.append(_data_table(
        ['Membre du menage', 'Nombre', 'A l\'ecole', 'Aucun', 'Primaire', 'Second.', 'Univers.', 'Plein tps', 'Occasion.'],
        menage_rows, col_widths=[35*mm, 14*mm, 14*mm, 14*mm, 14*mm, 14*mm, 14*mm, 16*mm, 16*mm],
    ))
    story.append(Spacer(1, 5 * mm))

    # ============================================
    # SECTION 3 : DESCRIPTION DE L'EXPLOITATION
    # ============================================
    story.append(_section('DESCRIPTION DE L\'EXPLOITATION', styles))

    cultures = f2.get("cultures", [])
    sup_total = sum(float(c.get('superficie_ha', 0) or 0) for c in cultures)
    sup_cacao = sum(float(c.get('superficie_ha', 0) or 0) for c in cultures if 'cacao' in (c.get('libelle', '') or '').lower())
    sup_jachere = sum(float(c.get('superficie_ha', 0) or 0) for c in cultures if 'jach' in (c.get('libelle', '') or '').lower())
    sup_foret = sum(float(c.get('superficie_ha', 0) or 0) for c in cultures if 'foret' in (c.get('libelle', '') or '').lower() or 'forêt' in (c.get('libelle', '') or '').lower())

    story.append(_kv_table([
        ('Superficie totale de l\'exploitation (ha)', f'{sup_total:.2f}'),
        ('Superficie cultivee (ha)', f'{sup_total - sup_jachere - sup_foret:.2f}'),
        ('Superficie de foret (ha)', f'{sup_foret:.2f}'),
        ('Superficie jachere (ha)', f'{sup_jachere:.2f}'),
    ], styles))
    story.append(Spacer(1, 3 * mm))

    # --- Cultures (format PDC du planteur) ---
    story.append(Paragraph('<b>Cultures</b>', styles['SubTitle']))
    cult_rows = []
    production_data = f4.get("production_cacao", [])
    for c in cultures:
        lib = c.get('libelle', '-')
        prod_kg = '-'
        revenu = '-'
        # Match production for cacao
        if 'cacao' in lib.lower() or 'champs' in lib.lower():
            for p in production_data:
                if p.get('production_kg'):
                    prod_kg = p.get('production_kg', '-')
                    revenu = p.get('revenu_brut', '-')
                    break
        cult_rows.append([
            lib, c.get('superficie_ha', '-'), c.get('annee_creation', '-'),
            c.get('origine_materiel', '-'), prod_kg, revenu,
        ])
    if not cult_rows:
        cult_rows = [['Cacao Parcelle 1', '-', '-', '-', '-', '-']]
    story.append(_data_table(
        ['Cultures', 'Superficie (ha)', 'Annee de creation', 'Source materiel vegetal (*)', 'Production (kg)', 'Revenu (FCFA)'],
        cult_rows, col_widths=[30*mm, 22*mm, 22*mm, 30*mm, 25*mm, 25*mm],
    ))
    story.append(Paragraph('(*) 1. SATMACI/ANADER/CNRA  2. Tout venant  3. Pepinieriste prive', styles['Small']))
    story.append(Spacer(1, 3 * mm))

    # --- Situation des arbres ---
    story.append(Paragraph('<b>Situation des arbres forestiers et fruitiers</b>', styles['SubTitle']))
    arbres = f2.get("arbres", [])
    arb_rows = []
    s1_count = s2_count = s3_count = 0
    for a in arbres:
        circ = float(a.get('circonference', 0) or 0)
        if circ >= 200:
            s3_count += 1
        elif circ >= 50:
            s2_count += 1
        else:
            s1_count += 1
        arb_rows.append([
            a.get('numero', '-'), a.get('nom_botanique', '-'), a.get('nom_local', '-'),
            a.get('circonference', '-'), a.get('longitude', '-'), a.get('latitude', '-'),
            'X' if a.get('origine') == 'preserve' else '', 'X' if a.get('origine') == 'plante' else '',
            'X' if a.get('decision') == 'eliminer' else '', 'X' if a.get('decision') == 'maintenir' else '',
        ])
    # Add GPS-tracked trees from carte
    carte_arbres = (f2.get("carte_parcelle") or {}).get("arbres_ombrage", [])
    for i, a in enumerate(carte_arbres):
        arb_rows.append([
            str(len(arbres) + i + 1), a.get('nom', a.get('espece', '-')), '-',
            '-', str(a.get('lng', '-')), str(a.get('lat', '-')),
            '', 'X', '', 'X',
        ])

    story.append(_data_table(
        ['N°', 'Nom botanique', 'Nom local', 'Circonf.', 'Longitude', 'Latitude', 'Preserve', 'Plante', 'A elim.', 'A maint.'],
        arb_rows, col_widths=[10*mm, 22*mm, 18*mm, 14*mm, 18*mm, 18*mm, 14*mm, 14*mm, 14*mm, 14*mm],
    ))
    total_ombrage = len(arbres) + len(carte_arbres)
    story.append(Spacer(1, 2 * mm))
    story.append(_kv_table([
        ('Nombre d\'arbres strate 1', str(s1_count)),
        ('Nombre d\'arbres strate 2', str(s2_count)),
        ('Nombre d\'arbres strate 3', str(s3_count)),
        ('Total arbres d\'ombrage', str(total_ombrage)),
    ], styles, col_widths=[50*mm, 30*mm]))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        '<i>NOTE : Tirer les conclusions sur la conformite ou non de la parcelle vis-a-vis des recommandations sur l\'agroforesterie.</i>',
        styles['Small']
    ))
    story.append(Spacer(1, 3 * mm))

    # --- Materiel agricole ---
    story.append(Paragraph('<b>Materiel agricole et equipements de travail</b>', styles['SubTitle']))
    materiels = f2.get("materiels", [])
    mat_rows = []
    for m in materiels:
        type_label = {'traitement': 'Mat. traitement', 'transport': 'Mat. transport', 'deplacement': 'Moy. deplacement', 'sechage': 'Mat. sechage', 'fermentation': 'Mat. fermentation', 'outillage': 'Petit outillage', 'autre': 'Autres'}.get(m.get('type', ''), m.get('type', '-'))
        mat_rows.append([
            type_label, m.get('designation', '-'), m.get('quantite', '-'),
            m.get('annee_acquisition', '-'), m.get('cout', '-'),
            m.get('etat_bon', '-'), m.get('etat_acceptable', '-'), m.get('etat_mauvais', '-'),
        ])
    story.append(_data_table(
        ['Type', 'Designation', 'Qte', 'Annee acq.', 'Cout', 'Bon', 'Accept.', 'Mauvais'],
        mat_rows, col_widths=[22*mm, 28*mm, 12*mm, 18*mm, 18*mm, 12*mm, 14*mm, 14*mm],
    ))
    story.append(PageBreak())

    # === FICHE 6 : MATRICE DE PLANIFICATION STRATEGIQUE ===
    story.append(_section('FICHE 6 : MATRICE DE PLANIFICATION STRATEGIQUE', styles))
    axes = f6.get("axes", [])
    ax_rows = []
    for a in axes:
        period = ' '.join([f'A{i}' for i in range(1, 6) if a.get(f'a{i}') == 'x'])
        ax_rows.append([
            a.get('axe', '-'), a.get('objectifs', '-'), a.get('activites', '-'),
            a.get('cout', '-'), period or '-', a.get('responsable', '-'), a.get('partenaires', '-'),
        ])
    story.append(_data_table(
        ['Axes strategiques', 'Objectifs', 'Activites', 'Cout', 'Periode', 'Responsable', 'Partenaires'],
        ax_rows, col_widths=[25*mm, 25*mm, 25*mm, 20*mm, 18*mm, 22*mm, 22*mm],
    ))
    story.append(Spacer(1, 5 * mm))

    # === FICHE 7 : MATRICE DU PROGRAMME ANNUEL D'ACTION ===
    story.append(_section('FICHE 7 : MATRICE DU PROGRAMME ANNUEL D\'ACTION', styles))
    actions = f7.get("actions", [])
    act_rows = []
    for a in actions:
        chrono = ' '.join([f'T{i}' for i in range(1, 5) if a.get(f't{i}') == 'x'])
        act_rows.append([
            a.get('axe', '-'), a.get('activites', '-'), a.get('sous_activites', '-'),
            a.get('indicateurs', '-'), chrono or '-',
            a.get('execution', '-'), a.get('appui', '-'), a.get('cout', '-'),
        ])
    story.append(_data_table(
        ['Axes strategiques', 'ACTIVITES', 'SOUS-ACTIVITES', 'INDICATEURS', 'CHRONOGRAMME', 'Execution', 'Appui', 'COUT'],
        act_rows, col_widths=[22*mm, 22*mm, 22*mm, 20*mm, 18*mm, 18*mm, 18*mm, 18*mm],
    ))
    story.append(Spacer(1, 5 * mm))

    # === FICHE 8 ===
    story.append(_section('FICHE 8 : TABLEAU DE DETERMINATION DES MOYENS ET DES COUTS', styles))
    moyens = f8.get("moyens", [])
    my_rows = []
    for m in moyens:
        my_rows.append([
            m.get('moyen', '-'), m.get('unite', '-'),
            m.get('a1_qte', '-'), m.get('a1_cout', '-'),
            m.get('a2_qte', '-'), m.get('a2_cout', '-'),
            m.get('a3_qte', '-'), m.get('a3_cout', '-'),
            m.get('a4_qte', '-'), m.get('a4_cout', '-'),
            m.get('a5_qte', '-'), m.get('a5_cout', '-'),
        ])
    story.append(_data_table(
        ['Moyens specifiques', 'Unites', 'An.1 Qte', 'An.1 Cout', 'An.2 Qte', 'An.2 Cout', 'An.3 Qte', 'An.3 Cout', 'An.4 Qte', 'An.4 Cout', 'An.5 Qte', 'An.5 Cout'],
        my_rows, col_widths=[22*mm, 14*mm, 12*mm, 14*mm, 12*mm, 14*mm, 12*mm, 14*mm, 12*mm, 14*mm, 12*mm, 14*mm],
    ))
    story.append(PageBreak())

    # === PAGE SIGNATURES — PRODUCTEUR / COOPERATIVE / CABINET ===
    story.append(_section('VALIDATION ET SIGNATURES', styles))
    story.append(Spacer(1, 10 * mm))
    sig_data = [
        ['', 'SIGNATURE DU\nPRODUCTEUR', 'SIGNATURE ET CACHET\nDE LA COOPERATIVE', 'SIGNATURE ET CACHET\nDU CABINET DE FORMATION'],
        ['Nom', farmer_name, pdc.get('validated_by_name', ''), ''],
        ['Date', '', pdc.get('validated_at', '')[:10] if pdc.get('validated_at') else '', ''],
        ['Signature\n\n\n\n', '', '', ''],
    ]
    sig_t = Table(sig_data, colWidths=[22*mm, 45*mm, 48*mm, 48*mm])
    sig_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('BACKGROUND', (0, 1), (0, -1), GRAY_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('ROWHEIGHT', (0, 3), (-1, 3), 35 * mm),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(sig_t)
    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph('Document genere par GreenLink Agritech | Certification ARS 1000 - Cacao Durable Cote d\'Ivoire', styles['Footer']))

    # Build
    doc.build(story, onFirstPage=_page_template, onLaterPages=_page_template)
    buffer.seek(0)
    filename = f"PDC_{farmer_name.replace(' ', '_')}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

