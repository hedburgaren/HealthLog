"use client";

/**
 * Everyday exertion events: read and write hooks.
 *
 * Reads unwrap the envelope through `apiGet`; every key comes from the
 * factory (`queryKeys.exertionEvents`, under the `["workouts"]` root). Every
 * write evicts the exertion bundle, which is the workouts root plus the open
 * day.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/api-fetch";
import {
  exertionDependentKeys,
  invalidateKeys,
  queryKeys,
} from "@/lib/query-keys";
import type { ExertionEventDTO } from "@/lib/exertion/shared";

export interface ExertionEventList {
  events: ExertionEventDTO[];
  limit: number;
  hasMore: boolean;
}

export interface ExertionEventCreateInput {
  label: string;
  intensity: number;
  occurredAt?: string;
  durationMin?: number | null;
  note?: string | null;
}

export interface ExertionEventUpdateInput {
  label?: string;
  occurredAt?: string;
  intensity?: number;
  durationMin?: number | null;
  note?: string | null;
}

/** Entries per request while walking a window. */
const EXERTION_EVENTS_PAGE_SIZE = 500;

/**
 * Every exertion entry inside `[from, to]` (ISO instants), newest first,
 * read page by page, the same walk `loadAcuteEvents` runs: the route answers
 * at most one page and says `hasMore`, so a long history is never cut at the
 * page cap.
 */
export async function loadExertionEvents(
  from: string,
  to: string,
  fetchPage: (url: string) => Promise<ExertionEventList> = (url) =>
    apiGet<ExertionEventList>(url),
): Promise<ExertionEventList> {
  const seen = new Set<string>();
  const events: ExertionEventDTO[] = [];
  let upTo = to;
  for (;;) {
    const params = new URLSearchParams({
      from,
      to: upTo,
      limit: String(EXERTION_EVENTS_PAGE_SIZE),
    });
    const page = await fetchPage(`/api/exertion?${params}`);
    let added = 0;
    for (const event of page.events) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      events.push(event);
      added += 1;
    }
    const oldest = page.events[page.events.length - 1];
    // A page that adds nothing (a full page of one instant) cannot move the
    // bound, so it ends the walk rather than repeating forever.
    if (!page.hasMore || !oldest || added === 0) {
      return { events, limit: EXERTION_EVENTS_PAGE_SIZE, hasMore: false };
    }
    upTo = oldest.occurredAt;
  }
}

/** Entries inside `[from, to]` (ISO instants), newest first. */
export function useExertionEvents(
  from: string | null,
  to: string | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.exertionEvents(from, to),
    enabled: options.enabled ?? true,
    queryFn: () => loadExertionEvents(from as string, to as string),
  });
}

/** Log one exertion entry. */
export function useLogExertionEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExertionEventCreateInput) =>
      apiPost<ExertionEventDTO>("/api/exertion", input),
    onSuccess: () => invalidateKeys(queryClient, exertionDependentKeys),
  });
}

/** Edit one exertion entry. */
export function useUpdateExertionEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ExertionEventUpdateInput & { id: string }) =>
      apiPatch<ExertionEventDTO>(`/api/exertion/${id}`, input),
    onSuccess: () => invalidateKeys(queryClient, exertionDependentKeys),
  });
}

/** Delete one exertion entry. */
export function useDeleteExertionEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ deleted: boolean }>(`/api/exertion/${id}`),
    onSuccess: () => invalidateKeys(queryClient, exertionDependentKeys),
  });
}
