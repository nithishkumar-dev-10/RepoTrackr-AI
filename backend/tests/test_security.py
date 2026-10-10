from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.core.config import get_settings
from app.models.email_token import EmailTokenType
from app.security import (
    TokenError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    expires_at,
    generate_email_token,
    hash_password,
    hash_token,
    is_expired,
    is_used,
    verify_password,
)


def test_hash_password_does_not_store_plaintext() -> None:
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert hashed.startswith("$argon2")


def test_verify_password_accepts_correct_password() -> None:
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed) is True


def test_verify_password_rejects_wrong_password() -> None:
    hashed = hash_password("secret123")
    assert verify_password("wrong-password", hashed) is False


def test_verify_password_rejects_malformed_hash() -> None:
    assert verify_password("secret123", "not-a-valid-hash") is False


def test_access_token_roundtrip() -> None:
    token = create_access_token(42)
    payload = decode_token(token, TokenType.ACCESS)
    assert payload["sub"] == "42"
    assert payload["type"] == "access"


def test_refresh_token_roundtrip() -> None:
    token = create_refresh_token(42)
    payload = decode_token(token, TokenType.REFRESH)
    assert payload["sub"] == "42"
    assert payload["type"] == "refresh"


def test_access_token_rejected_as_refresh() -> None:
    token = create_access_token(1)
    with pytest.raises(TokenError):
        decode_token(token, TokenType.REFRESH)


def test_refresh_token_rejected_as_access() -> None:
    token = create_refresh_token(1)
    with pytest.raises(TokenError):
        decode_token(token, TokenType.ACCESS)


def test_expired_token_rejected() -> None:
    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {
            "sub": "1",
            "type": "access",
            "iat": int((now - timedelta(minutes=5)).timestamp()),
            "exp": int((now - timedelta(minutes=1)).timestamp()),
        },
        get_settings().SECRET_KEY,
        algorithm="HS256",
    )
    with pytest.raises(TokenError):
        decode_token(expired, TokenType.ACCESS)


def test_tampered_token_rejected() -> None:
    token = create_access_token(1)
    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
    with pytest.raises(TokenError):
        decode_token(tampered, TokenType.ACCESS)


def test_token_signed_with_other_secret_rejected() -> None:
    now = datetime.now(timezone.utc)
    forged = jwt.encode(
        {
            "sub": "1",
            "type": "access",
            "exp": int((now + timedelta(minutes=5)).timestamp()),
        },
        "some-other-secret-that-is-long-enough-1234567890",
        algorithm="HS256",
    )
    with pytest.raises(TokenError):
        decode_token(forged, TokenType.ACCESS)


def test_email_token_hash_matches() -> None:
    raw_token, token_hash = generate_email_token()
    assert token_hash == hash_token(raw_token)
    assert token_hash != raw_token
    assert len(token_hash) == 64


def test_generate_email_token_is_unique() -> None:
    first, _ = generate_email_token()
    second, _ = generate_email_token()
    assert first != second


def test_expires_at_differs_by_type() -> None:
    verify_expires = expires_at(EmailTokenType.VERIFY)
    reset_expires = expires_at(EmailTokenType.RESET)
    now = datetime.now(timezone.utc)
    assert verify_expires > reset_expires
    assert verify_expires > now
    assert reset_expires > now


def test_expires_at_accepts_string_type() -> None:
    assert expires_at("verify") > datetime.now(timezone.utc)


def test_is_expired() -> None:
    now = datetime.now(timezone.utc)
    assert is_expired(now - timedelta(seconds=1), now=now) is True
    assert is_expired(now + timedelta(seconds=1), now=now) is False


def test_is_expired_handles_naive_datetime() -> None:
    naive_past = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
    assert is_expired(naive_past) is True


def test_is_used() -> None:
    assert is_used(None) is False
    assert is_used(datetime.now(timezone.utc)) is True
