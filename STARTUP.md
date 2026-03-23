# 🚀 Запуск AI-Medcare-Assistant

> PowerShell синтаксис — команди по одній, або через `;`

---

## Крок 1 — Docker (PostgreSQL + Redis)

```powershell
cd D:\Projects\AI-Medcare-Assistant
docker-compose up -d postgres redis
```

> Порт PostgreSQL: **5433** (5432 зайнятий локальним Postgres)

Перевірити:
```powershell
docker ps
```

---

## Крок 2 — Скопіювати .env

```powershell
cd D:\Projects\AI-Medcare-Assistant
copy .env.example .env
```

Відкрий `.env` (Notepad або VSCode) і заповни мінімум:
```
POSTGRES_PASSWORD=medcare_secret
DATABASE_URL=postgresql+asyncpg://medcare:medcare_secret@localhost:5433/medcare
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=...
JWT_SECRET_KEY=будь-який-рядок-мінімум-32-символи
```

---

## Крок 3 — Backend (по одній команді в PowerShell)

```powershell
cd D:\Projects\AI-Medcare-Assistant\apps\backend
```

```powershell
python -m venv venv
```

```powershell
.\venv\Scripts\Activate.ps1
```

> Якщо помилка з execution policy:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

```powershell
pip install -r requirements.txt
```

```powershell
alembic upgrade head
```

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

✅ Відкрий: http://localhost:8000/docs

---

## Крок 4 — Telegram Bot (новий термінал)

```powershell
cd D:\Projects\AI-Medcare-Assistant\apps\backend
.\venv\Scripts\Activate.ps1
python -m app.telegram.polling
```

---

## Крок 5 — Mobile (новий термінал)

```powershell
cd D:\Projects\AI-Medcare-Assistant\apps\mobile
npm install
```

```powershell
copy .env.example .env
```

```powershell
npx expo start
```

Якщо на фізичному телефоні — зміни `.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.X.X:8000/api/v1
```
(свій локальний IP замість X.X)

---

## Крок 6 — Git (один раз)

```powershell
cd D:\Projects\AI-Medcare-Assistant
git init
git add .
git commit -m "Initial commit: AI-Medcare-Assistant MVP"
```

---

## Celery (фонові AI задачі)

Потрібен для автоматичного аналізу. Запускати після backend:

```powershell
cd D:\Projects\AI-Medcare-Assistant\apps\backend
.\venv\Scripts\Activate.ps1
celery -A app.celery_app worker --loglevel=info -Q default,ai_tasks
```

---

## Типові помилки

| Помилка | Рішення |
|---------|---------|
| `port is already allocated` | Порт зайнятий — змінено на 5433 |
| `&&` не валідний | Використовуй `;` або по одній команді |
| `execution policy` | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `Network request failed` | Використай IP замість localhost в Expo |
| `asyncpg connection refused` | Перевір що Docker контейнер запущений |
