# Cactus-CarWash ERP v1.9.1

Corrección consolidada de integración con Caja y navegación.

## Incluye

- Ruta `/api/pos/payment-methods` restaurada.
- Coffee Bar envía la caja seleccionada al cobrar.
- Cobro de órdenes CarWash/Taller registrado en Caja Recepción.
- Validación de sesión abierta antes de cobrar.
- Solo los pagos en efectivo incrementan el efectivo esperado.
- Botón **Volver** en pantallas secundarias principales.
- Mensajes operativos en español.

## Aplicación

```bash
pnpm install
pnpm db:generate
pnpm db:seed
pnpm check
```

No requiere una migración nueva sobre v1.9.0.

## Prueba

1. Abrir Caja Coffee Bar.
2. Cobrar una venta directa.
3. Confirmar el movimiento en Caja.
4. Abrir Caja Recepción.
5. Cobrar una orden desde HOLD.
6. Confirmar el movimiento en Caja Recepción.
