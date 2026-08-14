import SalesKPIs from "@/components/sales-kpis";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Dashboard conversacional
          </h1>
          <p className="text-muted-foreground">
            Métricas de ventas en vivo. Pronto: pregúntale a los datos en voz o
            texto.
          </p>
        </header>

        <SalesKPIs />
      </main>
    </div>
  );
}