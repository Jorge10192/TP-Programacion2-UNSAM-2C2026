# E1-B3 — Ubicaciones DEMO por empresa

**Fecha:** 2026-11-06. **Estado:** código publicado en main; build, lint y pruebas visuales LOCALES PENDIENTES.
**Base de diseño:** matriz E0-A Z004 (Ubicaciones.html) y E0-B. No se copiaron scripts globales ni datos reales del HTML original.

## Alcance implementado

- Se habilita `/b/:businessId/ubicaciones` con listado, formulario de alta/edición, botón para designar principal y pausa/reactivación con confirmación contextual.
- Tipos: Local, Feria, Depósito, Oficina y Otro; dirección/referencia opcional. Capacidad de vender y capacidad de almacenar son booleanos independientes.
- Una empresa de servicios puede tener **cero ubicaciones**. Crear empresa **no** genera depósito, caja ni inventario.
- Una ubicación pertenece a `businessId`, y los comandos DEMO verifican la pertenencia antes de editar, pausar o hacer principal.
- Como máximo hay una ubicación principal **activa** por empresa. Si la principal se pausa, pierde el estado principal y la empresa puede quedar sin principal; al reactivar no se restaura automáticamente.
- No se elimina ninguna ubicación, se cambia su estado. El sistema todavía no tiene stock, caja ni referencias transaccionales; la pausa **no** ejecuta validaciones de operaciones pendientes, y no debe considerarse lista para producción.
- Los datos se guardan en `locations` dentro del almacenamiento preexistente `asistente-pyme.e1a2.demo.v1` (version 1), manteniendo profile, createdBusinesses, fixtureEdits y memberJobs intactos.
- El almacenamiento local valida el formato, la pertenencia empresarial y la unicidad de ubicación principal por empresa. No es seguridad real ni backup.
- Los formularios se desmontan al cambiar de negocio con `key={business.id}`; no se trasladan borradores entre empresas.

## Archivos

- `frontend/src/data/demo/demoStore.ts` — Location, input tipado, indexado por ID, lectura y guardado compatibles, comandos createLocation/updateLocation/setPrimaryLocation/setLocationStatus.
- `frontend/src/features/locations/LocationsPage.tsx` — creación, edición, listado, principal y pausa/reactivación.
- `frontend/src/App.tsx` — conexión a la ruta `ubicaciones` por empresa.
- `frontend/src/App.css` — tarjetas y formulario responsive.

## Validaciones pendientes (no se afirma su resultado)

Desde la carpeta `plataforma-pyme/frontend`:

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run dev
```

| Prueba | Procedimiento | Resultado esperado |
|---|---|---|
| UBI-01 | Abrir ubicaciones en empresa de Servicios recién creada | Lista vacía, sin local ni depósito ficticio |
| UBI-02 | Crear ubicación Local con vender=Sí, almacenar=No | Aparece una ubicación activa, sin inventario generado |
| UBI-03 | Crear Depósito con vender=No, almacenar=Sí | Ambas capacidades son independientes |
| UBI-04 | Elegir otra ubicación principal | La anterior deja de ser principal |
| UBI-05 | Pausar ubicación principal | Queda pausada, sin principal; ofrece reactivar |
| UBI-06 | Reactivar ubicación | Activa, no se convierte sola en principal |
| UBI-07 | Editar A; cambiar a B; volver | A conserva datos; B no se ve afectada ni hereda borrador |
| UBI-08 | Guardar cambios y presionar F5 | Persisten los registros de cada empresa |
| UBI-09 | Refrescar con perfil, empresas y función laboral preexistentes | Datos anteriores conservados |
| UBI-10 | Intentar nombre vacío o inválido | Error/validación; no altera el estado |
| UBI-11 | Reducir a pantalla móvil de 390px | Formulario y tarjetas legibles |
| UBI-12 | `npm.cmd run build` y `npm.cmd run lint` | Sin errores ni advertencias |

## Lo que NO implementa

No hay API, permisos efectivos, geolocalización, inventario, caja, ubicaciones asignadas a colaboradores ni bloqueo de pausa con operaciones pendientes. La integración con TP3, roles por ubicación, ledger de stock y ventas viene en posteriores incrementos. Antes de usar pausas con operaciones reales, agregar validaciones de stock y caja del servidor, no confiar en controles visuales.

## Actualización E2-2 A.1 — CASA en la DEMO (08/11/2026)

Se agregó la opción **CASA — Casa o domicilio particular** al selector de ubicaciones existente, conservando `LOCAL`, `FERIA`, `DEPOSITO`, `OFICINA` y `OTRO`. El tipo `LocationKind`, las etiquetas y ambas validaciones (entrada y recuperación del almacenamiento local) aceptan CASA. `canSell` y `canStore` continúan independientes y se mantienen todos los comandos y datos previos. La pantalla genera sus opciones a partir de `locationKindLabels`, por lo que no requiere otra implementación visual. **No se geolocaliza, publica ni verifica automáticamente el domicilio** y no hay sincronización con FastAPI. Los CI del cambio CASA aprobaron: backend 217 tests, frontend build/lint/E2E 2/2. Para comprobación manual: crear CASA en el selector, guardar, recargar y constatar persistencia; verificar también que ubicaciones de tipos anteriores siguen visibles.
