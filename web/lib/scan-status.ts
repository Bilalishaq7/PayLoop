// Pure notification copy for the shared invoice scan status banner.

export type ScanStatusInput = {
  error: string | null;
  reachedCap: boolean;
  count: number;
  scannedThrough: number;
};

export function scanStatusMessage({
  error,
  reachedCap,
  count,
  scannedThrough,
}: ScanStatusInput): string | null {
  if (error) {
    return `Invoice lookup stopped at #${scannedThrough}: ${error} Showing the ${count} invoices loaded before the failure.`;
  }
  if (reachedCap) {
    return `Showing the first ${count} invoices. The scan stops at id 250, so older invoices may be missing.`;
  }
  return null;
}
