import { ChevronDown, Plus, Clock, RotateCcw } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSimulation } from "../../context/SimulationContext";

export function TopNav({ onNewSimulation }: { onNewSimulation: () => void }) {
  const { simulations, activeSimulation, selectSimulation, rerunSimulationById, loading } = useSimulation();
  const [casesOpen, setCasesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCasesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const statusColor = (s: string) =>
    s === "converged" || s === "max_rounds" ? "#34d399" : s === "running" ? "#38bdf8" : "#f97316";

  const statusLabel = (s: string) =>
    s === "converged" ? "completed" : s === "max_rounds" ? "completed" : s;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  };

  const activeLabel = activeSimulation
    ? (activeSimulation.case_title ?? `Simulation ${activeSimulation._id.slice(-6)}`)
    : "No simulation selected";

  const activeStatus = activeSimulation?.status ?? "running";

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#0B1120]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
            <span className="text-[#0F172A] font-['Roboto_Mono',monospace]" style={{ fontSize: '14px', fontWeight: 700 }}>E</span>
          </div>
          <span className="font-['Inter',sans-serif] tracking-tight text-white" style={{ fontSize: '20px', fontWeight: 700 }}>
            EconSim
          </span>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setCasesOpen(!casesOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-['Inter',sans-serif] ${
              casesOpen
                ? "bg-white/[0.08] border-white/[0.12] text-white"
                : "bg-white/[0.05] border-white/[0.08] text-slate-300 hover:bg-white/[0.08] hover:text-white"
            }`}
            style={{ fontSize: '13px', fontWeight: 500 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: statusColor(activeStatus) }}
            />
            <span className="max-w-[200px] truncate">{activeLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${casesOpen ? "rotate-180" : ""}`} />
          </button>

          {casesOpen && (
            <div
              className="absolute top-full left-0 mt-2 w-[340px] rounded-xl border border-white/[0.08] overflow-hidden z-50"
              style={{ background: "#111827", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
            >
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                  SAVED SIMULATIONS
                </p>
              </div>
              {simulations.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="font-['Inter',sans-serif] text-slate-500" style={{ fontSize: "13px" }}>
                    No simulations yet
                  </p>
                </div>
              )}
              {simulations.map((sim) => {
                const isActive = activeSimulation?._id === sim._id;
                const roundsLabel = sim.finished_round != null
                  ? `${sim.finished_round}/${sim.config.max_rounds}`
                  : `0/${sim.config.max_rounds}`;
                return (
                  <div
                    key={sim._id}
                    className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors ${
                      isActive ? "bg-white/[0.03]" : ""
                    }`}
                  >
                    <button
                      onClick={() => { selectSimulation(sim._id); setCasesOpen(false); }}
                      className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: statusColor(sim.status) }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-['Inter',sans-serif] truncate ${isActive ? "text-white" : "text-slate-300"}`} style={{ fontSize: "13px", fontWeight: 500 }}>
                            {sim.case_title ?? `Simulation ${sim._id.slice(-6)}`}
                          </p>
                          <span className="font-['Roboto_Mono',monospace] text-slate-600 flex-shrink-0" style={{ fontSize: "10px" }}>
                            {roundsLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px" }}>
                            {statusLabel(sim.status)}
                          </span>
                          <span className="text-slate-700" style={{ fontSize: "10px" }}>/</span>
                          <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>
                            {formatDate(sim.started_at)}
                          </span>
                        </div>
                      </div>
                    </button>
                    {sim.status !== "running" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rerunSimulationById(sim._id);
                          setCasesOpen(false);
                        }}
                        disabled={loading}
                        title="Rerun this simulation"
                        className="flex-shrink-0 p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button onClick={onNewSimulation} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0F172A] transition-colors font-['Inter',sans-serif]" style={{ fontSize: '13px', fontWeight: 600 }}>
          <Plus className="w-3.5 h-3.5" />
          New Simulation
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors font-['Inter',sans-serif]" style={{ fontSize: '13px', fontWeight: 500 }}>
          <Clock className="w-3.5 h-3.5" />
          History
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <span className="text-white font-['Inter',sans-serif]" style={{ fontSize: '11px', fontWeight: 600 }}>JD</span>
        </div>
      </div>
    </nav>
  );
}
