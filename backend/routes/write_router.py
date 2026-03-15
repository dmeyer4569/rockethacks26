import asyncio
from fastapi import APIRouter
from models.schema import CaseCreate, SimulationCreate
from models.writer import insert_case, insert_persona
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

    from models.writer import insert_simulation
    from models.database import db_manager

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

    asyncio.create_task(_run_simulation_background(
        sim_id=sim_id,
        case_name=body.title,
        case_id=case_id,
        max_rounds=body.max_rounds,
        num_agents=body.num_agents,
        cas_threshold=body.cas_threshold,
        variance_threshold=body.variance_threshold,
    ))

    return {"simulation_id": str(sim_id)}


async def _run_simulation_background(
    sim_id, case_name, case_id,
    max_rounds, num_agents, cas_threshold, variance_threshold,
):
    """Runs the simulation loop in the background, reusing the already-created simulation document."""
    import json
    import traceback
    from models.writer import update_simulation, insert_round
    from models.reader import read_cases, read_rounds
    from services.persona import get_random_personas
    from services.agent import generate_proposal, rate_proposal, apply_change
    from services.scoring import calculate_cas, select_policy

    cases = await read_cases(title=case_name)
    case = cases[0] if cases else None
    if not case:
        await update_simulation(sim_id, "error", 0, None, None)
        return

    config = {
        "num_agents": num_agents,
        "lambda": 0.5,
        "convergence_threshold": cas_threshold,
        "variance-threshold": variance_threshold,
        "max_rounds": max_rounds,
    }

    current_policy = case["initial_policy"]
    cas_history = []
    final_status = "max_rounds"
    winner = None
    round_num = 0

    try:
        personas = await get_random_personas(num_agents)

        for round_num in range(1, max_rounds + 1):
            raw_proposals = await asyncio.gather(*[
                generate_proposal(persona, current_policy, case)
                for persona in personas
            ])
            proposals = [json.loads(r) for r in raw_proposals]

            scored_proposals = []
            for prop_idx, proposal in enumerate(proposals):
                raters = [p for i, p in enumerate(personas) if i != prop_idx]
                raw_ratings = await asyncio.gather(*[
                    rate_proposal(rater, current_policy, proposal)
                    for rater in raters
                ])
                rating_dicts = [json.loads(r) for r in raw_ratings]
                rater_indices = [i for i in range(num_agents) if i != prop_idx]

                proposal_record = {
                    "agent_index": prop_idx,
                    "persona_name": personas[prop_idx]["name"],
                    "changes": proposal["changes"],
                    "reasoning": proposal["reasoning"],
                    "ratings": [r["score"] for r in rating_dicts],
                    "rating_details": [
                        {
                            "rater_index": rater_indices[j],
                            "rater_name": raters[j]["name"],
                            "score": rating_dicts[j]["score"],
                            "justification": rating_dicts[j]["justification"],
                        }
                        for j in range(len(raters))
                    ],
                }
                calculate_cas(config, proposal_record)
                scored_proposals.append(proposal_record)

            winner = select_policy(scored_proposals)
            winner_idx = scored_proposals.index(winner)
            cas_history.append(winner["cas"])

            personas_used = [
                {"agent_index": i, "persona_name": p["name"]}
                for i, p in enumerate(personas)
            ]
            await insert_round(
                simulation_id=sim_id,
                round_number=round_num,
                base_policy=current_policy,
                personas_used=personas_used,
                proposals=scored_proposals,
                winning_proposal_index=winner_idx,
                winning_cas=winner["cas"],
            )

            current_policy, case["supporting_data"] = await apply_change(
                current_policy, winner["changes"], case.get("supporting_data", {})
            )

            if winner["converged"]:
                final_status = "converged"
                break

            from services.mediator import check_stagnation
            if check_stagnation(cas_history, cas_threshold):
                final_status = "stagnated"
                break

        await update_simulation(
            sim_id=sim_id,
            status=final_status,
            finished_round=round_num,
            final_policy=current_policy,
            final_cas=winner["cas"] if winner else None,
        )
    except Exception:
        traceback.print_exc()
        await update_simulation(
            sim_id=sim_id,
            status="error",
            finished_round=round_num,
            final_policy=current_policy if round_num > 0 else None,
            final_cas=winner["cas"] if winner else None,
        )
