"""Guarantee one notification row per recipient and incident.

Revision ID: ab31d8f0ce24
Revises: 7d83c6b6392e
Create Date: 2026-10-10
"""
from alembic import op


revision = "ab31d8f0ce24"
down_revision = "7d83c6b6392e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_notifications_user_incident",
        "notifications",
        ["user_id", "incident_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_notifications_user_incident",
        "notifications",
        type_="unique",
    )
