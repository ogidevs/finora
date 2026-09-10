from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall service status (healthy or degraded)")
    database: str = Field(..., description="Database connection status (connected or disconnected)")
    environment: str = Field(..., description="Current running environment")
    version: str = Field(..., description="API Version")
    timestamp: datetime = Field(..., description="Current server time (UTC)")


class PingResponse(BaseModel):
    ping: str = "pong"
