"""E3-2A: fotografías privadas vinculadas a identidad o a un único tenant."""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Index, Integer, LargeBinary,
    String, UniqueConstraint, Uuid, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class PhotoAsset(Base):
    __tablename__ = "photo_assets"
    __table_args__ = (
        UniqueConstraint("owner_type", "owner_id", "position", name="uq_photo_assets_owner_slot"),
        Index("ix_photo_assets_business_id", "business_id"),
        CheckConstraint(
            "owner_type IN ('PROFILE', 'BUSINESS', 'CATALOG', 'SUPPLIER')",
            name="ck_photo_assets_owner_type",
        ),
        CheckConstraint(
            "(owner_type = 'PROFILE' AND business_id IS NULL) OR "
            "(owner_type <> 'PROFILE' AND business_id IS NOT NULL)",
            name="ck_photo_assets_business_scope",
        ),
        CheckConstraint(
            "(owner_type = 'CATALOG' AND position BETWEEN 0 AND 7) OR "
            "(owner_type <> 'CATALOG' AND position = 0)",
            name="ck_photo_assets_position",
        ),
        CheckConstraint("byte_size BETWEEN 1 AND 2097152", name="ck_photo_assets_byte_size"),
        CheckConstraint("width BETWEEN 1 AND 1280 AND height BETWEEN 1 AND 1280",
                        name="ck_photo_assets_dimensions"),
        CheckConstraint("mime_type = 'image/webp'", name="ck_photo_assets_mime"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    owner_type: Mapped[str] = mapped_column(String(12), nullable=False)
    owner_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    business_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_photo_assets_business", ondelete="RESTRICT"),
        nullable=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'image/webp'"))
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
