# E0-C — Decisiones arquitectónicas, backlog ejecutable y habilitación de E1

**Producto:** Plataforma generalista de gestión para PyMEs, multinegocio y multirrubro. **WALOS es un fixture de ejemplo**.  
**Repositorio:** `Jorge10192/TP-Programacion2-UNSAM-2C2026`, rama de trabajo actual `main`; nuevo trabajo restringido a `plataforma-pyme/`.  
**Fecha:** 2026-11-06.  
**Estado de entrega:** **E0-C DOCUMENTADA**; **aprobación funcional/técnica pendiente del equipo**. No se programó aplicación, no se ejecutaron pruebas ni se modificó el backend académico.  
**Responsable del documento:** asistencia de integración; **responsables de implementación y aprobación:** equipo, a designar por issue.

## 0. Lectura rápida y archivos que constituyen E0

| Entrega | Archivo | Resultado |
|---|---|---|
| E0-A | [`00_MATRIZ_INTEGRACION_HTML.md`](00_MATRIZ_INTEGRACION_HTML.md) | 19 rutas HTML / 17 contenidos distintos; fuentes Zxxx, selección UX, riesgos Hxx |
| E0-B | [`01_ARQUITECTURA_FRONTEND.md`](01_ARQUITECTURA_FRONTEND.md) | Arquitectura React/TS propuesta, shell, rutas, estado scoped, comandos demo |
| **E0-C** | **este documento** | Estados de ADR, prioridades, tickets para E1, puerta de salida |
| E0-C | [`03_TRAZABILIDAD_E0_C.md`](03_TRAZABILIDAD_E0_C.md) | Matriz requisito → HTML/Hxx → ruta → comando → prueba |
| E0-C | [`ADR/`](ADR/) | Ocho registros de decisiones, alternativas, riesgos, estados y tests |

**Precedencia:** acuerdos explícitos del producto v3/v4 > ADR aprobado > regla segura provisional documentada > UX heredada > script legado. **Ningún ADR de este paquete equivale a aprobación tácita.** E1 comienza con variantes conservadoras y casos acotados, y el equipo puede rechazar alternativas antes del código que las dependa.

## 1. Registro de decisiones (ADRs)

| ADR | Tema | Estado real | Decisión provisional y límite |
|---|---|---|---|
| [ADR-001](ADR/ADR-001-tenencia-y-membresias.md) | Tenencia y membresías | **PROPUESTO** | User global, Business y Membership por tenant; servidor será responsable de seguridad |
| [ADR-002](ADR/ADR-002-titularidad-administrativa.md) | Fundador/titular administrativo | **PROPUESTO** | Fundador histórico y titular administrativo inicial único; transferencia futura bloqueada |
| [ADR-003](ADR/ADR-003-invitaciones.md) | Invitación vs solicitud | **PROPUESTO**; enlace/QR solicitud **DIFERIDO** | Email nominativo primero, solicitud por enlace sin autorización automática |
| [ADR-004](ADR/ADR-004-stock-unidades-sku.md) | SKU, unidades, ledger | **PROPUESTO** | SKU por tenant; no stock negativo; movimientos como autoridad; política de escalas pendiente |
| [ADR-005](ADR/ADR-005-jornada-cierre.md) | Jornada/cierre/snapshot | **PROPUESTO**; «sin arqueo» **DIFERIDO** | Cierre normal contado, snapshot inmutable; retorno físico separado |
| [ADR-006](ADR/ADR-006-ventas-pagos-qr.md) | Venta, pagos, QR | **PROPUESTO**; MP real **DIFERIDO** | Pagos exactos; QR de cobro DEMO vinculado a venta; seller por negocio en API futura |
| [ADR-007](ADR/ADR-007-frontend-demo-gateway.md) | Frontend y estado | **PROPUESTO** | React+TS+Vite, Router, Zustand, gateway DEMO/API, navegación unificada |
| [ADR-008](ADR/ADR-008-integracion-con-tp.md) | Convivencia con TP y API | **PROPUESTO**; unión de backends **PENDIENTE** | Código nuevo en `plataforma-pyme/` sin modificar proyectos hermanos por ahora |

### 1.1 Decisiones que realmente bloquean el próximo corte

**Para comenzar E1-A1 (shell navegable):**
- Revisar y aceptar **como hipótesis provisional**, o rechazar con alternativa escrita, el stack React/TypeScript/Vite + React Router y el mapa de rutas (ADR-007).
- Acordar que el diseño se recrea desde Z003/Z014 y E0-A, **sin copiar JS global ni iframes**.
- Confirmar que todas las pantallas no construidas mostrarán **«Próximamente»** y que datos/usuario de acceso estarán etiquetados **DEMO**.

**Antes de terminar E1-A2 (creación y selector de empresa):**
- Validar ADR-001 y la **titularidad administrativa inicial** de ADR-002; implementar membresía consistente y aislamiento por negocio.
- Elegir política UX de borradores: **propuesta** conservarlos por clave scoped o descartarlos tras confirmación visible; nunca migrarlos entre empresas.
- Acordar fixtures: WALOS, comercio de reventa y servicios sin local/depósito.

**No bloquean E1-A1:** expiración de invitaciones, transferencias de titularidad, SKU, unidades fraccionarias, fabricación, devoluciones, cierre sin arqueo, integración MP, modelo UML final y decisiones sobre backend actual. Esas decisiones se toman justo antes del corte que las usa.

## 2. Reglas de no regresión del primer prototipo

1. **Multiempresa:** vistas, operaciones, permisos visibles, consultas, historial y borradores llevan `businessId`; no hay fuga A→B ni perfiles personales duplicados por empresa.
2. **Rubro genérico:** bienes y servicios; servicios válidos sin almacén, recetas, feria, stock ni caja física. No usar WALOS como nombre/tema obligatorio del producto.
3. **Una sola navegación:** sidebar izquierdo + Inicio con tarjetas generados desde `navigation.ts`; rutas reales o «Próximamente», sin botones que aparenten operaciones inexistentes.
4. **Una sola fuente DEMO:** cualquier cambio en compras, stock, ventas o caja se realiza por comandos tipados del gateway; proyecciones y vistas leen los mismos eventos/datos.
5. **Stock preciso:** recepción única; traslado atómico por origen/destino; no negativo; retorno con faltantes explícitos y no desaparecidos.
6. **Dinero preciso:** descuento antes de total; `1..n` pagos suman exactamente; valores en centavos o decimal exacto; cuentas digitales y caja no se confunden.
7. **Cierre auditable:** snapshot completo antes de cerrar, actor/fecha/diferencia persistidos; sin reabrir ni borrar evidencia; retorno es otro comando.
8. **Pagos externos:** QR de ficha distinto del QR de cobro; E1 sólo DEMO; una persona no puede afirmar que se pagó MP sin estado verificado por proveedor.
9. **Seguridad honesta:** autenticación/roles/consistencia entre pestañas sólo simulados en UI; reglas seguras reales llegarán con API y PostgreSQL.
10. **TP compartido protegido:** no mover, borrar o fusionar ``Proyecto-3-AppAdmin-Mascotas/`` ni ``Proyecto-3-Extendido-Generico/``; no agregar credenciales, fixtures reales o archivos temporales sin revisión.

## 3. Backlog de construcción priorizado

**Significado de prioridades:** **P0** habilita la siguiente entrega; **P1** requerido para demo comercial vertical; **P2** extensión. No se estiman horas sin asignación de equipo.  
**Tipo de resultado:** `DEMO` (interfaz/estado simulado y verificable), `DOC` (documento), `API` (servicios reales futuros). **Ninguna fila E1 significa completada hoy**.

### 3.1 E1-A — Primer prototipo ejecutable, primero

| Ticket | Prioridad | Dependencia | Archivo/resultado esperado | Aceptación observable |
|---|---|---|---|---|
| **E1-A1-01** | P0 | E0-C + ADR-007 provisional | `plataforma-pyme/frontend/` creado con Vite/React/TS, scripts y README | `npm install` y `npm run dev` cargan la app; sin API/credenciales |
| **E1-A1-02** | P0 | 01 | `app/router.tsx`, `app/navigation.ts` y placeholders | Inicio, rutas válidas y 404; menú y tarjetas comparten una definición |
| **E1-A1-03** | P0 | 02 | `AppShell`, `SideMenu`, `TopBar`, `BusinessSelector` y tokens CSS | Menú lateral izquierdo desktop, drawer móvil, teclado/foco funcionales |
| **E1-A1-04** | P0 | 02–03 | Inicio personal + dashboard de empresa con tarjetas | Cada tarjeta abre una vista real o «Próximamente»; sin «M1/M2/M3» visible |
| **E1-A1-05** | P0 | 01–04 | Vitest/Testing Library, prueba de navegación y smoke E2E | Logs reales; `E1A-BOOT-01`, `E1A-NAV-01/02` pasan o fallos documentados |
| **E1-A2-01** | P0 | E1-A1 + ADR-001/002 revisados | Sesión DEMO, perfil global, creación empresa; fixtures sin secreto | Usuario sin empresa crea A; un titular admin inicial; no forzar ubicación |
| **E1-A2-02** | P0 | A2-01 | `DemoGateway` tipado, store por empresa, selector A/B y guards UX | Cambiar A→B no mezcla permisos, borradores ni dashboard |
| **E1-A2-03** | P0 | A2-02 | Tests DEMO tenant, URL ajena, cambios de rol, formularios scoped | `DEMO-TEN-01` y `E1A-TEN-01..03` verificados, demo claramente no segura |

**Referencia UX específica E1-A:** E0-A **Z003** `Modulo 1/Menu_Principal.html` y **Z014** `Modulo 1/WALOS_Modulo1_v1_2/WALOS_Modulo1_Prototipo.html`; formularios de empresa Z001. **No portar** sus almacenamientos `walos_demo_m1_v12`.

**Definición del primer hito comprobable:** levantar en navegador una SPA con barra superior, sidebar y dashboard; entrar a un usuario DEMO sin empresa; crear A, crear/cambiar B, mostrar roles distintos y ningún dato de A en B. Las pantallas de compras/ventas aún no implementadas deben ser «Próximamente».

### 3.2 E1-B — Organización, catálogo, compras e inventario

| Ticket | Prioridad | Dependencia | Comportamiento y referencia E0-A | Test mínimo |
|---|---|---|---|---|
| **E1-B1-01** | P1 | A2 | Empresa Z001, Ubicaciones Z004 con capacidades vender/almacenar opcionales | Servicio sin depósito; permisos DEMO |
| **E1-B1-02** | P1 | B1-01 | Equipo Z002/Z014, invitación nominada y cuenta financiera Z042; solicitud QR «Próximamente» | QA-INV-01 especificada; no concede acceso sin aprobar |
| **E1-B2-01** | P1 | B1, ADR-004 parcial | Catálogo Z069/Z050: bien, servicio, imágenes, estados, SKU por negocio | QA-CAT-01; servicio sin stock; SKU A ≠ colisión en B |
| **E1-B2-02** | P1 | B2-01 | Proveedores Z073, compra Z070/Z050, recepción por comando único | Compra no recibe sola; recibir 10 una vez, reintento idempotente |
| **E1-B3-01** | P1 | B2-02 | Inventario Z050/Z072 derivado de ledger, historial por ubicación | Saldo 10 correcto en todas las vistas |
| **E1-B3-02** | P1 | B3-01 | Traslados Z050, conteo Z072, errores atómicos | Trasladar 3 desde 10 → 7/3; mover 11 falla sin cambios |
| **E1-B3-03** | P1 | B3-02 | Integración de UI y tests de movimientos/recepción | Doble recepción no duplica saldo; ajuste de conteo visible |

**Restricciones:** no mezclar proveedor opcional del producto con modelos obligatorios antiguos; stock por ubicación y negocio; cantidades fraccionarias exigen regla explícita de escala antes de cargar bienes medidos. **Elaboración avanzada/retorno de feria P2**.

### 3.3 E1-C — Ventas, gastos, caja y cierre

| Ticket | Prioridad | Dependencia | Comportamiento y referencia E0-A | Test mínimo |
|---|---|---|---|---|
| **E1-C1-01** | P1 | B3 + ADR-006 | POS visual Z074, reglas de checkout Z075, carrito por businessId | Bien y servicio; controles del formulario funcionan |
| **E1-C1-02** | P1 | C1-01 | Descuento + 1..n pagos exactos; salida de stock única | Total concilia al centavo; venta de 2 desde destino 3 deja 1 |
| **E1-C1-03** | P1 | C1-02 | Gastos Z070/Z075, cuentas Z042, historial único | Fondo explícito, no duplicar gasto ni contaminar caja |
| **E1-C2-01** | P1 | C1 + ADR-005 | Apertura/jornada Z092/Z075; cierre visual Z093, reporte Z075/Z092 | Contado, esperado, diferencias, actor y corte |
| **E1-C2-02** | P1 | C2-01 | Snapshot inmutable + reintento idempotente + historial | Doble cierre no reabre ni borra evidencia |
| **E1-C2-03** | P1 | C2-02 | Pruebas de jornada y recorrido comercial completo | Guion E2E 10→7/3→1, gasto y snapshot consultable |

**Prohibido copiar:** `commitFinalClosure` de Z093 por H06, parseos `parseInt`/`parseARSStrict` inadecuados H07/H26, o los retornos de feria que dejan unidades sin trazabilidad H25. Esto es una regla de construcción, no una aprobación de cierre sin arqueo.

### 3.4 E1-D — Cobro QR visual y validación integral

| Ticket | Prioridad | Dependencia | Alcance | Test mínimo |
|---|---|---|---|---|
| **E1-D1-01** | P1 | C1 + ADR-006 | UI «Cobrar con QR» **DEMO**, importe de checkout y tenant visible | `PENDIENTE` nunca presentado como confirmado real |
| **E1-D1-02** | P1 | D1-01 | Cambio de estado simulado/cancelación; no OAuth, no claves, no dinero | Reintento no multiplica intentos demo sin control |
| **E1-D2-01** | P1 | A–D | E2E desktop/móvil, foco, errores, placeholders y cambio A/B | Resultado real de navegador, fallas registradas |
| **E1-D2-02** | P1 | D2-01 | README, CHANGELOG, QA y capturas si se ejecutan | Comandos reproducibles, decisiones pendientes |

### 3.5 Posteriores a E1 — API / TP3 / MP, sin programar hoy

| Corte | Dependencias | Resultado y condiciones |
|---|---|---|
| **E2 / DOC-03/04 / TP3-01** | E1 funcional y ADRs revisados | UML por dominio, secuencias, OpenAPI (autorización, errores, idempotencia), trazabilidad de 5 requisitos del TP3, patrón justificado; inspeccionar backend académico antes de reutilizar |
| **API-01/02** | E2 | FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL, Docker, pytest, auth y scoping; migraciones y CI reales |
| **API-03/04** | API-02 | Catálogo, ubicaciones, proveedores, compra/recepción/traslado, locks y tests concurrentes PG |
| **API-05/06** | API-04 | Venta, pagos declarados, gastos, cierre transaccional con snapshot; tests de idempotencia y carrera corte/venta |
| **TP3-02** | API | Al menos **10 tests unitarios ejecutados**, integración según riesgo, GitHub Actions, README, UML, defensa del patrón y evidencias |
| **MP-01/02/03** | API-05 + investigación QR real | OAuth por negocio, stores/POS del seller, Orders API idempotente, webhooks firmados y consultados, conciliación, reembolsos y expiraciones |
| **FUT-01/02** | API/validación | Pedidos, reservas, análisis y guías avanzadas, sin bloquear el primer circuito |

## 4. Matriz de QA de E1 e invariantes auditables

Todos los siguientes tests son **especificaciones, NO ejecutados**.

| ID | Prueba | Criterio objetivo |
|---|---|---|
| **E1A-BOOT-01** | Arranque en navegador | `npm run dev` responde y la UI no queda en blanco |
| **DEMO-NAV-01** | Navegación desde menú + tarjetas | Comparten destino; vista o «Próximamente» sin control inerte |
| **DEMO-TEN-01** | Cambio A→B + URL prohibida | Cero datos/borradores/rol de A en B |
| **DEMO-CAT-01** | Crear/vender servicio sin stock | No pide depósito, lote ni saldo |
| **DEMO-STK-01** | Reintentar recepción de 10 | Aumenta solamente 10 |
| **DEMO-STK-02** | Traslado válido/inválido | 7/3 tras traslado 3; 11 rechazado sin estado parcial |
| **DEMO-MON-01** | Descuento y pagos divididos | Suma exacta, formato estricto, único descuento de stock |
| **DEMO-JOR-01** | Cerrar/arquer y consultar snapshot | Conserva conteo, esperado, diferencia, actor y fecha |
| **DEMO-MP-01** | QR de cobro pendiente/aprobado simulado | Indica DEMO, no presenta fondos reales |
| **DEMO-UX-01** | Desktop/móvil/teclado | Drawer, enfoque, errores y acciones alcanzables |

**Integración backend futura, no sustituida por estos tests:** QA-TEN-01/02, QA-STK-01/02/03, QA-MON-01/02, QA-JOR-01/02, QA-MP-01/02/03. Detalle: [`03_TRAZABILIDAD_E0_C.md`](03_TRAZABILIDAD_E0_C.md).

## 5. Matriz mínima de responsabilidades y definición de terminado

| Hito | Ejecutor | Revisor / aprobación | Qué constituye «terminado» |
|---|---|---|---|
| E0-A/B/C | Asistencia IA documentó | **Equipo del TP pendiente** | Archivos Markdown en GitHub verificados; alcance y estados honestos |
| E1-A1/A2 | **A asignar** | **A asignar** | Código compilable/ejecutable, QA de navegador efectivamente corrida, rutas funcionales |
| E1-B/C/D | **A asignar** | **A asignar** | Guion comercial íntegro, tests observables, datos consistentes por empresa |
| E2/E3 | **A asignar** | **A asignar** | Código API real, pruebas, migraciones, documentación TP3 y CI con evidencias |
| MP real | **A asignar** | **A asignar** | Credenciales seguras y propias por vendedor, consulta de pago oficial, conciliación |

**DoD de cada incremento de código:**

- Ruta exacta de los archivos creados/modificados + commit y responsable real.
- Comandos exactos para instalar, ejecutar y probar. Registrar entorno, resultados **observados**, fallos y limitaciones; no inventar pruebas.
- Tabla `requisito → fuente E0-A → componente/comando → test` actualizada.
- Sin exposición de información A/B; en DEMO la restricción se explica como UX, no seguridad real.
- Sin cambios fuera de `plataforma-pyme/` ni tokens, contraseñas o datos reales en GitHub público.
- Errores accesibles y estados vacíos correctos; móvil comprobado cuando corresponda.
- Riesgos/ADR revisados, CHANGELOG y próximo ticket identificados.

**Colaboración en `main`:** el equipo decidió no crear rama ahora. Antes de incorporar cambios, comprobar `git status` y actualizar `git pull --ff-only origin main` (si no hay cambios conflictivos); agregar **archivos/rutas específicos**, no `git add .` a ciegas. La documentación no limpia ni modifica archivos locales de compañeros que Git muestre como sin seguimiento.

## 6. Primer ticket para la siguiente sesión (E1-A1-01)

> **Objetivo único:** construir y ejecutar el esqueleto React/TypeScript/Vite en `plataforma-pyme/frontend/`, con React Router y estilos base; agregar un shell inicial **inspirado en Z003/Z014**, sin portar scripts y sin implementar stock/ventas/API todavía.

**Entradas obligatorias:** E0-A, E0-B, E0-C y ADR-007 (revisión previa del stack).  
**Archivos esperados:** `frontend/package.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/router.tsx`, `src/app/navigation.ts`, `src/app/shell/*`, `src/styles/*`, `README.md`.  
**Resultado aceptable:** `npm install` y `npm run dev` ejecutados; la app abre `/inicio`, el menú aparece y se pueden navegar placeholders; no mensajes de operación ficticiamente exitosa.  
**No hacer:** esquema FastAPI, PostgreSQL, Mercado Pago real, migraciones, login seguro ni fusionar el backend existente.  
**Evidencias:** comandos y salidas reales, mínimo un test/smoke si se dispone del runner, fallos honestos, archivos versionados.  
**Después del ticket:** E1-A1-02/03 (registro de navegación/shell completo) y E1-A2 (empresa/selector).

## 7. Acta de E0-C

### Entregado documentalmente
- [x] Ocho ADRs **versionados con estado explícito** y alternativas, consecuencias y pruebas pendientes.
- [x] Priorización E1-A a E1-D en tickets con dependencias, referencias HTML y aceptación.
- [x] Matriz trazabilidad requisito→HTML/Hxx→ruta/comando→prueba en documento separado.
- [x] Guion de primer incremento y límites para no modificar código académico por error.
- [x] QA conceptual, reglas de aceptación y definición de terminado verificable.

### No realizado / no aprobado
- [ ] Revisión y aprobación de ADRs por integrantes del equipo.
- [ ] Creación de `frontend/`, código React, dependencias, comandos de desarrollo.
- [ ] Tests navegador/unitarios, resultados CI y screenshots ejecutados.
- [ ] Backend FastAPI, migraciones, PostgreSQL, UML actualizado, contratos REST o MP real.
- [ ] Reutilización/fusión del código de `Proyecto-3-Extendido-Generico/backend/`.

**Conclusión:** E0 queda **preparada documentalmente** para abrir E1-A1 después de validar el stack propuesto. Los ADRs no aprobados se aplican únicamente como **reglas provisionales explícitas** cuando su ticket llegue; cada una tendrá revisión y evidencia de pruebas.