from typing import Dict, Any, Tuple
from backend.models.schemas import SensorNode, RiskLevel, Block, MineMap

class RiskEvaluatorService:
    """
    Evaluates raw physical sensor telemetry (ESP32/LoRa) and ML risk indicators,
    determining localized risk levels (NORMAL, WARNING, CRITICAL) for mine blocks.
    """

    THRESHOLDS = {
        "temperature": {"warning": 36.0, "critical": 45.0}, # °C
        "vibration":   {"warning": 0.12, "critical": 0.30}, # g acceleration
        "tilt":        {"warning": 0.18, "critical": 0.45}, # degrees
        "displacement":{"warning": 1.20, "critical": 2.80}, # mm
        "moisture":    {"warning": 40.0, "critical": 65.0}, # %
    }

    @classmethod
    def evaluate_sensor(cls, sensor: SensorNode) -> Tuple[RiskLevel, str]:
        critical_reasons = []
        warning_reasons = []

        if sensor.temperature >= cls.THRESHOLDS["temperature"]["critical"]:
            critical_reasons.append(f"Extreme heat: {sensor.temperature}°C")
        elif sensor.temperature >= cls.THRESHOLDS["temperature"]["warning"]:
            warning_reasons.append(f"Elevated heat: {sensor.temperature}°C")

        if sensor.vibration >= cls.THRESHOLDS["vibration"]["critical"]:
            critical_reasons.append(f"Severe seismic vibration: {sensor.vibration}g")
        elif sensor.vibration >= cls.THRESHOLDS["vibration"]["warning"]:
            warning_reasons.append(f"Tremor warning: {sensor.vibration}g")

        if sensor.tilt >= cls.THRESHOLDS["tilt"]["critical"]:
            critical_reasons.append(f"Strata deformation tilt: {sensor.tilt}°")
        elif sensor.tilt >= cls.THRESHOLDS["tilt"]["warning"]:
            warning_reasons.append(f"Wall displacement tilt: {sensor.tilt}°")

        if sensor.displacement >= cls.THRESHOLDS["displacement"]["critical"]:
            critical_reasons.append(f"Rock wall convergence: {sensor.displacement}mm")
        elif sensor.displacement >= cls.THRESHOLDS["displacement"]["warning"]:
            warning_reasons.append(f"Strata displacement: {sensor.displacement}mm")

        if sensor.moisture >= cls.THRESHOLDS["moisture"]["critical"]:
            critical_reasons.append(f"Water inrush hazard: {sensor.moisture}%")
        elif sensor.moisture >= cls.THRESHOLDS["moisture"]["warning"]:
            warning_reasons.append(f"Elevated humidity: {sensor.moisture}%")

        if critical_reasons:
            return RiskLevel.CRITICAL, "; ".join(critical_reasons)
        if warning_reasons:
            return RiskLevel.WARNING, "; ".join(warning_reasons)
        return RiskLevel.NORMAL, "All parameters nominal"

    @classmethod
    def update_mine_map_risks(cls, mine_map: MineMap) -> MineMap:
        """
        Aggregates sensor states into block-level risk ratings.
        """
        # Map block -> list of sensors
        block_sensors: Dict[str, list] = {}
        for s in mine_map.sensors:
            evaluated_risk, reason = cls.evaluate_sensor(s)
            s.risk_level = evaluated_risk
            block_sensors.setdefault(s.block, []).append(s.risk_level)

        for b in mine_map.blocks:
            risks = block_sensors.get(b.id, [])
            if RiskLevel.CRITICAL in risks:
                b.risk_level = RiskLevel.CRITICAL
            elif RiskLevel.WARNING in risks:
                b.risk_level = RiskLevel.WARNING
            else:
                if not b.is_unavailable:
                    # Keep manual simulation or normal
                    pass

        return mine_map
