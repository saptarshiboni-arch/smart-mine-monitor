import os
import cv2
import torch
import numpy as np
from PIL import Image

# Import from parent directory
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from model import MineSegmentationModel
from dataset import CLASSES, CLASS_COLORS

class BlueprintPredictor:
    def __init__(self, model_path, encoder_name="resnet34", device=None):
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = device
            
        self.model = MineSegmentationModel(encoder_name=encoder_name, classes=len(CLASSES))
        
        # Load weights if path exists
        if os.path.exists(model_path):
            checkpoint = torch.load(model_path, map_location=self.device)
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                self.model.load_state_dict(checkpoint["model_state_dict"])
            else:
                self.model.load_state_dict(checkpoint)
            print(f"Loaded weights from {model_path}")
        else:
            print(f"WARNING: Weights file {model_path} not found. Using untrained model.")
            
        self.model.to(self.device)
        self.model.eval()

    def preprocess(self, image_path):
        """Reads and pre-processes an image for inference."""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not read image at {image_path}")
            
        # Resize to multiple of 32 for UNet compatibility
        h, w = image.shape[:2]
        new_h = (h // 32) * 32
        new_w = (w // 32) * 32
        if new_h != h or new_w != w:
            image = cv2.resize(image, (new_w, new_h))
            
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Normalize and transpose to CHW
        img_tensor = image.astype(np.float32) / 255.0
        img_tensor = np.transpose(img_tensor, (2, 0, 1))
        img_tensor = torch.from_numpy(img_tensor).unsqueeze(0) # Add batch dim
        return img_tensor, (h, w)

    def predict(self, image_path):
        """
        Runs inference on the image and returns:
        - predicted_classes: 2D numpy array of class indices
        - rgb_mask: 2D RGB visualization mask
        - confidence_map: 2D confidence score map
        """
        img_tensor, original_shape = self.preprocess(image_path)
        img_tensor = img_tensor.to(self.device)
        
        with torch.no_grad():
            logits = self.model(img_tensor)
            probs = torch.softmax(logits, dim=1)
            
            # Get highest prob class and the confidence score
            confidences, preds = torch.max(probs, dim=1)
            
        pred_mask = preds.squeeze().cpu().numpy()
        conf_map = confidences.squeeze().cpu().numpy()
        
        # Convert to RGB mask for visualization
        h, w = pred_mask.shape
        rgb_mask = np.zeros((h, w, 3), dtype=np.uint8)
        for class_idx, class_name in enumerate(CLASSES):
            rgb_mask[pred_mask == class_idx] = CLASS_COLORS[class_name]
            
        # Resize back to original
        if (h, w) != original_shape:
            pred_mask = cv2.resize(pred_mask, (original_shape[1], original_shape[0]), interpolation=cv2.INTER_NEAREST)
            rgb_mask = cv2.resize(rgb_mask, (original_shape[1], original_shape[0]), interpolation=cv2.INTER_NEAREST)
            conf_map = cv2.resize(conf_map, (original_shape[1], original_shape[0]), interpolation=cv2.INTER_LINEAR)
            
        return pred_mask, rgb_mask, conf_map

if __name__ == "__main__":
    # Test script
    predictor = BlueprintPredictor(model_path="../checkpoints/best_mine_model.pth")
    test_img = "../../data/demo/demo_mine_blueprint.png"
    if os.path.exists(test_img):
        print(f"Running inference on {test_img}")
        pred, rgb, conf = predictor.predict(test_img)
        print(f"Prediction successful. Unique classes found: {np.unique(pred)}")
        print(f"Average confidence: {np.mean(conf):.4f}")
    else:
        print("Demo image not found, skipping inference test.")
