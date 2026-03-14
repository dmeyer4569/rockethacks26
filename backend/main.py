import asyncio
from models.database import db_manager
from models.writer import insert_case

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


    finally:
        # 4. Clean up
        await db_manager.close()

if __name__ == "__main__":
    asyncio.run(main())
