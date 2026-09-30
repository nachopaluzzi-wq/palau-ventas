# Palau Ventas — reconciliación productiva (30/09/2026)

## Evidencia de uso

| Entidad | Registros | Estado observado |
|---|---:|---|
| Remito | 4 | Activa |
| Cobranza | 2 | Activa |
| MovimientoStock | 1 | Parcial: solo saldo inicial |
| CuentaCorriente | 7 | Históricos/ajustes |
| Anulacion | 1 | Activa |
| Auditoria | 3 | Activa |
| RemitoItem | 0 | Sin uso observado |
| Movimiento | 0 | Sin uso observado |
| Presupuesto | 0 | Sin uso observado |
| PresupuestoItem | 0 | Sin uso observado |
| CajaMovimiento | 0 | Sin uso observado |

## Hallazgo principal

El remito 0004 (Prado, $16.800) y su cobranza existen, pero no generaron un `MovimientoStock` ni un movimiento de `CuentaCorriente`.

Por lo tanto, el bloqueador real es la falta de una consecuencia atómica y verificable:

`Remito -> stock -> saldo/cobranza -> auditoría`

## Items

Los remitos reales usan `Remito.items[]`. `RemitoItem` tiene 0 registros. No desarrollar `DeliveryNoteItem` Python como prioridad productiva.

## Stock

Saldo inicial del Camión:
- 500 S/G: 552 u = 46 packs.
- 1,5 S/G: 1452 u = 242 packs.

Prado vendió 12 u de 500 S/G y 12 u de 1,5 S/G.

Saldo físico esperado tras Prado:
- 500 S/G: 540 u = 45 packs.
- 1,5 S/G: 1440 u = 240 packs.

El ledger `MovimientoStock` no recibió esa salida.

## Cuenta corriente

Prado no tiene registro en `CuentaCorriente`. Los existentes son regularizaciones/saldos históricos.

Se debe elegir una sola fuente canónica de saldo y evitar doble contabilización entre documentos y ledger.

## Enzo

Enzo existe como `Socio` 50% (ID `6abc851b50f345f3282df55d`) y no como `User`.

La cobranza de Prado fue corregida para guardar `recibido_por_socio_id` apuntando a Enzo, además del nombre.

## Presupuestos

El modelo actual de `Presupuesto` es legado respecto de `Remito`: strings para cliente/vendedor, `number` en lugar de centavos y sin idempotencia. No habilitar conversión hasta reconciliarlo.

## Prioridad productiva

Hacer atómica e idempotente la confirmación de un remito:

1. Remito confirmado.
2. Salida de stock desde `ubicacion_origen_id`.
3. Impacto de saldo en una única fuente canónica.
4. Cobranza imputada cuando corresponda.
5. Auditoría.
6. Reversión explícita en anulación.

Mantener `Remito.items[]` como snapshot histórico. Usar `MovimientoStock` como ledger físico agregando un tipo explícito de venta/remito cuando se implemente.
