"""Acceso a fotografías privadas de identidad y empresas.

Los registros del catálogo/proveedor siguen siendo propiedad del tenant real;
las lecturas y escrituras verifican membresía y permisos antes de exponer bytes.
"""
from datetime import datetime
from uuid import UUID, uuid4

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, load_only

from app.infrastructure.models import (
    AuthSession, Business, CatalogItem, Membership, PhotoAsset, Supplier, User,
)
from app.modules.auth.session_service import AuthContext
from app.modules.businesses.permissions import BusinessPermission, has_business_permission
from app.modules.businesses.repository import BusinessRepository
from app.modules.auth.session_service import now_utc


class PhotoView(BaseModel):
    id: UUID
    owner_type: str
    position: int
    width: int
    height: int
    byte_size: int
    created_at: datetime

    @classmethod
    def from_record(cls, row: PhotoAsset) -> "PhotoView":
        return cls(
            id=row.id, owner_type=row.owner_type, position=row.position,
            width=row.width, height=row.height, byte_size=row.byte_size,
            created_at=row.created_at,
        )


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Fotografía o recurso no disponible")


class PhotoService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _lock_actor(self, ctx: AuthContext) -> None:
        actor = self.db.scalar(
            select(User).where(User.id == ctx.user.id)
            .with_for_update().execution_options(populate_existing=True)
        )
        session = self.db.scalar(
            select(AuthSession).where(
                AuthSession.id == ctx.auth_session.id, AuthSession.user_id == ctx.user.id,
            ).with_for_update().execution_options(populate_existing=True)
        )
        if (actor is None or actor.status != "ACTIVO" or session is None
                or session.revoked_at is not None or session.expires_at <= now_utc()):
            raise HTTPException(status_code=401, detail="Sesión requerida o vencida")

    def _authorize(
        self, ctx: AuthContext, owner_type: str, owner_id: UUID,
        business_id: UUID | None, *, writing: bool,
    ) -> None:
        if owner_type == "PROFILE":
            if owner_id != ctx.user.id or business_id is not None:
                raise _not_found()
            if writing:
                self._lock_actor(ctx)
            return
        if owner_type not in {"BUSINESS", "CATALOG", "SUPPLIER"} or business_id is None:
            raise _not_found()
        if writing:
            self._lock_actor(ctx)
            pair = BusinessRepository(self.db).lock_active_member_business(ctx.user.id, business_id)
        else:
            pair = BusinessRepository(self.db).own_business(ctx.user.id, business_id)
        if pair is None:
            raise _not_found()
        company, membership = pair
        if not has_business_permission(
            role=membership.role, membership_status=membership.status,
            business_status=company.status, permission=BusinessPermission.VIEW,
        ):
            raise _not_found()
        if writing:
            if company.status != "ACTIVA":
                raise HTTPException(status_code=409, detail="Empresa suspendida")
            if not has_business_permission(
                role=membership.role, membership_status=membership.status,
                business_status=company.status, permission=BusinessPermission.EDIT_PROFILE,
            ):
                raise HTTPException(status_code=403, detail="No tenés permiso para gestionar fotografías")
        if owner_type == "BUSINESS":
            if owner_id != business_id:
                raise _not_found()
        else:
            model = CatalogItem if owner_type == "CATALOG" else Supplier
            statement = select(model.id).where(model.business_id == business_id, model.id == owner_id)
            if writing:
                statement = statement.with_for_update()
            if self.db.scalar(statement) is None:
                raise _not_found()

    def assert_upload_allowed(
        self, ctx: AuthContext, owner_type: str, owner_id: UUID,
        business_id: UUID | None,
    ) -> None:
        """Preflight: rechazar usuarios ajenos antes del costoso decodificado.

        Es un control anticipado, NO sustituye al lock y autorización
        transaccional que vuelve a ejecutar upload() antes de guardar.
        """
        try:
            self._authorize(ctx, owner_type, owner_id, business_id, writing=True)
        finally:
            self.db.rollback()

    def list_for(
        self, ctx: AuthContext, owner_type: str, owner_id: UUID,
        business_id: UUID | None,
    ) -> list[PhotoView]:
        try:
            self._authorize(ctx, owner_type, owner_id, business_id, writing=False)
            statement = (
                select(PhotoAsset)
                .options(load_only(
                    PhotoAsset.id, PhotoAsset.owner_type, PhotoAsset.owner_id,
                    PhotoAsset.business_id, PhotoAsset.position, PhotoAsset.width,
                    PhotoAsset.height, PhotoAsset.byte_size, PhotoAsset.created_at,
                ))
                .where(PhotoAsset.owner_type == owner_type, PhotoAsset.owner_id == owner_id)
                .order_by(PhotoAsset.position)
            )
            result = [PhotoView.from_record(row) for row in self.db.scalars(statement).all()]
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def upload(
        self, ctx: AuthContext, owner_type: str, owner_id: UUID,
        business_id: UUID | None, content: bytes, width: int, height: int,
    ) -> PhotoView:
        try:
            self._authorize(ctx, owner_type, owner_id, business_id, writing=True)
            rows = self.db.execute(
                select(PhotoAsset.id, PhotoAsset.position)
                .where(PhotoAsset.owner_type == owner_type, PhotoAsset.owner_id == owner_id)
                .order_by(PhotoAsset.position)
                .with_for_update()
            ).all()
            if owner_type == "CATALOG":
                if len(rows) >= 8:
                    raise HTTPException(status_code=409, detail="Máximo de 8 fotos por artículo o servicio")
                occupied = {position for _, position in rows}
                slot = next(i for i in range(8) if i not in occupied)
            else:
                # Reemplazo atómico. Sólo una foto por perfil, empresa o proveedor.
                for photo_id, _ in rows:
                    old = self.db.get(PhotoAsset, photo_id)
                    if old is not None:
                        self.db.delete(old)
                self.db.flush()
                slot = 0
            photo = PhotoAsset(
                id=uuid4(), owner_type=owner_type, owner_id=owner_id,
                business_id=business_id, position=slot, content=content,
                byte_size=len(content), width=width, height=height, mime_type="image/webp",
            )
            self.db.add(photo)
            self.db.flush()
            result = PhotoView.from_record(photo)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise

    def get_team_avatar(self, ctx: AuthContext, business_id: UUID, member_user_id: UUID) -> bytes:
        """Only team readers may view active colleagues' profile avatars in their tenant.

        Personal photos remain private in /me; no public or cross-company URL is issued.
        The BYTEA column is selected only after both memberships are authorized.
        """
        try:
            pair = BusinessRepository(self.db).own_business(ctx.user.id, business_id)
            if pair is None:
                raise _not_found()
            company, membership = pair
            if not has_business_permission(
                role=membership.role, membership_status=membership.status,
                business_status=company.status, permission=BusinessPermission.READ_MEMBERS,
            ):
                raise _not_found()
            target = self.db.scalar(
                select(Membership.id).join(User, User.id == Membership.user_id)
                .where(
                    Membership.business_id == business_id,
                    Membership.user_id == member_user_id,
                    Membership.status == "ACTIVA", User.status == "ACTIVO",
                )
            )
            if target is None:
                raise _not_found()
            content = self.db.scalar(
                select(PhotoAsset.content).where(
                    PhotoAsset.owner_type == "PROFILE",
                    PhotoAsset.owner_id == member_user_id,
                    PhotoAsset.position == 0,
                )
            )
            if content is None:
                raise _not_found()
            self.db.rollback()
            return content
        except Exception:
            self.db.rollback()
            raise

    def get_content(self, ctx: AuthContext, photo_id: UUID) -> bytes:
        try:
            # Primer paso sin bytea: no cargar archivos ajenos antes de autorizar.
            photo = self.db.scalar(
                select(PhotoAsset).options(load_only(
                    PhotoAsset.id, PhotoAsset.owner_type, PhotoAsset.owner_id,
                    PhotoAsset.business_id,
                )).where(PhotoAsset.id == photo_id)
            )
            if photo is None:
                raise _not_found()
            self._authorize(
                ctx, photo.owner_type, photo.owner_id, photo.business_id, writing=False,
            )
            content = self.db.scalar(
                select(PhotoAsset.content).where(PhotoAsset.id == photo_id)
            )
            if content is None:
                raise _not_found()
            self.db.rollback()
            return content
        except Exception:
            self.db.rollback()
            raise

    def delete(self, ctx: AuthContext, photo_id: UUID) -> None:
        try:
            photo = self.db.scalar(
                select(PhotoAsset).options(load_only(
                    PhotoAsset.id, PhotoAsset.owner_type, PhotoAsset.owner_id,
                    PhotoAsset.business_id,
                )).where(PhotoAsset.id == photo_id)
            )
            if photo is None:
                raise _not_found()
            self._authorize(ctx, photo.owner_type, photo.owner_id, photo.business_id, writing=True)
            locked = self.db.scalar(
                select(PhotoAsset).where(PhotoAsset.id == photo_id)
                .with_for_update().execution_options(populate_existing=True)
            )
            if locked is None:
                raise _not_found()
            self.db.delete(locked)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
