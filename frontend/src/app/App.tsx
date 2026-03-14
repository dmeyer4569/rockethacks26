import { TopNav } from "./components/TopNav";
import { RoundTracker } from "./components/RoundTracker";
import { PolicyCard } from "./components/PolicyCard";
import { ConvergenceChart } from "./components/ConvergenceChart";
import { AgentCards } from "./components/AgentCards";
import { NewSimulationModal } from "./components/NewSimulationModel";
import { LiveReasoningPanel } from "./components/LiveReasoningPanel";
import { Activity, Zap, Target, BarChart3 } from "lucide-react";
import { useState } from "react";

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

export default function App() {
    const [showNewSim, setShowNewSim] = useState(false);
  
    return (
      <div className="min-h-screen w-full font-['Inter',sans-serif]" style={{ background: "#0F172A" }}>
        <TopNav onNewSimulation={() => setShowNewSim(true)} />
        <NewSimulationModal isOpen={showNewSim} onClose={() => setShowNewSim(false)} />
  
        <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
          {/* Metric Pills Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricPill icon={Activity} label="AVG CAS SCORE" value="0.47" color="#34d399" />
            <MetricPill icon={Zap} label="CONVERGENCE" value="78.3%" color="#38bdf8" />
            <MetricPill icon={Target} label="CONSENSUS" value="Near" color="#f97316" />
            <MetricPill icon={BarChart3} label="ITERATIONS" value="2,847" color="#818cf8" />
          </div>
  
          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Context & Progress */}
            <div className="lg:col-span-2 space-y-5">
              <RoundTracker />
              <PolicyCard />
            </div>
  
            {/* Right Column - Analytics */}
            <div className="lg:col-span-3">
              <ConvergenceChart />
            </div>
          </div>
  
          {/* Live Reasoning Feed */}
          <LiveReasoningPanel />
  
          {/* Bottom Section - Agent Proposals */}
          <AgentCards />
        </main>
      </div>
    );
  }