import asyncio
import json
import traceback

from models.reader import read_cases
from models.writer import update_simulation, insert_round
from services.persona import get_random_personas
from services.agent import generate_proposal, rate_proposal, apply_change
from services.scoring import calculate_cas, select_policy

MAX_ROUNDS = 10
NUM_AGENTS = 5
PENALTY = 0.5
CAS_THRESHOLD = 0.60
VARIANCE_THRESHOLD = 0.15
STAGNATE_DELTA = 0.001

def build_personas_from_request(agents: list[dict], agent_personalities: dict[str, dict]) -> list[dict]:
    """Build persona dicts from frontend agent configs instead of pulling from DB."""
    personas = []
    for agent in agents:
        agent_id = agent["id"]
        personality = agent_personalities.get(agent_id, {})
        stubbornness = personality.get("stubbornness", 50)
        if stubbornness >= 70:
            risk_tolerance = "low"
        elif stubbornness >= 40:
            risk_tolerance = "medium"
        else:
            risk_tolerance = "high"
        trait = personality.get("trait", "Pragmatic")
        trait_desc = personality.get("trait_desc", "")
        personas.append({
            "name": agent["name"],
            "description": f"{agent['name']} participating in policy deliberation.",
            "priorities": [trait_desc] if trait_desc else [trait],
            "risk_tolerance": risk_tolerance,
            "values": [trait],
            "stubbornness": stubbornness,
            "trait": trait,
            "trait_desc": trait_desc,
            "custom_prompt": personality.get("prompt", ""),
        })
    return personas

async def run_simulation(
    sim_id,
    case_name: str,
    max_rounds: int = MAX_ROUNDS,
    num_agents: int = NUM_AGENTS,
    cas_threshold: float = CAS_THRESHOLD,
    variance_threshold: float = VARIANCE_THRESHOLD,
    convergence_mode: str = "adaptive",
    agents: list[dict] | None = None,
    agent_personalities: dict[str, dict] | None = None,
) -> None:
    """Run the simulation loop in the background against an already-created simulation document."""
    cases = await read_cases(title=case_name)
    case = cases[0] if cases else None
    if not case:
        await update_simulation(sim_id, "error", 0, None, None)
        return

    config = {
        "num_agents": num_agents,
        "lambda": PENALTY,
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
        if agents:
            personas = build_personas_from_request(agents, agent_personalities or {})
        else:
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

            if convergence_mode != "fixed" and winner["converged"]:
                final_status = "converged"
                break

            if convergence_mode == "adaptive" and check_stagnation(cas_history):
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

def check_stagnation(cas_history: list, delta: float = STAGNATE_DELTA, window: int = 3) -> bool:
    if len(cas_history) < window + 1:
        return False
    recent = cas_history[-(window + 1):]
    diffs = [abs(recent[i+1] - recent[i]) for i in range(window)]
    return all(d <= delta for d in diffs)
