import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PostCard } from "@/components/post-card";
import { ThreadRepliesSection } from "@/components/thread-replies-section";
import { AgentAvatar } from "@/components/agent-avatar";
import { PostTypeBadge } from "@/components/post-type-badge";

import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

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

  // 1. Fetch User Auth state & Profile
  const userAndProfile = await getCurrentUser();
  const user = userAndProfile?.user || null;
  const currentUserProfile = userAndProfile?.profile || null;
  const isAuthenticated = !!user;


  // 2. Fetch target post
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      likes:likes(count),
      replies:posts!parent_post_id(count),
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
            likes:likes(count),
            replies:posts!parent_post_id(count),
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
        likes:likes(count),
        replies:posts!parent_post_id(count),
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

  const parentPost = parentResult.data as any;
  const replies = repliesResult.data || [];

  // 4. Fetch Recommended Posts of the same category (post_type)
  const { data: recommendedPostsData } = await supabase
    .from('posts')
    .select(`
      *,
      likes:likes(count),
      replies:posts!parent_post_id(count),
      agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
      profile:profiles!profile_id(display_name, avatar_url),
      parent_post:posts!parent_post_id(
        agent:agents(handle),
        profile:profiles!profile_id(display_name)
      )
    `)
    .eq('post_type', post.post_type)
    .neq('id', post.id)
    .is('parent_post_id', null)
    .order('created_at', { ascending: false })
    .limit(3);

  let recommendedPosts = recommendedPostsData || [];
  if (recommendedPosts.length < 3) {
    const { data: fallbackPosts } = await supabase
      .from('posts')
      .select(`
        *,
        likes:likes(count),
        replies:posts!parent_post_id(count),
        agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
        profile:profiles!profile_id(display_name, avatar_url),
        parent_post:posts!parent_post_id(
          agent:agents(handle),
          profile:profiles!profile_id(display_name)
        )
      `)
      .neq('id', post.id)
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(3 - recommendedPosts.length);
      
    if (fallbackPosts) {
      recommendedPosts = [...recommendedPosts, ...fallbackPosts];
    }
  }

  // 5. Batch query likes and follows for all posts shown
  const postIds = [post.id];
  if (parentPost) postIds.push(parentPost.id);
  replies.forEach(r => postIds.push(r.id));
  recommendedPosts.forEach(r => postIds.push(r.id));

  let likedPostIds: string[] = [];
  let followedAgentIds: string[] = [];
  if (user) {
    const [likesResult, followsResult] = await Promise.all([
      supabase
        .from('likes')
        .select('post_id')
        .eq('profile_id', user.id)
        .in('post_id', postIds),
      supabase
        .from('follows')
        .select('agent_id')
        .eq('follower_profile_id', user.id)
    ]);
    if (likesResult.data) {
      likedPostIds = likesResult.data.map(l => l.post_id);
    }
    if (followsResult.data) {
      followedAgentIds = followsResult.data.map(f => f.agent_id);
    }
  }

  // Composed post objects
  const mainPostWithLike = { 
    ...post, 
    like_count: post.likes?.[0]?.count ?? 0,
    reply_count: post.replies?.[0]?.count ?? 0,
    has_liked: likedPostIds.includes(post.id),
    is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false 
  };
  const parentPostWithLike = parentPost ? { 
    ...parentPost, 
    like_count: parentPost.likes?.[0]?.count ?? 0,
    reply_count: parentPost.replies?.[0]?.count ?? 0,
    has_liked: likedPostIds.includes(parentPost.id),
    is_following_agent: parentPost.agent_id ? followedAgentIds.includes(parentPost.agent_id) : false 
  } : null;
  const repliesWithLike = replies.map(r => ({ 
    ...r, 
    like_count: r.likes?.[0]?.count ?? 0,
    reply_count: r.replies?.[0]?.count ?? 0,
    has_liked: likedPostIds.includes(r.id),
    is_following_agent: r.agent_id ? followedAgentIds.includes(r.agent_id) : false 
  }));
  const recommendedPostsWithLike = recommendedPosts.map(r => ({
    ...r,
    like_count: r.likes?.[0]?.count ?? 0,
    reply_count: r.replies?.[0]?.count ?? 0,
    has_liked: likedPostIds.includes(r.id),
    is_following_agent: r.agent_id ? followedAgentIds.includes(r.agent_id) : false
  }));

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
    <div className="max-w-[640px] mx-auto w-full space-y-4">
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
      <div 
        data-post-card="true"
        data-post-id={post.id}
        className="py-4 border-b border-zinc-150 dark:border-zinc-900 space-y-4 transition-all duration-200 px-3 -mx-3 rounded-lg"
      >
        {/* Author Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isAgent ? (
              <Link href={`/agent/${post.agent?.handle}`}>
                <AgentAvatar 
                  agentId={post.agent_id}
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
      </div>
      
      <ThreadRepliesSection
        postId={post.id}
        initialReplyCount={post.reply_count}
        initialReplies={repliesWithLike}
        isAuthenticated={isAuthenticated}
        currentUserProfile={currentUserProfile}
        mainPostHasLiked={mainPostWithLike.has_liked}
        mainPostLikeCount={post.like_count}
      />

      {/* Recommended Posts Section */}
      {recommendedPostsWithLike.length > 0 && (
        <div className="pt-8 border-t border-zinc-150 dark:border-zinc-900 space-y-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
            Recommended Posts (Category: {post.post_type})
          </h3>
          <div className="flex flex-col">
            {recommendedPostsWithLike.map((recPost) => (
              <PostCard
                key={recPost.id}
                post={recPost}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        </div>
      )}
    </div>

  );
}
