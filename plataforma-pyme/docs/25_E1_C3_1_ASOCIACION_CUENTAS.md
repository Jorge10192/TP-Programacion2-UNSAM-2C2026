# E1-C3.1 — Referencias de cuentas en pagos y cobros DEMO

**Estado:** publicado en rama de integración, pendiente de verificación de compilación, lint, pruebas automáticas y QA manual por el equipo.

## Decisión funcional

- Una venta digital por transferencia, Cuenta DNI o Mercado Pago declarado puede incluir una cuenta receptora de referencia.
- Un gasto por transferencia, Cuenta DNI, Mercado Pago u otro medio declarado puede incluir una cuenta de origen de referencia.
- La cuenta es **opcional**. Registrar sin cuenta sigue permitido. Efectivo y tarjeta no utilizan el directorio de cuentas.
- Sólo se aceptan cuentas activas que pertenecen al mismo negocio y cuyo canal corresponde al medio de pago. La comprobación se repite en el gateway al guardar, no sólo en la pantalla.
- La cuenta principal se destaca como sugerencia en el selector; nunca se elige en silencio.
- La operación almacena ID y nombre de la cuenta en el momento del registro, para que la modificación o desactivación futura no altere el historial.
- «Desactivar» sólo impide nuevas asociaciones en la aplicación; no bloquea una cuenta bancaria real.
- No se mueven fondos, no se infiere acreditación, ni se calcula saldo financiero.
- No se modifica la clave ni la versión de localStorage. Las ventas/gastos previos no necesitan cuenta y se respetan los snapshots anteriores de caja.

## Pruebas

Desde `plataforma-pyme/frontend`:

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:accounts
npm.cmd run test:sales
npm.cmd run test:cash
npm.cmd run dev
```

| Caso | Acción | Resultado |
|---|---|---|
| VINC-01 | Venta por transferencia con banco de WALOS | Cuenta en comprobante |
| VINC-02 | Venta Mercado Pago con billetera compatible | Sólo cuentas MP activas |
| VINC-03 | Gasto por transferencia con banco | Cuenta de origen en historial |
| VINC-04 | Venta o gasto digital sin cuenta elegida | Permitido |
| VINC-05 | Desactivar una cuenta usada antes | No seleccionable en nuevos movimientos; referencia histórica intacta |
| VINC-06 | Cambiar a Comercio Ejemplo | Cuentas de WALOS invisibles |
| VINC-07 | Cambiar medio a efectivo | Se limpia selección; si hay jornada, sólo afecta efectivo |
| VINC-08 | Recargar F5 y revisar cierre histórico | Cuentas y operaciones persisten sin alterar arqueo |

**Próximo corte del plan v4:** E1-D1 — Cobro QR DEMO. El QR de artículo es distinto del QR de cobro. La integración real con cada vendedor de Mercado Pago requiere backend.
