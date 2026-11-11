# E2-7 · T11-E — Auditoría final PRE-MERGE del PR #45

**Fecha del corte:** 11/11/2026. **Rama auditada:** `feature/e2-7-t11-qa-integral-hardening`. **Destino propuesto:** `main`. **PR:** [#45](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/45), abierto y **DRAFT**, sin merge. Este acta se crea *en* la rama auditada: su propio commit y checks deben comprobarse antes de levantar DRAFT.

## 1. Dictamen de auditoría

**DICTAMEN ESTRICTO: NO-GO para merge inmediato bajo la matriz E27 de escenarios E2E obligatorios.**

No hay defectos funcionales bloqueantes reproducidos abiertos entre los **dos** problemas de sedes descubiertos manualmente; ambos fueron corregidos y revalidados. Sin embargo, **no está acreditada la cobertura E2E completa de los 26 escenarios exigidos** por `E2-7_QA_CRITERIOS_ACEPTACION_Y_RIESGOS.md` (detalle en sección 5), y además hay que comprobar las tres CI del **HEAD final**, no solo del commit funcional anterior. El cumplimiento de esas condiciones **o una aceptación expresa, informada y documentada de las excepciones** es necesario para recomendar pasar el PR a READY y fusionarlo. Este diagnóstico **no significa que el software sea inestable**, sino que la evidencia aún no alcanza el criterio estricto definido por el propio proyecto.

**Integrabilidad técnica:** en el corte previo a este acta, `main=bc91c1ee3fac95753486fbad608ae9b6e9f534e6` y el PR estaban `ahead_by=24`, `behind_by=0`, `mergeable=true`, sin reviews ni threads; es decir, **sin conflicto reportado**, pero mergeable no equivale a aprobar calidad, cobertura o autorización humana.

## 2. Fuentes examinadas y metodología

1. Plan rector `docs/E2-7_T11_0_PLAN_QA_INTEGRAL_HARDENING.md` y matriz inicial de 26 escenarios `docs/E2-7_T11_A_MATRIZ_INICIAL_COBERTURA_QA.md`.
2. Criterios oficiales internos `docs/E2-7_QA_CRITERIOS_ACEPTACION_Y_RIESGOS.md`, matriz de escenarios E27-AUTH/TEN/PERM/LOC/CAT/SUP/PUR/REC/INV/SAL/PRES/MODE/RESP.
3. Actas T11-B, T11-C, T11-D y T11-E de sedes; archivos de pruebas REAL `flow-purchase-to-sale.spec.ts`, `security-navigation.spec.ts`, `security-errors.spec.ts`, `responsive-keyboard.spec.ts`, `assigned-location-visibility.spec.ts`, junto a suites preexistentes de inventario, ventas, compras y permisos.
4. Resultados concretos de GitHub Actions de frontend, backend y full-stack; logs Pytest con warnings y aserciones Playwright.
5. **Acta manual T11-D2:** `docs/E2-7_T11_D2_ACTA_PRUEBA_MANUAL_REAL.md`, 39 pasos guiados y retest de correcciones. Las capturas se inspeccionaron en la conversación, pero no están anexadas al repositorio; por ello no se declaran «evidencia gráfica versionada» ni se presupone inspección de todas las peticiones HTTP.
6. Comparación de cambios del PR contra main mediante GitHub, sin modificar el destino.

## 3. Alcance exacto de los cambios del PR

En el corte de 24 commits previos a los pequeños ajustes finales de textos, el diff contenía **17 archivos**, con aproximadamente **1.170 líneas agregadas y 11 eliminadas**; predominaban tests E2E y actas. Código funcional modificado únicamente en la consulta de asignaciones propias (FastAPI/gateway) y filtrado de sedes (POS/transferencias). **El recuento cambia con los commits finales**, por lo que se actualizará antes de aceptación.

- **Backend:** `GET /businesses/{business_id}/locations/my-assignments`; solo consulta IDs activos del actor, dentro del tenant y con sesión válida. Gestión administrativa de asignaciones continúa restringida al titular/administrador.
- **Frontend POS:** trabajador/encargado ven únicamente sedes SELL activas asignadas; roles de administración pueden seleccionar sedes SELL activas; ventas reales locales permanecen bloqueadas por `VITE_PYME_ENABLE_REAL_SALES` ausente.
- **Frontend transferencias:** origen y destino STORE filtrados por asignaciones del actor no administrador; con solo una sede no es posible confirmar traslado. Backend sigue revalidando SELL/STORE y stock.
- **Regresión nueva:** 5 archivos REAL de T11 (flujo comercial, seguridad navegación, errores HTTP, responsive teclado, asignaciones) y actualización de caso existente de permisos.
- **Texto/UI menor:** singular/plural de proveedores y renglones; aviso T10-E vencido en checkout y aviso T10-D vencido en detalle de empresa. Sin rediseño de pantallas.
- No se cambió el modelo SQL, las migraciones Alembic ni se añadió nueva acreditación real de dinero.

## 4. Evidencia automatizada y manual confirmada

**Último commit funcional de permisos con triple CI verde:** `d2cdf4e774990a770909b674520b883e9e8cd31a`.

| Runner | Evidencia | Resultado |
|---|---|---|
| Full-stack real | [#43002093357](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43002093357) | **SUCCESS**, 892 Pytest / 32 Playwright REAL / 6 DEMO |
| Frontend | [#43002093452](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43002093452) | **SUCCESS** |
| Backend | [#43002093351](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43002093351) | **SUCCESS** |
| Commit documental previo a esta auditoría | `dd8f7b990eaf1041bd80dd125e9ebb6baa96dbfa` | **Tres SUCCESS**: [full-stack #43002979107](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43002979107), backend #43002979200, frontend #43002979113. 892/32/6 en full-stack. |
| Manual T11-D2 | Acta de 39 pasos + revalidación con Miguel tras rebuild API | **Dos defectos de sedes cerrados**; consulta stock 7/4/6 sin variación tras cancelar traslado; venta mixta $8.000 − $1.000 = $7.000 y pagos $3.000+$4.000, sin registro comercial |

**Aclaración de integridad de datos:** hubo **una revocación administrativa real** de la asignación Miguel–Sede A TEST 2 realizada por el usuario durante la investigación. No se ejecutó ninguna confirmación manual de venta, compra de prueba, recepción, ajuste o transferencia. El inventario leído siguió en 7/4/6 según capturas; eso no equivale a una auditoría SQL del entorno persistente.

**Pydantic/Pytest:** run #43002979107 registró **4 warnings**, tipo `UnsupportedFieldAttributeWarning`, alias `changes` y `offset`, emitidos durante pruebas de concurrencia. Se observaron números variables en otras corridas, sin tests fallidos. **No se ha identificado con certeza la declaración que origina los warnings**, por lo que no se altera a ciegas Pydantic/FastAPI en una etapa de cierre. Riesgo técnico bajo/no bloqueante, pendiente documentado.

## 5. Matriz final de evidencia de los 26 escenarios obligatorios

Convención: **DIRECTO** = test que verifica el núcleo en navegador/API real; **PARCIAL** = prueba backend + pasos manuales o navegadores que no cubren todo el recorrido literal; **FALTA** = escenario integral no identificado/reproducido en la evidencia revisada. No son una medición estadística universal de cobertura.

| ID | Estado | Evidencia y limitación |
|---|---|---|
| E27-AUTH-01 | PARCIAL | Registro/login por API en fixtures + login/GET perfil visto manualmente; falta aserción E2E dedicada del ciclo registro→login→GET /me en UI |
| E27-AUTH-02 | DIRECTO | `security-navigation.spec.ts`, logout/protección de sesión; cierre manual de Miguel |
| E27-AUTH-03 | DIRECTO | `responsive-keyboard.spec.ts` y tests de recovery con F5/relogin |
| E27-TEN-01 | DIRECTO | `security-navigation.spec.ts` A/B, manual de membresías dueño/trabajador |
| E27-TEN-02 | DIRECTO | `security-navigation.spec.ts` respuesta tardía ignorada/cancelada |
| E27-TEN-03 | DIRECTO | `security-navigation.spec.ts` acceso a empresa ajena |
| E27-PERM-01 | DIRECTO | `assigned-location-visibility.spec.ts` + `security-errors.spec.ts`, 403 API y UI sin sedes no asignadas |
| E27-LOC-01 | PARCIAL | `test_location_api_integration.py` pausar/reactivar y persistencia; no se constató flujo Playwright de pausa/reactivación + F5 |
| E27-CAT-01 | PARCIAL | Backend alta/inactivación + test T11-B bien/servicio; falta E2E de inactivar y refrescar |
| E27-SUP-01 | PARCIAL | Backend CRUD integrado; listado y permisos inspeccionados manualmente, rechazo 409 probado; sin CRUD UI completo constatado |
| E27-PUR-01 | PARCIAL | T11-B compra con bien+servicio sin stock previo; manual concepto libre por separado; no combinación exacta bien+concepto libre en un solo E2E |
| E27-REC-01 | DIRECTO | `flow-purchase-to-sale.spec.ts`: recepción + saldo + movimiento sólo para bien |
| E27-REC-02 | DIRECTO | `flow-purchase-to-sale.spec.ts`: replay misma clave y recibo |
| E27-INV-01 | DIRECTO | `inventory.spec.ts`, T11-B y conciliación manual 7/4/6 |
| E27-INV-02 | PARCIAL | `inventory.spec.ts` y manual: saldos netos +3/−3 y +1/−1; aserción estricta de ambos eventos con neto cero en mismo flujo no verificada en este corte |
| E27-INV-03 | DIRECTO | `inventory.spec.ts` ajuste con versión correcta |
| E27-INV-04 | DIRECTO | `inventory.spec.ts` versión obsoleta y 409 |
| E27-SAL-01 | DIRECTO | `pos-draft.spec.ts`: venta física, descuento saldo y movimiento |
| E27-SAL-02 | DIRECTO | `flow-purchase-to-sale.spec.ts`: física + servicio + dos pagos y comprobante; manual descuento sin confirmación |
| E27-SAL-03 | DIRECTO | `sales-recovery.spec.ts`: POST 201 perdido, GET/replay 200 misma clave sin duplicar |
| E27-SAL-04 | DIRECTO | `pos-draft.spec.ts` stock insuficiente 409/rollback |
| E27-SAL-05 | PARCIAL | Política backend de precios/descuentos, pagos invalidables en frontend y manual de roles; no se verificó aquí el rechazo combinado exacto en browser + POST |
| E27-PRES-01 | DIRECTO | `flow-purchase-to-sale.spec.ts` F5/relogin y consultas, sin auto POST |
| E27-MODE-01 | DIRECTO | `responsive-keyboard.spec.ts` REAL→DEMO→REAL sin reutilizar sesión |
| E27-MODE-02 | FALTA | No se encontró E2E dedicado a operar UI de QR, caja/jornadas y cuentas en DEMO y afirmar ausencia de escritura REAL. Mantener como no demostrado |
| E27-RESP-01 | PARCIAL | `responsive-keyboard.spec.ts` 1440/390 px, teclado, POS sin overflow y DEMO; no auditoría de todos los módulos, lector de pantalla ni WCAG integral |

**Balance de esta matriz:** 16 DIRECTOS, 9 PARCIALES y 1 FALTA, aplicando la convención descrita. Se exige validar cualquier recuento con su tabla y no generalizar a «26 E2E aprobados» solo por tener 32 casos browser.

## 6. Riesgos residuales y tratamiento

| Riesgo | Severidad | Impacto/decisión sugerida |
|---|---|---|
| E27-MODE-02 ausente (DEMO QR/caja/cuentas→REAL sin writes) | **Medio** | Agregar smoke browser de lectura/acciones DEMO + vigilancia de cero POST REAL, o aceptar expresamente la excepción si dichas pantallas siguen excluidas del MVP |
| LOC/CAT/SUP/PUR y SAL05 de navegador parciales | **Medio** | Completar smoke E2E mínimos de mayor impacto antes de READY; backend existente reduce riesgo pero no prueba UX |
| Tres warnings Pydantic de alias distintos (4 ocurrencias) | **Bajo** | Anotar en issues/plan; localizar fuente con traceback si se decide corregir, sin cambios especulativos |
| Accesibilidad/responsive parcial (390 y 1440; teclado limitado) | **Bajo–medio** | QA exploratoria en otros viewport/tamaños y validación de UX diferida a fase visual |
| Datos comerciales guardados temporalmente sin cifrar en IndexedDB en flujos comerciales | **Medio** | Avisos existentes, evitar dispositivos compartidos; no almacenar tokens; no exponer en evidencia |
| API propios permisos / assignment GET sin fixture exhaustiva de roles y suspensiones | **Bajo–medio** | Ya hay un E2E de trabajador con revocación y 403 administrativo; ampliar matrices 401/404/tenant si se exige cobertura de seguridad independiente |
| Plan académico T12 (README/UML/matriz RF/CU/API/UI, documentos 01–05) | **Fuera de T11** | No declarar entrega académica final por aprobar el PR técnico de T11 |

No hay hallazgo de duplicación de venta, corrupción de stock o fuga cross-tenant **demostrado** en la evidencia examinada. Esto no es garantía de ausencia total de defectos.

## 7. Checklist de aceptación PRE-MERGE

- [x] Dos defectos detectados manualmente en SELL/STORE corregidos y retesteados.
- [x] Base `main` sin divergencia al corte comparado; PR mergeable en GitHub.
- [x] CI triple verde en commit funcional `d2cdf4e` y commit documental anterior `dd8f7b9`.
- [x] Acta de los 39 pasos manuales con excepción administrativa de revocación registrada.
- [x] Pago declarado y stock físico no se confunden; confirmación POS local bloqueada.
- [x] Textos simples detectados manualmente corregidos en rama.
- [ ] **Verificar backend/frontend/full-stack en el SHA final después de agregar el presente acta.**
- [ ] Resolver o **aceptar explícitamente** cobertura incompleta de E27-MODE-02 y escenarios parciales.
- [ ] Responsable revisa diff final del PR y emite consentimiento expreso para fusionar.
- [ ] T12 académico se tramita en su propia puerta, si corresponde.

## 8. Orden recomendado para pasar a main

1. Verificar tres workflows en el **HEAD exacto** que se vaya a fusionar, sin tests skipped/críticos.
2. Cerrar E27-MODE-02 con test de no escrituras REAL o registrar su excepción formal; decidir qué escenarios parciales son criterios duros del TP y cuál queda como deuda no bloqueante.
3. Exigir revisión humana del PR y la constancia de aprobación del responsable; solo entonces convertir PR #45 de DRAFT a READY.
4. Fusionar **únicamente con autorización explícita** del usuario y preservando main; no hacer cambios en datos locales por merge.
5. Seguir en T12 con UML/README/documentación académica y decisiones de UX pendientes; no confundir integración técnica con rediseño.

**Dictamen final de este corte: NO-GO estricto por cobertura incompleta y checks pendientes en el HEAD futuro.** Cuando se satisfagan las condiciones y no haya regresión, el estado puede actualizarse a **APTO TÉCNICAMENTE PARA MAIN CON EXCEPCIONES DOCUMENTADAS**, sujeto a aprobación humana.
