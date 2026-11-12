# E3-1H1 — Inicio de empresa y onboarding REAL

**Fecha:** 12/11/2026. **Proyecto:** Asistente PyME multirrubro/multiempresa.  
**Base de trabajo:** rama `feature/e3-1g-pos-ventas-visual-real`, commit `e52f502`, con PR #59 pendiente de integración.  
**Rama propia:** `feature/e3-1h1-inicio-onboarding-real`. PR DRAFT contra E3-1G; sin fusionar ni modificar `main`.

## Objetivo
Implementar **Inicio REAL** y una guía de primeros pasos apoyada en FastAPI/PostgreSQL sin copiar DEMO, sin inventar ventas, montos, KPIs ni stock, y sin modificar permisos, contratos o procesos de escritura.

## Alcance funcional
- Ruta nueva: `/real/empresas/:businessId/inicio`, aceptada por `RealAuthApp`, shell y menú lateral. La ruta `/real/empresas/:businessId` sigue siendo Datos de la empresa para preservar navegación y pruebas existentes.
- Desde Datos de la empresa hay un botón **Inicio y primeros pasos**; el nuevo menú REAL incluye **Inicio**.
- Título, nombre, rubro, rol y estado proceden de `GET /businesses/{id}`; toda la página está aislada por empresa, con remount del shell, AbortController y sesión exclusivamente en memoria.
- La guía verifica en este orden:
  1. **Ubicación:** hay al menos una ubicación activa, a través de `GET /locations`.
  2. **Catálogo:** hay al menos un artículo o servicio activo y vendible, a través de `GET /catalog`.
  3. **Inventario físico:** si existen bienes físicos vendibles, se busca un saldo positivo de uno de ellos en una sede activa con capacidad STORE, a través de `GET /inventory/balances`. Si el catálogo vendible contiene exclusivamente servicios y está completo, se marca **No requiere stock** (no se interpreta como inventario inexistente).
- Los pasos se determinan en cada consulta, no se pueden marcar manualmente. La barra muestra cuántos pasos han sido verificados como preparados, **no** certifica que todas las operaciones comerciales puedan realizarse.
- Consultas de catálogo e inventario con páginas de 100 y límite de 5 páginas (500 registros por recurso). Cuando la consulta es incompleta, un faltante nunca se representa como cero. Las respuestas 403 y errores de red dejan el estado **No verificado**; 401 invalida la sesión.
- Accesos rápidos REAL a Proveedores, Compras y recepciones, POS e Historial; el panel **no** genera compras, ventas, stock inicial o invitaciones. El usuario hace las operaciones desde sus módulos, con autorizaciones existentes.
- Responsividad de escritorio y móvil; controles de foco y semántica accesible; no imágenes ficticias ni `demoStore`.

## Restricciones deliberadas
- Sin endpoints o migraciones nuevos.
- Sin panel de indicadores financieros ni estimación de ganancias; no se calcula el saldo a partir de compras.
- No se introduce Caja/Cuentas/Gastos/Pedidos/Reservas/QR REAL; siguen diferidos.
- No se agrega ningún atajo para crear `STOCK_INICIAL` sin consultar roles y política de inventario.
- Un usuario sin permisos de escritura puede consultar los pasos que la API autoriza. Los botones navegan a módulos REAL, no conceden privilegios.
- No hay almacenamiento de imágenes ni logos empresariales.
- Se conserva la semántica de F5: sesión solo en memoria; hay que volver a iniciar sesión para consultar nuevamente.

## QA y aceptación
1. Empresa recién creada: Inicio muestra 0/3 y los tres pasos en pendiente cuando las consultas son completas y vacías. No se genera ningún POST desde el navegador.
2. Registrar una ubicación activa y un artículo físico vendible en la DB descartable: tras «Actualizar desde API» muestra 2/3; no supone que haya stock.
3. Registrar stock inicial de forma explícita por la API en la base descartable: al actualizar se muestran 3/3.
4. Empresa con solo servicios: 2/2 y **No requiere stock**, sin sugerir depósito.
5. Empresa B distinta: el selector cambia tenant y vuelve a 0/3; no aparecen recursos de A. El shell desmonta la página y aborta las lecturas antiguas.
6. Catálogo paginado parcialmente o GET 403: el panel debe indicar **No verificado**, nunca 0 real por inferencia.
7. Teclado, móvil 390 px, sin scroll horizontal; navegación por URL directa y retorno; tras F5 se requiere login.
8. `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run test:auth` y suites E2E REAL en PostgreSQL descartable. Nada de pruebas comerciales de escritura contra la base local habitual.

## Próximos subbloques previstos
- **E3-1H2:** guía contextual de configuración / navegación por pantallas y estados vacíos mejorados, sin duplicar formularios ni habilitar permisos nuevos.
- **E3-1H3:** evaluar indicadores REAL adicionales, solamente cuando existan contratos suficientes, KPIs fundados y validación del alcance.
- Fotografías desde Catálogo, optimización de bundles, Caja y QR REAL quedan fuera de este PR.

**Criterio de integración:** PR en borrador apilado sobre #59. No fusionar antes de CI y revisión humana.
