import { ChevronDown, Plus, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const SAVED_CASES = [
  { id: "c1", name: "Min. Wage $15 Analysis", domain: "Labor & Wages", status: "completed", date: "Mar 12, 2026", rounds: "10/10" },
  { id: "c2", name: "Carbon Tax Impact Study", domain: "Climate & Energy", status: "running", date: "Mar 14, 2026", rounds: "6/12" },
  { id: "c3", name: "Universal Healthcare Model", domain: "Healthcare", status: "completed", date: "Mar 8, 2026", rounds: "8/8" },
  { id: "c4", name: "Tariff Escalation Scenario", domain: "Trade & Tariffs", status: "paused", date: "Mar 5, 2026", rounds: "4/10" },
  { id: "c5", name: "Rent Control Effectiveness", domain: "Housing", status: "completed", date: "Feb 28, 2026", rounds: "15/15" },
];

export function TopNav({ onNewSimulation }: { onNewSimulation: () => void }) {
  const [casesOpen, setCasesOpen] = useState(false);
  const [activeCase, setActiveCase] = useState(SAVED_CASES[0]);
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
    s === "completed" ? "#34d399" : s === "running" ? "#38bdf8" : "#f97316";

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#0B1120]">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
            <span className="text-[#0F172A] font-['Roboto_Mono',monospace]" style={{ fontSize: '14px', fontWeight: 700 }}>E</span>
          </div>
          <span className="font-['Inter',sans-serif] tracking-tight text-white" style={{ fontSize: '20px', fontWeight: 700 }}>
            EconSim
          </span>
        </div>

        {/* Cases Dropdown */}
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
              style={{ background: statusColor(activeCase.status) }}
            />
            <span className="max-w-[160px] truncate">{activeCase.name}</span>
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
              {SAVED_CASES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveCase(c); setCasesOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-white/[0.04] transition-colors flex items-start gap-2.5 ${
                    activeCase.id === c.id ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: statusColor(c.status) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-['Inter',sans-serif] truncate ${activeCase.id === c.id ? "text-white" : "text-slate-300"}`} style={{ fontSize: "13px", fontWeight: 500 }}>
                        {c.name}
                      </p>
                      <span className="font-['Roboto_Mono',monospace] text-slate-600 flex-shrink-0" style={{ fontSize: "10px" }}>
                        {c.rounds}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px" }}>{c.domain}</span>
                      <span className="text-slate-700" style={{ fontSize: "10px" }}>/</span>
                      <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>{c.date}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Simulation Button */}
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