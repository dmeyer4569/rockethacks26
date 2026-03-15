from bson import ObjectId
from models.database import db_manager


async def read_cases(title=None):
    query = {}
    if title is not None:
        query = {"title": title}
    cursor = db_manager.cases.find(query)
    cases = await cursor.to_list(length=None)
    for case in cases:
        if "_id" in case:
            case["_id"] = str(case["_id"])
    return cases


async def read_simulations(simulation_id=None):
    query = {}
    if simulation_id is not None:
        try:
            query = {"_id": ObjectId(simulation_id)}
        except Exception:
            query = {"_id": simulation_id}
    cursor = db_manager.simulations.find(query).sort("started_at", -1)
    simulations = await cursor.to_list(length=None)
    for simulation in simulations:
        if "_id" in simulation:
            simulation["_id"] = str(simulation["_id"])
        if "case_id" in simulation:
            simulation["case_id"] = str(simulation["case_id"])
    return simulations


async def read_rounds(simulation_id=None):
    query = {}
    if simulation_id is not None:
        if isinstance(simulation_id, str):
            try:
                simulation_id = ObjectId(simulation_id)
            except Exception:
                pass
        query = {"simulation_id": simulation_id}
    cursor = db_manager.rounds.find(query).sort("round_number", 1)
    rounds = await cursor.to_list(length=None)
    for round in rounds:
        if "_id" in round:
            round["_id"] = str(round["_id"])
        if "simulation_id" in round:
            round["simulation_id"] = str(round["simulation_id"])
    return rounds


async def read_personas(name=None):
    query = {}
    if name is not None:
        query = {"name": name}
    cursor = db_manager.personas.find(query)
    personas = await cursor.to_list(length=None)
    for persona in personas:
        if "_id" in persona:
            persona["_id"] = str(persona["_id"])
    return personas
