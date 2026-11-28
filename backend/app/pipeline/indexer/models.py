from typing import Literal
from pydantic import BaseModel, Field

# What kind of code entity a Symbol describes.
SymbolKind = Literal["function", "class", "method"]


class Symbol(BaseModel):
    """One named code entity (function, class or method) with its exact location."""

    name: str
    kind: SymbolKind
    file: str  # path relative to the indexed folder
    line_start: int  # first line of the def/class statement
    line_end: int  # last line of the whole block (from the AST)
    signature: str | None = None  # e.g. "(a: int, b: int=0) -> int"
    docstring: str | None = None  # first string literal in the body, if any
    parent: str | None = None  # dotted path of enclosing symbols, e.g. "Dog.bark"


class ImportRef(BaseModel):
    """One import statement.

    "import os"            -> module="os",  names=[],      alias=None, level=0
    "import os.path as op" -> module="os.path", names=[],  alias="op", level=0
    "from os import path"  -> module="os",  names=["path"], alias=None, level=0
    "from . import x"      -> module="",    names=["x"],    alias=None, level=1
    """

    module: str  # dotted module name, leading dots stripped (they live in level)
    names: list[str] = Field(default_factory=list)  # [] for plain "import x"
    alias: str | None = None  # "as" name when a single name is bound
    level: int = 0  # number of leading dots for relative imports
    file: str
    line: int


class CallRef(BaseModel):
    """A call to a name that this file can resolve (defined here or imported)."""

    caller: str | None = None  # enclosing function/method name, None at module level
    callee: str  # the name being called, e.g. "parse_file"
    file: str
    line: int


class FileIndex(BaseModel):
    """Everything we learned from one file by reading it as text (never executing it)."""

    file: str
    symbols: list[Symbol] = Field(default_factory=list)
    imports: list[ImportRef] = Field(default_factory=list)
    calls: list[CallRef] = Field(default_factory=list)
    is_test: bool = False
    entry_points: list[str] = Field(default_factory=list)  # e.g. "line 12: main guard"
    parse_error: str | None = None  # set when the file could not be parsed


class RepoIndex(BaseModel):
    """The whole folder: every file index plus one flat symbol list for retrieval."""

    root: str
    files: list[FileIndex] = Field(default_factory=list)
    symbols: list[Symbol] = Field(default_factory=list)  # flat copy of all symbols
