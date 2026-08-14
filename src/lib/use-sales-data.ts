"use client";

import { useEffect, useState } from "react";
import { fetchSalesData, type SalesData } from "./sales";

type SalesState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: SalesData };

export function useSalesData() {
  const [state, setState] = useState<SalesState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchSalesData().then((result) => {
      if (cancelled) return;

      if (result.state === "success") {
        setState({ status: "success", data: result.data });
      } else if (result.state === "error") {
        setState({ status: "error", error: result.error });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}