# E2-7 T05 — Catálogo REAL, unidades, centavos y paginación

**Estado:** implementación en rama, pendiente de pruebas integradas navegador + PostgreSQL; NO fusionada.  
**Rama:** `feature/e2-7-t05-catalogo-real`.  
**Base:** `main` `e051a8da4c964ddc25fd17783ffd53b57d73d654` (T04 validado y fusionado).

## 1. Alcance y contratos backend

Solo se modifican archivos de `plataforma-pyme/frontend`, el workflow de frontend y este documento. No cambian FastAPI, migraciones, `demoStore`, compras, ventas ni inventario.

| Acción | Endpoint REAL bajo `/api/v1` | Contrato |
|---|---|---|
| Listado paginado | `GET /businesses/{business_id}/catalog?offset=0&limit=100` | `list[CatalogItemView]`, orden por nombre normalizado e ID |
| Página siguiente | `GET .../catalog?offset=100&limit=100` | `offset >= 0`, `1 <= limit <= 500` |
| Detalle | `GET .../catalog/{item_id}` | Ficha del mismo tenant |
| Crear ficha | `POST .../catalog` | Sin idempotency key; 201, alta sin stock |
| Editar ficha | `PATCH .../catalog/{item_id}` | Campos editables, sujeto a historia de compras/stock |
| Activar/desactivar | `PATCH .../catalog/{item_id}/status` | `{ "status": "ACTIVO" | "INACTIVO" }` |

Tipos: `ELABORADO`, `REVENTA`, `INSUMO`, `SERVICIO`. Unidades: `UNIDAD`, `GRAMO`, `KILOGRAMO`, `MILILITRO`, `LITRO`, `PAQUETE`, `CAJA`, `SERVICIO`. La unidad `SERVICIO` se usa exclusivamente para el tipo `SERVICIO`, y viceversa.

`price_cents` y `reference_cost_cents` admiten centavos enteros no negativos o `null` (sin informar). Nunca convertir a enteros mediante multiplicación directa de un decimal floating-point ingresado.

Todos los GET requieren una sesión REAL y pertenencia activa a la empresa; la creación, edición y estado solo quedan habilitados para `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR` en empresa `ACTIVA`. FastAPI vuelve a autorizar cada acción. Por ejemplo un `TRABAJADOR` puede consultar, pero no editar.

## 2. Nuevas rutas y componentes

- `/real/empresas/{uuid}/catalogo`: catálogo REAL, separado del catálogo DEMO.
- `frontend/src/features/catalog/realCatalogGateway.ts`: DTO, validaciones, conversión de centavos, transporte autorizado por tenant y manejo HTTP.
- `frontend/src/features/catalog/RealCatalogPage.tsx`: crear, editar, desactivar/reactivar, filtrar entre páginas cargadas, cargar 100 más.
- `frontend/tests/catalog-real-api.test.mjs`: tests de contrato, dinero, acceso cruzado y errores.
- `frontend/package.json`: `npm run test:catalog-real`.
- `.github/workflows/plataforma-pyme-frontend.yml`: agrega `npm run test:catalog-real` al CI con los tests anteriores.
- `frontend/src/features/businesses/RealBusinessesPage.tsx` y `frontend/src/features/auth/RealAuthApp.tsx`: navegación REAL.
- `frontend/src/features/auth/auth.css`: tarjetas y formularios responsive, sin tocar la DEMO.

## 3. Paginación: no afirmar catálogo completo prematuramente

El backend devuelve hasta 100 por petición predeterminada y **no provee `total`**. Por eso se hace la primera consulta `offset=0&limit=100`. Si devuelve exactamente 100, la vista indica que potencialmente existen más y habilita **Cargar los siguientes 100**.

Al hacer clic se consulta `offset=100&limit=100`, después 200, 300, etc. Solo se presenta la última página como consultada cuando devuelve menos de 100. Si devuelve 100 exactos puede requerirse una llamada adicional vacía para confirmar que no hay más.

La búsqueda por nombre o SKU y el filtro de estado son **locales entre páginas cargadas** y llevan ese alcance explícito en la interfaz. No representan búsquedas globales en la base. Si cambian los datos del catálogo durante la paginación y se detectan IDs repetidos, se detiene la carga y solicita actualizar desde la primera página. Se usa el orden real de backend (nombre normalizado, ID).

Para consultar el catálogo completo, el usuario debe seguir pulsando las siguientes páginas hasta que se complete la secuencia. La integración futura con un buscador en servidor requiere una API nueva o extensión contractual.

## 4. Seguridad de mutaciones y límites

La creación de fichas no tiene idempotency-key ni endpoint para recuperar una petición por request-id. Ante timeout, fallo de red, 5xx o respuesta malformada, el resultado podría ser incierto. La UI muestra una advertencia y bloquea nuevas escrituras hasta **reconsultar el catálogo**; no reintenta automáticamente. T06 tratará comandos durables/reconciliación y sus límites según soporte real del backend.

No se muestran stocks inventados ni cifras de compras/ventas. El `reference_cost_cents` es un dato del artículo, no costo histórico ni stock valorizado. El módulo de inventario REAL se integrará después.

## 5. Comandos de validación PowerShell (desde `plataforma-pyme/frontend`)

```powershell
git pull --ff-only origin feature/e2-7-t05-catalogo-real

npm.cmd run test:api
if ($LASTEXITCODE -ne 0) { throw 'Falló test:api' }
npm.cmd run test:auth
if ($LASTEXITCODE -ne 0) { throw 'Falló test:auth' }
npm.cmd run test:businesses
if ($LASTEXITCODE -ne 0) { throw 'Falló test:businesses' }
npm.cmd run test:operations-real
if ($LASTEXITCODE -ne 0) { throw 'Falló test:operations-real' }
npm.cmd run test:catalog-real
if ($LASTEXITCODE -ne 0) { throw 'Falló test:catalog-real' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Falló build' }
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw 'Falló lint' }
```

Si Docker sigue activo:

```powershell
docker compose --profile api up -d --wait
$env:PYME_API_PROXY_TARGET = 'http://127.0.0.1:18000'
npm.cmd run dev
```

Abrir `http://localhost:5173/real/login` y usar cuentas de prueba. Para un panel REAL, desde `Mis empresas` abrir TEST Empresa A o B y pulsar `Catálogo REAL`.

## 6. QA funcional

| Caso | Operación | Esperado |
|---|---|---|
| T05-01 | Titular de TEST Empresa A abre Catálogo REAL | Lista vacía inicialmente, sin productos DEMO |
| T05-02 | Crear `Producto A TEST` tipo REVENTA/UNIDAD, SKU único, precio `1250,55` | Aparece, con precio entero de 125055 centavos en base |
| T05-03 | Crear `Servicio A TEST` SERVICIO/SERVICIO | Ficha correcta, sin stock ficticio |
| T05-04 | Intentar tipo SERVICIO con UNIDAD (o viceversa) | Formulario impide combinación; backend también la rechazaría |
| T05-05 | Editar rubro, SKU o descripción de Producto A | Persistencia tras actualizar, sin cambio de tenant |
| T05-06 | Desactivar/reactivar Producto A | Estado persistente. El nombre/SKU siguen reservados |
| T05-07 | Crear artículo con nombre/SKU duplicado | HTTP 409, mensaje claro; no duplicar artículo |
| T05-08 | Abrir Catálogo de TEST Empresa B | No muestra fichas de Empresa A |
| T05-09 | Usuario TRABAJADOR de A abre Catálogo A | Lectura permitida, sin botones de creación/edición/estado |
| T05-10 | Usuario TRABAJADOR de A intenta URL del catálogo de B | 404/no disponible, sin mostrar fichas B |
| T05-11 | Catálogo con 101+ fichas (preferir pruebas automatizadas y base temporal) | Primeras 100 + botón `Cargar los siguientes 100`, sin inventar totalidad |
| T05-12 | Nombre/SKU buscado en página todavía no cargada | Mensaje explícito: filtro local, no búsqueda global |
| T05-13 | Corte de red durante POST en entorno aislado | Sin reintento automático; reconsultar antes de nueva escritura |
| T05-14 | DEMO `/inicio` | Sin alteraciones en catálogo, imágenes, precios o existencias locales |

No crear 101 fichas manualmente solo para validar paginación. Para una prueba real masiva utilizar una base temporal, datos sintéticos y backend configurado explícitamente hacia esa DB. El flujo de paginación se verifica además con tests deterministas de gateway.

## 7. Criterios de cierre

No fusionar el PR hasta que se verifique CI (incluido Chromium), `test:catalog-real`, build/lint locales y pruebas reales del catálogo A/B, roles, creación, edición y estados contra PostgreSQL. Mantener el warning Vite de chunk mayor a 500 kB visible y no desactivar reglas de lint.
