# E2-7 · T12-A — Plan de cierre académico y matriz inicial de desfases

**Estado de seguimiento:** T12-A inventario completado; **T12-B conciliación documental terminada** (ver [acta T12-B](E2-7_T12_B_CONCILIACION_RF_CU_API_UI_TEST.md)). **T12-C y T12-D documentados y publicados; T12-E en acta de cierre**. La aprobación de merge, la prueba del motor PlantUML y la comparación completa con TP3 quedan registradas como verificaciones/reservas separadas.  
**Fecha:** 11/11/2026. **Rama exclusiva:** `docs/e2-7-t12-cierre-academico`.  
**Base estable:** `main` `c6a77137cf82dcb9aad225645e84b1265b1da3ec`, merge [PR #45](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/45) E2-7/T11.  
**Alcance permitido:** `plataforma-pyme/`. Sin cambios en datos, migraciones, funcionalidades ni ramas históricas. Se usará un PR documental DRAFT para revisión.

## 1. Qué es T12 exactamente

Según [plan rector E2-7, sección «E2-7 E»](E2-7_PLAN_RECTOR_INTEGRACION_Y_CIERRE.md) y [T00, orden T00–T12](E2-7_T00_DECISIONES_Y_ORDEN_DE_EJECUCION.md), **T12 corresponde al cierre académico**: documentos 01–05, modelos y diagramas PlantUML 03A/03B/03C, ADR, README frontend/backend, CHANGELOG, trazabilidad RF/CU→API→UI→test, guía reproducible y manifiesto SHA/CI. No equivale a reimplementar ni a repetir la integración de T01–T11. Tampoco certifica producción bancaria ni sustituye el futuro rediseño visual.

### Línea base de evidencia funcional

- Merge técnico T11: **PR #45**, commit `c6a7713`; código T11 `fedd1ee`.
- Full-stack del HEAD de T11: [run #43015544889](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544889), **892 Pytest, 38 Playwright REAL, 6 DEMO** exitosos; CI [backend #43015544819](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544819) y [frontend #43015544947](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544947) exitosas.
- Matriz QA E27: **26/26 escenarios cubiertos en alcance funcional/smoke**, no auditoría WCAG universal.
- [Acta de 39 pasos manuales](E2-7_T11_D2_ACTA_PRUEBA_MANUAL_REAL.md) con dueño/trabajador y retests de los dos defectos de sedes. Las capturas estaban en conversación, **no** anexadas a GitHub; una revocación de asignación de prueba fue una escritura administrativa real.
- **RIESGOS/ACLARACIONES:** 4 warnings no bloqueantes Pydantic en última CI; intenciones IndexedDB de recuperación no cifradas; pagos REAL declarados, no acreditados; gastos/caja/cuentas/QR siguen DEMO; POS REAL de la base local deshabilitado por defecto.

## 2. Inventario físico encontrado en main

| Elemento | Ruta |
|---|---|
| Requerimientos 01 | `entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md` |
| Casos de uso 02 | `entrega-programacion-2/02_CASOS_DE_USO.md` |
| Dominio y UML 03 | `entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md` |
| Arquitectura 04 | `entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md` |
| Trazabilidad 05 | `entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md` |
| Clases identidad/catálogo | `entrega-programacion-2/diagramas/03A_CLASES_IDENTIDAD_Y_CATALOGO.puml` + SVG y explicación |
| Clases comercio/inventario | `entrega-programacion-2/diagramas/03B_CLASES_COMERCIO_E_INVENTARIO.puml` + SVG y explicación |
| Casos de uso | `entrega-programacion-2/diagramas/03C_CASOS_DE_USO.puml` + SVG y explicación |
| Guía de entrega | `entrega-programacion-2/README.md` + `diagramas/README.md` |
| Ejecución y cambios | `frontend/README.md`, `backend/README.md`, `CHANGELOG.md` |
| Fuente de pruebas y limitaciones | `docs/E2-7_T11_E_AUDITORIA_FINAL_PREMERGE.md` y actas T01–T11 |

**Nota sobre rutas:** todas las rutas de esta tabla son relativas a `plataforma-pyme/`. Las fuentes `.puml` son editables y los SVG representan composiciones editoriales: **no suponer** equivalencia visual automática entre PlantUML y SVG. Reconciliar contenido antes de regenerar o sustituir SVG.

## 3. Matriz inicial de desactualización documental

Hallazgos corroborados por el texto **actual** de `main` y por la evidencia T11, no por conjeturas sobre código nuevo.

| Documento | Desfase detectado | Riesgo para la entrega | Tratamiento T12 |
|---|---|---|---|
| **01** | Presentación/tabla histórica afirma que React no tiene integración API y RF-03–RF-07 están pendientes; anexo concluye aproximadamente en E2-3 | Presentar como propuesto algo ya implementado | Incorporar sección de **estado vigente post-T11**; preservar cortes históricos explícitamente etiquetados |
| **02** | Cabecera «TO-BE / operaciones previstas NO implican endpoints implementados», versión E2-3 E, escenarios de compra/venta con «Pendiente E2» | CU evaluados como futuros aun siendo recorridos REAL | Actualizar estados de CU-01..CU-12 con referencia exacta a API, UI y pruebas; no alterar flujo histórico sin señalizar |
| **03** | Diagrama conceptual «no es todavía esquema SQL» y fuentes 03A v0.7, 03B/03C de corte conceptual anterior | UML difiere de clases, relaciones, snapshots, operaciones y autorizaciones | Comparar clase por clase con SQLAlchemy/Alembic y contratos; corregir fuentes `.puml` **solo cuando se valide**; comprobar SVG/editorial |
| **04** | Arquitectura se declara AS-IS React DEMO / TO-BE backend, muestra pseudocódigo y Docker conceptual «todavía no existe» | Confundir arquitectura actual con ejemplos didácticos | Introducir arquitectura **AS-IMPLEMENTED** de FastAPI, Postgres, Alembic, Vite y estado por tenant; conservar ejemplos TO-BE como históricos |
| **05** | Encabezado E2-5 dice que RF-07 y frontend REST están diferidos; tablas históricas por RF no reflejan T10/T11 | Matriz académica de RF/CU/API/UI/test errónea | Recomponer matriz vigente y mapa de endpoints a partir de routers, DTO, frontend y tests reales |
| **README frontend** | Titulado «Frontend (DEMO)», frase «No hay autenticación, autorización real, backend» | Instrucciones inducen a lanzar solo DEMO y ocultar capacidad REAL | Separar rutas/instrucciones DEMO y REAL, proxy a API, login y entorno local |
| **README backend** | Cabecera de estado E2-5 C; bloques anteriores mantienen modo API sin frontend | No identifica baseline T11 ni endpoints comerciales posteriores | Añadir guía vigente arriba y conservar historia como anexos por versión |
| **README entrega** | Cabecera E2-5 y anotación «React sigue DEMO / ventas backend pendiente» | Cierre académico contradictorio | Portada y manifest SHA/CI con alcance vigente |
| **CHANGELOG** | Termina en E1-D2 | No registra E2-1..E2-7 ni QA integradas | Añadir entradas E2 por hechos verificables, no cronología inventada |
| **backend/app/main.py** | Docstring «El frontend continúa independiente» pese a la UI REST | Metadatos de aplicación desactualizados | **Observación de código:** corregir solo si hay autorización explícita para cambio no documental; no modificar código productivo en T12-A |

**Prioridad:** corregir los rótulos principales de 01–05 y README que describen el estado actual, sin borrar evidencia incremental; no reescribir una regla académica sin contrastarla con los routers/modelos.

## 4. Estado funcional de referencia para conciliación

Esta tabla es una **hipótesis de trabajo respaldada por T11**, todavía pendiente de verificación por **contrato y archivo exacto** en los pasos T12-B/C.

| RF | Qué documentar como núcleo | Estado de producto que debe quedar explícito |
|---|---|---|
| RF-01 | Registro, login, GET /me, logout; Bearer en memoria | REAL validado; F5 requiere reautenticación |
| RF-02 | Empresas, membresías, roles/invitaciones; alcance por actor | REAL con límites de UI a auditar; no confundir con invitaciones DEMO |
| RF-03 | Ubicaciones activas/pausadas, SELL/STORE y asignaciones | REAL + restricción efectiva por sede |
| RF-04 | Catálogo físico y servicios, costos/precios, activo/inactivo | REAL, stock solo de bienes |
| RF-05 | Proveedores, compras con conceptos libres, única recepción | REAL, compra sola no mueve stock |
| RF-06 | Balances, movimientos, traslado doble, ajustes/versiones | REAL; stock atómico y trazabilidad |
| RF-07 | POS, descuentos/precios por rol, pagos declarados y recuperación | REAL condicionado a entorno; **sin acreditación de bancos** |
| RF-08–10 | Gastos/jornadas, cuentas financieras y QR ilustrativo | DEMO/diferido; **no** servicios de pagos productivos |

No declarar REAL una funcionalidad solo porque exista una pantalla DEMO. Separar **endpoint implementado, pantalla disponible, operación permitida y escenario probado**.

## 5. Trabajo propuesto en incrementos auditables

| Incremento | Objetivo | Puerta concreta |
|---|---|---|
| **T12-A — Base (completada)** | Inventario, baseline SHA, matriz de desfases, orden y decisiones; **este documento** | Inventario y riesgos fechados, sin tocar fuentes antiguas |
| **T12-B — RF/CU/trazabilidad (completada)** | Actualizados **01, 02, 05**; 46 rutas reales verificadas contra 13 routers, CU-01..12 trazados | [Acta de cierre T12-B](E2-7_T12_B_CONCILIACION_RF_CU_API_UI_TEST.md) y archivo por RF/CU/API/UI/test |
| **T12-C — Dominio/UML** | Revisar **03 + 03A/03B/03C**, relaciones e invariantes según modelos/Alembic; comprobar SVG antes de publicar | Diagrama fuente coherente con SQL + limitaciones señalizadas |
| **T12-D — Arquitectura y reproducibilidad** | Revisar **04**, README frontend/backend/entrega, CHANGELOG, ADRs y guía PowerShell/Docker segura | Ejecución documentada y reproducible sin tocar DB persistente ni secretos |
| **T12-E — Control y entrega** | Validar links, etiquetas REAL/DEMO, matriz de inconsistencias resueltas, QA CI y manifiesto de entrega | Diff documental revisado, CI del HEAD, dictamen de cierre/pendientes, aprobación humana y merge |

**Método:** trabajar desde rama `docs/e2-7-t12-cierre-academico`, PR DRAFT, cambios incrementales y GitHub Actions por commit. Mantener `main` intacta hasta aprobación. Evitar editar lógica/migraciones salvo fallo demostrado y decisión independiente del responsable.

## 6. Decisiones y exclusiones de cierre

1. **Preservar el historial** E2-1..E2-6; un encabezado «estado vigente» reemplaza la lectura operativa de textos TO-BE, no elimina el contexto de avances parciales.
2. UML editable es la autoridad sobre **contenido técnico** tras conciliación con código; los SVG requieren validación visual independiente.
3. **No** prometer cuentas financieras REAL, caja REAL, QR MP real/OAuth/webhooks, reservas, lotes, producción por receta ni conciliación bancaria; registrarlos como diferidos.
4. El prototipo es **académico** y las suites pasan en entorno efímero. No tratarlo como software auditado para producción comercial.
5. No ejecutar comandos destructivos sobre PostgreSQL del usuario: nunca `docker compose down -v`, `dropdb`, recreación de tablas ni venta real de prueba en `TEST Empresa A`.
6. Advertencias Pydantic en CI y almacenamiento de intenciones IndexedDB sin cifrado: riesgo residual documentado, no corregir a ciegas dentro de un PR de documentación.

## 7. Próxima acción

**Cierre del plan:** T12-C1..C4 y T12-D1/D2 se publicaron sobre la rama documental. Consultar el [acta de auditoría T12-E](E2-7_T12_E_ACTA_CIERRE_Y_BACKLOG_ETAPA_2.md) para el dictamen, manifiesto de fuentes, comprobación de enlaces, límites de QA y backlog postacadémico. Ninguna instrucción de este plan constituye permiso de merge a `main`.
