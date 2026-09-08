import time
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from backend.models.schemas import RiskLevel, MineMap, EmergencyStatus, SensorNode
from backend.database.db import db
from backend.services.graph_builder.graph_service import GraphBuilderService
from backend.services.risk_engine.risk_evaluator import RiskEvaluatorService
from backend.api.emergency import recalculate_emergency_routes

router = APIRouter(prefix="/api/simulation", tags=["Risk & Hardware Simulation"])

class BlockRiskPayload(BaseModel):
    block_id: str
    risk_level: RiskLevel

class TunnelBlockPayload(BaseModel):
    tunnel_id: str
    is_blocked: bool

class ScenarioPayload(BaseModel):
    scenario_name: str

class TelemetryPayload(BaseModel):
    node_id: str
    temperature: float
    vibration: float
    tilt: float
    displacement: float
    moisture: float

@router.post("/block-risk")
async def simulate_block_risk(payload: BlockRiskPayload):
    """
    Simulates changing risk of a block (NORMAL -> WARNING -> CRITICAL).
    Updates block risk, simulates sensor spikes if CRITICAL/WARNING,
    and dynamically recalculates emergency routes if emergency is active.
    """
    current_map = db.get_current_map()
    target_block = None
    for b in current_map.blocks:
        if b.id == payload.block_id:
            b.risk_level = payload.risk_level
            target_block = b
            break

    if not target_block:
        raise HTTPException(status_code=404, detail=f"Block {payload.block_id} not found")

    # Simulate sensor telemetry matching this risk
    for s in current_map.sensors:
        if s.block == payload.block_id:
            s.risk_level = payload.risk_level
            s.last_update = time.time()
            if payload.risk_level == RiskLevel.CRITICAL:
                s.temperature = 52.5
                s.vibration = 0.42
                s.tilt = 0.58
                s.displacement = 3.6
                s.moisture = 42.0
            elif payload.risk_level == RiskLevel.WARNING:
                s.temperature = 38.5
                s.vibration = 0.18
                s.tilt = 0.24
                s.displacement = 1.5
                s.moisture = 28.0
            else:
                s.temperature = 23.5
                s.vibration = 0.03
                s.tilt = 0.05
                s.displacement = 0.2
                s.moisture = 18.0

    current_map.graph = GraphBuilderService.build_graph(current_map)
    current_map.updated_at = time.time()
    db.save_map(current_map)

    emerg_status = db.get_emergency_status()
    if emerg_status.is_active:
        plan_res = await recalculate_emergency_routes()
        plan_dict = plan_res.model_dump() if hasattr(plan_res, 'model_dump') else dict(plan_res)
        return {
            "status": "UPDATED",
            "block_id": payload.block_id,
            "risk_level": payload.risk_level,
            "emergency_recalculated": True,
            "evacuation_plan": plan_res,
            **plan_dict
        }

    return {
        "status": "UPDATED",
        "block_id": payload.block_id,
        "risk_level": payload.risk_level,
        "emergency_recalculated": False,
        "mine_map": current_map
    }

@router.post("/tunnel-blocked")
@router.post("/toggle-tunnel")
async def simulate_toggle_tunnel(payload: TunnelBlockPayload):
    """Simulates rockfall or structural collapse blocking a tunnel."""
    current_map = db.get_current_map()
    target_tunnel = None
    for t in current_map.tunnels:
        if t.id == payload.tunnel_id:
            t.is_blocked = payload.is_blocked
            t.risk_level = RiskLevel.BLOCKED if payload.is_blocked else RiskLevel.NORMAL
            target_tunnel = t
            break

    if not target_tunnel:
        raise HTTPException(status_code=404, detail=f"Tunnel {payload.tunnel_id} not found")

    current_map.graph = GraphBuilderService.build_graph(current_map)
    current_map.updated_at = time.time()
    db.save_map(current_map)

    emerg_status = db.get_emergency_status()
    if emerg_status.is_active:
        plan_res = await recalculate_emergency_routes()
        plan_dict = plan_res.model_dump() if hasattr(plan_res, 'model_dump') else dict(plan_res)
        return {
            "status": "UPDATED",
            "tunnel_id": payload.tunnel_id,
            "is_blocked": payload.is_blocked,
            "emergency_recalculated": True,
            "evacuation_plan": plan_res,
            **plan_dict
        }

    return {
        "status": "UPDATED",
        "tunnel_id": payload.tunnel_id,
        "is_blocked": payload.is_blocked,
        "emergency_recalculated": False,
        "mine_map": current_map
    }

@router.post("/telemetry")
async def simulate_telemetry(payload: TelemetryPayload):
    """Simulates raw IoT sensor packet ingestion and risk propagation."""
    current_map = db.get_current_map()
    sensor = None
    for s in current_map.sensors:
        if s.node_id == payload.node_id:
            sensor = s
            break

    if not sensor:
        # Create or assign to first block
        first_blk = current_map.blocks[0].id if current_map.blocks else "BLOCK_A"
        sensor = SensorNode(
            node_id=payload.node_id,
            block=first_blk,
            risk_level=RiskLevel.NORMAL
        )
        current_map.sensors.append(sensor)

    sensor.temperature = payload.temperature
    sensor.vibration = payload.vibration
    sensor.tilt = payload.tilt
    sensor.displacement = payload.displacement
    sensor.moisture = payload.moisture
    sensor.last_update = time.time()

    eval_risk, reason = RiskEvaluatorService.evaluate_sensor(sensor)
    sensor.risk_level = eval_risk

    # Propagate to parent block
    for b in current_map.blocks:
        if b.id == sensor.block:
            b.risk_level = eval_risk
            break

    current_map.graph = GraphBuilderService.build_graph(current_map)
    current_map.updated_at = time.time()
    db.save_map(current_map)

    emerg_status = db.get_emergency_status()
    if emerg_status.is_active:
        plan_res = await recalculate_emergency_routes()
        return {
            "status": "UPDATED",
            "node_id": payload.node_id,
            "sensor_risk": eval_risk,
            "reason": reason,
            "emergency_recalculated": True,
            "evacuation_plan": plan_res
        }

    return {
        "status": "UPDATED",
        "node_id": payload.node_id,
        "sensor_risk": eval_risk,
        "reason": reason,
        "emergency_recalculated": False,
        "mine_map": current_map
    }

@router.post("/preset/{scenario_name}")
@router.post("/scenario")
async def trigger_demo_scenario(scenario_name: Optional[str] = None, payload: Optional[ScenarioPayload] = None):
    """
    Triggers predefined Hackathon / Section 29 demonstration scenarios:
    - 'all_normal': Resets all blocks and tunnels to nominal state.
    - 'block_b_critical': Sets Block B to CRITICAL, triggering dynamic rerouting around it.
    - 'block_c_critical': Sets Block C to CRITICAL as well, rerouting to Refuge Chamber Alpha.
    - 'tunnel_t2_blocked' or 'tunnel_blocked': Blocks the main south incline haulage tunnel.
    - 'complex_compromise': Blocks all surface exit tunnels, triggering emergency retreat to Refuge Chamber Alpha.
    """
    scenario = scenario_name or (payload.scenario_name if payload else "all_normal")
    current_map = db.get_current_map()

    if scenario == "all_normal":
        for b in current_map.blocks:
            b.risk_level = RiskLevel.NORMAL
        for t in current_map.tunnels:
            t.is_blocked = False
            t.risk_level = RiskLevel.NORMAL
        for s in current_map.sensors:
            s.risk_level = RiskLevel.NORMAL
            s.temperature = 23.5
            s.vibration = 0.03
            s.tilt = 0.05
            s.displacement = 0.2
        msg = "Simulation Reset: All blocks NORMAL, all tunnels OPEN."

    elif scenario == "block_b_critical":
        for b in current_map.blocks:
            if b.id == "BLOCK_B":
                b.risk_level = RiskLevel.CRITICAL
            else:
                b.risk_level = RiskLevel.NORMAL
        for t in current_map.tunnels:
            t.is_blocked = False
            t.risk_level = RiskLevel.NORMAL
        for s in current_map.sensors:
            if s.block == "BLOCK_B":
                s.risk_level = RiskLevel.CRITICAL
                s.temperature = 54.0
                s.vibration = 0.44
                s.tilt = 0.60
                s.displacement = 3.8
            else:
                s.risk_level = RiskLevel.NORMAL
        msg = "Simulated Rockburst & Gas Inrush in BLOCK_B (CRITICAL). Dynamic re-routing activated."

    elif scenario == "block_c_critical":
        for b in current_map.blocks:
            if b.id in ["BLOCK_B", "BLOCK_C"]:
                b.risk_level = RiskLevel.CRITICAL
            else:
                b.risk_level = RiskLevel.NORMAL
        for s in current_map.sensors:
            if s.block in ["BLOCK_B", "BLOCK_C"]:
                s.risk_level = RiskLevel.CRITICAL
                s.temperature = 49.0
                s.vibration = 0.39
            else:
                s.risk_level = RiskLevel.NORMAL
        msg = "Cascading Roof Failure in BLOCK_C (CRITICAL). Primary paths compromised."

    elif scenario in ["tunnel_blocked", "tunnel_t2_blocked"]:
        for t in current_map.tunnels:
            if "EX1" in t.id or "EXIT_01" in t.to_node or t.id == "TUNNEL_02":
                t.is_blocked = True
                t.risk_level = RiskLevel.BLOCKED
        msg = "Main South Incline Tunnel BLOCKED by strata collapse. Rerouting away from Exit 1."

    elif scenario == "complex_compromise":
        # Block access to ALL surface exits, forcing refuge chamber evacuation
        for t in current_map.tunnels:
            if "EXIT" in t.to_node or "EXIT" in t.from_node:
                t.is_blocked = True
                t.risk_level = RiskLevel.BLOCKED
            if "REFUGE" in t.to_node or "REFUGE" in t.from_node:
                t.is_blocked = False
                t.risk_level = RiskLevel.NORMAL
        for b in current_map.blocks:
            if b.id == "BLOCK_B":
                b.risk_level = RiskLevel.CRITICAL
        msg = "Surface portals severed! Automatic fallback to Pressurized Refuge Chamber Alpha."

    else:
        # Fallback to all_normal if unrecognized
        for b in current_map.blocks:
            b.risk_level = RiskLevel.NORMAL
        for t in current_map.tunnels:
            t.is_blocked = False
        msg = f"Preset scenario '{scenario}' applied."

    current_map.graph = GraphBuilderService.build_graph(current_map)
    current_map.updated_at = time.time()
    db.save_map(current_map)

    emerg_status = db.get_emergency_status()
    if emerg_status.is_active:
        plan_res = await recalculate_emergency_routes()
        return {
            "status": "SCENARIO_APPLIED",
            "scenario": scenario,
            "message": msg,
            "emergency_recalculated": True,
            "evacuation_plan": plan_res,
            "mine_map": current_map
        }

    return {
        "status": "SCENARIO_APPLIED",
        "scenario": scenario,
        "message": msg,
        "emergency_recalculated": False,
        "mine_map": current_map
    }
