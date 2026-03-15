import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Filter,
  Maximize2,
  Minimize2,
  Circle,
} from "lucide-react";
import { useSimulation } from "../../context/SimulationContext";

const AGENT_COLORS = [
  "#f97316", "#34d399", "#818cf8", "#f472b6", "#38bdf8",
  "#fbbf24", "#a78bfa", "#6ee7b7", "#e879f9", "#fb923c",
];

interface ReasoningEntry {
  id: string;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  round: number;
  phase: "analyzing" | "proposing" | "critiquing" | "converging";
  text: string;
  timestamp: number;
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  analyzing: { label: "ANALYZING", color: "#38bdf8" },
  proposing: { label: "PROPOSING", color: "#34d399" },
  critiquing: { label: "CRITIQUING", color: "#f97316" },
  converging: { label: "CONVERGING", color: "#a78bfa" },
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function LiveReasoningPanel() {
  const { rounds, activeSimulation } = useSimulation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFullHeight, setIsFullHeight] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRunning = activeSimulation?.status === "running";

  const entries = useMemo<ReasoningEntry[]>(() => {
    const result: ReasoningEntry[] = [];
    const agentColorMap = new Map<string, string>();
    let colorIdx = 0;

    for (const round of rounds) {
      for (const p of round.proposals) {
        if (!agentColorMap.has(p.persona_name)) {
          agentColorMap.set(p.persona_name, AGENT_COLORS[colorIdx % AGENT_COLORS.length]);
          colorIdx++;
        }
        const color = agentColorMap.get(p.persona_name)!;
        const avatar = getInitials(p.persona_name);

        result.push({
          id: `${round._id}-${p.agent_index}-proposal`,
          agentName: p.persona_name,
          agentAvatar: avatar,
          agentColor: color,
          round: round.round_number,
          phase: "proposing",
          text: `${p.changes}`,
          timestamp: new Date(round.completed_at).getTime() - 2000,
        });

        if (p.reasoning) {
          result.push({
            id: `${round._id}-${p.agent_index}-reasoning`,
            agentName: p.persona_name,
            agentAvatar: avatar,
            agentColor: color,
            round: round.round_number,
            phase: "analyzing",
            text: p.reasoning,
            timestamp: new Date(round.completed_at).getTime() - 3000,
          });
        }

        for (const rd of p.rating_details) {
          if (!agentColorMap.has(rd.rater_name)) {
            agentColorMap.set(rd.rater_name, AGENT_COLORS[colorIdx % AGENT_COLORS.length]);
            colorIdx++;
          }
          result.push({
            id: `${round._id}-${p.agent_index}-rating-${rd.rater_index}`,
            agentName: rd.rater_name,
            agentAvatar: getInitials(rd.rater_name),
            agentColor: agentColorMap.get(rd.rater_name)!,
            round: round.round_number,
            phase: "critiquing",
            text: `[Score: ${rd.score.toFixed(2)}] ${rd.justification}`,
            timestamp: new Date(round.completed_at).getTime() - 1000,
          });
        }
      }

      const winner = round.proposals[round.winning_proposal_index];
      if (winner) {
        result.push({
          id: `${round._id}-convergence`,
          agentName: winner.persona_name,
          agentAvatar: getInitials(winner.persona_name),
          agentColor: agentColorMap.get(winner.persona_name) ?? AGENT_COLORS[0],
          round: round.round_number,
          phase: "converging",
          text: `Round ${round.round_number} winner (CAS: ${round.winning_cas.toFixed(2)}): ${winner.changes}`,
          timestamp: new Date(round.completed_at).getTime(),
        });
      }
    }

    result.sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.timestamp - b.timestamp;
    });

    return result;
  }, [rounds]);

  const activeAgents = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string; color: string }>();
    for (const e of entries) {
      if (!map.has(e.agentName)) {
        map.set(e.agentName, { name: e.agentName, avatar: e.agentAvatar, color: e.agentColor });
      }
    }
    return Array.from(map.values());
  }, [entries]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, autoScroll]);

  const handleScrollChange = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  }, []);

  const filteredEntries = filterAgent
    ? entries.filter((e) => e.agentName === filterAgent)
    : entries;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0B1120]/80 backdrop-blur-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-['Inter',sans-serif] text-white" style={{ fontSize: "14px", fontWeight: 600 }}>
              Live Agent Reasoning
            </h3>
            <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>
              {isRunning ? "Streaming thought processes" : "Review"} · {entries.length} entries
            </p>
          </div>
          {isRunning && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="font-['Roboto_Mono',monospace] text-red-400" style={{ fontSize: "10px", fontWeight: 600 }}>LIVE</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && activeAgents.length > 0 && (
            <div className="hidden md:flex items-center gap-1 mr-2">
              {activeAgents.slice(0, 5).map((a) => (
                <div
                  key={a.name}
                  onClick={(e) => { e.stopPropagation(); setFilterAgent(filterAgent === a.name ? null : a.name); }}
                  className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all ${
                    filterAgent && filterAgent !== a.name ? "opacity-30" : ""
                  }`}
                  style={{
                    background: `${a.color}20`,
                    border: `1px solid ${a.color}${filterAgent === a.name ? "80" : "30"}`,
                  }}
                  title={a.name}
                >
                  <span className="font-['Roboto_Mono',monospace]" style={{ fontSize: "7px", fontWeight: 700, color: a.color }}>
                    {a.avatar}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${showFilters ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.06] text-slate-400"}`}
              title="Filter agents"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            {isExpanded && (
              <button onClick={() => setIsFullHeight(!isFullHeight)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title={isFullHeight ? "Collapse" : "Expand"}>
                {isFullHeight ? <Minimize2 className="w-3.5 h-3.5 text-slate-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            )}
          </div>
          <button className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-5 py-2.5 border-b border-white/[0.04] flex items-center gap-2 flex-wrap">
                    <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>FILTER:</span>
                    <button
                      onClick={() => setFilterAgent(null)}
                      className={`px-2 py-1 rounded-md transition-all font-['Inter',sans-serif] ${
                        !filterAgent ? "bg-white/[0.08] text-white border border-white/[0.12]" : "text-slate-500 hover:text-slate-300 border border-transparent"
                      }`}
                      style={{ fontSize: "11px", fontWeight: 500 }}
                    >
                      All
                    </button>
                    {activeAgents.map((a) => (
                      <button
                        key={a.name}
                        onClick={() => setFilterAgent(filterAgent === a.name ? null : a.name)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all font-['Inter',sans-serif] ${
                          filterAgent === a.name ? "bg-white/[0.06] border-white/[0.12] text-white" : "text-slate-500 hover:text-slate-300 border-transparent"
                        }`}
                        style={{ fontSize: "11px", fontWeight: 500 }}
                      >
                        <Circle className="w-2 h-2" fill={a.color} stroke="none" />
                        {a.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              ref={scrollRef}
              onScroll={handleScrollChange}
              className="overflow-y-auto scrollbar-thin"
              style={{ maxHeight: isFullHeight ? "600px" : "340px", minHeight: "120px" }}
            >
              {filteredEntries.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Brain className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="font-['Inter',sans-serif] text-slate-600" style={{ fontSize: "13px" }}>
                      {isRunning ? "Waiting for agent reasoning..." : "No reasoning data yet"}
                    </p>
                  </div>
                </div>
              )}

              <div className="divide-y divide-white/[0.03]">
                {filteredEntries.map((entry) => (
                  <ReasoningEntryRow key={entry.id} entry={entry} formatTime={formatTime} />
                ))}
              </div>
            </div>

            {!autoScroll && (
              <div className="relative">
                <button
                  onClick={() => {
                    setAutoScroll(true);
                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
                  }}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-white/[0.1] shadow-lg hover:bg-slate-700/90 transition-colors"
                >
                  <ChevronDown className="w-3 h-3 text-slate-300" />
                  <span className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "11px", fontWeight: 500 }}>New reasoning</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReasoningEntryRow({
  entry,
  formatTime,
}: {
  entry: ReasoningEntry;
  formatTime: (ts: number) => string;
}) {
  const phaseInfo = PHASE_LABELS[entry.phase];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="px-5 py-3.5 hover:bg-white/[0.015] transition-colors"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${entry.agentColor}12`, border: `1px solid ${entry.agentColor}30` }}
          >
            <span className="font-['Roboto_Mono',monospace]" style={{ fontSize: "10px", fontWeight: 700, color: entry.agentColor }}>
              {entry.agentAvatar}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-['Inter',sans-serif] text-white" style={{ fontSize: "12px", fontWeight: 600 }}>{entry.agentName}</span>
            <span
              className="px-1.5 py-0.5 rounded font-['Roboto_Mono',monospace]"
              style={{
                fontSize: "9px", fontWeight: 600, color: phaseInfo.color,
                background: `${phaseInfo.color}12`, border: `1px solid ${phaseInfo.color}25`, letterSpacing: "0.05em",
              }}
            >
              {phaseInfo.label}
            </span>
            <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>R{entry.round}</span>
            <span className="font-['Roboto_Mono',monospace] text-slate-700 ml-auto" style={{ fontSize: "10px" }}>{formatTime(entry.timestamp)}</span>
          </div>
          <p className="text-slate-400 font-['Inter',sans-serif]" style={{ fontSize: "12px", lineHeight: "1.7" }}>{entry.text}</p>
        </div>
      </div>
    </motion.div>
  );
}
