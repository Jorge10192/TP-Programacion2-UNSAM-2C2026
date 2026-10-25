# 03 — M02 Catálogo — Guía de Interpretación del Diagrama de Clases

## 1. Propósito del Documento

Este documento acompaña al futuro diagrama:

```text
03-m02-catalogo-clases.puml
```

y a su representación visual:

```text
03-m02-catalogo-clases.png
```

Su objetivo es permitir que una persona, desarrollador o modelo de IA interprete correctamente el **Diagrama 3 — M02 Catálogo**, comprendiendo:

- qué problema de dominio resuelve;
- qué conceptos representa;
- qué reglas están congeladas;
- qué refinamientos fueron aprobados durante el diseño;
- qué problemas de implementación intenta prevenir;
- qué responsabilidades pertenecen a M02;
- qué responsabilidades pertenecen a módulos posteriores;
- qué decisiones todavía permanecen abiertas para Arquitectura;
- cómo utilizar el diagrama como apoyo para análisis, diseño, implementación y tests sin inferir información inexistente.

Este documento debe utilizarse como **guía semántica del diagrama**, no como reemplazo de la especificación funcional.

---

# 2. Ubicación dentro de la Documentación

La estructura esperada es:

```text
Proyecto-3-Extendido-Generico/
└── modelo-dominio/
    └── bloque-1-fundacion/
        ├── 01-modelo-dominio-bloque-1.md
        ├── 01-diagrama-general.puml
        ├── 01-diagrama-general.png
        ├── 02-m01-organizacion-clases.md
        ├── 02-m01-organizacion-clases.puml
        ├── 02-m01-organizacion-clases.png
        ├── 03-m02-catalogo-clases.md
        ├── 03-m02-catalogo-clases.puml
        └── 03-m02-catalogo-clases.png
```

Este archivo:

```text
03-m02-catalogo-clases.md
```

es la guía semántica del Diagrama 3.

---

# 3. Fuentes de Verdad

Para interpretar el Diagrama 3 debe respetarse el siguiente orden:

```text
1. M02 — Catálogo
   modulos/M02-Catalogo.md

2. Modelo de Dominio del Bloque 1
   modelo-dominio/bloque-1-fundacion/01-modelo-dominio-bloque-1.md

3. Refinamientos de dominio aprobados para M02
   documentados en este archivo

4. Este documento
   modelo-dominio/bloque-1-fundacion/03-m02-catalogo-clases.md

5. Diagrama
   modelo-dominio/bloque-1-fundacion/03-m02-catalogo-clases.puml

6. Código de implementación
```

Si existiera una contradicción entre documentos:

```text
Especificación funcional
>
Modelo de dominio
>
Refinamientos aprobados
>
Guía del diagrama
>
Diagrama
>
Implementación
```

la contradicción debe resolverse antes de continuar.

---

# 4. Estado de los Refinamientos de M02

El diseño detallado de M02 agregó precisiones que deben incorporarse formalmente a `M02-Catalogo.md` antes de congelar definitivamente el Diagrama 3.

Entre ellas:

```text
- diferenciación entre capacidades comerciales y estructurales;
- reglas de modificación de capacidades con historia;
- Categoria INACTIVA:
  conserva asociaciones existentes,
  pero no admite nuevas asociaciones;
- Articulo INACTIVO puede quedar sin uso operativo;
- reactivación revalida invariantes;
- Categoria INACTIVA históricamente asociada
  no bloquea reactivación del artículo;
- desactivación de artículo no modifica stock existente;
- tolerancia operativa ≠ consistencia estructural del catálogo.
```

Hasta que estas reglas estén incorporadas a la especificación funcional, este documento las considera **refinamientos aprobados de diseño**, pero no debe ocultarse que son posteriores a la versión original de M02.

---

# 5. Objetivo del Diagrama

El Diagrama 3 detalla exclusivamente el dominio de:

```text
M02 — Catálogo
```

Debe permitir responder principalmente:

```text
¿Qué representa un ArticuloCatalogo?

¿Cómo se diferencia un BIEN de un SERVICIO?

¿Cómo se modelan los usos operativos sin crear jerarquías rígidas?

¿Qué responsabilidades tiene Categoria?

¿Qué responsabilidades tiene CapacidadesArticulo?

¿Qué reglas puede validar M02 por sí mismo?

¿Qué reglas requieren información de M03/M04/M05/M07?

¿Qué significa desactivar?

¿Qué significa eliminar físicamente?

¿Qué puede cambiar cuando existe historia?

¿Qué NO puede modificarse sin comprometer dependencias existentes?

¿Cómo se preserva el aislamiento entre Negocios?

¿Qué decisiones quedan abiertas para Arquitectura?
```

---

# 6. Problema Principal que Resuelve M02

Un sistema genérico para pequeños negocios no puede asumir que todos operan únicamente con:

```text
productos
```

o únicamente con:

```text
servicios
```

Debe soportar simultáneamente:

```text
mercadería para reventa
materias primas
insumos
productos elaborados
servicios
elementos comprables pero no vendibles
elementos vendibles pero no comprables
artículos con o sin stock
artículos con o sin vencimiento
```

Una solución rígida basada en múltiples clases:

```text
Producto
MateriaPrima
Insumo
ProductoTerminado
Mercaderia
Servicio
```

generaría:

- duplicación de comportamiento;
- jerarquías difíciles de extender;
- reglas repetidas;
- problemas para negocios híbridos;
- dificultad para adaptar nuevos rubros.

M02 resuelve este problema mediante:

```text
ArticuloCatalogo
=
TipoArticulo
+
CapacidadesArticulo
```

---

# 7. Principio Rector

El principio rector de M02 es:

> **Un artículo se define por su naturaleza general y por sus capacidades operativas, no por una jerarquía rígida de clases comerciales.**

Conceptualmente:

```text
ArticuloCatalogo
        │
        ├── TipoArticulo
        │      ├── BIEN
        │      └── SERVICIO
        │
        └── CapacidadesArticulo
               ├── esComprable
               ├── esVendible
               ├── controlaStock
               ├── puedeUsarseEnProduccion
               ├── controlaVencimiento
               └── permiteDescuento
```

---

# 8. Alcance del Diagrama

El Diagrama 3 debe representar:

```text
Negocio        [referencia externa M01]

Categoria
ArticuloCatalogo

CapacidadesArticulo

EstadoCategoria
EstadoArticulo
TipoArticulo
UnidadMedida
```

También debe representar:

- cardinalidades;
- pertenencia al Negocio;
- categoría opcional;
- composición de capacidades;
- comportamiento relevante;
- invariantes;
- reglas de activación/desactivación/reactivación;
- restricciones de modificación;
- dependencia conceptual de historia operativa;
- límites con módulos posteriores.

---

# 9. Elementos Fuera del Alcance

El Diagrama 3 NO administra:

```text
StockUbicacion
Lote
MovimientoInventario

Proveedor
Compra

Cliente
Venta
Pago

Receta
Produccion

Promocion
ListaPrecio

Caja
MovimientoCaja
```

Estos conceptos pertenecen a módulos posteriores.

M02 tampoco define todavía:

```text
tablas
foreign keys
índices
UUID
ORM
SQLAlchemy
Pydantic
DTO
endpoints
Repository
Unit of Work
Domain Events
Aggregate Roots formales
Service Layer concreto
```

---

# 10. Dependencia con M01

`Negocio` aparece en el Diagrama 3 porque es indispensable para comprender M02.

M02 utiliza `Negocio` para:

```text
pertenencia
aislamiento
unicidad
autorización contextual
```

Conceptualmente:

```text
Negocio
   │
   ├── 0..N Categoria
   │
   └── 0..N ArticuloCatalogo
```

Sin `Negocio` no pueden interpretarse correctamente reglas como:

```text
SKU único por Negocio

Categoria única por Negocio

Articulo y Categoria
deben pertenecer al mismo Negocio
```

El Diagrama 3 no redefine internamente M01.

---

# 11. Entidad `Categoria`

## 11.1. Responsabilidad

`Categoria` organiza artículos dentro de un Negocio.

No define comportamiento operativo.

No determina:

```text
precio
promoción
descuento
stock
producción
```

## 11.2. Información conceptual

```text
Categoria
├── identidad
├── nombre
└── estado : EstadoCategoria
```

No posee actualmente:

```text
descripcion
```

## 11.3. Estados

```text
ACTIVA
INACTIVA
```

No deben agregarse estados como:

```text
BORRADOR
ELIMINADA
ARCHIVADA
```

sin modificar previamente M02.

---

# 12. Unicidad de Categoria

Dentro del mismo Negocio:

```text
Categoria.nombre
```

debe ser único luego de la normalización funcional definida por el sistema.

Ejemplos conceptualmente equivalentes:

```text
Snacks
SNACKS
 snacks
```

La regla aplica a:

```text
ACTIVAS
+
INACTIVAS
```

Si existe una Categoria equivalente INACTIVA:

```text
NO crear duplicado
→ informar existencia
→ ofrecer reactivación
```

La normalización exacta:

```text
lowercase
trim
Unicode
acentos
etc.
```

no se congela todavía.

---

# 13. Categoria INACTIVA

Una Categoria INACTIVA:

```text
continúa existiendo
conserva referencias
conserva artículos asociados
```

No produce automáticamente:

```text
ArticuloCatalogo → INACTIVO
```

ni modifica:

```text
precioBase
capacidades
SKU
UnidadMedida
```

Un artículo asociado previamente puede seguir utilizando esa relación histórica.

---

# 14. Nuevas Asociaciones a Categoria INACTIVA

Debe diferenciarse:

## Asociación histórica existente

```text
Articulo A
→ Categoria X

Categoria X
ACTIVA → INACTIVA
```

Resultado:

```text
Articulo A
continúa asociado a Categoria X
```

## Nueva asociación

```text
Articulo B
+
Categoria X INACTIVA
```

Resultado:

```text
rechazar asociación
→ indicar que debe reactivarse Categoria X
```

## Reasignación

```text
Articulo A
→ cambiar Categoria
→ Categoria Y INACTIVA
```

Resultado:

```text
rechazar
```

Por lo tanto:

```text
Categoria INACTIVA
→ válida para asociaciones históricas existentes
→ inválida para nuevas asociaciones
```

---

# 15. Reactivación de Categoria

Reactivar:

```text
INACTIVA → ACTIVA
```

debe:

- reutilizar la misma Categoria;
- conservar identidad;
- conservar relaciones;
- conservar artículos asociados.

No debe:

- recalcular precios;
- modificar promociones;
- exigir recargar artículos;
- cambiar capacidades;
- modificar SKU;
- generar copias.

---

# 16. Eliminación Física de Categoria

Eliminar físicamente una Categoria es excepcional.

Solo puede realizarse cuando:

```text
0 artículos asociados
+
0 dependencias que deban conservarse
```

Esto incluye artículos:

```text
ACTIVOS
INACTIVOS
```

Por lo tanto:

```text
Categoria
+
cualquier ArticuloCatalogo asociado
→ NO eliminar físicamente
```

La alternativa normal es:

```text
desactivar()
```

---

# 17. Entidad `ArticuloCatalogo`

## 17.1. Responsabilidad

Representa cualquier bien o servicio que un Negocio necesite utilizar comercial u operativamente.

Ejemplos:

```text
Harina
Collar
Snack de pollo
Remera negra M
Maquillaje social
Asesoramiento por hora
```

## 17.2. Información conceptual

```text
ArticuloCatalogo
├── identidad
├── nombre
├── descripcion opcional
├── tipo : TipoArticulo
├── Categoria opcional
├── unidadMedida : UnidadMedida
├── SKU opcional
├── imagenPrincipal opcional
├── precioBase opcional
├── costoReferencia opcional
├── capacidades : CapacidadesArticulo
└── estado : EstadoArticulo
```

---

# 18. TipoArticulo

Valores:

```text
BIEN
SERVICIO
```

El Tipo es:

```text
obligatorio
+
inmutable
```

No existe:

```text
cambiarTipo()
```

Si un artículo fue creado con Tipo incorrecto y nunca fue utilizado:

```text
eliminar físicamente
+
crear correctamente
```

Si posee historia:

```text
desactivar artículo incorrecto
+
crear otro artículo
```

La identidad histórica no debe reinterpretarse.

---

# 19. EstadoArticulo

Estados:

```text
ACTIVO
INACTIVO
```

No introducir:

```text
BORRADOR
ARCHIVADO
SUSPENDIDO
ELIMINADO
```

sin modificar previamente la especificación funcional.

---

# 20. Uso Operativo Mínimo

Un artículo ACTIVO debe poseer al menos una finalidad operativa:

```text
esComprable = True
o
esVendible = True
o
puedeUsarseEnProduccion = True
```

Un artículo INACTIVO puede poseer:

```text
esComprable = False
esVendible = False
puedeUsarseEnProduccion = False
```

porque ya no necesita participar normalmente de nuevas operaciones.

La validación de uso operativo mínimo aplica al estado:

```text
ACTIVO
```

---

# 21. Reactivación de ArticuloCatalogo

`reactivar()` no debe implementarse como:

```text
estado = ACTIVO
```

sin validación.

Debe revalidar las invariantes necesarias para volver a operar.

Como mínimo:

```text
capacidades coherentes
+
uso operativo mínimo
+
precioBase válido si esVendible
+
dependencias estructurales compatibles
```

Una Categoria históricamente asociada que se encuentre INACTIVA:

```text
NO bloquea la reactivación
```

porque dicha asociación ya existía.

---

# 22. Value Object `CapacidadesArticulo`

`CapacidadesArticulo` representa una configuración completa.

No posee identidad propia.

Contiene:

```text
esComprable
esVendible
controlaStock
puedeUsarseEnProduccion
controlaVencimiento
permiteDescuento
```

Debe interpretarse como:

```text
Value Object
```

y no automáticamente como:

```text
tabla independiente
entidad independiente
Aggregate Root
```

---

# 23. Actualización Atómica de Capacidades

Las capacidades deben cambiar mediante una nueva configuración completa.

Conceptualmente:

```text
actualizarCapacidades(nuevaConfiguracion)
```

No debe diseñarse inicialmente una API basada en setters independientes:

```text
setVendible()
setStock()
setVencimiento()
setProduccion()
```

porque podría producir estados intermedios inválidos.

La transición correcta es:

```text
Configuración válida A
        ↓
validación completa
        ↓
Configuración válida B
```

---

# 24. Reglas Internas de Capacidades

## SERVICIO

Si:

```text
tipo = SERVICIO
```

entonces:

```text
controlaStock = False
controlaVencimiento = False
puedeUsarseEnProduccion = False
```

## Vencimiento

Si:

```text
controlaVencimiento = True
```

entonces:

```text
tipo = BIEN
controlaStock = True
```

## Producción

Si:

```text
puedeUsarseEnProduccion = True
```

entonces:

```text
tipo = BIEN
controlaStock = True
```

## Descuento

Si:

```text
permiteDescuento = True
```

entonces:

```text
esVendible = True
```

---

# 25. Capacidades Comerciales

Las capacidades comerciales o de habilitación futura son:

```text
esComprable
esVendible
permiteDescuento
```

Estas capacidades pueden cambiar aunque exista historia operativa.

La razón es:

```text
modifican operaciones futuras
≠
reinterpretar operaciones pasadas
```

Ejemplo:

```text
Articulo vendido históricamente
+
esVendible True → False
```

es válido.

Las ventas anteriores permanecen intactas.

---

# 26. Transición `esVendible = True → False`

Debe realizarse atómicamente:

```text
esVendible = False
permiteDescuento = False
precioBase = se conserva
```

No debe existir un estado observable:

```text
esVendible = False
permiteDescuento = True
```

El precio se conserva porque constituye información comercial útil.

---

# 27. Capacidades Estructurales

Las capacidades estructurales son:

```text
controlaStock
controlaVencimiento
puedeUsarseEnProduccion
```

Estas capacidades pueden poseer dependencias en módulos operativos.

Ejemplos:

```text
controlaStock
→ M04
→ stock
→ lotes
→ movimientos

puedeUsarseEnProduccion
→ M07
→ recetas
→ producción
```

No debe utilizarse la regla simplificada:

```text
si alguna vez hubo historia
→ bloquear para siempre
```

La regla correcta es:

> **Bloquear una transición estructural cuando el cambio vuelva incompatible la configuración con dependencias existentes o comprometa el significado histórico que debe conservarse.**

---

# 28. Historia vs Dependencias Activas

Debe distinguirse:

```text
Historia
```

de:

```text
Dependencia operativa activa
```

Ejemplo:

```text
Artículo tuvo movimientos hace un año
Stock actual = 0
Sin lotes abiertos
Sin dependencias productivas activas
```

El hecho de poseer historia no implica automáticamente que todas las capacidades estructurales deban permanecer congeladas para siempre.

La regla concreta dependerá de los módulos consumidores.

M02 define la necesidad de validación.

M04/M07 completarán las condiciones específicas.

---

# 29. Consistencia Estructural vs Tolerancia Operativa

Este punto es crítico.

## M02 protege consistencia estructural

M02 nunca debe aceptar configuraciones como:

```text
SERVICIO
+
controlaStock = True
```

o:

```text
permiteDescuento = True
+
esVendible = False
```

## Módulos operativos pueden tolerar excepciones

Ejemplo futuro:

```text
stock actual = -2
```

M04/M05 podrían decidir:

```text
permitir operación
mostrar advertencia
permitir ajuste posterior
cerrar inconsistencia al final del día
```

Esto no significa que M02 deba relajar sus invariantes estructurales.

Por lo tanto:

```text
inconsistencia operativa temporal
≠
configuración estructural inválida
```

---

# 30. UnidadMedida

Valores normalizados iniciales:

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

Durante el MVP:

```text
UnidadMedida
→ catálogo global del sistema
```

No pertenece a un Negocio particular.

No existen unidades personalizadas por Negocio.

---

# 31. UnidadMedida en BIEN y SERVICIO

## BIEN

Debe seleccionar explícitamente una unidad válida.

Ejemplo:

```text
Harina
→ KG
```

## SERVICIO

Recibe inicialmente:

```text
UNIDAD
```

pero puede utilizar otra unidad normalizada apropiada:

```text
Asesoramiento
→ HORA
```

---

# 32. Cambio de Unidad

`cambiarUnidad()` requiere validar que la modificación no cambie el significado de cantidades históricas.

Ejemplo:

```text
Harina
Unidad = KG
Compra histórica = 5 KG
```

No debe convertirse mediante edición simple en:

```text
UNIDAD
```

si eso altera el significado histórico.

La existencia de historia cuantitativa es una condición derivada.

NO debe crearse automáticamente:

```text
ArticuloCatalogo.tieneHistoriaOperativa : Boolean
```

La forma técnica de consultar esta condición queda abierta.

---

# 33. Precio Base

Si:

```text
esVendible = True
```

debe existir:

```text
precioBase >= 0
```

Se permite:

```text
precioBase = 0
```

Modificar precioBase:

```text
NO reescribe ventas históricas
```

---

# 34. Costo de Referencia

Es opcional.

Si existe:

```text
costoReferencia >= 0
```

No representa obligatoriamente:

```text
último costo
costo promedio
costo contable
costo histórico
```

Modificarlo no reescribe costos históricos.

---

# 35. SKU

El SKU es opcional.

Cuando existe:

```text
SKU
→ único por Negocio
```

La unicidad incluye:

```text
artículos ACTIVOS
+
artículos INACTIVOS
```

Un SKU no se libera simplemente por desactivar.

Solo queda disponible nuevamente cuando:

```text
ArticuloCatalogo
→ eliminación física válida
```

El nombre del artículo no es un identificador técnico.

---

# 36. Imagen Principal

Durante el MVP:

```text
ArticuloCatalogo
→ 0..1 imagenPrincipal
```

La estrategia técnica de almacenamiento no pertenece a este modelo.

No inferir automáticamente:

```text
filesystem
S3
URL pública
Base64
blob SQL
```

---

# 37. Desactivación de ArticuloCatalogo

Desactivar:

```text
ACTIVO → INACTIVO
```

debe:

- conservar identidad;
- conservar SKU;
- conservar historia;
- conservar referencias;
- no borrar operaciones;
- no modificar stock existente desde M02;
- retirar el artículo del uso normal en nuevas operaciones.

M02 no define todavía todas las operaciones excepcionales permitidas sobre existencias remanentes.

---

# 38. Stock Remanente de un Artículo Inactivo

Si un artículo se desactiva con stock existente:

```text
stock
→ permanece
```

M02 NO debe:

```text
poner stock en cero
eliminar lotes
borrar movimientos
```

Módulos posteriores definirán operaciones como:

```text
ajuste
baja
traslado
liquidación
consumo excepcional
```

No congelar estas reglas desde M02.

---

# 39. Eliminación Física de ArticuloCatalogo

La eliminación física es excepcional.

Solo puede ocurrir cuando:

```text
0 historia operativa
+
0 referencias
+
0 dependencias que deban conservarse
```

Normalmente:

```text
artículo utilizado
→ desactivar
```

No:

```text
artículo utilizado
→ eliminar
```

---

# 40. `puedeEliminarseFisicamente()`

Este método representa una consulta conceptual.

NO debe interpretarse como:

```text
ArticuloCatalogo
mira solamente sus propios atributos
→ conoce la respuesta
```

La respuesta puede depender de:

```text
M03 Compras
M04 Inventario
M05 Ventas
M07 Producción
```

Por lo tanto:

```text
puedeEliminarseFisicamente()
```

significa:

> existe una regla de dominio que debe poder responderse.

No significa:

> la implementación técnica ya está decidida.

---

# 41. Aislamiento entre Negocios

Toda operación debe respetar:

```text
ArticuloCatalogo.negocio
Categoria.negocio
Negocio autorizado
```

No debe permitirse:

```text
Articulo del Negocio A
+
Categoria del Negocio B
```

Tampoco:

```text
Usuario autorizado en A
→ modifica catálogo de B
```

La implementación técnica del contexto autorizado se definirá posteriormente.

---

# 42. Problemas de Diseño que Este Modelo Busca Evitar

## Problema 1 — Jerarquías rígidas

Evitar:

```text
Producto
MateriaPrima
ProductoTerminado
Servicio
```

Solución:

```text
ArticuloCatalogo
+
Tipo
+
Capacidades
```

## Problema 2 — Estados inválidos durante edición

Evitar múltiples setters independientes.

Solución:

```text
reemplazo atómico de CapacidadesArticulo
```

## Problema 3 — Pérdida de historia

Evitar eliminación indiscriminada.

Solución:

```text
desactivar
≠
eliminar físicamente
```

## Problema 4 — SKU ambiguo

Evitar reutilización de códigos de artículos inactivos.

Solución:

```text
SKU reservado mientras el artículo exista
```

## Problema 5 — Categorías duplicadas

Evitar:

```text
Snacks
SNACKS
 snacks
```

como categorías distintas.

Solución:

```text
unicidad funcional por Negocio
```

## Problema 6 — Corrupción de cantidades históricas

Evitar cambios libres de UnidadMedida.

Solución:

```text
bloquear cambios incompatibles con historia cuantitativa
```

## Problema 7 — Confundir historia con bloqueo permanente

Evitar:

```text
si hubo una operación
→ nunca más puede cambiar nada
```

Solución:

```text
distinguir capacidades comerciales
de capacidades estructurales
```

## Problema 8 — Acoplar M02 al Inventario

Evitar que M02 administre:

```text
stock
lotes
movimientos
```

Solución:

```text
M02 define capacidades
M04 administra inventario
```

---

# 43. Qué Debe Hacer una IA al Utilizar Este Diagrama

Una IA que diseñe o implemente M02 debe:

1. Leer primero `M02-Catalogo.md`.
2. Leer `01-modelo-dominio-bloque-1.md`.
3. Leer este documento.
4. Leer el `.puml`.
5. Utilizar la imagen solo como apoyo visual.
6. Respetar la pertenencia a Negocio.
7. Mantener Categoria opcional.
8. Mantener TipoArticulo inmutable.
9. Mantener CapacidadesArticulo como configuración completa.
10. No crear jerarquías de Producto/Insumo/Servicio.
11. Diferenciar capacidades comerciales de estructurales.
12. No bloquear capacidades comerciales solo porque exista historia.
13. No permitir transiciones estructurales incompatibles con dependencias existentes.
14. No borrar historia al desactivar.
15. No poner stock en cero al desactivar.
16. No utilizar Categoria INACTIVA para nuevas asociaciones.
17. Permitir conservar asociaciones históricas con Categoria INACTIVA.
18. Revalidar reglas al reactivar.
19. No hacer depender reactivación del artículo de que su Categoria histórica esté ACTIVA.
20. Preservar precioBase al deshabilitar venta.
21. Deshabilitar descuento cuando se deshabilita venta.
22. Preservar SKU mientras el artículo exista.
23. Proteger UnidadMedida frente a historia cuantitativa incompatible.
24. No inventar un campo `tieneHistoriaOperativa`.
25. No asumir que `puedeEliminarseFisicamente()` puede resolverse localmente.
26. Mantener abiertas las decisiones arquitectónicas.

---

# 44. Qué NO Debe Inferir una IA

El Diagrama 3 NO implica automáticamente que:

```text
ArticuloCatalogo sea Aggregate Root
Categoria sea Aggregate Root
CapacidadesArticulo tenga tabla propia
cada enum sea tabla SQL
Negocio se replique dentro de M02
exista Repository por entidad
exista UnitOfWork
se utilicen Domain Events
se utilice Event Sourcing
se utilice CQRS
se utilice microservicios
```

Tampoco implica que:

```text
controlaStock = True
→ M02 administra stock
```

ni que:

```text
puedeUsarseEnProduccion = True
→ M02 administra recetas
```

---

# 45. Qué Debe Consultarse en Módulos Posteriores

## M03 Compras

Para reglas relacionadas con:

```text
esComprable
historia de compras
dependencias de compra
```

## M04 Inventario

Para:

```text
controlaStock
stock actual
lotes
movimientos
ajustes
stock negativo
```

## M05 Ventas

Para:

```text
esVendible
precio aplicado
descuentos de venta
ventas históricas
liquidación futura
```

## M07 Producción

Para:

```text
puedeUsarseEnProduccion
recetas
consumos
producciones
dependencias productivas
```

M02 no debe anticipar esas reglas.

---

# 46. Implicancias para Arquitectura Futura

Este modelo sugiere necesidades técnicas futuras, pero no las resuelve todavía.

Por ejemplo:

```text
unicidad SKU por Negocio
→ necesitará garantía técnica

Categoria normalizada única
→ necesitará garantía técnica

cambio de unidad
→ necesitará consultar historia

eliminación física
→ necesitará comprobar referencias

cambio estructural de capacidades
→ necesitará consultar dependencias
```

La arquitectura deberá decidir posteriormente:

```text
Repository
Service Layer
Unit of Work
consultas entre módulos
restricciones SQL
transacciones
concurrencia
```

sin modificar las invariantes.

---

# 47. Implicancias para el Modelo Relacional

El UML NO debe traducirse mecánicamente a tablas.

Ejemplo:

```text
CapacidadesArticulo <<value object>>
```

no obliga a:

```text
tabla capacidades_articulo
```

Igualmente:

```text
UnidadMedida <<enum>>
```

no obliga a una tabla.

El modelo relacional deberá decidir la representación más adecuada manteniendo:

- unicidad;
- integridad;
- aislamiento;
- historia;
- restricciones.

---

# 48. Implicancias para la API

Una futura API no debería exponer operaciones que permitan invalidar el dominio.

Ejemplo negativo:

```text
PATCH /articulo
{
  "controlaStock": false
}
```

sin validar la configuración completa y sus dependencias.

Conceptualmente es preferible:

```text
solicitar nueva configuración
→ validar transición completa
→ confirmar
```

La forma HTTP concreta todavía no está definida.

---

# 49. Implicancias para UX

La UX debe simplificar las reglas del dominio.

No debe exigir que el usuario entienda:

```text
CapacidadesArticulo
```

Puede mostrar:

```text
☑ Lo compro
☑ Lo vendo
☑ Quiero controlar stock
☐ Lo uso para producir
☐ Tiene vencimiento
☑ Permite descuentos
```

La UI debe prevenir combinaciones inválidas antes de enviar la operación.

Sin embargo:

```text
UX
≠
única capa de validación
```

El dominio debe validar igualmente.

---

# 50. Tests Derivables del Diagrama

Como mínimo deberían derivarse pruebas para:

1. crear BIEN válido;
2. crear SERVICIO válido;
3. impedir SERVICIO con stock;
4. impedir SERVICIO con vencimiento;
5. impedir SERVICIO como insumo productivo;
6. impedir vencimiento sin stock;
7. impedir producción sin stock;
8. impedir descuento sin venta;
9. crear artículo ACTIVO con al menos un uso;
10. impedir artículo ACTIVO sin uso operativo;
11. permitir artículo INACTIVO sin uso operativo;
12. deshabilitar venta y deshabilitar descuento automáticamente;
13. conservar precio al deshabilitar venta;
14. conservar ventas históricas al deshabilitar venta;
15. cambiar esComprable con historia sin reescribir historia;
16. bloquear transición estructural incompatible;
17. permitir nueva configuración estructural cuando no existan dependencias incompatibles;
18. asignar Categoria ACTIVA del mismo Negocio;
19. impedir Categoria de otro Negocio;
20. impedir nueva asociación con Categoria INACTIVA;
21. conservar asociación existente cuando Categoria se desactiva;
22. reactivar Categoria conservando relaciones;
23. impedir eliminar Categoria con artículo ACTIVO;
24. impedir eliminar Categoria con artículo INACTIVO;
25. impedir duplicar Categoria equivalente;
26. reactivar Categoria equivalente INACTIVA en lugar de duplicar;
27. SKU único entre activos e inactivos;
28. liberar SKU únicamente después de eliminación física válida;
29. cambiar UnidadMedida antes de historia cuantitativa;
30. impedir cambio incompatible con historia cuantitativa;
31. desactivar artículo conservando identidad;
32. desactivar artículo conservando SKU;
33. desactivar artículo sin alterar stock existente;
34. reactivar artículo válido;
35. reactivar artículo asociado históricamente a Categoria INACTIVA;
36. rechazar reactivación si configuración activa sería inválida;
37. eliminar físicamente solo artículo sin historia ni referencias;
38. impedir eliminación de artículo utilizado;
39. preservar aislamiento entre Negocios.

---

# 51. Relación con Diagramas Posteriores

El Diagrama 3 describe:

```text
estructura estática
+
responsabilidades
+
invariantes principales
```

No sustituye:

```text
06-m02-estados-articulo.puml
```

ni:

```text
secuencias/02-editar-articulo.puml
```

La separación correcta será:

```text
Diagrama 3
→ estructura

Diagrama 6
→ estados y transiciones

Secuencia 02
→ coordinación dinámica de edición
```

---

# 52. Criterios de Aceptación del Diagrama 3

El Diagrama 3 puede considerarse válido cuando:

1. Negocio aparece como referencia externa de M01.
2. Negocio posee 0..N Categorias.
3. Negocio posee 0..N ArticulosCatalogo.
4. Categoria posee identidad, nombre y estado.
5. Categoria no incorpora atributos no definidos.
6. Categoria es opcional para ArticuloCatalogo.
7. Categoria INACTIVA conserva asociaciones existentes.
8. Categoria INACTIVA no admite nuevas asociaciones.
9. Reactivar Categoria conserva relaciones.
10. Eliminar Categoria exige ausencia de artículos asociados.
11. ArticuloCatalogo representa BIEN y SERVICIO.
12. TipoArticulo es inmutable.
13. ArticuloCatalogo posee UnidadMedida.
14. ArticuloCatalogo posee SKU opcional.
15. SKU es único por Negocio incluyendo inactivos.
16. ArticuloCatalogo posee precioBase opcional.
17. ArticuloCatalogo posee costoReferencia opcional.
18. ArticuloCatalogo posee imagenPrincipal opcional.
19. ArticuloCatalogo posee CapacidadesArticulo.
20. CapacidadesArticulo es Value Object.
21. CapacidadesArticulo se reemplaza como configuración completa.
22. SERVICIO no controla stock.
23. SERVICIO no controla vencimiento.
24. SERVICIO no participa como insumo de producción.
25. Vencimiento implica BIEN + stock.
26. Producción implica BIEN + stock.
27. Descuento implica vendible.
28. Deshabilitar venta deshabilita descuento y conserva precio.
29. Artículo ACTIVO exige uso operativo mínimo.
30. Artículo INACTIVO puede carecer de uso operativo.
31. Reactivar revalida invariantes.
32. Categoria histórica INACTIVA no bloquea reactivación.
33. Capacidades comerciales pueden cambiar sin borrar historia.
34. Capacidades estructurales requieren validar dependencias.
35. Historia no implica bloqueo permanente por sí sola.
36. UnidadMedida queda protegida frente a historia incompatible.
37. Desactivar no borra historia.
38. Desactivar no borra ni modifica stock desde M02.
39. Eliminar físicamente es excepcional.
40. `puedeEliminarseFisicamente()` puede depender de otros módulos.
41. El diagrama no introduce infraestructura técnica.
42. Las decisiones arquitectónicas abiertas permanecen abiertas.

---

# 53. Decisiones que Permanecen Abiertas

No decidir todavía:

```text
Aggregate Root de M02

límites formales de agregados

Factory Methods

Domain Services

Application Services

Repository

Unit of Work

Domain Events

estrategia de consulta de dependencias

estrategia de transacciones

concurrencia

normalización técnica de Categoria

normalización técnica de SKU

precisión monetaria

precisión de cantidades

almacenamiento de imágenes

tablas

foreign keys

índices

ORM
```

---

# 54. Criterio Rector para IA

Una IA debe interpretar el Diagrama 3 mediante el siguiente principio:

> **M02 define qué es un artículo, cómo puede utilizarse y qué configuraciones son estructuralmente válidas; no administra las operaciones históricas ni el estado operativo de los módulos que consumen ese artículo.**

En particular:

```text
ArticuloCatalogo
→ identidad comercial/operativa

TipoArticulo
→ naturaleza general

CapacidadesArticulo
→ usos permitidos

Categoria
→ organización

UnidadMedida
→ significado de cantidades

M03/M04/M05/M07
→ operaciones reales e historia

Arquitectura
→ coordinación técnica
```

---

# 55. Estado Esperado del Artefacto

Una vez revisado, sincronizado con `M02-Catalogo.md` y renderizado correctamente:

```text
BLOQUE 1 — FUNDACIÓN

Modelo de Dominio
├── 01 — Mapa General                         ✅ CONGELADO
├── 02 — M01 Organización — Clases           ✅ CONGELADO
└── 03 — M02 Catálogo — Clases               ✅ CONGELADO
```

Antes de marcarlo como congelado debe verificarse:

```text
M02-Catalogo.md
↕
01-modelo-dominio-bloque-1.md
↕
03-m02-catalogo-clases.md
↕
03-m02-catalogo-clases.puml
```

Los cuatro artefactos deben expresar las mismas reglas sin contradicciones.

---

# 56. Regla Final

El UML debe utilizarse como:

```text
representación visual del dominio
```

y no como:

```text
especificación automática de clases ORM
```

Una IA puede usarlo para:

- comprender relaciones;
- derivar responsabilidades;
- identificar invariantes;
- proponer casos de uso;
- diseñar tests;
- apoyar arquitectura;
- generar código posteriormente.

Pero debe validar cualquier decisión contra la especificación funcional y contra esta guía antes de convertirla en implementación.
