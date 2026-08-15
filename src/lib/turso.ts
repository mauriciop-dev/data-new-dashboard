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

export interface SalesByCategory {
  categoria: string;
  units: number;
  orders: number;
  total: number;
}

export async function fetchSalesByCategory(): Promise<SalesByCategory[]> {
  const db = getDb();
  const res = await db.execute(`
    SELECT
      COALESCE(c.categoria, 'Otros') AS categoria,
      SUM(v.quantity) AS units,
      COUNT(DISTINCT v.cart_id) AS orders,
      ROUND(SUM(v.total), 2) AS total
    FROM ventas v
    LEFT JOIN categorias c ON c.product_id = v.product_id
    GROUP BY categoria
    ORDER BY total DESC
  `);
  return res.rows.map((r) => {
    const row = r as unknown as Record<string, number | string>;
    return {
      categoria: String(row.categoria ?? "Otros"),
      units: Number(row.units ?? 0),
      orders: Number(row.orders ?? 0),
      total: Number(row.total ?? 0),
    };
  });
}

export interface TopProduct {
  product_id: number;
  title: string;
  categoria: string;
  units: number;
  orders: number;
  total: number;
  thumbnail: string;
}

export async function fetchTopProducts(limit = 8): Promise<TopProduct[]> {
  const db = getDb();
  const res = await db.execute({
    sql: `SELECT
      v.product_id,
      MAX(v.title) AS title,
      COALESCE(MAX(c.categoria), 'Otros') AS categoria,
      SUM(v.quantity) AS units,
      COUNT(DISTINCT v.cart_id) AS orders,
      ROUND(SUM(v.total), 2) AS total,
      MAX(v.thumbnail) AS thumbnail
    FROM ventas v
    LEFT JOIN categorias c ON c.product_id = v.product_id
    GROUP BY v.product_id
    ORDER BY total DESC
    LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => {
    const row = r as unknown as Record<string, number | string | null>;
    return {
      product_id: Number(row.product_id),
      title: String(row.title ?? ""),
      categoria: String(row.categoria ?? "Otros"),
      units: Number(row.units ?? 0),
      orders: Number(row.orders ?? 0),
      total: Number(row.total ?? 0),
      thumbnail: String(row.thumbnail ?? ""),
    };
  });
}

export interface RecentOrder {
  cart_id: number;
  date: string;
  user_id: number;
  title: string;
  quantity: number;
  total: number;
  thumbnail: string;
}

export async function fetchRecentOrders(limit = 10): Promise<RecentOrder[]> {
  const db = getDb();
  const res = await db.execute({
    sql: `SELECT
      v.cart_id,
      v.date,
      v.user_id,
      v.title,
      v.quantity,
      ROUND(v.total, 2) AS total,
      v.thumbnail
    FROM ventas v
    ORDER BY v.date DESC, v.cart_id DESC
    LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => {
    const row = r as unknown as Record<string, number | string>;
    return {
      cart_id: Number(row.cart_id),
      date: String(row.date),
      user_id: Number(row.user_id),
      title: String(row.title),
      quantity: Number(row.quantity),
      total: Number(row.total),
      thumbnail: String(row.thumbnail ?? ""),
    };
  });
}

export async function fetchFilterOptions() {
  const db = getDb();
  const [cats, months] = await Promise.all([
    db.execute(
      `SELECT DISTINCT categoria FROM categorias ORDER BY categoria`
    ),
    db.execute(
      `SELECT DISTINCT substr(date, 1, 7) AS m FROM ventas ORDER BY m`
    ),
  ]);
  return {
    categories: (
      cats.rows as unknown as Record<string, string>[]
    ).map((r) => r.categoria),
    months: (months.rows as unknown as Record<string, string>[]).map(
      (r) => r.m
    ),
  };
}