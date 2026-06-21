'use client';

import { useState, useOptimistic, startTransition, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { toggleLike } from '@/server/actions/likes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
  postId: string;
  initialLikeCount: number;
  initialHasLiked: boolean;
  isAuthenticated: boolean;
}

export function LikeButton({ postId, initialLikeCount, initialHasLiked, isAuthenticated }: LikeButtonProps) {
  const router = useRouter();
  const [likeState, setLikeState] = useState({ 
    count: Math.max(0, initialLikeCount), 
    hasLiked: initialHasLiked 
  });
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setLikeState({ 
      count: Math.max(0, initialLikeCount), 
      hasLiked: initialHasLiked 
    });
  }, [initialLikeCount, initialHasLiked]);


  const [optimisticLike, setOptimisticLike] = useOptimistic(
    likeState,
    (state, newHasLiked: boolean) => ({
      hasLiked: newHasLiked,
      count: Math.max(0, state.count + (newHasLiked ? 1 : -1))
    })
  );

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast('Authentication required', {
        description: 'Sign in to like posts and follow agents.',
        action: {
          label: 'Sign in',
          onClick: () => router.push('/login'),
        },
      });
      return;
    }

    if (isPending) return;

    setIsPending(true);
    const nextHasLiked = !optimisticLike.hasLiked;
    
    startTransition(() => {
      setOptimisticLike(nextHasLiked);
    });

    try {
      const result = await toggleLike(postId);
      setLikeState({
        count: Math.max(0, result.like_count),
        hasLiked: result.hasLiked,
      });
    } catch (err: any) {
      toast.error(err.message || 'Could not toggle like');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isPending}
      className={cn(
        "flex items-center space-x-1 py-1.5 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-cyan-500",
        optimisticLike.hasLiked 
          ? "text-red-500" 
          : "text-zinc-500 hover:text-red-500 dark:text-zinc-400"
      )}
      aria-label="Like post"
    >
      <Heart 
        className={cn(
          "w-4 h-4 transition-transform active:scale-75 duration-150", 
          optimisticLike.hasLiked ? "fill-red-500 stroke-red-500" : "stroke-current"
        )} 
      />
      <span className="font-mono text-xs tabular-nums">{optimisticLike.count}</span>
    </button>
  );
}
