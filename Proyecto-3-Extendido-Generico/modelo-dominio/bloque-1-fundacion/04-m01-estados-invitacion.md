# 04 — M01 Organización — Guía Semántica del Diagrama de Estados de `InvitacionNegocio`

## 1. Propósito

Este documento acompaña al artefacto:

```text
04-m01-estados-invitacion.puml
```

y a su representación visual:

```text
04-m01-estados-invitacion.png
```

Su objetivo es permitir que una persona, desarrollador, arquitecto o modelo de IA interprete correctamente el **Diagrama 4 — Ciclo de Vida de `InvitacionNegocio`** y pueda utilizarlo posteriormente como fuente de dominio para:

- diseño arquitectónico;
- modelo relacional;
- contrato API;
- implementación backend;
- implementación frontend;
- validaciones;
- concurrencia;
- seguridad;
- pruebas automatizadas;
- mantenimiento;
- revisión de cambios;
- generación de código asistida por IA.

Este documento NO reemplaza la especificación funcional de M01.

Su función es explicar la semántica del diagrama de estados y evitar interpretaciones incorrectas durante implementación.

---

# 2. Ubicación dentro de la Documentación

Ubicación esperada:

```text
Proyecto-3-Extendido-Generico/
└── modelo-dominio/
    └── bloque-1-fundacion/
        ├── 01-modelo-dominio-bloque-1.md
        ├── 01-diagrama-general.puml
        ├── 02-m01-organizacion-clases.md
        ├── 02-m01-organizacion-clases.puml
        ├── 03-m02-catalogo-clases.md
        ├── 03-m02-catalogo-clases.puml
        ├── 04-m01-estados-invitacion.md
        ├── 04-m01-estados-invitacion.puml
        └── 04-m01-estados-invitacion.png
```

Este archivo:

```text
04-m01-estados-invitacion.md
```

es la guía semántica oficial del Diagrama 4.

---

# 3. Fuentes de Verdad

Para interpretar o implementar el ciclo de vida de `InvitacionNegocio`, debe respetarse este orden:

```text
1. modulos/M01-organizacion-negocio.md

2. modelo-dominio/bloque-1-fundacion/
   01-modelo-dominio-bloque-1.md

3. modelo-dominio/bloque-1-fundacion/
   02-m01-organizacion-clases.md

4. modelo-dominio/bloque-1-fundacion/
   04-m01-estados-invitacion.md

5. modelo-dominio/bloque-1-fundacion/
   04-m01-estados-invitacion.puml

6. ADRs / Diseño Técnico

7. Modelo Relacional

8. Contrato API

9. Implementación
```

Si existiera una contradicción entre estas fuentes:

```text
NO resolverla silenciosamente desde el código.
NO elegir arbitrariamente una interpretación.
NO considerar la implementación como fuente superior.
```

La contradicción debe corregirse primero en la documentación de dominio correspondiente.

---

# 4. Alcance

Este documento describe exclusivamente el ciclo de vida de:

```text
InvitacionNegocio
```

Incluye:

- estados permitidos;
- transiciones;
- reglas temporales;
- aceptación;
- rechazo;
- cancelación;
- expiración;
- reenvío;
- identidad del destinatario;
- interacción conceptual con `UsuarioNegocio`;
- guardias locales;
- guardias contextuales;
- concurrencia;
- atomicidad;
- seguridad;
- persistencia;
- pruebas derivables.

No administra:

```text
UsuarioNegocio completo
autenticación técnica
JWT
sesiones
OAuth
repositorios
tablas
ORM
transacciones concretas
cron
scheduler
email provider
WhatsApp API
```

---

# 5. Entidad Modelada

`InvitacionNegocio` representa una propuesta formal para incorporar una persona a un `Negocio`.

Conceptualmente posee información como:

```text
InvitacionNegocio
├── identificadorSeguro
├── negocio
├── emisor
├── emailDestino : Email
├── rolPropuesto : Rol
├── estado : EstadoInvitacion
├── fechaEmision
└── fechaExpiracion
```

Los nombres técnicos definitivos de atributos y columnas se decidirán posteriormente.

En particular:

```text
fechaExpiracion
```

es el nombre conceptual recomendado en dominio.

Un posible:

```text
expires_at
```

pertenece a la capa técnica/relacional.

---

# 6. Estados Permitidos

La máquina posee exactamente cinco estados:

```text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

No deben agregarse sin modificar previamente la especificación funcional:

```text
ENVIADA
REENVIADA
REVOCADA
ARCHIVADA
VENCIDA_PENDIENTE
UTILIZADA
ELIMINADA
SUSPENDIDA
```

---

# 7. Naturaleza de los Estados

| Estado | Naturaleza | Significado |
| --- | --- | --- |
| `PENDIENTE` | Transitorio | La invitación fue emitida y su ciclo de vida aún no fue cerrado por un estado terminal. |
| `ACEPTADA` | Terminal | El destinatario aceptó formalmente la invitación. |
| `RECHAZADA` | Terminal | El destinatario rechazó explícitamente la invitación. |
| `CANCELADA` | Terminal | Un Propietario autorizado revocó la invitación. |
| `EXPIRADA` | Terminal | La pérdida de vigencia temporal fue materializada como estado. |

`ACEPTADA`, `RECHAZADA`, `CANCELADA` y `EXPIRADA` no admiten transiciones posteriores de dominio.

La entidad continúa existiendo históricamente en dichos estados.

Por lo tanto:

```text
estado terminal
≠
eliminación física
```

---

# 8. Significado Exacto de `PENDIENTE`

Este punto es crítico.

`PENDIENTE` significa:

> La invitación fue emitida y todavía no se confirmó un estado terminal.

Regla explícita:

```text
PENDIENTE
NO implica vigencia temporal.
```

NO significa necesariamente:

```text
la invitación todavía es temporalmente válida
```

Puede existir temporalmente:

```text
estado = PENDIENTE
+
estaVigente(ahora) = false
```

cuando la expiración se materializa de manera diferida.

Por lo tanto:

```text
estado
```

y:

```text
vigencia temporal
```

son conceptos relacionados pero distintos.

---

# 9. Estado Persistido vs. Vigencia Temporal

La vigencia depende del tiempo.

La invitación posee:

```text
fechaEmision
fechaExpiracion
```

La condición conceptual es:

```text
estaVigente(ahora)
⇔
ahora < fechaExpiracion
```

En consecuencia:

```text
ahora == fechaExpiracion
→ NO vigente
```

y:

```text
ahora > fechaExpiracion
→ NO vigente
```

La comparación debe utilizar instantes temporales coherentes y timezone-aware.

La estrategia técnica exacta se define en Arquitectura.

---

# 10. `fechaExpiracion`

`fechaExpiracion` se fija al emitir la invitación.

Debe cumplirse:

```text
fechaExpiracion > fechaEmision
```

La política de duración puede configurarse posteriormente, por ejemplo:

```text
24 horas
48 horas
72 horas
7 días
```

pero dicha política NO debe recalcular retroactivamente invitaciones existentes.

Ejemplo:

```text
Invitación emitida con política de 72 horas
↓
fechaExpiracion fijada

Posteriormente:
política global cambia a 48 horas

Resultado:
la invitación existente conserva
su fechaExpiracion original.
```

---

# 11. Uso de Tiempo en Implementación

La futura implementación debe permitir pruebas deterministas.

Evitar dispersar:

```text
datetime.now()
Date.now()
system clock directo
```

por múltiples partes del dominio.

Conceptualmente:

```text
Caso de Uso
↓
obtiene "ahora"
↓
utiliza ese mismo instante
durante toda la operación
```

La forma concreta puede resolverse posteriormente mediante una abstracción de reloj o mecanismo equivalente.

El Diagrama 4 no prescribe una implementación específica de `Clock`.

---

# 12. Estado Inicial

Toda invitación válida comienza en:

```text
PENDIENTE
```

Representación:

```text
[*] → PENDIENTE
```

Evento conceptual:

```text
emitir
```

La emisión requiere guardias locales y contextuales.

---

# 13. Emisión Válida

Una emisión válida requiere conceptualmente:

```text
emisor con UsuarioNegocio ACTIVO
+
rol PROPIETARIO
+
emisor perteneciente al mismo Negocio
+
rolPropuesto ∈ {ENCARGADO, TRABAJADOR}
+
destinatario sin membresía ACTIVA
+
sin otra invitación PENDIENTE vigente equivalente
```

No se permite una invitación inicial con:

```text
rolPropuesto = PROPIETARIO
```

La promoción a Propietario pertenece a otra operación explícita de M01.

---

# 14. Identidad del Destinatario

La invitación se vincula funcionalmente mediante:

```text
emailDestino : Email
```

Durante el MVP:

```text
Usuario.email
=
InvitacionNegocio.emailDestino
```

debe interpretarse utilizando la equivalencia funcional definida por el Value Object `Email`.

No crear en el dominio automáticamente atributos como:

```text
emailNormalizado
emailLowercase
emailCanonical
```

La representación técnica necesaria para búsquedas e índices pertenece posteriormente al Modelo Relacional.

---

# 15. Unicidad de Invitación Pendiente

Regla funcional:

> Para una misma combinación `Negocio + Email funcionalmente equivalente` puede existir como máximo una invitación `PENDIENTE` y vigente.

Si existe una invitación PENDIENTE vigente:

```text
NO crear otra.
```

La UX debe poder ofrecer:

```text
Reenviar
Compartir nuevamente
Cancelar
```

según permisos.

---

# 16. Invitación `PENDIENTE` pero Vencida

Si:

```text
estado = PENDIENTE
+
estaVigente(ahora) = false
```

entonces:

```text
NO aceptar
NO rechazar
```

pero todavía puede ocurrir:

```text
PENDIENTE → CANCELADA
```

si un Propietario autorizado la cancela antes de que la expiración sea materializada.

También puede ocurrir:

```text
PENDIENTE → EXPIRADA
```

al materializar la pérdida de vigencia.

La primera transición confirmada cierra el ciclo.

---

# 17. Emisión Frente a una PENDIENTE Vencida

Una fila persistida como:

```text
PENDIENTE
```

pero temporalmente vencida no debe bloquear para siempre una nueva invitación.

Conceptualmente, el Caso de Uso de emisión debe poder:

```text
1. localizar PENDIENTE equivalente;

2. evaluar vigencia;

3. si está vencida:
   materializar EXPIRADA;

4. revalidar ausencia de PENDIENTE equivalente;

5. emitir nueva invitación.
```

La secuencia debe ejecutarse dentro de una misma frontera de consistencia.

La tecnología concreta se define posteriormente.

---

# 18. Reenvío

Reenviar o compartir nuevamente una invitación vigente:

```text
NO crea otra InvitacionNegocio
NO cambia estado
NO cambia rolPropuesto
NO cambia fechaExpiracion
NO cambia la identidad de dominio de la invitación
```

Conceptualmente:

```text
reenviar
→ misma InvitacionNegocio
→ mismo estado
→ mismo rolPropuesto
→ misma fechaExpiracion
→ mismo ciclo de vida
```

No representar:

```text
PENDIENTE → PENDIENTE : reenviar
```

porque reenviar no constituye una transición de dominio.

Importante para implementación:

```text
misma InvitacionNegocio
≠
obligatoriamente mismo token o misma representación técnica del enlace
```

La estrategia concreta de enlace/token —reutilización, rotación, firma, hash u otra— pertenece a Seguridad/Arquitectura.

Por lo tanto, una IA NO debe inferir a partir de esta regla que el backend está obligado a conservar exactamente el mismo token público al reenviar.

---

# 19. Cambio de Rol Propuesto

No modificar silenciosamente:

```text
rolPropuesto
```

de una invitación ya emitida.

Ejemplo:

```text
TRABAJADOR
→ ENCARGADO
```

La operación correcta es:

```text
cancelar invitación existente
+
emitir nueva invitación
```

Esto preserva trazabilidad y evita que un enlace previamente compartido cambie de significado.

---

# 20. Aceptación

Transición:

```text
PENDIENTE → ACEPTADA
```

Evento conceptual:

```text
aceptar
```

Requiere:

```text
estado = PENDIENTE
+
estaVigente(ahora)
+
Usuario autenticado
+
email funcionalmente coincidente
+
Usuario sin membresía ACTIVA en el Negocio
al momento de confirmar
```

---

# 21. `puedeSerAceptadaPor`

Puede existir una consulta conceptual:

```text
puedeSerAceptadaPor(email, ahora)
```

que evalúe las reglas locales disponibles para la entidad.

Por ejemplo:

```text
estado == PENDIENTE
&&
estaVigente(ahora)
&&
email equivalente a emailDestino
```

Esta consulta:

```text
NO constituye autorización definitiva
```

ni reemplaza las guardias contextuales del Caso de Uso.

Tampoco debe utilizarse como resultado cacheado para ejecutar posteriormente `aceptar`.

---

# 22. `aceptarPara`

La operación conceptual:

```text
aceptarPara(email, ahora)
```

debe volver a validar sus invariantes locales.

Nunca debe asumir:

```text
"puedeSerAceptadaPor() devolvió true antes,
por lo tanto ahora puedo aceptar sin revisar".
```

Esto evita errores tipo TOCTOU.

---

# 23. Aceptación y Membresía

`InvitacionNegocio` NO crea directamente:

```text
UsuarioNegocio
```

El Caso de Uso coordina:

```text
InvitacionNegocio
PENDIENTE → ACEPTADA

+

Negocio.incorporarOReactivarMiembro(...)
```

La incorporación puede resultar en:

```text
no existe membresía histórica
→ crear UsuarioNegocio ACTIVO

existe membresía INACTIVA
→ reactivar misma UsuarioNegocio
→ aplicar rolPropuesto
```

Si ya existe membresía ACTIVA:

```text
NO aceptar
NO cambiar rol silenciosamente
```

El cambio de rol pertenece a:

```text
Negocio.cambiarRolMiembro(...)
```

---

# 24. Atomicidad de la Aceptación

La aceptación completa constituye una única unidad funcional de consistencia.

Debe cumplirse:

```text
InvitacionNegocio = ACEPTADA
+
UsuarioNegocio creada/reactivada
```

o:

```text
ningún cambio confirmado
```

Nunca debe persistirse:

```text
InvitacionNegocio = ACEPTADA
+
sin membresía correspondiente
```

El mecanismo concreto puede ser:

```text
transacción relacional
Unit of Work
otro mecanismo
```

pero todavía no se decide en este documento.

---

# 25. Revalidación de Membresía al Aceptar

La ausencia de membresía ACTIVA debe revalidarse al confirmar.

Ejemplo:

```text
T0:
Invitación emitida

T1:
Usuario todavía no es miembro

T2:
otra operación incorpora al Usuario

T3:
Usuario intenta aceptar invitación antigua
```

Resultado correcto:

```text
rechazar aceptación
```

No debe:

```text
crear membresía duplicada
reactivar otra membresía
cambiar rol silenciosamente
```

---

# 26. Rechazo

Transición:

```text
PENDIENTE → RECHAZADA
```

Evento:

```text
rechazar
```

Requiere:

```text
estado = PENDIENTE
+
estaVigente(ahora)
+
Usuario autenticado
+
email equivalente a emailDestino
```

`RECHAZADA` representa una decisión explícita del destinatario.

No crea, reactiva ni modifica membresías.

---

# 27. Expirada vs. Rechazada

No son equivalentes semánticamente.

```text
RECHAZADA
→ decisión explícita del destinatario
```

```text
EXPIRADA
→ finalización por pérdida de vigencia
```

Ambas comparten:

```text
no pueden aceptarse posteriormente
```

pero deben permanecer como estados distintos para preservar significado y trazabilidad.

---

# 28. Cancelación

Transición:

```text
PENDIENTE → CANCELADA
```

Evento:

```text
cancelar
```

La autorización contextual exige:

```text
solicitante con UsuarioNegocio ACTIVO
+
rol PROPIETARIO
+
mismo Negocio
```

No requiere:

```text
estaVigente(ahora)
```

Por lo tanto una invitación vencida pero todavía persistida como `PENDIENTE` puede cancelarse.

---

# 29. `cancelar()` y Autorización

La autorización NO debe introducirse necesariamente dentro de la entidad `InvitacionNegocio`.

Separación recomendada:

```text
Caso de Uso
→ autoriza actor

InvitacionNegocio.cancelar()
→ valida que estado == PENDIENTE
→ cambia a CANCELADA
```

No es necesario que la entidad reciba:

```text
solicitante
Rol
token
RequestContext
```

para validar una regla que depende del contexto organizacional externo.

---

# 30. Expiración

Transición:

```text
PENDIENTE → EXPIRADA
```

Evento/criterio conceptual:

```text
vence
[!estaVigente(ahora)]
```

La transición expresa la pérdida temporal de vigencia.

No implica una estrategia técnica determinada.

Puede materializarse posteriormente mediante:

```text
evaluación al acceder
evaluación al emitir una nueva invitación
proceso programado
otra estrategia equivalente
```

---

# 31. `expirar(ahora)`

Puede existir conceptualmente:

```text
expirar(ahora)
```

como comportamiento de dominio para materializar:

```text
PENDIENTE → EXPIRADA
```

Debe validar:

```text
estado == PENDIENTE
+
ahora >= fechaExpiracion
```

Esto NO implica:

```text
cron obligatorio
scheduler obligatorio
background worker obligatorio
```

---

# 32. Carrera `CANCELADA` vs. `EXPIRADA`

Una invitación:

```text
estado = PENDIENTE
+
no vigente
```

puede recibir concurrentemente:

```text
cancelar
```

y:

```text
expirar
```

Solo una transición puede confirmarse.

Ejemplo:

```text
Proceso A:
PENDIENTE → CANCELADA

Proceso B:
intenta PENDIENTE → EXPIRADA
```

si A confirma primero:

```text
B debe fallar
porque estado != PENDIENTE
```

La estrategia concreta de concurrencia se define posteriormente.

---

# 33. Estados Terminales

Los siguientes estados son terminales:

```text
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

No deben permitirse transiciones como:

```text
EXPIRADA → ACEPTADA
RECHAZADA → ACEPTADA
CANCELADA → PENDIENTE
ACEPTADA → CANCELADA
```

Una nueva propuesta posterior utiliza:

```text
una nueva InvitacionNegocio
```

---

# 34. Nueva Invitación Luego de un Estado Terminal

La existencia de una invitación anterior:

```text
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

no bloquea automáticamente una nueva emisión futura.

Sin embargo:

```text
si el destinatario ya posee membresía ACTIVA
→ NO emitir nueva invitación
```

Si una membresía histórica está INACTIVA:

```text
puede emitirse una nueva invitación
```

y, al aceptarla:

```text
se reactiva la misma membresía histórica
```

---

# 35. Guardias Locales

Una guardia es local cuando puede evaluarse mediante información de la propia invitación y valores proporcionados.

Ejemplos:

```text
estado == PENDIENTE

estaVigente(ahora)

email proporcionado
equivalente a emailDestino

fechaExpiracion válida
```

Estas reglas pueden pertenecer a la entidad.

---

# 36. Guardias Contextuales

Requieren información externa a una sola invitación.

Ejemplos:

```text
¿el emisor es PROPIETARIO ACTIVO?

¿pertenece al mismo Negocio?

¿existe otra invitación PENDIENTE?

¿el Usuario posee membresía ACTIVA?

¿debe crearse o reactivarse UsuarioNegocio?

¿el Usuario está autorizado?
```

Estas reglas requieren coordinación del Caso de Uso / capa de aplicación.

---

# 37. Evitar Modelo de Dominio Anémico

Separar guardias contextuales de la entidad NO significa reducir `InvitacionNegocio` a:

```text
objeto con getters/setters
```

La entidad debe proteger:

```text
su estado
su ciclo de vida
vigencia
identidad destinataria donde corresponda
transiciones válidas
```

Evitar:

```text
invitacion.estado = ACEPTADA
```

desde código externo.

Preferir operaciones con significado:

```text
aceptarPara(email, ahora)
rechazarPara(email, ahora)
cancelar()
expirar(ahora)
```

Las firmas conceptuales deben mantenerse coherentes con el modelo de clases de M01.

El evento mostrado en un diagrama de estados puede denominarse simplemente:

```text
aceptar
rechazar
cancelar
vence
```

sin que eso implique una segunda API de dominio distinta.

---

# 38. Evitar Acoplar la Entidad a Repositories

No implementar dentro de `InvitacionNegocio`:

```text
repository.buscarInvitaciones(...)
repository.buscarMembresia(...)
database.query(...)
```

La entidad no debe consultar directamente persistencia.

El Caso de Uso obtiene el contexto requerido y coordina la operación.

---

# 39. Prevalidación vs. Confirmación

Una UI puede consultar previamente:

```text
¿puede aceptar?
¿puede cancelar?
¿hay invitación vigente?
```

pero:

```text
prevalidación
≠
garantía definitiva
```

Antes de confirmar una modificación deben volver a evaluarse las condiciones relevantes.

Esto evita errores TOCTOU:

```text
Time Of Check
↓
Time Of Use
```

---

# 40. Concurrencia — Emisiones Duplicadas

Dos peticiones simultáneas podrían intentar emitir:

```text
mismo Negocio
+
mismo Email
```

No debe ser posible confirmar:

```text
dos PENDIENTE equivalentes
```

La validación del Application Service es necesaria pero no suficiente.

La persistencia debe actuar como última línea de defensa frente a la carrera.

La estrategia concreta se decidirá en Modelo Relacional / Arquitectura.

---

# 41. Persistencia — Invariante Recomendada

El dominio exige:

```text
máximo una invitación PENDIENTE vigente
por Negocio + Email equivalente
```

Para simplificar la persistencia, una implementación relacional puede adoptar una garantía técnica más fuerte:

```text
máximo una invitación PENDIENTE
por Negocio + representación técnica equivalente de Email
```

y, antes de insertar otra:

```text
PENDIENTE vencida → EXPIRADA
```

Esto evita depender de una restricción de unicidad condicionada por el reloj.

Esta posible garantía más fuerte:

```text
NO redefine la semántica de PENDIENTE
NO significa que toda PENDIENTE esté vigente
```

Es únicamente una estrategia técnica posible para preservar de forma segura la invariante funcional bajo concurrencia.

La definición SQL exacta se decide posteriormente.

---

# 42. No Congelar DDL en Este Documento

No considerar obligatoria una implementación como:

```sql
CREATE UNIQUE INDEX ...
WHERE estado = 'PENDIENTE'
```

aunque pueda resultar adecuada posteriormente.

Este documento congela:

```text
la invariante
```

no:

```text
la sintaxis SQL
```

---

# 43. Seguridad del Identificador

La invitación posee conceptualmente un:

```text
identificadorSeguro
```

Su propósito es permitir una referencia segura a la invitación cuando el flujo lo requiera.

Debe evitarse que una referencia pública sea predecible o derivable únicamente de datos triviales.

No utilizar como mecanismo público suficiente:

```text
ID incremental
email
negocio_id
dato fácilmente adivinable
```

No inferir automáticamente:

```text
identificadorSeguro = primary key
identificadorSeguro = UUID
identificadorSeguro = token público persistido en claro
identificadorSeguro = valor inmutable expuesto directamente en toda URL
```

La identidad técnica interna, la representación pública del enlace y la estrategia concreta de token pueden ser conceptos diferentes.

La estrategia exacta se definirá en Seguridad / Arquitectura.

---

# 44. Poseer el Enlace no Otorga Autorización

La aceptación requiere conjuntamente:

```text
invitación utilizable
+
Usuario autenticado
+
email funcionalmente coincidente
```

Por lo tanto:

```text
tener el enlace
≠
estar autorizado para aceptar
```

Una persona distinta que obtenga el enlace no debe poder aceptar la invitación con otra identidad.

---

# 45. Identificador / Enlace Después de un Estado Terminal

Una vez alcanzado:

```text
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

la `InvitacionNegocio` continúa existiendo históricamente.

Su identidad de dominio puede continuar existiendo para consulta, trazabilidad o control, pero:

```text
NO debe habilitar nuevas transiciones
```

La representación pública utilizada por un enlace/token puede:

```text
seguir siendo reconocible para consulta segura
ser invalidada
ser revocada
ser rotada
resolverse mediante otro mecanismo
```

según las decisiones posteriores de Seguridad/Arquitectura.

No asumir que la persistencia histórica de la entidad obliga a mantener utilizable el token público original.

---

# 46. Canales de Distribución

Los canales:

```text
WhatsApp
email
copiar enlace
otro canal futuro
```

no forman parte de la identidad ni del ciclo de vida de `InvitacionNegocio`.

No crear estados como:

```text
ENVIADA_POR_WHATSAPP
ENVIADA_POR_EMAIL
```

Compartir un enlace es una acción de distribución.

No una transición de estado.

---

# 47. Trazabilidad

La futura implementación debe permitir responder conceptualmente, cuando sea requerido por M01:

```text
¿quién emitió?
¿cuándo?
¿quién canceló?
¿cuándo se aceptó?
¿cuándo se rechazó?
¿cuándo se materializó la expiración?
```

Este requisito NO significa que todos esos datos deban convertirse automáticamente en atributos de `InvitacionNegocio`.

Por ejemplo, NO inferir sin una decisión posterior:

```text
fechaAceptacion
fechaRechazo
fechaCancelacion
fechaMaterializacionExpiracion
canceladoPor
aceptadoPor
rechazadoPor
```

como campos obligatorios de la entidad únicamente porque exista una necesidad de trazabilidad.

La información podría resolverse posteriormente mediante el modelo persistente, auditoría específica, eventos, logs estructurados u otro mecanismo adecuado.

Este requisito tampoco obliga todavía a modelar:

```text
Auditoria universal
Event Sourcing
Domain Events
```

La estrategia se decidirá posteriormente.

---

# 48. Auditoría vs. Estado de Dominio

No agregar estados para registrar eventos de auditoría.

Ejemplo incorrecto:

```text
PENDIENTE
→ REENVIADA
→ PENDIENTE
```

El historial de acciones y el estado actual son conceptos diferentes.

---

# 49. Implicancias para API

Una futura API debe evitar mutaciones libres de estado.

Evitar:

```http
PATCH /invitaciones/{id}
{
  "estado": "ACEPTADA"
}
```

si se procesa como una modificación directa.

Preferir conceptualmente comandos/casos de uso:

```text
aceptar invitación
rechazar invitación
cancelar invitación
reenviar invitación
```

La forma HTTP exacta se definirá más adelante.

---

# 50. Idempotencia de Comandos

Debe distinguirse:

```text
idempotencia técnica
```

de:

```text
transición de dominio válida
```

Ejemplo:

```text
aceptar dos veces
```

no debe producir:

```text
dos membresías
dos cambios de rol
dos efectos secundarios
```

La segunda solicitud debe resolverse de manera segura según el contrato API futuro.

No se define aquí si responderá:

```text
200
409
422
otro resultado
```

---

# 51. Reenvío e Idempotencia

Múltiples solicitudes de reenvío:

```text
NO crean múltiples InvitacionNegocio
```

Pueden producir múltiples acciones de distribución externas.

Eso no altera la máquina de estados.

---

# 52. Integración con `UsuarioNegocio`

La invitación no posee una asociación estructural obligatoria con la membresía resultante.

Una aceptación puede provocar:

```text
crear UsuarioNegocio
```

o:

```text
reactivar UsuarioNegocio
```

pero esa consecuencia pertenece al Caso de Uso.

No agregar automáticamente:

```text
InvitacionNegocio.usuarioNegocioId
```

solo porque exista esta coordinación, salvo que una decisión posterior de modelo lo justifique.

---

# 53. Incorporación con Membresía Histórica

Si existe:

```text
UsuarioNegocio
estado = INACTIVO
```

para el mismo Usuario + Negocio:

```text
NO crear segunda membresía histórica
```

Al aceptar:

```text
reactivar misma UsuarioNegocio
+
rol = rolPropuesto
```

Esto respeta la regla de membresía histórica única de M01.

---

# 54. Usuario Ya Miembro ACTIVO

Si antes de emitir:

```text
Usuario ya es miembro ACTIVO
```

no debe emitirse invitación.

Si la membresía se vuelve ACTIVA después de emitir pero antes de aceptar:

```text
la aceptación debe rechazarse
```

No debe utilizarse la invitación como mecanismo para cambiar rol.

---

# 55. Cambio de Rol

Cambiar rol de un miembro existente pertenece a:

```text
Negocio.cambiarRolMiembro(...)
```

No a:

```text
InvitacionNegocio
```

Una invitación no debe modificar silenciosamente el rol de una membresía ACTIVA.

---

# 56. Errores de Dominio Esperables

La implementación debe poder diferenciar errores como:

```text
invitación no encontrada
invitación no PENDIENTE
invitación vencida
identidad no coincidente
miembro ya ACTIVO
rol propuesto inválido
emisor no autorizado
invitación pendiente equivalente
conflicto concurrente
```

No todos deben convertirse necesariamente en clases de excepción distintas.

La taxonomía técnica se definirá posteriormente.

---

# 57. Mensajes al Usuario

La UX puede mostrar mensajes orientativos.

Ejemplos:

```text
Esta invitación venció. Pedí una nueva.

Esta invitación fue cancelada.

Esta invitación ya fue aceptada o ya no está disponible.

La invitación fue enviada a otra cuenta.

Ya existe una invitación pendiente para esta persona.

Esta persona ya pertenece al negocio.
```

El dominio no debe depender de textos de UI.

---

# 58. Pruebas — Emisión

Como mínimo:

### TC-INV-001 — Emisión válida

```text
Given:
Propietario ACTIVO
mismo Negocio
rol permitido
sin miembro ACTIVO
sin PENDIENTE equivalente

When:
emitir

Then:
crear PENDIENTE
fechaExpiracion válida
```

### TC-INV-002 — Emisor no Propietario

```text
Then:
rechazar emisión
```

### TC-INV-003 — Emisor INACTIVO

```text
Then:
rechazar emisión
```

### TC-INV-004 — Rol PROPIETARIO

```text
Then:
rechazar emisión
```

### TC-INV-005 — Destinatario ya miembro ACTIVO

```text
Then:
rechazar emisión
```

### TC-INV-006 — PENDIENTE vigente equivalente

```text
Then:
no crear otra
ofrecer reutilizar/reenviar existente
```

### TC-INV-007 — PENDIENTE vencida equivalente

```text
Then:
materializar EXPIRADA
crear nueva PENDIENTE
```

---

# 59. Pruebas — Tiempo

### TC-INV-008 — Antes del límite

```text
ahora < fechaExpiracion
→ vigente
```

### TC-INV-009 — Exactamente en el límite

```text
ahora == fechaExpiracion
→ no vigente
```

### TC-INV-010 — Después del límite

```text
ahora > fechaExpiracion
→ no vigente
```

### TC-INV-011 — Cambio de política global

Una invitación emitida conserva su `fechaExpiracion` original.

---

# 60. Pruebas — Aceptación

### TC-INV-012 — Aceptar válida

```text
PENDIENTE
vigente
email coincidente
sin membresía ACTIVA
→ ACEPTADA
+ crear/reactivar membresía
```

### TC-INV-013 — Vencida

```text
PENDIENTE
no vigente
→ nunca ACEPTADA
```

### TC-INV-014 — Email diferente

```text
→ rechazar
```

### TC-INV-015 — Se volvió miembro ACTIVO antes de confirmar

```text
→ rechazar aceptación
→ no cambiar rol
```

### TC-INV-016 — Falla reactivación/creación de membresía

```text
→ invitación no queda ACEPTADA
```

---

# 61. Pruebas — Rechazo

### TC-INV-017 — Rechazo válido

```text
PENDIENTE + vigente + identidad coincidente
→ RECHAZADA
```

### TC-INV-018 — Rechazar vencida

```text
PENDIENTE + no vigente
→ no RECHAZADA
```

### TC-INV-019 — Rechazo por identidad distinta

```text
→ rechazar operación
```

---

# 62. Pruebas — Cancelación

### TC-INV-020 — Cancelación válida vigente

```text
PENDIENTE
Propietario ACTIVO mismo Negocio
→ CANCELADA
```

### TC-INV-021 — Cancelación de PENDIENTE vencida

```text
PENDIENTE + no vigente
→ CANCELADA
```

si todavía no fue materializada EXPIRADA.

### TC-INV-022 — Cancelación no autorizada

```text
Encargado / Trabajador
→ rechazar
```

---

# 63. Pruebas — Expiración

### TC-INV-023 — Materializar expiración válida

```text
PENDIENTE
ahora >= fechaExpiracion
→ EXPIRADA
```

### TC-INV-024 — Intentar expirar vigente

```text
PENDIENTE
ahora < fechaExpiracion
→ rechazar
```

---

# 64. Pruebas — Estados Terminales

Para cada uno:

```text
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
```

probar que no admite:

```text
aceptar
rechazar
cancelar
expirar
```

cuando la transición ya no corresponde.

---

# 65. Pruebas — Reenvío

### TC-INV-025

```text
reenviar PENDIENTE vigente
→ misma InvitacionNegocio
→ mismo ID
→ misma fechaExpiracion
→ mismo rolPropuesto
```

### TC-INV-026

```text
reenviar varias veces
→ no crea nuevas invitaciones
```

---

# 66. Pruebas — Cambio de Rol

### TC-INV-027

```text
PENDIENTE con TRABAJADOR

solicitar ENCARGADO

→ CANCELADA
→ nueva PENDIENTE con ENCARGADO
```

No editar en línea.

---

# 67. Pruebas — Concurrencia

### TC-INV-028 — Dos emisiones equivalentes

Solo una debe quedar confirmada como PENDIENTE.

### TC-INV-029 — Cancelar vs. Expirar

Solo una transición desde PENDIENTE puede confirmar.

### TC-INV-030 — Aceptar vs. Incorporación paralela

No deben resultar:

```text
dos membresías
ni cambio de rol silencioso
```

### TC-INV-031 — Dos aceptaciones simultáneas

La misma invitación no puede producir dos incorporaciones.

---

# 68. Pruebas — Email

### TC-INV-032

Emails funcionalmente equivalentes deben considerarse el mismo destinatario según las reglas del Value Object `Email`.

### TC-INV-033

Emails no equivalentes no autorizan aceptación/rechazo.

---

# 69. Pruebas — Seguridad

### TC-INV-034

Poseer token válido con Usuario autenticado de email distinto:

```text
→ no aceptar
```

### TC-INV-035

Token correspondiente a estado terminal:

```text
→ no habilitar transición nueva
```

---

# 70. Qué Debe Hacer una IA al Implementar Este Dominio

Una IA debe:

1. leer primero `M01-organizacion-negocio.md`;
2. leer `01-modelo-dominio-bloque-1.md`;
3. leer `02-m01-organizacion-clases.md`;
4. leer esta guía;
5. leer `04-m01-estados-invitacion.puml`;
6. utilizar la imagen únicamente como apoyo visual;
7. separar guardias locales de contextuales;
8. preservar comportamiento dentro de `InvitacionNegocio`;
9. evitar setters directos de estado;
10. evitar repositories dentro de la entidad;
11. utilizar un instante temporal coherente durante cada operación;
12. respetar el límite exacto de expiración;
13. no extender vigencia mediante reenvío;
14. revalidar antes de confirmar operaciones;
15. preservar membresía histórica única;
16. evitar cambio silencioso de rol;
17. garantizar atomicidad funcional de la aceptación;
18. proteger concurrencia;
19. preservar trazabilidad sin convertir automáticamente auditoría en estado de dominio;
20. distinguir identidad de dominio de token/enlace técnico;
21. no asumir que reenviar obliga a reutilizar exactamente el mismo token público;
22. mantener abiertas las decisiones técnicas todavía no aprobadas.

---

# 71. Qué NO Debe Inferir una IA

El Diagrama 4 NO implica automáticamente:

```text
InvitacionNegocio es Aggregate Root

InvitacionNegocio tiene Repository propio

se usa Unit of Work

se usa Domain Event

se usa Event Sourcing

se usa CQRS

se usa cron

se usa scheduler

se usa Redis

se usa una cola

se usa microservicio

se usa SQL parcial específico

se usa UUID como token

se guarda token plano

se almacena email normalizado
como atributo de dominio
```

Estas decisiones corresponden a Arquitectura.

---

# 72. Qué NO Debe Hacer una IA

No debe:

```text
modificar estado mediante setter público

aceptar una invitación vencida

rechazar una invitación vencida

reactivar una invitación terminal

reutilizar una invitación EXPIRADA

crear segunda membresía histórica

cambiar rol de miembro ACTIVO mediante invitación

crear dos PENDIENTE equivalentes

extender fechaExpiracion al reenviar

convertir WhatsApp en parte del dominio

consultar repositorios desde InvitacionNegocio

usar el token como única autorización

recalcular fechaExpiracion histórica
cuando cambia la política global

agregar atributos de auditoría a InvitacionNegocio
sin una decisión de modelo explícita

asumir que reenviar debe reutilizar
exactamente el mismo token público
```

---

# 73. Implicancias para el Modelo Relacional

El modelo relacional futuro deberá poder representar:

```text
identidad estable de invitación
Negocio
emisor
email destino
rol propuesto
estado
fecha emisión
fecha expiración
identificador seguro
```

y garantizar:

```text
integridad referencial
unicidad relevante
concurrencia
aislamiento por Negocio
```

No se define aquí:

```text
nombre de tablas
tipos SQL
índices concretos
foreign keys exactas
constraints exactos
```

---

# 74. Implicancias para API

La API futura debería representar acciones de negocio, no cambios libres de enum.

Debe soportar conceptualmente:

```text
emitir
aceptar
rechazar
cancelar
reenviar
consultar
```

No debe permitir saltarse las guardias del dominio.

La definición concreta de endpoints permanece abierta.

---

# 75. Implicancias para Frontend

El frontend puede:

- mostrar vigencia;
- mostrar estado;
- habilitar/deshabilitar acciones según contexto;
- ofrecer reenvío;
- orientar a cancelar y emitir nuevamente para cambiar rol.

Pero:

```text
frontend
≠
única capa de validación
```

Toda regla relevante debe validarse nuevamente en backend.

---

# 76. Implicancias para Observabilidad

La futura implementación debería permitir distinguir errores de:

```text
autorización
estado
expiración
identidad
unicidad
concurrencia
membresía
```

Esto mejora:

```text
diagnóstico
soporte
testing
mantenimiento
```

No obliga todavía a una herramienta concreta de logging/monitorización.

---

# 77. Decisiones que Permanecen Abiertas

No decidir todavía desde este documento:

```text
duración concreta de las invitaciones

configuración de dicha duración

implementación concreta del Clock

Repository

Aggregate Roots

Unit of Work

Domain Events

estrategia de locking

optimistic vs pessimistic concurrency

nivel de aislamiento transaccional

DDL exacto

índice exacto

normalización técnica de Email

tipo técnico de fecha/hora

estrategia concreta del token

hash o almacenamiento del token

rotación de token

provider de correo

integración WhatsApp

cron / job / lazy expiration definitivo

estrategia de auditoría
```

---

# 78. Decisiones de Dominio Congeladas

Sí quedan cerradas:

```text
estados:
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA

solo PENDIENTE posee transiciones salientes

ACEPTAR requiere vigencia

RECHAZAR requiere vigencia

CANCELAR no requiere vigencia

EXPIRAR requiere pérdida de vigencia

PENDIENTE no implica vigencia

fechaExpiracion se fija al emitir

reenviar no crea nueva invitación

reenviar no extiende fechaExpiracion

cambiar rol requiere cancelar + emitir nueva

invitación no crea directamente membresía

aceptación + membresía es operación atómica

Usuario ya ACTIVO impide aceptar

membresía histórica INACTIVA se reutiliza

roles iniciales:
ENCARGADO / TRABAJADOR

PROPIETARIO requiere promoción posterior

emailDestino identifica funcionalmente destinatario

canal de distribución es externo
```

---

# 79. Checklist de Sincronización con Otros Artefactos

Esta sección se conserva como checklist hasta la revisión documental final del Bloque 1.

Antes de marcar todos los artefactos como `CONGELADO Y SINCRONIZADO`, revisar:

```text
modulos/M01-organizacion-negocio.md

modelo-dominio/bloque-1-fundacion/
01-modelo-dominio-bloque-1.md

01-diagrama-general.puml

02-m01-organizacion-clases.md

02-m01-organizacion-clases.puml

04-m01-estados-invitacion.md

04-m01-estados-invitacion.puml
```

Especialmente sincronizar:

```text
vigencia
→ fechaExpiracion

estaVigente(ahora)
→ semántica temporal explícita y determinista

expirar(ahora)
→ materialización conceptual de PENDIENTE → EXPIRADA

cancelar()
→ sin autorización interna

aceptarPara(email, ahora) / rechazarPara(email, ahora)
→ estado + vigencia + identidad

unicidad de invitación pendiente

reenvío

membresía activa
```

---

# 80. Checklist de Revisión de Implementación

Antes de aprobar una futura implementación de invitaciones verificar:

```text
[ ] No existen setters públicos de estado.
[ ] PENDIENTE no se confunde con vigencia.
[ ] fechaExpiracion se fija al emitir.
[ ] fechaExpiracion no cambia por reenvío.
[ ] ahora == fechaExpiracion implica vencida.
[ ] Aceptar revalida estado.
[ ] Aceptar revalida vigencia.
[ ] Aceptar revalida email.
[ ] Aceptar revalida ausencia de membresía ACTIVA.
[ ] Rechazar revalida estado.
[ ] Rechazar revalida vigencia.
[ ] Cancelar no exige vigencia.
[ ] Expirar exige pérdida de vigencia.
[ ] Estados terminales no vuelven a PENDIENTE.
[ ] Reenviar no crea otra InvitacionNegocio.
[ ] Cambiar rol cancela y emite otra.
[ ] No se crea segunda membresía histórica.
[ ] No se cambia rol de miembro ACTIVO por invitación.
[ ] La aceptación completa es atómica.
[ ] No se confía solo en prevalidaciones.
[ ] Persistencia protege emisiones concurrentes.
[ ] Cancelación vs expiración es segura.
[ ] Token no sustituye autenticación.
[ ] Email usa equivalencia funcional.
[ ] InvitacionNegocio no consulta repositories.
[ ] Backend vuelve a validar aunque la UI ya validó.
[ ] No se congeló infraestructura prematuramente.
[ ] Toda operación temporal utiliza un único instante `ahora` coherente.
[ ] Reenviar no presupone obligatoriamente reutilizar el mismo token/enlace técnico.
[ ] Identidad de dominio, PK interna y token público no se confunden automáticamente.
[ ] Trazabilidad no se convirtió automáticamente en atributos de dominio.
[ ] Idempotencia técnica no permite saltear guardias de estado.
```

---

# 81. Criterios de Aceptación de Esta Guía

La guía se considera correcta cuando permite que una IA pueda determinar sin ambigüedad:

1. qué estados existen;
2. qué estados son terminales;
3. qué significa PENDIENTE;
4. qué significa estar vigente;
5. cuándo expira;
6. quién puede aceptar;
7. quién puede rechazar;
8. quién puede cancelar;
9. qué reglas pertenecen a la entidad;
10. qué reglas pertenecen al Caso de Uso;
11. cómo interactúa con UsuarioNegocio;
12. qué debe ocurrir con una membresía histórica;
13. qué ocurre si el Usuario ya es miembro activo;
14. qué significa reenviar;
15. cómo cambiar rol propuesto;
16. qué errores concurrentes deben impedirse;
17. qué información debe preservar la persistencia;
18. cómo distinguir identidad de dominio de enlace/token técnico;
19. por qué reenviar no obliga a reutilizar un token concreto;
20. qué necesidades de trazabilidad existen sin sobrediseñar la entidad;
21. qué decisiones todavía NO están tomadas.

---

# 82. Estado del Artefacto

Estado semántico del Diagrama 4:

```text
04-m01-estados-invitacion.puml
✅ APROBADO / CONGELABLE
```

Estado de esta guía:

```text
04-m01-estados-invitacion.md
✅ LISTA PARA CONGELAR
```

La congelación documental completa se realizará en la pasada transversal final del Bloque 1, una vez completados los diagramas dinámicos y secuencias pendientes.

Hasta entonces, estos estados indican aprobación semántica del artefacto, no el cierre documental definitivo del bloque.

---

# 83. Regla Final para Implementación Asistida por IA

Una IA debe interpretar este artefacto mediante el siguiente principio:

> **`InvitacionNegocio` protege su propio ciclo de vida y sus invariantes locales; los Casos de Uso aportan autorización, contexto organizacional, coordinación entre entidades y consistencia externa. El tiempo, la concurrencia y la persistencia deben respetar estas reglas sin trasladar infraestructura al modelo conceptual.**

En forma resumida:

```text
InvitacionNegocio
→ estado
→ vigencia
→ identidad destinataria
→ transiciones locales

Caso de Uso
→ autorización
→ contexto
→ membresía
→ unicidad contextual
→ coordinación atómica

Persistencia
→ integridad
→ concurrencia
→ última línea de defensa

Arquitectura
→ mecanismo técnico
→ representación temporal
→ estrategia de token/enlace
→ mecanismo de concurrencia
```

El código futuro debe adaptarse a estas invariantes.

Las invariantes NO deben adaptarse accidentalmente a las limitaciones del código.
