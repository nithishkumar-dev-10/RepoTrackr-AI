"""Line-preserving redaction of secret-looking values in source text.

The deterministic pipeline stores derived source text in chunks and index
summaries. This module removes credential-shaped values *inside* each line so
``file:line`` citations keep pointing at the original line. Analyzed code is
never executed here; this is pure text replacement.
"""

import re

REDACTED = "[REDACTED]"

# Credential shapes that are unsafe to keep in any stored text.
_TOKEN_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),  # AWS access key id
    re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),  # Google API key
    re.compile(  # GitHub personal / OAuth / fine-grained tokens
        r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{20,})\b"
    ),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"),  # Slack token
    re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b"),  # OpenAI-style key
    re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"),  # JWT
)

_PEM_BEGIN = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")
_PEM_END = re.compile(r"-----END [A-Z ]*PRIVATE KEY-----")

# Identifier fragments that mark a string literal as a credential assignment.
_SECRET_WORDS: frozenset[str] = frozenset(
    {"password", "passwd", "secret", "token", "apikey", "auth", "privatekey"}
)
_COMPOUND_WORDS: frozenset[str] = frozenset({"apikey", "privatekey"})

# Values that are documentation, not credentials. Kept verbatim so examples in
# READMEs and .env templates stay useful after redaction.
_PLACEHOLDERS: frozenset[str] = frozenset(
    {
        "xxx",
        "xxxx",
        "xxxxx",
        "changeme",
        "change_me",
        "change-me",
        "placeholder",
        "your-key-here",
        "your_key_here",
        "your-key",
        "your_key",
        "your-token",
        "your_token",
        "your-password",
        "your_password",
        "your-secret",
        "your_secret",
        "example",
        "dummy",
        "sample",
        "todo",
        "none",
        "null",
        "secret",
        "password",
        "token",
    }
)
_PLACEHOLDER_PARTS: tuple[str, ...] = (
    "changeme",
    "placeholder",
    "your-key",
    "your_key",
    "yourkey",
    "your-token",
    "your_token",
    "yourtoken",
    "your-password",
    "your_password",
    "yourpassword",
    "your-secret",
    "your_secret",
    "yoursecret",
    "example",
    "dummy",
    "todo",
    "sample-value",
    "insert-",
)

# A direct literal after `=`. Environment lookups and computed values do not
# match because the character after `=` must be a quote.
_ASSIGNMENT = re.compile(
    r"(?P<lhs>(?P<name>[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)"
    r"\s*(?P<annotation>:[^=\n]+)?(?<![=!<>])=\s*)"
    r"(?P<quote>['\"])(?P<value>(?:\\.|(?!(?P=quote)).)*)(?P=quote)",
    re.IGNORECASE,
)


def _looks_like_placeholder(value: str) -> bool:
    """True for empty values, obvious placeholders and env-key references."""
    stripped = value.strip()
    lowered = stripped.lower()
    if not lowered:
        return True
    if re.fullmatch(r"<[^>]*>", lowered) or re.fullmatch(r"x{3,}", lowered):
        return True
    if lowered in _PLACEHOLDERS:
        return True
    if any(part in lowered for part in _PLACEHOLDER_PARTS):
        return True
    if "${" in stripped or "getenv" in lowered or "environ" in lowered:
        return True
    return False


def _is_secret_name(name: str) -> bool:
    # Only the leaf of a dotted name, and only its final word(s), count. That
    # keeps `password_policy` and `api_key_label` out while catching
    # `self.api_key` and `db_password`.
    leaf = name.lower().rsplit(".", 1)[-1]
    parts = [part for part in re.split(r"[^a-z0-9]+", leaf) if part]
    if not parts or "not" in parts:
        return False
    if parts[-1] in _SECRET_WORDS:
        return True
    return "".join(parts[-2:]) in _COMPOUND_WORDS


def _redact_tokens(line: str) -> str:
    for pattern in _TOKEN_PATTERNS:
        line = pattern.sub(
            lambda match: (
                match.group(0)
                if _looks_like_placeholder(match.group(0))
                else REDACTED
            ),
            line,
        )
    return line


def _redact_assignment(line: str) -> str:
    def replace(match: re.Match[str]) -> str:
        if not _is_secret_name(match.group("name")):
            return match.group(0)
        if _looks_like_placeholder(match.group("value")):
            return match.group(0)
        quote = match.group("quote")
        return f"{match.group('lhs')}{quote}{REDACTED}{quote}"

    return _ASSIGNMENT.sub(replace, line)


def _split_ending(line: str) -> tuple[str, str]:
    """Split a line into its content and its original line ending."""
    if line.endswith("\r\n"):
        return line[:-2], "\r\n"
    if line.endswith("\n"):
        return line[:-1], "\n"
    if line.endswith("\r"):
        return line[:-1], "\r"
    return line, ""


def redact_secrets(text: str) -> str:
    """Replace credential-shaped values inside ``text``, preserving line count.

    Every input line produces exactly one output line, so a ``file:line``
    citation computed on the original source stays correct after redaction.
    PEM private-key blocks are replaced one line at a time.
    """
    redacted: list[str] = []
    inside_pem = False

    for line in text.splitlines(keepends=True):
        body, ending = _split_ending(line)

        if inside_pem:
            inside_pem = _PEM_END.search(body) is None
            redacted.append(REDACTED + ending)
            continue

        if _PEM_BEGIN.search(body):
            inside_pem = _PEM_END.search(body) is None
            redacted.append(REDACTED + ending)
            continue

        redacted.append(_redact_assignment(_redact_tokens(body)) + ending)

    return "".join(redacted)
