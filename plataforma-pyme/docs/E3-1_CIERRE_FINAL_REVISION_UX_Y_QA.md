# E3-1 — Cierre de revisión de código, UX e integración final

**Fecha:** 12/11/2026  
**Alcance:** `plataforma-pyme/`, incrementos visuales E3-1E1, E2, F1, G, H1, H2 y H3.  
**Fuente:** rama `feature/e3-1h3-guia-contextual-onboarding-real`, PR #63.  
**Destino:** `main` después de integrar PR #55 → #57 → #58 → #59 → #60 → #62.  
**Aprobación:** revisión visual funcional declarada por el usuario, incluida la mejora final de invitación plegable. La aprobación no equivale a validar cambios de esquema o funcionalidades futuras.

## Decisiones verificadas

| Área | Decisión final |
| --- | --- |
| Navegación | Menú lateral contraíble en escritorio (estado solo en memoria), drawer móvil con Escape y control de foco; conserva nombres accesibles. |
| Inicio | Progreso inicial calculado desde consultas reales a PostgreSQL. Si falta una lectura, se indica explícitamente, sin inventar registros. |
| Nueva empresa | Alta confirmada conduce a `/real/empresas/:id/inicio`; resultado de creación incierto sigue protegido con la política de idempotencia. |
| Ubicaciones / Equipo | Estados vacíos y restricciones por rol explícitas; cambios administrativos requieren acciones deliberadas. |
| Invitaciones | Encabezado «Invitar a un colaborador» plegado por defecto y accesible por teclado; alternar no crea invitaciones. La emisión del código de un solo uso y la aceptación mantienen sus contratos originales. |
| Cuenta personal | «Ingresar código de invitación» identifica la navegación y la pantalla de carga. «Aceptar invitación» queda reservado para el envío explícito del código válido. Barra superior y pruebas comparten título. |
| Catálogo de servicios | `SERVICIO` no admite stock físico; mensaje contextual sin modificar la validación del backend. |
| Inventario | El saldo siempre proviene del ledger REAL, con paginación, versiones, permisos y prevención de reintentos inciertos. |
| Compras / Recepciones | Pantallas independientes y retorno sin registrar escrituras; se preservan montos, conciliación de unidades, stock y recibos. |
| POS / Ventas | Revisión explícita antes de una venta, reglas de medios de pago como declaraciones, idempotencia y permisos; no simula acreditación bancaria. |

## Controles de calidad

1. **Revisión de alcance y código** de navegación, onboarding, invitaciones, catálogo, inventario, compras, ventas, CSS responsive y pruebas asociadas.
2. **Comparación de ramas:** antes de integrar, la cadena aprobada estaba por delante del `main` de referencia y no incorporaba modificaciones de backend, esquemas, Alembic o contratos HTTP. En cada merge se usó la SHA esperada para evitar cambios concurrentes.
3. **CI por incremento:** PR #55, #57, #58, #59, #60, #62 y #63 finalizaron en éxito en ambos workflows sobre sus commits revisados.
4. **CI integral final requerida:** después de retargetear PR #63 a `main`, ejecutar ambos workflows sobre un nuevo commit del PR y exigir `success` antes del merge. La referencia de `main` ya incluye la cadena E3-1E1 a H2.
5. **Pruebas de seguridad funcional:** se conservan recorridos con PostgreSQL efímero para aislamiento de empresas, permisos, pérdida de respuesta, F5, 409, versiones, recuperación, navegación de escritorio/móvil y ausencia de POST no intencional.
6. No se afirma haber realizado pruebas de producción, auditoría de seguridad ofensiva, ni acceso a la base PostgreSQL local del usuario.

## Observaciones y exclusiones

- **«Fruta pack»**: pendiente de comparar `business_id` y `catalog_item_id` de la ficha Servicio con el movimiento de stock histórico observado. La lógica actual del backend rechaza ajustes de stock para `item_type != BIEN`. No modificar registros ni afirmar inconsistencia hasta verificar identificadores.
- **PR duplicados:** #56 corresponde a una alternativa no seleccionada de Compras; #61 a una alternativa no seleccionada de H2, cuya CI full-stack falló. Ambos deben cerrarse como **no integrados**, conservando su historial y enlazando a #55 y #62 respectivamente.
- **Fuera de alcance E3 visual:** acreditación real de pagos, conexión QR Mercado Pago, cuentas bancarias, nueva caja, informes financieros, fotografías de productos, optimización general de bundle, nueva funcionalidad comercial y migraciones. Son futuros bloques independientes.
- El estado de autenticación sigue en memoria deliberadamente; volver a ingresar después de F5 es una decisión del prototipo validado y no se presenta como una sesión persistente.
- No usar credenciales, datos productivos ni PostgreSQL del usuario para ejecutar las E2E de escritura; las suites exigen `PYME_DISPOSABLE_QA=1` y una base efímera.

## Resultado esperado

La cadena aprobada queda íntegra en `main`, PR #63 finalizado en merge, versiones paralelas cerradas sin incluir sus cambios y GitHub Actions verde para el último commit ensayado. La base local del usuario no se modifica por estas operaciones remotas.

Si aparecen regresiones posteriores, abrir un PR independiente con reproducción mínima y pruebas, sin reescribir el histórico de `main`.
