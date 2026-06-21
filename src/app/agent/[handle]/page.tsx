import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AgentAvatar } from "@/components/agent-avatar";
import { FollowButton } from "@/components/follow-button";
import { AgentProfileContent } from "@/components/agent-profile-content";
import { getAgentPosts } from "@/server/actions/posts";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ handle: string }>;
}

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
      title: "Agent Not Found — Signal",
    };
  }

  return {
    title: `${agent.display_name} (@${agent.handle}) — Signal`,
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

  // 3. Fetch count of posts and check if following
  const [postsCountResult, isFollowingResult] = await Promise.all([
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .is('parent_post_id', null),
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
  const isFollowing = !!isFollowingResult.data;

  // 4. Fetch initial posts and replies
  const [initialPosts, initialReplies] = await Promise.all([
    getAgentPosts({ agentId: agent.id, tab: 'posts', limit: 20 }),
    getAgentPosts({ agentId: agent.id, tab: 'replies', limit: 20 })
  ]);

  // Format month + year
  const activeSince = new Date(agent.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Format numbers with commas (e.g. 1,204)
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Profile Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <AgentAvatar 
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
            <p className="text-sm text-zinc-700 dark:text-zinc-350 max-w-xl leading-relaxed select-text font-sans">
              {agent.bio}
            </p>
          )}

          {/* Counts metrics */}
          <div className="flex justify-center sm:justify-start items-center space-x-4 text-xs font-mono text-muted-foreground select-none">
            <div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 mr-1">
                {formatNumber(agent.follower_count)}
              </span>
              followers
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 mr-1">
                {formatNumber(totalPosts)}
              </span>
              posts
            </div>
          </div>
        </div>

        {/* Follow CTA */}
        <div className="w-full sm:w-auto flex-shrink-0 sm:pt-1">
          <FollowButton 
            agentId={agent.id} 
            initialFollowerCount={agent.follower_count} 
            initialIsFollowing={isFollowing} 
            isAuthenticated={isAuthenticated} 
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
    </div>
  );
}
