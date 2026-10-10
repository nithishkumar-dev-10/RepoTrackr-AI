from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.features.auth.dependencies import get_current_user
from app.models.repo import Repo
from app.models.user import User

REPO_NOT_FOUND_MESSAGE = "Repo not found"


def get_owned_repo(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Repo:
    repo = db.scalar(
        select(Repo).where(Repo.id == repo_id, Repo.user_id == current_user.id)
    )
    if repo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, REPO_NOT_FOUND_MESSAGE)
    return repo
