import asyncio
from contextlib import asynccontextmanager
from models.database import db_manager
from models.writer import insert_case, insert_simulation, insert_round, insert_persona
from models.reader import *
from models.writer import * 

from fastapi import FastAPI
from routes import read_router
from routes import write_router

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


### SUBJECT TO CHANGE, THIS IS FOR TESTING ONLY 
async def main():
    # 1. Start the connection pool
    await db_manager.connect()

    try:
        # 2. Insert your data
        data = {
            "current_min_wage": 7.25,
            "median_household_income": 74580,
            "cpi_increase_5yr": "18.2%",
            "states_above_federal": 30,
            "affected_workers_pct": "1.1%"
        }
        
        new_id = await insert_case(
            "Federal Minimum Wage Increase Proposal",
            "Proposal to raise the wage to $15/hr",
            "The federal minimum wage shall increase...",
            data,
            "labor"
        )
        print(f"Success! Policy ID: {new_id}")

        data2 = {
            "num_agents": 5,
            "lambda": 0.5,
            "convergence_threshold": 0.60,
            "max_rounds": 10
        }

        new_simulation = await insert_simulation(
            "testround",
            data2,
            3,
            "THROW THE TEA",
            0.43
        )
        print(f"Success! Simulation ID: {new_simulation}")

        cases = await read_cases()
        for case in cases:
            print(f"Current Cases {case}")
            print("-" * 20)
    finally:
        # 4. Clean up
        await db_manager.close()

if __name__ == "__main__":
    asyncio.run(main())
