"""QR público no debe producir pagos, conectar vendedor ni permitir flags QA."""
import base64

import pytest
from PIL import Image
from io import BytesIO

from app.modules.payments.qr_exhibition import (
    exhibition_enabled, validate_exhibition_environment,
)
from app.modules.payments.qr_service import render_demo_qr_data_uri


def test_exhibition_off_by_default(monkeypatch):
    monkeypatch.delenv("PYME_QR_EXHIBITION_ENABLED", raising=False)
    assert exhibition_enabled() is False
    validate_exhibition_environment()


@pytest.mark.parametrize("flag", [
    "PYME_DISPOSABLE_QA",
    "PYME_MP_QR_SHARED_QA_ENABLED",
    "PYME_MP_SHARED_QA_ORDERS_ENABLED",
    "PYME_MP_QR_TEST_ENABLED",
    "PYME_ENABLE_QR_DEMO_LAB",
    "PYME_ENABLE_QR_FINALIZATION_QA",
])
def test_exhibition_rejects_payment_or_simulation_flags(monkeypatch, flag):
    monkeypatch.setenv("PYME_QR_EXHIBITION_ENABLED", "1")
    monkeypatch.setenv(flag, "1")
    with pytest.raises(RuntimeError, match="Modo QR exhibicion incompatible"):
        validate_exhibition_environment()


def test_exhibition_accepts_explicit_safe_configuration(monkeypatch):
    monkeypatch.setenv("PYME_QR_EXHIBITION_ENABLED", "1")
    for flag in (
        "PYME_DISPOSABLE_QA",
        "PYME_MP_QR_SHARED_QA_ENABLED",
        "PYME_MP_SHARED_QA_ORDERS_ENABLED",
        "PYME_MP_QR_TEST_ENABLED",
        "PYME_ENABLE_QR_DEMO_LAB",
        "PYME_ENABLE_QR_FINALIZATION_QA",
    ):
        monkeypatch.setenv(flag, "0")
    assert exhibition_enabled() is True
    validate_exhibition_environment()


def test_synthetic_qr_is_png_not_provider_url():
    uri = render_demo_qr_data_uri("PYME-DEMO-" + "A" * 32)
    assert uri.startswith("data:image/png;base64,")
    png = base64.b64decode(uri.split(",", 1)[1])
    assert png[:8] == bytes([137, 80, 78, 71, 13, 10, 26, 10])
    img = Image.open(BytesIO(png))
    assert img.format == "PNG"
    assert img.size[0] > 50


def test_main_exhibition_two_decisions_require_separate_opt_in(monkeypatch):
    from app.modules.payments.qr_exhibition import exhibition_decisions_enabled
    monkeypatch.delenv("PYME_QR_EXHIBITION_ENABLED", raising=False)
    monkeypatch.setenv("PYME_QR_EXHIBITION_DECISIONS_ENABLED", "1")
    assert exhibition_decisions_enabled() is False
    with pytest.raises(RuntimeError, match="requiere modo exhibicion"):
        validate_exhibition_environment()

    monkeypatch.setenv("PYME_QR_EXHIBITION_ENABLED", "1")
    for flag in (
        "PYME_DISPOSABLE_QA", "PYME_MP_QR_SHARED_QA_ENABLED",
        "PYME_MP_SHARED_QA_ORDERS_ENABLED", "PYME_MP_QR_TEST_ENABLED",
        "PYME_ENABLE_QR_DEMO_LAB", "PYME_ENABLE_QR_FINALIZATION_QA",
    ):
        monkeypatch.setenv(flag, "0")
    assert exhibition_decisions_enabled() is True
    validate_exhibition_environment()

    monkeypatch.setenv("PYME_ENABLE_QR_DEMO_LAB", "1")
    with pytest.raises(RuntimeError, match="incompatible"):
        validate_exhibition_environment()
