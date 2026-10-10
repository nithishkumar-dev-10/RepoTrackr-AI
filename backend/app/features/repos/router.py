from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.features.auth.dependencies import get_current_user
from app.features.repos.dependencies import get_owned_repo
from app.models.repo import Repo
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.repo import GITHUB_HOST, RepoCreate, RepoListOut, RepoOut, parse_github_url

router = APIRouter(prefix="/repos", tags=["repos"])

REPO_EXISTS_MESSAGE = "Repo already added"
REPO_DELETED_MESSAGE = "Repo deleted."


@router.post("", response_model=RepoOut, status_code=status.HTTP_201_CREATED)
def create_repo(
    payload: RepoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Repo:
    owner, name = parse_github_url(payload.url)
    owner = owner.lower()
    name = name.lower()
    url = f"https://{GITHUB_HOST}/{owner}/{name}"

    existing = db.scalar(
        select(Repo).where(Repo.user_id == current_user.id, Repo.url == url)
    )
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, REPO_EXISTS_MESSAGE)

    repo = Repo(
        user_id=current_user.id,
        url=url,
        owner=owner,
        name=name,
        status="added",
    )
    db.add(repo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, REPO_EXISTS_MESSAGE)
    db.refresh(repo)
    return repo


@router.get("", response_model=RepoListOut)
def list_repos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RepoListOut:
    repos = db.scalars(
        select(Repo)
        .where(Repo.user_id == current_user.id)
        .order_by(Repo.created_at.desc(), Repo.id.desc())
    ).all()
    return RepoListOut(repos=list(repos))


@router.get("/{repo_id}", response_model=RepoOut)
def get_repo(repo: Repo = Depends(get_owned_repo)) -> Repo:
    return repo


@router.delete("/{repo_id}", response_model=MessageResponse)
def delete_repo(
    repo: Repo = Depends(get_owned_repo),
    db: Session = Depends(get_db),
) -> MessageResponse:
    db.delete(repo)
    db.commit()
    return MessageResponse(message=REPO_DELETED_MESSAGE)
