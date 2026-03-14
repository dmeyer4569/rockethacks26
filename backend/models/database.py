import os 
import asyncio

from pymongo import AsyncMongoClient
from dotenv import load_dotenv

load_dotenv()

class MongoDBManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.cases = None

    async def connect(self):
        # Update with your actual Atlas connection string
        uri = os.getenv("DATABASE_URI")  
        self.client = AsyncMongoClient(uri)
        self.db= self.client.get_database("agents")
        
        # Define your collections here
        self.cases = self.db.get_collection("cases")
        print("Connected to Atlas via Native Async Driver")

    async def close(self):
        if self.client:
            await self.client.close()
            print("Connection closed")

# Create a single instance to share across files
db_manager = MongoDBManager()
