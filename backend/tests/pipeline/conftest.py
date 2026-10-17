import shutil
import subprocess
from pathlib import Path

import pytest

pytestmark = pytest.mark.skipif(
    shutil.which("git") is None, reason="git executable is required for clone tests"
)


def _run_git(*args: str, cwd: Path) -> None:
    subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )


def make_git_repo(path: Path, files: dict[str, str] | None = None) -> Path:
    """Create a committed local git repo that can be cloned via file://."""
    path.mkdir(parents=True, exist_ok=True)
    _run_git("init", "-q", cwd=path)
    _run_git("config", "user.email", "test@example.com", cwd=path)
    _run_git("config", "user.name", "Test", cwd=path)

    payload = files or {"main.py": 'print("hello")\n'}
    for rel, content in payload.items():
        target = path / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    _run_git("add", "-Af", ".", cwd=path)
    _run_git("commit", "-qm", "init", cwd=path)
    return path


@pytest.fixture()
def repo_url(tmp_path: Path) -> str:
    source = make_git_repo(tmp_path / "source")
    return source.as_uri()
