import React, { useState } from 'react';
import { Miner, MineMap } from '../../types';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  HardHat,
  Shield,
  CheckCircle2,
  Radio,
  Crown
} from 'lucide-react';

interface MinerManagerProps {
  mineMap: MineMap;
  onAddMiner: (miner: Miner) => void;
  onUpdateMiner: (miner: Miner) => void;
  onDeleteMiner: (minerId: string) => void;
}

export const MinerManager: React.FC<MinerManagerProps> = ({
  mineMap,
  onAddMiner,
  onUpdateMiner,
  onDeleteMiner
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newId, setNewId] = useState(`MINER_${String(mineMap.miners.length + 1).padStart(3, '0')}`);
  const [newName, setNewName] = useState('');
  const [selectedBlock, setSelectedBlock] = useState(mineMap.blocks[0]?.id || 'BLOCK_A');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId) return;

    const miner: Miner = {
      miner_id: newId,
      name: newName || `Personnel ${newId}`,
      current_block: selectedBlock,
      current_node: selectedBlock,
      status: 'ACTIVE',
      helmet_id: `HLM-${newId.replace('MINER_', '')}`
    };

    onAddMiner(miner);
    setNewId(`MINER_${String(mineMap.miners.length + 2).padStart(3, '0')}`);
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
              Subterranean Personnel & Smart Helmet Roster
            </h2>
            <p className="text-xs text-amber-200/70">
              Assigned miner positions and active LoRa smart helmet telemetry channels
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-royale-gold text-xs shadow-md"
        >
          <UserPlus size={15} />
          <span>{isAdding ? 'Cancel' : 'Register Miner'}</span>
        </button>
      </div>

      {/* Add Miner Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.3)] space-y-3.5 text-xs shadow-lg">
          <span className="font-bold text-amber-300">Register Subterranean Miner Personnel:</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-amber-200/60 mb-1">Miner ID / Call Sign</label>
              <input
                type="text"
                value={newId}
                onChange={e => setNewId(e.target.value)}
                required
                className="w-full bg-[#18142a] border border-[rgba(212,175,55,0.3)] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-amber-200/60 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Marcus Vance"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-[#18142a] border border-[rgba(212,175,55,0.3)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-amber-200/60 mb-1">Stationed Block Stope</label>
              <select
                value={selectedBlock}
                onChange={e => setSelectedBlock(e.target.value)}
                className="w-full bg-[#18142a] border border-[rgba(212,175,55,0.3)] rounded-xl px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-400"
              >
                {mineMap.blocks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.risk_level})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl btn-royale-gold text-xs font-bold shadow-md"
            >
              Confirm Registration
            </button>
          </div>
        </form>
      )}

      {/* Miners Grid - Royale Gold Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {mineMap.miners.map(miner => (
          <div
            key={miner.miner_id}
            className="p-4 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.22)] hover:border-[rgba(212,175,55,0.45)] transition space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  <HardHat size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{miner.name}</h4>
                  <span className="font-mono text-[10px] text-amber-300/80 font-bold">{miner.miner_id}</span>
                </div>
              </div>
              <button
                onClick={() => onDeleteMiner(miner.miner_id)}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950 transition"
                title="Remove Miner"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#18142a] border border-[rgba(212,175,55,0.15)] space-y-2 text-xs">
              <div className="flex items-center justify-between text-amber-200/70">
                <span>Smart Helmet:</span>
                <span className="font-mono text-yellow-300 font-bold">{miner.helmet_id || 'HLM-001'}</span>
              </div>
              <div className="flex items-center justify-between text-amber-200/70">
                <span>Current Location:</span>
                <select
                  value={miner.current_block}
                  onChange={e => onUpdateMiner({ ...miner, current_block: e.target.value, current_node: e.target.value })}
                  className="bg-[#120f20] text-amber-200 border border-[rgba(212,175,55,0.3)] rounded-lg px-2 py-0.5 text-[11px] font-mono focus:outline-none focus:border-amber-400"
                >
                  {mineMap.blocks.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-amber-200/70">
                <span>Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {miner.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
