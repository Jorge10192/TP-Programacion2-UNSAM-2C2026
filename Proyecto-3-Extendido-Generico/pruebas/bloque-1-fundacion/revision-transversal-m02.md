# Revisión transversal M02 — Catálogo

> **Estado:** auditoría de conformidad previa a Persistencia.  
> **Alcance:** implementación Domain de M02 frente a modelo de dominio, modelo relacional, contrato API y matriz de pruebas/E2E.  
> **Naturaleza:** documento de revisión; no reemplaza ni modifica las especificaciones congeladas.

---

## 1. Fuentes de autoridad utilizadas

La revisión respeta la prioridad documental vigente:

1. `modulos/M02-Catalogo.md`;
2. `modelo-dominio/bloque-1-fundacion/01-modelo-dominio-bloque-1.md`;
3. `modelo-dominio/bloque-1-fundacion/03-m02-catalogo-clases.md`;
4. diagramas/estados específicos;
5. arquitectura/ADR;
6. `base-de-datos/bloque-1-fundacion/modelo-relacional.md`;
7. contrato/schemas API;
8. implementación.

Ante una diferencia, una decisión técnica de persistencia o transporte no se eleva automáticamente a regla conceptual de Domain.

---

## 2. Correcciones a referencias de apoyo

Durante la revisión se confirmaron estas decisiones canónicas:

- dinero persistido: `NUMERIC(19,4)`, no `NUMERIC(14,4)`;
- dinero Domain: `Decimal`; HTTP: string decimal con hasta cuatro decimales;
- unidades exactas: `UNIDAD, KG, G, L, ML, M, CM, HORA`;
- la política exacta de normalización/case de nombre y SKU permanece diferida;
- el valor visible de SKU no se fuerza a mayúsculas en Domain;
- SKU/descripcion blank se normalizan a `null` en la frontera/Application antes de Domain;
- tabla física: `articulo_imagen` (singular);
- edición Domain: `ArticuloCatalogo.aplicar_edicion(...)`;
- `TipoArticulo` y `EstadoArticulo` no pertenecen a la propuesta editable.

---

## 3. Matriz de alineación principal

| Concepto | Domain | PostgreSQL congelado | API congelada | Resultado |
| --- | --- | --- | --- | --- |
| TipoArticulo | `BIEN/SERVICIO` | texto + CHECK | enum Domain serializado como string | Alineado |
| EstadoArticulo | `ACTIVO/INACTIVO` | texto + CHECK | enum Domain | Alineado |
| EstadoCategoria | `ACTIVA/INACTIVA` | texto + CHECK | enum Domain | Alineado |
| UnidadMedida | 8 valores canónicos | CHECK con mismos 8 | enum Domain | Alineado |
| Dinero | `Decimal | None`, finito, >= 0 | `NUMERIC(19,4)` | string decimal ↔ Decimal | Alineado |
| UUID | UUIDv4 | UUID | UUID4 | Alineado |
| timestamps artículo/categoría | aware, UTC | TIMESTAMPTZ | UtcDatetime | Alineado |
| capacidades | VO embebido | columnas en articulo_catalogo | shape embebido | Alineado |
| imágenes | colección 0..3 del artículo | tabla hija | lista input/response | Alineado con separación técnica |
| version | token conservado por Domain | BIGINT, incremento persistente | Version >= 1 | Alineado por responsabilidad |

---

## 4. CapacidadesArticulo

Domain protege:

- vencimiento requiere stock;
- producción requiere stock;
- descuento requiere vendible;
- SERVICIO no controla stock;
- SERVICIO no controla vencimiento;
- SERVICIO no se usa en producción;
- no existe auto-fix.

PostgreSQL repetirá estas defensas mediante CHECK.

La regla de uso operativo mínimo NO pertenece al VO. Se aplica sobre `ArticuloCatalogo` únicamente cuando su estado es `ACTIVO`.

---

## 5. ArticuloCatalogo

La implementación Domain queda alineada con la especificación:

- creación nueva: ACTIVO, version 1;
- rehidratación: ACTIVO o INACTIVO;
- TipoArticulo inmutable;
- vendible requiere precio_base;
- precio/costo no negativos y Decimal estricto;
- ACTIVO requiere al menos un uso operativo;
- INACTIVO puede tener cero usos;
- edición ACTIVO mantiene ACTIVO;
- edición INACTIVO mantiene INACTIVO;
- edición compuesta valida antes de mutar;
- desactivar/reactivar son operaciones separadas;
- reactivar no acepta payload libre de edición;
- desactivar/reactivar conservan configuración.

Domain no consulta repositories para nombre, SKU, Categoria, permisos o tenant accesible.

---

## 6. Categoria

Domain protege únicamente invariantes locales y transiciones.

Application/Persistencia deben proteger:

- nombre funcionalmente único por Negocio incluyendo INACTIVAS;
- nueva asociación/reasignación solo a Categoria ACTIVA;
- Categoria y Articulo del mismo Negocio;
- guardias de hard delete;
- concurrencia al asociar mientras otra transacción desactiva la Categoria.

Una Categoria históricamente asociada que luego queda INACTIVA no rompe por sí sola el artículo ni bloquea su reactivación.

---

## 7. SKU y nombres

La representación visible no se usa como única defensa de unicidad.

Persistencia deberá almacenar claves normalizadas explícitas:

- `categoria.nombre_normalizado`;
- `articulo_catalogo.nombre_normalizado`;
- `articulo_catalogo.sku_normalizado`.

Las unicidades incluyen entidades INACTIVAS.

La política exacta de normalización sigue diferida y deberá centralizarse; no se debe inventar `upper()`, `lower()`, `casefold()` o reglas Unicode distintas por capa.

---

## 8. Imágenes

### Domain

`ArticuloImagen` funciona como hijo estructural inmutable con:

- id UUIDv4;
- negocio_id;
- articulo_id;
- referencia_storage opaca y no blank;
- posicion 1..3;
- es_principal bool.

`ArticuloCatalogo` protege:

- 0..3 imágenes;
- posiciones únicas;
- exactamente una principal cuando N > 0;
- pertenencia al mismo artículo;
- pertenencia al mismo Negocio;
- reemplazo completo atómico;
- imágenes incluidas en la atomicidad de `PropuestaEdicionPreparada`.

### Separación técnica corregida en 3F

`created_at` de `articulo_imagen` es timestamp técnico de persistencia/response y se mantiene fuera de Domain.

El response HTTP puede obtenerlo desde ORM/read model.

### Persistencia posterior

Etapa 4 debe implementar:

- FK compuesta tenant-safe `(articulo_id, negocio_id) -> articulo_catalogo(id, negocio_id)`;
- `CHECK posicion BETWEEN 1 AND 3`;
- `UNIQUE(articulo_id, posicion) DEFERRABLE INITIALLY DEFERRED`;
- índice parcial de máximo una principal;
- cambio seguro de principal evitando depender del orden accidental de flush;
- cambios de imágenes compitiendo sobre `articulo_catalogo.version`.

---

## 9. PATCH y PropuestaEdicionPreparada

HTTP/Application debe distinguir:

`omitido != null explícito`.

Application combina:

- estado actual;
- campos efectivamente presentes;
- normalización de frontera;
- Categoria resuelta;
- nuevas imágenes preparadas;

y construye una `PropuestaEdicionPreparada` con el estado editable final completo.

La propuesta contiene imágenes de manera obligatoria para impedir que una omisión accidental borre la colección.

No contiene:

- id;
- negocio_id;
- TipoArticulo;
- EstadoArticulo;
- version.

`ArticuloCatalogo.aplicar_edicion()` confirma TODO o NADA.

---

## 10. Responsabilidades por capa

### Domain

- invariantes locales;
- capacidades;
- ciclo de vida;
- atomicidad del estado candidato;
- colección lógica de imágenes.

### API/Pydantic

- shape JSON;
- extra forbid;
- enums/UUID;
- Decimal HTTP;
- omitido vs null;
- prevalidación de imágenes;
- límites de transporte definidos.

### Application

- actor/autorización;
- tenant;
- normalización compartida;
- unicidad precheck;
- Categoria ACTIVA/mismo tenant para nueva asociación;
- construcción de propuesta preparada;
- transacción;
- auditoría;
- clock;
- coordinación con storage.

### PostgreSQL

- FK;
- tenant-safe composite FK;
- UNIQUE;
- CHECK;
- índices parciales;
- optimistic locking;
- defensa final concurrente.

---

## 11. Concurrencia que Etapa 4/5 debe conservar

- nombre y SKU: precheck no reemplaza UNIQUE;
- Categoria asociada: evitar TOCTOU con protección transaccional;
- artículo: updates condicionados por version;
- imágenes: editar colección debe tocar/incrementar version del padre;
- cambio de principal: estrategia segura en dos pasos/flush;
- cross-tenant: todas las consultas/referencias scoping por negocio_id.

---

## 12. E2E trazado

La especificación E2E ya cubre los riesgos relevantes de M02:

- E2E-004 ciclo completo de Catálogo;
- E2E-005 aislamiento cross-tenant;
- E2E-007 version obsoleta/lost update;
- E2E-008 PATCH omitido/null;
- E2E-011 Categoria histórica INACTIVA.

E2E-004 incluye creación con Decimal e imágenes, edición de descripción/precio/imágenes, desactivación, edición INACTIVA, reactivación y hard delete estructural.

---

## 13. Gate de cierre de Etapa 3

Antes de declarar 3F cerrada localmente:

~~~powershell
git pull
uv run pytest
uv run ruff check .
git status
~~~

La suite incluye además una guardia arquitectónica que comprueba que `domain/catalog` no importe FastAPI, Pydantic, SQLAlchemy, Uvicorn ni capas externas de la aplicación.

Resultado requerido:

- tests 100% verdes;
- Ruff verde;
- rama sincronizada;
- working tree limpio.

---

## 14. Conclusión

Tras las correcciones de 3F, no quedan contradicciones funcionales conocidas entre:

`Domain M02 ↔ modelo relacional ↔ contrato API ↔ pruebas/E2E`.

La siguiente etapa puede implementar SQLAlchemy/Alembic sin rediseñar el dominio, siempre que respete las responsabilidades y notas de persistencia documentadas arriba.
