# E3-1A / E3-1B — Especificación visual, matriz HTML→REAL y criterios de aceptación

**Proyecto:** Asistente PyME, plataforma generalista multiempresa y multirrubro. **WALOS es solo empresa de ejemplo.**  
**Fecha:** 11/11/2026. **Base:** `main fd46c8d586c4a44a4dca06e853780d2aa9b9eee1`, E3-0 y T12 integrados.  
**Origen:** 14 HTML proporcionados por el usuario, y `frontend/src` de React REAL y DEMO.  
**Estado:** E3-1A aprobado conceptualmente, primer cambio de E3-1B en rama **DRAFT** para revisión antes de merge.

> **Regla de precedencia:** React REAL y los contratos FastAPI son la fuente de comportamiento; los HTML son referencias estéticas/UX. La documentación original E3-1 (auditoría de 14 HTML) contiene la evaluación completa. Este archivo registra decisiones ejecutables y el alcance específico del primer incremento. No se importa JavaScript global, Tailwind CDN, mocks ni `demoStore`.

## 1. Matriz definitiva de referencias y destino

| HTML aportado | Pantalla REAL / React actual | Qué reutilizar ahora o después | Decisión de alcance |
|---|---|---|---|
| `Menu_Principal(3).html` | `RealAuthApp` + `RealBusinessesPage` | Navegación lateral, encabezado de negocio, jerarquía de accesos | **E3-1B: shell**; dashboard con KPI en **E3-1H** |
| `Boton_Editar_Perfil_Empresa(2).html` | `RealBusinessesPage` | Bloques de datos, edición contextual, avatar placeholder | **E3-1C**; imagen REAL después en E3-2 |
| `Lista de Empleados(2).html` | `RealTeamPage` | Directorio de empleados, filtros y permisos visibles | **E3-1C**; roles exclusivamente de backend |
| `Ubicaciones(2).html` | `RealLocationsPage` | Fichas de sedes, indicadores SELL/STORE, principal/estado | **E3-1C**, sin borrado físico ni cambio de políticas |
| `catalogo_modulo2(4).html` | `RealCatalogPage` | Tarjetas, filtros, precios, insumos/servicios, ficha detallada | **E3-1D**; fotos con placeholder, sin upload real |
| `walos_proveedores(2).html` | `RealSuppliersPage` | Fichas de contacto, promociones, pagos aceptados si API los devuelve | **E3-1D** |
| `walos_compras_y_gastos_separados.html` | `RealPurchasesPage` | Alta por renglones, proveedor, fechas y recepción identificable | Compras **E3-1E**; gastos fuera de alcance REAL |
| `walos_m_dulo_2_inventario_y_control_de_stock(3)(3).html` | `RealInventoryPage` | Saldos por sede, movimientos, conteo, traslados | **E3-1F**, respetar ledger, versionado y operaciones atómicas |
| `WALOS_M3_Cargar_Venta_POS_vNext(1).html` | `RealPosPage` + `RealPosCheckout` | Carrito, separación cantidad/precio unitario, pagos declarados | **E3-1G**, sin confirmación optimista ni QR acreditado |
| `WALOS_Modulo_Ventas_UX_v4_0(3).html` | `RealSalesPage` | Listado, recibos, filtros, estados y navegación | **E3-1G**; pedidos/reservas después |
| `walos_guias_apoyo(1).html` | No hay módulo REAL | Estilos, instructivos, organización de pasos | **Backlog E3-3**, no enlace operativo REAL |
| `walos_m3_apertura_y_cierre_v3(2).html` | `CashSessionsPage` **solo DEMO** | Flujo de apertura y arqueo | **Backlog E3-4**; no hay caja REAL |
| `walos_m3_apertura_y_cierre_v8(1).html` | `CashSessionsPage` **solo DEMO** | Variante móvil y confirmación de cierre | **Backlog E3-4**, comparar después con v3 |
| `cuentas_bancarias_asociadas(1).html` | `FinancialAccountsPage` **solo DEMO** | Cuentas asociadas y visualización de medios | **Backlog E3-4**; sin backend financiero REAL |

**Pantallas sin prototipo HTML específico:** registro/login, perfil personal, aceptación de invitación, detalle de recepción, ajustes/traslados, Inicio REAL sin ventas, reportes/analítica, imágenes REAL. Se diseñarán a partir del sistema común, sin inventar endpoints.

## 2. Estilo aprobado: design tokens mínimos

- **Marca del producto:** Asistente PyME, nunca `WALOS` fijo. Nombre comercial de empresa REAL proveniente de FastAPI.
- **Paleta:** navegación `#162A47`, primario `#2563EB`, fondo `#F4F6FA`, superficie `#FFFFFF`, borde `#DCE5EF`, texto `#172943`, secundario `#64748B`.
- **Tipografía:** Inter con alternativas de sistema; nunca dependencia obligatoria del CDN de Tailwind/Google.
- **Radios:** base `14px`, tarjetas suaves y botones grandes, sin copiar 14 variantes de CSS global. Sombra suave `0 5px 22px rgba(23,41,67,.055)`.
- **CSS:** nuevos tokens `--pyme-ui-*` y reglas prefijadas `rw-*`; conservar los CSS de DEMO y auth existentes. No incorporar Tailwind salvo una decisión futura justificada.
- **Responsive:** escritorio con sidebar persistente; móvil `≤900px` con drawer y fondo; topbar compacto a `≤600px`; prueba de ancho 360, 390, 768, 1280 px.
- **Accesibilidad:** botones semánticos, `aria-current`, foco visible, menú Escape/Tab y retorno del foco, etiquetas reales y mensajes de error. No usar color como única señal.

## 3. Navegación y aislamiento REAL de E3-1B

**Perfil / identidad:** Mis empresas, Mi perfil, Aceptar invitación y Crear empresa (vía pantallas existentes).  
**Empresa:** Mi empresa, Ubicaciones, Equipo, Catálogo, Proveedores, Compras y recepciones, Inventario y movimientos, Punto de venta, Historial de ventas.  
**Ocultos en REAL:** Gastos, Caja, Cuentas, Guías, Reportes, Pedidos/Reservas y QR de cobro. La DEMO puede conservarlos con etiqueta clara. **No mostrar «Próximamente» ocupando espacio del menú operativo.**

**Cambio de empresa:**

1. El selector solo contiene membresías verificadas por `GET /api/v1/businesses` del actor autenticado. No se usan logos/nombres/saldos DEMO.
2. La ruta incluye el UUID del tenant. `RealAuthApp` remonta la pantalla por ruta; el shell se remonta por `usuario + empresa activa` y aborta lecturas pendientes. **No conserva formularios, sede ni carritos del tenant anterior en memoria**; los registros de idempotencia ya existentes continúan segregados por tenant, usuario y operación.
3. El frontend actualmente **no tiene TanStack Query ni RTK Query**; por tanto no corresponde introducir `queryClient.clear()` ni `resetApiState()` inexistentes. Si se instala una librería de caché en el futuro, toda clave de consulta debe incluir `businessId` y la transición de tenant deberá invalidarla expresamente.
4. Si la empresa no aparece en la lista o la consulta falla, el shell no muestra enlaces de operaciones para ese tenant. Eso **no** sustituye autorizaciones de backend; la API continúa protegiendo cada GET/POST.
5. No persistir token REAL en `localStorage`/`demoStore`. La sesión sigue exclusivamente en memoria, con reingreso después de F5.

**Importante:** el shell **no** introduce un selector global de sede. Cada operación mantiene su selección y validación de sedes SELL/STORE; un cambio de sede no implica autorización.

## 4. Riesgos funcionales a prevenir en siguientes incrementos

- **E3-1C:** rol visible según `Membership.role`; no simular Dueño/Trabajador, ni otorgar acceso por ocultamiento o mostrar una tarjeta.
- **E3-1D:** costo/precio y tipo de artículo provienen del backend; la presencia visual de fotografía no implica funcionalidad de carga de medios REAL.
- **E3-1E:** registrar compra no mueve stock; recepción completa y única requiere sede STORE e idempotencia. Preservar recuperación segura tras timeout.
- **E3-1F:** no calcular saldos finales en UI ni emitir ajustes/traslados ignorando `version`, 409 o permisos de sede.
- **E3-1G:** no usar **UI optimista** para confirmar ventas que alteran inventario. Mantener CTA de confirmación inactivo durante envío, revisión del intento original y mismo `Idempotency-Key` en recuperación; jamás generar clave nueva tras timeout incierto. Mostrar precio unitario de solo lectura/candado para roles operativos, cantidad editable y total por línea; descuentos solo a roles autorizados. `MERCADO_PAGO_DECLARADO` **no** procesa fondos.
- **E3-1H:** **onboarding con estados vacíos reales**: (1) crear primera sede, (2) crear artículo, (3) iniciar stock en sede STORE, (4) proveedor/compra, (5) POS. Mostrar «sin datos» en lugar de KPI falsos o historiales WALOS de ejemplo. Al comenzar E3-1H revisar permisos: `STOCK_INICIAL` sólo titular/admin.

## 5. Alcance exacto del primer PR E3-1B

**Sí incluye:** CSS tokens aislados, shell lateral REAL, encabezado, selector de empresa basado en API, navegación a rutas REAL que ya existen, estados de carga/error, drawer móvil con Escape/Tab, tests de rutas y límites de alcance. Puede contener este documento de definición sin modificar los documentos rector 01–05/T12.

**NO incluye:** reescritura de formularios/negocio, migraciones, API, cambios de permisos, imágenes REAL, dashboard KPI, onboarding interactivo, cuentas/caja/QR productivos, modificación de `demoStore`, refactor global de `App.css`, rutas nuevas ni cambios en operaciones POS.

### Criterios para revisar y aprobar E3-1B

1. Inicio de sesión REAL → Mis empresas → seleccionar A → visualizar su menú; cambiar a B y confirmar ausencia de datos/carrito/formularios de A.
2. Usuario con solo una empresa, usuario con varias empresas, empresa suspendida, empresa sin sedes y respuesta 401/403/404 de API.
3. Desktop 1280 px y móvil 390 px: sidebar, topbar, drawer, Escape, Tab, botón cerrar y selección con teclado.
4. Verificar navegación por URL y botón Atrás; no hay enlaces a Caja/Cuentas/Guías/QR falsamente REAL.
5. CI: `npm run build`, `npm run lint`, tests Node frontend, tests Playwright REAL y DEMO; si solo se modifica el shell, backend debe permanecer sin cambios. Comparar capturas visuales antes de autorizar merge.
6. Revisión humana de estética y navegación; **DRAFT hasta aprobación expresa de merge**.

**Resultado esperado:** la lógica REAL permanece intacta, pero el usuario ve una estructura integrada parecida al HTML de Menú Principal; el resto de los módulos se rediseñará gradualmente en E3-1C..H.