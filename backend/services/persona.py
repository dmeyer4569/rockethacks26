import random
from models.reader import read_personas

async def get_random_personas(count: int = 5) -> list[dict]:
    all_personas = await read_personas()
    if len(all_personas) < count:
        raise ValueError(f"Not enough personas in DB: need {count}, have {len(all_personas)}")
    return random.sample(all_personas, count)

async def get_persona_by_name(name: str) -> dict | None:
    results = await read_personas(name=name)
    return results[0] if results else None