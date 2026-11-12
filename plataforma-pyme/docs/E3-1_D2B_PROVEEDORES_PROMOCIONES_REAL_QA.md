# E3-1D2B — Proveedores REAL: medios de pago y promociones por día

**Fecha:** 2026-11-12.
**Base:** PR #53 E3-1D2A, rama feature/e3-1d2a-proveedores-contactos-real. Depende en cadena de PR #52 → #51 → #50.
**Rama:** feature/e3-1d2b-proveedores-promociones-real.
**Estado:** para QA visual y funcional. Sin merge a main ni cambios en la base del usuario.

## Objetivo

Reutilizar el soporte ya existente de PostgreSQL JSONB y FastAPI de Proveedores para permitir seleccionar medios de pago aceptados y registrar hasta ocho promociones informativas. Cada promoción tiene **su propio listado de días (lunes a domingo), medio de pago requerido opcional y descripción del beneficio**. El formulario imita la experiencia de la DEMO, sin copiar almacenamiento DEMO.

## Alcance

- Medios aceptados: Efectivo, Transferencia, Mercado Pago, Cuenta DNI, Tarjeta, Cheque y Cuenta corriente. Selección múltiple sin duplicados.
- Reglas promocionales: agregar/quitar hasta 8; días independientes para cada regla, medio requerido (o «Sin medio específico») y beneficio obligatorio de 3–160 caracteres.
- Días del backend: 0 = lunes, 1 = martes, ... 6 = domingo; se ordenan al validar. **Arreglo de días vacío significa que no se especificaron días** (se informa como «cualquier día» en la ficha, sin automatización).
- Identificadores de promoción: UUID generados al crear cada regla y conservados en edición; nunca usar IDs de DEMO prefijados.
- En alta POST se incluye la información de contacto del bloque D2A y payment_methods/promotions. En edición PATCH se envía el conjunto completo de esos campos; se reemplazan los arreglos JSONB en bloque, como exige el servicio.
- La vista «Ver ficha» muestra métodos, beneficio, días aplicables y medio requerido para cada promoción. Edición abre vista dedicada con Volver; Cancelar descarta todo el borrador.
- Medio requerido y medio aceptado se modelan por separado, tal como establece el contrato API; la UI no establece relación obligatoria entre ambos sin respaldo del backend.

## Invariantes

1. Backend, esquemas Pydantic, Alembic, PostgreSQL y permisos empresariales no se modifican.
2. No se crean descuentos, precios promocionales, cobros, liquidaciones, QR, movimientos de inventario, ventas ni compras. Son datos informativos proporcionados por el proveedor.
3. El formulario nunca envía atributos de tenant, estado o identificador del proveedor como campos editables. Cada promoción sí incluye su propio UUID, días, payment_method y benefit.
4. Solo TITULAR_ADMINISTRATIVO o ADMINISTRADOR de empresa activa pueden crear/editar (autoridad final en FastAPI). Trabajador o empresa ajena solo pueden ver lo que permitan sus roles.
5. No hay replay de POST/PATCH del proveedor: si la red falla con resultado incierto se bloquea el reenvío hasta reconsultar. Si el POST/PATCH confirmado es seguido por un fallo de GET, no se reescribe.
6. Los métodos D2A para contacto aislado permanecen sin modificaciones de comportamiento: continúan enviando únicamente los once campos de contacto, y los métodos legacy de compras se mantienen.

## Validación

- Frontend TypeScript/Vite build y Oxlint.
- npm run test:supply-real ahora también incluye frontend/tests/supplier-promotions-real.test.mjs: formato exacto de POST/PATCH, días válidos 0–6, valores duplicados, límites, IDs, preservación de campos protegidos, 403/404/409/422 y red incierta sin reenvío.
- E2E frontend/e2e/real/catalog-suppliers-visual.spec.ts: crear proveedor con pagos y promociones, inspeccionar ficha, cancelar edición de día, editar días y beneficio, agregar segunda regla y comprobar persistencia después de recargar y consultar API. Usa PYME_DISPOSABLE_QA=1 sobre PostgreSQL efímero.
- Revisar manualmente en 390 px, 768 px y escritorio; tener en cuenta que la selección de días y medios no aplica dinero en Compras.

## QA manual

1. Crear proveedor de prueba, marcar Efectivo y Mercado Pago, agregar una promoción para lunes/miércoles/viernes, con medio requerido Mercado Pago y beneficio.
2. Guardar: Ver ficha debe mostrar medios, días y beneficio.
3. Editar: verificar precarga. Cambiar días, cancelar y volver a abrir: no debe persistir el borrador.
4. Editar: agregar otra promoción (por ejemplo martes, Transferencia), guardar, recargar y comprobar ambas reglas.
5. Quitar una regla, guardar y comprobar que se quitó de PostgreSQL. Verificar que otra empresa no la vea y que no haya movimientos comerciales.
6. Probar validación: beneficio vacío, más de ocho reglas, días independientes y mobile responsive.

## Cierre de revisión visual y warnings (12/11/2026)

El usuario probó Catálogo y Proveedores REAL, confirmó el funcionamiento de la ficha, medios de pago y promociones por días, y aprobó el diseño actual sin solicitar aún una nueva iteración estética. No se cambian estructuras de tarjeta, contratos ni reglas de comercio.

Advertencias encontradas en el entorno de QA:

- Dos imports de tipos sin uso en el recorrido E2E de compra → venta: se eliminan sin modificar el test.
- React Compiler omitía optimizar un hook del POS por una dependencia `location` derivada de una lista creada en cada render: se estabiliza con `useMemo` la lista de sedes autorizadas y la sede seleccionada, conservando los mismos filtros, permisos y resultados.
- Vite emite advertencia de bundle por un chunk JS inicial de aproximadamente 802 kB: es un aviso no bloqueante de rendimiento, no un error. **Diferido**: analizar lazy loading por sección e impacto sobre shell/login/QA antes de introducir code splitting. No ocultar el aviso artificialmente aumentando el límite.
- La documentación y la evidencia de QA deben registrar el resultado de CI posterior a estos ajustes, sin afirmar que la suite ejecutó si aún está pendiente.

**Se conserva el orden de integración** de los PR apilados (#50 → #51 → #52 → #53 → #54) y no se interpreta esta aprobación funcional como autorización automática para modificar `main`.

## Integración

PR apilado DRAFT contra la rama E3-1D2A, no contra main, sin merge automático. Se exige CI, QA manual y aprobación expresa de PR #50 → #51 → #52 → #53 → #54, en orden.
