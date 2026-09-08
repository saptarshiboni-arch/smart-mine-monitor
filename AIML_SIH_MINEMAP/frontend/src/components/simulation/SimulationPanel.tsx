import React from 'react';
import { MineMap, RiskLevel } from '../../types';
import {
  Sliders,
  Play,
  Flame,
  AlertTriangle,
  Slash,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Zap,
  Crown
} from 'lucide-react';

interface SimulationPanelProps {
  mineMap: MineMap;
  onSimulateBlockRisk: (blockId: string, risk: RiskLevel) => void;
  onSimulateTunnelBlocked: (tunnelId: string, isBlocked: boolean) => void;
  onRunPresetScenario: (scenarioId: any) => void;
  isLoading: boolean;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  mineMap,
  onSimulateBlockRisk,
  onSimulateTunnelBlocked,
  onRunPresetScenario,
  isLoading
}) => {
  return (
    <div className="p-5 rounded-2xl bg-royale-card border border-[rgba(212,175,55,0.3)] space-y-5 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.2)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <Crown size={20} className="text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gold-gradient tracking-wide">
              Live Subterranean Simulation & Stress Rig
            </h2>
            <p className="text-xs text-amber-200/70">
              Trigger instantaneous dynamic hazard transitions & route recalculations without ESP32 hardware
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full font-bold">
          ROYALE MOCK RIG
        </span>
      </div>

      {/* 1-Click Demonstration Scenarios - Gold Cards */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
          Presentation Demo Quick Presets:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onRunPresetScenario('all_normal')}
            disabled={isLoading}
            className="flex flex-col p-3.5 rounded-2xl bg-[#141022] hover:bg-[#1d1730] border border-emerald-500/30 hover:border-emerald-500/60 text-left transition group shadow-md"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 size={15} /> 1. All Blocks Normal
            </span>
            <span className="text-[11px] text-amber-200/60 mt-1.5 leading-tight">
              Nominal operations: Shortest exits selected (Exit 1 & Exit 2)
            </span>
          </button>

          <button
            onClick={() => onRunPresetScenario('block_b_critical')}
            disabled={isLoading}
            className="flex flex-col p-3.5 rounded-2xl bg-[#141022] hover:bg-[#1d1730] border border-rose-500/40 hover:border-rose-500/70 text-left transition group shadow-md"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
              <Flame size={15} /> 2. Block B Critical
            </span>
            <span className="text-[11px] text-amber-200/60 mt-1.5 leading-tight">
              Safety dominates: A* instantly diverts traffic around B via Block C & Exit 2
            </span>
          </button>

          <button
            onClick={() => onRunPresetScenario('block_c_critical')}
            disabled={isLoading}
            className="flex flex-col p-3.5 rounded-2xl bg-[#141022] hover:bg-[#1d1730] border border-amber-500/40 hover:border-amber-500/70 text-left transition group shadow-md"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <AlertTriangle size={15} /> 3. Block C Critical
            </span>
            <span className="text-[11px] text-amber-200/60 mt-1.5 leading-tight">
              Dynamic bypass: miners navigate via Block B & Exit 1
            </span>
          </button>

          <button
            onClick={() => onRunPresetScenario('complex_compromise')}
            disabled={isLoading}
            className="flex flex-col p-3.5 rounded-2xl bg-[#141022] hover:bg-[#1d1730] border border-red-500/50 hover:border-red-500/80 text-left transition group shadow-md"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-300">
              <Slash size={15} /> 4. Surface Exits Cut Off
            </span>
            <span className="text-[11px] text-amber-200/60 mt-1.5 leading-tight">
              Extreme catastrophe: Portals blocked, auto-fallback to Refuge Pod Alpha
            </span>
          </button>
        </div>
      </div>

      {/* Manual Per-Block Risk Controls */}
      <div className="space-y-2.5 border-t border-[rgba(212,175,55,0.2)] pt-4">
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
          Simulate Specific Mine Stope Risk:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {mineMap.blocks.map(block => (
            <div
              key={block.id}
              className="p-3.5 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.22)] flex items-center justify-between text-xs shadow-md"
            >
              <div>
                <span className="font-bold text-white tracking-wide">{block.name}</span>
                <span className={`block text-[10px] font-mono font-bold mt-0.5 ${
                  block.risk_level === 'CRITICAL'
                    ? 'text-rose-400'
                    : block.risk_level === 'WARNING'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}>
                  {block.risk_level}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSimulateBlockRisk(block.id, 'NORMAL')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold border border-emerald-500/30"
                  title="Simulate Normal Risk"
                >
                  NORM
                </button>
                <button
                  onClick={() => onSimulateBlockRisk(block.id, 'WARNING')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold border border-amber-500/30"
                  title="Simulate Warning Risk"
                >
                  WARN
                </button>
                <button
                  onClick={() => onSimulateBlockRisk(block.id, 'CRITICAL')}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[10px] font-bold border border-rose-500/30"
                  title="Simulate Critical Risk"
                >
                  CRIT
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Tunnel Blocked Toggles */}
      <div className="space-y-2.5 border-t border-[rgba(212,175,55,0.2)] pt-4">
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
          Simulate Tunnel Collapse / Obstruction:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {mineMap.tunnels.map(tunnel => (
            <button
              key={tunnel.id}
              onClick={() => onSimulateTunnelBlocked(tunnel.id, !tunnel.is_blocked)}
              className={`p-3 rounded-2xl border text-left text-xs transition flex items-center justify-between shadow-md ${
                tunnel.is_blocked
                  ? 'bg-rose-950/60 border-rose-500/70 text-rose-200'
                  : 'bg-[#120f20] border-[rgba(212,175,55,0.22)] text-amber-200 hover:border-amber-400/50'
              }`}
            >
              <div>
                <span className="font-mono font-bold block text-white">{tunnel.id}</span>
                <span className="text-[10px] text-amber-200/50">
                  {tunnel.from_node} ↔ {tunnel.to_node}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                tunnel.is_blocked ? 'bg-rose-600 text-white' : 'bg-[#1f1a30] text-amber-300'
              }`}>
                {tunnel.is_blocked ? 'BLOCKED' : 'OPEN'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
