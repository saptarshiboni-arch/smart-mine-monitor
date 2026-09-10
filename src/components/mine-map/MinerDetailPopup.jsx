// MINEGUARD AI — Draggable Interactive Miner Details Panel & HUD
// Dark tactical/industrial mine interface matching the underground map theme.
// Displays:
// - Miner Name, ID, Photo/Avatar, Role/Designation
// - Current Location (Section, tunnel, coordinates)
// - Operational Status (ACTIVE / SAFE / INACTIVE / EMERGENCY) with glowing badge
// - Shift & Current Activity
// - Emergency Contact & Dispatch Link
// - Tracking Device Battery Level, Biometric Oxygen Level, Heart Rate, Body Temperature
// - Underground Positioning System (UPS / UWB Dead-Reckoning) tracking status & Seam Depth
// - Shortest Safe Evacuation Route waypoint corridor & 1-click Map Highlight
// - Draggable anywhere across viewport, close button, outside click detection

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HardHat,
  X,
  Heart,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Radio,
  Navigation2,
  ArrowRight,
  AlertTriangle,
  GripHorizontal,
  Compass,
  Wind,
  Thermometer,
  Clock,
  PhoneCall,
  Briefcase,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';

const BG_THEMES = [
  {
    id: 'tactical-slate',
    name: 'Tactical Slate',
    gradient: 'linear-gradient(180deg, #0b111e 0%, #060a12 100%)',
    border: 'rgba(56, 189, 248, 0.35)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 25px rgba(56, 189, 248, 0.2)',
    accent: '#38bdf8',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
  },
  {
    id: 'obsidian-coal',
    name: 'Obsidian Coal',
    gradient: 'linear-gradient(180deg, #14161b 0%, #0a0b0e 100%)',
    border: 'rgba(245, 158, 11, 0.35)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(245, 158, 11, 0.18)',
    accent: '#f59e0b',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
  },
  {
    id: 'command-cyber',
    name: 'Command Cyber',
    gradient: 'linear-gradient(180deg, #051417 0%, #020b0d 100%)',
    border: 'rgba(16, 185, 129, 0.35)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(16, 185, 129, 0.18)',
    accent: '#10b981',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
  },
];

/**
 * @param {{
 *   worker: object,
 *   route: object|null,
 *   anchorPosition?: { x: number, y: number }|null,
 *   onClose: function,
 *   onHighlightRoute: function
 * }} props
 */
export default function MinerDetailPopup({ worker, route, anchorPosition, onClose, onHighlightRoute }) {
  if (!worker) return null;

  const [bgThemeId, setBgThemeId] = useState('tactical-slate');
  const currentTheme = BG_THEMES.find((t) => t.id === bgThemeId) || BG_THEMES[0];
  const popupRef = useRef(null);

  // Position calculation: spawn near clicked miner if anchorPosition given, else default top-right
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const popupWidth = 350;
      const popupHeight = 560;

      if (anchorPosition && typeof anchorPosition.x === 'number' && typeof anchorPosition.y === 'number') {
        let spawnX = anchorPosition.x + 24;
        let spawnY = anchorPosition.y - 120;

        // If overflowing right edge, place to the left of the miner
        if (spawnX + popupWidth > window.innerWidth - 16) {
          spawnX = Math.max(16, anchorPosition.x - popupWidth - 24);
        }
        // Clamp Y to viewport
        spawnY = Math.max(70, Math.min(spawnY, window.innerHeight - popupHeight - 20));

        return { x: spawnX, y: spawnY };
      }

      const defaultX = Math.max(16, window.innerWidth - 370);
      return { x: defaultX, y: 75 };
    }
    return { x: 700, y: 75 };
  });

  // Clamp position to visible viewport when worker changes or screen resizes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const popupWidth = 350;
      const popupHeight = 560;

      if (anchorPosition && typeof anchorPosition.x === 'number' && typeof anchorPosition.y === 'number') {
        let spawnX = anchorPosition.x + 24;
        let spawnY = anchorPosition.y - 120;

        if (spawnX + popupWidth > window.innerWidth - 16) {
          spawnX = Math.max(16, anchorPosition.x - popupWidth - 24);
        }
        spawnY = Math.max(70, Math.min(spawnY, window.innerHeight - popupHeight - 20));

        setPosition({ x: spawnX, y: spawnY });
        return;
      }

      const maxX = Math.max(16, window.innerWidth - popupWidth - 16);
      const maxY = Math.max(16, window.innerHeight - popupHeight - 20);
      setPosition((prev) => ({
        x: Math.min(Math.max(16, prev.x), maxX),
        y: Math.min(Math.max(70, prev.y), maxY),
      }));
    }
  }, [worker?.id, anchorPosition]);

  // Click outside listener to dismiss
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        // Only trigger close if not clicking a miner avatar inside the SVG map
        if (e.target.closest && e.target.closest('.workers-layer')) return;
        onClose?.();
      }
    };
    // Close on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }, 150);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Dragging logic
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;

    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e) => {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      const popupWidth = 350;
      const maxX = Math.max(20, window.innerWidth - popupWidth - 10);
      const maxY = Math.max(20, window.innerHeight - 100);

      const newX = Math.min(Math.max(10, dragStartRef.current.initialX + deltaX), maxX);
      const newY = Math.min(Math.max(50, dragStartRef.current.initialY + deltaY), maxY);

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  // Telemetry & Status Parsing with robust sample fallbacks
  const rawStatus = (worker.status || 'SAFE').toUpperCase();
  const isEvac = rawStatus === 'EVACUATING' || rawStatus === 'EMERGENCY' || rawStatus === 'CRITICAL';
  const displayStatus = isEvac ? 'EMERGENCY' : rawStatus === 'ACTIVE' ? 'ACTIVE' : rawStatus === 'INACTIVE' ? 'INACTIVE' : 'SAFE';

  const statusConfig = {
    SAFE: { label: 'SAFE', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 border shadow-emerald-500/10' },
    ACTIVE: { label: 'ACTIVE', cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 border shadow-cyan-500/10' },
    INACTIVE: { label: 'INACTIVE', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/40 border shadow-slate-500/10' },
    EMERGENCY: { label: 'EMERGENCY', cls: 'bg-red-500/25 text-red-400 border-red-500/50 border animate-pulse shadow-red-500/20' },
  };
  const safetyCfg = statusConfig[displayStatus] || statusConfig['SAFE'];

  const tagBattery = worker.tagBattery ?? (worker.battery ?? 88);
  const BatteryIcon = tagBattery > 50 ? BatteryFull : tagBattery > 20 ? BatteryMedium : BatteryLow;
  const batteryColor = tagBattery > 50 ? 'text-emerald-400' : tagBattery > 20 ? 'text-amber-400' : 'text-red-400';

  const heartRate = worker.heartRate || 76;
  const heartColor =
    heartRate < 50 || heartRate > 115
      ? 'text-red-400'
      : heartRate >= 50 && heartRate < 60
      ? 'text-amber-400'
      : 'text-emerald-400';

  const oxygenLevel = worker.oxygenLevel ?? 96;
  const temperature = worker.temperature ? `${worker.temperature}°C` : '36.8°C';
  const shift = worker.shift || 'Morning (06:00 - 14:00)';
  const activity = worker.activity || 'Active Geological Survey & Heading Work';
  const emergencyContact = worker.emergencyContact || '+91 98301 44521 (DGMS Safety)';
  const lastUpdated = worker.lastUpdated || '13:24:18';
  const locationText = worker.locationText || `Sector Zone-${worker.zone || 'Main'} • Node ${worker.nodeId || 'J-01'}`;

  // Avatar initials
  const initials = (worker.name || 'MN')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Evacuation routing
  const routeNodes = route?.routeNodes || [];
  const exitId = route?.exitId || 'Shaft #1 (Surface Exit)';
  const totalDist = route?.totalDistance ? `${route.totalDistance}m` : '— m';
  const estTime = route?.estimatedTime || '—';
  const displayNodes =
    routeNodes.length > 3
      ? [...routeNodes.slice(0, 1), '...', ...routeNodes.slice(-2)]
      : routeNodes;

  const popupElement = (
    <div
      ref={popupRef}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`fixed z-[100] w-[345px] sm:w-[355px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden backdrop-blur-xl select-none transition-shadow ${
        isDragging ? 'shadow-2xl ring-2 ring-cyan-400/50 cursor-grabbing' : 'shadow-2xl'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        background: currentTheme.gradient,
        border: `1px solid ${currentTheme.border}`,
        boxShadow: currentTheme.boxShadow,
      }}
    >
      {/* ── Top Drag Grip Bar ─────────────────────────────────────────── */}
      <div
        onPointerDown={handlePointerDown}
        className="w-full py-1.5 px-3.5 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition"
        title="Click and drag anywhere to reposition panel"
      >
        <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider text-cyan-400 uppercase font-bold">
          <GripHorizontal className="h-3 w-3" />
          <span>MINER TELEMETRY HUD</span>
        </div>

        {/* Theme Pill Picker */}
        <div className="flex items-center gap-1.5" title="Switch tactical color palette">
          {BG_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBgThemeId(t.id);
              }}
              className={`w-3 h-3 rounded-full border transition ${
                bgThemeId === t.id
                  ? 'scale-125 ring-2 ring-white/60 border-white'
                  : 'border-white/20 opacity-50 hover:opacity-100'
              }`}
              style={{ backgroundColor: t.accent }}
            />
          ))}
        </div>
      </div>

      {/* ── Miner Header & Identity ───────────────────────────────────── */}
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center gap-3 px-4 pt-3 pb-3 border-b border-white/10 cursor-grab active:cursor-grabbing"
      >
        {/* Photo / Avatar with online ping */}
        <div className="relative flex-shrink-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs text-amber-300 shadow-inner tracking-wider"
            style={{
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.35) 0%, rgba(180, 83, 9, 0.15) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.45)',
            }}
          >
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </span>
        </div>

        {/* Name, ID, Designation */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-wide truncate">{worker.name}</span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 border border-white/15 flex-shrink-0">
              {worker.id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5 truncate font-medium">
            <Briefcase className="h-3 w-3 text-amber-400 flex-shrink-0" />
            <span className="truncate">{worker.role || 'Underground Personnel'}</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          title="Close details (or tap outside)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable Body Area ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 text-xs">
        {/* Status + Last Updated Bar */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-xl"
          style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
        >
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] text-gray-300 font-medium">Status:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${safetyCfg.cls}`}>
              {safetyCfg.label}
            </span>
            <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {lastUpdated}
            </span>
          </div>
        </div>

        {/* Current Location & Tunnel Info */}
        <div
          className="p-2.5 rounded-xl space-y-1"
          style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-amber-400" />
              Current Location
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30">
              {worker.nodeId || 'J-01'}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-white pl-4 truncate">{locationText}</div>
        </div>

        {/* ── 4-Quadrant Vital Telemetry Grid ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          {/* Heart Rate */}
          <div
            className="rounded-xl p-2.5"
            style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
          >
            <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Heart className={`h-3 w-3 ${heartColor}`} />
                Heart Rate
              </span>
              <span className="text-[9px] text-gray-400">BPM</span>
            </div>
            <div className={`text-lg font-bold font-mono tracking-tight ${heartColor}`}>{heartRate}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">Range: 60–100</div>
          </div>

          {/* Battery Level */}
          <div
            className="rounded-xl p-2.5"
            style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
          >
            <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <BatteryIcon className={`h-3 w-3 ${batteryColor}`} />
                Smart Battery
              </span>
              <span className="text-[9px] text-gray-400">Li-Ion</span>
            </div>
            <div className={`text-lg font-bold font-mono tracking-tight ${batteryColor}`}>{tagBattery}%</div>
            <div className="text-[9px] text-gray-400 mt-0.5">Est. ~42 hrs</div>
          </div>

          {/* Oxygen Level (SpO2) */}
          <div
            className="rounded-xl p-2.5"
            style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
          >
            <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Wind className="h-3 w-3 text-cyan-400" />
                Oxygen (SpO2)
              </span>
              <span className="text-[9px] text-gray-400">O2</span>
            </div>
            <div className="text-lg font-bold font-mono tracking-tight text-cyan-300">{oxygenLevel}%</div>
            <div className="text-[9px] text-gray-400 mt-0.5">Safe: &ge; 90%</div>
          </div>

          {/* Body Temperature */}
          <div
            className="rounded-xl p-2.5"
            style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
          >
            <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Thermometer className="h-3 w-3 text-orange-400" />
                Body Temp
              </span>
              <span className="text-[9px] text-gray-400">Core</span>
            </div>
            <div className="text-lg font-bold font-mono tracking-tight text-orange-300">{temperature}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">Norm: 36.5–37.5</div>
          </div>
        </div>

        {/* Shift & Current Activity */}
        <div
          className="p-2.5 rounded-xl space-y-1.5"
          style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
        >
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 uppercase tracking-wider font-bold">Shift:</span>
            <span className="text-gray-200 font-semibold">{shift}</span>
          </div>
          <div className="flex items-start justify-between text-[10px] gap-2 pt-0.5 border-t border-white/5">
            <span className="text-gray-400 uppercase tracking-wider font-bold flex-shrink-0">Activity:</span>
            <span className="text-white text-right font-medium">{activity}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-white/5">
            <span className="text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
              <PhoneCall className="h-2.5 w-2.5 text-emerald-400" />
              Emergency Line:
            </span>
            <span className="text-cyan-300 font-mono font-bold">{emergencyContact}</span>
          </div>
        </div>

        {/* Underground Positioning System (UPS / Dead-Reckoning) */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-cyan-400 animate-pulse" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                UPS Tracking (UWB &bull; No GPS)
              </span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 font-semibold">SIGNAL LOCK</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { label: 'X COORD', val: `${worker.xCoord ?? '—'} m` },
              { label: 'Y COORD', val: `${worker.yCoord ?? '—'} m` },
              { label: 'SEAM DEPTH', val: `${worker.seamDepth ?? '—'} m` },
            ].map((c) => (
              <div key={c.label} className="rounded-lg bg-black/40 px-2 py-1 border border-white/5 text-center">
                <div className="text-[8px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">{c.label}</div>
                <div className="text-[11px] font-mono font-bold text-white">{c.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Shortest Safe Evacuation Route */}
        <div
          className="rounded-xl p-2.5 space-y-1.5"
          style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Navigation2 className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-bold text-gray-200 uppercase tracking-wide">
                Shortest Safe Evacuation Route
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 font-bold">{exitId}</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-300">
            <span>
              Distance: <strong className="text-white font-mono">{totalDist}</strong>
            </span>
            <span>
              Walk Time: <strong className="text-white font-mono">~{estTime}</strong>
            </span>
          </div>

          {routeNodes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {displayNodes.map((node, i) => (
                <React.Fragment key={i}>
                  {node === '...' ? (
                    <span className="text-gray-500 text-xs">···</span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-200 border border-white/10">
                      {node}
                    </span>
                  )}
                  {i < displayNodes.length - 1 && <ArrowRight className="h-2 w-2 text-gray-500 flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Calculating real-time escape corridor...
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Action Controls ─────────────────────────────────────── */}
      <div className="p-3 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
        <button
          type="button"
          onClick={() => onHighlightRoute && onHighlightRoute(worker.id)}
          disabled={routeNodes.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition shadow-lg
                     bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Compass className="h-3.5 w-3.5" />
          <span>Highlight Route on Map</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-gray-300 transition"
        >
          Close
        </button>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(popupElement, document.body);
  }
  return popupElement;
}
