# E2-2 D — Alcance pendiente: asignaciones y autorización por ubicación

**Proyecto:** Asistente PyME · **Fecha:** 08/11/2026 · **Estado:** PLAN TÉCNICO / NO IMPLEMENTADO  
**Bloque:** E2-2 — Ubicaciones empresariales y autorización por ubicación  
**Corte verificado:** código E2-2 C en `7abafd8208965cd99b0116e02ffc5240d23f218f` (CI 3/3), documentación/03A sincronizados luego.  
**Evidencia local:** Windows: **325 passed in 36.91s**, Alembic `e22b_location_casa (head)` sin deriva, Docker API y PostgreSQL `healthy`, `/ready` = `ready/ok`.

## 1. Motivo de esta fase

La guía maestra establece que E2-2 contempla **pertenencia, permisos y relaciones por ubicación**. E2-2 A/B/C implementa efectivamente:

- `locations` con FK a Empresa, tipos `LOCAL/FERIA/DEPOSITO/OFICINA/CASA/OTRO`, capacidades independientes, estado y principal activa única.
- Crear, listar, consultar, editar, pausar/reactivar y elegir principal en **seis rutas reales** por tenant, con sesión y membresía empresarial revalidadas.
- RBAC empresarial: TITULAR_ADMINISTRATIVO y ADMINISTRADOR administran todas las ubicaciones propias; miembros activos de otros roles pueden consultarlas. La empresa suspendida es solo lectura.
- 325 tests de regresión local + CI PostgreSQL/Python 3.12/3.14/Docker correctos.

**No existe aún** asignación de integrantes a sedes concretas ni un permiso operacional que restrinja las futuras compras, stock y ventas a esas sedes. Por lo tanto, **NO declarar E2-2 completo ni generar la hoja `E2-2_ENTREGA_PARA_REVISION.md` hasta resolver explícitamente este alcance o aprobar su diferimiento**.

## 2. Política sugerida para no romper E2-1 ni E2-2 B/C

1. Mantener la **identidad global** de Usuario y la **Membresía por Empresa**; la ubicación **nunca** crea un rol global ni una membresía independiente.
2. Mantener la lectura administrativa/operativa actual: miembros activos pueden listar y consultar ubicaciones del tenant, sin cruzar empresas.
3. Mantener titular/administrador con permiso administrativo empresarial para crear/editar/pausar/designar principal, independientemente de asignaciones laborales futuras.
4. Definir la asignación **Membresía de Empresa ↔ Ubicación** como vínculo de trabajo (potencialmente muchos-a-muchos) para ENCARGADO/TRABAJADOR, con revocación. Un usuario de varias empresas puede tener asignaciones independientes.
5. **Las operaciones comerciales futuras** deben verificar simultáneamente: sesión ACTIVA, membresía ACTIVA, empresa ACTIVA, ubicación ACTIVA, capacidad `can_sell` o `can_store` según la operación, y asignación vigente donde corresponda. **Asignación no concede permisos de administración por sí sola.**
6. Nadie debe obtener acceso a sedes de otro tenant por conocer UUIDs. La suspensión de una membresía cancela su acceso efectivo aunque existan asignaciones históricas.
7. Evitar reescribir modelos o migraciones de E2-0/E2-1. Si se requieren nuevos índices/constraints para FKs compuestas, agregarlos mediante migración Alembic aditiva y pruebas, no edición retrospectiva.
8. No inventar dependencias del stock que todavía no existen. Al cambiar `can_store`, indicar que la prohibición con saldos positivos se implementa en E2-5, no validarla de manera ficticia ahora.
9. No modificar el frontend DEMO ni conectar React a FastAPI en E2-2 D; integración pertenece a E2-7.

## 3. Contrato que falta terminar antes de codificar

| Pregunta técnica | Criterio sugerido / protección |
|---|---|
| ¿Qué entidad representa la asignación? | Una asociación de una Membresía **del mismo tenant** con una Ubicación; comprobar tenant tanto en SQL como en el servicio. Evitar roles empresariales duplicados. |
| ¿Quién puede gestionar asignaciones? | Solo TITULAR_ADMINISTRATIVO / ADMINISTRADOR de la empresa ACTIVA. No permitir que trabajadores se autoasignen. |
| ¿Se permite asignar un titular/admin a una sede? | Opcional como información, **nunca** como fuente de su autoridad administrativa. |
| ¿Qué significa una asignación activa? | Solo si la ubicación, empresa y membresía están activas, y la asignación no fue revocada. |
| ¿Qué se muestra a los trabajadores? | Mantener lectura de ubicaciones como contrato actual; la restricción granular se aplicará a la **operación** sobre una sede, no se infiere que el domicilio deba ser público. Evaluar si `address/map_url` requieren visibilidad más estricta antes del despliegue. |
| ¿Cómo se comporta el caso sin asignaciones? | Denegar las **operaciones por sede** de trabajador/encargado hasta asignarlo, no crear accesos implícitos. Lectura actual sigue intacta. |
| ¿Se permite cambiar permiso `can_store` con stock? | Aún sin inventario persistido, puede cambiarse; E2-5 agregará la regla de negocio cuando exista stock real. |
| ¿Se habilitan operaciones de inventario o venta aquí? | No. E2-2 define política reutilizable y gestión de asignaciones; E2-4/5/6 la consumen. |

Estas reglas son **propuesta de diseño** para E2-2 D, no funcionalidad probada ni decisión académica irrevocable. Mantener cambios localizados y transaccionales.

## 4. Secuencia de implementación verificable

1. Especificar el modelo de asignación, sus constraints de pertenencia al mismo tenant, alta/revocación y comportamiento ante membresía/ubicación pausadas.
2. Añadir modelo SQLAlchemy y nueva migración aditiva. No alterar `e22a_locations`, `e22b_location_casa` ni migraciones E2-1.
3. Añadir servicios/repositorio/rutas de asignaciones al módulo `locations`, reutilizando identidad/sesión y bloqueos existentes sin mutar el comportamiento de creación y gestión de ubicaciones.
4. Exponer una política de autorización pura y testeable para futuros comandos por ubicación; para ubicaciones ACTIVA y capacidades compatibles, con rol/miembro/asignación coherentes.
5. Probar: titular/admin, encargado/trabajador, membresía inactiva, empresa suspendida, ubicación PAUSADA, asignación revocada, IDs ajenos, dos empresas del mismo usuario, unicidades, concurrencia y rollback.
6. Validar `alembic upgrade head`, `current`, `check`, Pytest completo, CI Python 3.12/3.14 y Docker; confirmar Windows local.
7. Reconciliar RF-03, CU-04, Documentos 01–05 y UML 03A (PUML/guía/SVG editorial). Dejar 03B y 03C sin cambios.
8. **Solo entonces** generar `plataforma-pyme/docs/revisiones/E2-2_ENTREGA_PARA_REVISION.md` con SHA de cierre, allowlist del bloque, decisiones deliberadas, exclusiones, resultados y rama `review/e2-2-ubicaciones`. El compañero crea `E2-2_INFORME_DE_REVISION.md` en su rama y presenta PR **sin fusionarlo**.

## 5. No confundir los cortes

| Corte | Estado |
|---|---|
| E2-2 A/A.1 | Persistencia y CASA, validados localmente |
| E2-2 B | POST + GET lista/detalle, validados localmente (277 pruebas) |
| E2-2 C | PATCH edición, PATCH estado, PUT principal, validados localmente (325 pruebas) |
| **E2-2 D** | **Pendiente:** asignaciones y permisos operativos granulares por ubicación |
| E2-2 entrega formal | **No creada** hasta resolver E2-2 D o diferimiento aprobado |
| E2-3 Catálogo | Sin iniciar; no anticipar código |

**Alcance cerrado hasta C:** ubicación de empresa con controles efectivos por tenant y rol administrativo. **Brecha reconocida:** permisos por ubicación para operadores y futuros módulos comerciales. Una matriz de pruebas exitosa no demuestra una funcionalidad ausente.
