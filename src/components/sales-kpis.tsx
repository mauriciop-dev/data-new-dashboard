"use client";

import { useSalesData } from "@/lib/use-sales-data";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export default function SalesKPIs() {
  const state = useSalesData();

  if (state.status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <p className="font-semibold text-destructive">Error al cargar los datos</p>
        <p className="mt-1 text-sm text-muted-foreground">{state.error}</p>
      </div>
    );
  }

  const { metrics } = state.data;

  const kpis = [
    {
      label: "Ventas totales",
      value: formatMoney(metrics.totalSales),
      sub: `${formatMoney(metrics.totalDiscountedSales)} después de descuentos`,
    },
    {
      label: "Total de órdenes",
      value: metrics.totalOrders.toLocaleString("en-US"),
      sub: `${metrics.totalItems} productos únicos`,
    },
    {
      label: "Ticket promedio",
      value: formatMoney(metrics.avgTicket),
      sub: `${metrics.totalProductsSold} unidades vendidas`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-lg border bg-card p-6 shadow-sm"
        >
          <p className="text-sm font-medium text-muted-foreground">
            {kpi.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {kpi.value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
        </div>
      ))}
    </div>
  );
}