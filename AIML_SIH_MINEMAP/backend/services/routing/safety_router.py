from typing import Dict, List, Optional, Tuple, Any
from backend.models.schemas import (
    MineMap, Miner, MinerRouteResult, RiskCostConfig, RiskLevel, RouteStep
)
from backend.algorithms.astar import astar_safest_path
from backend.algorithms.dijkstra import dijkstra_safest_path

class SafetyRoutingService:
    def __init__(self, risk_config: Optional[RiskCostConfig] = None):
        self.risk_config = risk_config or RiskCostConfig()

    def build_graph_representations(self, mine_map: MineMap) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
        """
        Converts MineMap blocks, junctions, exits, and refuges into graph nodes and adjacency lists.
        """
        nodes: Dict[str, Dict[str, Any]] = {}
        adj: Dict[str, List[Dict[str, Any]]] = {}

        # 1. Blocks
        for b in mine_map.blocks:
            nodes[b.id] = {
                "id": b.id,
                "name": b.name,
                "type": "BLOCK",
                "x": b.coordinates.x,
                "y": b.coordinates.y,
                "risk_level": b.risk_level.value,
                "is_blocked": b.is_unavailable,
                "is_hazard": b.is_hazard
            }
            adj[b.id] = []

        # 2. Junctions
        for j in mine_map.junctions:
            nodes[j.id] = {
                "id": j.id,
                "name": j.name,
                "type": "JUNCTION",
                "x": j.x,
                "y": j.y,
                "risk_level": "NORMAL",
                "is_blocked": False,
                "is_hazard": False
            }
            adj[j.id] = []

        # 3. Exits
        for ex in mine_map.exits:
            nodes[ex.id] = {
                "id": ex.id,
                "name": ex.name,
                "type": "EXIT",
                "x": ex.x,
                "y": ex.y,
                "risk_level": "NORMAL",
                "is_blocked": not ex.is_accessible,
                "is_hazard": False
            }
            adj[ex.id] = []

        # 4. Refuge Chambers
        for rf in mine_map.refuges:
            nodes[rf.id] = {
                "id": rf.id,
                "name": rf.name,
                "type": "REFUGE",
                "x": rf.x,
                "y": rf.y,
                "risk_level": "NORMAL",
                "is_blocked": not rf.is_accessible or rf.current_occupancy >= rf.capacity,
                "is_hazard": False
            }
            adj[rf.id] = []

        # 5. Tunnels (Bidirectional edges)
        for t in mine_map.tunnels:
            u, v = t.from_node, t.to_node
            if u not in nodes or v not in nodes:
                continue

            edge_data_uv = {
                "to": v,
                "distance": t.distance,
                "travel_time_sec": t.travel_time_sec,
                "is_blocked": t.is_blocked,
                "risk_level": t.risk_level.value
            }
            edge_data_vu = {
                "to": u,
                "distance": t.distance,
                "travel_time_sec": t.travel_time_sec,
                "is_blocked": t.is_blocked,
                "risk_level": t.risk_level.value
            }
            adj[u].append(edge_data_uv)
            adj[v].append(edge_data_vu)

        return nodes, adj

    def calculate_safest_route_for_miner(
        self,
        miner: Miner,
        mine_map: MineMap,
        algorithm: str = "A*",
        risk_config: Optional[RiskCostConfig] = None
    ) -> MinerRouteResult:
        """
        Calculates safest available evacuation route for an individual miner,
        evaluating all available Exits and Refuge Chambers.
        """
        cfg = risk_config or self.risk_config
        nodes, adj = self.build_graph_representations(mine_map)

        start_node = miner.current_node or miner.current_block
        if start_node not in nodes:
            # Fallback: find if current_block exists
            if miner.current_block in nodes:
                start_node = miner.current_block
            else:
                return MinerRouteResult(
                    miner_id=miner.miner_id,
                    miner_name=miner.name,
                    origin_node=miner.current_node,
                    origin_block=miner.current_block,
                    destination_node="UNKNOWN",
                    destination_type="NONE",
                    destination_name="N/A",
                    path=[],
                    total_distance=0.0,
                    total_estimated_time_sec=0.0,
                    safety_risk_score=9999999.0,
                    hazards_encountered=0,
                    critical_areas_encountered=0,
                    route_status="NO SAFE ROUTE AVAILABLE",
                    algorithm_used=algorithm,
                    steps=[]
                )

        # Collect candidate destinations: all accessible Exits first, then Refuge Chambers
        candidate_destinations: List[Tuple[str, str, str]] = [] # (node_id, type, name)
        for ex in mine_map.exits:
            if ex.is_accessible and not nodes[ex.id]["is_blocked"]:
                candidate_destinations.append((ex.id, "EXIT", ex.name))

        for rf in mine_map.refuges:
            if rf.is_accessible and not nodes[rf.id]["is_blocked"]:
                candidate_destinations.append((rf.id, "REFUGE", rf.name))

        best_route = None
        best_candidate = None
        min_safety_cost = float("inf")
        best_metrics = None

        search_fn = astar_safest_path if algorithm.upper() == "A*" else dijkstra_safest_path

        for dest_id, dest_type, dest_name in candidate_destinations:
            path, cost, metrics = search_fn(nodes, adj, start_node, dest_id, cfg)

            if path is not None and cost < float("inf"):
                # Surface exits take precedence over refuge shelters unless exit is blocked/hazardous
                candidate_cost = cost
                if dest_type == "REFUGE":
                    candidate_cost += cfg.refuge_secondary_penalty

                if candidate_cost < min_safety_cost:
                    min_safety_cost = candidate_cost
                    best_route = path
                    best_candidate = (dest_id, dest_type, dest_name)
                    best_metrics = metrics

        if best_route is None or best_candidate is None or min_safety_cost == float("inf"):
            return MinerRouteResult(
                miner_id=miner.miner_id,
                miner_name=miner.name,
                origin_node=start_node,
                origin_block=miner.current_block,
                destination_node="NONE",
                destination_type="NONE",
                destination_name="NO REACHABLE EXIT/REFUGE",
                path=[],
                total_distance=0.0,
                total_estimated_time_sec=0.0,
                safety_risk_score=9999999.0,
                hazards_encountered=0,
                critical_areas_encountered=0,
                route_status="NO SAFE ROUTE AVAILABLE",
                algorithm_used=algorithm,
                steps=[]
            )

        steps_objs = [
            RouteStep(
                from_node=s["from_node"],
                to_node=s["to_node"],
                distance=s["distance"],
                risk=RiskLevel(s["risk"]),
                travel_time=s["travel_time"]
            )
            for s in best_metrics.get("steps", [])
        ]

        status_text = "SAFE ROUTE"
        if best_metrics.get("critical_areas_encountered", 0) > 0:
            status_text = "CRITICAL HAZARDS ON ROUTE"
        elif best_metrics.get("warning_areas_encountered", 0) > 0:
            status_text = "CAUTION: WARNING ZONES ON ROUTE"

        # Build concatenated path_polyline from tunnel polylines
        tunnel_lookup = {}
        for t in mine_map.tunnels:
            if t.polyline:
                tunnel_lookup[(t.from_node, t.to_node)] = t.polyline
                rev_poly = [list(pt) for pt in reversed(t.polyline)]
                tunnel_lookup[(t.to_node, t.from_node)] = rev_poly

        path_polyline = []
        for k in range(len(best_route) - 1):
            n1 = best_route[k]
            n2 = best_route[k + 1]
            poly = tunnel_lookup.get((n1, n2))
            if poly:
                path_polyline.extend(poly)
            else:
                p1 = [nodes[n1]["x"], nodes[n1]["y"]]
                p2 = [nodes[n2]["x"], nodes[n2]["y"]]
                path_polyline.extend([p1, p2])

        return MinerRouteResult(
            miner_id=miner.miner_id,
            miner_name=miner.name,
            origin_node=start_node,
            origin_block=miner.current_block,
            destination_node=best_candidate[0],
            destination_type=best_candidate[1],
            destination_name=best_candidate[2],
            path=best_route,
            path_polyline=path_polyline,
            total_distance=best_metrics["total_distance"],
            total_estimated_time_sec=best_metrics["total_time_sec"],
            safety_risk_score=round(min_safety_cost, 1),
            hazards_encountered=best_metrics["hazards_encountered"],
            critical_areas_encountered=best_metrics["critical_areas_encountered"],
            route_status=status_text,
            algorithm_used=algorithm,
            steps=steps_objs
        )

    def calculate_all_miner_routes(
        self,
        mine_map: MineMap,
        algorithm: str = "A*",
        risk_config: Optional[RiskCostConfig] = None
    ) -> Dict[str, MinerRouteResult]:
        """Calculates evacuation routes for all registered miners."""
        results: Dict[str, MinerRouteResult] = {}
        for miner in mine_map.miners:
            results[miner.miner_id] = self.calculate_safest_route_for_miner(
                miner=miner,
                mine_map=mine_map,
                algorithm=algorithm,
                risk_config=risk_config
            )
        return results
