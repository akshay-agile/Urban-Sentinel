"""Create persisted responder registry.

Revision ID: c19b2f4a8d11
Revises: ab31d8f0ce24
"""
from alembic import op
import sqlalchemy as sa

revision = "c19b2f4a8d11"
down_revision = "ab31d8f0ce24"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "responders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=80), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=True),
        sa.Column("availability", sa.String(length=20), nullable=False, server_default="unavailable"),
        sa.Column("assigned_incident_id", sa.Integer(), sa.ForeignKey("incidents.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("responders")
