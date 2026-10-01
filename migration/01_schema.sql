-- PALAU VENTAS — ESQUEMA DE MIGRACIÓN PORTABLE (PostgreSQL)
-- Objetivo: preservar 100% de datos/IDs/historia y permitir operar sin Base44.
-- La capa legacy_raw es inmutable. entity_record es la capa operativa equivalente.
-- No borra ni corrige datos históricos durante la migración.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS migration_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_captured_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('RUNNING','COMPLETED','FAILED')),
  source_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text
);

CREATE TABLE IF NOT EXISTS migration_conflict (
  id bigserial PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES migration_batch(id),
  entity_name text NOT NULL,
  legacy_id text,
  conflict_type text NOT NULL,
  details jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution text
);

-- Copia cruda e inmutable. Nunca usar como tabla editable de la app.
CREATE TABLE IF NOT EXISTS legacy_raw (
  entity_name text NOT NULL,
  legacy_id text NOT NULL,
  payload jsonb NOT NULL,
  source_file text NOT NULL,
  source_hash text NOT NULL,
  batch_id uuid NOT NULL REFERENCES migration_batch(id),
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_name, legacy_id)
);

-- Espejo operativo de las entidades Base44.
-- Conserva el documento completo y el mismo ID.
CREATE TABLE IF NOT EXISTS entity_record (
  entity_name text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  source_hash text,
  source_batch_id uuid REFERENCES migration_batch(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_name, id)
);

CREATE INDEX IF NOT EXISTS idx_entity_record_entity ON entity_record(entity_name);
CREATE INDEX IF NOT EXISTS idx_entity_record_data_gin ON entity_record USING gin(data);

-- Índices operativos principales.
CREATE INDEX IF NOT EXISTS idx_cliente_nombre
  ON entity_record ((lower(data->>'nombre_comercial')))
  WHERE entity_name='Cliente';

CREATE INDEX IF NOT EXISTS idx_cliente_estado
  ON entity_record ((data->>'estado'))
  WHERE entity_name='Cliente';

CREATE INDEX IF NOT EXISTS idx_remito_cliente
  ON entity_record ((data->>'cliente_id'))
  WHERE entity_name='Remito';

CREATE INDEX IF NOT EXISTS idx_remito_pagador
  ON entity_record ((data->>'pagador_id'))
  WHERE entity_name='Remito';

CREATE INDEX IF NOT EXISTS idx_cobranza_pagador
  ON entity_record ((data->>'pagador_id'))
  WHERE entity_name='Cobranza';

CREATE INDEX IF NOT EXISTS idx_cc_pagador
  ON entity_record ((data->>'pagador_id'))
  WHERE entity_name='CuentaCorriente';

CREATE INDEX IF NOT EXISTS idx_stock_fecha
  ON entity_record (((data->>'fecha')::timestamptz))
  WHERE entity_name='MovimientoStock' AND data ? 'fecha';

CREATE INDEX IF NOT EXISTS idx_auditoria_registro
  ON entity_record ((data->>'entidad'), (data->>'registro_id'))
  WHERE entity_name='Auditoria';

-- Idempotencia: no permitir repetir hechos económicos con la misma clave.
CREATE UNIQUE INDEX IF NOT EXISTS uq_remito_idempotency
  ON entity_record ((data->>'idempotency_key'))
  WHERE entity_name='Remito' AND coalesce(data->>'idempotency_key','') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cobranza_idempotency
  ON entity_record ((data->>'idempotency_key'))
  WHERE entity_name='Cobranza' AND coalesce(data->>'idempotency_key','') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_idempotency
  ON entity_record ((data->>'idempotency_key'))
  WHERE entity_name='MovimientoStock' AND coalesce(data->>'idempotency_key','') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cc_idempotency
  ON entity_record ((data->>'idempotency_key'))
  WHERE entity_name='CuentaCorriente' AND coalesce(data->>'idempotency_key','') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_operacion_remito_idempotency
  ON entity_record ((data->>'idempotency_key'))
  WHERE entity_name='OperacionRemito' AND coalesce(data->>'idempotency_key','') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_precio_idempotency
  ON entity_record ((data->>'idempotency_key'))
  WHERE entity_name='PrecioProducto' AND coalesce(data->>'idempotency_key','') <> '';

-- Documentos/ledgers que son append-only en el modelo productivo.
CREATE OR REPLACE FUNCTION prevent_immutable_entity_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.entity_name IN (
    'Auditoria',
    'Remito',
    'Cobranza',
    'MovimientoStock',
    'CuentaCorriente',
    'Anulacion',
    'PrecioProducto'
  ) THEN
    RAISE EXCEPTION 'La entidad % es inmutable; use reversión/compensación explícita', OLD.entity_name;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_prevent_immutable_update ON entity_record;
CREATE TRIGGER trg_prevent_immutable_update
BEFORE UPDATE ON entity_record
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_entity_mutation();

-- Borrar registros operativos no está permitido en producción.
-- Para entidades editables, archivar/fusionar; para documentos, reversar.
CREATE OR REPLACE FUNCTION prevent_entity_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'DELETE no permitido en Palau productivo; usar archivo/fusión/reversión';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_all_delete ON entity_record;
CREATE TRIGGER trg_prevent_all_delete
BEFORE DELETE ON entity_record
FOR EACH ROW
EXECUTE FUNCTION prevent_entity_delete();

-- Vista de cuenta corriente: saldo derivado, nunca editable.
CREATE OR REPLACE VIEW v_cuenta_corriente_saldo AS
SELECT
  data->>'pagador_id' AS pagador_id,
  SUM(COALESCE((data->>'debe_centavos')::bigint,0)) AS debe_centavos,
  SUM(COALESCE((data->>'haber_centavos')::bigint,0)) AS haber_centavos,
  SUM(COALESCE((data->>'debe_centavos')::bigint,0)
      - COALESCE((data->>'haber_centavos')::bigint,0)) AS saldo_centavos
FROM entity_record
WHERE entity_name='CuentaCorriente'
GROUP BY data->>'pagador_id';

-- Vista de movimientos de stock por ubicación.
-- Cada destino suma y cada origen resta. No crea ni corrige movimientos.
CREATE OR REPLACE VIEW v_stock_movimientos AS
WITH ms AS (
  SELECT id, data
  FROM entity_record
  WHERE entity_name='MovimientoStock'
),
items AS (
  SELECT
    ms.id AS movimiento_id,
    ms.data->>'fecha' AS fecha,
    ms.data->>'tipo' AS tipo,
    ms.data->>'origen_id' AS origen_id,
    ms.data->>'destino_id' AS destino_id,
    item->>'articulo_id' AS articulo_id,
    COALESCE((item->>'cantidad_unidades')::bigint,0) AS cantidad_unidades
  FROM ms
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ms.data->'items','[]'::jsonb)) item
)
SELECT movimiento_id, fecha, tipo, articulo_id, destino_id AS ubicacion_id, cantidad_unidades AS delta_unidades
FROM items
WHERE destino_id IS NOT NULL
UNION ALL
SELECT movimiento_id, fecha, tipo, articulo_id, origen_id AS ubicacion_id, -cantidad_unidades AS delta_unidades
FROM items
WHERE origen_id IS NOT NULL;

CREATE OR REPLACE VIEW v_stock_saldo AS
SELECT articulo_id, ubicacion_id, SUM(delta_unidades) AS stock_unidades
FROM v_stock_movimientos
GROUP BY articulo_id, ubicacion_id;

-- Clientes legibles sin perder el documento original.
CREATE OR REPLACE VIEW v_clientes AS
SELECT
  id,
  version,
  data->>'nombre_comercial' AS nombre_comercial,
  data->>'razon_social' AS razon_social,
  data->>'cuit' AS cuit,
  data->>'telefono' AS telefono,
  data->>'email' AS email,
  data->>'direccion' AS direccion,
  data->>'localidad' AS localidad,
  data->>'zona' AS zona,
  data->>'estado' AS estado,
  data->>'lista_id' AS lista_id,
  data->>'punto_venta_id' AS punto_venta_id,
  data
FROM entity_record
WHERE entity_name='Cliente';

COMMIT;
