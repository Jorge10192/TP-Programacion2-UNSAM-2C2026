# Asistente PyME

Una cuenta puede gestionar varias empresas de productos, servicios o actividad mixta. Cada empresa conserva sus membresías, ubicaciones, catálogo, proveedores, compras, stock, ventas, gastos y caja. WALOS es un ejemplo de negocio.

## Ejecutar con Docker

Desde `plataforma-pyme/`, con Docker iniciado:

```powershell
Copy-Item .env.example .env
```

Definí una contraseña privada en `POSTGRES_PASSWORD` dentro de `.env`. Después:

```powershell
docker compose --profile api up -d --build
```

Abrí [la aplicación](http://127.0.0.1:18000), creá tu cuenta y luego tu primera empresa. No hay usuario ni contraseña predeterminados. El arranque aplica las migraciones; el volumen de PostgreSQL conserva los datos. `POSTGRES_HOST_PORT` y `API_HOST_PORT` permiten elegir otros puertos.

[Swagger](http://127.0.0.1:18000/docs) - [Liveness](http://127.0.0.1:18000/health) - [Readiness PostgreSQL](http://127.0.0.1:18000/ready).

## Recorrido

Cuenta → empresa → catálogo y ubicaciones según actividad → compra → recepción → stock → apertura de caja → venta → gasto → cierre. Los servicios pueden venderse sin stock ni ubicación física, usando una caja general. Crear empresa no crea depósitos ni existencias ficticias.

Registro/login y creación de empresas conservan los contratos de Jorge. Las operaciones comerciales usan `/api/v1/businesses/{business_id}/...`; el servidor valida membresía y rol. Los comandos requieren `Idempotency-Key`. Las cantidades usan milésimas enteras y el dinero centavos ARS.

Los pagos digitales y las cuentas son referencias declaradas: no ejecutan ni verifican transferencias. Invitaciones, fotos y QR simulados permanecen en el modo DEMO; su integración real está pendiente. Recetas, reservas, conciliación y pagos reales siguen fuera de este corte.

## Desarrollo y verificación

- [Backend](backend/README.md): entorno Python, PostgreSQL, Alembic y pytest.
- [Frontend](frontend/README.md): React conectado o DEMO explícita; sin fallback local ante errores de API.
- [Documentación](entrega-programacion-2/README.md): requisitos, casos de uso, UML, API y comprobaciones.

El contenedor completo usa `Dockerfile` de esta carpeta. `backend/Dockerfile` conserva la API independiente. La aplicación no importa código ni esquemas de las carpetas históricas del repositorio.
