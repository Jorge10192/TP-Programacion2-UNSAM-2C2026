# E2-7 · T11-B — Prueba transversal de compra, recepción, inventario y POS

**Fecha:** 11/11/2026 · **Rama:** `feature/e2-7-t11-qa-integral-hardening` · **PR:** [#45](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/45) (DRAFT / sin merge).

## Objetivo y límites

Validar un flujo comercial completo desde el navegador hasta FastAPI/PostgreSQL: registro, empresa, sede, proveedor, catálogo físico/servicio, **compra sin stock**, recepción con stock, POS mixto con pagos declarados, comprobante, ledger y F5.

**Archivo:** `plataforma-pyme/frontend/e2e/real/flow-purchase-to-sale.spec.ts`, commit `038d5b4393465ec2872c2fc7ff46323a3a24cc62`.

**Aislamiento:** exclusivamente `PYME_DISPOSABLE_QA=1`, API CI fija `127.0.0.1:18001`, PostgreSQL 16 temporal `pyme_t085_ephemeral`, usuario/empresa creados para el test con UUID únicos. El runner Playwright activa `VITE_PYME_ENABLE_REAL_SALES=1` **solo en la instancia descartable de CI**. No ejecutar localmente contra `TEST Empresa A`; no habilita ventas persistentes en el uso cotidiano.

## Secuencia verificada

| Paso | Operación real | Aserciones |
|---|---|---|
| Preparar datos | Registro, login, empresa MIXTO, sede SELL+STORE, proveedor, bien REVENTA y servicio | Respuestas 201 en API aislada |
| Compra | 10 unidades físicas a $700 + concepto flete $500 | Compra 201, total $7.500 y dos líneas; saldo/ledger vacíos |
| Replay compra | Misma `Idempotency-Key` y cuerpo | HTTP 200, mismo documento, una sola compra |
| Recepción | Recibir completa en sede SELL+STORE | 201, `COMPRA_RECEPCION +10000 milli`; saldo 10 unidades, versión 1 |
| Replay recepción | Misma clave y cuerpo | HTTP 200, comprobante idéntico, sin segundo ingreso |
| POS navegador | Producto 3×$1.500 y servicio 1×$2.000 | Carrito de dos líneas, total $6.500, cero POST antes de consentimiento |
| Pagos y consentimiento | Efectivo $3.000 + transferencia $3.500 declarados | Revisión final, consentimiento y un solo POST de venta |
| Comprobante | GET de la venta confirmada | Subtotal/total 650000 centavos, dos líneas, dos pagos exactos |
| Inventario | GET saldo y movimientos | 7 unidades, versión 2; exactamente `COMPRA_RECEPCION +10000` y `VENTA_SALIDA -3000`, cero movimientos del servicio |
| F5 y re-login | Recargar POS | Ningún POST de venta adicional; comprobante, saldo e historial invariables |

No se acredita dinero externo ni se usa QR/webhook de Mercado Pago.

## CI y evidencia exacta

- **Commit funcional:** `038d5b4393465ec2872c2fc7ff46323a3a24cc62`.
- **Full-stack REAL:** [run #42985928705](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42985928705) **SUCCESS**. Log: `T11-B: compra → recepción → inventario → POS mixto → comprobante y F5` aprobó (2,4 s), **20 Playwright REAL**, **6 Playwright DEMO**, **892 Pytest**, build/lint/test Node sin fallas.
- **Frontend independiente:** [run #42985928595](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42985928595) **SUCCESS**.
- **Advertencias backend:** Pytest informó **3 `UnsupportedFieldAttributeWarning` de Pydantic**, originadas durante tests de concurrencia de ajustes, ventas y traslados. No son fallas de T11-B ni se deben ocultar; registrarlas como deuda técnica a evaluar en T11-E/hardening. El aumento frente a una CI anterior puede variar por qué tests concurrentes producen warnings, no prueba por sí mismo una regresión.

## Criterio de aceptación T11-B

**APROBADO para continuar a T11-C**, basándose en la ejecución exitosa del escenario completo y regresión. Este dictamen no da por aprobada T11 en su totalidad: faltan seguridad de navegación/tenant y permisos en UI (T11-C), móvil/teclado (T11-D), hardening y cierre T11-E. No fusionar PR #45 ni habilitar POST REAL persistente sin autorización expresa.
