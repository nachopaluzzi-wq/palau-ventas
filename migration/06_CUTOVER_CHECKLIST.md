# Palau Ventas — checklist de corte productivo

## A. Antes de migrar
- [ ] Congelar cambios estructurales en la app vieja.
- [ ] No borrar Base44.
- [ ] Confirmar que los snapshots 2026-10-01 están presentes.
- [ ] Crear base PostgreSQL vacía.
- [ ] Ejecutar `01_schema.sql`.

## B. Importación
- [ ] Ejecutar `02_import_snapshots.ts`.
- [ ] La importación termina sin `migration_conflict` pendiente.
- [ ] No se crearon datos demo.
- [ ] No se modificó ningún ID.

## C. Conteos obligatorios
- [ ] Cliente = 4
- [ ] Articulo = 38
- [ ] PrecioProducto = 6
- [ ] ListaPrecio = 3
- [ ] Deposito = 2
- [ ] PuntoVenta = 1
- [ ] Socio = 2
- [ ] User = 1
- [ ] Remito = 5
- [ ] Cobranza = 3
- [ ] MovimientoStock = 3
- [ ] CuentaCorriente = 16
- [ ] Auditoria = 6
- [ ] OperacionRemito = 2
- [ ] Presupuesto = 2
- [ ] PresupuestoItem = 4
- [ ] Anulacion = 1

Las entidades con 0 registros deben seguir existiendo con 0, no llenarse con demos.

## D. Identidad e historia
- [ ] Los 4 Cliente.id coinciden exactamente con origen.
- [ ] Todos los Remito.id coinciden.
- [ ] Todos los Cobranza.id coinciden.
- [ ] Todos los movimientos de CuentaCorriente coinciden.
- [ ] Todos los MovimientoStock coinciden.
- [ ] Todas las filas de Auditoria coinciden.
- [ ] Los `created_date`, `updated_date`, `created_by_id` y campos históricos permanecen dentro de `data`/legacy.
- [ ] `legacy_raw` conserva el JSON íntegro.

## E. Integridad referencial
- [ ] Remito.cliente_id existe.
- [ ] Remito.pagador_id existe.
- [ ] Remito.items[].articulo_id existe.
- [ ] PrecioProducto.lista_id y articulo_id existen.
- [ ] Cobranza.pagador_id existe.
- [ ] CuentaCorriente.pagador_id existe.
- [ ] MovimientoStock.items[].articulo_id existe.
- [ ] Referencias faltantes se documentan; no se inventan.

## F. Saldos y stock
- [ ] Ejecutar `03_validate_migration.ts`.
- [ ] Revisar `v_cuenta_corriente_saldo`.
- [ ] Revisar `v_stock_saldo`.
- [ ] NO crear ajustes automáticos para hacer coincidir saldos.
- [ ] Toda discrepancia se marca PARA_REVISAR.
- [ ] Cobranza no altera stock.
- [ ] Cuenta corriente no se edita manualmente.
- [ ] Stock no se edita manualmente.

## G. Documentos
- [ ] Remitos históricos visibles.
- [ ] `Remito.items[]` preservado.
- [ ] Documentos confirmados no editables.
- [ ] Anulación solo por reversión.
- [ ] Precios históricos inmutables.
- [ ] Presupuesto no descuenta stock.

## H. Clientes
- [ ] Búsqueda de clientes funciona.
- [ ] No se puede inventar cliente desde una venta.
- [ ] Edición solo Admin.
- [ ] Mismo Cliente.id.
- [ ] FUSIONADO terminal.
- [ ] nombres_anteriores correcto.
- [ ] concurrencia => 409.
- [ ] auditoría transaccional.
- [ ] lista inactiva rechazada.
- [ ] punto de venta archivado rechazado.

## I. Seguridad
- [ ] Permisos backend reales.
- [ ] Vendedor no puede acceder a reportes Admin.
- [ ] Auditoria solo se crea desde backend.
- [ ] Auditoria no se actualiza ni elimina.
- [ ] Ledgers/documentos no se borran.
- [ ] Endpoints sensibles autenticados.

## J. Prueba operativa
- [ ] Login Admin.
- [ ] Ver clientes.
- [ ] Ver remitos.
- [ ] Ver cuentas corrientes.
- [ ] Ver stock.
- [ ] Crear presupuesto sin afectar stock.
- [ ] Confirmar una operación de prueba CONTROLADA solo cuando Ignacio lo autorice.
- [ ] Verificar consecuencias de stock/deuda/auditoría.
- [ ] Probar cobranza controlada.
- [ ] Probar anulación/reversión solo en entorno de prueba o con autorización explícita.

## K. Delta final
Si Base44 recibió operaciones después de los snapshots:
- [ ] exportar únicamente registros nuevos/cambiados;
- [ ] importar por ID/idempotency_key;
- [ ] nunca sobrescribir un documento existente distinto;
- [ ] volver a ejecutar validación completa.

## L. Corte
Solo marcar productiva la nueva app cuando:
- [ ] validation-report = PASS_AUTOMATIC_CHECKS;
- [ ] conflictos pendientes = 0;
- [ ] Ignacio valida clientes/historia;
- [ ] Ignacio valida remitos/cobranzas;
- [ ] Ignacio valida saldos y stock;
- [ ] permisos probados;
- [ ] backup de la nueva DB generado;
- [ ] URL productiva estable.

Después del corte, Base44 queda como respaldo histórico temporal. No eliminar hasta tener backups independientes verificados.
