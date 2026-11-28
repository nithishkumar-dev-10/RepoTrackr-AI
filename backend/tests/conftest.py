import os
import shutil
import tempfile
from pathlib import Path

# Test-only environment. Pydantic Settings reads os.environ before any dotenv
# file, and the env_file below is deliberately non-existent, so a developer's
# backend/.env can never change what the suite sees.
_DB_FD, _DB_PATH = tempfile.mkstemp(prefix="repotrackr-test-", suffix=".db")
os.close(_DB_FD)
_TEST_ENV_DIR = Path(tempfile.mkdtemp(prefix="repotrackr-test-env-"))
_CLONE_ROOT = _TEST_ENV_DIR / "clones"

_TEST_ENVIRONMENT = {
    "APP_ENV": "test",
    # `ENV` is Literal["dev", "prod"]; keep it dev for schema validation.
    "ENV": "dev",
    "REQUIRE_EMAIL_VERIFICATION": "true",
    "SECRET_KEY": "test-secret-key-not-for-production",
    "DATABASE_URL": f"sqlite:///{_DB_PATH}",
    "FRONTEND_URL": "http://testserver",
    "CORS_ORIGINS": "http://testserver",
    # No SMTP server and an invalid address: emails stay captured by fixtures.
    "SMTP_HOST": "",
    "SMTP_PORT": "587",
    "SMTP_USER": "",
    "SMTP_PASSWORD": "",
    "EMAIL_FROM": "test@example.invalid",
    "ACCESS_TOKEN_EXPIRE_MINUTES": "15",
    "REFRESH_TOKEN_EXPIRE_DAYS": "7",
    "VERIFY_TOKEN_EXPIRE_HOURS": "24",
    "RESET_TOKEN_EXPIRE_MINUTES": "30",
    "RATE_LIMIT_LOGIN": "100000/minute",
    "RATE_LIMIT_SIGNUP": "100000/minute",
    "RATE_LIMIT_FORGOT_PASSWORD": "100000/minute",
    "RATE_LIMIT_RESEND_VERIFICATION": "100000/minute",
    "RATE_LIMIT_REFRESH": "100000/minute",
    "RATE_LIMIT_VERIFY_EMAIL": "100000/minute",
    "RATE_LIMIT_RESET_PASSWORD": "100000/minute",
    "RATE_LIMIT_CHANGE_PASSWORD": "100000/minute",
    "RATE_LIMIT_LOGOUT": "100000/minute",
    "CLONE_ROOT": str(_CLONE_ROOT),
}
os.environ.update(_TEST_ENVIRONMENT)

import pytest
from fastapi.testclient import TestClient

# Import config before any app module so Settings.model_config is detached from
# backend/.env before get_settings() is first called.
from app.core import config as app_config

app_config.Settings.model_config["env_file"] = _TEST_ENV_DIR / "missing.env"

from app.core.database import Base, SessionLocal, engine
from app.main import app as fastapi_app


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    os.remove(_DB_PATH)
    shutil.rmtree(_TEST_ENV_DIR, ignore_errors=True)


@pytest.fixture(autouse=True)
def _clean_tables():
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture()
def client() -> TestClient:
    return TestClient(fastapi_app)


@pytest.fixture()
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def sent_emails(monkeypatch):
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "app.features.auth.router.send_verification_email",
        lambda to, raw_token: sent.append((to, raw_token)),
    )
    return sent


@pytest.fixture()
def sent_reset_emails(monkeypatch):
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "app.features.auth.router.send_reset_email",
        lambda to, raw_token: sent.append((to, raw_token)),
    )
    return sent
