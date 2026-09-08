from enum import Enum
from typing import List, Dict, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator
import time

def parse_unix_time(v: Any) -> float:
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            clean_str = v.replace('Z', '+00:00')
            return datetime.fromisoformat(clean_str).timestamp()
        except Exception:
            return time.time()
    return time.time()

class RiskLevel(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    BLOCKED = "BLOCKED"

class MinerStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EVACUATING = "EVACUATING"
    SAFE = "SAFE"
    TRAPPED = "TRAPPED"
    OFFLINE = "OFFLINE"

class NodeType(str, Enum):
    BLOCK = "BLOCK"
    TUNNEL = "TUNNEL"
    JUNCTION = "JUNCTION"
    SHAFT = "SHAFT"
    EXIT = "EXIT"
    REFUGE = "REFUGE"
    HAZARD_ZONE = "HAZARD_ZONE"
    SENSOR_NODE = "SENSOR_NODE"

class Coordinates(BaseModel):
    x: float
    y: float
    width: Optional[float] = 120.0
    height: Optional[float] = 70.0

class Dimensions(BaseModel):
    width: float = 1200.0
    height: float = 800.0

class SensorNode(BaseModel):
    node_id: str
    block: str
    risk_level: RiskLevel = RiskLevel.NORMAL
    temperature: float = 24.5  # Celsius
    vibration: float = 0.02    # g
    tilt: float = 0.04         # degrees
    displacement: float = 0.1  # mm
    moisture: float = 18.0     # %
    battery_pct: float = 95.0
    last_update: float = Field(default_factory=lambda: time.time())

    @field_validator('last_update', mode='before')
    @classmethod
    def validate_last_update(cls, v: Any) -> float:
        return parse_unix_time(v)

class Miner(BaseModel):
    miner_id: str
    name: str = "Miner"
    current_block: str
    current_node: str
    status: MinerStatus = MinerStatus.ACTIVE
    heart_rate: int = 78
    helmet_battery: int = 88
    assigned_route: Optional[List[str]] = None

class Block(BaseModel):
    id: str
    name: str
    risk_level: RiskLevel = RiskLevel.NORMAL
    miners: List[str] = Field(default_factory=list)
    sensor_nodes: List[str] = Field(default_factory=list)
    coordinates: Coordinates
    connections: List[str] = Field(default_factory=list)
    is_unavailable: bool = False
    is_hazard: bool = False
    hazard_type: Optional[str] = None
    confidence: float = 0.92  # Perception AI confidence score (0.0 to 1.0)
    uncertain_flag: bool = False

    @model_validator(mode='before')
    @classmethod
    def prep_block_coords(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if 'coordinates' not in data and 'x' in data and 'y' in data:
                data['coordinates'] = {'x': data['x'], 'y': data['y']}
            elif isinstance(data.get('coordinates'), dict):
                # Ensure width/height have fallbacks
                data['coordinates'].setdefault('width', 120.0)
                data['coordinates'].setdefault('height', 70.0)
        return data

class Tunnel(BaseModel):
    id: str
    from_node: str
    to_node: str
    distance: float = 50.0 # meters
    is_blocked: bool = False
    risk_level: RiskLevel = RiskLevel.NORMAL
    width: float = 4.0     # meters
    travel_time_sec: float = 35.0
    polyline: Optional[List[List[float]]] = None  # Ordered [[x, y], ...] centerline coordinates
    confidence: float = 0.95

class Junction(BaseModel):
    id: str
    name: str
    x: float = 0.0
    y: float = 0.0
    coordinates: Optional[Coordinates] = None
    connections: List[str] = Field(default_factory=list)

    @model_validator(mode='before')
    @classmethod
    def prep_coords(cls, data: Any) -> Any:
        if isinstance(data, dict):
            coords = data.get('coordinates')
            if isinstance(coords, dict):
                data.setdefault('x', coords.get('x', 0.0))
                data.setdefault('y', coords.get('y', 0.0))
            elif 'x' in data and 'y' in data and not coords:
                data['coordinates'] = {'x': data['x'], 'y': data['y']}
        return data

    def model_post_init(self, __context: Any) -> None:
        if self.coordinates is None:
            self.coordinates = Coordinates(x=self.x, y=self.y)
        elif self.x == 0.0 and self.y == 0.0:
            self.x = self.coordinates.x
            self.y = self.coordinates.y

class Exit(BaseModel):
    id: str
    name: str
    x: float = 0.0
    y: float = 0.0
    coordinates: Optional[Coordinates] = None
    exit_type: str = "PRIMARY"  # PRIMARY, SECONDARY, SHAFT
    is_accessible: bool = True
    capacity: int = 200

    @model_validator(mode='before')
    @classmethod
    def prep_coords(cls, data: Any) -> Any:
        if isinstance(data, dict):
            coords = data.get('coordinates')
            if isinstance(coords, dict):
                data.setdefault('x', coords.get('x', 0.0))
                data.setdefault('y', coords.get('y', 0.0))
            elif 'x' in data and 'y' in data and not coords:
                data['coordinates'] = {'x': data['x'], 'y': data['y']}
        return data

    def model_post_init(self, __context: Any) -> None:
        if self.coordinates is None:
            self.coordinates = Coordinates(x=self.x, y=self.y)
        elif self.x == 0.0 and self.y == 0.0:
            self.x = self.coordinates.x
            self.y = self.coordinates.y

class RefugeChamber(BaseModel):
    id: str
    name: str
    x: float = 0.0
    y: float = 0.0
    coordinates: Optional[Coordinates] = None
    capacity: int = 30
    current_occupancy: int = 0
    oxygen_hours: float = 48.0
    is_accessible: bool = True

    @model_validator(mode='before')
    @classmethod
    def prep_coords(cls, data: Any) -> Any:
        if isinstance(data, dict):
            coords = data.get('coordinates')
            if isinstance(coords, dict):
                data.setdefault('x', coords.get('x', 0.0))
                data.setdefault('y', coords.get('y', 0.0))
            elif 'x' in data and 'y' in data and not coords:
                data['coordinates'] = {'x': data['x'], 'y': data['y']}
        return data

    def model_post_init(self, __context: Any) -> None:
        if self.coordinates is None:
            self.coordinates = Coordinates(x=self.x, y=self.y)
        elif self.x == 0.0 and self.y == 0.0:
            self.x = self.coordinates.x
            self.y = self.coordinates.y

class HazardZone(BaseModel):
    id: str
    name: str
    x: float = 0.0
    y: float = 0.0
    coordinates: Optional[Coordinates] = None
    radius: float = 40.0
    hazard_type: str = "GAS_LEAK"  # GAS_LEAK, ROCKFALL, FLOODING, HIGH_HEAT
    severity: RiskLevel = RiskLevel.CRITICAL
    description: str = "Detected elevated gas concentration"

    @model_validator(mode='before')
    @classmethod
    def prep_coords(cls, data: Any) -> Any:
        if isinstance(data, dict):
            coords = data.get('coordinates')
            if isinstance(coords, dict):
                data.setdefault('x', coords.get('x', 0.0))
                data.setdefault('y', coords.get('y', 0.0))
            elif 'x' in data and 'y' in data and not coords:
                data['coordinates'] = {'x': data['x'], 'y': data['y']}
        return data

    def model_post_init(self, __context: Any) -> None:
        if self.coordinates is None:
            self.coordinates = Coordinates(x=self.x, y=self.y)
        elif self.x == 0.0 and self.y == 0.0:
            self.x = self.coordinates.x
            self.y = self.coordinates.y

class GraphNode(BaseModel):
    id: str
    name: str
    type: NodeType
    x: float = 0.0
    y: float = 0.0
    risk_level: RiskLevel = RiskLevel.NORMAL
    is_blocked: bool = False

    @model_validator(mode='before')
    @classmethod
    def prep_coords(cls, data: Any) -> Any:
        if isinstance(data, dict):
            coords = data.get('coordinates')
            if isinstance(coords, dict):
                data.setdefault('x', coords.get('x', 0.0))
                data.setdefault('y', coords.get('y', 0.0))
        return data

class GraphEdge(BaseModel):
    from_node: str
    to_node: str
    distance: float
    risk_level: RiskLevel = RiskLevel.NORMAL
    is_blocked: bool = False
    travel_time_sec: float
    polyline: Optional[List[List[float]]] = None
    confidence: float = 0.95

class MineGraph(BaseModel):
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    adjacency: Dict[str, List[str]] = Field(default_factory=dict)

class MineMap(BaseModel):
    mine_id: str = "MINE_001"
    name: str = "Underground Sector 7 - Silver Peak"
    description: str = "Deep subterranean coal/mineral extraction sector"
    blueprint_url: Optional[str] = None
    dimensions: Optional[Dimensions] = Field(default_factory=lambda: Dimensions())
    blocks: List[Block] = Field(default_factory=list)
    tunnels: List[Tunnel] = Field(default_factory=list)
    junctions: List[Junction] = Field(default_factory=list)
    exits: List[Exit] = Field(default_factory=list)
    refuges: List[RefugeChamber] = Field(default_factory=list)
    hazards: List[HazardZone] = Field(default_factory=list)
    sensors: List[SensorNode] = Field(default_factory=list)
    miners: List[Miner] = Field(default_factory=list)
    graph: Optional[MineGraph] = None
    is_confirmed: bool = False
    ai_review_required: bool = True
    ai_confidence_overall: float = 0.88
    created_at: float = Field(default_factory=lambda: time.time())
    updated_at: float = Field(default_factory=lambda: time.time())

    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def validate_timestamps(cls, v: Any) -> float:
        return parse_unix_time(v)

class RiskCostConfig(BaseModel):
    NORMAL: float = 1.0
    WARNING: float = 50.0
    CRITICAL: float = 10000.0
    BLOCKED: float = float("inf")
    travel_time_weight: float = 0.5
    hazard_proximity_penalty: float = 200.0
    refuge_secondary_penalty: float = 300.0  # Prefer surface exit if equally safe

class RouteStep(BaseModel):
    from_node: str
    to_node: str
    distance: float
    risk: RiskLevel
    travel_time: float

class MinerRouteResult(BaseModel):
    miner_id: str
    miner_name: str
    origin_node: str
    origin_block: str
    destination_node: str
    destination_type: str  # EXIT or REFUGE
    destination_name: str
    path: List[str]
    path_polyline: Optional[List[List[float]]] = None
    total_distance: float
    total_estimated_time_sec: float
    safety_risk_score: float
    hazards_encountered: int
    critical_areas_encountered: int
    route_status: str  # SAFE ROUTE, ALTERNATIVE ROUTE, NO SAFE ROUTE
    algorithm_used: str = "A*"
    steps: List[RouteStep] = Field(default_factory=list)
    calculated_at: float = Field(default_factory=lambda: time.time())

class EmergencyStatus(BaseModel):
    is_active: bool = False
    triggered_at: Optional[float] = None
    total_miners: int = 0
    safe_miners: int = 0
    at_risk_miners: int = 0
    active_critical_blocks: List[str] = Field(default_factory=list)
    active_blocked_tunnels: List[str] = Field(default_factory=list)
    routes: Dict[str, MinerRouteResult] = Field(default_factory=dict)
    message: str = "System in normal monitoring mode."
