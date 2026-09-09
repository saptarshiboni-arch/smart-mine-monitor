"""
ESP32 Hardware Simulation Client
Mimics an actual physical ESP32 microcontroller running WiFiClient / WiFiClientSecure
transmitting real-time JSON sensor telemetry over HTTPS and HTTP.
"""

import ssl
import json
import time
import sys
from datetime import datetime, timezone
import urllib.request
import urllib.error

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

CERT_PATH = "backend/certs/cert.pem"

def simulate_esp32_https_post(url, payload, ssl_verify=True):
    """
    Sends HTTPS POST request from simulated ESP32 microcontroller.
    Uses TLS/SSL context matching ESP32 WiFiClientSecure behavior.
    """
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "ESP32-HTTP-Client/1.0",
        "X-Hardware-Device": "ESP32-WROOM-32D",
    }

    # SSL Context setup
    if url.startswith("https://"):
        ssl_ctx = ssl.create_default_context()
        try:
            ssl_ctx.load_verify_locations(CERT_PATH)
        except Exception:
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
    else:
        ssl_ctx = None

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, context=ssl_ctx, timeout=5) as response:
            latency = (time.time() - start_time) * 1000
            resp_body = json.loads(response.read().decode("utf-8"))
            return {
                "status_code": response.status,
                "latency_ms": round(latency, 2),
                "response": resp_body,
                "headers": dict(response.headers),
            }
    except urllib.error.HTTPError as e:
        latency = (time.time() - start_time) * 1000
        error_body = e.read().decode("utf-8")
        try:
            error_json = json.loads(error_body)
        except Exception:
            error_json = error_body
        return {
            "status_code": e.code,
            "latency_ms": round(latency, 2),
            "response": error_json,
        }
    except Exception as e:
        return {
            "status_code": -1,
            "error": str(e),
        }

def run_hardware_demonstration():
    print("=" * 75)
    print("⚡ ESP32 HARDWARE TRANSMISSION SIMULATION (HTTPS & HTTP)")
    print("   Microcontroller: ESP32-WROOM-32D (Underground Sensor Node)")
    print("=" * 75)

    test_scenarios = [
        {
            "name": "Scenario 1: Nominal Underground Baseline Monitoring (HTTPS)",
            "url": "https://localhost:8443/api/sensor-data",
            "payload": {
                "node_id": "ESP32_NODE_01",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "vibration": 0.06,
                "tilt": 0.09,
                "temperature": 27.4,
                "moisture": 22.0,
                "displacement": 0.35
            }
        },
        {
            "name": "Scenario 2: Micro-Seismic Strata Creep & Early Warning (HTTPS)",
            "url": "https://localhost:8443/api/sensor-data",
            "payload": {
                "node_id": "ESP32_NODE_02",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "vibration": 0.45,
                "tilt": 1.85,
                "temperature": 34.0,
                "moisture": 48.0,
                "displacement": 2.20
            }
        },
        {
            "name": "Scenario 3: Severe Roof Fracturing & Imminent Collapse (HTTP port 8000)",
            "url": "http://localhost:8000/api/sensor-data",
            "payload": {
                "node_id": "ESP32_NODE_03",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "vibration": 2.65,
                "tilt": 4.80,
                "temperature": 47.5,
                "moisture": 76.0,
                "displacement": 18.20
            }
        },
        {
            "name": "Scenario 4: Malformed Packet / Missing Sensor Wire Test (HTTPS)",
            "url": "https://localhost:8443/api/sensor-data",
            "payload": {
                "node_id": "ESP32_NODE_ERR",
                "vibration": 0.05,
                # Missing tilt, temperature, moisture, displacement
            }
        }
    ]

    for idx, sc in enumerate(test_scenarios, 1):
        print(f"\n[{idx}/4] {sc['name']}")
        print(f"   📡 Target URL : {sc['url']}")
        print(f"   📦 Outgoing Payload:\n      {json.dumps(sc['payload'])}")
        
        result = simulate_esp32_https_post(sc["url"], sc["payload"])

        if result.get("status_code") == 200:
            resp = result["response"]
            print(f"   ✅ HTTP {result['status_code']} OK (RTT: {result.get('latency_ms')} ms)")
            print(f"   📥 Response Received by ESP32:")
            print(f"      - Status:     {resp.get('status')}")
            print(f"      - Node ID:    {resp.get('node_id')}")
            print(f"      - Prediction: {resp.get('prediction')}")
            print(f"      - Confidence: {resp.get('confidence')}")
        elif result.get("status_code") == 422:
            print(f"   🛡️ HTTP 422 Unprocessable Entity (Properly Validated & Rejected!)")
            print(f"   📥 Error returned to ESP32: {result['response']}")
        else:
            print(f"   ⚠️ Result: {result}")

    # Query latest state
    print("\n" + "=" * 75)
    print("📊 DASHBOARD SYNCHRONIZATION CHECK (GET /api/sensor-data/latest)")
    print("=" * 75)
    try:
        with urllib.request.urlopen("http://localhost:8000/api/sensor-data/latest") as r:
            dash_data = json.loads(r.read().decode("utf-8"))
            print(f"   Total Active Hardware Nodes in Dashboard: {dash_data.get('total_nodes')}")
            print(f"   Mine-Wide Overall Risk Level:             {dash_data.get('overall_risk')}")
            print(f"   Latest Telemetry Registered:")
            print(f"      - Node ID:    {dash_data.get('node_id')}")
            print(f"      - Readings:   {dash_data.get('sensor_data')}")
            print(f"      - Risk State: {dash_data.get('prediction')}")
    except Exception as e:
        print(f"   Failed to fetch latest: {e}")

if __name__ == "__main__":
    run_hardware_demonstration()
