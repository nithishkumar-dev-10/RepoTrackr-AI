from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


class CloneConfig(BaseModel):
    """Limits and destination for a single clone operation."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    root: Path
    max_size_mb: int = Field(default=200, gt=0)
    timeout_seconds: int = Field(default=120, gt=0)

    @property
    def max_size_bytes(self) -> int:
        return self.max_size_mb * 1024 * 1024


class CloneResult(BaseModel):
    """Outcome of a successful safe clone."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    url: str
    path: Path
    commit_sha: str
    size_bytes: int
    skipped_paths: list[str] = Field(default_factory=list)
