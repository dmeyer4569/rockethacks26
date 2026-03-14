import { TrendingUp } from "lucide-react";
import { useState, useRef } from "react";

//TODO: make it populate with real data
const data = [
  { round: "R1", agent1: 0.12, agent2: 0.18, agent3: 0.08, agent4: 0.22 },
  { round: "R2", agent1: 0.28, agent2: 0.35, agent3: 0.22, agent4: 0.30 },
  { round: "R3", agent1: 0.42, agent2: 0.64, agent3: 0.38, agent4: 0.45 },
  { round: "R4", agent1: 0.48, agent2: 0.62, agent3: 0.44, agent4: 0.50 },
  { round: "R5", agent1: 0.52, agent2: 0.61, agent3: 0.50, agent4: 0.54 },
  { round: "R6", agent1: 0.55, agent2: 0.60, agent3: 0.53, agent4: 0.56 },
  { round: "R7", agent1: 0.57, agent2: 0.60, agent3: 0.56, agent4: 0.58 },
];

const agents = [
  { key: "agent1", label: "Blue Collar Worker", color: "#f97316" },
  { key: "agent2", label: "Tech Startup CEO", color: "#34d399" },
  { key: "agent3", label: "Policy Analyst", color: "#818cf8" },
  { key: "agent4", label: "Union Rep", color: "#f472b6" },
];

//TODO: change these from const to dynamically populated data from backend
const CHART_PADDING = { top: 20, right: 20, bottom: 32, left: 50 };
const Y_MAX = 0.8;
const Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8];
const THRESHOLD = 0.6;

function buildPolyline(
    dataPoints: typeof data,
    agentKey: string,
    chartW: number,
    chartH: number
): string {
    const plotW = chartW - CHART_PADDING.left - CHART_PADDING.right;
    const plotH = chartH - CHART_PADDING.top - CHART_PADDING.bottom;
    return dataPoints
        .map((d, i) => {
            const x = CHART_PADDING.left + (i / (dataPoints.length - 1)) * plotW;
            const y =
                CHART_PADDING.top +
                plotH - 
                ((d[agentKey as keyof typeof d] as number) / Y_MAX) *plotH;
            return `${x},${y}`;
        })
        .join(" ");
}

function getDotPositions(
  dataPoints: typeof data,
  agentKey: string,
  chartW: number,
  chartH: number
) {
  const plotW = chartW - CHART_PADDING.left - CHART_PADDING.right;
  const plotH = chartH - CHART_PADDING.top - CHART_PADDING.bottom;
  return dataPoints.map((d, i) => ({
    x: CHART_PADDING.left + (i / (dataPoints.length - 1)) * plotW,
    y:
      CHART_PADDING.top +
      plotH -
      ((d[agentKey as keyof typeof d] as number) / Y_MAX) * plotH,
    value: d[agentKey as keyof typeof d] as number,
    round: d.round,
  }));
}

interface TooltipData {
  x: number;
  y: number;
  round: string;
  values: { label: string; value: number; color: string }[];
}

export function ConvergenceChart() {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartW = 600;
  const chartH = 320;

  const plotW = chartW - CHART_PADDING.left - CHART_PADDING.right;
  const plotH = chartH - CHART_PADDING.top - CHART_PADDING.bottom;

  const thresholdY =
    CHART_PADDING.top + plotH - (THRESHOLD / Y_MAX) * plotH;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = chartW / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    const stepW = plotW / (data.length - 1);
    let closestIdx = Math.round(
      (mouseX - CHART_PADDING.left) / stepW
    );
    closestIdx = Math.max(0, Math.min(data.length - 1, closestIdx));

    const d = data[closestIdx];
    const x =
      CHART_PADDING.left + (closestIdx / (data.length - 1)) * plotW;

    setTooltip({
      x,
      y: CHART_PADDING.top,
      round: d.round,
      values: agents.map((a) => ({
        label: a.label,
        value: d[a.key as keyof typeof d] as number,
        color: a.color,
      })),
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0B1120]/80 backdrop-blur-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <h3
              className="font-['Inter',sans-serif] text-white"
              style={{ fontSize: "14px", fontWeight: 600 }}
            >
              Convergence Analysis
            </h3>
            <p
              className="font-['Roboto_Mono',monospace] text-slate-500"
              style={{ fontSize: "11px" }}
            >
              CAS Score trajectories across rounds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span
            className="font-['Roboto_Mono',monospace] text-emerald-400"
            style={{ fontSize: "11px" }}
          >
            Threshold: 0.60
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative" style={{ minHeight: "280px" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ overflow: "visible" }}
        >
          {/* Grid lines */}
          {Y_TICKS.map((tick) => {
            const y =
              CHART_PADDING.top + plotH - (tick / Y_MAX) * plotH;
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={CHART_PADDING.left}
                  y1={y}
                  x2={CHART_PADDING.left + plotW}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="3 3"
                />
                <text
                  x={CHART_PADDING.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize={11}
                  fontFamily="Roboto Mono, monospace"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={14}
            y={CHART_PADDING.top + plotH / 2}
            textAnchor="middle"
            fill="#475569"
            fontSize={11}
            fontFamily="Inter, sans-serif"
            transform={`rotate(-90, 14, ${CHART_PADDING.top + plotH / 2})`}
          >
            CAS Score
          </text>

          {/* X-axis labels */}
          {data.map((d, i) => {
            const x =
              CHART_PADDING.left + (i / (data.length - 1)) * plotW;
            return (
              <text
                key={`xlabel-${d.round}`}
                x={x}
                y={chartH - 6}
                textAnchor="middle"
                fill="#64748b"
                fontSize={11}
                fontFamily="Roboto Mono, monospace"
              >
                {d.round}
              </text>
            );
          })}

          {/* Vertical grid lines */}
          {data.map((d, i) => {
            const x =
              CHART_PADDING.left + (i / (data.length - 1)) * plotW;
            return (
              <line
                key={`vgrid-${d.round}`}
                x1={x}
                y1={CHART_PADDING.top}
                x2={x}
                y2={CHART_PADDING.top + plotH}
                stroke="rgba(255,255,255,0.03)"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Threshold line */}
          <line
            x1={CHART_PADDING.left}
            y1={thresholdY}
            x2={CHART_PADDING.left + plotW}
            y2={thresholdY}
            stroke="#34d399"
            strokeDasharray="6 4"
            strokeWidth={1.5}
          />
          <text
            x={CHART_PADDING.left + plotW - 4}
            y={thresholdY - 6}
            textAnchor="end"
            fill="#34d399"
            fontSize={10}
            fontFamily="Roboto Mono, monospace"
          >
            Consensus: 0.60
          </text>

          {/* Agent lines */}
          {agents.map((agent) => (
            <polyline
              key={`line-${agent.key}`}
              points={buildPolyline(data, agent.key, chartW, chartH)}
              fill="none"
              stroke={agent.color}
              strokeWidth={agent.key === "agent2" ? 2.5 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Agent dots */}
          {agents.map((agent) =>
            getDotPositions(data, agent.key, chartW, chartH).map(
              (pos, i) => (
                <circle
                  key={`dot-${agent.key}-${i}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={3}
                  fill={agent.color}
                />
              )
            )
          )}

          {/* Hover crosshair */}
          {tooltip && (
            <line
              x1={tooltip.x}
              y1={CHART_PADDING.top}
              x2={tooltip.x}
              y2={CHART_PADDING.top + plotH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
          )}
        </svg>

        {/* Tooltip overlay */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: `${(tooltip.x / chartW) * 100}%`,
              top: "20px",
              transform: tooltip.x > chartW * 0.7 ? "translateX(-110%)" : "translateX(8px)",
            }}
          >
            <div className="bg-[#0B1120] border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl">
              <p
                className="font-['Roboto_Mono',monospace] text-slate-400 mb-1"
                style={{ fontSize: "11px" }}
              >
                {tooltip.round}
              </p>
              {tooltip.values.map((v) => (
                <div
                  key={v.label}
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: v.color }}
                  />
                  <span
                    className="font-['Roboto_Mono',monospace] text-slate-300 whitespace-nowrap"
                    style={{ fontSize: "11px" }}
                  >
                    {v.label}: {v.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/[0.04]">
        {agents.map((agent) => (
          <div key={agent.key} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: agent.color }}
            />
            <span
              className="font-['Inter',sans-serif] text-slate-400"
              style={{ fontSize: "11px" }}
            >
              {agent.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}