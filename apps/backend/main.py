"""AI-Medcare-Assistant — FastAPI Application Entry Point"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import engine, Base
from app.core.middleware import limiter, SecurityHeadersMiddleware
from app.api.v1.router import api_router

# ---- Structured Logging ----
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
LOG_LEVEL = logging.DEBUG if settings.DEBUG else logging.INFO

logging.basicConfig(
    level=LOG_LEVEL,
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)

# Quiet noisy libs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

logger = logging.getLogger("medcare")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — create tables if not exist (alembic handles migrations in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Setup Telegram webhook only in production
    if not settings.DEBUG and settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_WEBHOOK_URL:
        try:
            from app.telegram.bot import setup_webhook
            await setup_webhook()
        except Exception as e:
            logger.warning("Telegram webhook setup failed: %s", e)

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Персональний сімейний AI-помічник зі здоров'я",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---- Rate Limiter ----
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---- Security Headers ----
app.add_middleware(SecurityHeadersMiddleware)

# ---- CORS — use configured origins in prod, wildcard in dev ----
_cors_origins = ["*"] if settings.DEBUG else settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ---- Trusted Hosts (production only) ----
if not settings.DEBUG:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.CORS_ORIGINS)

app.include_router(api_router, prefix="/api/v1")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests with timing"""
    import time
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    if request.url.path != "/health":
        logger.info(
            "%s %s → %d (%.0fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
        )
    return response


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }
