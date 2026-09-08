import torch
import torch.nn as nn
import segmentation_models_pytorch as smp

class MineSegmentationModel(nn.Module):
    """
    Mine Blueprint Segmentation Model.
    Uses an HRNet or ResNet backbone via segmentation_models_pytorch,
    mimicking the architecture style often used by floorplan models like CubiCasa5K.
    """
    def __init__(self, encoder_name="resnet34", encoder_weights="imagenet", in_channels=3, classes=9):
        super(MineSegmentationModel, self).__init__()
        
        self.model = smp.Unet(
            encoder_name=encoder_name,        # e.g., resnet34, hrnet_w32
            encoder_weights=encoder_weights,  # Use 'imagenet' pre-training
            in_channels=in_channels,
            classes=classes,                  # Output classes (9 for our mine schema)
            activation=None                   # Return raw logits, apply Softmax in loss/inference
        )
        
    def forward(self, x):
        return self.model(x)

    def freeze_encoder(self):
        """Freezes the encoder weights for transfer learning/fine-tuning."""
        for child in self.model.encoder.children():
            for param in child.parameters():
                param.requires_grad = False

    def unfreeze_encoder(self):
        """Unfreezes the encoder weights for full fine-tuning."""
        for child in self.model.encoder.children():
            for param in child.parameters():
                param.requires_grad = True

if __name__ == "__main__":
    # Quick test
    model = MineSegmentationModel()
    dummy_input = torch.randn(1, 3, 512, 512)
    output = model(dummy_input)
    print(f"Input shape: {dummy_input.shape}")
    print(f"Output shape: {output.shape} (Expected: 1, 8, 512, 512)")
