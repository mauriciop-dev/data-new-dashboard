"use client";

import { DollarSign, ShoppingCart, Ticket } from "lucide-react";
import { useSalesData } from "@/lib/use-sales-data";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const icons = [DollarSign, ShoppingCart, Ticket];

export default function SalesKPIs() {
  const state = useSalesData();

  if (state.status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
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
      icon: DollarSign,
    },
    {
      label: "Total de órdenes",
      value: metrics.totalOrders.toLocaleString("en-US"),
      sub: `${metrics.totalItems} productos únicos`,
      icon: ShoppingCart,
    },
    {
      label: "Ticket promedio",
      value: formatMoney(metrics.avgTicket),
      sub: `${metrics.totalProductsSold} unidades vendidas`,
      icon: Ticket,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </p>
            <span className="rounded-md bg-muted p-1.5 text-muted-foreground">
              <kpi.icon className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {kpi.value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
        </div>
      ))}
    </div>
  );
}
