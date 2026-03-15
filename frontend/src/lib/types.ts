export interface Case {
  _id: string;
  title: string;
  description: string;
  initial_policy: string;
  supporting_data: Record<string, unknown>;
  category: string;
  created_at: string;
}

export interface SimulationConfig {
  num_agents: number;
  lambda: number;
  convergence_threshold: number;
  "variance-threshold": number;
  max_rounds: number;
  convergence_mode?: "fixed" | "adaptive" | "exploratory";
}

export interface Simulation {
  _id: string;
  status: "running" | "converged" | "max_rounds" | "stagnated" | "error";
  config: SimulationConfig;
  finished_round: number | null;
  final_policy: string | null;
  final_cas: number | null;
  case_id: string | null;
  case_title: string | null;
  started_at: string;
  completed_at: string;
}

export interface RatingDetail {
  rater_index: number;
  rater_name: string;
  score: number;
  justification: string;
}

export interface Proposal {
  agent_index: number;
  persona_name: string;
  changes: string;
  reasoning: string;
  ratings: number[];
  rating_details: RatingDetail[];
  cas: number;
  mean: number;
  std_dev: number;
  converged: boolean;
}

export interface PersonaUsed {
  agent_index: number;
  persona_name: string;
}

export interface Round {
  _id: string;
  simulation_id: string;
  round_number: number;
  base_policy: string;
  personas_used: PersonaUsed[];
  proposals: Proposal[];
  winning_proposal_index: number;
  winning_cas: number;
  completed_at: string;
}

export interface Persona {
  _id: string;
  name: string;
  description: string;
  priorities: string[];
  risk_tolerance: string;
  values: string[];
}

export interface AgentPersonalityRequest {
  trait: string;
  trait_desc: string;
  stubbornness: number;
  prompt: string;
}

export interface AgentRequest {
  id: string;
  name: string;
}

export interface SimulationCreateRequest {
  title: string;
  description: string;
  initial_policy: string;
  category: string;
  supporting_data?: Record<string, unknown>;
  max_rounds?: number;
  num_agents?: number;
  cas_threshold?: number;
  variance_threshold?: number;
  convergence_mode?: "fixed" | "adaptive" | "exploratory";
  agents?: AgentRequest[];
  agent_personalities?: Record<string, AgentPersonalityRequest>;
}
