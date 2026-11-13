"""E2-6 A: aplicación de pago DECLARADO, no cobro externo verificado.

Sin cuentas bancarias ni jornadas en este corte (RF-08/RF-09 posteriores).
"""
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, CheckConstraint, ForeignKeyConstraint, SmallInteger, String,
    UniqueConstraint, Uuid, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class SalePayment(Base):
    __tablename__ = "sale_payments"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "sale_id"], ["sales.business_id", "sales.id"],
            name="fk_sale_payments_sale_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "id", name="uq_sale_payments_business_id_id"),
        UniqueConstraint(
            "business_id", "sale_id", "payment_number",
            name="uq_sale_payments_business_sale_number",
        ),
        CheckConstraint(
            "payment_number BETWEEN 1 AND 6", name="ck_sale_payments_number",
        ),
        CheckConstraint(
            "method IN ('EFECTIVO','TRANSFERENCIA','CUENTA_DNI',"
            "'TARJETA','MERCADO_PAGO_DECLARADO','MERCADO_PAGO_DEMO_QA','MERCADO_PAGO_QR_TEST')",
            name="ck_sale_payments_declared_method",
        ),
        CheckConstraint(
            "amount_cents BETWEEN 1 AND 99999999999",
            name="ck_sale_payments_positive_amount",
        ),
        CheckConstraint(
            "length(reference) <= 120", name="ck_sale_payments_reference_length",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    sale_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    payment_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    method: Mapped[str] = mapped_column(String(32), nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reference: Mapped[str] = mapped_column(
        String(120), nullable=False, default="", server_default=text("''"),
    )
