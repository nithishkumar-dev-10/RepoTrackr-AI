import enum
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"


class TokenType(str, enum.Enum):
    ACCESS = "access"
    REFRESH = "refresh"


class TokenError(Exception):
    """Raised when a token is missing, invalid, expired, or of the wrong type."""


def _create_token(
    subject: str | int, token_type: TokenType, expires_delta: timedelta
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "type": token_type.value,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, get_settings().SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(subject: str | int) -> str:
    settings = get_settings()
    return _create_token(
        subject, TokenType.ACCESS, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(subject: str | int) -> str:
    settings = get_settings()
    return _create_token(
        subject, TokenType.REFRESH, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )


def decode_token(token: str, expected_type: TokenType | str) -> dict[str, Any]:
    expected = (
        expected_type
        if isinstance(expected_type, TokenType)
        else TokenType(expected_type)
    )
    try:
        payload = jwt.decode(
            token, get_settings().SECRET_KEY, algorithms=[ALGORITHM]
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Token is invalid") from exc

    if payload.get("type") != expected.value:
        raise TokenError(f"Expected a {expected.value} token")
    return payload
