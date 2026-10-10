from fastapi import APIRouter, Depends, status

from app.features.repos.dependencies import get_owned_repo
from app.models.repo import Repo
from app.schemas.stub import StubQueryRequest

router = APIRouter(prefix="/repos/{repo_id}", tags=["stubs"])


@router.post("/context", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def build_context(
    payload: StubQueryRequest,
    repo: Repo = Depends(get_owned_repo),
) -> dict[str, str]:
    return {"status": "not_implemented"}


@router.post("/query", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def query_repo(
    payload: StubQueryRequest,
    repo: Repo = Depends(get_owned_repo),
) -> dict[str, str]:
    return {"status": "not_implemented"}
