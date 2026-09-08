import React from 'react';
import { MineMap, EvacuationPlan, EmergencyStatus } from '../../types';
import {
  Layers,
  Users,
  Radio,
  DoorOpen,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Shield,
  Clock,
  Sparkles,
  AlertOctagon,
  Crown
} from 'lucide-react';

interface DashboardOverviewProps {
  mineMap: MineMap;
  emergencyStatus: EmergencyStatus;
  evacuationPlan: EvacuationPlan | null;
  onOpenUpload: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  mineMap,
  emergencyStatus,
  evacuationPlan,
  onOpenUpload,
  onNavigateTab
}) => {
  const normalBlocks = mineMap.blocks.filter(b => b.risk_level === 'NORMAL').length;
  const warningBlocks = mineMap.blocks.filter(b => b.risk_level === 'WARNING').length;
  const criticalBlocks = mineMap.blocks.filter(b => b.risk_level === 'CRITICAL').length;
  const operationalExits = mineMap.exits.filter(e => e.is_operational).length;

  return (
    <div className="space-y-4">
      {/* Top Royale Gold Banner */}
      <div className="p-5 rounded-2xl bg-royale-card border border-[rgba(212,175,55,0.3)] flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            <Crown size={24} className="text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-extrabold text-gold-gradient tracking-wide">
                Apex Subterranean Mine Safety Suite
              </h1>
              <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                👑 CubiCasa5K Enhanced Foundation
              </span>
            </div>
            <p className="text-xs text-amber-200/70 mt-0.5">
              AI Blueprint Perception &bull; Safety-Dominated A* & Dijkstra Routing &bull; Real-Time ESP32 Sensor Ingestion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl btn-royale-gold text-xs shadow-lg"
          >
            <Layers size={16} />
            <span>Upload Blueprint & AI Vectorize</span>
          </button>
        </div>
      </div>

      {/* Royale KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        {/* Total Blocks */}
        <div
          onClick={() => onNavigateTab('blocks')}
          className="p-4 rounded-2xl bg-royale-card border border-[rgba(212,175,55,0.22)] hover:border-[rgba(212,175,55,0.5)] transition cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-amber-300/70">
            <span className="font-medium">Total Blocks</span>
            <Layers size={15} className="text-amber-400 group-hover:scale-110 transition" />
          </div>
          <p className="text-2xl font-bold text-gold-gradient mt-1.5 font-mono">{mineMap.blocks.length}</p>
          <span className="text-[10px] text-amber-200/50 mt-0.5 block">Subterranean chambers</span>
        </div>

        {/* Active Miners */}
        <div
          onClick={() => onNavigateTab('miners')}
          className="p-4 rounded-2xl bg-royale-card border border-[rgba(212,175,55,0.22)] hover:border-[rgba(212,175,55,0.5)] transition cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-amber-300/70">
            <span className="font-medium">Active Miners</span>
            <Users size={15} className="text-yellow-400 group-hover:scale-110 transition" />
          </div>
          <p className="text-2xl font-bold text-yellow-300 mt-1.5 font-mono">{mineMap.miners.length}</p>
          <span className="text-[10px] text-yellow-400/70 mt-0.5 block">Smart Helmet LoRa active</span>
        </div>

        {/* Active Sensors */}
        <div
          onClick={() => onNavigateTab('sensors')}
          className="p-4 rounded-2xl bg-royale-card border border-[rgba(212,175,55,0.22)] hover:border-[rgba(212,175,55,0.5)] transition cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-amber-300/70">
            <span className="font-medium">Active Sensors</span>
            <Radio size={15} className="text-amber-400 group-hover:scale-110 transition" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1.5 font-mono">{mineMap.sensors.length}</p>
          <span className="text-[10px] text-amber-400/70 mt-0.5 block">ESP32 telemetry online</span>
        </div>

        {/* Normal Blocks */}
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 shadow-md">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="font-medium">Normal Blocks</span>
            <CheckCircle2 size={15} />
          </div>
          <p className="text-2xl font-bold text-emerald-300 mt-1.5 font-mono">{normalBlocks}</p>
          <span className="text-[10px] text-emerald-400/70 mt-0.5 block">Safe for transit</span>
        </div>

        {/* Warning Blocks */}
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 shadow-md">
          <div className="flex items-center justify-between text-amber-400">
            <span className="font-medium">Warning Blocks</span>
            <AlertTriangle size={15} />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1.5 font-mono">{warningBlocks}</p>
          <span className="text-[10px] text-amber-400/70 mt-0.5 block">Elevated cost penalty</span>
        </div>

        {/* Critical Blocks */}
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 shadow-md">
          <div className="flex items-center justify-between text-rose-400">
            <span className="font-medium">Critical Blocks</span>
            <Flame size={15} />
          </div>
          <p className="text-2xl font-bold text-rose-300 mt-1.5 font-mono">{criticalBlocks}</p>
          <span className="text-[10px] text-rose-400/70 mt-0.5 block">Strictly avoided by A*</span>
        </div>

        {/* Available Exits */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/50 to-[#120f20] border border-[rgba(212,175,55,0.4)] shadow-md">
          <div className="flex items-center justify-between text-amber-300">
            <span className="font-medium">Surface Exits</span>
            <DoorOpen size={15} />
          </div>
          <p className="text-2xl font-bold text-gold-gradient mt-1.5 font-mono">{operationalExits}</p>
          <span className="text-[10px] text-amber-300/70 mt-0.5 block">Operational portals</span>
        </div>
      </div>

      {/* Emergency Status Alert Card */}
      {emergencyStatus.active ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/90 via-rose-950/80 to-amber-950/70 border border-red-500/70 flex items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.3)]">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-full bg-red-600 text-white animate-bounce border border-amber-300 shadow-lg">
              <AlertOctagon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                EMERGENCY EVACUATION ACTIVE &bull; DYNAMIC ROUTING STREAMING
              </h3>
              <p className="text-xs text-amber-200/90 mt-0.5">
                All miners dispatched along strictly lowest-risk trajectories. Hazardous sectors bypassed.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('emergency')}
            className="px-4 py-2 rounded-xl btn-royale-gold text-xs shadow-md"
          >
            View Evacuation Routes &rarr;
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-royale-card border border-[rgba(212,175,55,0.25)] flex items-center justify-between text-xs text-amber-200/80">
          <div className="flex items-center gap-2.5">
            <Shield size={16} className="text-emerald-400" />
            <span>Telemetry System Nominal &bull; Standby Monitoring Active &bull; Graph Synced</span>
          </div>
          <span className="text-[11px] font-mono text-amber-400/80">A* & Dijkstra Pre-Computed</span>
        </div>
      )}
    </div>
  );
};
