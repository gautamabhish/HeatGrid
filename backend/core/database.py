import os
from motor.motor_asyncio import AsyncIOMotorClient

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def connect_to_mongo():
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("Warning: MONGODB_URI not found. Caching will be disabled.")
        return
        
    print("Connecting to MongoDB...")
    db.client = AsyncIOMotorClient(mongo_uri)
    try:
        # Ping the database to verify connection
        await db.client.admin.command('ping')
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        db.client = None

async def close_mongo_connection():
    if db.client:
        print("Closing MongoDB connection...")
        db.client.close()
        print("MongoDB connection closed.")

def get_database():
    if db.client:
        return db.client.cache
    return None

def get_city_collection():
    database = get_database()
    if database is not None:
        return database.city_analysis
    return None
