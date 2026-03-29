"""Telegram health metric logging via FSM"""

import logging
from datetime import datetime, timezone

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import InlineKeyboardButton

logger = logging.getLogger(__name__)

router = Router()


# ---- Metric types config ----

METRIC_TYPES = {
    "weight": {"label": "⚖️ Вага", "unit": "kg", "min": 20, "max": 300, "prompt": "Введи вагу в кг (напр. 75.5):"},
    "blood_pressure": {"label": "🫀 Тиск", "unit": "mmHg", "prompt": "Введи тиск у форматі 120/80:"},
    "heart_rate": {"label": "❤️ Пульс", "unit": "bpm", "min": 30, "max": 250, "prompt": "Введи пульс (уд/хв):"},
    "temperature": {"label": "🌡 Температура", "unit": "°C", "min": 34, "max": 42, "prompt": "Введи температуру (напр. 36.6):"},
    "blood_glucose": {"label": "🩸 Глюкоза", "unit": "mg/dL", "min": 20, "max": 600, "prompt": "Введи рівень глюкози (мг/дл):"},
    "oxygen_saturation": {"label": "💨 SpO2", "unit": "%", "min": 50, "max": 100, "prompt": "Введи рівень кисню в крові (%):"},
}


class LogMetric(StatesGroup):
    choosing_type = State()
    entering_value = State()


def metric_type_keyboard():
    builder = InlineKeyboardBuilder()
    for key, info in METRIC_TYPES.items():
        builder.row(InlineKeyboardButton(text=info["label"], callback_data=f"metric_{key}"))
    builder.row(InlineKeyboardButton(text="❌ Скасувати", callback_data="metric_cancel"))
    return builder.as_markup()


# ---- /log command ----

@router.message(Command("log"))
async def cmd_log(message: Message, state: FSMContext):
    from app.telegram.utils import get_user_by_telegram_id
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано. Використай /start")
        return

    await state.set_state(LogMetric.choosing_type)
    await message.answer(
        "📏 *Що хочеш записати?*\n\nОбери тип показника:",
        reply_markup=metric_type_keyboard(),
        parse_mode="Markdown",
    )


# ---- Choose metric type ----

@router.callback_query(LogMetric.choosing_type, F.data.startswith("metric_"))
async def choose_metric_type(callback: CallbackQuery, state: FSMContext):
    if callback.data == "metric_cancel":
        await state.clear()
        await callback.message.edit_text("✅ Скасовано.")
        return

    metric_key = callback.data.replace("metric_", "")
    if metric_key not in METRIC_TYPES:
        await callback.answer("Невідомий тип")
        return

    info = METRIC_TYPES[metric_key]
    await state.update_data(metric_type=metric_key)
    await state.set_state(LogMetric.entering_value)
    await callback.message.edit_text(
        f"{info['label']}\n\n{info['prompt']}",
    )


# ---- Enter value ----

@router.message(LogMetric.entering_value)
async def enter_metric_value(message: Message, state: FSMContext):
    from app.telegram.utils import get_user_by_telegram_id
    from app.core.database import AsyncSessionLocal
    from app.models.health_metric import HealthMetric

    data = await state.get_data()
    metric_key = data.get("metric_type")
    info = METRIC_TYPES.get(metric_key)

    if not info:
        await state.clear()
        await message.answer("❌ Помилка. Спробуй /log знову.")
        return

    text = message.text.strip().replace(",", ".")

    # Special case: blood pressure (120/80)
    if metric_key == "blood_pressure":
        try:
            parts = text.split("/")
            if len(parts) != 2:
                raise ValueError
            systolic = float(parts[0].strip())
            diastolic = float(parts[1].strip())
            if not (50 <= systolic <= 300 and 30 <= diastolic <= 200):
                raise ValueError
        except (ValueError, IndexError):
            await message.answer("❌ Невірний формат. Введи тиск у форматі 120/80")
            return

        user = await get_user_by_telegram_id(message.from_user.id)
        if not user:
            await state.clear()
            await message.answer("❌ Акаунт не прив'язано.")
            return

        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            db.add(HealthMetric(
                user_id=user.id,
                metric_type="blood_pressure_systolic",
                value=systolic,
                unit="mmHg",
                source="telegram",
                recorded_at=now,
            ))
            db.add(HealthMetric(
                user_id=user.id,
                metric_type="blood_pressure_diastolic",
                value=diastolic,
                unit="mmHg",
                source="telegram",
                recorded_at=now,
            ))
            await db.commit()

        await state.clear()
        status = _blood_pressure_status(systolic, diastolic)
        await message.answer(
            f"✅ Тиск записано: *{int(systolic)}/{int(diastolic)}* мм рт.ст.\n{status}",
            parse_mode="Markdown",
        )
        logger.info("User %s logged blood_pressure %s/%s via Telegram", user.id, systolic, diastolic)
        return

    # Generic numeric metric
    try:
        value = float(text)
        min_val = info.get("min", 0)
        max_val = info.get("max", 99999)
        if not (min_val <= value <= max_val):
            await message.answer(f"❌ Значення має бути від {min_val} до {max_val}")
            return
    except ValueError:
        await message.answer("❌ Введи числове значення.")
        return

    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await state.clear()
        await message.answer("❌ Акаунт не прив'язано.")
        return

    async with AsyncSessionLocal() as db:
        db.add(HealthMetric(
            user_id=user.id,
            metric_type=metric_key,
            value=value,
            unit=info["unit"],
            source="telegram",
            recorded_at=datetime.now(timezone.utc),
        ))
        await db.commit()

    await state.clear()

    display_value = f"{value:.1f}" if "." in text else str(int(value))
    status = _metric_status(metric_key, value)
    await message.answer(
        f"✅ {info['label']} записано: *{display_value}* {info['unit']}\n{status}",
        parse_mode="Markdown",
    )
    logger.info("User %s logged %s = %s via Telegram", user.id, metric_key, value)


# ---- Status helpers ----

def _blood_pressure_status(sys: float, dia: float) -> str:
    if sys < 90 or dia < 60:
        return "⚠️ Знижений тиск"
    elif sys <= 120 and dia <= 80:
        return "🟢 Оптимальний"
    elif sys <= 139 or dia <= 89:
        return "🟡 Підвищений"
    else:
        return "🔴 Високий — зверни увагу!"


def _metric_status(metric_type: str, value: float) -> str:
    ranges = {
        "heart_rate": [(60, 100, "🟢 Норма"), (40, 60, "🟡 Брадикардія"), (100, 200, "🟡 Тахікардія")],
        "temperature": [(36.0, 37.0, "🟢 Норма"), (37.0, 38.0, "🟡 Субфебрильна"), (38.0, 42.0, "🔴 Підвищена")],
        "oxygen_saturation": [(95, 100, "🟢 Норма"), (90, 95, "🟡 Знижена"), (50, 90, "🔴 Критична — зверни увагу!")],
        "blood_glucose": [(70, 100, "🟢 Норма (натще)"), (100, 125, "🟡 Переддіабет"), (125, 600, "🔴 Підвищена")],
    }

    if metric_type not in ranges:
        return ""

    for low, high, label in ranges[metric_type]:
        if low <= value <= high:
            return label
    return ""
