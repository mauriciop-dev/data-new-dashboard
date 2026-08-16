"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-store";
import { useDashboardData } from "@/lib/use-dashboard-data";
import KpiCards from "./kpi-cards";
import DashboardFilters, { type DashboardFilters as Filters } from "./filters";
import DashboardPages from "./dashboard-pages";
import CubeTransition from "@/components/cube-transition";
import { cn } from "@/lib/utils";

const PAGES = [
  { id: 0, label: "Resumen" },
  { id: 1, label: "Productos" },
  { id: 2, label: "Órdenes" },
];

export default function DashboardView() {
  const [filters, setFilters] = useState<Filters>({
    category: null,
    month: null,
  });

  useDashboardData(filters);

  const { dashboard, dashboardError, loading, currentChart } = useDashboard();

  const [page, setPage] = useState(0); // página visible
  const [nextPage, setNextPage] = useState<number | null>(null); // página destino
  const [cubePhase, setCubePhase] = useState<"idle" | "out" | "in">("idle");

  const switchPage = useCallback(
    (next: number) => {
      if (cubePhase !== "idle" || next === page) return;
      setNextPage(next);
      setCubePhase("out");
    },
    [cubePhase, page]
  );

  const handleCubeOut = useCallback(() => {
    if (nextPage === null) {
      setCubePhase("idle");
      return;
    }
    setPage(nextPage);
    setNextPage(null);
    setCubePhase("in");
  }, [nextPage]);

  const handleCubeIn = useCallback(() => {
    setCubePhase("idle");
  }, []);

  // Si el usuario genera una gráfica nueva, voltéalo hacia la página Resumen
  useEffect(() => {
    if (currentChart && cubePhase === "idle") {
      const t = setTimeout(() => switchPage(0), 0);
      return () => clearTimeout(t);
    }
  }, [currentChart, cubePhase, switchPage]);

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <KpiCards metrics={[]} isLoading />
        <div className="flex-1 min-h-0 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }

  if (dashboardError || !dashboard) {
    return (
      <div className="flex h-full min-h-0 items-start rounded-xl border border-destructive/40 bg-destructive/10 p-6">
        <p className="font-semibold text-destructive">
          Error al cargar el dashboard
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{dashboardError}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* KPIs */}
      <KpiCards metrics={dashboard.metrics} />

      {/* Filtros compactos */}
      <div className="rounded-xl border bg-card/70 backdrop-blur-xl p-3 shadow-sm">
        <DashboardFilters
          categories={dashboard.filters.categories}
          months={dashboard.filters.months}
          value={filters}
          onChange={setFilters}
        />
      </div>

      {/* Navegación por páginas (como páginas de informe en Power BI) */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() =>
            switchPage((page + PAGES.length - 1) % PAGES.length)
          }
          disabled={cubePhase !== "idle"}
          aria-label="Página anterior"
          className="rounded-full border bg-card/70 backdrop-blur-xl p-2 text-muted-foreground transition hover:bg-card disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center gap-1 rounded-full border bg-card/70 px-2 py-1 backdrop-blur-xl">
          <LayoutGrid className="mr-1 size-4 text-muted-foreground" />
          {PAGES.map((p) => (
            <button
              key={p.id}
              onClick={() => switchPage(p.id)}
              disabled={cubePhase !== "idle"}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                page === p.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => switchPage((page + 1) % PAGES.length)}
          disabled={cubePhase !== "idle"}
          aria-label="Página siguiente"
          className="rounded-full border bg-card/70 backdrop-blur-xl p-2 text-muted-foreground transition hover:bg-card disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Área de contenido con transición de cubo 3D */}
      <div className="relative min-h-0 flex-1">
        {cubePhase !== "idle" && (
          <CubeTransition
            direction={cubePhase}
            page={page}
            next={cubePhase === "out" ? nextPage : null}
            onComplete={
              cubePhase === "out" ? handleCubeOut : handleCubeIn
            }
          />
        )}
        <div className="absolute inset-0">
          <DashboardPages page={page} />
        </div>
      </div>
    </div>
  );
}