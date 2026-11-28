"""One tokenizer, shared by indexing and querying.

Splitting every identifier into words makes "verify_token" match "verify token"
and "getUserByID" match "get user id", which is what BM25 needs: it scores
whole words, not substrings.
"""

import re

# Cut before digits ("utf8" -> ["utf", "8"]), then split on anything that is
# not a letter or digit: dots, slashes, dashes, spaces, punctuation.
_SEPARATORS = re.compile(r"[^A-Za-z0-9]+")

# Word breaks inside one piece: camelCase / PascalCase boundary, acronym
# boundary (HTTPServer), and letter <-> digit boundary (utf8 -> utf, 8).
_WORD_BREAK = re.compile(
    r"(?<=[a-z0-9])(?=[A-Z])"
    r"|(?<=[A-Z])(?=[A-Z][a-z])"
    r"|(?<=[A-Za-z])(?=[0-9])"
    r"|(?<=[0-9])(?=[A-Za-z])"
)


def tokenize(text: str) -> list[str]:
    """Lowercase word tokens of `text`; single-character tokens are dropped.

    "verify_token"        -> ["verify", "token"]
    "getUserByID"         -> ["get", "user", "by", "id"]
    "HTTPServer"          -> ["http", "server"]
    "app/core/config.py"  -> ["app", "core", "config", "py"]
    "utf8"                -> ["utf"]  (the 1-char "8" is dropped)
    """
    words: list[str] = []
    for piece in _SEPARATORS.split(text):  # dots/slashes/underscores become cuts
        if not piece:
            continue
        for word in _WORD_BREAK.split(piece):  # camelCase / acronyms / digits
            if len(word) > 1:  # one-letter tokens ("a", "x") carry no meaning
                words.append(word.lower())
    return words
