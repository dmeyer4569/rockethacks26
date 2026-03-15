from pydantic import BaseModel, Field
from typing import Optional, Literal


class CaseCreate(BaseModel):
    title: str
    description: str
    initial_policy: str
    supporting_data: dict = {}
    category: str


class AgentPersonalityConfig(BaseModel):
    trait: str = "Pragmatic"
    trait_desc: str = ""
    stubbornness: int = 50
    prompt: str = ""


class AgentConfig(BaseModel):
    id: str
    name: str


class SimulationCreate(BaseModel):
    title: str
    description: str
    initial_policy: str
    category: str
    supporting_data: dict = {}
    max_rounds: int = Field(default=10, ge=3, le=25)
    num_agents: int = Field(default=5, ge=2)
    cas_threshold: float = Field(default=0.60, ge=0.30, le=0.90)
    variance_threshold: float = Field(default=0.15, ge=0.0, le=1.0)
    convergence_mode: Literal["fixed", "adaptive", "exploratory"] = "adaptive"
    agents: list[AgentConfig] = []
    agent_personalities: dict[str, AgentPersonalityConfig] = {}
