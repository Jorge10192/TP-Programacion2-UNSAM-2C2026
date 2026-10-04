# Diseño técnico — Recomendador de Compras

## Estado

Módulo futuro.

No forma parte de la primera implementación del módulo de Compras.

## Objetivo

El Recomendador de Compras tendrá como objetivo asistir al negocio en la
planificación de futuras compras de materias primas.

A diferencia del módulo de Compras, que registra operaciones que ya fueron
realizadas, este módulo analizará información disponible para proponer cómo
conviene distribuir una compra entre distintos proveedores.

El módulo funcionará como una herramienta de soporte a la decisión.

## Responsabilidad principal

Dada una lista de materias primas y cantidades requeridas, el sistema deberá
poder analizar los proveedores disponibles y generar una propuesta de compra.

Ejemplo:

Necesidad:

- 10 kg de harina;
- 5 kg de avena;
- 3 kg de pollo.

Resultado posible:

- comprar harina en Proveedor A;
- comprar avena en Proveedor B;
- comprar pollo en Proveedor C.

La recomendación deberá incluir el costo estimado de la operación y la
información utilizada para realizar el cálculo.

## Relación con el módulo de Compras

El módulo de Compras registra hechos históricos.

Por cada operación deberá conservar información como:

- proveedor;
- materia prima;
- cantidad comprada;
- unidad de medida;
- precio pagado;
- fecha de compra.

Esta información constituirá una de las fuentes de datos utilizadas por el
Recomendador de Compras.

El Recomendador no deberá modificar ni corregir compras históricas.

## Relación con proveedores

El recomendador utilizará el catálogo de proveedores registrado en el sistema.

Una misma materia prima podrá haber sido adquirida históricamente a distintos
proveedores.

Esto permitirá comparar, por ejemplo, el precio pagado por kilogramo de una
misma materia prima en diferentes comercios.

## Precios históricos

Las compras registradas permitirán conocer:

- último precio pagado por proveedor;
- precio unitario normalizado;
- evolución histórica del precio;
- precio promedio;
- diferencias entre proveedores;
- fecha de la última compra.

No será necesario mantener inicialmente una tabla separada de historial de
precios, ya que las compras y sus ítems constituirán el historial de precios
efectivamente pagados.

## Precios actuales

El último precio pagado no necesariamente representa el precio actual de un
proveedor.

En una versión posterior podrá incorporarse un registro de precios consultados
o cotizados.

Ejemplo:

- proveedor;
- materia prima;
- precio informado;
- unidad;
- fecha de consulta;
- fecha de vigencia, cuando corresponda.

De esta forma deberá distinguirse entre:

- precio histórico efectivamente pagado;
- precio actual conocido o cotizado.

## Optimización

En una primera versión, el recomendador podrá seleccionar para cada materia
prima el proveedor con menor precio unitario conocido.

En versiones posteriores, el algoritmo podrá considerar otras restricciones,
por ejemplo:

- costo de envío;
- monto mínimo de compra;
- cantidades mínimas;
- presentaciones disponibles;
- disponibilidad del proveedor;
- distancia;
- vigencia del precio;
- necesidad total de materias primas.

El objetivo futuro será minimizar el costo global de la compra y no solamente
seleccionar el menor precio individual para cada producto.

## Entradas futuras

El módulo podrá recibir:

- lista de materias primas necesarias;
- cantidades requeridas;
- proveedores disponibles;
- precios conocidos;
- historial de compras;
- restricciones de compra.

Más adelante también podrá recibir información proveniente de:

- Inventario;
- Producción;
- Recetas.

Esto permitirá calcular automáticamente qué materias primas deben comprarse.

## Salida esperada

El resultado deberá ser una recomendación y no una compra automática.

Ejemplo:

### Compra recomendada

Proveedor A:

- Harina: 10 kg.
- Pollo: 3 kg.

Proveedor B:

- Avena: 5 kg.

Costo estimado total: $XX.XXX.

El trabajador deberá poder revisar la recomendación antes de realizar cualquier
compra.

## Independencia respecto de Compras

El módulo Recomendador de Compras y el módulo Compras poseen responsabilidades
diferentes.

### Compras

Registra operaciones reales ya realizadas.

### Recomendador de Compras

Analiza información disponible y propone operaciones futuras.

El algoritmo del recomendador podrá modificarse o evolucionar sin modificar la
forma en que se registran las compras.

## Fuera de alcance inicial

No se implementará inicialmente:

- compra automática a proveedores;
- comunicación automática con proveedores;
- actualización automática de precios;
- optimización avanzada;
- predicción de inflación;
- predicción de precios futuros;
- generación automática de pedidos.

Estas funcionalidades podrán evaluarse en versiones posteriores.
