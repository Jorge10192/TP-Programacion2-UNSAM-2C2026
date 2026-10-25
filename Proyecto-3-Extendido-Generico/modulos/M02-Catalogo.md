# 02 — Módulo de Catálogo

## 1. Propósito y Alcance

### 1.1. Propósito

El módulo **M02 — Catálogo** administra los bienes y servicios que un Negocio utiliza dentro de la plataforma.

El catálogo constituye la base funcional común sobre la que posteriormente operan:

```text
Compras
Inventario
Ventas
Producción
Analítica
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

Todos estos conceptos forman parte del mismo catálogo.

La diferencia entre ellos se representa mediante:

```text
Tipo
+
Capacidades
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

### 1.2. Objetivos

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
Capacidades

¿Cuál es su referencia económica actual?
        ↓
precio_base
costo_referencia
```

---

### 1.3. Alcance

El módulo incluye:

- catálogo unificado de bienes y servicios;
- categorías configurables por Negocio;
- unidades de medida normalizadas;
- precio base actual;
- costo de referencia opcional;
- código/SKU opcional;
- descripción opcional;
- imagen principal opcional;
- capacidades operativas;
- búsqueda y consulta;
- edición controlada;
- activación;
- desactivación;
- reactivación;
- eliminación física cuando sea segura;
- conservación histórica;
- validaciones entre capacidades;
- permisos por rol;
- aislamiento entre negocios.

---

### 1.4. Fuera del Alcance

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

Estos conceptos pertenecen a otros módulos o a evoluciones futuras.

---

### 1.5. Prioridad

**MUST HAVE**

M02 forma parte del:

```text
BLOQUE 1 — FUNDACIÓN

M01 Organización
M02 Catálogo
```

No deberán implementarse M03 Compras, M04 Inventario ni M05 Ventas sin una definición estable del Catálogo.

---

# 2. Principio Rector de Diseño

El catálogo debe ser:

```text
flexible internamente
+
simple externamente
```

Internamente, el comportamiento de cada artículo se determina mediante capacidades:

```text
es_comprable
es_vendible
controla_stock
puede_usarse_en_produccion
controla_vencimiento
permite_descuento
```

Sin embargo, la interfaz no debe exigir al usuario comprender conceptos técnicos.

En lugar de mostrar:

```text
es_comprable = true
controla_stock = true
```

la experiencia podrá utilizar expresiones como:

```text
☑ Lo compro a proveedores
☑ Lo vendo
☑ Quiero controlar stock
☐ Lo uso para producir otros productos
☐ Tiene vencimiento
☑ Permite descuentos
```

La complejidad pertenece al modelo.

La simplicidad pertenece a la experiencia de usuario.

---

# 3. Actores, Permisos y Autorización Contextual

## 3.1. Propietario

Posee administración completa del catálogo.

Puede:

- consultar;
- buscar;
- crear artículos;
- editar artículos;
- activar artículos;
- desactivar artículos;
- reactivar artículos;
- eliminar artículos cuando las reglas lo permitan;
- modificar precio base;
- modificar costo de referencia;
- modificar capacidades permitidas;
- administrar categorías;
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
- activar artículos;
- desactivar artículos;
- reactivar artículos.

No puede:

- crear artículos;
- editar artículos;
- eliminar artículos;
- modificar precio base;
- modificar costo de referencia;
- modificar capacidades;
- modificar SKU;
- modificar UnidadMedida;
- crear categorías;
- editar categorías;
- activar categorías;
- desactivar categorías;
- eliminar categorías.

---

## 3.3. Trabajador

Puede:

- consultar catálogo;
- buscar artículos;
- consultar categorías;
- visualizar la información necesaria para operar.

No puede modificar el catálogo.

---

## 3.4. Autorización Contextual

Los métodos conceptuales de `ArticuloCatalogo` y `Categoria` no determinan qué Usuario puede ejecutarlos.

Antes de cualquier mutación, el Caso de Uso debe validar conceptualmente:

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
```

La existencia de un Rol no reemplaza las reglas específicas del módulo.

Ejemplo:

```text
ENCARGADO
→ puede activar/desactivar/reactivar ArticuloCatalogo
→ no puede editar su configuración
→ no puede administrar Categoria
```

No se modelará para el MVP una entidad `Permiso` ni un RBAC dinámico.

La forma técnica de transportar y verificar el contexto autorizado se definirá durante el Diseño Técnico.

---

# 4. Modelo Conceptual

```text
┌──────────────────────┐
│       Negocio        │
└──────────┬───────────┘
           │
           │ 1
           │
           │ N
           ▼
┌──────────────────────┐
│  ArticuloCatalogo    │
│                      │
│  BIEN / SERVICIO     │
│  + capacidades       │
└───────┬────────┬─────┘
        │        │
        │        │
        ▼        ▼
┌────────────┐  ┌────────────────┐
│ Categoria  │  │ UnidadMedida   │
└────────────┘  └────────────────┘
```

Conceptualmente:

```text
Negocio
   │
   ├── Categorias
   │
   └── ArticulosCatalogo
```

Reglas generales:

- cada `ArticuloCatalogo` pertenece a exactamente un Negocio;
- cada `Categoria` pertenece a exactamente un Negocio;
- las `UnidadMedida` del MVP pertenecen a un catálogo normalizado del sistema;
- no pueden mezclarse recursos pertenecientes a negocios diferentes.

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

Ejemplos:

```text
Harina
Collar para perro
Snack de pollo
Torta personalizada
Remera negra M
Maquillaje social
Asesoramiento por hora
```

Todos pueden representarse mediante `ArticuloCatalogo`.

---

## 5.2. Información Funcional

Un artículo posee conceptualmente:

```text
Negocio

Nombre
Descripción opcional

Tipo

Categoría opcional
Unidad de medida

Código / SKU opcional
Imagen principal opcional

Precio base
Costo de referencia opcional

Capacidades

Estado
```

La representación técnica concreta se definirá durante el Diseño Técnico del Bloque 1.

---

# 6. Tipo de Artículo

Todo ArticuloCatalogo posee exactamente uno de estos tipos:

```text
BIEN
SERVICIO
```

El Tipo expresa la naturaleza general del artículo.

Las capacidades determinan su comportamiento operativo.

---

## 6.1. BIEN

Representa un elemento material o físicamente cuantificable.

Ejemplos:

- alimentos;
- materias primas;
- ropa;
- accesorios;
- envases;
- productos terminados;
- mercadería para reventa.

Un BIEN puede:

- comprarse;
- venderse;
- controlar stock;
- participar en producción;
- controlar vencimiento;
- admitir descuentos.

---

## 6.2. SERVICIO

Representa una prestación no inventariable.

Ejemplos:

- maquillaje;
- peluquería;
- baño de mascotas;
- bordado;
- reparación;
- asesoramiento.

Un SERVICIO puede:

- venderse;
- comprarse cuando represente una prestación externa;
- expresarse por unidad, hora u otra unidad normalizada apropiada.

Un SERVICIO nunca genera inventario físico.

---

# 7. Inmutabilidad del Tipo

El Tipo:

```text
BIEN
o
SERVICIO
```

es inmutable después de la creación del artículo.

No se permite:

```text
BIEN → SERVICIO
```

ni:

```text
SERVICIO → BIEN
```

Si el artículo fue creado incorrectamente y nunca fue utilizado:

```text
eliminar
+
crear correctamente
```

Si ya posee historia:

```text
desactivar artículo incorrecto
+
crear nuevo artículo
```

No se debe alterar la identidad histórica del artículo original.

---

# 8. Capacidades

El comportamiento operativo permitido de un artículo se determina mediante capacidades.

| Capacidad | Significado |
| :--- | :--- |
| `es_comprable` | Puede utilizarse en una Compra. |
| `es_vendible` | Puede utilizarse en una Venta. |
| `controla_stock` | Sus existencias son administradas por el módulo de Inventario. |
| `puede_usarse_en_produccion` | Puede consumirse como insumo de Producción. |
| `controla_vencimiento` | Sus existencias pueden gestionarse mediante lotes con vencimiento. |
| `permite_descuento` | Puede recibir descuentos durante una Venta. |

Las capacidades expresan **elegibilidad y configuración**, no hechos operativos.

Por lo tanto:

```text
controla_stock
≠ stock actual

controla_vencimiento
≠ fecha de vencimiento del ArticuloCatalogo

puede_usarse_en_produccion
≠ receta

es_vendible
≠ Venta

es_comprable
≠ Compra
```

Los hechos operativos pertenecen a los módulos consumidores:

```text
M03 Compras
M04 Inventario
M05 Ventas
M07 Producción
```

M02 no debe incorporar stock, lotes, compras, ventas, recetas ni producciones dentro de `ArticuloCatalogo`.

Conceptualmente, las capacidades forman una configuración completa.

Una actualización debe producir:

```text
Configuración válida A
        ↓
validación completa
        ↓
Configuración válida B
```

sin exponer estados intermedios inválidos.

---

# 9. Catálogo por Capacidades

No se crearán clases funcionales rígidas para determinar comportamiento.

Ejemplo:

```text
Harina

tipo = BIEN

es_comprable = Sí
es_vendible = No
controla_stock = Sí
puede_usarse_en_produccion = Sí
controla_vencimiento = Sí
permite_descuento = No
```

Otro:

```text
Collar

tipo = BIEN

es_comprable = Sí
es_vendible = Sí
controla_stock = Sí
puede_usarse_en_produccion = No
controla_vencimiento = No
permite_descuento = Sí
```

Otro:

```text
Torta personalizada

tipo = BIEN

es_comprable = No
es_vendible = Sí
controla_stock = Sí
puede_usarse_en_produccion = No
controla_vencimiento = Sí
permite_descuento = Sí
```

Otro:

```text
Maquillaje social

tipo = SERVICIO

es_comprable = No
es_vendible = Sí
controla_stock = No
puede_usarse_en_produccion = No
controla_vencimiento = No
permite_descuento = Sí
```

---

# 10. Reglas de Consistencia entre Capacidades

Las capacidades no pueden combinarse arbitrariamente.

## 10.1. Servicios

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

No existe control de vencimiento de inventario sin existencias controladas.

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

Durante el MVP, todo artículo utilizado como insumo productivo debe poseer existencias controladas.

## 10.4. Descuentos

Si:

```text
permite_descuento = True
```

entonces:

```text
es_vendible = True
```

Si el Propietario deshabilita la venta:

```text
es_vendible
True → False
```

el sistema debe ajustar dentro de la misma operación:

```text
permite_descuento = False
```

El `precio_base` almacenado se conserva.

De esta manera el artículo nunca queda en una combinación inválida.

## 10.5. Uso Operativo Mínimo

Un artículo ACTIVO debe tener al menos una finalidad operativa válida.

Debe cumplirse al menos una:

```text
es_comprable = True
o
es_vendible = True
o
puede_usarse_en_produccion = True
```

Un artículo INACTIVO puede conservar una configuración en la que las tres capacidades anteriores sean `False`.

La exigencia de uso operativo mínimo se aplica al estado ACTIVO.

## 10.6. Capacidades Comerciales y Estructurales

Para interpretar correctamente los cambios se distinguen conceptualmente dos grupos.

### Capacidades comerciales / de habilitación futura

```text
es_comprable
es_vendible
permite_descuento
```

Pueden modificarse aunque exista historia operativa.

El cambio afecta operaciones futuras y no reescribe operaciones anteriores.

### Capacidades estructurales

```text
controla_stock
controla_vencimiento
puede_usarse_en_produccion
```

Su modificación puede depender de información administrada por módulos consumidores.

Una transición estructural debe bloquearse cuando:

```text
vuelva incompatible la configuración
con dependencias operativas existentes

o

altere el significado histórico
que deba preservarse
```

La mera existencia de historia previa **no implica un bloqueo permanente automático**.

Las condiciones concretas relacionadas con stock, lotes, recetas o producción se completarán junto con M04 y M07.

## 10.7. Consistencia Estructural vs. Tolerancia Operativa

M02 debe mantener siempre una configuración estructuralmente válida.

Por ejemplo, nunca es válido:

```text
SERVICIO
+
controla_stock = True
```

ni:

```text
permite_descuento = True
+
es_vendible = False
```

Esto es independiente de políticas operativas futuras.

Por ejemplo, M04/M05 podrán decidir posteriormente si una operación puede producir temporalmente:

```text
stock negativo
```

y permitir una corrección posterior.

Por lo tanto:

```text
inconsistencia operativa temporal
≠
configuración estructural inválida del catálogo
```

---

# 11. Bypass Total de Inventario

Si:

```text
controla_stock = False
```

el artículo queda completamente fuera del subsistema de inventario.

Por lo tanto no deberá generar:

```text
StockUbicacion
Lote
MovimientoInventario
```

Esta regla deberá respetarse posteriormente en:

```text
M03 Compras
M04 Inventario
M05 Ventas
M07 Producción
```

Ejemplo:

```text
Servicio de maquillaje

controla_stock = False

Venta
  ↓
NO descuenta stock
NO crea lote
NO genera movimiento de inventario
```

---

# 12. Categoria

## 12.1. Propósito

`Categoria` permite organizar el catálogo de cada Negocio.

Ejemplos:

```text
WALOS

Snacks
Tortas
Accesorios
Insumos
```

```text
Tienda de ropa

Remeras
Pantalones
Accesorios
```

```text
Prestador de servicios

Maquillaje
Peinados
Asesoramiento
```

## 12.2. Propiedad

Las Categorías pertenecen al Negocio.

No existe una lista global obligatoria.

Cada Negocio define su propia organización.

Si un artículo posee Categoria:

```text
ArticuloCatalogo.negocio
=
Categoria.negocio
```

No pueden asociarse recursos pertenecientes a Negocios diferentes.

## 12.3. Categoría Opcional

Un ArticuloCatalogo puede existir sin Categoria.

Esto permite una carga rápida.

```text
categoria = opcional
```

La ausencia de Categoria no bloquea la utilización del artículo.

## 12.4. Nombre Único por Negocio

Dentro de un mismo Negocio no pueden existir dos Categorías con nombres equivalentes luego de aplicar la normalización funcional definida por el sistema.

Conceptualmente:

```text
Snacks
SNACKS
 snacks
```

representan el mismo nombre.

La regla aplica tanto a Categorías ACTIVAS como INACTIVAS.

Si existe una equivalente INACTIVA:

```text
NO crear otra
→ informar que ya existe
→ ofrecer reactivar la existente
```

La experiencia debe orientar directamente al Usuario hacia la reactivación.

La estrategia técnica exacta de normalización se definirá posteriormente.

La validación de unicidad requiere información del conjunto de Categorías del Negocio y no debe depender únicamente del estado de una instancia aislada.

## 12.5. Categoría Inactiva

Una Categoria puede desactivarse.

Una Categoria INACTIVA:

- continúa existiendo;
- conserva su identidad;
- conserva sus referencias;
- conserva los artículos ya asociados;
- no desactiva automáticamente esos artículos;
- no modifica sus capacidades;
- no recalcula precios;
- no modifica promociones;
- no se permite para nuevas asociaciones;
- no se permite como destino de una reasignación.

Por lo tanto:

```text
Articulo A
→ Categoria X

Categoria X
ACTIVA → INACTIVA

Articulo A
→ conserva la asociación
→ puede continuar operativo
```

En cambio:

```text
Articulo B
+
Categoria X INACTIVA
→ nueva asociación rechazada
→ orientar a reactivar Categoria X
```

Una Categoria históricamente asociada que se encuentre INACTIVA **no bloquea por sí sola la reactivación de un ArticuloCatalogo**.

## 12.6. Reactivación de Categoria

Reactivar una Categoria:

```text
INACTIVA → ACTIVA
```

reutiliza la misma entidad.

Conserva:

- identidad;
- relaciones;
- artículos asociados.

No debe:

- crear una copia;
- recalcular precios;
- modificar capacidades;
- obligar a recargar artículos.

## 12.7. Eliminación Física de Categoria

La eliminación física es excepcional.

No puede eliminarse físicamente una Categoria mientras exista cualquier `ArticuloCatalogo` asociado, independientemente de que se encuentre ACTIVO o INACTIVO.

`puedeEliminarseFisicamente()` debe interpretarse como una consulta útil para UX o diagnóstico.

La eliminación efectiva debe volver a validar, dentro de la operación que confirma el cambio:

```text
ausencia de artículos asociados
+
ausencia de otras dependencias que deban conservarse
```

Una validación previa no constituye autorización definitiva para eliminar.

---

# 13. UnidadMedida

## 13.1. Propósito

Define cómo se expresa la cantidad de un artículo.

Ejemplos iniciales:

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

La lista final podrá ajustarse durante el Diseño Técnico sin modificar el concepto funcional.

## 13.2. Unidades Normalizadas

Durante el MVP se utilizará una lista controlada por el sistema.

No se implementará inicialmente:

```text
unidades personalizadas por Negocio
```

Esto evita duplicaciones como:

```text
kg
Kg
Kilo
Kilos
kilogramo
```

## 13.3. Bienes

Todo BIEN debe poseer una UnidadMedida válida.

El Propietario debe seleccionar explícitamente cómo se mide.

Ejemplo:

```text
Harina
→ KG
```

```text
Collar
→ UNIDAD
```

## 13.4. Servicios

Todo SERVICIO posee también una unidad operativa.

Al crear un SERVICIO, el sistema asigna inicialmente:

```text
UNIDAD
```

sin exigir al usuario completar este dato en la creación rápida.

Ejemplo:

```text
Maquillaje social
→ UNIDAD
```

Si corresponde, el Propietario puede elegir otra unidad normalizada:

```text
Asesoramiento
→ HORA
```

La interfaz puede ocultar la unidad cuando se utiliza el valor predeterminado.

---

# 14. Estabilidad de la Unidad de Medida

Mientras un artículo nunca haya participado en una operación que registre cantidades, su UnidadMedida puede modificarse.

Ejemplo:

```text
Artículo nunca usado

KG → UNIDAD
✓ permitido
```

Una vez que el artículo posea historia operativa dependiente de su unidad, no podrá cambiarse de manera que modifique el significado de cantidades registradas.

Ejemplo:

```text
Harina
Unidad = KG

Compra histórica = 5 KG
```

No se permitirá posteriormente:

```text
KG → UNIDAD
```

mediante una simple edición si ello cambia el significado de las cantidades anteriores.

Si la configuración histórica fue incorrecta:

```text
desactivar artículo
+
crear artículo nuevo
```

Las conversiones históricas de unidades quedan fuera del MVP.

La existencia de historia cuantitativa es una condición contextual derivada de módulos consumidores como:

```text
M03 Compras
M04 Inventario
M05 Ventas
M07 Producción
```

M02 no necesita un atributo persistente obligatorio:

```text
tiene_historia_operativa
```

La forma técnica de consultar esta condición se definirá posteriormente.

Una preconsulta puede utilizarse para UX, pero la operación que efectivamente modifica la UnidadMedida debe volver a confirmar que la modificación continúa siendo válida.

---

# 15. Cantidades Fraccionarias

El dominio debe admitir cantidades fraccionarias.

Ejemplos:

```text
1 unidad
0,500 kg
1,25 kg
2,5 litros
0,75 metros
1,5 horas
```

No se utilizará un modelo que obligue a trabajar únicamente con enteros.

La precisión numérica exacta se definirá durante el Diseño Técnico.

---

# 16. Precio Base

## 16.1. Definición

`precio_base` representa el precio de venta actual sugerido.

Si:

```text
es_vendible = True
```

el artículo debe poseer un precio base.

## 16.2. Valor Válido

Debe cumplirse:

```text
precio_base >= 0
```

Por lo tanto:

```text
precio_base = 0
```

es válido.

Esto permite representar:

- muestras;
- cortesías;
- artículos promocionales;
- servicios bonificados;
- entregas gratuitas.

Un precio negativo no es válido.

## 16.3. Uso

Ejemplo:

```text
Snack de pollo

precio_base = $5.000
```

Una Venta futura podrá tomar:

```text
$5.000
```

como precio inicial sugerido.

Las reglas sobre modificación del precio aplicado pertenecen a M05.

---

# 17. Historia del Precio

Modificar `precio_base` no modifica operaciones anteriores.

Ejemplo:

```text
1 de octubre
Venta = $5.000

15 de octubre
precio_base = $6.000
```

La Venta del 1 de octubre conserva:

```text
$5.000
```

Las operaciones históricas deben preservar el precio realmente aplicado.

---

# 18. Habilitar y Deshabilitar Venta sin Perder Precio

## 18.1. Habilitar Venta

Si un artículo cambia:

```text
es_vendible = False
```

a:

```text
es_vendible = True
```

la transición solo puede confirmarse cuando existe un `precio_base` válido:

```text
precio_base != null
precio_base >= 0
```

El valor cero continúa siendo válido.

Si existe un precio previamente almacenado, puede reutilizarse como referencia siempre que siga siendo válido.

El Propietario debe poder revisarlo antes de confirmar.

Esta validación pertenece a la configuración completa del `ArticuloCatalogo`; no forma parte únicamente de la coherencia interna de `CapacidadesArticulo`.

## 18.2. Deshabilitar Venta

Si un artículo cambia:

```text
es_vendible = True
```

a:

```text
es_vendible = False
```

el `precio_base` existente se conserva.

Mientras el artículo no sea vendible:

```text
precio_base
→ sin efecto operativo
```

Dentro de la misma operación debe ajustarse:

```text
permite_descuento = False
```

La transición debe confirmarse como una configuración completa y consistente.

Deshabilitar una capacidad no debe borrar información útil sin necesidad.

## 18.3. Historia

Habilitar o deshabilitar venta no modifica operaciones históricas.

M02 representa la configuración actual del catálogo.

Las Ventas deben conservar el precio realmente aplicado dentro de M05.

---

# 19. Costo de Referencia

`costo_referencia` representa una estimación actual opcional del costo del artículo.

No representa necesariamente:

- último costo real;
- costo promedio;
- costo contable;
- costo histórico definitivo.

Si se informa:

```text
costo_referencia >= 0
```

Un valor negativo no es válido.

## 19.1. Historia

Modificar `costo_referencia` no modifica costos históricos registrados por:

```text
Compras
Producción
otras operaciones
```

Los costos históricos se conservarán en los módulos correspondientes.

---

# 20. Moneda

El ArticuloCatalogo no posee moneda independiente.

Los importes utilizan la moneda base del Negocio.

Para el MVP:

```text
ARS
```

definido desde M01.

Conceptualmente:

```text
ArticuloCatalogo.precio_base
         ↓
Negocio.moneda_base
```

---

# 21. Código / SKU

## 21.1. Definición

Un artículo puede poseer un código interno opcional.

Ejemplo:

```text
SNACK-POLLO-100
```

El SKU no constituye la identidad técnica del ArticuloCatalogo.

La identidad del artículo debe permanecer estable aunque su SKU cambie.

## 21.2. Unicidad

Cuando se informa, el SKU ACTUAL debe ser único dentro del Negocio.

La unicidad considera:

```text
artículos ACTIVOS
+
artículos INACTIVOS
```

Ejemplo:

```text
Articulo A
SKU = REM-01
INACTIVO

Articulo B
SKU = REM-01
→ NO permitido
```

Desactivar un artículo no libera su SKU actual.

La validación de unicidad requiere información contextual sobre los artículos del Negocio.

## 21.3. Política de Modificación del SKU

Para el MVP, la unicidad y reserva corresponden al SKU **actualmente asignado** al artículo.

### Cambiar A → B

```text
SKU actual = A
nuevo SKU = B
```

Debe:

1. verificar que `B` se encuentre disponible dentro del mismo Negocio;
2. confirmar el cambio de manera consistente;
3. asignar `B`;
4. liberar `A` una vez confirmado el cambio.

No debe existir un instante confirmado en el que dos artículos posean simultáneamente el mismo SKU dentro del mismo Negocio.

### Cambiar A → sin SKU

```text
SKU actual = A
nuevo SKU = null
```

Al confirmar:

```text
A queda disponible
```

### Cambiar sin SKU → B

Debe verificarse previamente y al confirmar que:

```text
B está disponible
```

### Cambiar A → A

Se considera:

```text
no-op
```

No genera una modificación funcional.

## 21.4. Eliminación Física

Si un artículo se elimina físicamente de manera válida, cualquier SKU que posea en ese momento queda disponible.

La eliminación física no es el único mecanismo por el cual un SKU anterior puede quedar libre: también puede liberarse mediante una modificación explícita del SKU actual según la sección anterior.

## 21.5. Historia

M02 no implementará durante el MVP:

```text
historial de SKU
alias de SKU
reserva permanente de SKUs anteriores
```

Los módulos consumidores que necesiten preservar el código utilizado en una operación histórica deberán conservar el valor histórico necesario dentro de dicha operación.

Modificar el SKU actual no debe reinterpretar operaciones anteriores.

Si en una evolución futura se necesita impedir la reutilización de SKUs históricos, deberá modelarse explícitamente una política de historial o alias.

## 21.6. Nombre y SKU

El nombre del artículo no constituye su identificador técnico.

Pueden existir nombres iguales o similares cuando el Negocio lo necesite.

El SKU permite diferenciarlos cuando corresponde, pero continúa siendo un dato editable y opcional.

---

# 22. Imagen

Durante el MVP cada ArticuloCatalogo puede poseer:

```text
0..1 imagen principal
```

La imagen es opcional.

No se implementarán inicialmente:

- múltiples imágenes;
- galerías;
- ordenamiento visual;
- variantes visuales.

La estrategia técnica de almacenamiento se definirá posteriormente.

---

# 23. Variantes

El MVP no incluye un sistema formal de variantes.

Por lo tanto:

```text
Remera negra M
Remera negra L
Remera blanca M
```

se consideran artículos independientes.

Igualmente:

```text
Snack pollo 100 g
Snack pollo 250 g
```

son artículos independientes.

No se implementará inicialmente:

```text
Producto padre
├── talle
├── color
└── presentación
```

Esta simplificación reduce complejidad en:

- catálogo;
- inventario;
- compras;
- ventas;
- UX;
- base de datos.

---

# 24. Estado del Artículo

Un ArticuloCatalogo puede estar:

```text
ACTIVO
INACTIVO
```

## 24.1. ACTIVO

Puede utilizarse en nuevas operaciones compatibles con sus capacidades.

Para permanecer ACTIVO debe cumplir las invariantes vigentes, incluyendo:

```text
al menos un uso operativo
+
capacidades coherentes
+
precio_base válido si es vendible
```

y cualquier guardia estructural aplicable.

## 24.2. INACTIVO

No aparece normalmente como opción para nuevas operaciones.

Continúa disponible:

- en historial;
- en consultas administrativas;
- en operaciones anteriores;
- para reactivación.

Un artículo INACTIVO puede conservar:

```text
es_comprable = False
es_vendible = False
puede_usarse_en_produccion = False
```

sin violar la regla de uso operativo mínimo.

---

# 25. Desactivación

Desactivar un artículo:

```text
NO elimina el artículo
NO elimina su historial
NO elimina operaciones
NO modifica compras anteriores
NO modifica ventas anteriores
NO modifica movimientos anteriores
NO modifica producciones anteriores
NO libera su SKU actual
```

Además:

```text
M02 no pone stock en cero
M02 no elimina lotes
M02 no elimina movimientos de inventario
```

Las existencias son responsabilidad de M04.

La desactivación conserva:

- identidad;
- configuración;
- SKU actual;
- referencias;
- historia.

Solo retira el artículo del uso normal en nuevas operaciones.

Los módulos operativos posteriores determinarán qué acciones excepcionales pueden seguir realizándose sobre existencias remanentes, por ejemplo ajustes o bajas.

M02 no congela esas políticas.

---

# 26. Reactivación

Un artículo INACTIVO puede reactivarse reutilizando la misma entidad.

La reactivación:

- conserva identidad;
- conserva el SKU actual;
- conserva historial;
- conserva referencias;
- no crea una copia;
- no reconstruye ni reescribe operaciones anteriores.

Antes de confirmar:

```text
INACTIVO → ACTIVO
```

deben revalidarse las invariantes vigentes necesarias para volver a operar.

Como mínimo:

```text
coherencia Tipo + Capacidades
+
uso operativo mínimo
+
precio_base válido si esVendible
+
guardias estructurales aplicables
```

Una Categoria históricamente asociada que se encuentre INACTIVA no bloquea por sí sola la reactivación del artículo.

La prohibición sobre Categorías INACTIVAS aplica a nuevas asociaciones o reasignaciones.

Una prevalidación puede utilizarse para orientar la UX, pero la operación que confirma la reactivación debe volver a verificar las condiciones contextuales relevantes.

---

# 27. Eliminación Física

La eliminación física es una excepción y no el mecanismo normal de retiro.

Solo está permitida cuando el artículo:

```text
nunca fue utilizado
+
no tiene historia relevante
+
no tiene referencias
+
no tiene dependencias que deban conservarse
```

Ejemplo:

```text
Artículo creado por error
        ↓
sin Compras
sin Ventas
sin Inventario
sin Producción
        ↓
puede eliminarse
```

Cuando existe historia:

```text
NO eliminar
→ desactivar
```

`puedeEliminarseFisicamente()` debe interpretarse como una consulta conceptual útil para UX o diagnóstico.

No constituye autorización definitiva.

La eliminación real debe revalidar de manera consistente dentro de la operación que confirma el cambio:

```text
ausencia de historia
+
ausencia de referencias
+
ausencia de dependencias
```

Si la eliminación se confirma de manera válida, el SKU actual queda disponible.

La evaluación puede requerir información de M03, M04, M05, M07 y otros consumidores futuros.

La forma técnica de realizar estas consultas y garantizar consistencia bajo concurrencia pertenece al Diseño Técnico.

---

# 28. Experiencia de Creación

La experiencia debe priorizar una carga rápida.

Flujo conceptual:

```text
Nuevo artículo
       ↓
¿Bien o Servicio?
       ↓
Nombre
       ↓
¿Cómo lo utilizás?
       ↓
Precio
       ↓
Guardar
```

Las opciones menos frecuentes pueden mostrarse en una sección adicional.

Ejemplo conceptual:

```text
Información básica

Nombre *
Tipo *

Categoría
Precio


¿Cómo lo utilizás?

☑ Lo vendo
☐ Lo compro
☑ Quiero controlar stock


Opciones adicionales

☐ Lo uso para producir
☐ Tiene vencimiento
☑ Permite descuentos

Código
Costo de referencia
Descripción
Imagen
```

La disposición visual definitiva pertenece a `docs/ux/`.

---

# 29. Configuración Inteligente de Interfaz

La UI debe evitar presentar configuraciones inválidas.

Si:

```text
tipo = SERVICIO
```

no deben ofrecerse normalmente:

```text
Controlar stock
Controlar vencimiento
Usar en producción
```

Si:

```text
es_vendible = False
```

pueden ocultarse o deshabilitarse opciones como:

```text
permite_descuento
```

El `precio_base` puede permanecer almacenado aunque deje de tener efecto operativo.

La UX debe prevenir errores antes de depender únicamente de mensajes de validación.

---

# 30. Requisitos Funcionales

| ID | Título | Descripción | Actor principal | Criterio de aceptación |
| :--- | :--- | :--- | :--- | :--- |
| **RF-CAT-001** | Consultar catálogo | Permitir consultar los artículos del Negocio activo. | Miembro | Solo se muestran recursos pertenecientes al Negocio autorizado. |
| **RF-CAT-002** | Buscar y filtrar | Permitir localizar artículos rápidamente. | Miembro | El Usuario puede buscar y aplicar filtros relevantes. |
| **RF-CAT-003** | Consultar artículo | Permitir visualizar detalle de un artículo. | Miembro | Se muestran datos y capacidades pertinentes. |
| **RF-CAT-004** | Crear categoría | Crear una Categoria del Negocio. | Propietario | Se registra una Categoria ACTIVA válida y sin equivalentes normalizadas. |
| **RF-CAT-005** | Editar categoría | Modificar información de Categoria. | Propietario | Se actualiza sin alterar historia y preservando unicidad normalizada. |
| **RF-CAT-006** | Activar/desactivar categoría | Cambiar disponibilidad de Categoria. | Propietario | No se alteran los artículos asociados. |
| **RF-CAT-007** | Eliminar categoría no utilizada | Eliminar una Categoria sin dependencias. | Propietario | La operación revalida que no existan artículos asociados ni dependencias que conservar. |
| **RF-CAT-008** | Consultar unidades | Consultar unidades normalizadas. | Miembro | El sistema ofrece unidades admitidas. |
| **RF-CAT-009** | Crear artículo | Registrar un BIEN o SERVICIO. | Propietario | Se crea luego de validar datos, capacidades y guardias contextuales. |
| **RF-CAT-010** | Editar artículo | Modificar configuración editable. | Propietario | Los cambios producen una configuración válida y no reescriben historia. |
| **RF-CAT-011** | Activar/desactivar artículo | Cambiar disponibilidad futura. | Propietario / Encargado | Conserva identidad, historia, referencias y existencias administradas por otros módulos. |
| **RF-CAT-012** | Reactivar artículo | Volver a habilitar un artículo. | Propietario / Encargado | Se reutiliza el mismo artículo y se revalidan las invariantes necesarias para volver a operar. |
| **RF-CAT-013** | Eliminar artículo no utilizado | Eliminar un artículo sin historia. | Propietario | La operación revalida ausencia de historia, referencias y dependencias. |
| **RF-CAT-014** | Administrar precio base | Definir o actualizar precio actual. | Propietario | El cambio no modifica operaciones anteriores. |
| **RF-CAT-015** | Administrar costo de referencia | Registrar costo actual estimado. | Propietario | Puede cambiar sin modificar historia. |
| **RF-CAT-016** | Administrar capacidades | Configurar usos permitidos. | Propietario | La nueva configuración completa es válida; cambios estructurales respetan dependencias existentes. |
| **RF-CAT-017** | Asociar imagen | Asociar imagen principal opcional. | Propietario | El artículo funciona con o sin imagen. |
| **RF-CAT-018** | Validar pertenencia | Impedir asociaciones entre Negocios distintos. | Sistema | Toda operación respeta el Negocio autorizado y Categoria/Articulo pertenecen al mismo Negocio. |
| **RF-CAT-019** | Administrar SKU actual | Crear, cambiar o quitar el SKU opcional. | Propietario | El SKU actual es único por Negocio; al cambiar/quitar, el valor anterior se libera solo después de confirmar la operación. |
| **RF-CAT-020** | Preservar Tipo | Impedir modificar BIEN/SERVICIO tras creación. | Sistema | El Tipo permanece inmutable. |
| **RF-CAT-021** | Validar UnidadMedida | Evitar cambios incompatibles con historia cuantitativa. | Sistema | No se altera el significado de cantidades históricas. |
| **RF-CAT-022** | Confirmar guardias contextuales | Revalidar restricciones que dependen del conjunto del Negocio o de módulos consumidores al confirmar una mutación. | Sistema | La preconsulta de UX no sustituye la confirmación consistente de la operación. |
| **RF-CAT-023** | Autorizar mutaciones M02 | Aplicar los permisos concretos del módulo al contexto Usuario + Negocio + Membresía + Rol. | Sistema | Ninguna mutación se ejecuta sin membresía ACTIVA y permiso concreto de M02. |

---

# 31. Reglas de Negocio

## `RN-CAT-001` — Pertenencia al Negocio
Todo ArticuloCatalogo pertenece a exactamente un Negocio. No puede utilizarse desde otro.

## `RN-CAT-002` — Categoría del Mismo Negocio
Si un artículo posee Categoria, `ArticuloCatalogo.negocio = Categoria.negocio`.

## `RN-CAT-003` — Tipo Obligatorio
Todo artículo posee exactamente un Tipo: `BIEN` o `SERVICIO`.

## `RN-CAT-004` — Servicio sin Inventario
Todo SERVICIO cumple `controla_stock = False`, `controla_vencimiento = False` y `puede_usarse_en_produccion = False`.

## `RN-CAT-005` — Bypass de Inventario
Si `controla_stock = False`, el artículo no genera `StockUbicacion`, `Lote` ni `MovimientoInventario`.

## `RN-CAT-006` — Vencimiento Requiere Stock
Si `controla_vencimiento = True`, entonces `tipo = BIEN` y `controla_stock = True`.

## `RN-CAT-007` — Producción Requiere Bien con Stock
Si `puede_usarse_en_produccion = True`, entonces `tipo = BIEN` y `controla_stock = True`.

## `RN-CAT-008` — Descuento Requiere Venta
Si `permite_descuento = True`, entonces `es_vendible = True`.

Si `es_vendible` cambia de `True` a `False`, el sistema debe ajustar `permite_descuento = False` dentro de la misma operación y conservar `precio_base`.

## `RN-CAT-009` — Uso Operativo Mínimo
Un artículo ACTIVO debe cumplir al menos una de: `es_comprable = True`, `es_vendible = True` o `puede_usarse_en_produccion = True`.

Un artículo INACTIVO puede tener las tres capacidades anteriores en `False`.

## `RN-CAT-010` — Unidad Obligatoria para Bienes
Todo BIEN posee UnidadMedida válida.

## `RN-CAT-011` — Unidad Operativa de Servicios
Todo SERVICIO posee UnidadMedida. El valor inicial es `UNIDAD`, salvo que el Propietario seleccione otra unidad normalizada apropiada.

## `RN-CAT-012` — Precio Base Válido
Si `es_vendible = True`, debe existir `precio_base` y debe cumplirse `precio_base >= 0`.

La transición `es_vendible: False → True` no puede confirmarse si esta regla no se cumple.

## `RN-CAT-013` — Costo de Referencia
`costo_referencia` es opcional. Cuando existe debe cumplirse `costo_referencia >= 0`.

## `RN-CAT-014` — Precio no Reescribe Historia
Modificar `precio_base` no modifica operaciones históricas.

## `RN-CAT-015` — Costo no Reescribe Historia
Modificar `costo_referencia` no modifica costos históricos.

## `RN-CAT-016` — SKU Actual Opcional y Único
El SKU es opcional. Cuando existe, el SKU actualmente asignado debe ser único dentro del Negocio considerando artículos ACTIVOS e INACTIVOS.

Desactivar un artículo no libera su SKU actual.

El SKU no constituye la identidad técnica del ArticuloCatalogo.

## `RN-CAT-017` — Nombre no es Identificador
El nombre no funciona como clave técnica. Pueden existir nombres iguales o similares.

## `RN-CAT-018` — Categoría Opcional
Un artículo puede existir sin Categoria.

## `RN-CAT-019` — Categoría Inactiva
Desactivar una Categoria no desactiva artículos, no cambia capacidades y no bloquea operaciones de artículos ya asociados.

Una Categoria INACTIVA no puede utilizarse para nuevas asociaciones ni como destino de una reasignación.

Una Categoria históricamente asociada e INACTIVA no bloquea por sí sola la reactivación del artículo.

## `RN-CAT-020` — Conservación Histórica
Un artículo utilizado en una operación no puede eliminarse físicamente. Debe desactivarse.

Modificar la configuración actual del catálogo no reescribe operaciones anteriores.

## `RN-CAT-021` — Eliminación Segura
La eliminación física solo está permitida si no existen historia, referencias ni dependencias que deban conservarse.

Para una `Categoria`, esto implica que no puede eliminarse físicamente mientras exista ningún `ArticuloCatalogo` asociado, independientemente de su estado.

La eliminación efectiva debe volver a validar estas condiciones al confirmar la operación.

## `RN-CAT-022` — Reactivación
Reactivar utiliza el mismo artículo. No se crea una copia.

Antes de confirmar `INACTIVO → ACTIVO`, deben revalidarse las invariantes vigentes necesarias para volver a operar.

## `RN-CAT-023` — Artículo Inactivo
Un artículo INACTIVO no se selecciona normalmente para nuevas operaciones. Continúa disponible para consulta histórica y reactivación.

## `RN-CAT-024` — Variantes Independientes
Durante el MVP, cada variante operativamente diferente es un ArticuloCatalogo independiente.

## `RN-CAT-025` — Imagen Principal
Durante el MVP se admite como máximo una imagen principal.

## `RN-CAT-026` — Cantidades Fraccionarias
El dominio admite cantidades fraccionarias cuando la UnidadMedida lo requiera.

## `RN-CAT-027` — Moneda del Negocio
Los importes utilizan la moneda base del Negocio.

## `RN-CAT-028` — Permisos Estrictos del MVP

```text
PROPIETARIO

ArticuloCatalogo
→ consultar
→ crear
→ editar
→ activar
→ desactivar
→ reactivar
→ eliminar cuando corresponda

Categoria
→ consultar
→ crear
→ editar
→ activar
→ desactivar
→ reactivar
→ eliminar cuando corresponda


ENCARGADO

ArticuloCatalogo
→ consultar
→ activar
→ desactivar
→ reactivar

Categoria
→ consultar


TRABAJADOR

ArticuloCatalogo
→ consultar

Categoria
→ consultar
```

## `RN-CAT-029` — Sin Listas de Precios en MVP
Cada artículo vendible posee un único `precio_base` actual.

## `RN-CAT-030` — Trazabilidad
Las modificaciones relevantes del catálogo deben poder asociarse al Usuario responsable y al momento de la acción.

## `RN-CAT-031` — Inmutabilidad del Tipo
El Tipo `BIEN / SERVICIO` no puede modificarse después de crear el artículo.

## `RN-CAT-032` — Estabilidad de UnidadMedida
La UnidadMedida puede modificarse mientras el cambio no altere el significado de cantidades históricas.

La existencia de historia cuantitativa es una condición derivada de los módulos consumidores que registren cantidades del artículo.

M02 no requiere un campo persistente `tiene_historia_operativa`.

La operación que confirma el cambio debe revalidar la condición contextual relevante.

## `RN-CAT-033` — Conservación del Precio al Deshabilitar Venta
Si `es_vendible` cambia de `True` a `False`, el `precio_base` existente se conserva y `permite_descuento` se ajusta a `False` dentro de la misma operación.

## `RN-CAT-034` — Nombre Único de Categoría
Dentro de un Negocio no pueden existir Categorías con nombres equivalentes luego de normalización funcional.

La regla incluye Categorías ACTIVAS e INACTIVAS.

Si existe una Categoria equivalente INACTIVA, el sistema debe informar su existencia y ofrecer reactivación en lugar de crear un duplicado.

## `RN-CAT-035` — Modificación del SKU Actual

La política del MVP es:

```text
A → B
→ B debe estar disponible
→ al confirmar B, A queda libre

A → null
→ al confirmar, A queda libre

null → B
→ B debe estar disponible

A → A
→ no-op
```

La validación de disponibilidad y la mutación deben confirmarse de manera consistente.

M02 no reserva permanentemente SKUs históricos.

## `RN-CAT-036` — Capacidades Comerciales y Estructurales

Capacidades comerciales:

```text
es_comprable
es_vendible
permite_descuento
```

pueden cambiar aunque exista historia, porque afectan operaciones futuras.

Capacidades estructurales:

```text
controla_stock
controla_vencimiento
puede_usarse_en_produccion
```

requieren validar compatibilidad con dependencias operativas existentes.

La existencia de historia por sí sola no implica bloqueo permanente.

## `RN-CAT-037` — Capacidades son Elegibilidades

Las capacidades no representan hechos operativos.

En particular:

```text
controla_stock != stock
controla_vencimiento != fecha de vencimiento
puede_usarse_en_produccion != receta
es_vendible != Venta
es_comprable != Compra
```

Los hechos pertenecen a los módulos consumidores.

## `RN-CAT-038` — Guardias Contextuales y Confirmación

Las reglas que dependen del conjunto del Negocio o de módulos consumidores no pueden considerarse garantizadas únicamente por una consulta previa.

Esto incluye, entre otras:

- unicidad de SKU;
- unicidad de Categoria;
- pertenencia Categoria/Articulo al mismo Negocio;
- Categoria ACTIVA para nueva asociación;
- dependencias estructurales;
- historia cuantitativa;
- eliminación física;
- reactivación cuando requiere contexto externo.

La validación contextual relevante y la mutación deben confirmarse de manera consistente.

La implementación técnica se define posteriormente.

## `RN-CAT-039` — Estado Actual vs. Historia

M02 representa la configuración ACTUAL del catálogo.

Los módulos consumidores deben preservar los valores históricos necesarios para interpretar correctamente sus propias operaciones.

M02 no implementa un historial universal de todos sus atributos.

## `RN-CAT-040` — Autorización Contextual

Los métodos del dominio no autorizan actores.

Antes de una mutación, el Caso de Uso debe validar:

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
```

No se introduce RBAC dinámico para el MVP.

---

# 32. Casos de Uso

## CU-CAT-01 — Consultar Catálogo

Actor principal: Miembro del Negocio.

Precondiciones:
- Usuario autenticado;
- Negocio seleccionado;
- membresía ACTIVA.

Flujo principal:
1. El Usuario accede al Catálogo.
2. El sistema identifica el Negocio autorizado.
3. Obtiene sus artículos.
4. Muestra inicialmente los artículos ACTIVOS.
5. El Usuario puede seleccionar un artículo.
6. El sistema muestra su detalle.

Información resumida posible:

```text
Nombre
Tipo
Categoria
Precio
Estado
```

Sin artículos, se muestra un estado vacío comprensible y, si posee permisos, la acción `[ Crear primer artículo ]`.

---

## CU-CAT-02 — Buscar y Filtrar Catálogo

Actor principal: Miembro.

Flujo:
1. El Usuario ingresa un término.
2. El sistema busca únicamente dentro del Negocio autorizado.
3. Puede aplicar filtros.

Filtros iniciales:

```text
Tipo
Categoria
Estado
```

Podrán incorporarse filtros por capacidades si aportan valor a UX.

---

## CU-CAT-03 — Gestionar Categorías

Actor principal: Propietario.

Precondiciones:
- Usuario autenticado;
- Negocio identificado;
- membresía ACTIVA;
- permiso concreto de M02 para administrar Categorías.

### Crear

1. Accede a Categorías.
2. Selecciona `Nueva categoría`.
3. Ingresa nombre.
4. El sistema normaliza funcionalmente para comparar equivalencias.
5. Confirma que no exista una equivalente ACTIVA o INACTIVA dentro del Negocio.
6. Si no existe, crea la Categoria ACTIVA.

Categoria equivalente INACTIVA:
- no crea un duplicado;
- informa que ya existe;
- ofrece `[ Reactivar ]`.

Mensaje orientativo:

> Ya existe la categoría "BEBIDAS" y se encuentra inactiva. Podés reactivarla para volver a utilizarla.

La validación previa sirve para UX. La operación que crea debe volver a garantizar la unicidad al confirmar.

### Editar

1. Selecciona Categoria.
2. Modifica nombre.
3. El sistema valida unicidad normalizada dentro del Negocio.
4. Confirma de manera consistente.
5. Conserva identidad y relaciones.

### Desactivar

1. Selecciona Categoria.
2. Solicita desactivación.
3. Confirma.
4. La Categoria queda INACTIVA.
5. Sus artículos conservan estado y asociaciones.

### Reactivar

1. Selecciona Categoria INACTIVA.
2. Solicita reactivación.
3. Confirma.
4. La misma Categoria vuelve a ACTIVA.
5. Conserva todas sus relaciones.

### Eliminar

1. Solicita eliminar.
2. El sistema puede informar preliminarmente si parece eliminable.
3. Al confirmar, vuelve a validar que no existan artículos asociados ni otras dependencias que conservar.
4. Solo entonces elimina físicamente.

---

## CU-CAT-04 — Crear Artículo

Actor principal: Propietario.

Precondiciones:
- Usuario autenticado;
- Negocio identificado;
- membresía ACTIVA;
- permiso concreto de M02 para crear artículos.

Flujo principal:
1. Selecciona `Nuevo artículo`.
2. El sistema pregunta `¿Qué querés agregar? [ Bien ] [ Servicio ]`.
3. Selecciona Tipo.
4. Ingresa Nombre.
5. Opcionalmente selecciona Categoria.
6. Si selecciona Categoria:
   - debe pertenecer al mismo Negocio;
   - debe encontrarse ACTIVA para esta nueva asociación.
7. Define UnidadMedida:
   - BIEN: selección explícita;
   - SERVICIO: `UNIDAD` por defecto.
8. Indica cómo utiliza el artículo.
9. Si es vendible, ingresa `precio_base`.
10. Opcionalmente agrega `costo_referencia`, SKU, descripción e imagen.
11. El sistema construye y valida la configuración completa de capacidades.
12. Valida guardias contextuales como SKU, Categoria y pertenencia.
13. Presenta resumen.
14. Confirma.
15. Las validaciones contextuales relevantes se vuelven a garantizar al persistir el cambio.
16. El artículo queda ACTIVO.

Para SERVICIO:

```text
controla_stock = False
controla_vencimiento = False
puede_usarse_en_produccion = False
```

El SKU repetido se rechaza incluso si el artículo existente está INACTIVO.

La Categoria puede omitirse.

---

## CU-CAT-05 — Editar Artículo

Actor principal: Propietario.

Precondiciones:
- Usuario autenticado;
- Negocio identificado;
- membresía ACTIVA;
- permiso concreto de M02 para editar el artículo.

Flujo principal:
1. Abre el artículo.
2. Selecciona `Editar`.
3. Modifica datos permitidos.
4. El sistema construye la nueva configuración propuesta.
5. Valida reglas locales.
6. Valida guardias contextuales necesarias.
7. Presenta los ajustes derivados cuando correspondan.
8. Confirma.
9. Las guardias contextuales relevantes y la mutación se confirman de manera consistente.
10. Se actualiza la configuración vigente.

Puede modificarse, cuando corresponda:
- nombre;
- descripción;
- Categoria;
- SKU;
- imagen;
- precio_base;
- costo_referencia;
- capacidades;
- UnidadMedida cuando no contradiga RN-CAT-032.

No puede modificarse:

```text
tipo
```

### Cambio de Categoria

Si se asigna o reasigna Categoria:

```text
Categoria.negocio = ArticuloCatalogo.negocio
Categoria.estado = ACTIVA
```

Una Categoria ya asociada puede permanecer INACTIVA sin invalidar por sí sola el artículo.

### Cambio de SKU

Aplicar RN-CAT-035.

Ejemplos:

```text
A → B
→ validar B
→ confirmar B
→ liberar A

A → null
→ confirmar
→ liberar A
```

### Cambio de capacidades

Las capacidades se actualizan como una configuración completa.

Si:

```text
es_vendible False → True
```

debe existir:

```text
precio_base >= 0
```

Si:

```text
es_vendible True → False
```

entonces en la misma operación:

```text
permite_descuento = False
precio_base se conserva
```

Las capacidades comerciales pueden cambiar sin reescribir historia.

Las capacidades estructurales requieren validar las dependencias que correspondan.

Las restricciones concretas sobre stock, lotes, recetas y producción se completarán junto con M04 y M07.

### Cambio de UnidadMedida

Aplicar RN-CAT-032.

Una preconsulta puede orientar al Usuario, pero la operación debe revalidar la historia cuantitativa relevante al confirmar.

Los cambios no reescriben operaciones anteriores.

---

## CU-CAT-06 — Activar / Desactivar / Reactivar Artículo

Actor principal: Propietario o Encargado.

Precondiciones:
- Usuario autenticado;
- Negocio identificado;
- membresía ACTIVA;
- permiso concreto de M02 para la transición solicitada.

### Desactivar

1. Selecciona artículo ACTIVO.
2. Solicita `Desactivar`.
3. Confirma.
4. El artículo queda INACTIVO.

La desactivación:
- conserva identidad;
- conserva SKU actual;
- conserva historia;
- conserva referencias;
- no altera stock ni lotes gestionados por M04.

### Reactivar

1. Consulta artículos INACTIVOS.
2. Selecciona uno.
3. Solicita reactivación.
4. El sistema valida las invariantes necesarias para volver a operar.
5. Valida las guardias contextuales aplicables.
6. Confirma.
7. El mismo artículo vuelve a ACTIVO.

La reactivación no crea una copia.

Una Categoria históricamente asociada e INACTIVA no bloquea por sí sola la reactivación.

---

## CU-CAT-07 — Eliminar Artículo

Actor principal: Propietario.

Precondiciones:
- Usuario autenticado;
- Negocio identificado;
- membresía ACTIVA;
- permiso concreto de M02 para eliminar.

Flujo:
1. Solicita eliminar.
2. El sistema puede realizar una preconsulta para orientar la UX.
3. Si preliminarmente existen referencias, informa que no puede eliminarse y ofrece `[ Desactivar ]`.
4. Si parece eliminable, solicita confirmación.
5. Al confirmar, vuelve a validar:
   - historia relevante;
   - referencias;
   - dependencias.
6. Solo si todas las condiciones siguen cumpliéndose, elimina físicamente.
7. El SKU actual queda disponible.

La preconsulta no sustituye la validación definitiva.

---

# 33. Historias de Usuario

## `HU-CAT-001` — Crear un Bien
Como Propietario, quiero crear un bien con pocos datos obligatorios, para incorporarlo rápidamente al catálogo.

## `HU-CAT-002` — Crear un Servicio
Como Propietario de un negocio de servicios, quiero registrar prestaciones sin configurar inventario, para utilizar el sistema sin opciones que no corresponden a mi actividad.

## `HU-CAT-003` — Combinar Usos
Como Propietario, quiero indicar si un bien se compra, vende o utiliza en producción, para representar cómo funciona realmente dentro del negocio.

## `HU-CAT-004` — Organizar con Categorías
Como Propietario, quiero crear y reutilizar mis propias Categorías, para organizar el catálogo según mi actividad sin generar duplicados.

## `HU-CAT-005` — Crear Rápidamente
Como feriante o pequeño comerciante, quiero evitar formularios extensos, para comenzar a utilizar el sistema rápidamente.

## `HU-CAT-006` — Cambiar Precio sin Alterar Historia
Como Propietario, quiero modificar el precio actual, para utilizar un nuevo valor sin afectar ventas anteriores.

## `HU-CAT-007` — Retirar sin Borrar Historia
Como Propietario o Encargado, quiero desactivar un artículo, para evitar utilizarlo normalmente en nuevas operaciones sin perder información anterior.

## `HU-CAT-008` — Buscar Rápidamente
Como Trabajador, quiero localizar artículos fácilmente, para operar con agilidad.

## `HU-CAT-009` — Gestionar SKU sin Ambigüedad
Como Propietario, quiero asignar, cambiar o quitar el SKU actual de un artículo preservando su unicidad dentro del Negocio, para mantener códigos operativos claros sin convertir el SKU en la identidad técnica del artículo.

## `HU-CAT-010` — Reactivar de Forma Segura
Como Propietario o Encargado, quiero reactivar el mismo artículo solo cuando su configuración siga siendo válida, para recuperar su uso sin duplicar identidad ni reescribir historia.

---

# 34. Estados y Transiciones

## ArticuloCatalogo

```text
                 crear válido
                     │
                     ▼
                 ┌─────────┐
                 │ ACTIVO  │
                 └────┬────┘
                      │
                 desactivar
                      │
                      ▼
                ┌──────────┐
                │ INACTIVO │
                └────┬─────┘
                     │
          reactivar + revalidar
                     │
                     ▼
                  ACTIVO
```

Reglas:

```text
ACTIVO
→ exige invariantes necesarias para operar

INACTIVO
→ puede quedar sin uso operativo
→ conserva identidad e historia
```

La eliminación física NO es un estado.

Solo puede ejecutarse cuando no existe historia, referencias ni dependencias que deban conservarse.

## Categoria

```text
ACTIVA
  │
desactivar
  ▼
INACTIVA
  │
reactivar
  ▼
ACTIVA
```

Una Categoria INACTIVA conserva sus asociaciones existentes, pero no admite nuevas asociaciones ni reasignaciones.

La eliminación física tampoco constituye un estado.

---

# 35. Excepciones y Errores Funcionales

| Condición | Efecto | Mensaje orientativo |
| :--- | :--- | :--- |
| Nombre faltante | Rechaza creación/edición. | **Ingresá un nombre para continuar.** |
| BIEN sin unidad | Rechaza operación. | **Seleccioná cómo se mide este artículo.** |
| Vendible sin precio | Rechaza operación. | **Ingresá un precio base para este artículo.** |
| Precio negativo | Rechaza operación. | **El precio no puede ser negativo.** |
| Costo negativo | Rechaza operación. | **El costo no puede ser negativo.** |
| SERVICIO con stock | Rechaza operación. | **Los servicios no utilizan control de stock.** |
| SERVICIO con vencimiento | Rechaza operación. | **Los servicios no utilizan vencimientos de inventario.** |
| SERVICIO en producción | Rechaza operación. | **Los servicios no pueden utilizarse como insumos de producción.** |
| Producción sin stock | Rechaza operación. | **Los artículos usados en producción deben controlar stock.** |
| Vencimiento sin stock | Rechaza operación. | **Para controlar vencimientos también necesitás controlar stock.** |
| Descuento sin venta | Rechaza una configuración inválida. | **Solo los artículos vendibles pueden permitir descuentos.** |
| Habilitar venta sin precio válido | Rechaza transición. | **Definí un precio base válido antes de habilitar la venta.** |
| Deshabilitar venta con descuento habilitado | Ajusta `permite_descuento = False` en la misma edición. | **Al dejar de vender este artículo, los descuentos también quedan deshabilitados.** |
| SKU destino repetido activo o inactivo | Rechaza operación sin liberar el SKU actual. | **Este código ya pertenece a otro artículo del negocio.** |
| Categoria equivalente ACTIVA | Rechaza creación. | **Ya existe una categoría con este nombre.** |
| Categoria equivalente INACTIVA | Rechaza creación de duplicado y ofrece reactivación. | **Ya existe esta categoría y se encuentra inactiva. Podés reactivarla para volver a utilizarla.** |
| Nueva asociación a Categoria INACTIVA | Rechaza asociación. | **Esta categoría está inactiva. Reactivala antes de asignarla.** |
| Categoria de otro Negocio | Rechaza operación. | **La categoría seleccionada no pertenece a este negocio.** |
| Artículo de otro Negocio | Rechaza operación. | **No tenés acceso a este artículo.** |
| Cambiar BIEN ↔ SERVICIO | Rechaza modificación. | **El tipo del artículo no puede modificarse después de crearlo.** |
| Cambiar unidad con historia incompatible | Rechaza modificación. | **La unidad no puede cambiarse porque alteraría cantidades ya registradas.** |
| Cambio estructural incompatible con dependencias | Rechaza modificación. | **Esta configuración no puede cambiarse mientras existan dependencias incompatibles.** |
| Reactivar con configuración inválida | Rechaza reactivación y conserva INACTIVO. | **Revisá la configuración del artículo antes de reactivarlo.** |
| Eliminar artículo utilizado | Rechaza eliminación. | **Este artículo posee historial. Podés desactivarlo.** |
| Eliminar Categoria con artículos asociados ACTIVOS o INACTIVOS | Rechaza eliminación. | **Esta categoría está asociada a artículos y no puede eliminarse. Podés desactivarla.** |
| Guardia contextual cambia entre preconsulta y confirmación | Rechaza o reintenta la operación sin persistir un estado inválido. | **La información cambió. Revisá los datos y volvé a intentar.** |
| Encargado intenta editar artículo | Rechaza operación. | **No tenés permisos para editar el catálogo.** |
| Encargado modifica Categoria | Rechaza operación. | **Solo el propietario puede administrar categorías.** |
| Trabajador intenta modificar | Rechaza operación. | **No tenés permisos para modificar el catálogo.** |
| Artículo inactivo en nueva operación normal | Impide selección normal. | **Este artículo se encuentra inactivo.** |

Los mensajes finales pertenecen a UX y podrán ajustarse sin modificar las reglas funcionales.

---

# 36. Interacción con Otros Módulos

## M01 — Organización

M01 proporciona:

```text
Usuario
Negocio
UsuarioNegocio
Rol
```

M02 utiliza estos conceptos para:

- aislar catálogos;
- identificar el Negocio autorizado;
- aplicar los permisos concretos del módulo;
- registrar al Usuario responsable;
- utilizar la moneda base del Negocio.

Los métodos de dominio de M02 no autorizan actores por sí solos.

## M03 — Compras y Proveedores

M03 podrá utilizar artículos con:

```text
es_comprable = True
```

Un artículo comprable puede o no controlar stock.

Las Compras que necesiten conservar valores históricos relevantes del artículo deberán almacenarlos dentro de su propio contexto operativo.

Modificar posteriormente el catálogo no reescribe una Compra anterior.

## M04 — Inventario y Ubicaciones

M04 únicamente administra existencias de artículos cuando:

```text
controla_stock = True
```

Si `controla_stock = False`, el artículo queda fuera del inventario.

`controla_stock` no representa una cantidad de stock dentro de M02.

`controla_vencimiento` no representa una fecha de vencimiento dentro de `ArticuloCatalogo`; las fechas concretas corresponderán a las existencias/lotes de M04.

M04 completará restricciones sobre cambios estructurales cuando existan:

- stock;
- lotes;
- movimientos;
- otras dependencias de inventario.

M04 podrá definir políticas operativas como tolerancia o no de stock negativo sin modificar las invariantes estructurales de M02.

## M05 — Ventas y Pagos

M05 utiliza:

```text
es_vendible = True
```

y toma `precio_base` como referencia inicial.

La Venta conserva el precio realmente aplicado y cualquier otro valor histórico que necesite interpretar correctamente la operación.

Modificar:

```text
precio_base
nombre
SKU
Categoria
```

en M02 no debe reinterpretar una Venta anterior.

## M06 — Caja y Gastos

M02 no representa movimientos de caja.

M06 procesa efectos económicos derivados de operaciones.

## M07 — Producción

M07 podrá consumir artículos con:

```text
puede_usarse_en_produccion = True
```

que necesariamente cumplen:

```text
tipo = BIEN
controla_stock = True
```

`puede_usarse_en_produccion` expresa elegibilidad; no significa que la receta pertenezca a M02.

M07 completará restricciones para modificar capacidades estructurales cuando existan recetas, consumos o producciones dependientes.

Los resultados de producción también se representan mediante ArticuloCatalogo.

No existe una clase separada `ProductoTerminado`.

## M08 — Analítica

M08 podrá utilizar como dimensiones:

```text
Artículo
Categoria
Tipo
```

entre otras.

Cuando un análisis necesite representar el estado histórico de una operación, deberá apoyarse en los valores históricos preservados por el módulo que originó dicha operación y no reconstruir necesariamente el pasado a partir del estado actual de M02.

---

# 37. Matriz de Trazabilidad Inicial

| RF | RN principales | HU | CU |
| :--- | :--- | :--- | :--- |
| RF-CAT-001 | RN-CAT-001, RN-CAT-023, RN-CAT-040 | HU-CAT-008 | CU-CAT-01 |
| RF-CAT-002 | RN-CAT-001, RN-CAT-040 | HU-CAT-008 | CU-CAT-02 |
| RF-CAT-003 | RN-CAT-001, RN-CAT-040 | HU-CAT-008 | CU-CAT-01 |
| RF-CAT-004 | RN-CAT-002, RN-CAT-019, RN-CAT-034, RN-CAT-038, RN-CAT-040 | HU-CAT-004 | CU-CAT-03 |
| RF-CAT-005 | RN-CAT-019, RN-CAT-034, RN-CAT-038, RN-CAT-040 | HU-CAT-004 | CU-CAT-03 |
| RF-CAT-006 | RN-CAT-019, RN-CAT-028, RN-CAT-040 | HU-CAT-004 | CU-CAT-03 |
| RF-CAT-007 | RN-CAT-021, RN-CAT-038, RN-CAT-040 | HU-CAT-004 | CU-CAT-03 |
| RF-CAT-008 | RN-CAT-010, RN-CAT-011, RN-CAT-032 | HU-CAT-001, HU-CAT-002 | CU-CAT-04 / CU-CAT-05 |
| RF-CAT-009 | RN-CAT-003 a RN-CAT-013, RN-CAT-016, RN-CAT-018, RN-CAT-031, RN-CAT-034, RN-CAT-038, RN-CAT-040 | HU-CAT-001, HU-CAT-002, HU-CAT-003, HU-CAT-005 | CU-CAT-04 |
| RF-CAT-010 | RN-CAT-008, RN-CAT-012 a RN-CAT-016, RN-CAT-019, RN-CAT-031 a RN-CAT-039, RN-CAT-040 | HU-CAT-003, HU-CAT-006, HU-CAT-009 | CU-CAT-05 |
| RF-CAT-011 | RN-CAT-023, RN-CAT-028, RN-CAT-040 | HU-CAT-007 | CU-CAT-06 |
| RF-CAT-012 | RN-CAT-019, RN-CAT-022, RN-CAT-038, RN-CAT-040 | HU-CAT-007, HU-CAT-010 | CU-CAT-06 |
| RF-CAT-013 | RN-CAT-020, RN-CAT-021, RN-CAT-038, RN-CAT-040 | HU-CAT-007 | CU-CAT-07 |
| RF-CAT-014 | RN-CAT-012, RN-CAT-014, RN-CAT-027, RN-CAT-029, RN-CAT-033, RN-CAT-039, RN-CAT-040 | HU-CAT-006 | CU-CAT-05 |
| RF-CAT-015 | RN-CAT-013, RN-CAT-015, RN-CAT-039, RN-CAT-040 | HU-CAT-003 | CU-CAT-05 |
| RF-CAT-016 | RN-CAT-004 a RN-CAT-009, RN-CAT-012, RN-CAT-033, RN-CAT-036 a RN-CAT-038, RN-CAT-040 | HU-CAT-003 | CU-CAT-04 / CU-CAT-05 |
| RF-CAT-017 | RN-CAT-025, RN-CAT-040 | HU-CAT-001 | CU-CAT-04 / CU-CAT-05 |
| RF-CAT-018 | RN-CAT-001, RN-CAT-002, RN-CAT-038, RN-CAT-040 | — | Todos |
| RF-CAT-019 | RN-CAT-016, RN-CAT-035, RN-CAT-038, RN-CAT-040 | HU-CAT-009 | CU-CAT-04 / CU-CAT-05 / CU-CAT-07 |
| RF-CAT-020 | RN-CAT-031 | HU-CAT-001, HU-CAT-002 | CU-CAT-04 / CU-CAT-05 |
| RF-CAT-021 | RN-CAT-032, RN-CAT-038 | HU-CAT-003 | CU-CAT-05 |
| RF-CAT-022 | RN-CAT-021, RN-CAT-032, RN-CAT-034 a RN-CAT-038 | HU-CAT-009, HU-CAT-010 | CU-CAT-03 a CU-CAT-07 |
| RF-CAT-023 | RN-CAT-028, RN-CAT-040 | Todas las que impliquen mutación | Todos los CU de mutación |

---

# 38. Criterios de Aceptación del Módulo

M02 se considera funcionalmente completo para el MVP cuando se verifica que:

1. Cada Negocio posee su propio catálogo aislado.
2. No pueden consultarse ni modificarse recursos de otro Negocio sin autorización.
3. Toda mutación valida Usuario autenticado + Negocio + Membresía ACTIVA + Rol + permiso concreto de M02.
4. Puede crearse un BIEN.
5. Puede crearse un SERVICIO.
6. El Tipo no puede modificarse después de la creación.
7. Un SERVICIO nunca controla stock.
8. Un SERVICIO nunca controla vencimiento.
9. Un SERVICIO no puede utilizarse en producción.
10. Un SERVICIO recibe `UNIDAD` como unidad inicial.
11. Un SERVICIO puede configurarse con `HORA` u otra unidad válida.
12. Un BIEN requiere UnidadMedida.
13. Un artículo puede ser comprable.
14. Un artículo puede ser vendible.
15. Un BIEN puede ser simultáneamente comprable y vendible.
16. Un artículo usado en producción debe ser BIEN.
17. Un artículo usado en producción debe controlar stock.
18. Un artículo ACTIVO posee al menos un uso operativo.
19. Un artículo INACTIVO puede quedar sin uso operativo.
20. Las capacidades son elegibilidades y no contienen stock, fechas de lotes, ventas, compras ni recetas.
21. Un artículo puede existir sin Categoria.
22. Cada Categoria pertenece a un solo Negocio.
23. ArticuloCatalogo y Categoria asociada pertenecen al mismo Negocio.
24. No pueden existir Categorías equivalentes dentro del mismo Negocio.
25. La unicidad de Categoria incluye ACTIVAS e INACTIVAS.
26. Si se intenta crear una Categoria equivalente a otra INACTIVA, el sistema ofrece reactivar la existente.
27. Una Categoria INACTIVA no desactiva sus artículos.
28. Una Categoria INACTIVA conserva asociaciones existentes.
29. Una Categoria INACTIVA no puede utilizarse para una nueva asociación ni reasignación.
30. Una Categoria histórica INACTIVA no bloquea por sí sola reactivar un artículo.
31. Una Categoria no puede eliminarse físicamente mientras tenga artículos asociados ACTIVOS o INACTIVOS.
32. Las unidades son normalizadas.
33. Se admiten cantidades fraccionarias.
34. Antes de cambiar UnidadMedida se verifica historia cuantitativa relevante.
35. No puede cambiarse UnidadMedida si ello altera el significado de cantidades históricas.
36. Un artículo vendible requiere `precio_base`.
37. `precio_base = 0` es válido.
38. `precio_base < 0` es inválido.
39. Habilitar venta requiere un `precio_base` válido al confirmar.
40. Deshabilitar `es_vendible` conserva `precio_base`.
41. Deshabilitar `es_vendible` ajusta automáticamente `permite_descuento = False`.
42. Cambiar `precio_base` no modifica operaciones históricas.
43. `costo_referencia` es opcional.
44. `costo_referencia < 0` es inválido.
45. Cambiar `costo_referencia` no modifica operaciones históricas.
46. Un SKU es opcional.
47. Un SKU actual informado es único dentro del Negocio.
48. La unicidad de SKU incluye artículos ACTIVOS e INACTIVOS.
49. Desactivar un artículo no libera su SKU actual.
50. `SKU A → B` exige que B esté disponible y libera A únicamente al confirmar B.
51. `SKU A → null` libera A únicamente al confirmar.
52. `null → B` exige que B esté disponible.
53. `SKU A → A` no produce cambio funcional.
54. Cambiar SKU no modifica la identidad técnica del artículo.
55. M02 no mantiene historial de SKU durante el MVP.
56. Una imagen es opcional.
57. El MVP permite una sola imagen principal.
58. Las variantes se representan como artículos independientes.
59. El Propietario puede crear y editar artículos.
60. El Propietario administra Categorías.
61. El Encargado puede activar, desactivar y reactivar artículos.
62. El Encargado no puede editar configuración de artículos.
63. El Encargado no puede modificar precio, costo, SKU, UnidadMedida ni capacidades.
64. El Encargado no puede administrar Categorías.
65. El Trabajador puede consultar.
66. El Trabajador no puede modificar.
67. Un artículo con historia no puede eliminarse físicamente.
68. Un artículo con historia puede desactivarse.
69. Desactivar no elimina ni modifica stock/lotes gestionados por M04.
70. Un artículo INACTIVO puede reactivarse reutilizando la misma identidad.
71. Reactivar revalida las invariantes necesarias para volver a operar.
72. Una reactivación inválida se rechaza sin crear una copia.
73. Un artículo sin control de stock no participa de Inventario.
74. Las combinaciones inválidas de capacidades son rechazadas.
75. Las capacidades comerciales pueden cambiar sin reescribir historia.
76. Los cambios estructurales incompatibles con dependencias existentes se rechazan.
77. La mera existencia de historia no bloquea automáticamente toda modificación estructural.
78. Una preconsulta de UX no reemplaza la revalidación de guardias contextuales al confirmar una mutación.
79. La eliminación real revalida historia, referencias y dependencias.
80. M02 representa la configuración ACTUAL del catálogo.
81. Los módulos consumidores preservan los valores históricos necesarios para sus propias operaciones.
82. La UI puede ocultar configuraciones incompatibles según Tipo y capacidades.

---

# 39. Alcance MVP

## MUST HAVE

```text
Catálogo por Negocio

BIEN
SERVICIO

Tipo inmutable

Categorías configurables
Categoria opcional
Categoria INACTIVA conserva asociaciones existentes
Sin nuevas asociaciones a Categoria INACTIVA

Unidades normalizadas
UNIDAD automática para servicios
Protección de historia cuantitativa

Crear artículo
Editar artículo
Consultar
Buscar

Activar
Desactivar
Reactivar con revalidación

Eliminación segura con revalidación

Precio base
Precio cero permitido
Habilitar venta exige precio válido
Deshabilitar venta conserva precio y deshabilita descuento

Costo de referencia

SKU opcional
SKU actual único por Negocio
Cambio y remoción de SKU con liberación del valor anterior al confirmar

Descripción opcional
Imagen opcional

Capacidades
Actualización completa y consistente
Diferencia entre capacidades comerciales y estructurales

Cantidades fraccionarias

Aislamiento entre Negocios
Guardias contextuales consistentes

Permisos estrictos por módulo

Conservación histórica
Estado actual de M02 separado de historia de módulos consumidores
```

---

# 40. Fuera del MVP / Evolución Futura

```text
Variantes estructuradas

Talles / colores dinámicos

Múltiples imágenes

Galerías

Código de barras

Escaneo de códigos

Importación CSV / Excel

Catálogo público

E-commerce

Listas múltiples de precios

Precio mayorista

Precio por ubicación

Precio por canal

Precios programados

Historial avanzado de precios

Categorías jerárquicas

Subcategorías

Unidades personalizadas por Negocio

Atributos dinámicos

Paquetes

Combos complejos

Productos compuestos

Conversión histórica automática de unidades
```

Estas funcionalidades no deberán incorporarse accidentalmente durante el Bloque 1.

---

# 41. Consideraciones de UX

El usuario objetivo puede poseer experiencia tecnológica baja o media.

Por lo tanto:

```text
modelo flexible
≠
interfaz compleja
```

La UI debe:

- utilizar lenguaje cotidiano;
- presentar pocos campos inicialmente;
- ocultar opciones incompatibles;
- marcar datos obligatorios;
- permitir artículos sin imagen;
- permitir artículos sin SKU;
- permitir artículos sin Categoria;
- evitar formularios extensos;
- priorizar celular;
- mantener búsqueda visible;
- diferenciar Bien y Servicio claramente;
- evitar que el usuario tenga que comprender la implementación interna.

## 41.1. Creación Rápida

Experiencia buscada:

```text
Nuevo
 ↓
Bien / Servicio
 ↓
Nombre
 ↓
¿Cómo lo usás?
 ↓
Precio
 ↓
Guardar
```

No:

```text
Formulario enorme
       ↓
campos técnicos
       ↓
configuración innecesaria
       ↓
abandono
```

## 41.2. Defaults como Ayuda, no como Complejidad

La UI puede utilizar valores iniciales sensatos.

Ejemplo de SERVICIO:

```text
es_vendible = True
controla_stock = False
controla_vencimiento = False
puede_usarse_en_produccion = False
UnidadMedida = UNIDAD
```

El Usuario no necesita ver todas estas decisiones si no debe modificarlas.

Los valores exactos iniciales de otros tipos deberán validarse durante UX y Diseño Técnico.

---

# 42. Consideraciones para Diseño Técnico

Este documento NO define todavía:

- tipos SQL;
- precisión exacta de `Numeric`/decimal;
- nombres definitivos de tablas;
- enums SQL;
- restricciones SQL concretas;
- índices;
- estrategia de almacenamiento de imágenes;
- estrategia técnica de eliminación física;
- implementación concreta de auditoría;
- endpoints REST;
- schemas Pydantic;
- clases SQLAlchemy;
- formato de IDs;
- normalización técnica de SKU;
- normalización técnica de Categoria;
- mecanismo concreto de contexto de Negocio;
- estrategia de transacciones;
- locking optimista/pesimista;
- Repository;
- Unit of Work;
- Service Layer concreto;
- forma de consultar dependencias entre módulos;
- mecanismo concreto para preservar valores históricos en módulos consumidores.

Estas decisiones pertenecen al Diseño Técnico / Arquitectura del Bloque 1.

Sin cerrar la solución técnica, la implementación futura deberá garantizar las siguientes propiedades:

## 42.1. Dinero

Los importes monetarios requieren una representación decimal exacta.

No utilizar una representación binaria inexacta de punto flotante para persistir valores monetarios.

La precisión concreta se decidirá en Diseño Técnico.

## 42.2. Cantidades

El dominio admite cantidades fraccionarias.

La representación técnica no debe restringir artificialmente cantidades a enteros.

La precisión y escala concretas se definirán posteriormente.

## 42.3. Unicidades Contextuales

Reglas como:

```text
SKU único por Negocio
Categoria normalizada única por Negocio
```

deben quedar protegidas incluso ante operaciones concurrentes.

No alcanza con confiar exclusivamente en una validación realizada previamente desde la UI.

El Diseño Técnico deberá elegir los mecanismos que garanticen la invariante.

## 42.4. Validación y Mutación

Para guardias contextuales:

```text
preconsulta
→ útil para UX

confirmación
→ debe volver a garantizar la condición
```

La implementación debe impedir estados parcialmente confirmados o inconsistentes.

El mecanismo técnico queda abierto.

## 42.5. Estado Actual e Historia

M02 representa la configuración actual.

No debe implementarse un historial universal de `ArticuloCatalogo` por defecto únicamente para reconstruir operaciones anteriores.

Los módulos transaccionales deben conservar los valores históricos que necesiten.

La estrategia concreta se definirá módulo por módulo.

---

# 43. Decisiones Deliberadamente Postergadas

## 43.1. Desactivar control de stock con dependencias

Ejemplo:

```text
Articulo
controla_stock = True

+
stock / lotes / movimientos existentes

+
Propietario intenta:
controla_stock = False
```

M02 establece que esta transición requiere validar compatibilidad con las dependencias operativas existentes.

La política completa se definirá junto con:

```text
M04 — Inventario y Ubicaciones
```

La mera existencia de historia antigua no implica automáticamente que `controla_stock` quede bloqueado para siempre.

M04 deberá distinguir las dependencias que realmente impiden la transición.

## 43.2. Quitar capacidad de Producción con dependencias

Ejemplo:

```text
Artículo
puede_usarse_en_produccion = True

+
recetas / dependencias productivas

+
Propietario intenta:
puede_usarse_en_produccion = False
```

M02 establece que la transición no puede volver inconsistente una dependencia existente ni alterar el significado histórico que deba preservarse.

La política se completará junto con:

```text
M07 — Producción
```

## 43.3. Tolerancia Operativa

Situaciones operativas como:

```text
stock negativo
diferencia física pendiente
ajuste posterior
```

no se resuelven relajando las invariantes estructurales de M02.

M04/M05 decidirán si determinadas operaciones excepcionales pueden continuar y cómo se regularizan.

## 43.4. Regla General

M02 define:

```text
qué capacidades existen
+
qué combinaciones son válidas
+
qué transiciones requieren contexto externo
```

Los módulos consumidores completarán las restricciones que dependen de su propio estado operativo.

No utilizar como regla genérica:

```text
si existe cualquier historia
→ bloquear cualquier cambio para siempre
```

La decisión debe depender de la compatibilidad real con las dependencias que deban conservarse.

---

# 44. Consistencia Transversal

Esta especificación adopta para M02:

```text
PROPIETARIO
→ administración completa

ENCARGADO
→ consulta
→ activar/desactivar/reactivar artículos

TRABAJADOR
→ consulta
```

Además:

```text
Gestión de Categorías
→ exclusivamente PROPIETARIO
```

y:

```text
Editar configuración de ArticuloCatalogo
→ exclusivamente PROPIETARIO
```

Esto incluye, entre otras:

```text
precio_base
costo_referencia
SKU
UnidadMedida
Capacidades
Categoria
```

Los métodos del dominio no autorizan por sí mismos a un actor.

Cada Caso de Uso debe interpretar el contexto:

```text
Usuario
+
Negocio
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso concreto de M02
```

No se introduce una entidad `Permiso` ni RBAC dinámico durante el MVP.

La documentación transversal de actores y permisos deberá reflejar exactamente esta política antes de cerrar el Bloque 1.

---

# 45. Criterio Rector

El catálogo debe poder representar:

```text
un kilo de harina
un collar
una torta
una remera
una hora de asesoramiento
un servicio de maquillaje
```

sin crear un modelo diferente para cada negocio.

Al mismo tiempo, el Usuario no debe necesitar comprender esa flexibilidad interna.

La experiencia debe aproximarse a:

```text
¿Qué querés agregar?
        ↓
Bien o Servicio
        ↓
¿Cómo lo usás?
        ↓
Guardar
```

El criterio rector del módulo es:

> **un catálogo genérico por capacidades, protegido por reglas estrictas de consistencia y presentado mediante una experiencia sencilla para pequeños negocios.**

La flexibilidad nunca debe lograrse sacrificando:

- pertenencia al Negocio;
- historia;
- consistencia estructural;
- autorización;
- significado de cantidades;
- unicidad contextual.

---

# 46. Guía de Interpretación para Implementación e IA

Esta sección existe para evitar que una persona o IA convierta mecánicamente la especificación funcional en una implementación incorrecta.

## 46.1. Orden de Lectura

Para implementar M02 debe consultarse:

```text
M02-Catalogo.md
        ↓
01-modelo-dominio-bloque-1.md
        ↓
03-m02-catalogo-clases.md
        ↓
03-m02-catalogo-clases.puml
        ↓
ADRs / Diseño Técnico
        ↓
Modelo Relacional
        ↓
Contrato API
        ↓
Código
```

Una decisión técnica no debe contradecir silenciosamente una regla funcional.

## 46.2. No Convertir el UML en ORM Automáticamente

La existencia conceptual de:

```text
ArticuloCatalogo
Categoria
CapacidadesArticulo
UnidadMedida
```

no obliga a:

- una tabla por concepto;
- un Repository por entidad;
- una clase ORM independiente para cada Value Object;
- un Aggregate Root por clase.

Estas decisiones pertenecen a etapas posteriores.

## 46.3. No Introducir Jerarquías de Artículos

No implementar subclases rígidas:

```text
Producto
MateriaPrima
ProductoTerminado
Servicio
Insumo
```

para reproducir comportamientos que ya se expresan mediante Tipo + Capacidades.

## 46.4. Capacidades no son Datos Operativos

Nunca agregar a `ArticuloCatalogo` únicamente por interpretación del nombre de una capacidad:

```text
stockActual
fechaVencimiento
recetas
ventas
compras
```

M02 solo expresa elegibilidad.

## 46.5. Validaciones Locales vs Contextuales

Validaciones locales pueden resolverse con información de la propia configuración.

Ejemplos:

```text
SERVICIO no controla stock
descuento implica vendible
precio/costo no negativos
```

Validaciones contextuales necesitan información externa.

Ejemplos:

```text
SKU único
Categoria normalizada única
Categoria del mismo Negocio
dependencias estructurales
historia cuantitativa
eliminación física
```

No fingir que una entidad aislada conoce información que pertenece al conjunto del Negocio o a otros módulos.

## 46.6. Preconsulta no es Garantía

Métodos o consultas del tipo:

```text
puedeEliminarseFisicamente()
skuDisponible()
categoriaDisponible()
puedeCambiarUnidad()
```

pueden orientar la UX.

La operación que modifica estado debe volver a garantizar la condición al confirmar.

No implementar:

```text
if puede():
    # tiempo arbitrario
    mutar_sin_revalidar()
```

como única protección.

## 46.7. Autorización fuera del Objeto

No agregar `rol` o `usuario` a los métodos de las entidades para resolver autorización.

La autorización pertenece al Caso de Uso y al contexto M01.

Después de autorizar, el dominio sigue siendo responsable de sus propias invariantes.

## 46.8. Estado Actual vs Historia

M02 mantiene el estado actual del catálogo.

Los módulos transaccionales deben preservar los datos históricos necesarios.

No reconstruir automáticamente una Venta histórica leyendo:

```text
ArticuloCatalogo.precioBase actual
ArticuloCatalogo.nombre actual
ArticuloCatalogo.sku actual
Categoria actual
```

si la operación necesita conocer los valores que tenía en el momento original.

## 46.9. SKU no es Identidad

Nunca utilizar SKU como identidad técnica primaria del artículo.

El SKU:

```text
es opcional
es editable
puede quitarse
puede reutilizarse cuando queda libre
```

La identidad del ArticuloCatalogo debe permanecer estable independientemente del SKU.

## 46.10. No Inventar Historial de SKU

El MVP no mantiene alias ni historial permanente de códigos.

No reservar antiguos SKUs después de un cambio correctamente confirmado.

Si una operación histórica necesita el SKU utilizado en ese momento, debe preservarlo en su propio contexto.

## 46.11. Dinero y Cantidades

No implementar dinero con `float` binario.

No restringir cantidades a enteros.

Los tipos exactos se deciden posteriormente, pero deben respetar:

```text
dinero → decimal exacto
cantidades → fraccionarias cuando corresponda
```

## 46.12. No Sobrediseñar Dependencias Futuras

M02 conoce que determinados cambios necesitarán información de M03/M04/M05/M07.

No implementar anticipadamente dichos módulos dentro de M02.

Definir interfaces o mecanismos concretos solo cuando la Arquitectura del Bloque 1 lo requiera.

---

# 47. Estado al Cerrar la Especificación Funcional M02

Con esta versión:

```text
BLOQUE 1 — FUNDACIÓN

M01 Organización       ✅ ESPECIFICACIÓN FUNCIONAL CONGELADA
M02 Catálogo           ✅ ESPECIFICACIÓN FUNCIONAL CONGELABLE
```

M02 queda listo para sincronizarse con el Modelo de Dominio y sus diagramas.

Estado esperado de documentación:

```text
M02-Catalogo.md
        ↕
01-modelo-dominio-bloque-1.md
        ↕
03-m02-catalogo-clases.md
        ↕
03-m02-catalogo-clases.puml
```

Los cuatro artefactos deben expresar las mismas reglas.

El Bloque 1 todavía debe completar las vistas dinámicas previstas del Modelo de Dominio:

```text
04-m01-estados-invitacion.puml
05-m01-estados-membresia.puml
06-m02-estados-articulo.puml

secuencias/
├── 01-aceptar-invitacion.puml
└── 02-editar-articulo.puml
```

Una vez cerrada la suite de dominio correspondiente, el flujo continúa con:

```text
Decisiones Arquitectónicas
        ↓
Modelo Relacional
        ↓
Contrato API
        ↓
UX Baseline
        ↓
Implementación Backend
        ↓
Implementación Frontend
        ↓
Tests
        ↓
Checkpoint 1
```

No comenzar M03 antes de completar el incremento técnico correspondiente al Bloque 1.
