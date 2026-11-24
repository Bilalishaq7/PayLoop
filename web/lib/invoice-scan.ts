// Pure, UI-independent helpers for walking invoice ids on the contract.
// The RPC access stays in contract.ts; this module only orchestrates ids so the
// failure and cap behaviour can be tested without a Stellar node.

export type InvoiceScanResult<T> = {
  invoices: T[];
  error: string | null;
  reachedCap: boolean;
  scannedThrough: number;
};

export type ScanOptions = {
  startId?: number;
  max?: number;
  batchSize?: number;
};

type Settled<T> = {
  id: number;
  value: T | null;
  error: string | null;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const message = String(error);
  return message || "Invoice lookup failed";
}

/**
 * Fetches invoices in bounded parallel batches, preserving id order.
 *
 * `fetchInvoice` returning null means "no invoice at this id", which is the
 * normal end of the scan. A thrown error means the RPC call failed: the
 * partial result is kept and flagged with `error`.
 */
export async function scanInvoices<T>(
  fetchInvoice: (id: number) => Promise<T | null>,
  options: ScanOptions = {}
): Promise<InvoiceScanResult<T>> {
  const startId = options.startId ?? 1;
  const max = options.max ?? 250;
  const batchSize = options.batchSize ?? 10;

  if (!Number.isInteger(startId) || startId < 1) {
    throw new RangeError("startId must be a positive integer");
  }
  if (!Number.isInteger(max) || max < startId) {
    throw new RangeError("max must be an integer greater than or equal to startId");
  }
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError("batchSize must be a positive integer");
  }

  const invoices: T[] = [];
  let error: string | null = null;
  let reachedCap = false;
  let scannedThrough = startId - 1;

  for (let from = startId; from <= max; from += batchSize) {
    const ids: number[] = [];
    const end = Math.min(from + batchSize, max + 1);
    for (let id = from; id < end; id++) ids.push(id);

    const settled = await Promise.all(
      ids.map(async (id): Promise<Settled<T>> => {
        try {
          return { id, value: await fetchInvoice(id), error: null };
        } catch (cause) {
          return { id, value: null, error: errorMessage(cause) };
        }
      })
    );

    let stop = false;
    for (const item of settled) {
      scannedThrough = item.id;
      if (item.error) {
        error = item.error;
        stop = true;
        break;
      }
      if (item.value === null) {
        stop = true;
        break;
      }
      invoices.push(item.value);
    }
    if (stop) break;
    if (end > max) reachedCap = true;
  }

  return { invoices, error, reachedCap, scannedThrough };
}

export interface ScanCache<T> {
  get(load: () => Promise<T>): Promise<T>;
  clear(): void;
}

/**
 * One-entry cache with a TTL. Concurrent callers share the same promise, and
 * a failed load evicts the entry so the next call can retry immediately.
 */
export function createScanCache<T>(
  ttlMs: number,
  now: () => number = Date.now
): ScanCache<T> {
  let entry: { expiresAt: number; promise: Promise<T> } | null = null;

  return {
    get(load: () => Promise<T>): Promise<T> {
      const timestamp = now();
      if (!entry || entry.expiresAt <= timestamp) {
        const promise = load();
        entry = { expiresAt: timestamp + ttlMs, promise };
        promise.catch(() => {
          if (entry?.promise === promise) entry = null;
        });
      }
      return entry.promise;
    },
    clear(): void {
      entry = null;
    },
  };
}
