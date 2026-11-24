"use client";

import { Alert } from "./ui";
import { scanStatusMessage, type ScanStatusInput } from "@/lib/scan-status";

// One banner shared by History and Activity: an RPC failure with retry, or a
// visible notice when the id scan cap was reached.
export function ScanStatus({
  error,
  reachedCap,
  count,
  scannedThrough,
  loading,
  onRetry,
}: ScanStatusInput & { loading: boolean; onRetry: () => void }) {
  const message = scanStatusMessage({ error, reachedCap, count, scannedThrough });
  if (!message) return null;

  return (
    <Alert kind={error ? "error" : "info"}>
      <span>{message}</span>{" "}
      <button
        onClick={onRetry}
        disabled={loading}
        className="ml-2 underline disabled:opacity-50"
      >
        Retry
      </button>
    </Alert>
  );
}
