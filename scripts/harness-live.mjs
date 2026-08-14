const BASE = "https://generativelanguage.googleapis.com/v1beta";
const KEY = process.env.GEMINI_API_KEY;
const MODEL =
  process.env.LIVE_MODEL || "gemini-3.1-flash-live-preview";

if (!KEY) throw new Error("Falta GEMINI_API_KEY");

async function mint() {
  const res = await fetch(`${BASE}/auth_tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": KEY,
    },
    body: JSON.stringify({}),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`mint ${res.status}: ${txt}`);
  const json = JSON.parse(txt);
  const name = json.name;
  const id = name.split("/").pop();
  return { name, transientToken: id };
}

function wsUrl(token, model) {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.Constrained.BidiGenerateContentConstrained?access_token=${token}`;
}

async function testModel(model, token) {
  return new Promise((resolve) => {
    const url = wsUrl(token, model);
    const ws = new WebSocket(url);
    const out = { model, connected: false, setup: false, serverTurns: 0, error: null, closed: false };
    const timeout = setTimeout(() => {
      out.error = out.error || "TIMEOUT 25s";
      ws.close();
      resolve(out);
    }, 25000);

    ws.onopen = () => {
      out.connected = true;
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" },
                },
              },
            },
          },
        })
      );
    };

    ws.onmessage = (ev) => {
      const raw =
        typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString();
      const msg = JSON.parse(raw);
      if (msg.setupComplete) {
        out.setup = true;
        console.log(`[${model}] setupComplete OK`);
        // Enviar un ping de audio de silencio cortos para probar realTimeInput
        const silence = Buffer.alloc(3200); // 100ms @ 32kHz no… 20ms/min chunk
        ws.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                data: silence.toString("base64"),
                mimeType: "audio/pcm;rate=16000",
              },
            },
          })
        );
      }
      if (msg.error) {
        out.error = out.error || `server error: ${JSON.stringify(msg.error)}`;
        console.log(`[${model}] ERROR:`, JSON.stringify(msg.error).slice(0, 400));
      }
      if (msg.serverContent) {
        out.serverTurns++;
        const parts = msg.serverContent.modelTurn?.parts ?? [];
        for (const p of parts) {
          for (const [k, v] of Object.entries(p)) {
            if (k === "inlineData" && v?.mimeType) {
              console.log(
                `[${model}] inlineData ${v.mimeType} ${v.data?.length} b64`
              );
            }
          }
        }
      }
      if (msg.speechConfig) {
        console.log(`[${model}] speechConfig:`, JSON.stringify(msg.speechConfig).slice(0, 300));
      }
    };

    ws.onerror = (e) => {
      out.error = out.error || `ws error`;
      console.log(`[${model}] onerror`, e.message ?? "");
    };
    ws.onclose = (e) => {
      out.closed = true;
      out.closeCode = e.code;
      out.closeReason = e.reason;
      clearTimeout(timeout);
      console.log(`[${model}] closed ${e.code} ${e.reason}`);
      resolve(out);
    };
  });
}

async function main() {
  const token = await mint();
  console.log("Token minted:", token.transientToken.slice(0, 12) + "...");

  const candidates = [
    process.env.LIVE_MODEL,
    "gemini-3.1-flash-live-preview",
    "gemini-2.5-flash-native-audio-latest",
    "gemini-flash-latest",
  ].filter(Boolean);

  for (const m of candidates) {
    if (new Set(candidates).size - candidates.length) continue;
  }
  // dedupe
  const seen = new Set();
  for (const m of candidates) {
    if (seen.has(m)) continue;
    seen.add(m);
    console.log(`\n=== Probando ${m} ===`);
    const r = await testModel(m, token);
    console.log(`RESULT ${m}:`, JSON.stringify(r));
    if (r.setup && r.serverTurns > 0) {
      console.log(`>>> ${m} FUNCIONA (con voz)`);
      process.exit(0);
    }
  }
  process.exit(1);
}

main().catch((e) => {
  console.error("FAIL:", e.message ?? e);
  process.exit(1);
});