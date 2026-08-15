"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ToolResult } from "@/lib/use-live-voice";

const COLORS = [
  "hsl(221 83% 53%)",
  "hsl(160 84% 39%)",
  "hsl(30 100% 50%)",
  "hsl(262 83% 58%)",
  "hsl(340 82% 52%)",
];

function isNumericCol(rows: Record<string, unknown>[], key: string): boolean {
  return rows.some((r) => typeof r[key] === "number");
}

export default function DynamicChart({ result }: { result: ToolResult }) {
  const graph = useMemo(() => {
    const { cols, rows } = result;
    if (!rows.length) return null;

    const numericCols = cols.filter((c) => isNumericCol(rows, c));
    const labelCol = cols.find((c) => !isNumericCol(rows, c)) ?? cols[0];

    // Si hay pocas filas y una proporción, Pie; si dominan texto+un numerico, Bar; si hay serie de tiempo (label tipo mes/año), Line
    const looksLikeDate =
      labelCol !== undefined &&
      rows.some((r) => /^\d{4}-\d{2}/.test(String(r[labelCol] ?? "")));

    let type: "line" | "bar" | "pie" = looksLikeDate ? "line" : "bar";

    // Pie si hay una columna de proporción o un numero dominante y pocas filas
    if (rows.length <= 8 && numericCols.length === 1 && !looksLikeDate) {
      type = "pie";
    }

    return { type, cols, rows, numericCols, labelCol, chartTitle: sqlTitle(result.sql) };
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
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{graph.chartTitle}</h2>
        <span className="text-xs text-muted-foreground">{rows.length} resultados</span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer
          key={`${type}-${rows.length}-${String(rows[0]?.[labelCol] ?? "")}`}
          width="100%"
          height="100%"
        >
          {type === "pie" ? (
            <PieChart>
              <Pie
                data={rows}
                dataKey={valueKey}
                nameKey={labelCol}
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(p: unknown) =>
                  String((p as Record<string, unknown>)[labelCol] ?? "")
                }
              >
                {rows.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : type === "line" ? (
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={labelCol}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => String(v ?? "")}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={labelCol} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
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
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean;
}