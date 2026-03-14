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

async def insert_simulation(status, config, finished_round, final_policy, final_cas): #add a started_at data later. 
    document = {
        "status": status,
        "config": config,
        "finished_round": finished_round,
        "final_policy": final_policy,
        "final_cas": final_cas,
        "started_at": datetime.now(timezone.utc),
        "completed_at": datetime.now(timezone.utc)
    }

    result = await db_manager.simulations.insert_one(document)
    return result.inserted_id

async def insert_round(
    simulation_id, round_number, base_policy, personas_used, 
    proposals, winning_proposal_index, winning_cas
):
    document = {
        "simulation_id": simulation_id,
        "round_number": round_number,
        "base_policy": base_policy,
        "personas_used": personas_used,
        "proposals": proposals,
        "winning_proposal_index": winning_proposal_index,
        "winning_cas": winning_cas,
        "completed_at": datetime.now(timezone.utc)\
    }

    result = await db_manager.rounds.insert_one(document)
    return result.inserted_id
    
