from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Product Models
class ProductBase(BaseModel):
    name: str
    category: str  # engrais, pesticides, semences, outils, equipements
    description: str
    price: float
    unit: str  # kg, litre, sac, piece
    stock_quantity: int
    images: List[str] = []
    specifications: Optional[dict] = None
    
class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: str = Field(alias="_id")
    supplier_id: str
    supplier_name: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    total_sales: int = 0
    rating: float = 0.0
    reviews_count: int = 0

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    total_price: float

class OrderBase(BaseModel):
    items: List[OrderItem]
    total_amount: float
    delivery_address: str
    delivery_location: str
    payment_method: str  # mobile_money, cash_on_delivery, bank_transfer
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class Order(OrderBase):
    id: str = Field(alias="_id")
    order_number: str
    customer_id: str
    customer_name: str
    customer_phone: str
    supplier_id: str
    supplier_name: str
    status: str  # pending, confirmed, preparing, shipped, delivered, cancelled
    created_at: datetime
    updated_at: datetime
    estimated_delivery: Optional[datetime] = None

# Message Models
class MessageBase(BaseModel):
    content: str
    
class MessageCreate(MessageBase):
    receiver_id: str

class Message(MessageBase):
    id: str = Field(alias="_id")
    sender_id: str
    sender_name: str
    receiver_id: str
    receiver_name: str
    conversation_id: str
    created_at: datetime
    is_read: bool
    
# Notification Models
class NotificationBase(BaseModel):
    title: str
    message: str
    type: str  # order, message, product, system
    action_url: Optional[str] = None
    
class Notification(NotificationBase):
    id: str = Field(alias="_id")
    user_id: str
    created_at: datetime
    is_read: bool
    
# Review Models
class ReviewBase(BaseModel):
    product_id: str
    rating: int  # 1-5
    comment: str
    
class ReviewCreate(ReviewBase):
    pass

class Review(ReviewBase):
    id: str = Field(alias="_id")
    customer_id: str
    customer_name: str
    created_at: datetime

# Dashboard Stats
class DashboardStats(BaseModel):
    total_products: int
    active_products: int
    total_orders: int
    pending_orders: int
    total_revenue: float
    monthly_revenue: float
    total_customers: int
    unread_messages: int
    low_stock_products: int
    recent_orders: List[dict]
    top_products: List[dict]
    revenue_chart: List[dict]