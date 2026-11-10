# E2-7 · T09-F — Auditoría integral de consulta y recuperación de ventas REALES

**Fecha:** 10/11/2026. **Rama:** `feature/e2-7-t09-consulta-recuperacion-ventas`. **PR:** [#42](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/42) (borrador, **sin merge**). **Base `main` de T09:** `5f83541049b6332e5a991810cbfd105515db10ce` (cierre T08).

**Tipo de trabajo:** revisión de código/repositorio, contratos HTTP, casos de prueba PostgreSQL y Playwright, matrices de acceso, evidencia de CI y evidencia manual comunicada por el usuario. No implica conexión a la base de datos de su equipo, ejecución manual de ventas ni acceso a capturas originales fuera del chat.

**Estado del acta al crearla:** hallazgos de código corregidos en rama; **verificación final de workflows del último commit funcional pendiente**. No declarar cierre ni proponer merge antes de registrar la conclusión verde de esa ejecución.

## 1. Alcance y límites del bloque T09

- **T09-0:** línea base y decisiones P02/P03 (roles, permisos históricos y contrato de consulta).
- **T09-A:** cliente GET de comprobante por UUID con parser de snapshots, importes y pagos declarados.
- **T09-B:** política aprobada por el usuario: titular/admin todo el tenant; encargado/trabajador exclusivamente ventas de sedes con asignación ACTIVA. Ninguna excepción permanente por ser autor.
- **T09-C:** `GET /api/v1/businesses/{business_id}/sales` (resúmenes paginados), `GET /sales/by-request/{request_id}` y endurecimiento de `GET /sales/{sale_id}`, filtrando autorización en SQL antes de paginar. Sin nuevos roles ni migraciones.
- **T09-D:** historial y comprobantes REAL de solo lectura en React (carga, filtro, página siguiente, error/retry, `request_id`, F5/login, responsive). DEMO permanece aislado.
- **T09-E:** harness Playwright REAL sobre base descartable que simula pérdida del `201` **tras el COMMIT**, recuperación por GET, replay `200` con misma clave/cuerpo, `409` si cuerpo difiere; venta física con un solo débito y venta de servicio sin stock.
- **T09-F:** auditoría, regresión, documentación, aceptación de los límites y dictamen pre-merge. **T10/POS REAL no está implementado**: T09 **no** ofrece formularios para crear ventas en React, ni journal duradero de intentos, ni acreditación de pagos externos.

**Comparación inicial contra `main`:** 31 commits propios, 0 commits pendientes de traer, 18 rutas de archivo modificadas o agregadas dentro de `plataforma-pyme/`. No se detectaron cambios de T09 fuera de su carpeta, ni conflicto de fusión en la comparación inicial. GitHub debe confirmar estos números nuevamente al concluir el cierre.

## 2. Matriz técnica de evidencia

| Área auditada | Evidencia concreta | Dictamen |
|---|---|---|
| Sesión y tenant | FastAPI revalida sesión/membresía; consultas limitadas por `business_id`; sin acceso cruzado al conocer un UUID/request ID | Correcto según pruebas existentes |
| Cuatro roles | TITULAR_ADMINISTRATIVO/ADMINISTRADOR acceso completo del tenant; ENCARGADO/TRABAJADOR únicamente sedes asignadas ACTIVAS; servicio sin sede reservado a titular/admin | Política aprobada y verificada en PostgreSQL |
| Cambio de permisos | Revocación de asignación quita lectura incluso al autor; sesión/membresía revocada deniega; sede pausada conserva lectura histórica si asignación sigue ACTIVA, no autoriza venta nueva | Verificado automáticamente |
| Backend `GET /sales` | DTO de resumen sin referencias de pago, filtrado SQL previo a offset/limit, orden `created_at DESC, id DESC` | Verificado con 102 comprobantes efímeros |
| Consulta por ID/solicitud | Misma matriz de autorización, `404` para ventas inaccesibles; no genera movimientos ni reenvía POST | Verificado en API y navegador aislado |
| Venta e idempotencia | Venta original `201`, replay mismo actor/clave/cuerpo `200`, cuerpo cambiado `409`; un comprobante, un conjunto de pagos declarados y ledger sin duplicados | Verificado en E2-6 + T09-E |
| Stock físico | `VENTA_SALIDA` negativa una vez; stock 5→4 UNIDAD/v2 en fixture; snapshots históricos; servicio sin stock | Verificado en Playwright/DB efímera |
| Frontend | Gateway exclusivo de GET, sin `localStorage` del token, sin fallback a DEMO, UI de solo lectura; carga/error/retry, navegación y responsive | Cubierto con Node, Playwright y build/lint |
| Regresión T08/DEMO | Suite Playwright inventario REAL y DEMO; no cambiar lógica de inventario/ventas E2-6 salvo endpoints GET | Verde en ejecución integral T09-E |

**CI conocida de T09-E (base de esta auditoría):** [full-stack #42910407673](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42910407673) **SUCCESS**, **886/886 backend**, **272/272 frontend**, **10/10 Playwright REAL**, **6/6 DEMO**, build y lint aprobados. [Backend independiente #42910407905](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42910407905) **SUCCESS** en Python 3.12 y 3.14 y Docker. Se requiere nueva comprobación en SHA con correcciones T09-F (véase sección 6).

## 3. Evidencia manual que realmente existe

| Control | Resultado documentado | Alcance |
|---|---|---|
| Lectura REAL en Windows | Usuario entró a **TEST Empresa A** como **TITULAR ADMINISTRATIVO**, vio Historial de ventas, «Solo lectura», sede y consulta por solicitud | **Aprobado manualmente** |
| Backend Docker local | Error 5xx inicial por imagen antigua; se reconstruyó FastAPI, se verificaron tres rutas y se corrigió proxy Vite | **Resuelto, aprobado en observación posterior** |
| Estado sin ventas | `0 cargadas · Fin del listado consultado` y mensaje de lista vacía **sin error** | **Aprobado manualmente**. No equivale a «no existen ventas en todas las empresas» |
| Filtro de sedes | Control disponible en captura | **No consta cambio efectivo de filtro manual**; cubierto en Playwright |
| Detalle de venta con importes y pagos reales | Ninguna venta visible localmente para abrir | **No ejecutado manualmente**; validado en PostgreSQL/Playwright efímeros |
| Recuperación local por request_id | No había clave local preexistente | **No ejecutada manualmente**; T09-E automatizada |
| Perdida de respuesta POST local | No se simularon mutaciones sobre TEST Empresa A | **Deliberadamente no ejecutada manualmente**; automatizada con abort de respuesta en CI |
| Móvil y paginación | Sin captura manual móvil/50+ ventas | **No ejecutada manualmente**; cubierta por Playwright REAL y pruebas de API |

Fuentes internas: [T09-D — acta manual y QA](E2-7_T09_D_HISTORIAL_VENTAS_REALES_QA.md), [T09-D — desarrollo y QA histórica](E2-7_T09_D_HISTORIAL_Y_COMPROBANTES_QA.md), [T09-E — recuperación](E2-7_T09_E_RECUPERACION_VENTAS_IDEMPOTENCIA_QA.md). El documento histórico T09-D se reconcilió con la aceptación manual posterior, sin borrar el registro de rondas ni atribuir pruebas automáticas a capturas.

**¿Faltan pruebas manuales obligatorias para el merge de T09?** No identificamos una prueba **mutante** local necesaria: crear ventas en la base del usuario solo para fabricar evidencia introduciría cambios injustificados. Queda **opcional** una verificación **no mutante** de cambiar el filtro, recargar F5 y volver a iniciar sesión, si el responsable desea evidencia adicional. Para comprobantes reales y corte POST, los ensayos aislados automatizados cubren aceptación funcional del alcance T09. Esta valoración no reemplaza un requisito específico del docente si exige capturas de cada escenario.

## 4. Hallazgos de auditoría y correcciones en la rama

| ID | Prioridad | Observación | Estado/tratamiento |
|---|---|---|---|
| T09-F01 | **Media — corregida** | Parser `parseSaleSummaryList` comparaba `Date.parse(created_at)` a milisegundos. PostgreSQL ofrece microsegundos: dos ventas distintas dentro del mismo ms podían considerarse «empate», y se rechazaba un orden válido por comparar UUID | **Corregido**: orden completo en microsegundos y desempate UUID solo cuando los tiempos son realmente idénticos. Test regresivo nuevo sobre tiempos `.123999` vs `.123001`, además de empate exacto |
| T09-F02 | **Baja — corregida** | Encabezado decía «Consultando…» aunque el listado había fallado, observación visible en captura anterior del usuario | **Corregido**: estado `Error al consultar` y recorrido Playwright con `503` inyectado, botón de reintento GET y comprobación de cero POST |
| T09-F03 | **Baja — corregida** | Dos clics rápidos en «Cargar más» podían iniciar peticiones redundantes antes de que el estado React se actualizara | **Corregido**: bloqueo inmediato por ref del controlador de página activa |
| T09-F04 | **Media documental — corregida** | Dos actas T09-D conservaban estados manuales distintos (la anterior todavía decía «pendiente» tras la captura de aceptación) | **Conciliadas**: la acta histórica remite a la nueva y diferencia smoke local de recorridos Playwright |
| T09-F05 | Baja — conocida | Paginación por `offset` puede omitir elementos cuando se insertan ventas entre páginas, incluso si no aparece un ID duplicado; el frontend detecta duplicados visibles pero no garantiza snapshot de lista | **No bloqueante para MVP**: mostrar resultados parciales; planificar cursor estable/snapshot en evolución T11 |
| T09-F06 | Baja — conocida | Roles operativos pueden ver opciones de sedes en selector que no tienen asignadas; elegirlas devuelve listado vacío autorizado | **No se revelan ventas**, filtro efectivo solo backend. Considerar filtrar nombres por sede asignada en una mejora UX |
| T09-F07 | Baja — límite arquitectónico | No existe journal duradero del POST de venta en el frontend; la prueba T09-E conserva clave/cuerpo solo en harness de test | **Reservado explícitamente a T10**: no habilitar POS real hasta registrar intentos durables y reintentos seguros |
| T09-F08 | Baja — evidencia | No se archivaron capturas locales originales en la carpeta T09 del repositorio; las actas citan la captura aportada en conversación | Aceptable para seguimiento; agregar captura sanitizada si una revisión académica independiente la requiere |

**No se encontró un fallo crítico reproducible** de aislamiento por tenant, bypass de roles, reintento duplicador, saldo negativo o alteración indebida de T08. Una auditoría estática + CI no demuestra ausencia absoluta de defectos futuros.

## 5. Integridad del alcance

- No se modificaron los modelos de dominio existentes para añadir una cuenta financiera o confirmar pagos externos. Los pagos son **declarados**, no acreditados.
- No se introdujeron scripts globales ni persistencia de Bearer en `localStorage`. El frontend no escribe ventas; el único POST dentro de los tests de navegador corresponde a fixtures o al harness controlado de T09-E.
- No se modificó `main`. La rama `feature/e2-7-t09-consulta-recuperacion-ventas` y el PR #42 deben seguir abiertos como borrador hasta autorización explícita del responsable.
- Al concluir T09-F, el siguiente bloque T10 debe conservar permisos y contrato P02/P03, y diseñar creación POS REAL con idempotencia persistente antes de habilitar pagos/stock.

## 6. Validación final y dictamen

**PENDIENTE DE COMPLETAR después de CI del último commit funcional de T09-F**: anotar SHA, ejecución integral con PostgreSQL, matriz Python 3.12/3.14, pruebas frontend y navegador REAL/DEMO, conflictos/estados de PR y si existe algún test fallido. Los commits documentales posteriores no cambian código.

**Dictamen provisional:** bloque funcional T09-A a T09-E aprobado; hallazgos T09-F01..04 corregidos; **aún no autorizar merge** hasta comprobar regresión final y aceptación explícita del usuario. No es obligatorio generar ventas manuales en la base local para cerrar T09.
