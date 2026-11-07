# E1-D2 — Integración del frontend y preparación de E2

**Producto:** plataforma de gestión PyME multirrubro y multiempresa. **WALOS es solamente un negocio de ejemplo.**

**Alcance:** cerrar los incrementos E1-A/B/C/D, evitar regresiones de frontend, consolidar la QA y preparar el traspaso a contratos y modelos de backend. E1-D2 no agrega pagos reales ni autentificación.

## 1. Evidencia y estado

| Área | Evidencia | Estado |
|---|---|---|
| Shell, menú y contexto A/B | QA manual iterativa del usuario; E2E Playwright por ruta y drawer | Validado manualmente; E2E automatizado |
| Catálogo, imágenes e Inventario | QA manual: dos ubicaciones, fotos compartidas y persistencia de stock | Validado manualmente |
| Compras, recepción, traslados y conteos | QA del usuario de E1-B7/B8/B9, tests de políticas de inventario | Validado manualmente |
| Ventas y pagos mixtos | QA de cobros, múltiples medios, saldo al último y cuentas activas | Validado manualmente |
| Cuentas, Gastos, Caja | 8 pruebas de E1-C3/C3.1; tests unitarios y cierres existentes | Validado manualmente |
| QR DEMO | Creación, F5, cancelación, aprobación simulada y producto desactivado | Validado manualmente (no MP real) |
| Navegador escritorio y móvil | `frontend/e2e/specs/frontend.spec.ts` / GitHub Actions | CI como fuente de verificación reproducible |

No se inventan capturas ni se afirma haber verificado todos los navegadores. Los E2E usan **Chromium desktop y móvil**, no Firefox ni Safari. Las fotos IndexedDB cargadas por el usuario no se suben a la CI.

## 2. Suite automatizada E1-D2

- Navegación entre empresas de ejemplo, 404 empresarial y pantalla «Próximamente».
- Drawer: teclado Escape y devolución de foco al botón inicial.
- Revisión de ancho horizontal en rutas clave tanto en escritorio como móvil.
- Alta de servicio por empresa; el servicio de A no aparece en B.
- QR DEMO con un solo medio Mercado Pago declarado; su estado PENDIENTE no crea venta; F5 recupera la intención; B no la ve; cancelar no crea venta; la aprobación simulada crea una venta y el reintento/persistencia no la duplica.

**Ejecución local** (PowerShell, desde `plataforma-pyme/frontend`):

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run lint
npm.cmd run test:accounts
npm.cmd run test:sales
npm.cmd run test:cash
npm.cmd run test:qr
npm.cmd run test:inventory
npm.cmd run test:images
cd e2e
npm.cmd install
npx.cmd playwright install chromium
npm.cmd test
```

Para revisar las ejecuciones y sus evidencias, consultar GitHub → Actions → «Plataforma PyME · Frontend». `playwright-report` y `test-results` se suben como artifact si falla el E2E.

## 3. Invariantes para el backend

1. `businessId` filtra en el servidor y los permisos se verifican contra membresía real, no sólo por frontend.
2. Un producto inactivo jamás es vendido al aprobar un QR previamente emitido; un QR pendiente no reserva ni descuenta stock.
3. Venta e inventario participan de la misma transacción al confirmar, con idempotencia de `requestId`.
4. Todas las aplicaciones de pagos suman exactamente al total en centavos; declaración interna ≠ acreditación financiera.
5. El último medio puede completarse por el saldo pendiente, sin alterar importes anteriores.
6. Cuentas bancarias/billeteras desactivadas no se pueden usar en operaciones nuevas, pero su referencia histórica persiste.
7. Caja física no se mezcla con transferencias; el snapshot cerrado es inmutable.
8. Fotos se asocian al ID del artículo y empresa, nunca al saldo/ubicación; actualmente se guardan solo en IndexedDB.

## 4. Límites explícitos

- Los datos continúan en `localStorage`/IndexedDB, sin sincronización segura entre pestañas o equipos.
- No hay usuarios autenticados, autorización real ni API externa.
- El QR es ilustrativo/no escaneable y la aprobación es una simulación.
- El QR de pago parcial, conciliación real, reservas de stock, producciones/lotes, reembolsos y costos reales quedan diferidos.
- No se migra el historial DEMO local a PostgreSQL automáticamente: se planificará una importación explícita tras definir contratos.

## 5. Puerta de salida hacia E2

- Conservar frontend React/TypeScript y un gateway sustituible por cliente HTTP, sin reescribir pantallas.
- E2 debe fijar entidades `User`, `Business`, `Membership`, `CatalogItem`, `Location`, `Supplier`, `Purchase`, `Receipt`, `StockMovement`, `Sale`, `PaymentApplication`, `Expense`, `CashSession`, `FinancialAccount` y `QrPaymentIntent`.
- Entregables próximos: UML de clases, diagramas transaccionales (venta/stock/caja), tablas SQL, contratos OpenAPI, errores, roles, patrón Repository/Service y trazabilidad de **al menos 5 requisitos** de la consigna de Programación 2.
- Solo después: FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL, Docker Compose, registro/login real, pytest, CI y deploy.

**Criterio funcional de E1-D2:** los recorridos E2E y políticas en CI deben aprobar; la prueba de UX en navegador del usuario sigue siendo una revisión complementaria.
