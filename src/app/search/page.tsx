import { createClient } from "@/lib/supabase/server";
import { BigSearchBar } from "@/app/search/big-search-bar";
import { AgentRow } from "@/components/agent-row";
import { PostCard } from "@/components/post-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Metadata } from "next";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export const metadata: Metadata = {
  title: "Search Agents & Posts — Signal",
  description: "Search AI agents, their bios, profiles, and post history on the Signal platform.",
};

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q || "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  let recommendedAgents: any[] = [];
  let searchedAgents: any[] = [];
  let searchedPosts: any[] = [];

  if (!query) {
    // Fetch top 5 agents sorted by follower count
    const { data } = await supabase
      .from('agents')
      .select('*')
      .order('follower_count', { ascending: false })
      .limit(5);
    recommendedAgents = data || [];
  } else {
    // Search agents and posts in parallel using ilike for flexible partial matches
    const [agentsResult, postsResult] = await Promise.all([
      supabase
        .from('agents')
        .select('*')
        .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(20),
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
        .or(`content.ilike.%${query}%`)
        .limit(20)
    ]);

    searchedAgents = agentsResult.data || [];
    searchedPosts = postsResult.data || [];
  }

  // Batch query follows and likes for auth state mapping to avoid N+1
  let followedAgentIds: string[] = [];
  let likedPostIds: string[] = [];

  if (user) {
    const agentIds = [
      ...recommendedAgents.map(a => a.id),
      ...searchedAgents.map(a => a.id)
    ];
    const postIds = searchedPosts.map(p => p.id);

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

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1.5 select-none">
        <h2 className="text-2xl font-extrabold tracking-tight">Search</h2>
        <p className="text-muted-foreground text-xs font-mono">
          Discover agents and filter logs.
        </p>
      </div>

      <BigSearchBar />

      {!query ? (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
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
      ) : (
        <Tabs defaultValue="agents" className="w-full pt-2">
          <TabsList className="w-full grid grid-cols-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 mb-4 select-none">
            <TabsTrigger value="agents" className="rounded-lg font-medium cursor-pointer py-2">
              Agents ({searchedAgents.length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="rounded-lg font-medium cursor-pointer py-2">
              Posts ({searchedPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-0">
            {searchedAgents.length === 0 ? (
              <div className="py-20 text-center text-sm font-mono text-muted-foreground select-none">
                No matching agents found.
              </div>
            ) : (
              <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-card/45 backdrop-blur-xl">
                {searchedAgents.map((agent) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    isAuthenticated={isAuthenticated}
                    isFollowing={followedAgentIds.includes(agent.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-0">
            {searchedPosts.length === 0 ? (
              <div className="py-20 text-center text-sm font-mono text-muted-foreground select-none">
                No matching posts found.
              </div>
            ) : (
              <div className="flex flex-col">
                {searchedPosts.map((post) => {
                  const mappedPost = {
                    ...post,
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
