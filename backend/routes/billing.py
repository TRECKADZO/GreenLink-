# Billing & Payment Tracking Routes for GreenLink
# Super Admin module for managing invoices, payments, and distributions

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from enum import Enum
import uuid
import logging

from database import db
from routes.auth import get_current_user
from carbon_business_model import USD_TO_FCFA, GREENLINK_MARGIN_RATE, FARMER_SHARE_RATE, COOPERATIVE_SHARE_RATE, COST_STRUCTURE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    PARTIAL = "partial"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    ORANGE_MONEY = "orange_money"
    WIRE = "wire"
    CHECK = "check"
    ESCROW = "escrow"


class DistributionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ============= INVOICE MODELS =============

class InvoiceCreate(BaseModel):
    sale_id: Optional[str] = None
    buyer_name: str
    buyer_email: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_tax_id: Optional[str] = None
    
    # Items
    description: str
    tonnes_co2: float
    price_per_tonne_usd: float
    
    # Payment terms
    payment_terms_days: int = 30
    notes: Optional[str] = None


class PaymentRecord(BaseModel):
    invoice_id: str
    amount_usd: float
    payment_method: PaymentMethod
    payment_reference: str
    payment_date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


# ============= INVOICES =============

@router.post("/invoices/create")
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new invoice for carbon credit sale"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    # Calculate amounts
    subtotal_usd = invoice_data.tonnes_co2 * invoice_data.price_per_tonne_usd
    subtotal_fcfa = subtotal_usd * USD_TO_FCFA
    
    # Generate invoice number
    year = datetime.utcnow().year
    month = datetime.utcnow().month
    count = await db.invoices.count_documents({"year": year}) + 1
    invoice_number = f"GL-{year}{month:02d}-{count:04d}"
    
    now = datetime.utcnow()
    due_date = now + timedelta(days=invoice_data.payment_terms_days)
    
    invoice = {
        "invoice_number": invoice_number,
        "sale_id": invoice_data.sale_id,
        "year": year,
        
        # Buyer info
        "buyer_name": invoice_data.buyer_name,
        "buyer_email": invoice_data.buyer_email,
        "buyer_address": invoice_data.buyer_address,
        "buyer_tax_id": invoice_data.buyer_tax_id,
        
        # Line items
        "items": [{
            "description": invoice_data.description,
            "quantity": invoice_data.tonnes_co2,
            "unit": "tonnes CO2",
            "unit_price_usd": invoice_data.price_per_tonne_usd,
            "total_usd": subtotal_usd
        }],
        
        # Totals
        "subtotal_usd": subtotal_usd,
        "subtotal_fcfa": subtotal_fcfa,
        "tax_rate": 0,
        "tax_amount_usd": 0,
        "total_usd": subtotal_usd,
        "total_fcfa": subtotal_fcfa,
        
        # Payment tracking
        "amount_paid_usd": 0,
        "amount_due_usd": subtotal_usd,
        "payments": [],
        
        # Status & dates
        "status": InvoiceStatus.DRAFT.value,
        "issue_date": now,
        "due_date": due_date,
        "payment_terms_days": invoice_data.payment_terms_days,
        
        # Metadata
        "notes": invoice_data.notes,
        "created_by": str(current_user["_id"]),
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.invoices.insert_one(invoice)
    invoice["_id"] = str(result.inserted_id)
    
    logger.info(f"Invoice created: {invoice_number} for {subtotal_usd} USD")
    
    return {
        "success": True,
        "invoice": invoice,
        "message": f"Facture {invoice_number} créée"
    }


@router.get("/invoices")
async def get_invoices(
    status: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices with optional filters"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = {}
    if status:
        query["status"] = status
    if year:
        query["year"] = year
    
    invoices = await db.invoices.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Update overdue status
    now = datetime.utcnow()
    for inv in invoices:
        inv["_id"] = str(inv["_id"])
        if inv["status"] in ["sent", "partial"] and inv.get("due_date"):
            if inv["due_date"] < now:
                inv["status"] = "overdue"
                await db.invoices.update_one(
                    {"_id": ObjectId(inv["_id"])},
                    {"$set": {"status": "overdue"}}
                )
    
    # Calculate summary
    total_invoiced = sum(i.get("total_usd", 0) for i in invoices)
    total_paid = sum(i.get("amount_paid_usd", 0) for i in invoices)
    total_pending = sum(i.get("amount_due_usd", 0) for i in invoices if i["status"] in ["sent", "partial"])
    total_overdue = sum(i.get("amount_due_usd", 0) for i in invoices if i["status"] == "overdue")
    
    return {
        "invoices": invoices,
        "summary": {
            "total_invoiced_usd": round(total_invoiced, 2),
            "total_paid_usd": round(total_paid, 2),
            "total_pending_usd": round(total_pending, 2),
            "total_overdue_usd": round(total_overdue, 2),
            "count": len(invoices)
        }
    }


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific invoice with full details"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    invoice["_id"] = str(invoice["_id"])
    
    # Get related sale if exists
    if invoice.get("sale_id"):
        sale = await db.carbon_sales.find_one({"_id": ObjectId(invoice["sale_id"])})
        if sale:
            sale["_id"] = str(sale["_id"])
            invoice["sale"] = sale
    
    return invoice


@router.put("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark invoice as sent to buyer"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    result = await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {
            "$set": {
                "status": InvoiceStatus.SENT.value,
                "sent_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    return {"success": True, "message": "Facture marquée comme envoyée"}


# ============= PAYMENTS =============

@router.post("/payments/record")
async def record_payment(
    payment: PaymentRecord,
    current_user: dict = Depends(get_current_user)
):
    """Record a payment received for an invoice"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    # Get invoice
    invoice = await db.invoices.find_one({"_id": ObjectId(payment.invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Calculate new amounts
    new_paid = invoice.get("amount_paid_usd", 0) + payment.amount_usd
    new_due = invoice.get("total_usd", 0) - new_paid
    
    # Determine new status
    if new_due <= 0:
        new_status = InvoiceStatus.PAID.value
    elif new_paid > 0:
        new_status = InvoiceStatus.PARTIAL.value
    else:
        new_status = invoice.get("status")
    
    # Create payment record
    payment_record = {
        "id": str(uuid.uuid4()),
        "amount_usd": payment.amount_usd,
        "amount_fcfa": payment.amount_usd * USD_TO_FCFA,
        "method": payment.payment_method.value,
        "reference": payment.payment_reference,
        "date": payment.payment_date,
        "notes": payment.notes,
        "recorded_by": str(current_user["_id"]),
        "recorded_at": datetime.utcnow()
    }
    
    # Update invoice
    await db.invoices.update_one(
        {"_id": ObjectId(payment.invoice_id)},
        {
            "$set": {
                "amount_paid_usd": new_paid,
                "amount_due_usd": max(0, new_due),
                "status": new_status,
                "updated_at": datetime.utcnow()
            },
            "$push": {"payments": payment_record}
        }
    )
    
    # If fully paid, trigger distribution process
    if new_status == InvoiceStatus.PAID.value and invoice.get("sale_id"):
        await create_distribution_from_sale(invoice["sale_id"], str(current_user["_id"]))
    
    logger.info(f"Payment recorded: {payment.amount_usd} USD for invoice {invoice.get('invoice_number')}")
    
    return {
        "success": True,
        "payment": payment_record,
        "invoice_status": new_status,
        "amount_remaining_usd": max(0, new_due),
        "message": "Paiement enregistré avec succès"
    }


@router.get("/payments/history")
async def get_payment_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get payment history across all invoices"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    # Get all invoices with payments
    invoices = await db.invoices.find(
        {"payments": {"$exists": True, "$ne": []}}
    ).sort("updated_at", -1).limit(limit).to_list(limit)
    
    # Flatten payments
    all_payments = []
    for inv in invoices:
        for p in inv.get("payments", []):
            p["invoice_id"] = str(inv["_id"])
            p["invoice_number"] = inv.get("invoice_number")
            p["buyer_name"] = inv.get("buyer_name")
            all_payments.append(p)
    
    # Sort by date
    all_payments.sort(key=lambda x: x.get("date", datetime.min), reverse=True)
    
    # Calculate totals
    total_received = sum(p.get("amount_usd", 0) for p in all_payments)
    
    return {
        "payments": all_payments[:limit],
        "summary": {
            "total_received_usd": round(total_received, 2),
            "total_received_fcfa": round(total_received * USD_TO_FCFA, 0),
            "payment_count": len(all_payments)
        }
    }


# ============= DISTRIBUTIONS =============

async def create_distribution_from_sale(sale_id: str, created_by: str):
    """Create distribution records when a sale is paid"""
    sale = await db.carbon_sales.find_one({"_id": ObjectId(sale_id)})
    if not sale:
        return
    
    distribution_data = sale.get("distribution", {})
    farmer_distributions = distribution_data.get("farmer_distributions", [])
    
    # Create main distribution record
    distribution = {
        "sale_id": sale_id,
        "total_gross_usd": distribution_data.get("total_gross_usd", 0),
        "total_gross_fcfa": distribution_data.get("total_gross_fcfa", 0),
        
        # Amounts to distribute
        "greenlink_share_usd": distribution_data.get("greenlink_share_usd", 0),
        "greenlink_share_fcfa": distribution_data.get("greenlink_share_fcfa", 0),
        "farmers_share_usd": distribution_data.get("farmers_share_usd", 0),
        "farmers_share_fcfa": distribution_data.get("farmers_share_fcfa", 0),
        "coop_share_usd": distribution_data.get("cooperative_share_usd", 0),
        "coop_share_fcfa": distribution_data.get("cooperative_share_fcfa", 0),
        
        # Status tracking
        "status": DistributionStatus.PENDING.value,
        "farmer_count": len(farmer_distributions),
        "farmers_paid": 0,
        "farmers_pending": len(farmer_distributions),
        
        # Farmer details
        "farmer_distributions": farmer_distributions,
        
        "created_by": created_by,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.distributions.insert_one(distribution)
    
    # Update sale status
    await db.carbon_sales.update_one(
        {"_id": ObjectId(sale_id)},
        {
            "$set": {
                "distribution_id": str(result.inserted_id),
                "status": "distribution_pending",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logger.info(f"Distribution created for sale {sale_id}: {len(farmer_distributions)} farmers")
    
    return str(result.inserted_id)


@router.get("/distributions")
async def get_distributions(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all distributions"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = {}
    if status:
        query["status"] = status
    
    distributions = await db.distributions.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    for d in distributions:
        d["_id"] = str(d["_id"])
    
    # Summary
    total_to_distribute = sum(d.get("farmers_share_fcfa", 0) for d in distributions)
    total_distributed = sum(
        d.get("farmers_share_fcfa", 0) 
        for d in distributions 
        if d.get("status") == "completed"
    )
    
    return {
        "distributions": distributions,
        "summary": {
            "total_to_distribute_fcfa": round(total_to_distribute, 0),
            "total_distributed_fcfa": round(total_distributed, 0),
            "pending_count": len([d for d in distributions if d.get("status") == "pending"])
        }
    }


@router.get("/distributions/{distribution_id}")
async def get_distribution_detail(
    distribution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed distribution with farmer breakdown"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    distribution = await db.distributions.find_one({"_id": ObjectId(distribution_id)})
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")
    
    distribution["_id"] = str(distribution["_id"])
    
    return distribution


@router.post("/distributions/{distribution_id}/process")
async def process_distribution(
    distribution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Start processing farmer payments for a distribution"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    distribution = await db.distributions.find_one({"_id": ObjectId(distribution_id)})
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")
    
    if distribution.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Cette distribution est déjà en cours ou terminée")
    
    # Update status to processing
    await db.distributions.update_one(
        {"_id": ObjectId(distribution_id)},
        {
            "$set": {
                "status": DistributionStatus.PROCESSING.value,
                "processing_started_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # In production, this would trigger Orange Money payments
    # For now, we'll simulate the process
    
    return {
        "success": True,
        "message": "Distribution en cours de traitement",
        "farmer_count": distribution.get("farmer_count", 0),
        "total_amount_fcfa": distribution.get("farmers_share_fcfa", 0)
    }


@router.post("/distributions/{distribution_id}/mark-farmer-paid")
async def mark_farmer_paid(
    distribution_id: str,
    farmer_id: str,
    payment_ref: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a single farmer as paid in a distribution"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    distribution = await db.distributions.find_one({"_id": ObjectId(distribution_id)})
    if not distribution:
        raise HTTPException(status_code=404, detail="Distribution non trouvée")
    
    # Update farmer status
    farmer_distributions = distribution.get("farmer_distributions", [])
    farmer_found = False
    
    for fd in farmer_distributions:
        if fd.get("farmer_id") == farmer_id:
            fd["paid"] = True
            fd["paid_at"] = datetime.utcnow()
            fd["payment_ref"] = payment_ref
            farmer_found = True
            break
    
    if not farmer_found:
        raise HTTPException(status_code=404, detail="Planteur non trouvé dans cette distribution")
    
    # Update counts
    farmers_paid = len([fd for fd in farmer_distributions if fd.get("paid")])
    farmers_pending = len(farmer_distributions) - farmers_paid
    
    new_status = DistributionStatus.COMPLETED.value if farmers_pending == 0 else distribution.get("status")
    
    await db.distributions.update_one(
        {"_id": ObjectId(distribution_id)},
        {
            "$set": {
                "farmer_distributions": farmer_distributions,
                "farmers_paid": farmers_paid,
                "farmers_pending": farmers_pending,
                "status": new_status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # If all paid, update sale status
    if new_status == DistributionStatus.COMPLETED.value:
        sale_id = distribution.get("sale_id")
        if sale_id:
            await db.carbon_sales.update_one(
                {"_id": ObjectId(sale_id)},
                {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
            )
    
    return {
        "success": True,
        "farmers_paid": farmers_paid,
        "farmers_pending": farmers_pending,
        "distribution_status": new_status
    }


# ============= FINANCIAL DASHBOARD =============

@router.get("/dashboard")
async def get_billing_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive billing dashboard for Super Admin"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month
    
    # Invoice stats
    all_invoices = await db.invoices.find({}).to_list(1000)
    
    total_invoiced_usd = sum(i.get("total_usd", 0) for i in all_invoices)
    total_paid_usd = sum(i.get("amount_paid_usd", 0) for i in all_invoices)
    total_pending_usd = sum(
        i.get("amount_due_usd", 0) 
        for i in all_invoices 
        if i.get("status") in ["sent", "partial"]
    )
    total_overdue_usd = sum(
        i.get("amount_due_usd", 0) 
        for i in all_invoices 
        if i.get("status") == "overdue" or (
            i.get("status") in ["sent", "partial"] and 
            i.get("due_date", now) < now
        )
    )
    
    # This month stats
    month_start = datetime(current_year, current_month, 1)
    month_invoices = [i for i in all_invoices if i.get("created_at", datetime.min) >= month_start]
    month_invoiced = sum(i.get("total_usd", 0) for i in month_invoices)
    month_paid = sum(i.get("amount_paid_usd", 0) for i in month_invoices)
    
    # Distribution stats
    all_distributions = await db.distributions.find({}).to_list(1000)
    
    total_to_farmers_fcfa = sum(d.get("farmers_share_fcfa", 0) for d in all_distributions)
    distributed_fcfa = sum(
        d.get("farmers_share_fcfa", 0) 
        for d in all_distributions 
        if d.get("status") == "completed"
    )
    pending_distribution_fcfa = sum(
        d.get("farmers_share_fcfa", 0) 
        for d in all_distributions 
        if d.get("status") in ["pending", "processing"]
    )
    
    # GreenLink revenue
    greenlink_total_usd = sum(d.get("greenlink_share_usd", 0) for d in all_distributions)
    
    # Recent activity
    recent_invoices = sorted(all_invoices, key=lambda x: x.get("created_at", datetime.min), reverse=True)[:5]
    for inv in recent_invoices:
        inv["_id"] = str(inv["_id"])
    
    recent_payments = []
    for inv in all_invoices:
        for p in inv.get("payments", []):
            p["invoice_number"] = inv.get("invoice_number")
            p["buyer_name"] = inv.get("buyer_name")
            recent_payments.append(p)
    recent_payments = sorted(recent_payments, key=lambda x: x.get("date", datetime.min), reverse=True)[:5]
    
    return {
        "overview": {
            "total_invoiced_usd": round(total_invoiced_usd, 2),
            "total_invoiced_fcfa": round(total_invoiced_usd * USD_TO_FCFA, 0),
            "total_paid_usd": round(total_paid_usd, 2),
            "total_paid_fcfa": round(total_paid_usd * USD_TO_FCFA, 0),
            "total_pending_usd": round(total_pending_usd, 2),
            "total_overdue_usd": round(total_overdue_usd, 2),
            "collection_rate": round((total_paid_usd / total_invoiced_usd * 100) if total_invoiced_usd > 0 else 0, 1)
        },
        "this_month": {
            "invoiced_usd": round(month_invoiced, 2),
            "paid_usd": round(month_paid, 2),
            "invoice_count": len(month_invoices)
        },
        "distributions": {
            "total_to_farmers_fcfa": round(total_to_farmers_fcfa, 0),
            "distributed_fcfa": round(distributed_fcfa, 0),
            "pending_fcfa": round(pending_distribution_fcfa, 0),
            "distribution_rate": round((distributed_fcfa / total_to_farmers_fcfa * 100) if total_to_farmers_fcfa > 0 else 0, 1)
        },
        "greenlink_revenue": {
            "total_margin_usd": round(greenlink_total_usd, 2),
            "total_margin_fcfa": round(greenlink_total_usd * USD_TO_FCFA, 0)
        },
        "recent_invoices": recent_invoices,
        "recent_payments": recent_payments,
        "invoice_counts": {
            "draft": len([i for i in all_invoices if i.get("status") == "draft"]),
            "sent": len([i for i in all_invoices if i.get("status") == "sent"]),
            "partial": len([i for i in all_invoices if i.get("status") == "partial"]),
            "paid": len([i for i in all_invoices if i.get("status") == "paid"]),
            "overdue": len([i for i in all_invoices if i.get("status") == "overdue"])
        }
    }


@router.get("/reports/monthly")
async def get_monthly_report(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed monthly financial report"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    now = datetime.utcnow()
    year = year or now.year
    month = month or now.month
    
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    # Get invoices for the month
    invoices = await db.invoices.find({
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
    
    # Get payments for the month
    all_invoices = await db.invoices.find({"payments": {"$exists": True}}).to_list(1000)
    month_payments = []
    for inv in all_invoices:
        for p in inv.get("payments", []):
            p_date = p.get("date")
            if p_date and start_date <= p_date < end_date:
                p["invoice_number"] = inv.get("invoice_number")
                p["buyer_name"] = inv.get("buyer_name")
                month_payments.append(p)
    
    # Get distributions for the month
    distributions = await db.distributions.find({
        "created_at": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
    
    # Calculate metrics
    invoiced_usd = sum(i.get("total_usd", 0) for i in invoices)
    payments_usd = sum(p.get("amount_usd", 0) for p in month_payments)
    distributed_fcfa = sum(d.get("farmers_share_fcfa", 0) for d in distributions if d.get("status") == "completed")
    greenlink_usd = sum(d.get("greenlink_share_usd", 0) for d in distributions)
    
    return {
        "period": {
            "year": year,
            "month": month,
            "month_name": [
                "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
            ][month - 1]
        },
        "invoicing": {
            "total_invoiced_usd": round(invoiced_usd, 2),
            "total_invoiced_fcfa": round(invoiced_usd * USD_TO_FCFA, 0),
            "invoice_count": len(invoices)
        },
        "collections": {
            "total_collected_usd": round(payments_usd, 2),
            "total_collected_fcfa": round(payments_usd * USD_TO_FCFA, 0),
            "payment_count": len(month_payments)
        },
        "distributions": {
            "total_distributed_fcfa": round(distributed_fcfa, 0),
            "distribution_count": len(distributions),
            "farmers_paid": sum(d.get("farmers_paid", 0) for d in distributions)
        },
        "greenlink_revenue": {
            "margin_usd": round(greenlink_usd, 2),
            "margin_fcfa": round(greenlink_usd * USD_TO_FCFA, 0)
        }
    }
