# E2-6 - Evidencia y límites

**Fecha: 09/11/2026.** Python 3.12, PostgreSQL 16.15 dedicado, UTC; comprobación del nombre/puerto local antes de habilitar tests. Cada bloque y la combinación usan una base distinta. Credenciales, logs crudos y datos temporales permanecen privados.

| Ejecución | SHA / árbol | Estado | Resultado |
|---|---|---|---|
| Suite original `python -m pytest -q` | `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068` | EJECUTADO_PASS | 879 passed, 83.86 s |
| Regresiones nuevas antes de corregir | Árbol original + tests | EJECUTADO_FAIL esperado | 2 failed, 4 passed: HTTP 500 e items de OpenAPI vacíos |
| Regresiones corregidas | Cambios actuales de ventas | EJECUTADO_PASS | 6 passed, 1.67 s |
| Suite final | `0a74f2b6e38a099bad20a2648ebf58547b06442e` | EJECUTADO_PASS | 882 passed, 82.42 s; cero errores/omitidos |
| Upgrade/current/check | Base efímera del mismo checkout | EJECUTADO_PASS | `e26a_sales_foundation`; sin operaciones pendientes |
| API nativa en loopback | Mismo checkout/base | EJECUTADO_PASS | `/health` ok; `/ready` ready/database ok; 45 operaciones de API |
| Combinación de auditorías con main | Árbol privado `8f2f401a361af806fb9637e05edce2e16e4b3c8b` | EJECUTADO_PASS | 897 passed, 74.81 s; sin conflictos ni deriva |
| [CI del merge funcional 42696474777](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42696474777) | `6336152e8dd095ca91363566beddd2b622432a5e` | CI_PASS_VERIFICADO | 3/3 trabajos: Python 3.12, Python 3.14 y Docker; no es CI de esta rama |
| Docker local | Daemon Desktop no disponible | OMITIDO_SIN_ENTORNO | No se alteró Docker ni se inventó una ejecución local |
| CI de la revisión | Publicación aún pendiente | CI_PENDIENTE | Se verificará sobre el nuevo commit publicado |

La combinación se creó con `git merge-tree` y objetos temporales no referenciados, exportados a una copia privada; ninguna rama recibió merge/rebase. Las tres ramas mantienen sus cortes respectivos.

Acceso verificado a los archivos citados en resumen/matriz; suites originales y nuevas ejecutadas, constraints SQL inspeccionadas, cierre e instrucciones contrastados. Nueve enlaces relativos del cierre E2-6 resuelven. No se afirma una nueva auditoría visual renderizada de UML, prueba humana de Swagger ni E2E de React. Los documentos académicos globales con estados históricos se conservan para el cierre E2-7.

El control auxiliar de arranque se corrigió para impedir importar otro checkout desde el entorno Python editable; las suites ya registraban el `app.__file__` correcto. Después, las cuatro bases de la revisión quedaron sin filas de fixtures. El usuario propietario del PostgreSQL de pruebas puede UPDATE/DELETE sobre el ledger: no se certifica endurecimiento SQL de producción.

Los pagos son declarados. No se validaron Mercado Pago, conciliación bancaria, gastos/caja, devoluciones, cargas prolongadas ni todas las carreras de permisos. Los límites de la matriz no se convierten en resultados PASS por inferencia. **No se publicó ni fusionó la rama al preparar este paquete.**


Rechequeo previo a publicación: `main` avanzó a `b72997be411d659ff7480f642543162445c951a0` por documentación E2-7. Su árbol backend y workflows son idénticos al `main` validado `9a7a663`; no se repitió una suite idéntica. Las tres simulaciones individuales contra el nuevo `main` también terminaron sin conflictos.
