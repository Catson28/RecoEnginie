"use client";

import useSWR from "swr";
import { getMatches, getMatchSummary } from "@/lib/api";

export function useMatches(
  runId: string | null,
  matchType?: string,
  limit = 100
) {
  const key = runId
    ? `/matching/${runId}?type=${matchType ?? "all"}&limit=${limit}`
    : null;
  const { data, error, isLoading } = useSWR(
    key,
    () => getMatches(runId!, matchType, limit)
  );
  return { data, error, isLoading };
}

export function useMatchSummary(runId: string | null) {
  const { data, error, isLoading } = useSWR(
    runId ? `/matching/${runId}/summary` : null,
    () => getMatchSummary(runId!)
  );
  return { summary: data, error, isLoading };
}
