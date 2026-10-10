from fastapi import APIRouter, Depends, status

from app.features.repos.dependencies import get_owned_repo
from app.models.repo import Repo

router = APIRouter(prefix="/repos/{repo_id}/agent", tags=["stubs"])


@router.get("/trace", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def agent_trace(repo: Repo = Depends(get_owned_repo)) -> dict[str, str]:
    return {"status": "not_implemented"}
