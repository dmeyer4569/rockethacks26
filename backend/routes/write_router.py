import asyncio
from fastapi import APIRouter
from models.schema import CaseCreate, SimulationCreate
from models.writer import insert_case, insert_persona, insert_simulation
from models.reader import read_cases, read_personas
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

    config = {
        "num_agents": body.num_agents,
        "lambda": 0.5,
        "convergence_threshold": body.cas_threshold,
        "variance-threshold": body.variance_threshold,
        "max_rounds": body.max_rounds,
    }
    sim_id = await insert_simulation(
        status="running",
        config=config,
        finished_round=None,
        final_policy=None,
        final_cas=None,
        case_id=case_id,
        case_title=body.title,
    )

    asyncio.create_task(run_simulation(
        sim_id=sim_id,
        case_name=body.title,
        max_rounds=body.max_rounds,
        num_agents=body.num_agents,
        cas_threshold=body.cas_threshold,
        variance_threshold=body.variance_threshold,
        convergence_mode=body.convergence_mode,
        agents=[a.model_dump() for a in body.agents],
        agent_personalities={k: v.model_dump() for k, v in body.agent_personalities.items()},
    ))

    return {"simulation_id": str(sim_id)}
