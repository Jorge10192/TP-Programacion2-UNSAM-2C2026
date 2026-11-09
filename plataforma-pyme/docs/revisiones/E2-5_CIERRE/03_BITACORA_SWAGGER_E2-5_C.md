# E2-5 C — Bitácora de QA manual en Swagger (stock inicial y ajustes)

**Procedencia:** respuestas HTTP proporcionadas por el desarrollador en esta conversación, el 09/11/2026. No constituye una ejecución independiente. Se omitieron **por completo** contraseñas, tokens, claves de idempotencia y credenciales de conexión.

**Escenario:** misma empresa QA y ubicación Casa, pero **otro artículo físico**: `Galletitas QA Stock Inicial`. Se evita alterar el stock del artículo A de E2-5 B.

## 1. Casos observados

| ID | Acción en Swagger | HTTP observado | Resultado verificado |
|---|---|---|---|
| C-01 | `POST /catalog` del artículo B, `REVENTA` y `UNIDAD` | **201** | Artículo activo, sin stock previo informado. |
| C-02 | Primer intento `POST /inventory/adjustments`, tipo `STOCK_INICIAL` | **401** | `Credenciales invalidas o sesion vencida`; el `curl` compartido no llevaba encabezado Bearer. **No** creó operación. |
| C-03 | Se reautorizó Swagger; `STOCK_INICIAL`, `quantity_milli=5000`, `expected_version=0` en Casa | **201** | Operación con movimiento `STOCK_INICIAL +5000`, actor y motivo persistidos. |
| C-04 | Repetición de C-03 con **igual** cuerpo y clave no publicada | **200** | Mismo ID de operación, movimiento y timestamp; no se produjo una segunda inicialización. |
| C-05 | Otra solicitud `STOCK_INICIAL` para el mismo par artículo+Casa, con clave **nueva** no publicada | **409** | `Stock inicial ya establecido en esta ubicacion y articulo`. |
| C-06 | `AJUSTE_ENTRADA +2000`, `expected_version=1`, motivo de sobrante | **201** | Movimiento `AJUSTE_ENTRADA +2000`, nuevo comprobante. Saldo esperado 7000, versión 2. |
| C-07 | `AJUSTE_SALIDA -1000`, `expected_version=2`, motivo de unidad dañada | **201** | Movimiento `AJUSTE_SALIDA -1000`, nuevo comprobante. Saldo esperado 6000, versión 3. |
| C-08 | `AJUSTE_SALIDA -7000`, `expected_version=3` | **409** | `Stock insuficiente para ajuste de salida`; operación rechazada. |
| C-09 | `AJUSTE_ENTRADA +1000`, **`expected_version=1` obsoleta** | **409** | `Version de saldo obsoleta o saldo inexistente`; operación rechazada. |
| C-10 | `GET /inventory/balances?catalog_item_id=...` | **200** | **Una fila** en Casa: `quantity_milli=6000`, `version=3`; `updated_at=2026-11-09T12:50:22.511667Z`. |
| C-11 | `GET /inventory/movements?catalog_item_id=...` | **200** | **Tres filas:** `AJUSTE_SALIDA -1000`, `AJUSTE_ENTRADA +2000`, `STOCK_INICIAL +5000`. Sin filas por C-08/C-09. |

## 2. Cálculos y conclusiones

`+5000 + 2000 - 1000 = +6000` milésimas = **6 unidades**. El resultado concuerda exactamente con el balance confirmado. Las operaciones exitosas elevaron progresivamente la versión a 3; los dos rechazos posteriores **no** la incrementaron. El `updated_at` del saldo coincide con el último ajuste exitoso, no con los rechazos posteriores.

- Una segunda inicialización para un artículo/ubicación ya usado se rechaza aun cuando la clave sea nueva (C-05).
- El replay de la primera inicialización funciona (C-04), sin contradicción con el rechazo C-05.
- Los deltas se registraron con el signo correspondiente a cada tipo y con el mismo actor empresarial.
- La sesión inválida de C-02 es un control de autenticación superado **después** de reautorización; no se debe atribuir a un defecto de lógica de stock.
- Las solicitudes C-08 y C-09 no aparecen en el ledger consultado. No se inventa una compensación inexistente.

## 3. Identificadores de comprobantes para contraste (no credenciales)

| Tipo | ID de operación | ID de movimiento |
|---|---|---|
| Inicial | `c23fb5f0-7a14-43cf-98ba-d572e79a1bdd` | `05ef4bad-0e3f-4fb9-aa83-19fe87ab0c6f` |
| Ajuste de entrada | `bd324719-52b7-44ee-a4c3-17d1ace2a04d` | `7f687888-4dbd-46cf-8487-6b1a1f081946` |
| Ajuste de salida | `2caf25a3-966c-450e-8527-58ae95679ce9` | `7e6c887d-4241-4b53-807d-ad5a2c8be6b8` |

## 4. Seguridad y límite de inferencia

En la conversación se compartió accidentalmente un `curl` con un token Bearer. **Su valor no se copia en la documentación.** Posteriormente se aportó `POST /api/v1/auth/logout` con **204 No Content** (09/11/2026 15:23:37 GMT) usando el **mismo token**. Esta evidencia **SWAGGER-REPORTADO** permite dar por revocada esa sesión específica según el contrato implementado; no certifica un inventario SQL de todas las sesiones de la cuenta. No compartir otra vez el `curl` de Swagger. La prueba C-11 usa únicamente el filtro por el artículo B; no certifica los saldos actuales de todos los demás artículos en un momento posterior.

## 5. Lo no probado manualmente

Las simultaneidades de clientes/usuarios sobre una versión o inicialización y los permisos por roles menores se cubren en CI/test suite, no en este Swagger manual. La regla "sin stock inicial si hubo historia previa, incluso en saldo cero" tiene tests automatizados; **no** se reprodujo manualmente con agotamiento a cero.