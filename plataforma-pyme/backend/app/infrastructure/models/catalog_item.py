"""Artículo de catálogo del tenant; los servicios no son existencias físicas.

E2-3 A: solo persistencia, sin stock, compras, ventas o API HTTP todavía.
El servicio E2-3 B generará name_key (NFKC, espacios colapsados, casefold)
y SKU canónico en mayúsculas. Las restricciones SQL resuelven las carreras.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index,
    String, UniqueConstraint, Uuid, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class CatalogItem(Base):
    __tablename__ = "catalog_items"
    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_catalog_items_business_id_id"),
        UniqueConstraint("business_id", "name_key", name="uq_catalog_items_business_name"),
        Index("ix_catalog_items_business_id", "business_id"),
        Index(
            "uq_catalog_items_business_sku", "business_id", "sku",
            unique=True, postgresql_where=text("sku IS NOT NULL"),
        ),
        CheckConstraint(
            "length(btrim(name)) BETWEEN 2 AND 90",
            name="ck_catalog_items_name_length",
        ),
        CheckConstraint(
            "length(btrim(name_key)) BETWEEN 2 AND 90",
            name="ck_catalog_items_name_key_length",
        ),
        CheckConstraint(
            "length(btrim(category)) BETWEEN 2 AND 60",
            name="ck_catalog_items_category_length",
        ),
        CheckConstraint(
            "kind IN ('ELABORADO', 'REVENTA', 'INSUMO', 'SERVICIO')",
            name="ck_catalog_items_kind",
        ),
        CheckConstraint(
            "unit IN ('UNIDAD', 'GRAMO', 'KILOGRAMO', 'MILILITRO', "
            "'LITRO', 'PAQUETE', 'CAJA', 'SERVICIO')",
            name="ck_catalog_items_unit",
        ),
        CheckConstraint(
            "(kind = 'SERVICIO' AND unit = 'SERVICIO') OR "
            "(kind <> 'SERVICIO' AND unit <> 'SERVICIO')",
            name="ck_catalog_items_kind_unit",
        ),
        CheckConstraint(
            "sku IS NULL OR sku ~ '^[A-Z0-9._-]{1,32}$'",
            name="ck_catalog_items_sku_format",
        ),
        CheckConstraint(
            "price_cents IS NULL OR price_cents BETWEEN 0 AND 99999999999",
            name="ck_catalog_items_price_cents",
        ),
        CheckConstraint(
            "reference_cost_cents IS NULL OR "
            "reference_cost_cents BETWEEN 0 AND 99999999999",
            name="ck_catalog_items_reference_cost_cents",
        ),
        CheckConstraint(
            "status IN ('ACTIVO', 'INACTIVO')",
            name="ck_catalog_items_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_catalog_items_business", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(90), nullable=False)
    name_key: Mapped[str] = mapped_column(String(90), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    category: Mapped[str] = mapped_column(
        String(60), nullable=False, default="General", server_default=text("'General'")
    )
    sku: Mapped[str | None] = mapped_column(String(32), nullable=True)
    unit: Mapped[str] = mapped_column(String(16), nullable=False)
    description: Mapped[str] = mapped_column(
        String(450), nullable=False, default="", server_default=text("''")
    )
    observations: Mapped[str] = mapped_column(
        String(600), nullable=False, default="", server_default=text("''")
    )
    sellable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    price_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    reference_cost_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="ACTIVO",
        server_default=text("'ACTIVO'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
        onupdate=func.now(),
    )

    @property
    def item_type(self) -> str:
        """Vista conceptual BIEN/SERVICIO sin duplicar un campo mutable en SQL."""
        return "SERVICIO" if self.kind == "SERVICIO" else "BIEN"
