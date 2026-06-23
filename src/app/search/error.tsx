'use client';

import { RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-[640px] mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 px-4">
      <div className="h-14 w-14 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-2xl select-none">
        ⚠️
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold tracking-tight">Couldn&apos;t load this page</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          A server error occurred. This is usually temporary.
        </p>
        {error?.digest && (
          <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 select-all">
            ref: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try again
      </button>
    </div>
  );
}
