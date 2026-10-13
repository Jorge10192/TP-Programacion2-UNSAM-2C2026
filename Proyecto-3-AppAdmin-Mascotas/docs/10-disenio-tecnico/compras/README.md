# Diseño técnico — Módulo de Compras

## 1. Objetivo

El módulo de Compras de WALOS tiene como objetivo registrar y administrar las compras de bienes físicos realizadas por el negocio.

La compra ocurre fuera del sistema. WALOS no realiza la compra ni el pago al proveedor. El sistema registra posteriormente una operación que ya ocurrió.

El módulo debe permitir conservar información suficiente para:

- conocer qué se compró;
- cuánto se compró;
- cuánto se pagó;
- cuándo ocurrió la compra;
- identificar al proveedor cuando corresponda;
- conservar comprobantes cuando existan;
- registrar automáticamente al usuario responsable;
- incorporar las cantidades adquiridas al módulo de Inventario;
- mantener un historial de precios y costos;
- comparar posteriormente compras y proveedores;
- conservar la trazabilidad de modificaciones, confirmaciones y anulaciones.

El diseño está orientado inicialmente a un microemprendimiento, por lo que se prioriza una experiencia de uso sencilla, rápida y visual.

---

## 2. Principios de diseño

### 2.1 Carga simple

El trabajador deberá poder registrar una compra sin realizar cálculos manuales complejos.

Por ejemplo:

```text
Producto: Harina integral
Cantidad: 2
Unidad de compra: bolsa
Contenido por unidad: 5 kg
Total pagado: $12.000
```

El sistema podrá derivar automáticamente:

```text
Cantidad incorporada: 10 kg
Precio por bolsa: $6.000
Precio normalizado: $1.200 / kg
```

El dato económico principal ingresado por el usuario será el importe realmente pagado.

---

### 2.2 Catálogos reutilizables

La información utilizada habitualmente deberá poder registrarse una vez y reutilizarse posteriormente.

Ejemplos:

- insumos;
- categorías de insumos;
- unidades de medida;
- proveedores;
- presentaciones habituales.

---

### 2.3 Flexibilidad

No todos los datos serán obligatorios en todas las compras.

Podrán ser opcionales, según corresponda:

- proveedor;
- presentación;
- marca;
- comprobante;
- observaciones;
- fotografías.

El sistema deberá permitir registrar una compra válida incluso cuando parte de esta información no esté disponible.

---

### 2.4 Historial

Los datos de una compra confirmada deberán conservar el estado que tenían cuando ocurrió la operación.

Los cambios posteriores en:

- presentaciones;
- proveedores;
- nombres;
- marcas;
- unidades;
- precios;

no deberán modificar retroactivamente compras históricas.

---

### 2.5 Trazabilidad

El sistema deberá registrar cronológicamente las acciones relevantes realizadas sobre una compra.

Como mínimo:

- creación;
- edición;
- confirmación;
- anulación.

Cada registro deberá permitir conocer:

- qué acción ocurrió;
- cuándo ocurrió;
- quién la realizó;
- qué datos cambiaron cuando corresponda.

---

### 2.6 Continuidad operativa

Una corrección histórica podrá producir una inconsistencia con operaciones posteriores.

En esos casos WALOS podrá marcar la compra como:

```text
REQUIERE_REVISION
```

sin necesariamente bloquear todo el sistema.

La aplicación deberá informar al usuario que existe una inconsistencia pendiente y permitir que los módulos afectados sean revisados.

---

## 3. Alcance

El módulo de Compras administra adquisiciones de bienes físicos utilizados por WALOS.

Ejemplos:

```text
Pollo
Harina
Huevos
Hígado
Bolsas de packaging
Cajas
Film
Detergente
Esponjas
```

Una operación de compra comienza cuando un trabajador inicia su registro y finaliza normalmente cuando la compra es confirmada.

Para el MVP, una compra confirmada representa mercadería que ya fue adquirida y se encuentra disponible para ser incorporada al Inventario.

---

## 4. Fuera del alcance

Compras no será responsable directamente de:

- realizar compras;
- ejecutar pagos a proveedores;
- administrar cuentas bancarias;
- registrar alquileres;
- registrar impuestos;
- registrar servicios;
- administrar recetas;
- consumir insumos durante Producción;
- vender productos;
- administrar stock directamente;
- leer automáticamente comprobantes mediante OCR;
- recomendar automáticamente proveedores;
- realizar conciliaciones bancarias;
- manejar recepciones parciales o diferidas de mercadería.

Los gastos que no representen bienes físicos corresponderán al módulo de Gastos.

---

## 5. Modelo de dominio

El diseño final del módulo utiliza las siguientes clases principales:

### Catálogos

```text
CategoriaInsumo
UnidadMedida
Proveedor
Insumo
PresentacionInsumo
ImagenInsumo
```

### Operación

```text
Compra
ItemCompra
Comprobante
```

### Trazabilidad

```text
RegistroActividadCompra
```

### Entidad externa

```text
Usuario
```

### Enumeraciones

```text
EstadoCompra
EstadoConsistencia
TipoActividadCompra
TipoControlStock
MagnitudUnidad
```

El diagrama completo se encuentra en:

```text
2-diagrama-de-clases-compra.png
```

y su fuente editable en:

```text
2-diagrama-de-clases-compra.puml
```

---

## 6. CategoriaInsumo

`CategoriaInsumo` permite organizar los bienes físicos utilizados por WALOS.

Ejemplos:

```text
Materia prima
Packaging
Limpieza
Otros
```

Modelo conceptual:

```text
CategoriaInsumo
--------------------------------
id
nombre
descripcion
activa
fechaCreacion
```

Las categorías no deberán implementarse como una enumeración rígida.

Una categoría utilizada históricamente no deberá eliminarse físicamente. Podrá desactivarse para evitar su utilización en nuevas operaciones.

---

## 7. UnidadMedida

`UnidadMedida` representa las unidades utilizadas para expresar cantidades.

Modelo conceptual:

```text
UnidadMedida
--------------------------------
id
nombre
simbolo
magnitud
factorBase
activa
```

Ejemplos:

```text
Kilogramo
Gramo
Litro
Mililitro
Unidad
Metro
Centímetro
```

También podrán existir unidades comerciales como:

```text
Bolsa
Paquete
Caja
Rollo
```

Estas unidades comerciales no necesariamente poseen una conversión universal.

Por ejemplo:

```text
1 kg = 1000 g
```

es una conversión general válida.

En cambio:

```text
1 paquete = ? unidades
```

depende del producto comprado.

---

## 8. MagnitudUnidad

Las unidades físicas podrán clasificarse por magnitud.

```text
MagnitudUnidad
--------------------------------
MASA
VOLUMEN
SUPERFICIE
CANTIDAD
```

Esto permitirá determinar qué conversiones son compatibles.

Ejemplos:

```text
kg <-> g
L <-> ml
```

No deberá realizarse una conversión automática entre magnitudes incompatibles.

Ejemplo inválido:

```text
kg <-> L
```

---

## 9. Insumo

`Insumo` representa el producto general administrado por WALOS.

Modelo conceptual:

```text
Insumo
--------------------------------
id
nombre
tipoControlStock
controlaVencimiento
activo
fechaCreacion
```

Ejemplos:

```text
Pollo
Harina
Huevos
Bolsas de packaging
Detergente
```

Cada insumo pertenece a una `CategoriaInsumo`.

También posee una unidad habitual de stock administrada mediante `UnidadMedida`.

Ejemplos:

```text
Pollo -> kilogramo
Harina -> kilogramo
Huevos -> unidad
Bolsas packaging -> unidad
```

La unidad habitual de stock no obliga a que la compra se registre utilizando esa misma forma comercial.

---

## 10. TipoControlStock

Cada insumo podrá definir cómo será controlado dentro del negocio.

```text
TipoControlStock
--------------------------------
CONTROL_MINIMO
CONTROL_PERIODICO
SIN_CONTROL_DETALLADO
```

Este concepto permite distinguir insumos que requieren diferente nivel de seguimiento.

El control de stock detallado pertenece principalmente al módulo de Inventario.

---

## 11. Control de vencimiento

Cada insumo podrá indicar mediante:

```text
controlaVencimiento
```

si requiere seguimiento de vencimientos.

Este dato no implica que Compras administre todo el ciclo de vencimientos.

Compras registra la adquisición. El seguimiento operativo posterior corresponderá principalmente al módulo de Inventario.

---

## 12. ImagenInsumo

Las fotografías tienen como finalidad facilitar la identificación visual de los productos.

Modelo conceptual:

```text
ImagenInsumo
--------------------------------
id
archivo
principal
activa
```

Un `Insumo` podrá tener ninguna, una o varias imágenes.

Normalmente la interfaz mostrará una imagen principal.

Las fotografías son opcionales.

Para el MVP las imágenes pertenecen al `Insumo` general y no a cada presentación particular.

---

## 13. PresentacionInsumo

`PresentacionInsumo` representa una forma habitual de comprar un insumo.

Modelo conceptual:

```text
PresentacionInsumo
--------------------------------
id
nombre
marca
unidadCompra
contenidoPorUnidad
unidadContenido
activa
fechaCreacion
```

Ejemplos:

```text
Harina
- Bolsa 1 kg
- Bolsa 5 kg

Bolsas packaging
- Pack x50
- Pack x100
```

La presentación es opcional.

Su finalidad principal es funcionar como una plantilla o atajo para completar rápidamente una compra frecuente.

---

## 14. Compra sin presentación

No será obligatorio seleccionar una presentación previamente registrada.

Ejemplo:

```text
Insumo: Pollo
Cantidad: 3,75
Unidad de compra: kg
Precio total: $18.000
```

Esta compra es completamente válida aunque no exista una `PresentacionInsumo`.

Esto resulta especialmente importante para productos comprados por peso variable.

---

## 15. Presentación como plantilla

Cuando una presentación sí existe, podrá completar automáticamente información habitual.

Ejemplo:

```text
Presentación:
Bolsa 5 kg

unidadCompra = bolsa
contenidoPorUnidad = 5
unidadContenido = kg
```

El trabajador podrá utilizar esos datos para registrar rápidamente la operación.

Los valores reales de la compra se almacenarán posteriormente en `ItemCompra`.

---

## 16. Modificación de una presentación

Una presentación podrá cambiar con el tiempo.

Ejemplo:

```text
Pack x100
```

puede pasar a:

```text
Pack x120
```

El usuario podrá:

1. utilizar `x120` únicamente en esa compra;
2. actualizar la presentación existente;
3. crear una nueva presentación.

Las compras históricas anteriores no deberán modificarse.

---

## 17. Proveedor

`Proveedor` representa el comercio, vendedor o proveedor donde se realizó una compra.

Modelo conceptual:

```text
Proveedor
--------------------------------
id
nombre
direccion
observaciones
activo
fechaCreacion
```

El proveedor es opcional.

Una compra podrá confirmarse sin proveedor identificado.

---

## 18. Relación entre Compra y Proveedor

Una `Compra` tendrá como máximo un proveedor.

Relación:

```text
Proveedor 0..1 <-> 0..* Compra
```

Esto significa:

- una compra puede no tener proveedor;
- una compra puede tener un proveedor;
- un proveedor puede estar asociado a muchas compras.

Si una salida de compra incluye productos adquiridos en dos proveedores diferentes y WALOS desea conservar correctamente la información para análisis futuros, deberán registrarse dos compras.

Ejemplo:

```text
Compra 1
Proveedor: Carnicería A
Pollo: 5 kg

Compra 2
Proveedor: Supermercado B
Harina: 10 kg
```

No se implementará en el MVP una división interna de una misma compra entre múltiples proveedores.

---

## 19. Compra sin proveedor

Una compra sin proveedor sigue siendo válida.

La operación podrá utilizarse para:

- inventario;
- costos;
- historial de precios;
- análisis generales.

Sin embargo, no podrá atribuirse a un proveedor específico en análisis posteriores.

---

## 20. Compra

`Compra` representa el registro de una adquisición realizada fuera del sistema.

Modelo conceptual:

```text
Compra
--------------------------------
id
fechaCompra
estado
estadoConsistencia
observaciones
fechaCreacion
fechaConfirmacion
fechaUltimaModificacion
--------------------------------
calcularTotal()
```

Cada compra posee:

- un usuario creador;
- cero o un proveedor;
- uno o más ítems para poder confirmarse;
- cero o más comprobantes;
- un historial de actividad.

---

## 21. Fecha de compra

`fechaCompra` representa la fecha comercial de la adquisición.

Al iniciar el registro:

```text
fechaCompra = hoy
```

por defecto.

El usuario podrá modificarla cuando registre una compra realizada anteriormente.

Separadamente, el sistema mantendrá fechas técnicas como:

```text
fechaCreacion
fechaConfirmacion
fechaUltimaModificacion
```

Estas fechas serán administradas automáticamente.

---

## 22. Usuario creador

El usuario que crea una compra deberá obtenerse automáticamente a partir de la sesión autenticada.

El trabajador no deberá seleccionar manualmente su propio usuario.

Relación conceptual:

```text
Usuario 1 <-> 0..* Compra
```

`Usuario` pertenece conceptualmente al sistema general de WALOS y se representa como entidad externa dentro del diagrama específico de Compras.

---

## 23. EstadoCompra

Las compras utilizarán los siguientes estados principales:

```text
EstadoCompra
--------------------------------
BORRADOR
CONFIRMADA
ANULADA
```

### BORRADOR

La compra todavía está siendo cargada.

No modifica Inventario.

### CONFIRMADA

La compra fue validada y registrada definitivamente.

Genera la correspondiente entrada de stock.

### ANULADA

La compra permanece en el historial, pero deja de considerarse una operación válida.

La anulación deberá conservar trazabilidad.

---

## 24. Borradores

Una compra podrá mantenerse temporalmente en estado:

```text
BORRADOR
```

Esto permite recuperar una compra si el usuario:

- cierra el navegador;
- pierde conexión;
- abandona accidentalmente la pantalla;
- necesita continuar más tarde.

Los borradores no deberán modificar Inventario.

Si un borrador lleva más de 24 horas sin actividad, WALOS podrá mostrar una advertencia al usuario.

No deberá eliminarse automáticamente únicamente por superar ese período.

Ejemplo:

```text
Tenés una compra sin terminar.

[Continuar]
[Descartar]
```

---

## 25. EstadoConsistencia

El estado operativo de una compra y su consistencia histórica se administran por separado.

```text
EstadoConsistencia
--------------------------------
CONSISTENTE
REQUIERE_REVISION
```

Una compra puede estar:

```text
CONFIRMADA + CONSISTENTE
```

o, luego de una corrección compleja:

```text
CONFIRMADA + REQUIERE_REVISION
```

Esto evita utilizar el estado de la operación para representar problemas de consistencia.

---

## 26. ItemCompra

`ItemCompra` representa lo que efectivamente fue comprado en una operación.

Modelo conceptual:

```text
ItemCompra
--------------------------------
id
cantidad
unidadCompra
contenidoPorUnidad
unidadContenido
precioTotal
cantidadIncorporada
--------------------------------
calcularCantidadIncorporada()
calcularPrecioPorUnidad()
calcularPrecioNormalizado()
```

Cada ítem pertenece a una `Compra`.

Cada ítem referencia obligatoriamente un `Insumo`.

También podrá conservar opcionalmente la `PresentacionInsumo` utilizada como plantilla.

---

## 27. ItemCompra como snapshot histórico

Los valores almacenados en `ItemCompra` representan los valores reales de esa compra.

Ejemplo:

```text
Insumo: Bolsas packaging
Cantidad: 5
Unidad de compra: paquete
Contenido por unidad: 300
Unidad de contenido: unidad
Precio total: $20.000
```

Resultado:

```text
Cantidad incorporada: 1500 unidades
```

Estos valores quedan registrados en el propio `ItemCompra`.

Por lo tanto, no es necesario mantener campos duplicados como:

```text
unidadCompraHistorica
contenidoHistorico
unidadContenidoHistorica
```

El ítem ya constituye el snapshot histórico.

---

## 28. Relación con PresentacionInsumo

La presentación asociada al ítem es opcional.

Relación:

```text
ItemCompra 0..* <-> 0..1 PresentacionInsumo
```

La presentación indica qué plantilla se utilizó al cargar la operación.

Sin embargo, los valores autoritativos de la compra son los registrados en `ItemCompra`.

Si posteriormente cambia la presentación, la compra histórica no deberá modificarse.

---

## 29. Cantidad comprada

`cantidad` expresa cuántas unidades de compra fueron adquiridas.

Ejemplo:

```text
cantidad = 5
unidadCompra = paquete
```

No necesariamente representa directamente la unidad utilizada por Inventario.

---

## 30. Contenido por unidad

Cuando sea necesario, el ítem podrá indicar cuánto contiene cada unidad comercial.

Ejemplo:

```text
cantidad = 5 paquetes
contenidoPorUnidad = 300
unidadContenido = unidad
```

Entonces:

```text
cantidadIncorporada = 1500 unidades
```

En una compra directa por peso:

```text
cantidad = 3,75
unidadCompra = kg
```

no será necesario indicar contenido adicional.

---

## 31. PrecioTotal

El usuario registra el importe realmente pagado por cada ítem.

Ejemplo:

```text
Pollo
3,75 kg
Precio total: $18.000
```

El sistema podrá calcular automáticamente:

```text
precio por unidad de compra
precio normalizado
```

El total general de la compra no deberá cargarse manualmente.

Se calcula:

```text
Compra.total =
SUM(ItemCompra.precioTotal)
```

---

## 32. Descuentos

El módulo de Compras no necesita administrar un motor específico de descuentos para el MVP.

Si el proveedor realizó una promoción:

```text
Precio original: $15.000
Precio pagado: $12.000
```

WALOS registra:

```text
precioTotal = $12.000
```

porque ese es el costo económico real para el negocio.

---

## 33. Comprobante

`Comprobante` representa evidencia documental de una compra.

Modelo conceptual:

```text
Comprobante
--------------------------------
id
archivo
tipo
fechaCreacion
activo
```

Una compra podrá tener `0..*` comprobantes.

Ejemplos:

- ticket;
- factura;
- PDF;
- fotografía;
- comprobante adicional.

---

## 34. Ticket con productos personales

Un comprobante puede incluir productos que no pertenecen a WALOS.

Ejemplo:

```text
Total ticket: $40.000
Productos de WALOS: $32.000
Productos personales: $8.000
```

La compra registrada en WALOS deberá ser:

```text
$32.000
```

El importe impreso en el comprobante no determina automáticamente el total de la compra dentro del sistema.

Para el MVP no será necesario registrar ni validar el total impreso en el ticket.

---

## 35. Corrección de comprobantes

Mientras la compra esté en borrador, un comprobante cargado incorrectamente podrá eliminarse o reemplazarse.

Luego de confirmar una compra, las modificaciones deberán quedar reflejadas mediante el historial de actividad correspondiente.

No será requisito del MVP conservar físicamente cada versión eliminada del archivo siempre que la modificación quede adecuadamente registrada.

---

## 36. Confirmación de compra

Para confirmar una compra deberán cumplirse al menos las siguientes condiciones:

- existir un usuario autenticado;
- existir al menos un `ItemCompra`;
- cada ítem deberá tener un `Insumo` válido;
- `cantidad > 0`;
- `precioTotal > 0`;
- las unidades utilizadas deberán ser válidas;
- los datos deberán permitir determinar la cantidad incorporada cuando corresponda.

El proveedor y el comprobante serán opcionales.

---

## 37. Integración con Inventario

Al confirmar una compra, WALOS deberá generar automáticamente la entrada correspondiente en Inventario.

Ejemplo:

```text
Compra confirmada:

Pollo
3,75 kg
```

produce conceptualmente:

```text
Entrada de Inventario:
+3,75 kg de Pollo
```

No existirá para el MVP un paso adicional del usuario como:

```text
Recibir mercadería
```

La confirmación de la compra implica que la mercadería adquirida se encuentra disponible para ser incorporada al stock.

La implementación técnica de esta integración pertenece a la arquitectura general del sistema y no forma parte del diagrama de dominio de Compras.

---

## 38. Edición de compras confirmadas

La interfaz deberá ofrecer una acción simple:

```text
Editar
```

El usuario no deberá decidir técnicamente si una modificación es una edición segura, ajuste, reversión o corrección histórica.

El sistema deberá determinar las consecuencias.

---

## 39. Corrección sin inconsistencia

Si una compra confirmada puede modificarse manteniendo consistencia con Inventario y otras operaciones, WALOS podrá realizar automáticamente los ajustes necesarios.

Ejemplo:

```text
Compra registrada:
10 kg

Corrección:
12 kg
```

Si el cambio puede aplicarse correctamente, el sistema ajustará Inventario y registrará la modificación en el historial.

---

## 40. Corrección con inconsistencia

Ejemplo:

```text
Compra original:
15 kg

Ya consumidos:
10 kg

Corrección:
la compra real fue de 5 kg
```

La corrección implicaría que históricamente se utilizaron más unidades de las que realmente ingresaron.

En estos casos el sistema podrá:

1. aceptar la corrección según las reglas y permisos correspondientes;
2. registrar el nuevo valor;
3. marcar `estadoConsistencia = REQUIERE_REVISION`;
4. indicar qué módulos pueden estar afectados;
5. solicitar una revisión posterior.

No deberá perderse el historial.

---

## 41. Anulación

Una compra anulada no deberá eliminarse físicamente.

La operación permanecerá disponible para consulta histórica.

El sistema deberá registrar:

- quién realizó la anulación;
- cuándo ocurrió;
- qué compra fue anulada;
- las consecuencias necesarias sobre Inventario;
- cualquier inconsistencia detectada.

---

## 42. RegistroActividadCompra

`RegistroActividadCompra` mantiene el historial cronológico visible de cada operación.

Modelo conceptual:

```text
RegistroActividadCompra
--------------------------------
id
fecha
tipo
descripcion
datosAnteriores
datosNuevos
```

Cada registro se asocia a:

- una `Compra`;
- un `Usuario`.

Ejemplo:

```text
10:32 - Jorge creó la compra
10:40 - Jorge confirmó la compra
11:15 - Jorge editó la cantidad
```

---

## 43. TipoActividadCompra

Las actividades principales serán:

```text
TipoActividadCompra
--------------------------------
CREACION
EDICION
CONFIRMACION
ANULACION
```

El modelo podrá ampliarse posteriormente si aparecen nuevas necesidades de auditoría.

---

## 44. Datos anteriores y nuevos

Para una modificación podrán conservarse datos suficientes para reconstruir qué cambió.

Ejemplo conceptual:

```text
datosAnteriores:
{
  "cantidad": 5
}

datosNuevos:
{
  "cantidad": 6
}
```

La forma técnica concreta de almacenamiento podrá resolverse durante la implementación.

---

## 45. Usuario y trazabilidad

Cada acción relevante deberá asociarse automáticamente al usuario autenticado.

Relaciones principales:

```text
Usuario 1 ------ 0..* Compra
Usuario 1 ------ 0..* RegistroActividadCompra
```

Esto permite diferenciar:

- quién creó la compra;
- quién realizó posteriormente cada modificación.

---

## 46. Relaciones principales del dominio

### CategoriaInsumo — Insumo

```text
CategoriaInsumo 1 ------ 0..* Insumo
```

Cada insumo pertenece a una categoría.

### UnidadMedida — Insumo

```text
UnidadMedida 1 ------ 0..* Insumo
```

Cada insumo posee una unidad habitual de stock.

### Insumo — PresentacionInsumo

```text
Insumo 1 *------ 0..* PresentacionInsumo
```

Un insumo puede tener varias presentaciones opcionales.

### Insumo — ImagenInsumo

```text
Insumo 1 *------ 0..* ImagenInsumo
```

Un insumo puede tener varias imágenes.

### Proveedor — Compra

```text
Proveedor 0..1 ------ 0..* Compra
```

Una compra puede tener como máximo un proveedor.

### Compra — ItemCompra

```text
Compra 1 *------ 1..* ItemCompra
```

Una compra confirmada contiene uno o más ítems.

### ItemCompra — Insumo

```text
ItemCompra 0..* ------ 1 Insumo
```

Cada ítem representa la compra de un insumo.

### ItemCompra — PresentacionInsumo

```text
ItemCompra 0..* ------ 0..1 PresentacionInsumo
```

La presentación utilizada es opcional.

### Compra — Comprobante

```text
Compra 1 *------ 0..* Comprobante
```

Una compra puede tener múltiples comprobantes.

### Compra — RegistroActividadCompra

```text
Compra 1 *------ 0..* RegistroActividadCompra
```

Cada compra conserva su historial.

---

## 47. Reglas centrales del módulo

Las reglas principales del diseño son:

1. Una compra representa una operación que ocurrió fuera de WALOS.
2. Una compra confirmada deberá contener al menos un ítem.
3. El proveedor es opcional.
4. Una compra tiene como máximo un proveedor.
5. Si existen compras en distintos proveedores y se desea preservar analítica por proveedor, deberán registrarse como compras diferentes.
6. Una presentación es opcional.
7. Un ítem puede cargarse directamente desde un insumo.
8. `ItemCompra` conserva los valores reales de la operación.
9. Los cambios posteriores de una presentación no modifican compras históricas.
10. El usuario creador se obtiene automáticamente.
11. El total de Compra se calcula a partir de sus ítems.
12. Los comprobantes son opcionales.
13. El importe del comprobante no determina el total registrado por WALOS.
14. Un borrador no modifica Inventario.
15. Los borradores pueden recuperarse.
16. Los borradores antiguos generan advertencia, no eliminación automática.
17. Confirmar una compra genera automáticamente la entrada correspondiente en Inventario.
18. Las compras confirmadas pueden corregirse manteniendo trazabilidad.
19. Una corrección problemática puede marcar `REQUIERE_REVISION`.
20. Una compra anulada permanece en el historial.
21. Toda acción relevante deberá conservar usuario y fecha.

---

## 48. Experiencia de usuario esperada

La interfaz deberá ser sencilla para usuarios no técnicos.

Se priorizarán:

- botones grandes;
- formularios simples;
- catálogos visuales;
- imágenes cuando estén disponibles;
- valores precargados;
- autocompletado;
- mensajes claros;
- ocultamiento de información avanzada cuando no sea necesaria.

Ejemplo de compra habitual:

```text
1. Elegir producto
2. Indicar cantidad
3. Elegir o confirmar unidad
4. Ingresar total pagado
5. Elegir proveedor opcional
6. Adjuntar ticket opcional
7. Confirmar
```

---

## 49. Carga frecuente

En una etapa posterior podrá incorporarse una acción similar a:

```text
Repetir compra
```

o:

```text
Comprar nuevamente
```

que reutilice información habitual de una operación anterior.

Esta funcionalidad no es obligatoria para el MVP.

---

## 50. Compatibilidad con trabajo simultáneo

El diseño deberá permitir que distintos trabajadores utilicen WALOS simultáneamente.

Las operaciones deberán registrar el usuario responsable.

La integración con Inventario deberá evitar inconsistencias cuando distintas operaciones afecten las mismas existencias.

El control de concurrencia detallado corresponde a la arquitectura técnica general del sistema.

---

## 51. Implementación

La implementación actual utiliza:

```text
FastAPI
SQLAlchemy
Alembic
```

El modelo de dominio descrito en este documento es la referencia conceptual.

Las clases ORM pueden incluir atributos técnicos adicionales necesarios para persistencia, como:

- claves foráneas;
- índices;
- restricciones;
- timestamps internos.

Estos detalles no necesitan aparecer en el diagrama de dominio cuando no aporten significado de negocio.

---

## 52. Estado actual de implementación

Actualmente se encuentran implementados parcialmente los catálogos base:

```text
Proveedor
CategoriaInsumo
UnidadMedida
Insumo
```

El modelo final requiere todavía implementar o completar:

```text
PresentacionInsumo
ImagenInsumo
Compra
ItemCompra
Comprobante
RegistroActividadCompra
```

y adaptar las entidades existentes a los atributos finales definidos en este documento.

La implementación deberá realizarse mediante nuevas migraciones de Alembic y no modificando retroactivamente migraciones que ya hayan sido aplicadas.

---

## 53. Documentación relacionada

Este documento deberá mantenerse alineado con:

```text
1-arquitectura-funcional-compras.png
1-caso-de-uso-compra.png
2-diagrama-de-clases-compra.png
2-diagrama-de-clases-compra.puml
../../09-casos-de-uso/CU-01-registrar-compra.md
```

Si existe una contradicción entre documentación antigua y el modelo aprobado más recientemente, deberá actualizarse la documentación anterior antes de continuar con la implementación.

---

## 54. Próximos pasos

Una vez estabilizado este diseño:

1. actualizar CU-01 — Registrar compra;
2. revisar el diagrama de arquitectura funcional;
3. revisar reglas de negocio relacionadas con Compras;
4. revisar la matriz de trazabilidad;
5. adaptar los modelos SQLAlchemy;
6. crear las migraciones correspondientes;
7. implementar servicios y endpoints;
8. agregar pruebas;
9. construir una interfaz mínima para validar el flujo completo con el cliente.
