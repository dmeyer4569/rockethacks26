import { TopNav } from "./components/TopNav";
import { RoundTracker } from "./components/RoundTracker";
import { PolicyCard } from "./components/PolicyCard";
import { ConvergenceChart } from "./components/ConvergenceChart";
import { AgentCards } from "./components/AgentCards";
import { NewSimulationModal } from "./components/NewSimulationModel";
import { LiveReasoningPanel } from "./components/LiveReasoningPanel";
import { Activity, Zap, Target, BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";
import { SimulationProvider, useSimulation } from "../context/SimulationContext";

function MetricPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-x1 bg-white/[0.03] border border-white/[0.06]">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${color}12`, border: `1px solid ${color}25` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
          {label}
        </p>
        <p className="font-['Roboto_Mono',monospace] text-white" style={{ fontSize: '15px', fontWeight: 600 }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const [showNewSim, setShowNewSim] = useState(false);
  const { activeSimulation, rounds } = useSimulation();

  const metrics = useMemo(() => {
    if (rounds.length === 0 || !activeSimulation) {
      return { avgCas: "--", convergence: "--", consensus: "--", iterations: "0" };
    }

    const latestRound = rounds[rounds.length - 1];
    const allCas = latestRound.proposals.map((p) => p.cas);
    const avgCas = allCas.length > 0
      ? (allCas.reduce((a, b) => a + b, 0) / allCas.length).toFixed(2)
      : "--";

    const threshold = activeSimulation.config.convergence_threshold;
    const maxCas = activeSimulation.final_cas ?? Math.max(...allCas, 0);
    const convergence = threshold > 0
      ? `${Math.min(100, (maxCas / threshold) * 100).toFixed(1)}%`
      : "--";

    const status = activeSimulation.status;
    const consensus = status === "converged"
      ? "Reached"
      : maxCas >= threshold * 0.9
        ? "Near"
        : maxCas >= threshold * 0.5
          ? "Building"
          : "Low";

    const totalProposals = rounds.reduce((acc, r) => acc + r.proposals.length, 0);

    return { avgCas, convergence, consensus, iterations: totalProposals.toLocaleString() };
  }, [activeSimulation, rounds]);

  return (
    <div className="min-h-screen w-full font-['Inter',sans-serif]" style={{ background: "#0F172A" }}>
      <TopNav onNewSimulation={() => setShowNewSim(true)} />
      <NewSimulationModal isOpen={showNewSim} onClose={() => setShowNewSim(false)} />

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricPill icon={Activity} label="AVG CAS SCORE" value={metrics.avgCas} color="#34d399" />
          <MetricPill icon={Zap} label="CONVERGENCE" value={metrics.convergence} color="#38bdf8" />
          <MetricPill icon={Target} label="CONSENSUS" value={metrics.consensus} color="#f97316" />
          <MetricPill icon={BarChart3} label="PROPOSALS" value={metrics.iterations} color="#818cf8" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <RoundTracker />
            <PolicyCard />
          </div>
          <div className="lg:col-span-3">
            <ConvergenceChart />
          </div>
        </div>

        <LiveReasoningPanel />
        <AgentCards />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <Dashboard />
    </SimulationProvider>
  );
}
