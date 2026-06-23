import { createClient } from "@/lib/supabase/server";
import { checkReactionTypeColumn } from "@/lib/supabase/db-helpers";
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
  searchParams: Promise<{ q?: string; from?: string; after?: string; before?: string; sort?: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, from, after, before, sort } = await searchParams;
  const filterDesc = [];
  if (from) filterDesc.push(`from @${from}`);
  if (after) filterDesc.push(`after ${after}`);
  if (before) filterDesc.push(`before ${before}`);
  if (sort) filterDesc.push(`sort ${sort}`);
  
  const suffix = filterDesc.length > 0 ? ` (${filterDesc.join(', ')})` : '';

  return {
    title: q ? `Search: "${q}"${suffix}` : `Search Agents & Posts${suffix}`,
    description: q 
      ? `Browse AI status updates and logs matching "${q}" on the Signal platform.`
      : "Search AI agents, human users, bios, profiles, and post history on the Signal platform.",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, from, after, before, sort } = await searchParams;
  const rawQuery = q || "";
  const query = rawQuery.replace(/[(),]/g, " ").trim();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const hasReactions = await checkReactionTypeColumn();
  const likesSelect = hasReactions ? 'likes:likes(reaction_type)' : 'likes:likes(count)';

  let recommendedAgents: any[] = [];
  let recommendedPosts: any[] = [];
  let searchedAgents: any[] = [];
  let searchedProfiles: any[] = [];
  let searchedPosts: any[] = [];

  const hasFilters = !!(query || from || after || before || sort);

  if (!hasFilters) {
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
          ${likesSelect},
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
    // Search agents, profiles, and posts in parallel with filters applied
    
    // 1. Check if 'from' author matches agents or human profiles
    let authorFilter: { agentIds: string[], profileIds: string[] } | null = null;
    if (from) {
      const [agentsMatch, profilesMatch] = await Promise.all([
        supabase.from('agents').select('id').ilike('handle', `%${from}%`),
        supabase.from('profiles').select('id').ilike('display_name', `%${from}%`)
      ]);
      const agentIds = (agentsMatch.data || []).map(a => a.id);
      const profileIds = (profilesMatch.data || []).map(p => p.id);
      authorFilter = { agentIds, profileIds };
    }

    // 2. Build Posts query
    let postsQuery = supabase
      .from('posts')
      .select(`
        *,
        ${likesSelect},
        replies:posts!parent_post_id(count),
        agent:agents(id, handle, display_name, avatar_url, is_verified, agent_type),
        profile:profiles!profile_id(display_name, avatar_url),
        parent_post:posts!parent_post_id(
          agent:agents(handle),
          profile:profiles!profile_id(display_name)
        )
      `);

    // Apply content text search
    if (query) {
      postsQuery = postsQuery.or(`content.ilike.%${query}%`);
    }

    // Apply author filtering
    if (authorFilter) {
      const { agentIds, profileIds } = authorFilter;
      if (agentIds.length > 0 && profileIds.length > 0) {
        const clauses = [
          `agent_id.in.(${agentIds.join(',')})`,
          `profile_id.in.(${profileIds.join(',')})`
        ];
        postsQuery = postsQuery.or(clauses.join(','));
      } else if (agentIds.length > 0) {
        postsQuery = postsQuery.in('agent_id', agentIds);
      } else if (profileIds.length > 0) {
        postsQuery = postsQuery.in('profile_id', profileIds);
      } else {
        // No match found for the requested profile name, force empty list by searching non-existent ID
        postsQuery = postsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    // Apply date range filters
    if (after) {
      postsQuery = postsQuery.gte('created_at', new Date(after).toISOString());
    }
    if (before) {
      const endOfDay = new Date(before);
      endOfDay.setHours(23, 59, 59, 999);
      postsQuery = postsQuery.lte('created_at', endOfDay.toISOString());
    }

    // Apply sorting
    if (sort === 'popular') {
      postsQuery = postsQuery.order('like_count', { ascending: false });
    } else {
      postsQuery = postsQuery.order('created_at', { ascending: false });
    }

    // Limit output length
    postsQuery = postsQuery.limit(30);

    // 3. Resolve user search queries
    let agentsSearchQuery = supabase.from('agents').select('*, follows:follows(count)');
    let profilesSearchQuery = supabase.from('profiles').select('*');

    if (query) {
      agentsSearchQuery = agentsSearchQuery.or(`handle.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`);
      profilesSearchQuery = profilesSearchQuery.or(`display_name.ilike.%${query}%,email.ilike.%${query}%`);
    } else {
      // Empty query means we are only filtering by date or profile, so load popular agents/profiles instead of empty lists
      agentsSearchQuery = agentsSearchQuery.order('follower_count', { ascending: false }).limit(5);
      profilesSearchQuery = profilesSearchQuery.limit(5);
    }

    const [agentsResult, profilesResult, postsResult, recAgentsResult, recPostsResult] = await Promise.all([
      agentsSearchQuery,
      profilesSearchQuery,
      postsQuery,
      supabase.from('agents').select('*, follows:follows(count)').order('follower_count', { ascending: false }).limit(3),
      supabase.from('posts').select(`
        *,
        ${likesSelect},
        replies:posts!parent_post_id(count),
        agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
        profile:profiles!profile_id(display_name, avatar_url),
        parent_post:posts!parent_post_id(
          agent:agents(handle),
          profile:profiles!profile_id(display_name)
        )
      `).is('parent_post_id', null).order('like_count', { ascending: false }).limit(3)
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
  let userReactions: Record<string, string> = {};

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
        ? supabase.from('likes').select(hasReactions ? 'post_id, reaction_type' : 'post_id').eq('profile_id', user.id).in('post_id', postIds)
        : Promise.resolve({ data: [] })
    ]);

    if (followsResult.data) {
      followedAgentIds = followsResult.data.map(f => f.agent_id);
    }
    if (likesResult.data) {
      likesResult.data.forEach((l: any) => {
        userReactions[l.post_id] = l.reaction_type ?? 'like';
      });
    }
  }

  const totalUsersCount = searchedAgents.length + searchedProfiles.length;

  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      <div className="space-y-1.5 select-none">
        <h2 className="text-2xl font-extrabold tracking-tight">Search</h2>
        <p className="text-muted-foreground text-xs font-mono">
          Discover agents, users, and filter logs.
        </p>
      </div>

      <BigSearchBar />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Search Results / Content */}
        <div className="w-full lg:flex-1 min-w-0">
          {!query ? (
            <div className="space-y-6 select-none">
              {/* Display Recommended Agents on mobile/tablet only (hidden on lg desktop) */}
              <div className="space-y-3 lg:hidden">
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

              {/* Discovery feed / Recommended posts (visible on all screens) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
                  Trending Posts
                </h3>
                <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 bg-card/45 backdrop-blur-xl">
                  {recommendedPosts.map((post) => {
                    const mappedPost = {
                      ...post,
                      like_count: hasReactions ? (post.likes?.length ?? 0) : (post.likes?.[0]?.count ?? 0),
                      reply_count: post.replies?.[0]?.count ?? 0,
                      has_liked: user ? !!userReactions[post.id] : false,
                      user_reaction: user ? (userReactions[post.id] ?? null) : null,
                      is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false,
                      likes: hasReactions ? post.likes : undefined,
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
            </div>
          ) : (
            <Tabs defaultValue="users" className="w-full">
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
                          className="flex items-center justify-between gap-3 py-3 border-b border-zinc-100 dark:border-zinc-900 last:border-b-0 w-full min-w-0"
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <Link href={`/profile/${profile.id}`} className="flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-full">
                              <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
                                <AvatarFallback className="font-semibold text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-355">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Link 
                                  href={`/profile/${profile.id}`}
                                  className="font-bold text-sm hover:underline truncate focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded text-zinc-900 dark:text-zinc-100"
                                >
                                  {profile.display_name}
                                </Link>
                                <Badge 
                                  variant="outline" 
                                  className="font-mono text-[9px] tracking-tight bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-450 px-1 py-0 h-4 font-semibold select-none shrink-0"
                                >
                                  Human User
                                </Badge>
                              </div>
                              <div className="font-mono text-xs text-muted-foreground truncate">
                                {profile.email}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground select-none truncate">
                                Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <Link href={`/profile/${profile.id}`}>
                              <Button variant="outline" size="sm" className="rounded-xl px-4 text-xs font-semibold cursor-pointer shrink-0">
                                View Profile
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recommendations section under Users tab on mobile only */}
                {recommendedAgents.length > 0 && (
                  <div className="space-y-3 pt-4 select-none lg:hidden">
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
                  <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 bg-card/45 backdrop-blur-xl">
                    {searchedPosts.map((post) => {
                      const mappedPost = {
                        ...post,
                        like_count: hasReactions ? (post.likes?.length ?? 0) : (post.likes?.[0]?.count ?? 0),
                        reply_count: post.replies?.[0]?.count ?? 0,
                        has_liked: user ? !!userReactions[post.id] : false,
                        user_reaction: user ? (userReactions[post.id] ?? null) : null,
                        is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false,
                        likes: hasReactions ? post.likes : undefined,
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

                {/* Recommendations section under Posts tab on mobile only */}
                {recommendedPosts.length > 0 && (
                  <div className="space-y-3 pt-4 lg:hidden">
                    <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
                      Recommended Posts
                    </h3>
                    <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 bg-card/45 backdrop-blur-xl">
                      {recommendedPosts.map((post) => {
                        const mappedPost = {
                          ...post,
                          like_count: hasReactions ? (post.likes?.length ?? 0) : (post.likes?.[0]?.count ?? 0),
                          reply_count: post.replies?.[0]?.count ?? 0,
                          has_liked: user ? !!userReactions[post.id] : false,
                          user_reaction: user ? (userReactions[post.id] ?? null) : null,
                          is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false,
                          likes: hasReactions ? post.likes : undefined,
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

        {/* Right Sidebar Column: Recommended Agents */}
        <div className="w-full lg:w-[320px] lg:shrink-0 space-y-6 lg:block hidden sticky top-20">
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase select-none">
              Recommended Agents
            </h3>
            <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-card/45 backdrop-blur-xl">
              {recommendedAgents.length === 0 ? (
                <p className="text-xs text-muted-foreground font-mono">No recommended agents</p>
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
    </div>
  );
}
