/**
 * PALAU VENTAS — importador idempotente de snapshots Base44 -> PostgreSQL
 *
 * Requisitos:
 *   npm i pg
 *   npm i -D tsx @types/node @types/pg
 *
 * Ejecutar:
 *   DATABASE_URL=... npx tsx migration/02_import_snapshots.ts
 *
 * Principios:
 * - conserva IDs exactos;
 * - guarda copia cruda inmutable;
 * - no borra;
 * - no corrige;
 * - no inventa;
 * - si el mismo ID ya existe con distinto hash, registra conflicto y NO pisa nada.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "pg";

type Snapshot = {
  captured_at?: string;
  source?: unknown;
  entities?: Record<string, unknown[]>;
};

const ROOT = process.cwd();

const SNAPSHOTS = [
  "snapshots/2026-10-01/CORE_1.json",
  "snapshots/2026-10-01/CORE_2.json",
  "snapshots/2026-10-01/MASTERS_1.json",
  "snapshots/2026-10-01/MASTERS_2.json",
];

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

async function insertConflict(
  db: Client,
  batchId: string,
  entityName: string,
  legacyId: string | null,
  conflictType: string,
  details: unknown,
) {
  await db.query(
    `INSERT INTO migration_conflict
       (batch_id, entity_name, legacy_id, conflict_type, details)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [batchId, entityName, legacyId, conflictType, JSON.stringify(details)],
  );
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  let batchId: string | undefined;

  try {
    const manifest: Record<string, unknown> = {};

    for (const rel of SNAPSHOTS) {
      const full = path.join(ROOT, rel);
      if (!fs.existsSync(full)) throw new Error(`No existe snapshot: ${rel}`);
      const parsed = JSON.parse(fs.readFileSync(full, "utf8")) as Snapshot;
      manifest[rel] = {
        captured_at: parsed.captured_at ?? null,
        entities: Object.fromEntries(
          Object.entries(parsed.entities ?? {}).map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0]),
        ),
      };
    }

    const b = await db.query(
      `INSERT INTO migration_batch
        (source_name, source_captured_at, status, source_manifest)
       VALUES ($1,$2,'RUNNING',$3::jsonb)
       RETURNING id`,
      [
        "Base44 Palau 6ab44f946746388d9ad48b68",
        "2026-10-01T00:00:00Z",
        JSON.stringify(manifest),
      ],
    );

    batchId = b.rows[0].id;

    for (const rel of SNAPSHOTS) {
      const full = path.join(ROOT, rel);
      const snapshot = JSON.parse(fs.readFileSync(full, "utf8")) as Snapshot;

      for (const [entityName, rows] of Object.entries(snapshot.entities ?? {})) {
        if (!Array.isArray(rows)) continue;

        await db.query("BEGIN");
        try {
          for (const raw of rows) {
            if (!raw || typeof raw !== "object") {
              await insertConflict(db, batchId, entityName, null, "INVALID_ROW", { source_file: rel, raw });
              continue;
            }

            const row = raw as Record<string, unknown>;
            const legacyId = typeof row.id === "string" ? row.id : null;

            if (!legacyId) {
              await insertConflict(db, batchId, entityName, null, "MISSING_ID", { source_file: rel, raw: row });
              continue;
            }

            const hash = sha256(row);

            const existingRaw = await db.query(
              `SELECT source_hash FROM legacy_raw
               WHERE entity_name=$1 AND legacy_id=$2`,
              [entityName, legacyId],
            );

            if (existingRaw.rowCount) {
              if (existingRaw.rows[0].source_hash !== hash) {
                await insertConflict(db, batchId, entityName, legacyId, "LEGACY_HASH_MISMATCH", {
                  source_file: rel,
                  incoming_hash: hash,
                  existing_hash: existingRaw.rows[0].source_hash,
                });
              }
            } else {
              await db.query(
                `INSERT INTO legacy_raw
                  (entity_name, legacy_id, payload, source_file, source_hash, batch_id)
                 VALUES ($1,$2,$3::jsonb,$4,$5,$6)`,
                [entityName, legacyId, JSON.stringify(row), rel, hash, batchId],
              );
            }

            const existingOperational = await db.query(
              `SELECT source_hash, data FROM entity_record
               WHERE entity_name=$1 AND id=$2`,
              [entityName, legacyId],
            );

            if (existingOperational.rowCount) {
              const currentHash = existingOperational.rows[0].source_hash;
              if (currentHash !== hash) {
                await insertConflict(db, batchId, entityName, legacyId, "OPERATIONAL_ROW_ALREADY_DIFFERS", {
                  source_file: rel,
                  incoming_hash: hash,
                  existing_hash: currentHash,
                  rule: "NO_OVERWRITE",
                });
              }
              continue;
            }

            await db.query(
              `INSERT INTO entity_record
                (entity_name, id, data, version, source_hash, source_batch_id, created_at, updated_at)
               VALUES (
                 $1,$2,$3::jsonb,1,$4,$5,
                 COALESCE(NULLIF($3::jsonb->>'created_date','')::timestamptz, now()),
                 COALESCE(NULLIF($3::jsonb->>'updated_date','')::timestamptz, now())
               )`,
              [entityName, legacyId, JSON.stringify(row), hash, batchId],
            );
          }

          await db.query("COMMIT");
          process.stdout.write(`OK ${entityName}: ${rows.length}\n`);
        } catch (err) {
          await db.query("ROLLBACK");
          throw err;
        }
      }
    }

    const conflicts = await db.query(
      `SELECT count(*)::int AS n FROM migration_conflict WHERE batch_id=$1 AND resolved_at IS NULL`,
      [batchId],
    );

    if (conflicts.rows[0].n > 0) {
      await db.query(
        `UPDATE migration_batch SET status='FAILED', completed_at=now(),
          notes=$2 WHERE id=$1`,
        [batchId, `Importación finalizada con ${conflicts.rows[0].n} conflictos; NO cortar producción.`],
      );
      throw new Error(`Hay ${conflicts.rows[0].n} conflictos. Revisar migration_conflict. No cortar.`);
    }

    await db.query(
      `UPDATE migration_batch SET status='COMPLETED', completed_at=now() WHERE id=$1`,
      [batchId],
    );

    console.log(`IMPORTACIÓN COMPLETA batch=${batchId}`);
  } catch (err) {
    if (batchId) {
      await db.query(
        `UPDATE migration_batch
         SET status='FAILED', completed_at=now(), notes=COALESCE(notes,'') || $2
         WHERE id=$1 AND status='RUNNING'`,
        [batchId, "\n" + String(err)],
      ).catch(() => {});
    }
    throw err;
  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
