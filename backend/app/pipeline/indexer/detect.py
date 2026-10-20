import ast
from pathlib import Path

# FastAPI/Flask style route decorators: @app.get("/items"), @router.post("/x"), ...
ROUTE_METHODS = {"get", "post", "put", "delete", "patch", "head", "options"}


def is_test_file(path: str) -> bool:
    """True for test_*.py, *_test.py, or any file under a tests/ or test/ folder."""
    parts = Path(path).parts
    name = parts[-1]
    if name.startswith("test_") or name.endswith("_test.py"):
        return True
    return any(part in ("tests", "test") for part in parts[:-1])


def _imports_module(tree: ast.Module, module: str) -> bool:
    """Whether the file imports the given top-level module (import x / from x import y)."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            if any(a.name == module or a.name.startswith(f"{module}.") for a in node.names):
                return True
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "") == module:
                return True
    return False


def _is_main_guard(test: ast.expr) -> bool:
    """Match `__name__ == "__main__"` (either operand order)."""
    if not isinstance(test, ast.Compare) or len(test.ops) != 1:
        return False
    if not isinstance(test.ops[0], ast.Eq) or len(test.comparators) != 1:
        return False
    left, right = test.left, test.comparators[0]
    pair = (left, right)
    return (
        isinstance(left, ast.Name)
        and left.id == "__name__"
        and isinstance(right, ast.Constant)
        and right.value == "__main__"
    ) or (
        isinstance(right, ast.Name)
        and right.id == "__name__"
        and isinstance(left, ast.Constant)
        and left.value == "__main__"
    )


def _decorator_entry(dec: ast.expr, has_typer: bool, has_click: bool) -> str | None:
    """Turn a decorator into an entry-point label, or None if it is not one."""
    if not isinstance(dec, ast.Call) or not isinstance(dec.func, ast.Attribute):
        return None
    attr = dec.func.attr
    if attr in ROUTE_METHODS:
        # @app.get("/items") -> keep the path when it is a plain string literal
        path = ""
        if dec.args and isinstance(dec.args[0], ast.Constant) and isinstance(dec.args[0].value, str):
            path = f" {dec.args[0].value}"
        return f"fastapi route {attr.upper()}{path}"
    if attr in ("command", "group"):
        # Prefer what the decorator itself says: click.command() -> base name "click".
        # For object-style decorators (@cli.command()), fall back to the file's imports.
        base = dec.func.value
        if isinstance(base, ast.Name) and base.id == "click":
            return "click command"
        if isinstance(base, ast.Name) and base.id == "typer":
            return "typer command"
        if has_typer:
            return "typer command"
        if has_click:
            return "click command"
        return "CLI command"
    return None


def _is_argument_parser(func: ast.expr) -> bool:
    """Match argparse.ArgumentParser(...) whether or not it was imported by name."""
    if isinstance(func, ast.Attribute):
        return func.attr == "ArgumentParser"
    return isinstance(func, ast.Name) and func.id == "ArgumentParser"


def find_entry_points(tree: ast.Module) -> list[str]:
    """Find executable entry points in a parsed file, in line order.

    Covered: `if __name__ == "__main__"` guards, FastAPI/Flask route
    decorators, and argparse / click / typer CLIs.
    """
    has_typer = _imports_module(tree, "typer")
    has_click = _imports_module(tree, "click")

    found: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.If) and _is_main_guard(node.test):
            found.append((node.lineno, "main guard"))
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for dec in node.decorator_list:
                label = _decorator_entry(dec, has_typer, has_click)
                if label:
                    # Use the decorator's line: node.lineno is the "def" line.
                    found.append((dec.lineno, label))
        if isinstance(node, ast.Call) and _is_argument_parser(node.func):
            found.append((node.lineno, "argparse CLI"))

    found.sort()
    return [f"line {line}: {label}" for line, label in found]
