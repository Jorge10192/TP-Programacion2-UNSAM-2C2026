# E3-2A — Auditoría técnica previa a QA manual

**Alcance:** PR #65 de fotos privadas en REAL sobre `main` E3-1; validación estática de arquitectura, contratos, DB, autorización, almacenamiento, frontend y tests.
**Resultado del análisis del código:** implementación funcional completa, con controles de seguridad reforzados; QA manual visual **todavía pendiente**.
**Evidencia de CI del HEAD final:** completar una vez terminen las verificaciones automáticas de la rama tras este documento.

## 1. Requisitos y trazabilidad

| Requisito | Evidencia de código | Estado |
|---|---|---|
| 1 foto personal | `PhotoService.upload` (slot único), `RealAuthApp`, `RealPhotoManager` | Implementado |
| 1 foto empresa | `/photos/businesses/{id}`, `RealBusinessesPage` | Implementado |
| Múltiples fotos de artículo/servicio | 8 slots (0–7), `RealCatalogPage`, `RealPhotoPreview` | Implementado |
| 1 foto opcional proveedor | `/photos/businesses/{id}/suppliers/{id}`, `RealSuppliersPage` | Implementado |
| Portada en POS | `RealPosPage` + primera foto del catálogo | Implementado |
| Sin romper stock, caja ni pagos | Modelo y API aditivos, sin mutar fichas comerciales | Revisado por código; CI E2E requerida |

## 2. Seguridad, privacidad y tenants

- Toda lectura y escritura de imágenes exige Bearer real. Fotos de perfil limitadas al usuario autenticado. Los integrantes activos pueden consultar fotos empresariales; solo titular/administrador puede escribir en empresa activa.
- Se resuelve `business_id` y se comprueba existencia y pertenencia del recurso catálogo/proveedor; actor ajeno recibe 404 sin acceso a bytes.
- La descarga verifica permisos antes de seleccionar la columna BYTEA; POST realiza control anticipado de autorización antes de decodificar bytes y **revalida bajo lock** al guardar (mitiga abuso y TOCTOU). DELETE revalida bajo lock.
- `PhotoAsset` limita slots, tamaño, MIME y dimensión con CHECKs y UNIQUE en PostgreSQL. Una sustitución de foto única se confirma o revierte atómicamente.
- JPEG/PNG/WebP estáticos se decodifican y normalizan a WebP sin EXIF, con protección 5 MiB/12 MP/1280 px y transparencia PNG conservada. No se admite SVG, GIF animado ni importación de URL externa.
- Las vistas React descargan blobs con encabezado Bearer en memoria. No almacenan fotos o credenciales en localStorage ni insertan token en URL. Revocan object URLs al desmontar.
- CPU de Pillow y escrituras SQL de los POST se ejecutan fuera del event loop; el backend sigue usando PostgreSQL real, no guardado en memoria del navegador.

## 3. Migración y consistencia

- `e32a_photo_assets` incorpora `photo_assets` después de `e26a_sales_foundation`; las otras tablas permanecen intactas. `alembic check` en CI debe confirmar identidad con SQLAlchemy.
- `get_content` tiene lectura en dos fases (ACL, luego BYTEA); las fotos no se exponen como directorio estático público.
- Revertir migración con datos de fotos está expresamente bloqueado para prevenir pérdida accidental.
- Las pruebas de PostgreSQL deben crear datos dentro de DB efímera y/o transacción externa revertible.

## 4. Compatibilidad y pruebas automáticas

- Backend: normalización, formatos inválidos, transparencia, autenticación, sustitución, ocho posiciones, borrado, permisos, lectura entre tenants y acceso de trabajador.
- Frontend: contrato de URL/token, upload FormData, validación tamaño/MIME, errores HTTP, parseo de metadatos, vista previa, states.
- E2E REAL Playwright: perfil con reemplazo, empresa con logo, galería servicios, proveedor con borrado, imagen portada en POS; pantalla 390px; regresión DEMO y funcionalidades anteriores.
- No se ejecutó migración ni pruebas manuales en la base local personal del usuario.

## 5. Hallazgos de auditoría corregidos en la rama

| Prioridad | Hallazgo detectado | Corrección |
|---|---|---|
| Alta (rendimiento) | Decodificación Pillow de imágenes en funciones async bloqueaba el event loop | `run_in_threadpool` durante conversión |
| Media (rendimiento/privacidad) | Acceder al recurso por UUID cargaba BYTEA antes de confirmar ACL | Lectura selectiva de metadata y, después de autorización, bytes |
| Media (abuso) | POST no autorizado procesaba primero la imagen | Autorización anticipada y revalidación al guardar |
| Media (rendimiento) | Operaciones DB de carga dentro de handlers async | SQL de POST movido a threadpool |
| Media (UX) | Foto cargada parcialmente podía dejar portada local desactualizada | Reconsulta y revisión de callback tras respuesta incierta |
| Media (QA) | Test antiguo ataba HEAD Alembic al corte de ventas | Test dinámico del HEAD real |
| Media (QA) | Selectores de empresa podían coincidir con opciones ocultas | Playwright identifica la tarjeta; POS usa scrollIntoView |

## 6. Observaciones no bloqueantes y deuda futura

| Severidad | Observación | Recomendación |
|---|---|---|
| Media | `owner_id` es polimórfico y no posee FK específica a user/catálogo/proveedor. Hoy no existen borrados físicos de fichas; en el futuro podría requerir limpieza de imágenes huérfanas. | Si se incorporan bajas físicas, crear política de cascada o limpieza transaccional verificada |
| Media | Portadas de listados y POS se consultan con un GET por recurso visible; con cientos de tarjetas habría múltiples consultas de metadatos y bytes. | Medir en QA y estudiar endpoint de portadas en lote/miniaturas separadas |
| Media | POST de foto de catálogo no lleva clave explícita de idempotencia. Tras timeout el usuario podría repetir manualmente y generar foto duplicada. La UI no reintenta automáticamente. | Analizar clave de idempotencia/reconciliación si se incrementa el volumen |
| Media | BYTEA en PostgreSQL es correcto para el prototipo pero incrementa respaldos y costo de almacenamiento. | En producción de volumen elevado, migrar a bucket de objetos privado y mantener metadatos/ACL |
| Baja | No hay recorte ni selección manual de foto principal/reordenamiento de galería. | Decidir tras QA de usabilidad, sin bloquear MVP |
| Baja | HEIC/HEIF no admitido por el primer contrato. | Evaluar conversión segura en una futura etapa |
| Media | No se incluyó rate limit específico ni escaneo antimalware de servicio externo; el formato se redecodifica y restringe. | Antes de exponer cargas a Internet, revisar controles perimetrales y cuotas por tenant |

## 7. Veredicto y puerta de aceptación

**Apto para pruebas manuales únicamente si CI final termina completamente verde**, sin fallas de pruebas unitarias/integración, migración, frontend, navegación REAL y regresión DEMO. Las observaciones de la sección 6 no requieren refactorizar el módulo para el MVP pero deben mantenerse visibles en el backlog. Validar en Windows con base QA separada y las pruebas `E3-2A_GUIA_QA_MANUAL_WINDOWS.md`.

**No hay autorización para merge a main** hasta que el usuario revise las pantallas, valide M01–M18 y apruebe explícitamente.
