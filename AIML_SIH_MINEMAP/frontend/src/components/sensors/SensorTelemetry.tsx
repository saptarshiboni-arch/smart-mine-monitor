import React, { useState } from 'react';
import { SensorNode, MineMap } from '../../types';
import {
  Radio,
  Thermometer,
  Activity,
  Compass,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Crown
} from 'lucide-react';

interface SensorTelemetryProps {
  mineMap: MineMap;
  onUpdateSensorTelemetry: (telemetry: any) => void;
  isLoading: boolean;
}

export const SensorTelemetry: React.FC<SensorTelemetryProps> = ({
  mineMap,
  onUpdateSensorTelemetry,
  isLoading
}) => {
  const [selectedSensor, setSelectedSensor] = useState<SensorNode | null>(mineMap.sensors[0] || null);

  const handleTriggerAnomaly = (sensor: SensorNode, type: 'HOT' | 'SEISMIC' | 'NORMAL') => {
    let payload = {
      node_id: sensor.node_id,
      temperature: 24.5,
      vibration: 0.05,
      tilt: 0.08,
      displacement: 0.1,
      moisture: 22.0
    };

    if (type === 'HOT') {
      payload.temperature = 58.0; // Above 50C -> CRITICAL
    } else if (type === 'SEISMIC') {
      payload.vibration = 0.95; // Above 0.8g -> CRITICAL
      payload.displacement = 4.2;
    }

    onUpdateSensorTelemetry(payload);
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
              Subterranean ESP32 IoT Telemetry Array
            </h2>
            <p className="text-xs text-amber-200/70">
              Continuous seismic acceleration, strata displacement, methane moisture, and thermal gradient sensing
            </p>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {mineMap.sensors.map(sensor => {
          const isCritical = sensor.risk_level === 'CRITICAL';
          const isWarning = sensor.risk_level === 'WARNING';

          return (
            <div
              key={sensor.node_id}
              onClick={() => setSelectedSensor(sensor)}
              className={`p-4 rounded-2xl border text-xs space-y-3.5 cursor-pointer transition shadow-md ${
                selectedSensor?.node_id === sensor.node_id
                  ? 'bg-[#18122a] border-[rgba(255,215,0,0.6)] shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                  : 'bg-[#120f20] border-[rgba(212,175,55,0.22)] hover:border-[rgba(212,175,55,0.45)]'
              }`}
            >
              {/* Sensor Header */}
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white flex items-center gap-1.5">
                  <Radio size={15} className={isCritical ? 'text-rose-500 animate-ping' : 'text-amber-400'} />
                  {sensor.node_id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isCritical
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {sensor.risk_level}
                </span>
              </div>

              <div className="text-[11px] text-amber-200/60 font-medium">
                Stationed Block: <span className="font-bold text-amber-300">{sensor.block}</span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-[#1a142c] border border-[rgba(212,175,55,0.15)] flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-200/60">
                    <Thermometer size={13} className="text-amber-400" /> Temp:
                  </span>
                  <span className="font-mono font-bold text-amber-200">{sensor.temperature.toFixed(1)}°C</span>
                </div>
                <div className="p-2 rounded-xl bg-[#1a142c] border border-[rgba(212,175,55,0.15)] flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-200/60">
                    <Activity size={13} className="text-yellow-400" /> Vib:
                  </span>
                  <span className="font-mono font-bold text-amber-200">{sensor.vibration.toFixed(2)}g</span>
                </div>
                <div className="p-2 rounded-xl bg-[#1a142c] border border-[rgba(212,175,55,0.15)] flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-200/60">
                    <Compass size={13} className="text-cyan-400" /> Tilt:
                  </span>
                  <span className="font-mono font-bold text-amber-200">{sensor.tilt.toFixed(2)}°</span>
                </div>
                <div className="p-2 rounded-xl bg-[#1a142c] border border-[rgba(212,175,55,0.15)] flex items-center justify-between">
                  <span className="flex items-center gap-1 text-amber-200/60">
                    <Droplets size={13} className="text-blue-400" /> Moist:
                  </span>
                  <span className="font-mono font-bold text-amber-200">{sensor.moisture.toFixed(1)}%</span>
                </div>
              </div>

              {/* Anomaly Injections */}
              <div className="pt-2 border-t border-[rgba(212,175,55,0.15)] flex items-center justify-between">
                <span className="text-[10px] text-amber-200/50">Inject Stress:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerAnomaly(sensor, 'HOT');
                    }}
                    className="px-2 py-0.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 text-[10px] hover:bg-rose-900 transition font-bold"
                    title="Simulate 58°C Thermal Spike"
                  >
                    Heat
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerAnomaly(sensor, 'SEISMIC');
                    }}
                    className="px-2 py-0.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] hover:bg-amber-900 transition font-bold"
                    title="Simulate 0.95g Vibration"
                  >
                    Seismic
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerAnomaly(sensor, 'NORMAL');
                    }}
                    className="px-2 py-0.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] hover:bg-emerald-900 transition font-bold"
                    title="Reset to Normal"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
