# E2-1 — Hoja de revisión independiente para el compañero

**Proyecto:** Asistente PyME — API generalista de gestión multiempresa y multirrubro  
**Materia:** Programación 2 (UNSAM)  
**Fecha de preparación:** 8 de noviembre de 2026  
**Tipo:** consigna de revisión técnica independiente, **NO informe de auditoría ni dictamen aprobado**  
**Rama de referencia:** `main`  
**Commit base de código y documentación (anterior a esta hoja):** `c54461d18020f22483273dad3f14bf6308522fbc`  
**Carpeta exclusiva:** `plataforma-pyme/`  
**Modo de revisión:** estrictamente lectura del repositorio; no editar, hacer push, introducir migraciones ni corregir archivos.

## 1. Objetivo y regla de evidencia

Evaluar si el bloque **E2-1 — autenticación, empresas, autorización por tenant e invitaciones/equipo** está correctamente implementado, probado y documentado. No basta con que las pruebas pasen: revisar decisiones de diseño, consistencia entre capas, contratos HTTP, transacciones, aislamiento de empresas, seguridad, esquema SQL y trazabilidad académica.

La revisión debe **distinguir cuatro categorías**: (a) observado directamente en código/DDL/pruebas; (b) reproducido por el revisor en un entorno de desarrollo; (c) reportado por el desarrollador o CI, sin reproducción propia; (d) previsto, diferido o no implementado. Nunca inferir código que no se pudo consultar. Si falla el acceso al repositorio, detener la revisión del ítem afectado y documentar la limitación.

**No confundir:** WALOS es solo un negocio de ejemplo, no el producto. React sigue siendo una DEMO local desacoplada de esta API. RF-03–RF-07 todavía son TO-BE en backend; no se debe declarar terminado el TP íntegro ni certificar un despliegue público.

## 2. Fuente de verdad y enlaces

- Repositorio: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026
- Commit fijado para auditar: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/commit/c54461d18020f22483273dad3f14bf6308522fbc
- Código: `plataforma-pyme/backend/` (especialmente `app/modules/auth/`, `app/modules/businesses/`, `app/infrastructure/models/`, `alembic/versions/` y `tests/`).
- Documentos: `plataforma-pyme/entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md` a `05_MATRIZ_API_Y_TRAZABILIDAD.md`.
- Diagramas: `entrega-programacion-2/diagramas/03A_CLASES_IDENTIDAD_Y_CATALOGO.puml`, `03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg` y `03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md`.
- Arquitectura de ejecución: `plataforma-pyme/backend/README.md`, `plataforma-pyme/compose.yaml` y `.github/workflows/plataforma-pyme-backend.yml`.
- **CI del último commit funcional C.4b:** https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42472269979 — GitHub informa `completed / success`, correspondiente al SHA `8cd167481291b78628da0d038c7414cc26e3a311`.
- Los commits posteriores de **C.5** solo modifican documentación y UML 03A. No atribuirles el CI del commit funcional ni suponer que ejecutaron pruebas nuevas.

Al comenzar, verificar `git rev-parse HEAD` y registrar el SHA que efectivamente se auditó. Si `main` avanzó, usar el SHA fijado arriba o declarar explícitamente el nuevo alcance; no mezclar estados de commits distintos.

## 3. Evidencia previa aportada por el desarrollador — contrastar, no dar por revalidada

| Corte | Alcance | Pruebas locales reportadas |
|---|---|---:|
| C.1 | RBAC de empresa; regresión de idempotencia | 98 |
| C.2 | PATCH de perfil empresarial | 125 |
| C.3 | Emisión de invitaciones | 147 |
| C.4a | Aceptación autenticada | 171 |
| C.4b | Directorio y gestión de equipo | **195** |
| C.5 | Corrección de documentos y UML 03A | **Sin nueva ejecución de pruebas por este corte** |

El desarrollador compartió para C.4b (Windows) `195 passed in 23.86s`, `alembic current` = `e213c4_acceptance (head)`, `alembic check` = `No new upgrade operations detected.`, Docker API y DB `healthy`, y `GET /ready` = `status: ready, database: ok`. El revisor deberá clasificar estos datos como **evidencia reportada** a menos que los reproduzca. El CI indicado corresponde al código funcional (no al commit de esta guía).

## 4. Matriz de revisión funcional y seguridad

Registrar **CONFORME / HALLAZGO / NO VERIFICADO / NO APLICA**, con archivo, función o test exacto para cada conclusión.

| Área | Qué comprobar | Riesgo a descartar |
|---|---|---|
| Registro RF-01 / CU-01 | Validación y normalización de email; UNIQUE SQL; Argon2id; respuesta sin hash ni contraseña | Alta duplicada, secretos expuestos, errores no controlados |
| Sesiones RF-01 / CU-02 | Login, expiración, token opaco; huella persistida, `/me`, revocación `/logout`; cuenta deshabilitada | Sesiones revocadas aún válidas, token claro en DB |
| Alta de empresa RF-02 / CU-03 | Empresa, fundador histórico y membresía titular inicial en **una transacción**; idempotencia por actor+clave+contenido | Empresas huérfanas, duplicados concurrentes, reintentos incompatibles |
| Perfil empresarial C.2 | `PATCH /api/v1/businesses/{business_id}`; campos permitidos; RBAC titular/administrador; 403/404/409/422 | Escalada de privilegios, escritura cross-tenant |
| Emisión de invitación C.3 / CU-12a | `POST .../invitations`; permisos; rol solo ENCARGADO/TRABAJADOR; TTL 7 días; único pendiente por email/tenant | Otorgar acceso antes de aceptar; repetir token o guardar secreto plano |
| Aceptación C.4a / CU-12b | `POST /api/v1/invitations/accept`; email de cuenta autenticada; estado/vencimiento; consumo único; crear/reactivar membresía | Reutilización, doble membresía, rollback incompleto, invitación ajena |
| Equipo C.4b — GET | `GET .../memberships` solo titular/administrador; incluye activos/inactivos del tenant y solo campos públicos previstos | Filtrar mal el tenant, exponer datos sensibles |
| Equipo C.4b — PATCH | `PATCH .../memberships/{membership_id}` solo titular vigente; cambiar roles operativos/estado; prohibir tocar titular actual/histórico | Auto-desactivación del titular, escalada a titular, editar otra empresa |
| Estado empresa/sesión | `SUSPENDIDA` y `INACTIVA` niegan operaciones según política; rollback y errores coherentes | Operar con privilegios vencidos o de otra empresa |
| Concurrencia | Bloqueos SQL; conflictos únicos; idempotencia y aceptación bajo solicitudes paralelas independientes | Verificar y escribir fuera de la misma transacción |

**Matriz RBAC a contrastar con código**: TITULAR_ADMINISTRATIVO puede editar perfil, invitar, leer y administrar miembros; ADMINISTRADOR puede editar perfil, invitar y leer equipo, **no** administrar roles/estados; ENCARGADO y TRABAJADOR no reciben esas facultades. `business.view` sí corresponde a miembros activos del tenant, sujeto al estado aplicable. La mera existencia de la función de permisos no acredita que cada ruta la invoque correctamente.

## 5. Integridad SQL, migraciones y UML 03A

Verificar modelos SQLAlchemy y revisiones Alembic, incluidos `users`, `auth_sessions`, `businesses`, `memberships`, `business_creation_requests` y `business_invitations`. Examinar PK/FK, índices parciales y CHECK, su correspondencia con DTO/servicios, y el grafo de revisiones hasta `e213c4_acceptance`. **No usar `stamp` ni destruir una base para ocultar deriva.**

Puntos específicos:

1. `Membership`: UNIQUE `(business_id,user_id)`; el índice `uq_memberships_one_active_owner` impone **como máximo un** titular ACTIVO, mientras que el servicio de alta garantiza el titular inicial. No atribuir al índice la obligación de que exista un titular.
2. `Business`: el `founder_user_id` representa fundador histórico, **no** autorización automática ni propiedad legal.
3. `BusinessInvitation`: FK `invited_by_user_id` obligatoria (emisor); `email_normalizado` como destinatario (no FK a Usuario); `accepted_by_user_id` opcional y `accepted_at` coherente con estado ACEPTADA mediante CHECK.
4. Token: nunca en claro dentro de la tabla; comprobar hash SHA-256 y unicidad; vencimiento funcional incluso si el estado persiste como PENDIENTE.
5. Aceptación: una sola transacción debe escribir consumo de invitación y alta/reactivación de membresía; buscar tests de rollback.
6. UML **03A**: revisar que PlantUML y SVG editorial no se contradigan. El SVG resume **emisor**, el PUML contiene también **aceptante opcional** y fundador histórico. Ubicacion, ArticuloCatalogo y Proveedor continúan modelados como TO-BE.
7. UML **03B/03C**: confirmar que C.5 no los modificó y no interpretar reglas comerciales futuras como ya implementadas.

## 6. Verificación de documentación y arquitectura

Contrastar por lo menos:

- **01**: RF-01/RF-02 y límites reales; RF-03–RF-07 pendientes. No confundir la columna de alcance propuesto con implementación.
- **02**: CU-01/CU-02/CU-03/CU-12, precondiciones, idempotencia, errores, atomicidad y autorización.
- **03 + 03A**: entidades, estados, cardinalidades, titular inicial e histórico; relaciones y FKs verdaderas.
- **04**: implementación Router → Service → Repository → PostgreSQL, sesiones por petición, commits y rollbacks; separar secciones históricas propuestas del AS-IMPLEMENTED.
- **05**: métodos/rutas, roles, errores, migraciones, tests y estados de evidencia en correspondencia con el código.
- **README backend**: comandos reproducibles, limitaciones, no exposición de secretos ni sugerencias destructivas.
- **CI**: confirmar que la ejecución de referencia realmente revisó el commit funcional C.4b. El workflow puede no activarse por cambios solo documentales en C.5.

**Especial atención:** textos históricos aún pueden mencionar estados anteriores; reportar una contradicción real que afecte al lector, distinguiéndola de un antecedente explícitamente rotulado como histórico.

## 7. Ejecución opcional de pruebas en entorno de desarrollo

La auditoría del repositorio es de **solo lectura**. Si el revisor decide ejecutar pruebas, hacerlo exclusivamente en una **base de desarrollo propia y aislada**, con Docker disponible, nunca contra producción ni datos de una empresa real.

Desde `plataforma-pyme/`, en PowerShell (ajustar el entorno de Python al equipo):

```powershell
git rev-parse HEAD
git status --short
cd backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
cd ..
docker compose --profile api up -d --build --wait api
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/ready
```

No pegar en el informe secretos, tokens, `.env` ni contraseñas. No ejecutar `git clean -fd`, `git reset --hard`, `docker compose down -v` ni migraciones destructivas. El repositorio puede contener archivos personales no versionados; preservarlos.

Si no se ejecutan las pruebas, indicar «no reproducidas por el revisor» y utilizar el CI/la evidencia aportada con atribución correcta. **No sumar cifras de pruebas de distintos cortes**: 195 es el total reportado para C.4b, no 98+125+147+171+195.

## 8. Alcances expresamente pendientes

**No exigir como implementado en E2-1:** transferencia de titularidad, auditoría histórica de cambios de roles, edición de puesto, cancelación/rechazo/reenvío/listado de invitaciones, verificación de email, envío automático, rate limiting y demás endurecimientos para producción, integración del frontend con API, despliegue público, ubicaciones RF-03, catálogo RF-04, compras RF-05, inventario RF-06, ventas RF-07, ni funciones diferidas de gastos/caja, Mercado Pago y QR real.

Sin embargo, **sí** se puede señalar que una de esas capacidades faltantes limita seguridad, operatividad o cumplimiento académico; distinguir entre «bug contra alcance E2-1», «riesgo real» y «mejora futura».

La consigna académica exige una API RESTful con un conjunto suficiente de requerimientos funcionales (incluidos al menos cinco de alto nivel según documentos de entrega), pruebas, CI, patrones y despliegue. El éxito de E2-1 **no prueba por sí solo** que todos esos requisitos estén completos.

## 9. Entregable solicitado al revisor

Presentar una revisión técnica independiente, con este orden:

1. **Identificación:** fecha, SHA efectivamente revisado, archivos accesibles y límites del acceso.
2. **Dictamen por área:** autenticación, multiempresa, RBAC, creación idempotente, emisión, aceptación, administración de equipo, transacciones, migraciones, diagramas y documentos.
3. **Hallazgos priorizados:** para cada uno: ID, severidad (CRÍTICA/ALTA/MEDIA/BAJA), archivo y línea o función, evidencia reproducible, escenario/impacto, corrección propuesta y si bloquea el paso a RF-03.
4. **Matriz de trazabilidad:** RF → CU → endpoint → servicio/repositorio/modelo → tests → estado real. Dejar como pendiente cualquier relación no corroborada.
5. **Pruebas/evidencias:** diferenciar resultados observados por el revisor, registros de CI y resultados comunicados por el desarrollador.
6. **Pendientes reconocidos:** fuera de E2-1, riesgos para producción y requisitos del TP aún no cubiertos.
7. **Conclusión de avance:** `APTO PARA CONTINUAR / APTO CON OBSERVACIONES / BLOQUEADO`, justificación y condiciones verificables para iniciar RF-03.

Para cada afirmación técnica sustantiva, citar **rutas concretas, clases, métodos o tests**, no opiniones generales. No atribuir éxito a CI de C.5 sin verificar su ejecución ni afirmar conformidad total de seguridad solo por el número de tests. Si no hay hallazgos críticos, describir también las limitaciones de cobertura verificadas.

### Plantilla breve por hallazgo

```markdown
### H-E2-XX — Título
- Severidad:
- Tipo: defecto / seguridad / documentación / deuda técnica / mejora
- Evidencia (archivo, línea, método, test o respuesta HTTP):
- Comportamiento observado:
- Comportamiento esperado según RF/CU/contrato:
- Impacto y reproducibilidad:
- Recomendación mínima:
- ¿Bloquea RF-03?: Sí / No / Por verificar
```

## 10. Criterio de cierre

La revisión de E2-1 se considera **realizada** solo cuando el compañero aporte sus hallazgos y evidencia; **esta hoja no es un dictamen**. El siguiente paso del equipo será evaluar los hallazgos, corregir únicamente aquellos que lo ameriten y, después, comenzar **RF-03 — Ubicaciones** como nuevo incremento funcional. No modificar el repositorio durante la auditoría independiente.
