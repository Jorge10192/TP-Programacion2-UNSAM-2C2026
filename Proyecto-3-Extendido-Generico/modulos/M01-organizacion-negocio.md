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

Persona que posee una cuenta activa.

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

---

# 4. Conceptos del Dominio

## 4.1. Usuario

Representa la identidad global de una persona dentro de la plataforma.

Información conceptual mínima:

- identificador;
- nombre;
- email;
- credencial de acceso;
- estado de la cuenta;
- fecha de registro.

El email funciona como identidad principal para el MVP.

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

---

## 4.2. Negocio

Representa una organización, emprendimiento o comercio administrado mediante la plataforma.

Información conceptual inicial:

- identificador;
- nombre;
- rubro opcional;
- moneda base;
- modalidades operativas;
- estado.

### Datos de creación

```text
Nombre       → obligatorio
Rubro        → opcional
Moneda       → ARS en el MVP
Modalidades  → una o más
```

---

## 4.3. UsuarioNegocio

Representa la participación de un Usuario dentro de un Negocio.

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

La relación se conserva históricamente aunque el usuario deje de participar activamente del negocio.

---

## 4.4. InvitacionNegocio

Representa una propuesta formal para incorporar a una persona a un Negocio.

Debe existir independientemente de que el destinatario ya posea una cuenta.

Información conceptual:

- Negocio;
- email destino;
- rol propuesto;
- identificador seguro de invitación;
- estado;
- fecha de emisión;
- vigencia;
- usuario que realizó la invitación.

Estados:

```text
PENDIENTE
ACEPTADA
RECHAZADA
EXPIRADA
CANCELADA
```

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

# 5. Autenticación del MVP

Para el MVP se utilizará un mecanismo simple basado en:

```text
Email
+
Contraseña
```

El Usuario administra sus propias credenciales.

Un Propietario nunca crea ni conoce la contraseña de otro Usuario.

---

## 5.1. Evoluciones Futuras

Podrán evaluarse posteriormente:

- recuperación de contraseña;
- validación adicional de email;
- PIN de acceso rápido;
- autenticación multifactor;
- autenticación biométrica;
- otros proveedores de identidad.

Estas funcionalidades no deberán condicionar el diseño funcional del MVP.

---

# 6. Invitaciones y WhatsApp

## 6.1. Principio

La invitación pertenece al dominio de M01.

El **canal utilizado para compartirla es independiente de la invitación**.

```text
InvitacionNegocio
        ↓
Enlace de invitación
        │
        ├── Compartir por WhatsApp
        ├── Copiar enlace
        └── Otros canales futuros
```

---

## 6.2. WhatsApp en el MVP

Para el MVP se priorizará:

```text
Generar invitación
        ↓
Generar enlace
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

El envío efectivo queda bajo control del usuario.

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
→ generar enlace
→ compartir manualmente por WhatsApp
```

Una integración automática podrá incorporarse posteriormente.

---

## 6.4. Identidad de la Invitación

WhatsApp es únicamente el canal de distribución.

La identidad del destinatario continúa siendo:

```text
email_destino
```

Por ejemplo:

```text
Invitación:
email_destino = maria@email.com

Enlace enviado por WhatsApp a María
```

Al aceptar:

```text
Cuenta autenticada:
maria@email.com

→ aceptación permitida
```

En cambio:

```text
Cuenta autenticada:
juan@email.com

→ aceptación rechazada
```

Poseer el enlace no es suficiente para apropiarse de una invitación enviada a otra identidad.

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
| **RF-ORG-001** | Registrar Usuario | Permitir crear una cuenta global mediante nombre, email y contraseña. | Usuario no autenticado | Se crea una cuenta válida sin requerir pertenencia a un negocio. |
| **RF-ORG-002** | Iniciar Sesión | Permitir autenticarse mediante email y contraseña. | Usuario | Las credenciales válidas permiten acceder a la plataforma; una cuenta inactiva no puede ingresar. |
| **RF-ORG-003** | Crear Negocio | Permitir a un Usuario autenticado crear un Negocio. | Usuario | Se registra nombre, rubro opcional y moneda ARS; el creador queda asociado como `PROPIETARIO`. |
| **RF-ORG-004** | Configurar Modalidades | Permitir definir una o más modalidades operativas. | Propietario | El negocio conserva las modalidades seleccionadas y la interfaz puede adaptarse a ellas. |
| **RF-ORG-005** | Consultar Negocios e Invitaciones | Mostrar las membresías activas y las invitaciones correspondientes al Usuario. | Usuario | El Usuario visualiza sus negocios activos y las invitaciones destinadas a su identidad. |
| **RF-ORG-006** | Invitar Miembro | Permitir invitar una persona mediante email y rol propuesto. | Propietario | Se crea una `InvitacionNegocio` pendiente para `ENCARGADO` o `TRABAJADOR`. |
| **RF-ORG-007** | Compartir Invitación | Permitir obtener y compartir el enlace de una invitación. | Propietario | El Usuario puede compartirlo por WhatsApp o copiarlo para utilizar otro canal. |
| **RF-ORG-008** | Aceptar Invitación | Permitir aceptar una invitación válida destinada al Usuario autenticado. | Usuario invitado | Se crea o reactiva `UsuarioNegocio` con el rol de la invitación. |
| **RF-ORG-009** | Rechazar Invitación | Permitir al destinatario rechazar una invitación. | Usuario invitado | La invitación queda `RECHAZADA` sin generar membresía. |
| **RF-ORG-010** | Cancelar Invitación | Permitir retirar una invitación pendiente antes de su aceptación. | Propietario | La invitación pasa a `CANCELADA` y deja de ser utilizable. |
| **RF-ORG-011** | Entrar a un Negocio | Permitir seleccionar un Negocio donde el Usuario posea membresía activa. | Usuario | Se establece el contexto del Negocio y los permisos correspondientes al rol. |
| **RF-ORG-012** | Consultar Miembros | Permitir visualizar los integrantes y roles del Negocio. | Miembro autorizado | Se muestran miembros, roles y estados relevantes. |
| **RF-ORG-013** | Modificar Rol | Permitir modificar el rol de un miembro. | Propietario | Se actualiza su rol respetando la invariante del último propietario. |
| **RF-ORG-014** | Promover Propietario | Permitir promover deliberadamente otro miembro activo a `PROPIETARIO`. | Propietario | El Negocio puede poseer múltiples propietarios activos. |
| **RF-ORG-015** | Desactivar Membresía | Permitir desactivar lógicamente la participación de un Usuario. | Propietario | `UsuarioNegocio` queda inactivo y el historial se conserva. |
| **RF-ORG-016** | Reactivar Membresía | Permitir reincorporar a un antiguo miembro mediante una nueva invitación. | Propietario / Usuario invitado | Se reactiva la relación histórica y se aplica el rol de la nueva invitación. |
| **RF-ORG-017** | Consultar Preparación | Mostrar qué configuraciones adicionales resultan necesarias para las funcionalidades elegidas. | Miembro | El sistema presenta un checklist derivado sin crear datos ficticios. |

---

# 9. Reglas de Negocio

## `RN-ORG-001` — Invariante de Propietario Activo

Todo Negocio activo debe poseer al menos un `UsuarioNegocio` activo con rol:

```text
PROPIETARIO
```

No se podrá:

- desactivar;
- remover;
- degradar de rol;
- permitir abandonar el negocio;

al último Propietario activo.

Antes deberá existir otro Propietario activo.

---

## `RN-ORG-002` — Rol Dependiente del Negocio

El Rol pertenece a `UsuarioNegocio`, no a `Usuario`.

Un mismo Usuario puede poseer roles diferentes en distintos negocios.

---

## `RN-ORG-003` — Cuenta Global Independiente

Un Usuario puede existir sin pertenecer a ningún Negocio.

En ese estado puede:

- iniciar sesión;
- consultar invitaciones;
- crear un Negocio.

No puede realizar operaciones comerciales hasta ingresar a un Negocio autorizado.

---

## `RN-ORG-004` — Independencia de Membresías

Desactivar:

```text
UsuarioNegocio.activo = False
```

afecta únicamente la participación en ese Negocio.

No deberá afectar:

- la cuenta global;
- otros negocios;
- operaciones históricas.

---

## `RN-ORG-005` — Reactivación de Membresía

Si un Usuario anteriormente perteneció a un Negocio y su membresía se encuentra inactiva, una nueva incorporación no deberá generar una relación conceptual duplicada.

Al aceptar una nueva invitación:

```text
UsuarioNegocio existente
activo = False

        ↓

activo = True
rol = rol_propuesto_actual
```

El rol anterior no se recupera automáticamente.

---

## `RN-ORG-006` — Vinculación Estricta de Invitaciones

Una InvitacionNegocio solo podrá ser aceptada por una cuenta cuya identidad coincida con el destinatario definido.

Para el MVP:

```text
Usuario.email
=
InvitacionNegocio.email_destino
```

---

## `RN-ORG-007` — Ciclo de Vida de Invitaciones

Una invitación puede encontrarse en:

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

Solo una invitación:

```text
PENDIENTE
+
vigente
```

puede generar o reactivar una membresía.

La duración concreta de la vigencia se definirá posteriormente como configuración técnica.

---

## `RN-ORG-008` — Contexto de Negocio Autorizado

Toda operación correspondiente al dominio de un Negocio requiere:

```text
Usuario autenticado
+
Negocio identificado
+
UsuarioNegocio activo
+
Permisos suficientes
```

Los permisos suficientes se determinan a partir del Rol de `UsuarioNegocio` y de las reglas específicas establecidas por el módulo funcional correspondiente.

El mecanismo técnico utilizado para transmitir y validar este contexto se definirá posteriormente en arquitectura y API.

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

Las operaciones monetarias del Negocio se interpretarán en esa moneda mientras no exista soporte multimoneda.

---

## `RN-ORG-011` — Canal de Invitación Independiente

`InvitacionNegocio` no depende del canal utilizado para entregar el enlace.

En el MVP podrá compartirse mediante:

```text
WhatsApp
Copiar enlace
```

Otros canales podrán agregarse posteriormente sin modificar el concepto de invitación.

---

## `RN-ORG-012` — WhatsApp no Determina Identidad

Enviar o compartir una invitación mediante WhatsApp no convierte el número telefónico en la identidad del Usuario.

La autorización para aceptar la invitación continúa dependiendo de la identidad asociada a la invitación.

---

## `RN-ORG-013` — Invitaciones Iniciales sin Propiedad

Una nueva invitación podrá proponer inicialmente:

```text
ENCARGADO
TRABAJADOR
```

La asignación del rol:

```text
PROPIETARIO
```

debe realizarse posteriormente mediante una acción explícita de gestión de roles.

---

## `RN-ORG-014` — Preparación Derivada

La preparación del Negocio no se representa mediante un único estado rígido.

El sistema determina dinámicamente qué configuraciones faltan según:

- modalidades;
- funcionalidad solicitada;
- configuraciones existentes.

---

## `RN-ORG-015` — Configuración Progresiva

Crear un Negocio no deberá obligar a crear automáticamente entidades pertenecientes a otros módulos.

El Usuario podrá completar la configuración de manera progresiva.

---

## `RN-ORG-016` — Conservación Histórica

La desactivación de una membresía deberá realizarse mediante borrado lógico.

No debe:

- eliminar físicamente la relación;
- eliminar operaciones históricas;
- modificar la autoría de operaciones pasadas.

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

y establece las responsabilidades generales asociadas a:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

Los permisos concretos sobre funcionalidades pertenecientes a otros módulos deberán definirse en la especificación funcional correspondiente.

Conceptualmente:

```text
M01
→ define qué rol posee el Usuario dentro del Negocio

M02 / M03 / M04 / M05 / M06 / M07 / M08
→ definen qué operaciones concretas puede realizar ese rol
   dentro de cada módulo
```

Una especificación funcional de módulo puede establecer una política más restrictiva o más precisa que la descripción general del rol sin modificar el significado conceptual del rol definido por M01.

Ejemplo:

```text
ENCARGADO

M02 — Catálogo
→ consultar                         Sí
→ activar/desactivar artículos     Sí
→ editar artículos                 No
→ modificar precio base            No
→ administrar categorías           No

M05 — Ventas
→ registrar venta                  Sí
→ aplicar descuentos permitidos    Sí
→ modificar precio de la venta     según reglas de M05
```

Las autorizaciones deben evaluarse siempre dentro de:

```text
Usuario autenticado
+
Negocio activo
+
UsuarioNegocio activo
+
Rol
+
reglas específicas del módulo
```

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
3. El sistema valida los datos.
4. Verifica que el email no se encuentre asociado a otra cuenta.
5. Crea el Usuario.
6. Confirma que la cuenta fue creada.
7. El Usuario puede iniciar sesión.

### Flujos Alternativos

#### Email existente

El sistema informa:

> El correo ingresado ya posee una cuenta. Iniciá sesión para continuar.

#### Datos inválidos

El sistema informa los campos que requieren corrección.

### Postcondiciones

Existe un Usuario activo que puede no pertenecer todavía a ningún Negocio.

---

## CU-ORG-02 — Iniciar Sesión

### Actor Principal

Usuario registrado.

### Precondiciones

- Cuenta existente.
- Cuenta activa.

### Flujo Principal

1. El Usuario ingresa email y contraseña.
2. El sistema valida las credenciales.
3. Se inicia la sesión.
4. Se consultan:
   - negocios disponibles;
   - invitaciones pendientes.

### Flujo Alternativo — Sin Negocios

El sistema muestra:

```text
Todavía no pertenecés a ningún negocio.

[ Crear negocio ]
[ Ver invitaciones ]
```

### Flujo Excepcional — Credenciales incorrectas

El acceso es rechazado mediante un mensaje genérico.

### Postcondiciones

El Usuario se encuentra autenticado.

---

## CU-ORG-03 — Crear Negocio

### Actor Principal

Usuario autenticado.

### Precondiciones

Sesión activa.

### Flujo Principal

1. El Usuario selecciona `Crear negocio`.
2. Ingresa:
   - nombre;
   - rubro opcional.
3. Selecciona una o más modalidades:
   - Reventa;
   - Producción;
   - Servicios.
4. El sistema crea el Negocio.
5. Asigna automáticamente:
   - moneda base `ARS`.
6. Vincula al creador mediante `UsuarioNegocio`.
7. Asigna:
   - rol `PROPIETARIO`;
   - membresía activa.
8. El sistema confirma la creación.
9. Presenta el checklist de preparación progresiva.

### Flujo Alternativo — Configuración incompleta

El Usuario puede abandonar temporalmente la configuración posterior y retomarla más adelante.

### Postcondiciones

Existe:

```text
Negocio
+
al menos un PROPIETARIO activo
```

---

## CU-ORG-04 — Invitar Miembro

### Actor Principal

Propietario.

### Precondiciones

- Usuario autenticado.
- Negocio activo seleccionado.
- Rol `PROPIETARIO`.

### Flujo Principal

1. El Propietario accede a `Miembros`.
2. Selecciona `Invitar persona`.
3. Ingresa el email del destinatario.
4. Selecciona:
   - `ENCARGADO`; o
   - `TRABAJADOR`.
5. El sistema valida que no exista una invitación pendiente equivalente.
6. Genera `InvitacionNegocio`.
7. La invitación queda `PENDIENTE`.
8. El sistema genera un enlace de aceptación.
9. Presenta:

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
3. Se abre la opción de compartir mediante WhatsApp.
4. El Propietario selecciona el contacto.
5. Confirma el envío.

### Flujo Alternativo — Copiar enlace

El Propietario copia el enlace y puede enviarlo mediante cualquier canal.

### Flujo Alternativo — Invitación pendiente existente

El sistema informa que ya existe una invitación pendiente.

El Propietario puede:

- conservarla;
- cancelarla;
- emitir posteriormente una nueva.

### Flujo Excepcional — Intento de invitar como Propietario

El sistema no ofrece `PROPIETARIO` como rol inicial de invitación.

### Postcondiciones

Existe una InvitacionNegocio pendiente.

---

## CU-ORG-05 — Aceptar o Rechazar Invitación

### Actor Principal

Usuario invitado.

### Precondiciones

Existencia de una invitación válida.

### Flujo Principal

1. El Usuario recibe el enlace.
2. Accede al enlace.
3. El sistema identifica la invitación.
4. Verifica que se encuentre:
   - pendiente;
   - vigente.

### Escenario A — El invitado no tiene cuenta

5. El sistema solicita registrarse.
6. El proceso conserva el contexto de la invitación.
7. El Usuario finaliza el registro.
8. Inicia sesión.
9. El sistema verifica que el email coincida con el destinatario.
10. Presenta los datos del Negocio y rol propuesto.
11. El Usuario selecciona `Aceptar`.
12. Se crea la membresía.
13. La invitación pasa a `ACEPTADA`.

### Escenario B — El invitado ya posee cuenta

5. El Usuario inicia sesión.
6. El sistema verifica la identidad.
7. Presenta la invitación.
8. El Usuario selecciona `Aceptar`.
9. Se crea o reactiva su membresía.
10. La invitación pasa a `ACEPTADA`.

### Escenario C — Membresía histórica inactiva

Al aceptar:

```text
UsuarioNegocio
activo = True
rol = rol actual de la invitación
```

### Flujo Alternativo — Rechazar

El Usuario selecciona:

```text
Rechazar invitación
```

La invitación pasa a:

```text
RECHAZADA
```

No se crea ni reactiva membresía.

### Flujo Excepcional — Email diferente

Si:

```text
email autenticado
≠
email destino
```

el sistema informa:

> Esta invitación fue enviada a otra cuenta. Iniciá sesión con el correo correspondiente.

### Flujo Excepcional — Invitación inválida

Si está:

- expirada;
- cancelada;
- aceptada;
- rechazada;

no puede volver a utilizarse.

### Postcondiciones

La invitación queda procesada y, si fue aceptada, existe una membresía activa.

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

- Negocio activo.
- Rol `PROPIETARIO`.

### Flujo Principal

1. Consulta los miembros.
2. Selecciona un miembro activo.
3. Consulta su rol actual.
4. Selecciona un nuevo rol.
5. El sistema verifica las invariantes.
6. Actualiza `UsuarioNegocio`.
7. Confirma el cambio.

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

Si el cambio provocaría:

```text
0 PROPIETARIOS activos
```

la operación se rechaza.

### Postcondiciones

El miembro posee el nuevo rol.

---

## CU-ORG-08 — Desactivar Membresía

### Actor Principal

Propietario.

### Precondiciones

- Negocio activo.
- Miembro actualmente activo.

### Flujo Principal

1. El Propietario selecciona un miembro.
2. Solicita desactivarlo.
3. El sistema verifica la invariante del último Propietario.
4. Solicita confirmación.
5. La membresía pasa a inactiva.
6. El Usuario pierde acceso futuro al Negocio.
7. El historial permanece intacto.

### Flujo Excepcional — Último Propietario

La operación es rechazada.

Mensaje:

> El negocio debe conservar al menos un Propietario activo. Asigná otro propietario antes de continuar.

### Postcondiciones

```text
UsuarioNegocio.activo = False
```

conceptualmente, sin eliminar la relación histórica.

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

## `HU-ORG-004` — Invitar por WhatsApp

**Como** Propietario,  
**quiero** compartir una invitación mediante WhatsApp,  
**para** incorporar rápidamente a una persona con la que ya me comunico por ese medio.

### Criterio

**Given** una invitación pendiente,  
**When** selecciono `Compartir por WhatsApp`,  
**Then** la aplicación prepara un mensaje con el enlace de incorporación para que yo elija el contacto y lo envíe.

---

## `HU-ORG-005` — Incorporarme con Mis Credenciales

**Como** persona invitada,  
**quiero** crear o utilizar mi propia cuenta,  
**para** incorporarme sin compartir contraseñas con el Propietario.

### Criterio

**Given** una invitación dirigida a mi email,  
**When** inicio sesión con esa identidad y acepto,  
**Then** quedo vinculado al Negocio con el rol propuesto.

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
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
       ┌──────────┐       ┌───────────┐      ┌───────────┐
       │ ACEPTADA │       │ RECHAZADA │      │ CANCELADA │
       └──────────┘       └───────────┘      └───────────┘
             │
             │
             └── genera/reactiva membresía

PENDIENTE
    │
    └── vence
          ↓
     ┌───────────┐
     │ EXPIRADA  │
     └───────────┘
```

Los estados finales no pueden utilizarse nuevamente.

---

## 12.2. UsuarioNegocio

```text
                ┌────────┐
                │ ACTIVO │
                └───┬────┘
                    │
          desactivar│
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

La reactivación mantiene la identidad de la relación pero puede cambiar el rol.

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
| Email ya registrado | No crea una segunda cuenta. | **Este correo ya posee una cuenta. Iniciá sesión para continuar.** |
| Credenciales inválidas | No inicia sesión. | **Email o contraseña incorrectos.** |
| Cuenta global inactiva | Impide el acceso. | **Tu cuenta se encuentra inactiva.** |
| Invitación inexistente | No muestra datos del Negocio. | **No encontramos esta invitación.** |
| Invitación expirada | No permite incorporarse. | **Esta invitación venció. Pedí al propietario una nueva.** |
| Invitación cancelada | No permite incorporarse. | **Esta invitación fue cancelada.** |
| Invitación procesada | No vuelve a utilizarse. | **Esta invitación ya fue procesada.** |
| Email autenticado diferente | No permite aceptar. | **La invitación fue enviada a otro correo. Iniciá sesión con la cuenta correspondiente.** |
| Invitación pendiente duplicada | Evita propuestas simultáneas innecesarias. | **Ya existe una invitación pendiente para esta persona.** |
| Negocio sin membresía activa | Impide ingresar. | **Ya no tenés acceso a este negocio.** |
| Rol insuficiente | Rechaza la acción. | **No tenés permisos para realizar esta acción.** |
| Último Propietario | Impide degradación/desactivación. | **El negocio debe conservar al menos un Propietario activo.** |
| Configuración pendiente | No genera error técnico; orienta al módulo correspondiente. | **Antes de continuar necesitás completar esta configuración.** |

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
| RF-ORG-001 | RN-ORG-003 | HU-ORG-001 | CU-ORG-01 |
| RF-ORG-002 | RN-ORG-003 | HU-ORG-001 | CU-ORG-02 |
| RF-ORG-003 | RN-ORG-001, RN-ORG-010 | HU-ORG-002 | CU-ORG-03 |
| RF-ORG-004 | RN-ORG-009 | HU-ORG-003 | CU-ORG-03 |
| RF-ORG-005 | RN-ORG-002, RN-ORG-003 | HU-ORG-006 | CU-ORG-02 / CU-ORG-06 |
| RF-ORG-006 | RN-ORG-007, RN-ORG-013 | HU-ORG-004 | CU-ORG-04 |
| RF-ORG-007 | RN-ORG-011, RN-ORG-012 | HU-ORG-004 | CU-ORG-04 |
| RF-ORG-008 | RN-ORG-005, RN-ORG-006, RN-ORG-007 | HU-ORG-005 | CU-ORG-05 |
| RF-ORG-009 | RN-ORG-006, RN-ORG-007 | HU-ORG-005 | CU-ORG-05 |
| RF-ORG-010 | RN-ORG-007 | — | CU-ORG-04 |
| RF-ORG-011 | RN-ORG-008, RN-ORG-017 | HU-ORG-006 | CU-ORG-06 |
| RF-ORG-012 | RN-ORG-002 | HU-ORG-007 | CU-ORG-07 |
| RF-ORG-013 | RN-ORG-001, RN-ORG-002, RN-ORG-017 | HU-ORG-007 | CU-ORG-07 |
| RF-ORG-014 | RN-ORG-001, RN-ORG-013 | HU-ORG-008 | CU-ORG-07 |
| RF-ORG-015 | RN-ORG-001, RN-ORG-004, RN-ORG-016 | HU-ORG-008 | CU-ORG-08 |
| RF-ORG-016 | RN-ORG-005 | HU-ORG-005 | CU-ORG-05 |
| RF-ORG-017 | RN-ORG-009, RN-ORG-014, RN-ORG-015 | HU-ORG-009 | CU-ORG-03 / CU-ORG-06 |

---

# 16. Criterios de Aceptación del Módulo

M01 podrá considerarse funcionalmente completo para el MVP cuando se verifique que:

1. Un Usuario puede registrarse mediante email y contraseña.
2. Un Usuario puede iniciar sesión.
3. Una cuenta puede existir sin estar asociada a ningún Negocio.
4. Un Usuario puede crear un Negocio.
5. El creador queda vinculado automáticamente como `PROPIETARIO`.
6. El Negocio recibe `ARS` como moneda base.
7. El Negocio puede definir una o más modalidades operativas.
8. Un Usuario puede pertenecer a varios Negocios.
9. Puede poseer roles distintos en cada uno.
10. Un Propietario puede generar una invitación para `ENCARGADO` o `TRABAJADOR`.
11. La invitación puede compartirse mediante WhatsApp sin requerir integración automática con WhatsApp Business.
12. El enlace de invitación también puede copiarse y enviarse por otro medio.
13. Un invitado sin cuenta puede registrarse y posteriormente aceptar la invitación.
14. Un Usuario existente puede aceptar una invitación destinada a su email.
15. Un Usuario con otro email no puede apropiarse de una invitación.
16. Una invitación puede aceptarse, rechazarse, cancelarse o expirar.
17. Una membresía histórica inactiva puede reactivarse.
18. La reactivación utiliza el rol definido en la nueva invitación.
19. Un Propietario puede modificar roles.
20. Un miembro puede ser promovido deliberadamente a `PROPIETARIO`.
21. El sistema nunca permite dejar un Negocio activo sin al menos un `PROPIETARIO` activo.
22. Desactivar una membresía no elimina el Usuario.
23. Desactivar una membresía no afecta otros Negocios.
24. Las operaciones históricas conservan al Usuario responsable.
25. El Usuario solo puede operar dentro de Negocios donde posee membresía activa.
26. El sistema puede orientar mediante un checklist de configuración progresiva.
27. La creación del Negocio no genera ubicaciones, medios de pago ni artículos ficticios.
28. Las modalidades adaptan la experiencia pero pueden modificarse posteriormente.
29. M01 define los roles generales del sistema, mientras que los permisos concretos sobre operaciones de otros módulos se rigen por las especificaciones funcionales de dichos módulos.
30. Una restricción específica de un módulo puede limitar las acciones disponibles para un rol sin modificar el rol almacenado en `UsuarioNegocio`.
31. Toda autorización sobre una operación de negocio requiere considerar conjuntamente el Negocio activo, la membresía activa, el Rol y las reglas específicas del módulo correspondiente.

---

# 17. Prioridad y Evolución

## MVP — MUST HAVE

```text
Registro
Login
Crear Negocio
UsuarioNegocio
Roles
Modalidades
Invitaciones
Compartir invitación por WhatsApp
Aceptar / rechazar
Seleccionar Negocio
Gestionar miembros
Cambiar roles
Desactivar membresía
Invariante de Propietario
Aislamiento por Negocio
Checklist progresivo básico
```

---

## Evolución Posterior

```text
Recuperación avanzada de cuenta
Validación adicional de email
PIN rápido
Biometría
MFA
Invitaciones enviadas automáticamente
Integración WhatsApp Business
Email automático de invitaciones
Transferencia formal de propiedad
Salida autónoma de un Propietario
Permisos personalizados por Usuario
```

---

# 18. Criterio Rector del Módulo

La organización interna debe ser suficientemente robusta para soportar:

```text
Usuario
→ múltiples Negocios
→ múltiples Roles
→ múltiples colaboradores
```

sin trasladar esa complejidad al usuario final.

La experiencia buscada es:

```text
Crear cuenta
     ↓
Crear negocio
o
Aceptar invitación
     ↓
Entrar
     ↓
Trabajar
```

La seguridad y el aislamiento pertenecen al sistema.

La simplicidad pertenece al usuario.
