---
tipo_documento: "INFORME_DE_REVISION"
bloque: "E2-4"
rama: "review/e2-4-proveedores-compras-recepcion"
sha_base_recibido: "1a188f9a596f4674ca121806ecb92e6a96abf294"
sha_codigo_original: "4f88416141c09a82e744990b1aee8c00b9f31dfd"
sha_final_codigo: "3621270ff8b55b4d8b5eae9d7c3244e1ea1c8dd6"
sha_main_comparado: "9a7a66394daf5a96b18b9ce796a2fe9ec92a4068"
estado_recomendado: "APTO_CON_OBSERVACIONES"
resumen_hallazgos: {P0: 0, P1: 0, P2: 1, P3: 0}
hallazgos_corregidos: 1
hallazgos_pendientes: 0
requiere_decision_humana: true
conflicto_con_main: false
cumplio_lista_blanca: true
ci_del_pr: "CI_PENDIENTE"
---

# E2-4 - Revisión independiente

## 1. Resultado

Se reprodujo la base de **797 pruebas** y el árbol corregido pasó **809**. Se corrigió una validación de sitios web; no se cambiaron compras, recepción, stock ni persistencia. La combinación privada de las tres auditorías con `main` pasó **897 pruebas**. Aceptación del equipo y CI propio pendientes; **sin merge**.

## 2. Acceso y corte

Ámbito exclusivo `plataforma-pyme/`. Rama independiente desde el cierre documental `1a188f9`; su aplicación, tests y migraciones no difieren del código congelado `4f88416`. Inspeccionados: hoja E2-4, guía de revisión, cierre y manifiesto, contratos de proveedores/compras/recepción, schemas, servicios, routers y tests asociados. Dependencias empresariales, catálogo y ubicaciones solo se consultaron.

## 3. Trazabilidad

| Regla | Implementación | Evidencia ejecutada |
|---|---|---|
| RF-05 proveedores | Cinco operaciones en `/suppliers`; normalización, estado y tenant | `test_supplier_*`; nuevas pruebas de URL |
| RF-05 compras | Tres operaciones en `/purchases`; snapshots, HALF_UP y reintento | `test_purchase_*` |
| CU-07 recepción | POST `/purchases/{id}/receive`, GET `/receipt`; STORE, recepción única | `test_receipt_*`, incluida concurrencia |
| RF-06 consulta | GET `/inventory/balances` y `/movements` | Filtros, tenant y lectura de histórico en la suite |

OpenAPI nativo expone las 12 operaciones E2-4, dentro de 39 operaciones totales de este corte. La lectura de documentos no se presenta como nueva prueba manual de Swagger.

## 4. Método

PostgreSQL 16.15 dedicado, cuatro bases distintas para E2-4, E2-5, E2-6 y combinación; Python 3.12, UTC y comprobación previa del destino efectivo. Se contrastaron validación, permisos, idempotencia, rollback, snapshots y límites con código, pruebas y esquema migrado. No se utilizaron datos QA del desarrollador.

## 5. REV-E2-4-001 - P2 - URL de proveedor admitía IP alternativas

En `backend/app/modules/suppliers/schemas.py`, `_safe_url`, el control `ipaddress.ip_address` rechazaba la notación habitual pero aceptaba `https://127.1/`, `https://127.0.1/`, `https://0177.0.0.1/` y `https://0x7f.1/`. La conversión IPv4 local confirma que representan `127.0.0.1`. Esto contradice la regla existente de no admitir IP directas como sitio del proveedor.

Reproducción: validar esos valores con `CreateSupplierRequest`/`UpdateSupplierRequest`, o enviarlos por POST/PATCH de proveedor. Antes: ocho validaciones no rechazaban y HTTP permitía alta/edición (201/200). Después: validación rechazada, HTTP 422 y sin escritura parcial. **No se demostró SSRF**: el backend guarda el enlace y no lo consulta.

## 6. MOD-E2-4-001

Commit `3621270ff8b55b4d8b5eae9d7c3244e1ea1c8dd6`: usar `socket.inet_aton` para reconocer notaciones IPv4 alternativas **sin DNS ni solicitudes de red**. Dos casos de dominio válido evitan rechazar etiquetas numéricas legítimas. Nuevo `tests/test_supplier_review_validation.py`: ocho casos DTO, dos controles válidos y dos casos HTTP de atomicidad.

## 7. Límites y pendientes

No se hace resolución DNS ni se garantiza que un dominio resuelva a una IP pública: la validación es estructural. No se cambió ese contrato. Ledger append-only frente a SQL directo y privilegios mínimos productivos siguen fuera de esta corrección; el usuario de la base local de pruebas es propietario. No se auditó producción ni se ejecutó una sesión humana nueva en Swagger.

## 8. Compatibilidad

Simulación sin conflictos contra `main` `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068`. La combinación E2-4/E2-5/E2-6 se probó mediante árbol privado `8f2f401a361af806fb9637e05edce2e16e4b3c8b`, sin mover ni mergear ramas. No hay cambios de DDL, DTO de compras, datos históricos, frontend ni otros proyectos.

## 9. Documentos

Los once SHA256 del manifiesto original E2-4 coinciden con los blobs Git; 13 enlaces relativos del cierre resuelven. El cierre conserva su carácter histórico. Los documentos académicos transversales siguen mezclando planificación y cortes; su consolidación general corresponde a E2-7, no a esta modificación.

## 10. Pruebas propias y procedencia - 09/11/2026

| Control | Estado | Resultado |
|---|---|---|
| `python -m pytest -q`, base `1a188f9` | EJECUTADO_PASS | 797 passed, 69.11 s |
| Nuevos casos antes del cambio | EJECUTADO_FAIL esperado | 10 failed, 2 passed; reproducción del defecto |
| Nuevos casos corregidos | EJECUTADO_PASS | 12 passed, 1.20 s |
| Suite del árbol `3621270` | EJECUTADO_PASS | 809 passed, 67.54 s; cero errores/omitidos |
| Alembic upgrade/current/check | EJECUTADO_PASS | `e24e_receipt_stock`; sin operaciones pendientes |
| Uvicorn nativo `/health`, `/ready` | EJECUTADO_PASS | ok; ready/database ok; tablas de prueba vacías |
| Suite combinada privada | EJECUTADO_PASS | 897 passed, 74.81 s; Alembic sin deriva |
| [CI histórico 42530739959](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42530739959) | CI_PASS_VERIFICADO | 3/3 trabajos, SHA **95fe3ff53d5342901d0a65b10f543b70dafb4f7a**; no se atribuye al SHA documental ni al nuevo PR |
| Docker local | OMITIDO_SIN_ENTORNO | Daemon Desktop no disponible; CI histórico Docker consultado |
| CI nuevo | CI_PENDIENTE | Rama todavía no publicada al preparar este informe |

Las comprobaciones auxiliares se corrigieron para importar el checkout exacto; no se confundieron sus errores iniciales con defectos de la aplicación. Logs y credenciales de prueba quedan privados.

## 11. Decisión selectiva

| Cambio | Sugerencia | Dependencia | Decisión equipo |
|---|---|---|---|
| MOD-E2-4-001, validación y regresión | ACEPTAR | Ninguna otra auditoría | PENDIENTE |

## 12. Archivos

Dos archivos de código/tests: `app/modules/suppliers/schemas.py` y `tests/test_supplier_review_validation.py`, bajo `backend/`. Informe separado, fuera del repositorio hasta aprobar su publicación. Migraciones y paquete histórico sin modificaciones.

## 13. Dictamen

**APTO_CON_OBSERVACIONES** para revisión del equipo, condicionado a CI del PR. Propuesta: `review/e2-4-proveedores-compras-recepcion` hacia `main`. URL de PR pendiente al preparar el informe. No se publicó ni mergeó la rama en esta fecha de preparación.


Rechequeo previo a publicación: `main` avanzó a `b72997be411d659ff7480f642543162445c951a0` por documentación E2-7. Su árbol backend y workflows son idénticos al `main` validado `9a7a663`; no se repitió una suite idéntica. Las tres simulaciones individuales contra el nuevo `main` también terminaron sin conflictos.
