# E3-1H2 — Navegación y primera configuración REAL

**Fecha:** 12/11/2026  
**Rama:** `feature/e3-1h2-navegacion-onboarding-real`  
**Base:** `feature/e3-1h1-inicio-onboarding-real` (PR #60), apilada sobre E3-1G (PR #59).  
**Estado inicial:** PR de revisión en borrador, **sin merge a main**.

## Alcance acotado

1. **Menú lateral contraíble en escritorio** (ancho expandido 254 px, contraído 76 px). Los íconos permanecen utilizables; cada botón conserva nombre accesible y tooltip.
2. **Espacio recuperado para contenido:** menú, barra superior y contenido se alinean mediante una misma variable CSS. No se requiere zoom del navegador.
3. **Preferencia solo en memoria de React:** la contracción sobrevive a la navegación entre módulos y empresas durante la sesión; se reinicia al iniciar sesión o cerrar sesión. No se usa localStorage, cookies, IndexedDB ni backend para el estado visual.
4. **Móvil:** sigue funcionando el menú de apertura lateral completo, con superposición, Escape, trampa de foco y cierre al navegar. La contracción de escritorio no altera el menú móvil.
5. **Alta de empresa:** después de la respuesta confirmada de FastAPI y la limpieza satisfactoria del registro idempotente, se navega automáticamente a `/real/empresas/:id/inicio`. La ruta existente de Datos de la empresa se conserva para acceso manual y compatibilidad.
6. **Mensajes de orientación** en lista vacía y formulario de nueva empresa: se explica qué ocurrirá tras crear y que los servicios no precisan stock físico.

## Reglas preservadas

- Se conserva H1 sin modificar su modelo de los tres pasos, sus consultas GET ni la apariencia de Inicio.
- No se introducen cambios de FastAPI, PostgreSQL, Alembic, endpoints, RBAC, operaciones comerciales, ventas, POS, inventario ni idempotencia.
- No se infiere actividad real a partir de DEMO o datos falsos; sesión de autenticación exclusivamente en memoria.
- Los intentos de creación inciertos permanecen recuperables mediante IndexedDB existente y **no** redirigen hasta que el alta sea confirmada y el registro descartado.
- No se autoriza fusión de PR #59, #60 o este PR sin revisión y aprobación.

## QA automatizada

Nueva prueba E2E `e2e/real/e3-onboarding-h2.spec.ts` sobre API y PostgreSQL descartables (variable `PYME_DISPOSABLE_QA=1`):

- Registro e inicio de sesión de una cuenta QA.
- Creación desde la interfaz, comprobando redirección a Inicio REAL y avance inicial 0/3.
- Contraer y expandir menú en escritorio, usando accesibilidad y dimensiones CSS.
- Navegar a Catálogo conservando el menú contraído.
- Comprobar menú móvil a 390 px, texto legible, cierre tras navegar y ausencia de desbordamiento.
- Comprobar que la navegación no provoca POST a inventario, compras ni ventas.

Regresión exigida: `npm run build`, `npm run lint`, `npm run test:auth`, `npm run test:businesses` y E2E REAL existentes. Para Windows, ejecutar desde `plataforma-pyme/frontend` con `npm.cmd` cuando sea necesario.

## Revisión visual manual (criterios de aceptación)

1. Con una empresa existente y pantalla ancha, pulsar **Contraer menú lateral**. Verificar que solo quedan íconos, se amplía el área central y ningún botón resulta inaccesible. Pasar el cursor para identificar secciones.
2. Cambiar de sección y de empresa: el estado visual se conserva **solo durante la sesión**; no aparecen datos de otra empresa.
3. Expandir y verificar que las etiquetas, títulos y áreas de trabajo vuelven a su presentación habitual.
4. Con ancho cercano a 390 px, pulsar **Abrir menú**, navegar y cerrar con Escape; debe verse el texto completo y no aparecer scroll horizontal.
5. Registrar una cuenta nueva y crear su primera empresa. Debe abrir **Inicio** automáticamente; la guía inicial muestra **0 de 3 preparados** y permite configurar ubicaciones, catálogo e inventario físico cuando corresponda.
6. Cerrar sesión y volver a ingresar: la preferencia visual vuelve a expandido. F5 conserva la política anterior: obliga a autenticarse otra vez.
7. Con empresas exclusivamente de servicios, Inicio mantiene **2 de 2 preparados / No requiere stock** cuando sus pasos requeridos están resueltos.

## Comprobación separada de integridad: «Fruta pack»

La validación del backend `app/modules/purchases/adjustment_service.py` excluye `CatalogItem.item_type != "BIEN"`, incluso para `STOCK_INICIAL`. Ya existe una prueba de rechazo de ajustes de servicios en `test_adjustment_api_integration.py`.

**Pendiente únicamente con datos observables:** contrastar el `business_id` y `catalog_item_id` del servicio visible con los de la operación de stock inicial. Si coinciden, investigar el origen histórico o clasificación; si no coinciden, son registros distintos. **No editar ni borrar datos** como parte de H2.

## Próximos subbloques propuestos

- **H3:** mejorar mensajes y estados vacíos en los primeros módulos (Ubicaciones, Catálogo, Inventario, Equipo) y ejecutar QA transversal de navegación/permisos, conservando contratos actuales.
- Los indicadores financieros REAL, Caja/Cuentas, QR Mercado Pago, fotos y funciones nuevas **no forman parte** de H2 ni se activan por motivos visuales. Requieren evaluación y bloques separados.

## Cierre

Aprobar solo después de CI y revisión humana. Mantener este PR como **DRAFT** y apilado sobre PR #60 hasta que las dependencias se integren en orden.
