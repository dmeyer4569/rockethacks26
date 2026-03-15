import asyncio
from contextlib import asynccontextmanager
from models.database import db_manager
from models.writer import insert_case, insert_persona
from models.reader import read_cases, read_personas
from services.mediator import run_simulation
from models.writer import insert_case, insert_simulation, insert_round, insert_persona
from models.reader import *
from models.writer import * 
from fastapi import FastAPI
from routes import read_router
from routes import write_router

CASE_TITLE = "Federal Minimum Wage Increase Proposal"

TEST_PERSONAS = [
    {"name": "Small Business Owner", "description": "Runs a restaurant with 12 employees.", "priorities": ["low labor costs", "profit margins"], "risk_tolerance": "low", "values": ["self-reliance", "economic freedom"]},
    {"name": "Low-Wage Worker", "description": "Works two part-time jobs at minimum wage.", "priorities": ["higher pay", "job security"], "risk_tolerance": "medium", "values": ["fairness", "dignity"]},
    {"name": "Corporate HR Director", "description": "Manages compensation for a national retail chain.", "priorities": ["cost control", "workforce stability"], "risk_tolerance": "medium", "values": ["efficiency", "compliance"]},
    {"name": "Labor Economist", "description": "Academic researcher studying wage policy effects.", "priorities": ["data-driven outcomes", "employment levels"], "risk_tolerance": "high", "values": ["evidence", "equity"]},
    {"name": "Chamber of Commerce Rep", "description": "Lobbies on behalf of regional businesses.", "priorities": ["business competitiveness", "low regulation"], "risk_tolerance": "low", "values": ["greed", "growth", "free markets"]},
]

async def main():
    await db_manager.connect()
    try:
        # Seed case if not present
        cases = await read_cases(title=CASE_TITLE)
        if not cases:
            await insert_case(
                CASE_TITLE,
                "Proposal to raise the federal minimum wage to $15/hr",
                "The federal minimum wage is currently set at $7.25/hr. This proposal would raise it to $15/hr over 3 years.",
                {"current_min_wage": 7.25, "median_household_income": 74580, "affected_workers_pct": "1.1%"},
                "labor"
            )
            print("Inserted test case")
        else:
            print("Test case already exists, skipping insert")

        # Seed personas if not present
        existing = await read_personas()
        if len(existing) < 5:
            for p in TEST_PERSONAS:
                await insert_persona(p["name"], p["description"], p["priorities"], p["risk_tolerance"], p["values"])
            print("Inserted test personas")
        else:
            print(f"Found {len(existing)} personas, skipping insert")

        # Run simulation
        print("\nStarting simulation...")
        result = await run_simulation(CASE_TITLE)

        print(f"\n--- RESULT ---")
        print(f"Simulation ID : {result['simulation_id']}")
        print(f"Status        : {result['status']}")
        print(f"Finished round: {result['finished_round']}")
        print(f"Final CAS     : {result['final_cas']}")
        print(f"Final policy  :\n{result['final_policy']}")

    finally:
        await db_manager.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_manager.connect()
    yield
    await db_manager.close()

app = FastAPI(lifespan=lifespan)

app.include_router(read_router.router)
app.include_router(write_router.router)

### Put fastapi stuff here, ensure use of routers to decrease random stuff in her### Put fastapi stuff here, ensure use of routers to decrease random stuff in heree
@app.get("/")
async def root():
    return {"message": "Hello"}

if __name__ == "__main__":
    asyncio.run(main())
