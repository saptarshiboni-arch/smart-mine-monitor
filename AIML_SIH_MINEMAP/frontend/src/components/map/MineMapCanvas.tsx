import React, { useState, useRef, useMemo } from 'react';
import {
  MineMap,
  RouteResult,
  RiskLevel
} from '../../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Radio,
  Clock,
  Compass
} from 'lucide-react';

interface MineMapCanvasProps {
  mineMap: MineMap;
  selectedElement: { type: string; id: string } | null;
  onSelectElement: (element: { type: string; id: string } | null) => void;
  activeRoutes?: RouteResult[];
  isEditMode?: boolean;
  onUpdateElementPosition?: (type: string, id: string, x: number, y: number) => void;
}

export const MineMapCanvas: React.FC<MineMapCanvasProps> = ({
  mineMap,
  selectedElement,
  onSelectElement,
  activeRoutes = [],
  isEditMode = false,
  onUpdateElementPosition
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 15 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<{ type: string; id: string } | null>(null);

  // Theme: 'cad' (Clean Engineering Schematic / Image 2 style) vs 'royale' (Gold & Royale Dark)
  const [schematicTheme, setSchematicTheme] = useState<'cad' | 'royale'>('cad');
  const [showBlueprint, setShowBlueprint] = useState<boolean>(false);
  const [blueprintOpacity, setBlueprintOpacity] = useState<number>(0.2);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [selectedMinerFilter, setSelectedMinerFilter] = useState<string>('ALL');

  const isCad = schematicTheme === 'cad';

  // Node coordinate lookup map
  const nodeCoords = useMemo(() => {
    const coords: Record<string, { x: number; y: number; name: string; type: string }> = {};

    (mineMap.blocks || []).forEach(b => {
      coords[b.id] = {
        x: b.coordinates?.x ?? (b as any).x ?? 0,
        y: b.coordinates?.y ?? (b as any).y ?? 0,
        name: b.name,
        type: 'BLOCK'
      };
    });

    (mineMap.junctions || []).forEach(j => {
      coords[j.id] = {
        x: j.coordinates?.x ?? (j as any).x ?? 0,
        y: j.coordinates?.y ?? (j as any).y ?? 0,
        name: j.name,
        type: 'JUNCTION'
      };
    });

    (mineMap.exits || []).forEach(e => {
      coords[e.id] = {
        x: e.coordinates?.x ?? (e as any).x ?? 0,
        y: e.coordinates?.y ?? (e as any).y ?? 0,
        name: e.name,
        type: 'EXIT'
      };
    });

    (mineMap.refuges || []).forEach(r => {
      coords[r.id] = {
        x: r.coordinates?.x ?? (r as any).x ?? 0,
        y: r.coordinates?.y ?? (r as any).y ?? 0,
        name: r.name,
        type: 'REFUGE'
      };
    });

    return coords;
  }, [mineMap]);

  // Section Headers for multi-section decline layout
  const sectionHeaders = [
    { name: 'SECTION A', x: 180, y: 105 },
    { name: 'SECTION B', x: 390, y: 105 },
    { name: 'SECTION C', x: 670, y: 105 },
    { name: 'SECTION D', x: 880, y: 105 }
  ];

  // Color helper based on risk
  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return '#ef4444';
      case 'WARNING':
        return '#f59e0b';
      case 'BLOCKED':
        return '#dc2626';
      case 'NORMAL':
      default:
        return '#10b981';
    }
  };

  // Miner route palette
  const routeColors = isCad
    ? ['#10b981', '#059669', '#0d9488', '#2563eb', '#d97706']
    : ['#ffd700', '#f59e0b', '#38bdf8', '#f43f5e', '#10b981'];

  // Handle Canvas Pan & Zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggingNode) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggingNode && onUpdateElementPosition) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const svgX = (e.clientX - rect.left - pan.x) / zoom;
        const svgY = (e.clientY - rect.top - pan.y) / zoom;
        onUpdateElementPosition(draggingNode.type, draggingNode.id, Math.round(svgX), Math.round(svgY));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingNode(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.4), 3.0));
  };

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 30, y: 15 });
  };

  return (
    <div className={`relative w-full h-[620px] rounded-2xl overflow-hidden select-none transition-colors duration-300 ${
      isCad
        ? 'bg-[#f8f8f6] border border-slate-300 shadow-[0_8px_30px_rgba(0,0,0,0.08)]'
        : 'bg-[#07060b] border border-[rgba(212,175,55,0.35)] shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(212,175,55,0.1)]'
    }`}>
      {/* Floating Controls Bar */}
      <div className={`absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg text-xs transition-all ${
        isCad
          ? 'bg-white/95 border border-slate-200 text-slate-700'
          : 'bg-[#141022]/90 border border-[rgba(212,175,55,0.3)] text-amber-200'
      }`}>
        <button
          onClick={() => setZoom(z => Math.min(z * 1.2, 3))}
          className={`p-1.5 rounded-lg transition ${isCad ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#251e3a] text-amber-200'}`}
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z * 0.8, 0.4))}
          className={`p-1.5 rounded-lg transition ${isCad ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#251e3a] text-amber-200'}`}
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={resetView}
          className={`p-1.5 rounded-lg transition ${isCad ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#251e3a] text-amber-200'}`}
          title="Reset View"
        >
          <Maximize2 size={15} />
        </button>
        <div className={`h-4 w-px mx-1 ${isCad ? 'bg-slate-200' : 'bg-[rgba(212,175,55,0.25)]'}`} />

        {/* Theme Mode Switcher: CAD Schematic vs Royale Dark */}
        <button
          onClick={() => setSchematicTheme(isCad ? 'royale' : 'cad')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition shadow-sm ${
            isCad
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
          }`}
          title="Toggle between Clean Engineering CAD (Image 2) and Royale Dark"
        >
          <Compass size={14} />
          <span>{isCad ? '📋 CAD Gallery (Active)' : '👑 Royale Dark (Active)'}</span>
        </button>

        <div className={`h-4 w-px mx-1 ${isCad ? 'bg-slate-200' : 'bg-[rgba(212,175,55,0.25)]'}`} />

        {/* Blueprint overlay toggle */}
        {mineMap.blueprint_url && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowBlueprint(!showBlueprint)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition font-medium ${
                showBlueprint
                  ? (isCad ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40')
                  : (isCad ? 'text-slate-500 hover:bg-slate-100' : 'text-amber-200/60 hover:bg-[#251e3a]')
              }`}
            >
              <Layers size={13} />
              <span>Blueprint</span>
            </button>
            {showBlueprint && (
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={blueprintOpacity}
                onChange={e => setBlueprintOpacity(parseFloat(e.target.value))}
                className="w-14 accent-emerald-600 cursor-pointer h-1"
                title="Blueprint Opacity"
              />
            )}
          </div>
        )}

        {/* Route Selector Filter */}
        {activeRoutes.length > 0 && (
          <>
            <div className={`h-4 w-px mx-1 ${isCad ? 'bg-slate-200' : 'bg-[rgba(212,175,55,0.25)]'}`} />
            <span className={isCad ? 'text-slate-500 font-medium' : 'text-amber-300/80 font-medium'}>Evac:</span>
            <select
              value={selectedMinerFilter}
              onChange={e => setSelectedMinerFilter(e.target.value)}
              className={`rounded-lg px-2 py-0.5 text-xs focus:outline-none ${
                isCad
                  ? 'bg-slate-50 text-slate-800 border border-slate-300'
                  : 'bg-[#1c172d] text-amber-300 border border-[rgba(212,175,55,0.35)]'
              }`}
            >
              <option value="ALL">All Evacuation Routes ({activeRoutes.length})</option>
              {activeRoutes.map(r => (
                <option key={r.miner_id} value={r.miner_id}>
                  {r.miner_id} ({r.status || 'Active'})
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Scale Bar (Bottom Left) - Matching Image 2 */}
      <div className={`absolute bottom-4 left-4 z-20 flex flex-col gap-1 px-3 py-2 rounded-xl backdrop-blur-md shadow-md text-xs select-none ${
        isCad ? 'bg-white/95 border border-slate-200 text-slate-600' : 'bg-[#120f20]/95 border border-[rgba(212,175,55,0.3)] text-amber-200'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
          <span>0m</span>
          <span>50m</span>
          <span>100m</span>
        </div>
        <div className="flex items-center">
          <div className={`h-2.5 w-0.5 ${isCad ? 'bg-slate-700' : 'bg-amber-400'}`} />
          <div className={`h-1 w-24 ${isCad ? 'bg-slate-700' : 'bg-amber-400'}`} />
          <div className={`h-2.5 w-0.5 ${isCad ? 'bg-slate-700' : 'bg-amber-400'}`} />
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Warning
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Hazard
          </span>
        </div>
      </div>

      {/* Route Calculated Timestamp Status (Bottom Right) - Matching Image 2 */}
      <div className={`absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-md text-xs select-none ${
        isCad ? 'bg-white/95 border border-slate-200 text-slate-700' : 'bg-[#120f20]/95 border border-[rgba(212,175,55,0.3)] text-amber-200'
      }`}>
        <Clock size={13} className={isCad ? 'text-emerald-600' : 'text-amber-400'} />
        <span className="font-medium">
          Route calculated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {activeRoutes.length > 0 && (
          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
            ACTIVE
          </span>
        )}
      </div>

      {/* Main Interactive SVG Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
          className="w-full h-full"
          onClick={() => onSelectElement(null)}
        >
          <defs>
            {/* Subtle Engineering Grid */}
            <pattern id="cad-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isCad ? 'rgba(0, 0, 0, 0.04)' : 'rgba(212, 175, 55, 0.08)'} strokeWidth="1" />
            </pattern>

            {/* Glowing Golden Route Filter */}
            <filter id="glow-route" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Transform group for Pan and Zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Grid Pattern */}
            {showGrid && (
              <rect
                x="-1500"
                y="-1500"
                width="4000"
                height="4000"
                fill="url(#cad-grid)"
              />
            )}

            {/* Blueprint Overlay Image */}
            {showBlueprint && mineMap.blueprint_url && (
              <image
                href={mineMap.blueprint_url}
                x="0"
                y="0"
                width={mineMap.dimensions?.width || 1200}
                height={mineMap.dimensions?.height || 800}
                opacity={blueprintOpacity}
                preserveAspectRatio="none"
                className="pointer-events-none"
              />
            )}

            {/* 1. Section Header Titles (Only for Section 29 benchmark map) */}
            {!mineMap.blueprint_url && mineMap.mine_id === 'MINE_001' && sectionHeaders.map(sec => (
              <text
                key={sec.name}
                x={sec.x}
                y={sec.y}
                fill={isCad ? '#64748b' : '#d4af37'}
                fontSize="12"
                fontWeight="700"
                letterSpacing="1.5"
                className="font-sans select-none tracking-widest"
              >
                {sec.name}
              </text>
            ))}

            {/* 2. Tunnels / Conduit Gallery Network (Double-Line Hollow Conduits - Exact Image 2 Look) */}
            {mineMap.tunnels.map(tunnel => {
              const from = nodeCoords[tunnel.from_node];
              const to = nodeCoords[tunnel.to_node];
              if (!from || !to) return null;

              const isSelected = selectedElement?.type === 'TUNNEL' && selectedElement.id === tunnel.id;
              const isBlocked = tunnel.is_blocked || tunnel.risk_level === 'BLOCKED';

              // Outer casing color & inner hollow color
              const casingColor = isBlocked
                ? '#ef4444'
                : isSelected
                ? (isCad ? '#0284c7' : '#ffd700')
                : (isCad ? '#cbd5e1' : 'rgba(212, 175, 55, 0.45)');

              const innerColor = isBlocked
                ? '#fee2e2'
                : (isCad ? '#ffffff' : '#0c0a18');

              const hasPolyline = tunnel.polyline && tunnel.polyline.length > 1;
              const pointsStr = hasPolyline ? tunnel.polyline!.map(p => `${p[0]},${p[1]}`).join(' ') : '';

              return (
                <g
                  key={tunnel.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement({ type: 'TUNNEL', id: tunnel.id });
                  }}
                >
                  {hasPolyline ? (
                    <>
                      {/* Outer tunnel conduit casing along exact polyline */}
                      <polyline
                        points={pointsStr}
                        fill="none"
                        stroke={casingColor}
                        strokeWidth={isBlocked ? 12 : 11}
                        strokeDasharray={isBlocked ? '6 4' : undefined}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all"
                      />
                      {/* Inner hollow pipe along exact polyline */}
                      <polyline
                        points={pointsStr}
                        fill="none"
                        stroke={innerColor}
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : (
                    <>
                      {/* Outer tunnel conduit casing */}
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={casingColor}
                        strokeWidth={isBlocked ? 12 : 11}
                        strokeDasharray={isBlocked ? '6 4' : undefined}
                        strokeLinecap="round"
                        className="transition-all"
                      />
                      {/* Inner hollow pipe */}
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={innerColor}
                        strokeWidth={6}
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* 3. Evacuation Routes Overlay Layer with Floating "[EVACUATION ROUTE]" Badge (Matching Image 2) */}
            {activeRoutes.map((route, idx) => {
              if (selectedMinerFilter !== 'ALL' && route.miner_id !== selectedMinerFilter) {
                return null;
              }

              const pathPoints: { x: number; y: number }[] = [];
              if (route.path_polyline && route.path_polyline.length > 1) {
                route.path_polyline.forEach(p => {
                  pathPoints.push({ x: p[0], y: p[1] });
                });
              } else {
                for (const nodeId of route.path) {
                  const coord = nodeCoords[nodeId];
                  if (coord) {
                    pathPoints.push({ x: coord.x, y: coord.y });
                  }
                }
              }

              if (pathPoints.length < 2) return null;

              // Generate SVG path string
              const pathD = pathPoints.reduce((acc, pt, i) => {
                return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
              }, '');

              // Midpoint for the "EVACUATION ROUTE" floating banner badge
              const midSegmentIdx = Math.floor(pathPoints.length / 2);
              const bannerPt = pathPoints[midSegmentIdx] || pathPoints[0];

              return (
                <g key={`route-${route.miner_id}-${idx}`} filter="url(#glow-route)">
                  {/* Outer glow aura */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isCad ? '#10b981' : '#ffd700'}
                    strokeWidth="8"
                    strokeOpacity="0.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Animated Dashed Green Route Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isCad ? '#10b981' : '#ffd700'}
                    strokeWidth="4"
                    strokeDasharray="8 5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-route-flow-gold"
                  />

                  {/* Floating "[ EVACUATION ROUTE ]" Pill Banner (Exactly like Image 2) */}
                  <g transform={`translate(${bannerPt.x + 12}, ${bannerPt.y - 12})`}>
                    <rect
                      width="104"
                      height="20"
                      rx="4"
                      fill="#10b981"
                      className="shadow-sm"
                    />
                    <text
                      x="52"
                      y="14"
                      fill="#ffffff"
                      fontSize="8.5"
                      fontWeight="800"
                      letterSpacing="0.8"
                      textAnchor="middle"
                      className="font-sans select-none"
                    >
                      EVACUATION ROUTE
                    </text>
                  </g>
                </g>
              );
            })}

            {/* 4. Waypoint Nodes Layer (Blocks & Stopes rendered as sleek circular nodes) */}
            {mineMap.blocks.map(block => {
              const isSelected = selectedElement?.type === 'BLOCK' && selectedElement.id === block.id;
              const nodeColor = getRiskColor(block.risk_level);
              // Clean concise label: e.g. "Panel A" instead of long 35-char description
              const displayName = block.id ? block.id.replace('BLOCK_', 'Panel ') : (block.name || block.id);

              return (
                <g
                  key={block.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement({ type: 'BLOCK', id: block.id });
                  }}
                >
                  {/* Critical Hazard Halo Pulse Ring */}
                  {block.risk_level === 'CRITICAL' && (
                    <circle
                      cx={block.coordinates.x}
                      cy={block.coordinates.y}
                      r="16"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      className="animate-pulse"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={block.coordinates.x}
                    cy={block.coordinates.y}
                    r={isSelected ? 8.5 : 6.5}
                    fill={nodeColor}
                    stroke={isCad ? '#ffffff' : (isSelected ? '#ffd700' : '#141022')}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    className="transition-all"
                  />

                  {/* Alphanumeric Code Label (e.g. Panel A, Panel B) */}
                  <text
                    x={block.coordinates.x}
                    y={block.coordinates.y - 11}
                    fill={isCad ? '#1e293b' : '#fef08a'}
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                    className="font-mono select-none drop-shadow-sm"
                  >
                    {displayName}
                  </text>
                </g>
              );
            })}

            {/* 5. Main Spine Junction Nodes */}
            {mineMap.junctions.map(junction => {
              const isSelected = selectedElement?.type === 'JUNCTION' && selectedElement.id === junction.id;

              return (
                <g
                  key={junction.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement({ type: 'JUNCTION', id: junction.id });
                  }}
                >
                  <circle
                    cx={junction.coordinates.x}
                    cy={junction.coordinates.y}
                    r={isSelected ? 6.5 : 3.5}
                    fill="#10b981"
                    stroke={isCad ? '#ffffff' : '#120e22'}
                    strokeWidth="1.2"
                    className="transition-all hover:scale-150"
                  />
                  {/* Display junction code only when zoomed in (>= 1.5) or selected to avoid label collision */}
                  {(zoom >= 1.5 || isSelected) && (
                    <text
                      x={junction.coordinates.x}
                      y={junction.coordinates.y - 7}
                      fill={isCad ? '#334155' : '#fef08a'}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      className="font-mono select-none pointer-events-none"
                    >
                      {junction.id.replace('JUNCTION_', 'J-')}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 6. Portals Layer: Entrance (Left), Secondary Exit (Right), Emergency Exits (Bottom) */}
            {mineMap.exits.map(exit => {
              const isSelected = selectedElement?.type === 'EXIT' && selectedElement.id === exit.id;
              const isPrimary = exit.id === 'EXIT_01' || exit.name.toLowerCase().includes('entrance');
              const isSecondary = exit.id === 'EXIT_02' || exit.name.toLowerCase().includes('secondary');

              return (
                <g
                  key={exit.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement({ type: 'EXIT', id: exit.id });
                  }}
                >
                  {/* Distinct Pill Banner for Portals matching Image 2 */}
                  {isPrimary ? (
                    // Left Entrance Banner
                    <g transform={`translate(${exit.coordinates.x - 45}, ${exit.coordinates.y - 12})`}>
                      <rect
                        width="70"
                        height="24"
                        rx="4"
                        fill="#10b981"
                        stroke={isSelected ? '#ffffff' : 'none'}
                        strokeWidth="2"
                        className="shadow-sm"
                      />
                      <text x="35" y="16" fill="#ffffff" fontSize="10.5" fontWeight="bold" textAnchor="middle" className="font-sans">
                        Entrance
                      </text>
                    </g>
                  ) : isSecondary ? (
                    // Right Secondary Exit Banner
                    <g transform={`translate(${exit.coordinates.x - 20}, ${exit.coordinates.y - 12})`}>
                      <rect
                        width="92"
                        height="24"
                        rx="4"
                        fill="#10b981"
                        stroke={isSelected ? '#ffffff' : 'none'}
                        strokeWidth="2"
                        className="shadow-sm"
                      />
                      <text x="46" y="16" fill="#ffffff" fontSize="10.5" fontWeight="bold" textAnchor="middle" className="font-sans">
                        Secondary Exit
                      </text>
                    </g>
                  ) : (
                    // Bottom Section Emergency Exits (Orange Pill Badge matching Image 2)
                    <g transform={`translate(${exit.coordinates.x - 40}, ${exit.coordinates.y + 8})`}>
                      <rect
                        width="84"
                        height="20"
                        rx="4"
                        fill="#ea580c"
                        stroke={isSelected ? '#ffffff' : 'none'}
                        strokeWidth="2"
                        className="shadow-sm"
                      />
                      <text x="42" y="14" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-sans">
                        Emergency Exit
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* 7. Refuge Chambers Layer */}
            {mineMap.refuges.map(refuge => {
              const isSelected = selectedElement?.type === 'REFUGE' && selectedElement.id === refuge.id;

              return (
                <g
                  key={refuge.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement({ type: 'REFUGE', id: refuge.id });
                  }}
                  transform={`translate(${refuge.coordinates.x}, ${refuge.coordinates.y})`}
                >
                  <circle
                    r="8"
                    fill="#0891b2"
                    stroke={isSelected ? '#ffffff' : '#22d3ee'}
                    strokeWidth="2"
                  />
                  <text
                    y="18"
                    fill="#0891b2"
                    fontSize="9.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono select-none"
                  >
                    {refuge.name.split(' ')[0]}
                  </text>
                </g>
              );
            })}

            {/* 8. Personnel (Miners) Layer - Stationed Worker Dots & Callsigns (Matching Image 2: W-101, W-102, etc.) */}
            {mineMap.miners.map(miner => {
              const targetNode = miner.current_node || miner.current_block;
              const coord = nodeCoords[targetNode];
              if (!coord) return null;

              const isSelected = selectedElement?.type === 'MINER' && selectedElement.id === miner.miner_id;
              // Extract short callsign like W-101, W-110
              const callsignMatch = miner.name.match(/W-\d+/i);
              const callsign = callsignMatch ? callsignMatch[0].toUpperCase() : miner.miner_id;

              return (
                <g
                  key={miner.miner_id}
                  transform={`translate(${coord.x + 10}, ${coord.y + 6})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement({ type: 'MINER', id: miner.miner_id });
                  }}
                >
                  {/* Miner Stationed Dot */}
                  <circle
                    r="4"
                    fill={isCad ? '#0f172a' : '#ffd700'}
                    stroke={isSelected ? '#38bdf8' : '#ffffff'}
                    strokeWidth="1.2"
                  />
                  {/* Callsign label (e.g. W-101) */}
                  <text
                    x="7"
                    y="3"
                    fill={isCad ? '#334155' : '#fef08a'}
                    fontSize="8.5"
                    fontWeight="700"
                    className="font-mono select-none"
                  >
                    {callsign}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Selected Element Mini-Inspector Drawer */}
      {selectedElement && (
        <div className={`absolute top-4 right-4 z-20 flex items-center gap-3 px-4 py-2.5 rounded-xl backdrop-blur-md shadow-xl text-xs border ${
          isCad ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-[#141022]/95 border-[rgba(212,175,55,0.35)] text-amber-200'
        }`}>
          <div className="flex items-center gap-1.5 font-bold">
            <Radio size={14} className="text-emerald-500 animate-pulse" />
            <span>{selectedElement.type}:</span>
            <span className="font-mono text-emerald-600">{selectedElement.id}</span>
          </div>
          <button
            onClick={() => onSelectElement(null)}
            className="text-slate-400 hover:text-slate-700 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
