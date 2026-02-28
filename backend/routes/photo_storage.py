# Service de stockage des photos producteurs
# Stockage local avec URLs publiques + nettoyage automatique

import os
import uuid
import base64
import logging
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional, Tuple
from PIL import Image
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from bson import ObjectId

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/photos", tags=["Photo Storage"])

# Configuration
UPLOAD_DIR = "/app/backend/uploads/photos"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
THUMBNAIL_SIZE = (200, 200)
PHOTO_QUALITY = 85

# Créer le dossier si nécessaire
os.makedirs(UPLOAD_DIR, exist_ok=True)


class PhotoUploadRequest(BaseModel):
    photo_base64: str
    photo_type: str = "profile"  # profile, parcel, ssrte, document


def generate_photo_filename(user_id: str, photo_type: str, extension: str = ".jpg") -> str:
    """Générer un nom de fichier unique"""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    return f"{photo_type}_{user_id}_{timestamp}_{unique_id}{extension}"


def process_and_save_image(
    image_data: bytes, 
    filename: str, 
    max_size: Tuple[int, int] = (800, 800),
    quality: int = PHOTO_QUALITY
) -> str:
    """Traiter et sauvegarder une image avec compression"""
    try:
        # Ouvrir l'image
        img = Image.open(BytesIO(image_data))
        
        # Convertir en RGB si nécessaire (pour PNG avec transparence)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Redimensionner si trop grande
        if img.width > max_size[0] or img.height > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Sauvegarder
        filepath = os.path.join(UPLOAD_DIR, filename)
        img.save(filepath, 'JPEG', quality=quality, optimize=True)
        
        return filepath
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur de traitement d'image: {str(e)}")


def create_thumbnail(filepath: str) -> str:
    """Créer une miniature"""
    try:
        img = Image.open(filepath)
        img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
        
        # Nom du thumbnail
        base, ext = os.path.splitext(filepath)
        thumb_path = f"{base}_thumb{ext}"
        
        img.save(thumb_path, 'JPEG', quality=70, optimize=True)
        return thumb_path
    except Exception as e:
        logger.error(f"Error creating thumbnail: {e}")
        return filepath


@router.post("/upload")
async def upload_photo(
    request: PhotoUploadRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Upload une photo en base64
    
    - **photo_base64**: Image en base64 (data:image/...;base64,...)
    - **photo_type**: Type de photo (profile, parcel, ssrte, document)
    """
    user_id = str(current_user.get('_id'))
    
    try:
        # Décoder le base64
        if ',' in request.photo_base64:
            header, encoded = request.photo_base64.split(',', 1)
        else:
            encoded = request.photo_base64
        
        image_data = base64.b64decode(encoded)
        
        # Vérifier la taille
        if len(image_data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Image trop volumineuse (max 5MB)")
        
        # Générer le nom de fichier
        filename = generate_photo_filename(user_id, request.photo_type)
        
        # Traiter et sauvegarder
        filepath = process_and_save_image(image_data, filename)
        
        # Créer miniature pour les photos de profil
        if request.photo_type == "profile":
            create_thumbnail(filepath)
        
        # Construire l'URL publique
        photo_url = f"/api/photos/view/{filename}"
        
        # Mettre à jour le profil utilisateur si c'est une photo de profil
        if request.photo_type == "profile":
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "photo_url": photo_url,
                    "photo_updated_at": datetime.utcnow()
                }}
            )
        
        # Logger l'upload
        await db.photo_uploads.insert_one({
            "user_id": user_id,
            "filename": filename,
            "photo_type": request.photo_type,
            "file_size": len(image_data),
            "created_at": datetime.utcnow()
        })
        
        return {
            "success": True,
            "photo_url": photo_url,
            "filename": filename,
            "size": len(image_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading photo: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")


@router.post("/upload-file")
async def upload_photo_file(
    file: UploadFile = File(...),
    photo_type: str = Form(default="profile"),
    current_user: dict = Depends(get_current_user)
):
    """Upload une photo via fichier multipart"""
    user_id = str(current_user.get('_id'))
    
    # Vérifier l'extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Extension non autorisée. Utilisez: {ALLOWED_EXTENSIONS}")
    
    # Lire le fichier
    contents = await file.read()
    
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 5MB)")
    
    # Générer le nom et sauvegarder
    filename = generate_photo_filename(user_id, photo_type)
    filepath = process_and_save_image(contents, filename)
    
    if photo_type == "profile":
        create_thumbnail(filepath)
    
    photo_url = f"/api/photos/view/{filename}"
    
    # Mettre à jour le profil si photo de profil
    if photo_type == "profile":
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"photo_url": photo_url, "photo_updated_at": datetime.utcnow()}}
        )
    
    return {
        "success": True,
        "photo_url": photo_url,
        "filename": filename
    }


@router.get("/view/{filename}")
async def view_photo(filename: str):
    """Afficher une photo"""
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    return FileResponse(
        filepath,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"}
    )


@router.get("/thumbnail/{filename}")
async def view_thumbnail(filename: str):
    """Afficher la miniature d'une photo"""
    base, ext = os.path.splitext(filename)
    thumb_filename = f"{base}_thumb{ext}"
    thumb_path = os.path.join(UPLOAD_DIR, thumb_filename)
    
    # Si pas de thumbnail, retourner l'original
    if not os.path.exists(thumb_path):
        thumb_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(thumb_path):
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    return FileResponse(
        thumb_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"}
    )


@router.delete("/{filename}")
async def delete_photo(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprimer une photo"""
    user_id = str(current_user.get('_id'))
    
    # Vérifier que la photo appartient à l'utilisateur
    photo_record = await db.photo_uploads.find_one({
        "filename": filename,
        "user_id": user_id
    })
    
    if not photo_record and current_user.get('user_type') not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer cette photo")
    
    # Supprimer les fichiers
    filepath = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    
    # Supprimer le thumbnail
    base, ext = os.path.splitext(filename)
    thumb_path = os.path.join(UPLOAD_DIR, f"{base}_thumb{ext}")
    if os.path.exists(thumb_path):
        os.remove(thumb_path)
    
    # Supprimer l'enregistrement
    await db.photo_uploads.delete_one({"filename": filename})
    
    return {"success": True, "message": "Photo supprimée"}


@router.get("/user/{user_id}")
async def get_user_photos(
    user_id: str,
    photo_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtenir toutes les photos d'un utilisateur"""
    query = {"user_id": user_id}
    if photo_type:
        query["photo_type"] = photo_type
    
    photos = await db.photo_uploads.find(query).sort("created_at", -1).to_list(100)
    
    return {
        "photos": [
            {
                "filename": p["filename"],
                "photo_type": p.get("photo_type"),
                "url": f"/api/photos/view/{p['filename']}",
                "thumbnail_url": f"/api/photos/thumbnail/{p['filename']}",
                "created_at": p.get("created_at")
            }
            for p in photos
        ]
    }


# Endpoint pour mettre à jour la photo de profil utilisateur
@router.put("/profile")
async def update_profile_photo(
    request: PhotoUploadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour la photo de profil"""
    request.photo_type = "profile"
    return await upload_photo(request, current_user)
