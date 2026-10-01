"""Resend HTTP client — thin wrapper around the official SDK."""

from __future__ import annotations

import logging
from typing import Any, Optional

import resend

from app.core.config import get_settings

logger = logging.getLogger("all_backend_server.email")


def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    text: str,
) -> Optional[dict[str, Any]]:
    """
    Send one email via Resend.

    Returns the provider response dict on success, or None when skipped.
    Raises on provider/network errors (callers must catch).
    """
    settings = get_settings()
    if not settings.email_enabled:
        logger.info("Email skipped: EMAIL_ENABLED=false (to=%s subject=%s)", to, subject)
        return None
    api_key = (settings.resend_api_key or "").strip()
    if not api_key:
        logger.info("Email skipped: RESEND_API_KEY not set (to=%s subject=%s)", to, subject)
        return None
    to_addr = (to or "").strip()
    if not to_addr:
        logger.warning("Email skipped: empty recipient (subject=%s)", subject)
        return None

    resend.api_key = api_key
    from_header = f"{settings.email_from_name} <{settings.email_from}>"
    payload: resend.Emails.SendParams = {
        "from": from_header,
        "to": [to_addr],
        "subject": subject,
        "html": html,
        "text": text,
    }
    result = resend.Emails.send(payload)
    logger.info("Email sent via Resend to=%s subject=%s id=%s", to_addr, subject, result)
    return result if isinstance(result, dict) else {"result": result}
