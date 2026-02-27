from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Feature(BaseModel):
    icon: str
    title: str
    description: str
    badge: Optional[str] = None
    badgeColor: Optional[str] = None
    order: int

class FeatureInDB(Feature):
    id: str = Field(alias="_id")

class Step(BaseModel):
    number: str
    icon: str
    title: str
    description: str
    order: int

class StepInDB(Step):
    id: str = Field(alias="_id")

class Crop(BaseModel):
    icon: str
    title: str
    locations: str
    color: str
    order: int

class CropInDB(Crop):
    id: str = Field(alias="_id")

class Producer(BaseModel):
    name: str
    initial: str
    crop: str
    location: str
    color: str
    order: int

class ProducerInDB(Producer):
    id: str = Field(alias="_id")

class Testimonial(BaseModel):
    text: str
    author: str
    role: str
    initial: str
    color: str
    order: int

class TestimonialInDB(Testimonial):
    id: str = Field(alias="_id")

class PricingPlan(BaseModel):
    name: str
    price: str
    period: str
    badge: Optional[str] = None
    popular: bool
    features: List[str]
    cta: str
    ctaVariant: str
    order: int

class PricingPlanInDB(PricingPlan):
    id: str = Field(alias="_id")

class ContactForm(BaseModel):
    name: str
    email: str
    message: str
    userType: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class ContactFormInDB(ContactForm):
    id: str = Field(alias="_id")