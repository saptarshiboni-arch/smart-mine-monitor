import heapq
import math
from typing import Dict, List, Tuple, Optional, Any
from backend.models.schemas import RiskCostConfig, RiskLevel

def calculate_edge_cost(
    distance: float,
    travel_time_sec: float,
    target_node_risk: str,
    edge_risk: str,
    is_edge_blocked: bool,
    is_target_blocked: bool,
    is_hazard: bool,
    risk_config: RiskCostConfig
) -> float:
    """
    Computes safety-weighted edge cost.
    Safety dominates distance:
    - BLOCKED -> infinite (strictly non-traversable)
    - CRITICAL -> 10,000 penalty
    - WARNING -> 50 penalty
    - NORMAL -> 1 penalty
    """
    if is_edge_blocked or is_target_blocked or target_node_risk == "BLOCKED" or edge_risk == "BLOCKED":
        return float("inf")

    # Node risk penalty
    node_risk_val = getattr(risk_config, target_node_risk.upper(), risk_config.NORMAL)
    edge_risk_val = getattr(risk_config, edge_risk.upper(), risk_config.NORMAL)
    max_risk_multiplier = max(node_risk_val, edge_risk_val)

    # Risk penalty: NORMAL (1.0) adds 0 penalty so normal distance governs path choice.
    # WARNING (50.0) adds 50 * 100 = 5,000 penalty.
    # CRITICAL (10000.0) adds 10,000 * 100 = 1,000,000 penalty.
    risk_penalty = (max_risk_multiplier - 1.0) * 100.0 if max_risk_multiplier > 1.0 else 0.0

    # Hazard proximity penalty
    hazard_penalty = risk_config.hazard_proximity_penalty if is_hazard else 0.0

    # Travel time penalty
    time_cost = travel_time_sec * risk_config.travel_time_weight

    # Total safety-dominated cost:
    total_cost = distance + risk_penalty + hazard_penalty + time_cost
    return total_cost


def dijkstra_safest_path(
    graph_nodes: Dict[str, Dict[str, Any]],
    graph_adj: Dict[str, List[Dict[str, Any]]],
    start_node: str,
    goal_node: str,
    risk_config: Optional[RiskCostConfig] = None
) -> Tuple[Optional[List[str]], float, Dict[str, Any]]:
    """
    Dijkstra's safety-weighted shortest path algorithm.
    Returns (path, total_safety_cost, metrics_dict)
    """
    if risk_config is None:
        risk_config = RiskCostConfig()

    if start_node not in graph_nodes or goal_node not in graph_nodes:
        return None, float("inf"), {"error": "Invalid start or goal node"}

    # Priority queue stores: (current_cost, current_node, path)
    pq = [(0.0, start_node, [start_node])]
    visited_costs = {start_node: 0.0}

    while pq:
        cost, current, path = heapq.heappop(pq)

        if current == goal_node:
            # Reconstruct telemetry
            metrics = compute_path_telemetry(path, graph_nodes, graph_adj, risk_config)
            return path, cost, metrics

        if cost > visited_costs.get(current, float("inf")):
            continue

        for neighbor_edge in graph_adj.get(current, []):
            nxt = neighbor_edge["to"]
            dist = neighbor_edge.get("distance", 50.0)
            time_sec = neighbor_edge.get("travel_time_sec", dist * 0.7)
            edge_blocked = neighbor_edge.get("is_blocked", False)
            edge_risk = neighbor_edge.get("risk_level", "NORMAL")

            nxt_node_data = graph_nodes.get(nxt, {})
            nxt_risk = nxt_node_data.get("risk_level", "NORMAL")
            nxt_blocked = nxt_node_data.get("is_blocked", False) or nxt_node_data.get("is_unavailable", False)
            nxt_hazard = nxt_node_data.get("is_hazard", False)

            step_cost = calculate_edge_cost(
                distance=dist,
                travel_time_sec=time_sec,
                target_node_risk=nxt_risk,
                edge_risk=edge_risk,
                is_edge_blocked=edge_blocked,
                is_target_blocked=nxt_blocked,
                is_hazard=nxt_hazard,
                risk_config=risk_config
            )

            if math.isinf(step_cost):
                continue

            new_cost = cost + step_cost
            if new_cost < visited_costs.get(nxt, float("inf")):
                visited_costs[nxt] = new_cost
                heapq.heappush(pq, (new_cost, nxt, path + [nxt]))

    return None, float("inf"), {"error": "No safe route available"}


def compute_path_telemetry(
    path: List[str],
    graph_nodes: Dict[str, Dict[str, Any]],
    graph_adj: Dict[str, List[Dict[str, Any]]],
    risk_config: RiskCostConfig
) -> Dict[str, Any]:
    total_distance = 0.0
    total_time_sec = 0.0
    hazards_count = 0
    critical_count = 0
    warning_count = 0
    steps = []

    for i in range(len(path) - 1):
        u = path[i]
        v = path[i+1]
        edge_info = None
        for edge in graph_adj.get(u, []):
            if edge["to"] == v:
                edge_info = edge
                break
        
        dist = edge_info.get("distance", 50.0) if edge_info else 50.0
        time_sec = edge_info.get("travel_time_sec", dist * 0.7) if edge_info else dist * 0.7
        v_data = graph_nodes.get(v, {})
        v_risk = v_data.get("risk_level", "NORMAL")
        if v_risk == "CRITICAL":
            critical_count += 1
        elif v_risk == "WARNING":
            warning_count += 1
        if v_data.get("is_hazard", False):
            hazards_count += 1

        total_distance += dist
        total_time_sec += time_sec
        steps.append({
            "from_node": u,
            "to_node": v,
            "distance": round(dist, 1),
            "risk": v_risk,
            "travel_time": round(time_sec, 1)
        })

    # Overall safety classification
    if critical_count > 0:
        route_status = "CRITICAL_RISK"
    elif warning_count > 0 or hazards_count > 0:
        route_status = "ALTERNATIVE_ROUTE"
    else:
        route_status = "SAFE_ROUTE"

    return {
        "total_distance": round(total_distance, 1),
        "total_time_sec": round(total_time_sec, 1),
        "hazards_encountered": hazards_count,
        "critical_areas_encountered": critical_count,
        "warning_areas_encountered": warning_count,
        "route_status": route_status,
        "steps": steps
    }
