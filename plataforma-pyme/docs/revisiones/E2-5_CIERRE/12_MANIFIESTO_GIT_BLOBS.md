# E2-5 — Manifiesto de integridad Git del paquete documental y auditoría

**Versión:** v1.2 en PR [#24](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/24), rama `docs/e2-5-cierre-revision-critica`.  
**Código funcional de referencia:** `main` `748e69319d8d04900c009d5184168a264a9deeac`.  
**Fecha:** 09/11/2026.  
**Carácter:** cierre interno revisado + encargo de auditoría **preparado pero no ejecutado**, pendiente de aprobación/merge.  

Este manifiesto enumera OID **Git blob** (SHA del contenido Git) de los **24 archivos de evidencia, documentación e índices**. **No son hashes SHA-256 de archivos sueltos**; el anterior `12_MANIFIESTO_SHA256.txt` del ZIP v1.0 no es válido para el contenido actual. El manifiesto no se incluye a sí mismo para evitar autorreferencia.

| Archivo relativo al repositorio | Git blob OID |
|---|---|
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md` | `0d0ad84ab2d34f81d81a2d02a3f57e9b6b7e7c62` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/01_MATRIZ_AUDITORIA_E_INVARIANTES.md` | `5636b0ead1f0fc972b61587884e0eab92c44d04b` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/02_PLAN_PRUEBAS_Y_REPRODUCCION.md` | `fd10fd63b44daceee74e26d6064e429ed1e4c123` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/03_PROMPT_MAESTRO_AUDITOR_IA.md` | `83ca78181056c0e01a112d439ed1685212f3966b` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/04_PLANTILLA_INFORME_Y_PR.md` | `0121d656e364749a4e055f8d25a6ae6e95b6f4b6` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/05_CRITERIOS_ACEPTACION_Y_NO_REGRESION.md` | `074c1a0d344c046ad246a631446f639155fe9da6` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/00_LEEME.md` | `4050ad0e52bd869179d75b11b69dc91b6e18d97e` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/01_INFORME_CONSOLIDADO.md` | `d30e5b17aaeaef9ff5e5387f97cdc876096bf1c8` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/02_BITACORA_SWAGGER_E2-5_B.md` | `4f4e0e7c246a5f090e8f80565e67b069e951d8c0` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/03_BITACORA_SWAGGER_E2-5_C.md` | `6d0c77dd4869d922c0cda2958ec8abe8e5e7809a` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/04_PRUEBAS_AUTOMATIZADAS_CI_Y_WINDOWS.md` | `4ec016b037a82e2dcca4dfae6038ebe8736f53df` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/05_ARQUITECTURA_MODELO_Y_API.md` | `b18eb43d55eb2e873b232d5ef427ae23cc7ee2a7` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/06_MATRIZ_TRAZABILIDAD.md` | `bfd7b54059aeb50a227ff953ed0f12767cf62b27` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/07_FICHA_QA_SANITIZADA.md` | `7c770a0eb2c033ee8a4e7eea55676307922b1ed7` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/08_REPRODUCCION_SEGURA.md` | `532fe29e79df3a8fd0702cf44854e6aa7ada6d6f` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/09_RIESGOS_DEUDAS_Y_DECISIONES.md` | `2e5f11a29684d3f21cef5e10af4a696e68844c65` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/10_CHECKLIST_REVISION_Y_PUBLICACION.md` | `a613b79136e19653a93e77b1486afa1c5d5d06f8` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/11_EVIDENCIA_ESTRUCTURADA.json` | `a5ce93be9ac05af642d82faadcca0878bd0ec11a` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/13_EVALUACION_OBSERVACIONES_IA.md` | `55ee57a8a2690d3ad2412f9c36eec3d8837daf88` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/14_REVISION_INTEGRAL_DOCUMENTAL.md` | `434e23c8ef6ce2a3703bc0aad8955f35ba6d78a6` |
| `plataforma-pyme/docs/revisiones/E2-5_ENTREGA_PARA_REVISION.md` | `7c74b99cb5080156d1024d8618ebe8d0e5db3d99` |
| `plataforma-pyme/docs/revisiones/README.md` | `48212f867a5878b4b68bc139e2aa433f958b1a0b` |
| `plataforma-pyme/entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md` | `fab7b8eaeb0b0e8956dbab71d356a07aa7948739` |
| `plataforma-pyme/entrega-programacion-2/README.md` | `49c22e65c7339c69818efd2478a26af26d15573a` |

## Comprobación local

Después de obtener la rama/commit exactos:

```powershell
git rev-parse HEAD
git status --short
git hash-object -- plataforma-pyme/docs/revisiones/E2-5_CIERRE/00_LEEME.md
git diff --name-status 748e69319d8d04900c009d5184168a264a9deeac HEAD
```

Repetir `git hash-object -- <ruta>` para cualquier fila y comparar con el OID publicado. En un shell POSIX puede automatizarse por tabla, sin tratar estos OID como SHA-256. Comprobar también `git diff --name-only` y el SHA del commit del PR para demostrar que no se introdujo código. **Si cambia cualquier archivo de la tabla, regenerar el manifiesto en el último commit documental**. El OID propio del manifiesto se verifica al fijar el commit Git de la rama.

**Seguridad:** la revisión del contenido del paquete buscó tokens Bearer reales, claves de idempotencia de QA, contraseñas, DSN y correo QA sin encontrarlos en estos archivos. Las fichas contienen identificadores de recursos empresariales QA, no credenciales; su publicación externa debe ser aprobada por el equipo. **Revocación del token previamente expuesto: no verificada**.
