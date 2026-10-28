# Casos de Prueba — Bloque 1 Fundación

> **Estado:** versión de referencia para implementación y validación del Bloque 1.  
> **Alcance:** M01 — Organización del Negocio + M02 — Catálogo.  
> **Stack:** Python 3.13, Pytest, FastAPI, SQLAlchemy 2.x, PostgreSQL 16+.  
> **Base documental:** dominio M01/M02, arquitectura, modelo relacional, ERD y contrato API del Bloque 1.  
> **Objetivo:** convertir las reglas congeladas del sistema en pruebas verificables antes de implementar el backend.

---

## 1. Propósito

Este documento define **qué debe probarse** y en qué nivel.

No pretende anticipar cada línea de implementación.

La estrategia es:

~~~text
Regla / Invariante
        ↓
Caso de prueba explícito
        ↓
Implementación mínima necesaria
        ↓
Refactor seguro
~~~

Una IA que implemente el backend deberá utilizar esta especificación junto con:

~~~text
modelo de dominio
arquitectura
modelo relacional
contrato-api.md
endpoints.md
schemas-dto.md
~~~

y no inferir comportamientos distintos por conveniencia técnica.

---

# PARTE I — ESTRATEGIA GENERAL

## 2. Pirámide de pruebas

El Bloque 1 utilizará cuatro niveles principales:

~~~text
              E2E
               ▲
               │
          API / HTTP
               ▲
               │
   Integración / Persistencia
               ▲
               │
     Application / Domain
~~~

La mayor cantidad de casos debe concentrarse en pruebas rápidas de Domain/Application.

Las pruebas de integración y concurrencia serán más selectivas y cubrirán únicamente reglas que dependen de PostgreSQL, transacciones, locks o constraints reales.

---

## 3. Tipos de prueba

### 3.1. Unit — Domain

Sin:

- FastAPI;
- SQLAlchemy;
- PostgreSQL;
- Docker;
- red.

Prueban:

- Value Objects;
- invariantes puras;
- transiciones;
- comportamiento de entidades/agregados.

### 3.2. Unit — Application

Utilizan:

- repositories fake o mocks pequeños;
- clock fake;
- password hasher/token service fake cuando corresponda.

Prueban:

- orquestación;
- autorización contextual;
- decisiones entre crear/reactivar;
- atomicidad conceptual;
- llamadas correctas a puertos.

No prueban SQL.

### 3.3. Integration — Persistence

Utilizan PostgreSQL real de tests.

Prueban:

- mappings SQLAlchemy;
- constraints;
- FK;
- UNIQUE;
- partial indexes;
- composite FK;
- transacciones;
- optimistic locking;
- row locks;
- ON DELETE.

**No utilizar SQLite** para sustituir estas pruebas.

### 3.4. API

Prueban la frontera FastAPI:

- rutas;
- JWT;
- status codes;
- request validation;
- response schemas;
- paginación;
- filtros;
- política 404 cross-tenant;
- errores uniformes.

---

## 4. Convención de nombres

Formato recomendado:

~~~text
test_<comportamiento>_<resultado_esperado>
~~~

Ejemplos:

~~~python
test_reactivar_articulo_inactivo_con_configuracion_valida_lo_activa()

test_desactivar_ultimo_propietario_rechaza_operacion()

test_get_articulo_de_otro_tenant_devuelve_404()
~~~

Evitar nombres como:

~~~text
test_case_1
test_article
test_error
~~~

---

## 5. Arrange / Act / Assert

Toda prueba debe ser legible en tres fases:

~~~text
Arrange
→ preparar estado

Act
→ ejecutar comportamiento

Assert
→ verificar resultado observable
~~~

No es obligatorio escribir comentarios AAA si el test ya resulta claro.

---

## 6. Independencia

Cada test debe poder ejecutarse:

- solo;
- en cualquier orden;
- múltiples veces;
- en paralelo cuando técnicamente sea seguro.

No depender de datos creados por otro test.

---

## 7. Reloj controlado

Toda prueba relacionada con:

~~~text
fecha_emision
fecha_expiracion
vigencia
materialización de EXPIRADA
~~~

debe utilizar un clock inyectable/fijo.

Ejemplo conceptual:

~~~text
ahora = 2026-10-28T15:00:00Z
~~~

No depender de:

~~~python
datetime.now()
~~~

directamente dentro del test.

---

## 8. IDs deterministas cuando ayuden

Los UUID pueden generarse normalmente, pero en tests donde resulte útil explicar relaciones se permiten UUID fijos.

No utilizar IDs secuenciales ficticios si la aplicación real trabaja con UUID.

---

## 9. PostgreSQL de integración

Las pruebas de persistencia deben ejecutarse contra una instancia PostgreSQL compatible con producción.

Preparación recomendada:

~~~text
PostgreSQL test container
        ↓
Alembic upgrade head
        ↓
test
        ↓
rollback / limpieza
~~~

No duplicar manualmente el schema SQL dentro de fixtures.

---

## 10. Qué no mockear innecesariamente

No mockear:

- entidades Domain;
- Value Objects;
- funciones puras;
- Pydantic;
- SQLAlchemy en tests que justamente evalúan persistencia.

Mock/fake solo fronteras externas reales:

- repository en unit tests de Application;
- clock;
- password hasher;
- token generator;
- storage externo;
- audit port si corresponde.

---

# PARTE II — PRIORIDADES

## 11. Prioridad P0

Una prueba P0 protege:

- aislamiento tenant;
- seguridad/autenticación;
- invariantes que pueden corromper datos;
- concurrencia;
- atomicidad;
- último propietario;
- unicidad funcional;
- aceptación de invitaciones;
- constraints fundamentales.

Un fallo P0 bloquea merge.

## 12. Prioridad P1

Protege comportamiento funcional central.

Un fallo P1 debe corregirse antes de release.

## 13. Prioridad P2

Protege comportamiento secundario, formato o edge cases de menor riesgo.

No debe confundirse P2 con “innecesario”.

---

# PARTE III — UNIT TESTS DE DOMAIN: M01

## 14. Matriz M01 Domain

| ID | Prioridad | Caso | Arrange | Act | Resultado esperado |
| --- | --- | --- | --- | --- | --- |
| DOM-ORG-001 | P0 | Email funcionalmente equivalente | Dos representaciones que la política de Email considere equivalentes | Construir/comparar VO | Se consideran la misma identidad funcional |
| DOM-ORG-002 | P1 | Email inválido | Valor que viole la política definida por Email | Construir VO | Se rechaza sin crear VO inválido |
| DOM-ORG-003 | P0 | Incorporar miembro nuevo | Negocio + usuario sin membresía histórica | incorporar con ENCARGADO | Crea una única UsuarioNegocio ACTIVA/ENCARGADO |
| DOM-ORG-004 | P0 | Reactivar miembro histórico | Membresía INACTIVA del mismo Usuario+Negocio | incorporar con TRABAJADOR | Reutiliza misma identidad, queda ACTIVA/TRABAJADOR |
| DOM-ORG-005 | P0 | Membresía ya activa | Membresía histórica ACTIVA | intentar incorporar | Rechaza; no duplica ni cambia rol |
| DOM-ORG-006 | P0 | Membresía histórica de otro Usuario | Membresía incompatible | intentar incorporar | Rechaza explícitamente |
| DOM-ORG-007 | P0 | Membresía histórica de otro Negocio | Membresía incompatible | intentar incorporar | Rechaza explícitamente |
| DOM-ORG-008 | P0 | Invitación no admite PROPIETARIO | Invitación nueva | proponer PROPIETARIO | Rechaza |
| DOM-ORG-009 | P1 | Invitación vigente | PENDIENTE, ahora < expiración | consultar vigencia | true |
| DOM-ORG-010 | P1 | Invitación vence exactamente en límite | PENDIENTE, ahora = expiración | consultar vigencia | false |
| DOM-ORG-011 | P0 | Aceptar invitación válida | PENDIENTE + vigente + Email coincidente | aceptar | Estado ACEPTADA |
| DOM-ORG-012 | P0 | Aceptar con Email distinto | PENDIENTE vigente | aceptar con otro Email | Rechaza; sigue PENDIENTE |
| DOM-ORG-013 | P0 | Aceptar invitación vencida | PENDIENTE no vigente | aceptar | Rechaza; no cambia estado |
| DOM-ORG-014 | P1 | Rechazar invitación válida | PENDIENTE vigente + Email correcto | rechazar | Estado RECHAZADA |
| DOM-ORG-015 | P1 | Rechazar vencida | PENDIENTE no vigente | rechazar | Rechaza transición |
| DOM-ORG-016 | P0 | Estado terminal no cambia | Invitación ACEPTADA/RECHAZADA/CANCELADA/EXPIRADA | intentar transición adicional | Rechaza |
| DOM-ORG-017 | P1 | Cancelar PENDIENTE vencida no materializada | PENDIENTE + no vigente | cancelar con autorización contextual válida | Estado CANCELADA |
| DOM-ORG-018 | P1 | Expirar PENDIENTE vencida | PENDIENTE + ahora >= expiración | materializar expiración | Estado EXPIRADA |
| DOM-ORG-019 | P1 | Expirar invitación todavía vigente | PENDIENTE + vigente | expirar | Rechaza/no cambia |
| DOM-ORG-020 | P0 | Degradar último propietario | Negocio con un único PROPIETARIO ACTIVO | intentar cambio de rol con contexto ya calculado | Rechaza |
| DOM-ORG-021 | P0 | Desactivar último propietario | Único PROPIETARIO ACTIVO | intentar desactivar | Rechaza |
| DOM-ORG-022 | P1 | Múltiples propietarios | Dos PROPIETARIOS ACTIVO | degradar/desactivar uno | Permite y conserva al menos uno |
| DOM-ORG-023 | P1 | Promoción explícita | Miembro ACTIVO ENCARGADO/TRABAJADOR | promover | Queda PROPIETARIO |
| DOM-ORG-024 | P1 | Promover propietario existente | Miembro ya PROPIETARIO | promover | Rechaza transición/no-op silencioso |

---

# PARTE IV — UNIT TESTS DE DOMAIN: M02

## 15. CapacidadesArticulo

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DOM-CAT-001 | P0 | SERVICIO con controla_stock=true | Rechaza |
| DOM-CAT-002 | P0 | SERVICIO con controla_vencimiento=true | Rechaza |
| DOM-CAT-003 | P0 | SERVICIO con puede_usarse_en_produccion=true | Rechaza |
| DOM-CAT-004 | P0 | controla_vencimiento=true pero controla_stock=false | Rechaza |
| DOM-CAT-005 | P0 | puede_usarse_en_produccion=true pero controla_stock=false | Rechaza |
| DOM-CAT-006 | P0 | permite_descuento=true pero es_vendible=false | Rechaza |
| DOM-CAT-007 | P1 | Configuración BIEN coherente | Acepta |
| DOM-CAT-008 | P1 | Configuración SERVICIO vendible válida | Acepta |
| DOM-CAT-009 | P0 | VO inválido no auto-corrige flags | Rechaza configuración original; no modifica valores |

## 16. ArticuloCatalogo

| ID | Prioridad | Caso | Arrange / Act | Resultado esperado |
| --- | --- | --- | --- | --- |
| DOM-CAT-010 | P0 | Crear ACTIVO sin uso operativo | Todas capacidades operativas false | Rechaza |
| DOM-CAT-011 | P0 | Vendible sin precio | es_vendible=true, precio=null | Rechaza |
| DOM-CAT-012 | P0 | Precio negativo | precio < 0 | Rechaza |
| DOM-CAT-013 | P0 | Costo negativo | costo < 0 | Rechaza |
| DOM-CAT-014 | P1 | Precio cero | es_vendible=true, precio=0 | Acepta localmente M02 |
| DOM-CAT-015 | P0 | Tipo inmutable | Artículo existente BIEN | intentar cambiar a SERVICIO | Rechaza |
| DOM-CAT-016 | P0 | Edición válida ACTIVO | ACTIVO + propuesta válida | Aplica todos los cambios y sigue ACTIVO |
| DOM-CAT-017 | P0 | Edición inválida es atómica | propuesta cambia varios campos y uno viola invariante | Ningún cambio observable se aplica |
| DOM-CAT-018 | P0 | Editar INACTIVO | INACTIVO + propuesta válida | Aplica cambios y sigue INACTIVO |
| DOM-CAT-019 | P0 | Edición de ACTIVO deja cero usos | propuesta final inválida | Rechaza; no auto-desactiva |
| DOM-CAT-020 | P1 | Desactivar ACTIVO | ACTIVO | Pasa a INACTIVO y conserva configuración |
| DOM-CAT-021 | P1 | Desactivar INACTIVO | INACTIVO | Rechaza transición/no-op |
| DOM-CAT-022 | P1 | Reactivar válido | INACTIVO con configuración válida de ACTIVO | Pasa a ACTIVO |
| DOM-CAT-023 | P0 | Reactivar con configuración inválida | INACTIVO sin configuración apta | Rechaza y permanece INACTIVO |
| DOM-CAT-024 | P1 | Reactivación no edita | INACTIVO | llamar reactivación | Solo cambia estado; no altera configuración |
| DOM-CAT-025 | P1 | Deshabilitar venta coherentemente | vendible + descuento | propuesta deja vendible=false, descuento=false | Acepta y conserva precio |
| DOM-CAT-026 | P0 | Deshabilitar venta dejando descuento=true | propuesta inconsistente | Rechaza; VO no auto-corrige |
| DOM-CAT-027 | P1 | SKU vacío canónico | input vacío/whitespace normalizado antes del dominio | Ausencia representada como null |

## 17. Imágenes del artículo

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DOM-CAT-028 | P1 | Cero imágenes | Válido, sin principal |
| DOM-CAT-029 | P0 | Una imagen principal | Válido |
| DOM-CAT-030 | P0 | Varias imágenes con una principal | Válido |
| DOM-CAT-031 | P0 | Más de tres imágenes | Rechaza |
| DOM-CAT-032 | P0 | Imágenes sin principal | Rechaza |
| DOM-CAT-033 | P0 | Más de una principal | Rechaza |
| DOM-CAT-034 | P0 | Posición repetida | Rechaza |
| DOM-CAT-035 | P1 | Posición fuera de 1..3 | Rechaza |

---

# PARTE V — UNIT TESTS DE APPLICATION: M01

## 18. Crear Negocio

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-ORG-001 | P0 | Crear negocio correcto | Persiste Negocio + 1..N modalidades + membresía ACTIVA/PROPIETARIO |
| APP-ORG-002 | P0 | Falla creación de membresía inicial | UoW/transacción no confirma ninguna parte |
| APP-ORG-003 | P1 | Modalidades vacías | Rechaza antes de confirmar |
| APP-ORG-004 | P1 | Modalidades duplicadas | Rechaza |
| APP-ORG-005 | P1 | Creador surge del contexto autenticado | Ignora cualquier intento externo de elegir propietario |

## 19. Emitir Invitación

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-ORG-006 | P0 | Emitir invitación válida | Crea PENDIENTE con emisor, rol permitido y expiración |
| APP-ORG-007 | P0 | Destinatario ya ACTIVO | Rechaza |
| APP-ORG-008 | P0 | Ya existe PENDIENTE vigente equivalente | No crea otra |
| APP-ORG-009 | P0 | Existe PENDIENTE vencida | Materializa EXPIRADA y crea nueva PENDIENTE en misma operación |
| APP-ORG-010 | P1 | Rol PROPIETARIO | Rechaza |
| APP-ORG-011 | P0 | Emisor no PROPIETARIO ACTIVO | Rechaza autorización |
| APP-ORG-012 | P1 | Clock se consulta una sola vez por operación | Todas las decisiones temporales usan el mismo ahora |

## 20. Aceptar Invitación

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-ORG-013 | P0 | Usuario nuevo para ese Negocio | Crea membresía + acepta invitación atómicamente |
| APP-ORG-014 | P0 | Membresía histórica INACTIVA | Reactiva la misma membresía + rol propuesto + acepta |
| APP-ORG-015 | P0 | Membresía ya ACTIVA | Rechaza; invitación no pasa a ACEPTADA |
| APP-ORG-016 | P0 | Email autenticado distinto | Rechaza sin mutar |
| APP-ORG-017 | P0 | Invitación vencida | Rechaza sin mutar |
| APP-ORG-018 | P0 | Invitación terminal | Rechaza |
| APP-ORG-019 | P0 | Falla persistencia de membresía | Invitación tampoco queda aceptada |
| APP-ORG-020 | P0 | Falla persistencia de invitación | Membresía tampoco queda activada/creada |
| APP-ORG-021 | P1 | Token por sí solo | Sin Usuario autenticado no permite aceptar |
| APP-ORG-022 | P1 | Rechazo válido | Cambia únicamente invitación a RECHAZADA |

## 21. Gestión de miembros

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-ORG-023 | P0 | Degradar último propietario | Rechaza |
| APP-ORG-024 | P0 | Desactivar último propietario | Rechaza |
| APP-ORG-025 | P1 | Degradar con otro propietario activo | Permite |
| APP-ORG-026 | P1 | Promover miembro | Permite solo actor PROPIETARIO ACTIVO |
| APP-ORG-027 | P0 | Miembro destino de otro tenant | No opera sobre él |
| APP-ORG-028 | P1 | Reactivación directa solicitada | No existe Caso de Uso directo; reincorporación exige invitación |

---

# PARTE VI — UNIT TESTS DE APPLICATION: M02

## 22. Crear Categoría

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-CAT-001 | P1 | Crear categoría válida | Se crea ACTIVA |
| APP-CAT-002 | P0 | Nombre duplicado en mismo negocio | Rechaza |
| APP-CAT-003 | P1 | Mismo nombre en otro negocio | Puede existir |
| APP-CAT-004 | P0 | Actor sin permiso | Rechaza |

## 23. Editar / estado de Categoría

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-CAT-005 | P1 | Editar nombre | Cambia nombre, conserva estado |
| APP-CAT-006 | P0 | Nombre nuevo duplicado | Rechaza |
| APP-CAT-007 | P1 | Desactivar categoría | Pasa ACTIVA→INACTIVA; no modifica artículos |
| APP-CAT-008 | P1 | Reactivar categoría | Pasa INACTIVA→ACTIVA |
| APP-CAT-009 | P0 | Eliminar categoría con artículos | Rechaza |
| APP-CAT-010 | P1 | Eliminar categoría sin asociaciones | Permite hard delete |

## 24. Crear Artículo

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-CAT-011 | P0 | Crear artículo válido | Crea ACTIVO |
| APP-CAT-012 | P0 | Categoria de otro tenant | Resuelve como no accesible; no crea |
| APP-CAT-013 | P0 | Categoria INACTIVA nueva | Rechaza |
| APP-CAT-014 | P0 | Nombre duplicado | Rechaza |
| APP-CAT-015 | P0 | SKU duplicado | Rechaza |
| APP-CAT-016 | P1 | SKU blank | Normaliza a null |
| APP-CAT-017 | P0 | Actor sin permiso | Rechaza |
| APP-CAT-018 | P1 | Sin categoría | Permite si resto es válido |

## 25. Editar Artículo

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-CAT-019 | P0 | PATCH campo omitido | Conserva valor previo |
| APP-CAT-020 | P0 | PATCH null explícito nullable | Limpia el campo |
| APP-CAT-021 | P0 | Nueva categoría de otro tenant | Rechaza/oculta |
| APP-CAT-022 | P0 | Nueva categoría INACTIVA | Rechaza |
| APP-CAT-023 | P1 | Categoría histórica queda INACTIVA sin reasignación | Puede conservarse |
| APP-CAT-024 | P0 | Nombre/SKU duplicado por precheck | Rechaza |
| APP-CAT-025 | P0 | Edición inválida | No persiste cambios parciales |
| APP-CAT-026 | P0 | Edición de INACTIVO | Persiste cambios sin reactivar |
| APP-CAT-027 | P1 | Reemplazo completo de imágenes | Colección resultante coincide con request |
| APP-CAT-028 | P1 | imágenes omitidas | Conserva colección |
| APP-CAT-029 | P1 | imágenes=[] | Elimina colección |
| APP-CAT-030 | P0 | Cambios de imagen | Incrementa version del Articulo padre |

## 26. Desactivar / Reactivar / Eliminar Artículo

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| APP-CAT-031 | P1 | Desactivar ACTIVO | Queda INACTIVO |
| APP-CAT-032 | P1 | Reactivar INACTIVO válido | Queda ACTIVO |
| APP-CAT-033 | P0 | Reactivar configuración inválida | Rechaza |
| APP-CAT-034 | P1 | Categoría histórica INACTIVA | No bloquea por sí sola reactivación |
| APP-CAT-035 | P0 | Hard delete por no propietario | Rechaza |
| APP-CAT-036 | P0 | Hard delete artículo ACTIVO | Rechaza |
| APP-CAT-037 | P0 | Hard delete INACTIVO con referencias | Rechaza |
| APP-CAT-038 | P1 | Hard delete elegible | Elimina y libera nombre/SKU |

---

# PARTE VII — INTEGRACIÓN: PERSISTENCIA M01

## 27. Usuario y Negocio

| ID | Prioridad | Caso | Verificación física |
| --- | --- | --- | --- |
| DB-ORG-001 | P0 | Email normalizado duplicado | UNIQUE impide segunda fila |
| DB-ORG-002 | P1 | Nombre de negocios igual | Se permite en tenants distintos |
| DB-ORG-003 | P0 | Crear negocio transaccional | Negocio/modalidades/owner aparecen juntos o ninguno |
| DB-ORG-004 | P1 | Negocio sin modalidades por repositorio incorrecto | El flujo funcional no debe confirmarlo aunque la FK sola permita temporalmente 0 filas hija |
| DB-ORG-005 | P0 | UsuarioNegocio duplicado | UNIQUE(usuario_id, negocio_id) impide duplicación |

## 28. Tenant-safe FKs

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DB-ORG-006 | P0 | Invitación del negocio A con emisor del negocio B | Composite FK rechaza INSERT/UPDATE |
| DB-ORG-007 | P1 | Invitación con emisor del mismo negocio | Persiste |

## 29. Invitaciones

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DB-ORG-008 | P0 | token_hash duplicado | UNIQUE global rechaza |
| DB-ORG-009 | P0 | Dos PENDIENTES para mismo negocio+email | Partial UNIQUE rechaza la segunda |
| DB-ORG-010 | P1 | PENDIENTE + ACEPTADA histórica mismo email | Se permite |
| DB-ORG-011 | P1 | fecha_expiracion <= fecha_emision | CHECK rechaza |
| DB-ORG-012 | P1 | rol_propuesto PROPIETARIO | CHECK rechaza |
| DB-ORG-013 | P1 | estado desconocido | CHECK rechaza |

## 30. Último Propietario y locks

Estas pruebas requieren **dos sesiones/transacciones PostgreSQL independientes**.

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DB-ORG-014 | P0 | Dos operaciones intentan retirar simultáneamente a los dos últimos propietarios | Lock de negocio serializa; no se confirma estado con cero propietarios |
| DB-ORG-015 | P0 | Dos cambios concurrentes sobre misma membresía/version | Solo uno confirma; otro recibe conflicto |
| DB-ORG-016 | P0 | Dos aceptaciones concurrentes de misma invitación | Solo una transición confirma |
| DB-ORG-017 | P0 | Dos altas concurrentes Usuario+Negocio | UNIQUE impide duplicidad |

No exigir una excepción SQLAlchemy específica como parte del contrato.

Infrastructure puede traducir distintos errores técnicos al conflicto de persistencia correspondiente.

---

# PARTE VIII — INTEGRACIÓN: PERSISTENCIA M02

## 31. Categoría

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DB-CAT-001 | P0 | Nombre categoria duplicado mismo tenant | UNIQUE rechaza |
| DB-CAT-002 | P1 | Mismo nombre normalizado en otro tenant | Se permite |
| DB-CAT-003 | P0 | Borrar categoría asociada a artículo | FK RESTRICT rechaza |
| DB-CAT-004 | P1 | Borrar categoría nunca asociada | Permite |

## 32. Artículo

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DB-CAT-005 | P0 | Nombre artículo duplicado mismo tenant | UNIQUE rechaza |
| DB-CAT-006 | P1 | Mismo nombre en otro tenant | Se permite |
| DB-CAT-007 | P0 | SKU duplicado no-null mismo tenant | Partial UNIQUE rechaza |
| DB-CAT-008 | P1 | Varios sku_normalizado NULL | Se permite |
| DB-CAT-009 | P1 | Mismo SKU en otro tenant | Se permite |
| DB-CAT-010 | P0 | categoria_id del tenant A + negocio_id B | Composite FK rechaza |
| DB-CAT-011 | P0 | SERVICIO con controla_stock | CHECK rechaza |
| DB-CAT-012 | P0 | vencimiento sin BIEN+stock | CHECK rechaza |
| DB-CAT-013 | P0 | producción sin BIEN+stock | CHECK rechaza |
| DB-CAT-014 | P0 | descuento sin venta | CHECK rechaza |
| DB-CAT-015 | P0 | ACTIVO sin uso operativo | CHECK rechaza |
| DB-CAT-016 | P0 | vendible con precio null | CHECK rechaza |
| DB-CAT-017 | P1 | precio/costo negativos | CHECK rechaza |

## 33. Imágenes

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DB-CAT-018 | P0 | Imagen referencia artículo de otro tenant | Composite FK rechaza |
| DB-CAT-019 | P0 | posición fuera de 1..3 | CHECK rechaza |
| DB-CAT-020 | P0 | posición duplicada por artículo | UNIQUE rechaza |
| DB-CAT-021 | P0 | dos principales mismo artículo | Partial UNIQUE rechaza |
| DB-CAT-022 | P1 | borrar artículo elegible | Imágenes asociadas se eliminan por CASCADE |
| DB-CAT-023 | P0 | Reordenamiento 1↔2 en una transacción | UNIQUE DEFERRABLE permite swap válido al commit |

## 34. Optimistic locking

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DB-CAT-024 | P0 | Dos ediciones sobre version N | Solo una confirma |
| DB-CAT-025 | P0 | Update con expected_version vieja | Afecta 0 filas / se traduce a conflicto |
| DB-CAT-026 | P0 | Edición exitosa | version incrementa exactamente una vez |
| DB-CAT-027 | P0 | Modificación de imágenes | version del artículo padre incrementa en misma transacción |
| DB-CAT-028 | P0 | Falla al reemplazar imágenes | Rollback conserva artículo e imágenes anteriores |

---

# PARTE IX — AISLAMIENTO MULTI-TENANT

## 35. Matriz transversal

Estos casos deben existir al menos para una entidad representativa de cada agregado y, preferentemente, parametrizarse.

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| TEN-001 | P0 | Usuario A consulta artículo de Negocio B por UUID conocido | No obtiene recurso |
| TEN-002 | P0 | Usuario A edita artículo de Negocio B | No modifica nada |
| TEN-003 | P0 | Usuario A usa categoria de Negocio B al crear artículo | Rechaza como no accesible |
| TEN-004 | P0 | Usuario A consulta invitación administrativa de Negocio B | No obtiene recurso |
| TEN-005 | P0 | Usuario A modifica miembro de Negocio B | No modifica |
| TEN-006 | P0 | Listado de artículos | Nunca contiene filas de otro tenant |
| TEN-007 | P0 | Listado de categorías | Nunca contiene filas de otro tenant |
| TEN-008 | P0 | Listado de miembros | Nunca contiene filas de otro tenant |
| TEN-009 | P0 | UUID inexistente vs UUID cross-tenant | Frontera API responde 404 de forma indistinguible |
| TEN-010 | P0 | negocio_id enviado extra en body | Schema lo rechaza con 422 |

---

# PARTE X — TESTS DE SCHEMAS PYDANTIC

## 36. Transversales

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DTO-001 | P0 | Campo extra en mutación | ValidationError / 422 en API |
| DTO-002 | P1 | UUID no v4 | Rechaza |
| DTO-003 | P1 | version=0 | Rechaza |
| DTO-004 | P1 | datetime sin timezone cuando aplica | Rechaza |
| DTO-005 | P0 | Money como float JSON | Rechaza |
| DTO-006 | P0 | Money string válido | Produce Decimal |
| DTO-007 | P1 | Money >4 decimales | Rechaza |
| DTO-008 | P1 | Money negativo | Rechaza |
| DTO-009 | P1 | Money response | Serializa string con 4 decimales |
| DTO-010 | P0 | password con espacios significativos | No se strippea automáticamente |

## 37. PATCH

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DTO-011 | P0 | descripcion omitida | No aparece en model_dump(exclude_unset=True) |
| DTO-012 | P0 | descripcion=null | Aparece como None |
| DTO-013 | P0 | nombre=null | Rechaza |
| DTO-014 | P0 | imagenes=null | Rechaza |
| DTO-015 | P1 | imagenes=[] | Acepta como reemplazo por colección vacía |
| DTO-016 | P0 | solo version en EditarArticulo | Rechaza |
| DTO-017 | P1 | EditarCategoria solo version | Rechaza |

## 38. Colecciones / Enums

| ID | Prioridad | Caso | Resultado esperado |
| --- | --- | --- | --- |
| DTO-018 | P1 | modalidades vacías | Rechaza |
| DTO-019 | P1 | modalidades duplicadas | Rechaza |
| DTO-020 | P1 | más de 3 modalidades | Rechaza |
| DTO-021 | P0 | invitación con PROPIETARIO | Rechaza |
| DTO-022 | P0 | CambiarRolMiembro con PROPIETARIO | Rechaza |
| DTO-023 | P0 | más de 3 imágenes | Rechaza |
| DTO-024 | P0 | dos imágenes principales | Rechaza |
| DTO-025 | P0 | ninguna principal con N>0 | Rechaza |

---

# PARTE XI — TESTS DE API

## 39. Requisito mínimo del TP

La entrega exige al menos:

~~~text
10 tests de API
~~~

El Bloque 1 debe superar ese mínimo.

Se define una suite P0 obligatoria de **al menos 20 tests API**, además de tests unitarios e integración.

---

## 40. Autenticación

| ID | Prioridad | Endpoint / Caso | Esperado |
| --- | --- | --- | --- |
| API-001 | P0 | POST /auth/registro válido | 201 + UsuarioResponse sin password/hash |
| API-002 | P0 | registro email duplicado | 409 + código estable |
| API-003 | P0 | login válido | 200 + bearer token + no-store |
| API-004 | P0 | login email inexistente | 401 CREDENCIALES_INVALIDAS |
| API-005 | P0 | login password incorrecta | Misma forma pública que email inexistente |
| API-006 | P1 | login mal formado | 422 ErrorResponse uniforme |
| API-007 | P0 | ruta protegida sin token | 401 |
| API-008 | P0 | JWT inválido/expirado | 401 |

## 41. Multi-tenant / autorización

| ID | Prioridad | Caso | Esperado |
| --- | --- | --- | --- |
| API-009 | P0 | GET artículo propio | 200 |
| API-010 | P0 | GET artículo otro tenant | 404 |
| API-011 | P0 | UUID artículo inexistente | 404 con shape indistinguible |
| API-012 | P0 | miembro ACTIVO sin permiso administrativo | 403 |
| API-013 | P0 | membresía INACTIVA | Sin acceso operativo según política 403/404 del contrato |
| API-014 | P0 | body incluye negocio_id no permitido | 422 |

## 42. Organización

| ID | Prioridad | Caso | Esperado |
| --- | --- | --- | --- |
| API-015 | P0 | POST /negocios válido | 201 + Location navegable |
| API-016 | P1 | GET /usuarios/me/negocios | Solo membresías ACTIVO |
| API-017 | P0 | desactivar último propietario | 409 ULTIMO_PROPIETARIO |
| API-018 | P1 | promover propietario válido | 200 + rol PROPIETARIO + nueva version |
| API-019 | P0 | stale version al cambiar rol | 409 CONFLICTO_CONCURRENCIA |

## 43. Invitaciones

| ID | Prioridad | Caso | Esperado |
| --- | --- | --- | --- |
| API-020 | P0 | emitir invitación válida | 201 + Location existente |
| API-021 | P0 | GET Location de invitación | 200 |
| API-022 | P0 | invitar PROPIETARIO | 422 por schema |
| API-023 | P0 | aceptación sin JWT | 401 |
| API-024 | P0 | aceptación Email distinto | 403 |
| API-025 | P0 | aceptación válida sin body | 200 + membresía |
| API-026 | P0 | aceptar segunda vez | 409 |
| API-027 | P0 | rechazar vencida | 409 |
| API-028 | P1 | vista pública token inválido | 404 INVITACION_NO_DISPONIBLE |
| API-029 | P1 | response administrativa | Nunca contiene token_hash |

## 44. Categorías

| ID | Prioridad | Caso | Esperado |
| --- | --- | --- | --- |
| API-030 | P1 | crear categoría | 201 + Location |
| API-031 | P0 | nombre duplicado | 409 |
| API-032 | P1 | listado sin estado | Solo ACTIVA |
| API-033 | P1 | estado repetido ACTIVA+INACTIVA | Devuelve ambas |
| API-034 | P0 | DELETE categoría con artículo | 409 |
| API-035 | P0 | stale version en PATCH | 409 |

## 45. Artículos

| ID | Prioridad | Caso | Esperado |
| --- | --- | --- | --- |
| API-036 | P0 | crear artículo válido | 201 + Location |
| API-037 | P0 | crear con Categoria cross-tenant | 404 |
| API-038 | P0 | crear vendible sin precio | 400 |
| API-039 | P0 | crear con float monetario | 422 |
| API-040 | P1 | response monetario | String con 4 decimales |
| API-041 | P0 | PATCH omitido vs null | Se comporta según contrato |
| API-042 | P0 | PATCH intenta cambiar tipo | 422 extra_forbid |
| API-043 | P0 | PATCH solo version | 422 |
| API-044 | P0 | PATCH stale version | 409 |
| API-045 | P1 | desactivar | 200 + INACTIVO + nueva version |
| API-046 | P1 | editar INACTIVO | 200 y sigue INACTIVO |
| API-047 | P0 | reactivar con configuración inválida | 400 |
| API-048 | P0 | DELETE artículo ACTIVO | 409 |
| API-049 | P0 | DELETE por no propietario | 403 |
| API-050 | P1 | listado sin estado | Solo ACTIVO |
| API-051 | P1 | estado=ACTIVO&estado=INACTIVO | Devuelve ambos |
| API-052 | P1 | página fuera de rango | 200 + items=[] |

---

# PARTE XII — ERROR CONTRACT

## 46. Shape uniforme

Para cada status controlado relevante se debe testear:

~~~json
{
  "code": "...",
  "message": "...",
  "details": [],
  "timestamp": "..."
}
~~~

Casos mínimos:

| ID | Prioridad | Caso | Esperado |
| --- | --- | --- | --- |
| ERR-001 | P0 | 400 de dominio | Shape uniforme |
| ERR-002 | P0 | 401 | Shape uniforme |
| ERR-003 | P0 | 403 | Shape uniforme |
| ERR-004 | P0 | 404 | Shape uniforme |
| ERR-005 | P0 | 409 | Shape uniforme |
| ERR-006 | P0 | RequestValidationError 422 | No devuelve payload nativo FastAPI |
| ERR-007 | P1 | 500 inesperado | No expone stack trace/SQL |
| ERR-008 | P0 | Error de password/token | details/log público no contiene secreto |

---

# PARTE XIII — CONCURRENCIA

## 47. Casos obligatorios

La concurrencia no debe simularse únicamente con llamadas secuenciales.

Para P0 deben existir tests con al menos dos transacciones/sesiones independientes.

| ID | Prioridad | Escenario | Invariante |
| --- | --- | --- | --- |
| CON-001 | P0 | Dos ediciones del mismo artículo con version N | No lost update |
| CON-002 | P0 | Dos aceptaciones de la misma invitación | Una sola aceptación |
| CON-003 | P0 | Dos invitaciones concurrentes mismo negocio+email | Máximo una PENDIENTE |
| CON-004 | P0 | Dos incorporaciones mismo Usuario+Negocio | Una única membresía histórica |
| CON-005 | P0 | Dos operaciones retiran propietarios simultáneamente | Siempre queda >=1 propietario ACTIVO |
| CON-006 | P0 | Nombre artículo duplicado concurrente | Una confirmación, una colisión |
| CON-007 | P0 | SKU duplicado concurrente | Una confirmación, una colisión |
| CON-008 | P0 | Categoria invalidada mientras se edita artículo | No confirma asociación inválida |

---

# PARTE XIV — FIXTURES Y FACTORIES

## 48. Fixtures recomendadas

Mantener fixtures pequeñas y composables.

Ejemplos:

~~~text
fixed_clock
usuario_factory
negocio_factory
membresia_factory
invitacion_factory
categoria_factory
articulo_factory
jwt_factory
db_session
client
~~~

Evitar una única fixture:

~~~text
full_system_with_everything()
~~~

que vuelva difícil saber qué necesita cada test.

---

## 49. Factories válidas por defecto

Las factories deben generar objetos válidos por defecto.

Un test modifica únicamente el aspecto que desea romper.

Ejemplo:

~~~python
articulo = articulo_factory(
    estado=EstadoArticulo.ACTIVO,
)
~~~

Para probar una configuración inválida, el test debe construirla explícitamente.

---

## 50. Fixtures multi-tenant

Debe existir una forma corta de crear:

~~~text
Negocio A
Usuario A con membresía A

Negocio B
Usuario B con membresía B
~~~

para que los tests de aislamiento no sean costosos de escribir.

---

# PARTE XV — ORGANIZACIÓN SUGERIDA DE TESTS

## 51. Árbol inicial

~~~text
tests/
├── unit/
│   ├── domain/
│   │   ├── organizacion/
│   │   └── catalogo/
│   └── application/
│       ├── organizacion/
│       └── catalogo/
│
├── integration/
│   ├── persistence/
│   │   ├── organizacion/
│   │   └── catalogo/
│   └── concurrency/
│
└── api/
    ├── auth/
    ├── organizacion/
    ├── invitaciones/
    └── catalogo/
~~~

No crear carpetas vacías preventivamente si todavía no existen tests para ellas.

---

## 52. Marcadores Pytest

Opcionalmente:

~~~python
@pytest.mark.integration
@pytest.mark.api
@pytest.mark.concurrency
~~~

Los unit tests no necesitan marker obligatorio.

Así CI puede ejecutar:

~~~text
suite rápida
suite integración
suite completa
~~~

sin depender de nombres frágiles.

---

# PARTE XVI — CI

## 53. Pipeline mínimo esperado

Conceptualmente:

~~~text
checkout
↓
instalar uv
↓
uv sync --frozen
↓
ruff
↓
unit tests
↓
levantar PostgreSQL service
↓
Alembic upgrade head
↓
integration/API tests
~~~

No utilizar una base PostgreSQL compartida manualmente entre ejecuciones de CI.

---

## 54. Fail fast y diagnóstico

Una prueba debe informar:

~~~text
qué regla falló
qué comportamiento se esperaba
~~~

Evitar asserts enormes sobre objetos completos cuando solo interesa una propiedad.

Preferir:

~~~python
assert response.status_code == 409
assert response.json()["code"] == "CONFLICTO_CONCURRENCIA"
~~~

sobre snapshots gigantes para todos los casos.

---

# PARTE XVII — QUÉ NO PROBAR

## 55. No duplicar librerías

No escribir tests para demostrar que:

- Pydantic sabe parsear un int;
- SQLAlchemy puede insertar una fila simple;
- FastAPI enruta un GET trivial.

Los tests deben proteger comportamiento propio del sistema.

---

## 56. No testear implementación privada

Evitar acoplar tests a:

- nombres de métodos privados;
- cantidad exacta de llamadas SQL salvo que sea objetivo;
- estructura interna de repositories;
- orden interno de validadores.

Testear resultados observables e invariantes.

---

## 57. No perseguir cobertura artificial

No se congela un porcentaje obligatorio de coverage en Bloque 1.

Se utilizará cobertura como señal para descubrir zonas no probadas, no como objetivo para crear tests sin valor.

Las invariantes P0 deben estar cubiertas aunque la cobertura total aparente sea alta.

---

# PARTE XVIII — SUITE MÍNIMA PARA MERGE

## 58. Gate obligatorio

Antes de considerar implementado el Bloque 1 deben pasar como mínimo:

~~~text
todos los tests P0 de Domain
+
todos los tests P0 de Application
+
todos los tests P0 de Persistence
+
todos los tests TEN P0
+
todos los tests CON P0
+
al menos 20 tests API P0
~~~

Además:

~~~text
0 tests skipped
~~~

en la suite obligatoria salvo skips explícitamente justificados por plataforma.

---

# PARTE XIX — TRAZABILIDAD

## 59. Reglas críticas → pruebas

| Regla | Pruebas mínimas |
| --- | --- |
| Último propietario | DOM-ORG-020/021, APP-ORG-023/024, DB-ORG-014, CON-005, API-017 |
| Membresía histórica única | DOM-ORG-003/004/005, APP-ORG-013/014/015, DB-ORG-005/017, CON-004 |
| Invitación segura | DOM-ORG-011/012/013, APP-ORG-013..022, DB-ORG-008..013, API-023..029 |
| Tenant isolation | TEN-001..010 + API-010/011/014 |
| Nombre/SKU únicos | APP-CAT-014/015, DB-CAT-005..009, CON-006/007 |
| TipoArticulo inmutable | DOM-CAT-015, API-042 |
| Edición atómica | DOM-CAT-017, APP-CAT-025, DB-CAT-028 |
| PATCH omitido/null | APP-CAT-019/020, DTO-011..017, API-041/043 |
| Imágenes 0..3 | DOM-CAT-028..035, DB-CAT-018..023, DTO-023..025 |
| Optimistic locking | DB-CAT-024..028, CON-001, API-019/035/044 |
| 404 cross-tenant | TEN-001..009, API-010/011/037 |
| Dinero Decimal | DTO-005..009, API-039/040 |

---

# PARTE XX — CRITERIO DE ACEPTACIÓN

## 60. Criterio de aceptación del documento

La estrategia de pruebas se considera suficientemente definida si:

1. cada invariante P0 posee al menos un test;
2. Domain puede probarse sin infraestructura;
3. Application puede probarse con puertos controlados;
4. persistencia utiliza PostgreSQL real;
5. no se utiliza SQLite para validar comportamiento PostgreSQL;
6. multi-tenancy posee casos positivos y negativos;
7. los constraints tenant-safe se prueban físicamente;
8. optimistic locking se prueba con conflicto real;
9. último propietario se prueba bajo concurrencia;
10. aceptación de invitación se prueba atómicamente;
11. edición de artículo se prueba todo-o-nada;
12. PATCH distingue omitido/null;
13. imágenes prueban invariantes en más de una capa;
14. errores HTTP prueban shape y código;
15. el mínimo académico de tests API queda ampliamente superado;
16. tests no dependen de orden;
17. clocks temporales son deterministas;
18. secretos no aparecen en asserts/logs de error;
19. cada test tiene un propósito funcional reconocible;
20. CI puede separar unit/integration/API sin modificar código.

---

## 61. Próximo documento

El siguiente artefacto es:

~~~text
pruebas/bloque-1-fundacion/escenarios-e2e.md
~~~

Allí se definirán recorridos completos de usuario y sistema, por ejemplo:

~~~text
registrarse
→ crear Negocio
→ invitar Usuario
→ aceptar
→ crear Categoria
→ crear Articulo
→ editar
→ desactivar
→ reactivar
~~~

y escenarios negativos multi-tenant/concurrencia que atraviesan varias capas.
