#!/usr/bin/env python3
"""Create a flattened, redacted copy of an invoice PDF.

The input file is never sent over the network. Each PDF page is rasterized,
Tesseract extracts text and coordinates, Presidio identifies PII, and the
detected pixels are painted before a brand-new image-only PDF is produced.
"""

from __future__ import annotations

import io
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import fitz
import pytesseract
from PIL import Image, ImageDraw
from presidio_analyzer import (
    AnalyzerEngine,
    Pattern,
    PatternRecognizer,
    RecognizerRegistry,
)
from presidio_analyzer.nlp_engine import NlpEngineProvider
from pyzbar.pyzbar import decode as decode_barcodes


DPI = 200
SCALE = DPI / 72
OCR_LANGUAGE = "fra+eng"
MAX_PAGES = 20
MAX_RENDERED_PIXELS = 30_000_000
OCR_TIMEOUT_SECONDS = 30
PII_ENTITIES = [
    "PERSON",
    "LOCATION",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "IBAN_CODE",
    "FR_POSTAL_CODE",
    "POSTAL_ADDRESS",
    "CUSTOMER_IDENTIFIER",
    "ORDER_IDENTIFIER",
]
SENSITIVE_ANCHORS = re.compile(
    r"\b(client|cliente|livr(?:é|e|aison)|destinataire|factur(?:é|e|ation)|"
    r"adresse|coordonn(?:é|e)es|t(?:é|e)l(?:éphone)?|mobile|courriel|e-?mail|"
    r"fid(?:é|e)lit(?:é|e)|iban|titulaire|porteur)\b",
    re.IGNORECASE,
)
STOP_ANCHORS = re.compile(
    r"\b(d(?:é|e)signation|article|produit|libell(?:é|e)|quantit(?:é|e)|qte|"
    r"prix\s+unitaire|total\s+ttc|d(?:é|e)tail\s+de\s+la\s+commande)\b",
    re.IGNORECASE,
)


def build_analyzer() -> AnalyzerEngine:
    configuration = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "fr", "model_name": "fr_core_news_md"}],
    }
    nlp_engine = NlpEngineProvider(nlp_configuration=configuration).create_engine()
    registry = RecognizerRegistry(supported_languages=["fr"])

    recognizers = [
        PatternRecognizer(
            supported_entity="EMAIL_ADDRESS",
            supported_language="fr",
            patterns=[Pattern("email", r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", 0.95)],
        ),
        PatternRecognizer(
            supported_entity="PHONE_NUMBER",
            supported_language="fr",
            patterns=[
                Pattern(
                    "phone_fr",
                    r"(?<!\d)(?:(?:\+|00)33[ .-]?[1-9]|0[1-9])(?:[ .-]?\d{2}){4}(?!\d)",
                    0.85,
                )
            ],
        ),
        PatternRecognizer(
            supported_entity="IBAN_CODE",
            supported_language="fr",
            patterns=[
                Pattern(
                    "iban",
                    r"\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b",
                    0.9,
                )
            ],
        ),
        PatternRecognizer(
            supported_entity="FR_POSTAL_CODE",
            supported_language="fr",
            patterns=[Pattern("postal_code_fr", r"(?<!\d)(?:0[1-9]|[1-8]\d|9[0-8])\d{3}(?!\d)", 0.65)],
            context=["adresse", "livraison", "facturation", "ville"],
        ),
        PatternRecognizer(
            supported_entity="POSTAL_ADDRESS",
            supported_language="fr",
            patterns=[
                Pattern(
                    "street_address_fr",
                    r"(?i)\b\d{1,4}(?:\s*(?:bis|ter))?\s+(?:rue|avenue|av\.?|boulevard|bd\.?|chemin|impasse|place|all(?:é|e)e|route|quai)\b.+$",
                    0.85,
                )
            ],
        ),
        PatternRecognizer(
            supported_entity="CUSTOMER_IDENTIFIER",
            supported_language="fr",
            patterns=[
                Pattern(
                    "customer_id",
                    r"(?i)\b(?:client|fid(?:é|e)lit(?:é|e)|compte)\s*(?:n[°o]|id|#|:)?\s*[A-Z0-9-]{4,}\b",
                    0.85,
                )
            ],
        ),
        PatternRecognizer(
            supported_entity="ORDER_IDENTIFIER",
            supported_language="fr",
            patterns=[
                Pattern(
                    "invoice_or_order_id",
                    r"(?i)\b(?:facture|commande)\s*(?:n(?:°|o)|num(?:é|e)ro|#|:)\s*[A-Z0-9-]{3,}\b",
                    0.85,
                )
            ],
        ),
    ]
    for recognizer in recognizers:
        registry.add_recognizer(recognizer)
    registry.add_nlp_recognizer(nlp_engine)

    return AnalyzerEngine(
        nlp_engine=nlp_engine,
        registry=registry,
        supported_languages=["fr"],
    )


def group_ocr_words(image: Image.Image):
    data = pytesseract.image_to_data(
        image,
        lang=OCR_LANGUAGE,
        config="--oem 1 --psm 6",
        output_type=pytesseract.Output.DICT,
        timeout=OCR_TIMEOUT_SECONDS,
    )
    lines = defaultdict(list)
    for index, raw_text in enumerate(data["text"]):
        text = raw_text.strip()
        confidence = float(data["conf"][index])
        if not text or confidence < 20:
            continue
        key = (
            data["block_num"][index],
            data["par_num"][index],
            data["line_num"][index],
        )
        lines[key].append(
            {
                "text": text,
                "left": data["left"][index],
                "top": data["top"][index],
                "width": data["width"][index],
                "height": data["height"][index],
            }
        )
    return list(lines.values())


def line_text_with_offsets(words):
    parts = []
    cursor = 0
    for word in words:
        if parts:
            parts.append(" ")
            cursor += 1
        start = cursor
        parts.append(word["text"])
        cursor += len(word["text"])
        word["start"] = start
        word["end"] = cursor
    return "".join(parts)


def expanded_box(word, image: Image.Image, padding: int = 5):
    left = max(0, word["left"] - padding)
    top = max(0, word["top"] - padding)
    right = min(image.width, word["left"] + word["width"] + padding)
    bottom = min(image.height, word["top"] + word["height"] + padding)
    return (left, top, right, bottom)


def is_payment_card(value: str) -> bool:
    digits = [int(character) for character in value if character.isdigit()]
    if not 13 <= len(digits) <= 19:
        return False
    if is_gtin("".join(str(digit) for digit in digits)):
        return False
    checksum = 0
    parity = len(digits) % 2
    for index, digit in enumerate(digits):
        if index % 2 == parity:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    return checksum % 10 == 0


def is_gtin(value: str) -> bool:
    if not re.fullmatch(r"\d{8}|\d{12}|\d{13}", value):
        return False
    body = [int(character) for character in value[:-1]]
    expected = (10 - sum(
        digit * (3 if (len(body) - index) % 2 else 1)
        for index, digit in enumerate(body)
    ) % 10) % 10
    return expected == int(value[-1])


def redact_page(image: Image.Image, analyzer: AnalyzerEngine) -> int:
    lines = group_ocr_words(image)
    boxes = set()
    redact_following_lines = 0

    for words in lines:
        text = line_text_with_offsets(words)

        if STOP_ANCHORS.search(text):
            redact_following_lines = 0

        anchored = bool(SENSITIVE_ANCHORS.search(text))
        if anchored:
            redact_following_lines = 4

        if anchored or redact_following_lines > 0:
            boxes.update(expanded_box(word, image) for word in words)
            if not anchored:
                redact_following_lines -= 1

        for match in re.finditer(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)", text):
            if not is_payment_card(match.group()):
                continue
            for word in words:
                if word["start"] < match.end() and word["end"] > match.start():
                    boxes.add(expanded_box(word, image))

        results = analyzer.analyze(
            text=text,
            language="fr",
            entities=PII_ENTITIES,
            score_threshold=0.45,
        )
        for result in results:
            for word in words:
                if word["start"] < result.end and word["end"] > result.start:
                    boxes.add(expanded_box(word, image))

    for symbol in decode_barcodes(image):
        value = symbol.data.decode("ascii", errors="ignore").strip()
        is_product_gtin = symbol.type != "QRCODE" and is_gtin(value)
        if is_product_gtin:
            continue
        rect = symbol.rect
        boxes.add(
            (
                max(0, rect.left - 8),
                max(0, rect.top - 8),
                min(image.width, rect.left + rect.width + 8),
                min(image.height, rect.top + rect.height + 8),
            )
        )

    draw = ImageDraw.Draw(image)
    for box in boxes:
        draw.rectangle(box, fill="white")
    return len(boxes)


def anonymize(input_path: Path, output_path: Path, report_path: Path) -> None:
    analyzer = build_analyzer()
    source = fitz.open(input_path)
    output = fitz.open()
    total_redactions = 0
    try:
        if source.page_count == 0:
            raise ValueError("The PDF has no pages")
        if source.page_count > MAX_PAGES:
            raise ValueError(f"The PDF exceeds the {MAX_PAGES}-page safety limit")

        for page in source:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), alpha=False)
            if pixmap.width * pixmap.height > MAX_RENDERED_PIXELS:
                raise ValueError("A rendered PDF page exceeds the pixel safety limit")
            image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
            total_redactions += redact_page(image, analyzer)

            image_stream = io.BytesIO()
            image.save(image_stream, format="JPEG", quality=90, optimize=True)
            target_page = output.new_page(width=page.rect.width, height=page.rect.height)
            target_page.insert_image(target_page.rect, stream=image_stream.getvalue())

        output.set_metadata({})
        output.save(output_path, garbage=4, deflate=True, clean=True)
    finally:
        output.close()
        source.close()

    with fitz.open(output_path) as anonymized:
        pages = anonymized.page_count
    report_path.write_text(
        json.dumps(
            {
                "pages": pages,
                "redactions": total_redactions,
                "rasterized": True,
            }
        ),
        encoding="utf-8",
    )


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: anonymize-invoice.py INPUT OUTPUT REPORT")
    anonymize(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))


if __name__ == "__main__":
    main()
