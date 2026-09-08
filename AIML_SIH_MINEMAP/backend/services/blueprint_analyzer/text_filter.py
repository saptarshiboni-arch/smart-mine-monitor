"""
Module: backend.services.blueprint_analyzer.text_filter
Multi-stage text and annotation filter for underground mine blueprints.

PROBLEM: Historical mine plans are densely annotated with handwritten text,
elevation numbers, miner IDs, survey codes, and dimension labels.
The previous model interpreted ALL of these as tunnel structures, causing
thousands of false detections.

SOLUTION: Multi-stage filtering pipeline that classifies each connected component
as either STRUCTURE (tunnel/pillar/wall) or TEXT (annotation/label/noise) using
geometric, morphological, and contextual features — without destroying actual
thin tunnel lines.

Key design principles:
1. Text characters are compact (low area, moderate aspect ratio)
2. Tunnel lines are elongated (high aspect ratio OR large span)
3. Text clusters in isolation; tunnels connect to the network
4. Text has consistent stroke width; tunnels have varying width
5. We assign probability instead of hard binary — soft filtering
"""

from typing import List, Dict, Tuple, Optional, Any
import numpy as np
import cv2


class MineTextFilter:
    """
    Classifies connected components in a binarized mine blueprint
    as either structural geometry or text/annotation noise.
    
    Uses a multi-feature scoring system rather than hard thresholds
    to reduce false negatives (real tunnels wrongly deleted).
    """

    def __init__(
        self,
        # Component size thresholds
        min_noise_area: int = 15,       # Absolute noise floor — always remove
        small_component_area: int = 80, # Components below this are very likely text
        medium_component_area: int = 400, # Components below this need further analysis
        
        # Shape thresholds
        text_aspect_ratio_max: float = 5.0,  # Text characters are rarely this elongated
        tunnel_aspect_ratio_min: float = 6.0, # Tunnels are typically very elongated
        
        # Connectivity thresholds
        connectivity_radius: int = 30,   # Pixels to search for nearby large components
        large_component_min: int = 1000, # Minimum area to be "large" (anchor component)
        
        # Stroke width analysis
        swt_tolerance: float = 0.4,     # Stroke width consistency threshold
        
        # Confidence thresholds
        text_confidence_threshold: float = 0.65,  # Above this → classified as text
    ):
        self.min_noise_area = min_noise_area
        self.small_component_area = small_component_area
        self.medium_component_area = medium_component_area
        self.text_aspect_ratio_max = text_aspect_ratio_max
        self.tunnel_aspect_ratio_min = tunnel_aspect_ratio_min
        self.connectivity_radius = connectivity_radius
        self.large_component_min = large_component_min
        self.swt_tolerance = swt_tolerance
        self.text_confidence_threshold = text_confidence_threshold

    def filter_text(
        self,
        binary_mask: np.ndarray,
        return_diagnostics: bool = False
    ) -> "Tuple[np.ndarray, Optional[Dict[str, Any]]]":
        """
        Filters text and annotation noise from a binarized mine blueprint.
        
        Args:
            binary_mask: uint8 image where 255 = foreground (lines/text), 0 = background
            return_diagnostics: If True, returns diagnostic info for debugging
            
        Returns:
            Tuple of:
                - cleaned_mask: uint8 image with text components removed
                - diagnostics: Dict with per-component analysis (if requested)
        """
        h, w = binary_mask.shape[:2]
        
        # Step 1: Connected Component Analysis
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            binary_mask, connectivity=8
        )
        
        # Pre-compute the distance transform for connectivity analysis
        # Dilate the large components to create a "proximity field"
        large_component_mask = np.zeros_like(binary_mask)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] >= self.large_component_min:
                large_component_mask[labels == i] = 255
        
        # Create proximity map: distance to nearest large component
        if np.sum(large_component_mask) > 0:
            dilated = cv2.dilate(
                large_component_mask,
                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, 
                                         (self.connectivity_radius * 2 + 1,
                                          self.connectivity_radius * 2 + 1))
            )
        else:
            dilated = np.zeros_like(binary_mask)
        
        # Step 2: Score each component
        cleaned = binary_mask.copy()
        diagnostics = {"components": [], "removed": 0, "kept": 0, "total": num_labels - 1}
        
        for label_id in range(1, num_labels):
            area = stats[label_id, cv2.CC_STAT_AREA]
            comp_x = stats[label_id, cv2.CC_STAT_LEFT]
            comp_y = stats[label_id, cv2.CC_STAT_TOP]
            comp_w = stats[label_id, cv2.CC_STAT_WIDTH]
            comp_h = stats[label_id, cv2.CC_STAT_HEIGHT]
            cx, cy = centroids[label_id]
            
            # Feature 1: ABSOLUTE NOISE — always remove
            if area < self.min_noise_area:
                cleaned[labels == label_id] = 0
                diagnostics["removed"] += 1
                if return_diagnostics:
                    diagnostics["components"].append({
                        "label": label_id, "area": area,
                        "verdict": "NOISE", "confidence": 1.0
                    })
                continue
            
            # Feature 2: Aspect ratio
            aspect = max(comp_w, comp_h) / max(min(comp_w, comp_h), 1)
            
            # Feature 3: Fill ratio (area / bounding box area)
            bbox_area = comp_w * comp_h
            fill_ratio = area / max(bbox_area, 1)
            
            # Feature 4: Compactness (perimeter² / area) — text is more compact
            comp_mask = (labels == label_id).astype(np.uint8) * 255
            contours, _ = cv2.findContours(
                comp_mask[comp_y:comp_y+comp_h, comp_x:comp_x+comp_w],
                cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            perimeter = sum(cv2.arcLength(c, True) for c in contours)
            compactness = (perimeter ** 2) / max(area, 1)
            
            # Feature 5: Connectivity to large components
            overlap = np.sum(
                dilated[comp_y:comp_y+comp_h, comp_x:comp_x+comp_w] & 
                comp_mask[comp_y:comp_y+comp_h, comp_x:comp_x+comp_w]
            ) > 0
            is_connected_to_network = overlap
            
            # Feature 6: Span relative to image
            span_x = comp_w / w
            span_y = comp_h / h
            max_span = max(span_x, span_y)
            
            # Feature 7: Stroke width consistency (approximate via distance transform)
            if area > 30:
                dt = cv2.distanceTransform(
                    comp_mask[comp_y:comp_y+comp_h, comp_x:comp_x+comp_w],
                    cv2.DIST_L2, 5
                )
                stroke_pixels = dt[dt > 0]
                if len(stroke_pixels) > 5:
                    stroke_std = np.std(stroke_pixels)
                    stroke_mean = np.mean(stroke_pixels)
                    stroke_cv = stroke_std / max(stroke_mean, 0.1)  # Coefficient of variation
                else:
                    stroke_cv = 0.0
            else:
                stroke_cv = 0.0
            
            # ===== SCORING =====
            text_score = 0.0
            
            # Size scoring
            if area < self.small_component_area:
                text_score += 0.30  # Small = likely text
            elif area < self.medium_component_area:
                text_score += 0.15  # Medium = uncertain
            else:
                text_score -= 0.15  # Large = likely structure
            
            # Shape scoring
            if aspect < self.text_aspect_ratio_max:
                text_score += 0.15  # Compact = text-like
            elif aspect > self.tunnel_aspect_ratio_min:
                text_score -= 0.25  # Very elongated = tunnel-like
            
            # Fill ratio scoring
            if fill_ratio > 0.5:
                text_score += 0.10  # Dense fill = text character
            elif fill_ratio < 0.15:
                text_score -= 0.10  # Sparse = structural line
            
            # Compactness scoring
            if compactness > 80:
                text_score += 0.10  # Highly compact = text
            elif compactness < 30:
                text_score -= 0.10  # Not compact = structure
            
            # Connectivity scoring (most important feature)
            if not is_connected_to_network:
                text_score += 0.20  # Isolated = likely text
            else:
                text_score -= 0.25  # Connected to network = likely structure
            
            # Span scoring
            if max_span > 0.15:
                text_score -= 0.30  # Spans > 15% of image = definitely structure
            elif max_span < 0.03:
                text_score += 0.10  # Very small span = likely text
            
            # Stroke width consistency
            if stroke_cv < self.swt_tolerance:
                text_score += 0.10  # Consistent stroke = text
            else:
                text_score -= 0.05  # Variable stroke = structure
            
            # Clamp to [0, 1]
            text_score = max(0.0, min(1.0, text_score + 0.3))  # Bias toward text for small things
            
            # Override: if component is clearly a large structure, force keep
            if area > 2000 and max_span > 0.05:
                text_score = min(text_score, 0.2)
            
            # Override: very elongated thin lines are almost certainly tunnels
            if aspect > 10 and area > 50:
                text_score = min(text_score, 0.15)
            
            # Decision
            is_text = text_score >= self.text_confidence_threshold
            
            if is_text:
                cleaned[labels == label_id] = 0
                diagnostics["removed"] += 1
            else:
                diagnostics["kept"] += 1
            
            if return_diagnostics:
                diagnostics["components"].append({
                    "label": label_id,
                    "area": int(area),
                    "width": int(comp_w),
                    "height": int(comp_h),
                    "aspect": round(aspect, 2),
                    "fill_ratio": round(fill_ratio, 3),
                    "compactness": round(compactness, 1),
                    "connected": bool(is_connected_to_network),
                    "span": round(max_span, 4),
                    "stroke_cv": round(stroke_cv, 3),
                    "text_score": round(text_score, 3),
                    "verdict": "TEXT" if is_text else "STRUCTURE"
                })
        
        return cleaned, diagnostics if return_diagnostics else None

    def filter_text_multiscale(
        self,
        binary_mask: np.ndarray,
        scales: Tuple[float, ...] = (1.0, 0.5),
        return_diagnostics: bool = False
    ) -> "Tuple[np.ndarray, Optional[Dict[str, Any]]]":
        """
        Multi-scale text filtering. Runs the filter at multiple resolutions
        and combines results. This catches both large labels and tiny noise.
        
        At lower scales, text that appears connected at full resolution
        may separate into individual characters, making detection easier.
        """
        h, w = binary_mask.shape[:2]
        combined_text_mask = np.zeros((h, w), dtype=np.float32)
        all_diagnostics = {}
        
        for scale in scales:
            if scale == 1.0:
                scaled = binary_mask
            else:
                new_w = int(w * scale)
                new_h = int(h * scale)
                scaled = cv2.resize(binary_mask, (new_w, new_h), 
                                   interpolation=cv2.INTER_NEAREST)
            
            cleaned, diag = self.filter_text(scaled, return_diagnostics=True)
            
            # Create text probability map
            if scale == 1.0:
                text_prob = ((binary_mask > 0).astype(np.float32) - 
                            (cleaned > 0).astype(np.float32))
            else:
                text_at_full = binary_mask.astype(np.float32) - \
                    cv2.resize(cleaned, (w, h), 
                              interpolation=cv2.INTER_NEAREST).astype(np.float32)
                text_prob = np.clip(text_at_full / 255.0, 0, 1)
            
            combined_text_mask += text_prob * (1.0 / len(scales))
            
            if return_diagnostics:
                all_diagnostics[f"scale_{scale}"] = diag
        
        # Threshold the combined probability
        final_text_mask = (combined_text_mask >= 0.5).astype(np.uint8) * 255
        cleaned = cv2.bitwise_and(binary_mask, cv2.bitwise_not(final_text_mask))
        
        if return_diagnostics:
            all_diagnostics["combined_text_pixels"] = int(np.sum(final_text_mask > 0))
            all_diagnostics["remaining_structure_pixels"] = int(np.sum(cleaned > 0))
            all_diagnostics["text_removal_ratio"] = round(
                all_diagnostics["combined_text_pixels"] / 
                max(int(np.sum(binary_mask > 0)), 1), 3
            )
        
        return cleaned, all_diagnostics if return_diagnostics else None
