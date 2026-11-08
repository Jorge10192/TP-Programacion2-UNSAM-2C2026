# E2-4 A — Proveedores: modelo PostgreSQL y migración

**Fecha:** 2026-11-08. **Estado:** Implementación propuesta en rama feature/e2-4a-proveedores, pendiente de CI y validación Windows.
**Base:** E2-3 E, commit e4ddd394dac9af2875a88dd77b66362b559d6cf6.
**Alcance:** RF-05, soporte de CU-06/07. Solo backend y documentación de este corte, exclusivamente dentro de plataforma-pyme/.

## 1. Decisiones

- Entidad SQLAlchemy **Supplier** y tabla **suppliers**. Empresa nueva = cero proveedores; no se crean compras, ubicaciones, stock ni asientos.
- PK UUID \`id\`, FK \`business_id → businesses.id\` con **RESTRICT** y UNIQUE \`(business_id,id)\` preparada para referencias comerciales compuestas.
- Nombre obligatorio 2–90 caracteres y clave \`name_key\` única por tenant, **incluidas las fichas INACTIVO**. El mismo nombre puede usarse en empresas distintas. La API E2-4 B calculará \`name_key\` con NFKC, espacios colapsados y \`casefold\`, y gestionará colisiones SQL mediante 409/rollback. PostgreSQL protege la clave almacenada; no normaliza por sí solo toda entrada SQL externa.
- Campos de ficha coincidentes con el prototipo DEMO: \`offerings\` (240), \`contact_person\` (100), \`phone\`/ \`whatsapp\` (35), \`email\` (120), \`address\` (160), \`maps_url\`/ \`website\` (2048), \`instagram\` (31), \`notes\` (650). Solo el nombre es obligatorio; el resto se guarda como cadena no nula con valor inicial vacío.
- \`payment_methods\` y \`promotions\` son arreglos JSONB no nulos, con valores predeterminados \`[]\` y CHECK de **tipo arreglo y tamaño máximo** (7 métodos y 8 promociones). Se reemplazarán íntegramente en futuras ediciones, para no omitir cambios profundos en estructuras JSON.
- Las validaciones del contenido de esos arreglos, formato de correo/WhatsApp, seguridad HTTPS, medios permitidos, días de promoción y textos se implementarán en E2-4 B antes de exponer escritura HTTP. **Las promociones son descriptivas; no generan descuentos automáticos.**
- \`status\` = \`ACTIVO/INACTIVO\`, estado inicial ACTIVO. No se incluye borrado físico. \`created_at\` y \`updated_at\` son columnas TIMESTAMPTZ; la actualización automática vía ORM no reemplaza un trigger para SQL directo.
- La futura Compra podrá registrar proveedor **opcional**; incluso una compra sin proveedor debe conservar su propio historial y snapshots. En E2-4 A no existe API para ello.

## 2. Archivos del corte

1. \`backend/app/infrastructure/models/supplier.py\` — modelo, FK, UNIQUE y CHECK.
2. \`backend/app/infrastructure/models/__init__.py\` — registro para metadatos Alembic.
3. \`backend/alembic/versions/20261108_0012_suppliers.py\` — migración aditiva \`e24a_suppliers\` descendiente de \`e23a_catalog\`.
4. \`backend/tests/test_supplier_model.py\` — pruebas estructurales sin PostgreSQL.
5. \`backend/tests/test_supplier_integration.py\` — inserciones SQL reales, restricciones, rollback e independencia de tenants.
6. \`backend/tests/test_postgres_integration.py\` — revisión esperada de Alembic.

No se modifican frontend, rutas HTTP, E2-1/E2-2, modelos previos, migraciones aplicadas, UML 03A/03B/03C ni la hoja de revisión independiente E2-3.

## 3. Validación Windows tras integrar este incremento en main

Con PostgreSQL Docker de desarrollo saludable, desde \`plataforma-pyme/\`:

~~~powershell
git switch main
git pull --ff-only origin main
docker compose ps
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
cd ..
~~~

**Esperado:** \`e24a_suppliers (head)\`, sin operaciones nuevas Alembic y suite completa exitosa. El número de pruebas y el resultado final se registrarán tras ejecutarlos, no se inventan.

La migración NO elimina datos, NO altera las tablas E2-3 y NO crea proveedores ficticios. No ejecutar \`alembic downgrade\` contra datos reales ni \`docker compose down -v\`.

## 4. Pendientes explícitos

E2-4 B: API CRUD/estado, permisos, validación canónica y semántica, contratos HTTP, aislamiento y carreras. E2-4 C/D: compras con snapshots y registro sin recepción. E2-4 E y E2-5: recepción real e idempotente sobre ledger/saldo transaccionales. El frontend continúa en DEMO; este corte no es el MVP completo ni un despliegue productivo.
