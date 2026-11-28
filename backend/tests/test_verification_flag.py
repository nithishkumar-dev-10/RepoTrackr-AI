import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.main import VERIFICATION_DISABLED_WARNING, _check_verification_mode
from app.models.email_token import EmailToken
from app.models.user import User
from app.security import hash_password

PASSWORD = "secret123"
EMAIL = "user@example.com"


@pytest.fixture()
def verification_disabled(monkeypatch):
    # Explicit per-test opt-out: no test relies on a local .env being off.
    monkeypatch.setenv("REQUIRE_EMAIL_VERIFICATION", "false")
    monkeypatch.setattr(get_settings(), "REQUIRE_EMAIL_VERIFICATION", False)


def _signup(client):
    return client.post(
        "/auth/signup", json={"email": EMAIL, "password": PASSWORD}
    )


def _login(client):
    return client.post(
        "/auth/login", json={"email": EMAIL, "password": PASSWORD}
    )


def test_signup_creates_verified_user_and_sends_no_email(
    client, sent_emails, db_session, verification_disabled
):
    response = _signup(client)

    assert response.status_code == 201
    assert response.json()["verification_required"] is False
    assert "verification is disabled" in response.json()["message"]

    user = db_session.scalar(select(User).where(User.email == EMAIL))
    assert user is not None
    assert user.is_verified is True
    assert db_session.scalars(select(EmailToken)).all() == []
    assert sent_emails == []


def test_login_works_immediately_when_verification_disabled(
    client, verification_disabled
):
    assert _signup(client).status_code == 201

    response = _login(client)

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert response.json()["refresh_token"]


def test_legacy_unverified_user_can_use_api_when_disabled(
    client, db_session, verification_disabled
):
    db_session.add(
        User(
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            is_verified=False,
        )
    )
    db_session.commit()

    response = _login(client)

    assert response.status_code == 200
    body = response.json()
    assert "error" not in body
    headers = {"Authorization": f"Bearer {body['access_token']}"}
    assert client.get("/auth/me", headers=headers).status_code == 200


def test_verify_and_resend_report_disabled(
    client, sent_emails, verification_disabled
):
    verify = client.post("/auth/verify-email", json={"token": "anything"})
    resend = client.post(
        "/auth/resend-verification", json={"email": EMAIL}
    )

    assert verify.status_code == 200
    assert "verification is disabled" in verify.json()["message"]
    assert resend.status_code == 200
    assert "verification is disabled" in resend.json()["message"]
    assert sent_emails == []


def test_startup_logs_warning_when_disabled(caplog, monkeypatch, verification_disabled):
    monkeypatch.setattr(get_settings(), "APP_ENV", "dev")
    caplog.clear()

    _check_verification_mode()

    assert VERIFICATION_DISABLED_WARNING in caplog.text


def test_startup_refuses_production_when_disabled(
    monkeypatch, verification_disabled
):
    monkeypatch.setattr(get_settings(), "APP_ENV", "production")

    with pytest.raises(
        RuntimeError,
        match="REQUIRE_EMAIL_VERIFICATION=false is not allowed when APP_ENV=production",
    ):
        _check_verification_mode()
