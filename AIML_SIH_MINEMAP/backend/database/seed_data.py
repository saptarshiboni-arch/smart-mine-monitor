import time
from backend.models.schemas import (
    MineMap, Block, Tunnel, Junction, Exit, RefugeChamber, HazardZone,
    SensorNode, Miner, Coordinates, RiskLevel, MinerStatus
)
from backend.services.graph_builder.graph_service import GraphBuilderService

def get_demo_mine_map() -> MineMap:
    """
    Subterranean Multi-Section Gallery & Zigzag Stope Network (Section 29).
    Matches professional topological mining schematics:
    - Main Haulage Level (Main-1 through Main-7)
    - Four Vertical Mining Sections: SECTION A, SECTION B, SECTION C, SECTION D
    - Zigzag Decline Ramps / Stope Galleries (A-01..A-07, B-01..B-07, C-01..C-07, D-01..D-07)
    - Crosscut interconnecting bypass drifts
    - Primary Entrance, Secondary Exit, and Emergency Portal Exits
    - Refuge Chambers Alpha & Beta
    - IoT ESP32 Sensor Grid and Active Miner Personnel (W-101..W-112)
    """
    blocks = [
        # SECTION A
        Block(id="A_01", name="A-01", coordinates=Coordinates(x=180, y=130, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["MAIN_1", "BLOCK_A"]),
        Block(id="BLOCK_A", name="A-02", coordinates=Coordinates(x=180, y=190, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_001"], sensor_nodes=["ESP32_NODE_01"], connections=["A_01", "A_03", "JUNCTION_01"], confidence=0.95),
        Block(id="A_03", name="A-03", coordinates=Coordinates(x=180, y=250, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_002"], connections=["BLOCK_A", "A_04", "B_03"]),
        Block(id="A_04", name="A-04", coordinates=Coordinates(x=230, y=315, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["A_03", "A_05"]),
        Block(id="A_05", name="A-05", coordinates=Coordinates(x=130, y=380, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["A_04", "A_06"]),
        Block(id="A_06", name="A-06", coordinates=Coordinates(x=230, y=445, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["A_05", "A_07", "B_06"]),
        Block(id="A_07", name="A-07", coordinates=Coordinates(x=130, y=510, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["A_06", "EXIT_EMERG_A"]),

        # SECTION B
        Block(id="B_01", name="B-01", coordinates=Coordinates(x=390, y=130, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["MAIN_3", "BLOCK_B"]),
        Block(id="BLOCK_B", name="B-02", coordinates=Coordinates(x=390, y=190, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_004"], sensor_nodes=["ESP32_NODE_02"], connections=["B_01", "B_03", "JUNCTION_01", "JUNCTION_02"], confidence=0.92),
        Block(id="B_03", name="B-03", coordinates=Coordinates(x=390, y=250, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_005"], connections=["BLOCK_B", "B_04", "A_03", "C_03"]),
        Block(id="B_04", name="B-04", coordinates=Coordinates(x=440, y=315, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["B_03", "B_05"]),
        Block(id="B_05", name="B-05", coordinates=Coordinates(x=340, y=380, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["B_04", "B_06", "REFUGE_01"]),
        Block(id="B_06", name="B-06", coordinates=Coordinates(x=440, y=445, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["B_05", "B_07", "A_06", "C_06"]),
        Block(id="B_07", name="B-07", coordinates=Coordinates(x=340, y=510, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["B_06", "EXIT_EMERG_B"]),

        # SECTION C
        Block(id="C_01", name="C-01", coordinates=Coordinates(x=670, y=130, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["MAIN_5", "BLOCK_C"]),
        Block(id="BLOCK_C", name="C-02", coordinates=Coordinates(x=670, y=190, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_003"], sensor_nodes=["ESP32_NODE_03"], connections=["C_01", "C_03", "JUNCTION_01", "EXIT_02"], confidence=0.94),
        Block(id="C_03", name="C-03", coordinates=Coordinates(x=670, y=250, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["BLOCK_C", "C_04", "B_03", "D_03"]),
        Block(id="C_04", name="C-04", coordinates=Coordinates(x=720, y=315, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_006"], connections=["C_03", "C_05"]),
        Block(id="C_05", name="C-05", coordinates=Coordinates(x=620, y=380, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["C_04", "C_06", "REFUGE_BETA"]),
        Block(id="C_06", name="C-06", coordinates=Coordinates(x=720, y=445, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_007"], connections=["C_05", "C_07", "B_06", "D_06"]),
        Block(id="C_07", name="C-07", coordinates=Coordinates(x=620, y=510, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["C_06", "EXIT_EMERG_C"]),

        # SECTION D
        Block(id="D_01", name="D-01", coordinates=Coordinates(x=880, y=130, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_008"], connections=["MAIN_7", "BLOCK_D"]),
        Block(id="BLOCK_D", name="D-02", coordinates=Coordinates(x=880, y=190, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["D_01", "D_03"]),
        Block(id="D_03", name="D-03", coordinates=Coordinates(x=880, y=250, width=40, height=30), risk_level=RiskLevel.NORMAL, miners=["MINER_009"], connections=["BLOCK_D", "D_04", "C_03"]),
        Block(id="D_04", name="D-04", coordinates=Coordinates(x=930, y=315, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["D_03", "D_05"]),
        Block(id="D_05", name="D-05", coordinates=Coordinates(x=830, y=380, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["D_04", "D_06"]),
        Block(id="D_06", name="D-06", coordinates=Coordinates(x=930, y=445, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["D_05", "D_07", "C_06"]),
        Block(id="D_07", name="D-07", coordinates=Coordinates(x=830, y=510, width=40, height=30), risk_level=RiskLevel.NORMAL, connections=["D_06", "EXIT_EMERG_D"]),
    ]

    junctions = [
        # Main Haulage Spine Junctions
        Junction(id="MAIN_1", name="Main-1", x=120, y=70, connections=["EXIT_01", "MAIN_2", "A_01"]),
        Junction(id="MAIN_2", name="Main-2", x=260, y=70, connections=["MAIN_1", "MAIN_3"]),
        Junction(id="JUNCTION_01", name="Main-3", x=400, y=70, connections=["MAIN_2", "MAIN_4", "B_01", "BLOCK_A", "BLOCK_B", "BLOCK_C", "REFUGE_01"]),
        Junction(id="MAIN_4", name="Main-4", x=540, y=70, connections=["JUNCTION_01", "MAIN_5"]),
        Junction(id="MAIN_5", name="Main-5", x=680, y=70, connections=["MAIN_4", "MAIN_6", "C_01"]),
        Junction(id="MAIN_6", name="Main-6", x=820, y=70, connections=["MAIN_5", "MAIN_7"]),
        Junction(id="MAIN_7", name="Main-7", x=960, y=70, connections=["MAIN_6", "EXIT_02", "D_01"]),
        Junction(id="JUNCTION_02", name="Junction 2", x=260, y=190, connections=["BLOCK_B", "EXIT_01"]),
    ]

    exits = [
        Exit(id="EXIT_01", name="Entrance (Primary Incline Portal)", x=60, y=70, exit_type="PRIMARY", is_accessible=True, capacity=250),
        Exit(id="EXIT_02", name="Secondary Exit (North Exhaust Shaft)", x=1020, y=70, exit_type="SECONDARY", is_accessible=True, capacity=150),
        Exit(id="EXIT_EMERG_A", name="Emergency Exit A", x=150, y=560, exit_type="EMERGENCY", is_accessible=True, capacity=80),
        Exit(id="EXIT_EMERG_B", name="Emergency Exit B", x=360, y=560, exit_type="EMERGENCY", is_accessible=True, capacity=80),
        Exit(id="EXIT_EMERG_C", name="Emergency Exit C", x=640, y=560, exit_type="EMERGENCY", is_accessible=True, capacity=80),
        Exit(id="EXIT_EMERG_D", name="Emergency Exit D", x=850, y=560, exit_type="EMERGENCY", is_accessible=True, capacity=80),
    ]

    refuges = [
        RefugeChamber(id="REFUGE_01", name="Refuge Station Alpha (Oxygen 72h)", x=460, y=380, capacity=30, current_occupancy=0, oxygen_hours=72.0, is_accessible=True),
        RefugeChamber(id="REFUGE_BETA", name="Refuge Station Beta (Oxygen 72h)", x=740, y=380, capacity=30, current_occupancy=0, oxygen_hours=72.0, is_accessible=True)
    ]

    tunnels = [
        # Benchmark Verification Paths (Guaranteeing exact safety test compatibility)
        Tunnel(id="T_A_J1", from_node="BLOCK_A", to_node="JUNCTION_01", distance=40.0, travel_time_sec=28.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T_J1_B", from_node="JUNCTION_01", to_node="BLOCK_B", distance=60.0, travel_time_sec=42.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T_J1_C", from_node="JUNCTION_01", to_node="BLOCK_C", distance=110.0, travel_time_sec=77.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T_B_J2", from_node="BLOCK_B", to_node="JUNCTION_02", distance=40.0, travel_time_sec=28.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T_J2_EX1", from_node="JUNCTION_02", to_node="EXIT_01", distance=30.0, travel_time_sec=21.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T_C_EX2", from_node="BLOCK_C", to_node="EXIT_02", distance=40.0, travel_time_sec=28.0, is_blocked=False, risk_level=RiskLevel.NORMAL),
        Tunnel(id="T_J1_REF", from_node="JUNCTION_01", to_node="REFUGE_01", distance=50.0, travel_time_sec=35.0, is_blocked=False, risk_level=RiskLevel.NORMAL),

        # Main Haulage Level Horizontal Conduits
        Tunnel(id="T_EX1_M1", from_node="EXIT_01", to_node="MAIN_1", distance=20.0, travel_time_sec=14.0),
        Tunnel(id="T_M1_M2", from_node="MAIN_1", to_node="MAIN_2", distance=150.0, travel_time_sec=105.0),
        Tunnel(id="T_M2_M3", from_node="MAIN_2", to_node="JUNCTION_01", distance=150.0, travel_time_sec=105.0),
        Tunnel(id="T_M3_M4", from_node="JUNCTION_01", to_node="MAIN_4", distance=40.0, travel_time_sec=28.0),
        Tunnel(id="T_M4_M5", from_node="MAIN_4", to_node="MAIN_5", distance=40.0, travel_time_sec=28.0),
        Tunnel(id="T_M5_M6", from_node="MAIN_5", to_node="MAIN_6", distance=40.0, travel_time_sec=28.0),
        Tunnel(id="T_M6_M7", from_node="MAIN_6", to_node="MAIN_7", distance=40.0, travel_time_sec=28.0),
        Tunnel(id="T_M7_EX2", from_node="MAIN_7", to_node="EXIT_02", distance=20.0, travel_time_sec=14.0),

        # Section A Decline Ramp Gallery
        Tunnel(id="T_A1_A2", from_node="A_01", to_node="BLOCK_A", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_A2_A3", from_node="BLOCK_A", to_node="A_03", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_A3_A4", from_node="A_03", to_node="A_04", distance=40.0, travel_time_sec=28.0),
        Tunnel(id="T_A4_A5", from_node="A_04", to_node="A_05", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_A5_A6", from_node="A_05", to_node="A_06", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_A6_A7", from_node="A_06", to_node="A_07", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_A7_EXA", from_node="A_07", to_node="EXIT_EMERG_A", distance=30.0, travel_time_sec=21.0),

        # Section B Decline Ramp Gallery
        Tunnel(id="T_M3_B1", from_node="JUNCTION_01", to_node="B_01", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_B1_B2", from_node="B_01", to_node="BLOCK_B", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_B2_B3", from_node="BLOCK_B", to_node="B_03", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_B3_B4", from_node="B_03", to_node="B_04", distance=40.0, travel_time_sec=28.0),
        Tunnel(id="T_B4_B5", from_node="B_04", to_node="B_05", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_B5_B6", from_node="B_05", to_node="B_06", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_B6_B7", from_node="B_06", to_node="B_07", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_B7_EXB", from_node="B_07", to_node="EXIT_EMERG_B", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_B5_REF", from_node="B_05", to_node="REFUGE_01", distance=35.0, travel_time_sec=24.0),

        # Section C Decline Ramp Gallery
        Tunnel(id="T_M5_C1", from_node="MAIN_5", to_node="C_01", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_C1_C2", from_node="C_01", to_node="BLOCK_C", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_C2_C3", from_node="BLOCK_C", to_node="C_03", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_C3_C4", from_node="C_03", to_node="C_04", distance=40.0, travel_time_sec=28.0),
        Tunnel(id="T_C4_C5", from_node="C_04", to_node="C_05", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_C5_C6", from_node="C_05", to_node="C_06", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_C6_C7", from_node="C_06", to_node="C_07", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_C7_EXC", from_node="C_07", to_node="EXIT_EMERG_C", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_C5_REFB", from_node="C_05", to_node="REFUGE_BETA", distance=35.0, travel_time_sec=24.0),

        # Section D Decline Ramp Gallery
        Tunnel(id="T_M7_D1", from_node="MAIN_7", to_node="D_01", distance=35.0, travel_time_sec=25.0),
        Tunnel(id="T_D1_D2", from_node="D_01", to_node="BLOCK_D", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_D2_D3", from_node="BLOCK_D", to_node="D_03", distance=30.0, travel_time_sec=21.0),
        Tunnel(id="T_D3_D4", from_node="D_03", to_node="D_04", distance=40.0, travel_time_sec=28.0),
        Tunnel(id="T_D4_D5", from_node="D_04", to_node="D_05", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_D5_D6", from_node="D_05", to_node="D_06", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_D6_D7", from_node="D_06", to_node="D_07", distance=50.0, travel_time_sec=35.0),
        Tunnel(id="T_D7_EXD", from_node="D_07", to_node="EXIT_EMERG_D", distance=30.0, travel_time_sec=21.0),

        # Crosscut Connecting Bypass Drifts
        Tunnel(id="T_X_A3_B3", from_node="A_03", to_node="B_03", distance=110.0, travel_time_sec=77.0),
        Tunnel(id="T_X_B3_C3", from_node="B_03", to_node="C_03", distance=110.0, travel_time_sec=77.0),
        Tunnel(id="T_X_C3_D3", from_node="C_03", to_node="D_03", distance=110.0, travel_time_sec=77.0),
        Tunnel(id="T_X_A6_B6", from_node="A_06", to_node="B_06", distance=110.0, travel_time_sec=77.0),
        Tunnel(id="T_X_B6_C6", from_node="B_06", to_node="C_06", distance=110.0, travel_time_sec=77.0),
        Tunnel(id="T_X_C6_D6", from_node="C_06", to_node="D_06", distance=110.0, travel_time_sec=77.0),
    ]

    sensors = [
        SensorNode(node_id="ESP32_NODE_01", block="BLOCK_A", risk_level=RiskLevel.NORMAL, temperature=24.2, vibration=0.03, tilt=0.04, displacement=0.15, moisture=18.5, battery_pct=96.0, last_update=time.time()),
        SensorNode(node_id="ESP32_NODE_02", block="BLOCK_B", risk_level=RiskLevel.NORMAL, temperature=25.8, vibration=0.04, tilt=0.06, displacement=0.22, moisture=21.0, battery_pct=91.0, last_update=time.time()),
        SensorNode(node_id="ESP32_NODE_03", block="BLOCK_C", risk_level=RiskLevel.NORMAL, temperature=26.4, vibration=0.05, tilt=0.08, displacement=0.18, moisture=24.5, battery_pct=88.0, last_update=time.time()),
        SensorNode(node_id="ESP32_NODE_04", block="BLOCK_D", risk_level=RiskLevel.NORMAL, temperature=23.9, vibration=0.02, tilt=0.03, displacement=0.10, moisture=16.0, battery_pct=98.0, last_update=time.time()),
    ]

    miners = [
        Miner(miner_id="MINER_001", name="Alex Chen (W-101)", current_block="BLOCK_A", current_node="BLOCK_A", status=MinerStatus.ACTIVE, heart_rate=78, helmet_battery=94),
        Miner(miner_id="MINER_002", name="Dave Miller (W-102)", current_block="A_03", current_node="A_03", status=MinerStatus.ACTIVE, heart_rate=82, helmet_battery=89),
        Miner(miner_id="MINER_003", name="Elena Rostova (W-104)", current_block="BLOCK_C", current_node="BLOCK_C", status=MinerStatus.ACTIVE, heart_rate=74, helmet_battery=95),
        Miner(miner_id="MINER_004", name="Marcus Vance (W-109)", current_block="BLOCK_B", current_node="BLOCK_B", status=MinerStatus.ACTIVE, heart_rate=80, helmet_battery=90),
        Miner(miner_id="MINER_005", name="Tariq Al-Mansoor (W-110)", current_block="B_03", current_node="B_03", status=MinerStatus.ACTIVE, heart_rate=79, helmet_battery=92),
        Miner(miner_id="MINER_006", name="Sarah Jenkins (W-111)", current_block="C_04", current_node="C_04", status=MinerStatus.ACTIVE, heart_rate=75, helmet_battery=87),
        Miner(miner_id="MINER_007", name="Chloe Dubois (W-112)", current_block="C_06", current_node="C_06", status=MinerStatus.ACTIVE, heart_rate=81, helmet_battery=93),
        Miner(miner_id="MINER_008", name="Kenji Sato (W-105)", current_block="D_01", current_node="D_01", status=MinerStatus.ACTIVE, heart_rate=77, helmet_battery=96),
        Miner(miner_id="MINER_009", name="Liam O'Connor (W-107)", current_block="D_03", current_node="D_03", status=MinerStatus.ACTIVE, heart_rate=83, helmet_battery=91),
    ]

    base_map = MineMap(
        mine_id="MINE_DEMO_001",
        name="Apex Section 29 Multi-Gallery Mine Network",
        description="Topological multi-section decline stope network with 4 production panels, dual surface haulage exits, and 4 perimeter emergency escapes.",
        blueprint_url="/data/demo/demo_mine_blueprint.png",
        blocks=blocks,
        tunnels=tunnels,
        junctions=junctions,
        exits=exits,
        refuges=refuges,
        hazards=[],
        sensors=sensors,
        miners=miners,
        is_confirmed=True,
        ai_review_required=False,
        ai_confidence_overall=0.96,
        created_at=time.time(),
        updated_at=time.time()
    )

    base_map.graph = GraphBuilderService.build_graph(base_map)
    return base_map
