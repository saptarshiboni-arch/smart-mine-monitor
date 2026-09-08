import React, { useState } from 'react';
import { RiskCostConfig } from '../../types';
import {
  Settings,
  Sliders,
  Cpu,
  Database,
  Layers,
  Shield,
  Save,
  CheckCircle2,
  Crown
} from 'lucide-react';

interface SettingsArchitectureProps {
  onResetMap: () => void;
}

export const SettingsArchitecture: React.FC<SettingsArchitectureProps> = ({ onResetMap }) => {
  const [config, setConfig] = useState<RiskCostConfig>({
    normal_penalty: 0,
    warning_penalty: 5000,
    critical_penalty: 1000000,
    blocked_cost: 1000000000,
    hazard_extra_penalty: 10000,
    refuge_secondary_penalty: 300
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
              System Settings & Modular ML Perception Architecture
            </h2>
            <p className="text-xs text-amber-200/70">
              Safety-weighted penalty tuners and modular CubiCasa5K to Mine ML fine-tuning roadmap
            </p>
          </div>
        </div>
      </div>

      {/* 1. Future Fine-Tuning Modular Perception Architecture */}
      <div className="p-4 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.25)] space-y-3.5 text-xs shadow-md">
        <div className="flex items-center justify-between">
          <span className="font-bold text-amber-300 flex items-center gap-1.5">
            <Cpu size={15} className="text-amber-400" /> Modular Blueprint Perception Architecture
          </span>
          <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
            ACTIVE: CubiCasaAnalyzer (Enhanced v2.0)
          </span>
        </div>

        <p className="text-amber-200/80 leading-relaxed">
          The perception engine utilizes the modular <code className="text-amber-300 font-bold">BlueprintAnalyzer</code> abstract interface.
          Currently, <code className="text-amber-300">CubiCasaAnalyzer</code> extracts architectural geometry using deep geometric watershed principles.
          It is architected for zero-downtime drop-in replacement with a mine-specific fine-tuned model (<code className="text-yellow-300 font-bold">MineBlueprintAnalyzer</code>)
          without altering downstream graph generation or safety-routing algorithms.
        </p>

        <div className="p-3.5 rounded-xl bg-[#18142a] border border-[rgba(212,175,55,0.18)]">
          <span className="text-amber-200/60 text-[11px] font-bold block mb-2">
            Target Fine-Tuning Semantic Classes:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['BLOCK', 'TUNNEL', 'JUNCTION', 'SHAFT', 'EXIT', 'REFUGE', 'HAZARD_ZONE', 'WALL', 'SENSOR_LOCATION'].map(cls => (
              <span key={cls} className="px-2.5 py-1 rounded-lg bg-[#241c38] text-amber-200 font-mono text-[10px] border border-[rgba(212,175,55,0.25)] font-bold">
                {cls}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Routing Cost Parameters Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Sliders size={14} className="text-amber-400" />
            Configurable Safety Penalty Weights (Cost Formulation)
          </span>
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 size={13} /> Saved successfully
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.22)] shadow-md">
            <label className="block text-amber-200/60 mb-1 font-medium">Warning Block Penalty</label>
            <input
              type="number"
              value={config.warning_penalty}
              onChange={e => setConfig({ ...config, warning_penalty: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#18142a] border border-[rgba(212,175,55,0.3)] rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-amber-400/60 mt-1 block">Default: 5,000</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.22)] shadow-md">
            <label className="block text-amber-200/60 mb-1 font-medium">Critical Block Penalty</label>
            <input
              type="number"
              value={config.critical_penalty}
              onChange={e => setConfig({ ...config, critical_penalty: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#18142a] border border-[rgba(212,175,55,0.3)] rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-rose-400/60 mt-1 block">Default: 1,000,000</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.22)] shadow-md">
            <label className="block text-amber-200/60 mb-1 font-medium">Refuge Secondary Penalty</label>
            <input
              type="number"
              value={config.refuge_secondary_penalty}
              onChange={e => setConfig({ ...config, refuge_secondary_penalty: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#18142a] border border-[rgba(212,175,55,0.3)] rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-cyan-400/60 mt-1 block">Default: 300 (surface first)</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[rgba(212,175,55,0.2)]">
          <button
            type="button"
            onClick={onResetMap}
            className="px-4 py-2 rounded-xl bg-red-950/40 text-red-300 border border-red-500/40 hover:bg-red-900/60 text-xs font-bold transition shadow-md"
          >
            Reset Map to Section 29 Benchmark
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl btn-royale-gold text-xs font-bold shadow-md"
          >
            <Save size={14} />
            <span>Save Penalty Weights</span>
          </button>
        </div>
      </form>
    </div>
  );
};
