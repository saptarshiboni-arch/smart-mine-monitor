import React, { useState } from 'react';
import { MineMap, Block, RiskLevel } from '../../types';
import {
  Box,
  Plus,
  Trash2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Users,
  Radio,
  GitCommit,
  Shield,
  Edit2,
  Crown
} from 'lucide-react';

interface BlockManagementPanelProps {
  mineMap: MineMap;
  onUpdateBlock: (block: Block) => void;
  onAddBlock: (block: Block) => void;
  onDeleteBlock: (blockId: string) => void;
}

export const BlockManagementPanel: React.FC<BlockManagementPanelProps> = ({
  mineMap,
  onUpdateBlock,
  onAddBlock,
  onDeleteBlock
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newId, setNewId] = useState(`BLOCK_${String.fromCharCode(65 + mineMap.blocks.length)}`);
  const [newName, setNewName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId) return;

    const block: Block = {
      id: newId,
      name: newName || `Block ${newId.replace('BLOCK_', '')}`,
      risk_level: 'NORMAL',
      coordinates: { x: 200 + (mineMap.blocks.length % 3) * 160, y: 180 + Math.floor(mineMap.blocks.length / 3) * 140 },
      dimensions: { width: 170, height: 110 },
      miners: [],
      sensor_nodes: [],
      connections: [],
      is_active: true
    };

    onAddBlock(block);
    setNewId(`BLOCK_${String.fromCharCode(65 + mineMap.blocks.length + 1)}`);
    setNewName('');
    setIsAdding(false);
  };

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
              Subterranean Chamber Stope Administration
            </h2>
            <p className="text-xs text-amber-200/70">
              Chamber geometry, structural rock risk rating, and deployed personnel distribution
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-royale-gold text-xs shadow-md"
        >
          <Plus size={15} />
          <span>{isAdding ? 'Cancel' : 'Register Chamber'}</span>
        </button>
      </div>

      {/* Add Block Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.3)] space-y-3.5 text-xs shadow-lg">
          <span className="font-bold text-amber-300">Register Subterranean Chamber Stope:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-amber-200/60 mb-1">Block Identifier</label>
              <input
                type="text"
                value={newId}
                onChange={e => setNewId(e.target.value)}
                required
                className="w-full bg-[#18142a] border border-[rgba(212,175,55,0.3)] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-amber-200/60 mb-1">Display Name</label>
              <input
                type="text"
                placeholder="e.g. West Drift Extraction Stope"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-[#18142a] border border-[rgba(212,175,55,0.3)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl btn-royale-gold text-xs font-bold shadow-md"
            >
              Save Chamber
            </button>
          </div>
        </form>
      )}

      {/* Blocks Grid - Royale Gold Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {mineMap.blocks.map(block => (
          <div
            key={block.id}
            className="p-4 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.22)] hover:border-[rgba(212,175,55,0.45)] transition space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-white flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" />
                {block.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                block.risk_level === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : block.risk_level === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {block.risk_level}
              </span>
            </div>

            <div>
              <p className="font-bold text-amber-200 text-sm">{block.name}</p>
              <span className="text-[10px] text-amber-200/50">
                Position: ({Math.round(block.coordinates.x)}, {Math.round(block.coordinates.y)})
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18142a] border border-[rgba(212,175,55,0.15)] space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-amber-200/70">
                <span>Miners Present:</span>
                <span className="font-bold text-yellow-300">{block.miners.length}</span>
              </div>
              <div className="flex items-center justify-between text-amber-200/70">
                <span>IoT Nodes:</span>
                <span className="font-bold text-amber-300">{block.sensor_nodes.length}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[rgba(212,175,55,0.15)]">
              <span className="text-[10px] text-amber-200/50">Risk Override:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateBlock({ ...block, risk_level: 'NORMAL' })}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                >
                  NORM
                </button>
                <button
                  onClick={() => onUpdateBlock({ ...block, risk_level: 'WARNING' })}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 hover:bg-amber-500/30 transition"
                >
                  WARN
                </button>
                <button
                  onClick={() => onUpdateBlock({ ...block, risk_level: 'CRITICAL' })}
                  className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 hover:bg-rose-500/30 transition"
                >
                  CRIT
                </button>
                <button
                  onClick={() => onDeleteBlock(block.id)}
                  className="p-1 rounded-lg text-rose-400 hover:bg-rose-950 transition ml-1"
                  title="Delete Block"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
