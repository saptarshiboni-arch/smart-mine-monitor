import pytest
from starlette.testclient import TestClient
from backend.main import app
from backend.models.schemas import RiskLevel

client = TestClient(app)

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_get_mine_map():
    response = client.get("/api/map")
    assert response.status_code == 200
    data = response.json()
    assert "blocks" in data
    assert "tunnels" in data
    assert "junctions" in data
    assert "exits" in data
    assert len(data["blocks"]) >= 3

def test_emergency_cycle_and_dynamic_reroute():
    # 0. Reset to benchmark demo map
    client.post("/api/map/reset-demo")
    # 1. Reset simulation to all normal
    client.post("/api/simulation/scenario", json={"scenario_name": "all_normal"})

    # 2. Start emergency
    res_start = client.post("/api/emergency/start")
    assert res_start.status_code == 200
    data_start = res_start.json()
    assert data_start["is_active"] is True
    assert len(data_start["routes"]) >= 3

    # Miner 1 should route via Block B initially (shortest path among all NORMAL blocks)
    miner1_route = data_start["routes"]["MINER_001"]
    assert miner1_route["destination_node"] == "EXIT_01"

    # 3. Simulate BLOCK B becoming CRITICAL
    res_sim = client.post("/api/simulation/block-risk", json={"block_id": "BLOCK_B", "risk_level": "CRITICAL"})
    assert res_sim.status_code == 200
    data_sim = res_sim.json()

    # Dynamic rerouting must have changed Miner 1's destination to EXIT_02 (via Block C) to avoid CRITICAL Block B!
    miner1_new_route = data_sim["routes"]["MINER_001"]
    assert miner1_new_route["destination_node"] == "EXIT_02"
    assert "BLOCK_B" not in miner1_new_route["path"]

    # 4. Stop emergency
    res_stop = client.post("/api/emergency/stop")
    assert res_stop.status_code == 200
    assert res_stop.json()["is_active"] is False

def test_blueprint_model_info():
    response = client.get("/api/blueprint/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "CubiCasa5K" in data["name"]
    assert "target_downstream_domain" in data
