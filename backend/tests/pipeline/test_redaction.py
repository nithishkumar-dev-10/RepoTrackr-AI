"""Tests for line-preserving secret redaction before derived text is stored."""

from pathlib import Path

from app.pipeline.chunking import build_chunks
from app.pipeline.clone import REDACTED, redact_secrets


def test_aws_access_key_is_redacted() -> None:
    text = 'AWS_KEY = "AKIA1234567890ABCDEF"\n'
    assert redact_secrets(text) == f'AWS_KEY = "{REDACTED}"\n'


def test_google_api_key_is_redacted() -> None:
    key = "AIza" + "a" * 35
    assert redact_secrets(f'key = "{key}"\n') == f'key = "{REDACTED}"\n'


def test_github_tokens_are_redacted() -> None:
    for prefix, filler in (("ghp_", "a"), ("gho_", "b"), ("github_pat_", "c")):
        token = prefix + filler * 36
        assert redact_secrets(token) == REDACTED


def test_slack_token_is_redacted() -> None:
    token = "xoxb-" + "a" * 20
    assert redact_secrets(token) == REDACTED


def test_openai_style_key_is_redacted() -> None:
    for key in ("sk-" + "a" * 30, "sk-proj-" + "b" * 30):
        assert redact_secrets(key) == REDACTED


def test_jwt_is_redacted() -> None:
    jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij"
    assert redact_secrets(f"Bearer {jwt}") == f"Bearer {REDACTED}"


def test_pem_block_is_redacted_one_line_per_line() -> None:
    text = (
        "# before\n"
        "-----BEGIN RSA PRIVATE KEY-----\n"
        "MIIEowIBAAKCAQEA\n"
        "abcdefghijklmnop\n"
        "-----END RSA PRIVATE KEY-----\n"
        "# after\n"
    )
    result = redact_secrets(text)
    assert result == (
        "# before\n"
        f"{REDACTED}\n"
        f"{REDACTED}\n"
        f"{REDACTED}\n"
        f"{REDACTED}\n"
        "# after\n"
    )
    assert len(result.splitlines()) == len(text.splitlines())


def test_secret_named_literal_assignments_are_redacted() -> None:
    lines = [
        'password = "hunter2"',
        "passwd = 'swordfish'",
        'secret = "abc123"',
        'token = "xyz789"',
        'api_key = "key123"',
        'apikey = "key456"',
        'auth = "bearer-thing"',
        'private_key = "pk123"',
        'db_password: str = "dbpass"',
        'self.api_key = "selfkey"',
    ]
    result = redact_secrets("\n".join(lines) + "\n").splitlines()
    assert result == [
        'password = "[REDACTED]"',
        "passwd = '[REDACTED]'",
        'secret = "[REDACTED]"',
        'token = "[REDACTED]"',
        'api_key = "[REDACTED]"',
        'apikey = "[REDACTED]"',
        'auth = "[REDACTED]"',
        'private_key = "[REDACTED]"',
        'db_password: str = "[REDACTED]"',
        'self.api_key = "[REDACTED]"',
    ]


def test_env_lookups_are_not_redacted() -> None:
    lines = [
        'password = os.getenv("PASSWORD")',
        'token = os.environ["TOKEN"]',
        'api_key = os.environ.get("API_KEY", "fallback")',
        'secret = config["secret"]',
    ]
    text = "\n".join(lines) + "\n"
    assert redact_secrets(text) == text


def test_placeholders_are_not_redacted() -> None:
    lines = [
        'password = ""',
        'api_key = "changeme"',
        'password = "your-key-here"',
        'token = "<your-token>"',
        'secret = "xxx"',
        'api_key = "${API_KEY}"',
        'password = os.getenv("PASSWORD", "changeme")',
        'password_policy = "strict"',
        'not_a_secret = "public"',
    ]
    text = "\n".join(lines) + "\n"
    assert redact_secrets(text) == text


def test_line_numbers_and_crlf_are_preserved() -> None:
    text = (
        "line0\r\n"
        'token = "real-secret"\r\n'
        "line2\r\n"
        'password = "another-secret"\r\n'
        "line4"
    )
    result = redact_secrets(text)
    assert result.splitlines() == [
        "line0",
        'token = "[REDACTED]"',
        "line2",
        'password = "[REDACTED]"',
        "line4",
    ]
    assert result.count("\r\n") == text.count("\r\n")
    assert not result.endswith("\n")


def test_stored_chunks_are_redacted(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    root.mkdir()
    (root / "mod.py").write_text(
        "def show():\n"
        '    api_key = "ghp_' + "a" * 36 + '"\n'
        "    return api_key\n",
        encoding="utf-8",
    )
    result = build_chunks(root, commit_sha="sha", db_path=tmp_path / "chunks.db")
    assert all("ghp_" not in chunk.text for chunk in result.chunks)
    assert any(REDACTED in chunk.text for chunk in result.chunks)

    cached = build_chunks(root, commit_sha="sha2", db_path=tmp_path / "chunks.db")
    assert all("ghp_" not in chunk.text for chunk in cached.chunks)
