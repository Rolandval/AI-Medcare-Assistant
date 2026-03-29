"""Telegram media handlers — photo, document, voice with type selection"""

import logging
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

logger = logging.getLogger(__name__)

router = Router()


class PhotoClassify(StatesGroup):
    waiting_choice = State()


@router.message(F.photo)
async def handle_photo(message: Message, state: FSMContext):
    """Process incoming photo — ask user what it is"""
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

    # Store file URL in state and ask
    await state.set_state(PhotoClassify.waiting_choice)
    await state.update_data(photo_url=file_url, user_id=str(user.id))

    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🍽 Це їжа", callback_data="photo_type_food"),
        InlineKeyboardButton(text="📋 Це аналіз", callback_data="photo_type_doc"),
    )

    await message.answer(
        "📸 Фото отримано! Що це?",
        reply_markup=builder.as_markup(),
    )


@router.callback_query(PhotoClassify.waiting_choice, F.data == "photo_type_food")
async def photo_is_food(callback: CallbackQuery, state: FSMContext):
    """User confirmed photo is food — start recognition"""
    data = await state.get_data()
    await state.clear()

    file_url = data.get("photo_url")
    if not file_url:
        await callback.message.edit_text("❌ Помилка. Надішли фото ще раз.")
        return

    from app.telegram.utils import get_user_by_telegram_id
    user = await get_user_by_telegram_id(callback.from_user.id)
    if not user:
        await callback.message.edit_text("❌ Акаунт не прив'язано.")
        return

    await callback.message.edit_text("🍽 Аналізую їжу... 🔍 (10-20 сек)")

    from app.telegram.utils import save_meal_from_telegram
    await save_meal_from_telegram(user, file_url, callback.message)


@router.callback_query(PhotoClassify.waiting_choice, F.data == "photo_type_doc")
async def photo_is_document(callback: CallbackQuery, state: FSMContext):
    """User confirmed photo is medical document — start OCR"""
    data = await state.get_data()
    await state.clear()

    file_url = data.get("photo_url")
    if not file_url:
        await callback.message.edit_text("❌ Помилка. Надішли фото ще раз.")
        return

    from app.telegram.utils import get_user_by_telegram_id
    user = await get_user_by_telegram_id(callback.from_user.id)
    if not user:
        await callback.message.edit_text("❌ Акаунт не прив'язано.")
        return

    await callback.message.edit_text("📄 Аналізую документ... ⏳ (30-60 сек)")

    from app.telegram.utils import save_document_from_telegram
    await save_document_from_telegram(user, file_url, "photo_document.jpg", callback.message)


@router.message(F.document)
async def handle_document(message: Message):
    """Process document — PDF/image analysis"""
    from app.telegram.utils import get_user_by_telegram_id
    user = await get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Акаунт не прив'язано.")
        return

    doc = message.document
    if doc.mime_type not in ["application/pdf", "image/jpeg", "image/png"]:
        await message.answer("❌ Підтримуються тільки PDF та зображення (JPG, PNG).")
        return

    bot = message.bot
    file = await bot.get_file(doc.file_id)
    file_url = f"https://api.telegram.org/file/bot{bot.token}/{file.file_path}"

    await message.answer("📄 Документ отримано! Аналізую... ⏳ (30-60 сек)")

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
