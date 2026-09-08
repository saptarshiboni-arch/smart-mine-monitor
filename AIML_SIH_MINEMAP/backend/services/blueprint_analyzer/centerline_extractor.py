"""
Module: backend.services.blueprint_analyzer.centerline_extractor
Topological skeletonization and continuous navigation graph extraction for underground mines.
Extracts 1-pixel wide centerlines, identifies topological junctions and endpoints,
traces continuous pixel paths, and generates graph edges with exact polylines.
Prevents straight-line shortcuts across rock and rejects non-tunnel connections.
"""

from typing import List, Dict, Tuple, Set, Any, Optional
import math
import numpy as np
import cv2
from skimage.morphology import skeletonize
import networkx as nx


class TunnelCenterlineExtractor:
    """
    Extracts 1-pixel wide continuous centerlines from segmented tunnel void geometries,
    detects intersections and dead-ends, traces continuous polylines, and constructs
    a topologically grounded navigation graph.
    """

    def __init__(
        self,
        min_tunnel_length: float = 12.0,
        node_merge_distance: float = 22.0,
        simplification_tolerance: float = 2.0
    ):
        self.min_tunnel_length = min_tunnel_length
        self.node_merge_distance = node_merge_distance
        self.simplification_tolerance = simplification_tolerance

    def extract_skeleton(self, binary_mask: np.ndarray) -> np.ndarray:
        """
        Applies morphological skeletonization directly to the binary gallery mask to obtain
        1-pixel wide continuous centerlines without artificial filling.
        """
        bool_img = binary_mask > 0
        skel = skeletonize(bool_img)
        return (skel.astype(np.uint8)) * 255

    def trace_skeleton_graph(
        self,
        skeleton: np.ndarray,
        binary_mask: Optional[np.ndarray] = None,
        min_edge_len: Optional[float] = None,
        rdp_epsilon: Optional[float] = None
    ) -> nx.Graph:
        """
        Traces 8-connected skeleton pixels between junctions and dead-ends.
        Every edge stores the exact continuous polyline of the tunnel centerline.
        
        Args:
            skeleton: 1-pixel wide skeleton image (255 for skeleton, 0 elsewhere).
            binary_mask: Optional traversable corridor mask for validation.
            min_edge_len: Minimum edge length in pixels (shorter dead-end spurs are pruned).
            rdp_epsilon: Tolerance for Ramer-Douglas-Peucker polyline simplification.
            
        Returns:
            NetworkX Graph where:
              Nodes have attributes: 'x', 'y', 'type' (JUNCTION or ENDPOINT)
              Edges have attributes: 'id', 'polyline', 'length', 'distance', 'confidence'
        """
        if min_edge_len is None:
            min_edge_len = self.min_tunnel_length
        if rdp_epsilon is None:
            rdp_epsilon = self.simplification_tolerance

        skel = (skeleton > 0).astype(np.uint8)
        h, w = skel.shape[:2]

        if np.sum(skel) == 0:
            return nx.Graph()

        # 8-neighborhood degree count kernel
        kernel = np.array([[1, 1, 1],
                           [1, 0, 1],
                           [1, 1, 1]], dtype=np.uint8)
        neighbor_count = cv2.filter2D(skel, cv2.CV_32F, kernel) * skel

        # 1. Classify pixels
        junction_mask = (neighbor_count >= 3) & (skel > 0)
        endpoint_mask = (neighbor_count == 1) & (skel > 0)

        # 2. Detect true sharp corners/bends on degree-2 pixels (vectors turn sharply, not smooth winding curves)
        deg2_ys, deg2_xs = np.where((neighbor_count == 2) & (skel > 0))
        corner_mask = np.zeros_like(skel, dtype=bool)
        nbr_offsets_8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]

        def _walk_nbr_chain(start_pt, prev_pt, steps=3):
            curr_ = start_pt
            prev_ = prev_pt
            for _ in range(steps):
                cands = []
                for dx_, dy_ in nbr_offsets_8:
                    nx__, ny__ = curr_[0] + dx_, curr_[1] + dy_
                    if 0 <= nx__ < w and 0 <= ny__ < h and skel[ny__, nx__] > 0 and (nx__, ny__) != prev_:
                        cands.append((nx__, ny__))
                if len(cands) != 1:
                    break
                prev_ = curr_
                curr_ = cands[0]
            return curr_

        for cx, cy in zip(deg2_xs, deg2_ys):
            nbrs = []
            for dx, dy in nbr_offsets_8:
                if 0 <= cx + dx < w and 0 <= cy + dy < h and skel[cy + dy, cx + dx] > 0:
                    nbrs.append((cx + dx, cy + dy))
            if len(nbrs) == 2:
                p_fwd = _walk_nbr_chain(nbrs[0], (cx, cy), steps=3)
                p_bwd = _walk_nbr_chain(nbrs[1], (cx, cy), steps=3)
                v_f = (p_fwd[0] - cx, p_fwd[1] - cy)
                v_b = (p_bwd[0] - cx, p_bwd[1] - cy)
                d_f = math.hypot(*v_f)
                d_b = math.hypot(*v_b)
                if d_f >= 2 and d_b >= 2:
                    cos_val = (v_f[0] * v_b[0] + v_f[1] * v_b[1]) / (d_f * d_b)
                    if cos_val > -0.55:  # Sharp bend (> 55 deg turn)
                        corner_mask[cy, cx] = True

        all_junc = (junction_mask | corner_mask)

        # 3. Detect standalone loops (closed gallery circuits with no dead ends)
        num_cc, cc_labels = cv2.connectedComponents(skel, connectivity=8)
        for c_id in range(1, num_cc):
            comp = (cc_labels == c_id)
            if not np.any(all_junc[comp]) and not np.any(endpoint_mask[comp]):
                ys_comp, xs_comp = np.where(comp)
                for idx in [0, len(xs_comp) // 4, len(xs_comp) // 2, (3 * len(xs_comp)) // 4]:
                    all_junc[ys_comp[idx], xs_comp[idx]] = True

        # 4. Cluster junction & corner pixels into unique nodes
        num_j_labels, j_labels, j_stats, j_centroids = cv2.connectedComponentsWithStats(
            all_junc.astype(np.uint8), connectivity=8
        )

        junction_nodes: Dict[str, Tuple[float, float]] = {}
        pixel_to_junction: Dict[Tuple[int, int], str] = {}

        for lbl in range(1, num_j_labels):
            cx, cy = j_centroids[lbl]
            jid = f"J_{lbl:02d}"
            junction_nodes[jid] = (float(cx), float(cy))
            ys, xs = np.where(j_labels == lbl)
            for px, py in zip(xs, ys):
                pixel_to_junction[(int(px), int(py))] = jid

        # 5. Cluster endpoints
        endpoint_nodes: Dict[str, Tuple[float, float]] = {}
        pixel_to_endpoint: Dict[Tuple[int, int], str] = {}
        ep_ys, ep_xs = np.where(endpoint_mask & (j_labels == 0))
        ep_count = 0
        for px, py in zip(ep_xs, ep_ys):
            ep_count += 1
            epid = f"EP_{ep_count:02d}"
            endpoint_nodes[epid] = (float(px), float(py))
            pixel_to_endpoint[(int(px), int(py))] = epid

        G = nx.Graph()
        for jid, (x, y) in junction_nodes.items():
            G.add_node(jid, x=x, y=y, type="JUNCTION", confidence=0.95)
        for epid, (x, y) in endpoint_nodes.items():
            # Classify endpoint near border as EXIT, otherwise TUNNEL_END
            border_margin = 0.06
            is_near_border = (x <= w * border_margin or x >= w * (1 - border_margin) or
                              y <= h * border_margin or y >= h * (1 - border_margin))
            ntype = "EXIT" if is_near_border else "ENDPOINT"
            G.add_node(epid, x=x, y=y, type=ntype, confidence=0.90 if is_near_border else 0.85)

        # 4. Trace paths between keypoints along 8-connected neighbors using fast visited corridor mask
        pixel_to_node = {}
        for (px, py), jid in pixel_to_junction.items():
            pixel_to_node[(px, py)] = jid
        for (px, py), epid in pixel_to_endpoint.items():
            pixel_to_node[(px, py)] = epid

        nbr_offsets = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
        visited_corridors = np.zeros((h, w), dtype=bool)
        edge_list = []

        for (sx, sy), start_nid in list(pixel_to_node.items()):
            for dx, dy in nbr_offsets:
                nx_, ny_ = sx + dx, sy + dy
                if not (0 <= nx_ < w and 0 <= ny_ < h):
                    continue
                if skel[ny_, nx_] == 0 or visited_corridors[ny_, nx_]:
                    continue

                # Immediate direct adjacent node
                if (nx_, ny_) in pixel_to_node:
                    end_nid = pixel_to_node[(nx_, ny_)]
                    if start_nid != end_nid:
                        p1 = [G.nodes[start_nid]["x"], G.nodes[start_nid]["y"]]
                        p2 = [G.nodes[end_nid]["x"], G.nodes[end_nid]["y"]]
                        d = math.hypot(p1[0] - p2[0], p1[1] - p2[1])
                        edge_list.append((start_nid, end_nid, [p1, p2], d))
                    continue

                # Walk along the unvisited 8-connected skeleton corridor
                path = [(sx, sy), (nx_, ny_)]
                visited_corridors[ny_, nx_] = True
                curr = (nx_, ny_)
                prev = (sx, sy)
                end_nid = None

                while True:
                    next_pt = None
                    for ox, oy in nbr_offsets:
                        cand_x, cand_y = curr[0] + ox, curr[1] + oy
                        if (cand_x, cand_y) == prev:
                            continue
                        if 0 <= cand_x < w and 0 <= cand_y < h and skel[cand_y, cand_x] > 0:
                            next_pt = (cand_x, cand_y)
                            break

                    if next_pt is None:
                        break

                    if next_pt in pixel_to_node:
                        end_nid = pixel_to_node[next_pt]
                        break

                    if visited_corridors[next_pt[1], next_pt[0]]:
                        break

                    visited_corridors[next_pt[1], next_pt[0]] = True
                    path.append(next_pt)
                    prev = curr
                    curr = next_pt

                if end_nid and end_nid != start_nid:
                    full_poly = [[G.nodes[start_nid]["x"], G.nodes[start_nid]["y"]]]
                    for p in path[1:]:
                        full_poly.append([float(p[0]), float(p[1])])
                    full_poly.append([G.nodes[end_nid]["x"], G.nodes[end_nid]["y"]])

                    # Simplify with approxPolyDP while preserving curvature
                    if rdp_epsilon > 0 and len(full_poly) > 2:
                        pts_np = np.array(full_poly, dtype=np.float32).reshape((-1, 1, 2))
                        approx = cv2.approxPolyDP(pts_np, rdp_epsilon, False)
                        simplified = [list(map(float, pt[0])) for pt in approx]
                    else:
                        simplified = full_poly

                    # True cumulative path length
                    total_len = sum(
                        math.hypot(simplified[k+1][0] - simplified[k][0], simplified[k+1][1] - simplified[k][1])
                        for k in range(len(simplified) - 1)
                    )

                    edge_list.append((start_nid, end_nid, simplified, total_len))

        # 5. Add edges to graph, reject rock-wall penetrations, and prune short dead-end spurs
        t_id = 0
        for u, v, poly, length in edge_list:
            is_u_ep = G.nodes[u].get("type") in ["ENDPOINT", "EXIT"]
            is_v_ep = G.nodes[v].get("type") in ["ENDPOINT", "EXIT"]

            if (is_u_ep or is_v_ep) and length < min_edge_len:
                continue

            # Validate that polyline travels through traversable void, not solid rock
            if binary_mask is not None and len(poly) >= 2:
                h_m, w_m = binary_mask.shape[:2]
                valid_samples = 0
                total_samples = 0
                for k_s in range(len(poly) - 1):
                    p_a = poly[k_s]
                    p_b = poly[k_s + 1]
                    for t_s in np.linspace(0.1, 0.9, 5):
                        sx = int(round(p_a[0] * (1 - t_s) + p_b[0] * t_s))
                        sy = int(round(p_a[1] * (1 - t_s) + p_b[1] * t_s))
                        if 0 <= sx < w_m and 0 <= sy < h_m:
                            total_samples += 1
                            if binary_mask[sy, sx] > 0:
                                valid_samples += 1
                if total_samples > 0 and (valid_samples / float(total_samples)) < 0.60:
                    continue

            t_id += 1
            dist_m = max(round(length * 0.4, 1), 10.0)
            G.add_edge(
                u,
                v,
                id=f"TUNNEL_{t_id:02d}",
                polyline=poly,
                length=round(length, 1),
                distance=dist_m,
                travel_time_sec=round(dist_m * 0.7, 1),
                risk_level="NORMAL",
                is_blocked=False,
                confidence=0.96
            )

        # Remove dead isolated nodes
        isolated = [n for n in G.nodes if G.degree(n) == 0]
        G.remove_nodes_from(isolated)

        return G

    def extract_topological_graph(
        self,
        binary_mask: np.ndarray
    ) -> Tuple[np.ndarray, nx.Graph]:
        """
        Runs full morphological skeletonization and 8-connected BFS graph tracing.
        Returns:
            (skeleton_mask, navigation_graph)
        """
        skeleton = self.extract_skeleton(binary_mask)
        graph = self.trace_skeleton_graph(skeleton, binary_mask=binary_mask)
        return skeleton, graph

    def build_navigation_graph(
        self,
        skeleton: np.ndarray,
        binary_mask: np.ndarray
    ) -> nx.Graph:
        """
        Backward-compatible interface for navigation graph extraction.
        Builds graph using true continuous skeleton tracing with full polyline storage.
        """
        return self.trace_skeleton_graph(skeleton, binary_mask=binary_mask)
