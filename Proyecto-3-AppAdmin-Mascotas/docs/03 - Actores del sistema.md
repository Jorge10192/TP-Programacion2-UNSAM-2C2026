# 03 — Actores del sistema

## 1. Administrador/a WALOS

Es la persona responsable de gestionar el funcionamiento general del sistema.

### Responsabilidades principales

- Crear, habilitar y deshabilitar usuarios.
- Asignar roles y permisos.
- Gestionar proveedores.
- Gestionar insumos y productos.
- Gestionar recetas.
- Registrar o supervisar compras.
- Consultar stock general.
- Gestionar promociones.
- Consultar ventas.
- Consultar costos.
- Consultar analítica de ventas y proveedores.
- Gestionar pedidos y reservas.
- Consultar información económica del negocio.


---

## 2. Cliente final

Es la persona que compra productos WALOS.

En la primera versión podrá interactuar principalmente con la parte de pedidos o reservas online.

### Responsabilidades principales

- Consultar productos disponibles.
- Consultar precios.
- Consultar promociones disponibles.
- Armar un pedido.
- Seleccionar una fecha o modalidad de retiro cuando corresponda.
- Realizar una reserva.
- Informar o realizar la seña requerida.
- Consultar el estado de su pedido.

---

## 3. Sistemas externos

Los siguientes sistemas pueden interactuar con WALOS en versiones que incorporen integraciones externas.

### Mercado Pago

Podrá utilizarse para registrar o procesar pagos y señas.

La forma exacta de integración deberá definirse antes de su implementación.

### Cuenta DNI / Banco Provincia

Podrá utilizarse como medio de pago.

La posibilidad y alcance de una integración automática deberán analizarse antes de implementarla.

### PedidosYa

Podrá utilizarse como servicio externo de logística para entregar pedidos sin que WALOS tenga que gestionar una flota propia.

La integración dependerá de las posibilidades técnicas y comerciales ofrecidas por la plataforma.

---

## 4. Elementos del negocio que no son actores

Algunos elementos importantes del sistema no son actores porque no interactúan directamente con la aplicación.

Ejemplos:

- Proveedor.
- Insumo.
- Producto.
- Lote.
- Feria.
- Punto de venta.
- Compra.
- Venta.
- Pedido.
- Promoción.

Estos elementos formarán parte del modelo de dominio y serán gestionados por los actores del sistema.
