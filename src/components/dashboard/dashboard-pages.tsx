"use client";

import { BarChart3, Package, ShoppingCart, Table2, X } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-store";
import {
  MainTrendChart,
  CategoryPieChart,
  TopProductsBarChart,
  DynamicMainChart,
} from "./charts";
import { TopProductsTable, RecentOrdersTable } from "./data-tables";
import { cn } from "@/lib/utils";

function Panel({
  children,
  className,
  title,
  icon,
  actions,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card/70 backdrop-blur-xl shadow-sm",
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 border-b px-4 py-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
          {actions && <div className="ml-auto">{actions}</div>}
        </div>
      )}
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </section>
  );
}

// Página 1 — Resumen (KPIs + ventas por mes + categorías + top productos)
function ResumenPage() {
  const {
    dashboard,
    highlight,
    currentChart,
    currentChartNote,
    chartError,
    setCurrentChart,
  } = useDashboard();
  if (!dashboard) return null;

  return (
    <div className="grid h-full min-h-0 grid-cols-3 grid-rows-2 gap-3">
      <Panel
        title={currentChart ? "Gráfico generado" : "Ventas por mes"}
        icon={<BarChart3 className="size-4 text-muted-foreground" />}
        className={cn(
          "col-span-2 row-span-2",
          highlight?.key === "main" &&
            highlight.type === "chart" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
        actions={
          currentChart ? (
            <button
              onClick={() => setCurrentChart(null)}
              aria-label="Restaurar gráfica por defecto"
              className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/70"
            >
              <X className="size-3.5" />
              Restaurar
            </button>
          ) : undefined
        }
      >
        {currentChartNote && (
          <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {currentChartNote}
          </p>
        )}
        {chartError && (
          <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
            {chartError}
          </p>
        )}
        <div className="h-full min-h-0">
          {currentChart ? (
            <DynamicMainChart result={currentChart} />
          ) : (
            <MainTrendChart series={dashboard.mainSeries} activeKey={null} />
          )}
        </div>
      </Panel>

      <Panel
        title="Ventas por categoría"
        icon={<BarChart3 className="size-4 text-muted-foreground" />}
        className={cn(
          highlight?.key === "categorias" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="h-full min-h-0">
          <CategoryPieChart series={dashboard.categorySeries} activeKey={null} />
        </div>
      </Panel>

      <Panel
        title="Top productos"
        icon={<BarChart3 className="size-4 text-muted-foreground" />}
        className={cn(
          highlight?.key === "top-productos" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="h-full min-h-0">
          <TopProductsBarChart
            series={{ name: "Top productos", data: dashboard.topProducts.map((p) => ({ title: p.title.length > 20 ? p.title.slice(0, 19) + "…" : p.title, Ventas: p.total })) }}
            activeKey={null}
          />
        </div>
      </Panel>
    </div>
  );
}

// Página 2 — Productos (tabla + barras + categorías)
function ProductosPage() {
  const { dashboard, highlight } = useDashboard();
  if (!dashboard) return null;

  return (
    <div className="grid h-full min-h-0 grid-cols-3 grid-rows-2 gap-3">
      <Panel
        title="Productos destacados"
        icon={<Package className="size-4 text-muted-foreground" />}
        className={cn(
          "col-span-2 row-span-2",
          highlight?.key === "top-productos" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="h-full min-h-0 overflow-y-auto">
          <TopProductsTable rows={dashboard.topProducts} className="h-full" />
        </div>
      </Panel>

      <Panel
        title="Top productos"
        icon={<BarChart3 className="size-4 text-muted-foreground" />}
        className={cn(
          highlight?.key === "top-productos" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="h-full min-h-0">
          <TopProductsBarChart
            series={{ name: "Top productos", data: dashboard.topProducts.map((p) => ({ title: p.title.length > 16 ? p.title.slice(0, 15) + "…" : p.title, Ventas: p.total })) }}
            activeKey={null}
          />
        </div>
      </Panel>

      <Panel
        title="Por categoría"
        icon={<BarChart3 className="size-4 text-muted-foreground" />}
        className={cn(
          highlight?.key === "categorias" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="h-full min-h-0">
          <CategoryPieChart series={dashboard.categorySeries} activeKey={null} />
        </div>
      </Panel>
    </div>
  );
}

// Página 3 — Órdenes (tabla de pedidos + tendencia de pedidos por mes)
function OrdenesPage() {
  const { dashboard, highlight } = useDashboard();
  if (!dashboard) return null;

  const ordersSeries = {
    name: "Pedidos por mes",
    data: dashboard.mainSeries.data.map((r) => ({
      month: r.month,
      Pedidos: r.Pedidos ?? 0,
    })),
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-3 grid-rows-2 gap-3">
      <Panel
        title="Órdenes recientes"
        icon={<ShoppingCart className="size-4 text-muted-foreground" />}
        className={cn(
          "col-span-2 row-span-2",
          highlight?.key === "ordenes" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="h-full min-h-0 overflow-y-auto">
          <RecentOrdersTable rows={dashboard.recentOrders} className="h-full" />
        </div>
      </Panel>

      <Panel
        title="Pedidos por mes"
        icon={<Table2 className="size-4 text-muted-foreground" />}
        className={cn(
          highlight?.key === "main" &&
            highlight.type === "chart" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="h-full min-h-0">
          <MainTrendChart series={ordersSeries} activeKey={null} />
        </div>
      </Panel>

      <Panel
        title="Ventas por categoría"
        icon={<BarChart3 className="size-4 text-muted-foreground" />}
        className={cn(
          highlight?.key === "categorias" &&
            "border-emerald-400/70 ring-2 ring-emerald-400/40"
        )}
      >
        <div className="h-full min-h-0">
          <CategoryPieChart series={dashboard.categorySeries} activeKey={null} />
        </div>
      </Panel>
    </div>
  );
}

export default function DashboardPages({ page }: { page: number }) {
  if (page === 0) return <ResumenPage />;
  if (page === 1) return <ProductosPage />;
  return <OrdenesPage />;
}
