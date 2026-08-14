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

export interface SalesData {
  metrics: SalesMetrics;
  monthly: SalesByMonth[];
  fetchedAt: string;
}

type SalesResult =
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "success"; data: SalesData };

export async function fetchSalesData(): Promise<SalesResult> {
  try {
    const res = await fetch("/api/sales", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Error consultando el API: HTTP ${res.status}`);
    }
    const json = await res.json();
    if (json.error) {
      throw new Error(json.error);
    }
    return { state: "success", data: json };
  } catch (err) {
    return {
      state: "error",
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}