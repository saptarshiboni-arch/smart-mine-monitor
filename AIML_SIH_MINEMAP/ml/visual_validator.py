"""
Module: ml.visual_validator
Visual verification and 8-panel diagnostic generator for underground coal mine blueprints.

Generates the full visual verification suite specified in SIH Rule #13 and Phase 14:
01_original.png
02_plan_view.png
03_preprocessed.png
04_tunnel_mask.png
05_skeleton.png
06_junctions.png
07_endpoints.png
08_graph_overlay.png
09_rejected_edges.png
10_final_map.png
Plus side-by-side diagnostic comparisons.
"""

import os
import sys
import argparse
from pathlib import Path
import numpy as np
import cv2

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.blueprint_analyzer.mine_analyzer import MineBlueprintAnalyzer


def run_visual_validator(image_path: str, output_dir: str):
    out_p = Path(output_dir)
    out_p.mkdir(parents=True, exist_ok=True)

    print(f"Running visual verification on: {image_path}")
    analyzer = MineBlueprintAnalyzer(target_resolution=1200)

    # 1. Original Blueprint
    orig = cv2.imread(image_path)
    if orig is None:
        print(f"Failed to read image at {image_path}")
        return

    h_orig, w_orig = orig.shape[:2]
    target_w = 1200
    scale = target_w / float(w_orig)
    target_h = int(h_orig * scale)
    canvas = cv2.resize(orig, (target_w, target_h), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(out_p / "01_original.png"), canvas)

    # 2. Preprocessed & Polarity Detection
    gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    cv2.imwrite(str(out_p / "03_preprocessed.png"), enhanced)

    # 3. Analyze through full pipeline
    result = analyzer.analyze(image_path)

    # 4. Extract masks and intermediates
    dims = result.get("dimensions", {"width": target_w, "height": target_h})
    cw, ch = dims["width"], dims["height"]

    # Plan View
    plan_view = canvas.copy()
    cv2.imwrite(str(out_p / "02_plan_view.png"), plan_view)

    # Tunnel Mask
    tunnel_mask = np.zeros((ch, cw), dtype=np.uint8)
    skeleton_img = np.zeros((ch, cw), dtype=np.uint8)

    tunnels = result.get("extracted_corridors", []) or result.get("tunnels", [])
    for t in tunnels:
        poly = t.get("polyline", [])
        if len(poly) >= 2:
            pts = np.array(poly, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(tunnel_mask, [pts], isClosed=False, color=255, thickness=12)
            cv2.polylines(skeleton_img, [pts], isClosed=False, color=255, thickness=1)

    cv2.imwrite(str(out_p / "04_tunnel_mask.png"), tunnel_mask)
    cv2.imwrite(str(out_p / "05_skeleton.png"), skeleton_img)

    # Junctions & Endpoints
    junctions_img = np.zeros((ch, cw, 3), dtype=np.uint8)
    endpoints_img = np.zeros((ch, cw, 3), dtype=np.uint8)

    junctions = result.get("extracted_junctions", []) or result.get("junctions", [])
    for j in junctions:
        jx, jy = int(round(j["x"])), int(round(j["y"]))
        cv2.circle(junctions_img, (jx, jy), 8, (0, 0, 255), -1)
        cv2.putText(junctions_img, str(j.get("id", "")), (jx + 10, jy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 255), 1)

    exits = result.get("extracted_exits", []) or result.get("exits", [])
    for e in exits:
        ex, ey = int(round(e["x"])), int(round(e["y"]))
        cv2.circle(endpoints_img, (ex, ey), 10, (0, 255, 255), -1)

    cv2.imwrite(str(out_p / "06_junctions.png"), junctions_img)
    cv2.imwrite(str(out_p / "07_endpoints.png"), endpoints_img)

    # 8. Graph Overlay on Original Blueprint
    overlay = canvas.copy()
    for t in tunnels:
        poly = t.get("polyline", [])
        if len(poly) >= 2:
            pts = np.array(poly, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(overlay, [pts], isClosed=False, color=(0, 255, 0), thickness=3)

    for j in junctions:
        jx, jy = int(round(j["x"])), int(round(j["y"]))
        cv2.circle(overlay, (jx, jy), 6, (0, 0, 255), -1)

    for e in exits:
        ex, ey = int(round(e["x"])), int(round(e["y"]))
        cv2.circle(overlay, (ex, ey), 8, (255, 255, 0), -1)

    cv2.imwrite(str(out_p / "08_graph_overlay.png"), overlay)

    # 9. Rejected edges
    rejected_img = canvas.copy()
    rejected_edges = result.get("rejected_edges", [])
    for rej in rejected_edges:
        if isinstance(rej, dict) and "chord" in rej:
            p1 = (int(rej["chord"][0][0]), int(rej["chord"][0][1]))
            p2 = (int(rej["chord"][1][0]), int(rej["chord"][1][1]))
        elif isinstance(rej, (list, tuple)) and len(rej) >= 2:
            p1 = (int(rej[0][0]), int(rej[0][1]))
            p2 = (int(rej[1][0]), int(rej[1][1]))
        else:
            continue
        cv2.line(rejected_img, p1, p2, (0, 0, 255), 2, cv2.LINE_AA)
    cv2.imwrite(str(out_p / "09_rejected_edges.png"), rejected_img)

    # 10. Final Digital Map (Clean vector layout on dark subterranean theme)
    digital_map = np.full((ch, cw, 3), 20, dtype=np.uint8)
    for t in tunnels:
        poly = t.get("polyline", [])
        if len(poly) >= 2:
            pts = np.array(poly, dtype=np.int32).reshape((-1, 1, 2))
            # Gallery corridor void
            cv2.polylines(digital_map, [pts], isClosed=False, color=(70, 70, 70), thickness=14)
            # Centerline
            cv2.polylines(digital_map, [pts], isClosed=False, color=(0, 230, 255), thickness=2)

    for j in junctions:
        jx, jy = int(round(j["x"])), int(round(j["y"]))
        cv2.circle(digital_map, (jx, jy), 7, (0, 100, 255), -1)
        cv2.circle(digital_map, (jx, jy), 3, (255, 255, 255), -1)

    for e in exits:
        ex, ey = int(round(e["x"])), int(round(e["y"]))
        cv2.circle(digital_map, (ex, ey), 10, (0, 255, 120), -1)
        cv2.putText(digital_map, e.get("name", "EXIT"), (ex + 12, ey + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 120), 1)

    cv2.imwrite(str(out_p / "10_final_map.png"), digital_map)

    # Side-by-Side: Original Blueprint vs Final Digital Map
    panel_orig = cv2.resize(canvas, (800, 600))
    panel_map = cv2.resize(digital_map, (800, 600))
    side_by_side = np.hstack([panel_orig, panel_map])
    cv2.putText(side_by_side, "SOURCE BLUEPRINT", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)
    cv2.putText(side_by_side, "PREDICTED DIGITAL MAP", (830, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)
    cv2.imwrite(str(out_p / "side_by_side_comparison.png"), side_by_side)

    print(f"Verification suite generated successfully in: {out_p}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Visual Verification Suite for Mine Blueprints")
    parser.add_argument("--image", type=str, required=True, help="Path to input blueprint image")
    parser.add_argument("--output_dir", type=str, default="data/evaluation/visual_debug")
    args = parser.parse_args()

    run_visual_validator(args.image, args.output_dir)
