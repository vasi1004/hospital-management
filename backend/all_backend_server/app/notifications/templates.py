"""HTML + plain-text email templates. Branding and copy come from Settings."""

from __future__ import annotations

import html
from typing import Any, Mapping, Optional

from app.core.config import Settings
from app.core.roles import ROLE_LABELS


def _esc(value: Any) -> str:
    if value is None:
        return "—"
    text = str(value).strip()
    return html.escape(text) if text else "—"


def _role_label(role: str) -> str:
    key = (role or "").strip().lower()
    return ROLE_LABELS.get(key, (role or "User").replace("_", " ").title())


def _humanize(value: Optional[str]) -> str:
    if not value:
        return "—"
    return str(value).replace("_", " ").strip().title()


def _display(value: Any, *, humanize: bool = False) -> str:
    if value is None or (isinstance(value, str) and not value.strip()):
        return "—"
    if humanize:
        return _humanize(str(value))
    return str(value).strip()


def _shell(*, settings: Settings, title: str, intro: str, body_html: str, footer_note: str) -> str:
    brand = _esc(settings.hospital_display_name)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0f766e;padding:20px 24px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">{brand}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111827;">{_esc(title)}</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">{_esc(intro)}</p>
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">{_esc(footer_note)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">This message was sent by {brand}. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _detail_rows(rows: list[tuple[str, str]]) -> str:
    parts: list[str] = [
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">'
    ]
    for i, (label, value) in enumerate(rows):
        bg = "#ffffff" if i % 2 == 0 else "#f9fafb"
        parts.append(
            f'<tr style="background:{bg};">'
            f'<td style="padding:10px 14px;font-size:13px;color:#6b7280;width:38%;vertical-align:top;">{_esc(label)}</td>'
            f'<td style="padding:10px 14px;font-size:14px;color:#111827;font-weight:600;">{value}</td>'
            f"</tr>"
        )
    parts.append("</table>")
    return "".join(parts)


def build_user_created_email(
    *,
    settings: Settings,
    full_name: Optional[str],
    username: str,
    role: str,
    email: str,
    specialty: Optional[str] = None,
) -> tuple[str, str, str]:
    brand = settings.hospital_display_name
    display_name = (full_name or "").strip() or username
    role_label = _role_label(role)
    login_url = (settings.frontend_login_url or "").strip()
    specialty_value = (specialty or "").strip() or None

    subject = f"Your {brand} account has been created"
    intro = (
        f"Hello {display_name}, an administrator has created your {role_label} account "
        f"on {brand}."
    )
    rows = [
        ("Full name", display_name),
        ("Username", username),
        ("Email", email),
        ("Role", role_label),
    ]
    if specialty_value:
        rows.append(("Specialty", specialty_value))
    cta = ""
    if login_url:
        cta = (
            f'<p style="margin:20px 0 0;">'
            f'<a href="{html.escape(login_url)}" '
            f'style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;'
            f'padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;">'
            f"Go to sign in</a></p>"
        )
    body = (
        _detail_rows(rows)
        + '<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#374151;">'
        "For security, your password is not included in this email. "
        "Please contact your administrator for login credentials, or use the password "
        "reset option once it is available."
        "</p>"
        + cta
    )
    footer = "If you were not expecting this account, contact your hospital administrator."
    html_body = _shell(
        settings=settings,
        title="Account created",
        intro=intro,
        body_html=body,
        footer_note=footer,
    )
    text_parts = [
        f"{brand} — Account created",
        "",
        intro,
        "",
        f"Full name: {display_name}",
        f"Username: {username}",
        f"Email: {email}",
        f"Role: {role_label}",
    ]
    if specialty_value:
        text_parts.append(f"Specialty: {specialty_value}")
    text_parts.extend(
        [
            "",
            "Your password is not included in this email. "
            "Please contact your administrator for login credentials, "
            "or use password reset once available.",
        ]
    )
    if login_url:
        text_parts.append(f"Sign in: {login_url}")
    text_parts.extend(["", footer])
    return subject, html_body, "\n".join(text_parts)


def build_appointment_booked_email(
    *,
    settings: Settings,
    doctor_name: str,
    details: Mapping[str, Any],
) -> tuple[str, str, str]:
    brand = settings.hospital_display_name
    code = _display(details.get("appointment_code"))
    subject = f"New appointment booked — {code}"
    intro = (
        f"Hello Dr. {doctor_name}, a new appointment has been scheduled for you "
        f"on {brand}."
    )
    field_specs: list[tuple[str, str, bool]] = [
        ("Appointment code", "appointment_code", False),
        ("Date", "appointment_date", False),
        ("Time", "appointment_time", False),
        ("Patient", "patient_name", False),
        ("Patient code", "patient_code", False),
        ("Department", "department_name", False),
        ("Specialty", "specialty", False),
        ("Type", "appointment_type", True),
        ("Priority", "priority", True),
        ("Status", "status", True),
        ("Reason", "reason", False),
        ("Consultation fee", "consultation_fee", False),
        ("Notes", "notes", False),
        ("Booked by", "booked_by", False),
    ]
    html_rows: list[tuple[str, str]] = []
    text_lines = [
        f"{brand} — New appointment booked",
        "",
        intro,
        "",
    ]
    for label, key, humanize in field_specs:
        raw = details.get(key)
        shown = _display(raw, humanize=humanize)
        html_rows.append((label, shown))
        text_lines.append(f"{label}: {shown}")

    body = _detail_rows(html_rows)
    footer = "Please review this appointment in your doctor schedule."
    html_body = _shell(
        settings=settings,
        title="New appointment booked",
        intro=intro,
        body_html=body,
        footer_note=footer,
    )
    text_lines.extend(["", footer])
    return subject, html_body, "\n".join(text_lines)
