import time
from typing import Dict, Any, List
from fastapi import APIRouter
from backend.models.schemas import EmergencyStatus, RiskLevel
from backend.services.routing.safety_router import SafetyRoutingService
from backend.database.db import db

router = APIRouter(prefix="/api/emergency", tags=["Emergency Mode & Evacuation"])

router_service = SafetyRoutingService()

@router.get("/status", response_model=EmergencyStatus)
async def get_emergency_status():
    """Returns active emergency state, compromised blocks, and all miner evacuation routes."""
    return db.get_emergency_status()

@router.post("/start", response_model=EmergencyStatus)
async def start_emergency():
    """
    🚨 ACTIVATES EMERGENCY EVACUATION MODE:
    - Identifies all active miners
    - Calculates safest route for each miner to best exit / refuge
    - Identifies critical blocks and blocked tunnels
    - Broadcasts routes to dashboard
    """
    current_map = db.get_current_map()

    # Calculate routes for all miners
    all_routes = router_service.calculate_all_miner_routes(current_map, algorithm="A*")

    critical_blocks = [b.id for b in current_map.blocks if b.risk_level == RiskLevel.CRITICAL]
    blocked_tunnels = [t.id for t in current_map.tunnels if t.is_blocked]

    safe_count = sum(1 for r in all_routes.values() if "SAFE" in r.route_status)
    at_risk_count = len(current_map.miners) - safe_count

    status = EmergencyStatus(
        is_active=True,
        triggered_at=time.time(),
        total_miners=len(current_map.miners),
        safe_miners=safe_count,
        at_risk_miners=at_risk_count,
        active_critical_blocks=critical_blocks,
        active_blocked_tunnels=blocked_tunnels,
        routes=all_routes,
        message="🚨 EMERGENCY MODE ACTIVE: Evacuation routes calculated. Safety-weighted navigation guidance in effect."
    )

    db.set_emergency_status(status)
    return status

@router.post("/stop", response_model=EmergencyStatus)
async def stop_emergency():
    """Deactivates emergency mode, returning to normal monitoring."""
    status = EmergencyStatus(
        is_active=False,
        triggered_at=None,
        total_miners=0,
        safe_miners=0,
        at_risk_miners=0,
        active_critical_blocks=[],
        active_blocked_tunnels=[],
        routes={},
        message="System in normal monitoring mode."
    )
    db.set_emergency_status(status)
    return status

@router.post("/recalculate", response_model=EmergencyStatus)
async def recalculate_emergency_routes():
    """
    DYNAMIC RE-ROUTING:
    Triggered when sensor risk changes, blocks become critical, or tunnels become blocked.
    Recalculates A* for all miners and displays:
    'Route Updated — Safer Alternative Found' or 'NO SAFE ROUTE AVAILABLE'.
    """
    current_map = db.get_current_map()
    prev_status = db.get_emergency_status()

    # Calculate new routes
    new_routes = router_service.calculate_all_miner_routes(current_map, algorithm="A*")

    critical_blocks = [b.id for b in current_map.blocks if b.risk_level == RiskLevel.CRITICAL]
    blocked_tunnels = [t.id for t in current_map.tunnels if t.is_blocked]

    # Check for route changes or unavailable routes
    any_route_changed = False
    any_trapped = False
    for m_id, new_r in new_routes.items():
        if new_r.route_status == "NO SAFE ROUTE AVAILABLE":
            any_trapped = True
        if prev_status.routes and m_id in prev_status.routes:
            old_r = prev_status.routes[m_id]
            if old_r.path != new_r.path:
                any_route_changed = True

    if any_trapped:
        msg = "⚠️ WARNING: NO SAFE ROUTE AVAILABLE for one or more miners. Structural hazards isolate current nodes."
    elif any_route_changed:
        msg = "⚡ Route Updated — Safer Alternative Found. Miners redirected away from elevated risk zones."
    else:
        msg = "Evacuation routes re-verified. All paths optimal."

    safe_count = sum(1 for r in new_routes.values() if "SAFE" in r.route_status)
    at_risk_count = len(current_map.miners) - safe_count

    status = EmergencyStatus(
        is_active=prev_status.is_active or True,
        triggered_at=prev_status.triggered_at or time.time(),
        total_miners=len(current_map.miners),
        safe_miners=safe_count,
        at_risk_miners=at_risk_count,
        active_critical_blocks=critical_blocks,
        active_blocked_tunnels=blocked_tunnels,
        routes=new_routes,
        message=msg
    )

    db.set_emergency_status(status)
    return status
