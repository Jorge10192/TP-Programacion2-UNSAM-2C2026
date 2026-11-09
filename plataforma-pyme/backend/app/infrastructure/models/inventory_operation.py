"""E2-5 A: encabezado idempotente de una operación física manual.

Aún NO existen servicios HTTP para transferir o ajustar existencias (E2-5 B/C).
Una operación agrupa, por artículo y empresa, el par de movimientos de traslado
o el movimiento único de ajuste/stock inicial. Su aplicación será transaccional.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint,
    String, UniqueConstraint, Uuid, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class InventoryOperation(Base):
    __tablename__ = "inventory_operations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "catalog_item_id"],
            ["catalog_items.business_id", "catalog_items.id"],
            name="fk_inventory_operations_catalog_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "source_location_id"],
            ["locations.business_id", "locations.id"],
            name="fk_inventory_operations_source_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "destination_location_id"],
            ["locations.business_id", "locations.id"],
            name="fk_inventory_operations_destination_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "actor_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_inventory_operations_actor_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "id", name="uq_inventory_operations_business_id_id"),
        # Permite FK compuesta que vincula evento y clase de operación sin depender solo de la API.
        UniqueConstraint("business_id", "id", "kind", name="uq_inventory_operations_business_id_kind"),
        UniqueConstraint("business_id", "request_id", name="uq_inventory_operations_business_request"),
        CheckConstraint(
            "kind IN ('TRASLADO','AJUSTE_ENTRADA','AJUSTE_SALIDA','STOCK_INICIAL')",
            name="ck_inventory_operations_kind",
        ),
        CheckConstraint(
            "quantity_milli BETWEEN 1 AND 999999999",
            name="ck_inventory_operations_quantity",
        ),
        CheckConstraint(
            "unit_snapshot IN ('UNIDAD','GRAMO','KILOGRAMO','MILILITRO','LITRO','PAQUETE','CAJA')",
            name="ck_inventory_operations_physical_unit",
        ),
        CheckConstraint(
            "unit_snapshot NOT IN ('UNIDAD','PAQUETE','CAJA') OR quantity_milli % 1000 = 0",
            name="ck_inventory_operations_discrete_quantity",
        ),
        CheckConstraint(
            "length(request_sha256) = 64", name="ck_inventory_operations_digest",
        ),
        CheckConstraint(
            "length(btrim(reason)) BETWEEN 3 AND 500", name="ck_inventory_operations_reason",
        ),
        CheckConstraint(
            "("
            "kind = 'TRASLADO' AND source_location_id IS NOT NULL "
            "AND destination_location_id IS NOT NULL "
            "AND source_location_id <> destination_location_id"
            ") OR ("
            "kind = 'AJUSTE_SALIDA' AND source_location_id IS NOT NULL "
            "AND destination_location_id IS NULL"
            ") OR ("
            "kind IN ('AJUSTE_ENTRADA','STOCK_INICIAL') "
            "AND source_location_id IS NULL AND destination_location_id IS NOT NULL"
            ")",
            name="ck_inventory_operations_direction_locations",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_inventory_operations_business", ondelete="RESTRICT"),
        nullable=False,
    )
    request_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    request_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    kind: Mapped[str] = mapped_column(String(24), nullable=False)
    catalog_item_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    unit_snapshot: Mapped[str] = mapped_column(String(16), nullable=False)
    quantity_milli: Mapped[int] = mapped_column(BigInteger, nullable=False)
    source_location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    destination_location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    actor_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
