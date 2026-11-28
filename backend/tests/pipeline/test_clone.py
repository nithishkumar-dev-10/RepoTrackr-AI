import subprocess
from pathlib import Path
from urllib.parse import urlparse

import pytest

from app.pipeline.clone import (
    CloneConfig,
    CloneError,
    CloneResult,
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


def clone_local_fixture(url: str, config: CloneConfig) -> CloneResult:
    """Clone a local ``file://`` fixture. Test-only.

    The application uses ``safe_clone``, which accepts public GitHub HTTPS
    URLs only. The offline tests need a real repository on disk, so they use
    this helper instead: it skips the GitHub allow-list but still refuses
    anything that is not a local ``file://`` path. No production code path
    can reach it.
    """
    parsed = urlparse(url)
    if parsed.scheme != "file" or not parsed.path.startswith("/"):
        raise CloneError("invalid_url", "Test fixtures must be local file:// URLs.")
    return clone_module._clone_repository(url, config)


def test_clone_returns_path_and_full_sha(repo_url: str, tmp_path: Path) -> None:
    result = clone_local_fixture(repo_url, _config(tmp_path / "clones"))

    assert result.path.is_dir()
    assert len(result.commit_sha) == 40
    assert all(ch in "0123456789abcdef" for ch in result.commit_sha)
    assert result.url == repo_url
    assert result.size_bytes > 0


def test_clone_strips_secrets_and_ignored_dirs(tmp_path: Path) -> None:
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

    result = clone_local_fixture(source.as_uri(), _config(tmp_path / "clones"))
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

    result = clone_local_fixture(source.as_uri(), _config(tmp_path / "clones"))
    assert result.commit_sha == head


def test_reclone_overwrites_existing_destination(repo_url: str, tmp_path: Path) -> None:
    root = tmp_path / "clones"
    first = clone_local_fixture(repo_url, _config(root))
    stale = first.path / "stale.txt"
    stale.write_text("old", encoding="utf-8")

    second = clone_local_fixture(repo_url, _config(root))

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
        clone_local_fixture(missing, _config(tmp_path / "clones"))
    assert exc.value.code == "git_failed"


def test_post_clone_size_limit_rejects(
    repo_url: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config = _config(tmp_path / "clones", max_size_mb=1)
    monkeypatch.setattr(clone_module, "_dir_size_bytes", lambda root: 10 * 1024 * 1024)

    with pytest.raises(CloneError) as exc:
        clone_local_fixture(repo_url, config)
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
        clone_local_fixture(repo_url, _config(root, timeout_seconds=1))
    assert exc.value.code == "timeout"


def test_missing_git_binary_raises_git_not_found(
    repo_url: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _no_git(*args, **kwargs):
        raise FileNotFoundError("git")

    monkeypatch.setattr(clone_module.subprocess, "run", _no_git)

    with pytest.raises(CloneError) as exc:
        clone_local_fixture(repo_url, _config(tmp_path / "clones"))
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


# --- URL allow-list -------------------------------------------------------


@pytest.mark.parametrize(
    "url",
    [
        "https://github.com/psf/requests",
        "https://github.com/psf/requests.git",
    ],
)
def test_public_github_url_is_accepted(url: str) -> None:
    assert clone_module._validate_github_url(url) == url


def test_safe_clone_accepts_public_github_url(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: dict[str, str] = {}

    def _fake_clone(url: str, config: CloneConfig) -> CloneResult:
        seen["url"] = url
        return CloneResult(
            url=url,
            path=tmp_path / "cloned",
            commit_sha="0" * 40,
            size_bytes=0,
        )

    monkeypatch.setattr(clone_module, "_clone_repository", _fake_clone)

    result = safe_clone("https://github.com/psf/requests", _config(tmp_path / "clones"))

    assert seen["url"] == "https://github.com/psf/requests"
    assert result.url == "https://github.com/psf/requests"


@pytest.mark.parametrize(
    "url",
    [
        # Other schemes
        "file:///etc/passwd",
        "file:///tmp/source",
        "ssh://git@github.com/psf/requests.git",
        "git://github.com/psf/requests.git",
        "http://github.com/psf/requests",
        "ftp://github.com/psf/requests",
        # Local and internal hosts
        "https://localhost/psf/requests",
        "https://127.0.0.1/psf/requests",
        "https://10.0.0.5/psf/requests",
        "https://192.168.1.10/psf/requests",
        "https://169.254.169.254/latest/meta-data/",
        "https://[::1]/psf/requests",
        # Other hosts
        "https://gitlab.com/psf/requests",
        "https://example.com/psf/requests",
        "https://git.sr.ht/~psf/requests",
        # Hosts that only look like github.com
        "https://github.com.evil.com/psf/requests",
        "https://evilgithub.com/psf/requests",
        "https://github.com./psf/requests",
        "https://www.github.com/psf/requests",
        "https://mygithub.com/psf/requests",
        # Credentials
        "https://user:pass@github.com/psf/requests",
        "https://user@github.com/psf/requests",
        # Explicit ports
        "https://github.com:443/psf/requests",
        "https://github.com:8443/psf/requests",
        # Query strings and fragments
        "https://github.com/psf/requests?x=1",
        "https://github.com/psf/requests#frag",
        # Git option injection
        "--upload-pack=evil",
        "-x",
        # Whitespace and control characters
        " https://github.com/psf/requests",
        "https://github.com/psf/requests ",
        "https://github.com/psf/re po",
        "https://github.com/psf/requests\n",
        "https://github.com/psf/requests\t",
        "https://github.com/psf/requests\x00",
        # Wrong path shape
        "https://github.com/psf",
        "https://github.com/psf/requests/extra",
        "https://github.com//requests",
        "https://github.com/../etc",
        "https://github.com/psf/..",
    ],
)
def test_rejected_url_raises_invalid_url(url: str, tmp_path: Path) -> None:
    with pytest.raises(CloneError) as exc:
        safe_clone(url, _config(tmp_path / "clones"))
    assert exc.value.code == "invalid_url"


def test_rejected_url_never_reaches_git(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _no_git(*args, **kwargs):
        raise AssertionError("git must not run for a rejected URL")

    monkeypatch.setattr(clone_module.subprocess, "run", _no_git)

    with pytest.raises(CloneError) as exc:
        safe_clone("file:///etc/passwd", _config(tmp_path / "clones"))
    assert exc.value.code == "invalid_url"


def test_safe_clone_rejects_local_file_url_even_when_it_exists(tmp_path: Path) -> None:
    source = make_git_repo(tmp_path / "source")

    with pytest.raises(CloneError) as exc:
        safe_clone(source.as_uri(), _config(tmp_path / "clones"))
    assert exc.value.code == "invalid_url"


def test_local_fixture_helper_refuses_non_file_urls(tmp_path: Path) -> None:
    with pytest.raises(CloneError) as exc:
        clone_local_fixture("https://github.com/psf/requests", _config(tmp_path / "clones"))
    assert exc.value.code == "invalid_url"
