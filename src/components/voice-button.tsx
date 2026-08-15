"use client";

import { Mic, MicOff, Square, Loader2 } from "lucide-react";
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
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
          {!isOn && !error && (
            <span className="text-xs text-muted-foreground">{statusHint[status]}</span>
          )}
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      {toolResult && (
        <div className="mt-1">
          <DynamicChart result={toolResult} />
        </div>
      )}

      <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        o escribí tu consulta
        <span className="h-px flex-1 bg-border" />
      </div>

      <ChatInput />
    </div>
  );
}
