import asyncio
from fastapi import APIRouter, HTTPException
from models.schema import CaseCreate, SimulationCreate, PersonaCreate, PersonaUpdate
from models.writer import insert_case, insert_persona, update_persona, insert_simulation
from models.reader import read_cases, read_personas, read_simulations
from services.mediator import run_simulation

router = APIRouter(
    prefix="/write",
    tags=["write"]
)

DEFAULT_PERSONAS = [
    {"name": "Small Business Owner", "description": "Runs a restaurant with 12 employees.", "priorities": ["low labor costs", "profit margins"], "risk_tolerance": "low", "values": ["self-reliance", "economic freedom"]},
    {"name": "Low-Wage Worker", "description": "Works two part-time jobs at minimum wage.", "priorities": ["higher pay", "job security"], "risk_tolerance": "medium", "values": ["fairness", "dignity"]},
    {"name": "Corporate HR Director", "description": "Manages compensation for a national retail chain.", "priorities": ["cost control", "workforce stability"], "risk_tolerance": "medium", "values": ["efficiency", "compliance"]},
    {"name": "Labor Economist", "description": "Academic researcher studying wage policy effects.", "priorities": ["data-driven outcomes", "employment levels"], "risk_tolerance": "high", "values": ["evidence", "equity"]},
    {"name": "Chamber of Commerce Rep", "description": "Lobbies on behalf of regional businesses.", "priorities": ["business competitiveness", "low regulation"], "risk_tolerance": "low", "values": ["growth", "free markets"]},
]


@router.post("/personas")
async def post_persona(body: PersonaCreate):
    existing = await read_personas(name=body.name)
    if existing:
        return {"persona_id": existing[0]["_id"]}
    result = await insert_persona(
        body.name, body.description, body.priorities,
        body.risk_tolerance, body.values, body.custom_prompt,
    )
    return {"persona_id": str(result)}


@router.put("/personas/{persona_id}")
async def put_persona(persona_id: str, body: PersonaUpdate):
    fields = body.model_dump(exclude_none=True)
    await update_persona(persona_id, **fields)
    return {"message": "Updated"}


@router.post("/cases")
async def post_case(body: CaseCreate):
    result = await insert_case(
        body.title, body.description, body.initial_policy,
        body.supporting_data, body.category,
    )
    return {"message": f"Success, caseID {result}", "case_id": str(result)}


@router.post("/simulations")
async def post_simulation(body: SimulationCreate):
    cases = await read_cases(title=body.title)
    if not cases:
        case_id = await insert_case(
            body.title, body.description, body.initial_policy,
            body.supporting_data, body.category,
        )
        case_id = str(case_id)
    else:
        case_id = cases[0]["_id"]

    existing_personas = await read_personas()
    if len(existing_personas) < body.num_agents:
        for p in DEFAULT_PERSONAS:
            existing = await read_personas(name=p["name"])
            if not existing:
                await insert_persona(
                    p["name"], p["description"], p["priorities"],
                    p["risk_tolerance"], p["values"],
                )

    agents = [a.model_dump() for a in body.agents]
    agent_personalities = {k: v.model_dump() for k, v in body.agent_personalities.items()}

    config = {
        "num_agents": body.num_agents,
        "lambda": 0.5,
        "convergence_threshold": body.cas_threshold,
        "variance-threshold": body.variance_threshold,
        "max_rounds": body.max_rounds,
        "convergence_mode": body.convergence_mode,
    }
    sim_id = await insert_simulation(
        status="running",
        config=config,
        finished_round=None,
        final_policy=None,
        final_cas=None,
        case_id=case_id,
        case_title=body.title,
        agents=agents,
        agent_personalities=agent_personalities,
    )

    asyncio.create_task(run_simulation(
        sim_id=sim_id,
        case_name=body.title,
        max_rounds=body.max_rounds,
        num_agents=body.num_agents,
        cas_threshold=body.cas_threshold,
        variance_threshold=body.variance_threshold,
        convergence_mode=body.convergence_mode,
        agents=agents,
        agent_personalities=agent_personalities,
    ))

    return {"simulation_id": str(sim_id)}


@router.post("/simulations/{sim_id}/rerun")
async def rerun_simulation(sim_id: str):
    sims = await read_simulations(simulation_id=sim_id)
    if not sims:
        raise HTTPException(status_code=404, detail="Simulation not found")

    original = sims[0]
    config = original["config"]
    case_title = original.get("case_title")
    agents = original.get("agents", [])
    agent_personalities = original.get("agent_personalities", {})

    new_sim_id = await insert_simulation(
        status="running",
        config=config,
        finished_round=None,
        final_policy=None,
        final_cas=None,
        case_id=original.get("case_id"),
        case_title=case_title,
        agents=agents,
        agent_personalities=agent_personalities,
    )

    asyncio.create_task(run_simulation(
        sim_id=new_sim_id,
        case_name=case_title,
        max_rounds=config["max_rounds"],
        num_agents=config["num_agents"],
        cas_threshold=config["convergence_threshold"],
        variance_threshold=config.get("variance-threshold", 0.15),
        convergence_mode=config.get("convergence_mode", "adaptive"),
        agents=agents,
        agent_personalities=agent_personalities,
    ))

    return {"simulation_id": str(new_sim_id)}
