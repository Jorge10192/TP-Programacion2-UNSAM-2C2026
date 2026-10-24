# 04 — Mapa de Módulos y Trazabilidad

## 1. Propósito del Documento

Este documento define la división funcional de la plataforma en módulos, sus responsabilidades principales, dependencias, prioridades dentro del MVP y mecanismos de trazabilidad documental.

Funciona como puente entre:

- la definición y visión del producto;
- los stakeholders y actores;
- las reglas generales del negocio;
- los requisitos no funcionales;
- la especificación detallada de cada módulo;
- el modelo de dominio;
- el modelo relacional;
- la arquitectura;
- la API;
- la experiencia de usuario;
- las pruebas.

Este documento **no reemplaza la especificación funcional detallada de cada módulo**.

Su función es establecer el mapa general del sistema antes de avanzar hacia decisiones técnicas de menor nivel.

La documentación específica se desarrollará posteriormente dentro de:

```text
docs/modulos/
```

---

## 2. Principios de Modularización

### 2.1. Modularización Funcional

El sistema se divide según responsabilidades de negocio claramente diferenciadas.

Cada módulo deberá buscar:

- alta cohesión interna;
- bajo acoplamiento;
- límites funcionales claros;
- dependencias explícitas;
- reglas comprensibles;
- posibilidad de evolución independiente.

La modularización es principalmente:

- funcional;
- documental;
- lógica.

No implica que cada módulo deba convertirse en un microservicio independiente.

Para el MVP se priorizará una **aplicación modular única**, evitando complejidad de infraestructura innecesaria.

---

### 2.2. Simplicidad Externa y Robustez Interna

La existencia de módulos, transacciones, movimientos, lotes y reglas de consistencia no debe aumentar la complejidad percibida por el comerciante.

El usuario deberá seguir interactuando mediante acciones naturales:

```text
Comprar
Vender
Mover stock
Producir
Abrir caja
Registrar gasto
Cerrar caja
Consultar resultados
```

La complejidad necesaria para mantener consistencia y trazabilidad deberá resolverse internamente.

---

### 2.3. Integridad Histórica

Las operaciones confirmadas representan hechos ocurridos dentro del negocio.

Como principio general:

```text
Confirmado ≠ eliminar físicamente
```

Las correcciones deberán realizarse mediante mecanismos explícitos como:

- anulación;
- devolución;
- ajuste;
- conciliación;
- movimiento compensatorio.

El historial original deberá conservarse cuando corresponda.

---

### 2.4. Continuidad Operativa ante Inconsistencias

Una inconsistencia administrativa entre el stock registrado y la existencia física real no deberá necesariamente impedir una venta presencial.

Ejemplo:

```text
Stock registrado: 0
Stock físico observado: 1
Cliente desea comprar: 1
```

El sistema podrá permitir continuar la operación mediante:

```text
Advertencia
→ confirmación del usuario
→ venta
→ registro de inconsistencia
→ conciliación posterior
```

Esto no implica ignorar el problema.

La anomalía deberá quedar:

- registrada;
- trazada;
- visible;
- pendiente de revisión.

---

### 2.5. Inconsistencia Operativa ≠ Funcionamiento Offline

Se consideran problemas diferentes.

#### Inconsistencia con conexión

```text
Sistema online
+
stock incorrecto
```

Puede resolverse mediante:

- advertencias;
- movimientos;
- conciliación;
- auditoría.

Forma parte del MVP.

#### Ausencia de conexión

```text
Sin Internet
→ persistencia local
→ cola de operaciones
→ sincronización
→ resolución de conflictos
```

Requiere una arquitectura adicional.

El funcionamiento offline completo queda fuera del MVP inicial.

---

### 2.6. Corregir el Saldo ≠ Reescribir la Historia

Si una venta se realizó durante una inconsistencia de inventario, una operación posterior puede corregir el saldo actual.

Sin embargo:

> una corrección posterior no debe inventar retroactivamente el origen histórico de la mercadería vendida.

Ejemplo:

```text
10/10
Stock registrado: 0
Venta física: 1

Resultado:
StockUbicacion = -1
Venta = confirmada
Inconsistencia = pendiente
Lote = no asignado
```

Posteriormente:

```text
12/10
Recuento / ajuste:
+1

StockUbicacion:
-1 → 0
```

La corrección del saldo no significa que el sistema pueda asumir que la unidad vendida el 10/10 pertenecía a un lote registrado posteriormente.

La historia deberá conservar lo que realmente se conocía en el momento de la operación.

---

### 2.7. Servicios Fuera del Circuito de Inventario

Un artículo con:

```text
controla_stock = False
```

no participa del inventario físico.

Por lo tanto, no deberá generar:

```text
StockUbicacion
Lote
MovimientoInventario
```

Esto permite representar correctamente servicios dentro del mismo catálogo utilizado por productos físicos.

---

## 3. Mapa General de Módulos

Los módulos principales son:

```text
M01 — Organización del Negocio
M02 — Catálogo
M03 — Compras y Proveedores
M04 — Inventario y Ubicaciones
M05 — Ventas y Pagos
M06 — Caja y Gastos
M07 — Producción
M08 — Analítica
```

Representación conceptual:

```text
                      ┌──────────────────────────┐
                      │ M01 — ORGANIZACIÓN      │
                      │ Negocio / Usuarios      │
                      │ Roles / Configuración   │
                      └────────────┬─────────────┘
                                   │
                                   ▼
                      ┌──────────────────────────┐
                      │ M02 — CATÁLOGO          │
                      │ Artículos / Categorías  │
                      │ Capacidades / Precios   │
                      └────────────┬─────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
          ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
          │ M03 — COMPRAS │ │ M05 — VENTAS│ │ M07 — PRODUCCIÓN│
          │ PROVEEDORES    │ │ Y PAGOS      │ │ Con/Sin Receta │
          └───────┬────────┘ └──────┬───────┘ └───────┬────────┘
                  │                 │                 │
                  └──────────┐      │      ┌──────────┘
                             ▼      ▼      ▼
                      ┌──────────────────────────┐
                      │ M04 — INVENTARIO        │
                      │ Y UBICACIONES           │
                      │ Stock / Lotes / FEFO    │
                      └────────────┬─────────────┘
                                   │
                         ┌─────────┴──────────┐
                         │                    │
                         ▼                    ▼
                ┌────────────────┐   ┌────────────────┐
                │ M06 — CAJA    │   │ M08 — ANALÍTICA│
                │ Y GASTOS      │   │ Operativa /    │
                │ Jornada       │   │ Financiera     │
                └────────────────┘   └────────────────┘
```

La relación real entre módulos no es estrictamente jerárquica.

Distintos módulos colaboran durante una misma operación de negocio.

---

## 4. M01 — Organización del Negocio

### 4.1. Propósito

Administrar la identidad básica del negocio y de las personas autorizadas a operar dentro de él.

---

### 4.2. Responsabilidades

Incluye:

- registro de usuarios;
- autenticación;
- creación de negocios;
- asociación Usuario–Negocio;
- roles;
- permisos generales;
- activación y desactivación;
- configuración inicial mínima.

---

### 4.3. Conceptos Principales

```text
Usuario
Negocio
UsuarioNegocio
Rol
```

Roles iniciales:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

---

### 4.4. Configuración Inicial

La creación inicial del negocio deberá ser breve.

Datos principales:

```text
Nombre *          obligatorio
Rubro             opcional
Moneda            ARS automática
```

Para el MVP:

```text
Moneda = ARS
```

El usuario no necesita seleccionar moneda durante el onboarding.

El modelo deberá conservar conceptualmente la moneda del negocio para permitir futuras extensiones.

La configuración adicional se realizará progresivamente en los módulos correspondientes.

Ejemplos:

```text
Medios de pago → M05
Ubicaciones    → M04
Catálogo       → M02
Proveedores    → M03
```

---

### 4.5. Dependencia

M01 constituye la base de todos los demás módulos.

---

### 4.6. Prioridad

**MUST HAVE**

---

### 4.7. Documento Asociado

```text
docs/modulos/01-organizacion-negocio.md
```

---

## 5. M02 — Catálogo

### 5.1. Propósito

Representar de forma unificada los elementos que el negocio puede:

- comprar;
- vender;
- almacenar;
- utilizar en producción.

---

### 5.2. Concepto Principal

```text
ArticuloCatalogo
```

El artículo contará con un tipo descriptivo general:

```text
BIEN
SERVICIO
```

El comportamiento real se definirá mediante capacidades.

Ejemplos:

```text
es_comprable
es_vendible
controla_stock
puede_usarse_en_produccion
controla_vencimiento
permite_descuento
```

---

### 5.3. Ejemplos

#### Producto de reventa

```text
Collar

Tipo: BIEN
Comprable: Sí
Vendible: Sí
Controla stock: Sí
Producción: No
```

#### Material productivo

```text
Tela

Tipo: BIEN
Comprable: Sí
Vendible: Sí
Controla stock: Sí
Producción: Sí
```

#### Servicio

```text
Personalización

Tipo: SERVICIO
Comprable: No
Vendible: Sí
Controla stock: No
Producción: No
```

---

### 5.4. Regla Fundamental

Si:

```text
controla_stock = False
```

el artículo queda completamente fuera del circuito de inventario físico.

---

### 5.5. Prioridad

**MUST HAVE**

---

### 5.6. Documento Asociado

```text
docs/modulos/02-catalogo.md
```

---

## 6. M03 — Compras y Proveedores

### 6.1. Propósito

Registrar el abastecimiento del negocio y conservar información histórica sobre:

- artículos adquiridos;
- cantidades;
- costos;
- proveedores;
- comprobantes;
- ubicación de ingreso cuando corresponda.

---

### 6.2. Conceptos Principales

```text
Proveedor
Compra
ItemCompra
```

---

### 6.3. Ubicación de Ingreso

Para todo artículo con:

```text
controla_stock = True
```

antes de confirmar su ingreso deberá existir una ubicación de destino.

Ejemplo:

```text
Compra:
10 Collares

Destino:
Depósito
```

Para artículos o servicios que no controlan stock:

```text
controla_stock = False
```

no se requiere ubicación física.

---

### 6.4. Impacto

Una compra confirmada puede producir efectos en:

```text
M03 Compra
    ↓
M04 Inventario
    ↓
Analítica / Auditoría
```

---

### 6.5. Prioridad

**MUST HAVE**

---

### 6.6. Documento Asociado

```text
docs/modulos/03-compras-y-proveedores.md
```

---

## 7. M04 — Inventario y Ubicaciones

### 7.1. Propósito

Administrar las existencias físicas del negocio y conocer:

- cuánto existe;
- dónde se encuentra;
- por qué cambió;
- quién realizó cada movimiento;
- qué mercadería necesita revisión o conciliación.

---

### 7.2. Conceptos Principales

```text
Ubicacion
StockUbicacion
MovimientoInventario
Lote
```

---

### 7.3. Ubicación

`Ubicacion` representa un espacio físico u operativo persistente.

Ejemplos:

```text
Casa
Depósito
Local
Feria San Martín
Puesto A
Stand Evento
```

Una feria no requiere una entidad especial dentro del núcleo.

Se representa como una ubicación.

---

### 7.4. Apertura y Cierre de una Feria

La ubicación no necesita abrirse o cerrarse.

Por ejemplo:

```text
Ubicacion:
Feria San Martín
```

existe permanentemente.

Lo que se abre antes de comenzar la jornada y se cierra al finalizar es su sesión operativa de caja:

```text
Feria San Martín
      ↓
Abrir SesionCaja
      ↓
Trabajar
      ↓
Cerrar SesionCaja
```

---

### 7.5. Stock Actual

`StockUbicacion` representa el saldo operativo actual de un artículo dentro de una ubicación.

Ejemplo:

```text
Producto A

Depósito: 30
Feria A: 15
Feria B: 10

Total: 55
```

---

### 7.6. Movimientos de Inventario

Toda modificación relevante debe conservar una causa.

Ejemplos conceptuales:

```text
COMPRA
VENTA
TRANSFERENCIA
AJUSTE
PRODUCCION
ANULACION
DEVOLUCION
```

---

### 7.7. Ajustes Manuales

Todo ajuste manual deberá registrar como mínimo:

- motivo;
- usuario responsable;
- fecha/hora.

Cuando corresponda podrá incluir además una observación.

Ejemplos de motivos:

```text
RECUENTO_FISICO
ROTURA
MERMA
PERDIDA
ERROR_PREVIO
CORRECCION
OTRO
```

La lista definitiva se especificará dentro del módulo M04.

---

### 7.8. Lotes y Vencimientos

Cuando un artículo controle vencimiento, podrán utilizarse lotes internos.

Durante una operación normal:

```text
Stock suficiente
↓
Venta
↓
FEFO
↓
Lote con vencimiento más próximo
↓
Descuento
```

La selección del lote deberá ser transparente para el operador durante una Venta Rápida.

---

### 7.9. Inconsistencia de Inventario

El saldo de `StockUbicacion` podrá representar temporalmente un valor negativo cuando una venta física deba continuar a pesar de una inconsistencia registrada.

Ejemplo:

```text
Stock sistema antes: 0
Venta física: 1
Stock sistema después: -1
```

La operación deberá quedar marcada como inconsistente y pendiente de conciliación.

---

### 7.10. Lotes durante una Inconsistencia

Los lotes **no deberán volverse negativos**.

Si no existe cantidad suficiente dentro de los lotes conocidos:

```text
StockUbicacion = -1

Lotes conocidos:
Lote A = 0
Lote B = 0
```

el sistema no deberá:

- inventar un lote;
- volver negativo un lote;
- asignar retroactivamente un lote inexistente.

La diferencia quedará representada mediante la anomalía de inventario.

---

### 7.11. Conciliación

La conciliación deberá ser una operación explícita.

Ejemplo:

```text
Movimiento inconsistente
        ↓
Recuento / ajuste / revisión
        ↓
Conciliación
```

Una compra posterior puede modificar matemáticamente el saldo:

```text
Saldo previo: -3
Compra: +10
Saldo actual: 7
```

pero esto **no significa automáticamente que la inconsistencia histórica haya sido explicada**.

La anomalía solamente deberá considerarse conciliada mediante una acción explícita.

---

### 7.12. Principio Histórico

```text
Corregir saldo actual
≠
reescribir procedencia histórica
```

Un lote registrado posteriormente no podrá asignarse automáticamente a una venta anterior simplemente para completar su trazabilidad.

---

### 7.13. Prioridad

**MUST HAVE**

---

### 7.14. Documento Asociado

```text
docs/modulos/04-inventario-y-ubicaciones.md
```

---

## 8. M05 — Ventas y Pagos

### 8.1. Propósito

Permitir realizar rápidamente las operaciones comerciales cotidianas del negocio.

La Venta Rápida constituye uno de los flujos centrales del MVP.

---

### 8.2. Conceptos Principales

```text
Venta
ItemVenta
Pago
MedioPago
Cliente [opcional]
```

---

### 8.3. Venta Mixta

Una misma venta podrá contener:

- bienes físicos;
- servicios.

Ejemplo:

```text
Venta #100

1 Collar                    $10.000
1 Servicio personalización   $3.000
-----------------------------------
Total                       $13.000
```

Solamente los artículos que controlan stock participarán del inventario.

---

### 8.4. Precio Aplicado

La venta deberá conservar el precio realmente utilizado durante la operación.

Esto permite que modificaciones futuras al precio base del catálogo no alteren el historial.

---

### 8.5. Descuentos

La Venta Rápida podrá aplicar descuentos autorizados.

El detalle completo será especificado dentro de M05.

---

### 8.6. Inconsistencia durante Venta

Si el stock registrado resulta insuficiente:

```text
Stock registrado: 0
Cantidad solicitada: 1
```

el sistema podrá advertir:

```text
⚠ El inventario registrado presenta una inconsistencia.

Stock registrado: 0
Cantidad solicitada: 1

Puede continuar la venta,
pero será necesario revisar posteriormente el inventario.
```

Si el usuario confirma:

- la venta continúa;
- `StockUbicacion` puede quedar negativo;
- los lotes no se fuerzan;
- se registra la inconsistencia;
- queda pendiente de conciliación.

---

### 8.7. Medios de Pago

Como mínimo:

```text
Efectivo
Mercado Pago
Cuenta DNI
Transferencia
```

Los medios concretos podrán configurarse.

---

### 8.8. Mercado Pago

#### Registro manual

```text
MUST HAVE
```

El usuario selecciona Mercado Pago como medio de cobro.

No requiere integración externa.

#### Integración QR / API

```text
SHOULD HAVE
```

Podrá incorporarse si el alcance y tiempos del MVP lo permiten.

---

### 8.9. Prioridad

**MUST HAVE**

---

### 8.10. Documento Asociado

```text
docs/modulos/05-ventas-y-pagos.md
```

---

## 9. M06 — Caja y Gastos

### 9.1. Propósito

Representar la jornada financiera operativa asociada a una ubicación.

---

### 9.2. Conceptos Principales

```text
SesionCaja
MovimientoCaja
```

---

### 9.3. Una Caja por Zona Operativa

Para el MVP:

> una ubicación podrá tener una única `SesionCaja` abierta simultáneamente.

Ejemplo:

```text
Feria San Martín
      ↓
SesionCaja #23
```

---

### 9.4. Caja Compartida

Una misma sesión podrá ser utilizada por múltiples operadores.

```text
                  SesionCaja #23
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
            Juan       María     Lucía
              │         │         │
            Venta     Venta     Venta
```

Todos impactan sobre la misma caja física de la ubicación.

---

### 9.5. Trazabilidad Individual

Aunque la caja sea compartida, cada operación deberá conservar al usuario responsable.

Esto incluye conceptualmente:

```text
Pago
└── usuario responsable

MovimientoCaja
└── usuario responsable
```

La sesión también deberá identificar:

```text
usuario de apertura
usuario de cierre
```

Ejemplo:

```text
Abrió: Juan

Operaron:
- Juan
- María
- Lucía

Cerró: María
```

---

### 9.6. Arqueo

El cierre comparará:

```text
Monto esperado
vs.
Monto real contado
```

Resultado:

```text
Diferencia = Real - Esperado
```

---

### 9.7. Responsabilidad de la Diferencia

La diferencia pertenece a:

```text
SesionCaja / Ubicacion
```

y no deberá imputarse automáticamente a un trabajador específico.

Ejemplo:

```text
Caja esperada: $95.000
Caja real:      $90.000

Diferencia:     -$5.000
```

La trazabilidad por usuario ayuda a revisar qué operaciones se realizaron, pero:

> trazabilidad individual ≠ atribución automática del faltante.

---

### 9.8. Tolerancia

La plataforma podrá admitir una tolerancia configurable o predefinida.

Si una diferencia supera dicha tolerancia, podrá exigirse una explicación antes del cierre.

La diferencia registrada nunca deberá desaparecer mediante un ajuste automático destinado únicamente a equilibrar la caja.

---

### 9.9. Prioridad

**MUST HAVE**

---

### 9.10. Documento Asociado

```text
docs/modulos/06-caja-y-gastos.md
```

---

## 10. M07 — Producción

### 10.1. Propósito

Representar la transformación de artículos utilizados como insumos en otros artículos resultantes.

---

### 10.2. Conceptos Principales

```text
Produccion
Receta
ItemReceta
```

---

### 10.3. Producción con Receta

La receta puede utilizarse como guía.

Ejemplo:

```text
1 Producto A
=
2 kg Insumo X
+
1 unidad Insumo Y
```

Para producir 10 unidades:

```text
20 kg Insumo X
10 unidades Insumo Y
```

---

### 10.4. Producción sin Receta

La receta no constituye una precondición.

También deberá poder registrarse:

```text
Producción
→ indicar producto obtenido
→ registrar cantidad
→ registrar consumos reales
→ confirmar
```

Esto permite representar trabajos:

- artesanales;
- variables;
- personalizados;
- no estandarizados.

---

### 10.5. Consumo Real

Cuando exista receta, las cantidades reales consumidas podrán diferir de las cantidades sugeridas.

La diferencia no deberá modificar automáticamente la receta base.

---

### 10.6. Principio

```text
Receta = ayuda
Receta ≠ requisito para producir
```

---

### 10.7. Prioridad

**SHOULD HAVE**

---

### 10.8. Documento Asociado

```text
docs/modulos/07-produccion.md
```

---

## 11. M08 — Analítica

### 11.1. Propósito

Transformar las operaciones registradas en información sencilla y útil para la gestión cotidiana.

No se busca construir un sistema avanzado de Business Intelligence ni contabilidad financiera completa.

---

### 11.2. Analítica Operativa

Orientada al funcionamiento diario.

Ejemplos:

- ventas de la jornada;
- stock disponible;
- stock bajo;
- vencimientos;
- actividad por ubicación;
- productos más vendidos.

Disponible para:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

según el alcance operativo definido para cada vista.

---

### 11.3. Analítica Financiera / Gerencial

Incluye información más sensible o global.

Ejemplos:

- compras globales;
- gastos globales;
- costos;
- margen estimado;
- resultado estimado;
- comparaciones generales entre ubicaciones.

Disponible en el MVP para:

```text
PROPIETARIO
ENCARGADO
```

---

### 11.4. Permisos Personalizados

Configurar individualmente qué indicadores puede consultar cada usuario queda fuera del MVP.

Podrá incorporarse en una evolución futura.

---

### 11.5. Terminología

Dado que el sistema no representa contabilidad completa, deberá utilizar expresiones como:

```text
Resultado estimado
Margen estimado
Resultado operativo aproximado
```

y evitar presentar estos indicadores como utilidad contable definitiva.

---

### 11.6. Prioridad

**MUST HAVE — nivel básico**

---

### 11.7. Documento Asociado

```text
docs/modulos/08-analitica.md
```

---

## 12. Matriz de Priorización MoSCoW

| Dominio / Funcionalidad | Módulo | Prioridad |
| :--- | :---: | :---: |
| Organización, usuarios y roles | M01 | **MUST HAVE** |
| Catálogo configurable | M02 | **MUST HAVE** |
| Compras y proveedores | M03 | **MUST HAVE** |
| Inventario y ubicaciones | M04 | **MUST HAVE** |
| Lotes y vencimientos básicos | M04 | **MUST HAVE** |
| Tolerancia a inconsistencias de stock | M04 / M05 | **MUST HAVE** |
| Venta Rápida mixta | M05 | **MUST HAVE** |
| Descuentos y precios aplicados | M05 | **MUST HAVE** |
| Mercado Pago como medio manual | M05 | **MUST HAVE** |
| Caja, gastos y arqueo | M06 | **MUST HAVE** |
| Caja compartida por ubicación | M06 | **MUST HAVE** |
| Analítica básica | M08 | **MUST HAVE** |
| Producción | M07 | **SHOULD HAVE** |
| Recetas | M07 | **SHOULD HAVE** |
| Integración Mercado Pago QR / API | M05 | **SHOULD HAVE** |
| Funcionamiento offline completo | — | **WON'T HAVE NOW** |
| Sincronización offline | — | **WON'T HAVE NOW** |
| Permisos personalizados de analítica | M08 | **WON'T HAVE NOW** |
| Ecommerce | — | **WON'T HAVE NOW** |
| Reservas online completas | — | **WON'T HAVE NOW** |
| Integraciones adicionales | — | **WON'T HAVE NOW** |

---

## 13. Matriz de Dependencias entre Módulos

| Módulo | Depende principalmente de | Impacta principalmente en |
| :--- | :--- | :--- |
| **M01 — Organización** | — | Todos los módulos |
| **M02 — Catálogo** | M01 | M03, M04, M05, M07 |
| **M03 — Compras** | M01, M02 | M04, M08 |
| **M04 — Inventario** | M01, M02 | M05, M07, M08 |
| **M05 — Ventas / Pagos** | M01, M02, M04 | M04, M06, M08 |
| **M06 — Caja / Gastos** | M01, M04, M05 | M08 |
| **M07 — Producción** | M01, M02, M04 | M04, M08 |
| **M08 — Analítica** | M03, M04, M05, M06, M07 | — |

---

## 14. Reglas Transversales Consolidadas

Estas reglas se incluyen en este documento porque afectan las relaciones entre módulos.

Posteriormente deberán formalizarse dentro de la especificación del módulo correspondiente.

---

### `RN-ORG-001` — Moneda Inicial

Todo negocio deberá poseer una moneda definida.

Para el MVP se asignará automáticamente:

```text
ARS
```

sin exigir selección durante el onboarding.

---

### `RN-CAT-001` — Bypass de Inventario

Todo artículo con:

```text
controla_stock = False
```

queda completamente excluido del circuito de inventario.

No genera:

```text
StockUbicacion
Lote
MovimientoInventario
```

---

### `RN-INV-001` — Conservación de Historia

Una inconsistencia de inventario no deberá borrar ni modificar retrospectivamente operaciones históricas confirmadas.

---

### `RN-INV-002` — Lotes no Negativos

Un lote no deberá convertirse en negativo para representar mercadería cuya procedencia no se encuentra registrada.

---

### `RN-INV-003` — No Reasignación Retroactiva

Un lote registrado posteriormente no deberá asignarse automáticamente a una venta histórica anterior para completar artificialmente su trazabilidad.

---

### `RN-INV-004` — Conciliación Explícita

Una inconsistencia solamente se considera conciliada mediante una acción explícita de:

- recuento;
- ajuste;
- conciliación;
- corrección equivalente.

Un ingreso normal posterior puede modificar el saldo, pero no cierra automáticamente la anomalía histórica.

---

### `RN-INV-005` — Motivo de Ajuste

Todo ajuste manual de inventario requiere:

- motivo;
- usuario responsable;
- fecha/hora.

---

### `RN-VEN-001` — Continuidad Operativa

Una inconsistencia recuperable de stock no deberá bloquear automáticamente una Venta Rápida si el operador confirma que dispone físicamente de la mercadería.

La operación deberá quedar marcada para revisión.

---

### `RN-CAJ-001` — Caja Compartida

Para el MVP podrá existir una única `SesionCaja` abierta simultáneamente por `Ubicacion`.

Múltiples usuarios podrán operar sobre ella.

---

### `RN-CAJ-002` — Trazabilidad del Operador

Cada pago y movimiento de caja deberá conservar al usuario responsable de la operación.

---

### `RN-CAJ-003` — Responsabilidad del Arqueo

La diferencia de arqueo pertenece a la sesión de caja y no se imputa automáticamente a un operador particular.

---

### `RN-PRO-001` — Receta Opcional

Una receta puede asistir y calcular una producción, pero no constituye una precondición para registrar producción.

---

## 15. Operaciones Transversales Críticas

Las siguientes operaciones afectan simultáneamente a varios módulos.

Durante el diseño técnico deberán ejecutarse preservando consistencia transaccional.

---

### 15.1. Confirmar Compra

```text
M03 — Compras
       ↓
M04 — Inventario
       ↓
Trazabilidad
```

Flujo conceptual:

1. El usuario completa la compra.
2. El sistema valida los artículos.
3. Todo artículo que controla stock debe tener una ubicación de ingreso resuelta.
4. La compra se confirma.
5. Se actualizan costos cuando corresponda.
6. Se incrementa `StockUbicacion`.
7. Se crean lotes cuando corresponda.
8. Se genera `MovimientoInventario`.
9. Se conserva el usuario responsable.

Si un artículo no controla stock:

```text
Compra
→ registro comercial
→ NO inventario
```

---

### 15.2. Transferir Stock

```text
M04 — Inventario
```

Flujo conceptual:

1. Seleccionar origen.
2. Seleccionar destino.
3. Seleccionar artículo.
4. Indicar cantidad.
5. Validar la operación.
6. Reducir stock en origen.
7. Incrementar stock en destino.
8. Transferir o dividir lotes cuando corresponda.
9. Registrar movimientos vinculados.
10. Conservar usuario responsable.

La transferencia representa un único hecho de negocio aunque internamente pueda requerir más de un movimiento.

---

### 15.3. Confirmar Venta Normal

```text
M05 — Venta
       ↓
M04 — Inventario
       ↓
M05 — Pago
       ↓
M06 — Caja
       ↓
Trazabilidad
```

Para cada artículo físico con stock suficiente:

```text
Venta
→ descontar StockUbicacion
→ aplicar FEFO
→ descontar Lote
→ MovimientoInventario
```

Para un servicio:

```text
Venta
→ ItemVenta
→ Pago

NO StockUbicacion
NO Lote
NO MovimientoInventario
```

---

### 15.4. Confirmar Venta con Inconsistencia

Ejemplo:

```text
Stock registrado: 0
Venta física: 1
```

Flujo:

1. El sistema detecta insuficiencia.
2. Informa claramente la anomalía.
3. El usuario decide continuar.
4. Se confirma la venta.
5. `StockUbicacion` puede quedar negativo.
6. No se fuerza ningún lote.
7. Se genera movimiento de venta marcado como inconsistente.
8. La inconsistencia queda pendiente de conciliación.
9. El pago y la caja continúan normalmente.
10. La operación conserva el usuario responsable.

Resultado conceptual:

```text
Venta válida
+
Inventario inconsistente
+
Conciliación pendiente
```

---

### 15.5. Conciliar Inventario

```text
M04 — Inventario
```

Flujo:

1. El usuario detecta o consulta una inconsistencia pendiente.
2. Realiza un recuento o investigación.
3. Informa el estado físico real.
4. Registra el motivo de la corrección.
5. El sistema genera el ajuste correspondiente.
6. Se actualiza `StockUbicacion`.
7. Se vincula la conciliación con la anomalía original cuando sea posible.
8. La inconsistencia pasa a conciliada.
9. La venta histórica no se modifica.
10. No se reasignan lotes automáticamente.

---

### 15.6. Confirmar Producción

```text
M07 — Producción
       ↓
M04 — Inventario
       ↓
Trazabilidad
```

Con receta:

```text
Cantidad deseada
→ necesidades calculadas
→ consumos reales
→ confirmación
```

Sin receta:

```text
Producto obtenido
→ consumos manuales
→ confirmación
```

Resultado:

```text
- insumos consumidos
+ producto obtenido
```

acompañado por los movimientos correspondientes.

---

### 15.7. Cerrar Caja Compartida

```text
M06 — Caja
       ↓
M05 — Ventas / Pagos
       ↓
M08 — Analítica
       ↓
Trazabilidad
```

Flujo:

1. Se solicita el cierre.
2. El sistema calcula el efectivo esperado.
3. El usuario cuenta el efectivo real.
4. Registra el monto contado.
5. Se calcula:

```text
Diferencia = Real - Esperado
```

6. Se registra quién realizó el cierre.
7. Si la diferencia supera la tolerancia, se solicita explicación.
8. La caja pasa a estado cerrado.
9. La diferencia queda conservada.
10. No se imputa automáticamente a ningún operador.

---

## 16. Cadena de Trazabilidad Documental

La documentación utilizará identificadores consistentes.

### 16.1. Prefijos de Módulo

```text
ORG — Organización
CAT — Catálogo
COM — Compras
INV — Inventario
VEN — Ventas
CAJ — Caja
PRO — Producción
ANA — Analítica
```

---

### 16.2. Requisitos Funcionales

Formato:

```text
RF-[MODULO]-NNN
```

Ejemplos:

```text
RF-ORG-001
RF-CAT-001
RF-COM-001
RF-INV-001
RF-VEN-001
RF-CAJ-001
RF-PRO-001
RF-ANA-001
```

---

### 16.3. Reglas de Negocio

Formato:

```text
RN-[MODULO]-NNN
```

Ejemplos:

```text
RN-INV-003
RN-VEN-002
RN-CAJ-001
```

---

### 16.4. Historias de Usuario

Formato:

```text
HU-[MODULO]-NNN
```

Ejemplo:

```text
HU-VEN-001
```

---

### 16.5. Casos de Uso

Formato:

```text
CU-[MODULO]-NN
```

Ejemplo:

```text
CU-VEN-01
```

---

### 16.6. Casos de Prueba

Formato:

```text
CP-[MODULO]-NNN
```

Ejemplo:

```text
CP-VEN-001
```

---

## 17. Cadena Completa de Trazabilidad

Cada comportamiento importante deberá poder seguirse conceptualmente mediante:

```text
Visión
   ↓
Módulo
   ↓
Requisito Funcional
   ↓
Regla de Negocio
   ↓
Historia de Usuario
   ↓
Caso de Uso
   ↓
Modelo de Dominio
   ↓
API
   ↓
Caso de Prueba
```

Ejemplo conceptual:

```text
Visión del Producto
        ↓
M05 — Ventas
        ↓
RF-VEN-XXX
Registrar Venta Rápida
        ↓
RN-VEN-001
La inconsistencia recuperable no bloquea automáticamente
        ↓
HU-VEN-XXX
Como trabajador quiero continuar una venta física...
        ↓
CU-VEN-XX
Confirmar Venta Rápida
        ↓
Servicio de Venta
        ↓
Endpoint correspondiente
        ↓
CP-VEN-XXX
Venta con stock registrado insuficiente
```

Los identificadores concretos se asignarán al redactar cada módulo.

---

## 18. Matriz de Trazabilidad

La matriz se completará progresivamente durante la especificación.

Estructura oficial:

| Requisito | Módulo | Regla Asociada | Historia | Caso de Uso | API / Endpoint | Caso de Prueba | Estado |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| RF-ORG-XXX | M01 | RN-ORG-XXX | HU-ORG-XXX | CU-ORG-XX | Por definir | CP-ORG-XXX | Pendiente |
| RF-CAT-XXX | M02 | RN-CAT-XXX | HU-CAT-XXX | CU-CAT-XX | Por definir | CP-CAT-XXX | Pendiente |
| RF-COM-XXX | M03 | RN-COM-XXX | HU-COM-XXX | CU-COM-XX | Por definir | CP-COM-XXX | Pendiente |
| RF-INV-XXX | M04 | RN-INV-XXX | HU-INV-XXX | CU-INV-XX | Por definir | CP-INV-XXX | Pendiente |
| RF-VEN-XXX | M05 | RN-VEN-XXX | HU-VEN-XXX | CU-VEN-XX | Por definir | CP-VEN-XXX | Pendiente |
| RF-CAJ-XXX | M06 | RN-CAJ-XXX | HU-CAJ-XXX | CU-CAJ-XX | Por definir | CP-CAJ-XXX | Pendiente |
| RF-PRO-XXX | M07 | RN-PRO-XXX | HU-PRO-XXX | CU-PRO-XX | Por definir | CP-PRO-XXX | Pendiente |
| RF-ANA-XXX | M08 | RN-ANA-XXX | HU-ANA-XXX | CU-ANA-XX | Por definir | CP-ANA-XXX | Pendiente |

No se definirán anticipadamente endpoints concretos en este documento.

El contrato REST se establecerá posteriormente dentro de:

```text
docs/api/
```

Esto evita acoplar prematuramente la especificación funcional al diseño de la API.

---

## 19. Escenario End-to-End Principal del MVP

El conjunto de módulos deberá permitir ejecutar:

```text
M01 — Organización
        ↓
Crear Negocio

M02 — Catálogo
        ↓
Crear Artículos

M03 — Compras
        ↓
Registrar Compra

M04 — Inventario
        ↓
Ingresar Stock
        ↓
Mover Stock a Feria

M06 — Caja
        ↓
Abrir Jornada

M05 — Ventas
        ↓
Realizar Venta
        ↓
Registrar Pago

M06 — Caja
        ↓
Registrar Gastos
        ↓
Cerrar Jornada
        ↓
Arqueo

M08 — Analítica
        ↓
Consultar Resultado
```

Este recorrido constituye el escenario principal de aceptación del MVP.

---

## 20. Funcionalidades Diferidas

Las siguientes capacidades forman parte de la visión futura, pero no deberán bloquear el MVP.

### 20.1. Pedidos y Reservas

Futuro:

```text
Cliente
→ Pedido / Reserva
→ Preparación
→ Entrega
```

Podrá incluir:

- señas;
- fechas de entrega;
- estados;
- datos de cliente;
- enlaces públicos.

---

### 20.2. Ecommerce

Futuro:

```text
Catálogo público
→ carrito
→ pedido
→ pago
```

---

### 20.3. Redes Sociales y Marketing

Futuro:

- enlaces desde Instagram;
- enlaces desde WhatsApp;
- promociones;
- publicaciones;
- acciones comerciales.

---

### 20.4. Offline y Sincronización

Futuro:

```text
Operación sin Internet
→ almacenamiento local
→ cola pendiente
→ recuperación de conexión
→ sincronización
→ resolución de conflictos
```

No debe confundirse con la tolerancia a inconsistencias de inventario implementada durante el MVP.

---

### 20.5. Integraciones Adicionales

Futuro:

- otros proveedores de pagos;
- Cuenta DNI integrada;
- bancos;
- herramientas fiscales;
- plataformas externas.

---

## 21. Criterio Rector

La separación en módulos existe para mejorar:

- comprensión;
- mantenibilidad;
- trazabilidad;
- pruebas;
- evolución;
- consistencia.

No debe hacer que la aplicación resulte más compleja para el comerciante.

Desde la perspectiva del usuario, la solución debe sentirse como una única herramienta sencilla.

La prioridad será:

> permitir que un feriante o pequeño comerciante realice correctamente sus operaciones cotidianas con la menor fricción posible, mientras el sistema conserva internamente información consistente, trazable y recuperable.

---

## 22. Próximos Pasos

Con este mapa congelado, la documentación funcional deberá avanzar módulo por módulo.

Orden recomendado:

```text
1. docs/modulos/01-organizacion-negocio.md
2. docs/modulos/02-catalogo.md
3. docs/modulos/03-compras-y-proveedores.md
4. docs/modulos/04-inventario-y-ubicaciones.md
5. docs/modulos/05-ventas-y-pagos.md
6. docs/modulos/06-caja-y-gastos.md
7. docs/modulos/07-produccion.md
8. docs/modulos/08-analitica.md
```

Cada documento deberá desarrollar, según corresponda:

```text
Propósito y alcance
Actores
Conceptos del dominio
Requisitos funcionales
Reglas de negocio
Historias de usuario
Casos de uso
Estados y transiciones
Errores y excepciones
Criterios de aceptación
Dependencias
Prioridad dentro del MVP
```

Después de especificar los módulos podrá congelarse con mayor seguridad:

```text
Modelo de Dominio
        ↓
Diagramas UML
        ↓
Modelo Relacional
        ↓
Arquitectura
        ↓
API
        ↓
UX
        ↓
Pruebas
        ↓
Plan de Implementación
```

La principal diferencia respecto de la versión externa es que esta evita dos decisiones prematuras: **no fija tipos SQL exactos todavía y tampoco inventa endpoints REST antes de diseñar el contrato API**. Además, la conciliación queda explícitamente separada de un ingreso normal de mercadería, preservando el principio de que corregir el saldo no implica reescribir la historia. Texto pegado
