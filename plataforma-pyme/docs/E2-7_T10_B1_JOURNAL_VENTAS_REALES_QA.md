# E2-7 · T10-B1 — Journal persistente de ventas REALES (sin POST)

**Fecha:** 10/11/2026 · **Rama:** `feature/e2-7-t10-pos-ventas-real` · **PR #43:** borrador, sin merge.

## 1. Alcance implementado

Se agregó `frontend/src/features/sales/salePendingJournal.ts`, módulo para **conservar localmente intentos confirmados por el usuario antes de enviar un POST**, todavía **sin integrarlo a un POS que escriba ventas**. Patrón compatible con los journals existentes de empresa y compras; usa base IndexedDB **separada** `asistente-pyme-real-sales-v1`, almacén `pending`, máximo 60 registros. No guarda token Bearer, contraseñas ni sesiones, pero guarda información comercial **sin cifrar**, por lo que se desaconsejan dispositivos compartidos.

Cada intención preserva exactamente: `scope`, `actorId`, `businessId`, `kind: sale.create`, `key` UUID4, `body` completo normalizado/validado por T10-A y `createdAt`. `scope = actorId:businessId:sale.create` prohíbe que una empresa o actor vea la venta pendiente de otro. No se genera `key` durante el render de React.

### Operaciones y garantías

- `newSalePending(actorId, businessId, body, key?)`: crea intención canónica; **no escribe** en disco ni en red.
- `journal.reserve(intent)`: transacción IndexedDB; rechaza segunda clave/cuerpo incompatible, lee nuevamente la fila y exige igualdad exacta **antes de permitir que otro incremento utilice un POST**. Sin reserva y relectura exitosas, fallar cerrado.
- `journal.load(scope)`: luego de F5 y nuevo login, restaura el mismo cuerpo/UUID4 o indica ausencia; si está corrupto/no canónico, **no** lo reemplaza automáticamente.
- `journal.closeConfirmed(scope, key, receipt)`: exige comprobante REST `SaleView` válido, misma empresa/actor/clave/sede, subtotal/total/descuento/notas, cada línea y cada pago declarado con su orden e importe. Solo entonces puede eliminar la intención original.
- No existe operación de borrado libre en la API pública del journal. Los intentos de más de 30 días solo reciben advertencia; no se purgan por TTL.
- Los errores de IndexedDB bloquean la futura escritura de venta en vez de generar un nuevo UUID o degradarse silenciosamente a memoria.
- `GET /sales/by-request/{request_id}` disponible desde T09 será el primer paso de recuperación en T10-B2/C. **404 no garantiza** que la venta no llegó; no cerrar ni generar solicitud nueva.
- Aún **no se invoca `POST /sales` desde la UI** ni se registran nuevas ventas/stock. El mecanismo de recuperación/reintento controlado y los botones del POS son trabajo posterior.

## 2. QA automático

`frontend/tests/sales-real-pending.test.mjs` agrega **12 tests** de: reserva y restauración F5; separación por actor/tenant; bloqueo de claves/cuerpos cambiados; datos corruptos/secretos; IndexedDB inaccesible; rechazo de comprobantes ajenos o incompatibles; cierre solo con comprobante válido; fallo de borrado sin pérdida; antigüedad sin purga; UUID4/NFKC y ausencia de efectos de red.

Comando Windows: `npm.cmd run test:sales-real-pending`.

**Evidencia inicial CI:** el workflow frontend del commit `34f755d0` completó **SUCCESS**, con **12/12** pruebas T10-B, TypeScript/Vite y lint sin errores. En conjunto T10-A tiene **11/11** pruebas. Se registrará el workflow definitivo del último commit T10-B1 una vez concluido; la suite full-stack está corriendo contra PostgreSQL descartable y no involucra datos del usuario.

## 3. Pendientes y puertas

**T10-B2:** gateway del POST de venta asociado exclusivamente a un intento previamente persistido, recuperación GET, manejo de `201`/`200`/`409`, 401/403 y resultado incierto. Exigir tests que prueben ausencia de POST si falla el journal, no reintentar automáticamente y nunca crear una nueva clave ante 404 o timeout.

**P01 sigue pendiente de aprobación humana:** permisos de precio y descuento por rol. Antes de habilitar T10-C/D (confirmación desde React) debe definirse y **aplicarse también en FastAPI**, nunca solo ocultando el formulario.

No habilitar creación de ventas reales hasta completar el journal+gateway, contratos por rol, tests con backend y confirmación humana. Mantener PR #43 en borrador.
