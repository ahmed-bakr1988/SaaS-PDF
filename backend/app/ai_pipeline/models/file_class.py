"""FileClass enum — canonical classification for every supported input type."""

from enum import Enum


class FileClass(str, Enum):
    PDF = "pdf"
    OFFICE = "office"      # DOCX, XLSX, PPTX
    TEXT = "text"          # TXT, MD, HTML, LOG
    DATA = "data"          # CSV, JSON, XML, SQL
    CONFIG = "config"      # .env, YAML, TOML
    IMAGE = "image"        # PNG, JPG, WEBP, TIFF, BMP
    VIDEO = "video"        # MP4, WEBM
    ZIP = "zip"            # Generic ZIP (non-code archive)
    CODE = "code"          # ZIP that looks like a code project
    UNKNOWN = "unknown"
