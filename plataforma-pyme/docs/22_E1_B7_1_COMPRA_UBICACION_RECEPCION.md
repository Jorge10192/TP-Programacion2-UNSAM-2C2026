# E1-B7.1 — Claridad de ubicación pendiente al registrar compras

**Fecha:** 06/11/2026. **Estado:** integrado en `main`; build/lint/QA local pendiente. Mejora de UX sin cambios de dominio ni migraciones.

## Problema observado

Al cargar una compra con productos físicos y luego abrir el detalle, la ubicación se selecciona después de guardar los renglones. Aunque la recepción funciona bien, el paso intermedio puede interpretarse como que la mercadería ya ingresó al Inventario o que el guardado quedó incompleto.

## Solución

1. La pantalla Registrar compra informa dos etapas: **1. Registrar compra**, **2. Confirmar ubicación y recepción** (la segunda aplica sólo a mercadería física).
2. Si el formulario contiene bienes físicos, muestra un aviso **«Falta confirmar la ubicación de recepción»** y el botón pasa a llamarse **«Guardar compra y elegir ubicación»**. Primero se guarda el documento, sin afectar stock.
3. Se abre el detalle de la compra ya guardada, con el mensaje **«Compra guardada · ubicación por confirmar»**.
4. Se selecciona una ubicación **activa y habilitada para almacenar**, se revisa el resumen y finalmente se pulsa **«Confirmar ubicación e ingresar a Inventario»**. Sólo este comando genera entradas de stock; continúa siendo idempotente.
5. En el historial, las compras pendientes ofrecen **«Confirmar ubicación y recepción»** en lugar de un genérico «Ver compra».
6. Para compras exclusivamente de servicios o conceptos libres, el botón sigue siendo «Registrar compra DEMO» y no se solicita ubicación ni recepción.

**No se agregó ninguna obligación nueva** de elegir una ubicación al momento de registrar la compra: pueden transcurrir días entre la factura y la recepción real. Tampoco se modificaron las reglas existentes de recepción completa única, trazabilidad por empresa y unidades sin conversión.

## Comprobaciones propuestas

Desde `plataforma-pyme/frontend`:

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:purchases
npm.cmd run test:inventory
npm.cmd run dev
```

- **COMP-UX-01**: registrar Shampoo y otro bien físico; ver etapas y aviso de ubicación pendiente **antes** de guardar.
- **COMP-UX-02**: guardar; se abre detalle con ubicación pendiente. Inventario todavía no incrementa existencias.
- **COMP-UX-03**: seleccionar ubicación válida, revisar y confirmar; Inventario suma los renglones una sola vez.
- **COMP-UX-04**: F5 y consultar de nuevo la compra; recepción sigue confirmada, no se ofrece repetirla.
- **COMP-UX-05**: comprar sólo un servicio/concepto libre; no se exige ubicación y no se producen movimientos de stock.
- **COMP-UX-06**: registrar una compra con artículos y dejarla sin recibir; queda pendiente en historial, con acceso claro para confirmarla más adelante.
- **COMP-UX-07**: vista angosta/móvil y botones de la confirmación sin recortes.

**Pendiente:** pruebas reales de build, lint y UI; los cambios fueron verificados a nivel de archivos publicados en el repositorio.
