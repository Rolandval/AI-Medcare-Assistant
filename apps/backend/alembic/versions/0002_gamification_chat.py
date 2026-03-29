"""Add gamification + chat tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-29
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # user_streaks
    op.create_table(
        "user_streaks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("streak_type", sa.String(30), nullable=False),
        sa.Column("current_count", sa.Integer, default=0, nullable=False),
        sa.Column("best_count", sa.Integer, default=0, nullable=False),
        sa.Column("last_date", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "streak_type", name="uq_user_streak_type"),
    )

    # user_achievements
    op.create_table(
        "user_achievements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("achievement_key", sa.String(50), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "achievement_key", name="uq_user_achievement_key"),
    )

    # ai_chat_messages
    op.create_table(
        "ai_chat_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("doctor_id", sa.String(30), nullable=False, index=True),
        sa.Column("role", sa.String(15), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("metadata", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Add onboarding_completed to users
    op.add_column("users", sa.Column("onboarding_completed", sa.Boolean, server_default="false", nullable=False))

    # Add morning_survey_hour, evening_survey_hour to users
    op.add_column("users", sa.Column("morning_survey_hour", sa.Integer, server_default="8", nullable=True))
    op.add_column("users", sa.Column("evening_survey_hour", sa.Integer, server_default="21", nullable=True))


def downgrade() -> None:
    op.drop_column("users", "evening_survey_hour")
    op.drop_column("users", "morning_survey_hour")
    op.drop_column("users", "onboarding_completed")
    op.drop_table("ai_chat_messages")
    op.drop_table("user_achievements")
    op.drop_table("user_streaks")
