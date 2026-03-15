import type { Case, Simulation, Round, Persona, SimulationCreateRequest } from "./types";

const BASE = "/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchCases(title?: string): Promise<Case[]> {
  const params = title ? `?case=${encodeURIComponent(title)}` : "";
  const res = await fetch(`${BASE}/read/cases/${params}`);
  const data = await json<{ contents: Case[] }>(res);
  return data.contents;
}

export async function fetchSimulations(): Promise<Simulation[]> {
  const res = await fetch(`${BASE}/read/simulations/`);
  const data = await json<{ contents: Simulation[] }>(res);
  return data.contents;
}

export async function fetchSimulation(id: string): Promise<Simulation> {
  const res = await fetch(`${BASE}/read/simulations/${id}`);
  return json<Simulation>(res);
}

export async function fetchRounds(simulationId: string): Promise<Round[]> {
  const res = await fetch(`${BASE}/read/rounds/?round=${encodeURIComponent(simulationId)}`);
  const data = await json<{ rounds: Round[] }>(res);
  return data.rounds;
}

export async function fetchPersonas(name?: string): Promise<Persona[]> {
  const params = name ? `?persona=${encodeURIComponent(name)}` : "";
  const res = await fetch(`${BASE}/read/personas/${params}`);
  const data = await json<{ contents: Persona[] }>(res);
  return data.contents;
}

export async function createSimulation(body: SimulationCreateRequest): Promise<string> {
  const res = await fetch(`${BASE}/write/simulations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await json<{ simulation_id: string }>(res);
  return data.simulation_id;
}

export async function createPersona(name: string, description = ""): Promise<string> {
  const res = await fetch(`${BASE}/write/personas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  const data = await json<{ persona_id: string }>(res);
  return data.persona_id;
}

export async function updatePersona(personaId: string, fields: {
  name?: string;
  description?: string;
  priorities?: string[];
  risk_tolerance?: string;
  values?: string[];
  custom_prompt?: string;
}): Promise<void> {
  await fetch(`${BASE}/write/personas/${encodeURIComponent(personaId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
}

export async function rerunSimulation(simId: string): Promise<string> {
  const res = await fetch(`${BASE}/write/simulations/${encodeURIComponent(simId)}/rerun`, {
    method: "POST",
  });
  const data = await json<{ simulation_id: string }>(res);
  return data.simulation_id;
}
