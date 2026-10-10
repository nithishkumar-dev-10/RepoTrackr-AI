from fastapi import APIRouter, Depends, status

from app.features.repos.dependencies import get_owned_repo
from app.models.repo import Repo

router = APIRouter(prefix="/repos/{repo_id}/index", tags=["stubs"])


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def start_index(repo: Repo = Depends(get_owned_repo)) -> dict[str, str]:
    return {"status": "not_implemented"}


@router.get("/status", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def index_status(repo: Repo = Depends(get_owned_repo)) -> dict[str, str]:
    return {"status": "not_implemented"}


@router.get("/summary", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def index_summary(repo: Repo = Depends(get_owned_repo)) -> dict[str, str]:
    return {"status": "not_implemented"}
