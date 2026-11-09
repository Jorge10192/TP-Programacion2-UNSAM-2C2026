# E2-7 T03 — Empresas REAL y aislamiento por tenant

**Estado:** PR de implementación, pendiente de pruebas integradas en la computadora del equipo.  
**Rama:** `feature/e2-7-t03-empresas-reales`.  
**Base:** `main` `0ab1d2e82ea3c0f57aeadc50a9f05cdd4a696797`, T02 fusionado.  
**Alcance:** exclusivamente `plataforma-pyme/frontend` y documentación; no modifica el backend ni migra datos DEMO.

## 1. Contratos comprobados en backend

| Operación REAL | HTTP | Requisito / comportamiento |
|---|---|---|
| Listar negocios propios | `GET /api/v1/businesses` | Bearer opaco; backend incluye solo membresías activas |
| Crear negocio y membresía fundadora | `POST /api/v1/businesses` | Bearer + `Idempotency-Key` UUID4; devuelve 201 o 200 en replay |
| Consultar un negocio | `GET /api/v1/businesses/{business_id}` | Bearer; exige membresía activa; negocio ajeno devuelve 404 |
| Editar perfil empresarial | `PATCH /api/v1/businesses/{business_id}` | Nombre/rubro/actividad; backend aplica rol y estado; 403/404/409 |

DTO real `BusinessView`: `id`, `name`, `category`, `activity_kind`, `status`, `founder_user_id`, `created_at` y `membership` (`id`, `user_id`, `role`, `status`, `job_title`). No inventar campos del DTO DEMO. `category` es un texto libre de rubro de 2–120 caracteres.

## 2. Interfaz nueva

- `/real/perfil`: botón **Mis empresas reales**.
- `/real/empresas`: listado desde PostgreSQL, no fixtures.
- `/real/empresas/nueva`: alta REAL con nombre, rubro, actividad y clave idempotente UUID.
- `/real/empresas/{uuid}`: panel inicial de empresa REAL, membresía y estado, con edición solo para titular/administrador y empresa activa. El backend vuelve a autorizar cada escritura.
- Navegación entre negocios REAL: cada selección cambia la ruta y desmonta el panel anterior; GET se cancela/ignora si llegó tarde, sin reusar datos de A en B.
- `/inicio` y `/b/{id}/...` permanecen DEMO con perfil y fixtures independientes. La navegación REAL → DEMO es explícita.
- **Todavía no hay** métricas de ventas, stock o compras reales en el nuevo panel: no mostrar números DEMO en un negocio REAL.
- Sesión opaca solo en memoria, con re-login después de F5.

## 3. Idempotencia y límites hasta T06

El backend exige `Idempotency-Key` UUID4 por creación. El formulario T03 genera una clave por intento y conserva clave+cuerpo **en la memoria de la sesión React** hasta éxito o resultado definitivo.

Si una mutación termina en error de transporte, 409 o 5xx, se muestra incertidumbre y no se genera una segunda clave automáticamente. Podés consultar `Mis empresas` y, si hace falta, reintentar explícitamente el mismo envío (misma clave y datos). Descartar la clave requiere confirmación humana.

**Limitación importante:** después de F5/cerrar pestaña la intención pendiente aún no sobrevive, porque su registro persistente, acotado por usuario/empresa y con política de retención, corresponde a **T06**. Ante una caída o F5 durante una creación, revisá el listado antes de iniciar otra. No declarar garantía de recuperación durable ni ausencia absoluta de duplicaciones entre recargas.

## 4. Validación local (Windows)

El usuario ya está ubicado en `plataforma-pyme/frontend` y en la rama T03. Ejecutar:

```powershell
git pull --ff-only origin feature/e2-7-t03-empresas-reales

npm.cmd run test:api
if ($LASTEXITCODE -ne 0) { throw "Falló test:api" }
npm.cmd run test:auth
if ($LASTEXITCODE -ne 0) { throw "Falló test:auth" }
npm.cmd run test:businesses
if ($LASTEXITCODE -ne 0) { throw "Falló test:businesses" }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Falló build" }
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw "Falló lint" }
```

La advertencia de tamaño de chunk de Vite puede permanecer: no aumentar el umbral para ocultarla; revisar lazy loading en una etapa separada si hace falta. No se silencian advertencias de React.

Con Docker PostgreSQL/API en buen estado y Vite en la terminal:

```powershell
docker compose --profile api up -d --wait
$env:PYME_API_PROXY_TARGET = "http://127.0.0.1:18000"
npm.cmd run dev
```

Abrir `http://localhost:5173/real/login`, ingresar con el usuario REAL de prueba registrado en T02 y pulsar **Mis empresas reales**.

**Crear empresas es una escritura real** en la base Docker actual. Usar nombres inequívocamente de prueba, no modificar empresas productivas.

## 5. QA funcional mínimo, desde navegador

| Caso | Acción | Esperado |
|---|---|---|
| T03-01 | Login del usuario T02 → Mis empresas | `GET /businesses`; vacía si no tiene membresías |
| T03-02 | Crear empresa TEST-A | 201; empresa visible con rol titular administrativo |
| T03-03 | Crear otra TEST-B | A y B listadas, IDs reales distintos |
| T03-04 | Abrir A, luego B y volver A | Cada panel muestra solo su negocio; no arrastra datos al cambiar |
| T03-05 | Editar nombre o rubro de A | PATCH confirmado; listado y ficha reflejan el cambio |
| T03-06 | Logout y volver a URL de empresa | Exige reautenticación; nunca carga datos de la sesión anterior |
| T03-07 | F5 en un negocio | Re-login explícito; sin fallback a DEMO |
| T03-08 | Usuario REAL de prueba 2 | No puede consultar UUID ajeno; backend devuelve 404 |
| T03-09 | Entrar a `/inicio` | DEMO intacta, sin mezclar perfil, negocios ni artículos |
| T03-10 | Navegación móvil o ancho reducido | Tarjetas/formularios legibles; sin desborde |
| T03-11 | Cortar conectividad durante lectura | Error visible; no relleno con datos DEMO ni acceso cruzado |
| T03-12 | Corte durante POST de creación | Mensaje de resultado incierto y misma clave en reintento mientras esa sesión siga abierta |

**QA reproducible con base temporal:** el backend Docker conecta a su propia configuración. Cambiar `DB_NAME` solo en PowerShell NO cambia la base usada por una API Docker ya iniciada. Para integración aislada, configurar explícitamente el servicio API y la base temporal antes de correr pruebas destructivas.

## 6. Archivos del incremento

```text
frontend/src/features/businesses/businessGateway.ts     DTOs + cliente REAL con controles de tenant
frontend/src/features/businesses/RealBusinessesPage.tsx  listado, selección, creación y edición
frontend/src/features/auth/RealAuthApp.tsx               navegación REAL integrada con sesión
frontend/src/features/auth/auth.css                      estilo responsive de empresas
frontend/tests/business-api.test.mjs                     tests HTTP y pertenencia
frontend/package.json                                   script test:businesses
docs/E2-7_T03_EMPRESAS_REALES_Y_QA.md                    este documento
```

## 7. Cierre

No fusionar sin comprobar `test:api`, `test:auth`, `test:businesses`, build, lint y CI, además de las verificaciones manuales de usuario REAL, dos empresas, edición y cambio de tenant. La política de posibles resultados inciertos y el caso A→B merecen atención especial. T04 incluirá ubicaciones/equipo/invitaciones; no habilitarlos a través de datos DEMO.
