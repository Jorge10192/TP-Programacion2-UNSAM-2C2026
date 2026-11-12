# E3-1H3 — Orientación contextual REAL y cierre gradual de onboarding

**Fecha:** 12/11/2026. **Rama:** `feature/e3-1h3-guia-contextual-onboarding-real`.  
**Base exacta:** `feature/e3-1h2-navegacion-onboarding-real`, commit `b76b368`, PR #62 (DRAFT).  
**Stacking:** H3 → H2 #62 → H1 #60 → E3-1G #59 → dependencias previas. **No fusionar a main sin aprobación.**

## Objetivo

Cerrar la primera experiencia de configuración con orientación **contextual y verificable** en Ubicaciones, Equipo, Catálogo e Inventario, sin modificar operaciones, permisos, modelos de base de datos, contratos o diseño del Inicio H1.

## Qué incorpora

- Un aviso visual reutilizable `RealSetupGuide`, exclusivamente de lectura, con un enlace a una ruta REAL existente y validada por `realWorkspaceHref`.
- Volver a **Primeros pasos** desde la navegación de listado de los cuatro módulos.
- **Ubicaciones:** mensaje específico si no hay sedes o si todas están pausadas, condicionado a datos leídos y a permisos de administración. El aviso no reactiva ni crea nada.
- **Equipo:** la membresía individual verificada permite comenzar sin invitaciones; incorporar colaboradores es opcional. El mensaje solo aparece si la lectura del equipo fue autorizada, completó sin errores y se observó únicamente la membresía propia.
- **Catálogo:** una lista realmente vacía distingue quién puede crear fichas y quién solo puede consultarlas. En el formulario, al elegir tipo `SERVICIO` aparece una aclaración de que no se deben crear movimientos de stock para servicios.
- **Inventario:** la orientación prioriza sedes faltantes, catálogo vacío, catálogo completo con solo servicios y ausencia de saldos en la consulta general. No sugiere saldos cero cuando hay filtros, errores, consultas incompletas o páginas desconocidas.

## Salvaguardas

1. No se cambian `FastAPI`, SQL, Alembic, RBAC, autenticación ni endpoints.
2. Los avisos hacen **cero POST/PATCH/DELETE** y no habilitan capacidades que el rol no tiene.
3. Se conservan todas las pantallas, rutas, filtros, formularios, estados y políticas comerciales de E2 y E3-1A/G/H1/H2.
4. Ningún aviso deduce inventario total a partir de una página parcial, filtros o errores HTTP.
5. No se usa DEMO, `demoStore`, localStorage ni fixture para generar datos visuales.
6. Las operaciones reales (creación, compras, inventario, invitaciones, ventas) siguen sujetas a sus permisos y solicitudes explícitas. La guía solo navega.
7. Las empresas permanecen aisladas por `businessId` y sesión; H3 no agrega estado entre tenants.
8. No se corrigen ni modifican datos de la empresa a raíz de la observación de «Fruta pack»; cualquier verificación debe comparar `business_id` y `catalog_item_id` exactos.

## QA

- Añadido `tests/real-setup-guidance.test.mjs` a `npm run test:auth`: vacíos válidos, lecturas fallidas, roles sin escritura, directorio privado, catálogos parciales, servicios y filtros de inventario.
- E2E `e2e/real/e3-onboarding-h3.spec.ts`, obligatoriamente con `PYME_DISPOSABLE_QA=1`: cuenta/empresa QA, Ubicaciones vacías, Catálogo vacío, Equipo solo titular, sede y servicio ingresados desde el runner descartable, Inventario sin stock para servicios, regreso entre secciones, detalle de formulario y móvil 390 px, sin operaciones comerciales emitidas desde el navegador.
- Regresión requerida: `npm run build`, `npm run lint`, `npm run test:auth`, `npm run test:businesses`, E2E de navegación REAL, servicios y seguridad por tenant.
- Se requiere que ambos workflows (Frontend e Inventario REAL full-stack) concluyan en `success` **sobre el commit de H3**; una CI anterior no valida cambios nuevos.

## Verificación manual sugerida

1. Entrar con empresa nueva y rol titular; en Ubicaciones y Catálogo vacíos deben aparecer avisos de primera configuración y el vínculo de regreso a Inicio.
2. En Equipo, con solo la propia membresía, debe informarse que incorporar colegas es opcional. Comprobar que no se solicita invitar a nadie para completar H1.
3. Registrar sede activa y un servicio vendible de manera explícita, abrir Inventario: la guía debe indicar que servicios no requieren stock físico; no debe crear movimientos.
4. En Catálogo, abrir formulario y seleccionar tipo Servicio; debe aparecer la aclaración sin bloquear ni alterar la edición.
5. Agregar un bien físico; con datos completos y sin saldos, Inventario orienta al circuito de stock explícito sin dar cantidades ficticias.
6. Aplicar filtros de inventario y provocar lectura restringida en QA descartable: la guía no debe afirmar inventario cero.
7. Probar rol sin permisos: no ofrecer acciones nuevas de escritura ni filtrar datos del Equipo.
8. Cambiar A→B, navegación con menú contraído de H2, F5 y viewport 390px. No deben aparecer datos de otra empresa, scroll horizontal, nuevas solicitudes comerciales ni cambios al Inicio H1.

## Exclusiones y etapa siguiente

No incluye caja, cuentas, QR real, Mercado Pago, indicadores financieros, imágenes de catálogo ni optimizaciones de bundles. Son trabajos separados.

**Cierre previsto de H:** después de CI verde y aprobación visual de H3, resolver el PR H2 duplicado #61; integrar el stack en orden y realizar una regresión final contra una base QA descartable. El trabajo no se integra automáticamente solo por pasar la CI.
