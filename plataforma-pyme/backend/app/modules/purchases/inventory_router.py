"""RF-06 lectura: balances y ledger general de recepciones y operaciones manuales."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.purchases.receipt_schemas import StockBalanceView, InventoryMovementView
from app.modules.purchases.receipt_service import ReceiptService
from app.modules.purchases.service import (
    PurchaseBusinessUnavailable, PurchasePermissionDenied, PurchaseSessionInvalid,
)

router = APIRouter(prefix="/businesses/{business_id}/inventory", tags=["inventario"])


def read_error(exc: Exception) -> HTTPException:
    if isinstance(exc, PurchaseBusinessUnavailable):
        return HTTPException(404, detail="Empresa no disponible")
    if isinstance(exc, PurchasePermissionDenied):
        return HTTPException(403, detail="Operacion no permitida")
    raise TypeError("Error sin mapeo HTTP")


@router.get(
    "/balances", response_model=list[StockBalanceView],
    summary="Consultar saldos confirmados por empresa, ubicacion y articulo",
)
def get_balances(
    business_id: UUID,
    location_id: UUID | None = Query(default=None),
    catalog_item_id: UUID | None = Query(default=None),
    offset: int = Query(0, ge=0, le=9_223_372_036_854_775_807),
    limit: int = Query(100, ge=1, le=500),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[StockBalanceView]:
    try:
        return ReceiptService(db).list_balances(
            context.user.id, context.auth_session.id, business_id,
            location_id=location_id, catalog_item_id=catalog_item_id,
            offset=offset, limit=limit,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied) as exc:
        raise read_error(exc) from None


@router.get(
    "/movements", response_model=list[InventoryMovementView], response_model_exclude_none=True,
    summary="Consultar ledger firmado de recepciones y traslados",
)
def get_movements(
    business_id: UUID,
    location_id: UUID | None = Query(default=None),
    catalog_item_id: UUID | None = Query(default=None),
    offset: int = Query(0, ge=0, le=9_223_372_036_854_775_807),
    limit: int = Query(100, ge=1, le=500),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[InventoryMovementView]:
    try:
        return ReceiptService(db).list_movements(
            context.user.id, context.auth_session.id, business_id,
            location_id=location_id, catalog_item_id=catalog_item_id,
            offset=offset, limit=limit,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied) as exc:
        raise read_error(exc) from None
