import pytest
from backend.models.schemas import (
    MineMap, Block, Tunnel, Junction, Exit, RefugeChamber, Miner, Coordinates, RiskLevel, RiskCostConfig
)
from backend.services.routing.safety_router import SafetyRoutingService

def create_benchmark_mine_map():
    r"""
    Constructs the benchmark test scenario:
             BLOCK A (Miner 1)
                |  (Tunnel 1, 40m)
             JUNCTION 1
             /        \
   (T2, 60m)/          \(T3, 110m)
       BLOCK B        BLOCK C
         | (T4, 40m)     | (T5, 40m)
     JUNCTION 2       EXIT 2 (Primary East)
         | (T6, 30m)
       EXIT 1 (Primary South)
    """
    blocks = [
        Block(id="BLOCK_A", name="Block A - North Drift", coordinates=Coordinates(x=350, y=80), risk_level=RiskLevel.NORMAL, connections=["JUNCTION_1"]),
        Block(id="BLOCK_B", name="Block B - West Cut", coordinates=Coordinates(x=180, y=260), risk_level=RiskLevel.NORMAL, connections=["JUNCTION_1", "JUNCTION_2"]),
        Block(id="BLOCK_C", name="Block C - East Stope", coordinates=Coordinates(x=520, y=260), risk_level=RiskLevel.NORMAL, connections=["JUNCTION_1", "EXIT_02"]),
    ]

    junctions = [
        Junction(id="JUNCTION_1", name="Junction 1 (Main Drift)", x=350, y=170, connections=["BLOCK_A", "BLOCK_B", "BLOCK_C"]),
        Junction(id="JUNCTION_2", name="Junction 2 (South Shaft Junction)", x=180, y=360, connections=["BLOCK_B", "EXIT_01"]),
    ]

    exits = [
        Exit(id="EXIT_01", name="Exit 1 (South Incline)", x=180, y=460, exit_type="PRIMARY", is_accessible=True),
        Exit(id="EXIT_02", name="Exit 2 (East Ventilation Portal)", x=520, y=460, exit_type="SECONDARY", is_accessible=True),
    ]

    refuges = [
        RefugeChamber(id="REFUGE_01", name="Refuge Chamber Alpha", x=400, y=320, capacity=20, current_occupancy=2, is_accessible=True)
    ]

    tunnels = [
        Tunnel(id="T1", from_node="BLOCK_A", to_node="JUNCTION_1", distance=40.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T2", from_node="JUNCTION_1", to_node="BLOCK_B", distance=60.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T3", from_node="JUNCTION_1", to_node="BLOCK_C", distance=110.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T4", from_node="BLOCK_B", to_node="JUNCTION_2", distance=40.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T5", from_node="BLOCK_C", to_node="EXIT_02", distance=40.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T6", from_node="JUNCTION_2", to_node="EXIT_01", distance=30.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        # Interconnecting tunnel between Junction 1 and Refuge 1
        Tunnel(id="T7", from_node="JUNCTION_1", to_node="REFUGE_01", distance=50.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
    ]

    miners = [
        Miner(miner_id="MINER_001", name="Alex Chen", current_block="BLOCK_A", current_node="BLOCK_A"),
        Miner(miner_id="MINER_002", name="Dave Miller", current_block="BLOCK_B", current_node="BLOCK_B"),
        Miner(miner_id="MINER_003", name="Elena Rostova", current_block="BLOCK_C", current_node="BLOCK_C"),
    ]

    return MineMap(
        mine_id="TEST_MINE_01",
        blocks=blocks,
        junctions=junctions,
        exits=exits,
        refuges=refuges,
        tunnels=tunnels,
        miners=miners
    )


def test_safety_dominates_distance():
    """
    CRITICAL TEST REQUIREMENT:
    Safety must dominate distance!
    When all blocks are NORMAL:
      Route via BLOCK B to EXIT 1: Distance = 40 + 60 + 40 + 30 = 170m
      Route via BLOCK C to EXIT 2: Distance = 40 + 110 + 40 = 190m
      Miner 1 naturally chooses EXIT 1 because both are NORMAL.
    Now switch BLOCK B to CRITICAL:
      The router MUST choose EXIT 2 via BLOCK C, even though it is 190m (> 170m),
      because BLOCK B is dangerous!
    """
    mine_map = create_benchmark_mine_map()
    router = SafetyRoutingService()

    # Step 1: All NORMAL -> Miner 1 takes the 170m route through Block B to Exit 1
    route_normal = router.calculate_safest_route_for_miner(mine_map.miners[0], mine_map, algorithm="A*")
    assert route_normal.destination_node == "EXIT_01"
    assert "BLOCK_B" in route_normal.path
    assert route_normal.critical_areas_encountered == 0

    # Step 2: Set BLOCK B to CRITICAL
    for b in mine_map.blocks:
        if b.id == "BLOCK_B":
            b.risk_level = RiskLevel.CRITICAL

    route_critical_b = router.calculate_safest_route_for_miner(mine_map.miners[0], mine_map, algorithm="A*")
    # MUST avoid Block B and take the longer Route 2 via Block C to Exit 2!
    assert "BLOCK_B" not in route_critical_b.path
    assert route_critical_b.destination_node == "EXIT_02"
    assert "BLOCK_C" in route_critical_b.path
    assert route_critical_b.critical_areas_encountered == 0
    assert route_critical_b.total_distance == 190.0  # 40 + 110 + 40


def test_dijkstra_and_astar_consistency():
    """Verify both Dijkstra and A* arrive at the safest route."""
    mine_map = create_benchmark_mine_map()
    router = SafetyRoutingService()

    route_astar = router.calculate_safest_route_for_miner(mine_map.miners[0], mine_map, algorithm="A*")
    route_dijkstra = router.calculate_safest_route_for_miner(mine_map.miners[0], mine_map, algorithm="Dijkstra")

    assert route_astar.path == route_dijkstra.path
    assert route_astar.destination_node == route_dijkstra.destination_node
    assert route_astar.total_distance == route_dijkstra.total_distance


def test_blocked_tunnel_avoidance():
    """Verify blocked tunnels are strictly avoided."""
    mine_map = create_benchmark_mine_map()
    router = SafetyRoutingService()

    # Block tunnel T2 (Junction 1 to Block B)
    for t in mine_map.tunnels:
        if t.id == "T2":
            t.is_blocked = True

    route = router.calculate_safest_route_for_miner(mine_map.miners[0], mine_map, algorithm="A*")
    assert "BLOCK_B" not in route.path
    assert route.destination_node == "EXIT_02"


def test_no_safe_route_when_all_blocked():
    """Verify system explicitly returns 'NO SAFE ROUTE AVAILABLE' when all exits are blocked."""
    mine_map = create_benchmark_mine_map()
    router = SafetyRoutingService()

    # Block the root tunnel from Block A
    for t in mine_map.tunnels:
        if t.id == "T1":
            t.is_blocked = True

    route = router.calculate_safest_route_for_miner(mine_map.miners[0], mine_map, algorithm="A*")
    assert route.route_status == "NO SAFE ROUTE AVAILABLE"
    assert route.path == []


def test_multi_miner_routes():
    """Verify individual routes are calculated for multiple miners simultaneously."""
    mine_map = create_benchmark_mine_map()
    router = SafetyRoutingService()

    all_routes = router.calculate_all_miner_routes(mine_map, algorithm="A*")
    assert len(all_routes) == 3
    assert all_routes["MINER_001"].destination_node in ["EXIT_01", "EXIT_02"]
    assert all_routes["MINER_002"].destination_node == "EXIT_01"  # Miner in Block B right next to Junction 2 -> Exit 1
    assert all_routes["MINER_003"].destination_node == "EXIT_02"  # Miner in Block C right next to Exit 2
