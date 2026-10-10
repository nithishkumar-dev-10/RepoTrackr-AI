from fastapi import APIRouter, Depends, status

from app.features.repos.dependencies import get_owned_repo
from app.models.repo import Repo

router = APIRouter(prefix="/repos/{repo_id}/reader", tags=["stubs"])


@router.get("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def reader_guide(repo: Repo = Depends(get_owned_repo)) -> dict[str, str]:
    return {"status": "not_implemented"}
