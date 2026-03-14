import { Star, MessageSquare, Users } from "lucide-react";

interface AgentData {
    name: string;
    role: string;
    avatar: string;
    quote: string;
    casScore: number;
    peerRatings: number[];
    isWinner: boolean;
    color: string;
    borderColor: string;
}

const agents: AgentData[] = [
    //TODO: make this pull from a changable json
    {
        name: "Blue Collar Worker",
        role: "Labor Advocate Agent",
        avatar: "BC",
        quote:
          "\"I propose a 5-year graduated phase-in starting at $9.50, rising $1.10 annually. This gives small employers time to adjust payroll while delivering meaningful relief to minimum-wage households by Year 3.\"",
        casScore: 0.42,
        peerRatings: [1, 1, 0, 1],
        isWinner: false,
        color: "#f97316",
        borderColor: "rgba(249,115,22,0.15)",
    },
    {
        name: "Tech Startup CEO",
        role: "Innovation & Growth Agent",
        avatar: "TS",
        quote:
          "\"Small businesses under 25 employees should be exempt for the first 2 years, with a tax credit bridge. This protects early-stage ventures while aligning long-term with the $15 target indexed to CPI.\"",
        casScore: 0.64,
        peerRatings: [1, 1, 1, 1],
        isWinner: true,
        color: "#34d399",
        borderColor: "rgba(52,211,153,0.3)",
    },
    {
        name: "Policy Analyst",
        role: "Regulatory Impact Agent",
        avatar: "PA",
        quote:
          "\"Regional cost-of-living differentials must be weighted more heavily. A flat $15 in rural Mississippi has a vastly different CPI impact than in San Francisco. I recommend tiered metro-adjusted targets.\"",
        casScore: 0.38,
        peerRatings: [1, 0, 1, 0],
        isWinner: false,
        color: "#818cf8",
        borderColor: "rgba(129,140,248,0.15)",
    },
];

function CASBar ({ score, color, isWinner }: {score: number; color: string; isWinner: boolean}) {
    const percentage = score * 100;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '11px' }}>
                    CAS Score
                </span>
                <span 
                    className="font-['Roboto_Mono',monospace]"
                    style={{ fontSize: '13px', fontWeight: 600, color }}
                >
                    {score.toFixed(2)}
                </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                        width: `${percentage}%`,
                        background: isWinner
                            ? `linear-gradient(90deg, ${color}, ${color}dd)`
                            : color,
                        boxShadow: isWinner ? `0 0 12px ${color}44` : "none",
                    }}
                />
            </div>
        </div>
    )
}

function PeerRatings({ ratings, color }: { ratings: number[]; color: string }) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '11px' }}>
          Peer Ratings
        </span>
        <div className="flex items-center gap-1.5">
          {ratings.map((rating, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-colors"
              style={{
                backgroundColor: rating ? color : "rgba(255,255,255,0.06)",
                boxShadow: rating ? `0 0 6px ${color}44` : "none",
              }}
            />
          ))}
        </div>
        <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: '10px' }}>
          {ratings.filter(Boolean).length}/{ratings.length}
        </span>
      </div>
    );
  }
  
function AgentCard({ agent }: { agent: AgentData }) {
  return (
    <div
      className={`relative rounded-xl p-5 min-w-[320px] flex-shrink-0 border transition-all ${
        agent.isWinner ? "border-emerald-500/30" : "border-white/[0.06]"
      }`}
      style={{
        background: agent.isWinner
          ? "linear-gradient(135deg, rgba(11,17,32,0.95) 0%, rgba(6,78,59,0.15) 100%)"
          : "linear-gradient(135deg, rgba(11,17,32,0.9) 0%, rgba(15,23,42,0.95) 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: agent.isWinner
          ? "0 0 30px rgba(52,211,153,0.08), 0 0 60px rgba(52,211,153,0.04)"
          : "none",
      }}
    >
      {/* Winner badge */}
      {agent.isWinner && (
        <div className="absolute -top-2.5 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 shadow-lg"
          style={{ boxShadow: "0 0 16px rgba(52,211,153,0.4)" }}
        >
          <Star className="w-3 h-3 text-[#0F172A]" fill="#0F172A" />
          <span className="font-['Inter',sans-serif] text-[#0F172A]" style={{ fontSize: '11px', fontWeight: 700 }}>
            WINNER
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `${agent.color}15`,
            border: `1px solid ${agent.color}30`,
          }}
        >
          <span className="font-['Roboto_Mono',monospace]" style={{ fontSize: '12px', fontWeight: 600, color: agent.color }}>
            {agent.avatar}
          </span>
        </div>
        <div>
          <h4 className="font-['Inter',sans-serif] text-white" style={{ fontSize: '14px', fontWeight: 600 }}>
            {agent.name}
          </h4>
          <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '11px' }}>
            {agent.role}
          </p>
        </div>
      </div>

      {/* Quote */}
      <div className="mb-4 pl-3 border-l-2" style={{ borderColor: `${agent.color}40` }}>
        <p className="text-slate-400 font-['Inter',sans-serif] italic" style={{ fontSize: '12px', lineHeight: '1.6' }}>
          {agent.quote}
        </p>
      </div>

      {/* CAS Bar */}
      <div className="mb-3">
        <CASBar score={agent.casScore} color={agent.color} isWinner={agent.isWinner} />
      </div>

      {/* Peer Ratings */}
      <PeerRatings ratings={agent.peerRatings} color={agent.color} />
    </div>
  );
}
  
export function AgentCards() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-['Inter',sans-serif] text-white" style={{ fontSize: '14px', fontWeight: 600 }}>
              Live Agent Proposals & Ratings
            </h3>
            <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '11px' }}>
              Round 3 deliberation results
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <MessageSquare className="w-3 h-3 text-slate-500" />
          <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '11px' }}>
            {agents.length} agents active
          </span>
        </div>
      </div>

      {/* Scrollable cards */}
      <div className="flex gap-4 overflow-x-auto pt-3 pb-2 scrollbar-thin">
        {agents.map((agent) => (
          <AgentCard key={agent.name} agent={agent} />
        ))}
      </div>
    </div>
  );
}