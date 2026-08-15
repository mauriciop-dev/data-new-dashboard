"use client";

import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { useLiveVoice } from "@/lib/use-live-voice";
import { Button } from "@/components/ui/button";
import DynamicChart from "@/components/dynamic-chart";

const statusLabel: Record<string, string> = {
  idle: "Iniciar conversación por voz",
  connecting: "Conectando...",
  connected: "Conectado — habla libremente",
  error: "Reintentar conversación por voz",
};

export default function VoiceButton() {
  const { status, error, isMuted, toolResult, start, stop, toggleMute } =
    useLiveVoice();

  const isBusy = status === "connecting";
  const isOn = status === "connected";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {isOn && (
          <Button
            onClick={toggleMute}
            variant="outline"
            size="icon-lg"
            aria-label={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
            data-active={isMuted ? "" : undefined}
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
          size="lg"
          variant={isOn ? "default" : "default"}
          aria-label={statusLabel[status]}
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

        {error && <p className="max-w-xs text-xs text-destructive">{error}</p>}
      </div>

      {toolResult && <DynamicChart result={toolResult} />}
    </div>
  );
}