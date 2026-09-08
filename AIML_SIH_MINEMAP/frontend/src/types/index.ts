export type RiskLevel = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'BLOCKED';

export type ObjectType = 
  | 'BLOCK' 
  | 'TUNNEL' 
  | 'JUNCTION' 
  | 'SHAFT' 
  | 'EXIT' 
  | 'REFUGE' 
  | 'HAZARD_ZONE' 
  | 'SENSOR_NODE';

export interface Coordinates {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Block {
  id: string;
  name: string;
  risk_level: RiskLevel;
  coordinates: Coordinates;
  dimensions: Dimensions;
  miners: string[];
  sensor_nodes: string[];
  connections: string[];
  is_active: boolean;
  notes?: string;
}

export interface Tunnel {
  id: string;
  from_node: string;
  to_node: string;
  distance: number;
  risk_level: RiskLevel;
  is_blocked: boolean;
  width?: number;
  polyline?: [number, number][];
  confidence?: number;
}

export interface Junction {
  id: string;
  name: string;
  coordinates: Coordinates;
  connected_tunnels: string[];
}

export interface ExitPoint {
  id: string;
  name: string;
  coordinates: Coordinates;
  block_id?: string;
  is_operational: boolean;
}

export interface RefugeChamber {
  id: string;
  name: string;
  coordinates: Coordinates;
  capacity: number;
  current_occupancy: number;
  is_operational: boolean;
}

export interface HazardZone {
  id: string;
  name: string;
  hazard_type: string;
  coordinates: Coordinates;
  radius: number;
  severity: RiskLevel;
}

export interface SensorNode {
  node_id: string;
  block: string;
  risk_level: RiskLevel;
  temperature: number;
  vibration: number;
  tilt: number;
  displacement: number;
  moisture: number;
  last_update: string;
  coordinates?: Coordinates;
}

export interface Miner {
  miner_id: string;
  name: string;
  current_block: string;
  current_node?: string;
  status: 'ACTIVE' | 'EVACUATING' | 'RESCUED' | 'TRAPPED';
  helmet_id?: string;
  assigned_destination?: string;
}

export interface NavigationNode {
  id: string;
  label: string;
  node_type: string;
  x: number;
  y: number;
  block_id?: string;
  risk_level: RiskLevel;
}

export interface NavigationEdge {
  id: string;
  from_node: string;
  to_node: string;
  distance: number;
  risk_level: RiskLevel;
  is_blocked: boolean;
  tunnel_id?: string;
}

export interface NavigationGraph {
  nodes: NavigationNode[];
  edges: NavigationEdge[];
}

export interface MineMap {
  mine_id: string;
  name: string;
  dimensions: { width: number; height: number };
  blueprint_url?: string;
  ai_generated: boolean;
  admin_confirmed: boolean;
  version: number;
  blocks: Block[];
  tunnels: Tunnel[];
  junctions: Junction[];
  exits: ExitPoint[];
  refuges: RefugeChamber[];
  hazards: HazardZone[];
  sensors: SensorNode[];
  miners: Miner[];
  graph?: NavigationGraph;
  created_at?: string | number;
  updated_at?: string | number;
}

export interface RiskCostConfig {
  normal_penalty: number;
  warning_penalty: number;
  critical_penalty: number;
  blocked_cost: number;
  hazard_extra_penalty: number;
  refuge_secondary_penalty: number;
}

export interface RouteResult {
  miner_id: string;
  algorithm: 'astar' | 'dijkstra';
  start_node: string;
  destination_node: string;
  destination_type: 'EXIT' | 'REFUGE';
  path: string[];
  path_polyline?: [number, number][];
  total_distance: number;
  estimated_travel_time: number;
  risk_score: number;
  max_risk_encountered: RiskLevel;
  hazard_zones_encountered: number;
  critical_areas_encountered: number;
  status: 'OPTIMAL' | 'COMPROMISED' | 'NO_PATH';
  notes: string;
}

export interface MinerRouteEvaluation {
  miner: Miner;
  chosen_route?: RouteResult;
  candidate_routes: RouteResult[];
}

export interface EvacuationPlan {
  plan_id: string;
  mine_id: string;
  timestamp: string;
  algorithm: string;
  emergency_active: boolean;
  miner_routes: MinerRouteEvaluation[];
  critical_blocks_count: number;
  warning_blocks_count: number;
  blocked_tunnels_count: number;
}

export interface AnalysisConfidence {
  structural_clarity: number;
  chamber_detection_confidence: number;
  tunnel_connectivity_confidence: number;
  uncertainty_flags: string[];
}

export interface AnalysisResult {
  job_id: string;
  status: string;
  blueprint_url: string;
  confidence: AnalysisConfidence;
  disclaimer: string;
  detected_regions_count: number;
  draft_map: MineMap;
  mine_map?: MineMap;
}

export interface EmergencyStatus {
  active: boolean;
  activated_at?: string;
  reason?: string;
  evacuation_plan?: EvacuationPlan;
}
