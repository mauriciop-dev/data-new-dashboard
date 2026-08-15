"use client";

import { useState } from "react";
import { TrendingUp, MessageSquare, X } from "lucide-react";
import SalesKPIs from "@/components/sales-kpis";
import VoiceButton from "@/components/voice-button";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold tracking-tight">
                Pulse Analytics
              </span>
              <span className="rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                En vivo
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Métricas de ventas en tiempo real. Hablá con tus datos.
            </p>
          </div>

          <Button
            onClick={() => setChatOpen(true)}
            variant="default"
            size="sm"
            className="hidden items-center gap-2 sm:inline-flex"
          >
            <MessageSquare className="size-4" />
            Abrir asistente
          </Button>
        </header>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="size-4" />
            Resumen general
          </div>
          <SalesKPIs />
        </section>
      </main>

      {/* Botón flotante */}
      <Button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 size-14 shrink-0 rounded-full shadow-lg"
        aria-label="Abrir asistente de ventas"
      >
        <MessageSquare className="size-6" />
      </Button>

      {/* Side panel */}
      {chatOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setChatOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-sm font-semibold">Asistente de ventas</p>
                <p className="text-xs text-muted-foreground">
                  Voz o texto · Pulse Analytics
                </p>
              </div>
              <Button
                onClick={() => setChatOpen(false)}
                variant="ghost"
                size="icon"
                aria-label="Cerrar asistente"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <VoiceButton />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
