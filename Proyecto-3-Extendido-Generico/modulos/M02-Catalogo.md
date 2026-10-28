# 02 — Módulo de Catálogo
## Versión funcional actualizada — sincronizada con `secuencias/02-editar-articulo.puml`

> **Estado documental:** M02 funcionalmente sincronizado con Diagrama 3, Diagrama 6 y la secuencia de edición. Auditoría transversal del Bloque 1 completada; versión congelada como referencia para implementación.

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
- hasta 3 imágenes por artículo, con exactamente una principal cuando existan imágenes;
- capacidades operativas;
- búsqueda y consulta;
- creación;
- edición administrativa controlada de artículos `ACTIVOS` e `INACTIVOS`;
- desactivación;
- reactivación explícita como caso de uso separado de la edición;
- eliminación física excepcional cuando sea segura;
- conservación histórica;
- validaciones entre capacidades;
- autorización contextual mediante permisos conceptuales de M02;
- aislamiento entre Negocios;
- protección conceptual frente a concurrencia;
- auditoría conceptual de cambios relevantes.

La edición de un artículo `INACTIVO` está permitida para corregir o preparar su configuración, pero **no lo reactiva automáticamente**.

La reactivación evalúa la configuración vigente ya confirmada y, si es válida, realiza exclusivamente la transición:

```text
INACTIVO → ACTIVO
```

La edición y la reactivación no forman una única operación implícita.

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

M01 define los roles generales:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

M02 no congela todavía una matriz exhaustiva `Rol → Permiso` para cada operación del catálogo.

La regla funcional estable es:

```text
Usuario autenticado
+
Negocio identificado
+
UsuarioNegocio ACTIVO
+
permiso conceptual requerido por la operación
+
recurso perteneciente al mismo Negocio
```

La asignación concreta de permisos a `PROPIETARIO`, `ENCARGADO` y `TRABAJADOR` podrá refinarse posteriormente sin modificar las invariantes de las entidades.

---

## 3.1. Propietario

Conceptualmente representa el rol con mayor capacidad administrativa dentro del Negocio.

Puede esperarse que concentre las operaciones administrativas sensibles de M02.

La eliminación física de un `ArticuloCatalogo` queda reservada al `PROPIETARIO` en el MVP y además exige que el artículo esté `INACTIVO` y no posea historia, referencias ni dependencias que deban conservarse.

Fuera de esa regla explícita, este documento evita congelar una tabla completa de permisos por rol.

---

## 3.2. Encargado

Conceptualmente posee capacidad operativa avanzada.

M02 no congela todavía qué operaciones concretas de creación, edición, desactivación o reactivación se asignarán definitivamente a este rol.

La autorización se expresa mediante permisos conceptuales del caso de uso y no mediante comparaciones rígidas del tipo:

```text
rol == ENCARGADO
```

---

## 3.3. Trabajador

Conceptualmente posee acceso operativo mínimo según las necesidades del negocio.

Puede consultar la información necesaria para trabajar, sujeto al contexto autorizado.

La posibilidad de ejecutar mutaciones específicas de M02 no se define aquí mediante una matriz rígida.

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
permiso conceptual concreto de M02
+
recurso perteneciente al mismo Negocio
```

No debe confiarse como mecanismo de autorización en:

```text
rol enviado por frontend
negocioId arbitrario enviado por cliente
botones ocultos en UI
```

El contexto de Negocio debe ser confiable y las consultas deben realizarse preferentemente con alcance de tenant, por ejemplo:

```text
buscarPorIdEnNegocio(...)
```

No se modelará RBAC dinámico durante el MVP.

La abstracción de autorización utilizada en diagramas de secuencia es conceptual y **no obliga** a implementar una clase concreta con ese nombre.

---

## 3.5. Terminología `activar` / `reactivar`

En UX puede aparecer:

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

Editar un artículo `INACTIVO` no constituye reactivación y no modifica su estado.

# 4. Modelo Conceptual

```text
Negocio
  │
  ├── 0..* Categoria
  │
  └── 0..* ArticuloCatalogo
                │
                ├── 1 CapacidadesArticulo
                └── 0..3 referencias de imagen
```

Reglas:

- cada `ArticuloCatalogo` pertenece a exactamente un Negocio;
- cada `Categoria` pertenece a exactamente un Negocio;
- `UnidadMedida` pertenece a un catálogo normalizado global;
- un artículo puede tener entre 0 y 3 imágenes;
- si existen imágenes, exactamente una se identifica como principal;
- no pueden mezclarse recursos de Negocios distintos;
- la representación física de las imágenes no se congela en M02.

`PropuestaEdicionDTO` y `propuestaEdicionPreparada` pertenecen al flujo de aplicación de edición y **no son entidades persistentes del modelo conceptual**.

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
Imágenes [0..3]
  └── exactamente una principal si N > 0

Precio base [0..1]
Costo de referencia [0..1]

CapacidadesArticulo

EstadoArticulo
```

Identidad y `TipoArticulo` no forman parte de una edición normal.

---

## 5.3. Nombre y Unicidad Funcional

El nombre:

```text
NO es identidad técnica
```

pero debe ser funcionalmente único dentro de un mismo Negocio.

La unicidad considera:

```text
ACTIVO
+
INACTIVO
```

Por lo tanto, un artículo `INACTIVO` continúa reservando su nombre.

Si se desea utilizar ese mismo nombre, debe reutilizarse o renombrarse el artículo existente, o eliminarse físicamente únicamente cuando las reglas de eliminación segura lo permitan.

La equivalencia funcional del nombre debe ser compartida por todo el catálogo.

No se congela todavía el algoritmo concreto de normalización:

```text
trim
case folding
Unicode
acentos
espacios internos
```

La persistencia deberá poder proteger esta unicidad frente a concurrencia.

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

La existencia de estos flags en el dominio **no implica** que la interfaz de usuario deba exponerlos directamente como controles técnicos.

La UI puede presentar preguntas o conceptos comerciales comprensibles y Application/Domain traducirlos a una configuración coherente.

---

## 8.1. CapacidadesArticulo es un Value Object inmutable

`CapacidadesArticulo`:

```text
NO posee identidad propia
NO usa setters parciales
NO muta flags existentes
NO aplica auto-fixes silenciosos
NO interpreta por sí solo la intención del Caso de Uso
NO consulta repositories
```

Flujo conceptual cuando una edición realmente modifica capacidades:

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

Si una edición no modifica ninguna configuración que afecte capacidades, se conservan las `CapacidadesArticulo` actuales; no deben reconstruirse innecesariamente.

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

# 14. Evolución de UnidadMedida

`UnidadMedida` puede modificarse para la configuración vigente y las operaciones futuras.

La regla histórica es:

```text
cambiar UnidadMedida actual
≠
reescribir cantidades/unidades históricas
```

Ejemplo:

```text
Harina
Unidad actual anterior = KG
Compra histórica = 5 KG

Posteriormente:
Unidad actual = G
```

La compra histórica continúa siendo:

```text
5 KG
```

No debe recalcularse retroactivamente como si siempre hubiese utilizado la nueva unidad.

Algunos cambios pueden requerir validaciones adicionales cuando existan dependencias operativas en módulos como Inventario, Compras o Producción.

Especialmente, cambios entre dimensiones incompatibles:

```text
KG → UNIDAD
L → HORA
```

no deben aplicarse silenciosamente cuando el estado operativo actual haga que el cambio sea incoherente.

M02 no congela todavía:

- biblioteca de conversiones;
- reglas completas de compatibilidad dimensional;
- migraciones de stock;
- conversiones históricas automáticas;
- contratos concretos con módulos futuros.

La existencia de historia, por sí sola, **no obliga a bloquear para siempre** el cambio de unidad.

Cada operación histórica deberá preservar su propia unidad y cantidad originales.

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

M02 rechaza precios negativos.

El valor:

```text
0
```

no viola por sí solo la invariante local de M02.

Sin embargo, la **semántica comercial definitiva** de vender normalmente un artículo con precio base cero se resolverá al diseñar M05 Ventas y el mecanismo de promociones/bonificaciones.

Por lo tanto:

```text
precio_base = 0
```

no debe utilizarse anticipadamente como sustituto técnico de:

- promociones;
- descuentos del 100%;
- 2x1 / 2x3;
- bonificaciones;
- adicionales gratuitos.

Cambiar `precio_base`:

- afecta la referencia vigente hacia futuro;
- no modifica ventas históricas;
- no modifica ni destruye promociones existentes.

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

# 22. Imágenes del Artículo

Para el MVP un `ArticuloCatalogo` admite:

```text
0..3 imágenes
```

Las imágenes son opcionales.

Si:

```text
N = 0
```

no existe imagen principal.

Si:

```text
N > 0
```

debe existir:

```text
exactamente 1 imagen principal
```

La imagen principal puede utilizarse en vistas compactas, por ejemplo:

- listados;
- selector de artículos;
- carrito;
- resumen de una venta.

Las imágenes secundarias permiten mostrar información adicional del artículo al Usuario o cliente.

La regla:

```text
0..3
+
exactamente una principal si existen imágenes
```

es una invariante funcional de M02 y no debe quedar protegida solamente por la interfaz.

No se congela todavía:

- S3;
- Cloudinary;
- filesystem;
- CDN;
- URL;
- blobs;
- formato físico de almacenamiento;
- estrategia de thumbnails.

La carga o eliminación física de archivos pertenece a Arquitectura.

Una edición no debe ejecutar efectos externos irreversibles inseguros antes de que el cambio lógico pueda confirmarse correctamente.

Una futura implementación podrá introducir un Value Object como colección de imágenes si resulta útil, pero M02 no obliga todavía a una clase concreta.

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

Puede editarse administrativamente.

Una edición válida sobre un artículo `ACTIVO`:

```text
ACTIVO → ACTIVO
```

no constituye una transición de `EstadoArticulo`; simplemente conserva el estado.

Si la configuración propuesta dejaría de cumplir las invariantes necesarias para continuar `ACTIVO`, la edición se rechaza.

No debe desactivarse automáticamente.

---

## 24.2. INACTIVO

No se ofrece normalmente en selectores de nuevas operaciones.

Continúa disponible para:

- historia;
- reportes;
- auditoría;
- consultas;
- edición administrativa;
- reactivación.

Puede conservar cero usos operativos.

### Regla MVP — Edición Administrativa Permitida

Mientras permanezca `INACTIVO` pueden corregirse o prepararse, según las reglas correspondientes:

- nombre;
- descripción;
- SKU;
- precio;
- costo de referencia;
- imágenes;
- Categoria;
- UnidadMedida;
- configuración/capacidades permitidas.

La edición:

```text
INACTIVO
→ editar
→ INACTIVO
```

NO reactiva automáticamente el artículo.

Primero debe confirmarse exitosamente la edición completa.

Luego, en una operación separada, puede solicitarse:

```text
reactivarArticulo
```

La reactivación vuelve a validar que la configuración vigente permita pasar a `ACTIVO`.

# 25. Desactivación

Transición:

```text
ACTIVO → INACTIVO
```

Requiere:

```text
Usuario autenticado
+
UsuarioNegocio ACTIVO
+
mismo Negocio
+
permiso conceptual para desactivar
```

La matriz exacta `Rol → Permiso` no se congela todavía.

Desactivar conserva:

- identidad;
- nombre;
- descripción;
- TipoArticulo;
- UnidadMedida;
- SKU;
- precio;
- costo;
- imágenes;
- Categoria;
- CapacidadesArticulo;
- referencias;
- historia.

NO:

- libera SKU;
- libera nombre;
- pone capacidades en false;
- borra precio;
- modifica stock;
- borra lotes;
- borra movimientos;
- consulta stock desde la entidad para decidir.

Regla:

```text
stock > 0
NO impide por sí solo desactivar
```

Desactivar no impide posteriores ediciones administrativas del artículo `INACTIVO`.

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

La reactivación es un **Caso de Uso explícito y separado de la edición**.

---

## 26.1. Preparación previa

Si un artículo `INACTIVO` necesita correcciones antes de volver a utilizarse:

```text
INACTIVO
        ↓
EditarArticulo
        ↓
confirmar cambios
        ↓
INACTIVO
        ↓
ReactivarArticulo
        ↓
ACTIVO
```

Editar y reactivar no se fusionan implícitamente.

Una edición exitosa nunca cambia por sí sola el estado.

---

## 26.2. Reactivación

Requiere:

```text
ArticuloCatalogo.estado = INACTIVO
+
Usuario autenticado
+
UsuarioNegocio ACTIVO
+
mismo Negocio
+
permiso conceptual de reactivación
```

La matriz exacta `Rol → Permiso` permanece abierta.

La reactivación utiliza la configuración **ya confirmada** del artículo.

No recibe un payload libre para modificar simultáneamente nombre, precio, SKU, Categoria, imágenes, unidad o capacidades.

Si la configuración vigente no permite un `ACTIVO` válido:

```text
RECHAZAR reactivación
```

El artículo permanece `INACTIVO`.

El Usuario deberá corregir primero la configuración mediante `EditarArticulo` y luego volver a solicitar la reactivación.

---

## 26.3. Revalidación

Antes de confirmar:

```text
INACTIVO → ACTIVO
```

revalidar como mínimo:

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

Una `Categoria` históricamente asociada que luego quedó `INACTIVA` no bloquea por sí sola la reactivación, salvo que la operación intente asignar/reasignar una nueva Categoria inactiva.

---

## 26.4. Separación de responsabilidades

No implementar:

```text
reactivar(payloadDeEdicion)
```

como bypass de `EditarArticulo`.

La regla es:

```text
editar
≠
reactivar
```

Esto mantiene:

- intención explícita;
- auditoría clara;
- validaciones comprensibles;
- ausencia de cambios ocultos de estado.

# 27. Eliminación Física

`eliminarFisicamente()`:

```text
NO es EstadoArticulo
NO crea ELIMINADO
NO es transición de la máquina de estados
```

Es una operación administrativa excepcional.

Para el MVP solo puede solicitarla un:

```text
PROPIETARIO
```

y únicamente cuando el artículo se encuentra:

```text
INACTIVO
```

Aun cumpliendo esas condiciones, solo puede confirmarse si:

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

Si el artículo continúa `ACTIVO` y se desea retirarlo:

```text
desactivar
```

primero.

La ausencia de dependencias debe revalidarse al confirmar.

Si el borrado se confirma:

```text
SKU actual queda disponible
nombre actual deja de estar reservado
```

No asumir que estar `INACTIVO` es suficiente para permitir hard delete.

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
Precio / datos comerciales necesarios
       ↓
Categoria / SKU / imágenes opcionales
       ↓
Guardar
```

Evitar formularios técnicos extensos.

La creación puede ofrecer hasta 3 imágenes, marcando exactamente una como principal cuando se cargue al menos una.

La interfaz no debe obligar al Usuario a comprender directamente todos los flags internos de `CapacidadesArticulo`.

`TipoArticulo` queda fijado al crear y es inmutable posteriormente.

La creación debe proteger también la unicidad funcional de nombre y SKU dentro del Negocio.

# 29. Configuración Inteligente de Interfaz

La interfaz debe expresar conceptos comerciales comprensibles y evitar exponer innecesariamente detalles internos.

Por ejemplo, puede preguntar:

```text
¿Se vende?
¿Se compra a proveedores?
¿Querés controlar existencias?
¿Se usa para producir otros artículos?
¿Tiene vencimiento?
¿Puede participar de descuentos?
```

sin obligar a que la UI refleje literalmente los nombres internos del dominio.

Si:

```text
tipo = SERVICIO
```

no ofrecer normalmente opciones incompatibles con el modelo:

```text
controlar stock
controlar vencimiento
usar en producción
```

Si:

```text
es_vendible = False
```

no permitir una configuración final con:

```text
permite_descuento = True
```

UX previene errores.

Domain garantiza invariantes.

Las capacidades técnicas pueden derivarse de decisiones comerciales; el operador no debe necesitar conocer la implementación interna.

# 30. Requisitos Funcionales

| ID | Título | Actor principal | Criterio principal |
| --- | --- | --- | --- |
| RF-CAT-001 | Consultar catálogo | Miembro autorizado | Solo recursos del Negocio autorizado. |
| RF-CAT-002 | Buscar y filtrar | Miembro autorizado | Búsqueda limitada al Negocio. |
| RF-CAT-003 | Consultar artículo | Miembro autorizado | Visualización de datos pertinentes. |
| RF-CAT-004 | Crear Categoria | Miembro con permiso correspondiente | ACTIVA, mismo Negocio, nombre no equivalente. |
| RF-CAT-005 | Editar Categoria | Miembro con permiso correspondiente | Preserva identidad y unicidad. |
| RF-CAT-006 | Desactivar/reactivar Categoria | Miembro con permiso correspondiente | No altera artículos asociados. |
| RF-CAT-007 | Eliminar Categoria | Miembro con permiso correspondiente | Solo sin asociaciones/dependencias. |
| RF-CAT-008 | Consultar unidades | Miembro autorizado | Lista normalizada. |
| RF-CAT-009 | Crear artículo | Miembro con permiso de creación | Crea ACTIVO con configuración válida y nombre/SKU disponibles. |
| RF-CAT-010 | Editar artículo | Miembro con permiso `EDITAR_CATALOGO` | Puede editar ACTIVO o INACTIVO; estado no cambia; todo-o-nada. |
| RF-CAT-011 | Desactivar artículo | Miembro con permiso de desactivación | ACTIVO→INACTIVO conservando configuración e historia. |
| RF-CAT-012 | Reactivar artículo | Miembro con permiso de reactivación | INACTIVO→ACTIVO solo si la configuración vigente es válida. |
| RF-CAT-013 | Separar edición y reactivación | Sistema | Editar INACTIVO no activa; reactivar no incorpora un payload libre de edición. |
| RF-CAT-014 | Eliminar artículo no utilizado | Propietario | Solo INACTIVO y sin historia/referencias/dependencias. |
| RF-CAT-015 | Administrar precio base | Miembro con permiso de edición | Aplica hacia futuro; no reescribe historia ni promociones existentes. |
| RF-CAT-016 | Administrar costo | Miembro con permiso de edición | No reescribe historia. |
| RF-CAT-017 | Administrar capacidades | Miembro con permiso de edición | Configuración final válida; VO sin auto-fix. |
| RF-CAT-018 | Administrar imágenes | Miembro con permiso de edición | 0..3; si existen, exactamente una principal. |
| RF-CAT-019 | Validar pertenencia | Sistema | Aislamiento estricto por Negocio. |
| RF-CAT-020 | Administrar SKU | Miembro con permiso de edición | `""→null`; único por Negocio ACTIVO+INACTIVO. |
| RF-CAT-021 | Preservar Tipo | Sistema | TipoArticulo inmutable. |
| RF-CAT-022 | Administrar UnidadMedida | Miembro con permiso de edición | Cambio aplica hacia futuro; historia conserva unidad/cantidad originales. |
| RF-CAT-023 | Confirmar guardias contextuales | Sistema | Preconsulta no reemplaza confirmación. |
| RF-CAT-024 | Autorizar mutaciones | Sistema | Usuario+Negocio+Membresía ACTIVA+permiso conceptual. |
| RF-CAT-025 | Editar artículo INACTIVO | Miembro con permiso `EDITAR_CATALOGO` | Puede corregirse/configurarse sin cambiar su estado. |
| RF-CAT-026 | Proteger nombre funcional | Sistema | Nombre único por Negocio considerando ACTIVO+INACTIVO. |
| RF-CAT-027 | Aplicar edición atómica | Sistema | La propuesta completa se valida antes de mutar; fallo => nada confirmado. |
| RF-CAT-028 | Detectar concurrencia | Sistema | No permite lost update ni duplicidades concurrentes de nombre/SKU. |
| RF-CAT-029 | Preservar auditoría de edición | Sistema | Debe poder atribuir quién, cuándo, qué artículo y qué cambió. |

# 31. Reglas de Negocio

## RN-CAT-001 — Pertenencia al Negocio
Todo artículo pertenece a exactamente un Negocio.

## RN-CAT-002 — Categoria del Mismo Negocio
Si existe Categoria asociada, pertenece al mismo Negocio.

## RN-CAT-003 — Tipo Obligatorio
Todo artículo posee exactamente un `TipoArticulo`: BIEN o SERVICIO.

## RN-CAT-004 — SERVICIO sin Inventario
SERVICIO implica `controlaStock = false`, `controlaVencimiento = false` y `puedeUsarseEnProduccion = false`.

## RN-CAT-005 — Bypass de Inventario
Si no controla stock, M02 no genera hechos de inventario.

## RN-CAT-006 — Vencimiento Requiere Stock
`controlaVencimiento = true` implica BIEN + `controlaStock = true`.

## RN-CAT-007 — Producción Requiere BIEN con Stock
`puedeUsarseEnProduccion = true` implica BIEN + `controlaStock = true`.

## RN-CAT-008 — Descuento Requiere Venta
`permiteDescuento = true` implica `esVendible = true`.

Una combinación descuento=True + vendible=False se rechaza.

## RN-CAT-009 — Uso Operativo Mínimo
ACTIVO exige `esComprable OR esVendible OR puedeUsarseEnProduccion`.

INACTIVO puede conservar los tres en False.

## RN-CAT-010 — Unidad Obligatoria para BIEN
Todo BIEN posee `UnidadMedida` válida.

## RN-CAT-011 — Unidad de SERVICIO
Todo SERVICIO posee `UnidadMedida`; valor inicial recomendado `UNIDAD` salvo otra válida.

## RN-CAT-012 — Precio Base Válido
Si `esVendible = true`: `precioBase` existe y `precioBase >= 0`.

M02 no define todavía la semántica comercial definitiva de una venta normal con precio base cero.

## RN-CAT-013 — Costo de Referencia
Es opcional; si existe, debe ser `>= 0`.

## RN-CAT-014 — Precio no Reescribe Historia
Cambiar precio actual no modifica operaciones previas ni promociones existentes.

## RN-CAT-015 — Costo no Reescribe Historia
Cambiar costo actual no modifica operaciones previas.

## RN-CAT-016 — SKU Opcional y Único
SKU es opcional y único por Negocio entre artículos ACTIVOS e INACTIVOS.

Desactivar no libera SKU.

## RN-CAT-017 — Nombre no es Identidad
El nombre no es clave técnica ni identidad del artículo.

## RN-CAT-018 — Categoria Opcional
`ArticuloCatalogo` puede existir sin Categoria.

## RN-CAT-019 — Categoria INACTIVA
No desactiva artículos; conserva asociaciones existentes; no admite nuevas asociaciones ni reasignaciones.

## RN-CAT-020 — Conservación Histórica
Modificar M02 no reescribe operaciones anteriores.

## RN-CAT-021 — Eliminación Segura
Hard delete es excepcional, solo para artículo INACTIVO, solicitado por PROPIETARIO y sin historia, referencias ni dependencias; revalidar al confirmar.

## RN-CAT-022 — Reactivación
`INACTIVO → ACTIVO` reutiliza la misma entidad y revalida invariantes.

## RN-CAT-023 — Artículo INACTIVO
No participa normalmente en nuevas operaciones; sigue disponible para historia, consulta, edición administrativa y reactivación.

## RN-CAT-024 — Variantes Independientes
MVP representa variantes como artículos diferentes.

## RN-CAT-025 — Imágenes del Artículo
Un artículo admite 0..3 imágenes. Si existen imágenes, exactamente una debe ser principal.

## RN-CAT-026 — Cantidades Fraccionarias
El dominio admite cantidades fraccionarias.

## RN-CAT-027 — Moneda del Negocio
Los importes usan `monedaBase` de Negocio.

## RN-CAT-028 — Autorización por Permiso Conceptual
Toda mutación exige contexto autorizado y permiso conceptual específico.

La matriz completa `Rol → Permiso` no queda congelada en M02, excepto las restricciones explícitas definidas para operaciones sensibles como hard delete.

## RN-CAT-029 — Sin Listas de Precios
MVP utiliza un único `precioBase` actual por artículo.

## RN-CAT-030 — Trazabilidad
Cambios relevantes deben poder asociarse a Usuario, artículo, cambios confirmados y momento.

## RN-CAT-031 — Tipo Inmutable
BIEN/SERVICIO no cambia después de crear.

## RN-CAT-032 — Evolución de UnidadMedida
Cambiar la unidad vigente aplica hacia futuro.

Las operaciones históricas conservan la unidad y cantidad originales.

Las dependencias operativas que puedan impedir un cambio se definirán con los módulos consumidores.

## RN-CAT-033 — Deshabilitar Venta
El Caso de Uso debe construir una nueva configuración coherente con `esVendible=false` y `permiteDescuento=false`. Se conserva `precioBase`.

## RN-CAT-034 — Nombre Único de Categoria
Unicidad funcional por Negocio, incluyendo ACTIVA/INACTIVA.

## RN-CAT-035 — Modificación de SKU
A→B, A→null, null→B y A→A siguen la política definida en §21.

## RN-CAT-036 — Capacidades Comerciales/Estructurales
Cambios estructurales pueden requerir evaluar dependencias reales en módulos consumidores.

## RN-CAT-037 — Capacidades son Elegibilidades
No son stock, ventas, compras, lotes ni recetas.

## RN-CAT-038 — Guardias Contextuales
Preconsulta no garantiza confirmación; la operación debe proteger invariantes relevantes al confirmar.

## RN-CAT-039 — Estado Actual vs Historia
M02 representa configuración vigente; módulos consumidores preservan historia.

## RN-CAT-040 — Autorización Contextual
Toda mutación valida Usuario autenticado + Negocio + UsuarioNegocio ACTIVO + permiso + tenant.

## RN-CAT-041 — Edición Permitida en ACTIVO e INACTIVO
`ArticuloCatalogo` puede editarse administrativamente en estado ACTIVO o INACTIVO.

La edición no cambia automáticamente `EstadoArticulo`.

## RN-CAT-042 — Edición y Reactivación Separadas
Editar un INACTIVO primero confirma su nueva configuración y lo deja INACTIVO.

La reactivación es una operación posterior e independiente.

## RN-CAT-043 — CapacidadesArticulo Inmutable sin Auto-Fix
El VO acepta o rechaza una configuración completa. No muta flags ni corrige combinaciones inválidas silenciosamente.

## RN-CAT-044 — Ausencia Canónica de SKU
La ausencia se representa como null. Input `""` o solo espacios se normaliza a null antes de validar/persistir.

## RN-CAT-045 — Reactivación sin Payload Libre de Edición
`ReactivarArticulo` utiliza la configuración vigente ya confirmada.

Si no permite un ACTIVO válido, la reactivación se rechaza y el artículo debe editarse previamente mediante `EditarArticulo`.

## RN-CAT-046 — Activar y Reactivar
Para un artículo histórico INACTIVO, “activar” en UX mapea a la misma transición semántica `INACTIVO→ACTIVO`; no existe un ciclo distinto.

## RN-CAT-047 — Nombre Funcionalmente Único de Artículo
El nombre de `ArticuloCatalogo` debe ser funcionalmente único dentro del Negocio, considerando ACTIVOS e INACTIVOS.

Un INACTIVO continúa reservando su nombre.

La estrategia exacta de normalización permanece abierta.

## RN-CAT-048 — Edición Parcial de Entrada, Atómica al Confirmar
La entrada puede expresar solo los campos que cambian y debe distinguir campo omitido de `null` explícito.

La edición completa se confirma todo-o-nada.

## RN-CAT-049 — Validar Antes de Mutar
`ArticuloCatalogo` debe validar la propuesta completa antes de consolidar cualquier mutación observable.

No modelar “mutar y luego revertir manualmente”.

## RN-CAT-050 — Edición Encapsulada
La edición compuesta debe realizarse mediante comportamiento de dominio coherente, conceptualmente:

```text
ArticuloCatalogo.aplicarEdicion(propuestaEdicionPreparada)
```

No utilizar una secuencia pública de setters indiscriminados para implementar el caso de uso.

## RN-CAT-051 — DTO de Aplicación no Cruza al Dominio
`PropuestaEdicionDTO` pertenece a Application/API.

Domain recibe una estructura preparada e independiente del transporte.

## RN-CAT-052 — Unicidad y Concurrencia
Los prechecks de nombre y SKU mejoran UX pero no sustituyen la defensa final de persistencia.

Debe impedirse la confirmación concurrente de duplicidades y lost updates.

## RN-CAT-053 — Categoria y Concurrencia
Si una Categoria utilizada por una edición deja de ser válida concurrentemente, la edición no debe confirmarse silenciosamente.

## RN-CAT-054 — Efectos Externos de Imágenes
El lifecycle físico de archivos no debe generar efectos irreversibles inseguros antes de que la edición lógica pueda confirmarse.

## RN-CAT-055 — Promociones Independientes del Precio Base
Cambiar `precioBase` no modifica ni elimina promociones existentes.

El cálculo del precio efectivo pertenece a M05/Promociones.

## RN-CAT-056 — Estado Inalterado por Edición
Editar ACTIVO lo mantiene ACTIVO si la configuración resultante es válida.

Editar INACTIVO lo mantiene INACTIVO.

## RN-CAT-057 — Auditoría Conceptual de Edición
Una edición confirmada debe permitir reconstruir, como mínimo:

```text
quién
cuándo
qué artículo
qué cambios se confirmaron
```

sin imponer todavía una tecnología concreta de auditoría.

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

Actor: Miembro con permiso administrativo correspondiente.

Incluye:

- crear;
- editar;
- desactivar;
- reactivar;
- eliminar cuando no existan dependencias.

No modificar artículos automáticamente al cambiar estado de Categoria.

---

## CU-CAT-04 — Crear Artículo

Actor: Miembro con permiso de creación de catálogo.

Flujo:

1. seleccionar `Nuevo`;
2. elegir BIEN/SERVICIO;
3. ingresar nombre;
4. validar unicidad funcional del nombre dentro del Negocio;
5. seleccionar Categoria opcional ACTIVA del mismo Negocio;
6. seleccionar UnidadMedida;
7. expresar usos/configuración comercial;
8. ingresar precio si vendible;
9. ingresar costo/SKU/descripción opcionales;
10. opcionalmente cargar 0..3 imágenes y definir exactamente una principal si existen;
11. normalizar SKU vacío a null;
12. construir `CapacidadesArticulo` completo cuando corresponda;
13. rechazar configuración local inválida;
14. validar guardias contextuales;
15. confirmar;
16. crear `ACTIVO`.

`TipoArticulo` queda inmutable después de crear.

---

## CU-CAT-05 — Editar Artículo

Actor: Miembro con permiso conceptual:

```text
EDITAR_CATALOGO
```

Puede aplicarse sobre:

```text
ACTIVO
o
INACTIVO
```

La edición nunca cambia implícitamente el estado.

### Entrada parcial

Application recibe una propuesta parcial que diferencia:

```text
campo omitido
→ conservar valor actual

campo = null
→ quitar/desasociar cuando el campo lo permite
```

Ejemplos:

```text
Categoria omitida → conservar
Categoria = null  → quitar

SKU omitido → conservar
SKU = null   → quitar
```

### Campos editables

Puede modificarse, sujeto a sus invariantes:

- nombre;
- descripción;
- Categoria;
- SKU;
- imágenes;
- precio base;
- costo de referencia;
- capacidades/configuración permitida;
- UnidadMedida.

No puede modificarse:

```text
identidad
TipoArticulo
```

### Preparación en Application

Application:

1. obtiene Usuario y Negocio desde contexto confiable;
2. autoriza mediante permiso conceptual;
3. carga el artículo con tenant scoping;
4. normaliza entrada;
5. resuelve Categoria si cambia;
6. pre-valida unicidad funcional de nombre;
7. pre-valida SKU;
8. pre-valida imágenes y valores comerciales;
9. construye `propuestaEdicionPreparada`.

`PropuestaEdicionDTO` no ingresa directamente al dominio.

### Aplicación en Domain

Conceptualmente:

```text
ArticuloCatalogo.aplicarEdicion(propuestaEdicionPreparada)
```

debe:

```text
validar toda la propuesta
        ↓
si falla
→ rechazar SIN mutación observable
        ↓
si pasa
→ aplicar todos los cambios coherentemente
```

No implementar el caso de uso como una cadena de setters públicos independientes.

### Atomicidad

La entrada puede ser parcial.

La confirmación no:

```text
TODO
o
NADA
```

Si cualquier validación, unicidad, persistencia o conflicto concurrente falla:

```text
ninguna modificación queda confirmada
```

### Estado

Si estaba:

```text
ACTIVO
```

permanece `ACTIVO` únicamente si la configuración resultante cumple sus invariantes.

Si estaba:

```text
INACTIVO
```

permanece `INACTIVO`.

La reactivación es otro Caso de Uso.

### Historia

La edición cambia configuración vigente hacia futuro.

No reescribe:

- ventas;
- compras;
- recetas;
- producciones;
- movimientos;
- precios históricos;
- costos históricos;
- cantidades/unidades históricas.

---

## CU-CAT-06 — Desactivar / Reactivar Artículo

### Desactivar

Actor: Miembro con permiso conceptual de desactivación.

Requiere artículo ACTIVO.

Confirma:

```text
ACTIVO → INACTIVO
```

sin modificar configuración ni hechos de otros módulos.

### Reactivar

Actor: Miembro con permiso conceptual de reactivación.

Requiere artículo INACTIVO.

Utiliza la configuración vigente ya confirmada.

Si satisface invariantes:

```text
INACTIVO → ACTIVO
```

Si no las satisface:

```text
RECHAZAR
```

y permanece `INACTIVO`.

No aceptar un payload libre de edición dentro de la reactivación.

Si necesita cambios:

```text
EditarArticulo
→ confirmar
→ sigue INACTIVO
→ ReactivarArticulo
```

---

## CU-CAT-07 — Eliminar Artículo

Actor: PROPIETARIO.

Precondición:

```text
ArticuloCatalogo INACTIVO
```

Flujo:

1. preconsulta opcional para UX;
2. revalidar historia/referencias/dependencias al confirmar;
3. eliminar solo si ninguna debe conservarse;
4. liberar SKU al confirmar;
5. liberar el nombre para una futura creación al confirmar.

Hard delete no es `EstadoArticulo`.

Estar INACTIVO no basta por sí solo para permitir la eliminación.

# 33. Historias de Usuario

## HU-CAT-001 — Crear BIEN
Como miembro autorizado, quiero crear un bien con pocos datos para incorporarlo rápidamente.

## HU-CAT-002 — Crear SERVICIO
Como miembro autorizado, quiero registrar prestaciones sin opciones de inventario incompatibles.

## HU-CAT-003 — Combinar Usos
Como miembro autorizado, quiero definir cómo utiliza el Negocio un artículo sin tener que comprender flags técnicos internos.

## HU-CAT-004 — Organizar con Categorias
Como miembro autorizado, quiero organizar el catálogo sin duplicar Categorias.

## HU-CAT-005 — Crear Rápidamente
Como pequeño comerciante, quiero evitar formularios técnicos extensos.

## HU-CAT-006 — Cambiar Precio sin Alterar Historia
Como miembro autorizado, quiero cambiar el precio actual sin modificar ventas anteriores ni destruir promociones vigentes.

## HU-CAT-007 — Retirar sin Borrar Historia
Como miembro autorizado, quiero desactivar artículos conservando toda su información histórica.

## HU-CAT-008 — Buscar Rápidamente
Como miembro, quiero localizar artículos con agilidad.

## HU-CAT-009 — Gestionar SKU
Como miembro autorizado, quiero administrar el SKU actual manteniendo su unicidad contextual.

## HU-CAT-010 — Reactivar de Forma Segura
Como miembro autorizado, quiero reutilizar la misma identidad al reactivar un artículo.

## HU-CAT-011 — Preparar un INACTIVO antes de Reactivar
Como miembro autorizado, quiero editar un artículo INACTIVO, confirmar las correcciones y reactivarlo luego mediante una acción separada.

## HU-CAT-012 — Administrar Imágenes
Como miembro autorizado, quiero cargar hasta tres imágenes y definir una principal para mostrar correctamente el artículo.

## HU-CAT-013 — Evitar Sobrescrituras
Como usuario que edita catálogo, quiero que una modificación concurrente incompatible produzca conflicto en lugar de sobrescribir silenciosamente cambios de otro usuario.

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

Editar un artículo:

```text
ACTIVO   → editar → ACTIVO
INACTIVO → editar → INACTIVO
```

NO constituye transición de `EstadoArticulo`.

Hard delete:

```text
NO es estado
```

Reactivar es siempre una operación explícita:

```text
INACTIVO → ACTIVO
```

y no una consecuencia implícita de editar.

# 35. Excepciones y Errores Funcionales

| Condición | Efecto esperado |
| --- | --- |
| Nombre faltante | Rechazar. |
| Nombre funcionalmente duplicado en el mismo Negocio | Rechazar, incluyendo conflicto con INACTIVO. |
| BIEN sin unidad | Rechazar. |
| Vendible sin precio | Rechazar. |
| Precio negativo | Rechazar. |
| Costo negativo | Rechazar. |
| SERVICIO con stock/vencimiento/producción | Rechazar. |
| Producción sin stock | Rechazar. |
| Vencimiento sin stock | Rechazar. |
| Descuento sin venta | Rechazar VO; no auto-corregir. |
| Edición deja ACTIVO con 0 usos | Rechazar; no desactivar automáticamente. |
| SKU `""` o solo espacios | Normalizar a null. |
| SKU duplicado ACTIVO/INACTIVO | Rechazar. |
| Categoria INACTIVA para nueva asociación | Rechazar. |
| Categoria de otro Negocio | Rechazar. |
| Categoria válida en precheck pero invalidada concurrentemente antes de confirmar | Rechazar/conflicto; no confirmar asociación inválida. |
| Cambiar BIEN↔SERVICIO | Rechazar. |
| Más de 3 imágenes | Rechazar. |
| Existen imágenes pero no hay exactamente una principal | Rechazar. |
| Edición válida de artículo INACTIVO | Aceptar cambios y mantener INACTIVO. |
| Reactivar ACTIVO | Rechazar no-op silencioso. |
| Desactivar INACTIVO | Rechazar no-op silencioso. |
| Reactivar INACTIVO con configuración actual inválida | Rechazar; mantener INACTIVO; editar previamente. |
| Reactivación intenta incluir payload libre de edición | Rechazar/separar responsabilidades. |
| Eliminación física sobre artículo ACTIVO | Rechazar; primero desactivar. |
| Eliminación física solicitada por actor no permitido | Rechazar. |
| Eliminar con historia/referencias/dependencias | Rechazar. |
| Dos usuarios editan la misma versión lógica y uno confirma primero | El segundo no debe sobrescribir silenciosamente; devolver conflicto funcional/técnico apropiado. |
| Nombre/SKU queda duplicado por concurrencia | Rechazar una de las confirmaciones. |
| Guardia cambia entre preconsulta/confirmación | Rechazar/reintentar sin estado inválido. |
| Nueva operación usa artículo desactivado concurrentemente | Revalidar y rechazar según módulo consumidor. |
| Falla almacenamiento externo de imagen o persistencia | Evitar quedar con referencias/archivos en estado incoherente mediante estrategia arquitectónica segura. |

Mensajes exactos, códigos HTTP y clases de excepción pertenecen a UX/API/Arquitectura.

# 36. Interacción con Otros Módulos

## M01
Provee Usuario, Negocio, UsuarioNegocio y Rol para autorización contextual.

M02 consume el contexto autorizado, pero no congela por sí solo la matriz completa `Rol → Permiso`.

## M03
Utilizará `esComprable`.

Compras históricas deberán preservar cantidades, unidades y costos necesarios para reconstruir la operación original.

## M04
Utilizará `controlaStock` y `controlaVencimiento`.

M02 no consulta inventario desde la entidad para desactivar.

Cambios estructurales futuros de capacidades o UnidadMedida podrán requerir guardias coordinadas con M04 cuando ese módulo sea diseñado.

## M05
Utilizará `esVendible` y `precioBase` como referencia comercial vigente.

M05 deberá preservar el precio realmente aplicado en cada operación.

Cambiar `precioBase` en M02:

```text
NO modifica promociones existentes
NO recalcula ventas históricas
```

La semántica comercial definitiva de precio cero, promociones, bonificaciones, 2x1/2x3 y descuentos efectivos pertenece a M05/Promociones.

## M07
Utilizará `puedeUsarseEnProduccion`.

Recetas no pertenecen a M02.

Cambios de configuración actual no reescriben recetas ni producciones históricas.

## M08
Puede analizar por Articulo, Categoria y Tipo, respetando la historia proveniente de los módulos fuente.

---

# 37. Matriz de Trazabilidad Resumida

| RF | RN principales | CU |
| --- | --- | --- |
| RF-CAT-009 Crear artículo | RN 003-013, 016-019, 025, 028, 031, 034, 040, 043-044, 047, 052 | CU-CAT-04 |
| RF-CAT-010 Editar artículo | RN 008-020, 025, 028, 030-033, 036-041, 043-044, 047-057 | CU-CAT-05 |
| RF-CAT-011 Desactivar | RN 023, 028, 040, 056 | CU-CAT-06 |
| RF-CAT-012 Reactivar | RN 009, 019, 022-023, 038, 040, 042, 045-046, 056 | CU-CAT-06 |
| RF-CAT-013 Separar edición/reactivación | RN 041-042, 045-046, 056 | CU-CAT-05/06 |
| RF-CAT-014 Eliminar | RN 016-017, 021, 038, 040, 047, 052 | CU-CAT-07 |
| RF-CAT-017 Capacidades | RN 004-009, 033, 036-038, 043, 050-051 | CU-CAT-04/05 |
| RF-CAT-018 Imágenes | RN 025, 048-050, 054 | CU-CAT-04/05 |
| RF-CAT-020 SKU | RN 016, 035, 038, 040, 044, 048, 052 | CU-CAT-04/05/07 |
| RF-CAT-022 UnidadMedida | RN 010-011, 032, 039 | CU-CAT-04/05 |
| RF-CAT-025 Editar INACTIVO | RN 023, 041-042, 048-050, 056 | CU-CAT-05 |
| RF-CAT-026 Nombre único | RN 017, 047, 052 | CU-CAT-04/05/07 |
| RF-CAT-027 Edición atómica | RN 048-051, 056-057 | CU-CAT-05 |
| RF-CAT-028 Concurrencia | RN 038, 052-053 | CU-CAT-04/05/06/07 |
| RF-CAT-029 Auditoría | RN 030, 057 | CU-CAT-05 |

---

# 38. Criterios de Aceptación

M02 se considera funcionalmente correcto cuando, como mínimo:

1. cada Negocio posee un catálogo aislado;
2. toda mutación valida contexto autenticado, membresía ACTIVA, permiso conceptual y tenant;
3. BIEN/SERVICIO son los únicos Tipos;
4. `TipoArticulo` es inmutable;
5. SERVICIO no controla stock, vencimiento ni producción;
6. ACTIVO exige al menos un uso operativo;
7. INACTIVO puede conservar cero usos;
8. `CapacidadesArticulo` es VO inmutable;
9. VO inválido se rechaza y no se auto-corrige;
10. si es vendible existe `precioBase >= 0`;
11. M02 no interpreta automáticamente `precioBase = 0` como promoción o gratuidad comercial;
12. deshabilitar venta conserva precio y construye configuración coherente;
13. cambiar precio no modifica promociones existentes;
14. costo opcional, si existe, es `>= 0`;
15. SKU es opcional;
16. `SKU ""` o solo espacios se normaliza a null;
17. SKU es único por Negocio entre ACTIVOS e INACTIVOS;
18. desactivar no libera SKU;
19. nombre de artículo es funcionalmente único por Negocio entre ACTIVOS e INACTIVOS;
20. un INACTIVO continúa reservando su nombre;
21. Categoria es opcional;
22. Categoria INACTIVA conserva asociaciones existentes;
23. Categoria INACTIVA no desactiva artículos;
24. nuevas asociaciones requieren Categoria ACTIVA y del mismo Negocio;
25. concurrencia no permite confirmar una asociación a Categoria que dejó de ser válida;
26. cantidades fraccionarias están soportadas;
27. cambiar UnidadMedida aplica hacia futuro;
28. historia conserva unidad y cantidad originales;
29. la existencia de historia no obliga por sí sola a bloquear para siempre todo cambio de unidad;
30. un artículo admite 0..3 imágenes;
31. si existen imágenes, exactamente una es principal;
32. las invariantes de imágenes se protegen también en Domain;
33. storage físico de imágenes no se congela en M02;
34. la edición puede aplicarse a ACTIVO o INACTIVO;
35. editar INACTIVO lo mantiene INACTIVO;
36. editar ACTIVO lo mantiene ACTIVO solo si la configuración resultante sigue siendo válida;
37. edición no constituye transición de `EstadoArticulo`;
38. reactivación es una operación separada;
39. reactivación no acepta un payload libre de edición;
40. reactivación reutiliza la misma identidad;
41. si la configuración vigente no permite ACTIVO, la reactivación se rechaza;
42. desactivar conserva configuración e historia;
43. stock >0 no bloquea por sí solo la desactivación;
44. M02 no modifica stock/lotes al desactivar;
45. hard delete no es estado;
46. hard delete requiere artículo INACTIVO;
47. hard delete está reservado a PROPIETARIO en el MVP;
48. hard delete revalida historia, referencias y dependencias;
49. `PropuestaEdicionDTO` no ingresa directamente al Domain;
50. Application construye `propuestaEdicionPreparada`;
51. entrada parcial distingue campo omitido de null explícito;
52. la entidad valida toda la propuesta antes de consolidar mutaciones observables;
53. la edición se confirma todo-o-nada;
54. no se implementa el caso de uso mediante setters públicos indiscriminados;
55. prechecks de nombre/SKU no sustituyen defensas finales de persistencia;
56. una modificación concurrente no puede producir lost update silencioso;
57. `registrarCambio()` no implica commit independiente;
58. la selección previa no garantiza elegibilidad al confirmar;
59. M02 representa configuración actual;
60. módulos consumidores preservan historia;
61. el dominio no consulta repositories directamente para guardias contextuales;
62. una edición confirmada conserva contexto suficiente para auditoría;
63. la matriz exacta de permisos por Rol permanece abierta salvo reglas explícitas;
64. capacidades técnicas no deben exponerse obligatoriamente como flags crudos al operador.

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
Unidad vigente puede evolucionar hacia futuro
Historia conserva unidad/cantidad originales

Crear artículo ACTIVO
Editar ACTIVO
Editar INACTIVO sin activarlo
Consultar
Buscar

Desactivar
Reactivar explícitamente
Edición y reactivación separadas

Precio base
Costo referencia
Precio actual no reescribe historia
Cambiar precio no modifica promociones

SKU opcional
"" / espacios → null
SKU único ACTIVO + INACTIVO

Nombre funcionalmente único ACTIVO + INACTIVO

Imágenes 0..3
Exactamente una principal si existen

CapacidadesArticulo VO inmutable
Sin auto-fixes
UI no obligada a exponer flags técnicos crudos

Edición parcial en entrada
Campo omitido != null explícito
Propuesta preparada para Domain
Validar antes de mutar
Confirmación todo-o-nada

Eliminación física excepcional
Solo PROPIETARIO
Solo INACTIVO
Solo sin historia/referencias/dependencias

Aislamiento por Negocio
Autorización por permiso conceptual
Conservación histórica
Guardias contextuales al confirmar
Protección frente a concurrencia/lost update
Auditoría conceptual
```

---

# 40. Fuera del MVP

- variantes estructuradas;
- más de 3 imágenes por artículo / galerías extensas;
- código de barras;
- importación masiva;
- catálogo público completo;
- e-commerce completo;
- múltiples listas de precios;
- historial avanzado de precios dentro de M02;
- jerarquía de Categorias;
- unidades personalizadas;
- atributos dinámicos;
- combos;
- conversión histórica automática;
- historial/alias permanente de SKU;
- RBAC dinámico;
- matriz final exhaustiva `Rol → Permiso` de todos los módulos;
- estrategia definitiva de promociones y gratuidad comercial;
- biblioteca completa de conversión de unidades.

---

# 41. Consideraciones de UX

UX debe:

- usar lenguaje cotidiano;
- ocultar opciones incompatibles;
- evitar formularios extensos;
- priorizar celular;
- permitir ausencia de imágenes/SKU/Categoria;
- permitir cargar hasta 3 imágenes;
- permitir elegir claramente una imagen principal;
- mostrar claramente `EstadoArticulo`;
- ocultar INACTIVOS en selectores normales de nuevas operaciones;
- permitir filtros administrativos por INACTIVO;
- permitir editar un INACTIVO sin reactivarlo;
- al solicitar reactivación, explicar qué configuración impide activarlo si falla;
- distinguir guardar cambios de la acción explícita `Reactivar`;
- evitar mostrar capacidades internas como flags técnicos cuando pueda expresarse la intención comercial;
- informar conflictos de edición concurrente en lugar de sobrescribir silenciosamente.

UX no reemplaza validación backend.

# 42. Consideraciones para Diseño Técnico

No se congela:

- tipos SQL;
- precisión exacta Numeric;
- tablas;
- enums SQL;
- índices;
- representación física de imágenes;
- S3 / CDN / filesystem / proveedor multimedia;
- endpoints;
- DTOs concretos;
- Pydantic;
- SQLAlchemy;
- IDs;
- Repository concreto;
- Unit of Work;
- Service Layer concreto;
- locking;
- isolation;
- optimistic/pessimistic concurrency;
- auditoría concreta;
- Domain Events;
- case sensitivity de SKU;
- trim/Unicode/regex de SKU;
- algoritmo exacto de equivalencia funcional de nombre;
- mecanismo exacto de control de versión;
- estrategia de limpieza de archivos de imagen.

Debe garantizarse:

```text
dinero decimal exacto
cantidades fraccionarias
tenant scoping
unicidad contextual bajo concurrencia
mutaciones atómicas/consistentes
no estados parciales
no lost update silencioso
historia no reescrita
```

Para edición parcial debe existir alguna representación capaz de distinguir:

```text
campo omitido
!=
campo enviado como null
```

La forma técnica concreta permanece abierta.

`PropuestaEdicionDTO` pertenece a Application/API.

`propuestaEdicionPreparada` representa la intención de edición ya interpretada y con referencias resueltas, pero:

- no tiene identidad propia;
- no requiere persistencia;
- no debe confundirse con una entidad;
- no debe acoplar Domain a HTTP/Pydantic.

La persistencia debe actuar como defensa final frente a:

- nombre duplicado;
- SKU duplicado;
- modificación concurrente del mismo artículo;
- invalidación concurrente de una Categoria necesaria para la edición.

El lifecycle técnico de archivos de imagen debe diseñarse evitando efectos externos irreversibles antes de una confirmación segura.

---

# 43. Decisiones Deliberadamente Postergadas

Quedan para módulos posteriores o Arquitectura:

```text
qué dependencias exactas bloquean quitar controlaStock
qué dependencias exactas bloquean quitar uso en producción
qué dependencias actuales restringen ciertos cambios de UnidadMedida
qué operaciones excepcionales pueden usar stock de un artículo INACTIVO
cómo se resuelven ajustes/regularizaciones
cómo se calcula el precio efectivo de Venta
cómo funcionan promociones, 2x1, 2x3, bonificaciones y gratuidad
qué significa comercialmente precioBase = 0 en M05
cómo se almacenan y versionan físicamente las imágenes
qué estrategia concreta evita lost updates
qué permisos concretos se asignan finalmente a ENCARGADO/TRABAJADOR
```

M02 sí congela:

```text
qué capacidades existen
qué combinaciones locales son válidas
TipoArticulo inmutable
edición ACTIVO/INACTIVO sin cambio implícito de estado
reactivación explícita separada
nombre y SKU con unicidad contextual
imágenes 0..3 con una principal si existen
historia no reescrita
entrada parcial + confirmación atómica
```

No introducir anticipadamente contratos con M03/M04/M05/M07 que todavía no hayan sido diseñados.

---

# 44. Consistencia Transversal

La política transversal de M02 es:

```text
Rol contextual proviene de M01
+
cada operación exige permiso conceptual
+
tenant scoping obligatorio
```

La matriz exacta:

```text
Rol → Permiso M02
```

permanece abierta en esta etapa, salvo decisiones expresamente fijadas.

Regla explícita de hard delete:

```text
PROPIETARIO
+
ArticuloCatalogo INACTIVO
+
sin historia/referencias/dependencias
```

Configuración administrativamente editable incluye, según reglas aplicables:

```text
nombre
descripción
precio
costo
SKU
UnidadMedida
Capacidades
Categoria
imágenes
```

Puede editarse tanto en:

```text
ACTIVO
INACTIVO
```

pero:

```text
editar
NO cambia EstadoArticulo
```

La reactivación permanece separada.

La edición de catálogo afecta configuración futura y nunca debe utilizarse para reconstruir hechos históricos.

---

# 45. Criterio Rector

> **Un catálogo genérico por capacidades, protegido por reglas estrictas de consistencia, historia y concurrencia, y presentado mediante una experiencia sencilla para pequeños negocios.**

La flexibilidad nunca debe sacrificar:

- tenant;
- historia;
- consistencia;
- autorización;
- significado cuantitativo;
- unicidad contextual;
- atomicidad;
- trazabilidad.

---

# 46. Guía de Interpretación para Implementación e IA

## 46.1. Orden de Lectura

Durante esta sincronización utilizar:

```text
M02-Catalogo.md
↓
secuencias/02-editar-articulo.puml
↓
01-modelo-dominio-bloque-1.md
↓
03-m02-catalogo-clases.md / .puml
   [deben sincronizarse]
↓
06-m02-estados-articulo.md / .puml
   [deben sincronizarse]
↓
ADRs
↓
Modelo Relacional
↓
API
↓
Código
```

Una vez resincronizados clases y estados, todos los artefactos del Bloque 1 deben volver a revisarse transversalmente antes de implementación.

---

## 46.2. Reglas Mínimas para IA

Una IA NO debe:

- convertir UML directamente en ORM;
- introducir jerarquías Producto/Insumo/Servicio;
- meter stock/lotes/recetas en `ArticuloCatalogo`;
- modificar `TipoArticulo`;
- mutar parcialmente `CapacidadesArticulo`;
- auto-corregir VO inválidos;
- rechazar una edición solo porque el artículo está INACTIVO;
- activar automáticamente un INACTIVO después de editarlo;
- fusionar edición y reactivación;
- permitir SKU duplicado porque uno está INACTIVO;
- permitir nombre duplicado porque uno está INACTIVO;
- persistir `SKU=""`;
- usar SKU o nombre como identidad;
- reconstruir historia usando valores actuales;
- recalcular operaciones históricas por cambiar precio/unidad/capacidades;
- modificar promociones porque cambió `precioBase`;
- confiar únicamente en frontend/prechecks;
- consultar repositories desde la entidad;
- pasar un DTO HTTP directamente al dominio;
- implementar edición mediante una cadena de setters públicos;
- mutar primero y “hacer rollback manual” en la entidad después;
- sobrescribir silenciosamente una edición concurrente;
- exponer obligatoriamente capacidades internas como checkboxes técnicos;
- borrar archivos externos de imagen de forma irreversible antes de una confirmación segura;
- inventar infraestructura prematura.

Una IA debe implementar conceptualmente:

```text
intención parcial
→ Application distingue omitido/null
→ normaliza entrada
→ resuelve referencias
→ pre-valida contexto/unicidades
→ construye propuestaEdicionPreparada
→ Domain valida TODA la propuesta
→ si falla: no mutar
→ si pasa: aplicar coherentemente
→ persistencia protege concurrencia/unicidades
→ confirmar todo-o-nada
```

---

## 46.3. Guardias Locales vs Contextuales

Locales:

```text
Tipo + Capacidades
precio
costo
uso operativo mínimo si ACTIVO
Tipo inmutable
coherencia VO
imágenes 0..3
exactamente una principal si existen
```

Contextuales:

```text
autorización
tenant
nombre único
SKU único
Categoria del mismo Negocio
Categoria ACTIVA para nueva asociación
cambio concurrente relevante de Categoria
dependencias estructurales
compatibilidad operativa de cambios de unidad
referencias para hard delete
```

La entidad no consulta repositories para resolver las contextuales.

---

## 46.4. TOCTOU y Lost Update

Ejemplo de elegibilidad:

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

Ejemplo de edición:

```text
T0 Usuario A abre artículo versión lógica X
T1 Usuario B abre artículo versión lógica X
T2 Usuario A confirma cambios
T3 Usuario B confirma sobre estado obsoleto
```

Regla:

```text
T3 NO puede sobrescribir silenciosamente T2
```

El mecanismo concreto:

```text
version
timestamp
lock
aislamiento
otro
```

permanece abierto.

---

# 47. Estado Actual de la Especificación Funcional M02

Con la sincronización actual:

```text
BLOQUE 1 — FUNDACIÓN

M01 Organización
🟡 SINCRONIZADO FUNCIONALMENTE
   pendiente de auditoría transversal final

M02 Catálogo
🟡 SINCRONIZADO FUNCIONALMENTE
✅ ALINEADO CON Diagrama 3
✅ ALINEADO CON Diagrama 6
✅ ALINEADO CON secuencias/02-editar-articulo.puml
```

Estado de artefactos M02:

```text
M02-Catalogo.md
✅ SINCRONIZADO

03-m02-catalogo-clases.md
✅ SINCRONIZADO

03-m02-catalogo-clases.puml
✅ SINCRONIZADO

06-m02-estados-articulo.md
✅ SINCRONIZADO

06-m02-estados-articulo.puml
✅ SINCRONIZADO

secuencias/02-editar-articulo.puml
✅ SINCRONIZADO
```

La congelación definitiva del Bloque 1 se realizará únicamente después de la auditoría transversal de todos los artefactos M01/M02.

No reabrir decisiones funcionales cerradas durante esa auditoría salvo que se detecte una contradicción real.

