# Diseño técnico — Módulo de Compras

## Objetivo

El módulo de Compras tiene como responsabilidad registrar y administrar las
compras de materias primas realizadas por WALOS.

La compra se realiza físicamente fuera del sistema.

El trabajador adquiere la mercadería en un comercio o proveedor y posteriormente
registra en WALOS la información relevante para el negocio.

El módulo permite conservar:

- proveedor o comercio donde se realizó la compra;
- materias primas adquiridas;
- cantidades;
- precios pagados;
- fecha de la operación;
- usuario que realizó el registro;
- comprobante de compra, cuando se encuentre disponible;
- historial de compras necesario para futuros análisis.

Una vez confirmada correctamente la compra, las materias primas adquiridas son
informadas al módulo de Inventario para que puedan quedar disponibles para
Producción.

---

## Alcance del módulo

El módulo de Compras administra exclusivamente operaciones relacionadas con la
adquisición y registro de materias primas.

El módulo comienza cuando el trabajador desea registrar una compra ya realizada
y finaliza cuando:

1. la compra queda registrada;
2. sus ítems quedan almacenados;
3. el comprobante queda asociado, cuando corresponda;
4. la información histórica de precios queda disponible;
5. las materias primas adquiridas son informadas al módulo de Inventario.

El módulo de Compras no administra el consumo posterior de esas materias primas.

---

## Responsabilidades

El módulo deberá permitir:

- gestionar proveedores o comercios;
- gestionar el catálogo de materias primas;
- registrar compras;
- registrar uno o más ítems dentro de una misma compra;
- asociar cada ítem a una materia prima registrada;
- registrar cantidades y precios;
- registrar la fecha de la operación;
- identificar automáticamente al usuario que registra la compra;
- adjuntar opcionalmente un comprobante;
- conservar el historial de compras;
- conservar los precios pagados históricamente;
- permitir anulaciones y correcciones conservando trazabilidad;
- informar al módulo de Inventario las materias primas incorporadas por una
  compra confirmada.

---

## Flujo principal

1. El trabajador realiza físicamente una compra en un comercio o proveedor.
2. El trabajador recibe la mercadería y, cuando exista, el correspondiente
   comprobante.
3. El trabajador accede a la opción **Registrar compra**.
4. Selecciona el proveedor o comercio desde el catálogo de proveedores.
5. Si el proveedor no existe, puede registrarlo y continuar posteriormente con
   la compra.
6. Agrega las materias primas correspondientes a la operación.
7. Cada materia prima debe seleccionarse desde el catálogo de materias primas
   habilitadas.
8. Si una materia prima no existe, el trabajador puede registrarla, habilitarla
   y continuar con la compra.
9. Para cada materia prima registra:
   - cantidad adquirida;
   - unidad de medida;
   - precio pagado.
10. Puede adjuntar opcionalmente una imagen o archivo PDF del comprobante.
11. Puede agregar observaciones sobre la operación.
12. El sistema muestra un resumen de la compra.
13. El trabajador revisa la información.
14. El trabajador confirma la operación.
15. El sistema registra la compra y sus ítems.
16. El sistema identifica al usuario responsable de la carga.
17. La información queda disponible como historial de precios y compras.
18. El módulo de Compras informa al módulo de Inventario las materias primas
    incorporadas.
19. Inventario registra las correspondientes entradas.
20. Las materias primas quedan disponibles para su utilización en Producción.

---

## Catálogo de materias primas

Una compra solamente podrá contener materias primas previamente registradas y
habilitadas en el catálogo del negocio.

El trabajador no podrá ingresar libremente el nombre de una materia prima dentro
de un ítem de compra.

Esta restricción busca evitar registros inconsistentes como:

- `Avena`;
- `avena`;
- `AVENA`;
- `Avena fina`;

cuando todos ellos representan conceptualmente la misma materia prima.

Si una materia prima necesaria todavía no existe, el trabajador podrá crearla
durante el flujo de compra.

Una vez registrada y habilitada, podrá seleccionarla como parte de la operación.

La creación de una nueva materia prima no deberá obligar al trabajador a
abandonar la compra que se encuentra registrando.

---

## Catálogo de proveedores

Toda compra deberá quedar asociada a un proveedor o comercio registrado.

El trabajador seleccionará el proveedor desde un catálogo existente.

Si el proveedor no se encuentra registrado, podrá crear uno nuevo y continuar
posteriormente con la operación.

Un mismo proveedor podrá estar relacionado históricamente con múltiples compras
y diferentes materias primas.

Una misma materia prima podrá ser adquirida a diferentes proveedores.

Esta relación permitirá realizar posteriormente análisis y comparaciones entre
proveedores.

---

## Compra e ítems de compra

Una compra podrá contener múltiples materias primas.

Ejemplo:

**Compra C-001 — Distribuidora Norte**

- Harina: 5 kg;
- Avena: 3 kg;
- Huevos: 24 unidades.

Cada materia prima será representada mediante un ítem de compra independiente.

Conceptualmente:

Compra
 ├── Ítem de compra → Harina
 ├── Ítem de compra → Avena
 └── Ítem de compra → Huevos

## Extension a futuro

- Cargar todo el proceso de compra directamente con el comprobante de forma automatica
- Identificar si un comprobante ya fue cargado para no duplicarse una misma compra.

