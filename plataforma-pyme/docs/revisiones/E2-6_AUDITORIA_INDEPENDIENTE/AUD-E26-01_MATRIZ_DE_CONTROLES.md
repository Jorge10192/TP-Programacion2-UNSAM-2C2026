# E2-6 - Matriz de controles

RF-07 / CU-10; prefijo `/api/v1/businesses/{business_id}/sales`: POST confirma o recupera una venta; GET `/{sale_id}` consulta un comprobante autorizado.

| Control del encargo | Implementación / evidencia | Estado y límite |
|---|---|---|
| 1. Tenant y referencias | Filtros empresariales, FK compuestas y tests de IDs ajenos | Pruebas PostgreSQL aprobadas en la suite |
| 2. Autenticación y permisos | `PurchaseService._authorize`, SELL/STORE, rol y asignación; `test_sales_permissions_integration` | Casos ejecutados; no certifica todas las combinaciones |
| 3. TOCTOU de permisos | Revalidación bajo locks usuario/sesión/empresa, después sede | Análisis de código; carrera específica de revocación simultánea no ejecutada |
| 4. Artículos y cantidades | Catálogo activo/vendible, unidades discretas, agregación de bienes repetidos | Tests de schema/API y mixtas aprobados |
| 5. Dinero y pagos | Centavos StrictInt, HALF_UP, descuento y pagos exactos en DTO | Tests aprobados; no acreditación bancaria |
| 6. Política de precio | `unit_price_cents` lo declara el cliente; servidor calcula totales | Contrato deliberado; el equipo decide límites por rol para UI/API |
| 7. SQL | CHECK de venta/línea/pago y FK por tenant; esquema inspeccionado | La suma entre tablas depende del servicio; no se afirmó garantía SQL ante cualquier escritura directa |
| 8. Atomicidad | Una transacción; errores tardíos y falta de stock revierten | Tests de atomicidad existentes y nueva prueba de versión, aprobados |
| 9. Saldo e historial | CAS de cantidad, +1 versión, ledger negativo por bien, snapshot | Agotamiento de versión corregido; servicios no generan salida física |
| 10. Idempotencia | Actor/payload/clave, UNIQUE empresarial y competencia real | `test_sales_concurrency_integration` aprobado |
| 11. Replay histórico | SELL/aptitud de sede se valida antes del replay; GET histórico solo exige lectura empresarial | Observado en código; política de recuperación tras pausa/revocación requiere decisión, no se cambió |
| 12. Concurrencia cruzada | Suite de interoperabilidad secuencial con recepción/traslado/ajuste y carreras venta-venta | Parcial: no se añadieron carreras venta contra cada otro módulo ni carga sostenida |
| 13. HTTP/OpenAPI | 201/200/401/403/404/409/422; Idempotency-Key; snapshots tipados | Correcciones y pruebas HTTP aprobadas; forma JSON válida conservada |
| 14. Migración | Upgrade nuevo hasta `e26a_sales_foundation`, check y constraints | Sin deriva; no se ejecutó downgrade ni se cambió DDL histórico |
| 15. Procedencia | 879 base, 882 finales, 897 combinación; CI histórico distinguido | CI propio pendiente al preparar estos documentos |

No se equipara el conteo de tests con validación comercial del producto, revisión visual de frontend ni ausencia absoluta de carreras.
