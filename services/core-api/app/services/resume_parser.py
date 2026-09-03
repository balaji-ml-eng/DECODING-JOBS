"""Extracts plain text from an uploaded resume file (PDF or DOCX)."""

import io
import logging

logger = logging.getLogger("decoding_jobs.core_api.resume_parser")

SUPPORTED_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}


class UnsupportedResumeFormat(Exception):
    """Raised when the uploaded file isn't a PDF or DOCX."""


def extract_text(file_bytes: bytes, content_type: str) -> str:
    kind = SUPPORTED_CONTENT_TYPES.get(content_type)
    if kind is None:
        raise UnsupportedResumeFormat(f"Unsupported content type: {content_type}")

    if kind == "pdf":
        return _extract_pdf_text(file_bytes)
    return _extract_docx_text(file_bytes)


def _extract_pdf_text(file_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def _extract_docx_text(file_bytes: bytes) -> str:
    from docx import Document

    document = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in document.paragraphs]
    return "\n".join(paragraphs).strip()
