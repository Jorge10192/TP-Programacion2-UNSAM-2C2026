# E0-B — Arquitectura del frontend y navegación integrada

**Proyecto:** Plataforma generalista de gestión para PyMEs (multinegocio, multirrubro).  
**Repositorio:** `Jorge10192/TP-Programacion2-UNSAM-2C2026`.  
**Ubicación canónica:** `plataforma-pyme/docs/01_ARQUITECTURA_FRONTEND.md`.  
**Fecha:** 2026-11-06.  
**Estado:** **PROPUESTA TÉCNICA E0-B, documentación elaborada; implementación NO iniciada; revisión del equipo pendiente**.  
**Alcance:** arquitectura de prototipo React + TypeScript, shell, navegación, estado compartido por empresa, contratos internos DEMO/API, estructura de directorios y puerta de entrada a E1. **No** cambiar el TP existente, crear componentes, ejecutar tests ni integrar pagos reales.

> **Regla de trabajo:** esta carpeta coexiste con `Proyecto-3-AppAdmin-Mascotas/` y `Proyecto-3-Extendido-Generico/`. Ambos árboles actuales quedan **intactos**. Trabajamos dentro del mismo repositorio Git y sobre `main` por decisión del equipo; los cambios de cada corte deben limitarse a `plataforma-pyme/` salvo acuerdo explícito.

## 1. Fuentes y criterios de precedencia

1. **E0-A (fuente inmediata):** `docs/00_MATRIZ_INTEGRACION_HTML.md`; 19 rutas HTML, 17 contenidos distintos, candidatos Z001–Z093 y hallazgos Hxx/Dxx. E0-A es una selección estática, no una validación E2E.
2. **Plan de integración v4:** `01_PLAN_RECTOR_Y_SECUENCIA(1).md`, `02_BACKLOG_VERTICAL_Y_PRUEBAS(1).md` y `03_MERCADO_PAGO_QR(1).md`, recibidos como fuentes de planificación.
3. **Auditoría previa:** `Auditoria_PyME_Integracion_2026-11-06(1).zip`, particularmente diagnóstico H01–H26, UX, invariantes, trazabilidad y decisiones D01–D15.
4. **Decisiones de producto multinegocio v3:** persona global, empresas opcionales, WALOS como fixture, permisos por membresía, dashboard y menú integrado.

**Precedencia de conflictos:** decisión explícita de producto v3/v4 → regla provisional documentada en E0-A/E0-B → diseño heredado del HTML → código heredado. Ninguna propuesta de arquitectura se eleva implícitamente a ADR aprobado.

**Hechos del producto ya establecidos:** varios negocios y rubros; usuario personal con cero o más membresías; datos separados por empresa; rol por empresa; bienes y servicios; acceso a funciones por Inicio y menú lateral; caja/depósito opcionales según operación. **Decisiones técnicas aquí propuestas:** Vite/React/TypeScript, rutas concretas, Zustand, puertos de datos y disposición de carpetas.

## 2. Decisión arquitectónica y alternativas

### 2.1 Elección propuesta

- **SPA React + TypeScript + Vite**: un árbol de componentes, sistema de rutas y tipado comunes. Vite simplifica el primer arranque, no impone restricciones al backend académico.
- **React Router** para rutas declarativas, parámetros `businessId`, vistas de acceso y «Próximamente». Una sola definición de navegación alimenta menú y tarjetas.
- **Zustand** (propuesto) para estado de sesión DEMO, borradores y snapshot de datos DEMO por empresa. **Una sola autoridad de estado de negocio**, sin stores separados para M1/M2/M3.
- **Servicios/casos de uso tipados + adaptador de persistencia:** la UI no altera arrays/contadores directamente; emite comandos a un `DemoGateway` y, posteriormente, a un `ApiGateway`.
- **CSS modular + tokens de diseño** (propuesto; CSS Modules o equivalente liviano): conservar los patrones visuales elegidos en E0-A sin copiar hojas de estilo globales incompatibles.
- **Pruebas futuras:** Vitest + Testing Library para unidades/componentes, Playwright para recorridos navegador y viewport. En este corte no se ejecutó ninguna suite.

### 2.2 Alternativas que no adoptamos para E1

| Alternativa | Por qué no |
|---|---|
| Un HTML gigante, `iframe` o 19 scripts heredados unidos | Colisiones de funciones globales, navegación no coherente, `localStorage` aislado por módulo, H08/H09/H15/H17. |
| Tres miniproductos M1/M2/M3 | Duplica catálogo, stock, ventas, menú y permisos; contradice el Inicio y menú empresarial únicos. |
| Backend FastAPI obligatorio antes de mostrar el shell | El plan v4 exige primero prototipo verificable; se diseñan interfaces sustituibles para no descartar el frontend después. |
| Microservicios, Redux/Query/SSE/WebSocket desde el día uno | Coste y complejidad prematuros para un prototipo funcional de un equipo académico. |
| Tratar Zustand, memoria o `localStorage` como seguridad transaccional real | No hay aislamiento de procesos, autorización de servidor ni atomicidad multiusuario. Sólo DEMO. |

**Criterio de revisión en E1-A:** reconsiderar librerías sólo si aparece una limitación reproducible, no por preferencias estéticas.

## 3. Arquitectura lógica

```text
[Navegador / React Router]
    |
    +-- AppShell (barra, selector de empresa, menú izquierdo, tarjetas)
    +-- Vistas / features (Empresa, Catálogo, Inventario, Compras, Ventas...)
    +-- Guards UX (acceso DEMO / empresa activa / rol visual)
    |      |
    |      v
    +-- Hooks de feature y casos de uso tipados
           |
           v
       AppGateway (puerto común de operaciones)
           +-- DemoGateway --> DemoState único --> proyecciones/ledger por business_id
           +-- ApiGateway  --> FastAPI futuro --> PostgreSQL [NO IMPLEMENTADO EN E0-B]
                                      |
                               Mercado Pago por vendedor [FASE POSTERIOR]
```

**Límite esencial:** cambiar de adaptador **no** debe alterar el comportamiento visual ni producir una segunda fuente de saldo. En DEMO las validaciones ayudan a mostrar reglas; en producción el servidor las **repite y hace cumplir**.

### 3.1 Capas

| Capa | Responsabilidad | Prohibiciones |
|---|---|---|
| `app` | Provider, router, layout, configuración, rutas y fallback | No generar stock, saldos ni aceptar pagos. |
| `features` | Pantallas y componentes por capacidad; formularios y mensajes | No leer/escribir `localStorage` ni conocer `fetch` directamente. |
| `domain` | Tipos, reglas puras, transición de estado, validadores, permisos declarativos | No depender de DOM, JSX, React o infraestructura de servidor. |
| `application` | Comandos y consultas, coordinación de operaciones, resultados tipados | No usar `alert()` como único canal de errores ni mutar un módulo aislado. |
| `data/demo` | Fuente única DEMO, fixtures, reloj/IDs y transacciones simuladas | No fingir atomicidad entre dispositivos ni cobro real. |
| `data/api` | Cliente REST futuro, serialización, autenticación, errores | No ser fuente de verdad de stock o caja una vez activa la API. |
| `shared/ui` | Componentes reutilizables, accesibilidad y estilos | No esconder reglas críticas de negocio en componentes visuales. |

## 4. Estructura de carpetas propuesta (no creada todavía)

Todo lo que sigue se ubica en `plataforma-pyme/`. La creación de código corresponde a **E1-A**, no a E0-B.

```text
plataforma-pyme/
├── README.md                        # arranque y alcance DEMO (E1)
├── CHANGELOG.md                     # avances verificables por corte (E1)
├── docs/
│   ├── 00_MATRIZ_INTEGRACION_HTML.md # E0-A, existente
│   ├── 01_ARQUITECTURA_FRONTEND.md   # E0-B, este archivo
│   ├── 02_DECISIONES_Y_BACKLOG.md    # E0-C, próximo
│   ├── QA.md                         # casos/ejecuciones, cuando se creen
│   └── ADR/                          # ADRs versionados E0-C
├── frontend/                         # crear en E1-A con Vite
│   ├── package.json
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── router.tsx
│   │   │   ├── navigation.ts
│   │   │   ├── guards/
│   │   │   └── shell/
│   │   │       ├── AppShell.tsx
│   │   │       ├── SideMenu.tsx
│   │   │       ├── TopBar.tsx
│   │   │       └── BusinessSelector.tsx
│   │   ├── features/
│   │   │   ├── auth-demo/
│   │   │   ├── profile/
│   │   │   ├── businesses/
│   │   │   ├── locations/
│   │   │   ├── team/
│   │   │   ├── accounts/
│   │   │   ├── catalog/
│   │   │   ├── suppliers/
│   │   │   ├── purchases/
│   │   │   ├── inventory/
│   │   │   ├── movements/
│   │   │   ├── sales/
│   │   │   ├── expenses/
│   │   │   ├── cash-sessions/
│   │   │   ├── history/
│   │   │   └── payment-qr-demo/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── money/
│   │   │   ├── quantity/
│   │   │   ├── permissions/
│   │   │   └── rules/
│   │   ├── application/
│   │   │   ├── gateway.ts
│   │   │   ├── commands/
│   │   │   └── queries/
│   │   ├── data/
│   │   │   ├── demo/
│   │   │   │   ├── demoStore.ts
│   │   │   │   ├── demoGateway.ts
│   │   │   │   ├── fixtures.ts
│   │   │   │   └── clockAndIds.ts
│   │   │   └── api/                  # stub/adaptador para E2-E3
│   │   ├── shared/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   ├── errors/
│   │   │   └── hooks/
│   │   └── styles/
│   │       ├── tokens.css
│   │       └── globals.css
│   ├── public/
│   └── tests/
│       ├── unit/
│       └── e2e/
└── backend/                          # SOLO si E2/E3 lo justifican; no crearlo hoy
```

**No duplicar:** `Proyecto-3-Extendido-Generico/backend/` ya existe como trabajo local ajeno a este corte en el equipo; se analizará su relación con el backend futuro **antes** de copiar, conectar, sustituir o mover archivos. Tampoco se modifica `Proyecto-3-AppAdmin-Mascotas/`. No abrir ni fusionar historias Git ajenas por efecto de este documento.

## 5. Un único mapa de navegación

El registro `navigation.ts` será fuente de verdad de **id, título, ícono, ruta, grupo, requisito de empresa, permiso visible y estado (ACTIVA / PROXIMAMENTE)**. El menú y las tarjetas de Inicio usan el mismo registro; ningún botón tiene una ruta oculta o inerte.

### 5.1 Rutas públicas y personales

| Ruta | Vista | Condición | Estado inicial E1 |
|---|---|---|---|
| `/acceso` | Identificación e ingreso **DEMO** | Sin sesión demo | E1-A |
| `/inicio` | Inicio personal sin empresa + selector | Usuario DEMO | E1-A |
| `/perfil` | Perfil personal global | Usuario DEMO | E1-A |
| `/empresas/nueva` | Crear empresa | Usuario DEMO | E1-A |
| `/invitacion/:token` | Invitación nominada / enlace de solicitud (flujos diferenciados) | Según token DEMO | E1-B / placeholder hasta implementar |
| `/` | Redirect controlado | Sesión + elección de empresa | E1-A |
| `*` | No encontrado con regreso visible | Todos | E1-A |

### 5.2 Rutas empresariales propuestas

Todas usan prefijo `/b/:businessId`; la ruta jamás concede acceso por sí misma.

| Ruta bajo `/b/:businessId` | Título de menú / vista | Pantalla principal de E0-A | Corte |
|---|---|---|---|
| `/inicio` | Inicio del negocio | Z003 + Z014 | E1-A |
| `/empresa` | Datos de la Empresa | Z001 | E1-B |
| `/ubicaciones` | Ubicaciones | Z004 | E1-B |
| `/equipo` | Equipo de trabajo | Z002 + Z014 | E1-B |
| `/cuentas` | Cuentas y medios | Z042 | E1-B |
| `/catalogo` | Catálogo | Z069 + Z050 | E1-B |
| `/catalogo/nuevo` | Nuevo artículo/servicio | Z069 | E1-B |
| `/catalogo/:itemId` | Ficha artículo/servicio | Z069 | E1-B |
| `/proveedores` | Proveedores | Z073 | E1-B |
| `/compras` | Compras | Z070 + Z050 | E1-B |
| `/inventario` | Inventario | Z050 + Z072 | E1-B |
| `/inventario/conteo` | Conteo de stock | Z072 | E1-B (después de movimientos) |
| `/movimientos` | Movimientos | Z050 | E1-B |
| `/ventas` | Ventas | Z074 diseño + Z075 comportamiento | E1-C |
| `/ventas/nueva` | Cargar venta | Z074 + Z075 | E1-C |
| `/ventas/:saleId` | Detalle de venta | Z075 | E1-C |
| `/gastos` | Gastos | Z070 + Z075 | E1-C |
| `/jornadas` | Apertura/Cierre | Z092/Z093/Z075 | E1-C |
| `/jornadas/:sessionId` | Jornada activa | Z075 + Z093 | E1-C |
| `/jornadas/:sessionId/cierre` | Arqueo y revisión | Z093 visual + Z092 | E1-C |
| `/jornadas/:sessionId/informe` | Snapshot histórico | Z075 + Z092 | E1-C |
| `/historial` | Historial unificado | Z075 + Z050 | E1-C |
| `/guias` | Guías de apoyo | Z071 | «Próximamente» |
| `/pedidos` | Pedidos/Reservas | Referencias parciales Z075 | «Próximamente» |
| `/analisis` | Análisis del negocio | Sin pantalla completa | «Próximamente» |

**Regla UX:** las rutas hijas de creación, detalle y cierre pueden quedar fuera del menú principal, pero son alcanzables desde su pantalla padre. `QR DEMO` es un diálogo/flujo del checkout y **no** una pestaña separada del menú. QR de ficha de catálogo es un flujo distinto, aplazado.

### 5.3 Shell y comportamiento responsive

- **Escritorio:** barra superior con empresa activa, menú lateral izquierdo colapsable, contenido principal, perfil/acceso.
- **Móvil:** menú drawer accesible desde el borde izquierdo; contenido en una columna, tablas que se transforman en tarjetas o permiten desplazamiento horizontal anunciado, no botones inaccesibles.
- **Inicio:** tarjetas por capacidad, no por «M1/M2/M3»; muestran estado «Próximamente» o navegan a ruta real.
- **Sin empresas:** Inicio personal permite crear empresa e incorporarse por invitación; sin pantalla vacía simulando que WALOS pertenece a todo usuario.
- **Permisos:** acciones visibles/deshabilitadas u ocultas según regla UX, pero todo resultado DEMO se etiqueta como tal y el backend futuro repite la validación. Mensaje explicativo cuando el rol no autoriza.
- **Accesibilidad mínima E1:** foco visible, etiquetas en inputs, teclado en drawer/modal, errores asociados al campo, confirmaciones distinguibles de éxito simulado.

## 6. Estado global, empresa activa y aislamiento de datos

### 6.1 Separar cuatro ámbitos (sin duplicación)

| Ámbito | Contenido | Clave de identidad | Conservación |
|---|---|---|---|
| **Identidad personal DEMO** | `activeUserId`, User, preferencias globales, lista de membresías disponibles | `user_id` | Sesión demo; no contiene contraseña ni tokens. |
| **Contexto empresarial** | `activeBusinessId`, `activeMembershipId`, rol efectivo, ubicación/caja opcional | `business_id` | Se resuelve al entrar a cada ruta. |
| **Datos empresariales** | Empresa, equipo, ubicaciones, catálogo, movimientos, compras, ventas, caja, cuentas, gastos y auditoría demo | `business_id` **obligatorio** | Un único `byBusinessId` con repositorio de operaciones; ningún slice paralelo M1/M2/M3. |
| **UI / borradores** | Filtros, modal abierto, formulario, carrito, conteo de cierre | `user_id + business_id + feature (+ location_id)` | Se destruyen o rehidratan solamente para la misma empresa al cambiar contexto. |

Forma conceptual del estado (NO implementación):

```ts
type DemoState = {
  usersById: Record<UserId, User>;
  membershipsById: Record<MembershipId, Membership>;
  session: { activeUserId: UserId | null; activeBusinessId: BusinessId | null };
  businessesById: Record<BusinessId, BusinessData>;
  draftsByScopedKey: Record<string, Draft>;
  processedCommandsByBusiness: Record<BusinessId, Record<string, CommandResult>>;
};

type BusinessData = {
  business: Business;
  locations: Record<string, Location>;
  catalog: Record<string, CatalogItem>;
  suppliers: Record<string, Supplier>;
  purchases: Record<string, Purchase>;
  receipts: Record<string, Receipt>;
  stockMovements: StockMovement[];  // fuente de verdad de saldos
  sales: Record<string, Sale>;
  paymentApplications: PaymentApplication[];
  cashSessions: Record<string, CashSession>;
  closureSnapshots: Record<string, ClosureSnapshot>;
  accounts: Record<string, FinancialAccount>;
  expenses: Record<string, Expense>;
  auditEvents: AuditEvent[];
};
```

Los `Record` son una propuesta de shape para DEMO, no entidades SQL ni contratos OpenAPI congelados. IDs arbitrarios del navegador no conceden acceso. Cada entidad empresarial que lo requiera incluirá explícitamente `businessId` (o estará inequívocamente contenida en un agregado validado), y cada comando comprobará coincidencia entre contexto, agregados referidos y pertenencia.

### 6.2 Cambio A → B: algoritmo visible y precondiciones

1. Usuario elige negocio B desde selector; verificar membresía DEMO habilitada para B.
2. Cerrar diálogos, cancelar consultas dependientes de A, desasociar selección de ubicación/caja de A y desactivar datos de A en pantalla.
3. Guardar o descartar borradores de A según política visible y específica; **nunca** trasladar carrito ni totales a B.
4. Actualizar `activeBusinessId`, resolver rol/membresía B y navegar a `/b/B/inicio`.
5. Consultar solamente `businessesById[B]`; mostrar vacío si no hay datos, aunque A tenga registros.
6. Si usuario escribe directamente URL `/b/A/catalogo` sin permiso, mostrar acceso denegado o no encontrado **sin filtrar atributos de A**.
7. Probar además usuario que pertenece a A y B con roles distintos; cambiar rol efectivo al cambiar empresa.

**Caso límite:** una pestaña o refresco no puede reclamar que existe seguridad multiusuario; la protección de datos es **simulación UX**. El backend real exigirá contexto autorizado por cada recurso y operación.

### 6.3 Persistencia DEMO

- **Primera etapa:** almacenar estado DEMO **en memoria** (Zustand) y fixtures determinísticos; mostrar «Los datos de prueba se reinician al recargar» si ese es el comportamiento elegido para E1-A.
- **Extensión opcional, si hace falta conservar demos:** introducir un `DemoPersistenceAdapter` versionado, validación de esquema, exportación/importación de fixtures y claves con ámbito de usuario/empresa. `localStorage` sería sólo un detalle de infraestructura **no seguro**, jamás la fuente jurídica/financiera ni un medio de login real.
- No copiar `walos_demo_m1_v12`, `walos_demo_mod2_v5` ni claves M3 del legado. No almacenar contraseñas, OAuth, tokens o cobros reales en frontend.
- No afirmar sincronización entre navegadores/dispositivos: con API futura, la fuente de verdad será servidor PostgreSQL.

## 7. Contrato interno de operaciones (puertos DEMO/API)

La UI consume operaciones a través de un puerto común. Especificaciones conceptuales, **no archivos .ts ya creados**:

```ts
type BusinessContext = {
  actorUserId: UserId;
  businessId: BusinessId;
  locationId?: LocationId;
  commandId: string;       // idempotencia de operación demo/API
};

type Result<T> =
  | { ok: true; data: T; revision?: number }
  | { ok: false; error: {
      code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION" |
            "CONFLICT" | "INSUFFICIENT_STOCK" |
            "INVALID_PAYMENT_TOTAL" | "CLOSED_SESSION";
      message: string;
      fieldErrors?: Record<string, string>;
    } };

// El gateway admite consultas scoped y comandos de negocio.
// Métodos previstos (firmas definitivas en E1, contratos REST recién E2):
// listBusinesses(actorUserId)
// createBusiness(ctx, input)
// updateBusiness(ctx, input)
// createCatalogItem(ctx, input)
// registerPurchase(ctx, input)
// receivePurchase(ctx, purchaseId, lines)
// transferStock(ctx, fromLocationId, toLocationId, lines)
// reconcileStockCount(ctx, input)
// createSale(ctx, lines, discount, payments)
// recordExpense(ctx, input)
// openCashSession(ctx, input)
// closeCashSession(ctx, sessionId, countedCash, reason)
// createQrDemoIntent(ctx, saleId)
```

**Reglas de implementación propuestas:**

- Un comando conoce `businessId`, actor y `commandId`; acciones idempotentes consultan registro por contexto, y repetición con misma clave y distinto payload devuelve `CONFLICT`.
- Los errores son tipados, se muestran con acciones útiles; no se reporta «Guardado» cuando falló una validación.
- Cada comando lógico toma **una** instantánea DEMO, valida todas las precondiciones y confirma **todo o nada en el mismo store**. Esto simula consistencia de una pestaña, **no** transacciones concurrentes entre dispositivos.
- Todas las lecturas (dashboard, historial, stock, caja) derivan del mismo estado; no mantienen copias reescribibles de saldos en cada pantalla.
- `ApiGateway` conservará semántica y tipos de dominio; backend verificará permisos, dinero, stock, versión y transacción. Las rutas REST se definirán en E2, no aquí.

## 8. Invariantes de negocio para reconstruir en E1

### 8.1 Persona, empresa y permisos (H01/H02/H12/H14)

- `User` global existe con cero empresas; `Business` pertenece a contexto de `Membership`, no a un singleton.
- Fundador es un dato **histórico**; titular administrativo inicial es único y activo; no inferir propietario legal ni permitir cero responsables. Su política final exige ADR E0-C.
- Matriz mínima de roles propuesta: `TITULAR_ADMIN`, `ADMINISTRADOR`, `ENCARGADO`, `COLABORADOR`. No hay permiso implícito por renderizar un botón.
- Invitación por email dirigida a persona y enlace/QR para **solicitar acceso** son máquinas distintas; solicitud no crea membresía automáticamente.
- `Location` distingue `vende`, `almacena` y otros atributos; ubicación de almacenamiento **no** es obligatoria en servicios.
- Toda acción que requiera negocio valida contexto y pertenencia antes de leer o modificar.

### 8.2 Catálogo y medidas (H07/H16/H22/H26)

- `CatalogItem` = `GOOD` o `SERVICE`. Reventa, insumo y elaborado son capacidades de bien, no rubros globales; WALOS vive en fixtures.
- SKU único dentro de negocio (homónimos y generación de SKU pendientes de ADR); un servicio no tiene `StockBalance` ni depósito.
- Precios en **centavos enteros** para ARS y unidad monetaria definida por negocio; no usar `number` flotante para suma monetaria.
- Cantidades admiten escalas por unidad. **No** usar `parseInt` ni truncar 1,5 kg a 1; parsear texto de forma estricta y normalizar a unidades menores enteras o representación decimal exacta según política de unidad (ADR E0-C).
- Precio «a cotizar» no equivale a $0. Comandos rechazan formatos inválidos y explican el campo.

### 8.3 Compras, recepciones, stock y traslados (H09/H18/H19/H25)

- Registrar compra **no** recibe automáticamente ni paga. `Purchase`, `Receipt` y `Expense/Payment` son hechos separados.
- Recepción de 10 crea un único registro de recepción y movimientos de +10 una vez, con clave de idempotencia; un segundo clic no duplica.
- Todo saldo de stock se obtiene de `StockMovement` (o de una proyección reproducible, nunca de una variable editable en paralelo).
- Traslado de 3 de origen 10 hacia destino 0 confirma salida -3 y entrada +3 en **una** operación: 7/3. Rechazar 11 sin movimiento parcial; no negativos.
- Conteo de inventario registra diferencia y ajuste con motivo; no pisa venta nueva. Fecha de operación se obtiene del reloj, no literal heredado.
- Retorno de feria requiere movimiento explícito, no se genera al cerrar caja; la diferencia esperada/recibida queda pendiente o documentada, **nunca desaparece** (H25).
- Versionado DEMO y locks simulados sirven para UX; el backend deberá probar concurrencia real en PostgreSQL.

### 8.4 Ventas, pagos, gastos y cierre (H06/H09/H10/H13)

- La venta puede incluir bienes (con ubicación de stock válida) y servicios (sin stock); descuento aplicado antes de fijar importe final.
- Aplicaciones de pago de 1..n medios; **suma exacta** de centavos igual al total. No cerrar si excede o falta dinero, salvo modalidad pendiente/crédito aprobada posteriormente.
- Venta confirmada provoca salida de stock **una sola vez**; no crear otra salida al imprimir o reabrir ticket. Deshabilitar acciones concurrentes duplicadas con idempotencia.
- «Pago declarado» significa registrado en la venta, **no** acreditación verificada por banco/MP.
- Gasto operativo pagado identifica cuenta o fondo de origen; compras, gastos fijos programados y pagos efectivos son hechos distintos.
- `CashSession` (cuando aplique) pertenece a empresa, ubicación y caja; efectivo de jornada no es saldo global de CVU/CBU/MP compartida.
- Cierre contado por defecto: reunir movimientos hasta corte, arqueo, diferencias, actor, fecha, motivo y snapshot **inmutable** antes de marcar cerrado. Reintento no crea segundo cierre ni reabre jornada.
- Cierre «sin verificar» queda **DESHABILITADO** hasta decisión explícita. No portar el `commitFinalClosure` de Z093.
- Historial correlaciona venta, pago, movimientos, gasto y cierre por IDs; no combina tres logs locales divergentes.

### 8.5 Mercado Pago: QR ficha ≠ QR de cobro

- **QR de artículo:** acceso a ficha/añadir a venta, funcionalidad futura.
- **QR de cobro:** se inicia desde checkout, asociado a una venta y a la cuenta vendedora de **esa empresa**.
- **En E1:** sólo mock de cobro **DEMO**, mostrando importe, empresa, estado `PENDIENTE/SIMULADO_APROBADO/CANCELADO`, sin transferir dinero. No afirmar pago confirmado por un botón «Ya pagué».
- **En backend posterior:** `BusinessPaymentConnection` por vendedor con OAuth; sucursal/POS por seller; Orders API con idempotencia; webhook firmado, consulta al proveedor, reconciliación, reservas temporales de stock y pagos tardíos. El token nunca va a frontend ni repositorio. La compatibilidad con modalidades y cuenta integradora se verificará antes de implementar MP real.
- Intento de QR y `PaymentApplication` son entidades distintas. Crear QR no reduce stock definitivo ni acredita cobro. Estado pendiente no suma a caja como pagado.

## 9. Inventario de componentes reutilizables: de HTML a React (sin copiar JS heredado)

| Feature/componente futuro | Fuente E0-A | Reutilizar | Rediseñar/descartar |
|---|---|---|---|
| `AppShell` y `BusinessDashboard` | Z003/Z014 | Panel, tarjetas, estilo, drawer | Menús M1/M2/M3 y WALOS global. |
| `BusinessForm` | Z001, Z014 | Campos, jerarquía, imagen | Identidad personal mezclada con empresa, singleton. |
| `LocationsList` y `LocationForm` | Z004 | Alta, edición, pausa, principal | Depósito obligatorio; permisos sólo visuales. |
| `TeamList`, `MemberSheet`, `InviteFlow` | Z002/Z014 | Ficha, revisión y solicitudes | Fusión de invitación nominada con solicitud abierta. |
| `AccountsList` | Z042 | Alias/CBU/CVU informativos | QR de datos como cobro acreditado. |
| `CatalogList` y `CatalogForm` | Z069/Z050 | Galería, tipos, edición y estados | Catálogo canino global y stock de servicios. |
| `SuppliersList` | Z073 | Ficha rica y alta contextual | Proveedor ficticio obligatorio. |
| `PurchasesList`, `ReceivePurchase` | Z070/Z050 | Líneas, borrador, recibir | Compra=recepción=pago. |
| `InventoryList`, `StockCountWizard` | Z050/Z072 | Filtros, revisión, diferencias | Ledger propio M2 y bloqueo falso de concurrencia. |
| `TransferStockForm` | Z050 | Origen/destino y resumen | Salidas parciales y retorno con pérdida H25. |
| `PosCheckout` y `PaymentSplit` | Z074/Z075 | POS dos pasos y pagos divididos | Medio único visual, precio float y stock local de M3. |
| `ExpenseForm` | Z070/Z075 | Formulario y clasificación | Sumar egreso no asociado a fondo. |
| `CashClosureWizard` | Z093/Z092/Z075 | Checklist, arqueo, diferencias, reporte | Descartar `commitFinalClosure` y cierre sin evidencia. |
| `BusinessHistory` | Z075/Z050 | Historial y filtros | Logs fragmentados sin correlación. |
| `QrPaymentDemo` | Z074 + plan MP v4 | Espera, estados y visual | QR real/OAuth/pago simulado como confirmado. |
| `GuidesEditor` (posterior) | Z071 | Pasos y borradores | Editor M2 simplificado que pierde estructura. |

## 10. Fixtures y escenarios de verificación

**Fixtures mínimos, inventados como datos sintéticos de DEMO:**

1. **WALOS:** empresa ejemplo con bienes elaborados, stock por ubicaciones y caja. Nunca marca/rubro por defecto para otras empresas.
2. **Comercio de reventa:** artículos físicos, proveedor, recepción y traslados.
3. **Empresa de servicios:** servicios sin depósito, sin lote y sin caja física obligatoria.
4. **Dos empresas A/B y un mismo usuario:** permisos diferentes para verificar scoping; otro usuario sin membresía de A para probar acceso denegado.

**Guion de prueba de E1 integrado (todavía NO ejecutado):**

1. Usuario sin empresas entra a `/inicio`, crea una empresa, queda con responsable inicial único.
2. Crea bien A (SKU) y un servicio; dos ubicaciones y un proveedor.
3. Registra compra, recibe 10 una sola vez; doble clic no duplica; saldo 10.
4. Traslada 3 → saldos origen 7, destino 3; intentar mover 11 → error y saldos intactos.
5. Abre jornada donde corresponde; vende 2 bienes desde destino + un servicio con descuento y dos pagos exactos → saldo destino 1.
6. Registra un gasto desde fondo explícito; el dinero de cuenta digital compartida no se confunde con efectivo de jornada.
7. Arquea y cierra; consulta snapshot e historial, actor y diferencias; no se permite reabrir mediante clic repetido.
8. Cambia de A a B → ningún listado, borrador, permiso ni cifra de A visible en B.
9. En negocio de servicios sin local completa venta sin pedir depósito; entra a QR demo y verifica pendiente ≠ cobro real.
10. Prueba pantallas en desktop y móvil, menú, foco, validaciones y «Próximamente».

### 10.1 Mínimos de pruebas a implementar por corte

| ID | Prueba | Tipo futuro | Aceptación |
|---|---|---|---|
| `DEMO-TEN-01` | Empresa A→B y URL directa a A sin membresía | Unit + E2E | Sin fugas de datos, roles ni borradores. |
| `DEMO-NAV-01` | Menú/tarjetas comparten rutas | Component + E2E | Ningún botón operativo inerte. |
| `DEMO-CAT-01` | Servicio sin stock/depósito | Unit + E2E | Alta/venta independientes de ubicación física. |
| `DEMO-STK-01` | Recibir 10 dos veces | Unit | Se aplica una sola entrada. |
| `DEMO-STK-02` | Trasladar 3 de 10 y rechazar 11 | Unit | 7/3 y rechazo atómico. |
| `DEMO-MON-01` | Descuento + pagos mixtos | Unit | Concilia al centavo; formato inválido rechazado. |
| `DEMO-JOR-01` | Cierre, snapshot y reintento | Unit + E2E | Snapshot inmutable con conteo, actor y diferencias. |
| `DEMO-MP-01` | QR pendiente/cancelado/aprobado simulado | Component | Etiqueta DEMO y sin acreditación real. |
| `DEMO-UX-01` | Desktop/móvil/teclado | E2E | Navegación accesible, errores legibles. |

**Correspondencia con backend futuro:** QA-TEN-01/02, QA-STK-01/02/03, QA-MON-01, QA-JOR-01/02, QA-MP-01/02/03 del backlog v4 son **especificaciones**, no ejecuciones. La concurrencia de dos ventas, OAuth y webhooks sólo se verifican cuando exista backend y entorno apropiado. **TP3 exige ≥10 tests unitarios reales**; los casos DEMO listados no reemplazan esa exigencia.

## 11. Cortes de implementación aprobables tras E0-C

| Orden | Corte | Entrega concreta en E1 | Puerta de salida observable |
|---|---|---|---|
| 1 | **E1-A1 / DEMO-01** | Vite/React TS, shell, menú, router, Inicio, placeholders y responsive | Cada tarjeta navega a pantalla o «Próximamente»; `npm run dev` funciona. |
| 2 | **E1-A2 / DEMO-02** | Usuario/demo, perfil, empresa nueva, selector y scoping + pruebas | A→B no mezcla datos ni borradores; usuario sin empresa válido. |
| 3 | **E1-B1 / DEMO-03** | Empresa, ubicaciones opcionales, equipo, cuentas; permisos DEMO | Empresa de servicios sin depósito y miembros con permisos distintos. |
| 4 | **E1-B2 / DEMO-04** | Catálogo (bien/servicio), proveedores, compra/recepción | Registro 10 unidades una sola vez; SKU único por empresa. |
| 5 | **E1-B3 / DEMO-05** | Inventario, movimientos, conteo y ledger | Traslado 3 deja 7/3; no permite sobretraslado. |
| 6 | **E1-C1 / DEMO-06** | Ventas, descuentos, múltiples pagos y gastos | Cobros exactos, stock impactado una vez y fondos explícitos. |
| 7 | **E1-C2 / DEMO-07** | Jornadas, arqueo, cierre, snapshot e historial | Cierre consulta datos inmutables y diferencias, sin doble cierre. |
| 8 | **E1-D1 / DEMO-08** | UI QR de cobro claramente DEMO | Pendiente no se presenta como pagado; empresa vendedora visible. |
| 9 | **E1-D2 / DEMO-09** | Tests de recorridos desktop/móvil; accesibilidad y errores | Evidencia reproducible; fallos y limitaciones documentados. |

**Criterio de no-bloqueo:** mantener Guías, elaboración avanzada, Pedidos/Reservas, Análisis y QR de ficha visibles como «Próximamente» cuando corresponda. No crear repositorios de negocio para módulos todavía no implementados.

## 12. Decisiones para formalizar en E0-C (NO aprobadas por este documento)

| ADR propuesto | Estado | Variante segura para poder construir |
|---|---|---|
| ADR-001 Tenant y membresía | **PROPUESTO** | Persona global + empresas + membresía scoped, autorización UX en demo y obligatoria en API. |
| ADR-002 Titular administrativo | **PROPUESTO** | Fundador histórico; exactamente un titular administrativo activo inicial; transferencia formal posterior. |
| ADR-003 Invitaciones | **PENDIENTE** | Dos flujos distintos; primero nominada, solicitud por enlace/QR diferible sin mezclar estados. |
| ADR-004 Stock, cantidades y SKU | **PROPUESTO** | Ledger único, no negativos, unidad exacta; SKU único en tenant; sin truncamiento. |
| ADR-005 Jornada y cierre | **PROPUESTO** | Conteo + snapshot inmutable; «sin verificar» deshabilitado; retorno físico separado. |
| ADR-006 Pagos / QR | **PROPUESTO** | 1..n pagos exactos; QR de venta DEMO, QR ficha futuro, OAuth por seller real después. |
| ADR-007 UI/estado y persistencia | **PROPUESTO** | React TS/Router/Zustand; estado en memoria y gateway sustituible; sin `localStorage` directo en vistas. |
| ADR-008 Integración con TP académico | **PENDIENTE** | No tocar backends históricos; contrastar contrato y modelo en E2 antes de adaptar. |

El archivo de ADR tendrá fecha, responsables, fuente, alternativas, impacto, pruebas y decisión **APROBADO/PROPUESTO/DIFERIDO**. Ningún ADR aparece aprobado sólo por estar en esta tabla.

## 13. Condiciones de terminado y traspaso E0-B → E0-C / E1

### Entregado en E0-B

- [x] Framework/arquitectura propuestos y descartes justificados.
- [x] Árbol de carpetas futura y límites con el repositorio académico existente.
- [x] Mapa completo de navegación, shell y estados «Próximamente».
- [x] Estado empresarial scoped, borradores y transición A→B.
- [x] Contrato conceptual de gateway DEMO/API y comandos compartidos.
- [x] Invariantes de compras, stock, ventas, caja y QR; escenarios y criterios de aceptación.
- [x] Orden de cortes E1 y lista ADR pendiente para E0-C.

### No realizado (deliberadamente)

- [ ] Creación de `frontend/`, código React, dependencias y componentes reales.
- [ ] Tests unitarios, navegador, E2E, CI, capturas o verificaciones multiusuario.
- [ ] Backend/REST/OpenAPI/UML final, PostgreSQL o integración real Mercado Pago.
- [ ] Cambios en `Proyecto-3-AppAdmin-Mascotas/`, `Proyecto-3-Extendido-Generico/` o ramas del TP.
- [ ] Aprobación del equipo a todas las alternativas/ADRs propuestos.

### Próximo corte exacto — E0-C

Crear `plataforma-pyme/docs/02_DECISIONES_Y_BACKLOG.md` y los ADRs mínimos con sus estados explícitos, matriz trazabilidad `requisito → HTML Zxxx / Hxx → pantalla → comando → prueba` y checklist de arranque E1-A. **No reauditar los 19 HTML ni debatir todos los casos futuros.**

**Acta de verificación E0-B:** elaboración documental y cotejo con E0-A/v4; **ningún flujo implementado ni test ejecutado en este corte**. El equipo deberá aprobar o modificar las propuestas técnicas al abrir E1.