import React from 'react';
import {
  EmergencyStatus,
  EvacuationPlan,
  MinerRouteEvaluation,
  RouteResult
} from '../../types';
import {
  AlertOctagon,
  ShieldAlert,
  ArrowRight,
  Clock,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  DoorOpen,
  ShieldCheck,
  UserCheck,
  Crown
} from 'lucide-react';

interface EmergencyControlProps {
  emergencyStatus: EmergencyStatus;
  evacuationPlan: EvacuationPlan | null;
  onToggleEmergency: () => void;
  onRecalculateRoutes: () => void;
  isLoading: boolean;
}

export const EmergencyControl: React.FC<EmergencyControlProps> = ({
  emergencyStatus,
  evacuationPlan,
  onToggleEmergency,
  onRecalculateRoutes,
  isLoading
}) => {
  const isEmergency = emergencyStatus.active;

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      isEmergency
        ? 'bg-gradient-to-br from-[#1a0c16] via-[#120a1c] to-[#0d0a14] border-red-500/70 shadow-[0_0_35px_rgba(225,29,72,0.35),0_0_20px_rgba(212,175,55,0.15)] emergency-beacon-royale'
        : 'bg-royale-card border-[rgba(212,175,55,0.25)]'
    }`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.2)] pb-4">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl shadow-lg ${
            isEmergency ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white animate-bounce border border-amber-300' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            <AlertOctagon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-extrabold text-white tracking-wide">
                {isEmergency ? '🚨 EMERGENCY EVACUATION PROTOCOL &bull; ROYALE ACTIVE' : 'Subterranean Emergency Protocol & Standby Engine'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isEmergency ? 'bg-red-600 text-white animate-pulse border border-amber-300' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                {isEmergency ? 'ROYAL CRITICAL DISPATCH' : 'SYSTEM STANDBY'}
              </span>
            </div>
            <p className="text-xs text-amber-200/70 mt-0.5">
              {isEmergency
                ? 'Dynamic A* safety routing streaming real-time evacuation paths to miner smart helmets.'
                : 'Safety-weighted algorithm ready. Activates instant hazard avoidance and exit navigation.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {isEmergency && (
            <button
              onClick={onRecalculateRoutes}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl btn-royale-ghost text-xs font-semibold shadow-sm"
              title="Force Recalculate Evacuation Routes"
            >
              <RotateCw size={14} className={isLoading ? 'animate-spin text-amber-400' : 'text-amber-400'} />
              <span>Recalculate Routes</span>
            </button>
          )}

          <button
            onClick={onToggleEmergency}
            disabled={isLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-xl ${
              isEmergency
                ? 'bg-[#221830] hover:bg-[#2d2040] text-amber-300 border border-amber-400/40 shadow-lg'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white hover:brightness-110 shadow-red-600/40 border border-amber-300'
            }`}
          >
            <AlertOctagon size={16} />
            <span>{isEmergency ? 'STAND DOWN EMERGENCY' : 'TRIGGER EMERGENCY EVACUATION'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Live Evacuation Board */}
      {isEmergency && evacuationPlan && (
        <div className="mt-4 space-y-4">
          {/* Summary Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#141022] border border-[rgba(212,175,55,0.22)] shadow-md">
              <span className="text-amber-200/60">Total Active Miners</span>
              <p className="text-xl font-bold text-yellow-300 mt-0.5 font-mono">
                {evacuationPlan.miner_routes.length} Deployed
              </p>
            </div>
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 shadow-md">
              <span className="text-red-300">Compromised Blocks</span>
              <p className="text-xl font-bold text-red-400 mt-0.5 font-mono">
                {evacuationPlan.critical_blocks_count} Critical
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 shadow-md">
              <span className="text-amber-300">Blocked Passages</span>
              <p className="text-xl font-bold text-amber-400 mt-0.5 font-mono">
                {evacuationPlan.blocked_tunnels_count} Blocked
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 shadow-md">
              <span className="text-emerald-300">Routing Algorithm</span>
              <p className="text-xl font-bold text-emerald-300 mt-0.5 font-mono">
                Safety-Weighted A*
              </p>
            </div>
          </div>

          {/* Roster of Miner Evacuation Paths */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              Assigned Miner Evacuation Trajectories:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {evacuationPlan.miner_routes.map(item => {
                const route = item.chosen_route;
                const isNoPath = !route || route.status === 'NO_PATH';
                const isOptimal = route?.status === 'OPTIMAL';

                return (
                  <div
                    key={item.miner.miner_id}
                    className={`p-4 rounded-2xl border text-xs space-y-3 transition shadow-lg ${
                      isNoPath
                        ? 'bg-red-950/70 border-red-500 text-red-200'
                        : isOptimal
                        ? 'bg-[#120f20] border-[rgba(212,175,55,0.3)] text-amber-100'
                        : 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5 text-white font-bold">
                        <UserCheck size={14} className="text-amber-400" />
                        {item.miner.miner_id} ({item.miner.name})
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isNoPath
                          ? 'bg-red-600 text-white'
                          : isOptimal
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {isNoPath ? 'NO SAFE ROUTE' : route.status}
                      </span>
                    </div>

                    {/* Target destination & origin */}
                    {route && !isNoPath ? (
                      <>
                        <div className="flex items-center justify-between text-[11px] text-amber-200/70 bg-[#191428] p-2.5 rounded-xl border border-[rgba(212,175,55,0.2)]">
                          <div>
                            <span className="text-amber-200/50 text-[9px] uppercase font-bold">Origin</span>
                            <p className="font-mono text-white font-bold">{route.start_node}</p>
                          </div>
                          <ArrowRight size={14} className="text-amber-400" />
                          <div className="text-right">
                            <span className="text-amber-200/50 text-[9px] uppercase font-bold">Destination</span>
                            <p className="font-mono text-amber-300 font-bold flex items-center gap-1 justify-end">
                              {route.destination_type === 'EXIT' ? '🚪' : '🛡️'} {route.destination_node}
                            </p>
                          </div>
                        </div>

                        {/* Waypoints sequence */}
                        <div className="text-[11px]">
                          <span className="text-amber-200/60 font-medium">Royale Waypoints:</span>
                          <p className="font-mono text-amber-300 font-bold mt-0.5 truncate" title={route.path.join(' → ')}>
                            {route.path.join(' → ')}
                          </p>
                        </div>

                        {/* Telemetry Metrics */}
                        <div className="grid grid-cols-3 gap-1.5 pt-2 text-[10px] text-amber-200/60 border-t border-[rgba(212,175,55,0.15)]">
                          <div>
                            <span>Distance</span>
                            <p className="font-bold text-amber-100">{Math.round(route.total_distance)}m</p>
                          </div>
                          <div>
                            <span>Est. Travel Time</span>
                            <p className="font-bold text-amber-100">
                              {Math.floor(route.estimated_travel_time / 60)}m {Math.round(route.estimated_travel_time % 60)}s
                            </p>
                          </div>
                          <div>
                            <span>Risk Score</span>
                            <p className="font-bold text-yellow-300 font-mono">
                              {Math.round(route.risk_score)}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-3.5 bg-red-900/40 rounded-xl border border-red-500/50 text-center">
                        <XCircle size={22} className="text-red-400 mx-auto mb-1" />
                        <p className="font-bold text-red-300 text-xs">NO SAFE ROUTE AVAILABLE</p>
                        <p className="text-[10px] text-red-300/80 mt-0.5">
                          Surrounding sectors are CRITICAL or BLOCKED. Direct miner to nearest sealed Refuge Pod!
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
