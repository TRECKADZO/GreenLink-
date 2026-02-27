from fastapi import APIRouter, HTTPException, Depends, status, Query, UploadFile, File
from typing import List, Optional
import os
import uuid
import base64
from motor.motor_asyncio import AsyncIOMotorClient
from marketplace_models import (
    Product, ProductCreate, Order, OrderCreate, 
    Message, MessageCreate, Notification, Review, ReviewCreate,
    DashboardStats
)
from auth_models import User
from routes.auth import get_current_user
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

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
    await db.notifications.insert_one({
        "user_id": product["supplier_id"],
        "title": "Nouvelle commande",
        "message": f"Nouvelle commande {order_dict['order_number']} de {current_user['full_name']}",
        "type": "order",
        "action_url": f"/supplier/orders/{str(result.inserted_id)}",
        "created_at": datetime.utcnow(),
        "is_read": False
    })
    
    return order_dict

@router.get("/orders/my-orders", response_model=List[Order])
async def get_my_orders(
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if current_user.get("user_type") == "fournisseur":
        query["supplier_id"] = current_user["_id"]
    else:
        query["customer_id"] = current_user["_id"]
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(100)
    return [{**o, "_id": str(o["_id"])} for o in orders]

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

@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
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
    await db.notifications.insert_one({
        "user_id": order["customer_id"],
        "title": "Mise à jour de commande",
        "message": f"Votre commande {order['order_number']} est maintenant: {status}",
        "type": "order",
        "action_url": f"/orders/{order_id}",
        "created_at": datetime.utcnow(),
        "is_read": False
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