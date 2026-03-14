export function RoundTracker() {
    const totalRounds = 10;
    const currentRound = 3;
  
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0B1120]/80 backdrop-blur-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Inter',sans-serif] text-white" style={{ fontSize: '14px', fontWeight: 600 }}>
            Simulation Progress
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-['Roboto_Mono',monospace] text-slate-400" style={{ fontSize: '12px' }}>
              Round {currentRound} of {totalRounds}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-['Inter',sans-serif] text-emerald-400" style={{ fontSize: '11px', fontWeight: 500 }}>
                Running
              </span>
            </span>
          </div>
        </div>
  
        {/* Timeline */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalRounds }, (_, i) => {
            const round = i + 1;
            const isCompleted = round < currentRound;
            const isCurrent = round === currentRound;
  
            return (
              <div key={round} className="flex-1 flex items-center">
                <div className="flex-1 flex flex-col items-center gap-2">
                  {/* Connector line + dot */}
                  <div className="w-full flex items-center">
                    {i > 0 && (
                      <div
                        className={`flex-1 h-[2px] ${
                          isCompleted || isCurrent
                            ? "bg-emerald-500"
                            : "bg-white/[0.06]"
                        }`}
                      />
                    )}
                    {i === 0 && <div className="flex-1" />}
                    <div
                      className={`relative w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${
                        isCompleted
                          ? "bg-emerald-500"
                          : isCurrent
                          ? "bg-cyan-400"
                          : "bg-white/[0.06] border border-white/[0.1]"
                      }`}
                      style={
                        isCurrent
                          ? { boxShadow: "0 0 12px rgba(34,211,238,0.5), 0 0 24px rgba(34,211,238,0.2)" }
                          : {}
                      }
                    >
                      {isCompleted && (
                        <svg className="w-2 h-2 text-[#0F172A]" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {isCurrent && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0F172A]" />
                      )}
                    </div>
                    {i < totalRounds - 1 && (
                      <div
                        className={`flex-1 h-[2px] ${
                          isCompleted ? "bg-emerald-500" : "bg-white/[0.06]"
                        }`}
                      />
                    )}
                    {i === totalRounds - 1 && <div className="flex-1" />}
                  </div>
                  <span
                    className={`font-['Roboto_Mono',monospace] ${
                      isCurrent ? "text-cyan-400" : isCompleted ? "text-slate-400" : "text-slate-600"
                    }`}
                    style={{ fontSize: '10px' }}
                  >
                    R{round}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  