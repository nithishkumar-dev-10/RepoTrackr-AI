import re
from datetime import datetime
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, field_validator

GITHUB_HOST = "github.com"

_OWNER_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")
_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")


def parse_github_url(value: str) -> tuple[str, str]:
    raw = (value or "").strip()
    if not raw:
        raise ValueError("Repo URL must not be empty")

    candidate = raw if "://" in raw else f"https://{raw}"
    parsed = urlparse(candidate)

    if parsed.scheme not in ("http", "https"):
        raise ValueError("Repo URL must use http or https")

    host = (parsed.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if host != GITHUB_HOST:
        raise ValueError(
            "Only public GitHub URLs (github.com/owner/name) are supported"
        )

    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) != 2:
        raise ValueError("GitHub URL must be in the form github.com/owner/name")

    owner, name = parts
    if name.endswith(".git"):
        name = name[: -len(".git")]

    if not _OWNER_RE.match(owner):
        raise ValueError("Invalid GitHub owner name")
    if not _NAME_RE.match(name):
        raise ValueError("Invalid GitHub repository name")

    return owner, name


class RepoCreate(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def _validate_url(cls, value: str) -> str:
        owner, name = parse_github_url(value)
        return f"https://{GITHUB_HOST}/{owner}/{name}"

    @property
    def owner(self) -> str:
        return parse_github_url(self.url)[0]

    @property
    def name(self) -> str:
        return parse_github_url(self.url)[1]


class RepoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    owner: str
    name: str
    status: str
    created_at: datetime


class RepoListOut(BaseModel):
    repos: list[RepoOut]
