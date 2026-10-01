# Palau Ventas — contrato v2 de edición de clientes

Este archivo reemplaza la v1 para la nueva aplicación.

## Reglas definitivas

- Solo ADMIN activo puede editar.
- Sin sesión: 401.
- No admin: 403.
- Admin archivado: 403.
- Se actualiza el MISMO `Cliente.id`.
- Nunca crear un cliente nuevo para editar/renombrar.
- `FUSIONADO` es terminal: no editable.
- `ACTIVO` y `ARCHIVADO` sí son estados editables por Admin.
- Si cambia `nombre_comercial`, agregar el nombre anterior a `nombres_anteriores` sin duplicar.
- La operación no toca stock, MovimientoStock, CuentaCorriente, Remito ni Cobranza.
- Auditoria es append-only y se crea solo en backend.

## Campos editables

- nombre_comercial
- razon_social
- alias
- cuit
- telefono
- email
- direccion
- localidad
- zona
- condicion_pago
- dias_plazo
- limite_credito_centavos
- lista_id
- punto_venta_id
- observaciones
- estado: solo ACTIVO / ARCHIVADO

## Campos prohibidos

- id
- created_date
- created_by_id
- creado_por_user_id
- fusionado_en_id
- nombres_anteriores
- latitud
- longitud
- para_revisar

## Referencias reales del esquema

`ListaPrecio`:
- campo de estado: `activa: boolean`
- una lista nueva solo es válida si `activa === true`.

`PuntoVenta`:
- campo de estado: `estado`
- valores: `ACTIVO | ARCHIVADO`
- un punto nuevo solo es válido si `estado !== "ARCHIVADO"`.

Si `lista_id` o `punto_venta_id` no cambian respecto del cliente actual, no bloquear la edición porque posteriormente la referencia haya quedado inactiva/archivada.

## Concurrencia

En la nueva app usar `entity_record.version`.

Al abrir:
- devolver Cliente + version.

Al guardar:
- UPDATE condicional por `entity_name='Cliente'`, `id`, `version` y estado distinto de FUSIONADO.
- si actualiza 0 filas: 409.
- si actualiza 1 fila: incrementar version.

No hacer GET + comparación + UPDATE ciego.

## Auditoría atómica

La nueva base usa PostgreSQL, por lo que aplicar Variante A:

Dentro de UNA transacción:
1. validar usuario;
2. leer cliente;
3. validar versión;
4. validar lista/punto de venta;
5. update condicional;
6. insertar Auditoria;
7. commit.

Si falla Auditoria, rollback del Cliente.

No hace falta `EDITAR_CLIENTE_SOLICITADO` ni saga en esta arquitectura.

Acciones:
- EDITAR_CLIENTE
- ARCHIVAR_CLIENTE
- REACTIVAR_CLIENTE

Auditoria debe guardar:
- fecha
- accion
- entidad = Cliente
- registro_id
- usuario_id
- usuario_nombre
- valor_anterior
- valor_nuevo
- motivo
- documento = operacion_id
- dispositivo

## Implementación

Usar:
`migration/04_update_client_service.ts`

Ese servicio ya implementa:
- autorización;
- whitelist de campos;
- validaciones;
- versión;
- FUSIONADO terminal;
- ListaPrecio.activa;
- PuntoVenta.estado;
- nombres_anteriores;
- transacción;
- auditoría;
- mismo ID.

## Frontend

Ficha de cliente:
- botón Editar solo Admin;
- oculto si FUSIONADO;
- modal de edición;
- mostrar nombres_anteriores si existen;
- ante 409: pedir recarga;
- si `sin_cambios=true`: mostrar "Sin cambios";
- al guardar: refrescar ficha + historial.

## Pruebas

NO probar renombre ficticio en producción.

Prueba segura:
- editar temporalmente observaciones o teléfono;
- verificar auditoría;
- restaurar el valor con una segunda edición legítimamente auditada si corresponde.

Validar:
1. mismo id;
2. version aumenta;
3. Auditoria creada;
4. stock idéntico;
5. cuenta corriente idéntica;
6. remitos idénticos;
7. cobranzas idénticas;
8. no-admin rechazado;
9. segunda sesión con versión vieja => 409;
10. FUSIONADO => 409;
11. lista inactiva => 400;
12. punto archivado => 400.
