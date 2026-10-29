import asyncio
import pytest
from app.core.database import engine
from app.models.base import Base
import app.models  # noqa: F401


@pytest.fixture(scope="session", autouse=True)
def init_test_db():
    async def _init():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(_init())
