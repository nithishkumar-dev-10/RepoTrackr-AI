from fastapi import APIRouter, Depends, File, UploadFile, status

from app.features.repos.dependencies import get_owned_repo
from app.models.repo import Repo

router = APIRouter(prefix="/repos/{repo_id}/plan", tags=["stubs"])


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def upload_plan(
    repo: Repo = Depends(get_owned_repo),
    file: UploadFile = File(...),
) -> dict[str, str]:
    return {"status": "not_implemented"}


@router.get("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def get_plan(repo: Repo = Depends(get_owned_repo)) -> dict[str, str]:
    return {"status": "not_implemented"}
