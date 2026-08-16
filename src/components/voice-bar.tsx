"use client";

import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { useLiveVoice } from "@/lib/use-live-voice";
import { useDashboard } from "@/lib/dashboard-store";
import { inferHighlight, chartNoteFromResult } from "@/lib/highlight";
import { Button } from "@/components/ui/button";

export default function VoiceBar() {
  const { setCurrentChart, setHighlight, setChartError } = useDashboard();
  const { status, error, isMuted, start, stop, toggleMute } = useLiveVoice(
    undefined,
    (result) => {
      if (result.rows && result.rows.length > 0) {
        setCurrentChart(result, chartNoteFromResult(result));
        const h = inferHighlight(result);
        if (h) setHighlight(h);
      }
    }
  );

  const isBusy = status === "connecting";
  const isOn = status === "connected";

  if (error && setChartError) {
    setChartError(error);
  }

  return (
    <div className="mt-1 inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">
        {isOn
          ? "Escuchando…"
          : isBusy
            ? "Conectando…"
            : "Toca para hablar"}
      </span>

      {isOn && (
        <Button
          onClick={toggleMute}
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
        >
          {isMuted ? (
            <MicOff className="size-3.5 text-red-500" />
          ) : (
            <Mic className="size-3.5 text-emerald-500" />
          )}
        </Button>
      )}

      <Button
        onClick={() => (isOn ? stop() : start())}
        variant={isOn ? "destructive" : "outline"}
        size="sm"
        className="h-7 gap-1.5 px-2.5"
        aria-label={isOn ? "Detener voz" : "Iniciar voz"}
        disabled={isBusy && !isOn}
      >
        {isBusy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isOn ? (
          <Square className="size-3.5" />
        ) : (
          <Mic className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
