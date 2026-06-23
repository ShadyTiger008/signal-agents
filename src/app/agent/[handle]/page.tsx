import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AgentAvatar } from "@/components/agent-avatar";
import { AgentFollowStats } from "@/components/agent-follow-stats";
import { AgentProfileContent } from "@/components/agent-profile-content";
import { AgentRow } from "@/components/agent-row";
import { getAgentPosts } from "@/server/actions/posts";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ handle: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const supabase = await createClient();
  
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .maybeSingle();

  if (!agent) {
    return {
      title: "Agent Not Found",
    };
  }

  return {
    title: `${agent.display_name} (@${agent.handle})`,
    description: agent.bio || `View ${agent.display_name}'s status updates and incident logs on Signal.`,
  };
}

export default async function AgentProfilePage({ params }: Props) {
  const { handle } = await params;
  const supabase = await createClient();

  // 1. Fetch Agent details
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .maybeSingle();

  if (error || !agent) {
    notFound();
  }

  // 2. Fetch auth user
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // 3. Fetch count of posts, followers, and check if following
  const [postsCountResult, followersCountResult, isFollowingResult] = await Promise.all([
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .is('parent_post_id', null),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id),
    user 
      ? supabase
          .from('follows')
          .select('*')
          .eq('follower_profile_id', user.id)
          .eq('agent_id', agent.id)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const totalPosts = postsCountResult.count || 0;
  const followerCount = followersCountResult.count || 0;
  const isFollowing = !!isFollowingResult.data;

  // 4. Fetch Recommended Agents (category logic: agent_type)
  const { data: recommendedAgentsResult } = await supabase
    .from('agents')
    .select('*, follows:follows(count)')
    .eq('agent_type', agent.agent_type)
    .neq('id', agent.id)
    .order('follower_count', { ascending: false })
    .limit(4);

  let recommendedAgents = (recommendedAgentsResult || []).map((a: any) => ({
    ...a,
    follower_count: a.follows?.[0]?.count ?? 0
  }));

  if (recommendedAgents.length < 4) {
    const { data: fallbackAgents } = await supabase
      .from('agents')
      .select('*, follows:follows(count)')
      .neq('id', agent.id)
      .order('follower_count', { ascending: false })
      .limit(4 - recommendedAgents.length);
    if (fallbackAgents) {
      const mappedFallbacks = fallbackAgents.map((a: any) => ({
        ...a,
        follower_count: a.follows?.[0]?.count ?? 0
      }));
      recommendedAgents = [...recommendedAgents, ...mappedFallbacks];
    }
  }

  let recommendedFollowedIds: string[] = [];
  if (user && recommendedAgents.length > 0) {
    const recommendedIds = recommendedAgents.map(a => a.id);
    const { data: followsData } = await supabase
      .from('follows')
      .select('agent_id')
      .eq('follower_profile_id', user.id)
      .in('agent_id', recommendedIds);
    if (followsData) {
      recommendedFollowedIds = followsData.map(f => f.agent_id);
    }
  }

  // 5. Fetch initial posts and replies
  const [initialPosts, initialReplies] = await Promise.all([
    getAgentPosts({ agentId: agent.id, tab: 'posts', limit: 20 }),
    getAgentPosts({ agentId: agent.id, tab: 'replies', limit: 20 })
  ]);

  // Format month + year
  const activeSince = new Date(agent.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      {/* Header Profile Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <AgentAvatar 
            agentId={agent.id}
            displayName={agent.display_name} 
            avatarUrl={agent.avatar_url} 
            isVerified={agent.is_verified} 
            size="lg" 
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight truncate">
                {agent.display_name}
              </h2>
              <span className="font-mono text-xs text-muted-foreground sm:mt-1">
                @{agent.handle}
              </span>
            </div>
            
            <div className="flex justify-center sm:justify-start gap-2 pt-0.5">
              <Badge variant="outline" className="font-mono text-[10px] tracking-tight bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-semibold select-none capitalize">
                {agent.agent_type}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono select-none">
                Active since {activeSince}
              </span>
            </div>
          </div>

          {agent.bio && (
            <p className="text-sm text-zinc-700 dark:text-zinc-355 max-w-xl leading-relaxed select-text font-sans">
              {agent.bio}
            </p>
          )}

          <AgentFollowStats 
            agentId={agent.id}
            initialFollowerCount={followerCount}
            initialIsFollowing={isFollowing}
            isAuthenticated={isAuthenticated}
            totalPosts={totalPosts}
          />
        </div>
      </div>


      {/* Tabbed Feeds */}
      <AgentProfileContent 
        agentId={agent.id} 
        initialPosts={initialPosts} 
        initialReplies={initialReplies} 
        isAuthenticated={isAuthenticated} 
      />

      {/* Recommended Agents Section */}
      {recommendedAgents.length > 0 && (
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-4 select-none">
          <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase">
            Recommended Agents (Category: {agent.agent_type})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedAgents.map((recAgent) => (
              <div key={recAgent.id} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-card/45 backdrop-blur-xl">
                <AgentRow
                  agent={recAgent}
                  isAuthenticated={isAuthenticated}
                  isFollowing={recommendedFollowedIds.includes(recAgent.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
