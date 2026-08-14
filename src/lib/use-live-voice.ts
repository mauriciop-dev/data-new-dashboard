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
  start: () => Promise<void>;
  stop: () => void;
  toggleMute: () => void;
}

const WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

export function useLiveVoice(
  onServerAudio?: (pcmBase64: string, mimeType: string) => void
): LiveVoiceResult {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

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
    setStatus("connecting");

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
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      clockRef.current = ctx;
      await ctx.resume();

      micSourceRef.current = ctx.createMediaStreamSource(stream);
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
          },
        });
      });

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
          setStatus("connected");
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
        }

        if (msg.error) {
          setError(msg.error.message ?? JSON.stringify(msg.error));
          setStatus("error");
        }

        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            const inline = part.inlineData;
            if (inline?.data) {
              playPcm16(inline.data, inline.mimeType ?? "audio/pcm;rate=24000");
              onServerAudioRef.current?.(inline.data, inline.mimeType ?? "audio/pcm;rate=24000");
            }
          }
        }
      });

      ws.addEventListener("close", () => {
        if (status !== "error") {
          setStatus("idle");
        }
      });
      ws.addEventListener("error", () => {
        setError("Error de conexión con Gemini Live");
        setStatus("error");
      });

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar voz");
      setStatus("error");
    }
  }, [playPcm16, sendJson, status]);

  const stop = useCallback(() => {
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
    setStatus("idle");
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setIsMuted(mutedRef.current);
  }, []);

  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (ctxRef.current) {
        void ctxRef.current.close();
      }
    };
  }, []);

  return { status, error, isMuted, start, stop, toggleMute };
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