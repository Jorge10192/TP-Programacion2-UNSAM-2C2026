# E3-2A — Auditoría general posterior a las pruebas manuales y correcciones

**Fecha:** 12 de noviembre de 2026.  
**Proyecto:** Asistente PyME, plataforma generalista multiempresa/multirrubro, UNSAM Programación 2. WALOS no es el producto.  
**Base inalterada:** main en 0f1b1ca569605e18f9207520f1d4e0e5a563688e.  
**Rama funcional auditada:** feature/e3-2a-imagenes-real-backend, después de la corrección funcional 320577f11efc5d3117557501543b4f283a24d50d. PR #65 en DRAFT.  
**Alcance:** auditoría de integración transversal y regresión de E3-2A con identidad, empresas, equipo, catálogo, proveedores, compras, inventario, POS, CI y documentación del cierre E2-7/T12. **No equivale** a pentest, certificación de producción, auditoría exhaustiva de cada línea o aprobación final del diseño.

## 1. Resumen ejecutivo

La funcionalidad de fotografías probada manualmente es operativa y está aislada por empresa. Los hallazgos realizados por el usuario se concentraron en la ubicación de los controles y en pantallas donde la miniatura no estaba integrada. Se corrigieron sobre la rama del PR, sin merge ni cambios en la base local.

**Dictamen provisional:** la implementación queda preparada para revalidación automatizada y revisión humana de los cambios. La auditoría no declara cerrada la calidad final mientras los tres workflows del último HEAD y las comprobaciones de las pantallas modificadas no terminen aprobados.

## 2. Resultado de QA manual declarado por el usuario

| Grupo | Resultado manual registrado |
|---|---|
| M01 y M02 — Perfil: carga, sustitución, avatar, F5 y login | Aprobado por el usuario |
| M03 y M04 — Empresa: logo, sustitución y eliminación | Aprobado por el usuario; detectado flujo fuera de Editar |
| M05 — Catálogo: tres fotografías, portada, persistencia | Funciona; observación sobre alta/edición |
| M06 y M07 — Ocho fotos, rechazo de novena, huecos y portada | Aprobado por el usuario |
| M08 — Servicios con fotos sin stock | Aprobado por el usuario |
| M09 y M10 — Proveedores: foto, reemplazo, borrado | Aprobado por el usuario; mejora de alta/edición |
| M11 — Portada visible en POS | Aprobado con captura; detectadas faltantes en Compras, Existencias y revisión final |
| M12 — Lectura por empleado y ausencia de controles de edición | Aprobado por el usuario; captura mostró Encargado, backend también verifica Trabajador |
| M13 — Separación entre dos empresas | Aprobado por el usuario |
| M14 — Archivo inválido, SVG, >5 MB | **No ejecutado**: solamente se prepararon dos archivos locales |
| M15–M18 — Navegación adicional, móvil, accesibilidad, fallo de red | **No ejecutadas** por decisión del usuario |

Estas son declaraciones de pruebas del usuario, no ejecución independiente de navegador sobre su máquina. Los cambios posteriores a esas capturas todavía requieren aceptación visual.

## 3. Correcciones implementadas en la rama

| Área | Corrección | Invariante conservado |
|---|---|---|
| Creación de artículos y servicios | Selector de hasta 8 fotos opcionales durante alta; primero se crea la ficha REAL y luego se suben al ID devuelto | Nunca se generan fotos huérfanas deliberadamente; no se crea stock ni venta |
| Edición de catálogo | Gestor de imágenes accesible también desde Editar | Se mantiene galería en Ver ficha y permiso de escritura original |
| Creación y edición de proveedores | Selección opcional de una foto durante alta; gestor en Editar | La foto no es obligatoria y no afecta compras ni promociones |
| Edición de empresa | Modificación del logo integrada en Editar datos; fuera de edición, solo visualización | El backend continúa exigiendo business.profile.edit |
| Compras y recepciones, listado | Miniatura visual por renglón vinculado a catálogo | El importe, descripción y cantidad siguen siendo snapshots inmutables |
| Inventario, Existencias | Portada visual de la ficha del catálogo | El saldo, su versión y el ledger son exclusivamente de PostgreSQL |
| POS, revisión final | Portada actual como referencia en cada renglón | No modifica totales, descuentos, pagos ni la política de habilitación de ventas |
| Equipo | Avatar personal por ruta dedicada de consulta, autenticada y ligada a empresa | Sin recurso público, solo members.read, miembro destino ACTIVO, datos privados fuera del token URL |
| Avisos de galería | Evita conservar un aviso de éxito al intentar exceder ocho fotos | Sin cambios en autorización o almacenamiento |
| CI plataforma PyME | Workflows de la plataforma fijados a ubuntu-24.04 | Evita incompatibilidad Playwright/Chromium con runner ubuntu26.04; WALOS CI no se modifica |
| QA | Caso Playwright ampliado a selección de imágenes en alta y edición | Nunca activa ventas ni usa base no descartable |

Si la carga de fotos falla **después** de crear un artículo o proveedor, la ficha comercial permanece creada; se muestra advertencia y el operador debe inspeccionar la galería antes de volver a intentar. No existe transacción distribuida que vuelva atómica la creación del artículo y todos sus POST de fotos. Este límite es explícito, no se simula rollback comercial.

## 4. Auditoría de seguridad y aislamiento

- Autenticación mediante Bearer, sesiones reales; imágenes privadas normalizadas a WebP. No se incorpora URL con token ni almacenamiento de fotos en localStorage.
- Las operaciones de escritura verifican membresía activa y permiso de edición en empresa ACTIVA, antes de decodificar, y vuelven a comprobar antes de guardar. Los roles Trabajador y Encargado no obtienen permisos por ocultar o mostrar botones.
- Las fotos de perfil siguen siendo accesibles por su dueño mediante /photos/me; en Equipo hay ruta **de solo lectura** para un colega activo del mismo tenant, condicionada al permiso members.read. Usuarios externos y trabajadores sin lectura de equipo reciben rechazo sin entrega de bytes.
- Las consultas de portada de Compras/Existencias/POS emplean el business_id del contexto actual; las referencias del catálogo se validan contra ese tenant.
- Imagen de un producto en comprobante histórico: **foto actual orientativa**, no parte del documento inmutable. No se manipulan snapshots contables.
- Migración existente e32a_photo_assets, 21 tablas verificado en QA manual. Las correcciones posteriores no añaden migraciones ni modifican claves del modelo comercial.
- El sistema limita formato real, resolución y tamaño antes del almacenamiento. M14 manual quedó pendiente; las pruebas unitarias previas de formatos inválidos permanecen en la suite.

## 5. Revisión integral por subsistema

| Subsistema | Observación auditoría | Estado de evidencia |
|---|---|---|
| Autenticación y perfil | Avatar propio persistente; sesión REAL en memoria; F5 puede requerir nueva autenticación | M01–M02 manual + tests |
| Empresas y membresías | ACL por tenant; logos visibles y edición explícita; invitación no concede acceso hasta aceptarse | M03–M04, M12–M13 + tests |
| Equipo | Avatar bajo permiso de lectura y solo para miembros activos; endpoint nuevo requiere regresión | Tests nuevos; revalidación visual pendiente |
| Catálogo y proveedores | Fichas persistentes y fotos opcionales durante el alta/editar | M05–M10 para flujo anterior; nueva UX pendiente de revalidación |
| Compras | Foto de referencia en listado; ninguna escritura comercial nueva | Revisión de JSX y CI; pantalla nueva pendiente |
| Recepciones | No hay cambio del contrato de recepción única, stock ni comprobante | Regresión E2/E3 vía CI |
| Inventario | Foto de portada no forma parte del cálculo de saldos | Regresión vía CI; nueva miniatura pendiente de aprobación visual |
| POS / Ventas | Se añade portada en revisión, sin cambiar el comando de venta ni cálculos | M11 y CI; revisión final pendiente visual |
| Gastos / Caja / cuentas / QR | Capacidades REAL no se agregan en E3-2A; DEMO o futuras según cierre T12 | No son defectos del incremento fotográfico |
| Documentación académica | T12 E2-7 conserva límites RF-01 a RF-07 y distingue RF-08 a RF-10 | Revisado contra acta T12; no es nueva auditoría de consigna original |

## 6. Riesgos y trabajo pendiente

**Prioridad alta para un lanzamiento público, no bloqueante de prototipo aislado:** revisar cuotas/rate-limit de subidas, escaneo de archivos en perímetro, autorización de acceso entre tenants en escenarios concurrentes, política de consentimiento de avatar compartido con equipo y respaldo/restauración de imágenes BYTEA.

**Prioridad media para producto:** N+1 solicitudes de miniaturas en listados extensos, ausencia de idempotency-key en POST de fotos, selección manual y reordenamiento de portada, UX de error tras creación con carga parcial, persistencia de sesión, accesibilidad WCAG y visualización en teléfono físico.

**Prioridad de aceptación E3-2A:** completar la CI en el último SHA, revisar visualmente las correcciones introducidas después de M13 y decidir si el prototipo requiere repetir M14–M18. No declarar estas pruebas realizadas. No habilitar escrituras de venta REAL ni usar dinero/credenciales reales para QA.

## 7. Evidencia y estado de CI

La base anterior a las correcciones pasó 908 Pytest, 54 Playwright REAL y 6 DEMO sobre el SHA anterior de E3-2A. **Es evidencia histórica, no prueba de este cambio.**

La primera ejecución de los nuevos commits detectó un problema externo reproducible: Playwright rechazó Chromium en el runner ubuntu26.04-x64. Se fijaron los tres YAML exclusivos de PyME a ubuntu-24.04 para restablecer la suite. La corrida CI definitiva debe verificarse contra el último HEAD, incluidos los tests añadidos y este documento.

**No certificar verde ni merge mientras los jobs sigan en curso o fallidos.**

## 8. Puertas de cierre

1. CI Backend Python 3.12 y 3.14 + PostgreSQL, imagen Docker, Alembic HEAD/check: SUCCESS en SHA final.
2. CI frontend build, lint y tests del contrato: SUCCESS en SHA final.
3. Full-stack Playwright REAL y DEMO en PostgreSQL descartable: SUCCESS en SHA final.
4. Revisión humana de nuevas pantallas: altas de artículo/proveedor, edición, Compras, Existencias, equipo y revisión POS.
5. Aprobación explícita del usuario antes de convertir PR #65 a READY o hacer merge a main.

**Estado de este documento:** auditoría estática de integración realizada; CI final y aceptación manual de correcciones pendientes al momento de redacción. No se modificó la base local del usuario.
