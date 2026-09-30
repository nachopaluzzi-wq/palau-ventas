# Palau Ventas — arquitectura verificada

Fecha: 2026-09-30

## Fuente productiva confirmada

Base44 app:
- Nombre: Palau
- App ID: `6ab44f946746388d9ad48b68`
- `git_remote_source`: `s3`

La app contiene las entidades y los datos operativos actualmente utilizados.

## Modelo de remitos observado

La entidad `Remito` productiva persiste sus ítems en un array embebido `items[]`.

Campos observados por ítem:
- `articulo_id`
- `cantidad_ingresada`
- `cantidad_unidades`
- `descripcion`
- `importe_centavos`
- `precio_pack_centavos`
- `precio_unitario_centavos`
- `precio_version_id`
- `iva_alicuota`
- `unidad_ingreso`

También existe una entidad `RemitoItem` separada, pero los remitos reales actuales consultados usan `Remito.items`.

Ejemplo verificado: remito 0004, Prado, $16.800, CONFIRMADO, con sus dos ítems dentro de `Remito.items`.

## DeliveryNoteItem

No está presente como entidad del modelo productivo Base44 verificado y no aparece en la especificación maestra histórica localizada.

Por tanto, NO tratar `DeliveryNoteItem` en `/app/services/sales.py` como bloqueador de producción hasta reconciliar la copia Python de Claude con la app productiva.

## GitHub

Repo: `nachopaluzzi-wq/palau-ventas`

Al momento de esta verificación contiene documentación y README; no contiene `/app/services/sales.py` ni el backend FastAPI descrito por Claude.

## Copia de Claude

`/home/claude/palau-ventas/` debe tratarse como **copia paralela / no verificada como producción** hasta que Claude demuestre su procedencia mediante remote git, commit SHA, export fuente o vínculo verificable con Base44.

No borrar: puede contener trabajo útil.

## Deploy

Está confirmado que Base44 contiene la app operativa y sus datos.

No está verificado que `https://palau-ventas.s9k2tm28hw.chatgpt.site/` sea un deploy directo de Base44 ni que exista un pipeline GitHub -> Vercel.

No documentar `FastAPI + SQLite + Vercel` como arquitectura productiva hasta reconciliar estas fuentes.

## Regla de trabajo

1. Base44 `6ab44f946746388d9ad48b68`: fuente productiva de esquema/datos hasta prueba en contrario.
2. GitHub: fuente compartida de documentación/versionado, todavía sin código productivo confirmado.
3. `/home/claude/palau-ventas/`: copia técnica paralela no verificada.
4. No implementar DeliveryNoteItem en Python como siguiente paso.
5. Reconciliar el modelo Python con Base44 antes de portar cambios.
6. Prioridad productiva: Remito -> stock -> cobranza -> cuenta corriente dentro de la app activa.
