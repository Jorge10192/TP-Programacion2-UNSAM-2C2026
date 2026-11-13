"""Modo exhibición público: QR sintético, sin operaciones de cobro externo.

Nunca se activa automáticamente en entornos QA de Mercado Pago. La API
continúa exigiendo sesión y permisos por empresa para crear y leer QR.
"""
import os

_INCOMPATIBLE_FLAGS = (
    "PYME_DISPOSABLE_QA",
    "PYME_MP_QR_SHARED_QA_ENABLED",
    "PYME_MP_SHARED_QA_ORDERS_ENABLED",
    "PYME_MP_QR_TEST_ENABLED",
    "PYME_ENABLE_QR_DEMO_LAB",
    "PYME_ENABLE_QR_FINALIZATION_QA",
)


def exhibition_enabled() -> bool:
    return os.environ.get("PYME_QR_EXHIBITION_ENABLED") == "1"


def exhibition_simulation_enabled() -> bool:
    """Explicit public QA exception for internal fictitious sale decisions.

    Does not enable the legacy QR lab nor any external Mercado Pago path.
    """
    return (
        exhibition_enabled()
        and os.environ.get("PYME_QR_EXHIBITION_SIMULATION_ENABLED") == "1"
    )


def validate_exhibition_environment() -> None:
    """Fail closed if demo exhibition could reach provider/simulate settlement."""
    if os.environ.get("PYME_QR_EXHIBITION_SIMULATION_ENABLED") == "1" and not exhibition_enabled():
        raise RuntimeError("Simulacion de exhibicion requiere modo exhibicion")
    if exhibition_enabled():
        conflicting = [key for key in _INCOMPATIBLE_FLAGS if os.environ.get(key) == "1"]
        if conflicting:
            raise RuntimeError(
                "Modo QR exhibicion incompatible con funciones de pago TEST y "
                "simulacion: " + ", ".join(conflicting)
            )
