"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";
import { createLatestGuard, errorMessage } from "./async-resource";

export type AsyncResourceOptions = {
  /** Skip loading while false (for example, until a wallet is connected). */
  enabled?: boolean;
  /** Error text used when the thrown value has no message. */
  fallbackError?: string;
};

export type AsyncResource<T> = {
  /** The last successful result. Kept while a reload runs or after it fails. */
  data: T | undefined;
  loading: boolean;
  error: string | null;
  /** Load again. Resolves when the load settles; never throws. */
  reload: () => Promise<void>;
};

// One place for the loading / error / retry state the Dashboard, Pay page and
// invoice scan used to re-implement. It loads on mount and whenever `deps`
// change, ignores responses that arrive after a newer load, an unmount or a
// dependency change, and keeps the previous data while reloading.
//
// `fetcher` may be a fresh closure on every render; only `deps` (and
// `enabled`) decide when it runs again, like the deps of `useEffect`.
export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  options: AsyncResourceOptions = {},
): AsyncResource<T> {
  const { enabled = true, fallbackError = "Something went wrong." } = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const guard = useRef(createLatestGuard());
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    if (!enabled) return;
    const ticket = guard.current.next();
    setLoading(true);
    setError(null);
    try {
      const value = await fetcherRef.current();
      if (guard.current.isCurrent(ticket)) setData(value);
    } catch (cause) {
      if (guard.current.isCurrent(ticket)) {
        setError(errorMessage(cause, fallbackError));
      }
    } finally {
      if (guard.current.isCurrent(ticket)) setLoading(false);
    }
    // `deps` is the caller's dependency list, like useEffect's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fallbackError, ...deps]);

  useEffect(() => {
    const current = guard.current;
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
    // Drop any response still in flight when deps change or we unmount.
    return () => current.cancel();
  }, [enabled, reload]);

  return { data, loading, error, reload };
}
