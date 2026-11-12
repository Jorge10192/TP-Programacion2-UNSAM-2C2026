# E3-1C2 — Datos de la empresa: diseño visual y criterios de QA

**Base:** `main d3fe26b1de695253ae2aca920d89b941f7087f14`. Referencia: `Boton_Editar_Perfil_Empresa(2).html`.

## Alcance
Ficha visual y edición contextual de nombre/rubro/actividad, con estado y membresía provenientes de FastAPI. Datos técnicos plegados; accesos organizados por Administración/Operaciones. No hay logo persistente ni imágenes REAL.

## Garantías
- Mismos `GET /businesses/{id}` y `PATCH /businesses/{id}`, misma validación y manejo de errores; no hay endpoints nuevos.
- Editar solo si `canEditBusiness` es verdadero; autorización real en FastAPI.
- Sin operaciones ficticias, `demoStore`, cambios de permisos, persistencia de token ni escritura automática.
- React remonta por tenant; no comparte formularios entre empresas.
- Las ocho tarjetas navegan exclusivamente a las rutas comerciales ya disponibles.

## QA antes de merge
1. Ver empresa y membresía correctas y desplegar información técnica.
2. Probar editar/cancelar sin PATCH y guardar/persistir con PATCH autorizado y F5.
3. Trabajador o empresa suspendida: no hay edición; backend mantiene 403/404.
4. Escritorio y móvil 390px, zoom/teclado y sin scroll horizontal.
5. CI frontend/full-stack con DB efímera, revisión manual, y autorización previa de merge.

**Pendiente siguiente:** E3-1C3 (Ubicaciones y Equipo).
