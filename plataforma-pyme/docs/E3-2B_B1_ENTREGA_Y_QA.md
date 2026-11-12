# E3-2B / B1 — Vinculación Mercado Pago DEMO · entrega para QA

**Estado:** implementada en rama, pendiente de ejecutar CI y prueba manual; no aprobada ni integrada a `main`.

## Alcance real

- Menú REAL por empresa: **Medios de cobro** (`/real/empresas/{business_id}/medios-de-cobro`).
- Tarjeta **Mercado Pago DEMO**: estado, titular ficticio, referencia y controles de vincular/desvincular/consultar.
- API autenticada:
  - `GET /api/v1/businesses/{business_id}/payment-connections/mercadopago`
  - `POST /api/v1/businesses/{business_id}/payment-connections/mercadopago/demo`
  - `DELETE /api/v1/businesses/{business_id}/payment-connections/mercadopago/demo`
- Tabla `merchant_payment_connections`, migración aditiva `e32b_payment_connection` después de `e32a_photo_assets`.
- Un vínculo por empresa/proveedor/modo; repetir conexión no duplica datos. Desconexión conserva referencia; reconexión reactiva el registro.
- Autorización de mutación: TITULAR_ADMINISTRATIVO o ADMINISTRADOR de empresa ACTIVA. Roles operativos consultan; ajenos 404; suspensión 409.
- Ninguna contraseña, token externo, CVU, dinero, QR cobrable o venta se genera en B1.

## Preparación local (Windows / PowerShell)

Desde `plataforma-pyme/` en una copia de trabajo limpia, sin sobrescribir cambios propios:

```powershell
git fetch origin
git switch feature/e3-2b-mercadopago-qr-demo
git pull --ff-only origin feature/e3-2b-mercadopago-qr-demo
docker compose --profile api up -d --wait
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic check
.\.venv\Scripts\python.exe -m pytest -q tests/test_payment_connection_b1.py
$env:RUN_DB_INTEGRATION = '1'
try { .\.venv\Scripts\python.exe -m pytest -q tests/test_payment_connection_b1.py } finally { Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue }
cd ../frontend
npm.cmd run build
```

**Precaución:** usar solo PostgreSQL QA descartable antes de ejecutar migración/pruebas integradas. Si el Docker Compose apunta a datos reales, cambiar explícitamente la base antes de correrlo. No ejecutar tests de escritura contra la base cotidiana.

## Recorrido humano de B1

1. Iniciar sesión REAL con empresa A y rol titular. Abrir **Medios de cobro**, observar `NO_VINCULADA`.
2. Pulsar **Vincular cuenta demo**; comprobar `ACTIVA` y referencia que empieza con `MP-DEMO-`.
3. Pulsar **Consultar estado**, cambiar de pantalla y volver; al recargar F5 volver a iniciar sesión (el token solo vive en memoria); comprobar persistencia de la cuenta.
4. Cambiar a otra empresa B; verificar que su tarjeta está separada y no revela la referencia de A.
5. Como trabajador de A, comprobar lectura y ausencia de controles de modificación; la API devuelve 403 ante POST/DELETE.
6. Como titular, desvincular y reconectar; mantener el mismo identificador de prueba.
7. Empresa suspendida: consulta permitida, cambios 409.
8. Verificar que ventas, caja, stock, POS y dinero real permanecen intactos.

## Puerta de salida

No comenzar B2 ni integrar a `main` hasta: CI backend/frontend/fullstack aprobado, Alembic `check` limpio, pruebas PostgreSQL QA y recorrido humano validados. B1 no constituye un cobro habilitado.