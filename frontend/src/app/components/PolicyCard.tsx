import { FileText, ArrowUpRight } from "lucide-react";

export function PolicyCard() {
  return (
    <div
      className="rounded-xl border border-white/[0.06] p-5 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(11,17,32,0.9) 0%, rgba(15,23,42,0.95) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Subtle gradient overlay */}
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
              H.R. 4821 — Federal Minimum Wage Adjustment Act
            </span>
          </div>

          <p className="text-slate-400 font-['Inter',sans-serif]" style={{ fontSize: '13px', lineHeight: '1.7' }}>
            Proposes a phased increase of the federal minimum wage from $7.25 to $15.00 per hour over 
            a 5-year implementation window, with annual adjustments indexed to CPI-U inflation metrics. 
            The policy includes provisions for regional cost-of-living differentials and exemption 
            thresholds for businesses with fewer than 25 employees.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {["Labor Economics", "Wage Policy", "Inflation Impact", "SME Exemptions"].map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-500 font-['Inter',sans-serif]"
                style={{ fontSize: '11px' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
