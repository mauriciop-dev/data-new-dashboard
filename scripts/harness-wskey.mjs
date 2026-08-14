const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.LIVE_MODEL || "gemini-3.1-flash-live-preview";

async function testWs(wsPath, label) {
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
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
          },
        },
      }));
    };
    ws.onmessage = async (ev) => {
      const buf = ev.data instanceof Blob ? Buffer.from(await ev.data.arrayBuffer()) : Buffer.from(ev.data);
      const raw = buf.toString();
      const msg = JSON.parse(raw);
      if (msg.setupComplete) { out.setup = true; console.log(`[${label}] setupComplete`);
        const silence = Buffer.alloc(1600).toString("base64");
        ws.send(JSON.stringify({ realtimeInput: { audio: { data: silence, mimeType: "audio/pcm;rate=16000" } } }));
      }
      if (msg.error) { out.error = JSON.stringify(msg.error).slice(0, 300); console.log(`[${label}] ERR`, out.error); }
      if (msg.serverContent) {
        out.turns++;
        const parts = msg.serverContent.modelTurn?.parts ?? [];
        parts.forEach((p) => {
          const id = p.inlineData;
          if (id) console.log(`[${label}] audio ${id.mimeType} ${id.data.length}b64`);
        });
      }
    };
    ws.onerror = () => { out.error = out.error || "wserror"; };
    ws.onclose = (e) => { clearTimeout(timeout); console.log(`[${label}] closed ${e.code} ${e.reason}`); resolve(out); };
  });
}

async function main() {
  const wsKey = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${KEY}`;
  const r1 = await testWs(wsKey, "BidiGenerateContent?key=");
  console.log("RESULT:", JSON.stringify(r1));
}

main().catch((e) => { console.error("FAIL", e.message ?? e); process.exit(1); });