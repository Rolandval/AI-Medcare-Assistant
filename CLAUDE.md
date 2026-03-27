# AI-Medcare-Assistant

## Project Overview
**AI-Medcare-Assistant** — персональний сімейний AI-помічник зі здоров'я.
Діє як команда: сімейний лікар + психолог + тренер + нутриціолог + мотиватор.

Збирає дані про здоров'я кожного члена сім'ї, аналізує їх AI (Claude) та надає щоденні рекомендації.

## Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.12+)
- **ORM:** SQLAlchemy 2.x async + Alembic
- **DB:** PostgreSQL 16 + pgvector (port 5433)
- **Cache/Queue:** Redis 7 + Celery 5 + Celery Beat
- **AI:** Claude Sonnet (anthropic SDK) — 10 medical specialist agents
- **Telegram:** aiogram 3.x (polling mode dev, webhook prod)
- **Storage:** Cloudflare R2 (boto3)
- **Auth:** JWT (python-jose + passlib)

### Mobile
- **Framework:** React Native (Expo 51) + TypeScript
- **UI:** NativeWind (Tailwind v3) — NOT v4 (blocked by Windows Application Control)
- **Navigation:** Expo Router (file-based)
- **State:** Zustand 5 + TanStack Query
- **HTTP:** Axios

### Infrastructure
- Docker Compose: PostgreSQL + Redis + Backend + Celery Worker + Celery Beat
- Port mapping: PostgreSQL 5433, Redis 6379, Backend 8000

## Project Structure
```
AI-Medcare-Assistant/
├── CLAUDE.md, idea.md, plan.md
├── docker-compose.yml, .env, .env.example
├── STARTUP.md              # Launch instructions
├── apps/
│   ├── backend/
│   │   ├── main.py          # FastAPI entry
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   ├── alembic.ini + alembic/
│   │   └── app/
│   │       ├── api/v1/endpoints/  # 9 routers
│   │       ├── models/            # 11 SQLAlchemy models
│   │       ├── schemas/           # Pydantic v2
│   │       ├── services/          # ai_engine.py, storage.py
│   │       ├── tasks/             # Celery tasks
│   │       ├── telegram/          # Bot, handlers, surveys
│   │       ├── core/              # config, database, security
│   │       └── celery_app.py
│   └── mobile/
│       ├── app/                # Expo Router screens
│       │   ├── (auth)/         # welcome, login, register
│       │   └── (tabs)/         # dashboard, nutrition, docs, family, profile
│       ├── services/           # API client
│       ├── store/              # Zustand
│       └── package.json
```

## Code Conventions

### Python (backend)
- Async everywhere (FastAPI, SQLAlchemy async)
- Type hints on all functions
- Pydantic v2 for schemas
- SQLAlchemy 2.0 style (mapped_column)
- snake_case files/functions, PascalCase classes

### TypeScript (mobile)
- Strict mode
- camelCase functions/variables, PascalCase components
- NativeWind for styling

### General
- Code comments in English
- User-facing text in Ukrainian (uk)
- Commit messages in English

## Commands
```bash
# Docker (PostgreSQL + Redis)
cd C:/Users/Valer4uk/Projects/AI-Medcare-Assistant
docker-compose up -d postgres redis

# Backend
cd apps/backend
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000

# Telegram Bot (separate terminal)
cd apps/backend && source venv/Scripts/activate
python -m app.telegram.polling

# Mobile
cd apps/mobile
npm install && npx expo start

# Celery Worker
cd apps/backend && source venv/Scripts/activate
celery -A app.celery_app worker --loglevel=info -Q default,ai_tasks
```

## AI Engine — 10 Specialist Agents
therapist, cardiologist, gastroenterologist, endocrinologist, neurologist,
orthopedist, ophthalmologist, nutritionist, psychologist, trainer

## Current Phase
MVP code written (Phases 0-12). Next: testing, debugging, deployment.

## Important Decisions
- PostgreSQL port 5433 (5432 occupied by local instance)
- Tailwind v3 only (v4 blocked by Windows Application Control)
- Polling mode for Telegram in dev, webhook in production
- Cloudflare R2 for file storage (S3-compatible)
