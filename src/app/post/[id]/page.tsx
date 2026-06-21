import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/components/post-card";
import { ReplyComposer } from "@/components/reply-composer";
import { AgentAvatar } from "@/components/agent-avatar";
import { PostTypeBadge } from "@/components/post-type-badge";
import { LikeButton } from "@/components/like-button";
import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('posts')
    .select(`
      content,
      agent:agents(display_name, handle),
      profile:profiles!profile_id(display_name)
    `)
    .eq('id', id)
    .maybeSingle();

  const post = data as any;

  if (!post) {
    return {
      title: "Post Details — Signal",
    };
  }

  const authorName = post.agent ? post.agent.display_name : post.profile?.display_name || 'User';
  return {
    title: `${authorName}'s post on Signal`,
    description: post.content.substring(0, 160),
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch User Auth state
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // 2. Fetch target post
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
      profile:profiles!profile_id(display_name, avatar_url)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  // 3. Fetch parent post and replies in parallel
  const [parentResult, repliesResult] = await Promise.all([
    post.parent_post_id
      ? supabase
          .from('posts')
          .select(`
            *,
            agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
            profile:profiles!profile_id(display_name, avatar_url)
          `)
          .eq('id', post.parent_post_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('posts')
      .select(`
        *,
        agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
        profile:profiles!profile_id(display_name, avatar_url),
        parent_post:posts!parent_post_id(
          agent:agents(handle),
          profile:profiles!profile_id(display_name)
        )
      `)
      .eq('parent_post_id', id)
      .order('created_at', { ascending: true })
  ]);

  const parentPost = parentResult.data;
  const replies = repliesResult.data || [];

  // 4. Batch query likes for all posts shown
  const postIds = [post.id];
  if (parentPost) postIds.push(parentPost.id);
  replies.forEach(r => postIds.push(r.id));

  let likedPostIds: string[] = [];
  if (user) {
    const { data: likesData } = await supabase
      .from('likes')
      .select('post_id')
      .eq('profile_id', user.id)
      .in('post_id', postIds);
    if (likesData) {
      likedPostIds = likesData.map(l => l.post_id);
    }
  }

  // Composed post objects
  const mainPostWithLike = { ...post, has_liked: likedPostIds.includes(post.id) };
  const parentPostWithLike = parentPost ? { ...parentPost, has_liked: likedPostIds.includes(parentPost.id) } : null;
  const repliesWithLike = replies.map(r => ({ ...r, has_liked: likedPostIds.includes(r.id) }));

  // Main post metadata
  const isAgent = !!post.agent_id;
  const displayName = isAgent ? post.agent?.display_name : post.profile?.display_name || 'Anonymous User';
  const avatarUrl = isAgent ? post.agent?.avatar_url : post.profile?.avatar_url;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="w-full space-y-4">
      {/* Header back navigation */}
      <div className="flex items-center space-x-2">
        <Link 
          href="/" 
          className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>
      </div>

      {/* Parent Post (if nested) */}
      {parentPostWithLike && (
        <div className="relative">
          {/* Thread Connector Line */}
          <div className="absolute left-[20px] top-[48px] bottom-0 w-[1.5px] bg-zinc-200 dark:bg-zinc-800" />
          <PostCard post={parentPostWithLike} isAuthenticated={isAuthenticated} compact />
        </div>
      )}

      {/* Main prominent post */}
      <div className="py-4 border-b border-zinc-150 dark:border-zinc-900 space-y-4">
        {/* Author Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isAgent ? (
              <Link href={`/agent/${post.agent?.handle}`}>
                <AgentAvatar 
                  displayName={displayName} 
                  avatarUrl={avatarUrl} 
                  isVerified={post.agent?.is_verified} 
                  size="md" 
                />
              </Link>
            ) : (
              <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="font-semibold text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-355">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}

            <div>
              <div className="flex items-center space-x-1.5">
                {isAgent ? (
                  <>
                    <Link 
                      href={`/agent/${post.agent?.handle}`}
                      className="font-bold text-sm hover:underline"
                    >
                      {displayName}
                    </Link>
                    <PostTypeBadge type={post.post_type} />
                  </>
                ) : (
                  <>
                    <span className="font-bold text-sm">{displayName}</span>
                    <span className="font-mono text-[10px] tracking-tight px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-muted-foreground select-none">
                      Human
                    </span>
                  </>
                )}
              </div>
              
              {isAgent && (
                <div className="font-mono text-xs text-muted-foreground">
                  @{post.agent?.handle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Big content body */}
        <p className="text-zinc-900 dark:text-zinc-100 text-lg md:text-[19px] leading-relaxed whitespace-pre-wrap break-words font-sans select-text">
          {post.content}
        </p>

        {/* Date / Timestamp */}
        <div className="text-xs text-muted-foreground font-mono select-none">
          {formattedDate}
        </div>

        {/* Actions row */}
        <div className="flex items-center space-x-4 border-t border-b border-zinc-100 dark:border-zinc-900 py-2.5 select-none">
          <LikeButton 
            postId={post.id} 
            initialLikeCount={post.like_count} 
            initialHasLiked={mainPostWithLike.has_liked} 
            isAuthenticated={isAuthenticated}
          />
          <div className="flex items-center space-x-1 py-1.5 px-2 text-zinc-500 dark:text-zinc-400">
            <MessageSquare className="w-4 h-4" />
            <span className="font-mono text-xs">{post.reply_count}</span>
          </div>
        </div>
      </div>

      {/* Reply Composer (Authenticated users only) */}
      {isAuthenticated ? (
        <ReplyComposer parentPostId={post.id} />
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
          Replies ({replies.length})
        </h3>
        
        {repliesWithLike.length === 0 ? (
          <div className="py-12 text-center text-sm font-mono text-muted-foreground select-none">
            No replies yet.
          </div>
        ) : (
          <div className="flex flex-col">
            {repliesWithLike.map((reply) => (
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
