import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.features.repos.dependencies import get_owned_repo
from app.models.repo import Repo
from app.schemas.indexing import IndexStartOut, IndexStatusOut, IndexSummaryOut
from app.tasks import run_index_pipeline

logger = logging.getLogger("app")

router = APIRouter(prefix="/repos/{repo_id}/index", tags=["indexing"])

RUNNING_STATUSES = {"queued", "cloning", "indexing"}


@router.post("", response_model=IndexStartOut, status_code=status.HTTP_202_ACCEPTED)
def start_index(
    background_tasks: BackgroundTasks,
    repo: Repo = Depends(get_owned_repo),
    db: Session = Depends(get_db),
) -> IndexStartOut:
    if repo.status in RUNNING_STATUSES:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Indexing is already {repo.status} for this repo.",
        )

    repo.status = "queued"
    repo.error_message = None
    db.commit()
    db.refresh(repo)

    background_tasks.add_task(run_index_pipeline, repo.id)
    return IndexStartOut(status="queued", message="Indexing queued.")


@router.get("/status", response_model=IndexStatusOut)
def index_status(repo: Repo = Depends(get_owned_repo)) -> IndexStatusOut:
    return IndexStatusOut(
        status=repo.status,
        commit_sha=repo.commit_sha,
        error_message=repo.error_message,
    )


@router.get("/summary", response_model=IndexSummaryOut)
def index_summary(repo: Repo = Depends(get_owned_repo)) -> IndexSummaryOut:
    if repo.status != "ready" or not repo.index_summary:
        raise HTTPException(status.HTTP_409_CONFLICT, "Index is not ready.")

    try:
        return IndexSummaryOut(**repo.index_summary)
    except ValidationError as exc:
        logger.error("Stored index summary is invalid for repo %d: %s", repo.id, exc)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Stored index summary is invalid.",
        ) from exc
