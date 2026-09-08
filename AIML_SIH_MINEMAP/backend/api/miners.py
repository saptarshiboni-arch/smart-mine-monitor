import time
from typing import List
from fastapi import APIRouter, HTTPException
from backend.models.schemas import Miner, MinerStatus
from backend.database.db import db
from backend.services.graph_builder.graph_service import GraphBuilderService

router = APIRouter(prefix="/api/miners", tags=["Miner Management"])

@router.get("", response_model=List[Miner])
async def get_all_miners():
    current_map = db.get_current_map()
    return current_map.miners

@router.post("", response_model=List[Miner])
async def add_miner(miner: Miner):
    current_map = db.get_current_map()
    # Check duplicate ID
    for m in current_map.miners:
        if m.miner_id == miner.miner_id:
            raise HTTPException(status_code=400, detail="Miner ID already exists")

    current_map.miners.append(miner)
    # Add to block's miner list
    for b in current_map.blocks:
        if b.id == miner.current_block and miner.miner_id not in b.miners:
            b.miners.append(miner.miner_id)

    current_map.updated_at = time.time()
    db.save_map(current_map)
    return current_map.miners

@router.put("/{miner_id}", response_model=Miner)
async def update_miner(miner_id: str, updated: Miner):
    current_map = db.get_current_map()
    target_idx = -1
    for i, m in enumerate(current_map.miners):
        if m.miner_id == miner_id:
            target_idx = i
            break

    if target_idx == -1:
        raise HTTPException(status_code=404, detail="Miner not found")

    old_block = current_map.miners[target_idx].current_block
    new_block = updated.current_block

    current_map.miners[target_idx] = updated

    # Update block allocations if block changed
    if old_block != new_block:
        for b in current_map.blocks:
            if b.id == old_block and miner_id in b.miners:
                b.miners.remove(miner_id)
            if b.id == new_block and miner_id not in b.miners:
                b.miners.append(miner_id)

    current_map.updated_at = time.time()
    db.save_map(current_map)
    return current_map.miners[target_idx]

@router.delete("/{miner_id}", response_model=List[Miner])
async def delete_miner(miner_id: str):
    current_map = db.get_current_map()
    current_map.miners = [m for m in current_map.miners if m.miner_id != miner_id]
    for b in current_map.blocks:
        if miner_id in b.miners:
            b.miners.remove(miner_id)

    current_map.updated_at = time.time()
    db.save_map(current_map)
    return current_map.miners
