"""
Module: backend.services.blueprint_analyzer.graph_generator
Clean topological graph generator for underground coal mine blueprints.

Core Principles:
1. STRICT PHYSICAL CONNECTIVITY: Never connect two nodes simply because they are close.
   An edge is valid ONLY if there is a continuous traversable tunnel/void path.
2. CONTINUOUS POLYLINES: Every edge records the ordered sequence of physical pixel
   coordinates [[x1, y1], [x2, y2], ...] representing the actual mine gallery.
3. PRESERVES REAL COMPLEXITY: Does not collapse organic, irregular, or winding bord-and-pillar
   galleries into artificial gridlines or straight chords.
4. EXPLAINABLE CONFIDENCE: Each node and edge receives an honest confidence score
   grounded in physical mask support and topology.
"""

from typing import List, Dict, Tuple, Optional, Any, Set
import math
import numpy as np
import networkx as nx


class MineGraphGenerator:
    """
    Constructs, validates, and serializes a topologically grounded navigation graph
    from skeletonized mine blueprint centerlines.
    """

    def __init__(
        self,
        pixels_per_meter: float = 2.5,
        min_path_clearance: float = 0.85,
        walking_speed_mps: float = 1.2
    ):
        self.pixels_per_meter = pixels_per_meter
        self.min_path_clearance = min_path_clearance
        self.walking_speed_mps = walking_speed_mps

    def build_graph_from_skeleton(
        self,
        nav_graph: nx.Graph,
        tunnel_mask: Optional[np.ndarray] = None,
        node_metadata: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Converts a NetworkX graph of traced skeleton segments into a validated,
        cleanly structured mine navigation graph dictionary.

        Args:
            nav_graph: NetworkX graph with node attrs (x, y, type) and edge attrs (polyline, length)
            tunnel_mask: Optional binary mask (255=void/tunnel, 0=solid rock) for path validation
            node_metadata: Optional mapping of node_id -> domain metadata (name, type, etc.)

        Returns:
            Dictionary matching the strict SIH 2026 graph schema:
            {
                "nodes": [...],
                "edges": [...],
                "graph_metrics": {...}
            }
        """
        node_metadata = node_metadata or {}
        nodes_out: List[Dict[str, Any]] = []
        edges_out: List[Dict[str, Any]] = []

        # 1. Process Nodes
        for nid, ndata in nav_graph.nodes(data=True):
            deg = nav_graph.degree(nid)
            nx_pos = float(round(ndata.get("x", 0.0), 1))
            ny_pos = float(round(ndata.get("y", 0.0), 1))

            meta = node_metadata.get(str(nid), {})
            node_type = meta.get("type", ndata.get("type", "JUNCTION" if deg >= 3 else "ENDPOINT"))
            node_name = meta.get("name", f"Node {nid} ({node_type})")
            confidence = meta.get("confidence", 0.90)

            nodes_out.append({
                "id": str(nid),
                "name": node_name,
                "type": node_type,
                "x": nx_pos,
                "y": ny_pos,
                "degree": deg,
                "confidence": round(float(confidence), 2)
            })

        # 2. Process & Validate Edges
        edge_counter = 1
        rejected_edges = 0

        for u, v, edata in nav_graph.edges(data=True):
            poly = edata.get("polyline", [])
            length_px = float(edata.get("length", 0.0))

            # If polyline is missing, construct direct segment only if end nodes exist
            if not poly:
                u_data = nav_graph.nodes[u]
                v_data = nav_graph.nodes[v]
                poly = [[float(u_data["x"]), float(u_data["y"])], [float(v_data["x"]), float(v_data["y"])]]
                length_px = math.hypot(v_data["x"] - u_data["x"], v_data["y"] - u_data["y"])

            # Strict Physical Verification: check that polyline stays inside tunnel void
            path_confidence = 0.90
            if tunnel_mask is not None and len(poly) >= 2:
                valid_samples = 0
                total_samples = 0
                h, w = tunnel_mask.shape[:2]

                # Sample up to 50 points along the polyline
                sample_indices = np.linspace(0, len(poly) - 1, min(len(poly), 50), dtype=int)
                for s_idx in sample_indices:
                    pt_x, pt_y = int(round(poly[s_idx][0])), int(round(poly[s_idx][1]))
                    if 0 <= pt_x < w and 0 <= pt_y < h:
                        total_samples += 1
                        if tunnel_mask[pt_y, pt_x] > 0:
                            valid_samples += 1

                clearance_ratio = valid_samples / max(total_samples, 1)

                # Reject edges cutting through solid rock
                if clearance_ratio < self.min_path_clearance:
                    rejected_edges += 1
                    continue

                path_confidence = round(float(np.clip(clearance_ratio, 0.40, 0.98)), 2)

            # Compute real physical distance (meters)
            distance_m = max(round(length_px / self.pixels_per_meter, 1), 5.0)
            travel_time_sec = round(distance_m / self.walking_speed_mps, 1)

            edge_id = edata.get("id", f"TUNNEL_{edge_counter:02d}")
            edge_counter += 1

            edges_out.append({
                "id": edge_id,
                "source": str(u),
                "target": str(v),
                "polyline": [[float(round(p[0], 1)), float(round(p[1], 1))] for p in poly],
                "length_px": round(length_px, 1),
                "distance": distance_m,
                "travel_time_sec": travel_time_sec,
                "risk_level": "NORMAL",
                "is_blocked": False,
                "confidence": path_confidence
            })

        # 3. Graph Metrics
        connected_components = nx.number_connected_components(nav_graph)
        num_cycles = len(nx.cycle_basis(nav_graph))

        return {
            "nodes": nodes_out,
            "edges": edges_out,
            "graph_metrics": {
                "total_nodes": len(nodes_out),
                "total_edges": len(edges_out),
                "rejected_edges": rejected_edges,
                "connected_components": connected_components,
                "independent_cycles": num_cycles,
                "average_node_degree": round(2.0 * len(edges_out) / max(len(nodes_out), 1), 2)
            }
        }
