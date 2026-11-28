"""HTTP errors that carry a stable, machine-readable code.

The global error envelope in ``app.main`` uses ``http_error`` for plain
``HTTPException``s. Raising one of these subclasses preserves the HTTP status
while letting clients branch on ``error.code`` instead of guessing from the
message or the status alone.
"""

from fastapi import HTTPException, status


class ApiHTTPException(HTTPException):
    """An HTTPException whose code is copied into the shared error envelope."""

    def __init__(self, status_code: int, code: str, detail: str) -> None:
        super().__init__(status_code=status_code, detail=detail)
        self.code = code


class EmailNotVerifiedError(ApiHTTPException):
    """The account exists and the password matched, but email is unverified.

    The status stays 401 and the message stays neutral so unknown accounts and
    bad passwords cannot be distinguished from the response text. Only the
    machine-readable code tells the frontend to offer verification instead of
    showing "invalid credentials".
    """

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="email_not_verified",
            detail="Invalid email or password",
        )
