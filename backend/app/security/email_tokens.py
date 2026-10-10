import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.models.email_token import EmailTokenType

EMAIL_TOKEN_BYTES = 32


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_email_token() -> tuple[str, str]:
    raw_token = secrets.token_urlsafe(EMAIL_TOKEN_BYTES)
    return raw_token, hash_token(raw_token)


def expires_at(token_type: EmailTokenType | str) -> datetime:
    if not isinstance(token_type, EmailTokenType):
        token_type = EmailTokenType(token_type)
    settings = get_settings()
    if token_type is EmailTokenType.VERIFY:
        delta = timedelta(hours=settings.VERIFY_TOKEN_EXPIRE_HOURS)
    else:
        delta = timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    return datetime.now(timezone.utc) + delta


def is_expired(expires_at: datetime, now: datetime | None = None) -> bool:
    current = now or datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return expires_at <= current


def is_used(used_at: datetime | None) -> bool:
    return used_at is not None
