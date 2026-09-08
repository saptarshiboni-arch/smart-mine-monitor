import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import {
  MineMap,
  RouteResult,
  EvacuationPlan,
  EmergencyStatus,
  AnalysisResult,
  Block,
  Tunnel,
  Junction,
  ExitPoint,
  RefugeChamber,
  HazardZone,
  Miner,
  RiskLevel
} from './types';
import { MineMapCanvas } from './components/map/MineMapCanvas';
import { MapEditorToolbar } from './components/map/MapEditorToolbar';
import { BlueprintUploadModal } from './components/blueprint/BlueprintUploadModal';
import { EmergencyControl } from './components/emergency/EmergencyControl';
import { SimulationPanel } from './components/simulation/SimulationPanel';
import { RouteAnalysis } from './components/routing/RouteAnalysis';
import { MinerManager } from './components/miners/MinerManager';
import { SensorTelemetry } from './components/sensors/SensorTelemetry';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { BlockManagementPanel } from './components/dashboard/BlockManagementPanel';
import { SettingsArchitecture } from './components/dashboard/SettingsArchitecture';
import {
  LayoutDashboard,
  Map as MapIcon,
  UploadCloud,
  Box,
  Users,
  Radio,
  AlertOctagon,
  Scale,
  Zap,
  Settings,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mineMap, setMineMap] = useState<MineMap | null>(null);
  const [history, setHistory] = useState<MineMap[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [selectedElement, setSelectedElement] = useState<{ type: string; id: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>({ active: false });
  const [evacuationPlan, setEvacuationPlan] = useState<EvacuationPlan | null>(null);
  const [activeRoutes, setActiveRoutes] = useState<RouteResult[]>([]);

  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warning' | 'alert' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'alert' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // 1. Initial Data Fetch
  const loadMapData = useCallback(async () => {
    try {
      setIsLoading(true);
      const mapData = await api.getMap();
      setMineMap(mapData);
      setHistory([mapData]);
      setHistoryIndex(0);

      // Check emergency status
      const emStatus = await api.getEmergencyStatus();
      setEmergencyStatus(emStatus);
      if (emStatus.active && emStatus.evacuation_plan) {
        setEvacuationPlan(emStatus.evacuation_plan);
        const routes = emStatus.evacuation_plan.miner_routes
          .map(mr => mr.chosen_route)
          .filter(Boolean) as RouteResult[];
        setActiveRoutes(routes);
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      showToast('Error connecting to backend: ' + err.message, 'alert');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Update map state with undo/redo history tracking
  const pushMapState = (newMap: MineMap, syncBackend = true) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newMap);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setMineMap(newMap);

    if (syncBackend) {
      api.updateMap(newMap).catch(err => {
        console.error('Sync failed:', err);
        showToast('Failed to sync map to server', 'alert');
      });
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevMap = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setMineMap(prevMap);
      api.updateMap(prevMap);
      showToast('Action undone', 'info');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextMap = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setMineMap(nextMap);
      api.updateMap(nextMap);
      showToast('Action redone', 'info');
    }
  };

  // Map Confirm Handler
  const handleConfirmMap = async () => {
    try {
      setIsLoading(true);
      const res = await api.confirmMap();
      setMineMap(res.map);
      showToast('AI Map verified! Navigation graph successfully generated.', 'success');
    } catch (err: any) {
      showToast('Confirmation failed: ' + err.message, 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  // Add Element Handlers in Human-in-the-Loop Mode
  const handleAddBlock = () => {
    if (!mineMap) return;
    const newId = `BLOCK_${String.fromCharCode(65 + mineMap.blocks.length)}`;
    const newBlock: Block = {
      id: newId,
      name: `Block ${newId.replace('BLOCK_', '')}`,
      risk_level: 'NORMAL',
      coordinates: { x: 260 + (mineMap.blocks.length % 3) * 140, y: 220 + Math.floor(mineMap.blocks.length / 3) * 120 },
      dimensions: { width: 170, height: 110 },
      miners: [],
      sensor_nodes: [],
      connections: [],
      is_active: true
    };
    const updated = {
      ...mineMap,
      admin_confirmed: false,
      blocks: [...mineMap.blocks, newBlock]
    };
    pushMapState(updated);
    setSelectedElement({ type: 'BLOCK', id: newId });
    showToast(`Added ${newBlock.name}`, 'info');
  };

  const handleAddJunction = () => {
    if (!mineMap) return;
    const newId = `JUNCTION_${mineMap.junctions.length + 1}`;
    const newJunction: Junction = {
      id: newId,
      name: `Junction ${mineMap.junctions.length + 1}`,
      coordinates: { x: 340, y: 320 },
      connected_tunnels: []
    };
    const updated = {
      ...mineMap,
      admin_confirmed: false,
      junctions: [...mineMap.junctions, newJunction]
    };
    pushMapState(updated);
    setSelectedElement({ type: 'JUNCTION', id: newId });
    showToast(`Added ${newJunction.name}`, 'info');
  };

  const handleAddExit = () => {
    if (!mineMap) return;
    const newId = `EXIT_${mineMap.exits.length + 1}`;
    const newExit: ExitPoint = {
      id: newId,
      name: `Surface Exit ${mineMap.exits.length + 1}`,
      coordinates: { x: 480, y: 120 },
      is_operational: true
    };
    const updated = {
      ...mineMap,
      admin_confirmed: false,
      exits: [...mineMap.exits, newExit]
    };
    pushMapState(updated);
    setSelectedElement({ type: 'EXIT', id: newId });
    showToast(`Added ${newExit.name}`, 'info');
  };

  const handleAddRefuge = () => {
    if (!mineMap) return;
    const newId = `REFUGE_${mineMap.refuges.length + 1}`;
    const newRefuge: RefugeChamber = {
      id: newId,
      name: `Refuge Pod ${mineMap.refuges.length + 1}`,
      coordinates: { x: 520, y: 460 },
      capacity: 12,
      current_occupancy: 0,
      is_operational: true
    };
    const updated = {
      ...mineMap,
      admin_confirmed: false,
      refuges: [...mineMap.refuges, newRefuge]
    };
    pushMapState(updated);
    setSelectedElement({ type: 'REFUGE', id: newId });
    showToast(`Added ${newRefuge.name}`, 'info');
  };

  const handleAddHazard = () => {
    if (!mineMap) return;
    const newId = `HAZARD_${mineMap.hazards.length + 1}`;
    const newHazard: HazardZone = {
      id: newId,
      name: `Hazard Zone ${mineMap.hazards.length + 1}`,
      hazard_type: 'METHANE_POCKET',
      coordinates: { x: 380, y: 280 },
      radius: 40,
      severity: 'WARNING'
    };
    const updated = {
      ...mineMap,
      admin_confirmed: false,
      hazards: [...mineMap.hazards, newHazard]
    };
    pushMapState(updated);
    setSelectedElement({ type: 'HAZARD', id: newId });
    showToast(`Added ${newHazard.name}`, 'warning');
  };

  const handleAddTunnel = () => {
    if (!mineMap || mineMap.blocks.length < 2) return;
    const newId = `TUNNEL_${mineMap.tunnels.length + 1}`;
    const from = mineMap.blocks[0].id;
    const to = mineMap.blocks[1].id;
    const newTunnel: Tunnel = {
      id: newId,
      from_node: from,
      to_node: to,
      distance: 60,
      risk_level: 'NORMAL',
      is_blocked: false,
      width: 8
    };
    const updated = {
      ...mineMap,
      admin_confirmed: false,
      tunnels: [...mineMap.tunnels, newTunnel]
    };
    pushMapState(updated);
    setSelectedElement({ type: 'TUNNEL', id: newId });
    showToast(`Added tunnel ${from} ↔ ${to}`, 'info');
  };

  const handleDeleteSelected = () => {
    if (!mineMap || !selectedElement) return;
    const { type, id } = selectedElement;

    let updated = { ...mineMap, admin_confirmed: false };
    if (type === 'BLOCK') {
      updated.blocks = updated.blocks.filter(b => b.id !== id);
      updated.tunnels = updated.tunnels.filter(t => t.from_node !== id && t.to_node !== id);
    } else if (type === 'TUNNEL') {
      updated.tunnels = updated.tunnels.filter(t => t.id !== id);
    } else if (type === 'JUNCTION') {
      updated.junctions = updated.junctions.filter(j => j.id !== id);
    } else if (type === 'EXIT') {
      updated.exits = updated.exits.filter(e => e.id !== id);
    } else if (type === 'REFUGE') {
      updated.refuges = updated.refuges.filter(r => r.id !== id);
    } else if (type === 'HAZARD') {
      updated.hazards = updated.hazards.filter(h => h.id !== id);
    }

    pushMapState(updated);
    setSelectedElement(null);
    showToast(`Deleted ${type} ${id}`, 'info');
  };

  const handleChangeSelectedRisk = (risk: RiskLevel) => {
    if (!mineMap || !selectedElement) return;
    const { type, id } = selectedElement;

    if (type === 'BLOCK') {
      handleSimulateBlockRisk(id, risk);
    } else if (type === 'TUNNEL') {
      const updatedTunnels = mineMap.tunnels.map(t =>
        t.id === id ? { ...t, risk_level: risk, is_blocked: risk === 'BLOCKED' } : t
      );
      pushMapState({ ...mineMap, tunnels: updatedTunnels });
      showToast(`Tunnel ${id} risk changed to ${risk}`, 'info');
    }
  };

  const handleToggleTunnelBlocked = () => {
    if (!mineMap || selectedElement?.type !== 'TUNNEL') return;
    const tunnel = mineMap.tunnels.find(t => t.id === selectedElement.id);
    if (tunnel) {
      handleSimulateTunnelBlocked(tunnel.id, !tunnel.is_blocked);
    }
  };

  // Update node position during canvas dragging
  const handleUpdateElementPosition = (type: string, id: string, x: number, y: number) => {
    if (!mineMap) return;

    if (type === 'BLOCK') {
      const updatedBlocks = mineMap.blocks.map(b =>
        b.id === id ? { ...b, coordinates: { x, y } } : b
      );
      setMineMap({ ...mineMap, blocks: updatedBlocks });
    }
  };

  // Emergency Handlers
  const handleToggleEmergency = async () => {
    try {
      setIsLoading(true);
      if (emergencyStatus.active) {
        const res = await api.stopEmergency();
        setEmergencyStatus(res);
        setEvacuationPlan(null);
        setActiveRoutes([]);
        showToast('Emergency Evacuation Stood Down. System Returned to Standby.', 'info');
      } else {
        const res = await api.startEmergency('Hazard warning trigger');
        setEmergencyStatus(res);
        if (res.evacuation_plan) {
          setEvacuationPlan(res.evacuation_plan);
          const routes = res.evacuation_plan.miner_routes
            .map(mr => mr.chosen_route)
            .filter(Boolean) as RouteResult[];
          setActiveRoutes(routes);
        }
        showToast('🚨 EMERGENCY PROTOCOL ACTIVE! Safest evacuation routes calculated.', 'alert');
      }
    } catch (err: any) {
      showToast('Emergency trigger failed: ' + err.message, 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculateRoutes = async () => {
    try {
      setIsLoading(true);
      const res = await api.recalculateEmergency();
      setEvacuationPlan(res.evacuation_plan);
      const routes = res.evacuation_plan.miner_routes
        .map(mr => mr.chosen_route)
        .filter(Boolean) as RouteResult[];
      setActiveRoutes(routes);
      showToast('Route Updated — Safer Alternative Found', 'success');
    } catch (err: any) {
      showToast('Recalculation error: ' + err.message, 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  // Simulation handlers
  const handleSimulateBlockRisk = async (blockId: string, risk: RiskLevel) => {
    try {
      const res = await api.simulateBlockRisk(blockId, risk);
      // Reload map to reflect updated risks
      const updatedMap = await api.getMap();
      setMineMap(updatedMap);

      if (res.emergency_recalculated) {
        const emStatus = await api.getEmergencyStatus();
        if (emStatus.evacuation_plan) {
          setEvacuationPlan(emStatus.evacuation_plan);
          const routes = emStatus.evacuation_plan.miner_routes
            .map(mr => mr.chosen_route)
            .filter(Boolean) as RouteResult[];
          setActiveRoutes(routes);
          showToast(`Route Updated — Safer Alternative Found (Block ${blockId} → ${risk})`, 'success');
        }
      } else {
        showToast(`Block ${blockId} updated to ${risk}`, 'info');
      }
    } catch (err: any) {
      showToast('Failed to simulate block risk: ' + err.message, 'alert');
    }
  };

  const handleSimulateTunnelBlocked = async (tunnelId: string, isBlocked: boolean) => {
    try {
      const res = await api.simulateTunnelBlocked(tunnelId, isBlocked);
      const updatedMap = await api.getMap();
      setMineMap(updatedMap);

      if (res.emergency_recalculated) {
        const emStatus = await api.getEmergencyStatus();
        if (emStatus.evacuation_plan) {
          setEvacuationPlan(emStatus.evacuation_plan);
          const routes = emStatus.evacuation_plan.miner_routes
            .map(mr => mr.chosen_route)
            .filter(Boolean) as RouteResult[];
          setActiveRoutes(routes);
          showToast(`Tunnel ${tunnelId} ${isBlocked ? 'BLOCKED' : 'OPENED'} — Dynamic Reroute Applied!`, 'warning');
        }
      } else {
        showToast(`Tunnel ${tunnelId} marked ${isBlocked ? 'BLOCKED' : 'OPEN'}`, 'info');
      }
    } catch (err: any) {
      showToast('Failed to toggle tunnel: ' + err.message, 'alert');
    }
  };

  const handleRunPresetScenario = async (scenarioId: any) => {
    try {
      setIsLoading(true);
      const res = await api.runPresetScenario(scenarioId);
      const updatedMap = await api.getMap();
      setMineMap(updatedMap);

      const emStatus = await api.getEmergencyStatus();
      setEmergencyStatus(emStatus);
      if (emStatus.evacuation_plan) {
        setEvacuationPlan(emStatus.evacuation_plan);
        const routes = emStatus.evacuation_plan.miner_routes
          .map(mr => mr.chosen_route)
          .filter(Boolean) as RouteResult[];
        setActiveRoutes(routes);
      }
      showToast(`Preset Scenario '${scenarioId}' Activated — Reroute Streamed`, 'success');
    } catch (err: any) {
      showToast('Scenario failed: ' + err.message, 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  // Telemetry updates
  const handleUpdateSensorTelemetry = async (telemetry: any) => {
    try {
      const res = await api.simulateTelemetry(telemetry);
      const updatedMap = await api.getMap();
      setMineMap(updatedMap);

      if (res.emergency_recalculated) {
        const emStatus = await api.getEmergencyStatus();
        if (emStatus.evacuation_plan) {
          setEvacuationPlan(emStatus.evacuation_plan);
          const routes = emStatus.evacuation_plan.miner_routes
            .map(mr => mr.chosen_route)
            .filter(Boolean) as RouteResult[];
          setActiveRoutes(routes);
        }
      }
      showToast(`Sensor telemetry processed: Risk level ${res.sensor_risk}`, 'info');
    } catch (err: any) {
      showToast('Telemetry update failed: ' + err.message, 'alert');
    }
  };

  const handleBlueprintDraft = (draftMap: MineMap, analysis: AnalysisResult) => {
    pushMapState(draftMap);
    setActiveTab('map');
    showToast(`Draft generated with ${analysis.detected_regions_count} regions. Review required before emergency use.`, 'warning');
  };

  const handleResetMap = async () => {
    try {
      setIsLoading(true);
      const reset = await api.resetMap();
      setMineMap(reset);
      setHistory([reset]);
      setHistoryIndex(0);
      setActiveRoutes([]);
      setEvacuationPlan(null);
      showToast('Reset map to Section 29 benchmark', 'info');
    } catch (err: any) {
      showToast('Reset failed: ' + err.message, 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mineMap) {
    return (
      <div className="min-h-screen bg-[#07060b] flex flex-col items-center justify-center text-amber-200">
        <Radio size={40} className="text-amber-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gold-gradient">Connecting to Subterranean Royale Telemetry...</h2>
        <p className="text-xs text-amber-200/60 mt-1">Initializing Section 29 Imperial Safety & Perception Grid</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07060b] text-[#fef9eb] flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Dynamic Toast Notification - Royale Gold */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-semibold animate-in slide-in-from-top-3 backdrop-blur-xl ${
          notification.type === 'alert'
            ? 'bg-rose-950/95 border-rose-500/80 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
            : notification.type === 'warning'
            ? 'bg-amber-950/95 border-amber-500/80 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
            : notification.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
            : 'bg-[#181228]/95 border-[rgba(212,175,55,0.6)] text-amber-200 shadow-[0_0_25px_rgba(212,175,55,0.3)]'
        }`}>
          {notification.type === 'alert' && <AlertOctagon size={18} className="text-rose-400 shrink-0" />}
          {notification.type === 'warning' && <AlertTriangle size={18} className="text-amber-400 shrink-0" />}
          {notification.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
          {notification.type === 'info' && <Info size={18} className="text-amber-400 shrink-0" />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-amber-300/60 hover:text-white">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Navbar - Gold & Royale */}
      <header className="h-16 border-b border-[rgba(212,175,55,0.22)] bg-[#0e0c18]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(212,175,55,0.25)]">
            <Radio size={20} className="animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-gold-gradient text-lg drop-shadow">
                👑 MINEMAP <span className="text-amber-300">ROYALE</span>
              </span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold tracking-wide">
                IMPERIAL v2.0
              </span>
            </div>
            <p className="text-[11px] text-amber-200/70">Smart Mine & Helmet Safest Evacuation System</p>
          </div>
        </div>

        {/* Global Emergency Trigger in Navbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl btn-royale-ghost text-xs font-semibold shadow-sm"
          >
            <UploadCloud size={15} className="text-amber-400" />
            <span>Upload Blueprint</span>
          </button>

          <button
            onClick={handleToggleEmergency}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition shadow-xl ${
              emergencyStatus.active
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white animate-pulse shadow-red-600/50 border border-amber-300'
                : 'bg-rose-950/60 text-rose-300 border border-rose-500/50 hover:bg-rose-900/60 shadow-rose-950/40'
            }`}
          >
            <AlertOctagon size={16} />
            <span>{emergencyStatus.active ? '🚨 EMERGENCY ACTIVE' : 'TEST EMERGENCY'}</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Gold & Royale */}
        <aside className="w-60 border-r border-[rgba(212,175,55,0.2)] bg-[#0b0914]/80 backdrop-blur-md p-3 flex flex-col justify-between shrink-0 shadow-lg">
          <nav className="space-y-1.5 text-xs">
            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'map', label: 'Mine Map Canvas', icon: MapIcon },
              { id: 'emergency', label: 'Emergency Protocol', icon: AlertOctagon, badge: emergencyStatus.active ? 'ACTIVE' : undefined },
              { id: 'simulation', label: 'Simulation Rig', icon: Zap },
              { id: 'routing', label: 'Route Engine (A*)', icon: Scale },
              { id: 'blocks', label: 'Chamber Blocks', icon: Box },
              { id: 'miners', label: 'Miner Personnel', icon: Users },
              { id: 'sensors', label: 'IoT Sensors', icon: Radio },
              { id: 'settings', label: 'Fine-Tuning & Config', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition ${
                    isActive
                      ? 'bg-[rgba(212,175,55,0.18)] text-amber-200 border border-[rgba(212,175,55,0.5)] font-bold shadow-[0_0_16px_rgba(212,175,55,0.2)]'
                      : 'text-amber-200/60 hover:text-amber-100 hover:bg-[rgba(35,28,52,0.6)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-amber-400' : 'text-amber-200/50'} />
                    <span className="tracking-wide">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-600 text-white font-bold animate-pulse border border-red-300">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3.5 rounded-xl bg-[#0e0c18] border border-[rgba(212,175,55,0.22)] text-[11px] text-amber-200/60 shadow-inner">
            <span className="block font-bold text-amber-300">👑 Apex Underground Core</span>
            <span>Pretrained CubiCasa5K Floorplan AI</span>
          </div>
        </aside>

        {/* Content View Area */}
        <main className="flex-1 p-5 overflow-y-auto space-y-4 bg-radial-gradient">
          {/* Always display Emergency Control at top if emergency is active */}
          {emergencyStatus.active && (
            <EmergencyControl
              emergencyStatus={emergencyStatus}
              evacuationPlan={evacuationPlan}
              onToggleEmergency={handleToggleEmergency}
              onRecalculateRoutes={handleRecalculateRoutes}
              isLoading={isLoading}
            />
          )}

          {/* Tab 1: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <DashboardOverview
                mineMap={mineMap}
                emergencyStatus={emergencyStatus}
                evacuationPlan={evacuationPlan}
                onOpenUpload={() => setIsUploadModalOpen(true)}
                onNavigateTab={tab => setActiveTab(tab)}
              />

              {/* Live Canvas View */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapIcon size={16} className="text-cyan-400" />
                    Subterranean Interactive Spatial Overview
                  </h2>
                  <button
                    onClick={() => setActiveTab('map')}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Open Full Map Editor →
                  </button>
                </div>
                <MineMapCanvas
                  mineMap={mineMap}
                  selectedElement={selectedElement}
                  onSelectElement={setSelectedElement}
                  activeRoutes={activeRoutes}
                  isEditMode={false}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Map Canvas & Human-in-the-Loop Editor */}
          {activeTab === 'map' && (
            <div className="space-y-3">
              <MapEditorToolbar
                mineMap={mineMap}
                isEditMode={isEditMode}
                onToggleEditMode={() => setIsEditMode(!isEditMode)}
                onConfirmMap={handleConfirmMap}
                onAddBlock={handleAddBlock}
                onAddJunction={handleAddJunction}
                onAddExit={handleAddExit}
                onAddRefuge={handleAddRefuge}
                onAddHazard={handleAddHazard}
                onAddTunnel={handleAddTunnel}
                selectedElement={selectedElement}
                onDeleteSelected={handleDeleteSelected}
                onChangeSelectedRisk={handleChangeSelectedRisk}
                onToggleTunnelBlocked={handleToggleTunnelBlocked}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />

              <MineMapCanvas
                mineMap={mineMap}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                activeRoutes={activeRoutes}
                isEditMode={isEditMode}
                onUpdateElementPosition={handleUpdateElementPosition}
              />
            </div>
          )}

          {/* Tab 3: Emergency Protocol */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <EmergencyControl
                emergencyStatus={emergencyStatus}
                evacuationPlan={evacuationPlan}
                onToggleEmergency={handleToggleEmergency}
                onRecalculateRoutes={handleRecalculateRoutes}
                isLoading={isLoading}
              />
              <MineMapCanvas
                mineMap={mineMap}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                activeRoutes={activeRoutes}
                isEditMode={false}
              />
            </div>
          )}

          {/* Tab 4: Simulation Rig */}
          {activeTab === 'simulation' && (
            <div className="space-y-4">
              <SimulationPanel
                mineMap={mineMap}
                onSimulateBlockRisk={handleSimulateBlockRisk}
                onSimulateTunnelBlocked={handleSimulateTunnelBlocked}
                onRunPresetScenario={handleRunPresetScenario}
                isLoading={isLoading}
              />
              <MineMapCanvas
                mineMap={mineMap}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                activeRoutes={activeRoutes}
                isEditMode={false}
              />
            </div>
          )}

          {/* Tab 5: Route Analysis & Cost Engine */}
          {activeTab === 'routing' && (
            <div className="space-y-4">
              <RouteAnalysis
                evacuationPlan={evacuationPlan}
                onRunComparison={async (algo) => {
                  setIsLoading(true);
                  const plan = await api.calculateRoutes({ algorithm: algo });
                  setEvacuationPlan(plan);
                  const routes = (plan?.miner_routes || [])
                    .map(mr => mr.chosen_route)
                    .filter(Boolean) as RouteResult[];
                  setActiveRoutes(routes);
                  setIsLoading(false);
                }}
                isLoading={isLoading}
              />
              <MineMapCanvas
                mineMap={mineMap}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                activeRoutes={activeRoutes}
                isEditMode={false}
              />
            </div>
          )}

          {/* Tab 6: Chamber Blocks */}
          {activeTab === 'blocks' && (
            <BlockManagementPanel
              mineMap={mineMap}
              onUpdateBlock={block => {
                const updated = mineMap.blocks.map(b => (b.id === block.id ? block : b));
                pushMapState({ ...mineMap, blocks: updated });
              }}
              onAddBlock={handleAddBlock}
              onDeleteBlock={id => {
                setSelectedElement({ type: 'BLOCK', id });
                handleDeleteSelected();
              }}
            />
          )}

          {/* Tab 7: Miner Personnel */}
          {activeTab === 'miners' && (
            <MinerManager
              mineMap={mineMap}
              onAddMiner={miner => {
                const updatedMiners = [...mineMap.miners, miner];
                pushMapState({ ...mineMap, miners: updatedMiners });
                showToast(`Registered miner ${miner.miner_id}`, 'success');
              }}
              onUpdateMiner={miner => {
                const updatedMiners = mineMap.miners.map(m =>
                  m.miner_id === miner.miner_id ? miner : m
                );
                pushMapState({ ...mineMap, miners: updatedMiners });
              }}
              onDeleteMiner={minerId => {
                const updatedMiners = mineMap.miners.filter(m => m.miner_id !== minerId);
                pushMapState({ ...mineMap, miners: updatedMiners });
                showToast(`Removed miner ${minerId}`, 'info');
              }}
            />
          )}

          {/* Tab 8: IoT Sensors */}
          {activeTab === 'sensors' && (
            <SensorTelemetry
              mineMap={mineMap}
              onUpdateSensorTelemetry={handleUpdateSensorTelemetry}
              isLoading={isLoading}
            />
          )}

          {/* Tab 9: Settings & Architecture */}
          {activeTab === 'settings' && (
            <SettingsArchitecture onResetMap={handleResetMap} />
          )}
        </main>
      </div>

      {/* Blueprint Upload Modal */}
      <BlueprintUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onBlueprintAnalyzed={handleBlueprintDraft}
      />
    </div>
  );
}

export default App;
