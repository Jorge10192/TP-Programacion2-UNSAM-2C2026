# 01 — Stakeholders y Actores

## 1. Propósito del Documento

Este documento identifica y clasifica las personas, organizaciones y sistemas externos que interactúan con la plataforma o que se ven afectados por su funcionamiento.

Su objetivo es establecer con claridad:

- quién utiliza directamente el sistema;
- quién participa de las operaciones del negocio sin acceder directamente a la aplicación;
- qué responsabilidades posee cada tipo de usuario;
- qué diferencias existen entre sus niveles de acceso;
- qué sistemas externos pueden interactuar con la plataforma;
- qué stakeholders participan en la validación y evolución del producto.

Esta definición servirá posteriormente como base para:

- requisitos funcionales;
- reglas de negocio;
- permisos y autorización por roles;
- casos de uso;
- diagramas de interacción;
- trazabilidad;
- seguridad;
- pruebas.

---

## 2. Clasificación General

Los participantes relacionados con la plataforma se dividen en cuatro grupos principales:

```text
ACTORES Y STAKEHOLDERS
│
├── Usuarios Directos del Sistema
│   ├── PROPIETARIO
│   ├── ENCARGADO
│   └── TRABAJADOR
│
├── Stakeholders del Dominio
│   ├── Cliente
│   └── Proveedor
│
├── Sistemas Externos
│   └── Mercado Pago [integración opcional]
│
└── Stakeholders de Validación y Evolución
    ├── WALOS
    └── Futuros feriantes y pequeños comercios
```

Los tres roles humanos directos utilizan la aplicación y deben poder ser identificados individualmente.

**Cliente** y **Proveedor** forman parte del dominio comercial, pero no son usuarios del sistema durante el MVP.

Conceptualmente:

```text
Usuario del Sistema ≠ Cliente ≠ Proveedor
```

Un Cliente o Proveedor representa información comercial administrada por el negocio y no posee, durante el MVP:

- credenciales;
- contraseña;
- rol;
- sesión;
- acceso directo a la aplicación.

---

## 3. Usuarios Directos del Sistema

Los usuarios directos son personas que pertenecen a uno o más negocios y realizan operaciones utilizando la plataforma.

Los roles iniciales son:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

El rol determina el nivel general de responsabilidad y las operaciones autorizadas **dentro de un negocio determinado**.

### 3.1. Relación Usuario–Negocio

La relación conceptual entre `Usuario` y `Negocio` es de muchos a muchos.

Se representa mediante la entidad intermedia:

```text
UsuarioNegocio
```

Conceptualmente:

```text
Usuario
   │
   │ 1
   │
   ▼
UsuarioNegocio
   ▲
   │
   │ 1
   │
Negocio
```

Un usuario puede participar en distintos negocios y poseer un rol diferente en cada uno.

Ejemplo:

```text
Usuario A
├── PROPIETARIO → Negocio A
└── TRABAJADOR  → Negocio B
```

Por lo tanto, el rol **no pertenece globalmente al Usuario**, sino a su relación con cada Negocio.

Conceptualmente:

```text
UsuarioNegocio
├── Usuario
├── Negocio
├── Rol
└── Estado de participación
```

Los detalles relacionales y técnicos de esta entidad se definirán posteriormente en el modelo de dominio y el modelo de datos.

---

### 3.2. Propietario / Administrador (`PROPIETARIO`)

#### Tipo

Actor humano principal.

#### Descripción

Es el usuario con máxima responsabilidad sobre el negocio dentro de la plataforma.

Puede existir más de un propietario en un mismo negocio.

Posee acceso tanto a las operaciones cotidianas como a la configuración estructural.

#### Objetivos

El propietario busca:

- controlar el funcionamiento general del negocio;
- administrar usuarios;
- organizar la configuración;
- supervisar operaciones;
- controlar inventario;
- controlar caja;
- revisar compras y ventas;
- analizar resultados;
- corregir errores;
- mantener trazabilidad.

#### Capacidades Principales

Puede realizar todas las operaciones habilitadas para los demás roles y además:

- configurar información general del negocio;
- administrar categorías;
- administrar unidades de medida;
- administrar medios de pago;
- administrar ubicaciones;
- administrar catálogo;
- modificar precios base;
- administrar usuarios;
- activar y desactivar usuarios;
- modificar roles;
- asignar otros propietarios;
- configurar permisos;
- realizar correcciones;
- realizar anulaciones;
- consultar analítica completa.

#### Administración de Usuarios

El propietario puede:

- incorporar usuarios;
- activar usuarios;
- desactivar usuarios;
- asignar roles;
- cambiar roles;
- promover usuarios a `PROPIETARIO`.

La plataforma debe soportar más de un propietario dentro de un mismo negocio.

La desactivación de un usuario no deberá eliminar las operaciones históricas realizadas por él.

#### Nivel de Acceso

**Máximo.**

#### Participación en el MVP

**Obligatoria.**

---

### 3.3. Encargado (`ENCARGADO`)

#### Tipo

Actor humano directo.

#### Descripción

Es un usuario con responsabilidad operativa avanzada.

Puede administrar gran parte de la actividad cotidiana del negocio, pero no posee control completo sobre su estructura ni sobre la administración de propietarios.

#### Objetivos

El encargado busca:

- organizar la jornada;
- supervisar operaciones;
- controlar inventario;
- controlar caja;
- registrar compras;
- registrar producción;
- gestionar ventas;
- corregir errores operativos;
- consultar información necesaria para administrar la actividad.

#### Capacidades Principales

Puede realizar operaciones como:

- registrar ventas;
- registrar pagos;
- aplicar descuentos;
- registrar compras;
- registrar producción;
- registrar servicios;
- consultar inventario;
- mover stock;
- realizar ajustes autorizados;
- abrir caja;
- cerrar caja;
- realizar arqueos;
- registrar gastos;
- modificar el precio aplicado durante una venta cuando las reglas del módulo de Ventas lo permitan;
- corregir operaciones;
- realizar determinadas anulaciones;
- consultar analítica operativa.

#### Restricciones

No deberá poder realizar determinadas acciones estructurales reservadas al propietario.

Ejemplos:

- crear propietarios;
- eliminar o desactivar propietarios;
- modificar el rol de un propietario;
- administrar globalmente los roles de otros usuarios;
- crear, editar o eliminar artículos del catálogo;
- modificar el precio base o el costo de referencia del catálogo;
- administrar categorías del catálogo;
- modificar configuraciones críticas reservadas al propietario.

La definición exacta de estos permisos será documentada en:

```text
docs/modulos/01-organizacion-negocio.md
```

#### Nivel de Acceso

**Operativo avanzado.**

#### Participación en el MVP

Debe estar contemplado en el sistema.

No es necesario utilizar activamente este rol durante toda la demostración inicial.

---

### 3.4. Trabajador (`TRABAJADOR`)

#### Tipo

Actor humano directo.

#### Descripción

Es el usuario encargado de realizar las operaciones cotidianas del negocio.

Puede trabajar desde:

- una feria;
- un puesto;
- un local;
- un depósito;
- un espacio de producción.

La interfaz destinada a este actor debe priorizar velocidad y simplicidad.

#### Objetivos

El trabajador busca:

- registrar rápidamente sus operaciones;
- atender clientes sin demoras;
- consultar disponibilidad de mercadería;
- registrar compras y movimientos cotidianos;
- registrar producción cuando corresponda;
- evitar cálculos manuales;
- mantener registro de su actividad.

#### Capacidades Principales

El trabajador puede:

- registrar ventas;
- registrar cobros;
- aplicar descuentos permitidos;
- registrar compras;
- registrar producción;
- registrar servicios;
- consultar inventario;
- mover mercadería;
- registrar gastos;
- abrir o cerrar caja cuando esté autorizado;
- consultar información necesaria para realizar su trabajo.

Determinadas operaciones sensibles podrán requerir autorización adicional.

#### Restricciones

El trabajador no administra la estructura general del negocio.

No podrá, salvo autorización explícita:

- administrar usuarios;
- modificar roles;
- asignar propietarios;
- modificar configuraciones estructurales;
- modificar precios base globales;
- realizar anulaciones sensibles;
- consultar información financiera restringida.

#### Trazabilidad

Toda operación relevante deberá quedar asociada al usuario que la realizó.

Ejemplo:

```text
Usuario: María
Acción: Venta confirmada
Operación: Venta #152
Ubicación: Feria San Martín
Fecha/Hora: 14:32
```

#### Nivel de Acceso

**Operativo.**

#### Participación en el MVP

**Obligatoria conceptualmente.**

La demostración inicial podrá utilizar pocos usuarios activos, siempre que el sistema permita distinguir correctamente quién realiza cada operación.

---

## 4. Matriz General de Responsabilidades y Permisos

La siguiente tabla representa la política general inicial.

Los tres roles conceptuales principales permanecen estables, pero los permisos concretos se especifican en el módulo funcional al que pertenece cada operación.

Cuando una especificación de módulo define una política más restrictiva o más precisa que esta matriz general, prevalece la regla específica del módulo para esa funcionalidad.

| Acción / Operación | Propietario | Encargado | Trabajador |
| :--- | :---: | :---: | :---: |
| Consultar catálogo | Sí | Sí | Sí |
| Crear, editar o eliminar artículos del catálogo | Sí | No | No |
| Activar, desactivar o reactivar artículos del catálogo | Sí | Sí | No |
| Administrar categorías del catálogo | Sí | No | No |
| Consultar stock disponible | Sí | Sí | Sí |
| Registrar Venta Rápida | Sí | Sí | Sí |
| Registrar cobros | Sí | Sí | Sí |
| Aplicar descuentos permitidos | Sí | Sí | Sí |
| Registrar compras | Sí | Sí | Sí |
| Registrar producción | Sí | Sí | Sí |
| Registrar servicios | Sí | Sí | Sí |
| Registrar gastos de jornada | Sí | Sí | Sí |
| Mover stock entre ubicaciones | Sí | Sí | Sí |
| Abrir y cerrar caja | Sí | Sí | Según permiso |
| Modificar precio aplicado durante una venta | Sí | Sí | Según permiso |
| Modificar precio base del catálogo | Sí | No | No |
| Realizar ajustes de inventario | Sí | Sí | Según permiso |
| Editar o corregir operaciones | Sí | Sí | Según permiso |
| Anular operaciones confirmadas | Sí | Limitado | Restringido |
| Consultar analítica operativa | Sí | Sí | Según permiso |
| Consultar analítica financiera completa | Sí | Según permiso | No |
| Modificar configuración estructural | Sí | No | No |
| Crear, activar o desactivar usuarios | Sí | No | No |
| Modificar roles | Sí | No | No |
| Asignar otro propietario | Sí | No | No |

Esta matriz representa una definición general.

M01 define la pertenencia al Negocio, los roles y sus responsabilidades generales. Los permisos exactos sobre las funcionalidades de cada módulo se especifican en la documentación funcional correspondiente.

Por ejemplo:

```text
M01 — Organización
→ membresías
→ roles
→ invitaciones

M02 — Catálogo
→ creación y edición de artículos
→ activación/desactivación
→ categorías
→ precio base

M05 — Ventas
→ precio aplicado durante una venta
→ descuentos
```

Una regla específica de módulo puede restringir las capacidades generales de un rol sin modificar el significado conceptual del rol.

---

## 5. Stakeholders del Dominio

### 5.1. Cliente Comprador

#### Tipo

Stakeholder del dominio.

No es usuario directo de la plataforma durante el MVP.

#### Descripción

Es la persona que adquiere productos o servicios ofrecidos por el negocio.

Puede participar en:

- ventas;
- pagos;
- pedidos futuros;
- reservas futuras.

#### Participación en el MVP

En una venta presencial, el comerciante utiliza la aplicación para registrar la operación.

El Cliente no necesita:

- registrarse;
- iniciar sesión;
- poseer credenciales;
- operar la aplicación.

#### Identificación

En una Venta Rápida, identificar al cliente será opcional.

Ejemplo:

```text
3 × Producto A
Pago: Efectivo
Cliente: No identificado
```

Esto permite mantener una operación rápida de mostrador o feria.

#### Reservas y Pedidos Futuros

Cuando exista una reserva o pedido podrá ser necesario registrar información como:

- nombre;
- teléfono;
- red social;
- dirección de entrega.

Estas funcionalidades no forman parte del núcleo obligatorio del MVP.

#### Evolución Futura

El Cliente podrá eventualmente interactuar directamente mediante:

- catálogo público;
- ecommerce;
- enlaces de reserva;
- enlaces enviados por Instagram;
- enlaces enviados por WhatsApp;
- seguimiento de pedidos.

Ejemplo conceptual:

```text
Instagram
→ enlace
→ formulario de reserva
→ negocio recibe solicitud
```

---

### 5.2. Proveedor

#### Tipo

Stakeholder del dominio.

No es usuario directo del sistema.

#### Descripción

Es la persona o empresa que abastece al negocio.

Puede proveer:

- productos terminados;
- materias primas;
- componentes;
- materiales;
- insumos.

#### Participación en el MVP

El Proveedor no utiliza directamente la aplicación.

Los usuarios del negocio registran y administran su información.

#### Información Asociada

Podrán registrarse datos como:

- nombre;
- contacto;
- teléfono;
- observaciones;
- información identificatoria cuando corresponda;
- historial de compras;
- precios;
- comprobantes.

#### Objetivo dentro del Sistema

La existencia del Proveedor permitirá conocer posteriormente:

- cuánto se compra;
- a quién se compra;
- evolución de precios;
- costos históricos;
- frecuencia de abastecimiento.

#### Acceso al Sistema

El Proveedor no posee:

- usuario;
- contraseña;
- rol;
- sesión;
- acceso directo.

El eventual acceso de proveedores queda fuera del alcance inicial.

---

## 6. Sistemas Externos y Medios de Pago

Debe distinguirse claramente entre:

```text
Sistema externo integrado
```

y:

```text
Medio de pago configurable
```

Un medio de pago puede existir dentro del negocio sin que la plataforma se comunique tecnológicamente con la organización que presta ese servicio.

---

### 6.1. Mercado Pago

Mercado Pago puede participar bajo dos modalidades.

#### Modalidad A — Medio de Pago Configurable

**Prioridad: MUST HAVE**

El usuario podrá seleccionar manualmente Mercado Pago como medio utilizado para una venta.

Ejemplo:

```text
Venta #125
Total: $12.000
Medio de pago: Mercado Pago
```

En este escenario no existe comunicación automática entre ambos sistemas.

Mercado Pago funciona simplemente como una opción configurada dentro del negocio.

#### Modalidad B — Sistema Externo Integrado

**Prioridad: SHOULD HAVE**

Si el alcance técnico y los tiempos del MVP lo permiten, podrá incorporarse un flujo automático mediante QR.

Flujo conceptual:

```text
Usuario prepara la venta
→ sistema calcula el importe
→ se inicia el cobro
→ cliente escanea el QR
→ Mercado Pago procesa el pago
→ plataforma recibe la confirmación
→ pago queda registrado automáticamente
```

En este escenario Mercado Pago sí actúa como un **actor tecnológico externo**.

La ausencia de esta integración no deberá impedir completar el flujo comercial principal del MVP.

---

### 6.2. Cuenta DNI

Cuenta DNI representa un medio de pago actualmente relevante para WALOS.

Durante el MVP será tratado como un **medio de pago configurable con confirmación manual**.

Ejemplo:

```text
Medios de pago:

- Efectivo
- Mercado Pago
- Cuenta DNI
```

No se requiere integración tecnológica automática con Cuenta DNI.

Su existencia no deberá generar código específico para WALOS.

---

### 6.3. Otros Medios de Pago

El negocio podrá configurar otros medios.

Ejemplos:

- efectivo;
- transferencia bancaria;
- MODO;
- otras billeteras;
- otros medios digitales.

Durante el MVP su utilización podrá registrarse manualmente.

No deberán implementarse integraciones externas sin una necesidad concreta.

---

## 7. WALOS como Stakeholder de Validación

### Tipo

Cliente real utilizado para validación del producto.

### Descripción

WALOS es el primer negocio real cuyas necesidades se utilizan para diseñar y validar la plataforma.

Su objetivo dentro del proyecto es proporcionar un escenario concreto sobre el cual comprobar que el modelo general funciona correctamente.

### Función dentro del Proyecto

WALOS permitirá validar:

- catálogo;
- compras;
- proveedores;
- producción;
- recetas;
- inventario;
- vencimientos;
- ubicaciones;
- ferias;
- ventas;
- descuentos;
- medios de pago;
- caja;
- gastos;
- analítica.

### Configuración durante el MVP

Para la demostración inicial, la configuración necesaria para representar WALOS será realizada dentro del proyecto.

Podrán precargarse:

- categorías;
- artículos;
- insumos;
- productos;
- ubicaciones;
- medios de pago;
- recetas;
- usuarios;
- datos históricos simulados.

En una evolución posterior, la mayor parte de esta personalización deberá poder realizarla el propio negocio desde la aplicación.

### Regla de Diseño

WALOS deberá utilizar las mismas capacidades generales disponibles para cualquier otro negocio.

No deberán existir elementos específicos como:

```text
VentaWalos
ProductoWalos
FeriaWalos
```

ni lógica como:

```text
if negocio == WALOS:
    ...
```

Si una necesidad inicialmente detectada en WALOS resulta útil para otros negocios, deberá modelarse como una capacidad general configurable.

---

## 8. Futuros Feriantes y Pequeños Comercios

### Tipo

Stakeholders objetivo del producto.

### Descripción

Representan los futuros negocios a los cuales la plataforma busca extenderse después de validar el modelo inicial.

Pueden pertenecer a rubros muy diferentes.

Ejemplos:

- gastronomía;
- indumentaria;
- accesorios;
- artesanías;
- cosmética;
- decoración;
- productos para mascotas;
- servicios.

### Necesidades Compartidas

A pesar de las diferencias entre rubros, existen necesidades generales comunes:

- registrar actividad;
- conocer ventas;
- controlar inventario;
- organizar ubicaciones;
- manejar caja;
- registrar gastos;
- conocer costos;
- consultar resultados;
- mantener historial.

Estas necesidades compartidas justifican la construcción de una plataforma genérica y configurable.

---

## 9. Diagrama de Contexto

```text
                            ┌───────────────────────┐
                            │        WALOS          │
                            │ Cliente de validación │
                            └───────────┬───────────┘
                                        │
                                        │ valida
                                        ▼

┌──────────────────────────────────────────────────────────────┐
│                        PLATAFORMA                            │
│                                                              │
│  Usuarios directos                                           │
│                                                              │
│  [PROPIETARIO] ─┐                                            │
│  [ENCARGADO] ───┼──► Operaciones del Negocio                │
│  [TRABAJADOR] ──┘                                            │
│                        │                                     │
│                        ├── Compras                            │
│                        ├── Inventario                         │
│                        ├── Producción                         │
│                        ├── Ventas                             │
│                        ├── Pagos                              │
│                        └── Caja                               │
│                                                              │
└───────────────────────────┬──────────────────────────────────┘
                            │
              ┌─────────────┼─────────────────┐
              │             │                 │
              ▼             ▼                 ▼
        [Proveedor]      [Cliente]      [Mercado Pago]
       Datos comerciales Datos venta     API / QR opcional
         Sin acceso       Sin acceso
```

---

## 10. Reglas Generales Relacionadas con Actores

### `ACT-001` — Identidad y Trazabilidad

Toda operación relevante deberá asociarse automáticamente al usuario responsable y al momento en que fue ejecutada.

Como mínimo:

- compra;
- venta;
- movimiento de inventario;
- producción;
- apertura de caja;
- cierre de caja;
- modificación relevante;
- anulación.

---

### `ACT-002` — Aislamiento por Negocio

Un usuario solamente podrá consultar u operar sobre negocios a los cuales posea acceso activo y autorizado.

Los datos pertenecientes a otros negocios deberán permanecer aislados.

---

### `ACT-003` — Control de Acceso por Rol

Las operaciones disponibles dependerán del rol y de los permisos que el usuario posea dentro del negocio.

M01 establece los roles generales. Cada módulo funcional define los permisos concretos aplicables a sus propias operaciones.

Cuando una especificación funcional de módulo establece una restricción más precisa, dicha regla debe respetarse para ese módulo.

Roles iniciales:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

---

### `ACT-004` — Conservación Histórica y Soft Delete

La desactivación de un usuario deberá realizarse mediante **borrado lógico (*soft delete*)**, conceptualmente:

```text
activo = False
```

La desactivación no deberá:

- eliminar físicamente al usuario;
- eliminar operaciones históricas;
- eliminar su autoría;
- romper referencias históricas.

Si un usuario deja de pertenecer únicamente a un negocio pero conserva acceso a otros, deberá poder desactivarse su participación en ese negocio sin necesariamente desactivar su cuenta global.

---

### `ACT-005` — Cliente y Proveedor sin Acceso

`Cliente` y `Proveedor` son entidades comerciales del dominio.

Durante el MVP no representan cuentas de usuario autenticadas.

---

### `ACT-006` — Integración Externa Delimitada

Un proveedor de pagos solo será considerado actor tecnológico externo cuando exista comunicación automática entre ambos sistemas.

Registrar manualmente un medio de pago no constituye una integración tecnológica.

---

### `ACT-007` — Rol Dependiente del Negocio

La relación entre `Usuario` y `Negocio` es conceptualmente **N:M** y se representa mediante `UsuarioNegocio`.

Por lo tanto:

```text
Usuario 1 ─── N UsuarioNegocio N ─── 1 Negocio
```

El rol pertenece a esta relación y no directamente al Usuario.

Esto permite representar:

```text
Usuario A
├── PROPIETARIO → Negocio A
└── TRABAJADOR  → Negocio B
```

El modelo de datos deberá preservar esta capacidad aunque la primera versión del MVP utilice principalmente un único negocio por usuario.

---

## 11. Resumen de Clasificación

### Usuarios Directos

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

Utilizan directamente la aplicación y poseen permisos dentro de uno o más negocios.

### Stakeholders Comerciales sin Acceso Directo

```text
CLIENTE
PROVEEDOR
```

Participan de las operaciones comerciales pero no utilizan directamente el sistema durante el MVP.

### Sistema Externo Potencialmente Integrado

```text
MERCADO PAGO
```

Solo actúa como sistema externo cuando existe integración tecnológica.

### Medios de Pago Configurables sin Integración

```text
EFECTIVO
CUENTA DNI
TRANSFERENCIA
MODO
OTROS
```

Son configuraciones del negocio y no actores tecnológicos.

### Cliente de Validación

```text
WALOS
```

Permite comprobar la aplicabilidad del modelo general en un negocio real.

### Público Objetivo Futuro

```text
FERIANTES
EMPRENDEDORES
PEQUEÑOS COMERCIOS
PRODUCTORES ARTESANALES
PRESTADORES DE SERVICIOS
```

---

## 12. Criterio Rector

La plataforma deberá mantener una separación clara entre:

1. **quienes utilizan la aplicación**;
2. **quienes participan de las operaciones comerciales**;
3. **los sistemas externos que automatizan determinadas funciones**;
4. **los stakeholders utilizados para validar y evolucionar el producto**.

Durante el MVP, la aplicación estará orientada principalmente al:

> **feriante y a los integrantes de su negocio.**

Clientes y proveedores forman parte de la información administrada, pero no necesitan utilizar directamente la plataforma.

Los sistemas externos deberán incorporarse únicamente cuando aporten valor concreto y su integración no comprometa el funcionamiento principal del MVP.

Esta separación permite mantener una solución simple y acotada sin impedir futuras extensiones como:

- ecommerce;
- reservas online;
- interacción directa con clientes;
- pagos automáticos;
- integración con otros servicios externos.
