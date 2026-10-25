# 03 — M02 Catálogo — Guía de Interpretación del Diagrama de Clases

## 1. Propósito del Documento

Este documento acompaña al diagrama oficial:

```text
03-m02-catalogo-clases.puml
```

y a su representación visual:

```text
03-m02-catalogo-clases.png
```

Su objetivo es permitir que:

```text
persona
desarrollador
arquitecto
revisor
modelo de IA
```

interprete correctamente el **Diagrama 3 — M02 Catálogo** y lo utilice como referencia durante:

```text
análisis
arquitectura
modelo relacional
contrato API
backend
frontend
tests
mantenimiento
revisión de cambios
generación asistida por IA
```

El documento debe explicar no solamente qué muestra el UML, sino también:

- qué problema de dominio resuelve;
- qué conceptos son responsabilidad de M02;
- qué invariantes están cerradas;
- qué operaciones necesitan información contextual;
- qué información pertenece a módulos posteriores;
- qué riesgos de implementación deben evitarse;
- qué decisiones siguen abiertas para Arquitectura;
- cómo derivar correctamente código y tests sin convertir el UML mecánicamente en ORM o CRUD.

Este archivo constituye la **guía semántica del Diagrama 3**.

No reemplaza la especificación funcional.

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

documenta cómo debe interpretarse:

```text
03-m02-catalogo-clases.puml
```

---

# 3. Estado del Artefacto

El Diagrama 3 ya no debe interpretarse como un diseño experimental.

Estado esperado:

```text
03-m02-catalogo-clases.md      ✅ SINCRONIZADO
03-m02-catalogo-clases.puml    ✅ CONGELADO
03-m02-catalogo-clases.png     ✅ CONGELADO
```

La palabra **congelado** significa:

```text
la estructura y las invariantes representadas
no deben modificarse silenciosamente durante implementación
```

No significa:

```text
que nunca pueda evolucionar
```

Si una necesidad futura exige modificar:

- entidades;
- cardinalidades;
- estados;
- invariantes;
- política de SKU;
- reglas de Categoria;
- comportamiento de capacidades;

primero debe modificarse la especificación funcional correspondiente y luego actualizarse:

```text
M02-Catalogo.md
↓
01-modelo-dominio-bloque-1.md
↓
03-m02-catalogo-clases.md
↓
03-m02-catalogo-clases.puml
↓
implementación
```

---

# 4. Fuentes de Verdad

Para interpretar o implementar M02 debe respetarse este orden:

```text
1. modulos/M02-Catalogo.md

2. modelo-dominio/bloque-1-fundacion/
   01-modelo-dominio-bloque-1.md

3. modelo-dominio/bloque-1-fundacion/
   03-m02-catalogo-clases.md

4. modelo-dominio/bloque-1-fundacion/
   03-m02-catalogo-clases.puml

5. ADRs / Diseño Técnico

6. Modelo Relacional

7. Contrato API

8. Código
```

Si dos fuentes se contradicen:

```text
NO elegir silenciosamente una
NO inferir una solución
NO corregir desde el código
```

Debe resolverse primero la contradicción documental.

La implementación nunca se convierte en fuente superior por haber sido escrita después.

---

# 5. Objetivo del Diagrama

El Diagrama 3 debe permitir responder:

```text
¿Qué representa ArticuloCatalogo?

¿Qué representa Categoria?

¿Cómo se diferencia BIEN de SERVICIO?

¿Qué son las capacidades?

¿Qué capacidades son comerciales?

¿Qué capacidades son estructurales?

¿Qué reglas puede validar un objeto con información local?

¿Qué reglas necesitan contexto del Negocio?

¿Qué reglas necesitan información de módulos posteriores?

¿Qué significa ACTIVO?

¿Qué significa INACTIVO?

¿Qué significa desactivar?

¿Qué significa eliminar físicamente?

¿Qué datos representan estado actual?

¿Qué historia debe preservarse fuera de M02?

¿Qué decisiones pertenecen todavía a Arquitectura?
```

---

# 6. Problema Principal que Resuelve M02

La plataforma debe funcionar para negocios distintos sin crear un modelo específico para cada rubro.

Debe poder representar, por ejemplo:

```text
mercadería para reventa
materias primas
insumos
productos elaborados
servicios
bienes comprables pero no vendibles
bienes vendibles pero no comprables
bienes con stock
bienes sin stock controlado
bienes con vencimiento
servicios por unidad
servicios por hora
```

No se utiliza una jerarquía rígida:

```text
Producto
MateriaPrima
Insumo
ProductoTerminado
Mercaderia
Servicio
```

para expresar esos comportamientos.

La solución conceptual es:

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

> **Un artículo se define por su naturaleza general y por sus capacidades operativas; no por una jerarquía rígida de clases comerciales.**

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

El Diagrama 3 representa:

```text
Negocio
[referencia externa de M01]

Categoria
ArticuloCatalogo

CapacidadesArticulo

EstadoCategoria
EstadoArticulo
TipoArticulo
UnidadMedida
```

También representa:

- relaciones;
- cardinalidades;
- composición conceptual;
- estado;
- comportamiento relevante;
- invariantes principales;
- restricciones de modificación;
- dependencia conceptual de información externa.

---

# 9. Elementos Fuera del Alcance

M02 NO administra:

```text
StockUbicacion
StockActual
Lote
MovimientoInventario
fechaVencimiento concreta

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

Tampoco decide todavía:

```text
tablas
foreign keys
índices
constraints SQL
ORM
SQLAlchemy
Pydantic
DTOs
endpoints
Repository
Unit of Work
Domain Events
Aggregate Roots formales
Service Layer concreto
locking
estrategia de transacciones
```

---

# 10. Dependencia con M01

`Negocio` aparece como referencia externa porque M02 depende del contexto organizacional definido por M01.

M02 utiliza Negocio para:

```text
pertenencia
aislamiento entre Negocios
unicidad contextual
moneda base
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

Reglas que no pueden entenderse sin Negocio:

```text
SKU único por Negocio

Categoria.nombre único por Negocio

ArticuloCatalogo y Categoria
deben pertenecer al mismo Negocio
```

El Diagrama 3 no redefine internamente M01.

---

# 11. Identidad de Dominio vs Claves Funcionales

Este punto es crítico para implementación.

`ArticuloCatalogo` posee una identidad estable propia.

Por lo tanto:

```text
ArticuloCatalogo.identidad
≠
ArticuloCatalogo.sku
```

y:

```text
ArticuloCatalogo.identidad
≠
ArticuloCatalogo.nombre
```

El SKU:

```text
es opcional
es editable
puede quitarse
puede reutilizarse cuando queda libre
```

El nombre también es editable.

Ninguno debe utilizarse como identidad técnica primaria del artículo.

La misma regla conceptual aplica a Categoria:

```text
Categoria.identidad
≠
Categoria.nombre
```

Renombrar una Categoria no crea otra entidad.

---

# 12. Entidad `Categoria`

## 12.1. Responsabilidad

`Categoria` organiza artículos dentro de un Negocio.

No determina:

```text
precio
promoción
descuento
stock
vencimiento
producción
```

No debe utilizarse como contenedor de reglas comerciales que no hayan sido definidas explícitamente.

## 12.2. Información Conceptual

```text
Categoria
├── identidad
├── nombre
└── estado : EstadoCategoria
```

No posee durante el MVP:

```text
descripcion
jerarquía padre/hijo
reglas de precio
reglas de promoción
```

---

# 13. Estado de Categoria

Estados:

```text
ACTIVA
INACTIVA
```

No agregar sin modificar la especificación:

```text
BORRADOR
ELIMINADA
ARCHIVADA
SUSPENDIDA
```

La eliminación física:

```text
NO es un estado
```

---

# 14. Unicidad de Categoria

Dentro de un mismo Negocio:

```text
Categoria.nombre
```

debe ser único luego de la normalización funcional definida por el sistema.

Conceptualmente equivalentes:

```text
Snacks
SNACKS
 snacks
```

La regla considera:

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

La normalización técnica exacta permanece abierta.

No congelar todavía decisiones como:

```text
lowercase exacto
Unicode normalization exacta
tratamiento exacto de acentos
collation SQL
```

---

# 15. Validación de Unicidad de Categoria

La propia instancia `Categoria` no puede conocer todas las categorías del Negocio.

Por lo tanto:

```text
cambiarNombre(...)
```

es una operación conceptual válida, pero la regla:

```text
nombre normalizado único por Negocio
```

requiere contexto externo.

No implementar la unicidad únicamente como:

```text
if nombreDisponible():
    guardar()
```

sin una garantía final consistente.

La forma técnica se resolverá en Arquitectura / Modelo Relacional.

---

# 16. Categoria INACTIVA

Una Categoria INACTIVA:

```text
continúa existiendo
conserva identidad
conserva referencias
conserva artículos asociados
```

No provoca:

```text
ArticuloCatalogo → INACTIVO
```

No modifica:

```text
precioBase
costoReferencia
SKU
UnidadMedida
CapacidadesArticulo
```

No recalcula precios ni promociones.

---

# 17. Asociaciones con Categoria INACTIVA

Debe distinguirse entre asociación histórica y nueva asociación.

## 17.1. Asociación Existente

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

El artículo puede permanecer ACTIVO.

## 17.2. Nueva Asociación

```text
Articulo B
+
Categoria X INACTIVA
```

Resultado:

```text
rechazar
→ solicitar reactivar Categoria
```

## 17.3. Reasignación

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
→ válida como asociación histórica existente
→ inválida como nueva asociación
```

---

# 18. Reactivación de Categoria

```text
INACTIVA → ACTIVA
```

debe:

- reutilizar la misma entidad;
- conservar identidad;
- conservar relaciones;
- conservar artículos asociados.

No debe:

- generar otra Categoria;
- recargar artículos;
- recalcular precios;
- recalcular promociones;
- modificar SKU;
- cambiar capacidades.

---

# 19. Eliminación Física de Categoria

La eliminación física es excepcional.

Solo puede confirmarse cuando:

```text
0 ArticuloCatalogo asociados
+
0 dependencias que deban conservarse
```

Esto incluye artículos:

```text
ACTIVOS
INACTIVOS
```

`puedeEliminarseFisicamente()` puede existir como consulta conceptual para UX o diagnóstico.

No debe interpretarse como autorización definitiva.

La operación de eliminación real debe volver a garantizar las condiciones al confirmar.

---

# 20. Entidad `ArticuloCatalogo`

## 20.1. Responsabilidad

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

## 20.2. Información Conceptual

```text
ArticuloCatalogo
├── identidad
├── Negocio
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

# 21. Los Métodos del UML NO son Exhaustivos

El Diagrama 3 muestra principalmente operaciones que poseen comportamiento o invariantes relevantes.

La ausencia de un método específico NO implica inmutabilidad.

Por ejemplo, conceptualmente pueden editarse:

```text
nombre
descripcion
SKU
imagenPrincipal
```

aunque no sea necesario llenar el UML con métodos CRUD triviales para cada atributo.

Únicamente:

```text
TipoArticulo
```

está definido explícitamente como inmutable.

Una IA no debe inferir:

```text
no hay cambiarSku()
→ SKU inmutable
```

ni:

```text
no hay cambiarNombre()
→ nombre inmutable
```

---

# 22. TipoArticulo

Valores:

```text
BIEN
SERVICIO
```

Es:

```text
obligatorio
+
inmutable después de creación
```

No existe:

```text
cambiarTipo()
```

Si se creó incorrectamente y nunca fue utilizado:

```text
eliminar físicamente
+
crear correctamente
```

Si posee historia:

```text
desactivar
+
crear otro artículo
```

No reinterpretar retrospectivamente la identidad de un artículo utilizado.

---

# 23. EstadoArticulo

Estados:

```text
ACTIVO
INACTIVO
```

No agregar:

```text
BORRADOR
ARCHIVADO
SUSPENDIDO
ELIMINADO
```

sin modificar la especificación.

La eliminación física no es un estado.

---

# 24. Uso Operativo Mínimo

Un artículo ACTIVO debe poseer al menos uno:

```text
esComprable = True
o
esVendible = True
o
puedeUsarseEnProduccion = True
```

Un artículo INACTIVO puede quedar con:

```text
esComprable = False
esVendible = False
puedeUsarseEnProduccion = False
```

No aplicar la regla de uso operativo mínimo indiscriminadamente a artículos INACTIVOS.

---

# 25. Reactivación de ArticuloCatalogo

`reactivar()` no es:

```text
estado = ACTIVO
```

sin validación.

Debe revalidar las invariantes vigentes necesarias para volver a operar.

Incluye conceptualmente:

```text
coherencia Tipo + Capacidades
uso operativo mínimo
precioBase válido si esVendible
compatibilidad con dependencias estructurales
otras guardias contextuales necesarias
```

No reescribe historia.

No reconstruye operaciones anteriores.

Una Categoria históricamente asociada que actualmente se encuentre INACTIVA:

```text
NO bloquea la reactivación
```

porque no se trata de una nueva asociación.

---

# 26. Value Object `CapacidadesArticulo`

`CapacidadesArticulo` representa una configuración completa.

No posee identidad propia.

Atributos:

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
<<value object>>
```

y no automáticamente como:

```text
tabla propia
Aggregate Root
entidad ORM independiente
objeto con identidad técnica
```

---

# 27. Actualización Atómica de Capacidades

Las capacidades se actualizan conceptualmente mediante:

```text
actualizarCapacidades(nuevaConfiguracionCompleta)
```

No diseñar el dominio inicialmente alrededor de:

```text
setVendible()
setComprable()
setStock()
setVencimiento()
setProduccion()
setDescuento()
```

La transición correcta es:

```text
Configuración válida A
        ↓
validación completa
        ↓
Configuración válida B
```

sin estados intermedios inválidos observables.

---

# 28. Responsabilidad de `esCoherenteCon()`

`CapacidadesArticulo.esCoherenteCon(tipo)` valida solamente:

```text
TipoArticulo
+
CapacidadesArticulo
```

No debe convertirse en una función omnisciente.

Puede verificar:

```text
SERVICIO sin stock
SERVICIO sin vencimiento
SERVICIO sin producción

vencimiento → BIEN + stock
producción → BIEN + stock
descuento → vendible
```

No debe validar por sí sola:

```text
precioBase
estado ACTIVO/INACTIVO
SKU
Categoria
pertenencia al Negocio
stock real
lotes
recetas
historia cuantitativa
autorización
```

---

# 29. Capacidades ≠ Hechos Operativos

Este punto debe preservarse durante implementación.

```text
controlaStock
≠
stock actual
```

```text
controlaVencimiento
≠
fecha de vencimiento concreta
```

```text
puedeUsarseEnProduccion
≠
receta
```

```text
esVendible
≠
Venta
```

```text
esComprable
≠
Compra
```

Las capacidades expresan:

```text
elegibilidad
configuración
uso permitido
```

Los hechos operativos pertenecen a otros módulos.

No agregar dentro de `ArticuloCatalogo` por interpretación de estas capacidades:

```text
stockActual
listaDeLotes
fechaVencimiento
listaDeCompras
listaDeVentas
recetas
producciones
```

---

# 30. Reglas Internas de Capacidades

## 30.1. SERVICIO

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

## 30.2. Vencimiento

Si:

```text
controlaVencimiento = True
```

entonces:

```text
tipo = BIEN
controlaStock = True
```

## 30.3. Producción

Si:

```text
puedeUsarseEnProduccion = True
```

entonces:

```text
tipo = BIEN
controlaStock = True
```

## 30.4. Descuento

Si:

```text
permiteDescuento = True
```

entonces:

```text
esVendible = True
```

---

# 31. Capacidades Comerciales

Se consideran comerciales / de habilitación futura:

```text
esComprable
esVendible
permiteDescuento
```

Estas capacidades pueden cambiar aunque exista historia.

Los cambios afectan:

```text
operaciones futuras
```

No reinterpretan:

```text
operaciones pasadas
```

Ejemplo válido:

```text
Articulo vendido históricamente
+
esVendible True → False
```

Las ventas anteriores permanecen intactas.

---

# 32. Habilitar Venta

La transición:

```text
esVendible False → True
```

solo puede confirmarse si:

```text
precioBase existe
+
precioBase >= 0
```

No permitir:

```text
Articulo ACTIVO
+
esVendible = True
+
precioBase = null
```

La regla requiere información de `ArticuloCatalogo`, no solamente de `CapacidadesArticulo`.

---

# 33. Deshabilitar Venta

La transición:

```text
esVendible True → False
```

produce dentro de la misma modificación válida:

```text
esVendible = False
permiteDescuento = False
precioBase = se conserva
```

No debe existir un estado confirmado:

```text
esVendible = False
permiteDescuento = True
```

El precio se conserva como información comercial actual sin efecto operativo mientras el artículo no sea vendible.

---

# 34. Capacidades Estructurales

Se consideran estructurales:

```text
controlaStock
controlaVencimiento
puedeUsarseEnProduccion
```

Pueden tener dependencias en módulos consumidores.

Ejemplos:

```text
controlaStock
→ M04
→ stock
→ lotes
→ movimientos
```

```text
puedeUsarseEnProduccion
→ M07
→ recetas
→ consumos
→ producción
```

No aplicar:

```text
si alguna vez hubo historia
→ bloquear para siempre
```

La regla es:

> **Bloquear una transición estructural cuando el cambio resulte incompatible con dependencias existentes o altere el significado histórico que deba preservarse.**

---

# 35. Historia vs Dependencia Operativa

Debe distinguirse:

```text
tener historia
```

de:

```text
tener una dependencia que impide la transición
```

Ejemplo conceptual:

```text
Artículo tuvo movimientos hace un año
Stock actual = 0
Sin lotes abiertos
Sin dependencias productivas incompatibles
```

La existencia de historia no implica automáticamente que todas las capacidades estructurales deban quedar bloqueadas para siempre.

M02 define la necesidad de validar.

Los módulos consumidores completarán las condiciones específicas.

---

# 36. Consistencia Estructural vs Tolerancia Operativa

M02 protege consistencia estructural.

Nunca debe aceptar:

```text
SERVICIO
+
controlaStock = True
```

ni:

```text
permiteDescuento = True
+
esVendible = False
```

Sin embargo, módulos operativos posteriores podrán decidir si toleran temporalmente situaciones como:

```text
stock negativo
```

para sostener la operación diaria.

Por lo tanto:

```text
inconsistencia operativa temporal
≠
configuración estructural inválida
```

No solucionar problemas operativos relajando invariantes estructurales de M02.

---

# 37. Precio Base

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

El artículo no posee moneda independiente.

Los importes utilizan:

```text
Negocio.monedaBase
```

Durante el MVP:

```text
ARS
```

---

# 38. Costo de Referencia

Es opcional.

Si existe:

```text
costoReferencia >= 0
```

No significa obligatoriamente:

```text
último costo
costo promedio
costo contable
costo histórico definitivo
```

Modificarlo no modifica costos históricos de módulos consumidores.

---

# 39. Política Final de SKU

Este punto reemplaza cualquier interpretación histórica anterior.

El SKU:

```text
es opcional
es editable
NO es identidad técnica
```

Cuando existe:

```text
SKU ACTUAL
→ único dentro del Negocio
```

considerando artículos:

```text
ACTIVOS
+
INACTIVOS
```

Desactivar un artículo:

```text
NO libera su SKU actual
```

---

# 40. Transiciones de SKU

## 40.1. A → B

```text
SKU actual = A
nuevo SKU = B
```

Debe:

1. validar contextual y consistentemente que `B` esté disponible;
2. confirmar el cambio;
3. asignar `B`;
4. liberar `A` después de la confirmación.

No debe existir un estado confirmado donde dos artículos del mismo Negocio posean `B`.

## 40.2. A → null

```text
SKU actual = A
nuevo SKU = null
```

Al confirmar:

```text
A queda disponible
```

## 40.3. null → B

Debe validarse que:

```text
B está disponible
```

antes y al confirmar la modificación.

## 40.4. A → A

Se considera:

```text
no-op
```

No constituye modificación funcional.

---

# 41. Historia de SKU

M02 NO mantiene durante el MVP:

```text
historial de SKU
alias de SKU
reserva permanente de SKUs anteriores
```

Cuando un SKU anterior queda libre mediante una modificación válida:

```text
puede reutilizarse
```

Si una operación histórica necesita conocer el SKU usado en ese momento:

```text
el módulo transaccional correspondiente
debe preservar ese valor histórico
```

Si en el futuro se desea impedir reutilización de SKUs históricos:

```text
deberá modelarse explícitamente
```

No inventar esa política durante la implementación actual.

---

# 42. UnidadMedida

Valores iniciales:

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

Durante el MVP es:

```text
catálogo global normalizado
```

No pertenece a un Negocio particular.

No se crean unidades personalizadas por Negocio.

---

# 43. UnidadMedida en BIEN y SERVICIO

## BIEN

Debe poseer una unidad válida elegida explícitamente.

Ejemplo:

```text
Harina
→ KG
```

## SERVICIO

Posee también UnidadMedida.

Valor inicial:

```text
UNIDAD
```

Puede utilizar otra unidad apropiada:

```text
Asesoramiento
→ HORA
```

---

# 44. Cambio de Unidad e Historia Cuantitativa

`cambiarUnidad()` no debe alterar el significado de cantidades históricas.

Ejemplo:

```text
Harina
Unidad = KG
Compra histórica = 5 KG
```

No convertir mediante simple edición:

```text
KG → UNIDAD
```

si eso vuelve ambiguas o incorrectas las cantidades registradas.

La existencia de historia cuantitativa:

```text
es una condición derivada
```

NO agregar automáticamente:

```text
ArticuloCatalogo.tieneHistoriaOperativa : Boolean
```

La forma técnica de consultar esa información queda abierta.

---

# 45. Imagen Principal

Durante el MVP:

```text
ArticuloCatalogo
→ 0..1 imagenPrincipal
```

El diagrama no decide:

```text
filesystem
S3
blob SQL
URL pública
Base64
```

La estrategia de almacenamiento pertenece a Diseño Técnico.

---

# 46. Desactivación de ArticuloCatalogo

```text
ACTIVO → INACTIVO
```

debe:

- conservar identidad;
- conservar SKU actual;
- conservar historia;
- conservar referencias;
- no borrar operaciones;
- no alterar existencias administradas por M04;
- retirar el artículo del uso normal en nuevas operaciones.

Desactivar:

```text
≠
eliminar físicamente
```

---

# 47. Stock Remanente

Si un artículo se desactiva con stock:

```text
stock existente
→ permanece
```

M02 NO debe:

```text
poner stock en cero
eliminar lotes
eliminar movimientos
```

M04 y otros módulos definirán qué operaciones son válidas sobre existencias remanentes.

Ejemplos posibles futuros:

```text
ajuste
baja
traslado
liquidación
```

No congelar estas políticas dentro de M02.

---

# 48. Eliminación Física de ArticuloCatalogo

Es excepcional.

Solo puede confirmarse cuando no existan:

```text
historia operativa relevante
referencias
dependencias que deban conservarse
```

Normalmente:

```text
artículo utilizado
→ desactivar
```

No:

```text
artículo utilizado
→ eliminar físicamente
```

---

# 49. `puedeEliminarseFisicamente()`

Representa una consulta conceptual.

Puede utilizarse para:

```text
UX
diagnóstico
orientación
```

No significa:

```text
la entidad aislada conoce toda la respuesta
```

La respuesta puede depender de módulos consumidores.

Tampoco significa:

```text
si devuelve True
→ eliminar después sin revalidar
```

La eliminación real debe volver a garantizar las condiciones al confirmar.

---

# 50. Estado Actual vs Historia

M02 representa:

```text
estado ACTUAL del catálogo
```

Pueden cambiar:

```text
nombre
descripcion
Categoria
SKU
precioBase
costoReferencia
imagen
capacidades permitidas
estado
```

Los módulos transaccionales deben preservar los valores históricos que necesiten para interpretar correctamente sus operaciones.

No reconstruir una operación histórica leyendo solamente:

```text
ArticuloCatalogo.nombre actual
ArticuloCatalogo.sku actual
ArticuloCatalogo.precioBase actual
Categoria actual
```

si esa operación necesita los valores existentes al momento original.

Este documento no impone la técnica concreta:

```text
snapshot
campos copiados
versionado
otra estrategia
```

---

# 51. Validaciones Locales

Una validación es local cuando puede resolverse con información del propio objeto/configuración.

Ejemplos:

```text
SERVICIO no controla stock

SERVICIO no controla vencimiento

descuento implica vendible

precioBase no negativo

costoReferencia no negativo

uso operativo mínimo
cuando ya se conoce toda la configuración del artículo
```

Estas invariantes no deben depender exclusivamente de la UI.

---

# 52. Validaciones Contextuales

Necesitan información fuera de una única instancia.

Ejemplos:

```text
SKU único por Negocio

Categoria.nombre único por Negocio

Categoria pertenece al mismo Negocio

Categoria ACTIVA para nueva asociación

dependencias estructurales

historia cuantitativa

eliminación física

algunas condiciones de reactivación
```

No fingir que:

```text
ArticuloCatalogo
```

aislado conoce toda esa información.

La coordinación concreta permanece abierta hasta Arquitectura.

---

# 53. Preconsulta vs Confirmación

Una consulta previa puede orientar la UX:

```text
puedeEliminarseFisicamente()
skuDisponible()
categoriaDisponible()
puedeCambiarUnidad()
```

Pero:

```text
preconsulta
≠
garantía definitiva
```

Patrón peligroso:

```text
if puede():
    # pasa tiempo / otra operación modifica el sistema
    guardar_sin_revalidar()
```

Las guardias contextuales relevantes y la mutación deben confirmarse de manera consistente.

La forma técnica puede incluir posteriormente:

```text
constraints
transacciones
locking
versionado
otra estrategia
```

pero no se decide en este UML.

---

# 54. Concurrencia y Riesgo TOCTOU

Existe un riesgo general de:

```text
Time Of Check
        ↓
Time Of Use
```

cuando se separa:

```text
validación
```

de:

```text
mutación
```

Ejemplos especialmente sensibles:

```text
asignar SKU
renombrar Categoria
eliminar Categoria
eliminar ArticuloCatalogo
cambiar UnidadMedida
cambiar capacidad estructural
reactivar
```

El modelo exige consistencia.

La estrategia de concurrencia se decidirá posteriormente.

---

# 55. Autorización

Los métodos del dominio:

```text
NO autorizan actores
```

No agregar parámetros como:

```text
rol
usuarioActual
token
```

a cada método de `ArticuloCatalogo` o `Categoria` para resolver autorización.

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

Después de autorizar:

```text
el dominio todavía debe validar sus invariantes
```

Autorización y consistencia son responsabilidades diferentes.

---

# 56. Permisos M02

## PROPIETARIO

Puede:

```text
consultar
crear
editar
activar
desactivar
reactivar
eliminar cuando corresponda
administrar Categoria
modificar precio
modificar costo
modificar capacidades
modificar SKU
modificar UnidadMedida cuando corresponda
```

## ENCARGADO

Puede:

```text
consultar
activar ArticuloCatalogo
desactivar ArticuloCatalogo
reactivar ArticuloCatalogo
```

No administra configuración estructural ni Categorias.

## TRABAJADOR

Puede:

```text
consultar
buscar
visualizar información necesaria para operar
```

No modifica M02.

No crear una entidad dinámica `Permiso` durante el MVP.

---

# 57. Aislamiento entre Negocios

Toda operación debe respetar:

```text
Negocio autorizado
ArticuloCatalogo.negocio
Categoria.negocio
```

Nunca permitir:

```text
Articulo del Negocio A
+
Categoria del Negocio B
```

ni:

```text
Usuario autorizado en A
→ modifica recursos de B
```

La estrategia técnica de aislamiento se decidirá en Arquitectura.

No confundir este requisito funcional con una estrategia específica de multitenencia.

---

# 58. Trazabilidad

Toda modificación relevante debe poder responder conceptualmente:

```text
¿Quién?
¿Cuándo?
¿Qué hizo?
```

Ejemplos:

```text
crear artículo
modificar SKU
cambiar precio
cambiar capacidades
desactivar
reactivar
renombrar Categoria
```

Esto no obliga todavía a:

```text
Entidad Auditoria universal
Domain Events
Event Sourcing
```

La estrategia técnica permanece abierta.

---

# 59. Relación con M03 — Compras

M03 utilizará artículos con:

```text
esComprable = True
```

M02 no registra Compras.

Una Compra histórica no debe reconstruirse utilizando exclusivamente datos actuales de M02 cuando necesite valores históricos propios.

---

# 60. Relación con M04 — Inventario

M04 administra existencias solamente cuando:

```text
controlaStock = True
```

M02 NO administra:

```text
stock actual
lotes
movimientos
ajustes
```

M04 completará las condiciones concretas para cambios estructurales relacionados con stock y vencimiento.

---

# 61. Relación con M05 — Ventas

M05 utiliza artículos con:

```text
esVendible = True
```

M02 aporta:

```text
precioBase actual
```

como referencia.

M05 debe preservar:

```text
precio realmente aplicado
```

y otros datos históricos necesarios.

Cambiar el catálogo no reescribe Ventas anteriores.

---

# 62. Relación con M07 — Producción

M07 podrá utilizar como insumos:

```text
puedeUsarseEnProduccion = True
```

que implica:

```text
tipo = BIEN
controlaStock = True
```

M02 no contiene:

```text
Receta
Produccion
Consumo
```

M07 completará dependencias estructurales relacionadas con producción.

---

# 63. Implicancias para Arquitectura

Este diagrama exige que Arquitectura pueda resolver posteriormente:

```text
unicidad contextual
guardias contextuales
atomicidad
concurrencia
consultas de historia
consultas de dependencias
autorización
trazabilidad
```

Pero no prescribe todavía:

```text
Repository
UnitOfWork
DomainService
ApplicationService
DomainEvents
locks
transactions
```

Una arquitectura futura debe satisfacer las invariantes, no reinterpretarlas.

---

# 64. Implicancias para el Modelo Relacional

No traducir mecánicamente:

```text
1 clase UML
=
1 tabla
```

En particular:

```text
CapacidadesArticulo <<value object>>
```

no obliga a una tabla separada.

```text
UnidadMedida <<enum>>
```

no obliga a una tabla.

El Modelo Relacional deberá garantizar donde corresponda:

```text
unicidad
integridad referencial
aislamiento por Negocio
restricciones
concurrencia
```

sin alterar el significado del dominio.

---

# 65. Implicancias para la API

Una API futura no debe permitir saltarse invariantes.

Ejemplo peligroso:

```text
PATCH /articulos/{id}
{
  "controlaStock": false
}
```

si se procesa como modificación ciega de un campo.

Conceptualmente debe realizarse:

```text
solicitud de nueva configuración
        ↓
autorización
        ↓
carga de contexto requerido
        ↓
validación de transición completa
        ↓
confirmación consistente
```

La forma HTTP concreta permanece abierta.

---

# 66. PATCH Parcial no Significa Setter Parcial

Aunque una API futura utilice HTTP PATCH:

```text
PATCH
```

eso no implica que el dominio deba ejecutar:

```text
setCampo()
```

sin validar el estado completo resultante.

La capa de aplicación puede:

```text
recibir cambios parciales
+
construir configuración candidata completa
+
validar
+
confirmar
```

---

# 67. Implicancias para UX

La UX debe simplificar las capacidades.

Puede mostrar:

```text
☑ Lo compro
☑ Lo vendo
☑ Quiero controlar stock
☐ Lo uso para producir
☐ Tiene vencimiento
☑ Permite descuentos
```

No debe exigir comprender nombres internos.

La UI debe prevenir combinaciones inválidas, pero:

```text
UX
≠
única capa de validación
```

El backend/dominio debe validar igualmente.

---

# 68. Mensajes de Error y Diagnóstico

Una implementación útil no debería responder solamente:

```text
configuración inválida
```

cuando pueda indicar qué regla falló.

Aunque el UML muestre:

```text
esCoherenteCon(...) : Boolean
```

la implementación puede utilizar:

```text
errores específicos
violaciones de dominio
resultado de validación
excepciones de dominio
```

según la arquitectura elegida.

No cambiar el dominio únicamente para obtener mejores mensajes.

---

# 69. Dinero y Cantidades

El UML no cierra tipos técnicos.

Pero una futura implementación debe respetar:

```text
dinero
→ representación decimal exacta

cantidades
→ admitir fracciones
```

Evitar para dinero:

```text
Float binario
```

Evitar asumir:

```text
cantidad siempre entera
```

La precisión exacta se decidirá en Diseño Técnico.

---

# 70. Problemas de Diseño que Este Modelo Busca Evitar

## 70.1. Jerarquías Rígidas

Evitar:

```text
Producto
MateriaPrima
ProductoTerminado
Servicio
```

cuando Tipo + Capacidades ya expresan el comportamiento.

## 70.2. Setteritis

Evitar:

```text
setStock()
setVendible()
setDescuento()
```

como única forma de cambiar configuraciones interdependientes.

## 70.3. Pérdida de Historia

Evitar:

```text
desactivar
→ borrar
```

## 70.4. SKU como Identidad

Evitar:

```text
primary key = SKU
```

conceptualmente.

## 70.5. Reserva Eterna de SKU

Evitar conservar códigos históricos ocupados sin una regla explícita de historial.

## 70.6. Categorías Duplicadas

Evitar equivalentes funcionales por diferencias de formato.

## 70.7. Cambio de Unidad Destructivo

Evitar reinterpretar cantidades históricas.

## 70.8. Historia = Bloqueo Permanente

Evitar congelar toda capacidad estructural solamente porque alguna vez hubo una operación.

## 70.9. Acoplar M02 a Inventario

Evitar agregar stock, lotes o movimientos dentro del catálogo.

## 70.10. Acoplar M02 a Producción

Evitar agregar recetas o producciones dentro de ArticuloCatalogo.

## 70.11. Autorización Dentro de Entidades

Evitar pasar Rol/Usuario a cada método de dominio.

## 70.12. Check-Then-Save Inseguro

Evitar usar una preconsulta como única garantía de unicidad o eliminación.

## 70.13. Reconstruir Historia desde Estado Actual

Evitar usar el precio/nombre/SKU actuales para reinterpretar una operación pasada.

---

# 71. Qué Debe Hacer una IA al Utilizar Este Diagrama

Una IA debe:

1. leer `M02-Catalogo.md`;
2. leer `01-modelo-dominio-bloque-1.md`;
3. leer esta guía;
4. leer el `.puml`;
5. usar el `.png` solo como apoyo visual;
6. respetar identidad estable de las entidades;
7. no utilizar SKU como identidad;
8. mantener Categoria opcional;
9. mantener TipoArticulo inmutable;
10. mantener CapacidadesArticulo como Value Object conceptual;
11. diferenciar capacidades de hechos operativos;
12. diferenciar capacidades comerciales de estructurales;
13. validar el estado completo resultante de una edición;
14. no bloquear cambios comerciales solo porque exista historia;
15. validar dependencias antes de cambios estructurales;
16. no modificar stock desde M02;
17. no crear recetas desde M02;
18. no reescribir historia al editar catálogo;
19. no asignar Categoria INACTIVA en nuevas asociaciones;
20. conservar asociaciones históricas con Categoria INACTIVA;
21. revalidar al reactivar;
22. no exigir Categoria ACTIVA para una asociación histórica ya existente;
23. habilitar venta solamente con precio válido;
24. deshabilitar descuento al deshabilitar venta;
25. aplicar la política final de SKU actual;
26. proteger UnidadMedida frente a historia cuantitativa;
27. no inventar `tieneHistoriaOperativa`;
28. tratar `puedeEliminarseFisicamente()` como consulta, no autorización;
29. aplicar autorización contextual antes de mutaciones;
30. revalidar guardias contextuales al confirmar;
31. mantener abiertas las decisiones arquitectónicas.

---

# 72. Qué NO Debe Inferir una IA

El Diagrama 3 NO implica que:

```text
ArticuloCatalogo sea Aggregate Root
Categoria sea Aggregate Root
CapacidadesArticulo tenga tabla propia
cada enum sea tabla SQL
cada método sea endpoint
cada asociación sea FK directa idéntica
exista Repository por entidad
exista UnitOfWork
se utilicen Domain Events
se utilice Event Sourcing
se utilice CQRS
se utilicen microservicios
```

Tampoco implica:

```text
controlaStock
→ M02 administra stock

controlaVencimiento
→ ArticuloCatalogo tiene fechaVencimiento

puedeUsarseEnProduccion
→ ArticuloCatalogo contiene Receta
```

---

# 73. Qué NO Debe Agregar una IA

No crear por iniciativa propia:

```text
Producto
MateriaPrima
ProductoTerminado
Servicio como subclase

StockActual
StockUbicacion
Lote
MovimientoInventario

Compra
Venta
Receta
Produccion

SkuHistorico
AliasSku
HistorialArticulo universal

Permiso
RBAC dinámico

tieneHistoriaOperativa
```

sin una decisión funcional/arquitectónica previa que lo justifique.

---

# 74. Tests Derivables — Tipo y Capacidades

Como mínimo:

1. crear BIEN válido;
2. crear SERVICIO válido;
3. impedir SERVICIO con stock;
4. impedir SERVICIO con vencimiento;
5. impedir SERVICIO en producción;
6. impedir vencimiento sin stock;
7. impedir producción sin stock;
8. impedir descuento sin venta;
9. aceptar configuración comercial válida;
10. rechazar configuración estructural inválida.

---

# 75. Tests Derivables — Estado y Venta

11. crear ACTIVO con uso operativo;
12. impedir ACTIVO sin uso operativo;
13. permitir INACTIVO sin uso operativo;
14. habilitar venta con precio válido;
15. impedir habilitar venta sin precio;
16. permitir precio = 0;
17. deshabilitar venta y descuento atómicamente;
18. conservar precio al deshabilitar venta;
19. reactivar configuración válida;
20. rechazar reactivación inválida;
21. no reescribir historia al reactivar.

---

# 76. Tests Derivables — Categoria

22. crear Categoria ACTIVA válida;
23. impedir nombre equivalente ACTIVO;
24. impedir nombre equivalente INACTIVO y orientar a reactivar;
25. asignar Categoria ACTIVA del mismo Negocio;
26. impedir Categoria de otro Negocio;
27. impedir nueva asociación con Categoria INACTIVA;
28. conservar asociación existente al desactivar Categoria;
29. reactivar Categoria conservando relaciones;
30. impedir eliminar Categoria con artículo ACTIVO;
31. impedir eliminar Categoria con artículo INACTIVO;
32. permitir eliminar Categoria sin dependencias.

---

# 77. Tests Derivables — SKU

33. permitir artículo sin SKU;
34. asignar SKU disponible;
35. impedir SKU duplicado con artículo ACTIVO;
36. impedir SKU duplicado con artículo INACTIVO;
37. `A → B` valida B y libera A al confirmar;
38. `A → null` libera A;
39. `null → B` valida B;
40. `A → A` no-op;
41. desactivar artículo NO libera su SKU actual;
42. eliminar físicamente libera SKU actual;
43. modificar SKU no modifica identidad del artículo;
44. operaciones históricas no deben depender del SKU actual si necesitan el histórico.

---

# 78. Tests Derivables — Unidad e Historia

45. BIEN exige UnidadMedida;
46. SERVICIO inicia con UNIDAD;
47. SERVICIO puede usar HORA;
48. cambiar unidad sin historia incompatible;
49. bloquear cambio que altera significado histórico;
50. no depender de un flag persistente obligatorio `tieneHistoriaOperativa`.

---

# 79. Tests Derivables — Desactivación y Eliminación

51. desactivar conserva identidad;
52. desactivar conserva SKU actual;
53. desactivar conserva referencias;
54. desactivar no altera stock de M04;
55. impedir eliminación de artículo utilizado;
56. permitir eliminación física cuando no hay historia ni referencias;
57. revalidar condiciones al confirmar eliminación;
58. impedir que una preconsulta antigua autorice una eliminación ya inválida.

---

# 80. Tests Derivables — Autorización y Aislamiento

59. Propietario puede editar artículo;
60. Encargado puede activar/desactivar/reactivar;
61. Encargado no puede editar configuración;
62. Encargado no administra Categoria;
63. Trabajador solo consulta;
64. membresía INACTIVA no autoriza mutación;
65. recursos de otro Negocio no pueden modificarse;
66. Categoria y ArticuloCatalogo deben pertenecer al mismo Negocio.

---

# 81. Tests Derivables — Concurrencia Conceptual

La implementación técnica futura deberá incluir pruebas apropiadas para garantizar:

67. dos operaciones concurrentes no confirman el mismo SKU;
68. dos operaciones concurrentes no crean nombres de Categoria equivalentes;
69. una dependencia creada entre preconsulta y eliminación impide la eliminación;
70. una modificación contextual vuelve a validar antes de confirmar.

La forma exacta de estas pruebas dependerá de la arquitectura y persistencia elegidas.

---

# 82. Implicancias para Diagramas Posteriores

Este Diagrama 3 describe:

```text
estructura
responsabilidades
invariantes estáticas principales
```

No sustituye:

```text
06-m02-estados-articulo.puml
```

ni:

```text
secuencias/02-editar-articulo.puml
```

Separación:

```text
Diagrama 3
→ estructura

Diagrama 6
→ ciclo de vida

Secuencia 02
→ coordinación dinámica de edición
```

---

# 83. Criterios de Aceptación del Diagrama 3

El Diagrama 3 se considera correctamente interpretado cuando:

1. Negocio se reconoce como contexto externo M01.
2. Categoria pertenece a un Negocio.
3. ArticuloCatalogo pertenece a un Negocio.
4. Categoria es opcional para el artículo.
5. Categoria posee estado ACTIVA/INACTIVA.
6. Categoria INACTIVA conserva asociaciones existentes.
7. Categoria INACTIVA no admite nuevas asociaciones.
8. Categoria equivalente INACTIVA se reactiva en vez de duplicarse.
9. ArticuloCatalogo representa BIEN y SERVICIO.
10. TipoArticulo es inmutable.
11. EstadoArticulo es ACTIVO/INACTIVO.
12. ACTIVO exige uso operativo mínimo.
13. INACTIVO puede quedar sin uso operativo.
14. CapacidadesArticulo es Value Object conceptual.
15. CapacidadesArticulo se reemplaza como configuración completa.
16. SERVICIO no controla stock.
17. SERVICIO no controla vencimiento.
18. SERVICIO no participa en producción.
19. Vencimiento implica BIEN + stock.
20. Producción implica BIEN + stock.
21. Descuento implica vendible.
22. Habilitar venta exige precio válido.
23. Deshabilitar venta deshabilita descuento.
24. Deshabilitar venta conserva precio.
25. Capacidades comerciales pueden cambiar con historia.
26. Capacidades estructurales requieren validar dependencias.
27. Historia por sí sola no implica bloqueo permanente.
28. UnidadMedida está protegida por historia cuantitativa.
29. SKU es opcional.
30. SKU actual es único por Negocio.
31. SKU no es identidad.
32. SKU puede modificarse y quitarse.
33. SKU anterior se libera al confirmar una modificación válida.
34. No existe historial obligatorio de SKU en MVP.
35. Desactivar conserva historia.
36. Desactivar no altera stock de M04.
37. Eliminar físicamente es excepcional.
38. `puedeEliminarseFisicamente()` no constituye autorización definitiva.
39. Las guardias contextuales se revalidan al confirmar.
40. Autorización pertenece al Caso de Uso.
41. M02 representa estado actual.
42. Módulos consumidores preservan sus datos históricos.
43. El diagrama no introduce infraestructura prematura.
44. Las decisiones arquitectónicas siguen abiertas.

---

# 84. Decisiones Técnicas que Permanecen Abiertas

No decidir desde este documento:

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
estrategia de concurrencia
locking
optimistic concurrency

normalización técnica de Categoria
normalización técnica de SKU

precisión monetaria exacta
precisión exacta de cantidades

almacenamiento de imágenes

tablas
foreign keys
índices
constraints SQL
ORM
```

Estas decisiones deberán satisfacer el dominio existente.

---

# 85. Criterio Rector para IA

Una IA debe interpretar el Diagrama 3 mediante el principio:

> **M02 define la identidad y configuración actual de los artículos, sus usos permitidos y las invariantes estructurales del catálogo; no administra los hechos operativos ni sustituye la historia propia de los módulos consumidores.**

Resumen:

```text
ArticuloCatalogo
→ identidad estable + configuración actual

TipoArticulo
→ naturaleza general

CapacidadesArticulo
→ elegibilidad / usos permitidos

Categoria
→ organización del catálogo

UnidadMedida
→ significado de cantidades

M03/M04/M05/M07
→ hechos operativos y datos históricos

Caso de Uso
→ autorización + coordinación contextual

Arquitectura
→ mecanismo técnico
```

---

# 86. Flujo Recomendado para una IA que Implemente M02

Antes de escribir código:

```text
1. identificar el Caso de Uso

2. localizar RF/RN correspondientes en M02-Catalogo.md

3. localizar invariantes en
   01-modelo-dominio-bloque-1.md

4. consultar esta guía

5. consultar el UML

6. separar:
   - autorización
   - validaciones locales
   - validaciones contextuales
   - persistencia

7. identificar dependencias con otros módulos

8. revisar ADRs vigentes

9. diseñar la operación

10. diseñar tests antes de considerar finalizada
    la implementación
```

Una IA no debe comenzar por:

```text
crear tablas desde el UML
```

ni por:

```text
crear endpoints CRUD para cada método
```

---

# 87. Checklist para Revisión de Implementación

Antes de aprobar código M02, verificar:

```text
[ ] Respeta Negocio autorizado
[ ] Verifica membresía y permiso M02
[ ] No utiliza SKU como identidad
[ ] No mezcla Categoria entre Negocios
[ ] No permite Categoria INACTIVA en nuevas asociaciones
[ ] Mantiene TipoArticulo inmutable
[ ] Valida configuración completa de capacidades
[ ] Mantiene capacidades fuera de hechos operativos
[ ] No mete stock/lotes dentro de ArticuloCatalogo
[ ] No mete recetas dentro de ArticuloCatalogo
[ ] Valida precio al habilitar venta
[ ] Conserva precio al deshabilitar venta
[ ] Deshabilita descuento junto con venta
[ ] Aplica política final de SKU
[ ] Protege UnidadMedida
[ ] No reescribe historia
[ ] No usa preconsultas como única garantía
[ ] Revalida guardias contextuales al confirmar
[ ] Desactivar no elimina
[ ] Eliminar físicamente verifica dependencias
[ ] Dinero no usa float binario
[ ] Cantidades admiten fracciones
[ ] No agrega infraestructura no aprobada
```

---

# 88. Estado del Artefacto

Con la sincronización de:

```text
M02-Catalogo.md
01-modelo-dominio-bloque-1.md
03-m02-catalogo-clases.md
03-m02-catalogo-clases.puml
```

el modelo estático detallado de M02 se considera:

```text
CONGELADO
```

Estado del Bloque 1:

```text
01 — Mapa General                       ✅ CONGELADO
02 — M01 Organización — Clases         ✅ CONGELADO
03 — M02 Catálogo — Clases             ✅ CONGELADO

04 — M01 Invitacion — Estados          ⏳ PENDIENTE
05 — M01 Membresia — Estados           ⏳ PENDIENTE
06 — M02 Articulo — Estados            ⏳ PENDIENTE

Secuencia aceptar invitación            ⏳ PENDIENTE
Secuencia editar artículo               ⏳ PENDIENTE
```

Todavía no corresponde considerar finalizada toda la suite de dominio del Bloque 1.

---

# 89. Regla Final

El UML debe utilizarse como:

```text
representación visual del dominio
```

No como:

```text
especificación automática de ORM
especificación automática de tablas
especificación automática de endpoints
```

Una IA puede utilizarlo para:

- comprender relaciones;
- identificar responsabilidades;
- derivar invariantes;
- diseñar casos de uso;
- diseñar tests;
- apoyar decisiones arquitectónicas;
- generar código posteriormente.

Pero toda implementación debe respetar:

```text
Especificación funcional
+
Modelo de dominio
+
Guía semántica
+
ADRs vigentes
```

antes de convertir el diagrama en software.
