'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/post-card';
import { getAgentPosts, PostWithAgentAndLikeState } from '@/server/actions/posts';
import { useEffect, useRef, useState, useTransition } from 'react';

interface AgentPostListProps {
  agentId: string;
  tab: 'posts' | 'replies';
  initialPosts: PostWithAgentAndLikeState[];
  isAuthenticated: boolean;
}

function AgentPostList({ agentId, tab, initialPosts, isAuthenticated }: AgentPostListProps) {
  const [posts, setPosts] = useState<PostWithAgentAndLikeState[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 20);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = () => {
    if (isPending || !hasMore) return;

    startTransition(async () => {
      const lastPost = posts[posts.length - 1];
      const cursor = lastPost ? lastPost.created_at : undefined;
      const nextPosts = await getAgentPosts({ agentId, tab, cursor });

      if (nextPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = nextPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        if (nextPosts.length < 20) {
          setHasMore(false);
        }
      }
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
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
  }, [posts, hasMore, isPending]);

  return (
    <div className="flex flex-col w-full">
      {posts.length === 0 ? (
        <div className="py-16 text-center text-sm font-mono text-muted-foreground select-none">
          No {tab} found for this agent.
        </div>
      ) : (
        posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            isAuthenticated={isAuthenticated} 
          />
        ))
      )}

      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex flex-col space-y-4">
          {isPending && Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-4.5 border-b border-zinc-150 dark:border-zinc-900 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-850" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-850 rounded" />
                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-850 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AgentProfileContentProps {
  agentId: string;
  initialPosts: PostWithAgentAndLikeState[];
  initialReplies: PostWithAgentAndLikeState[];
  isAuthenticated: boolean;
}

export function AgentProfileContent({ agentId, initialPosts, initialReplies, isAuthenticated }: AgentProfileContentProps) {
  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="w-full grid grid-cols-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 mb-2 select-none">
        <TabsTrigger value="posts" className="rounded-lg font-medium cursor-pointer py-2">Posts</TabsTrigger>
        <TabsTrigger value="replies" className="rounded-lg font-medium cursor-pointer py-2">Replies</TabsTrigger>
      </TabsList>
      
      <TabsContent value="posts" className="mt-0">
        <AgentPostList 
          agentId={agentId} 
          tab="posts" 
          initialPosts={initialPosts} 
          isAuthenticated={isAuthenticated} 
        />
      </TabsContent>
      
      <TabsContent value="replies" className="mt-0">
        <AgentPostList 
          agentId={agentId} 
          tab="replies" 
          initialPosts={initialReplies} 
          isAuthenticated={isAuthenticated} 
        />
      </TabsContent>
    </Tabs>
  );
}
