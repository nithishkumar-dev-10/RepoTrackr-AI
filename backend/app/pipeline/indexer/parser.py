import ast
import logging
from pathlib import Path

from app.pipeline.indexer import detect
from app.pipeline.indexer.models import CallRef, FileIndex, ImportRef, Symbol, SymbolKind

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------- signatures

def _format_function_signature(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    """Turn the argument list into text, e.g. "(a: int, b: int=0) -> int"."""
    args_str = ast.unparse(node.args)
    ret_str = f" -> {ast.unparse(node.returns)}" if node.returns else ""
    return f"({args_str}){ret_str}"


def _format_class_signature(node: ast.ClassDef) -> str | None:
    """Keep the base classes, e.g. "(Animal)"; None when a class inherits nothing."""
    if not node.bases:
        return None
    bases_str = ", ".join(ast.unparse(b) for b in node.bases)
    return f"({bases_str})"


# ------------------------------------------------------------------- symbols

def _extract_symbols(
    body: list[ast.stmt],
    file_path: str,
    parent: str | None = None,
    parent_is_class: bool = False,
) -> list[Symbol]:
    """Walk a statement list and collect every def/class, in source order.

    Nested blocks (if/while/for/with/try) are walked too, because Python allows
    function and class definitions inside them.
    """
    symbols: list[Symbol] = []
    for node in body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # A function defined inside a class is a method, everything else a function.
            kind: SymbolKind = "method" if parent_is_class else "function"
            symbols.append(
                Symbol(
                    name=node.name,
                    kind=kind,
                    file=file_path,
                    line_start=node.lineno,
                    line_end=node.end_lineno or node.lineno,
                    signature=_format_function_signature(node),
                    docstring=ast.get_docstring(node),
                    parent=parent,
                )
            )
            # Children of this def are named "Outer.inner", except inside a class:
            # there the class stays the parent ("Dog.bark" would flatten methods).
            child_parent = node.name if parent is None else f"{parent}.{node.name}"
            symbols.extend(
                _extract_symbols(
                    node.body,
                    file_path=file_path,
                    parent=child_parent,
                    parent_is_class=False,
                )
            )
        elif isinstance(node, ast.ClassDef):
            symbols.append(
                Symbol(
                    name=node.name,
                    kind="class",
                    file=file_path,
                    line_start=node.lineno,
                    line_end=node.end_lineno or node.lineno,
                    signature=_format_class_signature(node),
                    docstring=ast.get_docstring(node),
                    parent=parent,
                )
            )
            child_parent = node.name if parent is None else f"{parent}.{node.name}"
            symbols.extend(
                _extract_symbols(
                    node.body,
                    file_path=file_path,
                    parent=child_parent,
                    parent_is_class=True,
                )
            )
        elif isinstance(node, (ast.If, ast.With, ast.AsyncWith, ast.For, ast.AsyncFor, ast.While)):
            symbols.extend(
                _extract_symbols(
                    node.body,
                    file_path=file_path,
                    parent=parent,
                    parent_is_class=parent_is_class,
                )
            )
            if getattr(node, "orelse", None):
                symbols.extend(
                    _extract_symbols(
                        node.orelse,
                        file_path=file_path,
                        parent=parent,
                        parent_is_class=parent_is_class,
                    )
                )
        elif isinstance(node, ast.Try):
            symbols.extend(
                _extract_symbols(
                    node.body,
                    file_path=file_path,
                    parent=parent,
                    parent_is_class=parent_is_class,
                )
            )
            for handler in node.handlers:
                symbols.extend(
                    _extract_symbols(
                        handler.body,
                        file_path=file_path,
                        parent=parent,
                        parent_is_class=parent_is_class,
                    )
                )
            if node.orelse:
                symbols.extend(
                    _extract_symbols(
                        node.orelse,
                        file_path=file_path,
                        parent=parent,
                        parent_is_class=parent_is_class,
                    )
                )
            if node.finalbody:
                symbols.extend(
                    _extract_symbols(
                        node.finalbody,
                        file_path=file_path,
                        parent=parent,
                        parent_is_class=parent_is_class,
                    )
                )
    return symbols


# ------------------------------------------------------------------- imports

def _extract_imports(tree: ast.Module, file_path: str) -> list[ImportRef]:
    """Collect every import statement in the file, in line order."""
    refs: list[ImportRef] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            # "import os.path as osp" binds one name, so each alias gets its own ref.
            for alias in node.names:
                refs.append(
                    ImportRef(
                        module=alias.name,
                        names=[],
                        alias=alias.asname,
                        level=0,
                        file=file_path,
                        line=node.lineno,
                    )
                )
        elif isinstance(node, ast.ImportFrom):
            # Leading dots are the relative level; node.module holds the rest.
            refs.append(
                ImportRef(
                    module=node.module or "",
                    names=[a.name for a in node.names],
                    # alias only when a single name is bound, so it stays unambiguous
                    alias=node.names[0].asname if len(node.names) == 1 else None,
                    level=node.level,
                    file=file_path,
                    line=node.lineno,
                )
            )
    refs.sort(key=lambda r: r.line)
    return refs


# --------------------------------------------------------------------- calls

def _bound_names(tree: ast.Module) -> set[str]:
    """Names this file can resolve: its own defs/classes plus anything imported."""
    bound: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            bound.add(node.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                # "import os.path" binds "os"; "import os.path as osp" binds "osp"
                bound.add(alias.asname or alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name == "*":  # "from x import *" binds nothing we can name
                    continue
                bound.add(alias.asname or alias.name)
    return bound


def _enclosing_function(node: ast.AST, parents: dict[ast.AST, ast.AST]) -> str | None:
    """Walk up the AST from a node until we find the function it sits in."""
    current = parents.get(node)
    while current is not None:
        if isinstance(current, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return current.name
        current = parents.get(current)
    return None


def _extract_calls(tree: ast.Module, file_path: str) -> list[CallRef]:
    """Collect calls to names defined in this file or imported by it.

    Only bare name calls (foo(...)) count: attribute calls (obj.foo(...)) can
    not be resolved without running the code, so they are skipped.
    """
    bound = _bound_names(tree)

    # Child -> parent map so we can ask "which function contains this call?".
    parents: dict[ast.AST, ast.AST] = {}
    for node in ast.walk(tree):
        for child in ast.iter_child_nodes(node):
            parents[child] = node

    calls: list[CallRef] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in bound:
                calls.append(
                    CallRef(
                        caller=_enclosing_function(node, parents),
                        callee=node.func.id,
                        file=file_path,
                        line=node.lineno,
                    )
                )
    calls.sort(key=lambda c: c.line)
    return calls


# --------------------------------------------------------------- entry points

def _parse_tree(source: str, file_path: str) -> tuple[ast.Module | None, str | None]:
    """ast.parse with every failure converted into a logged message. Never raises.

    Returns (tree, None) on success or (None, error message) on failure.
    """
    try:
        return ast.parse(source, filename=file_path), None
    except SyntaxError as exc:
        msg = f"SyntaxError: {exc.msg} at line {exc.lineno}"
        logger.warning("Syntax error in %s: %s", file_path, msg)
        return None, msg
    except Exception as exc:  # any other parser failure must not crash the run
        msg = f"ParseError: {type(exc).__name__}: {exc}"
        logger.warning("Parse error in %s: %s", file_path, msg)
        return None, msg


def parse_source(source: str, file_path: str = "<string>") -> FileIndex:
    """Parse python source code into a FileIndex. Catches syntax errors without crashing."""
    tree, error = _parse_tree(source, file_path)
    if tree is None:
        return FileIndex(file=file_path, parse_error=error)

    return FileIndex(
        file=file_path,
        symbols=_extract_symbols(tree.body, file_path=file_path),
        imports=_extract_imports(tree, file_path),
        calls=_extract_calls(tree, file_path),
        is_test=detect.is_test_file(file_path),
        entry_points=detect.find_entry_points(tree),
    )


def parse_file(path: str | Path, base_dir: str | Path | None = None) -> FileIndex:
    """Parse a single Python file into a FileIndex. Never raises on unparseable files."""
    file_path = Path(path)
    if base_dir:
        try:
            rel_path = file_path.relative_to(base_dir).as_posix()
        except ValueError:
            rel_path = file_path.as_posix()
    else:
        rel_path = file_path.as_posix()

    try:
        # errors="replace" turns undecodable bytes into U+FFFD; ast.parse then
        # reports them as a SyntaxError, which parse_source already handles.
        source = file_path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        logger.warning("Could not read %s: %s", rel_path, exc)
        return FileIndex(file=rel_path, parse_error=f"ReadError: {exc}")

    return parse_source(source, file_path=rel_path)
