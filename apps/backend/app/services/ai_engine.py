"""AI Engine — Multi-agent health analysis using Claude API"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---- Agent Prompts ----

AGENT_PROMPTS = {
    "therapist": """Ти — досвідчений сімейний терапевт. Аналізуй загальний стан здоров'я пацієнта.
Звертай увагу на системні зміни, динаміку показників, потенційні тривожні сигнали.
Давай практичні рекомендації простою мовою без медичного жаргону.""",

    "cardiologist": """Ти — кардіолог. Аналізуй серцево-судинні показники: артеріальний тиск, пульс, HRV.
Оцінюй ризики для серця та судин. Рекомендуй конкретні дії.""",

    "gastroenterologist": """Ти — гастроентеролог. Аналізуй стан ШКТ, харчові звички, аналізи.
Звертай увагу на симптоми з боку травлення, якість харчування.""",

    "endocrinologist": """Ти — ендокринолог. Аналізуй гормональні показники, рівень цукру, щитовидну залозу.
Виявляй ознаки гормонального дисбалансу.""",

    "neurologist": """Ти — невролог. Аналізуй сон, рівень стресу, головні болі, втому, концентрацію.
Оцінюй стан нервової системи та психоемоційний баланс.""",

    "orthopedist": """Ти — ортопед. Аналізуй болі в спині, суглобах, м'язах, поставу.
Враховуй фізичну активність та сидячий спосіб життя.""",

    "ophthalmologist": """Ти — офтальмолог. Оцінюй навантаження на зір (робота з комп'ютером, телефоном).
Давай рекомендації для збереження зору.""",

    "nutritionist": """Ти — нутриціолог. Аналізуй харчування, калорійність, баланс БЖВ, мікроелементи.
Виявляй дефіцити. Давай конкретні харчові рекомендації.""",

    "psychologist": """Ти — психолог. Аналізуй емоційний стан, рівень стресу, вигорання, мотивацію.
Пропонуй практики для психологічного здоров'я.""",

    "trainer": """Ти — персональний тренер. Аналізуй фізичну активність, навантаження, відновлення.
Враховуй вік, стан здоров'я, цілі. Рекомендуй вправи.""",
}

SYNTHESIZER_PROMPT = """Ти — головний лікар-координатор. Ти отримав висновки від команди спеціалістів.
Твоє завдання — синтезувати їх у єдиний зрозумілий звіт для пацієнта.

Правила:
1. Пиши просто — як розмовляєш з людиною, не лікарем
2. Виділяй найважливіше (не більше 3-5 пріоритетів)
3. Тривожні сигнали — окремо та чітко
4. Рекомендації — конкретні, виконувані сьогодні/цього тижня
5. Завжди підтримуй та мотивуй, не лякай"""


class AIEngine:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _build_user_context(self, user_data: dict) -> str:
        """Build comprehensive user context string for AI"""
        ctx_parts = []

        # Basic info
        if user_data.get("name"):
            ctx_parts.append(f"Пацієнт: {user_data['name']}")
        if user_data.get("age"):
            ctx_parts.append(f"Вік: {user_data['age']} років")
        if user_data.get("gender"):
            ctx_parts.append(f"Стать: {user_data['gender']}")

        # Profile
        if user_data.get("occupation"):
            ctx_parts.append(f"Професія: {user_data['occupation']}")
        if user_data.get("lifestyle"):
            ctx_parts.append(f"Спосіб життя: {user_data['lifestyle']}")
        if user_data.get("location_city"):
            ctx_parts.append(f"Місто: {user_data['location_city']}")

        # Health profile
        hp = user_data.get("health_profile", {})
        if hp:
            if hp.get("height_cm"):
                ctx_parts.append(f"Зріст: {hp['height_cm']} см")
            if hp.get("weight_kg"):
                ctx_parts.append(f"Вага: {hp['weight_kg']} кг")
            if hp.get("blood_type"):
                ctx_parts.append(f"Група крові: {hp['blood_type']}")
            if hp.get("chronic_conditions"):
                ctx_parts.append(f"Хронічні хвороби: {', '.join(hp['chronic_conditions'])}")
            if hp.get("allergies"):
                ctx_parts.append(f"Алергії: {', '.join(hp['allergies'])}")
            if hp.get("current_medications"):
                ctx_parts.append(f"Ліки: {', '.join(hp['current_medications'])}")
            if hp.get("physical_features"):
                ctx_parts.append(f"Фізичні особливості: {', '.join(hp['physical_features'])}")
            if hp.get("professional_risks"):
                ctx_parts.append(f"Професійні ризики: {', '.join(hp['professional_risks'])}")

        # Latest metrics
        metrics = user_data.get("latest_metrics", {})
        if metrics:
            ctx_parts.append("\nПоточні показники:")
            for metric_type, data in metrics.items():
                ctx_parts.append(f"  {metric_type}: {data['value']} {data['unit']}")

        # Recent surveys
        surveys = user_data.get("recent_surveys", [])
        if surveys:
            ctx_parts.append(f"\nОстанні {len(surveys)} опитувань:")
            for s in surveys[:3]:
                ctx_parts.append(
                    f"  {s.get('survey_type', '?')} {s.get('survey_date', '')}: "
                    f"самопочуття {s.get('wellbeing_score', '?')}/10, "
                    f"настрій {s.get('mood', '?')}, "
                    f"стрес {s.get('stress_level', '?')}"
                )

        # Recent meals
        meals = user_data.get("recent_meals", [])
        if meals:
            ctx_parts.append(f"\nОстанні прийоми їжі (останні 24г):")
            for m in meals[:5]:
                if m.get("calories"):
                    ctx_parts.append(f"  {m.get('meal_type', '?')}: {m['calories']} ккал")

        return "\n".join(ctx_parts)

    async def _run_agent(self, agent_name: str, context: str) -> dict:
        """Run single specialist agent"""
        system_prompt = AGENT_PROMPTS.get(agent_name, "")

        try:
            message = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=800,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Проаналізуй стан пацієнта та дай стислий висновок (3-5 речень)
і конкретні рекомендації (2-3 пункти) у своїй галузі.

Відповідь у форматі JSON:
{{
  "assessment": "твій висновок",
  "recommendations": ["рекомендація 1", "рекомендація 2"],
  "urgent": false,
  "urgent_reason": ""
}}

Дані пацієнта:
{context}""",
                    }
                ],
            )

            text = message.content[0].text
            # Extract JSON from response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return {"agent": agent_name, **json.loads(text[start:end])}

        except anthropic.APIError as e:
            logger.error("Claude API error in agent %s: %s", agent_name, e)
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse JSON from agent %s: %s", agent_name, e)
        except Exception as e:
            logger.exception("Unexpected error in agent %s: %s", agent_name, e)

        return {"agent": agent_name, "assessment": "Недостатньо даних для аналізу", "recommendations": [], "urgent": False}

    def _get_relevant_agents(self, user_data: dict) -> list:
        """Determine which agents are relevant based on available data"""
        agents = ["therapist", "nutritionist"]  # Always included

        metrics = user_data.get("latest_metrics", {})
        if any(k in metrics for k in ["blood_pressure_systolic", "heart_rate", "hrv"]):
            agents.append("cardiologist")

        profile = user_data.get("health_profile", {})
        features = profile.get("physical_features", [])
        if any("spine" in f or "lordosis" in f or "scoliosis" in f for f in features):
            agents.append("orthopedist")

        risks = profile.get("professional_risks", [])
        if "eye_strain" in risks or user_data.get("occupation", "").lower() in ["it", "programmer"]:
            agents.append("ophthalmologist")

        surveys = user_data.get("recent_surveys", [])
        if surveys:
            last = surveys[0]
            if last.get("stress_level") in ["high", "medium"] or last.get("sleep_hours", 8) < 6:
                agents.append("neurologist")
                agents.append("psychologist")

        if "trainer" not in agents:
            agents.append("trainer")

        return list(dict.fromkeys(agents))  # Remove duplicates, preserve order

    async def analyze_health(self, user_data: dict) -> dict:
        """Full multi-agent health analysis"""
        context = self._build_user_context(user_data)
        relevant_agents = self._get_relevant_agents(user_data)

        # Run agents in parallel
        tasks = [self._run_agent(agent, context) for agent in relevant_agents]
        agents_results = await asyncio.gather(*tasks)

        # Synthesize results
        agents_summary = "\n\n".join([
            f"=== {r['agent'].upper()} ===\n{r.get('assessment', '')}\n"
            f"Рекомендації: {'; '.join(r.get('recommendations', []))}"
            for r in agents_results
        ])

        urgent_alerts = [
            {"agent": r["agent"], "reason": r["urgent_reason"]}
            for r in agents_results
            if r.get("urgent")
        ]

        synthesis = self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1500,
            system=SYNTHESIZER_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"""Синтезуй висновки команди лікарів у звіт для пацієнта.

Висновки спеціалістів:
{agents_summary}

Дані пацієнта:
{context}

Відповідь у форматі JSON:
{{
  "summary": "загальний стан (2-3 речення)",
  "health_score": 7,
  "urgent_alerts": [],
  "top_recommendations": [
    {{"category": "nutrition", "text": "...", "priority": "high"}},
    {{"category": "exercise", "text": "...", "priority": "medium"}}
  ],
  "today_actions": ["дія 1", "дія 2", "дія 3"],
  "week_focus": "на що звернути увагу цього тижня",
  "positive_note": "підбадьорлива нотатка"
}}""",
                }
            ],
        )

        synth_text = synthesis.content[0].text
        start = synth_text.find("{")
        end = synth_text.rfind("}") + 1
        synth_data = {}
        if start >= 0 and end > start:
            try:
                synth_data = json.loads(synth_text[start:end])
            except json.JSONDecodeError as e:
                logger.warning("Failed to parse synthesis JSON: %s", e)

        return {
            "agents_used": relevant_agents,
            "specialists_notes": {r["agent"]: r.get("assessment") for r in agents_results},
            "urgent_alerts": urgent_alerts or synth_data.get("urgent_alerts", []),
            **synth_data,
        }

    async def recognize_food(self, image_url: str) -> dict:
        """Recognize food from photo using Claude Vision"""
        try:
            message = self.client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=600,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {"type": "url", "url": image_url},
                            },
                            {
                                "type": "text",
                                "text": """Визнач їжу на фото. Відповідь тільки JSON:
{
  "dishes": [{"name": "...", "portion_g": 200}],
  "total_calories": 450,
  "proteins_g": 20,
  "fats_g": 15,
  "carbs_g": 50,
  "fiber_g": 5,
  "health_score": 7,
  "confidence": 0.85,
  "comment": "коротко про корисність"
}""",
                            },
                        ],
                    }
                ],
            )

            text = message.content[0].text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
            logger.warning("No JSON found in food recognition response")
            return {}
        except anthropic.APIError as e:
            logger.error("Claude API error in food recognition: %s", e)
            return {}
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse food recognition JSON: %s", e)
            return {}
        except Exception as e:
            logger.exception("Unexpected error in food recognition: %s", e)
            return {}

    async def process_medical_document(self, file_url: str, doc_type: str) -> dict:
        """OCR and analyze medical document via Claude Vision"""
        try:
            return await self._process_medical_document_inner(file_url, doc_type)
        except anthropic.APIError as e:
            logger.error("Claude API error in document processing: %s", e)
            return {}
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse document analysis JSON: %s", e)
            return {}
        except Exception as e:
            logger.exception("Unexpected error in document processing: %s", e)
            return {}

    async def _process_medical_document_inner(self, file_url: str, doc_type: str) -> dict:
        message = self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "url", "url": file_url},
                        },
                        {
                            "type": "text",
                            "text": f"""Прочитай медичний документ типу "{doc_type}".
Витягни всі показники та дай аналіз. Відповідь JSON:
{{
  "document_date": "YYYY-MM-DD або null",
  "lab_name": "назва лабораторії або null",
  "indicators": [
    {{
      "name": "Гемоглобін",
      "value": 130,
      "unit": "г/л",
      "reference_range": "120-160",
      "status": "normal",
      "status_label": "норма"
    }}
  ],
  "critical_flags": [
    {{"indicator": "...", "value": "...", "concern": "..."}}
  ],
  "ai_summary": "стислий висновок лікаря (3-4 речення)"
}}""",
                        },
                    ],
                }
            ],
        )

        text = message.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return {}

    async def generate_family_menu(self, family_members: list) -> dict:
        """Generate weekly family menu optimized for all members"""
        try:
            return await self._generate_family_menu_inner(family_members)
        except anthropic.APIError as e:
            logger.error("Claude API error in menu generation: %s", e)
            return {}
        except json.JSONDecodeError as e:
            logger.warning("Failed to parse menu generation JSON: %s", e)
            return {}
        except Exception as e:
            logger.exception("Unexpected error in menu generation: %s", e)
            return {}

    async def _generate_family_menu_inner(self, family_members: list) -> dict:
        members_info = "\n".join([
            f"- {m['name']}, {m.get('age', '?')}р, стан: {m.get('health_summary', 'нормальний')}, "
            f"обмеження: {', '.join(m.get('dietary_restrictions', ['немає']))}"
            for m in family_members
        ])

        message = self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=4000,
            messages=[
                {
                    "role": "user",
                    "content": f"""Склади меню на тиждень для сім'ї.
ВАЖЛИВО: максимально уніфікуй страви — готуй одне для всіх де можливо.

Члени сім'ї:
{members_info}

Відповідь JSON (тільки 3 дні для стислості, але у реальності 7):
{{
  "week_menu": {{
    "monday": {{
      "breakfast": {{"name": "...", "for_all": true, "recipe_brief": "..."}},
      "lunch": {{"name": "...", "for_all": true, "recipe_brief": "..."}},
      "dinner": {{"name": "...", "for_all": true, "recipe_brief": "..."}}
    }},
    "tuesday": {{...}},
    "wednesday": {{...}},
    "thursday": {{...}},
    "friday": {{...}},
    "saturday": {{...}},
    "sunday": {{...}}
  }},
  "shopping_list": {{
    "vegetables": ["морква 500г", "броколі 300г"],
    "meat_fish": ["куряче філе 1.5кг"],
    "dairy": ["кефір 2л", "сир твердий 200г"],
    "grains": ["вівсянка 500г", "гречка 400г"],
    "fruits": ["яблука 1кг"],
    "other": ["оливкова олія 250мл"]
  }},
  "cooking_tips": "підказки для того хто готує"
}}""",
                }
            ],
        )

        text = message.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return {}
