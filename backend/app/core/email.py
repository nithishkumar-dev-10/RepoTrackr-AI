import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger("app.email")


def send_email(to: str, subject: str, body: str) -> None:
    settings = get_settings()
    if not settings.SMTP_HOST:
        logger.warning(
            "SMTP not configured; email not sent. Printing instead.\n"
            "To: %s\nSubject: %s\n\n%s",
            to,
            subject,
            body,
        )
        return

    message = EmailMessage()
    message["From"] = settings.EMAIL_FROM or settings.SMTP_USER
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(message)


def verification_link(raw_token: str) -> str:
    base = get_settings().FRONTEND_URL.rstrip("/")
    return f"{base}/verify-email?token={raw_token}"


def send_verification_email(to: str, raw_token: str) -> None:
    link = verification_link(raw_token)
    send_email(
        to,
        "Verify your RepoTrackr AI account",
        "Welcome to RepoTrackr AI!\n\n"
        "Verify your email address by opening this link:\n"
        f"{link}\n\n"
        "If you did not create an account, you can ignore this email.",
    )


def reset_link(raw_token: str) -> str:
    base = get_settings().FRONTEND_URL.rstrip("/")
    return f"{base}/reset-password?token={raw_token}"


def send_reset_email(to: str, raw_token: str) -> None:
    link = reset_link(raw_token)
    send_email(
        to,
        "Reset your RepoTrackr AI password",
        "We received a request to reset your RepoTrackr AI password.\n\n"
        "Reset it by opening this link:\n"
        f"{link}\n\n"
        "If you did not request this, you can ignore this email.",
    )
