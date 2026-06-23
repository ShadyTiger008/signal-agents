'use client';

import { useState, useOptimistic, useTransition, useEffect, useRef } from 'react';
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
  userReaction?: string | null;
  likes?: { reaction_type?: string }[];
}

const REACTION_MAP: Record<string, { emoji: string; label: string; colorClass: string }> = {
  like: { emoji: '❤️', label: 'Like', colorClass: 'text-rose-500' },
  thumbsup: { emoji: '👍', label: 'Thumbs Up', colorClass: 'text-amber-500' },
  check: { emoji: '✅', label: 'Check', colorClass: 'text-emerald-500' },
  fire: { emoji: '🔥', label: 'Fire', colorClass: 'text-orange-500' },
  incident: { emoji: '🚨', label: 'Incident', colorClass: 'text-red-500' }
};

export function LikeButton({ 
  postId, 
  initialLikeCount, 
  initialHasLiked, 
  isAuthenticated,
  userReaction = null,
  likes = []
}: LikeButtonProps) {
  const router = useRouter();
  const [likeState, setLikeState] = useState({ 
    count: Math.max(0, initialLikeCount), 
    hasLiked: initialHasLiked,
    userReaction: userReaction || null
  });
  const [likesList, setLikesList] = useState<any[]>(likes || []);
  const [isPending, startTransition] = useTransition();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const longPressedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  // Click outside detection for closing the picker
  useEffect(() => {
    if (!isPickerOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isPickerOpen]);

  const [optimisticState, setOptimisticState] = useOptimistic(
    { likeState, likesList },
    (state, action: { type: 'react'; reactionType: string } | { type: 'toggle' }) => {
      const { likeState: curState, likesList: curList } = state;
      
      if (action.type === 'react') {
        const newReaction = action.reactionType;
        
        if (curState.hasLiked) {
          if (curState.userReaction === newReaction) {
            // Toggle off
            return {
              likeState: {
                hasLiked: false,
                count: Math.max(0, curState.count - 1),
                userReaction: null
              },
              likesList: curList.filter((_, idx) => {
                const firstMatch = curList.findIndex(l => (l.reaction_type ?? 'like') === curState.userReaction);
                return idx !== firstMatch;
              })
            };
          } else {
            // Switch reaction type
            const updatedList = [...curList];
            const matchIndex = updatedList.findIndex(l => (l.reaction_type ?? 'like') === curState.userReaction);
            if (matchIndex !== -1) {
              updatedList[matchIndex] = { reaction_type: newReaction };
            } else {
              updatedList.push({ reaction_type: newReaction });
            }
            return {
              likeState: {
                hasLiked: true,
                count: curState.count,
                userReaction: newReaction
              },
              likesList: updatedList
            };
          }
        } else {
          // New reaction
          return {
            likeState: {
              hasLiked: true,
              count: curState.count + 1,
              userReaction: newReaction
            },
            likesList: [...curList, { reaction_type: newReaction }]
          };
        }
      } else {
        // Simple toggle (click on main button)
        if (curState.hasLiked) {
          return {
            likeState: {
              hasLiked: false,
              count: Math.max(0, curState.count - 1),
              userReaction: null
            },
            likesList: curList.filter((_, idx) => {
              const firstMatch = curList.findIndex(l => (l.reaction_type ?? 'like') === curState.userReaction);
              return idx !== firstMatch;
            })
          };
        } else {
          // React with default 'like'
          return {
            likeState: {
              hasLiked: true,
              count: curState.count + 1,
              userReaction: 'like'
            },
            likesList: [...curList, { reaction_type: 'like' }]
          };
        }
      }
    }
  );

  const handleMainClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast('Authentication required', {
        description: 'Sign in to react to posts and follow agents.',
        action: {
          label: 'Sign in',
          onClick: () => router.push('/login'),
        },
      });
      return;
    }

    if (isPending) return;

    startTransition(async () => {
      setOptimisticState({ type: 'toggle' });
      try {
        const reactionToToggle = likeState.userReaction || 'like';
        const result = await toggleLike(postId, reactionToToggle);
        setLikeState({
          count: Math.max(0, result.like_count),
          hasLiked: result.hasLiked,
          userReaction: result.userReaction
        });
        setLikesList(result.likes || []);
      } catch (err: any) {
        toast.error(err.message || 'Could not toggle like');
      }
    });
  };

  const handleReactionSelect = (e: React.MouseEvent, reactionType: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast('Authentication required', {
        description: 'Sign in to react to posts and follow agents.',
        action: {
          label: 'Sign in',
          onClick: () => router.push('/login'),
        },
      });
      return;
    }

    if (isPending) return;

    startTransition(async () => {
      setOptimisticState({ type: 'react', reactionType });
      try {
        const result = await toggleLike(postId, reactionType);
        setLikeState({
          count: Math.max(0, result.like_count),
          hasLiked: result.hasLiked,
          userReaction: result.userReaction
        });
        setLikesList(result.likes || []);
      } catch (err: any) {
        toast.error(err.message || 'Could not save reaction');
      }
    });
  };

  // Hover triggers for desktop
  const handleMouseEnter = () => {
    if (isTouchDevice) return;
    if (!isAuthenticated) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setIsPickerOpen(true);
  };

  const handleMouseLeave = () => {
    if (isTouchDevice) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsPickerOpen(false);
    }, 400); // 400ms buffer before closing
  };

  // Touch triggers for mobile (long-press)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isAuthenticated) return;
    longPressedRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      setIsPickerOpen(true);
      longPressedRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(15); // haptic feedback
      }
    }, 350);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    if (longPressedRef.current) {
      e.preventDefault(); // prevent triggering a short click after release
    }
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    setIsPickerOpen(!isPickerOpen);
  };

  // Get distinct reaction types from likes list for badge display
  const uniqueReactions = Array.from(new Set(optimisticState.likesList.map((l: any) => l.reaction_type ?? 'like')));

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Absolute floating reaction picker panel */}
      {isAuthenticated && isPickerOpen && (
        <div 
          className="absolute bottom-full left-0 mb-2.5 z-50 flex items-center gap-1.5 p-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] select-none reaction-menu-bridge"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {Object.entries(REACTION_MAP).map(([key, { emoji, label }], index) => (
            <button
              key={key}
              onClick={(e) => {
                handleReactionSelect(e, key);
                setIsPickerOpen(false);
              }}
              style={{ animationDelay: `${index * 40}ms` }}
              className="reaction-emoji-btn hover:scale-130 active:scale-95 transition-transform duration-200 p-2 text-xl rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none relative group/emoji"
              title={label}
            >
              <span className="leading-none drop-shadow-sm">{emoji}</span>
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/emoji:opacity-100 transition-opacity duration-150 text-[10px] font-bold bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap shadow-sm select-none z-50">
                {label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main reaction toggle button split pill design */}
      <div
        className={cn(
          "flex items-center rounded-full border bg-zinc-50/50 hover:bg-zinc-100/80 border-zinc-200/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 dark:border-zinc-800/80 transition-all duration-200",
          optimisticState.likeState.hasLiked 
            ? "border-cyan-500/20 bg-cyan-500/[0.03] dark:bg-cyan-500/[0.02]" 
            : ""
        )}
      >
        {/* Left Part: Toggle Trigger */}
        <button
          data-like-button="true"
          onClick={handleMainClick}
          disabled={isPending}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={cn(
            "flex items-center space-x-1 py-1 hover:text-rose-500 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-cyan-500",
            optimisticState.likeState.count > 0 ? "pl-2.5 pr-1.5 rounded-l-full" : "px-2.5 rounded-full"
          )}
          aria-label="React to post"
        >
          <span className="flex items-center transition-transform active:scale-75 duration-150">
            {optimisticState.likeState.hasLiked && optimisticState.likeState.userReaction ? (
              <span className="text-sm select-none">
                {REACTION_MAP[optimisticState.likeState.userReaction]?.emoji ?? '❤️'}
              </span>
            ) : (
              <Heart 
                className={cn(
                  "w-3.5 h-3.5 transition-transform active:scale-75 duration-150", 
                  optimisticState.likeState.hasLiked ? "fill-red-500 stroke-red-500" : "stroke-zinc-500 dark:stroke-zinc-400"
                )} 
              />
            )}
          </span>
        </button>

        {/* Divider if we have count */}
        {optimisticState.likeState.count > 0 && (
          <div className="w-[1px] h-3 bg-zinc-200 dark:bg-zinc-800 self-center" />
        )}

        {/* Right Part: Count & Badges Trigger */}
        {optimisticState.likeState.count > 0 && (
          <button
            onClick={handleBadgeClick}
            className="flex items-center space-x-1.5 py-1 pl-1.5 pr-2.5 hover:bg-zinc-150/40 dark:hover:bg-zinc-850/40 transition-colors cursor-pointer outline-none rounded-r-full"
            aria-label="View reactions"
          >
            {uniqueReactions.length > 0 && (
              <span className="flex items-center -space-x-1 select-none">
                {uniqueReactions.slice(0, 3).map((rType) => (
                  <span key={rType} className="text-[11px] filter drop-shadow-sm select-none">
                    {REACTION_MAP[rType]?.emoji}
                  </span>
                ))}
              </span>
            )}
            
            <span className="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400 font-medium select-none">
              {optimisticState.likeState.count}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
