"""Decodificar y normalizar únicamente fotografías JPEG, PNG o WebP.

No confiar en MIME/extension del cliente. Convierte a WebP estático y quita EXIF,
texto, comentarios y perfiles que puedan contener información personal.
"""
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

UPLOAD_LIMIT = 5 * 1024 * 1024
STORE_LIMIT = 2 * 1024 * 1024
MAX_PIXELS = 12_000_000
MAX_EDGE = 1280
ALLOWED_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


async def clean_photo(upload: UploadFile) -> tuple[bytes, int, int]:
    if upload.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, detail="Formatos admitidos: JPEG, PNG o WebP")
    raw = await upload.read(UPLOAD_LIMIT + 1)
    await upload.close()
    if not raw or len(raw) > UPLOAD_LIMIT:
        raise HTTPException(413, detail="Cada fotografía debe pesar hasta 5 MB")
    try:
        with Image.open(BytesIO(raw)) as first:
            if first.format not in ALLOWED_FORMATS or getattr(first, "n_frames", 1) != 1:
                raise HTTPException(415, detail="Se requiere una fotografía estática JPEG, PNG o WebP")
            if first.width * first.height > MAX_PIXELS:
                raise HTTPException(413, detail="La resolución de la foto supera el máximo admitido")
            first.verify()
        with Image.open(BytesIO(raw)) as original:
            normalized = ImageOps.exif_transpose(original)
            normalized.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
            # Logos PNG con fondo transparente deben conservar el canal alfa.
            has_alpha = "A" in normalized.getbands() or "transparency" in normalized.info
            normalized = normalized.convert("RGBA" if has_alpha else "RGB")
            width, height = normalized.size
            output = BytesIO()
            normalized.save(output, format="WEBP", quality=80, method=4)
            content = output.getvalue()
            if len(content) > STORE_LIMIT:
                output = BytesIO()
                normalized.save(output, format="WEBP", quality=65, method=4)
                content = output.getvalue()
            if not content or len(content) > STORE_LIMIT:
                raise HTTPException(413, detail="La fotografía procesada supera 2 MB")
            return content, width, height
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError) as exc:
        raise HTTPException(422, detail="Archivo de imagen corrupto o incompatible") from exc
