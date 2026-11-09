# E2-5 — Manifiesto de integridad de archivos versionados (Git blobs)

**Versión:** v1.1 en rama documental `docs/e2-5-cierre-revision-critica`.  
**Código funcional de referencia:** `main` `748e69319d8d04900c009d5184168a264a9deeac`.  
**Fecha:** 09/11/2026.  
**Carácter:** borrador documental, no auditoría independiente ni publicación final.

La versión v1.0 se distribuyó como ZIP con un manifiesto SHA-256 **del contenido anterior**. Tras las correcciones editoriales, dichos hashes **ya no son aplicables**. La tabla indica los **OID de blob de Git** devueltos por GitHub para el contenido exacto de cada archivo en esta rama, no SHA-256. El manifiesto no se incluye a sí mismo para evitar autorreferencia.

| Archivo relativo al repositorio | Blob SHA de Git |
|---|---|
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/00_LEEME.md` | `5cccd8373c9ebb600da6b5a4c65be8162a4ee906` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/01_INFORME_CONSOLIDADO.md` | `73c260d71a46dbce654549f40a260606df831280` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/02_BITACORA_SWAGGER_E2-5_B.md` | `4f4e0e7c246a5f090e8f80565e67b069e951d8c0` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/03_BITACORA_SWAGGER_E2-5_C.md` | `38826fd4ecc0a4568b79c7a368a060a4bba3848d` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/04_PRUEBAS_AUTOMATIZADAS_CI_Y_WINDOWS.md` | `4ec016b037a82e2dcca4dfae6038ebe8736f53df` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/05_ARQUITECTURA_MODELO_Y_API.md` | `801eb2beb6024ca4fa52df742c8d085f389467d5` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/06_MATRIZ_TRAZABILIDAD.md` | `949f16ddf29b13f8923c1eb8dc14292f255db2d2` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/07_FICHA_QA_SANITIZADA.md` | `7c770a0eb2c033ee8a4e7eea55676307922b1ed7` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/08_REPRODUCCION_SEGURA.md` | `ce2fb52d9202bc4342922d3642b3574c0267c94a` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/09_RIESGOS_DEUDAS_Y_DECISIONES.md` | `2fe5ce61f7394bc161a738800fe97d29b0bb045e` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/10_CHECKLIST_REVISION_Y_PUBLICACION.md` | `a7b0d582ce7ff53cdc4f55b458c061e26dfcf273` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/11_EVIDENCIA_ESTRUCTURADA.json` | `1003196524602e81957e7a95c76af2d30441ecf2` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/13_EVALUACION_OBSERVACIONES_IA.md` | `6dff27a21392e577780dd1cbc4bf79f25fa0c331` |
| `plataforma-pyme/docs/revisiones/README.md` | `cd471819b0d570aae147e989ae144462d6f90bc2` |
| `plataforma-pyme/entrega-programacion-2/README.md` | `c3d120e52f6353c6b5ff17823b6e629995d6c3c6` |

## Verificación

En una copia del repositorio ubicada en el commit de esta rama se puede verificar cada blob con `git hash-object -- <ruta>` y compararlo con esta tabla. Para verificar el conjunto final se contrasta además `git rev-parse HEAD` con el SHA del PR y `git diff --name-only <base>...HEAD` para asegurar alcance exclusivamente documental. No confundir el SHA del commit funcional de E2-5 con el SHA del PR documental posterior.

**Control de secretos efectuado:** se revisaron los documentos del PR buscando tokens Bearer con valor real, claves idempotentes de las solicitudes previas, correo QA y credenciales; no se publican esos valores. Se conservan UUID de recursos QA ya explicitados en la ficha, no credenciales.
