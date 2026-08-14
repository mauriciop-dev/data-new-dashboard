const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.LIVE_MODEL || "gemini-3.1-flash-live-preview";

async function mint() {
  const now = new Date();
  const expire = new Date(now.getTime() + 30 * 60 * 1000);
  const body = {
    uses: 1,
    expireTime: expire.toISOString(),
    newSessionExpireTime: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
  };
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1alpha/auth_tokens",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify(body),
    }
  );
  const txt = await res.text();
  if (!res.ok) throw new Error(`mint ${res.status}: ${txt}`);
  const json = JSON.parse(txt);
  console.log("mint name (completo):", json.name);
  return json.name;
}

function testWs(wsPath, label, token) {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsPath);
    const out = { label, connected: false, setup: false, error: null, turns: 0 };
    const timeout = setTimeout(() => {
      out.error = out.error || "TIMEOUT 20s";
      try { ws.close(); } catch {}
      resolve(out);
    }, 20000);
    ws.onopen = () => {
      out.connected = true;
      ws.send(JSON.stringify({
        setup: {
          model: `models/${MODEL}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
          },
        },
      }));
    };
    ws.onmessage = async (ev) => {
      const buf = ev.data instanceof Blob ? Buffer.from(await ev.data.arrayBuffer()) : Buffer.from(ev.data);
      const msg = JSON.parse(buf.toString());
      if (msg.setupComplete) {
        out.setup = true;
        console.log(`[${label}] setupComplete`);
        const silence = Buffer.alloc(1600).toString("base64");
        ws.send(JSON.stringify({ realtimeInput: { audio: { data: silence, mimeType: "audio/pcm;rate=16000" } } }));
      }
      if (msg.error) { out.error = JSON.stringify(msg.error).slice(0, 300); console.log(`[${label}] ERR`, out.error); }
      if (msg.serverContent) {
        out.turns++;
        const parts = msg.serverContent.modelTurn?.parts ?? [];
        parts.forEach((p) => {
          if (p.inlineData) console.log(`[${label}] audio ${p.inlineData.mimeType} ${p.inlineData.data.length}b64`);
        });
      }
    };
    ws.onerror = () => { out.error = out.error || "wserror"; };
    ws.onclose = (e) => { clearTimeout(timeout); console.log(`[${label}] closed ${e.code} ${e.reason}`); if (!out.setup) resolve(out); };
  });
}

async function main() {
  const token = await mint();
  const enc = encodeURIComponent(token);

  const pathA = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${enc}`;
  const r1 = await testWs(pathA, "v1alpha Constrained ?access_token=name", token);
  console.log("RESULT A:", JSON.stringify(r1));
  if (r1.setup) { console.log(">>> FUNCIONA v1alpha Constrained"); process.exit(0); }
  process.exit(1);
}
main().catch((e) => { console.error("FAIL", e.message ?? e); process.exit(1); });