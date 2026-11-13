# E3-2B · B5 — UX integral de cobros QR y preparación de QA B1–B6

**Rama:** `feature/e3-2b-mercadopago-qr-demo`  
**Estado:** B5 implementado en la rama, sometido a CI. No es la aceptación integral; B6 sigue pendiente.  
**Política:** NO pedir pruebas manuales intermedias. NO hacer merge parcial a `main`.

## Objetivo

Cerrar brechas de uso entre B1–B4 sin alterar sus reglas de venta o pagos: una empresa puede recorrer Medios de cobro → POS → generación de QR DEMO → historial y detalle → laboratorio simulado → venta QA → comprobante, y volver a cualquiera de las pantallas tras recargar la sesión.

## Cambios en backend

- **GET** `/api/v1/businesses/{business_id}/qr-payment-intents?offset=0&limit=20` (límite de 1 a 50): consulta en PostgreSQL paginada con orden determinístico `created_at DESC, id DESC`.
- Los titulares y administradores activos ven los intentos de la empresa. Encargados y trabajadores ven solo aquellos creados con su identidad; otros negocios responden 404.
- La lista devuelve metadatos de importe y estado, `sale_id` si ya está finalizada, pero **no** entrega las imágenes PNG del QR, notas ni líneas del carrito. El detalle permanece protegido por su endpoint existente.
- Los QR pendientes vencidos se presentan como `EXPIRADA` sin modificar la base ni escribir movimientos de venta. Los usuarios siguen pudiendo abrir el intento y consultar la bitácora.

## Cambios en frontend

- **Menú lateral:** nueva sección `Cobros QR` bajo Operaciones, asociada a la empresa activa; ruta `/real/empresas/{business_id}/cobros-qr`.
- **Historial de cobros:** tarjetas responsive con fecha, total, referencia ficticia, estado, relación con comprobante, acceso al detalle y paginación.
- **Medios de cobro:** acceso directo a historial y POS, aclaración de que una cuenta DEMO vinculada ya puede crear QR pero NO cobrar fondos. Ante un 409 por desvinculación con QR pendiente, dirige a revisar el historial.
- **Punto de venta:** acceso a cobros QR anteriores sin perder contexto empresarial.
- **Detalle QR:** acceso al historial, mensajes y próximos pasos específicos para pendiente, aprobada DEMO, rechazada, cancelada, expirada, incierta, revisión y finalizada.
- **Cierre con resultado incierto:** la interfaz obliga a consultar por GET el QR y sus eventos; cuando no hay comprobante y el estado continúa `APROBADA_DEMO`, permite reintentar **el mismo endpoint idempotente y el mismo QR**, sin generar una venta nueva.
- **Móvil y accesibilidad:** grilla 1 columna, botones táctiles mínimos de 42–44 px, estados y errores accesibles con `role=status`/`role=alert`, encabezados jerárquicos, foco visible y texto adaptable.

## QA automática B5

- Backend: endpoint autenticado, aislamiento por empresa, rol del colaborador, paginación y límites, expiración calculada sin mutación, vinculación de comprobante tras cerrar B4.
- Frontend: URL por empresa, validación de tenant, sumarios sin credenciales, respuestas con `sale_id` incompatibles rechazadas, IDs repetidos, paginación y semántica de estados.
- Ejecutar en GitHub Actions: Frontend (compilación, lint, Node); Backend FastAPI (Python 3.12/3.14, Postgres, migraciones); Inventario REAL full-stack (API, permisos, regresión de navegador escritorio/móvil).
- El recorrido visual interactivo de QR y OAuth real exige completar B6 y configuración QA aislada. CI de regresión no equivale a ensayo humano de punta a punta.

## Límite con Mercado Pago

B5 no incorpora OAuth, `qr_data` real, webhooks ni conciliación bancaria. Los estados `APROBADA_DEMO` y `FINALIZADA` son dos hechos diferentes: el primero es un evento ficticio, el segundo es un comprobante de venta **solo de la base QA descartable**. Ninguno prueba una acreditación externa.

## Próximo bloque: B6

Integrar cuenta por empresa vía flujo oficial autorizado, modelar caja/sucursal, crear órdenes QR dinámicas con la API oficial, verificar autenticidad de notificaciones y reconciliar con estados internos sin duplicación. Antes de habilitar un ensayo del proveedor deben existir credenciales, cuenta y capacidades compatibles con el entorno de pruebas de Mercado Pago.

## Momento para pedir pruebas de funcionalidad al usuario

Solo cuando se cumplan todas estas condiciones:

1. B1–B6 integrados y con todas las migraciones y pruebas automáticas en verde en **un mismo SHA** de la rama.
2. Entorno descartable de prueba preparado, sin tocar base local habitual ni credenciales de producción.
3. Matriz y guion de uso integral publicados, incluyendo roles, QR con detalle, estados simulados, cierre stock, retry/fallo, y conexión QR oficial sandbox cuando esté disponible.
4. Auditoría técnica previa sin hallazgos críticos de duplicaciones, aislamiento de tenant o credenciales.

Recién entonces indicar al usuario qué instalar/ejecutar, con comandos PowerShell y verificación de resultados esperados, antes de su autorización explícita de merge a `main`.
