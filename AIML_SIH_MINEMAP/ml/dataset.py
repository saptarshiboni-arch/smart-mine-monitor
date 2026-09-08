import os
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset

# Define 9 semantic classes based on Phase 8 / Rule #5 specifications
CLASSES = [
    "BACKGROUND",       # 0: Solid rock, coal seam, border margin
    "TUNNEL",           # 1: Gallery corridors, headings, crosscuts
    "JUNCTION",         # 2: Gallery intersections (degree >= 3)
    "CHAMBER",          # 3: Large open areas, stopes, production panels
    "SHAFT",            # 4: Vertical access & ventilation shafts
    "ENTRANCE",         # 5: Surface access portals & adits
    "EXIT",             # 6: Emergency egress points
    "REFUGE_CHAMBER",   # 7: Fresh air emergency safety chambers
    "UNKNOWN",          # 8: Unresolved / low confidence structures
]

CLASS_COLORS = {
    "BACKGROUND": (0, 0, 0),          # Black
    "TUNNEL": (255, 255, 255),        # White
    "JUNCTION": (0, 0, 255),          # Red
    "CHAMBER": (0, 255, 0),           # Green
    "SHAFT": (255, 0, 0),             # Blue
    "ENTRANCE": (255, 165, 0),        # Orange
    "EXIT": (255, 255, 0),            # Yellow
    "REFUGE_CHAMBER": (0, 255, 255),  # Cyan
    "UNKNOWN": (128, 128, 128),       # Gray
}

class MineBlueprintDataset(Dataset):
    """
    PyTorch Dataset for underground coal mine blueprints.
    Expects directories with /images and /masks (color-mapped).
    """
    def __init__(self, images_dir, masks_dir, transform=None):
        self.images_dir = images_dir
        self.masks_dir = masks_dir
        self.transform = transform
        
        if os.path.exists(images_dir):
            self.image_files = sorted([f for f in os.listdir(images_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])
        else:
            self.image_files = []

    def __len__(self):
        return len(self.image_files)

    def _mask_to_class_indices(self, mask_rgb):
        """
        Converts an RGB mask image into a 2D array of class indices.
        """
        h, w, _ = mask_rgb.shape
        class_mask = np.zeros((h, w), dtype=np.int64)
        
        for class_idx, class_name in enumerate(CLASSES):
            color = CLASS_COLORS[class_name]
            # Find pixels matching this color
            matches = np.all(mask_rgb == color, axis=-1)
            class_mask[matches] = class_idx
            
        return class_mask

    def __getitem__(self, idx):
        img_name = self.image_files[idx]
        img_path = os.path.join(self.images_dir, img_name)
        mask_path = os.path.join(self.masks_dir, img_name)
        
        # Read image (BGR to RGB)
        image = cv2.imread(img_path)
        if image is not None:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            # Fallback dummy for testing
            image = np.zeros((512, 512, 3), dtype=np.uint8)
            
        # Read mask (BGR to RGB)
        mask = cv2.imread(mask_path)
        if mask is not None:
            mask = cv2.cvtColor(mask, cv2.COLOR_BGR2RGB)
            class_mask = self._mask_to_class_indices(mask)
        else:
            # Fallback dummy background mask
            class_mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.int64)

        # Standardize size for model batching (512x512)
        target_size = (512, 512)
        image = cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)
        class_mask = cv2.resize(class_mask.astype(np.uint8), target_size, interpolation=cv2.INTER_NEAREST).astype(np.int64)

        if self.transform:
            # Assumes Albumentations format
            augmented = self.transform(image=image, mask=class_mask)
            image = augmented['image']
            class_mask = augmented['mask']
            
        # If not using albumentations ToTensorV2, manual conversion
        if isinstance(image, np.ndarray):
            # Normalize to 0-1 and channels first
            image = image.astype(np.float32) / 255.0
            image = np.transpose(image, (2, 0, 1))
            image = torch.from_numpy(image)
            class_mask = torch.from_numpy(class_mask).long()

        return image, class_mask
