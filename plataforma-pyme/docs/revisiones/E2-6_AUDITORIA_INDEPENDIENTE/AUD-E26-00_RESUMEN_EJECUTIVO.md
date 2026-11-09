# E2-6 - Resumen ejecutivo

**Recomendación local: APTO_CON_OBSERVACIONES**, pendiente de CI propio y decisión del equipo. No es certificación de producción ni de integración React/API.

Se reprodujo el cierre de ventas de `main` `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068`, que incluye el merge funcional `6336152e8dd095ca91363566beddd2b622432a5e`. Base: **879 pruebas**. Dos correcciones separadas: respuesta controlada ante agotamiento de versión del saldo y contrato tipado de snapshots en OpenAPI. Árbol revisado `0a74f2b6e38a099bad20a2648ebf58547b06442e`: **882 pruebas**; combinación privada con las otras auditorías: **897**.

El caso límite de versión ya hacía rollback antes de esta corrección: se cambia el error HTTP 500 a 409, no se atribuye una pérdida de datos inexistente. La prueba contigua confirma que la última versión válida sigue permitiendo vender.

Ámbito inspeccionado: schemas/router/service de ventas, autorización empresarial y de ubicación como dependencias, modelos/DDL de venta y stock, tests `test_sale_foundation_*` y `test_sales_*`, cierre E2-6, contratos y protocolo de auditoría. La inspección SQL verificó CHECK y FK del esquema migrado. La matriz adjunta separa pruebas ejecutadas de análisis de código y cuestiones no comprobadas.

El encargo antiguo apuntaba a una rama previa al merge y pedía solo lectura. Se aplicó el pedido posterior del usuario de preparar correcciones por rama/PR, manteniendo el cierre recibido y los hallazgos separados de la documentación de implementación. No se modificaron E2-1/E2-5, frontend, pagos reales ni migraciones. **No se realizó merge.**
