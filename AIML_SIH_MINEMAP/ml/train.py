import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from tqdm import tqdm

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ml.dataset import MineBlueprintDataset, CLASSES
from ml.model import MineSegmentationModel

def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Load Datasets
    print("Loading datasets...")
    train_dataset = MineBlueprintDataset(
        images_dir=os.path.join(args.data_dir, "train", "images"),
        masks_dir=os.path.join(args.data_dir, "train", "masks")
    )
    val_dataset = MineBlueprintDataset(
        images_dir=os.path.join(args.data_dir, "val", "images"),
        masks_dir=os.path.join(args.data_dir, "val", "masks")
    )
    
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    
    # Initialize Model
    print(f"Initializing model with backbone: {args.encoder}")
    model = MineSegmentationModel(encoder_name=args.encoder, classes=len(CLASSES)).to(device)
    
    # Loss and Optimizer: Use class weights to penalize tunnel/junction misses
    # BACKGROUND is ~90% of image, TUNNELS are ~8%, junctions/rooms are ~2%
    class_weights = torch.tensor([0.2, 2.5, 3.5, 3.0, 3.0, 3.0, 3.0, 3.0, 1.0], dtype=torch.float32).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    
    best_val_loss = float("inf")
    history = {"train_loss": [], "val_loss": []}
    
    os.makedirs(args.save_dir, exist_ok=True)
    
    # Training Loop
    for epoch in range(args.epochs):
        model.train()
        train_loss = 0.0
        
        print(f"\nEpoch {epoch+1}/{args.epochs}")
        for images, masks in tqdm(train_loader, desc="Training"):
            images = images.to(device)
            masks = masks.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, masks)
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * images.size(0)
            
        train_loss /= len(train_loader.dataset) if len(train_loader.dataset) > 0 else 1
        scheduler.step()
        
        # Validation Loop
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for images, masks in tqdm(val_loader, desc="Validation"):
                images = images.to(device)
                masks = masks.to(device)
                
                outputs = model(images)
                loss = criterion(outputs, masks)
                val_loss += loss.item() * images.size(0)
                
        val_loss /= len(val_loader.dataset) if len(val_loader.dataset) > 0 else 1
        
        history["train_loss"].append(round(train_loss, 4))
        history["val_loss"].append(round(val_loss, 4))
        
        print(f"Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | LR: {scheduler.get_last_lr()[0]:.6f}")
        
        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            save_path = os.path.join(args.save_dir, "best_mine_model.pth")
            torch.save({
                "epoch": epoch + 1,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_loss": val_loss,
                "classes": CLASSES,
                "encoder": args.encoder
            }, save_path)
            print(f"Saved new best model checkpoint to {save_path}")

    # Save training metrics report
    metrics_path = os.path.join(args.save_dir, "training_metrics.json")
    import json
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump({
            "epochs": args.epochs,
            "encoder": args.encoder,
            "best_val_loss": round(best_val_loss, 4),
            "history": history
        }, f, indent=2)
    print(f"Training metrics saved to {metrics_path}")

if __name__ == "__main__":
    default_data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "mine_blueprint_dataset")
    default_save_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "checkpoints")

    parser = argparse.ArgumentParser(description="Train Mine Blueprint Segmentation Model")
    parser.add_argument("--data_dir", type=str, default=default_data_dir, help="Path to dataset directory")
    parser.add_argument("--save_dir", type=str, default=default_save_dir, help="Directory to save weights")
    parser.add_argument("--encoder", type=str, default="resnet34", help="Backbone encoder name")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=2, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    
    args = parser.parse_args()
    train(args)
