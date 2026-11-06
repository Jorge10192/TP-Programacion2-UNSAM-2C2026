# E1-B3.1 — Enlaces de Google Maps y copia de ubicaciones

**Estado:** implementado en GitHub main; pendientes build, lint y comprobación de navegador del equipo.
**Referencia:** archivo original `Ubicaciones.html`, especialmente formulario con Link de Google Maps, tarjetas con Ver en Google Maps y opción Compartir Ficha Completa.
**Alcance:** ubicación de cada empresa DEMO, sin geocodificación automática, API Key ni iframe de Google Maps.

## Capacidades implementadas

1. Dentro de `/b/:businessId/ubicaciones`, crear o editar ubicación con un **enlace de Google Maps opcional**.
2. El formulario permite **Buscar esta dirección en Google Maps**: abre en nueva pestaña una URL oficial de búsqueda construida con `https://www.google.com/maps/search/?api=1&query=...`. Si no hay dirección, abre la página inicial de Maps.
3. El usuario puede elegir una ubicación en Google Maps y usar **Compartir → Copiar enlace**. Al volver al formulario, pega ese enlace, lo guarda y luego aparece **Ver ubicación en Google Maps**.
4. Si se cargó **sólo una dirección**, la tarjeta dice **Buscar dirección en Google Maps**. No se confunde la búsqueda con una coordenada verificada.
5. **Copiar ubicación** copia voluntariamente el nombre de empresa, nombre de la ubicación, referencia ingresada y un enlace a Maps. Si el navegador rechaza el portapapeles, presenta un área de texto para copia manual.
6. Si no hay enlace ni dirección, no se habilita el botón Copiar.
7. Validación: únicamente HTTPS y hosts/rutas propios de Google Maps (Google Maps web y enlaces cortos `maps.app.goo.gl` y `goo.gl/maps`), sin credenciales ni puertos no estándar. Rechazar otros sitios, `javascript:` o enlaces abiertos a `google.com/url`.
8. El modelo `DemoLocation` incorpora `mapUrl`; `LocationInput`, alta/edición y carga de `localStorage` son compatibles con ubicaciones ya existentes que no tengan este campo. La clave de persistencia NO cambia: `asistente-pyme.e1a2.demo.v1`.
9. Toda URL de contenido almacenado se revalida al abrir. No hay navegación automática hacia terceros ni publicación de la dirección; la copia sólo sucede al pulsar el botón.
10. El scope sigue siendo por `businessId`. No se integran lugares o direcciones de WALOS como predeterminados de otras empresas.

## Qué no hace

- No permite pinchar directamente sobre un mapa dentro de Asistente PyME y obtener coordenadas automáticamente.
- No verifica que una dirección corresponda a un local ni que un enlace corto apunte a la ubicación que el usuario desea.
- No registra latitud, longitud ni Place ID; si se requiere precisión para entregas o reparto, hay que diseñar ese modelo y evaluar Google Places/Maps JavaScript API, costos y restricciones de uso.
- No envía mensajes de WhatsApp o correo ni publica la ubicación; sólo copia texto a demanda.
- No incrusta imágenes falsificadas de mapas o fotografías procedentes del HTML antiguo.

## Archivos

- `frontend/src/data/demo/mapsLinks.ts`: normalización segura, búsqueda de Google Maps y texto de copia.
- `frontend/src/data/demo/demoStore.ts`: propiedad `mapUrl` y carga compatible con estado guardado.
- `frontend/src/features/locations/LocationsPage.tsx`: campo, búsqueda, enlaces, copiar/fallback.
- `frontend/src/App.css`: presentación y responsive.
- `frontend/tests/maps-links.test.mjs`: tests unitarios de las URLs.
- `frontend/package.json`: script `test:maps`.

## Validación requerida — no ejecutada en esta entrega

Desde `plataforma-pyme/frontend`:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:maps
npm.cmd run dev
~~~

| ID | Recorrido | Esperado |
|---|---|---|
| MAPS-01 | Editar ubicación previamente creada sin mapUrl | Los campos anteriores intactos, enlace nuevo vacío |
| MAPS-02 | Pegar enlace oficial `https://maps.app.goo.gl/...`, guardar y recargar F5 | Enlace persistido; abre Google Maps al pulsarlo |
| MAPS-03 | Ingresar dirección ficticia sin enlace | Tarjeta dice «Buscar dirección en Google Maps» |
| MAPS-04 | Copiar ubicación con enlace compartido | Copia nombre y URL precisa compartida |
| MAPS-05 | Copiar ubicación con sólo dirección | Texto indica expresamente que es una búsqueda sin verificar |
| MAPS-06 | Enlace `javascript:`, `http:` u otro dominio | Rechazo y mensaje, datos anteriores intactos |
| MAPS-07 | Negocio A con enlace, alternar a B, guardar distinto, F5 | No hay cruces entre empresas |
| MAPS-08 | Navegador sin permiso de portapapeles | Se muestra texto editable sólo para selección/copia manual |
| MAPS-09 | Pantalla de 390px | Controles y enlaces accesibles sin desbordamiento |
| MAPS-10 | Actualizar versión desde antiguo E1-B3 | Sin pérdida de perfil, empresas, puestos ni ubicaciones previas |

## Referencia externa

Documentación oficial de Google Maps URLs, `api=1` para búsquedas y URLs universales, sin API key: https://developers.google.com/maps/documentation/urls/get-started

## Evolución futura

El mapa interactivo con selección de marcadores, almacenamiento preciso de coordenadas y comprobación de direcciones debe incorporarse sólo si el uso del producto lo exige. Por ahora las URLs compartidas resuelven el caso de uso de forma directa, sin servicios externos de pago ni exposición automática de datos.
