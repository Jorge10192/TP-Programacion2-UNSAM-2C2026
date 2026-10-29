# ADR-001 — SQLAlchemy síncrono para Bloque 1

- **Estado:** Aceptado
- **Fecha:** 2026-10-29
- **Alcance:** Bloque 1 — M01 Organización + M02 Catálogo

## Contexto

La arquitectura separa Domain, Application, Infrastructure y API. La persistencia relacional
debe soportar transacciones atómicas, optimistic locking, locks explícitos cuando correspondan,
migraciones Alembic y tests de integración contra PostgreSQL real.

La documentación previa dejó abierta la elección entre SQLAlchemy síncrono y asíncrono.

Para Bloque 1 no existe un requerimiento de carga o concurrencia I/O que justifique introducir
`AsyncEngine`, `AsyncSession` y propagación de event loop en toda la capa de persistencia.

Además, SQLAlchemy `Session` ya aporta el comportamiento transaccional necesario para actuar
como Unit of Work técnico inicial. No se introduce un `CustomUnitOfWork` preventivo.

## Decisión

Bloque 1 utilizará:

```text
SQLAlchemy 2.x
+
psycopg 3
+
postgresql+psycopg://
+
Engine síncrono
+
Session / sessionmaker
+
Alembic síncrono
```

La sesión no realizará `commit` implícito al cerrarse. Los límites transaccionales se
coordinarán explícitamente en Infrastructure/Composition Root y, si los primeros casos de uso
demuestran valor real, podrá introducirse posteriormente un port de Unit of Work.

## Motivos

1. **Simplicidad transaccional.** `Session` soporta flush, commit, rollback, optimistic locking
   y row locks sin una segunda API asíncrona.
2. **Menor complejidad de testing.** Las fixtures de PostgreSQL, transacciones y Alembic no
   necesitan event loops ni adaptadores async.
3. **Alembic directo.** Las migraciones utilizan conexiones síncronas sin `run_sync`.
4. **Adecuación al MVP.** No existe evidencia de que la capa DB del Bloque 1 sea un cuello de
   botella que requiera async.
5. **Dominio protegido.** La elección es un detalle de Infrastructure y no modifica Domain.

## Consecuencias

### Positivas

- menos superficie de error;
- debugging y trazas más simples;
- fixtures más pequeñas;
- transacciones más fáciles de razonar;
- menor costo académico sin sacrificar integridad.

### Restricciones

Una operación SQLAlchemy síncrona es bloqueante.

Por lo tanto, cuando la API utilice esta persistencia:

- no se ejecutará una `Session` síncrona directamente dentro del event loop de un
  `async def`;
- los flujos HTTP de DB podrán implementarse como funciones síncronas para que FastAPI los
  ejecute en su threadpool;
- si un flujo asíncrono necesita invocar trabajo bloqueante, deberá aislarlo explícitamente en
  un worker thread compatible;
- no se mezclará sync/async accidentalmente.

## Alternativas descartadas por ahora

### AsyncEngine + AsyncSession

Es técnicamente válida, pero añade complejidad sin un requerimiento actual que la compense.

### Custom Unit of Work

Se difiere. SQLAlchemy Session ya proporciona el comportamiento técnico necesario. Solo se
agregará una abstracción adicional si los casos de uso reales muestran que reduce acoplamiento o
hace más claro el límite transaccional.

## Revisión futura

Si un bloque posterior demuestra una necesidad concreta de I/O altamente concurrente y el
modelo síncrono se vuelve un límite medible, se evaluará una migración bajo un nuevo ADR.

Tal cambio no deberá alterar las entidades de Domain.
