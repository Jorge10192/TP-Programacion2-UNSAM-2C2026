# Documentación y Estrategia de Desarrollo

> Guía maestra para desarrollo humano y asistido por IA.

---

# 1. Propósito de este README

Este archivo explica **cómo debe evolucionar el proyecto** y cómo deben utilizarse los documentos contenidos en `docs/`.

Su objetivo principal es que cualquier desarrollador o agente de IA pueda incorporarse al proyecto y comprender rápidamente:

- qué producto se está construyendo;
- qué decisiones ya están congeladas;
- qué documentos constituyen fuentes de verdad;
- qué fase se encuentra activa;
- qué puede modificarse;
- qué no debe rediseñarse sin justificación;
- cómo especificar nuevos módulos;
- cuándo realizar diseño técnico;
- cuándo comenzar a programar;
- cómo evolucionar backend, frontend y base de datos;
- cuándo un bloque puede considerarse terminado.

Este documento **no reemplaza las especificaciones funcionales ni técnicas**.

Actúa como:

```text
Índice
+
Protocolo de trabajo
+
Roadmap técnico
+
Guía para agentes de IA
```

---

# 2. Visión resumida del producto

El proyecto desarrolla una plataforma web configurable orientada principalmente a:

- feriantes;
- emprendimientos;
- pequeños comercios;
- productores artesanales;
- revendedores;
- pequeños prestadores de servicios.

Debe permitir administrar progresivamente:

```text
Organización
Catálogo
Compras
Inventario
Ventas
Pagos
Caja
Gastos
Producción
Analítica
```

La plataforma debe servir tanto para negocios que:

```text
solo revenden
```

como para negocios que:

```text
producen
```

o:

```text
prestan servicios
```

y también combinaciones de estas modalidades.

WALOS constituye el primer caso real de validación del producto, pero **el dominio no debe contener lógica específica de WALOS**.

---

# 3. Principios generales

El proyecto debe priorizar:

```text
simplicidad para el usuario
+
consistencia interna
+
trazabilidad
+
mantenibilidad
+
alcance académico razonable
```

Se aplican especialmente los siguientes principios:

- Mobile-first.
- Configuración progresiva.
- KISS.
- YAGNI.
- SOLID pragmático.
- Modularidad funcional.
- Trazabilidad de operaciones.
- Conservación histórica.
- Aislamiento entre negocios.
- Transacciones atómicas cuando una operación modifica varios estados.
- Evitar sobreingeniería.
- Evitar arquitectura específica de un cliente.

No se debe transformar el TP en:

- microservicios;
- infraestructura distribuida;
- arquitectura empresarial innecesaria;
- ERP completo;
- sistema contable;
- plataforma fiscal.

---

# 4. Stack tecnológico objetivo

## Backend

```text
Python
FastAPI
SQLAlchemy 2.x
Pydantic v2
Alembic
PostgreSQL
pytest
```

## Frontend

Recomendación actual:

```text
React
TypeScript
Vite
```

El sistema debe diseñarse con enfoque:

```text
Mobile-First
```

La librería de estilos podrá decidirse durante la implementación.

Tailwind u otra alternativa pueden utilizarse si simplifican el desarrollo, pero no constituyen una decisión arquitectónica obligatoria.

## Infraestructura

```text
Docker
Docker Compose
```

El objetivo final debe permitir levantar el entorno mediante una operación sencilla equivalente a:

```text
docker compose up
```

---

# 5. Estado global de documentación

La estructura objetivo es:

```text
docs/
│
├── README.md
│
├── 00-definicion-y-vision.md
├── 01-stakeholders-y-actores.md
├── 02-requerimientos-no-funcionales.md
├── 03-reglas-generales-negocio.md
├── 04-mapa-modulos-y-trazabilidad.md
│
├── modulos/
│   ├── 01-organizacion-negocio.md
│   ├── 02-catalogo.md
│   ├── 03-compras-y-proveedores.md
│   ├── 04-inventario-y-ubicaciones.md
│   ├── 05-ventas-y-pagos.md
│   ├── 06-caja-y-gastos.md
│   ├── 07-produccion.md
│   └── 08-analitica.md
│
├── modelo-dominio/
│   ├── modelo-general.md
│   ├── diagrama-clases.puml
│   ├── estados.puml
│   └── secuencias/
│
├── arquitectura/
│   ├── arquitectura-general.md
│   ├── estructura-backend.md
│   ├── patrones-de-diseno.md
│   ├── multitenant-y-seguridad.md
│   ├── docker.md
│   └── adrs/
│
├── base-de-datos/
│   ├── modelo-relacional.md
│   └── erd.puml
│
├── api/
│   ├── contrato-api.md
│   ├── endpoints.md
│   └── schemas-dto.md
│
├── ux/
│   ├── principios-diseno.md
│   ├── navegacion.md
│   ├── pantallas-mvp.md
│   └── flujos-mobile-first.md
│
├── datos-demo/
│   ├── configuracion-walos.md
│   ├── walos-seed.json
│   └── negocio-demo.md
│
├── pruebas/
│   ├── estrategia-pruebas.md
│   ├── criterios-aceptacion-mvp.md
│   └── escenarios-end-to-end.md
│
├── planificacion/
│   ├── plan-implementacion.md
│   ├── riesgos.md
│   └── backlog-futuro.md
│
└── prompts/
    ├── prompt-revision-documentacion.md
    └── prompt-maestro-implementacion.md
```

---

# 6. Estado actual del proyecto

Actualizar esta sección al cerrar cada etapa importante.

Estado actual:

```text
BASE GLOBAL

00 — Definición y Visión                  ✅ CONGELADO
01 — Stakeholders y Actores               ✅ CONGELADO
04 — Mapa de Módulos y Trazabilidad       ✅ CONGELADO


BLOQUE 1 — FUNDACIÓN

M01 — Organización del Negocio            ✅ CONGELADO
M02 — Catálogo                            ⏳ SIGUIENTE
```

Por lo tanto:

> El próximo trabajo funcional es `docs/modulos/02-catalogo.md`.

Después de cerrar M02 **no se debe continuar automáticamente con M03**.

Debe comenzar el diseño técnico e implementación del Bloque 1.

---

# 7. Jerarquía de fuentes de verdad

Cuando una IA o desarrollador necesita tomar una decisión, debe consultar las fuentes en este orden conceptual.

## Nivel 1 — Visión y alcance

```text
docs/00-definicion-y-vision.md
```

Define:

- qué producto se construye;
- para quién;
- objetivos;
- alcance del MVP;
- límites del producto.

Ningún módulo puede contradecir este documento sin una decisión explícita de revisión.

---

## Nivel 2 — Actores y permisos

```text
docs/01-stakeholders-y-actores.md
```

Define:

- actores;
- roles;
- responsabilidades;
- participación de clientes/proveedores;
- reglas generales de acceso.

---

## Nivel 3 — Mapa funcional

```text
docs/04-mapa-modulos-y-trazabilidad.md
```

Define:

- módulos;
- responsabilidades generales;
- dependencias;
- prioridades;
- fronteras funcionales.

---

## Nivel 4 — Especificación funcional de cada módulo

```text
docs/modulos/
```

Estos documentos constituyen la fuente principal para:

- requisitos funcionales;
- reglas de negocio específicas;
- historias de usuario;
- casos de uso;
- estados funcionales;
- excepciones;
- criterios de aceptación.

---

## Nivel 5 — ADR y arquitectura

```text
docs/arquitectura/
```

Explican **cómo** se implementarán determinadas decisiones.

Un ADR no debe cambiar una regla funcional silenciosamente.

---

## Nivel 6 — Modelo técnico

```text
docs/modelo-dominio/
docs/base-de-datos/
docs/api/
docs/ux/
docs/pruebas/
```

Traducen los requisitos funcionales a soluciones técnicas.

---

## Nivel 7 — Código

El código representa la implementación actual.

Sin embargo:

> código heredado ≠ fuente automática de verdad funcional.

El proyecto contiene un prototipo anterior orientado a WALOS.

Si el código existente contradice documentación funcional congelada:

```text
NO modificar la documentación para justificar el código viejo.
```

Se debe:

```text
detectar
→ evaluar
→ refactorizar cuando corresponda
```

---

# 8. Protocolo ante contradicciones

Si una IA detecta contradicciones entre documentos:

```text
1. No inventar una solución silenciosamente.

2. Identificar exactamente los documentos en conflicto.

3. Determinar si uno es más reciente o más específico.

4. Priorizar:
   regla específica de módulo
   sobre descripción general,
   siempre que no contradiga visión/alcance.

5. Si el conflicto modifica una decisión importante:
   detener esa decisión puntual y señalarla.

6. No rediseñar módulos no relacionados.
```

Los documentos congelados deben mantenerse estables salvo que exista una razón explícita para revisarlos.

---

# 9. Separación entre dominio e implementación

Esta separación es obligatoria.

## Documentación funcional

Ejemplo:

```text
Toda operación debe realizarse dentro de un
Negocio donde el Usuario posea una membresía activa.
```

Correcto.

No corresponde escribir:

```text
Enviar X-Negocio-ID en todos los headers.
```

Eso pertenece a API/arquitectura.

---

Otro ejemplo funcional:

```text
Una invitación posee un identificador seguro.
```

No corresponde decidir todavía:

```text
UUID v4 almacenado como CHAR(36).
```

Eso pertenece al diseño técnico.

---

La regla general es:

```text
docs/modulos/
        ↓
QUÉ debe ocurrir

docs/arquitectura/
docs/base-de-datos/
docs/api/
        ↓
CÓMO se implementa
```

---

# 10. Identificadores documentales

Cada módulo posee un prefijo.

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

Convenciones:

```text
RF-[MOD]-NNN   Requisito Funcional
RN-[MOD]-NNN   Regla de Negocio
HU-[MOD]-NNN   Historia de Usuario
CU-[MOD]-NN    Caso de Uso
CP-[MOD]-NNN   Caso de Prueba
```

Ejemplos:

```text
RF-CAT-001
RN-INV-004
HU-VEN-003
CU-CAJ-02
CP-COM-005
```

---

# 11. Desarrollo por rebanadas verticales

El proyecto se implementará mediante cuatro bloques.

```text
BLOQUE 1 — FUNDACIÓN
M01 Organización
M02 Catálogo

BLOQUE 2 — ABASTECIMIENTO E INVENTARIO
M03 Compras
M04 Inventario

BLOQUE 3 — OPERACIÓN COMERCIAL
M05 Ventas
M06 Caja

BLOQUE 4 — EXTENSIONES
M07 Producción
M08 Analítica
```

Cada bloque atraviesa todas las capas:

```text
REQUISITOS
    ↓
DOMINIO
    ↓
ARQUITECTURA
    ↓
BASE DE DATOS
    ↓
API
    ↓
UX
    ↓
BACKEND
    ↓
FRONTEND
    ↓
TESTS
    ↓
VALIDACIÓN
```

---

# 12. Ciclo obligatorio de cada bloque

Cada bloque sigue este orden:

```text
1. Especificación funcional
        ↓
2. Modelo de dominio
        ↓
3. Decisiones arquitectónicas necesarias
        ↓
4. Modelo relacional
        ↓
5. Contrato API
        ↓
6. Diseño UX / Wireframes
        ↓
7. Implementación backend
        ↓
8. Implementación frontend
        ↓
9. Integración
        ↓
10. Tests
        ↓
11. Validación E2E
        ↓
12. Actualización documental
        ↓
13. Checkpoint Git
```

---

# 13. Regla de no anticipación

Una IA no debe diseñar técnicamente módulos futuros sin necesidad.

Ejemplo:

Durante Bloque 1 se puede diseñar:

```text
Usuario
Negocio
UsuarioNegocio
InvitacionNegocio

Categoria
UnidadMedida
ArticuloCatalogo
```

No corresponde definir todavía tablas finales para:

```text
Venta
SesionCaja
Lote
Produccion
```

aunque sepamos que existirán posteriormente.

---

# 14. BLOQUE 1 — Fundación

## Funcionalidad

```text
M01 — Organización
M02 — Catálogo
```

M01 está funcionalmente congelado.

M02 debe definirse antes de comenzar implementación.

---

## Resultado funcional esperado

Al cerrar Bloque 1 debe ser posible:

```text
Registrar Usuario
        ↓
Crear Negocio
        ↓
Seleccionar modalidades
        ↓
Entrar al Negocio
        ↓
Invitar colaborador
        ↓
Compartir invitación
        ↓
Aceptar invitación
        ↓
Gestionar roles
        ↓
Crear categorías
        ↓
Crear unidades
        ↓
Crear artículos / servicios
        ↓
Consultar catálogo
```

No debe ser posible todavía afirmar que existe un sistema completo de ventas.

---

# 15. Diseño técnico Bloque 1

Una vez congelado M02 deben definirse:

## Dominio

```text
Usuario
Negocio
UsuarioNegocio
InvitacionNegocio
Rol

Categoria
UnidadMedida
ArticuloCatalogo
```

## Arquitectura necesaria

Como mínimo:

```text
Autenticación
Autorización
RBAC
Contexto de negocio
Aislamiento entre negocios
Catálogo por capacidades
```

## ADR esperables

Probablemente:

```text
ADR-001-catalogo-por-capacidades.md
ADR-005-multitenancy-pragmatico.md
```

No crear ADR únicamente para aumentar cantidad de documentación.

Un ADR debe existir cuando hay:

```text
decisión relevante
+
alternativas razonables
+
trade-off real
```

---

# 16. Contract-First

Frontend y backend deben coordinarse mediante un contrato estable por checkpoint.

Antes de integrar ambos se definen:

```text
endpoint
request
response
errores
estados relevantes
```

FastAPI + Pydantic v2 deberán producir posteriormente el contrato OpenAPI real.

El contrato se considera:

```text
ESTABLE PARA EL CHECKPOINT
```

pero no:

```text
INMUTABLE PARA SIEMPRE
```

Si un bloque posterior requiere una modificación:

```text
documentar
→ modificar contrato
→ actualizar backend
→ actualizar frontend
→ actualizar tests
```

---

# 17. Desarrollo paralelo backend/frontend

Después de estabilizar el contrato:

```text
                   CONTRATO
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼

         BACKEND            FRONTEND

       FastAPI             React
       Pydantic            TypeScript
       SQLAlchemy          mocks
       PostgreSQL          componentes
       pytest              UX
```

El frontend puede utilizar temporalmente datos simulados compatibles con el contrato.

Cuando el endpoint real existe:

```text
mock
 ↓
API real
```

sin rediseñar la pantalla.

---

# 18. Estrategia UX

La experiencia de usuario evoluciona junto con el sistema.

No se diseñarán todas las pantallas antes de programar.

Proceso:

```text
flujo
 ↓
wireframe
 ↓
implementación
 ↓
prueba
 ↓
corrección
```

---

# 19. App Shell

Bloque 1 debe construir el contenedor general de la aplicación.

Debe resolver como mínimo:

- sesión del usuario;
- negocio activo;
- rol;
- navegación;
- acceso a configuración;
- feedback;
- alertas;
- diseño mobile-first.

Conceptualmente:

```text
┌─────────────────────────────┐
│ WALOS                  ⚙   │
│ Propietario                  │
├─────────────────────────────┤
│                             │
│          CONTENIDO          │
│                             │
├─────────────────────────────┤
│ Inicio       Operar    Más  │
└─────────────────────────────┘
```

La navegación exacta debe validarse mediante UX.

No congelar el layout únicamente porque aparece en este ejemplo.

---

# 20. UX Bloque 1

Pantallas iniciales esperables:

```text
Registro
Login

Mis Negocios
Crear Negocio
Seleccionar Negocio

Inicio
Checklist

Miembros
Invitar
Compartir por WhatsApp
Roles

Catálogo
Artículo
Categorías
Unidades
```

---

# 21. Migraciones

No generar una única migración gigante por bloque.

Preferir cambios coherentes pequeños.

Ejemplo:

```text
001_usuarios_negocios
002_invitaciones
003_catalogo
004_restricciones_catalogo
```

Todas pueden formar parte del:

```text
CHECKPOINT BLOQUE 1
```

Las migraciones deben:

- ser reproducibles;
- poseer orden claro;
- mantener consistente el esquema;
- ser probadas sobre una base limpia.

---

# 22. Datos de prueba y seeds

Cada checkpoint debe contar con datos reproducibles.

Se recomienda mantener dos escenarios.

## WALOS Demo

Ejemplo:

```text
Modalidades:
REVENTA
PRODUCCION
```

Puede contener:

- usuarios;
- categorías;
- artículos;
- configuraciones coherentes.

---

## Negocio de Servicios Demo

Ejemplo:

```text
Estudio de Maquillaje
```

Modalidad:

```text
SERVICIOS
```

Objetivo:

> comprobar que la aplicación sigue siendo genérica y que no asume que todos los negocios manejan mercadería.

---

# 23. Testing

Cada bloque debe probarse en diferentes niveles.

## Tests de dominio

Verifican reglas puras.

Ejemplo:

```text
no dejar un negocio sin propietario
```

## Tests de servicios

Verifican coordinación de casos de uso.

## Tests de integración

Incluyen:

```text
PostgreSQL
SQLAlchemy
transacciones
restricciones
```

## Tests API

Comprueban:

- autenticación;
- autorización;
- requests;
- responses;
- errores.

## Tests E2E principales

Verifican los flujos críticos del bloque.

No es necesario automatizar absolutamente toda la UI para aprobar un checkpoint.

---

# 24. Aislamiento multi-negocio

Debe probarse desde Bloque 1.

Como mínimo:

```text
Usuario A pertenece a Negocio A.

Usuario B pertenece a Negocio B.

Usuario A intenta consultar/modificar
un recurso perteneciente a Negocio B.

Resultado:
ACCESO RECHAZADO.
```

Esta propiedad no debe depender únicamente de que el frontend oculte información.

Debe validarse en el servidor.

---

# 25. Backend existente

Existe código previo correspondiente a un prototipo orientado a Compras/WALOS.

No debe eliminarse ni reutilizarse ciegamente.

Antes de modificarlo:

```text
AUDITAR
   ↓
├── reutilizable
├── refactorizable
└── obsoleto
```

No iniciar un proyecto FastAPI nuevo únicamente para obtener una estructura más limpia.

Debe aprovecharse lo útil y migrarse progresivamente al nuevo dominio.

---

# 26. Política para agentes de IA al tocar código

Antes de generar código, una IA debe:

```text
1. Leer este README.

2. Leer:
   00-definicion-y-vision.md
   01-stakeholders-y-actores.md
   04-mapa-modulos-y-trazabilidad.md

3. Leer los módulos involucrados.

4. Leer los ADR relacionados.

5. Leer el modelo técnico existente.

6. Inspeccionar el código actual.

7. Inspeccionar las migraciones actuales.

8. Verificar tests existentes.

9. Recién entonces proponer cambios.
```

No asumir que:

```text
el código actual representa el dominio definitivo.
```

---

# 27. Política para generar nuevos módulos con IA

Cuando se solicite a una IA diseñar un módulo funcional nuevo debe seguir este protocolo.

## Paso 1 — Leer dependencias

Ejemplo para M03:

```text
00
01
04
M01
M02
```

y cualquier documento técnico relevante ya congelado.

---

## Paso 2 — Identificar decisiones ya tomadas

No volver a preguntar cosas ya decididas.

Ejemplo:

```text
roles
multi-negocio
ArticuloCatalogo
```

si ya están congelados.

---

## Paso 3 — Detectar decisiones realmente pendientes

Preguntar únicamente cuando la respuesta:

- cambie significativamente el dominio;
- afecte varios casos de uso;
- produzca una decisión difícil de revertir;
- modifique el alcance del MVP.

Los detalles técnicos menores pueden postergarse.

---

## Paso 4 — Redactar especificación funcional

Cada módulo debería incluir, cuando corresponda:

```text
Propósito
Alcance
Fuera de alcance

Actores

Conceptos del dominio

Requisitos funcionales
RF-*

Reglas de negocio
RN-*

Casos de uso
CU-*

Historias de usuario
HU-*

Estados y transiciones

Errores y excepciones

Interacción con otros módulos

Matriz de trazabilidad

Criterios de aceptación

Prioridad / futuro
```

---

## Paso 5 — No mezclar tecnología

Durante especificación funcional NO decidir:

```text
rutas REST exactas
headers HTTP
clases SQLAlchemy
tipos SQL
índices
JWT payload
React components
```

salvo que la tecnología forme parte explícita del requisito.

---

## Paso 6 — Revisión

Antes de congelar:

```text
buscar contradicciones
buscar casos borde
buscar duplicación con otros módulos
buscar sobreingeniería
verificar alcance MVP
```

---

## Paso 7 — Congelación

Un módulo se considera congelado cuando:

- las reglas principales están resueltas;
- los casos borde relevantes están definidos;
- no existen contradicciones conocidas;
- el usuario aprueba avanzar.

Congelado no significa imposible de modificar.

Significa:

> cambiarlo requiere una decisión explícita.

---

# 28. Definition of Ready — implementación

Un bloque está listo para comenzar implementación cuando:

```text
[ ] módulos funcionales congelados

[ ] entidades principales identificadas

[ ] invariantes identificadas

[ ] ADR críticos resueltos

[ ] modelo relacional del bloque definido

[ ] contrato API definido

[ ] flujos UX principales definidos

[ ] criterios de aceptación claros

[ ] escenarios de tests principales definidos
```

Si faltan detalles menores no bloqueantes:

```text
NO detener todo el desarrollo.
```

Resolverlos durante la implementación.

---

# 29. Definition of Done — bloque

Un bloque está terminado cuando:

```text
DOCUMENTACIÓN

[ ] módulos funcionales actualizados
[ ] modelo de dominio actualizado
[ ] ADR necesarios actualizados
[ ] modelo relacional actualizado
[ ] API actualizada
[ ] UX actualizada
[ ] pruebas documentadas


BACKEND

[ ] migraciones aplicables desde base limpia
[ ] endpoints funcionando
[ ] reglas de negocio implementadas
[ ] aislamiento entre negocios verificado


FRONTEND

[ ] flujos principales utilizables
[ ] mobile-first validado
[ ] frontend integrado con API real


TESTS

[ ] tests críticos pasan
[ ] integración validada
[ ] escenario E2E del bloque funciona


OPERACIÓN

[ ] seed reproducible
[ ] Docker funciona
[ ] repositorio sin cambios accidentales
[ ] checkpoint Git creado
```

---

# 30. Checkpoints

Cada bloque termina con un checkpoint estable.

Ejemplo:

```text
checkpoint-bloque-1
checkpoint-bloque-2
checkpoint-bloque-3
checkpoint-mvp
```

Los nombres concretos de tags son opcionales.

Lo obligatorio es que exista un commit identificable y probado antes de avanzar.

---

# 31. BLOQUE 2 — Compras + Inventario

Solo comienza después del Checkpoint 1.

Módulos:

```text
M03 — Compras y Proveedores
M04 — Inventario y Ubicaciones
```

Se diseñan en conjunto porque una Compra puede producir efectos directos en Inventario.

Conceptos esperables:

```text
Proveedor
Compra
ItemCompra

Ubicacion
StockUbicacion
MovimientoInventario
Lote
```

Flujo principal esperado:

```text
Registrar Compra
        ↓
Confirmar
        ↓
Ingresar Stock
        ↓
Consultar Stock
        ↓
Transferir Stock
```

---

# 32. Checkpoint 2

Debe validarse como mínimo:

```text
crear artículo
→ crear proveedor
→ registrar compra
→ confirmar
→ incrementar stock
→ consultar inventario
→ transferir
→ verificar destino
```

También:

```text
Articulo.controla_stock = False
→ NO genera inventario
```

---

# 33. BLOQUE 3 — Ventas + Caja

Módulos:

```text
M05 — Ventas y Pagos
M06 — Caja y Gastos
```

Este bloque representa la experiencia operativa principal del feriante.

Flujo:

```text
Abrir Caja
      ↓
Venta Rápida
      ↓
Agregar artículos/servicios
      ↓
Aplicar descuento
      ↓
Cobrar
      ↓
Confirmar
      ↓
Registrar gasto
      ↓
Cerrar Caja
      ↓
Arqueo
```

Aquí la UX tiene prioridad especialmente alta.

Debe minimizar:

```text
toques
esperas
formularios
cambio de pantallas
```

---

# 34. Checkpoint 3

Escenario principal:

```text
abrir caja
→ venta de bien
→ efectivo
→ venta de servicio
→ Mercado Pago
→ gasto
→ cierre
→ arqueo
```

También debe comprobarse:

```text
stock inconsistente
→ advertencia
→ venta continúa
→ inconsistencia registrada
```

Al cerrar este bloque existe el núcleo comercial principal del MVP.

---

# 35. BLOQUE 4 — Producción + Analítica

## M07 — Producción

Prioridad:

```text
SHOULD HAVE
```

Debe soportar:

```text
producción con receta
producción sin receta
```

La receta constituye una ayuda y no una condición obligatoria.

---

## M08 — Analítica

Debe construirse sobre operaciones reales ya existentes.

Fuentes:

```text
Compras
Inventario
Ventas
Caja
Producción
```

Indicadores básicos:

```text
ventas
compras
gastos
stock
vencimientos
productos más vendidos
ventas por ubicación
margen estimado
resultado estimado
```

---

# 36. Checkpoint MVP

El sistema debe poder demostrar:

```text
Crear Usuario
     ↓
Crear Negocio
     ↓
Crear Catálogo
     ↓
Registrar Compra
     ↓
Ingresar Stock
     ↓
Mover Stock
     ↓
Abrir Caja
     ↓
Vender
     ↓
Cobrar
     ↓
Registrar Gasto
     ↓
Cerrar Caja
     ↓
Consultar Analítica
```

Si M07 está incluido:

```text
Comprar insumos
     ↓
Producir
     ↓
Obtener producto terminado
     ↓
Vender
```

---

# 37. Documentación transversal incremental

Estos documentos no se escriben completamente de antemano:

```text
modelo-dominio/
arquitectura/
base-de-datos/
api/
ux/
pruebas/
```

Se amplían después de cada bloque.

Ejemplo:

```text
Bloque 1
→ modelo Usuario + Catálogo

Bloque 2
→ agregar Compra + Inventario

Bloque 3
→ agregar Venta + Caja

Bloque 4
→ agregar Producción + Analítica
```

---

# 38. Reglas generales del negocio

Durante la especificación de los módulos aparecerán reglas que afectan más de un módulo.

Estas deben consolidarse posteriormente en:

```text
docs/03-reglas-generales-negocio.md
```

Ejemplos:

- conservación histórica;
- trazabilidad;
- anulaciones;
- soft delete;
- aislamiento por negocio;
- consistencia transaccional.

No duplicar innecesariamente reglas en todos los módulos.

---

# 39. Requisitos no funcionales

Se consolidarán progresivamente en:

```text
docs/02-requerimientos-no-funcionales.md
```

Áreas esperables:

```text
seguridad
disponibilidad
rendimiento
concurrencia
usabilidad
mobile-first
auditoría
mantenibilidad
portabilidad
Docker
recuperación ante errores
```

No inventar métricas arbitrarias sin justificación.

---

# 40. Validación con WALOS

WALOS es el principal caso de validación real.

En cada checkpoint preguntar:

```text
¿WALOS puede realizar este flujo?
```

Pero siempre debe existir al menos otro escenario suficientemente diferente.

Ejemplo:

```text
WALOS
→ REVENTA + PRODUCCION

Maquilladora Demo
→ SERVICIOS
```

El segundo escenario permite detectar acoplamiento accidental con WALOS.

---

# 41. No hacer

Una IA trabajando sobre este proyecto no debe:

```text
❌ rediseñar todo el sistema por cada módulo

❌ comenzar microservicios

❌ introducir Kafka, Kubernetes o Redis sin necesidad real

❌ crear abstracciones Repository vacías solo por usar un patrón

❌ forzar Strategy/Observer/etc. donde no existe variabilidad real

❌ convertir todos los conceptos en agregados DDD complejos

❌ inventar endpoints antes de definir requisitos

❌ inventar tablas durante documentación funcional

❌ crear lógica específica para WALOS

❌ eliminar historia para corregir datos

❌ asumir que todos los negocios venden productos físicos

❌ implementar módulos futuros antes de cerrar el bloque actual

❌ reescribir código existente sin auditarlo

❌ instalar herramientas adicionales no solicitadas
```

---

# 42. Patrones de diseño

Los patrones deben utilizarse porque resuelven problemas reales.

Patrón organizador principal esperado:

```text
Service Layer
```

Repository:

```text
usar solo cuando aporte separación útil
```

Strategy:

```text
usar cuando exista comportamiento intercambiable real
```

Observer / Domain Events:

```text
pueden utilizarse conceptualmente,
pero no requieren infraestructura distribuida
```

El objetivo académico no es “usar muchos patrones”.

Es:

> justificar correctamente los patrones que realmente mejoran el diseño.

---

# 43. Política de revisión con IA

La IA debe trabajar de forma incremental.

Para tareas complejas:

```text
analizar
→ producir propuesta
→ revisar contradicciones
→ entregar
```

No debe continuar automáticamente hacia otra fase si el usuario está revisando el resultado actual.

Especialmente:

```text
Documento funcional
      ↓
REVISIÓN
      ↓
Congelación
      ↓
Diseño técnico
```

La revisión forma parte del proceso.

---

# 44. Contexto mínimo para una nueva sesión de IA

Si una nueva instancia de IA entra al proyecto, debe recibir o leer como mínimo:

```text
docs/README.md

docs/00-definicion-y-vision.md
docs/01-stakeholders-y-actores.md
docs/04-mapa-modulos-y-trazabilidad.md
```

y los documentos del bloque activo.

Ejemplo durante Bloque 2:

```text
modulos/01-organizacion-negocio.md
modulos/02-catalogo.md
modulos/03-compras-y-proveedores.md
modulos/04-inventario-y-ubicaciones.md
```

Además debe consultar los documentos técnicos ya existentes que afecten el cambio.

---

# 45. Pregunta que una IA debe responder antes de trabajar

Antes de modificar cualquier parte del sistema, debe poder responder:

```text
¿En qué bloque estoy?

¿Qué fase del bloque estoy ejecutando?

¿Qué documentos ya están congelados?

¿Qué artefacto debo producir ahora?

¿Qué cosas explícitamente NO debo diseñar todavía?
```

Si no puede responder estas preguntas, debe releer la documentación antes de generar una solución.

---

# 46. Estado inmediato

Estado actual:

```text
BLOQUE 1 — FUNDACIÓN

M01 Organización
✅ especificación funcional congelada

M02 Catálogo
⏳ pendiente de especificación funcional
```

Siguiente acción:

```text
Redactar y revisar:

docs/modulos/02-catalogo.md
```

Después:

```text
NO comenzar M03.
```

Continuar con:

```text
Modelo de dominio M01 + M02
        ↓
ADRs necesarios
        ↓
Modelo relacional
        ↓
Contrato API
        ↓
UX Bloque 1
        ↓
Backend
        ↓
Frontend
        ↓
Tests
        ↓
Checkpoint 1
```

---

# 47. Regla final

La estrategia general del proyecto es:

```text
PENSAR LO NECESARIO
        ↓
ESPECIFICAR
        ↓
DISEÑAR
        ↓
IMPLEMENTAR
        ↓
PROBAR
        ↓
VALIDAR
        ↓
DOCUMENTAR LO APRENDIDO
        ↓
CONGELAR CHECKPOINT
        ↓
AVANZAR
```

No se busca diseñar el sistema perfecto antes de programarlo.

Tampoco se busca programar rápidamente sin comprender el dominio.

El objetivo es construir **incrementos funcionales pequeños, coherentes, probados y defendibles**, manteniendo alineados:

```text
Negocio
Código
Base de Datos
API
UX
Pruebas
Documentación
```
