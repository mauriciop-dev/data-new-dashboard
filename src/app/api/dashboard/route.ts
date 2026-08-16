import {
  fetchSalesMetrics,
  fetchSalesByMonth,
  fetchSalesByCategory,
  fetchTopProducts,
  fetchRecentOrders,
  fetchFilterOptions,
} from "@/lib/turso";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const month = searchParams.get("month") || undefined;

    const [
      metrics,
      monthly,
      byCategory,
      topProducts,
      recentOrders,
      filters,
    ] = await Promise.all([
      fetchSalesMetrics(category, month),
      fetchSalesByMonth(category),
      fetchSalesByCategory(month),
      fetchTopProducts(20, category, month),
      fetchRecentOrders(20, category, month),
      fetchFilterOptions(),
    ]);
    return Response.json({
      metrics,
      monthly,
      byCategory,
      topProducts,
      recentOrders,
      filters,
      appliedFilters: { category, month },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al consultar Turso";
    return Response.json({ error: message }, { status: 500 });
  }
}
