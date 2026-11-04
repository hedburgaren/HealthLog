"use client";

/**
 * Acute stressor events: read and write hooks.
 *
 * Reads unwrap the envelope through `apiGet`; every key comes from the
 * factory (`queryKeys.acuteEvents`, under the `["timeline"]` root). Every
 * write evicts the acute-event bundle, which is the timeline root plus the
 * open day.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/api-fetch";
import {
  acuteEventDependentKeys,
  invalidateKeys,
  queryKeys,
} from "@/lib/query-keys";
import type {
  AcuteEventCategory,
  AcuteEventDTO,
} from "@/lib/acute-events/shared";

export interface AcuteEventList {
  events: AcuteEventDTO[];
  limit: number;
  hasMore: boolean;
}

export interface AcuteEventCreateInput {
  category: AcuteEventCategory;
  intensity: number;
  occurredAt?: string;
  note?: string | null;
}

export interface AcuteEventUpdateInput {
  category?: AcuteEventCategory;
  occurredAt?: string;
  intensity?: number;
  note?: string | null;
}

/** Occurrences per request while walking a window. */
const ACUTE_EVENTS_PAGE_SIZE = 500;

/**
 * Every acute event inside `[from, to]` (ISO instants), newest first, read
 * page by page. The route answers at most one page and says `hasMore`; each
 * further page asks up to the oldest instant already read. A long history
 * can hold more than one page, and a single capped read showed only its
 * newest part.
 */
export async function loadAcuteEvents(
  from: string,
  to: string,
  fetchPage: (url: string) => Promise<AcuteEventList> = (url) =>
    apiGet<AcuteEventList>(url),
): Promise<AcuteEventList> {
  const seen = new Set<string>();
  const events: AcuteEventDTO[] = [];
  let upTo = to;
  for (;;) {
    const params = new URLSearchParams({
      from,
      to: upTo,
      limit: String(ACUTE_EVENTS_PAGE_SIZE),
    });
    const page = await fetchPage(`/api/acute-events?${params}`);
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
      return { events, limit: ACUTE_EVENTS_PAGE_SIZE, hasMore: false };
    }
    upTo = oldest.occurredAt;
  }
}

/** Events inside `[from, to]` (ISO instants), newest first. */
export function useAcuteEvents(
  from: string | null,
  to: string | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.acuteEvents(from, to),
    enabled: options.enabled ?? true,
    queryFn: () => loadAcuteEvents(from as string, to as string),
  });
}

/** Log one acute event. */
export function useLogAcuteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AcuteEventCreateInput) =>
      apiPost<AcuteEventDTO>("/api/acute-events", input),
    onSuccess: () => invalidateKeys(queryClient, acuteEventDependentKeys),
  });
}

/** Edit one acute event. */
export function useUpdateAcuteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AcuteEventUpdateInput & { id: string }) =>
      apiPatch<AcuteEventDTO>(`/api/acute-events/${id}`, input),
    onSuccess: () => invalidateKeys(queryClient, acuteEventDependentKeys),
  });
}

/** Delete one acute event. */
export function useDeleteAcuteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ deleted: boolean }>(`/api/acute-events/${id}`),
    onSuccess: () => invalidateKeys(queryClient, acuteEventDependentKeys),
  });
}
