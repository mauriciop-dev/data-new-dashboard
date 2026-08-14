const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

export interface SalesRow {
  id: string;
  cart_id: number;
  product_rank: number;
  product_id: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
  discount_percentage: number;
  discounted_total: number;
  thumbnail: string;
  cart_total: number;
  cart_discounted_total: number;
  user_id: number;
  total_products: number;
  total_quantity: number;
  date: string;
}

export interface SalesMetrics {
  totalSales: number;
  totalDiscountedSales: number;
  totalOrders: number;
  avgTicket: number;
  totalProductsSold: number;
  totalItems: number;
}

export interface SalesData {
  rows: SalesRow[];
  metrics: SalesMetrics;
  total: number;
  fetchedAt: string;
}

type SalesResult =
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "success"; data: SalesData };

export async function fetchSalesData(): Promise<SalesResult> {
  try {
    const res = await fetch(
      `${PB_URL}/api/collections/ventas/records?perPage=200`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Error de conexión con PocketBase: HTTP ${res.status}`);
    }

    const raw = await res.json();
    const rows: SalesRow[] = raw.items ?? [];

    // Distintas órdenes = distintos cart_id
    const cartIds = new Set(rows.map((r) => r.cart_id));
    const totalOrders = cartIds.size;

    // Ventas totales: suma del total por item (equivale a la suma de cart.total)
    const totalSales = rows.reduce((s, r) => s + r.total, 0);
    const totalDiscountedSales = rows.reduce(
      (s, r) => s + r.discounted_total,
      0
    );
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalProductsSold = rows.reduce((s, r) => s + r.quantity, 0);
    const totalItems = rows.length;

    const metrics: SalesMetrics = {
      totalSales,
      totalDiscountedSales,
      totalOrders,
      avgTicket,
      totalProductsSold,
      totalItems,
    };

    return {
      state: "success",
      data: { rows, metrics, total: raw.totalItems ?? rows.length, fetchedAt: new Date().toISOString() },
    };
  } catch (err) {
    return {
      state: "error",
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}