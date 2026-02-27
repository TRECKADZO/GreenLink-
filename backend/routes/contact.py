from fastapi import APIRouter
import os
from database import db
from models import ContactForm, ContactFormInDB

router = APIRouter(prefix="/api/contact", tags=["contact"])

@router.post("", response_model=ContactFormInDB)
async def create_contact(contact: ContactForm):
    contact_dict = contact.dict()
    result = await db.contacts.insert_one(contact_dict)
    contact_dict["_id"] = str(result.inserted_id)
    return contact_dict