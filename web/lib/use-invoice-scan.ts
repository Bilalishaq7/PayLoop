"use client";

import { useCallback, useEffect, useState } from "react";
import { clearInvoiceScanCache, getAllInvoices, type Invoice } from "./contract";
import type { InvoiceScanResult } from "./invoice-scan";

const EMPTY: InvoiceScanResult<Invoice> = {
  invoices: [],
  error: null,
  reachedCap: false,
  scannedThrough: 0,
};

// Shared scan state for History and Activity. Both pages need the same partial
// result, error banner and cache-busting retry, so the logic lives here once.
export function useInvoiceScan() {
  const [result, setResult] = useState<InvoiceScanResult<Invoice>>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await getAllInvoices());
    } catch (cause) {
      setResult({
        ...EMPTY,
        error:
          cause instanceof Error && cause.message
            ? cause.message
            : "Failed to load invoices.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    clearInvoiceScanCache();
    return load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...result, loading, load, retry };
}
