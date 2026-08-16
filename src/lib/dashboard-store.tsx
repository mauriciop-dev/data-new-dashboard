"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ToolResult } from "@/lib/use-live-voice";
import { inferBackgroundTheme } from "@/lib/highlight";

export type DashboardHighlight = {
  key: string;
  label: string;
  type: "kpi" | "chart" | "table";
} | null;

export type BackgroundTheme =
  | "default"
  | "ventas"
  | "productos"
  | "categorias"
  | "ordenes";

interface DashboardStore {
  dashboard: DashboardData | null;
  dashboardError: string | null;
  chartError: string | null;
  loading: boolean;
  currentChart: ToolResult | null;
  currentChartNote: string | null;
  highlight: DashboardHighlight;
  theme: BackgroundTheme;
  setTheme: (t: BackgroundTheme) => void;
  setCurrentChart: (
    result: ToolResult | null,
    note?: string | null
  ) => void;
  setHighlight: (h: DashboardHighlight) => void;
  setDashboard: (d: DashboardData | null) => void;
  setDashboardError: (e: string | null) => void;
  setChartError: (e: string | null) => void;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  money: boolean;
  sub: string;
  icon: string;
}

export interface ChartSeries {
  name: string;
  data: Record<string, string | number>[];
}

export interface DashboardData {
  metrics: DashboardMetric[];
  mainSeries: ChartSeries;
  categorySeries: ChartSeries;
  topProducts: TopProductRow[];
  recentOrders: RecentOrderRow[];
  filters: { categories: string[]; months: string[] };
  fetchedAt: string;
}

export interface TopProductRow {
  product_id: number;
  title: string;
  categoria: string;
  units: number;
  orders: number;
  total: number;
  thumbnail: string;
}

export interface RecentOrderRow {
  cart_id: number;
  date: string;
  user_id: number;
  title: string;
  quantity: number;
  total: number;
  thumbnail: string;
}

const DashboardContext = createContext<DashboardStore | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [currentChart, setCurrentChart] = useState<ToolResult | null>(null);
  const [currentChartNote, setCurrentChartNote] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<DashboardHighlight>(null);
  const [theme, setTheme] = useState<BackgroundTheme>("default");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publishChart = useCallback(
    (result: ToolResult | null, note?: string | null) => {
      setCurrentChart(result);
      setCurrentChartNote(note ?? null);
      if (result) {
        setTheme(inferBackgroundTheme(result));
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (highlight) setHighlight(null);
    },
    [highlight]
  );

  const publishHighlight = useCallback((h: DashboardHighlight) => {
    setHighlight(h);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (h) {
      timerRef.current = setTimeout(() => setHighlight(null), 6000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        dashboard,
        dashboardError,
        chartError,
        loading: !dashboard && !dashboardError,
        currentChart,
        currentChartNote,
        highlight,
        theme,
        setTheme,
        setCurrentChart: publishChart,
        setHighlight: publishHighlight,
        setDashboard,
        setDashboardError,
        setChartError,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardStore {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard debe usarse dentro de DashboardProvider");
  }
  return ctx;
}
