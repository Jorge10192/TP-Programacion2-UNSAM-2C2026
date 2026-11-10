# E2-7 T06 — Registro durable de intentos, recuperación segura y límites

**Estado:** PR borrador, sujeto a CI y QA full-stack; no fusionar antes de validación.  
**Base:** `main` `474ff6e4086808c5a70da9725c91caa0e3f634ee` (T05).  
**Rama:** `feature/e2-7-t06-comandos-pendientes`.

## 1. Riesgo que resolvemos

Si el servidor confirma un comando, pero la respuesta se pierde por timeout o F5, el navegador no puede suponer que falló ni enviar un POST nuevo con otra clave. En backend la **creación de empresas** (`POST /api/v1/businesses`) soporta `Idempotency-Key` UUID4 por actor y body inmutable; repetir la misma clave + mismo cuerpo con sesión nueva del **mismo usuario** produce replay (200) sin empresa duplicada. Usar misma clave con cuerpo diferente devuelve 409.

La reserva de claves se persiste **antes** de enviar el POST mediante IndexedDB. Si el navegador no permite guardar, falla cerrado y no envía el POST. Una vez autenticado el mismo usuario después de F5, el formulario `/real/empresas/nueva` recarga su clave y cuerpo originales y exige decisión humana sobre reintento. **No hay reenvíos automáticos**.

## 2. Alcance de esta implementación

- `frontend/src/features/pending/businessIntentJournal.ts`: puerto abstracto de persistencia y adaptador IndexedDB, validación de datos, separación por actor, exclusión mutua de 1 intento por usuario y límite global de 20 usuarios guardados por origen.
- `frontend/src/features/businesses/RealBusinessesPage.tsx`: lectura y restauración después de F5 y login, consentimiento explícito para la persistencia local, bloqueo de edición mientras haya un intento, reserva durable antes del POST, misma clave para reintentos, borrado tras éxito o descarte manual advertido.
- `frontend/src/features/auth/RealAuthApp.tsx`: ruta segura de retorno después de re-login en `/real/empresas/nueva`.
- `frontend/tests/pending-commands.test.mjs`: pruebas deterministas de reserva/recuperación/aislamiento/inmutabilidad y errores sin dependencias nuevas.
- `frontend/src/features/auth/auth.css`: estados visuales del intento guardado.
- `frontend/package.json` + workflow de frontend: `npm run test:pending-commands`.

**No se persisten** tokens Bearer, contraseñas, códigos de invitación, credenciales, pagos, datos de ventas, datos personales del trabajador ni contenido del `demoStore`. El registro guarda solo:
```json
{
  "actorId": "UUID del usuario autenticado",
  "kind": "business.create",
  "key": "UUID4 Idempotency-Key",
  "body": {"name": "...", "category": "...", "activity_kind": "PRODUCTOS"},
  "createdAt": "ISO timestamp"
}
```
El espacio de almacenamiento se llama `asistente-pyme-real-intentos-v1`. El usuario actual solo puede visualizar/reanudar sus propios pendientes tras autenticarse contra FastAPI.

## 3. Política de privacidad, retención y dispositivos compartidos (P04)

**Decisiones para el MVP:**

1. IndexedDB está limitado al origen/navegador, **no es una base remota ni un almacén cifrado**. Cualquiera con acceso a los archivos del perfil del navegador o con JavaScript malicioso en el mismo origen podría inspeccionarlo. No usar la función en dispositivos compartidos. El formulario exige consentimiento explícito.
2. Un pendiente como máximo por actor; máximo 20 actores en este navegador, sin eliminar registros ajenos al iniciar una operación nueva. Si no hay capacidad o IndexedDB está bloqueado, se interrumpe el alta antes del POST.
3. A los **30 días** el registro se marca como antiguo y se solicita revisión especialmente cuidadosa. No se purga silenciosamente algo no resuelto; la retención queda bajo control manual del usuario. Esta política debe revisarse en una eventual salida a producción para un límite legal/operativo real.
4. El registro se borra únicamente tras confirmación del servidor **y** limpieza local exitosa, o mediante descarte explícito después de revisar `Mis empresas`. El borrado local no elimina empresas en PostgreSQL.
5. Logout/F5 no eliminan pendientes para permitir recuperación, aunque sí descartan el token en memoria. No hay sincronización entre navegadores ni dispositivos.
6. Borrar datos del sitio, usar un navegador privado, cambiar de perfil de Firefox o perder el disco puede destruir IndexedDB; no hay garantía absoluta ante daño/pérdida del almacenamiento. **No** declarar recuperación infalible.

## 4. Cuáles operaciones quedan deliberadamente excluidas

| Operación | Backend | Política T06 |
|---|---|---|
| Crear empresa | Idempotency-Key UUID4 + replay en servidor | **Integrada con journal durable y reintento manual** |
| Crear artículo | No soporta clave/replay de comando | Advertir resultado incierto; consultar catálogo antes de decidir |
| Emitir invitación | Código de un único uso y sin GET que devuelva secreto | No guardar token claro ni reemitir automáticamente |
| Crear ubicación / cambiar rol / asignar | No tienen clave de replay según contrato | No reintentar automáticamente; releer estado |
| Crear compra / recibir compras | Requiere análisis de los contratos por incremento T07 | Sin interfaz REAL habilitada todavía |
| Confirmar venta | Idempotency-Key y replay, pero no hay recuperación por request-id aprobada | **Diseño pendiente de T09** y aplicación en POS real T10, no se habilita aquí |

La infraestructura actual guarda solamente `business.create`. No reutilizar la misma estrategia indiscriminadamente en operaciones no idempotentes. En particular, no informar “no se creó” solo porque un GET devolvió 404 o porque una respuesta se perdió.

## 5. Pruebas locales

Desde `plataforma-pyme/frontend`:

```powershell
git pull --ff-only origin feature/e2-7-t06-comandos-pendientes

npm.cmd run test:pending-commands
if ($LASTEXITCODE -ne 0) { throw 'Falló test:pending-commands' }
npm.cmd run test:api
if ($LASTEXITCODE -ne 0) { throw 'Falló test:api' }
npm.cmd run test:auth
if ($LASTEXITCODE -ne 0) { throw 'Falló test:auth' }
npm.cmd run test:businesses
if ($LASTEXITCODE -ne 0) { throw 'Falló test:businesses' }
npm.cmd run test:operations-real
if ($LASTEXITCODE -ne 0) { throw 'Falló test:operations-real' }
npm.cmd run test:catalog-real
if ($LASTEXITCODE -ne 0) { throw 'Falló test:catalog-real' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Falló build' }
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw 'Falló lint' }
```

Con `docker compose --profile api up -d --wait` y `PYME_API_PROXY_TARGET=http://127.0.0.1:18000`, ejecutar `npm.cmd run dev` y abrir `http://localhost:5173/real/login`.

## 6. QA manual, únicamente con cuentas y empresas de prueba

| Escenario | Acción | Esperado |
|---|---|---|
| T06-01 | Abrir nueva empresa, sin tildar consentimiento | No se permite enviar POST |
| T06-02 | Aceptar y crear `TEST T06 OK` | HTTP 201; empresa visible; intento borrado |
| T06-03 | Crear intento de `TEST T06 PENDIENTE` con red interrumpida, después de guardar la clave | Resultado incierto; no aparece una empresa duplicada automáticamente |
| T06-04 | F5 en ruta `/real/empresas/nueva` | Pide login; vuelve al formulario, rehidrata clave/cuerpo |
| T06-05 | Abrir formulario con otro usuario de prueba en el mismo navegador | Nunca ve el pendiente del usuario anterior |
| T06-06 | Reingresar con actor original | Se recupera el mismo intento, campos bloqueados, se ofrece verificar el listado |
| T06-07 | Repetir voluntariamente con idéntica clave y contenido | Backend devuelve creación o replay; un solo efecto en PostgreSQL |
| T06-08 | Descartar pendiente explícitamente | Quita solo IndexedDB después de confirmar advertencia, sin borrar empresa |
| T06-09 | Bloquear IndexedDB desde ajustes del navegador | La operación NO se envía sin reserva confirmada |
| T06-10 | Navegar A→B / salir y volver a DEMO | No aparecen datos de otro actor/tenant, ni se crea nada por navegación |
| T06-11 | 30+ días simulados en pruebas unitarias | Se marca antiguo, nunca se borra de forma silenciosa |

**Precauciones:** el corte de red debe hacerse en entorno de pruebas (idealmente base PostgreSQL efímera), no en una operación importante. Si el POST llegó a servidor, puede existir aun sin respuesta. No asumir resultados por apariencia de red. No recargar ni borrar datos del sitio de manera indiscriminada si existe un pendiente.

## 7. Puerta de cierre

CI con build, lint y suites previas + `test:pending-commands`; verificaciones locales; pruebas F5/re-login, mismo actor y actor diferente; evidencia de que no se duplica empresa ni se pierde el intento tras corte de red. No fusionar sin ello. Las reglas de recuperación para ventas y la consulta por request-id serán parte de T09/T10, no se infieren aquí.
