# Diagramas 03A, 03B y 03C — Asistente PyME

**Estado E2-3 E (08/11/2026):** identidad, empresas, equipo e invitaciones (E2-1), ubicaciones y asignaciones (E2-2), y Catálogo (E2-3) disponen de backend real. **Proveedor continúa TO-BE**; compras, stock y ventas todavía no consumen el catálogo ni la política operacional de sedes. Las láminas son representaciones del modelo y no sustituyen la autorización de servidor.

El [Documento 03](../03_MODELO_DE_DOMINIO_Y_UML.md) describe el modelo completo, estados, transacciones y restricciones. Cada diagrama posee una **explicación detallada en Markdown**, una **lámina SVG vectorial** para GitHub/presentación y una **fuente PlantUML** para revisar su semántica.

| Diagrama | Explicación | Lámina vectorial | Fuente PlantUML |
|---|---|---|---|
| **03A — Identidad y catálogo** | [Guía v0.7 E2-3 E](03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md) | [SVG editorial actualizado](03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg) | [PUML emisor/aceptante](03A_CLASES_IDENTIDAD_Y_CATALOGO.puml) |
| **03B — Comercio e inventario** | [Guía completa](03B_EXPLICACION_COMPRAS_INVENTARIO_VENTAS.md) | [SVG](03B_COMERCIO_INVENTARIO_REDISENADO.svg) | [PUML](03B_CLASES_COMERCIO_E_INVENTARIO.puml) |
| **03C — Casos de uso** | [Guía completa](03C_EXPLICACION_CASOS_DE_USO.md) | [SVG](03C_CASOS_DE_USO_REDISENADO.svg) | [PUML](03C_CASOS_DE_USO.puml) |

**Cómo usarlos:** el SVG es la composición editorial aprobada, con textos y trazos vectoriales; el PUML contiene el modelo editable, pero el motor de PlantUML puede colocar cajas y líneas en posiciones diferentes. En 03B se simplificaron deliberadamente las relaciones entre paneles para lograr una presentación legible; la semántica de las referencias y los controles SQL se explica en la guía y el documento general.

**Convenciones:** 1 = uno, 0..1 = opcional, 0..* = muchos opcionales, 1..* = al menos uno; las composiciones se indican con rombo cuando corresponde. Los colores separan conceptos y **no crean clases ni permisos**.

Para dar clase o exponer, abrir el SVG. Para preparar SQLAlchemy, leer el Documento 03 y las guías; no convertir un diagrama conceptual directamente en tablas sin validar permisos y restricciones.

**Sincronización C.5 (08/11/2026):** 03A corresponde a la identidad, empresas, membresías e invitaciones reales de E2-1. La relación Usuario–Invitación del SVG representa al **emisor obligatorio**; la fuente PlantUML incluye también al **aceptante opcional**. El destinatario se identifica por correo sin FK previa. Ubicaciones, catálogo y proveedores siguen TO-BE para backend. 03B y 03C se conservan sin modificaciones.

**Actualización E2-2 C:** fuente 03A y SVG editorial reconciliados con `locations`, incluyendo `CASA`, `ACTIVA/PAUSADA`, permisos de gestión por rol empresarial y principal única activa por empresa. La guía explica que asignaciones de personal y autorización granular por ubicación aún **no están implementadas**. 03B/03C permanecen sin cambios.

**E2-2 D:** la fuente 03A PlantUML suma `AsignacionUbicacion` con relaciones a Membresía y Ubicación y reglas FK por tenant. El SVG es una lámina editorial resumida sin esa caja adicional, cuyo detalle está documentado en la guía. E2-1 y 03B/03C no fueron modificados; validación local D pendiente.

**E2-3 E (cierre Catálogo):** 03A PUML contiene `ArticuloCatalogo` real con clasificación `kind` (ELABORADO/REVENTA/INSUMO/SERVICIO), tipo BIEN/SERVICIO **derivado y no almacenado**, SKU/nombre normalizados, unidad y restricciones, importes BIGINT opcionales, estado ACTIVO/INACTIVO y cinco operaciones REST. El SVG mantiene una selección editorial compacta de atributos; la guía 03A registra correspondencia completa. **580 pruebas locales Windows aprobadas** y CI 3/3 sobre código D. `Proveedor` permanece TO-BE, 03B y 03C no fueron modificados. Las secciones históricas anteriores describen sus respectivos cortes.
