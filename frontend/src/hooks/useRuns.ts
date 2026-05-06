"use client";

import useSWR from "swr";
import { getRuns, getRun, getRunLog } from "@/lib/api";

export function useRuns(limit = 20) {
  const { data, error, isLoading, mutate } = useSWR(
    `/runs?limit=${limit}`,
    () => getRuns(limit),
    { refreshInterval: 5000 }   // polling a cada 5s — detecta runs COMPLETED
  );
  return { data, error, isLoading, mutate };
}

export function useRun(runId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    runId ? `/runs/${runId}` : null,
    () => getRun(runId!),
    {
      refreshInterval: (data) =>
        data?.status === "PROCESSING" || data?.status === "PENDING" ? 2000 : 0,
    }
  );
  return { run: data, error, isLoading, mutate };
}

export function useRunLog(runId: string | null) {
  const { data, error } = useSWR(
    runId ? `/runs/${runId}/log` : null,
    () => getRunLog(runId!),
    { refreshInterval: 2000 }
  );
  return { log: data ?? [], error };
}
