"""Production prescription PDF renderer (ReportLab)."""

from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.schedule.models.clinical import Prescription


def _safe(value: Any, fallback: str = "—") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_prescription_pdf(
    prescription: Prescription,
    *,
    hospital_name: str,
) -> bytes:
    """Render a prescription PDF from live ORM data. No hardcoded clinical fields."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=f"Prescription {_safe(prescription.prescription_code)}",
        author=_safe(hospital_name),
    )

    styles = getSampleStyleSheet()
    clinic_style = ParagraphStyle(
        "ClinicName",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=colors.HexColor("#1a4f7a"),
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "RxSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#5b6b75"),
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    title_style = ParagraphStyle(
        "RxTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=colors.HexColor("#1b2730"),
        alignment=TA_CENTER,
        spaceBefore=2,
        spaceAfter=10,
    )
    label_style = ParagraphStyle(
        "RxLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=colors.HexColor("#5b6b75"),
        spaceAfter=1,
    )
    value_style = ParagraphStyle(
        "RxValue",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#1b2730"),
        leading=13,
    )
    value_bold = ParagraphStyle(
        "RxValueBold",
        parent=value_style,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "RxBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#1b2730"),
        leading=14,
        spaceAfter=4,
    )
    meta_style = ParagraphStyle(
        "RxMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#1b2730"),
        alignment=TA_RIGHT,
        leading=12,
    )
    footer_style = ParagraphStyle(
        "RxFooter",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        textColor=colors.HexColor("#5b6b75"),
        alignment=TA_LEFT,
    )
    cell_style = ParagraphStyle(
        "RxCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#1b2730"),
    )
    header_cell = ParagraphStyle(
        "RxHeaderCell",
        parent=cell_style,
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=colors.HexColor("#334155"),
    )

    patient = prescription.patient
    doctor = prescription.doctor
    appointment = prescription.appointment

    patient_name = "—"
    patient_code = "—"
    patient_age = "—"
    patient_gender = "—"
    if patient:
        patient_name = f"{patient.first_name} {patient.last_name}".strip() or "—"
        patient_code = _safe(patient.patient_code)
        patient_age = _safe(getattr(patient, "age", None))
        patient_gender = _safe(patient.gender)

    doctor_name = "—"
    specialization = "—"
    if doctor:
        doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}".strip()
        specialization = _safe(doctor.specialization)

    appointment_code = _safe(appointment.appointment_code) if appointment else "—"
    appointment_date = (
        appointment.appointment_date.isoformat()
        if appointment and appointment.appointment_date
        else "—"
    )
    prescribed_on = (
        prescription.prescribed_on.isoformat()
        if prescription.prescribed_on
        else "—"
    )

    story: list[Any] = []
    story.append(Paragraph(_escape(_safe(hospital_name)), clinic_style))
    story.append(Paragraph("Digital Prescription", subtitle_style))
    story.append(Paragraph("PRESCRIPTION", title_style))
    story.append(
        HRFlowable(
            width="100%",
            thickness=1.2,
            color=colors.HexColor("#2b6cb0"),
            spaceBefore=0,
            spaceAfter=10,
        )
    )

    meta_table = Table(
        [
            [
                Paragraph(
                    f"<b>Rx #</b> {_escape(_safe(prescription.prescription_code))}",
                    value_style,
                ),
                Paragraph(
                    f"<b>Date</b> {_escape(prescribed_on)}<br/>"
                    f"<b>Visit</b> {_escape(appointment_code)} · {_escape(appointment_date)}",
                    meta_style,
                ),
            ]
        ],
        colWidths=[95 * mm, 75 * mm],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 8))

    parties = Table(
        [
            [
                [
                    Paragraph("DOCTOR", label_style),
                    Paragraph(_escape(doctor_name), value_bold),
                    Paragraph(_escape(specialization), value_style),
                ],
                [
                    Paragraph("PATIENT", label_style),
                    Paragraph(_escape(patient_name), value_bold),
                    Paragraph(
                        f"{_escape(patient_code)} · Age {_escape(patient_age)} · "
                        f"{_escape(patient_gender)}",
                        value_style,
                    ),
                ],
            ]
        ],
        colWidths=[85 * mm, 85 * mm],
    )
    parties.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f8fc")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#c5d8ea")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c5d8ea")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(parties)
    story.append(Spacer(1, 12))

    story.append(Paragraph("DIAGNOSIS", label_style))
    story.append(Paragraph(_escape(_safe(prescription.diagnosis)), body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("MEDICINES", label_style))
    story.append(Spacer(1, 3))

    med_header = [
        Paragraph("Medicine", header_cell),
        Paragraph("Dose", header_cell),
        Paragraph("Frequency", header_cell),
        Paragraph("Duration", header_cell),
        Paragraph("Instructions", header_cell),
    ]
    med_rows = [med_header]
    items = list(prescription.items or [])
    items.sort(key=lambda item: (item.sort_order, item.id))
    if not items:
        med_rows.append(
            [
                Paragraph("No medicines listed", cell_style),
                Paragraph("—", cell_style),
                Paragraph("—", cell_style),
                Paragraph("—", cell_style),
                Paragraph("—", cell_style),
            ]
        )
    else:
        for item in items:
            med_rows.append(
                [
                    Paragraph(_escape(_safe(item.medicine_name)), cell_style),
                    Paragraph(_escape(_safe(item.dose)), cell_style),
                    Paragraph(_escape(_safe(item.frequency)), cell_style),
                    Paragraph(_escape(_safe(item.duration)), cell_style),
                    Paragraph(_escape(_safe(item.instructions)), cell_style),
                ]
            )

    med_table = Table(
        med_rows,
        colWidths=[48 * mm, 24 * mm, 28 * mm, 26 * mm, 44 * mm],
        repeatRows=1,
    )
    med_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f1f8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c5d8ea")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#f8fbfd")],
                ),
            ]
        )
    )
    story.append(med_table)
    story.append(Spacer(1, 12))

    if prescription.advice:
        story.append(Paragraph("ADVICE", label_style))
        story.append(Paragraph(_escape(prescription.advice.strip()), body_style))
        story.append(Spacer(1, 6))

    if prescription.notes:
        story.append(Paragraph("CLINICAL NOTES", label_style))
        story.append(Paragraph(_escape(prescription.notes.strip()), body_style))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 18))
    story.append(
        HRFlowable(
            width="100%",
            thickness=0.6,
            color=colors.HexColor("#c5d8ea"),
            dash=(2, 2),
            spaceBefore=4,
            spaceAfter=10,
        )
    )

    sign_table = Table(
        [
            [
                Paragraph(
                    f"Digitally signed by {_escape(doctor_name)}",
                    footer_style,
                ),
                Paragraph(
                    "<font size='18' color='#2b6cb0'><b>℞</b></font>",
                    ParagraphStyle(
                        "RxGlyph",
                        parent=styles["Normal"],
                        alignment=TA_RIGHT,
                    ),
                ),
            ]
        ],
        colWidths=[130 * mm, 40 * mm],
    )
    sign_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(sign_table)
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "This prescription was generated electronically from hospital records.",
            ParagraphStyle(
                "RxDisclaimer",
                parent=footer_style,
                fontSize=8,
                alignment=TA_CENTER,
            ),
        )
    )

    doc.build(story)
    return buffer.getvalue()
