"""
Module: backend.services.blueprint_analyzer.annotation_filter
Semantic perception and annotation suppression for underground mine blueprints.

Distinguishes real mine structures (pillars, extraction panels, galleries)
from non-navigable drawing annotations:
- Alphanumeric text and handwritten survey dates (e.g. 5.31.40, 7.24.40)
- Elevation numbers, survey offsets, and dimension lines
- Legend tables, title blocks, and border frames
- Arrowheads, manway symbols, and hatching noise

Based on the Coal Authority Code of Surveying Practice guidelines:
- Solid coal pillars are enclosed geometric bodies
- Traversable galleries are the continuous interconnected void network between pillars
- Multi-branch junctions occur at physical gallery intersections (degree >= 3)
"""

import math
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import cv2
from skimage.morphology import skeletonize


class MineAnnotationFilter:
    """
    Robust perception filter separating subterranean mine workings from survey annotations.
    """

    def __init__(self, min_pillar_area: float = 200.0, max_text_glyph_area: float = 500.0):
        self.min_pillar_area = min_pillar_area
        self.max_text_glyph_area = max_text_glyph_area

    def binarize_blueprint(self, gray: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        Adaptive polarity and contrast-tuned binarization.
        Detects whether blueprint is cyanotype/dark-background or white paper,
        and cleanly isolates foreground drawing lines without capturing background paper grain.
        """
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        norm = clahe.apply(gray)
        blurred = cv2.bilateralFilter(norm, d=5, sigmaColor=40, sigmaSpace=40)

        median_val = float(np.median(gray))
        is_dark_bg = median_val < 128

        if is_dark_bg:
            # On cyan or dark blueprints, drawing lines are bright
            thresh_candidate = max(int(np.percentile(blurred, 82)), 110)
            _, binary = cv2.threshold(blurred, thresh_candidate, 255, cv2.THRESH_BINARY)
            fg_ratio = np.mean(binary > 0)
            if fg_ratio < 0.04:
                _, binary = cv2.threshold(blurred, 90, 255, cv2.THRESH_BINARY)
            elif fg_ratio > 0.40:
                thresh_candidate = int(np.percentile(blurred, 88))
                _, binary = cv2.threshold(blurred, thresh_candidate, 255, cv2.THRESH_BINARY)
        else:
            # Light background blueprint with dark lines
            thresh_candidate = min(int(np.percentile(blurred, 25)), 140)
            _, binary = cv2.threshold(blurred, thresh_candidate, 255, cv2.THRESH_BINARY_INV)
            fg_ratio = np.mean(binary > 0)
            if fg_ratio < 0.04:
                _, binary = cv2.threshold(blurred, 160, 255, cv2.THRESH_BINARY_INV)

        return binary, is_dark_bg

    def segment_pillars_and_galleries(
        self,
        binary_lines: np.ndarray,
        plan_roi_mask: np.ndarray
    ) -> Dict[str, Any]:
        """
        Segments solid coal pillars and derives the traversable gallery network.
        Filters out text characters, numbers, tick marks, and isolated noise.
        """
        h, w = binary_lines.shape[:2]
        roi_lines = cv2.bitwise_and(binary_lines, plan_roi_mask)

        # 1. Connected components analysis for raw component categorization
        num_cc, labels, stats, centroids = cv2.connectedComponentsWithStats(roi_lines, connectivity=8)
        
        text_mask = np.zeros((h, w), dtype=np.uint8)
        feature_mask = np.zeros((h, w), dtype=np.uint8)
        raw_components = max(num_cc - 1, 0)
        rejected_text_count = 0
        accepted_component_count = 0

        for i in range(1, num_cc):
            area = stats[i, cv2.CC_STAT_AREA]
            cw = stats[i, cv2.CC_STAT_WIDTH]
            ch = stats[i, cv2.CC_STAT_HEIGHT]

            # Text / Numbers / Small specks:
            is_text = False
            if area < 25:
                is_text = True
            elif (cw <= 48 and ch <= 48 and area <= self.max_text_glyph_area):
                is_text = True
            elif (max(cw, ch) <= 65 and min(cw, ch) <= 28 and area <= 320):
                is_text = True

            if is_text:
                text_mask[labels == i] = 255
                rejected_text_count += 1
            else:
                feature_mask[labels == i] = 255
                accepted_component_count += 1

        # 2. Extract closed contours to identify solid coal pillars and extraction blocks
        cnts, _ = cv2.findContours(feature_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        pillar_mask = np.zeros((h, w), dtype=np.uint8)
        pillar_count = 0

        for c in cnts:
            area = cv2.contourArea(c)
            bx, by, bw, bh = cv2.boundingRect(c)
            if area >= self.min_pillar_area and bw >= 16 and bh >= 16:
                cv2.drawContours(pillar_mask, [c], -1, 255, -1)
                pillar_count += 1

        pillar_coverage = float(np.mean(pillar_mask > 0))

        if pillar_coverage > 0.08:
            # Bord-and-pillar survey plan: galleries are the voids between pillars inside Plan ROI
            gallery_mask = cv2.bitwise_and(cv2.bitwise_not(pillar_mask), plan_roi_mask)
            gallery_mask = cv2.bitwise_and(gallery_mask, cv2.bitwise_not(text_mask))
            gallery_mask = cv2.morphologyEx(gallery_mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            gallery_mask = cv2.morphologyEx(gallery_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        else:
            # CAD / Digital map where gallery drifts are explicitly drawn lines/conduits
            gallery_mask = cv2.morphologyEx(feature_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
            gallery_mask = cv2.bitwise_and(gallery_mask, plan_roi_mask)

        # 3. Compute skeleton and prune short dead-end spurs (< 25 px)
        skel = skeletonize(gallery_mask > 0).astype(np.uint8) * 255
        num_sk, sk_labels, sk_stats, _ = cv2.connectedComponentsWithStats(skel, connectivity=8)
        clean_skel = np.zeros_like(skel)
        for k in range(1, num_sk):
            if sk_stats[k, cv2.CC_STAT_AREA] >= 25:
                clean_skel[sk_labels == k] = 255

        diag_stats = {
            "raw_components": raw_components,
            "rejected_as_text_or_noise": rejected_text_count,
            "accepted_tunnel_components": accepted_component_count,
            "detected_pillars_count": pillar_count,
            "pillar_coverage_pct": round(pillar_coverage * 100.0, 1),
            "gallery_void_pixels": int(np.sum(gallery_mask > 0)),
            "skeleton_pixels": int(np.sum(clean_skel > 0))
        }

        return {
            "pillar_mask": pillar_mask,
            "gallery_mask": gallery_mask,
            "text_mask": text_mask,
            "clean_skeleton": clean_skel,
            "stats": diag_stats
        }
