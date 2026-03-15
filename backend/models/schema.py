from pydantic import BaseModel, Field
from typing import Optional, Literal


class PersonaCreate(BaseModel):
    name: str
    description: str = ""
    priorities: list[str] = []
    risk_tolerance: str = "medium"
    values: list[str] = []
    custom_prompt: str = ""


class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    priorities: Optional[list[str]] = None
    risk_tolerance: Optional[str] = None
    values: Optional[list[str]] = None
    custom_prompt: Optional[str] = None


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
