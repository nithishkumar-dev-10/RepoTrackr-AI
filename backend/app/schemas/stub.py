from pydantic import BaseModel


class StubQueryRequest(BaseModel):
    query: str
    mode: str
