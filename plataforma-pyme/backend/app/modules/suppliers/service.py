"""RF-05 E2-4 B: autorización, transacciones y estado de Proveedores."""
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import AuthSession, Supplier, User
from app.modules.auth.tokens import now_utc
from app.modules.businesses.permissions import BusinessPermission, has_business_permission
from app.modules.businesses.repository import BusinessRepository
from app.modules.suppliers.repository import SupplierRepository
from app.modules.suppliers.schemas import (
    ChangeSupplierStatusRequest, CreateSupplierRequest, SupplierView,
    UpdateSupplierRequest, normalized_name_key,
)


class SupplierSessionInvalid(Exception):
    """Actor o sesión dejó de ser válida."""


class SupplierBusinessUnavailable(Exception):
    """Empresa o membresía ausentes/inactivas, sin revelar otro tenant."""


class SupplierNotFound(Exception):
    """Proveedor inexistente en esta empresa."""


class SupplierPermissionDenied(Exception):
    """Rol sin atribución empresarial."""


class SupplierBusinessSuspended(Exception):
    """Empresa suspendida: se permite lectura, no escritura."""


class SupplierConflict(Exception):
    """Nombre canónico ocupado en esta empresa, incluso si está inactivo."""


class SupplierService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.businesses = BusinessRepository(db)
        self.suppliers = SupplierRepository(db)

    def _authorize(
        self, actor_id: UUID, session_id: UUID, business_id: UUID, *, writing: bool,
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
            raise SupplierSessionInvalid()
        pair = self.businesses.lock_active_member_business(actor_id, business_id)
        if pair is None:
            raise SupplierBusinessUnavailable()
        company, membership = pair
        if not has_business_permission(
            role=membership.role, membership_status=membership.status,
            business_status=company.status, permission=BusinessPermission.VIEW,
        ):
            raise SupplierPermissionDenied()
        if writing:
            if membership.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                raise SupplierPermissionDenied()
            if company.status != "ACTIVA":
                raise SupplierBusinessSuspended()

    @staticmethod
    def _translate_integrity(error: IntegrityError) -> None:
        original = error.orig
        diagnostic = getattr(original, "diag", None)
        name = getattr(diagnostic, "constraint_name", None)
        if getattr(original, "sqlstate", None) == "23505" and name == "uq_suppliers_business_name":
            raise SupplierConflict() from error
        raise error

    def list_for_business(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        *, offset: int, limit: int,
    ) -> list[SupplierView]:
        try:
            self._authorize(actor_id, session_id, business_id, writing=False)
            records = self.suppliers.list_for_business(business_id, offset=offset, limit=limit)
            result = [SupplierView.from_record(record) for record in records]
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def get(
        self, actor_id: UUID, session_id: UUID, business_id: UUID, supplier_id: UUID,
    ) -> SupplierView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=False)
            row = self.suppliers.get(business_id, supplier_id)
            if row is None:
                raise SupplierNotFound()
            result = SupplierView.from_record(row)
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def create(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        command: CreateSupplierRequest,
    ) -> SupplierView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            fields = command.model_dump(mode="json")
            row = Supplier(
                id=uuid4(), business_id=business_id,
                name_key=normalized_name_key(fields["name"]),
                status="ACTIVO", **fields,
            )
            try:
                self.suppliers.add(row)
                result = SupplierView.from_record(row)
                self.db.commit()
                return result
            except IntegrityError as error:
                self._translate_integrity(error)
        except Exception:
            self.db.rollback()
            raise

    def update(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        supplier_id: UUID, command: UpdateSupplierRequest,
    ) -> SupplierView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            row = self.suppliers.get_for_update(business_id, supplier_id)
            if row is None:
                raise SupplierNotFound()
            changes = command.model_dump(mode="json", exclude_unset=True)
            if "name" in changes:
                changes["name_key"] = normalized_name_key(changes["name"])
            if all(getattr(row, field) == value for field, value in changes.items()):
                result = SupplierView.from_record(row)
                self.db.rollback()
                return result
            for field, value in changes.items():
                setattr(row, field, value)
            try:
                self.db.flush()
                result = SupplierView.from_record(row)
                self.db.commit()
                return result
            except IntegrityError as error:
                self._translate_integrity(error)
        except Exception:
            self.db.rollback()
            raise

    def change_status(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        supplier_id: UUID, command: ChangeSupplierStatusRequest,
    ) -> SupplierView:
        """El cambio de estado se serializa y no libera la clave de nombre."""
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            row = self.suppliers.get_for_update(business_id, supplier_id)
            if row is None:
                raise SupplierNotFound()
            if row.status == command.status:
                result = SupplierView.from_record(row)
                self.db.rollback()
                return result
            row.status = command.status
            self.db.flush()
            result = SupplierView.from_record(row)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise
