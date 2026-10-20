"""Tests for the chunking layer: chunk shapes, tokens, SQLite storage, file-hash cache."""

import sqlite3
from pathlib import Path

import tiktoken

import app.pipeline.chunking.builder as builder_module
from app.pipeline.chunking import Chunk, ChunkSet, build_chunks


def _write_repo(root: Path, files: dict[str, str]) -> Path:
    """Write a small repo tree for the tests."""
    for rel, content in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return root


def _sample_repo() -> dict[str, str]:
    return {
        "mod.py": (
            "def top():\n"
            "    return 1\n"
            "\n"
            "class Dog:\n"
            '    """A dog."""\n'
            "    def bark(self):\n"
            "        return 'woof'\n"
        )
    }


def _by_name(chunks: list[Chunk], name: str) -> Chunk:
    return next(c for c in chunks if c.name == name)


# ------------------------------------------------------------------ chunking

def test_function_class_method_each_produce_one_chunk(tmp_path: Path):
    root = _write_repo(tmp_path / "repo", _sample_repo())
    result = build_chunks(root, commit_sha="c1", db_path=tmp_path / "chunks.db")

    assert {(c.kind, c.name) for c in result.chunks} == {
        ("function", "top"),
        ("class", "Dog"),
        ("method", "bark"),
    }


def test_chunk_text_contains_signature_docstring_body(tmp_path: Path):
    root = _write_repo(tmp_path / "repo", _sample_repo())
    result = build_chunks(root, commit_sha="c1", db_path=tmp_path / "chunks.db")

    fn = _by_name(result.chunks, "top")
    assert fn.text == "# mod.py:1\ndef top():\n    return 1"
    method = _by_name(result.chunks, "bark")
    assert "def bark(self):" in method.text
    assert "'woof'" in method.text  # body is included
    cls = _by_name(result.chunks, "Dog")
    assert '"""A dog."""' in cls.text  # docstring is included


def test_exact_line_numbers(tmp_path: Path):
    root = _write_repo(tmp_path / "repo", _sample_repo())
    result = build_chunks(root, commit_sha="c1", db_path=tmp_path / "chunks.db")

    assert (_by_name(result.chunks, "top").line_start, _by_name(result.chunks, "top").line_end) == (1, 2)
    assert (_by_name(result.chunks, "Dog").line_start, _by_name(result.chunks, "Dog").line_end) == (4, 7)
    assert (_by_name(result.chunks, "bark").line_start, _by_name(result.chunks, "bark").line_end) == (6, 7)


def test_class_chunk_lists_methods_but_excludes_bodies(tmp_path: Path):
    root = _write_repo(tmp_path / "repo", _sample_repo())
    result = build_chunks(root, commit_sha="c1", db_path=tmp_path / "chunks.db")

    cls = _by_name(result.chunks, "Dog")
    assert "class Dog:" in cls.text
    assert "methods: bark" in cls.text
    assert "woof" not in cls.text  # method body lives only in the method chunk


# ------------------------------------------------------------------- tokens

def test_token_count_matches_tiktoken(tmp_path: Path):
    root = _write_repo(tmp_path / "repo", _sample_repo())
    result = build_chunks(root, commit_sha="c1", db_path=tmp_path / "chunks.db")

    enc = tiktoken.get_encoding("cl100k_base")
    for chunk in result.chunks:
        assert chunk.token_count > 0
        assert chunk.token_count == len(enc.encode(chunk.text))


def test_too_large_flag_set_over_2000_tokens(tmp_path: Path):
    big_body = '    x = "' + "word " * 5000 + '"\n'  # ~5000 tokens in one string
    root = _write_repo(
        tmp_path / "repo",
        {
            "big.py": f"def big():\n{big_body}",
            "small.py": "def small():\n    return 1\n",
        },
    )
    result = build_chunks(root, commit_sha="c1", db_path=tmp_path / "chunks.db")

    assert _by_name(result.chunks, "big").too_large is True
    assert _by_name(result.chunks, "small").too_large is False


# ------------------------------------------------------------------ storage

def test_storage_round_trip_by_commit_sha(tmp_path: Path):
    db = tmp_path / "chunks.db"
    root = _write_repo(tmp_path / "repo", _sample_repo())
    result = build_chunks(root, commit_sha="abc123", db_path=db)

    # Read straight from SQLite: the chunks are there, keyed by this commit.
    conn = sqlite3.connect(db)
    rows = conn.execute("SELECT chunk_id, name FROM chunks WHERE commit_sha='abc123'").fetchall()
    conn.close()
    assert sorted(rows) == sorted((c.id, c.name) for c in result.chunks)

    # A second commit adds its own rows without touching the first commit's.
    build_chunks(root, commit_sha="def456", db_path=db)
    conn = sqlite3.connect(db)
    count = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
    conn.close()
    assert count == 2 * len(result.chunks)


# ------------------------------------------------------------------- cache

def test_second_run_hits_cache_and_does_not_reparse(tmp_path: Path, monkeypatch):
    db = tmp_path / "chunks.db"
    root = _write_repo(tmp_path / "repo", _sample_repo())

    parsed: list[str] = []
    real_parse = builder_module.parse_source

    def counting_parse(source: str, file_path: str = "<string>"):
        parsed.append(file_path)
        return real_parse(source, file_path)

    monkeypatch.setattr(builder_module, "parse_source", counting_parse)

    first = build_chunks(root, commit_sha="c1", db_path=db)
    assert parsed == ["mod.py"]

    parsed.clear()
    second = build_chunks(root, commit_sha="c1", db_path=db)
    assert parsed == []  # cache hit: nothing was parsed
    assert second.files_cached == 1
    assert [c.text for c in second.chunks] == [c.text for c in first.chunks]


def test_changed_file_is_rechunked(tmp_path: Path, monkeypatch):
    db = tmp_path / "chunks.db"
    root = _write_repo(
        tmp_path / "repo",
        {"a.py": "def one():\n    return 1\n", "b.py": "def two():\n    return 2\n"},
    )

    parsed: list[str] = []
    real_parse = builder_module.parse_source

    def counting_parse(source: str, file_path: str = "<string>"):
        parsed.append(file_path)
        return real_parse(source, file_path)

    monkeypatch.setattr(builder_module, "parse_source", counting_parse)

    build_chunks(root, commit_sha="c1", db_path=db)
    # a.py changes, b.py does not
    (root / "a.py").write_text("def one():\n    return 999\n", encoding="utf-8")

    parsed.clear()
    result = build_chunks(root, commit_sha="c2", db_path=db)
    assert parsed == ["a.py"]  # only the changed file is re-parsed
    assert result.files_cached == 1  # b.py came from the cache
    assert "999" in _by_name(result.chunks, "one").text


# -------------------------------------------------------------- error cases

def test_syntax_error_file_is_skipped(tmp_path: Path):
    root = _write_repo(
        tmp_path / "repo",
        {"good.py": "def fine():\n    return 1\n", "bad.py": "def broken(:\n"},
    )
    result = build_chunks(root, commit_sha="c1", db_path=tmp_path / "chunks.db")

    assert result.files_skipped == ["bad.py"]
    assert {c.file for c in result.chunks} == {"good.py"}


def test_empty_folder_does_not_crash(tmp_path: Path):
    result = build_chunks(tmp_path / "empty", commit_sha="c1", db_path=tmp_path / "chunks.db")

    assert result == ChunkSet(commit_sha="c1")
    assert result.total_tokens == 0
