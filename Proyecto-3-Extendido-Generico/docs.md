```
docs/
│
├── 00-definicion-y-vision.md
│
├── 01-stakeholders-y-actores.md
├── 02-requerimientos-no-funcionales.md
├── 03-reglas-generales-negocio.md
├── 04-mapa-modulos-y-trazabilidad.md
│
├── modulos/
│   ├── 01-organizacion-negocio.md
│   ├── 02-catalogo.md
│   ├── 03-compras-y-proveedores.md
│   ├── 04-inventario-y-ubicaciones.md
│   ├── 05-ventas-y-pagos.md
│   ├── 06-caja-y-gastos.md
│   ├── 07-produccion.md
│   └── 08-analitica.md
│
├── modelo-dominio/
│   ├── modelo-general.md
│   ├── diagrama-clases.puml
│   ├── estados.puml
│   └── secuencias/
│       ├── compra.puml
│       ├── transferencia-stock.puml
│       ├── venta.puml
│       ├── anulacion-venta.puml
│       ├── cierre-caja.puml
│       └── produccion.puml
│
├── arquitectura/
│   ├── arquitectura-general.md
│   ├── estructura-backend.md
│   ├── patrones-de-diseno.md
│   ├── multitenant-y-seguridad.md
│   ├── docker.md
│   └── adrs/
│       ├── ADR-001-catalogo-por-capacidades.md
│       ├── ADR-002-stock-movimientos-y-lotes.md
│       ├── ADR-003-fefo-transparente.md
│       ├── ADR-004-sesion-caja-por-ubicacion.md
│       ├── ADR-005-multitenancy-pragmatico.md
│       └── ADR-006-anulaciones-compensatorias.md
│
├── base-de-datos/
│   ├── modelo-relacional.md
│   └── erd.puml
│
├── api/
│   ├── contrato-api.md
│   ├── endpoints.md
│   └── schemas-dto.md
│
├── ux/
│   ├── principios-diseno.md
│   ├── navegacion.md
│   ├── pantallas-mvp.md
│   └── flujos-mobile-first.md
│
├── datos-demo/
│   ├── configuracion-walos.md
│   ├── walos-seed.json
│   └── negocio-demo.md
│
├── pruebas/
│   ├── estrategia-pruebas.md
│   ├── criterios-aceptacion-mvp.md
│   └── escenarios-end-to-end.md
│
├── planificacion/
│   ├── plan-implementacion.md
│   ├── riesgos.md
│   └── backlog-futuro.md
│
└── prompts/
    ├── prompt-revision-documentacion.md
    └── prompt-maestro-implementacion.md
```
