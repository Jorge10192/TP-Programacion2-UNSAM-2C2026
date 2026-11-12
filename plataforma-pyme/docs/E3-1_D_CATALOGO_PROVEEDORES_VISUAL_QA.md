# E3-1D — Catálogo y Proveedores: diseño visual REAL y QA

**Fecha:** 12/11/2026  
**Base apilada:** PR #51 E3-1C3, aún sin integrar a main; PR #50 es dependencia de #51.  
**Rama:** feature/e3-1d-catalogo-proveedores-visual  
**Fuente funcional:** frontend React REAL y gateways FastAPI existentes, no los HTML DEMO.

## Objetivo

Tras la revisión aprobada de E3-1C3, la UX de gestión debe usar **vistas exclusivas**: las tarjetas permanecen en el listado, pero crear, editar o consultar una ficha sustituye el contenido por una pantalla independiente con **«Volver»** arriba; no se expanden formularios debajo de las tarjetas.

## Catálogo REAL

- Encabezado, resumen de fichas **cargadas** (total, activas, inactivas) y tarjetas con nombre, tipo, categoría, unidad, SKU, vendible, precios y estado.
- Búsqueda por nombre/SKU, filtro por tipo/estado, **solo dentro de páginas consultadas**. Nunca sugerir que se buscó todo el catálogo cuando quedan páginas posibles.
- **Ver ficha** accesible a quienes pueden consultar: datos y textos reales sin lanzar mutaciones.
- **Crear artículo / Editar** abren vistas dedicadas, con precarga actual en edición y cancelación que no escribe.
- Mantener tipo/unidad compatibles, centavos exactos, validación, 409 y recuperación ante resultado incierto. El guardado confirmado retorna al listado y reconsulta la primera página porque el nombre afecta el orden.
- Sin fotos reales ni almacenamiento DEMO, ni stock inventado. No se añaden endpoints.

## Proveedores REAL

- Encabezado, totales **cargados**, estado, búsqueda local, fichas con datos de contacto que efectivamente entrega FastAPI.
- **Ver ficha** abre pantalla de consulta con contacto, teléfono, correo, dirección, WhatsApp, web, Instagram, Maps, ofertas y notas, si existen; sin editar ni generar datos ficticios.
- **Agregar proveedor** abre una vista de alta exclusiva, **solo por nombre comercial**, porque es lo único que implementa el gateway REAL de esta pantalla. Cancelar no hace POST, guardar vuelve al listado si la operación y la reconsulta resultaron correctamente.
- Activar/desactivar conserva el diálogo de confirmación existente y la API actual.
- No presentar edición ficticia de contactos, promociones, medios de pago, pagos o QR. No generar compras automáticamente.

## Invariantes

1. No tocar backend, esquema, migraciones, permisos, roles, cachés cross-tenant ni rutas del shell.
2. Ningún dato DEMO se mezcla con la API REAL; todos los datos, incluidos contadores, se calculan a partir del tenant y de páginas realmente consultadas.
3. Las escrituras dudosas bloquean reintentos automáticos y requieren reconsulta segura; no duplicar altas.
4. La selección de empresa remonta los componentes, eliminando borradores de otra empresa.
5. Botones con foco y estado de pulsación, vistas dedicadas, navegación por teclado y responsive a 390 px.

## Pruebas y revisión

- **E2E nueva:** e2e/real/catalog-suppliers-visual.spec.ts, solo en PostgreSQL efímero: tarjetas, filtros, ficha, precarga y cancelación, alta REAL, navegación, móvil, ausencia de ventas/stock ficticios.
- **Regresión:** business-crud-persistence.spec.ts actualizado para acceder al nuevo formulario dedicado de proveedores, sin alterar expectativas de CRUD.
- **CI exigida:** build/lint/frontend, E2E Chromium, backend/postgres full-stack y regresión DEMO.
- **QA manual antes de merge:** catálogo con artículos de prueba de distintos tipos; verificar búsqueda local, cambio de precio con rol autorizado, cancelación; proveedor con datos reales o sin completar; creación y regreso; móvil/escritorio.

## Dependencias de PR

Este PR se basa en PR #51 E3-1C3. No fusionar C2, C3 ni D sin autorización expresa; validar cambios primero y luego aprobar integración secuencial. No modificar la base local del usuario.
