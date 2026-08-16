"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { ChartSeries } from "@/lib/dashboard-store";
import type { ToolResult } from "@/lib/use-live-voice";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(221 83% 53%)",
  "hsl(160 84% 39%)",
  "hsl(30 100% 50%)",
  "hsl(262 83% 58%)",
  "hsl(340 82% 52%)",
  "hsl(199 89% 48%)",
  "hsl(142 71% 45%)",
  "hsl(0 72% 51%)",
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const fmtTick = (v: unknown) => (typeof v === "number" ? formatMoney(v) : String(v));

function isNumericCol(rows: Record<string, unknown>[], key: string): boolean {
  return rows.some((r) => typeof r[key] === "number");
}

export function MainTrendChart({
  series,
  activeKey,
}: { series: ChartSeries; activeKey?: string | null }) {
  const keys = Object.keys(series.data[0] ?? {}).filter(
    (k) => k !== "month" && k !== "name"
  );

  const renderDot = (props: any) => {
    const isActive = activeKey && props.payload?.month === activeKey;
    return (
      <circle
        cx={props.cx}
        cy={props.cy}
        r={isActive ? 6 : 3}
        stroke={isActive ? "hsl(160 84% 39%)" : props.stroke}
        strokeWidth={isActive ? 3 : 0}
        fill="white"
      />
    );
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series.data}>
          <defs>
            <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(221 83% 53%)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
          />
          <Tooltip formatter={(v: unknown) => fmtTick(v)} />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              fill={k === "Ventas" ? "url(#gradSales)" : "transparent"}
              fillOpacity={k === "Ventas" ? 1 : 0}
              dot={renderDot}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPieChart({
  series,
  activeKey,
}: {
  series: ChartSeries;
  activeKey?: string | null;
}) {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={series.data}
            dataKey="Ventas"
            nameKey="categoria"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {series.data.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                opacity={
                  activeKey && series.data[i]?.categoria !== activeKey
                    ? 0.3
                    : 1
                }
              />
            ))}
          </Pie>
          <Tooltip formatter={(v: unknown) => fmtTick(v)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsBarChart({
  series,
  activeKey,
}: {
  series: ChartSeries;
  activeKey?: string | null;
}) {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series.data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="hsl(var(--border))"
          />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="title"
            width={110}
            tick={{ fontSize: 10 }}
          />
          <Tooltip formatter={(v: unknown) => fmtTick(v)} />
          <Bar dataKey="Ventas" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {series.data.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                opacity={
                  activeKey && series.data[i]?.title !== activeKey ? 0.3 : 1
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DynamicMainChart({
  result,
  className,
}: {
  result: ToolResult;
  className?: string;
}) {
  const graph = useMemo(() => {
    const { cols, rows } = result;
    if (!rows.length) return null;
    const numericCols = cols.filter((c) => isNumericCol(rows, c));
    const labelCol = cols.find((c) => !isNumericCol(rows, c)) ?? cols[0];
    const looksLikeDate =
      labelCol !== undefined &&
      rows.some((r) => /^\d{4}-\d{2}/.test(String(r[labelCol] ?? "")));
    let type: "line" | "bar" | "pie" = looksLikeDate ? "line" : "bar";
    if (rows.length <= 8 && numericCols.length === 1 && !looksLikeDate) {
      type = "pie";
    }
    return { type, rows, numericCols, labelCol, chartTitle: sqlTitle(result.sql) };
  }, [result]);

  if (!graph) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Sin filas para graficar.
      </div>
    );
  }

  const { type, rows, numericCols, labelCol } = graph;
  const valueKey = numericCols[0];

  return (
    <div className={cn("h-full w-full", className)}>
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "pie" ? (
            <PieChart>
              <Pie
                data={rows}
                dataKey={valueKey}
                nameKey={labelCol}
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={(p: unknown) =>
                  String((p as Record<string, unknown>)[labelCol] ?? "")
                }
                isAnimationActive={false}
              >
                {rows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: unknown) => fmtTick(v)} />
            </PieChart>
          ) : type === "line" ? (
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey={labelCol}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => String(v ?? "")}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => fmtTick(v)} />
              {numericCols.map((c, i) => (
                <Line
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={labelCol} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => fmtTick(v)} />
              {numericCols.map((c, i) => (
                <Bar
                  key={c}
                  dataKey={c}
                  fill={COLORS[i % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function sqlTitle(sql: string): string {
  const clean = sql.replace(/\s+/g, " ").trim();
  return clean.length > 70 ? clean.slice(0, 67) + "…" : clean;
}

export { COLORS };
