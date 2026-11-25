"""add repo index fields

Revision ID: b7c1f2a9d4e6
Revises: 09282e667a32
Create Date: 2026-11-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7c1f2a9d4e6"
down_revision: Union[str, Sequence[str], None] = "09282e667a32"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("repos", schema=None) as batch_op:
        batch_op.add_column(sa.Column("error_message", sa.String(length=2000), nullable=True))
        batch_op.add_column(sa.Column("index_summary", sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("repos", schema=None) as batch_op:
        batch_op.drop_column("index_summary")
        batch_op.drop_column("error_message")
