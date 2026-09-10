from datetime import datetime, timezone
from fastapi import APIRouter, status
from sqlalchemy import text
from app.api.deps import SessionDep
from app.core.config import settings
from app.schemas.health import HealthResponse, PingResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application Health Status",
    description="Checks the health of the application and the live PostgreSQL database connection."
)
async def get_health(db: SessionDep) -> HealthResponse:
    db_connected = False
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_connected = True
    except Exception:
        db_connected = False

    return HealthResponse(
        status="healthy" if db_connected else "degraded",
        database="connected" if db_connected else "disconnected",
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc),
    )


@router.get(
    "/ping",
    response_model=PingResponse,
    summary="Simple Ping",
    description="Lightweight ping endpoint that does not hit the database."
)
async def ping() -> PingResponse:
    return PingResponse()
