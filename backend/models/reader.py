from models.database import db_manager

async def read_cases(title=None):

    query = {}
    if title is not None:
        query = {"title": title}
    cursor = db_manager.cases.find(query)

    cases = await cursor.to_list(length=None)
    return cases

async def read_simulations(simulation_id=None):

    query = {}
    if simulation_id is not None: 
        query = {"simulation_id": simulation_id}

    cursor = db_manager.simulations.find(query)

    simulations = await cursor.to_list(length=None)
    return simulations

async def read_rounds(simulation_id=None):

    query = {}
    if simulation_id is not None: 
        query = {"simulation_id": simulation_id}

    cursor = db_manager.rounds.find(query)

    rounds = await cursor.to_list(length=None)
    return rounds

async def read_personas(name=None):

    query = {}
    if name is not None: 
        query = {"name": name}

    cursor = db_manager.personas.find(query)

    personas = await cursor.to_list(length=None)
    return personas
