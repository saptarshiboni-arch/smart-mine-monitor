from typing import Dict, List
from backend.models.schemas import MineMap, MineGraph, GraphNode, GraphEdge, NodeType, RiskLevel

class GraphBuilderService:
    """
    Generates navigable graph representations from a confirmed or editable MineMap.
    """

    @staticmethod
    def build_graph(mine_map: MineMap) -> MineGraph:
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []
        adjacency: Dict[str, List[str]] = {}

        # 1. Blocks
        for b in mine_map.blocks:
            node = GraphNode(
                id=b.id,
                name=b.name,
                type=NodeType.BLOCK,
                x=b.coordinates.x,
                y=b.coordinates.y,
                risk_level=b.risk_level,
                is_blocked=b.is_unavailable
            )
            nodes.append(node)
            adjacency[b.id] = []

        # 2. Junctions
        for j in mine_map.junctions:
            node = GraphNode(
                id=j.id,
                name=j.name,
                type=NodeType.JUNCTION,
                x=j.x,
                y=j.y,
                risk_level=RiskLevel.NORMAL,
                is_blocked=False
            )
            nodes.append(node)
            adjacency[j.id] = []

        # 3. Exits
        for ex in mine_map.exits:
            node = GraphNode(
                id=ex.id,
                name=ex.name,
                type=NodeType.EXIT,
                x=ex.x,
                y=ex.y,
                risk_level=RiskLevel.NORMAL,
                is_blocked=not ex.is_accessible
            )
            nodes.append(node)
            adjacency[ex.id] = []

        # 4. Refuges
        for rf in mine_map.refuges:
            node = GraphNode(
                id=rf.id,
                name=rf.name,
                type=NodeType.REFUGE,
                x=rf.x,
                y=rf.y,
                risk_level=RiskLevel.NORMAL,
                is_blocked=not rf.is_accessible
            )
            nodes.append(node)
            adjacency[rf.id] = []

        node_ids = {n.id for n in nodes}

        # 5. Tunnels (Edges)
        for t in mine_map.tunnels:
            if t.from_node in node_ids and t.to_node in node_ids:
                rev_poly = [list(pt) for pt in reversed(t.polyline)] if t.polyline else None
                # Forward edge
                edges.append(GraphEdge(
                    from_node=t.from_node,
                    to_node=t.to_node,
                    distance=t.distance,
                    risk_level=t.risk_level,
                    is_blocked=t.is_blocked,
                    travel_time_sec=t.travel_time_sec,
                    polyline=t.polyline,
                    confidence=getattr(t, "confidence", 0.95)
                ))
                # Backward edge (bidirectional subterranean drift)
                edges.append(GraphEdge(
                    from_node=t.to_node,
                    to_node=t.from_node,
                    distance=t.distance,
                    risk_level=t.risk_level,
                    is_blocked=t.is_blocked,
                    travel_time_sec=t.travel_time_sec,
                    polyline=rev_poly,
                    confidence=getattr(t, "confidence", 0.95)
                ))

                adjacency[t.from_node].append(t.to_node)
                adjacency[t.to_node].append(t.from_node)

        return MineGraph(
            nodes=nodes,
            edges=edges,
            adjacency=adjacency
        )
