# E2-4 B — API REST real de Proveedores (RF-05)

**Fecha:** 2026-11-08.
**Rama:** \`feature/e2-4b-proveedores-api\`.
**Base:** E2-4 A validado en Windows: \`e24a_suppliers (head)\`, 598/598 pruebas y Docker/API healthy.
**Estado:** Propuesta de código para CI y revisión; sin merge ni validación Windows aún.

## Alcance

Se incorporan cinco rutas HTTP bajo \`/api/v1/businesses/{business_id}/suppliers\`:

| Método | Ruta relativa | Semántica |
|---|---|---|
| GET | \`/suppliers?offset=0&limit=100\` | Listar activos e inactivos, orden estable \`name_key,id\`, límite 1–500, offset entre cero y BIGINT |
| POST | \`/suppliers\` | Crear ACTIVO, con solo nombre obligatorio, sin compra ni stock (201) |
| GET | \`/suppliers/{supplier_id}\` | Detalle tenant-scoped (200) |
| PATCH | \`/suppliers/{supplier_id}\` | Edición parcial de contacto y campos informativos, estado no editable (200) |
| PATCH | \`/suppliers/{supplier_id}/status\` | ACTIVAR/DESACTIVAR; estado repetido idempotente, sin liberación de nombre (200) |

No existe DELETE físico, proveedor global, compras/recepción ni integración React–API. Se preservan los campos del modelo de E2-4 A.

### Seguridad y errores

- Requiere bearer válido; revalida usuario, sesión, empresa y membresía dentro de la transacción.
- Lectura: cualquier miembro ACTIVO con permiso empresarial VIEW, incluso si la empresa está SUSPENDIDA.
- Escrituras: solo TITULAR_ADMINISTRATIVO/ADMINISTRADOR dentro de empresa ACTIVA.
- Errores previstos: **401** sesión/token; **403** rol sin permiso; **404** recurso ajeno/inexistente o membresía inactiva; **409** nombre canónico duplicado o empresa suspendida; **422** payload/campos/paginación inválidos.
- Cada consulta de proveedor incluye \`business_id\`; el ID UUID ajeno no expone datos de otros negocios.
- Repositorios no confirman transacciones. Crear/editar/cambiar estado realiza un único commit, recuperando rollback si un error aparece después de flush.
- El UNIQUE PostgreSQL \`(business_id,name_key)\` protege incluso proveedores INACTIVO. La API normaliza mediante NFKC, espacios colapsados y \`casefold\` y convierte violación SQL de ese índice a HTTP 409.
- \`status\`, \`id\`, \`business_id\`, \`name_key\`, timestamps son atributos protegidos, tanto en POST como en PATCH general.

### Campos y validaciones

- Nombre 2–90 tras normalizar NFKC; se rechaza expansión de clave que exceda 90, controles Unicode, etc.
- Textos y contactos limitados a la longitud del esquema; opcionales mediante cadenas vacías y arreglos vacíos, nunca null en PATCH.
- Email sintáctico, WhatsApp con prefijo internacional, teléfono restringido, Instagram como usuario.
- Sitio web exclusivamente HTTPS de dominio público sin userinfo ni puerto; enlace de Maps solamente a host/ruta reconocidos de Google Maps.
- Hasta siete medios de pago entre EFECTIVO, TRANSFERENCIA, MERCADO_PAGO, CUENTA_DNI, TARJETA, CHEQUE y CUENTA_CORRIENTE, sin duplicados.
- Hasta ocho promociones **informativas**, cada una con ID UUID, días 0–6 sin duplicados, medio opcional y beneficio descriptivo; se reemplaza arreglo completo al editar, sin mutaciones JSONB in-place.
- **No se aplican descuentos ni se reconocen pagos reales**. Ninguna operación en el módulo genera stock, factura, compra o saldo.

La API utiliza **snake_case** para campos como \`contact_person\`, \`payment_methods\`, \`maps_url\` y \`payment_method\`; el futuro gateway React traducirá explícitamente los nombres camelCase y los IDs prefijados de la DEMO, en vez de copiar su almacenamiento local.

### Archivos del corte

- \`backend/app/modules/suppliers/{__init__,schemas,repository,service,router}.py\`.
- \`backend/app/api/v1/router.py\` (montaje de rutas, sin tocar módulos previos).
- \`backend/tests/test_supplier_schemas.py\`.
- \`backend/tests/test_supplier_http.py\`.
- \`backend/tests/test_supplier_api_integration.py\`.
- Este documento.

Se reutiliza \`e24a_suppliers\`. **Sin nuevas migraciones ni modificación del esquema de E2-4 A.**

## Validación

Verificar GitHub Actions (Python 3.12 y 3.14 con PostgreSQL 16, esquema Alembic y Docker). Luego del merge aprobado, en \`plataforma-pyme/backend\`:

~~~powershell
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
~~~

Construir API Docker y consultar \`/ready\`. En E2-4 B se puede probar Swagger para rutas reales con datos de desarrollo ficticios; las altas manuales persisten fuera de los tests. No pegar tokens, contraseñas o datos de terceros en mensajes.

## Diferidos

Compra con proveedor opcional, snapshots históricos, recepción completa idempotente, stock, pagos, frontend integrado, pruebas de carga y carreras simultáneas de alta de nombre con conexiones independientes. También quedan diferidos el filtrado/búsqueda avanzada por contacto y edición granular de promociones. Auditar E2-3 por carril separado.
