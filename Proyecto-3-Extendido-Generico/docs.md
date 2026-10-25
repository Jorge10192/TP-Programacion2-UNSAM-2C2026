```
docs/
│
├── README.md
│
├── 00-definicion-y-vision.md
├── 01-stakeholders-y-actores.md
├── 02-requerimientos-no-funcionales.md
├── 03-reglas-generales-negocio.md
├── 04-mapa-modulos-y-trazabilidad.md
│
│
├── modulos/
│   │
│   ├── 01-organizacion-negocio.md
│   ├── 02-catalogo.md
│   ├── 03-compras-y-proveedores.md
│   ├── 04-inventario-y-ubicaciones.md
│   ├── 05-ventas-y-pagos.md
│   ├── 06-caja-y-gastos.md
│   ├── 07-produccion.md
│   └── 08-analitica.md
│
│
├── modelo-dominio/
│   │
│   ├── modelo-general.md
│   ├── diagrama-general.puml
│   │
│   ├── bloque-1-fundacion/
│   │   ├── modelo-dominio.md
│   │   └── diagrama-clases.puml
│   │
│   ├── bloque-2-abastecimiento-inventario/
│   │   ├── modelo-dominio.md
│   │   └── diagrama-clases.puml
│   │
│   ├── bloque-3-operacion-comercial/
│   │   ├── modelo-dominio.md
│   │   └── diagrama-clases.puml
│   │
│   └── bloque-4-extensiones/
│       ├── modelo-dominio.md
│       └── diagrama-clases.puml
│
│
├── arquitectura/
│   │
│   ├── arquitectura-general.md
│   ├── estructura-backend.md
│   ├── patrones-de-diseno.md
│   ├── multitenant-y-seguridad.md
│   ├── docker.md
│   │
│   ├── adrs/
│   │   │
│   │   ├── bloque-1-fundacion/
│   │   │   ├── ADR-001-catalogo-por-capacidades.md
│   │   │   └── ADR-002-multitenancy-pragmatico.md
│   │   │
│   │   ├── bloque-2-abastecimiento-inventario/
│   │   │   ├── ADR-003-stock-movimientos-y-lotes.md
│   │   │   └── ADR-004-fefo-transparente.md
│   │   │
│   │   ├── bloque-3-operacion-comercial/
│   │   │   ├── ADR-005-sesion-caja-por-ubicacion.md
│   │   │   └── ADR-006-anulaciones-compensatorias.md
│   │   │
│   │   └── bloque-4-extensiones/
│   │
│   └── flujos/
│       │
│       ├── bloque-1-fundacion/
│       │   ├── invitacion-miembro.puml
│       │   └── gestion-catalogo.puml
│       │
│       ├── bloque-2-abastecimiento-inventario/
│       │   ├── compra.puml
│       │   └── transferencia-stock.puml
│       │
│       ├── bloque-3-operacion-comercial/
│       │   ├── venta.puml
│       │   ├── anulacion-venta.puml
│       │   └── cierre-caja.puml
│       │
│       └── bloque-4-extensiones/
│           └── produccion.puml
│
│
├── base-de-datos/
│   │
│   ├── modelo-general.md
│   ├── erd-general.puml
│   │
│   ├── bloque-1-fundacion/
│   │   ├── modelo-relacional.md
│   │   └── erd.puml
│   │
│   ├── bloque-2-abastecimiento-inventario/
│   │   ├── modelo-relacional.md
│   │   └── erd.puml
│   │
│   ├── bloque-3-operacion-comercial/
│   │   ├── modelo-relacional.md
│   │   └── erd.puml
│   │
│   └── bloque-4-extensiones/
│       ├── modelo-relacional.md
│       └── erd.puml
│
│
├── api/
│   │
│   ├── contrato-general.md
│   │
│   ├── bloque-1-fundacion/
│   │   ├── contrato-api.md
│   │   ├── endpoints.md
│   │   └── schemas-dto.md
│   │
│   ├── bloque-2-abastecimiento-inventario/
│   │   ├── contrato-api.md
│   │   ├── endpoints.md
│   │   └── schemas-dto.md
│   │
│   ├── bloque-3-operacion-comercial/
│   │   ├── contrato-api.md
│   │   ├── endpoints.md
│   │   └── schemas-dto.md
│   │
│   └── bloque-4-extensiones/
│       ├── contrato-api.md
│       ├── endpoints.md
│       └── schemas-dto.md
│
│
├── ux/
│   │
│   ├── principios-diseno.md
│   ├── navegacion-general.md
│   │
│   ├── bloque-1-fundacion/
│   │   ├── flujos.md
│   │   ├── pantallas.md
│   │   └── wireframes/
│   │
│   ├── bloque-2-abastecimiento-inventario/
│   │   ├── flujos.md
│   │   ├── pantallas.md
│   │   └── wireframes/
│   │
│   ├── bloque-3-operacion-comercial/
│   │   ├── flujos.md
│   │   ├── pantallas.md
│   │   └── wireframes/
│   │
│   └── bloque-4-extensiones/
│       ├── flujos.md
│       ├── pantallas.md
│       └── wireframes/
│
│
├── datos-demo/
│   │
│   ├── README.md
│   │
│   ├── walos/
│   │   ├── configuracion.md
│   │   └── seed.json
│   │
│   └── servicios/
│       ├── configuracion.md
│       └── seed.json
│
│
├── pruebas/
│   │
│   ├── estrategia-pruebas.md
│   │
│   ├── bloque-1-fundacion/
│   │   ├── casos-prueba.md
│   │   └── escenarios-e2e.md
│   │
│   ├── bloque-2-abastecimiento-inventario/
│   │   ├── casos-prueba.md
│   │   └── escenarios-e2e.md
│   │
│   ├── bloque-3-operacion-comercial/
│   │   ├── casos-prueba.md
│   │   └── escenarios-e2e.md
│   │
│   ├── bloque-4-extensiones/
│   │   ├── casos-prueba.md
│   │   └── escenarios-e2e.md
│   │
│   └── criterios-aceptacion-mvp.md
│
│
├── planificacion/
│   ├── plan-implementacion.md
│   ├── estado-proyecto.md
│   ├── riesgos.md
│   └── backlog-futuro.md
│
│
└── prompts/
    ├── prompt-revision-documentacion.md
    └── prompt-maestro-implementacion.md
```
