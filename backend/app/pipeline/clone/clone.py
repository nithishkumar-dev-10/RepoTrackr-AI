import hashlib
import json
import os
import re
import shutil
import subprocess
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

from app.pipeline.clone.errors import CloneError
from app.pipeline.clone.filters import clean_repo
from app.pipeline.clone.models import CloneConfig, CloneResult

# Only https is allowed; the host and path are checked separately below.
ALLOWED_SCHEMES: frozenset[str] = frozenset({"https"})
GITHUB_HOST = "github.com"
GITHUB_API = "https://api.github.com/repos"
SHA_LENGTH = 40
# GitHub owner and repo names: letters, digits, dot, dash, underscore.
GITHUB_NAME_PATTERN = re.compile(r"[A-Za-z0-9_.-]+")


def safe_clone(url: str, config: CloneConfig) -> CloneResult:
    """Shallow-clone ``url`` into a sandboxed folder and strip secrets.

    This is the only entry point the application uses, so it accepts public
    GitHub HTTPS URLs only (``https://github.com/<owner>/<repo>``). Every
    other URL - local paths, other hosts, internal hosts, credentials,
    ports - is rejected before git runs.

    Never runs code from the cloned repository: hooks and template dirs are
    disabled, the shell is bypassed, and ``.git`` plus secret files are removed
    once the commit SHA has been read. Oversized or slow clones are rejected
    with a :class:`CloneError`.
    """
    clean_url = _validate_github_url(url)
    return _clone_repository(clean_url, config)


def _clone_repository(url: str, config: CloneConfig) -> CloneResult:
    """Clone a URL that was already validated by :func:`_validate_github_url`.

    Split out from :func:`safe_clone` so the URL check and the clone steps
    can be read, and tested, on their own.
    """
    dest = _destination(config.root, url)

    _reject_if_remote_too_large(url, config)

    config.root.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)

    _git_clone(url, dest, config.timeout_seconds)

    try:
        commit_sha = _read_commit_sha(dest)
    except CloneError:
        shutil.rmtree(dest, ignore_errors=True)
        raise

    skipped_paths = clean_repo(dest)
    size_bytes = _dir_size_bytes(dest)

    if size_bytes > config.max_size_bytes:
        shutil.rmtree(dest, ignore_errors=True)
        raise CloneError(
            "size_exceeded",
            f"Repository is {size_bytes} bytes, over the "
            f"{config.max_size_mb} MB limit.",
        )

    return CloneResult(
        url=url,
        path=dest,
        commit_sha=commit_sha,
        size_bytes=size_bytes,
        skipped_paths=skipped_paths,
    )


def _validate_github_url(url: str) -> str:
    """Return ``url`` unchanged when it points at a public GitHub repository.

    A valid URL is ``https://github.com/<owner>/<repo>`` (``<repo>`` may end
    in ``.git``). Everything else is rejected with a :class:`CloneError`:
    other schemes, other hosts, hosts that only look like ``github.com``,
    embedded credentials, explicit ports, query strings, fragments, URLs
    starting with ``-`` (git option injection), and URLs holding whitespace
    or control characters.
    """
    raw = url or ""
    if not raw.strip():
        raise CloneError("invalid_url", "Repository URL must not be empty.")
    if raw.startswith("-"):
        raise CloneError("invalid_url", "Repository URL must not start with '-'.")
    if "::" in raw:
        raise CloneError("invalid_url", "Unsupported git transport in URL.")
    if _has_unsafe_chars(raw):
        raise CloneError(
            "invalid_url",
            "Repository URL must not contain whitespace or control characters.",
        )

    try:
        parsed = urlparse(raw)
        port = parsed.port
        host = parsed.hostname or ""
    except ValueError:
        raise CloneError("invalid_url", "Repository URL is not a valid URL.") from None

    scheme = (parsed.scheme or "").lower()
    if scheme not in ALLOWED_SCHEMES:
        raise CloneError(
            "invalid_url",
            f"Unsupported URL scheme '{scheme}'. Allowed: https.",
        )
    if parsed.username or parsed.password or "@" in parsed.netloc:
        raise CloneError("invalid_url", "Repository URL must not contain credentials.")
    if port is not None:
        raise CloneError("invalid_url", "Repository URL must not specify a port.")
    if parsed.query or parsed.fragment:
        raise CloneError(
            "invalid_url",
            "Repository URL must not contain a query string or fragment.",
        )
    if host != GITHUB_HOST:
        raise CloneError(
            "invalid_url",
            f"Only public {GITHUB_HOST} repositories are allowed (host '{host}').",
        )

    _github_owner_and_repo(parsed.path)
    return raw


def _github_owner_and_repo(path: str) -> tuple[str, str]:
    """Check the path is ``/<owner>/<repo>`` and return both names."""
    parts = [part for part in path.split("/") if part]
    if len(parts) != 2:
        raise CloneError(
            "invalid_url",
            f"Repository URL must look like https://{GITHUB_HOST}/owner/repo.",
        )

    owner, repo = parts
    if repo.endswith(".git"):
        repo = repo[: -len(".git")]

    for name in (owner, repo):
        if name in {".", ".."} or not GITHUB_NAME_PATTERN.fullmatch(name):
            raise CloneError(
                "invalid_url",
                f"Repository URL must look like https://{GITHUB_HOST}/owner/repo.",
            )
    return owner, repo


def _has_unsafe_chars(url: str) -> bool:
    """True if the URL holds whitespace or control characters."""
    return any(ch.isspace() or ord(ch) < 0x20 or ord(ch) == 0x7F for ch in url)


def _destination(root: Path, url: str) -> Path:
    return root / _slug_for_url(url)


def _slug_for_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    if path.endswith(".git"):
        path = path[: -len(".git")]
    base = path.strip("/").replace("/", "__") or "repo"

    safe = "".join(ch if (ch.isalnum() or ch in "._-") else "_" for ch in base)
    safe = safe.strip("._-") or "repo"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return f"{safe[:80]}-{digest}"


def _reject_if_remote_too_large(url: str, config: CloneConfig) -> None:
    size_kb = _probe_github_size_kb(url)
    if size_kb is None:
        return
    if size_kb * 1024 > config.max_size_bytes:
        raise CloneError(
            "size_exceeded",
            f"Repository is reported as {size_kb / 1024:.1f} MB, over the "
            f"{config.max_size_mb} MB limit.",
        )


def _probe_github_size_kb(url: str) -> int | None:
    """Best-effort GitHub size check; never fails the clone if unavailable."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != GITHUB_HOST:
        return None

    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) != 2:
        return None
    owner, name = parts
    if name.endswith(".git"):
        name = name[: -len(".git")]

    api_url = f"{GITHUB_API}/{owner}/{name}"
    request = urllib.request.Request(
        api_url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "RepoTrackr-AI"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return None

    size = payload.get("size")
    if isinstance(size, int):
        return size
    return None


def _git_env() -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        {
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_ASKPASS": "echo",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
        }
    )
    return env


def _git_clone(url: str, dest: Path, timeout_seconds: int) -> None:
    template = dest.parent / f".empty-template-{dest.name}"
    command = [
        "git",
        "clone",
        "--depth",
        "1",
        "--single-branch",
        "--no-tags",
        f"--config=core.hooksPath={os.devnull}",
        f"--template={template}",
        "--",
        url,
        str(dest),
    ]
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            env=_git_env(),
            check=False,
        )
    except FileNotFoundError as exc:
        raise CloneError("git_not_found", "The 'git' executable was not found.") from exc
    except subprocess.TimeoutExpired as exc:
        shutil.rmtree(dest, ignore_errors=True)
        raise CloneError(
            "timeout", f"Clone exceeded the {timeout_seconds}s time limit."
        ) from exc

    if completed.returncode != 0:
        shutil.rmtree(dest, ignore_errors=True)
        detail = (completed.stderr or completed.stdout or "").strip().splitlines()
        message = detail[-1] if detail else "git clone failed."
        raise CloneError("git_failed", message)


def _read_commit_sha(repo_path: Path) -> str:
    try:
        completed = subprocess.run(
            ["git", "-C", str(repo_path), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=30,
            env=_git_env(),
            check=False,
        )
    except FileNotFoundError as exc:
        raise CloneError("git_not_found", "The 'git' executable was not found.") from exc
    except subprocess.TimeoutExpired as exc:
        raise CloneError("timeout", "Reading the commit SHA timed out.") from exc

    sha = (completed.stdout or "").strip()
    if completed.returncode != 0 or len(sha) != SHA_LENGTH:
        raise CloneError("empty_repo", "Repository has no readable commit (empty?).")
    return sha


def _dir_size_bytes(root: Path) -> int:
    total = 0
    for current, _dir_names, file_names in os.walk(root):
        for file_name in file_names:
            try:
                total += (Path(current) / file_name).stat().st_size
            except OSError:
                continue
    return total
