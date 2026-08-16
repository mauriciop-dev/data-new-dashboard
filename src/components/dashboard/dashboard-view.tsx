"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  PieChart,
  Table2,
  Sparkles,
  X,
} from "lucide-react";
import { useDashboard } from "@/lib/dashboard-store";
import { useDashboardData } from "@/lib/use-dashboard-data";
import KpiCards from "./kpi-cards";
import DashboardFilters, { type DashboardFilters as Filters } from "./filters";
import {
  MainTrendChart,
  CategoryPieChart,
  TopProductsBarChart,
  DynamicMainChart,
} from "./charts";
import { TopProductsTable } from "./data-tables";
import { cn } from "@/lib/utils";

export default function DashboardView() {
  useDashboardData();

  const {
    dashboard,
    dashboardError,
    chartError,
    loading,
    currentChart,
    currentChartNote,
    highlight,
    setCurrentChart,
  } = useDashboard();

  const [filters, setFilters] = useState<Filters>({
    category: null,
    month: null,
  });

  const mainSeries = useMemo(() => {
    if (!dashboard) return { name: "", data: [] as Record<string, string | number>[] };
    let data = dashboard.mainSeries.data;
    if (filters.month) {
      data = data.filter((d) => d.month === filters.month);
    }
    return { name: dashboard.mainSeries.name, data };
  }, [dashboard, filters.month]);

  const categorySeries = useMemo(() => {
    if (!dashboard) return { name: "", data: [] as Record<string, string | number>[] };
    let data = dashboard.categorySeries.data;
    if (filters.category) {
      data = data.filter((d) => d.categoria === filters.category);
    }
    return { name: dashboard.categorySeries.name, data };
  }, [dashboard, filters.category]);

  const topSeries = useMemo(() => {
    if (!dashboard) return [] as Record<string, string | number>[];
    let products = dashboard.topProducts;
    if (filters.category) {
      products = products.filter((p) => p.categoria === filters.category);
    }
    return products.map((p) => ({
      title: p.title.length > 22 ? p.title.slice(0, 21) + "…" : p.title,
      Ventas: p.total,
    }));
  }, [dashboard, filters.category]);

  if (loading) {
    return (
      <div className="space-y-4">
        <KpiCards metrics={[]} isLoading />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl border bg-card lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl border bg-card" />
        </div>
      </div>
    );
  }

  if (dashboardError || !dashboard) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
        <p className="font-semibold text-destructive">
          Error al cargar el dashboard
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {dashboardError}
        </p>
      </div>
    );
  }

  const showGeneratedChart = !!currentChart;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <KpiCards metrics={dashboard.metrics} />

      {/* Main chart — generated or default */}
      <section
        data-chart="main"
        className={cn(
          "rounded-xl border bg-card p-5 shadow-sm transition-all duration-700",
          highlight?.key === "main" && highlight.type === "chart" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              {showGeneratedChart ? "Gráfico principal" : "Ventas por mes"}
            </h2>
          </div>
          {showGeneratedChart && (
            <button
              onClick={() => setCurrentChart(null)}
              className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/70"
              aria-label="Restaurar gráfico por defecto"
            >
              <X className="size-3.5" />
              Restaurar
            </button>
          )}
        </div>

        {currentChartNote && (
          <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            {currentChartNote}
          </p>
        )}
        {chartError && (
          <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {chartError}
          </p>
        )}

        {showGeneratedChart ? (
          <DynamicMainChart result={currentChart} />
        ) : (
          <MainTrendChart series={mainSeries} />
        )}
      </section>

      {/* Two smaller charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section
          data-chart="categorias"
          className={cn(
            "rounded-xl border bg-card p-5 shadow-sm transition-all duration-700",
            highlight?.key === "categorias" &&
              "border-emerald-400/70 ring-2 ring-emerald-400/40"
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <PieChart className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Ventas por categoría</h3>
          </div>
          <CategoryPieChart
            series={categorySeries}
            activeKey={filters.category}
          />
        </section>

        <section
          data-chart="top-productos"
          className={cn(
            "rounded-xl border bg-card p-5 shadow-sm transition-all duration-700",
            highlight?.key === "top-productos" &&
              "border-emerald-400/70 ring-2 ring-emerald-400/40"
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Top productos</h3>
          </div>
          <TopProductsBarChart
            series={{ name: "Top productos", data: topSeries }}
            activeKey={filters.category}
          />
        </section>
      </div>

      {/* Filtros */}
      <DashboardFilters
        categories={dashboard.filters.categories}
        months={dashboard.filters.months}
        value={filters}
        onChange={setFilters}
      />

      {/* Tabla */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Table2 className="size-4" />
          Productos destacados
          {filters.category && (
            <span className="text-xs text-muted-foreground">
              (filtrado: {filters.category})
            </span>
          )}
        </div>
        <TopProductsTable
          rows={filters.category
            ? dashboard.topProducts.filter((p) => p.categoria === filters.category)
            : dashboard.topProducts}
        />
      </section>
    </div>
  );
}
