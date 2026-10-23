NEGOCIO
│
├── UsuarioNegocio
│      └── rol
│
├── Categoria
│
├── ArticuloCatalogo
│      ├── es_comprable
│      ├── es_vendible
│      ├── controla_stock
│      └── puede_usarse_en_produccion
│
├── Ubicacion
│
├── INVENTARIO
│      ├── StockUbicacion
│      ├── Lote [opcional según artículo]
│      └── MovimientoInventario
│
├── COMPRAS
│      ├── Compra
│      └── ItemCompra
│
├── VENTAS
│      ├── Venta
│      ├── ItemVenta
│      └── Pago
│
├── CAJA
│      ├── SesionCaja
│      └── MovimientoCaja
│
├── PRODUCCION
│      ├── Receta
│      ├── ItemReceta
│      └── Produccion
│
└── AUDITORIA
       └── RegistroActividad
