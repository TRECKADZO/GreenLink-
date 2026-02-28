"""
Advanced Analytics and Data Export Service for GreenLink
Provides comprehensive analytics dashboards and data export functionality
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import csv
import io
import json
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ============= SUPPLIER ANALYTICS =============

@router.get("/supplier/dashboard")
async def get_supplier_analytics(
    period: str = Query("30d", description="7d, 30d, 90d, 1y, all"),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive analytics for supplier dashboard"""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Accès réservé aux fournisseurs")
    
    supplier_id = current_user["_id"]
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    elif period == "90d":
        start_date = now - timedelta(days=90)
    elif period == "1y":
        start_date = now - timedelta(days=365)
    else:
        start_date = datetime(2020, 1, 1)
    
    # Sales metrics
    orders = await db.orders.find({
        "supplier_id": supplier_id,
        "created_at": {"$gte": start_date}
    }).to_list(1000)
    
    total_revenue = sum(o.get("total_amount", 0) for o in orders)
    completed_orders = [o for o in orders if o.get("status") == "delivered"]
    completed_revenue = sum(o.get("total_amount", 0) for o in completed_orders)
    
    # Order status breakdown
    status_breakdown = {}
    for order in orders:
        status = order.get("status", "pending")
        status_breakdown[status] = status_breakdown.get(status, 0) + 1
    
    # Products performance
    products = await db.products.find({"supplier_id": supplier_id}).to_list(100)
    
    product_stats = []
    for product in products:
        product_orders = [o for o in orders if any(
            item.get("product_id") == str(product["_id"]) for item in o.get("items", [])
        )]
        product_revenue = sum(
            sum(item.get("price", 0) * item.get("quantity", 0) 
                for item in o.get("items", []) 
                if item.get("product_id") == str(product["_id"]))
            for o in product_orders
        )
        product_stats.append({
            "id": str(product["_id"]),
            "name": product.get("name"),
            "orders_count": len(product_orders),
            "revenue": product_revenue,
            "stock": product.get("stock_quantity", 0),
            "views": product.get("views", 0)
        })
    
    # Sort by revenue
    product_stats.sort(key=lambda x: x["revenue"], reverse=True)
    
    # Daily sales trend
    daily_sales = {}
    for order in orders:
        date_key = order.get("created_at").strftime("%Y-%m-%d") if order.get("created_at") else "unknown"
        if date_key not in daily_sales:
            daily_sales[date_key] = {"orders": 0, "revenue": 0}
        daily_sales[date_key]["orders"] += 1
        daily_sales[date_key]["revenue"] += order.get("total_amount", 0)
    
    # Customer insights
    unique_buyers = set(o.get("buyer_id") for o in orders)
    repeat_buyers = {}
    for order in orders:
        buyer_id = order.get("buyer_id")
        repeat_buyers[buyer_id] = repeat_buyers.get(buyer_id, 0) + 1
    repeat_count = sum(1 for count in repeat_buyers.values() if count > 1)
    
    # Average order metrics
    avg_order_value = total_revenue / len(orders) if orders else 0
    avg_items_per_order = sum(len(o.get("items", [])) for o in orders) / len(orders) if orders else 0
    
    return {
        "period": period,
        "summary": {
            "total_orders": len(orders),
            "completed_orders": len(completed_orders),
            "total_revenue": total_revenue,
            "completed_revenue": completed_revenue,
            "pending_revenue": total_revenue - completed_revenue,
            "avg_order_value": round(avg_order_value, 0),
            "avg_items_per_order": round(avg_items_per_order, 1)
        },
        "order_status": status_breakdown,
        "products": {
            "total": len(products),
            "top_performers": product_stats[:5],
            "low_stock": [p for p in product_stats if p["stock"] < 10]
        },
        "customers": {
            "unique_buyers": len(unique_buyers),
            "repeat_buyers": repeat_count,
            "retention_rate": round(repeat_count / len(unique_buyers) * 100, 1) if unique_buyers else 0
        },
        "trends": {
            "daily_sales": [
                {"date": k, **v} for k, v in sorted(daily_sales.items())[-30:]
            ]
        }
    }


@router.get("/buyer/dashboard")
async def get_buyer_analytics(
    period: str = Query("30d"),
    current_user: dict = Depends(get_current_user)
):
    """Get analytics for buyer dashboard"""
    if current_user.get("user_type") != "acheteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux acheteurs")
    
    buyer_id = current_user["_id"]
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    elif period == "90d":
        start_date = now - timedelta(days=90)
    else:
        start_date = datetime(2020, 1, 1)
    
    # Get orders
    orders = await db.orders.find({
        "buyer_id": buyer_id,
        "created_at": {"$gte": start_date}
    }).to_list(500)
    
    total_spent = sum(o.get("total_amount", 0) for o in orders)
    
    # Status breakdown
    status_breakdown = {}
    for order in orders:
        status = order.get("status", "pending")
        status_breakdown[status] = status_breakdown.get(status, 0) + 1
    
    # Favorite suppliers
    supplier_orders = {}
    for order in orders:
        supplier_id = order.get("supplier_id")
        if supplier_id:
            if supplier_id not in supplier_orders:
                supplier_orders[supplier_id] = {"orders": 0, "spent": 0, "name": order.get("supplier_name")}
            supplier_orders[supplier_id]["orders"] += 1
            supplier_orders[supplier_id]["spent"] += order.get("total_amount", 0)
    
    favorite_suppliers = sorted(
        [{"id": k, **v} for k, v in supplier_orders.items()],
        key=lambda x: x["spent"],
        reverse=True
    )[:5]
    
    # Purchase categories
    categories = {}
    for order in orders:
        for item in order.get("items", []):
            cat = item.get("category", "Autre")
            if cat not in categories:
                categories[cat] = {"items": 0, "spent": 0}
            categories[cat]["items"] += item.get("quantity", 1)
            categories[cat]["spent"] += item.get("price", 0) * item.get("quantity", 1)
    
    # Monthly spending trend
    monthly_spending = {}
    for order in orders:
        if order.get("created_at"):
            month_key = order["created_at"].strftime("%Y-%m")
            monthly_spending[month_key] = monthly_spending.get(month_key, 0) + order.get("total_amount", 0)
    
    # Active orders
    active_orders = [o for o in orders if o.get("status") not in ["delivered", "cancelled"]]
    
    return {
        "period": period,
        "summary": {
            "total_orders": len(orders),
            "total_spent": total_spent,
            "active_orders": len(active_orders),
            "avg_order_value": round(total_spent / len(orders), 0) if orders else 0
        },
        "order_status": status_breakdown,
        "favorite_suppliers": favorite_suppliers,
        "categories": [{"name": k, **v} for k, v in categories.items()],
        "spending_trend": [{"month": k, "amount": v} for k, v in sorted(monthly_spending.items())]
    }


# ============= DATA EXPORT =============

@router.get("/export/orders")
async def export_orders_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    """Export orders data as CSV"""
    user_type = current_user.get("user_type")
    
    query = {}
    if user_type == "fournisseur":
        query["supplier_id"] = current_user["_id"]
    elif user_type == "acheteur":
        query["buyer_id"] = current_user["_id"]
    elif user_type not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    if status_filter:
        query["status"] = status_filter
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(5000)
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "N° Commande", "Date", "Statut", "Client/Fournisseur", "Téléphone",
        "Adresse Livraison", "Ville", "Nb Articles", "Total (FCFA)",
        "Mode Paiement", "Livraison Estimée"
    ])
    
    for order in orders:
        writer.writerow([
            order.get("order_number", ""),
            order.get("created_at").strftime("%Y-%m-%d %H:%M") if order.get("created_at") else "",
            order.get("status", ""),
            order.get("buyer_name") if user_type == "fournisseur" else order.get("supplier_name", ""),
            order.get("delivery_phone", ""),
            order.get("delivery_address", ""),
            order.get("delivery_city", ""),
            len(order.get("items", [])),
            order.get("total_amount", 0),
            order.get("payment_method", ""),
            order.get("estimated_delivery", "")
        ])
    
    output.seek(0)
    
    filename = f"commandes_greenlink_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/products")
async def export_products_csv(
    current_user: dict = Depends(get_current_user)
):
    """Export products catalog as CSV (supplier only)"""
    if current_user.get("user_type") != "fournisseur":
        raise HTTPException(status_code=403, detail="Accès réservé aux fournisseurs")
    
    products = await db.products.find({
        "supplier_id": current_user["_id"]
    }).to_list(500)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "ID Produit", "Nom", "Catégorie", "Prix (FCFA)", "Stock",
        "Unité", "Description", "Statut", "Date Création"
    ])
    
    for product in products:
        writer.writerow([
            str(product.get("_id", "")),
            product.get("name", ""),
            product.get("category", ""),
            product.get("price", 0),
            product.get("stock_quantity", 0),
            product.get("unit", "kg"),
            product.get("description", "")[:100],
            "Actif" if product.get("is_active", True) else "Inactif",
            product.get("created_at").strftime("%Y-%m-%d") if product.get("created_at") else ""
        ])
    
    output.seek(0)
    filename = f"produits_greenlink_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/members")
async def export_cooperative_members(
    current_user: dict = Depends(get_current_user)
):
    """Export cooperative members as CSV"""
    if current_user.get("user_type") != "cooperative":
        raise HTTPException(status_code=403, detail="Accès réservé aux coopératives")
    
    members = await db.coop_members.find({
        "coop_id": current_user["_id"]
    }).to_list(1000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Nom Complet", "Téléphone", "Village", "N° CNI", "Statut",
        "Nb Parcelles", "Surface (ha)", "CO2 Capturé (t)", "Score Carbone",
        "Primes Reçues (FCFA)", "Date Inscription"
    ])
    
    for member in members:
        writer.writerow([
            member.get("full_name", ""),
            member.get("phone_number", ""),
            member.get("village", ""),
            member.get("cni_number", ""),
            member.get("status", ""),
            member.get("parcels_count", 0),
            member.get("total_hectares", 0),
            member.get("total_co2_tonnes", 0),
            member.get("average_carbon_score", 0),
            member.get("total_premium_earned", 0),
            member.get("created_at").strftime("%Y-%m-%d") if member.get("created_at") else ""
        ])
    
    output.seek(0)
    filename = f"membres_cooperative_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/transactions")
async def export_financial_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export financial transactions as CSV"""
    user_type = current_user.get("user_type")
    
    query = {}
    if user_type == "cooperative":
        query["coop_id"] = current_user["_id"]
    elif user_type == "fournisseur":
        query["supplier_id"] = current_user["_id"]
    elif user_type not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    # Get distributions (for cooperative)
    distributions = []
    if user_type == "cooperative":
        distributions = await db.coop_distributions.find(query).to_list(500)
    
    # Get orders (for supplier)
    orders = []
    if user_type == "fournisseur":
        orders = await db.orders.find({
            "supplier_id": current_user["_id"],
            "status": "delivered"
        }).to_list(500)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Date", "Type", "Référence", "Description", "Montant (FCFA)", "Statut"
    ])
    
    for dist in distributions:
        writer.writerow([
            dist.get("created_at").strftime("%Y-%m-%d %H:%M") if dist.get("created_at") else "",
            "Distribution Prime",
            dist.get("lot_name", ""),
            f"{dist.get('beneficiaries_count', 0)} bénéficiaires",
            dist.get("amount_distributed", 0),
            dist.get("status", "")
        ])
    
    for order in orders:
        writer.writerow([
            order.get("created_at").strftime("%Y-%m-%d %H:%M") if order.get("created_at") else "",
            "Vente",
            order.get("order_number", ""),
            f"Commande #{order.get('order_number', '')}",
            order.get("total_amount", 0),
            order.get("status", "")
        ])
    
    output.seek(0)
    filename = f"transactions_greenlink_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============= PLATFORM ANALYTICS (SUPER ADMIN) =============

@router.get("/platform/overview")
async def get_platform_overview(
    period: str = Query("30d"),
    current_user: dict = Depends(get_current_user)
):
    """Get platform-wide analytics (super admin only)"""
    if current_user.get("user_type") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    now = datetime.utcnow()
    if period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    elif period == "90d":
        start_date = now - timedelta(days=90)
    else:
        start_date = datetime(2020, 1, 1)
    
    # User statistics
    total_users = await db.users.count_documents({})
    new_users = await db.users.count_documents({"created_at": {"$gte": start_date}})
    
    users_by_type = {}
    for user_type in ["producteur", "acheteur", "fournisseur", "cooperative", "entreprise_rse"]:
        count = await db.users.count_documents({"user_type": user_type})
        users_by_type[user_type] = count
    
    # Order statistics
    total_orders = await db.orders.count_documents({"created_at": {"$gte": start_date}})
    orders = await db.orders.find({"created_at": {"$gte": start_date}}).to_list(5000)
    total_gmv = sum(o.get("total_amount", 0) for o in orders)
    
    # Carbon statistics
    total_carbon_credits = await db.carbon_credits.count_documents({})
    carbon_sold = await db.carbon_purchases.count_documents({"created_at": {"$gte": start_date}})
    
    # Cooperative statistics
    total_coops = await db.users.count_documents({"user_type": "cooperative"})
    total_coop_members = await db.coop_members.count_documents({})
    total_parcels = await db.parcels.count_documents({})
    
    # Calculate total hectares and CO2
    parcels = await db.parcels.find({}).to_list(10000)
    total_hectares = sum(p.get("area_hectares", 0) for p in parcels)
    total_co2 = sum(p.get("co2_captured_tonnes", 0) for p in parcels)
    
    return {
        "period": period,
        "users": {
            "total": total_users,
            "new_in_period": new_users,
            "by_type": users_by_type
        },
        "commerce": {
            "total_orders": total_orders,
            "gmv": total_gmv,
            "avg_order_value": round(total_gmv / total_orders, 0) if total_orders else 0
        },
        "carbon": {
            "total_credits": total_carbon_credits,
            "credits_sold": carbon_sold
        },
        "cooperatives": {
            "total": total_coops,
            "total_members": total_coop_members,
            "total_parcels": total_parcels,
            "total_hectares": round(total_hectares, 1),
            "total_co2_captured": round(total_co2, 1)
        }
    }
