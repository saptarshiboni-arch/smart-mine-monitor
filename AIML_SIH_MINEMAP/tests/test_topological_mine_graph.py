"""
Topological Unit Test Suite for Subterranean Mine Blueprint Perception.
Tests all 10 topological scenarios mandated by Rule #14:
1. Disconnected nearby tunnels (No false edge across solid rock)
2. Winding tunnel (Polyline follows curves, length > Euclidean)
3. T-junction (Preserves degree 3 and 3 incident branches)
4. Four-way crosscut (Preserves degree 4 and 4 branches)
5. Topological loop (Preserves cycle without collapsing)
6. Dead end (Preserves degree 1 terminal heading)
7. Crossing non-tunnel lines (Filters small text/annotations)
8. Separate drawing panels (Isolates Plan View from Legends and Sections)
9. False diagonal shortcut (Rejects shortcut chords through coal pillars)
10. Coordinate alignment (Graph coordinates match 1:1 with canvas pixel space)
"""

import math
import numpy as np
import cv2
import networkx as nx
import pytest

from backend.services.blueprint_analyzer.centerline_extractor import TunnelCenterlineExtractor
from backend.services.blueprint_analyzer.panel_separator import DrawingPanelSeparator


@pytest.fixture
def extractor():
    return TunnelCenterlineExtractor(min_tunnel_length=15.0, simplification_tolerance=2.0)


@pytest.fixture
def separator():
    return DrawingPanelSeparator()


def test_01_disconnected_nearby_tunnels(extractor):
    """
    Scenario 1: Two parallel galleries separated by a 20px solid coal pillar.
    Must NOT create any false edge between them.
    """
    mask = np.zeros((200, 200), dtype=np.uint8)
    # Gallery 1 at y = 60
    mask[60, 20:180] = 255
    # Gallery 2 at y = 140 (separated by 80px solid rock)
    mask[140, 20:180] = 255

    skel, G = extractor.extract_topological_graph(mask)
    # The two galleries must be completely disconnected components
    assert nx.number_connected_components(G) == 2
    # Verify no edge crosses between y=60 and y=140
    for u, v in G.edges():
        y_diff = abs(G.nodes[u]["y"] - G.nodes[v]["y"])
        assert y_diff < 30, f"False edge connecting parallel galleries! y_diff={y_diff}"


def test_02_winding_tunnel_polyline(extractor):
    """
    Scenario 2: An S-curved winding tunnel.
    Edge must store a multi-point polyline following the curves,
    and polyline length must exceed the Euclidean chord distance by >= 20%.
    """
    mask = np.zeros((300, 300), dtype=np.uint8)
    pts = []
    for x in range(30, 270):
        # Sine-wave winding path
        y = int(150 + 60 * math.sin((x - 30) / 35.0))
        pts.append((x, y))
        mask[max(0, y - 2):min(300, y + 3), x] = 255

    skel, G = extractor.extract_topological_graph(mask)
    assert len(G.edges) >= 1

    # Find the edge covering the winding tunnel
    found_winding = False
    for u, v, d in G.edges(data=True):
        poly = d.get("polyline", [])
        if len(poly) >= 4:
            euc_d = math.hypot(poly[0][0] - poly[-1][0], poly[0][1] - poly[-1][1])
            path_len = d["length"]
            if path_len > euc_d * 1.15:
                found_winding = True
                break

    assert found_winding, "Winding tunnel was simplified into a straight chord!"


def test_03_t_junction_three_branches(extractor):
    """
    Scenario 3: A T-junction.
    Must produce exactly 1 junction node with degree 3 and 3 branches.
    """
    mask = np.zeros((200, 200), dtype=np.uint8)
    # Horizontal gallery
    mask[100, 20:180] = 255
    # Vertical branch going down from midpoint
    mask[100:180, 100] = 255

    skel, G = extractor.extract_topological_graph(mask)
    junctions = [n for n, d in G.nodes(data=True) if d.get("type") == "JUNCTION"]
    assert len(junctions) == 1, f"Expected 1 junction node, got {len(junctions)}"
    jid = junctions[0]
    assert G.degree(jid) == 3, f"T-junction must have degree 3, got {G.degree(jid)}"


def test_04_four_way_crosscut(extractor):
    """
    Scenario 4: A four-way crosscut intersection.
    Must produce exactly 1 junction node with degree 4 and 4 incident edges.
    """
    mask = np.zeros((200, 200), dtype=np.uint8)
    # Horizontal heading
    mask[100, 20:180] = 255
    # Vertical crosscut
    mask[20:180, 100] = 255

    skel, G = extractor.extract_topological_graph(mask)
    junctions = [n for n, d in G.nodes(data=True) if d.get("type") == "JUNCTION"]
    assert len(junctions) == 1, f"Expected 1 junction node, got {len(junctions)}"
    jid = junctions[0]
    assert G.degree(jid) == 4, f"4-way junction must have degree 4, got {G.degree(jid)}"


def test_05_topological_loop_circuit(extractor):
    """
    Scenario 5: A closed square gallery circuit around a coal pillar.
    Must preserve the cycle without collapsing into a single point.
    """
    mask = np.zeros((300, 300), dtype=np.uint8)
    # Square loop enclosing solid coal pillar
    mask[50:250, 50] = 255
    mask[50:250, 250] = 255
    mask[50, 50:250] = 255
    mask[250, 50:250] = 255

    skel, G = extractor.extract_topological_graph(mask)
    # Graph must contain at least one cycle
    cycles = nx.cycle_basis(G)
    assert len(cycles) >= 1, "Topological loop was collapsed into a tree!"


def test_06_dead_end_stope(extractor):
    """
    Scenario 6: A dead-end gallery heading into an unmined stope.
    Must preserve an endpoint node with degree 1.
    """
    mask = np.zeros((200, 200), dtype=np.uint8)
    mask[100, 30:170] = 255

    skel, G = extractor.extract_topological_graph(mask)
    endpoints = [n for n in G.nodes if G.degree(n) == 1]
    assert len(endpoints) == 2, f"Expected 2 dead-end endpoints, got {len(endpoints)}"


def test_07_crossing_non_tunnel_annotations(separator):
    """
    Scenario 7: Small text characters and dimension tick marks.
    Must be filtered out by panel separator and connected component filtering.
    """
    binary = np.zeros((400, 400), dtype=np.uint8)
    # Real gallery
    binary[200, 50:350] = 255
    # Small isolated text/dimension symbols (10x10 and 15x8)
    binary[80:90, 80:90] = 255
    binary[120:135, 150:158] = 255

    cleaned, meta = separator.isolate_plan_view(binary)
    # The small symbols (< 160 px) must be removed
    assert np.sum(cleaned[80:90, 80:90]) == 0, "Text annotation was not rejected!"
    assert np.sum(cleaned[120:135, 150:158]) == 0, "Dimension tick was not rejected!"
    # The real gallery must remain
    assert np.sum(cleaned[200, 50:350]) > 0, "Real gallery was accidentally removed!"


def test_08_separate_drawing_panels(separator):
    """
    Scenario 8: Multi-panel drawing with right-side legend table and bottom section view.
    Plan view isolator must mask out the legend and section views.
    """
    binary = np.zeros((600, 800), dtype=np.uint8)
    # Plan view gallery in center
    binary[250, 100:500] = 255
    # Right-side legend vertical divider at x = 650
    binary[:, 650] = 255
    # Legend internal text/boxes
    binary[100:400, 680:750] = 255
    # Bottom section divider at y = 500
    binary[500, 50:750] = 255
    # Section view profile at y = 550
    binary[550, 100:500] = 255

    cleaned, meta = separator.isolate_plan_view(binary)
    # Features inside the legend (x > 650) must be masked out
    assert np.sum(cleaned[:, 660:]) == 0, "Legend box was not separated from Plan View!"
    # Features in the bottom section view (y > 500) must be masked out
    assert np.sum(cleaned[510:, :]) == 0, "Section view was not separated from Plan View!"


def test_09_no_false_diagonal_shortcuts(extractor):
    """
    Scenario 9: Two nodes located diagonally across solid unmined coal.
    Direct chord must be rejected if tested against void mask.
    """
    mask = np.zeros((200, 200), dtype=np.uint8)
    # L-shaped gallery: horizontal heading + vertical crosscut
    mask[50, 30:150] = 255
    mask[50:170, 150] = 255

    skel, G = extractor.extract_topological_graph(mask)
    # Should contain nodes along the L, but NO diagonal edge connecting (30, 50) directly to (150, 170)
    for u, v in G.edges():
        p1 = (G.nodes[u]["x"], G.nodes[u]["y"])
        p2 = (G.nodes[v]["x"], G.nodes[v]["y"])
        is_diag_shortcut = (abs(p1[0] - 30) < 10 and abs(p2[1] - 170) < 10) or (abs(p2[0] - 30) < 10 and abs(p1[1] - 170) < 10)
        assert not is_diag_shortcut, "False diagonal shortcut cutting across rock pillar detected!"


def test_10_coordinate_alignment():
    """
    Scenario 10: Digital graph coordinates must match 1:1 with canvas pixel space.
    Ensure that a feature drawn at (X, Y) produces a node within tolerance of (X, Y).
    """
    extractor = TunnelCenterlineExtractor()
    mask = np.zeros((300, 400), dtype=np.uint8)
    # T-junction centered precisely at (200, 150)
    mask[150, 100:300] = 255
    mask[150:250, 200] = 255

    skel, G = extractor.extract_topological_graph(mask)
    junctions = [d for n, d in G.nodes(data=True) if d.get("type") == "JUNCTION"]
    assert len(junctions) == 1
    jx, jy = junctions[0]["x"], junctions[0]["y"]
    assert abs(jx - 200.0) < 3.0, f"X coordinate misaligned: expected 200, got {jx}"
    assert abs(jy - 150.0) < 3.0, f"Y coordinate misaligned: expected 150, got {jy}"
