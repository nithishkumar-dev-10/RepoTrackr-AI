"""Result shape returned by every retrieval search."""

from pydantic import BaseModel


class SearchResult(BaseModel):
    """One ranked chunk: where it came from, what it is, and how well it scored."""

    id: str  # chunk id: "file.py:Name:line_start"
    symbol: str  # symbol name, e.g. "verify_token"
    kind: str  # "function" | "class" | "method"
    file: str  # path relative to the indexed folder
    line_start: int  # first source line of the symbol
    line_end: int  # last source line of the symbol
    score: float  # BM25 score, higher = better match
    token_count: int  # tiktoken tokens of the chunk text
