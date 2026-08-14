import {
  fetchSalesByMonth,
  fetchSalesMetrics,
} from "@/lib/turso";

export async function GET() {
  try {
    const [metrics, monthly] = await Promise.all([
      fetchSalesMetrics(),
      fetchSalesByMonth(),
    ]);
    return Response.json({
      metrics,
      monthly,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error desconocido al consultar Turso";
    return Response.json({ error: message }, { status: 500 });
  }
}