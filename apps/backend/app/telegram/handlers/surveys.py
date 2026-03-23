"""Telegram survey FSM handlers — morning and evening questionnaires"""

from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery

from app.telegram.keyboards import (
    wellbeing_keyboard, sleep_hours_keyboard, mood_keyboard,
    pain_keyboard, stress_keyboard, energy_keyboard,
    skip_keyboard, photo_or_skip_keyboard,
)

router = Router()


WELLBEING_MAP = {"wb_bad": 2, "wb_ok": 5, "wb_good": 8, "wb_great": 10}
SLEEP_MAP = {"sleep_4": 4.0, "sleep_5": 5.5, "sleep_6": 6.5, "sleep_7": 7.5, "sleep_8": 8.5, "sleep_9": 9.5}
MOOD_MAP = {"mood_terrible": "terrible", "mood_bad": "bad", "mood_neutral": "neutral",
            "mood_good": "good", "mood_great": "great"}
STRESS_MAP = {"stress_low": "low", "stress_medium": "medium", "stress_high": "high"}
ENERGY_MAP = {"energy_low": 2, "energy_medium": 5, "energy_high": 8, "energy_max": 10}


class MorningSurvey(StatesGroup):
    wellbeing = State()
    sleep_hours = State()
    mood = State()
    pain = State()
    done = State()


class EveningSurvey(StatesGroup):
    wellbeing = State()
    energy = State()
    stress = State()
    pain = State()
    activity = State()
    notes = State()
    done = State()


# ---- Morning Survey ----

@router.callback_query(F.data == "start_morning_survey")
async def morning_start(callback: CallbackQuery, state: FSMContext):
    await state.set_state(MorningSurvey.wellbeing)
    await callback.message.edit_text(
        "🌅 *Ранкове опитування*\n\n"
        "Як загальне самопочуття зараз?",
        reply_markup=wellbeing_keyboard(),
        parse_mode="Markdown",
    )


@router.callback_query(MorningSurvey.wellbeing)
async def morning_wellbeing(callback: CallbackQuery, state: FSMContext):
    score = WELLBEING_MAP.get(callback.data, 5)
    await state.update_data(wellbeing_score=score)
    await state.set_state(MorningSurvey.sleep_hours)
    await callback.message.edit_text(
        "🛌 Скільки годин спав(ла)?",
        reply_markup=sleep_hours_keyboard(),
    )


@router.callback_query(MorningSurvey.sleep_hours)
async def morning_sleep(callback: CallbackQuery, state: FSMContext):
    hours = SLEEP_MAP.get(callback.data, 7.0)
    await state.update_data(sleep_hours=hours)
    await state.set_state(MorningSurvey.mood)
    await callback.message.edit_text(
        "😊 Який настрій зранку?",
        reply_markup=mood_keyboard(),
    )


@router.callback_query(MorningSurvey.mood)
async def morning_mood(callback: CallbackQuery, state: FSMContext):
    mood = MOOD_MAP.get(callback.data, "neutral")
    await state.update_data(mood=mood)
    await state.set_state(MorningSurvey.pain)
    await callback.message.edit_text(
        "💊 Щось болить або турбує?",
        reply_markup=pain_keyboard(),
    )


@router.callback_query(MorningSurvey.pain)
async def morning_pain(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()

    if callback.data == "pain_none":
        pain_locations = []
    else:
        pain_locations = data.get("pain_locations", [])
        pain_part = callback.data.replace("pain_", "")
        if pain_part not in pain_locations:
            pain_locations.append(pain_part)
        await state.update_data(pain_locations=pain_locations)
        # Allow multiple selection — confirm button
        await callback.answer(f"Додано: {pain_part}")
        return

    await state.update_data(pain_locations=pain_locations)
    await _finish_morning_survey(callback, state)


async def _finish_morning_survey(callback: CallbackQuery, state: FSMContext):
    from app.telegram.utils import get_user_by_telegram_id, save_survey
    data = await state.get_data()
    await state.clear()

    user = await get_user_by_telegram_id(callback.from_user.id)
    if user:
        await save_survey(user, "morning", data)

    await callback.message.edit_text(
        "✅ *Дякую!* Дані збережено.\n\n"
        "🤖 AI проаналізує твій стан та дасть рекомендації.",
        parse_mode="Markdown",
    )

    from app.tasks.ai_tasks import analyze_health_task
    if user:
        analyze_health_task.delay(str(user.id))


# ---- Evening Survey ----

@router.callback_query(F.data == "start_evening_survey")
async def evening_start(callback: CallbackQuery, state: FSMContext):
    await state.set_state(EveningSurvey.wellbeing)
    await callback.message.edit_text(
        "🌙 *Вечірнє опитування*\n\n"
        "Як загальне самопочуття сьогодні?",
        reply_markup=wellbeing_keyboard(),
        parse_mode="Markdown",
    )


@router.callback_query(EveningSurvey.wellbeing)
async def evening_wellbeing(callback: CallbackQuery, state: FSMContext):
    score = WELLBEING_MAP.get(callback.data, 5)
    await state.update_data(wellbeing_score=score)
    await state.set_state(EveningSurvey.energy)
    await callback.message.edit_text(
        "🔋 Який рівень енергії наприкінці дня?",
        reply_markup=energy_keyboard(),
    )


@router.callback_query(EveningSurvey.energy)
async def evening_energy(callback: CallbackQuery, state: FSMContext):
    energy = ENERGY_MAP.get(callback.data, 5)
    await state.update_data(energy_level=energy)
    await state.set_state(EveningSurvey.stress)
    await callback.message.edit_text(
        "😤 Який рівень стресу сьогодні?",
        reply_markup=stress_keyboard(),
    )


@router.callback_query(EveningSurvey.stress)
async def evening_stress(callback: CallbackQuery, state: FSMContext):
    stress = STRESS_MAP.get(callback.data, "medium")
    await state.update_data(stress_level=stress)
    await state.set_state(EveningSurvey.pain)
    await callback.message.edit_text(
        "💊 Щось болить чи турбує?",
        reply_markup=pain_keyboard(),
    )


@router.callback_query(EveningSurvey.pain)
async def evening_pain(callback: CallbackQuery, state: FSMContext):
    if callback.data == "pain_none":
        await state.update_data(pain_locations=[])
    else:
        data = await state.get_data()
        pain_locations = data.get("pain_locations", [])
        pain_part = callback.data.replace("pain_", "")
        if pain_part not in pain_locations:
            pain_locations.append(pain_part)
        await state.update_data(pain_locations=pain_locations)
        await callback.answer(f"Додано: {pain_part}")
        return

    await state.set_state(EveningSurvey.notes)
    await callback.message.edit_text(
        "📝 Хочеш щось додати? Напиши або пропусти.",
        reply_markup=skip_keyboard("skip_notes"),
    )


@router.message(EveningSurvey.notes)
async def evening_notes(message: Message, state: FSMContext):
    await state.update_data(notes=message.text)
    await _finish_evening_survey(message, state)


@router.callback_query(F.data == "skip_notes", EveningSurvey.notes)
async def evening_skip_notes(callback: CallbackQuery, state: FSMContext):
    await _finish_evening_survey(callback.message, state, callback.from_user.id)


async def _finish_evening_survey(message, state: FSMContext, user_telegram_id: int = None):
    from app.telegram.utils import get_user_by_telegram_id, save_survey
    data = await state.get_data()
    await state.clear()

    tg_id = user_telegram_id or message.chat.id
    user = await get_user_by_telegram_id(tg_id)
    if user:
        await save_survey(user, "evening", data)

    await message.answer(
        "✅ *Чудово!* День записано.\n\n"
        "🌙 Відпочивай. AI-лікар проаналізує твій день.",
        parse_mode="Markdown",
    )

    from app.tasks.ai_tasks import analyze_health_task
    if user:
        analyze_health_task.delay(str(user.id))
