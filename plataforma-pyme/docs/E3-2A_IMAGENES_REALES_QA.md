# E3-2A — Imágenes REAL: perfil, empresa, catálogo y proveedores

**Estado:** incremento en PR #65 (DRAFT) sobre `main`. No habilitar en el PostgreSQL local sin aprobación y respaldo previo.  
**Fecha:** 12/11/2026.  
**Alcance:** fotos propias y privadas para identidad del usuario, tenant y catálogo; sin cambiar inventario, caja, ventas o pagos.

## Reglas funcionales

| Recurso | Cantidad | Quién puede cargar/quitar | Quién puede ver |
| --- | --- | --- | --- |
| Perfil personal | 1 | El titular de la sesión autenticada | Solo el titular |
| Empresa | 1 | Titular administrativo o Administrador en empresa ACTIVA | Miembros activos de la empresa |
| Catálogo de bienes y servicios | Hasta 8 por ficha | Titular administrativo o Administrador en empresa ACTIVA | Miembros activos de la empresa |
| Proveedor | 1 opcional | Titular administrativo o Administrador en empresa ACTIVA | Miembros activos de la empresa |

Los servicios admiten galería igual que los bienes, pero **nunca** requieren stock por tener fotos. Los proveedores y las otras entidades se deben crear primero y luego fotografiar desde su ficha. La primera foto del catálogo por `position` es la portada que se muestra en las tarjetas y POS. Cualquier usuario con permiso de consulta puede verla. El stock, precios y permisos comerciales no cambian.

## Persistencia y contrato

Migración nueva: `e32a_photo_assets`, posterior a `e26a_sales_foundation`, aditiva. Tabla `photo_assets`: `id`, `owner_type`, `owner_id`, `business_id` (NULL únicamente para PROFILE), `position`, `width`, `height`, `byte_size`, `mime_type`, `content` (BYTEA), `created_at`.

Se usa PostgreSQL para que las fotos sobrevivan a reinicios de FastAPI, contenedores y máquinas sin un directorio local arbitrario. **Trade-off:** los respaldos de PostgreSQL incluirán las fotos y crecerán según el uso. Para producción con mucho volumen, migrar blobs a un almacén de objetos privado con control de acceso, conservando UUID y metadata. Las fotos no forman parte del bundle de React ni de la carpeta Git.

API (siempre con Bearer):
- `GET /api/v1/photos/me`, `POST /api/v1/photos/me`.
- `GET/POST /api/v1/photos/businesses/{business_id}`.
- `GET/POST /api/v1/photos/businesses/{business_id}/catalog/{item_id}`.
- `GET/POST /api/v1/photos/businesses/{business_id}/suppliers/{supplier_id}`.
- `GET /api/v1/photos/{photo_id}/content`, `DELETE /api/v1/photos/{photo_id}`.

POST utiliza `multipart/form-data` con un archivo `file`. Las colecciones GET retornan metadatos **sin bytes**, y los binarios se descargan por un GET autenticado, con `Cache-Control: private, no-store` y `nosniff`. Los bytes no son accesibles por URL pública ni se inyectan en `img src` con token; React hace `fetch` con Bearer solo en memoria, crea una `blob:` URL transitoria y la revoca al desmontar.

## Seguridad y validación

- JPEG/PNG/WebP **estáticos** únicamente; no se aceptan SVG (XSS), GIF animado ni carga de enlaces externos.
- Máximo 5 MiB de archivo recibido, 12 millones de píxeles de entrada, 1280 px de arista después de adaptar y 2 MiB almacenados.
- El backend verifica que la imagen **realmente se puede decodificar**; ignora extensión, nombre y headers para confiar en el contenido. Normaliza a WebP estático para quitar metadatos EXIF y reducir peso; se reescala sin perder proporciones.
- UUID de cada recurso se valida y verifica en PostgreSQL. La lectura requiere pertenencia activa a la empresa. Las escrituras exigen empresa ACTIVA + rol Titular/Administrador; no hay confianza en controles de UI.
- Lecturas GET no escriben. Reemplazar foto única borra la anterior y crea la nueva en la **misma transacción**. El índice único protege los slots de la galería. No hay reintentos automáticos tras una respuesta incierta: la UI actualiza la lista antes de sugerir otro intento.
- Se permite borrar una foto sin borrar ficha de artículo ni perder movimientos históricos.

## Flujo UX

1. Iniciar sesión REAL.
2. **Mi perfil** → Foto de perfil, seleccioná un JPG/PNG/WebP. Se previsualiza en la ficha y en el encabezado de perfil.
3. **Mi empresa** → Foto o logo; se muestra en el listado de empresas y en Datos de la empresa.
4. **Catálogo** → Crear artículo o servicio, abrir «Ver ficha» → Fotos, hasta 8. La primera foto aparece en la tarjeta y en el POS. En vista de lista las imágenes se consultan solo cuando sus tarjetas entran al viewport.
5. **Proveedores** → Crear proveedor, abrir «Ver ficha» → Foto opcional. Aparece también en la tarjeta del listado.
6. Para quitar, usar «Quitar foto» y confirmar. Los usuarios sin permiso solamente pueden visualizar las imágenes disponibles.

La cámara del dispositivo puede usarse mediante el selector del navegador cuando devuelve JPG/PNG/WebP; HEIC/HEIF, recorte manual, orden arbitrario de la galería y fotos públicas de escaparate no forman parte de este primer incremento.

## QA requerida antes de integrar

- `python -m alembic upgrade head` **exclusivamente en PostgreSQL descartable** en CI/QA y `python -m alembic check` sin diferencias.
- Python 3.12 y 3.14: pytest completo, prueba de foto inválida/extra grande, migración HEAD, catálogo con ocho fotos, reemplazo, acceso entre usuarios/empresas, miembro con solo lectura, descarga binaria autenticada.
- Frontend: `npm ci`, `npm run build`, `npm run lint`, `npm run test:auth` y regresión de toda la suite.
- Playwright E2E REAL en `PYME_DISPOSABLE_QA=1`: perfil, foto empresa, múltiples fotos de servicio, proveedor y miniatura POS en base efímera.
- QA manual: escritorio 1366 px y móvil 390 px; selección y reemplazo de foto, permiso de cuenta trabajador, acceso tras navegar, estado sin foto y visualización de fichas con 8 imágenes. No ejecutar POST en una base personal o productiva.

## Dependencias y límites de la etapa

Se incorporan `Pillow` y `python-multipart` al backend para verificar/normalizar imágenes. Los endpoints no alteran DTO de ventas, stock, pagos, catálogos ni proveedores; el nuevo recurso es aditivo y opcional. No se cambian archivos DEMO. La versión integrable requiere las suites verdes y aprobación visual de usuario. El PR queda DRAFT hasta ese momento.
