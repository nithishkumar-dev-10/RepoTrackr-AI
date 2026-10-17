import os
import shutil
import subprocess
import time
from pathlib import Path

import pytest

from app.pipeline.clone import cleanup as cleanup_module
from app.pipeline.clone import clone as clone_module
from app.pipeline.clone.cleanup import (
    clone_workspace,
    remove_clone,
    sweep_stale_clones,
)
from app.pipeline.clone.errors import CloneError
from app.pipeline.clone.models import CloneConfig

from .conftest import make_git_repo

requires_git = pytest.mark.skipif(
    shutil.which("git") is None, reason="git executable is required"
)


def _config(root: Path, **overrides) -> CloneConfig:
    params = {"root": root, "max_size_mb": 200, "timeout_seconds": 30}
    params.update(overrides)
    return CloneConfig(**params)


def _children(root: Path) -> list[Path]:
    return list(root.iterdir()) if root.exists() else []


def test_remove_clone_deletes_readonly_nested(tmp_path: Path) -> None:
    root = tmp_path / "clones"
    target = root / "repo-abc"
    nested = target / "sub" / "deeper"
    nested.mkdir(parents=True)
    readonly_file = nested / "object"
    readonly_file.write_text("git object", encoding="utf-8")
    os.chmod(readonly_file, 0o444)
    os.chmod(nested, 0o555)

    assert remove_clone(target, root=root) is True
    assert not target.exists()


def test_remove_clone_refuses_root(tmp_path: Path) -> None:
    root = tmp_path / "clones"
    root.mkdir()
    with pytest.raises(ValueError):
        remove_clone(root, root=root)


def test_remove_clone_refuses_outside_path(tmp_path: Path) -> None:
    root = tmp_path / "clones"
    root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    with pytest.raises(ValueError):
        remove_clone(outside, root=root)
    assert outside.exists()


def test_remove_clone_refuses_dotdot_traversal(tmp_path: Path) -> None:
    root = tmp_path / "clones"
    root.mkdir()
    (root / "child").mkdir()
    escape = root / "child" / ".." / ".." / "escape"
    with pytest.raises(ValueError):
        remove_clone(escape, root=root)


@pytest.mark.parametrize("bad", [None, ""])
def test_remove_clone_refuses_empty(tmp_path: Path, bad: object) -> None:
    root = tmp_path / "clones"
    root.mkdir()
    with pytest.raises(ValueError):
        remove_clone(bad, root=root)  # type: ignore[arg-type]


def test_remove_clone_symlink_target_survives(tmp_path: Path) -> None:
    root = tmp_path / "clones"
    clone = root / "repo-abc"
    clone.mkdir(parents=True)
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "keep.txt").write_text("keep", encoding="utf-8")
    (clone / "link").symlink_to(outside, target_is_directory=True)

    assert remove_clone(clone, root=root) is True
    assert not clone.exists()
    assert outside.exists()
    assert (outside / "keep.txt").read_text(encoding="utf-8") == "keep"


def test_remove_clone_missing_folder_returns_false(tmp_path: Path) -> None:
    root = tmp_path / "clones"
    root.mkdir()
    assert remove_clone(root / "ghost", root=root) is False


@requires_git
def test_clone_workspace_deletes_on_success(tmp_path: Path) -> None:
    source = make_git_repo(tmp_path / "source")
    config = _config(tmp_path / "clones")

    with clone_workspace(source.as_uri(), config) as result:
        path = result.path
        assert path.is_dir()

    assert not path.exists()


@requires_git
def test_clone_workspace_deletes_on_exception(tmp_path: Path) -> None:
    source = make_git_repo(tmp_path / "source")
    config = _config(tmp_path / "clones")

    with pytest.raises(RuntimeError):
        with clone_workspace(source.as_uri(), config) as result:
            path = result.path
            raise RuntimeError("boom")

    assert not path.exists()


def test_sweep_removes_old_keeps_fresh(tmp_path: Path) -> None:
    root = tmp_path / "clones"
    old = root / "old"
    fresh = root / "fresh"
    old.mkdir(parents=True)
    fresh.mkdir()
    past = time.time() - 10_000
    os.utime(old, (past, past))

    removed = sweep_stale_clones(3600, root=root)

    assert removed == 1
    assert not old.exists()
    assert fresh.exists()


def test_sweep_ignores_files(tmp_path: Path) -> None:
    root = tmp_path / "clones"
    root.mkdir()
    stale_file = root / "notes.txt"
    stale_file.write_text("x", encoding="utf-8")
    past = time.time() - 10_000
    os.utime(stale_file, (past, past))

    assert sweep_stale_clones(3600, root=root) == 0
    assert stale_file.exists()


def test_sweep_continues_past_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = tmp_path / "clones"
    bad = root / "bad"
    good = root / "good"
    bad.mkdir(parents=True)
    good.mkdir()
    past = time.time() - 10_000
    os.utime(bad, (past, past))
    os.utime(good, (past, past))

    real = cleanup_module.remove_clone

    def flaky(path: Path, root: Path | None = None) -> bool:
        if Path(path).name == "bad":
            raise OSError("boom")
        return real(path, root=root)

    monkeypatch.setattr(cleanup_module, "remove_clone", flaky)

    removed = sweep_stale_clones(3600, root=root)

    assert removed == 1
    assert bad.exists()
    assert not good.exists()


@requires_git
def test_failed_clone_leaves_no_folder(tmp_path: Path) -> None:
    config = _config(tmp_path / "clones")
    missing = (tmp_path / "does-not-exist").as_uri()

    with pytest.raises(CloneError) as exc:
        clone_module.safe_clone(missing, config)

    assert exc.value.code == "git_failed"
    assert _children(config.root) == []


@requires_git
def test_timed_out_clone_leaves_no_folder(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = make_git_repo(tmp_path / "source")
    config = _config(tmp_path / "clones", timeout_seconds=1)

    def _boom(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd="git", timeout=1)

    monkeypatch.setattr(clone_module.subprocess, "run", _boom)

    with pytest.raises(CloneError) as exc:
        clone_module.safe_clone(source.as_uri(), config)

    assert exc.value.code == "timeout"
    assert _children(config.root) == []


@requires_git
def test_oversized_clone_leaves_no_folder(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = make_git_repo(tmp_path / "source")
    config = _config(tmp_path / "clones", max_size_mb=1)
    monkeypatch.setattr(
        clone_module, "_dir_size_bytes", lambda root: 10 * 1024 * 1024
    )

    with pytest.raises(CloneError) as exc:
        clone_module.safe_clone(source.as_uri(), config)

    assert exc.value.code == "size_exceeded"
    assert _children(config.root) == []
