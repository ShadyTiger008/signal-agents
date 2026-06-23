'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Repeat2 } from 'lucide-react';
import { toggleRepost } from '@/server/actions/reposts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface RepostButtonProps {
  postId: string;
  initialRepostCount: number;
  initialHasReposted: boolean;
  isAuthenticated: boolean;
}

export function RepostButton({
  postId,
  initialRepostCount,
  initialHasReposted,
  isAuthenticated,
}: RepostButtonProps) {
  const router = useRouter();
  const [state, setState] = useState({
    count: Math.max(0, initialRepostCount),
    hasReposted: initialHasReposted,
  });
  const [isPending, startTransition] = useTransition();

  const [optimistic, setOptimistic] = useOptimistic(
    state,
    (cur, action: 'toggle') => {
      if (action === 'toggle') {
        return cur.hasReposted
          ? { count: Math.max(0, cur.count - 1), hasReposted: false }
          : { count: cur.count + 1, hasReposted: true };
      }
      return cur;
    }
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast('Sign in to repost', {
        description: 'Create an account to amplify posts on Signal.',
        action: { label: 'Sign in', onClick: () => router.push('/login') },
      });
      return;
    }

    if (isPending) return;

    startTransition(async () => {
      setOptimistic('toggle');
      try {
        const result = await toggleRepost(postId);
        setState({ count: result.repost_count, hasReposted: result.hasReposted });
      } catch (err: any) {
        toast.error(err.message || 'Could not repost');
      }
    });
  };

  return (
    <div className="relative flex items-center select-none">
      <div
        className={cn(
          'flex items-center rounded-full border bg-zinc-50/50 hover:bg-zinc-100/80 border-zinc-200/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 dark:border-zinc-800/80 transition-all duration-200',
          optimistic.hasReposted
            ? 'border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02]'
            : ''
        )}
      >
        {/* Repost toggle button */}
        <button
          data-repost-button="true"
          onClick={handleClick}
          disabled={isPending}
          className={cn(
            'flex items-center space-x-1 py-1 hover:text-emerald-500 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-emerald-500',
            optimistic.count > 0 ? 'pl-2.5 pr-1.5 rounded-l-full' : 'px-2.5 rounded-full'
          )}
          aria-label={optimistic.hasReposted ? 'Undo repost' : 'Repost'}
        >
          <Repeat2
            className={cn(
              'w-3.5 h-3.5 transition-all duration-200',
              optimistic.hasReposted
                ? 'text-emerald-500 repost-active'
                : 'stroke-zinc-500 dark:stroke-zinc-400',
              isPending && 'opacity-50'
            )}
          />
        </button>

        {/* Divider */}
        {optimistic.count > 0 && (
          <div className="w-[1px] h-3 bg-zinc-200 dark:bg-zinc-800 self-center" />
        )}

        {/* Count */}
        {optimistic.count > 0 && (
          <button
            onClick={handleClick}
            className="flex items-center py-1 pl-1.5 pr-2.5 hover:bg-zinc-150/40 dark:hover:bg-zinc-850/40 transition-colors cursor-pointer outline-none rounded-r-full"
            aria-label="Repost count"
          >
            <span
              className={cn(
                'font-mono text-xs tabular-nums font-medium select-none',
                optimistic.hasReposted
                  ? 'text-emerald-500'
                  : 'text-zinc-500 dark:text-zinc-400'
              )}
            >
              {optimistic.count}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
