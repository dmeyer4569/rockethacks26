from pydantic import BaseModel
from typing import Optional


class CaseCreate(BaseModel):
    title: str
    description: str
    initial_policy: str
    supporting_data: dict = {}
    category: str


class SimulationCreate(BaseModel):
    title: str
    description: str
    initial_policy: str
    category: str
    supporting_data: dict = {}
    max_rounds: int = 10
    num_agents: int = 5
    cas_threshold: float = 0.60
    variance_threshold: float = 0.15
