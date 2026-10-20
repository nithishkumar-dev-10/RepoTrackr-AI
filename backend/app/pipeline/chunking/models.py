from pydantic import BaseModel, Field

from app.pipeline.indexer.models import SymbolKind

# A chunk bigger than this many tokens is flagged (we never split it).
MAX_TOKENS = 2000


class Chunk(BaseModel):
    """One piece of code kept for retrieval: a whole function, class or method."""

    id: str  # stable across runs: "file.py:Name:line_start"
    name: str  # symbol name, e.g. "get_settings"
    kind: SymbolKind  # "function" | "class" | "method"
    file: str  # path relative to the indexed folder
    line_start: int  # first source line of the symbol
    line_end: int  # last source line of the symbol
    text: str  # what gets embedded and searched later
    token_count: int  # tiktoken cl100k_base tokens of `text`
    file_hash: str  # sha256 of the file the chunk came from
    commit_sha: str  # commit this chunk was produced for
    too_large: bool = False  # token_count > MAX_TOKENS


class ChunkSet(BaseModel):
    """Everything one build_chunks run produced."""

    commit_sha: str
    chunks: list[Chunk] = Field(default_factory=list)
    files_parsed: int = 0  # files read and chunked this run
    files_cached: int = 0  # files reused from the file-hash cache
    files_skipped: list[str] = Field(default_factory=list)  # parse-error files

    @property
    def total_tokens(self) -> int:
        return sum(c.token_count for c in self.chunks)
