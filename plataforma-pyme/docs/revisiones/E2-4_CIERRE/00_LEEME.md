# E2-4 — Cierre funcional, evidencia de uso y revisión de observaciones

**Proyecto:** Plataforma PyME generalista y multiempresa · Programación 2, UNSAM, 2C2026.
**Corte de pruebas:** 08/11/2026.
**Código auditado:** `main`, commit `4f88416141c09a82e744990b1aee8c00b9f31dfd`.
**Estado:** cierre funcional E2-4 backend A–E, sin declarar producción ni auditoría externa completa.
**Local:** 797/797 pruebas sobre DB Windows con datos QA previos.
**CI:** 3/3 jobs, Python 3.12/3.14, PostgreSQL 16, `e24e_receipt_stock`.

## Archivo por objetivo

| Archivo | Uso |
|---|---|
| [01 Informe consolidado](01_INFORME_CONSOLIDADO_E2-4.md) | Informe académico rector, resultados y alcance |
| [02 Bitácora Swagger](02_BITACORA_PRUEBAS_SWAGGER.md) | **17 casos** observados; entradas, datos, HTTP, salidas |
| [03 Tests y CI](03_PRUEBAS_AUTOMATIZADAS_Y_CI.md) | Evolución por PR, 797 tests, error local y PR #18 |
| [04 Arquitectura](04_ARQUITECTURA_API_Y_DATOS.md) | Contratos reales, tablas, transacciones, riesgos contrastados con código |
| [05 Trazabilidad](05_TRAZABILIDAD_Y_PENDIENTES.md) | RF/CU → endpoints → tests; pendientes priorizados |
| [06 Ficha QA](06_FICHA_DATOS_QA.md) | UUID de empresa, proveedor, artículo, compras, depósito, recibo y movimiento |
| [07 Reproducción](07_GUIA_REPRODUCCION_SEGURA.md) | Guía PowerShell, Swagger y verificación sin mutar compra histórica |
| [08 Anexo JSON](08_EVIDENCIA_QA_SANITIZADA.json) | QA estructurado sin secretos, útil para revisión automática |
| [10 Observaciones](10_OBSERVACIONES_DE_AUDITORIA_Y_DECISIONES.md) | Respuesta razonada a comentarios externos; sin llamarla auditoría independiente completa |
| [Colección HTTP](requests/E2-4_QA.http) | Ejemplos parametrizados de proveedor/compra/replay/recepción/stock |
| `09_MANIFIESTO_SHA256.txt` | Hashes SHA256 del contenido versionado, formato `sha256sum -c` |

## Política de seguridad y procedencia

- **No se versionan contraseñas, tokens Bearer, claves idempotentes reales, `request_id` o cadenas de conexión.** Los UUID de recursos QA se preservan porque permiten comprobar GET e integridad; no equivalen a credenciales.
- `Swagger UI`: códigos y cuerpos aportados en conversación por el desarrollador; se clasifican como **observados/reportados**, no como ejecutados por un revisor independiente.
- `Windows`: Pytest/Alembic/Docker reportados por el desarrollador (20/20 y 797/797 al cierre).
- `GitHub Actions`: 6 runs finales y tres jobs por corte verificados mediante GitHub; el último run es [42530739959](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42530739959).
- **Proveedores:** falta un transcript completo de pruebas manuales de CRUD; tests automáticos/CI sí existen. No simular evidencia inexistente.
- **Reproducción:** las claves se omiten a propósito. Crear un escenario aislado NUEVO para demostrar replay sin divulgar claves previas.
- **PDF:** el PDF consolidado original queda como exportación académica externa. **No se versiona PDF ni ZIP en Git** para evitar duplicar contenido binario.
- **Integridad:** después de revisar documentos Markdown/JSON/HTTP, regenerar `09_MANIFIESTO_SHA256.txt`. Comprobar en la carpeta con `sha256sum -c 09_MANIFIESTO_SHA256.txt` en una terminal con `sha256sum` instalado. En PowerShell puro se pueden comparar `Get-FileHash -Algorithm SHA256`.

## Relación con el repositorio

- Evidencia E2-4 por subincremento: `plataforma-pyme/docs/E2-4_{A,B,D,E}_*.md`. Son **documentos históricos de cada corte** y pueden describir pendientes que ahora están implementados. No reescribir retrospectivamente su contenido.
- Fuente de código: `plataforma-pyme/backend/app/modules/{suppliers,purchases}/`, migraciones `backend/alembic/versions/20261108_0012…0015` y tests.
- Documentos de requisitos: `plataforma-pyme/entrega-programacion-2/01…05`; los esquemas conceptuales más amplios son **TO-BE** cuando exceden lo implementado.
- Hoja de entrega para una segunda auditoría formal: [E2-4_ENTREGA_PARA_REVISION.md](../E2-4_ENTREGA_PARA_REVISION.md). La revisión externa recibida fue una evaluación de los documentos, **no** el informe del revisor que todavía puede encargarse.

**Regla:** este cierre no autoriza iniciar refactors, cambios de API, nuevas migraciones ni operaciones comerciales pendientes sin decidir alcance y pasar pruebas.
