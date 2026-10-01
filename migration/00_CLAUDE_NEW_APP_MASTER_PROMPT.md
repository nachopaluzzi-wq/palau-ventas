# PALAU VENTAS — ORDEN MAESTRA PARA CREAR LA NUEVA APP

## Objetivo
Crear una NUEVA aplicación Palau Ventas en otro hosting, migrando el sistema actual sin perder clientes, IDs, documentos, trazabilidad ni historia.

La nueva app NO es una demo, NO es un rediseño desde cero y NO puede arrancar con datos inventados.

## Fuentes obligatorias
Leer en este orden:
1. `docs/SPEC_MAESTRA_PALAU_2026-09-27.txt`
2. `docs/ARCHITECTURE_VERIFIED_2026-09-30.md`
3. `docs/ATOMIC_FLOW_DESIGN_CORRECTED.md`
4. `docs/CHAT_RECOVERY_2026-09-30.md`
5. `docs/PRODUCTIVE_RECONCILIATION_2026-09-30.md`
6. `snapshots/2026-10-01/BASE44_SCHEMAS.json`
7. `snapshots/2026-10-01/CORE_1.json`
8. `snapshots/2026-10-01/CORE_2.json`
9. `snapshots/2026-10-01/MASTERS_1.json`
10. `snapshots/2026-10-01/MASTERS_2.json`
11. `migration/05_CLIENT_EDIT_V2.md`

## Stack objetivo
Usar una arquitectura portable:
- frontend React/Next o equivalente;
- backend TypeScript/Node o equivalente;
- PostgreSQL;
- autenticación con roles reales;
- migraciones versionadas;
- transacciones cuando corresponda;
- despliegue en hosting independiente.

No depender de Base44 para operar la nueva app. Base44 queda como FUENTE DE ORIGEN/RESPALDO hasta completar el corte.

## Regla 0 — preservar antes de transformar
La migración se hace en dos capas:

### Capa A — copia cruda inmutable
Importar TODOS los registros de TODOS los snapshots a `legacy_raw`:
- entity_name;
- legacy_id;
- payload JSON completo;
- archivo origen;
- hash;
- lote de importación.

Nunca borrar ni reescribir esta copia.

### Capa B — modelo operativo
Migrar a tablas/entidades operativas conservando EXACTAMENTE los IDs existentes.

Si un campo todavía no está normalizado, conservarlo en `legacy_json` para no perder información.

## Conteos actuales que deben coincidir
Estos conteos salen de los snapshots 2026-10-01 y son la primera barrera de validación:

CORE_1:
- Remito: 5
- Cobranza: 3
- MovimientoStock: 3
- CuentaCorriente: 16
- Anulacion: 1
- Auditoria: 6
- OperacionRemito: 2
- Presupuesto: 2
- PresupuestoItem: 4

CORE_2:
- RemitoItem: 0
- CajaMovimiento: 0
- Movimiento: 0
- Conciliacion: 0
- Visita: 0
- Consignacion: 0
- ConsignacionItem: 0
- DocumentoFuente: 0
- Gasto: 0

MASTERS_1:
- CuentaProveedor: 0
- PagoProveedor: 0
- MovimientoSocio: 0
- Cliente: 4
- Sucursal: 0
- Articulo: 38
- PrecioProducto: 6
- ListaPrecio: 3
- Deposito: 2

MASTERS_2:
- PuntoVenta: 1
- Socio: 2
- User: 1
- CargaCamion: 0
- CargaDetalle: 0
- Categoria: 5
- Proveedor: 4
- Vehiculo: 0
- ActivoComodato: 0
- ReglaMargen: 0
- OrdenCompra: 0

Cualquier diferencia debe BLOQUEAR el corte productivo.

## Reglas de integridad obligatorias
1. Conservar todos los IDs.
2. No crear datos demo.
3. No inventar relaciones.
4. No borrar historia.
5. No editar saldos.
6. No editar stock.
7. Stock = suma de MovimientoStock.
8. Cuenta corriente = suma de movimientos por pagador.
9. Remitos confirmados son inmutables.
10. Cobranza no modifica stock.
11. Anulación genera reversión explícita; nunca delete.
12. Presupuesto no modifica stock.
13. Cliente, sucursal y pagador son conceptos separados.
14. Internamente las relaciones son por ID, no por nombre.
15. Remito mantiene su snapshot comercial histórico.
16. Los precios históricos no se recalculan.
17. Dato dudoso = PARA_REVISAR, nunca adivinar.
18. Auditoria = append-only.
19. Permisos se validan en backend.
20. Toda operación sensible debe ser idempotente.

## Clientes
Migrar los 4 clientes existentes con el MISMO ID.

No consolidar, fusionar, renombrar ni corregir clientes durante la importación.

Los nombres actuales y los IDs son datos históricos.

La edición posterior usa el contrato `migration/05_CLIENT_EDIT_V2.md`.

## Cliente / Sucursal / Pagador
- Cliente = entidad comercial.
- Sucursal = destino físico.
- Pagador = responsable de deuda.
- Cuenta corriente pertenece al pagador.
- Sucursal identifica entrega.
- No duplicar deuda por sucursal.
- Varias sucursales pueden compartir pagador.
- Dos pagadores generan documentos económicos separados.

## Remitos
Preservar:
- id;
- numero;
- fecha;
- cliente_id;
- pagador_id;
- sucursal_id;
- punto_venta_id;
- ubicacion_origen_id;
- items[];
- total_centavos;
- idempotency_key;
- vendedor;
- origen;
- sin_cargo;
- motivo;
- todos los campos históricos.

`Remito.items[]` es snapshot comercial canónico de los documentos actuales.

No reconstruir remitos usando RemitoItem cuando Remito.items ya existe.

## Stock
Fuente única:
`MovimientoStock`.

No importar un campo de stock como verdad.

Después de importar:
- recalcular saldo por artículo + ubicación;
- comparar contra evidencia;
- NO crear movimientos compensatorios automáticos para hacer coincidir números;
- discrepancia => reporte PARA_REVISAR.

## Cuenta corriente
Fuente única:
`CuentaCorriente`.

Saldo por pagador =
SUM(debe_centavos) - SUM(haber_centavos).

No migrar un saldo editable.

No reconstruir historia si ya existen movimientos.

## Cobranza
Preservar:
- pagador;
- importe;
- fecha;
- medio;
- imputaciones;
- quien recibió;
- idempotency_key;
- origen.

Cobrar no toca stock.

## Auditoría
Copiar TODAS las filas existentes.

Nueva app:
- create solo desde backend;
- read solo Admin;
- sin update;
- sin delete;
- guardar antes/después para cambios de maestros;
- incluir usuario, fecha, entidad, registro, acción, documento/operación.

## Usuarios y permisos
Ignacio = Admin principal.

Los permisos deben ser backend reales.

No asumir que esconder botones equivale a seguridad.

## Operatoria
La app nueva debe conservar la lógica de:
- Inicio;
- clientes;
- pedidos/presupuestos;
- remitos;
- cobranzas;
- cuentas corrientes;
- stock;
- depósitos/camión;
- transferencias;
- cargas;
- precios/listas;
- usuarios;
- auditoría;
- administración.

Prioridad visual: mobile-first, rápida, simple y operativa.

## Importación
Usar `migration/01_schema.sql` y `migration/02_import_snapshots.ts`.

La importación debe ser:
- idempotente;
- transaccional por entidad/lote;
- repetible;
- sin deletes;
- con hash;
- con reporte de conflictos.

## Validación
Ejecutar `migration/03_validate_migration.ts`.

Validar:
- conteos;
- IDs;
- referencias;
- remitos e items;
- saldos derivados;
- stock derivado;
- clientes;
- cobranzas;
- auditoría;
- registros huérfanos.

## Corte
NO apagar ni modificar Base44 al principio.

Proceso:
1. levantar nueva app;
2. importar snapshots;
3. validar;
4. probar con Admin;
5. ejecutar pruebas de lectura y operaciones no destructivas;
6. hacer un corte final/export delta si hubo movimientos nuevos en Base44;
7. revalidar;
8. recién entonces usar la nueva app como productiva.

## Definición de terminado
No decir "migrado" hasta que:
- todos los conteos coincidan;
- todos los IDs estén;
- no haya referencias huérfanas sin explicación;
- clientes e historia estén intactos;
- remitos/cobranzas/auditoría sean consultables;
- stock y cuenta corriente deriven de movimientos;
- edición de clientes v2 funcione;
- permisos funcionen en backend;
- la app esté publicada y accesible;
- Ignacio valide visualmente y operativamente.

Si encontrás una diferencia, no la corrijas inventando datos: documentala y frená el corte.
