"""Endpoints reales de fotos privadas; nunca se publican bytes sin Bearer."""
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth
from app.modules.auth.session_service import AuthContext
from app.modules.media.codec import clean_photo
from app.modules.media.service import PhotoService, PhotoView

router = APIRouter(prefix="/photos", tags=["fotografías"])

# Rutas de colección estables. Los IDs se toman del servidor, nunca del formulario.
@router.get("/me", response_model=list[PhotoView])
def list_profile(ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    return PhotoService(db).list_for(ctx, "PROFILE", ctx.user.id, None)


@router.post("/me", response_model=PhotoView, status_code=201)
async def upload_profile(file: UploadFile = File(...), ctx: AuthContext = Depends(current_auth),
                         db: Session = Depends(get_db)):
    service = PhotoService(db)
    service.assert_upload_allowed(ctx, "PROFILE", ctx.user.id, None)
    content, width, height = await clean_photo(file)
    return service.upload(ctx, "PROFILE", ctx.user.id, None, content, width, height)


@router.get("/businesses/{business_id}", response_model=list[PhotoView])
def list_business(business_id: UUID, ctx: AuthContext = Depends(current_auth),
                  db: Session = Depends(get_db)):
    return PhotoService(db).list_for(ctx, "BUSINESS", business_id, business_id)


@router.post("/businesses/{business_id}", response_model=PhotoView, status_code=201)
async def upload_business(business_id: UUID, file: UploadFile = File(...),
                          ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    service = PhotoService(db)
    service.assert_upload_allowed(ctx, "BUSINESS", business_id, business_id)
    content, width, height = await clean_photo(file)
    return service.upload(ctx, "BUSINESS", business_id, business_id, content, width, height)


@router.get("/businesses/{business_id}/catalog/{item_id}", response_model=list[PhotoView])
def list_catalog_photos(business_id: UUID, item_id: UUID,
                        ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    return PhotoService(db).list_for(ctx, "CATALOG", item_id, business_id)


@router.post("/businesses/{business_id}/catalog/{item_id}", response_model=PhotoView, status_code=201)
async def upload_catalog_photo(business_id: UUID, item_id: UUID, file: UploadFile = File(...),
                               ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    service = PhotoService(db)
    service.assert_upload_allowed(ctx, "CATALOG", item_id, business_id)
    content, width, height = await clean_photo(file)
    return service.upload(ctx, "CATALOG", item_id, business_id, content, width, height)


@router.get("/businesses/{business_id}/suppliers/{supplier_id}", response_model=list[PhotoView])
def list_supplier_photos(business_id: UUID, supplier_id: UUID,
                         ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    return PhotoService(db).list_for(ctx, "SUPPLIER", supplier_id, business_id)


@router.post("/businesses/{business_id}/suppliers/{supplier_id}", response_model=PhotoView, status_code=201)
async def upload_supplier_photo(business_id: UUID, supplier_id: UUID, file: UploadFile = File(...),
                                ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    service = PhotoService(db)
    service.assert_upload_allowed(ctx, "SUPPLIER", supplier_id, business_id)
    content, width, height = await clean_photo(file)
    return service.upload(ctx, "SUPPLIER", supplier_id, business_id, content, width, height)


@router.get("/{photo_id}/content")
def view_photo(photo_id: UUID, ctx: AuthContext = Depends(current_auth),
               db: Session = Depends(get_db)) -> Response:
    content = PhotoService(db).get_content(ctx, photo_id)
    return Response(
        content=content, media_type="image/webp",
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
                 "Content-Disposition": 'inline; filename="foto.webp"'},
    )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(photo_id: UUID, ctx: AuthContext = Depends(current_auth),
                 db: Session = Depends(get_db)) -> Response:
    PhotoService(db).delete(ctx, photo_id)
    return Response(status_code=204)
