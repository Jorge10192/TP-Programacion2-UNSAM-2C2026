# 03A — Guía detallada: identidad, empresas y catálogo

**Proyecto:** Asistente PyME · **Documento asociado:** [Modelo de dominio y UML](../03_MODELO_DE_DOMINIO_Y_UML.md) · **Versión:** 0.3 · **Estado:** modelo conceptual TO-BE, no API implementada.

![03A — Identidad, empresas y catálogo](03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg)

[Ver SVG vectorial](03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg) · [Ver fuente PlantUML](03A_CLASES_IDENTIDAD_Y_CATALOGO.puml) · [Documento 02: casos de uso](../02_CASOS_DE_USO.md).

## 1. Finalidad y organización

El diagrama responde tres preguntas: **quién usa la plataforma**, **a qué empresa tiene acceso** y **qué datos pertenecen a esa empresa**. Representa el núcleo de identidad y configuración, sin confundir a una persona con un único negocio ni con un rol global.

La lámina se divide en **Identidad y acceso** (izquierda) y **Empresa y recursos** (derecha). Las cajas son clases y sus atributos; las líneas indican asociaciones y cardinalidades. Los recuadros de reglas son notas editoriales, no entidades adicionales.

**Simplificación gráfica:** la relación «fundador histórico» aparece como nota en el SVG para evitar una conexión que atraviese toda la lámina. La fuente PlantUML incluye esa asociación. En SQL se propone conservarla mediante una referencia de Empresa a Usuario.

## 2. Entidades y responsabilidades

| Clase | Propósito | Regla principal |
|---|---|---|
| **Usuario** | Identidad personal y global: correo normalizado, hash de contraseña y estado | Puede formar parte de cero, una o varias empresas; no contiene un rol empresarial global |
| **Membresia** | Vínculo entre Usuario y Empresa, con rol y estado propios | La API valida su vigencia y los permisos necesarios para cada operación empresarial |
| **Empresa** | Espacio independiente de gestión (*tenant*) | Nace ACTIVA, con una membresía administrativa inicial; puede tener cero ubicaciones y cero artículos |
| **Invitacion** | Propuesta de incorporación dirigida a un correo y rol | Estar PENDIENTE no concede acceso; aceptar requiere autenticación y validaciones |
| **Ubicacion** | Local, feria, depósito u otro espacio con capacidades de venta o almacenamiento | Pertenece a una empresa y no se crea automáticamente al crearla |
| **ArticuloCatalogo** | Bien físico o servicio, con SKU, unidad y precio/costo informativos | No crea existencias al registrarse; los servicios no consumen stock automáticamente en MVP |
| **Proveedor** | Referencia comercial para adquisiciones | Pertenece a una empresa y puede quedar inactivo sin borrar historial |

Los campos son conceptuales. Las claves foráneas que se deducen de las asociaciones se concretarán al diseñar el esquema SQL; no todas tienen que aparecer duplicadas dentro de las cajas UML.

## 3. Cómo leer las cardinalidades

- **Usuario 1 — 0..* Membresias:** cada membresía corresponde a un solo usuario. Un usuario puede no pertenecer todavía a ninguna empresa o estar vinculado a varias.
- **Empresa 1 — 1..* Membresias:** cada empresa válida tiene al menos una membresía, creada junto con la empresa para su titular administrativo inicial. Puede tener muchas otras. La pareja empresa–usuario no debe duplicarse.
- **Usuario 1 — 0..* Empresas como fundador:** cada empresa registra su fundador histórico; una persona puede fundar varias. Fundador no equivale a propietario legal ni implica permisos perpetuos.
- **Empresa 1 — 0..* Ubicaciones / Articulos / Proveedores:** los recursos empresariales pertenecen a una empresa, pero son opcionales inicialmente.
- **Empresa 1 — 0..* Invitaciones:** una empresa puede emitir invitaciones. Emitirlas no modifica membresías.
- **Usuario 0..1 — 0..* Invitaciones:** puede invitarse a un correo sin cuenta preexistente; la asociación a una identidad existente es opcional.

Convenciones: **0..1** = cero o uno; **1** = exactamente uno; **0..*** = cero o muchos; **1..*** = uno o muchos.

## 4. Recorridos operativos de principio a fin

### 4.1 Registro y creación de empresa (CU-01, CU-02, CU-03)

1. El visitante se registra e inicia sesión. El backend crea/consulta su identidad global, con contraseña almacenada mediante un hash seguro.
2. El usuario autenticado solicita crear un negocio. La API valida los datos de entrada.
3. En **una sola transacción** se guarda Empresa, el fundador histórico y una Membresia activa con responsabilidad administrativa inicial.
4. Si falla cualquier parte, no queda una empresa sin responsable. Si la creación tiene éxito, el usuario puede configurar su negocio.
5. **No aparecen depósitos, ubicaciones ni existencias ficticias**. Una empresa exclusivamente de servicios puede comenzar sin ellos.
6. En futuras solicitudes se comprueba la membresía correspondiente a la empresa indicada, no solo la identidad del token.

### 4.2 Ubicaciones y artículos (CU-04, CU-05)

1. Un administrador con autorización registra una ubicación indicando si permite vender, almacenar o ambas operaciones.
2. Registra un artículo del catálogo como bien físico o servicio. La API verifica el SKU dentro de esa empresa.
3. Un bien físico puede existir en catálogo con stock cero; solo recepciones/ajustes válidos incrementarán sus existencias.
4. Si un artículo tiene precio de referencia no informado, al vender se pide precio explícito en el renglón.
5. Un servicio puede venderse sin depósito; no descuenta insumos de forma automática durante el MVP.

### 4.3 Invitación y aceptación (CU-12, soporte propuesto)

1. Un administrador autorizado crea una invitación para un destinatario y rol permitido.
2. La invitación permanece PENDIENTE; el destinatario aún no puede consultar datos empresariales.
3. Si no existe cuenta, el invitado debe registrarse e iniciar sesión antes de aceptar.
4. Al aceptar, el servidor revisa identidad, token, vencimiento, empresa, rol y estado.
5. Una transacción consume la invitación y crea/activa la membresía una sola vez.

**Ejemplo multiempresa:** la misma persona puede administrar Empresa A y vender en Empresa B. Los permisos se resuelven por Membresia, no como subclases globales de Usuario.

## 5. Reglas de integridad y pruebas asociadas

| Requisito | Verificación esperada |
|---|---|
| Identidad global | Correo normalizado único; no crear usuarios duplicados por cambios de mayúsculas o espacios |
| Membresía por empresa | Unicidad de la pareja (business_id, user_id) |
| Permisos | Conocer un identificador empresarial ajeno nunca concede acceso a sus datos |
| SKU | Unicidad de (business_id, sku_normalizado) cuando se informó SKU; reutilizable en otra empresa |
| Integridad de tenant | FK compuestas y consultas acotadas por empresa; la integridad referencial **no reemplaza** la autorización del servidor |
| Historial | Desactivar ubicación, artículo o proveedor no elimina compras/ventas históricas |
| Invitaciones | Token pendiente o vencido no habilita acceso; dos aceptaciones no generan dos membresías |

## 6. Alcance y límites

Este diagrama **no** modela compras, recepciones, ventas ni movimientos: eso se explica en [03B](03B_EXPLICACION_COMPRAS_INVENTARIO_VENTAS.md). Tampoco es un DER físico ni una API desplegada. Transferencia de titularidad, suspensión empresarial completa, envío automático de invitaciones y consumo de insumos por servicio quedan sujetos a otras decisiones.

## 7. Preguntas para defenderlo

**¿Por qué separar Usuario y Membresia?** Porque la identidad es global y el rol es particular de cada empresa. Esto impide mezclar privilegios de negocios distintos.

**¿Por qué no crear siempre una ubicación?** Un prestador de servicios no necesariamente tiene depósito. Las operaciones físicas sí exigen una ubicación apta.

**¿Por qué SKU por empresa?** Distintas empresas pueden utilizar el mismo código, pero dentro de una debe identificar de forma inequívoca al artículo.

**Estado:** diseño TO-BE aprobado como referencia conceptual; no acredita autenticación ni autorización de backend ya implementadas.
