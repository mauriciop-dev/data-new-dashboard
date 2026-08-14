import { createClient, type Client } from "@libsql/client";

let cachedClient: Client | null = null;

export function getDb(): Client {
  if (cachedClient) return cachedClient;
  const url =
    process.env.TURSO_DATABASE_URL ||
    "libsql://data-ia-mauriciop-dev.aws-us-east-1.turso.io";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!authToken) {
    throw new Error("Falta TURSO_AUTH_TOKEN en las variables de entorno");
  }
  cachedClient = createClient({ url, authToken });
  return cachedClient;
}

export interface SalesMetrics {
  totalSales: number;
  totalDiscountedSales: number;
  totalOrders: number;
  avgTicket: number;
  totalProductsSold: number;
  totalItems: number;
}

export interface SalesByMonth {
  month: string;
  total: number;
  orders: number;
}

export async function fetchSalesMetrics(): Promise<SalesMetrics> {
  const db = getDb();
  const res = await db.execute(`
    SELECT
      ROUND(SUM(total), 2) AS total_sales,
      ROUND(SUM(discounted_total), 2) AS total_discounted_sales,
      COUNT(DISTINCT cart_id) AS total_orders,
      ROUND(SUM(quantity)) AS total_products_sold,
      COUNT(*) AS total_items
    FROM ventas
  `);
  const row = res.rows[0] as unknown as Record<string, number>;
  const totalSales = Number(row.total_sales ?? 0);
  const totalOrders = Number(row.total_orders ?? 0);
  return {
    totalSales,
    totalDiscountedSales: Number(row.total_discounted_sales ?? 0),
    totalOrders,
    avgTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
    totalProductsSold: Number(row.total_products_sold ?? 0),
    totalItems: Number(row.total_items ?? 0),
  };
}

export async function fetchSalesByMonth(): Promise<SalesByMonth[]> {
  const db = getDb();
  const res = await db.execute(`
    SELECT
      substr(date, 1, 7) AS month,
      ROUND(SUM(total), 2) AS total,
      COUNT(DISTINCT cart_id) AS orders
    FROM ventas
    GROUP BY month
    ORDER BY month
  `);
  return res.rows.map((r) => {
    const row = r as unknown as Record<string, number | string>;
    return {
      month: String(row.month),
      total: Number(row.total ?? 0),
      orders: Number(row.orders ?? 0),
    };
  });
}