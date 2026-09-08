"""
Module: backend.services.blueprint_analyzer.preprocessing
Modular image preprocessing pipeline for underground mine blueprints and engineering plans.
Each stage is individually testable and callable in isolation.
"""

import os
from pathlib import Path
from typing import Union, Tuple, Optional, Dict, Any
import numpy as np
import cv2

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False


class MineBlueprintPreprocessor:
    """
    Modular preprocessing pipeline specifically designed for high-resolution
    underground coal mine plans, engineering blueprints, and scanned survey drawings.
    """

    def __init__(
        self,
        target_dpi: int = 300,
        clahe_clip_limit: float = 2.5,
        clahe_tile_grid_size: Tuple[int, int] = (8, 8),
        min_text_area: int = 25,
        max_text_area: int = 450
    ):
        self.target_dpi = target_dpi
        self.clahe_clip_limit = clahe_clip_limit
        self.clahe_tile_grid_size = clahe_tile_grid_size
        self.min_text_area = min_text_area
        self.max_text_area = max_text_area

    def pdf_to_image(self, pdf_path: Union[str, Path], page_num: int = 0) -> np.ndarray:
        """Converts a PDF page to a high-resolution BGR numpy image."""
        if not PYMUPDF_AVAILABLE:
            raise ImportError("PyMuPDF is required for PDF blueprint conversion. Please install PyMuPDF.")
        
        doc = fitz.open(str(pdf_path))
        if page_num >= len(doc):
            raise ValueError(f"Page {page_num} out of bounds for PDF with {len(doc)} pages.")
        
        page = doc.load_page(page_num)
        zoom = self.target_dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
        img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        doc.close()
        return img_bgr

    def load_image(self, input_source: Union[str, Path, np.ndarray]) -> np.ndarray:
        """Loads image from disk or returns array directly."""
        if isinstance(input_source, np.ndarray):
            return input_source.copy()
        
        path_str = str(input_source)
        if path_str.lower().endswith(".pdf"):
            return self.pdf_to_image(path_str)
        
        img = cv2.imread(path_str)
        if img is None:
            raise FileNotFoundError(f"Could not load image at path: {path_str}")
        return img

    def to_grayscale(self, img: np.ndarray) -> np.ndarray:
        """Converts BGR or RGBA image to 8-bit single-channel grayscale."""
        if len(img.shape) == 2:
            return img.copy()
        if img.shape[2] == 4:
            return cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    def normalize_contrast(self, gray: np.ndarray) -> np.ndarray:
        """Applies Contrast Limited Adaptive Histogram Equalization (CLAHE)."""
        clahe = cv2.createCLAHE(
            clipLimit=self.clahe_clip_limit,
            tileGridSize=self.clahe_tile_grid_size
        )
        return clahe.apply(gray)

    def denoise(self, gray: np.ndarray, method: str = "bilateral") -> np.ndarray:
        """Suppresses scanner grain, dust, and speckled artifacts while preserving edge sharpness."""
        if method == "bilateral":
            return cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)
        elif method == "median":
            return cv2.medianBlur(gray, 3)
        elif method == "gaussian":
            return cv2.GaussianBlur(gray, (5, 5), 0)
        return gray

    def adaptive_threshold(self, gray: np.ndarray, invert: bool = True) -> np.ndarray:
        """
        Adaptive binarization ensuring consistent segmentation across varied paper aging.
        If invert=True, dark lines on light background become white (255) foreground.
        """
        mean_val = np.mean(gray)
        if mean_val < 128:
            thresh_mode = cv2.THRESH_BINARY if invert else cv2.THRESH_BINARY_INV
        else:
            thresh_mode = cv2.THRESH_BINARY_INV if invert else cv2.THRESH_BINARY

        binary = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            thresh_mode,
            blockSize=25,
            C=9
        )
        return binary

    def deskew(self, binary: np.ndarray) -> Tuple[np.ndarray, float]:
        """Detects dominant orientation using minAreaRect and rotates image."""
        coords = np.column_stack(np.where(binary > 0))
        if len(coords) < 100:
            return binary.copy(), 0.0
        
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle
            
        if abs(angle) < 0.2 or abs(angle) > 15.0:
            return binary.copy(), 0.0

        h, w = binary.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(binary, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated, float(angle)

    def enhance_lines(self, binary: np.ndarray) -> np.ndarray:
        """Enhances continuous tunnel walls and boundary structures using directional morphological kernels."""
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15))
        
        h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
        v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)
        
        enhanced = cv2.bitwise_or(binary, cv2.bitwise_or(h_lines, v_lines))
        return enhanced

    def remove_text_and_small_noise(
        self,
        binary: np.ndarray,
        min_area: Optional[int] = None,
        max_area: Optional[int] = None
    ) -> np.ndarray:
        """
        Removes survey elevation labels, room text codes, and isolated speckle noise
        via Connected Component Analysis, preserving large continuous tunnel boundaries.
        """
        min_a = min_area if min_area is not None else self.min_text_area
        max_a = max_area if max_area is not None else self.max_text_area

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
        cleaned = binary.copy()

        for label in range(1, num_labels):
            area = stats[label, cv2.CC_STAT_AREA]
            w = stats[label, cv2.CC_STAT_WIDTH]
            h = stats[label, cv2.CC_STAT_HEIGHT]
            aspect_ratio = max(w, h) / max(min(w, h), 1)

            if area < min_a:
                cleaned[labels == label] = 0
            elif min_a <= area <= max_a and aspect_ratio < 4.5:
                cleaned[labels == label] = 0

        return cleaned

    def morphological_cleanup(self, binary: np.ndarray) -> np.ndarray:
        """Closes micro-gaps in tunnel boundaries and eliminates small spur artifacts."""
        close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, close_kernel)
        return closed

    def run_full_pipeline(
        self,
        input_source: Union[str, Path, np.ndarray],
        return_intermediate: bool = False
    ) -> Union[np.ndarray, Tuple[np.ndarray, Dict[str, np.ndarray]]]:
        """
        Runs the complete, reproducible preprocessing pipeline on a blueprint.
        """
        raw_bgr = self.load_image(input_source)
        gray = self.to_grayscale(raw_bgr)
        contrast = self.normalize_contrast(gray)
        denoised = self.denoise(contrast, method="bilateral")
        binary = self.adaptive_threshold(denoised, invert=True)
        deskewed, skew_angle = self.deskew(binary)
        enhanced = self.enhance_lines(deskewed)
        text_removed = self.remove_text_and_small_noise(enhanced)
        cleaned = self.morphological_cleanup(text_removed)

        if return_intermediate:
            intermediates = {
                "raw_bgr": raw_bgr,
                "gray": gray,
                "contrast": contrast,
                "denoised": denoised,
                "binary": binary,
                "deskewed": deskewed,
                "skew_angle": skew_angle,
                "enhanced": enhanced,
                "text_removed": text_removed,
                "final_cleaned": cleaned
            }
            return cleaned, intermediates

        return cleaned
