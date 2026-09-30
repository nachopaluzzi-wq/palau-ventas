# Palau Ventas — diseño técnico corregido

## Plataforma

Backend único: **Base44 Backend Function** (TypeScript/Deno).

No Supabase para Palau. No backend Python paralelo.

## Semántica de atomicidad

No hay evidencia documental de una transacción ACID multi-entidad en Base44. Implementar una **saga idempotente con coordinador de commit**, reanudación y compensación.

## Fuentes canónicas

- `Remito.items[]`: snapshot comercial.
- `MovimientoStock`: ledger de stock; agregar `REMITO_SALIDA` / reversión.
- `CuentaCorriente`: ledger de deuda; agregar `VENTA` / `COBRANZA`.
- `Cobranza`: documento de cobro e imputación.
- `Auditoria`: trazabilidad.

## Coordinador

Crear `OperacionRemito` con:
- `idempotency_key`
- `estado`: PREPARANDO | APLICANDO | CONFIRMADA | REVERSANDO | ANULADA | ERROR
- IDs de cada consecuencia
- error/intentos/referencia estable

## Confirmación

1. Resolver idempotencia.
2. Validar maestros, permisos, precios y stock.
3. Crear coordinador.
4. Crear Remito.
5. Crear MovimientoStock REMITO_SALIDA.
6. Crear CuentaCorriente VENTA.
7. Si cobra: Cobranza + CuentaCorriente COBRANZA.
8. Auditoría.
9. Marcar operación CONFIRMADA.

Cada paso usa una subclave idempotente estable.

## Fallos

No mostrar como confirmada una operación cuyo coordinador no esté CONFIRMADA.
Reintentar retomando solo pasos faltantes.
No borrar historia: compensar/revertir explícitamente.

## Prado 0004

Migración controlada posterior:
- salida stock faltante;
- CC VENTA $16.800;
- CC COBRANZA $16.800;
- saldo neto $0.

No duplicar Remito ni Cobranza existentes.
