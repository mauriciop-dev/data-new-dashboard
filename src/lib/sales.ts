const DUMMYJSON_URL = "https://dummyjson.com/carts?limit=100";

export interface CartProduct {
  id: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
  discountPercentage: number;
  discountedTotal: number;
  thumbnail: string;
}

export interface Cart {
  id: number;
  products: CartProduct[];
  total: number;
  discountedTotal: number;
  userId: number;
  totalProducts: number;
  totalQuantity: number;
}

export interface CartsResponse {
  carts: Cart[];
  total: number;
  skip: number;
  limit: number;
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
  carts: Cart[];
  metrics: SalesMetrics;
  fetchedAt: string;
}

type SalesResult =
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "success"; data: SalesData };

export async function fetchSalesData(): Promise<SalesResult> {
  try {
    const res = await fetch(DUMMYJSON_URL, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Error de conexión: HTTP ${res.status}`);
    }

    const raw: CartsResponse = await res.json();
    const carts = raw.carts ?? [];

    const totalSales = raw.carts.reduce((sum, c) => sum + c.total, 0);
    const totalDiscountedSales = raw.carts.reduce(
      (sum, c) => sum + c.discountedTotal,
      0
    );
    const totalOrders = raw.carts.length;
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalItems = raw.carts.reduce((sum, c) => sum + c.totalProducts, 0);
    const totalProductsSold = raw.carts.reduce(
      (sum, c) => sum + c.totalQuantity,
      0
    );

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
      data: { carts, metrics, fetchedAt: new Date().toISOString() },
    };
  } catch (err) {
    return {
      state: "error",
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}