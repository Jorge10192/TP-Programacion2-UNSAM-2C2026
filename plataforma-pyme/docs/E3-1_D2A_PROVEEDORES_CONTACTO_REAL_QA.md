# E3-1D2A — Proveedores REAL: identificación, contacto y edición

**Fecha:** 2026-11-12.
**Base:** PR #52, feature/e3-1d-catalogo-proveedores-visual, apilada sobre PR #51 y PR #50.
**Rama:** feature/e3-1d2a-proveedores-contactos-real.
**Estado:** corte independiente para PR DRAFT, sin merge a main ni modificación de bases locales.

## Alcance

Se completa el formulario de Proveedores REAL con los campos ya existentes en FastAPI/PostgreSQL: nombre comercial, persona de contacto, productos o servicios ofrecidos, teléfono, WhatsApp internacional, correo, dirección, Google Maps, sitio web HTTPS, Instagram y observaciones. Solo nombre es obligatorio.

- Crear y editar abren una pantalla exclusiva, con Volver a proveedores en la parte superior; no se expanden bajo el listado. Cancelar descarta el borrador.
- Editar precarga los datos del proveedor confirmado por el servidor.
- La ficha mantiene su lectura de datos y ofrece Editar proveedor solamente a miembros con permisos. Las tarjetas también permiten Editar.
- El formulario incluye opción Usar el teléfono comercial para WhatsApp, pero el valor resultante debe cumplir formato internacional.
- Se respetan longitudes, correo, formato telefónico, normalización de nombre, URL Google Maps oficial, sitio web público HTTPS, unicidad del nombre y permisos de backend.
- POST y PATCH guardan los campos de E3-1D2A en PostgreSQL; después de confirmarse la escritura se reconsulta la página. Si falla esa lectura, no se repite la escritura.

## Invariantes

1. Sin cambios de modelos, migraciones, backend, rutas ni permisos. Gateway tipado añade createSupplierDetailed y updateSupplierDetails, pero conserva createSupplier(name) y changeSupplier para regresiones y Compras.
2. Se envían solamente los 11 campos de identificación y contacto. **Nunca se sobrescriben payment_methods ni promotions** al editar; ese trabajo queda exclusivamente para E3-1D2B. Tampoco se envían status, ID, business_id u otros atributos protegidos.
3. Un proveedor es tenant-scoped. contact_person es texto libre informativo, no una cuenta de la plataforma ni una membresía.
4. No se crea compra, venta, saldo de inventario, comprobante, cuenta bancaria o QR.
5. Proveedores no tiene clave de replay/idempotencia para POST. Resultado de red incierto implica bloquear nuevos intentos hasta reconsulta; no duplicar.
6. No se importa almacenamiento DEMO, archivos ni fotografías. Sin modificaciones en main ni en la base local del usuario.

## QA

- Prueba unitaria nueva frontend/tests/supplier-contact-real.test.mjs: POST/PATCH de los once campos, protección de promociones/pagos, errores de validación, HTTP 403/404/409/422 y respuesta de red incierta sin reenvío.
- npm run test:supply-real incluye estas pruebas y las existentes de compras/recepciones.
- E2E frontend/e2e/real/catalog-suppliers-visual.spec.ts se amplía con alta completa, precarga, cancelación, PATCH y comprobación F5/GET, sobre base efímera controlada con PYME_DISPOSABLE_QA=1.
- CI: frontend build/lint/unit/E2E, y full-stack con PostgreSQL 16.

## Revisión manual

1. Crear proveedor de prueba con todos los campos; revisar ficha y listado.
2. Abrir Editar, comprobar precarga, cancelar y volver: el borrador debe descartarse. Repetir, guardar, recargar y comprobar persistencia.
3. Verificar mensajes con WhatsApp sin prefijo, enlace no oficial de Maps, email y nombre duplicado.
4. Con miembro sin permisos, confirmar ausencia de creación/edición y prohibición por backend.
5. Verificar responsive móvil y que no se modificaron compras, inventario, promociones ni medios de pago.

## Diferido

E3-1D2B integrará medios de pago informativos y promociones por día, medio y beneficio, con regresión separada. Más adelante: foto real, varios contactos vinculados a un proveedor e historial de compras por proveedor.
