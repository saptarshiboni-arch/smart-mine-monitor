import time
from typing import Dict, Any, List
from backend.models.schemas import (
    MineMap, Block, Tunnel, Junction, Exit, RefugeChamber, HazardZone,
    SensorNode, Miner, Coordinates, Dimensions, RiskLevel, MinerStatus
)

class MineSemanticMapper:
    """
    Converts raw geometric regions and passages from the floorplan perception model
    into mine-specific semantic entities (Blocks, Tunnels, Junctions, Exits, Refuges, Sensors).
    """

    def generate_mine_map(self, perception_output: Dict[str, Any], blueprint_url: str = "") -> MineMap:
        extracted_rooms = perception_output.get("extracted_rooms", [])
        extracted_corridors = perception_output.get("extracted_corridors", [])
        extracted_junctions = perception_output.get("extracted_junctions", [])
        extracted_exits = perception_output.get("extracted_exits", [])
        extracted_refuges = perception_output.get("extracted_refuges", [])
        extracted_shafts = perception_output.get("extracted_shafts", [])

        # 1. Map extracted rooms to mine BLOCKS
        blocks: List[Block] = []
        for i, room in enumerate(extracted_rooms):
            b_id = room.get("id", f"BLOCK_{chr(65 + i) if i < 26 else i+1}")
            b_name = room.get("name", f"Block {chr(65 + i) if i < 26 else i+1} - Extraction Stope")
            coords = Coordinates(
                x=float(room["x"]),
                y=float(room["y"]),
                width=float(room.get("width", 140.0)),
                height=float(room.get("height", 80.0))
            )
            blocks.append(Block(
                id=b_id,
                name=b_name,
                risk_level=RiskLevel.NORMAL,
                coordinates=coords,
                confidence=room.get("confidence", 0.92),
                uncertain_flag=room.get("uncertain_flag", False),
                connections=[]
            ))

        # 2. Map Junctions
        junctions: List[Junction] = []
        for junc in extracted_junctions:
            jx = float(junc["x"])
            jy = float(junc["y"])
            junctions.append(Junction(
                id=junc["id"],
                name=junc.get("name", f"Junction {junc['id']}"),
                x=jx,
                y=jy,
                coordinates=Coordinates(x=jx, y=jy, width=40.0, height=40.0),
                connections=[]
            ))

        # 3. Map Exits (including shafts)
        exits: List[Exit] = []
        for ex in extracted_exits:
            ex_x = float(ex["x"])
            ex_y = float(ex["y"])
            exits.append(Exit(
                id=ex["id"],
                name=ex.get("name", f"Surface Exit {ex['id']}"),
                x=ex_x,
                y=ex_y,
                coordinates=Coordinates(x=ex_x, y=ex_y, width=80.0, height=50.0),
                exit_type=ex.get("exit_type", "PRIMARY"),
                is_accessible=True,
                capacity=200
            ))

        for sh in extracted_shafts:
            sh_x = float(sh["x"])
            sh_y = float(sh["y"])
            exits.append(Exit(
                id=sh["id"],
                name=sh.get("name", f"Ventilation Shaft {sh['id']}"),
                x=sh_x,
                y=sh_y,
                coordinates=Coordinates(x=sh_x, y=sh_y, width=50.0, height=50.0),
                exit_type="SHAFT",
                is_accessible=True,
                capacity=50
            ))

        # 4. Map Refuge Chambers
        refuges: List[RefugeChamber] = []
        for rf in extracted_refuges:
            rf_x = float(rf["x"])
            rf_y = float(rf["y"])
            refuges.append(RefugeChamber(
                id=rf["id"],
                name=rf.get("name", f"Refuge Pod {rf['id']}"),
                x=rf_x,
                y=rf_y,
                coordinates=Coordinates(x=rf_x, y=rf_y, width=50.0, height=50.0),
                capacity=25,
                current_occupancy=0,
                oxygen_hours=72.0,
                is_accessible=True
            ))

        # Fallback refuge if none detected and junctions exist
        if not refuges and junctions:
            refuge_x = junctions[0].x + 80
            refuge_y = junctions[0].y + 40
            refuges.append(RefugeChamber(
                id="REFUGE_01",
                name="Refuge Station Alpha",
                x=refuge_x,
                y=refuge_y,
                coordinates=Coordinates(x=refuge_x, y=refuge_y, width=50.0, height=50.0),
                capacity=25,
                current_occupancy=0,
                oxygen_hours=72.0,
                is_accessible=True
            ))

        # All valid node IDs in the map
        valid_node_ids = set(
            [b.id for b in blocks] +
            [j.id for j in junctions] +
            [e.id for e in exits] +
            [r.id for r in refuges]
        )

        # Map from room ID to block ID for backwards compatibility with CubiCasa
        room_to_block = {
            room["id"]: blocks[i].id
            for i, room in enumerate(extracted_rooms)
            if i < len(blocks)
        }

        # 5. Map Corridors to Tunnels
        tunnels: List[Tunnel] = []
        for corr in extracted_corridors:
            raw_u = corr["from_node"]
            raw_v = corr["to_node"]
            u = room_to_block.get(raw_u, raw_u)
            v = room_to_block.get(raw_v, raw_v)
            if u in valid_node_ids and v in valid_node_ids:
                tunnels.append(Tunnel(
                    id=corr["id"],
                    from_node=u,
                    to_node=v,
                    distance=float(corr.get("distance", 50.0)),
                    travel_time_sec=float(corr.get("travel_time_sec", 35.0)),
                    is_blocked=corr.get("is_blocked", False),
                    risk_level=RiskLevel.NORMAL,
                    width=float(corr.get("width", 8.0)),
                    polyline=corr.get("polyline"),
                    confidence=float(corr.get("confidence", 0.95))
                ))

        # Add exit tunnels connecting surface exits to mine network
        exit_tunnels: List[Tunnel] = []
        for ex in exits:
            target_node = None
            if junctions:
                target_node = min(junctions, key=lambda j: (j.x - ex.x)**2 + (j.y - ex.y)**2).id
            elif blocks:
                target_node = min(blocks, key=lambda b: (b.coordinates.x - ex.x)**2 + (b.coordinates.y - ex.y)**2).id
            if target_node and not any(t.to_node == ex.id or t.from_node == ex.id for t in tunnels):
                exit_tunnels.append(Tunnel(
                    id=f"T_EXIT_{ex.id}",
                    from_node=target_node,
                    to_node=ex.id,
                    distance=45.0,
                    travel_time_sec=30.0,
                    is_blocked=False,
                    risk_level=RiskLevel.NORMAL
                ))
        tunnels.extend(exit_tunnels)

        # Ensure minimal tunnel connectivity if empty
        if not tunnels and len(blocks) >= 2:
            tunnels.append(Tunnel(
                id="TUNNEL_01",
                from_node=blocks[0].id,
                to_node=blocks[1].id,
                distance=45.0,
                travel_time_sec=30.0,
                is_blocked=False,
                risk_level=RiskLevel.NORMAL
            ))

        # 6. Assign Sensors to Blocks
        sensors: List[SensorNode] = []
        for i, b in enumerate(blocks):
            sensor_id = f"ESP32_NODE_{i+1:02d}"
            sensors.append(SensorNode(
                node_id=sensor_id,
                block=b.id,
                risk_level=RiskLevel.NORMAL,
                temperature=24.0 + (i * 1.5),
                vibration=0.03,
                tilt=0.05,
                displacement=0.1,
                moisture=16.0 + i
            ))
            b.sensor_nodes.append(sensor_id)

        # 7. Add default registered Miners in initial blocks
        miners: List[Miner] = []
        sample_names = ["Alex Chen (Lead)", "Dave Miller", "Elena Rostova", "Marcus Vance", "Priya Sharma"]
        for i in range(min(3, len(blocks))):
            miners.append(Miner(
                miner_id=f"MINER_{i+1:03d}",
                name=sample_names[i],
                current_block=blocks[i].id,
                current_node=blocks[i].id,
                status=MinerStatus.ACTIVE,
                heart_rate=76 + i * 2,
                helmet_battery=92 - i * 4
            ))
        dims = perception_output.get("dimensions", {"width": 1200.0, "height": 800.0})
        dimensions = Dimensions(width=float(dims.get("width", 1200.0)), height=float(dims.get("height", 800.0)))

        return MineMap(
            mine_id="MINE_GENERATED_01",
            name="AI-Interpreted Subterranean Mine Sector",
            description="Generated via Subterranean Native Perception Engine. Review and confirm before emergency activation.",
            blueprint_url=blueprint_url,
            dimensions=dimensions,
            blocks=blocks,
            tunnels=tunnels,
            junctions=junctions,
            exits=exits,
            refuges=refuges,
            hazards=[],
            sensors=sensors,
            miners=miners,
            is_confirmed=False,
            ai_review_required=True,
            ai_confidence_overall=perception_output.get("overall_confidence", 0.93),
            created_at=time.time(),
            updated_at=time.time()
        )
