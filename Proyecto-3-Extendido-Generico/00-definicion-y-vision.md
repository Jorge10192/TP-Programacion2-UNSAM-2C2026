# 00 — Definición y Visión del Producto

## 1. Propósito del Documento

Este documento establece la visión general del producto, su propósito, público objetivo, propuesta de valor, principios fundamentales y alcance conceptual.

Funciona como la **fuente de verdad principal** para el resto de la documentación del sistema.

A partir de esta definición deberán derivarse posteriormente:

- módulos funcionales;
- requisitos funcionales;
- requisitos no funcionales;
- reglas de negocio;
- casos de uso;
- modelo de dominio;
- modelo relacional;
- arquitectura;
- contrato de API;
- experiencia de usuario;
- estrategia de pruebas;
- plan de implementación.

Este documento responde principalmente:

- qué producto se quiere construir;
- para quién;
- qué problemas busca resolver;
- qué tipo de negocios debe representar;
- cuáles son sus principios fundamentales;
- qué forma parte del MVP;
- qué funcionalidades quedan fuera del alcance inicial.

Los detalles técnicos específicos deberán documentarse en los archivos correspondientes y no forman parte del objetivo principal de este documento.

---

# 2. Definición del Producto y Propuesta de Valor

## 2.1. Definición

La plataforma es un sistema web genérico y configurable de gestión básica orientado principalmente a:

- feriantes;
- emprendimientos;
- pequeños comercios;
- productores artesanales;
- revendedores;
- pequeños prestadores de servicios.

Su objetivo es permitir que un pequeño negocio pueda organizar, registrar y consultar las principales actividades de su operación cotidiana mediante una herramienta sencilla, pensada principalmente para utilizarse desde un teléfono celular.

La plataforma debe poder adaptarse a distintos rubros mediante configuración, evitando desarrollar una aplicación diferente para cada negocio.

Las operaciones principales que busca representar son:

- compras;
- ventas;
- pagos;
- inventario;
- movimiento de mercadería;
- caja;
- gastos;
- descuentos;
- producción;
- análisis básico del negocio.

La plataforma no pretende reemplazar:

- sistemas contables completos;
- ERP empresariales;
- sistemas fiscales especializados;
- plataformas diseñadas para grandes cadenas comerciales.

Su objetivo es resolver de forma clara y práctica la gestión cotidiana de un pequeño negocio.

---

## 2.2. Problema que Busca Resolver

Muchos pequeños comerciantes administran actualmente sus actividades utilizando herramientas informales o fragmentadas.

Ejemplos:

- cuadernos;
- anotaciones en papel;
- planillas;
- mensajes de WhatsApp;
- aplicaciones de cobro;
- memoria personal;
- distintas aplicaciones no conectadas entre sí.

Esta forma de trabajo puede provocar:

- desconocimiento de cuánto se vendió realmente;
- falta de control sobre el efectivo y otros medios de pago;
- desconocimiento del stock disponible;
- dificultad para saber dónde se encuentra la mercadería;
- pérdida de productos por vencimiento;
- dificultad para conocer costos y gastos;
- falta de trazabilidad sobre quién realizó cada operación;
- dificultad para comparar el rendimiento de distintas ferias o ubicaciones;
- poca información para tomar decisiones.

---

## 2.3. Propuesta de Valor

> Centralizar las operaciones fundamentales de un pequeño negocio en una herramienta simple, móvil, visual, trazable y configurable, transformando las actividades cotidianas en información útil para la toma de decisiones.

La aplicación debe ayudar al comerciante a responder fácilmente preguntas como:

- ¿Cuánto vendí hoy?
- ¿Cuánto dinero debería haber en caja?
- ¿Cuánto gasté durante la jornada?
- ¿Qué productos tengo disponibles?
- ¿Dónde se encuentra mi mercadería?
- ¿Qué productos están próximos a vencer?
- ¿Qué producto se vende más?
- ¿Qué ubicación funciona mejor?
- ¿Quién realizó determinada operación?
- ¿Qué necesito comprar para fabricar cierta cantidad de un producto?

La información debe presentarse de forma comprensible para usuarios sin conocimientos contables o técnicos avanzados.

---

# 3. Público Objetivo y Tipos de Negocio

La plataforma está orientada a pequeños negocios cuyas operaciones puedan representarse mediante acciones comerciales relativamente simples.

Un negocio puede utilizar una o varias de las siguientes modalidades.

## 3.1. Reventa

Negocios que compran productos terminados y posteriormente los venden.

Flujo general:

```text
Compra
→ Inventario
→ Venta
→ Pago
```

Ejemplos:

- indumentaria;
- accesorios;
- cosmética;
- alimentos;
- decoración;
- productos para mascotas.

---

## 3.2. Producción Propia

Negocios que compran materias primas, componentes o insumos y posteriormente fabrican productos terminados.

Flujo general:

```text
Compra de insumos
→ Inventario
→ Producción
→ Producto terminado
→ Venta
```

Ejemplos:

- alimentos artesanales;
- ropa;
- velas;
- cuadros;
- decoración;
- productos para mascotas;
- artesanías.

---

## 3.3. Servicios

Negocios que comercializan actividades que no requieren necesariamente inventario físico.

Ejemplos:

- reparación;
- restauración;
- personalización;
- diseño;
- trabajos realizados a pedido.

Los servicios deberán poder formar parte de las operaciones comerciales sin obligar al sistema a manejar existencias físicas.

---

## 3.4. Negocios Mixtos

Un mismo negocio puede combinar:

- reventa;
- producción;
- servicios.

La plataforma debe permitir representar estas combinaciones sin necesitar desarrollos específicos para cada rubro.

---

## 3.5. Negocios Fuera del Alcance Principal

La plataforma no está diseñada inicialmente para:

- grandes supermercados;
- grandes cadenas comerciales;
- industrias de gran escala;
- restaurantes con gestión compleja de mesas;
- sistemas logísticos empresariales;
- contabilidad completa;
- facturación fiscal avanzada;
- ERP corporativos.

El sistema debe mantenerse enfocado en la administración general de pequeños negocios.

---

# 4. Perfil del Usuario y Principios de Experiencia

## 4.1. Perfil del Usuario

El usuario objetivo puede tener conocimientos tecnológicos bajos o medios.

La aplicación debe considerar que el usuario:

- utiliza principalmente un teléfono celular;
- puede estar atendiendo clientes mientras utiliza el sistema;
- necesita registrar operaciones rápidamente;
- puede trabajar en una feria o puesto;
- no quiere completar formularios extensos;
- puede no conocer términos administrativos;
- necesita información visual y fácil de interpretar.

---

## 4.2. Principios de UX

La experiencia de usuario deberá priorizar:

- pocos pasos;
- formularios breves;
- lenguaje cotidiano;
- botones grandes;
- acciones claramente visibles;
- navegación sencilla;
- confirmaciones comprensibles;
- mínima carga cognitiva;
- diseño mobile-first.

Como referencias conceptuales de experiencia se consideran aplicaciones como:

- Mercado Pago;
- PedidosYa;
- Treinta.

Estas referencias se utilizan por su claridad y facilidad de uso, no con el objetivo de copiar sus interfaces.

---

# 5. Principios Fundamentales del Sistema

## 5.1. Complejidad Interna, Simplicidad Externa

La complejidad técnica debe resolverse internamente.

El usuario deberá interactuar principalmente mediante acciones naturales como:

- Comprar.
- Vender.
- Mover stock.
- Producir.
- Abrir caja.
- Registrar gasto.
- Cerrar caja.
- Aplicar descuento.
- Consultar inventario.

No debería necesitar comprender conceptos técnicos como:

- transacciones;
- auditoría;
- movimientos internos;
- lotes;
- claves foráneas;
- reglas de consistencia;
- eventos del sistema.

---

## 5.2. Plataforma Genérica Configurable por Datos

La plataforma debe construirse como un núcleo general adaptable a distintos negocios.

La personalización deberá realizarse principalmente mediante configuración.

Cada negocio podrá definir:

- nombre;
- identidad;
- rubro;
- categorías;
- artículos;
- ubicaciones;
- medios de pago;
- usuarios;
- precios;
- descuentos;
- recetas;
- preferencias operativas.

Las particularidades de un negocio no deberán convertirse en lógica exclusiva dentro del núcleo del sistema cuando puedan expresarse mediante configuración.

---

## 5.3. WALOS como Caso de Validación

WALOS será el primer cliente real utilizado para validar el modelo.

Sin embargo, WALOS no deberá representar el modelo interno del sistema.

Su funcionamiento deberá configurarse utilizando las mismas capacidades disponibles para cualquier otro negocio.

Ejemplo:

```text
Negocio
└── WALOS

Ubicaciones
├── Casa / Depósito
├── Feria A
└── Feria B

Catálogo
├── artículos comprables
├── artículos vendibles
└── artículos utilizados en producción

Operaciones
├── compras
├── producción
├── ventas
└── pagos
```

No deberán existir conceptos de dominio específicos como:

```text
VentaWalos
ProductoMascota
FeriaWalos
```

ni reglas condicionadas al nombre del cliente.

---

## 5.4. Trazabilidad

Toda operación relevante deberá permitir identificar:

- qué ocurrió;
- quién la realizó;
- cuándo ocurrió;
- qué operación fue afectada.

El objetivo es evitar responsabilidades ambiguas entre distintos usuarios.

Las operaciones confirmadas deberán conservar historial suficiente para permitir su revisión.

---

## 5.5. Integridad Histórica

Las operaciones importantes confirmadas no deberán eliminarse silenciosamente.

Cuando corresponda, los errores deberán resolverse mediante:

- correcciones controladas;
- anulaciones;
- movimientos compensatorios.

La información histórica deberá mantenerse disponible.

---

## 5.6. Aislamiento por Negocio

Cada negocio constituye una unidad independiente dentro de la plataforma.

Los datos pertenecientes a un negocio no deberán ser accesibles por usuarios pertenecientes exclusivamente a otro.

El diseño deberá permitir evolucionar posteriormente hacia usuarios capaces de participar en más de un negocio.

---

# 6. Modelo Conceptual de Alto Nivel

La plataforma se organiza conceptualmente alrededor de un negocio.

```text
NEGOCIO
│
├── USUARIOS Y ROLES
│
├── CONFIGURACIÓN
│   ├── Categorías
│   ├── Unidades de medida
│   └── Medios de pago
│
├── CATÁLOGO
│   └── Artículos configurables
│
├── PROVEEDORES
│
├── UBICACIONES
│   ├── Casa
│   ├── Depósito
│   ├── Local
│   └── Feria / Puesto
│
├── INVENTARIO
│   ├── Stock por ubicación
│   ├── Vencimientos
│   └── Historial de movimientos
│
├── COMPRAS
│
├── VENTAS
│
├── PAGOS
│
├── CAJA Y JORNADA
│
├── PRODUCCIÓN
│
└── ANALÍTICA
```

---

## 6.1. Catálogo Basado en Capacidades

El sistema utilizará conceptualmente un catálogo general de artículos.

En lugar de obligar a clasificar cada elemento rígidamente como Producto, Insumo o Servicio, cada artículo podrá definir las capacidades que posee.

Ejemplos de capacidades:

- puede comprarse;
- puede venderse;
- controla stock;
- puede utilizarse en producción.

Ejemplo:

```text
Tela

Comprable: Sí
Vendible: Sí
Controla stock: Sí
Puede utilizarse en producción: Sí
```

Ejemplo:

```text
Servicio de reparación

Comprable: No
Vendible: Sí
Controla stock: No
Puede utilizarse en producción: No
```

Este enfoque permite representar distintos modelos de negocio sin duplicar innecesariamente conceptos.

---

## 6.2. Unidades y Cantidades

La plataforma deberá soportar tanto cantidades enteras como fraccionarias.

Ejemplos:

- 1 unidad;
- 0,5 kg;
- 250 g;
- 1,5 metros;
- 2,75 litros.

Cada artículo deberá utilizar una unidad de medida apropiada.

---

## 6.3. Inventario por Ubicación

El inventario deberá administrarse por ubicación.

Ejemplo:

```text
Producto A

Depósito: 30
Feria A: 15
Local: 10
```

El sistema deberá permitir mover mercadería entre ubicaciones manteniendo trazabilidad.

Una feria se considerará principalmente una ubicación operativa del negocio.

---

## 6.4. Vencimientos

Los artículos perecederos podrán controlar vencimientos.

El sistema deberá ayudar a priorizar la utilización o venta de mercadería próxima a vencer.

La complejidad técnica utilizada para administrar vencimientos deberá permanecer oculta durante las operaciones rápidas.

---

## 6.5. Venta Rápida

La venta debe ser una de las acciones más simples del sistema.

Flujo conceptual:

```text
Seleccionar artículo
→ cantidad
→ precio
→ descuento opcional
→ medio de pago
→ confirmar
```

El cliente no será obligatorio para una venta cotidiana.

---

## 6.6. Precios y Descuentos

Cada artículo podrá tener un precio base.

Durante una venta, un usuario autorizado podrá:

- utilizar ese precio;
- aplicar un descuento;
- utilizar un precio diferente cuando la situación comercial lo requiera.

La operación deberá conservar el precio realmente aplicado.

---

## 6.7. Pagos

Venta y Pago serán conceptos relacionados pero diferentes.

La venta representa:

> Qué se vendió.

El pago representa:

> Cómo fue abonado.

El sistema deberá admitir inicialmente medios configurables como:

- efectivo;
- transferencia;
- medios digitales.

---

## 6.8. Caja y Jornada

La caja representará una jornada operativa asociada a una ubicación.

Flujo general:

```text
Abrir caja
→ realizar operaciones
→ registrar gastos
→ cerrar caja
→ realizar arqueo
```

Al finalizar la jornada deberán compararse:

- monto esperado;
- monto real;
- diferencia.

La diferencia deberá conservarse como información de la jornada.

---

## 6.9. Producción

Los negocios que producen podrán definir recetas o composiciones.

Una receta funcionará como referencia para calcular los materiales necesarios.

Ejemplo:

```text
1 Producto A
=
2 unidades de Insumo X
+
0,5 kg de Insumo Y
```

Si se desean producir varias unidades, el sistema podrá calcular automáticamente los requerimientos.

La producción real podrá utilizar cantidades diferentes sin modificar automáticamente la receta base.

---

# 7. Alcance del MVP

## 7.1. Obligatorio — MUST HAVE

El MVP deberá permitir:

### Organización

- registrar usuario;
- crear negocio;
- asignar roles básicos;
- configurar información principal.

### Configuración

- crear categorías;
- definir unidades de medida;
- configurar medios de pago.

### Catálogo

- crear artículos;
- definir capacidades;
- registrar precios;
- indicar control de stock;
- indicar control de vencimiento.

### Compras

- registrar proveedores;
- registrar compras;
- registrar cantidades y costos;
- ingresar mercadería al inventario.

### Inventario

- consultar stock total;
- consultar stock por ubicación;
- mover stock entre ubicaciones;
- consultar historial básico;
- controlar vencimientos básicos.

### Caja

- abrir una jornada;
- indicar saldo inicial;
- registrar gastos;
- cerrar caja;
- realizar arqueo.

### Ventas

- realizar Venta Rápida;
- seleccionar cantidades;
- utilizar precio base;
- modificar precio autorizado;
- aplicar descuentos;
- registrar medio de pago.

### Trazabilidad

- identificar usuario responsable;
- registrar operaciones relevantes;
- conservar historial de anulaciones.

### Analítica

Mostrar de forma sencilla:

- ventas;
- compras;
- gastos;
- estado de caja;
- stock bajo;
- próximos vencimientos;
- comparación básica por ubicación.

---

## 7.2. Deseable — SHOULD HAVE

Si el flujo principal se encuentra estable:

- producción;
- recetas;
- cálculo automático de necesidades;
- consumo real de materiales;
- múltiples usuarios operando simultáneamente;
- gráficos adicionales.

---

## 7.3. Fuera del MVP Inicial — WON'T HAVE NOW

No formarán parte obligatoria de la primera versión:

- ecommerce;
- página pública;
- publicación automática en redes sociales;
- integración con marketing;
- funcionamiento completamente offline;
- sincronización offline;
- integración automática con QR;
- integración real con pasarelas de pago;
- pagos divididos;
- facturación electrónica;
- contabilidad completa;
- promociones comerciales complejas;
- aplicaciones móviles nativas;
- pedidos avanzados;
- reservas avanzadas;
- analítica avanzada.

Estas funcionalidades podrán formar parte de evoluciones posteriores.

---

# 8. Escenarios de Validación

El MVP deberá validarse mediante dos escenarios.

## 8.1. Negocio Nuevo

Debe poder demostrarse la utilización de la plataforma partiendo desde cero.

Flujo esperado:

```text
Crear usuario
→ Crear negocio
→ Configurar catálogo
→ Crear ubicación
→ Registrar compra
→ Ingresar stock
→ Mover mercadería
→ Abrir caja
→ Realizar venta
→ Registrar pago
→ Registrar gasto
→ Cerrar caja
→ Consultar resumen
```

Este escenario demuestra que el sistema no depende de WALOS.

---

## 8.2. WALOS

WALOS se utilizará como negocio precargado para validar un escenario más completo.

Podrá incluir datos simulados históricos de:

- compras;
- proveedores;
- artículos;
- ubicaciones;
- movimientos;
- vencimientos;
- producción;
- ventas;
- pagos;
- descuentos;
- gastos;
- analítica.

El objetivo es demostrar que un negocio real puede representarse utilizando el mismo modelo general.

---

# 9. Criterios de Éxito

El MVP se considerará exitoso si permite representar correctamente un día completo de trabajo de un pequeño negocio.

El flujo principal deberá poder realizarse de punta a punta:

```text
Crear Negocio
→ Configurar Catálogo
→ Registrar Compra
→ Generar Inventario
→ Mover Mercadería a una Ubicación
→ Abrir Caja
→ Vender
→ Cobrar
→ Registrar Gastos
→ Cerrar Caja
→ Consultar Resultado
```

El recorrido deberá mantener:

- consistencia de información;
- stock correcto;
- caja coherente;
- trazabilidad por usuario;
- aislamiento entre negocios;
- facilidad de uso desde un teléfono celular.

---

# 10. Principio Rector del Proyecto

El objetivo no es construir el sistema comercial más completo posible.

El objetivo es construir:

> una plataforma simple, configurable, trazable y extensible que permita a feriantes y pequeños comercios digitalizar las operaciones fundamentales de su negocio.

La plataforma debe ser suficientemente genérica para representar distintos rubros, pero suficientemente acotada para mantenerse:

- comprensible;
- usable;
- mantenible;
- realizable.

La prioridad será siempre:

> resolver correctamente los problemas cotidianos del pequeño negocio utilizando la menor complejidad posible.
