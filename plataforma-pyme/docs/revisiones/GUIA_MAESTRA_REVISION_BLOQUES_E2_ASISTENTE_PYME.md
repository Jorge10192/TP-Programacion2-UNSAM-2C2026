# Guía maestra para auditoría, corrección y entrega de revisiones E2

**Proyecto:** Asistente PyME — Programación 2, UNSAM  
**Tipo:** protocolo reutilizable para el compañero revisor y la IA con la que trabaje  
**Versión:** 1.1 — adenda de alcance, evidencias y decisión selectiva  
**Fecha:** 8 de noviembre de 2026  
**Repositorio:** https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026  
**Rama principal:** `main`  
**Carpeta exclusiva:** `plataforma-pyme/`  
**Estado:** instrucciones de revisión; no constituye una auditoría ejecutada.

> **Mandato principal para la IA revisora:** revisá el bloque E2 que te asignen desde su **commit de cierre exacto**. Corregí solamente defectos y mejoras necesarias, locales y justificadas, respetando el progreso anterior de `main`, la arquitectura y los documentos. No reinventes el producto ni incorpores novedades ajenas al bloque. Trabajá en una rama de revisión, subila a GitHub, abrí un PR hacia `main` y entregá **dentro del mismo PR un informe Markdown exhaustivo**: qué analizaste, qué errores encontraste, qué editaste y por qué, qué decidiste no editar, qué queda pendiente y cómo se relaciona todo con código y documentación anteriores. **Nunca modifiques directamente `main` ni fusiones tu PR.**

---

> **Precedencia para E2-1:** la hoja propia de E2-1 manda sobre los ejemplos genéricos de esta guía. La evidencia real del código, commits y CI prevalece sobre cualquier descripción histórica. Una contradicción de negocio se informa, no se resuelve unilateralmente.

---

## 1. Objetivo del procedimiento

Se utiliza para realizar una **segunda mirada independiente y controlada** sobre grandes bloques funcionales que el equipo principal ya desarrolló y validó inicialmente.

El equipo principal **seguirá trabajando directamente en `main`**, en pasos pequeños. Cuando cierre un bloque completo (`E2-1`, `E2-2`…), preparará una hoja de entrega. Tu compañero, con otra IA, recibirá esa hoja y esta guía, creará una rama desde el commit indicado, auditará **solo ese bloque**, corregirá lo justificable y presentará un PR. El responsable del proyecto revisará ese PR con su propia IA antes de aprobar la integración.

**Se espera:** evaluación profunda, correcciones proporcionales, nuevas pruebas cuando correspondan, documentación sincronizada, un informe claro y un PR revisable. **No se premia cantidad de cambios.** Una auditoría que concluye que no hacen falta modificaciones también puede ser correcta si lo demuestra y lo documenta.

### Resultados obligatorios

1. Confirmación del acceso real al código y documentos entregados.
2. Auditoría técnica del bloque, sin revisión exhaustiva de módulos ajenos.
3. Hallazgos priorizados y basados en evidencia.
4. Correcciones limitadas al alcance y justificadas.
5. Tests añadidos o actualizados según los defectos encontrados.
6. Revisión y actualización de documentación cuando sea necesario.
7. **Archivo `E2-X_INFORME_DE_REVISION.md` versionado en la rama.**
8. Rama publicada en GitHub y **Pull Request hacia `main`**, sin fusionar.
9. Resumen final con URL del PR, commit, informe, pruebas y pendientes.

## 2. Contexto del proyecto y límites de acceso

**Asistente PyME** es una plataforma de gestión **generalista, multiempresa y multirrubro**. WALOS es solo una empresa de ejemplo, no la identidad del producto. El modelo contempla cuenta personal, creación y pertenencia a múltiples empresas, membresías, roles y permisos por empresa. No deben introducirse privilegios globales de empresa por error.

La solución incluye frontend React/TypeScript (que inicialmente opera con datos DEMO locales) y backend FastAPI, SQLAlchemy, PostgreSQL 16, Alembic, Docker y GitHub Actions. La existencia de una pantalla no significa que su funcionalidad tenga una API real: **verificar el código y los contratos**.

### Carpeta permitida

```text
TP-Programacion2-UNSAM-2C2026/
├── .github/workflows/
│   ├── plataforma-pyme-backend.yml
│   └── plataforma-pyme-frontend.yml
└── plataforma-pyme/
    ├── backend/
    │   ├── app/
    │   ├── alembic/
    │   ├── tests/
    │   ├── pyproject.toml
    │   └── README.md
    ├── frontend/
    ├── entrega-programacion-2/
    │   ├── 01_ANALISIS_DE_REQUERIMIENTOS.md
    │   ├── 02_CASOS_DE_USO.md
    │   ├── 03_MODELO_DE_DOMINIO_Y_UML.md
    │   ├── 04_ARQUITECTURA_Y_PATRONES.md
    │   ├── 05_MATRIZ_API_Y_TRAZABILIDAD.md
    │   ├── README.md
    │   └── diagramas/
    ├── docs/
    │   └── revisiones/   # crear si falta
    ├── compose.yaml
    ├── .env.example
    └── .gitignore
```

Esta estructura es orientativa: **comprobar los archivos presentes en el SHA recibido**. El documento académico `06_PRUEBAS_Y_DESPLIEGUE.md` está planificado; no afirmar que existe sin verificarlo. Otras carpetas históricas del repositorio están **fuera de alcance**. No modificarlas ni usarlas para reconstruir el producto.

### Requisitos académicos que no deben perderse

La consigna original del TP prevalece sobre cualquier resumen. Como orientación: API RESTful con FastAPI, seguridad en registro/autenticación, persistencia SQLAlchemy, al menos cinco RF de alto nivel realmente cubiertos por endpoints, casos de uso, UML, patrón de diseño aplicado, al menos diez pruebas unitarias de backend, CI, Docker y despliegue. **Tests de infraestructura no convierten mágicamente cinco RF pendientes en implementados.**

## 3. Tamaño de los bloques y frecuencia de auditoría

La auditoría formal corresponde a **bloques funcionales completos**, no a cada paso pequeño de programación:

| Bloque | Alcance orientativo | Qué es especialmente importante verificar |
|---|---|---|
| **E2-0** | Infraestructura, DB, migraciones, Docker y CI | Configuración, versiones, reproducibilidad, migraciones y secretos |
| **E2-1** | Usuarios, autenticación, empresas, roles, invitaciones y membresías | Identidad, sesiones, autorización, tenant, atomicidad, titularidad e idempotencia |
| **E2-2** | Ubicaciones | Pertenencia al negocio, permisos y relaciones por ubicación |
| **E2-3** | Catálogo | Productos/servicios, variantes, unicidad y reglas comerciales |
| **E2-4** | Proveedores, compras y recepciones | Estados, recepción, idempotencia, ubicación, trazabilidad y rollback |
| **E2-5** | Inventario | Movimientos, saldos, concurrencia, stock negativo y transferencias |
| **E2-6** | Ventas y pagos declarados | Dinero en unidades enteras, redondeos, stock y transacciones |
| **E2-7** | Integración frontend/backend, QA integral y despliegue | Contratos, seguridad de frontend, E2E, CI y cumplimiento del TP |

Esta agrupación puede ajustarse. **Recibir un bloque no autoriza desarrollar el siguiente.** Si auditás E2-1 no desarrolles inventario, caja, QR, Mercado Pago o nuevas pantallas sin pedido explícito.

---

## 4. Cómo se le entrega un bloque a la IA revisora

La **fuente de verdad es el repositorio y el commit de cierre**, no una colección de capturas ni un resumen de chat. Al cerrarse un bloque, el equipo principal entrega:

1. **Esta guía maestra**.
2. **Hoja propia del bloque** `E2-X_ENTREGA_PARA_REVISION.md`.
3. URL del repositorio y carpeta `plataforma-pyme/`.
4. **SHA completo del commit de cierre** en `main`.
5. SHA anterior/rango de commits del bloque cuando pueda establecerse.
6. Nombre exacto de la rama que debe crear el revisor.
7. Objetivos, alcance incluido y límites explícitos.
8. RF/RN/CU y documentos académicos pertinentes.
9. Lista de implementaciones, rutas y migraciones que deben verificarse.
10. Evidencia de pruebas locales y CI realmente comprobadas, con fecha.
11. Riesgos y pendientes conocidos al cerrar el bloque.

### Plantilla de identificación de la entrega

```yaml
bloque: E2-X
nombre: "Nombre funcional"
repositorio: "Jorge10192/TP-Programacion2-UNSAM-2C2026"
carpeta: "plataforma-pyme/"
rama_de_origen: "main"
commit_de_cierre: "<SHA_REAL_COMPLETO>"
commit_inicial_o_rango: "<SHA_O_RANGO_REAL>"
rama_de_revision: "review/e2-x-nombre"
objetivo: "<objetivo confirmado>"
alcance: "<rutas y módulos autorizados>"
exclusiones: "<cambios explícitamente prohibidos>"
documentos: "<referencias pertinentes de 01 a 05 y diagramas>"
validacion: "<comandos y resultados efectivamente ejecutados>"
ci: "<URL del run y estado o pendiente>"
```

Los marcadores **se reemplazan por valores reales**. No inventar SHA ni enlaces. Si la IA no puede leer el código completo en GitHub, debe informarlo antes de emitir conclusiones. Podrá usar un snapshot/ZIP proporcionado para ese SHA, pero deberá consignar que el análisis se basó en esa copia y no afirmar acceso que no tuvo.

### ¿Qué material complementario hace falta?

- PDF de la **consigna oficial** cuando sea relevante para validar exigencias académicas concretas.
- Capturas/video únicamente si el bloque involucra un comportamiento UX o defecto visual que el código no permite evaluar adecuadamente.
- Logs de errores precisos y **sin credenciales**.
- Referencias de UML solo si no están ya accesibles dentro del repo.

**No es necesario adjuntar todos los HTML o imágenes hechas** si están en el repositorio. Evitar búsquedas amplias de documentos que no aportan al bloque.

---

## 5. Metodología de auditoría: fases obligatorias

### Fase A. Confirmar acceso y fijar la referencia

1. Comprobar lectura efectiva del repositorio, directorio autorizado, código, pruebas y documentos relevantes.
2. Obtener y registrar el **SHA exacto de cierre**.
3. Identificar el rango de cambios de ese bloque sin incorporar otros.
4. Verificar que los archivos anunciados existan.
5. Confirmar que la carpeta local esté limpia y crear la rama desde ese SHA.
6. Registrar límites de acceso o herramientas faltantes.

**Si la información esencial no está disponible, no inventar.** Indicar claramente qué no se pudo verificar.

### Fase B. Lectura orientada y trazabilidad inicial

Leer en orden: hoja de entrega → documentos 01–05 pertinentes → README y migraciones → código y tests del bloque → dependencias indispensables con módulos anteriores → commits relevantes. No hacer auditoría general de todo el repositorio por inercia.

Antes de editar, construir una matriz: **requisito/regla → CU → código/endpoint → pruebas → documentación/UML → estado**. Distinguir:

- **DEMO:** comportamiento local del frontend.
- **AS-IMPLEMENTED:** funcionalidad realmente presente en el backend.
- **TO-BE:** plan o arquitectura aún no implementados.
- **DIFERIDO:** fuera del MVP o pendiente de otro bloque.

### Fase C. Hallazgos sin modificar código todavía

Registrar hallazgos con identificador único como `REV-E2-1-001`, vinculándolos a archivos, métodos, evidencia y reglas de negocio. Separar:

- **Bug confirmado:** reproducción o prueba de la falla.
- **Riesgo técnicamente fundamentado:** escenario plausible aún no reproducido.
- **Inconsistencia documental:** código y requisito/documento no coinciden.
- **Falta de pruebas:** regla crítica sin evidencia suficiente.
- **Mejora opcional:** preferencia o refactorización sin error demostrado.

No tratar una preferencia estética como fallo de seguridad ni atribuir un requisito que no está definido.

### Fase D. Priorizar qué corregir

| Prioridad | Definición | Decisión habitual |
|---|---|---|
| **P0 — Bloqueante** | Exposición/pérdida de datos, grave vulnerabilidad, funcionamiento central roto | Corregir si es local y seguro; si requiere rediseño, marcar bloqueado y consultar |
| **P1 — Alta** | Bug demostrado, incumplimiento de regla o regresión relevante | Corregir dentro del alcance con prueba de regresión |
| **P2 — Media** | Riesgo importante, cobertura faltante o contradicción documental | Corregir si el cambio es proporcionado; de lo contrario, documentar |
| **P3 — Baja** | Estilo, conveniencia o idea novedosa no exigida | Normalmente **no cambiar**; registrar opcionalmente |

**No realizar cambios radicales ni introducir funcionalidades novedosas por iniciativa propia.** Una modificación grande que afecte contratos, tablas existentes o arquitectura requiere coordinación previa. El trabajo de revisión mejora la continuidad; no reemplaza el plan del proyecto.

### Fase E. Aplicar únicamente correcciones justificadas

- Cambios localizados y con propósito explicable.
- Preservar interfaces estables, reglas de negocio, aislamiento multiempresa y transacciones.
- Añadir tests negativos/regresión para defectos importantes.
- Revisar efectos sobre otros módulos antes de cerrar una modificación.
- Actualizar documentación relacionada cuando cambie comportamiento, contrato o decisión.
- Evitar dependencias, patrones y abstracciones nuevas sin beneficio demostrable.
- No tocar el frontend salvo que sea parte explícita del bloque revisado.
- No editar migraciones históricas ya aplicadas sin autorización; preferir nueva migración compatible si corresponde.
- No borrar tablas, usuarios o volúmenes de Docker ni ejecutar downgrades destructivos.

### Fase F. Validar resultado y detectar regresiones

Ejecutar pruebas relevantes y comparar con el estado inicial. Cuando corresponda, comprobar HTTP, esquema Alembic, migraciones, aislamiento entre empresas, concurrencia y CI. Registrar exactamente qué se ejecutó, dónde y con qué resultado. Si una prueba no pudo ejecutarse, **no marcarla como aprobada**.

### Fase G. Publicar e informar

Crear `E2-X_INFORME_DE_REVISION.md`, verificar que esté dentro de la rama junto con código y documentación, subir la rama y abrir PR hacia `main`. No hacer merge. Entregar URL del PR y resumen de riesgos y pendientes.


---

## 6. Reglas que la revisión debe preservar

### 6.1. Identidad, empresas y permisos

- **Usuario ≠ Empresa ≠ Membresía.** Las personas tienen identidad global; sus permisos varían por empresa.
- No crear un rol global que permita acceder a empresas ajenas.
- Validar en el **servidor** el `business_id`, la membresía y el permiso para la operación concreta.
- No confiar en `role`, `user_id` o `business_id` enviados por el cliente como evidencia de autorización.
- Separar **fundador histórico**, **titular administrativo vigente** y eventual **titularidad legal**.
- Impedir que una membresía inactiva conceda acceso y aplicar denegación por defecto ante roles o estados desconocidos.
- No revelar la existencia de empresas ajenas cuando el contrato prevé una respuesta genérica o `404`.
- Revisar estados y autorizaciones dentro de los límites transaccionales en operaciones sensibles.

### 6.2. Contraseñas, sesiones y datos sensibles

- No almacenar ni devolver contraseñas en claro.
- Mantener hash robusto de passwords, secretos aleatorios y sesiones revocables según el contrato vigente.
- No exponer tokens de acceso, huellas, contraseñas ni secretos en respuestas, logs o evidencias.
- La autenticación de una persona no implica autorización para operar en cualquier empresa.
- No sugerir despliegue público sin revisar las medidas de seguridad aún pendientes (HTTPS, prevención de abuso, recuperación de acceso, etc.).

### 6.3. SQLAlchemy, PostgreSQL, migraciones y concurrencia

- Una sesión SQLAlchemy por solicitud u operación; no compartir sesiones mutables entre peticiones.
- Repositorios sin commits ocultos; el servicio o unidad de trabajo define el límite transaccional.
- FK, UNIQUE, CHECK, índices y bloqueos donde realmente protejan invariantes.
- Idempotencia y manejo de reintentos de comandos, preservando el ámbito correcto de la clave.
- Reversión de **toda** la operación cuando falle una parte: no dejar empresa sin titular inicial, compra sin recepción consistente ni venta parcialmente aplicada.
- Evitar claves o índices redundantes, pero no eliminar restricciones reales de una migración aplicada sin plan de compatibilidad.
- No reemplazar migraciones Alembic por `Base.metadata.create_all()` en bases persistentes.
- No usar `alembic stamp`, `downgrade` destructivo, borrado de volúmenes o SQL de limpieza para silenciar una diferencia sin diagnóstico y autorización.

### 6.4. Dominio comercial futuro: verificar solo si corresponde

Los bloques correspondientes deberán revisar, entre otras reglas, compras separadas de recepciones, stock físico basado en movimientos, imposibilidad de saldo negativo, servicios sin descarga de stock, transferencias consistentes, operaciones atómicas y cálculo monetario exacto en unidades enteras con redondeos definidos. **No implementar anticipadamente esos módulos por revisar un bloque de identidad.**

### 6.5. Patrones de diseño

Los documentos incluyen conceptos tales como Observer, Repository, Service Layer/Unit of Work y propuestas de Factory, Decorator o Adapter. No agregar un patrón para que "se vea más avanzado". Distinguir estrictamente:

- Patrón **identificable en código ejecutable**.
- Patrón **propuesto**, pero no implementado.
- Abstracción o arquitectura común que no necesita etiqueta de patrón.

Solo refactorizar para aplicar un patrón si resuelve un problema real del bloque y no rompe el diseño acordado.

## 7. Documentación académica: contraste y actualización

La documentación académica es parte del entregable, **no un material decorativo**. Debe evolucionar junto con el código sin perder las decisiones previas justificadas.

| Documento | Qué debe contrastarse | Cuándo corresponde editarlo |
|---|---|---|
| `01_ANALISIS_DE_REQUERIMIENTOS.md` | RF/RNF, RN, alcance, criterios de aceptación y prioridades | Cambia una regla, requerimiento, alcance o estado de implementación |
| `02_CASOS_DE_USO.md` | Actores, flujos, errores, pre/postcondiciones, permisos y transacciones | Cambia el comportamiento de un caso de uso |
| `03_MODELO_DE_DOMINIO_Y_UML.md` | Entidades, asociaciones, cardinalidades, estados, restricciones y UML | Cambian conceptos de dominio, entidades o relaciones |
| `04_ARQUITECTURA_Y_PATRONES.md` | Capas, decisiones técnicas, transacciones, seguridad y patrones realmente aplicados | Cambia la arquitectura o una decisión técnica relevante |
| `05_MATRIZ_API_Y_TRAZABILIDAD.md` | RF→CU→endpoint→permiso→prueba→estado | Cambian endpoints, códigos de error, permisos, pruebas o evidencia |
| `backend/README.md` y otros README | Instalación, migraciones, endpoints, estado y comandos verificables | Se modifica la operativa o se corrige una instrucción |
| `06_PRUEBAS_Y_DESPLIEGUE.md`, **si existe** | CI, Docker, despliegue y evidencias | Cambia el proceso de prueba/despliegue |

### 7.1. Cómo decidir si cambiar un documento

1. Si el código es defectuoso frente a un RF/CU vigente, **corregir el código** si está dentro del alcance.
2. Si el código expresa una decisión posterior legítima que no fue sincronizada, **actualizar el documento** y dejar constancia de la razón.
3. Si hay contradicción sustancial o decisión de negocio sin dueño, **no elegir arbitrariamente**: informar y solicitar decisión.
4. Mantener el historial conceptual **TO-BE** diferenciado del estado **AS-IMPLEMENTED**; no borrar por reflejo propuestas que siguen siendo relevantes.
5. No marcar un componente como finalizado sin evidencia comprobable.
6. Si un documento fue revisado pero no requiere cambios, informar **“Revisado; sin cambios”** con una explicación breve.

### 7.2. Diagramas UML

- Para identidad y empresas, concentrarse en **03A**.
- El complejo **03B no debe regenerarse por defecto**. Si se detecta una inconsistencia, describir detalladamente atributos, entidades, asociaciones, multiplicidades y efectos futuros.
- Si está autorizado actualizar un diagrama, preservar la fuente editable (`.puml` cuando corresponda) y mantenerla consistente con sus exportaciones (`.svg`).
- No convertir servicios de infraestructura en entidades del dominio solo porque existen clases Python.
- Evitar cambios meramente estéticos de UML en una revisión de backend.

### 7.3. Tabla de trazabilidad obligatoria

El informe final debe incluir:

| Hallazgo/cambio | RF/RN | CU | Código/endpoint | Prueba | Documento/UML | Estado |
|---|---|---|---|---|---|---|
| `REV-E2-X-001` / `MOD-001` | `RF-..` | `CU-..` | `ruta:método` | `test_...` | `02`, `05` | Corregido/probado |

No inventar IDs de requisitos si un cambio no corresponde a uno existente: puede indicarse “regla técnica transversal” y explicar el motivo.

---

## 8. Pruebas, ambientes y evidencias

### 8.1. Pruebas básicas

Ejemplos de PowerShell, **desde `plataforma-pyme/backend/`**, adaptables al bloque:

```powershell
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
.\.venv\Scripts\python.exe -m pytest -q
```

Las pruebas que consultan PostgreSQL real requieren **verificar previamente el entorno**. Habilitarlas solo en una base de prueba/desarrollo confirmada, preferentemente efímera:

```powershell
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -q
Remove-Item Env:\RUN_DB_INTEGRATION
```

En Linux/CI adaptar ejecutable y variables. **No ejecutar sobre una base de producción.** Los tests de integración del proyecto han utilizado transacciones exteriores y SAVEPOINTs: comprobar que los tests del bloque recibido efectivamente reviertan sus datos, sin asumirlo por el nombre.

### 8.2. Revisiones específicas

- **API:** rutas efectivas, OpenAPI, validación y código HTTP para errores y permisos.
- **PostgreSQL:** esquema, constraints, índices, migraciones y transacciones.
- **Concurrencia:** reintentos simultáneos e integridad ante fallos intermedios.
- **Seguridad:** accesos cruzados entre empresas, tokens inválidos, usuarios deshabilitados y no exposición de secretos.
- **Frontend cuando aplique:** tests unitarios, E2E de navegador, accesibilidad y comportamiento DEMO vs API.
- **CI:** revisar los runs asociados al SHA y al PR; distinguir resultado local de CI.

### 8.3. Qué debe registrarse en el informe

Por cada comando: `comando`, `directorio`, `sistema/entorno`, `fecha`, `resultado real`, `cantidad de passed/failed/skipped`, `evidencia`, `limitaciones`. Registrar también **qué pruebas no pudieron ejecutarse y por qué**.

No copiar secretos de `.env` ni resultados de comandos que los revelen (por ejemplo, `docker compose config` sin `--quiet`). No incluir contraseñas ni tokens reales en capturas, PR o logs. No afirmar “GitHub Actions verde” si solo hay pruebas locales.

---

## 9. Informe final Markdown: ENTREGABLE OBLIGATORIO

Al terminar **toda** la revisión, crear dentro del repositorio:

```text
plataforma-pyme/docs/revisiones/E2-X_INFORME_DE_REVISION.md
```

Ejemplos: `E2-1_INFORME_DE_REVISION.md`, `E2-2_INFORME_DE_REVISION.md`.

Si falta `docs/revisiones/`, crear esa carpeta. **El archivo debe formar parte del mismo PR que las correcciones.** El mensaje de chat no sustituye al archivo. Debe ser Markdown con encabezados, tablas y referencias exactas. El responsable tiene que poder evaluarlo sin haber leído la conversación de la IA.

### 9.1. Secciones obligatorias

1. **Portada/identificación:** bloque, SHA auditado, rama, commits y autor de la revisión, fecha, PR, alcance.
2. **Resumen ejecutivo:** evaluación del bloque y conclusión preliminar.
3. **Alcance real:** archivos y módulos inspeccionados y modificados; exclusiones cumplidas; limitaciones de acceso.
4. **Metodología:** documentación y código leídos, tipos de análisis y herramientas utilizadas.
5. **Hallazgos técnicos:** todos los errores, riesgos, inconsistencias y faltas de prueba, con severidad, evidencia y decisión.
6. **Cambios efectuados:** antes/después, archivo, motivo, regla que resuelve y test relacionado.
7. **Cambios no realizados:** pendientes, motivos para no intervenir y nivel de urgencia.
8. **Relación con el `main` anterior:** contratos e invariantes mantenidos, compatibilidad, regresiones, cambios posteriores de `main` y conflictos.
9. **Contraste documental:** análisis de documentos 01–05, UML y README, modificaciones y justificación.
10. **Pruebas y validaciones:** comandos ejecutados y resultados reales; CI, DB y limitaciones.
11. **Archivos y commits:** resumen del diff y motivo de cada modificación significativa.
12. **Backlog residual:** pendientes priorizados, dependencias y bloque futuro sugerido.
13. **Recomendación final:** apto, apto con observaciones, requiere correcciones o bloqueado.
14. **Declaración de integridad:** acceso verificado, pruebas honestas, no publicación de secretos y no merge a `main`.

Si una sección no aplica, escribir **“No aplica” y justificarlo**. No omitir secciones silenciosamente.

### 9.2. Nivel de detalle requerido para hallazgos

Cada defecto relevante debe tener un registro como este:

```markdown
### REV-E2-1-003 — Recuperación incorrecta de conflicto SQL

- **Tipo:** bug confirmado.
- **Prioridad:** P1.
- **Ruta / símbolo:** `backend/app/.../service.py`, método `...`.
- **Estado anterior:** el servicio esperaba un nombre de constraint inexistente.
- **Evidencia:** la excepción PostgreSQL informa una PK distinta;
  test de regresión `test_...`.
- **Consecuencia:** una solicitud repetida podía responder 500 en lugar
  de recuperar su resultado anterior.
- **Corrección:** se mapea la PK real; no se modifica la migración histórica.
- **Justificación:** preserva idempotencia y compatibilidad del endpoint.
- **Pruebas:** resultado real y entorno.
- **Documentos:** 04 y 05, según corresponda.
- **Estado:** corregido / validado / pendiente de CI.
```

Ese ejemplo ilustra el **grado de precisión**, no debe copiarse como un hallazgo nuevo si no se comprobó en el bloque revisado.

### 9.3. Qué se debe explicar sobre cambios NO realizados

El informe debe contener explícitamente asuntos que la IA detectó pero dejó fuera de la rama, incluidos:

- Funcionalidades que pertenecen a otros bloques.
- Posibles ampliaciones sin exigencia actual.
- Refactorizaciones grandes sin justificación suficiente.
- Decisiones de negocio pendientes de aprobación.
- Riesgos relevantes cuyo arreglo depende de nuevos modelos o migraciones.
- Tests no ejecutados por falta de acceso o entorno.

**No ocultar pendientes para declarar el bloque “perfecto”.** Distinguir riesgos conocidos de defectos bloqueantes.


## 10. Plantilla completa del informe de revisión

**La IA debe crear un archivo nuevo siguiendo este modelo, completándolo con datos reales.** El siguiente bloque es una plantilla de contenido, no un informe ya realizado.

````markdown
# E2-X — Informe de auditoría y revisión técnica

**Proyecto:** Asistente PyME — Programación 2, UNSAM  
**Bloque:** E2-X — [nombre]  
**Revisor:** [integrante y, opcionalmente, IA utilizada]  
**Fecha:** [AAAA-MM-DD]  
**Repositorio:** [URL]  
**Carpeta analizada:** `plataforma-pyme/`  
**Commit de cierre auditado:** `[SHA completo]`  
**Rama:** `review/e2-x-nombre`  
**Último commit de correcciones:** `[SHA completo]`  
**PR:** [URL real o pendiente]  
**Estado:** Apto para segunda revisión / Con observaciones / Bloqueado

## 1. Resumen ejecutivo

- Objetivo funcional original del bloque.
- Alcance inspeccionado realmente.
- Hallazgos por severidad: P0/P1/P2/P3.
- Cantidad de defectos corregidos y pendientes.
- Principales cambios y efecto sobre el sistema anterior.
- Recomendación final para el responsable.

## 2. Alcance auditado y límites

| Área o ruta | Inspeccionada | Modificada | Razón / límite |
|---|---|---|---|
| `...` | Sí/No | Sí/No | ... |

**Fuera de alcance respetado:** ...  
**Limitaciones de acceso:** ...

## 3. Estado inicial de main en el SHA recibido

- Endpoints y casos de uso existentes.
- Tablas y migraciones relevantes.
- Contratos e invariantes conocidos.
- Tests inicialmente verificables.
- Estado real de CI y Docker, si se pudo comprobar.

## 4. Metodología de análisis

Explicar qué código, documentos, diffs, pruebas, decisiones de
arquitectura y casos límite se inspeccionaron y cómo.

## 5. Matriz general de hallazgos

| ID | Prioridad | Clasificación | Evidencia | Impacto | Decisión |
|---|---|---|---|---|---|
| REV-E2-X-001 | P1 | Bug confirmado | Ruta/test ... | ... | Corregido |
| REV-E2-X-002 | P2 | Riesgo | ... | ... | Pendiente |

### REV-E2-X-001 — [Título preciso]

**Estado:** corregido / pendiente / requiere decisión.  
**Código afectado:** `ruta:clase.función`.  
**Situación anterior:** ...  
**Evidencia:** ...  
**Causa:** ...  
**Consecuencia:** ...  
**Requisito / regla / documento:** ...  
**Decisión adoptada y justificación:** ...

[Repetir para hallazgos relevantes, especialmente P0 y P1.]

## 6. Modificaciones efectuadas

| Cambio | Hallazgo relacionado | Archivo(s) | Antes / después | Prueba | Documento |
|---|---|---|---|---|---|
| MOD-001 | REV-E2-X-001 | ... | ... | ... | 02, 05 |

### MOD-001 — [Nombre]

- **Qué se editó:** ...
- **Por qué se editó:** ...
- **Qué funcionaba antes:** ...
- **Qué funciona ahora:** ...
- **Por qué continúa el flujo anterior de main:** ...
- **Riesgo o incompatibilidad:** ...
- **Pruebas agregadas o modificadas:** ...
- **Documentación actualizada:** ...

## 7. Hallazgos y mejoras NO implementados

| ID | Asunto pendiente | Prioridad | Por qué no se editó | Dependencia | Bloque futuro |
|---|---|---|---|---|---|
| PEN-001 | ... | P2 | Fuera de alcance | ... | E2-Y |

Incluir decisiones de no cambiar código, UML o contratos que se
analizaron y se descartaron, con su justificación.

## 8. Relación con el progreso anterior de main

- Funcionalidades previamente validadas que se conservaron.
- Interfaces y contratos preservados o modificaciones autorizadas.
- Invariantes de seguridad y persistencia respetados.
- Impacto sobre migraciones o datos previos.
- Relación con módulos anteriores y siguientes.
- Si main avanzó durante la revisión, indicar SHA nuevos,
  conflictos y decisiones de integración.

## 9. Contraste con documentos y UML

| Documento | Qué se contrastó | Hallazgo | Cambio efectuado / sin cambios | Por qué |
|---|---|---|---|---|
| 01 Requerimientos | ... | ... | ... | ... |
| 02 Casos de uso | ... | ... | ... | ... |
| 03 Modelo y UML | ... | ... | ... | ... |
| 04 Arquitectura | ... | ... | ... | ... |
| 05 API y trazabilidad | ... | ... | ... | ... |
| README / 06 si existe | ... | ... | ... | ... |

### Matriz de trazabilidad

| Cambio/Hallazgo | RF/RN | CU | Código | Prueba | Documento | Estado |
|---|---|---|---|---|---|---|
| MOD-001 | RF-.. | CU-.. | ... | ... | 02/05 | Validado |

## 10. Pruebas y validaciones

| Comando/control | Entorno | Resultado REAL | Evidencia | Limitación |
|---|---|---|---|---|
| `python -m pytest -q` | ... | N passed / failed | ... | ... |
| `alembic check` | ... | ... | ... | ... |
| GitHub Actions | ... | Verde / rojo / pendiente | URL | ... |

- Casos agregados y reglas que cubren.
- Regresiones comprobadas.
- Pruebas omitidas/no ejecutadas y motivos.
- DB y estrategia para evitar dejar datos de prueba.
- Riesgos no reproducidos o todavía sin test.

## 11. Archivos cambiados y commits

| Archivo | Tipo de modificación | Motivo | Commit |
|---|---|---|---|
| `...` | Código/tests/docs/informe | ... | SHA |

**Archivos ajenos al bloque modificados:** ninguno / justificación.

## 12. Backlog residual priorizado

| Prioridad | Pendiente | Consecuencia | Dependencia | Incremento propuesto |
|---|---|---|---|---|
| P1 | ... | ... | ... | ... |

## 13. Conclusión para segunda revisión

- [ ] Apto para revisión final e integración.
- [ ] Apto con observaciones menores.
- [ ] Requiere correcciones previas.
- [ ] Bloqueado: NO integrar.

**Fundamento con evidencia:** ...  
**Riesgos residuales:** ...  
**Decisiones que se solicitan al responsable:** ...

## 14. Declaración de integridad

- [ ] Los archivos citados fueron realmente consultados.
- [ ] Los resultados de tests son reales o se indican como pendientes.
- [ ] No se subieron secretos, contraseñas ni tokens.
- [ ] No se modificó ni se hizo push directo a main.
- [ ] No se fusionó el PR.
- [ ] Cada cambio tiene justificación y referencia a tests/docs.
- [ ] Los pendientes y lo no modificado figuran explícitamente.
````

**Ejemplo de redacción suficiente:** “El servicio atrapaba la excepción de una restricción UNIQUE que se había eliminado. PostgreSQL reportaba el nombre de la PK; se corrigió la rama de recuperación para esa PK, se añadió una prueba de reintento y se actualizó la documentación de idempotencia. No se editó la migración aplicada. Los tests dieron X resultados en Y entorno”.

**Ejemplo insuficiente:** “Arreglé la idempotencia, optimicé la arquitectura y todo funciona”, sin evidencias, archivos, pruebas, razones ni pendientes.

---

## 11. Cómo trabajar con Git y subir la revisión al repositorio

### 11.1. Requisito inicial: rama propia y SHA exacto

El equipo principal proporcionará `commit_de_cierre` y el nombre aprobado de la rama. El revisor debe usar **esa base exacta**. Los comandos siguientes son ejemplos: sustituir los marcadores, sin escribir literalmente `<SHA_DE_CIERRE>`.

Si no existe un clon local, clonar:

```powershell
git clone https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026.git
cd TP-Programacion2-UNSAM-2C2026
```

Si ya existe un clon, desde la **raíz del repositorio**:

```powershell
# Verificar si hay archivos personales sin confirmar.
git status --short

# Actualizar referencias remotas, sin modificar main.
git fetch origin

# Comparar la referencia actual con la base del bloque.
git rev-parse origin/main

# Sustituir por el SHA de cierre recibido en la hoja de entrega.
git show --no-patch --format="%H %s" SHA_DE_CIERRE_REAL

# Ejemplo E2-1: crear rama desde ese commit exacto.
git switch -c review/e2-1-identidad-empresas SHA_DE_CIERRE_REAL

git branch --show-current
git rev-parse HEAD
```

Si `git status --short` muestra modificaciones de otra persona, **no borrarlas ni hacer checkout destructivo**. Usar otro clon o una carpeta de trabajo separada, o coordinar.

No crear la rama desde el `main` de hoy cuando el SHA entregado corresponde a un cierre anterior: podría mezclar cambios de otros bloques.

### 11.2. Hacer cambios y generar el informe

Luego de auditar y corregir, crear el informe dentro de `plataforma-pyme/docs/revisiones/` y confirmar que ese archivo forma parte del mismo conjunto de cambios.

```powershell
# Inspeccionar qué cambió realmente.
git status --short
git diff --check
git diff --stat

# Agregar explícitamente los archivos reales modificados.
# EJEMPLO: reemplazar estas rutas por las reales de la revisión.
git add plataforma-pyme/backend/app/modules/businesses/permissions.py
git add plataforma-pyme/backend/tests/test_business_permissions.py
git add plataforma-pyme/docs/revisiones/E2-1_INFORME_DE_REVISION.md

# Añadir también documentos 01–05 pertinentes si se editaron.
# Ejemplo con un documento concreto:
git add plataforma-pyme/entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md

# Verificar qué va a quedar en el commit.
git diff --cached --check
git diff --cached --stat

git commit -m "fix(pyme): revision E2-1 con pruebas y trazabilidad"
```

**Las rutas usadas como ejemplo no son una lista obligatoria de archivos a modificar.** No agregarlos o editarlos si el bloque no lo requiere. Preferir varios commits semánticos (`fix`, `test`, `docs`) si ayudan a explicar los cambios. El informe puede finalizarse en un último commit de la rama.

No usar `git add -A` a ciegas: podría incorporar archivos privados, cambios locales de otros proyectos o capturas innecesarias. Respetar `.gitignore`, pero recordar que un archivo ya rastreado no queda oculto simplemente por agregarlo al `.gitignore`.

### 11.3. Publicar únicamente la rama de revisión

```powershell
git push -u origin review/e2-1-identidad-empresas
```

No ejecutar `git push origin main`, ni `git push --force` sobre ramas compartidas.

### 11.4. Abrir Pull Request en GitHub

1. Entrar al repositorio desde el navegador.
2. Elegir **Compare & pull request** para la rama publicada, o **Pull requests → New pull request**.
3. Verificar **base: `main`** y **compare: `review/e2-1-identidad-empresas`**.
4. Inspeccionar **Files changed** y comprobar que no se mezclaron otros bloques.
5. Completar título y descripción usando la plantilla de la sección 12.
6. Si todavía está en curso la revisión o CI, crear un **Draft PR** y pasarlo a listo cuando todo esté preparado.
7. Verificar los jobs de GitHub Actions que se hayan ejecutado; informar los que fallen o no se disparen.
8. Copiar el enlace del PR y entregarlo al responsable junto con el SHA de revisión y el enlace al informe.
9. **NO fusionar el PR.** El responsable realizará la segunda revisión y decidirá su integración.

### 11.5. Si el revisor no tiene acceso de escritura al repositorio

Usar un **fork** personal: crear fork en GitHub, clonar, crear la misma rama desde el SHA original, hacer commits y subir la rama a ese fork. Abrir un **Pull Request desde el fork** hacia el repositorio original, con destino `main`. Mantener el mismo informe y criterios de calidad. No solicitar credenciales del dueño del repositorio; acceso por invitación o fork.

### 11.6. Qué hacer si `main` avanza mientras se revisa el bloque

Esto puede suceder y **no es un error**, porque el equipo principal sigue desarrollando nuevos incrementos en `main`.

- Mantener registrado el **SHA de cierre que se auditó**.
- Registrar el SHA actual de `main` al preparar el PR.
- No introducir los nuevos commits en la rama silenciosamente.
- Examinar qué conflictos podría generar el PR con cambios posteriores.
- Coordinar con el responsable si conviene actualizar la rama, hacer rebase, merge o aplicar las correcciones mediante cherry-pick.
- Si se actualiza la base por decisión conjunta, volver a ejecutar pruebas afectadas y documentarlo.
- **Nunca forzar cambios sobre `main`** ni resolver conflictos sobrescribiendo indiscriminadamente trabajo más nuevo.

Cuando se integre, el responsable revisará el **diff vigente contra `main`**, no solo el estado que tenía el PR el día en que fue abierto.


---

## 12. Descripción obligatoria del Pull Request

El PR es la **síntesis del trabajo**; el `.md` es el **informe completo**. No copiar todo el informe en el cuerpo del PR. La descripción debe permitir al responsable decidir rápidamente qué revisar y dónde encontrar evidencias.

```markdown
## Revisión técnica E2-X — [Nombre del bloque]

**SHA original de main:** `SHA_COMPLETO`  
**Rama:** `review/e2-x-nombre`  
**Informe completo:** `plataforma-pyme/docs/revisiones/E2-X_INFORME_DE_REVISION.md`  
**Estado:** Listo para segunda revisión / Draft

### Objetivo de la auditoría
[Qué se pretendía verificar y mejorar del bloque entregado.]

### Resultado
- Hallazgos P0: [n]; P1: [n]; P2: [n]; P3: [n].
- Corregidos: [n].
- Pendientes documentados: [n].
- ¿Se respetó el alcance?: [sí / explicar excepciones autorizadas].

### Cambios importantes
- [MOD-001]: archivo, defecto y corrección.
- [MOD-002]: archivo, defecto y corrección.

### Documentación revisada
- 01: actualizada / revisada sin cambios / no aplica.
- 02: ...
- 03 y UML: ...
- 04: ...
- 05: ...

### Pruebas y CI
- Comando: `[comando exacto]` → [resultado real].
- Alembic: [resultado real / no aplica].
- GitHub Actions: [URL al run y estado / pendiente].

### Riesgos conocidos y pendientes
- [Riesgo significativo, prioridad, bloque sugerido.]
- [Decisión que requiere al responsable, si existe.]

### Entrega
Solicito segunda revisión de este PR. El informe técnico completo
está incluido en la rama. **No fusioné este PR con `main`.**
```

No introducir nombres de commits, cantidades o enlaces ficticios. Si el informe todavía está incompleto, mantener el PR como borrador. Cuando el PR esté completo, entregar también el vínculo directo al informe en GitHub.

## 13. Lista de aceptación para la segunda revisión del responsable

Antes del merge, el responsable y su IA deben poder comprobar:

- [ ] El SHA auditado es el que se entregó, o se documentó toda diferencia.
- [ ] El PR solo modifica el bloque asignado, pruebas y documentos pertinentes.
- [ ] No aparecen archivos secretos, binarios innecesarios, credenciales ni `.env`.
- [ ] Los hallazgos importantes tienen evidencia; no son afirmaciones vagas.
- [ ] Las correcciones son pequeñas, justificadas y no rediseñan la aplicación.
- [ ] Se conservan las reglas de negocio e invariantes previas.
- [ ] Los tests relevantes se ejecutaron o se documentaron límites exactos.
- [ ] GitHub Actions está revisado para ese PR, sin resultados inventados.
- [ ] Las migraciones y relaciones DB siguen coherentes.
- [ ] La seguridad y el aislamiento multiempresa no se debilitaron.
- [ ] Los documentos académicos pertinentes se revisaron y actualizaron cuando correspondía.
- [ ] Los UML pertinentes están correctos o se describen sus correcciones futuras; no se rehízo 03B sin autorización.
- [ ] El informe Markdown está **versionado dentro del PR** y es suficientemente detallado.
- [ ] Se explica cada modificación significativa y cada decisión de no modificar.
- [ ] Los pendientes figuran ordenados por prioridad y bloque futuro.
- [ ] Se analizaron los avances nuevos de `main` posteriores al SHA auditado.
- [ ] El revisor no fusionó su propio PR.

**No aprobar automáticamente** si persiste un error P0/P1, una regresión importante, una discrepancia grave con la documentación, un cambio destructivo no autorizado o conflictos no resueltos con un `main` más nuevo.

## 14. Autonomía, consultas y comunicación

La IA revisora **puede actuar sin autorización adicional** para cambios locales de bajo riesgo que cumplan esta guía: corregir un bug demostrado, añadir un test, eliminar una redundancia real o actualizar el documento afectado.

Debe **detener la modificación concreta y consultar al responsable** si encuentra:

- Cambio de requisito o regla de negocio sin decisión previa.
- Necesidad de modificar arquitectura, dependencias principales o contratos externos.
- Migración potencialmente destructiva o alteración de datos existentes.
- Problema de seguridad grave que excede el bloque.
- Falta de acceso a archivos esenciales o pruebas críticas.
- Conflicto con cambios posteriores de `main` que podría perder trabajo.
- Propuesta innovadora fuera del alcance, aunque parezca atractiva.

No hace falta interrumpir continuamente por cuestiones menores. La IA puede documentar mejoras opcionales sin ejecutarlas. **Todo cambio realizado y todo pendiente relevante debe terminar explicado en el informe.**

### Mensaje final que debe recibir el responsable

Al entregar el PR, el revisor debe comunicar de manera compacta:

1. Bloque y SHA de origen auditados.
2. Rama creada y **enlace al PR**.
3. Enlace al **informe Markdown dentro del PR**.
4. Número y severidad de hallazgos, cantidad corregida y cantidad pendiente.
5. Resultados **reales** de pruebas y GitHub Actions.
6. Cambios que afectaron los documentos 01–05 y UML.
7. Riesgos o decisiones que requieren atención antes del merge.
8. Confirmación de que **no publicó directamente en `main` ni hizo merge**.

El mensaje es una síntesis. No sustituye al informe técnico versionado.

## 15. Ejemplo completo de intercambio por bloque

**Entrega del equipo principal:**

```text
Bloque: E2-1 — Identidad, Empresas y Membresías
Repositorio: Jorge10192/TP-Programacion2-UNSAM-2C2026
Carpeta: plataforma-pyme/
Commit de cierre: <SHA_REAL_DEL_BLOQUE>
Rango de commits: <RANGO_REAL>
Rama autorizada: review/e2-1-identidad-empresas
Hoja: docs/revisiones/E2-1_ENTREGA_PARA_REVISION.md
Guía: GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md
Documentos: entrega-programacion-2/01...05, UML 03A y README backend
Pruebas y migraciones: resultados documentados en la hoja
Fuera de alcance: bloques comerciales posteriores, rediseño general, 03B
```

**Entrega del compañero revisor:**

```text
Rama: review/e2-1-identidad-empresas
Cambios: fixes justificados + tests + documentos relacionados
Informe: plataforma-pyme/docs/revisiones/E2-1_INFORME_DE_REVISION.md
PR: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/NUMERO_REAL
Estado: esperando segunda revisión del responsable
```

Los marcadores **no son datos reales**; reemplazarlos por los valores verdaderos del bloque entregado. El ejemplo no significa que E2-1 ya esté cerrado ni que exista ese PR.

---

## 16. Instrucción final para la IA revisora

**El propósito de tu revisión es consolidar una evolución de software, no sustituirla por otra.** La aplicación ya tiene decisiones y código anteriores que deben respetarse; la documentación académica debe acompañar fielmente esa evolución, aunque pueda corregirse cuando las evidencias lo justifiquen.

Revisá el bloque con rigor, encontrá fallos reales, mejorá lo imprescindible, demostralo con pruebas y dejá explícitos los riesgos que no corresponda resolver todavía. **No agregar funciones novedosas, no rehacer módulos enteros sin necesidad, no ampliar el alcance y no introducir patrones o tecnologías porque parezcan interesantes.**

**Todo lo que modifiques debe tener una explicación técnica y una relación verificable con el código y la documentación. Todo asunto relevante que decidas no modificar también debe quedar justificado.**

El entregable final es: **rama de revisión + Pull Request hacia `main` + código/pruebas/documentación pertinentes + informe Markdown exhaustivo dentro del PR + resultados reales de validación**.

**No fusionar el PR.** La segunda revisión y la integración corresponden al responsable del proyecto.
---

## 17. Adenda v1.1 — Controles obligatorios adicionales

La adenda complementa esta guía y no autoriza por sí sola a modificar nuevos módulos.

### 17.1. Lista blanca obligatoria

La hoja de cada bloque contiene rutas explícitas **editables**, rutas **solo consulta** y archivos de **edición excepcional con aprobación**. Todo lo no autorizado es solo lectura. Si una corrección precisa salir del alcance, el revisor registra el hallazgo, describe la dependencia y consulta al responsable; no realiza el cambio por iniciativa propia. No editar migraciones históricas ya aplicadas ni cambiar la infraestructura de bloques anteriores.

### 17.2. `main` que avanza y conflictos

La rama nace de un SHA fijo, no del `main` móvil. Si `main` avanza, el revisor no ejecuta `git rebase origin/main`, `git merge origin/main`, `git reset --hard` ni `git push --force` autónomamente. Registra `CONFLICTO_CON_MAIN` con SHA, archivos y consecuencias y mantiene su PR sin fusionar. Resolver conflictos y seleccionar cambios pertenece al responsable.

### 17.3. Estados de pruebas normalizados

| Estado | Significado |
|---|---|
| `EJECUTADO_PASS` | Ejecutado por el revisor y aprobado |
| `EJECUTADO_FAIL` | Ejecutado por el revisor y fallido |
| `OMITIDO_SIN_ENTORNO` | No ejecutable por falta de DB, Docker u otra dependencia identificada |
| `NO_EJECUTADO` | Sin ejecución, indicar motivo |
| `CI_PENDIENTE` | Resultado CI del PR no disponible |
| `CI_PASS_VERIFICADO` | CI verde con URL y commit exacto |
| `CI_FAIL_VERIFICADO` | CI rojo con URL y commit exacto |
| `REPORTADO_POR_AUTOR` | Resultado reportado por otra persona, no reproducido |
| `NO_APLICA` | Control irrelevante, justificar |

### 17.4. Informe y decisiones selectivas

El informe empieza con YAML front matter real, con `bloque`, `commit_base_auditado`, `rama_revision`, `estado_recomendado`, `resumen_hallazgos` P0–P3, `hallazgos_corregidos`, `hallazgos_pendientes`, `requiere_decision_humana` y `conflicto_con_main`. Cada hallazgo usa ID `REV-E2-X-###`, cada cambio `MOD-E2-X-###`, con enlaces entre ambos, archivo, motivo, prueba y decisión.

Se exige una **matriz de aceptación individual** por modificación con sugerencia `ACEPTAR`, `AJUSTAR`, `RECHAZAR` o `DIFERIR`, compatibilidad y riesgos. Es una recomendación: el responsable puede elegir solo algunos cambios. Preferir commits pequeños por hallazgo; no combinar un refactor estético con una corrección funcional inseparable.

### 17.5. Umbral de recomendación

| Condición | Estado |
|---|---|
| 0 P0/P1 abiertos; pruebas relevantes ejecutadas y satisfactorias; sin regresiones ni violaciones de alcance | `APTO` |
| 0 P0/P1 abiertos; P2/P3 documentados; evidencia suficiente y pruebas relevantes satisfactorias | `APTO_CON_OBSERVACIONES` |
| P0/P1 abiertos pendientes de resolver en el alcance permitido | `REQUIERE_CORRECCIONES` |
| Cambio incompatible o fuera de lista blanca, pérdida de datos, regresión grave o conflicto sin resolver | `BLOQUEADO` |

La ausencia de entorno para tests críticos debe figurar como limitación y no puede disfrazarse como `PASS`. La recomendación no autoriza el merge: la decisión final de integración es del responsable.
