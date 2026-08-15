"use client";

import { Mic, MicOff, Square, Loader2, MessageSquare } from "lucide-react";
import { useLiveVoice } from "@/lib/use-live-voice";
import { Button } from "@/components/ui/button";
import DynamicChart from "@/components/dynamic-chart";
import ChatInput from "@/components/chat-input";

const statusLabel: Record<string, string> = {
  idle: "Iniciar conversación por voz",
  connecting: "Conectando...",
  connected: "Conectado — habla libremente",
  error: "Reintentar conversación por voz",
};

const statusHint: Record<string, string> = {
  idle: "Grabá una pregunta, por ejemplo: «muestrame las ventas por mes»",
  connecting: "Estableciendo conexión segura con Gemini Live…",
  connected: "Te escucho. Pedí métricas o una gráfica por voz.",
  error: "Hubo un problema. Tocá para reintentar.",
};

export default function VoiceButton() {
  const { status, error, isMuted, toolResult, start, stop, toggleMute } =
    useLiveVoice();

  const isBusy = status === "connecting";
  const isOn = status === "connected";

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MessageSquare className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">
              Asistente de ventas
            </p>
            <p className="text-xs text-muted-foreground">
              {error ?? statusHint[status]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOn && (
            <Button
              onClick={toggleMute}
              variant="outline"
              size="icon"
              aria-label={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
              className={isMuted ? "text-red-500" : undefined}
            >
              {isMuted ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>
          )}

          <Button
            onClick={() => (isOn ? stop() : start())}
            variant={isOn ? "destructive" : "default"}
            aria-label={statusLabel[status]}
            disabled={isBusy && !isOn}
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isOn ? (
              <Square className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
            {statusLabel[status]}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {toolResult && (
        <div className="mt-4">
          <DynamicChart result={toolResult} />
        </div>
      )}

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        o escribí tu consulta
        <span className="h-px flex-1 bg-border" />
      </div>

      <ChatInput />
    </section>
  );
}
