# E0-C — Trazabilidad de requisitos, referencias HTML y pruebas

**Fecha:** 2026-11-06  
**Estado:** propuesta documental de E0-C; **no son pruebas ejecutadas ni capacidades ya implementadas**.  
**Ruta:** `plataforma-pyme/docs/03_TRAZABILIDAD_E0_C.md`.  
**Fuentes:** E0-A `00_MATRIZ_INTEGRACION_HTML.md` (IDs Zxxx, Hxx y Dxx), E0-B `01_ARQUITECTURA_FRONTEND.md`, plan v4 (DEMO-01..09, API-01..06, TP3-01..02), auditoría anterior.

## 1. Convenciones y alcance

- **Rxx:** referencias funcionales usadas por la matriz E0-A; este documento **no crea nuevos requisitos aprobados**.
- **Zxxx:** ID del HTML fuente del ZIP v3. **No se copia** el script global. `F` = falta HTML íntegro, diseñar vista nueva.
- **Hxx:** hallazgo existente de la auditoría. **Dxx** en E0-A significa decisión histórica pendiente; **ADR-xxx** refiere a decisión técnica propuesta en E0-C. No son equivalentes.
- **Operación:** nombre conceptual de comando/consulta de `AppGateway`, no endpoint implementado ni contrato OpenAPI definitivo.
- **Prueba:** caso de aceptación planificado. La columna «estado» es **NO EJECUTADO** en todas las filas.
- **Corte:** E1-A shell/tenencia, E1-B catálogo/stock, E1-C comercio/caja, E1-D QR/E2E, E2/E3 backend.

## 2. Matriz requisitos → HTML/hallazgo → ruta → operación → prueba

| Req / corte | Fuentes principales y riesgo | Ruta o componente de destino | Operación conceptual (`AppGateway`) | Prueba de aceptación pendiente |
|---|---|---|---|---|
| R01 · E1-A | F, Z014; H01 | `/acceso`, `/inicio` | `startDemoSession`, `endDemoSession` | DEMO-TEN-01: usuario sin empresa inicia y ve creación |
| R02 · E1-A | Z014, Z001; H01 | `/empresas/nueva` | `createBusiness` | QA-ONB-01: crea miembro y único titular admin inicial |
| R03 · E1-A | F, Z003/Z014; H01/H14 | `BusinessSelector`, `/b/:businessId/inicio` | `selectActiveBusiness`, `getBusinessContext` | QA-TEN-01/02; A→B sin fugas |
| R04 · E1-B | Z002, Z014; H12; D02 | `/b/:businessId/equipo` e invitaciones | `inviteByEmail`, `requestMembership`, `approveRequest` | QA-INV-01; solicitud no autoriza automáticamente |
| R05 · E1-A | Z003/Z014; H17 | `AppShell`, `/inicio`, `/b/:businessId/inicio` | `getNavigation`, `getDashboard` | DEMO-NAV-01: menú y tarjeta mismo destino |
| R06 · E1-A | Z014 (perfil) | `/perfil` | `getProfile`, `updateProfile` | Identidad personal no se duplica por empresa |
| R07 · E1-B | Z004, Z014; H02 | `/b/:businessId/ubicaciones` | `createLocation`, `pauseLocation` | Servicio sin depósito; ubicación B no visible en A |
| R08 · E1-B | Z069/Z050; H16/H22; D04 | `/b/:businessId/catalogo` | `createCatalogItem`, `updateCatalogItem` | QA-CAT-01: bien/servicio, SKU en tenant |
| R09 · E1-B | Z050/Z072; H09/H19 | `/b/:businessId/inventario` | `getStockProjection` | Misma cifra en inventario, POS y ficha |
| R10 · E1-B | Z050; H18/H25 | `/b/:businessId/movimientos` | `transferStock` | DEMO-STK-02: 10→7/3, sobretraslado rechazado |
| R11 · E1-B | Z072; H07/H19/H26 | `/b/:businessId/inventario/conteo` | `reconcileStockCount` | Ajuste trazado; formato inválido no trunca |
| R12 · E1-B | Z073; H11 | `/b/:businessId/proveedores` | `createSupplier`, `updateSupplier` | Proveedor opcional, vinculado al negocio activo |
| R13 · E1-B | Z070/Z050; H11 | `/b/:businessId/compras` | `registerPurchase` | Compra NO incrementa stock antes de recepción |
| R14 · E1-B | Z070/Z050; H09/H19 | `/b/:businessId/compras` detalle | `receivePurchase` | DEMO-STK-01 / QA-STK-01: una recepción +10 |
| R15 · E1-C | Z074/Z075; H09/H10 | `/b/:businessId/ventas` | `createSale`, `getSale`, futura `refundSale` | DEMO-MON-01: pagos exactos, salida única; devolución no excede original |
| R16 · E1-C | Z070/Z075/Z014; H09 | `/b/:businessId/gastos` | `recordExpense` | Una salida por gasto efectivo, fondo explícito |
| R17 · E1-B/C | Z042/Z014; H09/H14 | `/b/:businessId/cuentas` | `createFinancialAccount`, `listAccounts` | Saldo de billetera ≠ efectivo de jornada |
| R18 · E1-C | Z092/Z093/Z075; H06/H07/H13/H25 | `/b/:businessId/jornadas` y cierre | `openCashSession`, `closeCashSession` | DEMO-JOR-01 / QA-JOR-01: snapshot íntegro |
| R20 · E1-C | Z050/Z075 | `/b/:businessId/historial` | `getBusinessHistory` | Mismo evento correlaciona venta, pago, stock y cierre |
| R21 · Futuro | Z069/Z050; H19 | Ficha de bien elaborado | `registerProduction` futura | Elaboración opcional, consumo atómico pendiente |
| R22 · Futuro | Z075 parcial; D14 | `/b/:businessId/pedidos` | `createOrder` futura | «Próximamente», ninguna reserva real fantasma |
| R23 · Futuro | F; D14 | `/b/:businessId/analisis` | `getAnalytics` futura | «Próximamente», sin cifras presentadas como ganancia real |
| R24 · E1-D | Z074 + MP v4; H10 | `QrPaymentDemo` desde checkout | `createQrDemoIntent`, `simulateQrOutcome` | DEMO-MP-01: pending ≠ cobrado, indicador DEMO |
| TP3 · E2/E3 | Consigna TP3 + ADR-008 | FastAPI y documentos técnicos posteriores | `ApiGateway` + endpoints a definir | TP3-01/02, ≥5 requisitos y ≥10 unit tests ejecutados |

**Nota sobre R24:** etiqueta local para QR introducido en v4. Se usa como **traza de planificación**; no se afirma que sea un Rxx preexistente en la documentación histórica.

## 3. Matriz de hallazgos críticos → ADR → control

| Hallazgo / causa | ADR y decisión provisional | Control pendiente |
|---|---|---|
| H01/H02/H14: tenant singleton, rol global y ubicación forzosa | ADR-001/002; usuario global y membresía scoped, servicios sin depósito | DEMO-TEN-01 / QA-TEN-01/02 / QA-ONB-01 |
| H12: invitación nominada vs solicitud QR/enlace | ADR-003; mantener dos flujos | QA-INV-01 |
| H16/H22: SKU/nombres/tipos | ADR-004; SKU por tenant, bien/servicio | QA-CAT-01 |
| H07/H26: parseInt y cantidad/importes malformados | ADR-004/005/006; parseo estricto, dinero centavos, unidad escalada | DEMO-MON-01, DEMO-STK-02 |
| H09/H19: existencias divergentes, falsa concurrencia | ADR-001/004/007; ledger y gateway único | QA-STK-01/02/03 |
| H25: retorno que desaparece unidades | ADR-004/005; movimiento independiente y diferencia explícita | Test retorno pendiente para corte P2 |
| H10: checkout de único medio pese a reglas múltiples | ADR-006; 1..n aplicaciones exactas | DEMO-MON-01 |
| H06/H13: borrado borrador / cierre sin verificar | ADR-005; snapshot antes de CLOSED, sin arqueo deshabilitado | DEMO-JOR-01 / QA-JOR-01/02 |
| H08/H15/H17: almacenamiento y render fragmentados | ADR-007; UI única, router/gateway | DEMO-NAV-01, DEMO-TEN-01 |
| QR de ficha confundido con QR de pago | ADR-006; QR cobro DEMO y vendedor por empresa en API futura | DEMO-MP-01 / QA-MP-01/02/03 |

## 4. Pruebas mínimas para la primera implementación E1-A

| Prueba | Preparación | Acción | Resultado esperado |
|---|---|---|---|
| E1A-BOOT-01 | `frontend` creado, dependencias instaladas | `npm run dev` | UI carga sin errores en consola ni excepción crítica |
| E1A-NAV-01 | Dashboard con tarjetas, menú | Clic en cada tarjeta/ítem | Vista real o placeholder explícito; ruta válida |
| E1A-NAV-02 | Ancho 1440 y 390/430 px | Abrir/cerrar drawer, navegar teclado | Funciona y foco controlado; no contenido inaccesible |
| E1A-TEN-01 | User sin empresas | Entrar a `/inicio` y crear empresa A | Empresa visible y un titular administrativo DEMO inicial |
| E1A-TEN-02 | User con A y B, roles diferentes | Alternar A→B→A | Datos, roles, ubicación y borradores no se mezclan |
| E1A-TEN-03 | User sin membresía A | Pegar ruta `/b/A/catalogo` | Sin atributos ni datos de A |
| E1A-DRAFT-01 | Carrito/formulario DEMO ligado a A | Elegir B | No aparece contenido de A; política de conservación visible |
| E1A-PLACEHOLDER-01 | Ruta no implementada | Entrar desde menú | «Próximamente», sin botones que aparenten guardar |

**Límites:** un test de UI DEMO no prueba aislamiento real, atomicidad cross-process, credenciales, pagos ni backend. No declarar «pasó» hasta ejecutarlo y registrar comando/entorno/resultados.

## 5. De E1 a TP3 y API (sin cambiar el backend hoy)

| Etapa | Requisitos backend de v4 | Pruebas centrales |
|---|---|---|
| API-01/02 | FastAPI/SQLAlchemy/Alembic/PostgreSQL/Docker/CI; auth, User/Business/Membership, scoping | QA-TEN-01/02, QA-ONB-01, QA-INV-01 |
| API-03 | Catálogo BIEN/SERVICIO, SKU por tenant, proveedores, ubicaciones | QA-CAT-01 |
| API-04 | Compra, recepción idempotente, stock, traslado, concurrencia real | QA-STK-01/02/03 |
| API-05 | Venta, descuento, pagos, gasto, devolución, auditoría | QA-MON-01/02 |
| API-06 | Jornada, arqueo, cierre, snapshot, carrera corte/venta | QA-JOR-01/02 |
| MP-01/03 | OAuth seller por empresa, Orders QR, webhooks verificados, conciliación | QA-MP-01/02/03 |
| TP3-01/02 | Matriz de los cinco requisitos y evidencias unitarias/CI/defensa | ≥10 tests unitarios **reales**, resultados guardados |

## 6. Estado de evidencia y mantenimiento

- **E0-A:** inspección estática y auditoría reutilizada. No E2E validado.
- **E0-B:** propuesta de diseño. No backend ni frontend creado.
- **E0-C:** ADRs + priorización + trazabilidad. Todas las pruebas de este documento están **PENDIENTES / NO EJECUTADAS**.
- Al implementar cada funcionalidad: agregar ruta de componente real, nombre del test y resultado a esta matriz; si cambia una regla, actualizar ADR primero.
- Responsable por implementar/probar/aprobar: asignar en el tablero de tareas del equipo (no inventar personas ni fechas).

**Criterio de salida para E1-A:** arquitectura propuesta revisada, issues P0 convertibles en commits, fuente de diseño E0-A identificada, pruebas observables definidas y ningún requerimiento de API real incorporado por accidente.