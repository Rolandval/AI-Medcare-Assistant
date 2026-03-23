"""Telegram inline and reply keyboards"""

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder


def wellbeing_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="😞 1-3", callback_data="wb_bad"),
        InlineKeyboardButton(text="😐 4-6", callback_data="wb_ok"),
        InlineKeyboardButton(text="😊 7-8", callback_data="wb_good"),
        InlineKeyboardButton(text="😄 9-10", callback_data="wb_great"),
    )
    return builder.as_markup()


def sleep_hours_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="< 5г", callback_data="sleep_4"),
        InlineKeyboardButton(text="5-6г", callback_data="sleep_5"),
        InlineKeyboardButton(text="6-7г", callback_data="sleep_6"),
    )
    builder.row(
        InlineKeyboardButton(text="7-8г", callback_data="sleep_7"),
        InlineKeyboardButton(text="8-9г", callback_data="sleep_8"),
        InlineKeyboardButton(text="9г+", callback_data="sleep_9"),
    )
    return builder.as_markup()


def mood_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="😢", callback_data="mood_terrible"),
        InlineKeyboardButton(text="😕", callback_data="mood_bad"),
        InlineKeyboardButton(text="😐", callback_data="mood_neutral"),
        InlineKeyboardButton(text="🙂", callback_data="mood_good"),
        InlineKeyboardButton(text="😄", callback_data="mood_great"),
    )
    return builder.as_markup()


def pain_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="✅ Нічого", callback_data="pain_none"),
    )
    builder.row(
        InlineKeyboardButton(text="🧠 Голова", callback_data="pain_head"),
        InlineKeyboardButton(text="🫀 Серце", callback_data="pain_heart"),
        InlineKeyboardButton(text="🫁 Легені", callback_data="pain_lungs"),
    )
    builder.row(
        InlineKeyboardButton(text="🦴 Спина", callback_data="pain_back"),
        InlineKeyboardButton(text="🦵 Ноги", callback_data="pain_legs"),
        InlineKeyboardButton(text="🤢 Живіт", callback_data="pain_stomach"),
    )
    builder.row(
        InlineKeyboardButton(text="💪 Руки", callback_data="pain_arms"),
        InlineKeyboardButton(text="👁 Очі", callback_data="pain_eyes"),
        InlineKeyboardButton(text="🔴 Інше", callback_data="pain_other"),
    )
    return builder.as_markup()


def stress_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🟢 Низький", callback_data="stress_low"),
        InlineKeyboardButton(text="🟡 Середній", callback_data="stress_medium"),
        InlineKeyboardButton(text="🔴 Високий", callback_data="stress_high"),
    )
    return builder.as_markup()


def energy_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🔋1-3", callback_data="energy_low"),
        InlineKeyboardButton(text="🔋🔋4-6", callback_data="energy_medium"),
        InlineKeyboardButton(text="🔋🔋🔋7-8", callback_data="energy_high"),
        InlineKeyboardButton(text="⚡9-10", callback_data="energy_max"),
    )
    return builder.as_markup()


def skip_keyboard(callback_data: str = "skip") -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="Пропустити →", callback_data=callback_data))
    return builder.as_markup()


def photo_or_skip_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="📸 Зараз надішлю", callback_data="photo_now"),
        InlineKeyboardButton(text="⏭ Пропустити", callback_data="photo_skip"),
    )
    return builder.as_markup()


def main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📊 Мій стан"), KeyboardButton(text="🍽 Їжа сьогодні")],
            [KeyboardButton(text="📋 Меню тижня"), KeyboardButton(text="🛒 Список закупок")],
            [KeyboardButton(text="💡 Порада зараз"), KeyboardButton(text="👨‍👩‍👧‍👦 Сім'я")],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )
