# 🛡️ MINEGUARD AI
**AI-Enabled Low-Cost Real-Time Mine Subsidence Monitoring, Prediction & Intelligent Emergency Evacuation System for Underground Coal Mines in India**

*Smart India Hackathon (SIH) Working Demonstration Prototype*

---

## 📋 1. Project Overview & Problem Statement

### The Problem in Indian Underground Coal Mines
Underground coal mining (e.g. in **ECL Raniganj**, **BCCL Jharia**, **SCCL Godavari Valley**, **SECL Korba**) is inherently susceptible to strata subsidence, catastrophic roof falls, and goaf caving incidents. Conventional methods rely on manual tell-tales and periodic visual inspections, which fail to detect micro-seismic pre-collapse strata movements.

Furthermore, during an emergency collapse or gas surge:
- **Conventional GPS does NOT work underground** due to hundreds of meters of solid rock overburden.
- **Standard evacuation routes often lead miners directly into collapsing or hazardous tunnel intersections.**
- **Mine control rooms lack real-time visibility into individual miner locations and dynamic tunnel safety states.**

### The Solution: MINEGUARD AI
MINEGUARD AI is an end-to-end real-time mine safety platform designed to:
1. **Continuously monitor strata deformation** using low-cost IoT sensor nodes (LVDT extensometers, biaxial tiltmeters, 14Hz geophones, hydraulic pressure cells).
2. **Predict subsidence risk up to 30 minutes in advance** using AI strata velocity forecasting with 95% confidence bounds.
3. **Localize miners subsurface** using an **Underground Positioning System (UPS)** based on UWB (Ultra-Wideband), BLE mesh, and helmet IMU dead-reckoning.
4. **Compute the Shortest SAFE Evacuation Route** using graph-based risk penalty Dijkstra algorithms that dynamically avoid collapsed tunnels in real time.

---

## 🏗️ 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                        UNDERGROUND COAL MINE ENVIRONMENT                          |
+-----------------------------------------------------------------------------------+
|  [Roof LVDT Sensors]  [BNO055 Tiltmeters]  [14Hz Geophones]  [Hydraulic Load Cells]|
|         │                                                                         |
|         ▼ (RS-485 / I2C)                                                          |
|  [ESP32 IoT Edge Nodes]                                                           |
|         │                                                                         |
|         ▼ (LoRa / LoRaWAN 868MHz Subsurface Mesh)                                 |
|  [Underground LoRa Repeater Gateway]                                              |
|         │                                                                         |
|  [UWB Anchors DWM1000] ──(Time-of-Flight)──> [Miner Smart Helmet / UPS Tag]       |
+───────────────────────────────────┼───────────────────────────────────────────────+
                                    │ (Optical Fiber Shaft Trunk / Ethernet)
                                    ▼
+-----------------------------------------------------------------------------------+
|                        SURFACE MINE CONTROL ROOM SERVER                           |
+-----------------------------------------------------------------------------------+
|  [Real-Time State Machine Engine]  ◄──►  [Dijkstra Shortest SAFE Path Engine]     |
|  [AI Strata Subsidence Predictor]  ◄──►  [Explainable AI (XAI) Ranking Engine]    |
+-----------------------------------------------------------------------------------+
                                    │
                                    ▼
+-----------------------------------------------------------------------------------+
|                     MINEGUARD AI COMMAND CENTER DASHBOARD                         |
+-----------------------------------------------------------------------------------+
|  - Real-Time KPI Cards (Mine Status, Active Nodes 24/24, Miners 8, AI Risk Score) |
|  - Live 2D Vector Underground Mine Map (Coal Pillars, Goaf, Airflow, UWB Anchors) |
|  - Strata Waveform Charts (Displacement, Tilt, Vibration, Stress)                |
|  - Intelligent Evacuation Route Visualizer with Dynamic Safe Detour Rerouting     |
|  - Full-Screen Red Alert Emergency Mode HUD & Broadcast Dispatcher                |
|  - SIH Demonstration Scenario Panel (1-Click Scenario Injectors)                  |
|  - Synthetic Web Audio Siren & Warning Synthesizer                                |
+-----------------------------------------------------------------------------------+
```

---

## 🧮 3. Core Innovation: Shortest SAFE Route Algorithm

### Graph Model
- **Nodes ($V$)**: Junctions (J1...J14), Surface Incline Exits (E1, E2), Emergency Shafts (E3, E4), and Refuge Chamber (REF-1).
- **Edges ($E$)**: Tunnel sections with length $d_e$, risk level $R_e$, and availability status $S_e$.

### Dynamic Penalty Cost Function
$$\text{Cost}(e) = \begin{cases} 
d_e \times 1.0 & \text{if } R_e = \text{SAFE} \\ 
d_e \times 2.5 & \text{if } R_e = \text{CAUTION} \\ 
d_e \times 7.0 & \text{if } R_e = \text{WARNING} \\ 
\infty & \text{if } R_e = \text{CRITICAL or COLLAPSED} 
\end{cases}$$

When a tunnel collapses or experiences critical subsidence, its edge cost becomes $\infty$ and is immediately excised from the pathfinding graph, dynamically computing a safe detour around the hazard.

---

## 🎯 4. Live Demonstration Script for SIH Judges

### Step 1: Initial Baseline Monitoring (Dashboard)
1. Open the dashboard at `/overview`.
2. Observe top KPI cards: Mine Status **● MONITORING**, Active Sensors **24 / 24**, Workers Underground **8**, AI Risk Score **~18% SAFE**.
3. Inspect the live 2D underground coal mine vector map showing all 4 zones (A, B, C, D), coal pillars, ventilation airflow, UWB anchors, and active miner markers.

### Step 2: Simulate Increasing Strata Subsidence
1. In the top SIH Demo Bar, click `[ ⚠️ SIMULATE SUBSIDENCE ]`.
2. Notice Zone B sensor telemetry ramp up (displacement jumps, tilt increases, micro-seismic geophone surges).
3. Navigate to **AI Prediction & XAI** (`/ai-prediction`): observe the AI risk gauge climb to **WARNING**, the 30-minute predictive curve approaching the critical threshold with 95% confidence bounds, and the Explainable AI (XAI) dominant factor weights.

### Step 3: Trigger Catastrophic Collapse & Dynamic Safe Rerouting (Core Innovation)
1. In the demo bar, click `[ 🚨 COLLAPSE T-12 & REROUTE ]`.
2. Observe the synchronized reaction:
   - Tunnel T-12 turns into animated hazard stripes (**COLLAPSED / IMPASSABLE**).
   - Synthesized Web Audio siren sounds in control room.
   - Red Alert banner announces: `🚨 ROUTE UPDATED: Previous route through T-12 is unsafe. Alternative safe evacuation route calculated.`
   - Worker routes dynamically detour through safe crosscuts to **Surface Exit E1**.
   - Full-Screen **Red Alert Emergency HUD** opens with turn-by-turn guidance for every miner.

### Step 4: Emergency Dispatch & Step Evacuation
1. In the Emergency HUD, click **"Dispatch SMS & Tags"** to simulate broadcasting evacuation coordinates to smart helmet tags.
2. Click **"Silence Siren"** to mute audio.
3. Click `[ ⚡ Step Evac ]` in the top bar to advance evacuating miners step-by-step along the calculated safe path until safe exit.

### Step 5: Reset Simulation
1. Click `[ 🟢 NORMAL MINE ]` to reset all 24 sensors, tunnels, and routes back to normal operating baseline.

---

## 🚀 5. Local Setup & Running (End-to-End Guide)

### 🌐 System Port Architecture
| Component | Directory | Port | Default URL | Purpose |
|---|---|---|---|---|
| **Admin Portal** | `authentication-admin/mine-frontpage/` | `5500` | [http://localhost:5500](http://localhost:5500) | Mine Manager registration, CAD blueprint upload, miner shift crew manifest setup |
| **Control Room Dashboard** | `src/` (Vite + React) | `3000` | [http://localhost:3000](http://localhost:3000) | Real-time strata telemetry, live 2D map, dynamic Dijkstra safe evacuation routing |
| **AI/ML Telemetry & Prediction Model** | `AIML_SIH_MINE/` or `backend/` | `8000` | [http://localhost:8000](http://localhost:8000) | Hardware-aligned ML risk inference endpoint (`/predict`, `/health`) with Random Forest / XGBoost |

---

### 📦 Prerequisites
- **Node.js** v18+ (tested on Node v20 & v24)
- **Python** 3.10+ (for ML model backend & serving static portal)
- Modern Web Browser (Google Chrome, Microsoft Edge, Firefox, Brave)

---

### 🛠️ Step-by-Step Execution

#### Step 1: Install Dependencies
Open a terminal in the root repository directory:
```bash
# Install frontend dashboard dependencies
npm install

# Install AI/ML model dependencies
cd AIML_SIH_MINE
pip install -r requirements.txt
cd ..
```

---

#### Step 2: Start the Services

Open **three terminal windows**:

##### Terminal 1 — Control Room Dashboard (Vite)
```bash
npm run dev
```
> The dashboard will start on `http://localhost:3000/`.

##### Terminal 2 — Admin Registration & Blueprint Portal
```bash
cd authentication-admin/mine-frontpage
python -m http.server 5500
```
> The admin registration portal will start on `http://localhost:5500/`.

##### Terminal 3 — AI/ML Prediction Backend (AIML_SIH_MINE)
```bash
cd AIML_SIH_MINE
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```
> The FastAPI service will start on `http://localhost:8000/` with live endpoints:
> - `GET http://localhost:8000/health` (Readiness check)
> - `POST http://localhost:8000/predict` (Hardware sensor risk classification)
> - Interactive Swagger Docs: `http://localhost:8000/docs`

---

### 🔄 End-to-End Workflow: From Registration to Control Room

Follow this complete walkthrough to experience the entire user journey:

```
[Admin Portal: 5500]                         [Dashboard: 3000]
   Fill Info & Blueprint  ──(Proceed CTA)──>    Session Ingested & Persisted
   Setup Worker Manifest                         Custom Workforce Loaded
   Confirm & Attest                              Live Dijkstra Safe Routing
```

1. **Access the Admin Portal:**
   Navigate to **`http://localhost:5500`** in your browser.

2. **Fill Admin & Site Details (Section 1):**
   - Enter your Full Name (e.g. `Saptarshi Chowdhury`).
   - Select Country Code (`+91`) and enter Mobile Number (`9876543210`).
   - Enter Email, Role (`Senior Mine Manager`), Mine Name (`Raniganj Deep Colliery`), and Mine Registration ID (`IND-WB-7402`).

3. **Upload Mine Blueprint (Section 2):**
   - Either drag and drop a CAD blueprint / schematic (JPG/PNG/PDF), OR
   - Simply click **`Load Sample (Seam-4)`** to load the pre-configured underground coal mine blueprint.

4. **Deploy Underground Workforce Manifest (Section 3):**
   - Enter names, phone numbers, and underground roles for miners, OR
   - Click **`Load Sample Crew (4 Miners)`** to auto-populate miners across Zones A through D.

5. **Attest & Initialize (Section 4):**
   - Adjust Zone/Node counts if desired.
   - Check the **DGMS statutory layout confirmation** checkbox.
   - Click the pulsing green **`Continue to Mine Configuration →`** button.

6. **Handover to Dashboard:**
   - Review the summary dialog showing your registered administrator identity, mine parameters, and shift crew.
   - Click **`Proceed to Control Room Dashboard →`**.
   - You will be automatically redirected to **`http://localhost:3000/#/overview`** with your session encoded in the URL.
   - The dashboard decodes your session, saves it in `localStorage`, displays your registered Admin profile in the top-right corner, and injects your custom miners directly into the simulation engine!

7. **Return to Admin Portal or Logout:**
   - In the dashboard's top bar, click the **Logout** button (or **Admin Login** if in mock mode) to return to `http://localhost:5500/`.

---

### ⚡ Quick Mode (Standalone Dashboard)
If you only want to inspect or test the dashboard without setting up a new mine session:
```bash
npm run dev
```
Open **`http://localhost:3000`** directly. The dashboard operates standalone with pre-loaded mock controllers, statutory emergency protocols, and active miners across all 4 zones.


---

## 🎨 6. Industrial Control Room Design Standards
- Warm industrial palette: `#F5F2EC` (Background), `#FFFFFF` (Card surface), `#EEEBE4` (Alt surface), `#292722` (Text), `#D8D3CA` (Borders).
- Standard status indicators: Green (`#2D8A4E`), Amber (`#C4820E`), Red (`#C4362E`), Orange (`#D97706`).
- Tabular figures and Inter typography for precise telemetry reading.

---

## 📡 7. Real Hardware Sensor Integration (ESP32 / Edge Gateways)

MINEGUARD AI supports direct ingestion of live telemetry from physical microcontrollers (ESP32, ESP8266, Raspberry Pi, Arduino with Wi-Fi/LTE shields, LoRaWAN gateways) over standard HTTP/HTTPS JSON requests.

### 🔄 End-to-End Data Pipeline
```
ESP32 / Microcontroller Edge Node
       │  (Physical Telemetry: vibration, tilt, temp, moisture, displacement)
       ▼  HTTP / HTTPS POST
FastAPI Backend (/api/sensors/data bound to 0.0.0.0:8000)
       │  (Expands 5 raw metrics -> 14-channel physics vector)
       ▼  Direct Pipeline Inference
Random Forest ML Model (/predict)
       │  (Produces: NORMAL / WARNING / CRITICAL + confidence probabilities)
       ▼  State Ingestion & Polling Loop (1.5s cadence)
MineContext State Machine
       │  (Updates live sensor nodes, risk gauges, evacuation triggers)
       ▼  Real-Time UI Rendering
Admin Dashboard (Map, KPI Cards, AI Prediction Page, Emergency HUD)
```

### 🎛️ Dual-Mode Operation (Simulation vs. Real Hardware)
The dashboard provides seamless switching between **Virtual Simulation** and **Real Hardware Stream**:
- **Simulation Mode (Default)**: Runs the internal physics simulator with nominal baseline drift and supports SIH 1-click test scenarios (`[Simulate Subsidence]`, `[Collapse T-12 & Reroute]`).
- **ESP32 Hardware Mode**: Listens for live edge telemetry from physical nodes. The dashboard displays the real sensor readings, updates the 2D map node states, and runs live ML inference on the incoming hardware data.
- **How to Switch**: Click the **Sim / ESP32** toggle button in the **TopBar** or the **Activate Real Hardware Mode** button on the **AI Prediction** page (`/ai-prediction`).

---

### 🌐 Ingestion Endpoints

| Environment | Protocol | Endpoint URL | Binding |
|---|---|---|---|
| **Local Wi-Fi / LAN Testing** | `HTTP` | `http://<YOUR_COMPUTER_LOCAL_IP>:8000/api/sensors/data` | `0.0.0.0:8000` |
| **Production / Cloud** | `HTTPS` | `https://<YOUR_DOMAIN>/api/sensors/data` | Reverse Proxy / SSL Port 443 |

> **Find your computer's local IP on Windows**: Open PowerShell and run `ipconfig` (e.g. `192.168.1.100` or `10.0.0.x`). Ensure your ESP32 is connected to the same Wi-Fi network.

---

### 📥 Hardware Ingestion Specification

#### Headers
```http
Content-Type: application/json
X-API-Key: sih-mine-secret-key-2026   (Optional: for secured industrial deployments)
```

#### JSON Request Body Format
```json
{
  "node_id": "ESP32_NODE_01",
  "vibration": 0.05,
  "tilt": 0.08,
  "temperature": 27.0,
  "moisture": 20.0,
  "displacement": 0.2
}
```

| Field | Type | Units | Nominal / Safe Range | Warning Range | Critical Range |
|---|---|---|---|---|---|
| `node_id` | `string` | ID tag | `ESP32_NODE_01`... | Any string identifier | Unique per sensor |
| `vibration` | `float` | g or m/s² | `0.00` – `0.15` | `0.50` – `1.50` | `> 2.00` |
| `tilt` | `float` | degrees (°) | `0.00` – `0.20` | `1.00` – `2.50` | `> 3.50` |
| `temperature` | `float` | °Celsius | `20.0` – `32.0` | `35.0` – `42.0` | `> 45.0` |
| `moisture` | `float` | % Relative | `10.0` – `30.0` | `40.0` – `60.0` | `> 70.0` |
| `displacement` | `float` | mm | `0.00` – `0.50` | `5.00` – `12.00` | `> 15.00` |

#### JSON Response Schema
```json
{
  "node_id": "ESP32_NODE_01",
  "timestamp": "2026-09-08T11:10:33.237756+00:00",
  "sensor_data": {
    "vibration": 0.05,
    "tilt": 0.08,
    "temperature": 27.0,
    "moisture": 20.0,
    "displacement": 0.2
  },
  "prediction": {
    "risk": "NORMAL",
    "confidence": 0.9856,
    "probabilities": {
      "NORMAL": 0.9856,
      "WARNING": 0.0100,
      "CRITICAL": 0.0044
    },
    "model_used": "Random Forest (Trained Joblib Bundle)"
  }
}
```

---

### 💻 Testing with cURL / PowerShell

#### 1. Send Normal Baseline Telemetry
```bash
curl -X POST "http://localhost:8000/api/sensors/data" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "ESP32_NODE_01",
    "vibration": 0.05,
    "tilt": 0.08,
    "temperature": 27.0,
    "moisture": 20.0,
    "displacement": 0.2
  }'
```

#### 2. Send Critical Subsidence Telemetry (Triggers Alarm)
```bash
curl -X POST "http://localhost:8000/api/sensors/data" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "ESP32_NODE_02",
    "vibration": 2.45,
    "tilt": 4.20,
    "temperature": 48.0,
    "moisture": 75.0,
    "displacement": 18.5
  }'
```

#### 3. View All Active Hardware Nodes
```bash
curl -X GET "http://localhost:8000/api/sensors/data"
```

---

### 🔌 ESP32 Arduino C++ Code Example
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Replace with your PC's LAN IP or production domain
const char* serverUrl = "http://192.168.1.100:8000/api/sensors/data";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Read real sensors (MPU6050, LVDT, DS18B20, etc.)
    float vibration = 0.06;
    float tilt = 0.09;
    float temperature = 27.4;
    float moisture = 22.0;
    float displacement = 0.35;

    String json = "{\"node_id\":\"ESP32_NODE_01\","
                  "\"vibration\":" + String(vibration, 3) + ","
                  "\"tilt\":" + String(tilt, 3) + ","
                  "\"temperature\":" + String(temperature, 1) + ","
                  "\"moisture\":" + String(moisture, 1) + ","
                  "\"displacement\":" + String(displacement, 2) + "}";

    int httpResponseCode = http.POST(json);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Server Response: " + response);
    } else {
      Serial.printf("Error occurred: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
  delay(2000); // 2-second telemetry cadence
}
```

