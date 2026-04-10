"""
PDC v2 - Generateur PDF officiel
GreenLink Agritech - Cote d'Ivoire

PDF officiel du Plan de Developpement de la Cacaoyere (8 fiches / 3 annexes)
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
import io, logging

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

    # === PAGE COUVERTURE ===
    story.append(Spacer(1, 25 * mm))
    story.append(_header_banner(
        'PLAN DE DEVELOPPEMENT<br/>DE LA CACAOYERE (PDC)',
        'Diagnostic et Planification | Cacao Durable Cote d\'Ivoire',
        styles,
    ))
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph(f'<b>Producteur :</b> {farmer_name}', styles['SectionTitle']))
    story.append(Paragraph(f"Village : {_val(prod, 'village')} | Departement : {_val(prod, 'departement')}", styles['Body']))
    story.append(Paragraph(f"Cooperative : {_val(prod, 'code_cooperative')} | Code national : {_val(prod, 'code_national')}", styles['Body']))
    story.append(Spacer(1, 10 * mm))

    status_label = 'VALIDE PAR L\'AGRONOME' if is_valid else statut.upper().replace('_', ' ')
    status_color = '#1A3622' if is_valid else '#92400E'
    story.append(Paragraph(f'<font color="{status_color}" size="16"><b>Statut : {status_label}</b></font>', styles['CenterText']))

    if is_valid and pdc.get("validated_at"):
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph(f'Valide par {pdc.get("validated_by_name", "-")} le {pdc["validated_at"][:10]}', styles['CenterText']))

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(f'Date de creation : {pdc.get("created_at", "-")[:10]}', styles['RightText']))
    story.append(Paragraph(f'Derniere mise a jour : {pdc.get("updated_at", "-")[:10]}', styles['RightText']))
    story.append(PageBreak())

    # === ANNEXE 1 - COLLECTE DE DONNEES ===
    story.append(Paragraph('<font color="#1A3622" size="14"><b>ANNEXE 1 : OUTILS DE COLLECTE DES DONNEES</b></font>', styles['CenterText']))
    story.append(Spacer(1, 5 * mm))

    # --- FICHE 1 ---
    story.append(_section('FICHE 1 : Profil du producteur et du menage', styles))
    story.append(Paragraph('<b>Enqueteur</b>', styles['SubTitle']))
    story.append(_kv_table([
        ('Date', _val(enq, 'date')),
        ('Nom', _val(enq, 'nom')),
        ('Qualification', _val(enq, 'qualification')),
        ('Contact', _val(enq, 'contact_tel')),
    ], styles))
    story.append(Spacer(1, 3 * mm))

    story.append(Paragraph('<b>Identification du producteur</b>', styles['SubTitle']))
    story.append(_kv_table([
        ('Nom et prenoms', _val(prod, 'nom')),
        ('Code National', _val(prod, 'code_national')),
        ('Entite Reconnue', _val(prod, 'entite_reconnue')),
        ('Code groupe', _val(prod, 'code_groupe')),
        ('Delegation Regionale', _val(prod, 'delegation_regionale')),
        ('Code cooperative', _val(prod, 'code_cooperative')),
        ('Departement', _val(prod, 'departement')),
        ('Sous-Prefecture', _val(prod, 'sous_prefecture')),
        ('Village', _val(prod, 'village')),
        ('Campement', _val(prod, 'campement')),
    ], styles))
    story.append(Spacer(1, 3 * mm))

    # Membres du menage
    membres = f1.get("membres_menage", [])
    story.append(Paragraph('<b>Membres du menage</b>', styles['SubTitle']))
    famille_map = {'chef_menage': 'Chef menage', 'conjoint': 'Conjoint', 'enfant': 'Enfant', 'autre': 'Autre'}
    plantation_map = {'aucun': 'Aucun', 'proprietaire': 'Proprietaire', 'gerant': 'Gerant', 'mo_permanent': 'MO perm.', 'mo_temporaire': 'MO temp.'}
    m_headers = ['Nom', 'Famille', 'Plantation', 'Scolaire', 'Contact', 'Naissance', 'Sexe', 'Instruction']
    m_rows = []
    for m in membres:
        m_rows.append([
            m.get('nom_prenoms', '-'),
            _select_label(m.get('statut_famille'), famille_map),
            _select_label(m.get('statut_plantation'), plantation_map),
            m.get('statut_scolaire', '-'),
            m.get('contact', '-'),
            m.get('annee_naissance', '-'),
            m.get('sexe', '-'),
            m.get('niveau_instruction', '-'),
        ])
    story.append(_data_table(m_headers, m_rows, col_widths=[30*mm, 20*mm, 20*mm, 16*mm, 22*mm, 16*mm, 10*mm, 20*mm]))
    story.append(PageBreak())

    # --- FICHE 2 ---
    story.append(_section('FICHE 2 : Profil de l\'exploitation', styles))
    gps = f2.get("coordonnees_gps", {})
    story.append(Paragraph('<b>Coordonnees geographiques</b>', styles['SubTitle']))
    story.append(_kv_table([
        ('Waypoint O', _val(gps, 'waypoint_o')),
        ('N', _val(gps, 'n')),
        ('Sous-prefecture', _val(gps, 'sous_prefecture')),
        ('Village', _val(gps, 'village')),
        ('Campement', _val(gps, 'campement')),
    ], styles))
    story.append(Spacer(1, 3 * mm))

    # Carte de la parcelle (snapshot)
    carte = f2.get("carte_parcelle", {})
    map_snapshot = carte.get("map_snapshot")
    polygon_pts = carte.get("polygon", [])
    arbres_carte = carte.get("arbres_ombrage", [])

    story.append(Paragraph('<b>Croquis / Polygone de la parcelle avec arbres d\'ombrage</b>', styles['SubTitle']))
    if map_snapshot and isinstance(map_snapshot, str) and map_snapshot.startswith('data:image'):
        try:
            b64_data = map_snapshot.split(',', 1)[1]
            img_bytes = base64.b64decode(b64_data)
            img_buffer = io.BytesIO(img_bytes)
            img = Image(img_buffer, width=170 * mm, height=100 * mm)
            img.hAlign = 'CENTER'
            story.append(img)
            story.append(Spacer(1, 2 * mm))
            # Legend
            legend_items = []
            if len(polygon_pts) > 0:
                legend_items.append(f"Polygone parcelle: {len(polygon_pts)} sommets")
            if len(arbres_carte) > 0:
                legend_items.append(f"Arbres d'ombrage: {len(arbres_carte)}")
            if legend_items:
                legend_text = ' | '.join(legend_items)
                story.append(Paragraph(
                    f'<font color="#6B7280"><i>Legende: polygone bleu = limites parcelle, pins jaunes = arbres d\'ombrage | {legend_text}</i></font>',
                    styles['Small']
                ))
        except Exception as e:
            logger.warning(f"Erreur insertion carte PDF: {e}")
            story.append(Paragraph('<i>Carte non disponible (erreur de traitement de l\'image)</i>', styles['Body']))
    else:
        story.append(Paragraph('<i>Carte non disponible - Utilisez l\'interface web pour capturer la carte</i>', styles['Body']))

    # Tree waypoints table in PDF
    if len(arbres_carte) > 0:
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph('<b>Liste des arbres d\'ombrage</b>', styles['SubTitle']))
        tree_rows = [[str(a.get('numero', i+1)), f"{a.get('lat', 0):.5f}", f"{a.get('lng', 0):.5f}", a.get('nom', '-')] for i, a in enumerate(arbres_carte)]
        story.append(_data_table(
            ['N', 'Latitude', 'Longitude', 'Nom/Espece'],
            tree_rows, col_widths=[15*mm, 40*mm, 40*mm, 50*mm],
        ))

    story.append(Spacer(1, 3 * mm))

    # Cultures
    cultures = f2.get("cultures", [])
    story.append(Paragraph('<b>Donnees sur les cultures</b>', styles['SubTitle']))
    c_rows = [[c.get('libelle', '-'), c.get('annee_creation', '-'), c.get('precedent_cultural', '-'),
                c.get('superficie_ha', '-'), c.get('origine_materiel', '-'), c.get('en_production', '-')]
               for c in cultures]
    story.append(_data_table(
        ['Libelle', 'Annee creation', 'Precedent cultural', 'Sup. (ha)', 'Origine materiel', 'Production'],
        c_rows, col_widths=[28*mm, 22*mm, 28*mm, 18*mm, 32*mm, 18*mm],
    ))
    story.append(Spacer(1, 3 * mm))

    # Materiels
    materiels = f2.get("materiels", [])
    story.append(Paragraph('<b>Materiels agricoles</b>', styles['SubTitle']))
    mat_rows = [[m.get('type', '-'), m.get('designation', '-'), m.get('quantite', '-'),
                  m.get('annee_acquisition', '-'), m.get('cout', '-'),
                  m.get('etat_bon', '-'), m.get('etat_acceptable', '-'), m.get('etat_mauvais', '-')]
                 for m in materiels]
    story.append(_data_table(
        ['Type', 'Designation', 'Qte', 'Annee', 'Cout', 'Bon', 'Accept.', 'Mauvais'],
        mat_rows, col_widths=[25*mm, 28*mm, 13*mm, 15*mm, 20*mm, 13*mm, 16*mm, 16*mm],
    ))
    story.append(Spacer(1, 3 * mm))

    # Arbres
    arbres = f2.get("arbres", [])
    story.append(Paragraph('<b>Arbres forestiers et fruitiers</b>', styles['SubTitle']))
    a_rows = [[a.get('numero', '-'), a.get('nom_botanique', '-'), a.get('nom_local', '-'),
                a.get('circonference', '-'), a.get('longitude', '-'), a.get('latitude', '-'),
                a.get('origine', '-'), a.get('decision', '-')]
               for a in arbres]
    story.append(_data_table(
        ['N', 'Nom botanique', 'Nom local', 'Circonf.', 'Long.', 'Lat.', 'Origine', 'Decision'],
        a_rows, col_widths=[10*mm, 28*mm, 24*mm, 16*mm, 20*mm, 20*mm, 16*mm, 18*mm],
    ))
    story.append(PageBreak())

    # --- FICHE 3 ---
    story.append(_section('FICHE 3 : Informations sur la cacaoyere', styles))
    etat = f3.get("etat_cacaoyere", {})
    disp_map = {'en_lignes': 'En lignes', 'en_desordre': 'En desordre'}
    ombrage_map = {'inexistant': 'Inexistant', 'moyen': 'Moyen', 'dense': 'Dense'}
    canopee_map = {'normal': 'Normal', 'peu_degrade': 'Peu degrade', 'degrade': 'Degrade'}

    story.append(Paragraph('<b>Etat de la cacaoyere</b>', styles['SubTitle']))
    story.append(_kv_table([
        ('Dispositif de plantation', _select_label(etat.get('dispositif_plantation'), disp_map)),
        ('Densite des arbres', _val(etat, 'densite_arbres')),
        ('Nb moyen tiges/cacaoyer', _val(etat, 'nb_tiges')),
        ('Plages vides', _val(etat, 'plages_vides')),
        ('Etendue plages vides', _val(etat, 'etendue_plages_vides')),
        ('Ombrage', _select_label(etat.get('ombrage'), ombrage_map)),
        ('Canopee', _select_label(etat.get('canopee'), canopee_map)),
    ], styles))
    story.append(Spacer(1, 3 * mm))

    # Maladies
    maladies = f3.get("maladies", [])
    sev_map = {'1': 'Aucun', '2': 'Faible', '3': 'Moyen', '4': 'Fort'}
    story.append(Paragraph('<b>Maladies et ravageurs</b>', styles['SubTitle']))
    mal_rows = [[m.get('type', '-'), _select_label(m.get('severite'), sev_map), m.get('observations', '-')] for m in maladies]
    story.append(_data_table(['Maladie/Ravageur', 'Severite', 'Observations'], mal_rows, col_widths=[55*mm, 25*mm, 75*mm]))
    story.append(Spacer(1, 3 * mm))

    # Etat du sol
    sol = f3.get("etat_sol", {})
    pos_map = {'haut_pente': 'Haut de pente', 'mi_versant': 'Mi versant', 'bas_pente': 'Bas de pente'}
    couvert_map = {'faible': 'Faible', 'moyen': 'Moyen', 'beaucoup': 'Beaucoup'}
    story.append(Paragraph('<b>Etat du sol</b>', styles['SubTitle']))
    story.append(_kv_table([
        ('Position parcelle', _select_label(sol.get('position'), pos_map)),
        ('Couvert vegetal', _select_label(sol.get('couvert_vegetal'), couvert_map)),
        ('Matiere organique', _select_label(sol.get('matiere_organique'), couvert_map)),
        ('Zones erodees', _val(sol, 'zones_erodees')),
        ('Zones a risque erosion', _val(sol, 'zones_risque_erosion')),
        ('Observations', _val(sol, 'observations')),
    ], styles))
    story.append(Spacer(1, 3 * mm))

    # Recolte et post-recolte
    rpr = f3.get("recolte_post_recolte", {})
    ferm_map = {'bache_plastique': 'Bache plastique', 'feuilles_bananier': 'Feuilles bananier', 'bac_fermentation': 'Bac fermentation', 'autre': 'Autre'}
    sech_map = {'goudron': 'Sur goudron', 'aire_cimentee': 'Aire cimentee', 'bache_plastique': 'Bache a terre', 'claie': 'Sur claie', 'autre': 'Autre'}
    story.append(Paragraph('<b>Pratiques de recolte et post-recolte</b>', styles['SubTitle']))
    story.append(_kv_table([
        ('Frequence recoltes (jours)', _val(rpr, 'frequence_recolte_jours')),
        ('Temps recolte-ecabossage (jours)', _val(rpr, 'temps_ecabossage_jours')),
        ('Duree fermentation (jours)', _val(rpr, 'duree_fermentation_jours')),
        ('Mode fermentation', _select_label(rpr.get('mode_fermentation'), ferm_map)),
        ('Methode sechage', _select_label(rpr.get('methode_sechage'), sech_map)),
    ], styles))
    story.append(Spacer(1, 3 * mm))

    # Engrais
    engrais = f3.get("engrais", [])
    story.append(Paragraph('<b>Application des engrais</b>', styles['SubTitle']))
    eng_rows = [[e.get('type_engrais', '-'), e.get('nom_commercial', '-'), e.get('quantite_an', '-'),
                  e.get('periode_apport', '-'), e.get('mode_apport', '-'), e.get('applicateur', '-')]
                 for e in engrais]
    story.append(_data_table(['Type', 'Nom commercial', 'Qte/an', 'Periode', 'Mode', 'Applicateur'],
                             eng_rows, col_widths=[25*mm, 30*mm, 18*mm, 25*mm, 22*mm, 22*mm]))
    story.append(Spacer(1, 3 * mm))

    # Phytosanitaires
    phyto = f3.get("phytosanitaires", [])
    story.append(Paragraph('<b>Produits phytosanitaires</b>', styles['SubTitle']))
    ph_rows = [[p.get('type_produit', '-'), p.get('nom_commercial', '-'), p.get('quantite_traitement', '-'),
                 p.get('periode_traitement', '-'), p.get('mode_apport', '-'), p.get('applicateur', '-')]
                for p in phyto]
    story.append(_data_table(['Type', 'Nom commercial', 'Qte/trait.', 'Periode', 'Mode', 'Applicateur'],
                             ph_rows, col_widths=[25*mm, 30*mm, 18*mm, 25*mm, 22*mm, 22*mm]))
    story.append(Spacer(1, 2 * mm))

    # Gestion emballages
    emb = f3.get("gestion_emballages", "")
    if emb:
        story.append(Paragraph(f'<b>Gestion des emballages :</b> {emb}', styles['Body']))
    story.append(PageBreak())

    # --- FICHE 4 ---
    story.append(_section('FICHE 4 : Profil socio-economique du producteur', styles))

    # Epargne
    epargne = f4.get("epargne", [])
    story.append(Paragraph('<b>Compte d\'epargne et financement</b>', styles['SubTitle']))
    ep_rows = [[e.get('type', '-'), e.get('a_compte', '-'), e.get('argent_compte', '-'),
                 e.get('financement', '-'), e.get('montant_financement', '-')]
                for e in epargne]
    story.append(_data_table(['Type', 'Compte?', 'Argent?', 'Financement?', 'Montant (FCFA)'],
                             ep_rows, col_widths=[30*mm, 25*mm, 25*mm, 28*mm, 30*mm]))
    story.append(Spacer(1, 3 * mm))

    # Production cacao
    prod_cacao = f4.get("production_cacao", [])
    story.append(Paragraph('<b>Production de cacao (3 dernieres annees)</b>', styles['SubTitle']))
    pc_rows = [[p.get('annee', '-'), p.get('production_kg', '-'), p.get('revenu_brut', '-')] for p in prod_cacao]
    story.append(_data_table(['Annee', 'Production (kg)', 'Revenu brut (FCFA)'],
                             pc_rows, col_widths=[40*mm, 50*mm, 55*mm]))
    story.append(Spacer(1, 3 * mm))

    # Autres revenus
    autres_rev = f4.get("autres_revenus", [])
    story.append(Paragraph('<b>Sources de revenus autres que le cacao</b>', styles['SubTitle']))
    ar_rows = [[a.get('activite', '-'), a.get('production_moyenne', '-'), a.get('revenu_brut_moyen', '-')]
               for a in autres_rev]
    story.append(_data_table(['Activite', 'Production moyenne/an', 'Revenu brut moyen/an (FCFA)'],
                             ar_rows, col_widths=[50*mm, 50*mm, 50*mm]))
    story.append(Spacer(1, 3 * mm))

    # Depenses
    depenses = f4.get("depenses", [])
    story.append(Paragraph('<b>Depenses courantes du foyer</b>', styles['SubTitle']))
    dep_rows = [[d.get('depense', '-'), d.get('periodicite', '-'), d.get('montant_moyen_an', '-')]
                for d in depenses]
    story.append(_data_table(['Depense', 'Periodicite', 'Montant moyen/an (FCFA)'],
                             dep_rows, col_widths=[55*mm, 40*mm, 50*mm]))
    story.append(Spacer(1, 3 * mm))

    # Main d'oeuvre
    mo = f4.get("main_oeuvre", [])
    story.append(Paragraph('<b>Cout de la main d\'oeuvre</b>', styles['SubTitle']))
    mo_rows = [[m.get('travailleur', '-'), m.get('statut_mo', '-'), m.get('sexe', '-'),
                 m.get('cout_annuel', '-'), m.get('temps_travail_jours', '-')]
                for m in mo]
    story.append(_data_table(['Travailleur', 'Statut MO', 'Sexe', 'Cout annuel (FCFA)', 'Jours travail'],
                             mo_rows, col_widths=[32*mm, 32*mm, 15*mm, 35*mm, 30*mm]))
    story.append(PageBreak())

    # === ANNEXE 2 - ANALYSE DES DONNEES ===
    story.append(Paragraph('<font color="#1A3622" size="14"><b>ANNEXE 2 : OUTIL D\'ANALYSE DES DONNEES</b></font>', styles['CenterText']))
    story.append(Spacer(1, 5 * mm))

    # --- FICHE 5 ---
    story.append(_section('FICHE 5 : Analyse des problemes', styles))
    analyses = f5.get("analyses", [])
    an_rows = [[a.get('theme', '-'), a.get('problemes', '-'), a.get('causes', '-'),
                 a.get('consequences', '-'), a.get('solutions', '-')]
                for a in analyses]
    story.append(_data_table(
        ['Theme d\'analyse', 'Problemes/Contraintes', 'Causes', 'Consequences', 'Solutions'],
        an_rows, col_widths=[35*mm, 35*mm, 30*mm, 30*mm, 30*mm],
    ))
    story.append(PageBreak())

    # === ANNEXE 3 - PLANIFICATION ===
    story.append(Paragraph('<font color="#1A3622" size="14"><b>ANNEXE 3 : OUTILS DE PLANIFICATION DU PDC</b></font>', styles['CenterText']))
    story.append(Spacer(1, 5 * mm))

    # --- FICHE 6 ---
    story.append(_section('FICHE 6 : Matrice de planification strategique', styles))
    axes = f6.get("axes", [])
    ax_rows = []
    for a in axes:
        period = ' '.join([f'A{i}' for i in range(1, 6) if a.get(f'a{i}') == 'x'])
        ax_rows.append([
            a.get('axe', '-'), a.get('objectifs', '-'), a.get('activites', '-'),
            a.get('cout', '-'), period or '-', a.get('responsable', '-'), a.get('partenaires', '-'),
        ])
    story.append(_data_table(
        ['Axe strategique', 'Objectifs', 'Activites', 'Cout (FCFA)', 'Periode', 'Responsable', 'Partenaires'],
        ax_rows, col_widths=[25*mm, 25*mm, 25*mm, 20*mm, 18*mm, 22*mm, 22*mm],
    ))
    story.append(Spacer(1, 5 * mm))

    # --- FICHE 7 ---
    story.append(_section('FICHE 7 : Programme annuel d\'action', styles))
    actions = f7.get("actions", [])
    act_rows = []
    for a in actions:
        chrono = ' '.join([f'T{i}' for i in range(1, 5) if a.get(f't{i}') == 'x'])
        act_rows.append([
            a.get('axe', '-'), a.get('activites', '-'), a.get('indicateurs', '-'),
            chrono or '-', a.get('responsable', '-'), a.get('cout', '-'),
        ])
    story.append(_data_table(
        ['Axe', 'Activites', 'Indicateurs', 'Chrono.', 'Responsable', 'Cout (FCFA)'],
        act_rows, col_widths=[25*mm, 35*mm, 30*mm, 18*mm, 25*mm, 22*mm],
    ))
    story.append(Spacer(1, 5 * mm))

    # --- FICHE 8 ---
    story.append(_section('FICHE 8 : Moyens et couts sur 5 ans', styles))
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
        ['Moyen', 'Unite', 'A1 Qte', 'A1 Cout', 'A2 Qte', 'A2 Cout', 'A3 Qte', 'A3 Cout', 'A4 Qte', 'A4 Cout', 'A5 Qte', 'A5 Cout'],
        my_rows, col_widths=[22*mm, 14*mm, 12*mm, 14*mm, 12*mm, 14*mm, 12*mm, 14*mm, 12*mm, 14*mm, 12*mm, 14*mm],
    ))
    story.append(PageBreak())

    # === PAGE SIGNATURES ===
    story.append(_section('VALIDATION ET SIGNATURES', styles))
    story.append(Spacer(1, 8 * mm))

    sig_data = [
        ['', 'Agent Terrain', 'Agronome (Cooperative)', 'Planteur'],
        ['Nom', _val(enq, 'nom'), pdc.get('validated_by_name', '-'), farmer_name],
        ['Date', _val(enq, 'date'), pdc.get('validated_at', '-')[:10] if pdc.get('validated_at') else '-', '-'],
        ['Signature', '', '', ''],
    ]
    sig_t = Table(sig_data, colWidths=[30*mm, 45*mm, 50*mm, 40*mm])
    sig_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('BACKGROUND', (0, 1), (0, -1), GRAY_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('ROWHEIGHT', (0, 3), (-1, 3), 30 * mm),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(sig_t)
    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph('Document genere par GreenLink Agritech | Plateforme de certification cacao durable', styles['Footer']))

    # Build
    doc.build(story, onFirstPage=_page_template, onLaterPages=_page_template)
    buffer.seek(0)
    filename = f"PDC_{farmer_name.replace(' ', '_')}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
