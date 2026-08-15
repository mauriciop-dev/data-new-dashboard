const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.LIVE_MODEL || "gemini-3.1-flash-live-preview";

const TOOL = {
  functionDeclarations: [
    {
      name: "query_sales",
      description:
        "Ejecuta una consulta SQL de SOLO LECTURA (SELECT) contra la tabla ventas de un dashboard de comercio y devuelve las filas. Una orden = un cart_id (hay varios productos por orden, uno por fila). El total de una orden es cart_total. Usa COUNT(DISTINCT cart_id) para número de órdenes, SUM(quantity) para unidades, agrupa por substr(date,1,7) o substr(date,1,10) para series de tiempo.",
      parameters: {
        type: "OBJECT",
        properties: {
          sql: { type: "STRING", description: "Consulta SELECT SQLite (GROUP BY, ORDER BY, substr, ROUND, COUNT, SUM permitidos)." },
        },
        required: ["sql"],
      },
    },
  ],
};

async function mint() {
  const now = new Date();
  const res = await fetch("https://generativelanguage.googleapis.com/v1alpha/auth_tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({
      uses: 3,
      expireTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      newSessionExpireTime: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
    }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`mint ${res.status}: ${txt}`);
  return JSON.parse(txt).name;
}

async function runQuery(sql) {
  const res = await fetch("https://data-new-dashboard.vercel.app/api/sql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  const json = await res.json();
  if (json.ok) return { ok: true, cols: json.cols, rows: json.rows };
  if (/no such table/i.test(String(json.error ?? ""))) {
    return {
      error:
        "La tabla no existe. La unica tabla disponible se llama 'ventas'. Reintenta el SELECT usando 'ventas' (no 'sales', no 'products').",
    };
  }
  return { error: json.error ?? `HTTP ${res.status}` };
}

function run(token) {
  return new Promise((resolve) => {
    const ws = new WebSocket(
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=" +
        encodeURIComponent(token)
    );
    const out = { setup: false, toolCalls: 0, audioChunks: 0, errors: [] };
    const timeout = setTimeout(() => { out.errors.push("TIMEOUT 40s"); try { ws.close(); } catch {} }, 40000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        setup: {
          model: `models/${MODEL}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
          },
          tools: [TOOL],
          systemInstruction: { parts: [{ text: "Eres un analista de ventas. Cuando el usuario pida métricas o gráficos usa SIEMPRE query_sales y espera el resultado antes de responder. Una orden es cart_id. No inventes datos." }] },
        },
      }));
    };

    let sentPrompt = false;
    ws.onmessage = async (ev) => {
      const buf = ev.data instanceof Blob ? Buffer.from(await ev.data.arrayBuffer()) : Buffer.from(ev.data);
      const msg = JSON.parse(buf.toString());
      if (msg.setupComplete) {
        out.setup = true;
        console.log("setupComplete. Enviando pregunta...");
        if (!sentPrompt) {
          sentPrompt = true;
          ws.send(JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: "muestrame las ventas totales y cuantas ordenes hay" }] }],
              turnComplete: true,
            },
          }));
        }
      }
      if (msg.error) {
        out.errors.push(JSON.stringify(msg.error).slice(0, 400));
        console.log("SERVER ERR:", JSON.stringify(msg.error).slice(0, 400));
      }
      if (msg.toolCall?.functionCalls?.length) {
        out.toolCalls++;
        for (const fc of msg.toolCall.functionCalls) {
          console.log(`toolCall ${fc.name} id=${fc.id} sql=${JSON.stringify(fc.args)}`);
          const result = await runQuery(fc.args?.sql);
          console.log("  -> query result:", JSON.stringify(result).slice(0, 300));
          ws.send(JSON.stringify({
            toolResponse: { functionResponses: [{ name: fc.name, id: fc.id, response: { result } }] },
          }));
        }
      }
      if (msg.serverContent?.modelTurn?.parts) {
        for (const p of msg.serverContent.modelTurn.parts) {
          if (p.inlineData) out.audioChunks++;
        }
      }
      if (msg.serverContent?.modelTurn?.parts?.some?.((p) => p.text)) {
        out.text = (out.text ?? "") + msg.serverContent.modelTurn.parts.filter((p) => p.text).map((p) => p.text).join("");
      }
    };
    ws.onerror = () => { out.errors.push("wserror"); };
    ws.onclose = (e) => { clearTimeout(timeout); console.log(`closed ${e.code} ${e.reason}`); resolve(out); };
  });
}

async function main() {
  const token = await mint();
  console.log("token ok");
  const r = await run(token);
  console.log("RESULT:", JSON.stringify(r, null, 2));
  if (r.toolCalls >= 1 && r.audioChunks > 0) {
    console.log(">>> FLUJO COMPLETO FUNCIONA: toolCall -> query real -> respuesta hablada");
  } else {
    console.log("!!! FLUJO INCOMPLETO");
    process.exit(1);
  }
}
main().catch((e) => { console.error("FAIL", e.message ?? e); process.exit(1); });