import {
  fetchSalesMetrics,
  fetchSalesByMonth,
  fetchSalesByCategory,
  fetchTopProducts,
  fetchRecentOrders,
  fetchFilterOptions,
} from "@/lib/turso";

export async function GET() {
  try {
    const [
      metrics,
      monthly,
      byCategory,
      topProducts,
      recentOrders,
      filters,
    ] = await Promise.all([
      fetchSalesMetrics(),
      fetchSalesByMonth(),
      fetchSalesByCategory(),
      fetchTopProducts(8),
      fetchRecentOrders(10),
      fetchFilterOptions(),
    ]);
    return Response.json({
      metrics,
      monthly,
      byCategory,
      topProducts,
      recentOrders,
      filters,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al consultar Turso";
    return Response.json({ error: message }, { status: 500 });
  }
}
