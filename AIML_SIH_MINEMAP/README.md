# ⛏️ AI-Enabled Real-Time Mine Subsidence Prediction, Blueprint Perception & Emergency Evacuation System
> **Smart India Hackathon 2026** | *Subterranean Mine Safety, AI/ML Computer Vision & Autonomous Dynamic Evacuation Engine*

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg)](https://www.typescriptlang.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-EE4C2C.svg)](https://pytorch.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.9%2B-5C3EE8.svg)](https://opencv.org/)
[![Tests](https://img.shields.io/badge/Tests-27%2F27%20Passing-brightgreen.svg)]()

---

## 📌 Executive Summary

Underground coal mining environments (such as Bord-and-Pillar and Longwall extraction workings) are subject to catastrophic strata failures, roof falls, spontaneous combustion, and hazardous gas inundation (CH₄, CO). Traditional emergency evacuation relies on static paper maps and pre-planned egress paths that fail during real-time structural collapses.

This project delivers a **full-stack, real-time cyber-physical safety system**:
1. **Perception**: Ingests architectural blueprints, legacy scans, and CAD plans (PNG, JPG, PDF), converting them into high-fidelity topological navigation graphs using computer vision and deep learning.
2. **Telemetry & Prediction**: Ingests multi-sensor IoT telemetry (roof convergence, acoustic emission, rock stress, toxic gas concentrations) to predict subsidence risk in real time.
3. **Dynamic Routing**: Computes the **mathematically lowest-risk evacuation route** for every underground miner using safety-dominant pathfinding algorithms, rerouting dynamically when cave-ins or gas spikes occur.

---

## ✨ Key Features & Capabilities

### 1. 🧠 Topological Blueprint-to-Digital-Map Perception Pipeline
- **Statutory Surveying Standard Integration (`test.pdf`)**:
  - Incorporates British Coal Authority and National Coal Board (NCB) statutory surveying conventions.
  - Correctly differentiates **solid coal pillars / unmined strata** (impassable solid rock) from **void galleries, drifts, and crosscuts** (traversable void air passages).
- **Intelligent Noise & Survey Annotation Filter**:
  - Automatically isolates and filters out survey dates (e.g. `5.31.40`), face advance lines, elevation numbers, borehole coordinates, dimension ticks, and handwritten annotations.
  - Prevents non-navigable text glyphs from creating false graph nodes or artificial shortcuts.
- **Drawing Panel & Legend Separator**:
  - Automatically crops and isolates the primary underground plan-view working area from title blocks, longitudinal sections, and tabular legend data.
- **1-Pixel Centerline Skeletonization with Cycle Preservation**:
  - Employs morphological thinning to extract genuine gallery centerlines.
  - **Preserves closed topological cycles** around coal pillars without premature degree-2 node contraction.
  - Preserves 90° elbow corners as navigational waypoints, strictly preventing diagonal shortcut chords across unmined solid rock.
- **Continuous Multi-Point Polyline Geometry**:
  - Edges store complete winding polyline coordinates `[(x1, y1), ..., (xn, yn)]`, reflecting the true physical geometry of subterranean roadways.
- **Topological Junction & Chamber Classification**:
  - Accurately classifies 3-way T-junctions, 4-way crosscuts, dead-end stopes, surface portals (`EXIT`), and active production panels (`Panel A`..`Panel H`).
  - Distributes active extraction blocks across spatial quadrants rather than collapsing them onto border margins.

### 2. 🚨 Safety-Dominant Dynamic Emergency Routing
- **Mathematical Safety Dominance Formulation**:
  $$\text{Route Cost} = \text{Distance Cost} + \text{Risk Penalty} + \text{Hazard Penalty} + \text{Travel Time Cost}$$
  - Risk Penalties: `NORMAL: 0`, `WARNING: 5,000`, `CRITICAL: 1,000,000`, `BLOCKED: ∞`.
  - **Guarantee**: A 150m clear gallery is strictly chosen over a 100m gallery under critical roof collapse risk ($150 \ll 1,000,100$).
- **Dual-Engine Pathfinding**:
  - Supports safety-weighted **A*** (with admissible Euclidean heuristic) and safety-weighted **Dijkstra** algorithms.
- **Live Dynamic Re-Routing**:
  - When environmental sensors detect seismic convergence, roof displacement, or methane accumulation during an evacuation, affected tunnels are blocked in the graph and alternative escape routes are recomputed in < 15ms.
- **Pressurized Refuge Chamber Fallback**:
  - If all surface portals become inaccessible due to rock collapse or fire, the pathfinding engine directs trapped miners to the nearest self-sustaining, pressurized **Refuge Pod**.
- **Multi-Miner Concurrent Dispatch**:
  - Simultaneously computes and tracks individualized evacuation routes for multiple miners located across different active faces.

### 3. 📡 IoT Telemetry Ingestion & Subsidence Early Warning
- **Multi-Parameter Sensor Telemetry**:
  - Real-time ingestion endpoints for ESP32/LoRa underground sensor nodes:
    - **Subsidence & Structural**: Roof convergence (extensometers), rock mass stress, acoustic emission (AE), tilt, and seismic vibration.
    - **Atmospheric**: Methane (CH₄), Carbon Monoxide (CO), Oxygen deficiency (O₂), ambient temperature, and relative humidity.
- **Hardware-Free Simulation Rig**:
  - Built-in simulation suite for presentations and bench testing: inject environmental anomalies into specific nodes or trigger 1-click disaster presets (`All Normal`, `Block B Critical`, `All Surface Exits Cut Off`).

### 4. 🖥️ Interactive Web Dashboard & Human-in-the-Loop Verification
- **High-Performance Canvas (React 19 + TypeScript)**:
  - Hardware-accelerated canvas rendering with smooth pan, zoom, grid snapping, and blueprint opacity slider.
- **Zoom-Dependent Progressive Labeling**:
  - Critical safety landmarks (Surface Portals, Active Panels, Refuges) remain prominent at all zoom levels.
  - Dense gallery junction IDs reveal progressively at higher zoom (zoom ≥ 1.5) or on mouse hover, preventing label overlap and visual clutter.
- **Mandatory Human-in-the-Loop (HITL) Review**:
  - AI-generated digital maps are explicitly flagged with confidence metrics and uncertainty indicators (*"AI-generated map — verify before emergency use"*).
  - Editing toolbar allows mine safety engineers to add/delete nodes, edit tunnel connectivity, resize stope blocks, and lock the verified layout before activating live routing.
- **9-Layer Visual Diagnostic Inspector**:
  - Live diagnostic viewer displaying composite proof layers:
    1. Original Blueprint Image
    2. Polarity Binarization
    3. Cleaned Plan-View Mask (Annotations Filtered)
    4. Centerline Skeleton
    5. Topological Junctions (degree ≥ 3)
    6. Portals & Stopes
    7. Accepted Conduits (Polylines on Void Galleries)
    8. Rejected Shortcuts (Chords Across Solid Coal)
    9. Evacuation Route (Continuous Escape Vector)

### 5. 🔬 Machine Learning & Self-Supervised Dataset Pipeline
- **PyTorch Segmentation Architecture (`ml/model.py`)**:
  - Deep convolutional U-Net with ResNet-34 feature extraction backbone for semantic mine plan segmentation.
- **Automated Dataset Generation (`ml/extract_pdf_dataset.py`)**:
  - High-resolution vector extraction from reference statutory guides (`test.pdf`), producing structured raw images, masks, and metadata.
- **Self-Supervised Mask Generation (`ml/generate_self_supervised_masks.py`)**:
  - Automatically synthesizes training ground-truth masks for void galleries and solid pillars without expensive manual labeling.
- **Evaluation & Validation Suite (`ml/evaluate.py`, `ml/visual_validator.py`)**:
  - Evaluates Mean IoU, Dice Coefficient, Precision, and Recall, generating visual side-by-side prediction overlays.

---

## 📂 Repository Architecture

```text
AIML_SIH_MINEMAP/
├── backend/                               # Python FastAPI Backend
│   ├── algorithms/
│   │   ├── astar.py                       # Safety-weighted A* algorithm
│   │   └── dijkstra.py                    # Safety-weighted Dijkstra algorithm
│   ├── api/
│   │   ├── blueprint.py                   # Perception pipeline & 9-layer debug API
│   │   ├── emergency.py                   # Evacuation state machine & dispatch
│   │   ├── map.py                         # Persistent MineMap CRUD & confirmation
│   │   ├── miners.py                      # Personnel registry & location tracking
│   │   ├── routing.py                     # Safest route calculation & benchmarks
│   │   ├── sensors.py                     # IoT sensor node telemetry ingestion
│   │   └── simulation.py                  # Anomaly injection & preset scenarios
│   ├── database/
│   │   ├── db.py                          # SQLite persistence abstraction layer
│   │   └── seed_data.py                   # Initial benchmark mine map
│   ├── models/
│   │   └── schemas.py                     # Pydantic v2 domain schemas (MineMap, Tunnels, Nodes)
│   ├── services/
│   │   ├── blueprint_analyzer/
│   │   │   ├── annotation_filter.py       # Solid pillar vs void gallery & text filter
│   │   │   ├── centerline_extractor.py    # Skeletonization & cycle-preserving graph builder
│   │   │   ├── cubicasa_analyzer.py       # Floorplan baseline analyzer
│   │   │   ├── geometry_extractor.py      # OpenCV contour & chamber extractor
│   │   │   ├── graph_generator.py         # NetworkX topological graph compiler
│   │   │   ├── mine_analyzer.py           # Master subterranean blueprint analyzer
│   │   │   ├── panel_separator.py         # Plan-view isolation & legend remover
│   │   │   └── preprocessing.py           # CLAHE, deskew, and dual-polarity binarization
│   │   ├── graph_builder/                 # Bidirectional graph service
│   │   ├── map_generator/                 # Semantic mapper to digital MineMap
│   │   └── routing/                       # Multi-miner safety routing coordinator
│   └── main.py                            # FastAPI application server entrypoint
│
├── frontend/                              # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── blueprint/                 # Blueprint upload modal & AI analysis progress
│   │   │   ├── dashboard/                 # Metrics overview & safety diagnostics
│   │   │   ├── emergency/                 # Evacuation protocol trigger & route cards
│   │   │   ├── map/                       # MineMapCanvas (HTML5 Canvas, zoom labels, overlays)
│   │   │   ├── miners/                    # Underground personnel registry & assignment
│   │   │   ├── routing/                   # Route comparison & waypoint telemetry
│   │   │   ├── sensors/                   # IoT telemetry cards & anomaly injector
│   │   │   └── simulation/                # 1-click presentation disaster presets
│   │   ├── services/
│   │   │   └── api.ts                     # Axios client with schema normalization
│   │   ├── types/
│   │   │   └── index.ts                   # TypeScript interfaces
│   │   ├── App.tsx                        # Main dashboard container
│   │   └── main.tsx                       # React application root
│   └── package.json
│
├── ml/                                    # PyTorch Deep Learning & Dataset Pipeline
│   ├── checkpoints/                       # Model checkpoint registry (.gitkeep, metrics)
│   ├── dataset.py                         # PyTorch Dataset loader with data augmentations
│   ├── evaluate.py                        # Model validation (mIoU, Dice, Precision, Recall)
│   ├── extract_pdf_dataset.py             # Statutory PDF high-res plan extractor
│   ├── generate_self_supervised_masks.py  # Self-supervised ground-truth mask synthesis
│   ├── model.py                           # ResNet-34 + U-Net segmentation network
│   ├── train.py                           # Model training loop with early stopping
│   ├── visual_validator.py                # Visual inference inspection tool
│   └── inference/
│       └── predict.py                     # Model inference engine
│
├── data/
│   ├── blueprints/                        # Test & benchmark mine blueprints
│   ├── demo/                              # Demo assets
│   ├── mine_blueprint_dataset/            # Extracted dataset (train, val, masks, metadata)
│   └── test.pdf                           # Reference statutory mine plan guide (42 pages)
│
└── tests/                                 # Automated Pytest Suite (27/27 Passing)
    ├── test_api.py                        # REST API endpoint tests
    ├── test_blueprint_analyzer.py         # Computer vision perception & style tests
    ├── test_routing.py                    # Safety pathfinding mathematical verification
    └── test_topological_mine_graph.py     # 10 rigorous topological edge-case tests
```

---

## 🚀 Quickstart & Setup

### Prerequisites
- **Python 3.10+** (Tested on Python 3.11 / 3.12 / 3.13)
- **Node.js 18+** and `npm`

### 1. Backend Installation & Startup
```bash
# Clone the repository
git clone https://github.com/sougatanandi2007-maker/AIML_SIH_MINEMAP.git
cd AIML_SIH_MINEMAP

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI backend server (port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs at: [http://127.0.0.1:8000](http://127.0.0.1:8000) (Interactive Swagger docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs))*

### 2. Frontend Installation & Startup
```bash
# Open a new terminal in the frontend directory
cd frontend

# Install Node packages
npm install

# Start Vite development server (port 5173)
npm run dev -- --host 127.0.0.1 --port 5173
```
*Frontend runs at: [http://127.0.0.1:5173](http://127.0.0.1:5173)*

---

## 🧪 Verification & Automated Testing

The repository includes a 27-test automated test suite covering API integration, routing mathematics, computer vision binarization, and topological invariance.

Run the test suite:
```bash
pytest -v tests/
```

### Topological Validation Scenarios (`test_topological_mine_graph.py`):
| Scenario | Verification Objective | Result |
|:---|:---|:---:|
| `test_01_disconnected_nearby_tunnels` | Parallel galleries separated by solid rock mass have zero false connecting edges | **PASSED** |
| `test_02_winding_tunnel_polyline` | Winding tunnels store multi-point polylines (Length > Euclidean × 1.15) | **PASSED** |
| `test_03_t_junction_three_branches` | 3-way T-junction produces exactly 1 junction node with degree 3 and 3 incident edges | **PASSED** |
| `test_04_four_way_crosscut` | 4-way crosscut produces exactly 1 junction node with degree 4 and 4 incident edges | **PASSED** |
| `test_05_topological_loop_circuit` | Closed gallery circuit around a coal pillar preserves cycle without collapsing | **PASSED** |
| `test_06_dead_end_stope` | Dead-end stope headings preserve degree-1 endpoint nodes | **PASSED** |
| `test_07_crossing_non_tunnel_annotations` | Text characters, survey dates, and dimension ticks are filtered out as solid mass | **PASSED** |
| `test_08_separate_drawing_panels` | Primary plan-view working is isolated from legend tables and border noise | **PASSED** |
| `test_09_no_false_diagonal_shortcuts` | Sharp 90° elbow turns introduce waypoint nodes without diagonal chords across rock | **PASSED** |
| `test_10_coordinate_alignment` | Digital graph coordinates align 1:1 with canvas pixel space | **PASSED** |

---

## 📡 Core API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health and database connectivity check |
| `POST` | `/api/blueprint/upload` | Upload blueprint image or PDF |
| `POST` | `/api/blueprint/analyze` | Execute computer vision perception pipeline & compile digital map |
| `GET` | `/api/blueprint/debug` | Retrieve 9-layer visual diagnostic verification data |
| `GET` | `/api/map` | Retrieve active persistent mine map |
| `PUT` | `/api/map` | Update complete mine map topology |
| `POST` | `/api/map/confirm` | Admin verification flag toggle |
| `POST` | `/api/route/calculate` | Compute safety-dominant path (A* / Dijkstra) |
| `POST` | `/api/emergency/start` | Activate emergency evacuation protocol |
| `POST` | `/api/emergency/stop` | Deactivate emergency state |
| `POST` | `/api/simulation/preset/{name}` | Inject disaster scenario (`all_normal`, `block_b_critical`, `all_exits_blocked`) |
| `POST` | `/api/sensors` | Ingest live IoT node telemetry |

---

## 👥 Contributors & Acknowledgements

Developed for the **Smart India Hackathon 2026** to advance safety automation, AI perception, and real-time disaster resilience in subterranean mining environments.
