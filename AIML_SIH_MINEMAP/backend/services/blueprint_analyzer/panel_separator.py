"""
Module: backend.services.blueprint_analyzer.panel_separator
Separates multi-panel historical and CAD mining drawings.
Underground coal mine engineering drawings typically contain:
- PLAN VIEW (top-down underground workings, pillars, galleries)
- LONGITUDINAL SECTION (vertical elevation profile along seam)
- CROSS SECTION (perpendicular geological profile)
- LEGEND / TITLE BLOCK (surveyor data, seam thickness, company info)

This module isolates the primary PLAN VIEW to prevent cross-contamination
of non-navigable drawing panels into the navigation graph.
"""

from typing import Tuple, Dict, Any, Optional
import numpy as np
import cv2


class DrawingPanelSeparator:
    """
    Isolates the primary Plan View coordinate space and removes
    extraneous drawing panels (legends, title blocks, section elevations).
    """

    def __init__(self, border_margin_pct: float = 0.03):
        self.border_margin_pct = border_margin_pct

    def isolate_plan_view(
        self,
        binary_image: np.ndarray,
        raw_bgr: Optional[np.ndarray] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Detects panel divider lines, title blocks, and legend boxes,
        returning a binary mask covering ONLY the primary Plan View region.

        Args:
            binary_image: Binarized blueprint (255 = features/lines, 0 = background).
            raw_bgr: Optional original BGR image for color cues.

        Returns:
            Tuple of:
              - plan_view_mask (np.ndarray uint8): 255 within plan view, 0 outside.
              - metadata (dict): Bounding coordinates of detected regions.
        """
        h, w = binary_image.shape[:2]
        min_x = int(w * self.border_margin_pct)
        max_x = int(w * (1.0 - self.border_margin_pct))
        min_y = int(h * self.border_margin_pct)
        max_y = int(h * (1.0 - self.border_margin_pct))

        # 1. Detect prominent vertical dividing lines (e.g. right-side legend table)
        # Search in the right 30% of the image
        vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, int(h * 0.15)))
        v_lines = cv2.morphologyEx(binary_image, cv2.MORPH_OPEN, vert_kernel)

        legend_boundary_x = max_x
        for x in range(int(w * 0.68), int(w * 0.90)):
            col_density = np.sum(v_lines[:, x] > 0) / float(h)
            if col_density > 0.35:
                legend_boundary_x = max(min_x, x - 15)
                break

        # 2. Detect prominent horizontal dividing lines (e.g. bottom section views)
        # Search in the bottom 30% of the image
        horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (int(w * 0.20), 1))
        h_lines = cv2.morphologyEx(binary_image, cv2.MORPH_OPEN, horiz_kernel)

        section_boundary_y = max_y
        for y in range(int(h * 0.70), int(h * 0.92)):
            row_density = np.sum(h_lines[y, min_x:legend_boundary_x] > 0) / float(legend_boundary_x - min_x)
            if row_density > 0.40:
                section_boundary_y = max(min_y, y - 15)
                break

        # 3. Detect top title / notes table (repeated horizontal lines in top 18%)
        plan_min_y = min_y
        for y in range(min_y, int(h * 0.18)):
            row_density = np.sum(h_lines[y, min_x:legend_boundary_x] > 0) / float(legend_boundary_x - min_x)
            if row_density > 0.25:
                plan_min_y = max(plan_min_y, y + 12)

        # 4. Create Plan View ROI Mask
        plan_view_mask = np.zeros((h, w), dtype=np.uint8)
        plan_view_mask[plan_min_y:section_boundary_y, min_x:legend_boundary_x] = 255

        # 4. Filter text labels and tiny noise (< 160 px connected components)
        roi_binary = cv2.bitwise_and(binary_image, plan_view_mask)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(roi_binary, connectivity=8)

        cleaned_plan_mask = np.zeros_like(binary_image)
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            cw = stats[i, cv2.CC_STAT_WIDTH]
            ch = stats[i, cv2.CC_STAT_HEIGHT]

            # Underground coal galleries have substantial area or span
            # Text, numbers, arrowheads, tick marks are compact (< 160 px)
            if area >= 160 and (cw >= 18 or ch >= 18):
                cleaned_plan_mask[labels == i] = 255

        metadata = {
            "plan_bounds": {
                "min_x": min_x,
                "min_y": min_y,
                "max_x": legend_boundary_x,
                "max_y": section_boundary_y
            },
            "legend_detected": legend_boundary_x < max_x,
            "section_detected": section_boundary_y < max_y,
            "total_pixels": int(np.sum(cleaned_plan_mask > 0))
        }

        return cleaned_plan_mask, metadata
