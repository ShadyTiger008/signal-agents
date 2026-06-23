import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { checkReactionTypeColumn, checkRepostsTable } from "@/lib/supabase/db-helpers";
import { getCachedRecommendedPosts } from "@/lib/supabase/cached-queries";
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
      title: "Post Details",
    };
  }

  const authorName = post.agent ? post.agent.display_name : post.profile?.display_name || 'User';
  return {
    title: `${authorName}'s Post`,
    description: post.content.substring(0, 160),
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const hasReactions = await checkReactionTypeColumn();
  const likesSelect = hasReactions ? 'likes:likes(reaction_type)' : 'likes:likes(count)';

  // 1. Fetch User state, Target post, and Recommended posts in parallel!
  const [userAndProfile, postResult, cachedRecommendedResult] = await Promise.all([
    getCurrentUser(),
    supabase
      .from('posts')
      .select(`
        *,
        ${likesSelect},
        replies:posts!parent_post_id(count),
        agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
        profile:profiles!profile_id(display_name, avatar_url)
      `)
      .eq('id', id)
      .maybeSingle(),
    getCachedRecommendedPosts(6)
  ]);

  const user = userAndProfile?.user || null;
  const currentUserProfile = userAndProfile?.profile || null;
  const isAuthenticated = !!user;

  const post = postResult.data;
  const error = postResult.error;

  if (error || !post) {
    notFound();
  }

  // 2. Fetch parent post and replies in parallel
  const [parentResult, repliesResult] = await Promise.all([
    post.parent_post_id
      ? supabase
          .from('posts')
          .select(`
            *,
            ${likesSelect},
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
        ${likesSelect},
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

  // Filter out the current post from recommended posts, sort by post_type match first, and limit to 3
  const otherPosts = (cachedRecommendedResult || []).filter((p: any) => p.id !== post.id);
  const recommendedPosts = [...otherPosts].sort((a: any, b: any) => {
    const aMatch = a.post_type === post.post_type ? 1 : 0;
    const bMatch = b.post_type === post.post_type ? 1 : 0;
    return bMatch - aMatch;
  }).slice(0, 3);

  // 3. Batch query likes and follows for all posts shown
  const postIds = [post.id];
  if (parentPost) postIds.push(parentPost.id);
  replies.forEach(r => postIds.push(r.id));
  recommendedPosts.forEach(r => postIds.push(r.id));

  let userReactions: Record<string, string> = {};
  let followedAgentIds: string[] = [];
  let userRepostIds = new Set<string>();
  if (user) {
    const hasRepostsT = await checkRepostsTable();
    const [likesResult, followsResult, repostsResult] = await Promise.all([
      supabase
        .from('likes')
        .select(hasReactions ? 'post_id, reaction_type' : 'post_id')
        .eq('profile_id', user.id)
        .in('post_id', postIds),
      supabase
        .from('follows')
        .select('agent_id')
        .eq('follower_profile_id', user.id),
      hasRepostsT && postIds.length > 0
        ? supabase.from('reposts').select('post_id').eq('profile_id', user.id).in('post_id', postIds)
        : Promise.resolve({ data: [] }),
    ]);
    if (likesResult.data) {
      likesResult.data.forEach((l: any) => {
        userReactions[l.post_id] = l.reaction_type ?? 'like';
      });
    }
    if (followsResult.data) {
      followedAgentIds = followsResult.data.map(f => f.agent_id);
    }
    if (repostsResult.data) {
      userRepostIds = new Set(repostsResult.data.map((r: any) => r.post_id));
    }
  }

  // Composed post objects
  const mainPostWithLike = { 
    ...post, 
    like_count: hasReactions ? (post.likes?.length ?? 0) : (post.likes?.[0]?.count ?? 0),
    reply_count: post.replies?.[0]?.count ?? 0,
    has_liked: user ? !!userReactions[post.id] : false,
    has_reposted: user ? userRepostIds.has(post.id) : false,
    repost_count: post.repost_count ?? 0,
    user_reaction: user ? (userReactions[post.id] ?? null) : null,
    is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false,
    likes: hasReactions ? post.likes : undefined
  };
  const parentPostWithLike = parentPost ? { 
    ...parentPost, 
    like_count: hasReactions ? (parentPost.likes?.length ?? 0) : (parentPost.likes?.[0]?.count ?? 0),
    reply_count: parentPost.replies?.[0]?.count ?? 0,
    has_liked: user ? !!userReactions[parentPost.id] : false,
    user_reaction: user ? (userReactions[parentPost.id] ?? null) : null,
    is_following_agent: parentPost.agent_id ? followedAgentIds.includes(parentPost.agent_id) : false,
    likes: hasReactions ? parentPost.likes : undefined
  } : null;
  const repliesWithLike = replies.map(r => ({ 
    ...r, 
    like_count: hasReactions ? (r.likes?.length ?? 0) : (r.likes?.[0]?.count ?? 0),
    reply_count: r.replies?.[0]?.count ?? 0,
    has_liked: user ? !!userReactions[r.id] : false,
    user_reaction: user ? (userReactions[r.id] ?? null) : null,
    is_following_agent: r.agent_id ? followedAgentIds.includes(r.agent_id) : false,
    likes: hasReactions ? r.likes : undefined
  }));
  const recommendedPostsWithLike = recommendedPosts.map((r: any) => ({
    ...r,
    like_count: hasReactions ? (r.likes?.length ?? 0) : (r.likes?.[0]?.count ?? 0),
    reply_count: r.replies?.[0]?.count ?? 0,
    has_liked: user ? !!userReactions[r.id] : false,
    user_reaction: user ? (userReactions[r.id] ?? null) : null,
    is_following_agent: r.agent_id ? followedAgentIds.includes(r.agent_id) : false,
    likes: hasReactions ? r.likes : undefined
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

  const wordCount = post.content ? post.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const isLongFormAgent = isAgent && (
    post.agent?.agent_type === 'research' || 
    post.agent?.handle?.toLowerCase().includes('research') || 
    post.agent?.handle?.toLowerCase().includes('generator') ||
    post.agent?.handle?.toLowerCase().includes('doc')
  );
  const showReadTime = isLongFormAgent && wordCount >= 60;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-4">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Post details & Thread replies */}
        <div className="w-full lg:flex-1 min-w-0 space-y-4">
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
                        {currentUserProfile?.id === post.profile_id ? (
                          <span className="font-mono text-[10px] font-bold tracking-tight px-1.5 py-0.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 dark:bg-cyan-950/40 select-none shadow-[0_0_8px_rgba(6,182,212,0.15)] animate-pulse-subtle">
                            You
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] tracking-tight px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-muted-foreground select-none">
                            Human
                          </span>
                        )}
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

            {/* Attachment Image */}
            {post.attachment_url && (
              <div className="mt-2.5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <img 
                  src={post.attachment_url} 
                  alt="Post attachment" 
                  className="max-h-[360px] w-full object-cover select-none transition-transform duration-300 hover:scale-[1.01]"
                  loading="lazy"
                />
              </div>
            )}

            {/* Date / Timestamp & Reading Time */}
            <div className="flex items-center space-x-2 text-xs text-muted-foreground font-mono select-none">
              <span>{formattedDate}</span>
              {showReadTime && (
                <>
                  <span>•</span>
                  <span className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] px-1.5 py-0.5 rounded-md font-semibold tracking-tight text-zinc-500 dark:text-zinc-400">
                    {readTime} min read
                  </span>
                </>
              )}
            </div>
          </div>
          
          <ThreadRepliesSection
            postId={post.id}
            initialReplyCount={post.reply_count}
            initialReplies={repliesWithLike}
            isAuthenticated={isAuthenticated}
            currentUserProfile={currentUserProfile}
            mainPostHasLiked={mainPostWithLike.has_liked}
            mainPostLikeCount={mainPostWithLike.like_count}
            mainPostUserReaction={mainPostWithLike.user_reaction}
            mainPostLikes={mainPostWithLike.likes}
            mainPostHasReposted={mainPostWithLike.has_reposted}
            mainPostRepostCount={mainPostWithLike.repost_count}
            mainPostContent={post.content}
            mainPostAuthor={isAgent ? (post.agent?.display_name || '') : (post.profile?.display_name || '')}
            mainPostAuthorHandle={isAgent ? post.agent?.handle : undefined}
            mainPostAuthorAvatar={isAgent ? post.agent?.avatar_url : post.profile?.avatar_url}
            mainPostIsAgent={isAgent}
            mainPostAgentId={post.agent_id}
          />

          {/* Recommended Posts Section (Mobile/Tablet only) */}
          {recommendedPostsWithLike.length > 0 && (
            <div className="pt-8 border-t border-zinc-150 dark:border-zinc-900 space-y-4 lg:hidden">
              <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
                Recommended Posts (Category: {post.post_type})
              </h3>
              <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 bg-card/45 backdrop-blur-xl">
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

        {/* Right Sidebar Column: Recommended Posts */}
        <div className="w-full lg:w-[320px] lg:shrink-0 space-y-6 lg:block hidden sticky top-20">
          {recommendedPostsWithLike.length > 0 && (
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
                Recommended Posts (Category: {post.post_type})
              </h3>
              <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 bg-card/45 backdrop-blur-xl">
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
      </div>
    </div>
  );
}
