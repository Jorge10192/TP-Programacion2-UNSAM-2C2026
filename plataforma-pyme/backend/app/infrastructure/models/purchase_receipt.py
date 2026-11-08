"""E2-4 E: recepción física única, idempotente y auditable por Compra."""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint,
    String, UniqueConstraint, Uuid, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class PurchaseReceipt(Base):
    __tablename__ = "purchase_receipts"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "purchase_id"], ["purchases.business_id", "purchases.id"],
            name="fk_purchase_receipts_purchase_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "location_id"], ["locations.business_id", "locations.id"],
            name="fk_purchase_receipts_location_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "confirmed_by_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_purchase_receipts_actor_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "id", name="uq_purchase_receipts_business_id_id"),
        UniqueConstraint("business_id", "purchase_id", name="uq_purchase_receipts_business_purchase"),
        UniqueConstraint("business_id", "request_id", name="uq_purchase_receipts_business_request"),
        CheckConstraint("length(request_sha256) = 64", name="ck_purchase_receipts_digest"),
        CheckConstraint("jsonb_typeof(balances_after) = 'array'", name="ck_purchase_receipts_balance_snapshot"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", name="fk_purchase_receipts_business", ondelete="RESTRICT"),
        nullable=False,
    )
    purchase_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    location_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    request_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    request_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    confirmed_by_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    confirmed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    # Snapshot de la respuesta tras el commit, NO una segunda fuente de stock.
    # El reintento idéntico devuelve el mismo resultado aunque haya movimientos posteriores.
    balances_after: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"),
    )
