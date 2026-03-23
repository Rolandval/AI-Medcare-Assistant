"""Initial migration — all tables

Revision ID: 0001
Revises:
Create Date: 2026-03-23
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # families
    op.create_table(
        "families",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("invite_code", sa.String(20), unique=True, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # users
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("telegram_id", sa.BigInteger, unique=True, nullable=True),
        sa.Column("telegram_username", sa.String(100), nullable=True),
        sa.Column("family_id", UUID(as_uuid=True), sa.ForeignKey("families.id"), nullable=True),
        sa.Column("is_family_admin", sa.Boolean, default=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("birth_date", sa.Date, nullable=True),
        sa.Column("gender", sa.String(10), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("occupation", sa.String(200), nullable=True),
        sa.Column("lifestyle", sa.String(50), nullable=True),
        sa.Column("location_city", sa.String(100), nullable=True),
        sa.Column("location_country", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("morning_survey_hour", sa.Integer, default=7),
        sa.Column("morning_survey_minute", sa.Integer, default=30),
        sa.Column("evening_survey_hour", sa.Integer, default=20),
        sa.Column("evening_survey_minute", sa.Integer, default=0),
        sa.Column("notifications_enabled", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"])

    # health_profiles
    op.create_table(
        "health_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True),
        sa.Column("height_cm", sa.Float, nullable=True),
        sa.Column("weight_kg", sa.Float, nullable=True),
        sa.Column("blood_type", sa.String(5), nullable=True),
        sa.Column("chronic_conditions", JSONB, nullable=True),
        sa.Column("allergies", JSONB, nullable=True),
        sa.Column("current_medications", JSONB, nullable=True),
        sa.Column("past_surgeries", JSONB, nullable=True),
        sa.Column("physical_features", JSONB, nullable=True),
        sa.Column("professional_risks", JSONB, nullable=True),
        sa.Column("health_goals", JSONB, nullable=True),
        sa.Column("additional_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # health_metrics
    op.create_table(
        "health_metrics",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metric_type", sa.String(50), nullable=False),
        sa.Column("value", sa.Float, nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("source", sa.String(30), default="manual"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_health_metrics_user_id", "health_metrics", ["user_id"])
    op.create_index("ix_health_metrics_metric_type", "health_metrics", ["metric_type"])
    op.create_index("ix_health_metrics_recorded_at", "health_metrics", ["recorded_at"])

    # daily_surveys
    op.create_table(
        "daily_surveys",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("survey_type", sa.String(10), nullable=False),
        sa.Column("survey_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("wellbeing_score", sa.Integer, nullable=True),
        sa.Column("mood", sa.String(20), nullable=True),
        sa.Column("sleep_hours", sa.Float, nullable=True),
        sa.Column("sleep_quality", sa.Integer, nullable=True),
        sa.Column("wake_feeling", sa.String(20), nullable=True),
        sa.Column("energy_level", sa.Integer, nullable=True),
        sa.Column("stress_level", sa.String(10), nullable=True),
        sa.Column("physical_activity", sa.String(200), nullable=True),
        sa.Column("activity_minutes", sa.Integer, nullable=True),
        sa.Column("pain_locations", JSONB, nullable=True),
        sa.Column("symptoms", JSONB, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("temperature", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_daily_surveys_user_id", "daily_surveys", ["user_id"])
    op.create_index("ix_daily_surveys_survey_date", "daily_surveys", ["survey_date"])

    # medical_documents
    op.create_table(
        "medical_documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doc_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("doc_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=True),
        sa.Column("file_type", sa.String(50), nullable=True),
        sa.Column("file_size_bytes", sa.Integer, nullable=True),
        sa.Column("ocr_status", sa.String(20), default="pending"),
        sa.Column("parsed_data", JSONB, nullable=True),
        sa.Column("ai_analysis", JSONB, nullable=True),
        sa.Column("ai_flags", JSONB, nullable=True),
        sa.Column("user_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_medical_documents_user_id", "medical_documents", ["user_id"])
    op.create_index("ix_medical_documents_doc_type", "medical_documents", ["doc_type"])

    # meals
    op.create_table(
        "meals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("meal_type", sa.String(20), nullable=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("recognition_status", sa.String(20), default="pending"),
        sa.Column("ai_recognition", JSONB, nullable=True),
        sa.Column("calories", sa.Float, nullable=True),
        sa.Column("proteins_g", sa.Float, nullable=True),
        sa.Column("fats_g", sa.Float, nullable=True),
        sa.Column("carbs_g", sa.Float, nullable=True),
        sa.Column("fiber_g", sa.Float, nullable=True),
        sa.Column("health_score", sa.Integer, nullable=True),
        sa.Column("ai_comment", sa.String(500), nullable=True),
        sa.Column("eaten_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_meals_user_id", "meals", ["user_id"])
    op.create_index("ix_meals_eaten_at", "meals", ["eaten_at"])

    # ai_recommendations
    op.create_table(
        "ai_recommendations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rec_type", sa.String(30), nullable=False),
        sa.Column("agents_used", JSONB, nullable=True),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("is_read", sa.Boolean, default=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_recommendations_user_id", "ai_recommendations", ["user_id"])
    op.create_index("ix_ai_recommendations_rec_type", "ai_recommendations", ["rec_type"])

    # family_menus
    op.create_table(
        "family_menus",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("family_id", UUID(as_uuid=True), sa.ForeignKey("families.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_start", sa.Date, nullable=False),
        sa.Column("menu_data", JSONB, nullable=False),
        sa.Column("shopping_list", JSONB, nullable=False),
        sa.Column("optimization_notes", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_family_menus_family_id", "family_menus", ["family_id"])
    op.create_index("ix_family_menus_week_start", "family_menus", ["week_start"])


def downgrade() -> None:
    op.drop_table("family_menus")
    op.drop_table("ai_recommendations")
    op.drop_table("meals")
    op.drop_table("medical_documents")
    op.drop_table("daily_surveys")
    op.drop_table("health_metrics")
    op.drop_table("health_profiles")
    op.drop_table("users")
    op.drop_table("families")
    op.execute("DROP EXTENSION IF EXISTS vector")
