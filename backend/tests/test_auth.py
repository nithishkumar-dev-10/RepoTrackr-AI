from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import get_settings
from app.core.ratelimit import limiter
from app.models.email_token import EmailToken, EmailTokenType
from app.models.user import User
from app.security import create_refresh_token

PASSWORD = "secret123"
EMAIL = "user@example.com"


def _signup(client, email: str = EMAIL, password: str = PASSWORD):
    return client.post("/auth/signup", json={"email": email, "password": password})


def _verify(client, token: str):
    return client.post("/auth/verify-email", json={"token": token})


def _login(client, email: str = EMAIL, password: str = PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def _signup_and_verify(client, sent_emails, email: str = EMAIL):
    _signup(client, email=email)
    raw_token = sent_emails[-1][1]
    _verify(client, raw_token)
    return raw_token


# --- signup ---


def test_signup_creates_unverified_user_and_sends_email(
    client, sent_emails, db_session
):
    response = _signup(client)

    assert response.status_code == 201
    assert response.json() == {
        "message": "Account created. Check your email to verify your account."
    }

    user = db_session.scalar(select(User).where(User.email == EMAIL))
    assert user is not None
    assert user.is_verified is False
    assert user.password_hash != PASSWORD

    assert len(sent_emails) == 1
    assert sent_emails[0][0] == EMAIL
    assert sent_emails[0][1]


def test_signup_normalizes_email_case(client, db_session):
    _signup(client, email="User@Example.com")

    user = db_session.scalar(select(User).where(User.email == EMAIL))
    assert user is not None


def test_signup_duplicate_email_conflict(client):
    assert _signup(client).status_code == 201

    response = _signup(client)

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Email is already registered"


def test_signup_weak_password_validation_error(client):
    response = _signup(client, password="abc")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


# --- verify-email ---


def test_verify_email_success(client, sent_emails, db_session):
    _signup(client)
    raw_token = sent_emails[0][1]

    response = _verify(client, raw_token)

    assert response.status_code == 200
    assert response.json() == {"message": "Email verified. You can now log in."}
    user = db_session.scalar(select(User).where(User.email == EMAIL))
    assert user.is_verified is True


def test_verify_email_invalid_token(client):
    response = _verify(client, "not-a-real-token")

    assert response.status_code == 400
    assert response.json()["error"]["message"] == "Invalid or expired verification token"


def test_verify_email_expired_token(client, sent_emails, db_session):
    _signup(client)
    raw_token = sent_emails[0][1]

    user = db_session.scalar(select(User).where(User.email == EMAIL))
    token = db_session.scalar(select(EmailToken).where(EmailToken.user_id == user.id))
    token.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db_session.commit()

    response = _verify(client, raw_token)

    assert response.status_code == 400


def test_verify_email_used_token(client, sent_emails):
    _signup(client)
    raw_token = sent_emails[0][1]

    assert _verify(client, raw_token).status_code == 200
    response = _verify(client, raw_token)

    assert response.status_code == 400


# --- resend-verification ---


def test_resend_verification_unknown_email_is_generic(client, sent_emails):
    response = client.post("/auth/resend-verification", json={"email": EMAIL})

    assert response.status_code == 200
    assert "new verification email has been sent" in response.json()["message"]
    assert sent_emails == []


def test_resend_verification_invalidates_old_token(client, sent_emails):
    _signup(client)
    old_token = sent_emails[0][1]

    response = client.post("/auth/resend-verification", json={"email": EMAIL})
    assert response.status_code == 200
    assert len(sent_emails) == 2
    new_token = sent_emails[1][1]

    assert _verify(client, old_token).status_code == 400
    assert _verify(client, new_token).status_code == 200


def test_resend_verification_for_verified_user_sends_nothing(client, sent_emails):
    _signup_and_verify(client, sent_emails)

    response = client.post("/auth/resend-verification", json={"email": EMAIL})

    assert response.status_code == 200
    assert len(sent_emails) == 1


# --- login ---


def test_login_before_verification_forbidden(client):
    _signup(client)

    response = _login(client)

    assert response.status_code == 403
    assert "not verified" in response.json()["error"]["message"]


def test_login_after_verification_returns_tokens(client, sent_emails):
    _signup_and_verify(client, sent_emails)

    response = _login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"


def test_login_wrong_password_unauthorized(client, sent_emails):
    _signup_and_verify(client, sent_emails)

    response = _login(client, password="wrong123")

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password"


def test_login_unknown_email_unauthorized(client):
    response = _login(client, email="nobody@example.com")

    assert response.status_code == 401


# --- /me ---


def test_me_without_token_unauthorized(client):
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Not authenticated"


def test_me_returns_current_user(client, sent_emails):
    _signup_and_verify(client, sent_emails)
    access_token = _login(client).json()["access_token"]

    response = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == EMAIL
    assert body["is_verified"] is True
    assert body["id"] > 0


def test_me_rejects_refresh_token_as_access(client, sent_emails):
    _signup_and_verify(client, sent_emails)
    refresh_token = _login(client).json()["refresh_token"]

    response = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {refresh_token}"}
    )

    assert response.status_code == 401


# --- helpers for the 1G-b endpoints ---


def _auth_headers(client, sent_emails, email: str = EMAIL, password: str = PASSWORD):
    _signup_and_verify(client, sent_emails, email=email)
    access_token = _login(client, email=email, password=password).json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def _request_reset(client, sent_reset_emails, email: str = EMAIL) -> str:
    client.post("/auth/forgot-password", json={"email": email})
    return sent_reset_emails[-1][1]


# --- refresh ---


def test_refresh_returns_new_token_pair(client, sent_emails):
    _signup_and_verify(client, sent_emails)
    refresh_token = _login(client).json()["refresh_token"]

    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"


def test_refresh_rejects_access_token(client, sent_emails):
    _signup_and_verify(client, sent_emails)
    access_token = _login(client).json()["access_token"]

    response = client.post("/auth/refresh", json={"refresh_token": access_token})

    assert response.status_code == 401


def test_refresh_invalid_token_unauthorized(client):
    response = client.post("/auth/refresh", json={"refresh_token": "not-a-token"})

    assert response.status_code == 401


def test_refresh_expired_token_unauthorized(client, sent_emails, monkeypatch):
    _signup_and_verify(client, sent_emails)
    monkeypatch.setattr(get_settings(), "REFRESH_TOKEN_EXPIRE_DAYS", -1)
    expired_token = create_refresh_token(1)

    response = client.post("/auth/refresh", json={"refresh_token": expired_token})

    assert response.status_code == 401


# --- logout ---


def test_logout_with_auth_succeeds(client, sent_emails):
    headers = _auth_headers(client, sent_emails)

    response = client.post("/auth/logout", headers=headers)

    assert response.status_code == 200
    assert response.json() == {"message": "Logged out."}


def test_logout_without_auth_unauthorized(client):
    response = client.post("/auth/logout")

    assert response.status_code == 401


# --- forgot-password ---


def test_forgot_password_known_and_unknown_responses_identical(
    client, sent_emails, sent_reset_emails
):
    _signup_and_verify(client, sent_emails)

    known = client.post("/auth/forgot-password", json={"email": EMAIL})
    unknown = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})

    assert known.status_code == 200
    assert unknown.status_code == 200
    assert known.json() == unknown.json()
    assert len(sent_reset_emails) == 1
    assert sent_reset_emails[0][0] == EMAIL


# --- reset-password ---


def test_reset_password_success_changes_password(
    client, sent_emails, sent_reset_emails
):
    _signup_and_verify(client, sent_emails)
    raw_token = _request_reset(client, sent_reset_emails)

    response = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": "newsecret123"},
    )

    assert response.status_code == 200
    assert _login(client, password=PASSWORD).status_code == 401
    assert _login(client, password="newsecret123").status_code == 200


def test_reset_password_used_token_rejected(client, sent_emails, sent_reset_emails):
    _signup_and_verify(client, sent_emails)
    raw_token = _request_reset(client, sent_reset_emails)

    assert (
        client.post(
            "/auth/reset-password",
            json={"token": raw_token, "new_password": "newsecret123"},
        ).status_code
        == 200
    )
    response = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": "another123"},
    )

    assert response.status_code == 400


def test_reset_password_expired_token_rejected(
    client, sent_emails, sent_reset_emails, db_session
):
    _signup_and_verify(client, sent_emails)
    raw_token = _request_reset(client, sent_reset_emails)

    user = db_session.scalar(select(User).where(User.email == EMAIL))
    token = db_session.scalar(
        select(EmailToken).where(
            EmailToken.user_id == user.id,
            EmailToken.type == EmailTokenType.RESET,
        )
    )
    token.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    response = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": "newsecret123"},
    )

    assert response.status_code == 400


def test_reset_password_invalid_token_rejected(client):
    response = client.post(
        "/auth/reset-password",
        json={"token": "not-a-token", "new_password": "newsecret123"},
    )

    assert response.status_code == 400


def test_reset_password_weak_password_validation_error(
    client, sent_emails, sent_reset_emails
):
    _signup_and_verify(client, sent_emails)
    raw_token = _request_reset(client, sent_reset_emails)

    response = client.post(
        "/auth/reset-password", json={"token": raw_token, "new_password": "short"}
    )

    assert response.status_code == 422


# --- change-password ---


def test_change_password_success(client, sent_emails):
    headers = _auth_headers(client, sent_emails)

    response = client.post(
        "/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "newsecret123"},
        headers=headers,
    )

    assert response.status_code == 200
    assert _login(client, password=PASSWORD).status_code == 401
    assert _login(client, password="newsecret123").status_code == 200


def test_change_password_wrong_current_rejected(client, sent_emails):
    headers = _auth_headers(client, sent_emails)

    response = client.post(
        "/auth/change-password",
        json={"current_password": "wrong123", "new_password": "newsecret123"},
        headers=headers,
    )

    assert response.status_code == 400
    assert response.json()["error"]["message"] == "Current password is incorrect"


def test_change_password_same_as_old_rejected(client, sent_emails):
    headers = _auth_headers(client, sent_emails)

    response = client.post(
        "/auth/change-password",
        json={"current_password": PASSWORD, "new_password": PASSWORD},
        headers=headers,
    )

    assert response.status_code == 400


def test_change_password_requires_auth(client):
    response = client.post(
        "/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "newsecret123"},
    )

    assert response.status_code == 401


# --- delete account ---


def test_delete_account_then_login_fails(client, sent_emails):
    headers = _auth_headers(client, sent_emails)

    response = client.delete("/auth/account", headers=headers)

    assert response.status_code == 200
    assert response.json() == {"message": "Account deleted."}
    assert _login(client).status_code == 401


def test_delete_account_requires_auth(client):
    response = client.delete("/auth/account")

    assert response.status_code == 401


# --- rate limiting ---


def test_login_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "RATE_LIMIT_LOGIN", "2/minute")
    limiter.reset()
    payload = {"email": "nobody@example.com", "password": "whatever123"}

    statuses = [client.post("/auth/login", json=payload).status_code for _ in range(3)]

    assert statuses[0] == 401
    assert statuses[1] == 401
    assert statuses[2] == 429

    response = client.post("/auth/login", json=payload)
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "http_error"
    assert response.json()["error"]["message"] == "Too many requests"
