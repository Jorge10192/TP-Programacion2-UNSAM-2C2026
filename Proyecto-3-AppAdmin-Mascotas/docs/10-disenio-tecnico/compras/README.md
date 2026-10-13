# Diseño técnico — Módulo de Compras

## 1. Objetivo

El módulo de Compras de WALOS tiene como objetivo registrar y administrar las compras de bienes físicos realizadas por el negocio.

La compra ocurre fuera del sistema. WALOS no realiza la compra ni el pago al proveedor. El sistema registra posteriormente una operación que ya ocurrió, conservando la información necesaria para:

- conocer qué se compró;
- cuánto se compró;
- cuánto se pagó;
- cuándo ocurrió;
- dónde o a quién se compró, cuando esa información esté disponible;
- conservar comprobantes, cuando existan;
- incorporar automáticamente las cantidades correspondientes al Inventario;
- mantener un historial de costos;
- comparar posteriormente precios, presentaciones y proveedores;
- mantener trazabilidad de las operaciones y sus correcciones.

El módulo está pensado inicialmente para un microemprendimiento. Por este motivo se prioriza una experiencia de uso sencilla, rápida y visual, similar a aplicaciones comerciales donde el usuario selecciona un producto previamente cargado, indica una cantidad y registra el importe pagado.

---

## 2. Principios de diseño

### 2.1 Carga simple

El trabajador no debería tener que realizar cálculos manuales de precio unitario, precio por kilogramo o litro, cantidad incorporada al inventario ni conversiones entre unidades compatibles.

Ejemplo:

```text
Harina integral — Bolsa 5 kg
Cantidad: 2
Total pagado: $12.000
```

El sistema calcula:

```text
Cantidad comprada: 2 bolsas
Cantidad incorporada: 10 kg
Precio por bolsa: $6.000
Precio normalizado: $1.200 / kg
```

### 2.2 Reutilización de información

Los productos y presentaciones utilizados habitualmente deberán poder registrarse una vez y reutilizarse en compras posteriores.

### 2.3 Flexibilidad

Datos como proveedor, marca, fotografías, comprobantes, observaciones y lugar detallado de compra podrán ser opcionales cuando no resulten necesarios.

### 2.4 Trazabilidad

Las operaciones confirmadas, corregidas o anuladas deberán conservar un historial suficiente para conocer quién realizó la operación, cuándo, qué información fue modificada, qué módulos fueron afectados y si existe alguna inconsistencia pendiente de revisión.

### 2.5 Continuidad operativa

Una inconsistencia histórica no necesariamente deberá bloquear todo el sistema. Cuando una corrección no pueda resolverse automáticamente, WALOS deberá detectarla, advertir al usuario, identificar los módulos afectados, marcar que existe una revisión pendiente y permitir continuar o restringir operaciones según la configuración y permisos del negocio.

---

## 3. Alcance

Compras administra el registro de adquisiciones de bienes físicos destinados al negocio.

Ejemplos:

```text
Harina
Pollo
Hígado
Huevos
Bolsas de packaging
Cajas
Film
Detergente
Bolsas de residuos
Esponjas
```

La operación comienza cuando un trabajador inicia el registro de una compra y finaliza cuando la compra queda confirmada y las cantidades correspondientes son incorporadas automáticamente a Inventario.

---

## 4. Fuera del alcance

Compras no será responsable directamente de:

- ejecutar una compra;
- pagar a proveedores;
- administrar cuentas bancarias;
- registrar alquileres, servicios, impuestos o seguros;
- producir mercadería;
- registrar ventas;
- consumir materias primas;
- administrar recetas;
- administrar stock directamente;
- recomendar automáticamente dónde comprar durante el MVP;
- leer automáticamente tickets mediante OCR durante el MVP;
- realizar conciliaciones bancarias;
- manejar logística compleja de entregas parciales durante el MVP.

Los egresos sin existencia física corresponden al módulo de Gastos.

---

## 5. Conceptos principales

```text
CategoriaInsumo
UnidadMedida
Insumo
PresentacionInsumo
Proveedor
Compra
ItemCompra
Comprobante
RegistroCambioCompra
Usuario
```

Inventario será un módulo externo relacionado.

---

## 6. Categoría de insumo

Las categorías permiten organizar los bienes físicos utilizados por el negocio y no deberán implementarse como una enumeración rígida.

```text
CategoriaInsumo
--------------------------------
id
nombre
descripcion
activa
fechaCreacion
```

Ejemplos: Materia prima, Packaging, Limpieza y Otros.

Una categoría utilizada históricamente no deberá eliminarse físicamente; podrá desactivarse.

---

## 7. Insumo

`Insumo` representa el producto o bien general que el negocio desea administrar.

```text
Insumo
--------------------------------
id
nombre
categoriaId
unidadStockId
tipoControlStock
controlaVencimiento
activo
fechaCreacion
```

Ejemplos: Pollo, Harina integral, Hígado, Bolsas de packaging, Detergente.

Cada insumo deberá definir la unidad funcional que Inventario utilizará para expresar sus existencias.

```text
Pollo → kilogramo
Harina → kilogramo
Bolsas packaging → unidad
Huevos → unidad
```

La unidad de stock no necesariamente coincide con la forma en que el producto fue comprado.

---

## 8. Presentación de insumo

Un mismo insumo podrá adquirirse en diferentes presentaciones comerciales.

```text
PresentacionInsumo
--------------------------------
id
insumoId
nombre
marca
unidadCompraId
contenidoPorUnidad
unidadContenidoId
activa
fechaCreacion
```

Ejemplo:

```text
Insumo: Harina integral
Presentaciones:
- Bolsa 1 kg
- Bolsa 5 kg
- Bolsa 10 kg
```

Otro ejemplo:

```text
Insumo: Bolsas packaging
Presentaciones:
- Pack x50
- Pack x100
```

---

## 9. Ficha visual de compra

Las presentaciones funcionarán como fichas reutilizables visibles para el trabajador.

```text
[ fotografía ]

Harina integral
Bolsa 5 kg

Marca: opcional

[-] 2 [+]
```

El trabajador selecciona la ficha, indica cuántas unidades compró y cuánto pagó. La presentación evita volver a cargar nombre, unidad comercial, contenido, unidad del contenido, marca y fotografías.

---

## 10. Fotografías y marca

Las fotografías serán opcionales y podrán utilizarse para facilitar la identificación visual del producto. Una presentación podrá tener una o varias fotografías.

La marca también será opcional. Proveedor y marca representan conceptos diferentes.

---

## 11. Presentaciones inactivas

Las presentaciones utilizadas históricamente no deberán eliminarse definitivamente. Podrán desactivarse cuando dejen de estar disponibles.

Si posteriormente se intenta crear nuevamente una presentación que ya existe pero está inactiva, el sistema deberá advertirlo y ofrecer reactivarla en lugar de crear un duplicado.

---

## 12. Cambio de envase o presentación

Cuando una presentación cambie, el usuario podrá actualizar la existente cuando represente conceptualmente el mismo producto, o desactivar la anterior y crear una nueva cuando resulte importante mantener ambas diferenciadas.

Las operaciones históricas deberán conservar la información correspondiente al momento en que ocurrió cada compra.

---

## 13. Unidades de medida

Las unidades deberán mantenerse mediante un catálogo administrable.

Ejemplos:

```text
Kilogramo
Gramo
Litro
Mililitro
Unidad
Bolsa
Paquete
Caja
Rollo
Tarro
```

```text
UnidadMedida
--------------------------------
id
nombre
simbolo
activa
```

La implementación podrá incorporar información adicional para realizar conversiones compatibles.

---

## 14. Forma de compra y unidad de stock

La forma comercial utilizada para comprar un producto puede ser diferente de la unidad en que Inventario administra ese producto.

```text
Insumo: Harina
Unidad de stock: kg
Presentación: Bolsa 5 kg
Compra: 2 bolsas
Resultado: 10 kg incorporados
```

Otro ejemplo:

```text
Insumo: Bolsa packaging
Unidad de stock: unidad
Presentación: Pack x100
Compra: 3 packs
Resultado: 300 unidades disponibles
```

Inventario podrá posteriormente consumir 150 unidades y dejar 150 disponibles aunque la compra original haya sido realizada en packs.

---

## 15. Conversión de unidades

Las conversiones automáticas deberán realizarse únicamente entre unidades compatibles.

```text
kg <-> g
L <-> ml
```

También podrán utilizarse contenidos definidos en una presentación:

```text
2 bolsas × 5 kg por bolsa = 10 kg
```

No deberán realizarse conversiones arbitrarias entre magnitudes incompatibles.

---

## 16. Proveedor

El proveedor será información deseable, pero no obligatoria.

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

Una compra puede ocurrir en un proveedor habitual, supermercado, feria, mercado, comercio ocasional o vendedor informal.

El negocio debe poder registrar una compra incluso cuando no resulte útil crear un proveedor permanente.

---

## 17. Relación entre proveedor e insumo

La ficha de un producto no dependerá del proveedor. Una misma presentación podrá utilizarse en compras realizadas en distintos comercios.

La relación histórica entre proveedor e insumo surgirá de las compras registradas.

---

## 18. Compra

`Compra` representa el registro dentro de WALOS de una adquisición que ya ocurrió.

```text
Compra
--------------------------------
id
usuarioCreadorId
fechaCompra
estado
estadoRevision
observaciones
fechaCreacion
fechaConfirmacion
fechaUltimaModificacion
```

Proveedor no será necesariamente obligatorio en la cabecera porque una operación podrá incluir información de más de un origen o incluso carecer de proveedor identificado.

---

## 19. Fecha de compra

La fecha de compra será obligatoria. El sistema deberá asignar automáticamente la fecha actual al iniciar la operación y el trabajador podrá modificarla cuando corresponda.

La fecha técnica de creación y modificación deberá ser automática y separada de la fecha comercial de compra.

---

## 20. Ítems de compra

Una compra deberá contener al menos un ítem para poder confirmarse.

```text
ItemCompra
--------------------------------
id
compraId
presentacionId
cantidad
precioTotal
cantidadIncorporada
--------------------------------
calcularCantidadIncorporada()
calcularPrecioPorPresentacion()
calcularPrecioNormalizado()
```

Para confirmar un ítem serán obligatorios:

```text
presentación / producto válido
cantidad > 0
precioTotal > 0
```

---

## 21. Precio registrado y precios derivados

El dato económico principal será el importe realmente pagado.

```text
2 bolsas de harina de 5 kg
Precio total pagado: $12.000
```

El sistema calcula automáticamente:

```text
$6.000 por bolsa
$1.200 / kg
```

No será necesario registrar separadamente promociones o descuentos que ya hayan sido aplicados. El precio unitario y el precio normalizado serán datos derivados.

---

## 22. Descuentos

El MVP de Compras no administrará un motor de descuentos. Compras registra cuánto se pagó realmente.

Las promociones futuras de proveedores pertenecen conceptualmente al futuro Recomendador de Compras.

---

## 23. Compra con varios productos

Una operación podrá contener múltiples ítems. Cada uno conservará presentación, cantidad, precio pagado y cantidad incorporada.

---

## 24. Compra con varios proveedores

El sistema deberá permitir distintos niveles de detalle.

Un negocio podrá:

1. registrar cada proveedor como una compra independiente;
2. cargar primero una compra completa y dividirla posteriormente;
3. conservarla como una única operación cuando no necesite mayor detalle.

Ejemplo:

```text
Pollo: 10 kg
Total: $47.000
```

Posteriormente:

```text
Carnicería A
7 kg
$32.000

Supermercado B
3 kg
$15.000
```

Cuando se realiza esta división, cada parte deberá conservar el importe correspondiente para permitir comparaciones futuras.

---

## 25. Compra sin proveedor

Una compra podrá confirmarse sin proveedor. En ese caso seguirá formando parte de gastos históricos, costos, inventario y análisis generales.

Para análisis por proveedor podrá clasificarse como `Sin proveedor informado`.

---

## 26. Separación posterior de una compra

Una compra cargada inicialmente de forma agrupada podrá ser discriminada posteriormente.

La separación deberá conservar cantidad total, precio total, cantidades asignadas, precios asignados, proveedores y trazabilidad.

La suma de las divisiones deberá coincidir con el total original antes de considerar terminada la separación.

---

## 27. Comprobantes

Los comprobantes serán opcionales.

Una compra podrá tener `0..*` comprobantes, por ejemplo fotografías, PDFs, tickets o facturas.

Una operación podrá tener más de un comprobante y estos funcionarán principalmente como respaldo histórico.

El sistema podrá sugerir separar operaciones cuando existan varios proveedores, pero esa separación no deberá impedir una carga rápida.

---

## 28. Borrador

Una compra iniciará en estado `BORRADOR`.

Mientras permanezca en borrador podrá editarse libremente, agregar o eliminar ítems, cambiar cantidades, precios, comprobantes, fecha y observaciones, o eliminarse completamente.

El borrador todavía no afecta Inventario.

---

## 29. Propiedad y duración del borrador

El borrador pertenece al usuario que inició la operación.

Un trabajador normal no deberá poder visualizar, editar, eliminar ni confirmar el borrador de otro trabajador.

Como regla inicial del MVP, un borrador podrá conservarse durante 24 horas.

Para simplificar inicialmente el flujo, se podrá considerar un máximo de un borrador activo por usuario. Esta regla deberá poder revisarse si durante el uso real resulta demasiado restrictiva.

---

## 30. Confirmación

Una compra solamente podrá confirmarse cuando tenga:

- fecha válida;
- al menos un ítem;
- cantidad mayor a cero por ítem;
- precio total mayor a cero por ítem;
- presentación o producto válido.

Proveedor, comprobantes, marca, fotografías y observaciones no serán obligatorios.

---

## 31. Confirmación e Inventario

Confirmar una compra deberá actualizar Inventario automáticamente.

No deberá existir un segundo botón de ingreso a Inventario.

```text
Confirmar compra
      ↓
Registrar compra
      ↓
Registrar entradas de Inventario
      ↓
Actualizar disponibilidad
```

Compras conserva cómo fue adquirida la mercadería. Inventario conserva cuánto se encuentra disponible funcionalmente.

---

## 32. Consumo posterior

Una vez incorporado el stock, otros módulos podrán utilizar cantidades diferentes a las presentaciones originales.

```text
Compra:
1 paquete de 10 kg
1 paquete de 25 kg

Inventario:
35 kg disponibles

Producción necesita:
9 kg
```

Inventario deberá permitir consumir esos 9 kg manteniendo la trazabilidad que corresponda.

La lógica detallada de consumo pertenece a Inventario y Producción.

---

## 33. Integración con Producción

Si una receta requiere 4 kg de pollo por tanda y existen 7 kg disponibles:

```text
1 tanda → puede producir
2 tandas → requiere 8 kg
faltante → 1 kg
```

Compras únicamente origina las entradas de stock. La validación de recetas corresponde al módulo de Producción.

---

## 34. Tipos de control de stock

No todos los insumos requieren el mismo nivel de seguimiento.

Inicialmente podrán contemplarse:

```text
CONTROL_MINIMO
CONTROL_PERIODICO
SIN_CONTROL_DETALLADO
```

`CONTROL_MINIMO` permite definir una cantidad mínima disponible.

`CONTROL_PERIODICO` permite solicitar revisiones cada determinado período.

`SIN_CONTROL_DETALLADO` permite registrar la compra y el costo sin registrar necesariamente cada unidad consumida.

La implementación de alertas pertenece principalmente a Inventario.

---

## 35. Vencimientos

Un insumo o presentación podrá requerir control de vencimiento.

Por ejemplo, pollo fresco podría generar una alerta de próximo vencimiento y permitir registrar un cambio de estado a congelado.

El detalle de congelamiento, descongelamiento y alertas pertenece principalmente al módulo de Inventario.

---

## 36. Estados de Compra

Los estados básicos considerados son:

```text
BORRADOR
CONFIRMADA
ANULADA
```

La necesidad de revisión deberá modelarse separadamente del estado comercial de la compra.

Ejemplo:

```text
Estado: ANULADA
Estado de consistencia: REQUIERE_REVISION
```

---

## 37. Estado de consistencia

Conceptualmente podrán existir:

```text
CONSISTENTE
REQUIERE_REVISION
```

Una compra confirmada, corregida o anulada puede provocar que otros módulos requieran revisión.

```text
Compra: ANULADA
Consistencia: REQUIERE_REVISION
Módulos afectados:
- Inventario
- Producción
```

---

## 38. Edición de una compra confirmada

Una compra confirmada no deberá ser completamente inmutable.

El objetivo es permitir corregir errores de forma práctica sin perder trazabilidad.

Podrán existir ediciones seguras y ediciones con impacto operativo.

Cambios como observaciones, fotografías, comprobantes o información descriptiva podrán realizarse conservando historial.

Modificar cantidad, presentación, fecha relevante, precio o distribución por proveedor puede afectar Inventario, Producción, costos o análisis.

---

## 39. Corrección automática

Si una modificación permite pasar de un estado válido a otro estado válido, el sistema podrá ofrecer aplicar los ajustes automáticamente.

```text
Compra original: 10 kg
Corrección: 8 kg
Ajuste requerido: -2 kg
```

Cuando una corrección requiera afectar otros módulos, el sistema podrá preguntar si desea aplicar automáticamente los ajustes o dejarlos para revisión posterior.

---

## 40. Corrección que produce inconsistencia

```text
Compra original: 15 kg de pollo
Producción ya consumió: 10 kg
Compra corregida: 5 kg
```

El sistema podrá aceptar la corrección pero deberá marcar `REQUIERE_REVISION` e identificar los módulos afectados.

Una inconsistencia no implica obligatoriamente detener toda la empresa. El negocio podrá decidir continuar operaciones o bloquear las operaciones afectadas hasta la regularización.

---

## 41. Anulación

Una compra confirmada podrá anularse cuando sea necesario.

La compra anulada no deberá eliminarse.

Deberá conservar información original, usuario que la anuló, fecha y hora, motivo, consecuencias sobre Inventario y estado de revisión.

Cuando sea posible volver a un estado consistente, WALOS podrá ofrecer revertir automáticamente los movimientos relacionados.

Si no puede realizarse una reversión segura:

```text
Estado: ANULADA
Consistencia: REQUIERE_REVISION
```

---

## 42. Auditoría

Toda acción relevante deberá vincularse a un usuario.

Como mínimo se deberá conservar:

- usuario creador;
- usuario que confirmó;
- usuario que modificó;
- usuario que anuló;
- fecha y hora de cada acción;
- información modificada;
- motivo cuando corresponda.

Una acción iniciada por un trabajador deberá pertenecer a ese trabajador. Usuarios con permisos superiores podrán intervenir cuando las reglas del negocio lo permitan.

---

## 43. Historial de cambios

Las modificaciones posteriores a una compra confirmada deberán conservar información suficiente para reconstruir qué ocurrió.

```text
RegistroCambioCompra
--------------------------------
id
compraId
usuarioId
fecha
tipo
motivo
datosAnteriores
datosNuevos
```

La representación técnica definitiva podrá simplificarse durante la implementación si existe otra estrategia de auditoría adecuada.

---

## 44. Prevención de duplicados

El sistema deberá ayudar a evitar compras duplicadas sin bloquear innecesariamente al usuario.

Podrán utilizarse como señales fecha, productos, cantidades, precios, proveedor y comprobantes.

Ante una posible coincidencia podrá mostrarse una advertencia para que el trabajador revise la operación.

---

## 45. Experiencia de usuario

La experiencia buscada es similar a aplicaciones de compra modernas.

El usuario debería poder:

1. abrir una compra;
2. seleccionar visualmente una ficha;
3. indicar cantidad;
4. indicar precio total;
5. agregar otro producto;
6. finalizar la carga principal;
7. opcionalmente agregar proveedor, comprobantes y observaciones;
8. confirmar.

Los datos derivados deberán calcularse automáticamente.

Si el producto o presentación no existe, deberá poder crearse sin abandonar la compra.

---

## 46. Datos obligatorios y opcionales

Una compra confirmada deberá tener fecha y al menos un ítem.

Cada ítem deberá tener:

```text
producto/presentación válida
cantidad > 0
precioTotal > 0
```

Serán opcionales:

```text
proveedor
marca
fotografías
comprobantes
observaciones
dirección/lugar
```

---

## 47. Relación con Gastos

Compras registra bienes físicos. Gastos registra egresos sin stock.

```text
                  EGRESOS
                     │
             ┌───────┴───────┐
             │               │
          Compras           Gastos
             │               │
       bienes físicos    sin existencia
             │
         Inventario
```

Un bien físico puede registrarse como Compra aunque posteriormente no se controle cada consumo individual, por ejemplo detergente o bolsas de residuos.

---

## 48. Relación con el futuro Recomendador de Compras

Compras registra lo que ocurrió.

El futuro Recomendador utilizará el historial para ayudar a decidir qué hacer, teniendo en cuenta precios, proveedores, promociones conocidas, inventario y necesidades futuras.

Esta funcionalidad no deberá complicar el registro básico del MVP.

---

## 49. OCR y lectura automática de comprobantes

En una evolución posterior, WALOS podrá analizar fotografías o PDFs de comprobantes e intentar detectar fecha, comercio, productos, cantidades, precios y total.

La información deberá presentarse al usuario para revisión.

No deberá confirmarse automáticamente porque un comprobante puede incluir productos personales o ajenos al negocio.

---

## 50. Recepción y logística

Para el MVP no se modelará una logística compleja entre fecha de compra, fecha de despacho y fecha de recepción.

La fecha principal será `fechaCompra`.

Una versión dirigida a empresas de mayor escala podrá incorporar recepción parcial o diferida.

---

## 51. Modelo conceptual actualizado

```text
CategoriaInsumo
      │
      └─────── Insumo
                  │
                  └─────── PresentacionInsumo
                               │
                               │
Compra ─────── ItemCompra ─────┘
  │
  ├──────── Comprobante
  │
  └──────── RegistroCambioCompra
```

`Proveedor` podrá relacionarse de forma opcional con la compra o con divisiones de la compra cuando existan múltiples orígenes.

`Usuario` será una entidad externa utilizada para trazabilidad.

---

## 52. Relaciones principales

```text
CategoriaInsumo 1 ──────── 0..* Insumo
Insumo 1 ──────────────── 1..* PresentacionInsumo
Compra 1 ──────────────── 1..* ItemCompra
PresentacionInsumo 1 ──── 0..* ItemCompra
Compra 1 ──────────────── 0..* Comprobante
Compra 1 ──────────────── 0..* RegistroCambioCompra
```

---

## 53. Proveedores múltiples: decisión de implementación pendiente

Funcionalmente queda definido que una carga puede contener uno o varios proveedores.

Todavía deberá resolverse durante el diseño de clases si esto se representa mediante un proveedor opcional en el detalle o mediante una entidad intermedia similar a `OrigenCompra`, `GrupoCompra` o `DivisionCompra`.

El criterio será utilizar la solución más simple que permita proveedor opcional, varios proveedores, cantidades parciales, precios parciales, comprobantes y análisis histórico correcto.

---

## 54. Reglas de negocio consolidadas

1. Una compra representa una operación ocurrida fuera del sistema.
2. El registro puede realizarse después de la compra real.
3. Toda compra confirmada debe tener al menos un ítem.
4. Toda cantidad debe ser mayor que cero.
5. Todo ítem confirmado debe tener un precio total efectivamente pagado mayor que cero.
6. La fecha de compra es obligatoria y por defecto corresponde al día actual.
7. El proveedor es opcional.
8. Los comprobantes son opcionales.
9. Una compra puede contener varios comprobantes.
10. Una compra puede incluir múltiples productos.
11. El usuario debe poder reutilizar fichas y presentaciones previamente registradas.
12. Las fotografías son opcionales.
13. La marca es opcional.
14. Una presentación histórica no deberá eliminarse físicamente si ya fue utilizada.
15. Una presentación inactiva deberá poder reactivarse.
16. El sistema calculará automáticamente la cantidad incorporada.
17. El sistema calculará automáticamente los precios unitarios y normalizados.
18. Confirmar una compra deberá incorporar automáticamente las cantidades a Inventario.
19. Un borrador no afecta Inventario.
20. Un borrador pertenece al usuario que lo creó.
21. Como regla inicial, cada usuario podrá mantener como máximo un borrador activo.
22. Los borradores podrán caducar después de aproximadamente 24 horas.
23. Una compra confirmada podrá ser corregida conservando trazabilidad.
24. Las correcciones seguras podrán ajustarse automáticamente.
25. Una corrección que produzca inconsistencias deberá marcar `REQUIERE_REVISION`.
26. Una inconsistencia no deberá necesariamente bloquear toda la operación de la empresa.
27. La continuidad o bloqueo dependerá posteriormente de reglas y permisos.
28. Una compra anulada no deberá desaparecer del historial.
29. Una anulación deberá identificar al usuario responsable.
30. Si una anulación puede revertirse automáticamente de forma segura, el sistema podrá ofrecer hacerlo.
31. Si la anulación no puede dejar automáticamente el sistema consistente, deberá quedar `ANULADA + REQUIERE_REVISION`.
32. Los descuentos comerciales no necesitan registrarse individualmente en el MVP.
33. El precio de Compra representa el valor final realmente pagado.
34. El sistema deberá permitir posteriormente comparar costos normalizados entre proveedores y presentaciones.
35. El catálogo de productos no deberá depender del proveedor.
36. Las compras sin proveedor deberán seguir participando del análisis general de gastos.
37. Compras e Inventario son módulos separados, pero la confirmación debe disparar automáticamente la correspondiente entrada de stock.

---

## 55. Implementación actual

Actualmente se encuentra implementada la base de los catálogos:

```text
Proveedor
CategoriaInsumo
UnidadMedida
Insumo
```

con sus operaciones CRUD básicas.

También existe una migración que actualiza las unidades de medida y la relación con Insumo.

El diseño funcional fue actualizado posteriormente mediante entrevista con el cliente, por lo cual los modelos existentes deberán revisarse antes de implementar:

```text
PresentacionInsumo
Compra
ItemCompra
Comprobante
RegistroCambioCompra
```

---

## 56. Próximos pasos

```text
1. Consolidar este diseño funcional.
2. Actualizar el diagrama de arquitectura funcional.
3. Actualizar el diagrama de clases.
4. Revisar Insumo y UnidadMedida.
5. Incorporar PresentacionInsumo.
6. Diseñar Compra e ItemCompra.
7. Implementar borradores.
8. Implementar confirmación.
9. Integrar confirmación con Inventario.
10. Implementar comprobantes.
11. Implementar correcciones y anulaciones.
12. Agregar auditoría.
13. Implementar pruebas.
14. Construir una interfaz mínima.
15. Probar el flujo desde navegador y teléfono.
16. Corregir documentación final.
```

---

## 57. Extensiones futuras

Quedan explícitamente fuera del MVP inicial:

- OCR de tickets y facturas;
- extracción automática de productos;
- detección avanzada de compras personales dentro de un comprobante;
- recomendaciones de proveedores;
- promociones futuras;
- planificación automática de compras;
- comparación automática de descuentos;
- logística compleja;
- recepciones parciales;
- multimoneda;
- tratamiento impositivo avanzado;
- conciliación bancaria;
- distribución automática de costos operativos;
- módulo general de regularización de inconsistencias;
- adaptación general para múltiples empresas.

---

## 58. Criterio de cierre del módulo

Compras no se considerará terminado solamente porque existan tablas y endpoints.

El módulo se considerará funcional cuando un trabajador pueda realizar de punta a punta un flujo similar a:

```text
Crear o elegir producto
        ↓
Elegir presentación
        ↓
Agregar cantidad
        ↓
Agregar precio pagado
        ↓
Agregar otros productos
        ↓
Agregar proveedor opcional
        ↓
Agregar comprobante opcional
        ↓
Confirmar
        ↓
Inventario actualizado automáticamente
        ↓
Consultar historial
        ↓
Corregir o anular conservando trazabilidad
```

El flujo deberá poder probarse desde una interfaz simple antes de avanzar a otro módulo de WALOS.
