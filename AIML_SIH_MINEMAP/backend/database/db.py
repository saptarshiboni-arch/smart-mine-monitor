import os
import json
import sqlite3
from typing import Optional, Dict, Any
from backend.models.schemas import MineMap, EmergencyStatus
from backend.database.seed_data import get_demo_mine_map

DB_PATH = os.path.join(os.path.dirname(__file__), "mine_map.db")

class DatabaseManager:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()
        self._current_map: Optional[MineMap] = None
        self._emergency_status: EmergencyStatus = EmergencyStatus()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mine_maps (
                    mine_id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS emergency_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    timestamp REAL NOT NULL
                )
            """)
            conn.commit()

    def get_current_map(self) -> MineMap:
        if self._current_map is not None:
            return self._current_map

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data FROM mine_maps ORDER BY updated_at DESC LIMIT 1")
            row = cursor.fetchone()
            if row:
                data_dict = json.loads(row["data"])
                self._current_map = MineMap(**data_dict)
            else:
                # Seed with demo map
                demo_map = get_demo_mine_map()
                self.save_map(demo_map)
                self._current_map = demo_map

        return self._current_map

    def save_map(self, mine_map: MineMap):
        self._current_map = mine_map
        json_data = mine_map.model_dump_json()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO mine_maps (mine_id, data, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(mine_id) DO UPDATE SET
                    data = excluded.data,
                    updated_at = excluded.updated_at
            """, (mine_map.mine_id, json_data, mine_map.updated_at))
            conn.commit()

    def get_emergency_status(self) -> EmergencyStatus:
        return self._emergency_status

    def set_emergency_status(self, status: EmergencyStatus):
        self._emergency_status = status
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO emergency_logs (event_type, payload, timestamp)
                VALUES (?, ?, ?)
            """, ("STATUS_CHANGE", status.model_dump_json(), status.triggered_at or 0.0))
            conn.commit()

db = DatabaseManager()
