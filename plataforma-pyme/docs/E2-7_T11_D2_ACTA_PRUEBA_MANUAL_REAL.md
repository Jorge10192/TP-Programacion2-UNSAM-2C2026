# E2-7 · T11-D2 — Acta de prueba manual guiada REAL

**Fecha:** 11/11/2026 · **Rama:** `feature/e2-7-t11-qa-integral-hardening` · **PR:** #45 DRAFT.

## 1. Alcance, entorno y criterio de evidencia

Prueba manual efectuada por el responsable del TP en Firefox, con asistencia paso a paso y capturas compartidas durante la sesión. **Las capturas se revisaron en la conversación; no se han agregado como archivos al repositorio**. No confundir una captura visual con inspección de red/SQL. Se ejecutaron lectura y preparación de operaciones, sin confirmar ventas, compras nuevas, recepciones, movimientos de stock o ajustes.

- Entorno local Windows/PowerShell; `Vite 8.3.6` en `localhost:5173`, API Docker `127.0.0.1:18000`, PostgreSQL 16 Docker `127.0.0.1:55432`. `/health` respondió `ok` y ambos servicios healthy al terminar actualización.
- Base persistente de desarrollo **TEST Empresa A**; pruebas comerciales de escritura explícitamente bloqueadas. Venta POS REAL sin `VITE_PYME_ENABLE_REAL_SALES=1`.
- Actores: cuenta titular administrativa y cuenta colaborador `miguel` (`TRABAJADOR`). Se inspeccionaron también listas de empresas distintas por actor y pertenencia compartida a TEST Empresa A.
- **Excepción de escritura administrativa:** durante la investigación el usuario **revocó la asignación de Miguel a Sede A TEST 2**. La asignación permaneció como `NO ASIGNADO` en la comprobación posterior. Por tanto, no es correcto decir que *no hubo ningún cambio* en PostgreSQL; sí se evitó confirmar operaciones comerciales y de inventario. No se restableció dicha asignación durante la prueba.
- Resultado de cada paso: **aprobado visualmente**, **defecto confirmado**, o **límite/no probado**. No se afirma ausencia de errores en rutas no recorridas.

## 2. Registro de los 39 pasos

| Paso(s) | Caso ejecutado y evidencia observada | Dictamen |
|---|---|---|
| 1–3 | Docker API/DB healthy; Vite cargó `/real/login`. Firefox ofreció credenciales guardadas por gestor del navegador; no son datos DEMO de React. | APROBADO |
| 4–5 | Login titular recuperó perfil activo desde API; listado propietario: TEST Empresa A, B, T06 Normal/Pendiente; trabajador vio TEST Empresa A y su propia empresa. Membresías distintas. | APROBADO (presentación) |
| 6–8 | Detalle TEST Empresa A ACTIVA/MIXTO/titular; 3 sedes visibles: Sede A TEST y 2 con SELL/STORE, Sede A TEST 3 principal sin SELL; Miguel asignado a Sede A TEST. | APROBADO |
| 9–11 | Catálogo: Producto A TEST $1.500 costo $800; Producto T08-4 CONTEO sin precio; Servicio A TEST $1.000 costo $500. Edición precargada y cancelada sin guardar. | APROBADO (visual) |
| 12 | Proveedor A T07 ACTIVO visible en dueño/trabajador; dueño tiene administración, trabajador solo consulta. Texto `1 proveedores cargados` observado. | APROBADO + TEXTO |
| 13–14 | 4 compras históricas ($2.500, $9.200, $13.500 y $4.000); recepción compra $9.200 CONFIRMADA en Sede A TEST, +5 Producto A TEST, saldo posterior histórico 11, servicio sin movimiento físico. | APROBADO |
| 15–18 | Formulario de compra: cantidad 3 × costo $1.250 = $3.750; editar total $6.000 recalcula unitario $2.000; cerrar y actualizar mantuvo 4 compras sin nueva compra. Texto `1 renglones` observado. | APROBADO + TEXTO |
| 19–20 | Inventario: Producto A TEST 7 (Sede A TEST, versión 5) y 4 (Sede A TEST 2, versión 2); T08-4 CONTEO 6 (versión 3). Historial de 10 movimientos: 7 entradas/3 salidas; suma por sede/artículo concilia los 3 saldos. Servicio ausente de stock. | APROBADO (saldos consultados) |
| 21 | Trazabilidad `TRASLADO` -3 de Producto A TEST, con IDs de movimiento, operación, sede, artículo y responsable; entrada emparejada +3 en destino visible en historial. | APROBADO (presencia de IDs) |
| 22–24 | POS dueño: tres artículos; selector ofrece solo sedes SELL y `Sin sede (solo servicios)`, excluye principal sin venta; Producto A TEST precio $1.500 bloqueado, subtotal 1=$1.500 y 4=$6.000; excepción de precio disponible solo a administrador. | APROBADO |
| 25–28 | Carrito físico 4×$1.500 y servicio 2×$1.000; subtotal $8.000, descuento $1.000, total $7.000; dos pagos declarados $3.000 EFECTIVO + $4.000 TRANSFERENCIA. Revisión final correcta; confirmar venta deshabilitado en entorno local por flag de seguridad. | APROBADO (preparación, NO confirmación) |
| 29 | Historial del dueño: 0 ventas confirmadas y recuperación por `request_id`; la preparación de $7.000 no figura como venta. | APROBADO (visual) |
| 30–32 | **DEFECTO T11-D2-01:** Miguel podía seleccionar Sede A TEST 2 en POS sin asignación activa. Persistió después de revocación administrativa, F5 y re-login; mostraba también Sede A TEST correctamente. | DEFECTO ALTO |
| 33–35 | Miguel puede añadir 1×Producto A TEST al carrito, declarar pago por $1.500, pero no aplicar descuento ni editar precio; mensaje de rol correcto. Quitó artículo y carrito quedó vacío. | APROBADO |
| 36–38 | **DEFECTO T11-D2-02:** traslado STORE ofrecía como origen/destino sedes sin asignación y podía mostrar saldo consultado. No se confirmó. Lectura general de existencias muestra todas las sedes; la política de consulta empresa-entera se conservó. Stock inicial/ajustes: trabajador solo lectura. Cierre de traslado dejó versiones y saldos 7/4/6. | DEFECTO ALTO + lectura definida |
| 39 | Logout de Miguel volvió a `Iniciar sesión real`; el gestor del navegador pudo autocompletar credenciales, sin sesión React activa visible. | APROBADO |

**Limitaciones:** estas verificaciones manuales no prueban F5 de una venta realmente confirmada, API 403 de una venta manual, ingreso móvil exhaustivo, ni política de permisos en todos los módulos. Esos aspectos se apoyan en suites separadas de CI donde corresponda. No se compartieron contraseñas ni se documentan tokens.

## 3. Retrabajo y revalidación manual posterior

Hallazgos T11-D2-01/02 corregidos en T11-E mediante endpoint de asignaciones propias y filtros en React; evidencia técnica en `E2-7_T11_E_FIX_SEDES_ASIGNADAS_QA.md`.

Tras `git pull` al commit `dd8f7b9`, el usuario reconstruyó **solo** la imagen del servicio `api` mediante `docker compose --profile api up -d --no-deps --build api`, conservando PostgreSQL; verificó `/health: ok` y ambos servicios healthy. La primera carga de React actualizado contra FastAPI anterior había mostrado respuestas 422, resueltas tras reconstruir el contenedor.

**Retest de dueño/trabajador:**

1. **POS de Miguel:** el selector ahora ofrece únicamente `Sede A TEST · ventas y stock`; `Sede A TEST 2` ya no aparece. **APROBADO** con captura manual.
2. **Transferencia de Miguel:** origen ofrece únicamente `Sede A TEST`, con una sola sede autorizada aparece mensaje aclaratorio y confirmación deshabilitada; no se envió transferencia. **APROBADO** con captura manual.
3. **Inventario de consulta:** sigue mostrando todas las sedes de la misma empresa. **INTENCIONAL** para el MVP, sujeto a revisar política de lectura en una etapa futura.
4. **Regresión automatizada:** [full-stack #43002093357](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43002093357), 892 Pytest / 32 REAL / 6 DEMO: PASS. Incluye revocación + F5 + re-login y bloqueo de opciones en POS/traslado.

## 4. Acciones de cierre y defectos remanentes

| ID | Severidad | Estado |
|---|---|---|
| T11-D2-01 filtrado de sedes SELL | Alta | CORREGIDO, CI + retest manual PASS |
| T11-D2-02 filtrado de sedes STORE en traslados | Alta | CORREGIDO, CI + retest manual PASS |
| T11-D2-03 lectura empresa-entera de inventario | Decisión de política | Permitida para MVP, no clasificada bug |
| T11-D2-TEXT-01 singular/plural proveedores | Baja | Corregido posteriormente en rama |
| T11-D2-TEXT-02 singular/plural renglones compra | Baja | Corregido posteriormente en rama |
| T11-D2-TEXT-03 referencia T10-E vencida en pantalla checkout | Baja | Corregido posteriormente; mantiene switch seguro por entorno |
| T11-D2-TEXT-04 texto antiguo sobre futuro T10-D en detalle empresa | Baja | Por verificar y corregir si se localiza la vista, no afirmar resuelto |

**Cierre de prueba manual:** **APROBADA CON HALLAZGOS CORREGIDOS** para los recorridos documentados. No representa una aprobación global de T11 ni autorización para merge; requiere auditoría final y aceptación humana explícita.
