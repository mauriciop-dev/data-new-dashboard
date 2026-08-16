"use client";

import { useEffect } from "react";
import { useDashboard } from "./dashboard-store";
import type { DashboardMetric, DashboardData } from "./dashboard-store";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function normalizeDashboard(raw: {
  metrics?: {
    totalSales?: number;
    totalDiscountedSales?: number;
    totalOrders?: number;
    avgTicket?: number;
    totalProductsSold?: number;
    totalItems?: number;
  };
  monthly?: { month: string; total: number; orders: number }[];
  byCategory?: { categoria: string; units: number; orders: number; total: number }[];
  topProducts?: {
    product_id: number;
    title: string;
    categoria: string;
    units: number;
    orders: number;
    total: number;
    thumbnail: string;
  }[];
  recentOrders?: {
    cart_id: number;
    date: string;
    user_id: number;
    title: string;
    quantity: number;
    total: number;
    thumbnail: string;
  }[];
  filters?: { categories: string[]; months: string[] };
}): DashboardData {
  const m = raw.metrics ?? {};
  const metrics: DashboardMetric[] = [
    {
      key: "ventas",
      label: "Ventas totales",
      value: m.totalSales ?? 0,
      money: true,
      sub: `${formatMoney(m.totalDiscountedSales ?? 0)} después de descuentos`,
      icon: "dollars",
    },
    {
      key: "ordenes",
      label: "Total de órdenes",
      value: m.totalOrders ?? 0,
      money: false,
      sub: `${m.totalItems ?? 0} ítems vendidos`,
      icon: "cart",
    },
    {
      key: "ticket",
      label: "Ticket promedio",
      value: m.avgTicket ?? 0,
      money: true,
      sub: `${m.totalProductsSold ?? 0} unidades vendidas`,
      icon: "ticket",
    },
    {
      key: "unidades",
      label: "Unidades vendidas",
      value: m.totalProductsSold ?? 0,
      money: false,
      sub: `${m.totalOrders ?? 0} pedidos en total`,
      icon: "box",
    },
  ];

  const mainSeries = {
    name: "Ventas por mes",
    data: (raw.monthly ?? []).map((r) => ({
      month: r.month,
      Ventas: r.total,
      Pedidos: r.orders,
    })),
  };

  const categorySeries = {
    name: "Ventas por categoría",
    data: (raw.byCategory ?? []).map((r) => ({
      categoria: r.categoria,
      Ventas: r.total,
    })),
  };

  return {
    metrics,
    mainSeries,
    categorySeries,
    topProducts: raw.topProducts ?? [],
    recentOrders: raw.recentOrders ?? [],
    filters: {
      categories: raw.filters?.categories ?? [],
      months: raw.filters?.months ?? [],
    },
    fetchedAt: new Date().toISOString(),
  };
}

export function useDashboardData(filters?: { category: string | null; month: string | null }) {
  const { dashboard, setDashboard, setDashboardError } = useDashboard();

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.month) params.set("month", filters.month);
    const url = `/api/dashboard${params.toString() ? `?${params.toString()}` : ""}`;

    fetch(url, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((j) => {
            throw new Error(j?.error ?? `HTTP ${res.status}`);
          });
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setDashboard(normalizeDashboard(json));
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Error al cargar datos";
        setDashboardError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [setDashboard, setDashboardError, filters?.category, filters?.month]);

  return { dashboard };
}
