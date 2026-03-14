from datetime import datetime, timezone
from models.database import db_manager

async def insert_case(title, description, initial_policy, supporting_data, category):
    document = {
        "title": title,
        "description": description,
        "initial_policy": initial_policy,
        "supporting_data": supporting_data,
        "category": category,
        "created_at": datetime.now(timezone.utc)
    }

    # Access the collection from the central manager
    result = await db_manager.cases.insert_one(document)
    return result.inserted_id
