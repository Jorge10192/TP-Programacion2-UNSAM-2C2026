"""E2-4 D: alta atómica, consultas y reintentos de Compra, sin afectar stock.

El backend deriva snapshots de Catálogo/Proveedor; los totales son calculados
por el servidor en milésimas/centavos y se confirman en la misma transacción.
"""
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    AuthSession, CatalogItem, Purchase, PurchaseLine, Supplier, User,
)
from app.modules.auth.tokens import now_utc
from app.modules.businesses.permissions import BusinessPermission, has_business_permission
from app.modules.businesses.repository import BusinessRepository
from app.modules.purchases.repository import PurchaseRepository
from app.modules.purchases.schemas import (
    CreatePurchaseRequest, PurchaseView, line_total_cents,
)


class PurchaseSessionInvalid(Exception):
    pass


class PurchaseBusinessUnavailable(Exception):
    pass


class PurchasePermissionDenied(Exception):
    pass


class PurchaseBusinessSuspended(Exception):
    pass


class PurchaseNotFound(Exception):
    pass


class PurchaseInvalidReference(Exception):
    """Proveedor/artículo no pertenece a empresa, está inactivo, o unidad cambió."""


class PurchaseIdempotencyConflict(Exception):
    pass


@dataclass(frozen=True)
class PurchaseCreated:
    body: PurchaseView
    replayed: bool


class PurchaseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.businesses = BusinessRepository(db)
        self.purchases = PurchaseRepository(db)

    def _authorize(self, actor_id: UUID, session_id: UUID,
                   business_id: UUID, *, writing: bool) -> None:
        user = self.db.scalar(select(User).where(User.id == actor_id)
                              .with_for_update().execution_options(populate_existing=True))
        session = self.db.scalar(
            select(AuthSession).where(
                AuthSession.id == session_id, AuthSession.user_id == actor_id,
            ).with_for_update().execution_options(populate_existing=True)
        )
        if (user is None or user.status != "ACTIVO" or session is None
                or session.revoked_at is not None or session.expires_at <= now_utc()):
            raise PurchaseSessionInvalid()
        pair = self.businesses.lock_active_member_business(actor_id, business_id)
        if pair is None:
            raise PurchaseBusinessUnavailable()
        company, member = pair
        if not has_business_permission(
            role=member.role, membership_status=member.status,
            business_status=company.status, permission=BusinessPermission.VIEW,
        ):
            raise PurchasePermissionDenied()
        if writing:
            if member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                raise PurchasePermissionDenied()
            if company.status != "ACTIVA":
                raise PurchaseBusinessSuspended()

    def _view(self, purchase: Purchase) -> PurchaseView:
        return PurchaseView.from_records(
            purchase, self.purchases.lines(purchase.business_id, purchase.id),
        )

    def list(self, actor_id: UUID, session_id: UUID, business_id: UUID,
             *, offset: int, limit: int) -> list[PurchaseView]:
        try:
            self._authorize(actor_id, session_id, business_id, writing=False)
            response = [self._view(row) for row in self.purchases.list(
                business_id, offset=offset, limit=limit,
            )]
            self.db.rollback()
            return response
        except Exception:
            self.db.rollback()
            raise

    def get(self, actor_id: UUID, session_id: UUID,
            business_id: UUID, purchase_id: UUID) -> PurchaseView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=False)
            row = self.purchases.get(business_id, purchase_id)
            if row is None:
                raise PurchaseNotFound()
            response = self._view(row)
            self.db.rollback()
            return response
        except Exception:
            self.db.rollback()
            raise

    def _replay(self, actor_id: UUID, business_id: UUID,
                key: UUID, digest: str) -> PurchaseView | None:
        row = self.purchases.by_request(business_id, key)
        if row is None:
            return None
        if row.created_by_id != actor_id or row.request_sha256 != digest:
            raise PurchaseIdempotencyConflict()
        return self._view(row)

    def _resolve_supplier(self, business_id: UUID, supplier_id: UUID | None) -> str:
        if supplier_id is None:
            return ""
        row = self.db.scalar(
            select(Supplier).where(
                Supplier.business_id == business_id, Supplier.id == supplier_id,
            ).with_for_update(read=True).execution_options(populate_existing=True)
        )
        if row is None or row.status != "ACTIVO":
            raise PurchaseInvalidReference()
        return row.name

    def _resolve_items(self, business_id: UUID, command: CreatePurchaseRequest
                       ) -> dict[UUID, CatalogItem]:
        ids = sorted({line.catalog_item_id for line in command.lines
                      if line.catalog_item_id is not None})
        if not ids:
            return {}
        records = self.db.scalars(select(CatalogItem).where(
            CatalogItem.business_id == business_id,
            CatalogItem.id.in_(ids),
        ).order_by(CatalogItem.id)
            .with_for_update(read=True).execution_options(populate_existing=True)).all()
        items = {row.id: row for row in records}
        if len(items) != len(ids) or any(row.status != "ACTIVO" for row in items.values()):
            raise PurchaseInvalidReference()
        for line in command.lines:
            if line.catalog_item_id is None:
                continue
            item = items[line.catalog_item_id]
            if line.unit != item.unit:
                raise PurchaseInvalidReference()
        return items

    def create(self, actor_id: UUID, session_id: UUID, business_id: UUID,
               key: UUID, command: CreatePurchaseRequest) -> PurchaseCreated:
        digest = command.payload_digest()
        try:
            # Bloqueos por tenant: serializa reintentos y cambios empresariales.
            self._authorize(actor_id, session_id, business_id, writing=False)
            existing = self._replay(actor_id, business_id, key, digest)
            if existing is not None:
                self.db.rollback()
                return PurchaseCreated(existing, replayed=True)

            # Revalidar permiso de escritura SIN confiar en el token inicial.
            # La autorización de escritura vuelve a adquirir locks ya propios.
            self._authorize(actor_id, session_id, business_id, writing=True)
            supplier_snapshot = self._resolve_supplier(business_id, command.supplier_id)
            items = self._resolve_items(business_id, command)
            purchase_id = uuid4()
            total = sum(line_total_cents(line.quantity_milli, line.unit_cost_cents)
                        for line in command.lines)
            has_physical = any(
                line.catalog_item_id is not None
                and items[line.catalog_item_id].item_type == "BIEN"
                for line in command.lines
            )
            document = Purchase(
                id=purchase_id, business_id=business_id, request_id=key,
                request_sha256=digest, supplier_id=command.supplier_id,
                supplier_name_snapshot=supplier_snapshot,
                purchased_on=command.purchased_on,
                status="REGISTRADA" if has_physical else "CERRADA_SIN_RECEPCION",
                total_cents=total, reference=command.reference, notes=command.notes,
                created_by_id=actor_id,
            )
            self.db.add(document)
            self.db.flush()

            rows = []
            for number, line in enumerate(command.lines, 1):
                item = items.get(line.catalog_item_id) if line.catalog_item_id else None
                rows.append(PurchaseLine(
                    id=uuid4(), business_id=business_id, purchase_id=purchase_id,
                    line_number=number, catalog_item_id=line.catalog_item_id,
                    description_snapshot=item.name if item is not None else line.description,
                    kind_snapshot=item.item_type if item is not None else "CONCEPTO",
                    unit_snapshot=item.unit if item is not None else "CONCEPTO",
                    sku_snapshot=(item.sku or "") if item is not None else "",
                    quantity_milli=line.quantity_milli,
                    unit_cost_cents=line.unit_cost_cents,
                    line_total_cents=line_total_cents(line.quantity_milli, line.unit_cost_cents),
                ))
            self.db.add_all(rows)
            self.db.flush()
            result = PurchaseView.from_records(document, rows)
            self.db.commit()
            return PurchaseCreated(result, replayed=False)
        except IntegrityError as exc:
            self.db.rollback()
            # Carrera con la misma clave: la restricción única es la última defensa.
            constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
            if constraint != "uq_purchases_business_request":
                raise
            try:
                self._authorize(actor_id, session_id, business_id, writing=False)
                existing = self._replay(actor_id, business_id, key, digest)
                if existing is None:
                    raise
                self.db.rollback()
                return PurchaseCreated(existing, replayed=True)
            except Exception:
                self.db.rollback()
                raise
        except Exception:
            self.db.rollback()
            raise
