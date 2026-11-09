# E2-5 — Acta de revisión integral de documentación y preparación de auditoría

**Fecha:** 09/11/2026. **Versión:** v1.2, sobre borrador v1.1 de PR documental #24.  
**Resultado interno:** **OK PARA REVISIÓN FORMAL DEL EQUIPO Y PREPARACIÓN DE AUDITORÍA EXTERNA**, con condiciones y pendientes indicados.  
**NO significa:** auditoría independiente realizada, producción aprobada, PR fusionado, test backend nuevamente ejecutado o remediación de los riesgos identificados.  
**Código funcional contra el que se contrastó la documentación:** `main` `748e69319d8d04900c009d5184168a264a9deeac`.  
**Rama revisada:** `docs/e2-5-cierre-revision-critica`, PR #24 (Draft).

## 1. Método y fuentes inspeccionadas

Esta revisión editorial/técnica cotejó:
- **Código de GitHub**: `auth/tokens.py` y `auth/session_service.py`; modelos `inventory_operation.py`, `stock_movement.py` y `stock_balance.py`; `transfer_{router,schemas,service}.py`, `adjustment_{router,schemas,service}.py`, `inventory_router.py`, `receipt_schemas.py`, autorización en `purchases/service.py` y política en `locations/permissions.py`.
- **Datos/migración**: `20261109_0016_inventory_operations.py` y cadena Alembic; descripción de FK, CHECK, UNIQUE y concurrencia.
- **Tests**: nombres y escenarios de `test_inventory_operation_*`, `test_transfer_api_integration.py`, `test_transfer_concurrency_integration.py`, `test_adjustment_api_integration.py`, `test_adjustment_concurrency_integration.py` y dependencias de recepciones.
- **CI**: runs finales de merges A `42601062105`, B `42604071018`, C `42617212795`; 816/826/840 en Python3.12 y 3.14, 3/3 jobs. Las cifras son del **histórico funcional**, no de este PR.
- **QA**: respuestas Swagger de traslado y ajustes compartidas por el desarrollador, con balance/historial por artículo; transcripciones saneadas en bitácoras B/C.
- **Documentos**: conjunto `00..13` del cierre; especificaciones E2-5 A/B/C; guías de auditoría; requisitos/casos de uso 01–05 y ADR-004; observaciones de otra IA como insumo, no como prueba.

**Limitación metodológica:** no se ejecutaron tests ni Swagger desde esta revisión documental; no se inspeccionó en vivo la base Windows ni se reprodujeron carreras cruzadas. No se hace una auditoría independiente del código ni se certifica una cobertura global de seguridad. La inspección de documentación fue sobre fuentes versionadas en GitHub.

## 2. Hallazgos documentales y correcciones ejecutadas

| ID | Nivel | Hallazgo concreto | Corrección documental realizada | Estado |
|---|---|---|---|---|
| **DOC-E25-01** | P2 | `05_ARQUITECTURA_MODELO_Y_API.md` llamaba «JWT» al mecanismo de autenticación. El código usa **Bearer opaco de 256 bits** y sesión revocable, con digest en BD. | Reemplazado JWT y añadido el recorrido real de autenticación y revalidación. | **CORREGIDO EN PR** |
| **DOC-E25-02** | P2 | `08_REPRODUCCION_SEGURA.md` y `10_CHECKLIST...md` remitían al `12_MANIFIESTO_SHA256.txt` del ZIP v1.0, ya no vigente en Git. | Sustituidas instrucciones por `12_MANIFIESTO_GIT_BLOBS.md`; el manifiesto se regenera al finalizar cambios documentales. | **CORREGIDO EN PR** |
| **DOC-E25-03** | P2 | El checklist seguía indicando como no ejecutadas tareas documentales ya contrastadas (CI, SHA, Swagger, PR). | Actualizados estados solo donde hubo evidencia; revocación del token **posteriormente confirmada por Swagger 204 con el mismo Bearer**; aprobación y merge continúan **pendientes**. | **CORREGIDO EN PR** |
| **DOC-E25-04** | P2 | No había hoja de auditoría E2-5 ni matriz de casos suficientemente específica para un compañero y su IA; riesgo de ampliar alcance sin permiso. | Añadidos `E2-5_ENTREGA_PARA_REVISION.md` y paquete `E2-5_AUDITORIA/` con fuente de verdad, 24 invariantes, controles RBAC, tests y formato del informe. | **CORREGIDO EN PR** |
| **DOC-E25-05** | P2 | Documentos académicos acumulativos conservaban «RF-06 planificado» y en un corte histórico vinculaban CU-11 a RF-07. Un lector automático podría confundir estado histórico con estado actual. | Adenda de estado E2-5 al inicio de `entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md` con correspondencia vigente CU-11→RF-06 y aviso sobre tablas anteriores históricas. | **CORREGIDO EN PR** |
| **DOC-E25-06** | P2 | Algunas secciones declaraban «se hará la hoja del auditor más adelante», inconsistente con el nuevo encargo. | Actualizados índice, informe, trazabilidad, riesgos y checklist para decir **preparado, no ejecutado/no aprobado**. | **CORREGIDO EN PR** |
| **DOC-E25-07** | P2 | Deudas repetidas entre P03/P13, P07/P16 y P04; podía duplicarse implementación por una IA. | Relacionados los IDs de deuda sin borrar su historial, y definido **un criterio principal** por familia. | **CORREGIDO EN PR** |

## 3. Resultados de consistencia funcional/documental

| Criterio | Comprobación editorial | Resultado |
|---|---|---|
| Fuente de verdad/SHAs | PR #21/#22/#23 fusionados; SHA de código, migración y CI coincidentes con cierre | **Conforme a evidencia GitHub** |
| Autorización | Tokens opacos, Bearer + DB; permisos STORE y rol por sede; política y docs | **Corregida terminología; pendiente auditoría de seguridad efectiva** |
| Contratos HTTP | 6 endpoints de inventario y recepción como dependencia; Pydantic estricto y UUID4 | **Conforme a código inspeccionado** |
| Persistencia | Cabecera manual + ledger firmado + saldo versionado; migración aditiva | **Conforme a modelos/migración, no certifica SQL de rol privilegiado** |
| Concurrencia | Locks de ubicación ordenados en transferencia, versión en ajuste, tests concurrentes propios | **Conforme a pruebas existentes, carrera cruzada sigue sin prueba específica** |
| Idempotencia | 201 nuevo / 200 replay idéntico / 409 conflicto | **Conforme a servicios, tests y Swagger reportado** |
| Stock inicial | Una vez por par, también cuando saldo previo fue agotado a 0 | **Regla deliberada, no adoptar reinicialización** |
| QA y cifras | 6/4 artículo A y 6 versión3 artículo B, ledger 3+3 eventos | **Atribución manual reportada, no lectura propia de DB** |
| CI/Windows | 816/826/840 por corte CI; 840 Windows en C | **Procedencia separada, no es % coverage** |
| React/Ventas/Producción | DEMO/TO-BE y hardening pendiente | **Explícito; sin atribuir backend de ventas al E2-5** |
| Secretos en docs | Sin contraseña, Bearer literal, clave real, correo personal ni DSN privado | **Control de contenido del PR; revocación de la sesión expuesta reportada por Swagger 204, no inspección SQL** |

## 4. Qué se aprueba y qué queda condicionado

**Se puede recomendar al equipo:**
1. Aprobar la versión documental corregida para **entrega a auditoría técnica independiente**, tras revisión humana y merge controlado del PR.
2. Facilitar al compañero el plan reproducible y la guía maestra, **sin publicar credenciales**.
3. Mantener congeladas reglas actuales mientras se audita, y pedir a la IA revisora hallazgos con evidencia antes de cambiar código.
4. Solicitar especial atención a permisos de SQL runtime, divergencias ledger/balance, carreras cruzadas, reintentos tras cambio de permisos y DB de tests aislada.

**Pendientes no bloqueantes para preparar auditoría, pero relevantes antes de producción:** inmutabilidad del ledger ante SQL directo según privilegios efectivos, políticas de mermas negativas, reversión compensatoria, reintento tras revocación, reconciliación y eventual interfaz de errores estructurados. **No están resueltos por redactar documentos.**

**Actualización de seguridad posterior al dictamen inicial:** la sesión cuyo token se expuso fue cerrada mediante `POST /api/v1/auth/logout` **204** (09/11/2026 15:23:37 GMT) usando el **mismo token**. Evidencia **SWAGGER-REPORTADO**, coherente con el servicio de revocación. **Cerrado ese pendiente específico**; no se certifica el estado de otras sesiones ni se reproduce el valor.

**Condición de publicación:** PR #24 todavía es borrador sin merge; la hoja de auditoría requiere completar el SHA documental real **después de publicar**. Hasta entonces, no afirmar que la auditoría independiente ha comenzado ni que la documentación está en `main`.

## 5. Definición del OK

Este **OK es editorial y de preparación técnica**: el paquete es internamente útil, describe lo implementado con trazabilidad y provee una agenda de auditoría ejecutable por un revisor humano/IA. **No implica que la implementación de E2-5 haya superado una auditoría nueva**, ni autoriza alterar el backend, aplicar migraciones nuevas, revisar otros módulos en profundidad o fusionar por sí solo un PR.

Para pasar de `OK documental` a `CIERRE AUDITADO` faltan, en orden: aprobar y publicar PR documental, compartir encargo con revisor, recibir informe independiente con pruebas reales, revisar/corregir únicamente defectos confirmados y decidir merge de ese PR por el equipo.
