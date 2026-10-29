from pathlib import Path

FORBIDDEN_IMPORT_MARKERS = (
    "import fastapi",
    "from fastapi",
    "import pydantic",
    "from pydantic",
    "import sqlalchemy",
    "from sqlalchemy",
    "import uvicorn",
    "from uvicorn",
    "from app.api",
    "from app.application",
    "from app.infrastructure",
)


def test_catalog_domain_is_framework_and_outer_layer_free() -> None:
    catalog_dir = (
        Path(__file__).resolve().parents[4]
        / "src"
        / "app"
        / "domain"
        / "catalog"
    )

    violations: list[str] = []

    for source_file in sorted(catalog_dir.glob("*.py")):
        content = source_file.read_text(encoding="utf-8").lower()
        for marker in FORBIDDEN_IMPORT_MARKERS:
            if marker in content:
                violations.append(f"{source_file.name}: {marker}")

    assert violations == []
