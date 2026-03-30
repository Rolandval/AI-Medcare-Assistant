# AI-Medcare-Assistant — About

> Персональний AI-помічник здоров'я для всієї сім'ї з командою 7 AI-лікарів.
> Мобільний додаток (iOS/Android) + Telegram-бот + FastAPI бекенд.

---

## Зміст

1. [Огляд проєкту](#огляд-проєкту)
2. [Архітектура](#архітектура)
3. [Модулі бекенду](#модулі-бекенду)
4. [Модулі мобільного додатку](#модулі-мобільного-додатку)
5. [Telegram-бот](#telegram-бот)
6. [AI/ML Pipeline](#aiml-pipeline)
7. [Інфраструктура](#інфраструктура)
8. [Етапи розробки](#етапи-розробки)

---

## Огляд проєкту

**AI-Medcare-Assistant** — повноцінна health-tech платформа, яка поєднує:
- **7 AI-лікарів** (терапевт, дієтолог, тренер, психолог, фармацевт, кардіолог, ортопед) — кожен з унікальною особистістю та спеціалізацією
- **Мобільний додаток** — трекінг здоров'я, харчування, аналізів, ліків, сімейне меню
- **Telegram-бот** — щоденні опитування, фото їжі, завантаження аналізів, логування метрик
- **Гейміфікація** — health score, серії (streaks), досягнення (achievements)
- **Сімейний режим** — спільний обліковий запис, меню на тиждень, список закупок

### Цільова аудиторія
Українські сім'ї, зокрема люди 45+ років — збільшені шрифти, простий UX, українська мова.

---

## Архітектура

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Mobile App     │     │  Telegram Bot     │     │  Web Dashboard   │
│  (Expo / RN)     │     │  (aiogram 3)      │     │  (Next.js) *     │
└────────┬─────────┘     └────────┬──────────┘     └────────┬─────────┘
         │                        │                          │
         └────────────┬───────────┘──────────────────────────┘
                      │
              ┌───────▼────────┐
              │   FastAPI       │ ← REST API + WebSocket
              │   (Python 3.12) │
              └───────┬────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ PostgreSQL   │ │  Redis   │ │ Cloudflare   │
│ 16 + pgvector│ │  7       │ │ R2 (S3)      │
└──────────────┘ └────┬─────┘ └──────────────┘
                      │
              ┌───────▼────────┐
              │  Celery Worker  │ ← Background AI tasks
              │  + Beat         │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │  Claude API     │ ← Anthropic Sonnet
              │  (multi-agent)  │
              └────────────────┘

* Web Dashboard — планується
```

---

## Модулі бекенду

Бекенд побудований на **FastAPI** (Python 3.12+) з асинхронною архітектурою.

### Коротко

| Модуль | Що робить | Технологія |
|--------|-----------|------------|
| **Auth** | Реєстрація, JWT-авторизація, refresh-токени | FastAPI + python-jose + passlib |
| **Users** | Профіль, health-профіль, аватар, експорт/видалення | FastAPI + SQLAlchemy 2.0 async |
| **Health** | Метрики (вага, тиск, пульс...), щоденні опитування | FastAPI + PostgreSQL |
| **AI Feed** | Генерація карток від AI-лікарів, дії (done/dismiss/remind) | FastAPI + Claude API |
| **AI Chat** | Чат з конкретним AI-лікарем (streaming) | FastAPI + Claude API (streaming) |
| **AI Engine** | 10-агентний аналіз здоров'я, розпізнавання їжі, OCR документів | Claude Sonnet (multi-agent) |
| **Gamification** | Health Score (0-100), серії, 10 досягнень | Python + PostgreSQL |
| **Meals** | Логування їжі по фото, AI-розпізнавання, калорії/макроси | FastAPI + Claude Vision |
| **Documents** | Завантаження аналізів (PDF/фото), OCR, AI-аналіз, прапорці | FastAPI + Claude Vision |
| **Family** | Сім'я, запрошення, спільне меню, список закупок | FastAPI + PostgreSQL |
| **Notifications** | Push-сповіщення (Expo), нагадування про ліки | Expo Push API + Celery Beat |
| **Telegram** | Бот з опитуваннями, фото, метриками, AI-зворотний зв'язок | aiogram 3 + Redis FSM |
| **Tasks** | Фонові задачі: аналіз, розпізнавання, генерація меню | Celery + Redis |
| **Storage** | Завантаження файлів у хмару | Cloudflare R2 (S3-compatible) |

### Розгорнуто

#### Auth (`app/api/v1/endpoints/auth.py`)
- **POST /auth/register** — реєстрація з автоматичним створенням HealthProfile
- **POST /auth/login** — авторизація, повертає access + refresh JWT-токени
- **POST /auth/refresh** — оновлення access-токена по refresh
- **GET /auth/me** — поточний користувач
- **Технологія:** FastAPI, python-jose (JWT), passlib (bcrypt), SQLAlchemy async
- **Безпека:** bcrypt-хешування паролів, RS256 JWT, refresh rotation

#### Users (`app/api/v1/endpoints/users.py`)
- **GET/PATCH /users/me** — перегляд/оновлення профілю (ім'я, дата народження, стать, місто)
- **GET/PATCH /users/me/health-profile** — медичний профіль (зріст, вага, хронічні хвороби, алергії, ліки, цілі здоров'я)
- **POST /users/me/avatar** — завантаження фото профілю
- **POST /users/me/export-data** — експорт усіх даних користувача в JSON
- **DELETE /users/me** — повне видалення акаунту
- **Технологія:** FastAPI, SQLAlchemy 2.0, Pydantic v2, Cloudflare R2

#### Health Metrics (`app/api/v1/endpoints/health.py`)
- **POST /health/metrics** — запис показника (тип: вага, тиск, пульс, температура, глюкоза, SpO2, кроки)
- **GET /health/metrics** — список показників з фільтрами (тип, дата)
- **GET /health/metrics/latest** — останнє значення кожного типу
- **POST /health/surveys** — відправка щоденного опитування (ранкове/вечірнє)
- **GET /health/surveys** — історія опитувань
- **Технологія:** FastAPI, PostgreSQL, key-value HealthMetric модель (metric_type + value + unit)

#### AI Feed (`app/api/v1/endpoints/feed.py`)
- **GET /ai/feed** — стрічка AI-карток з пагінацією (автоматично помічає "seen")
- **POST /ai/feed/{card_id}/action** — дія над карткою (done, dismiss, remind, survey_submit)
- **GET /ai/feed/doctors** — список 7 AI-лікарів з кількістю карток
- **GET /ai/feed/doctors/{id}** — профіль лікаря + останні картки
- **POST /ai/feed/generate** — ручний запуск генерації раунду
- **Технологія:** FastAPI, Claude API (генерація контенту карток), Celery (фонова генерація)

#### AI Chat (`app/api/v1/endpoints/ai_chat.py`)
- **POST /ai/chat/{doctor_id}** — стрімінг-чат з AI-лікарем (Server-Sent Events)
- **POST /ai/chat/{doctor_id}/sync** — синхронний чат (для мобільного)
- **GET /ai/chat/{doctor_id}/history** — історія повідомлень з пагінацією
- **Технологія:** Claude Sonnet API (streaming), FastAPI StreamingResponse, PostgreSQL (ai_chat_messages)

#### AI Engine (`app/services/ai_engine.py`)
Серце платформи — мульти-агентна система аналізу здоров'я.
- **analyze_health()** — запускає 10 спеціалістів паралельно (терапевт, кардіолог, гастроентеролог, ендокринолог, невролог, ортопед, офтальмолог, дієтолог, психолог, тренер), потім синтезує результати
- **recognize_food()** — розпізнавання їжі по фото (Claude Vision): страви, калорії, БЖВ, оцінка здоров'я
- **process_medical_document()** — OCR + аналіз медичних документів (Claude Vision): показники, норми, відхилення
- **generate_family_menu()** — генерація тижневого меню з урахуванням здоров'я, алергій, вподобань усіх членів сім'ї
- **Технологія:** Anthropic Claude Sonnet API, asyncio (parallel agents), JSON-structured output

#### AI Doctors (`app/services/ai_doctors.py`)
- **7 персонажів-лікарів:** Dr. Alex (терапевт), Dr. Maria (дієтолог), Dr. Taras (тренер), Dr. Sofia (психолог), Dr. Ivan (фармацевт), Dr. Oleg (кардіолог), Dr. Lina (ортопед)
- **AICardGenerator** — генерує контекстні картки по раундах (ранок/день/вечір):
  - Survey — опитування самопочуття
  - Meal suggestion — рекомендація по їжі
  - Challenge — виклик на день (10000 кроків, випити 8 склянок води...)
  - Insight — персональна рекомендація на основі даних
  - Chat prompt — запрошення до чату з лікарем
- **Технологія:** Claude Sonnet API, character-based prompting, JSON card schema

#### Gamification (`app/services/gamification.py`)
- **Health Score (0-100)** — зважена оцінка:
  - Опитування: 15%, Метрики: 15%, Челенджі: 20%, Харчування: 15%, Ліки: 15%, Рекомендації: 20%
- **Серії (Streaks):** checkin (щоденне опитування), medication (прийом ліків), meals (логування їжі), challenge (виконання челенджів)
- **10 досягнень:** first_step, week_streak, marathon, photographer, control, dream_team, healthy_choice, challenger, night_owl, social
- **Технологія:** Python, PostgreSQL (user_streaks, user_achievements таблиці)

#### Meals (`app/api/v1/endpoints/meals.py`)
- **POST /meals** — логування прийому їжі з фото (запускає AI-розпізнавання)
- **GET /meals/today** — всі прийоми за сьогодні + денні підсумки (калорії, БЖВ)
- **GET /meals** — список з пагінацією
- **Pipeline:** Фото → Celery task → Claude Vision → калорії, білки, жири, вуглеводи, клітковина, health_score, коментар
- **Технологія:** FastAPI, Claude Vision API, Celery, Cloudflare R2 (зберігання фото)

#### Documents (`app/api/v1/endpoints/documents.py`)
- **POST /documents** — завантаження PDF або фото аналізу (запускає OCR + AI-аналіз)
- **GET /documents** — список документів з AI-прапорцями
- **GET /documents/{id}** — повний документ з усіма показниками, нормами, відхиленнями
- **Pipeline:** PDF/фото → Celery task → Claude Vision OCR → parsed_data (показники) + ai_flags (відхилення) + ai_analysis (висновок)
- **Типи:** аналіз крові, сечі, калу, ДНК, МРТ, КТ, УЗД, рентген, ЕКГ, висновок лікаря, рецепт, виписка
- **Технологія:** FastAPI, Claude Vision API, Celery, PostgreSQL (JSONB parsed_data)

#### Family (`app/api/v1/endpoints/family.py`)
- **POST /family/create** — створення сім'ї з invite-кодом
- **POST /family/join** — приєднання за кодом
- **GET /family/me** — інформація + список учасників
- **GET /family/members/{id}/health** — здоров'я конкретного учасника (тільки адмін або сам)
- **POST /family/menu/generate** — генерація тижневого меню через AI
- **GET /family/menu/current** — поточне меню + список закупок
- **Технологія:** FastAPI, PostgreSQL, Claude API (генерація меню)

#### Notifications (`app/api/v1/endpoints/notifications.py`)
- **POST /notifications/push-token** — реєстрація Expo Push Token
- **CRUD /notifications/reminders** — нагадування про ліки (назва, дозування, час, дні тижня)
- **POST /notifications/test-push** — тестове push-сповіщення
- **Celery Beat:** перевірка часу нагадувань кожні 5 хв, відправка push
- **Технологія:** Expo Push API, Celery Beat, PostgreSQL (medication_reminders)

#### Celery Tasks (`app/tasks/`)
- **ai_tasks.py** — analyze_health_task, recognize_meal_task, process_document_task, generate_family_menu_task
- **feed_tasks.py** — генерація раундів AI-карток для всіх користувачів
- **reminder_tasks.py** — перевірка нагадувань про ліки, per-user survey push
- **survey_tasks.py** — розсилка опитувань через Telegram
- **Технологія:** Celery 5 + Redis broker, Beat scheduler, sync SQLAlchemy bridge

#### Storage (`app/services/storage.py`)
- Завантаження файлів у Cloudflare R2 (S3-сумісне сховище)
- Валідація типу контенту (PDF, JPEG, PNG)
- Окремі бакети: documents, meals, avatars
- **Технологія:** boto3 (S3 client), Cloudflare R2

---

## Модулі мобільного додатку

Додаток побудований на **Expo 51** + **React Native 0.74** + **TypeScript**.

### Коротко

| Екран | Що робить | Технологія |
|-------|-----------|------------|
| **Welcome** | Вітальний екран з описом можливостей | Expo Router, NativeWind |
| **Login / Register** | JWT авторизація, збереження токенів | Axios, SecureStore, Zustand |
| **Onboarding** | 4-крокова анкета здоров'я | FlatList paging, Zustand |
| **Dashboard** | Стрічка AI-карток, health score, лікарі | React Query, SVG rings |
| **Chat** | Чат з AI-лікарем | Streaming API, FlatList |
| **Doctor Profile** | Профіль лікаря, статистика | React Query |
| **Achievements** | Серії, досягнення, шкала прогресу | SVG, React Query |
| **Add Metric** | Швидке введення показника | Form + API mutation |
| **Nutrition** | Денний трекер калорій/макросів, фото їжі | SVG rings, ImagePicker |
| **Documents** | Список аналізів з AI-прапорцями | React Query, FlatList |
| **Document Detail** | Показники, норми, AI-висновок | ScrollView, gradient |
| **Family** | Учасники, меню, список закупок, здоров'я | React Query, Clipboard |
| **Profile** | Особисті дані, аватар | Zustand, API |
| **Edit Profile** | Редагування профілю | Form + mutation |
| **Health Profile** | Хронічні хвороби, алергії, ліки, цілі | Multi-select tags |
| **History** | Графіки показників за період | Victory Native charts |
| **Reminders** | CRUD нагадувань про ліки | React Query, mutation |
| **Settings** | Тема (dark/light/system), сповіщення, розклад, інтеграції | Zustand, AsyncStorage |

### Розгорнуто

#### Auth Flow (4 екрани)
- **Welcome** — 3 промо-слайди з описом можливостей додатку, кнопки "Увійти" / "Зареєструватися"
- **Login** — email + пароль → JWT → SecureStore → redirect до Dashboard
- **Register** — ім'я + email + пароль → JWT → redirect до Onboarding
- **Onboarding** — 4 кроки: (1) Стать + вік + зріст + вага, (2) Хронічні хвороби (12 тегів), (3) Цілі здоров'я (10 тегів, max 3), (4) Час ранкового/вечірнього опитування
- **Технологія:** Expo Router Stack, Zustand authStore, expo-secure-store, Axios interceptors (auto-refresh JWT)

#### Dashboard — AI Doctors Feed
- **Health Score Ring** — SVG-коло 0-100 з кольоровою градацією (зелений/жовтий/червоний)
- **AI Card Feed** — вертикальний FlatList з infinite scroll:
  - Кожна картка: іконка лікаря, тип (survey/challenge/insight/meal_suggestion), body, кнопки дій
  - Survey-картки: вбудована форма з кнопками (1-10 шкала, mood emoji)
  - Challenge: таймер + кнопка "Виконано"
  - Insight: розгорнутий текст + посилання на чат
- **Actions:** done (виконано), dismiss (відхилити), remind (нагадати через 2 год), survey_submit (відправити дані)
- **Технологія:** React Query (useQuery + useMutation + invalidation), react-native-svg, expo-router

#### Chat з AI-лікарем
- Повноекранний чат з обраним лікарем (avatar + name у header)
- Історія повідомлень з пагінацією (GET /history)
- Streaming відповіді від Claude API (POST /sync для мобільного)
- **Технологія:** React Query, FlatList (inverted), Axios

#### Nutrition — Трекер харчування
- **Calorie Ring** — велике SVG-коло (130px): з'їдено / ціль (2200 ккал)
- **Macro Rings** — 3 кола по 80px: білки (зелений), жири (янтарний), вуглеводи (фіолетовий)
- **Water Tracker** — 8 склянок з прогрес-барами, кнопка "+ Склянка води"
- **Meal Cards** — картки з часом, фото, food items, розгортання з деталями
- **Add Meal** — камера/галерея через expo-image-picker → POST /meals → AI-розпізнавання
- **Технологія:** react-native-svg (strokeDasharray), expo-image-picker, React Query

#### Documents — Медичні документи
- **Список** — картки з назвою, датою, кількістю показників, AI-прапорцями (🔴 відхилення)
- **Detail** — gradient header зі статистикою, AI-summary, критичні прапорці, всі показники з нормами
- **Upload** — expo-document-picker (PDF) або expo-image-picker (фото) → POST /documents
- **Технологія:** React Query, expo-document-picker, expo-linear-gradient

#### Family — Сімейний режим
- **Members** — картки учасників (avatar, ім'я, admin badge), вибір → health summary
- **Member Health** — останні показники + прапорці документів (тільки admin або self)
- **Week Menu** — розгортання по днях: сніданок/обід/вечеря з інгредієнтами та калоріями
- **Shopping List** — інгредієнти згруповані по категоріях (овочі, м'ясо, молочка...), чекбокси
- **Invite** — копіювання коду запрошення в clipboard
- **Технологія:** React Query, Clipboard API, FlatList

#### Profile & Settings
- **Profile** — avatar, ім'я, email, Telegram ID, кнопка налаштувань
- **Edit** — форма редагування особистих даних
- **Health Profile** — multi-select теги хвороб, алергій, ліків, цілей
- **History** — графіки показників за 7/30/90 днів (Victory Native)
- **Reminders** — список нагадувань про ліки, CRUD з часом і днями тижня
- **Settings:**
  - 🎨 Тема: світла / темна / системна (3-way toggle, persisted)
  - 🔔 Сповіщення: toggle для push, опитувань, ліків, AI-карток
  - ⏰ Розклад: час ранкового/вечірнього опитування
  - 📱 Інтеграції: Telegram (підключено/ні)
  - 📦 Дані: експорт JSON, видалення акаунту (double confirm)
- **Технологія:** Zustand (themeStore, authStore), AsyncStorage, Victory Native, React Query

#### Cross-cutting: Shared UI Components (`components/ui/`)
- **LoadingScreen** — повноекранний спінер з повідомленням
- **EmptyState** — emoji + заголовок + кнопка дії
- **ErrorBoundary** — React class component для перехоплення крешів
- **Card** — тема-aware обгортка (default / outlined / elevated)
- **Badge** — статус-бейдж (success / warning / danger / info / neutral)
- **NetworkBanner** — банер "Немає з'єднання" при офлайні (NetInfo)

#### Cross-cutting: Offline Mode
- React Query persistence через AsyncStorage (кеш 24 години)
- PersistQueryClientProvider на рівні root layout
- gcTime: 24 години — дані зберігаються навіть після закриття додатку
- Автоматичне відновлення при відновленні з'єднання

#### Cross-cutting: Dark Mode
- 3 режими: Light / Dark / System (слідує за OS)
- ThemeProvider context з color tokens (bg, text, card, border, primary...)
- Persisted через AsyncStorage
- Динамічний StatusBar (dark/light)
- Динамічний Tab Bar (фон, іконки, індикатор)

---

## Telegram-бот

Повнофункціональний Telegram-бот на **aiogram 3** з FSM (Finite State Machine) для складних діалогів.

### Коротко

| Функція | Що робить |
|---------|-----------|
| **/start** | Привітання, ID для лінкування, головне меню |
| **/help** | Довідник усіх команд |
| **/stats** | Показники здоров'я + AI-висновок |
| **/log** | FSM-діалог для запису метрики (вага, тиск, пульс, температура, глюкоза, SpO2) |
| **/advice** | Запуск AI-аналізу здоров'я |
| **/today** | Підсумок їжі за сьогодні |
| **/menu** | Тижневе сімейне меню |
| **/shop** | Список закупок |
| **/family** | Стан здоров'я сім'ї |
| **Фото** | Вибір: їжа або аналіз → AI-розпізнавання |
| **PDF** | Автоматичний OCR + AI-аналіз |
| **Опитування** | Ранкове (самопочуття, сон, настрій, біль) + вечірнє (енергія, стрес, активність, нотатки) |
| **Reply клавіатура** | 6 кнопок швидкого доступу |
| **AI callbacks** | Автоматична відправка результатів після AI-обробки |

### Розгорнуто

#### Команди та обробники (`handlers/commands.py`)
- Усі 9 slash-команд
- 6 текстових обробників для Reply-клавіатури (📊 Мій стан, 🍽 Їжа сьогодні, 📋 Меню тижня, 🛒 Список закупок, 💡 Порада зараз, 👨‍👩‍👧‍👦 Сім'я)
- Делегування до utils.py для форматування відповідей

#### Метрики (`handlers/metrics.py`)
- FSM: `/log` → вибір типу → введення значення → збереження + статус
- 6 типів: вага (kg), тиск (120/80 формат), пульс (bpm), температура (°C), глюкоза (mg/dL), SpO2 (%)
- Валідація діапазонів, кольорові статуси (🟢 норма, 🟡 підвищено, 🔴 критично)
- Спеціальна обробка тиску: два значення (систолічний/діастолічний)

#### Медіа (`handlers/media.py`)
- **Фото:** FSM-діалог "Це їжа чи аналіз?" → inline-кнопки → відповідний pipeline
- **PDF/зображення:** автоматична обробка як медичний документ
- **Голос:** placeholder для майбутньої транскрипції

#### Опитування (`handlers/surveys.py`)
- **Ранкове:** самопочуття (1-10) → сон (годин) → настрій (5 emoji) → біль (multi-select частин тіла)
- **Вечірнє:** самопочуття → енергія → стрес → біль → нотатки (текст або skip)
- FSM з Redis storage (production) або MemoryStorage (dev)
- Після завершення → Celery analyze_health_task

#### AI Result Callbacks (`utils.py`)
- **send_meal_result()** — після розпізнавання їжі: калорії, макроси, health score
- **send_document_result()** — після аналізу документа: прапорці, AI-висновок
- **send_advice_result()** — після AI-аналізу: summary + рекомендації
- Викликаються автоматично з Celery tasks після завершення обробки

#### Технологія
- **aiogram 3** — async Telegram framework
- **Redis** — FSM state storage (production)
- **Celery** — фонові задачі з callback
- **webhook** — FastAPI endpoint `/webhook/telegram` з secret token validation

---

## AI/ML Pipeline

### Мульти-агентна система (10 спеціалістів)

```
User Data ──→ ┌─ Therapist Agent
              ├─ Cardiologist Agent
              ├─ Gastroenterologist Agent
              ├─ Endocrinologist Agent
              ├─ Neurologist Agent
              ├─ Orthopedist Agent       ──→ Synthesizer ──→ Final Report
              ├─ Ophthalmologist Agent
              ├─ Nutritionist Agent
              ├─ Psychologist Agent
              └─ Trainer Agent
```

- Кожен агент отримує повний контекст (профіль, метрики, опитування) і аналізує зі своєї спеціалізації
- Агенти запускаються **паралельно** (asyncio.gather)
- **Синтезатор** — окремий Claude-запит, який зводить 10 висновків в один структурований звіт
- **Формат виходу:** JSON з summary, recommendations[], agents_used[], risk_level

### Claude Vision
- **Food Recognition:** фото → страви, грамовки, калорії, БЖВ, клітковина, health_score 1-10, коментар
- **Document OCR:** PDF/фото → показники з нормами, одиницями, відхиленнями, AI-прапорці
- **Model:** Claude Sonnet (Anthropic API)

---

## Інфраструктура

### Docker Compose (6 сервісів)

| Сервіс | Image | Port | Призначення |
|--------|-------|------|-------------|
| **postgres** | pgvector/pgvector:pg16 | 5433 | Основна БД + векторні ембедінги |
| **redis** | redis:7-alpine | 6380 | Cache + Celery broker + FSM storage |
| **backend** | python:3.12 (Dockerfile) | 8000 | FastAPI API сервер |
| **celery_worker** | python:3.12 (Dockerfile) | — | Обробка AI-задач |
| **celery_beat** | python:3.12 (Dockerfile) | — | Планувальник (опитування, нагадування, меню) |
| **flower** | mher/flower | 5555 | Celery monitoring UI |

### База даних (PostgreSQL 16)
- **14 таблиць:** users, health_profiles, health_metrics, daily_surveys, meals, medical_documents, medication_reminders, ai_cards, ai_chat_messages, ai_recommendations, families, family_menus, user_streaks, user_achievements
- **pgvector** — підготовлено для face/voice embeddings у майбутньому
- **Alembic** — 2 міграції (initial schema + gamification/chat)

### Celery Beat Schedule
| Задача | Розклад | Що робить |
|--------|---------|-----------|
| Morning surveys | Кожні 30 хв | Перевіряє user-specific час, відправляє в Telegram |
| Evening surveys | Кожні 30 хв | Перевіряє user-specific час, відправляє в Telegram |
| Medication checks | Кожні 5 хв | Перевіряє час ліків, push-сповіщення |
| AI card rounds | 3 рази на день | Генерує персональні картки для кожного користувача |
| Family menus | Щонеділі | Генерує тижневе меню для всіх сімей |

---

## Етапи розробки

### Етап 1 — Foundation ✅
- Архітектура проєкту, Docker Compose, PostgreSQL + Redis
- FastAPI каркас, auth (JWT), user model, health profile
- Alembic міграції
- Expo додаток: routing, auth flow, Zustand store

### Етап 2 — Core Health Tracking ✅
- Health metrics API (key-value модель)
- Daily surveys (morning/evening) API + Telegram FSM
- Meals API + AI food recognition (Claude Vision)
- Medical documents API + OCR + AI analysis
- Family + menu generation

### Етап 3 — AI Doctors ✅
- 7 AI-персонажів з унікальними промптами
- Feed карток (survey, challenge, insight, meal_suggestion, chat_prompt)
- Streaming chat з лікарями
- 10-агентний мульти-агентний аналіз здоров'я

### Етап 4 — Gamification ✅
- Health Score (0-100) з 6-компонентною формулою
- 4 типи серій (checkin, medication, meals, challenge)
- 10 досягнень з автоматичним розблокуванням
- UI: кільце здоров'я, стріки, медалі

### Етап 5 — Mobile Polish ✅
- Onboarding (4 кроки)
- Settings (сповіщення, розклад, інтеграції, дані)
- Circular macro rings (SVG), water tracker
- Documents detail з gradient header
- Family: shopping list з чекбоксами, menu toggle
- Infinite scroll, refresh, error handling

### Етап 6 — Infrastructure & DX ✅
- Structured logging (request timing, error handlers)
- Pydantic response schemas
- TypeScript interfaces (types/api.ts)
- Docker: Flower, healthchecks, logs volume
- Data export + account deletion endpoints
- Alembic migration 0002

### Етап 7 — Telegram Bot Completion ✅
- /log команда з FSM для 6 типів метрик
- Reply keyboard обробники (6 кнопок)
- Photo type selection (їжа / аналіз)
- AI result callbacks (meal, document, advice)
- /today, /help команди
- Валідація діапазонів + кольорові статуси

### Етап 8 — Offline + Dark Mode + Components ✅
- React Query persistence (AsyncStorage, 24h cache)
- PersistQueryClientProvider
- Dark mode: 3 режими (light/dark/system), color tokens, ThemeProvider
- NetworkBanner (офлайн-індикатор з NetInfo)
- ErrorBoundary, LoadingScreen, EmptyState, Card, Badge

### Етап 9 — Testing & Security 🔄 (поточний)
- pytest тести для API endpoints
- Security middleware (rate limiting, CORS)
- Input validation hardening

### Етап 10 — CI/CD & Production 📋 (наступний)
- GitHub Actions: lint, test, build, deploy
- Nginx reverse proxy
- SSL certificates
- Production .env template
- Health check endpoint

---

## Tech Stack Summary

| Шар | Технології |
|-----|------------|
| **Mobile** | Expo 51, React Native 0.74, TypeScript, Expo Router 3.5, NativeWind 4, Zustand, React Query 5, Victory Native, expo-secure-store |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy 2.0 async, Pydantic v2, Alembic |
| **AI** | Claude Sonnet (Anthropic API), multi-agent, Claude Vision (food + OCR) |
| **Database** | PostgreSQL 16 + pgvector, Redis 7 |
| **Task Queue** | Celery 5 + Redis broker + Beat scheduler |
| **Telegram** | aiogram 3 + FSM + webhook |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Infra** | Docker Compose (6 services), Flower monitoring |
| **Auth** | JWT (access + refresh), bcrypt, SecureStore |
| **Offline** | React Query persist + AsyncStorage + NetInfo |

---

*Останнє оновлення: 2026-03-30*
