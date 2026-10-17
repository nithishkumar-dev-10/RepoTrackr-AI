import os
import shutil
from pathlib import Path

SKIP_DIR_NAMES: frozenset[str] = frozenset(
    {
        ".git",
        "node_modules",
        "venv",
        ".venv",
        "env",
        ".env",
        "__pycache__",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".tox",
        ".next",
        ".cache",
    }
)

SECRET_FILE_NAMES: frozenset[str] = frozenset(
    {
        ".env",
        ".env.local",
        ".env.development",
        ".env.production",
        ".env.test",
        "id_rsa",
        "id_dsa",
        "id_ecdsa",
        "id_ed25519",
        "credentials",
        "credentials.json",
        "secrets.json",
        "secrets.yml",
        "secrets.yaml",
    }
)

# Template env files carry no secrets and stay in place.
KEPT_ENV_TEMPLATES: frozenset[str] = frozenset(
    {".env.example", ".env.sample", ".env.template"}
)

SECRET_FILE_SUFFIXES: frozenset[str] = frozenset(
    {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore", ".ppk"}
)


def is_skipped_dir(name: str) -> bool:
    """True if a directory name must never be descended into."""
    return name in SKIP_DIR_NAMES


def is_secret_file(path: Path) -> bool:
    """True if a file is an env/secret/key file that must not be indexed."""
    name = path.name.lower()
    if name in KEPT_ENV_TEMPLATES:
        return False
    if name in SECRET_FILE_NAMES:
        return True
    if name.startswith(".env."):
        return True
    if path.suffix.lower() in SECRET_FILE_SUFFIXES:
        return True
    if name.startswith("secret") and path.suffix.lower() in {".json", ".yml", ".yaml"}:
        return True
    return False


def clean_repo(root: Path) -> list[str]:
    """Delete ignored dirs and secret files under ``root``.

    Returns the repo-relative paths that were removed, sorted, so callers can
    report what was stripped from the sandbox.
    """
    removed: list[str] = []

    for current, dir_names, file_names in os.walk(root, topdown=True):
        current_path = Path(current)

        for dir_name in list(dir_names):
            if is_skipped_dir(dir_name):
                _remove(root, current_path / dir_name, removed)
                dir_names.remove(dir_name)

        for file_name in file_names:
            candidate = current_path / file_name
            if is_secret_file(candidate):
                _remove(root, candidate, removed)

    removed.sort()
    return removed


def _remove(root: Path, target: Path, removed: list[str]) -> None:
    if target.is_dir() and not target.is_symlink():
        shutil.rmtree(target, ignore_errors=True)
    else:
        try:
            target.unlink()
        except OSError:
            return
    try:
        removed.append(str(target.relative_to(root)))
    except ValueError:
        removed.append(str(target))
