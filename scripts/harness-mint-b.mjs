const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.LIVE_MODEL || "gemini-3.1-flash-live-preview";

const now = Date.now();
async function mintWithUses() {
  const body = {
    uses: [
      {
        services: [],
        timeframe: {
          startTime: new Date(now - 10 * 60 * 1000).toISOString(),
          endTime: new Date(now + 120 * 60 * 1000).toISOString(),
        },
      },
    ],
  };
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`mint ${res.status}: ${txt}`);
  const json = JSON.parse(txt);
  console.log("mint raw:", JSON.stringify(json));
  return json.name.split("/").pop();
}

function testWs(wsPath, label) {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsPath);
    const out = { label, connected: false, setup: false, error: null };
    const timeout = setTimeout(() => { out.error = out.error || "TIMEOUT 20s"; try { ws.close(); } catch {} resolve(out); }, 20000);
    ws.onopen = () => {
      out.connected = true;
      ws.send(JSON.stringify({
        setup: { model: `models/${MODEL}`, generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } } },
      }));
    };
    ws.onmessage = async (ev) => {
      const buf = ev.data instanceof Blob ? Buffer.from(await ev.data.arrayBuffer()) : Buffer.from(ev.data);
      const msg = JSON.parse(buf.toString());
      if (msg.setupComplete) { out.setup = true; console.log(`[${label}] setupComplete`); resolve(out); }
      if (msg.error) { out.error = JSON.stringify(msg.error).slice(0, 300); console.log(`[${label}] ERR`, out.error); }
    };
    ws.onerror = () => { out.error = out.error || "wserror"; };
    ws.onclose = (e) => { clearTimeout(timeout); console.log(`[${label}] closed ${e.code} ${e.reason}`); if (!out.setup) resolve(out); };
  });
}

async function main() {
  const token = await mintWithUses();
  console.log("TOKEN:", token.slice(0, 16) + "...");
  const r1 = await testWs(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?access_token=${token}`, "BidiGenerateContent?access_token(with uses)");
  console.log("RESULT:", JSON.stringify(r1));
}
main().catch((e) => { console.error("FAIL", e.message ?? e); process.exit(1); });