---
tipo_documento: "ENTREGA_PARA_REVISION"
proyecto: "Asistente PyME — Programación 2, UNSAM"
bloque: "E2-3"
nombre: "Catálogo multiempresa: persistencia, API, estado e integridad"
version: "1.0"
fecha_corte: "2026-11-08"
repositorio: "Jorge10192/TP-Programacion2-UNSAM-2C2026"
carpeta_exclusiva: "plataforma-pyme/"
rama_origen: "main"
rama_revision: "review/e2-3-catalogo"
commit_fin_e2_2: "af47a65bd2c04576cb3cb4b526188591585212f6"
commit_codigo_e2_3_d_validado_ci: "bf4fd3fa809c9f4e6afdeb064a155acf233b1722"
commit_previo_a_esta_hoja: "b409a45e5a4db36245753543f7cb177ba038da2f"
base_rama_revision: "SHA_COMPLETO_DEL_COMMIT_QUE_PUBLICA_ESTA_HOJA"
informe_revisor: "plataforma-pyme/docs/revisiones/E2-3_INFORME_DE_REVISION.md"
estado: "CERRADO_FUNCIONALMENTE_PARA_REVISION_INDEPENDIENTE"
fusion_permitida_al_revisor: false
---

# E2-3 — Hoja de entrega para auditoría independiente del Catálogo

**Destinatario:** compañero revisor y la IA con la que realice la auditoría. Este archivo describe el **código efectivamente entregado** y las decisiones de alcance, NO sustituye la revisión ni asegura ausencia de defectos. El resultado debe ser un segundo Markdown, `E2-3_INFORME_DE_REVISION.md`, versionado en `review/e2-3-catalogo`, y un Pull Request contra `main` **sin fusionar**.

> **Regla principal:** examinar E2-3 a fondo, documentar fallos demostrados y corregir **únicamente** los problemas necesarios dentro de la lista blanca. La revisión NO autoriza a reestructurar E2-0/E2-1/E2-2, resolver auditorías ajenas, tocar frontend, crear proveedores/compras/stock/ventas, ni iniciar una refactorización general. El responsable conserva la decisión de ACEPTAR, RECHAZAR, AJUSTAR o DIFERIR cada modificación por separado.

## 1. Repositorio, SHAs y fuentes obligatorias

**Repositorio:** https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026  
**Carpeta exclusiva:** `plataforma-pyme/`  
**Rama de trabajo del responsable:** `main`  
**Rama que creará el revisor en un clon o worktree separado:** `review/e2-3-catalogo`.

- **Cierre E2-2:** `af47a65bd2c04576cb3cb4b526188591585212f6`. Sirve de referencia histórica para identificar el comienzo del nuevo Catálogo; puede incluir la hoja de revisión E2-2.
- **Último SHA de CÓDIGO E2-3 aprobado en CI:** `bf4fd3fa809c9f4e6afdeb064a155acf233b1722`.
- **SHA de código + UML 03A + documentación de E2-3 E previo a esta hoja:** `b409a45e5a4db36245753543f7cb177ba038da2f`.
- **SHA FIJO de la rama de revisión:** el SHA completo **del commit que publica esta misma hoja**. Es imposible incrustar su propio hash exacto dentro del archivo sin cambiarlo; el responsable lo comunicará junto al enlace. Contrastar mediante `git show`, `git rev-parse HEAD` y existencia de este archivo **antes de comenzar**.
- **No partir del `main` más reciente** si avanzó luego de la entrega; tampoco sincronizar por rebase/merge durante la revisión sin autorización.

**Orden de lectura y precedencia:**

1. Esta hoja y [guía maestra de revisión E2](GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md).
2. [01 Requerimientos](../../entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md) RF-04; [02 Casos de uso](../../entrega-programacion-2/02_CASOS_DE_USO.md) CU-05; [03 Dominio/UML](../../entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md); [04 Arquitectura](../../entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md); [05 Matriz API](../../entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md).
3. [UML 03A PlantUML v0.7](../../entrega-programacion-2/diagramas/03A_CLASES_IDENTIDAD_Y_CATALOGO.puml), [guía 03A](../../entrega-programacion-2/diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md), [SVG editorial](../../entrega-programacion-2/diagramas/03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg).
4. [Matriz E2-3 D de integridad y límites](../E2-3_D_INTEGRIDAD_CATALOGO.md), [README backend](../../backend/README.md) y código real en `backend/app/modules/catalog/`, `models/catalog_item.py`, migración y tests.
5. Los documentos E2-1/E2-2 **solo para compatibilidad**, nunca como autorización para editarlos. 03B/03C también son solo lectura.

## 2. Resultado real y límites de cada corte

| Corte | Resultado implementado | Última prueba local aportada |
|---|---|---|
| **E2-3 A** | ORM `CatalogItem`, tabla `catalog_items`, restricciones de tenant, nombre, SKU, unidades, precios; migración aditiva `e23a_catalog` | 407 passed |
| **E2-3 B** | Cuatro rutas: POST/GET colección y GET/PATCH detalle; normalización, RBAC, tenant, paginación | 498 passed |
| **E2-3 C** | Quinta ruta PATCH `/status` (ACTIVO/INACTIVO), idempotencia y no borrado | 527 passed |
| **E2-3 D** | Regresión de Unicode, nulabilidad, tipo/unidad, aislamiento de dos empresas, rollback tras flush y límite BIGINT de offset | **580 passed in 66.45s** |
| **E2-3 E** | Actualización Documentos 01–05, README, modelo PUML 03A v0.7, guía y SVG editorial, hoja independiente para auditoría | **Sin cambios de código/test**; no se declara un nuevo CI |

**Estado:** el Catálogo **está implementado y validado localmente para su alcance**. No se ha implementado aún Proveedor ni operaciones de compras, stock, ventas o frontend conectado a FastAPI. No inferir de esta tabla un TP final completo ni una puesta en producción.

### 2.1. Modelo, cardinalidad y restricciones reales

- Cada `CatalogItem` pertenece a una sola `Business` mediante `business_id` y FK `RESTRICT`. Una empresa puede iniciar con **cero artículos**. Existe UNIQUE adicional `(business_id,id)` para facilitar FK comerciales compuestas futuras.
- `kind` representa **ELABORADO, REVENTA, INSUMO, SERVICIO**. El `item_type` BIEN/SERVICIO de la API es **derivado de `kind`**, NO una columna o segundo discriminador mutable.
- `unit` admite `UNIDAD, GRAMO, KILOGRAMO, MILILITRO, LITRO, PAQUETE, CAJA, SERVICIO`. Clase SERVICIO exige unidad SERVICIO y viceversa. No inventar unidades sin acuerdo de producto.
- `name` y `name_key` (canónica mediante NFKC, colapso de espacios y `casefold`), hasta 90 caracteres efectivos. UNIQUE `(business_id,name_key)` incluye fichas INACTIVO.
- `sku` opcional/NULL, máximo 32 caracteres ASCII `[A-Z0-9._-]` tras NFKC/mayúsculas; UNIQUE parcial `(business_id,sku) WHERE sku IS NOT NULL`. Varios artículos sin SKU son válidos; SKU no nulo es único en la empresa **incluso si está INACTIVO**. Otra empresa puede reutilizarlo.
- `category` texto no vacío, valor inicial `General`; `description` y `observations` guardados por ficha. `sellable` es Boolean independiente de `status`.
- `price_cents` y `reference_cost_cents` son BIGINT **opcionales**, entre 0 y 99.999.999.999 centavos, **sin Float**. Precio cero es válido, precio NULL significa no informado; el futuro comando comercial será responsable de exigir un importe apropiado.
- `status` ACTIVO/INACTIVO, con desactivación/reactivación reversible y **sin DELETE físico**. Estado repetido por la ruta dedicada no actualiza `updated_at`. El catálogo de consulta incluye fichas inactivas; desactivar NO libera nombre ni SKU.
- `created_at`, `updated_at` persisten fechas. Registrar fichas **no crea stock**, ubicación, compra, venta, saldo, asiento ni movimiento.

**Atención:** la comprobación canónica de nombres y SKU ocurre en el DTO/servicio; PostgreSQL protege las claves almacenadas mediante índices. No afirmar que SQL normaliza automáticamente todas las entradas directas. Revisar que la lógica resuelva conflictos de concurrencia mediante excepciones SQL y rollback.

### 2.2. Las CINCO rutas HTTP reales

Prefijo exacto `/api/v1/businesses/{business_id}`. Todas revalidan sesión, usuario y membresía empresarial.

| Método | Ruta | Efecto | Éxito |
|---|---|---|---|
| GET | `/catalog` | Lista ordenada por `name_key,id`, activas e inactivas, offset >= 0, limit 1..500 | 200 |
| POST | `/catalog` | Crea una ficha ACTIVO sin stock | 201 |
| GET | `/catalog/{item_id}` | Consulta una ficha del tenant | 200 |
| PATCH | `/catalog/{item_id}` | Edita atributos permitidos, NO estado ni tenant | 200 |
| PATCH | `/catalog/{item_id}/status` | Solo `ACTIVO`/`INACTIVO`, reversible, idempotente | 200 |

**RBAC:** miembros ACTIVA con permiso empresarial de lectura pueden GET. Para POST/PATCH, **solo TITULAR_ADMINISTRATIVO y ADMINISTRADOR**, con Empresa ACTIVA y sesión válida. Empresa SUSPENDIDA admite consultas autorizadas pero no modificaciones.

**Errores:** 401 token/sesión inválidos; 403 falta de permiso del rol; 404 empresa, membresía o artículo fuera del tenant/inexistente; 409 nombre/SKU duplicado o empresa suspendida en escritura; 422 payload, unidad, tipo, campos protegidos o paginación inválidos. Revisar **cada ruta**: no asumir mismo listado de errores en todos los casos. Atributos `business_id,id,name_key,status,created_at,updated_at` no deben poder suplantarse mediante POST/PATCH genérico. `status` solo por ruta dedicada. Valores `null` del PATCH de campos opcionales se distinguen de campo omitido.

### 2.3. Reglas y diferencias deliberadas

1. Plataforma generalista multiempresa/multirrubro. WALOS es **solo un caso cliente de ejemplo**.
2. La empresa nace con **cero artículos**; no se crea ficha, almacén o inventario por defecto.
3. `BIEN/SERVICIO` derivado de `kind`; impedir duplicación innecesaria de estado conceptual en SQL.
4. Los cuatro tipos de artículo son las categorías `kind` de la DEMO, **no** la columna libre `category`; son conceptos diferentes.
5. El catálogo contiene tanto bienes físicos como servicios, pero **no autoriza ni contabiliza venta o producción**.
6. Precio y costo de referencia son opcionales y enteros en centavos; no requieren ser mayores que cero.
7. Nombre canónico y SKU permanecen reservados mientras una ficha está INACTIVO. Solo edición explícita y válida del nombre/SKU puede liberar la clave previa, no la desactivación.
8. La ruta `PATCH /status` no elimina fichas y no cambia `sellable` ni otros atributos de negocio.
9. `PATCH` parcial puede cambiar `kind` y `unit` conjuntamente si la combinación final es válida **porque no existe todavía historial comercial**. La protección contra cambios incompatibles con operaciones previas es obligación de los futuros módulos comerciales; no inventar un bloqueo basado en historia inexistente.
10. El límite de paginación `offset` es el máximo BIGINT PostgreSQL `9_223_372_036_854_775_807` para impedir error 500 con enteros arbitrarios. No modificar el contrato sin prueba de compatibilidad.
11. La fuente PlantUML 03A incluye correspondencia real completa; el SVG es **lámina editorial resumida**: puede omitir atributos y asociaciones mostrados en la guía. `Proveedor` continúa conceptual/TO-BE.
12. Los commits D agregan tests y una corrección de límite offset, **no** nueva migración. La migración `e23a_catalog` aplicada forma parte del historial, y no se reescribe durante revisión.

## 3. Alcance EXCLUIDO y dependencias para otros bloques

- **E2-4 Proveedores, Compras y Recepción:** no existen sus rutas backend todavía. Usarán artículos del mismo tenant y una ubicación compatible para recibir.
- **E2-5 Inventario:** saldos por ubicación, lotes, transferencias, movimientos, inventario inicial real y control de capacidad `can_store`.
- **E2-6 Ventas y pagos declarados:** línea de venta, precio explícito si no hay precio de lista, estado ACTIVO y `sellable`, uso de `can_sell` y permisos operativos por sede, historial/snapshots, concurrencia comercial.
- **E2-7 Frontend conectado / E2E:** React DEMO es independiente; no confundir sus pantallas con rutas FastAPI integradas.
- Versionado de precios/historial fiscal, variantes complejas, fotos comerciales persistentes, QR de cobro Mercado Pago, roles nuevos, etiquetas ilimitadas, geolocalización, notificaciones y despliegue público.
- Modificar registro, invitaciones, titularidad, membresías, roles empresariales E2-1; ubicaciones/asignaciones E2-2; UML 03B/03C.
- Ensayo de carga y prueba específica de dos INSERT simultáneos sobre el mismo SKU/nombre **NO se realizaron**. Los índices PostgreSQL son defensa SQL, pero los tests de colisión fueron secuenciales; documentar el límite y sugerir una prueba independiente.

**Una dependencia fuera de alcance debe informarse como riesgo o requisito futuro, no implementarse durante la auditoría sin permiso.**

## 4. Archivos reales que revisar (todos dentro de plataforma-pyme)

**Persistencia y esquema:**

- `backend/app/infrastructure/models/catalog_item.py` — campos SQL, CHECK, UNIQUE por empresa, FK.
- `backend/alembic/versions/20261108_0011_catalog_items.py` — migración `e23a_catalog`, aditiva; **SOLO LECTURA, NO modificar migraciones aplicadas**.
- `backend/app/infrastructure/models/__init__.py` — registro del modelo en metadatos, solo lectura.
- `backend/tests/test_postgres_integration.py` — head de Alembic, solo lectura.

**API:**

- `backend/app/modules/catalog/schemas.py` — DTO de creación, edición, status, canonicalización y límites.
- `backend/app/modules/catalog/service.py` — sesiones, membresías, rol, transacciones, 409, actualización.
- `backend/app/modules/catalog/repository.py` — queries por `business_id`, orden y bloqueo.
- `backend/app/modules/catalog/router.py` — cinco contratos HTTP, códigos y paginación.
- `backend/app/modules/catalog/__init__.py`, registro de rutas en `backend/app/api/v1/router.py` (último, SOLO LECTURA salvo permiso previo).

**Pruebas:** `backend/tests/test_catalog_item_model.py`, `test_catalog_item_integration.py`, `test_catalog_schemas.py`, `test_catalog_http.py`, `test_catalog_api_integration.py`, `test_catalog_hardening_schemas.py`. Puede haber más archivos `test_catalog*.py` dentro del mismo scope; verificarlos por listado, no inferirlos.

**Documentación:** 01–05, guía técnica E2-3 D, UML 03A PUML/guía/SVG e índice. Comparar AS-IMPLEMENTED y requisitos TO-BE sin corregir históricos retroactivamente si están rotulados como tales.

## 5. LISTA BLANCA de edición del revisor (restricción vinculante)

Las rutas permitidas solo se modifican si existe hallazgo y solución proporcional. **Por defecto, todo archivo no expresamente autorizado es SOLO LECTURA.**

~~~yaml
rutas_permitidas_sin_autorizacion_adicional_para_correcciones_demostradas:
  - "plataforma-pyme/backend/app/modules/catalog/**"
  - "plataforma-pyme/backend/app/infrastructure/models/catalog_item.py"
  - "plataforma-pyme/backend/tests/test_catalog*.py"
  - "plataforma-pyme/docs/revisiones/E2-3_INFORME_DE_REVISION.md"
  - "plataforma-pyme/docs/E2-3_D_INTEGRIDAD_CATALOGO.md"
  - "plataforma-pyme/backend/README.md" # Solo secciones E2-3
  - "plataforma-pyme/entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md" # Solo RF-04/E2-3
  - "plataforma-pyme/entrega-programacion-2/02_CASOS_DE_USO.md" # Solo CU-05/E2-3
  - "plataforma-pyme/entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md" # Solo Catálogo E2-3
  - "plataforma-pyme/entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md" # Solo E2-3
  - "plataforma-pyme/entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md" # Solo E2-3
  - "plataforma-pyme/entrega-programacion-2/README.md" # Solo índice E2-3
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_CLASES_IDENTIDAD_Y_CATALOGO.puml" # Solo ArticuloCatalogo y nota relacionada
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md" # Solo E2-3
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg" # Solo corrección factual de Catálogo
  - "plataforma-pyme/entrega-programacion-2/diagramas/README.md" # Solo estado/entrada E2-3

rutas_excepcionales_solo_con_aprobacion_previa:
  - "plataforma-pyme/backend/app/infrastructure/models/__init__.py" # Registro, si indispensable
  - "plataforma-pyme/backend/app/api/v1/router.py" # Registro, no alterar módulos ajenos
  - "plataforma-pyme/backend/tests/test_postgres_integration.py" # Solo por NUEVO head autorizado
  - "plataforma-pyme/backend/alembic/versions/**" # Solo NUEVA migración aditiva con aprobación; nunca editar 0011 ni migraciones E2-1/E2-2
rutas_prohibidas_o_solo_lectura:
  - "plataforma-pyme/backend/app/modules/auth/**"
  - "plataforma-pyme/backend/app/modules/businesses/**"
  - "plataforma-pyme/backend/app/modules/locations/**"
  - "plataforma-pyme/backend/app/infrastructure/models/user.py"
  - "plataforma-pyme/backend/app/infrastructure/models/business.py"
  - "plataforma-pyme/backend/app/infrastructure/models/membership.py"
  - "plataforma-pyme/backend/app/infrastructure/models/location.py"
  - "plataforma-pyme/backend/app/infrastructure/models/location_assignment.py"
  - "plataforma-pyme/backend/app/infrastructure/db.py"
  - "plataforma-pyme/backend/app/infrastructure/config.py"
  - "plataforma-pyme/backend/app/main.py"
  - "plataforma-pyme/backend/alembic/env.py"
  - "plataforma-pyme/backend/alembic/versions/20261108_0011_catalog_items.py"
  - "plataforma-pyme/frontend/**"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03B*"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03C*"
  - "plataforma-pyme/docs/revisiones/E2-1_*"
  - "plataforma-pyme/docs/revisiones/E2-2_*"
  - "plataforma-pyme/docs/revisiones/GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md"
  - "plataforma-pyme/docs/revisiones/E2-3_ENTREGA_PARA_REVISION.md"
  - "plataforma-pyme/compose.yaml"
  - ".github/workflows/**"
  - "cualquier otra ruta no autorizada"
regla_general: "Revisar solo archivos de E2-3; si una corrección requiere otro archivo, elevar propuesta y esperar aprobación."
~~~

**Regla estricta sobre migraciones:** `20261108_0011_catalog_items.py` ya se aplicó en PostgreSQL local; jamás modificarla retroactivamente. Para una vulnerabilidad que exija nuevo CHECK, índice o columna, proponer **nueva** migración aditiva con compatibilidad, riesgo y pruebas. Esperar aprobación antes de escribirla.

## 6. Evidencia previa disponible; el revisor debe reproducir lo que pueda

| Control | Resultado aportado | Clasificación |
|---|---|---|
| Git | SHA de código D `bf4fd3fa...`, SHA de cierre E previo a hoja `b409a45...` | Corte autor |
| Pytest Windows | **580 passed in 66.45s** | `REPORTADO_POR_AUTOR` |
| Alembic Windows | `e23a_catalog (head)`, `No new upgrade operations detected.` | `REPORTADO_POR_AUTOR` |
| Docker Windows | API y PostgreSQL `healthy` | `REPORTADO_POR_AUTOR` |
| Readiness Windows | `/ready` devuelve `ready / ok` | `REPORTADO_POR_AUTOR` |
| CI D (Python 3.12) | 580 passed, PostgreSQL 16, sin deriva de esquema | [CI 42508771222](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42508771222), `CI_PASS_VERIFICADO` |
| CI D (Python 3.14) | 580 passed, PostgreSQL 16, sin deriva de esquema | Mismo run/SHA |
| CI D Docker | Imagen y comprobación de liveness | Mismo run/SHA, aprobado |

**Importante:** el revisor no debe marcar `EJECUTADO_PASS` sobre pruebas que solo ejecutó el responsable u otro runner. Si corre tests en su ambiente, reportar **su propio SHA, comando, fecha, resultado, PostgreSQL y configuración**. Los commits E son documentales y no aportan pruebas de concurrencia, producción ni cargas.

## 7. Procedimiento de Git y revisión — SIN MERGE

### A. Confirmar acceso, fijar SHA y crear la rama independiente

Usar otro clon o worktree aislado. No modificar el árbol de trabajo habitual del responsable ni sus archivos locales sin seguimiento. Antes de continuar, confirmar acceso real a `plataforma-pyme/`, Documentos 01–05, 03A, código Catalog y tests. Si el acceso es incompleto, detallar exactamente cuáles faltan.

~~~powershell
git clone https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026.git
cd TP-Programacion2-UNSAM-2C2026
git fetch origin
git status --short

# Usar el SHA de publicación comunicado por el responsable.
$SHA_CORTE = "SHA_DE_PUBLICACION_DE_ESTA_HOJA"
git show --no-patch --format="%H %s" $SHA_CORTE
git cat-file -e "$SHA_CORTE^{commit}"

git switch -c review/e2-3-catalogo $SHA_CORTE
git branch --show-current
git rev-parse HEAD
~~~

Si `review/e2-3-catalogo` ya existe, NO sobrescribirla ni usar `reset --hard` o `push --force`. Coordinar con el equipo.

### B. Revisar con evidencia y priorizar

1. Inspeccionar RF-04/CU-05, esquemas, migración, servicios, repositorios, router, tests, UML 03A y README de **este mismo SHA**.
2. Comparar desde el cierre E2-2 `af47a65...` hasta el corte, filtrando **solo cambios E2-3**. No asumir que todos los archivos de un diff histórico son editables.
3. Construir matriz requisito → DTO → API → Servicio → Repositorio → SQL → pruebas, diferenciando implementado, parcial y futuro.
4. Buscar bugs P0/P1/P2/P3 reproducibles con condición de entrada, respuesta real, impacto y evidencia de código/línea.
5. Revisar especialmente SQL tenant-safe, roles, revocación de sesión, Unicode, colisiones y error mapping, idempotencia de estado, carrera simultánea real si el entorno lo permite, errores 500, rollback, esquema y SVG.
6. Distinguir una mejora de producto fuera de alcance de una falla real. No cambiar diseño deliberado sin autorización.

### C. Corregir en commits separados y acotados

Un hallazgo debe mapear a `REV-E2-3-###`; su corrección, a `MOD-E2-3-###`. Preferir **un hallazgo/un cambio lógico/un commit**. Cada bug reproducible corregido debe acompañarse de test de regresión que falle antes y pase después. No inflar la auditoría con reformatos o refactors generales.

Si la corrección exige archivo fuera de la lista blanca o migración nueva, **detener esa modificación**, registrar evidencia y solicitar autorización previa, con impacto sobre historia de datos y rollback. Una limitación que no puede corregirse sin tocar E2-1/E2-2 debe quedar como hallazgo abierto, no provocar un cambio transversal unilateral.

### D. Validar con entorno propio seguro

Desde `plataforma-pyme/backend/`, únicamente sobre una base PostgreSQL de desarrollo conocida:

~~~powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
~~~

Desde `plataforma-pyme/`:

~~~powershell
docker compose --profile api up -d --build --wait api
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/ready
~~~

**No ejecutar** migraciones sobre bases compartidas o productivas, ni `downgrade`, `stamp`, `docker compose down -v`, limpieza SQL o `git reset --hard` como atajos. Si no posee PostgreSQL/entorno, consignar `OMITIDO_SIN_ENTORNO` en lugar de inventar resultados. Verificar el **CI del PR**, sobre su propio SHA, no únicamente el run histórico.

Estados permitidos: `EJECUTADO_PASS`, `EJECUTADO_FAIL`, `OMITIDO_SIN_ENTORNO`, `NO_EJECUTADO`, `CI_PENDIENTE`, `CI_PASS_VERIFICADO`, `CI_FAIL_VERIFICADO`.

### E. Publicar informe y PR, NO fusionar

~~~powershell
git status --short
git diff --check
git diff --stat
# Agregar explícitamente solo archivos permitidos. Ejemplo:
git add plataforma-pyme/docs/revisiones/E2-3_INFORME_DE_REVISION.md
git commit -m "docs(review): informe de auditoria E2-3"
git push -u origin review/e2-3-catalogo
~~~

Si hubo correcciones de código, agregarlas individualmente en sus commits previos. **No usar `git add -A` indiscriminado**. Abrir PR con **base `main` ← head `review/e2-3-catalogo`**, preferiblemente Draft mientras se revisa. **El revisor NO fusiona nada**, ni integra PRs E2-1/E2-2.

Si `main` avanza durante la revisión, mantener SHA original. No hacer `git rebase origin/main` ni `git merge origin/main` sin permiso. Registrar diferencias y, si corresponde, `CONFLICTO_CON_MAIN`. El responsable decidirá cherry-pick o integración selectiva.

## 8. Segundo documento obligatorio del revisor: INFORME E2-3

Ruta fija: **`plataforma-pyme/docs/revisiones/E2-3_INFORME_DE_REVISION.md`**. Debe estar en el PR aunque no se proponga ninguna corrección. Encabezado YAML parseable:

~~~yaml
---
tipo_documento: "INFORME_DE_REVISION"
bloque: "E2-3"
rama: "review/e2-3-catalogo"
sha_base_recibido: null
sha_final_rama: null
sha_main_al_abrir_pr: null
estado_recomendado: null # APTO | APTO_CON_OBSERVACIONES | REQUIERE_CORRECCIONES | BLOQUEADO
resumen_hallazgos:
  P0_bloqueantes: null
  P1_altos: null
  P2_medios: null
  P3_bajos: null
hallazgos_corregidos: null
hallazgos_pendientes: null
requiere_decision_humana: null
conflicto_con_main: null
cumplio_lista_blanca: null
pruebas_regresion: null
ci_del_pr: null
---
~~~

**Contenido obligatorio:** resumen ejecutivo; acceso real y SHA; lectura de requisitos; matriz de trazabilidad; metodología de pruebas, SQL/RBAC, canonicalización y concurrencia; hallazgos `REV-E2-3-###` con pruebas; modificaciones `MOD-E2-3-###` con commits y efectos; pendientes y decisiones humanas; impacto sobre E2-1/E2-2 y datos existentes; coherencia Documentos 01–05/UML 03A; tabla de ejecución de tests con SHA/fecha/comando/estado y límites; lista blanca verificada; estado de CI del PR; URL del PR y declaración **NO MERGE**.

### 8.1. Matriz OBLIGATORIA de decisión selectiva

| ID cambio | Hallazgo | Commit SHA | Archivos | Prioridad | Antes / después | Test nuevo y CI PR | Impacto y compatibilidad | Dependencias | Recomendación revisor | Decisión equipo |
|---|---|---|---|---|---|---|---|---|---|---|
| MOD-E2-3-001 | REV-E2-3-001 | SHA real | archivos reales | P0/P1/P2/P3 | evidencia | comando/resultado | E2-1/E2-2/datos/API | otros MOD o ninguna | ACEPTAR / RECHAZAR / AJUSTAR / DIFERIR | **PENDIENTE** |

El revisor nunca completa la columna final en nombre del equipo. No mezclar en un solo commit una corrección bloqueante con una mejora estética opcional. Si hay dependencias, explicitar orden y si pueden aceptarse por separado.

### 8.2. Criterios de dictamen

| Situación | Recomendación |
|---|---|
| Cero P0/P1 pendientes, cobertura crítica propia satisfactoria, CI PR verificado cuando corresponde, alcance respetado | `APTO` |
| Sin P0/P1, solo P2/P3 documentados y pruebas relevantes correctas | `APTO_CON_OBSERVACIONES` |
| P0/P1 pendientes o pruebas críticas fallidas | `REQUIERE_CORRECCIONES` |
| Archivos fuera de alcance, migración incompatible, datos en riesgo o conflicto grave sin resolución | `BLOQUEADO` |

Si no hay entorno de pruebas, reportarlo. No presentar una omisión como `PASS`. Una auditoría con cero cambios puede ser válida si explica el alcance y la evidencia revisada.

## 9. Lista de comprobación final del compañero

- [ ] Repositorio y SHA fijo correctos; no rebase/merge inadvertido.
- [ ] Cinco rutas reales; no crear un endpoint sexto por error ni reclamar un DELETE físico.
- [ ] Usuario/membresía/sesión activos, empresa y recurso tenant-scoped; rol sin permiso no escribe.
- [ ] Dos empresas pueden usar nombre/SKU idénticos; mismo tenant no, incluso INACTIVO.
- [ ] Nombre NFKC + casefold y SKU uppercase ASCII; caracteres Unicode/control y longitudes extremas protegidos.
- [ ] SKU null permitido varias veces; cero y null de precio/costo correctamente separados.
- [ ] SERVICIO solo con unidad SERVICIO; BIEN/SERVICIO es atributo derivado.
- [ ] PATCH parcial distingue omitido de null; campos protegidos no se escriben.
- [ ] Estado reversible sin borrar registro ni liberar claves; idempotencia evita actualizar timestamp artificialmente.
- [ ] 401/403/404/409/422 según ruta; no 500 con offset más allá del BIGINT.
- [ ] Rollback tras conflictos SQL o excepción, sin grabar parcialmente.
- [ ] Riesgos de carreras simultáneas y cambios con historia comercial futura explícitos.
- [ ] UML 03A PUML/guía/SVG actualizados; el SVG es resumen editorial y Proveedor sigue TO-BE.
- [ ] E2-1/E2-2, frontend, 03B/03C y migraciones aplicadas sin modificar.
- [ ] Informe completo, matriz para aceptar cambios individualmente y PR sin merge.

## 10. Resultado esperado de la entrega

El compañero entregará **(1) PR no fusionado** desde `review/e2-3-catalogo` a `main`, con correcciones justificadas dentro de alcance y commits separables, y **(2) informe completo** `E2-3_INFORME_DE_REVISION.md` en esa rama. El responsable decidirá posteriormente qué aplicar y en qué orden.

**No iniciar E2-4 dentro de este PR.** La revisión de Catálogo es independiente y no debe bloquear la conservación de los bloques previos ni contaminar `main` con modificaciones ajenas.
