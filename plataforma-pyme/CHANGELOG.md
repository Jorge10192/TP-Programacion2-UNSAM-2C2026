# Registro de cambios — Plataforma PyME (E2-7/T12)

El historial E1 original continúa al final. Este encabezado actualiza los cortes posteriores sin afirmar despliegue productivo.

## E2-7 / T12 — Cierre académico documental (11/11/2026)

- Reconciliados requerimientos 01 (RF-01..RF-10), casos de uso 02 (CU-01..CU-12), modelo 03 (19 entidades ORM), arquitectura 04 y trazabilidad 05 (46 operaciones FastAPI/13 routers).
- Actualizados PlantUML, guías y SVGs 03A/03B/03C; agregado un **segundo SVG de flujo de compras→recepción→stock→venta para exposición** conservando el 03B canónico.
- Añadido índice de diagramas, portadas de alcance REAL/DEMO, actualizaciones de README y acta de conciliación. Históricos conservados.
- Este cambio es exclusivamente documental en `plataforma-pyme/`. El PR #46 se mantiene DRAFT hasta revisión/permiso explícito de merge.

## E2-7 / T01–T11 — Integración y QA REAL (hasta 11/11/2026)

- React/TypeScript/Vite conectado a FastAPI/PostgreSQL en rutas `/real` para identidad, empresas, sedes, equipo, catálogo, proveedores, compras, recepción, inventario y ventas POS, sin mezclar información DEMO.
- Permisos por tenant, roles y ubicaciones, validación de stock concurrente, idempotencia y recuperación de ventas, reglas de precios y pagos declarados; RF-08..RF-10 no extendidos al backend REAL.
- PR #45 fusionado en `main` `c6a77137cf82dcb9aad225645e84b1265b1da3ec`. [Acta de QA T11](docs/E2-7_T11_E_AUDITORIA_FINAL_PREMERGE.md) registra 892 Pytest, 38 Playwright REAL y 6 DEMO en su commit funcional verificado. No atribuir esas cifras al HEAD de T12.

## E2-1 a E2-6 — Evolución del backend (resumen)

- Identidad y sesiones → empresas, membresías/invitaciones → ubicaciones/asignaciones → catálogo → proveedores, compras/recepción → saldos, ledger, traslados y ajustes → ventas con pagos declarados.
- PostgreSQL/SQLAlchemy/Alembic y CI por incrementos; snapshots de compra/venta y controles transaccionales. Ver `docs/E2-*` y `entrega-programacion-2/`.

> **Backlog post-académico (Etapa 2):** convergencia visual REAL/DEMO, DER PostgreSQL (p. ej. DBeaver), demostración web/móvil, cuentas/caja/gastos, y Mercado Pago QR auténtico con OAuth, webhooks y conciliación por empresa. No es compromiso ya cumplido ni pago REAL existente.

---

## Historial original E1 preservado

# Changelog — Plataforma PyME

Registro de los incrementos relevantes para el prototipo de Programación 2. Los registros E1 son locales y DEMO; no representan pagos verificados ni autorización de servidor.

## E1-D2 — integración del frontend
- E2E Playwright Chromium desktop/móvil: navegación, aislamiento de empresas, placeholders, accesibilidad del menú, flujo QR completo.
- QA y matriz de no regresión documentados; CI de GitHub verifica navegador, compilación, lint y políticas.
- Etiquetas y mensajes de pantalla alineados con módulos ya integrados; sin migración ni modificación de negocio.

## E1-D1 — QR de cobro visual DEMO
- Estados PENDIENTE, SIMULADO_APROBADO y CANCELADO con persistencia por negocio y sin QR escaneable.
- No registra venta ni salida de stock al crear QR; confirmación simulada revalida productos activos, stock y cuentas.
- Saldo pendiente de pagos divididos aplicado al último medio, no al primero.

## E1-C3 / C3.1 — cuentas y medios
- Directorio financiero DEMO por negocio, cuentas activas/inactivas y principales.
- Asociaciones opcionales en ventas y gastos; transferencias admiten banco o billetera compatible.

## E1-B / E1-C — operación integrada
- Catálogo, imágenes, proveedores, compras, inventario y control de stock; venta, gastos y arqueo.
- Imagen de existencias física reutiliza la del mismo artículo en Catálogo, sin duplicar blobs.

**Próxima fase E2:** arquitectura del backend, dominio, UML y contratos de API antes de FastAPI y Docker.
