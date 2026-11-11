# E2-7 · T11-0 — Plan ejecutable de QA integral y hardening

**Fecha:** 11/11/2026. **Rama:** `feature/e2-7-t11-qa-integral-hardening`. **Base inmutable:** `main` tras merge squash del PR #43, `bc91c1ee3fac95753486fbad608ae9b6e9f534e6`.

## 1. Objetivo y criterio de alcance

Consolidar en **una misma ejecución reproducible** los módulos integrados de E2-7 T01–T10, del registro/login y aislamiento por tenant hasta catálogo, compras, recepción, stock, traslado, conteo y POS. La etapa es QA/hardening y documentación de evidencia, **no una fase de nueva funcionalidad comercial ni rediseño visual**.

Fuente del orden: `E2-7_T00_DECISIONES_Y_ORDEN_DE_EJECUCION.md` (T11 = D: QA integral PostgreSQL/Playwright/CI, multiempresa y errores de red); `E2-7_PLAN_RECTOR_INTEGRACION_Y_CIERRE.md` (puerta D); `E2-7_QA_CRITERIOS_ACEPTACION_Y_RIESGOS.md`.

**Prohibiciones:** no probar escrituras contra `TEST Empresa A`, no tocar estado persistente del usuario, no usar identidades/datos DEMO como REALES, no habilitar `VITE_PYME_ENABLE_REAL_SALES` fuera de la instancia descartable CI, no fusionar sin aprobación del responsable. No extender acreditación MP/QR, caja y gastos al modo REAL bajo T11.

## 2. Inventario de las evidencias ya disponibles

- T10-F y PR #43: acta con pruebas de uso no destructivas del usuario, 53 Node tests locales y QA visual con botón bloqueado. GitHub Actions del HEAD documental `2307b1b2` verde: frontend `42982898647`, backend `42982898826` y full-stack `42982898458`.
- T10-E incluye pruebas navegador de venta de servicio, precio/descuento/pagos mixtos, venta física con saldo/ledger, stock insuficiente, pérdida de respuesta 201 tras COMMIT, GET 404 y replay explícito misma clave/cuerpo.
- Los casos anteriores no prueban por sí solos el **recorrido completo entre todos los módulos** en una misma sesión/empresa ni la regresión responsiva de **modo REAL en móvil**. T11 debe aumentar cobertura con el mínimo de fixtures y evitar duplicar tests probados.

## 3. Incrementos T11

| Bloque | Objetivo | Salida y puerta |
|---|---|---|
| **T11-0** | Congelar SHA base, matriz y guardas de entorno | Este plan y PR DRAFT, sin migraciones ni POST local |
| **T11-A** | Inventariar y enlazar pruebas E27-AUTH/TEN/PERM/LOC/CAT/SUP/PUR/REC/INV/SAL/PRES/MODE/RESP a archivos y runs reales | Matriz `CUBIERTO/PARCIAL/FALTANTE/DIFERIDO` con evidencia; no suponer cobertura por nombres |
| **T11-B** | E2E transversal end-to-end en un tenant QA: registro → empresa → sede → catálogo → proveedor → compra → recepción → saldos → POS/venta → comprobante → recarga y ledger | Consistencia total de cantidades/centavos y unicidad idempotente, DB disposable |
| **T11-C** | Seguridad de navegación: empresa A/B, actor distinto, membresía/asignación, logout/F5, 401/403/404/409/422, errores de red y respuestas tardías | No fugas entre tenants, no respuesta de éxito falsa, no POST automático |
| **T11-D** | Matriz de navegador REAL desktop/móvil, teclado y regresión DEMO; accesibilidad y render en fallas | CI aislada y capturas/logs sanitizados, no transformar maquetas en fuente de negocio |
| **T11-E** | Hardening únicamente de defectos demostrados; validación SQL/CI final, QA manual no destructiva, informe de riesgos y cierre | Tres workflows verdes sobre mismo HEAD, aprobación humana explícita antes de merge |

## 4. Invariantes de prueba y riesgos

1. **Un solo tenant REAL** por escenario positivo, con empresa B separada para probar aislamiento; los IDs son UUID válidos generados por la API y los tokens no se loguean.
2. **Alta de compra no aumenta saldo**; recepción idempotente produce entradas exactas, comprueba `quantity_milli` y `version` desde servidor y no crea entradas duplicadas tras replay.
3. **Venta física** descuenta el inventario una vez y registra `VENTA_SALIDA`; servicio no altera stock; pago declarado no acredita dinero.
4. **Traslado** produce dos movimientos de signos opuestos entre sedes; **conteo** usa saldo final y `expected_version` bajo bloqueo; 409 obliga a nueva revisión y no reintenta solo.
5. **Errores HTTP** 401/403/404/409/422 y red incierta: no exponer recursos ajenos, conservar solicitud inmutable, GET de recuperación y consentimiento para cualquier replay.
6. **Paginación de catálogo**: distinguir cargado/parcial/completo; no tratar filtro de páginas cargadas como búsqueda global.
7. **Entorno**: PostgreSQL efímero migrado desde cero, Playwright con guard `PYME_DISPOSABLE_QA=1`, proxy apuntando a servicio efímero controlado, y `VITE_PYME_ENABLE_REAL_SALES` solo en runner. Prohibir uso de DB local del usuario con tests de escritura.
8. **Regresión**: validar modo DEMO por separado (sin datos reales), desktop y móvil; registrar commit exacto, URLs de jobs, número de pruebas y cualquier skip.

## 5. Primer trabajo concreto y verificable

**T11-A**: contrastar la tabla de escenarios `E27-*` de `E2-7_QA_CRITERIOS_ACEPTACION_Y_RIESGOS.md` con tests actuales; entregar matriz trazable de cobertura y lista corta de faltantes de máxima prioridad. Luego implementar primero el flujo **compra → recepción → stock → venta** en una base temporal. No programar componentes nuevos sin que la matriz demuestre la brecha.

**Puerta de salida T11:** flujo transversal comprobado desde navegador a PostgreSQL, seguridad multiempresa y regresión REAL/DEMO y móvil verificadas, CI backend/frontend/full-stack verde en el mismo SHA de PR, riesgos explícitos y aceptación del responsable. **T12** será la etapa de cierre académico (documentos 01–05, UML, README, CHANGELOG, matriz RF/CU y guía reproducible).
