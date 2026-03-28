"""AI Doctors — Character definitions and card generation via Claude"""

import json
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

import anthropic

from app.core.config import settings

# ---- Doctor Characters ----

DOCTORS = {
    "therapist": {
        "name": "Dr. Alex",
        "specialty": "Терапевт",
        "emoji": "🩺",
        "color": "#3b82f6",
        "personality": "Спокійний, турботливий, дивиться на загальну картину",
        "motto": "Здоров'я — це баланс",
    },
    "nutritionist": {
        "name": "Dr. Maria",
        "specialty": "Дієтолог",
        "emoji": "🥗",
        "color": "#10b981",
        "personality": "Ентузіастична, практична, мотивуюча",
        "motto": "Їжа — це ліки",
    },
    "trainer": {
        "name": "Dr. Taras",
        "specialty": "Тренер",
        "emoji": "🏃",
        "color": "#f97316",
        "personality": "Енергійний, мотивуючий, дає конкретні виклики",
        "motto": "Рух — це життя",
    },
    "psychologist": {
        "name": "Dr. Sofia",
        "specialty": "Психолог",
        "emoji": "🧠",
        "color": "#8b5cf6",
        "personality": "Тепла, емпатична, уважна до деталей",
        "motto": "Думки визначають здоров'я",
    },
    "pharmacist": {
        "name": "Dr. Ivan",
        "specialty": "Фармацевт",
        "emoji": "💊",
        "color": "#e11d48",
        "personality": "Точний, надійний, детально-орієнтований",
        "motto": "Кожна таблетка вчасно",
    },
    "cardiologist": {
        "name": "Dr. Oleg",
        "specialty": "Кардіолог",
        "emoji": "❤️",
        "color": "#dc2626",
        "personality": "Серйозний але заспокійливий, аналітичний",
        "motto": "Серце — це двигун",
    },
    "orthopedist": {
        "name": "Dr. Lina",
        "specialty": "Ортопед",
        "emoji": "🦴",
        "color": "#d97706",
        "personality": "Практична, орієнтована на дію",
        "motto": "Рух без болю",
    },
}


def get_doctor(doctor_id: str) -> dict:
    return DOCTORS.get(doctor_id, DOCTORS["therapist"])


def get_all_doctors() -> list:
    return [{"id": k, **v} for k, v in DOCTORS.items()]


# ---- Card Generation ----

ROUND_CONFIGS = {
    "morning": {
        "cards": [
            {"doctor": "therapist", "card_type": "survey", "action_type": "survey_submit"},
            {"doctor": "nutritionist", "card_type": "meal_suggestion", "action_type": "photo"},
            {"doctor": "trainer", "card_type": "challenge", "action_type": "done"},
        ],
        "expiry_hours": 8,
    },
    "afternoon": {
        "cards": [
            {"doctor": "psychologist", "card_type": "survey", "action_type": "survey_submit"},
            {"doctor": "trainer", "card_type": "challenge", "action_type": "done"},
        ],
        "expiry_hours": 6,
    },
    "evening": {
        "cards": [
            {"doctor": "therapist", "card_type": "insight", "action_type": "done"},
            {"doctor": "psychologist", "card_type": "chat_prompt", "action_type": "chat"},
        ],
        "expiry_hours": 12,
    },
}


def _build_doctor_prompt(doctor_id: str, card_type: str, round_type: str) -> str:
    doc = DOCTORS[doctor_id]

    base = f"""Ти — {doc['name']}, {doc['specialty'].lower()}.
Характер: {doc['personality']}.
Девіз: "{doc['motto']}".

Ти спілкуєшся українською мовою, ти частина AI-команди лікарів у мобільному додатку для здоров'я.
Будь лаконічним (макс. 2-3 речення для тіла картки). Пиши як людина, не як бот.
Звертайся на "ти" неформально, по-дружньому."""

    type_prompts = {
        "survey": f"""Згенеруй картку-опитування для {round_type} раунду.
Виведи JSON:
{{
  "title": "коротка назва (5-7 слів)",
  "body": "дружній текст-запитання (1-2 речення)",
  "metadata": {{
    "questions": [
      {{"key": "mood", "type": "emoji", "label": "Настрій", "options": ["😫", "😟", "😐", "🙂", "😄"]}},
      {{"key": "energy", "type": "scale", "label": "Енергія", "min": 1, "max": 10}},
      {{"key": "sleep_hours", "type": "number", "label": "Сон (годин)"}}
    ]
  }}
}}""",
        "meal_suggestion": """Згенеруй картку-рекомендацію їжі.
Врахуй дані пацієнта (якщо є нестачі — порадь конкретні страви).
Виведи JSON:
{
  "title": "коротка назва (5-7 слів)",
  "body": "пояснення чому саме ці страви (1-2 речення)",
  "metadata": {
    "suggestions": [
      {"name": "Назва страви", "protein_g": 25, "calories": 350, "emoji": "🥚"},
      {"name": "Альтернатива", "protein_g": 20, "calories": 300, "emoji": "🫘"}
    ]
  }
}""",
        "challenge": f"""Згенеруй картку-виклик для {round_type} раунду.
Дай одну конкретну, маленьку, виконувану задачу на сьогодні (5-15 хвилин).
Виведи JSON:
{{
  "title": "коротка назва виклику (5-7 слів)",
  "body": "конкретний опис що зробити, де, коли (2-3 речення)",
  "metadata": {{
    "duration_min": 10,
    "difficulty": "easy"
  }}
}}""",
        "insight": """Згенеруй картку-інсайт на основі даних пацієнта.
Знайди цікавий тренд або спостереження.
Виведи JSON:
{
  "title": "коротка назва спостереження (5-7 слів)",
  "body": "пояснення тренду та рекомендація (2-3 речення)",
  "metadata": {
    "trend": "up|down|stable",
    "metric": "назва показника"
  }
}""",
        "chat_prompt": """Згенеруй картку-запрошення до чату.
Визнач тему для розмови на основі даних пацієнта (настрій, стрес, показники).
Виведи JSON:
{
  "title": "тема для розмови (5-7 слів)",
  "body": "тепле запрошення поговорити (1-2 речення)"
}""",
    }

    return f"{base}\n\n{type_prompts.get(card_type, type_prompts['insight'])}"


class AICardGenerator:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate_card(
        self,
        doctor_id: str,
        card_type: str,
        round_type: str,
        user_context: str,
    ) -> dict:
        """Generate a single AI card"""
        system_prompt = _build_doctor_prompt(doctor_id, card_type, round_type)

        try:
            message = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=500,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": f"Дані пацієнта:\n{user_context}\n\nЗгенеруй JSON картку.",
                    }
                ],
            )

            text = message.content[0].text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(text[start:end])
                return {
                    "doctor_id": doctor_id,
                    "card_type": card_type,
                    "title": data.get("title", ""),
                    "body": data.get("body", ""),
                    "metadata": data.get("metadata", {}),
                }
        except Exception as e:
            pass

        # Fallback
        doc = DOCTORS[doctor_id]
        return {
            "doctor_id": doctor_id,
            "card_type": card_type,
            "title": f"{doc['name']} перевіряє стан",
            "body": "Недостатньо даних для персоналізованої рекомендації. Заповни профіль здоров'я!",
            "metadata": {},
        }

    async def generate_round(
        self,
        round_type: str,
        user_context: str,
        user_data: dict,
    ) -> list:
        """Generate all cards for a round"""
        config = ROUND_CONFIGS.get(round_type, ROUND_CONFIGS["morning"])
        cards_config = config["cards"]

        # Filter doctors based on user data relevance
        relevant_cards = []
        for cc in cards_config:
            doc_id = cc["doctor"]
            # Always include therapist, nutritionist, trainer, psychologist
            if doc_id in ("therapist", "nutritionist", "trainer", "psychologist"):
                relevant_cards.append(cc)
            # Include cardiologist if has BP/HR data
            elif doc_id == "cardiologist":
                metrics = user_data.get("latest_metrics", {})
                if any(k in metrics for k in ("blood_pressure_systolic", "heart_rate")):
                    relevant_cards.append(cc)
            # Include pharmacist if has medications
            elif doc_id == "pharmacist":
                hp = user_data.get("health_profile", {})
                if hp.get("current_medications"):
                    relevant_cards.append(cc)
            else:
                relevant_cards.append(cc)

        # Generate cards in parallel
        tasks = [
            self.generate_card(
                cc["doctor"],
                cc["card_type"],
                round_type,
                user_context,
            )
            for cc in relevant_cards
        ]
        results = await asyncio.gather(*tasks)

        # Add action_type and expiry
        expiry = datetime.now(timezone.utc) + timedelta(hours=config["expiry_hours"])
        for card_data, cc in zip(results, relevant_cards):
            card_data["action_type"] = cc.get("action_type")
            card_data["round_type"] = round_type
            card_data["expires_at"] = expiry

        return results
