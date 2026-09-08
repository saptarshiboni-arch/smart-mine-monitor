import heapq
import math
from typing import Dict, List, Tuple, Optional, Any
from backend.models.schemas import RiskCostConfig, RiskLevel
from backend.algorithms.dijkstra import calculate_edge_cost, compute_path_telemetry

def euclidean_distance(node1_coords: Tuple[float, float], node2_coords: Tuple[float, float]) -> float:
    """Calculates geometric Euclidean distance between two 2D coordinates."""
    dx = node1_coords[0] - node2_coords[0]
    dy = node1_coords[1] - node2_coords[1]
    return math.sqrt(dx * dx + dy * dy)

def astar_safest_path(
    graph_nodes: Dict[str, Dict[str, Any]],
    graph_adj: Dict[str, List[Dict[str, Any]]],
    start_node: str,
    goal_node: str,
    risk_config: Optional[RiskCostConfig] = None
) -> Tuple[Optional[List[str]], float, Dict[str, Any]]:
    """
    A* Safety-Weighted Pathfinding Algorithm.
    f(n) = g(n) + h(n)
    where:
      g(n) = accumulated safety-weighted cost
      h(n) = spatial Euclidean distance heuristic to goal
    Returns (path, total_safety_cost, metrics_dict)
    """
    if risk_config is None:
        risk_config = RiskCostConfig()

    if start_node not in graph_nodes or goal_node not in graph_nodes:
        return None, float("inf"), {"error": "Invalid start or goal node"}

    goal_coords = (graph_nodes[goal_node].get("x", 0.0), graph_nodes[goal_node].get("y", 0.0))
    start_coords = (graph_nodes[start_node].get("x", 0.0), graph_nodes[start_node].get("y", 0.0))

    # Priority queue stores: (f_score, g_score, current_node, path)
    initial_h = euclidean_distance(start_coords, goal_coords)
    pq = [(initial_h, 0.0, start_node, [start_node])]
    g_scores = {start_node: 0.0}

    while pq:
        f_val, g_val, current, path = heapq.heappop(pq)

        if current == goal_node:
            metrics = compute_path_telemetry(path, graph_nodes, graph_adj, risk_config)
            return path, g_val, metrics

        if g_val > g_scores.get(current, float("inf")):
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

            tentative_g = g_val + step_cost
            if tentative_g < g_scores.get(nxt, float("inf")):
                g_scores[nxt] = tentative_g
                nxt_coords = (nxt_node_data.get("x", 0.0), nxt_node_data.get("y", 0.0))
                h_val = euclidean_distance(nxt_coords, goal_coords)
                f_score = tentative_g + h_val
                heapq.heappush(pq, (f_score, tentative_g, nxt, path + [nxt]))

    return None, float("inf"), {"error": "No safe route available"}
