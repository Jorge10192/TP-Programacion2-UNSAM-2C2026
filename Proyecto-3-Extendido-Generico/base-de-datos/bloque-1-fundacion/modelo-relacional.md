# Modelo Relacional — Bloque 1 Fundación

> **Estado:** versión de referencia para implementación de persistencia del Bloque 1.  
> **Alcance:** M01 — Organización del Negocio + M02 — Catálogo.  
> **Motor objetivo:** PostgreSQL 16+.  
> **Objetivo:** traducir el modelo de dominio y las decisiones arquitectónicas ya congeladas a tablas, claves, restricciones, índices y reglas transaccionales concretas sin convertir la base de datos en una segunda capa de dominio.

---

## 1. Propósito

Este documento define el modelo relacional inicial de:

~~~text
M01 — Organización del Negocio
M02 — Catálogo
~~~

Funciona como puente entre:

~~~text
Modelo de Dominio
        ↓
Modelo Relacional
        ↓
ERD
        ↓
SQLAlchemy Models
        ↓
Alembic
        ↓
Repositories
        ↓
Tests de integración
~~~

No representa todavía una migración Alembic literal.

La implementación podrá ajustar sintaxis física sin alterar las decisiones semánticas aquí definidas.

---

## 2. Fuentes de verdad utilizadas

Este modelo debe mantenerse consistente con:

~~~text
modulos/M01-organizacion-negocio.md
modulos/M02-Catalogo.md

modelo-dominio/bloque-1-fundacion/
    01-modelo-dominio-bloque-1.md
    diagramas y máquinas de estado asociadas

arquitectura/
    arquitectura-general.md
    estructura-backend.md
    patrones-de-diseno.md
    multitenant-y-seguridad.md
    docker.md
~~~

Si una futura migración exige romper una invariante definida allí, primero deberá revisarse la decisión funcional o arquitectónica correspondiente.

---

## 3. Principios de persistencia

La base de datos protegerá especialmente:

- integridad referencial;
- unicidades funcionales;
- aislamiento por Negocio;
- estados válidos;
- relaciones cross-tenant imposibles;
- datos monetarios no negativos;
- combinaciones estructuralmente inválidas de ArticuloCatalogo;
- concurrencia que pueda producir duplicados.

Domain y Application seguirán protegiendo:

- intención de las operaciones;
- autorización;
- reglas dependientes del conjunto de entidades;
- transiciones de estado;
- reglas temporales;
- invariantes que no pueden expresarse mediante constraints simples;
- coordinación entre múltiples registros.

Principio:

~~~text
Domain protege significado.
PostgreSQL protege integridad persistida.
Ambos se complementan.
~~~

---

## 4. Estrategia multi-tenant

El modelo utiliza:

~~~text
una base PostgreSQL compartida
+
tablas compartidas
+
negocio_id como frontera tenant
~~~

No se utiliza:

~~~text
una base por Negocio
un schema por Negocio
PostgreSQL RLS
~~~

durante Bloque 1.

Las tablas tenant-scoped deben permitir consultas de la forma:

~~~sql
WHERE negocio_id = :negocio_id
~~~

y, para recursos identificados:

~~~sql
WHERE id = :id
  AND negocio_id = :negocio_id
~~~

---

## 5. Tablas del Bloque 1

El modelo inicial contiene:

~~~text
usuario
negocio
negocio_modalidad
usuario_negocio
invitacion_negocio

categoria
articulo_catalogo
articulo_imagen

auditoria_cambio
~~~

Relación general:

~~~text
usuario
   │
   └── usuario_negocio ───── negocio
                                │
                                ├── negocio_modalidad
                                ├── invitacion_negocio
                                ├── categoria
                                ├── articulo_catalogo
                                │       │
                                │       └── articulo_imagen
                                │
                                └── auditoria_cambio
~~~

---

## 6. Convención de nombres

Se utilizará:

~~~text
snake_case
~~~

para:

- tablas;
- columnas;
- constraints;
- índices.

Las tablas se nombran en singular para mantener cercanía con el lenguaje del dominio.

Ejemplos:

~~~text
usuario
usuario_negocio
articulo_catalogo
~~~

---

## 7. Identificadores

Todas las entidades principales utilizarán:

~~~text
UUID
~~~

como clave primaria.

### Decisión

Para Bloque 1 se utilizará UUIDv4 generado desde la aplicación.

Motivos:

- disponible directamente en Python 3.13;
- no requiere extensión PostgreSQL;
- puede asignarse antes de persistir;
- evita identidad secuencial pública;
- funciona correctamente en el volumen esperado.

Ejemplo conceptual SQLAlchemy:

~~~text
UUID(as_uuid=True)
~~~

UUID no constituye un mecanismo de autorización.

---

## 8. Fechas y zonas horarias

Toda fecha con instante utilizará PostgreSQL:

~~~text
TIMESTAMPTZ
~~~

Los instantes se tratarán en UTC.

Campos temporales funcionales como:

~~~text
fecha_emision
fecha_expiracion
fecha_incorporacion
~~~

deben construirse a partir del reloj de Application cuando la operación necesite un único ahora coherente.

Los timestamps puramente técnicos podrán usar CURRENT_TIMESTAMP como default.

---

## 9. Valores monetarios

Se utilizará:

~~~text
NUMERIC(19,4)
~~~

para:

~~~text
precio_base
costo_referencia
~~~

Python utilizará Decimal.

No se utilizará float para dinero.

Aunque ARS normalmente se exprese con dos decimales, cuatro decimales permiten conservar precisión intermedia sin introducir una escala excesiva.

---

## 10. Persistencia de enums

No se utilizarán PostgreSQL ENUM nativos durante esta etapa.

Los enums se persistirán como:

~~~text
VARCHAR / TEXT
+
CHECK
~~~

Ejemplo:

~~~sql
CHECK (estado IN ('ACTIVO', 'INACTIVO'))
~~~

Motivos:

- migraciones más simples;
- menor acoplamiento al tipo nativo;
- valores legibles;
- buena integración con enums Python;
- evita complejidad innecesaria de ALTER TYPE.

---

## 11. Normalización y claves funcionales

La base necesita proteger equivalencias funcionales sin convertir el texto visible en identidad técnica.

Se utilizarán columnas normalizadas explícitas:

~~~text
usuario.email_normalizado

categoria.nombre_normalizado

articulo_catalogo.nombre_normalizado
articulo_catalogo.sku_normalizado
~~~

La columna visible conserva el valor funcional actual.

La columna normalizada existe exclusivamente para:

- comparación;
- búsqueda;
- unicidad.

### Regla

La misma política de normalización usada por Domain/Application deberá producir el valor persistido.

No se distribuirán expresiones SQL ad hoc de normalización por distintos repositories.

### Poblado de columnas normalizadas

Las columnas `*_normalizado` no se calculan mediante expresiones SQL independientes ni mediante una segunda regla de Infrastructure.

El flujo será:

~~~text
entrada
→ Value Object / normalizador compartido
→ valor funcional + valor normalizado
→ mapper/repository
→ modelo SQLAlchemy
→ PostgreSQL
~~~

El mapper/repository deberá asignar explícitamente ambos valores antes de emitir `INSERT` o `UPDATE`.

Los eventos ORM `before_insert` / `before_update` podrán utilizarse como validación defensiva o para reutilizar el mismo normalizador, pero **no serán la única fuente oculta de normalización**. La semántica debe seguir perteneciendo al concepto de dominio correspondiente.

Un test de integración deberá comprobar que el valor visible y su clave normalizada permanecen coherentes.

Si la política de normalización cambia en el futuro, deberá existir una migración que recalcule las claves normalizadas antes de cambiar constraints.

---

# PARTE I — M01 ORGANIZACIÓN

## 12. Tabla usuario

Representa la identidad global.

### Columnas

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| nombre | TEXT | NO | no vacío |
| email | TEXT | NO | representación funcional actual |
| email_normalizado | TEXT | NO | clave funcional normalizada |
| password_hash | TEXT | NO | detalle IAM, nunca password plano |
| fecha_registro | TIMESTAMPTZ | NO | instante de alta |
| updated_at | TIMESTAMPTZ | NO | timestamp técnico |

### Constraints

~~~sql
PRIMARY KEY (id)

UNIQUE (email_normalizado)

CHECK (btrim(nombre) <> '')
CHECK (btrim(email) <> '')
CHECK (btrim(email_normalizado) <> '')
CHECK (btrim(password_hash) <> '')
~~~

No se permite persistir strings vacíos o compuestos únicamente por espacios como sustituto de un valor obligatorio.

### Password hash

password_hash es una columna técnica de persistencia/IAM.

No forma parte de la entidad Domain Usuario.

La separación Domain / ORM permite que el modelo SQL contenga este dato sin exponerlo como atributo del dominio funcional.

Para el MVP se evita crear una subarquitectura de múltiples tablas de credenciales mientras solo existe autenticación email + contraseña.

Si en el futuro aparecen múltiples proveedores de identidad, esta decisión podrá revisarse sin modificar la identidad del Usuario.

### Ausencias deliberadas

No se crean todavía:

~~~text
estado_cuenta
email_verificado
refresh_token
mfa_secret
oauth_provider
deleted_at
~~~

porque esas capacidades no están congeladas.

---

## 13. Tabla negocio

Representa el tenant.

### Columnas

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| nombre | TEXT | NO | no vacío |
| rubro | TEXT | SÍ | opcional |
| moneda_base | VARCHAR(3) | NO | ARS en MVP |
| version | BIGINT | NO | optimistic concurrency token |
| created_at | TIMESTAMPTZ | NO | técnico |
| updated_at | TIMESTAMPTZ | NO | técnico |

### Constraints

~~~sql
CHECK (btrim(nombre) <> '')
CHECK (rubro IS NULL OR btrim(rubro) <> '')
CHECK (moneda_base IN ('ARS'))
CHECK (version >= 1)
~~~

Si rubro no tiene contenido funcional, Application lo normaliza a `NULL`.

No existe unicidad global de nombre de Negocio.

Dos organizaciones distintas pueden llamarse igual.

### Ausencias deliberadas

No se crean:

~~~text
estado_negocio
activo
deleted_at
fecha_cierre
~~~

porque el Bloque 1 no define ese ciclo de vida.

---

## 14. Tabla negocio_modalidad

Representa el conjunto 1..N de modalidades de cada Negocio.

### Columnas

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| negocio_id | UUID | NO | FK |
| modalidad | VARCHAR | NO | valor permitido |

### Clave primaria

~~~text
PK (negocio_id, modalidad)
~~~

### Valores

~~~text
REVENTA
PRODUCCION
SERVICIOS
~~~

### Constraint

~~~sql
CHECK (modalidad IN ('REVENTA', 'PRODUCCION', 'SERVICIOS'))
~~~

### Foreign key

~~~text
negocio_id
→ negocio.id
ON DELETE CASCADE
~~~

El CASCADE es estructural: la modalidad no existe independientemente del Negocio.

El sistema no implementa actualmente hard delete de Negocio.

### Regla 1..N

PostgreSQL no puede garantizar de forma simple mediante CHECK que siempre exista al menos una fila hija.

La creación y edición de modalidades deberá mantener:

~~~text
Negocio con al menos una modalidad
~~~

dentro de la misma transacción.

No se agrega un trigger únicamente para esta regla.

---

## 15. Tabla usuario_negocio

Representa la membresía histórica única Usuario + Negocio.

### Columnas

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| usuario_id | UUID | NO | FK Usuario |
| negocio_id | UUID | NO | FK Negocio |
| rol | VARCHAR | NO | Rol |
| estado | VARCHAR | NO | EstadoMembresia |
| fecha_incorporacion | TIMESTAMPTZ | NO | se conserva al reactivar |
| version | BIGINT | NO | concurrencia |
| updated_at | TIMESTAMPTZ | NO | técnico |

### Constraints

~~~text
UNIQUE (usuario_id, negocio_id)

CHECK rol IN:
PROPIETARIO
ENCARGADO
TRABAJADOR

CHECK estado IN:
ACTIVO
INACTIVO

CHECK version >= 1
~~~

### Foreign keys

~~~text
usuario_id
→ usuario.id
ON DELETE RESTRICT

negocio_id
→ negocio.id
ON DELETE RESTRICT
~~~

### Clave alternativa técnica

Se agrega:

~~~text
UNIQUE (id, negocio_id)
~~~

aunque id ya sea globalmente único.

Motivo:

permitir foreign keys compuestas que garanticen que otra fila tenant-scoped referencia una membresía del mismo Negocio.

### Invariante histórica

~~~text
UNIQUE (usuario_id, negocio_id)
~~~

garantiza a nivel físico:

~~~text
reincorporar
!=
crear otra membresía
~~~

La reactivación modifica la misma fila.

---

## 16. Último Propietario

La regla:

~~~text
todo Negocio debe conservar
>= 1 UsuarioNegocio ACTIVO
con rol PROPIETARIO
~~~

no puede expresarse correctamente mediante un CHECK de una sola fila.

No se implementará con un trigger complejo en Bloque 1.

### Estrategia

Las operaciones capaces de reducir propietarios activos deberán:

1. iniciar transacción;
2. bloquear la fila negocio correspondiente mediante SELECT ... FOR UPDATE;
3. reconsultar propietarios activos;
4. verificar la invariante;
5. modificar membresía;
6. confirmar.

Esto serializa las operaciones estructurales sensibles dentro de un mismo Negocio.

El mismo criterio se aplica a:

~~~text
desactivar último propietario
degradar último propietario
~~~

---

## 17. Creación de Negocio

La creación válida debe ser atómica.

Una única transacción crea:

~~~text
negocio
+
1..N negocio_modalidad
+
usuario_negocio del creador
    rol = PROPIETARIO
    estado = ACTIVO
~~~

Si cualquiera de estas operaciones falla:

~~~text
ROLLBACK completo
~~~

Nunca debe quedar persistido un Negocio sin propietario inicial.

---

## 18. Tabla invitacion_negocio

Representa una invitación histórica.

### Columnas

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| id | UUID | NO | PK interna |
| negocio_id | UUID | NO | tenant |
| email_destino | TEXT | NO | Email funcional |
| email_destino_normalizado | TEXT | NO | comparación |
| rol_propuesto | VARCHAR | NO | ENCARGADO/TRABAJADOR |
| emisor_usuario_negocio_id | UUID | NO | membresía emisora |
| token_hash | TEXT | NO | hash del token público |
| estado | VARCHAR | NO | EstadoInvitacion |
| fecha_emision | TIMESTAMPTZ | NO | semántica |
| fecha_expiracion | TIMESTAMPTZ | NO | semántica |
| version | BIGINT | NO | transición concurrente |
| updated_at | TIMESTAMPTZ | NO | técnico |

### Estados

~~~text
PENDIENTE
ACEPTADA
RECHAZADA
CANCELADA
EXPIRADA
~~~

### Constraints

~~~sql
CHECK (btrim(email_destino) <> '')
CHECK (btrim(email_destino_normalizado) <> '')
CHECK (btrim(token_hash) <> '')

CHECK (
  rol_propuesto IN ('ENCARGADO', 'TRABAJADOR')
)

CHECK (
  estado IN (
    'PENDIENTE',
    'ACEPTADA',
    'RECHAZADA',
    'CANCELADA',
    'EXPIRADA'
  )
)

CHECK (fecha_expiracion > fecha_emision)
CHECK (version >= 1)
~~~

### Token

El token que viaja en un enlace deberá ser aleatorio y de alta entropía.

La base almacena:

~~~text
token_hash
~~~

no necesariamente el token reutilizable original.

token_hash tendrá UNIQUE global.

Un hash rápido criptográfico es suficiente para un token aleatorio de alta entropía; no se utiliza Argon2id como si fuera una contraseña.

---

## 19. Foreign key del emisor

Debe impedirse:

~~~text
Invitacion del Negocio A
→ membresía emisora del Negocio B
~~~

Para ello se utiliza FK compuesta:

~~~text
(emisor_usuario_negocio_id, negocio_id)

→ usuario_negocio(id, negocio_id)
~~~

Esto requiere la clave alternativa:

~~~text
UNIQUE usuario_negocio(id, negocio_id)
~~~

PostgreSQL protege así la pertenencia tenant del emisor incluso si existe un bug en Application.

---

## 20. Invitación pendiente única

La regla funcional es:

~~~text
máximo una invitación PENDIENTE y vigente
para Negocio + Email equivalente
~~~

La vigencia depende del tiempo actual, por lo que no es apropiado intentar construir un índice cuyo predicado dependa de now().

### Estrategia elegida

Se utilizará un índice único parcial:

~~~sql
CREATE UNIQUE INDEX uq_invitacion_pendiente
ON invitacion_negocio (
    negocio_id,
    email_destino_normalizado
)
WHERE estado = 'PENDIENTE';
~~~

Esto es deliberadamente un poco más fuerte en estado persistido.

Si existe una PENDIENTE ya vencida temporalmente, el Caso de Uso de nueva emisión deberá:

1. bloquear/releer la invitación pendiente existente;
2. determinar su vigencia con un único ahora;
3. materializar EXPIRADA si corresponde;
4. recién entonces insertar la nueva invitación.

### Beneficio

Ante dos emisiones concurrentes, PostgreSQL impide confirmar dos PENDIENTES equivalentes.

La aplicación debe traducir la violación de unicidad a un conflicto funcional apropiado.

---

## 21. Aceptación de invitación

Debe ejecutarse en una sola transacción:

~~~text
bloquear InvitacionNegocio
        ↓
validar PENDIENTE + vigente
        ↓
validar identidad Email
        ↓
obtener membresía histórica
        ↓
crear o reactivar UsuarioNegocio
        ↓
marcar invitación ACEPTADA
        ↓
COMMIT
~~~

Si cualquier paso falla:

~~~text
ROLLBACK
~~~

La restricción:

~~~text
UNIQUE (usuario_id, negocio_id)
~~~

impide membresías duplicadas incluso ante carrera.

La transición de estado debe ser condicional al estado esperado o ejecutarse sobre la fila bloqueada.

---

# PARTE II — M02 CATÁLOGO

## 22. Tabla categoria

Representa una Categoria del catálogo.

### Columnas

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| negocio_id | UUID | NO | tenant |
| nombre | TEXT | NO | valor visible |
| nombre_normalizado | TEXT | NO | unicidad |
| estado | VARCHAR | NO | ACTIVA/INACTIVA |
| version | BIGINT | NO | optimistic locking |
| created_at | TIMESTAMPTZ | NO | técnico |
| updated_at | TIMESTAMPTZ | NO | técnico |

### Constraints

~~~sql
UNIQUE (negocio_id, nombre_normalizado)

CHECK (estado IN ('ACTIVA', 'INACTIVA'))
CHECK (btrim(nombre) <> '')
CHECK (btrim(nombre_normalizado) <> '')
CHECK (version >= 1)
~~~

### Foreign key

~~~text
negocio_id
→ negocio.id
ON DELETE RESTRICT
~~~

### Clave alternativa

~~~text
UNIQUE (id, negocio_id)
~~~

Permite proteger relaciones tenant-scoped desde ArticuloCatalogo.

---

## 23. Categoria inactiva

PostgreSQL conserva las asociaciones existentes.

El estado INACTIVA:

- no elimina artículos;
- no modifica artículo;
- no pone categoria_id en null.

Una nueva asociación o reasignación requiere Categoria ACTIVA.

Esta condición depende de leer otra fila y no se implementará con un CHECK simple.

Application deberá revalidarla dentro de la transacción.

---

## 24. Hard delete de Categoria

La FK desde ArticuloCatalogo utilizará:

~~~text
ON DELETE RESTRICT
~~~

Por lo tanto una Categoria no podrá eliminarse físicamente si cualquier artículo continúa asociado.

Esto coincide con la regla funcional, incluyendo artículos INACTIVOS.

La ausencia de asociaciones deberá volver a comprobarse al confirmar la operación.

---

## 25. Tabla articulo_catalogo

ArticuloCatalogo concentra la configuración actual del bien o servicio.

### Columnas generales

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| negocio_id | UUID | NO | tenant |
| categoria_id | UUID | SÍ | asociación opcional |
| nombre | TEXT | NO | visible |
| nombre_normalizado | TEXT | NO | unicidad |
| descripcion | TEXT | SÍ | opcional |
| tipo | VARCHAR | NO | BIEN/SERVICIO |
| unidad_medida | VARCHAR | NO | catálogo global |
| sku | TEXT | SÍ | ausencia canónica = NULL |
| sku_normalizado | TEXT | SÍ | unicidad |
| precio_base | NUMERIC(19,4) | SÍ | referencia actual |
| costo_referencia | NUMERIC(19,4) | SÍ | referencia actual |
| estado | VARCHAR | NO | ACTIVO/INACTIVO |
| version | BIGINT | NO | optimistic locking |
| created_at | TIMESTAMPTZ | NO | técnico |
| updated_at | TIMESTAMPTZ | NO | técnico |

### Capacidades embebidas

| Columna | Tipo | Null |
| --- | --- | --- |
| es_comprable | BOOLEAN | NO |
| es_vendible | BOOLEAN | NO |
| controla_stock | BOOLEAN | NO |
| puede_usarse_en_produccion | BOOLEAN | NO |
| controla_vencimiento | BOOLEAN | NO |
| permite_descuento | BOOLEAN | NO |

---

## 26. CapacidadesArticulo no es una tabla

CapacidadesArticulo es:

~~~text
Value Object
+
1:1
+
sin identidad
+
pequeño
+
siempre cargado junto al Articulo
~~~

Por ello se persiste mediante columnas de articulo_catalogo.

No se crea:

~~~text
capacidades_articulo
~~~

como tabla independiente.

Beneficios:

- menos joins;
- constraints locales más fuertes;
- mapping directo;
- reemplazo atómico del VO;
- evita inventar identidad para un Value Object.

En Domain se reconstruirá CapacidadesArticulo desde estas columnas.

---

## 27. Constraints básicas de ArticuloCatalogo

### Textos

~~~sql
CHECK (btrim(nombre) <> '')
CHECK (btrim(nombre_normalizado) <> '')
CHECK (descripcion IS NULL OR btrim(descripcion) <> '')

CHECK (sku IS NULL OR btrim(sku) <> '')
CHECK (sku_normalizado IS NULL OR btrim(sku_normalizado) <> '')

CHECK (
  (sku IS NULL) = (sku_normalizado IS NULL)
)
~~~

Application normaliza descripción vacía y SKU vacío/solo espacios a `NULL` antes de persistir.

Estas restricciones actúan como defensa final ante scripts, migraciones o bugs que intenten introducir una segunda representación de ausencia.

### Tipo

~~~sql
CHECK (tipo IN ('BIEN', 'SERVICIO'))
~~~

### Estado

~~~sql
CHECK (estado IN ('ACTIVO', 'INACTIVO'))
~~~

### Unidad

~~~sql
CHECK (
  unidad_medida IN (
    'UNIDAD',
    'KG',
    'G',
    'L',
    'ML',
    'M',
    'CM',
    'HORA'
  )
)
~~~

### Valores económicos

~~~sql
CHECK (
  precio_base IS NULL
  OR precio_base >= 0
)

CHECK (
  costo_referencia IS NULL
  OR costo_referencia >= 0
)
~~~

### Version

~~~sql
CHECK (version >= 1)
~~~

---

## 28. Constraints entre Tipo y Capacidades

### SERVICIO

~~~sql
CHECK (
  tipo <> 'SERVICIO'
  OR (
    controla_stock = FALSE
    AND controla_vencimiento = FALSE
    AND puede_usarse_en_produccion = FALSE
  )
)
~~~

### Vencimiento

~~~sql
CHECK (
  controla_vencimiento = FALSE
  OR (
    tipo = 'BIEN'
    AND controla_stock = TRUE
  )
)
~~~

### Producción

~~~sql
CHECK (
  puede_usarse_en_produccion = FALSE
  OR (
    tipo = 'BIEN'
    AND controla_stock = TRUE
  )
)
~~~

### Descuentos

~~~sql
CHECK (
  permite_descuento = FALSE
  OR es_vendible = TRUE
)
~~~

---

## 29. Constraint de uso operativo mínimo

Un artículo ACTIVO debe poseer al menos un uso:

~~~sql
CHECK (
  estado <> 'ACTIVO'
  OR (
    es_comprable = TRUE
    OR es_vendible = TRUE
    OR puede_usarse_en_produccion = TRUE
  )
)
~~~

Un artículo INACTIVO puede conservar:

~~~text
es_comprable = false
es_vendible = false
puede_usarse_en_produccion = false
~~~

---

## 30. Constraint de precio vendible

~~~sql
CHECK (
  es_vendible = FALSE
  OR (
    precio_base IS NOT NULL
    AND precio_base >= 0
  )
)
~~~

La relación inversa no existe.

Un artículo no vendible puede conservar precio_base como referencia histórica/configuración actual.

---

## 31. Nombre único de ArticuloCatalogo

Se crea:

~~~text
UNIQUE (
  negocio_id,
  nombre_normalizado
)
~~~

La restricción incluye:

~~~text
ACTIVO
+
INACTIVO
~~~

Desactivar no libera el nombre.

El nombre solo queda disponible después de un hard delete válido.

---

## 32. SKU

Reglas físicas:

~~~text
sku ausente
→ sku = NULL
→ sku_normalizado = NULL
~~~

No se almacena string vacío ni whitespace-only como ausencia.

Las restricciones de texto de la Sección 27 garantizan que:

~~~text
SKU ausente -> ambos NULL
SKU presente -> ambos no vacíos
~~~

Para unicidad se utilizará un índice parcial:

~~~sql
CREATE UNIQUE INDEX uq_articulo_sku_negocio
ON articulo_catalogo (
    negocio_id,
    sku_normalizado
)
WHERE sku_normalizado IS NOT NULL;
~~~

Esto permite múltiples artículos sin SKU y evita duplicados cuando existe.

Incluye ACTIVOS e INACTIVOS.

---

## 33. Categoria del mismo Negocio

ArticuloCatalogo tendrá:

~~~text
negocio_id
categoria_id
~~~

La FK no será solamente:

~~~text
categoria_id → categoria.id
~~~

Se utilizará:

~~~text
(categoria_id, negocio_id)

→ categoria(id, negocio_id)
~~~

Esto impide físicamente:

~~~text
Articulo A / Negocio A
→ Categoria B / Negocio B
~~~

Cuando `categoria_id = NULL`, la relación opcional no se valida.

### MATCH SIMPLE obligatorio

La FK compuesta utilizará el comportamiento PostgreSQL `MATCH SIMPLE` (default):

~~~sql
FOREIGN KEY (categoria_id, negocio_id)
REFERENCES categoria (id, negocio_id)
MATCH SIMPLE
~~~

Esto permite:

~~~text
categoria_id = NULL
negocio_id   = valor NOT NULL
~~~

sin exigir una Categoria.

No debe utilizarse `MATCH FULL` en esta relación, porque exigiría que ambas columnas fueran simultáneamente NULL o no NULL y entraría en conflicto con `negocio_id NOT NULL`.

---

## 34. TipoArticulo inmutable

La base protege valores válidos, pero no intentará implementar inmutabilidad mediante trigger.

La inmutabilidad:

~~~text
BIEN ↔ SERVICIO
prohibido
~~~

se protege mediante:

- Domain;
- Caso de Uso;
- Repository;
- tests.

Los updates normales de ArticuloCatalogo no expondrán tipo como campo modificable.

---

## 35. negocio_id inmutable

Para recursos tenant-scoped:

~~~text
negocio_id
~~~

se establece al crear y no se edita como atributo normal.

No existe:

~~~text
mover Articulo a otro Negocio
mover Categoria a otro Negocio
mover Membresía a otro Negocio
~~~

mediante UPDATE ordinario.

La API obtiene el tenant desde el path/contexto autenticado.

No desde un campo libre del body.

---

## 36. Tabla articulo_imagen

Las referencias de imágenes son una colección hija de ArticuloCatalogo.

### Columnas

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| negocio_id | UUID | NO | tenant duplicado para scoping |
| articulo_id | UUID | NO | FK |
| referencia_storage | TEXT | NO | locator opaco |
| posicion | SMALLINT | NO | 1..3 |
| es_principal | BOOLEAN | NO | principal |
| created_at | TIMESTAMPTZ | NO | técnico |

### Foreign key tenant-safe

~~~text
(articulo_id, negocio_id)

→ articulo_catalogo(id, negocio_id)
ON DELETE CASCADE
~~~

Para esto ArticuloCatalogo tendrá:

~~~text
UNIQUE (id, negocio_id)
~~~

### Posiciones

~~~sql
CHECK (posicion BETWEEN 1 AND 3)

UNIQUE (articulo_id, posicion)
DEFERRABLE INITIALLY DEFERRED
~~~

Esta combinación limita físicamente la colección a un máximo de tres slots.

El carácter diferible evita violaciones transitorias al intercambiar posiciones dentro de una misma transacción, por ejemplo `1 ↔ 2`. La unicidad se exige al finalizar la transacción.

Si el ORM o una futura migración no utiliza esta constraint diferible, el Repository deberá efectuar el reordenamiento mediante una estrategia explícita en dos pasos con posiciones temporales seguras. No se deberá confiar en el orden accidental de los `UPDATE` emitidos por SQLAlchemy.

---

## 37. Imagen principal

PostgreSQL garantizará como mínimo:

~~~text
máximo una imagen principal por artículo
~~~

mediante índice parcial:

~~~sql
CREATE UNIQUE INDEX uq_articulo_imagen_principal
ON articulo_imagen (articulo_id)
WHERE es_principal = TRUE;
~~~

La regla:

~~~text
si existen imágenes
→ exactamente una principal
~~~

incluye una condición de existencia sobre varias filas.

Durante Bloque 1 se protege en:

- Domain;
- Application;
- transacción;
- tests;

sin introducir trigger diferido complejo únicamente para esa condición.

La base sí impide:

- más de 3 posiciones;
- dos principales;
- imágenes de otro tenant.

### Cambio de imagen principal

El índice parcial de principal no puede declararse diferible. Al cambiar la principal dentro de una transacción se deberá evitar depender del orden de flush del ORM.

Estrategia segura:

~~~text
principal anterior -> false
flush / UPDATE
nueva principal    -> true
~~~

todo dentro de la misma transacción.

### Concurrencia de la colección

`articulo_imagen` no posee su propio `version`.

Cualquier operación que:

- agregue una imagen;
- elimine una imagen;
- cambie la principal;
- reordene posiciones;
- reemplace una referencia;

deberá incrementar también `articulo_catalogo.version` mediante el mismo caso de uso/transacción.

De esta forma dos ediciones concurrentes sobre la colección de imágenes compiten sobre la versión del Aggregate/entidad padre y no pueden sobrescribirse silenciosamente.

---

## 38. referencia_storage

referencia_storage es deliberadamente neutral.

No congela:

~~~text
S3
Cloudinary
filesystem
CDN
URL pública
~~~

Debe identificar el objeto para el adaptador de storage.

Se agrega:

~~~sql
CHECK (btrim(referencia_storage) <> '')
~~~

No se almacenará el archivo binario dentro de ArticuloCatalogo.

El lifecycle físico externo deberá coordinarse con la transacción lógica mediante staging o compensación segura.

---

# PARTE III — AUDITORÍA

## 39. Tabla auditoria_cambio

M02 exige poder reconstruir como mínimo:

~~~text
quién
cuándo
qué artículo
qué cambios
~~~

Se utilizará una tabla técnica append-only y genérica.

### Columnas

| Columna | Tipo | Null | Regla |
| --- | --- | --- | --- |
| id | UUID | NO | PK |
| negocio_id | UUID | NO | tenant |
| actor_usuario_id | UUID | NO | quién |
| entidad_tipo | TEXT | NO | tipo lógico |
| entidad_id | UUID | NO | identidad del recurso |
| accion | TEXT | NO | acción realizada |
| cambios | JSONB | NO | detalle/snapshot mínimo |
| ocurrido_en | TIMESTAMPTZ | NO | cuándo |

### Foreign keys

~~~text
negocio_id
→ negocio.id
ON DELETE RESTRICT

actor_usuario_id
→ usuario.id
ON DELETE RESTRICT
~~~

No se agrega FK polimórfica desde entidad_id.

auditoria_cambio no es una relación de dominio; es un registro histórico técnico.

### Constraints de contenido

~~~sql
CHECK (btrim(entidad_tipo) <> '')
CHECK (btrim(accion) <> '')
CHECK (jsonb_typeof(cambios) = 'object')
~~~

`actor_usuario_id` permanece `NOT NULL` y `ON DELETE RESTRICT`.

Esta decisión es intencional: Bloque 1 no define hard delete de Usuario ni de Negocio. Si en el futuro se introduce eliminación/anonimización de cuentas, deberá diseñarse una política específica de retención y anonimización antes de modificar estas FK.

---

## 40. Semántica de auditoria_cambio

### Esquema canónico de cambios

`cambios` utilizará un objeto JSONB donde cada clave representa un campo lógico modificado y cada valor contiene `antes` y `despues`:

~~~json
{
  "nombre": {
    "antes": "Snack Pollo",
    "despues": "Snack de Pollo"
  },
  "precio_base": {
    "antes": "2500.0000",
    "despues": "2700.0000"
  }
}
~~~

Los valores `antes` y `despues` pueden ser escalares, `null`, objetos o arrays serializables cuando el campo lógico lo requiera.

Un DTO/estructura de Infrastructure será responsable de construir este formato de manera consistente. No se permitirá que cada Repository invente un shape JSON diferente.

El JSON no deberá almacenar:

- passwords;
- password hashes;
- JWT;
- tokens de invitación;
- secretos;
- credenciales externas.

### Hard delete

Las filas de auditoría no bloquean por sí solas el hard delete **del recurso auditado** porque `entidad_id` no posee FK polimórfica.

Por ejemplo, una auditoría de ArticuloCatalogo puede sobrevivir a un hard delete válido de ese artículo.

En cambio, las FK hacia `actor_usuario_id` y `negocio_id` sí utilizan `ON DELETE RESTRICT` deliberadamente. Usuario y Negocio no poseen hard delete funcional en Bloque 1 y su identidad se conserva mientras exista historia de auditoría.

---

# PARTE IV — INTEGRIDAD, ÍNDICES Y CONCURRENCIA

## 41. ON DELETE

Política inicial:

| Relación | Acción |
| --- | --- |
| usuario_negocio → usuario | RESTRICT |
| usuario_negocio → negocio | RESTRICT |
| invitacion_negocio → negocio | RESTRICT |
| invitacion_negocio → usuario_negocio emisor | RESTRICT |
| categoria → negocio | RESTRICT |
| articulo_catalogo → negocio | RESTRICT |
| articulo_catalogo → categoria | RESTRICT |
| articulo_imagen → articulo_catalogo | CASCADE |
| negocio_modalidad → negocio | CASCADE |
| auditoria_cambio → usuario/negocio | RESTRICT |

En particular, `auditoria_cambio` bloquea el hard delete del actor Usuario y del Negocio mientras exista historia. Esto no contradice que `entidad_id` sea polimórfico y no bloquee el hard delete del recurso auditado.

### Principio

CASCADE solo se utiliza para hijos estructurales sin identidad funcional independiente.

No se utilizará CASCADE para borrar historia de membresías, invitaciones o catálogo.

---

## 42. Sin deleted_at genérico

No se agrega:

~~~text
deleted_at
is_deleted
soft_deleted
~~~

a todas las tablas.

Los estados:

~~~text
UsuarioNegocio.ACTIVO/INACTIVO
Categoria.ACTIVA/INACTIVA
ArticuloCatalogo.ACTIVO/INACTIVO
~~~

son estados de dominio, no un soft delete técnico.

Hard delete sigue siendo una operación explícita y excepcional donde el dominio la permite.

---

## 43. Optimistic locking

Se utilizará columna:

~~~text
version BIGINT NOT NULL DEFAULT 1
~~~

en entidades mutables donde una sobrescritura concurrente sería problemática:

~~~text
negocio
usuario_negocio
invitacion_negocio
categoria
articulo_catalogo
~~~

Conceptualmente:

~~~sql
UPDATE articulo_catalogo
SET
    ...,
    version = version + 1
WHERE id = :id
  AND negocio_id = :negocio_id
  AND version = :version_esperada;
~~~

Si:

~~~text
rows_updated = 0
~~~

Application interpreta conflicto concurrente en lugar de sobrescribir silenciosamente.

SQLAlchemy podrá utilizar su soporte de `version_id_col`.

### Colecciones hijas

El versionado del padre también forma parte del contrato de concurrencia.

Modificar únicamente filas de `articulo_imagen` **no incrementa automáticamente** `articulo_catalogo.version`.

Por ello el Repository/Caso de Uso deberá tocar explícitamente la entidad padre e incrementar su versión cuando cambie la colección de imágenes. El mapper no debe permitir que una edición de imágenes eluda el optimistic locking del artículo.

---

## 44. Constraints únicas y concurrencia

Los prechecks de Application mejoran UX.

Ejemplo:

~~~text
¿ya existe ese nombre?
¿ya existe ese SKU?
~~~

pero no garantizan integridad ante dos transacciones simultáneas.

La garantía final proviene de:

~~~text
UNIQUE / UNIQUE INDEX
~~~

Repository deberá capturar la violación de integridad y traducirla a un error funcional apropiado.

No se aplicará la estrategia:

~~~text
SELECT
si no existe
INSERT
y asumir que eso es suficiente
~~~

---

## 45. Concurrencia de Categoria

Al asociar o reasignar una Categoria:

1. recuperar Categoria dentro del Negocio;
2. comprobar ACTIVA;
3. mantener una protección transaccional suficiente hasta confirmar.

Una alternativa recomendada es bloquear la Categoria con un lock compatible de lectura que impida su actualización de estado durante la operación.

La desactivación concurrente no debe permitir que se confirme silenciosamente una asociación que ya no cumple la regla.

La estrategia SQL exacta se validará durante implementación y tests de integración.

---

## 46. Concurrencia de membresías

La combinación:

~~~text
UNIQUE (usuario_id, negocio_id)
~~~

es la defensa final contra duplicados.

Para operaciones que afectan el último propietario:

~~~text
SELECT negocio ... FOR UPDATE
~~~

actúa como punto de serialización.

El sistema no depende únicamente de contar propietarios antes del UPDATE sin lock.

---

## 47. Concurrencia de invitaciones

### Emisión

Protegida mediante:

- transacción;
- materialización de expiración previa cuando corresponda;
- índice único parcial de PENDIENTE.

### Aceptación / rechazo / cancelación / expiración

Debe aplicarse:

- row lock o update condicional;
- estado esperado PENDIENTE;
- version esperada cuando corresponda.

La primera transición terminal confirmada gana.

Una segunda transición concurrente debe fallar, no sobrescribir la primera.

---

## 48. Nivel de aislamiento

El punto de partida será el nivel estándar de PostgreSQL:

~~~text
READ COMMITTED
~~~

combinado con:

- unique constraints;
- foreign keys;
- optimistic locking;
- row locks explícitos en operaciones sensibles.

No se utilizará SERIALIZABLE globalmente durante Bloque 1.

Si un caso de uso futuro demuestra una necesidad diferente, se evaluará de manera localizada.

---

## 49. Índices recomendados

Además de PK/UNIQUE:

### usuario_negocio

~~~text
INDEX (negocio_id, estado, rol)
INDEX (usuario_id, estado)
~~~

Uso:

- listar membresías activas;
- contar propietarios activos;
- listar negocios de un usuario.

### invitacion_negocio

~~~text
UNIQUE (token_hash)

UNIQUE PARTIAL:
(negocio_id, email_destino_normalizado)
WHERE estado = 'PENDIENTE'

INDEX (negocio_id, estado, fecha_expiracion)
INDEX (email_destino_normalizado, estado)
~~~

### categoria

~~~text
UNIQUE (negocio_id, nombre_normalizado)

INDEX (negocio_id, estado)
~~~

### articulo_catalogo

~~~text
UNIQUE (negocio_id, nombre_normalizado)

UNIQUE PARTIAL:
(negocio_id, sku_normalizado)
WHERE sku_normalizado IS NOT NULL

INDEX (negocio_id, estado)
INDEX (negocio_id, tipo, estado)
INDEX (negocio_id, categoria_id, estado)
~~~

### articulo_imagen

~~~text
UNIQUE (articulo_id, posicion)
DEFERRABLE INITIALLY DEFERRED

UNIQUE PARTIAL:
(articulo_id)
WHERE es_principal = TRUE
~~~

### auditoria_cambio

~~~text
INDEX (
  negocio_id,
  entidad_tipo,
  entidad_id,
  ocurrido_en DESC
)
~~~

No se crearán índices especulativos para filtros todavía inexistentes.

---

# PARTE V — MAPPING Y TRANSACCIONES

## 50. Domain no es ORM

Las clases Domain no serán modelos SQLAlchemy.

Se mantendrá:

~~~text
Domain Entity
!=
SQLAlchemy Model
~~~

Ejemplo:

~~~text
ArticuloCatalogo
!=
ArticuloCatalogoModel
~~~

Infrastructure realizará el mapping.

### Normalizados en el mapper

Los mappers/repositories son responsables de persistir junto al valor visible la clave normalizada ya obtenida mediante la misma semántica de Domain.

Ejemplo:

~~~text
Email.value
Email.normalized
        ↓
UsuarioModel.email
UsuarioModel.email_normalizado
~~~

No se reimplementará `lower(trim(...))` dentro de SQLAlchemy.

Los eventos ORM pueden actuar como assert/safety net para detectar inconsistencias, pero no deben ocultar una segunda regla de negocio.

---

## 51. Diferencias intencionales Domain / Relacional

No existe traducción 1:1 obligatoria.

Ejemplos:

### CapacidadesArticulo

~~~text
Domain:
Value Object

DB:
6 columnas dentro de articulo_catalogo
~~~

### ModalidadesOperativas

~~~text
Domain:
Set[ModalidadOperativa]

DB:
negocio_modalidad
~~~

### Password

~~~text
Domain Usuario:
no posee password_hash

DB usuario:
password_hash técnico
~~~

### Auditoría

~~~text
Domain:
no es entidad funcional central

DB:
auditoria_cambio append-only
~~~

Esto es consistente con Data Mapper y Clean Architecture.

---

## 52. Límites transaccionales mínimos

### Crear Negocio

Una transacción:

~~~text
negocio
+
modalidades
+
membresía propietario inicial
~~~

### Aceptar invitación

Una transacción:

~~~text
Invitacion
+
crear/reactivar membresía
~~~

### Editar ArticuloCatalogo

Una transacción:

~~~text
articulo (incluye incremento de version)
+
referencias de imágenes
+
auditoria_cambio
~~~

Si solo cambian imágenes, el artículo padre igualmente debe participar en el UPDATE/versionado.

Los efectos externos de storage no son una transacción SQL y necesitan coordinación segura.

### Cambiar rol / desactivar miembro

Una transacción con protección del último propietario.

### Crear / editar Categoria

Una transacción con unicidad y versionado.

---

## 53. Atomicidad de edición de ArticuloCatalogo

La operación:

~~~text
validar propuesta completa
        ↓
actualizar ArticuloCatalogo
        ↓
ajustar articulo_imagen
        ↓
insertar auditoría
        ↓
COMMIT
~~~

debe ser todo-o-nada.

No se confirmarán cambios parciales de:

- precio;
- SKU;
- Categoria;
- capacidades;
- imágenes.

---

## 54. Storage de imágenes y consistencia

PostgreSQL solo persiste referencias.

La subida/eliminación física de archivos no comparte transacción ACID con la base.

Se utilizará una estrategia como:

~~~text
subida temporal
→ validar
→ confirmar DB
→ finalizar storage
~~~

o compensación segura.

La elección concreta pertenece a la integración de storage.

No se introducirá Distributed Transaction.

---

# PARTE VI — REGLAS QUE NO DEBE INTENTAR RESOLVER UN CHECK

## 55. Invariantes contextuales

No se intentará expresar mediante CHECK simple:

- al menos un Propietario ACTIVO por Negocio;
- al menos una ModalidadOperativa por Negocio;
- emisor de invitación ACTIVO y PROPIETARIO;
- destinatario sin membresía ACTIVA;
- Categoria ACTIVA para una nueva asociación;
- exactamente una imagen principal si existe al menos una;
- ausencia de historia/dependencias antes de hard delete;
- vigencia temporal actual de una invitación;
- autorización por rol;
- permisos conceptuales;
- validaciones de módulos futuros.

Estas reglas requieren transacción, consultas o Domain/Application.

---

## 56. Invariantes que sí refuerza PostgreSQL

La base sí debe impedir:

- email funcional duplicado;
- membresía Usuario + Negocio duplicada;
- dos invitaciones PENDIENTES equivalentes persistidas;
- token_hash duplicado;
- Categoria cross-tenant;
- nombre duplicado de Categoria;
- nombre duplicado de Articulo;
- SKU duplicado dentro del Negocio;
- valores negativos de precio/costo;
- estados/enums desconocidos;
- servicio con capacidades de inventario;
- vencimiento sin stock;
- producción sin stock;
- descuento sin venta;
- artículo ACTIVO sin uso;
- más de tres slots de imagen;
- más de una imagen principal;
- FK inválidas.

---

# PARTE VII — EJEMPLOS DDL DE REFERENCIA

## 57. Membresía histórica única

~~~sql
ALTER TABLE usuario_negocio
ADD CONSTRAINT uq_usuario_negocio
UNIQUE (usuario_id, negocio_id);
~~~

---

## 58. Categoria tenant-safe

~~~sql
ALTER TABLE categoria
ADD CONSTRAINT uq_categoria_id_negocio
UNIQUE (id, negocio_id);

ALTER TABLE articulo_catalogo
ADD CONSTRAINT fk_articulo_categoria_mismo_negocio
FOREIGN KEY (categoria_id, negocio_id)
REFERENCES categoria (id, negocio_id)
MATCH SIMPLE
ON DELETE RESTRICT;
~~~

---

## 59. Nombre de artículo único por tenant

~~~sql
CREATE UNIQUE INDEX uq_articulo_nombre_negocio
ON articulo_catalogo (
    negocio_id,
    nombre_normalizado
);
~~~

---

## 60. SKU opcional único

~~~sql
CREATE UNIQUE INDEX uq_articulo_sku_negocio
ON articulo_catalogo (
    negocio_id,
    sku_normalizado
)
WHERE sku_normalizado IS NOT NULL;
~~~

---

## 61. Capacidades

~~~sql
ALTER TABLE articulo_catalogo
ADD CONSTRAINT ck_articulo_servicio_sin_inventario
CHECK (
    tipo <> 'SERVICIO'
    OR (
        controla_stock = FALSE
        AND controla_vencimiento = FALSE
        AND puede_usarse_en_produccion = FALSE
    )
);

ALTER TABLE articulo_catalogo
ADD CONSTRAINT ck_articulo_descuento_requiere_venta
CHECK (
    permite_descuento = FALSE
    OR es_vendible = TRUE
);

ALTER TABLE articulo_catalogo
ADD CONSTRAINT ck_articulo_activo_con_uso
CHECK (
    estado <> 'ACTIVO'
    OR (
        es_comprable = TRUE
        OR es_vendible = TRUE
        OR puede_usarse_en_produccion = TRUE
    )
);
~~~

---

## 62. Invitación pendiente única

~~~sql
CREATE UNIQUE INDEX uq_invitacion_pendiente
ON invitacion_negocio (
    negocio_id,
    email_destino_normalizado
)
WHERE estado = 'PENDIENTE';
~~~

---

## 63. Imágenes

~~~sql
ALTER TABLE articulo_imagen
ADD CONSTRAINT ck_articulo_imagen_posicion
CHECK (posicion BETWEEN 1 AND 3);

ALTER TABLE articulo_imagen
ADD CONSTRAINT uq_articulo_imagen_posicion
UNIQUE (articulo_id, posicion)
DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX uq_articulo_imagen_principal
ON articulo_imagen (articulo_id)
WHERE es_principal = TRUE;
~~~

---

# PARTE VIII — PREPARACIÓN PARA MÓDULOS FUTUROS

## 64. Referencias futuras a ArticuloCatalogo

M03, M04, M05 y M07 deberán referenciar:

~~~text
articulo_catalogo.id
~~~

y conservar snapshots históricos cuando corresponda.

No deben reconstruir el pasado utilizando solamente:

- nombre actual;
- SKU actual;
- precio actual;
- unidad actual;
- costo actual.

---

## 65. Hard delete futuro

Las futuras tablas transaccionales utilizarán normalmente:

~~~text
ON DELETE RESTRICT
~~~

hacia ArticuloCatalogo.

Eso permitirá que el propio esquema impida hard delete cuando exista historia funcional.

El Caso de Uso seguirá realizando una prevalidación comprensible para UX, pero la FK será defensa final.

---

## 66. Inventario

No se agregan todavía:

~~~text
stock_actual
cantidad
lote
ubicacion
fecha_vencimiento
~~~

a articulo_catalogo.

controla_stock y controla_vencimiento son elegibilidades/configuración, no hechos operativos.

---

## 67. Proveedores

No se agrega:

~~~text
proveedor_id
~~~

a ArticuloCatalogo.

Un artículo podrá relacionarse con múltiples proveedores mediante M03 si ese módulo lo requiere.

---

## 68. Ventas y precios históricos

precio_base permanece como referencia actual.

M05 deberá persistir el precio aplicado en cada operación.

No se agregan tablas de ventas ni historial de precio artificial dentro de M02.

---

# PARTE IX — DECISIONES

## 69. Decisiones congeladas

1. PostgreSQL 16+ es el motor objetivo.
2. Negocio es la frontera tenant.
3. Todas las entidades principales usan UUIDv4.
4. UUID se genera inicialmente desde Application.
5. Instantes usan TIMESTAMPTZ.
6. Dinero usa NUMERIC(19,4) y Decimal.
7. Enums se persisten como texto + CHECK.
8. No se usan PostgreSQL ENUM nativos inicialmente.
9. Unicidades funcionales utilizan columnas normalizadas explícitas.
10. Usuario.email_normalizado es globalmente único.
11. UsuarioNegocio posee UNIQUE(usuario_id, negocio_id).
12. NegocioModalidad es tabla puente.
13. InvitacionNegocio almacena token_hash, no requiere token plano persistido.
14. Una única PENDIENTE persistida por Negocio + Email normalizado.
15. Nueva emisión materializa una PENDIENTE vencida antes de crear otra.
16. Categoria y ArticuloCatalogo pertenecen directamente a Negocio.
17. Relaciones Categoria-Articulo utilizan FK compuesta tenant-safe.
18. CapacidadesArticulo se persiste dentro de articulo_catalogo.
19. Nombre de Categoria es único por Negocio incluyendo INACTIVAS.
20. Nombre de Articulo es único por Negocio incluyendo INACTIVOS.
21. SKU es nullable y único por Negocio cuando existe.
22. Desactivar no libera nombre ni SKU.
23. ArticuloImagen se representa mediante tabla hija de máximo tres posiciones.
24. PostgreSQL impide más de una principal; Domain garantiza que exista una si hay imágenes.
25. No existe deleted_at genérico.
26. Estados de dominio no son soft delete.
27. version se utiliza para optimistic locking en entidades mutables relevantes.
28. El último Propietario se protege mediante transacción + lock del Negocio.
29. READ COMMITTED es el aislamiento inicial.
30. Hard delete usa RESTRICT para historia funcional y CASCADE solo para hijos estructurales.
31. La auditoría mínima se registra en auditoria_cambio.
32. Usuario y Negocio no poseen hard delete en Bloque 1; las FK de auditoría hacia ambos permanecen RESTRICT.
33. Todo texto funcional obligatorio rechaza vacío/whitespace; los opcionales usan NULL como ausencia cuando corresponda.
34. La FK opcional Articulo-Categoria usa MATCH SIMPLE y no MATCH FULL.
35. Cambiar articulo_imagen incrementa articulo_catalogo.version.
36. UNIQUE(articulo_id, posicion) es DEFERRABLE INITIALLY DEFERRED para soportar reordenamientos atómicos.
37. El cambio de imagen principal se realiza en dos pasos ordenados dentro de la misma transacción.
38. Las columnas normalizadas se asignan explícitamente desde mapper/repository usando la semántica compartida de Domain.
39. auditoria_cambio.cambios utiliza el esquema canónico campo -> {antes, despues}.
40. Domain entities permanecen separadas de SQLAlchemy models.

---

## 70. Decisiones diferidas

Permanecen abiertas:

- algoritmo definitivo de normalización de Email;
- algoritmo definitivo de normalización de nombres;
- case sensitivity/formato definitivo de SKU;
- longitudes máximas de textos a nivel API;
- almacenamiento físico de imágenes;
- strategy exacta de cleanup de archivos;
- RLS;
- particionado;
- read replicas;
- índices de búsqueda full-text/trigram;
- historial comercial de precios;
- mecanismos de soft delete futuros si un módulo realmente los necesita;
- estrategia avanzada de auditoría;
- UUIDv7 u otra identidad futura;
- constraints provenientes de M03/M04/M05/M07.

Las decisiones diferidas no deben impedir implementar correctamente el Bloque 1.

---

## 71. Criterio de aceptación

El modelo relacional es válido si permite demostrar mediante tests de integración que:

1. no pueden existir dos Usuarios con Email funcionalmente equivalente;
2. no pueden existir dos membresías históricas del mismo Usuario en el mismo Negocio;
3. crear Negocio y propietario inicial es atómico;
4. no puede degradarse/desactivarse concurrentemente el último Propietario;
5. no se pueden confirmar dos invitaciones PENDIENTES equivalentes;
6. aceptar una invitación y crear/reactivar membresía es atómico;
7. Categoria y Articulo nunca pueden cruzar tenants;
8. Categoria INACTIVA conserva asociaciones existentes;
9. nombres de Categoria duplicados se rechazan;
10. nombres de Articulo duplicados se rechazan incluso si uno está INACTIVO;
11. SKU duplicado se rechaza incluso si uno está INACTIVO;
12. múltiples artículos pueden tener SKU NULL;
13. combinaciones inválidas de Tipo/Capacidades son rechazadas por DB;
14. un ACTIVO sin uso operativo no puede persistirse;
15. un vendible sin precio válido no puede persistirse;
16. precio/costo negativos no pueden persistirse;
17. no pueden existir más de tres slots de imagen;
18. no pueden existir dos imágenes principales;
19. un lost update de Articulo produce conflicto;
20. una consulta tenant-scoped no devuelve recursos de otro Negocio;
21. hard delete de Categoria falla si existen artículos asociados;
22. futuras FK transaccionales pueden bloquear hard delete de Articulo;
23. cambios auditables pueden asociarse con actor, recurso, instante y detalle;
24. strings vacíos/whitespace no pueden persistirse como nombres, emails, SKU presente, rubro/descripcion presentes o referencias de storage;
25. Articulo sin Categoria funciona correctamente mediante MATCH SIMPLE;
26. MATCH FULL no se utiliza en la FK compuesta opcional de Categoria;
27. reordenar imágenes dentro de una transacción no falla por una colisión temporal de posiciones;
28. cambiar la imagen principal respeta el índice único sin depender del orden accidental de flush;
29. modificar la colección de imágenes incrementa la version del Articulo padre;
30. mappers persisten claves normalizadas coherentes con los valores funcionales;
31. auditoria_cambio.cambios mantiene el esquema canónico definido;
32. la historia de auditoría impide hard delete accidental de Usuario/Negocio mientras esa funcionalidad siga fuera de alcance.

---

## 72. Cierre del modelo relacional

El ERD asociado ya se encuentra definido en:

~~~text
base-de-datos/bloque-1-fundacion/erd.puml
~~~

La revisión transversal:

~~~text
Dominio
↔
Arquitectura
↔
Modelo Relacional
↔
ERD
~~~

fue completada sin contradicciones estructurales pendientes.

La siguiente etapa documental es el contrato API del Bloque 1, antes de iniciar los primeros SQLAlchemy Models y migraciones Alembic.
