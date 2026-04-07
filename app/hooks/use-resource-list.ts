'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { resourceEvents, type ResourceEvent, type ResourceKey } from '@/lib/resource-events';

export interface UseResourceListOptions<T> {
  /** Resource key (or keys) this list reflects. Will auto-refresh on matching events. */
  resource: ResourceKey | ResourceKey[];
  /** Fetcher for the list. */
  fetcher: () => Promise<T[]>;
  /** Dependencies that should retrigger a fetch. */
  deps?: React.DependencyList;
  /** Enable the initial fetch. Defaults to true. */
  enabled?: boolean;
  /** Called on error. */
  onError?: (error: unknown) => void;
}

export interface ResourceListState<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  /** Item IDs recently created — useful for "Novo" highlight badges. */
  highlightedIds: Set<number | string>;
}

const HIGHLIGHT_DURATION_MS = 4000;

/**
 * Data hook for listings that automatically re-fetch when a related
 * creation/update/deletion is emitted via `resourceEvents`.
 *
 * Also exposes `highlightedIds` — the set of item IDs recently created, so
 * the list can render a temporary "Novo" badge / highlight on fresh items.
 */
export function useResourceList<T>(options: UseResourceListOptions<T>): ResourceListState<T> {
  const { resource, fetcher, deps = [], enabled = true, onError } = options;

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<number | string>>(() => new Set());

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const isFirstLoad = useRef(true);

  const refresh = useCallback(async () => {
    if (isFirstLoad.current) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const data = await fetcherRef.current();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err);
      onError?.(err);
    } finally {
      isFirstLoad.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onError]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    const handler = (event: ResourceEvent) => {
      void refresh();
      if (event.action === 'created' && event.id !== undefined) {
        const id = event.id;
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        setTimeout(() => {
          setHighlightedIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, HIGHLIGHT_DURATION_MS);
      }
    };
    const unsubscribe = resourceEvents.subscribe(resource, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(resource) ? resource.join(',') : resource, refresh]);

  return { items, setItems, isLoading, isRefreshing, error, refresh, highlightedIds };
}
