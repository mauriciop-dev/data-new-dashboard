"use client";

import { Calendar, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";

export interface DashboardFilters {
  category: string | null;
  month: string | null;
}

export default function DashboardFilters({
  categories,
  months,
  value,
  onChange,
}: {
  categories: string[];
  months: string[];
  value: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
}) {
  const { setHighlight } = useDashboard();

  const toggle = (
    key: "category" | "month",
    v: string,
    current: string | null
  ) => {
    const next = current === v ? null : v;
    onChange({ ...value, [key]: next });
    setHighlight(
      next
        ? { key: next, label: next, type: "chart" }
        : null
    );
  };

  const clear = () => {
    onChange({ category: null, month: null });
    setHighlight(null);
  };

  const active = value.category ?? value.month ?? null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SlidersHorizontal className="size-4" />
        <span className="font-medium">Filtros</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-1.5">
        <span className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">
          Categoría
        </span>
        <button
          onClick={() => onChange({ ...value, category: null })}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition",
            value.category === null
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Todas
        </button>
        {categories.slice(0, 12).map((c) => (
          <button
            key={c}
            onClick={() => toggle("category", c, value.category)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition",
              value.category === c
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card p-1.5">
        <span className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <Calendar className="mr-1 inline size-3" />
          Mes
        </span>
        <button
          onClick={() => onChange({ ...value, month: null })}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition",
            value.month === null
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Todos
        </button>
        {months.map((m) => (
          <button
            key={m}
            onClick={() => toggle("month", m, value.month)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition",
              value.month === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {active && (
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-md border p-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <RotateCcw className="size-3.5" />
          Limpiar
        </button>
      )}
    </div>
  );
}
