# AI-Medcare-Assistant

Персональний сімейний AI-помічник зі здоров'я.

**Команда:** сімейний лікар + психолог + тренер + нутриціолог + мотиватор

## Структура

```
apps/
  mobile/     — React Native (Expo) — iOS + Android + Web
  backend/    — Python FastAPI — API + AI + Telegram Bot
```

## Швидкий старт

```bash
# 1. Запустити БД та Redis
docker-compose up -d

# 2. Backend
cd apps/backend
python -m venv venv
source venv/Scripts/activate  # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload

# 3. Mobile
cd apps/mobile
npm install
npx expo start
```

## Документація

- [Ідея проекту](../../AI-Medcare-Assistant-idea.md)
- [План розробки](../../AI-Medcare-Assistant-plan.md)
