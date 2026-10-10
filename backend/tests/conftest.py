import os
import tempfile

_DB_FD, _DB_PATH = tempfile.mkstemp(suffix=".db")
os.close(_DB_FD)

os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH}"
os.environ["FRONTEND_URL"] = "http://testserver"
os.environ["SMTP_HOST"] = ""
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "15"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "7"
os.environ["VERIFY_TOKEN_EXPIRE_HOURS"] = "24"
os.environ["RESET_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["RATE_LIMIT_LOGIN"] = "100000/minute"
os.environ["RATE_LIMIT_SIGNUP"] = "100000/minute"
os.environ["RATE_LIMIT_FORGOT_PASSWORD"] = "100000/minute"
os.environ["RATE_LIMIT_RESEND_VERIFICATION"] = "100000/minute"

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, SessionLocal, engine
from app.main import app as fastapi_app


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    os.remove(_DB_PATH)


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
