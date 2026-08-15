"use client";

import { useState } from "react";
import { X, Activity } from "lucide-react";
import { DashboardProvider } from "@/lib/dashboard-store";
import DashboardView from "@/components/dashboard/dashboard-view";
import VoiceButton from "@/components/voice-button";
import ThreeBackground from "@/components/three-background";
import { Button } from "@/components/ui/button";

function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-emerald-500" />
              Asistente Pulse Analytics
            </p>
            <p className="text-xs text-muted-foreground">
              Voz o texto · las gráficas se muestran en el dashboard
            </p>
          </div>
          <Button
            onClick={onClose}
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
  );
}

function Dashboard({ setChatOpen }: { setChatOpen: (v: boolean) => void }) {
  return (
    <div className="relative min-h-screen bg-background font-sans">
      <ThreeBackground />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg">
                <Activity className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Pulse Analytics
                </h1>
                <p className="text-xs text-muted-foreground">
                  Centro de Inteligencia Comercial · En vivo
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              Conectado a tus datos
            </span>
            <Button
              onClick={() => setChatOpen(true)}
              className="sm:hidden"
              aria-label="Abrir asistente"
            >
              Asistente
            </Button>
          </div>
        </header>

        <DashboardView />
      </div>
    </div>
  );
}

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <DashboardProvider>
      <Dashboard setChatOpen={setChatOpen} />

      {/* Botón flotante */}
      <Button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 size-14 shrink-0 rounded-full shadow-xl"
        aria-label="Abrir asistente de ventas"
      >
        <Activity className="size-6" />
      </Button>

      {/* Side panel */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </DashboardProvider>
  );
}
