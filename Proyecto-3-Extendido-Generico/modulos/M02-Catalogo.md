# 02 — Módulo de Catálogo
## Versión sincronizada con `06-m02-estados-articulo.md`

---

# 1. Propósito y Alcance

## 1.1. Propósito

El módulo **M02 — Catálogo** administra los bienes y servicios que un Negocio utiliza dentro de la plataforma.

Constituye la base funcional común sobre la que posteriormente operan:

```text
M03 Compras
M04 Inventario
M05 Ventas
M07 Producción
M08 Analítica
```

El objetivo es representar negocios de actividades diferentes sin crear modelos específicos para cada rubro.

Ejemplos:

```text
WALOS
├── Harina
├── Pollo
├── Snack de pollo
└── Torta para perros
```

```text
Local de ropa
├── Remera negra M
├── Remera negra L
└── Pantalón azul 42
```

```text
Prestador de servicios
├── Maquillaje social
├── Peinado
└── Asesoramiento por hora
```

Todos forman parte del mismo concepto:

```text
ArticuloCatalogo
```

La diferencia se representa mediante:

```text
TipoArticulo
+
CapacidadesArticulo
```

y no mediante jerarquías rígidas como:

```text
Producto
MateriaPrima
Insumo
Servicio
ProductoTerminado
Mercadería
```

---

## 1.2. Objetivos

M02 debe permitir responder:

```text
¿Qué utiliza u ofrece este Negocio?
        ↓
ArticuloCatalogo

¿Qué clase general de elemento es?
        ↓
BIEN / SERVICIO

¿Cómo se organiza?
        ↓
Categoria

¿Cómo se expresa su cantidad?
        ↓
UnidadMedida

¿Para qué puede utilizarse?
        ↓
CapacidadesArticulo

¿Cuál es su referencia económica actual?
        ↓
precio_base
costo_referencia

¿Puede utilizarse actualmente en nuevas operaciones?
        ↓
EstadoArticulo
```

---

## 1.3. Alcance

El módulo incluye:

- catálogo unificado de bienes y servicios;
- categorías configurables por Negocio;
- unidades de medida normalizadas;
- precio base actual;
- costo de referencia opcional;
- SKU opcional;
- descripción opcional;
- imagen principal opcional;
- capacidades operativas;
- búsqueda y consulta;
- creación;
- edición controlada de artículos ACTIVOS;
- desactivación;
- reactivación simple;
- reactivación con reconfiguración autorizada;
- eliminación física cuando sea segura;
- conservación histórica;
- validaciones entre capacidades;
- permisos por Rol;
- aislamiento entre Negocios;
- protección conceptual frente a concurrencia.

---

## 1.4. Fuera del Alcance

M02 no administra:

- cantidades actuales de stock;
- stock por ubicación;
- lotes concretos;
- fechas de vencimiento de lotes;
- movimientos de inventario;
- compras;
- proveedores;
- ventas;
- promociones complejas;
- pagos;
- caja;
- recetas;
- producción;
- cálculo de costos históricos;
- listas múltiples de precios;
- códigos de barras;
- variantes estructuradas;
- importación masiva;
- atributos dinámicos;
- conversiones históricas de unidades.

Estos conceptos pertenecen a módulos consumidores o evoluciones futuras.

---

## 1.5. Prioridad

M02 forma parte de:

```text
BLOQUE 1 — FUNDACIÓN

M01 Organización
M02 Catálogo
```

No deberán implementarse módulos operativos posteriores sin una definición estable de M02.

---

# 2. Principio Rector de Diseño

El catálogo debe ser:

```text
flexible internamente
+
simple externamente
```

Internamente, el comportamiento se determina mediante:

```text
TipoArticulo
+
CapacidadesArticulo
+
EstadoArticulo
```

La interfaz no debe exigir al Usuario comprender conceptos técnicos.

Ejemplo de lenguaje de UX:

```text
☑ Lo compro a proveedores
☑ Lo vendo
☑ Quiero controlar stock
☐ Lo uso para producir otros productos
☐ Tiene vencimiento
☑ Permite descuentos
```

Principio:

```text
la complejidad pertenece al modelo
la simplicidad pertenece a la experiencia
```

---

# 3. Actores, Permisos y Autorización Contextual

## 3.1. Propietario

Posee administración completa de M02.

Puede:

- consultar;
- buscar;
- crear artículos;
- editar artículos ACTIVOS;
- desactivar artículos;
- reactivar artículos;
- reactivar con reconfiguración;
- eliminar artículos cuando las reglas lo permitan;
- modificar precio base;
- modificar costo de referencia;
- modificar capacidades;
- administrar Categorias;
- asociar o modificar imagen;
- modificar SKU;
- modificar UnidadMedida cuando las reglas lo permitan.

---

## 3.2. Encargado

Para el MVP se adopta deliberadamente una política estricta.

Puede:

- consultar catálogo;
- buscar artículos;
- consultar categorías;
- consultar información de artículos;
- desactivar artículos;
- reactivar artículos **sin modificar configuración**.

No puede:

- crear artículos;
- editar artículos;
- eliminar artículos;
- modificar precio base;
- modificar costo de referencia;
- modificar capacidades;
- modificar SKU;
- modificar UnidadMedida;
- modificar Categoria asociada;
- crear Categorias;
- editar Categorias;
- activar/desactivar/reactivar Categorias;
- eliminar Categorias.

Si un artículo INACTIVO requiere reconfiguración para volver a ACTIVO:

```text
ENCARGADO
→ no puede aplicar esos cambios
→ reactivación rechazada
→ requiere intervención de PROPIETARIO
```

---

## 3.3. Trabajador

Puede:

- consultar catálogo;
- buscar artículos;
- consultar Categorias;
- visualizar información necesaria para operar.

No puede modificar M02.

---

## 3.4. Autorización Contextual

Los métodos conceptuales de dominio no determinan qué Usuario puede ejecutarlos.

Antes de cualquier mutación, el Caso de Uso debe validar:

```text
Usuario autenticado
+
Negocio identificado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso concreto de M02
+
recurso perteneciente al mismo Negocio
```

No debe autorizarse únicamente mediante:

```text
rol == PROPIETARIO
```

sin comprobar:

```text
membresía ACTIVA
+
tenant correcto
+
permiso concreto
```

No se modelará RBAC dinámico durante el MVP.

---

## 3.5. Terminología `activar` / `reactivar`

En UX o textos de permisos puede aparecer:

```text
activar
```

Pero para un `ArticuloCatalogo` histórico existente en estado:

```text
INACTIVO
```

la transición semántica oficial es:

```text
INACTIVO → ACTIVO
= reactivar
```

No deben implementarse dos ciclos de vida diferentes:

```text
activar()
reactivar()
```

para representar la misma transición.

---

# 4. Modelo Conceptual

```text
Negocio
  │
  ├── 0..* Categoria
  │
  └── 0..* ArticuloCatalogo
                │
                └── 1 CapacidadesArticulo
```

Reglas:

- cada `ArticuloCatalogo` pertenece a exactamente un Negocio;
- cada `Categoria` pertenece a exactamente un Negocio;
- `UnidadMedida` pertenece a un catálogo normalizado global;
- no pueden mezclarse recursos de Negocios distintos.

---

# 5. ArticuloCatalogo

## 5.1. Definición

`ArticuloCatalogo` representa cualquier elemento que el Negocio necesite:

- comprar;
- vender;
- almacenar;
- utilizar en producción;
- ofrecer como servicio.

No representa necesariamente un producto terminado.

---

## 5.2. Información Funcional

Un artículo posee conceptualmente:

```text
Negocio

Nombre
Descripción [0..1]

TipoArticulo

Categoria [0..1]
UnidadMedida

SKU [0..1]
Imagen principal [0..1]

Precio base [0..1]
Costo de referencia [0..1]

CapacidadesArticulo

EstadoArticulo
```

---

# 6. TipoArticulo

Todo artículo posee exactamente uno:

```text
BIEN
SERVICIO
```

---

## 6.1. BIEN

Representa un elemento material o físicamente cuantificable.

Puede:

- comprarse;
- venderse;
- controlar stock;
- utilizarse en producción;
- controlar vencimiento;
- permitir descuentos.

---

## 6.2. SERVICIO

Representa una prestación no inventariable.

Puede:

- venderse;
- comprarse como prestación externa;
- expresarse mediante una UnidadMedida válida.

Un SERVICIO nunca administra inventario físico.

---

# 7. Inmutabilidad de TipoArticulo

`TipoArticulo` es estrictamente inmutable luego de la creación.

No se permite:

```text
BIEN → SERVICIO
SERVICIO → BIEN
```

Si fue creado incorrectamente:

```text
sin historia/referencias
→ evaluar eliminación física
→ crear correctamente

con historia/referencias
→ desactivar
→ crear otro artículo
```

No alterar la identidad histórica para cambiar el significado del artículo.

---

# 8. CapacidadesArticulo

Las capacidades son:

```text
es_comprable
es_vendible
controla_stock
puede_usarse_en_produccion
controla_vencimiento
permite_descuento
```

Expresan:

```text
elegibilidad
+
configuración
```

No representan hechos operativos.

Por lo tanto:

```text
controla_stock
≠ stock actual

controla_vencimiento
≠ fecha concreta de vencimiento

puede_usarse_en_produccion
≠ receta

es_vendible
≠ Venta

es_comprable
≠ Compra
```

---

## 8.1. CapacidadesArticulo es un Value Object inmutable

`CapacidadesArticulo`:

```text
NO posee identidad propia
NO usa setters parciales
NO muta flags existentes
NO aplica auto-fixes silenciosos
NO interpreta la intención del Caso de Uso
```

Flujo conceptual:

```text
Caso de Uso interpreta intención
        ↓
construye configuración completa propuesta
        ↓
CapacidadesArticulo valida
        ↓
acepta o rechaza
        ↓
si acepta, reemplaza al VO anterior
```

Una configuración inválida se rechaza.

El VO no debe transformarla silenciosamente en otra distinta.

---

# 9. Catálogo por Capacidades

Ejemplo:

```text
Harina

tipo = BIEN
es_comprable = True
es_vendible = False
controla_stock = True
puede_usarse_en_produccion = True
controla_vencimiento = True
permite_descuento = False
```

Ejemplo:

```text
Collar

tipo = BIEN
es_comprable = True
es_vendible = True
controla_stock = True
puede_usarse_en_produccion = False
controla_vencimiento = False
permite_descuento = True
```

Ejemplo:

```text
Maquillaje social

tipo = SERVICIO
es_comprable = False
es_vendible = True
controla_stock = False
puede_usarse_en_produccion = False
controla_vencimiento = False
permite_descuento = True
```

---

# 10. Reglas de Consistencia entre Capacidades

## 10.1. SERVICIO

Si:

```text
tipo = SERVICIO
```

entonces:

```text
controla_stock = False
controla_vencimiento = False
puede_usarse_en_produccion = False
```

---

## 10.2. Vencimiento

Si:

```text
controla_vencimiento = True
```

entonces:

```text
tipo = BIEN
controla_stock = True
```

---

## 10.3. Producción

Si:

```text
puede_usarse_en_produccion = True
```

entonces:

```text
tipo = BIEN
controla_stock = True
```

---

## 10.4. Descuento

Debe cumplirse:

```text
permite_descuento = True
→ es_vendible = True
```

Una propuesta:

```text
es_vendible = False
permite_descuento = True
```

es inválida.

`CapacidadesArticulo` debe rechazarla.

Si la intención funcional es deshabilitar venta:

```text
True → False
```

el **Caso de Uso** debe construir explícitamente el nuevo VO:

```text
es_vendible = False
permite_descuento = False
```

El VO no realiza ese ajuste por sí solo.

`precio_base` se conserva como referencia actual.

---

## 10.5. Uso Operativo Mínimo

Un artículo `ACTIVO` debe cumplir al menos una:

```text
es_comprable = True
OR
es_vendible = True
OR
puede_usarse_en_produccion = True
```

Un artículo `INACTIVO` puede conservar las tres en:

```text
False
```

sin violar la regla.

Si una edición de un artículo ACTIVO produciría cero usos operativos:

```text
RECHAZAR edición
```

No desactivar automáticamente.

---

## 10.6. Capacidades Comerciales y Estructurales

Comerciales:

```text
es_comprable
es_vendible
permite_descuento
```

Pueden cambiar sin reescribir historia.

Estructurales:

```text
controla_stock
controla_vencimiento
puede_usarse_en_produccion
```

pueden requerir guardias provenientes de módulos consumidores.

No utilizar como regla genérica:

```text
si existe historia
→ bloquear para siempre
```

Debe evaluarse la incompatibilidad real.

---

# 11. Bypass Total de Inventario

Si:

```text
controla_stock = False
```

el artículo queda fuera del subsistema de inventario.

M02 no crea ni administra:

```text
StockUbicacion
Lote
MovimientoInventario
```

M02 tampoco consulta M04 desde la entidad para decidir una desactivación.

---

# 12. Categoria

## 12.1. Propiedad

Cada `Categoria` pertenece a un Negocio.

Si un artículo posee Categoria:

```text
ArticuloCatalogo.negocio
=
Categoria.negocio
```

---

## 12.2. Categoria Opcional

Un artículo puede existir sin Categoria.

---

## 12.3. Nombre Único por Negocio

Los nombres funcionalmente equivalentes se consideran duplicados dentro del mismo Negocio.

La unicidad incluye:

```text
ACTIVAS
+
INACTIVAS
```

Si existe una equivalente INACTIVA:

```text
NO crear otra
→ ofrecer reactivación
```

---

## 12.4. Categoria INACTIVA

Una Categoria INACTIVA:

- continúa existiendo;
- conserva identidad;
- conserva referencias;
- conserva artículos ya asociados;
- no desactiva esos artículos;
- no modifica capacidades;
- no recalcula precios;
- no puede utilizarse para una nueva asociación;
- no puede utilizarse como destino de reasignación.

Una Categoria históricamente asociada e INACTIVA:

```text
NO bloquea por sí sola
la reactivación del ArticuloCatalogo
```

---

## 12.5. Eliminación Física de Categoria

No puede eliminarse mientras exista cualquier artículo asociado, ACTIVO o INACTIVO.

La ausencia de dependencias debe revalidarse al confirmar.

---

# 13. UnidadMedida

Catálogo MVP:

```text
UNIDAD
KG
G
L
ML
M
CM
HORA
```

No existen unidades personalizadas por Negocio en MVP.

---

## 13.1. BIEN

Todo BIEN posee UnidadMedida válida.

---

## 13.2. SERVICIO

Todo SERVICIO posee UnidadMedida.

Valor inicial:

```text
UNIDAD
```

Puede utilizar:

```text
HORA
```

u otra unidad normalizada apropiada.

---

# 14. Estabilidad de UnidadMedida

Puede cambiarse mientras no se invalide el significado de cantidades históricas relevantes.

Ejemplo:

```text
Harina
Unidad = KG
Compra histórica = 5 KG
```

No permitir:

```text
KG → UNIDAD
```

mediante una edición simple si altera el significado histórico.

La historia cuantitativa es una guardia contextual.

M02 no requiere:

```text
tiene_historia_operativa
```

como atributo persistente obligatorio.

---

# 15. Cantidades Fraccionarias

El dominio admite:

```text
1 unidad
0.500 kg
1.25 kg
2.5 litros
0.75 metros
1.5 horas
```

No restringir cantidades a enteros.

---

# 16. Precio Base

`precio_base` es una referencia comercial actual.

Si:

```text
es_vendible = True
```

debe existir:

```text
precio_base != null
precio_base >= 0
```

El valor:

```text
0
```

es válido.

No usar precio negativo.

---

# 17. Historia del Precio

Modificar:

```text
precio_base
```

NO modifica operaciones históricas.

Los módulos consumidores preservan el precio realmente aplicado.

---

# 18. Habilitar y Deshabilitar Venta

## 18.1. Habilitar

```text
es_vendible False → True
```

requiere:

```text
precio_base válido
```

antes de confirmar.

---

## 18.2. Deshabilitar

La intención:

```text
es_vendible True → False
```

debe construir una configuración propuesta con:

```text
es_vendible = False
permite_descuento = False
```

y conservar:

```text
precio_base
```

Importante:

```text
CapacidadesArticulo
NO auto-corrige permite_descuento.
```

La coherencia debe existir en la propuesta antes de construir/reemplazar el VO.

---

# 19. Costo de Referencia

`costo_referencia` es opcional.

Si existe:

```text
costo_referencia >= 0
```

No reescribe costos históricos.

---

# 20. Moneda

El artículo no posee moneda independiente.

Usa:

```text
Negocio.moneda_base
```

MVP:

```text
ARS
```

---

# 21. SKU

## 21.1. Concepto

SKU:

```text
opcional
editable
no es identidad técnica
```

---

## 21.2. Ausencia Canónica

La ausencia funcional de SKU se representa como:

```text
null
```

Antes de validar o persistir:

```text
input ""
→ null
```

No utilizar `""` como segunda representación de “sin SKU”.

No se congela todavía:

- case sensitivity;
- trim automático;
- Unicode;
- regex;
- formato exacto.

---

## 21.3. Unicidad

Si existe:

```text
SKU
```

debe ser único:

```text
por Negocio
```

considerando:

```text
ACTIVO
+
INACTIVO
```

Desactivar:

```text
NO libera SKU.
```

---

## 21.4. Modificación

```text
A → B
→ validar B
→ confirmar B
→ liberar A

A → null
→ confirmar
→ liberar A

null → B
→ validar B

A → A
→ no-op funcional
```

El valor anterior se libera únicamente después de confirmar la operación válida.

---

## 21.5. Historia

MVP no mantiene:

```text
historial de SKU
alias permanentes
reserva de todos los SKU anteriores
```

Los módulos consumidores preservan el código histórico cuando lo necesiten.

---

# 22. Imagen

MVP:

```text
0..1 imagen principal
```

Opcional.

---

# 23. Variantes

No existe modelo formal de variantes.

Ejemplo:

```text
Remera negra M
Remera negra L
```

son artículos independientes.

---

# 24. EstadoArticulo

Exactamente:

```text
ACTIVO
INACTIVO
```

No introducir:

```text
ARCHIVADO
AGOTADO
SIN_STOCK
BORRADO
ELIMINADO
```

como estados de M02.

---

## 24.1. ACTIVO

Puede participar en nuevas operaciones compatibles con sus capacidades.

Debe cumplir:

```text
>= 1 uso operativo
+
Tipo/Capacidades coherentes
+
precio válido si vendible
+
guardias aplicables
```

La edición normal solo se permite en ACTIVO.

---

## 24.2. INACTIVO

No se ofrece normalmente en selectores de nuevas operaciones.

Continúa disponible para:

- historia;
- reportes;
- auditoría;
- consultas;
- reactivación.

Puede conservar cero usos operativos.

### Regla MVP — Edición Bloqueada

Mientras permanezca INACTIVO:

```text
NO admite edición individual
```

de:

- nombre;
- descripción;
- SKU;
- precio;
- costo;
- imagen;
- Categoria;
- UnidadMedida;
- CapacidadesArticulo.

No deben existir comandos normales que modifiquen esos datos dejando al artículo INACTIVO.

Para modificar su configuración debe utilizarse el flujo de reactivación con permisos suficientes.

---

# 25. Desactivación

Transición:

```text
ACTIVO → INACTIVO
```

Autorizados:

```text
PROPIETARIO
ENCARGADO
```

con:

```text
UsuarioNegocio ACTIVO
+
mismo Negocio
+
permiso concreto
```

Desactivar conserva:

- identidad;
- nombre;
- descripción;
- TipoArticulo;
- UnidadMedida;
- SKU;
- precio;
- costo;
- imagen;
- Categoria;
- CapacidadesArticulo;
- referencias;
- historia.

NO:

- libera SKU;
- pone capacidades en false;
- borra precio;
- modifica stock;
- borra lotes;
- borra movimientos;
- consulta stock para decidir.

Regla:

```text
stock > 0
NO impide desactivar
```

---

# 26. Reactivación

Transición:

```text
INACTIVO → ACTIVO
```

Reutiliza:

```text
la misma entidad
```

No crea una copia.

---

## 26.1. Reactivación Simple

Utiliza la configuración almacenada.

Puede realizarla:

```text
PROPIETARIO
ENCARGADO
```

si la configuración actual ya cumple todas las invariantes vigentes.

---

## 26.2. Reactivación con Reconfiguración

Puede ser necesaria cuando la configuración almacenada no permite volver válidamente a ACTIVO.

Solo:

```text
PROPIETARIO
```

puede aplicar cambios de configuración durante la reactivación.

Conceptualmente:

```text
INACTIVO
+
datosDeReactivacion
+
validación local/contextual
+
cambio a ACTIVO
```

debe confirmar:

```text
TODO
```

o:

```text
NADA.
```

No deben persistirse cambios parciales si la reactivación falla.

---

## 26.3. No es Edición Libre de INACTIVO

```text
reactivar(payload)
≠
editarArticuloInactivo()
```

El payload existe exclusivamente para construir una configuración válida que permita terminar la operación en:

```text
ACTIVO
```

---

## 26.4. ENCARGADO y Reconfiguración Necesaria

Si un ENCARGADO intenta reactivar y la configuración actual no es válida:

```text
RECHAZAR
```

La causa debe poder distinguir semánticamente:

```text
requiere reconfiguración
+
ENCARGADO no posee permiso de edición
+
requiere PROPIETARIO
```

No se congela mensaje exacto, clase de excepción o código HTTP.

---

## 26.5. Revalidación

Antes de confirmar:

```text
INACTIVO → ACTIVO
```

revalidar:

```text
Tipo + Capacidades
+
uso operativo mínimo
+
precio válido si esVendible
+
costo válido si existe
+
UnidadMedida
+
SKU/contexto
+
Categoria cuando corresponda
+
guardias estructurales aplicables
```

Una Categoria históricamente asociada INACTIVA no bloquea por sí sola la reactivación.

---

# 27. Eliminación Física

`eliminarFisicamente()`:

```text
NO es EstadoArticulo
NO crea ELIMINADO
NO es transición de la máquina de estados
```

Solo puede confirmarse si:

```text
sin historia relevante
+
sin referencias
+
sin dependencias que deban conservarse
```

La evaluación puede requerir información de módulos consumidores actuales o futuros.

Si existen dependencias:

```text
NO eliminar
```

Si además el artículo sigue ACTIVO y se desea retirarlo:

```text
desactivar
```

La ausencia de dependencias debe revalidarse al confirmar.

Si el borrado se confirma:

```text
SKU actual queda disponible.
```

---

# 28. Experiencia de Creación

Flujo conceptual:

```text
Nuevo artículo
       ↓
Bien / Servicio
       ↓
Nombre
       ↓
¿Cómo lo utilizás?
       ↓
Precio
       ↓
Guardar
```

Evitar formularios técnicos extensos.

---

# 29. Configuración Inteligente de Interfaz

Si:

```text
tipo = SERVICIO
```

no ofrecer normalmente:

```text
Controlar stock
Controlar vencimiento
Usar en producción
```

Si:

```text
es_vendible = False
```

no ofrecer `permite_descuento = True`.

UX previene errores.

Dominio garantiza invariantes.

---

# 30. Requisitos Funcionales

| ID | Título | Actor principal | Criterio principal |
| --- | --- | --- | --- |
| RF-CAT-001 | Consultar catálogo | Miembro | Solo recursos del Negocio autorizado. |
| RF-CAT-002 | Buscar y filtrar | Miembro | Búsqueda limitada al Negocio. |
| RF-CAT-003 | Consultar artículo | Miembro | Visualización de datos pertinentes. |
| RF-CAT-004 | Crear Categoria | Propietario | ACTIVA, mismo Negocio, nombre no equivalente. |
| RF-CAT-005 | Editar Categoria | Propietario | Preserva identidad y unicidad. |
| RF-CAT-006 | Desactivar/reactivar Categoria | Propietario | No altera artículos asociados. |
| RF-CAT-007 | Eliminar Categoria | Propietario | Solo sin asociaciones/dependencias. |
| RF-CAT-008 | Consultar unidades | Miembro | Lista normalizada. |
| RF-CAT-009 | Crear artículo | Propietario | Crea ACTIVO con configuración válida. |
| RF-CAT-010 | Editar artículo ACTIVO | Propietario | Configuración final válida; historia intacta. |
| RF-CAT-011 | Desactivar artículo | Propietario / Encargado | ACTIVO→INACTIVO conservando configuración. |
| RF-CAT-012 | Reactivar artículo | Propietario / Encargado | Reutiliza misma identidad y revalida. |
| RF-CAT-013 | Reactivar con reconfiguración | Propietario | Cambios + ACTIVO se confirman atómicamente. |
| RF-CAT-014 | Eliminar artículo no utilizado | Propietario | Solo sin historia/referencias/dependencias. |
| RF-CAT-015 | Administrar precio base | Propietario | Solo ACTIVO o dentro de reactivación autorizada. |
| RF-CAT-016 | Administrar costo | Propietario | No reescribe historia. |
| RF-CAT-017 | Administrar capacidades | Propietario | VO completo válido, sin auto-fix. |
| RF-CAT-018 | Asociar imagen | Propietario | Imagen opcional. |
| RF-CAT-019 | Validar pertenencia | Sistema | Aislamiento por Negocio. |
| RF-CAT-020 | Administrar SKU | Propietario | `""→null`; único por Negocio ACTIVO+INACTIVO. |
| RF-CAT-021 | Preservar Tipo | Sistema | TipoArticulo inmutable. |
| RF-CAT-022 | Validar UnidadMedida | Sistema | Preserva significado histórico. |
| RF-CAT-023 | Confirmar guardias contextuales | Sistema | Preconsulta no reemplaza confirmación. |
| RF-CAT-024 | Autorizar mutaciones | Sistema | Usuario+Negocio+Membresía ACTIVA+Rol+permiso. |
| RF-CAT-025 | Bloquear edición de INACTIVO | Sistema | Solo reactivación puede incorporar cambios autorizados. |

---

# 31. Reglas de Negocio

## RN-CAT-001 — Pertenencia al Negocio
Todo artículo pertenece a exactamente un Negocio.

## RN-CAT-002 — Categoria del Mismo Negocio
Si existe Categoria asociada, pertenece al mismo Negocio.

## RN-CAT-003 — Tipo Obligatorio
Todo artículo posee BIEN o SERVICIO.

## RN-CAT-004 — SERVICIO sin Inventario
SERVICIO implica stock=False, vencimiento=False y producción=False.

## RN-CAT-005 — Bypass de Inventario
Si no controla stock, M02 no genera hechos de inventario.

## RN-CAT-006 — Vencimiento Requiere Stock
Vencimiento implica BIEN + stock.

## RN-CAT-007 — Producción Requiere BIEN con Stock
Producción implica BIEN + stock.

## RN-CAT-008 — Descuento Requiere Venta
Descuento=True implica vendible=True.

Una combinación descuento=True + vendible=False se rechaza.

## RN-CAT-009 — Uso Operativo Mínimo
ACTIVO exige comprable OR vendible OR producción.

INACTIVO puede tener los tres en False.

## RN-CAT-010 — Unidad Obligatoria para BIEN
Todo BIEN posee UnidadMedida válida.

## RN-CAT-011 — Unidad de SERVICIO
Todo SERVICIO posee UnidadMedida; valor inicial UNIDAD salvo otra válida.

## RN-CAT-012 — Precio Base Válido
Si vendible=True: precio_base existe y >=0.

## RN-CAT-013 — Costo de Referencia
Opcional; si existe, >=0.

## RN-CAT-014 — Precio no Reescribe Historia
Cambiar precio actual no modifica operaciones previas.

## RN-CAT-015 — Costo no Reescribe Historia
Cambiar costo actual no modifica operaciones previas.

## RN-CAT-016 — SKU Opcional y Único
SKU es opcional y único por Negocio entre ACTIVOS e INACTIVOS.

Desactivar no libera SKU.

## RN-CAT-017 — Nombre no es Identidad
El nombre no es clave técnica.

## RN-CAT-018 — Categoria Opcional
ArticuloCatalogo puede existir sin Categoria.

## RN-CAT-019 — Categoria INACTIVA
No desactiva artículos; conserva asociaciones; no admite nuevas asociaciones/reasignaciones.

## RN-CAT-020 — Conservación Histórica
Modificar M02 no reescribe operaciones anteriores.

## RN-CAT-021 — Eliminación Segura
Hard delete solo sin historia, referencias ni dependencias; revalidar al confirmar.

## RN-CAT-022 — Reactivación
INACTIVO→ACTIVO reutiliza la misma entidad y revalida invariantes.

## RN-CAT-023 — Artículo INACTIVO
No participa normalmente en nuevas operaciones; sigue visible para historia/consulta/reactivación.

## RN-CAT-024 — Variantes Independientes
MVP representa variantes como artículos diferentes.

## RN-CAT-025 — Imagen Principal
Máximo una imagen principal en MVP.

## RN-CAT-026 — Cantidades Fraccionarias
El dominio admite fracciones.

## RN-CAT-027 — Moneda del Negocio
Los importes usan monedaBase de Negocio.

## RN-CAT-028 — Permisos Estrictos
PROPIETARIO administra M02.
ENCARGADO consulta, desactiva y reactiva sin modificar configuración.
TRABAJADOR consulta.

## RN-CAT-029 — Sin Listas de Precios
Un único precio_base actual.

## RN-CAT-030 — Trazabilidad
Cambios relevantes deben poder asociarse a Usuario y momento.

## RN-CAT-031 — Tipo Inmutable
BIEN/SERVICIO no cambia después de crear.

## RN-CAT-032 — Estabilidad de UnidadMedida
No cambiar UnidadMedida si altera significado histórico.

## RN-CAT-033 — Deshabilitar Venta
El Caso de Uso debe construir un nuevo VO coherente con vendible=False y descuento=False. Se conserva precio.

## RN-CAT-034 — Nombre Único de Categoria
Unicidad normalizada por Negocio, incluyendo ACTIVA/INACTIVA.

## RN-CAT-035 — Modificación de SKU
A→B, A→null, null→B y A→A siguen la política definida en §21.

## RN-CAT-036 — Capacidades Comerciales/Estructurales
Cambios estructurales requieren evaluar dependencias reales.

## RN-CAT-037 — Capacidades son Elegibilidades
No son stock, ventas, compras, lotes ni recetas.

## RN-CAT-038 — Guardias Contextuales
Preconsulta no garantiza confirmación; mutación debe proteger invariantes al confirmar.

## RN-CAT-039 — Estado Actual vs Historia
M02 representa configuración actual; consumidores preservan historia.

## RN-CAT-040 — Autorización Contextual
Toda mutación valida Usuario+Negocio+UsuarioNegocio ACTIVO+Rol+permiso.

## RN-CAT-041 — Edición Solo en ACTIVO
En MVP, edición individual de ArticuloCatalogo solo se permite en estado ACTIVO.

## RN-CAT-042 — Reactivación Atómica con Reconfiguración
Si un INACTIVO necesita cambios para volver a ACTIVO, un PROPIETARIO puede aplicar una configuración candidata dentro de la misma operación de reactivación. Cambios y estado confirman juntos o no confirma nada.

## RN-CAT-043 — CapacidadesArticulo Inmutable sin Auto-Fix
El VO acepta o rechaza una configuración completa. No muta flags ni corrige combinaciones inválidas silenciosamente.

## RN-CAT-044 — Ausencia Canónica de SKU
La ausencia se representa como null. Input `""` se normaliza a null antes de validar/persistir.

## RN-CAT-045 — Reactivación del ENCARGADO
ENCARGADO solo puede reactivar sin modificar configuración. Si se requiere reconfiguración, la operación se rechaza y requiere PROPIETARIO.

## RN-CAT-046 — Activar y Reactivar
Para un artículo histórico INACTIVO, “activar” en UX mapea a la misma transición semántica INACTIVO→ACTIVO; no existe un ciclo de vida distinto.

---

# 32. Casos de Uso

## CU-CAT-01 — Consultar Catálogo

Actor: Miembro ACTIVO del Negocio.

Muestra inicialmente artículos ACTIVOS.

Permite consultar INACTIVOS mediante filtros administrativos/históricos.

---

## CU-CAT-02 — Buscar y Filtrar

Filtros iniciales:

```text
Tipo
Categoria
Estado
```

Siempre dentro del Negocio autorizado.

---

## CU-CAT-03 — Gestionar Categorias

Actor: PROPIETARIO.

Incluye:

- crear;
- editar;
- desactivar;
- reactivar;
- eliminar cuando no existan dependencias.

No modificar artículos automáticamente al cambiar estado de Categoria.

---

## CU-CAT-04 — Crear Artículo

Actor: PROPIETARIO.

Flujo:

1. seleccionar Nuevo;
2. elegir BIEN/SERVICIO;
3. nombre;
4. Categoria opcional ACTIVA del mismo Negocio;
5. UnidadMedida;
6. definir usos;
7. precio si vendible;
8. costo/SKU/descripción/imagen opcionales;
9. normalizar SKU vacío a null;
10. construir `CapacidadesArticulo` completo;
11. rechazar VO inválido;
12. validar guardias contextuales;
13. confirmar;
14. crear `ACTIVO`.

---

## CU-CAT-05 — Editar Artículo ACTIVO

Actor: PROPIETARIO.

Precondiciones:

```text
Usuario autenticado
Negocio identificado
UsuarioNegocio ACTIVO
ArticuloCatalogo ACTIVO
permiso concreto
mismo Negocio
```

Si el artículo está INACTIVO:

```text
RECHAZAR edición directa
→ orientar a reactivación
```

Puede modificarse:

- nombre;
- descripción;
- Categoria;
- SKU;
- imagen;
- precio;
- costo;
- capacidades;
- UnidadMedida cuando sea válida.

No puede modificarse:

```text
TipoArticulo
```

Cambio de capacidades:

```text
Caso de Uso construye VO completo
→ VO valida
→ acepta/rechaza
```

No auto-fix.

Si se deshabilita venta:

```text
propuesta explícita:
es_vendible=False
permite_descuento=False
```

---

## CU-CAT-06 — Desactivar / Reactivar Artículo

Actor:

```text
PROPIETARIO
ENCARGADO
```

### Desactivar

Requiere artículo ACTIVO.

Confirma:

```text
ACTIVO → INACTIVO
```

sin modificar configuración ni M04.

### Reactivar Simple

Requiere artículo INACTIVO.

PROPIETARIO o ENCARGADO.

Si configuración actual satisface invariantes:

```text
INACTIVO → ACTIVO
```

### Reactivar con Reconfiguración

Solo PROPIETARIO.

Construye configuración candidata y confirma:

```text
cambios
+
INACTIVO → ACTIVO
```

como unidad funcional.

Si falla:

```text
INACTIVO permanece
+
sin cambios parciales.
```

Si ENCARGADO requiere reconfiguración:

```text
RECHAZAR
→ requiere PROPIETARIO.
```

---

## CU-CAT-07 — Eliminar Artículo

Actor: PROPIETARIO.

1. preconsulta opcional para UX;
2. revalidar historia/referencias/dependencias al confirmar;
3. eliminar solo si ninguna debe conservarse;
4. liberar SKU al confirmar.

Hard delete no es EstadoArticulo.

---

# 33. Historias de Usuario

## HU-CAT-001 — Crear BIEN
Como Propietario, quiero crear un bien con pocos datos para incorporarlo rápidamente.

## HU-CAT-002 — Crear SERVICIO
Como Propietario, quiero registrar prestaciones sin opciones de inventario incompatibles.

## HU-CAT-003 — Combinar Usos
Como Propietario, quiero definir si compro, vendo o utilizo en producción.

## HU-CAT-004 — Organizar con Categorias
Como Propietario, quiero organizar el catálogo sin duplicar Categorias.

## HU-CAT-005 — Crear Rápidamente
Como pequeño comerciante, quiero evitar formularios extensos.

## HU-CAT-006 — Cambiar Precio sin Alterar Historia
Como Propietario, quiero cambiar el precio actual sin modificar ventas anteriores.

## HU-CAT-007 — Retirar sin Borrar Historia
Como Propietario o Encargado, quiero desactivar artículos conservando información.

## HU-CAT-008 — Buscar Rápidamente
Como miembro, quiero localizar artículos con agilidad.

## HU-CAT-009 — Gestionar SKU
Como Propietario, quiero administrar el SKU actual manteniendo su unicidad contextual.

## HU-CAT-010 — Reactivar de Forma Segura
Como Propietario o Encargado, quiero reutilizar la misma identidad al reactivar.

## HU-CAT-011 — Reconfigurar al Reactivar
Como Propietario, quiero actualizar una configuración obsoleta dentro de la misma reactivación, sin dejar cambios parciales.

---

# 34. Estados y Transiciones

```text
[*]
 │
 │ crear válido
 ▼
ACTIVO
 │  ▲
 │  │ reactivar
 │  │
 │  └──────────
 │
 │ desactivar
 ▼
INACTIVO
```

Únicamente:

```text
ACTIVO
INACTIVO
```

Editar un ACTIVO:

```text
NO es transición de EstadoArticulo
```

Hard delete:

```text
NO es estado
```

---

# 35. Excepciones y Errores Funcionales

| Condición | Efecto esperado |
| --- | --- |
| Nombre faltante | Rechazar. |
| BIEN sin unidad | Rechazar. |
| Vendible sin precio | Rechazar. |
| Precio negativo | Rechazar. |
| Costo negativo | Rechazar. |
| SERVICIO con stock/vencimiento/producción | Rechazar. |
| Producción sin stock | Rechazar. |
| Vencimiento sin stock | Rechazar. |
| Descuento sin venta | Rechazar VO; no auto-corregir. |
| Edición deja ACTIVO con 0 usos | Rechazar; no desactivar automáticamente. |
| SKU `""` | Normalizar a null. |
| SKU duplicado ACTIVO/INACTIVO | Rechazar. |
| Categoria INACTIVA para nueva asociación | Rechazar. |
| Categoria de otro Negocio | Rechazar. |
| Cambiar BIEN↔SERVICIO | Rechazar. |
| Cambiar unidad con historia incompatible | Rechazar. |
| Editar artículo INACTIVO | Rechazar; orientar a reactivación. |
| Reactivar ACTIVO | Rechazar no-op silencioso. |
| Desactivar INACTIVO | Rechazar no-op silencioso. |
| ENCARGADO intenta payload de edición | Rechazar. |
| ENCARGADO necesita reconfiguración | Rechazar y requerir PROPIETARIO. |
| Reactivación con configuración inválida | Mantener INACTIVO, sin cambios parciales. |
| Eliminar con referencias | Rechazar. |
| Guardia cambia entre preconsulta/confirmación | Rechazar/reintentar sin estado inválido. |
| Nueva operación usa artículo desactivado concurrentemente | Revalidar y rechazar según módulo consumidor. |

Mensajes exactos pertenecen a UX/API.

---

# 36. Interacción con Otros Módulos

## M01
Provee Usuario, Negocio, UsuarioNegocio y Rol para autorización contextual.

## M03
Utilizará `es_comprable`.

## M04
Utilizará `controla_stock` y `controla_vencimiento`.

M02 no consulta inventario desde la entidad para desactivar.

## M05
Utilizará `es_vendible` y precio_base como referencia actual.

Preserva precio histórico en Venta.

## M07
Utilizará `puede_usarse_en_produccion`.

Recetas no pertenecen a M02.

## M08
Puede analizar por Articulo, Categoria y Tipo, respetando historia de módulos fuente.

---

# 37. Matriz de Trazabilidad Resumida

| RF | RN principales | CU |
| --- | --- | --- |
| RF-CAT-009 Crear | RN 003-013, 016, 018, 031, 034, 040, 043, 044 | CU-CAT-04 |
| RF-CAT-010 Editar ACTIVO | RN 008, 012-016, 019, 031-041, 043-044 | CU-CAT-05 |
| RF-CAT-011 Desactivar | RN 023, 028, 040-041 | CU-CAT-06 |
| RF-CAT-012 Reactivar | RN 019, 022, 038, 040, 045-046 | CU-CAT-06 |
| RF-CAT-013 Reactivar con reconfig | RN 022, 038, 040, 042-045 | CU-CAT-06 |
| RF-CAT-014 Eliminar | RN 020-021, 038, 040 | CU-CAT-07 |
| RF-CAT-017 Capacidades | RN 004-009, 033, 036-038, 043 | CU-CAT-04/05/06 |
| RF-CAT-020 SKU | RN 016, 035, 038, 040, 044 | CU-CAT-04/05/06/07 |
| RF-CAT-025 Bloquear edición INACTIVO | RN 023, 028, 041-045 | CU-CAT-05/06 |

---

# 38. Criterios de Aceptación

M02 se considera funcionalmente correcto cuando, como mínimo:

1. cada Negocio tiene catálogo aislado;
2. toda mutación valida membresía ACTIVA + permiso + tenant;
3. BIEN/SERVICIO son los únicos Tipos;
4. TipoArticulo es inmutable;
5. SERVICIO no controla stock/vencimiento/producción;
6. ACTIVO exige >=1 uso operativo;
7. INACTIVO puede tener 0 usos;
8. CapacidadesArticulo es VO inmutable;
9. VO inválido se rechaza y no se auto-corrige;
10. habilitar venta exige precio >=0;
11. precio 0 es válido;
12. deshabilitar venta conserva precio;
13. el Caso de Uso construye descuento=False al deshabilitar venta;
14. costo opcional, si existe >=0;
15. SKU es opcional;
16. `SKU ""` se normaliza a null;
17. SKU es único por Negocio entre ACTIVOS e INACTIVOS;
18. desactivar no libera SKU;
19. Categoria es opcional;
20. Categoria INACTIVA conserva asociaciones;
21. Categoria INACTIVA no desactiva artículos;
22. nuevas asociaciones requieren Categoria ACTIVA;
23. Categoria histórica INACTIVA no bloquea reactivación;
24. cantidades fraccionarias están soportadas;
25. UnidadMedida no cambia si altera historia;
26. PROPIETARIO edita ACTIVO;
27. ENCARGADO no edita;
28. TRABAJADOR consulta;
29. INACTIVO no admite edición individual;
30. desactivar conserva toda configuración;
31. stock >0 no bloquea desactivación;
32. M02 no modifica stock/lotes al desactivar;
33. reactivación reutiliza la misma identidad;
34. reactivación simple puede hacerla PROPIETARIO/ENCARGADO;
35. reactivación con reconfiguración solo PROPIETARIO;
36. reactivación con reconfiguración es todo-o-nada;
37. ENCARGADO no usa payload como bypass;
38. reactivación inválida mantiene INACTIVO;
39. editar ACTIVO no constituye transición de EstadoArticulo;
40. hard delete no es estado;
41. hard delete revalida referencias;
42. preconsulta UX no es garantía final;
43. selección previa no garantiza elegibilidad al confirmar;
44. concurrencia no permite duplicar SKU;
45. M02 representa configuración actual;
46. módulos consumidores preservan historia;
47. dominio no consulta repositories directamente para guardias contextuales.

---

# 39. Alcance MVP

## MUST HAVE

```text
Catálogo por Negocio

BIEN
SERVICIO
TipoArticulo inmutable

Categoria opcional
Categoria INACTIVA conserva asociaciones

UnidadMedida normalizada
Cantidades fraccionarias

Crear artículo ACTIVO
Editar solo ACTIVO
Consultar
Buscar

Desactivar
Reactivar simple
Reactivar con reconfiguración para PROPIETARIO

INACTIVO sin edición individual

Precio base
Costo referencia

SKU opcional
"" → null
SKU único ACTIVO + INACTIVO

CapacidadesArticulo VO inmutable
Sin auto-fixes
Actualización completa

Eliminación física segura fuera de EstadoArticulo

Aislamiento por Negocio
Permisos estrictos
Conservación histórica
Guardias contextuales al confirmar
```

---

# 40. Fuera del MVP

- variantes estructuradas;
- múltiples imágenes;
- código de barras;
- importación masiva;
- catálogo público;
- e-commerce;
- múltiples listas de precios;
- historial avanzado de precios;
- jerarquía de Categorias;
- unidades personalizadas;
- atributos dinámicos;
- combos;
- conversión histórica automática;
- historial/alias permanente de SKU;
- edición libre de artículos INACTIVOS.

---

# 41. Consideraciones de UX

UX debe:

- usar lenguaje cotidiano;
- ocultar opciones incompatibles;
- evitar formularios extensos;
- priorizar celular;
- permitir ausencia de imagen/SKU/Categoria;
- mostrar claramente EstadoArticulo;
- ocultar INACTIVOS en selectores normales;
- permitir filtros administrativos por INACTIVO;
- al reactivar, mostrar datos relevantes para revisión;
- si ENCARGADO necesita reconfiguración, informar que requiere PROPIETARIO.

UX no reemplaza validación backend.

---

# 42. Consideraciones para Diseño Técnico

No se congela:

- tipos SQL;
- precisión exacta Numeric;
- tablas;
- enums SQL;
- índices;
- almacenamiento de imágenes;
- endpoints;
- DTOs;
- Pydantic;
- SQLAlchemy;
- IDs;
- Repository;
- Unit of Work;
- Service Layer concreto;
- locking;
- isolation;
- optimistic/pessimistic concurrency;
- auditoría;
- Domain Events;
- case sensitivity de SKU;
- trim/Unicode/regex de SKU.

Debe garantizarse:

```text
dinero decimal exacto
cantidades fraccionarias
unicidad contextual bajo concurrencia
mutaciones atómicas/consistentes
no estados parciales
```

---

# 43. Decisiones Deliberadamente Postergadas

Quedan para módulos posteriores:

```text
qué dependencias exactas bloquean quitar controla_stock
qué dependencias exactas bloquean quitar producción
qué operaciones excepcionales pueden usar stock de un artículo INACTIVO
cómo se resuelven ajustes/regularizaciones
```

M02 solo congela:

```text
qué capacidades existen
qué combinaciones son válidas
qué cambios requieren contexto externo
```

---

# 44. Consistencia Transversal

Política M02:

```text
PROPIETARIO
→ administración completa
→ reconfiguración al reactivar

ENCARGADO
→ consulta
→ desactivar
→ reactivar sin cambios

TRABAJADOR
→ consulta
```

Configuración editable incluye:

```text
nombre
descripción
precio
costo
SKU
UnidadMedida
Capacidades
Categoria
imagen
```

solo en ACTIVO, salvo cambios incluidos atómicamente en reactivación autorizada por PROPIETARIO.

---

# 45. Criterio Rector

> **Un catálogo genérico por capacidades, protegido por reglas estrictas de consistencia y presentado mediante una experiencia sencilla para pequeños negocios.**

La flexibilidad nunca debe sacrificar:

- tenant;
- historia;
- consistencia;
- autorización;
- significado cuantitativo;
- unicidad contextual.

---

# 46. Guía de Interpretación para Implementación e IA

## 46.1. Orden de Lectura

```text
M02-Catalogo.md
↓
01-modelo-dominio-bloque-1.md
↓
03-m02-catalogo-clases.md
↓
03-m02-catalogo-clases.puml
↓
06-m02-estados-articulo.md
↓
06-m02-estados-articulo.puml
↓
ADRs
↓
Modelo Relacional
↓
API
↓
Código
```

---

## 46.2. Reglas Mínimas para IA

Una IA NO debe:

- convertir UML directamente en ORM;
- introducir jerarquías Producto/Insumo/Servicio;
- meter stock/lotes/recetas en ArticuloCatalogo;
- modificar TipoArticulo;
- mutar CapacidadesArticulo;
- auto-corregir VO inválidos;
- editar INACTIVO directamente;
- usar reactivación para bypass de permisos;
- permitir SKU duplicado porque uno está INACTIVO;
- persistir `SKU=""`;
- usar SKU como identidad;
- reconstruir historia usando valores actuales;
- confiar en frontend/prechecks;
- consultar repositories desde la entidad;
- inventar infraestructura prematura.

Una IA debe:

```text
construir configuración candidata completa
→ validar localmente
→ obtener contexto externo desde Caso de Uso
→ garantizar guardias al confirmar
→ aplicar mutación o rechazar sin cambios parciales
```

---

## 46.3. Guardias Locales vs Contextuales

Locales:

```text
Tipo + Capacidades
precio
costo
uso operativo mínimo
Tipo inmutable
coherencia VO
```

Contextuales:

```text
autorización
tenant
SKU único
Categoria
historia cuantitativa
dependencias estructurales
referencias para hard delete
```

La entidad no consulta repositories para resolver las contextuales.

---

## 46.4. TOCTOU

Ejemplo:

```text
T0 artículo ACTIVO
T1 Usuario A lo selecciona
T2 Usuario B lo desactiva
T3 Usuario A intenta confirmar nueva operación
```

Regla:

```text
selección previa
≠
elegibilidad garantizada al confirmar
```

El módulo consumidor debe revalidar.

---

# 47. Estado al Cerrar la Especificación Funcional M02

Con esta sincronización:

```text
BLOQUE 1 — FUNDACIÓN

M01 Organización
✅ ESPECIFICACIÓN FUNCIONAL CONGELADA

M02 Catálogo
✅ ESPECIFICACIÓN FUNCIONAL CONGELADA
✅ SINCRONIZADA CON 06-m02-estados-articulo.md
```

Artefactos M02:

```text
M02-Catalogo.md
✅ SINCRONIZADO CON CICLO DE VIDA

06-m02-estados-articulo.md
✅ SEMÁNTICA CERRADA

06-m02-estados-articulo.puml
✅ CONGELADO

06-m02-estados-articulo.png
✅ CONGELADO
```

Pendiente inmediatamente después:

```text
03-m02-catalogo-clases.md
03-m02-catalogo-clases.puml
```

Deben incorporar las mismas precisiones:

```text
edición solo en ACTIVO
reactivación simple vs. con reconfiguración
ENCARGADO sin payload de edición
CapacidadesArticulo inmutable sin auto-fix
SKU "" → null
activar/reactivar como misma transición semántica
```

Después de sincronizar Diagrama 3, continuar con:

```text
secuencias/
├── 01-aceptar-invitacion.puml
└── 02-editar-articulo.puml
```

No comenzar M03 antes de completar el incremento técnico correspondiente al Bloque 1.
