"""E2-6 A: comprobante de venta confirmado, con pagos solo DECLARADOS.

La venta no acredita pagos externos. El servicio E2-6 B/C deberá crear la
cabecera, los renglones, los pagos, el ledger físico y los saldos en UN commit.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint,
    Index, String, UniqueConstraint, Uuid, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


MAX_SALE_CENTS = 99_999_999_999


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "location_id"], ["locations.business_id", "locations.id"],
            name="fk_sales_location_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "created_by_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_sales_creator_membership_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "id", name="uq_sales_business_id_id"),
        UniqueConstraint("business_id", "request_id", name="uq_sales_business_request"),
        Index("ix_sales_business_created", "business_id", "created_at"),
        CheckConstraint("status = 'CONFIRMADA'", name="ck_sales_status_confirmed"),
        CheckConstraint(
            "subtotal_cents BETWEEN 1 AND 99999999999", name="ck_sales_subtotal_cents",
        ),
        CheckConstraint(
            "discount_cents BETWEEN 0 AND 99999999999", name="ck_sales_discount_cents",
        ),
        CheckConstraint(
            "total_cents BETWEEN 1 AND 99999999999 "
            "AND total_cents = subtotal_cents - discount_cents",
            name="ck_sales_positive_total_equals_subtotal_minus_discount",
        ),
        CheckConstraint("length(request_sha256) = 64", name="ck_sales_request_digest"),
        CheckConstraint("length(notes) <= 500", name="ck_sales_notes_length"),
        CheckConstraint(
            "jsonb_typeof(balances_after) = 'array'", name="ck_sales_balance_snapshot_array",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_sales_business", ondelete="RESTRICT"),
        nullable=False,
    )
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    request_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    request_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="CONFIRMADA")
    subtotal_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    discount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    notes: Mapped[str] = mapped_column(
        String(500), nullable=False, default="", server_default=text("''"),
    )
    created_by_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    # Respuesta histórica del stock tras confirmar; nunca fuente alternativa del saldo.
    balances_after: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"),
    )
