"""
===============================================================================
Module: FastAPI Application Entry Point (main.py)
Description: 
    The core application script. Initializes the FastAPI server, configures
    CORS middleware, manages the database connection lifecycle, and mounts
    all methodological routing modules (DDCM, DDAM, RSR, RDAM, MDAM, AV, VO).
===============================================================================
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.config import settings, logger
from core.database import init_db, close_db

# Methodology Routes
from routers import ddcm, rsr, ddam, rdam, mdam, av, vo, history

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("Pipeline Backend Starting...")
    yield
    await close_db()
    logger.info("Pipeline Backend Stopping...")

app = FastAPI(title="Data Modeling Pipeline API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow frontend to communicate freely within Docker
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration (Step-by-Step Pipeline)
app.include_router(ddcm.router)
app.include_router(rsr.router)
app.include_router(ddam.router)
app.include_router(rdam.router)
app.include_router(mdam.router)
app.include_router(av.router)
app.include_router(vo.router)
app.include_router(history.router)

@app.get("/")
def read_root():
    return {"status": "Pipeline Backend is running!"}