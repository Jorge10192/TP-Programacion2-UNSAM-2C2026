"""Recursos por empresa y ledger. Los JSON son snapshots históricos, no saldos."""
from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey,
    ForeignKeyConstraint, Index, Integer, JSON, String, UniqueConstraint, Uuid, func, text)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class TenantEntity:
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("businesses.id", ondelete="RESTRICT"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BusinessSettings(Base):
    __tablename__ = "business_settings"
    business_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("businesses.id"), primary_key=True)
    description: Mapped[str] = mapped_column(String(350), default="")
    slogan: Mapped[str] = mapped_column(String(100), default="")
    tax_id: Mapped[str] = mapped_column(String(30), default="")


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    user_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"), primary_key=True)
    avatar_initials: Mapped[str] = mapped_column(String(4), default="")


class Location(TenantEntity, Base):
    __tablename__ = "locations"
    __table_args__ = (
        UniqueConstraint("id", "business_id", name="uq_locations_tenant_id"),
        UniqueConstraint("business_id", "name_key", name="uq_locations_name"),
        CheckConstraint("status IN ('ACTIVA','PAUSADA')", name="ck_locations_status"),
    )
    name: Mapped[str] = mapped_column(String(90))
    name_key: Mapped[str] = mapped_column(String(90))
    kind: Mapped[str] = mapped_column(String(16))
    address: Mapped[str] = mapped_column(String(160), default="")
    map_url: Mapped[str] = mapped_column(String(2048), default="")
    can_sell: Mapped[bool] = mapped_column(Boolean)
    can_store: Mapped[bool] = mapped_column(Boolean)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(16), default="ACTIVA")


class CatalogItem(TenantEntity, Base):
    __tablename__ = "catalog_items"
    __table_args__ = (
        UniqueConstraint("id", "business_id", name="uq_catalog_tenant_id"),
        UniqueConstraint("business_id", "name_key", name="uq_catalog_name"),
        Index("uq_catalog_sku", "business_id", "sku", unique=True, postgresql_where=text("sku <> ''")),
        CheckConstraint("kind IN ('ELABORADO','REVENTA','INSUMO','SERVICIO')", name="ck_catalog_kind"),
        CheckConstraint("status IN ('ACTIVO','INACTIVO')", name="ck_catalog_status"),
        CheckConstraint("(kind = 'SERVICIO') = (unit = 'SERVICIO')", name="ck_catalog_service_unit"),
        CheckConstraint("price_cents IS NULL OR price_cents >= 0", name="ck_catalog_price"),
    )
    name: Mapped[str] = mapped_column(String(90))
    name_key: Mapped[str] = mapped_column(String(90))
    category: Mapped[str] = mapped_column(String(60))
    kind: Mapped[str] = mapped_column(String(16))
    unit: Mapped[str] = mapped_column(String(16))
    sku: Mapped[str] = mapped_column(String(32), default="")
    sellable: Mapped[bool] = mapped_column(Boolean)
    price_cents: Mapped[int | None] = mapped_column(BigInteger)
    reference_cost_cents: Mapped[int | None] = mapped_column(BigInteger)
    description: Mapped[str] = mapped_column(String(450), default="")
    observations: Mapped[str] = mapped_column(String(600), default="")
    status: Mapped[str] = mapped_column(String(16), default="ACTIVO")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Supplier(TenantEntity, Base):
    __tablename__ = "suppliers"
    __table_args__ = (
        UniqueConstraint("id", "business_id", name="uq_suppliers_tenant_id"),
        UniqueConstraint("business_id", "name_key", name="uq_suppliers_name"),
        CheckConstraint("status IN ('ACTIVO','INACTIVO')", name="ck_suppliers_status"),
    )
    name: Mapped[str] = mapped_column(String(90))
    name_key: Mapped[str] = mapped_column(String(90))
    details: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(16), default="ACTIVO")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FinancialAccount(TenantEntity, Base):
    __tablename__ = "financial_accounts"
    __table_args__ = (UniqueConstraint("id", "business_id", name="uq_accounts_tenant_id"),)
    details: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(16), default="ACTIVA")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)


class Purchase(TenantEntity, Base):
    __tablename__ = "purchases"
    __table_args__ = (
        UniqueConstraint("id", "business_id", name="uq_purchases_tenant_id"),
        ForeignKeyConstraint(["supplier_id", "business_id"], ["suppliers.id", "suppliers.business_id"], name="fk_purchase_supplier_tenant"),
        ForeignKeyConstraint(["location_id", "business_id"], ["locations.id", "locations.business_id"], name="fk_purchase_location_tenant"),
        CheckConstraint("total_cents >= 0", name="ck_purchases_total"),
    )
    supplier_id: Mapped[UUID | None] = mapped_column(Uuid)
    supplier_name: Mapped[str] = mapped_column(String(90), default="")
    purchased_on: Mapped[date] = mapped_column(Date)
    reference: Mapped[str] = mapped_column(String(70), default="")
    notes: Mapped[str] = mapped_column(String(500), default="")
    lines: Mapped[list] = mapped_column(JSON)
    total_cents: Mapped[int] = mapped_column(BigInteger)
    location_id: Mapped[UUID | None] = mapped_column(Uuid)
    receipt: Mapped[dict | None] = mapped_column(JSON)


class StockBalance(Base):
    __tablename__ = "stock_balances"
    __table_args__ = (
        ForeignKeyConstraint(["location_id", "business_id"], ["locations.id", "locations.business_id"], name="fk_balance_location_tenant"),
        ForeignKeyConstraint(["item_id", "business_id"], ["catalog_items.id", "catalog_items.business_id"], name="fk_balance_item_tenant"),
        CheckConstraint("quantity_milli >= 0 AND quantity_milli < 1000000000", name="ck_balance_nonnegative"),
        CheckConstraint("version >= 1", name="ck_balance_version"),
    )
    business_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("businesses.id"), primary_key=True)
    location_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    item_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    quantity_milli: Mapped[int] = mapped_column(BigInteger, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)


class InventoryOperation(TenantEntity, Base):
    __tablename__ = "inventory_operations"
    kind: Mapped[str] = mapped_column(String(20))
    snapshot: Mapped[dict] = mapped_column(JSON)


class StockMovement(TenantEntity, Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        ForeignKeyConstraint(["location_id", "business_id"], ["locations.id", "locations.business_id"], name="fk_movement_location_tenant"),
        ForeignKeyConstraint(["item_id", "business_id"], ["catalog_items.id", "catalog_items.business_id"], name="fk_movement_item_tenant"),
    )
    location_id: Mapped[UUID] = mapped_column(Uuid)
    item_id: Mapped[UUID] = mapped_column(Uuid)
    operation_id: Mapped[UUID] = mapped_column(Uuid)
    delta_milli: Mapped[int] = mapped_column(BigInteger)
    kind: Mapped[str] = mapped_column(String(30))
    item_name: Mapped[str] = mapped_column(String(90))
    unit: Mapped[str] = mapped_column(String(16))
    reason: Mapped[str] = mapped_column(String(180))
    reference: Mapped[str] = mapped_column(String(100), default="")


class CashSession(TenantEntity, Base):
    __tablename__ = "cash_sessions"
    __table_args__ = (
        UniqueConstraint("id", "business_id", name="uq_cash_tenant_id"),
        ForeignKeyConstraint(["location_id", "business_id"], ["locations.id", "locations.business_id"], name="fk_cash_location_tenant"),
        Index("uq_cash_open_scope", "business_id", "location_id", unique=True,
              postgresql_where=text("status = 'ABIERTA'"), postgresql_nulls_not_distinct=True),
        CheckConstraint("opening_cents >= 0", name="ck_cash_opening"),
        CheckConstraint("status IN ('ABIERTA','CERRADA')", name="ck_cash_status"),
    )
    location_id: Mapped[UUID | None] = mapped_column(Uuid)
    opening_cents: Mapped[int] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(String(16), default="ABIERTA")
    opened_by: Mapped[str] = mapped_column(String(70))
    close_snapshot: Mapped[dict | None] = mapped_column(JSON)
    close_key: Mapped[str | None] = mapped_column(String(36))


class Sale(TenantEntity, Base):
    __tablename__ = "sales"
    __table_args__ = (
        ForeignKeyConstraint(["location_id", "business_id"], ["locations.id", "locations.business_id"], name="fk_sale_location_tenant"),
        ForeignKeyConstraint(["cash_session_id", "business_id"], ["cash_sessions.id", "cash_sessions.business_id"], name="fk_sale_cash_tenant"),
        CheckConstraint("total_cents > 0 AND discount_cents >= 0", name="ck_sales_total"),
    )
    location_id: Mapped[UUID | None] = mapped_column(Uuid)
    cash_session_id: Mapped[UUID] = mapped_column(Uuid)
    lines: Mapped[list] = mapped_column(JSON)
    payments: Mapped[list] = mapped_column(JSON)
    subtotal_cents: Mapped[int] = mapped_column(BigInteger)
    discount_cents: Mapped[int] = mapped_column(BigInteger)
    total_cents: Mapped[int] = mapped_column(BigInteger)
    notes: Mapped[str] = mapped_column(String(500), default="")


class Expense(TenantEntity, Base):
    __tablename__ = "expenses"
    __table_args__ = (
        ForeignKeyConstraint(["location_id", "business_id"], ["locations.id", "locations.business_id"], name="fk_expense_location_tenant"),
        ForeignKeyConstraint(["cash_session_id", "business_id"], ["cash_sessions.id", "cash_sessions.business_id"], name="fk_expense_cash_tenant"),
        CheckConstraint("amount_cents > 0", name="ck_expenses_amount"),
    )
    location_id: Mapped[UUID | None] = mapped_column(Uuid)
    cash_session_id: Mapped[UUID] = mapped_column(Uuid)
    paid_on: Mapped[date] = mapped_column(Date)
    category: Mapped[str] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(String(140))
    amount_cents: Mapped[int] = mapped_column(BigInteger)
    payment_method: Mapped[str] = mapped_column(String(25))
    details: Mapped[dict] = mapped_column(JSON)


class CommandReceipt(Base):
    __tablename__ = "command_receipts"
    business_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("businesses.id"), primary_key=True)
    actor_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"), primary_key=True)
    key: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    operation: Mapped[str] = mapped_column(String(100))
    digest: Mapped[str] = mapped_column(String(64))
    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
