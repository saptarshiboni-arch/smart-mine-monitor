"""
Module: ml.generate_self_supervised_masks
Generates self-supervised pseudo-ground-truth segmentation masks from the
improved explainable heuristic pipeline (text filter + skeletonization + panel separator).

These masks are used to fine-tune the ResNet34-UNet segmentation model
on real mine blueprints without requiring manual pixel-level annotations.
"""

import os
import sys
import json
import numpy as np
import cv2
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.blueprint_analyzer.mine_analyzer import MineBlueprintAnalyzer
from ml.dataset import CLASSES, CLASS_COLORS


def generate_mask_from_analysis(analysis_result: dict, canvas_shape: tuple) -> np.ndarray:
    """
    Constructs a 3-channel RGB segmentation mask matching the 9 semantic classes
    from the structured outputs of MineBlueprintAnalyzer.
    """
    h, w = canvas_shape[:2]
    mask_rgb = np.zeros((h, w, 3), dtype=np.uint8)

    # 1. Tunnels / Galleries: draw along continuous polylines with realistic gallery width (12px)
    tunnel_color = CLASS_COLORS["TUNNEL"]
    tunnels = analysis_result.get("extracted_corridors", []) or analysis_result.get("tunnels", [])
    for t in tunnels:
        poly = t.get("polyline", [])
        if len(poly) >= 2:
            pts = np.array(poly, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(mask_rgb, [pts], isClosed=False, color=tunnel_color, thickness=12)

    # 2. Chambers / Stopes: filled rectangles / contours
    chamber_color = CLASS_COLORS["CHAMBER"]
    rooms = analysis_result.get("extracted_rooms", []) or analysis_result.get("blocks", [])
    for r in rooms:
        rx, ry = int(round(r.get("x", 0))), int(round(r.get("y", 0)))
        rw, rh = int(round(r.get("width", 80))), int(round(r.get("height", 50)))
        top_left = (max(0, rx - rw // 2), max(0, ry - rh // 2))
        bottom_right = (min(w - 1, rx + rw // 2), min(h - 1, ry + rh // 2))
        cv2.rectangle(mask_rgb, top_left, bottom_right, chamber_color, -1)

    # 3. Junctions: filled circles at intersection points
    junction_color = CLASS_COLORS["JUNCTION"]
    junctions = analysis_result.get("extracted_junctions", []) or analysis_result.get("junctions", [])
    for j in junctions:
        jx, jy = int(round(j.get("x", 0))), int(round(j.get("y", 0)))
        cv2.circle(mask_rgb, (jx, jy), 10, junction_color, -1)

    # 4. Vertical Shafts
    shaft_color = CLASS_COLORS["SHAFT"]
    shafts = analysis_result.get("extracted_shafts", [])
    for s in shafts:
        sx, sy = int(round(s.get("x", 0))), int(round(s.get("y", 0)))
        cv2.circle(mask_rgb, (sx, sy), 14, shaft_color, -1)

    # 5. Exits / Surface Portals
    exit_color = CLASS_COLORS["EXIT"]
    exits = analysis_result.get("extracted_exits", []) or analysis_result.get("exits", [])
    for e in exits:
        ex, ey = int(round(e.get("x", 0))), int(round(e.get("y", 0)))
        cv2.circle(mask_rgb, (ex, ey), 16, exit_color, -1)

    # 6. Refuge Chambers
    refuge_color = CLASS_COLORS["REFUGE_CHAMBER"]
    refuges = analysis_result.get("extracted_refuges", []) or analysis_result.get("refuges", [])
    for rf in refuges:
        rfx, rfy = int(round(rf.get("x", 0))), int(round(rf.get("y", 0)))
        cv2.rectangle(mask_rgb, (rfx - 15, rfy - 15), (rfx + 15, rfy + 15), refuge_color, -1)

    return mask_rgb


def run_pipeline():
    blueprints_dir = PROJECT_ROOT / "data" / "mine_blueprint_dataset" / "blueprints"
    masks_dir = PROJECT_ROOT / "data" / "mine_blueprint_dataset" / "masks"
    train_img_dir = PROJECT_ROOT / "data" / "mine_blueprint_dataset" / "train" / "images"
    train_mask_dir = PROJECT_ROOT / "data" / "mine_blueprint_dataset" / "train" / "masks"
    val_img_dir = PROJECT_ROOT / "data" / "mine_blueprint_dataset" / "val" / "images"
    val_mask_dir = PROJECT_ROOT / "data" / "mine_blueprint_dataset" / "val" / "masks"

    for d in [masks_dir, train_img_dir, train_mask_dir, val_img_dir, val_mask_dir]:
        d.mkdir(parents=True, exist_ok=True)

    blueprint_files = sorted(list(blueprints_dir.glob("*.png")) + list(blueprints_dir.glob("*.jpeg")) + list(blueprints_dir.glob("*.jpg")))
    print(f"Found {len(blueprint_files)} blueprints for self-supervised mask generation.")

    analyzer = MineBlueprintAnalyzer(target_resolution=1000)
    generated_count = 0

    for idx, bp_path in enumerate(blueprint_files):
        print(f"[{idx+1}/{len(blueprint_files)}] Processing {bp_path.name}...")
        try:
            result = analyzer.analyze(str(bp_path))
            dims = result.get("dimensions", {"width": 1000, "height": 800})
            w, h = dims["width"], dims["height"]

            # Generate RGB mask
            mask_rgb = generate_mask_from_analysis(result, (h, w))

            # Resize original image to match canvas dimensions
            orig_img = cv2.imread(str(bp_path))
            if orig_img is not None:
                resized_orig = cv2.resize(orig_img, (w, h), interpolation=cv2.INTER_AREA)
            else:
                resized_orig = np.zeros((h, w, 3), dtype=np.uint8)

            # Save in main masks directory
            mask_filename = f"{bp_path.stem}_mask.png"
            cv2.imwrite(str(masks_dir / mask_filename), cv2.cvtColor(mask_rgb, cv2.COLOR_RGB2BGR))

            # Split 80% train / 20% validation
            target_img_dir = val_img_dir if idx % 5 == 0 else train_img_dir
            target_mask_dir = val_mask_dir if idx % 5 == 0 else train_mask_dir

            sample_name = f"{bp_path.stem}.png"
            cv2.imwrite(str(target_img_dir / sample_name), resized_orig)
            cv2.imwrite(str(target_mask_dir / sample_name), cv2.cvtColor(mask_rgb, cv2.COLOR_RGB2BGR))

            generated_count += 1
        except Exception as e:
            print(f"Failed to generate mask for {bp_path.name}: {e}")

    print(f"\nSuccessfully generated {generated_count} self-supervised masks!")
    print(f"Train samples: {len(list(train_img_dir.glob('*.png')))}")
    print(f"Val samples: {len(list(val_img_dir.glob('*.png')))}")


if __name__ == "__main__":
    run_pipeline()
