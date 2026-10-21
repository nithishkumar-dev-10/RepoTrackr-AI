"""Tests for the BM25 retrieval baseline: tokenizer, ranking, CLI, query runner."""

from pathlib import Path

import pytest

from app.pipeline.chunking import build_chunks
from app.pipeline.retrieval import BM25Index, UnknownCommitError, load_index, tokenize
from app.pipeline.retrieval import __main__ as retrieval_cli
from app.pipeline.retrieval import queries as queries_runner

# ------------------------------------------------------------------ fixtures

# A small repo: exact-name target, a rare word, and many chunks sharing the
# common word "value", so IDF differences are visible in the rankings.
_FILES = {
    "tokens.py": (
        "def verify_token(token):\n"
        '    """Check whether an auth token is valid."""\n'
        "    return check_token(token)\n"
        "\n"
        "def check_token(token):\n"
        "    return token is not None\n"
    ),
    "values.py": (
        "def load_value(name):\n"
        '    """Load one value from the store."""\n'
        "    return store[name]\n"
        "\n"
        "def save_value(name, value):\n"
        '    """Save one value into the store."""\n'
        "    store[name] = value\n"
        "\n"
        "def delete_value(name):\n"
        '    """Remove one value from the store."""\n'
        "    del store[name]\n"
    ),
    "store.py": (
        "class Store:\n"
        '    """A store of values."""\n'
        "\n"
        "    def get(self, name):\n"
        "        return self.items[name]\n"
        "\n"
        "    def put(self, name, value):\n"
        "        self.items[name] = value\n"
    ),
    "fruit.py": (
        "def find_dragonfruit():\n"
        '    """Find dragonfruit in the basket."""\n'
        "    return dragonfruit\n"
    ),
}


@pytest.fixture()
def db_path(tmp_path: Path) -> Path:
    """Chunk the sample repo and store it under commit SHA c1, like Step 4 does."""
    root = tmp_path / "repo"
    for rel, content in _FILES.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    path = tmp_path / "chunks.db"
    build_chunks(root, commit_sha="c1", db_path=path)
    return path


@pytest.fixture()
def index(db_path: Path) -> BM25Index:
    return load_index("c1", db_path)


# ------------------------------------------------------------------ tokenizer

def test_tokenize_snake_case():
    assert tokenize("verify_token") == ["verify", "token"]


def test_tokenize_camel_case_with_acronym():
    assert tokenize("getUserByID") == ["get", "user", "by", "id"]


def test_tokenize_pascal_case_acronym():
    assert tokenize("HTTPServer") == ["http", "server"]


def test_tokenize_dots_digits_and_short_tokens():
    assert tokenize("app/core/config.py") == ["app", "core", "config", "py"]
    assert tokenize("utf8") == ["utf"]  # the 1-char "8" is dropped
    assert tokenize("a _ x 8") == []  # only single-character tokens

# ------------------------------------------------------------------ ranking


def test_exact_function_name_ranks_first(index: BM25Index):
    results = index.search("verify_token", k=3)
    assert results[0].symbol == "verify_token"
    assert results[0].file == "tokens.py"


def test_rare_word_outranks_common_word(index: BM25Index):
    # "dragonfruit" sits in 1 chunk; "value" sits in most chunks.
    results = index.search("value dragonfruit", k=5)
    assert results[0].symbol == "find_dragonfruit"
    rare = index.search("dragonfruit", k=1)[0].score
    common = index.search("value", k=1)[0].score
    assert rare > common


def test_results_sorted_by_score_descending(index: BM25Index):
    results = index.search("token value dragonfruit store", k=20)
    scores = [r.score for r in results]
    assert scores == sorted(scores, reverse=True)


def test_k_limits_number_of_results(index: BM25Index):
    query = "token value dragonfruit store"
    assert len(index.search(query, k=2)) == 2
    assert index.search(query, k=2) == index.search(query, k=20)[:2]


def test_empty_query_returns_empty(index: BM25Index):
    assert index.search("") == []
    assert index.search("   ") == []
    assert index.search("a _ 8") == []  # only 1-char tokens, i.e. no real query


def test_empty_index_returns_empty():
    empty = BM25Index([], commit_sha="none")
    assert empty.search("anything at all") == []


def test_search_result_carries_file_and_lines(index: BM25Index):
    result = index.search("verify_token", k=1)[0]
    assert (result.file, result.line_start, result.line_end) == ("tokens.py", 1, 3)
    assert result.kind == "function"
    assert result.id == "tokens.py:verify_token:1"
    assert result.token_count > 0


# ------------------------------------------------------------------ loading

def test_unknown_sha_gives_clear_error(db_path: Path):
    with pytest.raises(UnknownCommitError, match="deadbeef"):
        load_index("deadbeef", db_path)


def test_missing_db_file_gives_clear_error(tmp_path: Path):
    with pytest.raises(FileNotFoundError, match="not found"):
        load_index("c1", tmp_path / "nope.db")


def test_index_only_contains_the_requested_sha(tmp_path: Path, db_path: Path):
    # Store the same repo again under a second commit SHA.
    repo = tmp_path / "repo"
    build_chunks(repo, commit_sha="c2", db_path=db_path)

    loaded = load_index("c1", db_path)
    assert {c.commit_sha for c in loaded.chunks} == {"c1"}
    assert len(loaded) == len(load_index("c2", db_path).chunks)


# ------------------------------------------------------------------ CLI

def test_cli_prints_ranked_results(db_path: Path, capsys):
    code = retrieval_cli.main(["verify_token", "--db", str(db_path), "--sha", "c1"])
    out = capsys.readouterr().out
    assert code == 0
    assert "commit: c1" in out
    assert "1 | " in out
    assert "verify_token | tokens.py:1" in out  # rank | score | symbol | file:line


def test_cli_defaults_to_the_stored_sha(db_path: Path, capsys):
    code = retrieval_cli.main(["verify_token", "--db", str(db_path)])
    out = capsys.readouterr().out
    assert code == 0
    assert "commit: c1" in out


def test_cli_unknown_sha_prints_error_not_traceback(db_path: Path, capsys):
    code = retrieval_cli.main(["token", "--db", str(db_path), "--sha", "deadbeef"])
    captured = capsys.readouterr()
    assert code == 1
    assert "has no chunks" in captured.err
    assert "Traceback" not in captured.err


# ------------------------------------------------------------------ query runner

def test_query_runner_skips_blank_lines_and_comments(tmp_path: Path, db_path: Path, capsys):
    query_file = tmp_path / "queries.txt"
    query_file.write_text(
        "# my comment line\n"
        "\n"
        "verify_token\n"
        "   \n"
        "# another comment\n"
        "value dragonfruit\n"
        "\n",
        encoding="utf-8",
    )

    code = queries_runner.main([str(query_file), "--db", str(db_path), "--sha", "c1"])
    out = capsys.readouterr().out

    assert code == 0
    assert "query: verify_token" in out
    assert "query: value dragonfruit" in out
    assert "my comment" not in out
    assert "another comment" not in out
    # 5 result lines per query, formatted rank | score | symbol | file:line
    result_lines = [line for line in out.splitlines() if " | " in line]
    assert len(result_lines) == 10
    assert result_lines[0].startswith("1 | ")
    assert result_lines[0].split(" | ")[-1].endswith(":1")  # file:line present


def test_query_runner_missing_file_gives_clear_error(tmp_path: Path, capsys):
    code = queries_runner.main([str(tmp_path / "nope.txt")])
    captured = capsys.readouterr()
    assert code == 1
    assert "query file not found" in captured.err
