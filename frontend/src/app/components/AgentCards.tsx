import { Star, MessageSquare, Users } from "lucide-react";
import { useMemo } from "react";
import { useSimulation } from "../../context/SimulationContext";
import type { Proposal } from "../../lib/types";

const AGENT_COLORS = [
  "#f97316", "#34d399", "#818cf8", "#f472b6", "#38bdf8",
  "#fbbf24", "#a78bfa", "#6ee7b7", "#e879f9", "#fb923c",
];

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

function proposalToAgent(p: Proposal, idx: number, winnerIdx: number): AgentData {
  const color = AGENT_COLORS[idx % AGENT_COLORS.length];
  const initials = p.persona_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    name: p.persona_name,
    role: `Agent ${idx + 1}`,
    avatar: initials,
    quote: `"${p.changes}"`,
    casScore: p.cas,
    peerRatings: p.ratings.map((r) => (r > 0 ? 1 : 0)),
    isWinner: idx === winnerIdx,
    color,
    borderColor: idx === winnerIdx ? `${color}4D` : `${color}26`,
  };
}

function CASBar({ score, color, isWinner }: { score: number; color: string; isWinner: boolean }) {
  const percentage = Math.max(0, Math.min(100, score * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '11px' }}>CAS Score</span>
        <span className="font-['Roboto_Mono',monospace]" style={{ fontSize: '13px', fontWeight: 600, color }}>{score.toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${percentage}%`,
            background: isWinner ? `linear-gradient(90deg, ${color}, ${color}dd)` : color,
            boxShadow: isWinner ? `0 0 12px ${color}44` : "none",
          }}
        />
      </div>
    </div>
  );
}

function PeerRatings({ ratings, color }: { ratings: number[]; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '11px' }}>Peer Ratings</span>
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
      className={`relative rounded-xl p-5 border transition-all ${
        agent.isWinner ? "border-emerald-500/30" : "border-white/[0.06]"
      }`}
      style={{
        background: agent.isWinner
          ? "linear-gradient(135deg, rgba(11,17,32,0.95) 0%, rgba(6,78,59,0.15) 100%)"
          : "linear-gradient(135deg, rgba(11,17,32,0.9) 0%, rgba(15,23,42,0.95) 100%)",
        backdropFilter: "blur(20px)",
        boxShadow: agent.isWinner ? "0 0 30px rgba(52,211,153,0.08), 0 0 60px rgba(52,211,153,0.04)" : "none",
      }}
    >
      {agent.isWinner && (
        <div
          className="absolute -top-2.5 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 shadow-lg"
          style={{ boxShadow: "0 0 16px rgba(52,211,153,0.4)" }}
        >
          <Star className="w-3 h-3 text-[#0F172A]" fill="#0F172A" />
          <span className="font-['Inter',sans-serif] text-[#0F172A]" style={{ fontSize: '11px', fontWeight: 700 }}>WINNER</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}
        >
          <span className="font-['Roboto_Mono',monospace]" style={{ fontSize: '12px', fontWeight: 600, color: agent.color }}>{agent.avatar}</span>
        </div>
        <div>
          <h4 className="font-['Inter',sans-serif] text-white" style={{ fontSize: '14px', fontWeight: 600 }}>{agent.name}</h4>
          <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: '11px' }}>{agent.role}</p>
        </div>
      </div>

      <div className="mb-4 pl-3 border-l-2" style={{ borderColor: `${agent.color}40` }}>
        <p className="text-slate-400 font-['Inter',sans-serif] italic" style={{ fontSize: '12px', lineHeight: '1.6' }}>{agent.quote}</p>
      </div>

      <div className="mb-3">
        <CASBar score={agent.casScore} color={agent.color} isWinner={agent.isWinner} />
      </div>

      <PeerRatings ratings={agent.peerRatings} color={agent.color} />
    </div>
  );
}

export function AgentCards() {
  const { rounds } = useSimulation();

  const agents = useMemo<AgentData[]>(() => {
    if (rounds.length === 0) return [];
    const latestRound = rounds[rounds.length - 1];
    return latestRound.proposals.map((p, i) =>
      proposalToAgent(p, i, latestRound.winning_proposal_index)
    );
  }, [rounds]);

  const latestRoundNum = rounds.length > 0 ? rounds[rounds.length - 1].round_number : 0;

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
              {latestRoundNum > 0 ? `Round ${latestRoundNum} deliberation results` : "Waiting for first round..."}
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

      {agents.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="font-['Inter',sans-serif] text-slate-600" style={{ fontSize: "13px" }}>
            No proposals yet. Start a simulation to see agent cards.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-3">
          {agents.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
