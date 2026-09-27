# 06 — Requerimientos no funcionales

## RNF-01 — Acceso desde múltiples dispositivos

El sistema deberá poder utilizarse desde teléfonos celulares, tablets y computadoras mediante una interfaz web adaptable.

### Criterios verificables

- La interfaz deberá poder utilizarse correctamente en resoluciones móviles y de escritorio.
- Las funciones principales deberán estar disponibles desde navegador web.
- No deberá requerirse una aplicación nativa para operar el sistema.

---

## RNF-02 — Operación concurrente

El sistema deberá permitir que varias personas utilicen la aplicación simultáneamente desde distintas ubicaciones sin generar inconsistencias.

### Criterios verificables

- Dos o más personas podrán registrar operaciones al mismo tiempo.
- Las operaciones confirmadas deberán reflejarse para los demás usuarios.
- El sistema deberá evitar ventas, reservas o movimientos duplicados sobre la misma disponibilidad de stock.
- Una operación concurrente no deberá generar stock negativo.

---

## RNF-03 — Consistencia e integridad de datos

El sistema deberá mantener consistencia en la información relacionada con compras, producción, stock, ventas, reservas y pagos.

### Criterios verificables

- Una operación incompleta no deberá dejar modificaciones parciales.
- El stock no podrá quedar con valores negativos.
- Una misma operación no deberá aplicarse dos veces por reintentos o errores de comunicación.
- Los movimientos de stock deberán conservar su trazabilidad.

---

## RNF-04 — Rendimiento

El sistema deberá responder con suficiente rapidez para poder utilizarse durante una venta en una feria o local comercial.

### Criterios verificables

- Las operaciones frecuentes, como consultar stock o registrar una venta, deberán responder normalmente en menos de 2 segundos bajo la carga esperada del negocio.
- El sistema deberá soportar al menos varios usuarios operando simultáneamente sin degradación significativa.
- Los cálculos de promociones deberán realizarse antes de confirmar la venta.

---

## RNF-05 — Disponibilidad

El sistema deberá encontrarse disponible durante los horarios habituales de operación del negocio.

### Criterios verificables

- Una interrupción del sistema no deberá provocar pérdida de operaciones previamente confirmadas.
- El reinicio de la aplicación no deberá eliminar información almacenada.
- El sistema deberá poder recuperarse manteniendo los datos persistidos.

---

## RNF-06 — Seguridad de acceso

El sistema deberá proteger el acceso a la información del negocio.

### Criterios verificables

- El acceso deberá requerir autenticación.
- Las contraseñas no deberán almacenarse en texto plano.
- La comunicación deberá utilizar HTTPS cuando el sistema se encuentre desplegado.
- Las credenciales y secretos del sistema no deberán almacenarse directamente en el repositorio.

---

## RNF-07 — Trazabilidad

El sistema deberá permitir conocer el origen de las operaciones relevantes del negocio.

### Criterios verificables

- Las operaciones deberán registrar fecha y hora.
- Los movimientos de stock deberán conservar origen, destino y motivo.
- Las ventas deberán conservar el punto o canal donde fueron realizadas.
- Las modificaciones que afecten stock deberán poder rastrearse posteriormente.

---

## RNF-08 — Usabilidad

El sistema deberá ser simple de utilizar para trabajadores de pequeños negocios sin requerir conocimientos técnicos.

### Criterios verificables

- La interfaz deberá estar en español.
- Las acciones frecuentes deberán requerir la menor cantidad posible de pasos.
- Los errores deberán mostrarse de forma clara.
- El total de una venta deberá mostrarse antes de confirmarla.
- Las promociones deberán calcularse automáticamente.

---

## RNF-09 — Respaldo

El sistema deberá contar con mecanismos de respaldo de la información.

### Criterios verificables

- La base de datos deberá respaldarse periódicamente.
- Deberá poder recuperarse la información ante una falla.
- Las copias deberán almacenarse separadamente de la instancia principal del sistema.

---

## RNF-10 — Escalabilidad básica

La arquitectura deberá permitir que el sistema pueda incorporar nuevas funciones sin rehacer completamente la solución.

### Criterios verificables

- La incorporación futura de usuarios con distintos roles no deberá requerir rediseñar el sistema completo.
- Las integraciones futuras con Mercado Pago, Cuenta DNI, PedidosYa o redes sociales deberán poder agregarse como módulos independientes.
- La lógica de negocio deberá mantenerse separada de la interfaz de usuario.
