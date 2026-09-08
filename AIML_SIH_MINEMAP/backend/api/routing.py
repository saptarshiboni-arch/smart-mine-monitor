import time
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from backend.models.schemas import MinerRouteResult, RiskCostConfig, Miner
from backend.services.routing.safety_router import SafetyRoutingService
from backend.database.db import db

router = APIRouter(prefix="/api/route", tags=["Safety Routing Engine"])

router_service = SafetyRoutingService()

class RouteRequest(BaseModel):
    miner_id: Optional[str] = None
    origin_node: Optional[str] = None
    destination_node: Optional[str] = None
    algorithm: str = "A*"  # "A*" or "Dijkstra"
    risk_config: Optional[RiskCostConfig] = None

@router.post("/calculate", response_model=MinerRouteResult)
async def calculate_route(request: RouteRequest):
    """
    Calculates the SAFEST available evacuation route:
    - Safety strictly dominates distance
    - Avoids CRITICAL blocks and BLOCKED corridors
    - Dynamically evaluates multi-exit and refuge options
    """
    current_map = db.get_current_map()

    target_miner = None
    if request.miner_id:
        for m in current_map.miners:
            if m.miner_id == request.miner_id:
                target_miner = m
                break
        if not target_miner:
            raise HTTPException(status_code=404, detail="Miner not found")
    else:
        # Create virtual temporary miner for arbitrary origin query
        origin = request.origin_node or (current_map.blocks[0].id if current_map.blocks else "BLOCK_A")
        target_miner = Miner(
            miner_id="QUERY_MINER",
            name="Virtual Query Miner",
            current_block=origin,
            current_node=origin
        )

    cfg = request.risk_config or router_service.risk_config
    result = router_service.calculate_safest_route_for_miner(
        miner=target_miner,
        mine_map=current_map,
        algorithm=request.algorithm,
        risk_config=cfg
    )

    return result

@router.get("/config", response_model=RiskCostConfig)
async def get_risk_config():
    """Retrieves current safety risk penalties."""
    return router_service.risk_config

@router.post("/config", response_model=RiskCostConfig)
async def update_risk_config(new_config: RiskCostConfig):
    """Allows safety engineers to configure risk penalties."""
    router_service.risk_config = new_config
    return router_service.risk_config

@router.post("/compare")
async def compare_algorithms(miner_id: Optional[str] = None):
    """
    Runs both Dijkstra and A* on the current map and compares:
    - Path equality
    - Total safety risk score
    - Execution latency (milliseconds)
    - Total distance & travel time
    """
    current_map = db.get_current_map()
    if not current_map.miners:
        raise HTTPException(status_code=400, detail="No miners registered on map")

    target_miner = current_map.miners[0]
    if miner_id:
        for m in current_map.miners:
            if m.miner_id == miner_id:
                target_miner = m
                break

    # Benchmark A*
    t0 = time.perf_counter()
    res_astar = router_service.calculate_safest_route_for_miner(target_miner, current_map, algorithm="A*")
    astar_duration_ms = round((time.perf_counter() - t0) * 1000, 3)

    # Benchmark Dijkstra
    t1 = time.perf_counter()
    res_dijkstra = router_service.calculate_safest_route_for_miner(target_miner, current_map, algorithm="Dijkstra")
    dijkstra_duration_ms = round((time.perf_counter() - t1) * 1000, 3)

    return {
        "miner_evaluated": target_miner.miner_id,
        "astar": {
            "path": res_astar.path,
            "destination": res_astar.destination_name,
            "total_distance_m": res_astar.total_distance,
            "safety_cost": res_astar.safety_risk_score,
            "latency_ms": astar_duration_ms,
            "status": res_astar.route_status
        },
        "dijkstra": {
            "path": res_dijkstra.path,
            "destination": res_dijkstra.destination_name,
            "total_distance_m": res_dijkstra.total_distance,
            "safety_cost": res_dijkstra.safety_risk_score,
            "latency_ms": dijkstra_duration_ms,
            "status": res_dijkstra.route_status
        },
        "identical_optimal_paths": res_astar.path == res_dijkstra.path
    }
