"""
ReconEngine — FastAPI Application Entry Point
===============================================
Regista todos os routers e configura middlewares.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import runs, matching, open_items, reports, health
from app.config import settings
from app.db.session import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()


app = FastAPI(
    title="ReconEngine API",
    description="Motor de reconciliação bancária automatizada — 3-tier matching engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,     prefix="/api",            tags=["health"])
app.include_router(runs.router,       prefix="/api/runs",       tags=["runs"])
app.include_router(matching.router,   prefix="/api/matching",   tags=["matching"])
app.include_router(open_items.router, prefix="/api/open-items", tags=["open-items"])
app.include_router(reports.router,    prefix="/api/reports",    tags=["reports"])


@app.get("/")
def root():
    return {"service": "ReconEngine API", "version": "1.0.0", "docs": "/docs"}
