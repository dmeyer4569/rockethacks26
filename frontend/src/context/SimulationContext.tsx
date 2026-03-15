import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { Simulation, Round, Case, SimulationCreateRequest } from "../lib/types";
import {
  fetchSimulations,
  fetchSimulation,
  fetchRounds,
  fetchCases,
  createSimulation,
  rerunSimulation,
} from "../lib/api";

interface SimulationContextValue {
  simulations: Simulation[];
  activeSimulation: Simulation | null;
  activeCase: Case | null;
  rounds: Round[];
  loading: boolean;
  error: string | null;
  startSimulation: (req: SimulationCreateRequest) => Promise<void>;
  rerunSimulationById: (simId: string) => Promise<void>;
  selectSimulation: (id: string) => Promise<void>;
  refreshSimulations: () => Promise<void>;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be inside SimulationProvider");
  return ctx;
}

const POLL_INTERVAL = 3000;

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollSimulation = useCallback(async (simId: string) => {
    try {
      const [sim, rds] = await Promise.all([
        fetchSimulation(simId),
        fetchRounds(simId),
      ]);
      setActiveSimulation(sim);
      setRounds(rds);

      if (sim.status !== "running") {
        stopPolling();
        // Refresh the simulations list to get updated status
        fetchSimulations().then(setSimulations).catch(() => {});
      }
    } catch {
      // Silently retry on next interval
    }
  }, [stopPolling]);

  const startPolling = useCallback((simId: string) => {
    stopPolling();
    pollSimulation(simId);
    pollRef.current = setInterval(() => pollSimulation(simId), POLL_INTERVAL);
  }, [stopPolling, pollSimulation]);

  const refreshSimulations = useCallback(async () => {
    try {
      const sims = await fetchSimulations();
      setSimulations(sims);
    } catch (e) {
      console.error("Failed to load simulations", e);
    }
  }, []);

  const selectSimulation = useCallback(async (id: string) => {
    stopPolling();
    setLoading(true);
    setError(null);
    try {
      const [sim, rds] = await Promise.all([
        fetchSimulation(id),
        fetchRounds(id),
      ]);
      setActiveSimulation(sim);
      setRounds(rds);

      if (sim.case_title) {
        const cases = await fetchCases(sim.case_title);
        setActiveCase(cases[0] ?? null);
      } else {
        setActiveCase(null);
      }

      if (sim.status === "running") {
        startPolling(id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load simulation");
    } finally {
      setLoading(false);
    }
  }, [stopPolling, startPolling]);

  const startSimulationFn = useCallback(async (req: SimulationCreateRequest) => {
    stopPolling();
    setLoading(true);
    setError(null);
    try {
      const simId = await createSimulation(req);

      const sim = await fetchSimulation(simId);
      setActiveSimulation(sim);
      setRounds([]);

      setActiveCase({
        _id: "",
        title: req.title,
        description: req.description,
        initial_policy: req.initial_policy,
        supporting_data: req.supporting_data ?? {},
        category: req.category,
        created_at: new Date().toISOString(),
      });

      startPolling(simId);
      await refreshSimulations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start simulation");
    } finally {
      setLoading(false);
    }
  }, [stopPolling, startPolling, refreshSimulations]);

  const rerunSimulationByIdFn = useCallback(async (simId: string) => {
    stopPolling();
    setLoading(true);
    setError(null);
    try {
      const newSimId = await rerunSimulation(simId);
      const sim = await fetchSimulation(newSimId);
      setActiveSimulation(sim);
      setRounds([]);
      startPolling(newSimId);
      await refreshSimulations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rerun simulation");
    } finally {
      setLoading(false);
    }
  }, [stopPolling, startPolling, refreshSimulations]);

  // Load simulations list on mount
  useEffect(() => {
    refreshSimulations();
  }, [refreshSimulations]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return (
    <SimulationContext.Provider
      value={{
        simulations,
        activeSimulation,
        activeCase,
        rounds,
        loading,
        error,
        startSimulation: startSimulationFn,
        rerunSimulationById: rerunSimulationByIdFn,
        selectSimulation,
        refreshSimulations,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}
