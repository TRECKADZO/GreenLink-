# Export PDF des cartes producteurs avec QR codes et photos
# Génère des cartes d'identification professionnelles en lot

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime
from io import BytesIO
from bson import ObjectId
import logging
import base64
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import RadialGradiantColorMask
import json

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.barcode.qr import QrCodeWidget
from PIL import Image as PILImage

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/farmer-cards", tags=["Farmer Cards PDF"])


async def get_admin_or_coop_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin', 'cooperative']:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs ou coopératives")
    return current_user


def create_qr_code_image(data: str, size: int = 150) -> BytesIO:
    """Créer une image QR code"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=8,
        border=1,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(
        image_factory=StyledPilImage,
        color_mask=RadialGradiantColorMask(
            center_color=(16, 185, 129),
            edge_color=(13, 148, 103)
        )
    )
    img = img.resize((size, size))
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def create_farmer_qr_data(farmer_id: str, farmer_name: str = None, coop_id: str = None) -> str:
    """Créer les données QR pour un producteur"""
    data = {"id": farmer_id, "type": "farmer", "app": "greenlink"}
    if farmer_name:
        data["name"] = farmer_name
    if coop_id:
        data["coop"] = coop_id
    
    json_str = json.dumps(data)
    encoded = base64.urlsafe_b64encode(json_str.encode()).decode()
    return f"GREENLINK_FARMER:{encoded}"


def get_styles():
    """Styles pour le PDF"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1e293b'),
        alignment=1
    ))
    
    styles.add(ParagraphStyle(
        'CardInfo',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#475569'),
        alignment=1
    ))
    
    styles.add(ParagraphStyle(
        'CardSmall',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.HexColor('#94a3b8'),
        alignment=1
    ))
    
    styles.add(ParagraphStyle(
        'HeaderTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0f766e'),
        alignment=1
    ))
    
    return styles


def create_farmer_card(farmer: dict, coop_name: str, styles, card_width: float = 8*cm, card_height: float = 5*cm) -> Table:
    """Créer une carte producteur individuelle"""
    
    farmer_id = str(farmer.get('_id', ''))
    farmer_name = farmer.get('full_name') or farmer.get('name') or 'Producteur'
    village = farmer.get('village') or 'Non renseigné'
    phone = farmer.get('phone_number') or ''
    photo_url = farmer.get('photo_url') or farmer.get('profile_photo')
    
    # Générer QR code
    qr_data = create_farmer_qr_data(farmer_id, farmer_name, farmer.get('cooperative_id'))
    qr_buffer = create_qr_code_image(qr_data, size=100)
    qr_image = Image(qr_buffer, width=2.2*cm, height=2.2*cm)
    
    # Photo placeholder ou image réelle
    if photo_url and photo_url.startswith('data:image'):
        try:
            # Décoder base64
            header, encoded = photo_url.split(',', 1)
            photo_data = base64.b64decode(encoded)
            photo_buffer = BytesIO(photo_data)
            photo_image = Image(photo_buffer, width=1.8*cm, height=2.2*cm)
        except:
            photo_image = Paragraph('<font color="#94a3b8">📷</font>', styles['CardTitle'])
    else:
        # Placeholder avec initiales
        initials = ''.join([n[0].upper() for n in farmer_name.split()[:2]]) if farmer_name else '?'
        photo_image = Paragraph(f'<font size="14" color="#0f766e"><b>{initials}</b></font>', styles['CardTitle'])
    
    # Construire le contenu de la carte
    # En-tête avec logo
    header_text = Paragraph('<font color="#0f766e" size="10"><b>🌱 GreenLink</b></font>', styles['CardInfo'])
    
    # Nom du producteur
    name_text = Paragraph(f'<font size="10"><b>{farmer_name}</b></font>', styles['CardTitle'])
    
    # Infos
    village_text = Paragraph(f'<font size="8">{village}</font>', styles['CardInfo'])
    coop_text = Paragraph(f'<font size="7" color="#0f766e">{coop_name}</font>', styles['CardSmall'])
    phone_text = Paragraph(f'<font size="7">{phone}</font>', styles['CardSmall'])
    id_text = Paragraph(f'<font size="6" color="#94a3b8">ID: {farmer_id[-8:]}</font>', styles['CardSmall'])
    
    # Footer
    footer_text = Paragraph('<font size="5" color="#94a3b8">Scannez avec GreenLink App</font>', styles['CardSmall'])
    
    # Layout de la carte
    # [Photo/Initiales] [Infos] [QR Code]
    info_table = Table([
        [name_text],
        [village_text],
        [coop_text],
        [phone_text],
        [id_text],
    ], colWidths=[3.5*cm])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    
    # Table principale de la carte
    card_content = Table([
        [header_text, '', ''],
        [photo_image, info_table, qr_image],
        [footer_text, '', ''],
    ], colWidths=[2*cm, 3.8*cm, 2.5*cm], rowHeights=[0.6*cm, 3*cm, 0.5*cm])
    
    card_content.setStyle(TableStyle([
        # Bordure extérieure
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#0f766e')),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        # Alignements
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # Header row
        ('SPAN', (0, 0), (-1, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0fdf4')),
        # Footer row
        ('SPAN', (0, 2), (-1, 2)),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#f8fafc')),
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    return card_content


@router.get("/export-pdf")
async def export_farmer_cards_pdf(
    cooperative_id: Optional[str] = None,
    farmer_ids: Optional[str] = None,
    cards_per_page: int = Query(default=6, ge=1, le=9),
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """
    Exporter les cartes producteurs en PDF
    
    - **cooperative_id**: ID de la coopérative (optionnel, utilise celle de l'utilisateur si cooperative)
    - **farmer_ids**: Liste d'IDs séparés par virgules (optionnel, tous si non spécifié)
    - **cards_per_page**: Nombre de cartes par page (1-9, défaut: 6)
    """
    
    # Déterminer la coopérative
    user_type = current_user.get('user_type')
    if user_type == 'cooperative':
        coop_id = current_user.get('_id')
        coop_name = current_user.get('cooperative_name') or current_user.get('full_name', 'Coopérative')
    elif cooperative_id:
        coop_id = cooperative_id
        coop = await db.users.find_one({"_id": ObjectId(cooperative_id)})
        coop_name = coop.get('cooperative_name') or coop.get('full_name', 'Coopérative') if coop else 'Coopérative'
    else:
        coop_id = None
        coop_name = 'GreenLink'
    
    # Construire la query
    query = {}
    if farmer_ids:
        ids = [ObjectId(fid.strip()) for fid in farmer_ids.split(',') if fid.strip()]
        query["_id"] = {"$in": ids}
    elif coop_id:
        query["cooperative_id"] = ObjectId(coop_id)
    
    # Récupérer les producteurs
    farmers = []
    
    # From users collection
    user_farmers = await db.users.find({
        **query, 
        "user_type": {"$in": ["farmer", "producteur"]}
    }).to_list(200)
    farmers.extend(user_farmers)
    
    # From coop_members collection
    if coop_id or not farmer_ids:
        member_query = {"cooperative_id": ObjectId(coop_id)} if coop_id else {}
        if farmer_ids:
            member_query["_id"] = query.get("_id", {})
        coop_members = await db.coop_members.find(member_query).to_list(200)
        farmers.extend(coop_members)
    
    if not farmers:
        raise HTTPException(status_code=404, detail="Aucun producteur trouvé")
    
    # Créer le PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1.5*cm,
        bottomMargin=1*cm
    )
    
    story = []
    styles = get_styles()
    
    # En-tête
    story.append(Paragraph(f'<font color="#0f766e">🌱 GreenLink - Cartes Producteurs</font>', styles['HeaderTitle']))
    story.append(Paragraph(f'<font size="10" color="#64748b">{coop_name} • {len(farmers)} carte(s) • {datetime.now().strftime("%d/%m/%Y")}</font>', styles['CardInfo']))
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#0f766e')))
    story.append(Spacer(1, 0.5*cm))
    
    # Déterminer la disposition
    if cards_per_page <= 2:
        cols = 1
        card_width = 16*cm
    elif cards_per_page <= 4:
        cols = 2
        card_width = 8.5*cm
    else:
        cols = 3
        card_width = 5.8*cm
    
    rows_per_page = (cards_per_page + cols - 1) // cols
    
    # Générer les cartes
    cards = []
    for farmer in farmers:
        card = create_farmer_card(farmer, coop_name, styles, card_width=card_width)
        cards.append(card)
    
    # Organiser en grille
    page_cards = []
    for i in range(0, len(cards), cards_per_page):
        page_batch = cards[i:i + cards_per_page]
        
        # Remplir avec des cellules vides si nécessaire
        while len(page_batch) % cols != 0:
            page_batch.append('')
        
        # Créer les lignes
        rows = []
        for j in range(0, len(page_batch), cols):
            row = page_batch[j:j + cols]
            rows.append(row)
        
        # Table de la page
        col_widths = [card_width + 0.5*cm] * cols
        page_table = Table(rows, colWidths=col_widths)
        page_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 0.3*cm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0.3*cm),
        ]))
        
        story.append(page_table)
        
        # Saut de page sauf pour la dernière
        if i + cards_per_page < len(cards):
            story.append(PageBreak())
    
    # Footer sur chaque page
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Paragraph(
        f'<font size="7" color="#94a3b8">Généré par GreenLink Agritech • {datetime.now().strftime("%d/%m/%Y %H:%M")} • Pour usage terrain uniquement</font>',
        styles['CardSmall']
    ))
    
    doc.build(story)
    buffer.seek(0)
    
    filename = f"cartes_producteurs_{coop_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export-single/{farmer_id}")
async def export_single_farmer_card(
    farmer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exporter la carte d'un seul producteur en PDF"""
    
    # Vérifier que le producteur existe
    farmer = await db.users.find_one({"_id": ObjectId(farmer_id), "user_type": {"$in": ["farmer", "producteur"]}})
    if not farmer:
        farmer = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Producteur non trouvé")
    
    # Récupérer la coopérative
    coop_name = "GreenLink"
    if farmer.get('cooperative_id'):
        coop = await db.users.find_one({"_id": ObjectId(farmer['cooperative_id'])})
        if coop:
            coop_name = coop.get('cooperative_name') or coop.get('full_name', 'Coopérative')
    
    # Créer le PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=3*cm,
        bottomMargin=2*cm
    )
    
    story = []
    styles = get_styles()
    
    # Titre
    story.append(Paragraph('<font color="#0f766e" size="16"><b>🌱 Carte Producteur GreenLink</b></font>', styles['HeaderTitle']))
    story.append(Spacer(1, 1*cm))
    
    # Carte centrée
    card = create_farmer_card(farmer, coop_name, styles, card_width=12*cm, card_height=7*cm)
    story.append(card)
    
    story.append(Spacer(1, 1*cm))
    
    # Instructions
    story.append(Paragraph(
        '<font size="10" color="#475569"><b>Instructions:</b></font>',
        styles['CardInfo']
    ))
    story.append(Paragraph(
        '<font size="9" color="#64748b">• Imprimez cette carte et plastifiez-la pour une meilleure durabilité<br/>'
        '• Le QR code permet aux agents de terrain d\'accéder rapidement à votre profil<br/>'
        '• Présentez cette carte lors des visites SSRTE et des collectes de cacao</font>',
        styles['CardInfo']
    ))
    
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Paragraph(
        f'<font size="7" color="#94a3b8">Document généré le {datetime.now().strftime("%d/%m/%Y à %H:%M")} par GreenLink Agritech</font>',
        styles['CardSmall']
    ))
    
    doc.build(story)
    buffer.seek(0)
    
    farmer_name = (farmer.get('full_name') or farmer.get('name') or 'producteur').replace(' ', '_')
    filename = f"carte_{farmer_name}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
