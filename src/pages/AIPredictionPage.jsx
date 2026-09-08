import React, { useState } from 'react';
import { useMine } from '../context/MineContext';
import RiskGauge from '../components/ui/RiskGauge';
import StatusBadge from '../components/ui/StatusBadge';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  BrainCircuit,
  Sparkles,
  Info,
  Sliders,
  Server,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Code2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio,
  Wifi,
  Send,
  Trash2,
  Terminal,
} from 'lucide-react';

export default function AIPredictionPage() {
  const {
    aiPrediction,
    setIsSensorSimulatorOpen,
    isDarkMode,
    mlBackendState,
    dataSource = 'simulation',
    setDataSource,
    hardwareNodes = {},
    hardwareStatus = {},
    sendHardwareTelemetry,
    resetHardwareSensorNodes,
    deleteHardwareSensorNode,
  } = useMine();
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [showArchitectureGuide, setShowArchitectureGuide] = useState(false);
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [injectingRisk, setInjectingRisk] = useState(null);

  const handleInjectSampleNode = async (riskType) => {
    setInjectingRisk(riskType);
    try {
      let payload;
      if (riskType === 'CRITICAL') {
        payload = {
          node_id: 'ESP32_NODE_03',
          vibration: 2.65,
          tilt: 4.1,
          temperature: 46.2,
          moisture: 72.0,
          displacement: 19.4,
        };
      } else if (riskType === 'WARNING') {
        payload = {
          node_id: 'ESP32_NODE_02',
          vibration: 0.92,
          tilt: 1.8,
          temperature: 39.5,
          moisture: 48.0,
          displacement: 8.5,
        };
      } else {
        payload = {
          node_id: 'ESP32_NODE_01',
          vibration: 0.04,
          tilt: 0.05,
          temperature: 26.8,
          moisture: 19.5,
          displacement: 0.25,
        };
      }
      await sendHardwareTelemetry(payload);
    } catch (e) {
      console.error('Failed to inject sample hardware packet', e);
    } finally {
      setInjectingRisk(null);
    }
  };

  const riskScore = aiPrediction?.overallScore || 18;
  const classification = aiPrediction?.riskLevel || 'SAFE';
  const factors = aiPrediction?.factors || {};
  const forecast = aiPrediction?.forecast || [];
  const rateOfChange = aiPrediction?.rateOfChange || { percentChange: 0, description: 'Stable' };
  const mlMeta = aiPrediction?.mlModelMeta || {};
  const mlTelemetry = aiPrediction?.mlTelemetry || {};

  // XAI Feature ranking data for bar chart
  const xaiData = Object.entries(factors).map(([key, f]) => ({
    name: f.label,
    contribution: f.contribution,
    peakValue: `${f.peakValue} ${f.unit}`,
    severity: f.severity,
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-mine-text-primary">
              AI Strata Subsidence & Ground Motion Model
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-mine-surface-alt border border-mine-border text-mine-text-secondary">
              SIH HARDWARE-ALIGNED ML
            </span>
          </div>
          <p className="text-xs text-mine-text-secondary mt-1">
            Real-Time Edge Telemetry Ingestion (ESP32/LoRa) • Random Forest / XGBoost Inference • Geotechnical XAI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPayloadModal(!showPayloadModal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-mine-surface border border-mine-border text-mine-text-primary hover:bg-mine-surface-alt transition shadow-card"
          >
            <Code2 className="h-4 w-4 text-status-info" />
            14-Feature Payload
          </button>
          <button
            type="button"
            onClick={() => setIsSensorSimulatorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-mine-surface border border-mine-border text-mine-text-primary hover:bg-mine-surface-alt transition shadow-card"
          >
            <Sliders className="h-4 w-4 text-status-attention" />
            Adjust Strata Sliders
          </button>
        </div>
      </div>

      {/* Hardware-Aligned ML Integration Bridge Banner (Interactive Placeholder) */}
      <div className="card p-4 bg-mine-surface border border-mine-border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mine-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${mlBackendState?.isConnected ? 'bg-status-safe/10 text-status-safe' : 'bg-status-attention/10 text-status-attention'}`}>
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-mine-text-primary">
                  ML Model Backend Connector
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  mlBackendState?.isConnected
                    ? 'bg-status-safe/15 text-status-safe border border-status-safe/30'
                    : 'bg-status-attention/15 text-status-attention border border-status-attention/30'
                }`}>
                  {mlBackendState?.isConnected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      CONNECTED: FASTAPI (PORT 8000)
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      ACTIVE FALLBACK: LOCAL HEURISTIC ENGINE
                    </>
                  )}
                </span>
                {mlBackendState?.isPredicting && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-mine-text-secondary animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Inferencing...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-mine-text-secondary mt-0.5">
                Target: <code className="font-mono text-xs bg-mine-surface-alt px-1 py-0.5 rounded border border-mine-border">{mlBackendState?.endpoint || 'http://localhost:8000/predict'}</code> • Expected Model: <strong>Random Forest (14 Hardware Features)</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowArchitectureGuide(!showArchitectureGuide)}
            className="flex items-center gap-1 text-xs text-status-info font-medium hover:underline"
          >
            {showArchitectureGuide ? 'Hide Model Spec' : 'View ML Integration Guide'}
            {showArchitectureGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Collapsible Architecture Guide */}
        {showArchitectureGuide && (
          <div className="mt-3 pt-3 border-t border-mine-border/60 text-xs text-mine-text-secondary space-y-2.5 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-2.5 rounded bg-mine-surface-alt border border-mine-border">
                <span className="font-semibold text-mine-text-primary block mb-1">1. Direct Physical Sensors (9)</span>
                <p className="text-[11px] font-mono leading-relaxed">
                  acc_x, acc_y, acc_z (MPU6050)<br/>
                  ppv_mms, geophone_mms (Geophone)<br/>
                  frequency_hz, psd_value (Edge FFT)<br/>
                  seismometer_ms2, temperature_c
                </p>
              </div>
              <div className="p-2.5 rounded bg-mine-surface-alt border border-mine-border">
                <span className="font-semibold text-mine-text-primary block mb-1">2. Derived Physics Features (5)</span>
                <p className="text-[11px] font-mono leading-relaxed">
                  vibration_magnitude_ms2 (3D shock)<br/>
                  vibration_horizontal_ms2 (Shear)<br/>
                  kinetic_energy_proxy (0.5 · PPV²)<br/>
                  accel_to_velocity_ratio<br/>
                  spectral_power_product
                </p>
              </div>
              <div className="p-2.5 rounded bg-mine-surface-alt border border-mine-border">
                <span className="font-semibold text-mine-text-primary block mb-1">3. How to Connect Your Model</span>
                <p className="text-[11px] leading-relaxed">
                  Start your FastAPI server at port 8000 with <code>POST /predict</code>. The dashboard automatically detects it within 5 seconds and switches live inferences over.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real Hardware Sensor Telemetry & ESP32 Ingestion Gateway */}
      <div className="card p-5 bg-mine-surface border border-mine-border shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mine-border pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${dataSource === 'hardware' ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' : 'bg-mine-surface-alt text-mine-text-secondary'}`}>
              <Radio className={`h-5 w-5 ${dataSource === 'hardware' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-mine-text-primary">
                  ESP32 / Edge Hardware Ingestion Gateway
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  dataSource === 'hardware'
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                    : 'bg-mine-surface-alt text-mine-text-secondary border border-mine-border'
                }`}>
                  <Wifi className="h-3 w-3" />
                  {dataSource === 'hardware' ? 'LIVE HARDWARE STREAMING ACTIVE' : 'SIMULATION MODE (HARDWARE LISTENING)'}
                </span>
              </div>
              <p className="text-xs text-mine-text-secondary mt-0.5">
                Ingestion Endpoint: <code className="font-mono text-xs bg-mine-surface-alt px-1 py-0.5 rounded border border-mine-border text-cyan-600 dark:text-cyan-400">POST /api/sensors/data</code> • Port: 8000
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDataSource(dataSource === 'hardware' ? 'simulation' : 'hardware')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition shadow-sm ${
                dataSource === 'hardware'
                  ? 'bg-status-safe text-white hover:opacity-90'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700'
              }`}
            >
              {dataSource === 'hardware' ? 'Switch to Virtual Simulation' : 'Activate Real Hardware Mode'}
            </button>

            <button
              type="button"
              onClick={() => setShowCurlModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-mine-surface border border-mine-border text-mine-text-primary hover:bg-mine-surface-alt transition shadow-card"
            >
              <Terminal className="h-3.5 w-3.5 text-status-info" />
              ESP32 / curl Docs
            </button>
          </div>
        </div>

        {/* Live Hardware Gateway Stats & Quick Injectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-mine-text-secondary">
            <span>Connected Nodes: <strong className="text-mine-text-primary font-mono">{Object.keys(hardwareNodes).length}</strong></span>
            <span>•</span>
            <span>Last Telemetry: <strong className="text-mine-text-primary font-mono">{hardwareStatus?.lastReceived || 'No packets received yet'}</strong></span>
            <span>•</span>
            <span>Overall Fleet Risk: <strong className={`font-mono ${
              hardwareStatus?.overallRisk === 'CRITICAL'
                ? 'text-status-critical'
                : hardwareStatus?.overallRisk === 'WARNING'
                ? 'text-status-warning'
                : 'text-status-safe'
            }`}>{hardwareStatus?.overallRisk || 'NORMAL'}</strong></span>
          </div>

          {/* Injector Buttons for testing real hardware flow */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-mine-text-secondary font-medium mr-1">Test Hardware Ingest:</span>
            <button
              type="button"
              disabled={injectingRisk !== null}
              onClick={() => handleInjectSampleNode('NORMAL')}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-status-safe-bg text-status-safe border border-status-safe/40 hover:bg-status-safe-bg/80 transition disabled:opacity-50"
              title="Send normal baseline packet for ESP32_NODE_01"
            >
              + Normal Node
            </button>
            <button
              type="button"
              disabled={injectingRisk !== null}
              onClick={() => handleInjectSampleNode('WARNING')}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-status-warning-bg text-status-warning border border-status-warning/40 hover:bg-status-warning-bg/80 transition disabled:opacity-50"
              title="Send warning packet for ESP32_NODE_02"
            >
              + Warning Node
            </button>
            <button
              type="button"
              disabled={injectingRisk !== null}
              onClick={() => handleInjectSampleNode('CRITICAL')}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-status-critical-bg text-status-critical border border-status-critical/40 hover:bg-status-critical-bg/80 transition disabled:opacity-50"
              title="Send critical subsidence packet for ESP32_NODE_03"
            >
              + Critical Node
            </button>
            {Object.keys(hardwareNodes).length > 0 && (
              <button
                type="button"
                onClick={resetHardwareSensorNodes}
                className="p-1 rounded text-mine-text-secondary hover:text-status-critical transition"
                title="Clear received hardware nodes"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Nodes Grid / Table */}
        {Object.keys(hardwareNodes).length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-mine-border text-center bg-mine-surface-alt/40">
            <Radio className="h-8 w-8 text-mine-text-secondary/50 mx-auto mb-2" />
            <p className="text-xs font-semibold text-mine-text-primary">No Real Hardware Sensor Nodes Connected</p>
            <p className="text-[11px] text-mine-text-secondary mt-1 max-w-md mx-auto">
              Send an HTTP POST request to <code className="font-mono text-[10px] bg-mine-surface px-1 py-0.5 rounded border border-mine-border">http://&lt;SERVER_IP&gt;:8000/api/sensors/data</code> with sensor readings from your ESP32, or click the test buttons above to simulate hardware packets.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-mine-surface-alt border-b border-mine-border text-mine-text-secondary font-mono text-[11px]">
                <tr>
                  <th className="py-2 px-3">Node ID</th>
                  <th className="py-2 px-3">Vibration</th>
                  <th className="py-2 px-3">Tilt</th>
                  <th className="py-2 px-3">Temp</th>
                  <th className="py-2 px-3">Moisture</th>
                  <th className="py-2 px-3">Displacement</th>
                  <th className="py-2 px-3">ML Risk Assessment</th>
                  <th className="py-2 px-3">Confidence</th>
                  <th className="py-2 px-3">Last Ping</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mine-border">
                {Object.values(hardwareNodes).map((node) => {
                  const risk = node.prediction?.risk || 'NORMAL';
                  const conf = node.prediction?.confidence
                    ? (node.prediction.confidence * 100).toFixed(1) + '%'
                    : '--';
                  return (
                    <tr key={node.node_id} className="hover:bg-mine-surface-alt/50 transition">
                      <td className="py-2 px-3 font-mono font-bold text-mine-text-primary flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${risk === 'CRITICAL' ? 'bg-status-critical animate-ping' : risk === 'WARNING' ? 'bg-status-warning animate-pulse' : 'bg-status-safe'}`} />
                        {node.node_id}
                      </td>
                      <td className="py-2 px-3 font-mono">{node.sensor_data?.vibration ?? '--'} g</td>
                      <td className="py-2 px-3 font-mono">{node.sensor_data?.tilt ?? '--'} °</td>
                      <td className="py-2 px-3 font-mono">{node.sensor_data?.temperature ?? '--'} °C</td>
                      <td className="py-2 px-3 font-mono">{node.sensor_data?.moisture ?? '--'} %</td>
                      <td className="py-2 px-3 font-mono font-bold text-mine-text-primary">
                        {node.sensor_data?.displacement ?? '--'} mm
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          risk === 'CRITICAL'
                            ? 'bg-status-critical-bg text-status-critical border border-status-critical/40'
                            : risk === 'WARNING'
                            ? 'bg-status-warning-bg text-status-warning border border-status-warning/40'
                            : 'bg-status-safe-bg text-status-safe border border-status-safe/40'
                        }`}>
                          {risk}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">{conf}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-mine-text-secondary">
                        {node.timestamp ? new Date(node.timestamp).toLocaleTimeString('en-IN') : (node.last_received || '--')}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          title={`Delete ${node.node_id}`}
                          onClick={() => deleteHardwareSensorNode(node.node_id)}
                          className="p-1 rounded text-mine-text-secondary hover:text-status-critical hover:bg-status-critical/10 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Grid: Risk Gauge & Model Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Overall Risk Gauge */}
        <div className="card p-5 space-y-4 bg-mine-surface border border-mine-border flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-mine-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-status-attention" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-mine-text-secondary">
                Current Ground Hazard Level
              </h2>
            </div>
            <StatusBadge status={classification} />
          </div>

          <div className="py-2 flex flex-col items-center justify-center">
            <RiskGauge value={riskScore} />
            <p className="text-xs text-center text-mine-text-secondary mt-3">
              {aiPrediction?.riskDescription}
            </p>
          </div>

          <div className="rounded bg-mine-surface-alt p-3 border border-mine-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-mine-text-secondary">Active Inference Source:</span>
              <strong className="text-mine-text-primary font-mono font-semibold">
                {mlMeta?.modelName || 'Calibrated Heuristic'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-mine-text-secondary">Prediction Confidence:</span>
              <strong className="text-status-safe font-mono font-semibold">
                {mlMeta?.confidence || 94.2}%
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-mine-text-secondary">Hardware Target:</span>
              <strong className="text-mine-text-primary font-mono">ESP32 + ADXL355/Geophone</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-mine-text-secondary">Telemetry Polling:</span>
              <strong className="text-mine-text-primary font-mono">100 Hz Edge / 2s Master Loop</strong>
            </div>
          </div>
        </div>

        {/* Center & Right: Model Feature Inputs Matrix */}
        <div className="lg:col-span-2 card p-5 space-y-4 bg-mine-surface border border-mine-border">
          <div className="flex items-center justify-between border-b border-mine-border pb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-status-attention" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-mine-text-secondary">
                Model Multi-Parameter Feature Weights & Peak Telemetry
              </h2>
            </div>
            <span className="text-xs text-mine-text-secondary">Calibrated Geotechnical Ensemble</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {Object.entries(factors).map(([param, f]) => (
              <div
                key={param}
                className="rounded bg-mine-surface-alt p-3 border border-mine-border space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-mine-text-primary">{f.label}</span>
                  <StatusBadge status={f.severity} />
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-mine-text-secondary">Peak Detected:</span>
                  <span className="font-mono text-sm font-bold text-mine-text-primary tabular-nums">
                    {f.peakValue} {f.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-mine-text-secondary">
                  <span>Weight: {(f.weight * 100).toFixed(0)}%</span>
                  <span>Contribution: +{f.contribution} pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-mine-text-secondary border-t border-mine-border">
            <span>Rate of Change: <strong>{rateOfChange.description}</strong></span>
            <span className="font-mono">Updated: {new Date().toLocaleTimeString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* 30-Minute Predictive Deformation Forecast Curve */}
      <div className="card p-5 space-y-4 bg-mine-surface border border-mine-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mine-border pb-3">
          <div>
            <h2 className="text-sm font-semibold text-mine-text-primary">
              30-Minute Predictive Ground Deformation Forecast
            </h2>
            <p className="text-xs text-mine-text-secondary">
              Extrapolated strata subsidence trajectory with 95% statistical confidence bounds
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-status-critical" />
              Predicted (mm)
            </span>
            <span className="flex items-center gap-1.5 text-mine-text-secondary">
              <span className="w-3 h-2 bg-status-critical/15 rounded" />
              95% Confidence Band
            </span>
            <span className="flex items-center gap-1.5 text-status-critical font-semibold">
              --- Critical Limit (15.0mm)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecast} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#D8D3CA" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6F6A61', fontFamily: 'monospace' }} stroke="#6F6A61" />
              <YAxis domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#6F6A61', fontFamily: 'monospace' }} stroke="#6F6A61" unit=" mm" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-mine-surface border border-mine-border p-2.5 rounded shadow-dropdown text-xs space-y-1">
                        <p className="font-bold text-mine-text-primary">Time Horizon: {label}</p>
                        <p className="text-status-critical font-semibold">Predicted: {data.predicted} mm</p>
                        <p className="text-mine-text-secondary">Upper Bound: {data.upper} mm</p>
                        <p className="text-mine-text-secondary">Lower Bound: {data.lower} mm</p>
                        <p className="text-status-critical/80 text-[10px]">Safety Threshold: 15.0 mm</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="upper" fill="#C4362E" fillOpacity={0.08} stroke="none" />
              <Area type="monotone" dataKey="lower" fill={isDarkMode ? '#1C1E23' : '#FFFFFF'} fillOpacity={1} stroke="none" />
              <Line type="monotone" dataKey="predicted" stroke="#C4362E" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="criticalThreshold" stroke="#C4362E" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* XAI Dominant Factor Ranking */}
      <div className="card p-5 space-y-4 bg-mine-surface border border-mine-border">
        <div className="border-b border-mine-border pb-3">
          <h2 className="text-sm font-semibold text-mine-text-primary">
            Explainable AI (XAI) — Strata Failure Factor Ranking
          </h2>
          <p className="text-xs text-mine-text-secondary">
            Feature importance decomposition into dynamic physical vibration and deformation vectors
          </p>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={xaiData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
              <CartesianGrid stroke="#D8D3CA" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6F6A61', fontFamily: 'monospace' }} stroke="#6F6A61" unit=" pts" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#292722' }} stroke="#6F6A61" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-mine-surface border border-mine-border p-2 rounded shadow-dropdown text-xs">
                        <p className="font-semibold text-mine-text-primary">{item.name}</p>
                        <p className="text-status-attention font-bold font-mono">Contribution: +{item.contribution} pts</p>
                        <p className="text-mine-text-secondary">Peak Value: {item.peakValue}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="contribution" fill="#D97706" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 14-Feature Hardware Telemetry Payload Modal / Drawer */}
      {showPayloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mine-surface border border-mine-border rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-mine-border pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-status-attention" />
                <h3 className="text-base font-bold text-mine-text-primary">
                  14-Feature Live Edge Telemetry Vector (Kaggle/ESP32 Format)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPayloadModal(false)}
                className="text-xs px-2 py-1 rounded bg-mine-surface-alt border border-mine-border text-mine-text-secondary hover:text-mine-text-primary"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-mine-text-secondary leading-relaxed">
              This is the exact JSON payload assembled from your current live sensor readings. When your FastAPI backend runs at <code>http://localhost:8000/predict</code>, this JSON is posted automatically every 5 seconds.
            </p>

            <div className="rounded bg-mine-surface-alt p-3.5 border border-mine-border font-mono text-xs overflow-x-auto text-mine-text-primary">
              <pre>{JSON.stringify(mlTelemetry, null, 2)}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(mlTelemetry, null, 2));
                  alert('Telemetry JSON copied to clipboard!');
                }}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-mine-surface border border-mine-border hover:bg-mine-surface-alt text-mine-text-primary"
              >
                Copy Payload JSON
              </button>
              <button
                type="button"
                onClick={() => setShowPayloadModal(false)}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-status-attention text-mine-surface hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESP32 Hardware Integration & cURL Docs Modal */}
      {showCurlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mine-surface border border-mine-border rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-mine-border pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-status-info" />
                <h3 className="text-base font-bold text-mine-text-primary">
                  ESP32 / Microcontroller Integration Quickstart
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCurlModal(false)}
                className="text-xs px-2 py-1 rounded bg-mine-surface-alt border border-mine-border text-mine-text-secondary hover:text-mine-text-primary"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4 text-xs text-mine-text-secondary">
              <p className="leading-relaxed">
                Connect real ESP32 microcontrollers or edge gateways over Wi-Fi/LAN or cellular/LTE. The backend receives raw physical telemetry, expands it into the 14-feature physics vector, and invokes the trained ML Random Forest model.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-mine-surface-alt border border-mine-border space-y-1">
                  <span className="font-bold text-mine-text-primary">Local Wi-Fi / LAN Testing:</span>
                  <code className="block font-mono text-[11px] text-cyan-600 dark:text-cyan-400 select-all">
                    http://&lt;COMPUTER_LOCAL_IP&gt;:8000/api/sensors/data
                  </code>
                  <span className="text-[10px] block text-mine-text-secondary">Bind: 0.0.0.0 (Port 8000)</span>
                </div>
                <div className="p-3 rounded bg-mine-surface-alt border border-mine-border space-y-1">
                  <span className="font-bold text-mine-text-primary">Cloud / Production HTTPS:</span>
                  <code className="block font-mono text-[11px] text-cyan-600 dark:text-cyan-400 select-all">
                    https://&lt;YOUR_DOMAIN&gt;/api/sensors/data
                  </code>
                  <span className="text-[10px] block text-mine-text-secondary">Supports SSL/TLS and optional X-API-Key</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-mine-text-primary block mb-1">1. Test with cURL (Windows PowerShell / Bash):</span>
                <div className="rounded bg-mine-surface-alt p-3 border border-mine-border font-mono text-[11px] text-mine-text-primary overflow-x-auto">
                  <pre>{`curl -X POST "http://localhost:8000/api/sensors/data" \\
  -H "Content-Type: application/json" \\
  -d '{
    "node_id": "ESP32_NODE_01",
    "vibration": 0.05,
    "tilt": 0.08,
    "temperature": 27.0,
    "moisture": 20.0,
    "displacement": 0.2
  }'`}</pre>
                </div>
              </div>

              <div>
                <span className="font-bold text-mine-text-primary block mb-1">2. ESP32 Arduino C++ Snippet:</span>
                <div className="rounded bg-mine-surface-alt p-3 border border-mine-border font-mono text-[11px] text-mine-text-primary overflow-x-auto">
                  <pre>{`#include <WiFi.h>
#include <HTTPClient.h>

const char* serverUrl = "http://192.168.1.100:8000/api/sensors/data";

void sendTelemetry(float vib, float tilt, float temp, float moist, float disp) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String json = "{\\"node_id\\":\\"ESP32_NODE_01\\","
                  "\\"vibration\\":" + String(vib, 3) + ","
                  "\\"tilt\\":" + String(tilt, 3) + ","
                  "\\"temperature\\":" + String(temp, 1) + ","
                  "\\"moisture\\":" + String(moist, 1) + ","
                  "\\"displacement\\":" + String(disp, 2) + "}";

    int httpCode = http.POST(json);
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println(response); // Prediction: NORMAL / WARNING / CRITICAL
    }
    http.end();
  }
}`}</pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-mine-border">
              <button
                type="button"
                onClick={() => setShowCurlModal(false)}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-status-info text-white hover:opacity-90"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
