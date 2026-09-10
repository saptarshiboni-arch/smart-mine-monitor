import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useMine } from '../../context/MineContext';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  HardHat,
  Radio,
  Wind,
  Navigation,
  DoorOpen,
  AlertTriangle,
  X,
  UserPlus,
  Search,
  Activity,
  Layers,
  Flame,
  Shield,
  Compass,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Home,
} from 'lucide-react';
import {
  MINE_NODES,
  MINE_EXITS,
  MINE_TUNNELS,
  COAL_PILLARS,
  GOAF_ZONES,
  VENTILATION_PATHS,
  UWB_ANCHORS,
  ZONES,
} from '../../data/mineData';
import { computeSafeRoute } from '../../services/graphRouting';
import MinerDetailPopup from './MinerDetailPopup';
import {
  getLodTier,
  LOD,
  computeJunctionDegrees,
  enrichJunctions,
  enrichRoadways,
  enrichShafts,
} from '../../utils/mapLodEngine';
import { resolveLabelCollisions } from '../../utils/labelCollision';

// ─── Zoom constants ──────────────────────────────────────────────────────────
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 5.0;
const ZOOM_STEP = 0.18;
const ZOOM_PRESETS = {
  [LOD.OVERVIEW]: 1.0,
  [LOD.SECTION]: 1.6,
  [LOD.DETAILED]: 2.6,
};
const LOD_COLORS = {
  [LOD.OVERVIEW]: '#64748B',
  [LOD.SECTION]: '#0EA5E9',
  [LOD.DETAILED]: '#10B981',
};

export default function MineMap({ compact = false, height = 620, onSelectNode, onSelectTunnel }) {
  const {
    sensors = [],
    workers = [],
    tunnelStates = {},
    workerRoutes = {},
    activeRouteWorkerId,
    collapsedTunnelIds = [],
    advanceEvacuation,
    toggleTunnelBlock,
    relocateWorker,
    selectedSensor,
    setSelectedSensor,
    selectedWorker,
    setSelectedWorker,
    isDarkMode,
    setIsAddMinerModalOpen,
    activeMap,
    isCustomMapActive,
    triggerSubsidence,
    triggerCollapse,
    resetToNormal,
    emergencyModeActive,
  } = useMine();

  // ─── Viewport State ────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef(null);
  const mapContainerRef = useRef(null);

  // ─── Drag State ────────────────────────────────────────────────────────────
  const dragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0, hasMoved: false });

  // ─── Layer Toggles ─────────────────────────────────────────────────────────
  const [showPillars, setShowPillars] = useState(true);
  const [showRoadways, setShowRoadways] = useState(true);
  const [showAirflow, setShowAirflow] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showWorkers, setShowWorkers] = useState(true);
  const [showMonitoringStations, setShowMonitoringStations] = useState(true);
  const [showPanels, setShowPanels] = useState(true);
  const [showGoaf, setShowGoaf] = useState(true);
  const [showEmergencyRoutes, setShowEmergencyRoutes] = useState(true);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // ─── Search & Inspector ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const [inspectedTunnel, setInspectedTunnel] = useState(null);
  const [inspectedNode, setInspectedNode] = useState(null);
  const [inspectedWorker, setInspectedWorker] = useState(null);
  const [workerAnchorPos, setWorkerAnchorPos] = useState(null);
  const [inspectedStation, setInspectedStation] = useState(null);
  const [selectedRouteWorkerId, setSelectedRouteWorkerId] = useState(null);

  // Sync inspectedWorker if selectedWorker changes from elsewhere in the app
  useEffect(() => {
    if (selectedWorker) {
      setInspectedWorker(selectedWorker);
      setSelectedRouteWorkerId(selectedWorker.id);
    }
  }, [selectedWorker]);

  // ─── Map Geometry ──────────────────────────────────────────────────────────
  const currentJunctions = activeMap?.junctions || MINE_NODES;
  const currentShafts = activeMap?.shafts || MINE_EXITS;
  const currentRoadways = activeMap?.roadways || MINE_TUNNELS;
  const currentPillars = activeMap?.pillars || COAL_PILLARS;
  const currentPanels = activeMap?.panels || [
    { id: 'PANEL-01', name: 'ZONE A • INTAKE (-140m)', zone: 'A', x: 80, y: 150, w: 150, h: 300, color: '#64748B' },
    { id: 'PANEL-02', name: 'ZONE B • ACTIVE FACE (-260m)', zone: 'B', x: 250, y: 150, w: 150, h: 300, color: '#D97706' },
    { id: 'PANEL-03', name: 'ZONE C • RETURN PANEL (-220m)', zone: 'C', x: 420, y: 150, w: 150, h: 300, color: '#0EA5E9' },
    { id: 'PANEL-04', name: 'ZONE D • DEVELOPMENT (-290m)', zone: 'D', x: 590, y: 150, w: 150, h: 300, color: '#10B981' },
  ];
  const currentGoaf = activeMap?.goaf || GOAF_ZONES;
  const currentAirflow = activeMap?.airflow || VENTILATION_PATHS;
  const currentMonitoringStations = activeMap?.monitoringStations || [
    { id: 'MS-01', name: 'Station MS-01 (Intake Main)', nodeId: 'J2', zone: 'A', risk: 'LOW', lastUpdate: 'Just now', sensors: ['S-01', 'S-02', 'S-03', 'S-04'] },
    { id: 'MS-02', name: 'Station MS-02 (Active Face)', nodeId: 'J3', zone: 'B', risk: 'LOW', lastUpdate: 'Just now', sensors: ['S-07', 'S-08', 'S-09', 'S-10'] },
    { id: 'MS-03', name: 'Station MS-03 (Return Gallery)', nodeId: 'J4', zone: 'C', risk: 'LOW', lastUpdate: 'Just now', sensors: ['S-13', 'S-14', 'S-15', 'S-16'] },
    { id: 'MS-04', name: 'Station MS-04 (Development Face)', nodeId: 'J5', zone: 'D', risk: 'LOW', lastUpdate: 'Just now', sensors: ['S-19', 'S-20', 'S-21', 'S-22'] },
    { id: 'MS-05', name: 'Station MS-05 (Life Refuge Chamber)', nodeId: 'REF-1', zone: 'B', risk: 'LOW', lastUpdate: 'Just now', sensors: ['S-05', 'S-06', 'S-11', 'S-12'] },
  ];

  const mapWidth = activeMap?.map?.width || 1000;
  const mapHeight = activeMap?.map?.height || 580;

  // ─── LOD Enrichment ────────────────────────────────────────────────────────
  const enrichedData = useMemo(() => {
    const degrees = computeJunctionDegrees(currentJunctions, currentRoadways);
    const junctions = enrichJunctions(currentJunctions, degrees);
    const roadways = enrichRoadways(currentRoadways, junctions);
    const shafts = enrichShafts(currentShafts);
    return { junctions, roadways, shafts };
  }, [currentJunctions, currentRoadways, currentShafts]);

  // ─── Current LOD Tier ─────────────────────────────────────────────────────
  const lodTier = getLodTier(zoom);

  // ─── Node Lookup ───────────────────────────────────────────────────────────
  const nodeMap = useMemo(() => {
    const map = new Map();
    currentJunctions.forEach((n) => map.set(n.id, n));
    currentShafts.forEach((e) => map.set(e.id, e));
    if (activeMap?.refugeChambers) {
      activeMap.refugeChambers.forEach((rc) => map.set(rc.id, rc));
    }
    return map;
  }, [currentJunctions, currentShafts, activeMap]);

  // ─── Evacuation Route ─────────────────────────────────────────────────────
  const evacuatingWorkers = workers.filter((w) => w.status === 'EVACUATING');
  const targetWorker =
    (selectedRouteWorkerId && workers.find((w) => w.id === selectedRouteWorkerId)) ||
    workers.find((w) => w.id === activeRouteWorkerId) ||
    evacuatingWorkers[0] ||
    workers[0];

  const activeRoute = useMemo(() => {
    if (!targetWorker) return null;
    if (workerRoutes && workerRoutes[targetWorker.id]) return workerRoutes[targetWorker.id];
    return computeSafeRoute(targetWorker.nodeId, null, tunnelStates, currentRoadways, currentShafts);
  }, [targetWorker, workerRoutes, tunnelStates, currentRoadways, currentShafts]);

  const routePoints = useMemo(() => {
    if (!activeRoute?.routeNodes || activeRoute.routeNodes.length < 2) return '';
    return activeRoute.routeNodes
      .map((id) => { const n = nodeMap.get(id); return n ? `${n.x},${n.y}` : ''; })
      .filter(Boolean).join(' ');
  }, [activeRoute, nodeMap]);

  // ─── Viewport in map units (for collision culling) ─────────────────────────
  const visibleViewport = useMemo(() => {
    return {
      x1: -pan.x / zoom,
      y1: -pan.y / zoom,
      x2: (-pan.x + mapWidth) / zoom,
      y2: (-pan.y + mapHeight) / zoom,
    };
  }, [pan, zoom, mapWidth, mapHeight]);

  // ─── Junction Label Collision Resolution ──────────────────────────────────
  const junctionLabelVisibility = useMemo(() => {
    const items = enrichedData.junctions.map((j) => ({
      id: j.id,
      x: j.x,
      y: j.y,
      text: j.id,
      fontSize: 8,
      priority: j.priority,
      minZoom: j.minZoom,
    }));
    return resolveLabelCollisions(items, zoom, visibleViewport);
  }, [enrichedData.junctions, zoom, visibleViewport]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getRiskColor = (riskLevel, status) => {
    if (status === 'COLLAPSED') return '#C4362E';
    switch (riskLevel) {
      case 'CRITICAL': return '#C4362E';
      case 'WARNING': return '#C4820E';
      case 'CAUTION': return '#D97706';
      case 'SAFE':
      default: return '#2D8A4E';
    }
  };

  // ─── SVG World → Screen coord helper ─────────────────────────────────────
  const svgToScreen = useCallback((svgX, svgY) => {
    if (!svgRef.current) return { x: svgX, y: svgY };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: svgX, y: svgY };
    return { x: ctm.a * svgX + ctm.e, y: ctm.d * svgY + ctm.f };
  }, []);

  // ─── Mouse Wheel Zoom (cursor-centred) ────────────────────────────────────
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setZoom((prevZoom) => {
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prevZoom + delta));

        // Compute map-space pivot under cursor
        const rect = svgEl.getBoundingClientRect();
        const svgViewW = mapWidth;
        const svgViewH = mapHeight;
        const scaleX = svgViewW / rect.width;
        const scaleY = svgViewH / rect.height;

        const mouseMapX = (e.clientX - rect.left) * scaleX;
        const mouseMapY = (e.clientY - rect.top) * scaleY;

        // Solve for new pan so cursor position stays fixed in world-space
        setPan((prev) => {
          const worldX = (mouseMapX - prev.x) / prevZoom;
          const worldY = (mouseMapY - prev.y) / prevZoom;
          return {
            x: mouseMapX - worldX * newZoom,
            y: mouseMapY - worldY * newZoom,
          };
        });

        return newZoom;
      });
    };

    svgEl.addEventListener('wheel', onWheel, { passive: false });
    return () => svgEl.removeEventListener('wheel', onWheel);
  }, [mapWidth, mapHeight]);

  // ─── Pointer Pan ──────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      hasMoved: false,
    };
    // Do not call setPointerCapture here — early capture intercepts clicks on SVG children
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 5) {
      if (!dragRef.current.hasMoved) {
        dragRef.current.hasMoved = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
      setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
    }
  };

  const handlePointerUp = (e) => {
    dragRef.current.active = false;
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
  };

  // ─── Double-Click Zoom ────────────────────────────────────────────────────
  const handleDoubleClick = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = mapWidth / rect.width;
    const scaleY = mapHeight / rect.height;
    const mouseMapX = (e.clientX - rect.left) * scaleX;
    const mouseMapY = (e.clientY - rect.top) * scaleY;

    setZoom((prevZoom) => {
      const newZoom = Math.min(ZOOM_MAX, prevZoom * 1.5);
      setPan((prev) => {
        const worldX = (mouseMapX - prev.x) / prevZoom;
        const worldY = (mouseMapY - prev.y) / prevZoom;
        return { x: mouseMapX - worldX * newZoom, y: mouseMapY - worldY * newZoom };
      });
      return newZoom;
    });
  };

  // ─── Pinch-to-Zoom ────────────────────────────────────────────────────────
  const touchRef = useRef(null);
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = { dist: Math.hypot(dx, dy), zoom };
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / touchRef.current.dist;
      setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, touchRef.current.zoom * scale)));
    }
  };

  // ─── Controls ─────────────────────────────────────────────────────────────
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));

  const handleResetView = () => { setZoom(1.0); setPan({ x: 0, y: 0 }); setHighlightedId(null); };

  const jumpToLod = (tier) => {
    setZoom(ZOOM_PRESETS[tier]);
    setPan({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!isFullscreen) { mapContainerRef.current.requestFullscreen?.(); setIsFullscreen(true); }
    else { document.exitFullscreen?.(); setIsFullscreen(false); }
  };

  // ─── Search ────────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const foundMiner = workers.find((w) => w.id.toLowerCase().includes(query) || w.name.toLowerCase().includes(query));
    if (foundMiner) {
      const node = nodeMap.get(foundMiner.nodeId);
      if (node) { setHighlightedId(foundMiner.id); setInspectedWorker(foundMiner); setSelectedRouteWorkerId(foundMiner.id); setZoom(2.0); setPan({ x: mapWidth / 2 - node.x * 2.0, y: mapHeight / 2 - node.y * 2.0 }); return; }
    }
    const foundSensor = sensors.find((s) => s.id.toLowerCase().includes(query) || s.type?.toLowerCase().includes(query));
    if (foundSensor) {
      const node = nodeMap.get(foundSensor.nodeId);
      if (node) { setHighlightedId(foundSensor.id); setSelectedSensor(foundSensor); setZoom(2.0); setPan({ x: mapWidth / 2 - node.x * 2.0, y: mapHeight / 2 - node.y * 2.0 }); return; }
    }
    const foundStation = currentMonitoringStations.find((ms) => ms.id.toLowerCase().includes(query) || ms.name.toLowerCase().includes(query));
    if (foundStation) {
      const node = nodeMap.get(foundStation.nodeId);
      if (node) { setHighlightedId(foundStation.id); setInspectedStation(foundStation); setZoom(2.0); setPan({ x: mapWidth / 2 - node.x * 2.0, y: mapHeight / 2 - node.y * 2.0 }); return; }
    }
    const foundJunction = currentJunctions.find((j) => j.id.toLowerCase().includes(query));
    if (foundJunction) { setHighlightedId(foundJunction.id); setInspectedNode(foundJunction); setZoom(2.0); setPan({ x: mapWidth / 2 - foundJunction.x * 2.0, y: mapHeight / 2 - foundJunction.y * 2.0 }); return; }
    const foundShaft = currentShafts.find((s) => s.id.toLowerCase().includes(query) || s.label?.toLowerCase().includes(query));
    if (foundShaft) { setHighlightedId(foundShaft.id); setZoom(2.0); setPan({ x: mapWidth / 2 - foundShaft.x * 2.0, y: mapHeight / 2 - foundShaft.y * 2.0 }); }
  };

  const handleTunnelClick = (t) => {
    if (dragRef.current.hasMoved) return;
    const currentStatus = tunnelStates[t.id]?.status || 'OPEN';
    setInspectedTunnel({ ...t, status: currentStatus, riskLevel: tunnelStates[t.id]?.riskLevel || 'SAFE' });
    setInspectedNode(null); setInspectedStation(null);
    onSelectTunnel?.(t);
  };

  const handleNodeClick = (n) => {
    if (dragRef.current.hasMoved) return;
    setInspectedNode(n); setInspectedTunnel(null); setInspectedStation(null);
    onSelectNode?.(n);
  };

  // ─── Dynamic Scale Bar ────────────────────────────────────────────────────
  const metersPerUnit = 0.5; // 1 SVG unit = 0.5 m at zoom 1
  const scaleBarSvgLen = 60;
  const scaleBarMeters = Math.round(scaleBarSvgLen * metersPerUnit * (1 / zoom));

  // ─── LOD Badge label ─────────────────────────────────────────────────────
  const lodLabel = `${lodTier} MODE (${Math.round(zoom * 100)}%)`;

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={mapContainerRef}
      className={`card overflow-hidden flex flex-col w-full bg-mine-surface border border-mine-border shadow-card relative select-none ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : ''}`}
    >
      {/* ── Top Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mine-border bg-mine-surface-alt px-3.5 py-2 text-xs">
        {/* Left */}
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-status-safe animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-mine-text-primary">
            {activeMap?.mineName || 'Raniganj Coalfield • Seam 3'}
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-mine-surface text-mine-text-secondary border border-mine-border font-mono text-[10px]">
            {activeMap?.map?.scale?.label || 'CAD SCHEMATIC • 1:500m'}
          </span>
          {isCustomMapActive && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              BLUEPRINT VECTOR ACTIVE
            </span>
          )}
          {/* LOD Mode Badge */}
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold border text-white"
            style={{ backgroundColor: LOD_COLORS[lodTier], borderColor: LOD_COLORS[lodTier] }}
          >
            {lodLabel}
          </span>
        </div>

        {/* Center: Search */}
        <form onSubmit={handleSearch} className="flex items-center relative min-w-[190px] max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Miner, Sensor, Station, Zone..."
            className="w-full bg-mine-surface border border-mine-border rounded-lg pl-7 pr-2.5 py-1 text-xs text-mine-text-primary placeholder:text-mine-text-secondary focus:outline-none focus:border-status-safe"
          />
          <Search className="h-3.5 w-3.5 text-mine-text-secondary absolute left-2 pointer-events-none" />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setHighlightedId(null); }} className="absolute right-2 text-mine-text-secondary hover:text-mine-text-primary">
              <X className="h-3 w-3" />
            </button>
          )}
        </form>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Quick LOD jump buttons */}
          <div className="hidden sm:flex items-center gap-1 bg-mine-surface border border-mine-border rounded px-1 py-0.5">
            {[LOD.OVERVIEW, LOD.SECTION, LOD.DETAILED].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => jumpToLod(tier)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition ${lodTier === tier ? 'text-white' : 'text-mine-text-secondary hover:text-mine-text-primary'}`}
                style={lodTier === tier ? { backgroundColor: LOD_COLORS[tier] } : {}}
                title={`Jump to ${tier} mode`}
              >
                {tier.charAt(0) + tier.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {evacuatingWorkers.length > 0 && (
            <button type="button" onClick={advanceEvacuation}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-status-critical text-white font-semibold shadow-sm hover:opacity-90 transition animate-pulse"
              title="Advance evacuating miners one junction forward">
              <Navigation className="h-3.5 w-3.5" />
              <span>Step Evacuation ({evacuatingWorkers.length})</span>
            </button>
          )}

          <button type="button" onClick={triggerSubsidence}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition shadow-sm"
            title="Inject simulated ground subsidence in active zone">
            <Activity className="h-3 w-3" />
            <span>Simulate Subsidence</span>
          </button>

          {/* Layer Menu */}
          <div className="relative">
            <button type="button" onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-mine-surface text-mine-text-primary border border-mine-border hover:bg-mine-surface-alt font-medium transition shadow-sm"
              title="Toggle Map Layers">
              <Layers className="h-3.5 w-3.5 text-status-safe" />
              <span>Layers</span>
            </button>
            {showLayerMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 card p-3 bg-mine-surface border border-mine-border shadow-dropdown z-30 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-mine-border pb-1.5 font-bold text-mine-text-primary">
                  <span>Display Layers</span>
                  <button onClick={() => setShowLayerMenu(false)} className="text-mine-text-secondary hover:text-mine-text-primary"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="space-y-1.5 text-mine-text-secondary">
                  {[
                    ['showRoadways', showRoadways, setShowRoadways, 'Roadways & Tunnels'],
                    ['showPillars', showPillars, setShowPillars, 'Coal Pillars'],
                    ['showPanels', showPanels, setShowPanels, 'Panels & Zones'],
                    ['showGoaf', showGoaf, setShowGoaf, 'Goaf / Old Workings'],
                    ['showSensors', showSensors, setShowSensors, 'Strata Sensors'],
                    ['showWorkers', showWorkers, setShowWorkers, 'Miners Underground'],
                    ['showMonitoringStations', showMonitoringStations, setShowMonitoringStations, 'Monitoring Stations'],
                    ['showAirflow', showAirflow, setShowAirflow, 'Ventilation Airflow'],
                    ['showEmergencyRoutes', showEmergencyRoutes, setShowEmergencyRoutes, 'Safe Evacuation Routes'],
                  ].map(([key, val, setter, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                      <input type="checkbox" checked={val} onChange={() => setter(!val)} className="rounded text-status-safe" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Airflow toggle */}
          <button type="button" onClick={() => setShowAirflow(!showAirflow)}
            className={`px-2 py-1 rounded transition border flex items-center gap-1 ${showAirflow ? 'bg-mine-surface text-mine-text-primary border-mine-border font-medium' : 'text-mine-text-secondary border-transparent'}`}
            title="Toggle Animated Ventilation Airflow">
            <Wind className="h-3 w-3 text-status-safe" />
            <span className="hidden sm:inline">Airflow</span>
          </button>

          {/* Add Miner */}
          <button type="button" onClick={() => setIsAddMinerModalOpen(true)}
            className="px-2 py-1 rounded transition border border-status-attention/40 bg-status-attention/15 text-status-attention hover:bg-status-attention hover:text-white font-medium flex items-center gap-1 shadow-sm"
            title="Deploy new miner to map">
            <UserPlus className="h-3 w-3" />
            <span className="hidden sm:inline">Add Miner</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-mine-surface rounded border border-mine-border p-0.5">
            <button type="button" onClick={zoomIn} className="p-1 hover:bg-mine-surface-alt rounded text-mine-text-secondary" title="Zoom In"><ZoomIn className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={zoomOut} className="p-1 hover:bg-mine-surface-alt rounded text-mine-text-secondary" title="Zoom Out"><ZoomOut className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={handleResetView} className="p-1 hover:bg-mine-surface-alt rounded text-mine-text-secondary text-[10px] font-mono" title="Reset View"><RotateCcw className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={toggleFullscreen} className="p-1 hover:bg-mine-surface-alt rounded text-mine-text-secondary" title="Toggle Fullscreen">
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── SVG Canvas ────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden bg-mine-bg"
        style={{ height: isFullscreen ? 'calc(100vh - 42px)' : height, cursor: dragRef.current?.active ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-full max-w-full select-none"
          style={{ display: 'block' }}
        >
          <defs>
            <pattern id="surveyGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDarkMode ? '#242730' : '#E3DED5'} strokeWidth="0.75" />
              <circle cx="0" cy="0" r="1.2" fill={isDarkMode ? '#343844' : '#D0C9BE'} />
            </pattern>
            <pattern id="coalPillarHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill={isDarkMode ? '#1E2026' : '#EEEBE4'} />
              <line x1="0" y1="0" x2="0" y2="8" stroke={isDarkMode ? '#2D323E' : '#D8D3CA'} strokeWidth="1.8" />
            </pattern>
            <pattern id="goafTexture" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill={isDarkMode ? '#22242B' : '#E8E4DC'} />
              <path d="M 0 0 L 6 6 M 6 0 L 0 6" stroke={isDarkMode ? '#3E4350' : '#C4BDB0'} strokeWidth="1" />
            </pattern>
            <pattern id="collapseHazard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="7" height="14" fill="#C4362E" />
              <rect x="7" width="7" height="14" fill="#8E1F1A" />
            </pattern>
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── World-space transform group (all zoomed/panned content) ── */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

            {/* Background Grid */}
            <rect width={mapWidth} height={mapHeight} fill="url(#surveyGrid)" />

            {/* Panels / Extraction Zones */}
            {showPanels && (
              <g className="panels-layer" opacity="0.85">
                {currentPanels.map((p) => (
                  <g key={p.id}>
                    <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="8"
                      fill={p.color || '#64748B'} fillOpacity="0.08"
                      stroke={p.color || '#94A3B8'} strokeDasharray="4 3" strokeWidth="1.2" />
                    {/* Zone label always visible */}
                    <text x={p.x + 10} y={p.y + 18} fill={p.color || '#64748B'}
                      fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif">
                      {p.name || p.id}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Coal Pillars */}
            {showPillars && (
              <g className="pillars-layer">
                {currentPillars.map((pill, idx) => (
                  <rect key={pill.id || idx} x={pill.x} y={pill.y} width={pill.w} height={pill.h} rx="3"
                    fill="url(#coalPillarHatch)" stroke={isDarkMode ? '#2D323E' : '#D8D3CA'} strokeWidth="1" />
                ))}
              </g>
            )}

            {/* Goaf */}
            {showGoaf && (
              <g className="goaf-layer">
                {currentGoaf.map((g, idx) => (
                  <g key={g.id || idx}>
                    <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="4"
                      fill="url(#goafTexture)" stroke="#C4BDB0" strokeWidth="1" strokeDasharray="2 2" />
                    <text x={g.x + g.w / 2} y={g.y + g.h / 2 + 3} textAnchor="middle"
                      fill="#8C8578" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">
                      {g.label || 'GOAF'}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Ventilation Airflow */}
            {showAirflow && (
              <g className="airflow-layer" opacity="0.8">
                {currentAirflow.map((v, idx) => {
                  const fromN = nodeMap.get(v.from);
                  const toN = nodeMap.get(v.to);
                  if (!fromN || !toN) return null;
                  const isIntake = v.direction === 'intake';
                  const strokeColor = isIntake ? '#2563EB' : '#D97706';
                  return (
                    <g key={v.id || idx}>
                      <line x1={fromN.x + (isIntake ? 5 : -5)} y1={fromN.y + (isIntake ? 5 : -5)}
                        x2={toN.x + (isIntake ? 5 : -5)} y2={toN.y + (isIntake ? 5 : -5)}
                        stroke={strokeColor} strokeWidth="2" strokeDasharray="6 4">
                        <animate attributeName="stroke-dashoffset" values={isIntake ? '0;-20' : '-20;0'} dur="1.5s" repeatCount="indefinite" />
                      </line>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Roadways & Tunnels */}
            {showRoadways && (
              <g className="roadways-layer">
                {enrichedData.roadways.map((tunnel) => {
                  const fromN = nodeMap.get(tunnel.from);
                  const toN = nodeMap.get(tunnel.to);
                  if (!fromN || !toN) return null;
                  const state = tunnelStates[tunnel.id] || { riskLevel: 'SAFE', status: 'OPEN' };
                  const isCollapsed = state.status === 'COLLAPSED' || collapsedTunnelIds.includes(tunnel.id);
                  const color = getRiskColor(state.riskLevel, state.status);
                  const isInspected = inspectedTunnel?.id === tunnel.id;
                  const midX = (fromN.x + toN.x) / 2;
                  const midY = (fromN.y + toN.y) / 2;

                  // Show tunnel label based on LOD
                  const showTunnelLabel = lodTier !== LOD.OVERVIEW &&
                    (lodTier === LOD.DETAILED || tunnel.priority <= 1);

                  return (
                    <g key={tunnel.id} onClick={() => handleTunnelClick(tunnel)} className="cursor-pointer">
                      {isCustomMapActive || activeMap?.isSingleLine ? (
                        <line x1={fromN.x} y1={fromN.y} x2={toN.x} y2={toN.y}
                          stroke={isCollapsed ? 'url(#collapseHazard)' : color}
                          strokeWidth={isInspected ? '5.5' : '3.5'} strokeLinecap="round"
                          strokeOpacity={isCollapsed ? 0.95 : 0.9} />
                      ) : (
                        <>
                          <line x1={fromN.x} y1={fromN.y} x2={toN.x} y2={toN.y}
                            stroke="#4A4742" strokeWidth={isInspected ? '18' : '14'} strokeLinecap="round" />
                          <line x1={fromN.x} y1={fromN.y} x2={toN.x} y2={toN.y}
                            stroke={isCollapsed ? 'url(#collapseHazard)' : color}
                            strokeWidth={isInspected ? '10' : '7'} strokeLinecap="round"
                            strokeOpacity={isCollapsed ? 0.95 : 0.85} />
                        </>
                      )}

                      {isCollapsed && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <line x1="-5" y1="-5" x2="5" y2="5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                          <line x1="5" y1="-5" x2="-5" y2="5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                        </g>
                      )}

                      {/* LOD-gated tunnel label */}
                      <g
                        transform={`translate(${midX}, ${midY - (isCustomMapActive || activeMap?.isSingleLine ? 6 : 8)})`}
                        style={{ opacity: showTunnelLabel ? 1 : 0, transition: 'opacity 0.25s ease' }}
                      >
                        <rect
                          x={isCustomMapActive || activeMap?.isSingleLine ? '-14' : '-18'} y="-6"
                          width={lodTier === LOD.DETAILED ? (isCustomMapActive ? '44' : '52') : (isCustomMapActive ? '22' : '28')}
                          height="12" rx="2"
                          fill={isDarkMode ? '#242730' : '#FFFFFF'}
                          stroke={isInspected ? '#06B6D4' : isDarkMode ? '#3E4350' : '#D8D3CA'}
                          strokeWidth="0.8"
                        />
                        <text textAnchor="middle" y="3"
                          fontSize={isCustomMapActive || activeMap?.isSingleLine ? '6' : '7'}
                          fontWeight="600" fill={isDarkMode ? '#EDEAE4' : '#292722'} fontFamily="Inter, sans-serif">
                          {lodTier === LOD.DETAILED && tunnel.length
                            ? `${tunnel.id} • ${tunnel.length}m`
                            : tunnel.id}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Evacuation Route */}
            {showEmergencyRoutes && routePoints && (
              <g className="evacuation-route-layer">
                <polyline points={routePoints} fill="none" stroke="#2D8A4E" strokeWidth="10"
                  strokeLinecap="round" strokeLinejoin="round" opacity="0.25" filter="url(#routeGlow)" />
                <polyline points={routePoints} fill="none" stroke="#2D8A4E" strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 6">
                  <animate attributeName="stroke-dashoffset" values="0;-28" dur="1.2s" repeatCount="indefinite" />
                </polyline>
              </g>
            )}

            {/* Junction Nodes */}
            <g className="nodes-layer">
              {enrichedData.junctions.map((n) => {
                const isHigh = highlightedId === n.id;
                const labelVisible = junctionLabelVisibility.get(n.id) ?? false;

                return (
                  <g key={n.id} transform={`translate(${n.x}, ${n.y})`}
                    onClick={() => handleNodeClick(n)} className="cursor-pointer">
                    {isHigh && (
                      <circle r="12" fill="none" stroke="#06B6D4" strokeWidth="2">
                        <animate attributeName="r" values="8;16;8" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Node dot — size varies by priority */}
                    <circle
                      r={n.priority === 1 ? 7 : n.priority === 2 ? 5.5 : 4.5}
                      fill={isDarkMode ? '#242730' : '#FFFFFF'}
                      stroke={isDarkMode ? '#EDEAE4' : '#292722'}
                      strokeWidth={n.priority === 1 ? 2.5 : 1.5}
                    />
                    {/* LOD-aware label with smooth fade */}
                    <text
                      textAnchor="middle" y="-10"
                      fontSize={n.priority === 1 ? 9 : n.priority === 2 ? 8 : 7}
                      fontWeight={n.priority === 1 ? '700' : '600'}
                      fill={isDarkMode ? '#EDEAE4' : '#292722'}
                      fontFamily="Inter, sans-serif"
                      style={{
                        opacity: labelVisible ? 1 : 0,
                        transition: 'opacity 0.25s cubic-bezier(0.4,0,0.2,1)',
                        pointerEvents: 'none',
                      }}
                    >
                      {n.id}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Surface Exits, Shafts & Refuge */}
            <g className="shafts-layer">
              {enrichedData.shafts.map((e) => {
                const isRefuge = e.type === 'refuge';
                return (
                  <g key={e.id} transform={`translate(${e.x}, ${e.y})`}>
                    <rect x={isRefuge ? '-28' : '-22'} y="-12"
                      width={isRefuge ? '56' : '44'} height="24" rx="4"
                      fill={isRefuge ? '#D97706' : '#2D8A4E'} stroke="#FFFFFF" strokeWidth="1.5" />
                    <text textAnchor="middle" y="4" fontSize="8" fontWeight="700"
                      fill="#FFFFFF" fontFamily="Inter, sans-serif">
                      {e.id}
                    </text>
                    {/* Subtype badge visible from SECTION onwards */}
                    {lodTier !== LOD.OVERVIEW && (
                      <text textAnchor="middle" y="-16" fontSize="6" fontWeight="600"
                        fill={isRefuge ? '#D97706' : '#2D8A4E'} fontFamily="Inter, sans-serif"
                        style={{ opacity: 1, transition: 'opacity 0.25s ease' }}>
                        {isRefuge ? 'REFUGE' : 'GATE / SHAFT'}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Monitoring Stations */}
            {showMonitoringStations && (
              <g className="monitoring-stations-layer">
                {currentMonitoringStations.map((ms) => {
                  const targetNode = nodeMap.get(ms.nodeId);
                  if (!targetNode) return null;
                  const isSelected = inspectedStation?.id === ms.id;
                  return (
                    <g key={ms.id} transform={`translate(${targetNode.x - 18}, ${targetNode.y + 14})`}
                      onClick={(e) => { e.stopPropagation(); setInspectedStation(ms); setInspectedWorker(null); setInspectedTunnel(null); }}
                      className="cursor-pointer">
                      <rect x="-10" y="-8" width="20" height="16" rx="3"
                        fill={isSelected ? '#06B6D4' : '#1E293B'} stroke="#FFFFFF" strokeWidth="1.2" />
                      <text textAnchor="middle" y="3" fontSize="6" fontWeight="bold"
                        fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">MS</text>
                      {/* Show MS label at SECTION+ */}
                      {lodTier !== LOD.OVERVIEW && (
                        <text textAnchor="middle" y="20" fontSize="6" fontWeight="600"
                          fill={isDarkMode ? '#94A3B8' : '#475569'} fontFamily="Inter, sans-serif"
                          style={{ opacity: 1, transition: 'opacity 0.25s ease' }}>
                          {ms.id}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Sensors */}
            {showSensors && (
              <g className="sensors-layer">
                {sensors.map((s) => {
                  const parentNode = nodeMap.get(s.nodeId);
                  if (!parentNode) return null;
                  const color = getRiskColor(s.status, 'OPEN');
                  const num = parseInt(s.id.replace(/[^0-9]/g, '')) || 1;
                  const offsetX = (num % 2 === 0 ? 14 : -14);
                  const offsetY = (num % 3 === 0 ? 14 : -14);
                  const isSelected = selectedSensor?.id === s.id;
                  const showLabel = lodTier === LOD.DETAILED;

                  return (
                    <g key={s.id} transform={`translate(${parentNode.x + offsetX}, ${parentNode.y + offsetY})`}
                      onClick={(e) => { e.stopPropagation(); setSelectedSensor(s); }} className="cursor-pointer">
                      {isSelected && <circle r="9" fill="none" stroke="#06B6D4" strokeWidth="1.5" />}
                      <circle r="4.5" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
                      {s.status === 'CRITICAL' && (
                        <circle r="8" fill="none" stroke="#C4362E" strokeWidth="1.5" opacity="0.6">
                          <animate attributeName="r" values="6;12;6" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                      {/* Sensor label at DETAILED only */}
                      {showLabel && (
                        <text textAnchor="middle" y="14" fontSize="5.5" fontWeight="600"
                          fill={isDarkMode ? '#94A3B8' : '#475569'} fontFamily="Inter, sans-serif"
                          style={{ opacity: 1, transition: 'opacity 0.2s ease' }}>
                          {s.id}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Miners */}
            {showWorkers && (() => {
              const workersByNode = {};
              workers.forEach((w) => { if (!workersByNode[w.nodeId]) workersByNode[w.nodeId] = []; workersByNode[w.nodeId].push(w); });
              return (
                <g className="workers-layer">
                  {workers.map((w) => {
                    const parentNode = nodeMap.get(w.nodeId);
                    if (!parentNode) return null;
                    const isEvac = w.status === 'EVACUATING';
                    const isSelected = inspectedWorker?.id === w.id;
                    const nodeGroup = workersByNode[w.nodeId] || [];
                    const posInGroup = nodeGroup.findIndex((nw) => nw.id === w.id);
                    const groupSize = nodeGroup.length;
                    const cols = Math.min(groupSize, 4);
                    const col = posInGroup % cols;
                    const row = Math.floor(posInGroup / cols);
                    const offsetX = (col - (Math.min(groupSize, cols) - 1) / 2) * 14;
                    const offsetY = row * 14;
                    const wx = parentNode.x + offsetX;
                    const wy = parentNode.y - 24 - offsetY;
                    const showExpandedLabel = lodTier === LOD.DETAILED;

                    const handleWorkerSelect = (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // Compute screen-space coordinates of clicked miner icon
                      const rect = e.currentTarget?.getBoundingClientRect?.();
                      if (rect) {
                        setWorkerAnchorPos({ x: rect.right, y: rect.top });
                      } else if (e.clientX && e.clientY) {
                        setWorkerAnchorPos({ x: e.clientX, y: e.clientY });
                      }
                      setInspectedWorker(w);
                      setSelectedWorker?.(w);
                      setSelectedRouteWorkerId(w.id);
                      setInspectedTunnel(null);
                      setInspectedNode(null);
                      setInspectedStation(null);
                    };

                    return (
                      <g
                        key={w.id}
                        transform={`translate(${wx}, ${wy})`}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={handleWorkerSelect}
                        className="cursor-pointer group"
                      >
                        {/* Generous transparent hit areas so clicking anywhere around the miner registers cleanly */}
                        <circle r="16" fill="#000000" fillOpacity="0" pointerEvents="all" />
                        <rect x="-18" y="-14" width="36" height="44" fill="#000000" fillOpacity="0" pointerEvents="all" />

                        {/* Selection & hover halos */}
                        {isSelected && <circle r="10" fill="none" stroke="#06B6D4" strokeWidth="2.5" opacity="0.95" />}
                        <circle
                          r="9"
                          fill="none"
                          stroke={isEvac ? '#EF4444' : '#06B6D4'}
                          strokeWidth="1.5"
                          opacity="0"
                          className="group-hover:opacity-60 transition-opacity"
                        />
                        {isEvac && (
                          <circle r="8" fill="none" stroke="#C4362E" strokeWidth="1.5">
                            <animate attributeName="r" values="6;12;6" dur="1.2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.2s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <circle
                          r="6"
                          fill={isEvac ? '#C4362E' : isSelected ? '#06B6D4' : '#2D323E'}
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                          className="group-hover:scale-110 transition-transform origin-center"
                        />
                        <text textAnchor="middle" y="2.5" fontSize="4.5" fontWeight="bold" fill="#FFFFFF" pointerEvents="none">⛏</text>

                        {/* Miner ID — always visible if group is small enough */}
                        {(isSelected || groupSize <= 3) && (
                          <text
                            textAnchor="middle"
                            y="15"
                            fontSize="6"
                            fontWeight="700"
                            fill={isEvac ? '#C4362E' : isSelected ? '#06B6D4' : isDarkMode ? '#EDEAE4' : '#292722'}
                            fontFamily="Inter, sans-serif"
                            pointerEvents="none"
                          >
                            {w.id}
                          </text>
                        )}

                        {/* Expanded name badge at DETAILED zoom */}
                        {showExpandedLabel && (
                          <text
                            textAnchor="middle"
                            y="24"
                            fontSize="5.5"
                            fontWeight="600"
                            fill={isDarkMode ? '#94A3B8' : '#64748B'}
                            fontFamily="Inter, sans-serif"
                            pointerEvents="none"
                            style={{ opacity: 1, transition: 'opacity 0.25s ease' }}
                          >
                            {w.name?.split(' ')[0] || ''}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })()}

            {/* Scale Bar (in world space, bottom-left) */}
            <g transform={`translate(40, ${mapHeight - 30})`}>
              <line x1="0" y1="0" x2="60" y2="0" stroke="#6F6A61" strokeWidth="1.5" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#6F6A61" strokeWidth="1.5" />
              <line x1="60" y1="-3" x2="60" y2="3" stroke="#6F6A61" strokeWidth="1.5" />
              <text x="30" y="10" textAnchor="middle" fontSize="7" fill="#6F6A61" fontFamily="Inter, sans-serif">
                {scaleBarMeters}m
              </text>
            </g>

            {/* North Compass */}
            <g transform={`translate(${mapWidth - 50}, 40)`}>
              <circle r="12" fill={isDarkMode ? '#242730' : '#FFFFFF'} stroke={isDarkMode ? '#3E4350' : '#D8D3CA'} strokeWidth="1" />
              <polygon points="0,-9 3,0 -3,0" fill="#C4362E" />
              <polygon points="0,9 3,0 -3,0" fill={isDarkMode ? '#9CA3AF' : '#6F6A61'} />
              <text x="0" y="-12" textAnchor="middle" fontSize="7" fontWeight="bold" fill={isDarkMode ? '#EDEAE4' : '#292722'}>N</text>
            </g>

          </g>{/* end world-space group */}
        </svg>

        {/* ── Floating Navigation HUD (bottom-right, screen-fixed) ───────── */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 z-20 pointer-events-none">
          {/* LOD pill */}
          <div
            className="pointer-events-auto px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg border border-white/20"
            style={{ backgroundColor: LOD_COLORS[lodTier] }}
          >
            {lodLabel}
          </div>

          {/* Zoom / Home / Fullscreen controls */}
          <div className="pointer-events-auto flex flex-col gap-1 bg-mine-surface border border-mine-border rounded-lg shadow-lg p-1.5">
            <button onClick={zoomIn} className="p-1.5 hover:bg-mine-surface-alt rounded text-mine-text-secondary" title="Zoom In"><ZoomIn className="h-4 w-4" /></button>
            <button onClick={zoomOut} className="p-1.5 hover:bg-mine-surface-alt rounded text-mine-text-secondary" title="Zoom Out"><ZoomOut className="h-4 w-4" /></button>
            <div className="h-px bg-mine-border" />
            <button onClick={handleResetView} className="p-1.5 hover:bg-mine-surface-alt rounded text-mine-text-secondary" title="Reset / Home"><Home className="h-4 w-4" /></button>
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-mine-surface-alt rounded text-mine-text-secondary" title="Fullscreen">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Floating Tunnel Inspector ─────────────────────────────────── */}
        {inspectedTunnel && (
          <div className="absolute top-12 left-4 w-72 card p-3.5 bg-mine-surface border border-mine-border shadow-dropdown z-20 space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-mine-border pb-1.5">
              <span className="font-bold text-mine-text-primary uppercase tracking-wider">{inspectedTunnel.id} — {inspectedTunnel.label}</span>
              <button onClick={() => setInspectedTunnel(null)} className="text-mine-text-secondary hover:text-mine-text-primary"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1 text-mine-text-secondary">
              <div className="flex justify-between"><span>Sector:</span><strong className="text-mine-text-primary font-semibold">Zone {inspectedTunnel.zone || 'Main'}</strong></div>
              <div className="flex justify-between"><span>Length:</span><strong className="text-mine-text-primary font-mono">{inspectedTunnel.length} meters</strong></div>
              <div className="flex justify-between"><span>Status:</span>
                <strong className={inspectedTunnel.status === 'COLLAPSED' ? 'text-status-critical font-bold' : 'text-status-safe font-semibold'}>{inspectedTunnel.status}</strong>
              </div>
            </div>
            <button type="button"
              onClick={() => { toggleTunnelBlock(inspectedTunnel.id); setInspectedTunnel((prev) => ({ ...prev, status: prev.status === 'COLLAPSED' ? 'OPEN' : 'COLLAPSED' })); }}
              className={`w-full py-1.5 px-3 rounded text-xs font-semibold transition ${inspectedTunnel.status === 'COLLAPSED' ? 'bg-status-safe text-white hover:opacity-90' : 'bg-status-critical text-white hover:opacity-90'}`}>
              {inspectedTunnel.status === 'COLLAPSED' ? 'Reopen Tunnel' : 'Simulate Tunnel Blockage'}
            </button>
          </div>
        )}

        {/* ── Floating Monitoring Station Panel ─────────────────────────── */}
        {inspectedStation && (
          <div className="absolute top-12 right-4 w-72 card p-4 bg-mine-surface border border-mine-border shadow-dropdown z-20 space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-mine-border pb-2">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-status-safe" />
                <span className="font-bold text-mine-text-primary uppercase tracking-wider">{inspectedStation.name || inspectedStation.id}</span>
              </div>
              <button onClick={() => setInspectedStation(null)} className="text-mine-text-secondary hover:text-mine-text-primary"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1 text-mine-text-secondary">
              <div className="flex justify-between"><span>Connected Node:</span><strong className="text-mine-text-primary font-semibold">{inspectedStation.nodeId}</strong></div>
              <div className="flex justify-between"><span>Risk Level:</span><strong className="text-status-safe font-semibold">{inspectedStation.risk || 'LOW'}</strong></div>
              <div className="flex justify-between"><span>Last Update:</span><span className="font-mono text-[11px] text-mine-text-secondary">{inspectedStation.lastUpdate || 'Just now'}</span></div>
            </div>
            <div className="border-t border-mine-border pt-2 space-y-1">
              <span className="text-[10px] uppercase font-bold text-mine-text-secondary">Linked Sensors:</span>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                <span className="p-1 rounded bg-mine-surface-alt border border-mine-border text-mine-text-primary">Vibration: V-12</span>
                <span className="p-1 rounded bg-mine-surface-alt border border-mine-border text-mine-text-primary">Tilt: T-07</span>
                <span className="p-1 rounded bg-mine-surface-alt border border-mine-border text-mine-text-primary">Displacement: D-04</span>
                <span className="p-1 rounded bg-mine-surface-alt border border-mine-border text-mine-text-primary">Crack: C-02</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Floating Miner Detail Popup ───────────────────────────────── */}
        {inspectedWorker && (
          <MinerDetailPopup
            worker={workers.find((w) => w.id === inspectedWorker.id) || inspectedWorker}
            route={workerRoutes[inspectedWorker.id] || activeRoute}
            anchorPosition={workerAnchorPos}
            onClose={() => {
              setInspectedWorker(null);
              setWorkerAnchorPos(null);
              setSelectedWorker?.(null);
            }}
            onHighlightRoute={(workerId) => {
              setSelectedRouteWorkerId(workerId);
              setShowEmergencyRoutes(true);
            }}
          />
        )}
      </div>

      {/* Engineering Disclaimer Bar */}
      <div className="px-4 py-1.5 border-t border-mine-border bg-mine-surface-alt/70 text-[10px] text-mine-text-secondary flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-mine-text-primary">Protocad GIS:</strong> Map geometry and automated feature extraction are for monitoring/prototype purposes and must be verified against approved mine plans before operational use.
        </span>
        <span className="font-mono text-[10px] text-mine-text-secondary">
          Scroll to zoom • Drag to pan • Double-click to focus • Click objects to inspect &nbsp;|&nbsp; DGMS Ref #44A • {workers.length} Personnel Active • {sensors.length} Strata Nodes
        </span>
      </div>
    </div>
  );
}
