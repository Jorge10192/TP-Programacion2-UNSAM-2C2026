# Changelog — Plataforma PyME

Registro de los incrementos relevantes para el prototipo de Programación 2. Los registros E1 son locales y DEMO; no representan pagos verificados ni autorización de servidor.

## E1-D2 — integración del frontend
- E2E Playwright Chromium desktop/móvil: navegación, aislamiento de empresas, placeholders, accesibilidad del menú, flujo QR completo.
- QA y matriz de no regresión documentados; CI de GitHub verifica navegador, compilación, lint y políticas.
- Etiquetas y mensajes de pantalla alineados con módulos ya integrados; sin migración ni modificación de negocio.

## E1-D1 — QR de cobro visual DEMO
- Estados PENDIENTE, SIMULADO_APROBADO y CANCELADO con persistencia por negocio y sin QR escaneable.
- No registra venta ni salida de stock al crear QR; confirmación simulada revalida productos activos, stock y cuentas.
- Saldo pendiente de pagos divididos aplicado al último medio, no al primero.

## E1-C3 / C3.1 — cuentas y medios
- Directorio financiero DEMO por negocio, cuentas activas/inactivas y principales.
- Asociaciones opcionales en ventas y gastos; transferencias admiten banco o billetera compatible.

## E1-B / E1-C — operación integrada
- Catálogo, imágenes, proveedores, compras, inventario y control de stock; venta, gastos y arqueo.
- Imagen de existencias física reutiliza la del mismo artículo en Catálogo, sin duplicar blobs.

**Próxima fase E2:** arquitectura del backend, dominio, UML y contratos de API antes de FastAPI y Docker.
