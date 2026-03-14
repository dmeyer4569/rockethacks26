from fastapi import APIRouter, FastAPI
from models.writer import insert_case, insert_persona, insert_simulation, insert_round

router = APIRouter(
    prefix="/write",
    tags=["write"]
)
@router.post("/cases")
async def post_case(
    title: str,
    description: str,
    initial_policy: str,
    data: dict,
    category:str,
):

    result = await insert_case(title, description, initial_policy, data, category)
    
    return {"message": f"Success, caseID {result}"}
