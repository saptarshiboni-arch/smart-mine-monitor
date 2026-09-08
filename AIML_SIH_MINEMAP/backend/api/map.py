import time
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from backend.models.schemas import MineMap, Block, Tunnel, Junction, Exit, RefugeChamber, HazardZone
from backend.services.graph_builder.graph_service import GraphBuilderService
from backend.database.db import db
from backend.database.seed_data import get_demo_mine_map

router = APIRouter(prefix="/api/map", tags=["Mine Map Management"])

@router.get("", response_model=MineMap)
async def get_mine_map():
    """Retrieves the active mine map, including all spatial entities and navigation graph."""
    current_map = db.get_current_map()
    # Ensure graph is up-to-date
    current_map.graph = GraphBuilderService.build_graph(current_map)
    return current_map

@router.put("", response_model=MineMap)
async def update_mine_map(updated_map: MineMap):
    """Saves human-in-the-loop corrections to the entire map schema."""
    updated_map.updated_at = time.time()
    updated_map.graph = GraphBuilderService.build_graph(updated_map)
    db.save_map(updated_map)
    return updated_map

@router.post("/confirm", response_model=MineMap)
async def confirm_mine_map():
    """Confirms the AI-generated map after human review, unlocking emergency routing."""
    current_map = db.get_current_map()
    current_map.is_confirmed = True
    current_map.ai_review_required = False
    current_map.updated_at = time.time()
    current_map.graph = GraphBuilderService.build_graph(current_map)
    db.save_map(current_map)
    return current_map

@router.post("/reset-demo", response_model=MineMap)
async def reset_demo_map():
    """Resets to the Section 29 benchmark mine map."""
    demo_map = get_demo_mine_map()
    db.save_map(demo_map)
    return demo_map

@router.post("/blocks", response_model=MineMap)
async def add_or_update_block(block: Block):
    """Adds a new block or updates an existing block."""
    current_map = db.get_current_map()
    found = False
    for i, b in enumerate(current_map.blocks):
        if b.id == block.id:
            current_map.blocks[i] = block
            found = True
            break
    if not found:
        current_map.blocks.append(block)

    current_map.updated_at = time.time()
    current_map.graph = GraphBuilderService.build_graph(current_map)
    db.save_map(current_map)
    return current_map

@router.delete("/blocks/{block_id}", response_model=MineMap)
async def delete_block(block_id: str):
    """Deletes a block and its associated tunnels."""
    current_map = db.get_current_map()
    current_map.blocks = [b for b in current_map.blocks if b.id != block_id]
    current_map.tunnels = [t for t in current_map.tunnels if t.from_node != block_id and t.to_node != block_id]
    current_map.updated_at = time.time()
    current_map.graph = GraphBuilderService.build_graph(current_map)
    db.save_map(current_map)
    return current_map

@router.post("/tunnels", response_model=MineMap)
async def add_or_update_tunnel(tunnel: Tunnel):
    """Adds or updates a tunnel between two nodes."""
    current_map = db.get_current_map()
    found = False
    for i, t in enumerate(current_map.tunnels):
        if t.id == tunnel.id:
            current_map.tunnels[i] = tunnel
            found = True
            break
    if not found:
        current_map.tunnels.append(tunnel)

    current_map.updated_at = time.time()
    current_map.graph = GraphBuilderService.build_graph(current_map)
    db.save_map(current_map)
    return current_map

@router.delete("/tunnels/{tunnel_id}", response_model=MineMap)
async def delete_tunnel(tunnel_id: str):
    """Deletes a tunnel."""
    current_map = db.get_current_map()
    current_map.tunnels = [t for t in current_map.tunnels if t.id != tunnel_id]
    current_map.updated_at = time.time()
    current_map.graph = GraphBuilderService.build_graph(current_map)
    db.save_map(current_map)
    return current_map

@router.put("/tunnels/{tunnel_id}/toggle-blocked", response_model=MineMap)
async def toggle_tunnel_blocked(tunnel_id: str):
    """Toggles whether a tunnel is BLOCKED or navigable."""
    current_map = db.get_current_map()
    target_tunnel = None
    for t in current_map.tunnels:
        if t.id == tunnel_id:
            t.is_blocked = not t.is_blocked
            target_tunnel = t
            break

    if not target_tunnel:
        raise HTTPException(status_code=404, detail="Tunnel not found")

    current_map.updated_at = time.time()
    current_map.graph = GraphBuilderService.build_graph(current_map)
    db.save_map(current_map)
    return current_map
