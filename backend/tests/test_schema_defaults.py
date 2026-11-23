"""Regression tests: ORM columns must carry the same DB defaults as migration 9dbee76d."""

from sqlalchemy import text

from app.core.database import engine

_NOW = "2026-01-01 00:00:00"
_USER_INSERT = (
    "INSERT INTO users (email, password_hash, created_at) "
    "VALUES (:email, 'not-a-real-hash', :created_at)"
)


def test_users_is_verified_has_database_default() -> None:
    """A raw INSERT that omits is_verified must still produce a False value."""
    email = "db-default-user@example.com"

    with engine.begin() as conn:
        conn.execute(
            text(_USER_INSERT),
            {"email": email, "created_at": _NOW},
        )
        stored = conn.execute(
            text("SELECT is_verified FROM users WHERE email = :email"),
            {"email": email},
        ).scalar_one()

    assert bool(stored) is False


def test_repos_status_has_database_default() -> None:
    """A raw INSERT that omits status must still produce the 'added' value."""
    email = "db-default-repo-owner@example.com"

    with engine.begin() as conn:
        conn.execute(
            text(_USER_INSERT),
            {"email": email, "created_at": _NOW},
        )
        user_id = conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email},
        ).scalar_one()
        conn.execute(
            text(
                "INSERT INTO repos (user_id, url, owner, name, created_at) "
                "VALUES (:user_id, :url, 'owner', 'name', :created_at)"
            ),
            {
                "user_id": user_id,
                "url": "https://github.com/owner/name",
                "created_at": _NOW,
            },
        )
        stored = conn.execute(
            text("SELECT status FROM repos WHERE user_id = :user_id"),
            {"user_id": user_id},
        ).scalar_one()

    assert stored == "added"
