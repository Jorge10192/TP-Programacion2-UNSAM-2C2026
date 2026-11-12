# E3-1C3 — Ubicaciones y Equipo: rediseño visual REAL y QA

**Base dependiente:** PR #50 E3-1C2, rama feature/e3-1c2-datos-empresa-visual; main permanece sin modificar.
**Rama propia:** feature/e3-1c3-ubicaciones-equipo-visual.
**Ámbito:** plataforma-pyme/frontend/ (pantallas REAL), una hoja CSS exclusiva y pruebas E2E con PostgreSQL efímero.

## Alcance

### Ubicaciones
- Encabezado consistente con «Mi perfil», «Mis empresas» y «Datos de la empresa».
- Resumen obtenido de la lista REAL: total, activas, pausadas y principal (sin KPI inventados).
- Fichas de sede con nombre, tipo, estado, principal, dirección, SELL/STORE y enlace de Maps solo si existe.
- Buscar por nombre/tipo/dirección y filtrar por estado **solo en memoria local**, sin nuevos endpoints ni escribir al servidor.
- Formulario contextual de crear/editar: conserva validaciones, nombres de campos, capacidades y cancelación; controles para activar/pausar, hacer principal y asignar trabajadores mantienen operaciones existentes.

### Equipo
- Directorio REAL de integrantes con avatar de iniciales **no persistido**, rol, estado y función cuando está disponible.
- Resumen de integrantes activos/inactivos, búsqueda y filtro **solo para roles con permiso de lectura**.
- Tarjeta explicativa para quienes no tienen permiso de lectura, sin enumerar ni contar miembros.
- Selectores de rol y activación/desactivación solamente para canManageTeam, sin permitir cambiar la propia cuenta ni titular.
- Invitación con token mostrado una sola vez; no hay envío automático de email. Sin renovación ni reenvío implícito.

## Invitación frente a cambio de rol interno

Ambos controles tienen propósitos diferentes y sus opciones **no son idénticas por diseño**, aunque sus etiquetas visuales sean consistentes:

- **Invitar a un nuevo colaborador:** la API acepta solamente `TRABAJADOR` o `ENCARGADO`. Esta operación genera un código de un solo uso; el destinatario debe aceptarlo para incorporar su membresía. El titular o un administrador con permiso de invitación puede iniciarla.
- **Cambiar el rol de un integrante existente:** la API admite `TRABAJADOR`, `ENCARGADO` o `ADMINISTRADOR`. La operación es exclusivamente del `TITULAR_ADMINISTRATIVO` mediante el cambio de membresía, no un camino de invitación directa como Administrador.
- **Titular administrativo:** no aparece como destino en ninguno de los controles. Ninguno permite transferir la titularidad.
- **UX:** el directorio explica que la edición es un cambio interno (ascenso o reasignación), y el formulario de invitación explica por qué Administrador no está disponible. Ambos selectores muestran nombres de rol con la misma capitalización. El cambio de rol solicita confirmación explícita.

No se modifican los contratos de API, el modelo de roles, la autorización del backend ni los datos históricos.

## Navegación visual de Ubicaciones: vistas independientes (revisión UX 12/11)

**Observación en QA manual:** los formularios y asignaciones aparecían debajo de las tarjetas, a veces simultáneamente, sin respuesta clara al pulsar un botón.

**Decisión:** dentro de la misma ruta REAL de Ubicaciones, renderizar **una única vista por vez**:

- **Listado**: resumen, búsqueda, filtros, tarjetas y acciones; sin formularios desplegados al final.
- **Nueva ubicación / Editar ubicación**: pantalla exclusiva, encabezado con nombre de sede (si existe) y **«Volver a ubicaciones»** en la parte superior; formulario prellenado al editar.
- **Asignaciones de sede**: pantalla exclusiva con título y personal asignable; regreso mediante el mismo botón superior.
- Al presionar los botones se aplica feedback visual breve (`:hover`, `:active`, `:focus-visible`) y, al entrar a una vista dedicada, se mueve el foco al botón Volver para mejorar navegación por teclado.
- **Cancelar / Volver** desecha únicamente el borrador sin escribir; **Guardar** conserva la operación API anterior y vuelve al listado cuando se confirma. Los resultados inciertos siguen exigiendo reconsulta explícita. Las alertas de guardado/error se muestran por encima del contenido, no al final de la lista.
- El listado conserva las búsquedas/filtros mientras se cambia de vista dentro de la misma empresa; ningún formulario cruza de tenant. No se crean rutas, pestañas nuevas ni popups reales; es una navegación interna con apariencia de pantalla independiente.
- Se mantienen los botones de pausar/reactivar y hacer principal en las tarjetas, con sus confirmaciones anteriores; estas acciones no abren editores.

**Pruebas ampliadas:** acceso a editar/asignaciones, ocultamiento del listado al entrar, foco en Volver, descarte sin PATCH, guardado real y persistencia, volver al listado y responsive a 390 px (exclusivamente en DB descartable).

## Invariantes técnicos

1. **Sin cambios a backend, migraciones, API, realOperationsGateway, contratos, roles o reglas de permisos.**
2. Los estados busy, uncertain, errores y confirmaciones se conservan: las operaciones inciertas no se reenvían automáticamente.
3. Todo estado de lista se monta en la empresa activa; el cambio de tenant remonta la vista. Sin demoStore ni tokens persistidos.
4. CSS de e3-ops-* aislado de la DEMO; diseño adaptable a 390 px.
5. Los datos de equipo se piden al servidor solo si la empresa permite canReadTeam. El backend sigue siendo la autoridad para cada solicitud.

## Pruebas y revisión

**Pruebas existentes obligatorias:** npm.cmd run build, npm.cmd run lint, npm.cmd run test:auth, npm.cmd run test:operations-real, suite E2E REAL completa y DEMO, y backend con PostgreSQL descartable en CI.

**E2E C3:** frontend/e2e/real/locations-team-visual.spec.ts: crea dos sedes, pausa una, incorpora un trabajador mediante token y confirma visualización, filtros, cancelación sin escritura, ausencia de desborde móvil 390 px y privacidad del equipo para Trabajador. Exige PYME_DISPOSABLE_QA=1.

**QA manual de revisión (sin escrituras sobre datos importantes):**
1. Revisar que el encabezado, cards y estadísticas coinciden con tu empresa REAL; búsqueda/filtro sin peticiones de escritura.
2. Abrir creación y cancelar; abrir «Editar» y cancelar; verificar ausencia de cambios.
3. Probar asignaciones en una empresa de prueba con miembros activos, no en empresas productivas.
4. Revisar Equipo como titular/admin y como trabajador: el trabajador no debe ver el directorio privado ni las acciones de invitación.
5. Verificar 390 px, 768 px y escritorio, menú lateral y focos por teclado.

**Dependencia pendiente:** el PR #50 no se fusiona automáticamente. Primero revisar/aceptar C2 y C3, resolver checks de CI y recién después solicitar autorización expresa para los merges **en orden**. Un PR apilado contra C2 evita introducir C2 en main sin permiso.

## Exclusiones

No se agregan geolocalización, subida de imágenes, invitaciones por email, búsqueda en servidor, política de permisos, altas ficticias ni funcionalidades de caja/QR.
