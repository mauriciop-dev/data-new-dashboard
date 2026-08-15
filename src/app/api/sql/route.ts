import { getDb } from "@/lib/turso";

const ALLOWED_KEYWORDS = /^\s*(SELECT|WITH|EXPLAIN)/i;
const FORBIDDEN = /(--|;|\b(DELETE|INSERT|UPDATE|DROP|ALTER|CREATE|ATTACH|DETACH|REINDEX|VACUUM|PRAGMA)\b)/i;

export async function POST(request: Request) {
  let sql: string;
  try {
    const body = await request.json();
    sql = typeof body?.sql === "string" ? body.sql : "";
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const trimmed = sql.trim();
  if (!trimmed) {
    return Response.json({ error: "Falta la consulta SQL" }, { status: 400 });
  }
  if (!ALLOWED_KEYWORDS.test(trimmed)) {
    return Response.json(
      { error: "Solo se permiten consultas SELECT de solo lectura" },
      { status: 400 }
    );
  }
  if (FORBIDDEN.test(trimmed)) {
    return Response.json(
      { error: "La consulta contiene operaciones no permitidas" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const res = await db.execute(trimmed);
    const safe = (v: unknown): unknown => {
      if (typeof v === "bigint") return Number(v);
      if (v instanceof Uint8Array) return Buffer.from(v).toString("base64");
      return v;
    };
    const rows = res.rows.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        obj[k] = safe(v);
      }
      return obj;
    });
    return Response.json({
      ok: true,
      cols: res.columns,
      rows,
      affected: res.rowsAffected,
    });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Error ejecutando SQL",
      },
      { status: 500 }
    );
  }
}