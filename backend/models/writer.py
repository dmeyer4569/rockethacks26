from datetime import datetime, timezone
from bson import ObjectId
from models.database import db_manager

# Save case to MongoDB
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
# Save simulation_data to MongoDB
async def insert_simulation(status, config, finished_round, final_policy, final_cas, case_id=None, case_title=None, agents=None, agent_personalities=None):
    document = {
        "status": status,
        "config": config,
        "finished_round": finished_round,
        "final_policy": final_policy,
        "final_cas": final_cas,
        "case_id": case_id,
        "case_title": case_title,
        "agents": agents or [],
        "agent_personalities": agent_personalities or {},
        "started_at": datetime.now(timezone.utc),
        "completed_at": datetime.now(timezone.utc)
    }

    result = await db_manager.simulations.insert_one(document)
    return result.inserted_id

async def update_simulation(sim_id, status, finished_round, final_policy, final_cas):
    await db_manager.simulations.update_one(
        {"_id": sim_id},
        {"$set": {
            "status": status,
            "finished_round": finished_round,
            "final_policy": final_policy,
            "final_cas": final_cas,
            "completed_at": datetime.now(timezone.utc),
        }}
    )

# Save a round to MongoDB
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
        "completed_at": datetime.now(timezone.utc)
    }

    result = await db_manager.rounds.insert_one(document)
    return result.inserted_id

# Insert a Persona into MongoDB
async def update_persona(persona_id, **fields):
    update = {k: v for k, v in fields.items() if v is not None}
    if update:
        await db_manager.personas.update_one(
            {"_id": ObjectId(persona_id)},
            {"$set": update}
        )


async def insert_persona(name, description, priorities, risk_tolerance, values, custom_prompt=""):
    document = {
        "name": name,
        "description": description,
        "priorities": priorities,
        "risk_tolerance": risk_tolerance,
        "values": values,
        "custom_prompt": custom_prompt,
    }

    result = await db_manager.personas.insert_one(document)
    return result.inserted_id
