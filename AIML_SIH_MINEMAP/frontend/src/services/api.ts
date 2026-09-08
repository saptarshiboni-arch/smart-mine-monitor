import {
  MineMap,
  RouteResult,
  EvacuationPlan,
  EmergencyStatus,
  AnalysisResult,
  RiskLevel,
  RiskCostConfig
} from '../types';

const API_BASE = '/api';

export function normalizeMapData(d: any): MineMap {
  if (!d || typeof d !== 'object') return d;

  const normalized: MineMap = {
    mine_id: d.mine_id || 'MINE_001',
    name: d.name || 'Apex Underground Sector 29',
    dimensions: {
      width: d.dimensions?.width || 1000,
      height: d.dimensions?.height || 700
    },
    blueprint_url: d.blueprint_url || '',
    ai_generated: d.ai_generated ?? true,
    admin_confirmed: d.is_confirmed ?? d.admin_confirmed ?? true,
    version: d.version || 1,
    blocks: (d.blocks || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      risk_level: b.risk_level || 'NORMAL',
      coordinates: {
        x: b.coordinates?.x ?? b.x ?? 100,
        y: b.coordinates?.y ?? b.y ?? 100,
      },
      dimensions: {
        width: b.dimensions?.width ?? b.coordinates?.width ?? 150,
        height: b.dimensions?.height ?? b.coordinates?.height ?? 75
      },
      miners: b.miners || [],
      sensor_nodes: b.sensor_nodes || [],
      connections: b.connections || [],
      is_active: b.is_active ?? true,
      notes: b.notes || ''
    })),
    tunnels: (d.tunnels || []).map((t: any) => ({
      id: t.id,
      from_node: t.from_node,
      to_node: t.to_node,
      distance: t.distance || 50,
      risk_level: t.risk_level || 'NORMAL',
      is_blocked: t.is_blocked ?? false,
      width: t.width || 8
    })),
    junctions: (d.junctions || []).map((j: any) => ({
      id: j.id,
      name: j.name,
      coordinates: {
        x: j.coordinates?.x ?? j.x ?? 200,
        y: j.coordinates?.y ?? j.y ?? 200
      },
      connected_tunnels: j.connections || j.connected_tunnels || []
    })),
    exits: (d.exits || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      coordinates: {
        x: e.coordinates?.x ?? e.x ?? 300,
        y: e.coordinates?.y ?? e.y ?? 300
      },
      block_id: e.block_id || '',
      is_operational: e.is_accessible ?? e.is_operational ?? true
    })),
    refuges: (d.refuges || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      coordinates: {
        x: r.coordinates?.x ?? r.x ?? 400,
        y: r.coordinates?.y ?? r.y ?? 400
      },
      capacity: r.capacity || 20,
      current_occupancy: r.current_occupancy || 0,
      is_operational: r.is_accessible ?? r.is_operational ?? true
    })),
    hazards: (d.hazards || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      hazard_type: h.hazard_type || 'HAZARD',
      coordinates: {
        x: h.coordinates?.x ?? h.x ?? 250,
        y: h.coordinates?.y ?? h.y ?? 250
      },
      radius: h.radius || 40,
      severity: h.severity || h.risk_level || 'WARNING'
    })),
    sensors: (d.sensors || []).map((s: any) => ({
      node_id: s.node_id,
      block: s.block,
      risk_level: s.risk_level || 'NORMAL',
      temperature: s.temperature ?? 24.0,
      vibration: s.vibration ?? 0.04,
      tilt: s.tilt ?? 0.05,
      displacement: s.displacement ?? 0.15,
      moisture: s.moisture ?? 20.0,
      last_update: typeof s.last_update === 'number' ? new Date(s.last_update * 1000).toISOString() : (s.last_update || new Date().toISOString()),
      coordinates: {
        x: s.coordinates?.x ?? s.x ?? 200,
        y: s.coordinates?.y ?? s.y ?? 200
      }
    })),
    miners: (d.miners || []).map((m: any) => ({
      miner_id: m.miner_id,
      name: m.name,
      current_block: m.current_block,
      current_node: m.current_node || m.current_block,
      status: m.status || 'ACTIVE',
      helmet_id: m.helmet_id || `HLM-${m.miner_id.replace('MINER_', '')}`,
      assigned_destination: m.assigned_destination || ''
    })),
    graph: d.graph,
    updated_at: d.updated_at ? (typeof d.updated_at === 'number' ? new Date(d.updated_at * 1000).toISOString() : d.updated_at) : new Date().toISOString()
  };

  return normalized;
}

export const api = {
  // Map Operations
  async getMap(): Promise<MineMap> {
    const res = await fetch(`${API_BASE}/map`);
    if (!res.ok) throw new Error(`Failed to fetch map: ${res.statusText}`);
    const data = await res.json();
    return normalizeMapData(data);
  },

  async updateMap(mapData: MineMap): Promise<MineMap> {
    const payload = {
      ...mapData,
      junctions: (mapData.junctions || []).map((j: any) => ({
        ...j,
        x: j.coordinates?.x ?? j.x ?? 0,
        y: j.coordinates?.y ?? j.y ?? 0,
      })),
      exits: (mapData.exits || []).map((e: any) => ({
        ...e,
        x: e.coordinates?.x ?? e.x ?? 0,
        y: e.coordinates?.y ?? e.y ?? 0,
      })),
      refuges: (mapData.refuges || []).map((r: any) => ({
        ...r,
        x: r.coordinates?.x ?? r.x ?? 0,
        y: r.coordinates?.y ?? r.y ?? 0,
      })),
      hazards: (mapData.hazards || []).map((h: any) => ({
        ...h,
        x: h.coordinates?.x ?? h.x ?? 0,
        y: h.coordinates?.y ?? h.y ?? 0,
      })),
      sensors: (mapData.sensors || []).map((s: any) => ({
        ...s,
        last_update: typeof s.last_update === 'string' ? new Date(s.last_update).getTime() / 1000 : (s.last_update || Date.now() / 1000),
      })),
      updated_at: Date.now() / 1000,
      created_at: typeof mapData.created_at === 'string' ? new Date(mapData.created_at).getTime() / 1000 : (mapData.created_at || Date.now() / 1000),
    };

    const res = await fetch(`${API_BASE}/map`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to update map: ${res.statusText}`);
    const data = await res.json();
    return normalizeMapData(data);
  },

  async confirmMap(): Promise<{ status: string; message: string; map: MineMap }> {
    const res = await fetch(`${API_BASE}/map/confirm`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to confirm map: ${res.statusText}`);
    const data = await res.json();
    return {
      ...data,
      map: normalizeMapData(data.map)
    };
  },

  async resetMap(): Promise<MineMap> {
    const res = await fetch(`${API_BASE}/map/reset`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to reset map: ${res.statusText}`);
    const data = await res.json();
    return normalizeMapData(data);
  },

  // Blueprint AI
  async uploadBlueprint(file: File): Promise<{ filename: string; blueprint_url: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/blueprint/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    return res.json();
  },

  async analyzeBlueprint(params: {
    blueprint_url: string;
    file_id?: string;
    model_type?: string;
    target_mine_id?: string;
  }): Promise<AnalysisResult> {
    const res = await fetch(`${API_BASE}/blueprint/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`);
    const data = await res.json();
    return {
      ...data,
      draft_map: normalizeMapData(data.draft_map)
    };
  },

  // Routing Engine
  async calculateRoutes(params?: {
    algorithm?: 'astar' | 'dijkstra';
    config?: Partial<RiskCostConfig>;
  }): Promise<EvacuationPlan> {
    const res = await fetch(`${API_BASE}/route/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    if (!res.ok) throw new Error(`Route calculation failed: ${res.statusText}`);
    return res.json();
  },

  async calculateSingleRoute(params: {
    start_node: string;
    destination_node: string;
    algorithm?: 'astar' | 'dijkstra';
  }): Promise<RouteResult> {
    const res = await fetch(`${API_BASE}/route/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Single route failed: ${res.statusText}`);
    return res.json();
  },

  // Emergency Control
  async startEmergency(reason?: string): Promise<EmergencyStatus> {
    const res = await fetch(`${API_BASE}/emergency/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error(`Failed to activate emergency: ${res.statusText}`);
    return res.json();
  },

  async stopEmergency(): Promise<EmergencyStatus> {
    const res = await fetch(`${API_BASE}/emergency/stop`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to deactivate emergency: ${res.statusText}`);
    return res.json();
  },

  async getEmergencyStatus(): Promise<EmergencyStatus> {
    const res = await fetch(`${API_BASE}/emergency/status`);
    if (!res.ok) throw new Error(`Failed to fetch emergency status: ${res.statusText}`);
    return res.json();
  },

  async recalculateEmergency(): Promise<{ status: string; evacuation_plan: EvacuationPlan }> {
    const res = await fetch(`${API_BASE}/emergency/recalculate`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to recalculate emergency: ${res.statusText}`);
    return res.json();
  },

  // Simulation controls
  async simulateBlockRisk(blockId: string, riskLevel: RiskLevel): Promise<{ status: string; block_id: string; risk_level: RiskLevel; emergency_recalculated: boolean }> {
    const res = await fetch(`${API_BASE}/simulation/block-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block_id: blockId, risk_level: riskLevel }),
    });
    if (!res.ok) throw new Error(`Failed to update block risk: ${res.statusText}`);
    return res.json();
  },

  async simulateTunnelBlocked(tunnelId: string, isBlocked: boolean): Promise<{ status: string; tunnel_id: string; is_blocked: boolean; emergency_recalculated: boolean }> {
    const res = await fetch(`${API_BASE}/simulation/tunnel-blocked`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tunnel_id: tunnelId, is_blocked: isBlocked }),
    });
    if (!res.ok) throw new Error(`Failed to toggle tunnel: ${res.statusText}`);
    return res.json();
  },

  async simulateTelemetry(telemetry: {
    node_id: string;
    temperature: number;
    vibration: number;
    tilt: number;
    displacement: number;
    moisture: number;
  }) {
    const res = await fetch(`${API_BASE}/simulation/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetry),
    });
    if (!res.ok) throw new Error(`Telemetry update failed: ${res.statusText}`);
    return res.json();
  },

  async runPresetScenario(scenarioId: 'all_normal' | 'block_b_critical' | 'block_c_critical' | 'tunnel_t2_blocked' | 'complex_compromise') {
    const res = await fetch(`${API_BASE}/simulation/preset/${scenarioId}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Preset scenario failed: ${res.statusText}`);
    return res.json();
  }
};
