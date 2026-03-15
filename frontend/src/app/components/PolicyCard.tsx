import { FileText, ArrowUpRight } from "lucide-react";
import { useSimulation } from "../../context/SimulationContext";

export function PolicyCard() {
  const { activeCase, activeSimulation, rounds } = useSimulation();

  const title = activeCase?.title ?? "No policy loaded";
  const description = (() => {
    if (rounds.length > 0) {
      const latestRound = rounds[rounds.length - 1];
      const winner = latestRound.proposals[latestRound.winning_proposal_index];
      if (winner) return winner.changes;
    }
    if (activeSimulation?.final_policy) return activeSimulation.final_policy;
    return activeCase?.initial_policy ?? "Start a new simulation to view policy details.";
  })();

  const category = activeCase?.category ?? "";
  const tags = category
    ? [category, ...(activeCase?.supporting_data ? Object.keys(activeCase.supporting_data).slice(0, 3) : [])]
    : [];

  return (
    <div
      className="rounded-xl border border-white/[0.06] p-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(11,17,32,0.9) 0%, rgba(15,23,42,0.95) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top right, rgba(52,211,153,1), transparent 60%)",
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <h3 className="font-['Inter',sans-serif] text-white" style={{ fontSize: '14px', fontWeight: 600 }}>
              Current Policy Baseline
            </h3>
          </div>
          <button className="p-1.5 rounded-md hover:bg-white/[0.05] text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="inline-flex px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            <span className="font-['Roboto_Mono',monospace] text-amber-400" style={{ fontSize: '11px', fontWeight: 500 }}>
              {title}
            </span>
          </div>

          <p className="text-slate-400 font-['Inter',sans-serif]" style={{ fontSize: '13px', lineHeight: '1.7' }}>
            {description}
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-500 font-['Inter',sans-serif]"
                  style={{ fontSize: '11px' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
