/**
 * Tiny pub/sub for "something was created/updated" events.
 *
 * Listings subscribe to a resource key (e.g. "campaigns", "lists") and refetch
 * themselves whenever a create/update/delete flow emits an event for that key.
 *
 * This removes the need for React Query/SWR in the short term while still
 * giving every creation flow a consistent, reusable way to invalidate the
 * correct listings without prop-drilling or duplicated logic.
 */

export type ResourceKey =
  | 'campaigns'
  | 'pages'
  | 'assets'
  | 'milestones'
  | 'chats'
  | 'lists'
  | 'contacts'
  | 'templates'
  | 'copy-suggestions'
  | 'tokens';

export type ResourceEvent = {
  action: 'created' | 'updated' | 'deleted';
  id?: number | string;
  data?: unknown;
};

type Listener = (event: ResourceEvent) => void;

const listeners = new Map<ResourceKey, Set<Listener>>();

export const resourceEvents = {
  emit(key: ResourceKey | ResourceKey[], event: ResourceEvent = { action: 'created' }): void {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      const set = listeners.get(k);
      if (!set) continue;
      for (const cb of set) {
        try {
          cb(event);
        } catch {
          // listener errors must not break the emitter
        }
      }
    }
  },

  subscribe(key: ResourceKey | ResourceKey[], cb: Listener): () => void {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      if (!listeners.has(k)) listeners.set(k, new Set());
      listeners.get(k)!.add(cb);
    }
    return () => {
      for (const k of keys) {
        listeners.get(k)?.delete(cb);
      }
    };
  },
};
