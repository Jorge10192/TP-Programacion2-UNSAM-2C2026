# CU-07 — Confirmar reserva mediante seña

## Actor principal

Trabajador WALOS.

## Actor secundario

Cliente.

## Objetivo

Permitir que un trabajador gestione una reserva generada previamente, continúe la comunicación con el cliente, solicite la seña calculada por el sistema, confirme su recepción y formalice la aceptación de la reserva.

Una vez confirmada la seña, el trabajador puede ajustar datos operativos de la reserva —como fecha, horario, punto de retiro o detalles de entrega— sin que el cliente tenga que generar una nueva reserva.

Para que la reserva pase al estado `ACEPTADA`, WALOS debe:

- confirmar la recepción de la seña;
- definir cómo cumplirá el pedido;
- comprometer mercadería existente, planificar nueva producción o combinar ambas alternativas.

---

## Precondiciones

- Debe existir una reserva creada previamente mediante el sistema.
- La reserva debe encontrarse en estado `PENDIENTE` o `EN GESTIÓN`.
- El trabajador debe haber iniciado sesión en el sistema.
- La reserva debe contener información suficiente para su gestión.
- El sistema debe haber calculado previamente el importe de la seña.
- Deben existir medios de pago habilitados por WALOS para recibir la seña.

---

## Disparador

El trabajador selecciona una reserva pendiente para comenzar su gestión y solicitar la seña correspondiente al cliente.

---

## Información disponible para el trabajador

Al abrir una reserva, el sistema debe mostrar como mínimo:

- identificador de la reserva;
- nombre del cliente;
- medio de contacto;
- productos solicitados;
- cantidades;
- promociones aplicadas;
- total del pedido;
- importe de la seña requerida;
- modalidad de entrega;
- lugar de retiro o entrega;
- fecha deseada;
- observaciones;
- estado actual de la reserva.

---

## Flujo principal

1. El trabajador accede a la lista de reservas pendientes.
2. El sistema muestra las reservas disponibles para gestión.
3. El trabajador selecciona una reserva.
4. El sistema muestra el detalle completo del pedido.
5. El trabajador toma la reserva para gestionarla.
6. El sistema cambia la reserva al estado `EN GESTIÓN`.
7. El trabajador revisa:
   - productos;
   - cantidades;
   - total;
   - seña requerida;
   - fecha deseada;
   - modalidad de entrega;
   - punto de retiro o entrega;
   - medio de contacto.
8. El trabajador continúa la comunicación con el cliente mediante el canal registrado.
9. El trabajador confirma que la reserva puede avanzar.
10. El sistema obtiene automáticamente:
    - el importe exacto de la seña;
    - los datos de pago o transferencia;
    - la referencia de la reserva.
11. El sistema genera la información necesaria para solicitar la seña.
12. El trabajador envía al cliente el importe y los datos para realizar el pago.
13. El sistema puede cambiar la reserva al estado `ESPERANDO SEÑA`.
14. El cliente realiza el pago de la seña.
15. El cliente informa al trabajador que realizó el pago y, cuando corresponda, envía un comprobante.
16. El trabajador verifica la recepción de la seña.
17. El trabajador confirma en el sistema que la seña fue recibida.
18. El sistema registra:
    - importe abonado;
    - medio de pago;
    - fecha y hora;
    - trabajador que realizó la confirmación;
    - reserva asociada.
19. El sistema informa al trabajador que debe definir cómo se completará la mercadería del pedido.
20. El trabajador indica si la reserva se cumplirá mediante:
    - stock existente;
    - nueva producción;
    - combinación de ambas.
21. El trabajador asigna o planifica mercadería válida registrada en el sistema.
22. El sistema registra la mercadería comprometida y/o la producción pendiente asociada a la reserva.
23. El sistema verifica las condiciones de aceptación.
24. Si la seña está confirmada y WALOS definió cómo cumplirá el pedido, la reserva pasa al estado `ACEPTADA`.
25. El sistema informa al trabajador que la reserva fue aceptada.
26. El trabajador comunica al cliente que su pedido fue aceptado.

---

## Solicitud automática de la seña

El trabajador no debe calcular manualmente el importe de la seña.

Cuando la reserva entra en gestión, el sistema debe disponer de:

- importe exacto de la seña;
- datos de la cuenta o medio de pago;
- referencia de la reserva.

El sistema puede generar automáticamente un mensaje como el siguiente:

```text
Reserva R-0025

Seña requerida: $8.000

Datos para transferencia:
...

Referencia: R-0025
