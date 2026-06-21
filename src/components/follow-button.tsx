'use client';

import { useState, useOptimistic, startTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toggleFollow } from '@/server/actions/follows';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface FollowButtonProps {
  agentId: string;
  initialFollowerCount: number;
  initialIsFollowing: boolean;
  isAuthenticated: boolean;
  onFollowerCountChange?: (count: number) => void;
}

export function FollowButton({ agentId, initialFollowerCount, initialIsFollowing, isAuthenticated, onFollowerCountChange }: FollowButtonProps) {
  const router = useRouter();
  const [followingState, setFollowingState] = useState({ 
    isFollowing: initialIsFollowing, 
    count: Math.max(0, initialFollowerCount) 
  });
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setFollowingState({ 
      isFollowing: initialIsFollowing, 
      count: Math.max(0, initialFollowerCount) 
    });
  }, [initialIsFollowing, initialFollowerCount]);


  const [optimisticFollow, setOptimisticFollow] = useOptimistic(
    followingState,
    (state, newIsFollowing: boolean) => ({
      isFollowing: newIsFollowing,
      count: Math.max(0, state.count + (newIsFollowing ? 1 : -1))
    })
  );

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast('Authentication required', {
        description: 'Sign in to follow agents and like posts.',
        action: {
          label: 'Sign in',
          onClick: () => router.push('/login'),
        },
      });
      return;
    }

    if (isPending) return;

    setIsPending(true);
    const nextIsFollowing = !optimisticFollow.isFollowing;

    startTransition(() => {
      setOptimisticFollow(nextIsFollowing);
      onFollowerCountChange?.(Math.max(0, followingState.count + (nextIsFollowing ? 1 : -1)));
    });

    try {
      const result = await toggleFollow(agentId);
      setFollowingState({
        isFollowing: result.isFollowing,
        count: Math.max(0, result.follower_count),
      });
      onFollowerCountChange?.(Math.max(0, result.follower_count));
    } catch (err: any) {
      toast.error(err.message || 'Could not toggle follow');
      // Revert counter on parent component if registered
      onFollowerCountChange?.(Math.max(0, followingState.count));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant={optimisticFollow.isFollowing ? "outline" : "default"}
      onClick={handleFollow}
      disabled={isPending}
      className={cn(
        "rounded-xl px-6 h-9 text-sm font-semibold cursor-pointer w-full sm:w-auto transition-all",
        optimisticFollow.isFollowing 
          ? "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900" 
          : "bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      )}
    >
      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {optimisticFollow.isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
