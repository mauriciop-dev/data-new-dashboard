import { TrendingUp } from "lucide-react";
import SalesKPIs from "@/components/sales-kpis";
import VoiceButton from "@/components/voice-button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            En vivo · Turso DB
          </span>
          <h1 className="text-4xl font-semibold tracking-tight">
            Dashboard conversacional
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Métricas de ventas impulsadas por Gemini Live. Pregúntale a los
            datos en voz o texto y obtené respuestas con gráficos generados al
            instante.
          </p>
        </header>

        <VoiceButton />

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="size-4" />
            Resumen general
          </div>
          <SalesKPIs />
        </section>
      </main>
    </div>
  );
}
