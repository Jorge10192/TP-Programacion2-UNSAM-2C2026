# E1-B10 — Imágenes locales por ficha

**Estado:** cambios publicados en `main`. Pendiente: `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run test:images` y validación visual del equipo.

## Objetivo

Atender la observación del usuario: faltaba poder seleccionar imágenes para artículos/servicios, proveedores, perfil personal y ubicaciones. También se habilita un logo o imagen comercial para el negocio. Se conserva el flujo original de edición, sin importar imágenes de los HTML de referencia, sin subir fotos a un backend y sin almacenar originales completos en `localStorage`.

## Alcance

- **Catálogo:** en `Editar` una ficha existente aparece «Imagen del artículo o servicio» con selector, reemplazo y eliminación. La tarjeta y «Ver ficha» muestran la imagen si está guardada; de otro modo mantienen el ícono por tipo. Para una nueva ficha, primero se registra el artículo y después se abre «Editar».
- **Proveedores:** lo mismo desde «Editar proveedor»; foto en el directorio y en la ficha de detalle.
- **Ubicaciones:** lo mismo desde «Editar ubicación»; foto de portada en su tarjeta. Los enlaces de Maps son independientes de las imágenes.
- **Datos de la Empresa:** logo o imagen comercial en la ficha, Inicio personal y panel general del negocio; si no se carga, aparecen sus iniciales.
- **Mi perfil:** foto opcional, reemplazo y eliminación. Se visualiza en la ficha personal, en el avatar del perfil y en el avatar de la barra superior. Las iniciales se mantienen como alternativa, no se confunden con el cargo laboral por empresa.
- **Estado de la ficha:** seleccionar/eliminar una imagen guarda **inmediatamente** y de forma independiente a «Guardar cambios» de otros campos. «Cancelar edición» no deshace la foto si ya se cargó; el selector informa ese comportamiento.

## Arquitectura técnica

- `src/data/demo/imagePolicy.ts`: claves de identidad y validaciones puras.
- `src/data/demo/imageStorage.ts`: blobs optimizados en **IndexedDB** del origen web (`asistente-pyme-demo-images`, objeto `images`). CRUD asíncrono con notificación de cambios mediante un evento de ventana y URLs `blob:` revocables.
- `src/features/common/DemoPhoto.tsx`: selector reutilizable y componente de miniatura `DemoPhoto`, sin dependencia del dominio.
- Las claves son tuplas serializadas de **[tipo, businessId, entityId]** para empresa/artículo/proveedor/ubicación; la del perfil es única `['profile', 'demo-user']`. Una misma ficha de diferentes empresas **no comparte foto**.
- Sólo se acepta **JPG, PNG y WebP**, hasta 8 MB original. La imagen se decodifica y reduce conservando aspecto a un máximo de **512 px por lado**, se convierte a WebP y se valida el blob optimizado (hasta 400 KB). No se admiten SVG, GIF animado, PDFs ni URLs externas como imagen.
- La foto se conserva **sólo en ese navegador y origen**, no en GitHub, no en el almacenamiento del sistema operativo, no en el servidor y no en la copia de seguridad de `localStorage`. Los permisos y el aislamiento son únicamente de UX local.
- Clave `localStorage` existente **sin modificar**: `asistente-pyme.e1a2.demo.v1`. Los cambios de imágenes no mutan `DemoSnapshot`, Catalog, Compras ni el ledger de Inventario.
- Si el navegador bloquea IndexedDB o alcanza su cuota, muestra un error y la ficha textual continúa funcionando. No se prometen fotos entre dispositivos, persistencia tras borrar datos del sitio, ni funciones de colaboración.
- Un registro nuevo debe existir previamente para formar la clave de imagen. Se evita relacionar una imagen con un borrador sin ID. No hay borrado definitivo de fichas en esta DEMO; la futura limpieza de blobs huérfanos y el almacenamiento en el backend quedan pendientes.

## Comandos para verificar en Windows

Desde `plataforma-pyme/frontend`:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:images
npm.cmd run test:catalog
npm.cmd run test:suppliers
npm.cmd run test:inventory
npm.cmd run dev
~~~

## Pruebas manuales

| Código | Caso | Esperado |
|---|---|---|
| IMG-01 | Catálogo → artículo existente → Editar → Elegir imagen JPG | Vista previa y tarjeta muestran foto; «Ver ficha» también |
| IMG-02 | Reemplazar JPG por PNG o WebP | Se actualiza la imagen sin duplicar fichas |
| IMG-03 | Quitar foto | Reaparece el ícono por defecto y no cambia la ficha comercial |
| IMG-04 | Proveedores → Editar → Elegir foto | Directorio y detalle muestran la imagen |
| IMG-05 | Ubicaciones → Editar → Elegir foto | Su tarjeta muestra la foto |
| IMG-06 | Mi perfil → Elegir foto | Aparece en perfil y avatar superior; las iniciales siguen disponibles al quitarla |
| IMG-07 | Recargar F5, navegar y volver | La foto permanece en el mismo navegador |
| IMG-08 | Elegir archivo SVG, GIF o mayor a 8 MB | Mensaje de validación, sin imagen inválida |
| IMG-09 | Cambiar entre WALOS y otra empresa con artículos/proveedores de igual nombre | La foto no se comparte entre entidades/empresas |
| IMG-10 | Comprar/recibir, mover stock y guardar catálogo luego de subir foto | Ningún saldo ni movimiento cambia por una foto |
| IMG-11 | Crear artículo/proveedor/ubicación nuevos | Primero guarda la ficha, luego permite asociar foto desde «Editar» |
| IMG-12 | Pantalla angosta | Selector, botones y miniatura siguen operables |
| IMG-13 | Ocultar/borrar datos del sitio en navegador | Se advierte que también pueden perderse las fotos; no se promete sincronización |

| IMG-14 | Datos de la Empresa → elegir logo | Se muestra en ficha comercial, panel e Inicio personal; no aparece en otro negocio |

## Pendientes para producción y TP3

Migrar a almacenamiento seguro de objetos con autenticación, autorización real por empresa, límites/cuotas por tenant, validación server-side del formato y contenido, eliminación con borrado de entidad, URLs firmadas de acceso, backups y pruebas de concurrencia. No usar fotos personales reales para pruebas de la demo local.
