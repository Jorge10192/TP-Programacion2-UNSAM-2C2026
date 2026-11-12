# E3-1H2 — Primera configuración y menú contraíble (REAL)

**Fecha:** 12/11/2026. **Estado:** revisión en rama, PR DRAFT.  
**Rama:** `feature/e3-1h2-primera-configuracion-ux-real`; basada en E3-1H1, sin merge en `main`.

## Alcance

1. **Sidebar de escritorio contraíble:** botón visible «Contraer menú lateral» / «Expandir menú lateral», controlado por estado React en memoria de sesión. En modo compacto se conservan íconos con nombres accesibles, `title` y la señal del módulo activo. El contenido principal usa el espacio liberado automáticamente. No se usa `localStorage` ni se guardan preferencias en backend.
2. **Menú móvil accesible:** a 900 px o menos sigue funcionando el drawer completo, con botón «Abrir menú», overlay, cierre por Escape y gestión de foco. El modo compacto de escritorio no recorta etiquetas en móvil. No alterar la navegación de DEMO.
3. **Primera empresa:** después de confirmar el `POST /businesses` con `Idempotency-Key` y eliminar exitosamente el intento del journal, la interfaz navega a `/real/empresas/{id}/inicio` en vez de la ficha de empresa. Ni la confirmación ni la recuperación de una solicitud ambigua se modifican. El formulario sigue requiriendo consentimiento del journal; ante fallo de limpieza del intento permanece en la pantalla actual.
4. **Siguiente acción en Inicio:** tarjeta superior con el primer paso pendiente según `assessBusinessSetup` (sede, catálogo, inventario cuando corresponda). Para empresas preparadas muestra salida a Punto de venta. Si las lecturas no son suficientes, invita a actualizar; nunca declara pasos completos por inferencia ni omite RBAC.
5. **Ámbito de E3-1H2:** solo UX/navegación. Sin cambios en rutas API, schemas, SQL, login, stock, pagos, QR ni fotos de catálogo.

## Controles manuales propuestos

- Con empresa existente, abrir Inicio y contraer menú desde el botón junto al título. Verificar ancho y que los íconos sigan navegando; expandir sin cambiar de cuenta.
- En ancho móvil (390 px), abrir menú desde la cabecera, usar Escape, revisar accesibilidad por teclado y ausencia de desplazamiento horizontal.
- Con **base de pruebas descartable**, registrar usuario QA nuevo y crear primera empresa. Tras la respuesta real de creación, Inicio debe abrirse automáticamente con 0/3 o con el progreso acorde a sus datos, sin inventar stock.
- Crear ubicación, catálogo y existencias cuando corresponda usando módulos reales, regresar a Inicio y presionar «Actualizar desde API». Probar un negocio de solo servicios (sin requerir inventario físico).
- Al cambiar de empresa, ningún dato de una empresa debe aparecer en otra; probar cancelación/rechazo de creación sin duplicación de empresas, y sesión terminada sin preferencia persistida.
- La pantalla Inicio y el toggle de navegación no deben hacer `POST`, `PATCH`, `DELETE` ni movimientos de stock; solo creación explícita de empresa realiza su `POST` habitual.

## Observación H1

Fotos mostraron «Fruta pack» como Servicio y un comprobante de stock inicial con igual nombre. El backend rechaza stock inicial si el catálogo tiene `item_type != BIEN`, y rechaza editar tipo/unidad con saldo ya registrado. Sin UUID, empresa y sede comprobados desde la base, la identidad entre ambas capturas **no está confirmada**. No corregir automáticamente datos de usuarios ni debilitar validaciones; ver nota en el PR #60. Se considera una observación no reproducida, no un bug de H2.

## Validación automática

- `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run test:auth` y suites de regresión.
- `e2e/real/e3-first-company-ux.spec.ts` solo contra `PYME_DISPOSABLE_QA=1` + PostgreSQL efímero. Verifica primera empresa, guía, contraer por teclado, navegación conservada, drawer móvil y ausencia de POST comercial.
- Se requiere CI GitHub Actions verde y aprobación visual antes de integrar. No modificar `main` ni base local para QA.
