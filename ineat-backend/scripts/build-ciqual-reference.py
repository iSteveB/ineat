#!/usr/bin/env python3
"""Build the compact fruit-and-vegetable CIQUAL reference used at runtime.

Usage: python3 scripts/build-ciqual-reference.py /path/to/ciqual.xlsx
The XLSX is the official ANSES CIQUAL 2025 workbook. Only Python's standard
library is used so refreshing the reference does not add an app dependency.
"""

import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src" / "ciqual" / "data" / "ciqual-2025-fresh-foods.json"

CIQUAL_GROUP_TO_CATEGORY = {
    "02": "fruits-et-legumes",
    "04": "viandes-et-poissons",
}


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFD", value or "")
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", value.lower())).strip()


def number(value):
    if not value or value == "-":
        return None
    if value.lower() == "traces":
        return 0
    match = re.search(r"\d+(?:,\d+)?", value)
    return float(match.group().replace(",", ".")) if match else None


def main(source: Path) -> None:
    with zipfile.ZipFile(source) as workbook:
        shared = []
        for _, element in ET.iterparse(workbook.open("xl/sharedStrings.xml"), events=("end",)):
            if element.tag == NS + "si":
                shared.append("".join(node.text or "" for node in element.iter(NS + "t")))
                element.clear()

        foods = []
        for _, element in ET.iterparse(
            workbook.open("xl/worksheets/sheet1.xml"), events=("end",)
        ):
            if element.tag != NS + "row":
                continue
            values = {}
            for cell in element.findall(NS + "c"):
                column = re.match(r"[A-Z]+", cell.attrib["r"]).group()
                raw = cell.find(NS + "v")
                if raw is not None:
                    values[column] = (
                        shared[int(raw.text)] if cell.attrib.get("t") == "s" else raw.text
                    )
            element.clear()
            category = CIQUAL_GROUP_TO_CATEGORY.get(values.get("A"))
            if not category:
                continue

            name = values.get("H", "").replace("\n", " ").strip()
            nutrients = {
                "energy": number(values.get("K")),
                "proteins": number(values.get("O")) or number(values.get("P")),
                "carbohydrates": number(values.get("Q")),
                "fats": number(values.get("R")),
                "sugars": number(values.get("S")),
                "fiber": number(values.get("AA")),
                "saturatedFats": number(values.get("AF")),
                "salt": number(values.get("AX")),
            }
            foods.append(
                {
                    "code": values["G"],
                    "category": category,
                    "name": name,
                    "normalizedName": normalize(name),
                    "nutrients": {key: value for key, value in nutrients.items() if value is not None},
                }
            )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(
            {
                "source": "Anses. 2025. Table de composition nutritionnelle des aliments Ciqual",
                "version": "2025-11-03",
                "foods": foods,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(foods)} foods to {OUTPUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: build-ciqual-reference.py /path/to/ciqual.xlsx")
    main(Path(sys.argv[1]))
