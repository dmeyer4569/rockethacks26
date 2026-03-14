import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Brain,
    ChevronDown,
    ChevronUp,
    Pause,
    Play,
    Filter,
    Maximize2,
    Minimize2,
    Circle,
} from "lucide-react";

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

const MOCK_REASONING_STREAM: Omit<ReasoningEntry, "id" | "timestamp">[] = [
// TODO: Replace with real data  
  {
    agentName: "Economist",
    agentAvatar: "EC",
    agentColor: "#38bdf8",
    round: 3,
    phase: "analyzing",
    text: "Evaluating CPI impact of $15 floor on metro vs rural labor markets. Historical data from 2019 Seattle min-wage study suggests a 1.2% employment elasticity in food service — but the confidence interval is wide. Need to weight regional variance more heavily before proposing.",
  },
  {
    agentName: "Tech Startup CEO",
    agentAvatar: "TS",
    agentColor: "#34d399",
    round: 3,
    phase: "proposing",
    text: "Small businesses under 25 employees face disproportionate payroll shock. I'm modeling a 2-year exemption bridge with declining tax credits: Year 1 at 80% offset, Year 2 at 40%, then full compliance. This preserves startup runway while aligning with the $15 target indexed to CPI.",
  },
  {
    agentName: "Blue Collar Worker",
    agentAvatar: "BC",
    agentColor: "#f97316",
    round: 3,
    phase: "critiquing",
    text: "CEO's exemption proposal risks creating a two-tier system where small employers become permanent low-wage havens. The 2019 data from Oregon's tiered approach shows only 34% of exempt businesses transitioned to full compliance voluntarily. Must include mandatory phase-in triggers.",
  },
  {
    agentName: "Policy Analyst",
    agentAvatar: "PA",
    agentColor: "#818cf8",
    round: 3,
    phase: "analyzing",
    text: "Cross-referencing BLS employment data with CBO scoring models. The $15 target produces asymmetric effects: +$31B in aggregate wages but potential 1.3M job displacement concentrated in leisure/hospitality. Regional tiering could reduce displacement by 40% based on my regression analysis.",
  },
  {
    agentName: "Union Representative",
    agentAvatar: "UR",
    agentColor: "#f472b6",
    round: 3,
    phase: "critiquing",
    text: "I reject the framing of job displacement as inevitable. The CBO model assumes static labor demand, ignoring multiplier effects from increased consumer spending. Card & Krueger's natural experiment methodology is more applicable here — and it showed minimal employment effects.",
  },
  {
    agentName: "Tech Startup CEO",
    agentAvatar: "TS",
    agentColor: "#34d399",
    round: 3,
    phase: "converging",
    text: "Acknowledging the Worker Rep's point on mandatory triggers. Revised proposal: exemption period with automatic enrollment in compliance pathway at Month 18. If payroll-to-revenue ratio exceeds 35%, extended timeline with SBA-backed transition loans. This addresses both runway and accountability.",
  },
  {
    agentName: "Economist",
    agentAvatar: "EC",
    agentColor: "#38bdf8",
    round: 3,
    phase: "converging",
    text: "Running Monte Carlo simulation on the revised hybrid model. 10,000 iterations show median wage gain of $4,200/yr for affected workers with 95% CI employment impact of [-0.8%, +0.3%]. The regional tiering + exemption bridge reduces tail risk significantly. Moving toward consensus.",
  },
  {
    agentName: "Policy Analyst",
    agentAvatar: "PA",
    agentColor: "#818cf8",
    round: 3,
    phase: "proposing",
    text: "Synthesizing inputs into legislative framework: 3-tier regional structure (metro/suburban/rural) with $15/$13.50/$12.25 floors, annual CPI-U adjustment, 24-month SMB bridge with mandatory compliance triggers. Scoring this against PAYGO requirements now.",
  },
];

export function LiveReasoningPanel() {
   const [entries, setEntries] = useState<ReasoningEntry[]>([]);
   const [isStreaming, setIsStreaming] = useState(true);
   const [isExpanded, setIsExpanded] = useState(true);
   const [isFullHeight, setIsFullHeight] = useState(false);
   const [autoScroll, setAutoScroll] = useState(true);
   const [filterAgent, setFilterAgent] = useState<string | null>(null);
   const [showFilters, setShowFilters] = useState(false);
   const [currentTyping, setCurrentTyping] = useState<{
     entry: ReasoningEntry;
     displayedChars: number;
   } | null>(null);
   const scrollRef = useRef<HTMLDivElement>(null);
   const streamIndexRef = useRef(0);
 
   // Get unique agents from entries + current typing
   const activeAgents = Array.from(
     new Map(
       [...entries, ...(currentTyping ? [currentTyping.entry] : [])].map((e) => [
         e.agentName,
         { name: e.agentName, avatar: e.agentAvatar, color: e.agentColor },
       ])
     ).values()
   );
 
   // Auto-scroll
   useEffect(() => {
     if (autoScroll && scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
   }, [entries, currentTyping?.displayedChars, autoScroll]);
 
   // Streaming simulation
   useEffect(() => {
     if (!isStreaming) return;
 
     const startNextEntry = () => {
       if (streamIndexRef.current >= MOCK_REASONING_STREAM.length) {
         streamIndexRef.current = 0; // loop
       }
       const data = MOCK_REASONING_STREAM[streamIndexRef.current];
       const entry: ReasoningEntry = {
         ...data,
         id: `${Date.now()}-${streamIndexRef.current}`,
         timestamp: Date.now(),
       };
       streamIndexRef.current += 1;
       setCurrentTyping({ entry, displayedChars: 0 });
     };
 
     // If nothing is typing, start after a delay
     if (!currentTyping) {
       const delay = setTimeout(startNextEntry, entries.length === 0 ? 300 : 1500);
       return () => clearTimeout(delay);
     }
 
     // Type out characters
     if (currentTyping.displayedChars < currentTyping.entry.text.length) {
       const speed = Math.random() * 12 + 6; // 6-18ms per char for fast streaming feel
       const timer = setTimeout(() => {
         setCurrentTyping((prev) =>
           prev
             ? {
                 ...prev,
                 displayedChars: Math.min(
                   prev.displayedChars + Math.ceil(Math.random() * 3 + 1),
                   prev.entry.text.length
                 ),
               }
             : null
         );
       }, speed);
       return () => clearTimeout(timer);
     }
 
     // Done typing — commit entry
     const commitTimer = setTimeout(() => {
       setEntries((prev) => [...prev, currentTyping.entry]);
       setCurrentTyping(null);
     }, 400);
     return () => clearTimeout(commitTimer);
   }, [isStreaming, currentTyping, entries.length]);
 
   const handleScrollChange = useCallback(() => {
     if (!scrollRef.current) return;
     const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
     const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
     setAutoScroll(isAtBottom);
   }, []);
 
   const filteredEntries = filterAgent
     ? entries.filter((e) => e.agentName === filterAgent)
     : entries;
 
   const showCurrentTyping =
     currentTyping && (!filterAgent || currentTyping.entry.agentName === filterAgent);
 
   const formatTime = (ts: number) => {
     const d = new Date(ts);
     return d.toLocaleTimeString("en-US", {
       hour12: false,
       hour: "2-digit",
       minute: "2-digit",
       second: "2-digit",
     });
   };
 
   return (
     <div className="rounded-xl border border-white/[0.06] bg-[#0B1120]/80 backdrop-blur-sm overflow-hidden">
       {/* Header */}
       <div
         className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] cursor-pointer"
         onClick={() => setIsExpanded(!isExpanded)}
       >
         <div className="flex items-center gap-3">
           <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
             <Brain className="w-3.5 h-3.5 text-purple-400" />
           </div>
           <div>
             <h3
               className="font-['Inter',sans-serif] text-white"
               style={{ fontSize: "14px", fontWeight: 600 }}
             >
               Live Agent Reasoning
             </h3>
             <p
               className="font-['Roboto_Mono',monospace] text-slate-500"
               style={{ fontSize: "11px" }}
             >
               {isStreaming ? "Streaming thought processes" : "Paused"} · {entries.length} entries
             </p>
           </div>
           {/* Live indicator */}
           {isStreaming && (
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
               <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
               <span
                 className="font-['Roboto_Mono',monospace] text-red-400"
                 style={{ fontSize: "10px", fontWeight: 600 }}
               >
                 LIVE
               </span>
             </div>
           )}
         </div>
         <div className="flex items-center gap-2">
           {/* Agent filter avatars (mini) */}
           {isExpanded && activeAgents.length > 0 && (
             <div className="hidden md:flex items-center gap-1 mr-2">
               {activeAgents.slice(0, 5).map((a) => (
                 <div
                   key={a.name}
                   onClick={(e) => {
                     e.stopPropagation();
                     setFilterAgent(filterAgent === a.name ? null : a.name);
                   }}
                   className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-all ${
                     filterAgent && filterAgent !== a.name ? "opacity-30" : ""
                   }`}
                   style={{
                     background: `${a.color}20`,
                     border: `1px solid ${a.color}${filterAgent === a.name ? "80" : "30"}`,
                   }}
                   title={a.name}
                 >
                   <span
                     className="font-['Roboto_Mono',monospace]"
                     style={{ fontSize: "7px", fontWeight: 700, color: a.color }}
                   >
                     {a.avatar}
                   </span>
                 </div>
               ))}
             </div>
           )}
           {/* Controls */}
           <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
             <button
               onClick={() => setIsStreaming(!isStreaming)}
               className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
               title={isStreaming ? "Pause stream" : "Resume stream"}
             >
               {isStreaming ? (
                 <Pause className="w-3.5 h-3.5 text-slate-400" />
               ) : (
                 <Play className="w-3.5 h-3.5 text-slate-400" />
               )}
             </button>
             <button
               onClick={() => setShowFilters(!showFilters)}
               className={`p-1.5 rounded-lg transition-colors ${
                 showFilters ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.06] text-slate-400"
               }`}
               title="Filter agents"
             >
               <Filter className="w-3.5 h-3.5" />
             </button>
             {isExpanded && (
               <button
                 onClick={() => setIsFullHeight(!isFullHeight)}
                 className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                 title={isFullHeight ? "Collapse" : "Expand"}
               >
                 {isFullHeight ? (
                   <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                 ) : (
                   <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                 )}
               </button>
             )}
           </div>
           <button className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
             {isExpanded ? (
               <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
             ) : (
               <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
             )}
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
             {/* Filter bar */}
             <AnimatePresence>
               {showFilters && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: "auto", opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="overflow-hidden"
                 >
                   <div className="px-5 py-2.5 border-b border-white/[0.04] flex items-center gap-2 flex-wrap">
                     <span
                       className="font-['Roboto_Mono',monospace] text-slate-600"
                       style={{ fontSize: "10px" }}
                     >
                       FILTER:
                     </span>
                     <button
                       onClick={() => setFilterAgent(null)}
                       className={`px-2 py-1 rounded-md transition-all font-['Inter',sans-serif] ${
                         !filterAgent
                           ? "bg-white/[0.08] text-white border border-white/[0.12]"
                           : "text-slate-500 hover:text-slate-300 border border-transparent"
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
                           filterAgent === a.name
                             ? "bg-white/[0.06] border-white/[0.12] text-white"
                             : "text-slate-500 hover:text-slate-300 border-transparent"
                         }`}
                         style={{ fontSize: "11px", fontWeight: 500 }}
                       >
                         <Circle
                           className="w-2 h-2"
                           fill={a.color}
                           stroke="none"
                         />
                         {a.name}
                       </button>
                     ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
 
             {/* Reasoning feed */}
             <div
               ref={scrollRef}
               onScroll={handleScrollChange}
               className="overflow-y-auto scrollbar-thin"
               style={{
                 maxHeight: isFullHeight ? "600px" : "340px",
                 minHeight: "120px",
               }}
             >
               {filteredEntries.length === 0 && !showCurrentTyping && (
                 <div className="flex items-center justify-center py-12">
                   <div className="text-center">
                     <Brain className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                     <p
                       className="font-['Inter',sans-serif] text-slate-600"
                       style={{ fontSize: "13px" }}
                     >
                       {isStreaming
                         ? "Waiting for agent reasoning..."
                         : "Stream paused"}
                     </p>
                   </div>
                 </div>
               )}
 
               <div className="divide-y divide-white/[0.03]">
                 {filteredEntries.map((entry) => (
                   <ReasoningEntryRow key={entry.id} entry={entry} formatTime={formatTime} />
                 ))}
 
                 {/* Currently typing entry */}
                 {showCurrentTyping && currentTyping && (
                   <ReasoningEntryRow
                     key="typing"
                     entry={currentTyping.entry}
                     formatTime={formatTime}
                     displayedChars={currentTyping.displayedChars}
                     isTyping
                   />
                 )}
               </div>
             </div>
 
             {/* Scroll-to-bottom nudge */}
             {!autoScroll && (
               <div className="relative">
                 <button
                   onClick={() => {
                     setAutoScroll(true);
                     scrollRef.current?.scrollTo({
                       top: scrollRef.current.scrollHeight,
                       behavior: "smooth",
                     });
                   }}
                   className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 border border-white/[0.1] shadow-lg hover:bg-slate-700/90 transition-colors"
                 >
                   <ChevronDown className="w-3 h-3 text-slate-300" />
                   <span
                     className="font-['Inter',sans-serif] text-slate-300"
                     style={{ fontSize: "11px", fontWeight: 500 }}
                   >
                     New reasoning
                   </span>
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
   displayedChars,
   isTyping,
 }: {
   entry: ReasoningEntry;
   formatTime: (ts: number) => string;
   displayedChars?: number;
   isTyping?: boolean;
 }) {
   const phaseInfo = PHASE_LABELS[entry.phase];
   const text =
     displayedChars !== undefined
       ? entry.text.slice(0, displayedChars)
       : entry.text;
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 6 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.2 }}
       className={`px-5 py-3.5 hover:bg-white/[0.015] transition-colors ${
         isTyping ? "bg-white/[0.01]" : ""
       }`}
     >
       <div className="flex gap-3">
         {/* Agent avatar */}
         <div className="flex-shrink-0 pt-0.5">
           <div
             className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{
               background: `${entry.agentColor}12`,
               border: `1px solid ${entry.agentColor}30`,
             }}
           >
             <span
               className="font-['Roboto_Mono',monospace]"
               style={{
                 fontSize: "10px",
                 fontWeight: 700,
                 color: entry.agentColor,
               }}
             >
               {entry.agentAvatar}
             </span>
           </div>
         </div>
 
         {/* Content */}
         <div className="flex-1 min-w-0">
           {/* Meta row */}
           <div className="flex items-center gap-2 mb-1 flex-wrap">
             <span
               className="font-['Inter',sans-serif] text-white"
               style={{ fontSize: "12px", fontWeight: 600 }}
             >
               {entry.agentName}
             </span>
             <span
               className="px-1.5 py-0.5 rounded font-['Roboto_Mono',monospace]"
               style={{
                 fontSize: "9px",
                 fontWeight: 600,
                 color: phaseInfo.color,
                 background: `${phaseInfo.color}12`,
                 border: `1px solid ${phaseInfo.color}25`,
                 letterSpacing: "0.05em",
               }}
             >
               {phaseInfo.label}
             </span>
             <span
               className="font-['Roboto_Mono',monospace] text-slate-600"
               style={{ fontSize: "10px" }}
             >
               R{entry.round}
             </span>
             <span
               className="font-['Roboto_Mono',monospace] text-slate-700 ml-auto"
               style={{ fontSize: "10px" }}
             >
               {formatTime(entry.timestamp)}
             </span>
           </div>
 
           {/* Reasoning text */}
           <p
             className="text-slate-400 font-['Inter',sans-serif]"
             style={{ fontSize: "12px", lineHeight: "1.7" }}
           >
             {text}
             {isTyping && displayedChars !== undefined && displayedChars < entry.text.length && (
               <span
                 className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-pulse"
                 style={{ background: entry.agentColor }}
               />
             )}
           </p>
         </div>
       </div>
     </motion.div>
   );
 }