// Pure helpers behind `useAsyncResource` (see use-async-resource.ts). They live
// in their own module so the stale-response and error-message rules can be unit
// tested without rendering React.

// Hands out numbered tickets for loads. Only the most recent ticket is
// "current", so a slow response from an earlier load (or from before an
// unmount or a dependency change) is recognised and dropped.
export type LatestGuard = {
  /** Start a new load. Every earlier ticket stops being current. */
  next(): number;
  /** Whether this ticket is still the latest one. */
  isCurrent(ticket: number): boolean;
  /** Make every outstanding ticket stale, e.g. on unmount. */
  cancel(): void;
};

export function createLatestGuard(): LatestGuard {
  let latest = 0;
  return {
    next: () => ++latest,
    isCurrent: (ticket) => ticket === latest,
    cancel: () => {
      latest += 1;
    },
  };
}

// Text to show for a failed load: the error's own message when it has one,
// otherwise the caller's fallback.
export function errorMessage(cause: unknown, fallback: string): string {
  if (cause && typeof cause === "object" && "message" in cause) {
    const message = (cause as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}
