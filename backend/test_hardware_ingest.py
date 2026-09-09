"""
Test suite for ESP32 Real-Time Hardware Sensor Data Ingestion
Validates:
1. Validation of required fields in POST /api/sensor-data (HTTP 422 on invalid/missing data)
2. Successful ingestion and response format matching:
   {
     "status": "success",
     "node_id": "NODE_01",
     "prediction": "...",
     "confidence": ...
   }
3. Retrieval of latest telemetry via GET /api/sensor-data/latest
4. Backward compatibility with GET /api/sensors/data for React dashboard
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_missing_fields_validation():
    print("\n--- Test 1: Validation of Missing Fields ---")
    # Missing vibration and node_id
    payload = {
        "timestamp": "2026-09-10T10:30:00",
        "tilt": 2.1,
        "temperature": 31.5,
        "moisture": 45.2,
        "displacement": 1.8
    }
    response = client.post("/api/sensor-data", json=payload)
    print(f"Status code: {response.status_code}")
    assert response.status_code == 422, f"Expected 422, got {response.status_code}"
    print("[PASS] Missing required fields properly rejected with HTTP 422")

def test_invalid_range_validation():
    print("\n--- Test 2: Validation of Out-of-Range Fields ---")
    # Negative moisture
    payload = {
        "node_id": "NODE_01",
        "timestamp": "2026-09-10T10:30:00",
        "vibration": 0.42,
        "tilt": 2.1,
        "temperature": 31.5,
        "moisture": -10.0,
        "displacement": 1.8
    }
    response = client.post("/api/sensor-data", json=payload)
    print(f"Status code: {response.status_code}")
    assert response.status_code == 422, f"Expected 422, got {response.status_code}"
    print("[PASS] Out-of-bounds sensor values properly rejected with HTTP 422")

def test_valid_esp32_sensor_ingestion():
    print("\n--- Test 3: Successful ESP32 POST /api/sensor-data ---")
    payload = {
        "node_id": "NODE_01",
        "timestamp": "2026-09-10T10:30:00",
        "vibration": 0.42,
        "tilt": 2.1,
        "temperature": 31.5,
        "moisture": 45.2,
        "displacement": 1.8
    }
    response = client.post("/api/sensor-data", json=payload)
    print(f"Status code: {response.status_code}")
    data = response.json()
    print("Response JSON:", data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert data.get("status") == "success", "Expected status: success"
    assert data.get("node_id") == "NODE_01", "Expected node_id: NODE_01"
    assert "prediction" in data, "Expected prediction field"
    assert "confidence" in data, "Expected confidence field"
    print(f"[PASS] Successfully ingested! Prediction: {data['prediction']}, Confidence: {data['confidence']}")

def test_get_latest_sensor_data():
    print("\n--- Test 4: GET /api/sensor-data/latest ---")
    response = client.get("/api/sensor-data/latest")
    print(f"Status code: {response.status_code}")
    data = response.json()
    print("Latest data JSON:", data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert data.get("status") == "success"
    assert data.get("node_id") == "NODE_01"
    assert data.get("sensor_data") is not None
    assert data["sensor_data"].get("vibration") == 0.42
    assert "prediction" in data
    assert "nodes" in data
    print(f"[PASS] GET /api/sensor-data/latest verified for NODE_01")

def test_dashboard_nodes_registry():
    print("\n--- Test 5: Dashboard Nodes Registry Sync ---")
    response = client.get("/api/sensors/data")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "NODE_01" in data["nodes"]
    print(f"[PASS] /api/sensors/data returns registry with {data.get('total_nodes')} active node(s)")

if __name__ == "__main__":
    print("Running hardware ingestion test suite...")
    test_missing_fields_validation()
    test_invalid_range_validation()
    test_valid_esp32_sensor_ingestion()
    test_get_latest_sensor_data()
    test_dashboard_nodes_registry()
    print("\n=======================================================")
    print("ALL 5 HARDWARE INGESTION TESTS PASSED SUCCESSFULLY!")
    print("=======================================================")
