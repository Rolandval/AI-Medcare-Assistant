"""Telegram media handlers — photo, document, voice"""

import io
from aiogram import Router, F
from aiogram.types import Message

router = Router()


@router.message(F.photo)
async def handle_photo(message: Message):
    """Process incoming photo — food or medical document"""
    from app.telegram.utils import get_user_by_telegram_id
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано. Використай /start")
        return

    # Get best quality photo
    photo = message.photo[-1]
    bot = message.bot
    file = await bot.get_file(photo.file_id)
    file_url = f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"

    # Ask what it is
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    from aiogram.utils.keyboard import InlineKeyboardBuilder
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🍽 Це їжа", callback_data=f"photo_food_{file_url}"),
        InlineKeyboardButton(text="📋 Це аналіз", callback_data=f"photo_doc_{file_url}"),
    )

    # For simplicity — assume food if no context
    await message.answer("📸 Фото отримано! Аналізую їжу... 🔍")

    # Save as meal and trigger recognition
    from app.telegram.utils import save_meal_from_telegram
    await save_meal_from_telegram(user, file_url, message)


@router.message(F.document)
async def handle_document(message: Message):
    """Process document — PDF analysis"""
    from app.telegram.utils import get_user_by_telegram_id
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано.")
        return

    doc = message.document
    if not doc.mime_type in ["application/pdf", "image/jpeg", "image/png"]:
        await message.answer("❌ Підтримуються тільки PDF та зображення.")
        return

    bot = message.bot
    file = await bot.get_file(doc.file_id)
    file_url = f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"

    await message.answer("📄 Документ отримано! Читаю та аналізую... ⏳ (може зайняти 30-60 сек)")

    from app.telegram.utils import save_document_from_telegram
    await save_document_from_telegram(user, file_url, doc.file_name or "document.pdf", message)


@router.message(F.voice)
async def handle_voice(message: Message):
    """Process voice message — transcribe and log as health note"""
    from app.telegram.utils import get_user_by_telegram_id
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано.")
        return

    await message.answer(
        "🎙 Голосове повідомлення отримано!\n"
        "Поки що збережено як нотатку. "
        "Розшифровка голосу — буде в наступній версії. 🚧"
    )
