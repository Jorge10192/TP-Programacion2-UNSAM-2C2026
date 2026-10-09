## MANEJO DE MODULO EXTENSIBLE

Se desarrolla un modulo para de administracion general para una empreas especifica de bocaditos de mascota. 
Luego se extiende a una version generica, para que cualquier empresa puedar cargar sus datos y usar el sistema 

```text
Proyecto 1 — WALOS
│
├── caso real
├── requerimientos específicos
├── módulo de compras completo
├── inventario
├── producción
├── ventas
└── etc.

Proyecto 2 — Sistema genérico
│
├── nace a partir del proyecto WALOS
├── Empresa como concepto general
├── Empresa = WALOS como primera configuración
├── módulos reutilizables
└── elimina dependencias específicas del negocio
```

## Módulo de Compras

```text
COMPRAS
│
├── Proveedores
│   ├── Crear
│   ├── Editar
│   ├── Desactivar
│   └── Consultar
│
├── Catálogo de ítems
│   ├── Crear
│   ├── Categorizar
│   ├── Unidad de medida
│   └── Activar/desactivar
│
├── Registrar compra
│   ├── Proveedor
│   ├── Fecha
│   ├── Ítems
│   ├── Cantidades
│   ├── Precio
│   ├── Comprobante
│   └── Usuario
│
├── Historial
│   ├── Compras
│   └── Precios
│
└── Inventario
    └── Ingresar mercadería comprada
```


