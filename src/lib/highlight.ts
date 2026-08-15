import type { DashboardHighlight } from "@/lib/dashboard-store";
import type { ToolResult } from "@/lib/use-live-voice";

/**
 * Infiere qué elemento del dashboard se está referenciando a partir de
 * una consulta SQL generada por voz/texto, para poder resaltarlo en pantalla.
 */
export function inferHighlight(result: ToolResult): DashboardHighlight {
  const sql = (result.sql ?? "").toLowerCase();

  // Métricas
  if (/count\s*\(\s*distinct\s+cart_id|ventas totales|total_orders/.test(sql) &&
      /substr\(date|group by month/.test(sql) === false) {
    return { key: "ordenes", label: "Total de órdenes", type: "kpi" };
  }
  if (/sum\(quantity\)/.test(sql) && !/group by title/.test(sql)) {
    return { key: "unidades", label: "Unidades vendidas", type: "kpi" };
  }
  if (/substr\(date,\s*1,\s*7\)|by mes|group by month/.test(sql) ||
      /substr\(date,\s*1,\s*10\)/.test(sql)) {
    return { key: "main", label: "Ventas por mes", type: "chart" };
  }
  if (/categoria/i.test(sql) || /left join categorias/i.test(sql)) {
    return { key: "categorias", label: "Ventas por categoría", type: "chart" };
  }
  if (/group by title/.test(sql) || /top productos/.test(sql)) {
    return {
      key: "top-productos",
      label: "Top productos",
      type: "chart",
    };
  }

  return null;
}

export function chartNoteFromResult(result: ToolResult): string {
  const rows = result.rows ?? [];
  if (!rows.length) return "";
  const sql = result.sql.toLowerCase();
  if (/group by title/.test(sql)) {
    const top = rows[0];
    const label = Object.values(top ?? {}).find((v) => typeof v === "string");
    const val = Object.values(top ?? {}).find((v) => typeof v === "number");
    if (label !== undefined && val !== undefined) {
      return `El producto líder es «${label}» con ${val} en ventas.`;
    }
  }
  if (/categoria/i.test(sql)) {
    const top = rows[0];
    const label = Object.values(top ?? {}).find((v) => typeof v === "string");
    return label ? `La categoría líder es «${label}».` : "";
  }
  return "";
}
