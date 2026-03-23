"""Survey sending module — used by Celery tasks"""

async def send_survey(telegram_id: int, name: str, survey_type: str):
    """Proxy to utils.send_survey"""
    from app.telegram.utils import send_survey as _send
    await _send(telegram_id, name, survey_type)
