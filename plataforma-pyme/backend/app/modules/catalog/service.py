"""Catálogo E2-3 B: CRUD inicial, RBAC, sesiones revalidadas y SQL único."""
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import AuthSession, CatalogItem, User
from app.modules.auth.tokens import now_utc
from app.modules.businesses.permissions import BusinessPermission, has_business_permission
from app.modules.businesses.repository import BusinessRepository
from app.modules.catalog.repository import CatalogRepository
from app.modules.catalog.schemas import (
    CatalogItemView, CreateCatalogItemRequest, UpdateCatalogItemRequest,
    ensure_kind_unit, normalized_name_key, ChangeCatalogStatusRequest,
)


class CatalogSessionInvalid(Exception):
    """Cuenta o sesión invalidada desde la autenticación inicial."""


class CatalogBusinessUnavailable(Exception):
    """No existe empresa propia o la membresía está inactiva."""


class CatalogItemNotFound(Exception):
    """Artículo no encontrado dentro de la empresa del actor."""


class CatalogPermissionDenied(Exception):
    """Rol empresarial sin permiso de esta operación."""


class CatalogBusinessSuspended(Exception):
    """Empresa suspendida: lectura permitida pero comandos prohibidos."""


class CatalogConflict(Exception):
    """Clave de nombre o SKU ya existente en este tenant."""


class CatalogInvalidChange(Exception):
    """Combinación de tipo y unidad incompatible en una edición parcial."""


class CatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.businesses = BusinessRepository(db)
        self.catalog = CatalogRepository(db)

    def _authorize(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, *, writing: bool,
    ) -> None:
        user = self.db.scalar(
            select(User).where(User.id == actor_id)
            .with_for_update().execution_options(populate_existing=True)
        )
        session = self.db.scalar(
            select(AuthSession).where(
                AuthSession.id == session_id, AuthSession.user_id == actor_id,
            ).with_for_update().execution_options(populate_existing=True)
        )
        if (
            user is None or user.status != "ACTIVO" or session is None
            or session.revoked_at is not None or session.expires_at <= now_utc()
        ):
            raise CatalogSessionInvalid()

        pair = self.businesses.lock_active_member_business(actor_id, business_id)
        if pair is None:
            raise CatalogBusinessUnavailable()
        company, membership = pair
        if not has_business_permission(
            role=membership.role, membership_status=membership.status,
            business_status=company.status, permission=BusinessPermission.VIEW,
        ):
            raise CatalogPermissionDenied()
        if writing:
            if membership.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                raise CatalogPermissionDenied()
            if company.status != "ACTIVA":
                raise CatalogBusinessSuspended()

    @staticmethod
    def _translate_conflict(error: IntegrityError) -> None:
        original = error.orig
        diagnostic = getattr(original, "diag", None)
        name = getattr(diagnostic, "constraint_name", None)
        sqlstate = getattr(original, "sqlstate", None)
        if sqlstate == "23505" and name in (
            "uq_catalog_items_business_name", "uq_catalog_items_business_sku",
        ):
            raise CatalogConflict() from error
        raise error

    def list_for_business(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, *, offset: int, limit: int,
    ) -> list[CatalogItemView]:
        try:
            self._authorize(actor_id, session_id, business_id, writing=False)
            result = [CatalogItemView.from_record(row)
                      for row in self.catalog.list_for_business(
                          business_id, offset=offset, limit=limit,
                      )]
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def get(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, item_id: UUID,
    ) -> CatalogItemView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=False)
            item = self.catalog.get(business_id, item_id)
            if item is None:
                raise CatalogItemNotFound()
            result = CatalogItemView.from_record(item)
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def create(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        command: CreateCatalogItemRequest,
    ) -> CatalogItemView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            item = CatalogItem(
                id=uuid4(), business_id=business_id,
                name=command.name, name_key=normalized_name_key(command.name),
                kind=command.kind, category=command.category, sku=command.sku,
                unit=command.unit, description=command.description,
                observations=command.observations, sellable=command.sellable,
                price_cents=command.price_cents,
                reference_cost_cents=command.reference_cost_cents,
                status="ACTIVO",
            )
            try:
                self.catalog.add(item)
                view = CatalogItemView.from_record(item)
                self.db.commit()
                return view
            except IntegrityError as error:
                self._translate_conflict(error)
        except Exception:
            self.db.rollback()
            raise

    def update(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, item_id: UUID,
        command: UpdateCatalogItemRequest,
    ) -> CatalogItemView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            item = self.catalog.get_for_update(business_id, item_id)
            if item is None:
                raise CatalogItemNotFound()
            changes = command.model_dump(exclude_unset=True)
            new_kind = changes.get("kind", item.kind)
            new_unit = changes.get("unit", item.unit)
            try:
                ensure_kind_unit(new_kind, new_unit)
            except ValueError as error:
                raise CatalogInvalidChange() from error
            if "name" in changes:
                changes["name_key"] = normalized_name_key(changes["name"])
            for key, value in changes.items():
                setattr(item, key, value)
            try:
                self.db.flush()
                view = CatalogItemView.from_record(item)
                self.db.commit()
                return view
            except IntegrityError as error:
                self._translate_conflict(error)
        except Exception:
            self.db.rollback()
            raise

    def change_status(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, item_id: UUID, command: ChangeCatalogStatusRequest,
    ) -> CatalogItemView:
        """Desactivar/reactivar sin borrar la ficha, liberar SKU ni crear stock.

        Bloqueo y autorización en la misma transacción. Un estado repetido es
        idempotente: no altera updated_at ni confirma una escritura ficticia.
        """
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            item = self.catalog.get_for_update(business_id, item_id)
            if item is None:
                raise CatalogItemNotFound()
            if item.status == command.status:
                view = CatalogItemView.from_record(item)
                self.db.rollback()
                return view
            item.status = command.status
            self.db.flush()
            view = CatalogItemView.from_record(item)
            self.db.commit()
            return view
        except Exception:
            self.db.rollback()
            raise
