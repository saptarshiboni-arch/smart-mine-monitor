import React from 'react';
import { MineMap, RiskLevel } from '../../types';
import {
  Edit3,
  CheckCircle,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Shield,
  Radio,
  DoorOpen,
  Box,
  Flame,
  GitCommit,
  Slash,
  Crown
} from 'lucide-react';

interface MapEditorToolbarProps {
  mineMap: MineMap;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onConfirmMap: () => void;
  onAddBlock: () => void;
  onAddJunction: () => void;
  onAddExit: () => void;
  onAddRefuge: () => void;
  onAddHazard: () => void;
  onAddTunnel: () => void;
  selectedElement: { type: string; id: string } | null;
  onDeleteSelected: () => void;
  onChangeSelectedRisk: (risk: RiskLevel) => void;
  onToggleTunnelBlocked: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const MapEditorToolbar: React.FC<MapEditorToolbarProps> = ({
  mineMap,
  isEditMode,
  onToggleEditMode,
  onConfirmMap,
  onAddBlock,
  onAddJunction,
  onAddExit,
  onAddRefuge,
  onAddHazard,
  onAddTunnel,
  selectedElement,
  onDeleteSelected,
  onChangeSelectedRisk,
  onToggleTunnelBlocked,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#0e0c18] border border-[rgba(212,175,55,0.3)] rounded-2xl shadow-xl">
      {/* Left: Mode toggle & Human Review Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleEditMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md ${
            isEditMode
              ? 'btn-royale-gold'
              : 'btn-royale-ghost'
          }`}
        >
          <Edit3 size={15} />
          <span>{isEditMode ? 'Exit Map Editor' : '👑 Edit Blueprint Map'}</span>
        </button>

        {/* Status Indicator */}
        {!mineMap.admin_confirmed ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle size={14} className="shrink-0 text-amber-400" />
            <span className="font-bold">AI Generated Map &bull; Review Required</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle size={14} className="shrink-0" />
            <span>Map Verified & Active</span>
          </div>
        )}
      </div>

      {/* Center: Editing Actions (When in Edit Mode) */}
      {isEditMode && (
        <div className="flex flex-wrap items-center gap-1.5 bg-[#141022] p-1.5 rounded-xl border border-[rgba(212,175,55,0.22)] text-xs">
          <button
            onClick={onAddBlock}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#221b36] hover:bg-[#2e2449] text-amber-200 border border-[rgba(212,175,55,0.2)] transition"
            title="Add Block"
          >
            <Box size={14} className="text-amber-400" />
            <span>Block</span>
          </button>
          <button
            onClick={onAddJunction}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#221b36] hover:bg-[#2e2449] text-amber-200 border border-[rgba(212,175,55,0.2)] transition"
            title="Add Junction"
          >
            <GitCommit size={14} className="text-yellow-400" />
            <span>Junction</span>
          </button>
          <button
            onClick={onAddTunnel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#221b36] hover:bg-[#2e2449] text-amber-200 border border-[rgba(212,175,55,0.2)] transition"
            title="Add Tunnel"
          >
            <Plus size={14} className="text-amber-300" />
            <span>Tunnel</span>
          </button>
          <button
            onClick={onAddExit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#221b36] hover:bg-[#2e2449] text-amber-200 border border-[rgba(212,175,55,0.2)] transition"
            title="Add Surface Exit"
          >
            <DoorOpen size={14} className="text-emerald-400" />
            <span>Exit</span>
          </button>
          <button
            onClick={onAddRefuge}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#221b36] hover:bg-[#2e2449] text-amber-200 border border-[rgba(212,175,55,0.2)] transition"
            title="Add Refuge Pod"
          >
            <Shield size={14} className="text-cyan-400" />
            <span>Refuge</span>
          </button>
          <button
            onClick={onAddHazard}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#221b36] hover:bg-[#2e2449] text-amber-200 border border-[rgba(212,175,55,0.2)] transition"
            title="Add Hazard Zone"
          >
            <Flame size={14} className="text-rose-400" />
            <span>Hazard</span>
          </button>
        </div>
      )}

      {/* Selected Element Actions Toolbar */}
      {selectedElement && (
        <div className="flex items-center gap-2 bg-[#161228] px-3 py-1.5 rounded-xl border border-[rgba(212,175,55,0.3)] text-xs">
          <span className="font-mono text-amber-300 font-bold">
            {selectedElement.type}: {selectedElement.id}
          </span>

          {/* If tunnel selected, allow blocked toggle */}
          {selectedElement.type === 'TUNNEL' && (
            <button
              onClick={onToggleTunnelBlocked}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-rose-900 transition text-[11px] font-bold"
            >
              <Slash size={12} />
              <span>Toggle Blocked</span>
            </button>
          )}

          {/* Risk Level Changers */}
          {(selectedElement.type === 'BLOCK' || selectedElement.type === 'TUNNEL') && (
            <div className="flex items-center gap-1 ml-1 border-l border-white/10 pl-2">
              <button
                onClick={() => onChangeSelectedRisk('NORMAL')}
                className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold"
              >
                NORM
              </button>
              <button
                onClick={() => onChangeSelectedRisk('WARNING')}
                className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-[10px] font-bold"
              >
                WARN
              </button>
              <button
                onClick={() => onChangeSelectedRisk('CRITICAL')}
                className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[10px] font-bold"
              >
                CRIT
              </button>
            </div>
          )}

          <button
            onClick={onDeleteSelected}
            className="p-1 rounded text-rose-400 hover:bg-rose-950 hover:text-rose-300 transition ml-1"
            title="Delete Selected"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {/* Right: Undo / Redo / Confirm Map Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-[#141022] p-1 rounded-xl border border-[rgba(212,175,55,0.2)]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition ${
              canUndo ? 'text-amber-200 hover:bg-[#251e3a]' : 'text-amber-200/20 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition ${
              canRedo ? 'text-amber-200 hover:bg-[#251e3a]' : 'text-amber-200/20 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <RotateCw size={15} />
          </button>
        </div>

        <button
          onClick={onConfirmMap}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold btn-royale-gold shadow-md"
        >
          <CheckCircle size={15} />
          <span>Verify & Confirm Map</span>
        </button>
      </div>
    </div>
  );
};
