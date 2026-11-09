# E2-5 — Manifiesto de integridad Git del paquete documental y auditoría

**Versión:** v1.2 del cierre publicado en [PR #24](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/24), commit original `c66df2f8ddaa8179ca12e342bd3099348bc6b155`. Manifiesto actualizado en la fe de erratas documental `docs/e2-5-fijar-sha-auditoria`.  
**Código funcional de referencia:** `main` `748e69319d8d04900c009d5184168a264a9deeac`.  
**Fecha:** 09/11/2026.  
**Carácter:** cierre interno publicado y encargo de auditoría **publicado pero todavía no ejecutado**. La fe de erratas no cambia el código E2-5.  

Este manifiesto enumera OID **Git blob** (SHA del contenido Git) de los **24 archivos de evidencia, documentación e índices**. **No son hashes SHA-256 de archivos sueltos**; el anterior `12_MANIFIESTO_SHA256.txt` del ZIP v1.0 no es válido para el contenido actual. El manifiesto no se incluye a sí mismo para evitar autorreferencia.

| Archivo relativo al repositorio | Git blob OID |
|---|---|
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md` | `b8011c7277828490d947511dbc4bb26a9e95651f` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/01_MATRIZ_AUDITORIA_E_INVARIANTES.md` | `5636b0ead1f0fc972b61587884e0eab92c44d04b` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/02_PLAN_PRUEBAS_Y_REPRODUCCION.md` | `fd10fd63b44daceee74e26d6064e429ed1e4c123` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/03_PROMPT_MAESTRO_AUDITOR_IA.md` | `31929c1f8f6ea943ad65fcb1e345730784d759f6` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/04_PLANTILLA_INFORME_Y_PR.md` | `0825fe85f305ff2379f1a9f263427cb8e411fbd5` |
| `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/05_CRITERIOS_ACEPTACION_Y_NO_REGRESION.md` | `5aa323508c4673f6dabe1bb2bcc6a458babfb822` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/00_LEEME.md` | `bfb360dc1c57cc66a8c5b6bfbd3371530497c631` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/01_INFORME_CONSOLIDADO.md` | `37baa4654ca4b5289b1fa30d338afd96ff040fb2` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/02_BITACORA_SWAGGER_E2-5_B.md` | `4f4e0e7c246a5f090e8f80565e67b069e951d8c0` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/03_BITACORA_SWAGGER_E2-5_C.md` | `6d0c77dd4869d922c0cda2958ec8abe8e5e7809a` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/04_PRUEBAS_AUTOMATIZADAS_CI_Y_WINDOWS.md` | `4ec016b037a82e2dcca4dfae6038ebe8736f53df` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/05_ARQUITECTURA_MODELO_Y_API.md` | `b18eb43d55eb2e873b232d5ef427ae23cc7ee2a7` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/06_MATRIZ_TRAZABILIDAD.md` | `bfd7b54059aeb50a227ff953ed0f12767cf62b27` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/07_FICHA_QA_SANITIZADA.md` | `7c770a0eb2c033ee8a4e7eea55676307922b1ed7` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/08_REPRODUCCION_SEGURA.md` | `532fe29e79df3a8fd0702cf44854e6aa7ada6d6f` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/09_RIESGOS_DEUDAS_Y_DECISIONES.md` | `2e5f11a29684d3f21cef5e10af4a696e68844c65` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/10_CHECKLIST_REVISION_Y_PUBLICACION.md` | `c6aeee023e4ca63f4a2da58487e34d78a30746eb` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/11_EVIDENCIA_ESTRUCTURADA.json` | `a5ce93be9ac05af642d82faadcca0878bd0ec11a` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/13_EVALUACION_OBSERVACIONES_IA.md` | `55ee57a8a2690d3ad2412f9c36eec3d8837daf88` |
| `plataforma-pyme/docs/revisiones/E2-5_CIERRE/14_REVISION_INTEGRAL_DOCUMENTAL.md` | `0d488a473727b6d20477d7b3a0418db4608c2e04` |
| `plataforma-pyme/docs/revisiones/E2-5_ENTREGA_PARA_REVISION.md` | `ecd34980388e603b7981920619d100d68b6688b2` |
| `plataforma-pyme/docs/revisiones/README.md` | `48c86aa6bc27f444c7e4d31404bfd796af7efe8f` |
| `plataforma-pyme/entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md` | `fab7b8eaeb0b0e8956dbab71d356a07aa7948739` |
| `plataforma-pyme/entrega-programacion-2/README.md` | `3b2a2b140288b6f861ba746f191d2eaf3e70a99a` |

## Comprobación local

Después de obtener la rama/commit exactos:

```powershell
git rev-parse HEAD
git status --short
git hash-object -- plataforma-pyme/docs/revisiones/E2-5_CIERRE/00_LEEME.md
git diff --name-status 748e69319d8d04900c009d5184168a264a9deeac HEAD
```

Repetir `git hash-object -- <ruta>` para cualquier fila y comparar con el OID publicado. En un shell POSIX puede automatizarse por tabla, sin tratar estos OID como SHA-256. Comprobar también `git diff --name-only` y el SHA del commit del PR para demostrar que no se introdujo código. **Si cambia cualquier archivo de la tabla, regenerar el manifiesto en el último commit documental**. El OID propio del manifiesto se verifica al fijar el commit Git de la rama.

**Seguridad:** el paquete no contiene credenciales ni claves de idempotencia reales. Los UUID QA se conservaron por aprobación explícita del responsable. La sesión asociada al token expuesto fue revocada según respuesta `POST /api/v1/auth/logout` `204` aportada por el desarrollador (no es una consulta SQL de todas las sesiones).
