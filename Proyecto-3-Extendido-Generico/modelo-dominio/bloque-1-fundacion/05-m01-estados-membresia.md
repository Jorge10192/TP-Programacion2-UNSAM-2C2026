# 05 — M01 Organización — Guía Semántica del Ciclo de Vida de `UsuarioNegocio`

## 1. Propósito y Alcance del Documento

Este documento define la semántica oficial del ciclo de vida de:

```text
UsuarioNegocio
```

dentro de:

```text
M01 — Organización del Negocio
```

Su objetivo es servir como especificación fuente para:

- análisis de dominio;
- diseño arquitectónico;
- implementación backend;
- servicios y casos de uso;
- persistencia;
- autorización;
- contrato API;
- frontend;
- pruebas automatizadas;
- revisión de concurrencia;
- mantenimiento;
- implementación asistida por IA.

Este documento debe permitir que una persona desarrolladora o una IA determine sin ambigüedad:

```text
qué estados existen;
qué significa cada estado;
qué transiciones son válidas;
qué operaciones NO cambian EstadoMembresia;
qué reglas pertenecen a UsuarioNegocio;
qué reglas requieren contexto de Negocio;
qué reglas pertenecen al Caso de Uso;
qué invariantes debe proteger Persistencia;
qué ocurre bajo concurrencia;
qué significa reincorporar;
qué significa abandonar el Negocio;
cómo se protege al último Propietario;
qué operaciones deben rechazarse explícitamente;
qué decisiones técnicas todavía NO están tomadas.
```

Este documento NO pretende definir la implementación concreta.

Congela:

```text
semántica;
invariantes;
transiciones;
responsabilidades conceptuales;
casos inválidos;
propiedades que deben preservarse.
```

No congela:

```text
framework;
ORM;
SQL concreto;
endpoints;
DTOs;
locking específico;
tipos exactos de excepción;
event bus;
mensajería;
infraestructura.
```

---

## 1.1. Artefactos relacionados

Este documento debe mantenerse semánticamente sincronizado con:

```text
modulos/M01-organizacion-negocio.md

modelo-dominio/bloque-1-fundacion/
├── 01-modelo-dominio-bloque-1.md
├── 01-diagrama-general.puml
├── 02-m01-organizacion-clases.md
├── 02-m01-organizacion-clases.puml
├── 04-m01-estados-invitacion.md
├── 04-m01-estados-invitacion.puml
├── 05-m01-estados-membresia.md
└── 05-m01-estados-membresia.puml
```

El artefacto:

```text
05-m01-estados-membresia.puml
```

es la representación visual resumida de las reglas definidas aquí.

Este Markdown conserva la explicación semántica detallada.

---

## 1.2. Fuentes de verdad

Para interpretar o implementar `UsuarioNegocio`, respetar conceptualmente el siguiente orden:

```text
1. modulos/M01-organizacion-negocio.md

2. modelo-dominio/bloque-1-fundacion/
   01-modelo-dominio-bloque-1.md

3. modelo-dominio/bloque-1-fundacion/
   02-m01-organizacion-clases.md

4. modelo-dominio/bloque-1-fundacion/
   05-m01-estados-membresia.md

5. modelo-dominio/bloque-1-fundacion/
   05-m01-estados-membresia.puml

6. ADRs / Arquitectura

7. Modelo Relacional

8. Contrato API

9. Implementación
```

Si una implementación futura contradice una invariante de dominio:

```text
NO adaptar silenciosamente la invariante al código.
NO considerar la implementación como fuente superior.
NO resolver la contradicción únicamente en frontend.
NO inventar una nueva regla técnica para ocultar el problema.
```

La contradicción debe resolverse primero en la documentación de dominio correspondiente.

---

## 1.3. Alcance específico

Este documento gobierna:

- `EstadoMembresia`;
- creación conceptual de una membresía;
- membresía activa;
- membresía inactiva;
- desactivación administrativa;
- salida voluntaria;
- reincorporación/reactivación;
- conservación de identidad histórica;
- relación entre Estado y Rol;
- protección del último Propietario;
- operaciones inválidas;
- aislamiento entre Negocios;
- concurrencia crítica;
- responsabilidad entre Dominio, Caso de Uso y Persistencia;
- pruebas derivables.

Este documento NO define todavía:

```text
cierre formal de Negocio;
EstadoNegocio;
vacaciones;
licencias;
turnos;
francos;
RRHH;
nómina;
contratos laborales;
motivos formales de desvinculación;
mecanismo SQL de locking;
código HTTP;
DTOs;
framework;
ORM;
Repository concreto;
Unit of Work concreto;
Domain Events obligatorios;
sistema de notificaciones concreto.
```

---

# 2. Definición Semántica de Estados

La membresía posee exactamente dos estados de dominio:

```text
EstadoMembresia
├── ACTIVO
└── INACTIVO
```

No deben agregarse nuevos estados sin modificar primero la especificación funcional de M01.

---

## 2.1. `ACTIVO`

Una `UsuarioNegocio` en estado:

```text
ACTIVO
```

representa una membresía actualmente operativa dentro de un `Negocio`.

Conceptualmente:

```text
Usuario
+
UsuarioNegocio ACTIVO
+
Negocio
```

significa que el Usuario mantiene actualmente participación contextual en ese Negocio.

El Rol aplicable se encuentra en:

```text
UsuarioNegocio.rol
```

y puede ser:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

El hecho de estar `ACTIVO` no concede automáticamente todas las operaciones.

La autorización concreta depende conjuntamente de:

```text
membresía ACTIVA
+
Rol
+
permiso concreto del módulo/caso de uso
+
contexto del mismo Negocio
```

Por lo tanto:

```text
ACTIVO
≠
autorización universal
```

---

## 2.2. `INACTIVO`

Una `UsuarioNegocio` en estado:

```text
INACTIVO
```

representa una membresía histórica actualmente no operativa.

La entidad continúa existiendo.

No significa:

```text
el Usuario fue eliminado;
el Negocio fue eliminado;
la cuenta global fue eliminada;
el historial se perdió.
```

Una membresía `INACTIVA`:

```text
NO habilita participación operativa;
NO habilita autorización basada en su Rol;
NO debe actuar como miembro actual del Negocio;
SÍ conserva su identidad histórica;
SÍ puede ser reactivada mediante una operación válida.
```

---

## 2.3. `INACTIVO` no representa vacaciones ni ausencias operativas

Regla crítica:

```text
INACTIVO
≠
vacaciones
≠
licencia
≠
franco
≠
ausencia temporal
≠
indisponibilidad horaria
```

Las vacaciones o licencias representan situaciones operativas de una persona que continúa perteneciendo al Negocio.

Si en el futuro se implementa gestión de personal, dichos conceptos pertenecerán a otro modelo.

No introducir en `EstadoMembresia`:

```text
DE_VACACIONES
DE_LICENCIA
AUSENTE
SUSPENDIDO_POR_HORARIO
```

para representar disponibilidad laboral.

---

## 2.4. No introducir subestados por motivo de baja

No agregar:

```text
INACTIVO_RENUNCIA
INACTIVO_DESPEDIDO
INACTIVO_BAJA_ADMINISTRATIVA
INACTIVO_SUSPENDIDO
```

solo para describir por qué una membresía dejó de estar operativa.

El ciclo de vida estructural continúa siendo:

```text
ACTIVO
INACTIVO
```

Si posteriormente se requiere conocer el motivo de una desactivación, deberá modelarse como trazabilidad, motivo o información contextual separada.

---

## 2.5. Estado de membresía vs. estado de cuenta global

`UsuarioNegocio.estado` y el estado global de `Usuario` son conceptos distintos.

Ejemplo:

```text
Usuario
→ cuenta global

UsuarioNegocio
→ pertenencia contextual a un Negocio concreto
```

No implementar:

```text
Usuario deshabilitado
→ cambiar automáticamente todas las membresías a INACTIVO
```

ni:

```text
UsuarioNegocio INACTIVO
→ deshabilitar la cuenta global
```

sin una regla funcional explícita que lo establezca.

---

# 3. Principio de Membresía Única e Histórica

## 3.1. Unicidad conceptual

Para una misma combinación:

```text
Usuario + Negocio
```

existe exactamente una única membresía histórica:

```text
UsuarioNegocio
```

Conceptualmente:

```text
Usuario U
+
Negocio N
→
como máximo una UsuarioNegocio histórica U-N
```

No crear:

```text
UsuarioNegocio #1
ACTIVO

luego:
UsuarioNegocio #1
INACTIVO

luego:
UsuarioNegocio #2
ACTIVO
```

para representar una reincorporación.

La forma correcta es:

```text
misma UsuarioNegocio
ACTIVO
→ INACTIVO
→ ACTIVO
```

---

## 3.2. Reincorporación reutiliza identidad

Una reincorporación válida:

```text
INACTIVO → ACTIVO
```

reutiliza la misma entidad histórica.

Debe conservarse:

```text
identidad de UsuarioNegocio;
Usuario asociado;
Negocio asociado;
continuidad histórica.
```

No se crea una segunda membresía para “empezar de cero”.

---

## 3.3. No existe eliminación física funcional

M01 no expone una operación funcional:

```text
eliminarUsuarioNegocio()
```

para borrar una membresía histórica.

La baja funcional se expresa mediante:

```text
ACTIVO → INACTIVO
```

Esto permite preservar referencias desde operaciones históricas como:

```text
ventas;
compras;
producción;
auditoría;
cambios administrativos;
otras operaciones futuras.
```

Regla precisa:

> **No existe eliminación física funcional de `UsuarioNegocio` dentro del ciclo de vida normal de M01.**

Esto NO pretende decidir políticas técnicas futuras de:

```text
retención legal;
anonimización;
purga extraordinaria;
migraciones;
administración técnica.
```

Tampoco implica que deba agregarse automáticamente:

```text
deleted_at
soft_deleted
is_deleted
```

al modelo.

`EstadoMembresia.INACTIVO` ya representa la desvinculación funcional.

---

## 3.4. Rol conservado mientras está INACTIVO

Al desactivar una membresía:

```text
ACTIVO / rol = R
→
INACTIVO / rol = R
```

El Rol almacenado se conserva.

Ejemplo:

```text
ACTIVO / ENCARGADO
→ desactivar
→ INACTIVO / ENCARGADO
```

Sin embargo:

```text
rol en INACTIVO
```

representa únicamente el último Rol asignado antes de la desactivación.

No constituye:

```text
historial completo de roles
```

Por ejemplo, si ocurrió:

```text
TRABAJADOR
→ ENCARGADO
→ PROPIETARIO
→ INACTIVO
```

el atributo actual puede conservar:

```text
PROPIETARIO
```

pero no permite reconstruir por sí solo todas las transiciones anteriores.

La auditoría histórica de cambios de Rol, si resulta necesaria, pertenece a una estrategia de trazabilidad separada.

---

## 3.5. Rol durante la reactivación

Una membresía `INACTIVA` no restaura automáticamente su Rol histórico.

La reactivación exige un Rol operativo explícito:

```text
rolInicial ∈ {ENCARGADO, TRABAJADOR}
```

Ejemplo:

```text
INACTIVO / último rol = ENCARGADO
+
reactivar(rolInicial = TRABAJADOR)
→
ACTIVO / TRABAJADOR
```

El Rol anterior:

```text
NO es la asignación por defecto obligatoria.
```

---

## 3.6. Semántica de `fechaIncorporacion`

Para evitar interpretaciones contradictorias durante implementación:

```text
fechaIncorporacion
```

representa conceptualmente la incorporación original de la membresía histórica.

Por lo tanto:

```text
reactivar
→ NO reescribe fechaIncorporacion original
```

Si en el futuro se requiere registrar:

```text
fecha de cada reactivación;
fecha de cada desactivación;
quién realizó cada acción;
motivo de la baja;
```

esa información deberá resolverse mediante trazabilidad/auditoría o atributos explícitamente aprobados.

Una IA no debe convertir `fechaIncorporacion` silenciosamente en:

```text
fechaUltimaReactivacion
```

---

# 4. Matriz Oficial de Transiciones de Estado

La máquina de estados de `UsuarioNegocio` posee tres transiciones estructurales relevantes:

```text
[*] → ACTIVO

ACTIVO → INACTIVO

INACTIVO → ACTIVO
```

Los cambios de Rol mientras la membresía permanece `ACTIVA` no constituyen un cambio de `EstadoMembresia`.

| Estado Origen | Operación / Comando conceptual | Estado Destino | Rol Resultante | Guardia / Invariante Principal |
| --- | --- | --- | --- | --- |
| `[*]` | Crear Negocio con primer miembro | `ACTIVO` | `PROPIETARIO` | Creación de `Negocio` + primera membresía `ACTIVO/PROPIETARIO` como una única operación funcional. |
| `[*]` | Incorporación normal a Negocio existente | `ACTIVO` | `rolInicial` | `rolInicial ∈ {ENCARGADO, TRABAJADOR}`. No se utiliza este flujo para asignar `PROPIETARIO`. |
| `ACTIVO` | Desactivación administrativa | `INACTIVO` | Conserva último Rol | Actor autorizado: `PROPIETARIO ACTIVO` del mismo Negocio. Si el objetivo es Propietario, debe continuar existiendo `>= 1 PROPIETARIO ACTIVO`. |
| `ACTIVO` | Salida voluntaria / abandonar Negocio | `INACTIVO` | Conserva último Rol | La solicita el propio miembro. El Caso de Uso reutiliza la misma operación de dominio de desactivación. Debe preservarse `>= 1 PROPIETARIO ACTIVO`. |
| `INACTIVO` | Reactivación administrativa válida | `ACTIVO` | Nuevo `rolInicial` | `rolInicial ∈ {ENCARGADO, TRABAJADOR}`. Se reutiliza la misma membresía histórica. |
| `INACTIVO` | Aceptación válida de nueva invitación | `ACTIVO` | `rolPropuesto` | `rolPropuesto ∈ {ENCARGADO, TRABAJADOR}`. Invitación + reactivación se coordinan consistentemente. |
| `ACTIVO` | `cambiarRolMiembro(...)` | `ACTIVO` | `nuevoRol` | No es transición de `EstadoMembresia`. Si un Propietario deja de serlo, debe continuar existiendo `>= 1 PROPIETARIO ACTIVO`. |
| `ACTIVO` | Incorporar/reactivar nuevamente | Rechazo | No cambia | La membresía ya está activa. No duplicar entidad ni modificar Rol silenciosamente. |
| `INACTIVO` | Desactivar nuevamente | Rechazo | No cambia | No existe `INACTIVO → INACTIVO` como transición funcional válida. |
| `INACTIVO` | Cambiar Rol sin reactivar | Rechazo | No cambia | El Rol no se modifica mientras la membresía está inactiva. |
| `INACTIVO` | Operar como miembro actual | Rechazo | No cambia | Una membresía inactiva no otorga autorización operativa. |

---

## 4.1. Creación inicial del Propietario

La transición:

```text
[*] → ACTIVO / PROPIETARIO
```

corresponde exclusivamente a la creación inicial consistente del Negocio.

No debe implementarse convirtiendo:

```text
incorporarOReactivarMiembro(usuario, rolInicial)
```

en una operación general que admita:

```text
rolInicial = PROPIETARIO
```

La creación inicial es un contexto distinto.

Debe confirmarse funcionalmente:

```text
Negocio creado
+
UsuarioNegocio del creador
estado = ACTIVO
rol = PROPIETARIO
```

o:

```text
ninguno de ambos cambios
```

---

## 4.2. Incorporación normal

La incorporación a un Negocio existente utiliza:

```text
ENCARGADO
TRABAJADOR
```

como Roles iniciales permitidos.

La promoción a:

```text
PROPIETARIO
```

requiere una operación explícita posterior:

```text
cambiarRolMiembro(miembro, PROPIETARIO)
```

Esto evita utilizar altas o reactivaciones como mecanismo implícito de elevación de privilegios.

---

## 4.3. No existen transiciones nulas silenciosas

No considerar válidas:

```text
ACTIVO → ACTIVO
```

por reincorporación, ni:

```text
INACTIVO → INACTIVO
```

por desactivación repetida.

La operación debe fallar de forma explícita en dominio/aplicación.

La taxonomía técnica exacta del error:

```text
excepción;
Result;
error de dominio;
código interno;
```

se decidirá posteriormente.

La regla congelada es:

```text
NO silent no-op.
```

---

# 5. Invariantes Semánticas y Reglas de Protección

## 5.1. Invariante del Propietario activo

Todo `Negocio` existente debe conservar:

```text
>= 1 UsuarioNegocio
estado = ACTIVO
rol = PROPIETARIO
```

Esta regla es transversal a:

```text
desactivar miembro;
salida voluntaria;
degradar Propietario;
cambiar Rol;
operaciones concurrentes.
```

No puede existir como resultado válido:

```text
Negocio existente
+
0 PROPIETARIOS ACTIVOS
```

durante el Bloque 1.

---

## 5.2. Único Propietario

Si un miembro es:

```text
ACTIVO
+
PROPIETARIO
```

y además es el único Propietario activo:

```text
NO puede ser desactivado;
NO puede autodesactivarse;
NO puede abandonar el Negocio;
NO puede degradarse a ENCARGADO;
NO puede degradarse a TRABAJADOR.
```

Para poder abandonar o dejar de ser Propietario, primero debe existir otro:

```text
PROPIETARIO ACTIVO
```

No se introduce en este Bloque 1:

```text
cerrarNegocio()
desactivarNegocio()
EstadoNegocio
```

como alternativa funcional ya disponible.

El cierre formal del Negocio permanece fuera del alcance actual.

---

## 5.3. Salida voluntaria

Un miembro `ACTIVO` puede solicitar dejar de participar del Negocio.

Conceptualmente:

```text
Caso de Uso abandonarNegocio
↓
autentica al Usuario
↓
resuelve su UsuarioNegocio ACTIVA
↓
verifica contexto
↓
delegación a Negocio.desactivarMiembro(miembro)
↓
ACTIVO → INACTIVO
```

No debe implementarse una segunda lógica independiente que replique parcialmente la invariante del último Propietario.

La salida voluntaria y la desactivación administrativa utilizan la misma regla estructural:

```text
ACTIVO → INACTIVO
```

y deben converger en un único comportamiento de dominio que preserve las invariantes del Negocio.

---

## 5.4. Desactivación administrativa

Un miembro puede ser desactivado administrativamente por:

```text
PROPIETARIO ACTIVO
```

del mismo Negocio.

No autorizar esta operación únicamente porque:

```text
actor.rol == PROPIETARIO
```

Debe cumplirse también:

```text
actor.estado == ACTIVO
actor pertenece al mismo Negocio
objetivo pertenece al mismo Negocio
```

---

## 5.5. Multitenancy / aislamiento entre Negocios

Regla crítica:

```text
actor.Negocio == objetivo.Negocio
```

Un Propietario del Negocio A:

```text
NO puede
```

desactivar, cambiar Rol o reactivar una membresía perteneciente al Negocio B.

No confiar únicamente en:

```text
ID de membresía recibido por request
```

sin resolver y verificar su contexto.

La autorización debe evaluar el Negocio objetivo real de la entidad cargada.

---

## 5.6. No autorizar con una membresía INACTIVA

Una `UsuarioNegocio` con:

```text
estado = INACTIVO
```

no puede utilizar su Rol almacenado para autorizar operaciones.

Ejemplo incorrecto:

```text
if membresia.rol == PROPIETARIO:
    permitir_desactivar_miembro()
```

si no se verificó:

```text
membresia.estado == ACTIVO
```

La regla correcta requiere:

```text
estaActiva()
+
esPropietario()
+
mismo Negocio
```

---

## 5.7. Cambiar Rol no cambia EstadoMembresia

Mientras una membresía permanece:

```text
ACTIVO
```

puede cambiar:

```text
TRABAJADOR ↔ ENCARGADO
TRABAJADOR → PROPIETARIO
ENCARGADO → PROPIETARIO
PROPIETARIO → ENCARGADO
PROPIETARIO → TRABAJADOR
```

siempre que las reglas de autorización y del último Propietario se preserven.

Conceptualmente:

```text
ACTIVO
↺ cambiarRolMiembro(...)
```

Esto NO representa:

```text
ACTIVO → ACTIVO
```

como transición del ciclo de vida.

Es una modificación de un atributo ortogonal al Estado.

---

## 5.8. No cambiar Rol mientras INACTIVO

Mientras:

```text
estado = INACTIVO
```

no debe ejecutarse:

```text
cambiarRolMiembro(...)
```

La reincorporación define explícitamente el nuevo Rol operativo.

Esto evita estados ambiguos como:

```text
membresía no operativa
+
Rol modificado silenciosamente
+
posterior reactivación con significado incierto
```

---

## 5.9. Reactivación

Una reactivación válida:

```text
INACTIVO → ACTIVO
```

requiere:

```text
misma UsuarioNegocio histórica
+
nuevo rolInicial explícito
+
rolInicial ∈ {ENCARGADO, TRABAJADOR}
```

No restaurar automáticamente:

```text
rol histórico previo
```

y no permitir directamente:

```text
PROPIETARIO
```

como Rol de reactivación.

---

## 5.10. Reactivación mediante invitación

Cuando una nueva `InvitacionNegocio` válida es aceptada por un Usuario que posee una membresía histórica:

```text
INACTIVA
```

para ese mismo Negocio:

```text
NO crear segunda UsuarioNegocio;
reactivar la existente;
asignar rolPropuesto;
```

La aceptación completa coordina consistentemente:

```text
InvitacionNegocio → ACEPTADA
+
UsuarioNegocio INACTIVO → ACTIVO
+
rol = rolPropuesto
```

Si la membresía ya está:

```text
ACTIVO
```

la aceptación debe rechazarse.

---

## 5.11. Concurrencia — último Propietario

Una prevalidación simple no es suficiente.

Ejemplo:

```text
Negocio:
Propietario A ACTIVO
Propietario B ACTIVO
```

Petición 1:

```text
A intenta abandonar
lee: hay 2 Propietarios
```

Petición 2:

```text
B intenta abandonar
lee: hay 2 Propietarios
```

Si ambas confirman sin coordinación:

```text
A → INACTIVO
B → INACTIVO
```

resultado incorrecto:

```text
0 PROPIETARIOS ACTIVOS
```

La invariante congelada es:

> **Después de confirmar cualquier desactivación o degradación debe continuar existiendo al menos un `PROPIETARIO ACTIVO`.**

La implementación debe garantizar esta propiedad bajo concurrencia.

No se congela todavía el mecanismo:

```text
optimistic locking;
pessimistic locking;
SELECT FOR UPDATE;
serializable;
version column;
constraint específica;
otra estrategia equivalente.
```

Arquitectura/Persistencia seleccionará el mecanismo.

---

## 5.12. Concurrencia — reactivación duplicada

Dos operaciones concurrentes podrían intentar reactivar la misma membresía `INACTIVA`.

El resultado permitido es:

```text
una única UsuarioNegocio
+
un único estado final ACTIVO
+
un Rol final determinado por una operación confirmada válidamente
```

No deben resultar:

```text
dos membresías;
dos filas históricas;
una activación con Rol silenciosamente sobrescrito por otra petición.
```

La estrategia de resolución de conflictos se definirá posteriormente.

---

## 5.13. Concurrencia — cambio de Rol vs. desactivación

Una operación puede intentar:

```text
cambiarRolMiembro(...)
```

mientras otra intenta:

```text
desactivarMiembro(...)
```

sobre la misma membresía.

La implementación debe impedir estados finales derivados de decisiones confirmadas sobre una versión obsoleta del contexto.

Ejemplo inválido:

```text
Operación A valida miembro ACTIVO.
Operación B lo desactiva.
Operación A confirma después un cambio de Rol
como si todavía estuviera ACTIVO.
```

Las condiciones relevantes deben revalidarse al confirmar.

---

## 5.14. Prevalidación no es garantía

Una interfaz puede consultar:

```text
¿puede abandonar?
¿puede desactivar?
¿puede cambiar Rol?
¿puede reactivar?
```

para mejorar UX.

Pero:

```text
prevalidación
≠
garantía de confirmación
```

Las invariantes relevantes deben protegerse nuevamente en la operación que modifica estado.

---

## 5.15. Separación entre autorización y dominio

La capa de aplicación determina:

```text
quién solicita la operación;
qué Negocio está seleccionado;
qué UsuarioNegocio representa al actor;
qué permiso concreto corresponde.
```

El dominio protege:

```text
estado válido;
transición válida;
Rol válido;
pertenencia contextual cuando dispone del conjunto;
invariante del Propietario;
consistencia del conjunto de membresías.
```

No trasladar todas las invariantes al controller, frontend o endpoint.

---

# 6. Delimitación de Responsabilidades

## 6.1. `UsuarioNegocio`

`UsuarioNegocio` representa:

```text
Usuario
+
Negocio
+
Rol contextual
+
EstadoMembresia
+
continuidad histórica
```

Puede responder conceptualmente consultas como:

```text
estaActiva() : Boolean
esPropietario() : Boolean
```

No debe exponer setters públicos que permitan:

```text
membresia.estado = INACTIVO
membresia.rol = PROPIETARIO
```

desde cualquier capa sin aplicar las invariantes del conjunto.

La entidad aislada no dispone necesariamente de suficiente contexto para saber:

```text
cuántos Propietarios activos existen;
si el actor está autorizado;
si otra membresía pertenece al mismo Negocio;
si existe una operación concurrente.
```

---

## 6.2. `Negocio`

`Negocio` es responsable conceptualmente de las operaciones que requieren conocer/proteger el conjunto de membresías.

Ejemplos:

```text
desactivarMiembro(miembro)

cambiarRolMiembro(miembro, nuevoRol)

incorporarOReactivarMiembro(usuario, rolInicial)
```

Estas operaciones deben preservar:

```text
mismo contexto de Negocio;
unicidad histórica;
estado permitido;
Rol permitido;
>= 1 PROPIETARIO ACTIVO.
```

`Negocio` no debe consultar directamente infraestructura o repositorios para obtener información que la capa de aplicación debería suministrar/cargar.

La forma técnica exacta de materializar el agregado/contexto se define posteriormente.

---

## 6.3. Caso de Uso — desactivación administrativa

El Caso de Uso debe:

```text
autenticar actor;
resolver Negocio;
resolver UsuarioNegocio del actor;
resolver UsuarioNegocio objetivo;
verificar mismo Negocio;
verificar autorización;
coordinar frontera de consistencia;
invocar comportamiento de dominio;
persistir de forma segura;
coordinar efectos externos si corresponde.
```

No debe modificar directamente:

```text
objetivo.estado
```

sin pasar por la operación que preserva invariantes.

---

## 6.4. Caso de Uso — salida voluntaria

`abandonarNegocio` representa una intención de aplicación.

Conceptualmente:

```text
abandonarNegocio(usuarioAutenticado, negocio)
```

debe:

```text
1. resolver la propia UsuarioNegocio;
2. verificar que esté ACTIVA;
3. verificar pertenencia al Negocio;
4. delegar la transición estructural
   en Negocio.desactivarMiembro(miembro);
5. confirmar consistentemente;
6. coordinar notificaciones externas si corresponden.
```

No duplicar:

```text
regla del último Propietario
```

en un segundo método independiente con lógica diferente.

---

## 6.5. Caso de Uso — reactivación administrativa

Una reactivación administrativa requiere:

```text
PROPIETARIO ACTIVO autorizado
+
mismo Negocio
+
membresía histórica INACTIVA
+
rolInicial explícito ENCARGADO/TRABAJADOR
```

Debe converger conceptualmente en:

```text
Negocio.incorporarOReactivarMiembro(usuario, rolInicial)
```

en lugar de implementar una segunda versión de las reglas de reincorporación.

---

## 6.6. Caso de Uso — aceptación de invitación

La aceptación de una invitación y la reactivación de una membresía histórica deben reutilizar las mismas reglas de dominio.

No implementar:

```text
reactivarDesdeInvitacion()
```

con invariantes distintas de:

```text
incorporarOReactivarMiembro(...)
```

solo por provenir de otro endpoint.

La diferencia pertenece a la coordinación del Caso de Uso.

---

## 6.7. Persistencia

La persistencia debe actuar como última línea de defensa para invariantes susceptibles a carreras.

Debe permitir proteger:

```text
una única membresía histórica Usuario + Negocio;
>= 1 PROPIETARIO ACTIVO;
reactivación concurrente;
cambio de Rol vs. desactivación;
aislamiento entre Negocios.
```

El documento congela:

```text
la invariante
```

no:

```text
la técnica SQL concreta.
```

---

## 6.8. Frontend

El frontend puede:

```text
ocultar acciones no disponibles;
deshabilitar botones;
mostrar advertencias;
mostrar último Rol;
confirmar abandono;
mostrar mensajes de restricción.
```

Pero:

```text
frontend
≠
capa de seguridad
```

Toda regla debe revalidarse en backend.

---

## 6.9. Notificaciones y efectos externos

Una salida voluntaria puede producir conceptualmente:

```text
notificación a Propietarios activos;
alerta interna;
email;
otro efecto futuro.
```

La notificación:

```text
NO es un estado de UsuarioNegocio;
NO debe bloquear la transición estructural salvo regla futura;
NO obliga a Domain Events;
NO obliga a mensajería asíncrona.
```

El mecanismo se definirá en Arquitectura.

---

# 7. Errores de Implementación y Anti-Patrones a Evitar

Una IA o desarrollador NO debe inferir o implementar automáticamente lo siguiente.

## 7.1. No usar Rol global en `Usuario`

Incorrecto:

```text
Usuario.rol
```

El Rol pertenece a:

```text
UsuarioNegocio
```

porque un mismo Usuario puede poseer distintos Roles en distintos Negocios.

---

## 7.2. No reemplazar `EstadoMembresia` por Boolean

No implementar como sustituto conceptual:

```text
UsuarioNegocio.activo : Boolean
```

El modelo aprobado utiliza:

```text
EstadoMembresia.ACTIVO
EstadoMembresia.INACTIVO
```

---

## 7.3. No usar `deleted_at` como ciclo de vida funcional

No modelar:

```text
deleted_at
soft_deleted
is_deleted
```

como reemplazo de:

```text
EstadoMembresia.INACTIVO
```

Una técnica de borrado lógico podría existir en el futuro por razones independientes, pero NO debe inferirse ni utilizarse para redefinir el ciclo de vida funcional.

---

## 7.4. No borrar la membresía para representar una salida

Incorrecto:

```text
DELETE UsuarioNegocio
```

como comportamiento del caso de uso:

```text
abandonarNegocio
```

La transición funcional es:

```text
ACTIVO → INACTIVO
```

---

## 7.5. No crear una segunda membresía al reincorporar

Incorrecto:

```text
INACTIVO histórica
+
crear nueva UsuarioNegocio ACTIVA
```

Correcto:

```text
misma UsuarioNegocio
INACTIVO → ACTIVO
```

---

## 7.6. No permitir setters públicos de Estado/Rol

Evitar:

```text
membresia.setEstado(...)
membresia.estado = ...
membresia.setRol(...)
membresia.rol = ...
```

si permiten saltear:

```text
estado válido;
último Propietario;
autorización;
mismo Negocio;
restricciones de reactivación.
```

---

## 7.7. No usar Rol de una membresía INACTIVA para autorizar

Incorrecto:

```text
rol == PROPIETARIO
→ autorizado
```

sin validar:

```text
estado == ACTIVO
```

---

## 7.8. No restaurar automáticamente el último Rol

Incorrecto:

```text
INACTIVO / ENCARGADO
→ reactivar()
→ ACTIVO / ENCARGADO automáticamente
```

La reactivación requiere:

```text
rolInicial explícito.
```

---

## 7.9. No reactivar directamente como PROPIETARIO

Incorrecto:

```text
incorporarOReactivarMiembro(usuario, PROPIETARIO)
```

para una incorporación/reactivación normal.

La promoción es explícita y posterior.

---

## 7.10. No usar invitación para cambiar Rol de miembro ACTIVO

Si ya existe:

```text
UsuarioNegocio ACTIVO
```

una nueva invitación no debe:

```text
reincorporar;
duplicar;
cambiar Rol.
```

El cambio de Rol pertenece a:

```text
cambiarRolMiembro(...)
```

---

## 7.11. No aceptar no-ops silenciosos

No transformar silenciosamente en éxito:

```text
desactivar(INACTIVO)
reactivar(ACTIVO)
incorporar(ACTIVO)
```

La operación es inválida y debe informarse como tal.

No se congela todavía la clase concreta de excepción.

---

## 7.12. No duplicar lógica de salida voluntaria

No implementar:

```text
abandonarNegocio()
```

con una segunda versión de la regla del último Propietario.

Debe reutilizar el comportamiento estructural centralizado de desactivación.

---

## 7.13. No confiar en prechecks

Incorrecto:

```text
if puede_desactivar():
    # tiempo arbitrario
    estado = INACTIVO
```

sin revalidación/garantía al confirmar.

---

## 7.14. No confiar en IDs para aislamiento multitenant

Incorrecto:

```text
desactivar_membresia(id)
```

sin verificar que la membresía cargada pertenece al Negocio sobre el que el actor está autorizado.

---

## 7.15. No verificar al último Propietario solo en memoria obsoleta

Incorrecto:

```text
if propietarios_activos > 1:
    desactivar()
```

si la garantía puede invalidarse por una operación concurrente antes de confirmar.

La implementación debe preservar la invariante de manera atómica.

---

## 7.16. No introducir subestados de RRHH

No agregar:

```text
VACACIONES
LICENCIA
RENUNCIO
DESPEDIDO
```

a `EstadoMembresia` para resolver conceptos diferentes.

---

## 7.17. No convertir trazabilidad en estado

No crear estados para registrar:

```text
QUIEN_DESACTIVO
REACTIVADO_POR_PROPIETARIO
RENUNCIA_NOTIFICADA
```

Estado actual y auditoría son conceptos distintos.

---

## 7.18. No interpretar `rol` como historial completo

`UsuarioNegocio.rol` representa el Rol actual o último Rol almacenado.

No utilizarlo para reconstruir:

```text
toda la historia de cambios de rol.
```

---

## 7.19. No sobrescribir `fechaIncorporacion` al reactivar

Dentro de este modelo:

```text
fechaIncorporacion
→ fecha de incorporación original de la membresía histórica.
```

No convertirla automáticamente en:

```text
fechaUltimaReactivacion.
```

---

## 7.20. No introducir un ciclo de cierre de Negocio

No inferir desde la restricción del último Propietario:

```text
Negocio.cerrar()
Negocio.desactivar()
EstadoNegocio
```

El Bloque 1 no los define.

---

## 7.21. No contaminar dominio con HTTP

No introducir en `UsuarioNegocio` o `Negocio`:

```text
409
422
HTTPException
request
response
status_code
```

La semántica HTTP pertenece al contrato API.

---

## 7.22. No contaminar dominio con SQL/ORM

No introducir como regla de dominio:

```text
SELECT FOR UPDATE
Session
ORM model
SQL constraint concreta
version column concreta
```

aunque posteriormente puedan ser mecanismos adecuados.

---

## 7.23. No congelar excepciones técnicas prematuramente

La especificación exige:

```text
rechazo explícito de operación inválida.
```

No obliga todavía a clases concretas como:

```text
UltimoPropietarioException
MembresiaYaActivaException
```

La taxonomía se define durante diseño técnico.

---

## 7.24. No introducir `Clock` sin necesidad

El ciclo de vida de `UsuarioNegocio` definido aquí no depende de una regla temporal comparable a `InvitacionNegocio.fechaExpiracion`.

No agregar una dependencia de reloj a la entidad únicamente por uniformidad arquitectónica.

---

## 7.25. No agregar infraestructura por anticipación

No inferir automáticamente:

```text
Repository por entidad;
Domain Event;
Event Bus;
Kafka;
Redis;
CQRS;
Event Sourcing;
microservicio;
scheduler.
```

El mecanismo debe justificarse en Arquitectura.

---

# 8. Batería Completa de Pruebas Derivables

Las siguientes pruebas se derivan directamente de las reglas de este documento.

La sintaxis técnica concreta de tests se definirá durante implementación.

| ID | Caso | Condición inicial | Acción | Resultado esperado |
| --- | --- | --- | --- | --- |
| `TC-MEM-001` | Crear primer Propietario | No existe Negocio | Crear Negocio | Se confirma Negocio + `UsuarioNegocio ACTIVO/PROPIETARIO`. |
| `TC-MEM-002` | Falla primera membresía | Creación de Negocio en curso | Falla creación de membresía inicial | No debe quedar Negocio confirmado sin Propietario activo. |
| `TC-MEM-003` | Incorporación normal como Trabajador | Negocio existente + Usuario sin membresía | Incorporar con `TRABAJADOR` | Nueva membresía `ACTIVO/TRABAJADOR`. |
| `TC-MEM-004` | Incorporación normal como Encargado | Usuario sin membresía | Incorporar con `ENCARGADO` | Nueva membresía `ACTIVO/ENCARGADO`. |
| `TC-MEM-005` | Incorporación normal como Propietario | Usuario sin membresía | Incorporar con `PROPIETARIO` | Rechazo. La promoción a Propietario debe ser explícita. |
| `TC-MEM-006` | Unicidad histórica | Ya existe membresía histórica | Intentar crear segunda membresía Usuario+Negocio | Rechazo. Se conserva una única identidad histórica. |
| `TC-MEM-007` | Desactivar Trabajador | Propietario actor ACTIVO + Trabajador ACTIVO | Desactivar Trabajador | Trabajador pasa a `INACTIVO`; conserva Rol. |
| `TC-MEM-008` | Desactivar Encargado | Propietario actor ACTIVO + Encargado ACTIVO | Desactivar Encargado | Encargado pasa a `INACTIVO`; conserva Rol. |
| `TC-MEM-009` | Desactivar segundo Propietario | Existen `>=2` Propietarios ACTIVOS | Desactivar uno | Objetivo pasa a `INACTIVO`; continúa `>=1` Propietario ACTIVO. |
| `TC-MEM-010` | Desactivar único Propietario | Existe exactamente 1 Propietario ACTIVO | Desactivarlo | Rechazo; ningún cambio. |
| `TC-MEM-011` | Propietario INACTIVO intenta administrar | Actor `INACTIVO/PROPIETARIO` | Desactivar otro miembro | Rechazo por actor no operativo. |
| `TC-MEM-012` | Encargado intenta desactivar | Actor `ACTIVO/ENCARGADO` | Desactivar miembro | Rechazo de autorización. |
| `TC-MEM-013` | Trabajador intenta desactivar | Actor `ACTIVO/TRABAJADOR` | Desactivar miembro | Rechazo de autorización. |
| `TC-MEM-014` | Salida voluntaria Trabajador | Trabajador ACTIVO | Abandonar Negocio | Misma membresía pasa a `INACTIVO`; conserva Rol. |
| `TC-MEM-015` | Salida voluntaria Encargado | Encargado ACTIVO | Abandonar Negocio | Pasa a `INACTIVO`; conserva Rol. |
| `TC-MEM-016` | Salida voluntaria segundo Propietario | `>=2` Propietarios ACTIVOS | Propietario abandona | Pasa a `INACTIVO`; continúa `>=1` Propietario ACTIVO. |
| `TC-MEM-017` | Salida voluntaria único Propietario | Exactamente 1 Propietario ACTIVO | Abandonar | Rechazo; sigue ACTIVO. |
| `TC-MEM-018` | Desactivación repetida | Membresía INACTIVA | Desactivar nuevamente | Rechazo explícito; no silent no-op. |
| `TC-MEM-019` | Reactivar Trabajador histórico | `INACTIVO`, último Rol cualquiera | Reactivar con `TRABAJADOR` | Misma entidad pasa a `ACTIVO/TRABAJADOR`. |
| `TC-MEM-020` | Reactivar Encargado histórico | `INACTIVO`, último Rol cualquiera | Reactivar con `ENCARGADO` | Misma entidad pasa a `ACTIVO/ENCARGADO`. |
| `TC-MEM-021` | Reactivar ex Propietario como Trabajador | `INACTIVO/PROPIETARIO` | Reactivar con `TRABAJADOR` | Misma entidad pasa a `ACTIVO/TRABAJADOR`. |
| `TC-MEM-022` | Reactivar restaurando Rol automáticamente | `INACTIVO/ENCARGADO` | Reactivar sin `rolInicial` | Rechazo; Rol operativo debe ser explícito. |
| `TC-MEM-023` | Reactivar como Propietario | Membresía INACTIVA | Reactivar con `PROPIETARIO` | Rechazo. |
| `TC-MEM-024` | Reactivar ya ACTIVO | Membresía ACTIVA | Incorporar/reactivar | Rechazo; no `ACTIVO → ACTIVO` por reincorporación. |
| `TC-MEM-025` | Cambiar Rol en INACTIVO | Membresía INACTIVA | `cambiarRolMiembro` | Rechazo. |
| `TC-MEM-026` | Promover Trabajador | `ACTIVO/TRABAJADOR` | Cambiar a `PROPIETARIO` | Permitir si actor autorizado y contexto válido. |
| `TC-MEM-027` | Promover Encargado | `ACTIVO/ENCARGADO` | Cambiar a `PROPIETARIO` | Permitir si actor autorizado. |
| `TC-MEM-028` | Degradar Propietario con otro Propietario | `>=2` Propietarios ACTIVOS | Cambiar uno a `ENCARGADO` | Permitir; continúa `>=1` Propietario ACTIVO. |
| `TC-MEM-029` | Degradar único Propietario | Exactamente 1 Propietario ACTIVO | Cambiar a `TRABAJADOR` | Rechazo. |
| `TC-MEM-030` | Cambio de Rol no cambia Estado | Miembro ACTIVO | Cambiar Rol válido | Sigue `ACTIVO`; solo cambia Rol. |
| `TC-MEM-031` | Cross-tenant desactivación | Actor Propietario Negocio A; objetivo Negocio B | Desactivar objetivo | Rechazo; ningún cambio. |
| `TC-MEM-032` | Cross-tenant cambio de Rol | Actor Negocio A; objetivo Negocio B | Cambiar Rol | Rechazo. |
| `TC-MEM-033` | Cross-tenant reactivación | Actor Negocio A; membresía INACTIVA Negocio B | Reactivar | Rechazo. |
| `TC-MEM-034` | Invitación reactiva membresía histórica | Invitación válida + membresía INACTIVA | Aceptar | Misma membresía pasa a ACTIVO con `rolPropuesto`. |
| `TC-MEM-035` | Invitación sobre miembro ya ACTIVO | Invitación antigua + membresía ahora ACTIVA | Aceptar | Rechazo; no duplicar ni cambiar Rol. |
| `TC-MEM-036` | Rol previo no domina invitación | `INACTIVO/ENCARGADO`; invitación `TRABAJADOR` | Aceptar | Reactivar como `TRABAJADOR`. |
| `TC-MEM-037` | Dos propietarios abandonan simultáneamente | Exactamente 2 Propietarios ACTIVOS | Dos salidas concurrentes | Como máximo una puede dejar al actor INACTIVO; nunca quedan 0 Propietarios ACTIVOS. |
| `TC-MEM-038` | Desactivación y degradación concurrentes | 2 Propietarios ACTIVOS | Una desactiva A y otra degrada B | Resultado final debe conservar `>=1` Propietario ACTIVO. |
| `TC-MEM-039` | Dos reactivaciones concurrentes | Una membresía INACTIVA | Reactivar simultáneamente | Una única membresía histórica; no duplicados ni overwrite silencioso. |
| `TC-MEM-040` | Reactivación vs. operación obsoleta | Estado cambia concurrentemente | Operaciones cruzadas | Ninguna confirma usando un estado previo inválido sin detección/revalidación. |
| `TC-MEM-041` | Cambio de Rol vs. desactivación | Miembro ACTIVO | Operaciones concurrentes | No confirmar cambio de Rol sobre una membresía que ya quedó INACTIVA. |
| `TC-MEM-042` | UI prevalidó pero contexto cambió | Precheck válido | Otro proceso modifica Propietarios | Confirmación vuelve a proteger la invariante. |
| `TC-MEM-043` | Rol de INACTIVO no autoriza | `INACTIVO/PROPIETARIO` | Operación administrativa | Rechazo. |
| `TC-MEM-044` | Cuenta global y membresía independientes | Usuario con varias membresías | Inactivar una membresía | Las otras membresías no cambian automáticamente. |
| `TC-MEM-045` | Reincorporación conserva identidad | Membresía histórica INACTIVA | Reactivar | El identificador de `UsuarioNegocio` sigue siendo el mismo. |
| `TC-MEM-046` | Desactivación conserva último Rol | `ACTIVO/ENCARGADO` | Desactivar | Queda `INACTIVO/ENCARGADO`. |
| `TC-MEM-047` | Reactivación sobrescribe Rol histórico | `INACTIVO/ENCARGADO` | Reactivar como `TRABAJADOR` | Queda `ACTIVO/TRABAJADOR`. |
| `TC-MEM-048` | `fechaIncorporacion` original | Membresía histórica | Desactivar y reactivar | `fechaIncorporacion` original no se reescribe. |
| `TC-MEM-049` | Salida voluntaria reutiliza guardia | Único Propietario | Abandonar | Se rechaza por la misma invariante que una desactivación administrativa. |
| `TC-MEM-050` | No existe cierre implícito | Único Propietario | Intentar abandonar esperando cerrar Negocio | Rechazo; M01 no inventa `EstadoNegocio` ni cierre automático. |

---

## 8.1. Pruebas de propiedades e invariantes

Además de casos individuales, la implementación debería probar propiedades generales.

### Propiedad A — Nunca cero Propietarios activos

Después de cualquier operación válida sobre un Negocio existente:

```text
cantidad(
  UsuarioNegocio
  donde estado = ACTIVO
  y rol = PROPIETARIO
) >= 1
```

---

### Propiedad B — Unicidad histórica

Para cada:

```text
Usuario + Negocio
```

existe como máximo:

```text
1 UsuarioNegocio histórica
```

---

### Propiedad C — INACTIVO no autoriza

Para cualquier operación que requiera membresía operativa:

```text
estado = INACTIVO
→ autorización por esa membresía = false
```

aunque:

```text
rol = PROPIETARIO
```

---

### Propiedad D — Reactivación conserva identidad

Para toda secuencia:

```text
ACTIVO → INACTIVO → ACTIVO
```

la identidad de `UsuarioNegocio` permanece estable.

---

### Propiedad E — Cambio de Rol no cambia Estado

Para todo cambio de Rol permitido:

```text
estado antes = ACTIVO
estado después = ACTIVO
```

---

### Propiedad F — Concurrencia no rompe invariantes

Ningún interleaving válido de:

```text
desactivar;
abandonar;
degradar Propietario;
reactivar;
```

puede producir:

```text
0 Propietarios activos
```

o:

```text
dos membresías históricas para Usuario + Negocio.
```

---

# 9. Decisiones Técnicas Abiertas

Este documento congela reglas de dominio.

No congela todavía los mecanismos concretos de implementación.

---

## 9.1. Persistencia y concurrencia

Queda abierto:

```text
optimistic locking;
pessimistic locking;
SELECT FOR UPDATE;
version column;
nivel de aislamiento;
serializable;
constraint SQL;
índice;
Unit of Work;
otra estrategia equivalente.
```

La solución elegida debe preservar obligatoriamente:

```text
>= 1 PROPIETARIO ACTIVO;
unicidad histórica Usuario + Negocio;
consistencia ante reactivaciones concurrentes.
```

---

## 9.2. Errores técnicos

No se define todavía:

```text
clases exactas de excepción;
Result types;
error codes internos;
409 vs 422;
payload API;
mensajes finales de frontend.
```

La semántica sí queda definida:

```text
operación inválida
→ rechazo explícito
→ sin mutación parcial.
```

---

## 9.3. Notificaciones

Queda abierto:

```text
email;
notificación interna;
evento de aplicación;
Domain Event;
cola;
procesamiento síncrono/asíncrono;
ninguna notificación en MVP.
```

La notificación no forma parte del estado de la membresía.

---

## 9.4. Auditoría y motivos

No se decide todavía si existirán:

```text
motivoDesactivacion;
fechaDesactivacion;
fechaReactivacion;
actorDesactivacion;
historialRol;
audit log;
Domain Events.
```

Si se agregan posteriormente:

```text
NO deben multiplicar artificialmente EstadoMembresia;
NO deben convertir UsuarioNegocio en un log de eventos;
NO deben alterar la semántica ACTIVO/INACTIVO.
```

---

## 9.5. Alta administrativa directa

El dominio admite conceptualmente la operación:

```text
incorporarOReactivarMiembro(usuario, rolInicial)
```

con:

```text
rolInicial ∈ {ENCARGADO, TRABAJADOR}
```

El contrato UX/API exacto para distinguir:

```text
invitación;
alta administrativa;
reactivación administrativa;
```

se definirá posteriormente.

Todas las vías deben converger en las mismas invariantes de dominio.

---

## 9.6. Cierre futuro del Negocio

M01/Bloque 1 no define:

```text
EstadoNegocio
cerrarNegocio()
desactivarNegocio()
```

Si se incorpora en el futuro, deberá analizarse explícitamente cómo interactúa con:

```text
UsuarioNegocio;
invariante de Propietario;
acceso histórico;
reactivación.
```

No debe inferirse desde este documento.

---

# 10. Checklist para Implementación Asistida por IA

Antes de considerar correcta una implementación futura, verificar:

```text
[ ] EstadoMembresia contiene únicamente ACTIVO/INACTIVO.
[ ] INACTIVO no se usa para vacaciones/licencias.
[ ] No se crean subestados por motivo de baja.
[ ] Usuario y UsuarioNegocio no comparten el mismo concepto de estado.
[ ] Rol pertenece a UsuarioNegocio, no a Usuario.
[ ] Una membresía INACTIVA no autoriza operaciones.
[ ] Existe una única membresía histórica Usuario + Negocio.
[ ] No hay hard delete funcional de UsuarioNegocio.
[ ] Reactivación reutiliza la misma entidad.
[ ] Desactivación conserva último Rol.
[ ] Reactivación exige Rol explícito ENCARGADO/TRABAJADOR.
[ ] Reactivación no restaura automáticamente el Rol anterior.
[ ] Incorporación/reactivación no asigna PROPIETARIO.
[ ] Promoción a PROPIETARIO es explícita.
[ ] Cambiar Rol no cambia EstadoMembresia.
[ ] No se cambia Rol mientras INACTIVO.
[ ] No existen ACTIVO→ACTIVO o INACTIVO→INACTIVO silenciosos.
[ ] Salida voluntaria reutiliza la misma regla estructural de desactivación.
[ ] Actor administrativo debe ser PROPIETARIO ACTIVO.
[ ] Actor y objetivo pertenecen al mismo Negocio.
[ ] Nunca queda un Negocio con 0 PROPIETARIOS ACTIVOS.
[ ] Último Propietario no puede desactivarse ni degradarse.
[ ] La protección del último Propietario funciona bajo concurrencia.
[ ] Las prevalidaciones UX no sustituyen la confirmación segura.
[ ] Reactivaciones concurrentes no duplican membresías.
[ ] Cambio de Rol concurrente no modifica miembro ya INACTIVO.
[ ] Aceptación de invitación reutiliza reglas de reincorporación.
[ ] Invitación no cambia Rol de miembro ya ACTIVO.
[ ] fechaIncorporacion original no se sobrescribe al reactivar.
[ ] Trazabilidad no se confunde con estado.
[ ] No se inventó EstadoNegocio/cierre.
[ ] Dominio no depende de HTTP.
[ ] Dominio no depende de SQL/ORM.
[ ] No se congeló locking concreto prematuramente.
[ ] No se introdujo infraestructura innecesaria.
```

---

# 11. Contrato Semántico Mínimo para una IA

Si una IA necesita implementar M01 y no puede procesar todo este documento de una vez, debe preservar como mínimo estas reglas:

```text
1. EstadoMembresia = ACTIVO | INACTIVO.

2. UsuarioNegocio es única históricamente
   por Usuario + Negocio.

3. INACTIVO no elimina la entidad
   ni autoriza operaciones.

4. ACTIVO → INACTIVO
   conserva el último Rol.

5. INACTIVO → ACTIVO
   reutiliza la misma entidad
   y exige un nuevo rolInicial explícito
   ENCARGADO o TRABAJADOR.

6. Incorporación/reactivación normal
   nunca asigna PROPIETARIO.

7. PROPIETARIO se obtiene únicamente
   mediante promoción explícita.

8. Cambiar Rol no cambia EstadoMembresia.

9. No cambiar Rol mientras INACTIVO.

10. No aceptar ACTIVO→ACTIVO
    ni INACTIVO→INACTIVO
    como no-op silencioso.

11. Un Negocio existente debe conservar siempre
    >= 1 PROPIETARIO ACTIVO.

12. El último Propietario no puede:
    - desactivarse;
    - abandonar;
    - ser desactivado;
    - degradarse.

13. Salida voluntaria reutiliza
    la misma regla estructural
    que desactivarMiembro().

14. Actor administrativo:
    PROPIETARIO + ACTIVO + mismo Negocio.

15. Cross-tenant:
    siempre rechazar.

16. La persistencia debe proteger
    las invariantes también bajo concurrencia.

17. No hard delete funcional de UsuarioNegocio.

18. No inventar EstadoNegocio/cierre
    en Bloque 1.

19. No mezclar HTTP/SQL/ORM
    con reglas de dominio.

20. La implementación debe adaptarse
    a estas invariantes, no al revés.
```

---

# 12. Regla Final para Implementación Asistida por IA

Una IA debe interpretar este documento mediante el siguiente principio:

> **`UsuarioNegocio` representa una relación histórica y contextual estable entre un Usuario y un Negocio. Su Estado indica si esa relación está actualmente operativa; su Rol indica la responsabilidad contextual del miembro. Las operaciones que modifican membresías deben preservar la unicidad histórica, el aislamiento entre Negocios y la existencia de al menos un Propietario activo, incluso bajo concurrencia.**

En forma resumida:

```text
UsuarioNegocio
→ identidad histórica
→ EstadoMembresia
→ Rol contextual
→ consultas locales

Negocio
→ conjunto de membresías
→ último Propietario
→ cambios de Rol
→ desactivación
→ incorporación/reactivación

Caso de Uso
→ autenticación
→ autorización
→ tenant actual
→ intención del actor
→ coordinación entre entidades
→ efectos externos

Persistencia
→ integridad
→ concurrencia
→ unicidad
→ última línea de defensa

Arquitectura
→ mecanismo técnico
```

La implementación debe adaptarse a estas invariantes.

Las invariantes no deben degradarse accidentalmente para adaptarse a una implementación conveniente.

---

# 13. Estado Documental

Estado semántico del documento:

```text
05-m01-estados-membresia.md
✅ LISTO PARA DERIVAR Y VALIDAR EL DIAGRAMA 5
```

El estado:

```text
CONGELADO Y SINCRONIZADO
```

se asignará en la revisión transversal final del Bloque 1, después de:

```text
05-m01-estados-membresia.puml;
06-m02-estados-articulo;
secuencias críticas;
revisión cruzada final.
```
