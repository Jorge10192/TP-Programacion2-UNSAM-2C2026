# E1-B5 — Catálogo general de productos y servicios (DEMO)

**Estado:** código publicado en GitHub main. Build, lint, test y recorrido visual local PENDIENTES.
**Base:** E0-A Z069 (catalogo_modulo2.html), Z050 (M2 v5.1), especificación funcional del módulo 2 v5.1, backlog E0-C E1-B2-01 y ADR-004 propuesto.

## Alcance

Se integró un catálogo multirrubro por empresa. WALOS sólo es un fixture y no determina el contenido ni los nombres obligatorios.

- **Elaboración propia, Reventa, Insumo/material y Servicio** son tipos de comportamiento diferentes de la categoría visual.
- Nombre obligatorio, tipo, categoría libre, SKU opcional, unidad de control, descripción, precio opcional y costo de referencia opcional. Campo independiente para indicar si se ofrece a la venta.
- Un servicio usa unidad SERVICIO y **nunca crea existencia física**. La creación de cualquier artículo tampoco crea stock, caja, compra, proveedor ni receta.
- SKU único **por empresa** cuando se informa, normalizado a mayúsculas. Puede repetirse entre empresas. La identidad interna usa un UUID independiente.
- Nombre único por empresa ignorando espacios repetidos y mayúsculas; no se reutiliza mientras exista una ficha inactiva con ese nombre.
- Precio y costo en **centavos enteros de ARS**. El formulario admite importes como 1250,50; 1250.50; 1250. Sin separadores de miles. Vacío equivale a no informado o a cotizar.
- Las unidades caja, paquete, kg, gramo, unidad, ml o litro NO implican equivalencias automáticas. Conversión explícita pendiente para Compras/Inventario.
- Buscar nombre, descripción, SKU o categoría; filtrar por tipo y estado. Guardar edición, desactivar/reactivar con confirmación sin borrar historial.
- Las empresas existentes parten con catálogo vacío; no se importan productos del HTML original como datos de empresas reales.
- Se permite editar tipo y unidad durante la DEMO porque todavía no hay movimientos asociados. Antes de ventas/inventario el servidor debe bloquear o versionar cambios incompatibles.

## Código

- frontend/src/data/demo/catalogPolicy.ts: tipos, unidades, validaciones, centavos enteros y normalización.
- frontend/src/data/demo/demoStore.ts: DemoCatalogItem indexado por ID, lectura por businessId, comandos de alta/edición/estado con pertenencia por empresa.
- frontend/src/features/catalog/CatalogPage.tsx: formulario, tarjetas, filtros, detalle, inactivación/reactivación.
- frontend/src/App.tsx: ruta /b/:businessId/catalogo; key por negocio para no transferir borradores.
- frontend/src/features/dashboard/Dashboards.tsx: acceso y cantidad de fichas activas.
- frontend/src/App.css: diseño responsive.
- frontend/tests/catalog-policy.test.mjs: pruebas de dinero/SKU/tipos.
- frontend/package.json: script npm.cmd run test:catalog.

## Persistencia

Se conserva la clave asistente-pyme.e1a2.demo.v1 con version 1; se agrega array opcional catalogItems. La lectura antigua conserva profile, createdBusinesses, fixtureEdits, memberJobs, locations, teamInvitations y teamMembers. No hay autenticación ni control de permisos real.

## Verificación pendiente

Desde la carpeta plataforma-pyme/frontend:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:catalog
npm.cmd run test:team
npm.cmd run test:maps
npm.cmd run dev
~~~

| ID | Prueba | Resultado esperado |
|---|---|---|
| CAT-01 | Abrir Catálogo en una empresa creada | Vacío, sin productos inventados |
| CAT-02 | Crear Servicio a cotizar | Unidad Servicio, cero stock propio |
| CAT-03 | Crear reventa SKU-01, precio 1250,50 | Se muestra monto ARS; código guardado |
| CAT-04 | Crear Insumo sin ofrecer venta | Precio no obligatorio |
| CAT-05 | Repetir SKU en misma empresa | Rechaza duplicado |
| CAT-06 | Repetir SKU en otra empresa | Permitido |
| CAT-07 | Repetir nombre cambiando mayúsculas | Rechaza duplicado |
| CAT-08 | Editar y presionar F5 | Guarda cambios |
| CAT-09 | Desactivar, filtrar Inactivos y reactivar | Ficha conservada, cambia contador |
| CAT-10 | Cambiar de A a B durante edición | No mezcla borradores |
| CAT-11 | Reabrir perfil, Equipo, Ubicaciones y Maps | Datos anteriores intactos |
| CAT-12 | Ingresar 1.234,50, -10 o tres decimales | Rechaza importe ambiguo/inválido |
| CAT-13 | Ancho móvil de 390 px | Filtros y tarjetas legibles |
| CAT-14 | Build, lint y tres test scripts | Cero errores |

## Fuera de este corte

Fotos y galería 0–3, código de barras, imágenes, componentes/recetas, guías de elaboración, proveedores, existencias físicas, vencimientos y operaciones. Se abordarán en siguientes incrementos, preservando los requisitos del TP3.
