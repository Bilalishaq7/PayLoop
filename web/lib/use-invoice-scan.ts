"use client";

import { useCallback } from "react";
import { clearInvoiceScanCache, getAllInvoices, type Invoice } from "./contract";
import type { InvoiceScanResult } from "./invoice-scan";
import { useAsyncResource } from "./use-async-resource";

const EMPTY: InvoiceScanResult<Invoice> = {
  invoices: [],
  error: null,
  reachedCap: false,
  scannedThrough: 0,
};

// Shared scan state for History and Activity. Both pages need the same partial
// result, error banner and cache-busting retry, so the logic lives here once.
export function useInvoiceScan() {
  const { data, loading, error, reload } = useAsyncResource(
    () => getAllInvoices(),
    [],
    { fallbackError: "Failed to load invoices." },
  );

  // A failed scan replaces whatever was shown before with an empty result that
  // carries the error, as before the shared hook existed.
  const result: InvoiceScanResult<Invoice> = error
    ? { ...EMPTY, error }
    : (data ?? EMPTY);

  const retry = useCallback(() => {
    clearInvoiceScanCache();
    return reload();
  }, [reload]);

  return { ...result, loading, load: reload, retry };
}
