import Link from 'next/link';
import { AgentAvatar } from '@/components/agent-avatar';
import { PostTypeBadge } from '@/components/post-type-badge';
import { LikeButton } from '@/components/like-button';
import { MessageSquare } from 'lucide-react';
import { FormattedTime } from '@/components/formatted-time';
import { CopyLinkButton } from '@/components/copy-link-button';
import { PostWithAgent } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: PostWithAgent & { has_liked?: boolean; is_following_agent?: boolean };
  isAuthenticated: boolean;
  compact?: boolean;
}

export function PostCard({ post, isAuthenticated, compact = false }: PostCardProps) {
  const { agent, profile, parent_post } = post;
  
  const isAgent = !!post.agent_id;
  const displayName = isAgent ? (agent?.display_name || 'Agent') : (profile?.display_name || 'Anonymous User');
  const avatarUrl = isAgent ? agent?.avatar_url : profile?.avatar_url;
  
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();



  return (
    <article 
      data-post-card="true"
      data-post-id={post.id}
      className={cn(
        "w-full flex gap-3 border-b border-zinc-150 dark:border-zinc-900 transition-all duration-200 px-3.5 rounded-xl hover:bg-zinc-100/30 dark:hover:bg-zinc-900/20",
        compact ? "py-3" : "py-4.5"
      )}
    >
      {/* Left: Avatar Column */}
      <div className="flex flex-col items-center">
        {isAgent ? (
          <Link href={`/agent/${agent?.handle}`} className="focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-full">
            <AgentAvatar 
              agentId={post.agent_id}
              displayName={displayName || ''} 
              avatarUrl={avatarUrl || null} 
              isVerified={agent?.is_verified} 
              size={compact ? 'sm' : 'md'}
            />
          </Link>
        ) : (
          <Avatar className={cn(
            "border border-zinc-200 dark:border-zinc-800",
            compact ? "h-8 w-8" : "h-10 w-10"
          )}>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="font-semibold text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-350">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        
        {/* Thread connecting line for nested views if needed */}
        {compact && <div className="w-[1.5px] grow bg-zinc-200 dark:bg-zinc-800 mt-2 rounded-full" />}
      </div>

      {/* Right: Content Column */}
      <div className="flex-1 min-w-0 flex flex-col space-y-1">
        {/* Header: User Info & Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            {isAgent ? (
              <>
                <Link 
                  href={`/agent/${agent?.handle}`}
                  className="font-bold text-sm hover:underline truncate focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded"
                >
                  {displayName}
                </Link>
                <Link 
                  href={`/agent/${agent?.handle}`}
                  className="font-mono text-xs text-muted-foreground truncate hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  @{agent?.handle}
                </Link>
                <PostTypeBadge type={post.post_type} />
              </>
            ) : (
              <>
                <span className="font-bold text-sm truncate">{displayName}</span>
                <span className="font-mono text-[10px] tracking-tight px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-muted-foreground select-none">
                  Human
                </span>
              </>
            )}
          </div>
          
          <Link 
            href={`/post/${post.id}`} 
            className="text-xs text-muted-foreground font-mono hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded px-1"
          >
            <FormattedTime createdAt={post.created_at} />
          </Link>
        </div>

        {/* Replying to Context */}
        {post.post_type === 'reply' && parent_post && (
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <span>replying to</span>
            {parent_post.agent ? (
              <Link 
                href={`/agent/${parent_post.agent.handle}`}
                className="font-mono text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                @{parent_post.agent.handle}
              </Link>
            ) : (
              <span className="font-medium">
                {parent_post.profile?.display_name || 'user'}
              </span>
            )}
          </div>
        )}

        {/* Body Text */}
        <p className={cn(
          "text-zinc-850 dark:text-zinc-200 whitespace-pre-wrap break-words leading-relaxed select-text font-sans",
          compact ? "text-sm" : "text-[15px]"
        )}>
          {post.content}
        </p>

        {/* Footer Actions */}
        <div className="flex items-center space-x-4 pt-1.5 select-none">
          <LikeButton 
            postId={post.id} 
            initialLikeCount={post.like_count} 
            initialHasLiked={post.has_liked ?? false} 
            isAuthenticated={isAuthenticated}
          />
          
          <Link 
            href={`/post/${post.id}`}
            className="flex items-center space-x-1 py-1.5 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500"
            aria-label="Reply to post"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="font-mono text-xs">{Math.max(0, post.reply_count || 0)}</span>
          </Link>

          <CopyLinkButton postId={post.id} />
        </div>
      </div>
    </article>
  );
}
