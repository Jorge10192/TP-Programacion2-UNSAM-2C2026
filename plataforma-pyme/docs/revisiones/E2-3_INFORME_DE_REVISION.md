---
tipo_documento: "INFORME_DE_REVISION"
bloque: "E2-3"
rama: "review/e2-3-catalogo"
sha_base_recibido: "e4ddd394dac9af2875a88dd77b66362b559d6cf6"
sha_final_rama: "dce66bd8aba1ed16b0660a37e029efadab5cb6cf"
sha_main_al_abrir_pr: null
sha_main_comparado: "4f88416141c09a82e744990b1aee8c00b9f31dfd"
estado_recomendado: "APTO_CON_OBSERVACIONES"
resumen_hallazgos:
  P0_bloqueantes: 0
  P1_altos: 0
  P2_medios: 1
  P3_bajos: 1
hallazgos_corregidos: 2
hallazgos_pendientes: 0
requiere_decision_humana: true
conflicto_con_main: false
cumplio_lista_blanca: true
pruebas_regresion: "EJECUTADO_PASS"
ci_del_pr: "CI_PENDIENTE"
estado_publicacion: "BORRADOR_PRIVADO_PRE_PUBLICACION"
---

# E2-3 - Informe de revisión

## 1. Resultado

No se demostró un defecto funcional del Catálogo en el alcance probado. Se cerró una brecha de cobertura concurrente y se corrigió una referencia documental desactualizada. No se modificaron servicios, DTO, permisos, modelos ni migraciones.

La base auditada pasó **580 pruebas**; el árbol final, **585**. La combinación simulada con `main` pasó **802 pruebas** con PostgreSQL real. CI propio pendiente de publicación; este resultado no certifica producción, carga sostenida ni integración React/API. **No se realizó merge.**

## 2. Acceso y corte

Repositorio: `Jorge10192/TP-Programacion2-UNSAM-2C2026`, exclusivamente `plataforma-pyme/`. Rama creada en un worktree separado desde el commit que incorporó `E2-3_ENTREGA_PARA_REVISION.md`: `e4ddd394dac9af2875a88dd77b66362b559d6cf6`. La rama conserva ese corte, sin merge/rebase de `main` ni incorporación de las auditorías E2-1/E2-2.

Inspeccionados: hoja E2-3 y controles de la guía maestra; secciones RF-04/CU-05/E2-3 de Documentos 01-05; matriz `docs/E2-3_D_INTEGRIDAD_CATALOGO.md`; secciones técnicas de Catálogo del README; modelo `catalog_item.py`, migración `20261108_0011_catalog_items.py`, módulos `catalog/{schemas,service,repository,router}.py`, tests `test_catalog*.py`; fuente, guía y textos del SVG 03A. Autenticación y repositorio empresarial se consultaron como dependencias, sin editarlos.

Referencias: código original E2-3 D `bf4fd3fa809c9f4e6afdeb064a155acf233b1722`; cierre documental previo `b409a45e5a4db36245753543f7cb177ba038da2f`; `main` comparado `4f88416141c09a82e744990b1aee8c00b9f31dfd`.

## 3. Trazabilidad RF-04 / CU-05

Prefijo: `/api/v1/businesses/{business_id}/catalog`.

| Operación | Ruta | Implementación y control | Evidencia |
|---|---|---|---|
| Listar | GET colección | Tenant, miembro activo, orden `name_key,id`, paginación BIGINT | Tests HTTP/API, OpenAPI |
| Crear | POST colección | DTO normalizado; titular/admin; empresa ACTIVA; UNIQUE SQL | Tests de esquema, SQL/API y nuevas carreras |
| Consultar | GET `/{item_id}` | UUID acotado al tenant, sesión y membresía | Tests API de empresa ajena y miembros |
| Editar | PATCH `/{item_id}` | Campos permitidos, null explícito, tipo/unidad, rollback | Tests API, cambios parciales y errores inducidos |
| Cambiar estado | PATCH `/{item_id}/status` | ACTIVO/INACTIVO; no libera claves; repetición idempotente | Tests HTTP/API y comparación de respuesta |

`CatalogItem` pertenece a una Empresa; `item_type` deriva de `kind`. La migración `e23a_catalog` protege FK, formato, montos y unicidad empresarial. No se crea stock al registrar una ficha.

## 4. Método

Se reprodujo la suite original sobre una base local nueva PostgreSQL 16.15, Python 3.12 y zona de sesión UTC. Se revisaron normalización Unicode, NUL/controles, nullable/omitido, dinero estricto, sesión, rol, tenant, suspensión, idempotencia y rollback contra los tests y código presentes.

La comprobación concurrente usa dos conexiones PostgreSQL distintas, verificadas mediante `pg_backend_pid()`, barrera de inicio y transacciones independientes. Se probaron tanto INSERT SQL que compiten por la misma clave como peticiones HTTP de dos actores administrativos. La limpieza afecta únicamente usuarios y empresas ficticios creados por cada caso.

## 5. Hallazgos

### REV-E2-3-001 - P2 - Faltaba comprobar altas simultáneas

La hoja y matriz D reconocían que los duplicados se habían probado secuencialmente. No había evidencia propia de dos conexiones disputando nombre/SKU ni de la respuesta HTTP ante esa competencia. Es una **brecha de cobertura**, no un fallo funcional demostrado.

Se agregaron cinco casos: dos carreras SQL (nombre y SKU), dos carreras HTTP con valores equivalentes tras normalización y una doble alta válida en empresas distintas. Resultado: una fila y un error SQL `23505` del índice esperado; respuestas HTTP `201/409` en el mismo tenant y `201/201` entre tenants. Los cinco pasaron con la implementación existente, sin cambiarla. MOD-E2-3-001 cierra esta brecha acotada; no constituye prueba de carga.

### REV-E2-3-002 - P3 - RF-04 conservaba el estado anterior

`entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md:97`, columna **Estado actual**, decía cuatro rutas y gestión de estado pendiente. El router y OpenAPI ya exponen cinco operaciones, incluida `PATCH /status`, como también indica el cierre E2-3 E. Se corrigió únicamente esa celda mediante MOD-E2-3-002. La integración React sigue indicada como pendiente.

## 6. Cambios separables

| ID | Commit completo | Archivo | Efecto / riesgo | Dependencia |
|---|---|---|---|---|
| MOD-E2-3-001 | `e0592228241e57cc3d34eee9a8516f16acc9f241` | `backend/tests/test_catalog_concurrency_integration.py` | Cinco casos reales con conexiones independientes; sin cambio funcional; usa solo PostgreSQL de desarrollo con integración habilitada | Ninguna |
| MOD-E2-3-002 | `dce66bd8aba1ed16b0660a37e029efadab5cb6cf` | `entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md:97` | Una celda alinea RF-04 con las cinco rutas y estado reversible | Ninguna |

Los cambios se pueden aceptar por separado. Los casos nuevos de cobertura pasan sobre la implementación original; no se presenta un falso fallo antes/después. La corrección documental se comprueba comparando la celda con las cinco operaciones de OpenAPI.

## 7. Límites y decisiones pendientes

- El equipo debe decidir por separado qué commits aceptar. CI propio y publicación todavía pendientes al preparar este informe.
- No se midió carga sostenida, rendimiento ni todas las intercalaciones posibles. Las cinco carreras no prueban ausencia de cualquier carrera.
- SQL valida las claves almacenadas; no normaliza automáticamente nombres insertados fuera del servicio. Es el contrato deliberado, no una corrección pendiente introducida aquí.
- E2-1 y E2-2 tienen auditorías separadas. Sus correcciones no se copiaron a esta rama; UTC es el entorno declarado de esta prueba.
- La integración frontend/API, operaciones comerciales completas y despliegue no forman parte de este bloque. Los párrafos históricos identificados por corte se conservaron.

## 8. Compatibilidad

`git merge-tree --write-tree HEAD origin/main` finalizó sin conflictos contra `4f88416141c09a82e744990b1aee8c00b9f31dfd`. Árbol combinado: `3021115108f49cb3da597ca30c0ce36b23b4d64e`. Se extrajo una copia privada de ese árbol y se aplicaron sus migraciones en otra base local nueva: **802 passed**, sin deriva de esquema. La rama original no recibió el merge.

Ese `main` ya incorpora proveedores, compras, recepción y stock E2-4, incluidas restricciones al cambio de tipo/unidad de artículos con historia. La auditoría E2-3 no modifica `catalog/service.py` ni sobrescribe esas reglas posteriores. La edición conjunta de tipo/unidad sin historia sigue siendo deliberada en el corte E2-3. No se modificó ninguna migración aplicada, dato compartido, frontend o carpeta académica hermana.

## 9. Documentos y UML

Los cierres E2-3 E de Documentos 01-05 y la guía 03A describen las cinco rutas, `CatalogItem`, tipo derivado, nombre/SKU empresariales y ausencia de stock automático. La única corrección necesaria propuesta es la celda RF-04 indicada arriba. Las rutas `/items` de la tabla preliminar siguen rotuladas como propuestas, no se convirtieron artificialmente en endpoints implementados.

PUML 03A v0.7 conserva Empresa `1` a ArticuloCatalogo `0..*`, `kind`, tipo derivado, precio/costo opcionales y nota de unicidad. El SVG pudo analizarse como XML y sus textos de Catálogo son coherentes con su carácter editorial resumido. No se realizó una revisión visual renderizada ni se generó una lámina nueva. `Proveedor` es TO-BE en este corte histórico E2-3; en el `main` posterior ya existe su implementación E2-4. 03B/03C no se editaron.

## 10. Validaciones - 08/11/2026

| Control | Comando / entorno | Estado | Resultado y límite |
|---|---|---|---|
| Base recibida | `python -m pytest -q`, PostgreSQL 16.15 nuevo, Python 3.12, UTC, SHA `e4ddd39` | EJECUTADO_PASS | **580 passed in 40.94s** |
| Carreras nuevas | `python -m pytest -q tests/test_catalog_concurrency_integration.py` | EJECUTADO_PASS | **5 passed in 1.30s**, dos conexiones por caso |
| Árbol final | `python -m pytest -q`, árbol de `dce66bd` | EJECUTADO_PASS | **585 passed in 41.10s**, cero errores/fallos/omitidos |
| Alembic del corte | `python -m alembic upgrade head`, `current`, `check` | EJECUTADO_PASS | `e23a_catalog (head)`; `No new upgrade operations detected.` |
| API nativa | Uvicorn en loopback, GET `/health`, `/ready`, OpenAPI | EJECUTADO_PASS | `ok`, `ready/database ok`, cinco operaciones de Catálogo; no prueba React |
| Integración simulada | Suite del árbol combinado `3021115`, otra base PostgreSQL nueva | EJECUTADO_PASS | **802 passed in 63.55s**, migraciones completas y Alembic sin deriva |
| CI original D | [Run 42508771222](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42508771222), SHA `bf4fd3fa809c9f4e6afdeb064a155acf233b1722` | CI_PASS_VERIFICADO | Tres trabajos exitosos: Python 3.12, 3.14 y Docker; no es CI de esta rama |
| Docker local | `docker version` | OMITIDO_SIN_ENTORNO | Daemon Docker Desktop no disponible; no se modificó su configuración |
| CI de esta rama | Publicación no realizada al preparar el informe | CI_PENDIENTE | No se reutiliza como propio el CI histórico |

Logs, XML de pytest, resultados HTTP y metadatos del árbol combinado se conservan privadamente. No se incluyen credenciales, tokens ni registros operativos en el repositorio.

## 11. Matriz de decisión selectiva

| Cambio | Hallazgo | Prioridad | Evidencia | Compatibilidad | Dependencias | Recomendación | Decisión equipo |
|---|---|---|---|---|---|---|---|
| MOD-E2-3-001 | REV-E2-3-001 | P2 | Cinco carreras aprobadas; suites 585 y 802; CI propio pendiente | Sin cambio de API, datos o esquema | Ninguna | ACEPTAR | PENDIENTE |
| MOD-E2-3-002 | REV-E2-3-002 | P3 | Router/OpenAPI: cinco operaciones; diff de una celda | Solo RF-04 | Ninguna | ACEPTAR | PENDIENTE |

## 12. Lista blanca y entregables

Diff de código/documentación: **dos archivos permitidos**, 174 líneas añadidas y una eliminada. Ningún cambio en `auth`, `businesses`, `locations`, modelos, migraciones, workflows, frontend, 03B/03C ni otros proyectos. Árbol de trabajo limpio después de los dos commits.

Este informe permanece fuera del repositorio hasta aprobar su contenido y destino. Si se autoriza, se incorporará como tercer archivo en `plataforma-pyme/docs/revisiones/E2-3_INFORME_DE_REVISION.md`, mediante un commit documental separado. El SHA final indicado corresponde al código y documento RF-04, anterior a ese futuro commit del informe.

## 13. Dictamen y PR

**APTO_CON_OBSERVACIONES para revisión del equipo**: evidencia local satisfactoria y sin incompatibilidad detectada contra el `main` indicado; publicación, CI propio y aceptación selectiva pendientes. El resultado no certifica el producto completo ni producción.

Destino propuesto: `review/e2-3-catalogo` hacia `main`. URL del PR: **pendiente de creación**. **No se publicó la rama, no se creó el PR y no se fusionó ningún cambio al preparar este informe.**
