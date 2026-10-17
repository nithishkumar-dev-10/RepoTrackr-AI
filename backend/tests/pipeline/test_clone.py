import subprocess
from pathlib import Path

import pytest

from app.pipeline.clone import (
    CloneConfig,
    CloneError,
    clean_repo,
    is_secret_file,
    is_skipped_dir,
    safe_clone,
)
from app.pipeline.clone import clone as clone_module

from .conftest import make_git_repo


def _config(root: Path, **overrides) -> CloneConfig:
    params = {"root": root, "max_size_mb": 200, "timeout_seconds": 30}
    params.update(overrides)
    return CloneConfig(**params)


def test_safe_clone_returns_path_and_full_sha(repo_url: str, tmp_path: Path) -> None:
    result = safe_clone(repo_url, _config(tmp_path / "clones"))

    assert result.path.is_dir()
    assert len(result.commit_sha) == 40
    assert all(ch in "0123456789abcdef" for ch in result.commit_sha)
    assert result.url == repo_url
    assert result.size_bytes > 0


def test_safe_clone_strips_secrets_and_ignored_dirs(tmp_path: Path) -> None:
    source = make_git_repo(
        tmp_path / "source",
        {
            "main.py": "x = 1\n",
            ".env": "SECRET=abc\n",
            "secret.key": "abc\n",
            "id_rsa": "private\n",
            "node_modules/pkg/index.js": "module.exports = 1\n",
            ".venv/pyvenv.cfg": "home = /x\n",
            ".env.example": "SECRET=\n",
        },
    )

    result = safe_clone(source.as_uri(), _config(tmp_path / "clones"))
    names = sorted(p.name for p in result.path.iterdir())

    assert names == [".env.example", "main.py"]
    assert set(result.skipped_paths) == {
        ".env",
        ".git",
        ".venv",
        "id_rsa",
        "node_modules",
        "secret.key",
    }
    assert ".env.example" not in result.skipped_paths
    assert not (result.path / ".git").exists()


def test_clone_records_committed_sha(tmp_path: Path) -> None:
    source = make_git_repo(tmp_path / "source")
    head = subprocess.run(
        ["git", "-C", str(source), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()

    result = safe_clone(source.as_uri(), _config(tmp_path / "clones"))
    assert result.commit_sha == head


def test_reclone_overwrites_existing_destination(repo_url: str, tmp_path: Path) -> None:
    root = tmp_path / "clones"
    first = safe_clone(repo_url, _config(root))
    stale = first.path / "stale.txt"
    stale.write_text("old", encoding="utf-8")

    second = safe_clone(repo_url, _config(root))

    assert second.path == first.path
    assert not stale.exists()


def test_empty_url_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(CloneError) as exc:
        safe_clone("   ", _config(tmp_path / "clones"))
    assert exc.value.code == "invalid_url"


def test_url_starting_with_dash_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(CloneError) as exc:
        safe_clone("--upload-pack=evil", _config(tmp_path / "clones"))
    assert exc.value.code == "invalid_url"


def test_ext_transport_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(CloneError) as exc:
        safe_clone("ext::sh -c whoami", _config(tmp_path / "clones"))
    assert exc.value.code == "invalid_url"


def test_unsupported_scheme_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(CloneError) as exc:
        safe_clone("ftp://example.com/x.git", _config(tmp_path / "clones"))
    assert exc.value.code == "invalid_url"


def test_missing_repo_raises_git_failed(tmp_path: Path) -> None:
    missing = (tmp_path / "does-not-exist").as_uri()
    with pytest.raises(CloneError) as exc:
        safe_clone(missing, _config(tmp_path / "clones"))
    assert exc.value.code == "git_failed"


def test_post_clone_size_limit_rejects(
    repo_url: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config = _config(tmp_path / "clones", max_size_mb=1)
    monkeypatch.setattr(clone_module, "_dir_size_bytes", lambda root: 10 * 1024 * 1024)

    with pytest.raises(CloneError) as exc:
        safe_clone(repo_url, config)
    assert exc.value.code == "size_exceeded"


def test_preflight_size_limit_rejects(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    config = _config(tmp_path / "clones", max_size_mb=1)
    monkeypatch.setattr(
        clone_module, "_probe_github_size_kb", lambda url: 5 * 1024
    )

    with pytest.raises(CloneError) as exc:
        safe_clone("https://github.com/psf/requests", config)
    assert exc.value.code == "size_exceeded"


def test_timeout_raises_and_cleans_up(
    repo_url: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _boom(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd="git", timeout=1)

    monkeypatch.setattr(clone_module.subprocess, "run", _boom)
    root = tmp_path / "clones"

    with pytest.raises(CloneError) as exc:
        safe_clone(repo_url, _config(root, timeout_seconds=1))
    assert exc.value.code == "timeout"


def test_missing_git_binary_raises_git_not_found(
    repo_url: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _no_git(*args, **kwargs):
        raise FileNotFoundError("git")

    monkeypatch.setattr(clone_module.subprocess, "run", _no_git)

    with pytest.raises(CloneError) as exc:
        safe_clone(repo_url, _config(tmp_path / "clones"))
    assert exc.value.code == "git_not_found"


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        (".git", True),
        ("node_modules", True),
        (".venv", True),
        ("venv", True),
        ("src", False),
    ],
)
def test_is_skipped_dir(name: str, expected: bool) -> None:
    assert is_skipped_dir(name) is expected


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        (".env", True),
        (".env.local", True),
        ("id_rsa", True),
        ("server.pem", True),
        ("private.key", True),
        ("secrets.json", True),
        (".env.example", False),
        ("main.py", False),
        ("README.md", False),
    ],
)
def test_is_secret_file(name: str, expected: bool) -> None:
    assert is_secret_file(Path(name)) is expected


def test_clean_repo_is_idempotent(tmp_path: Path) -> None:
    root = tmp_path / "tree"
    (root / "pkg").mkdir(parents=True)
    (root / "pkg" / "mod.py").write_text("x = 1\n", encoding="utf-8")
    (root / ".env").write_text("A=1\n", encoding="utf-8")
    (root / "node_modules").mkdir()
    (root / "node_modules" / "a.js").write_text("1\n", encoding="utf-8")

    first = clean_repo(root)
    second = clean_repo(root)

    assert first == [".env", "node_modules"]
    assert second == []
    assert (root / "pkg" / "mod.py").exists()


def test_slug_is_stable_and_unique_per_url(tmp_path: Path) -> None:
    a1 = clone_module._slug_for_url("https://github.com/psf/requests")
    a2 = clone_module._slug_for_url("https://github.com/psf/requests")
    b = clone_module._slug_for_url("https://github.com/psf/requests2")

    assert a1 == a2
    assert a1 != b
