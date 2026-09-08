import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.blueprint import router as blueprint_router
from backend.api.map import router as map_router
from backend.api.miners import router as miners_router
from backend.api.sensors import router as sensors_router
from backend.api.routing import router as routing_router
from backend.api.emergency import router as emergency_router
from backend.api.simulation import router as simulation_router
from backend.database.db import db

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload database with initial map
    _ = db.get_current_map()
    yield

app = FastAPI(
    title="AI-Powered Mine Blueprint Mapping & Safest Emergency Route System",
    description="Subterranean Smart Mine safety admin panel, CubiCasa5K-inspired floorplan perception, and safety-weighted emergency routing engine.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for blueprints and assets
data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
if os.path.exists(data_dir):
    app.mount("/data", StaticFiles(directory=data_dir), name="data")

# Register API routers
app.include_router(blueprint_router)
app.include_router(map_router)
app.include_router(miners_router)
app.include_router(sensors_router)
app.include_router(routing_router)
app.include_router(emergency_router)
app.include_router(simulation_router)

@app.get("/")
async def root():
    return {
        "system": "AI-Powered Mine Blueprint Mapping & Safest Emergency Route System",
        "status": "ONLINE",
        "docs_url": "/docs",
        "endpoints": [
            "/api/blueprint/upload",
            "/api/blueprint/analyze",
            "/api/map",
            "/api/miners",
            "/api/sensors",
            "/api/route/calculate",
            "/api/emergency/start",
            "/api/emergency/status",
            "/api/simulation/block-risk"
        ]
    }

@app.get("/api/health")
async def health_check():
    return {"status": "HEALTHY", "database": "SQLITE_CONNECTED"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
