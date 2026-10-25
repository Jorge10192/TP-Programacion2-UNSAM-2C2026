# 02 — M01 Organización del Negocio — Guía de Interpretación del Diagrama de Clases

## 1. Propósito del Documento

Este documento acompaña al diagrama:

```text
02-m01-organizacion-clases.puml
```

y a su render visual:

```text
02-m01-organizacion-clases.png
```

Su objetivo es permitir que una persona, desarrollador o modelo de IA interprete correctamente el **Diagrama 2 — M01 Organización del Negocio**, sin confundir el modelo conceptual con decisiones técnicas todavía no tomadas.

Este documento:

- explica el propósito del diagrama;
- define cómo debe leerse;
- identifica las responsabilidades de cada entidad;
- explicita las invariantes que condicionan futuras implementaciones;
- diferencia reglas de dominio, coordinación de casos de uso y decisiones de arquitectura;
- documenta qué conclusiones pueden extraerse del UML;
- documenta qué conclusiones **NO** deben inferirse;
- sirve como puente entre la especificación funcional de M01 y las futuras etapas de arquitectura, modelo relacional, API e implementación.

Este documento **no reemplaza** la especificación funcional de M01 ni el Modelo de Dominio del Bloque 1.

---

# 2. Ubicación dentro de la Documentación

La estructura recomendada es:

```text
Proyecto-3-Extendido-Generico/
└── modelo-dominio/
    └── bloque-1-fundacion/
        ├── 01-modelo-dominio-bloque-1.md
        ├── 01-diagrama-general.puml
        ├── 01-diagrama-general.png
        ├── 02-m01-organizacion-clases.md
        ├── 02-m01-organizacion-clases.puml
        └── 02-m01-organizacion-clases.png
```

El archivo:

```text
02-m01-organizacion-clases.md
```

es la guía semántica del segundo diagrama.

---

# 3. Fuentes de Verdad

Para interpretar este diagrama debe respetarse el siguiente orden:

```text
1. M01 — Organización del Negocio
   modulos/M01-organizacion-negocio.md

2. Modelo de Dominio del Bloque 1
   modelo-dominio/bloque-1-fundacion/01-modelo-dominio-bloque-1.md

3. Este documento
   modelo-dominio/bloque-1-fundacion/02-m01-organizacion-clases.md

4. Diagrama
   modelo-dominio/bloque-1-fundacion/02-m01-organizacion-clases.puml

5. Código de implementación
```

El UML no puede modificar silenciosamente una regla funcional congelada.

Si existiera una contradicción:

```text
especificación funcional
>
modelo de dominio
>
guía del diagrama
>
diagrama
>
implementación
```

La contradicción debe documentarse y resolverse antes de continuar.

---

# 4. Objetivo del Diagrama

El Diagrama 2 detalla exclusivamente el dominio de:

```text
M01 — Organización del Negocio
```

Debe responder principalmente:

```text
¿Qué entidades participan en M01?

¿Cómo se relacionan Usuario y Negocio?

¿Dónde vive el Rol?

¿Cómo se conserva la membresía histórica?

¿Quién protege la existencia del último Propietario?

¿Cómo se representa una InvitacionNegocio?

¿Qué responsabilidades pertenecen a cada entidad?

¿Qué coordinación pertenece a un Caso de Uso y no a una entidad?

¿Qué decisiones siguen abiertas para Arquitectura?
```

El diagrama está diseñado para servir como referencia durante:

- diseño arquitectónico;
- definición de agregados;
- diseño del modelo relacional;
- diseño del contrato API;
- implementación del Service Layer;
- implementación de entidades de dominio;
- definición de validaciones;
- diseño de tests;
- generación asistida por IA.

---

# 5. Alcance del Diagrama

El diagrama modela:

```text
Usuario
UsuarioNegocio
Negocio
InvitacionNegocio

Email

Rol
EstadoMembresia
ModalidadOperativa
EstadoInvitacion
Moneda
```

También representa:

- cardinalidades;
- responsabilidades conceptuales;
- comportamiento relevante;
- invariantes críticas;
- restricciones del MVP;
- límites con arquitectura.

No pretende representar todo M01 en una sola imagen.

Los ciclos de vida y coordinaciones complejas deberán complementarse posteriormente con diagramas de estado y secuencia.

---

# 6. Elementos Fuera del Alcance

El Diagrama 2 **no define**:

```text
tablas
foreign keys
columnas SQL
UUID
índices
restricciones SQL
SQLAlchemy
Pydantic
FastAPI
endpoints
JWT
cookies
sesiones HTTP
middleware
RequestContext
Repository
Unit of Work
Domain Events
Factory Pattern
hashes de contraseña
OAuth
MFA
```

Tampoco establece formalmente todavía:

```text
qué clase es Aggregate Root
qué entidades pertenecen exactamente a cada agregado técnico
cómo se persiste una transacción
cómo se cargan las colecciones
cómo se implementa concurrencia
```

Estas decisiones pertenecen a:

```text
Arquitectura
+
ADRs
+
Modelo Relacional
+
Contrato API
```

---

# 7. Criterio General de Lectura

La relación estructural principal es:

```text
Usuario
   │
   │ 0..N
   ▼
UsuarioNegocio
   │
   │ N..1
   ▼
Negocio
```

Conceptualmente:

```text
UsuarioNegocio
=
Membresía de un Usuario dentro de un Negocio
+
Rol contextual
+
Estado de participación
```

Por lo tanto:

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

Un mismo Usuario puede tener distintos roles en distintos Negocios.

Ejemplo:

```text
Usuario: María

Negocio WALOS
→ PROPIETARIO

Negocio Centro Mascota
→ TRABAJADOR
```

---

# 8. Entidad `Usuario`

## 8.1. Responsabilidad

`Usuario` representa la identidad global de una persona dentro de la plataforma.

No representa una persona dentro de un negocio específico.

Puede existir:

```text
sin Negocio
con un Negocio
con varios Negocios
```

## 8.2. Información conceptual

El diagrama incluye:

```text
identidad
nombre
email : Email
estadoCuenta
fechaRegistro
```

## 8.3. Regla fundamental

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

## 8.4. Frontera con IAM

El diagrama **no incorpora**:

```text
contraseña
hash
JWT
refresh token
OAuth
MFA
```

El hecho de que M01 incluya funcionalmente registro e inicio de sesión no implica que estos mecanismos deban modelarse dentro de la entidad `Usuario`.

La gestión técnica de credenciales se definirá posteriormente.

---

# 9. Entidad `UsuarioNegocio`

## 9.1. Responsabilidad

`UsuarioNegocio` representa la membresía contextual entre:

```text
Usuario
+
Negocio
```

Contiene:

```text
rol : Rol
estado : EstadoMembresia
fechaIncorporacion
```

## 9.2. Estado

Los únicos estados conceptuales definidos para el MVP son:

```text
ACTIVO
INACTIVO
```

No deben inventarse desde este UML estados como:

```text
SUSPENDIDO
ELIMINADO
BLOQUEADO
PENDIENTE
```

sin modificar previamente la especificación funcional.

## 9.3. Membresía histórica única

Para una misma combinación conceptual:

```text
Usuario + Negocio
```

debe existir una única membresía histórica.

Por lo tanto:

```text
Usuario A
+
Negocio X
```

no debe generar múltiples `UsuarioNegocio` debido a sucesivas salidas y reincorporaciones.

La reincorporación reutiliza la membresía histórica.

## 9.4. Mutaciones

`UsuarioNegocio` no expone públicamente operaciones como:

```text
cambiarRol()
desactivar()
reactivar()
```

La razón no es meramente estilística.

Cambiar el rol o desactivar una membresía puede afectar una invariante que depende del conjunto de miembros del Negocio:

```text
Todo Negocio activo
debe conservar al menos
1 PROPIETARIO activo.
```

Una membresía aislada no posee suficiente contexto para decidirlo correctamente.

---

# 10. Entidad `Negocio`

## 10.1. Responsabilidad

`Negocio` representa la organización, emprendimiento o comercio administrado mediante la plataforma.

Información conceptual:

```text
identidad
nombre
rubro opcional
monedaBase
modalidades
estado
```

## 10.2. Modalidades

Debe poseer:

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

- adaptan UX;
- adaptan navegación;
- adaptan onboarding;
- priorizan funcionalidades.

No bloquean rígidamente el dominio.

## 10.3. Moneda

Durante el MVP:

```text
Moneda = ARS
```

Este diagrama no define todavía cambio de moneda.

## 10.4. Protección del Propietario

La invariante principal es:

```text
Todo Negocio activo
debe conservar al menos
1 UsuarioNegocio ACTIVO
con Rol = PROPIETARIO
```

Por lo tanto, las operaciones:

```text
desactivarMiembro(...)
cambiarRolMiembro(...)
```

deben validar internamente la invariante antes de producir cambios.

No debe dependerse exclusivamente de una consulta previa realizada por UI o Service Layer.

Debe evitarse una implementación del tipo:

```text
si puedeDesactivar():
    cambiar estado directamente
```

La operación que muta debe ser la responsable final de garantizar la regla.

## 10.5. Promoción a Propietario

La promoción explícita se representa conceptualmente mediante:

```text
cambiarRolMiembro(miembro, PROPIETARIO)
```

No se necesita un mecanismo paralelo de incorporación inicial como Propietario.

---

# 11. Creación de un Negocio

Crear un Negocio no consiste únicamente en crear la entidad `Negocio`.

Funcionalmente debe producir:

```text
Negocio nuevo
+
UsuarioNegocio del creador
+
EstadoMembresia = ACTIVO
+
Rol = PROPIETARIO
```

Estas condiciones forman una única operación funcional.

Nunca debe quedar:

```text
Negocio activo
+
0 propietarios
```

como resultado de una creación válida.

Este documento no decide todavía si técnicamente esto será implementado mediante:

```text
Factory
Application Service
Domain Service
Aggregate Root
```

Eso corresponde a Arquitectura.

---

# 12. Incorporación y Reactivación de Miembros

La operación conceptual:

```text
incorporarOReactivarMiembro(usuario, rolInicial)
```

debe respetar los siguientes casos.

## Caso A — No existe membresía

```text
Usuario + Negocio
→ sin UsuarioNegocio
```

Resultado:

```text
crear UsuarioNegocio
estado = ACTIVO
rol = rolInicial
```

## Caso B — Existe membresía INACTIVA

Resultado:

```text
reutilizar UsuarioNegocio histórico
estado = ACTIVO
rol = rolInicial
```

No se recupera automáticamente el rol histórico anterior.

## Caso C — Existe membresía ACTIVA

Resultado:

```text
NO crear otra membresía
NO reactivar
NO cambiar silenciosamente el rol
```

La operación debe rechazarse o informar que el Usuario ya pertenece activamente al Negocio.

---

# 13. Restricción del Rol Inicial

Una incorporación mediante invitación solo puede utilizar:

```text
ENCARGADO
TRABAJADOR
```

Por lo tanto:

```text
rolInicial
∈
{ENCARGADO, TRABAJADOR}
```

No debe ser válido:

```text
incorporarOReactivarMiembro(usuario, PROPIETARIO)
```

La propiedad se obtiene posteriormente mediante una promoción explícita:

```text
cambiarRolMiembro(miembro, PROPIETARIO)
```

Esta regla evita saltarse el flujo establecido por M01.

---

# 14. Entidad `InvitacionNegocio`

## 14.1. Responsabilidad

Representa una propuesta formal de incorporación a un Negocio.

No representa:

- un mensaje de WhatsApp;
- un contacto telefónico;
- una cuenta ya creada;
- una membresía.

## 14.2. Información conceptual

```text
identificadorSeguro
emailDestino : Email
rolPropuesto : Rol
estado : EstadoInvitacion
fechaEmision
vigencia
```

## 14.3. Estados

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

## 14.4. Emisión válida

Una nueva invitación debe cumplir:

```text
emisor
→ UsuarioNegocio ACTIVO

emisor.rol
→ PROPIETARIO

emisor.negocio
=
invitacion.negocio

rolPropuesto
∈
{ENCARGADO, TRABAJADOR}

estado inicial
=
PENDIENTE
```

---

# 15. Aceptación de Invitaciones

La operación:

```text
aceptarPara(email)
```

debe validar internamente:

```text
estado = PENDIENTE
+
vigente
+
email = emailDestino
```

No debe depender únicamente de una llamada previa como:

```text
puedeSerAceptadaPor(email)
```

La operación mutadora es responsable de garantizar su propia validez.

`aceptarPara(email)` modifica conceptualmente:

```text
InvitacionNegocio.estado
PENDIENTE → ACEPTADA
```

No crea directamente un `UsuarioNegocio`.

---

# 16. Coordinación del Caso de Uso de Aceptación

Aceptar una invitación completa requiere coordinar:

```text
InvitacionNegocio
+
Negocio
+
Usuario
```

Conceptualmente:

```text
1. validar InvitacionNegocio
2. marcar InvitacionNegocio como ACEPTADA
3. incorporar o reactivar UsuarioNegocio
```

La operación completa debe ser atómica:

```text
Invitación ACEPTADA
+
Membresía creada/reactivada
```

o:

```text
ninguna modificación confirmada
```

Nunca debe persistirse:

```text
Invitación ACEPTADA
+
membresía no creada/reactivada
```

Este documento no define todavía cómo se implementará técnicamente esa atomicidad.

La decisión podrá involucrar posteriormente:

```text
Service Layer
Unit of Work
transacción de base de datos
```

pero dichas decisiones corresponden a Arquitectura.

---

# 17. Canal de Distribución de Invitaciones

WhatsApp no forma parte de `InvitacionNegocio`.

Conceptualmente:

```text
InvitacionNegocio
        ↓
enlace seguro
        │
        ├── compartir por WhatsApp
        ├── copiar enlace
        └── otros canales futuros
```

La identidad del destinatario continúa siendo:

```text
emailDestino
```

El número telefónico no identifica la invitación.

---

# 18. Preparación Progresiva del Negocio

M01 puede determinar qué configuraciones faltan para utilizar determinadas funcionalidades.

Sin embargo:

```text
Preparación
≠
estado persistido rígido
```

No debe crearse automáticamente un enum como:

```text
EstadoPreparacion
INCOMPLETO
LISTO
```

salvo que una decisión posterior modifique explícitamente el dominio.

La preparación se deriva a partir de configuraciones existentes.

M01 tampoco debe crear datos ficticios de otros módulos, por ejemplo:

```text
"Local Principal"
"Efectivo"
"Producto inicial"
```

únicamente para marcar una configuración como completa.

---

# 19. Permisos

M01 define:

```text
Usuario
+
Negocio
+
UsuarioNegocio
+
Rol contextual
```

Cada módulo funcional determina posteriormente:

```text
qué operaciones concretas
puede realizar ese Rol
```

Ejemplo:

```text
ENCARGADO

M02 — Catálogo
├── consultar                  Sí
├── activar/desactivar         Sí
├── editar                     No
├── modificar precio base      No
└── administrar categorías     No
```

Por lo tanto, el Diagrama 2 no debe generar ni asumir:

```text
Entidad Permiso
Tabla Permiso
RolPermiso
RBAC dinámico
```

para el MVP.

---

# 20. Contexto Autorizado

Toda operación perteneciente a un Negocio requiere conceptualmente:

```text
Usuario autenticado
+
Negocio identificado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso específico del módulo
```

Este diagrama expresa la estructura que permite resolver ese contexto.

No define todavía:

```text
header HTTP
JWT claim
middleware
dependency injection
RequestContext
```

---

# 21. Cómo Debe Utilizar este Diagrama una IA

Una IA que utilice este artefacto para diseñar o implementar M01 debe:

1. Leer primero la especificación funcional de M01.
2. Leer el Modelo de Dominio del Bloque 1.
3. Leer este documento.
4. Utilizar el `.puml` como representación visual.
5. Respetar las cardinalidades.
6. Respetar las invariantes.
7. No mover el Rol desde `UsuarioNegocio` hacia `Usuario`.
8. No permitir mutaciones directas de membresía que salteen las reglas de `Negocio`.
9. No duplicar membresías históricas.
10. No permitir incorporación inicial como `PROPIETARIO`.
11. No acoplar InvitacionNegocio a WhatsApp.
12. No crear membresías desde `InvitacionNegocio` directamente.
13. Preservar atomicidad cuando un Caso de Uso afecta múltiples entidades.
14. Diferenciar validaciones de dominio de validaciones técnicas.
15. No asumir patrones de arquitectura todavía no decididos.
16. No convertir notas conceptuales en columnas o tablas automáticamente.
17. No introducir nuevos estados sin revisar primero la especificación funcional.

---

# 22. Qué NO Debe Inferir una IA

A partir del UML no debe concluirse automáticamente que:

```text
Negocio es obligatoriamente Aggregate Root
UsuarioNegocio debe persistirse dentro de la misma tabla
InvitacionNegocio pertenece al mismo agregado técnico
debe usarse UUID
debe existir Repository por entidad
debe existir Domain Event
debe existir Factory
debe existir UnitOfWork
debe utilizarse JWT
debe utilizarse SQLAlchemy
```

Estas decisiones permanecen abiertas.

Tampoco debe suponerse:

```text
estado de Negocio = ACTIVO / INACTIVO
```

porque el ciclo de vida del Negocio todavía no está definido para el Bloque 1.

---

# 23. Implicancias para la Implementación Futura

Cuando se llegue a implementación, el diseño deberá garantizar al menos:

## Membresías

```text
unicidad conceptual Usuario + Negocio
```

## Propietarios

```text
nunca dejar un Negocio activo
sin PROPIETARIO activo
```

## Invitaciones

```text
email estricto
estado válido
vigencia
rol inicial permitido
emisor autorizado
mismo Negocio
```

## Incorporación

```text
crear
o
reactivar
pero nunca duplicar
```

## Aceptación

```text
Invitación + membresía
consistentes transaccionalmente
```

## Aislamiento

```text
una membresía de Negocio A
no autoriza operaciones en Negocio B
```

---

# 24. Tests Derivables del Diagrama

Este artefacto debe permitir posteriormente derivar como mínimo pruebas para:

1. crear Usuario sin Negocio;
2. crear Negocio con propietario inicial;
3. impedir Negocio recién creado sin propietario;
4. permitir múltiples propietarios;
5. impedir desactivar último propietario;
6. impedir degradar último propietario;
7. promover un miembro a propietario;
8. desactivar una membresía sin afectar Usuario;
9. desactivar una membresía sin afectar otros Negocios;
10. reactivar una membresía histórica;
11. impedir duplicación Usuario + Negocio;
12. rechazar reincorporación si la membresía ya está activa;
13. emitir invitación únicamente como Propietario activo;
14. impedir invitación con rol inicial PROPIETARIO;
15. impedir invitación para otro Negocio usando una membresía emisora;
16. aceptar invitación solo si está PENDIENTE;
17. impedir aceptar invitación expirada;
18. impedir aceptar invitación destinada a otro email;
19. crear membresía al aceptar si no existe;
20. reactivar membresía al aceptar si estaba inactiva;
21. conservar atomicidad entre aceptación e incorporación.

La estrategia exacta de tests se definirá posteriormente.

---

# 25. Relación con los Próximos Diagramas

Este diagrama describe **estructura estática y responsabilidades**.

No debe intentar sustituir diagramas dinámicos posteriores.

Los siguientes artefactos complementarán esta vista:

```text
04-m01-estados-invitacion.puml
→ ciclo de vida de InvitacionNegocio

05-m01-estados-membresia.puml
→ ciclo de vida de UsuarioNegocio

secuencias/01-aceptar-invitacion.puml
→ coordinación dinámica del caso de uso
```

Esto permite separar:

```text
estructura
≠
estado
≠
secuencia
```

y evita sobrecargar un único diagrama.

---

# 26. Criterios de Aceptación del Diagrama 2

El Diagrama 2 puede considerarse válido cuando:

1. Usuario representa identidad global.
2. Usuario puede tener 0..N membresías.
3. UsuarioNegocio representa la relación Usuario–Negocio.
4. Rol pertenece a UsuarioNegocio.
5. EstadoMembresia está limitado a ACTIVO / INACTIVO.
6. Existe una única membresía conceptual por Usuario + Negocio.
7. La reincorporación reutiliza la membresía histórica.
8. UsuarioNegocio no permite saltarse la regla del último propietario.
9. Negocio protege la existencia de un propietario activo.
10. Crear Negocio incluye su propietario inicial.
11. Promover a propietario es una acción explícita.
12. La incorporación inicial no acepta PROPIETARIO.
13. Una membresía activa no se duplica al reincorporar.
14. InvitacionNegocio posee ciclo de vida propio.
15. InvitacionNegocio se vincula por email.
16. Solo PENDIENTE + vigente puede aceptarse.
17. El email autenticado debe coincidir con emailDestino.
18. El emisor pertenece al mismo Negocio.
19. El emisor debe ser Propietario activo.
20. rolPropuesto inicial solo admite ENCARGADO / TRABAJADOR.
21. WhatsApp no forma parte del dominio de identidad.
22. InvitacionNegocio no crea directamente UsuarioNegocio.
23. La aceptación completa exige coordinación transaccional.
24. Modalidades poseen cardinalidad 1..N.
25. Moneda base del MVP es ARS.
26. Preparación del Negocio es derivada.
27. No existe RBAC dinámico en el MVP.
28. Permisos concretos permanecen bajo responsabilidad de cada módulo.
29. No se introduce infraestructura técnica en el modelo.
30. Las decisiones arquitectónicas abiertas permanecen explícitamente abiertas.

---

# 27. Estado del Artefacto

Una vez aprobado:

```text
BLOQUE 1 — FUNDACIÓN

Modelo de Dominio
├── 01 — Mapa General                         ✅ CONGELADO
├── 02 — M01 Organización — Clases           ✅ CONGELADO
└── 03 — M02 Catálogo — Clases               ⏳ SIGUIENTE
```

Este documento y el diagrama asociado constituyen una referencia conceptual congelada para las etapas posteriores.

Cualquier modificación futura que altere:

- entidades;
- cardinalidades;
- estados;
- invariantes;
- responsabilidades;
- restricciones de roles;

deberá actualizar primero la documentación funcional correspondiente y luego regenerar los artefactos de dominio.

---

# 28. Criterio Rector

El criterio rector del Diagrama 2 es:

> **M01 debe permitir que una persona participe de uno o varios Negocios con roles contextuales, preservando la historia de sus membresías y garantizando que las invariantes organizacionales no puedan romperse mediante mutaciones aisladas.**

En particular:

```text
Usuario
→ identidad global

UsuarioNegocio
→ membresía + Rol contextual

Negocio
→ reglas que requieren contexto organizacional

InvitacionNegocio
→ propuesta y ciclo de incorporación

Caso de Uso
→ coordinación entre entidades

Arquitectura
→ implementación técnica de esa coordinación
```

El UML debe ser utilizado como una representación visual de estas responsabilidades, no como una especificación automática de clases de persistencia.
