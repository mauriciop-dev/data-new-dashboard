"use client";

import Image from "next/image";
import { useDashboard, type TopProductRow, type RecentOrderRow } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function TopProductsTable({
  rows,
  isLoading,
}: {
  rows: TopProductRow[];
  isLoading?: boolean;
}) {
  const { highlight } = useDashboard();
  if (isLoading) {
    return (
      <div className="h-72 animate-pulse rounded-lg border bg-card" />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card" data-table="productos">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Producto</th>
              <th className="px-3 py-2.5 font-medium">Categoría</th>
              <th className="px-3 py-2.5 text-right font-medium">Unds</th>
              <th className="px-3 py-2.5 text-right font-medium">Ventas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = highlight?.key === String(row.product_id);
              return (
                <tr
                  key={row.product_id}
                  className={cn(
                    "border-b last:border-0 transition-colors",
                    active
                      ? "bg-emerald-400/10 ring-1 ring-inset ring-emerald-400/50"
                      : "hover:bg-muted/40"
                  )}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Image
                        src={row.thumbnail}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 shrink-0 rounded-md object-cover"
                      />
                      <span className="line-clamp-1 max-w-[180px] font-medium">
                        {row.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.categoria}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.units.toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatMoney(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RecentOrdersTable({
  rows,
  isLoading,
}: {
  rows: RecentOrderRow[];
  isLoading?: boolean;
}) {
  const { highlight } = useDashboard();
  if (isLoading) {
    return <div className="h-60 animate-pulse rounded-lg border bg-card" />;
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card" data-table="pedidos">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Pedido</th>
              <th className="px-3 py-2.5 font-medium">Producto</th>
              <th className="px-3 py-2.5 text-right font-medium">Qty</th>
              <th className="px-3 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = highlight?.key === String(row.cart_id);
              return (
                <tr
                  key={`${row.cart_id}-${row.title}`}
                  className={cn(
                    "border-b last:border-0 transition-colors",
                    active
                      ? "bg-emerald-400/10 ring-1 ring-inset ring-emerald-400/50"
                      : "hover:bg-muted/40"
                  )}
                >
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    #{row.cart_id}
                    <span className="block text-[10px]">{row.date}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="line-clamp-1 max-w-[160px]">{row.title}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.quantity}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatMoney(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
