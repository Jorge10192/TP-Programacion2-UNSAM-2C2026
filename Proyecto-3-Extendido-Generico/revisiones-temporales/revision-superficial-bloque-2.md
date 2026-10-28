# Revisión superficial temporal — Bloque 2

> **Estado:** documento exploratorio y descartable.  
> **No constituye diseño oficial**, no congela entidades, estados, agregados, APIs, tablas ni decisiones de arquitectura.  
> **Objetivo:** detectar si capacidades previsibles del Bloque 2 obligan a modificar M01/M02 antes de implementar el Bloque 1.

---

## 1. Contexto

El producto objetivo es un software genérico de gestión para microemprendimientos y comercios con operación móvil, local, ferias, depósito/casa y canales digitales.

El caso WALOS sirve como origen funcional, pero el diseño debe permanecer reutilizable para otros negocios.

Como referencias externas se observaron, de forma exploratoria:

- Treinta: gestión de ventas, gastos, inventario, proveedores, clientes, estadísticas, recetas, variantes y operación desde móvil/web.
- Foodog: catálogo online con categorías, presentaciones/variantes, precios, descuentos, disponibilidad, carrito, medios de pago, entrega y retiro.
- PedidosYa para comercios: canal externo de pedidos, catálogo/menú, precios, stock, promociones, recepción de pedidos y liquidaciones.
- Mercado Pago: cobros presenciales y online mediante Point, QR y checkout, con órdenes de pago, estados, webhooks y conciliación.

Fuentes públicas consultadas:

- https://www.treinta.co/ar/home/
- https://www.treinta.co/ar/mercados/
- https://www.foodog.com.ar/
- https://www.foodog.com.ar/productos/
- https://socios.pedidosya.com.ar/es
- https://www.mercadopago.com.ar/developers/es/docs/qr-code/overview
- https://www.mercadopago.com.ar/developers/es/docs/mp-point/overview

Estas referencias se usan únicamente para anticipar capacidades; **no se pretende copiar su modelo interno**.

---

## 2. Pregunta de esta revisión

Antes de implementar el Bloque 1:

```text
M01 — Organización
M02 — Catálogo
```

se busca responder:

> ¿Las necesidades previsibles de Compras, Proveedores, Inventario, Ferias, Pedidos y Pagos exigen cambiar ahora el modelo base de M01/M02?

### Conclusión breve

**No se detecta una necesidad de rediseño estructural de M01/M02 antes de comenzar la implementación.**

Sí aparecen contratos que deben preservarse porque los módulos posteriores dependerán de ellos.

---

# 3. Capacidades previsibles del Bloque 2

Este documento no asigna todavía números definitivos de módulo. Se usan nombres funcionales para evitar congelar una partición prematura.

## 3.1 Proveedores

Capacidades previsibles:

- alta, edición, activación/inactivación;
- datos de contacto;
- pertenencia a un Negocio;
- historial de compras;
- análisis futuro por precio, frecuencia, cumplimiento u otros indicadores;
- posibilidad de múltiples proveedores para un mismo insumo/artículo;
- no asumir relación fija Proveedor -> Producto.

### Impacto sobre Bloque 1

Ninguno estructural.

M01 ya proporciona el límite de `Negocio`.

M02 no debe agregar una relación directa permanente entre `ArticuloCatalogo` y `Proveedor`. Esa relación, si existe, debe surgir de compras, ofertas o acuerdos posteriores.

---

## 3.2 Compras

Capacidades previsibles:

- Compra perteneciente a un Negocio;
- proveedor opcional u obligatorio según el caso de uso futuro;
- uno o más ítems;
- cantidad;
- unidad;
- precio/costo;
- fecha;
- comprobante;
- usuario que registra;
- edición/corrección controlada;
- anulación;
- recepción;
- impacto posterior en inventario;
- conservación histórica.

La experiencia observada en sistemas como Treinta sugiere que registrar una compra suele producir una entrada de inventario, pero **Compra e Inventario no deben ser la misma responsabilidad**.

### Impacto sobre M02

`ArticuloCatalogo.esComprable` sigue siendo útil como capacidad/elegibilidad.

No significa:

```text
esComprable = true
=> existe compra
=> existe stock
=> existe proveedor
```

La Compra deberá referenciar el artículo utilizado en ese momento y preservar los datos transaccionales necesarios.

### Riesgo a evitar

No hacer que `ArticuloCatalogo` acumule:

- proveedor actual;
- último costo como verdad histórica;
- cantidad comprada;
- stock;
- comprobantes;
- movimientos.

Todo eso pertenece a otros módulos.

---

## 3.3 Inventario / Stock

Capacidades previsibles:

- entradas y salidas;
- existencias por ubicación;
- posible manejo por lote;
- movimientos entre ubicaciones;
- cantidades en distintas unidades permitidas;
- stock resultante;
- ajustes;
- trazabilidad;
- concurrencia;
- disponibilidad para venta;
- stock temporal en ferias.

Para WALOS ya existe una necesidad fuerte de:

```text
Casa/Depósito
Local
Feria
Web
otras ubicaciones futuras
```

y movimientos temporales/permanentes.

### Impacto sobre M02

La separación actual es correcta:

```text
ArticuloCatalogo.controlaStock
!= stock actual
```

M02 define si el artículo está configurado para participar en inventario.

El módulo de inventario deberá poseer los hechos:

- cuánto hay;
- dónde;
- en qué lote;
- por qué movimiento;
- desde cuándo.

### Decisión importante preservada

`BIEN` no debe implicar automáticamente `controlaStock = true`.

Eso permite artículos físicos no inventariados y mantiene genérico el catálogo.

---

## 3.4 Lotes y vencimientos

Para negocios de alimentos o producción pueden aparecer:

- lote;
- fecha de producción;
- fecha de vencimiento;
- cantidad remanente;
- ubicación;
- origen;
- split;
- devolución desde feria;
- congelado/descongelado;
- trazabilidad.

### Impacto sobre M02

La decisión actual:

```text
controlaVencimiento = configuración
!= fecha de vencimiento concreta
```

es correcta.

No agregar `fechaVencimiento` directamente a `ArticuloCatalogo`.

La fecha concreta pertenece al lote o unidad inventariable futura.

---

## 3.5 Producción / recetas

Treinta incluye recetas en planes superiores y WALOS necesita producción.

Capacidades previsibles:

- receta;
- componentes/ingredientes;
- cantidades teóricas;
- cantidades reales;
- consumo de stock;
- creación de producto terminado;
- costo de producción;
- lote resultante;
- corrección histórica controlada.

### Impacto sobre M02

La capacidad:

```text
puedeUsarseEnProduccion
```

sigue siendo apropiada.

No significa que exista una receta.

Debe mantenerse:

```text
puedeUsarseEnProduccion
!= receta
!= producción realizada
```

No hace falta modificar M02 antes de implementarlo.

---

## 3.6 Ventas y punto de venta

Referencias como Treinta muestran:

- búsqueda rápida de productos;
- cantidades;
- descuentos;
- métodos de pago;
- comprobantes;
- actualización de inventario;
- reportes.

Foodog muestra además:

- catálogo online;
- carrito;
- presentaciones;
- descuentos;
- disponibilidad;
- compra sin necesidad de cuenta.

### Impacto sobre M02

`esVendible`, `precioBase` y `permiteDescuento` son suficientes como configuración base.

Una Venta futura debe preservar snapshots de:

- descripción/nombre relevante;
- unidad;
- precio;
- descuento;
- cantidad;
- impuestos u otros datos si se incorporan.

Cambiar el catálogo no debe reescribir ventas históricas.

### No congelar todavía

- listas de precios;
- promociones complejas;
- impuestos;
- combos;
- variantes;
- precios por canal;
- precios por ubicación.

Estas necesidades pueden aparecer, pero no obligan a modificar el modelo actual antes de implementar Bloque 1.

---

# 4. Canales de venta y pedidos

Foodog y PedidosYa muestran que un negocio puede recibir ventas/pedidos desde:

- mostrador;
- feria;
- sitio web;
- WhatsApp;
- marketplace/delivery externo;
- otros canales.

### Regla recomendada para diseño futuro

No convertir cada canal en un tipo diferente de `ArticuloCatalogo`.

El catálogo debe ser reutilizable por canales.

Los módulos posteriores decidirán:

- publicación;
- disponibilidad;
- precio por canal si se necesitara;
- pedido;
- reserva;
- entrega;
- retiro;
- sincronización con plataformas externas.

### Impacto sobre Bloque 1

No requiere cambio inmediato.

Sí confirma que M01/M02 deben evitar dependencias hacia PedidosYa, Mercado Pago, tienda web o cualquier proveedor externo concreto.

---

# 5. Pagos

Mercado Pago ofrece pagos presenciales y online mediante distintos mecanismos, con una API de órdenes, estados, notificaciones y conciliación.

Esto refuerza una separación futura:

```text
Venta / Pedido
!= Pago
!= integración Mercado Pago
```

Una venta o pedido puede:

- tener uno o más intentos de pago;
- estar pendiente mientras un proveedor externo confirma;
- pagarse por efectivo, transferencia, QR, tarjeta u otro medio;
- requerir conciliación.

### Impacto sobre M01/M02

Ninguno estructural.

M01 puede seguir manteniendo `Moneda` como concepto del Negocio.

M02 no debe conocer Mercado Pago ni métodos de pago.

---

# 6. Ferias y ubicaciones

El requisito diferencial del producto genérico es soportar comercios que venden en ferias además de otros lugares.

Necesidades previsibles:

- múltiples ubicaciones;
- ferias temporales;
- stock asignado a feria;
- devolución de sobrantes;
- ventas atribuibles a una feria;
- análisis por evento/feria;
- operación simultánea en distintos dispositivos;
- evitar doble venta de la última unidad.

### Observación de modelado

No conviene representar:

```text
Feria1
Feria2
Local
Casa
Web
```

como atributos o enums permanentes del catálogo.

Probablemente se necesite más adelante un concepto configurable de ubicación/evento/canal.

### Impacto sobre Bloque 1

No hace falta cambiar M01/M02 ahora.

Solo debe evitarse acoplar `ArticuloCatalogo` a una única ubicación o existencia global.

---

# 7. Variantes y presentaciones — riesgo futuro a vigilar

Foodog muestra productos con opciones como:

- cantidad de días;
- peso/presentación;
- color;
- unidades.

Treinta también publicita variantes de producto.

Este es el punto de mayor interés para una futura revisión de M02.

Ejemplos:

```text
Producto: Vianda de Pollo
Presentación: 250 g
Presentación: 350 g

Producto: Remera
Color: azul
Talle: M
```

### ¿Obliga a cambiar M02 ahora?

**No.**

Para el alcance actual, cada combinación comercial puede modelarse como un `ArticuloCatalogo` independiente.

Ejemplo:

```text
"Vianda Pollo 250 g"
"Vianda Pollo 350 g"
```

Esto es suficiente para comenzar.

### Deuda consciente

Si el producto genérico evoluciona hacia gestión avanzada de variantes, podría aparecer posteriormente:

```text
ProductoBase
Variant/Presentacion
ArticuloVendible
```

No introducirlo preventivamente sin un requerimiento real.

---

# 8. Clientes y compra sin cuenta

Foodog permite comprar sin registro obligatorio.

Esto es útil para evitar una mala decisión futura:

```text
Usuario del sistema
!= Cliente comprador
```

`Usuario` de M01 representa identidad de acceso/operación del software.

Un Cliente futuro puede:

- no tener cuenta;
- comprar como invitado;
- existir solo como contacto;
- tener historial;
- usar distintos canales.

### Impacto sobre M01

**No reutilizar `Usuario` para representar clientes.**

La separación actual de M01 es correcta.

---

# 9. Dependencias que Bloque 2 puede asumir de Bloque 1

Se considera seguro que módulos posteriores dependan conceptualmente de:

## M01

- `Negocio` como frontera multi-tenant;
- `Usuario` como identidad autenticada;
- `UsuarioNegocio` como membresía contextual;
- Rol/Estado para autorización contextual;
- moneda base;
- múltiples usuarios/dispositivos.

## M02

- `ArticuloCatalogo` estable por identidad;
- `Categoria`;
- `TipoArticulo`;
- `UnidadMedida`;
- capacidades:
  - `esComprable`;
  - `esVendible`;
  - `controlaStock`;
  - `puedeUsarseEnProduccion`;
  - `controlaVencimiento`;
  - `permiteDescuento`;
- artículos activos/inactivos;
- configuración actual sin reescritura histórica.

---

# 10. Cosas que NO debe resolver Bloque 1 preventivamente

No agregar ahora a M01/M02:

- stock actual;
- ubicaciones;
- lotes;
- vencimientos concretos;
- proveedor;
- compras;
- ventas;
- clientes;
- pedidos;
- reservas;
- pagos;
- cajas;
- cuentas bancarias;
- Mercado Pago;
- PedidosYa;
- delivery;
- recetas;
- producción;
- movimientos de inventario;
- promociones complejas;
- deuda de clientes/proveedores;
- variantes genéricas;
- estados de pedidos;
- estados de pago.

Agregar estos conceptos preventivamente aumentaría el acoplamiento y haría más difícil modificar los módulos futuros.

---

# 11. Riesgos concretos para la implementación del Bloque 1

Al implementar M01/M02 se deben evitar decisiones técnicas que cierren posibilidades futuras.

## R1 — Stock dentro de ArticuloCatalogo

Incorrecto:

```text
ArticuloCatalogo.stockActual
```

como única fuente futura de inventario.

La existencia probablemente deberá depender de ubicación/lote/movimientos.

---

## R2 — Proveedor dentro de ArticuloCatalogo

Incorrecto:

```text
ArticuloCatalogo.proveedor
```

como relación única y permanente.

Un artículo/insumo puede adquirirse a múltiples proveedores a lo largo del tiempo.

---

## R3 — Cliente = Usuario

Incorrecto.

Los compradores no necesariamente serán usuarios autenticados del sistema.

---

## R4 — Pago incrustado en Venta

Evitar diseñar una venta futura como si tuviera siempre:

```text
mercadoPagoId
estadoMercadoPago
```

Los proveedores de pago son integraciones externas.

---

## R5 — Existencia global única

Evitar que M02 presuponga:

```text
Articulo -> una única cantidad global
```

por el requisito de múltiples ubicaciones y ferias.

---

## R6 — Hard delete agresivo

Compras, ventas, inventario y producción generarán referencias históricas.

La política conservadora de hard delete definida en M02 es adecuada.

---

## R7 — Cambiar UnidadMedida reescribe historia

No debe suceder.

Los módulos transaccionales deberán preservar la unidad original de cada hecho.

---

# 12. Decisiones técnicas que esta revisión NO toma

Permanecen abiertas:

- esquema SQL;
- claves foráneas;
- aggregate roots;
- ORM;
- Unit of Work;
- locking/versionado;
- eventos de dominio;
- colas;
- integración concreta con Mercado Pago/PedidosYa;
- modelo de `Ubicacion`;
- modelo de `Lote`;
- modelo de `Proveedor`;
- modelo de `Compra`;
- modelo de `Venta`;
- modelo de `Pedido`;
- modelo de `Pago`;
- modelo de variantes;
- sincronización offline;
- estrategia UX.

---

# 13. Dictamen

## Resultado

```text
M01 Organización
        +
M02 Catálogo
        ↓
son base suficiente para comenzar implementación
```

La revisión superficial del Bloque 2 **no detecta una contradicción que obligue a reabrir el diseño del Bloque 1**.

Las decisiones más importantes que deben preservarse al programar son:

1. `Negocio` como límite multi-tenant.
2. `Usuario` no representa clientes.
3. `ArticuloCatalogo` representa configuración, no hechos operativos.
4. Capacidades de M02 expresan elegibilidad, no compras/ventas/stock/producción reales.
5. Stock no debe vivir como cantidad global dentro del catálogo.
6. Proveedores no deben quedar embebidos en el artículo.
7. La historia futura debe usar snapshots y no depender de la configuración vigente.
8. Pagos y canales externos deben permanecer desacoplados del dominio base.
9. Ubicaciones/ferias deben quedar para un módulo posterior.
10. Variantes avanzadas son una deuda consciente, no un requisito para comenzar.

## Decisión recomendada

**Comenzar la implementación del Bloque 1.**

Antes de diseñar formalmente el Bloque 2, utilizar experiencia real de la implementación de M01/M02 para validar:

- arquitectura;
- persistencia;
- multi-tenancy;
- autorización;
- concurrencia;
- DTOs;
- manejo de errores;
- testing;
- migraciones;
- Docker.

---

# 14. Vida útil del documento

Este archivo es deliberadamente temporal.

Debe eliminarse o reemplazarse cuando:

- comience el diseño formal del Bloque 2; o
- exista documentación oficial equivalente.

No debe citarse como especificación normativa del producto.
