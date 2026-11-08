"""E2-4 C: documento de compra, sin recepción ni movimientos de stock.

El comando de E2-4 D comprobará el total como suma de los renglones HALF_UP,
estado derivado del tipo de renglones, proveedor/artículos activos y snapshots.
Este modelo deja una clave de reintento estable por empresa y evita referencias
de proveedores y autores de OTRO tenant mediante FK compuestas.
"""
from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, CheckConstraint, Date, DateTime, ForeignKey,
    ForeignKeyConstraint, Index, String, UniqueConstraint, Uuid, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class Purchase(Base):
    __tablename__ = "purchases"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "supplier_id"], ["suppliers.business_id", "suppliers.id"],
            name="fk_purchases_supplier_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "created_by_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_purchases_creator_membership_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "id", name="uq_purchases_business_id_id"),
        UniqueConstraint("business_id", "request_id", name="uq_purchases_business_request"),
        Index("ix_purchases_business_date", "business_id", "purchased_on"),
        CheckConstraint(
            "purchased_on BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'",
            name="ck_purchases_purchased_on",
        ),
        CheckConstraint(
            "status IN ('REGISTRADA', 'RECIBIDA', 'CERRADA_SIN_RECEPCION', 'CANCELADA')",
            name="ck_purchases_status",
        ),
        CheckConstraint(
            "total_cents BETWEEN 0 AND 99999999999",
            name="ck_purchases_total_cents",
        ),
        CheckConstraint(
            "supplier_id IS NOT NULL OR supplier_name_snapshot = ''",
            name="ck_purchases_supplier_snapshot_optional",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_purchases_business", ondelete="RESTRICT"),
        nullable=False,
    )
    request_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    supplier_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    supplier_name_snapshot: Mapped[str] = mapped_column(
        String(90), nullable=False, default="", server_default=text("''"),
    )
    purchased_on: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reference: Mapped[str] = mapped_column(
        String(70), nullable=False, default="", server_default=text("''"),
    )
    notes: Mapped[str] = mapped_column(
        String(500), nullable=False, default="", server_default=text("''"),
    )
    created_by_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
