# E3-1F1 — Inventario REAL: existencias, historial y vistas de operación

**Fecha:** 2026-11-12  
**Base:** PR #57, rama \`feature/e3-1e2-recepciones-comprobantes-visual\`, commit \`0011715\`. Dependencia PR #55.  
**Rama:** \`feature/e3-1f1-inventario-vistas-real\`.  
**Estado:** primer incremento visual E3-1F para QA y PR borrador; **no fusionar a main** antes de revisión.

## Motivo y alcance

Homogeneizar Inventario REAL con la navegación aprobada para Empresa, Ubicaciones, Proveedores y Compras, **sin sustituir** los componentes de transferencia, conteo y ajuste ya validados contra FastAPI y PostgreSQL.

- **Vista de listado:** encabezado empresarial, indicadores limitados a existencias y movimientos *ya cargados*, filtros existentes de sede y artículo, pestañas Existencias / Historial, tarjetas responsive, paginación y trazabilidad.
- **Vista de traslado:** «Transferir entre ubicaciones» abre su propia pantalla sin mostrar debajo existencias ni historial. Se reutiliza íntegramente \`RealTransferPanel\` con origen/destino, consulta del saldo de origen, destino autorizado, cantidades exactas y motivo. Su propio botón superior «Volver a inventario» continúa deshabilitado mientras se envía una operación.
- **Vista de stock inicial y ajustes:** «Stock inicial y ajustes» abre otra pantalla separada. Se reutiliza \`RealAdjustmentPanel\` que incluye **Conteo físico**, Ajuste entrada, Ajuste salida y Stock inicial; muestra saldo/versiones actuales y previsualiza delta, sin cambiar la lógica.
- **Navegación por estado React** en la misma ruta: \`list\`, \`transfer\`, \`adjustment\`; el contenido de listado no queda debajo del formulario. El foco del teclado se mueve al título de la vista activada o del listado cuando se vuelve. El detalle de los movimientos conserva un desplegable de trazabilidad.
- **Estilos específicos** en \`realInventoryVisual.css\`, sin modificar DEMO ni lógica transaccional. Vista responsiva con prueba a 390px.

## Invariantes de seguridad

1. No se modifican gateway, backend, contratos API, Alembic, modelos, roles, permisos, reglas STORE, control de versiones, cálculos de saldo, ni movimientos históricos.
2. El saldo viene del backend; el frontend **no suma compras** ni mezcla unidades heterogéneas para inventar un total. Los tres indicadores muestran **filas cargadas**, no totales globales cuando la API pagina.
3. Se mantienen los journals en IndexedDB, con misma clave y cuerpo para replay permitido. **Volver no hace POST** ni borra los intentos pendientes guardados; al reabrir un panel se recuperan. Bloqueo de botón Volver durante un POST activo.
4. Se conserva la regla atómica de traslado (salida/entrada), las versiones esperadas de ajustes, y la diferencia exacta para el conteo físico. Se conserva confirmación explícita con \`window.confirm\`.
5. Se conservan avisos y bloqueos de 409, resultado incierto y la validación contra saldos realmente consultados. No se crean ventas, compras ni pagos.
6. Se muestra claramente que el filtro de historial por tipo o búsqueda actúa solo sobre registros cargados, mientras que sede/artículo se envían a la API para volver a consultar.

## Pruebas

- Nueva E2E \`frontend/e2e/real/inventory-visual-navigation.spec.ts\` con \`PYME_DISPOSABLE_QA=1\`: seeded en una empresa aislada, navegación de lista ↔ traslado ↔ ajustes, foco, 390px, filtros y ausencia total de POST inventario al abrir/cancelar.
- Regresión \`frontend/e2e/real/inventory.spec.ts\`: intentos guardados ante respuesta perdida, F5, reenvío de misma clave y cuerpo, no duplicación, conflictos 409, paginación de más de cien movimientos e historial por sede/artículo.
- CI: build, lint, E2E Chromium, suites REAL de PostgreSQL y tests de stock/ledger. Toda mutación real de prueba se realiza únicamente en DB descartable.

## Revisión visual solicitada

Abrir Inventario REAL en una empresa de prueba, comprobar saldos e historial. Presionar «Transferir entre ubicaciones» y «Stock inicial y ajustes» para verificar que se abren como pantallas exclusivas y vuelven al listado, sin ejecutar ningún POST. Comprobar que Conteo físico sigue visible dentro de Ajustes, que filtros y trazabilidad se mantienen y que el listado es usable en 390px.

**No fusionar** sin aprobación. Los siguientes incrementos de E3-1F podrán pulir el historial y la representación de movimientos/ajustes si se necesita, sin mezclar rediseño con cambios de dominio.

## Aprobación funcional y ajuste de auditoría (12/11/2026)

El usuario aprobó el diseño y el funcionamiento de E3-1F1 y pidió una única corrección final: mostrar en el detalle del movimiento **el nombre de la persona que realizó la operación**, sin sacrificar el identificador técnico.

- El contrato de inventario ya contiene `actor_id`, correspondiente al actor que efectuó el movimiento; la corrección no altera DTO ni escrituras.
- En **Historial de movimientos**, se muestra «Realizó el movimiento: nombre», resolviendo la identidad del usuario conectado por su ID de sesión y la de otros integrantes exclusivamente a través de la lista REAL de miembros de la empresa, cuando `canReadTeam` autoriza la consulta.
- La respuesta del equipo se conserva asociada a su `businessId` y solo se utiliza si coinciden la empresa activa y los permisos actuales. No se hace lookup de cuentas ajenas.
- Si no hay nombre consultable, se presenta «Nombre no disponible», sin atribuir un movimiento histórico al usuario actual. El UUID sigue en «Ver trazabilidad» como «Responsable (ID)».
- El nombre mostrado es el nombre actual del perfil del integrante; no pretende ser un snapshot histórico inmutable.
- Se mantienen la interfaz móvil, los métodos GET, paginación, filtros, operaciones atómicas, las claves de idempotencia y el control de versiones.
- Se añadieron pruebas de visualización de nombre propio, autor distinto, caso sin acceso al directorio y conservación del UUID; además, el E2E de base descartable verifica el nombre y el detalle técnico sin generar POST de inventario.

**Cierre:** aprobación funcional expresada por el usuario; PR preparado para revisión GitHub tras CI. No constituye autorización para fusionar la cadena a `main`.
