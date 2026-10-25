# 01 — Modelo de Dominio del Bloque 1

## 1. Propósito

Este documento define el **Modelo de Dominio conceptual del Bloque 1 — Fundación**, correspondiente a:

```text
M01 — Organización del Negocio
M02 — Catálogo
```

Su objetivo es traducir las especificaciones funcionales congeladas a un modelo coherente y estable de:

- entidades;
- Value Objects;
- enumeraciones;
- relaciones;
- cardinalidades;
- comportamientos relevantes;
- estados;
- invariantes;
- guardias contextuales;
- límites entre módulos;
- responsabilidades transversales.

Este documento funciona como puente entre:

```text
Especificación funcional
        ↓
Modelo de dominio
        ↓
Diagramas detallados
        ↓
Decisiones arquitectónicas / ADRs
        ↓
Modelo relacional
        ↓
Contrato API
        ↓
UX
        ↓
Implementación
        ↓
Tests
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
- estrategia de transacciones;
- estrategia de locking/concurrencia;
- Repository;
- Unit of Work;
- almacenamiento físico de archivos.

## 1.1. Jerarquía Documental

Para interpretar o implementar el Bloque 1 debe respetarse:

```text
Especificación funcional del módulo
        ↓
Modelo de Dominio del Bloque 1
        ↓
Guía semántica del diagrama detallado
        ↓
Diagrama UML detallado
        ↓
Arquitectura / ADRs
        ↓
Implementación
```

Para M01:

```text
modulos/M01-...
        ↓
01-modelo-dominio-bloque-1.md
        ↓
02-m01-organizacion-clases.md
        ↓
02-m01-organizacion-clases.puml
```

Para M02:

```text
modulos/M02-Catalogo.md
        ↓
01-modelo-dominio-bloque-1.md
        ↓
03-m02-catalogo-clases.md
        ↓
03-m02-catalogo-clases.puml
```

Si dos fuentes se contradicen, la contradicción debe resolverse antes de implementar.

Una IA no debe seleccionar silenciosamente la interpretación que resulte más conveniente para generar código.

## 1.2. Uso Esperado por IA y Desarrollo

Una IA puede utilizar este documento para:

- comprender responsabilidades;
- identificar invariantes;
- proponer arquitectura;
- derivar modelo relacional;
- diseñar contratos de API;
- derivar tests;
- revisar código;
- detectar violaciones del dominio.

Pero no debe:

- traducir cada clase conceptual a una tabla;
- crear un Repository por cada entidad automáticamente;
- convertir cada método conceptual en un endpoint;
- asumir que un método mostrado es la lista exhaustiva de operaciones permitidas;
- asumir que un `enum` debe persistirse como enum nativo de base de datos;
- asumir límites de Aggregate Roots que todavía no fueron definidos;
- inventar datos de M03/M04/M05/M07 dentro de M02.

La implementación debe preservar las invariantes aunque la representación técnica final sea diferente del UML conceptual.

---

# 2. Criterio de Modelado

El modelo representa conceptos y reglas del negocio, no detalles accidentales de implementación.

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
Entidad con identidad estable

<<value object>>
Concepto definido por su valor y sin identidad independiente

<<enum>>
Conjunto cerrado de valores admitidos por el dominio
```

No debe crearse una clase solamente porque exista un sustantivo en los requisitos.

## 2.1. Identidad de Dominio

El atributo conceptual:

```text
identidad
```

representa una identidad estable del concepto.

No define todavía:

```text
UUID
integer autoincremental
ULID
otro mecanismo
```

Las claves funcionales como:

```text
email
SKU
nombre de Categoria
```

no deben confundirse automáticamente con la identidad técnica persistente.

En particular:

```text
ArticuloCatalogo.identidad
≠ SKU

Categoria.identidad
≠ nombre
```

por lo que modificar SKU o nombre no cambia la identidad histórica de la entidad.

## 2.2. Métodos Conceptuales

Los métodos mostrados en el modelo:

- expresan comportamiento relevante;
- ayudan a ubicar responsabilidades;
- no representan una API pública automática;
- no son necesariamente exhaustivos;
- no determinan todavía la capa concreta donde se implementarán.

La ausencia de:

```text
cambiarNombre()
```

en una vista simplificada no implica que el nombre sea inmutable si la especificación funcional permite editarlo.

Cuando un comportamiento necesita información externa a la entidad, el UML puede mostrar la intención conceptual sin resolver todavía cómo se obtiene dicha información.

## 2.3. Validaciones Locales y Contextuales

Debe distinguirse:

### Validación local

Puede resolverse utilizando el estado del propio concepto.

Ejemplos:

```text
SERVICIO no controla stock
permite_descuento implica es_vendible
precio informado no puede ser negativo
```

### Validación contextual

Necesita conocer otras entidades, módulos o información concurrente.

Ejemplos:

```text
SKU único dentro del Negocio
nombre de Categoria único dentro del Negocio
último PROPIETARIO activo
membresía histórica única
Categoria y ArticuloCatalogo del mismo Negocio
historia cuantitativa
dependencias de stock / lotes / recetas
eliminación física segura
```

Una validación contextual previa utilizada por UX no constituye por sí sola una garantía de dominio.

La validación relevante y la mutación deben confirmarse de manera consistente dentro de la operación que realiza el cambio.

La estrategia técnica se definirá posteriormente.

## 2.4. Estado de Dominio vs. Borrado Técnico

Estados como:

```text
ACTIVO
INACTIVO
```

son estados funcionales.

No deben interpretarse automáticamente como:

```text
soft_deleted = true/false
```

ni confundirse con eliminación física.

La eliminación física es una operación excepcional y separada.

## 2.5. Estado Actual vs. Historia

M01 y M02 mantienen principalmente el **estado actual** de sus conceptos.

Cuando un módulo transaccional necesite conservar cómo era cierta información en el momento de una operación, dicho módulo deberá preservar los valores históricos necesarios.

Ejemplo:

```text
precioBase actual de ArticuloCatalogo
≠ precio aplicado en una Venta histórica
```

Este principio evita reconstruir el pasado consultando únicamente el estado actual.

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

Categoria no determina:

```text
precio
promoción
stock
producción
```

Su responsabilidad es clasificatoria.

### Información Conceptual

```text
Categoria
├── identidad
├── Negocio
├── nombre
└── estado : EstadoCategoria
```

### Estados

```text
ACTIVA
INACTIVA
```

### Invariantes

Cada Categoria pertenece a exactamente:

```text
1 Negocio
```

Dentro de un mismo Negocio no pueden existir dos Categorías con nombre funcionalmente equivalente después de aplicar la normalización definida por el sistema.

Ejemplos conceptualmente equivalentes:

```text
Snacks
SNACKS
 snacks
```

La regla considera:

```text
ACTIVAS
+
INACTIVAS
```

Si existe una Categoria equivalente INACTIVA:

```text
NO crear duplicado
→ informar existencia
→ ofrecer reactivar
```

La normalización técnica exacta permanece abierta.

### Asociación con Artículos

Una Categoria INACTIVA:

- continúa existiendo;
- conserva artículos asociados;
- no desactiva esos artículos;
- no modifica sus capacidades;
- no recalcula precios;
- no modifica historia.

Pero:

```text
Categoria INACTIVA
→ no admite nuevas asociaciones
→ no admite reasignaciones nuevas hacia ella
```

Una asociación histórica existente sigue siendo válida.

### Reactivación

```text
INACTIVA → ACTIVA
```

reutiliza la misma entidad.

La reactivación:

- conserva identidad;
- conserva asociaciones;
- no recrea artículos;
- no recalcula información comercial.

### Eliminación

`puedeEliminarseFisicamente()` representa una consulta conceptual para UX/diagnóstico.

No constituye la autorización definitiva de borrado.

Una Categoria solo puede eliminarse físicamente cuando:

```text
0 ArticuloCatalogo asociados
+
0 otras dependencias que deban conservarse
```

Esto incluye artículos:

```text
ACTIVOS
INACTIVOS
```

La operación real de eliminación debe revalidar las condiciones relevantes al confirmar el cambio.

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

No administra las operaciones que posteriormente utilicen el artículo.

En particular:

```text
esComprable
≠ Compra

esVendible
≠ Venta

controlaStock
≠ stock actual

controlaVencimiento
≠ fecha concreta de vencimiento

puedeUsarseEnProduccion
≠ receta
```

### Información Conceptual

```text
ArticuloCatalogo
├── identidad
├── Negocio
├── nombre
├── descripción opcional
├── tipo : TipoArticulo
├── Categoria opcional
├── unidadMedida : UnidadMedida
├── SKU opcional
├── imagen principal opcional
├── precio base opcional
├── costo de referencia opcional
├── capacidades : CapacidadesArticulo
└── estado : EstadoArticulo
```

### Estados

```text
ACTIVO
INACTIVO
```

Un artículo ACTIVO debe poseer al menos un uso operativo:

```text
esComprable
o
esVendible
o
puedeUsarseEnProduccion
```

Un artículo INACTIVO puede no poseer ninguno de esos usos.

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

### Categoria

Si el artículo posee Categoria:

```text
ArticuloCatalogo.negocio
=
Categoria.negocio
```

Una Categoria históricamente asociada que posteriormente quede INACTIVA no bloquea la operación normal ni la reactivación del artículo.

Solo se prohíben nuevas asociaciones hacia Categorías INACTIVAS.

### Reactivación

`reactivar()` no representa únicamente:

```text
estado = ACTIVO
```

Debe revalidar las invariantes vigentes necesarias para volver a operar.

Conceptualmente puede requerir verificar:

- coherencia Tipo + Capacidades;
- uso operativo mínimo;
- precio válido cuando sea vendible;
- dependencias estructurales compatibles.

La reactivación no reescribe historia.

### Desactivación

`desactivar()`:

- conserva identidad;
- conserva SKU actual;
- conserva historia;
- conserva referencias;
- no altera existencias administradas por M04;
- retira el artículo del uso normal en nuevas operaciones.

### Eliminación Física

`puedeEliminarseFisicamente()` es una consulta conceptual.

La respuesta puede necesitar información proveniente de módulos consumidores.

Solo puede resultar verdadero cuando no existen:

```text
historia relevante
referencias
dependencias que deban conservarse
```

La eliminación real debe volver a validar las condiciones relevantes dentro de la operación que confirma el borrado.

No debe implementarse como:

```text
if articulo.puedeEliminarseFisicamente():
    eliminar_sin_revalidar()
```

---

# 5. Conceptos de Valor y Enumeraciones

## 5.1. Email

### Estereotipo

```text
<<value object>>
Email
```

Representa una dirección de correo válida utilizada funcionalmente por Usuario e InvitacionNegocio.

Participa especialmente en:

```text
Usuario
InvitacionNegocio
```

La estrategia técnica de normalización y comparación se definirá posteriormente.

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

No pertenece directamente a Usuario.

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

Representa el estado de participación de un UsuarioNegocio.

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

El detalle de sus transiciones pertenece al diagrama de estados específico de M01.

---

## 5.6. EstadoCategoria

### Estereotipo

```text
<<enum>>
EstadoCategoria
```

Valores:

```text
ACTIVA
INACTIVA
```

No debe confundirse inactividad con eliminación física.

---

## 5.7. EstadoArticulo

### Estereotipo

```text
<<enum>>
EstadoArticulo
```

Valores:

```text
ACTIVO
INACTIVO
```

No se introducen en el MVP:

```text
BORRADOR
ARCHIVADO
ELIMINADO
SUSPENDIDO
```

sin modificar previamente la especificación funcional.

---

## 5.8. TipoArticulo

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

## 5.9. UnidadMedida

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

## 5.10. CapacidadesArticulo

### Estereotipo

```text
<<value object>>
CapacidadesArticulo
```

Agrupa conceptualmente la configuración de usos permitidos de ArticuloCatalogo.

```text
CapacidadesArticulo
├── es_comprable
├── es_vendible
├── controla_stock
├── puede_usarse_en_produccion
├── controla_vencimiento
└── permite_descuento
```

No posee identidad independiente.

Se interpreta como configuración completa y debe reemplazarse como un conjunto válido, no mediante setters aislados que generen estados intermedios inválidos.

Esta agrupación conceptual no obliga a utilizar posteriormente:

```text
una tabla independiente
una clase ORM independiente
un objeto persistido independiente
```

La representación técnica se decidirá durante el Modelo Relacional.

---

## 5.11. Moneda

### Estereotipo

```text
<<enum>>
Moneda
```

Durante el MVP:

```text
ARS
```

Los importes de M02 utilizan la moneda base del Negocio.

ArticuloCatalogo no posee moneda propia.

El soporte multimoneda queda fuera del MVP.

---

# 6. Reglas de Capacidades de ArticuloCatalogo

Las capacidades expresan **elegibilidad/configuración**.

No representan los hechos operativos producidos por otros módulos.

```text
es_comprable
≠ Compra

es_vendible
≠ Venta

controla_stock
≠ cantidad de stock

controla_vencimiento
≠ fecha concreta de vencimiento

puede_usarse_en_produccion
≠ Receta / Producción
```

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

El vencimiento concreto pertenece posteriormente a existencias/lotes de M04.

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

Las recetas, consumos y producciones pertenecen a M07.

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

la misma transición debe producir:

```text
es_vendible = False
permite_descuento = False
precio_base = se conserva
```

No debe existir un estado observable:

```text
es_vendible = False
permite_descuento = True
```

---

## 6.5. Habilitar Venta

Si:

```text
es_vendible
False → True
```

la transición solo puede confirmarse cuando:

```text
precio_base existe
+
precio_base >= 0
```

Esta validación pertenece a la configuración completa del ArticuloCatalogo y no únicamente a CapacidadesArticulo.

---

## 6.6. Uso Operativo

Un artículo ACTIVO debe poseer al menos uno:

```text
es_comprable = True

o

es_vendible = True

o

puede_usarse_en_produccion = True
```

Un artículo INACTIVO puede poseer los tres en False.

---

## 6.7. Capacidades Comerciales

Se consideran comerciales o de habilitación futura:

```text
es_comprable
es_vendible
permite_descuento
```

Pueden cambiar aunque exista historia operativa.

El cambio afecta operaciones futuras y no reescribe el pasado.

---

## 6.8. Capacidades Estructurales

Se consideran estructurales:

```text
controla_stock
controla_vencimiento
puede_usarse_en_produccion
```

Su modificación puede requerir información de módulos consumidores.

La regla NO es:

```text
si alguna vez hubo historia
→ bloquear para siempre
```

La regla es:

```text
si la transición resulta incompatible
con dependencias existentes
o altera significado histórico que debe preservarse
→ bloquear
```

M04 y M07 completarán las condiciones específicas relacionadas con stock, lotes, recetas y producción.

---

## 6.9. Consistencia Estructural vs. Tolerancia Operativa

M02 nunca admite configuraciones estructurales inválidas.

Sin embargo, módulos operativos posteriores podrán definir políticas excepcionales como:

```text
stock negativo temporal
ajuste posterior
advertencia operativa
```

si corresponde.

Por lo tanto:

```text
inconsistencia operativa temporal
≠
configuración estructural inválida
```

---

# 7. Precio y Costo

## 7.1. Precio Base

`precio_base` representa la referencia comercial actual.

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

para casos como:

- muestras;
- cortesías;
- bonificaciones;
- artículos promocionales.

Un precio negativo es inválido.

Los importes utilizan:

```text
Negocio.monedaBase
```

Durante el MVP:

```text
ARS
```

ArticuloCatalogo no posee moneda independiente.

## 7.2. Historia del Precio

Modificar:

```text
precio_base
```

no modifica operaciones históricas.

Los módulos transaccionales que utilicen el artículo deben conservar el valor realmente aplicado cuando sea necesario para interpretar posteriormente la operación.

M02 no debe reconstruir una Venta histórica utilizando el precio actual del catálogo.

## 7.3. Conservación al Deshabilitar Venta

Si:

```text
es_vendible
True → False
```

el precio base:

```text
NO se elimina
```

y queda temporalmente sin efecto operativo.

La misma transición ajusta:

```text
permite_descuento = False
```

Si posteriormente vuelve a habilitarse la venta, el valor almacenado puede utilizarse como referencia siempre que siga cumpliendo la validación vigente.

## 7.4. Costo de Referencia

Es opcional.

Cuando existe:

```text
costo_referencia >= 0
```

No representa necesariamente:

- último costo;
- costo promedio;
- costo contable;
- costo histórico definitivo.

Modificarlo no reescribe costos históricos preservados por otros módulos.

## 7.5. Representación Numérica Futura

Este documento no define todavía precisión o escala concretas.

Sin embargo, la implementación deberá:

- utilizar representación decimal exacta para dinero;
- evitar Float binario para importes monetarios;
- mantener soporte para cantidades fraccionarias.

La precisión concreta se decidirá en Diseño Técnico / Modelo Relacional.

---

# 8. SKU

El SKU es opcional.

No constituye la identidad técnica de ArticuloCatalogo.

Cuando existe:

```text
SKU
→ único dentro del Negocio
```

La unicidad considera los SKU **actualmente asignados** a artículos:

```text
ACTIVOS
+
INACTIVOS
```

Ejemplo:

```text
Articulo A
SKU = REM-01
INACTIVO

Articulo B
SKU = REM-01
→ inválido
```

## 8.1. Política de Modificación

### A → B

```text
SKU actual = A
nuevo SKU = B
```

Debe:

1. validar contextual y consistentemente que `B` esté disponible;
2. confirmar la modificación;
3. liberar `A` después de confirmar el cambio.

### A → null

Quitar el SKU:

```text
A → sin SKU
```

libera `A` después de confirmar la operación.

### null → B

Debe validarse que `B` esté disponible antes de confirmar.

### A → A

Es un:

```text
no-op
```

y no produce cambio.

## 8.2. Historia

El SKU actual:

```text
NO es la identidad del ArticuloCatalogo
```

Modificarlo no cambia la identidad del artículo.

M02 no mantiene durante el MVP un historial universal de SKUs anteriores.

Si un módulo transaccional necesita preservar el SKU utilizado o mostrado en una operación histórica, deberá conservar el valor que necesite dentro de su propio modelo.

Si en una evolución futura se requiere reservar códigos históricos:

```text
se modelará explícitamente
historial / alias de SKU
```

y no se inferirá desde este modelo.

## 8.3. Concurrencia Conceptual

La verificación:

```text
¿B está disponible?
```

realizada para UX no garantiza por sí sola la unicidad al guardar.

La operación que confirma el nuevo SKU debe volver a garantizar la unicidad de forma consistente con la mutación.

La implementación técnica se definirá posteriormente.

---

# 9. UnidadMedida e Historia Operativa

UnidadMedida define el significado de las cantidades registradas para un artículo.

La UnidadMedida puede modificarse mientras el cambio no altere el significado de historia cuantitativa existente.

Conceptualmente:

```text
ArticuloCatalogo
        ↓
¿el cambio altera historia cuantitativa?
        │
        ├── No → puede permitirse
        │
        └── Sí → bloquear
```

La existencia de información cuantitativa relevante es una condición derivada de módulos consumidores como:

```text
M03 Compras
M04 Inventario
M05 Ventas
M07 Producción
```

No debe implementarse automáticamente un atributo:

```text
tiene_historia_operativa
```

dentro de ArticuloCatalogo.

La forma técnica de consultar dependencias se decidirá posteriormente.

La mera existencia de cualquier historia no implica necesariamente bloqueo permanente.

La regla es preservar el significado histórico de cantidades anteriores.

Ejemplo:

```text
Harina
unidad = KG

Compra histórica = 5 KG
```

una edición directa:

```text
KG → UNIDAD
```

que reinterpretara esos `5 KG` como `5 UNIDAD` no es válida.

Las conversiones históricas quedan fuera del MVP.

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

La consistencia debe garantizarse en la operación que confirma la emisión.

---

## Aceptación de InvitacionNegocio y UsuarioNegocio

Una invitación aceptada puede provocar como consecuencia del Caso de Uso:

```text
crear UsuarioNegocio
o
reactivar UsuarioNegocio histórico
```

Esta consecuencia NO representa una asociación estructural directa entre InvitacionNegocio y UsuarioNegocio.

La coordinación pertenece al comportamiento dinámico del Caso de Uso.

Conceptualmente:

```text
InvitacionNegocio.aceptarPara(...)
        ↓
Caso de Uso
        ↓
Negocio.incorporarOReactivarMiembro(...)
```

La operación completa debe conservar consistencia/atomicidad funcional.

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

Cada Categoria pertenece exactamente a un Negocio.

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

Cada ArticuloCatalogo pertenece exactamente a un Negocio.

---

## Categoria ↔ ArticuloCatalogo

Desde la perspectiva del artículo:

```text
ArticuloCatalogo
0..1 Categoria
```

Desde la perspectiva de Categoria:

```text
Categoria
0..N ArticuloCatalogo
```

Cuando existe una Categoria:

```text
ArticuloCatalogo.negocio
=
Categoria.negocio
```

Una Categoria INACTIVA puede conservar asociaciones existentes, pero no acepta nuevas asociaciones o reasignaciones.

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

UnidadMedida pertenece a un catálogo normalizado global del sistema.

---

## Interpretación de Cardinalidades

Las cardinalidades expresan restricciones conceptuales.

No determinan automáticamente:

- dirección de navegación en código;
- foreign keys concretas;
- eager/lazy loading;
- Aggregate Roots;
- cascadas ORM;
- estrategia de borrado.

Esas decisiones pertenecen al Diseño Técnico.

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

### INV-CAT-001 — Pertenencia

Todo ArticuloCatalogo y toda Categoria pertenecen exactamente a un Negocio.

### INV-CAT-002 — Categoria del Mismo Negocio

Si un artículo posee Categoria:

```text
ArticuloCatalogo.negocio
=
Categoria.negocio
```

### INV-CAT-003 — Tipo Inmutable

TipoArticulo es inmutable.

### INV-CAT-004 — Servicio sin Inventario

SERVICIO cumple:

```text
controla_stock = False
controla_vencimiento = False
puede_usarse_en_produccion = False
```

### INV-CAT-005 — Vencimiento

Vencimiento implica:

```text
BIEN + controla_stock
```

### INV-CAT-006 — Producción

Uso en producción implica:

```text
BIEN + controla_stock
```

### INV-CAT-007 — Descuento

```text
permite_descuento = True
→ es_vendible = True
```

### INV-CAT-008 — Deshabilitar Venta

Si:

```text
es_vendible
True → False
```

la misma transición produce:

```text
permite_descuento = False
precio_base se conserva
```

### INV-CAT-009 — Habilitar Venta

Si:

```text
es_vendible
False → True
```

debe existir:

```text
precio_base >= 0
```

antes de confirmar.

### INV-CAT-010 — Uso Operativo Mínimo

ArticuloCatalogo ACTIVO debe cumplir al menos una:

```text
es_comprable
es_vendible
puede_usarse_en_produccion
```

ArticuloCatalogo INACTIVO puede no cumplir ninguna.

### INV-CAT-011 — Precio Base

Artículo vendible requiere:

```text
precio_base >= 0
```

El valor cero es válido.

### INV-CAT-012 — Costo de Referencia

Si existe:

```text
costo_referencia >= 0
```

### INV-CAT-013 — SKU Actual Único

El SKU actual, cuando existe, es único dentro del Negocio considerando artículos ACTIVOS e INACTIVOS.

### INV-CAT-014 — Cambio de SKU

Una modificación:

```text
A → B
```

requiere que B esté disponible al confirmar.

Después de confirmar:

```text
A queda libre
```

Quitar el SKU libera el valor anterior después de confirmar.

### INV-CAT-015 — Nombre de Categoria

No pueden existir Categorías funcionalmente equivalentes dentro del mismo Negocio después de normalización.

La regla considera ACTIVAS e INACTIVAS.

### INV-CAT-016 — Categoria INACTIVA

Desactivar una Categoria:

- no desactiva artículos;
- no cambia capacidades;
- conserva asociaciones existentes;
- impide nuevas asociaciones/reasignaciones hacia ella.

### INV-CAT-017 — Reactivación con Categoria Histórica

Una Categoria históricamente asociada que se encuentre INACTIVA no bloquea la reactivación del ArticuloCatalogo.

### INV-CAT-018 — Eliminación de Categoria

Una Categoria referenciada por cualquier ArticuloCatalogo ACTIVO o INACTIVO no puede eliminarse físicamente.

### INV-CAT-019 — Eliminación de ArticuloCatalogo

ArticuloCatalogo solo puede eliminarse físicamente cuando no posee historia relevante, referencias ni dependencias que deban conservarse.

### INV-CAT-020 — UnidadMedida

Un cambio de UnidadMedida no puede alterar el significado de cantidades históricas que deban preservarse.

### INV-CAT-021 — Capacidades Comerciales

Modificar capacidades comerciales puede afectar nuevas operaciones sin reescribir historia anterior.

### INV-CAT-022 — Capacidades Estructurales

Modificar:

```text
controla_stock
controla_vencimiento
puede_usarse_en_produccion
```

requiere validar compatibilidad con dependencias existentes.

La mera existencia de historia no implica bloqueo permanente.

### INV-CAT-023 — Desactivación

Desactivar ArticuloCatalogo conserva:

- identidad;
- SKU actual;
- historia;
- referencias.

M02 no elimina ni modifica existencias administradas por M04.

### INV-CAT-024 — Reactivación

Reactivar reutiliza el mismo ArticuloCatalogo y revalida las invariantes vigentes necesarias para volver a operar.

No reescribe historia.

### INV-CAT-025 — Capacidades no son Hechos

Las capacidades representan elegibilidad/configuración.

No representan Compras, Ventas, stock real, lotes, vencimientos concretos ni recetas.

### INV-CAT-026 — Estado Actual e Historia

M02 mantiene la configuración actual.

Los módulos consumidores preservan los valores históricos necesarios para interpretar sus propias operaciones.

### INV-CAT-027 — Guardias Contextuales

Las validaciones contextuales relevantes y la mutación correspondiente deben confirmarse de manera consistente.

Una preconsulta para UX no sustituye la garantía final.

### INV-CAT-028 — Autorización

Toda mutación de M02 requiere conceptualmente:

```text
Usuario autenticado
+
Negocio autorizado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso concreto de M02
```

Los métodos de las entidades no autorizan actores por sí mismos.

### INV-CAT-029 — Moneda

Los importes de ArticuloCatalogo utilizan la moneda base del Negocio.

ArticuloCatalogo no posee moneda independiente.

### INV-CAT-030 — Cantidades Fraccionarias

El dominio admite cantidades fraccionarias cuando la UnidadMedida lo requiere.

---

# 12. Responsabilidad Transversal de Trazabilidad e Historia

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
cambio de SKU
cambio de capacidades
activación/desactivación
cambio de precio base
```

Esto se considera una responsabilidad transversal.

La estrategia técnica podrá resolverse posteriormente mediante:

- información de autoría;
- registros de cambios;
- eventos;
- auditoría técnica;
- mecanismos específicos por caso;

o una combinación apropiada.

Este documento no obliga todavía a crear:

```text
Entidad Auditoria universal
```

## Estado Actual vs. Valores Históricos

Debe distinguirse:

```text
estado actual
```

de:

```text
información histórica necesaria para una operación pasada
```

Ejemplos:

```text
precioBase actual
≠ precio aplicado en una Venta histórica

SKU actual
≠ necesariamente SKU mostrado/usado en una operación histórica

Categoria actual
≠ necesariamente clasificación histórica requerida por Analítica
```

M02 no mantiene obligatoriamente versiones completas de cada cambio.

Los módulos consumidores deben preservar los valores históricos que necesiten según su propia semántica.

La forma técnica:

```text
snapshot
campos copiados
versionado
otro mecanismo
```

queda abierta.

---

# 13. Permisos, Autorización y Modelo de Dominio

El dominio diferencia:

```text
Rol contextual
```

de:

```text
Permiso concreto de una operación
```

M01 determina:

```text
UsuarioNegocio.rol
```

Cada módulo determina qué operaciones permite ese Rol.

Ejemplo:

```text
ENCARGADO

M02
├── consultar catálogo          Sí
├── activar artículo            Sí
├── desactivar artículo         Sí
├── reactivar artículo          Sí
├── editar artículo             No
├── cambiar precio_base         No
└── gestionar categorías        No
```

No se crea durante el MVP una entidad:

```text
Permiso
```

ni un RBAC dinámico configurable.

## Autorización del Caso de Uso

Los métodos del dominio:

```text
ArticuloCatalogo.desactivar()
Categoria.reactivar()
Negocio.cambiarRolMiembro()
```

no determinan por sí mismos si un Usuario está autorizado a ejecutar la acción.

Antes de una mutación, el Caso de Uso debe verificar conceptualmente:

```text
Usuario autenticado
+
Negocio identificado/autorizado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso concreto del módulo
```

No debe pasarse el Rol como parámetro artificial a cada método de entidad para resolver autorización.

La autorización pertenece al contexto del Caso de Uso.

## Aislamiento entre Negocios

La autorización debe impedir:

```text
Usuario autorizado en Negocio A
→ modificar recurso perteneciente a Negocio B
```

Las entidades y asociaciones deben mantener el Negocio correcto aun cuando un identificador externo sea manipulado.

La estrategia técnica para transportar/resolver el contexto de Negocio se definirá en Arquitectura.

---

# 14. Diagrama UML Conceptual

El siguiente diagrama representa una vista integrada y simplificada del Modelo de Dominio del Bloque 1.

Los diagramas detallados específicos de M01 y M02 son la referencia visual principal para responsabilidades finas.

Este UML general:

- no es un modelo ORM;
- no define Aggregate Roots;
- no define navegabilidad técnica;
- no enumera todos los métodos posibles;
- prioriza relaciones e invariantes centrales.

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
  rubro [0..1]
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

class Email <<value object>>

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

}

package "M02 — Catálogo" {

class Categoria <<entity>> {
  identidad
  nombre
  estado : EstadoCategoria
  --
  estaActiva() : Boolean
  cambiarNombre()
  desactivar()
  reactivar()
  puedeEliminarseFisicamente() : Boolean
}

class ArticuloCatalogo <<entity>> {
  identidad
  nombre
  descripcion [0..1]
  tipo : TipoArticulo
  unidadMedida : UnidadMedida
  sku [0..1]
  precioBase [0..1]
  costoReferencia [0..1]
  imagenPrincipal [0..1]
  estado : EstadoArticulo
  --
  asignarCategoria()
  quitarCategoria()
  actualizarCapacidades()
  cambiarPrecioBase()
  cambiarCostoReferencia()
  cambiarUnidad()
  puedeEliminarseFisicamente() : Boolean
  desactivar()
  reactivar()
}

class CapacidadesArticulo <<value object>> {
  esComprable : Boolean
  esVendible : Boolean
  controlaStock : Boolean
  puedeUsarseEnProduccion : Boolean
  controlaVencimiento : Boolean
  permiteDescuento : Boolean
  --
  esCoherenteCon(tipo : TipoArticulo) : Boolean
}

enum EstadoCategoria <<enum>> {
  ACTIVA
  INACTIVA
}

enum EstadoArticulo <<enum>> {
  ACTIVO
  INACTIVO
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

Negocio "1" -- "0..*" Categoria : organiza
Negocio "1" -- "0..*" ArticuloCatalogo : contiene

Categoria "0..1" -- "0..*" ArticuloCatalogo : clasifica

ArticuloCatalogo "1" *-- "1" CapacidadesArticulo : define

note right of UsuarioNegocio
El Rol pertenece a la membresía.
Las mutaciones que afectan invariantes
organizacionales se coordinan desde Negocio.
end note

note right of Negocio
Crear Negocio incluye atómicamente
su primer UsuarioNegocio
ACTIVO PROPIETARIO.

Nunca puede quedar sin
PROPIETARIO activo.
end note

note bottom of InvitacionNegocio
Aceptar valida invitación,
pero el Caso de Uso coordina
atómicamente aceptación
+ creación/reactivación de membresía.
end note

note right of ArticuloCatalogo
TipoArticulo es inmutable.

ACTIVO requiere uso operativo.

SKU actual es único por Negocio.
Modificar SKU no cambia identidad.

Categoria histórica INACTIVA
no bloquea reactivación.
end note

note right of CapacidadesArticulo
Capacidades = elegibilidad,
no hechos operativos.

SERVICIO:
sin stock, vencimiento
ni producción.

Cambios estructurales pueden
requerir dependencias externas.
end note

@enduml
```

### Diagramas Detallados Asociados

La vista general se complementa con:

```text
01-diagrama-general.puml
02-m01-organizacion-clases.md
02-m01-organizacion-clases.puml
03-m02-catalogo-clases.md
03-m02-catalogo-clases.puml
```

y con las vistas dinámicas pendientes:

```text
04-m01-estados-invitacion.puml
05-m01-estados-membresia.puml
06-m02-estados-articulo.puml

secuencias/
├── 01-aceptar-invitacion.puml
└── 02-editar-articulo.puml
```

El diagrama de clases no sustituye los diagramas dinámicos.

---

# 15. Lectura Simplificada del UML

## Organización

```text
Usuario
   │
   ▼
UsuarioNegocio
   │
   ▼
Negocio
```

UsuarioNegocio contiene:

```text
Rol
EstadoMembresia
```

Por eso:

```text
Usuario
≠ Rol global
```

y:

```text
UsuarioNegocio
→ Rol contextual
```

Las mutaciones de membresía que pueden romper invariantes globales del Negocio no deben ejecutarse mediante setters públicos independientes.

---

## Catálogo

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

Pero:

```text
Capacidad
≠ hecho operativo
```

Ejemplos:

```text
controlaStock
≠ stock actual

esVendible
≠ Venta

puedeUsarseEnProduccion
≠ Receta
```

M02 define configuración/elegibilidad.

M03/M04/M05/M07 registrarán operaciones y estado operativo.

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
SkuHistorico
CategoriaHistorica
ArticuloVersion
```

salvo que una necesidad posterior demuestre que son necesarios.

No deben agregarse preventivamente para “por si acaso”.

En particular, el hecho de que un módulo futuro necesite historia no obliga a M02 a versionar universalmente ArticuloCatalogo.

---

# 17. Límites de Responsabilidad

## M01

Es responsable de:

```text
identidad global
Negocio
membresías
roles contextuales
invitaciones
modalidades
contexto organizacional autorizado
```

No administra el Catálogo.

La autenticación pertenece funcionalmente al alcance de M01, mientras que credenciales, sesiones y mecanismos técnicos pertenecen a Arquitectura/IAM.

---

## M02

Es responsable de:

```text
categorías
artículos
TipoArticulo
UnidadMedida
CapacidadesArticulo
SKU actual
precio base actual
costo de referencia actual
imagen principal
estado ACTIVO / INACTIVO
reglas de configuración
```

No administra:

```text
stock real
lotes
vencimientos concretos
compras
ventas
pagos
recetas
producción
caja
```

M02 define:

```text
qué puede hacer un artículo
```

Los módulos operativos definen:

```text
qué ocurrió realmente
y qué estado operativo produjo
```

---

# 18. Dependencias entre M01 y M02

M02 depende conceptualmente de M01 porque todo catálogo pertenece a:

```text
Negocio
```

y toda acción sobre el catálogo requiere contexto autorizado.

Conceptualmente:

```text
Usuario autenticado
+
Negocio autorizado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso definido por M02
```

Por lo tanto:

```text
M01
   ↓
provee identidad y contexto organizacional

M02
   ↓
aplica reglas específicas del catálogo
```

M01 no debe conocer internamente las reglas del Catálogo.

M02 tampoco debe duplicar:

```text
Usuario
UsuarioNegocio
Rol
Negocio
```

como modelos independientes propios.

## Moneda

M02 utiliza:

```text
Negocio.monedaBase
```

para interpretar precioBase y costoReferencia.

ArticuloCatalogo no posee moneda independiente durante el MVP.

## Aislamiento

Toda relación y operación debe impedir cruces como:

```text
ArticuloCatalogo de Negocio A
+
Categoria de Negocio B
```

o:

```text
Usuario autorizado solamente en A
→ modifica catálogo de B
```

La garantía técnica se resolverá durante Arquitectura y Modelo Relacional.

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

optimistic locking / pessimistic locking

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

forma de transportar/resolver Negocio activo

auditoría técnica

almacenamiento de imágenes

forma concreta de consultar dependencias entre módulos

forma concreta de preservar valores históricos
```

## 19.1. Restricción de Interpretación

La presencia de métodos conceptuales en UML no obliga a:

```text
una clase ORM equivalente
un Repository por entidad
un agregado por clase
una tabla por concepto
un endpoint por método
```

Los Value Objects tampoco obligan a una tabla propia.

Los enums tampoco obligan a enums nativos de la base.

Estas decisiones se resolverán en Arquitectura, ADRs y Modelo Relacional.

## 19.2. Atomicidad Funcional vs. Implementación Técnica

Cuando el modelo indica que una operación debe ser atómica significa:

```text
o se confirma el cambio completo
o no se confirma ninguna parte
```

No prescribe todavía:

```text
transacción SQL
Unit of Work
lock
Application Service
Domain Service
otro mecanismo
```

Ejemplos funcionalmente atómicos:

```text
crear Negocio + primer PROPIETARIO

aceptar InvitacionNegocio
+ crear/reactivar membresía

deshabilitar venta
+ deshabilitar descuento

validar nuevo SKU
+ cambiar SKU

eliminación
+ revalidación de dependencias
```

## 19.3. Concurrencia y TOCTOU

No debe implementarse una operación contextual sensible únicamente como:

```text
if es_valido():
    guardar_mas_tarde()
```

si entre ambas acciones el estado relevante puede cambiar.

Ejemplos:

- último Propietario activo;
- SKU único;
- nombre de Categoria único;
- aceptación de invitación;
- eliminación física;
- cambios estructurales dependientes de stock/recetas.

La garantía técnica se decidirá posteriormente, pero la implementación deberá preservar el resultado funcional bajo concurrencia.

## 19.4. Integridad en Profundidad

La UI puede prevenir errores y mejorar UX.

Pero:

```text
validación frontend
≠ garantía de dominio
```

Las invariantes deben verificarse también del lado autorizado que confirma la operación.

Cuando corresponda, el Modelo Relacional podrá aportar garantías adicionales.

## 19.5. Numéricos

La precisión exacta queda abierta.

Sin embargo:

```text
dinero
→ representación decimal exacta

cantidades
→ soporte fraccionario
```

No utilizar Float binario para dinero.

---

# 20. Guía de Implementación y Lectura para IA

Esta sección resume cómo debe interpretarse este Modelo de Dominio durante las etapas técnicas.

## 20.1. No Traducir Mecánicamente UML a Código

Una IA NO debe asumir:

```text
1 clase UML = 1 tabla

1 método UML = 1 endpoint

1 entidad = 1 Aggregate Root

1 relación UML = relación ORM bidireccional

Value Object = tabla independiente
```

Debe diseñar la representación técnica después de comprender invariantes y casos de uso.

## 20.2. Preservar Identidades

Las identidades de dominio son estables.

No utilizar como identidad técnica mutable:

```text
SKU
nombre de Categoria
nombre de ArticuloCatalogo
Rol
```

Cambiar esos valores no debe crear accidentalmente una nueva identidad.

## 20.3. No Exponer Setters que Salteen Invariantes

Evitar interfaces de dominio como:

```text
miembro.rol = nuevoRol
miembro.estado = INACTIVO

articulo.controlaStock = False
articulo.permiteDescuento = True
```

cuando la modificación requiera validar otras reglas.

Preferir operaciones que representen transiciones completas y válidas.

## 20.4. Capacidades de M02

No agregar a ArticuloCatalogo:

```text
stockActual
fechaVencimiento
recetas
ventas
compras
```

porque una capacidad no es el hecho operativo.

## 20.5. Estado Actual e Historia

No reconstruir operaciones históricas leyendo únicamente:

```text
ArticuloCatalogo actual
Categoria actual
precioBase actual
SKU actual
```

Los módulos consumidores deben preservar los datos históricos que su semántica necesite.

## 20.6. Guardias Contextuales

Antes de confirmar operaciones que dependan del conjunto del Negocio o de otros módulos, resolver las guardias necesarias.

Ejemplos:

```text
SKU disponible
Categoria única
Categoria del mismo Negocio
Categoria ACTIVA para nueva asociación
historia cuantitativa
dependencias estructurales
último Propietario
membresía histórica
```

La preconsulta UX no reemplaza la garantía final.

## 20.7. Autorización

Nunca asumir que poseer el identificador de una entidad autoriza a modificarla.

Toda mutación debe ejecutarse bajo un contexto autorizado:

```text
Usuario
+
Negocio
+
membresía ACTIVA
+
Rol
+
permiso del módulo
```

## 20.8. Estados Inactivos

No tratar automáticamente:

```text
INACTIVO
```

como:

```text
eliminado
```

Los objetos inactivos conservan identidad e historia y pueden ser reactivables según sus reglas.

## 20.9. Errores de Implementación a Evitar

Evitar especialmente:

1. asignar Rol directamente a Usuario;
2. duplicar UsuarioNegocio al reincorporar;
3. dejar Negocio sin Propietario activo;
4. marcar Invitacion ACEPTADA sin incorporar/reactivar membresía;
5. aceptar invitación para email diferente;
6. usar Categoria de otro Negocio;
7. permitir nueva asociación a Categoria INACTIVA;
8. convertir SERVICIO en artículo con stock;
9. persistir capacidades inválidas mediante setters parciales;
10. activar artículo sin uso operativo;
11. habilitar venta sin precio válido;
12. cambiar UnidadMedida reinterpretando cantidades históricas;
13. bloquear para siempre una capacidad estructural únicamente porque existe historia;
14. eliminar artículo/categoría después de una consulta obsoleta sin revalidar;
15. reutilizar un SKU que sigue actualmente asignado;
16. tratar el SKU como identidad del artículo;
17. reconstruir ventas históricas con precio actual;
18. utilizar Float binario para dinero;
19. confiar únicamente en autorización del frontend;
20. mezclar recursos de Negocios diferentes;
21. inventar `EstadoNegocio` o un ciclo de cierre/reactivación no definido;
22. inventar estados adicionales para Usuario, Membresía, Categoria o Articulo;
23. tratar `identificadorSeguro` de InvitacionNegocio como una decisión cerrada sobre token/UUID/hash;
24. convertir una precondición de UI en la única protección del backend.

## 20.10. Derivación de Tests

Toda invariante numerada debe poder convertirse en uno o más tests.

Los tests deberán cubrir al menos:

```text
caso válido
caso inválido
transición de estado
autorización
aislamiento entre Negocios
concurrencia crítica cuando corresponda
preservación histórica
```

---

# 21. Criterios de Aceptación del Modelo de Dominio

El Modelo de Dominio del Bloque 1 se considera válido cuando:

## Organización

1. Usuario representa una cuenta global independiente de los Negocios.
2. Usuario puede participar en 0..N Negocios mediante UsuarioNegocio.
3. El Rol pertenece a UsuarioNegocio.
4. EstadoMembresia se limita a ACTIVO/INACTIVO en el MVP.
5. Para Usuario + Negocio existe una única membresía conceptual histórica.
6. Reincorporar reutiliza la membresía histórica.
7. Una membresía ya ACTIVA no se duplica ni modifica silenciosamente su rol.
8. Un Negocio activo conserva al menos un PROPIETARIO activo.
9. Crear Negocio incluye atómicamente su primer UsuarioNegocio ACTIVO PROPIETARIO.
10. La incorporación inicial admite ENCARGADO/TRABAJADOR.
11. PROPIETARIO requiere promoción explícita.
12. InvitacionNegocio puede existir antes que el Usuario destinatario.
13. InvitacionNegocio nace PENDIENTE.
14. El emisor es UsuarioNegocio ACTIVO PROPIETARIO del mismo Negocio.
15. Solo una invitación PENDIENTE, vigente y vinculada al email correcto puede aceptarse.
16. Aceptar invitación + crear/reactivar membresía constituye una operación funcionalmente atómica.
17. WhatsApp no forma parte de la identidad del Usuario ni de la Invitación.
18. Las modalidades son orientativas y no restricciones rígidas.

## Catálogo

19. Cada Categoria pertenece exactamente a un Negocio.
20. Cada ArticuloCatalogo pertenece exactamente a un Negocio.
21. Categoria es opcional.
22. Si existe Categoria, pertenece al mismo Negocio que el artículo.
23. Categoria INACTIVA conserva asociaciones existentes.
24. Categoria INACTIVA no admite nuevas asociaciones.
25. Categoria histórica INACTIVA no bloquea reactivar el artículo.
26. Una Categoria con artículos asociados no puede eliminarse físicamente.
27. TipoArticulo distingue BIEN/SERVICIO y es inmutable.
28. CapacidadesArticulo es un Value Object sin identidad propia.
29. Las capacidades se modifican como configuración completa válida.
30. SERVICIO no controla stock ni vencimiento y no es insumo de producción.
31. Vencimiento implica BIEN + stock.
32. Producción implica BIEN + stock.
33. Descuento implica vendible.
34. Deshabilitar venta deshabilita descuento y conserva precio.
35. Habilitar venta exige precioBase válido.
36. Articulo ACTIVO exige uso operativo mínimo.
37. Articulo INACTIVO puede quedar sin uso operativo.
38. precioBase de artículo vendible es >= 0 y cero es válido.
39. costoReferencia opcional es >= 0 cuando existe.
40. SKU actual es único por Negocio entre ACTIVOS e INACTIVOS.
41. Cambiar SKU libera el valor anterior solo después de confirmar el nuevo estado.
42. SKU no constituye identidad técnica del artículo.
43. UnidadMedida es catálogo global normalizado.
44. SERVICIO recibe inicialmente UNIDAD.
45. Cambiar UnidadMedida no puede reinterpretar cantidades históricas.
46. Capacidades comerciales pueden cambiar sin reescribir historia.
47. Capacidades estructurales requieren validar dependencias compatibles.
48. La mera existencia de historia no bloquea necesariamente para siempre una capacidad estructural.
49. Desactivar artículo conserva identidad, historia, referencias y no modifica stock de M04.
50. Reactivar revalida las invariantes necesarias.
51. Eliminar físicamente artículo exige ausencia de historia/referencias/dependencias.
52. M02 representa estado actual y los módulos consumidores preservan su historia necesaria.
53. Las capacidades no se confunden con hechos operativos.
54. Los importes utilizan Negocio.monedaBase.
55. El dominio admite cantidades fraccionarias.

## Transversales

56. Toda mutación respeta contexto autorizado y permiso concreto del módulo.
57. Las validaciones contextuales críticas se revalidan al confirmar la mutación.
58. Las preconsultas UX no sustituyen garantías de dominio.
59. Trazabilidad se reconoce como responsabilidad transversal sin imponer una entidad universal.
60. El modelo no introduce como decisiones cerradas infraestructura, ORM, Repository, Unit of Work ni Aggregate Roots formales.

---

# 22. Estado del Documento

Este documento consolida el modelo conceptual resultante de M01 y de la versión refinada de M02.

Al reemplazar en el repositorio las versiones actualizadas de:

```text
modulos/M02-Catalogo.md
modelo-dominio/bloque-1-fundacion/01-modelo-dominio-bloque-1.md
```

el estado documental esperado es:

```text
BLOQUE 1 — FUNDACIÓN

Especificación Funcional
├── M01 Organización                         ✅ CONGELADO
└── M02 Catálogo                             ✅ ACTUALIZADO

Modelo de Dominio estructural
├── 01-modelo-dominio-bloque-1.md            ✅ ACTUALIZADO
├── 01-diagrama-general.puml                 ✅ CONGELADO
├── 01-diagrama-general.png                  ✅ CONGELADO
├── 02-m01-organizacion-clases.md            ✅ CONGELADO
├── 02-m01-organizacion-clases.puml          ✅ CONGELADO
├── 02-m01-organizacion-clases.png           ✅ CONGELADO
├── 03-m02-catalogo-clases.puml              ✅ CONGELADO
├── 03-m02-catalogo-clases.png               ✅ CONGELADO
└── 03-m02-catalogo-clases.md                🟡 PENDIENTE DE SINCRONIZACIÓN FINAL

Vistas dinámicas pendientes
├── 04-m01-estados-invitacion.puml           ⏳
├── 05-m01-estados-membresia.puml            ⏳
├── 06-m02-estados-articulo.puml             ⏳
└── secuencias/
    ├── 01-aceptar-invitacion.puml            ⏳
    └── 02-editar-articulo.puml               ⏳
```

El Modelo de Dominio conceptual ya puede utilizarse como referencia de análisis.

La suite completa de dominio del Bloque 1 no se considera cerrada hasta:

1. sincronizar `03-m02-catalogo-clases.md`;
2. completar diagramas de estados;
3. completar secuencias críticas;
4. realizar una última verificación transversal.

Después:

```text
DECISIONES ARQUITECTÓNICAS / ADRs
        ↓
MODELO RELACIONAL
        ↓
CONTRATO API
        ↓
UX
        ↓
IMPLEMENTACIÓN
        ↓
TESTS
```

Cualquier modificación futura que altere:

- entidades;
- Value Objects;
- cardinalidades;
- estados;
- invariantes;
- política de SKU;
- reglas de capacidades;
- reglas de reactivación;
- reglas de incorporación;
- permisos;
- límites entre módulos;

deberá actualizar primero la especificación funcional correspondiente y luego los artefactos de dominio afectados.

El objetivo es mantener:

```text
documentación funcional
=
modelo conceptual
=
diagramas
=
implementación
```

sin fuentes de verdad contradictorias.
