"""
===============================================================================
Module: tests/test_blueprint_analyzer.py
Project: AIML_SIH_MINEMAP - Perception & Digital Map Extraction Test Suite
===============================================================================
Validates:
1. Existing CubiCasa baseline pipeline (backward compatibility)
2. Preprocessing pipeline stages independently
3. Native MineBlueprintAnalyzer perception
4. Multiple blueprint styles (simple, branching, multiple exits, complex intersections, noisy scanned)
5. Topological graph connectivity and absence of phantom walls
6. Safety disclaimer and fallback system
===============================================================================
"""

import os
import pytest
import numpy as np
import cv2
import networkx as nx

from backend.services.blueprint_analyzer.cubicasa_analyzer import CubiCasaAnalyzer
from backend.services.blueprint_analyzer.mine_analyzer import MineBlueprintAnalyzer
from backend.services.blueprint_analyzer.preprocessing import MineBlueprintPreprocessor
from backend.services.blueprint_analyzer.centerline_extractor import TunnelCenterlineExtractor
from backend.services.map_generator.semantic_mapper import MineSemanticMapper
from backend.services.graph_builder.graph_service import GraphBuilderService
from backend.models.schemas import MineMap, NodeType


DEMO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "demo"))
DEMO_PATH = os.path.join(DEMO_DIR, "demo_mine_blueprint.png")


def test_cubicasa_analyzer_pipeline():
    """Verifies baseline CubiCasaAnalyzer functionality and backward compatibility."""
    assert os.path.exists(DEMO_PATH), "Demo blueprint image does not exist"

    analyzer = CubiCasaAnalyzer(target_resolution=1000)
    result = analyzer.analyze(DEMO_PATH)

    assert result["status"] == "SUCCESS"
    assert "CubiCasa5K" in result["model_engine"]
    assert result["is_native_mine_model"] is False
    assert result["requires_human_review"] is True
    assert "chambers" in result or "extracted_rooms" in result

    mapper = MineSemanticMapper()
    mine_map = mapper.generate_mine_map(result, blueprint_url="/data/demo/demo_mine_blueprint.png")

    assert len(mine_map.blocks) >= 3
    assert len(mine_map.tunnels) >= 2
    assert len(mine_map.exits) >= 1
    assert len(mine_map.miners) >= 1
    assert len(mine_map.sensors) >= 1
    assert mine_map.is_confirmed is False
    assert mine_map.ai_review_required is True

    graph = GraphBuilderService.build_graph(mine_map)
    assert len(graph.nodes) > 0
    assert len(graph.edges) > 0


def test_preprocessing_stages():
    """Tests each preprocessing transformation independently."""
    preprocessor = MineBlueprintPreprocessor()
    test_img = np.ones((500, 500, 3), dtype=np.uint8) * 240
    cv2.line(test_img, (50, 250), (450, 250), (30, 30, 30), 12)

    gray = preprocessor.to_grayscale(test_img)
    assert len(gray.shape) == 2

    clahe = preprocessor.normalize_contrast(gray)
    assert clahe.shape == gray.shape

    denoised = preprocessor.denoise(clahe, method="bilateral")
    assert denoised.shape == gray.shape

    binary = preprocessor.adaptive_threshold(denoised, invert=True)
    assert binary.max() == 255 and binary.min() == 0

    deskewed, angle = preprocessor.deskew(binary)
    assert deskewed.shape == binary.shape

    enhanced = preprocessor.enhance_lines(deskewed)
    assert enhanced.shape == binary.shape

    cleaned = preprocessor.morphological_cleanup(enhanced)
    assert cleaned.shape == binary.shape


def test_mine_blueprint_analyzer():
    """Tests the specialized MineBlueprintAnalyzer perception engine."""
    analyzer = MineBlueprintAnalyzer(target_resolution=1000)
    result = analyzer.analyze(DEMO_PATH)

    assert result["status"] == "SUCCESS"
    assert result["is_native_mine_model"] is True
    assert result["overall_confidence"] >= 0.85
    assert result["requires_human_review"] is True
    assert "AI-generated" in result["disclaimer"]

    # Semantic mapping integration
    mapper = MineSemanticMapper()
    mine_map = mapper.generate_mine_map(result, blueprint_url="/data/demo/demo_mine_blueprint.png")

    assert len(mine_map.blocks) >= 3
    assert len(mine_map.tunnels) >= 2
    assert len(mine_map.exits) >= 1
    assert mine_map.ai_review_required is True

    graph = GraphBuilderService.build_graph(mine_map)
    assert len(graph.nodes) >= 4
    assert len(graph.edges) >= 2


def test_multiple_blueprint_styles(tmp_path):
    """
    Tests extraction across 5 distinct mine drawing styles:
    1. simple mine (straight drift)
    2. branching mine (trunk with crosscuts and chambers)
    3. multiple exits (3+ perimeter portals)
    4. complex intersections (4-way crossroads and junctions)
    5. noisy scanned blueprint (Gaussian noise + artifacts)
    """
    analyzer = MineBlueprintAnalyzer()
    styles = ["simple", "branching", "multiple_exits", "complex_intersections", "noisy_scanned"]

    for style in styles:
        h, w = 600, 800
        img = np.full((h, w, 3), 245, dtype=np.uint8)

        if style == "simple":
            cv2.line(img, (60, 300), (740, 300), (20, 20, 20), 16)
        elif style == "branching":
            cv2.line(img, (100, 150), (700, 150), (20, 20, 20), 14)
            cv2.line(img, (100, 450), (700, 450), (20, 20, 20), 14)
            cv2.line(img, (250, 150), (250, 450), (20, 20, 20), 14)
            cv2.line(img, (550, 150), (550, 450), (20, 20, 20), 14)
            cv2.rectangle(img, (350, 260), (450, 340), (20, 20, 20), -1)
        elif style == "multiple_exits":
            cv2.line(img, (80, 100), (720, 100), (20, 20, 20), 14)
            cv2.line(img, (80, 500), (720, 500), (20, 20, 20), 14)
            cv2.line(img, (400, 50), (400, 550), (20, 20, 20), 14)
        elif style == "complex_intersections":
            cv2.line(img, (50, 200), (750, 200), (20, 20, 20), 14)
            cv2.line(img, (50, 400), (750, 400), (20, 20, 20), 14)
            cv2.line(img, (200, 80), (200, 520), (20, 20, 20), 14)
            cv2.line(img, (400, 80), (400, 520), (20, 20, 20), 14)
            cv2.line(img, (600, 80), (600, 520), (20, 20, 20), 14)
        elif style == "noisy_scanned":
            cv2.line(img, (100, 300), (700, 300), (20, 20, 20), 16)
            cv2.rectangle(img, (350, 250), (450, 350), (20, 20, 20), -1)
            # Add synthetic scanner grain
            noise = np.random.normal(0, 15, img.shape).astype(np.int16)
            img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        style_path = tmp_path / f"{style}.png"
        cv2.imwrite(str(style_path), img)

        res = analyzer.analyze(str(style_path))
        assert res["status"] == "SUCCESS", f"Failed on style: {style}"
        assert len(res["extracted_rooms"]) >= 2
        assert len(res["extracted_corridors"]) >= 1


def test_centerline_connectivity_and_no_wall_paths():
    """Verifies that centerlines represent void corridors without mistaking solid walls for paths."""
    extractor = TunnelCenterlineExtractor()
    mask = np.zeros((400, 600), dtype=np.uint8)
    
    # Draw hollow parallel tunnel walls (mimicking CAD drawing)
    cv2.line(mask, (50, 185), (550, 185), 255, 4)
    cv2.line(mask, (50, 215), (550, 215), 255, 4)

    # Skeletonization must extract single centerline between walls, NOT two parallel paths
    skel = extractor.extract_skeleton(mask)
    y_coords, x_coords = np.where(skel > 0)
    
    # Verify centerline y is approximately 200 (the center between 185 and 215)
    mean_y = np.mean(y_coords)
    assert 195 <= mean_y <= 205

    G = extractor.build_navigation_graph(skel, mask)
    assert G.number_of_nodes() >= 2
    assert G.number_of_edges() >= 1


def test_two_nodes_close_without_tunnel_no_edge():
    """
    Test 1 (Strict Edge Rejection):
    Two nodes close to each other visually, but separated by solid rock (no continuous tunnel).
    Expected: NO EDGE created between them.
    """
    extractor = TunnelCenterlineExtractor(min_tunnel_length=5.0)
    img = np.zeros((200, 200), dtype=np.uint8)
    # Draw two parallel drifts separated by a solid rock barrier at y=60
    cv2.line(img, (20, 45), (180, 45), 255, 1)   # Drift 1
    cv2.line(img, (20, 75), (180, 75), 255, 1)   # Drift 2 (only 30px away, but separated by rock)

    G = extractor.trace_skeleton_graph(img, min_edge_len=5.0)
    assert G.number_of_nodes() >= 4

    drift1_nodes = [n for n in G.nodes if G.nodes[n]['y'] < 60]
    drift2_nodes = [n for n in G.nodes if G.nodes[n]['y'] > 60]

    # Verify no edge cuts across the solid rock barrier
    for n1 in drift1_nodes:
        for n2 in drift2_nodes:
            assert not G.has_edge(n1, n2), f"VIOLATION: False edge {n1} <-> {n2} cuts across solid rock!"


def test_two_nodes_connected_by_winding_tunnel():
    """
    Test 2 (Winding Polyline Preservation):
    Two nodes connected by an S-shaped winding tunnel.
    Expected: Edge strictly follows the curved multi-point polyline (path length > straight-line Euclidean distance).
    """
    extractor = TunnelCenterlineExtractor(min_tunnel_length=5.0)
    img = np.zeros((300, 300), dtype=np.uint8)

    # Draw an S-curve winding tunnel
    pts = []
    for t in np.linspace(0, 2 * np.pi, 200):
        x = int(150 + 80 * np.sin(t))
        y = int(30 + 240 * (t / (2 * np.pi)))
        pts.append((x, y))

    for i in range(len(pts) - 1):
        cv2.line(img, pts[i], pts[i + 1], 255, 1)

    G = extractor.trace_skeleton_graph(img, min_edge_len=5.0)
    assert G.number_of_nodes() == 2
    assert G.number_of_edges() == 1

    for u, v, d in G.edges(data=True):
        poly = d.get("polyline", [])
        assert len(poly) >= 6, f"Expected multi-point polyline for winding tunnel, got {len(poly)} points"

        p_start = np.array(poly[0])
        p_end = np.array(poly[-1])
        straight_dist = float(np.linalg.norm(p_end - p_start))
        actual_len = float(d["length"])

        # Path length along curved centerline must be significantly longer than Euclidean distance
        assert actual_len >= straight_dist * 1.25, (
            f"Winding polyline failed: actual_len {actual_len} is too close to straight dist {straight_dist}"
        )


def test_t_junction_three_branches():
    """
    Test 3 (T-Junction Topology):
    A standard T-shaped gallery intersection.
    Expected: Exactly 1 topological junction node with degree 3 (three branches).
    """
    extractor = TunnelCenterlineExtractor(min_tunnel_length=5.0)
    img = np.zeros((200, 200), dtype=np.uint8)

    # Horizontal haulage gallery
    cv2.line(img, (30, 100), (170, 100), 255, 1)
    # Vertical crosscut gallery
    cv2.line(img, (100, 100), (100, 180), 255, 1)

    G = extractor.trace_skeleton_graph(img, min_edge_len=5.0)

    j_nodes = [n for n in G.nodes if G.nodes[n].get("type") == "JUNCTION"]
    assert len(j_nodes) == 1, f"Expected exactly 1 junction node, got {len(j_nodes)}"

    jid = j_nodes[0]
    degree = G.degree(jid)
    assert degree == 3, f"Expected exactly 3 branches at T-junction, got degree {degree}"

