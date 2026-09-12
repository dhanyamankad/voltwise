import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.app import db
from backend.app.ws import manager
from backend.app.routes.api import router as api_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("voltwise.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and default ports
    logger.info("Initializing SQLite database...")
    db.init_db()
    logger.info("VoltWise Backend started successfully.")
    yield
    logger.info("VoltWise Backend shutting down.")


app = FastAPI(
    title="VoltWise — Adaptive EV Charging API",
    description="Backend API and Realtime engine coordinating EV charging with renewable signals for HackOut'26.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for local frontend development (Vite, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "service": "VoltWise Adaptive EV Charging API",
        "status": "operational",
        "docs_url": "/docs",
        "ws_url": "/ws/updates"
    }


@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time schedule updates and PlanChangedEvent notifications.
    Frontend connects once and receives live JSON messages.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open, client can send ping/heartbeat or messages
            data = await websocket.receive_text()
            logger.debug(f"Received WS ping from client: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        manager.disconnect(websocket)
