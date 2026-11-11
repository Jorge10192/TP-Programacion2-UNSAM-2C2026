# E2-7 · T11-D — QA de escritorio/móvil, teclado y separación REAL/DEMO

**Fecha:** 11/11/2026. **Rama:** `feature/e2-7-t11-qa-integral-hardening`. **PR:** [#45](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/45) (DRAFT).

## Objetivo y alcance

Ampliar la cobertura de navegador del prototipo funcional ya integrado, sin iniciar rediseño: navegación REAL desde teclado, rutas de empresas y POS en escritorio (1440×900) y viewport móvil (390×844), formulario con precio unitario inmutable, recuperación tras F5, ausencia de POST comercial sin confirmación y navegación REAL→DEMO→REAL sin reutilizar una sesión.

**Archivo de prueba:** `plataforma-pyme/frontend/e2e/real/responsive-keyboard.spec.ts`. Commits funcionales `d102b966cca7184f4e7f793a89c74c6a3b5aa758` y `ab23c6c3f4e6b257bb45a316c4eae6a593689a59`.

**Ambiente:** `PYME_DISPOSABLE_QA=1`, FastAPI `127.0.0.1:18001`, PostgreSQL 16 descartable `pyme_t085_ephemeral`, cuentas/empresas/sedes/artículos exclusivos QA. Sin contacto con `TEST Empresa A`. El runner habilita ventas REAL sólo en su instancia aislada; los escenarios T11-D no envían POST de venta.

## Matriz de ejecución

| Caso E2E REAL | Verificación concreta | Resultado |
|---|---|---|
| Escritorio 1440×900 | Tab desde correo a contraseña, Enter para login, foco/Enter sobre botón de empresa y POS, selección de sede, precio unitario precargado deshabilitado, total por 2 servicios, revisión sin POST, F5 y login nuevamente | **PASS** |
| Móvil 390×844 | Mismo recorrido con navegación de teclado, carrito y precio; documento sin desbordamiento horizontal a nivel página en vista POS (scrollWidth ≤ 391 px); F5 sin venta automática | **PASS** |
| Separación REAL→DEMO→REAL | Sesión REAL validada; ingreso mediante enlace DEMO; retorno a URL REAL exige nuevo login; sin POST de ventas, compras ni inventario | **PASS** |
| Regresión existente DEMO | Suite Playwright desktop/mobile independiente del modo REAL | **6 PASS** |

Los tests usan rutas y componentes reales, no sustituyen respuestas de negocio del POS con mocks.

## Evidencia de CI

- **Commit funcional evaluado:** `ab23c6c3f4e6b257bb45a316c4eae6a593689a59`.
- [Full-stack #42992157141](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42992157141): **SUCCESS**, `892 passed` Pytest, `31 passed` Playwright REAL y `6 passed` DEMO. Los 3 escenarios T11-D aprobaron y la aserción adicional de ancho móvil quedó incluida.
- [Frontend #42992157128](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42992157128): **SUCCESS**.
- **Advertencias:** 6 `UnsupportedFieldAttributeWarning` de Pydantic en la ejecución backend. No rompieron el test; el número de warnings es variable entre runs anteriores de concurrencia. Se investigarán y registrarán con evidencia en T11-E.

## Límites explícitos y salida de T11-D

- **No es auditoría WCAG integral** ni garantiza lector de pantalla, contraste, etiquetas o tabulación de todas las pantallas. Sólo certifica las interacciones de teclado y las rutas concretas instrumentadas.
- **No certifica todas las resoluciones móviles**: se verificó un viewport 390×844 y escritorio 1440×900. El control de desbordamiento horizontal aplica al POS en móvil dentro del caso, no a cada tabla o pantalla.
- La suite no hace comparación visual pixel por pixel ni rediseña el estilo de los módulos; ese trabajo estético queda diferido conforme al plan.
- Las pruebas complementan T11-A/B/C y la suite DEMO previamente existente; no justifican afirmar que todas las funcionalidades REAL estén aprobadas en modo móvil.

**Dictamen:** el **bloque funcional T11-D definido por esta matriz está APROBADO** y permite continuar a **T11-E**: hardening de defectos demostrados, advertencias, regresión final y acta de cierre. La aceptación global de T11 continúa pendiente. No fusionar PR #45 ni modificar `main` sin aprobación expresa.
