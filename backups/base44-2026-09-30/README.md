# CHECKPOINT PRE-ATOMIC — Base44 Palau

App productiva: `6ab44f946746388d9ad48b68`

Fecha de captura: 2026-09-30

El checkpoint nativo de Base44 no pudo crearse porque el acceso de agentes externos a checkpoint/sandbox requiere plan Builder. Para no bloquear el trabajo se creó este snapshot externo verificable.

## Archivos

- `CORE_TRANSACTIONAL.json`
  - Remito
  - RemitoItem
  - Cobranza
  - MovimientoStock
  - Movimiento
  - CuentaCorriente
  - Presupuesto
  - PresupuestoItem
  - Anulacion
  - Auditoria
  - CajaMovimiento

- `MASTERS_REFERENCE.json`
  - Cliente
  - Sucursal
  - Articulo
  - PrecioProducto
  - ListaPrecio
  - Deposito
  - PuntoVenta
  - Socio
  - User
  - CargaCamion
  - CargaDetalle

## Commits

- Núcleo transaccional: `6fe1c17d3322e55b95ceb4254bbd94c1bd31a5a7`
- Maestros/referencias: `c4606d10b41facbf284a5f6add467cc5b76703cd`

## Uso

Tomar estos archivos como línea base para comparar cualquier cambio posterior en Base44.

No restaurar ciegamente: una recuperación debe respetar idempotencia y no duplicar remitos, cobranzas, movimientos de stock ni cuenta corriente.
