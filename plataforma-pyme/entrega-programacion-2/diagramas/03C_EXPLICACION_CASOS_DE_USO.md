# 03C — Guía detallada: diagrama de casos de uso de la primera API

**Proyecto:** Asistente PyME · **Documento asociado:** [Modelo de dominio y UML](../03_MODELO_DE_DOMINIO_Y_UML.md) · **Versión:** 0.3 · **Estado:** alcance de la API TO-BE; no funcionalidad backend implementada.

![03C — Casos de uso de la primera API](03C_CASOS_DE_USO_REDISENADO.svg)

[Ver SVG vectorial](03C_CASOS_DE_USO_REDISENADO.svg) · [Ver fuente PlantUML](03C_CASOS_DE_USO.puml) · [Especificaciones detalladas CU-01 a CU-12](../02_CASOS_DE_USO.md).

## 1. Para qué sirve este diagrama

El diagrama responde: **¿qué objetivos puede cumplir cada clase de usuario con la plataforma?** A diferencia de los diagramas de clases 03A y 03B, **no** explica la estructura de tablas ni objetos; describe interacciones con el sistema desde el punto de vista de sus actores.

El rectángulo **«Asistente PyME / API RESTful»** delimita el sistema bajo estudio. Dentro se ven óvalos, que representan objetivos funcionales; fuera se sitúan figuras de actores. Las líneas sin flecha entre actor y óvalo representan asociaciones. **La API no es un actor de sí misma**: está dentro del límite.

Los ocho bloques de color agrupan visualmente temas (acceso, empresas, administración, compras, inventario, ventas, invitaciones y aclaraciones); **no** son módulos obligatorios de despliegue ni relaciones UML adicionales.

## 2. Actores externos y permisos por empresa

| Actor representado | Qué puede iniciar en el alcance dibujado |
|---|---|
| **Visitante** | CU-01 registrarse y CU-02 iniciar sesión |
| **Usuario autenticado** | CU-03 crear una empresa |
| **Administrador de empresa** | CU-04 registrar ubicación, CU-05 registrar artículo/servicio y CU-12a invitar colaborador |
| **Operador de compras** | CU-06 registrar compra y CU-07 confirmar recepción |
| **Operador de inventario** | CU-08 consultar existencias, CU-09 trasladar y CU-11 registrar ajuste |
| **Operador de ventas** | CU-10 registrar venta |
| **Destinatario autenticado de invitación** | CU-12b aceptar invitación |

**Advertencia importante:** estos perfiles son **roles funcionales ejercidos en el contexto de la Membresia de una empresa**, no subclases permanentes del usuario. La misma persona puede figurar como Administrador en Empresa A y Operador de ventas en Empresa B. El backend verificará el permiso real para cada objetivo, incluso si una persona accede directamente al endpoint.

No se dibujan Proveedor, Cliente ni la API como actores porque en este MVP no interactúan directamente con el sistema mediante una cuenta. Proveedor es una referencia comercial; los datos del cliente de una venta no implican un actor autenticado.

## 3. Los casos de uso, uno por uno

| CU | Objetivo | Disparador y recorrido básico | Resultado observable |
|---|---|---|---|
| **CU-01** | **Registrarse** | Visitante introduce datos personales y credenciales; la API valida formato, unicidad e integridad | Se crea una identidad global sin contraseñas en claro |
| **CU-02** | **Iniciar sesión** | Visitante presenta credenciales; la API valida identidad y estado | Sesión/token válido según contrato de autenticación |
| **CU-03** | **Crear empresa** | Usuario autenticado informa los datos de negocio; API crea empresa y membresía inicial en una transacción | Empresa activa y usuario titular administrativo inicial |
| **CU-04** | **Registrar ubicación** | Administrador introduce nombre, tipo, aptitud de venta y almacenamiento | Ubicación asociada únicamente a su empresa |
| **CU-05** | **Registrar artículo o servicio** | Administrador informa datos de catálogo, tipo, unidad, SKU y precios cuando apliquen | Ficha creada sin inventario físico inicial |
| **CU-06** | **Registrar compra** | Operador registra proveedor opcional y renglones con costos/cantidades | Compra histórica registrada, todavía **sin entrada de stock** |
| **CU-07** | **Confirmar recepción** | Operador selecciona compra pendiente y una ubicación apta; backend confirma toda la entrega | Una recepción completa y sus entradas físicas, sin duplicación |
| **CU-08** | **Consultar existencias** | Operador consulta artículo y/o ubicación de su empresa | Cantidades actuales provenientes del saldo autorizado |
| **CU-09** | **Trasladar existencias** | Operador indica origen, destino, artículo, cantidad y motivo | Salida y entrada registradas atómicamente, sin stock negativo |
| **CU-10** | **Registrar venta** | Operador carga bienes/servicios, descuento y pagos declarados | Venta, renglones, pagos y salidas físicas confirmados juntos |
| **CU-11** | **Registrar ajuste** | Operador señala diferencia o merma, cantidad y motivo obligatorio | Ajuste trazable, con control concurrente de saldo |
| **CU-12a** | **Invitar colaborador** | Administrador autorizado emite invitación dirigida a persona/correo y rol | Invitación pendiente sin permisos concedidos |
| **CU-12b** | **Aceptar invitación** | Destinatario autenticado presenta invitación válida | Membresía creada/activada una vez y token consumido |

**CU-12a y CU-12b** son dos óvalos porque intervienen distintos actores y cada uno tiene un objetivo propio, pero ambos corresponden a la **especificación unificada CU-12** del Documento 02. No implica que haya trece especificaciones independientes.

## 4. Cómo funcionan las cadenas de casos de uso

### 4.1 Empresa nueva con productos

1. Un visitante ejecuta **CU-01** para registrarse y **CU-02** para iniciar sesión.
2. Un usuario ya autenticado ejecuta **CU-03** y crea la empresa sin depósito ficticio.
3. Un administrador de esa empresa ejecuta **CU-04** para habilitar una ubicación que almacena bienes y **CU-05** para dar de alta un producto.
4. El operador de compras registra una adquisición con **CU-06**: aún no existe entrada de stock.
5. Cuando llega la mercadería, ejecuta **CU-07** para asignarla y recibirla por completo en una sola ubicación.
6. El operador de inventario puede comprobar existencias mediante **CU-08**; trasladar con **CU-09** o justificar faltantes con **CU-11**.
7. Un operador de ventas ejecuta **CU-10**; el backend valida y descuenta existencias dentro de una transacción.

Estos pasos constituyen una **secuencia de negocio ilustrativa**, no una relación UML «include» obligatoria entre todos los óvalos.

### 4.2 Empresa únicamente de servicios

1. El usuario crea una empresa con **CU-03**, sin ubicaciones por defecto.
2. El administrador registra un servicio mediante **CU-05**.
3. El operador de ventas puede registrar la prestación con **CU-10**, sin descontar bienes físicos ni exigir depósito.
4. Si en el futuro compra insumos para trabajar, puede registrar esos bienes y recibirlos en una ubicación, pero el consumo automático asociado a la prestación **no forma parte de este MVP**.

### 4.3 Incorporación de un segundo usuario

1. Un administrador emite una invitación mediante **CU-12a**.
2. Si la persona todavía no tiene cuenta, primero realiza **CU-01** y **CU-02**.
3. La persona autenticada ejecuta **CU-12b**.
4. La API valida invitación, destinatario y empresa. Al aceptar, genera su membresía con el rol permitido.
5. Desde entonces el nuevo colaborador puede operar solo dentro de los permisos de esa empresa. Pertenecer a otra empresa no le concede derechos sobre la primera.

**No hay autoalta de membresía por recibir un enlace**: la aceptación válida es un acto diferente.

## 5. Escenarios alternativos y errores que el dibujo no detalla

El diagrama de casos de uso **no reemplaza** a las especificaciones del Documento 02. Por ejemplo:

- Si CU-07 intenta recepcionar una compra ya recibida, la API rechaza la segunda recepción; el mismo reintento idempotente devuelve su resultado anterior.
- Si CU-10 mezcla bienes físicos y servicios, solo los bienes descontarán stock. Si faltan unidades, falla **toda** la operación, no parte.
- Si dos usuarios venden la última unidad al mismo tiempo, el backend confirma una venta y rechaza la otra mediante control transaccional probado con PostgreSQL.
- Si CU-09 solicita trasladar más de lo disponible, ni origen ni destino se modifica.
- Si CU-11 registra una salida mayor que el saldo, se rechaza; si es un conteo físico obsoleto, se solicita revisión.
- Si CU-12b utiliza un token ajeno, vencido o consumido, no crea membresía.
- Si alguien conoce el ID de una empresa ajena, la API debe negar sus operaciones aunque la interfaz visual normalmente oculte esas opciones.

Cada excepción concreta, precondición, resultado y test se describe en [02_CASOS_DE_USO.md](../02_CASOS_DE_USO.md).

## 6. Trazabilidad con los requerimientos

| Requisito | Casos de uso mostrados | Alcance de primera API |
|---|---|---|
| RF-01 Identidad y autenticación | CU-01, CU-02 | Núcleo requerido por consigna |
| RF-02 Empresas y membresías | CU-03, CU-12a/b | CU-03 núcleo; invitaciones CU-12 soporte propuesto |
| RF-03 Ubicaciones | CU-04 | Soporte mínimo para operaciones físicas |
| RF-04 Catálogo | CU-05 | Núcleo |
| RF-05 Compras y recepción | CU-06, CU-07 | Núcleo, recepción única completa |
| RF-06 Inventario | CU-07, CU-08, CU-09, CU-11 | Núcleo |
| RF-07 Ventas | CU-10 | Núcleo, pagos solo declarados |

Gastos/caja (RF-08), cuentas financieras (RF-09), QR (RF-10), entregas parciales, producción y consumos automáticos de insumos por servicios **no aparecen** porque no integran el recorte de API aquí documentado.

## 7. Convenciones UML y decisiones gráficas

- **Actor:** rol externo que desea alcanzar una meta. No representa necesariamente una clase Python ni un registro de base de datos.
- **Óvalo:** objetivo del actor. El CU se especifica por pasos en el Documento 02; no se listan dentro del óvalo.
- **Línea actor–óvalo:** asociación; no significa que el actor tenga permiso sin autenticar o sin validar la membresía.
- **Rectángulo del sistema:** frontera de lo desarrollado en la primera API.
- **Bloques coloreados:** agrupaciones editoriales para lectura; no equivalen a operaciones incluidas/extendidas.
- **Sin generalización global de actores:** se evita mostrar administradores y operadores como subtipos fijos de Usuario.
- **Sin include/extend decorativos:** solo se introducirán esas dependencias si están justificadas por el comportamiento y los contratos.

## 8. Preguntas para la defensa

**¿Por qué dibujar al Visitante fuera del sistema?** Porque es un actor externo que inicia registro/login; el sistema representado es la plataforma/API.

**¿Por qué un usuario puede aparecer como varios actores?** Porque cada actor es una función contextual. La autorización se deriva de la membresía de la empresa actual.

**¿Por qué CU-12 ocupa dos óvalos?** Porque invitar y aceptar son metas distintas de actores distintos, aunque el Documento 02 las trate como un proceso único.

**¿Por qué este diagrama no dibuja transacciones SQL?** Porque describe **qué** logra cada actor; el **cómo** interno de las clases y transacciones se explica en 03A, 03B y los contratos posteriores.

**Estado:** diagrama de interacción del backend TO-BE. Su publicación no significa que ya existan endpoints operativos.
