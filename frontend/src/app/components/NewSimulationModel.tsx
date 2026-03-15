import { useState, useEffect } from "react";
import { useSimulation } from "../../context/SimulationContext";
import { fetchPersonas, createPersona, updatePersona } from "../../lib/api";
import {
    X,
    Zap,
    Users,
    ChevronDown,
    Info,
    Sparkles,
    Plus,
    Minus,
    Brain,
    Sliders,
    Pencil,
    Trash2,
    Check,
    UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NewSimulationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const POLICY_DOMAINS = [
   "Labor & Wages",
   "Taxation",
   "Healthcare",
   "Trade & Tariffs",
   "Housing",
   "Climate & Energy",
   "Education",
   "Financial Regulation",
 ];
 
 const AGENT_PRESETS = [
   { id: "balanced", label: "Balanced Panel", desc: "5 diverse stakeholder agents", count: 5 },
   { id: "adversarial", label: "Adversarial", desc: "Opposing viewpoint pairs", count: 6 },
   { id: "expert", label: "Expert Council", desc: "Domain specialists only", count: 4 },
   { id: "custom", label: "Custom", desc: "Choose your own agents", count: 0 },
 ];
 
 interface Agent {
   id: string;
   name: string;
   color: string;
   isCustom?: boolean;
 }
 
 
 interface PersonalityTrait {
   id: string;
   label: string;
   desc: string;
   color: string;
   isCustom?: boolean;
 }
 
 const BUILTIN_TRAITS: PersonalityTrait[] = [
   { id: "hawkish", label: "Hawkish", desc: "Aggressive, prioritizes growth", color: "#ef4444" },
   { id: "dovish", label: "Dovish", desc: "Cautious, risk-averse", color: "#38bdf8" },
   { id: "pragmatic", label: "Pragmatic", desc: "Data-driven, centrist", color: "#34d399" },
   { id: "idealistic", label: "Idealistic", desc: "Principle-driven, reformist", color: "#a78bfa" },
   { id: "contrarian", label: "Contrarian", desc: "Challenges consensus", color: "#f97316" },
   { id: "collaborative", label: "Collaborative", desc: "Seeks compromise", color: "#fbbf24" },
 ];
 
 const COLOR_PALETTE = [
   "#ef4444", "#f97316", "#fbbf24", "#34d399", "#22d3ee",
   "#38bdf8", "#818cf8", "#a78bfa", "#f472b6", "#6ee7b7",
   "#e879f9", "#fb923c",
 ];
 
 interface AgentPersonality {
   trait: string;
   stubbornness: number;
   prompt: string;
 }
 
 
 export function NewSimulationModal({ isOpen, onClose }: NewSimulationModalProps) {
   const [step, setStep] = useState(0);
   const [policyTitle, setPolicyTitle] = useState("");
   const [policyText, setPolicyText] = useState("");
   const [policyDescription, setPolicyDescription] = useState("");
   const [selectedDomain, setSelectedDomain] = useState("");
   const [domainOpen, setDomainOpen] = useState(false);
   const [rounds, setRounds] = useState(10);
   const [consensusThreshold, setConsensusThreshold] = useState(0.6);
   const [selectedPreset, setSelectedPreset] = useState("balanced");
   const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
   const [convergenceMode, setConvergenceMode] = useState("adaptive");
   const [agentPersonalities, setAgentPersonalities] = useState<Record<string, AgentPersonality>>({});
   const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
 
   // Custom agents
   const [customAgents, setCustomAgents] = useState<Agent[]>([]);
   const [showNewAgent, setShowNewAgent] = useState(false);
   const [newAgentName, setNewAgentName] = useState("");
   const [newAgentColor, setNewAgentColor] = useState(COLOR_PALETTE[4]);
 
   const [dbAgents, setDbAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const allAgents: Agent[] = [
    ...dbAgents,
    ...customAgents.map((a) => ({ ...a, isCustom: true })),
  ];
 
   // Custom traits
   const [customTraits, setCustomTraits] = useState<PersonalityTrait[]>([]);
   const [showNewTrait, setShowNewTrait] = useState(false);
   const [newTraitLabel, setNewTraitLabel] = useState("");
   const [newTraitDesc, setNewTraitDesc] = useState("");
   const [newTraitColor, setNewTraitColor] = useState(COLOR_PALETTE[0]);
 
   const allTraits: PersonalityTrait[] = [
     ...BUILTIN_TRAITS,
     ...customTraits.map((t) => ({ ...t, isCustom: true })),
   ];
 
   const steps = ["Policy Setup", "Agent Configuration", "Parameters"];
 
   const toggleAgent = (id: string) => {
     setSelectedAgents((prev) =>
       prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
     );
     // Ensure personality exists when selecting
     if (!agentPersonalities[id]) {
       setAgentPersonalities((prev) => ({
         ...prev,
         [id]: { trait: "pragmatic", stubbornness: 50, prompt: "" },
       }));
     }
   };
 
   const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === "balanced") setSelectedAgents(dbAgents.slice(0, 5).map((a) => a.id));
    else if (presetId === "adversarial") setSelectedAgents(dbAgents.slice(0, 6).map((a) => a.id));
    else if (presetId === "expert") setSelectedAgents(dbAgents.slice(0, 4).map((a) => a.id));
  };
 
   const updatePersonality = (agentId: string, patch: Partial<AgentPersonality>) => {
     setAgentPersonalities((prev) => ({
       ...prev,
       [agentId]: { ...prev[agentId], ...patch },
     }));
   };
 
   const handleCreateTrait = () => {
     if (!newTraitLabel.trim()) return;
     const id = `custom_${Date.now()}`;
     setCustomTraits((prev) => [
       ...prev,
       { id, label: newTraitLabel.trim(), desc: newTraitDesc.trim() || "Custom personality", color: newTraitColor, isCustom: true },
     ]);
     setNewTraitLabel("");
     setNewTraitDesc("");
     setNewTraitColor(COLOR_PALETTE[0]);
     setShowNewTrait(false);
   };
 
   const handleDeleteTrait = (traitId: string) => {
     setCustomTraits((prev) => prev.filter((t) => t.id !== traitId));
     // Reset any agents using this trait back to pragmatic
     setAgentPersonalities((prev) => {
       const next = { ...prev };
       for (const key of Object.keys(next)) {
         if (next[key].trait === traitId) {
           next[key] = { ...next[key], trait: "pragmatic" };
         }
       }
       return next;
     });
   };
 
   const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;
    const name = newAgentName.trim();
    const color = newAgentColor;
    setNewAgentName("");
    setNewAgentColor(COLOR_PALETTE[4]);
    setShowNewAgent(false);
    const id = await createPersona(name, `${name} participating in policy deliberation.`);
    const newAgent: Agent = { id, name, color, isCustom: true };
    setCustomAgents((prev) => [...prev, newAgent]);
    setSelectedAgents((prev) => [...prev, id]);
    setAgentPersonalities((prev) => ({
      ...prev,
      [id]: { trait: "pragmatic", stubbornness: 50, prompt: "" },
    }));
    setSelectedPreset("custom");
  };
 
   const handleDeleteAgent = (agentId: string) => {
     setCustomAgents((prev) => prev.filter((a) => a.id !== agentId));
     setSelectedAgents((prev) => prev.filter((a) => a !== agentId));
     setAgentPersonalities((prev) => {
       const next = { ...prev };
       delete next[agentId];
       return next;
     });
   };
 
   const canProceed =
     step === 0
       ? policyTitle.trim().length > 0 && selectedDomain.length > 0 && policyText.trim().length > 0
       : step === 1
       ? selectedAgents.length >= 2
       : true;
 
  const { startSimulation } = useSimulation();
  const [savedAgents, setSavedAgents] = useState<Set<string>>(new Set());

  const handleSavePersona = async (agentId: string) => {
    const p = agentPersonalities[agentId];
    if (!p) return;
    const traitDef = allTraits.find((t) => t.id === p.trait);
    const traitLabel = traitDef?.label ?? p.trait;
    const traitDesc = traitDef?.desc ?? "";
    const riskTolerance = p.stubbornness >= 70 ? "low" : p.stubbornness >= 40 ? "medium" : "high";
    await updatePersona(agentId, {
      priorities: [traitDesc || traitLabel],
      risk_tolerance: riskTolerance,
      values: [traitLabel],
      custom_prompt: p.prompt,
    });
    setSavedAgents((prev) => new Set(prev).add(agentId));
    setTimeout(() => setSavedAgents((prev) => { const s = new Set(prev); s.delete(agentId); return s; }), 2000);
  };

  useEffect(() => {
    if (!isOpen) return;
    setCustomAgents([]);
    setAgentsLoading(true);
    fetchPersonas().then((personas) => {
      const agents: Agent[] = personas.map((p, i) => ({
        id: p._id,
        name: p.name,
        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      }));
      setDbAgents(agents);
      const initial = agents.slice(0, 5).map((a) => a.id);
      setSelectedAgents(initial);
      const initPersonalities: Record<string, AgentPersonality> = {};
      initial.forEach((id) => { initPersonalities[id] = { trait: "pragmatic", stubbornness: 50, prompt: "" }; });
      setAgentPersonalities(initPersonalities);
    }).catch(() => {}).finally(() => setAgentsLoading(false));
  }, [isOpen]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const agentPersonalitiesPayload: Record<string, { trait: string; trait_desc: string; stubbornness: number; prompt: string }> = {};
      for (const agentId of selectedAgents) {
        const p = agentPersonalities[agentId] ?? { trait: "pragmatic", stubbornness: 50, prompt: "" };
        const traitDef = allTraits.find((t) => t.id === p.trait);
        agentPersonalitiesPayload[agentId] = {
          trait: traitDef?.label ?? p.trait,
          trait_desc: traitDef?.desc ?? "",
          stubbornness: p.stubbornness,
          prompt: p.prompt,
        };
      }

      await startSimulation({
        title: policyTitle,
        description: policyDescription || policyText,
        initial_policy: policyText,
        category: selectedDomain.toLowerCase().replace(/\s*&\s*/g, "-").replace(/\s+/g, "-"),
        supporting_data: {},
        max_rounds: rounds,
        num_agents: selectedAgents.length,
        cas_threshold: consensusThreshold,
        variance_threshold: 0.15,
        convergence_mode: convergenceMode as "fixed" | "adaptive" | "exploratory",
        agents: selectedAgents.map((id) => {
          const agent = allAgents.find((a) => a.id === id)!;
          return { id: agent.id, name: agent.name };
        }),
        agent_personalities: agentPersonalitiesPayload,
      });
    } catch (e) {
      console.error("Failed to start simulation", e);
    } finally {
      setSubmitting(false);
    }
    onClose();
    setStep(0);
    setPolicyTitle("");
    setPolicyText("");
    setPolicyDescription("");
    setSelectedDomain("");
    setRounds(10);
    setConsensusThreshold(0.6);
    setSelectedPreset("balanced");
    setSelectedAgents(dbAgents.slice(0, 5).map((a) => a.id));
    setAgentPersonalities({});
    setCustomAgents([]);
    setShowNewAgent(false);
    setCustomTraits([]);
    setShowNewTrait(false);
  };
 
   return (
     <AnimatePresence>
       {isOpen && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.2 }}
           className="fixed inset-0 z-50 flex items-center justify-center p-4"
           onClick={onClose}
         >
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
 
           <motion.div
             initial={{ opacity: 0, scale: 0.95, y: 10 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95, y: 10 }}
             transition={{ duration: 0.25, ease: "easeOut" }}
             className="relative w-full max-w-[640px] max-h-[90vh] overflow-hidden rounded-2xl border border-white/[0.08]"
             style={{
               background: "linear-gradient(180deg, #111827 0%, #0B1120 100%)",
               boxShadow: "0 0 80px rgba(0,0,0,0.6), 0 0 40px rgba(52,211,153,0.04)",
             }}
             onClick={(e) => e.stopPropagation()}
           >
             {/* Header */}
             <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
               <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                   <Sparkles className="w-4.5 h-4.5 text-[#0F172A]" />
                 </div>
                 <div>
                   <h2 className="font-['Inter',sans-serif] text-white" style={{ fontSize: "16px", fontWeight: 600 }}>
                     New Simulation
                   </h2>
                   <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>
                     Configure your AI-powered policy analysis
                   </p>
                 </div>
               </div>
               <button
                 onClick={onClose}
                 className="p-2 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-slate-300 transition-colors"
               >
                 <X className="w-4.5 h-4.5" />
               </button>
             </div>
 
             {/* Step Indicator */}
             <div className="px-6 py-3 border-b border-white/[0.04] flex items-center gap-2">
               {steps.map((s, i) => (
                 <div key={s} className="flex items-center gap-2">
                   <button
                     onClick={() => { if (i < step) setStep(i); }}
                     className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                       i === step
                         ? "bg-white/[0.08] text-white"
                         : i < step
                         ? "text-emerald-400 hover:bg-white/[0.04] cursor-pointer"
                         : "text-slate-600 cursor-default"
                     }`}
                   >
                     <span
                       className={`w-5 h-5 rounded-full flex items-center justify-center font-['Roboto_Mono',monospace] ${
                         i < step
                           ? "bg-emerald-500/20 text-emerald-400"
                           : i === step
                           ? "bg-cyan-500/20 text-cyan-400"
                           : "bg-white/[0.04] text-slate-600"
                       }`}
                       style={{ fontSize: "10px", fontWeight: 600 }}
                     >
                       {i < step ? "\u2713" : i + 1}
                     </span>
                     <span className="font-['Inter',sans-serif]" style={{ fontSize: "12px", fontWeight: 500 }}>
                       {s}
                     </span>
                   </button>
                   {i < steps.length - 1 && (
                     <div className={`w-6 h-px ${i < step ? "bg-emerald-500/40" : "bg-white/[0.06]"}`} />
                   )}
                 </div>
               ))}
             </div>
 
             {/* Body */}
             <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: "calc(90vh - 200px)" }}>
               <AnimatePresence mode="wait">
                 {/* Step 0: Policy Setup */}
                 {step === 0 && (
                   <motion.div
                     key="step0"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     transition={{ duration: 0.2 }}
                     className="space-y-5"
                   >
                     <div className="space-y-2">
                       <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                         Policy Title <span className="text-red-400">*</span>
                       </label>
                       <input
                         type="text"
                         value={policyTitle}
                         onChange={(e) => setPolicyTitle(e.target.value)}
                         placeholder="e.g., Federal Minimum Wage Increase to $15"
                         className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-['Inter',sans-serif]"
                         style={{ fontSize: "13px" }}
                       />
                     </div>
 
                     <div className="space-y-2">
                       <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                         Policy Domain <span className="text-red-400">*</span>
                       </label>
                       <div className="relative">
                         <button
                           onClick={() => setDomainOpen(!domainOpen)}
                           className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-left hover:bg-white/[0.06] transition-colors"
                         >
                           <span
                             className={`font-['Inter',sans-serif] ${selectedDomain ? "text-white" : "text-slate-600"}`}
                             style={{ fontSize: "13px" }}
                           >
                             {selectedDomain || "Select a policy domain..."}
                           </span>
                           <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${domainOpen ? "rotate-180" : ""}`} />
                         </button>
                         {domainOpen && (
                           <div
                             className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-white/[0.08] overflow-hidden z-20"
                             style={{ background: "#111827" }}
                           >
                             {POLICY_DOMAINS.map((domain) => (
                               <button
                                 key={domain}
                                 onClick={() => { setSelectedDomain(domain); setDomainOpen(false); }}
                                 className={`w-full text-left px-3.5 py-2 hover:bg-white/[0.06] transition-colors font-['Inter',sans-serif] ${
                                   selectedDomain === domain ? "text-cyan-400 bg-cyan-500/[0.06]" : "text-slate-300"
                                 }`}
                                 style={{ fontSize: "13px" }}
                               >
                                 {domain}
                               </button>
                             ))}
                           </div>
                         )}
                       </div>
                     </div>
 
                     <div className="space-y-2">
                       <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                         Initial Policy Text <span className="text-red-400">*</span>
                       </label>
                       <textarea
                         value={policyText}
                         onChange={(e) => setPolicyText(e.target.value)}
                         placeholder="Write the current policy statement or proposal that agents will deliberate on. E.g., 'Section 1: The federal minimum wage shall be raised to $15/hr effective January 1, 2026...'"
                         rows={4}
                         className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-['Inter',sans-serif] resize-none"
                         style={{ fontSize: "13px", lineHeight: "1.6" }}
                       />
                     </div>

                     <div className="space-y-2">
                       <div className="flex items-center justify-between">
                         <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                           Background &amp; Context
                         </label>
                         <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>Optional</span>
                       </div>
                       <textarea
                         value={policyDescription}
                         onChange={(e) => setPolicyDescription(e.target.value)}
                         placeholder="Additional context, stakeholder concerns, or data that agents should be aware of..."
                         rows={3}
                         className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-['Inter',sans-serif] resize-none"
                         style={{ fontSize: "13px", lineHeight: "1.6" }}
                       />
                     </div>

                     <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-cyan-500/[0.05] border border-cyan-500/[0.1]">
                       <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                       <p className="font-['Inter',sans-serif] text-slate-400" style={{ fontSize: "12px", lineHeight: "1.5" }}>
                         The initial policy text is the starting point for deliberation. Agents will propose and debate modifications to it across rounds.
                       </p>
                     </div>
                   </motion.div>
                 )}
 
                 {/* Step 1: Agent Configuration */}
                 {step === 1 && (
                   <motion.div
                     key="step1"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     transition={{ duration: 0.2 }}
                     className="space-y-5"
                   >
                     {/* Agent Presets */}
                     <div className="space-y-2">
                       <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                         Agent Panel Preset
                       </label>
                       <div className="grid grid-cols-2 gap-2">
                         {AGENT_PRESETS.map((preset) => (
                           <button
                             key={preset.id}
                             onClick={() => handlePresetSelect(preset.id)}
                             className={`text-left p-3 rounded-xl border transition-all ${
                               selectedPreset === preset.id
                                 ? "border-cyan-500/40 bg-cyan-500/[0.06]"
                                 : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                             }`}
                           >
                             <p
                               className={`font-['Inter',sans-serif] ${
                                 selectedPreset === preset.id ? "text-cyan-400" : "text-slate-300"
                               }`}
                               style={{ fontSize: "13px", fontWeight: 500 }}
                             >
                               {preset.label}
                             </p>
                             <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>
                               {preset.desc}
                             </p>
                           </button>
                         ))}
                       </div>
                     </div>
 
                     {/* Agent Selection */}
                     <div className="space-y-2">
                       <div className="flex items-center justify-between">
                         <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                           Active Agents
                         </label>
                         <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>
                           {selectedAgents.length} selected (min 2)
                         </span>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         {agentsLoading && (
                           <div className="col-span-2 py-6 text-center font-['Inter',sans-serif] text-slate-500" style={{ fontSize: "13px" }}>
                             Loading agents...
                           </div>
                         )}
                         {!agentsLoading && allAgents.map((agent) => {
                           const isSelected = selectedAgents.includes(agent.id);
                           return (
                             <div
                               key={agent.id}
                               className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer group ${
                                 isSelected
                                   ? "border-white/[0.12] bg-white/[0.04]"
                                   : "border-white/[0.04] bg-transparent hover:bg-white/[0.02] opacity-50"
                               }`}
                               onClick={() => { toggleAgent(agent.id); setSelectedPreset("custom"); }}
                             >
                               <div
                                 className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                 style={{
                                   background: isSelected ? `${agent.color}18` : "rgba(255,255,255,0.03)",
                                   border: `1px solid ${isSelected ? `${agent.color}35` : "rgba(255,255,255,0.05)"}`,
                                 }}
                               >
                                 <Users className="w-3 h-3" style={{ color: isSelected ? agent.color : "#475569" }} />
                               </div>
                               <span
                                 className={`font-['Inter',sans-serif] flex-1 truncate ${isSelected ? "text-slate-200" : "text-slate-500"}`}
                                 style={{ fontSize: "12px", fontWeight: 500 }}
                               >
                                 {agent.name}
                               </span>
                               {agent.isCustom && (
                                 <button
                                   onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }}
                                   className="absolute top-1 right-1 p-1 rounded-md bg-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                                 >
                                   <X className="w-2.5 h-2.5" />
                                 </button>
                               )}
                             </div>
                           );
                         })}
 
                         {/* Create New Agent Card */}
                         {!showNewAgent ? (
                           <button
                             onClick={() => setShowNewAgent(true)}
                             className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all group"
                           >
                             <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.03] border border-dashed border-white/[0.1] group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 transition-all">
                               <UserPlus className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                             </div>
                             <span className="font-['Inter',sans-serif] text-slate-500 group-hover:text-emerald-400 transition-colors" style={{ fontSize: "12px", fontWeight: 500 }}>
                               Create Agent
                             </span>
                           </button>
                         ) : (
                           <div className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3 space-y-3">
                             <div className="flex items-center gap-2">
                               <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                               <p className="font-['Roboto_Mono',monospace] text-emerald-400" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                 NEW AGENT
                               </p>
                             </div>
                             <input
                               type="text"
                               value={newAgentName}
                               onChange={(e) => setNewAgentName(e.target.value)}
                               placeholder="Agent name (e.g., Gym Bro, Retiree, Gen Z Intern)"
                               className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all font-['Inter',sans-serif]"
                               style={{ fontSize: "12px" }}
                               autoFocus
                               onKeyDown={(e) => { if (e.key === "Enter") handleCreateAgent(); if (e.key === "Escape") setShowNewAgent(false); }}
                             />
                             <div className="space-y-1">
                               <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px" }}>COLOR</p>
                               <div className="flex flex-wrap gap-1.5">
                                 {COLOR_PALETTE.map((c) => (
                                   <button
                                     key={c}
                                     onClick={() => setNewAgentColor(c)}
                                     className="w-5.5 h-5.5 rounded-md border-2 transition-all flex items-center justify-center"
                                     style={{
                                       width: "22px",
                                       height: "22px",
                                       background: c,
                                       borderColor: newAgentColor === c ? "white" : `${c}60`,
                                       transform: newAgentColor === c ? "scale(1.15)" : "scale(1)",
                                     }}
                                   >
                                     {newAgentColor === c && <Check className="w-2.5 h-2.5 text-white" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }} />}
                                   </button>
                                 ))}
                               </div>
                             </div>
                             {/* Preview */}
                             {newAgentName.trim() && (
                               <div className="flex items-center gap-2 pt-0.5">
                                 <p className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>PREVIEW</p>
                                 <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                   <div
                                     className="w-5 h-5 rounded-md flex items-center justify-center"
                                     style={{ background: `${newAgentColor}20`, border: `1px solid ${newAgentColor}40` }}
                                   >
                                     <Users className="w-2.5 h-2.5" style={{ color: newAgentColor }} />
                                   </div>
                                   <span className="font-['Inter',sans-serif] text-slate-200" style={{ fontSize: "11px", fontWeight: 500 }}>
                                     {newAgentName.trim()}
                                   </span>
                                 </div>
                               </div>
                             )}
                             <div className="flex items-center gap-2 pt-0.5">
                               <button
                                 onClick={() => { setShowNewAgent(false); setNewAgentName(""); }}
                                 className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors font-['Inter',sans-serif]"
                                 style={{ fontSize: "11px", fontWeight: 500 }}
                               >
                                 Cancel
                               </button>
                               <button
                                 onClick={handleCreateAgent}
                                 disabled={!newAgentName.trim()}
                                 className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all font-['Inter',sans-serif] ${
                                   newAgentName.trim()
                                     ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                                     : "bg-white/[0.02] border-white/[0.04] text-slate-600 cursor-not-allowed"
                                 }`}
                                 style={{ fontSize: "11px", fontWeight: 500 }}
                               >
                                 <Plus className="w-3 h-3" />
                                 Add Agent
                               </button>
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
 
                     {/* Agent Personalities */}
                     {selectedAgents.length > 0 && (
                       <div className="space-y-2.5">
                         <div className="flex items-center gap-2">
                           <Brain className="w-3.5 h-3.5 text-purple-400" />
                           <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                             Agent Personalities
                           </label>
                           <span className="font-['Roboto_Mono',monospace] text-slate-600 ml-auto" style={{ fontSize: "10px" }}>
                             Click to configure
                           </span>
                         </div>
 
                         {/* Custom Trait Manager */}
                         <div className="rounded-xl border border-dashed border-purple-500/20 bg-purple-500/[0.03] p-3 space-y-2.5">
                           <div className="flex items-center justify-between">
                             <p className="font-['Roboto_Mono',monospace] text-purple-400" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                               CUSTOM DISPOSITIONS
                             </p>
                             {!showNewTrait && (
                               <button
                                 onClick={() => setShowNewTrait(true)}
                                 className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors"
                                 style={{ fontSize: "10px" }}
                               >
                                 <Plus className="w-3 h-3" />
                                 <span className="font-['Inter',sans-serif]" style={{ fontWeight: 500 }}>New Trait</span>
                               </button>
                             )}
                           </div>
 
                           {/* Existing custom traits */}
                           {customTraits.length > 0 && (
                             <div className="flex flex-wrap gap-1.5">
                               {customTraits.map((trait) => (
                                 <div
                                   key={trait.id}
                                   className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border group"
                                   style={{
                                     background: `${trait.color}10`,
                                     borderColor: `${trait.color}25`,
                                   }}
                                 >
                                   <span
                                     className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                     style={{ background: trait.color }}
                                   />
                                   <span
                                     className="font-['Inter',sans-serif]"
                                     style={{ fontSize: "11px", fontWeight: 500, color: trait.color }}
                                   >
                                     {trait.label}
                                   </span>
                                   <button
                                     onClick={() => handleDeleteTrait(trait.id)}
                                     className="p-0.5 rounded hover:bg-white/[0.1] text-slate-600 hover:text-red-400 transition-colors ml-0.5"
                                   >
                                     <X className="w-2.5 h-2.5" />
                                   </button>
                                 </div>
                               ))}
                             </div>
                           )}
 
                           {customTraits.length === 0 && !showNewTrait && (
                             <p className="font-['Inter',sans-serif] text-slate-600" style={{ fontSize: "11px" }}>
                               No custom traits yet. Create one to define unique agent behaviors.
                             </p>
                           )}
 
                           {/* New Trait Form */}
                           {showNewTrait && (
                             <div className="space-y-2.5 pt-1">
                               <div className="flex gap-2">
                                 <input
                                   type="text"
                                   value={newTraitLabel}
                                   onChange={(e) => setNewTraitLabel(e.target.value)}
                                   placeholder="Trait name (e.g., Populist)"
                                   className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-['Inter',sans-serif]"
                                   style={{ fontSize: "12px" }}
                                   autoFocus
                                   onKeyDown={(e) => { if (e.key === "Enter") handleCreateTrait(); }}
                                 />
                               </div>
                               <input
                                 type="text"
                                 value={newTraitDesc}
                                 onChange={(e) => setNewTraitDesc(e.target.value)}
                                 placeholder="Short description (e.g., Appeals to majority sentiment)"
                                 className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-['Inter',sans-serif]"
                                 style={{ fontSize: "12px" }}
                                 onKeyDown={(e) => { if (e.key === "Enter") handleCreateTrait(); }}
                               />
                               <div className="space-y-1">
                                 <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px" }}>
                                   COLOR
                                 </p>
                                 <div className="flex flex-wrap gap-1.5">
                                   {COLOR_PALETTE.map((c) => (
                                     <button
                                       key={c}
                                       onClick={() => setNewTraitColor(c)}
                                       className="w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center"
                                       style={{
                                         background: c,
                                         borderColor: newTraitColor === c ? "white" : `${c}60`,
                                         transform: newTraitColor === c ? "scale(1.15)" : "scale(1)",
                                       }}
                                     >
                                       {newTraitColor === c && <Check className="w-3 h-3 text-white" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }} />}
                                     </button>
                                   ))}
                                 </div>
                               </div>
 
                               {/* Preview */}
                               {newTraitLabel.trim() && (
                                 <div className="flex items-center gap-2 pt-1">
                                   <p className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>PREVIEW</p>
                                   <span
                                     className="px-2 py-0.5 rounded-md font-['Roboto_Mono',monospace]"
                                     style={{
                                       fontSize: "10px",
                                       fontWeight: 500,
                                       color: newTraitColor,
                                       background: `${newTraitColor}12`,
                                       border: `1px solid ${newTraitColor}25`,
                                     }}
                                   >
                                     {newTraitLabel.trim()}
                                   </span>
                                 </div>
                               )}
 
                               <div className="flex items-center gap-2 pt-0.5">
                                 <button
                                   onClick={() => { setShowNewTrait(false); setNewTraitLabel(""); setNewTraitDesc(""); }}
                                   className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors font-['Inter',sans-serif]"
                                   style={{ fontSize: "11px", fontWeight: 500 }}
                                 >
                                   Cancel
                                 </button>
                                 <button
                                   onClick={handleCreateTrait}
                                   disabled={!newTraitLabel.trim()}
                                   className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all font-['Inter',sans-serif] ${
                                     newTraitLabel.trim()
                                       ? "bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25"
                                       : "bg-white/[0.02] border-white/[0.04] text-slate-600 cursor-not-allowed"
                                   }`}
                                   style={{ fontSize: "11px", fontWeight: 500 }}
                                 >
                                   <Plus className="w-3 h-3" />
                                   Create Trait
                                 </button>
                               </div>
                             </div>
                           )}
                         </div>
 
                         {/* Per-Agent Personality Rows */}
                         <div className="space-y-1.5">
                          {allAgents.filter((a) => selectedAgents.includes(a.id)).map((agent) => {
                            const personality = agentPersonalities[agent.id] ?? { trait: "pragmatic", stubbornness: 50, prompt: "" };
                            const traitData = allTraits.find((t) => t.id === personality.trait);
                            const isExpanded = expandedAgent === agent.id;
                            const hasPrompt = personality.prompt.trim().length > 0;
 
                             return (
                               <div key={agent.id} className="rounded-xl border border-white/[0.06] overflow-hidden">
                                 {/* Collapsed Row */}
                                 <button
                                   onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                                   className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
                                 >
                                   <div
                                     className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                                     style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}30` }}
                                   >
                                     <Users className="w-2.5 h-2.5" style={{ color: agent.color }} />
                                   </div>
                                   <span className="font-['Inter',sans-serif] text-slate-300 flex-1 text-left" style={{ fontSize: "12px", fontWeight: 500 }}>
                                     {agent.name}
                                   </span>
                                   {hasPrompt && (
                                     <Pencil className="w-3 h-3 text-emerald-500/60" />
                                   )}
                                   {traitData && (
                                     <span
                                       className="px-2 py-0.5 rounded-md font-['Roboto_Mono',monospace]"
                                       style={{
                                         fontSize: "10px",
                                         fontWeight: 500,
                                         color: traitData.color,
                                         background: `${traitData.color}12`,
                                         border: `1px solid ${traitData.color}25`,
                                       }}
                                     >
                                       {traitData.label}
                                     </span>
                                   )}
                                   <div className="flex items-center gap-1.5">
                                     <Sliders className="w-3 h-3 text-slate-600" />
                                     <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px" }}>
                                       {personality.stubbornness}%
                                     </span>
                                   </div>
                                   <ChevronDown
                                     className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                   />
                                 </button>
 
                                 {/* Expanded Panel */}
                                 {isExpanded && (
                                   <div className="px-3 pb-3 pt-1 border-t border-white/[0.04] space-y-3">
                                     {/* Trait Tags */}
                                     <div className="space-y-1.5">
                                       <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px", letterSpacing: "0.04em" }}>
                                         DISPOSITION
                                       </p>
                                       <div className="flex flex-wrap gap-1.5">
                                         {allTraits.map((trait) => (
                                           <button
                                             key={trait.id}
                                             onClick={() => updatePersonality(agent.id, { trait: trait.id })}
                                             className={`px-2.5 py-1 rounded-lg border transition-all font-['Inter',sans-serif] ${
                                               personality.trait === trait.id
                                                 ? ""
                                                 : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] text-slate-400"
                                             }`}
                                             style={{
                                               fontSize: "11px",
                                               fontWeight: 500,
                                               ...(personality.trait === trait.id
                                                 ? {
                                                     color: trait.color,
                                                     background: `${trait.color}10`,
                                                     borderColor: `${trait.color}30`,
                                                   }
                                                 : {}),
                                             }}
                                           >
                                             {trait.isCustom && (
                                               <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: trait.color, verticalAlign: "middle" }} />
                                             )}
                                             {trait.label}
                                           </button>
                                         ))}
                                       </div>
                                       {traitData && (
                                         <p className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>
                                           {traitData.desc}
                                           {traitData.isCustom && (
                                             <button
                                               onClick={() => handleDeleteTrait(traitData.id)}
                                               className="inline-flex items-center gap-0.5 ml-2 text-red-400/60 hover:text-red-400 transition-colors"
                                             >
                                               <Trash2 className="w-2.5 h-2.5" />
                                               <span style={{ fontSize: "9px" }}>delete trait</span>
                                             </button>
                                           )}
                                         </p>
                                       )}
                                     </div>
 
                                     {/* Stubbornness Slider */}
                                     <div className="space-y-1.5">
                                       <div className="flex items-center justify-between">
                                         <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px", letterSpacing: "0.04em" }}>
                                           STUBBORNNESS
                                         </p>
                                         <span
                                           className="font-['Roboto_Mono',monospace]"
                                           style={{
                                             fontSize: "11px",
                                             fontWeight: 600,
                                             color: personality.stubbornness > 70 ? "#f97316" : personality.stubbornness > 40 ? "#fbbf24" : "#34d399",
                                           }}
                                         >
                                           {personality.stubbornness}%
                                         </span>
                                       </div>
                                       <input
                                         type="range"
                                         min={5}
                                         max={95}
                                         value={personality.stubbornness}
                                         onChange={(e) => updatePersonality(agent.id, { stubbornness: Number(e.target.value) })}
                                         className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                         style={{
                                           background: `linear-gradient(to right, ${
                                             personality.stubbornness > 70 ? "#f97316" : personality.stubbornness > 40 ? "#fbbf24" : "#34d399"
                                           } 0%, ${
                                             personality.stubbornness > 70 ? "#f97316" : personality.stubbornness > 40 ? "#fbbf24" : "#34d399"
                                           } ${((personality.stubbornness - 5) / 90) * 100}%, rgba(255,255,255,0.06) ${
                                             ((personality.stubbornness - 5) / 90) * 100
                                           }%, rgba(255,255,255,0.06) 100%)`,
                                         }}
                                       />
                                       <div className="flex justify-between">
                                         <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "9px" }}>Flexible</span>
                                         <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "9px" }}>Rigid</span>
                                       </div>
                                     </div>
 
                                     {/* Custom Persona Prompt */}
                                     <div className="space-y-1.5">
                                       <div className="flex items-center gap-1.5">
                                         <Pencil className="w-3 h-3 text-slate-500" />
                                         <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px", letterSpacing: "0.04em" }}>
                                           PERSONA PROMPT
                                         </p>
                                         <span className="font-['Roboto_Mono',monospace] text-slate-700 ml-auto" style={{ fontSize: "9px" }}>
                                           Optional
                                         </span>
                                       </div>
                                       <textarea
                                         value={personality.prompt}
                                         onChange={(e) => updatePersonality(agent.id, { prompt: e.target.value })}
                                         placeholder={`Define ${agent.name}'s unique perspective, biases, priorities, or negotiation style...`}
                                         rows={3}
                                         className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/15 transition-all font-['Inter',sans-serif] resize-none"
                                         style={{ fontSize: "11px", lineHeight: "1.5" }}
                                       />
                                       {personality.prompt.trim() && (
                                         <div className="flex items-center gap-1.5">
                                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                                           <p className="font-['Roboto_Mono',monospace] text-emerald-500/60" style={{ fontSize: "9px" }}>
                                             Custom persona active &mdash; {personality.prompt.trim().length} chars
                                           </p>
                                         </div>
                                       )}
                                     </div>
                                     <div className="flex justify-end pt-1">
                                       <button
                                         onClick={() => handleSavePersona(agent.id)}
                                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-['Inter',sans-serif]"
                                         style={{ fontSize: "11px", fontWeight: 500 }}
                                       >
                                         {savedAgents.has(agent.id) ? (
                                           <><Check className="w-3 h-3" /> Saved</>
                                         ) : (
                                           <><Check className="w-3 h-3" /> Save to library</>
                                         )}
                                       </button>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             );
                           })}
                         </div>
 
                         {/* Personality hint */}
                         <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-purple-500/[0.04] border border-purple-500/[0.08]">
                           <Brain className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                           <p className="font-['Inter',sans-serif] text-slate-500" style={{ fontSize: "11px", lineHeight: "1.4" }}>
                             Create custom dispositions or write free-text persona prompts to fine-tune how each agent reasons, negotiates, and weighs trade-offs.
                           </p>
                         </div>
                       </div>
                     )}
                   </motion.div>
                 )}
 
                 {/* Step 2: Parameters */}
                 {step === 2 && (
                   <motion.div
                     key="step2"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     transition={{ duration: 0.2 }}
                     className="space-y-5"
                   >
                     <div className="space-y-3">
                       <div className="flex items-center justify-between">
                         <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                           Deliberation Rounds
                         </label>
                         <span className="font-['Roboto_Mono',monospace] text-cyan-400" style={{ fontSize: "14px", fontWeight: 600 }}>
                           {rounds}
                         </span>
                       </div>
                       <div className="flex items-center gap-3">
                         <button
                           onClick={() => setRounds(Math.max(3, rounds - 1))}
                           className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
                         >
                           <Minus className="w-3.5 h-3.5" />
                         </button>
                         <div className="flex-1 relative">
                           <input
                             type="range"
                             min={3}
                             max={25}
                             value={rounds}
                             onChange={(e) => setRounds(Number(e.target.value))}
                             className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                             style={{
                               background: `linear-gradient(to right, #34d399 0%, #34d399 ${
                                 ((rounds - 3) / 22) * 100
                               }%, rgba(255,255,255,0.06) ${((rounds - 3) / 22) * 100}%, rgba(255,255,255,0.06) 100%)`,
                             }}
                           />
                         </div>
                         <button
                           onClick={() => setRounds(Math.min(25, rounds + 1))}
                           className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
                         >
                           <Plus className="w-3.5 h-3.5" />
                         </button>
                       </div>
                       <div className="flex justify-between">
                         <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>Min: 3</span>
                         <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>Max: 25</span>
                       </div>
                     </div>
 
                     <div className="space-y-3">
                       <div className="flex items-center justify-between">
                         <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                           Consensus Threshold (CAS)
                         </label>
                         <span className="font-['Roboto_Mono',monospace] text-emerald-400" style={{ fontSize: "14px", fontWeight: 600 }}>
                           {consensusThreshold.toFixed(2)}
                         </span>
                       </div>
                       <input
                         type="range"
                         min={30}
                         max={90}
                         value={consensusThreshold * 100}
                         onChange={(e) => setConsensusThreshold(Number(e.target.value) / 100)}
                         className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                         style={{
                           background: `linear-gradient(to right, #34d399 0%, #34d399 ${
                             ((consensusThreshold * 100 - 30) / 60) * 100
                           }%, rgba(255,255,255,0.06) ${
                             ((consensusThreshold * 100 - 30) / 60) * 100
                           }%, rgba(255,255,255,0.06) 100%)`,
                         }}
                       />
                       <div className="flex justify-between">
                         <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>Lenient: 0.30</span>
                         <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "10px" }}>Strict: 0.90</span>
                       </div>
                     </div>
 
                     <div className="space-y-2">
                       <label className="font-['Inter',sans-serif] text-slate-300" style={{ fontSize: "13px", fontWeight: 500 }}>
                         Convergence Mode
                       </label>
                       <div className="grid grid-cols-3 gap-2">
                         {[
                           { id: "fixed", label: "Fixed", desc: "Run all rounds regardless of consensus" },
                           { id: "adaptive", label: "Adaptive", desc: "Stop at consensus or stagnation" },
                           { id: "exploratory", label: "Exploratory", desc: "Stop at consensus, push through stagnation" },
                         ].map((mode) => (
                           <button
                             key={mode.id}
                             onClick={() => setConvergenceMode(mode.id)}
                             className={`text-center p-3 rounded-xl border transition-all ${
                               convergenceMode === mode.id
                                 ? "border-cyan-500/40 bg-cyan-500/[0.06]"
                                 : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                             }`}
                           >
                             <p
                               className={`font-['Inter',sans-serif] ${
                                 convergenceMode === mode.id ? "text-cyan-400" : "text-slate-300"
                               }`}
                               style={{ fontSize: "13px", fontWeight: 500 }}
                             >
                               {mode.label}
                             </p>
                             <p className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "10px" }}>
                               {mode.desc}
                             </p>
                           </button>
                         ))}
                       </div>
                     </div>
 
                     {/* Summary */}
                     <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
                       <p className="font-['Inter',sans-serif] text-slate-400" style={{ fontSize: "12px", fontWeight: 500 }}>
                         Simulation Summary
                       </p>
                       <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                         <div className="flex justify-between">
                           <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>Policy</span>
                           <span className="font-['Roboto_Mono',monospace] text-slate-300 truncate max-w-[140px]" style={{ fontSize: "11px" }}>
                             {policyTitle || "\u2014"}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>Domain</span>
                           <span className="font-['Roboto_Mono',monospace] text-slate-300" style={{ fontSize: "11px" }}>
                             {selectedDomain || "\u2014"}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>Agents</span>
                           <span className="font-['Roboto_Mono',monospace] text-slate-300" style={{ fontSize: "11px" }}>
                             {selectedAgents.length}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>Rounds</span>
                           <span className="font-['Roboto_Mono',monospace] text-slate-300" style={{ fontSize: "11px" }}>
                             {rounds}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>Threshold</span>
                           <span className="font-['Roboto_Mono',monospace] text-emerald-400" style={{ fontSize: "11px" }}>
                             {consensusThreshold.toFixed(2)}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>Mode</span>
                           <span className="font-['Roboto_Mono',monospace] text-slate-300 capitalize" style={{ fontSize: "11px" }}>
                             {convergenceMode}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>Custom Traits</span>
                           <span className="font-['Roboto_Mono',monospace] text-purple-400" style={{ fontSize: "11px" }}>
                             {customTraits.length}
                           </span>
                         </div>
                         <div className="flex justify-between">
                           <span className="font-['Roboto_Mono',monospace] text-slate-500" style={{ fontSize: "11px" }}>Persona Prompts</span>
                           <span className="font-['Roboto_Mono',monospace] text-emerald-400" style={{ fontSize: "11px" }}>
                             {Object.values(agentPersonalities).filter((p) => p.prompt.trim()).length}
                           </span>
                         </div>
                       </div>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
 
             {/* Footer */}
             <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
               <button
                 onClick={() => { if (step > 0) setStep(step - 1); else onClose(); }}
                 className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors font-['Inter',sans-serif]"
                 style={{ fontSize: "13px", fontWeight: 500 }}
               >
                 {step === 0 ? "Cancel" : "Back"}
               </button>
               <div className="flex items-center gap-2">
                 <span className="font-['Roboto_Mono',monospace] text-slate-600" style={{ fontSize: "11px" }}>
                   Step {step + 1} of {steps.length}
                 </span>
                 {step < steps.length - 1 ? (
                   <button
                     onClick={() => setStep(step + 1)}
                     disabled={!canProceed}
                     className={`flex items-center gap-1.5 px-5 py-2 rounded-xl transition-all font-['Inter',sans-serif] ${
                       canProceed
                         ? "bg-white/[0.1] border border-white/[0.12] text-white hover:bg-white/[0.15]"
                         : "bg-white/[0.03] border border-white/[0.04] text-slate-600 cursor-not-allowed"
                     }`}
                     style={{ fontSize: "13px", fontWeight: 500 }}
                   >
                     Continue
                   </button>
                 ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-xl transition-colors font-['Inter',sans-serif] ${
                      submitting
                        ? "bg-emerald-500/50 cursor-wait text-[#0F172A]/60"
                        : "bg-emerald-500 hover:bg-emerald-400 text-[#0F172A]"
                    }`}
                    style={{ fontSize: "13px", fontWeight: 600 }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {submitting ? "Launching..." : "Launch Simulation"}
                  </button>
                 )}
               </div>
             </div>
           </motion.div>
         </motion.div>
       )}
     </AnimatePresence>
   );
 }