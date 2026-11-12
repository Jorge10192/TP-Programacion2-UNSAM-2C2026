# E3-1G — Punto de venta e historial de ventas REAL

**Base aprobada:** PR #58 / \`feature/e3-1f1-inventario-vistas-real\`, commit \`dbdb219\`.  
**Rama:** \`feature/e3-1g-pos-ventas-visual-real\`, PR apilado contra #58.  
**Estado:** implementación para CI y revisión visual, no integrada en \`main\`.

## Objetivo

Continuar la coherencia visual de E3. Reorganizar el **POS REAL** y el **Historial de ventas** de modo que la selección del catálogo y preparación del carrito sean claras, mientras que la revisión/confirmación y la visualización de un comprobante ocupen vistas exclusivas. No introducir lógica de cobro, stock o descuentos nueva.

## POS REAL

- Mantiene selector de sede, búsqueda de artículos (solo catálogo cargado), selección con precio de lista no editable por defecto, excepción de precio solo para roles autorizados, subtotales exactos, máximo de 30 artículos y carrito.
- Presentación visual: cabecera empresarial, tarjetas de catálogo en rejilla, carrito en columna lateral en escritorio y debajo en móvil, controles de pago ordenados.
- \`RealPosCheckout\` **permanece montado** durante el flujo para preservar la revisión de IndexedDB y el estado del intento. Al pasar a \`review\`, \`sending\`, \`pending\` o \`confirmed\` el borrador del carrito queda **visualmente oculto**, pero no destruido. \`Volver a editar\` de la revisión restaura la pantalla completa sin perder datos.
- \`pending\` se abre directamente como pantalla de recuperación ante reingreso si existe intento guardado. Solo una decisión explícita y el mismo \`request_id\`/cuerpo permiten reenvío. No hay POST automático.
- Confirmar venta REAL continúa **deshabilitado por defecto**. Se habilita únicamente cuando el entorno se configura explícitamente con \`VITE_PYME_ENABLE_REAL_SALES=1\`, además de las reglas de negocio y permisos de FastAPI. Esta bandera frontend nunca sustituye RBAC.
- Los pagos son **declaraciones**; Mercado Pago declarado no implica acreditación bancaria/externa.

## Historial de ventas REAL

- Listado con tarjetas, indicador de cantidad cargada (sin afirmar totales globales), filtro de sede enviado a API y búsqueda local de IDs, sede y responsable. La búsqueda local solo aplica a páginas consultadas.
- **Ver comprobante** cambia a una pantalla exclusiva con «Volver al historial» y conserva los filtros previos. Las consultas por UUID y por \`request_id\` siguen siendo exclusivamente \`GET\`.
- Comprobante muestra fecha, sede, **nombre de quien registró la venta**, renglones y snapshots originales, subtotales/descuento/total, pagos declarados y saldos históricos de inventario. El UUID de usuario y las claves quedan en «Identificadores de trazabilidad».
- Los nombres se resuelven exclusivamente desde el usuario actual o desde el directorio empresarial cuando \`canReadTeam\` permite consultarlo. Si la identidad no está disponible, se muestra «Nombre no disponible». Se muestran nombres actuales de perfil, no snapshots históricos de nombres.
- Recuperación mediante solicitud 404 mantiene advertencia original; **404 no prueba que la venta original no ocurrió**. No se ofrece un POST nuevo desde el historial.

## No se modifica

Backend, SQL, Alembic, contratos DTO, permisos y aislamientos por empresa, algoritmos BigInt/HALF_UP, condición de inventario, versiones, carrito persistido/no persistido, IndexedDB, \`Idempotency-Key\`, precio unitario y sus excepciones, políticas de descuentos ni modo de validación T10.

## Pruebas

- Nuevo E2E \`frontend/e2e/real/e3-pos-sales-visual.spec.ts\`: empresa PostgreSQL descartable; ventas confirmadas por API; navegación listado → comprobante exclusivo → POS → revisión exclusiva → volver; nombre del actor, búsqueda local, 390px y cero POST UI.
- Regresión de \`sales.spec.ts\` adaptada al regreso desde el comprobante antes de buscar por otra solicitud.
- Se mantienen sin suprimir: \`pos-draft.spec.ts\`, \`sales-read.spec.ts\`, \`sales-recovery.spec.ts\`, \`sales-invalid-payment-policy.spec.ts\` y \`flow-purchase-to-sale.spec.ts\`.
- Compilar con TypeScript, lint Oxlint y pruebas \`test:sales-real-pos\`, \`test:sales-real-checkout\`, \`test:sales-real-read\`, \`test:sales-real-pending\`, \`test:sales-real-write\`; ejecutar E2E con \`PYME_DISPOSABLE_QA=1\` y backend PostgreSQL **descartable**.
- Si la CI del PR está incompleta o falla, mantener en borrador y corregir antes de solicitar revisión.

## QA manual (sin generar escrituras)

1. Entrar al **Punto de venta REAL** con empresa de prueba: seleccionar sede, artículo, cantidad; comprobar precio unitario y subtotal. Agregar al carrito; revisar importe declarado.
2. Presionar «Revisar venta y pagos»: verificar la pantalla exclusiva con renglones y total; «Volver a editar» recupera el carrito y pagos. **No confirmar ventas sobre tu base habitual**.
3. Abrir **Historial de ventas**: verificar filtros, las tarjetas y nombre del vendedor.
4. Seleccionar «Ver comprobante»: observar pantalla completa sin listado debajo, pagos **declarados** y saldos históricos. Volver al historial; probar consulta por \`request_id\`.
5. Probar anchos 390px y escritorio. Verificar permisos, operación de caja no incluida, y que el historial no crea nuevas ventas.

## Dependencias

Cadena E3 todavía sin merge: #55 → #57 → #58 → PR de E3-1G. No fusionar hasta aprobación manual y controles de CI; no tocar \`main\` ni bases locales en esta etapa.

## Pendiente de posteriores incrementos

Optimización de bundle, refinamiento transversal final de estética, fotos con almacenamiento REAL y dinero/caja/QR reales no se implementan por este cambio visual.

## Ajustes posteriores a la revisión manual del usuario — E3-1G

Tras probar el POS y el historial en VS Code, el usuario propuso tres mejoras de operabilidad tomadas como referencia de la DEMO:

### A. Descuento visible en el cálculo de cobro

- El descuento sigue siendo **global a la venta**, no una modificación de precio unitario, categoría o inventario. Los descuentos de monto fijo están disponibles solo para los roles ya autorizados.
- Se visualiza explícitamente dentro de **Pagos declarados** la cuenta **subtotal de artículos − descuento = total a cobrar**, con formato ARS.
- La cifra inicial de pago sigue el total calculado mientras no se edite manualmente. Si se modifican montos a mano, se indica faltante/exceso y el control de completar permite ajustar el último medio.
- No se modifica el algoritmo exacto HALF_UP, ni contratos o persistencia de pagos.

### B. Límite orientativo de stock disponible

- Solo para **bienes físicos**, al elegir artículo y sede habilitada para almacenamiento, se consulta exclusivamente por **GET** inventory/balances filtrando ubicación y artículo, leyendo un saldo autorizado por empresa.
- Se muestra cantidad en unidad real (milésimas exactas), sede y fecha del saldo si existe. Sin fila de saldo se informa cero; servicios no requieren stock físico.
- Se bloquea agregar o actualizar la línea si la cantidad supera el último saldo consultado o si la lectura sigue pendiente/falló; existe **Actualizar disponibilidad** explícito.
- El borrador **no reserva stock**. FastAPI conserva rechazo 409 si la disponibilidad cambia antes de confirmar. E2E de carrera: stock existente al agregar, agotado por otra operación antes de registrar.
- Sin endpoints nuevos, cambios de stock automáticos ni lecturas de sedes ajenas.

### C. Completar último medio de pago

- Se agrega **Completar saldo restante en este medio** en el último medio declarado, respetando anteriores.
- La función pura completa el importe exacto como **total a cobrar − suma de medios anteriores**, en centavos BigInt, actualizando únicamente el último.
- Si los anteriores ya cubren el total, tienen importe inválido o no queda un importe positivo, se muestra error sin modificar pagos.
- No se acredita dinero bancario, tarjetas, Cuenta DNI ni Mercado Pago.

### Regresiones y cierre

Se amplían tests de centavos exactos, cambios de descuento, pagos mixtos y errores, además de E2E con stock cero, refresco por GET y límites. Las pruebas existentes de F5, precio excepcional, 409 concurrente, pago mixto e idempotencia se conservan.

Se actualiza la prueba histórica que esperaba el encabezado Punto de venta en el estado **Recuperación de venta** tras F5, reflejando la pantalla independiente de E3-1G sin cambiar el código transaccional.

**No fusionar a main sin CI verde y aprobación del usuario.**


## Refinamiento de interacción POS posterior a la revisión del usuario (12/11/2026)

Las capturas REAL y DEMO orientaron un cierre visual adicional. Se mantiene la distinción entre selección y confirmación, que protege la trazabilidad.

1. **Tarjetas del catálogo y unidades:** fichas con icono neutro, categoría, SKU, precio, existencia de la sede seleccionada y acción visible «Agregar unidades». Elegir un artículo abre su editor de cantidad y precio autorizado; no hace una venta. El carrito incluye botones +/− para cambiar una unidad sin alterar el precio, más «Editar cantidad» para unidades fraccionables. No se duplica un renglón para el mismo catálogo.
2. **Stock en la sede:** los saldos se leen desde \`GET /inventory/balances\` filtrado por ubicación y paginado (hasta 20 páginas de 500), con indicador de resultado incompleto. Cada tarjeta muestra únicamente un saldo **conocido**, por su propia unidad. Un artículo ausente de un resultado incompleto se muestra como «Saldo no verificado», nunca como cero. No se suma stock de diferentes artículos o sedes. El editor conserva su consulta por artículo/sede y bloquea agregar más que el saldo consultado; el botón + del carrito también respeta disponibilidad conocida. FastAPI vuelve a validar el stock al confirmar, y ninguna vista reserva inventario.
3. **Descuento y total:** dentro del resumen del carrito, subtotal de renglones, campo de descuento, descuento aplicado y total a cobrar quedan en ese orden, usando los cálculos exactos ya existentes. Carrito vacío o inválido no inventa un total final.
4. **Completar pago:** se conserva \`completeLastPosPayment\` (BigInt/centavos exactos) y se agrega indicación contextual. Este botón requiere un carrito con total positivo; sin carrito no hay saldo que completar y queda deshabilitado. Rellena exclusivamente el último medio después de deducir importes anteriores, sin POST.
5. **Dos pasos inequívocos:** «Finalizar venta» abre la **pantalla exclusiva de detalle completo pendiente de confirmación**: empresa, sede, renglones, cantidades, precio, subtotales, descuento, total, medios declarados y notas. Recién allí aparece «Confirmar y registrar venta REAL», condicionado a aceptación explícita y a la bandera de habilitación de mutaciones. El botón «Volver a editar» recupera carrito y pagos sin nuevo intento.
6. **Imágenes:** se usan iconos de reserva mientras no exista almacenamiento REAL de fotografías de artículos. Las futuras miniaturas deben obtenerse del **Catálogo REAL**, con vínculo al artículo, validación y persistencia backend por empresa. No cargar imágenes desde DEMO/localStorage como datos reales ni incorporar fotos hardcodeadas.

QA: suites existentes POS/recovery, test E2E E3-1G extendido para saldo visible de un producto físico, límite de cantidad, incremento/decremento de carrito, descuento y completar pago; integración en DB descartable. No fusionar hasta CI y aprobación del usuario.
