# E1-B3.1 — Google Maps y compartir ubicaciones (sin API)

**Estado:** integrado en el frontend React de main. Build, lint y prueba manual local pendientes de confirmar.

## Referencia

HTML original de Ubicaciones proporcionado por el equipo: formularios con «Link de Google Maps (URL)», botón «Ver en Google Maps» y acción «Compartir Ficha Completa». Las capturas aportadas sirven de referencia de presentación, no de fuente de datos.

## Decisiones implementadas

1. Al **crear o editar una ubicación**, la dirección sigue siendo opcional; se agrega **Enlace de Google Maps (opcional)**. Se pega un vínculo copiado desde Google Maps. No hay necesidad de API key.
2. El botón «Buscar esta dirección en Google Maps» abre una **búsqueda** de la dirección escrita usando la API pública de URLs de Google Maps. Una búsqueda **no es una geolocalización verificada**: el usuario debe confirmar el lugar en Maps, compartirlo y pegar el enlace si necesita un punto exacto.
3. En cada tarjeta, con enlace guardado aparece «Ver ubicación en Google Maps»; si no hay enlace pero sí dirección, aparece «Buscar dirección en Google Maps», que **no** afirma que sea un lugar exacto. Sin ninguno se indica «Sin mapa ni dirección asignados».
4. «Copiar ubicación» genera nombre de negocio, nombre del lugar, referencia y vínculo, sólo tras acción explícita. Usa portapapeles del navegador, con fallback de texto seleccionable si el navegador no lo permite.
5. Se aceptan solamente vínculos HTTPS de Google Maps con hosts y rutas permitidos. Se rechazan esquemas inseguros, URLs externas y credenciales incrustadas. Al leer localStorage, enlaces inválidos se ignoran sin descartar la ubicación.
6. La propiedad `mapUrl` se guarda **opcionalmente** dentro de cada ubicación, en la **misma clave y versión de almacenamiento** que antes; las ubicaciones existentes sin `mapUrl` se cargan con cadena vacía. No se borran empresas, perfiles, datos de negocio ni funciones laborales.
7. No se incrusta iframe ni se envía a Google una búsqueda de fondo: Google Maps se abre en pestaña nueva sólo si la persona pulsa el enlace. El botón de búsqueda sí comparte con Maps la dirección escrita en la URL de búsqueda.
8. No se comparten automáticamente direcciones de lugares privados, y no se copian fichas de responsables, teléfonos ni permisos. El usuario decide si pegar el texto copiado en otra aplicación.

## Pendiente para integración avanzada

El selector visual de un pin **dentro** de la plataforma, búsqueda autocompletada, geocodificación de dirección, vista previa embebida, permisos de compartir y fotos requieren una decisión posterior sobre Google Maps Platform, condiciones de uso, privacidad y credenciales/API. No fingir un mapa con imágenes de marcador de posición.

## Archivos

- `frontend/src/data/demo/mapsLinks.ts`: validación, URL de búsqueda y texto para copiar.
- `frontend/src/data/demo/demoStore.ts`: `mapUrl` en DTO, comandos y lectura persistente compatible.
- `frontend/src/features/locations/LocationsPage.tsx`: enlace en formulario, abrir/buscar/copiar desde tarjeta.
- `frontend/src/App.css`: estilos responsivos.

## Casos para validar en VS Code

Desde `plataforma-pyme/frontend`: `git pull --ff-only origin main`, `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run dev`.

| Caso | Procedimiento | Esperado |
|---|---|---|
| MAP-01 | Crear ubicación sin dirección ni enlace | Se guarda; la tarjeta indica que no hay mapa |
| MAP-02 | Completar sólo una dirección ficticia | Botón de **búsqueda** en Maps, no marcador confirmado |
| MAP-03 | Pegar enlace real copiado desde Google Maps de un lugar público | Guardar, F5, abrir enlace en pestaña nueva |
| MAP-04 | Pegar `https://maps.app.goo.gl/...` | URL admitida si su formato es válido |
| MAP-05 | Pegar `javascript:...` o un host imitador de Google | Error visible, no se guarda ni abre |
| MAP-06 | Copiar ubicación | Pega el nombre, dirección de prueba y link en un bloc de notas |
| MAP-07 | Denegar portapapeles en el navegador | Ofrece texto seleccionable manualmente |
| MAP-08 | Cambiar A→B y volver | Enlaces y direcciones no se cruzan |
| MAP-09 | Cargar ubicaciones creadas antes de añadir `mapUrl` | Datos anteriores intactos |
| MAP-10 | Reducir ancho a 390 px | Controles legibles, sin desbordamiento |
| MAP-11 | Build + lint | Sin errores ni advertencias |

**Precaución de privacidad:** usar datos ficticios para las pruebas. El usuario debe confirmar que el enlace corresponde al sitio correcto antes de compartirlo.

Referencia técnica externa: https://developers.google.com/maps/documentation/urls/get-started y ayuda de Google Maps sobre «Compartir o incorporar mapa».
