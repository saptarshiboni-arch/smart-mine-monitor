import React, { useState } from 'react';
import { RouteResult, RiskCostConfig, EvacuationPlan } from '../../types';
import {
  Compass,
  Activity,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertOctagon,
  Scale,
  Sliders,
  TrendingDown,
  Crown
} from 'lucide-react';

interface RouteAnalysisProps {
  evacuationPlan: EvacuationPlan | null;
  onRunComparison: (algorithm: 'astar' | 'dijkstra') => void;
  isLoading: boolean;
}

export const RouteAnalysis: React.FC<RouteAnalysisProps> = ({
  evacuationPlan,
  onRunComparison,
  isLoading
}) => {
  const [activeAlgorithm, setActiveAlgorithm] = useState<'astar' | 'dijkstra'>('astar');

  return (
    <div className="p-5 rounded-2xl bg-royale-card border border-[rgba(212,175,55,0.3)] space-y-5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.2)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <Crown size={20} className="text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gold-gradient tracking-wide">
              Royale Safest Route Engine & Cost Formulation
            </h2>
            <p className="text-xs text-amber-200/70">
              Safety Dominance Theorem: Risk Penalties Strictly Prioritize Safe Passages Over Distance
            </p>
          </div>
        </div>

        {/* Algorithm Switcher - Gilded Buttons */}
        <div className="flex items-center bg-[#141022] p-1 rounded-xl border border-[rgba(212,175,55,0.25)] text-xs shadow-inner">
          <button
            onClick={() => {
              setActiveAlgorithm('astar');
              onRunComparison('astar');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
              activeAlgorithm === 'astar'
                ? 'btn-royale-gold shadow-md'
                : 'text-amber-200/60 hover:text-amber-100'
            }`}
          >
            A* (Heuristic Guided)
          </button>
          <button
            onClick={() => {
              setActiveAlgorithm('dijkstra');
              onRunComparison('dijkstra');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
              activeAlgorithm === 'dijkstra'
                ? 'btn-royale-gold shadow-md'
                : 'text-amber-200/60 hover:text-amber-100'
            }`}
          >
            Dijkstra (Exhaustive)
          </button>
        </div>
      </div>

      {/* Scientific Principle Card: Safety > Distance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.25)] space-y-2.5 shadow-md">
          <span className="font-bold text-amber-300 flex items-center gap-1.5">
            <Activity size={15} className="text-amber-400" /> Mathematical Safety Cost Function:
          </span>
          <div className="p-3 rounded-xl bg-[#1a142c] font-mono text-[11px] text-amber-200 border border-[rgba(212,175,55,0.2)] shadow-inner">
            Cost(u, v) = Distance + Risk_Penalty(v) + Hazard_Penalty + (Time × Factor)
          </div>
          <p className="text-amber-200/70 text-[11px] leading-relaxed">
            Where <span className="text-emerald-400 font-bold">NORMAL = 0 penalty</span>,{' '}
            <span className="text-amber-400 font-bold">WARNING = 5,000 penalty</span>,{' '}
            <span className="text-rose-400 font-bold">CRITICAL = 1,000,000 penalty</span>, and{' '}
            <span className="text-red-500 font-bold">BLOCKED = &infin;</span>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.25)] space-y-2.5 shadow-md">
          <span className="font-bold text-amber-300 flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-400" /> Empirical Proof of Safety Dominance:
          </span>
          <div className="space-y-1.5 text-[11px] text-amber-100">
            <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
              <span>Path 1: Distance = 100m, Risk = CRITICAL</span>
              <span className="font-mono font-bold">Cost = 1,000,100 (REJECTED)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
              <span>Path 2: Distance = 150m, Risk = NORMAL</span>
              <span className="font-mono font-bold">Cost = 150 (SELECTED ✅)</span>
            </div>
          </div>
          <p className="text-amber-200/60 text-[10px]">
            The pathfinder strictly rejects the shorter 100m critical route, prioritizing human life over distance.
          </p>
        </div>
      </div>

      {/* Evacuation Route Table - Royale Gilded Table */}
      {evacuationPlan && (evacuationPlan.miner_routes?.length ?? 0) > 0 && (
        <div className="space-y-2.5 border-t border-[rgba(212,175,55,0.2)] pt-4">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Crown size={14} className="text-amber-400" />
            Active Waypoint Trajectory & Risk Telemetry:
          </span>
          <div className="overflow-x-auto rounded-2xl border border-[rgba(212,175,55,0.25)] shadow-lg">
            <table className="w-full text-left text-xs bg-[#120f20]">
              <thead className="bg-[#18132a] text-amber-300 font-mono text-[10px] uppercase border-b border-[rgba(212,175,55,0.2)]">
                <tr>
                  <th className="p-3">Miner</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">Safe Destination</th>
                  <th className="p-3">Optimal Trajectory</th>
                  <th className="p-3">Distance</th>
                  <th className="p-3">Est. ETA</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(212,175,55,0.1)]">
                {(evacuationPlan.miner_routes || []).map(mr => {
                  const r = mr.chosen_route;
                  if (!r) return null;
                  return (
                    <tr key={mr.miner.miner_id} className="hover:bg-[#1d1633] transition">
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        <Crown size={12} className="text-amber-400" />
                        {mr.miner.miner_id}
                      </td>
                      <td className="p-3 font-mono text-amber-200/80">{r.start_node}</td>
                      <td className="p-3 font-mono text-amber-300 font-bold">
                        {r.destination_type === 'EXIT' ? '🚪' : '🛡️'} {r.destination_node}
                      </td>
                      <td className="p-3 font-mono text-yellow-300 text-[11px] font-medium">
                        {r.path.join(' → ')}
                      </td>
                      <td className="p-3 font-mono text-amber-100">{Math.round(r.total_distance)}m</td>
                      <td className="p-3 text-amber-100">
                        {Math.floor(r.estimated_travel_time / 60)}m {Math.round(r.estimated_travel_time % 60)}s
                      </td>
                      <td className="p-3 font-mono text-yellow-300 font-bold">{Math.round(r.risk_score)}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          r.status === 'OPTIMAL'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
