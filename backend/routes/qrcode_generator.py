# QR Code Generator pour les producteurs
# Génère des QR codes uniques pour identification sur le terrain

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime
from io import BytesIO
from bson import ObjectId
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import RadialGradiantColorMask
import json
import logging
import base64

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/qrcode", tags=["QR Code"])

# ============= AUTHENTICATION =============

async def get_authenticated_user(current_user: dict = Depends(get_current_user)):
    return current_user

async def get_admin_or_coop_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') not in ['admin', 'super_admin', 'cooperative']:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs ou coopératives")
    return current_user

# ============= QR CODE GENERATION =============

def generate_qr_code_image(data: str, size: int = 300, style: str = "default") -> BytesIO:
    """
    Générer une image QR code
    
    Args:
        data: Données à encoder
        size: Taille de l'image en pixels
        style: Style du QR code (default, rounded, gradient)
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    if style == "rounded":
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer()
        )
    elif style == "gradient":
        img = qr.make_image(
            image_factory=StyledPilImage,
            color_mask=RadialGradiantColorMask(
                center_color=(16, 185, 129),  # Vert GreenLink
                edge_color=(13, 148, 103)
            )
        )
    else:
        img = qr.make_image(fill_color="#0f766e", back_color="white")
    
    # Redimensionner
    img = img.resize((size, size))
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return buffer

def create_farmer_qr_data(farmer_id: str, farmer_name: str = None, cooperative_id: str = None) -> str:
    """
    Créer les données du QR code pour un producteur
    Format: GREENLINK_FARMER:base64(json)
    """
    data = {
        "id": farmer_id,
        "type": "farmer",
        "app": "greenlink"
    }
    if farmer_name:
        data["name"] = farmer_name
    if cooperative_id:
        data["coop"] = cooperative_id
    
    # Encoder en base64 pour compacité
    json_str = json.dumps(data)
    encoded = base64.urlsafe_b64encode(json_str.encode()).decode()
    
    return f"GREENLINK_FARMER:{encoded}"


# ============= API ENDPOINTS =============

@router.get("/farmer/{farmer_id}")
async def get_farmer_qr_code(
    farmer_id: str,
    size: int = 300,
    style: str = "default",
    format: str = "png",
    current_user: dict = Depends(get_authenticated_user)
):
    """
    Obtenir le QR code d'un producteur
    
    - **farmer_id**: ID du producteur
    - **size**: Taille en pixels (100-500)
    - **style**: default, rounded, gradient
    - **format**: png, base64
    """
    # Vérifier que le producteur existe
    farmer = await db.users.find_one({"_id": ObjectId(farmer_id), "user_type": "farmer"})
    if not farmer:
        farmer = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Producteur non trouvé")
    
    # Vérifier les permissions (le producteur peut voir son propre QR, admin/coop peuvent voir tous)
    user_type = current_user.get('user_type')
    if user_type == 'farmer' and str(current_user.get('_id')) != farmer_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez voir que votre propre QR code")
    
    # Limiter la taille
    size = max(100, min(500, size))
    
    # Créer les données QR
    qr_data = create_farmer_qr_data(
        farmer_id=farmer_id,
        farmer_name=farmer.get('full_name') or farmer.get('name'),
        cooperative_id=str(farmer.get('cooperative_id')) if farmer.get('cooperative_id') else None
    )
    
    # Générer l'image
    img_buffer = generate_qr_code_image(qr_data, size=size, style=style)
    
    if format == "base64":
        img_base64 = base64.b64encode(img_buffer.read()).decode()
        return {
            "farmer_id": farmer_id,
            "farmer_name": farmer.get('full_name') or farmer.get('name'),
            "qr_data": qr_data,
            "qr_image_base64": f"data:image/png;base64,{img_base64}"
        }
    
    return StreamingResponse(
        img_buffer,
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=qr_greenlink_{farmer_id}.png"
        }
    )


@router.get("/farmer/{farmer_id}/download")
async def download_farmer_qr_code(
    farmer_id: str,
    size: int = 400,
    style: str = "gradient",
    current_user: dict = Depends(get_authenticated_user)
):
    """
    Télécharger le QR code d'un producteur (PNG haute qualité)
    """
    # Vérifier que le producteur existe
    farmer = await db.users.find_one({"_id": ObjectId(farmer_id), "user_type": {"$in": ["farmer", "producteur"]}})
    if not farmer:
        farmer = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Producteur non trouvé")
    
    size = max(200, min(600, size))
    
    qr_data = create_farmer_qr_data(
        farmer_id=farmer_id,
        farmer_name=farmer.get('full_name') or farmer.get('name'),
        cooperative_id=str(farmer.get('cooperative_id')) if farmer.get('cooperative_id') else None
    )
    
    img_buffer = generate_qr_code_image(qr_data, size=size, style=style)
    
    farmer_name = (farmer.get('full_name') or farmer.get('name') or 'producteur').replace(' ', '_')
    
    return StreamingResponse(
        img_buffer,
        media_type="image/png",
        headers={
            "Content-Disposition": f"attachment; filename=qr_greenlink_{farmer_name}.png"
        }
    )


@router.get("/farmer/{farmer_id}/card")
async def get_farmer_card_data(
    farmer_id: str,
    current_user: dict = Depends(get_authenticated_user)
):
    """
    Obtenir les données complètes pour une carte producteur avec QR code
    """
    farmer = await db.users.find_one({"_id": ObjectId(farmer_id), "user_type": {"$in": ["farmer", "producteur"]}})
    if not farmer:
        farmer = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Producteur non trouvé")
    
    # Récupérer la coopérative
    coop_name = "Non affilié"
    if farmer.get('cooperative_id'):
        coop = await db.users.find_one({"_id": ObjectId(farmer['cooperative_id'])})
        if coop:
            coop_name = coop.get('cooperative_name') or coop.get('full_name', 'Coopérative')
    
    # Générer QR code en base64
    qr_data = create_farmer_qr_data(
        farmer_id=farmer_id,
        farmer_name=farmer.get('full_name') or farmer.get('name'),
        cooperative_id=str(farmer.get('cooperative_id')) if farmer.get('cooperative_id') else None
    )
    img_buffer = generate_qr_code_image(qr_data, size=300, style="gradient")
    qr_base64 = base64.b64encode(img_buffer.read()).decode()
    
    return {
        "farmer_id": farmer_id,
        "full_name": farmer.get('full_name') or farmer.get('name'),
        "phone_number": farmer.get('phone_number'),
        "village": farmer.get('village'),
        "region": farmer.get('region'),
        "cooperative": coop_name,
        "registration_date": farmer.get('created_at'),
        "qr_code_data": qr_data,
        "qr_code_image": f"data:image/png;base64,{qr_base64}"
    }


@router.get("/cooperative/members")
async def get_cooperative_members_qr_codes(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_admin_or_coop_user)
):
    """
    Obtenir les QR codes de tous les membres d'une coopérative
    Pour impression en lot
    """
    user_type = current_user.get('user_type')
    
    # Déterminer la coopérative
    if user_type == 'cooperative':
        coop_id = current_user.get('_id')
    else:
        # Admin peut spécifier une coopérative
        coop_id = None  # Retourne tous les producteurs
    
    # Query
    query = {}
    if coop_id:
        query["cooperative_id"] = ObjectId(coop_id)
    
    # Récupérer les membres (users farmers + coop_members)
    members = []
    
    # From users collection
    farmers = await db.users.find({**query, "user_type": {"$in": ["farmer", "producteur"]}}).skip(skip).limit(limit).to_list(limit)
    for f in farmers:
        members.append({
            "id": str(f["_id"]),
            "name": f.get('full_name'),
            "phone": f.get('phone_number'),
            "village": f.get('village'),
            "source": "users"
        })
    
    # From coop_members collection
    coop_members = await db.coop_members.find(query).skip(skip).limit(limit - len(members)).to_list(limit - len(members))
    for m in coop_members:
        members.append({
            "id": str(m["_id"]),
            "name": m.get('full_name') or m.get('name'),
            "phone": m.get('phone_number'),
            "village": m.get('village'),
            "source": "coop_members"
        })
    
    # Générer les QR codes
    result = []
    for member in members:
        qr_data = create_farmer_qr_data(
            farmer_id=member["id"],
            farmer_name=member["name"],
            cooperative_id=str(coop_id) if coop_id else None
        )
        img_buffer = generate_qr_code_image(qr_data, size=200, style="default")
        qr_base64 = base64.b64encode(img_buffer.read()).decode()
        
        result.append({
            **member,
            "qr_code": f"data:image/png;base64,{qr_base64}"
        })
    
    total_farmers = await db.users.count_documents({**query, "user_type": {"$in": ["farmer", "producteur"]}})
    total_members = await db.coop_members.count_documents(query)
    
    return {
        "total": total_farmers + total_members,
        "members": result,
        "cooperative_id": str(coop_id) if coop_id else None
    }


@router.post("/decode")
async def decode_qr_code(
    qr_data: str,
    current_user: dict = Depends(get_authenticated_user)
):
    """
    Décoder un QR code GreenLink et retourner les informations du producteur
    """
    try:
        if qr_data.startswith("GREENLINK_FARMER:"):
            encoded = qr_data.replace("GREENLINK_FARMER:", "")
            decoded = base64.urlsafe_b64decode(encoded).decode()
            data = json.loads(decoded)
            farmer_id = data.get("id")
        else:
            # Essayer de parser comme JSON direct
            try:
                data = json.loads(qr_data)
                farmer_id = data.get("id") or data.get("farmer_id") or data.get("_id")
            except:
                farmer_id = qr_data
        
        if not farmer_id:
            raise HTTPException(status_code=400, detail="QR code invalide")
        
        # Chercher le producteur
        farmer = await db.users.find_one({"_id": ObjectId(farmer_id)})
        if not farmer:
            farmer = await db.coop_members.find_one({"_id": ObjectId(farmer_id)})
        
        if not farmer:
            return {
                "valid": False,
                "message": "Producteur non trouvé",
                "farmer_id": farmer_id
            }
        
        return {
            "valid": True,
            "farmer_id": str(farmer["_id"]),
            "full_name": farmer.get('full_name') or farmer.get('name'),
            "phone_number": farmer.get('phone_number'),
            "village": farmer.get('village'),
            "region": farmer.get('region'),
            "user_type": farmer.get('user_type', 'farmer')
        }
        
    except Exception as e:
        logger.error(f"Error decoding QR: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur de décodage: {str(e)}")
