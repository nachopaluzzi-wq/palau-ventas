/**
 * PALAU VENTAS — validador de migración
 *
 * Ejecutar después de 02_import_snapshots.ts:
 *   DATABASE_URL=... npx tsx migration/03_validate_migration.ts
 *
 * Exit 0 = barreras automáticas superadas.
 * Exit 1 = NO cortar producción.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "pg";

const ROOT = process.cwd();

const SNAPSHOTS = [
  "snapshots/2026-10-01/CORE_1.json",
  "snapshots/2026-10-01/CORE_2.json",
  "snapshots/2026-10-01/MASTERS_1.json",
  "snapshots/2026-10-01/MASTERS_2.json",
];

const EXPECTED: Record<string, number> = {
  Remito: 5,
  Cobranza: 3,
  MovimientoStock: 3,
  CuentaCorriente: 16,
  Anulacion: 1,
  Auditoria: 6,
  OperacionRemito: 2,
  Presupuesto: 2,
  PresupuestoItem: 4,
  RemitoItem: 0,
  CajaMovimiento: 0,
  Movimiento: 0,
  Conciliacion: 0,
  Visita: 0,
  Consignacion: 0,
  ConsignacionItem: 0,
  DocumentoFuente: 0,
  Gasto: 0,
  CuentaProveedor: 0,
  PagoProveedor: 0,
  MovimientoSocio: 0,
  Cliente: 4,
  Sucursal: 0,
  Articulo: 38,
  PrecioProducto: 6,
  ListaPrecio: 3,
  Deposito: 2,
  PuntoVenta: 1,
  Socio: 2,
  User: 1,
  CargaCamion: 0,
  CargaDetalle: 0,
  Categoria: 5,
  Proveedor: 4,
  Vehiculo: 0,
  ActivoComodato: 0,
  ReglaMargen: 0,
  OrdenCompra: 0,
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return "{" + Object.keys(obj).sort().map(k => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

type Issue = {
  severity: "ERROR" | "WARN";
  code: string;
  entity?: string;
  id?: string;
  details?: unknown;
};

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const issues: Issue[] = [];
  const sourceByEntity = new Map<string, Map<string, Record<string, unknown>>>();

  try {
    for (const rel of SNAPSHOTS) {
      const full = path.join(ROOT, rel);
      const snap = JSON.parse(fs.readFileSync(full, "utf8"));
      for (const [entity, rows] of Object.entries<Record<string, unknown>[]>(snap.entities ?? {})) {
        if (!sourceByEntity.has(entity)) sourceByEntity.set(entity, new Map());
        const map = sourceByEntity.get(entity)!;
        for (const row of rows ?? []) {
          const id = typeof row.id === "string" ? row.id : "";
          if (!id) {
            issues.push({ severity: "ERROR", code: "SOURCE_MISSING_ID", entity, details: row });
            continue;
          }
          map.set(id, row);
        }
      }
    }

    // 1) Conteos exactos.
    for (const [entity, expected] of Object.entries(EXPECTED)) {
      const q = await db.query(
        `SELECT count(*)::int AS n FROM entity_record WHERE entity_name=$1`,
        [entity],
      );
      const actual = q.rows[0].n as number;
      if (actual !== expected) {
        issues.push({
          severity: "ERROR",
          code: "COUNT_MISMATCH",
          entity,
          details: { expected, actual },
        });
      }
    }

    // 2) IDs y hashes exactos contra snapshots.
    for (const [entity, sourceRows] of sourceByEntity.entries()) {
      const q = await db.query(
        `SELECT id, source_hash, data FROM entity_record WHERE entity_name=$1`,
        [entity],
      );
      const dbRows = new Map<string, any>(q.rows.map(r => [r.id, r]));

      for (const [id, source] of sourceRows.entries()) {
        const target = dbRows.get(id);
        if (!target) {
          issues.push({ severity: "ERROR", code: "MISSING_TARGET_ID", entity, id });
          continue;
        }
        const expectedHash = sha256(source);
        if (target.source_hash !== expectedHash) {
          issues.push({
            severity: "ERROR",
            code: "HASH_MISMATCH",
            entity,
            id,
            details: { expectedHash, actualHash: target.source_hash },
          });
        }
      }

      for (const id of dbRows.keys()) {
        if (!sourceRows.has(id)) {
          issues.push({
            severity: "ERROR",
            code: "EXTRA_TARGET_ID",
            entity,
            id,
          });
        }
      }
    }

    // Helper de referencia por entity/id.
    const exists = async (entity: string, id: unknown) => {
      if (typeof id !== "string" || !id) return true;
      const q = await db.query(
        `SELECT 1 FROM entity_record WHERE entity_name=$1 AND id=$2 LIMIT 1`,
        [entity, id],
      );
      return q.rowCount === 1;
    };

    const rows = await db.query(`SELECT entity_name, id, data FROM entity_record`);

    // 3) Referencias críticas.
    for (const r of rows.rows) {
      const entity = r.entity_name as string;
      const id = r.id as string;
      const d = r.data as Record<string, any>;

      const check = async (target: string, value: unknown, field: string) => {
        if (!(await exists(target, value))) {
          issues.push({
            severity: "ERROR",
            code: "ORPHAN_REFERENCE",
            entity,
            id,
            details: { field, value, target },
          });
        }
      };

      if (entity === "Cliente") {
        await check("Cliente", d.fusionado_en_id, "fusionado_en_id");
        await check("ListaPrecio", d.lista_id, "lista_id");
        await check("PuntoVenta", d.punto_venta_id, "punto_venta_id");
      }

      if (entity === "Sucursal") {
        await check("Cliente", d.cliente_id, "cliente_id");
        await check("Cliente", d.pagador_id, "pagador_id");
        await check("Sucursal", d.fusionado_en_id, "fusionado_en_id");
      }

      if (entity === "PrecioProducto") {
        await check("Articulo", d.articulo_id, "articulo_id");
        await check("ListaPrecio", d.lista_id, "lista_id");
      }

      if (entity === "Remito") {
        await check("Cliente", d.cliente_id, "cliente_id");
        await check("Cliente", d.pagador_id, "pagador_id");
        await check("Sucursal", d.sucursal_id, "sucursal_id");
        await check("ListaPrecio", d.lista_id, "lista_id");
        await check("PuntoVenta", d.punto_venta_id, "punto_venta_id");
        await check("Deposito", d.ubicacion_origen_id, "ubicacion_origen_id");

        for (const item of Array.isArray(d.items) ? d.items : []) {
          await check("Articulo", item.articulo_id, "items.articulo_id");
          await check("PrecioProducto", item.precio_version_id, "items.precio_version_id");
        }
      }

      if (entity === "Cobranza") {
        await check("Cliente", d.pagador_id, "pagador_id");
        for (const imp of Array.isArray(d.imputaciones) ? d.imputaciones : []) {
          await check("Remito", imp.remito_id, "imputaciones.remito_id");
        }
      }

      if (entity === "CuentaCorriente") {
        await check("Cliente", d.pagador_id, "pagador_id");
        await check("Sucursal", d.sucursal_id, "sucursal_id");
      }

      if (entity === "MovimientoStock") {
        await check("Deposito", d.origen_id, "origen_id");
        await check("Deposito", d.destino_id, "destino_id");
        for (const item of Array.isArray(d.items) ? d.items : []) {
          await check("Articulo", item.articulo_id, "items.articulo_id");
        }
      }

      if (entity === "OperacionRemito") {
        await check("Remito", d.remito_id, "remito_id");
        await check("MovimientoStock", d.movimiento_stock_id, "movimiento_stock_id");
        await check("CuentaCorriente", d.cc_venta_id, "cc_venta_id");
        await check("Cobranza", d.cobranza_id, "cobranza_id");
        await check("CuentaCorriente", d.cc_cobranza_id, "cc_cobranza_id");
        await check("Anulacion", d.anulacion_id, "anulacion_id");
        await check("MovimientoStock", d.movimiento_reversion_id, "movimiento_reversion_id");
        await check("CuentaCorriente", d.cc_reversa_venta_id, "cc_reversa_venta_id");
      }
    }

    // 4) No sample/demo.
    const samples = await db.query(
      `SELECT entity_name,id FROM entity_record
       WHERE COALESCE((data->>'is_sample')::boolean,false)=true`,
    );
    for (const s of samples.rows) {
      issues.push({
        severity: "ERROR",
        code: "SAMPLE_DATA_PRESENT",
        entity: s.entity_name,
        id: s.id,
      });
    }

    // 5) Conflictos de importación pendientes.
    const conflicts = await db.query(
      `SELECT id, entity_name, legacy_id, conflict_type, details
       FROM migration_conflict
       WHERE resolved_at IS NULL`,
    );
    for (const c of conflicts.rows) {
      issues.push({
        severity: "ERROR",
        code: "UNRESOLVED_MIGRATION_CONFLICT",
        entity: c.entity_name,
        id: c.legacy_id,
        details: { conflict_type: c.conflict_type, details: c.details },
      });
    }

    // 6) Resúmenes derivados para revisión humana. No se "corrigen".
    const cc = await db.query(
      `SELECT * FROM v_cuenta_corriente_saldo ORDER BY pagador_id`,
    );
    const stock = await db.query(
      `SELECT * FROM v_stock_saldo ORDER BY ubicacion_id, articulo_id`,
    );

    const report = {
      generated_at: new Date().toISOString(),
      expected_counts: EXPECTED,
      issues,
      cuenta_corriente_derivada: cc.rows,
      stock_derivado: stock.rows,
      status: issues.some(i => i.severity === "ERROR") ? "BLOCK_CUTOVER" : "PASS_AUTOMATIC_CHECKS",
    };

    fs.mkdirSync(path.join(ROOT, "migration", "reports"), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, "migration", "reports", "validation-report.json"),
      JSON.stringify(report, null, 2),
      "utf8",
    );

    console.log(JSON.stringify(report, null, 2));

    if (report.status !== "PASS_AUTOMATIC_CHECKS") process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
