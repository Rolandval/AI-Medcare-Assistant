"""Test fixtures — test PostgreSQL DB, test client, auth helpers."""

import asyncio
import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.health_profile import HealthProfile

# Use the test PostgreSQL database (same Docker container, different database)
TEST_DATABASE_URL = "postgresql+asyncpg://medcare:medcare_secret@localhost:5433/medcare_test"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    SessionLocal = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    """Async test client with overridden DB dependency."""
    from main import app

    SessionLocal = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db():
        async with SessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    # Disable rate limiter during tests
    from app.core.middleware import limiter
    limiter.enabled = False

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    limiter.enabled = True


@pytest_asyncio.fixture(scope="function")
async def test_user(db_session: AsyncSession):
    """Create a test user and return (user, plain_password)."""
    user = User(
        id=uuid.uuid4(),
        name="Тест Юзер",
        email="test@example.com",
        hashed_password=hash_password("TestPass123"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(user)

    hp = HealthProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(hp)
    await db_session.commit()
    await db_session.refresh(user)
    return user, "TestPass123"


def auth_headers(user_id: uuid.UUID) -> dict:
    """Generate Authorization header for a user."""
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}
