const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.LIVE_MODEL || "gemini-3.1-flash-live-preview";

const SQL_TOOL = {
  functionDeclarations: [
    {
      name: "query_sales",
      description:
        "Ejecuta una consulta SQL de SOLO LECTURA (SELECT) contra la tabla ventas y devuelve las filas. Esquema: ventas(id INTEGER, cart_id INTEGER, product_rank INTEGER, product_id INTEGER, title TEXT, price REAL, quantity INTEGER, total REAL, discount_percentage REAL, discounted_total REAL, thumbnail TEXT, cart_total REAL, cart_discounted_total REAL, user_id INTEGER, total_products INTEGER, total_quantity INTEGER, date TEXT 'YYYY-MM-DD'). Un cart_id es una orden; un producto dentro de un cart es una fila. Suma total por orden = cart_total, no la suma de filas.",
      parameters: {
        type: "OBJECT",
        properties: {
          sql: {
            type: "STRING",
            description:
              "Consulta SELECT completa en SQLite (puede usar GROUP BY, ORDER BY, substr, ROUND, COUNT DISTINCT).",
          },
        },
        required: ["sql"],
      },
    },
  ],
};

async function mint() {
  const now = new Date();
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1alpha/auth_tokens",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        uses: 2,
        expireTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
      }),
    }
  );
  const txt = await res.text();
  if (!res.ok) throw new Error(`mint ${res.status}: ${txt}`);
  return JSON.parse(txt).name;
}

function run() {
  return new Promise((resolve) => {
    const ws = new WebSocket(
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=" +
        encodeURIComponent(mintToken)
    );
    const out = { setup: false, toolCall: null, serverAudio: 0, error: null };
    const timeout = setTimeout(() => {
      out.error = out.error || "TIMEOUT 25s";
      try { ws.close(); } catch {}
    }, 25000);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${MODEL}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" },
                },
              },
            },
            tools: [SQL_TOOL],
            systemInstruction: {
              parts: [
                {
                  text: "Eres un analista de un dashboard de ventas. Si el usuario pide datos o métricas, usa la herramienta query_sales con SQL. Si pide solo conversación, no llames a la herramienta. Cuando recibas resultados, coméntalos brevemente.",
                },
              ],
            },
          },
        })
      );
    };

    let sent = false;
    ws.onmessage = async (ev) => {
      const buf = ev.data instanceof Blob ? Buffer.from(await ev.data.arrayBuffer()) : Buffer.from(ev.data);
      const msg = JSON.parse(buf.toString());

      if (msg.setupComplete) {
        out.setup = true;
        console.log("setupComplete");
        // Probar texto (clientContent) para disparar function calling
        if (!sent) {
          sent = true;
          console.log(">> enviando clientContent texto: '¿cuántas ventas totales hay?'");
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: "user",
                    parts: [{ text: "¿cuántas ventas totales hay y cuántas órdenes?" }],
                  },
                ],
                turnComplete: true,
              },
            })
          );
        }
      }
      if (msg.error) {
        out.error = JSON.stringify(msg.error).slice(0, 400);
        console.log("SERVER ERROR:", out.error);
      }
      if (msg.toolCall) {
        out.toolCall = JSON.stringify(msg.toolCall).slice(0, 500);
        console.log(">> toolCall:", msg.toolCall.functionCalls?.map((f) => ({ name: f.name, args: f.args, id: f.id })));
        // Responder
        const functionResponses = (msg.toolCall.functionCalls || []).map((fc) => ({
          name: fc.name,
          id: fc.id,
          response: { result: "TODO ejecutar query_sales" },
        }));
        ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
        console.log(">> enviado toolResponse", functionResponses.map((f) => f.name));
      }
      if (msg.serverContent?.modelTurn?.parts) {
        for (const p of msg.serverContent.modelTurn.parts) {
          if (p.inlineData) {
            out.serverAudio++;
            console.log(`  serverAudio ${p.inlineData.mimeType} ${p.inlineData.data.length}b64`);
          }
        }
      }
      if (msg.serverContent?.interrupted) {
        console.log("  (interrupted)");
      }
      if (msg.serverContent && !msg.serverContent.modelTurn && out.serverAudio > 0 && !msg.serverContent.interrupted) {
        console.log("  serverContent fin de turno?");
      }
    };

    ws.onerror = () => { out.error = out.error || "wserror"; };
    ws.onclose = (e) => {
      clearTimeout(timeout);
      console.log(`closed ${e.code} ${e.reason}`);
      resolve(out);
    };
  });
}

let mintToken = "";
main();
async function main() {
  mintToken = await mint();
  console.log("token ok");
  const r = await run();
  console.log("RESULT:", JSON.stringify(r, null, 2));
  if (r.toolCall) {
    console.log(">>> FUNCTION CALLING FUNCIONA");
    process.exit(0);
  }
  process.exit(r.error ? 1 : 0);
}