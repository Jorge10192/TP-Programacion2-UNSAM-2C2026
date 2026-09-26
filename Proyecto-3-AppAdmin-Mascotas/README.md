# WALOS

Documentación de una aplicación para la panadería para mascotas WALOS. El proyecto está en definición de alcance; este repositorio todavía no contiene una API implementada.

## Documentos

- [Requerimientos](docs/requerimientos.md): necesidades del negocio, reglas, casos de uso y decisiones pendientes.
- [Guía técnica](docs/guia-tecnica.md): modelo propuesto, flujos de stock y pedidos, endpoints y criterios de entrega de Programación 2.
- [Requerimientos en PDF](output/pdf/WALOS_Requerimientos.pdf): versión breve para revisar con WALOS y entregar; máximo cinco páginas.

## Origen y estado

La base es la conversación [Crear app para negocio](https://chatgpt.com/c/6ab6f499-0df4-83e9-b031-537f21d4e2b4), la fotografía de un producto WALOS, la consigna de Programación 2 y el PDF de referencia `WALOS_Requerimientos_actualizado (1).pdf` aportado después. La entrevista íntegra con el negocio no estaba disponible como texto. Los documentos distinguen necesidades expresadas de propuestas que requieren validación.

**Próximo paso:** revisar las [decisiones pendientes](docs/requerimientos.md#decisiones-pendientes-con-walos) con WALOS antes de fijar precios, vencimientos, medios de pago y reglas de promociones.

Para regenerar el PDF a partir del borrador, instalar `reportlab` y ejecutar `python scripts/build_requerimientos_pdf.py` desde esta carpeta. El generador selecciona una fuente disponible del sistema.
