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

# 3. Actores y Permisos

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

El comportamiento operativo se determina mediante capacidades.

| Capacidad | Significado |
| :--- | :--- |
| `es_comprable` | Puede utilizarse en una Compra. |
| `es_vendible` | Puede utilizarse en una Venta. |
| `controla_stock` | El sistema administra existencias del artículo. |
| `puede_usarse_en_produccion` | Puede consumirse como insumo de Producción. |
| `controla_vencimiento` | Sus existencias pueden gestionarse mediante lotes con vencimiento. |
| `permite_descuento` | Puede recibir descuentos durante una Venta. |

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

el sistema debe ajustar, dentro de la misma operación de edición:

```text
permite_descuento = False
```

De esta manera, el artículo nunca queda en una combinación inválida de capacidades.

## 10.5. Uso Operativo Mínimo

Un artículo activo debe tener al menos una finalidad operativa válida.

Debe cumplirse al menos una:

```text
es_comprable = True

o

es_vendible = True

o

puede_usarse_en_produccion = True
```

No debe existir como activo un artículo que no pueda participar en ninguna operación.

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

## 12.3. Categoría Opcional

Un ArticuloCatalogo puede existir sin Categoria.

Esto permite una carga rápida.

```text
categoria = opcional
```

La ausencia de Categoría no bloquea la utilización del artículo.

## 12.4. Nombre Único por Negocio

Dentro de un mismo Negocio no pueden existir dos Categorías con nombres equivalentes luego de aplicar la normalización funcional definida por el sistema.

Conceptualmente:

```text
Snacks
SNACKS
 snacks
```

representan el mismo nombre.

La regla aplica tanto a Categorías activas como inactivas.

Si existe una equivalente inactiva:

```text
NO crear otra
→ informar que ya existe
→ ofrecer reactivar la existente
```

La experiencia debe orientar directamente al Usuario hacia la reactivación, evitando un error genérico de duplicado.

La estrategia técnica concreta de normalización se definirá posteriormente.

## 12.5. Categoría Inactiva

Una Categoria puede desactivarse.

Una Categoría inactiva:

- no se ofrece normalmente para nuevas asociaciones;
- continúa existiendo;
- conserva sus referencias;
- no desactiva automáticamente sus artículos;
- no altera capacidades de artículos ya asociados.

Por lo tanto:

```text
Categoria INACTIVA
        ↓
Articulo ACTIVO
        ↓
continúa operativo
```

Un artículo activo asociado a una Categoría inactiva continúa:

- siendo localizable;
- siendo comprable si corresponde;
- siendo vendible si corresponde;
- participando normalmente de los módulos compatibles.

La forma de representar visualmente esta situación se definirá en UX.

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

Una vez que el artículo posea historia operativa dependiente de su unidad, no podrá cambiarse de manera que modifique el significado de las cantidades registradas.

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

mediante una simple edición.

Si la configuración histórica fue incorrecta:

```text
desactivar artículo
+
crear artículo nuevo
```

Las conversiones históricas de unidades quedan fuera del MVP.

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

# 18. Deshabilitar Venta sin Perder Precio

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

Si posteriormente vuelve a:

```text
es_vendible = True
```

el sistema puede reutilizar el precio almacenado como referencia.

El Propietario deberá poder revisarlo antes de confirmar la configuración.

Al deshabilitar la venta, el sistema debe además ajustar:

```text
permite_descuento = False
```

porque un artículo no vendible no puede admitir descuentos.

Este ajuste no elimina el `precio_base`; solamente mantiene consistentes las capacidades.

Deshabilitar una capacidad no debe borrar información útil sin necesidad.

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

## 21.2. Unicidad

Cuando se informa, el SKU debe ser único dentro del Negocio.

La unicidad incluye:

```text
artículos activos
+
artículos inactivos
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

Un SKU perteneciente a un artículo inactivo continúa reservado.

Si dicho artículo vuelve a utilizarse:

```text
reactivar artículo original
```

en lugar de crear otro con el mismo código.

## 21.3. Liberación de SKU

Si un artículo:

```text
nunca fue utilizado
+
no posee referencias
+
puede eliminarse físicamente
```

y efectivamente se elimina:

```text
su SKU queda liberado
```

y puede utilizarse posteriormente en otro artículo.

## 21.4. Nombre y SKU

El nombre del artículo no constituye su identificador técnico.

Pueden existir nombres iguales o similares cuando el Negocio lo necesite.

El SKU permite diferenciarlos cuando corresponde.

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

## 24.2. INACTIVO

No aparece normalmente como opción para nuevas operaciones.

Continúa disponible:

- en historial;
- en consultas administrativas;
- en operaciones anteriores;
- para reactivación.

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
NO libera su SKU
```

Solo impide su uso normal en nuevas operaciones.

---

# 26. Reactivación

Un artículo inactivo puede reactivarse.

La reactivación:

- conserva identidad;
- conserva SKU;
- conserva historial;
- conserva referencias;
- vuelve a habilitar nuevas operaciones compatibles.

No se crea un artículo nuevo.

---

# 27. Eliminación Física

La eliminación física es una excepción y no el mecanismo normal de retiro.

Solo está permitida cuando el artículo:

```text
nunca fue utilizado
+
no tiene historia
+
no tiene dependencias
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

Si se elimina físicamente de manera válida:

```text
su SKU queda liberado
```

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
| **RF-CAT-004** | Crear categoría | Crear una Categoría del Negocio. | Propietario | Se registra una Categoría activa válida. |
| **RF-CAT-005** | Editar categoría | Modificar información de Categoría. | Propietario | Se actualiza sin alterar historia. |
| **RF-CAT-006** | Activar/desactivar categoría | Cambiar disponibilidad de Categoría. | Propietario | No se alteran artículos asociados. |
| **RF-CAT-007** | Eliminar categoría no utilizada | Eliminar una Categoría sin dependencias. | Propietario | Solo se elimina cuando resulta seguro. |
| **RF-CAT-008** | Consultar unidades | Consultar unidades normalizadas. | Miembro | El sistema ofrece unidades admitidas. |
| **RF-CAT-009** | Crear artículo | Registrar un BIEN o SERVICIO. | Propietario | Se crea luego de validar datos y capacidades. |
| **RF-CAT-010** | Editar artículo | Modificar configuración editable. | Propietario | Los cambios no reescriben historia. |
| **RF-CAT-011** | Activar/desactivar artículo | Cambiar disponibilidad futura. | Propietario / Encargado | Conserva identidad e historia. |
| **RF-CAT-012** | Reactivar artículo | Volver a habilitar un artículo. | Propietario / Encargado | Se reactiva el mismo artículo. |
| **RF-CAT-013** | Eliminar artículo no utilizado | Eliminar un artículo sin historia. | Propietario | Se impide cuando existen dependencias. |
| **RF-CAT-014** | Administrar precio base | Definir o actualizar precio actual. | Propietario | El cambio no modifica operaciones anteriores. |
| **RF-CAT-015** | Administrar costo de referencia | Registrar costo actual estimado. | Propietario | Puede cambiar sin modificar historia. |
| **RF-CAT-016** | Administrar capacidades | Configurar usos permitidos. | Propietario | Se rechazan combinaciones inválidas. |
| **RF-CAT-017** | Asociar imagen | Asociar imagen principal opcional. | Propietario | El artículo funciona con o sin imagen. |
| **RF-CAT-018** | Validar pertenencia | Impedir asociaciones entre negocios distintos. | Sistema | Toda operación respeta el Negocio activo. |
| **RF-CAT-019** | Preservar SKU | Mantener unicidad de SKU durante la vida del artículo. | Sistema | No se reutiliza SKU de artículos existentes activos o inactivos. |
| **RF-CAT-020** | Preservar Tipo | Impedir modificar BIEN/SERVICIO tras creación. | Sistema | El Tipo permanece inmutable. |
| **RF-CAT-021** | Validar UnidadMedida | Evitar cambios incompatibles con historia operativa. | Sistema | No se altera el significado de cantidades históricas. |

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

Si `es_vendible` cambia de `True` a `False`, el sistema debe ajustar `permite_descuento = False` dentro de la misma operación de edición para conservar una configuración válida.

## `RN-CAT-009` — Uso Operativo Mínimo
Un artículo ACTIVO debe cumplir al menos una de: `es_comprable = True`, `es_vendible = True` o `puede_usarse_en_produccion = True`.

## `RN-CAT-010` — Unidad Obligatoria para Bienes
Todo BIEN posee UnidadMedida válida.

## `RN-CAT-011` — Unidad Operativa de Servicios
Todo SERVICIO posee UnidadMedida. El valor inicial es `UNIDAD`, salvo que el Propietario seleccione otra unidad normalizada apropiada.

## `RN-CAT-012` — Precio Base Válido
Si `es_vendible = True`, debe existir `precio_base` y debe cumplirse `precio_base >= 0`.

## `RN-CAT-013` — Costo de Referencia
`costo_referencia` es opcional. Cuando existe debe cumplirse `costo_referencia >= 0`.

## `RN-CAT-014` — Precio no Reescribe Historia
Modificar `precio_base` no modifica operaciones históricas.

## `RN-CAT-015` — Costo no Reescribe Historia
Modificar `costo_referencia` no modifica costos históricos.

## `RN-CAT-016` — SKU Opcional, Único y Reservado
El SKU es opcional. Cuando existe, debe ser único dentro del Negocio considerando artículos ACTIVOS e INACTIVOS. No puede reutilizarse mientras el artículo original exista. Si el artículo se elimina físicamente de manera válida, el SKU queda liberado.

## `RN-CAT-017` — Nombre no es Identificador
El nombre no funciona como clave técnica. Pueden existir nombres iguales o similares.

## `RN-CAT-018` — Categoría Opcional
Un artículo puede existir sin Categoria.

## `RN-CAT-019` — Categoría Inactiva
Desactivar una Categoria no desactiva artículos, no cambia sus capacidades y no bloquea sus operaciones. Impide utilizar normalmente esa Categoria en nuevas asociaciones.

## `RN-CAT-020` — Conservación Histórica
Un artículo utilizado en una operación no puede eliminarse físicamente. Debe desactivarse.

## `RN-CAT-021` — Eliminación Segura
La eliminación física solo está permitida si no existen referencias ni dependencias que deban conservarse.

Para una `Categoria`, esto implica que no puede eliminarse físicamente mientras exista ningún `ArticuloCatalogo` asociado, independientemente de que dicho artículo se encuentre ACTIVO o INACTIVO.

## `RN-CAT-022` — Reactivación
Reactivar utiliza el mismo artículo. No se crea una copia.

## `RN-CAT-023` — Artículo Inactivo
Un artículo INACTIVO no se selecciona normalmente para nuevas operaciones. Continúa disponible para consulta histórica.

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
La UnidadMedida puede modificarse mientras el artículo no posea historia operativa dependiente de cantidades.

La existencia de historia operativa es una condición derivada de los módulos consumidores que registren cantidades del artículo, por ejemplo M03 Compras, M04 Inventario, M05 Ventas y, cuando corresponda, M07 Producción.

Antes de autorizar un cambio de UnidadMedida, M02 debe verificar conceptualmente esa condición mediante la información provista por los módulos involucrados.

Esta regla no obliga a implementar un campo persistente llamado `tiene_historia_operativa`; la forma técnica de resolver la consulta pertenece al Diseño Técnico.

Cuando exista historia operativa dependiente de cantidades, la UnidadMedida no podrá modificarse de forma que cambie el significado de cantidades anteriores.

## `RN-CAT-033` — Conservación del Precio al Deshabilitar Venta
Si `es_vendible` cambia de `True` a `False`, el `precio_base` existente se conserva. Mientras no sea vendible, no tiene efecto operativo. Si vuelve a habilitarse la venta, el valor puede utilizarse nuevamente como referencia.

## `RN-CAT-034` — Nombre Único de Categoría
Dentro de un Negocio no pueden existir Categorías con nombres equivalentes luego de normalización funcional.

La regla incluye Categorías activas e inactivas.

Si existe una Categoria equivalente INACTIVA, el sistema no debe tratar el caso únicamente como un error genérico de duplicado: debe informar la existencia de esa Categoria y ofrecer su reactivación.

---

# 32. Casos de Uso

## CU-CAT-01 — Consultar Catálogo

Actor principal: Miembro del Negocio.

Precondiciones:
- Usuario autenticado;
- Negocio seleccionado;
- membresía activa.

Flujo principal:
1. El Usuario accede al Catálogo.
2. El sistema identifica el Negocio activo.
3. Obtiene sus artículos.
4. Muestra inicialmente los artículos activos.
5. El Usuario puede seleccionar un artículo.
6. El sistema muestra su detalle.

Información resumida posible:

```text
Nombre
Tipo
Categoría
Precio
Estado
```

Sin artículos, se muestra un estado vacío comprensible y, si posee permisos, la acción `[ Crear primer artículo ]`.

## CU-CAT-02 — Buscar y Filtrar Catálogo

Actor principal: Miembro.

Flujo:
1. El Usuario ingresa un término.
2. El sistema busca dentro del Negocio activo.
3. Puede aplicar filtros.

Filtros iniciales:

```text
Tipo
Categoría
Estado
```

Podrán incorporarse filtros por capacidades si aportan valor a UX.

## CU-CAT-03 — Gestionar Categorías

Actor principal: Propietario.

Crear:
1. Accede a Categorías.
2. Selecciona `Nueva categoría`.
3. Ingresa nombre.
4. El sistema valida equivalencias.
5. Si no existe una equivalente, crea la Categoria ACTIVA.

Categoría equivalente inactiva:
- el sistema informa que ya existe;
- debe identificar que se encuentra INACTIVA;
- debe ofrecer `[ Reactivar ]` en lugar de crear una duplicada;
- el mensaje debe ser orientativo, por ejemplo:

> Ya existe la categoría "BEBIDAS" y se encuentra inactiva. Podés reactivarla para volver a utilizarla.

Editar:
1. Selecciona Categoria.
2. Modifica nombre.
3. El sistema valida unicidad.
4. Confirma.

Desactivar:
1. Selecciona Categoria.
2. Solicita desactivación.
3. Confirma.
4. La Categoria queda INACTIVA.
5. Sus artículos no cambian de estado.

Reactivar:
- la misma Categoria vuelve a estado ACTIVA.

Eliminar:
- solo se permite si no posee dependencias que requieran conservarla;
- no puede eliminarse físicamente mientras exista ningún `ArticuloCatalogo` asociado, ya sea ACTIVO o INACTIVO.

## CU-CAT-04 — Crear Artículo

Actor principal: Propietario.

Precondiciones:
- Usuario autenticado;
- Negocio activo;
- membresía activa;
- rol PROPIETARIO.

Flujo principal:
1. Selecciona `Nuevo artículo`.
2. El sistema pregunta `¿Qué querés agregar? [ Bien ] [ Servicio ]`.
3. Selecciona Tipo.
4. Ingresa Nombre.
5. Opcionalmente selecciona Categoria.
6. Define UnidadMedida:
   - BIEN: selección explícita;
   - SERVICIO: `UNIDAD` por defecto.
7. Indica cómo utiliza el artículo.
8. Si es vendible, ingresa precio_base.
9. Opcionalmente agrega costo_referencia, SKU, descripción e imagen.
10. El sistema valida capacidades.
11. Presenta resumen.
12. Confirma.
13. El artículo queda ACTIVO.

Para SERVICIO se fija:
`controla_stock = False`, `controla_vencimiento = False`, `puede_usarse_en_produccion = False`.

El SKU repetido se rechaza incluso si el artículo existente está INACTIVO.

La Categoría puede omitirse.

## CU-CAT-05 — Editar Artículo

Actor principal: Propietario.

Flujo:
1. Abre el artículo.
2. Selecciona `Editar`.
3. Modifica datos permitidos.
4. El sistema valida reglas.
5. Confirma.
6. Se actualiza la configuración vigente.

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
`tipo`.

Los cambios no reescriben operaciones anteriores.

Si `es_vendible` pasa de `True` a `False`:

```text
precio_base
→ se conserva

permite_descuento
→ pasa automáticamente a False
```

El Usuario no necesita realizar una segunda corrección manual para mantener consistentes las capacidades.

Las restricciones relacionadas con stock existente, lotes, recetas y producción se completarán junto con M04 y M07.

## CU-CAT-06 — Activar / Desactivar / Reactivar Artículo

Actor principal: Propietario o Encargado.

Desactivar:
1. Selecciona artículo.
2. Solicita `Desactivar`.
3. Confirma.
4. El artículo queda INACTIVO.

No se elimina historia ni se libera SKU.

Reactivar:
1. Consulta artículos inactivos.
2. Selecciona uno.
3. Solicita reactivación.
4. El sistema valida que su configuración siga siendo válida.
5. Vuelve a ACTIVO.

## CU-CAT-07 — Eliminar Artículo

Actor principal: Propietario.

Flujo:
1. Solicita eliminar.
2. El sistema verifica referencias.
3. Si no existen:
   - solicita confirmación;
   - elimina físicamente.
4. El SKU queda liberado.

Si el artículo posee historia, el sistema rechaza la eliminación y debe orientar al Usuario hacia `[ Desactivar ]`.

---

# 33. Historias de Usuario

## `HU-CAT-001` — Crear un Bien
Como Propietario, quiero crear un bien con pocos datos obligatorios, para incorporarlo rápidamente al catálogo.

## `HU-CAT-002` — Crear un Servicio
Como Propietario de un negocio de servicios, quiero registrar prestaciones sin configurar inventario, para utilizar el sistema sin opciones que no corresponden a mi actividad.

## `HU-CAT-003` — Combinar Usos
Como Propietario, quiero indicar si un bien se compra, vende o utiliza en producción, para representar cómo funciona realmente dentro del negocio.

## `HU-CAT-004` — Organizar con Categorías
Como Propietario, quiero crear mis propias Categorías, para organizar el catálogo según mi actividad.

## `HU-CAT-005` — Crear Rápidamente
Como feriante o pequeño comerciante, quiero evitar formularios extensos, para comenzar a utilizar el sistema rápidamente.

## `HU-CAT-006` — Cambiar Precio sin Alterar Historia
Como Propietario, quiero modificar el precio actual, para utilizar un nuevo valor sin afectar ventas anteriores.

## `HU-CAT-007` — Retirar sin Borrar Historia
Como Propietario o Encargado, quiero desactivar un artículo, para evitar utilizarlo nuevamente sin perder información anterior.

## `HU-CAT-008` — Buscar Rápidamente
Como Trabajador, quiero localizar artículos fácilmente, para operar con agilidad.

## `HU-CAT-009` — Conservar Identidad de SKU
Como Propietario, quiero evitar que un mismo código identifique artículos distintos, para mantener búsquedas e historial sin ambigüedad.

---

# 34. Estados y Transiciones

## ArticuloCatalogo

```text
                 crear
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
              reactivar
                  │
                  ▼
               ACTIVO
```

La eliminación física NO es un estado. Solo puede realizarse cuando no existe historia, referencias ni dependencias.

## Categoria

```text
ACTIVA
  │
  ├── desactivar
  ▼
INACTIVA
  │
  ├── reactivar
  ▼
ACTIVA
```

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
| Deshabilitar venta con descuento habilitado | Ajusta `permite_descuento = False` en la misma edición. | **Al dejar de vender este artículo, los descuentos también quedan deshabilitados.** |
| SKU repetido activo o inactivo | Rechaza operación. | **Este código ya pertenece a otro artículo del negocio.** |
| Categoría equivalente ACTIVA | Rechaza creación. | **Ya existe una categoría con este nombre.** |
| Categoría equivalente INACTIVA | Rechaza creación de duplicado y ofrece reactivación. | **Ya existe esta categoría y se encuentra inactiva. Podés reactivarla para volver a utilizarla.** |
| Categoría de otro Negocio | Rechaza operación. | **La categoría seleccionada no pertenece a este negocio.** |
| Artículo de otro Negocio | Rechaza operación. | **No tenés acceso a este artículo.** |
| Cambiar BIEN ↔ SERVICIO | Rechaza modificación. | **El tipo del artículo no puede modificarse después de crearlo.** |
| Cambiar unidad con historia incompatible | Rechaza modificación. | **La unidad no puede cambiarse porque el artículo ya posee operaciones registradas.** |
| Eliminar artículo utilizado | Rechaza eliminación. | **Este artículo posee historial. Podés desactivarlo.** |
| Eliminar Categoria con artículos asociados ACTIVOS o INACTIVOS | Rechaza eliminación. | **Esta categoría está asociada a artículos y no puede eliminarse. Podés desactivarla.** |
| Encargado intenta editar artículo | Rechaza operación. | **No tenés permisos para editar el catálogo.** |
| Encargado modifica Categoria | Rechaza operación. | **Solo el propietario puede administrar categorías.** |
| Trabajador intenta modificar | Rechaza operación. | **No tenés permisos para modificar el catálogo.** |
| Artículo inactivo en nueva operación | Impide selección normal. | **Este artículo se encuentra inactivo.** |

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
- determinar permisos;
- identificar Negocio activo;
- registrar Usuario responsable.

## M03 — Compras y Proveedores

M03 podrá utilizar artículos con:

```text
es_comprable = True
```

Un artículo comprable puede o no controlar stock.

## M04 — Inventario y Ubicaciones

M04 únicamente administra:

```text
controla_stock = True
```

Si `controla_stock = False`, el artículo queda completamente fuera del inventario.

M04 definirá restricciones adicionales para modificar capacidades cuando ya exista stock.

## M05 — Ventas y Pagos

M05 utiliza:

```text
es_vendible = True
```

y toma `precio_base` como referencia inicial.

La Venta conserva el precio realmente aplicado.

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

Los resultados de producción también se representan mediante ArticuloCatalogo.

No existe una clase separada `ProductoTerminado`.

## M08 — Analítica

M08 podrá utilizar como dimensiones:

```text
Artículo
Categoría
Tipo
```

entre otras.

---

# 37. Matriz de Trazabilidad Inicial

| RF | RN principales | HU | CU |
| :--- | :--- | :--- | :--- |
| RF-CAT-001 | RN-CAT-001, RN-CAT-023 | HU-CAT-008 | CU-CAT-01 |
| RF-CAT-002 | RN-CAT-001 | HU-CAT-008 | CU-CAT-02 |
| RF-CAT-003 | RN-CAT-001 | HU-CAT-008 | CU-CAT-01 |
| RF-CAT-004 | RN-CAT-002, RN-CAT-034 | HU-CAT-004 | CU-CAT-03 |
| RF-CAT-005 | RN-CAT-019, RN-CAT-034 | HU-CAT-004 | CU-CAT-03 |
| RF-CAT-006 | RN-CAT-019, RN-CAT-028 | HU-CAT-004 | CU-CAT-03 |
| RF-CAT-007 | RN-CAT-021 | HU-CAT-004 | CU-CAT-03 |
| RF-CAT-008 | RN-CAT-010, RN-CAT-011, RN-CAT-032 | HU-CAT-001, HU-CAT-002 | CU-CAT-04 / CU-CAT-05 |
| RF-CAT-009 | RN-CAT-003 a RN-CAT-013, RN-CAT-031 | HU-CAT-001, HU-CAT-002, HU-CAT-003, HU-CAT-005 | CU-CAT-04 |
| RF-CAT-010 | RN-CAT-008, RN-CAT-014, RN-CAT-015, RN-CAT-031, RN-CAT-032, RN-CAT-033 | HU-CAT-003, HU-CAT-006 | CU-CAT-05 |
| RF-CAT-011 | RN-CAT-022, RN-CAT-023, RN-CAT-028 | HU-CAT-007 | CU-CAT-06 |
| RF-CAT-012 | RN-CAT-022 | HU-CAT-007 | CU-CAT-06 |
| RF-CAT-013 | RN-CAT-020, RN-CAT-021, RN-CAT-016 | HU-CAT-007, HU-CAT-009 | CU-CAT-07 |
| RF-CAT-014 | RN-CAT-012, RN-CAT-014, RN-CAT-027, RN-CAT-029, RN-CAT-033 | HU-CAT-006 | CU-CAT-05 |
| RF-CAT-015 | RN-CAT-013, RN-CAT-015 | HU-CAT-003 | CU-CAT-05 |
| RF-CAT-016 | RN-CAT-004 a RN-CAT-009 | HU-CAT-003 | CU-CAT-04 / CU-CAT-05 |
| RF-CAT-017 | RN-CAT-025 | HU-CAT-001 | CU-CAT-04 / CU-CAT-05 |
| RF-CAT-018 | RN-CAT-001, RN-CAT-002 | — | Todos |
| RF-CAT-019 | RN-CAT-016 | HU-CAT-009 | CU-CAT-04 / CU-CAT-07 |
| RF-CAT-020 | RN-CAT-031 | HU-CAT-001, HU-CAT-002 | CU-CAT-04 / CU-CAT-05 |
| RF-CAT-021 | RN-CAT-032 | HU-CAT-003 | CU-CAT-05 |

---

# 38. Criterios de Aceptación del Módulo

M02 se considera funcionalmente completo para el MVP cuando se verifica que:

1. Cada Negocio posee su propio catálogo aislado.
2. No pueden consultarse recursos de otro Negocio sin autorización.
3. Puede crearse un BIEN.
4. Puede crearse un SERVICIO.
5. El Tipo no puede modificarse después de la creación.
6. Un SERVICIO nunca controla stock.
7. Un SERVICIO nunca controla vencimiento.
8. Un SERVICIO no puede utilizarse en producción.
9. Un SERVICIO recibe `UNIDAD` como unidad inicial.
10. Un SERVICIO puede configurarse con `HORA` u otra unidad válida.
11. Un BIEN requiere UnidadMedida.
12. Un artículo puede ser comprable.
13. Un artículo puede ser vendible.
14. Un BIEN puede ser simultáneamente comprable y vendible.
15. Un artículo usado en producción debe ser BIEN.
16. Un artículo usado en producción debe controlar stock.
17. Un artículo puede existir sin Categoria.
18. Cada Categoria pertenece a un solo Negocio.
19. No pueden existir Categorías equivalentes dentro del mismo Negocio.
20. Si se intenta crear una Categoria equivalente a otra INACTIVA, el sistema ofrece reactivar la existente.
21. Una Categoria inactiva no desactiva sus artículos.
22. Los artículos activos de una Categoria inactiva continúan operativos.
23. Una Categoria no puede eliminarse físicamente mientras tenga artículos asociados, sean ACTIVOS o INACTIVOS.
24. Las unidades son normalizadas.
25. Se admiten cantidades fraccionarias.
26. Un artículo vendible requiere precio_base.
27. `precio_base = 0` es válido.
28. `precio_base < 0` es inválido.
29. `costo_referencia` es opcional.
30. `costo_referencia < 0` es inválido.
31. Cambiar precio_base no modifica operaciones históricas.
32. Cambiar costo_referencia no modifica operaciones históricas.
33. Deshabilitar `es_vendible` conserva precio_base.
34. Deshabilitar `es_vendible` ajusta automáticamente `permite_descuento = False`.
35. Un SKU es opcional.
36. Un SKU informado es único dentro del Negocio.
37. La unicidad incluye artículos activos e inactivos.
38. El SKU de un artículo inactivo no puede reutilizarse.
39. El SKU se libera únicamente cuando el artículo se elimina físicamente de manera válida.
40. Una imagen es opcional.
41. El MVP permite una sola imagen principal.
42. Las variantes se representan como artículos independientes.
43. El Propietario puede crear artículos.
44. El Propietario puede editar artículos.
45. El Propietario puede eliminar artículos nunca utilizados.
46. El Propietario administra Categorías.
47. El Encargado puede activar, desactivar y reactivar artículos.
48. El Encargado no puede editar artículos.
49. El Encargado no puede modificar precio ni costo.
50. El Encargado no puede administrar Categorías.
51. El Trabajador puede consultar.
52. El Trabajador no puede modificar.
53. Un artículo con historia no puede eliminarse.
54. Un artículo con historia puede desactivarse.
55. Un artículo inactivo puede reactivarse.
56. Reactivar conserva la misma identidad.
57. Un artículo sin control de stock no participa de Inventario.
58. Las combinaciones inválidas de capacidades son rechazadas.
59. Antes de cambiar una UnidadMedida, se verifica si existe historia operativa dependiente de cantidades en los módulos consumidores.
60. No puede cambiarse una UnidadMedida cuando ello alteraría el significado de cantidades históricas.
61. La UI puede ocultar configuraciones incompatibles según Tipo y capacidades.

---

# 39. Alcance MVP

## MUST HAVE

```text
Catálogo por Negocio

BIEN
SERVICIO

Tipo inmutable

Categorías configurables

Unidades normalizadas

UNIDAD automática para servicios

Crear artículo
Editar artículo
Consultar
Buscar

Activar
Desactivar
Reactivar

Eliminación segura

Precio base
Precio cero permitido

Costo de referencia

SKU opcional
SKU único por Negocio

Descripción opcional
Imagen opcional

Capacidades

Cantidades fraccionarias

Aislamiento multi-negocio

Permisos estrictos

Conservación histórica
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

Este documento NO define:

- tipos SQL;
- precisión exacta de Numeric;
- nombres definitivos de tablas;
- enums SQL;
- restricciones SQL concretas;
- índices;
- estrategia de almacenamiento de imágenes;
- estrategia técnica de soft delete;
- implementación concreta de auditoría;
- endpoints REST;
- schemas Pydantic;
- clases SQLAlchemy;
- formato de IDs;
- normalización técnica de SKU;
- normalización técnica de Categoria;
- mecanismo concreto de contexto de Negocio.

Estas decisiones pertenecen a:

```text
DISEÑO TÉCNICO BLOQUE 1
M01 + M02
```

---

# 43. Decisiones Deliberadamente Postergadas

## 43.1. Desactivar control de stock con existencias

Ejemplo:

```text
Articulo
controla_stock = True

+
stock existente

+
Propietario intenta:
controla_stock = False
```

La política completa se definirá junto con:

```text
M04 — Inventario y Ubicaciones
```

## 43.2. Quitar capacidad de Producción con dependencias

Ejemplo:

```text
Artículo utilizado por recetas
+
puede_usarse_en_produccion = True
+
Propietario intenta deshabilitarlo
```

La política se completará junto con:

```text
M07 — Producción
```

## 43.3. Regla General

M02 define:

```text
qué capacidades existen
+
qué combinaciones son válidas
```

Los módulos consumidores definirán restricciones adicionales cuando ya exista historia operativa dependiente.

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
Modificar precio_base
→ exclusivamente PROPIETARIO
```

La documentación transversal de actores y permisos deberá reflejar exactamente esta política antes de considerar cerrado el Bloque 1.

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

Al mismo tiempo, el usuario no debe necesitar comprender esa flexibilidad interna.

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

---

# 46. Estado al Cerrar M02

Una vez revisada y aprobada esta especificación:

```text
BLOQUE 1 — FUNDACIÓN

M01 Organización       ✅ CONGELADO
M02 Catálogo           ✅ CONGELADO
```

El siguiente paso NO será M03.

Se deberá comenzar:

```text
DISEÑO TÉCNICO BLOQUE 1

M01
+
M02
```

siguiendo:

```text
Modelo de Dominio
        ↓
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
