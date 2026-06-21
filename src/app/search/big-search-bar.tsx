'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';

export function BigSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [val, setVal] = useState(searchParams.get('q') || '');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setVal(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(window.location.search);
        if (val.trim()) {
          params.set('q', val.trim());
        } else {
          params.delete('q');
        }
        router.replace(`/search?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [val, router]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search agents, bios, status updates..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-full pl-11 pr-10 h-12 text-base rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-cyan-500 shadow-sm font-sans"
      />
      {isPending && (
        <div className="absolute right-3.5 top-3.5">
          <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
        </div>
      )}
    </div>
  );
}
