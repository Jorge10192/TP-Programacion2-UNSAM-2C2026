# Diseño técnico — Módulo de Compras

## Objetivo

El módulo de Compras tiene como responsabilidad registrar y administrar las
compras de materias primas realizadas por WALOS.

La compra se realiza fuera del sistema. WALOS solamente registra la operación,
su proveedor, los productos adquiridos, sus precios y la recepción de la
materia prima para producción.

## Responsabilidades

El módulo deberá permitir:

- gestionar proveedores; 
- gestionar las materias primas utilizadas en compras;
- registrar compras;
- registrar uno o más ítems dentro de una compra;
- registrar comprobantes;
- distinguir compras recibidas de compras pendientes de recepción;
- confirmar la recepción de mercadería;
- conservar el historial de precios de compra;
- permitir anulaciones y correcciones conservando trazabilidad.

## Relación con otros módulos

### Inventario

Compras no administra directamente el stock.

Cuando se confirma la recepción de mercadería, el módulo de Compras solicita
al módulo de Inventario que registre la correspondiente entrada de stock.

### Usuarios

El usuario que registra, recibe, corrige o anula una compra deberá quedar
identificado automáticamente.

## Fuera de alcance del módulo

El módulo de Compras no deberá:

- realizar pagos a proveedores;
- ejecutar compras automáticamente;
- administrar producción;
- administrar ventas;
- modificar directamente el stock disponible;
- realizar OCR automático de comprobantes en el MVP.

## Decisiones de diseño pendientes

- determinar si una compra puede contener múltiples materias primas;
- definir el modelo de recepción;
- definir los estados posibles de una compra;
- definir la relación exacta con Inventario;
- definir el tratamiento de comprobantes.

## Extension a futuro

- Cargar todo el proceso de compra directamente con el comprobante de forma automatica
- Identificar si un comprobante ya fue cargado para no duplicarse una misma compra.

