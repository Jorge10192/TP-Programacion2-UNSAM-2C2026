# E0-A — Matriz de integración de pantallas HTML

**Producto:** plataforma generalista de gestión para PyMEs, multiempresa y multirrubro. **WALOS:** empresa de demostración, no nombre ni rubro obligatorio del producto.  
**Fecha de corte de las fuentes:** 2026-11-06.  
**Estado del entregable:** **COMPLETADO COMO MATRIZ DOCUMENTAL**; las elecciones de diseño son **candidatas/propuestas**, no validaciones interactivas ni autorizaciones para producción.  
**Destino canónico propuesto:** `/docs/00_MATRIZ_INTEGRACION_HTML.md`.  
**Alcance E0-A:** inventariar y seleccionar referencias HTML, conservar características útiles, señalar dependencias/reglas y ordenar el primer circuito. **No** desarrollar componentes, rehacer la auditoría integral, ejecutar operaciones reales, generar UML ni fijar contratos REST.

## 1. Fuentes y método

- **Z:** `Plataforma_PyME_Astra_Integracion_Completa_v3(1).zip`, bajo la carpeta interna `material_fuente/`; 93 originales, incluidos **19 HTML**.
- **A:** `Auditoria_PyME_Integracion_2026-11-06(1).zip`, especialmente `01_DIAGNOSTICO.md` (H01–H26), `02_INVENTARIO_Y_COBERTURA.md`, `03_COMPARATIVA_UX.md`, `05_TRAZABILIDAD.md`, `06_MENU_Y_FLUJOS.md`, `12_INVARIANTES_Y_QA.md` y `14_DECISIONES_PENDIENTES.md` (D01–D15).
- **V3:** `DECISIONES_CONFIRMADAS_MULTINEGOCIO_v3.md` dentro del ZIP fuente; tiene prioridad sobre menús o modelos de prototipos antiguos.
- **V4:** `01_PLAN_RECTOR_Y_SECUENCIA(1).md`, `02_BACKLOG_VERTICAL_Y_PRUEBAS(1).md`, `03_MERCADO_PAGO_QR(1).md`, `04_PROMPT_DE_EJECUCION_PARA_ASTRA(1).md`.
- **Complemento:** `Revision_Critica_Auditoria_Astra_Plataforma_PyME.md`, que precisa las decisiones no aprobadas sobre titularidad, invitaciones, cierre y retorno.

**Comprobación efectuada específicamente para E0-A:** extracción de ambos ZIP sin modificarlos; lectura de las matrices y hallazgos existentes; inspección estática de los 19 HTML (títulos, jerarquía visible, identificadores, funciones, superficies de navegación y almacenamiento); comprobación de SHA-256 de duplicados; revisión selectiva de capturas originales de M1, M2 y Ventas. **No se abrió ni probó un flujo en navegador en esta entrega.** La auditoría anterior también identifica sus propias limitaciones de prueba. Los criterios de aceptación siguientes son **pendientes**, no tests aprobados.

### Convenciones

- **P0:** necesario para comenzar el shell/aislamiento de la primera demo. **P1:** necesario para el recorrido comercial vertical. **P2:** complemento o fase posterior. La prioridad está alineada con el backlog v4, no con el número histórico «M1/M2/M3».
- **BASE:** referencia principal de diseño/flujo, no código para copiar. **APOYO:** preservar un comportamiento puntual. **LEGADO:** consulta histórica. **DUP:** copia idéntica, no segunda implementación.
- **E:** evidencia estática inspeccionada en E0-A. **A:** comportamiento/limitación documentado por la auditoría o una especificación de origen. **NV:** interacción integrada **no verificada**. **F:** no existe HTML completo de la capacidad; hay que diseñarla en E1.
- **Hxx:** hallazgo de la auditoría. **Dxx:** decisión pendiente/propuesta del documento `14_DECISIONES_PENDIENTES.md` de la auditoría (**no** se confunde con los `D-xx` de M2). Los estados `PROPUESTO` y `PENDIENTE` **no equivalen a aprobado**.
- En rutas de destino `/b/:businessId/...`, `businessId` representa la **empresa activa y autorizada**, no una elección arbitraria del navegador. Son rutas sugeridas, no rutas ya implementadas.

## 2. Registro completo de los 19 HTML

**Prefijo de todas las rutas de esta tabla:** `material_fuente/` dentro del ZIP fuente v3. Los IDs `Zxxx` coinciden con el inventario de la auditoría, de modo que cada elección sea trazable.

| ID | Ruta HTML exacta dentro de `material_fuente/` | Papel para integración | Capacidad recuperable / límite más importante | Estado |
|---|---|---|---|---|
| **Z001** | `Modulo 1/Boton_Editar_Perfil_Empresa.html` | **BASE** de formulario Empresa | Datos generales, imagen, contactos/redes, edición por campo; el gestor genérico de archivos no pertenece al circuito P0 | E/A/NV |
| **Z002** | `Modulo 1/Lista de Empleados.html` | **BASE** de Equipo y permisos visuales | Directorio, solicitudes, fichas, revisión, asociación por ubicación y vista de rol; seguridad real ausente | E/A/NV |
| **Z003** | `Modulo 1/Menu_Principal.html` | **APOYO** al panel y marco | Tarjetas, empresa y accesos, perfil y menú; no conservar la navegación parcial como menú final | E/A/NV |
| **Z004** | `Modulo 1/Ubicaciones.html` | **BASE** de Ubicaciones | Listado, alta/edición, principal, pausa/reactivación, detalle; adaptar a servicios sin depósito | E/A/NV |
| **Z014** | `Modulo 1/WALOS_Modulo1_v1_2/WALOS_Modulo1_Prototipo.html` | **BASE** de estructura organizativa y **APOYO** a gastos fijos, perfil, alta | Panel Mi empresa, setup, ubicaciones, equipo, solicitudes, cuentas, gastos recurrentes y perfil; `walos_demo_m1_v12` es almacén aislado | E/A/NV |
| **Z042** | `Modulo 1/cuentas_bancarias_asociadas.html` | **BASE** de Cuentas y métodos informativos | Alta/ficha/alias/CBU-CVU/estado, compartir/copiar; QR de datos bancarios **no acredita** cobro | E/A/NV |
| **Z050** | `Modulo 2/WALOS_Modulo2_Kit_Final_UX_v5_1/WALOS_Modulo2_Prototipo_UX_v5_1.html` | **BASE** de navegación funcional M2, catálogo/stock/compras y movimientos | Cobertura de 8 áreas, formularios, compra, traslado, retorno, guías/historial; `walos_demo_mod2_v5` no comparte estado con M1/M3 | E/A/NV |
| **Z067** | `Modulo 2/WALOS_Modulo2_Kit_Final_UX_v5_1/referencia/WALOS_Modulo2_v5_original.html` | **LEGADO/APOYO** de comportamiento antes de ajustes | Sirve para comparar funciones alteradas entre v5 original y kit posterior; no elegir como versión final por nombre | E/A/NV |
| **Z068** | `Modulo 2/WALOS_Modulo2_Prototipo_viejo.html` | **DUP de Z050** | SHA-256 idéntico; **no** es una variante distinta aunque se llame «viejo» | E, hash confirmado |
| **Z069** | `Modulo 2/catalogo_modulo2.html` | **BASE** de Catálogo y ficha | Galería/foto principal, categoría/tipo, alta/edición, pausa, elaboración contextual, guías; normalizar rubros | E/A/NV |
| **Z070** | `Modulo 2/walos_compras_y_gastos_separados.html` | **BASE** de UX Compras + Gastos de operación | Listas, filtros, borradores, líneas, detalle, adjuntos y alta contextual; compra, recepción y pago son hechos distintos | E/A/NV |
| **Z071** | `Modulo 2/walos_guias_apoyo.html` | **BASE** de editor de Guías | Pasos independientes, imágenes por paso, borradores/publicación/archivo; fase complementaria | E/A/NV |
| **Z072** | `Modulo 2/walos_m_dulo_2_inventario_y_control_de_stock(3).html` | **BASE** de conteo/control de stock | Asistente de recuento, diferencias y conflicto simulado; la concurrencia real no existe | E/A/NV |
| **Z073** | `Modulo 2/walos_proveedores.html` | **BASE** de Proveedores | Ficha rica, contactos, condiciones, medios, compras relacionadas y alta/edición; no obligar a completar todos los campos | E/A/NV |
| **Z074** | `Modulo 3/WALOS_M3_Cargar_Venta_POS_vNext.html` | **BASE** del **diseño del POS en dos pasos** | Selección de productos, revisar/cobrar, carrito y estados visuales; no equivale a integración de QR real | E/A/NV |
| **Z075** | `Modulo 3/WALOS_Modulo_Ventas_UX_v4_0.html` | **BASE** de operaciones Ventas, Gastos, Historial y cierre comercial | Checkout, descuento, ventas, devoluciones, pagos, cierre e informe; su estado no está sincronizado con M2 | E/A/NV |
| **Z081** | `Modulo 3/WALOS_Ventas_v4_0/WALOS_Modulo_Ventas_UX_v4_0.html` | **DUP de Z075** | SHA-256 idéntico; se usa como referencia documental/capturas en su carpeta, **no** como segunda implementación | E, hash confirmado |
| **Z092** | `Modulo 3/walos_m3_apertura_y_cierre_v3(2).html` | **APOYO** a rendición, informes y flujo de jornada | Pasos de apertura/cierre, conteos, asignaciones, informe; almacenamiento demo separado | E/A/NV |
| **Z093** | `Modulo 3/walos_m3_apertura_y_cierre_v8.html` | **BASE visual** del asistente Cierre/retorno, **NO** de su commit | Checklist, cantidades, destinos y panel; `commitFinalClosure` pierde borrador sin snapshot (H06); parseos numéricos problemáticos (H07/H26) | E/A/NV |

**Verificación de duplicados:** `SHA256(Z050) = SHA256(Z068) = 43141140eac1…` y `SHA256(Z075) = SHA256(Z081) = 50439a1f7d1…`. Por tanto, **19 rutas HTML = 17 contenidos HTML distintos**. `Z067` es una versión anterior **diferente**, no duplicada. En Z050 el título interno dice «v5.0» aunque el directorio sea `v5_1`: usar el ID/ruta/hash como identidad de origen, no el título.

## 3. Matriz funcional completa — pantalla destino → fuente → comportamiento → riesgo

Esta sección decide **qué reutilizar como diseño o regla funcional**. No implica copiar scripts, `window.*`, `innerHTML` ni archivos `localStorage` de una fuente a otra. **Todas las filas son NV respecto de la aplicación integrada**, incluso cuando el HTML original contiene una demostración parcial.

### 3.1 Marco global, persona y organización (primer corte E1-A / E1-B)

| Pantalla o vista destino | Fuente seleccionada (principal; apoyo) | Conservar diseño y funcionalidad | Regla crítica / qué corregir o NO copiar | Prioridad · dependencias · referencias |
|---|---|---|---|---|
| **Acceso y registro DEMO** `/acceso` | **F**; Z014 solo como inspiración de setup | Formulario simple y estado explícito «DEMO» | No hay registro/login real reutilizable de los 19 HTML; no almacenar contraseña simulada ni fingir auth efectiva | **P0** · User demo · R01, QA-01 |
| **Inicio personal sin empresa** `/inicio` | Z014 (setup); Z003 (tarjetas) | Bienvenida, crear empresa, incorporarse por invitación, perfil | Persona puede existir con 0 empresas; sin dashboard comercial ni catálogo WALOS | **P0** · identidad/empresa · R01/R02, D01 |
| **Crear/configurar empresa inicial** `/empresas/nueva` | Z014 (`setup`, `submitCompany`); Z001 | Formulario progresivo: nombre, rubro/capacidades, identidad visual; completar configuración más tarde | Fundador histórico ≠ titular legal; responsable inicial único; no crear ubicación/caja obligatoria; no arrastrar demo WALOS | **P0** · User, Business, Membership · R02, H01; titularidad: ADR específico pendiente (ver §5) |
| **Selector de empresa activa** en shell | **F**; Z003/Z014 solo como referencia de encabezado | Mostrar logo/nombre activos y cambio controlado de empresa | No existe selector multiempresa completo en HTML. Cambiar A→B debe resetear datos visibles, permisos, consultas y asociar borradores a empresa correcta | **P0** · scoping por `business_id` · R03/R05, H01/H09/H14; QA-02/20 |
| **Inicio empresarial / dashboard** `/b/:businessId/inicio` | Z003 + Z014; Z050/Z075 como referencia de resúmenes especializados | Panel compacto, resumen contextual, alertas, tarjetas grandes y accesos rápidos | Un solo Inicio general, **no** tres dashboards M1/M2/M3. Tarjetas llevan a ruta real o «Próximamente»; cifras desde el mismo estado | **P0** · shell + empresa · R05, H09; DEMO-01/02 |
| **Barra superior y menú izquierdo** global | Z003 y capturas Z014; apoyo Z050/Z075 | Hamburguesa izquierda, empresa activa, perfil a derecha, drawer responsive; rutas sin módulos visibles | Un registro único de rutas alimenta tarjetas y menú; no reutilizar `nav`, `render`, `goto` globales ni submenús duplicados | **P0** · router/permisos demo · R05, H17/H21; DEMO-01 |
| **Mi perfil personal** `/perfil` | Z014 (`profile`); Z002 modal perfil como apoyo | Datos propios, avatar y edición separada de Empresa | Perfil global independiente del negocio; datos personales no se clonan ni editan desde el perfil comercial | **P0** · User · R06 |
| **Datos de la empresa** `/b/:businessId/empresa` | Z001; apoyo Z002/Z014 | Grupos de campos, imagen, contactos, redes, acciones Editar/Guardar | Sólo empresa activa y permiso; validaciones reales; manejo visible de error de guardado; gestor documental general puede diferirse | **P1** · shell + permisos · R02, H08/H14 |
| **Ubicaciones: lista y detalle** `/b/:businessId/ubicaciones` | Z004; apoyo Z014 y capturas `22`–`25` M1 | Tarjetas/filas, estado, detalle, principal, acceso COMERCIAL/RESTRINGIDA | Capacidad `vender` distinta de `almacenar`; pausa ≠ cierre; sin local requerido para servicios; no borrar historial | **P1** · Business + permissions · R07, H02; DEMO-03 |
| **Ubicaciones: alta/edición/pausa** misma sección | Z004 (`saveNewLocation`, `saveEditedLocation`); Z014 (`submitLocation`) | Formulario corto, confirmación de pausa, ubicación principal | No crear depósitos ficticios; alcance por ubicación; antes de pausar mostrar pendientes y stock | **P1** · locations/manage · R07, H02, QA-21 |
| **Equipo: integrantes/ficha/permisos** `/b/:businessId/equipo` | Z002; Z014 como modelo de solicitudes/accesos | Lista, ficha, asignación por ubicación, actividad y estado | Rol visual no concede permiso; fundador y titular administrativo diferentes; impedir dejar negocio sin responsable | **P1** · Membership + roles · R03/R04, H01/H12/H14; D03, QA-16 |
| **Equipo: invitación nominada** subvista Equipo | Z002 (UI invitación); documentación v4 | Modal/destinatario, rol permitido, estado de invitación | Email nominativo con destinatario/token/expiración/revocación; no convertir aceptación en solicitud general | **P1** · Membership · R04, H12, D02, QA-17 |
| **Equipo: enlace/QR para solicitar ingreso** subvista Equipo | Z014 (`copyInvite`, `requestJoin`, `approve`); Z002 (`openReviewRequestModal`) | Compartir enlace, solicitud pendiente, revisión/aprobación | Flujo **distinto** de invitación nominada; la demo puede mostrarlo sin autorización automática. Primera implementación bajo ADR explícito | **P1** · team/requests · R04, H12, D02 |
| **Cuentas y medios de cobro** `/b/:businessId/cuentas` | Z042; Z014 y capturas M1 `18`–`19` | Ficha, alias, CBU/CVU, estado, copia/compartir, medios configurables | Cuenta financiera ≠ método de pago ≠ fondo de caja ≠ saldo del día; QR bancario informativo no acredita dinero. No colocar datos sensibles en contexto público | **P1** · BusinessAccount + permisos · R17, H09/H14, D08 |
| **Gastos fijos / recurrentes** subvista Gastos o Empresa | Z014 (`expenses`, `expenseForm`); M1 spec | Previsión periódica, vigencia, detalles; acceso desde Gastos con referencia en Empresa | Plan recurrente ≠ gasto ya pagado; no generar doble egreso, respetar historial al cambiar vigencia | **P2** · Expenses · R16, QA-23/24 |

**Capturas de referencia visual existentes (rutas relativas a `material_fuente/`):** `Modulo 1/WALOS_Modulo1_v1_2/assets/01_panel_mi_empresa_desktop.png`, `03_datos_empresa.png`, `04_ubicaciones.png`, `06_equipo.png`, `13_mi_perfil.png`, `14_panel_mi_empresa_mobile.png`, `18_datos_empresa_cobros_v11.png`, `22_form_ubicacion_acceso_v12.png`, `24_ficha_colaborador_v12.png`. Se inspeccionaron selectivamente las pantallas clave; la biblioteca de imágenes **no sustituye E2E**.

### 3.2 Catálogo, stock, proveedores, compras e historial (primer circuito E1-B)

| Pantalla o vista destino | Fuente seleccionada (principal; apoyo) | Conservar diseño y funcionalidad | Regla crítica / qué corregir o NO copiar | Prioridad · dependencias · referencias |
|---|---|---|---|---|
| **Catálogo: lista, búsqueda/filtros** `/b/:businessId/catalogo` | Z069; Z050 | Tarjetas con foto/ícono, tipo, categoría, precio/estado, filtros y acciones contextuales | Un catálogo **BIEN/SERVICIO** genérico: reventa, insumo y elaborado son capacidades de un bien; SKU estable por empresa, homónimos a decidir. Quitar categorías caninas globales | **P1** · Business, catálogo · R08, H16/H22, D04; DEMO-04 |
| **Catálogo: alta/edición de bien** `/b/:businessId/catalogo/nuevo` y ficha | Z069 (`openItemModal`, `saveItemForm`, galería); Z050 (`itemForm`) | Formulario progresivo, foto principal, galería, unidad explícita, detalle | Evitar doble catálogo entre Ventas y M2; precio «a cotizar» distinto de precio cero; desactivar no destruye venta histórica | **P1** · unidades/ubicación opcional · R08, H16/H22, QA-35 |
| **Catálogo: servicio** ficha/alta | Z069/Z050, extendido según v3/v4 (**no hay pantalla especializada completa verificada**) | Misma ficha base y disponibilidad comercial, sin stock | No exigir lote, ubicación, receta ni saldo; precio fijo/a cotizar debe quedar diferenciado | **P1** · BIEN/SERVICIO · R08, H02/H22, QA-09 |
| **Catálogo: elaboración contextual** detalle de bien | Z069 (`openElaborateModal`); Z050 (`submitElaboration`) | Acción «Elaborar» sólo en bienes configurados para producción y resumen de insumos | No imponer fabricación al comercio ni tratar traslado como consumo; producción/consumo atómicos. No esencial al primer recorrido | **P2** · inventario + receta opcional · R21, H19, D13 |
| **Inventario: listado y existencias** `/b/:businessId/inventario` | Z050; Z072 como apoyo | Tabla desktop + tarjetas móvil, filtros por ubicación, físico/reservado/disponible y encargos pendientes separados | Disponibilidad nunca negativa por pedido pendiente; servicio no tiene StockBalance; cifras derivan de movimientos, no contadores aislados | **P1** · catálogo + locations + ledger · R09, H09/H19/H21; DEMO-05 |
| **Inventario: detalle e historial por artículo** subvista Inventario | Z072 (`openFichaModal`, `openHistorialModal`); Z050 | Ficha, movimientos y saldos por ubicación; información de partida cuando aplique | Historias pertenecen al mismo registro fuente de verdad; no «stock propio» en Ventas | **P1** · ledger y catálogo · R09/R20, H09 |
| **Inventario: conteo/reconciliación** `/b/:businessId/inventario/conteo` | Z072 (`initAuditStep1`, `confirmAuditAndApply`, `executeAuditCommit`) | Asistente de recuento, diferencias legibles, revisión antes de aplicar y estado de conflicto | Su `concurrencySimulated` es demostración: un conteo no pisa venta posterior; cantidades fraccionarias sin truncar; ajuste con motivo | **P1** (tras recepción/traslados) · ledger + versions · R11, H07/H19/H26; QA-08/31 |
| **Movimientos: listado y nuevo traslado** `/b/:businessId/movimientos` | Z050 (`movementsPage`, `submitMovement`) | Selección múltiple, origen/destino, unidades, carrito de movimientos y resumen | Origen/destino **misma empresa**; conserva suma global; todo o nada; prohibir mover más del disponible; no copiar fecha fija 2026-10-30 ni `confirm()` nativo | **P1** · catálogo + inventario + ubicaciones · R10, H18/H19; DEMO-05 |
| **Movimientos: retorno de feria** subvista Movimientos/Jornadas | Z050 (`openFairReturn`, `confirmFairReturn`); Z093 interfaz de destinos | Comparación esperado/contado, elección de destinos, nota, referencia a salida/jornada | **No copiar la operación** que descuenta `expected` y retorna sólo `returned`: H25 provoca desaparición de diferencia. Retorno físico explícito, no automático al cierre | **P2** · ledger + CashSession + cierre · R10/R18, H25/H06, D06 |
| **Proveedores: listado/ficha** `/b/:businessId/proveedores` | Z073; Z050 (`suppliersPage`) | Ficha detallada, contacto, descuentos/promociones, observaciones, compras vinculadas | Campos avanzados opcionales, vínculos seguros, proveedor perteneciente a empresa activa | **P1** · Business · R12, H11; DEMO-04 |
| **Proveedores: alta/edición** misma sección | Z073 (`handleFormSubmit`); Z070 alta contextual | Formulario progresivo; alta rápida sin salir de Compra | Proveedor opcional en compra según M2, no forzar uno ficticio al recibir; no copiar validación académica incompatible | **P1** · proveedores + compras · R12/R13, H11, D10 |
| **Compras: listado/borrador/detalle** `/b/:businessId/compras` | Z070; Z050 (`purchaseFormOriginalV4`, `submitPurchase`) | Listado, filtros, líneas, totales, comprobante, detalle, crear proveedor/artículo en contexto | **Registrar compra ≠ recibir stock ≠ pagarla.** Una línea informativa no ingresa mercadería; proveedor puede ser opcional | **P1** · supplier opcional + catálogo · R13, H11, D10; DEMO-04 |
| **Compras: recepción de mercadería** `/b/:businessId/compras/:id/recepcion` | Z050 (modelo de compra/movimiento); Z070 (detalle); **F** para separación Receipt definitiva | Revisión de cantidades/unidades/ubicación y confirmación clara | Cada recepción acredita stock **una vez**, con operación idempotente; la cantidad recibida puede diferir de la comprada, sin duplicar pago ni registrar transferencia bancaria | **P1** · compras + ledger · R09/R13, H09/H19; QA-STK-01 |
| **Guías: lista/lector** `/b/:businessId/guias` | Z050; Z071 | Lista, búsqueda, lectura contextual desde ficha | No produce ni modifica stock por consultar una guía | **P2** · catálogo opcional · R19, H24 |
| **Guías: editor por pasos** `/b/:businessId/guias/nueva` | **Z071**; Z050 sólo como guía estética | Pasos ordenados, fotos/notas por paso, borrador, publicar/archivar | La galería global simple de Z050 **no reemplaza** imágenes por paso; verificar foco y guardado de borrador | **P2** · permisos + guías · R19, H24 |
| **Historial transversal: lista/detalle** `/b/:businessId/historial` | Z050 (`historyPageOriginalV4`); Z075 (`historyView`, `saleDetail`); Z073 audit visual | Filtros por fecha/ubicación/tipo, detalle, actor, signo +/−, vínculo a compra/venta/movimiento | Una sola línea de eventos por negocio; registros de demo no son auditoría inmutable; permisos limitan finanzas y datos ajenos | **P1** · todas las operaciones · R20, H14/H09; DEMO-07 |

**Capturas M2 de referencia:** `Modulo 2/WALOS_Modulo2_Kit_Final_UX_v5_1/capturas/02_catalogo_escritorio.png`, `02_catalogo_movil.png`, `03_inventario_escritorio.png`, `03_inventario_movil.png`, `04_movimientos_escritorio.png`, `05_proveedores_escritorio.png`, `06_compras_escritorio.png`, `06_compras_movil.png`, `07_guias_escritorio.png`, `08_historial_escritorio.png`. La auditoría registra posible densidad/recorte de tablas móviles (H21): adaptar en E1, **no** declararlo resuelto.

### 3.3 Ventas, dinero, jornadas y extensiones (primer circuito E1-C / E1-D)

| Pantalla o vista destino | Fuente seleccionada (principal; apoyo) | Conservar diseño y funcionalidad | Regla crítica / qué corregir o NO copiar | Prioridad · dependencias · referencias |
|---|---|---|---|---|
| **Ventas: lista/resumen** `/b/:businessId/ventas` | Z075; capturas en carpeta Z081 | Historial comercial, ubicación, operador, estado y acceso a Nueva venta | No duplicar estado de carrito/productos de M2; filtrar datos y permisos por negocio | **P1** · catálogo + stock + caja opcional · R14, H09 |
| **POS: selección de productos/servicios** `/b/:businessId/ventas/nueva` | **Z074 diseño**; **Z075 lógica y variantes** | Catálogo ancho completo, búsqueda sin tildes, selección, carrito visible y acceso «Revisar y cobrar» | Para bienes: stock disponible por origen; para servicios: **sin** stock o caja física obligatoria; no copiar lista fija WALOS | **P1** · catálogo/stock · R14, H02/H09/H22; DEMO-06 |
| **POS: revisión, descuentos y pagos divididos** subvista checkout | Z074 (separación de pantallas); Z075 (`payRows`, `addPay`, `paymentDraftFromDOM`) | Resumen por línea, descuentos, medios de pago múltiples y comprobación antes de confirmar | Checkout principal v4 terminó con selector simple (**H10**), aunque conserva funciones `payRows/addPay`; reconstruir UI multiaplicación; total = suma **exacta** de pagos declarados; no usar floats para dinero | **P1** · cuentas + venta + reglas de dinero · R14, H10/H26, D07/08; QA-MON-01 |
| **POS: confirmación y ticket interno** venta/detalle | Z075 (`completeSale`, `showTicket`, `printTicket`) | Confirmación explícita, ticket no fiscal consultable/imprimible en Historial | Una venta física deduce stock una sola vez; ticket ≠ factura; corrección referenciada, no eliminación silenciosa | **P1** · venta + ledger + historial · R14/R20, H09/H19; DEMO-06 |
| **Ventas: devolución/anulación** subvista detalle | Z075 (`returnsLog`, `voidSale`, funciones de devolución según fuente) | Consulta venta original, detalle y acciones de retorno controlado | No devolver más unidades/importe que lo aplicado; mercadería dañada no vuelve automáticamente a disponible; reembolso ≠ retorno físico | **P2** · Sale + refund + stock · R15, QA-07/30 |
| **Gastos operativos: lista/nuevo/detalle** `/b/:businessId/gastos` | **Z070** diseño y formulario; **Z075** flujo caja; Z014 para gastos fijos | Lista a ancho completo, formulario lateral, clasificación, fecha, importe, fondo/medio, comprobante | Gastos operativos ≠ compras/recepciones ≠ planes recurrentes; gasto pagado crea salida **una vez** y sólo en fondo indicado; billetera compartida no es saldo de jornada | **P1** · cuentas + jornada opcional · R16/R17, H09; DEMO-06 |
| **Apertura de jornada** `/b/:businessId/jornadas` | Z092; Z093; Z075 | Seleccionar ubicación/caja, fondo efectivo contado, responsable, estado visible | La jornada es **opcional** para operaciones de servicios sin caja; no sumar saldo digital como efectivo inicial; una caja abierta no se duplica | **P1** · Location/Account/Register · R18, D05, QA-JOR-01 |
| **Jornada activa: resumen** `/b/:businessId/jornadas/:id` | Z075 (resumen comercial); Z093 (panel) | Efectivo esperado, cobros digitales **declarados**, movimientos y gastos por jornada | Cuenta MP/bancaria puede ser compartida entre jornadas: no exhibir ni reiniciar su saldo global como saldo de caja; no inventar acreditación | **P1** · ventas/gastos/cuentas · R17/R18, H09/H13, QA-25 |
| **Arqueo y revisión previa al cierre** `/b/:businessId/jornadas/:id/cierre` | **Z093 visual** (checklist/ubicación/destinos); **Z092** rendición; **Z075** recuento y diferencias | Wizard con conteo, diferencias, observaciones, revisión y confirmación final | Contado normal por defecto; «sin arqueo» sólo si se aprueba por ADR/permiso; retornar mercadería es operación **aparte**; entrada inválida `12abc`/`1,2,3` debe rechazarse | **P1** · ledger de caja + conteo · R18, H06/H07/H13/H26, D06 |
| **Snapshot, informe e historial de cierre** `/b/:businessId/jornadas/:id/informe` | **Z075** (`v4SnapshotFor` referido en auditoría, informe); Z092 (`viewClosureReport`); Z093 **sólo visual** | Informe con actor, fecha, corte, arqueo, diferencias y justificativos; imprimir/consultar histórico | **PROHIBIDO portar `commitFinalClosure()` de Z093:** marca CLOSED y borra `closureDraft` sin snapshot. Un cierre debe conservar evidencia inmutable y nunca reabrir por doble clic | **P1** · ClosureSnapshot + historial · R18/R20, H06/H13, QA-12; DEMO-07 |
| **QR de cobro DEMO desde checkout** en Ventas | Z074 (pantalla de «esperando confirmación»), Z075 (medio MP simulado); **V4 QR** guía conceptual | Mostrar importe, QR/estado de **simulación**, pendiente/cancelado/aprobado como **estados de prueba** | **QR de cobro por venta ≠ QR de artículo**; botón «Ya pagué» no acredita pago real; nunca usar vendedor/plataforma global como receptor de empresas distintas; sin OAuth ni claves reales en demo | **P1** · sale checkout + mock aislado · MP v4 §§1–6, QA-MP-01/02; DEMO-08 |
| **QR de artículo/ficha** desde Catálogo | **F**; Z069 como origen ficha | Eventual enlace por empresa/artículo a ficha y añadir a venta | No es QR de cobro ni pago demostrado; no integrar al POS como cobro fijo; diseñar para autoservicio sólo si se prioriza | **P2** · catálogo + acceso público futuro · MP v4 §1/§5 |
| **Pedidos / reservas / señas** `/b/:businessId/pedidos` | Z075 contiene mock de Pedidos **sólo como referencia** | Tarjeta «Próximamente», sin afirmar que existe pedido real | La versión v3/v4 posterga módulo; no reactivar lógica anterior de stock reservado/seña como si fuera flujo validado | **P2 FUTURO** · ventas/pagos/stock · R22, D14 |
| **Análisis del negocio** `/b/:businessId/analisis` | **F**; resúmenes Z050/Z075 sólo inspiración | Tarjeta «Próximamente» y lugar reservado en navegación | No mostrar «ganancia real» sin costos/comisiones/impuestos y conciliación; no derivar saldos globales de caja | **P2 FUTURO** · operaciones consolidadas · R23, D14 |

**Capturas M3 de referencia:** `Modulo 3/WALOS_Ventas_v4_0/capturas/02_cargar_venta_checkout.png`, `04_gastos_lista.png`, `05_historial.png`, `06_cierre.png`, `07_cierre_asistente.png`, `08_informe.png`, `09_venta_movil.png`. El v4 declara pruebas parciales propias en `02_RIESGOS_Y_QA.md`; **no se interpretan como tests nuevos ni como validación de la integración**.

## 4. Selección consolidada: qué imagen/UX se adopta y qué lógica no

| Área | Elección inicial E0-A | Rescate funcional específico | Descartar/cambiar antes de E1 |
|---|---|---|---|
| **Shell/Inicio** | Z003 + capturas M1 v1.2 | Tarjetas, perfil, menú lateral y resumen | Marca WALOS global, menús segmentados M1/M2/M3, datos no contextualizados |
| **Empresa/Ubicaciones/Equipo** | Z001, Z004, Z002 | Modales, estados, fichas, ámbitos por ubicación; solicitudes Z014 | Roles sólo visuales, singleton SQL, exigir local/deposito |
| **Cuentas** | Z042 | Ficha bancaria y compartir datos | CBU/CVU como confirmación de pago; saldo digital inferido |
| **Catálogo** | Z069 con estilo integrado Z050 | Foto principal, variantes, tipos, elaboración contextual | Tipos veterinarios/caninos globales, doble fuente de catálogo |
| **Inventario y traslado** | Z050 + conteo Z072 | Físico/reservado/disponible, traslados múltiples, wizard de conteo | Stock aislado por HTML, bloqueo simulado como concurrencia, fecha fija H18, retorno con pérdida H25 |
| **Compras y Proveedores** | Z070/Z073, apoyo Z050 | Listados y formularios, proveedor rápido, ficha, recibo | Egreso por comprar, ingreso automático de toda línea, proveedor obligatorio ficticio |
| **Guías** | Z071 | Pasos ordenados, notas e imágenes por paso, borrador/publicación | Reemplazarla por galería simple de Z050 |
| **Ventas** | Z074 **UX** + Z075 **reglas** | Checkout separado, pagos divididos recuperados desde funciones heredadas, ticket | Un solo selector de pago, stock sin sincronizar, precios/redondeos flojos |
| **Jornadas/cierre** | Z093 **aspecto visual** + Z075 **reporte** + Z092 **rendición** | Checklist, arqueo, diferencias, informe histórico | `commitFinalClosure` de v8, `parseInt`/`parseARSStrict`, retorno/pausa/cierre confundidos |
| **Gastos/Historial** | Z070 + Z075 + Z050 | Formularios, clasificación, filtros y signos | Historiales separados, recurrente como pago consumado, logs locales como auditoría segura |
| **QR** | Flujo de venta Z074 + reglas del documento MP v4 | UI «DEMO», estados por intento | Presentar QR de producto como cobro o aprobación manual como pago confirmado |

## 5. Dependencias y decisiones que habilitan el primer circuito

**Dependencia funcional (no implica implementaciones actuales):**

`Persona/Empresa/Membresía → Shell/empresa activa → (Ubicaciones opcionales + Catálogo + Cuentas/Proveedores) → Compra → Recepción → Inventario/Movimientos → Venta + pagos declarados → Gasto → Jornada/Cierre → Historial`.

Para un **servicio sin depósito ni caja física**: `Persona/Empresa → Catálogo(Servicio) → Venta → Historial`. No obligar a pasar por Stock, Compras o Jornada.

### Decisiones necesarias, sin aprobarlas silenciosamente

| Decisión (auditoría) | Estado al cerrar E0-A | Opción provisional para prototipo; punto por formalizar en E0-C |
|---|---|---|
| **Titularidad administrativa** (tema transversal, no idéntico a D01 de auditoría) | **PROPUESTA, pendiente de ADR** | `founder_user_id` histórico y **un responsable administrativo activo**; transferencia/revocación nunca deja a la empresa sin responsable. No implica propiedad legal ni rol irrevocable |
| **D01 — Crear varias empresas** | **PROPUESTA de modelo, sin política comercial** | Modelar muchas empresas por persona desde el inicio, sin límite comercial en demo |
| **D02 — Invitaciones** | **PENDIENTE** | Mantener **dos** flujos distintos documentados: nominada por email y enlace/QR→solicitud→aprobación. El orden del MVP no borra el segundo |
| **D03 — Permisos** | **PENDIENTE** | Roles demo y permisos por acción/ubicación claramente simulados; la API deberá autorizar servidor por servidor |
| **D04 — SKU/nombres** | **PROPUESTA** | SKU estable único por negocio, generado si falta; admitir homónimos con advertencia, validar modo precio fijo/a cotizar |
| **D05 — Cajas** | **PROPUESTA** | Una caja por ubicación **que use caja**, no para toda empresa; modelar Register para futura ampliación |
| **D06 — Cierre y retorno** | **PENDIENTE** | Cierre contado con snapshot; sin arqueo **deshabilitado por defecto**; retorno físico separado y explícito |
| **D07 — Venta/cobro** | **PROPUESTA** | Venta inmediata con 1..n pagos declarados cuya suma coincide exactamente con total; créditos/señas futuros |
| **D08 — Moneda** | **PROPUESTA** | Moneda por empresa; ARS para fixtures; dinero exacto (centavos/Decimal); sin facturación fiscal implícita |
| **D09 — Stock negativo** | **PROPUESTA** | No permitir negativo. Demanda pendiente separada; reservas explícitas cuando corresponda |
| **D10 — Proveedor/recepción** | **Conservar requisito documentado M2; implementación pendiente** | Proveedor opcional; documento de compra distinto de recepción, recepción única e idempotente |
| **D11 — Framework** | **Fuera de E0-A; propuesto para E0-B** | React + TypeScript con pantallas recreadas como componentes, **no** iframes ni scripts globales |
| **QR de cobro y cuenta vendedora** (nuevo V4) | **Separación conceptual confirmada; API real futura** | DEMO de intención vinculada a venta; después OAuth por **cada empresa**, Orders QR, webhooks y reconciliación sin compartir tokens |

**Invariantes a llevar desde E0-A hacia E0-B/E1:**

1. Toda operación y recurso empresarial identifica `business_id`, con permiso y posible `location_id`; la identidad personal vive fuera de cualquier empresa.
2. Una recepción aumenta stock **una vez** y un traslado resta/acredita en **un solo comando**; los saldos se derivan del registro de movimientos.
3. La venta de bien físico usa su stock disponible; la venta de servicio no exige StockBalance.
4. Descuentos y pagos se concilian al centavo; cobro declarado **no** equivale a acreditación bancaria.
5. Cierre guarda snapshot y diferencias antes de pasar a cerrado; nunca borra evidencias, inventa merma o retorna stock por sí mismo.
6. Los borradores de formularios/carrito deben pertenecer a la empresa y, cuando aplique, ubicación del origen; cambiar tenant no los traslada.
7. Una pantalla sin implementación muestra «Próximamente»; una operación demo muestra «DEMO» y no informa seguridad/concurrencia/pago reales.

## 6. Orden de implementación que surge de la matriz (entrada para E0-B/E1)

| Corte | Pantallas de partida | Resultado observable | Pruebas de referencia **pendientes** |
|---|---|---|---|
| **DEMO-01 / E1-A1** | Shell, Inicio personal y empresarial, drawer, perfil | Menú y tarjetas apuntan a vistas o «Próximamente», usable en móvil | R05, QA-18 |
| **DEMO-02 / E1-A2** | Crear/seleccionar empresa, cuenta personal demo y permisos visuales | Empresa A→B no deja catálogo/ventas/borradores visibles de A; usuario sin empresa válido | QA-01/02/20, QA-TEN-01/02 |
| **DEMO-03 / E1-B1** | Empresa, Ubicaciones, Equipo, Cuentas | Empresa de servicios sin local; roles simulados diferenciados, invitaciones por modalidad | QA-09, QA-16/17 |
| **DEMO-04 / E1-B2** | Catálogo, Proveedores, Compras, Recepción | 1 bien + 1 servicio; compra de 10 recibe **exactamente 10** una vez | QA-10, QA-STK-01, QA-CAT-01 |
| **DEMO-05 / E1-B3** | Inventario, Movimientos, Conteo | Traslado 3 de origen 10 deja **7/3** y un único historial | QA-06/08, QA-STK-02 |
| **DEMO-06 / E1-C1** | Venta, checkout, gastos | En ubicación destino vender 2 bienes + servicio con descuento y **dos pagos exactos**; stock de destino pasa 3→1 | QA-05/09, QA-MON-01 |
| **DEMO-07 / E1-C2** | Jornada, arqueo, cierre, informe, historial | Snapshot con actor, efectivo contado y diferencia; cierre no reabre ni reescribe | QA-11/12, QA-JOR-01/02 |
| **DEMO-08 / E1-D1** | QR **simulado** desde Ventas | Pantalla marcada DEMO; pendiente no equivale a cobrado; empresa vendedora visible | QA-MP-01/02 como especificación futura |
| **DEMO-09 / E1-D2** | Todos los recorridos | Navegación con teclado, móviles, errores, estados vacíos; ningún control inerte disfrazado de acción | QA-18/19/20, QA-E2E-01 |

**Fixture E2E mínimo v4:** crear empresa → crear artículo + servicio + proveedor + dos ubicaciones → compra y recepción de 10 → traslado de 3 → abrir caja en ubicación destino → vender 2 y servicio con descuento y pagos divididos → gasto desde fondo explícito → arqueo y cierre → historial → cambiar de empresa y comprobar aislamiento → registrar servicio en negocio sin local. **No ejecutado en E0-A.**

## 7. Riesgos específicos heredados que NO deben copiarse

| Hallazgo | Fuente y problema | Acción obligatoria en E1/E2 |
|---|---|---|
| **H01/H02/H14** | SQL M1 singleton, membresía única global, dependencia errónea venta–almacenamiento y FKs/eventos sin tenant | Nuevo modelo por empresa; negocio de servicios sin depósito; restricciones y permisos en backend futuro |
| **H06** | Z093 `commitFinalClosure` marca cierre y elimina borrador sin snapshot | Reescribir caso de uso; persistir inmutable antes de cerrar y mostrar errores |
| **H07/H26** | Z093 recuento `parseInt` y parser supuestamente estricto acepta importes malformados | Cantidades tipadas por unidad, validación completa, redondeo explícito |
| **H08/H09** | Z014/M2/M3 guardan en claves demo separadas y pueden silenciar error | Fuente demo única por empresa, resultado de guardado observable, cero éxito falso |
| **H10** | Checkout visual v4 usa un medio aunque conserva funciones de varios | Reconstruir lista de aplicaciones y validar total exacto |
| **H11/H12** | Proveedor opcional M2 vs. obligación académica; enlace solicitud M1 vs nominada TP | Conservar reglas de producto; mantener dos máquinas de invitación distintas |
| **H13** | Cierre sin arqueo v4 vs verificación v8 | Cierre contado por defecto; ADR y permiso explícitos si habilita excepción |
| **H15/H17** | HTML duplicados y funciones globales superpuestas | Usar IDs/hash; componentes y servicios nuevos sin sobrescrituras de `render/nav` |
| **H16/H22** | Nombre único y SKU opcional en repo vs SKU automático M2; servicio «a cotizar» | Modelo genérico por capacidad; contratos y restricciones propios del producto |
| **H18/H19** | Fecha literal en traslado y «concurrencia» simulada | Fecha correcta y versión/corte; locks y concurrencia **sólo** backend |
| **H21/H24** | Tablas compras móviles densas; editor M2 básico pierde guías por paso | Tablas→tarjetas en móvil; conservar editor rico separado |
| **H25** | Retorno descuenta 10 de origen y acredita 8 al destino, perdiendo 2 sin ajuste explícito | Conservar diferencia mediante pendiente/ajuste trazable, no borrar saldo automáticamente |

## 8. Validación pendiente para no transformar preferencia en hecho

**Estado uniforme de las selecciones:** candidato **E/A/NV** hasta ejecutar E1 en navegador. Se eligió la mejor **referencia inicial** por función utilizando la auditoría y la inspección estática. No se afirma que sea visualmente la mejor versión definitiva en cada ancho/estado; las capturas sólo representan estados puntuales.

Antes de **consolidar la pantalla implementada**, comprobar en navegador (mínimo desktop 1440 y móvil 430; ampliar 320/390/768 y zoom 200%):

- Z003/Z014: menú/Inicio sin dependencia de WALOS, perfil usable sin empresa y selector A/B diseñado.
- Z001/Z004/Z002/Z042: formularios, teclado, confirmaciones de pausa, acceso por ubicación, acciones sin permisos.
- Z069/Z050/Z072/Z073/Z070: búsqueda, fichas, campos opcionales, varias líneas, unidades fraccionarias, recuento y traslado.
- Z074/Z075: carrito, descuento, 1..n pagos, venta servicio sin depósito, historial y ticket.
- Z092/Z093/Z075: conteo, diferencias, cierre e informe sin pérdida de evidencia; retorno físico separado.
- Estado de carga/vacío/error, foco/lectura, borradores conservados al cambiar pantalla, indicadores **DEMO** y no confirmación ficticia.

**Prueba que este documento NO declara:** funcionamiento de React, backend, seguridad, pagos reales, conmutación tenant o CI. Esas funciones todavía no existen como integración.

## 9. Acta E0-A y transferencia a E0-B

### Entregado

- [x] 19/19 rutas HTML identificadas y clasificadas; 17 contenidos distintos por SHA-256.
- [x] Matriz de destinos con fuente principal/apoyo, diseño, funcionalidades a conservar, reglas y conflictos Hxx/Dxx.
- [x] Priorización del primer circuito y dependencias, incluido servicio sin stock ni caja física.
- [x] Separación explícita entre QR de ficha y QR de cobro; QR de cobro **DEMO** por venta, MP OAuth/Orders/webhooks posteriores.
- [x] Registro de decisiones propuestas/pendientes, sin aprobación silenciosa.
- [x] Riesgos conocidos y controles de aceptación heredados de auditoría/v4.

### No realizado, deliberadamente

- [ ] Pruebas interactivas en navegador y mediciones visuales definitivas.
- [ ] Programación de frontend/backend y pruebas de integración.
- [ ] ADRs aprobados, UML final o contratos OpenAPI.
- [ ] Modificación del TP o de repositorios externos.

### Insumo exacto para E0-B

Con esta matriz, preparar `docs/01_NAVEGACION_Y_ARQUITECTURA.md` con: router de una sola aplicación, menú/tarjetas desde una única definición de rutas, jerarquía persona→empresas→ubicaciones, separación estado `session`/`business`/`draft`, contratos internos del repositorio DEMO, operaciones de inventario y dinero, estructura React+TypeScript y ADRs mínimos **marcados por estado**. **No** fusionar HTML antiguos; reconstruir componentes con evidencia de esta matriz. Empezar implementación E1 sólo con las reglas provisionales explícitas y los casos P0 aprobados para ese incremento.

---

**Responsable del artefacto:** asistencia de integración E0-A; **aprobación funcional final:** responsable del proyecto, aún pendiente.  
**Fuentes conservadas sin alteración:** ZIP v3, ZIP auditoría y plan v4.  
**Documentación relacionada:** auditoría `03_COMPARATIVA_UX.md`, `01_DIAGNOSTICO.md`, `02_INVENTARIO_Y_COBERTURA.md` y plan v4 `02_BACKLOG_VERTICAL_Y_PRUEBAS.md`.