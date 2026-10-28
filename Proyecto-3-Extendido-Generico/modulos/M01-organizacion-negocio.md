# 01 — Módulo de Organización del Negocio

## 1. Propósito y Alcance

### 1.1. Propósito

El módulo **M01 — Organización del Negocio** administra la identidad de las personas que utilizan la plataforma, su pertenencia a uno o más negocios, los roles que poseen dentro de cada uno y la configuración inicial necesaria para adaptar la experiencia de uso.

Debe permitir responder claramente:

```text
¿Quién utiliza la plataforma?
        ↓
Usuario

¿A qué negocio pertenece?
        ↓
UsuarioNegocio

¿Qué puede hacer en ese negocio?
        ↓
Rol

¿Qué tipo de actividad realiza el negocio?
        ↓
Modalidades operativas

¿Cómo se incorpora otra persona?
        ↓
InvitacionNegocio
```

M01 constituye la base de seguridad funcional y aislamiento por negocio sobre la cual operan los demás módulos.

---

### 1.2. Alcance

El módulo incluye:

- registro de usuarios;
- inicio de sesión;
- existencia de usuarios sin negocio asociado;
- creación de negocios;
- asociación entre usuarios y negocios;
- selección del negocio sobre el cual se desea operar;
- roles;
- invitaciones;
- incorporación de colaboradores;
- cambio de roles;
- promoción de otros propietarios;
- desactivación lógica de membresías;
- reactivación de antiguos miembros;
- configuración de modalidades operativas;
- moneda base inicial;
- orientación progresiva para completar la configuración necesaria.

---

### 1.3. Fuera del Alcance de M01

No corresponde a este módulo definir:

- artículos;
- categorías;
- proveedores;
- inventario;
- ubicaciones físicas;
- medios de pago;
- ventas;
- caja;
- producción;
- recetas;
- analítica.

Estos conceptos pertenecen a sus respectivos módulos.

M01 puede consultar si esas configuraciones existen para orientar al usuario durante el onboarding, pero **no deberá crear datos ficticios pertenecientes a otros módulos**.

---

### 1.4. Prioridad

**MUST HAVE**

M01 es necesario para el funcionamiento del resto de la plataforma.

---

# 2. Actores

## 2.1. Usuario no autenticado

Persona que todavía no inició sesión.

Puede:

- registrarse;
- iniciar sesión;
- acceder a una invitación recibida;
- comenzar el registro desde una invitación.

---

## 2.2. Usuario autenticado

Persona que inició sesión correctamente.

Puede:

- consultar negocios a los que pertenece;
- consultar invitaciones recibidas;
- crear un negocio;
- aceptar o rechazar invitaciones;
- ingresar a un negocio autorizado.

Un Usuario puede existir sin pertenecer a ningún Negocio.

---

## 2.3. Propietario

Usuario con rol:

```text
PROPIETARIO
```

dentro de un negocio determinado.

Puede:

- administrar miembros;
- emitir invitaciones;
- cancelar invitaciones;
- modificar roles;
- promover otro miembro a Propietario;
- desactivar membresías;
- configurar modalidades del negocio.

---

## 2.4. Encargado

Usuario con rol:

```text
ENCARGADO
```

Posee acceso operativo avanzado, pero no administra estructuralmente las membresías ni los propietarios.

---

## 2.5. Trabajador

Usuario con rol:

```text
TRABAJADOR
```

Posee acceso operativo según las reglas generales definidas para la plataforma.

---

# 3. Modelo Conceptual

La estructura principal es:

```text
┌───────────────────┐
│      Usuario      │
│   Cuenta global   │
└─────────┬─────────┘
          │
          │ 0..N
          ▼
┌───────────────────┐
│  UsuarioNegocio   │
│ Membresía + Rol   │
└─────────┬─────────┘
          │
          │ N..1
          ▼
┌───────────────────┐
│      Negocio      │
│ Organización      │
└───────────────────┘


Usuario
   │
   │ puede recibir
   ▼
┌─────────────────────┐
│ InvitacionNegocio   │
│ incorporación       │
└─────────────────────┘
```

Conceptualmente:

```text
Usuario 1 ─── N UsuarioNegocio N ─── 1 Negocio
```

Por lo tanto:

> el rol pertenece a la relación entre Usuario y Negocio, no directamente al Usuario.

`InvitacionNegocio` se vincula inicialmente al destinatario mediante `emailDestino` y puede existir antes de que ese destinatario posea un `Usuario`.

Por lo tanto, no debe modelarse una relación obligatoria:

```text
InvitacionNegocio → Usuario destinatario
```

al momento de emisión.


---

# 4. Conceptos del Dominio

## 4.1. Usuario

Representa la identidad global de una persona dentro de la plataforma.

Información conceptual mínima:

- identificador estable;
- nombre;
- email (`Email`);
- estado de cuenta conceptual;
- fecha de registro.

El email funciona como identidad funcional principal para el MVP.

La autenticación mediante contraseña pertenece a la capacidad de acceso/IAM y **no debe interpretarse como obligación de almacenar contraseña, hash, JWT o cualquier credencial técnica dentro de la entidad conceptual `Usuario`**.

Un Usuario puede:

```text
0 negocios
1 negocio
varios negocios
```

Ejemplo:

```text
María
│
├── WALOS
│     Rol: PROPIETARIO
│
└── Centro Mascota
      Rol: TRABAJADOR
```

Durante el MVP no se define un Caso de Uso para cambiar el email principal de una cuenta. Si esta capacidad se incorpora posteriormente deberá revisarse explícitamente su impacto sobre identidad, invitaciones pendientes y seguridad.

El ciclo técnico de autenticación, almacenamiento seguro de credenciales, sesiones y recuperación de acceso se definirá posteriormente en Arquitectura/IAM.

El ciclo de vida exacto de `estado de cuenta` tampoco queda definido en M01 en esta etapa. No debe inventarse un enum `EstadoCuenta` ni endpoints de activación/desactivación hasta que exista una especificación explícita.

---

## 4.2. Negocio

Representa una organización, emprendimiento o comercio administrado mediante la plataforma.

Información conceptual inicial:

- identificador estable;
- nombre;
- rubro opcional;
- moneda base;
- modalidades operativas.

### Datos de creación

```text
Nombre       → obligatorio
Rubro        → opcional
Moneda       → ARS en el MVP
Modalidades  → una o más
```

M01 **no define todavía un ciclo de vida `ACTIVO/INACTIVO` para `Negocio`**.

Por lo tanto, una implementación futura no debe inventar:

```text
EstadoNegocio
cerrarNegocio()
desactivarNegocio()
```

ni un campo persistente de estado a partir de este documento.

Las referencias funcionales a un Negocio “disponible”, “seleccionado” u “operable” describen contexto de uso, no un enum de dominio ya aprobado.

### 4.2.1. Incorporación y Reactivación de Membresías

La incorporación de una persona a un Negocio se expresa conceptualmente mediante la operación de dominio:

```text
Negocio.incorporarOReactivarMiembro(
    usuario : Usuario,
    rolInicial : Rol,
    membresiaHistorica : UsuarioNegocio [0..1]
) : UsuarioNegocio
```

La firma refleja una separación explícita de responsabilidades:

```text
Application
→ consulta la membresía histórica mediante persistencia
→ entrega Usuario + rolInicial + membresiaHistorica opcional al dominio

Negocio
→ NO consulta repositories
→ protege las invariantes de incorporación/reactivación
```

El `rolInicial` aceptado por esta operación utiliza una whitelist cerrada:

```text
{ ENCARGADO, TRABAJADOR }
```

No debe implementarse simplemente como:

```text
rolInicial != PROPIETARIO
```

porque una extensión futura del enum `Rol` podría habilitar accidentalmente roles no previstos para incorporación normal.

Comportamiento:

```text
membresiaHistorica = null
→ crear exactamente una nueva UsuarioNegocio
→ estado = ACTIVO
→ rol = rolInicial
```

```text
membresiaHistorica.estado = INACTIVO
→ reutilizar la MISMA UsuarioNegocio histórica
→ estado = ACTIVO
→ rol = rolInicial
```

```text
membresiaHistorica.estado = ACTIVO
→ RECHAZAR
→ NO duplicar
→ NO cambiar Rol silenciosamente
```

Si se proporciona `membresiaHistorica`, `Negocio` debe revalidar que corresponda:

- al mismo `Usuario`;
- al mismo `Negocio`.

Una membresía histórica incoherente no debe corregirse, reasignarse ni reutilizarse silenciosamente.

La operación anterior es responsable de la **incorporación/reactivación**. No reemplaza otras operaciones explícitas del ciclo de vida, como:

```text
desactivarMiembro(...)
cambiarRolMiembro(...)
```

La promoción a `PROPIETARIO` continúa siendo una operación deliberada separada.

---

## 4.3. UsuarioNegocio

Representa la participación histórica de un Usuario dentro de un Negocio.

Contiene conceptualmente:

- Usuario;
- Negocio;
- Rol;
- estado de membresía;
- fecha de incorporación.

Roles posibles:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

Estados de membresía durante el MVP (`EstadoMembresia`):

```text
ACTIVO
INACTIVO
```

Para una misma combinación:

```text
Usuario + Negocio
```

existe una única membresía conceptual histórica.

Por lo tanto:

```text
reincorporar
≠
crear una segunda UsuarioNegocio
```

La relación se conserva aunque el Usuario deje de participar activamente del Negocio.

La transición:

```text
ACTIVO → INACTIVO
```

desactiva la participación sin eliminar la relación.

La transición:

```text
INACTIVO → ACTIVO
```

reactiva la misma membresía histórica.

Cuando la reactivación ocurre como consecuencia de una nueva invitación aceptada, se aplica el `rolPropuesto` de dicha invitación.

Una membresía ya `ACTIVA`:

- no debe duplicarse;
- no debe “reactivarse” nuevamente;
- no debe cambiar silenciosamente de rol mediante una invitación.

---

## 4.4. InvitacionNegocio

Representa una propuesta formal para incorporar a una persona a un Negocio.

Puede existir aunque el destinatario todavía no posea una cuenta.

Información conceptual:

- Negocio;
- email destino (`Email`);
- rol propuesto;
- identificador seguro de invitación;
- estado;
- fecha de emisión;
- fecha de expiración;
- membresía emisora (`UsuarioNegocio`).

Estados:

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

`PENDIENTE` significa que el ciclo de vida todavía no fue cerrado mediante un estado terminal.

Importante:

```text
PENDIENTE
NO implica por sí sola vigencia temporal.
```

La vigencia se determina conceptualmente mediante:

```text
estaVigente(ahora)
⇔
ahora < fechaExpiracion
```

En consecuencia:

```text
ahora >= fechaExpiracion
→ invitación no vigente
```

Debe cumplirse:

```text
fechaExpiracion > fechaEmision
```

`fechaExpiracion` se fija al emitir la invitación.

Un cambio posterior en la política general de duración de invitaciones **no modifica retroactivamente** la fecha de expiración de invitaciones ya emitidas.

La duración concreta y la representación técnica del tiempo se decidirán posteriormente.

La invitación protege localmente:

- su estado;
- su vigencia temporal;
- la identidad destinataria cuando corresponda;
- la validez de sus propias transiciones.

Las reglas que requieren consultar otras membresías, invitaciones, autorización o pertenencia al Negocio son guardias contextuales coordinadas por el Caso de Uso.

---

## 4.5. Rol

Los roles generales son:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

Un mismo Usuario puede poseer diferentes roles según el Negocio.

---

## 4.6. Modalidades Operativas

Las modalidades permiten indicar qué actividades realiza habitualmente el negocio.

Inicialmente:

```text
REVENTA
PRODUCCION
SERVICIOS
```

Pueden combinarse.

Ejemplos:

```text
WALOS

✓ REVENTA
✓ PRODUCCION
☐ SERVICIOS
```

```text
Puesto de ropa

✓ REVENTA
☐ PRODUCCION
☐ SERVICIOS
```

```text
Maquilladora

☐ REVENTA
☐ PRODUCCION
✓ SERVICIOS
```

```text
Peluquería canina

✓ REVENTA
☐ PRODUCCION
✓ SERVICIOS
```

Las modalidades sirven para adaptar:

- pantalla inicial;
- navegación;
- onboarding;
- accesos rápidos;
- recomendaciones de configuración.

No constituyen restricciones permanentes del dominio.

---


## 4.7. Email

`Email` se interpreta conceptualmente como un Value Object utilizado para identidad funcional.

Se utiliza al menos en:

```text
Usuario.email
InvitacionNegocio.emailDestino
```

Las comparaciones funcionales deben utilizar una única semántica consistente.

Debe evitarse distribuir por el sistema comparaciones ad hoc como:

```text
lower(trim(email))
```

en múltiples capas.

La normalización exacta:

```text
case folding
Unicode
espacios
tratamiento de proveedor
```

se decidirá posteriormente.

M01 exige solamente que:

- la misma semántica se utilice para unicidad de Usuario;
- la misma semántica se utilice para destinatarios de invitación;
- la persistencia pueda proteger esas invariantes ante concurrencia.

No asumir reglas específicas de proveedores, por ejemplo equivalencia automática de puntos o alias `+tag`, sin una decisión explícita.


---

# 5. Autenticación del MVP

Desde la experiencia funcional, el MVP utiliza:

```text
Email
+
Contraseña
```

Cada persona administra sus propias credenciales.

Un Propietario nunca crea, conoce ni comparte la contraseña de otro Usuario.

Sin embargo:

```text
Email + Contraseña
```

describe el **mecanismo funcional de acceso**, no el modelo interno de almacenamiento de credenciales.

La implementación deberá cumplir como mínimo:

- nunca almacenar contraseñas en texto plano;
- utilizar almacenamiento de credenciales mediante técnicas seguras vigentes;
- no exponer hashes, tokens o secretos al dominio funcional;
- utilizar mensajes de autenticación que no filtren información sensible;
- separar autenticación de autorización contextual por Negocio.

No se congela todavía:

```text
algoritmo de hashing
proveedor IAM
JWT
cookies
sesiones
refresh tokens
OAuth
```

Estas decisiones pertenecen a Arquitectura y Seguridad.

El `Usuario` conceptual no debe convertirse en un contenedor de detalles técnicos de autenticación.

---

## 5.1. Evoluciones Futuras

Podrán evaluarse posteriormente:

- recuperación de contraseña;
- validación adicional de email;
- cambio de email principal;
- PIN de acceso rápido;
- autenticación multifactor;
- autenticación biométrica;
- otros proveedores de identidad.

Estas funcionalidades no deberán condicionar el diseño funcional del MVP.

Si se incorpora cambio de email, deberá revisarse explícitamente el impacto sobre invitaciones pendientes e identidad funcional.

---

# 6. Invitaciones y Canales de Distribución

## 6.1. Principio

La invitación pertenece al dominio de M01.

El **canal utilizado para compartirla es independiente de la invitación**.

```text
InvitacionNegocio
        ↓
Referencia / enlace de invitación
        │
        ├── Compartir por WhatsApp
        ├── Copiar enlace
        └── Otros canales futuros
```

Compartir una invitación:

```text
NO constituye una transición de estado.
```

---

## 6.2. WhatsApp en el MVP

Para el MVP se priorizará:

```text
Generar invitación
        ↓
Obtener enlace
        ↓
[ Compartir por WhatsApp ]
```

La aplicación podrá preparar un mensaje como:

```text
María te invitó a formar parte de WALOS.

Rol propuesto: Trabajador.

Usá este enlace para registrarte o iniciar sesión
y aceptar la invitación:

[enlace de invitación]
```

La acción abre WhatsApp o el mecanismo de compartición disponible para que el Propietario elija el contacto y envíe el mensaje.

El envío efectivo queda bajo control del Usuario.

---

## 6.3. Sin Integración Automática con WhatsApp

El MVP **no requiere**:

- WhatsApp Business API;
- bots;
- envío automático de mensajes;
- plantillas aprobadas externamente;
- almacenamiento obligatorio del número telefónico del invitado.

Por lo tanto:

```text
MVP
→ obtener enlace
→ compartir manualmente
```

Una integración automática podrá incorporarse posteriormente sin modificar el ciclo de vida de `InvitacionNegocio`.

---

## 6.4. Identidad de la Invitación

WhatsApp es únicamente un canal de distribución.

La identidad funcional del destinatario continúa siendo:

```text
emailDestino : Email
```

Ejemplo:

```text
Invitación:
emailDestino = maria@email.com

Enlace enviado a María
```

Al aceptar:

```text
Usuario autenticado:
maria@email.com

→ identidad potencialmente coincidente
```

En cambio:

```text
Usuario autenticado:
juan@email.com

→ aceptación rechazada
```

La comparación debe respetar la equivalencia funcional del Value Object `Email`.

La normalización técnica exacta se definirá posteriormente.

Poseer el enlace no es suficiente para apropiarse de una invitación enviada a otra identidad.

---

## 6.5. Identificador Seguro

Toda invitación debe poder resolverse mediante un identificador público suficientemente impredecible.

No debe utilizarse como único secreto público:

```text
ID incremental
email
Negocio ID predecible
```

Poseer ese identificador:

```text
NO equivale a estar autorizado.
```

Para aceptar continúan siendo necesarias las validaciones de estado, vigencia, autenticación e identidad.

La estrategia concreta de token, UUID, hash o almacenamiento queda abierta a Arquitectura y Seguridad.

Antes de autenticación, una pantalla abierta desde el enlace no debe exponer información sensible del Negocio más allá de lo estrictamente necesario para orientar el flujo de acceso.


---

## 6.6. Reenvío

Reenviar o compartir nuevamente una invitación `PENDIENTE` y vigente:

```text
utiliza la misma InvitacionNegocio
```

No debe:

- crear una nueva invitación;
- cambiar el estado;
- cambiar `rolPropuesto`;
- extender `fechaExpiracion`.

Si se necesita una nueva ventana temporal:

```text
cancelar / expirar la invitación anterior
+
emitir una nueva
```

Si se necesita cambiar `rolPropuesto`:

```text
cancelar la invitación existente
+
emitir una nueva
```

La rotación o reutilización técnica del token/enlace no se define en este módulo.

---

# 7. Preparación Progresiva del Negocio

Crear un Negocio no significa que todos los módulos estén inmediatamente configurados.

El sistema utilizará un **checklist de preparación derivado**, en lugar de guardar un estado rígido artificial.

Ejemplo:

```text
Configuración inicial

✓ Negocio creado
✓ Modalidades seleccionadas
○ Crear primera ubicación
○ Configurar medios de pago
○ Crear catálogo
```

---

## 7.1. Preparación Dependiente de la Funcionalidad

No existe una única condición universal de “negocio listo”.

Cada funcionalidad puede poseer requisitos diferentes.

Ejemplo:

```text
Para utilizar Inventario:
→ ubicación
→ artículo que controle stock
```

```text
Para producir:
→ modalidad/producto correspondiente
→ configuración productiva necesaria
```

```text
Para vender:
→ artículo o servicio vendible
→ configuración necesaria para registrar el pago
```

M01 podrá mostrar el avance, pero cada módulo es responsable de establecer sus propias precondiciones.

---

## 7.2. Sin Datos Ficticios

M01 no deberá crear automáticamente elementos como:

```text
"Local Principal"
"Efectivo"
"Producto inicial"
```

únicamente para completar el onboarding.

En cambio, orientará al usuario hacia la configuración correspondiente.

---

# 8. Requisitos Funcionales

| ID | Título | Descripción | Actor | Criterio de Aceptación |
| :--- | :--- | :--- | :--- | :--- |
| **RF-ORG-001** | Registrar Usuario | Permitir crear una cuenta global mediante nombre, email y contraseña desde la experiencia de acceso. | Usuario no autenticado | Se crea una cuenta válida con Email funcionalmente único sin requerir pertenencia a un Negocio. |
| **RF-ORG-002** | Iniciar Sesión | Permitir autenticarse mediante email y contraseña. | Usuario | Credenciales válidas permiten iniciar sesión según la política de cuenta/IAM vigente; no se filtran detalles sensibles ante fallos. |
| **RF-ORG-003** | Crear Negocio | Permitir a un Usuario autenticado crear un Negocio. | Usuario | Se registra nombre, rubro opcional, moneda ARS y modalidades; Negocio + primera membresía `ACTIVA/PROPIETARIO` se confirman de forma atómica. |
| **RF-ORG-004** | Configurar Modalidades | Permitir definir una o más modalidades operativas. | Propietario | El Negocio conserva las modalidades seleccionadas y la interfaz puede adaptarse a ellas. |
| **RF-ORG-005** | Consultar Negocios e Invitaciones | Mostrar las membresías activas y las invitaciones correspondientes al Usuario. | Usuario | El Usuario visualiza sus Negocios con membresía `ACTIVA` y las invitaciones destinadas funcionalmente a su Email. |
| **RF-ORG-006** | Invitar Miembro | Permitir invitar una persona mediante email y rol propuesto. | Propietario | Se crea una `InvitacionNegocio` `PENDIENTE` para `ENCARGADO` o `TRABAJADOR`, con `fechaExpiracion` fija, destinatario sin membresía `ACTIVA` y sin otra `PENDIENTE` vigente equivalente. |
| **RF-ORG-007** | Compartir / Reenviar Invitación | Permitir obtener y compartir nuevamente una invitación. | Propietario | Puede compartirse la misma invitación vigente por WhatsApp o enlace; reenviar no crea otra `InvitacionNegocio`, no cambia el rol ni extiende `fechaExpiracion`. |
| **RF-ORG-008** | Aceptar Invitación | Permitir aceptar una invitación válida destinada al Usuario autenticado. | Usuario invitado | Solo una `PENDIENTE` vigente e identificada con el Email correcto puede aceptarse; se consulta la membresía histórica por `Usuario + Negocio`, una `ACTIVA` provoca rechazo, una `INACTIVA` se reutiliza, y aceptación + incorporación/reactivación se confirman como una única postcondición funcional. |
| **RF-ORG-009** | Rechazar Invitación | Permitir al destinatario rechazar una invitación. | Usuario invitado | Solo una `PENDIENTE` vigente destinada a esa identidad puede pasar a `RECHAZADA`; no se crea ni reactiva membresía. |
| **RF-ORG-010** | Cancelar Invitación | Permitir retirar una invitación pendiente. | Propietario | Un `PROPIETARIO` con membresía `ACTIVA` del mismo Negocio puede pasar una invitación `PENDIENTE` a `CANCELADA`; no se exige que continúe vigente. |
| **RF-ORG-011** | Entrar a un Negocio | Permitir seleccionar un Negocio donde el Usuario posea membresía activa. | Usuario | Se establece el contexto del Negocio y los permisos correspondientes al rol. |
| **RF-ORG-012** | Consultar Miembros | Permitir visualizar los integrantes y roles del Negocio. | Miembro autorizado | Se muestran miembros, roles y estados relevantes. |
| **RF-ORG-013** | Modificar Rol | Permitir modificar el rol de un miembro. | Propietario | Se actualiza el rol respetando la invariante del último Propietario. |
| **RF-ORG-014** | Promover Propietario | Permitir promover deliberadamente otro miembro activo a `PROPIETARIO`. | Propietario | El Negocio puede poseer múltiples propietarios activos. |
| **RF-ORG-015** | Desactivar Membresía | Permitir desactivar lógicamente la participación de un Usuario. | Propietario | `UsuarioNegocio` pasa de `ACTIVO` a `INACTIVO` y el historial se conserva. |
| **RF-ORG-016** | Reactivar Membresía | Permitir reincorporar a un antiguo miembro mediante una nueva invitación. | Propietario / Usuario invitado | Se reutiliza la misma membresía histórica, pasa a `ACTIVO` y adopta el `rolPropuesto` de la invitación aceptada. |
| **RF-ORG-017** | Consultar Preparación | Mostrar qué configuraciones adicionales resultan necesarias para las funcionalidades elegidas. | Miembro | El sistema presenta un checklist derivado sin crear datos ficticios. |

---

# 9. Reglas de Negocio

## `RN-ORG-001` — Invariante de Propietario Activo

Mientras M01 no defina un ciclo formal de cierre/eliminación del Negocio, todo Negocio debe conservar al menos un `UsuarioNegocio`:

```text
estado = ACTIVO
rol = PROPIETARIO
```

No se podrá confirmar una operación que deje:

```text
0 UsuarioNegocio con estado = ACTIVO y rol = PROPIETARIO
```

Esto aplica, entre otras, a:

- desactivación de membresía;
- degradación de rol;
- una futura operación de salida del Negocio.

La verificación debe realizarse dentro de la misma frontera de consistencia que la mutación.

Una consulta previa de UI no constituye garantía definitiva.

---

## `RN-ORG-002` — Rol Dependiente del Negocio

El Rol pertenece a `UsuarioNegocio`, no a `Usuario`.

Un mismo Usuario puede poseer roles diferentes en distintos Negocios.

---

## `RN-ORG-003` — Cuenta Global Independiente

Un Usuario puede existir sin pertenecer a ningún Negocio.

Puede:

- iniciar sesión;
- consultar invitaciones;
- crear un Negocio.

No puede realizar operaciones de un Negocio hasta poseer una membresía `ACTIVA` autorizada para ese contexto.

---

## `RN-ORG-004` — Independencia de Membresías

Desactivar una membresía significa:

```text
UsuarioNegocio.estado
ACTIVO → INACTIVO
```

Afecta únicamente la participación en ese Negocio.

No debe afectar:

- la cuenta global;
- membresías en otros Negocios;
- operaciones históricas.

`INACTIVO` es un estado de dominio.

No debe inferirse automáticamente que la persistencia utilice un campo técnico `deleted_at` o un mecanismo genérico de soft-delete.

---

## `RN-ORG-005` — Membresía Histórica Única y Reactivación

Para una misma combinación:

```text
Usuario + Negocio
```

existe una única `UsuarioNegocio` conceptual histórica.

El Caso de Uso que necesita incorporar o reincorporar a una persona debe resolver primero, mediante persistencia:

```text
membresiaHistorica : UsuarioNegocio | null
```

y entregar ese resultado al dominio.

Conceptualmente:

```text
Application
→ buscar membresía histórica por Usuario + Negocio
→ Negocio.incorporarOReactivarMiembro(
      usuario,
      rolInicial,
      membresiaHistorica
  )
```

`Negocio` no consulta repositories para descubrir la membresía.

La operación debe defender nuevamente:

```text
rolInicial ∈ {ENCARGADO, TRABAJADOR}
```

y, cuando existe `membresiaHistorica`, debe comprobar que corresponde:

```text
al mismo Usuario
+
al mismo Negocio
```

Si no existe membresía histórica:

```text
null
↓
crear exactamente una UsuarioNegocio
estado = ACTIVO
rol = rolInicial
```

Si la membresía se encuentra:

```text
INACTIVO
```

una nueva incorporación no crea otra relación.

Al aceptar una invitación válida:

```text
UsuarioNegocio existente
estado = INACTIVO

        ↓

MISMA identidad histórica
estado = ACTIVO
rol = rolPropuesto de la nueva invitación
```

El rol anterior no se recupera automáticamente.

Si la membresía ya está `ACTIVA`:

```text
NO duplicar;
NO reactivar;
NO cambiar rol mediante invitación;
RECHAZAR la incorporación.
```

Una membresía histórica perteneciente a otro Usuario o a otro Negocio también debe provocar rechazo explícito.

La persistencia debe actuar como defensa final frente a carreras concurrentes que intenten crear o activar más de una membresía para la misma combinación `Usuario + Negocio`.

---

## `RN-ORG-006` — Vinculación Estricta de Invitaciones

Una `InvitacionNegocio` solo puede aceptarse o rechazarse por la identidad destinataria correspondiente.

Durante el MVP:

```text
Usuario.email
=
InvitacionNegocio.emailDestino
```

se interpreta mediante la equivalencia funcional definida por el Value Object `Email`.

Poseer el enlace no constituye autorización suficiente.

Aceptar o rechazar requiere:

```text
Usuario autenticado
+
identidad de Email coincidente
+
transición de estado válida
```

La estrategia técnica de normalización de Email queda abierta.

---

## `RN-ORG-007` — Ciclo de Vida y Vigencia de Invitaciones

Estados:

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

Solo `PENDIENTE` admite transiciones de dominio salientes.

La vigencia se determina mediante:

```text
estaVigente(ahora)
⇔
ahora < fechaExpiracion
```

Por lo tanto:

```text
ahora >= fechaExpiracion
→ no vigente
```

`PENDIENTE` no implica vigencia temporal.

Una invitación:

```text
PENDIENTE + vigente
```

puede ser aceptada o rechazada si se cumplen además sus guardias de identidad y contexto.

Una invitación:

```text
PENDIENTE + no vigente
```

no puede aceptarse ni rechazarse.

Mientras continúe persistida como `PENDIENTE` puede:

```text
→ ser CANCELADA por un PROPIETARIO ACTIVO del mismo Negocio;
o
→ materializarse como EXPIRADA.
```

`ACEPTADA`, `RECHAZADA`, `CANCELADA` y `EXPIRADA` son terminales.

`fechaExpiracion` se fija al emitir.

Cambios posteriores en la política general de duración no modifican retroactivamente invitaciones existentes.

---

## `RN-ORG-008` — Contexto de Negocio Autorizado

Toda operación correspondiente al dominio de un Negocio requiere conceptualmente:

```text
Usuario autenticado
+
Negocio identificado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso concreto de la operación
```

El backend debe validar este contexto.

No debe confiar en:

```text
rol enviado por frontend
negocio seleccionado solo en cliente
botones ocultos en UI
```

como mecanismo de autorización.

La forma técnica de transmitir el contexto se definirá en Arquitectura/API.

---

## `RN-ORG-009` — Modalidades como Adaptación de Experiencia

Las modalidades:

```text
REVENTA
PRODUCCION
SERVICIOS
```

describen la forma habitual de trabajo del Negocio.

Sirven para:

- priorizar acciones;
- adaptar navegación;
- adaptar onboarding;
- reducir ruido visual.

No constituyen bloqueos permanentes sobre el dominio.

---

## `RN-ORG-010` — Moneda Base

Todo Negocio posee una moneda base.

Durante el MVP:

```text
ARS
```

Las operaciones monetarias del Negocio se interpretan en esa moneda mientras no exista soporte multimoneda.

M01 no define todavía el mecanismo de cambio de moneda de un Negocio existente.

---

## `RN-ORG-011` — Canal de Invitación Independiente

`InvitacionNegocio` no depende del canal utilizado para entregar su referencia/enlace.

Durante el MVP podrá compartirse mediante:

```text
WhatsApp
Copiar enlace
```

Otros canales podrán agregarse posteriormente sin modificar el ciclo de vida de invitación.

---

## `RN-ORG-012` — WhatsApp no Determina Identidad

Enviar o compartir mediante WhatsApp no convierte el número telefónico en identidad del Usuario.

La autorización continúa dependiendo de la identidad funcional asociada a `emailDestino`.

---

## `RN-ORG-013` — Invitaciones Iniciales sin Propiedad

Una nueva invitación puede proponer inicialmente:

```text
ENCARGADO
TRABAJADOR
```

No puede proponer:

```text
PROPIETARIO
```

La promoción a Propietario requiere una acción explícita posterior de gestión de miembros.

---

## `RN-ORG-014` — Preparación Derivada

La preparación del Negocio no se representa mediante un estado rígido único.

El sistema determina qué configuraciones faltan según:

- modalidades;
- funcionalidad solicitada;
- configuraciones existentes.

No crear un enum como:

```text
INCOMPLETO / OPERATIVO / COMPLETO
```

a partir de este requisito.

---

## `RN-ORG-015` — Configuración Progresiva

Crear un Negocio no obliga a crear automáticamente entidades pertenecientes a otros módulos.

El Usuario puede completar configuración progresivamente.

---

## `RN-ORG-016` — Conservación Histórica

La desactivación de `UsuarioNegocio` se realiza mediante:

```text
ACTIVO → INACTIVO
```

No debe:

- eliminar físicamente la relación;
- eliminar operaciones históricas;
- modificar autoría de operaciones pasadas.

La estrategia técnica de auditoría o retención se definirá posteriormente.

---

## `RN-ORG-017` — Permisos Específicos por Módulo

M01 define:

```text
Usuario
+
Negocio
+
UsuarioNegocio
+
Rol
```

y las responsabilidades generales de:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

Los permisos concretos sobre funcionalidades de otros módulos pertenecen a la especificación funcional correspondiente.

Conceptualmente:

```text
M01
→ define el rol contextual

M02 / M03 / M04 / M05 / M06 / M07 / M08
→ definen qué operaciones concretas puede ejecutar cada rol
```

Una política específica de módulo puede ser más restrictiva sin cambiar el rol almacenado en `UsuarioNegocio`.

---

## `RN-ORG-018` — Unicidad, Reenvío y Nueva Emisión de Invitaciones

Para una misma combinación:

```text
Negocio
+
Email destinatario funcionalmente equivalente
```

puede existir como máximo una invitación `PENDIENTE` y vigente.

Si ya existe:

```text
PENDIENTE + vigente
```

no crear otra.

El sistema puede ofrecer sobre la misma entidad:

```text
reenviar
compartir nuevamente
copiar enlace
cancelar
```

Reenviar:

```text
NO crea otra invitación
NO modifica estado
NO modifica rolPropuesto
NO extiende fechaExpiracion
```

Si existe:

```text
PENDIENTE + no vigente
```

no debe bloquear permanentemente una nueva emisión.

La nueva emisión debe poder coordinar consistentemente:

```text
PENDIENTE vencida → EXPIRADA
+
crear nueva PENDIENTE
```

Si se desea modificar `rolPropuesto`:

```text
cancelar existente
+
emitir nueva
```

Las invitaciones históricas en estados:

```text
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

no bloquean por sí solas una nueva emisión futura. La emisión sigue sujeta a las guardias actuales, especialmente a que el destinatario no posea membresía `ACTIVA`.

---

## `RN-ORG-019` — Invitación y Membresía Activa

No debe emitirse una nueva invitación para una persona que ya posee `UsuarioNegocio` `ACTIVA` dentro del mismo Negocio.

La ausencia de membresía `ACTIVA` se revalida al aceptar.

Si entre emisión y aceptación el Usuario fue incorporado por otra vía:

```text
aceptación
→ rechazada
```

La invitación no debe utilizarse para cambiar silenciosamente el rol de una membresía `ACTIVA`.

Los cambios de rol pertenecen a:

```text
Negocio.cambiarRolMiembro(...)
```

---

## `RN-ORG-020` — Creación Atómica de Negocio

Crear un Negocio incluye funcionalmente:

```text
Negocio
+
UsuarioNegocio del creador
estado = ACTIVO
rol = PROPIETARIO
```

Los dos resultados deben confirmarse juntos o no confirmarse.

Nunca debe quedar creado un Negocio sin su primera membresía Propietaria.

El mecanismo técnico de atomicidad se define posteriormente.

---

## `RN-ORG-021` — Email Global Funcionalmente Único

Durante el MVP el Email funciona como identidad principal de Usuario.

No deben coexistir dos cuentas cuyos emails sean funcionalmente equivalentes según las reglas del Value Object `Email`.

La UI puede realizar prevalidación, pero la persistencia deberá actuar como última línea de defensa frente a registros concurrentes.

La estrategia técnica de normalización e índice queda abierta.

---

## `RN-ORG-022` — Guardias Contextuales y Concurrencia

Las consultas previas:

```text
¿existe invitación?
¿es el último propietario?
¿ya existe membresía?
¿email disponible?
```

son útiles para UX, pero no constituyen garantía definitiva.

Cuando una invariante depende del estado global del Negocio o de múltiples entidades, la validación relevante y la mutación deben confirmarse dentro de una frontera de consistencia apropiada.

La estrategia concreta:

```text
transacciones
locks
optimistic concurrency
constraints
Unit of Work
```

se define en Arquitectura/Persistencia.

M01 congela la invariante, no el mecanismo.

---

## `RN-ORG-023` — Trazabilidad de Operaciones Organizacionales

La plataforma debe poder reconstruir conceptualmente, cuando corresponda:

```text
quién emitió una invitación
cuándo se emitió
quién aceptó o rechazó
quién canceló
cuándo se materializó una expiración

quién cambió un rol
quién desactivó/reactivó una membresía
```

Este requisito no obliga a modelar una entidad `Auditoria`, utilizar Event Sourcing ni agregar campos de auditoría universales a cada entidad.

La estrategia concreta se definirá posteriormente, pero la implementación no debe perder la capacidad de atribuir operaciones organizacionales relevantes a su actor y momento cuando exista un actor humano.


---

# 10. Casos de Uso

## CU-ORG-01 — Registrar Usuario

### Actor Principal

Usuario no autenticado.

### Precondiciones

Ninguna.

### Flujo Principal

1. El Usuario solicita crear una cuenta.
2. Ingresa:
   - nombre;
   - email;
   - contraseña.
3. El sistema valida formato y requisitos funcionales.
4. Evalúa la equivalencia funcional del Email.
5. Verifica que no exista otra cuenta equivalente.
6. Crea el Usuario y registra sus credenciales mediante el mecanismo IAM definido técnicamente.
7. Confirma la creación.

### Flujos Alternativos

#### Email Existente

El sistema informa:

> El correo ingresado ya posee una cuenta. Iniciá sesión para continuar.

La persistencia deberá impedir duplicados incluso ante registros concurrentes.

#### Datos Inválidos

El sistema informa los campos que requieren corrección sin exponer detalles sensibles de seguridad.

### Postcondiciones

Existe un Usuario registrado que puede no pertenecer todavía a ningún Negocio.

El documento funcional no exige que las credenciales sean atributos de la entidad `Usuario`.

---

## CU-ORG-02 — Iniciar Sesión

### Actor Principal

Usuario registrado.

### Precondiciones

Cuenta existente y habilitada por la política de autenticación aplicable.

### Flujo Principal

1. El Usuario ingresa Email y contraseña.
2. El sistema valida las credenciales mediante el mecanismo de autenticación.
3. Se inicia la sesión.
4. Se consultan:
   - Negocios con membresía `ACTIVA`;
   - invitaciones destinadas funcionalmente a su Email.

### Flujo Alternativo — Sin Negocios

El sistema muestra:

```text
Todavía no pertenecés a ningún negocio.

[ Crear negocio ]
[ Ver invitaciones ]
```

### Flujo Excepcional — Credenciales Incorrectas

El acceso se rechaza mediante un mensaje genérico que no permita inferir información sensible sobre la cuenta.

### Postcondiciones

El Usuario se encuentra autenticado.

La autenticación no reemplaza la autorización contextual requerida para operar dentro de un Negocio.

---

## CU-ORG-03 — Crear Negocio

### Actor Principal

Usuario autenticado.

### Precondiciones

Sesión autenticada válida.

### Flujo Principal

1. El Usuario selecciona `Crear negocio`.
2. Ingresa:
   - nombre;
   - rubro opcional.
3. Selecciona una o más modalidades:
   - Reventa;
   - Producción;
   - Servicios.
4. El sistema valida los datos.
5. Prepara la creación del Negocio.
6. Asigna moneda base `ARS`.
7. Prepara una `UsuarioNegocio` para el creador:
   - estado `ACTIVO`;
   - rol `PROPIETARIO`.
8. Confirma de forma atómica:
   - Negocio;
   - primera membresía Propietaria.
9. Presenta el checklist de preparación progresiva.

### Flujo Alternativo — Configuración Posterior Incompleta

El Usuario puede abandonar temporalmente la configuración perteneciente a otros módulos y retomarla más adelante.

### Flujo Excepcional — No Puede Crearse la Membresía Inicial

Si no puede confirmarse la membresía `ACTIVA/PROPIETARIO`:

```text
NO confirmar creación del Negocio.
```

### Postcondiciones

Existe:

```text
Negocio
+
al menos un UsuarioNegocio
estado = ACTIVO
rol = PROPIETARIO
```

---

## CU-ORG-04 — Invitar Miembro

### Actor Principal

Propietario.

### Precondiciones

- Usuario autenticado.
- Negocio seleccionado.
- `UsuarioNegocio` del actor en estado `ACTIVO`.
- Rol `PROPIETARIO`.

### Flujo Principal

1. El Propietario accede a `Miembros`.
2. Selecciona `Invitar persona`.
3. Ingresa el email del destinatario.
4. Selecciona:
   - `ENCARGADO`; o
   - `TRABAJADOR`.
5. El sistema valida la equivalencia funcional del Email.
6. Verifica que el destinatario no posea una membresía `ACTIVA` en el Negocio.
7. Busca una invitación `PENDIENTE` equivalente para `Negocio + Email`.
8. Si existe pero ya no está vigente:
   - materializa `EXPIRADA`;
   - continúa dentro de la misma frontera de consistencia.
9. Revalida que no exista otra `PENDIENTE` que bloquee la emisión.
10. Crea `InvitacionNegocio`:
    - estado `PENDIENTE`;
    - `fechaEmision`;
    - `fechaExpiracion` calculada con la política vigente;
    - `rolPropuesto`;
    - identificador seguro.
11. Presenta:

```text
[ Compartir por WhatsApp ]
[ Copiar enlace ]
```

### Compartir por WhatsApp

1. El Propietario selecciona `Compartir por WhatsApp`.
2. La aplicación prepara un mensaje con:
   - nombre del Negocio;
   - rol propuesto;
   - enlace de invitación.
3. Se abre el mecanismo de compartición.
4. El Propietario selecciona el contacto.
5. Confirma el envío.

El canal no cambia el estado de la invitación.

### Flujo Alternativo — Copiar Enlace

El Propietario copia la referencia y puede compartirla mediante cualquier canal.

### Flujo Alternativo — Invitación PENDIENTE y Vigente Existente

El sistema informa que ya existe una invitación utilizable para esa persona.

No crea otra.

El Propietario puede:

- reenviarla;
- copiar nuevamente el enlace;
- conservarla;
- cancelarla.

Reenviar no modifica:

```text
estado
rolPropuesto
fechaExpiracion
```

### Flujo Alternativo — Cambiar Rol Propuesto

Si se desea cambiar el rol de una invitación ya emitida:

```text
cancelar invitación existente
+
emitir una nueva
```

No editar silenciosamente `rolPropuesto`.

### Flujo Excepcional — Miembro ya ACTIVO

Si el destinatario ya posee una membresía `ACTIVA`:

```text
NO emitir.
```

El sistema orienta a la gestión de miembros si el objetivo era modificar el rol.

### Flujo Excepcional — Intento de Invitar como Propietario

El sistema no ofrece `PROPIETARIO` como rol inicial.

### Postcondiciones

Existe como máximo una invitación `PENDIENTE` vigente equivalente para `Negocio + Email`.

---

## CU-ORG-05 — Aceptar o Rechazar Invitación

### Actor Principal

Usuario invitado.

### Precondiciones

Existe una referencia de invitación resoluble.

Poseer esa referencia **no constituye autorización suficiente**.

### Flujo Inicial Común

1. El Usuario accede a la referencia de invitación.
2. El sistema intenta resolver la `InvitacionNegocio`.
3. Si no existe, finaliza el escenario sin exponer información sensible del Negocio.
4. Obtiene **un único instante temporal coherente `ahora`** para las validaciones temporales de esta operación.
5. Verifica que el estado sea `PENDIENTE`.
6. Evalúa `estaVigente(ahora)`.
7. Si no está vigente:
   - no permite aceptar;
   - no permite rechazar;
   - la falta de vigencia lógica **no obliga** a materializar `EXPIRADA` dentro de este Caso de Uso.
8. Si el Usuario todavía no está autenticado, el sistema solicita registro o inicio de sesión conservando la referencia de invitación.
9. Una vez autenticado, compara `usuarioActual.email` con `emailDestino` mediante la equivalencia funcional del Value Object `Email`.
10. Si la identidad no coincide, finaliza sin modificar la invitación.
11. Presenta el Negocio y el `rolPropuesto`.
12. El Usuario elige `Aceptar` o `Rechazar`.

### Escenario A — Aceptar

Antes de mutar, el sistema revalida utilizando el mismo `ahora`:

```text
estado = PENDIENTE
+
estaVigente(ahora)
+
Email funcionalmente coincidente
```

También valida que:

```text
rolPropuesto ∈ {ENCARGADO, TRABAJADOR}
```

A continuación:

1. Carga el `Negocio` asociado.
2. Dentro de la frontera lógica de consistencia, revalida que la invitación siga siendo aceptable.
3. Consulta mediante persistencia:

```text
membresiaHistorica por Usuario + Negocio
```

4. Si existe y está `ACTIVA`:

```text
RECHAZAR
NO aceptar invitación
NO cambiar Rol
NO persistir incorporación
```

y el escenario finaliza.

5. Si existe y está `INACTIVA`, Application entrega esa misma entidad histórica a:

```text
Negocio.incorporarOReactivarMiembro(
    usuarioActual,
    rolPropuesto,
    membresiaHistorica
)
```

6. Si no existe, Application invoca:

```text
Negocio.incorporarOReactivarMiembro(
    usuarioActual,
    rolPropuesto,
    null
)
```

7. `Negocio` revalida:
   - whitelist del rol;
   - pertenencia de la membresía histórica al mismo Usuario;
   - pertenencia de la membresía histórica al mismo Negocio;
   - estado compatible con incorporación/reactivación.
8. El resultado se conserva como una referencia local del Caso de Uso:

```text
membresiaResultado
```

En una reactivación:

```text
membresiaResultado
=
misma UsuarioNegocio histórica reactivada
```

9. Solo después de obtener una membresía válida se solicita:

```text
InvitacionNegocio.aceptarPara(usuarioActual.email, ahora)
```

10. Se registran conceptualmente los cambios de:
    - `InvitacionNegocio`;
    - `membresiaResultado`.
11. Persistencia debe detectar conflictos concurrentes relevantes, al menos:
    - otra transición sobre la misma invitación;
    - duplicidad `Usuario + Negocio`;
    - activación/cambio concurrente incompatible de la membresía.
12. La operación se confirma como una única postcondición funcional.

### Postcondición de Aceptación

Si se aceptó correctamente:

```text
InvitacionNegocio.estado = ACEPTADA
+
UsuarioNegocio.estado = ACTIVO
+
UsuarioNegocio.rol = rolPropuesto
```

Las tres condiciones pertenecen a la misma unidad funcional de consistencia.

Si falla una validación, persistencia o conflicto concurrente:

```text
ninguna modificación queda confirmada
```

El mecanismo técnico que garantiza atomicidad se define posteriormente en Arquitectura/Persistencia.

### Escenario B — Rechazar

El Usuario selecciona:

```text
Rechazar invitación
```

Antes de confirmar se revalida, utilizando el mismo `ahora`:

```text
estado = PENDIENTE
+
estaVigente(ahora)
+
Email funcionalmente coincidente
```

Resultado:

```text
InvitacionNegocio.estado = RECHAZADA
```

No se crea ni reactiva membresía.

### Flujo Excepcional — Email Diferente

Si el Email autenticado no es funcionalmente equivalente a `emailDestino`:

> Esta invitación fue enviada a otra cuenta. Iniciá sesión con el correo correspondiente.

No se modifica la invitación.

### Flujo Excepcional — Invitación Vencida

Si:

```text
estado = PENDIENTE
+
estaVigente(ahora) = false
```

no puede aceptarse ni rechazarse.

No es obligatorio materializar `EXPIRADA` como efecto lateral de este Caso de Uso.

### Flujo Excepcional — Invitación Terminal

Si está:

```text
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

no puede utilizarse nuevamente.

### Flujo Excepcional — Usuario ya Miembro ACTIVO

Si al confirmar la aceptación el Usuario ya posee una membresía `ACTIVA`:

```text
NO aceptar
NO crear otra membresía
NO reactivar
NO cambiar rol
```

El flujo termina antes de mutar `InvitacionNegocio`.

### Flujo Excepcional — Membresía Histórica Incoherente

Si la membresía cargada no corresponde al mismo Usuario o al mismo Negocio:

```text
RECHAZAR
NO corregir silenciosamente
NO reasignar la membresía
```

### Postcondiciones

Aceptación exitosa:

```text
InvitacionNegocio.estado = ACEPTADA
+
UsuarioNegocio.estado = ACTIVO
+
UsuarioNegocio.rol = rolPropuesto
```

Rechazo exitoso:

```text
InvitacionNegocio.estado = RECHAZADA
```

---

## CU-ORG-06 — Entrar a un Negocio

### Actor Principal

Usuario autenticado.

### Precondiciones

Al menos una membresía activa.

### Flujo Principal

1. El sistema muestra los Negocios disponibles.
2. El Usuario selecciona uno.
3. El sistema valida su membresía.
4. Obtiene el rol correspondiente.
5. Establece el contexto de trabajo.
6. Presenta la interfaz adaptada a:
   - modalidades;
   - rol;
   - configuración existente.
7. Consulta el checklist de preparación.

### Caso de un Solo Negocio

La experiencia podrá simplificarse y entrar directamente al Negocio si no genera ambigüedad para el Usuario.

### Salir del Contexto

El Usuario puede volver a:

```text
Mis negocios
```

para ingresar posteriormente a otro.

### Postcondiciones

Las operaciones posteriores se ejecutan dentro del Negocio seleccionado.

---

## CU-ORG-07 — Gestionar Roles

### Actor Principal

Propietario.

### Precondiciones

- Usuario autenticado.
- Negocio seleccionado.
- Actor con `UsuarioNegocio` `ACTIVA`.
- Rol `PROPIETARIO`.
- Miembro objetivo existente.

### Flujo Principal

1. Consulta los miembros.
2. Selecciona un miembro `ACTIVO`.
3. Consulta su rol actual.
4. Selecciona un nuevo rol.
5. El sistema revalida autorización e invariantes.
6. Si la modificación afectaría a un Propietario, verifica que el resultado conserve al menos un `PROPIETARIO` `ACTIVO`.
7. Confirma el cambio de rol.

### Promoción a Propietario

La promoción:

```text
ENCARGADO / TRABAJADOR
        ↓
PROPIETARIO
```

es una acción explícita.

El sistema deberá solicitar confirmación clara antes de realizarla.

### Flujo Excepcional — Último Propietario

Si el cambio produciría:

```text
0 UsuarioNegocio
estado = ACTIVO
rol = PROPIETARIO
```

la operación se rechaza.

La comprobación debe revalidarse al confirmar; una preconsulta de UI no basta.

### Postcondiciones

El miembro conserva la misma identidad de `UsuarioNegocio` y posee el nuevo rol.

---

## CU-ORG-08 — Desactivar Membresía

### Actor Principal

Propietario.

### Precondiciones

- Usuario autenticado.
- Negocio seleccionado.
- Actor con `UsuarioNegocio` `ACTIVA` y rol `PROPIETARIO`.
- Miembro objetivo actualmente `ACTIVO`.

### Flujo Principal

1. El Propietario selecciona un miembro.
2. Solicita desactivarlo.
3. El sistema evalúa la invariante del último Propietario.
4. Solicita confirmación.
5. Antes de confirmar, vuelve a validar autorización e invariante.
6. La membresía cambia:

```text
ACTIVO → INACTIVO
```

7. El Usuario pierde acceso futuro a ese Negocio.
8. La relación histórica y la autoría pasada permanecen intactas.

### Flujo Excepcional — Último Propietario

Si la operación dejaría cero Propietarios `ACTIVO`, se rechaza.

Mensaje:

> El negocio debe conservar al menos un Propietario activo. Asigná otro propietario antes de continuar.

### Postcondiciones

```text
UsuarioNegocio.estado = INACTIVO
```

sin eliminar la relación histórica.

---

# 11. Historias de Usuario

## `HU-ORG-001` — Crear Cuenta

**Como** persona que desea utilizar la plataforma,  
**quiero** registrarme mediante email y contraseña,  
**para** poder crear o incorporarme a negocios.

### Criterio

**Given** que no poseo una cuenta,  
**When** completo correctamente mis datos,  
**Then** el sistema crea mi Usuario sin obligarme a crear un Negocio.

---

## `HU-ORG-002` — Crear Negocio

**Como** Usuario,  
**quiero** crear un Negocio,  
**para** comenzar a gestionar mi actividad.

### Criterio

**Given** que estoy autenticado,  
**When** ingreso un nombre y modalidades válidas,  
**Then** se crea el Negocio y quedo vinculado como Propietario.

---

## `HU-ORG-003` — Adaptar la Experiencia

**Como** Propietario,  
**quiero** indicar qué tipo de actividades realizo,  
**para** que la aplicación priorice las herramientas relevantes.

### Criterio

**Given** un negocio dedicado únicamente a servicios,  
**When** selecciono `SERVICIOS`,  
**Then** la navegación prioriza funciones relacionadas sin impedir que posteriormente habilite otras modalidades.

---

## `HU-ORG-004` — Invitar y Compartir

**Como** Propietario,  
**quiero** emitir y compartir una invitación,  
**para** incorporar a una persona sin administrar sus credenciales.

### Criterio

**Given** una invitación `PENDIENTE` y vigente,  
**When** selecciono `Compartir por WhatsApp` o `Copiar enlace`,  
**Then** la aplicación reutiliza la misma `InvitacionNegocio` y no extiende su `fechaExpiracion`.

Si ya existe una invitación `PENDIENTE` vigente equivalente, no se crea una segunda.

---

## `HU-ORG-005` — Incorporarme con Mis Credenciales

**Como** persona invitada,  
**quiero** crear o utilizar mi propia cuenta,  
**para** incorporarme sin compartir contraseñas con el Propietario.

### Criterio

**Given** una invitación `PENDIENTE` y vigente dirigida funcionalmente a mi Email,  
**When** inicio sesión con esa identidad y acepto,  
**Then** el sistema crea o reactiva mi membresía histórica con el `rolPropuesto` y confirma la aceptación de manera atómica.

Si ya poseo una membresía `ACTIVA`, la invitación no se utiliza para modificar mi rol.

---

## `HU-ORG-006` — Trabajar en Varios Negocios

**Como** Usuario que participa en más de un emprendimiento,  
**quiero** seleccionar el Negocio en el que voy a trabajar,  
**para** mantener separadas sus operaciones.

### Criterio

**Given** que poseo dos membresías activas,  
**When** selecciono uno de los Negocios,  
**Then** las operaciones posteriores pertenecen únicamente a ese contexto.

---

## `HU-ORG-007` — Administrar Roles

**Como** Propietario,  
**quiero** modificar los roles de los miembros,  
**para** reflejar sus responsabilidades actuales.

### Criterio

**Given** un miembro activo,  
**When** cambio su rol,  
**Then** sus permisos se actualizan dentro de ese Negocio sin afectar otros.

---

## `HU-ORG-008` — Proteger la Propiedad del Negocio

**Como** integrante del Negocio,  
**quiero** que siempre exista al menos un Propietario activo,  
**para** evitar dejar la organización sin administración.

### Criterio

**Given** que existe un único Propietario,  
**When** se intenta degradarlo o desactivarlo,  
**Then** el sistema impide la operación.

---

## `HU-ORG-009` — Onboarding Progresivo

**Como** Propietario de un negocio nuevo,  
**quiero** recibir indicaciones sobre lo que todavía necesito configurar,  
**para** comenzar a utilizar la plataforma sin completar formularios innecesarios.

### Criterio

**Given** un Negocio recién creado,  
**When** ingreso por primera vez,  
**Then** el sistema presenta un checklist relevante para las funcionalidades que quiero utilizar.

---

# 12. Estados y Transiciones

## 12.1. InvitacionNegocio

```text
                         ┌──────────────┐
                         │  PENDIENTE   │
                         └──────┬───────┘
                ┌───────────────┼───────────────┬───────────────┐
                │               │               │               │
                ▼               ▼               ▼               ▼
          ┌──────────┐    ┌───────────┐   ┌───────────┐   ┌───────────┐
          │ ACEPTADA │    │ RECHAZADA │   │ CANCELADA │   │ EXPIRADA  │
          └──────────┘    └───────────┘   └───────────┘   └───────────┘
```

Reglas:

```text
PENDIENTE
≠
vigente automáticamente
```

Aceptar:

```text
requiere PENDIENTE + vigente + identidad válida
```

Rechazar:

```text
requiere PENDIENTE + vigente + identidad válida
```

Cancelar:

```text
requiere PENDIENTE + autorización contextual
NO requiere vigencia
```

Expirar:

```text
requiere PENDIENTE + no vigente
```

Los cuatro estados de destino son terminales.

La **coordinación** de aceptación pertenece al Caso de Uso. La creación/reactivación de `UsuarioNegocio` se ejecuta mediante `Negocio.incorporarOReactivarMiembro(...)`; no pertenece a una transición interna de `InvitacionNegocio` y no requiere que la invitación consulte repositories.

La especificación detallada se encuentra en:

```text
modelo-dominio/bloque-1-fundacion/
04-m01-estados-invitacion.md
04-m01-estados-invitacion.puml
```

---

## 12.2. UsuarioNegocio

```text
                ┌────────┐
                │ ACTIVO │
                └───┬────┘
                    │
           desactivar
                    ▼
               ┌──────────┐
               │ INACTIVO │
               └────┬─────┘
                    │
      nueva invitación aceptada
                    │
                    ▼
                  ACTIVO
```

La reactivación:

- conserva la misma identidad histórica de `UsuarioNegocio`;
- aplica el `rolPropuesto` de la nueva invitación;
- no crea una segunda membresía para el mismo `Usuario + Negocio`.

La coordinación del flujo pertenece al Caso de Uso de aceptación:

```text
Application
→ consulta membresiaHistorica
→ Negocio.incorporarOReactivarMiembro(
      usuario,
      rolPropuesto,
      membresiaHistorica
  )
```

`Negocio` protege la coherencia de la membresía recibida y no consulta persistencia.

Una membresía `ACTIVA` no es una transición válida de “reactivación”; la incorporación debe rechazarse.

Las guardias relacionadas con el último Propietario se detallan adicionalmente en:

```text
05-m01-estados-membresia.md
05-m01-estados-membresia.puml
```

---

## 12.3. Preparación del Negocio

No se modelará mediante estados rígidos como:

```text
INCOMPLETO
OPERATIVO
COMPLETO
```

Se calculará dinámicamente mediante configuraciones existentes y funcionalidades solicitadas.

---

# 13. Excepciones y Errores Funcionales

| Condición | Efecto | Mensaje Orientado al Usuario |
| :--- | :--- | :--- |
| Email de cuenta funcionalmente existente | No crea una segunda cuenta. | **Este correo ya posee una cuenta. Iniciá sesión para continuar.** |
| Credenciales inválidas | No inicia sesión. | **Email o contraseña incorrectos.** |
| Cuenta no habilitada según política de acceso | Impide el acceso. | **No se puede iniciar sesión con esta cuenta.** |
| Invitación inexistente | No muestra datos sensibles del Negocio. | **No encontramos esta invitación.** |
| Invitación `PENDIENTE` vencida | No permite aceptar ni rechazar. | **Esta invitación venció. Pedí al propietario una nueva.** |
| Invitación `CANCELADA` | No permite incorporarse. | **Esta invitación fue cancelada.** |
| Invitación `ACEPTADA` / `RECHAZADA` / `EXPIRADA` | No vuelve a utilizarse. | **Esta invitación ya no está disponible.** |
| Email autenticado diferente | No permite aceptar ni rechazar. | **La invitación fue enviada a otro correo. Iniciá sesión con la cuenta correspondiente.** |
| Invitación `PENDIENTE` vigente equivalente | No crea una segunda invitación; reutiliza la existente. | **Ya existe una invitación pendiente para esta persona.** |
| Destinatario ya miembro `ACTIVO` | No emite/acepta una invitación para modificar rol. | **Esta persona ya pertenece al negocio.** |
| Negocio sin membresía `ACTIVA` para el Usuario | Impide ingresar. | **Ya no tenés acceso a este negocio.** |
| Rol o permiso insuficiente | Rechaza la acción. | **No tenés permisos para realizar esta acción.** |
| Último Propietario | Impide degradación/desactivación. | **El negocio debe conservar al menos un Propietario activo.** |
| Conflicto concurrente | No confirma una mutación que rompería invariantes. | **La información cambió mientras realizabas la operación. Volvé a intentarlo.** |
| Configuración pendiente | No genera error técnico; orienta al módulo correspondiente. | **Antes de continuar necesitás completar esta configuración.** |

Los mensajes son orientativos de UX.

El dominio no debe depender de cadenas de texto concretas ni utilizarlas como códigos de error.

---

# 14. Interacción con Otros Módulos

## M02 — Catálogo

M01 informa modalidades que permiten adaptar cómo se presenta el catálogo.

Ejemplo:

```text
SERVICIOS
→ priorizar creación de servicios

REVENTA
→ priorizar creación de bienes vendibles

PRODUCCION
→ habilitar orientación hacia configuración productiva
```

M01 no crea artículos.

---

## M03 — Compras

Puede resultar irrelevante inicialmente para un negocio exclusivamente de servicios.

M01 puede reducir su prominencia visual según las modalidades.

No lo bloquea permanentemente.

---

## M04 — Inventario y Ubicaciones

M01 puede consultar si existen ubicaciones cuando otra funcionalidad las requiere.

No crea una ubicación automáticamente.

---

## M05 — Ventas y Pagos

M01 puede consultar si existen los elementos mínimos de preparación para comenzar a vender.

La configuración concreta de medios de pago pertenece a M05.

---

## M06 — Caja y Gastos

M01 puede informar que se requiere una configuración operativa adicional antes de abrir caja.

La creación y gestión de caja pertenece a M06.

---

## M07 — Producción

La modalidad:

```text
PRODUCCION
```

permite priorizar el acceso al módulo productivo.

No constituye una condición rígida que impida habilitarlo posteriormente.

---

## M08 — Analítica

Los roles definidos en M01 sirven como base para determinar qué tipos de analítica puede consultar cada miembro.

---

# 15. Matriz de Trazabilidad Inicial

| RF | RN principales | HU | CU |
| :--- | :--- | :--- | :--- |
| RF-ORG-001 | RN-ORG-003, RN-ORG-021 | HU-ORG-001 | CU-ORG-01 |
| RF-ORG-002 | RN-ORG-003 | HU-ORG-001 | CU-ORG-02 |
| RF-ORG-003 | RN-ORG-001, RN-ORG-010, RN-ORG-020 | HU-ORG-002 | CU-ORG-03 |
| RF-ORG-004 | RN-ORG-009 | HU-ORG-003 | CU-ORG-03 |
| RF-ORG-005 | RN-ORG-002, RN-ORG-003, RN-ORG-008 | HU-ORG-006 | CU-ORG-02 / CU-ORG-06 |
| RF-ORG-006 | RN-ORG-006, RN-ORG-007, RN-ORG-013, RN-ORG-018, RN-ORG-019, RN-ORG-022, RN-ORG-023 | HU-ORG-004 | CU-ORG-04 |
| RF-ORG-007 | RN-ORG-011, RN-ORG-012, RN-ORG-018, RN-ORG-023 | HU-ORG-004 | CU-ORG-04 |
| RF-ORG-008 | RN-ORG-005, RN-ORG-006, RN-ORG-007, RN-ORG-019, RN-ORG-022, RN-ORG-023 | HU-ORG-005 | CU-ORG-05 |
| RF-ORG-009 | RN-ORG-006, RN-ORG-007, RN-ORG-023 | HU-ORG-005 | CU-ORG-05 |
| RF-ORG-010 | RN-ORG-007, RN-ORG-018, RN-ORG-022, RN-ORG-023 | — | CU-ORG-04 / CU-ORG-05 |
| RF-ORG-011 | RN-ORG-008, RN-ORG-017 | HU-ORG-006 | CU-ORG-06 |
| RF-ORG-012 | RN-ORG-002, RN-ORG-008 | HU-ORG-007 | CU-ORG-07 |
| RF-ORG-013 | RN-ORG-001, RN-ORG-002, RN-ORG-017, RN-ORG-022, RN-ORG-023 | HU-ORG-007 | CU-ORG-07 |
| RF-ORG-014 | RN-ORG-001, RN-ORG-013, RN-ORG-022 | HU-ORG-008 | CU-ORG-07 |
| RF-ORG-015 | RN-ORG-001, RN-ORG-004, RN-ORG-016, RN-ORG-022, RN-ORG-023 | HU-ORG-008 | CU-ORG-08 |
| RF-ORG-016 | RN-ORG-005, RN-ORG-019 | HU-ORG-005 | CU-ORG-05 |
| RF-ORG-017 | RN-ORG-009, RN-ORG-014, RN-ORG-015 | HU-ORG-009 | CU-ORG-03 / CU-ORG-06 |

La matriz indica trazabilidad funcional.

No implica que cada RF deba convertirse en un endpoint independiente.

---

# 16. Criterios de Aceptación del Módulo

M01 podrá considerarse funcionalmente completo para el MVP cuando se verifique que:

1. Un Usuario puede registrarse mediante Email y contraseña desde la experiencia funcional.
2. El Email de Usuario es funcionalmente único.
3. Un Usuario puede iniciar sesión.
4. Una cuenta puede existir sin estar asociada a ningún Negocio.
5. Un Usuario puede crear un Negocio.
6. Negocio + primera membresía `ACTIVA/PROPIETARIO` se crean de manera atómica.
7. El Negocio recibe `ARS` como moneda base.
8. El Negocio define una o más modalidades operativas.
9. Un Usuario puede pertenecer a varios Negocios.
10. Puede poseer roles distintos en cada uno.
11. Para un mismo `Usuario + Negocio` existe una única membresía histórica.
12. Un Propietario puede emitir una invitación para `ENCARGADO` o `TRABAJADOR`.
13. Una invitación posee `fechaEmision` y `fechaExpiracion`.
14. `PENDIENTE` no implica por sí sola vigencia temporal.
15. `ahora >= fechaExpiracion` implica invitación no vigente.
16. Para `Negocio + Email` equivalente existe como máximo una invitación `PENDIENTE` y vigente.
17. Una `PENDIENTE` vencida no bloquea permanentemente una nueva emisión.
18. Reenviar reutiliza la misma invitación.
19. Reenviar no extiende `fechaExpiracion`.
20. Reenviar no cambia `rolPropuesto`.
21. Cambiar rol propuesto requiere cancelar la invitación y emitir una nueva.
22. La invitación puede compartirse por WhatsApp sin integración automática con WhatsApp Business.
23. El enlace también puede copiarse y compartirse por otro medio.
24. Poseer el enlace no alcanza para aceptar.
25. Un invitado sin cuenta puede registrarse y posteriormente aceptar.
26. Un Usuario existente puede aceptar una invitación destinada funcionalmente a su Email.
27. Un Usuario con otro Email no puede aceptar ni rechazar la invitación.
28. Aceptar exige `PENDIENTE + vigente`.
29. Rechazar exige `PENDIENTE + vigente`.
30. Cancelar exige `PENDIENTE` pero no vigencia temporal.
31. Expirar exige `PENDIENTE + no vigente`.
32. `ACEPTADA`, `RECHAZADA`, `CANCELADA` y `EXPIRADA` son terminales.
33. Un destinatario con membresía `ACTIVA` no puede ser invitado para modificar su rol.
34. La ausencia de membresía `ACTIVA` se revalida al aceptar.
35. Una membresía histórica `INACTIVA` puede reactivarse.
36. La reactivación reutiliza la misma `UsuarioNegocio`.
37. La reactivación adopta el `rolPropuesto` de la nueva invitación.
38. Aceptación + creación/reactivación de membresía se confirman atómicamente.
39. Un Propietario puede modificar roles explícitamente.
40. Un miembro puede ser promovido deliberadamente a `PROPIETARIO`.
41. El sistema nunca permite dejar un Negocio sin al menos un `PROPIETARIO` `ACTIVO`.
42. La invariante del último Propietario se revalida al confirmar.
43. Desactivar una membresía produce `ACTIVO → INACTIVO`.
44. Desactivar una membresía no elimina el Usuario.
45. Desactivar una membresía no afecta otros Negocios.
46. Las operaciones históricas conservan al Usuario responsable.
47. El Usuario solo opera dentro de Negocios donde posee membresía `ACTIVA` y permiso suficiente.
48. La creación del Negocio no genera ubicaciones, medios de pago ni artículos ficticios.
49. Las modalidades adaptan la experiencia sin convertirse en restricciones rígidas.
50. M01 define roles generales y cada módulo define permisos concretos.
51. El backend revalida autorización; no confía en el rol o Negocio enviado únicamente por el frontend.
52. Las prevalidaciones no sustituyen guardias definitivas ante concurrencia.
53. `InvitacionNegocio` no necesita consultar repositories para proteger sus invariantes locales.
54. La implementación no expone setters públicos de estado que permitan saltarse transiciones.
55. Las operaciones organizacionales relevantes conservan trazabilidad suficiente de actor y momento.
56. La existencia de trazabilidad no obliga a una arquitectura de Event Sourcing ni a una entidad universal de Auditoría.

---

# 17. Prioridad y Evolución

## MVP — MUST HAVE

```text
Registro
Login
Crear Negocio
UsuarioNegocio
EstadoMembresia
Roles
Modalidades
Invitaciones
Vigencia temporal de invitaciones
Compartir / reenviar invitación
Aceptar / rechazar / cancelar
Seleccionar Negocio
Gestionar miembros
Cambiar roles
Desactivar membresía
Reactivar membresía histórica
Invariante de Propietario
Aislamiento por Negocio
Checklist progresivo básico
```

---

## Evolución Posterior

```text
Recuperación avanzada de cuenta
Validación adicional de email
Cambio de email principal
PIN rápido
Biometría
MFA
Invitaciones enviadas automáticamente
Integración WhatsApp Business
Email automático de invitaciones
Transferencia formal de propiedad
Salida autónoma de un Propietario
Permisos personalizados por Usuario
Ciclo formal de cierre/desactivación de Negocio
Soporte multimoneda
```

Toda evolución que modifique identidad, membresías o ciclo de vida de invitaciones debe actualizar primero la documentación funcional y de dominio.

---

# 18. Criterio Rector del Módulo

La organización interna debe ser suficientemente robusta para soportar:

```text
Usuario
→ múltiples Negocios
→ múltiples Roles contextuales
→ múltiples colaboradores
```

sin trasladar esa complejidad al usuario final.

La experiencia buscada es:

```text
Crear cuenta
     ↓
Crear Negocio
o
Aceptar invitación
     ↓
Entrar
     ↓
Trabajar
```

La seguridad, autorización e integridad pertenecen al sistema.

La simplicidad pertenece al usuario.

El dominio no debe simplificarse eliminando invariantes; la UI debe ocultar complejidad sin debilitar las reglas.

---

# 19. Guía de Interpretación para Arquitectura e IA

## 19.1. Orden de Lectura

Antes de implementar M01, una IA o desarrollador debe consultar:

```text
1. M01-organizacion-negocio.md
2. 01-modelo-dominio-bloque-1.md
3. 01-diagrama-general.puml
4. 02-m01-organizacion-clases.md
5. 02-m01-organizacion-clases.puml
6. secuencias/01-aceptar-invitacion.puml
7. 04-m01-estados-invitacion.md
8. 04-m01-estados-invitacion.puml
9. 05-m01-estados-membresia.md
10. 05-m01-estados-membresia.puml
11. ADRs / diseño técnico
12. modelo relacional
13. API
14. código
```

Si las fuentes se contradicen:

```text
NO elegir silenciosamente.
NO adaptar el dominio al código existente.
NO inferir reglas nuevas.
```

Debe resolverse primero la contradicción documental.

---

## 19.2. Entidad vs. Caso de Uso

Las entidades deben proteger invariantes que conocen localmente.

Ejemplo `InvitacionNegocio`:

```text
estado
fechaExpiracion
emailDestino
transición permitida
```

El Caso de Uso aporta contexto externo:

```text
autorización
membresías existentes
otras invitaciones
Negocio
atomicidad entre entidades
```

No introducir repositories dentro de entidades para resolver guardias contextuales.

Ejemplo `Negocio.incorporarOReactivarMiembro(...)`:

```text
Application:
- consulta membresiaHistorica por Usuario + Negocio;
- entrega la entidad o null.

Negocio:
- valida rolInicial;
- valida pertenencia de la membresía recibida;
- rechaza si ya está ACTIVA;
- reutiliza si está INACTIVA;
- crea si es null.
```

La entidad protege la invariante con los objetos que recibe; no descubre por sí misma el estado global mediante persistencia.

---

## 19.3. Métodos de Dominio no son Endpoints

Una operación como:

```text
cancelar()
aceptarPara(...)
cambiarRolMiembro(...)
incorporarOReactivarMiembro(...)
```

no implica automáticamente:

```text
1 método = 1 endpoint
```

El contrato HTTP se diseñará posteriormente.

---

## 19.4. Clases UML no son Tablas

No inferir:

```text
1 clase = 1 tabla
1 enum = 1 tabla
1 Value Object = 1 tabla
```

El Modelo Relacional debe preservar las invariantes, no copiar mecánicamente el UML.

---

## 19.5. Evitar Setters que Rompan Invariantes

No exponer operaciones como:

```text
setEstadoInvitacion(...)
setEstadoMembresia(...)
setRol(...)
```

si permiten saltarse reglas.

Preferir operaciones con significado de dominio.

---

# 20. Requisitos de Implementación y Buenas Prácticas

## 20.1. Atomicidad Obligatoria

Deben tratarse como unidades funcionales indivisibles al menos:

```text
Crear Negocio
+
crear primera membresía ACTIVA/PROPIETARIO
```

```text
Aceptar InvitacionNegocio
+
crear/reactivar UsuarioNegocio
```

```text
Cambiar/desactivar Propietario
+
preservar al menos un PROPIETARIO ACTIVO
```

La tecnología concreta se define en Arquitectura.

---

## 20.2. Concurrencia

La implementación debe proteger al menos:

```text
registro concurrente con mismo Email
dos invitaciones equivalentes concurrentes
dos aceptaciones de la misma invitación
aceptación concurrente con incorporación por otra vía
creación/activación concurrente de UsuarioNegocio para el mismo Usuario + Negocio
transición concurrente de la misma InvitacionNegocio
cancelación concurrente con expiración
dos cambios concurrentes sobre el último Propietario
```

La validación en Application Service es necesaria pero puede no ser suficiente.

La persistencia debe actuar como última línea de defensa donde corresponda.

---

## 20.3. Tiempo

Para una operación dependiente del reloj:

```text
obtener un único "ahora"
```

y reutilizarlo durante la operación.

Evitar llamadas dispersas al reloj del sistema.

La representación técnica debe ser timezone-aware.

La recomendación de implementación será trabajar con instantes normalizados y convertir a zona local solamente para presentación, sin congelar todavía una librería o tipo concreto.

---

## 20.4. Dinero

M01 solo define moneda base.

Los módulos monetarios posteriores deberán utilizar representación decimal exacta.

No utilizar Float binario para valores monetarios.

---

## 20.5. Seguridad de Credenciales

Nunca almacenar ni registrar:

```text
contraseña en texto plano
token secreto completo en logs
credenciales de sesión en eventos de negocio
```

El algoritmo concreto y la estrategia IAM se decidirán en Arquitectura.

---

## 20.6. Aislamiento por Negocio

Toda mutación debe verificar del lado servidor:

```text
Usuario autenticado
+
membresía ACTIVA
+
Negocio correcto
+
Rol
+
permiso concreto
```

No confiar en identificadores o roles enviados por el cliente sin autorización contextual.

---

## 20.7. Idempotencia

Las operaciones sensibles deben poder tratar reintentos sin duplicar efectos.

Especialmente:

```text
crear Negocio
aceptar invitación
reenviar invitación
```

La estrategia y respuestas HTTP se definirán posteriormente.



## 20.8. Acoplamiento entre Módulos

El checklist de preparación puede consultar si otros módulos poseen configuraciones necesarias.

Esto NO significa que la entidad `Negocio` deba importar o administrar directamente:

```text
ArticuloCatalogo
Stock
MedioPago
Receta
Caja
```

La coordinación transversal se diseñará en la capa de aplicación/consultas correspondiente.

M01 conserva la responsabilidad de organización; no se convierte en un agregador de todos los dominios.

---

## 20.9. Autorización sin RBAC Dinámico Prematuro

Durante el MVP:

```text
Rol
+
reglas concretas por módulo
```

son suficientes para expresar autorización funcional.

No crear automáticamente:

```text
Permiso
RolPermiso
ACL genérica
motor de políticas dinámico
```

sin una necesidad funcional posterior.

Una implementación puede centralizar políticas de autorización en código de aplicación, manteniendo las reglas explícitas y testeables.


---

# 21. Pruebas Derivables Mínimas

## Usuarios

1. registrar Email nuevo;
2. impedir Email funcionalmente duplicado;
3. autenticación válida;
4. autenticación inválida sin filtrar detalles sensibles;
5. Usuario sin Negocio puede existir.

## Negocio

6. crear Negocio con primera membresía Propietaria;
7. si falla la membresía inicial, no confirmar Negocio;
8. modalidades 1..N;
9. moneda ARS en MVP.

## Membresías

10. Usuario puede participar en varios Negocios;
11. rol distinto por Negocio;
12. impedir segunda membresía histórica `Usuario + Negocio`;
13. desactivar `ACTIVO → INACTIVO`;
14. reactivar la misma membresía histórica;
15. reactivación aplica el rol nuevo propuesto;
16. miembro ya `ACTIVO` no se reincorpora ni cambia de rol;
17. `incorporarOReactivarMiembro(..., null)` crea exactamente una membresía;
18. `incorporarOReactivarMiembro(..., membresiaINACTIVA)` devuelve/reutiliza la misma identidad histórica;
19. rechazar `membresiaHistorica` perteneciente a otro Usuario;
20. rechazar `membresiaHistorica` perteneciente a otro Negocio;
21. rechazar rol inicial fuera de `{ENCARGADO, TRABAJADOR}`;
22. impedir desactivar al último Propietario;
23. impedir degradar al último Propietario;
24. permitir promover segundo Propietario.

## Invitaciones

25. emitir como Propietario `ACTIVO`;
26. impedir emitir como Encargado/Trabajador;
27. impedir `rolPropuesto = PROPIETARIO`;
28. impedir invitar miembro ya `ACTIVO`;
29. crear `fechaExpiracion > fechaEmision`;
30. límite `ahora == fechaExpiracion` no vigente;
31. impedir segunda `PENDIENTE` vigente equivalente;
32. `PENDIENTE` vencida permite nueva emisión tras materializar expiración cuando corresponda;
33. reenviar mantiene identidad, rol y `fechaExpiracion`;
34. aceptar válida usando un único `ahora`;
35. impedir aceptar vencida;
36. impedir aceptar con Email distinto;
37. revalidar membresía `ACTIVA` al aceptar;
38. aceptación prepara membresía válida antes de mutar invitación a `ACEPTADA`;
39. aceptación + membresía se confirman atómicamente;
40. rechazo válido;
41. impedir rechazar vencida;
42. cancelar vigente;
43. cancelar `PENDIENTE` ya vencida;
44. expirar solo cuando no vigente;
45. estados terminales no admiten nuevas transiciones.

## Concurrencia

46. dos registros equivalentes → una cuenta;
47. dos emisiones equivalentes → una `PENDIENTE`;
48. dos aceptaciones → una sola incorporación;
49. aceptar vs incorporación paralela → sin duplicar membresía ni cambiar rol;
50. aceptación vs cancelación/rechazo/expiración concurrente → una única transición válida;
51. creación/activación concurrente de membresía → una única `UsuarioNegocio` histórica;
52. cancelar vs expirar → una transición;
53. dos operaciones sobre último Propietario → nunca cero Propietarios activos;
54. emisión/cancelación/cambio de rol conservan actor y momento según estrategia de trazabilidad.

---

# 22. Decisiones Técnicas que Permanecen Abiertas

No decidir desde esta especificación:

```text
framework IAM
hash concreto de contraseña
JWT vs sesión
refresh tokens
cookies

Aggregate Roots formales
Repository
Unit of Work
Domain Events
Service Layer concreto

UUID vs otro tipo de identidad
token de invitación exacto
hash del token
rotación del token

Clock concreto
tipo datetime concreto
política de zona horaria de presentación

locking optimista/pesimista
nivel de aislamiento
constraints SQL exactos
índices exactos

normalización técnica de Email

endpoints
DTOs
schemas API

ciclo formal de cierre del Negocio
cambio de moneda
```

Las decisiones técnicas futuras deben **satisfacer** estas reglas.

No deben redefinirlas silenciosamente.

---

# 23. Errores de Implementación a Evitar

No implementar:

```text
Usuario.rol
```

El rol pertenece a `UsuarioNegocio`.

No implementar:

```text
UsuarioNegocio activo : Boolean
```

si eso reemplaza el modelo aprobado:

```text
EstadoMembresia = ACTIVO / INACTIVO
```

No implementar:

```text
InvitacionNegocio.vigencia
```

como atributo ambiguo.

Utilizar conceptualmente:

```text
fechaExpiracion
```

No asumir:

```text
PENDIENTE == vigente
```

No aceptar/rechazar invitaciones vencidas.

No extender expiración al reenviar.

No modificar rol de miembro ACTIVO mediante invitación.

No crear una segunda membresía histórica.

No hacer que `Negocio` consulte repositories para descubrir `membresiaHistorica`.

No instanciar/reactivar `UsuarioNegocio` directamente desde Application saltándose `Negocio.incorporarOReactivarMiembro(...)`.

No reutilizar una `membresiaHistorica` perteneciente a otro Usuario o a otro Negocio.

No implementar la whitelist de incorporación únicamente como `rolInicial != PROPIETARIO`.

No crear un Negocio sin Propietario inicial.

No permitir que dos operaciones concurrentes eliminen al último Propietario.

No autorizar solo desde frontend.

No permitir modificar estados mediante setters públicos sin invariantes.

No introducir `EstadoNegocio` hasta que se defina su ciclo de vida.

No introducir infraestructura dentro de entidades por comodidad.

---

# 24. Checklist para una Futura Implementación

```text
[ ] Email es Value Object / semántica funcional consistente.
[ ] Email globalmente único según equivalencia funcional.
[ ] Contraseñas no forman parte del modelo conceptual de Usuario.
[ ] Negocio no posee ciclo ACTIVO/INACTIVO inventado.
[ ] UsuarioNegocio usa EstadoMembresia ACTIVO/INACTIVO.
[ ] Usuario + Negocio posee una sola membresía histórica.
[ ] Application consulta membresiaHistorica y la entrega al dominio; Negocio no consulta repositories.
[ ] incorporarOReactivarMiembro(...) recibe membresiaHistorica opcional.
[ ] Rol de incorporación usa whitelist {ENCARGADO, TRABAJADOR}.
[ ] Membresía INACTIVA reutiliza la misma identidad histórica.
[ ] Membresía ACTIVA provoca rechazo y no modifica Rol.
[ ] Negocio revalida que membresiaHistorica corresponda al mismo Usuario y Negocio.
[ ] Crear Negocio + Propietario inicial es atómico.
[ ] Último Propietario está protegido al confirmar.
[ ] InvitacionNegocio usa fechaExpiracion.
[ ] PENDIENTE no se confunde con vigente.
[ ] Ahora == fechaExpiracion significa no vigente.
[ ] Solo Propietario ACTIVO emite/cancela.
[ ] Rol inicial no puede ser PROPIETARIO.
[ ] Miembro ACTIVO no recibe nueva incorporación.
[ ] Solo una PENDIENTE vigente equivalente.
[ ] Reenvío no crea nueva invitación.
[ ] Reenvío no extiende fechaExpiracion.
[ ] Aceptación utiliza un único instante temporal coherente ahora.
[ ] Aceptación revalida Email, tiempo, estado y membresía antes de mutar.
[ ] Aceptación prepara una membresía válida antes de pasar InvitacionNegocio a ACEPTADA.
[ ] Aceptación + membresía es atómica.
[ ] InvitacionNegocio no crea directamente UsuarioNegocio.
[ ] Ningún camino de error de aceptación puede confluir con éxito.
[ ] Entidades no consultan repositories.
[ ] Backend revalida autorización.
[ ] Persistencia protege invariantes concurrentes.
[ ] Tokens no son autorización suficiente.
[ ] No existen setters públicos que salteen reglas.
[ ] Los módulos posteriores definen permisos concretos.
[ ] No se creó infraestructura no aprobada.
```

---

# 25. Estado de la Especificación

Con esta revisión, el documento funcional de M01 queda sincronizado conceptualmente con las decisiones actuales de:

```text
01-modelo-dominio-bloque-1.md
01-diagrama-general.puml
02-m01-organizacion-clases.md
02-m01-organizacion-clases.puml
04-m01-estados-invitacion.md
04-m01-estados-invitacion.puml
05-m01-estados-membresia.md
05-m01-estados-membresia.puml
secuencias/01-aceptar-invitacion.puml
```

En particular queda fijado que:

```text
Application
→ resuelve membresiaHistorica mediante persistencia

Negocio
→ incorporarOReactivarMiembro(
      usuario,
      rolInicial,
      membresiaHistorica
  )

InvitacionNegocio
→ protege su propia transición local

Persistencia
→ protege atomicidad, unicidad y conflictos concurrentes
```

La revisión de etiquetas documentales globales como:

```text
congelado
sincronizado
cerrado
```

se realizará al finalizar la sincronización transversal de todo el Bloque 1.

No corresponde comenzar implementación definitiva mientras existan contradicciones entre los artefactos estructurales, de estados y de secuencia del Bloque 1.

