# E2-5 — Matriz de trazabilidad RF/CU → código → pruebas → evidencia

**Clasificación:** `AS-IMPLEMENTED` (existe en `main`), `CI-VERIFICADO` (GitHub Actions), `SWAGGER-REPORTADO` (desarrollador), `LOCAL-REPORTADO` (PowerShell), `DIFERIDO` (no implementado). No confundir una maqueta visual con backend real.

| RF/CU | Regla / capacidad | Fuente efectiva | Evidencia específica | Estado al SHA de cierre |
|---|---|---|---|---|
| **RF-06 / CU-08** | Consultar saldo por empresa, ubicación, artículo | `purchases/inventory_router.py`, `receipt_service.py`, `stock_balance.py` | B-09/B-12, C-10 (`200`); tests de saldo | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-08** | Consultar ledger con entradas y salidas firmadas | `inventory_router.py`, `receipt_schemas.py`, `stock_movement.py` | B-13 y C-11 (`200`, tres movimientos por artículo) | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-09** | Traslado entre dos ubicaciones propias y aptas | `transfer_router.py`, `transfer_service.py`, `transfer_schemas.py` | B-08 (`201`), B-09 (`200`), `test_transfer_api_integration.py` | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-09** | Doble movimiento atómico, saldo total constante | `transfer_service.py`, `inventory_operation.py`, `stock_movement.py` | `-4000/+4000=0`, 6+4=10; tests B de transacciones | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-09** | Replay no duplica stock | `transfer_service.py`, UNIQUE por empresa/solicitud | B-10 (`200`), historial B-13; tests de carreras y colisión | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-09** | Saldo insuficiente no permite negativos | `transfer_service.py`, `stock_balance.py` | B-11 (`409`), B-12/B-13 sin cambios; test de dos salidas rivales | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-11** | Inicializar un saldo una sola vez por artículo/ubicación | `adjustment_router.py`, `adjustment_service.py`, modelo A | C-03 (`201`), C-04 (`200`), C-05 (`409`) | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-11** | Ajustes de entrada/salida justificados | `adjustment_schemas.py`, `adjustment_service.py` | C-06/C-07 (`201`), C-11 (ledger) | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-11** | Versión observada y rechazo por carrera/obsolescencia | `adjustment_service.py`, `stock_balance.py` | C-09 (`409`), C-10 versión 3, `test_adjustment_concurrency_integration.py` | AS-IMPLEMENTED + CI + Swagger |
| **RF-06 / CU-11** | No salida por encima de disponibilidad | `adjustment_service.py` | C-08 (`409`), C-10/C-11 intactos; tests de salida | AS-IMPLEMENTED + CI + Swagger |
| **RF-03 / CU-04** (dependencia) | Ubicación y permisos STORE para inventario | `locations/permissions.py`, `LocationAssignment` | Dos ubicaciones QA; tests de RBAC/tenant en B/C | AS-IMPLEMENTED + CI |
| **RF-04 / CU-05** (dependencia) | Bien físico, SKU por empresa, unidad | `catalog/`, `CatalogItem` | B-04 y C-01 (`201`); B-05 (`422`) | AS-IMPLEMENTED + CI + Swagger |
| **RF-05 / CU-06–07** (dependencia) | Compra separada de recepción física | `purchases/{router,receipt_router,receipt_service}.py` | B-06 `REGISTRADA`, B-07 `RECIBIDA` + movimiento | AS-IMPLEMENTED (E2-4) + CI + Swagger |
| **RF-07 / CU-10** | Descuento transaccional por venta backend | No pertenece a E2-5 A–C | No existe prueba E2-5 de venta real conectada | **DIFERIDO**, no computar como implementado |
| **RF-06 avanzado** | Conteo físico absoluto, múltiple, reconciliación continua | Solo propuestas y ADR | No existe endpoint/ensayo cerrado de ese alcance | **DIFERIDO** |

## Fuentes académicas que deben cotejarse durante la revisión

- `plataforma-pyme/entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md`: RF-06, RN de stock no negativo, separación compra/recepción, alcance MVP.
- `plataforma-pyme/entrega-programacion-2/02_CASOS_DE_USO.md`: CU-07, CU-08, CU-09, CU-11 y las reglas de concurrencia, tenant y reintentos.
- `plataforma-pyme/entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md`, diagrama `03B_CLASES_COMERCIO_E_INVENTARIO.puml`: diseño conceptual general, **no** copiar automáticamente entidades TO-BE a código.
- `plataforma-pyme/entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md`: separación HTTP/servicio/sesión/SQL, con secciones heredadas que todavía hablan en futuro.
- `plataforma-pyme/entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md`: matriz acumulativa e histórica; revisar estado actual sin confundir encabezados anteriores con lo efectivamente integrado.
- `plataforma-pyme/docs/ADR/ADR-004-stock-unidades-sku.md`: unidades, historial de movimientos y versión en conteo.
- `plataforma-pyme/docs/E2-5_{A,B,C}_*.md`: contratos de desarrollo incremental, varios encabezados redactados **antes del merge**.

## Regla de lectura documental

La evidencia es **posterior** al estado que muestran algunos encabezados de documentos técnicos. Por ejemplo, frases «pendiente de merge» en documentos A/B/C describen su contexto histórico; este cierre toma como referencia el SHA `748e693...` y los tres PR **efectivamente fusionados**. Se propone una adenda de estado o índice, **no editar retrospectivamente afirmaciones históricas sin marcar versiones**.

## Aspectos aún sin certificación independiente

Permisos/tenants en condiciones de carrera complejas, inmutabilidad ante SQL directo, tolerancia a deadlocks no contemplados, regresión del frontend, equivalencia exhaustiva con todos los atributos UML y cobertura contra la consigna académica original requieren una **auditoría separada**, para la que se preparó [un encargo formal](../E2-5_ENTREGA_PARA_REVISION.md) **después de la revisión documental**, sin ejecución todavía.

## Anexo v1.1 — Verificación de observaciones externas

La evaluación de diseño posterior al QA **no cambia** el estado AS-IMPLEMENTED de E2-5 A–C ni certifica requisitos futuros. Los casos RF-06/CU-09 y CU-11 mantienen sus pruebas existentes; faltan ensayos específicos de intercalación de traslado entrante vs. ajuste sobre el mismo destino y pruebas con rol SQL de runtime restringido. Los casos RF-05 (recepción parcial, múltiple destino y documento monetario) y RF-07 (venta/stock reservado) siguen pendientes de decisiones y desarrollo propios. [Dictamen 13](13_EVALUACION_OBSERVACIONES_IA.md) y [riesgos 09](09_RIESGOS_DEUDAS_Y_DECISIONES.md).
