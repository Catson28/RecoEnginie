"use client";

import useSWR from "swr";
import { getOpenItems, getOpenItemStats } from "@/lib/api";

export function useOpenItems(params?: {
  run_id?:      string;
  item_type?:   string;
  is_resolved?: boolean;
  limit?:       number;
}) {
  const key = `/open-items?${JSON.stringify(params ?? {})}`;
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => getOpenItems(params),
    { refreshInterval: 10000 }
  );
  return { data, error, isLoading, mutate };
}

export function useOpenItemStats(runId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/open-items/stats?run=${runId ?? "all"}`,
    () => getOpenItemStats(runId),
    { refreshInterval: 10000 }
  );
  return { stats: data, error, isLoading, mutate };
}
