# E1-B5.1 — Ficha de catálogo ampliada y observaciones internas

**Estado:** código publicado en `main`. Build, lint, tests y QA visual en el equipo pendientes.
**Referencia visual:** `catalogo_modulo2(2).html` v8 y capturas del usuario del 06/11/2026. **Sin** incorporar datos preestablecidos del prototipo anterior.

## Cambios realizados

1. El botón **Ver ficha** abre una vista modal nativa HTML `dialog`, compatible con Escape, cerrar y clic fuera del contenido. No obliga a salir de la sección ni altera el menú principal de la plataforma.
2. La ficha muestra encabezado, categoría, tipo, estado, SKU, precio/costo y unidad de control; también muestra descripción comercial y fecha de alta/última modificación guardadas en DEMO.
3. Nuevo campo **Observaciones internas** independiente de **Descripción comercial**. No aparece en la tarjeta resumida ni en los resultados del buscador, sólo en la ficha y en su edición. Se limita a 600 caracteres.
4. Las fichas que existían antes de E1-B5.1 conservan sus datos; al cargarlas se normaliza observaciones como texto vacío. No se cambió la clave del almacenamiento local, la versión, los IDs, ni los demás módulos.
5. La ficha explica qué se integrará después: fotos, componentes/guías y proveedores; stock y vencimientos **no aparecen como cifras DEMO inventadas**.
6. Un servicio sigue sin existencias físicas. No se crearon ventas, compras, recetas, datos de proveedores ni permisos funcionales.
7. La función de observaciones es **organizativa, no confidencial**: el prototipo usa almacenamiento local del navegador sin seguridad ni autorización de servidor. Cuando haya backend se requerirán permisos reales para leer/editar notas internas.

## Archivos

- `frontend/src/data/demo/catalogPolicy.ts`: campo `observations` en `CatalogInput`, límite y fallback para fichas antiguas.
- `frontend/src/data/demo/demoStore.ts`: valida registros existentes con o sin observaciones.
- `frontend/src/features/catalog/CatalogPage.tsx`: edición del campo y apertura de ficha.
- `frontend/src/features/catalog/CatalogDetailDialog.tsx`: componente de vista modal, independiente del catálogo.
- `frontend/src/App.css`: estilos responsive del modal.
- `frontend/tests/catalog-policy.test.mjs`: casos nuevos de separación y migración.

## Verificación local

Desde `plataforma-pyme/frontend`:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:catalog
npm.cmd run dev
~~~

Pruebas de interfaz:

| Caso | Acción | Esperado |
|---|---|---|
| CAT-F01 | Abrir ficha de Peluquería/Servicio existente | Datos anteriores; observaciones vacías, sin cambios de precio |
| CAT-F02 | Editar ficha y completar observaciones | Guardar; se muestran sólo en ficha ampliada |
| CAT-F03 | Cambiar observaciones y descripción por separado | No se reemplazan mutuamente |
| CAT-F04 | Abrir ficha, presionar Escape | Se cierra el modal, vuelve al catálogo |
| CAT-F05 | Abrir ficha, hacer clic fuera | Se cierra sin descartar ficha |
| CAT-F06 | Abrir ficha, pulsar Editar ficha | Se cierra y aparece el formulario de la misma empresa |
| CAT-F07 | Cambiar empresa y volver | No arrastra ni mezcla la ficha y su observación |
| CAT-F08 | Recargar F5 | Datos del catálogo antiguo y observaciones nuevas persisten |
| CAT-F09 | Ver servicio en modal | No presenta stock ficticio |
| CAT-F10 | Pantalla móvil | Modal queda dentro del viewport y permite scroll |

## Postergado

Fotos 0..3 con principal, almacenamiento seguro de imágenes, código de barras, recetas/componentes, guías, proveedores, inventario y auditoría verificada. Son conceptos valiosos del HTML v8 pero se harán después de integrar entidades y operaciones, evitando URLs falsas o métricas de stock inventadas.
