import logging
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.email import send_reset_email, send_verification_email
from app.core.ratelimit import limiter
from app.features.auth.dependencies import get_current_user
from app.models.email_token import EmailToken, EmailTokenType
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserOut,
    VerifyEmailRequest,
)
from app.schemas.common import MessageResponse
from app.security import (
    TokenError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    expires_at,
    generate_email_token,
    hash_password,
    hash_token,
    is_expired,
    is_used,
    verify_password,
)

logger = logging.getLogger("app.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

RESEND_MESSAGE = (
    "If the account exists and is unverified, a new verification email has been sent."
)
FORGOT_MESSAGE = (
    "If an account exists for that email, a password reset link has been sent."
)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _create_email_token(db: Session, user: User, token_type: EmailTokenType) -> str:
    raw_token, token_hash = generate_email_token()
    db.add(
        EmailToken(
            user_id=user.id,
            type=token_type,
            token_hash=token_hash,
            expires_at=expires_at(token_type),
        )
    )
    return raw_token


def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


def _invalidate_active_tokens(
    db: Session, user_id: int, token_type: EmailTokenType
) -> None:
    now = datetime.now(timezone.utc)
    active = db.scalars(
        select(EmailToken).where(
            EmailToken.user_id == user_id,
            EmailToken.type == token_type,
            EmailToken.used_at.is_(None),
        )
    ).all()
    for token in active:
        token.used_at = now


def _send_verification_safely(email: str, raw_token: str) -> None:
    try:
        send_verification_email(email, raw_token)
    except Exception:
        logger.exception("Failed to send verification email to %s", email)


def _send_reset_safely(email: str, raw_token: str) -> None:
    try:
        send_reset_email(email, raw_token)
    except Exception:
        logger.exception("Failed to send password reset email to %s", email)


@router.post(
    "/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED
)
@limiter.limit(lambda: get_settings().RATE_LIMIT_SIGNUP)
def signup(
    request: Request, payload: SignupRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    email = _normalize_email(payload.email)

    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already registered")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        is_verified=False,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already registered")

    raw_token = _create_email_token(db, user, EmailTokenType.VERIFY)
    db.commit()

    _send_verification_safely(email, raw_token)
    return MessageResponse(
        message="Account created. Check your email to verify your account."
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(
    payload: VerifyEmailRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    token = db.scalar(
        select(EmailToken).where(
            EmailToken.token_hash == hash_token(payload.token),
            EmailToken.type == EmailTokenType.VERIFY,
        )
    )
    if token is None or is_used(token.used_at) or is_expired(token.expires_at):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Invalid or expired verification token"
        )

    token.used_at = datetime.now(timezone.utc)
    user = db.get(User, token.user_id)
    if user is not None:
        user.is_verified = True
    db.commit()

    return MessageResponse(message="Email verified. You can now log in.")


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_RESEND_VERIFICATION)
def resend_verification(
    request: Request, payload: ResendVerificationRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))

    if user is None or user.is_verified:
        return MessageResponse(message=RESEND_MESSAGE)

    _invalidate_active_tokens(db, user.id, EmailTokenType.VERIFY)
    raw_token = _create_email_token(db, user, EmailTokenType.VERIFY)
    db.commit()

    _send_verification_safely(email, raw_token)
    return MessageResponse(message=RESEND_MESSAGE)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_LOGIN)
def login(
    request: Request, payload: LoginRequest, db: Session = Depends(get_db)
) -> TokenResponse:
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if not user.is_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Email not verified. Please verify your email before logging in.",
        )

    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        token_payload = decode_token(payload.refresh_token, TokenType.REFRESH)
        user_id = int(token_payload["sub"])
    except (TokenError, KeyError, ValueError):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token"
        )

    user = db.get(User, user_id)
    if user is None or not user.is_verified:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token"
        )

    return _issue_tokens(user)


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)) -> MessageResponse:
    return MessageResponse(message="Logged out.")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit(lambda: get_settings().RATE_LIMIT_FORGOT_PASSWORD)
def forgot_password(
    request: Request,
    background_tasks: BackgroundTasks,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))

    if user is not None:
        _invalidate_active_tokens(db, user.id, EmailTokenType.RESET)
        raw_token = _create_email_token(db, user, EmailTokenType.RESET)
        db.commit()
        background_tasks.add_task(_send_reset_safely, email, raw_token)

    return MessageResponse(message=FORGOT_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    token = db.scalar(
        select(EmailToken).where(
            EmailToken.token_hash == hash_token(payload.token),
            EmailToken.type == EmailTokenType.RESET,
        )
    )
    user = None if token is None else db.get(User, token.user_id)
    if (
        token is None
        or user is None
        or is_used(token.used_at)
        or is_expired(token.expires_at)
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Invalid or expired reset token"
        )

    user.password_hash = hash_password(payload.new_password)
    token.used_at = datetime.now(timezone.utc)
    db.commit()

    return MessageResponse(message="Password has been reset. You can now log in.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Current password is incorrect"
        )
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "New password must be different from the current password",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    return MessageResponse(message="Password changed.")


@router.delete("/account", response_model=MessageResponse)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    db.delete(current_user)
    db.commit()

    return MessageResponse(message="Account deleted.")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
