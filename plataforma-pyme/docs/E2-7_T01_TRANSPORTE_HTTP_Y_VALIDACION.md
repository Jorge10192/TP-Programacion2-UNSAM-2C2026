# E2-7 T01 — Transporte HTTP y proxy de desarrollo

**Estado:** implementación inicial en rama; pendiente de QA final del equipo y merge.  
**Rama:** `feature/e2-7-t01-cliente-http`.  
**Alcance:** `plataforma-pyme/frontend/` y este documento; no cambia el backend ni datos comerciales.  
**Base:** `main` `a6ef120437177600d2222b7652487d6f6f3d5b7d`.

## Objetivo

Preparar el transporte para E2-7 T02 sin activar modos ni conexiones comerciales reales todavía. La UI E1 existente permanece DEMO; **ninguna pantalla usa actualmente el nuevo cliente**.

## Archivos nuevos y modificados

- `frontend/src/api/httpClient.ts`: `createApiClient`, `apiClient`, `ApiHttpError`, `ApiTransportError`; token Bearer **opaco** inyectable, DTO genérico tipado en TypeScript (aún sin validación estructural runtime), cuerpo JSON, `Idempotency-Key`, timeout y cancelación.
- `frontend/tests/http-client.test.mjs`: tests con fetch simulado, sin backend.
- `frontend/package.json`: script `npm run test:api`.
- `frontend/vite.config.ts`: proxy en desarrollo hacia FastAPI para `/api`, `/health`, `/ready`, usando objetivo local por variable `PYME_API_PROXY_TARGET`.

## Desarrollo en Windows

Con la rama de trabajo local correcta y dentro de `plataforma-pyme/frontend`:

```powershell
npm ci
npm run test:api
npm run build
npm run lint
```

Para comprobar transporte real, arrancar FastAPI por separado con su configuración de desarrollo habitual y luego Vite. Por defecto Vite espera `http://127.0.0.1:8000`. Si FastAPI se ejecuta en el puerto publicado por Docker, en la terminal que ejecuta Vite:

```powershell
$env:PYME_API_PROXY_TARGET = "http://127.0.0.1:18000"
npm run dev
```

Abrir `http://localhost:5173/health` y `http://localhost:5173/ready`: deben devolver el mismo resultado que el backend, a través del proxy. **Estas rutas verifican conectividad, no el flujo autenticado**.

Para volver al objetivo por defecto:

```powershell
Remove-Item Env:\PYME_API_PROXY_TARGET -ErrorAction SilentlyContinue
```

No enviar credenciales a una URL remota; el proxy solo acepta localhost o 127.0.0.1. No poner contraseñas ni tokens en variables Vite.

## Contrato de cliente previsto para T02

```ts
import { createApiClient } from './api/httpClient'

const client = createApiClient({
  getAccessToken: () => tokenEnMemoria,
})
// Tras login, T02 inyectará el token opaco mediante el estado de sesión.
const me = await client.request<unknown>('/auth/me')
```

- `request<T>` modela el tipo estático esperado, **no valida automáticamente el esquema remoto**. T02 debe introducir DTOs/validaciones adecuados al endpoint.
- `204`/`205` retornan `undefined`, sin parsear JSON.
- `ApiHttpError` representa código y `detail` de la API; no inventa `error.code` ni expone HTML de proxy.
- `ApiTransportError.reason` distingue `network`, `timeout`, `aborted`, `invalid-response`.
- `outcomeUnknown=true` en fallos de transporte de comandos mutables indica **conservadoramente** que no se puede asegurar que el backend no haya hecho commit. El seguimiento durable de clave+cuerpo se implementará recién en T06.
- **No hay reintentos automáticos** ni persistencia de token. T01 no introduce refresh, modo REAL, sesión autenticada, CORS en backend ni endpoints de negocio nuevos.

## Criterios de aceptación y limitaciones

- [ ] `npm run test:api` aprobado en el entorno del equipo.
- [ ] `npm run build` y `npm run lint` sin fallos.
- [ ] `npm run dev` + backend elegido: `/health` OK a través de Vite.
- [ ] `/ready` refleja disponibilidad real de la base sin inventar éxito.
- [ ] Sin cambio visible ni funcional en pantallas DEMO actuales.
- [ ] Sin escritura a PostgreSQL, ni uso de cuentas reales para comprobar T01.

**T01 no debe declararse cerrada** hasta registrar pruebas en SHA exacto del PR y comprobar proxy en máquina con backend accesible. El siguiente incremento T02 se ocupa de autenticación real, sin reinterpretar el token opaco como JWT.
