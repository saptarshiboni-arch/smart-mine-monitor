import time
from typing import List
from fastapi import APIRouter, HTTPException
from backend.models.schemas import SensorNode
from backend.database.db import db
from backend.services.risk_engine.risk_evaluator import RiskEvaluatorService

router = APIRouter(prefix="/api/sensors", tags=["Sensor Telemetry"])

@router.get("", response_model=List[SensorNode])
async def get_all_sensors():
    current_map = db.get_current_map()
    return current_map.sensors

@router.post("", response_model=List[SensorNode])
async def add_sensor(sensor: SensorNode):
    current_map = db.get_current_map()
    for s in current_map.sensors:
        if s.node_id == sensor.node_id:
            raise HTTPException(status_code=400, detail="Sensor Node ID already exists")

    sensor.last_update = time.time()
    current_map.sensors.append(sensor)

    # Associate with block
    for b in current_map.blocks:
        if b.id == sensor.block and sensor.node_id not in b.sensor_nodes:
            b.sensor_nodes.append(sensor.node_id)

    # Re-evaluate risks
    RiskEvaluatorService.update_mine_map_risks(current_map)
    current_map.updated_at = time.time()
    db.save_map(current_map)
    return current_map.sensors

@router.put("/{node_id}", response_model=SensorNode)
async def update_sensor(node_id: str, updated: SensorNode):
    current_map = db.get_current_map()
    target_idx = -1
    for i, s in enumerate(current_map.sensors):
        if s.node_id == node_id:
            target_idx = i
            break

    if target_idx == -1:
        raise HTTPException(status_code=404, detail="Sensor not found")

    updated.last_update = time.time()
    # Evaluate risk automatically from sensor parameters
    eval_risk, reason = RiskEvaluatorService.evaluate_sensor(updated)
    updated.risk_level = eval_risk
    current_map.sensors[target_idx] = updated

    # Propagate to blocks
    RiskEvaluatorService.update_mine_map_risks(current_map)
    current_map.updated_at = time.time()
    db.save_map(current_map)
    return current_map.sensors[target_idx]

@router.delete("/{node_id}", response_model=List[SensorNode])
async def delete_sensor(node_id: str):
    current_map = db.get_current_map()
    current_map.sensors = [s for s in current_map.sensors if s.node_id != node_id]
    for b in current_map.blocks:
        if node_id in b.sensor_nodes:
            b.sensor_nodes.remove(node_id)

    RiskEvaluatorService.update_mine_map_risks(current_map)
    current_map.updated_at = time.time()
    db.save_map(current_map)
    return current_map.sensors
