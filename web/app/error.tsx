"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry if configured.
    import("@sentry/nextjs")
      .then((S) => S.captureException?.(error))
      .catch(() => {});
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="card space-y-4">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-slate-400">
          We hit an unexpected problem while loading this page. Please try
          again, and if it keeps happening, let us know.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-500">
            Reference ID: <code>{error.digest}</code>
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <a href="/" className="btn-secondary">
            Go home
          </a>
          <a href="/contact" className="btn-secondary">
            Report a problem
          </a>
        </div>
      </div>
    </div>
  );
}
