"""Proveedor empresarial. E2-4 A: solo persistencia; sin rutas HTTP ni compras.

La API E2-4 B deberá calcular name_key a partir de name (NFKC, espacios
colapsados y casefold), validar contactos, URLs y estructuras JSON. Los índices
en PostgreSQL protegen las claves ya canónicas incluso entre proveedores INACTIVO.
Los arreglos JSON se reemplazan por completo al editar, no se mutan in-place.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, Uuid, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class Supplier(Base):
    __tablename__ = "suppliers"
    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_suppliers_business_id_id"),
        UniqueConstraint("business_id", "name_key", name="uq_suppliers_business_name"),
        Index("ix_suppliers_business_id", "business_id"),
        CheckConstraint(
            "length(btrim(name)) BETWEEN 2 AND 90",
            name="ck_suppliers_name_length",
        ),
        CheckConstraint(
            "length(btrim(name_key)) BETWEEN 2 AND 90",
            name="ck_suppliers_name_key_length",
        ),
        CheckConstraint(
            "status IN ('ACTIVO', 'INACTIVO')",
            name="ck_suppliers_status",
        ),
        CheckConstraint(
            "CASE WHEN jsonb_typeof(payment_methods) = 'array' "
            "THEN jsonb_array_length(payment_methods) <= 7 ELSE false END",
            name="ck_suppliers_payment_methods_array",
        ),
        CheckConstraint(
            "CASE WHEN jsonb_typeof(promotions) = 'array' "
            "THEN jsonb_array_length(promotions) <= 8 ELSE false END",
            name="ck_suppliers_promotions_array",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_suppliers_business", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(90), nullable=False)
    name_key: Mapped[str] = mapped_column(String(90), nullable=False)
    offerings: Mapped[str] = mapped_column(
        String(240), nullable=False, default="", server_default=text("''"),
    )
    contact_person: Mapped[str] = mapped_column(
        String(100), nullable=False, default="", server_default=text("''"),
    )
    phone: Mapped[str] = mapped_column(
        String(35), nullable=False, default="", server_default=text("''"),
    )
    whatsapp: Mapped[str] = mapped_column(
        String(35), nullable=False, default="", server_default=text("''"),
    )
    email: Mapped[str] = mapped_column(
        String(120), nullable=False, default="", server_default=text("''"),
    )
    address: Mapped[str] = mapped_column(
        String(160), nullable=False, default="", server_default=text("''"),
    )
    maps_url: Mapped[str] = mapped_column(
        String(2048), nullable=False, default="", server_default=text("''"),
    )
    website: Mapped[str] = mapped_column(
        String(2048), nullable=False, default="", server_default=text("''"),
    )
    instagram: Mapped[str] = mapped_column(
        String(31), nullable=False, default="", server_default=text("''"),
    )
    notes: Mapped[str] = mapped_column(
        String(650), nullable=False, default="", server_default=text("''"),
    )
    payment_methods: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"),
    )
    promotions: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"),
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="ACTIVO", server_default=text("'ACTIVO'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now(),
    )
