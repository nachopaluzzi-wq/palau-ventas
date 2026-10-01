# CLAUDE — START HERE — PALAU VENTAS

Fecha de handoff: 2026-10-01

## Objetivo inmediato
Terminar Palau Ventas sin rehacer lo que ya funciona.

PRIMER CAMBIO PEDIDO POR IGNACIO:
- habilitar a ADMIN la edición de clientes existentes;
- conservar SIEMPRE el mismo Cliente.id;
- no duplicar clientes al renombrar;
- conservar relaciones históricas;
- registrar antes/después en Auditoria;
- si cambia nombre_comercial, agregar el nombre anterior a nombres_anteriores sin duplicados;
- no modificar saldos, stock, remitos ni cobranzas por editar un cliente.

## Fuente productiva correcta
Base44:
- App: Palau
- App ID: 6ab44f946746388d9ad48b68

IMPORTANTE:
Existe otra app Base44 llamada "Palau Ventas" con ID 6abde8f562afd489151801e4.
ESA ES UNA COPIA VIEJA/NO CANÓNICA. NO TRABAJAR SOBRE ESA APP.

## URL que usa Ignacio
https://palau-ventas.s9k2tm28hw.chatgpt.site/

No asumir que esa URL está desplegada desde Base44 o GitHub hasta verificar la procedencia.
No afirmar que un cambio en Base44 modifica esa URL sin comprobar el vínculo de despliegue.

## Repo de continuidad
https://github.com/nachopaluzzi-wq/palau-ventas

Este repo es el punto de handoff entre ChatGPT/Codex y Claude.

## Leer primero
1. docs/CLAUDE_START_HERE_2026-10-01.md
2. docs/SPEC_MAESTRA_PALAU_2026-09-27.txt
3. docs/ARCHITECTURE_VERIFIED_2026-09-30.md
4. docs/ATOMIC_FLOW_DESIGN_CORRECTED.md
5. docs/CHAT_RECOVERY_2026-09-30.md
6. docs/PRODUCTIVE_RECONCILIATION_2026-09-30.md
7. snapshots/2026-10-01/

## Reglas inviolables
- No borrar historia.
- No crear datos demo.
- No inventar clientes, precios, saldos o stock.
- Stock = movimientos, no un campo editable.
- Cuenta corriente = movimientos, no saldo editable.
- Remitos confirmados no se reescriben silenciosamente.
- Anulaciones/reversiones deben conservar trazabilidad.
- Cliente/sucursal/pagador se relacionan por ID.
- No migrar nombres como claves.
- Antes de tocar saldos/stock, reconciliar evidencia.
- Si un dato histórico es dudoso: PARA_REVISAR, no adivinar.

## Estado actual conocido
La app canónica contiene clientes reales:
- Charly
- Parque Falcon
- Parque Rosas
- Prado

También contiene remitos y conciliaciones recientes del 29/09 y 30/09.
Usar los snapshots 2026-10-01 como evidencia del estado actual.

## Qué NO hacer
- No tomar /home/claude/palau-ventas como producción solo porque existe.
- No priorizar DeliveryNoteItem Python: el modelo real observado usa Remito.items[].
- No reconstruir cuentas corrientes automáticamente.
- No reemplazar Base44 por FastAPI/SQLite sin decisión explícita del usuario.
- No trabajar sobre la app Base44 vieja "Palau Ventas".

## Criterio de finalización: editar clientes
Se considera listo cuando:
1. Admin abre un cliente existente.
2. Puede editar nombre comercial, razón social, CUIT, dirección, localidad, teléfono, email, zona, condición de pago, plazo, límite, lista, observaciones y estado permitido.
3. Al guardar, el ID del cliente NO cambia.
4. Remitos/cobranzas/cuenta corriente siguen vinculados al mismo ID.
5. Auditoria guarda usuario, fecha, acción, ID, valor anterior y valor nuevo.
6. El cambio de nombre conserva el nombre anterior en nombres_anteriores.
7. Un vendedor no puede editar clientes si no tiene permiso backend.
8. No cambia ningún saldo ni stock por esta operación.

## Siguiente prioridad
Después de editar clientes, detenerse y validar con Ignacio antes de hacer cualquier otra reforma.
