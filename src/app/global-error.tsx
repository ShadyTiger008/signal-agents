'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging
    console.error('[GlobalError]', error?.message, error?.digest);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-center max-w-sm space-y-6">
          {/* Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/10 rounded-full blur-2xl w-24 h-24 mx-auto" />
            <div className="relative z-10 h-16 w-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              A server error occurred. This is usually a temporary issue — try reloading the page.
            </p>
            {error?.digest && (
              <p className="text-[11px] font-mono text-zinc-600 select-all">
                Error: {error.digest}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-zinc-50 text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-zinc-700 text-zinc-300 font-semibold text-sm hover:bg-zinc-900 transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
