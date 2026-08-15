import { getDb } from "@/lib/turso";

const MODEL = process.env.CHAT_MODEL || "gemini-3.5-flash";
const API = "https://generativelanguage.googleapis.com/v1beta/models";

const TOOL = {
  functionDeclarations: [
    {
      name: "query_sales",
      description:
        "Consulta de SOLO LECTURA sobre las tablas SQLite 'ventas' y 'categorias' (la tabla principal SIEMPRE es 'ventas', NUNCA 'sales', NUNCA 'products'). Esquema de ventas: id INTEGER, cart_id INTEGER, product_rank INTEGER, product_id INTEGER, title TEXT, price REAL, quantity INTEGER, total REAL (total del item), discount_percentage REAL, discounted_total REAL, thumbnail TEXT, cart_total REAL (total de TODA la orden), cart_discounted_total REAL, user_id INTEGER, total_products INTEGER, total_quantity INTEGER, date TEXT 'YYYY-MM-DD'. Una orden = un cart_id (un cart tiene varios productos, uno por fila). Ventas totales de una orden = cart_total, NO la suma de filas del mismo cart. Para numero de ordenes usa COUNT(DISTINCT cart_id). Para unidades usa SUM(quantity). Para series de tiempo agrupa por substr(date,1,7) (mes) o substr(date,1,10) (dia). Hay otra tabla 'categorias' (product_id INTEGER, categoria TEXT, subcategoria TEXT) que mapea cada product a su categoria en español (ej. 'Cocina', 'Alimentos', 'Vehículos'). UNE con LEFT JOIN categorias c ON c.product_id = v.product_id cuando el usuario pida ventas por categoria.",
      parameters: {
        type: "OBJECT",
        properties: {
          sql: {
            type: "STRING",
            description:
              "Consulta SELECT SQLite valida sobre las tablas 'ventas' y 'categorias' (usa esos nombres exactamente; JOIN, GROUP BY, ORDER BY, substr, ROUND, COUNT, SUM permitidos; LIMIT recomendado ~500 filas).",
          },
        },
        required: ["sql"],
      },
    },
  ],
};

const FORBIDDEN =
  /\b(ALTER|ATTACH|CREATE|DELETE|DETACH|DROP|INSERT|PRAGMA|REINDEX|UPDATE|VACUUM)\b/i;

function normalizeSql(raw: string): string {
  let s = raw;
  s = s.replace(/\/\*[\s\S]*?\*\//g, " ");
  s = s.replace(/--[^\n]*/g, " ");
  s = s.replace(/;/g, " ");
  return s.trim();
}

type QueryOk = {
  ok: true;
  sql: string;
  cols: string[];
  rows: Record<string, unknown>[];
  elapsedMs: number;
};
type QueryErr = { ok: false; sql: string; error: string };
type QueryResult = QueryOk | QueryErr;

async function runQuerySql(sql: string): Promise<QueryResult> {
  const normalized = normalizeSql(String(sql ?? ""));
  const started = Date.now();
  try {
    const db = getDb();
    const res = await db.execute(normalized);
    const safe = (v: unknown): unknown => {
      if (typeof v === "bigint") return Number(v);
      if (v instanceof Uint8Array) return Buffer.from(v).toString("base64");
      return v;
    };
    const rows = res.rows.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) obj[k] = safe(v);
      return obj;
    });
    return { ok: true, sql, cols: res.columns, rows, elapsedMs: Date.now() - started };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error ejecutando SQL";
    if (/no such table/i.test(msg)) {
      return {
        ok: false,
        sql,
        error:
          "La tabla no existe. La unica tabla disponible se llama 'ventas'. Reintenta el SELECT usando 'ventas' (no 'sales', no 'products').",
      };
    }
    return { ok: false, sql, error: msg };
  }
}

type Part = {
  text?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: unknown;
};

export async function POST(request: Request) {
  let question: string;
  try {
    const body = await request.json();
    question = typeof body?.question === "string" ? body.question.trim() : "";
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!question) {
    return Response.json({ error: "Falta la pregunta" }, { status: 400 });
  }
  if (question.length > 2000) {
    return Response.json({ error: "Pregunta demasiado larga" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Falta GEMINI_API_KEY" }, { status: 500 });
  }

  const history: { role: string; parts: Part[] }[] = [];
  let toolResult: QueryOk | null = null;
  let text = "";

  try {
    for (let i = 0; i < 6; i++) {
      const sys =
        "Eres un analista de ventas de un dashboard. Cuando el usuario pida metricas, datos o graficos, usa SIEMPRE la herramienta query_sales y espera su resultado antes de responder. Una orden es un cart_id; para ventas totales usa SUM(cart_total). La tabla se llama 'ventas'. Responde con una conclusion breve de negocio, en el idioma del usuario, conciso y sin listar todos los numeros. Si el usuario pide una grafica, genera el SQL que devuelva una serie adecuada.";

      const contents: { role: string; parts: Part[] }[] = [
        { role: "user", parts: [{ text: question }] },
        ...history,
      ];

      const res = await fetch(`${API}/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents,
          tools: [TOOL],
        }),
      });
      const jsonText = await res.text();
      if (!res.ok) {
        return Response.json(
          { error: `generateContent ${res.status}: ${jsonText.slice(0, 300)}` },
          { status: 502 }
        );
      }
      const json = JSON.parse(jsonText);
      const parts = (json?.candidates?.[0]?.content?.parts ?? []) as Part[];

      const functionCallPart = parts.find((p) => p.functionCall);

      if (functionCallPart?.functionCall) {
        const fc = functionCallPart.functionCall;
        history.push({ role: "model", parts: [functionCallPart] });
        const result = await runQuerySql(String(fc.args?.sql ?? ""));
        if (result.ok) toolResult = result;
        history.push({
          role: "function",
          parts: [
            {
              functionResponse: {
                name: fc.name,
                response: { result },
              },
            },
          ],
        });
        continue;
      }

      text = parts
        .filter((p) => p.text)
        .map((p) => p.text as string)
        .join("");
      break;
    }
    return Response.json({ text, toolResult });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error en chat" },
      { status: 500 }
    );
  }
}
