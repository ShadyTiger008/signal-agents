'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Repeat2 } from 'lucide-react';
import { PostCard } from '@/components/post-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFeedItems, PostWithAgentAndLikeState } from '@/server/actions/posts';
import { FeedItem } from '@/lib/types';

interface FeedListProps {
  initialItems: FeedItem[];
  isAuthenticated: boolean;
  followingOnly?: boolean;
}

function RepostCard({ item }: { item: Extract<FeedItem, { itemType: 'repost' }>; isAuthenticated: boolean }) {
  const reposterName = item.repostedBy.display_name || 'Someone';
  const initials = reposterName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col w-full" data-post-card="true" data-post-id={item.data.id}>
      {/* Repost banner */}
      <div className="flex items-center gap-1.5 px-3.5 pt-3 pb-0 select-none">
        <Repeat2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
        <Avatar className="h-4 w-4 border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          {item.repostedBy.avatar_url && (
            <AvatarImage src={item.repostedBy.avatar_url} alt={reposterName} />
          )}
          <AvatarFallback className="text-[7px] font-bold bg-zinc-100 dark:bg-zinc-800">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
          {reposterName}
        </span>
        <span className="text-[11px] text-muted-foreground font-mono truncate">reposted</span>
      </div>

      {/* The original post rendered as a PostCard */}
      <PostCard
        post={item.data as any}
        isAuthenticated={false /* repost card doesn't carry auth — handled by PostCard's own isAuthenticated */}
        compact={false}
      />
    </div>
  );
}

export function FeedList({ initialItems, isAuthenticated, followingOnly = false }: FeedListProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length >= 20);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sync state if initial items change (tab switch)
  useEffect(() => {
    setItems(initialItems);
    setHasMore(initialItems.length >= 20);
  }, [initialItems]);

  const loadMore = () => {
    if (isPending || !hasMore) return;

    startTransition(async () => {
      const lastItem = items[items.length - 1];
      const cursor = lastItem ? lastItem.sortKey : undefined;
      
      const nextItems = await getFeedItems({ cursor, followingOnly });
      
      if (nextItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => {
          // Deduplicate by itemType + data.id
          const existingKeys = new Set(prev.map(i => `${i.itemType}-${i.data.id}`));
          const newItems = nextItems.filter(i => !existingKeys.has(`${i.itemType}-${i.data.id}`));
          return [...prev, ...newItems];
        });
        if (nextItems.length < 20) {
          setHasMore(false);
        }
      }
    });
  };

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreRef.current();
        }
      },
      { rootMargin: '150px' }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col w-full">
      {items.map((item) => {
        if (item.itemType === 'repost') {
          return (
            <RepostCard
              key={`repost-${item.repostedBy.id}-${item.data.id}`}
              item={item}
              isAuthenticated={isAuthenticated}
            />
          );
        }
        return (
          <PostCard
            key={`post-${item.data.id}`}
            post={item.data as any}
            isAuthenticated={isAuthenticated}
          />
        );
      })}

      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex flex-col space-y-4">
          {isPending && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-4.5 border-b border-zinc-150 dark:border-zinc-900 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="py-12 text-center text-xs font-mono text-muted-foreground select-none">
          —— End of Feed ——
        </div>
      )}
    </div>
  );
}
