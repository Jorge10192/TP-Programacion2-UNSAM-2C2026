"""CU-12b: aceptar una invitación como identidad global autenticada."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.businesses.schemas import AcceptBusinessInvitationRequest, BusinessView
from app.modules.businesses.service import (
    BusinessService, BusinessSuspended, CreationSessionInvalid,
    InvitationNotAcceptable, InvitationUnavailable,
)

router = APIRouter(prefix="/invitations", tags=["invitaciones"])


@router.post(
    "/accept",
    response_model=BusinessView,
    responses={
        401: {"description": "Cuenta o sesión inválida"},
        404: {"description": "Token no disponible para esta identidad"},
        409: {"description": "Invitación no aceptable o empresa suspendida"},
        422: {"description": "Formato de token inválido o campos extra"},
    },
    summary="Aceptar invitación una sola vez con la cuenta destinataria",
)
def accept_business_invitation(
    command: AcceptBusinessInvitationRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> BusinessView:
    try:
        return BusinessService(db).accept_invitation(
            context.user.id, context.auth_session.id, command,
        )
    except CreationSessionInvalid:
        raise unauthorized() from None
    except InvitationUnavailable:
        raise HTTPException(
            status_code=404, detail="Invitacion no disponible",
        ) from None
    except (InvitationNotAcceptable, BusinessSuspended):
        raise HTTPException(
            status_code=409, detail="Invitacion no aceptable",
        ) from None
