import logging
import os
import shutil
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.core.config import get_settings
from app.pipeline.clone.models import CloneConfig, CloneResult

logger = logging.getLogger("app")

BACKEND_DIR = Path(__file__).resolve().parents[3]


def configured_clone_root() -> Path:
    """Resolve ``CLONE_ROOT`` to an absolute path (backend-relative if relative)."""
    raw = Path(get_settings().CLONE_ROOT)
    if not raw.is_absolute():
        raw = BACKEND_DIR / raw
    return raw.resolve()


def _resolve_root(root: Path | None) -> Path:
    if root is None:
        return configured_clone_root()
    candidate = Path(root)
    if not candidate.is_absolute():
        candidate = BACKEND_DIR / candidate
    return candidate.resolve()


def _make_writable(target: str) -> None:
    if os.path.islink(target):
        return
    try:
        os.chmod(target, 0o700)
    except OSError:
        pass


def _handle_remove_error(func, target, _exc) -> None:
    _make_writable(os.path.dirname(target))
    _make_writable(target)
    func(target)


def _handle_remove_error_legacy(func, target, _exc_info) -> None:
    _make_writable(os.path.dirname(target))
    _make_writable(target)
    func(target)


def _force_rmtree(target: Path) -> None:
    # Make the whole tree writable first so read-only files (git objects) and
    # read-only directories can be removed. Symlinks are skipped and handled by
    # rmtree as links, so their targets are never touched.
    for current, dir_names, file_names in os.walk(target, topdown=False):
        for name in [*file_names, *dir_names]:
            _make_writable(os.path.join(current, name))

    if sys.version_info >= (3, 12):
        shutil.rmtree(target, onexc=_handle_remove_error)
    else:  # pragma: no cover - only for Python < 3.12
        shutil.rmtree(target, onerror=_handle_remove_error_legacy)


def remove_clone(path: Path, root: Path | None = None) -> bool:
    """Delete a clone folder that lives inside the clone root.

    Refuses the root itself, empty paths, and any path that resolves outside
    the root (``..`` tricks included). Symlinks are unlinked, never traversed,
    so their targets survive. Read-only files (git objects) are made writable
    before removal. A missing folder is not an error and returns ``False``.
    """
    if path is None or str(path).strip() == "":
        raise ValueError("clone path must not be empty")

    target = Path(path)
    root_resolved = _resolve_root(root)
    resolved = target.resolve()

    if resolved == root_resolved:
        raise ValueError("refusing to delete the clone root itself")
    if root_resolved not in resolved.parents:
        raise ValueError(f"refusing to delete path outside the clone root: {target}")

    if target.is_symlink():
        target.unlink()
        return True
    if not resolved.exists():
        return False

    _force_rmtree(target)
    return True


@contextmanager
def clone_workspace(
    url: str, config: CloneConfig, root: Path | None = None
) -> Iterator[CloneResult]:
    """Clone into a scratch folder and always delete it on the way out.

    Yields the :class:`CloneResult`; its ``path`` is the clone folder. The
    folder is removed in ``finally`` so success, exceptions, timeouts, and
    failed clones all leave nothing behind.
    """
    from app.pipeline.clone.clone import safe_clone

    result = safe_clone(url, config)
    try:
        yield result
    finally:
        remove_clone(result.path, root=root if root is not None else config.root)


def sweep_stale_clones(max_age_seconds: int, root: Path | None = None) -> int:
    """Delete direct child folders of the clone root older than ``max_age_seconds``.

    Age is measured from the folder mtime. Returns the number removed. A single
    failure is logged and the sweep continues. Nothing outside the root is
    touched.
    """
    root_path = _resolve_root(root)
    if not root_path.is_dir():
        return 0

    now = time.time()
    removed = 0
    for child in root_path.iterdir():
        if child.is_symlink() or not child.is_dir():
            continue
        try:
            age = now - child.stat().st_mtime
            if age <= max_age_seconds:
                continue
            if remove_clone(child, root=root_path):
                removed += 1
        except (OSError, ValueError) as exc:
            logger.warning("Stale clone sweep skipped %s: %s", child, exc)
            continue
    return removed
