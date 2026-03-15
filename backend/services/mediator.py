import asyncio
import json

from models.reader import read_cases, read_rounds
from models.writer import insert_simulation, update_simulation, insert_round
from services.persona import get_random_personas
from services.agent import generate_proposal, rate_proposal, apply_change
from services.scoring import calculate_cas, select_policy

MAX_ROUNDS = 10
NUM_AGENTS = 5
PENALTY = 0.5
CAS_THRESHOLD = 0.60
VARIANCE_THRESHOLD = 0.15
STAGNATE_DELTA = 0.001

async def run_simulation(case_name: str) -> dict:
    cases = await read_cases(title=case_name)
    case = cases[0] if cases else None
    if not case:
        raise ValueError(f"Case '{case_name}' not found")

    config = {
        "num_agents": NUM_AGENTS,
        "lambda": PENALTY,
        "convergence_threshold": CAS_THRESHOLD,
        "variance-threshold" : VARIANCE_THRESHOLD,
        "max_rounds": MAX_ROUNDS,
    }

    sim_id = await insert_simulation(
        status="running",
        config=config,
        finished_round=None,
        final_policy=None,
        final_cas=None,
    )

    current_policy = case["initial_policy"]
    cas_history = []
    final_status = "max_rounds"
    winner = None

    personas = await get_random_personas(NUM_AGENTS)

    for round_num in range(1, MAX_ROUNDS + 1):
        print(f"\n--- Round {round_num}/{MAX_ROUNDS} ---")

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

            rater_indices = [i for i in range(NUM_AGENTS) if i != prop_idx]

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

        print(f"  Winner: {winner['persona_name']} (index {winner_idx})")
        print(f"  Winning CAS: {winner['cas']:.4f}")
        print(f"  Converged: {winner['converged']}")
        for prop in scored_proposals:
            print(f"    [{prop['agent_index']}] {prop['persona_name']:30s}  CAS={prop['cas']:.4f}  ratings={prop['ratings']}")

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
        print(f"  Policy after round {round_num}: {current_policy}")

        if winner["converged"]:
            final_status = "converged"
            print(f"  -> Converged after round {round_num}")
            break

        if check_stagnation(cas_history):
            final_status = "stagnated"
            print(f"  -> Stagnated after round {round_num} (CAS history: {cas_history[-3:]})")
            break

    await update_simulation(
        sim_id=sim_id,
        status=final_status,
        finished_round=round_num,
        final_policy=current_policy,
        final_cas=winner["cas"] if winner else None,
    )

    rounds = await read_rounds(simulation_id=sim_id)

    return {
        "simulation_id": str(sim_id),
        "status": final_status,
        "finished_round": round_num,
        "final_policy": current_policy,
        "final_cas": winner["cas"] if winner else None,
        "rounds": rounds,
    }
    

def check_stagnation(cas_history: list, delta = STAGNATE_DELTA, window: int = 3) -> bool:
    if len(cas_history) < window + 1:
        return False
    recent = cas_history[-(window + 1):]
    diffs = [abs(recent[i+1] - recent[i]) for i in range(window)]
    return all(d <= delta for d in diffs)