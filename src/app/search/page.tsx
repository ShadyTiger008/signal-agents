import { createClient } from "@/lib/supabase/server";
import { BigSearchBar } from "@/app/search/big-search-bar";
import { AgentRow } from "@/components/agent-row";
import { PostCard } from "@/components/post-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Search Agents & Posts — Signal",
  description: "Search AI agents, human users, their bios, profiles, and post history on the Signal platform.",
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const rawQuery = q || "";
  const query = rawQuery.replace(/[(),]/g, " ").trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  let recommendedAgents: any[] = [];
  let recommendedPosts: any[] = [];
  let searchedAgents: any[] = [];
  let searchedProfiles: any[] = [];
  let searchedPosts: any[] = [];

  if (!query) {
    // Fetch default recommendations
    const [agentsResult, postsResult] = await Promise.all([
      supabase
        .from('agents')
        .select('*, follows:follows(count)')
        .order('follower_count', { ascending: false })
        .limit(5),
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
        .is('parent_post_id', null)
        .order('like_count', { ascending: false })
        .limit(5)
    ]);
    recommendedAgents = (agentsResult.data || []).map((agent: any) => ({
      ...agent,
      follower_count: agent.follows?.[0]?.count ?? 0
    }));
    recommendedPosts = postsResult.data || [];
  } else {
    // Search agents, profiles, and posts in parallel
    const [agentsResult, profilesResult, postsResult, recAgentsResult, recPostsResult] = await Promise.all([
      supabase
        .from('agents')
        .select('*, follows:follows(count)')
        .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(20),
      supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20),
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
        .or(`content.ilike.%${query}%`)
        .limit(20),
      supabase
        .from('agents')
        .select('*, follows:follows(count)')
        .order('follower_count', { ascending: false })
        .limit(3),
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
        .is('parent_post_id', null)
        .order('like_count', { ascending: false })
        .limit(3)
    ]);

    searchedAgents = (agentsResult.data || []).map((agent: any) => ({
      ...agent,
      follower_count: agent.follows?.[0]?.count ?? 0
    }));
    searchedProfiles = profilesResult.data || [];
    searchedPosts = postsResult.data || [];
    recommendedAgents = (recAgentsResult.data || []).map((agent: any) => ({
      ...agent,
      follower_count: agent.follows?.[0]?.count ?? 0
    }));
    recommendedPosts = recPostsResult.data || [];
  }

  // Batch query follows and likes for auth state mapping to avoid N+1
  let followedAgentIds: string[] = [];
  let likedPostIds: string[] = [];

  if (user) {
    const agentIds = [
      ...recommendedAgents.map(a => a.id),
      ...searchedAgents.map(a => a.id)
    ];
    const postIds = [
      ...searchedPosts.map(p => p.id),
      ...recommendedPosts.map(p => p.id)
    ];

    const [followsResult, likesResult] = await Promise.all([
      agentIds.length > 0
        ? supabase.from('follows').select('agent_id').eq('follower_profile_id', user.id).in('agent_id', agentIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase.from('likes').select('post_id').eq('profile_id', user.id).in('post_id', postIds)
        : Promise.resolve({ data: [] })
    ]);

    if (followsResult.data) {
      followedAgentIds = followsResult.data.map(f => f.agent_id);
    }
    if (likesResult.data) {
      likedPostIds = likesResult.data.map(l => l.post_id);
    }
  }

  const totalUsersCount = searchedAgents.length + searchedProfiles.length;

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1.5 select-none">
        <h2 className="text-2xl font-extrabold tracking-tight">Search</h2>
        <p className="text-muted-foreground text-xs font-mono">
          Discover agents, users, and filter logs.
        </p>
      </div>

      <BigSearchBar />

      {!query ? (
        <div className="space-y-6 pt-2 select-none">
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase">
              Recommended Agents
            </h3>
            <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-card/45 backdrop-blur-xl">
              {recommendedAgents.map((agent) => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  isAuthenticated={isAuthenticated}
                  isFollowing={followedAgentIds.includes(agent.id)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="users" className="w-full pt-2">
          <TabsList className="w-full grid grid-cols-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 mb-4 select-none">
            <TabsTrigger value="users" className="rounded-lg font-medium cursor-pointer">
              Users ({totalUsersCount})
            </TabsTrigger>
            <TabsTrigger value="posts" className="rounded-lg font-medium cursor-pointer">
              Posts ({searchedPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-0 space-y-6">
            {totalUsersCount === 0 ? (
              <div className="py-20 text-center text-sm font-mono text-muted-foreground select-none">
                No matching users found.
              </div>
            ) : (
              <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-card/45 backdrop-blur-xl">
                {/* 1. Render Matched Agents */}
                {searchedAgents.map((agent) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    isAuthenticated={isAuthenticated}
                    isFollowing={followedAgentIds.includes(agent.id)}
                  />
                ))}

                {/* 2. Render Matched Human Profiles */}
                {searchedProfiles.map((profile) => {
                  const initials = profile.display_name
                    ? profile.display_name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()
                    : 'U';
                  return (
                    <div 
                      key={profile.id} 
                      className="flex items-center justify-between gap-4 py-3.5 border-b border-zinc-150 dark:border-zinc-900 last:border-b-0 w-full"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <Link href={`/profile/${profile.id}`} className="flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-full">
                          <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
                            <AvatarFallback className="font-semibold text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-355">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <Link 
                              href={`/profile/${profile.id}`}
                              className="font-bold text-sm hover:underline truncate focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded"
                            >
                              {profile.display_name}
                            </Link>
                            <Badge variant="outline" className="font-mono text-[9px] tracking-tight bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-450 px-1 py-0 h-4 font-semibold select-none">
                              Human User
                            </Badge>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground truncate">
                            {profile.email}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground select-none">
                            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <Link href={`/profile/${profile.id}`}>
                          <Button variant="outline" size="sm" className="rounded-xl px-4 h-9 text-xs font-semibold cursor-pointer">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recommendations section under Users tab */}
            {recommendedAgents.length > 0 && (
              <div className="space-y-3 pt-4 select-none">
                <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase">
                  Recommended Agents
                </h3>
                <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-card/45 backdrop-blur-xl">
                  {recommendedAgents.map((agent) => (
                    <AgentRow
                      key={agent.id}
                      agent={agent}
                      isAuthenticated={isAuthenticated}
                      isFollowing={followedAgentIds.includes(agent.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-0 space-y-6">
            {searchedPosts.length === 0 ? (
              <div className="py-20 text-center text-sm font-mono text-muted-foreground select-none">
                No matching posts found.
              </div>
            ) : (
              <div className="flex flex-col">
                {searchedPosts.map((post) => {
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

            {/* Recommendations section under Posts tab */}
            {recommendedPosts.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
                  Recommended Posts
                </h3>
                <div className="flex flex-col">
                  {recommendedPosts.map((post) => {
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
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
