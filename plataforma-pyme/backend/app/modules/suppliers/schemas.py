"""RF-05: contratos estrictos de Proveedores, sin descuentos automáticos."""
from datetime import datetime
import ipaddress
import re
import unicodedata
from urllib.parse import urlsplit, urlunsplit
from uuid import UUID

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator
from typing import Annotated, Literal

SupplierStatus = Literal["ACTIVO", "INACTIVO"]
SupplierPayment = Literal[
    "EFECTIVO", "TRANSFERENCIA", "MERCADO_PAGO", "CUENTA_DNI",
    "TARJETA", "CHEQUE", "CUENTA_CORRIENTE",
]
Weekday = Annotated[StrictInt, Field(ge=0, le=6)]
_TEXT_LIMITS = {
    "name": (2, 90), "offerings": (0, 240), "contact_person": (0, 100),
    "phone": (0, 35), "whatsapp": (0, 35), "email": (0, 120),
    "address": (0, 160), "maps_url": (0, 2048), "website": (0, 2048),
    "instagram": (0, 31), "notes": (0, 650),
}


def clean_text(value: str, *, minimum: int, maximum: int, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label}: se requiere texto")
    # NFKC puede aumentar longitud o crear espacios de tipos distintos.
    cleaned = " ".join(unicodedata.normalize("NFKC", value).split())
    if not minimum <= len(cleaned) <= maximum:
        raise ValueError(f"{label}: debe contener entre {minimum} y {maximum} caracteres")
    if any(unicodedata.category(ch).startswith("C") for ch in cleaned):
        raise ValueError(f"{label}: caracteres de control inválidos")
    return cleaned


def normalized_name_key(name: str) -> str:
    key = clean_text(name, minimum=2, maximum=90, label="name").casefold()
    if len(key) > 90:
        raise ValueError("name: clave normalizada demasiado larga")
    return key


def _safe_url(value: str, *, maps: bool) -> str:
    if not value:
        return ""
    try:
        u = urlsplit(value)
        host = u.hostname
        if (u.scheme != "https" or not host or u.username is not None
                or u.password is not None or u.port is not None):
            raise ValueError("HTTPS sin usuario, contraseña ni puerto requerido")
        host = host.encode("idna").decode("ascii").lower().rstrip(".")
        if not host or not re.fullmatch(r"[a-z0-9.-]+", host):
            raise ValueError("Dominio no válido")
        if maps:
            allowed = (
                (host in {"google.com", "www.google.com"}
                 and (u.path == "/maps" or u.path.startswith("/maps/")))
                or host == "maps.app.goo.gl"
                or (host == "maps.google.com"
                    and (u.path not in {"", "/"} or "q=" in u.query))
                or (host == "goo.gl" and u.path.startswith("/maps/"))
            )
            if not allowed:
                raise ValueError("Solo URLs oficiales de Google Maps")
        else:
            if (len(host.split(".")) < 2
                    or host.endswith((".localhost", ".local", ".internal", ".test", ".invalid"))):
                raise ValueError("Sitio público requerido")
            try:
                ipaddress.ip_address(host)
            except ValueError:
                pass
            else:
                raise ValueError("IP directa no permitida")
        canonical = urlunsplit(("https", host, u.path or "/", u.query, u.fragment))
        if len(canonical) > 2048:
            raise ValueError("URL demasiado extensa")
        return canonical
    except (ValueError, UnicodeError) as exc:
        raise ValueError("URL HTTPS no válida o dominio no permitido") from exc


def normalized_contact(value: str, field: str) -> str:
    a, b = _TEXT_LIMITS[field]
    s = clean_text(value, minimum=a, maximum=b, label=field)
    if field == "phone" and s and not re.fullmatch(r"\+?[\d\s().-]{6,35}", s):
        raise ValueError("phone: formato telefónico inválido")
    if field == "whatsapp" and s:
        if not re.fullmatch(r"\+[1-9][\d\s().-]{6,22}", s):
            raise ValueError("whatsapp: se requiere prefijo internacional E.164")
        digits = re.sub(r"\D", "", s)
        if not 8 <= len(digits) <= 15:
            raise ValueError("whatsapp: longitud internacional inválida")
        s = "+" + digits
    if field == "email" and s:
        try:
            s = validate_email(s, check_deliverability=False).normalized.lower()
        except EmailNotValidError as exc:
            raise ValueError("email: dirección inválida") from exc
        if len(s) > b:
            raise ValueError("email: demasiado extenso")
    if field == "website":
        s = _safe_url(s, maps=False)
    if field == "maps_url":
        s = _safe_url(s, maps=True)
    if field == "instagram" and s:
        s = s.lstrip("@")
        if not re.fullmatch(r"[A-Za-z0-9._]{1,30}", s):
            raise ValueError("instagram: usuario inválido")
    return s


class SupplierPromotion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    days: list[Weekday] = Field(default_factory=list, max_length=7)
    payment_method: SupplierPayment | None = None
    benefit: str

    @field_validator("benefit")
    @classmethod
    def clean_benefit(cls, v: str) -> str:
        return clean_text(v, minimum=3, maximum=160, label="benefit")

    @field_validator("days")
    @classmethod
    def unique_weekdays(cls, v: list[int]) -> list[int]:
        if len(v) != len(set(v)):
            raise ValueError("Días duplicados en promoción")
        return sorted(v)


class SupplierFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    offerings: str = ""
    contact_person: str = ""
    phone: str = ""
    whatsapp: str = ""
    email: str = ""
    address: str = ""
    maps_url: str = ""
    website: str = ""
    instagram: str = ""
    notes: str = ""
    payment_methods: list[SupplierPayment] = Field(default_factory=list, max_length=7)
    promotions: list[SupplierPromotion] = Field(default_factory=list, max_length=8)

    @field_validator(*_TEXT_LIMITS.keys())
    @classmethod
    def normalize_strings(cls, v: str, info) -> str:
        return normalized_contact(v, info.field_name)

    @model_validator(mode="after")
    def check_unique_entries(self):
        normalized_name_key(self.name)
        if len(self.payment_methods) != len(set(self.payment_methods)):
            raise ValueError("Medios de pago duplicados")
        ids = [p.id for p in self.promotions]
        if len(ids) != len(set(ids)):
            raise ValueError("Promociones duplicadas")
        return self


class CreateSupplierRequest(SupplierFields):
    """Solo nombre requerido; estado, tenant e identificadores son protegidos."""


class UpdateSupplierRequest(BaseModel):
    """PATCH parcial no-null. Para limpiar un campo de contacto usar cadena vacía."""
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    offerings: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    address: str | None = None
    maps_url: str | None = None
    website: str | None = None
    instagram: str | None = None
    notes: str | None = None
    payment_methods: list[SupplierPayment] | None = Field(default=None, max_length=7)
    promotions: list[SupplierPromotion] | None = Field(default=None, max_length=8)

    @field_validator(*_TEXT_LIMITS.keys())
    @classmethod
    def normalize_strings(cls, v: str | None, info) -> str | None:
        return None if v is None else normalized_contact(v, info.field_name)

    @model_validator(mode="after")
    def check_patch(self):
        if not self.model_fields_set:
            raise ValueError("PATCH vacío")
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field}: usar valor explícito, no null")
        if "name" in self.model_fields_set:
            normalized_name_key(self.name)
        if "payment_methods" in self.model_fields_set:
            if len(self.payment_methods) != len(set(self.payment_methods)):
                raise ValueError("Medios de pago duplicados")
        if "promotions" in self.model_fields_set:
            ids = [p.id for p in self.promotions]
            if len(ids) != len(set(ids)):
                raise ValueError("Promociones duplicadas")
        return self


class ChangeSupplierStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: SupplierStatus


class SupplierView(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    offerings: str
    contact_person: str
    phone: str
    whatsapp: str
    email: str
    address: str
    maps_url: str
    website: str
    instagram: str
    notes: str
    payment_methods: list[SupplierPayment]
    promotions: list[SupplierPromotion]
    status: SupplierStatus
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, row: object) -> "SupplierView":
        return cls(
            id=row.id, business_id=row.business_id, name=row.name,
            offerings=row.offerings, contact_person=row.contact_person,
            phone=row.phone, whatsapp=row.whatsapp, email=row.email,
            address=row.address, maps_url=row.maps_url, website=row.website,
            instagram=row.instagram, notes=row.notes,
            payment_methods=row.payment_methods, promotions=row.promotions,
            status=row.status, created_at=row.created_at, updated_at=row.updated_at,
        )
