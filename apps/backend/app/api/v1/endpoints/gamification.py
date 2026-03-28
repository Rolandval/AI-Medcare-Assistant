"""Gamification endpoints — Health Score, Streaks, Achievements"""

from fastapi import APIRouter

from app.api.deps import DB, CurrentUser
from app.services.gamification import (
    calculate_health_score,
    get_user_streaks,
    get_user_achievements,
    ACHIEVEMENTS,
)

router = APIRouter(prefix="/ai/gamification", tags=["ai-gamification"])


@router.get("/score")
async def get_health_score(current_user: CurrentUser, db: DB):
    """Get current health score with breakdown"""
    return await calculate_health_score(db, current_user.id)


@router.get("/streaks")
async def get_streaks(current_user: CurrentUser, db: DB):
    """Get all user streaks"""
    return await get_user_streaks(db, current_user.id)


@router.get("/achievements")
async def get_achievements(current_user: CurrentUser, db: DB):
    """Get all achievements — unlocked and locked"""
    return await get_user_achievements(db, current_user.id)


@router.get("/summary")
async def get_gamification_summary(current_user: CurrentUser, db: DB):
    """Get full gamification state in one call (for feed header)"""
    score = await calculate_health_score(db, current_user.id)
    streaks = await get_user_streaks(db, current_user.id)
    achievements = await get_user_achievements(db, current_user.id)

    unlocked_count = sum(1 for a in achievements if a["unlocked"])
    total_points = sum(a["points"] for a in achievements if a["unlocked"])

    # Find best active streak for display
    active_streaks = [s for s in streaks if s["active"]]
    best_streak = max(active_streaks, key=lambda s: s["current"], default=None)

    return {
        "score": score["total"],
        "score_breakdown": score["breakdown"],
        "streak": {
            "type": best_streak["type"] if best_streak else "checkin",
            "emoji": best_streak["emoji"] if best_streak else "🔥",
            "current": best_streak["current"] if best_streak else 0,
        },
        "streaks": streaks,
        "achievements_unlocked": unlocked_count,
        "achievements_total": len(ACHIEVEMENTS),
        "total_points": total_points,
    }
