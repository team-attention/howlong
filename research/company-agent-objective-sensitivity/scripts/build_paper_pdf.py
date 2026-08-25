from __future__ import annotations

import html
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "paper" / "mock-paper-v0.md"
OUTPUT = ROOT / "output" / "pdf" / "mock-paper-v0.pdf"


def inline_markup(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"`(.+?)`", r"<font name='Courier'>\1</font>", escaped)
    escaped = re.sub(r"\[(.+?)\]\((.+?)\)", r"<link href='\2'>\1</link>", escaped)
    return escaped


def footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#B8B8B8"))
    canvas.line(0.72 * inch, 0.55 * inch, 7.78 * inch, 0.55 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.drawString(0.72 * inch, 0.35 * inch, "MOCK PAPER V0 - DESIGN ONLY")
    canvas.drawRightString(7.78 * inch, 0.35 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Times-Roman",
        fontSize=9.2,
        leading=11.8,
        spaceAfter=6,
        alignment=TA_LEFT,
    )
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#111111"),
        spaceAfter=12,
    )
    subtitle = ParagraphStyle(
        "Subtitle",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#B42318"),
        spaceAfter=16,
    )
    heading_styles = {
        1: ParagraphStyle(
            "H1",
            parent=body,
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=17,
            spaceBefore=12,
            spaceAfter=6,
            textColor=colors.HexColor("#1F3A5F"),
        ),
        2: ParagraphStyle(
            "H2",
            parent=body,
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            spaceBefore=8,
            spaceAfter=4,
        ),
    }
    bullet = ParagraphStyle(
        "Bullet", parent=body, leftIndent=14, firstLineIndent=-8, bulletIndent=4
    )
    code = ParagraphStyle(
        "Code",
        parent=body,
        fontName="Courier",
        fontSize=7.5,
        leading=9.5,
        leftIndent=10,
        rightIndent=10,
        backColor=colors.HexColor("#F1F3F5"),
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=8,
    )
    notice = ParagraphStyle(
        "Notice",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#8A1C12"),
        borderColor=colors.HexColor("#D92D20"),
        borderWidth=0.8,
        borderPadding=8,
        backColor=colors.HexColor("#FFF1F0"),
        spaceAfter=12,
    )

    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=0.72 * inch,
        leftMargin=0.72 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.72 * inch,
        title="Objective Sensitivity in Enterprise Agents - Mock Paper V0",
        author="Design document",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="paper", frames=[frame], onPage=footer)])

    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    story = [
        Spacer(1, 0.35 * inch),
        Paragraph(
            "Objective Sensitivity in Enterprise Agents:<br/>"
            "Paired Audits of KPI-Induced Behavior",
            title,
        ),
        Paragraph("MOCK PAPER V0 - DESIGN DOCUMENT, NOT EMPIRICAL RESULTS", subtitle),
        Paragraph("Prepared 2026-07-23", subtitle),
    ]
    paragraph: list[str] = []
    in_code = False
    code_lines: list[str] = []
    in_frontmatter = False
    in_math = False
    math_lines: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            text = " ".join(part.strip() for part in paragraph)
            style = notice if "This is a mock paper" in text else body
            story.append(Paragraph(inline_markup(text), style))
            paragraph.clear()

    for line in lines:
        if line.strip() == "---":
            if not story or in_frontmatter:
                in_frontmatter = not in_frontmatter
            else:
                in_frontmatter = not in_frontmatter
            continue
        if in_frontmatter:
            continue
        if line.strip().startswith("```"):
            flush_paragraph()
            if in_code:
                story.append(Preformatted("\n".join(code_lines), code))
                code_lines.clear()
            in_code = not in_code
            continue
        if in_code:
            code_lines.append(line)
            continue
        if line.strip() == r"\[":
            flush_paragraph()
            in_math = True
            continue
        if line.strip() == r"\]":
            story.append(Preformatted("\n".join(math_lines), code))
            math_lines.clear()
            in_math = False
            continue
        if in_math:
            math_lines.append(line)
            continue
        if not line.strip():
            flush_paragraph()
            continue
        if line.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[2:]), heading_styles[1]))
        elif line.startswith("## "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[3:]), heading_styles[2]))
        elif re.match(r"^\d+\.\s", line):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line), bullet))
        elif line.startswith("- "):
            flush_paragraph()
            story.append(Paragraph("• " + inline_markup(line[2:]), bullet))
        else:
            paragraph.append(line)
    flush_paragraph()
    doc.build(story)


if __name__ == "__main__":
    build()
