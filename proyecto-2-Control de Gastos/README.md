# Saldo - Control de Gastos

Prototipo web para organizar gastos compartidos entre amigos, parejas o equipos. Permite registrar consumos, repartirlos entre participantes y calcular quién le debe a quién.

## Funciones actuales

- Crear espacios de tipo evento, permanente u objetivo.
- Registrar gastos y dividirlos en partes iguales, montos o porcentajes.
- Consultar movimientos, presupuestos y saldos.
- Calcular una propuesta simple para saldar las deudas.
- Registrar aportes a objetivos de ahorro.
- Generar un enlace de invitación y un resumen visual simulados.

## Ejecutar la demo

No requiere instalación ni dependencias.

1. Abrir `saldo-demo.html` en un navegador moderno.
2. Navegar con el menú inferior.
3. Crear un espacio o registrar un gasto para ver cómo se actualizan los saldos.

También se puede servir localmente desde esta carpeta:

```bash
python -m http.server 8000
```

Luego abrir `http://localhost:8000/saldo-demo.html`.

## Limitaciones

La aplicación es una demo de frontend. Los datos se guardan solo en memoria y se pierden al recargar la página. No incluye usuarios reales, base de datos, backend ni pagos reales.

## Documentación

La definición del sistema, los requisitos, los casos de uso, los diagramas y las pruebas mínimas están en [Ingeniería de Software/Documentación.md](Ingenieria%20de%20Software/Documentacion.md).
