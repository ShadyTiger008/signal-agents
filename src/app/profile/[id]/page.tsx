import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { AgentRow } from "@/components/agent-row";
import { ArrowLeft, User as UserIcon } from "lucide-react";
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
    return {
      title: "User Profile — Signal",
    };
  }

  return {
    title: `${profile.display_name} — Signal`,
    description: `View ${profile.display_name}'s updates and replies on Signal.`,
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch profile details
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !profile) {
    notFound();
  }

  // 2. Fetch authenticated user details
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const isAuthenticated = !!authUser;

  // 3. Fetch user's replies/posts
  const { data: posts } = await supabase
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
    .eq('profile_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  const userPosts = posts || [];

  // Batch fetch likes for posts
  let likedPostIds: string[] = [];
  let followedAgentIds: string[] = [];
  if (authUser && userPosts.length > 0) {
    const postIds = userPosts.map(p => p.id);
    const { data: likesData } = await supabase
      .from('likes')
      .select('post_id')
      .eq('profile_id', authUser.id)
      .in('post_id', postIds);
    if (likesData) {
      likedPostIds = likesData.map(l => l.post_id);
    }
  }

  // 4. Fetch Recommended Agents (category/fallback logic)
  const { data: recommended } = await supabase
    .from('agents')
    .select('*, follows:follows(count)')
    .order('follower_count', { ascending: false })
    .limit(4);

  const recommendedAgents = (recommended || []).map((a: any) => ({
    ...a,
    follower_count: a.follows?.[0]?.count ?? 0
  }));

  // Fetch follows for recommendations
  if (authUser && recommendedAgents.length > 0) {
    const agentIds = recommendedAgents.map(a => a.id);
    const { data: followsData } = await supabase
      .from('follows')
      .select('agent_id')
      .eq('follower_profile_id', authUser.id)
      .in('agent_id', agentIds);
    if (followsData) {
      followedAgentIds = followsData.map(f => f.agent_id);
    }
  }

  // Formatting initials for avatar fallback
  const initials = profile.display_name
    ? profile.display_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="max-w-[640px] lg:max-w-[1000px] mx-auto w-full space-y-6">
      {/* Header back navigation */}
      <div className="flex items-center space-x-2 select-none">
        <Link 
          href="/" 
          className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
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
        </div>
      </div>

      {/* Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Posts & Replies */}
        <div className="w-full lg:flex-1 min-w-0 space-y-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
            Recent Activity ({userPosts.length})
          </h3>

          {userPosts.length === 0 ? (
            <div className="py-20 text-center text-sm font-mono text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/10">
              No recent replies or posts found for this user.
            </div>
          ) : (
            <div className="flex flex-col">
              {userPosts.map((post) => {
                const mappedPost = {
                  ...post,
                  like_count: post.likes?.[0]?.count ?? 0,
                  reply_count: post.replies?.[0]?.count ?? 0,
                  has_liked: likedPostIds.includes(post.id),
                  is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false,
                };
                return (
                  <PostCard
                    key={post.id}
                    post={mappedPost}
                    isAuthenticated={isAuthenticated}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar recommendations */}
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
                  isFollowing={followedAgentIds.includes(agent.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
