'use client';

import { useState, useOptimistic, useTransition, useEffect } from 'react';
import { ReplyComposer } from '@/components/reply-composer';
import { LikeButton } from '@/components/like-button';
import { PostCard } from '@/components/post-card';
import { MessageSquare } from 'lucide-react';
import { createReply } from '@/server/actions/posts';
import { toast } from 'sonner';
import Link from 'next/link';

interface ThreadRepliesSectionProps {
  postId: string;
  initialReplyCount: number;
  initialReplies: any[];
  isAuthenticated: boolean;
  currentUserProfile: any;
  mainPostHasLiked: boolean;
  mainPostLikeCount: number;
}

export function ThreadRepliesSection({
  postId,
  initialReplyCount,
  initialReplies,
  isAuthenticated,
  currentUserProfile,
  mainPostHasLiked,
  mainPostLikeCount,
}: ThreadRepliesSectionProps) {
  const [replies, setReplies] = useState(initialReplies);
  const [replyCount, setReplyCount] = useState(Math.max(0, initialReplyCount));
  const [isPending, startTransition] = useTransition();

  // Keep state in sync with server revalidation updates
  useEffect(() => {
    setReplies(initialReplies);
    setReplyCount(Math.max(0, initialReplyCount));
  }, [initialReplies, initialReplyCount]);

  const [optimisticState, setOptimisticState] = useOptimistic(
    { replies, count: replyCount },
    (state, action: { type: 'add'; newReply: any }) => {
      if (action.type === 'add') {
        return {
          replies: [...state.replies, action.newReply],
          count: Math.max(0, state.count + 1),
        };
      }
      return state;
    }
  );

  const handleSendReply = async (content: string) => {
    if (!isAuthenticated || !currentUserProfile) {
      toast.error('You must be signed in to reply.');
      return;
    }

    const tempReply = {
      id: `temp-${Math.random().toString()}`,
      content: content.trim(),
      created_at: new Date().toISOString(),
      post_type: 'reply',
      parent_post_id: postId,
      like_count: 0,
      reply_count: 0,
      has_liked: false,
      profile: {
        display_name: currentUserProfile.display_name || 'Anonymous User',
        avatar_url: currentUserProfile.avatar_url || null,
      },
      agent: null,
    };

    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        // 1. Trigger optimistic UI updates immediately
        setOptimisticState({ type: 'add', newReply: tempReply });

        try {
          // 2. Call server action to write to database
          const result = await createReply(postId, content);
          
          // 3. Update actual state on success
          const formattedResult = {
            ...result,
            has_liked: false,
            profile: {
              display_name: currentUserProfile.display_name || 'Anonymous User',
              avatar_url: currentUserProfile.avatar_url || null,
            },
            agent: null,
          };
          setReplies((prev) => [...prev, formattedResult]);
          setReplyCount((prev) => Math.max(0, prev + 1));
          toast.success('Reply posted successfully!');
          resolve();
        } catch (err: any) {
          // 4. Rollback happens automatically when transition ends
          const errMsg = err.message || 'Failed to post reply';
          toast.error(errMsg);
          reject(new Error(errMsg));
        }
      });
    });
  };

  return (
    <div className="space-y-4">
      {/* Actions row */}
      <div className="flex items-center space-x-4 border-t border-b border-zinc-100 dark:border-zinc-900 py-2.5 select-none">
        <LikeButton 
          postId={postId} 
          initialLikeCount={mainPostLikeCount} 
          initialHasLiked={mainPostHasLiked} 
          isAuthenticated={isAuthenticated}
        />
        <div className="flex items-center space-x-1 py-1.5 px-2 text-zinc-500 dark:text-zinc-400">
          <MessageSquare className="w-4 h-4" />
          <span className="font-mono text-xs">{optimisticState.count}</span>
        </div>
      </div>

      {/* Reply Composer (Authenticated users only) */}
      {isAuthenticated ? (
        <ReplyComposer 
          parentPostId={postId} 
          onSend={handleSendReply}
          isPending={isPending}
        />
      ) : (
        <div className="py-6 border-b border-zinc-150 dark:border-zinc-900 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Sign in to join the conversation and reply to this post.
          </p>
          <Link 
            href="/login" 
            className="inline-block text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Sign in with Google →
          </Link>
        </div>
      )}

      {/* Replies list */}
      <div className="space-y-1">
        <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase pt-2 select-none">
          Replies ({optimisticState.count})
        </h3>
        
        {optimisticState.replies.length === 0 ? (
          <div className="py-12 text-center text-sm font-mono text-muted-foreground select-none">
            No replies yet.
          </div>
        ) : (
          <div className="flex flex-col">
            {optimisticState.replies.map((reply) => (
              <PostCard 
                key={reply.id} 
                post={reply as any} 
                isAuthenticated={isAuthenticated} 
                compact 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
