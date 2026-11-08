# Entrega - Programación 2

**Asistente PyME:** plataforma multiempresa y multirrubro. Código ejecutable en `plataforma-pyme`; WALOS es un negocio de ejemplo.

## Orden de lectura y revisión

| Documento | Contenido |
|---|---|
| [01 - Requerimientos](01_ANALISIS_DE_REQUERIMIENTOS.md) | Objetivos, RF/RNF y alcance actual |
| [02 - Casos de uso](02_CASOS_DE_USO.md) | CU-01 a CU-11 integrados, CU-12 diferido, extensiones CU-13/14 |
| [03 - Dominio y UML](03_MODELO_DE_DOMINIO_Y_UML.md) | Cambios de v0.4 a v0.5, modelo implementado, modelo conceptual y criterios de aprobación |
| [04 - Arquitectura y patrones](04_ARQUITECTURA_Y_PATRONES.md) | Monolito modular, transacciones y patrones aplicados/propuestos |
| [05 - API y trazabilidad](05_MATRIZ_API_Y_TRAZABILIDAD.md) | Rutas ejecutables, permisos, errores y reglas de precisión |
| [06 - Pruebas y despliegue](06_PRUEBAS_Y_DESPLIEGUE.md) | Comandos reproducibles, aceptación y límites de publicación |
| [Diagramas](diagramas/README.md) | Láminas conceptuales SVG, fuentes PlantUML y guías |

La implementación sigue las dependencias E2: identidad y empresas → recursos → compra/recepción → stock → venta → integración React → pruebas/documentación/deploy. Gastos/caja y cuentas declaradas completan el circuito conectado. [Instalación](../README.md).

## Convenciones

- **Implementado en rama:** existe código y una comprobación local reproducible. No implica merge, CI publicada, deploy ni aprobación del equipo.
- **DEMO:** persistencia local y acciones simuladas; no equivale a seguridad o pagos reales.
- **Conceptual / propuesto:** diseño futuro o detalle de persistencia diferente del código actual. El apartado 0 del Documento 03 explica las diferencias; 05 fija los contratos reales.
- **Diferido:** invitaciones reales, QR/pagos bancarios, fotos sincronizadas, recetas, reservas y otras extensiones expresamente identificadas.

Los documentos E0/E1 de `../docs` conservan el historial del prototipo. Se consultan como antecedentes; el contrato vigente de integración está en 05. Las aprobaciones académicas corresponden al equipo y siguen pendientes hasta su revisión.

Se conserva la regla de revisión incremental E2 acordada con Jorge. Esta rama aplica la política C.1 a edición empresarial C.2 y conecta los recursos/comandos posteriores. Invitaciones y gestión de miembros C.3/C.4 permanecen identificadas como pendientes; no se consideran aprobadas por avanzar con el circuito comercial.
