---
tipo_documento: "INFORME_DE_REVISION"
bloque: "E2-5"
rama: "review/e2-5-inventario"
sha_base_recibido: "4fad77ea458b195ad136726e670d93a8ecf85f4e"
sha_funcional_original: "748e69319d8d04900c009d5184168a264a9deeac"
sha_documental_original: "c66df2f8ddaa8179ca12e342bd3099348bc6b155"
sha_final_codigo: "c2b77bb100bd282cc72580c20d1e264cd41d7e58"
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

# E2-5 - Revisión independiente

## 1. Resultado

No se demostró un fallo funcional de inventario en el alcance probado. Se cerró una brecha de cobertura entre comandos con tres carreras reales. Base **840 pruebas**, árbol revisado **843**; combinación privada de las tres auditorías y `main`, **897**. No se modificó lógica de aplicación, esquema ni datos compartidos. **Sin merge.**

## 2. Acceso y líneas base

Rama separada desde la última hoja E2-5 `4fad77e`; su backend coincide con el código funcional congelado `748e693`. Se consultaron hoja, guía, paquete de auditoría, servicios/routers/DTO de traslado y ajuste, dependencias de recepción, autorización/ubicaciones y tests. DDL, metadatos y CHECK/FK se contrastaron mediante migraciones, tests PostgreSQL e inspección del esquema.

## 3. Matriz de los 24 controles

`P` = código/contrato contrastado y casos de la suite ejecutados; no significa prueba de todas las intercalaciones ni auditoría de producción.

| INV | Regla / fuente principal | Estado y evidencia / límite |
|---|---|---|
| 01 | InventoryOperation: clase, dirección, motivo | P; modelo, CHECK y tests de SQL |
| 02 | FK de artículo, sede y actor por tenant | P; cinco FK del modelo y tests de referencias ajenas |
| 03 | Origen exclusivo y signo del ledger | P; CHECK SQL y `test_signed_origin_kind_is_enforced_in_postgres` |
| 04 | Recibos E2-4 preservados | P; tests de recibos/histórico ejecutados |
| 05 | GET saldos y movimientos por tenant | P; `inventory_router`, filtros/paginación y regresión |
| 06 | Dos sedes ACTIVA/STORE distintas | P; DTO, permisos y tests de traslado |
| 07 | Débito condicional, crédito y conservación | P; servicio, pruebas atómicas y nuevas conciliaciones |
| 08 | Orden estable de locks | P; sedes por UUID; pruebas de sentidos opuestos; sin carga sostenida |
| 09 | Replay de traslado por actor/cuerpo | P; tests HTTP y carrera de misma clave |
| 10 | Inicial único, incluso historia cero | P; servicio y pruebas de inicialización/recepción |
| 11 | Inicial titular/admin; ajuste encargado asignado | P; matriz de permisos y tests existentes |
| 12 | Ajuste sobre balance y versión exacta | P; pruebas de versión obsoleta y carreras |
| 13 | Delta firmado y límites | P; tests de entrada/salida, saldo y esquema |
| 14 | Reutilización de clave entre clases/actores | P; tests existentes y nueva competencia entre clases |
| 15 | Compra sin stock; recepción única | P; regresión E2-4 ejecutada |
| 16 | Rollback de cabecera/ledger/balances | P; tests de error parcial y unidad transaccional del servicio |
| 17 | Sesión, membresía y tenant | P; autorización compartida con locks; revocación simultánea específica no ejecutada |
| 18 | Milésimas discretas y StrictInt | P; tests de DTO/SQL; sin cambiar límites |
| 19 | Concurrencia entre módulos | P acotado; tres pruebas nuevas, dos actores/conexiones y conciliación por sede |
| 20 | Inmutabilidad frente a SQL directo | LIMITADO; el usuario local propietario puede UPDATE/DELETE. No certifica privilegios productivos ni append-only SQL |
| 21 | DB aislada y limpieza propia | P; destino verificado, bases privadas y cero filas de fixture al final |
| 22 | HTTP y reintentos | P; 201/200/401/403/404/409/422 según ruta y tests |
| 23 | Abstracciones proporcionales | P; sin refactor ni cambios de aplicación |
| 24 | RF-06 / CU-08,09,11 y documentación | P parcial; contratos de cierre contrastados; consolidación académica global pendiente en E2-7 |

Las cuatro operaciones de traslado/ajuste se añaden a lectura de balances/ledger y recepción; OpenAPI nativo tiene 43 operaciones totales en este corte. Ventas no se atribuye a E2-5.

## 4. Método

PostgreSQL 16.15 dedicado, Python 3.12 y UTC. Se comprobaron destino efectivo, versiones Alembic, tests originales, SQL y flujo de locks usuario/sesión -> empresa/membresía -> sedes -> artículo/saldo. Las carreras nuevas utilizan titular y administrador diferentes, dos `pg_backend_pid()` distintos y barrera de inicio.

## 5. REV-E2-5-001 - P2 - Cobertura cruzada no demostrada

La matriz INV-19 reconocía la falta de pruebas específicas entre comandos. Es una **brecha de cobertura**, no corrupción confirmada. Se probaron:

1. Traslado de 4000 contra ajuste de salida de 7000 sobre 10000: un éxito y un 409, sin doble gasto.
2. Recepción de 2000 contra inicial de 4000: recepción confirmada; inicial aceptado solo si precede a la recepción. Saldo final 2000 o 6000, con versión coherente.
3. Una misma clave disputada entre traslado y ajuste de actores distintos: una operación y un conflicto.

Cada caso compara saldo por sede con suma firmada del ledger. Los tres pasan con la lógica original; no se presenta un falso bug antes/después.

## 6. MOD-E2-5-001

Commits `74f68db7759be6a1ebc5c9d4cc19d18c07f701f4` y `c2b77bb100bd282cc72580c20d1e264cd41d7e58` (renombrado para respetar la lista blanca), en ese orden: único archivo `backend/tests/test_inventory_operation_review_interop.py`. Reutiliza el tenant temporal existente, agrega un administrador y limita su limpieza a sus referencias. Ninguna modificación de servicios, estados, versiones, tipos de ajuste, permisos o migraciones.

## 7. Límites y decisiones

INV-20 sigue como endurecimiento de despliegue, no como bypass REST demostrado. No se ensayó carga sostenida, toda combinación de operaciones, revocación simultánea ni configuración de roles de producción. No se propuso reinicializar saldos históricos cero, ampliar permisos, agregar reservas ni cambiar HALF_UP. Se conserva el alcance deliberado.

## 8. Compatibilidad

Sin conflictos de Git contra `main` `9a7a663`. Combinación privada `8f2f401a361af806fb9637e05edce2e16e4b3c8b`: **897 pruebas**, migraciones completas y sin deriva. No se mergeó ni rebased la rama. Los tests no dependen de incorporar los otros PR de auditoría.

## 9. Documentación

Hoja, matriz y cierres se distinguen de evidencia independiente. 35 enlaces relativos resuelven y los 24 Git blobs del manifiesto coinciden. 03B/03C están rotulados como modelos conceptuales TO-BE. Los manifiestos originales y los documentos históricos no se reescribieron. La API nativa, esquema migrado y casos reales sostienen los invariantes revisados; no se realizó nueva revisión visual renderizada de UML ni validación humana de Swagger. La sincronización general de 01-05/03B con la interfaz queda para E2-7.

## 10. Pruebas propias - 09/11/2026

| Control | Estado | Resultado |
|---|---|---|
| Base `4fad77e`, `python -m pytest -q` | EJECUTADO_PASS | 840 passed, 78.49 s |
| Tres carreras nuevas | EJECUTADO_PASS | 3 passed, 1.98 s |
| Suite del árbol `c2b77bb` | EJECUTADO_PASS | 843 passed, 68.24 s; cero errores/omitidos |
| Alembic upgrade/current/check | EJECUTADO_PASS | `e25a_inventory_ops`; sin deriva |
| API nativa `/health`, `/ready` | EJECUTADO_PASS | ok y ready/database ok; fixtures vacíos |
| Suite combinada privada | EJECUTADO_PASS | 897 passed, 74.81 s |
| [CI histórico 42617212795](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42617212795) | CI_PASS_VERIFICADO | Tres trabajos exitosos, SHA `748e69319d8d04900c009d5184168a264a9deeac` |
| Docker local | OMITIDO_SIN_ENTORNO | Daemon Desktop no disponible |
| CI del nuevo PR | CI_PENDIENTE | Sin publicación al preparar el informe |

El primer ensayo del fixture nuevo tuvo tres aserciones aprobadas y dos errores de limpieza por FK del administrador; se corrigió el orden y se retiraron únicamente dos actores temporales propios. No fue un defecto de inventario. Las pruebas finales incluyen esa corrección. Logs y cualquier dato de acceso permanecen privados.

## 11. Decisión selectiva

| Cambio | Sugerencia | Dependencia | Decisión equipo |
|---|---|---|---|
| MOD-E2-5-001, cobertura cruzada | ACEPTAR | Ambos commits del MOD en orden; ninguna otra auditoría | PENDIENTE |

## 12. Alcance de archivos

Un archivo de tests permitido y el futuro informe separado. Sin cambios en frontend, ventas/caja, Mercado Pago, `.env` del proyecto, SQL histórico, migraciones ni otros proyectos. El árbol quedó limpio tras los commits.

## 13. Dictamen

**APTO_CON_OBSERVACIONES** para decisión del equipo; CI propio y endurecimiento productivo no se infieren del resultado local. Rama `review/e2-5-inventario` hacia `main`; URL pendiente al preparar este informe. No se publicó ni fusionó la rama durante la preparación.


Rechequeo previo a publicación: `main` avanzó a `b72997be411d659ff7480f642543162445c951a0` por documentación E2-7. Su árbol backend y workflows son idénticos al `main` validado `9a7a663`; no se repitió una suite idéntica. Las tres simulaciones individuales contra el nuevo `main` también terminaron sin conflictos.
