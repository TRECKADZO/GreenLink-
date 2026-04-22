from fastapi import APIRouter, HTTPException, Depends, status, Query, UploadFile, File, Body
from typing import List, Optional, Dict
import os
import uuid
import base64
from database import db
from marketplace_models import (
    Product, ProductCreate, Order, OrderCreate, 
    Message, MessageCreate, Notification, Review, ReviewCreate,
    DashboardStats
)
from auth_models import User
from routes.auth import get_current_user
from routes.notifications import notify_sse_clients
from datetime import datetime, timedelta
from bson import ObjectId
from pydantic import BaseModel, Field as PydanticField

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


# ============= DELIVERY MODELS =============

class DeliveryZones(BaseModel):
    meme_ville: float = 0
    meme_region: float = 0
    national: float = 0

class FraisFixeModel(BaseModel):
    actif: bool = False
    montant: float = 0

class ParDistanceModel(BaseModel):
    actif: bool = False
    zones: DeliveryZones = DeliveryZones()

class ParPoidsModel(BaseModel):
    actif: bool = False
    prix_par_unite: float = 0

class SeuilGratuit(BaseModel):
    actif: bool = False
    montant_minimum: float = 0

class ModelesLivraison(BaseModel):
    frais_fixe: FraisFixeModel = FraisFixeModel()
    par_distance: ParDistanceModel = ParDistanceModel()
    par_poids: ParPoidsModel = ParPoidsModel()

class DeliverySettingsUpdate(BaseModel):
    modeles_livraison: ModelesLivraison = ModelesLivraison()
    seuil_gratuit: SeuilGratuit = SeuilGratuit()

class CheckoutBody(BaseModel):
    delivery_address: str
    delivery_phone: str
    delivery_city: str = ""
    delivery_zone: str = "national"
    payment_method: str = "cash_on_delivery"
    notes: str = ""


async def calculate_delivery_fee(supplier_id: str, items: list, subtotal: float, zone: str = "national") -> dict:
    """Calculate delivery fee for a supplier's items based on their delivery settings."""
    settings = await db.delivery_settings.find_one(
        {"supplier_id": supplier_id}, {"_id": 0}
    )
    if not settings:
        return {"total": 0, "details": [], "gratuit": False}

    modeles = settings.get("modeles_livraison", {})
    seuil = settings.get("seuil_gratuit", {})
    fee = 0
    details = []

    # 1. Frais fixe
    ff = modeles.get("frais_fixe", {})
    if ff.get("actif") and ff.get("montant", 0) > 0:
        fee += ff["montant"]
        details.append({"modele": "frais_fixe", "label": "Frais fixe", "montant": ff["montant"]})

    # 2. Par distance (zones)
    pd = modeles.get("par_distance", {})
    if pd.get("actif"):
        zone_key = zone if zone in ["meme_ville", "meme_region", "national"] else "national"
        zone_fee = pd.get("zones", {}).get(zone_key, 0)
        if zone_fee > 0:
            fee += zone_fee
            zone_labels = {"meme_ville": "Même ville", "meme_region": "Même région", "national": "National"}
            details.append({"modele": "par_distance", "label": f"Zone: {zone_labels.get(zone_key, zone_key)}", "montant": zone_fee})

    # 3. Par poids/quantité
    pp = modeles.get("par_poids", {})
    if pp.get("actif") and pp.get("prix_par_unite", 0) > 0:
        total_qty = sum(item.get("quantity", 1) for item in items)
        poids_fee = total_qty * pp["prix_par_unite"]
        fee += poids_fee
        details.append({"modele": "par_poids", "label": f"{total_qty} unité(s) x {pp['prix_par_unite']} F", "montant": poids_fee})

    # Check seuil gratuit
    gratuit = False
    if seuil.get("actif") and seuil.get("montant_minimum", 0) > 0:
        if subtotal >= seuil["montant_minimum"]:
            gratuit = True
            fee = 0
            details = [{"modele": "seuil_gratuit", "label": f"Gratuit (commande >= {seuil['montant_minimum']:,.0f} F)", "montant": 0}]

    return {"total": fee, "details": details, "gratuit": gratuit, "seuil_gratuit": seuil if seuil.get("actif") else None}

# Ensure upload directory exists
UPLOAD_DIR = "/app/backend/uploads/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ============= IMAGE UPLOAD =============

@router.post("/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload product image"""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les fournisseurs peuvent uploader des images"
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Type de fichier non autorisé. Utilisez JPG, PNG ou WebP"
        )
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file
    content = await file.read()
    
    # Check file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image trop grande (max 5MB)")
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    # Return URL path
    image_url = f"/api/marketplace/images/{filename}"
    
    return {"url": image_url, "filename": filename}

@router.get("/images/{filename}")
async def get_product_image(filename: str):
    """Serve product image"""
    from fastapi.responses import FileResponse
    
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image non trouvée")
    
    return FileResponse(filepath)

# ============= DELIVERY SETTINGS =============

@router.get("/supplier/delivery-settings")
async def get_delivery_settings(current_user: dict = Depends(get_current_user)):
    """Get supplier's delivery settings"""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Accès réservé aux fournisseurs")

    settings = await db.delivery_settings.find_one(
        {"supplier_id": current_user["_id"]}, {"_id": 0}
    )

    if not settings:
        return {
            "supplier_id": current_user["_id"],
            "modeles_livraison": {
                "frais_fixe": {"actif": False, "montant": 0},
                "par_distance": {
                    "actif": False,
                    "zones": {"meme_ville": 0, "meme_region": 0, "national": 0}
                },
                "par_poids": {"actif": False, "prix_par_unite": 0}
            },
            "seuil_gratuit": {"actif": False, "montant_minimum": 0}
        }

    return settings


@router.put("/supplier/delivery-settings")
async def update_delivery_settings(
    settings: DeliverySettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update supplier's delivery settings"""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Accès réservé aux fournisseurs")

    delivery_data = {
        "supplier_id": current_user["_id"],
        "modeles_livraison": settings.modeles_livraison.dict(),
        "seuil_gratuit": settings.seuil_gratuit.dict(),
        "updated_at": datetime.utcnow()
    }

    await db.delivery_settings.update_one(
        {"supplier_id": current_user["_id"]},
        {"$set": delivery_data},
        upsert=True
    )

    return {"message": "Paramètres de livraison mis à jour avec succès"}


@router.get("/delivery-fees")
async def get_delivery_fees_for_cart(
    zone: str = "national",
    current_user: dict = Depends(get_current_user)
):
    """Calculate delivery fees for the current cart grouped by supplier"""
    cart = await db.carts.find_one({"user_id": current_user["_id"]})
    if not cart or not cart.get("items"):
        return {"supplier_fees": [], "total_delivery": 0}

    # Group items by supplier
    supplier_items = {}
    for item in cart.get("items", []):
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if not product:
            continue
        sid = product["supplier_id"]
        if sid not in supplier_items:
            supplier_items[sid] = {
                "supplier_name": product.get("supplier_name", ""),
                "items": [],
                "subtotal": 0
            }
        item_total = product["price"] * item["quantity"]
        supplier_items[sid]["items"].append({
            "product_id": item["product_id"],
            "quantity": item["quantity"],
            "price": product["price"]
        })
        supplier_items[sid]["subtotal"] += item_total

    # Calculate fees per supplier
    supplier_fees = []
    total_delivery = 0
    for sid, data in supplier_items.items():
        fee_info = await calculate_delivery_fee(sid, data["items"], data["subtotal"], zone)
        supplier_fees.append({
            "supplier_id": sid,
            "supplier_name": data["supplier_name"],
            "subtotal": data["subtotal"],
            "livraison": fee_info
        })
        total_delivery += fee_info["total"]

    return {"supplier_fees": supplier_fees, "total_delivery": total_delivery}


# ============= PRODUCTS =============

@router.post("/products", response_model=Product)
async def create_product(
    product: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les fournisseurs peuvent créer des produits"
        )
    
    product_dict = product.dict()
    product_dict["supplier_id"] = current_user["_id"]
    product_dict["supplier_name"] = current_user.get("supplier_company") or current_user["full_name"]
    product_dict["created_at"] = datetime.utcnow()
    product_dict["updated_at"] = datetime.utcnow()
    product_dict["is_active"] = True
    product_dict["total_sales"] = 0
    product_dict["rating"] = 0.0
    product_dict["reviews_count"] = 0
    
    result = await db.products.insert_one(product_dict)
    product_dict["_id"] = str(result.inserted_id)
    
    return product_dict

@router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    supplier_id: Optional[str] = None,
    limit: int = 50
):
    query = {"is_active": True}
    
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if supplier_id:
        query["supplier_id"] = supplier_id
    
    products = await db.products.find(query).limit(limit).to_list(limit)
    return [{**p, "_id": str(p["_id"])} for p in products]

@router.get("/products/my-products", response_model=List[Product])
async def get_my_products(
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux fournisseurs"
        )
    
    products = await db.products.find({"supplier_id": current_user["_id"]}).to_list(100)
    return [{**p, "_id": str(p["_id"])} for p in products]

@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    product["_id"] = str(product["_id"])
    return product

@router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: str,
    product: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    existing_product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    if existing_product["supplier_id"] != current_user["_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez modifier que vos propres produits"
        )
    
    update_data = product.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    updated_product = await db.products.find_one({"_id": ObjectId(product_id)})
    updated_product["_id"] = str(updated_product["_id"])
    return updated_product

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    if product["supplier_id"] != current_user["_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez supprimer que vos propres produits"
        )
    
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Produit supprimé avec succès"}

# ============= SHOPPING CART =============

@router.get("/cart")
async def get_cart(
    zone: str = "national",
    current_user: dict = Depends(get_current_user)
):
    """Get user's shopping cart with delivery fee estimates"""
    cart = await db.carts.find_one({"user_id": current_user["_id"]})
    if not cart:
        return {"items": [], "total": 0, "items_count": 0, "delivery_fees": [], "total_delivery": 0, "total_with_delivery": 0}

    # Enrich cart items with product details
    enriched_items = []
    total = 0
    supplier_groups = {}

    for item in cart.get("items", []):
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            item_total = product["price"] * item["quantity"]
            enriched_items.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "product": {
                    "_id": str(product["_id"]),
                    "name": product["name"],
                    "price": product["price"],
                    "unit": product["unit"],
                    "category": product["category"],
                    "supplier_id": product["supplier_id"],
                    "supplier_name": product.get("supplier_name", ""),
                    "images": product.get("images", []),
                    "stock_quantity": product.get("stock_quantity", 0)
                },
                "item_total": item_total
            })
            total += item_total

            # Group by supplier for delivery calculation
            sid = product["supplier_id"]
            if sid not in supplier_groups:
                supplier_groups[sid] = {
                    "supplier_name": product.get("supplier_name", ""),
                    "items": [],
                    "subtotal": 0
                }
            supplier_groups[sid]["items"].append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "price": product["price"]
            })
            supplier_groups[sid]["subtotal"] += item_total

    # Calculate delivery fees per supplier
    delivery_fees = []
    total_delivery = 0
    for sid, data in supplier_groups.items():
        fee_info = await calculate_delivery_fee(sid, data["items"], data["subtotal"], zone)
        delivery_fees.append({
            "supplier_id": sid,
            "supplier_name": data["supplier_name"],
            "subtotal": data["subtotal"],
            "livraison": fee_info
        })
        total_delivery += fee_info["total"]

    return {
        "items": enriched_items,
        "total": total,
        "items_count": len(enriched_items),
        "delivery_fees": delivery_fees,
        "total_delivery": total_delivery,
        "total_with_delivery": total + total_delivery
    }

@router.post("/cart/add")
async def add_to_cart(
    product_id: str,
    quantity: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """Add product to cart"""
    # Verify product exists and has stock
    product = await db.products.find_one({"_id": ObjectId(product_id), "is_active": True})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    if product.get("stock_quantity", 0) < quantity:
        raise HTTPException(status_code=400, detail="Stock insuffisant")
    
    # Get or create cart
    cart = await db.carts.find_one({"user_id": current_user["_id"]})
    
    if not cart:
        # Create new cart
        cart = {
            "user_id": current_user["_id"],
            "items": [{"product_id": product_id, "quantity": quantity}],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.carts.insert_one(cart)
    else:
        # Check if product already in cart
        existing_item = None
        for item in cart.get("items", []):
            if item["product_id"] == product_id:
                existing_item = item
                break
        
        if existing_item:
            # Update quantity
            new_quantity = existing_item["quantity"] + quantity
            if product.get("stock_quantity", 0) < new_quantity:
                raise HTTPException(status_code=400, detail="Stock insuffisant")
            
            await db.carts.update_one(
                {"user_id": current_user["_id"], "items.product_id": product_id},
                {"$set": {"items.$.quantity": new_quantity, "updated_at": datetime.utcnow()}}
            )
        else:
            # Add new item
            await db.carts.update_one(
                {"user_id": current_user["_id"]},
                {
                    "$push": {"items": {"product_id": product_id, "quantity": quantity}},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
    
    return {"message": "Produit ajouté au panier", "product_name": product["name"]}

@router.put("/cart/update")
async def update_cart_item(
    product_id: str,
    quantity: int,
    current_user: dict = Depends(get_current_user)
):
    """Update cart item quantity"""
    if quantity <= 0:
        # Remove item
        await db.carts.update_one(
            {"user_id": current_user["_id"]},
            {"$pull": {"items": {"product_id": product_id}}}
        )
        return {"message": "Produit retiré du panier"}
    
    # Verify stock
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if product and product.get("stock_quantity", 0) < quantity:
        raise HTTPException(status_code=400, detail="Stock insuffisant")
    
    await db.carts.update_one(
        {"user_id": current_user["_id"], "items.product_id": product_id},
        {"$set": {"items.$.quantity": quantity, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Panier mis à jour"}

@router.delete("/cart/remove/{product_id}")
async def remove_from_cart(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove product from cart"""
    await db.carts.update_one(
        {"user_id": current_user["_id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Produit retiré du panier"}

@router.delete("/cart/clear")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    """Clear entire cart"""
    await db.carts.delete_one({"user_id": current_user["_id"]})
    return {"message": "Panier vidé"}

@router.post("/cart/checkout")
async def checkout_cart(
    body: CheckoutBody = None,
    delivery_address: str = None,
    delivery_phone: str = None,
    payment_method: str = "cash_on_delivery",
    notes: str = "",
    current_user: dict = Depends(get_current_user)
):
    """Checkout cart and create order (accepts both body and query params for backward compatibility)"""
    # Support both JSON body and query params
    if body:
        addr = body.delivery_address
        phone = body.delivery_phone
        city = body.delivery_city
        zone = body.delivery_zone
        pay_method = body.payment_method
        order_notes = body.notes
    else:
        addr = delivery_address or ""
        phone = delivery_phone or ""
        city = ""
        zone = "national"
        pay_method = payment_method
        order_notes = notes

    if not addr or not phone:
        raise HTTPException(status_code=400, detail="Adresse et téléphone requis")

    cart = await db.carts.find_one({"user_id": current_user["_id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Panier vide")

    # Group items by supplier
    supplier_orders = {}

    for item in cart["items"]:
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if not product:
            continue

        if product.get("stock_quantity", 0) < item["quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuffisant pour {product['name']}"
            )

        supplier_id = product["supplier_id"]
        if supplier_id not in supplier_orders:
            supplier_orders[supplier_id] = {
                "supplier_id": supplier_id,
                "supplier_name": product.get("supplier_name", ""),
                "items": [],
                "total": 0
            }

        item_total = product["price"] * item["quantity"]
        supplier_orders[supplier_id]["items"].append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "quantity": item["quantity"],
            "unit_price": product["price"],
            "unit": product["unit"],
            "total": item_total
        })
        supplier_orders[supplier_id]["total"] += item_total

    # Create orders for each supplier with delivery fees
    created_orders = []
    order_number_base = f"CMD{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    grand_total = 0

    for idx, (supplier_id, order_data) in enumerate(supplier_orders.items()):
        # Calculate delivery fee for this supplier
        fee_items = [{"product_id": i["product_id"], "quantity": i["quantity"], "price": i["unit_price"]} for i in order_data["items"]]
        fee_info = await calculate_delivery_fee(supplier_id, fee_items, order_data["total"], zone)
        delivery_fee = fee_info["total"]

        order = {
            "order_number": f"{order_number_base}-{idx+1}",
            "buyer_id": str(current_user["_id"]),
            "buyer_name": current_user["full_name"],
            "buyer_email": current_user.get("email", ""),
            "buyer_phone": phone,
            "supplier_id": supplier_id,
            "supplier_name": order_data["supplier_name"],
            "items": order_data["items"],
            "subtotal": order_data["total"],
            "frais_livraison": delivery_fee,
            "details_livraison": fee_info.get("details", []),
            "total_amount": order_data["total"] + delivery_fee,
            "delivery_address": addr,
            "delivery_city": city,
            "delivery_zone": zone,
            "delivery_phone": phone,
            "payment_method": pay_method,
            "notes": order_notes,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await db.orders.insert_one(order)
        order["_id"] = str(result.inserted_id)
        created_orders.append(order)
        grand_total += order["total_amount"]

        # Update product stock
        for item in order_data["items"]:
            await db.products.update_one(
                {"_id": ObjectId(item["product_id"])},
                {"$inc": {"stock_quantity": -item["quantity"], "total_sales": item["quantity"]}}
            )

        # Create notification for supplier
        supplier_notif = {
            "user_id": supplier_id,
            "title": "Nouvelle commande reçue",
            "message": f"Commande #{order['order_number']} de {current_user['full_name']} - {order['total_amount']:,.0f} XOF",
            "type": "order",
            "action_url": "/supplier/orders",
            "created_at": datetime.utcnow(),
            "is_read": False
        }
        ins = await db.notifications.insert_one(supplier_notif)
        notify_sse_clients(supplier_id, {
            "id": str(ins.inserted_id),
            "title": supplier_notif["title"],
            "message": supplier_notif["message"],
            "type": supplier_notif["type"],
            "action_url": supplier_notif["action_url"],
            "is_read": False,
            "created_at": supplier_notif["created_at"].isoformat()
        })

    # Clear cart
    await db.carts.delete_one({"user_id": current_user["_id"]})

    return {
        "success": True,
        "message": "Commande passée avec succès",
        "orders": created_orders,
        "total_orders": len(created_orders),
        "grand_total": grand_total,
        "order_id": created_orders[0]["_id"] if created_orders else None
    }

# ============= BUYER ORDERS =============

@router.get("/buyer/orders")
async def get_buyer_orders(current_user: dict = Depends(get_current_user)):
    """Get orders for the current buyer"""
    orders = await db.orders.find({"buyer_id": current_user["_id"]}).sort("created_at", -1).to_list(100)
    return [{**o, "_id": str(o["_id"])} for o in orders]

@router.get("/buyer/orders/{order_id}")
async def get_buyer_order_detail(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific order details"""
    order = await db.orders.find_one({"_id": ObjectId(order_id), "buyer_id": current_user["_id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    order["_id"] = str(order["_id"])
    return order

# ============= ORDERS =============

@router.post("/orders", response_model=Order)
async def create_order(
    order: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get supplier info from first product
    first_product_id = order.items[0].product_id
    product = await db.products.find_one({"_id": ObjectId(first_product_id)})
    
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    order_dict = order.dict()
    order_dict["order_number"] = f"GR{datetime.utcnow().strftime('%Y%m%d')}{str(uuid.uuid4())[:6].upper()}"
    order_dict["customer_id"] = current_user["_id"]
    order_dict["customer_name"] = current_user["full_name"]
    order_dict["customer_phone"] = current_user.get("phone_number") or current_user.get("email")
    order_dict["supplier_id"] = product["supplier_id"]
    order_dict["supplier_name"] = product["supplier_name"]
    order_dict["status"] = "pending"
    order_dict["created_at"] = datetime.utcnow()
    order_dict["updated_at"] = datetime.utcnow()
    order_dict["estimated_delivery"] = datetime.utcnow() + timedelta(days=3)
    
    result = await db.orders.insert_one(order_dict)
    order_dict["_id"] = str(result.inserted_id)
    
    # Create notification for supplier
    single_notif = {
        "user_id": product["supplier_id"],
        "title": "Nouvelle commande",
        "message": f"Nouvelle commande {order_dict['order_number']} de {current_user['full_name']}",
        "type": "order",
        "action_url": f"/supplier/orders/{str(result.inserted_id)}",
        "created_at": datetime.utcnow(),
        "is_read": False
    }
    ins2 = await db.notifications.insert_one(single_notif)
    notify_sse_clients(product["supplier_id"], {
        "id": str(ins2.inserted_id),
        "title": single_notif["title"],
        "message": single_notif["message"],
        "type": single_notif["type"],
        "action_url": single_notif["action_url"],
        "is_read": False,
        "created_at": single_notif["created_at"].isoformat()
    })
    
    return order_dict

@router.get("/orders/my-orders")
async def get_my_orders(
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    if current_user.get("user_type") == "fournisseur":
        query = {"supplier_id": {"$in": [user_id, current_user["_id"]]}}
    else:
        query = {"$or": [
            {"buyer_id": user_id},
            {"buyer_id": current_user["_id"]},
            {"customer_id": user_id},
            {"customer_id": current_user["_id"]},
        ]}
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(100)
    result = []
    for o in orders:
        o["_id"] = str(o["_id"])
        # Normalize: ensure buyer_id fields are present as strings
        if "buyer_id" in o:
            o["buyer_id"] = str(o["buyer_id"])
        if "customer_id" in o:
            o["customer_id"] = str(o["customer_id"])
        result.append(o)
    return result

@router.get("/orders/{order_id}", response_model=Order)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Check access
    if order["customer_id"] != current_user["_id"] and order["supplier_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    order["_id"] = str(order["_id"])
    return order

@router.put("/orders/{order_id}/status-legacy")
async def update_order_status_legacy(
    order_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    """Legacy supplier status update. New callers should use /orders/{id}/status."""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Seuls les fournisseurs peuvent modifier le statut")
    
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["supplier_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    allowed_statuses = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"]
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    # Notify customer
    status_notif = {
        "user_id": order["customer_id"],
        "title": "Mise à jour de commande",
        "message": f"Votre commande {order['order_number']} est maintenant: {status}",
        "type": "order",
        "action_url": f"/orders/{order_id}",
        "created_at": datetime.utcnow(),
        "is_read": False
    }
    ins_s = await db.notifications.insert_one(status_notif)
    customer_id = str(order["customer_id"]) if isinstance(order["customer_id"], ObjectId) else order["customer_id"]
    notify_sse_clients(customer_id, {
        "id": str(ins_s.inserted_id),
        "title": status_notif["title"],
        "message": status_notif["message"],
        "type": status_notif["type"],
        "action_url": status_notif["action_url"],
        "is_read": False,
        "created_at": status_notif["created_at"].isoformat()
    })
    
    return {"message": "Statut mis à jour"}

# ============= MESSAGES =============

@router.post("/messages", response_model=Message)
async def send_message(
    message: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    receiver = await db.users.find_one({"_id": ObjectId(message.receiver_id)})
    if not receiver:
        raise HTTPException(status_code=404, detail="Destinataire non trouvé")
    
    conversation_id = "-".join(sorted([current_user["_id"], message.receiver_id]))
    
    message_dict = {
        "sender_id": current_user["_id"],
        "sender_name": current_user["full_name"],
        "receiver_id": message.receiver_id,
        "receiver_name": receiver["full_name"],
        "content": message.content,
        "conversation_id": conversation_id,
        "created_at": datetime.utcnow(),
        "is_read": False
    }
    
    result = await db.messages.insert_one(message_dict)
    message_dict["_id"] = str(result.inserted_id)
    
    # Create notification
    await db.notifications.insert_one({
        "user_id": message.receiver_id,
        "title": "Nouveau message",
        "message": f"{current_user['full_name']} vous a envoyé un message",
        "type": "message",
        "action_url": f"/messages/{conversation_id}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    return message_dict

@router.get("/messages/conversations")
async def get_conversations(
    current_user: dict = Depends(get_current_user)
):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user["_id"]},
            {"receiver_id": current_user["_id"]}
        ]
    }).sort("created_at", -1).to_list(1000)
    
    conversations = {}
    for msg in messages:
        conv_id = msg["conversation_id"]
        if conv_id not in conversations:
            other_user = msg["receiver_name"] if msg["sender_id"] == current_user["_id"] else msg["sender_name"]
            other_user_id = msg["receiver_id"] if msg["sender_id"] == current_user["_id"] else msg["sender_id"]
            conversations[conv_id] = {
                "conversation_id": conv_id,
                "other_user": other_user,
                "other_user_id": other_user_id,
                "last_message": msg["content"],
                "last_message_time": msg["created_at"],
                "unread_count": 0
            }
        
        if msg["receiver_id"] == current_user["_id"] and not msg["is_read"]:
            conversations[conv_id]["unread_count"] += 1
    
    return list(conversations.values())

@router.get("/messages/{conversation_id}", response_model=List[Message])
async def get_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    messages = await db.messages.find({
        "conversation_id": conversation_id
    }).sort("created_at", 1).to_list(1000)
    
    # Mark as read
    await db.messages.update_many(
        {
            "conversation_id": conversation_id,
            "receiver_id": current_user["_id"],
            "is_read": False
        },
        {"$set": {"is_read": True}}
    )
    
    return [{**m, "_id": str(m["_id"])} for m in messages]

# ============= NOTIFICATIONS =============

@router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    notifications = await db.notifications.find({
        "user_id": current_user["_id"]
    }).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [{**n, "_id": str(n["_id"])} for n in notifications]

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["_id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notification marquée comme lue"}

@router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    await db.notifications.update_many(
        {"user_id": current_user["_id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "Toutes les notifications marquées comme lues"}

# ============= DASHBOARD =============

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Accès réservé aux fournisseurs")
    
    supplier_id = current_user["_id"]
    
    # Get all products
    products = await db.products.find({"supplier_id": supplier_id}).to_list(1000)
    total_products = len(products)
    active_products = len([p for p in products if p.get("is_active", True)])
    low_stock = len([p for p in products if p.get("stock_quantity", 0) < 10])
    
    # Get all orders
    orders = await db.orders.find({"supplier_id": supplier_id}).to_list(1000)
    total_orders = len(orders)
    pending_orders = len([o for o in orders if o["status"] == "pending"])
    total_revenue = sum([o["total_amount"] for o in orders if o["status"] != "cancelled"])
    
    # Monthly revenue
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    monthly_revenue = sum([
        o["total_amount"] for o in orders 
        if o["created_at"] > thirty_days_ago and o["status"] != "cancelled"
    ])
    
    # Unique customers
    customer_ids = set([o["customer_id"] for o in orders])
    total_customers = len(customer_ids)
    
    # Unread messages
    unread_messages = await db.messages.count_documents({
        "receiver_id": supplier_id,
        "is_read": False
    })
    
    # Recent orders
    recent_orders = sorted(orders, key=lambda x: x["created_at"], reverse=True)[:5]
    recent_orders_data = [{
        "order_number": o["order_number"],
        "customer_name": o["customer_name"],
        "total_amount": o["total_amount"],
        "status": o["status"],
        "created_at": o["created_at"].isoformat()
    } for o in recent_orders]
    
    # Top products
    product_sales = {}
    for order in orders:
        if order["status"] != "cancelled":
            for item in order["items"]:
                pid = item["product_id"]
                if pid not in product_sales:
                    product_sales[pid] = {"name": item["product_name"], "sales": 0, "revenue": 0}
                product_sales[pid]["sales"] += item["quantity"]
                product_sales[pid]["revenue"] += item["total_price"]
    
    top_products_data = sorted(
        [{"product_name": v["name"], "sales": v["sales"], "revenue": v["revenue"]} for v in product_sales.values()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:5]
    
    # Revenue chart (last 7 days)
    revenue_chart = []
    for i in range(7):
        day = datetime.utcnow() - timedelta(days=6-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_revenue = sum([
            o["total_amount"] for o in orders
            if day_start <= o["created_at"] < day_end and o["status"] != "cancelled"
        ])
        
        revenue_chart.append({
            "date": day.strftime("%d/%m"),
            "revenue": day_revenue
        })
    
    return {
        "total_products": total_products,
        "active_products": active_products,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue,
        "total_customers": total_customers,
        "unread_messages": unread_messages,
        "low_stock_products": low_stock,
        "recent_orders": recent_orders_data,
        "top_products": top_products_data,
        "revenue_chart": revenue_chart
    }


# ============= PRODUCT REVIEWS =============

@router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str):
    """Get all reviews for a product"""
    reviews = await db.product_reviews.find({"product_id": product_id}).sort("created_at", -1).to_list(100)
    return [{**r, "_id": str(r["_id"])} for r in reviews]

@router.post("/products/{product_id}/reviews")
async def add_product_review(
    product_id: str,
    rating: int,
    comment: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a review for a product"""
    # Check if product exists
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Check if user already reviewed this product
    existing = await db.product_reviews.find_one({
        "product_id": product_id,
        "user_id": current_user["_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà noté ce produit")
    
    review = {
        "product_id": product_id,
        "user_id": current_user["_id"],
        "user_name": current_user["full_name"],
        "rating": min(5, max(1, rating)),
        "comment": comment,
        "created_at": datetime.utcnow()
    }
    
    await db.product_reviews.insert_one(review)
    
    # Update product average rating
    all_reviews = await db.product_reviews.find({"product_id": product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(all_reviews)}}
    )
    
    return {"message": "Avis ajouté avec succès"}

# ============= WISHLIST =============

@router.get("/wishlist")
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    """Get user's wishlist"""
    wishlist = await db.wishlists.find({"user_id": current_user["_id"]}).to_list(100)
    
    # Enrich with product details
    result = []
    for item in wishlist:
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            result.append({
                "_id": str(item["_id"]),
                "product_id": item["product_id"],
                "added_at": item["added_at"],
                "product": {
                    "_id": str(product["_id"]),
                    "name": product["name"],
                    "price": product["price"],
                    "unit": product["unit"],
                    "images": product.get("images", []),
                    "category": product["category"],
                    "supplier_name": product.get("supplier_name", ""),
                    "rating": product.get("rating", 0),
                    "stock_quantity": product.get("stock_quantity", 0)
                }
            })
    
    return result

@router.post("/wishlist/add")
async def add_to_wishlist(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Add product to wishlist"""
    # Check if already in wishlist
    existing = await db.wishlists.find_one({
        "user_id": current_user["_id"],
        "product_id": product_id
    })
    if existing:
        return {"message": "Produit déjà dans les favoris"}
    
    await db.wishlists.insert_one({
        "user_id": current_user["_id"],
        "product_id": product_id,
        "added_at": datetime.utcnow()
    })
    
    return {"message": "Ajouté aux favoris"}

@router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove product from wishlist"""
    await db.wishlists.delete_one({
        "user_id": current_user["_id"],
        "product_id": product_id
    })
    return {"message": "Retiré des favoris"}

# ============= ORDER TRACKING =============

@router.get("/orders/{order_id}/tracking")
async def get_order_tracking(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get order tracking information"""
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "$or": [
            {"buyer_id": current_user["_id"]},
            {"supplier_id": current_user["_id"]}
        ]
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Get tracking history
    tracking = await db.order_tracking.find({"order_id": order_id}).sort("timestamp", 1).to_list(100)
    
    # Build tracking timeline
    statuses = [
        {"status": "pending", "label": "Commande reçue", "description": "Votre commande a été reçue"},
        {"status": "confirmed", "label": "Confirmée", "description": "Le fournisseur a confirmé la commande"},
        {"status": "processing", "label": "En préparation", "description": "Votre commande est en cours de préparation"},
        {"status": "shipped", "label": "Expédiée", "description": "Votre commande est en route"},
        {"status": "delivered", "label": "Livrée", "description": "Commande livrée avec succès"}
    ]
    
    current_status = order.get("status", "pending")
    status_index = next((i for i, s in enumerate(statuses) if s["status"] == current_status), 0)
    
    timeline = []
    for i, s in enumerate(statuses):
        tracking_entry = next((t for t in tracking if t["status"] == s["status"]), None)
        timeline.append({
            **s,
            "completed": i <= status_index,
            "current": i == status_index,
            "timestamp": tracking_entry["timestamp"] if tracking_entry else None
        })
    
    return {
        "order_id": str(order["_id"]),
        "order_number": order["order_number"],
        "status": current_status,
        "timeline": timeline,
        "estimated_delivery": order.get("estimated_delivery"),
        "delivery_address": order.get("delivery_address"),
        "delivery_phone": order.get("delivery_phone")
    }

@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    new_status: str,
    note: str = "",
    current_user: dict = Depends(get_current_user)
):
    """Update order status (for supplier)"""
    valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "supplier_id": current_user["_id"]
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Update order status
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    # Add tracking entry
    await db.order_tracking.insert_one({
        "order_id": order_id,
        "status": new_status,
        "note": note,
        "timestamp": datetime.utcnow(),
        "updated_by": current_user["_id"]
    })
    
    # Notify buyer
    status_labels = {
        "confirmed": "Commande confirmée",
        "processing": "Commande en préparation",
        "shipped": "Commande expédiée",
        "delivered": "Commande livrée",
        "cancelled": "Commande annulée"
    }
    
    await db.notifications.insert_one({
        "user_id": order["buyer_id"],
        "title": status_labels.get(new_status, "Mise à jour commande"),
        "message": f"Commande #{order['order_number']}: {status_labels.get(new_status, new_status)}",
        "type": "order_update",
        "action_url": f"/order-tracking/{order_id}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    return {"message": "Statut mis à jour"}

# ============= PRICE HISTORY =============

@router.get("/products/{product_id}/price-history")
async def get_price_history(product_id: str):
    """Get price history for a product"""
    history = await db.price_history.find({"product_id": product_id}).sort("date", -1).limit(30).to_list(30)
    return [{**h, "_id": str(h["_id"])} for h in history]


# ============= SEED DEMO DATA =============

@router.post("/seed-demo-products")
async def seed_demo_products(current_user: dict = Depends(get_current_user)):
    """Seed the marketplace with demo products for testing"""
    existing = await db.products.count_documents({"is_demo": True})
    if existing > 0:
        return {"message": f"{existing} produits démo existent déjà", "count": existing}
    
    demo_products = [
        {
            "name": "Engrais NPK 15-15-15 (50kg)",
            "description": "Engrais complet pour cultures de cacao et café. Formule équilibrée NPK pour une croissance optimale. Sac de 50kg certifié pour l'agriculture ivoirienne.",
            "category": "engrais",
            "price": 25000,
            "unit": "sac",
            "stock_quantity": 500,
            "minimum_order": 5,
        },
        {
            "name": "Fongicide Ridomil Gold MZ 68 WG",
            "description": "Fongicide systémique pour la protection du cacao contre la pourriture brune des cabosses. Application foliaire, efficacité prouvée.",
            "category": "pesticides",
            "price": 12500,
            "unit": "sachet 250g",
            "stock_quantity": 1200,
            "minimum_order": 10,
        },
        {
            "name": "Herbicide Glyphosate 360 SL (5L)",
            "description": "Herbicide non sélectif pour le désherbage des plantations. Efficace contre les mauvaises herbes annuelles et vivaces.",
            "category": "pesticides",
            "price": 8500,
            "unit": "bidon 5L",
            "stock_quantity": 300,
            "minimum_order": 2,
        },
        {
            "name": "Semences Cacao Mercedes (1kg)",
            "description": "Semences de cacao variété Mercedes, haut rendement et résistance aux maladies. Certifiées par le CNRA de Côte d'Ivoire.",
            "category": "semences",
            "price": 15000,
            "unit": "kg",
            "stock_quantity": 200,
            "minimum_order": 1,
        },
        {
            "name": "Machette agricole renforcée",
            "description": "Machette en acier trempé haute résistance. Manche ergonomique en bois. Idéale pour l'entretien des plantations de cacao.",
            "category": "outils",
            "price": 3500,
            "unit": "pièce",
            "stock_quantity": 800,
            "minimum_order": 1,
        },
        {
            "name": "Pulvérisateur à dos 16L",
            "description": "Pulvérisateur manuel à pression pour traitement phytosanitaire. Capacité 16 litres, buse réglable, bretelles confortables.",
            "category": "equipements",
            "price": 35000,
            "unit": "pièce",
            "stock_quantity": 150,
            "minimum_order": 1,
        },
        {
            "name": "Engrais organique compost (25kg)",
            "description": "Compost organique enrichi pour améliorer la fertilité du sol. Produit localement, adapté aux sols tropicaux. Sac de 25kg.",
            "category": "engrais",
            "price": 8000,
            "unit": "sac",
            "stock_quantity": 1000,
            "minimum_order": 10,
        },
        {
            "name": "Insecticide Karate Zeon 5 CS",
            "description": "Insecticide de contact pour la lutte contre les mirides et autres ravageurs du cacao. Formulation micro-encapsulée longue durée.",
            "category": "pesticides",
            "price": 9800,
            "unit": "flacon 250ml",
            "stock_quantity": 600,
            "minimum_order": 5,
        },
        {
            "name": "Kit de greffage professionnel",
            "description": "Kit complet pour le greffage du cacao : couteau de greffage, ruban parafilm, sécateur. Matériel professionnel durable.",
            "category": "outils",
            "price": 18000,
            "unit": "kit",
            "stock_quantity": 100,
            "minimum_order": 1,
        },
        {
            "name": "Bâche de séchage cacao (4x6m)",
            "description": "Bâche en polypropylène tissé pour le séchage du cacao après fermentation. Résistante aux UV, dimensions 4x6 mètres.",
            "category": "equipements",
            "price": 12000,
            "unit": "pièce",
            "stock_quantity": 250,
            "minimum_order": 2,
        },
        {
            "name": "Engrais foliaire Callivoire (1L)",
            "description": "Engrais foliaire liquide riche en oligo-éléments. Stimule la floraison et la fructification du cacaoyer. Bidon de 1 litre.",
            "category": "engrais",
            "price": 6500,
            "unit": "bidon 1L",
            "stock_quantity": 400,
            "minimum_order": 3,
        },
        {
            "name": "Sacs de jute pour cacao (100 pcs)",
            "description": "Sacs en jute naturel pour le conditionnement et le transport du cacao sec. Lot de 100 sacs, capacité 65kg chacun.",
            "category": "equipements",
            "price": 75000,
            "unit": "lot 100",
            "stock_quantity": 50,
            "minimum_order": 1,
        },
    ]
    
    now = datetime.utcnow()
    suppliers = [
        "Agro-Intrants CI", "SOGB Distribution", "CemOI Fournitures",
        "Ivoire Agri-Services", "SIFCA Intrants", "ProCacao CI"
    ]
    
    for i, product in enumerate(demo_products):
        product["supplier_id"] = "demo_supplier"
        product["supplier_name"] = suppliers[i % len(suppliers)]
        product["created_at"] = now
        product["updated_at"] = now
        product["is_active"] = True
        product["is_demo"] = True
        product["total_sales"] = 0
        product["rating"] = round(3.5 + (i % 5) * 0.3, 1)
        product["reviews_count"] = i * 3
        if "image_url" not in product:
            product["image_url"] = None
    
    result = await db.products.insert_many(demo_products)
    return {"message": f"{len(result.inserted_ids)} produits démo ajoutés", "count": len(result.inserted_ids)}
