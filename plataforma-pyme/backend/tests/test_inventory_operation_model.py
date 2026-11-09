"""E2-5 A: contrato estructural del primer origen manual de inventario."""
from sqlalchemy import BigInteger, CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from app.infrastructure.models import InventoryOperation, StockMovement
from app.infrastructure.models.base import Base


def _checks(table):
    return {
        constraint.name: str(constraint.sqltext)
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
    }


def _uniques(table):
    return {
        constraint.name: tuple(c.name for c in constraint.columns)
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }


def _foreigns(table):
    return {
        constraint.name: constraint
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    }


def test_inventory_operation_registered_in_alembic_metadata():
    assert Base.metadata.tables["inventory_operations"] is InventoryOperation.__table__
    assert Base.metadata.tables["stock_movements"] is StockMovement.__table__
    t = InventoryOperation.__table__
    assert isinstance(t.c.quantity_milli.type, BigInteger)
    assert not t.c.request_id.nullable
    assert not t.c.request_sha256.nullable
    assert not t.c.actor_id.nullable
    assert not t.c.reason.nullable


def test_operation_tenant_foreign_keys_include_item_two_locations_and_actor():
    fks = _foreigns(InventoryOperation.__table__)
    assert set(fks) == {
        "fk_inventory_operations_business",
        "fk_inventory_operations_catalog_tenant",
        "fk_inventory_operations_source_tenant",
        "fk_inventory_operations_destination_tenant",
        "fk_inventory_operations_actor_tenant",
    }
    assert all(c.ondelete == "RESTRICT" for c in fks.values())
    assert [x.target_fullname for x in fks["fk_inventory_operations_catalog_tenant"].elements] == [
        "catalog_items.business_id", "catalog_items.id",
    ]
    assert [x.target_fullname for x in fks["fk_inventory_operations_source_tenant"].elements] == [
        "locations.business_id", "locations.id",
    ]
    assert [x.target_fullname for x in fks["fk_inventory_operations_destination_tenant"].elements] == [
        "locations.business_id", "locations.id",
    ]


def test_operation_idempotency_and_direction_are_db_restricted():
    t = InventoryOperation.__table__
    uniques = _uniques(t)
    assert uniques["uq_inventory_operations_business_request"] == ("business_id", "request_id")
    assert uniques["uq_inventory_operations_business_id_kind"] == ("business_id", "id", "kind")
    checks = _checks(t)
    assert "TRASLADO" in checks["ck_inventory_operations_kind"]
    assert "AJUSTE_SALIDA" in checks["ck_inventory_operations_kind"]
    assert "STOCK_INICIAL" in checks["ck_inventory_operations_kind"]
    assert "source_location_id <> destination_location_id" in checks[
        "ck_inventory_operations_direction_locations"
    ]
    assert "BETWEEN 1 AND 999999999" in checks["ck_inventory_operations_quantity"]
    assert "quantity_milli % 1000 = 0" in checks[
        "ck_inventory_operations_discrete_quantity"
    ]
    assert "length(btrim(reason)) BETWEEN 3 AND 500" in checks[
        "ck_inventory_operations_reason"
    ]


def test_stock_movement_origin_check_links_signed_delta_to_operation_kind():
    t = StockMovement.__table__
    checks = _checks(t)
    formula = checks["ck_stock_movements_origin_and_sign"]
    for event in (
        "COMPRA_RECEPCION",
        "TRASLADO_ENTRADA",
        "TRASLADO_SALIDA",
        "AJUSTE_ENTRADA",
        "AJUSTE_SALIDA",
        "STOCK_INICIAL",
    ):
        assert event in formula
    assert "receipt_id IS NOT NULL" in formula
    assert "inventory_operation_id IS NOT NULL" in formula
    assert "purchase_line_id IS NULL" in formula
    assert "operation_kind IS NOT NULL" in formula
    assert "BETWEEN -999999999 AND -1" in formula
    assert "BETWEEN 1 AND 999999999" in formula
    uniques = _uniques(t)
    assert uniques["uq_stock_movements_receipt_line"] == (
        "business_id", "receipt_id", "purchase_line_id",
    )
    assert uniques["uq_stock_movements_operation_event"] == (
        "business_id", "inventory_operation_id", "event_type",
    )
    fks = _foreigns(t)
    assert [x.target_fullname for x in fks["fk_stock_movements_operation_kind_tenant"].elements] == [
        "inventory_operations.business_id",
        "inventory_operations.id",
        "inventory_operations.kind",
    ]


def test_receipt_movements_remain_compatible_without_any_manual_operation():
    movement = StockMovement.__table__
    assert movement.c.receipt_id.nullable
    assert movement.c.purchase_line_id.nullable
    assert movement.c.inventory_operation_id.nullable
    assert movement.c.operation_kind.nullable
    assert movement.c.delta_milli.nullable is False
    assert movement.c.event_type.nullable is False
