# AI Doctors — Plan

## Problem

App already runs 10 AI specialist agents in parallel, but users see only a single static card on the dashboard. No engagement loop, no relationship with AI doctors, no tracking if recommendations are followed. Result: users read once, ignore, stop opening the app.

## Core Concept: "Medical Rounds" + Health Feed

Hospital metaphor: your personal AI medical team does **3 rounds per day** (morning, afternoon, evening). Each round delivers 2-4 personalized cards from different specialists into a scrollable **Health Feed** — like Instagram, but every post is about YOU.

### Why This Works (Behavioral Science)

| Principle | Implementation |
|-----------|---------------|
| **BJ Fogg: B = MAP** | **M**otivation (personal, about you) + **A**bility (micro-actions) + **P**rompt (push at right time) |
| **Nir Eyal Hook** | Trigger (push from doctor) → Action (open card) → Variable Reward (different doctors, insights) → Investment (mark done, build streak) |
| **Endowed Progress** | Health Score starts at 30, not 0 — feels like you're already on the way |
| **Loss Aversion** | Streak counter — "7 days without missing a check-in" |
| **Social Identity** | "Dr. Sofia says..." feels different from "System notification" |

---

## AI Doctor Team (Characters)

Each doctor has: name, avatar, specialty, personality, color accent.

| # | Avatar | Name | Specialty | Personality | Color |
|---|--------|------|-----------|-------------|-------|
| 1 | 🩺 | Dr. Alex | Терапевт (General) | Calm, caring, big-picture thinker | Blue |
| 2 | 🥗 | Dr. Maria | Дієтолог (Nutritionist) | Enthusiastic, encouraging, practical | Green |
| 3 | 🏃 | Dr. Taras | Тренер (Fitness) | Energetic, motivating, challenging | Orange |
| 4 | 🧠 | Dr. Sofia | Психолог (Mental Health) | Warm, empathetic, thoughtful | Purple |
| 5 | 💊 | Dr. Ivan | Фармацевт (Pharmacist) | Precise, detail-oriented, reliable | Rose |
| 6 | ❤️ | Dr. Oleg | Кардіолог (Cardiologist) | Serious but reassuring, data-driven | Red |
| 7 | 🦴 | Dr. Lina | Ортопед (Orthopedist) | Practical, action-oriented | Amber |

Only 3-4 doctors appear per day based on user's data. If user has no heart issues, cardiologist appears rarely.

---

## Daily Rhythm

### Morning Round (07:00-09:00)
Push: "Доброго ранку! Твої лікарі підготували план на день"

Cards generated:
1. **Dr. Alex — Morning Briefing** — "Як ти сьогодні? Швидке опитування" (embedded mini-survey: mood + energy + sleep quality — 3 taps)
2. **Dr. Maria — Meal Plan** — "На сніданок раджу..." (personalized based on yesterday's macros)
3. **Dr. Taras — Daily Challenge** — "Сьогоднішній виклик: 10 хвилин ходьби після обіду"

### Afternoon Round (13:00-14:00)
Push: "Dr. Maria переглянула твій обід"

Cards generated:
1. **Dr. Maria — Meal Review** — auto-triggers when lunch photo uploaded
2. **Dr. Sofia — Mood Check** — "Як справи на середину дня?" (1-tap emoji scale)
3. **Dr. Taras — Challenge Reminder** — "Не забудь про 10 хвилин ходьби!"

### Evening Round (19:00-21:00)
Push: "Підсумки дня від твоєї команди"

Cards generated:
1. **Dr. Alex — Day Summary** — health score change, what went well
2. **Dr. Sofia — Evening Reflection** — "Що було найкращим сьогодні?" (text input)
3. **Dr. Ivan — Med Check** — medication adherence summary (if has reminders)
4. **Weekly only: Dr. Oleg — Trend Alert** — "Тиск стабілізувався за тиждень!"

---

## Card Types

### 1. Insight Card
Doctor shares a data-driven observation.
```
┌─────────────────────────────────┐
│ ❤️ Dr. Oleg · Кардіолог         │
│ 2 хвилини тому                  │
│                                 │
│ Тиск знизився на 5% за тиждень │
│ ┌─────────────────────────┐     │
│ │  📉 Mini trend chart    │     │
│ └─────────────────────────┘     │
│ Це гарна динаміка! Продовжуй   │
│ зменшувати сіль у раціоні.     │
│                                 │
│ [👍 Дякую] [💬 Детальніше]      │
└─────────────────────────────────┘
```

### 2. Challenge Card
Doctor gives a specific, timed micro-action.
```
┌─────────────────────────────────┐
│ 🏃 Dr. Taras · Тренер           │
│ Ранковий раунд                  │
│                                 │
│ 🎯 Виклик дня                   │
│ "Після обіду — 10 хвилин ходьби│
│  на свіжому повітрі"           │
│                                 │
│ ⏱ Дедлайн: 15:00               │
│ 🔥 Серія: 5 днів                │
│                                 │
│ [✅ Виконано!] [⏰ Нагадай]     │
│ [🔄 Інший виклик]               │
└─────────────────────────────────┘
```

### 3. Quick Survey Card (embedded)
Doctor asks a quick question — answer right in the feed.
```
┌─────────────────────────────────┐
│ 🩺 Dr. Alex · Терапевт          │
│ Ранковий раунд                  │
│                                 │
│ Як ти себе почуваєш?           │
│                                 │
│ 😫  😟  😐  🙂  😄             │
│                                 │
│ Скільки спав? _____ год         │
│                                 │
│ [Відправити →]                  │
└─────────────────────────────────┘
```

### 4. Meal Suggestion Card
```
┌─────────────────────────────────┐
│ 🥗 Dr. Maria · Дієтолог         │
│ Ранковий раунд                  │
│                                 │
│ Вчора було мало білка (45г      │
│ із 90г норми). На сніданок:    │
│                                 │
│ 🥚 Омлет з овочами — 25г білка │
│ 🫘 Або: Сирники — 20г білка    │
│                                 │
│ 📸 Зфотографуй свій сніданок   │
│                                 │
│ [📷 Сфотографувати]             │
└─────────────────────────────────┘
```

### 5. Achievement Card
```
┌─────────────────────────────────┐
│ ⭐ Досягнення!                  │
│                                 │
│ 🏆 "Тижнева стабільність"      │
│                                 │
│ Ти вимірював тиск 7 днів       │
│ підряд! Dr. Oleg задоволений.  │
│                                 │
│ 🔥 Серія: 7 днів               │
│ ⭐ +50 очок здоров'я           │
│                                 │
│ [🎉 Круто!]                     │
└─────────────────────────────────┘
```

### 6. Alert Card (urgent)
```
┌─────────────────────────────────┐
│ 🚨 УВАГА                        │
│ ❤️ Dr. Oleg · Кардіолог         │
│                                 │
│ Тиск 160/100 — вище норми!     │
│                                 │
│ Рекомендація:                   │
│ 1. Присядь, заспокойся         │
│ 2. Перевір через 15 хвилин     │
│ 3. Якщо не знижується —        │
│    зверніся до лікаря          │
│                                 │
│ [📏 Перевіміряти] [📞 Допомога] │
└─────────────────────────────────┘
```

### 7. Weekly Report Card
```
┌─────────────────────────────────┐
│ 🩺 Dr. Alex · Тижневий звіт    │
│                                 │
│ Health Score: 68 → 74 (+6) 📈  │
│                                 │
│ ✅ Виконано:  12/15 порад       │
│ 🔥 Серія:     7 днів           │
│ 🍽 Харчування: 7.2/10          │
│ 😊 Настрій:   Стабільний       │
│ 💪 Активність: 4/7 днів        │
│                                 │
│ "Чудовий тиждень! Додай ще     │
│  один день активності і буде   │
│  ідеально."                    │
│                                 │
│ [📊 Детальний звіт]            │
└─────────────────────────────────┘
```

### 8. Doctor Chat Prompt
```
┌─────────────────────────────────┐
│ 🧠 Dr. Sofia · Психолог         │
│                                 │
│ Бачу, що настрій падає 3-й     │
│ день. Хочеш поговорити?        │
│                                 │
│ [💬 Так, давай] [👋 Все ок]     │
└─────────────────────────────────┘
```

---

## AI Chat with Doctors

Tapping "Детальніше" or "Так, давай" opens a chat with that specific doctor. The chat:

- Retains doctor's personality/avatar throughout
- Has full access to user's health data
- Can prescribe specific actions (which appear as Challenge cards)
- Conversation history saved per doctor
- Can call other doctors: "Я запитаю Dr. Maria щодо харчування і відповім завтра"

Chat UX: simple messenger interface, doctor avatar on left, user on right. Doctor always responds within 2-3 seconds (streaming).

---

## Engagement & Gamification

### Health Score (0-100)
Visible at top of feed. Calculated from:

| Factor | Weight | Source |
|--------|--------|--------|
| Survey consistency | 15% | Daily surveys filled |
| Metric tracking | 15% | Regular measurements |
| Challenge completion | 20% | Done/total challenges |
| Meal logging | 15% | Photos uploaded daily |
| Medication adherence | 15% | Reminders marked |
| AI recommendations followed | 20% | Cards marked "Done" |

Score updates in real-time as user interacts. Micro-animations when score goes up.

### Streaks
- 🔥 **Daily Check-in Streak** — opened app + completed morning survey
- 💊 **Medication Streak** — took all meds on time
- 📸 **Meal Logging Streak** — photographed at least 2 meals
- 🎯 **Challenge Streak** — completed daily challenge

### Achievements (Unlockable)
- "Перший крок" — Complete first survey
- "Тижневик" — 7-day check-in streak
- "Марафонець" — 30-day streak
- "Фотограф" — Log 50 meals
- "Контроль" — Track BP 14 days straight
- "Команда мрії" — Chat with 5 different doctors
- "Здоровий вибір" — 5 meals scored 8+ in a row

---

## Screen Architecture

### Tab: "AI" (replaces or extends Dashboard)
```
┌─────────────────────────┐
│ Health Score      🔥 12  │  ← Score + streak
│ ████████░░░  74/100     │  ← Progress bar
├─────────────────────────┤
│ [Dr avatars row]        │  ← Tap to chat
│ 🩺 🥗 🏃 🧠 💊 ❤️ 🦴   │
├─────────────────────────┤
│ Ранковий раунд          │  ← Section header
│                         │
│ ┌─ Card 1 ────────────┐ │
│ │ Dr. Alex survey...  │ │
│ └─────────────────────┘ │
│                         │
│ ┌─ Card 2 ────────────┐ │
│ │ Dr. Maria meal...   │ │
│ └─────────────────────┘ │
│                         │
│ ┌─ Card 3 ────────────┐ │
│ │ Dr. Taras challenge │ │
│ └─────────────────────┘ │
│                         │
│ Вчора                   │  ← Yesterday's cards
│ ┌─ Card ──────────────┐ │
│ │ ...                 │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Doctor Profile Screen
```
┌─────────────────────────┐
│ ← Назад                │
│                         │
│      🥗                  │
│   Dr. Maria             │
│   Дієтолог              │
│   "Їжа — це ліки"      │
│                         │
│ ┌───────┬───────┐       │
│ │ 47    │ 12    │       │
│ │ Порад │ Чатів │       │
│ └───────┴───────┘       │
│                         │
│ [💬 Запитати]           │
│                         │
│ Останні поради:         │
│ ┌─────────────────────┐ │
│ │ Card history...     │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Chat Screen
```
┌─────────────────────────┐
│ ← 🧠 Dr. Sofia          │
│                         │
│ ┌──────────────┐        │
│ │ Привіт! Бачу │        │
│ │ настрій не   │        │
│ │ найкращий... │        │
│ └──────────────┘        │
│                         │
│        ┌──────────────┐ │
│        │ Так, стрес   │ │
│        │ на роботі... │ │
│        └──────────────┘ │
│                         │
│ ┌──────────────┐        │
│ │ Розумію. Ось │        │
│ │ 3 техніки... │        │
│ └──────────────┘        │
│                         │
│ ┌────────────────────┐  │
│ │ Напиши повідомлення│  │
│ │              [➤]   │  │
│ └────────────────────┘  │
└─────────────────────────┘
```

### Weekly Report Screen
```
┌─────────────────────────┐
│ Тижневий звіт           │
│ 21-28 березня           │
│                         │
│  Score: 68 → 74 📈      │
│  ┌──────────────────┐   │
│  │ Line chart       │   │
│  └──────────────────┘   │
│                         │
│  Категорії:             │
│  Харчування ████░░ 72%  │
│  Активність ███░░░ 55%  │
│  Сон       █████░ 85%   │
│  Настрій   ████░░ 70%   │
│  Ліки      ██████ 95%   │
│                         │
│  Топ від лікарів:       │
│  🩺 "Додай ще один     │
│      день активності"  │
│  🥗 "Більше клітковини"│
│                         │
│  [Поділитись 📤]        │
└─────────────────────────┘
```

---

## Backend Architecture

### New Models

```python
# ai_card.py — Individual AI feed cards
class AICard(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_cards"
    user_id       # FK → users
    doctor_id     # "therapist", "nutritionist", etc.
    card_type     # insight, challenge, survey, meal_suggestion, achievement, alert, report, chat_prompt
    round_type    # morning, afternoon, evening, on_demand
    title         # Card title
    content       # JSON — card body (text, data, options)
    action_type   # done, dismiss, remind, chat, photo, measure
    status        # pending, seen, acted, dismissed, expired
    acted_at      # When user interacted
    expires_at    # Card relevance window

# ai_chat_message.py — Doctor chat history
class AIChatMessage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_chat_messages"
    user_id
    doctor_id
    role          # "user" or "assistant"
    content       # Message text
    metadata      # JSON — any structured data

# user_streak.py — Streak tracking
class UserStreak(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "user_streaks"
    user_id
    streak_type   # checkin, medication, meals, challenge
    current_count # Current streak length
    best_count    # All-time best
    last_date     # Last streak date

# user_achievement.py — Unlocked achievements
class UserAchievement(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "user_achievements"
    user_id
    achievement_key  # "first_step", "week_streak", etc.
    unlocked_at
```

### New Endpoints

```
GET  /ai/feed                    — Paginated feed (today + history)
POST /ai/feed/{card_id}/action   — Mark card as done/dismissed/remind
GET  /ai/doctors                 — List doctors with stats
GET  /ai/doctors/{id}            — Doctor profile + card history
POST /ai/chat/{doctor_id}        — Send message, get streaming response
GET  /ai/chat/{doctor_id}/history — Chat history
GET  /ai/score                   — Current health score + breakdown
GET  /ai/streaks                 — User's active streaks
GET  /ai/achievements            — Unlocked achievements
GET  /ai/report/weekly           — Latest weekly report
```

### Card Generation Pipeline

```
Celery Beat Schedule:
  morning_round:   07:00 Kyiv time
  afternoon_round: 13:00 Kyiv time
  evening_round:   20:00 Kyiv time
  weekly_report:   Sunday 10:00

Each round:
  1. Fetch user context (metrics, surveys, meals, recent cards)
  2. Determine which doctors are relevant today
  3. Each selected doctor generates 1-2 cards via Claude
  4. Cards saved to ai_cards table
  5. Push notification sent
```

### Doctor Prompt Design (Claude)

Each doctor has a system prompt with:
- Character definition (name, personality, communication style)
- Access to user's full health context
- Output format spec (JSON card structure)
- Guidelines: be specific, actionable, personal, encouraging
- Constraint: max 3 sentences per card (concise!)

Example for Dr. Maria:
```
You are Dr. Maria, a warm and enthusiastic nutritionist.
You speak Ukrainian, use encouraging language, and give
specific, practical food advice. You know the user personally.

User context: {metrics, meals, profile}

Generate a morning meal suggestion card. Rules:
- Reference yesterday's actual nutrition data
- Suggest 2 specific meals with protein/calorie estimates
- Keep it warm and motivating, max 3 sentences
- Output JSON: { title, body, suggestions: [{name, protein_g, calories}] }
```

---

## Implementation Phases

### Phase 1: Feed + Cards (1 week)
- [ ] AICard model + migrations
- [ ] Card generation service (morning/afternoon/evening rounds)
- [ ] Feed endpoint (GET /ai/feed with pagination)
- [ ] Card action endpoint (POST /ai/feed/{id}/action)
- [ ] Celery Beat schedule for 3 daily rounds
- [ ] Mobile: Feed screen with card components
- [ ] Mobile: Card interaction (Done/Dismiss/Remind)
- [ ] Push notifications for each round

### Phase 2: Doctor Profiles + Chat (1 week)
- [ ] AIChatMessage model
- [ ] Doctor profile data (static JSON)
- [ ] Chat endpoint with streaming
- [ ] Chat history endpoint
- [ ] Mobile: Doctor profile screen
- [ ] Mobile: Chat screen with streaming UI
- [ ] Context-aware chat (doctor has access to health data)

### Phase 3: Gamification (3-4 days)
- [ ] UserStreak model + streak logic
- [ ] UserAchievement model + unlock conditions
- [ ] Health Score calculation service
- [ ] Achievement check on each card action
- [ ] Mobile: Score display in feed header
- [ ] Mobile: Streak indicators
- [ ] Mobile: Achievement unlock animation
- [ ] Weekly report generation + screen

### Phase 4: Polish (2-3 days)
- [ ] Embedded mini-survey in cards (mood/energy/sleep — 3 taps)
- [ ] Challenge timer with push reminder
- [ ] Doctor avatar animations
- [ ] Card read/unread tracking
- [ ] Feed infinite scroll + date headers
- [ ] Settings: preferred round times

---

## Success Metrics

| Metric | Target | How |
|--------|--------|-----|
| DAU / MAU ratio | >40% | Users open app daily |
| Cards acted on | >60% | Not just seen, but interacted |
| Morning survey completion | >70% | Embedded in card, not separate screen |
| Recommendation adherence | >50% | Cards marked "Done" / total actionable cards |
| Chat sessions / week | >2 | Users engage with doctors |
| 7-day retention | >60% | Users return after first week |
| Health Score trend | Upward | Users actually getting healthier |

---

## Key Design Decisions

1. **Feed over Dashboard** — Scrollable feed with time context (morning/afternoon/evening) feels natural and doesn't overwhelm.

2. **Characters over System** — "Dr. Sofia noticed..." is fundamentally different from "Alert: mood declining." Characters create emotional connection and trust.

3. **Micro-actions over Plans** — "Walk 10 min after lunch" beats "Exercise 3x/week." Specific, timed, tiny = doable.

4. **Embedded surveys** — Morning check-in is a card in the feed (3 taps), not a separate screen to navigate to. Reduces friction by 80%.

5. **Variable reward** — Different doctors, different card types, surprise achievements keep the feed interesting. Users don't know what's coming next.

6. **Cards expire** — Yesterday's breakfast suggestion is irrelevant today. Expired cards move to history, keeping feed fresh.

7. **Smart doctor selection** — Not all 7 doctors every day. If user has no heart issues, cardiologist appears monthly with a "checkup" card. Relevance > volume.
