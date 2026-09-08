"""
Module: ml.extract_pdf_dataset
Extracts mine plan images from the reference PDF at highest resolution.
Creates clean dataset directory structure with deduplication and metadata.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import pymupdf as fitz
import os
import json
import hashlib
import shutil
from pathlib import Path
from PIL import Image
import numpy as np

test_pdf = Path(__file__).parent.parent / "data" / "test.pdf"
db_pdf = Path(__file__).parent.parent / "backend" / "database" / "digitalmap.pdf"
PDF_PATH = test_pdf if test_pdf.exists() else db_pdf
DATASET_ROOT = Path(__file__).parent.parent / "data" / "mine_blueprint_dataset"

# Subdirectories
DIRS = ["raw", "blueprints", "maps", "pairs", "masks", "graphs", "metadata", "train", "val", "test"]

# Pages that contain actual mine plan images (identified from visual inspection)
# Format: (page_number_1indexed, description, content_type)
MINE_PLAN_PAGES = [
    (6, "1742 Victorian Mine Plan with Vertical Section", "HISTORICAL"),
    (9, "16081 Top Hard Seam Key Plan - Welbeck Colliery", "HISTORICAL"),
    (10, "18339 Kellingley Colliery Beeston Seam Abandonment Plan", "HISTORICAL"),
    (11, "S2127 Lecbrannock Composite Plan", "HISTORICAL"),
    (12, "Mine Plan with dense room-and-pillar workings", "HISTORICAL"),
    (13, "Mine Plan with structured grid workings", "HISTORICAL"),
    (14, "Mine Plan - text reference page", "TEXT_REFERENCE"),
    (15, "Mine Plan with marked features", "HISTORICAL"),
    (16, "Mine Plan closeup", "HISTORICAL"),
    (17, "Mine Plan text reference", "TEXT_REFERENCE"),
    (18, "Mine Plan with annotations", "HISTORICAL"),
    (19, "Mine Plan entries reference", "TEXT_REFERENCE"),
    (21, "10254 Knowehead Mine Plan - Scotland", "HISTORICAL"),
    (22, "Mine Plan workings detail", "HISTORICAL"),
    (23, "Mine Plan with boundaries and pillars", "HISTORICAL"),
    (24, "Standard mine plan symbology reference", "REFERENCE"),
    (25, "Understanding mine plans limitations", "TEXT_REFERENCE"),
    (26, "Standard mine plan symbology chart", "REFERENCE"),
    (27, "Annotated mine plan comparison", "HISTORICAL"),
]


def create_dataset_structure():
    """Create clean dataset directory structure."""
    for d in DIRS:
        (DATASET_ROOT / d).mkdir(parents=True, exist_ok=True)
    print(f"Created dataset structure at: {DATASET_ROOT}")


def extract_page_renders(dpi=300):
    """Extract full page renders at specified DPI for all pages containing mine plans."""
    if not PDF_PATH.exists():
        print(f"ERROR: PDF not found at {PDF_PATH}")
        return []
    
    doc = fitz.open(str(PDF_PATH))
    samples = []
    seen_hashes = {}
    
    print(f"\nExtracting from PDF: {PDF_PATH}")
    print(f"Total pages: {len(doc)}")
    print(f"Render DPI: {dpi}")
    
    for page_idx in range(len(doc)):
        page_num = page_idx + 1
        page = doc[page_idx]
        
        # Check if this page has mine plan content (images beyond header/footer)
        image_list = page.get_images(full=True)
        
        # Filter out header/footer images (2279x341, 2279x342 are repeated header/footer)
        content_images = []
        for img_ref in image_list:
            xref = img_ref[0]
            try:
                base_img = doc.extract_image(xref)
                if base_img:
                    w, h = base_img["width"], base_img["height"]
                    # Skip header/footer bars and tiny decorative elements
                    if not (2200 < w < 2500 and 300 < h < 400) and w * h > 50000:
                        content_images.append({
                            "xref": xref,
                            "width": w,
                            "height": h,
                            "ext": base_img.get("ext", "png"),
                            "size": len(base_img["image"]),
                        })
            except:
                pass
        
        if not content_images and page_num not in [p[0] for p in MINE_PLAN_PAGES]:
            continue
        
        # Render page at high DPI
        mat = fitz.Matrix(dpi / 72.0, dpi / 72.0)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to numpy for hash and save
        img_bytes = pix.tobytes("png")
        img_hash = hashlib.md5(img_bytes).hexdigest()[:12]
        
        # Skip exact duplicates
        if img_hash in seen_hashes:
            print(f"  Page {page_num}: DUPLICATE of page {seen_hashes[img_hash]}, skipping")
            continue
        seen_hashes[img_hash] = page_num
        
        sample_id = f"page{page_num:02d}_{img_hash}"
        
        # Determine content type
        page_entry = next((p for p in MINE_PLAN_PAGES if p[0] == page_num), None)
        if page_entry:
            description = page_entry[1]
            content_type = page_entry[2]
        else:
            description = f"Page {page_num} - auto-detected content"
            content_type = "AUTO_DETECTED" if content_images else "TEXT_REFERENCE"
        
        # Save to raw/
        raw_path = DATASET_ROOT / "raw" / f"{sample_id}.png"
        pix.save(str(raw_path))
        
        # If it contains mine plan content, also save to blueprints/
        if content_type in ("HISTORICAL", "AUTO_DETECTED"):
            bp_path = DATASET_ROOT / "blueprints" / f"{sample_id}.png"
            pix.save(str(bp_path))
        
        # Create metadata
        metadata = {
            "sample_id": sample_id,
            "source_page": page_num,
            "blueprint_path": f"blueprints/{sample_id}.png" if content_type in ("HISTORICAL", "AUTO_DETECTED") else None,
            "map_path": None,  # No ground truth digital maps available
            "resolution_dpi": dpi,
            "width": pix.width,
            "height": pix.height,
            "source_type": content_type,
            "source_pdf": str(PDF_PATH.name),
            "description": description,
            "confidence": "UNVERIFIED",
            "ground_truth_class": "D_UNVERIFIED",
            "content_images_count": len(content_images),
            "has_text": len(page.get_text("text").strip()) > 50,
            "notes": f"Extracted from '{doc.metadata.get('title', 'Unknown')}' by {doc.metadata.get('author', 'Unknown')}",
        }
        
        meta_path = DATASET_ROOT / "metadata" / f"{sample_id}.json"
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        samples.append(metadata)
        print(f"  Page {page_num}: {pix.width}x{pix.height} [{content_type}] "
              f"({len(content_images)} content images) → {sample_id}")
    
    doc.close()
    return samples


def deduplicate_existing_blueprints():
    """Deduplicate the existing 29 blueprint images into unique ones."""
    existing_dir = Path(__file__).parent.parent / "data" / "blueprints"
    if not existing_dir.exists():
        return
    
    print(f"\nDeduplicating existing blueprints from: {existing_dir}")
    seen = {}
    kept = 0
    skipped = 0
    
    for f in sorted(existing_dir.iterdir()):
        if f.suffix.lower() not in ('.png', '.jpg', '.jpeg'):
            continue
        
        with open(f, 'rb') as fh:
            h = hashlib.md5(fh.read()).hexdigest()
        
        if h in seen:
            skipped += 1
            continue
        
        seen[h] = f.name
        kept += 1
        
        # Copy unique image to dataset
        dest = DATASET_ROOT / "blueprints" / f"existing_{f.stem}.{f.suffix.lstrip('.')}"
        if not dest.exists():
            shutil.copy2(f, dest)
            
            # Create metadata
            img = Image.open(f)
            w, h_img = img.size
            
            meta = {
                "sample_id": f"existing_{f.stem}",
                "source_page": None,
                "blueprint_path": f"blueprints/existing_{f.stem}.{f.suffix.lstrip('.')}",
                "map_path": None,
                "resolution_dpi": None,
                "width": w,
                "height": h_img,
                "source_type": "EXISTING_DATASET",
                "confidence": "UNVERIFIED",
                "ground_truth_class": "D_UNVERIFIED",
                "notes": f"Deduplicated from original data/blueprints/{f.name}"
            }
            
            meta_path = DATASET_ROOT / "metadata" / f"existing_{f.stem}.json"
            with open(meta_path, "w") as mf:
                json.dump(meta, mf, indent=2)
    
    print(f"  Kept {kept} unique images, skipped {skipped} duplicates")


def generate_dataset_summary(samples):
    """Generate summary report of the extracted dataset."""
    summary = {
        "total_pages_in_pdf": 42,
        "total_samples_extracted": len(samples),
        "historical_mine_plans": len([s for s in samples if s["source_type"] == "HISTORICAL"]),
        "reference_pages": len([s for s in samples if s["source_type"] == "REFERENCE"]),
        "text_reference_pages": len([s for s in samples if s["source_type"] == "TEXT_REFERENCE"]),
        "auto_detected": len([s for s in samples if s["source_type"] == "AUTO_DETECTED"]),
        "ground_truth_pairs": 0,
        "verified_ground_truth": 0,
        "pdf_title": "Understanding Mine Plans",
        "pdf_author": "Jenny Cottam (Mining Remediation Authority)",
        "extraction_dpi": 300,
        "notes": [
            "This PDF is an EDUCATIONAL REFERENCE document, NOT a paired training dataset.",
            "It contains example mine plans with explanatory text and symbology guides.",
            "NO ground truth digital maps are provided for any mine plan.",
            "All extracted samples are classified as D_UNVERIFIED.",
            "The mine plan images can be used for heuristic pipeline testing and evaluation.",
            "For supervised training, manual annotation of tunnel masks is required.",
        ]
    }
    
    summary_path = DATASET_ROOT / "metadata" / "dataset_summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nDataset Summary:")
    for k, v in summary.items():
        if k != "notes":
            print(f"  {k}: {v}")
    print(f"  Saved to: {summary_path}")
    
    return summary


if __name__ == "__main__":
    print("="*80)
    print("MINE BLUEPRINT DATASET EXTRACTION")
    print("="*80)
    
    create_dataset_structure()
    samples = extract_page_renders(dpi=300)
    deduplicate_existing_blueprints()
    generate_dataset_summary(samples)
    
    print(f"\n{'='*80}")
    print("EXTRACTION COMPLETE")
    print(f"Dataset root: {DATASET_ROOT}")
    print(f"{'='*80}")
