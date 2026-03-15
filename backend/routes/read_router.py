from fastapi import APIRouter, HTTPException
from models.reader import read_cases, read_simulations, read_rounds, read_personas

router = APIRouter(
    prefix="/read",
    tags=["read"]
)


@router.get("/cases/")
async def get_cases(case: str | None = None):
    cases = await read_cases(case)
    return {"contents": cases}


@router.get("/simulations/")
async def get_simulations(simulation: str | None = None):
    simulations = await read_simulations(simulation)
    return {"contents": simulations}


@router.get("/simulations/{sim_id}")
async def get_simulation_by_id(sim_id: str):
    results = await read_simulations(simulation_id=sim_id)
    if not results:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return results[0]


@router.get("/rounds/")
async def get_rounds(round: str | None = None):
    rounds = await read_rounds(round)
    return {"rounds": rounds}


@router.get("/personas/")
async def get_personas(persona: str | None = None):
    personas = await read_personas(persona)
    return {"contents": personas}
