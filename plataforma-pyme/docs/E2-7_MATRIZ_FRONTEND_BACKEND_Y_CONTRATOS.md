# E2-7 A — Matriz de integración React ↔ FastAPI y brechas funcionales

**Estado:** borrador técnico para evaluación por Astra; **no código implementado**.  
**Base de código consultada:** `main` `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068`, 2026-11-09.  
**Alcance:** `plataforma-pyme/`. Base URL API: `/api/v1`.  
**Reglas:** API es fuente de verdad en modo REAL; frontend E1 DEMO existe y no se conecta mágicamente; requisitos RF-08–RF-10 siguen DEMO/diferidos.  
**Referencias:** [plan rector](E2-7_PLAN_RECTOR_INTEGRACION_Y_CIERRE.md), `backend/app/api/v1/router.py`, routers individuales, `frontend/src/App.tsx`, `src/data/demo/demoStore.ts`.

## 1. Convenciones

- **REAL ALCANZABLE:** existe endpoint; todavía faltan cliente/adaptador/UI.
- **REAL PARCIAL:** API cubre una porción de la pantalla; capacidades no existentes deben ocultarse, quedar en demo separado o producir propuesta contractual.
- **DEMO/DIFERIDO:** sin backend equivalente en RF-01–RF-07; no se envían esas entidades a API.
- **BLOQUEO:** dependencia necesaria para usar la pantalla sin riesgo de doble fuente de verdad.
- `{b}` = `business_id`, `{l}` = `location_id`, `{i}` = item ID, `{p}` = purchase ID, `{s}` = sale ID. Toda ruta privada requiere sesión real y validación server-side.
- Los resultados son evidencia de lectura estática; para validar semántica precisa de filtros/paginación hay que consultar firma de router y OpenAPI al implementar.

## 2. Mapa UI ↔ API

| Pantalla / archivo E1 | Acciones existentes | Endpoint backend real | Brecha/decisión | Orden |
|---|---|---|---|---|
| **Perfil**, `features/profile/ProfilePage.tsx` | Ver/editar datos personales DEMO, avatar/función | `GET /auth/me` (lectura de identidad); `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` (nueva UI) | No hay PATCH de perfil/avatar real; función laboral se gestiona por membresía si está soportado | B1 |
| **Inicio personal**, `features/dashboard/Dashboards.tsx` | Empresas asociadas, navegación | `GET /businesses` | No usar fixtures como negocios reales; vacío y loading auténticos | B1 |
| **Crear empresa**, `features/businesses/BusinessPages.tsx` | Alta DEMO y membresía inicial | `POST /businesses` | Mapeo `kind` UI a `activity_kind`; no enviar descripción que API no acepte | B1 |
| **Datos empresa**, `features/businesses/BusinessDetailsPage.tsx` | Ficha, editar campos, detalles locales | `GET /businesses/{b}`, `PATCH /businesses/{b}` | API solo `name,category,activity_kind`; eslogan/CUIT/avatar/descripción sin persistencia equivalente | B1 |
| **Selector empresa**, `app/shell/TopBar.tsx` | Cambiar tenant y contexto | `GET /businesses`, `GET /businesses/{b}` | Limpiar estado/abort al cambiar; no contaminar negocio B con respuesta A | B1 |
| **Ubicaciones**, `features/locations/LocationsPage.tsx` | Alta, editar, pausar, primaria, mapas | `GET/POST /businesses/{b}/locations`; `GET/PATCH /.../locations/{l}`; `PATCH /.../{l}/status`; `PUT /.../{l}/primary` | Mapa URL existe; fotos locales/demo no remotas | B2 |
| **Equipo**, `features/team/TeamPage.tsx` | Miembros, roles, invitaciones simuladas | `GET/PATCH /businesses/{b}/memberships`; `POST /businesses/{b}/invitations`; `POST /invitations/accept` | No simular aprobación/rechazo de invitación dentro de una empresa en REAL; aceptación nominativa se hace con token/cuenta | B2 |
| **Asignación por sede** | Vista o control de asignaciones UI parcial | `GET /businesses/{b}/locations/{l}/assignments`; `PUT /.../assignments/{membership_id}` | Asociar rol y asignación; fuente de permisos siempre API | B2 |
| **Catálogo**, `features/catalog/CatalogPage.tsx` | CRUD, estado, ficha, filtro, SKU | `GET/POST /businesses/{b}/catalog`; `GET/PATCH /.../catalog/{i}`; `PATCH /.../{i}/status` | `kind` (REVENTA/ELABORADO/INSUMO/SERVICIO) y `item_type` BIEN/SERVICIO no equivalentes; imágenes solo locales | B3 |
| **Ficha catálogo**, `features/catalog/CatalogDetailDialog.tsx` | Detalles y foto | `GET /businesses/{b}/catalog/{i}` | No inventar campos de backend o imagen alojada | B3 |
| **Proveedores**, `features/suppliers/SuppliersPage.tsx` | Fichas, contactos, edición, estado | `GET/POST /businesses/{b}/suppliers`; `GET/PATCH /.../suppliers/{id}`; `PATCH /.../{id}/status` | DTO listas `payment_methods/promotions`, campos y normalización del backend | C1 |
| **Compras**, `features/purchases/PurchasesPage.tsx` | Registrar, listar, detalle y estado | `GET/POST /businesses/{b}/purchases`; `GET /.../purchases/{p}` | Separar compra vs recepción; no calcular stock al crear la compra | C1 |
| **Nueva compra**, `features/purchases/PurchaseForm.tsx` | Ficha, bien/servicio/concepto, precios, cantidades | `POST /businesses/{b}/purchases` | Campos `purchased_on,supplier_id,reference,notes,lines` y `line.unit` CONCEPTO cuando corresponde; idempotencia | C1 |
| **Recepción**, `features/purchases/PurchaseDetailDialog.tsx` | Confirmar lugar de recepción | `POST /businesses/{b}/purchases/{p}/receive`; `GET /.../{p}/receipt` | Ubicación STORE, recepción completa única y replay; no tratarla como compra nueva | C1 |
| **Inventario**, `features/inventory/InventoryPage.tsx` | Saldo por ubicación, ledger, controles | `GET /businesses/{b}/inventory/balances`, `GET /.../inventory/movements` | Saldo API autoridad; no sumar eventos demo para producir stock de REAL | C2 |
| **Traslado**, `features/inventory/InventoryActionForm.tsx` | Trasladar entre dos sedes | `POST /businesses/{b}/inventory/transfers`, `GET /.../transfers/{id}` | Reglas STORE en ambas y stock suficiente, reporte de conflicto; misma clave en replay | C2 |
| **Ajuste / inicial**, `features/inventory/InventoryActionForm.tsx` | Alta stock, ajuste positivo/negativo | `POST /businesses/{b}/inventory/adjustments`, `GET /.../adjustments/{id}` | `kind`, `expected_version`, motivo y STORE; nuevo comando si versión ya cambió | C2 |
| **Conteo múltiple**, `features/inventory/InventoryBatchCount.tsx` | Ajuste multiartículo DEMO | Solo API de ajustes **por artículo**, sin lote atómico equivalente | Adaptar a operaciones individuales con confirmación y riesgo de parcialidad, o mantener DEMO; no prometer lote transaccional | C2 |
| **POS**, `features/sales/SalesPage.tsx` | Venta rápida física/servicio, descuento y pagos | `POST /businesses/{b}/sales`, `GET /.../sales/{s}` | DTO exacto; `Idempotency-Key`; permisos SELL/STORE, campo de cuenta/caja no existe | C3 |
| **Historial ventas**, `features/sales/SalesPage.tsx` | Lista y selección comprobantes | `GET /.../sales/{s}` únicamente | Falta `GET /sales`. Definir listado mínimo paginado o acotar UI a comprobantes conocidos | C3 decisión |
| **QR visual**, `features/sales/QrDemoPanel.tsx` | Crear intención y simular aprobación | **Ningún** contrato QR equivalente en backend | DEMO aislada; no puede disparar stock REAL ni aparentar acreditación | Diferido |
| **Gastos**, `features/cash/ExpensesPage.tsx` | Registrar gastos/medios | **Sin backend RF-08** | Solo DEMO, separación visible y sin agregarlos a cifras reales | Diferido |
| **Jornadas caja**, `features/cash/CashSessionsPage.tsx` | Apertura/arqueo/cierre | **Sin backend RF-08** | No asociar `cashSessionId` a ventas reales | Diferido |
| **Cuentas y medios**, `features/accounts/FinancialAccountsPage.tsx` | CRUD y asociación a pagos | **Sin backend RF-09** | No enviar `financialAccountId` en `POST /sales` ni compras reales | Diferido |
| **Dashboard empresa**, `features/dashboard/Dashboards.tsx` | Conteos, KPI y accesos | `GET /catalog`, `GET /inventory/movements`, `GET /purchases`, etc. | Métricas solo de fuentes realmente consultables; no contar QR/caja demo como ingresos reales | B1/C |

## 3. APIs reales por dominio (inventario leído de routers de main)

**Autenticación (E2-1):**
```text
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout
```

**Empresas y equipo (E2-1):**
```text
POST  /businesses
GET   /businesses
GET   /businesses/{b}
PATCH /businesses/{b}
POST  /businesses/{b}/invitations
GET   /businesses/{b}/memberships
PATCH /businesses/{b}/memberships/{membership_id}
POST  /invitations/accept
```

**Ubicaciones (E2-2):**
```text
GET   /businesses/{b}/locations
GET   /businesses/{b}/locations/{l}
POST  /businesses/{b}/locations
PATCH /businesses/{b}/locations/{l}
PATCH /businesses/{b}/locations/{l}/status
PUT   /businesses/{b}/locations/{l}/primary
GET   /businesses/{b}/locations/{l}/assignments
PUT   /businesses/{b}/locations/{l}/assignments/{membership_id}
```

**Catálogo y proveedores (E2-3/4):**
```text
GET   /businesses/{b}/catalog
GET   /businesses/{b}/catalog/{i}
POST  /businesses/{b}/catalog
PATCH /businesses/{b}/catalog/{i}
PATCH /businesses/{b}/catalog/{i}/status
GET   /businesses/{b}/suppliers
GET   /businesses/{b}/suppliers/{id}
POST  /businesses/{b}/suppliers
PATCH /businesses/{b}/suppliers/{id}
PATCH /businesses/{b}/suppliers/{id}/status
```

**Compras/recepción e inventario (E2-4/5):**
```text
POST /businesses/{b}/purchases
GET  /businesses/{b}/purchases
GET  /businesses/{b}/purchases/{p}
POST /businesses/{b}/purchases/{p}/receive
GET  /businesses/{b}/purchases/{p}/receipt
GET  /businesses/{b}/inventory/balances
GET  /businesses/{b}/inventory/movements
POST /businesses/{b}/inventory/transfers
GET  /businesses/{b}/inventory/transfers/{id}
POST /businesses/{b}/inventory/adjustments
GET  /businesses/{b}/inventory/adjustments/{id}
```

**Ventas (E2-6):**
```text
POST /businesses/{b}/sales
GET  /businesses/{b}/sales/{s}
```

Prefijo obligatorio de rutas: `/api/v1`. No afirmar existencia de un `GET /sales`, `POST /expenses`, `POST /cash` o endpoints de QR.

## 4. DTOs y diferencias críticas de modelo

### 4.1 Identidad, empresa y ubicación

| UI E1 | API real | Regla |
|---|---|---|
| `DemoProfile` con avatar/teléfono | `GET /auth/me` con identidad pública según schema | Datos sin campo API deben mantenerse locales **y etiquetados**, o salir del formulario REAL |
| `DemoBusiness.kind` | `CreateBusinessRequest.activity_kind` `PRODUCTOS/SERVICIOS/MIXTO` | Adaptador explícito, no adivinar enum |
| `DemoBusiness.description/slogan/taxId` | `CreateBusinessRequest`: `name,category,activity_kind` | No enviar campos extra (422); no prometer persistencia |
| Ubicación `LOCAL/FERIA/DEPOSITO/OFICINA/CASA/OTRO` | `LocationKind` admite los mismos valores | Mapear `name,address,map_url,can_sell,can_store`; primaria/status en comandos separados |

### 4.2 Catálogo y compras

| UI E1 | API real | Regla |
|---|---|---|
| Tipos comerciales E1 | `CatalogItemView.kind` con ELABORADO/REVENTA/INSUMO/SERVICIO y `item_type` BIEN/SERVICIO | Tipo físico se deriva de `item_type`; no confundir `kind` comercial |
| Precio ARS formateado | `price_cents`, `unit_price_cents`, `unit_cost_cents` enteros | Nunca enviar `$5.000`, coma decimal o float JSON |
| Ítems de compra con concepto libre | `PurchaseLineInput` permite `catalog_item_id=null` y `unit=CONCEPTO` | No enviar concepto como CatalogItem ficticio |
| Estado compra | API registra compra y recepción separadas | Evitar sumar stock por alta de compra; `POST /receive` único |

### 4.3 Stock y venta

| UI E1 | API real | Regla |
|---|---|---|
| `quantityMilli` | `quantity_milli` positivo y discreto cuando corresponde | 1000 = unidad completa de la unidad del producto |
| Ajuste de conteo DEMO | `AdjustStockRequest` requiere `expected_version`, `reason`, `kind` | No crear ajuste a partir de saldo visual sin relectura versión |
| Venta `SaleInput.financialAccountId` y jornada | `CreateSaleRequest` carece de tales campos | Omitir de API REAL; no declarar caja integrada |
| Venta `locationId` | `location_id` nullable para solo servicio por titular/admin, obligatoria para bienes | Bien requiere SELL+STORE; un servicio no altera stock |
| Pago declarado E1 | `SalePaymentInput` acepta `method,amount_cents,reference` | Se admiten hasta 6; total exacto; no acreditación externa |
| `DemoSale` con stock derivado local | `SaleView` con `balances_after` histórico | Refrescar `inventory/balances` tras confirmar; no duplicar movimiento |
| UI historia ventas | Sin `GET /sales` | Decidir alcance de listado real antes de desarrollar C3 |

## 5. Contrato de estados de UI

| Contexto | Comportamiento requerido |
|---|---|
| Sin sesión | Login/registro, rutas comerciales inaccesibles en modo REAL |
| Token vencido/revocado | Limpiar token en memoria, 401, reautenticar; no borrado de datos DEMO ajenos |
| Usuario sin empresa | Dashboard personal y alta de empresa real |
| Membresía sin acceso | No renderizar recursos de otro tenant; 403/404 sin fuga |
| Empresa pausada | Controles de escritura deshabilitados o responder 409 según API |
| Sin conexión API | Mensaje técnico no destructivo; no caer silenciosamente a DEMO |
| Solicitud pendiente | Spinner/disabled; evitar doble submit |
| Timeout tras POST | Resultado desconocido, conservar key+payload y reintentar idempotente si corresponde |
| Stock insuficiente 409 | Explicar, refrescar balance; no inventar comprobante |
| Versión stock obsoleta | Explicar, releer saldo y solicitar nueva confirmación |
| Cambiar empresa A→B durante fetch | Cancelar/ignorar respuesta A, limpiar caché empresarial |
| Ingresar /b/{id} manualmente | Autorizar realmente contra API antes de mostrar datos |
| Función RF-08–RF-10 | DEMO explícita en contexto independiente; nunca mezclada con cifras REAL |

## 6. Dependencias por tarea y bloqueo de implementación

**B0 (infraestructura) bloquea B1–C3:** cliente HTTP, entorno de URL/proxy, contratos, errores, inyección de token, tests.  
**B1 (auth/tenant) bloquea B2/B3/C1/C2/C3:** no operar datos empresariales sin identidad y tenant reales.  
**B2 + B3 bloquean C1/C2:** ubicación STORE y artículo válido necesarios para recepción/stock.  
**C1 bloquea el caso E2E de ingreso por compra:** recepción produce stock verificable.  
**C2 bloquea C3 para bienes:** POS real debe mostrar disponibilidad autoritativa, sin auto-decremento DEMO.  
**C3 requiere decisión sobre historia:** un comprobante consultable por ID sí existe; historial completo requiere deliberación.

## 7. Brechas cuya resolución debe aprobar Astra + equipo

| Decisión | Alternativas | Recomendación inicial |
|---|---|---|
| Historial ventas | endpoint GET paginado con tenant/RBAC **o** UI limitada a venta recién creada/ID | Preferir endpoint mínimo solo si es requisito de cierre; implementarlo en PR aislado |
| Dos modos | DEMO navegable separado + REAL, o sustituir DEMO por completo | Separar explícitamente, sin migración de datos |
| Rutas | Mantener navegación `pushState` o migrar a router | Mantener mientras no haya bug demostrado; evaluar guardas de sesión |
| Estado remoto | Hooks y repos simples o React Query/Zustand | Iniciar simple, testable y scoped; agregar dependencia si justificada |
| CORS/proxy | Vite proxy local / CORS con allowlist | Proxy local y origen único preferente |
| Imagen | local IndexedDB etiquetada, ocultar en REAL, backend nuevo | Mantener local y etiquetada, evitar endpoint fuera del alcance |
| Cuenta/caja en venta | ocultar en REAL o backend RF-08/09 | Ocultar y dejar DEMO; no ampliar |
| Conteo múltiple | acciones separadas o API batch atómica | No presentar acciones separadas como lote atómico; marcar brecha |
| Invitaciones | solo token real vs flujo simulado | Usar emisión/aceptación nominativa real; quitar simulación REAL |
| Refresh tras F5 | re-login explícito o refresh backend nuevo | Re-login documentado MVP, sin persistir Bearer inseguramente |

## 8. Revisión de compatibilidad con TP académico

- Los documentos `entrega-programacion-2/01..05` todavía contienen estados históricos de RF-05/06/07; actualizar **solo al cerrar E2-7**, distinguiendo intención original y estado integrado.
- UML 03A/03B/03C deben reflejar entidades y relaciones del backend efectivamente integradas; no prometer RF-08–RF-10 como persistencia.
- TP3, RF/CU y arquitectura vigente siguen siendo restricciones del trabajo, no licencia para ampliar módulos arbitrariamente.
- Mercados y pagos: QR del artículo **no es** QR de cobro; `MERCADO_PAGO_DECLARADO` no equivale a webhook ni acreditación real.

## 9. Criterio de uso

Esta matriz es **la entrada de E2-7 A**. Astra debe evaluar si el mapa de rutas, adaptadores y límites es correcto, priorizar las diferencias contractuales y proponer cambios sin editar código. Luego se publica una versión aprobada y se inicia B0. Ninguna operación REAL se habilita por la sola existencia de una página DEMO.
