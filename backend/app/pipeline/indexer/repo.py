import logging
import os
from pathlib import Path

from app.pipeline.indexer.models import FileIndex, RepoIndex
from app.pipeline.indexer.parser import parse_file

logger = logging.getLogger(__name__)

# Folders we never index: dependencies, virtualenvs, VCS metadata, caches.
IGNORED_DIRS = {"node_modules", "venv", ".venv", ".git", "__pycache__"}

# Secret-looking files we never read, even if they somehow end in .py.
IGNORED_FILE_PREFIXES = (".env",)  # .env, .env.local, .env.production, ...
IGNORED_FILE_SUFFIXES = (".key", ".pem")


def _is_ignored(path: Path, root: Path) -> bool:
    """True when the file sits in an ignored folder or looks like a secret file."""
    rel = path.relative_to(root)
    # parts[:-1] are the folder names, parts[-1] is the file name
    if any(part in IGNORED_DIRS for part in rel.parts[:-1]):
        return True
    name = rel.name
    if name.startswith(IGNORED_FILE_PREFIXES):
        return True
    if name.endswith(IGNORED_FILE_SUFFIXES):
        return True
    return False


def index_repo(folder: str | Path) -> RepoIndex:
    """Walk a folder and build a RepoIndex for every .py file inside it.

    Ignored folders are pruned from the walk, so we never even look inside
    them. A file that fails to parse is stored with its parse_error; the
    walk continues past it.
    """
    root = Path(folder)
    paths: list[Path] = []

    for dirpath, dirnames, filenames in os.walk(root):
        # Prune in place: os.walk will not descend into the removed folders.
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]
        for name in filenames:
            if not name.endswith(".py"):
                continue
            path = Path(dirpath) / name
            if _is_ignored(path, root):  # filename rules like .env.py / x.key
                continue
            paths.append(path)

    files: list[FileIndex] = []
    for path in sorted(paths):
        try:
            files.append(parse_file(path, base_dir=root))
        except OSError as exc:  # parse_file catches read errors too; this is a guard
            logger.warning("Could not index %s: %s", path, exc)
            rel = path.relative_to(root).as_posix()
            files.append(FileIndex(file=rel, parse_error=f"ReadError: {exc}"))

    # Flat symbol list: what the retrieval layer will search over later.
    symbols = [symbol for file_index in files for symbol in file_index.symbols]
    return RepoIndex(root=root.as_posix(), files=files, symbols=symbols)
