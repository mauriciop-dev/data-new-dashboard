"use client";

import { DollarSign, ShoppingCart, Ticket, Package, TrendingUp } from "lucide-react";
import { useDashboard, type DashboardMetric } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof DollarSign> = {
  dollars: DollarSign,
  cart: ShoppingCart,
  ticket: Ticket,
  box: Package,
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatNum = (value: number) => value.toLocaleString("en-US");

export default function KpiCards({
  metrics,
  isLoading,
}: {
  metrics: DashboardMetric[];
  isLoading?: boolean;
}) {
  const { highlight } = useDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((kpi) => {
        const Icon = iconMap[kpi.icon] ?? DollarSign;
        const active = highlight?.key === kpi.key;
        const change = active ? 1 : kpi.key === "ventas" ? 0.12 : 0;
        return (
          <div
            key={kpi.key}
            data-kpi={kpi.key}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card/70 backdrop-blur-xl p-5 shadow-sm transition-all duration-700",
              active
                ? "border-emerald-400/70 ring-2 ring-emerald-400/40 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                : "hover:shadow-md"
            )}
          >
            {active && (
              <span className="pointer-events-none absolute inset-0 animate-pulse rounded-xl bg-emerald-400/10" />
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <span
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground transition-colors",
                  active ? "bg-emerald-400/15 text-emerald-600" : "bg-muted"
                )}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <p
              className={cn(
                "mt-2 text-3xl font-semibold tracking-tight transition-colors",
                active && "text-emerald-600"
              )}
            >
              {kpi.money ? formatMoney(kpi.value) : formatNum(kpi.value)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
            {active && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp className="size-3.5" />
                Indicador resaltado
              </p>
            )}
            {change > 0 && !active && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp className="size-3.5" /> +{Math.round(change * 100)}%
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
