# Deploy de WALOS

React y FastAPI en un único servicio Docker; PostgreSQL conserva los datos.

## Render gratuito

1. Usar la rama aprobada del repositorio y el servicio web existente. Mantener **Free**, despliegue manual y una sola instancia; sin tarjeta ni recursos pagos.
2. Dejar **Root Directory** vacío, **Dockerfile Path** `./Dockerfile.walos`, **Docker Build Context** `.` y health check `/health`. El build compila React con `VITE_APP_MODE=api`.
3. Conservar `DATABASE_URL` privada apuntando a PostgreSQL en la misma región. No usar SQLite ni agregar credenciales a Git. Mantener bloqueado el acceso externo a la base.
4. Crear un respaldo antes de desplegar. El arranque aplica Alembic; no reemplazarlo con un comando que omita migraciones. El administrador existente se conserva; en una base nueva se crea una vez con `python -m src.auth.bootstrap admin` desde un entorno autorizado.
5. Tras aprobar el deploy, comprobar `/health`, `/docs` y la app en `/`. Iniciar sesión y recorrer compra → recepción → stock → abrir caja → venta → gasto → cierre. Recargar y reiniciar el servicio deben conservar los registros y saldos.

El servicio web Free se suspende tras 15 minutos sin tráfico. PostgreSQL Free vence a los 30 días y no incluye respaldos automáticos: esta configuración sirve para una entrega temporal. No añadir un medio de pago; al agotar cuotas gratuitas se suspende el servicio o el build. [Límites oficiales](https://render.com/docs/free).

Antes de la entrega, restaurar el respaldo en una base vacía y verificar sus datos. Conservar respaldos manuales fuera del repositorio. Si falla el código nuevo, detener la operación y revisar la compatibilidad antes de volver al despliegue anterior; no revertir migraciones a ciegas.

## Comprobación local

La [app completa](README.md#app-completa-con-docker) se construye desde la raíz. Tests del servidor: `python -m pytest -q` con dependencias de desarrollo instaladas; tests de React: `npm test` en `plataforma-pyme/frontend`.

`render.yaml` configura únicamente el servicio web Free; no crea una base ni activa un plan pago. [Docker en Render](https://render.com/docs/docker).
