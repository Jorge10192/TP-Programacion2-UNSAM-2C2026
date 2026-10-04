# Diseño técnico — Módulo de Gastos

## Objetivo

El módulo de Gastos tendrá como responsabilidad registrar y administrar los egresos económicos de WALOS que no representan la adquisición de bienes físicos destinados al inventario.

El objetivo principal es diferenciar claramente dos conceptos:

- las compras de bienes físicos;
- los gastos operativos del negocio.

Aunque ambos representan una salida de dinero para WALOS, su comportamiento dentro del sistema es diferente.

Una compra puede generar existencias físicas y afectar al módulo de Inventario.

Un gasto operativo, en cambio, representa un egreso económico que no genera stock.

Esta separación permitirá posteriormente realizar análisis más precisos de costos, egresos, rentabilidad y funcionamiento general del negocio.

---

## Diferencia entre Compra y Gasto

### Compra

Una compra representa la adquisición de uno o más bienes físicos.

Ejemplos:

- harina;
- avena;
- queso;
- huevos;
- aceite;
- bolsas;
- film;
- materiales de empaque;
- productos de limpieza;
- otros insumos físicos.

Una compra podrá:

- estar asociada a un proveedor;
- contener varios ítems;
- registrar cantidades;
- registrar precios;
- conservar comprobantes;
- generar entradas en Inventario cuando corresponda.

Conceptualmente:

```text
Compra
   ↓
adquisición de bienes físicos
   ↓
puede generar existencias
   ↓
puede afectar Inventario
```

### Gasto

Un gasto representa una salida económica que no genera una existencia física en Inventario.

Ejemplos:

- alquiler;
- electricidad;
- gas;
- agua;
- internet;
- impuestos;
- tasas;
- seguros;
- alquiler de un puesto en una feria;
- transporte;
- otros gastos operativos.

Conceptualmente:

```text
Gasto
   ↓
egreso económico
   ↓
no genera stock
   ↓
no modifica Inventario
```

Por lo tanto, Compras y Gastos deberán administrarse como conceptos independientes.

---

## Alcance del módulo

El módulo de Gastos permitirá registrar egresos operativos que no correspondan a compras de bienes físicos.

Inicialmente deberá permitir:

- registrar un gasto;
- indicar una descripción;
- asignar una categoría;
- registrar el importe;
- registrar la fecha correspondiente;
- indicar opcionalmente el período al cual pertenece;
- registrar una fecha de vencimiento cuando corresponda;
- registrar una fecha de pago cuando corresponda;
- indicar si se trata de un gasto recurrente;
- agregar observaciones;
- adjuntar opcionalmente un comprobante;
- identificar automáticamente al usuario responsable;
- conservar el historial de gastos;
- administrar categorías de gastos propias del negocio.

El módulo de Gastos no administrará existencias físicas ni modificará Inventario.

---

## Categorías de gastos

Las categorías de gastos no deberán quedar limitadas a una enumeración fija dentro del código.

El sistema deberá proporcionar un catálogo administrable de categorías.

Esto permitirá que WALOS pueda adaptar la clasificación de sus gastos cuando aparezcan nuevas actividades o necesidades del negocio sin necesidad de modificar el código de la aplicación.

Inicialmente, el sistema podrá incluir categorías predefinidas como:

- Alquiler;
- Servicios;
- Impuestos y tasas;
- Seguros;
- Ferias;
- Transporte;
- Otros.

Estas categorías funcionarán como valores iniciales del catálogo.

Los usuarios autorizados podrán crear nuevas categorías posteriormente.

Ejemplo:

```text
Nueva actividad:
Servicio de cumpleaños

Nueva categoría:
Eventos
```

Posteriormente podrán registrarse gastos como:

```text
Descripción:
Alquiler de salón para cumpleaños

Categoría:
Eventos

Importe:
$120.000
```

Esto permitirá que el sistema acompañe la evolución del negocio sin depender de nuevas versiones de software para cada cambio de clasificación.

---

## Catálogo de categorías de gastos

Conceptualmente, el sistema podrá utilizar una entidad similar a:

```text
CategoriaGasto
--------------------------------
id
nombre
descripcion
activa
esSistema
fechaCreacion
```

### id

Identificador único de la categoría.

### nombre

Nombre visible de la categoría.

Ejemplos:

```text
Alquiler
Servicios
Eventos
Publicidad
```

### descripcion

Información opcional que permita explicar el propósito de la categoría.

Ejemplo:

```text
Eventos

Gastos relacionados con servicios de cumpleaños,
alquileres de salones, decoración y otros conceptos similares.
```

### activa

Permite determinar si una categoría puede seguir utilizándose para registrar nuevos gastos.

Una categoría inactiva no deberá aparecer como opción disponible al registrar nuevos gastos.

Sin embargo, deberá conservarse para mantener correctamente el historial.

### esSistema

Permite distinguir entre categorías iniciales proporcionadas por WALOS y categorías creadas posteriormente por los usuarios.

Ejemplo:

```text
Alquiler
esSistema = true

Eventos
esSistema = false
```

Esta distinción podrá utilizarse posteriormente para aplicar reglas diferentes de edición o eliminación.

### fechaCreacion

Fecha y hora en la cual se creó la categoría.

---

## Gestión de categorías

El sistema deberá permitir administrar el catálogo de categorías.

Inicialmente podrán contemplarse operaciones como:

- crear una categoría;
- consultar categorías;
- modificar nombre o descripción;
- activar una categoría;
- desactivar una categoría.

Una categoría que ya haya sido utilizada por gastos históricos no deberá eliminarse físicamente.

Esto evitará perder referencias históricas.

Por ejemplo:

```text
Gasto histórico:
Alquiler salón cumpleaños

Categoría:
Eventos
```

Si posteriormente WALOS deja de ofrecer servicios de cumpleaños, la categoría `Eventos` podrá pasar a:

```text
activa = false
```

pero el gasto histórico continuará conservando la relación con esa categoría.

---

## Relación entre Gasto y CategoriaGasto

Conceptualmente:

```text
CategoriaGasto
      1
      │
      │
      │ 0..*
      ↓
    Gasto
```

Una categoría podrá estar asociada a múltiples gastos.

Cada gasto pertenecerá a una categoría.

Ejemplo:

```text
CategoriaGasto:
Servicios

Gastos asociados:
- Electricidad septiembre
- Electricidad octubre
- Internet octubre
- Agua octubre
```

---

## Categorías iniciales sugeridas

Aunque el catálogo será administrable, WALOS podrá contar inicialmente con algunas categorías precargadas.

### Alquiler

Incluye gastos relacionados con el alquiler de espacios utilizados por WALOS.

Ejemplos:

- alquiler del local comercial;
- alquiler de depósito;
- alquiler de otros espacios utilizados permanentemente.

Ejemplo:

```text
Descripción:
Alquiler local octubre 2026

Categoría:
Alquiler

Importe:
$350.000

Período:
10/2026
```

---

## Servicios

Incluye servicios necesarios para el funcionamiento del negocio.

Ejemplos:

- electricidad;
- gas;
- agua;
- internet;
- telefonía;
- otros servicios.

Ejemplo:

```text
Descripción:
Factura de electricidad

Categoría:
Servicios

Importe:
$42.500

Período:
10/2026

Vencimiento:
15/11/2026
```

El importe de un servicio puede variar entre períodos aunque se trate de un gasto recurrente.

---

## Impuestos y tasas

Incluye obligaciones tributarias, tasas y conceptos similares vinculados a la actividad de WALOS.

Ejemplos:

- monotributo;
- ingresos brutos;
- tasas municipales;
- habilitaciones;
- otros impuestos;
- otros tributos o tasas.

Ejemplo:

```text
Descripción:
Monotributo octubre 2026

Categoría:
Impuestos y tasas

Importe:
$...

Período:
10/2026
```

### Condición fiscal

La condición fiscal del negocio no constituye por sí misma un gasto.

Por ejemplo:

```text
MONOTRIBUTISTA
RESPONSABLE_INSCRIPTO
```

representan situaciones fiscales del negocio.

Estas condiciones podrán formar parte posteriormente de una configuración fiscal independiente.

Los pagos concretos derivados de dicha situación fiscal sí podrán registrarse como gastos.

Por ejemplo:

```text
Condición fiscal del negocio:
MONOTRIBUTISTA

Gasto registrado:
Monotributo octubre 2026
```

o, en una situación fiscal diferente:

```text
Condición fiscal del negocio:
RESPONSABLE_INSCRIPTO

Gastos o conceptos fiscales:
IVA
Ingresos Brutos
Tasas
Otros
```

El sistema no deberá considerar `RESPONSABLE_INSCRIPTO` como un gasto en sí mismo.

---

## Seguros

Incluye gastos relacionados con seguros contratados por WALOS.

Ejemplos:

- seguro del local;
- seguro relacionado con la actividad comercial;
- seguro de equipamiento;
- otros seguros necesarios para el negocio.

Ejemplo:

```text
Descripción:
Seguro del local

Categoría:
Seguros

Importe:
$...

Período:
10/2026
```

---

## Ferias

Incluye gastos relacionados directamente con la participación de WALOS en ferias o eventos.

Ejemplos:

- alquiler del puesto;
- derecho de participación;
- inscripción;
- servicios asociados al evento;
- otros gastos específicos de una feria.

Ejemplo:

```text
Descripción:
Alquiler de puesto - Feria San Martín

Categoría:
Ferias

Importe:
$35.000

Fecha:
12/10/2026
```

Estos registros podrán utilizarse posteriormente para analizar la rentabilidad de cada feria.

Por ejemplo:

```text
Ventas realizadas en Feria A
-
Gastos asociados a Feria A
=
Resultado aproximado de la feria
```

---

## Transporte

Incluye gastos relacionados con movimientos, logística y traslado.

Ejemplos:

- fletes;
- traslado de mercadería;
- transporte hacia ferias;
- transporte desde proveedores;
- otros gastos logísticos.

Ejemplo:

```text
Descripción:
Flete hacia feria

Categoría:
Transporte

Importe:
$18.000
```

---

## Otros

La categoría `Otros` podrá existir como categoría inicial para registrar gastos difíciles de clasificar.

Sin embargo, no deberá utilizarse como única solución para nuevas actividades del negocio.

Si un tipo de gasto comienza a repetirse o se vuelve relevante, los usuarios podrán crear una nueva categoría.

Ejemplo:

```text
Antes:

Descripción:
Alquiler salón cumpleaños

Categoría:
Otros
```

Posteriormente WALOS podrá crear:

```text
Nueva categoría:
Eventos
```

y utilizarla para operaciones futuras.

Esto permitirá mantener una clasificación cada vez más representativa del negocio.

---

## Ejemplo de evolución del catálogo

El sistema podría entregarse inicialmente con:

```text
Alquiler
Servicios
Impuestos y tasas
Seguros
Ferias
Transporte
Otros
```

Tiempo después WALOS podría incorporar:

```text
Eventos
Publicidad
Mantenimiento
Delivery
Equipamiento
```

sin necesidad de modificar el código fuente.

---

## Gasto recurrente y gasto ocasional

Un gasto podrá clasificarse como recurrente o eventual.

### Gasto recurrente

Es un gasto que aparece periódicamente.

Ejemplos:

- alquiler;
- electricidad;
- gas;
- internet;
- seguro;
- monotributo;
- otros impuestos periódicos.

Que un gasto sea recurrente no significa que su importe sea siempre igual.

Por ejemplo:

```text
Electricidad septiembre:
$35.000

Electricidad octubre:
$42.500
```

Ambos pertenecen al mismo concepto recurrente, pero poseen importes diferentes.

### Gasto ocasional

Es un gasto que ocurre de manera puntual o excepcional.

Ejemplos:

- reparación de un equipo;
- flete extraordinario;
- inscripción especial a un evento;
- trámite administrativo;
- reparación del local;
- alquiler eventual de un salón.

---

## Modelo conceptual inicial

Inicialmente se consideran las siguientes entidades:

### Gasto

```text
Gasto
--------------------------------
id
descripcion
categoriaId
importe
fecha
periodo
fechaVencimiento
fechaPago
recurrente
observaciones
fechaCreacion
```

Además, deberá conservarse el usuario responsable de registrar la operación.

### CategoriaGasto

```text
CategoriaGasto
--------------------------------
id
nombre
descripcion
activa
esSistema
fechaCreacion
```

El modelo definitivo podrá ajustarse durante la implementación.

---

## Importe

Todo gasto deberá registrar el importe correspondiente.

Ejemplo:

```text
Descripción:
Alquiler local octubre

Categoría:
Alquiler

Importe:
$350.000
```

El importe deberá conservarse como parte del registro histórico.

Una modificación posterior no deberá eliminar silenciosamente la información necesaria para mantener trazabilidad.

---

## Fecha del gasto

Todo gasto deberá registrar una fecha asociada.

Dependiendo del tipo de gasto podrán existir distintas fechas relevantes:

```text
fecha del gasto

fecha de vencimiento

fecha de pago
```

Estas fechas no necesariamente serán iguales.

---

## Período del gasto

Algunos gastos estarán asociados a un período específico.

Ejemplo:

```text
Descripción:
Factura de electricidad

Fecha de emisión:
05/11/2026

Fecha de pago:
10/11/2026

Período:
10/2026
```

La fecha del movimiento y el período económico al que pertenece el gasto pueden ser diferentes.

Conservar esta información permitirá realizar análisis mensuales correctamente.

---

## Vencimiento

Algunos gastos podrán poseer una fecha de vencimiento.

Ejemplo:

```text
Factura de electricidad

Importe:
$42.500

Vencimiento:
15/11/2026
```

Esto permitirá posteriormente agregar funcionalidades como:

- gastos pendientes;
- próximos vencimientos;
- alertas;
- recordatorios.

---

## Fecha de pago

Un gasto podrá registrarse antes de haber sido pagado.

Ejemplo:

```text
Factura registrada:
05/11/2026

Vencimiento:
15/11/2026

Fecha de pago:
sin registrar
```

Posteriormente:

```text
Fecha de pago:
12/11/2026
```

Esto permitirá diferenciar conceptualmente:

```text
gasto registrado

gasto pendiente de pago

gasto pagado
```

El mecanismo definitivo para administrar estados de pago se definirá durante la implementación del módulo.

---

## Comprobantes

Un gasto podrá tener asociado opcionalmente un comprobante.

Ejemplos:

- factura;
- recibo;
- comprobante bancario;
- archivo PDF;
- fotografía;
- imagen.

El comprobante funcionará como evidencia de la operación.

La forma definitiva de almacenamiento físico de imágenes y archivos PDF se definirá posteriormente.

La base de datos deberá conservar al menos una referencia que permita relacionar el comprobante con el gasto correspondiente.

---

## Relación con Usuarios

Toda operación relevante deberá quedar vinculada al usuario responsable.

El sistema deberá identificar automáticamente al usuario que:

- registra un gasto;
- registra un pago;
- realiza una corrección;
- anula un gasto;
- modifica información permitida;
- crea o modifica categorías de gastos.

La autenticación y administración general de usuarios no será responsabilidad del módulo de Gastos.

Estas funcionalidades pertenecerán al módulo de Usuarios y Autenticación.

El módulo de Gastos utilizará la identidad del usuario autenticado para conservar la trazabilidad de las operaciones.

---

## Relación con Compras

Compras y Gastos representan conceptos diferentes.

```text
Compras
   ↓
adquisición de bienes físicos
   ↓
pueden afectar Inventario


Gastos
   ↓
egresos operativos
   ↓
no generan inventario
```

No deberán almacenarse ambos conceptos dentro de una misma entidad.

Sin embargo, ambos representan egresos económicos del negocio y podrán ser utilizados posteriormente por módulos de análisis.

---

## Relación con Inventario

El módulo de Gastos no deberá modificar Inventario.

Registrar:

```text
Alquiler:
$350.000
```

no genera una entrada o salida física de mercadería.

Por lo tanto, un gasto no deberá generar movimientos de stock.

Conceptualmente:

```text
Gasto
   X
Inventario
```

No existirá una relación directa de actualización de existencias.

---

## Relación con Producción

Los gastos operativos no serán consumidos directamente por una producción.

Por ejemplo:

```text
Alquiler
Electricidad
Seguro
```

no representan cantidades físicas que puedan descontarse de Inventario.

Sin embargo, en el futuro podrán utilizarse para análisis de costos generales de producción.

Por ejemplo:

```text
Costo de materias primas
+
Costo de empaques
+
Costos operativos asignados
=
Costo aproximado de producción
```

La metodología exacta para distribuir gastos generales entre productos queda fuera del alcance inicial.

---

## Relación con Ventas

El módulo de Gastos no modificará directamente una venta.

Sin embargo, la información podrá utilizarse posteriormente para analizar resultados económicos.

Por ejemplo:

```text
Ingresos por ventas
-
Compras
-
Gastos
=
Resultado aproximado
```

---

## Relación con Ferias

Los gastos categorizados como relacionados con ferias podrán vincularse posteriormente con una feria o evento concreto.

Ejemplo:

```text
Feria San Martín

Ventas:
$250.000

Alquiler del puesto:
$30.000

Transporte:
$15.000
```

Esto permitirá posteriormente analizar:

```text
ingresos de la feria
-
gastos asociados
=
resultado de la feria
```

La relación definitiva entre gastos y ferias se diseñará cuando se implemente dicha funcionalidad.

---

## Relación con nuevas actividades del negocio

El catálogo dinámico de categorías permitirá que WALOS pueda incorporar nuevos tipos de actividad.

Ejemplo:

```text
Nueva actividad:
Servicios de cumpleaños
```

WALOS podrá crear categorías como:

```text
Eventos
Decoración
Alquiler de salones
Animación
```

sin requerir modificaciones en el código.

Esto permitirá que el sistema siga siendo útil aunque el negocio amplíe sus servicios después de la entrega inicial.

---

## Relación con Analítica y Finanzas

En el futuro, los módulos de análisis podrán combinar información proveniente de:

```text
Ventas
Compras
Gastos
```

para obtener indicadores como:

- ingresos totales;
- egresos por compras;
- egresos operativos;
- gastos por categoría;
- gastos mensuales;
- evolución de servicios;
- gasto tributario;
- costos asociados a ferias;
- costos asociados a eventos;
- resultado económico aproximado;
- rentabilidad.

Ejemplo:

```text
Ventas del mes                 $1.500.000

Compras de insumos              $400.000
Alquiler                        $250.000
Servicios                        $70.000
Impuestos                        $50.000
Seguros                          $20.000

-----------------------------------------

Resultado aproximado            $710.000
```

El módulo de Gastos solamente será responsable de registrar y conservar correctamente los egresos correspondientes.

Los cálculos y análisis serán responsabilidad de otros módulos.

---

## Historial y trazabilidad

Los gastos deberán conservar información histórica.

Una operación ya registrada no deberá eliminarse o sobrescribirse silenciosamente si esto provoca pérdida de trazabilidad.

Las futuras operaciones de corrección o anulación deberán permitir conocer:

- gasto original;
- usuario responsable;
- fecha de modificación;
- motivo;
- información corregida.

El mecanismo definitivo de correcciones se definirá durante la implementación.

Las categorías utilizadas históricamente tampoco deberán eliminarse físicamente.

Si dejan de utilizarse deberán pasar a estado inactivo.

---

## Posibles estados futuros

Dependiendo de las necesidades detectadas durante la implementación, un gasto podría utilizar estados como:

```text
PENDIENTE
PAGADO
ANULADO
REQUIERE_REVISION
```

Estos estados todavía no se consideran definitivos.

Su necesidad se evaluará cuando se desarrolle el caso de uso correspondiente.

---

## Fuera de alcance inicial

En una primera implementación, el módulo de Gastos no será responsable de:

- realizar liquidaciones impositivas;
- calcular automáticamente impuestos;
- determinar automáticamente la condición fiscal del negocio;
- reemplazar a un contador;
- realizar pagos bancarios;
- generar balances contables oficiales;
- llevar contabilidad formal;
- presentar declaraciones juradas;
- realizar trámites fiscales;
- administrar stock;
- registrar compras de bienes físicos;
- calcular automáticamente rentabilidad contable.

El objetivo será registrar información operativa suficiente para mejorar la gestión interna de WALOS.

---

## Configuración fiscal futura

La situación fiscal del negocio podrá modelarse posteriormente como una configuración independiente.

Ejemplo conceptual:

```text
ConfiguracionFiscal
--------------------------------
condicionFiscal
cuit
inicioActividad
otrosDatos
```

Con posibles condiciones como:

```text
MONOTRIBUTISTA

RESPONSABLE_INSCRIPTO
```

Esta información no deberá confundirse con los gastos tributarios efectivamente pagados.

Por ejemplo:

```text
Condición fiscal:
MONOTRIBUTISTA

Pago realizado:
Monotributo octubre
→ Gasto
```

---

## Posibles extensiones futuras

El módulo podrá ampliarse posteriormente con:

- gastos recurrentes automáticos;
- recordatorios de vencimiento;
- alertas de gastos pendientes;
- estados de pago;
- presupuestos mensuales;
- comparación entre períodos;
- comparación entre categorías;
- alertas ante aumentos significativos;
- proyección de gastos;
- asociación de gastos con ferias;
- asociación de gastos con eventos;
- asociación de gastos con ubicaciones;
- integración con medios de pago;
- integración con cuentas bancarias;
- reportes mensuales;
- reportes por categoría;
- reportes por feria;
- reportes por evento;
- clasificación automática de comprobantes;
- lectura automática de facturas mediante OCR;
- configuración fiscal del negocio;
- análisis de costos;
- análisis de rentabilidad.

---

## Posible caso de uso futuro

Actualmente existe conceptualmente la necesidad de registrar costos y gastos del negocio.

Al desarrollar formalmente este módulo podrá definirse un caso de uso como:

```text
CU-12 — Registrar gasto
```

que reemplace o amplíe una definición más limitada como:

```text
Registrar costos fijos
```

Esto permitirá contemplar tanto gastos fijos como gastos variables y ocasionales.

Ejemplos:

```text
Alquiler
→ recurrente

Electricidad
→ recurrente, importe variable

Seguro
→ recurrente

Feria
→ ocasional

Flete extraordinario
→ ocasional

Alquiler de salón para evento
→ ocasional
```

---

## Estado actual

El módulo de Gastos se encuentra planificado.

Todavía no forma parte de la implementación actual de WALOS.

La implementación actual continúa concentrada en el módulo de Compras.

Por este motivo todavía no deberán crearse:

```text
src/gastos/models.py
src/gastos/schemas.py
src/gastos/routes.py
```

ni deberá registrarse un router de Gastos en:

```text
src/main.py
```

Antes de implementar este módulo deberán definirse con mayor detalle:

- casos de uso;
- reglas de negocio;
- modelo de clases;
- estados necesarios;
- relación con pagos;
- relación con usuarios;
- relación con ferias;
- relación con eventos;
- relación con analítica financiera.

La documentación actual establece sus límites, responsabilidades generales y necesidad de categorías configurables para evitar mezclar estos conceptos con el módulo de Compras y permitir que WALOS adapte el sistema a futuras actividades del negocio.