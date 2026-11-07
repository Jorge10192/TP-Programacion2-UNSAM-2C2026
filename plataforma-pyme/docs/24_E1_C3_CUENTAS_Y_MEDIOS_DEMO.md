# E1-C3 — Cuentas y medios de cobro asociados a la empresa (DEMO)

**Fecha:** 2026-11-06. **Estado:** primera vertical publicada en `main`, pendiente de `build`, `lint`, pruebas automatizadas y QA manual en VS Code del equipo. No se integran bancos ni Mercado Pago reales.  
**Origen:** plan v4, E0-B y ADR-001/005/006; continuación de E1-C1 Ventas y E1-C2 Gastos/Caja.

## Objetivo

Administrar desde la empresa seleccionada referencias de cuentas bancarias y billeteras virtuales, sin confundirlas con la caja física, pagos declarados ni acreditaciones externas.

## Comportamiento incorporado

- Menú existente **Administración → Cuentas y medios**: ruta `/b/:businessId/cuentas`.
- Fichas por empresa `DemoFinancialAccount` con ID, nombre identificador, tipo (banco/billetera), institución, titular de referencia opcional, alias opcional, CBU/CVU opcional, canal declarado, notas, estado, principal y fechas.
- Para identificar una cuenta se pide al menos **alias** de 6 a 20 caracteres o **CBU/CVU de 22 dígitos**; se valida formato, **no** autenticidad, titularidad ni capacidad de recibir dinero.
- Canales informativos: Transferencia declarada, Mercado Pago no conectado, Cuenta DNI declarada, otras billeteras declaradas. Las cuentas bancarias se muestran sólo con Transferencia como canal; el efectivo no se modela como una cuenta bancaria.
- Alta, edición de cuenta activa, desactivar/reactivar (sin eliminar), selección de una cuenta principal activa por empresa, búsqueda y filtros. Al desactivar la principal, no se asigna silenciosamente otra; queda pendiente elegirla.
- Se rechazan duplicados de nombre, alias y CBU/CVU **dentro de una empresa**, incluidas fichas inactivas. No se exige unicidad global entre empresas; WALOS nunca lee cuentas del Comercio Ejemplo.
- En listados, el identificador de 22 dígitos está oculto parcialmente; **Copiar datos DEMO** copia expresamente nombre, institución, titular, alias y CBU/CVU para compartir voluntariamente. No genera link público ni QR real.
- Persistencia optativa compatible en la misma clave existente de `localStorage`, sin cambiar la versión ni borrar empresas, productos, ubicaciones, fotos, compras, inventario, ventas, gastos o cierres anteriores.
- La primera cuenta creada se marca principal cuando no había ninguna activa. En adelante se puede seleccionar principal manualmente.
- El catálogo, Compras, Ventas, Gastos y Caja siguen funcionando como antes. En esta etapa **no** existe relación transaccional `payment.accountId`, conciliación ni acreditación. Una cuenta en el directorio NO significa que el banco la haya verificado.
- Mercado Pago real queda para backend: OAuth de **cada empresa/vendedor**, credenciales protegidas, webhook y conciliación. Se conserva la distinción QR de artículo frente a QR de cobro.

## Archivos

- `frontend/src/data/demo/financialAccountPolicy.ts`: DTO de referencia y validaciones puras.
- `frontend/src/data/demo/demoStore.ts`: `financialAccountsById`, recuperación opcional, selectores, comandos `createFinancialAccount`, `updateFinancialAccount`, `setFinancialAccountStatus`, `setPrimaryFinancialAccount`.
- `frontend/src/features/accounts/FinancialAccountsPage.tsx`: interfaz y formulario.
- `frontend/src/App.tsx`, `src/app/navigation.ts`, `src/features/dashboard/Dashboards.tsx`, `src/App.css`: ruta y navegación.
- `frontend/tests/financial-account-policy.test.mjs`: 12 pruebas puras; comando `npm.cmd run test:accounts`.

## Pruebas propuestas

Si ya estás en `plataforma-pyme/frontend`, **no hagas otro `cd`**:

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:accounts
npm.cmd run test:cash
npm.cmd run test:sales
npm.cmd run dev
```

En el navegador `http://localhost:5173`:

| ID | Acción | Esperado |
|---|---|---|
| CUE-01 | En WALOS entrar a Cuentas y medios | Se ve el directorio vacío o cuentas propias; no se mezclan con otros negocios |
| CUE-02 | Crear una cuenta bancaria de ejemplo: etiqueta «Banco de prueba», institución «Banco Ejemplo», alias «walos.banco.demo», sin CBU | Cuenta activa y principal si era la primera; aparece en tarjetas |
| CUE-03 | Crear billetera «Billetera demo», canal Mercado Pago (declarado), alias «walos.billetera» | Segunda ficha activa, sin conectarse a Mercado Pago |
| CUE-04 | Editar la billetera: cambiar nombre/institución, guardar | Se ve el nuevo texto; la cuenta bancaria no se altera |
| CUE-05 | Elegir la billetera como principal | Una sola principal activa para WALOS |
| CUE-06 | Desactivar la cuenta principal | Se conserva en Inactivas/Todas, ya no es principal; el banco sigue disponible |
| CUE-07 | Reactivar la cuenta y cambiar de principal | Permite ambas acciones, sin crear duplicados |
| CUE-08 | Intentar crear otra cuenta con el mismo alias de WALOS | Error claro de duplicado; no cambia el directorio |
| CUE-09 | Crear otra cuenta con alias igual pero en Comercio Ejemplo | Permitido, porque es otra empresa DEMO |
| CUE-10 | CBU de 21 caracteres o alias inválido | Rechazo por formato; no se inventa verificación bancaria |
| CUE-11 | Pulsar Copiar datos DEMO de cuenta ficticia | Portapapeles contiene referencia, alias y CBU/CVU si se ingresó |
| CUE-12 | Recargar con F5, cambiar empresa y volver a WALOS | Conserva referencias, estado y principal de cada empresa |
| CUE-13 | Consultar Caja y cierre histórico previo | Importe esperado/contado/diferencia no se modifican |
| CUE-14 | Ejecutar build/lint y tests de cuentas/caja/ventas | Registrar resultado local; no declararlo aprobado antes de ejecución |

**Importante:** en la DEMO **no cargues datos reales** (alias/CBU/CVU privados, tokens, contraseñas, credenciales, tarjetas). La información está en `localStorage`, legible por quien use ese navegador. Los CBU/CVU se guardan sin cifrado de servidor porque todavía no hay backend; esta pantalla es sólo para muestras ficticias.

## Dependencias para la siguiente integración

Cuando el equipo valide esta vertical: diseñar `FinancialAccount` y `PaymentChannel` reales en el modelo de dominio y contratos API, con autorización por negocio, restricciones de cuenta y auditoría; luego elegir cuenta de destino en Ventas y cuenta de origen en Gastos **sin reescribir los importes históricos**. Acreditaciones externas sólo mediante integración de proveedor verificada, nunca por inferencia del frontend.
