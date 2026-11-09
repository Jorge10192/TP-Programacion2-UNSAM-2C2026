# E2-7 T02 — Autenticación REAL, sesión opaca y separación de DEMO

**Estado:** implementación en rama; pendiente de validación local del operador y CI.  
**Rama:** `feature/e2-7-t02-autenticacion-real`.  
**Base:** `main` `136bed6b847bdb3c9aac7ca4132c95b83b8e71cb` (T01 fusionado).  
**Alcance:** exclusivamente frontend y docs en `plataforma-pyme/`; no se modifica backend, Docker, migraciones o negocio.

## 1. Alcance

- Acceso REAL por `/real/login`, `/real/registro` y `/real/perfil`.
- `POST /api/v1/auth/register` crea usuario persistente y **no inicia sesión**.
- `POST /api/v1/auth/login` obtiene un **Bearer opaco**, no JWT. El token solo se conserva en memoria React.
- `GET /api/v1/auth/me` valida el token antes de mostrar el perfil, y permite actualizar la identidad desde servidor.
- `POST /api/v1/auth/logout` invalida sesión remota si FastAPI es accesible; la UI oculta el perfil inmediatamente. Ante fallo de red la UI **no afirma revocación remota**.
- Token y password no se guardan en `localStorage`, `sessionStorage`, URL ni `demoStore`. La recarga F5 implica reautenticación, decisión T00/P05.
- El árbol React REAL no monta las páginas DEMO. Un enlace separado permite acceder al prototipo `/inicio`; el uso de ese enlace es **un cambio explícito de modo**, no un fallback ante un 401 o caída de red.
- Datos REAL aún no incluyen empresas, ubicaciones, catálogo, compras o ventas. Esos módulos permanecen DEMO hasta T03 y posteriores.

## 2. Archivos

```text
frontend/src/App.tsx                     frontera /real/* y enlace desde DEMO
frontend/src/features/auth/authGateway.ts  DTOs, requests y errores seguros
frontend/src/features/auth/RealAuthApp.tsx formularios, perfil, navegación y sesión
frontend/src/features/auth/auth.css        interfaz responsive
frontend/tests/auth-api.test.mjs           tests de contrato HTTP con fetch simulado
frontend/package.json                     npm run test:auth
docs/E2-7_T02_AUTENTICACION_REAL_Y_QA.md   este documento
```

## 3. Ejecutar localmente — Windows PowerShell

Usar la rama T02, sin cambiar de carpeta fuera del repo salvo lo indicado. Como en PowerShell `npm.ps1` está bloqueado, usar **`npm.cmd`**.

Desde `plataforma-pyme/frontend`:

```powershell
git status --short --branch
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "npm ci falló" }
npm.cmd run test:api
if ($LASTEXITCODE -ne 0) { throw "test:api falló" }
npm.cmd run test:auth
if ($LASTEXITCODE -ne 0) { throw "test:auth falló" }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "build falló" }
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw "lint falló" }
```

Si el backend Docker sigue ejecutándose y accesible en el puerto **18000**, en otra terminal:

```powershell
$env:PYME_API_PROXY_TARGET = "http://127.0.0.1:18000"
npm.cmd run dev
```

Vite se abrirá en `http://localhost:5173`. Probar `http://localhost:5173/health` y `http://localhost:5173/ready`. Si son satisfactorios, visitar:

- `http://localhost:5173/real/registro` — crear **un usuario de prueba nuevo**, con email de prueba que puedas controlar y una contraseña de al menos 15 caracteres. No compartir credenciales ni tokens en capturas/logs/chat.
- `http://localhost:5173/real/login` — autenticarse. Debe mostrar `/real/perfil` con el nombre/correo obtenidos de la API.
- Botón **Actualizar desde API** — GET /auth/me debe completar sin error.
- Botón **Cerrar sesión** — volver a login. Visitar manualmente `/real/perfil` sin sesión no debe mostrar identidad protegida.
- Volver a autenticarse y presionar **F5**: debe requerir login otra vez, sin redirigir a datos DEMO. Eso es **comportamiento conocido del MVP**, no un bug a corregir en T02.
- Ingresar una contraseña errónea: debe dar error de credenciales, sin revelar información interna.
- Abrir `http://localhost:5173/inicio` y navegar a Catálogo/Inventario/Ventas DEMO para verificar que el prototipo no sufrió regresión.

**Precauciones:** registrar usuario REAL crea un registro en la DB Docker configurada; no uses emails/contraseñas de personas reales ni la base de trabajo si requerís datos totalmente efímeros. Para pruebas reproducibles y aisladas en CI, configurar base PostgreSQL temporal independiente; la creación de una DB efímera debe dirigirse realmente desde la API (no basta con cambiar `DB_NAME` en PowerShell mientras Docker usa otro valor).

## 4. Matriz mínima de aceptación

| ID | Prueba | Esperado |
|---|---|---|
| T02-01 | Registro nuevo | 201, usuario real; login independiente |
| T02-02 | Login correcto | token opaco + `GET /me`; perfil correcto |
| T02-03 | Login erróneo | 401, error seguro y sin sesión |
| T02-04 | Recargar F5 con sesión en memoria | Solicita reautenticación; no revela identidad |
| T02-05 | Logout | UI limpia; HTTP 204 si API accesible |
| T02-06 | Abrir `/real/perfil` sin token | No aparece información privada |
| T02-07 | Error 401 al actualizar perfil | Limpieza de sesión activa |
| T02-08 | Navegar REAL → DEMO | Cambio explícito; no se mezclan datos |
| T02-09 | Tests + build + lint | Todos sin errores |
| T02-10 | Vista móvil | Formularios legibles, navegación correcta |

## 5. Límites conocidos

1. No hay refresh token ni cookie; al recargar F5 hay que volver a login. Esto es T00/D05 y P05.
2. T02 no conecta empresas reales; esa integración corresponde a T03.
3. La UI de login no permite editar perfil (no hay PATCH general de perfil en el contrato de E2-1).
4. Registro de usuario es una operación real de base de datos; para demos públicas deben agregarse rate limits/medidas antiabuso antes de desplegar el servicio a internet.
5. Tests `node --test` verifican transporte y DTOs, **no** reemplazan navegador + FastAPI + PostgreSQL. No declarar aceptación integral hasta las pruebas de este documento.
6. El frontend de producción requiere configurar publicación de API bajo el mismo origen, reverse proxy o CORS restringido; el proxy actual es solo para Vite desarrollo.

## 6. Regla de cierre

Registrar SHA de la rama, resultados de `test:api`, `test:auth`, `build`, `lint`, pruebas reales navegador + FastAPI y GitHub Actions. No fusionar hasta que se hayan verificado errores de credenciales, logout y F5, además de comprobar no regresión del prototipo DEMO.
