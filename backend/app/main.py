"""
VoltWise FastAPI Backend Server

API Server for Driver & Operator UI, WebSocket Realtime Updates, and Optimization Engine Orchestration.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db import init_db
from app.routes.api import router as api_router
from app.ws import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup DB initialization
    init_db()
    yield


app = FastAPI(
    title="VoltWise API Server",
    description="Adaptive EV Charging for a Renewable-Powered Grid",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for local frontend dev (React/Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST API routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "VoltWise API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open and listen for ping/pong or client messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
