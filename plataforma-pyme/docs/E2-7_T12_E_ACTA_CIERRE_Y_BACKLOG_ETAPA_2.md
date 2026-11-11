# E2-7 · T12-E — Acta de cierre documental, auditoría final y Etapa 2

**Fecha:** 11 de noviembre de 2026.  
**Proyecto:** Asistente PyME — plataforma de gestión generalista multiempresa/multirrubro (UNSAM, Programación 2, segundo cuatrimestre 2026). WALOS es únicamente una empresa de ejemplo.  
**Base funcional fija:** `main` `c6a77137cf82dcb9aad225645e84b1265b1da3ec` (PR #45, T11).  
**Rama y PR de documentación:** `docs/e2-7-t12-cierre-academico`, [PR #46](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/46), DRAFT hasta autorización expresa del merge.  
**Naturaleza del cierre:** auditoría **estática y documental**, contrastada con los archivos del repositorio y antecedentes T11. No constituye auditoría de penetración, evaluación WCAG, certificación de producción ni cotejo exhaustivo de la consigna TP3. Se consultó el estado de GitHub Actions por SHA; las ejecuciones CI se informan por separado y no se atribuyen al proceso de redacción.

## 1. Dictamen

**T12 DOCUMENTAL COMPLETADO CON RESERVAS DECLARADAS. APTO PARA REVISIÓN HUMANA FINAL DE PR #46; MERGE A `main` NO AUTORIZADO POR ESTA ACTA.**

Se resolvieron los principales desfases que causaban un **NO-GO documental**: Documento 04 obsoleto; portadas de entrega/frontend/backend; índice UML 03A/03B/03C; segundo SVG 03B; CHANGELOG; encabezados de Documento 03 y 05. Se preservó el historial y se respetó `plataforma-pyme/`.

**Reservas que no se ocultan:**
1. **CI del cierre en evolución:** al iniciar T12 no había ejecuciones registradas para la rama documental, pero luego de publicar el acta GitHub inició **tres workflows** (​Frontend, Backend e Inventario REAL full-stack) sobre el commit `a71c946c4070602e91e1439b206ac4e1dcd1f953`, evento `pull_request`; al último control los tres estaban **IN_PROGRESS, sin conclusión**, no PASS. Los filtros por ruta de los YAML no autorizan suponer que no correrán. Un nuevo commit del acta cambia el SHA de HEAD y requiere verificar sus checks de nuevo; el antecedente T11 no equivale a CI de T12.
2. Fuentes `03A/03B/03C.puml`: se verificó su existencia y estructura textual, **pero la compilación con el ejecutable oficial PlantUML sigue sin ejecutarse** en este entorno por falta del JAR/binario. No declarar `PASS`.
3. La **consigna original TP3** no fue contrastada íntegramente contra cada RF/CU; no afirmar que todos los requisitos heredados están absorbidos. El [ADR-008 histórico](ADR/ADR-008-integracion-con-tp.md) menciona **≥10 tests unitarios ejecutados**: el total de 892 Pytest incluye pruebas de integración y **no basta por sí solo** para certificar ese requisito sin clasificar los casos. El alcance académico implementado conocido es RF-01 a RF-07.
4. El desarrollo académico no equivale a un despliegue bancario/comercial de producción: no realizar ventas ni pagos reales de prueba sobre empresas o credenciales personales.

Estas reservas se diferencian de bugs demostrados: **no se detectó un nuevo bug funcional** porque el control T12 es documental y no ejecutó pruebas sobre una base de datos.

## 2. Inventario de entregables al cierre

| Entrega | Archivo principal | Resultado |
|---|---|---|
| T12-A | [Plan y matriz inicial](E2-7_T12_A_PLAN_Y_MATRIZ_DESFASES.md) | Base de discrepancias y alcance, estado actualizado |
| T12-B | [Acta RF/CU/API/UI/test](E2-7_T12_B_CONCILIACION_RF_CU_API_UI_TEST.md) | RF-01..07 REAL, RF-08..10 DEMO/diferido, rutas y evidencias |
| T12-C1 | [Documento 03 v2.1](../entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md) | 19 modelos ORM, reglas y relaciones |
| T12-C2 | [03A](../entrega-programacion-2/diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md) | PlantUML + SVG + guía |
| T12-C3 | [03B](../entrega-programacion-2/diagramas/03B_EXPLICACION_COMPRAS_INVENTARIO_VENTAS.md) | PlantUML + SVG + guía; [segundo flujo explicativo](../entrega-programacion-2/diagramas/03B_FLUJO_COMERCIAL_EXPLICATIVO.svg) conservado |
| T12-C4 | [03C](../entrega-programacion-2/diagramas/03C_EXPLICACION_CASOS_DE_USO.md) | PlantUML + SVG + guía; 12 CU, 13 óvalos (CU-12a/b) |
| T12-D1 | [Documento 04 AS-IMPLEMENTED](../entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md) | Arquitectura REAL al principio, archivo E2-3 histórico preservado, patrones con evidencia |
| T12-D2 | [Portada de entrega](../entrega-programacion-2/README.md), [índice UML](../entrega-programacion-2/diagramas/README.md), [Frontend](../frontend/README.md), [Backend](../backend/README.md), [CHANGELOG](../CHANGELOG.md) | Encabezados y navegación actualizados, histórico preservado |
| T12-E | **Este documento** | Conciliación final, reservas, procedimiento de verificación y backlog; [índice de ADR-001..008](ADR/README.md) reconciliado con estado vigente |

Documentos académicos completos: [01](../entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md), [02](../entrega-programacion-2/02_CASOS_DE_USO.md), [03](../entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md), [04](../entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md), [05](../entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md).

## 3. Conciliación funcional y técnica

| RF / casos de uso | Estado AS-IMPLEMENTED al corte T11 | Límite importante |
|---|---|---|
| RF-01 / CU-01 y CU-02 | Registro, login, me, logout; token Bearer opaco | Token REAL en memoria; F5 exige reautenticarse |
| RF-02 / CU-03 y CU-12 | Empresas, titularidad protegida, membresías, invitaciones y equipo | Invitación sola no concede permisos; sin correo automático/transferencia titular |
| RF-03 / CU-04 | Ubicaciones y asignaciones por empresa; SELL/STORE | Trabajador/encargado necesita autorización y asignación efectiva de sede |
| RF-04 / CU-05 | Catálogo de bienes y servicios persistido por tenant | Crear ficha no crea stock |
| RF-05 / CU-06 y CU-07 | Proveedores, compras, snapshots y recepción única completa | Registrar compra sin recepción no modifica inventario |
| RF-06 / CU-08, CU-09 y CU-11 | StockBalance, ledger firmado, traslados, ajustes y stock inicial | No saldos negativos; controlar concurrencia y versiones |
| RF-07 / CU-10 | POS real con precios/descuentos por rol y pagos declarados | Ninguna integración de acreditación bancaria automática |
| RF-08 / caja y gastos | **DEMO / DIFERIDO** | Sin router/circuito real equivalente |
| RF-09 / cuentas financieras | **DEMO / DIFERIDO** | Sin integración bancaria REAL |
| RF-10 / QR Mercado Pago | **DEMO / DIFERIDO** | No OAuth de comercio, webhooks ni cobro acreditado |

**Modelo:** 19 clases ORM persistentes cubren usuario/sesión, empresa, miembros/invitaciones, sedes/asignaciones, catálogo/proveedores y entidades comerciales. El diagrama 03B no muestra una tabla genérica inexistente `SolicitudIdempotente`; el modelo real conserva claves y huellas por operación. Separar modo de pago declarado de confirmación externa.

**Patrones para defensa:** Repository y Service Layer implementados; sesión/commit SQLAlchemy con práctica transaccional; Observer observable en DEMO. No declarar formalmente implementados Factory, Decorator, State, Command o Memento sin prueba de clases/contratos concretos.

## 4. Evidencias técnicas y alcance del control

- **T11 — antecedente de calidad, NO ejecutado en T12:** [auditoría técnica](E2-7_T11_E_AUDITORIA_FINAL_PREMERGE.md) registra **892 Pytest + 38 Playwright REAL + 6 DEMO** en el commit funcional específico `6aecd80e52a0712f7d1088dde8347de7f7a7c186`. La aprobación de PR #45 llevó esas funcionalidades a `main`.
- **T12-B:** el [Documento 05](../entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md) documenta **46 rutas/métodos** en **13 routers** y la correspondencia con pantallas/test. Se contrastaron decoradores de los 13 routers del código y coincidió ese total.
- **T12-E:** se comprobó la configuración de `.github/workflows/plataforma-pyme-frontend.yml`, `plataforma-pyme-backend.yml` e `inventory-real.yml`: no son validadores específicos de Markdown o PlantUML; se conservan sin cambios. **GitHub Actions sí inició tres ejecuciones automáticas** contra el SHA de evidencia `a71c946c` (IDs 43049799155, 43049799104 y 43049799167; estado observado: `in_progress`). Este dato prevalece sobre la ausencia de runs durante la auditoría inicial.
- **Enlaces Markdown:** se cotejaron **215 enlaces relativos en 17 Markdown** de la entrega y documentos T12 contra el árbol del HEAD `a71c946c` de GitHub (**562 entradas**); **215/215 destinos existentes, 0 rotos**. La comprobación no abarca anclajes `#fragment`, enlaces externos ni URLs generadas en tiempo de ejecución.
- **SVG:** los cuatro gráficos presentan `viewBox` y texto con atributo de color `fill`; siguen siendo diagramas editoriales y no exportaciones literales de PlantUML.
- **PlantUML:** `@startuml` y `@enduml` presentes; compilación semántica/renderización pendientes de un ambiente con PlantUML. Se preserva la advertencia, no se simula validación.

### Verificación manual y reproducible pendiente

Desde una copia descartable del repositorio, sin tocar la base de datos de trabajo:
```powershell
# En la carpeta plataforma-pyme/entrega-programacion-2/diagramas
java -jar .\plantuml.jar -checkonly .\03A_CLASES_IDENTIDAD_Y_CATALOGO.puml
java -jar .\plantuml.jar -checkonly .\03B_CLASES_COMERCIO_E_INVENTARIO.puml
java -jar .\plantuml.jar -checkonly .\03C_CASOS_DE_USO.puml
```
Validar visualmente el SVG generado por el motor en cada caso, pero **no sustituir** el SVG editorial aprobado automáticamente: las composiciones tienen propósito distinto.

**CI documental sin workflow nuevo:** se recomienda un script de validación de enlaces / XML / PUML ejecutado en copia de QA o un control manual firmado; añadir `.github/workflows/*.yml` requeriría otro alcance y un PR específico. **No** se cambió infraestructura de CI aquí.

## 5. Observaciones residuales priorizadas

| ID | Prioridad | Observación final | Acción futura |
|---|---|---|---|
| R-01 | P1 para cierre técnico ampliado | No hay compilación PlantUML acreditada | Ejecutar `-checkonly` y archivar salida; no falsear PASS |
| R-02 | P1 si la rúbrica lo exige | Consigna TP3 no cotejada exhaustivamente | Comparar requisito heredado → RF/CU → archivo/test; no declarar absorción automática |
| R-03 | P2 | Tres workflows de CI iniciados sobre `a71c946c`, pendientes de conclusión al auditar; la documentación no tiene validador dedicado | Verificar resultado de los 3 runs del último HEAD antes de merge; validador Markdown/PUML en PR posterior, sin añadir YAML aquí |
| R-04 | P2 | README históricos extensos: secciones antiguas aún contienen palabras «pendiente» | Respetar encabezados vigentes y delimitador de archivo histórico |
| R-05 | P2 | Warns Pydantic `Field(alias=...)` reportados en QA histórico | Evaluar con pruebas antes de cambiar el contrato |
| R-06 | P2 | Intentos pendientes en IndexedDB sin cifrado; riesgo en equipos compartidos | Evaluar ciclo de vida, expiración, minimización y cifrado |
| R-07 | P2 | Sesión Bearer en memoria y reingreso F5; UX imperfecta | Evaluar renovación segura, cookies HttpOnly/CSRF y controles |
| R-08 | P2 | Falta evaluación completa de accesibilidad, móvil físico, rendimiento y seguridad producción | Plan de QA de producto separado, sin usar datos reales |
| R-09 | P3 | Comentarios/docstrings de código pre-T11 aún pueden estar viejos | PR de limpieza independiente; no contaminar el cierre documental |
| R-10 | P3 | Comprobaciones de anchors externos no realizadas | Añadir link checker cuando exista pipeline documental |

**No quedan defectos demostrados en modelos nuevos por esta auditoría estática.** Eso **no prueba** ausencia de fallos: no se hicieron pruebas funcionales nuevas.

## 6. Matriz de puertas de cierre y decisión

| Puerta | Evaluación |
|---|---|
| 01..05 con encabezado vigente y límites REAL/DEMO | **Cumplido documentalmente**, con registro histórico preservado |
| 03A/03B/03C y segundo flujo 03B incluidos | **Cumplido documentalmente** |
| Relación RF/CU→API→UI/test en 05 | **Cumplido con base T11, no retesteado** |
| README de entrega/frontend/backend, índice UML y changelog actualizados | **Cumplido** |
| Ámbito único `plataforma-pyme/`, sin archivos de app/DB/infra | **Verificado:** 23 archivos documentales, 14 commits sobre `main` al SHA `a71c946c`, ningún cambio de código/DB/infraestructura |
| Enlaces internos existentes | **215/215 destinos existentes en el árbol GitHub**, 0 rotos; no valida anclajes ni enlaces externos |
| Build/tests/CI ejecutados para HEAD T12 | **3 workflows lanzados para `a71c946c`, en ejecución al último control**. Sin conclusión: NO declarar PASS; el commit de actualización del acta requiere consultar su propio SHA |
| PlantUML oficial | **Pendiente** |
| Consigna original TP3 | **Pendiente de cotejo completo** |
| Aprobación humana explícita para pasar PR READY y hacer merge | **NO otorgada por esta acta** |

**Dictamen operativo:** cierre T12 documental **CON RESERVAS**, apto para que el responsable revise la rama y decida posteriormente el merge. No cambiar `main`, no ejecutar acciones sobre PostgreSQL ni tocar funcionalidad en este cierre.

---

## 7. BACKLOG POSTACADÉMICO — ETAPA 2 (FUERA DEL ALCANCE EVALUABLE ACTUAL)

> **NOTA DE ALCANCE / FIREWALL:** Las funcionalidades de esta sección son **ideas y objetivos de producto posteriores al cierre académico T12**. **NO forman parte de los compromisos RF-01 a RF-07 evaluados en este recorte**, no deben presentarse como implementadas ni convertirse en defectos de entrega por figurar aquí. Si una consigna oficial exigiera alguna, esa obligación deberá analizarse expresamente por separado.

| Orden sugerido | Línea de trabajo | Reglas que se deben conservar |
|---|---|---|
| **2A** | Convergencia visual y de navegación REAL / DEMO | Reutilizar estética, flujos y accesibilidad DEMO sobre datos REAL, sin unir `demoStore` con la API ni debilitar permisos |
| **2B** | Diagrama ERD real de PostgreSQL | Generar vista de FK, tablas y restricciones desde un entorno de prueba mediante DBeaver o similar. **No requiere migrar a Supabase** |
| **2C** | Demostración web/móvil | Deploy de QA, HTTPS, variables seguras, datos ficticios, responsive y test táctil/teclado; no publicar BD privada |
| **2D** | Mercado Pago QR real **por empresa** | OAuth/credenciales tenant-scoped, QR de artículo vs QR de cobro, intención/expiración, webhooks con firma verificada y conciliación; impedir ventas dobles |
| **2E** | Gastos, caja y jornadas (RF-08) | Modelo contable, aperturas/cierres con snapshots, permisos y conciliación de efectivo distinta de pago declarado |
| **2F** | Cuentas financieras (RF-09), reservas, producción/recetas, proveedores extendidos | Priorizar contratos por riesgo y valor; no mezclar inventario técnico ni fondos por empresa |

**Dependencias mínimas:** congelar primero rutas API y políticas de permisos; maquetar REAL con los flujos DEMO; mantener CI/regresiones de transacciones e idempotencia; no integrar QR productivo sin seguridad, reversas y auditoría. El calendario y presupuesto de Etapa 2 requieren decisión posterior, no nacen de este cierre.

## 8. Manifiesto de fuentes y estado de publicación

| Referencia | Valor/verificación |
|---|---|
| Repositorio | `Jorge10192/TP-Programacion2-UNSAM-2C2026` |
| Base funcional | `main` `c6a77137cf82dcb9aad225645e84b1265b1da3ec` |
| PR documental | [#46](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/46), rama `docs/e2-7-t12-cierre-academico` |
| Integración final | El último SHA de evidencia antes de la aclaración de CI era `a71c946c4070602e91e1439b206ac4e1dcd1f953`; **verificar el HEAD vigente y sus checks directamente en PR #46** después de esta nota. El acta no puede autorreferenciar su propio commit de forma estable |
| Inventario técnico | `backend/app/api/v1/router.py` y 13 routers; `backend/app/infrastructure/models/` y Alembic; `frontend/src/App.tsx` y `src/api/httpClient.ts` |
| Evidencia T11 | `docs/E2-7_T11_E_AUDITORIA_FINAL_PREMERGE.md` |
| Manifiesto de cambios y comprobación final | `git diff --name-only origin/main...HEAD`, `git log -1 --oneline`, estado de PR y controles de enlaces/PUML |

**Control de privacidad e integridad:** esta auditoría no ejecutó personalmente comandos de migración, tests ni ventas contra bases de datos. Los workflows de CI de GitHub operan en su infraestructura de pruebas según sus YAML y no deben confundirse con operaciones sobre la base local del usuario. No se incorporan secretos, tokens de usuario ni direcciones reales.

**Aprobación requerida:** el usuario aprobó la ejecución y el cierre documental de T12, **no expresó en este mensaje autorización separada para fusionar el PR #46 a `main`**. Solicitarla antes de cualquier merge; mantener DRAFT hasta entonces.
