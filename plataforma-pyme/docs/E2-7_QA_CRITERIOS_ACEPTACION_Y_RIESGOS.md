# E2-7 — Estrategia QA integral, pruebas E2E, riesgos y puertas de salida

**Tipo:** diseño de QA, no ejecución de pruebas.  
**Versión inicial:** 2026-11-09. **Base:** `main` `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068`.  
**Dependencias:** [plan rector](E2-7_PLAN_RECTOR_INTEGRACION_Y_CIERRE.md) · [matriz de integración](E2-7_MATRIZ_FRONTEND_BACKEND_Y_CONTRATOS.md).  
**Objetivo:** impedir una integración «visual» que simule persistencia, permisos, dinero o stock sin conexión verdadera.

## 1. Qué significa «aprobado» y qué no

- Un test frontend DEMO que pasa verifica reglas y UI de E1, **no** comunicación con FastAPI.
- Un pytest backend que pasa verifica backend en su entorno, **no** que React consuma el contrato correcto.
- Un Swagger 201 correcto verifica la API en el ambiente consultado, **no** la integración del navegador.
- Un Playwright contra Vite y fixtures locales **no** es E2E full stack.
- La validación E2-7 exige pruebas *full-stack* donde navegador, FastAPI y PostgreSQL comparten una base efímera identificada, con cuenta/empresa creadas para la ejecución. Conservar además tests unitarios puros por separado.
- Nunca imprimir credenciales, tokens, contraseñas o DSN reales en logs ni informes.

## 2. Pirámide de pruebas propuesta

| Capa | Ejecutor/entorno | Probar | Puerta |
|---|---|---|---|
| Adaptadores TypeScript | `node --test` o runner del frontend definido en B0 | DTO snake_case, conversiones, enums, nullables, centavos/milésimas, IDs, errores | Cada mapeo crítico tiene fixture |
| Cliente HTTP | mocks deterministas de fetch, sin conexión real | Authorization, Idempotency-Key, cancelación, 401/403/409/422/5xx, timeout, parsing JSON | No secretos ni reintentos peligrosos |
| Componentes React | tests de UI con estado y API simulados | Loading, empty, denied, retry, disable submit, form validation, navegación | No mutar demoStore en REAL |
| Backend ya existente | pytest + PostgreSQL aislado | Auth, tenant, FK, rollback, saldo, versión, idempotencia, permisos | Regresión completa sin fallos |
| Integración API real | FastAPI/PostgreSQL de test | Contratos POST/GET, error codes, transacciones reales | Saldos y movimientos concilian |
| Navegador full stack | Playwright Chromium desktop/móvil + API y DB | Flujo usuario → negocio → compra/recepción → venta → reload | Sin datos DEMO, idempotencia |
| Revisión manual | Swagger y navegador local | Comprobantes, resultados de stock, UI profesional | Evidencias fechadas, SHA exacto |

**Observabilidad mínima de test:** guardar URLs sanitizadas, status, ID de operación no sensible, timestamps, configuración de entorno sin secretos, SHA del código y enlaces a CI. Mostrar `request_id` de prueba puede ser útil, pero nunca token de sesión.

## 3. Escenarios E2E obligatorios

| ID | Flujo | Estado esperado |
|---|---|---|
| E27-AUTH-01 | Registro → login → `GET /me` | Acceso real y perfil correcto |
| E27-AUTH-02 | Logout y acceso a ruta protegida | No se visualiza información REAL después del logout |
| E27-AUTH-03 | F5 con token solo memoria | Reautenticación clara, sin caída a DEMO silenciosa |
| E27-TEN-01 | Crear empresas A y B; cambiar selector | Solo datos de la empresa seleccionada |
| E27-TEN-02 | Solicitud de A en vuelo al navegar a B | Respuesta vieja se cancela o ignora; sin contaminación |
| E27-TEN-03 | Ingresar URL de empresa ajena | 403/404 y vista sin datos ajenos |
| E27-PERM-01 | Colaborador sin asignación intenta operación SELL/STORE | UI no promete permiso; API deniega |
| E27-LOC-01 | Crear sede SELL+STORE; pausar/reactivar | Cambios persistidos tras F5 |
| E27-CAT-01 | Crear bien `UNIDAD` y servicio `SERVICIO`; inactivar bien | Fichas persistentes y sellable/status respetados |
| E27-SUP-01 | Registrar proveedor | CRUD/consulta real persistente |
| E27-PUR-01 | Crear compra con un bien y un concepto libre | Registro no modifica existencias |
| E27-REC-01 | Recibir compra a sede STORE | Sube saldo una vez, un movimiento por línea física |
| E27-REC-02 | Reintentar misma recepción idempotente | Mismo recibo, sin segundo ingreso |
| E27-INV-01 | Consultar saldo/version y ledger | Valores de servidor, no cálculos demo |
| E27-INV-02 | Traslado válido de sedes | Dos eventos con signos opuestos, sumatoria neta cero |
| E27-INV-03 | Ajustar con `expected_version` válida | Saldo/version avanzan exactamente |
| E27-INV-04 | Ajustar con versión obsoleta | 409, recarga y aviso sin actualización falsa |
| E27-SAL-01 | Venta de 2 bienes con stock suficiente | 201, movimiento negativo y saldo menor |
| E27-SAL-02 | Venta mixta bien + servicio y dos pagos | Solo bien descuenta, pagos total exacto |
| E27-SAL-03 | Reintento mismo key/payload tras respuesta perdida | 200 mismo comprobante, sin doble movimiento |
| E27-SAL-04 | Vender más que stock | 409 sin comprobante ni saldo mutado |
| E27-SAL-05 | Cambiar precio UI o descuento con pagos inconsistentes | Client/server validan, sin éxito falso |
| E27-PRES-01 | Recargar después de registrar venta/compra | Consultas recargan lo persistido en PostgreSQL |
| E27-MODE-01 | DEMO antiguo local y empresa REAL en navegador | Datos y KPIs separados, sin import automático |
| E27-MODE-02 | Operar UI QR/jornadas/cuentas | Se informa DEMO; no altera ventas/stock/cuentas REAL |
| E27-RESP-01 | Pantallas desktop/móvil y teclado | Drawer, formularios, estados y navegabilidad accesibles |

**Criterio de negocio importante:** si en E2-7 C3 se decide no implementar `GET /sales`, documentar y testear la experiencia limitada de recuperación del comprobante por ID. No marcar «historial persistente completo» como aprobado por haber mostrado solo la última venta en memoria.

## 4. Tests de red y resiliencia

**401:** token ausente/revocado, limpiar sesión en memoria, no mostrar datos protegidos en la vista anterior.  
**403:** mantener sesión general, denegar operación y no representar rollback ficticio.  
**404:** recurso o empresa no disponible, navegación segura sin información de otro tenant.  
**409:** distinguir conflicto de stock, idempotencia, versión y estado de empresa; recargar datos y preservar intención del usuario cuando corresponda.  
**422:** mapear detalles Pydantic a campos, sin presentar secretos ni stack traces al operador.  
**500/network:** mostrar estado de resultado desconocido para mutaciones idempotentes con timeout, permitir consultar/reintentar **misma clave y cuerpo**; no crear comando nuevo automáticamente.  
**Cancelación al cambiar tenant:** una respuesta abortada no puede sobrescribir datos ni errores del nuevo contexto.

En frontend los tests deben cubrir `AbortController` o equivalente, loading/unmount, doble clic y cambio rápido de empresa.

## 5. Preparación segura de entorno

1. Usar Docker PostgreSQL o servicio local conocido, sin borrar datos preexistentes. Crear DB **efímera única por ejecución** con nombre prefijado `asistente_pyme_e27_test_...`.
2. Aplicar `alembic upgrade head` sobre la base nueva, `alembic current`, `alembic check`; no ejecutar downgrades en base poblada.
3. Arrancar FastAPI apuntando a **esa misma DB**; probar `/health` y `/ready`.
4. Arrancar Vite usando proxy a ese FastAPI; Playwright usa origen del frontend, sin exponer token.
5. Crear usuarios, empresas y artículos exclusivos de la ejecución con claves idempotentes de prueba; no reutilizar IDs de E2-6 histórica.
6. Al finalizar, registrar SHA y resultados, no compartir credenciales. Eliminar DB solo si fue creada por esa ejecución y no contiene datos preservables; hacer limpieza explícita y segura.
7. El API de `compose --profile api` puede apuntar a otra DB/puerto: comprobar `DB_NAME`, puerto y `/ready` antes de interpretar resultados.
8. El CI de integración debe aprovisionar un PostgreSQL limpio y publicar logs/evidencias de fallo sanitizados.

## 6. Comandos de referencia Windows (no ejecutar en otra base por accidente)

En `plataforma-pyme/backend`, **solo con DB de prueba conocida**:

```powershell
$env:DB_NAME = "<BASE_E27_EFIMERA_Y_VERIFICADA>"
$env:RUN_DB_INTEGRATION = "1"
try {
  .\.venv\Scripts\python.exe -m alembic upgrade head
  if ($LASTEXITCODE -ne 0) { throw "upgrade falló" }
  .\.venv\Scripts\python.exe -m alembic current
  if ($LASTEXITCODE -ne 0) { throw "current falló" }
  .\.venv\Scripts\python.exe -m alembic check
  if ($LASTEXITCODE -ne 0) { throw "check falló" }
  .\.venv\Scripts\python.exe -m pytest -q
  if ($LASTEXITCODE -ne 0) { throw "pytest falló" }
} finally {
  Remove-Item Env:\DB_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
```

En `plataforma-pyme/frontend`:

```powershell
npm ci
npm run build
npm run lint
npm run test:sales
npm run test:inventory
```

Las pruebas full-stack con Playwright exigen configurar/iniciar backend real y base efímera **además** de los comandos anteriores. No presentar `npm run test:sales` del demo como E2E real.

## 7. Checklist de aceptación por entrega

### E2-7 A (documentos)
- [ ] Mapeo de páginas, contratos y decisiones leído por el equipo
- [ ] Astra revisó acceso real al código y generó hallazgos
- [ ] Hallazgos clasificados: aceptar / ajustar / diferir / rechazar
- [ ] Decisiones de modos, token, proxy, listados y asociación financiera explícitas
- [ ] PR documental A aprobado antes de codificar

### E2-7 B0–B3
- [ ] `/api/v1` desde Vite funciona, sin URL hardcodeada
- [ ] No hay token en localStorage, sessionStorage o URL
- [ ] Login/logout y error 401 sólidos
- [ ] Cambio empresa cancela/invalida datos y consultas
- [ ] Ubicaciones, equipo y catálogo usan API, sin demo IDs
- [ ] UI conserva diseño y responde en móvil/teclado
- [ ] Pruebas de adaptadores y CI frontend verde

### E2-7 C1–C3
- [ ] Proveedores, compras, recepción conectados
- [ ] Stock sale de `GET balances`; ledger de `GET movements`
- [ ] Ajuste respeta `expected_version`
- [ ] Venta física/mixta y replay no descuentan dos veces
- [ ] Pagos declarados no impactan cuentas/caja
- [ ] Historial de ventas: alcance expresamente definido y probado
- [ ] Test de flujo completo y regresión cruzada verde

### E2-7 D–E
- [ ] Playwright navegador desktop y móvil contra API real + PostgreSQL
- [ ] Dos tenants, permisos y sesión revocada probados
- [ ] CI del SHA final y Alembic sin deriva
- [ ] README, UML/plantillas y matriz RF/CU/API/UI/test actualizados
- [ ] Bitácoras QA/CI sanitizadas, pendientes y límites explícitos
- [ ] Auditorías externas y decisiones incorporadas solo si efectivamente realizadas

## 8. Política de hallazgos

La revisión de Astra sobre este plan **no es un test real**. Cada observación requiere: código/contrato de referencia, riesgo, propuesta mínima, prueba de aceptación y compatibilidad con E2-1–E2-6. No introducir cambios de estilo o dependencias por gusto si no reducen riesgo verificable. Un hallazgo bloqueante confirmado suspende la transición al siguiente incremento hasta su resolución o decisión documentada del responsable.

**Conclusión QA:** E2-7 puede considerarse cerrado solo si **los datos comerciales reales cruzan la frontera React–FastAPI–PostgreSQL** en flujos reproducibles, sin perder autenticación, tenancy, atomicidad ni trazabilidad.
