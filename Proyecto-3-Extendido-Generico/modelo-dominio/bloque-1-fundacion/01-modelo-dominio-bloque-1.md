# 01 — Modelo de Dominio del Bloque 1

## 1. Propósito

Este documento define el **Modelo de Dominio conceptual del Bloque 1 — Fundación**, correspondiente a:

```text
M01 — Organización del Negocio
M02 — Catálogo
```

Su objetivo es traducir la especificación funcional congelada a un conjunto coherente de:

- entidades;
- conceptos de valor;
- enumeraciones;
- relaciones;
- cardinalidades;
- comportamientos;
- invariantes de dominio;
- responsabilidades transversales.

Este documento funciona como puente entre:

```text
Especificación funcional
        ↓
Modelo de dominio
        ↓
Decisiones arquitectónicas
        ↓
Modelo relacional
        ↓
Contrato API
        ↓
Implementación
```

Todavía no define:

- tablas;
- columnas;
- claves foráneas;
- índices;
- endpoints;
- schemas HTTP;
- clases ORM;
- estructura de carpetas;
- detalles de persistencia.

---

# 2. Criterio de Modelado

El modelo debe representar conceptos del negocio y no detalles accidentales de implementación.

Por lo tanto:

```text
Concepto funcional importante
→ puede aparecer en el dominio

Detalle de PostgreSQL / FastAPI / React
→ no pertenece a este documento
```

Se utilizan los siguientes estereotipos conceptuales:

```text
<<entity>>
Entidad con identidad propia

<<value object>>
Concepto definido por su valor

<<enum>>
Conjunto cerrado de valores permitidos
```

No debe crearse una clase solamente porque exista un sustantivo en los requisitos.

---

# 3. Vista General del Dominio

El Bloque 1 posee dos áreas principales:

```text
ORGANIZACIÓN
│
├── Usuario
├── Negocio
├── UsuarioNegocio
└── InvitacionNegocio


CATÁLOGO
│
├── Categoria
└── ArticuloCatalogo
```

Ambas áreas se conectan mediante `Negocio`.

Conceptualmente:

```text
Usuario
   │
   ▼
UsuarioNegocio
   │
   ▼
Negocio
   │
   ├── Categorias
   │
   └── ArticulosCatalogo
```

---

# 4. Entidades del Dominio

## 4.1. Usuario

### Estereotipo

```text
<<entity>>
Usuario
```

### Responsabilidad

Representa la identidad global de una persona dentro de la plataforma.

Un `Usuario` existe independientemente de los Negocios a los que pertenezca y puede poseer:

```text
0..N membresías
```

La pertenencia a un Negocio no modifica la identidad global del Usuario.

### Información Conceptual

```text
Usuario
├── identidad
├── nombre
├── email : Email
├── estado de cuenta
└── fecha de registro
```

La gestión técnica de credenciales no forma parte de esta entidad conceptual.

Por lo tanto, este modelo no incorpora como atributos de dominio:

```text
contraseña
hash de contraseña
JWT
refresh token
OAuth
MFA
```

La autenticación forma parte funcionalmente de M01, pero su implementación técnica pertenece a Arquitectura / IAM.

### Reglas

Un Usuario no posee un Rol global.

El Rol surge exclusivamente de:

```text
UsuarioNegocio
```

Desactivar una membresía:

```text
UsuarioNegocio
ACTIVO → INACTIVO
```

no debe:

- desactivar la cuenta global;
- afectar otras membresías;
- eliminar al Usuario;
- modificar operaciones históricas.

### Ejemplo

```text
María

Negocio WALOS
→ PROPIETARIO

Negocio Centro Mascota
→ TRABAJADOR
```

---

## 4.2. Negocio

### Estereotipo

```text
<<entity>>
Negocio
```

### Responsabilidad

Representa la organización, emprendimiento o comercio cuyos datos y operaciones se administran mediante la plataforma.

Constituye el límite principal de aislamiento funcional y concentra las reglas que requieren conocer el contexto organizacional completo.

### Información Conceptual

```text
Negocio
├── identidad
├── nombre
├── rubro opcional
├── moneda base
├── modalidades operativas
└── estado conceptual
```

### Moneda del MVP

```text
ARS
```

Durante el Bloque 1 no se define cambio de moneda base.

### Modalidades

Un Negocio posee un conjunto de:

```text
1..N ModalidadOperativa
```

Valores del MVP:

```text
REVENTA
PRODUCCION
SERVICIOS
```

Las modalidades:

```text
adaptan UX
priorizan navegación
orientan onboarding
```

pero no funcionan como restricciones rígidas del dominio.

### Estado durante el Bloque 1

El MVP solo necesita operar funcionalmente con:

```text
ACTIVO
```

No se implementará todavía un flujo funcional de:

```text
cerrar negocio
suspender negocio
eliminar negocio
reactivar negocio
```

Por lo tanto, este documento no define todavía un `EstadoNegocio` cerrado ni sus transiciones administrativas.

### Invariante Principal

Todo Negocio activo debe poseer:

```text
>= 1 UsuarioNegocio ACTIVO
con rol PROPIETARIO
```

Las operaciones que puedan alterar esa condición deben validar la invariante dentro de la misma operación que produce el cambio.

Conceptualmente:

```text
desactivarMiembro(...)
cambiarRolMiembro(...)
```

no pueden dejar al Negocio sin Propietarios activos.

### Creación Válida del Negocio

Crear un Negocio no consiste únicamente en crear la entidad `Negocio`.

Una creación válida produce conceptualmente y de forma atómica:

```text
Negocio nuevo
+
UsuarioNegocio del creador
+
EstadoMembresia = ACTIVO
+
Rol = PROPIETARIO
```

Nunca debe resultar de una creación válida:

```text
Negocio activo
+
0 Propietarios activos
```

Este documento no decide todavía si esta coordinación se implementará mediante Factory, Application Service, Domain Service u otro patrón.

### Gestión Conceptual de Membresías

Las mutaciones de membresía que pueden afectar invariantes organizacionales se expresan desde el contexto del Negocio:

```text
desactivarMiembro(miembro)
cambiarRolMiembro(miembro, nuevoRol)
incorporarOReactivarMiembro(usuario, rolInicial)
```

`cambiarRolMiembro(..., PROPIETARIO)` representa conceptualmente la promoción explícita a Propietario.

La incorporación inicial mediante invitación solo admite:

```text
ENCARGADO
TRABAJADOR
```

---

## 4.3. UsuarioNegocio

### Estereotipo

```text
<<entity>>
UsuarioNegocio
```

### Responsabilidad

Representa la participación contextual de un Usuario dentro de un Negocio.

Es el concepto central que resuelve la relación:

```text
Usuario N:M Negocio
```

### Información Conceptual

```text
UsuarioNegocio
├── Usuario
├── Negocio
├── rol : Rol
├── estado : EstadoMembresia
└── fecha de incorporación
```

### Roles

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

### Estados

```text
ACTIVO
INACTIVO
```

No deben inventarse desde este modelo estados adicionales como:

```text
PENDIENTE
SUSPENDIDO
ELIMINADO
BLOQUEADO
```

sin modificar previamente la especificación funcional.

### Invariante de Membresía Histórica Única

Para una misma combinación conceptual:

```text
Usuario + Negocio
```

debe existir una única membresía histórica.

Una reincorporación:

```text
NO crea otra membresía
```

sino:

```text
UsuarioNegocio INACTIVO
        ↓
reactivación
        ↓
UsuarioNegocio ACTIVO
```

El nuevo rol será el establecido por la nueva incorporación.

Si la membresía ya se encuentra:

```text
ACTIVA
```

la operación de incorporación no debe:

```text
crear otra membresía
reactivar
modificar silenciosamente el rol existente
```

La operación debe rechazarse o informar que el Usuario ya pertenece activamente al Negocio.

### Mutaciones y Protección de Invariantes

`UsuarioNegocio` puede responder consultas conceptuales sobre sí misma, por ejemplo:

```text
estaActiva()
esPropietario()
```

pero no debe exponer públicamente mutadores que permitan saltarse reglas que dependen del conjunto de miembros del Negocio.

Por lo tanto, este modelo no asigna a `UsuarioNegocio` operaciones públicas como:

```text
cambiarRol()
desactivar()
reactivar()
```

cuando dichas mutaciones deban proteger la invariante del último Propietario.

### Regla del Último Propietario

No puede realizarse una acción que deje:

```text
Negocio activo
+
0 propietarios activos
```

Por lo tanto no se permite degradar ni desactivar al último `PROPIETARIO` activo.

---

## 4.4. InvitacionNegocio

### Estereotipo

```text
<<entity>>
InvitacionNegocio
```

### Responsabilidad

Representa una propuesta formal para incorporar una persona a un Negocio.

La invitación puede existir aunque el destinatario todavía no posea una cuenta.

### Información Conceptual

```text
InvitacionNegocio
├── Negocio
├── identificador seguro
├── email destino : Email
├── rol propuesto : Rol
├── emisor : UsuarioNegocio
├── estado : EstadoInvitacion
├── fecha de emisión
└── vigencia
```

### Emisión Válida

El `emisor` representa la membresía activa desde la cual se genera la invitación.

Durante el MVP debe cumplirse:

```text
emisor.estado = ACTIVO
emisor.rol = PROPIETARIO
emisor.negocio = invitacion.negocio
rolPropuesto ∈ {ENCARGADO, TRABAJADOR}
estado inicial = PENDIENTE
```

No puede utilizarse una invitación inicial para asignar:

```text
PROPIETARIO
```

La promoción a Propietario es una acción explícita posterior.

### Estados

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

### Aceptación

Una invitación solo puede aceptarse cuando:

```text
estado = PENDIENTE
+
vigente
+
Usuario.email = InvitacionNegocio.emailDestino
```

La operación conceptual de aceptación modifica el ciclo de vida de `InvitacionNegocio`, pero no debe crear o modificar directamente una membresía.

La creación o reactivación de `UsuarioNegocio` se coordina desde el Caso de Uso correspondiente.

Conceptualmente:

```text
InvitacionNegocio
PENDIENTE → ACEPTADA

        +

Negocio.incorporarOReactivarMiembro(...)
```

La operación completa debe ser atómica:

```text
Invitación ACEPTADA
+
membresía creada/reactivada
```

o:

```text
ninguna modificación confirmada
```

Nunca debe persistirse una invitación ACEPTADA si la incorporación/reactivación correspondiente no pudo completarse.

La forma técnica de implementar esa atomicidad se definirá en Arquitectura.

### Canal de Distribución

El canal no forma parte de la identidad de la invitación.

Conceptualmente:

```text
InvitacionNegocio
        ↓
enlace seguro
        ↓
WhatsApp / copiar enlace / otro canal futuro
```

WhatsApp no constituye una entidad del dominio de Organización.

---

## 4.5. Categoria

### Estereotipo

```text
<<entity>>
Categoria
```

### Responsabilidad

Permite organizar los artículos de un Negocio.

### Información Conceptual

```text
Categoria
├── identidad
├── Negocio
├── nombre
└── estado
```

### Estados

```text
ACTIVA
INACTIVA
```

### Invariantes

Cada Categoria pertenece a:

```text
1 Negocio
```

Dentro de un mismo Negocio no pueden existir dos Categorías con nombre funcionalmente equivalente.

Ejemplo:

```text
Snacks
SNACKS
 snacks
```

representan conceptualmente la misma Categoria.

La regla aplica a:

```text
ACTIVAS
+
INACTIVAS
```

Una Categoria INACTIVA existente debe reactivarse en lugar de duplicarse.

### Desactivación

Desactivar una Categoria:

```text
NO desactiva sus artículos
NO modifica sus capacidades
NO altera operaciones existentes
```

### Eliminación

Una Categoria solo puede eliminarse físicamente cuando:

```text
no posee referencias
+
no posee dependencias
```

En particular:

```text
Categoria
+
ArticuloCatalogo ACTIVO asociado
→ NO eliminar
```

y:

```text
Categoria
+
ArticuloCatalogo INACTIVO asociado
→ NO eliminar
```

---

## 4.6. ArticuloCatalogo

### Estereotipo

```text
<<entity>>
ArticuloCatalogo
```

### Responsabilidad

Representa cualquier bien o servicio que el Negocio necesite utilizar comercial u operativamente.

Ejemplos:

```text
Harina
Collar
Snack de pollo
Remera negra M
Maquillaje social
Asesoramiento por hora
```

### Información Conceptual

```text
ArticuloCatalogo
├── identidad
├── Negocio
├── nombre
├── descripción opcional
├── TipoArticulo
├── Categoria opcional
├── UnidadMedida
├── SKU opcional
├── imagen principal opcional
├── precio base
├── costo de referencia opcional
├── CapacidadesArticulo
└── estado
```

### Estados

```text
ACTIVO
INACTIVO
```

### Invariante de Tipo

El Tipo:

```text
BIEN
SERVICIO
```

es inmutable después de la creación.

No se permite:

```text
BIEN → SERVICIO
SERVICIO → BIEN
```

Si nunca fue utilizado:

```text
eliminar
+
crear correctamente
```

Si posee historia:

```text
desactivar
+
crear nuevo artículo
```

La entidad debe poder determinar conceptualmente si una eliminación física es válida:

```text
puedeEliminarseFisicamente()
```

El resultado solo puede ser verdadero cuando el artículo:

```text
no posee historia operativa
+
no posee referencias
+
no posee dependencias que deban conservarse
```

La forma técnica de consultar esas dependencias se definirá posteriormente.

---

# 5. Conceptos de Valor y Enumeraciones

## 5.1. Email

### Estereotipo

```text
<<value object>>
Email
```

Representa una dirección de correo válida utilizada como identidad funcional del Usuario durante el MVP.

Participa especialmente en:

```text
Usuario
InvitacionNegocio
```

La estrategia técnica de normalización se definirá posteriormente.

---

## 5.2. Rol

### Estereotipo

```text
<<enum>>
Rol
```

Valores:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

El Rol pertenece a:

```text
UsuarioNegocio
```

No pertenece directamente a `Usuario`.

Los permisos concretos asociados a cada Rol se definen en cada módulo funcional.

---

## 5.3. EstadoMembresia

### Estereotipo

```text
<<enum>>
EstadoMembresia
```

Valores del MVP:

```text
ACTIVO
INACTIVO
```

Representa el estado de participación de un `UsuarioNegocio`.

No debe confundirse con:

```text
EstadoInvitacion
estado de cuenta del Usuario
estado administrativo futuro del Negocio
```

---

## 5.4. ModalidadOperativa

### Estereotipo

```text
<<enum>>
ModalidadOperativa
```

Valores iniciales:

```text
REVENTA
PRODUCCION
SERVICIOS
```

Un Negocio posee una o más modalidades simultáneamente.

Conceptualmente:

```text
Negocio.modalidades
→ conjunto de 1..N ModalidadOperativa
```

Las modalidades:

```text
adaptan UX
priorizan navegación
orientan onboarding
```

pero no bloquean permanentemente funcionalidades del dominio.

---

## 5.5. EstadoInvitacion

### Estereotipo

```text
<<enum>>
EstadoInvitacion
```

Valores:

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

Una invitación nueva se crea conceptualmente en:

```text
PENDIENTE
```

---

## 5.6. TipoArticulo

### Estereotipo

```text
<<enum>>
TipoArticulo
```

Valores:

```text
BIEN
SERVICIO
```

Es inmutable para un ArticuloCatalogo una vez creado.

---

## 5.7. UnidadMedida

### Estereotipo

```text
<<enum>>
UnidadMedida
```

Durante el MVP representa un catálogo normalizado y global del sistema.

Valores iniciales:

```text
UNIDAD
KG
G
L
ML
M
CM
HORA
```

No pertenece a un Negocio particular.

El Propietario no crea ni modifica unidades durante el MVP.

### Bienes

Un BIEN requiere selección explícita.

### Servicios

Un SERVICIO recibe inicialmente:

```text
UNIDAD
```

pero puede utilizar otra unidad válida, por ejemplo:

```text
HORA
```

---

## 5.8. CapacidadesArticulo

### Estereotipo

```text
<<value object>>
CapacidadesArticulo
```

Agrupa conceptualmente las capacidades operativas de un ArticuloCatalogo.

```text
CapacidadesArticulo
├── es_comprable
├── es_vendible
├── controla_stock
├── puede_usarse_en_produccion
├── controla_vencimiento
└── permite_descuento
```

Esta agrupación pertenece al modelo conceptual.

No obliga a utilizar posteriormente:

```text
una tabla independiente
una clase ORM independiente
un objeto persistido independiente
```

La representación técnica se decidirá durante el Modelo Relacional.

---

## 5.9. Moneda

### Estereotipo

```text
<<enum>>
Moneda
```

Durante el MVP:

```text
ARS
```

Se mantiene como concepto explícito para evitar que los importes pierdan su significado monetario.

El soporte multimoneda queda fuera del MVP.

---

# 6. Reglas de Capacidades de ArticuloCatalogo

## 6.1. Servicio

Si:

```text
tipo = SERVICIO
```

entonces:

```text
controla_stock = False
controla_vencimiento = False
puede_usarse_en_produccion = False
```

---

## 6.2. Vencimiento

Si:

```text
controla_vencimiento = True
```

entonces:

```text
tipo = BIEN
controla_stock = True
```

---

## 6.3. Producción

Si:

```text
puede_usarse_en_produccion = True
```

entonces:

```text
tipo = BIEN
controla_stock = True
```

---

## 6.4. Descuento

Si:

```text
permite_descuento = True
```

entonces:

```text
es_vendible = True
```

Si:

```text
es_vendible
True → False
```

entonces la modificación de capacidades debe preservar atómicamente la consistencia:

```text
es_vendible = False
permite_descuento = False
precio_base = se conserva
```

Conceptualmente, `ArticuloCatalogo.cambiarCapacidades()` debe aplicar esta regla como una única transición válida del dominio.

No debe existir un estado intermedio observable donde:

```text
es_vendible = False
permite_descuento = True
```

---

## 6.5. Uso Operativo

Un artículo ACTIVO debe poseer al menos uno:

```text
es_comprable = True

o

es_vendible = True

o

puede_usarse_en_produccion = True
```

---

# 7. Precio y Costo

## 7.1. Precio Base

Si:

```text
es_vendible = True
```

debe existir:

```text
precio_base >= 0
```

Se permite:

```text
precio_base = 0
```

para:

- muestras;
- cortesías;
- bonificaciones;
- artículos promocionales.

---

## 7.2. Conservación del Precio

Si:

```text
es_vendible
True → False
```

el precio base:

```text
NO se elimina
```

queda temporalmente sin efecto operativo.

La misma transición debe ajustar:

```text
permite_descuento = False
```

sin modificar `precio_base`.

Por lo tanto, la deshabilitación de venta afecta capacidades operativas, pero no borra información comercial útil.

Si posteriormente vuelve a habilitarse la venta, el precio almacenado puede utilizarse nuevamente como referencia y ser revisado por el Propietario.

---

## 7.3. Costo de Referencia

Es opcional.

Cuando existe:

```text
costo_referencia >= 0
```

No representa necesariamente costo histórico, último costo ni costo contable.

---

# 8. SKU

El SKU es opcional.

Cuando existe:

```text
SKU
→ único dentro del Negocio
```

La unicidad considera:

```text
artículos ACTIVOS
+
artículos INACTIVOS
```

Por lo tanto:

```text
Articulo A
SKU = REM-01
INACTIVO

Articulo B
SKU = REM-01
→ inválido
```

El SKU solamente queda disponible nuevamente cuando el artículo original puede eliminarse físicamente y efectivamente se elimina.

---

# 9. UnidadMedida e Historia Operativa

La UnidadMedida puede modificarse mientras el artículo no posea historia operativa dependiente de cantidades.

Conceptualmente:

```text
ArticuloCatalogo
        ↓
¿posee historia cuantitativa?
        │
        ├── No → unidad modificable
        │
        └── Sí → unidad protegida
```

La existencia de historia operativa será una condición derivada de módulos consumidores como:

```text
M03 Compras
M04 Inventario
M05 Ventas
M07 Producción
```

M02 debe consultar conceptualmente esa condición antes de permitir el cambio.

No se define todavía:

```text
un atributo persistente obligatorio
tiene_historia_operativa
```

La implementación concreta se decidirá posteriormente.

---

# 10. Relaciones y Cardinalidades

## Usuario ↔ UsuarioNegocio

```text
Usuario
1
│
│
0..N
UsuarioNegocio
```

Un Usuario puede poseer ninguna, una o múltiples membresías.

La membresía contiene el Rol contextual del Usuario dentro de cada Negocio.

---

## Negocio ↔ UsuarioNegocio

```text
Negocio
1
│
│
1..N
UsuarioNegocio
```

Todo Negocio activo posee al menos una membresía ACTIVA con rol PROPIETARIO.

Para una misma combinación:

```text
Usuario + Negocio
```

existe una única membresía conceptual histórica.

La reincorporación reutiliza esa membresía.

---

## Negocio ↔ InvitacionNegocio

```text
Negocio
1
│
│
0..N
InvitacionNegocio
```

Una invitación pertenece explícitamente a un Negocio.

---

## UsuarioNegocio ↔ InvitacionNegocio

Una invitación es emitida por un Usuario actuando dentro de un Negocio.

Conceptualmente:

```text
UsuarioNegocio
1
│
│ emite
│
0..N
InvitacionNegocio
```

Durante el MVP, la membresía emisora debe cumplir:

```text
EstadoMembresia = ACTIVO
Rol = PROPIETARIO
```

Además:

```text
InvitacionNegocio.negocio
=
InvitacionNegocio.emisor.negocio
```

No es válido:

```text
UsuarioNegocio del Negocio A
        ↓
emite invitación para Negocio B
```

La forma concreta de garantizar esta consistencia pertenece al Modelo Relacional y a la capa de aplicación.

---

## Aceptación de InvitacionNegocio y UsuarioNegocio

Una invitación aceptada puede provocar como consecuencia del Caso de Uso:

```text
crear UsuarioNegocio
o
reactivar UsuarioNegocio histórico
```

Esta consecuencia **no representa una asociación estructural directa** entre `InvitacionNegocio` y `UsuarioNegocio`.

La coordinación pertenece al comportamiento dinámico del Caso de Uso.

Conceptualmente:

```text
InvitacionNegocio.aceptarPara(...)
        ↓
Caso de Uso
        ↓
Negocio.incorporarOReactivarMiembro(...)
```

La operación completa debe conservar consistencia transaccional.

---

## Negocio ↔ Categoria

```text
Negocio
1
│
│
0..N
Categoria
```

---

## Negocio ↔ ArticuloCatalogo

```text
Negocio
1
│
│
0..N
ArticuloCatalogo
```

---

## Categoria ↔ ArticuloCatalogo

```text
Categoria
0..1
│
│
0..N
ArticuloCatalogo
```

Desde la perspectiva del artículo:

```text
Categoria
→ opcional
```

La Categoria, cuando existe, debe pertenecer al mismo Negocio que el ArticuloCatalogo.

---

## ArticuloCatalogo ↔ CapacidadesArticulo

```text
ArticuloCatalogo
1
◆────────1
CapacidadesArticulo
```

Las capacidades forman parte del concepto del artículo y no poseen identidad propia.

---

## ArticuloCatalogo ↔ UnidadMedida

```text
ArticuloCatalogo
N
│
│
1
UnidadMedida
```

`UnidadMedida` pertenece a un catálogo normalizado global del sistema.

---

# 11. Invariantes Principales del Bloque 1

## Organización

### INV-ORG-001

Todo Negocio activo conserva al menos un Propietario activo.

### INV-ORG-002

El Rol pertenece a `UsuarioNegocio`, no al `Usuario` global.

### INV-ORG-003

Un Usuario puede existir sin Negocio y puede participar en 0..N Negocios.

### INV-ORG-004

Desactivar una membresía no desactiva la cuenta global ni afecta otras membresías.

### INV-ORG-005

Para una misma combinación `Usuario + Negocio` existe una única membresía conceptual histórica.

La reincorporación reutiliza esa membresía.

Si la membresía ya está ACTIVA, una nueva incorporación no debe duplicarla ni modificar silenciosamente su rol.

### INV-ORG-006

Una invitación solamente puede ser aceptada por el Usuario cuyo email coincide con `emailDestino`.

### INV-ORG-007

Solo una invitación `PENDIENTE` y vigente puede aceptarse.

### INV-ORG-008

Toda operación de Negocio exige conceptualmente:

```text
Usuario autenticado
+
Negocio autorizado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso específico del módulo
```

### INV-ORG-009

Las modalidades adaptan la experiencia pero no funcionan como restricciones rígidas del dominio.

### INV-ORG-010

Toda `InvitacionNegocio` debe pertenecer al mismo Negocio que la membresía `UsuarioNegocio` que la emite.

Conceptualmente:

```text
InvitacionNegocio.negocio
=
UsuarioNegocioEmisor.negocio
```

### INV-ORG-011

Crear un Negocio debe crear de forma funcionalmente atómica su primera membresía:

```text
UsuarioNegocio
estado = ACTIVO
rol = PROPIETARIO
```

No puede resultar un Negocio activo recién creado sin Propietario.

### INV-ORG-012

La incorporación inicial mediante invitación solo admite:

```text
ENCARGADO
TRABAJADOR
```

`PROPIETARIO` requiere una promoción explícita posterior.

### INV-ORG-013

Aceptar una invitación no crea ni modifica directamente una membresía desde la entidad `InvitacionNegocio`.

El Caso de Uso coordina:

```text
InvitacionNegocio → ACEPTADA
+
UsuarioNegocio creado/reactivado
```

La operación completa debe conservar atomicidad: se confirman ambos cambios o ninguno.

---


## Catálogo

### INV-CAT-001

ArticuloCatalogo y Categoria pertenecen a un único Negocio.

### INV-CAT-002

La Categoria asignada a un artículo debe pertenecer al mismo Negocio.

### INV-CAT-003

TipoArticulo es inmutable.

### INV-CAT-004

SERVICIO nunca controla stock.

### INV-CAT-005

SERVICIO nunca controla vencimiento.

### INV-CAT-006

SERVICIO no participa como insumo productivo.

### INV-CAT-007

Vencimiento implica BIEN + stock.

### INV-CAT-008

Producción implica BIEN + stock.

### INV-CAT-009

Descuento implica artículo vendible.

### INV-CAT-010

Deshabilitar venta deshabilita descuentos dentro de la misma transición de dominio y conserva el precio base.

Conceptualmente:

```text
es_vendible = False
→ permite_descuento = False
→ precio_base se conserva
```

### INV-CAT-011

Artículo vendible requiere precio_base >= 0.

### INV-CAT-012

Costo de referencia informado debe ser >= 0.

### INV-CAT-013

SKU informado es único por Negocio entre activos e inactivos.

### INV-CAT-014

Categorías equivalentes no pueden duplicarse dentro del Negocio.

### INV-CAT-015

Categoria inactiva no desactiva sus artículos.

### INV-CAT-016

Una Categoria referenciada por artículos activos o inactivos no puede eliminarse físicamente.

### INV-CAT-017

Un ArticuloCatalogo solo puede eliminarse físicamente si no posee historia operativa, referencias ni dependencias que deban conservarse.

Si existe cualquiera de ellas:

```text
eliminación física
→ prohibida

desactivación
→ permitida según reglas del módulo
```

### INV-CAT-018

UnidadMedida con historia cuantitativa no puede cambiar su significado.

---

# 12. Responsabilidad Transversal de Trazabilidad

La trazabilidad no se modelará todavía como una entidad universal obligatoria.

Conceptualmente, toda modificación relevante debe poder responder:

```text
¿Quién?
¿Cuándo?
¿Qué hizo?
```

Ejemplos del Bloque 1:

```text
cambio de rol
desactivación de membresía
promoción a propietario
creación de artículo
edición relevante de artículo
activación/desactivación
cambio de precio base
```

Esto se considera una:

```text
responsabilidad transversal
```

La estrategia técnica podrá resolverse posteriormente mediante:

- información de autoría en entidades;
- registro de eventos;
- historial de cambios;
- auditoría técnica;

o una combinación apropiada.

Este documento no obliga todavía a crear:

```text
Entidad Auditoria
```

para todas las operaciones.

---

# 13. Permisos y Modelo de Dominio

El dominio diferencia:

```text
Rol
```

de:

```text
Permiso concreto
```

M01 determina:

```text
UsuarioNegocio.rol
```

Cada módulo determina:

```text
qué operaciones permite ese Rol
```

Ejemplo:

```text
ENCARGADO

M02
├── consultar catálogo          Sí
├── activar artículo            Sí
├── desactivar artículo         Sí
├── editar artículo             No
├── cambiar precio_base         No
└── gestionar categorías        No
```

No se crea por ahora una entidad:

```text
Permiso
```

ni un sistema configurable de RBAC dinámico.

Eso sería complejidad innecesaria para el MVP.

---

# 14. Diagrama UML Conceptual

El siguiente diagrama representa una vista conceptual integrada del Modelo de Dominio del Bloque 1.

Los diagramas detallados específicos de M01 y M02 complementan esta vista y pueden expresar responsabilidades con mayor precisión.

El UML embebido en este documento no debe interpretarse como un modelo ORM ni como una definición automática de agregados.

```plantuml
@startuml

skinparam classAttributeIconSize 0
skinparam linetype ortho

title Modelo de Dominio — Bloque 1 (M01 + M02)

package "M01 — Organización" {

class Usuario <<entity>> {
  identidad
  nombre
  email : Email
  estadoCuenta
  fechaRegistro
}

class Negocio <<entity>> {
  identidad
  nombre
  rubro
  monedaBase : Moneda
  modalidades : Set<ModalidadOperativa>
  estado
  --
  configurarModalidades()
  tienePropietarioActivo() : Boolean
  desactivarMiembro()
  cambiarRolMiembro()
  incorporarOReactivarMiembro()
}

class UsuarioNegocio <<entity>> {
  rol : Rol
  estado : EstadoMembresia
  fechaIncorporacion
  --
  estaActiva() : Boolean
  esPropietario() : Boolean
}

class InvitacionNegocio <<entity>> {
  identificadorSeguro
  emailDestino : Email
  rolPropuesto : Rol
  estado : EstadoInvitacion
  fechaEmision
  vigencia
  --
  estaVigente() : Boolean
  puedeSerAceptadaPor()
  aceptarPara()
  rechazar()
  cancelar()
  expirar()
}

enum Rol <<enum>> {
  PROPIETARIO
  ENCARGADO
  TRABAJADOR
}

enum EstadoMembresia <<enum>> {
  ACTIVO
  INACTIVO
}

enum ModalidadOperativa <<enum>> {
  REVENTA
  PRODUCCION
  SERVICIOS
}

enum EstadoInvitacion <<enum>> {
  PENDIENTE
  ACEPTADA
  RECHAZADA
  CANCELADA
  EXPIRADA
}

enum Moneda <<enum>> {
  ARS
}

class Email <<value object>>

}


package "M02 — Catálogo" {

class Categoria <<entity>> {
  identidad
  nombre
  estado
  --
  activar()
  desactivar()
  reactivar()
}

class ArticuloCatalogo <<entity>> {
  identidad
  nombre
  descripcion
  tipo : TipoArticulo
  sku
  precioBase
  costoReferencia
  estado
  --
  cambiarPrecioBase()
  cambiarUnidad()
  cambiarCapacidades()
  puedeEliminarseFisicamente() : Boolean
  activar()
  desactivar()
  reactivar()
}

class CapacidadesArticulo <<value object>> {
  esComprable
  esVendible
  controlaStock
  puedeUsarseEnProduccion
  controlaVencimiento
  permiteDescuento
  --
  validar(tipo)
}

enum TipoArticulo <<enum>> {
  BIEN
  SERVICIO
}

enum UnidadMedida <<enum>> {
  UNIDAD
  KG
  G
  L
  ML
  M
  CM
  HORA
}

}


Usuario "1" -- "0..*" UsuarioNegocio : membresías
UsuarioNegocio "1..*" -- "1" Negocio : pertenece a

Negocio "1" -- "0..*" InvitacionNegocio : invitaciones
UsuarioNegocio "1" -- "0..*" InvitacionNegocio : emite

Negocio "1" -- "0..*" Categoria
Negocio "1" -- "0..*" ArticuloCatalogo

Categoria "0..1" <-- "0..*" ArticuloCatalogo : clasifica

ArticuloCatalogo --> TipoArticulo
ArticuloCatalogo --> UnidadMedida
ArticuloCatalogo *-- "1" CapacidadesArticulo

note right of UsuarioNegocio
El Rol pertenece a la membresía.
EstadoMembresia = ACTIVO / INACTIVO.
No expone mutadores públicos directos
que puedan saltarse invariantes del Negocio.
end note

note right of Negocio
Crear Negocio requiere su primer
UsuarioNegocio ACTIVO PROPIETARIO.

desactivarMiembro() y cambiarRolMiembro()
deben preservar al menos
un PROPIETARIO activo.
end note

note bottom of InvitacionNegocio
Emisor:
UsuarioNegocio ACTIVO PROPIETARIO
del mismo Negocio.

Rol inicial:
ENCARGADO / TRABAJADOR.

Aceptar modifica la invitación.
El Caso de Uso coordina después
crear/reactivar la membresía
de manera atómica.
end note

note right of ArticuloCatalogo
TipoArticulo es inmutable.
SKU es único dentro del Negocio.

cambiarCapacidades():
si esVendible pasa a false,
permiteDescuento pasa a false
y precioBase se conserva.
end note

note right of CapacidadesArticulo
SERVICIO:
- sin stock
- sin vencimiento
- no insumo de producción

producción => BIEN + stock
vencimiento => BIEN + stock
descuento => vendible
end note

@enduml
```

### Diagramas Detallados Asociados

La vista general se complementa con:

```text
01-diagrama-general.puml
02-m01-organizacion-clases.puml
```

y posteriormente:

```text
03-m02-catalogo-clases.puml
04-m01-estados-invitacion.puml
05-m01-estados-membresia.puml
06-m02-estados-articulo.puml
secuencias/01-aceptar-invitacion.puml
secuencias/02-editar-articulo.puml
```

El diagrama de clases no sustituye a los diagramas dinámicos.

---

# 15. Lectura Simplificada del UML

La parte de Organización se interpreta así:

```text
Usuario
   │
   │ participa
   ▼
UsuarioNegocio
   │
   │ pertenece
   ▼
Negocio
```

`UsuarioNegocio` contiene el Rol.

Por eso:

```text
Usuario
≠
Rol
```

y:

```text
UsuarioNegocio
→ Rol
```

---

La parte de Catálogo:

```text
Negocio
   │
   ├── Categoria
   │
   └── ArticuloCatalogo
             │
             ├── TipoArticulo
             ├── UnidadMedida
             └── CapacidadesArticulo
```

El artículo no necesita convertirse en:

```text
Producto
Insumo
MateriaPrima
Servicio
ProductoTerminado
```

El comportamiento surge de:

```text
Tipo
+
Capacidades
```

---

# 16. Elementos que NO Deben Crearse en el Bloque 1

No forman parte del Modelo de Dominio actual:

```text
Producto
MateriaPrima
Insumo
ProductoTerminado

StockUbicacion
Lote
MovimientoInventario

Proveedor
Compra

Cliente
Venta
Pago

SesionCaja
MovimientoCaja

Receta
Produccion
```

Aparecerán cuando se diseñen los módulos correspondientes.

Tampoco se crean todavía:

```text
Permiso
Auditoria universal
ListaPrecio
VarianteProducto
AtributoDinamico
```

salvo que una necesidad posterior demuestre que son necesarios.

---

# 17. Límites de Responsabilidad

## M01

Es responsable de:

```text
identidad
negocios
membresías
roles
invitaciones
modalidades
contexto autorizado
```

No administra el Catálogo.

---

## M02

Es responsable de:

```text
categorías
artículos
tipos
unidades
capacidades
precio base
costo de referencia
estado del artículo
```

No administra:

```text
stock real
compras
ventas
producción
```

---

# 18. Dependencias entre M01 y M02

M02 depende conceptualmente de M01 porque todo catálogo pertenece a:

```text
Negocio
```

y toda acción sobre el catálogo requiere:

```text
Usuario
+
UsuarioNegocio
+
Rol
+
permiso definido por M02
```

Por lo tanto:

```text
M01
   ↓
provee identidad y contexto

M02
   ↓
aplica reglas específicas del catálogo
```

M01 no debe conocer internamente las reglas del Catálogo.

---

# 19. Decisiones Técnicas que Permanecen Abiertas

Este modelo no decide todavía:

```text
UUID vs otro identificador

límites formales de Aggregate Roots

Factory Methods

Domain Events

Domain Services

Service Layer concreto

Repository

Unit of Work

estrategia de transacciones

estrategia de concurrencia

tablas y nombres de columnas

claves foráneas

índices

restricciones SQL

implementación técnica de unicidad

normalización exacta de email

normalización exacta de SKU

normalización exacta de nombres de Categoria

precisión monetaria

precisión de cantidades

hash de contraseña

JWT / sesiones

RequestContext

forma de transportar Negocio activo

auditoría técnica

almacenamiento de imágenes
```

### Restricción de Interpretación

La presencia de métodos conceptuales en el UML no obliga a:

```text
una clase ORM equivalente
un Repository por entidad
un agregado por clase
una tabla por concepto
```

Estas decisiones se resolverán en Arquitectura, ADRs y Modelo Relacional.

### Atomicidad Funcional vs. Implementación Técnica

Cuando este modelo indica que una operación debe ser atómica, expresa una condición funcional:

```text
o se confirma el cambio completo
o no se confirma ninguna parte
```

No prescribe todavía si la implementación utilizará:

```text
transacción SQL
Unit of Work
Application Service
Domain Service
otro mecanismo
```

---

# 20. Criterios de Aceptación del Modelo de Dominio

El Modelo de Dominio del Bloque 1 se considera válido cuando:

1. `Usuario` representa una cuenta global independiente de los Negocios.
2. `Usuario` puede participar en 0..N Negocios mediante `UsuarioNegocio`.
3. El Rol pertenece a `UsuarioNegocio` y no al Usuario global.
4. `EstadoMembresia` está limitado en el MVP a `ACTIVO` e `INACTIVO`.
5. Para cada combinación Usuario + Negocio existe una única membresía conceptual histórica.
6. La reincorporación reutiliza la membresía histórica y una membresía ya ACTIVA no se duplica ni cambia silenciosamente de rol.
7. Un Negocio puede poseer múltiples Propietarios y nunca puede quedar activo sin al menos uno.
8. Crear un Negocio incluye de forma funcionalmente atómica su primera membresía ACTIVA con rol PROPIETARIO.
9. La incorporación inicial mediante invitación solo admite `ENCARGADO` o `TRABAJADOR`; `PROPIETARIO` requiere promoción explícita.
10. `InvitacionNegocio` puede existir sin que exista previamente el Usuario destinatario.
11. Una invitación nueva nace `PENDIENTE`, es emitida por un `UsuarioNegocio` ACTIVO PROPIETARIO del mismo Negocio y se vincula funcionalmente por email.
12. Solo una invitación PENDIENTE, vigente y cuyo emailDestino coincide con el Usuario puede aceptarse.
13. `InvitacionNegocio` no crea directamente una membresía; el Caso de Uso coordina de forma atómica la aceptación con la creación/reactivación de `UsuarioNegocio`.
14. WhatsApp no forma parte de la identidad del Usuario ni de la Invitación.
15. `Negocio.modalidades` representa conceptualmente un conjunto de una o más `ModalidadOperativa`.
16. Las modalidades adaptan experiencia y navegación pero no bloquean permanentemente funcionalidades.
17. Cada Categoria pertenece a un Negocio.
18. Cada ArticuloCatalogo pertenece a un Negocio.
19. La Categoria de un artículo es opcional y, cuando existe, pertenece al mismo Negocio.
20. `TipoArticulo` distingue BIEN de SERVICIO y es inmutable.
21. `CapacidadesArticulo` representa los usos operativos sin crear jerarquías rígidas.
22. Un SERVICIO no puede controlar stock, vencimiento ni utilizarse como insumo de producción.
23. Producción y vencimiento exigen BIEN con stock.
24. Descuento exige que el artículo sea vendible.
25. Deshabilitar venta ajusta `permite_descuento = False` dentro de la misma transición y conserva `precio_base`.
26. Un artículo vendible requiere `precio_base >= 0` y el valor cero es válido.
27. `costo_referencia`, cuando existe, debe ser >= 0.
28. SKU es único dentro de cada Negocio considerando artículos activos e inactivos.
29. UnidadMedida es un concepto normalizado global y los Servicios reciben `UNIDAD` como valor inicial.
30. Las unidades con historia cuantitativa quedan protegidas contra cambios que alteren su significado histórico.
31. Las Categorías inactivas no desactivan sus artículos.
32. Una Categoria referenciada por artículos activos o inactivos no puede eliminarse físicamente.
33. `ArticuloCatalogo` solo puede eliminarse físicamente cuando no posee historia operativa, referencias ni dependencias que deban conservarse.
34. Los permisos concretos permanecen bajo responsabilidad de cada módulo y la trazabilidad se reconoce como responsabilidad transversal sin sobrediseñar una entidad universal.
35. El modelo no introduce como decisiones cerradas elementos pertenecientes a infraestructura o a módulos posteriores.

---

# 21. Estado del Documento

Con la actualización de M01 y las reglas ya congeladas de M02, el Modelo de Dominio conceptual del Bloque 1 queda alineado con las especificaciones funcionales vigentes.

Estado actual:

```text
BLOQUE 1 — FUNDACIÓN

Especificación Funcional
├── M01 Organización                         ✅ CONGELADO
└── M02 Catálogo                             ✅ CONGELADO

Modelo de Dominio
├── 01-modelo-dominio-bloque-1.md            ✅ ACTUALIZADO
├── 01-diagrama-general.puml                 ✅ CONGELADO
├── 02-m01-organizacion-clases.md            ✅ CONGELADO
├── 02-m01-organizacion-clases.puml          ✅ CONGELADO
└── 03-m02-catalogo-clases                   ⏳ SIGUIENTE
```

El Modelo de Dominio conceptual puede utilizarse como fuente para las siguientes etapas, pero las vistas detalladas restantes deben completarse antes de cerrar toda la suite gráfica del Bloque 1.

Después de completar las vistas de dominio correspondientes, el flujo continúa con:

```text
DECISIONES ARQUITECTÓNICAS
NECESARIAS PARA BLOQUE 1
```

y posteriormente:

```text
MODELO RELACIONAL
CONTRATO API
UX
IMPLEMENTACIÓN
```

Cualquier modificación futura que altere:

- entidades;
- cardinalidades;
- estados;
- invariantes;
- responsabilidades;
- reglas de incorporación;
- restricciones de roles;

deberá actualizar primero la documentación funcional correspondiente y luego regenerar los artefactos de dominio afectados.
