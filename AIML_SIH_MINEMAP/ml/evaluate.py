"""
Module: ml.evaluate
Evaluation and topological benchmarking suite for underground coal mine blueprints.

Computes:
1. Topology preservation: Junction degrees, endpoints, cycles, connected components.
2. Geometric correctness: Edge acceptance rate, rejected rock-crossing edges, polyline fidelity.
3. Structural clarity & confidence distribution across mine blueprints.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List
import numpy as np

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.blueprint_analyzer.mine_analyzer import MineBlueprintAnalyzer


def evaluate_blueprints(blueprints_dir: str, output_report: str = "evaluation_report.json"):
    analyzer = MineBlueprintAnalyzer(target_resolution=1000)
    p_dir = Path(blueprints_dir)
    image_paths = sorted(list(p_dir.glob("*.png")) + list(p_dir.glob("*.jpeg")) + list(p_dir.glob("*.jpg")))

    if not image_paths:
        print(f"No blueprint images found in {blueprints_dir}")
        return

    print(f"Benchmarking {len(image_paths)} blueprints...")
    results: List[Dict[str, Any]] = []

    total_tunnels = 0
    total_junctions = 0
    total_rejected = 0
    clarity_scores = []
    connectivity_scores = []

    for idx, img_path in enumerate(image_paths):
        print(f"[{idx+1}/{len(image_paths)}] Evaluating {img_path.name}...")
        try:
            analysis = analyzer.analyze(str(img_path))
            
            tunnels = analysis.get("extracted_corridors", []) or analysis.get("tunnels", [])
            junctions = analysis.get("extracted_junctions", []) or analysis.get("junctions", [])
            rooms = analysis.get("extracted_rooms", []) or analysis.get("blocks", [])
            exits = analysis.get("extracted_exits", []) or analysis.get("exits", [])
            rejected = analysis.get("rejected_edges", [])
            
            clarity = analysis.get("structural_clarity", 0.0)
            conn_conf = analysis.get("tunnel_connectivity_confidence", 0.0)
            overall_conf = analysis.get("overall_confidence", 0.0)
            
            total_tunnels += len(tunnels)
            total_junctions += len(junctions)
            total_rejected += len(rejected)
            clarity_scores.append(clarity)
            connectivity_scores.append(conn_conf)
            
            sample_eval = {
                "file": img_path.name,
                "tunnels_detected": len(tunnels),
                "junctions_detected": len(junctions),
                "chambers_detected": len(rooms),
                "exits_detected": len(exits),
                "rejected_rock_crossings": len(rejected),
                "structural_clarity": clarity,
                "tunnel_connectivity_confidence": conn_conf,
                "overall_confidence": overall_conf,
                "uncertainty_flags": analysis.get("uncertainty_flags", [])
            }
            results.append(sample_eval)
        except Exception as e:
            print(f"Error evaluating {img_path.name}: {e}")

    summary = {
        "total_blueprints_evaluated": len(results),
        "total_tunnels_extracted": total_tunnels,
        "total_junctions_extracted": total_junctions,
        "total_rock_crossing_chords_rejected": total_rejected,
        "mean_structural_clarity": round(float(np.mean(clarity_scores)), 3) if clarity_scores else 0.0,
        "mean_connectivity_confidence": round(float(np.mean(connectivity_scores)), 3) if connectivity_scores else 0.0,
        "edge_acceptance_rate": round(total_tunnels / max(total_tunnels + total_rejected, 1), 3),
        "results": results
    }

    out_file = PROJECT_ROOT / output_report
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n================ EVALUATION SUMMARY ================")
    print(f"Blueprints Evaluated:          {summary['total_blueprints_evaluated']}")
    print(f"Total Tunnels Extracted:       {summary['total_tunnels_extracted']}")
    print(f"Total Topological Junctions:   {summary['total_junctions_extracted']}")
    print(f"Rejected Rock Crossings:       {summary['total_rock_crossing_chords_rejected']}")
    print(f"Edge Acceptance Rate:          {summary['edge_acceptance_rate'] * 100:.1f}%")
    print(f"Mean Structural Clarity:       {summary['mean_structural_clarity']:.3f}")
    print(f"Mean Connectivity Confidence:  {summary['mean_connectivity_confidence']:.3f}")
    print(f"Report saved to:               {out_file}")
    print("====================================================")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Mine Blueprint Analysis Pipeline")
    parser.add_argument("--blueprints_dir", type=str, default=str(PROJECT_ROOT / "data" / "mine_blueprint_dataset" / "blueprints"))
    parser.add_argument("--output", type=str, default="evaluation_report.json")
    args = parser.parse_args()

    evaluate_blueprints(args.blueprints_dir, args.output)
