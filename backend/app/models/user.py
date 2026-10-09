from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlalchemy import DateTime, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.email_token import EmailToken
    from app.models.repo import Repo


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    email_tokens: Mapped[List["EmailToken"]] = relationship(
        "EmailToken",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    repos: Mapped[List["Repo"]] = relationship(
        "Repo",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )