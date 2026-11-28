"""Tests for the AST indexer: symbols, imports, calls, entry points, repo walk."""

from pathlib import Path

from app.pipeline.indexer import (
    FileIndex,
    RepoIndex,
    index_repo,
    parse_file,
    parse_source,
)


# ------------------------------------------------------------------ symbols

def test_parse_functions():
    code = """def add(a: int, b: int = 0) -> int:
    \"\"\"Return sum of a and b.\"\"\"
    return a + b

async def fetch_data(url: str, timeout: float = 5.0) -> dict:
    \"\"\"Fetch payload asynchronously.\"\"\"
    return {}
"""
    result = parse_source(code, "math_utils.py")

    assert result.parse_error is None
    assert len(result.symbols) == 2

    add_sym = result.symbols[0]
    assert add_sym.name == "add"
    assert add_sym.kind == "function"
    assert add_sym.file == "math_utils.py"
    assert add_sym.line_start == 1
    assert add_sym.line_end == 3
    assert add_sym.signature == "(a: int, b: int=0) -> int"
    assert add_sym.docstring == "Return sum of a and b."
    assert add_sym.parent is None

    fetch_sym = result.symbols[1]
    assert fetch_sym.name == "fetch_data"
    assert fetch_sym.kind == "function"
    assert fetch_sym.line_start == 5
    assert fetch_sym.line_end == 7
    assert fetch_sym.signature == "(url: str, timeout: float=5.0) -> dict"
    assert fetch_sym.docstring == "Fetch payload asynchronously."
    assert fetch_sym.parent is None


def test_parse_classes_and_methods():
    code = """class Animal:
    \"\"\"Base animal.\"\"\"
    pass

class Dog(Animal):
    \"\"\"Canine species.\"\"\"

    def __init__(self, name: str):
        self.name = name

    def bark(self, volume: int = 5) -> str:
        \"\"\"Make dog sound.\"\"\"
        return "Woof!" * volume
"""
    result = parse_source(code, "animals.py")

    assert result.parse_error is None
    assert len(result.symbols) == 4

    animal_cls = result.symbols[0]
    assert animal_cls.name == "Animal"
    assert animal_cls.kind == "class"
    assert animal_cls.line_start == 1
    assert animal_cls.line_end == 3
    assert animal_cls.signature is None  # no bases -> no signature
    assert animal_cls.docstring == "Base animal."
    assert animal_cls.parent is None

    dog_cls = result.symbols[1]
    assert dog_cls.name == "Dog"
    assert dog_cls.kind == "class"
    assert dog_cls.line_start == 5
    assert dog_cls.line_end == 13
    assert dog_cls.signature == "(Animal)"
    assert dog_cls.docstring == "Canine species."
    assert dog_cls.parent is None

    init_m = result.symbols[2]
    assert init_m.name == "__init__"
    assert init_m.kind == "method"
    assert init_m.line_start == 8
    assert init_m.line_end == 9
    assert init_m.signature == "(self, name: str)"
    assert init_m.parent == "Dog"

    bark_m = result.symbols[3]
    assert bark_m.name == "bark"
    assert bark_m.kind == "method"
    assert bark_m.line_start == 11
    assert bark_m.line_end == 13
    assert bark_m.signature == "(self, volume: int=5) -> str"
    assert bark_m.docstring == "Make dog sound."
    assert bark_m.parent == "Dog"


def test_parse_nested_symbols():
    code = """def outer():
    def inner():
        pass
    return inner

class Container:
    class InnerClass:
        def inner_method(self):
            pass
"""
    result = parse_source(code, "nested.py")

    assert result.parse_error is None
    names_and_parents = [(s.name, s.kind, s.parent) for s in result.symbols]
    assert names_and_parents == [
        ("outer", "function", None),
        ("inner", "function", "outer"),
        ("Container", "class", None),
        ("InnerClass", "class", "Container"),
        ("inner_method", "method", "Container.InnerClass"),
    ]


def test_parse_conditional_symbols():
    code = """try:
    def fast_hasher(data: bytes) -> str:
        return "fast"
except ImportError:
    def fast_hasher(data: bytes) -> str:
        return "fallback"
"""
    result = parse_source(code, "hasher.py")
    assert result.parse_error is None
    assert len(result.symbols) == 2
    assert all(s.name == "fast_hasher" and s.kind == "function" for s in result.symbols)


def test_docstring_absent():
    code = """def no_doc():
    return 1

class NoDoc:
    pass
"""
    result = parse_source(code, "plain.py")
    assert all(s.docstring is None for s in result.symbols)
    assert [s.name for s in result.symbols] == ["no_doc", "NoDoc"]


def test_signature_with_defaults_and_varargs():
    code = """def wide(a, b=1, *args, c=2, **kwargs):
    \"\"\"Accept everything.\"\"\"
    pass
"""
    result = parse_source(code, "wide.py")
    (wide,) = result.symbols
    assert wide.signature == "(a, b=1, *args, c=2, **kwargs)"


def test_parse_file_on_disk(tmp_path: Path):
    file_content = """# Sample module
def greet(name: str) -> str:
    \"\"\"Greets a user.\"\"\"
    return f"Hello, {name}!"

class Greeter:
    def say(self):
        return greet("world")
"""
    py_file = tmp_path / "greeting.py"
    py_file.write_text(file_content, encoding="utf-8")

    result = parse_file(py_file, base_dir=tmp_path)
    assert result.parse_error is None
    assert result.file == "greeting.py"
    assert len(result.symbols) == 3

    greet_fn = result.symbols[0]
    assert greet_fn.name == "greet"
    assert greet_fn.line_start == 2
    assert greet_fn.line_end == 4
    assert greet_fn.file == "greeting.py"

    greeter_cls = result.symbols[1]
    assert greeter_cls.name == "Greeter"
    assert greeter_cls.line_start == 6
    assert greeter_cls.line_end == 8

    say_method = result.symbols[2]
    assert say_method.name == "say"
    assert say_method.line_start == 7
    assert say_method.line_end == 8
    assert say_method.parent == "Greeter"


# ------------------------------------------------------------------ imports

def test_plain_imports():
    code = "import os\nimport os.path\n"
    result = parse_source(code, "imp.py")
    assert len(result.imports) == 2

    first = result.imports[0]
    assert first.module == "os"
    assert first.names == []
    assert first.alias is None
    assert first.level == 0
    assert first.file == "imp.py"
    assert first.line == 1

    second = result.imports[1]
    assert second.module == "os.path"
    assert second.line == 2


def test_import_with_alias():
    code = "import os.path as osp\nimport sys, json as j\n"
    result = parse_source(code, "imp_alias.py")

    assert result.imports[0].module == "os.path"
    assert result.imports[0].alias == "osp"

    # Two plain imports in one statement -> one ref each
    assert result.imports[1].module == "sys"
    assert result.imports[1].alias is None
    assert result.imports[2].module == "json"
    assert result.imports[2].alias == "j"


def test_from_import():
    code = "from json import loads, load\n"
    result = parse_source(code, "imp_from.py")
    (ref,) = result.imports
    assert ref.module == "json"
    assert ref.names == ["loads", "load"]
    assert ref.alias is None
    assert ref.level == 0
    assert ref.line == 1


def test_from_import_with_alias():
    code = "from json import load as jload\n"
    result = parse_source(code, "imp_from_alias.py")
    (ref,) = result.imports
    assert ref.module == "json"
    assert ref.names == ["load"]
    assert ref.alias == "jload"


def test_relative_imports():
    code = """from . import helper
from ..utils import clean
"""
    result = parse_source(code, "pkg/mod.py")

    assert result.imports[0].module == ""  # "from ." has no module name
    assert result.imports[0].names == ["helper"]
    assert result.imports[0].level == 1

    assert result.imports[1].module == "utils"
    assert result.imports[1].names == ["clean"]
    assert result.imports[1].level == 2


# -------------------------------------------------------------------- calls

def test_resolvable_calls_only():
    code = """import os
from json import loads

def parse(raw):
    return loads(raw)

def main():
    parse("{}")
    os.getcwd()
    print("hi")
    mystery()

if __name__ == "__main__":
    main()
"""
    result = parse_source(code, "calls.py")

    # Resolvable: loads (imported), parse (defined), main (defined).
    got = [(c.caller, c.callee, c.line) for c in result.calls]
    assert got == [
        ("parse", "loads", 5),
        ("main", "parse", 8),
        (None, "main", 14),  # module-level call has no caller
    ]
    # Not resolvable: os.getcwd (attribute call), print (builtin), mystery (undefined)
    assert not any(c.callee in {"getcwd", "print", "mystery"} for c in result.calls)


# -------------------------------------------------------------- entry points

def test_main_guard_entry_point():
    code = """def main():
    pass

if __name__ == "__main__":
    main()
"""
    result = parse_source(code, "guarded.py")
    assert result.entry_points == ["line 4: main guard"]


def test_fastapi_route_entry_point():
    code = """from fastapi import FastAPI

app = FastAPI()

@app.get("/items")
def list_items():
    \"\"\"List items.\"\"\"
    return []
"""
    result = parse_source(code, "web.py")
    assert result.entry_points == ["line 5: fastapi route GET /items"]


def test_argparse_entry_point():
    code = """import argparse

def build():
    parser = argparse.ArgumentParser(description="demo")
    return parser
"""
    result = parse_source(code, "cli_argparse.py")
    assert result.entry_points == ["line 4: argparse CLI"]


def test_click_entry_point():
    code = """import click

@click.command()
def cli():
    \"\"\"Cli.\"\"\"
    pass
"""
    result = parse_source(code, "cli_click.py")
    assert result.entry_points == ["line 3: click command"]


def test_typer_entry_point():
    code = """import typer

app = typer.Typer()

@app.command()
def deploy():
    \"\"\"Deploy something.\"\"\"
"""
    result = parse_source(code, "cli_typer.py")
    assert result.entry_points == ["line 5: typer command"]


# -------------------------------------------------------------- test files

def test_test_file_detection():
    assert parse_source("x = 1", "test_utils.py").is_test is True
    assert parse_source("x = 1", "utils_test.py").is_test is True
    assert parse_source("x = 1", "tests/test_app.py").is_test is True
    assert parse_source("x = 1", "test/app.py").is_test is True
    assert parse_source("x = 1", "app/utils.py").is_test is False
    assert parse_source("x = 1", "app/tests_helper.py").is_test is False


# -------------------------------------------------------------- whole repos

def test_syntax_error_file_skipped_others_indexed(tmp_path: Path):
    (tmp_path / "good.py").write_text("def fine():\n    return 1\n", encoding="utf-8")
    (tmp_path / "broken.py").write_text('def broken(:\n', encoding="utf-8")

    repo = index_repo(tmp_path)

    assert isinstance(repo, RepoIndex)
    by_name = {f.file: f for f in repo.files}
    assert set(by_name) == {"good.py", "broken.py"}

    good = by_name["good.py"]
    assert good.parse_error is None
    assert [s.name for s in good.symbols] == ["fine"]

    broken = by_name["broken.py"]
    assert broken.parse_error is not None
    assert "SyntaxError" in broken.parse_error
    assert broken.symbols == []

    # The flat symbol list only contains symbols from files that parsed.
    assert [s.name for s in repo.symbols] == ["fine"]


def test_parse_file_on_disk_syntax_error(tmp_path: Path):
    bad_file = tmp_path / "broken.py"
    bad_file.write_text('def broken(:\n    print("nope")\n', encoding="utf-8")

    result = parse_file(bad_file, base_dir=tmp_path)
    assert result.parse_error is not None
    assert "SyntaxError" in result.parse_error
    assert "line 1" in result.parse_error
    assert len(result.symbols) == 0


def test_ignored_folders_and_env_never_read(tmp_path: Path):
    good = tmp_path / "app" / "ok.py"
    good.parent.mkdir(parents=True)
    good.write_text("def keep():\n    pass\n", encoding="utf-8")

    # Python files inside ignored folders: these must never be indexed.
    for rel in [
        "node_modules/pkg/index.py",
        "venv/lib/v.py",
        ".venv/lib/v2.py",
        ".git/hooks/g.py",
        "__pycache__/c.py",
    ]:
        p = tmp_path / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("def ignored():\n    pass\n", encoding="utf-8")

    # Secret-looking files that contain Python code: never read.
    (tmp_path / ".env").write_text("def sneaky_env():\n    pass\n", encoding="utf-8")
    (tmp_path / "cert.pem").write_text("def sneaky_pem():\n    pass\n", encoding="utf-8")
    (tmp_path / "server.key").write_text("def sneaky_key():\n    pass\n", encoding="utf-8")

    repo = index_repo(tmp_path)

    assert [f.file for f in repo.files] == ["app/ok.py"]
    names = [s.name for s in repo.symbols]
    assert names == ["keep"]
    assert not any("sneaky" in name or "ignored" in name for name in names)


def test_repo_index_flat_symbols_match_files(tmp_path: Path):
    (tmp_path / "a.py").write_text("def one():\n    pass\n", encoding="utf-8")
    sub = tmp_path / "pkg"
    sub.mkdir()
    (sub / "b.py").write_text("class Two:\n    def go(self):\n        pass\n", encoding="utf-8")
    (sub / "test_b.py").write_text("def test_two():\n    pass\n", encoding="utf-8")

    repo = index_repo(tmp_path)

    assert repo.root == tmp_path.as_posix()
    assert [f.file for f in repo.files] == ["a.py", "pkg/b.py", "pkg/test_b.py"]
    # Flat list is exactly the concatenation of every file's symbols.
    assert repo.symbols == [s for f in repo.files for s in f.symbols]
    assert [(s.name, s.file, s.line_start) for s in repo.symbols] == [
        ("one", "a.py", 1),
        ("Two", "pkg/b.py", 1),
        ("go", "pkg/b.py", 2),
        ("test_two", "pkg/test_b.py", 1),
    ]
    assert [f.is_test for f in repo.files] == [False, False, True]


def test_indexer_never_executes_analyzed_code(tmp_path: Path):
    marker = tmp_path / "EXECUTED_MARKER"
    # This file parses fine, but would raise and write a marker file if it
    # were ever imported or executed.
    payload = (
        "raise RuntimeError('must never run')\n"
        f"open({str(marker)!r}, 'w').write('boom')\n"
        "def harmless():\n"
        "    pass\n"
    )
    evil = tmp_path / "evil.py"
    evil.write_text(payload, encoding="utf-8")

    repo = index_repo(tmp_path)

    assert not marker.exists()  # nothing was executed
    (evil_index,) = repo.files
    assert evil_index.parse_error is None  # it parses as valid Python
    assert [s.name for s in evil_index.symbols] == ["harmless"]
