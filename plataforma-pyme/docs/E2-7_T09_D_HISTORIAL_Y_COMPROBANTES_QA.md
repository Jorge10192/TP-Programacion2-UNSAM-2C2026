# E2-7 · T09-D — Historial y comprobantes de ventas REALES

**Rama:** `feature/e2-7-t09-consulta-recuperacion-ventas`. **Estado:** implementación de frontend incorporada; verificación funcional automática y pruebas manuales de navegador según acta. **PR #42:** borrador, sin merge a `main`.

## Objetivo funcional

Agregar consulta de ventas confirmadas sobre el backend de T09-C sin modificar el POS DEMO ni habilitar ventas reales desde el navegador. Las operaciones de creación y débito de stock continúan exclusivas del backend; la interfaz T09-D **solo lee**.

### Módulos y navegación

- `RealAuthApp.tsx`: habilita `/real/empresas/{business_id}/ventas`; revalida la sesión como en las demás pantallas REAL, con Bearer solo en memoria.
- `RealBusinessesPage.tsx`: añade acceso explícito desde la ficha de la empresa a **Historial de ventas REAL · consulta**.
- `RealSalesPage.tsx`: lista ventas de la empresa con fecha, monto y sede; admite filtrar sede, cargar más, abrir comprobante por ID y recuperar por `request_id` original. Etiqueta permanentemente **REAL y solo lectura**. Se muestra «Listado parcial» hasta completar las páginas.
- `realSalesReadGateway.ts`: GET `/sales?offset&limit&location_id`, GET `/sales/{sale_id}`, GET `/sales/by-request/{request_id}`. Parser estricto del DTO de resumen (sin referencias ni detalles de pago) y comprobante completo. Valida UUID, pertenencia al tenant, importes con HALF_UP, pagos, snapshots y coherencia de ID solicitado; rechaza respuestas inválidas sin DEMO fallback.
- `auth.css`: estilos para listado, comprobante y filtros responsivos.

## Reglas de negocio preservadas

1. **Titular y Administrador:** acceso a cualquier comprobante de la empresa.
2. **Encargado y Trabajador:** solo ventas de sedes con asignación `ACTIVA`; ninguna excepción por haberlas creado.
3. **Tenant ajeno o membresía revocada:** consulta denegada por backend. La UI no pretende ser fuente de permisos.
4. **Ventas de servicio sin sede:** solo titular/admin.
5. **Pago `MERCADO_PAGO_DECLARADO` y los demás medios:** son declaraciones históricas, no acreditaciones bancarias ni de Mercado Pago.
6. **F5:** se pierde el token en memoria, debe volver a iniciar sesión; el recibo se reconsulta por ID/clave original sin enviar una venta nueva.
7. **Paginación concurrente:** si aparecen IDs duplicados entre páginas se muestra error y opción de refresco completo; no se afirma disponer de un snapshot inmutable de todas las ventas.

## Matriz de QA automatizada

| Caso | Herramienta | Resultado |
|---|---|---|
| Lectura GET por ID, tenant y contrato estricto | `sales-real-read-api.test.mjs` (T09-A) | Aprobó en Windows y en CI previo |
| Resúmenes sin referencias de pago, filtros, paginación válida/inválida, duplicates, GET por solicitud y respuesta inconsistente | 6 pruebas nuevas T09-D de Node | Integradas, verificar último CI |
| Construcción React/TypeScript y lint | GitHub Actions frontend | Aprobado en el commit de código T09-D |
| F5/relogin, listado REAL, detalle por ID, recuperación por request, cero POST desde navegador | `e2e/real/sales.spec.ts` con API/PostgreSQL efímeros | Integrada, verificar último full-stack |
| Roles, cambios de asignación, 2 tenants, ventas sin sede, listados 101+ | `test_sales_read_scope_integration.py`, PostgreSQL real | T09-C aprobada: 7 pruebas nuevas |

La suite del browser exige `PYME_DISPOSABLE_QA=1`, FastAPI `127.0.0.1:18001` y PostgreSQL efímero. **No ejecutarla contra la instalación local del usuario**.

## Checklist de QA manual para el usuario (sin cambiar stock)

1. Sincronizar rama T09 con `git pull --ff-only origin feature/e2-7-t09-consulta-recuperacion-ventas` y ejecutar `npm.cmd run test:sales-real-read` desde `plataforma-pyme/frontend`.
2. Con el servidor Vite y API de desarrollo ya disponibles, entrar en sesión REAL (no DEMO), abrir **Mis empresas → la empresa TEST → Historial de ventas REAL · consulta**.
3. Comprobar etiqueta «Solo lectura» y que **no exista** botón para confirmar o crear una venta desde esta pantalla.
4. Si la empresa no tiene ventas confirmadas: verificar estado vacío, que no inventa registros DEMO ni ofrece «0 global» por una carga parcial.
5. Si tiene comprobantes REAL previos: abrir uno, verificar fecha, artículos/snapshots, pagos como **declarados**, total exacto y saldo histórico solo cuando corresponda. Filtrar una sede y regresar a «Todas las sedes autorizadas».
6. Si se conoce un `request_id` auténtico, consultar ese ID y comprobar que abre el mismo recibo, sin nueva venta. Nunca generar una nueva clave solo por un 404.
7. Recargar F5, volver a iniciar sesión y comprobar que el historial se reconsulta sin alterar ventas o stock.
8. Registrar fecha/capturas saneadas, roles/sede, resultado observado y fallas. **No registrar como ejecutado lo que todavía no se probó manualmente.**

## Pendientes y alcance

- **T09-D** incluye consulta de historial; no incluye POS real ni pagos externos, que se harán en T10.
- **T09-E** debe certificar formalmente pérdida de respuesta POST 201 y recuperación GET con misma identidad + sin dobles efectos en ventas, con PostgreSQL temporal.
- **T09-F** consolidará QA manual, auditoría final y cierre académico antes de pedir permiso de merge del PR #42.

**Este documento no autoriza fusión a `main`.** Los resultados de CI que aún no están confirmados deben permanecer como pendientes, no como aprobados.
