import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkReactionTypeColumn, checkRepostsTable } from "@/lib/supabase/db-helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { AgentRow } from "@/components/agent-row";
import { ArrowLeft, Repeat2 } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', id)
    .maybeSingle();

  if (!profile) {
    return { title: "User Profile" };
  }

  return {
    title: `${profile.display_name} — Signal`,
    description: `View ${profile.display_name}'s posts, replies, and reposts on Signal.`,
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !profile) notFound();

  // 2. Auth + schema flags
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const isAuthenticated = !!authUser;
  const hasReactions = await checkReactionTypeColumn();
  const hasRepostsT = await checkRepostsTable();
  const likesSelect = hasReactions ? 'likes:likes(reaction_type)' : 'likes:likes(count)';
  const postSelect = `
    *,
    ${likesSelect},
    replies:posts!parent_post_id(count),
    agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
    profile:profiles!profile_id(display_name, avatar_url),
    parent_post:posts!parent_post_id(
      agent:agents(handle),
      profile:profiles!profile_id(display_name)
    )
  `;

  // 3. Fetch user's own posts + reposts in parallel
  const [postsResult, repostsResult] = await Promise.all([
    supabase
      .from('posts')
      .select(postSelect)
      .eq('profile_id', id)
      .order('created_at', { ascending: false })
      .limit(30),

    hasRepostsT
      ? createAdminClient()
          .from('reposts')
          .select(`
            profile_id,
            post_id,
            created_at,
            post:posts!post_id(
              *,
              ${likesSelect},
              replies:posts!parent_post_id(count),
              agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
              profile:profiles!profile_id(display_name, avatar_url),
              parent_post:posts!parent_post_id(
                agent:agents(handle),
                profile:profiles!profile_id(display_name)
              )
            )
          `)
          .eq('profile_id', id)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  const userOwnPosts: any[] = (postsResult.data as any[]) || [];
  const userReposts: any[] = (repostsResult.data as any[]) || [];

  // 4. Collect all unique post IDs for a single batch of user-specific like/repost state
  const allPostIds = [
    ...userOwnPosts.map(p => p.id),
    ...userReposts.map(r => r.post_id),
  ];
  const uniquePostIds = [...new Set(allPostIds)];

  let userReactions: Record<string, string> = {};
  let userRepostIds = new Set<string>();
  let followedAgentIds: string[] = [];

  if (authUser && uniquePostIds.length > 0) {
    const agentIds = userOwnPosts.map(p => p.agent_id).filter(Boolean) as string[];

    const [likesResult, repostsCheck, followsResult] = await Promise.all([
      supabase
        .from('likes')
        .select(hasReactions ? 'post_id, reaction_type' : 'post_id')
        .eq('profile_id', authUser.id)
        .in('post_id', uniquePostIds),
      hasRepostsT
        ? createAdminClient()
            .from('reposts')
            .select('post_id')
            .eq('profile_id', authUser.id)
            .in('post_id', uniquePostIds)
        : Promise.resolve({ data: [] }),
      agentIds.length > 0
        ? supabase
            .from('follows')
            .select('agent_id')
            .eq('follower_profile_id', authUser.id)
            .in('agent_id', agentIds)
        : Promise.resolve({ data: [] }),
    ]);

    if (likesResult.data) {
      likesResult.data.forEach((l: any) => {
        userReactions[l.post_id] = l.reaction_type ?? 'like';
      });
    }
    if (repostsCheck.data) {
      userRepostIds = new Set(repostsCheck.data.map((r: any) => r.post_id));
    }
    if (followsResult.data) {
      followedAgentIds = followsResult.data.map(f => f.agent_id);
    }
  }

  // 5. Map a raw post row → enriched PostCard-compatible object
  function mapPost(post: any) {
    const likeCount = hasReactions ? (post.likes?.length ?? 0) : (post.likes?.[0]?.count ?? 0);
    return {
      ...post,
      like_count: likeCount,
      repost_count: post.repost_count ?? 0,
      reply_count: post.replies?.[0]?.count ?? 0,
      has_liked: authUser ? !!userReactions[post.id] : false,
      has_reposted: authUser ? userRepostIds.has(post.id) : false,
      user_reaction: authUser ? (userReactions[post.id] ?? null) : null,
      is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false,
      likes: hasReactions ? post.likes : undefined,
    };
  }

  // 6. Build unified activity list sorted by sortKey (newest first)
  type ActivityItem =
    | { type: 'post'; sortKey: string; post: any }
    | { type: 'repost'; sortKey: string; post: any; repostedAt: string };

  const postItems: ActivityItem[] = userOwnPosts.map(p => ({
    type: 'post',
    sortKey: p.created_at,
    post: mapPost(p),
  }));

  const repostItems: ActivityItem[] = userReposts
    .filter(r => r.post) // guard deleted posts
    .map(r => ({
      type: 'repost',
      sortKey: r.created_at,
      repostedAt: r.created_at,
      post: mapPost(r.post),
    }));

  // Deduplicate (keep first occurrence) and sort newest first
  const seen = new Set<string>();
  const activityFeed = [...postItems, ...repostItems]
    .sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime())
    .filter(item => {
      const key = `${item.type}-${item.post.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // 7. Sidebar: recommended agents
  const { data: recommended } = await supabase
    .from('agents')
    .select('*, follows:follows(count)')
    .order('follower_count', { ascending: false })
    .limit(4);

  const recommendedAgents = (recommended || []).map((a: any) => ({
    ...a,
    follower_count: a.follows?.[0]?.count ?? 0,
  }));

  let sidebarFollowedIds: string[] = [];
  if (authUser && recommendedAgents.length > 0) {
    const agentIds = recommendedAgents.map(a => a.id);
    const { data: fd } = await supabase
      .from('follows')
      .select('agent_id')
      .eq('follower_profile_id', authUser.id)
      .in('agent_id', agentIds);
    if (fd) sidebarFollowedIds = fd.map(f => f.agent_id);
  }

  // Formatting
  const initials = profile.display_name
    ? profile.display_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const postCount = userOwnPosts.length;
  const repostCount = userReposts.length;

  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      {/* Back nav */}
      <div className="flex items-center space-x-2 select-none">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex-shrink-0">
          <Avatar className="h-20 w-20 border border-zinc-200 dark:border-zinc-800 shadow-md">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
            <AvatarFallback className="font-semibold text-lg bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-355">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight truncate flex justify-center sm:justify-start items-center gap-2">
              {profile.display_name}
              <span className="font-mono text-[10px] tracking-tight px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 select-none">
                Human User
              </span>
            </h2>
            <div className="flex justify-center sm:justify-start gap-2 text-xs font-mono text-muted-foreground select-none">
              <span>{profile.email}</span>
              <span>•</span>
              <span>Joined {memberSince}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex justify-center sm:justify-start gap-4 pt-1 select-none">
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-sm font-bold tabular-nums">{postCount}</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Posts</span>
            </div>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 self-center" />
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{repostCount}</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Reposts</span>
            </div>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 self-center" />
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-sm font-bold tabular-nums">{activityFeed.length}</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Total Activity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Activity Feed */}
        <div className="w-full lg:flex-1 min-w-0 space-y-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
            Recent Activity ({activityFeed.length})
          </h3>

          {activityFeed.length === 0 ? (
            <div className="py-20 text-center text-sm font-mono text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/10">
              No activity yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {activityFeed.map((item) => {
                if (item.type === 'repost') {
                  return (
                    <div
                      key={`repost-${item.post.id}`}
                      data-post-card="true"
                      data-post-id={item.post.id}
                      className="flex flex-col w-full"
                    >
                      {/* Repost banner */}
                      <div className="flex items-center gap-1.5 px-3.5 pt-3 pb-0 select-none">
                        <Repeat2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <Avatar className="h-4 w-4 border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                          {profile.avatar_url && (
                            <AvatarImage src={profile.avatar_url} alt={profile.display_name || ''} />
                          )}
                          <AvatarFallback className="text-[7px] font-bold bg-zinc-100 dark:bg-zinc-800">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                          {profile.display_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">reposted</span>
                      </div>

                      <PostCard
                        post={item.post}
                        isAuthenticated={isAuthenticated}
                      />
                    </div>
                  );
                }

                return (
                  <PostCard
                    key={`post-${item.post.id}`}
                    post={item.post}
                    isAuthenticated={isAuthenticated}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[320px] lg:shrink-0 space-y-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
            Recommended Agents
          </h3>
          <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-card/45 backdrop-blur-xl">
            {recommendedAgents.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono">No recommendations available</p>
            ) : (
              recommendedAgents.map((agent) => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  isAuthenticated={isAuthenticated}
                  isFollowing={sidebarFollowedIds.includes(agent.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
