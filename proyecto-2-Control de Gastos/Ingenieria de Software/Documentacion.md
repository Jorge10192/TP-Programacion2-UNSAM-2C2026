# Documentación del sistema - Saldo

## 1. Descripción

- Su objetivo es centralizar en un único lugar la organización de gastos, la distribución de responsabilidades, las autorizaciones individuales, el cálculo de saldos y la liquidación de pagos.
- El sistema busca resolver gastos planificados, en los que los participantes acuerdan previamente cuánto aportará cada uno y autorizan su participación antes de ejecutar el pago.
- El MVP va a utilizar un servicio de prueba de API de Mercado Pago y una prueba real de descarga de App Store para un testeo real.

## 2. Problema

- Una persona debe disponer temporalmente de dinero para cubrir gastos que en realidad corresponden al grupo (otros usuarios);
- El responsable debe controlar quién pagó, cuánto pagó y quién todavía mantiene una deuda pendiente;
- Una persona puede ser incluida o comprometida en un gasto sin que exista una autorización explícita de su parte;
- Cuando existen muchos participantes pueden producirse errores de comunicación, distribución y seguimiento;
- No siempre existen mecanismos claros para limitar cuánto dinero desea comprometer cada participante.

"Problema a resolver:
La coordinación de un gasto compartido, desde su acuerdo y distribución entre los participantes hasta su pago y posterior liquidación, se encuentra fragmentada entre varias personas, aplicaciones y transferencias independientes."
  
## 3. Objetivos

Permitir que un grupo pueda:

- organizar gastos dentro de espacios;
- definir responsables de pagó y quiénes participan;
- repartir un gasto de diferentes formas;
- conocer cuánto debe o tiene a favor cada persona; Sirve si solo gestionamos???
- registrar pagos y aportes a objetivos comunes.
- Definir alertas/recordatorios de pagos
- Programar/automatizar operaciones. 

## 4. Alcance

### Incluido en el prototipo

- Espacios de tipo evento, permanente (Ej: pagos mensuales o recurrentes) y objetivo (Ej: evento particular de 1 sola vez).
- Presupuesto opcional para eventos. (Ampliar)???
- Combinar distintos eventos en uno solo multiple (Ej: Viaje definir pasajes, hotel, excursiones etc)
- Historial de gastos particular por eventos / Historial de eventos donde participa el usuario.
- Categorías de gastos.
- División en partes iguales, montos fijos o porcentajes.
- Cálculo automático de saldos.
- Registro simulado de pago realizado para ver estado posterior al evento.
- Objetivos de ahorro y aportes.
- Perfil y resumen visual.
- Enlace de invitación simulado.

### Fuera del alcance actual

- Registro e inicio de sesión.
- Persistencia en una base de datos.

- Backend (con python).
- API con FastAPI
- Front (con Javascript/Typescript)
- BBDD (PostgreSQL)
-> Para monetizar plantear un modelo escalable en la nube (GCS o AWS)  

- Invitaciones y usuarios reales.
- Transferencias o medios de pago reales.
- Autorizaciones, límites personales y comprobantes legales.
- Notificaciones, informes exportables y auditoría.

## 5. Actor

### | Actor | Descripción |

#### | Usuario |
Puede:
1) crear espacio de pago;
2) participar en espacios;
3) registrar gastos;
4) consultar gastos;
5) establecer límites;
6) aceptar/rechazar participaciones;
7) Establecer limites de pagos;
8) consultar historial;
9) participar de pagos.
    
#### | Organizador | Es un usuario que crea o administra determinado gasto.
Puede:
1) Crear un gasto compartido
2) Editar un gasto compartido
3) Enviar invitacion a otro usuario
4) Designar responsable de pago (Usuario que computa el pago al proveedor)
  4.1) Asignar un responsable de pago (Por default es el organizador)
  4.2) Designar pago conjunto sin responsable unico.

#### | Participante | Es un usuario que se une a un gasto compartido creado
Puede:
1) consultar participación %
2) aceptar su pago
3) rechazar su pago
4) consultar estado

#### | Responsable del pago | 
Es Usuario que realiza el pago principal cuando se utiliza una modalidad en la que una persona paga y luego es compensada por el resto.

#### | Proveedor de pagos | 
Actor externo encargado de procesar una orden de pago. En la versión académica será simulado

#### | Servicio de notificaciones |
Actor externo opcional encargado de informar nuevas solicitudes, autorizaciones, rechazos, pagos y comprobantes.

Un mismo usuario puede ser organizador, participante y responsable de pago en una operación, y tener roles distintos en otra.
El prototipo usa datos de ejemplo y simula las acciones de todos los participantes desde una misma sesión.

## 6. Requisitos funcionales

| Código | Requisito |
| --- | --- |
| RF-01 | El sistema debe permitir crear un espacio de evento, permanente u objetivo. |
| RF-02 | El sistema debe permitir registrar un gasto con monto, descripción, categoría, pagador y participantes. |
| RF-03 | El sistema debe permitir dividir un gasto en partes iguales, montos fijos o porcentajes. |
| RF-04 | El sistema debe validar que exista al menos un participante y que el reparto ingresado coincida con el total. |
| RF-05 | El sistema debe mostrar los movimientos y el uso del presupuesto de cada espacio. |
| RF-06 | El sistema debe calcular el saldo de cada integrante según lo pagado y lo consumido. |
| RF-07 | El sistema debe proponer transferencias para cancelar las deudas del grupo. |
| RF-08 | El sistema debe permitir marcar una transferencia propuesta como pagada. |
| RF-09 | El sistema debe permitir registrar aportes a un objetivo de ahorro. |
| RF-10 | El sistema debe mostrar un perfil y un resumen de los espacios del usuario. |
| RF-11 | El sistema debe generar un enlace de invitación simulado. |

## 7. Requisitos no funcionales

| Código | Requisito |
| --- | --- |
| RNF-01 | La demo debe funcionar en un navegador moderno sin instalación. |
| RNF-02 | La interfaz debe adaptarse a pantallas de escritorio y móviles. |
| RNF-03 | Los cálculos deben actualizarse inmediatamente después de cada acción. |
| RNF-04 | Los montos deben mostrarse con formato de moneda de Argentina. |
| RNF-05 | La aplicación debe informar que los datos son temporales y simulados. |

## 8. Casos de uso

### CU-01 - Crear espacio

- **Actor:** Usuario.
- **Precondición:** La demo está abierta.
- **Flujo principal:**
  1. El usuario selecciona `Crear espacio`.
  2. Ingresa un nombre y elige el tipo.
  3. Si es un evento, puede indicar un presupuesto.
  4. Si es un objetivo, indica el monto esperado.
  5. Confirma la creación.
- **Alternativa:** Si falta el nombre o el monto obligatorio del objetivo, el sistema muestra un aviso.
- **Resultado:** El nuevo espacio u objetivo queda disponible durante la sesión.

### CU-02 - Registrar gasto

- **Actor:** Usuario.
- **Precondición:** Existe al menos un espacio con participantes.
- **Flujo principal:**
  1. El usuario selecciona `Registrar gasto`.
  2. Elige espacio, monto, descripción y categoría.
  3. Indica quién pagó.
  4. Elige participantes y forma de división.
  5. Confirma el gasto.
- **Alternativas:** El sistema rechaza montos inválidos, una lista vacía de participantes o un reparto que no complete el monto o el 100 %.
- **Resultado:** El gasto se agrega y los saldos se recalculan.

### CU-03 - Consultar movimientos y saldos

- **Actor:** Usuario.
- **Precondición:** Existe un espacio.
- **Flujo principal:**
  1. El usuario abre `Espacios` para ver gastos y presupuesto.
  2. Abre `Saldos` para consultar cuánto debe o tiene a favor cada integrante.
  3. El sistema muestra una propuesta de transferencias.
- **Resultado:** El usuario conoce el estado del grupo.

### CU-04 - Registrar deuda pagada

- **Actor:** Usuario.
- **Precondición:** El sistema propone al menos una transferencia.
- **Flujo principal:**
  1. El usuario abre `Saldos`.
  2. Selecciona `Pagado` en una transferencia.
  3. El sistema registra el pago simulado y vuelve a calcular los saldos.
- **Resultado:** La deuda queda compensada durante la sesión.

### CU-05 - Administrar objetivo

- **Actor:** Usuario.
- **Precondición:** Existe un objetivo de ahorro.
- **Flujo principal:**
  1. El usuario abre `Objetivo`.
  2. Selecciona `Aportar`.
  3. Ingresa un monto mayor que cero y confirma.
  4. El sistema actualiza el progreso y el historial.
- **Alternativa:** Si el monto no es válido, el sistema muestra un aviso.
- **Resultado:** El aporte queda registrado durante la sesión.

### CU-06 - Invitar participante

- **Actor:** Usuario.
- **Precondición:** La demo está abierta.
- **Flujo principal:**
  1. El usuario selecciona `Invitar gente`.
  2. El sistema genera un enlace de ejemplo.
  3. Intenta copiar el enlace al portapapeles.
- **Alternativa:** Si no se puede copiar, el sistema muestra el enlace en pantalla.
- **Resultado:** El usuario obtiene un enlace simulado; no se crea una invitación real.

### CU-07 - Consultar y compartir resumen

- **Actor:** Usuario.
- **Precondición:** Hay datos de ejemplo en los espacios.
- **Flujo principal:**
  1. El usuario abre `Perfil`.
  2. Consulta cantidad de gastos, saldo a favor y deuda.
  3. Selecciona `Compartir resumen del viaje`.
  4. El sistema muestra una tarjeta visual.
- **Resultado:** Se presenta un resumen simulado; la demo no lo envía a otras aplicaciones.

## 9. Diagrama de casos de uso

```mermaid
flowchart LR
    U[Usuario]

    subgraph S[Saldo]
        CU1([Crear espacio])
        CU2([Registrar gasto])
        CU3([Consultar movimientos y saldos])
        CU4([Registrar deuda pagada])
        CU5([Administrar objetivo])
        CU6([Invitar participante])
        CU7([Consultar y compartir resumen])
    end

    U --> CU1
    U --> CU2
    U --> CU3
    U --> CU4
    U --> CU5
    U --> CU6
    U --> CU7

    CU2 -. actualiza .-> CU3
    CU4 -. actualiza .-> CU3
```

## 10. Diagrama del modelo de dominio

```mermaid
classDiagram
    class Usuario {
        +id
        +nombre
    }
    class Espacio {
        +id
        +nombre
        +tipo
        +presupuesto
    }
    class Gasto {
        +monto
        +descripcion
        +categoria
        +modoDivision
    }
    class Participacion {
        +montoOPorcentaje
    }
    class Pago {
        +origen
        +destino
        +monto
    }
    class Objetivo {
        +nombre
        +montoObjetivo
        +fecha
    }
    class Aporte {
        +monto
        +fecha
    }

    Usuario "*" -- "*" Espacio : participa
    Espacio "1" *-- "*" Gasto : contiene
    Usuario "1" -- "*" Gasto : paga
    Gasto "1" *-- "*" Participacion : se divide
    Usuario "1" -- "*" Participacion : consume
    Espacio "1" *-- "*" Pago : compensa
    Objetivo "1" *-- "*" Aporte : recibe
    Usuario "1" -- "*" Aporte : realiza
```

## 11. Diagrama de secuencia - Registrar gasto

```mermaid
sequenceDiagram
    actor U as Usuario
    participant I as Interfaz
    participant V as Validador
    participant M as Datos en memoria
    participant C as Calculador de saldos

    U->>I: Completa el formulario de gasto
    I->>V: Validar monto, participantes y división
    alt Datos inválidos
        V-->>I: Informar error
        I-->>U: Mostrar aviso
    else Datos válidos
        V-->>I: Confirmar datos
        I->>M: Agregar gasto
        I->>C: Recalcular saldos
        C->>M: Leer gastos y pagos
        C-->>I: Devolver nuevos saldos
        I-->>U: Mostrar gasto y saldos actualizados
    end
```

## 12. Arquitectura actual

```mermaid
flowchart LR
    U[Usuario] --> N[Navegador]
    N --> H[saldo-demo.html]
    H --> UI[HTML y CSS]
    H --> L[Lógica JavaScript]
    L --> D[Datos en memoria]
```

Todo el prototipo está contenido en `saldo-demo.html`. No existe comunicación con servicios externos y no hay persistencia.

## 13. Pruebas mínimas de aceptación

| Prueba | Acción | Resultado esperado |
| --- | --- | --- |
| PA-01 | Crear un evento con nombre y presupuesto. | El espacio aparece y muestra su presupuesto. |
| PA-02 | Registrar un gasto dividido en partes iguales. | El movimiento aparece y los saldos cambian. |
| PA-03 | Registrar una división por montos que no coincide con el total. | El botón de guardado queda deshabilitado y se informa la diferencia. |
| PA-04 | Marcar una transferencia como pagada. | La propuesta y los saldos se recalculan. |
| PA-05 | Aportar un monto positivo a un objetivo. | Aumenta el progreso y aparece el aporte en el historial. |
| PA-06 | Recargar la página. | La demo vuelve a sus datos iniciales porque no posee persistencia. |

## 14. Mejoras futuras

1. Agregar backend, base de datos y autenticación.
2. Implementar invitaciones y permisos reales por usuario.
3. Guardar espacios, gastos, pagos y objetivos.
4. Incorporar autorizaciones antes de comprometer dinero de otra persona.
5. Integrar medios de pago solo después de definir seguridad y auditoría.
