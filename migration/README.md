# Palau Ventas — paquete de migración

Este directorio contiene el paquete para crear una nueva app fuera de ChatGPT Sites/Base44 sin perder historia.

## Orden de uso
1. Leer `00_CLAUDE_NEW_APP_MASTER_PROMPT.md`.
2. Crear PostgreSQL y ejecutar `01_schema.sql`.
3. Instalar dependencias de migración: `pg`, `tsx`, tipos de Node.
4. Ejecutar `02_import_snapshots.ts`.
5. Ejecutar `03_validate_migration.ts`.
6. Implementar edición de clientes con `04_update_client_service.ts` y `05_CLIENT_EDIT_V2.md`.
7. Seguir `06_CUTOVER_CHECKLIST.md`.
8. No cortar Base44 hasta que la validación sea PASS y la revisión operativa de Ignacio esté aprobada.

## Fuentes
Los datos actuales están en:
- `../snapshots/2026-10-01/BASE44_SCHEMAS.json`
- `../snapshots/2026-10-01/CORE_1.json`
- `../snapshots/2026-10-01/CORE_2.json`
- `../snapshots/2026-10-01/MASTERS_1.json`
- `../snapshots/2026-10-01/MASTERS_2.json`

La especificación maestra está en `../docs/SPEC_MAESTRA_PALAU_2026-09-27.txt`.

## Regla de preservación
`legacy_raw` es la copia inmutable de origen.
`entity_record` es la capa operativa inicial con los mismos IDs y JSON completo.

No borrar `legacy_raw` después del corte.
