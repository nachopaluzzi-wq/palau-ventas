/**
 * PALAU VENTAS — servicio productivo de edición de Cliente para el nuevo hosting.
 *
 * Usa el esquema migration/01_schema.sql.
 * Debe ejecutarse SOLO en backend.
 *
 * La autenticación real debe resolver ServerUser antes de llamar esta función.
 */

import crypto from "node:crypto";
import type { PoolClient } from "pg";

export type ServerUser = {
  id: string;
  role: "admin" | "user";
  palau_rol?: "ADMIN" | "VENDEDOR" | "SOCIO" | "CONSULTA";
  estado_acceso?: "ACTIVO" | "ARCHIVADO";
  full_name?: string | null;
  email?: string | null;
};

type UpdateClientInput = {
  cliente_id: string;
  version: number; // entity_record.version
  cambios: Record<string, unknown>;
  motivo?: string;
  dispositivo?: string;
};

const TEXT_FIELDS = new Set([
  "nombre_comercial",
  "razon_social",
  "cuit",
  "telefono",
  "email",
  "direccion",
  "localidad",
  "zona",
  "observaciones",
]);

const ALLOWED_FIELDS = new Set([
  ...TEXT_FIELDS,
  "alias",
  "lista_id",
  "punto_venta_id",
  "condicion_pago",
  "limite_credito_centavos",
  "dias_plazo",
  "estado",
]);

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizePatch(cambios: Record<string, unknown>) {
  const keys = Object.keys(cambios);
  if (!keys.length) throw new HttpError(400, "No hay cambios para guardar.");
  if (keys.some(k => !ALLOWED_FIELDS.has(k))) {
    throw new HttpError(400, "Hay campos que no se pueden editar desde esta operación.");
  }

  const payload: Record<string, unknown> = {};

  for (const k of keys) {
    const v = cambios[k];

    if (TEXT_FIELDS.has(k)) {
      if (v !== null && typeof v !== "string") throw new HttpError(400, `Valor inválido: ${k}.`);
      const text = String(v ?? "").trim();
      const max = k === "observaciones" ? 4000 : 500;
      if (text.length > max) throw new HttpError(400, `El campo ${k} es demasiado extenso.`);
      payload[k] = text;
      continue;
    }

    if (k === "alias") {
      if (!Array.isArray(v) || v.length > 30 || v.some(a => typeof a !== "string" || a.length > 200)) {
        throw new HttpError(400, "Alias inválidos.");
      }
      payload[k] = [...new Set(v.map(a => a.trim()).filter(Boolean))];
      continue;
    }

    if (k === "dias_plazo" || k === "limite_credito_centavos") {
      if (v !== null && (!Number.isSafeInteger(v) || Number(v) < 0)) {
        throw new HttpError(400, "El límite y el plazo deben ser enteros no negativos.");
      }
      payload[k] = v;
      continue;
    }

    if (k === "condicion_pago") {
      if (v !== "CONTADO" && v !== "CUENTA_CORRIENTE") {
        throw new HttpError(400, "Condición de pago inválida.");
      }
      payload[k] = v;
      continue;
    }

    if (k === "estado") {
      if (v !== "ACTIVO" && v !== "ARCHIVADO") {
        throw new HttpError(400, "Estado inválido.");
      }
      payload[k] = v;
      continue;
    }

    if (k === "lista_id" || k === "punto_venta_id") {
      if (v !== null && (typeof v !== "string" || !v || v.length > 100)) {
        throw new HttpError(400, "Lista o punto de venta inválido.");
      }
      payload[k] = v;
    }
  }

  if ("nombre_comercial" in payload && !payload.nombre_comercial) {
    throw new HttpError(400, "El nombre comercial es obligatorio.");
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email))) {
    throw new HttpError(400, "El email no es válido.");
  }

  return payload;
}

async function getRecord(tx: PoolClient, entity: string, id: string) {
  const q = await tx.query(
    `SELECT id, data, version
     FROM entity_record
     WHERE entity_name=$1 AND id=$2`,
    [entity, id],
  );
  return q.rowCount ? q.rows[0] : null;
}

export async function updateClient(
  tx: PoolClient,
  user: ServerUser | null,
  input: UpdateClientInput,
) {
  if (!user) throw new HttpError(401, "Iniciá sesión para continuar.");
  if (user.role !== "admin" || user.estado_acceso === "ARCHIVADO") {
    throw new HttpError(403, "Solo un administrador activo puede editar clientes.");
  }

  if (
    typeof input?.cliente_id !== "string" ||
    !input.cliente_id ||
    input.cliente_id.length > 100 ||
    !Number.isSafeInteger(input.version) ||
    input.version < 1 ||
    !input.cambios ||
    typeof input.cambios !== "object" ||
    Array.isArray(input.cambios)
  ) {
    throw new HttpError(400, "Faltan el cliente, los cambios o la versión a editar.");
  }

  const motivo = String(input.motivo ?? "").trim();
  const dispositivo = String(input.dispositivo ?? "").trim();
  if (motivo.length > 1000 || dispositivo.length > 100) {
    throw new HttpError(400, "Motivo o dispositivo inválido.");
  }

  const payload = normalizePatch(input.cambios);

  await tx.query("BEGIN");
  try {
    const previousRow = await getRecord(tx, "Cliente", input.cliente_id);
    if (!previousRow) throw new HttpError(404, "Cliente no encontrado.");

    const previous = previousRow.data as Record<string, any>;

    if (previous.estado === "FUSIONADO") {
      throw new HttpError(409, "Cliente fusionado: no se puede editar.");
    }

    if (previousRow.version !== input.version) {
      throw new HttpError(409, "Este cliente cambió mientras lo editabas. Recargá los datos.");
    }

    // Lista válida: existe y activa=true.
    if (
      payload.lista_id &&
      payload.lista_id !== previous.lista_id
    ) {
      const l = await getRecord(tx, "ListaPrecio", String(payload.lista_id));
      if (!l || l.data?.activa !== true) {
        throw new HttpError(400, "La lista de precios no existe o está inactiva.");
      }
    }

    // Punto de venta válido: existe y estado != ARCHIVADO.
    if (
      payload.punto_venta_id &&
      payload.punto_venta_id !== previous.punto_venta_id
    ) {
      const p = await getRecord(tx, "PuntoVenta", String(payload.punto_venta_id));
      if (!p || p.data?.estado === "ARCHIVADO") {
        throw new HttpError(400, "El punto de venta no existe o está archivado.");
      }
    }

    // Quitar valores sin cambios.
    for (const k of Object.keys(payload)) {
      const oldValue =
        TEXT_FIELDS.has(k) ? (previous[k] ?? "") :
        k === "alias" ? (previous[k] ?? []) :
        (previous[k] ?? null);

      if (JSON.stringify(oldValue) === JSON.stringify(payload[k])) {
        delete payload[k];
      }
    }

    if (!Object.keys(payload).length) {
      await tx.query("ROLLBACK");
      return {
        cliente: previous,
        version: previousRow.version,
        sin_cambios: true,
      };
    }

    // Renombrar conserva el mismo ID y el nombre anterior.
    if ("nombre_comercial" in payload) {
      payload.nombres_anteriores = [
        ...new Set([
          ...(Array.isArray(previous.nombres_anteriores) ? previous.nombres_anteriores : []),
          previous.nombre_comercial,
        ].filter(Boolean)),
      ];
    }

    // Actualización condicional: protege contra carrera.
    const updated = await tx.query(
      `UPDATE entity_record
       SET data = data || $1::jsonb,
           version = version + 1,
           updated_at = now()
       WHERE entity_name='Cliente'
         AND id=$2
         AND version=$3
         AND COALESCE(data->>'estado','') <> 'FUSIONADO'
       RETURNING id, data, version`,
      [JSON.stringify(payload), input.cliente_id, input.version],
    );

    if (updated.rowCount !== 1) {
      throw new HttpError(409, "El cliente cambió mientras lo editabas o fue fusionado. Recargá los datos.");
    }

    const action =
      payload.estado === "ARCHIVADO" ? "ARCHIVAR_CLIENTE" :
      payload.estado === "ACTIVO" ? "REACTIVAR_CLIENTE" :
      "EDITAR_CLIENTE";

    const before = Object.fromEntries(
      Object.keys(payload).map(k => [k, previous[k] ?? null]),
    );

    const operationId = crypto.randomUUID();
    const auditId = crypto.randomUUID();
    const now = new Date().toISOString();

    const auditData = {
      id: auditId,
      fecha: now,
      accion: action,
      entidad: "Cliente",
      registro_id: input.cliente_id,
      usuario_id: user.id,
      usuario_nombre: user.full_name || user.email || user.id,
      valor_anterior: JSON.stringify(before),
      valor_nuevo: JSON.stringify(payload),
      motivo,
      documento: operationId,
      dispositivo,
      created_date: now,
      updated_date: now,
      created_by_id: user.id,
      is_sample: false,
    };

    // Misma transacción: cliente + auditoría entran juntos.
    await tx.query(
      `INSERT INTO entity_record
       (entity_name,id,data,version,created_at,updated_at)
       VALUES ('Auditoria',$1,$2::jsonb,1,now(),now())`,
      [auditId, JSON.stringify(auditData)],
    );

    await tx.query("COMMIT");

    return {
      cliente: updated.rows[0].data,
      version: updated.rows[0].version,
      sin_cambios: false,
      operacion_id: operationId,
    };
  } catch (err) {
    await tx.query("ROLLBACK").catch(() => {});
    throw err;
  }
}
