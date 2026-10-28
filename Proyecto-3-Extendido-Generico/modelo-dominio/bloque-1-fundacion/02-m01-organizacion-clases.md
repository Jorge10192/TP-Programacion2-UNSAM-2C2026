# 02 — M01 Organización del Negocio — Guía de Interpretación del Diagrama de Clases

## 1. Propósito del Documento

Este documento acompaña al diagrama:

```text
02-m01-organizacion-clases.puml
```

y a su representación visual:

```text
02-m01-organizacion-clases.png
```

Su objetivo es permitir que una persona, desarrollador, arquitecto o modelo de IA interprete correctamente el **Diagrama 2 — M01 Organización del Negocio**, sin confundir el modelo conceptual con decisiones técnicas todavía no tomadas.

Este documento:

- explica el propósito del diagrama;
- define cómo debe leerse;
- identifica responsabilidades de cada entidad;
- explicita invariantes que condicionan futuras implementaciones;
- diferencia comportamiento local, guardias contextuales y coordinación de Casos de Uso;
- documenta qué conclusiones pueden extraerse del UML;
- documenta qué conclusiones NO deben inferirse;
- sirve como puente entre la especificación funcional de M01 y Arquitectura, Modelo Relacional, API e implementación;
- se encuentra sincronizado con el ciclo de vida definido en el Diagrama 4 de `InvitacionNegocio`.

Este documento no reemplaza:

```text
modulos/M01-organizacion-negocio.md
```

ni:

```text
01-modelo-dominio-bloque-1.md
```

---

# 2. Ubicación dentro de la Documentación

Estructura relevante:

```text
Proyecto-3-Extendido-Generico/
└── modelo-dominio/
    └── bloque-1-fundacion/
        ├── 01-modelo-dominio-bloque-1.md
        ├── 01-diagrama-general.puml
        ├── 01-diagrama-general.png
        ├── 02-m01-organizacion-clases.md
        ├── 02-m01-organizacion-clases.puml
        ├── 02-m01-organizacion-clases.png
        ├── 03-m02-catalogo-clases.md
        ├── 03-m02-catalogo-clases.puml
        ├── 03-m02-catalogo-clases.png
        ├── 04-m01-estados-invitacion.md
        ├── 04-m01-estados-invitacion.puml
        └── 04-m01-estados-invitacion.png
```

Este archivo:

```text
02-m01-organizacion-clases.md
```

es la guía semántica del Diagrama 2.

---

# 3. Fuentes de Verdad

Para interpretar o implementar M01 debe respetarse:

```text
1. modulos/M01-organizacion-negocio.md

2. modelo-dominio/bloque-1-fundacion/
   01-modelo-dominio-bloque-1.md

3. modelo-dominio/bloque-1-fundacion/
   02-m01-organizacion-clases.md

4. modelo-dominio/bloque-1-fundacion/
   02-m01-organizacion-clases.puml

5. Para ciclo de vida específico de InvitacionNegocio:
   04-m01-estados-invitacion.md
   04-m01-estados-invitacion.puml

6. ADRs / Arquitectura

7. Modelo Relacional

8. Contrato API

9. Implementación
```

El Diagrama 4 es una vista dinámica especializada.

No modifica silenciosamente el modelo estático; lo complementa.

Si dos artefactos de dominio se contradicen:

```text
NO elegir silenciosamente uno.
NO corregir desde el código.
NO considerar la implementación como fuente superior.
```

La contradicción debe resolverse primero en documentación.

---

# 4. Objetivo del Diagrama 2

El Diagrama 2 detalla exclusivamente:

```text
M01 — Organización del Negocio
```

Debe permitir responder:

```text
¿Qué entidades participan en M01?

¿Cómo se relacionan Usuario y Negocio?

¿Dónde vive el Rol?

¿Cómo se conserva la membresía histórica?

¿Quién protege la existencia del último Propietario?

¿Qué información pertenece a InvitacionNegocio?

¿Qué invariantes puede proteger cada entidad por sí misma?

¿Qué reglas requieren contexto externo?

¿Qué coordinación pertenece al Caso de Uso?

¿Qué decisiones siguen abiertas para Arquitectura?
```

Es una vista de:

```text
estructura
+
responsabilidades
+
invariantes estáticas principales
```

No intenta sustituir:

```text
máquinas de estados
secuencias
ADRs
modelo relacional
```

---

# 5. Alcance

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

Representa:

- cardinalidades;
- identidad conceptual;
- responsabilidades;
- comportamiento relevante;
- invariantes;
- fronteras de responsabilidad;
- restricciones del MVP.

---

# 6. Fuera de Alcance

El Diagrama 2 NO define:

```text
tablas
foreign keys
columnas SQL
UUID
ULID
índices
constraints
SQLAlchemy
Pydantic
FastAPI
endpoints
JWT
cookies
sesiones
middleware
RequestContext
Repository
Unit of Work
Domain Events
Factories
locking
nivel de aislamiento
cron
scheduler
hashes
OAuth
MFA
```

Tampoco define formalmente:

```text
Aggregate Roots
límites técnicos de agregados
estrategia de transacciones
estrategia de concurrencia
navegabilidad ORM
cascadas
```

---

# 7. Criterios Generales de Lectura

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
membresía contextual
+
Rol
+
EstadoMembresia
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

Un mismo Usuario puede tener roles diferentes en distintos Negocios.

---

# 8. Identidad de Dominio

Las entidades:

```text
Usuario
UsuarioNegocio
Negocio
InvitacionNegocio
```

poseen identidad conceptual estable.

No debe asumirse que sus claves funcionales son su identidad técnica.

Ejemplos:

```text
Usuario.email
≠ necesariamente PK

InvitacionNegocio.emailDestino
≠ identidad

identificadorSeguro
≠ necesariamente PK interna
```

La estrategia concreta:

```text
UUID
ULID
integer
token aleatorio
otro mecanismo
```

permanece abierta.

---

# 9. Entidad `Usuario`

## 9.1. Responsabilidad

`Usuario` representa la identidad global de una persona dentro de la plataforma.

Puede existir:

```text
sin Negocio
con un Negocio
con varios Negocios
```

## 9.2. Información conceptual

```text
identidad
nombre
email : Email
estadoCuenta
fechaRegistro
```

## 9.3. Regla principal

Desactivar:

```text
UsuarioNegocio
ACTIVO → INACTIVO
```

no debe:

- desactivar la cuenta global;
- afectar otras membresías;
- eliminar al Usuario;
- modificar historia.

## 9.4. Frontera con IAM

No incorporar automáticamente a `Usuario`:

```text
password
passwordHash
JWT
refreshToken
OAuth token
MFA secret
session
```

M01 requiere funcionalmente autenticación.

La implementación de identidad/credenciales pertenece a Arquitectura/IAM.

---

# 10. Value Object `Email`

`Email` representa la identidad funcional por correo utilizada por:

```text
Usuario
InvitacionNegocio
```

Debe existir una única semántica de equivalencia para:

```text
registro
login
invitaciones
búsquedas
restricciones
```

No distribuir por distintas capas lógica inconsistente como:

```text
lower()
trim()
comparación case-sensitive
comparación case-insensitive
```

sin una decisión común.

El modelo NO introduce atributos de dominio como:

```text
emailNormalizado
canonicalEmail
lowerEmail
```

La proyección técnica necesaria para índices o búsquedas se definirá posteriormente.

---

# 11. Entidad `UsuarioNegocio`

## 11.1. Responsabilidad

Representa la participación de un Usuario dentro de un Negocio.

Contiene:

```text
rol : Rol
estado : EstadoMembresia
fechaIncorporacion
```

## 11.2. Estados

Únicamente:

```text
ACTIVO
INACTIVO
```

No inventar:

```text
PENDIENTE
SUSPENDIDO
BLOQUEADO
ELIMINADO
```

## 11.3. Membresía histórica única

Para:

```text
Usuario + Negocio
```

existe una única membresía histórica.

Una reincorporación:

```text
NO crea otra UsuarioNegocio.
```

Reutiliza:

```text
INACTIVO → ACTIVO
```

con el rol indicado por la nueva incorporación.

## 11.4. Consultas locales

Puede responder:

```text
estaActiva()
esPropietario()
```

## 11.5. Mutaciones

No expone públicamente:

```text
cambiarRol()
desactivar()
reactivar()
```

cuando la operación pueda violar una invariante que depende del conjunto de miembros del Negocio.

---

# 12. Entidad `Negocio`

## 12.1. Responsabilidad

Representa la organización/emprendimiento administrado por la plataforma.

Información conceptual:

```text
identidad
nombre
rubro opcional
monedaBase
modalidades
```

No posee en Bloque 1:

```text
estado : EstadoNegocio
```

ni un ciclo administrativo formal.

## 12.2. Modalidades

Debe poseer:

```text
1..N ModalidadOperativa
```

Valores:

```text
REVENTA
PRODUCCION
SERVICIOS
```

Las modalidades:

```text
adaptan UX
orientan onboarding
priorizan navegación
```

pero no bloquean rígidamente el dominio.

## 12.3. Moneda

MVP:

```text
ARS
```

No se define todavía cambio de moneda base.

## 12.4. Invariante del Propietario

Todo Negocio existente debe conservar:

```text
>= 1 UsuarioNegocio
estado = ACTIVO
rol = PROPIETARIO
```

Mientras no exista `EstadoNegocio`, no utilizar:

```text
"Negocio activo"
```

como si fuera un estado formal.

## 12.5. Operaciones que protegen la invariante

```text
desactivarMiembro(...)
cambiarRolMiembro(...)
```

deben comprobar la invariante dentro de la operación que confirma la mutación.

No utilizar solamente:

```text
if puedeDesactivar():
    cambiar_estado_directamente()
```

## 12.6. Incorporar o reactivar

La operación conceptual queda sincronizada con la secuencia de aceptación:

```text
incorporarOReactivarMiembro(
    usuario : Usuario,
    rolInicial : Rol,
    membresiaHistorica : UsuarioNegocio [0..1]
) : UsuarioNegocio
```

Separación de responsabilidades:

```text
Application
→ consulta la membresía histórica mediante persistencia
→ entrega usuario + rolInicial + membresiaHistorica opcional

Negocio
→ NO consulta repositories
→ protege las invariantes de incorporación/reactivación
```

Caso A:

```text
membresiaHistorica = null
→ crear exactamente una UsuarioNegocio ACTIVA
→ rol = rolInicial
```

Caso B:

```text
membresiaHistorica.estado = INACTIVO
→ reutilizar la MISMA membresía histórica
→ ACTIVA
→ rol = rolInicial
```

Caso C:

```text
membresiaHistorica.estado = ACTIVO
→ rechazar
→ no duplicar
→ no cambiar rol silenciosamente
```

Si se proporciona `membresiaHistorica`, `Negocio` debe revalidar que corresponda al mismo `Usuario` y al mismo `Negocio`.

El rol inicial permitido usa una whitelist cerrada:

```text
{ ENCARGADO, TRABAJADOR }
```

No implementar únicamente `rolInicial != PROPIETARIO`, porque una futura ampliación del enum podría habilitar roles no previstos.

La promoción continúa siendo explícita:

```text
cambiarRolMiembro(miembro, PROPIETARIO)
```

---

# 13. Creación de Negocio

Crear Negocio implica funcionalmente:

```text
Negocio
+
UsuarioNegocio del creador
estado = ACTIVO
rol = PROPIETARIO
```

Todo debe confirmarse como una única operación funcional.

Nunca debe quedar:

```text
Negocio creado
+
sin PROPIETARIO ACTIVO
```

Este documento no decide si la coordinación será:

```text
Factory
Application Service
Domain Service
Aggregate Root
```

---

# 14. Entidad `InvitacionNegocio`

## 14.1. Responsabilidad

Representa una propuesta formal para incorporar una persona a un Negocio.

No representa:

- mensaje de WhatsApp;
- contacto telefónico;
- membresía;
- Usuario;
- sesión;
- autorización.

## 14.2. Información conceptual

```text
identificadorSeguro
emailDestino : Email
rolPropuesto : Rol
estado : EstadoInvitacion
fechaEmision
fechaExpiracion
```

Las relaciones estructurales indican además:

```text
Negocio
emisor : UsuarioNegocio
```

## 14.3. Estados

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

El detalle del ciclo de vida pertenece al:

```text
04-m01-estados-invitacion.md
04-m01-estados-invitacion.puml
```

---

# 15. Tiempo y Vigencia

## 15.1. Regla temporal

Conceptualmente:

```text
estaVigente(ahora)
⇔
ahora < fechaExpiracion
```

Por lo tanto:

```text
ahora == fechaExpiracion
→ no vigente
```

## 15.2. `PENDIENTE` no implica vigencia

Puede existir:

```text
estado = PENDIENTE
+
estaVigente(ahora) = false
```

si la expiración se materializa de forma diferida.

No crear un estado adicional para representar este caso.

## 15.3. `fechaExpiracion`

Se fija al emitir.

Debe cumplir:

```text
fechaExpiracion > fechaEmision
```

Cambiar posteriormente la política general de duración NO modifica invitaciones ya emitidas.

## 15.4. Tiempo en implementación

La futura implementación debería obtener un único:

```text
ahora
```

coherente por operación.

No distribuir múltiples lecturas del reloj dentro de una misma decisión de dominio.

No se define todavía la abstracción técnica de `Clock`.

---

# 16. Emisión de InvitacionNegocio

Una nueva invitación comienza en:

```text
PENDIENTE
```

Guardias contextuales:

```text
emisor ACTIVO
+
emisor PROPIETARIO
+
emisor del mismo Negocio
+
rolPropuesto ∈ {ENCARGADO, TRABAJADOR}
+
destinatario sin membresía ACTIVA
+
sin otra PENDIENTE vigente equivalente
```

Estas reglas requieren información exterior a una instancia aislada de `InvitacionNegocio`.

No implementar dentro de la entidad:

```text
repository.buscarMembresia(...)
repository.buscarInvitaciones(...)
```

---

# 17. Unicidad de Invitaciones

Regla funcional:

```text
máximo una PENDIENTE y vigente
por Negocio + Email funcionalmente equivalente
```

Una preconsulta de UX no constituye garantía definitiva.

La operación de emisión debe volver a garantizar la condición al confirmar.

La persistencia deberá proporcionar una última línea de defensa ante concurrencia.

La solución concreta se define en Arquitectura/Modelo Relacional.

---

# 18. PENDIENTE Vencida y Nueva Emisión

Si existe:

```text
PENDIENTE
+
no vigente
```

no debe bloquear permanentemente una nueva invitación.

Conceptualmente:

```text
1. localizar PENDIENTE equivalente;
2. evaluar vigencia;
3. si venció: materializar EXPIRADA;
4. revalidar unicidad;
5. emitir nueva PENDIENTE.
```

La operación debe mantener consistencia frente a concurrencia.

No se prescribe aquí SQL ni locking.

---

# 19. Reenvío

Reenviar:

```text
NO crea otra InvitacionNegocio
NO cambia estado
NO cambia rolPropuesto
NO extiende fechaExpiracion
```

No modelar:

```text
PENDIENTE → PENDIENTE
```

como transición.

Si se desea:

```text
nuevo rol
o
nueva ventana temporal
```

la operación conceptual es:

```text
cancelar/expirar la anterior
+
emitir una nueva
```

---

# 20. Aceptación

## 20.1. Consulta local

Puede existir:

```text
puedeSerAceptadaPor(email, ahora)
```

que compruebe:

```text
estado = PENDIENTE
+
estaVigente(ahora)
+
Email equivalente
```

Es útil para:

```text
UX
diagnóstico
```

pero:

```text
NO es autorización definitiva
```

## 20.2. Comando

```text
aceptarPara(email, ahora)
```

debe volver a validar sus invariantes locales.

No confiar en un resultado anterior de `puedeSerAceptadaPor`.

## 20.3. Guardia contextual adicional

Antes de confirmar, el Caso de Uso revalida:

```text
Usuario sin UsuarioNegocio ACTIVO
en ese Negocio
```

Si ya existe membresía ACTIVA:

```text
NO aceptar
NO cambiar rol
NO duplicar membresía
```

---

# 21. Coordinación de Aceptación

`InvitacionNegocio` NO crea directamente `UsuarioNegocio`.

El Caso de Uso coordina:

```text
InvitacionNegocio
PENDIENTE → ACEPTADA

+

Negocio.incorporarOReactivarMiembro(...)
```

Resultado válido:

```text
ACEPTADA
+
membresía creada/reactivada con rolPropuesto
```

o:

```text
ninguna modificación confirmada
```

No debe quedar:

```text
ACEPTADA
+
sin membresía correspondiente
```

La forma técnica de atomicidad se define posteriormente.

---

# 22. Rechazo

Operación conceptual:

```text
rechazarPara(email, ahora)
```

debe validar:

```text
estado = PENDIENTE
+
estaVigente(ahora)
+
Email equivalente
```

Resultado:

```text
RECHAZADA
```

No crea ni modifica membresías.

---

# 23. Cancelación

Operación local:

```text
cancelar()
```

debe proteger:

```text
estado = PENDIENTE
```

No exige:

```text
estaVigente(ahora)
```

La autorización:

```text
UsuarioNegocio ACTIVO
+
PROPIETARIO
+
mismo Negocio
```

es una guardia contextual del Caso de Uso.

Por lo tanto una:

```text
PENDIENTE + no vigente
```

puede ser CANCELADA mientras EXPIRADA todavía no haya sido confirmada.

---

# 24. Expiración

Operación conceptual:

```text
expirar(ahora)
```

requiere:

```text
estado = PENDIENTE
+
ahora >= fechaExpiracion
```

Resultado:

```text
EXPIRADA
```

No implica:

```text
cron
scheduler
background worker
```

La materialización técnica queda abierta.

---

# 25. Estados Terminales

Son terminales:

```text
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

No permitir:

```text
EXPIRADA → ACEPTADA
RECHAZADA → ACEPTADA
CANCELADA → PENDIENTE
ACEPTADA → CANCELADA
```

Una nueva propuesta futura genera otra `InvitacionNegocio`.

---

# 26. Guardias Locales vs. Contextuales

## 26.1. Locales

Puede proteger `InvitacionNegocio`:

```text
estado
fechaExpiracion
vigencia
Email destino
transición permitida
```

## 26.2. Contextuales

Requieren coordinación externa:

```text
emisor autorizado
pertenencia al Negocio
otra invitación PENDIENTE
membresía ACTIVA del destinatario
creación/reactivación de UsuarioNegocio
unicidad contextual
```

Separar estas responsabilidades evita:

```text
entidad con repositories
```

sin convertirla en:

```text
modelo anémico con setters de estado
```

---

# 27. Concurrencia y TOCTOU

Las siguientes operaciones son sensibles:

```text
dos emisiones equivalentes
aceptación vs incorporación paralela
dos aceptaciones
cancelación vs expiración
desactivar/degradar último Propietario
```

No confiar únicamente en:

```text
consultar
↓
esperar
↓
guardar
```

Las guardias relevantes deben volver a garantizarse al confirmar.

La estrategia:

```text
constraints
transacción
locking
optimistic concurrency
otra
```

se define posteriormente.

---

# 28. Identificador Seguro

`identificadorSeguro` debe ser impredecible.

No utilizar solamente:

```text
id incremental
email
negocio id predecible
```

como credencial pública.

Poseer el enlace:

```text
NO equivale a estar autorizado.
```

La aceptación requiere también:

```text
Usuario autenticado
+
Email coincidente
+
invitación aceptable
```

No se decide todavía:

```text
UUID
token aleatorio
hash almacenado
rotación
```

---

# 29. Canal de Distribución

Los canales:

```text
WhatsApp
email
copiar enlace
otro canal
```

son externos al ciclo de vida.

No agregar estados:

```text
ENVIADA
REENVIADA
ENVIADA_POR_WHATSAPP
```

---

# 30. Preparación Progresiva del Negocio

La preparación:

```text
es derivada
```

y no un enum persistido obligatorio.

No crear automáticamente:

```text
EstadoPreparacion
INCOMPLETO
LISTO
```

M01 tampoco debe inventar entidades de otros módulos para marcar el Negocio como preparado.

---

# 31. Permisos

M01 define:

```text
Usuario
Negocio
UsuarioNegocio
Rol
```

Cada módulo define los permisos concretos correspondientes.

No crear durante el MVP:

```text
Permiso
RolPermiso
RBAC dinámico
```

salvo nueva decisión funcional.

---

# 32. Contexto Autorizado

Toda operación de Negocio requiere conceptualmente:

```text
Usuario autenticado
+
Negocio autorizado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso concreto
```

No se define aquí cómo se transporta técnicamente este contexto.

---

# 33. Métodos UML no son Endpoints

No interpretar:

```text
Negocio.desactivarMiembro()
```

como obligación de crear:

```http
POST /negocio/desactivar-miembro
```

ni:

```text
InvitacionNegocio.aceptarPara()
```

como endpoint automático.

Los métodos expresan responsabilidad de dominio.

El contrato API se diseñará después.

---

# 34. Métodos UML no son necesariamente Exhaustivos

El UML muestra operaciones relevantes para invariantes.

La ausencia de una operación trivial no implica necesariamente inmutabilidad.

Las excepciones explícitas sí deben respetarse.

Ejemplo:

```text
rolPropuesto de una invitación emitida
NO se edita silenciosamente
```

porque existe una regla funcional específica:

```text
cancelar + emitir nueva
```

---

# 35. Implicancias para Modelo Relacional

La futura persistencia deberá garantizar, entre otras:

```text
Usuario.email globalmente único
Usuario + Negocio históricamente único
Negocio con >=1 Propietario ACTIVO
invitaciones equivalentes sin duplicación concurrente
integridad del emisor y Negocio
```

No se define aquí:

```text
DDL
índices concretos
FK exactas
enum SQL
cascadas
```

---

# 36. Implicancias para API

Evitar mutaciones libres:

```http
PATCH /invitaciones/{id}
{"estado":"ACEPTADA"}
```

si eso omite el Caso de Uso y las invariantes.

La API futura debería expresar acciones de negocio:

```text
emitir
aceptar
rechazar
cancelar
reenviar
```

La forma HTTP concreta queda abierta.

---

# 37. Implicancias para Frontend

El frontend puede:

- ocultar acciones inválidas;
- mostrar expiración;
- ofrecer reenvío;
- informar que ya existe una invitación;
- orientar al cambio de rol desde gestión de miembros.

Pero:

```text
frontend
≠
única capa de validación
```

El backend/dominio debe volver a validar.

---

# 38. Cómo Debe Utilizar este Diagrama una IA

Una IA debe:

1. leer M01 funcional;
2. leer `01-modelo-dominio-bloque-1.md`;
3. leer esta guía;
4. leer el `.puml`;
5. consultar el Diagrama 4 para ciclo de vida de invitaciones;
6. respetar cardinalidades;
7. mantener Rol en `UsuarioNegocio`;
8. preservar membresía histórica única;
9. no permitir mutaciones directas que salteen reglas de `Negocio`;
10. no introducir `EstadoNegocio`;
11. no incorporar inicialmente PROPIETARIO por invitación;
12. diferenciar `PENDIENTE` de vigencia;
13. utilizar `fechaExpiracion`;
14. revalidar tiempo e identidad en aceptar/rechazar;
15. no extender expiración al reenviar;
16. no modificar rolPropuesto en línea;
17. revalidar membresía ACTIVA al aceptar;
18. no crear membresía desde `InvitacionNegocio`;
19. preservar atomicidad funcional de la aceptación;
20. separar guardias locales/contextuales;
21. no consultar repositories desde entidades;
22. proteger concurrencia;
23. no inferir infraestructura no aprobada.

---

# 39. Qué NO Debe Inferir una IA

No inferir automáticamente:

```text
Negocio es Aggregate Root
InvitacionNegocio es Aggregate Root
Repository por entidad
Unit of Work
Domain Events
Factories
Event Sourcing
CQRS
microservicios
JWT
SQLAlchemy
UUID
cron
scheduler
Clock dentro de la entidad
EstadoNegocio
RBAC dinámico
```

Tampoco:

```text
1 clase UML = 1 tabla
1 método = 1 endpoint
1 enum = enum SQL
```

---

# 40. Errores de Implementación a Evitar

No hacer:

```text
Usuario.rol

UsuarioNegocio.activo : Boolean

Negocio.estado = ACTIVO

InvitacionNegocio.vigencia

invitacion.estado = ACEPTADA desde Application Service

repository dentro de InvitacionNegocio

aceptar sin revalidar vigencia

rechazar una invitación vencida

cancelar exigiendo vigencia

reenviar creando otra InvitacionNegocio

reenviar extendiendo fechaExpiracion

editar rolPropuesto de una invitación ya emitida

crear segunda UsuarioNegocio para reincorporación

usar invitación para cambiar rol de miembro ACTIVO

confiar solo en una prevalidación de UI
```

---

# 41. Tests Derivables — Usuario y Negocio

Como mínimo:

1. crear Usuario sin Negocio;
2. crear Negocio con Propietario inicial;
3. impedir creación inconsistente sin Propietario;
4. permitir múltiples Propietarios;
5. impedir desactivar último Propietario;
6. impedir degradar último Propietario;
7. promover miembro a Propietario;
8. desactivar membresía sin afectar Usuario;
9. desactivar membresía sin afectar otros Negocios;
10. reactivar membresía histórica;
11. impedir duplicación Usuario + Negocio;
12. rechazar incorporación cuando membresía ya está ACTIVA.

---

# 42. Tests Derivables — Emisión de Invitaciones

13. emitir solo como PROPIETARIO ACTIVO;
14. impedir emisión desde membresía INACTIVA;
15. impedir emisión desde otro Negocio;
16. impedir rolPropuesto PROPIETARIO;
17. impedir emisión para miembro ACTIVO;
18. impedir segunda PENDIENTE vigente equivalente;
19. PENDIENTE vencida equivalente puede materializarse EXPIRADA y permitir nueva emisión;
20. fechaExpiracion > fechaEmision;
21. cambio de política futura no modifica fechaExpiracion existente.

---

# 43. Tests Derivables — Tiempo

22. `ahora < fechaExpiracion` → vigente;
23. `ahora == fechaExpiracion` → no vigente;
24. `ahora > fechaExpiracion` → no vigente;
25. PENDIENTE puede estar no vigente sin introducir estado adicional.

---

# 44. Tests Derivables — Aceptación

26. aceptar PENDIENTE vigente y destinatario correcto;
27. impedir aceptar no PENDIENTE;
28. impedir aceptar vencida;
29. impedir aceptar con Email distinto;
30. crear membresía si no existe;
31. reactivar membresía INACTIVA;
32. reactivar con `rolPropuesto`;
33. impedir aceptar si se volvió miembro ACTIVO;
34. impedir duplicación de membresía;
35. mantener atomicidad aceptación + membresía.

---

# 45. Tests Derivables — Rechazo, Cancelación y Expiración

36. rechazar PENDIENTE vigente con identidad correcta;
37. impedir rechazar vencida;
38. impedir rechazo con identidad incorrecta;
39. cancelar PENDIENTE vigente por Propietario;
40. cancelar PENDIENTE vencida mientras siga PENDIENTE;
41. impedir cancelación no autorizada;
42. expirar PENDIENTE no vigente;
43. impedir expirar PENDIENTE todavía vigente;
44. impedir transiciones desde estados terminales.

---

# 46. Tests Derivables — Reenvío

45. reenviar utiliza la misma InvitacionNegocio;
46. reenviar conserva identificador lógico;
47. reenviar conserva rolPropuesto;
48. reenviar conserva fechaExpiracion;
49. múltiples reenvíos no crean múltiples invitaciones;
50. cambiar rol implica cancelar + emitir nueva.

---

# 47. Tests Derivables — Concurrencia

51. dos emisiones equivalentes concurrentes → máximo una PENDIENTE confirmada;
52. aceptar vs incorporación paralela → sin duplicación ni cambio silencioso de rol;
53. dos aceptaciones simultáneas → una sola incorporación;
54. cancelar vs expirar → una sola transición confirmada;
55. dos operaciones sobre último Propietario → nunca dejan cero Propietarios ACTIVOS.

---

# 48. Relación con Diagramas Dinámicos

Este diagrama representa:

```text
estructura
+
responsabilidades
```

El ciclo de vida de invitaciones está especificado por:

```text
04-m01-estados-invitacion.md
04-m01-estados-invitacion.puml
```

El siguiente diagrama dinámico será:

```text
05-m01-estados-membresia.puml
```

Luego:

```text
06-m02-estados-articulo.puml
```

Y las secuencias mostrarán coordinación dinámica de Casos de Uso.

---

# 49. Criterios de Aceptación del Diagrama 2

El Diagrama 2 puede congelarse cuando:

1. Usuario representa identidad global.
2. Usuario puede tener 0..N membresías.
3. Rol pertenece a UsuarioNegocio.
4. EstadoMembresia solo contiene ACTIVO/INACTIVO.
5. Existe una única membresía histórica por Usuario + Negocio.
6. Reincorporar reutiliza la membresía.
7. UsuarioNegocio no expone mutadores que salteen invariantes del Negocio.
8. Negocio protege la existencia de al menos un PROPIETARIO ACTIVO.
9. Negocio no posee un EstadoNegocio inventado.
10. Crear Negocio incluye Propietario inicial.
11. Promoción a PROPIETARIO es explícita.
12. Incorporación inicial solo admite ENCARGADO/TRABAJADOR.
13. InvitacionNegocio utiliza `fechaExpiracion`.
14. `PENDIENTE` no implica vigencia.
15. `estaVigente(ahora)` utiliza el instante suministrado.
16. Aceptar requiere PENDIENTE + vigente + Email.
17. Rechazar requiere PENDIENTE + vigente + Email.
18. Cancelar requiere PENDIENTE y no exige vigencia.
19. Expirar requiere PENDIENTE + pérdida de vigencia.
20. Estados terminales no admiten nuevas transiciones.
21. Emisor debe ser PROPIETARIO ACTIVO del mismo Negocio.
22. Destinatario ACTIVO no debe ser invitado/reincorporado.
23. Solo una PENDIENTE vigente equivalente por Negocio + Email.
24. Reenvío no crea otra InvitacionNegocio.
25. Reenvío no extiende `fechaExpiracion`.
26. Cambio de `rolPropuesto` implica cancelar + nueva invitación.
27. InvitacionNegocio no crea directamente UsuarioNegocio.
28. Aceptación + membresía forman una unidad funcional atómica.
29. Guardias contextuales no se implementan mediante repositories dentro de la entidad.
30. Email conserva una semántica única de equivalencia.
31. WhatsApp/canales externos no forman parte del estado.
32. Modalidades tienen cardinalidad 1..N.
33. Moneda base MVP = ARS.
34. Preparación del Negocio es derivada.
35. No existe RBAC dinámico en MVP.
36. No se introduce infraestructura técnica prematura.
37. Concurrencia queda identificada como requisito de implementación.
38. El Diagrama 4 es la referencia especializada del ciclo de vida de InvitacionNegocio.

---

# 50. Estado del Artefacto

Después de sincronizar y aprobar visualmente el `.puml`:

```text
BLOQUE 1 — FUNDACIÓN

Modelo estructural
├── 01 — Mapa General                         🟡 pendiente de sincronización menor
├── 02 — M01 Organización — Clases           ✅ SINCRONIZADO
└── 03 — M02 Catálogo — Clases               ✅ CONGELADO

Modelo dinámico
├── 04 — InvitacionNegocio — Estados          ✅ CONGELADO
├── 05 — UsuarioNegocio — Estados             ⏳ SIGUIENTE
└── 06 — ArticuloCatalogo — Estados           ⏳ PENDIENTE
```

No avanzar todavía a implementación.

---

# 51. Criterio Rector

El criterio rector del Diagrama 2 es:

> **M01 debe permitir que una persona participe de uno o varios Negocios mediante membresías contextuales, preservando su historia y garantizando que las invariantes organizacionales y el ciclo de incorporación no puedan romperse mediante mutaciones aisladas.**

Resumen:

```text
Usuario
→ identidad global

UsuarioNegocio
→ membresía + Rol + estado contextual

Negocio
→ invariantes que requieren contexto organizacional

InvitacionNegocio
→ propuesta de incorporación
→ protege su ciclo local

Caso de Uso
→ autorización
→ contexto
→ coordinación entre entidades

Persistencia
→ integridad
→ concurrencia
→ última línea de defensa

Arquitectura
→ mecanismo técnico
```

El UML es una representación conceptual.

No es una especificación automática de ORM, tablas, endpoints ni infraestructura.
