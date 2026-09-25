"""Shared HMS role constants for backend validation and docs."""

from typing import Final, Literal

RoleLiteral = Literal["admin", "doctor", "receptionist", "patient"]

ROLES: Final[tuple[str, ...]] = ("admin", "doctor", "receptionist", "patient")

ROLE_LABELS: Final[dict[str, str]] = {
    "admin": "Administrator",
    "doctor": "Doctor",
    "receptionist": "Receptionist",
    "patient": "Patient",
}
