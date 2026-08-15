"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AudioChunk {
  data: string;
  mimeType: string;
}

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export interface LiveVoiceResult {
  status: VoiceStatus;
  error: string | null;
  isMuted: boolean;
  toolResult: ToolResult | null;
  start: () => Promise<void>;
  stop: () => void;
  toggleMute: () => void;
}

export interface ToolResult {
  sql: string;
  cols: string[];
  rows: Record<string, unknown>[];
  elapsedMs: number;
  ts?: string;
}

const WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

const QUERY_SALES_TOOL = {
  functionDeclarations: [
    {
      name: "query_sales",
      description:
        "Consulta de SOLO LECTURA sobre la tabla SQLite llamada SIEMPRE 'ventas' (IMPORTANTE: la tabla se llama ventas, NUNCA 'sales', NUNCA 'products'). Esquema de ventas: id INTEGER, cart_id INTEGER, product_rank INTEGER, product_id INTEGER, title TEXT, price REAL, quantity INTEGER, total REAL (total del item), discount_percentage REAL, discounted_total REAL, thumbnail TEXT, cart_total REAL (total de TODA la orden), cart_discounted_total REAL, user_id INTEGER, total_products INTEGER, total_quantity INTEGER, date TEXT 'YYYY-MM-DD'. Una orden = un cart_id (un cart tiene varios productos, uno por fila). Ventas totales de una orden = cart_total, NO la suma de filas del mismo cart. Para numero de ordenes usa COUNT(DISTINCT cart_id). Para unidades usa SUM(quantity). Para series de tiempo agrupa por substr(date,1,7) (mes) o substr(date,1,10) (dia). Si el usuario pide ventas por categoria, NECESITAS otra columna que no existe; en su lugar agrupa por title o por mes.",
      parameters: {
        type: "OBJECT",
        properties: {
          sql: {
            type: "STRING",
            description:
              "Consulta SELECT SQLite valida sobre la tabla 'ventas' (usa el nombre ventas exactamente; GROUP BY, ORDER BY, substr, ROUND, COUNT, SUM permitidos; LIMIT recomendado ~500 filas).",
          },
        },
        required: ["sql"],
      },
    },
  ],
};

export function useLiveVoice(
  onServerAudio?: (pcmBase64: string, mimeType: string) => void,
  onToolResult?: (result: ToolResult) => void
): LiveVoiceResult {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceGainRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const startBufferRef = useRef<AudioChunk[]>([]);
  const mutedRef = useRef(false);
  const clockRef = useRef<AudioContext | null>(null);
  const onServerAudioRef = useRef(onServerAudio);
  const setupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedRef = useRef<Record<string, boolean>>({});
  const statusRef = useRef<VoiceStatus>("idle");
  const onToolResultRef = useRef(onToolResult);
  const setStatusBoth = useCallback((s: VoiceStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  useEffect(() => {
    onToolResultRef.current = onToolResult;
  }, [onToolResult]);

  const runQueryTool = useCallback(
    async (fc: { name: string; args?: Record<string, unknown>; id: string }) => {
      const started = Date.now();
      const sql = String(fc.args?.sql ?? "");
      if (!sql) {
        return { error: "Falta la consulta SQL" };
      }
      try {
        const res = await fetch("/api/sql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql }),
        });
        const json = await res.json();
        if (!res.ok) {
          const msg = json.error ?? `HTTP ${res.status}`;
          // Autocorrección: si usa una tabla que no existe, indicarle cuál es la correcta
          if (/no such table/i.test(String(msg))) {
            return {
              error:
                "La tabla no existe. La unica tabla disponible se llama 'ventas'. Reintenta el SELECT usando 'ventas' como nombre de tabla (no 'sales', no 'products').",
            };
          }
          return { error: msg };
        }
        const result: ToolResult = {
          sql,
          cols: json.cols ?? [],
          rows: json.rows ?? [],
          elapsedMs: Date.now() - started,
          ts: new Date().toISOString(),
        };
        setToolResult(result);
        onToolResultRef.current?.(result);
        return { ok: true, ...result };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Error en query" };
      }
    },
    []
  );

  const logOnce = useCallback((key: string, ...args: unknown[]) => {
    if (!loggedRef.current[key]) {
      loggedRef.current[key] = true;
      console.debug(`[live-voice] ${key}`, ...args);
    }
  }, []);

  const sendJson = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const playPcm16 = useCallback((b64: string, mimeRate: string) => {
    if (mutedRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    const rate = parseInt(mimeRate.split("rate=")[1] ?? "24000", 10);
    const bytes = atob(b64);
    const samples = new Int16Array(bytes.length / 2);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = bytes.charCodeAt(i * 2) | (bytes.charCodeAt(i * 2 + 1) << 8);
    }

    const buffer = ctx.createBuffer(1, samples.length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      data[i] = samples[i] / 32768;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain);
    gain.connect(ctx.destination);

    const when = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    src.start(when);
    nextPlayTimeRef.current = when + buffer.duration;
  }, []);

  useEffect(() => {
    onServerAudioRef.current = onServerAudio;
  }, [onServerAudio]);

  const start = useCallback(async () => {
    setError(null);
    setStatusBoth("connecting");

    try {
      const tokenRes = await fetch("/api/voice-token");
      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        throw new Error(body || `HTTP ${tokenRes.status}`);
      }
      const { token, model } = await tokenRes.json();
      if (!token) throw new Error("Respuesta de token vacía");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx({
        sampleRate: 16000,
        latencyHint: "interactive",
      });
      ctxRef.current = ctx;
      clockRef.current = ctx;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      ctx.onstatechange = () => {
        logOnce("ctx-state", ctx.state);
        if (ctx.state === "suspended") {
          void ctx.resume();
        }
      };
      logOnce("ctx-rate", ctx.sampleRate);

      micSourceRef.current = ctx.createMediaStreamSource(stream);
      await ctx.audioWorklet.addModule("/audio/mic-capture-processor.js");
      const silence = ctx.createGain();
      silence.gain.value = 0;
      silenceGainRef.current = silence;
      micSourceRef.current.connect(silence);
      silence.connect(ctx.destination);

      const ws = new WebSocket(
        `${WS_BASE}?access_token=${encodeURIComponent(token)}`
      );
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        sendJson({
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
            tools: [QUERY_SALES_TOOL],
            systemInstruction: {
              parts: [
                {
                  text: "Eres un analista de ventas de un dashboard conversacional. Cuando el usuario pida métricas, datos o gráficos, usa la herramienta query_sales con SQL sobre la tabla ventas. Una orden es un cart_id; no sumes total de filas como ventas totales: usa SUM(cart_total) DISTINCT por orden o agrega por orden. Responde siempre con una conclusión breve de negocio, no leas todos los números. Idioma: conciso.",
                },
              ],
            },
          },
        });
      });

      setupTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === "connecting") {
          setError("Sin respuesta del servidor (timeout tras 20s)");
          setStatusBoth("error");
          try {
            ws.close();
          } catch {}
        }
      }, 20000);

      ws.addEventListener("message", async (event) => {
        let text: string;
        if (typeof event.data === "string") {
          text = event.data;
        } else {
          const buf = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
          text = new TextDecoder().decode(buf);
        }

        const msg = JSON.parse(text);

        if (msg.setupComplete) {
          if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
          logOnce("setup-complete", true);
          setStatusBoth("connected");
          const buffered = startBufferRef.current.splice(0);
          for (const { data: b64, mimeType } of buffered) {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  realtimeInput: { audio: { data: b64, mimeType } },
                })
              );
            }
          }
          // Marcar turno del modelo para que responda en voz
          sendJson({
            realtimeInput: { audio: { data: "", mimeType: "audio/pcm;rate=16000" } },
          });
        }

        if (msg.error) {
          setError(msg.error.message ?? JSON.stringify(msg.error));
          setStatusBoth("error");
        }

        if (msg.toolCall?.functionCalls?.length) {
          const functionResponses = [];
          for (const fc of msg.toolCall.functionCalls) {
            logOnce("tool-call", fc.name, JSON.stringify(fc.args ?? {}).slice(0, 120));
            const result = await runQueryTool(fc);
            functionResponses.push({
              name: fc.name,
              id: fc.id,
              response: { result },
            });
          }
          sendJson({ toolResponse: { functionResponses } });
        }

        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            const inline = part.inlineData;
            if (inline?.data) {
              logOnce("server-audio", inline.mimeType, inline.data.length);
              playPcm16(inline.data, inline.mimeType ?? "audio/pcm;rate=24000");
              onServerAudioRef.current?.(inline.data, inline.mimeType ?? "audio/pcm;rate=24000");
            }
          }
        }
      });

      ws.addEventListener("close", () => {
        if (setupTimeoutRef.current) {
          clearTimeout(setupTimeoutRef.current);
          setupTimeoutRef.current = null;
        }
        if (statusRef.current !== "error") {
          setStatusBoth("idle");
        }
      });
      ws.addEventListener("error", () => {
        setError("Error de conexión con Gemini Live");
        setStatusBoth("error");
      });

      const processor = new AudioWorkletNode(ctx, "mic-capture");
      processor.port.onmessage = (e) => {
        const { pcm, peak } = e.data as { pcm: Int16Array; peak: number };
        if (peak > 0.01) {
          logOnce("mic-peak", peak.toFixed(3));
        }
        const b64 = pcmToBase64(pcm);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              realtimeInput: {
                audio: { data: b64, mimeType: "audio/pcm;rate=16000" },
              },
            })
          );
        } else if (startBufferRef.current.length < 100) {
          startBufferRef.current.push({ data: b64, mimeType: "audio/pcm;rate=16000" });
        }
      };
      micSourceRef.current.connect(processor);
      processor.connect(ctx.destination);

      // Pedir saludo para forzar primer serverTurn
      sendJson({
        realtimeInput: { audio: { data: "", mimeType: "audio/pcm;rate=16000" } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar voz");
      setStatusBoth("error");
    }
  }, [playPcm16, sendJson, status, setStatusBoth, runQueryTool]);

  const stop = useCallback(() => {
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
      setupTimeoutRef.current = null;
    }
    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;
    startBufferRef.current = [];

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    try {
      micSourceRef.current?.disconnect();
    } catch {}
    micSourceRef.current = null;
    try {
      silenceGainRef.current?.disconnect();
    } catch {}
    silenceGainRef.current = null;

    if (ctxRef.current) {
      void ctxRef.current.close();
    }
    ctxRef.current = null;
    clockRef.current = null;
    nextPlayTimeRef.current = 0;
    setStatusBoth("idle");
  }, [setStatusBoth]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setIsMuted(mutedRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
        setupTimeoutRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (ctxRef.current) {
        void ctxRef.current.close();
      }
    };
  }, []);

  return { status, error, isMuted, toolResult, start, stop, toggleMute };
}

function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(i * 2, pcm[i], true);
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
    );
  }
  return btoa(binary);
}