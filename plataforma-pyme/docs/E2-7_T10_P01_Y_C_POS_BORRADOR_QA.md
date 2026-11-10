# E2-7 · T10-P01 y T10-C — Política de precio y POS REAL preliminar

**Fecha de aprobación:** 10/11/2026. **Rama:** `feature/e2-7-t10-pos-ventas-real`. **PR:** [#43](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/43), borrador, **sin merge a main**.

## 1. Decisión P01 aprobada expresamente por el responsable

Tras presentar las reglas de precios y descuentos, el responsable respondió: «Ok me parece bien». El alcance aprobado es:

| Rol existente | Sede autorizada para venta | Precio en comando | Descuento |
|---|---|---|---|
| `TITULAR_ADMINISTRATIVO` | Cualquier sede donde pueda operar, o sin sede para servicios | Puede elegir/preparar precio distinto al catálogo | Permitido |
| `ADMINISTRADOR` | Cualquier sede donde pueda operar, o sin sede para servicios | Puede elegir/preparar precio distinto al catálogo | Permitido |
| `ENCARGADO` | Solo sede con asignación `ACTIVA`, según FastAPI | **Igual al precio actual `CatalogItem.price_cents`**, no null | **Cero obligatorio** |
| `TRABAJADOR` | Solo sede con asignación `ACTIVA`, según FastAPI | **Igual al precio actual `CatalogItem.price_cents`**, no null | **Cero obligatorio** |
| Otros / usuarios sin membresía | Ninguna | Denegado | Denegado |

**Garantías FastAPI (independientes de React):**

- En `SaleService.create()` el rol, sede, miembro activo y catálogo del tenant se revalidan en la misma transacción. El precio del catálogo se lee con `FOR SHARE` antes de crear `Sale`, `SaleLine`, `SalePayment` o `StockMovement`.
- Si Encargado/Trabajador cambia `unit_price_cents` o intenta `discount_cents > 0`, FastAPI devuelve **403** sin persistir registros ni debitar stock.
- Si el catálogo no tiene precio `price_cents`, devuelve **422** para esos roles; titular/admin pueden cotizarlo y fijar un precio directamente en la operación de venta.
- Un replay auténtico de venta previamente confirmada (mismo usuario, clave UUID4 y cuerpo, con permisos vigentes de sede) continúa devolviendo **200**, aunque después cambie el precio del catálogo. Una nueva venta de un operario con el precio antiguo es rechazada.
- Un error en una línea de una venta mixta rechaza **toda** la transacción. Ninguna excepción permite vender en una sede no asignada. No se introdujeron roles nuevos ni migraciones de DB.

**Pruebas P01:** `backend/tests/test_sales_price_policy_integration.py` contiene **6 pruebas** que cubren trabajadores/encargados, titular/administrador, descuentos, precios aumentados/disminuidos, ausencia de precio, replays, varias líneas y sede no asignada. Se ajustaron dos tests de regresión previos a la regla nueva para que sus trabajadores usen precio del catálogo sin perder la prueba de revocación.

## 2. T10-C: alcance de la interfaz

**Ruta:** `/real/empresas/{business_id}/pos`, desde **Empresa REAL → Punto de venta REAL · preparar carrito**. Archivos:
- `frontend/src/features/sales/RealPosPage.tsx`: empresa/sede, fichas paginadas, selección, cantidad, precio, descuento y carrito preliminar.
- `frontend/src/features/sales/realPosDraft.ts`: validación pura de cantidades (milésimas, enteros para UNIDAD/PAQUETE/CAJA/SERVICIO), permisos visuales por rol, sede SELL/STORE para bienes, precios y totales exactos.
- `frontend/src/features/auth/RealAuthApp.tsx` y `RealBusinessesPage.tsx`: nueva ruta y acceso; estilos responsive en `auth.css`.

**Restricción deliberada:** el botón **«Confirmación de venta disponible en T10-D» está deshabilitado**. Esta vista no importa ni llama `realSaleWriteCoordinator`, no llama `journal.reserve`, no registra ventas o pagos, no modifica inventario y no persiste el carrito (se pierde al salir/reload). **No afirmar que T10-C ya permite vender.**

**Paginación:** usa la API REAL `GET /catalog?offset=...&limit=100` y la misma semántica que Catálogo REAL: filtra sobre páginas cargadas e indica explícitamente cuándo hay más. No inventa endpoint `?q=`. Prueba de navegador con **501 fichas simuladas solo en el navegador de CI** para verificar 100+100+100+100+100+1 sin permitir un falso listado completo.

**Selección de sede:** muestra las sedes activas con `can_sell`; para bienes exige además `can_store`. El backend sigue siendo la autoridad sobre asignación del Encargado/Trabajador. La UI puede mostrar el nombre de una sede no asignada, pero **no concede permiso de venta**; mejorar filtrado de selector cuando exista un endpoint autorizado para consultar asignaciones propias.

## 3. Evidencia y aceptación

- **P01 primera CI verificada:** [full-stack #42920637980](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42920637980), **SUCCESS**: 892/892 backend, 308/308 frontend, 11/11 Playwright REAL y 6/6 DEMO.
- **T10-C pure Node:** `frontend/tests/sales-real-pos-draft.test.mjs` con 7 casos de cantidades, roles, descuentos, sede, servicio sin sede y carrito sin efectos externos; comando `npm.cmd run test:sales-real-pos`.
- **T10-C navegador:** `frontend/e2e/real/pos-draft.spec.ts`, dos escenarios en CI con `PYME_DISPOSABLE_QA=1` y empresa creada en PostgreSQL efímero. Verifica carrito sin POST y 501 fichas paginadas. La segunda usa fixtures de API simulados solo para la paginación, sin crear 501 artículos en la DB.
- **Estado de CI del commit final T10-C:** pendiente de incorporar tras observar resultados. No atribuir aprobación a un run inacabado.
- **Pruebas manuales locales de T10-C:** todavía **no realizadas**. Se puede verificar visualmente con la empresa TEST usando solo GET y carrito preliminar, pero no se debe intentar confirmar ventas desde este incremento.

## 4. Próximos pasos

**T10-D** añadirá revisión final, pagos declarados, confirmación humana explícita, reserva comprobada en IndexedDB antes de POST y resultados `201/200/409` más recuperación de pendientes. Antes de habilitar el botón, testear la seguridad de precio P01 en API y frontend, incluyendo cambio de precio de catálogo después de que se preparó el carrito y antes del POST, y errores sin duplicación.

**El PR #43 sigue DRAFT, sin merge.** Toda creación real para QA debe correr en PostgreSQL efímero, no en TEST Empresa A.


## 5. Ajuste funcional tras QA visual del usuario (10/11/2026)

El usuario probó en su computadora el POS con **TEST Empresa A** y compartió capturas del producto **Producto A TEST**, el servicio **Servicio A TEST** y un artículo **Producto T08-4 CONTEO** sin precio de catálogo.

**Observaciones verificables de las capturas previas:** el carrito ya multiplicaba cantidad × precio por artículo y el total general era consistente (ejemplo 5 unidades a $2.000 + 4 servicios a $1.000 = $14.000; descuento $2.000, total $12.000). Sin embargo, el subtotal de **cada artículo** no se distinguía explícitamente, el titular veía el campo unitario editable sin advertencia y, si se seleccionaba un artículo ya incluido, se mostraba un error que obligaba a quitarlo.

**Cambio funcional incorporado:**

1. Precio unitario **precargado desde catálogo y bloqueado por defecto**, incluso para el titular. Encargado/Trabajador lo ven siempre bloqueado. Titular/Administrador conserva P01 a través de una acción **explícita** «Modificar precio excepcionalmente» para autorizar la cotización o precio alternativo. «Restablecer precio de catálogo» cancela la excepción; con catálogo sin precio se exige habilitar explícitamente la modificación gerencial.
2. Subtotal del artículo antes de agregarlo: `cantidad_milli × precio_unitario_cents`, HALF_UP por renglón con **BigInt**. El carrito muestra por separado nombre, cantidad, precio unitario y **subtotal del producto**, evitando confundir importe unitario con total.
3. Al seleccionar un artículo ya incluido, el picker recupera su cantidad y precio. El botón se convierte en **«Actualizar en carrito»**; actualiza el mismo renglón sin crear duplicados y admite editarlo desde el carrito.
4. Como integración funcional pequeña con DEMO, cada ficha muestra **«En carrito: X UNIDAD/SERVICIO»** cuando ya se seleccionó. Se reutiliza **el patrón de interacción**, no modelos DEMO ni datos ficticios.
5. Se preserva el subtotal general, descuento y total; **no hay POST** ni movimiento de stock. El control «Confirmación de venta disponible en T10-D» permanece deshabilitado.

**No se copia ahora de DEMO:** imágenes, categorías, existencias o botón «Agregar otro» con cantidad acumulativa; la fuente REAL debe obtener catálogos y stock **por empresa/sede con permisos, unidades y versiones**, y no asumir campos presentes solamente en DEMO. Antes de sumar stock disponible hay que consultar Inventario REAL de la sede y revalidar el stock atómicamente al confirmar en T10-D. La armonización estética se deja para una fase de diseño, como solicitó el usuario.

**Regresiones agregadas:** 3 pruebas Node para subtotal individual (incluidos 4 × $1.500, 5 × $2.000, redondeo HALF_UP y límites de centavos) y ampliación de Playwright REAL para asegurar bloqueo inicial de precio, habilitación gerencial explícita, subtotal por artículo, actualización del renglón sin duplicados y **cero POST**. La verificación completa de la última versión debe consignarse después de observar el run final de CI; **las capturas existentes no prueban todavía los controles nuevos**.
