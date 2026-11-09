# E2-5 — Ficha de recursos y resultados de QA (sin claves)

**Ambiente:** backend local `http://127.0.0.1:18000`, PostgreSQL/Docker de desarrollo, 09/11/2026. **Advertencia:** los IDs de esta ficha son de **recursos comerciales de QA**, no de sesiones ni de claves idempotentes. Su publicación solo debe autorizarse en el cierre definitivo después de revisar la política de datos del equipo.

## 1. Empresa y ubicaciones

| Alias | Nombre | ID de recurso | Capacidad |
|---|---|---|---|
| EMP-QA | Comercio QA E2-5 | `3b161aa4-f476-4efc-8293-5978d590e0fe` | Empresa ACTIVA, tenant de las pruebas |
| DEP-QA | Depósito QA | `b492ced2-0faa-42d8-b652-609fc4c2b6f4` | `DEPOSITO`, `can_store=true`, `can_sell=false` |
| CASA-QA | Casa | `a741f945-5c88-4855-8ff0-708374ac16f8` | `CASA`, `can_store=true`, `can_sell=false` |

El actor operativo fue el **titular administrativo de EMP-QA**. Se omiten su correo, contraseña, identificador personal y tokens.

## 2. Artículos independientes

| Alias | Artículo | ID de catálogo | SKU | Unidad |
|---|---|---|---|---|
| ART-A | Alimento balanceado QA | `e3bcd831-1ae5-48ab-b1c1-0c43e58ae84b` | `ALIM-E25-001` | `UNIDAD` |
| ART-B | Galletitas QA Stock Inicial | `97cc90f6-6bef-487e-b8f4-76f132bbf0d1` | `INICIAL-E25C-001` | `UNIDAD` |

## 3. Estado final observado por GET

| Artículo | Ubicación | `quantity_milli` | Equivalencia | `version` | Fecha de última actualización UTC |
|---|---|---:|---:|---:|---|
| ART-A | DEP-QA | `6000` | 6 unidades | `2` | `2026-11-09T11:48:06.063460Z` |
| ART-A | CASA-QA | `4000` | 4 unidades | `1` | `2026-11-09T11:48:06.063460Z` |
| ART-B | CASA-QA | `6000` | 6 unidades | `3` | `2026-11-09T12:50:22.511667Z` |

`ART-A` suma 10 unidades en las dos ubicaciones; `ART-B` suma 6 unidades en Casa. No se informó saldo de ART-B en DEP-QA y **no se inventa** una fila `quantity_milli=0`: ausencia de fila y saldo cero existente son situaciones distintas en la regla de inicialización.

## 4. Comprobantes históricos

| Proceso | Tipo | ID de comprobante | Cantidad |
|---|---|---|---|
| Compra ART-A | Compra E2-4 | `c890b079-5d4c-4977-8143-258946d92060` | 10 unidades, total 100000 centavos ARS |
| Recepción ART-A | Recepción E2-4 | `b5c6ce63-d99a-473a-83a1-2ee07eba1132` | +10000 en DEP-QA |
| Traslado ART-A | `TRASLADO` | `be1de1eb-90bc-4be3-ac6e-84f5e9d1640f` | −4000 DEP-QA y +4000 CASA-QA |
| Inicial ART-B | `STOCK_INICIAL` | `c23fb5f0-7a14-43cf-98ba-d572e79a1bdd` | +5000 CASA-QA |
| Ajuste positivo ART-B | `AJUSTE_ENTRADA` | `bd324719-52b7-44ee-a4c3-17d1ace2a04d` | +2000 CASA-QA |
| Ajuste negativo ART-B | `AJUSTE_SALIDA` | `2caf25a3-966c-450e-8527-58ae95679ce9` | −1000 CASA-QA |

Las transcripciones detalladas y su progresión se explican en `02_BITACORA_SWAGGER_E2-5_B.md` y `03_BITACORA_SWAGGER_E2-5_C.md`.

## 5. Qué NO se registra deliberadamente

Ninguna clave real de reintento, ninguna cabecera `Authorization`, token de acceso, contraseña, identidad personal, correo QA, cadena de conexión, configuración `.env` ni dato de seguridad sensible. Si un auditor necesita reproducir un replay, debe generar **su propia sesión y claves efímeras** en un tenant de prueba nuevo y documentar solamente los resultados.