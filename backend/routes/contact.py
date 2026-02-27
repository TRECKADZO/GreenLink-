from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient
from models import ContactForm, ContactFormInDB

router = APIRouter(prefix="/api/contact", tags=["contact"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

@router.post("", response_model=ContactFormInDB)
async def create_contact(contact: ContactForm):
    contact_dict = contact.dict()
    result = await db.contacts.insert_one(contact_dict)
    contact_dict["_id"] = str(result.inserted_id)
    return contact_dict