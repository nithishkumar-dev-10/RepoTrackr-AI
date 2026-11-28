import json
from datetime import datetime, timezone

import jwt
import pytest
from pydantic import ValidationError
from sqlalchemy import select

from app.core.config import Settings, get_settings
from app.core.email import send_reset_email, send_verification_email
from app.core.ratelimit import limiter
from app.models.user import User
from app.security import (
    TokenError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
)

EMAIL = "batch1@example.com"
PASSWORD = "secret123"


def _signup_and_verify(client, sent_emails) -> None:
    assert client.post(
        "/auth/signup", json={"email": EMAIL, "password": PASSWORD}
    ).status_code == 201
    assert client.post(
        "/auth/verify-email", json={"token": sent_emails[-1][1]}
    ).status_code == 200


def _login(client):
    return client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})


def test_refresh_tokens_have_random_jti(monkeypatch) -> None:
    frozen_now = datetime.now(timezone.utc).replace(microsecond=0)

    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return frozen_now

    monkeypatch.setattr("app.security.tokens.datetime", FrozenDateTime)

    first = create_refresh_token(1)
    second = create_refresh_token(1)

    assert first != second
    assert decode_token(first, TokenType.REFRESH)["jti"]
    assert decode_token(first, TokenType.REFRESH)["jti"] != decode_token(
        second, TokenType.REFRESH
    )["jti"]


def test_refresh_rejects_immediate_old_token_reuse(client, sent_emails) -> None:
    _signup_and_verify(client, sent_emails)
    first = _login(client).json()

    rotated = client.post(
        "/auth/refresh", json={"refresh_token": first["refresh_token"]}
    )

    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != first["refresh_token"]
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": first["refresh_token"]}
        ).status_code
        == 401
    )


def test_password_reset_revokes_existing_refresh_tokens(
    client, sent_emails, sent_reset_emails
) -> None:
    _signup_and_verify(client, sent_emails)
    tokens = _login(client).json()
    client.post("/auth/forgot-password", json={"email": EMAIL})

    assert (
        client.post(
            "/auth/reset-password",
            json={
                "token": sent_reset_emails[-1][1],
                "new_password": "newsecret123",
            },
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        ).status_code
        == 401
    )


def test_change_password_invalidates_pending_reset_token(
    client, sent_emails, sent_reset_emails
) -> None:
    _signup_and_verify(client, sent_emails)
    tokens = _login(client).json()
    client.post("/auth/forgot-password", json={"email": EMAIL})
    reset_token = sent_reset_emails[-1][1]

    assert (
        client.post(
            "/auth/change-password",
            json={"current_password": PASSWORD, "new_password": "newsecret123"},
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/auth/reset-password",
            json={"token": reset_token, "new_password": "another123"},
        ).status_code
        == 400
    )


def test_signup_duplicate_does_not_reveal_account(client, sent_emails) -> None:
    assert _signup_and_verify(client, sent_emails) is None
    email_count = len(sent_emails)

    duplicate = client.post(
        "/auth/signup", json={"email": EMAIL, "password": PASSWORD}
    )

    assert duplicate.status_code == 201
    assert "Account created" in duplicate.json()["message"]
    assert len(sent_emails) == email_count + 1


def test_login_unverified_and_unknown_share_status_and_message(client, sent_emails) -> None:
    assert (
        client.post(
            "/auth/signup", json={"email": EMAIL, "password": PASSWORD}
        ).status_code
        == 201
    )

    unverified = _login(client)
    unknown = client.post(
        "/auth/login", json={"email": "nobody@example.com", "password": PASSWORD}
    )

    assert unverified.status_code == 401
    assert unknown.status_code == 401
    assert unverified.json()["error"]["message"] == unknown.json()["error"]["message"]
    assert unverified.json()["error"]["code"] == "email_not_verified"
    assert unknown.json()["error"]["code"] == "http_error"


def test_validation_error_does_not_echo_submitted_input(client) -> None:
    response = client.post(
        "/auth/signup", json={"email": "echo@example.com", "password": "echo123"}
    )

    body = json.dumps(response.json())
    assert response.status_code == 422
    assert "echo123" not in body
    assert '"input"' not in body
    assert '"ctx"' not in body


def test_email_fallback_logs_redact_token_links(caplog) -> None:
    caplog.set_level("WARNING", logger="app.email")

    send_verification_email("user@example.com", "verify-secret-token")
    send_reset_email("user@example.com", "reset-secret-token")

    assert "verify-secret-token" not in caplog.text
    assert "reset-secret-token" not in caplog.text
    assert "/verify-email?token=" not in caplog.text
    assert "/reset-password?token=" not in caplog.text


def test_jwt_without_exp_is_rejected_by_decode() -> None:
    token = jwt.encode(
        {
            "sub": "1",
            "type": "access",
            "iat": int(datetime.now(timezone.utc).timestamp()),
        },
        get_settings().SECRET_KEY,
        algorithm="HS256",
    )

    with pytest.raises(TokenError):
        decode_token(token, TokenType.ACCESS)


def test_jwt_without_exp_cannot_reach_me(client, sent_emails, db_session) -> None:
    _signup_and_verify(client, sent_emails)
    user = db_session.scalar(select(User).where(User.email == EMAIL))
    token = jwt.encode(
        {
            "sub": str(user.id),
            "type": "access",
            "iat": int(datetime.now(timezone.utc).timestamp()),
        },
        get_settings().SECRET_KEY,
        algorithm="HS256",
    )

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401


def test_auth_endpoints_are_rate_limited(client, sent_emails, monkeypatch) -> None:
    settings = get_settings()
    for name in (
        "RATE_LIMIT_REFRESH",
        "RATE_LIMIT_VERIFY_EMAIL",
        "RATE_LIMIT_RESET_PASSWORD",
        "RATE_LIMIT_CHANGE_PASSWORD",
        "RATE_LIMIT_LOGOUT",
    ):
        monkeypatch.setattr(settings, name, "2/minute")
    limiter.reset()
    _signup_and_verify(client, sent_emails)
    access_token = _login(client).json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    cases = [
        ("/auth/refresh", {"refresh_token": "bad"}, {}),
        ("/auth/verify-email", {"token": "bad"}, {}),
        (
            "/auth/reset-password",
            {"token": "bad", "new_password": "newsecret123"},
            {},
        ),
        (
            "/auth/change-password",
            {"current_password": PASSWORD, "new_password": "newsecret123"},
            headers,
        ),
        ("/auth/logout", None, headers),
    ]

    for path, payload, case_headers in cases:
        statuses = []
        for _ in range(3):
            response = client.post(path, json=payload, headers=case_headers)
            statuses.append(response.status_code)
        assert statuses[2] == 429, (path, statuses)


def test_wildcard_cors_origin_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(SECRET_KEY="test-secret-key-not-for-production", CORS_ORIGINS=["*"])


def test_unverified_user_access_token_is_rejected(
    client, sent_emails, db_session
) -> None:
    assert (
        client.post(
            "/auth/signup", json={"email": EMAIL, "password": PASSWORD}
        ).status_code
        == 201
    )
    user = db_session.scalar(select(User).where(User.email == EMAIL))
    token = create_access_token(user.id)

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
