import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { getLODTier, classifyJunctions, classifyRoadways, computeVisibleLabels, LOD_TIERS, LABEL_PRIORITIES } from './mapLODEngine';

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
    isDarkMode,
    setIsAddMinerModalOpen,
    removeMiner,
    activeMap,
    isCustomMapActive,
    triggerSubsidence,
    triggerCollapse,
    resetToNormal,
    emergencyModeActive,
  } = useMine();

  // Viewport transformation (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const mapContainerRef = useRef(null);
  const mapViewportRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Native non-passive mouse wheel zoom listener with cursor centering
  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.86;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(3.8, Math.max(0.45, Number((prevZoom * zoomFactor).toFixed(2))));
        const ratio = nextZoom / prevZoom;

        setPan((prevPan) => ({
          x: Math.round(mouseX - (mouseX - prevPan.x) * ratio),
          y: Math.round(mouseY - (mouseY - prevPan.y) * ratio),
        }));

        return nextZoom;
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Layer Toggles (All 9 requested layers)
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

  // Map Search
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);

  // Inspectors & Popovers
  const [inspectedTunnel, setInspectedTunnel] = useState(null);
  const [inspectedNode, setInspectedNode] = useState(null);
  const [inspectedWorker, setInspectedWorker] = useState(null);
  const [inspectedStation, setInspectedStation] = useState(null);
  const [selectedRouteWorkerId, setSelectedRouteWorkerId] = useState(null);

  // Derive active map geometry (custom blueprint map OR default CAD)
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

  // Build node lookup map for O(1) coordinate resolution
  const nodeMap = useMemo(() => {
    const map = new Map();
    currentJunctions.forEach((n) => map.set(n.id, n));
    currentShafts.forEach((e) => map.set(e.id, e));
    if (activeMap?.refugeChambers) {
      activeMap.refugeChambers.forEach((rc) => map.set(rc.id, rc));
    }
    return map;
  }, [currentJunctions, currentShafts, activeMap]);

  const evacuatingWorkers = workers.filter((w) => w.status === 'EVACUATING');

  // Active target worker for route highlight
  const targetWorker =
    (selectedRouteWorkerId && workers.find((w) => w.id === selectedRouteWorkerId)) ||
    workers.find((w) => w.id === activeRouteWorkerId) ||
    evacuatingWorkers[0] ||
    workers[0];

  // Dynamic route calculation
  const activeRoute = useMemo(() => {
    if (!targetWorker) return null;
    if (workerRoutes && workerRoutes[targetWorker.id]) {
      return workerRoutes[targetWorker.id];
    }
    // Calculate on-the-fly if needed using active map topology
    return computeSafeRoute(targetWorker.nodeId, null, tunnelStates, currentRoadways, currentShafts);
  }, [targetWorker, workerRoutes, tunnelStates, currentRoadways, currentShafts]);

  const routePoints = useMemo(() => {
    if (!activeRoute || !activeRoute.routeNodes || activeRoute.routeNodes.length < 2) return '';
    return activeRoute.routeNodes
      .map((id) => {
        const n = nodeMap.get(id);
        return n ? `${n.x},${n.y}` : '';
      })
      .filter(Boolean)
      .join(' ');
  }, [activeRoute, nodeMap]);

  const getRiskColor = (riskLevel, status) => {
    if (status === 'COLLAPSED') return '#C4362E';
    switch (riskLevel) {
      case 'CRITICAL':
        return '#C4362E';
      case 'WARNING':
        return '#C4820E';
      case 'CAUTION':
        return '#D97706';
      case 'SAFE':
      default:
        return '#2D8A4E';
    }
  };

  // Search handler
  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Search miners
    const foundMiner = workers.find(
      (w) => w.id.toLowerCase().includes(query) || w.name.toLowerCase().includes(query)
    );
    if (foundMiner) {
      const node = nodeMap.get(foundMiner.nodeId) || (currentJunctions && (currentJunctions.find(j => j.zone === foundMiner.zone) || currentJunctions[0]));
      if (node) {
        setHighlightedId(foundMiner.id);
        setInspectedWorker(foundMiner);
        setSelectedRouteWorkerId(foundMiner.id);
        setZoom(1.3);
        setPan({ x: 500 - node.x, y: 290 - node.y });
        return;
      }
    }

    // Search sensors
    const foundSensor = sensors.find(
      (s) => s.id.toLowerCase().includes(query) || s.type?.toLowerCase().includes(query)
    );
    if (foundSensor) {
      const node = nodeMap.get(foundSensor.nodeId);
      if (node) {
        setHighlightedId(foundSensor.id);
        setSelectedSensor(foundSensor);
        setZoom(1.3);
        setPan({ x: 500 - node.x, y: 290 - node.y });
        return;
      }
    }

    // Search monitoring stations
    const foundStation = currentMonitoringStations.find(
      (ms) => ms.id.toLowerCase().includes(query) || ms.name.toLowerCase().includes(query)
    );
    if (foundStation) {
      const node = nodeMap.get(foundStation.nodeId);
      if (node) {
        setHighlightedId(foundStation.id);
        setInspectedStation(foundStation);
        setZoom(1.3);
        setPan({ x: 500 - node.x, y: 290 - node.y });
        return;
      }
    }

    // Search junctions
    const foundJunction = currentJunctions.find((j) => j.id.toLowerCase().includes(query));
    if (foundJunction) {
      setHighlightedId(foundJunction.id);
      setInspectedNode(foundJunction);
      setZoom(1.3);
      setPan({ x: 500 - foundJunction.x, y: 290 - foundJunction.y });
      return;
    }

    // Search shafts
    const foundShaft = currentShafts.find((s) => s.id.toLowerCase().includes(query) || s.label?.toLowerCase().includes(query));
    if (foundShaft) {
      setHighlightedId(foundShaft.id);
      setZoom(1.3);
      setPan({ x: 500 - foundShaft.x, y: 290 - foundShaft.y });
      return;
    }
  };

  const handleTunnelClick = (t) => {
    const currentStatus = tunnelStates[t.id]?.status || 'OPEN';
    setInspectedTunnel({ ...t, status: currentStatus, riskLevel: tunnelStates[t.id]?.riskLevel || 'SAFE' });
    setInspectedNode(null);
    setInspectedStation(null);
    onSelectTunnel?.(t);
  };

  const handleNodeClick = (n) => {
    setInspectedNode(n);
    setInspectedTunnel(null);
    setInspectedStation(null);
    onSelectNode?.(n);
  };

  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!isFullscreen) {
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHighlightedId(null);
  };

  const handleDoubleClick = (e) => {
    const el = mapViewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const zoomStep = e.shiftKey ? 0.7 : 1.45;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(3.8, Math.max(0.45, Number((prevZoom * zoomStep).toFixed(2))));
      const ratio = nextZoom / prevZoom;

      setPan((prevPan) => ({
        x: Math.round(mouseX - (mouseX - prevPan.x) * ratio),
        y: Math.round(mouseY - (mouseY - prevPan.y) * ratio),
      }));

      return nextZoom;
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, select, .cursor-pointer, .inspector-popover')) return;

    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const newX = e.clientX - panStartRef.current.x;
    const newY = e.clientY - panStartRef.current.y;
    setPan({ x: Math.round(newX), y: Math.round(newY) });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch gesture support for mobile/tablets/laptops
  const touchStartRef = useRef({ x: 0, y: 0, dist: 0, initialZoom: 1 });

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { dist, initialZoom: zoom };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isPanning) {
      const newX = e.touches[0].clientX - panStartRef.current.x;
      const newY = e.touches[0].clientY - panStartRef.current.y;
      setPan({ x: Math.round(newX), y: Math.round(newY) });
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      const nextZoom = Math.min(3.8, Math.max(0.45, Number((touchStartRef.current.initialZoom * factor).toFixed(2))));
      setZoom(nextZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    touchStartRef.current.dist = 0;
  };

  // Google Maps Section Quick-Fly Navigation
  const jumpToZone = (zoneId) => {
    if (zoneId === 'ALL') {
      handleResetView();
      return;
    }
    if (zoneId === 'SHAFTS') {
      if (currentShafts.length > 0) {
        const s = currentShafts[0];
        setZoom(1.5);
        setPan({
          x: Math.round((mapWidth / 2 - s.x) * 1.5),
          y: Math.round((mapHeight / 2 - s.y) * 1.5),
        });
      }
      return;
    }
    const panel = currentPanels.find((p) => p.zone === zoneId) || currentPanels[0];
    if (panel) {
      const targetZoom = 1.65;
      const centerX = panel.x + panel.w / 2;
      const centerY = panel.y + panel.h / 2;
      setZoom(targetZoom);
      setPan({
        x: Math.round((mapWidth / 2 - centerX) * targetZoom),
        y: Math.round((mapHeight / 2 - centerY) * targetZoom),
      });
    }
  };

  const jumpToLOD = (tierId) => {
    if (tierId === 'OVERVIEW') {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    } else if (tierId === 'SECTION') {
      setZoom(1.65);
    } else if (tierId === 'DETAILED') {
      setZoom(2.5);
    }
  };

  // ─── String Sanitizer (Clean up UTF-8 character encoding artifacts) ───────
  const sanitizeLabel = (str) =>
    typeof str === 'string'
      ? str.replace(/â€¢/g, '•').replace(/â€”/g, '—').replace(/â€“/g, '–').replace(/â‚¬/g, '')
      : str;

  // ─── Level of Detail (LOD) & Label Priority Classification ──────────────
  const currentLOD = getLODTier(zoom);

  const classifiedJunctions = useMemo(
    () => classifyJunctions(currentJunctions, currentRoadways, currentShafts),
    [currentJunctions, currentRoadways, currentShafts]
  );

  const classifiedRoadways = useMemo(
    () => classifyRoadways(currentRoadways, classifiedJunctions),
    [currentRoadways, classifiedJunctions]
  );

  // Precalculate boundary-safe and non-colliding coordinates for shafts
  const shaftLayoutMap = useMemo(() => {
    const map = new Map();
    currentShafts.forEach((s) => {
      const isRefuge = s.type === 'refuge';
      const cleanLabel = sanitizeLabel(s.label ? s.label.toUpperCase() : s.id);
      const textLen = Math.max(cleanLabel.length, 14);
      // Ensure plate is wide enough so long names NEVER spill outside the box
      const plateWidth = Math.max(106, Math.min(142, textLen * 5.8 + 28));
      const plateHeight = 32;
      const halfW = plateWidth / 2;
      const halfH = plateHeight / 2;

      // 4 Candidate positions around the ground portal collar (s.x, s.y)
      const options = [
        { dir: 'above', x: s.x, y: s.y - halfH - 18 },
        { dir: 'right', x: s.x + halfW + 18, y: s.y },
        { dir: 'left',  x: s.x - halfW - 18, y: s.y },
        { dir: 'below', x: s.x, y: s.y + halfH + 18 },
      ];

      let bestOpt = null;
      let minPenalty = Infinity;

      for (const opt of options) {
        // Clamp candidate so the entire plate is well within canvas bounds
        const clampedX = Math.max(halfW + 10, Math.min(mapWidth - halfW - 10, opt.x));
        const clampedY = Math.max(halfH + 10, Math.min(mapHeight - halfH - 10, opt.y));

        let penalty = Math.hypot(clampedX - opt.x, clampedY - opt.y) * 3;

        // Heavy penalty if candidate is pushed outside canvas bounds
        if (opt.y - halfH < 8 || opt.y + halfH > mapHeight - 8) penalty += 600;
        if (opt.x - halfW < 8 || opt.x + halfW > mapWidth - 8) penalty += 600;

        // Heavy penalty for overlapping any junction node
        for (const j of currentJunctions) {
          const dist = Math.hypot(clampedX - j.x, clampedY - j.y);
          if (dist < halfW + 20) {
            penalty += (halfW + 20 - dist) * 14;
          }
        }

        // Penalty for overlapping any worker
        for (const w of workers) {
          const wNode = nodeMap.get(w.nodeId);
          if (wNode) {
            const dist = Math.hypot(clampedX - wNode.x, clampedY - wNode.y);
            if (dist < halfW + 16) {
              penalty += (halfW + 16 - dist) * 10;
            }
          }
        }

        // Natural preference for 'above' when clear
        if (opt.dir === 'above') penalty -= 15;

        if (penalty < minPenalty) {
          minPenalty = penalty;
          bestOpt = {
            badgeX: Math.round(clampedX),
            badgeY: Math.round(clampedY),
            dir: opt.dir,
          };
        }
      }

      map.set(s.id, {
        ...s,
        badgeX: bestOpt?.badgeX || s.x,
        badgeY: bestOpt?.badgeY || Math.max(22, s.y - 30),
        plateWidth,
        plateHeight,
        halfW,
        halfH,
        cleanLabel,
        isRefuge,
      });
    });
    return map;
  }, [currentShafts, currentJunctions, workers, nodeMap, mapWidth, mapHeight]);

  // Identify junctions co-located with or directly adjacent to a shaft entrance (< 55px)
  const shaftAdjacentJunctionIds = useMemo(() => {
    const set = new Set();
    currentJunctions.forEach((j) => {
      const near = currentShafts.some((s) => Math.hypot(j.x - s.x, j.y - s.y) < 55);
      if (near) set.add(j.id);
    });
    return set;
  }, [currentJunctions, currentShafts]);

  // Multi-occupant worker spatial slot layout per node (Zero collision with shafts & junctions)
  const workerPositions = useMemo(() => {
    const map = new Map();
    const workersByNode = {};
    workers.forEach((w) => {
      if (!workersByNode[w.nodeId]) workersByNode[w.nodeId] = [];
      workersByNode[w.nodeId].push(w);
    });

    workers.forEach((w) => {
      let parentNode = nodeMap.get(w.nodeId);
      if (!parentNode && w.nodeId) {
        const normId = String(w.nodeId).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        for (const [k, v] of nodeMap.entries()) {
          if (String(k).replace(/[^A-Za-z0-9]/g, '').toUpperCase() === normId) {
            parentNode = v;
            break;
          }
        }
      }
      if (!parentNode && currentJunctions && currentJunctions.length > 0) {
        parentNode = currentJunctions.find((j) => j.zone === w.zone) || currentJunctions[0];
      }
      if (!parentNode) return;

      const isNearShaft = shaftAdjacentJunctionIds.has(parentNode.id) ||
        currentShafts.some((s) => Math.hypot(parentNode.x - s.x, parentNode.y - s.y) < 55);

      const nodeGroup = workersByNode[w.nodeId] || [w];
      const posInGroup = nodeGroup.findIndex((nw) => nw.id === w.id);
      const groupSize = nodeGroup.length;

      // Anti-collision slot assignment:
      // Top is reserved for Shaft, Bottom is reserved for Junction, Right is reserved for Miners
      const sideDir = parentNode.x > mapWidth - 75 ? -1 : 1;
      const col = posInGroup % 2;
      const row = Math.floor(posInGroup / 2);
      const wx = parentNode.x + sideDir * (22 + col * 14);
      const wy = parentNode.y - 4 + row * 16;

      map.set(w.id, {
        wx: Math.max(20, Math.min(mapWidth - 20, wx)),
        wy: Math.max(20, Math.min(mapHeight - 20, wy)),
        parentNode,
        isNearShaft,
        groupSize,
      });
    });

    return map;
  }, [workers, nodeMap, currentJunctions, currentShafts, shaftAdjacentJunctionIds, mapWidth, mapHeight]);

  // Candidate labels for spatial collision avoidance
  const candidateLabels = useMemo(() => {
    const candidates = [];

    // 1. Shafts & Gates (Priority 1 — Always visible, boundary-clamped, dynamic width)
    shaftLayoutMap.forEach((s) => {
      candidates.push({
        id: `label-shaft-${s.id}`,
        x: s.badgeX,
        y: s.badgeY,
        width: s.plateWidth + 8,
        height: s.plateHeight + 8,
        priority: LABEL_PRIORITIES.SHAFT_PORTAL,
        minZoom: 0.4,
      });
    });

    // 2. Miners (Priority 2 — Dedicated side slot, non-colliding)
    workers.forEach((w) => {
      const pos = workerPositions.get(w.id);
      if (pos) {
        candidates.push({
          id: `label-worker-${w.id}`,
          x: pos.wx,
          y: pos.wy + 13,
          width: 44,
          height: 18,
          priority: LABEL_PRIORITIES.MINER_BADGE,
          minZoom: 0.4,
        });
      }
    });

    // 3. Junctions (Major Hubs = P3, Secondary = P6, Minor = P8)
    classifiedJunctions.forEach((j) => {
      const isNearShaft = shaftAdjacentJunctionIds.has(j.id);
      const labelY = isNearShaft || j.y < 30 ? j.y + 14 : j.y - 12;
      candidates.push({
        id: `label-junction-${j.id}`,
        x: j.x,
        y: labelY,
        width: j.isHub ? 34 : 26,
        height: 14,
        priority: j.priority,
        minZoom: j.minZoom,
      });
    });

    // 4. Roadways / Tunnels
    classifiedRoadways.forEach((r) => {
      const fromN = nodeMap.get(r.from);
      const toN = nodeMap.get(r.to);
      if (fromN && toN) {
        candidates.push({
          id: `label-tunnel-${r.id}`,
          x: (fromN.x + toN.x) / 2,
          y: (fromN.y + toN.y) / 2 - 7,
          width: 28,
          height: 12,
          priority: r.priority,
          minZoom: r.minZoom,
        });
      }
    });

    // 5. Monitoring Stations
    currentMonitoringStations.forEach((ms) => {
      const node = nodeMap.get(ms.nodeId);
      if (node) {
        candidates.push({
          id: `label-station-${ms.id}`,
          x: node.x - 18,
          y: node.y + 14,
          width: 24,
          height: 16,
          priority: LABEL_PRIORITIES.MONITORING_STATION,
          minZoom: 0.8,
        });
      }
    });

    // 6. Active Alert Sensors
    sensors.forEach((s) => {
      const node = nodeMap.get(s.nodeId);
      if (node) {
        const isAlert = s.status === 'CRITICAL' || s.status === 'WARNING';
        candidates.push({
          id: `label-sensor-${s.id}`,
          x: node.x,
          y: node.y + 14,
          width: 26,
          height: 12,
          priority: isAlert ? 5 : LABEL_PRIORITIES.SENSOR_METRIC,
          minZoom: isAlert ? 1.35 : 2.2,
        });
      }
    });

    return candidates;
  }, [shaftLayoutMap, workerPositions, workers, classifiedJunctions, shaftAdjacentJunctionIds, classifiedRoadways, currentMonitoringStations, sensors, nodeMap]);

  // Compute set of visible labels using AABB collision avoidance
  const visibleLabelIds = useMemo(
    () => computeVisibleLabels(candidateLabels, zoom, 6),
    [candidateLabels, zoom]
  );

  return (
    <div
      ref={mapContainerRef}
      className={`card overflow-hidden flex flex-col w-full bg-mine-surface border border-mine-border shadow-card relative select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : ''
      }`}
    >
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mine-border bg-mine-surface-alt px-3.5 py-2 text-xs">
        {/* Left: Map Title & Status */}
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
        </div>

        {/* Center: Search input */}
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
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setHighlightedId(null); }}
              className="absolute right-2 text-mine-text-secondary hover:text-mine-text-primary"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </form>

        {/* Right: Actions, Simulation & Layer Controls */}
        <div className="flex items-center gap-2">
          {/* Evacuation Step */}
          {evacuatingWorkers.length > 0 && (
            <button
              type="button"
              onClick={advanceEvacuation}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-status-critical text-white font-semibold shadow-sm hover:opacity-90 transition animate-pulse"
              title="Advance evacuating miners one junction forward"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Step Evacuation ({evacuatingWorkers.length})</span>
            </button>
          )}

          {/* Simulate Subsidence quick trigger */}
          <button
            type="button"
            onClick={triggerSubsidence}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition shadow-sm"
            title="Inject simulated ground subsidence in active zone"
          >
            <Activity className="h-3 w-3" />
            <span>Simulate Subsidence</span>
          </button>

          {/* Layer Menu Dropdown Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-mine-surface text-mine-text-primary border border-mine-border hover:bg-mine-surface-alt font-medium transition shadow-sm"
              title="Toggle Map Layers"
            >
              <Layers className="h-3.5 w-3.5 text-status-safe" />
              <span>Layers</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 card p-3 bg-mine-surface border border-mine-border shadow-dropdown z-30 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-mine-border pb-1.5 font-bold text-mine-text-primary">
                  <span>Display Layers</span>
                  <button onClick={() => setShowLayerMenu(false)} className="text-mine-text-secondary hover:text-mine-text-primary">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 text-mine-text-secondary">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showRoadways} onChange={() => setShowRoadways(!showRoadways)} className="rounded text-status-safe" />
                    <span>Roadways & Tunnels</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showPillars} onChange={() => setShowPillars(!showPillars)} className="rounded text-status-safe" />
                    <span>Coal Pillars</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showPanels} onChange={() => setShowPanels(!showPanels)} className="rounded text-status-safe" />
                    <span>Panels & Zones</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showGoaf} onChange={() => setShowGoaf(!showGoaf)} className="rounded text-status-safe" />
                    <span>Goaf / Old Workings</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showSensors} onChange={() => setShowSensors(!showSensors)} className="rounded text-status-safe" />
                    <span>Strata Sensors</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showWorkers} onChange={() => setShowWorkers(!showWorkers)} className="rounded text-status-safe" />
                    <span>Miners Underground</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showMonitoringStations} onChange={() => setShowMonitoringStations(!showMonitoringStations)} className="rounded text-status-safe" />
                    <span>Monitoring Stations</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showAirflow} onChange={() => setShowAirflow(!showAirflow)} className="rounded text-status-safe" />
                    <span>Ventilation Airflow</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-mine-text-primary">
                    <input type="checkbox" checked={showEmergencyRoutes} onChange={() => setShowEmergencyRoutes(!showEmergencyRoutes)} className="rounded text-status-safe" />
                    <span>Safe Evacuation Routes</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Airflow Quick Toggle */}
          <button
            type="button"
            onClick={() => setShowAirflow(!showAirflow)}
            className={`px-2 py-1 rounded transition border flex items-center gap-1 ${
              showAirflow
                ? 'bg-mine-surface text-mine-text-primary border-mine-border font-medium'
                : 'text-mine-text-secondary border-transparent'
            }`}
            title="Toggle Animated Ventilation Airflow"
          >
            <Wind className="h-3 w-3 text-status-safe" />
            <span className="hidden sm:inline">Airflow</span>
          </button>

          {/* Add Miner */}
          <button
            type="button"
            onClick={() => setIsAddMinerModalOpen(true)}
            className="px-2 py-1 rounded transition border border-status-attention/40 bg-status-attention/15 text-status-attention hover:bg-status-attention hover:text-white font-medium flex items-center gap-1 shadow-sm"
            title="Deploy new miner to map"
          >
            <UserPlus className="h-3 w-3" />
            <span className="hidden sm:inline">Add Miner</span>
          </button>

          {/* Zoom & Viewport Controls */}
          <div className="flex items-center bg-mine-surface rounded border border-mine-border p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.2).toFixed(2))))}
              className="p-1 hover:bg-mine-surface-alt rounded text-mine-text-secondary"
              title="Zoom In (or scroll mouse wheel up)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-mine-text-secondary hover:text-mine-text-primary rounded hover:bg-mine-surface-alt transition select-none"
              title="Current Zoom (Click to reset to 100%)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))}
              className="p-1 hover:bg-mine-surface-alt rounded text-mine-text-secondary"
              title="Zoom Out (or scroll mouse wheel down)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 hover:bg-mine-surface-alt rounded text-mine-text-secondary text-[10px] font-mono"
              title="Reset View (100% centered)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 hover:bg-mine-surface-alt rounded text-mine-text-secondary"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Google Maps Style Navigation & LOD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mine-border/80 bg-mine-surface px-3 py-1.5 text-xs">
        {/* Left: Dynamic Level-of-Detail Tier Chips */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mine-text-secondary mr-1">
            Map Mode:
          </span>
          <button
            type="button"
            onClick={() => jumpToLOD('OVERVIEW')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
              currentLOD.tier === 'OVERVIEW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-mine-surface-alt text-mine-text-secondary hover:text-mine-text-primary border border-mine-border'
            }`}
            title="Overview Mode (< 1.35x): High-level mine layout, main hubs, gates & active miners"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentLOD.tier === 'OVERVIEW' ? 'bg-white' : 'bg-blue-400'}`} />
            Overview
          </button>
          <button
            type="button"
            onClick={() => jumpToLOD('SECTION')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
              currentLOD.tier === 'SECTION'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-mine-surface-alt text-mine-text-secondary hover:text-mine-text-primary border border-mine-border'
            }`}
            title="Section Mode (1.35x - 2.2x): Trunk tunnels, secondary junctions & monitoring stations"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentLOD.tier === 'SECTION' ? 'bg-white' : 'bg-amber-400'}`} />
            Section
          </button>
          <button
            type="button"
            onClick={() => jumpToLOD('DETAILED')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1.5 ${
              currentLOD.tier === 'DETAILED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-mine-surface-alt text-mine-text-secondary hover:text-mine-text-primary border border-mine-border'
            }`}
            title="Detailed Mode (>= 2.2x): Street-level crosscuts, all junction nodes & fine sensor metrics"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentLOD.tier === 'DETAILED' ? 'bg-white' : 'bg-emerald-400'}`} />
            Detailed
          </button>
        </div>

        {/* Right: Quick-Fly Zone Shortcuts */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mine-text-secondary mr-1 hidden md:inline">
            Quick Fly:
          </span>
          <button
            type="button"
            onClick={() => jumpToZone('ALL')}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-mine-surface-alt hover:bg-mine-border text-mine-text-primary border border-mine-border transition"
          >
            Full Mine
          </button>
          <button
            type="button"
            onClick={() => jumpToZone('SHAFTS')}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-mine-surface-alt hover:bg-mine-border text-mine-text-primary border border-mine-border transition flex items-center gap-1"
          >
            <DoorOpen className="h-2.5 w-2.5 text-status-safe" />
            Gates / Shafts
          </button>
          {['A', 'B', 'C', 'D'].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => jumpToZone(z)}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-mine-surface-alt hover:bg-mine-border text-mine-text-primary border border-mine-border transition"
            >
              Zone {z}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Map Container */}
      <div
        ref={mapViewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative w-full overflow-hidden bg-mine-bg flex items-center justify-center p-2 select-none"
        style={{
          height: isFullscreen ? 'calc(100vh - 84px)' : height,
          cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
        }}
      >
        <div
          className="w-full h-full flex items-center justify-center pointer-events-auto"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 120ms ease-out',
            willChange: 'transform',
          }}
        >
          <svg
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="w-full h-full max-w-full select-none"
          >
          <defs>
            {/* Survey Grid Pattern */}
            <pattern id="surveyGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDarkMode ? '#242730' : '#E3DED5'} strokeWidth="0.75" />
              <circle cx="0" cy="0" r="1.2" fill={isDarkMode ? '#343844' : '#D0C9BE'} />
            </pattern>

            {/* Coal Pillar Hatching Pattern */}
            <pattern id="coalPillarHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill={isDarkMode ? '#1E2026' : '#EEEBE4'} />
              <line x1="0" y1="0" x2="0" y2="8" stroke={isDarkMode ? '#2D323E' : '#D8D3CA'} strokeWidth="1.8" />
            </pattern>

            {/* Caved Goaf Pattern */}
            <pattern id="goafTexture" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill={isDarkMode ? '#22242B' : '#E8E4DC'} />
              <path d="M 0 0 L 6 6 M 6 0 L 0 6" stroke={isDarkMode ? '#3E4350' : '#C4BDB0'} strokeWidth="1" />
            </pattern>

            {/* Collapsed Hazard Stripe Pattern */}
            <pattern id="collapseHazard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="7" height="14" fill="#C4362E" />
              <rect x="7" width="7" height="14" fill="#8E1F1A" />
            </pattern>

            {/* Glow Filter for Evacuation Path */}
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Drop Shadow for Floating Map Plates */}
            <filter id="plateShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect width={mapWidth} height={mapHeight} fill="url(#surveyGrid)" />

          {/* Panels / Extraction Zones Layer */}
          {showPanels && (
            <g className="panels-layer" opacity={currentLOD.tier === 'OVERVIEW' ? "0.9" : "0.65"}>
              {currentPanels.map((p) => (
                <g key={p.id}>
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    rx="8"
                    fill={p.color || '#64748B'}
                    fillOpacity={currentLOD.tier === 'OVERVIEW' ? "0.12" : "0.05"}
                    stroke={p.color || '#94A3B8'}
                    strokeDasharray="4 3"
                    strokeWidth={currentLOD.tier === 'OVERVIEW' ? "1.5" : "1"}
                  />
                  <text
                    x={p.x + 10}
                    y={p.y + 18}
                    fill={p.color || '#64748B'}
                    fontSize={currentLOD.tier === 'OVERVIEW' ? "11" : "9"}
                    fontWeight="800"
                    letterSpacing="0.04em"
                    fontFamily="Inter, sans-serif"
                  >
                    {sanitizeLabel(p.name || p.id)}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Coal Pillars Layer */}
          {showPillars && (
            <g className="pillars-layer">
              {currentPillars.map((pill, idx) => (
                <rect
                  key={pill.id || idx}
                  x={pill.x}
                  y={pill.y}
                  width={pill.w}
                  height={pill.h}
                  rx="3"
                  fill="url(#coalPillarHatch)"
                  stroke={isDarkMode ? '#2D323E' : '#D8D3CA'}
                  strokeWidth="1"
                />
              ))}
            </g>
          )}

          {/* Goaf / Worked-out Areas */}
          {showGoaf && (
            <g className="goaf-layer">
              {currentGoaf.map((g, idx) => (
                <g key={g.id || idx}>
                  <rect
                    x={g.x}
                    y={g.y}
                    width={g.w}
                    height={g.h}
                    rx="4"
                    fill="url(#goafTexture)"
                    stroke="#C4BDB0"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={g.x + g.w / 2}
                    y={g.y + g.h / 2 + 3}
                    textAnchor="middle"
                    fill="#8C8578"
                    fontSize="8"
                    fontWeight="600"
                    fontFamily="Inter, sans-serif"
                  >
                    {g.label || 'GOAF'}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Ventilation Airflow Vectors (Animated Directional Arrows) */}
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
                    <line
                      x1={fromN.x + (isIntake ? 5 : -5)}
                      y1={fromN.y + (isIntake ? 5 : -5)}
                      x2={toN.x + (isIntake ? 5 : -5)}
                      y2={toN.y + (isIntake ? 5 : -5)}
                      stroke={strokeColor}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        values={isIntake ? '0;-20' : '-20;0'}
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </line>
                  </g>
                );
              })}
            </g>
          )}

          {/* Roadways & Tunnels Layer */}
          {showRoadways && (
            <g className="roadways-layer">
              {classifiedRoadways.map((tunnel) => {
                const fromN = nodeMap.get(tunnel.from);
                const toN = nodeMap.get(tunnel.to);
                if (!fromN || !toN) return null;

                const state = tunnelStates[tunnel.id] || { riskLevel: 'SAFE', status: 'OPEN' };
                const isCollapsed = state.status === 'COLLAPSED' || collapsedTunnelIds.includes(tunnel.id);
                const color = getRiskColor(state.riskLevel, state.status);
                const isInspected = inspectedTunnel?.id === tunnel.id;
                const isLabelVisible = visibleLabelIds.has(`label-tunnel-${tunnel.id}`);

                return (
                  <g
                    key={tunnel.id}
                    onClick={() => handleTunnelClick(tunnel)}
                    className="cursor-pointer"
                  >
                    {/* Roadways: Single-line centerline for blueprint maps; dual casing for default map */}
                    {isCustomMapActive || activeMap?.isSingleLine ? (
                      <line
                        x1={fromN.x}
                        y1={fromN.y}
                        x2={toN.x}
                        y2={toN.y}
                        stroke={isCollapsed ? 'url(#collapseHazard)' : color}
                        strokeWidth={isInspected ? '5.5' : tunnel.isMajorTrunk ? '4' : '3'}
                        strokeLinecap="round"
                        strokeOpacity={isCollapsed ? 0.95 : 0.9}
                      />
                    ) : (
                      <>
                        {/* Outer tunnel rock casing */}
                        <line
                          x1={fromN.x}
                          y1={fromN.y}
                          x2={toN.x}
                          y2={toN.y}
                          stroke="#4A4742"
                          strokeWidth={isInspected ? '18' : tunnel.isMajorTrunk ? '15' : '13'}
                          strokeLinecap="round"
                        />

                        {/* Inner gallery */}
                        <line
                          x1={fromN.x}
                          y1={fromN.y}
                          x2={toN.x}
                          y2={toN.y}
                          stroke={isCollapsed ? 'url(#collapseHazard)' : color}
                          strokeWidth={isInspected ? '10' : tunnel.isMajorTrunk ? '7.5' : '6'}
                          strokeLinecap="round"
                          strokeOpacity={isCollapsed ? 0.95 : 0.85}
                        />
                      </>
                    )}

                    {/* Collapsed warning cross */}
                    {isCollapsed && (
                      <g transform={`translate(${(fromN.x + toN.x) / 2}, ${(fromN.y + toN.y) / 2})`}>
                        <line x1="-5" y1="-5" x2="5" y2="5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                        <line x1="5" y1="-5" x2="-5" y2="5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                      </g>
                    )}

                    {/* Tunnel ID Badge - Only shown when permitted by LOD zoom & collision avoidance */}
                    {isLabelVisible && (
                      <g
                        transform={`translate(${(fromN.x + toN.x) / 2}, ${(fromN.y + toN.y) / 2 - (isCustomMapActive || activeMap?.isSingleLine ? 6 : 8)})`}
                        className="transition-opacity duration-200"
                      >
                        <rect
                          x={isCustomMapActive || activeMap?.isSingleLine ? "-11" : "-14"}
                          y={isCustomMapActive || activeMap?.isSingleLine ? "-5" : "-6"}
                          width={isCustomMapActive || activeMap?.isSingleLine ? "22" : "28"}
                          height={isCustomMapActive || activeMap?.isSingleLine ? "10" : "12"}
                          rx="2"
                          fill={isDarkMode ? '#242730' : '#FFFFFF'}
                          stroke={isInspected ? '#06B6D4' : isDarkMode ? '#3E4350' : '#D8D3CA'}
                          strokeWidth="0.8"
                        />
                        <text
                          textAnchor="middle"
                          y={isCustomMapActive || activeMap?.isSingleLine ? "2.5" : "3"}
                          fontSize={isCustomMapActive || activeMap?.isSingleLine ? "6" : "7"}
                          fontWeight="600"
                          fill={isDarkMode ? '#EDEAE4' : '#292722'}
                          fontFamily="Inter, sans-serif"
                        >
                          {tunnel.id}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Dynamic Evacuation Route Polyline (Dijkstra) */}
          {showEmergencyRoutes && routePoints && (
            <g className="evacuation-route-layer">
              <polyline
                points={routePoints}
                fill="none"
                stroke="#2D8A4E"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.25"
                filter="url(#routeGlow)"
              />
              <polyline
                points={routePoints}
                fill="none"
                stroke="#2D8A4E"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 6"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-28"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </polyline>
            </g>
          )}

          {/* Junction Nodes Layer - Google Maps Hierarchy & Anti-Collision Slots */}
          <g className="nodes-layer">
            {classifiedJunctions.map((n) => {
              const isHigh = highlightedId === n.id;
              const isLabelVisible = visibleLabelIds.has(`label-junction-${n.id}`);
              const isHub = n.isHub;
              const isNearShaft = shaftAdjacentJunctionIds.has(n.id);
              const labelOffsetY = isNearShaft || n.y < 30 ? 14 : -12;

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={() => handleNodeClick(n)}
                  className="cursor-pointer"
                >
                  {/* Hub Halo for major intersections (Overview mode anchor) */}
                  {isHub && (
                    <circle
                      r="12"
                      fill="none"
                      stroke={isDarkMode ? '#38BDF8' : '#0284C7'}
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                      opacity="0.75"
                    />
                  )}

                  {isHigh && (
                    <circle r="14" fill="none" stroke="#06B6D4" strokeWidth="2">
                      <animate attributeName="r" values="9;18;9" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Junction Node Dot */}
                  <circle
                    r={isHub ? 6.5 : 4.5}
                    fill={isHub ? (isDarkMode ? '#0369A1' : '#E0F2FE') : (isDarkMode ? '#242730' : '#FFFFFF')}
                    stroke={isHub ? (isDarkMode ? '#38BDF8' : '#0284C7') : (isDarkMode ? '#EDEAE4' : '#292722')}
                    strokeWidth={isHub ? 2.2 : 1.5}
                  />

                  {/* Dynamic Junction Label: Anchored below if near a shaft, above otherwise */}
                  {isLabelVisible && (
                    <g transform={`translate(0, ${labelOffsetY})`} className="transition-opacity duration-200">
                      <rect
                        x={isHub ? "-18" : "-12"}
                        y="-7"
                        width={isHub ? "36" : "24"}
                        height="12"
                        rx="3"
                        fill={isHub ? (isDarkMode ? '#0F172A' : '#F0F9FF') : (isDarkMode ? '#1E2026' : '#FFFFFF')}
                        stroke={isHub ? '#0284C7' : (isDarkMode ? '#3E4350' : '#D8D3CA')}
                        strokeWidth={isHub ? '1' : '0.75'}
                      />
                      <text
                        textAnchor="middle"
                        y="2.5"
                        fontSize={isHub ? "6.8" : "6"}
                        fontWeight={isHub ? "700" : "600"}
                        fill={isHub ? (isDarkMode ? '#38BDF8' : '#0369A1') : (isDarkMode ? '#EDEAE4' : '#292722')}
                        fontFamily="Inter, sans-serif"
                      >
                        {isHub && currentLOD.tier === 'OVERVIEW' ? `${n.id} HUB` : n.id}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Surface Exits, Shafts & Refuge Stations - Anti-Collision Floating Portal Pins */}
          <g className="shafts-layer">
            {currentShafts.map((e) => {
              const layout = shaftLayoutMap.get(e.id) || {
                badgeX: e.x,
                badgeY: Math.max(22, e.y - 30),
                plateWidth: 115,
                plateHeight: 32,
                halfW: 57.5,
                halfH: 16,
                cleanLabel: sanitizeLabel(e.label ? e.label.toUpperCase() : e.id),
                isRefuge: e.type === 'refuge',
              };
              const isRefuge = layout.isRefuge;
              const isLabelVisible = visibleLabelIds.has(`label-shaft-${e.id}`);

              return (
                <g key={e.id} className="cursor-pointer">
                  {/* 1. Iconic Ground Portal Collar Node at exact coordinates (e.x, e.y) */}
                  <g transform={`translate(${e.x}, ${e.y})`}>
                    {/* Outer pulsing radar ripple */}
                    <circle
                      r="18"
                      fill={isRefuge ? '#D97706' : '#15803D'}
                      fillOpacity="0.12"
                      stroke={isRefuge ? '#D97706' : '#10B981'}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    >
                      <animate attributeName="r" values="14;24;14" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                    {/* High-visibility Portal Collar Bullseye Ring */}
                    <circle
                      r="9"
                      fill={isRefuge ? '#D97706' : '#15803D'}
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                    {/* Golden Core Beacon */}
                    <circle r="3.5" fill="#FEF08A" />
                  </g>

                  {/* 2. Sleek Connector Leader Pin from badge to underground collar */}
                  {isLabelVisible && (
                    <line
                      x1={layout.badgeX}
                      y1={layout.badgeY + (layout.badgeY < e.y ? layout.halfH : -layout.halfH)}
                      x2={e.x}
                      y2={e.y}
                      stroke={isRefuge ? '#D97706' : '#15803D'}
                      strokeWidth="1.8"
                      strokeDasharray="3 2"
                      opacity="0.8"
                    />
                  )}

                  {/* 3. Google Maps Auto-Sized Portal Plate (Zero text overflow, elevated drop shadow) */}
                  {isLabelVisible && (
                    <g transform={`translate(${layout.badgeX}, ${layout.badgeY})`}>
                      <rect
                        x={-layout.halfW}
                        y={-layout.halfH}
                        width={layout.plateWidth}
                        height={layout.plateHeight}
                        rx="7"
                        fill={isRefuge ? '#B45309' : '#15803D'}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        filter="url(#plateShadow)"
                      />
                      {/* Header Line: Portal Icon + Title */}
                      <text
                        textAnchor="middle"
                        y="-3.5"
                        fontSize="6.5"
                        fontWeight="900"
                        letterSpacing="0.08em"
                        fill="#FFFFFF"
                        fontFamily="Inter, sans-serif"
                      >
                        {isRefuge ? '🛡 LIFE REFUGE' : '▲ MINE ENTRANCE'}
                      </text>
                      {/* Subtitle Line: Full Shaft Name (fits completely inside box) */}
                      <text
                        textAnchor="middle"
                        y="8"
                        fontSize="7"
                        fontWeight="800"
                        letterSpacing="0.02em"
                        fill="#FEF08A"
                        fontFamily="Inter, sans-serif"
                      >
                        {layout.cleanLabel}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Monitoring Stations Layer */}
          {showMonitoringStations && (
            <g className="monitoring-stations-layer">
              {currentMonitoringStations.map((ms) => {
                const targetNode = nodeMap.get(ms.nodeId);
                if (!targetNode) return null;
                const isSelected = inspectedStation?.id === ms.id;
                const isLabelAllowed = visibleLabelIds.has(`label-station-${ms.id}`);

                return (
                  <g
                    key={ms.id}
                    transform={`translate(${targetNode.x - 18}, ${targetNode.y + 14})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectedStation(ms);
                      setInspectedWorker(null);
                      setInspectedTunnel(null);
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x="-10"
                      y="-8"
                      width="20"
                      height="16"
                      rx="3"
                      fill={isSelected ? '#06B6D4' : '#1E293B'}
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                    />
                    <text
                      textAnchor="middle"
                      y="3"
                      fontSize="6"
                      fontWeight="bold"
                      fill="#FFFFFF"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      MS
                    </text>
                    {/* Station name visible in Section and Detailed modes */}
                    {isLabelAllowed && currentLOD.tier !== 'OVERVIEW' && (
                      <text
                        textAnchor="middle"
                        y="15"
                        fontSize="5.5"
                        fontWeight="600"
                        fill={isDarkMode ? '#94A3B8' : '#475569'}
                        fontFamily="Inter, sans-serif"
                      >
                        {ms.id}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Sensors Layer (Tilt, Vibration, Displacement, Crack) */}
          {showSensors && (
            <g className="sensors-layer">
              {sensors.map((s) => {
                const parentNode = nodeMap.get(s.nodeId);
                if (!parentNode) return null;
                const isAlert = s.status === 'CRITICAL' || s.status === 'WARNING';
                // In Overview mode, hide non-alert sensors to keep overview crisp and clean
                if (currentLOD.tier === 'OVERVIEW' && !isAlert) return null;

                const color = getRiskColor(s.status, 'OPEN');
                const num = parseInt(s.id.replace(/[^0-9]/g, '')) || 1;
                const offsetX = (num % 2 === 0 ? 14 : -14);
                const offsetY = (num % 3 === 0 ? 14 : -14);
                const isSelected = selectedSensor?.id === s.id;
                const showSensorTag = visibleLabelIds.has(`label-sensor-${s.id}`) && currentLOD.tier === 'DETAILED';

                return (
                  <g
                    key={s.id}
                    transform={`translate(${parentNode.x + offsetX}, ${parentNode.y + offsetY})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSensor(s);
                    }}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle r="9" fill="none" stroke="#06B6D4" strokeWidth="1.5" />
                    )}
                    <circle r={isAlert ? 5.5 : 4} fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
                    {isAlert && (
                      <circle r="10" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6">
                        <animate attributeName="r" values="6;13;6" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {showSensorTag && (
                      <text
                        textAnchor="middle"
                        y="12"
                        fontSize="5"
                        fontWeight="600"
                        fill={isDarkMode ? '#CBD5E1' : '#334155'}
                        fontFamily="Inter, sans-serif"
                      >
                        {s.id} {s.value != null ? `${s.value}${s.unit || ''}` : ''}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Underground Miners (Personnel Positioning & Live Avatars) - Dedicated Side Slot, Anti-Collision */}
          {showWorkers && (
            <g className="workers-layer">
              {workers.map((w) => {
                const pos = workerPositions.get(w.id);
                if (!pos) return null;

                const isEvac = w.status === 'EVACUATING';
                const isSelected = inspectedWorker?.id === w.id;
                const isLabelVisible = visibleLabelIds.has(`label-worker-${w.id}`) || isSelected;

                return (
                  <g
                    key={w.id}
                    transform={`translate(${pos.wx}, ${pos.wy})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectedWorker(w);
                      setSelectedRouteWorkerId(w.id);
                      setInspectedTunnel(null);
                      setInspectedNode(null);
                      setInspectedStation(null);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Subtle connector link from miner avatar to parent node center */}
                    <line
                      x1="0"
                      y1="0"
                      x2={pos.parentNode.x - pos.wx}
                      y2={pos.parentNode.y - pos.wy}
                      stroke={isSelected ? '#06B6D4' : isDarkMode ? '#475569' : '#94A3B8'}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.4"
                    />

                    {/* Selection ring */}
                    {isSelected && (
                      <circle r="10" fill="none" stroke="#06B6D4" strokeWidth="2" opacity="0.9" />
                    )}
                    {isEvac && (
                      <circle r="9" fill="none" stroke="#C4362E" strokeWidth="1.5">
                        <animate attributeName="r" values="7;14;7" dur="1.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      r="6"
                      fill={isEvac ? '#C4362E' : isSelected ? '#06B6D4' : '#1E293B'}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      textAnchor="middle"
                      y="2.5"
                      fontSize="4.8"
                      fontWeight="bold"
                      fill="#FFFFFF"
                    >
                      ⛏
                    </text>

                    {/* Miner Info Label - LOD Sensitive */}
                    {isLabelVisible && (
                      <g transform="translate(0, 13)">
                        <rect
                          x="-22"
                          y="-5"
                          width="44"
                          height={currentLOD.tier === 'DETAILED' ? "18" : "11"}
                          rx="3"
                          fill={isEvac ? '#991B1B' : isSelected ? '#0891B2' : (isDarkMode ? '#1E293B' : '#FFFFFF')}
                          stroke={isEvac ? '#EF4444' : isSelected ? '#06B6D4' : (isDarkMode ? '#475569' : '#CBD5E1')}
                          strokeWidth="0.75"
                          className="shadow-sm"
                        />
                        <text
                          textAnchor="middle"
                          y="3"
                          fontSize="6"
                          fontWeight="700"
                          fill={isEvac || isSelected ? '#FFFFFF' : (isDarkMode ? '#F1F5F9' : '#0F172A')}
                          fontFamily="Inter, sans-serif"
                        >
                          {currentLOD.tier === 'OVERVIEW' ? `MINER #${w.id.replace(/[^0-9]/g, '') || w.id}` : w.id}
                        </text>
                        {currentLOD.tier === 'DETAILED' && (
                          <text
                            textAnchor="middle"
                            y="10.5"
                            fontSize="4.8"
                            fontWeight="600"
                            fill={isEvac || isSelected ? '#E0F2FE' : (isDarkMode ? '#94A3B8' : '#64748B')}
                            fontFamily="Inter, sans-serif"
                          >
                            {w.role || 'Personnel'}
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Scale & North Compass */}
          <g transform={`translate(40, ${mapHeight - 30})`}>
            <line x1="0" y1="0" x2="60" y2="0" stroke="#6F6A61" strokeWidth="1.5" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#6F6A61" strokeWidth="1.5" />
            <line x1="60" y1="-3" x2="60" y2="3" stroke="#6F6A61" strokeWidth="1.5" />
            <text x="30" y="10" textAnchor="middle" fontSize="8" fill="#6F6A61" fontFamily="Inter, sans-serif">
              {activeMap?.map?.scale?.label || '100m'}
            </text>
          </g>

          <g transform={`translate(${mapWidth - 50}, 40)`}>
            <circle r="12" fill={isDarkMode ? '#242730' : '#FFFFFF'} stroke={isDarkMode ? '#3E4350' : '#D8D3CA'} strokeWidth="1" />
            <polygon points="0,-9 3,0 -3,0" fill="#C4362E" />
            <polygon points="0,9 3,0 -3,0" fill={isDarkMode ? '#9CA3AF' : '#6F6A61'} />
            <text x="0" y="-12" textAnchor="middle" fontSize="7" fontWeight="bold" fill={isDarkMode ? '#EDEAE4' : '#292722'}>
              N
            </text>
          </g>
        </svg>
        </div>

        {/* Floating Bottom-Left HUD Badge */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-mine-surface/90 backdrop-blur-md border border-mine-border shadow-lg text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                currentLOD.tier === 'OVERVIEW'
                  ? 'bg-blue-500'
                  : currentLOD.tier === 'SECTION'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="font-bold text-mine-text-primary uppercase">
              {currentLOD.label}
            </span>
            <span className="text-mine-text-secondary border-l border-mine-border pl-2">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Floating Bottom-Right Google Maps Controls */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-1.5">
          {/* Compass / Orientation */}
          <button
            type="button"
            onClick={handleResetView}
            className="p-2 rounded-lg bg-mine-surface/95 backdrop-blur-md border border-mine-border shadow-lg text-mine-text-primary hover:bg-mine-surface-alt hover:text-cyan-500 transition"
            title="Recenter and align North"
          >
            <Compass className="h-4 w-4 text-cyan-500" />
          </button>

          {/* Zoom control cluster */}
          <div className="flex flex-col rounded-lg bg-mine-surface/95 backdrop-blur-md border border-mine-border shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.8, Number((z + 0.25).toFixed(2))))}
              className="p-2 hover:bg-mine-surface-alt text-mine-text-primary transition border-b border-mine-border"
              title="Zoom In (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="py-1 px-1.5 text-[10px] font-mono font-bold text-mine-text-secondary hover:text-mine-text-primary text-center select-none"
              title="Click to reset to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.25).toFixed(2))))}
              className="p-2 hover:bg-mine-surface-alt text-mine-text-primary transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>

          {/* Reset / Fit to Screen */}
          <button
            type="button"
            onClick={handleResetView}
            className="p-2 rounded-lg bg-mine-surface/95 backdrop-blur-md border border-mine-border shadow-lg text-mine-text-secondary hover:text-mine-text-primary hover:bg-mine-surface-alt transition"
            title="Fit to Screen"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Floating Tunnel Inspector */}
        {inspectedTunnel && (
          <div className="absolute top-12 left-4 w-72 card p-3.5 bg-mine-surface border border-mine-border shadow-dropdown z-20 space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-mine-border pb-1.5">
              <span className="font-bold text-mine-text-primary uppercase tracking-wider">
                {inspectedTunnel.id} — {inspectedTunnel.label}
              </span>
              <button onClick={() => setInspectedTunnel(null)} className="text-mine-text-secondary hover:text-mine-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 text-mine-text-secondary">
              <div className="flex justify-between">
                <span>Sector:</span>
                <strong className="text-mine-text-primary font-semibold">Zone {inspectedTunnel.zone || 'Main'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Length:</span>
                <strong className="text-mine-text-primary font-mono">{inspectedTunnel.length} meters</strong>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <strong className={inspectedTunnel.status === 'COLLAPSED' ? 'text-status-critical font-bold' : 'text-status-safe font-semibold'}>
                  {inspectedTunnel.status}
                </strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                toggleTunnelBlock(inspectedTunnel.id);
                setInspectedTunnel((prev) => ({
                  ...prev,
                  status: prev.status === 'COLLAPSED' ? 'OPEN' : 'COLLAPSED',
                }));
              }}
              className={`w-full py-1.5 px-3 rounded text-xs font-semibold transition ${
                inspectedTunnel.status === 'COLLAPSED'
                  ? 'bg-status-safe text-white hover:opacity-90'
                  : 'bg-status-critical text-white hover:opacity-90'
              }`}
            >
              {inspectedTunnel.status === 'COLLAPSED' ? 'Reopen Tunnel' : 'Simulate Tunnel Blockage'}
            </button>
          </div>
        )}

        {/* Floating Monitoring Station Panel */}
        {inspectedStation && (
          <div className="absolute top-12 right-4 w-72 card p-4 bg-mine-surface border border-mine-border shadow-dropdown z-20 space-y-2.5 text-xs">
            <div className="flex justify-between items-center border-b border-mine-border pb-2">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-status-safe" />
                <span className="font-bold text-mine-text-primary uppercase tracking-wider">
                  {inspectedStation.name || inspectedStation.id}
                </span>
              </div>
              <button onClick={() => setInspectedStation(null)} className="text-mine-text-secondary hover:text-mine-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1 text-mine-text-secondary">
              <div className="flex justify-between">
                <span>Connected Node:</span>
                <strong className="text-mine-text-primary font-semibold">{inspectedStation.nodeId}</strong>
              </div>
              <div className="flex justify-between">
                <span>Risk Level:</span>
                <strong className="text-status-safe font-semibold">{inspectedStation.risk || 'LOW'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span className="font-mono text-[11px] text-mine-text-secondary">{inspectedStation.lastUpdate || 'Just now'}</span>
              </div>
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

        {/* Floating Miner Detail Popup */}
        {inspectedWorker && (
          <MinerDetailPopup
            worker={workers.find((w) => w.id === inspectedWorker.id) || inspectedWorker}
            route={workerRoutes[inspectedWorker.id] || activeRoute}
            onClose={() => setInspectedWorker(null)}
            onHighlightRoute={(workerId) => setSelectedRouteWorkerId(workerId)}
            onRemoveWorker={(workerId) => {
              removeMiner(workerId);
              setInspectedWorker(null);
            }}
          />
        )}
      </div>

      {/* Engineering Disclaimer Bar at bottom */}
      <div className="px-4 py-1.5 border-t border-mine-border bg-mine-surface-alt/70 text-[10px] text-mine-text-secondary flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-mine-text-primary">Protocad GIS:</strong> Map geometry and automated feature extraction are for monitoring/prototype purposes and must be verified against approved mine plans before operational use.
        </span>
        <span className="font-mono text-[10px] text-mine-text-secondary">
          DGMS Ref #44A • {workers.length} Personnel Active • {sensors.length} Strata Nodes
        </span>
      </div>
    </div>
  );
}
