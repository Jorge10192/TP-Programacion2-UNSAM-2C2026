# Asistente PyME - React

Frontend multiempresa de productos, servicios y actividad mixta. La aplicación completa se ejecuta con Docker desde el [README de plataforma](../README.md).

## Desarrollo conectado

Requiere Node 24 y el backend de `plataforma-pyme/backend` iniciado con PostgreSQL.

```powershell
npm ci --ignore-scripts
Copy-Item .env.example .env.local
npm run dev
```

`.env.local` usa `VITE_APP_MODE=api`. `VITE_API_PROXY` apunta a Uvicorn local, por defecto `http://127.0.0.1:8000`. Vite reenvía `/api` al backend; Docker sirve ambos desde el mismo origen. La cuenta se registra desde la interfaz con email y contraseña; no existe usuario predeterminado.

## Modo DEMO

Cambiar explícitamente `VITE_APP_MODE=demo` conserva el prototipo local para pruebas de interfaz. Sus empresas ficticias, invitaciones, imágenes y QR son simulaciones. Un fallo del servidor jamás activa DEMO automáticamente ni guarda una operación comercial en localStorage.

## Datos y navegación

- `AppGateway` adapta los comandos de API y DEMO; el código de las pantallas consume la misma interfaz.
- Una cuenta puede tener varias empresas. Las rutas incluyen su UUID; el selector protege borradores y no comparte contadores ni saldos entre empresas.
- PostgreSQL valida membresías y roles; el rol pertenece a cada membresía, no al usuario global.
- El token vive en memoria/sessionStorage de la pestaña; contraseñas y datos comerciales no se guardan como respaldo local del modo API.
- El runtime descarta respuestas de sesiones anteriores. Una escritura incierta conserva clave y payload hasta comprobación explícita; no se reenvía automáticamente.
- Los pagos digitales son declaraciones. El modo API no simula invitaciones, fotos sincronizadas ni aprobación de QR.

## Comprobación

```powershell
npm run lint
npm test
npm run build
```

[E2E Chromium](e2e/README.md) - [Contrato API y permisos](../entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md). El workflow de frontend ejecuta estos checks; su resultado se verifica después de publicar el commit.
