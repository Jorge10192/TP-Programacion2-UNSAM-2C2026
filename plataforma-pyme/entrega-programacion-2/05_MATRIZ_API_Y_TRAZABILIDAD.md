# 05 - API y trazabilidad

**Versión:** 0.2 - integración sobre E2-1.3C.1 (`b750358`). La matriz conserva los contratos de identidad/empresas de Jorge y añade los contratos comerciales de esta rama.

Contrato de la rama de integración. Prefijo `/api/v1`; Swagger es la referencia ejecutable. Autenticación Bearer opaca y membresía activa por empresa. `GET /health` es público; `GET /ready` devuelve 200/503 según PostgreSQL. Validación local disponible; aprobación del equipo y publicación pendientes.

En la tabla, `B` significa `/api/v1/businesses/{business_id}`.

| RF / CU | Endpoints implementados | Comprobación |
|---|---|---|
| RF-01 / CU-01,02 | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `PUT /profile` bajo el prefijo | Registro Argon2id, sesión revocable de 12 horas, identidad global sin rol comercial global |
| RF-02 / CU-03 | `GET/POST /businesses`, `GET/PATCH /businesses/{business_id}`, `PUT B/membership/job-title` | Empresa + membresía inicial + idempotencia en una transacción; listado sólo de empresas propias |
| RF-03 / CU-04 | `GET/POST B/locations`, `GET/PUT B/locations/{id}`, `PATCH .../status`, `POST .../primary` | Capacidades de venta/almacenamiento independientes; sin ubicación ficticia |
| RF-04 / CU-05 | `GET/POST B/catalog`, `GET/PUT B/catalog/{id}`, `PATCH .../status` | Productos y servicios; SKU único por empresa; tipo/unidad inmutables al editar |
| RF-05 / CU-06,07 | `GET/POST B/purchases`, `GET B/purchases/{id}`, `POST B/purchases/{id}/receive`; CRUD de `B/suppliers` con baja lógica | Registrar no mueve stock ni dinero; recepción completa, única y en una ubicación |
| RF-06 / CU-08,09,11 | `GET B/inventory`, `GET B/inventory/movements`, `POST B/inventory/counts`, `POST B/inventory/transfers` | Saldos no negativos; conteo absoluto con versión; traslado con dos movimientos y un commit |
| RF-07 / CU-10 | `GET/POST B/sales`, `GET B/sales/{id}` | Precios históricos; descuento fijo; pagos exactos; venta y salida de stock atómicas; servicio sin stock |
| RF-08 / CU-13 | `GET/POST B/expenses`, `GET/POST B/cash-sessions`, `POST B/cash-sessions/{id}/close` | Jornada abierta; sólo efectivo modifica arqueo; diferencia requiere motivo |
| RF-09 / CU-14 | `GET/POST B/accounts`, `GET/PUT B/accounts/{id}`, `PATCH .../status`, `POST .../primary` | Referencias bancarias/billeteras por empresa; no acreditaciones reales |
| Lectura React | `GET /api/v1/snapshot` | Lectura completa de empresas autorizadas, roles y recursos; nunca mezcla datos DEMO |

`B/suppliers` admite GET/POST; su detalle admite GET/PUT y `PATCH .../status`. Las colecciones y detalles no incluyen recursos de otra empresa.

## Permisos

| Operación | Titular / Administrador | Encargado | Trabajador |
|---|---|---|---|
| Consultar su empresa | Sí | Sí | Sí |
| Catálogo, proveedores, ubicaciones y cuentas | Sí | Sí | Consulta |
| Compras, recepción, ventas y gastos | Sí | Sí | Sí |
| Conteos, traslados y abrir/cerrar caja | Sí | Sí | Consulta |
| Editar datos empresariales | Sí | Consulta | Consulta |
| Editar perfil y puesto propio | Sí | Sí | Sí |

La política `has_business_permission` de Jorge se aplica a la edición del perfil empresarial. `members.invite` (titular/administrador) y `members.manage` (sólo titular) se conservan como capacidades de diseño: no tienen endpoints todavía. No se asigna un rol comercial global a la cuenta.

Una membresía inactiva o empresa ajena devuelve 404. La lectura informativa empresarial permite conocer el estado SUSPENDIDA; las mutaciones devuelven 409 y el snapshot comercial excluye esas empresas. Roles desconocidos no conceden permisos.

## Reglas del contrato

- Registro: email normalizado, nombre de 2-70 caracteres y contraseña de 15-128. Registrar no inicia sesión.
- Crear empresa: `name`, `category`, `activity_kind`; descripción opcional. Crea titular administrativo inicial, sin ubicación automática.
- Comandos: header `Idempotency-Key` UUID v4. Repetir usuario/empresa/clave/contenido devuelve el mismo resultado; cambiar operación o contenido devuelve `409`. No se reenvía una escritura automáticamente tras un error de red.
- Dinero: enteros en centavos; cantidades: enteros en milésimas, máximo tres decimales. Unidades discretas no admiten fracciones. Cada renglón redondea HALF_UP al centavo. Total de venta positivo; renglón bonificado de cero permitido.
- Toda venta y gasto requiere una jornada abierta del mismo destino. Los servicios admiten destino general sin ubicación física. Sólo efectivo altera el arqueo; comprar no registra el pago al proveedor.
- `401`: sesión inválida; `403`: rol insuficiente; `404`: empresa/recurso ajeno o inexistente; `409`: conflicto de estado, stock, versión o idempotencia; `422`: datos inválidos; `503`: base no disponible en readiness.

CU-12/invitaciones y RF-10/QR real no tienen endpoints en este corte. Ninguna pantalla simulada concede acceso comercial real.

## Persistencia y comprobación

Se conservan las revisiones `e2003_baseline`, `e2101_users`, `e212b_sessions`, `e213a_business_members` y `e213b_business_creation`. La nueva `e226_commerce` añade maestros, saldos, ledger, caja y documentos comerciales; no modifica revisiones aplicadas. La PK compuesta `pk_business_creation_requests` resuelve reintentos concurrentes del alta. Las políticas RBAC son funciones, no tablas.

Pruebas: `test_auth_*`, `test_business_*` (incluidas las nuevas pruebas de PK y permisos de Jorge), `test_commerce_rules.py` y `test_commerce_integration.py`. [06](06_PRUEBAS_Y_DESPLIEGUE.md) reúne los comandos. CI se verifica por SHA después de publicar; configurar workflows no implica ejecución aprobada.

Al cambiar un RF/CU se revisan 01/02/05; al cambiar entidades, 03 y migración; al cambiar autorización/arquitectura, 04/05 y README técnico. Una invitación futura deberá incorporar su propio contrato, prueba y actualización UML.
