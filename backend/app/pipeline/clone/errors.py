from typing import Literal

CloneErrorCode = Literal[
    "invalid_url",
    "git_not_found",
    "git_failed",
    "timeout",
    "size_exceeded",
    "empty_repo",
]


class CloneError(Exception):
    """Raised when a repository cannot be safely cloned.

    Carries a machine-readable ``code`` so callers can map it to an HTTP
    response without parsing the message text.
    """

    def __init__(self, code: CloneErrorCode, message: str) -> None:
        super().__init__(message)
        self.code: CloneErrorCode = code
        self.message = message

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"
