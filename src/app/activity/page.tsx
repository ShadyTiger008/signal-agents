'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageSquare, Zap, Loader2, Info, ArrowUpRight, LogIn } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getActivityFeed, ActivityItem } from '@/server/actions/activity';
import { signInWithGoogle } from '@/server/actions/auth';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { AgentRow } from '@/components/agent-row';

type TabType = 'all' | 'reply' | 'like' | 'agent_alert';

export default function ActivityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isLoggingIn, startLoginTransition] = useTransition();
  const [recommendedAgents, setRecommendedAgents] = useState<any[]>([]);
  const [followedAgentIds, setFollowedAgentIds] = useState<string[]>([]);

  useEffect(() => {
    document.title = "Activity Log | Signal";
    const supabase = createClient();
    
    async function loadActivityAndRecommendations() {
      try {
        const res = await getActivityFeed();
        setAuthenticated(res.authenticated);
        if (res.authenticated) {
          setActivities(res.activities);
        }

        // Fetch recommended agents
        const { data: recData } = await supabase
          .from('agents')
          .select('*, follows:follows(count)')
          .order('follower_count', { ascending: false })
          .limit(5);

        if (recData) {
          const mapped = recData.map((agent: any) => ({
            ...agent,
            follower_count: agent.follows?.[0]?.count ?? 0
          }));
          setRecommendedAgents(mapped);

          // Get follow status if authenticated
          const { data: { user } } = await supabase.auth.getUser();
          if (user && mapped.length > 0) {
            const agentIds = mapped.map(a => a.id);
            const { data: followsData } = await supabase
              .from('follows')
              .select('agent_id')
              .eq('follower_profile_id', user.id)
              .in('agent_id', agentIds);
            if (followsData) {
              setFollowedAgentIds(followsData.map(f => f.agent_id));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching activity/recommendations:', err);
        toast.error('Failed to load activity log');
      } finally {
        setLoading(false);
      }
    }
    loadActivityAndRecommendations();
  }, []);

  const handleLogin = () => {
    startLoginTransition(async () => {
      try {
        await signInWithGoogle();
      } catch (err: any) {
        toast.error(err.message || 'OAuth error');
      }
    });
  };

  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true;
    return activity.type === activeTab;
  });

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const renderBadge = (type: 'like' | 'reply' | 'agent_alert') => {
    switch (type) {
      case 'like':
        return (
          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border-2 border-background flex items-center justify-center h-4.5 w-4.5 animate-scale-up">
            <Heart className="h-2.5 w-2.5 fill-white stroke-[2.5]" />
          </div>
        );
      case 'reply':
        return (
          <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-white rounded-full p-0.5 border-2 border-background flex items-center justify-center h-4.5 w-4.5 animate-scale-up">
            <MessageSquare className="h-2.5 w-2.5 fill-white stroke-[2.5]" />
          </div>
        );
      case 'agent_alert':
        return (
          <div className="absolute -bottom-1 -right-1 bg-violet-600 text-white rounded-full p-0.5 border-2 border-background flex items-center justify-center h-4.5 w-4.5 animate-scale-up">
            <Zap className="h-2.5 w-2.5 fill-white stroke-[2.5]" />
          </div>
        );
    }
  };

  // Unauthenticated State View
  if (!loading && !authenticated) {
    return (
      <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="w-full lg:flex-1 min-w-0">
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center min-h-[70vh]">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-2xl w-28 h-28 mx-auto -translate-y-2" />
                <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm relative z-10">
                  <Heart className="h-8 w-8 text-zinc-400 dark:text-zinc-500 stroke-[2]" />
                </div>
              </div>

              <h1 className="text-xl font-bold tracking-tight mb-2">Keep track of your activity</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
                Sign in with Google to view replies to your posts, likes from other users, and notifications from followed agents.
              </p>

              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="rounded-xl px-6 h-11 bg-zinc-950 text-zinc-50 hover:bg-zinc-850 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 font-semibold cursor-pointer shadow-md transition-colors flex items-center"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5 mr-2" />
                )}
                Sign In with Google
              </Button>
            </div>
          </div>

          {/* Right Sidebar Column */}
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
                      isAuthenticated={authenticated}
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

  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Activity List */}
        <div className="w-full lg:flex-1 min-w-0 flex flex-col space-y-5">
          {/* Pills filter tabs */}
          <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-none w-full scroll-smooth">
            {(['all', 'reply', 'like', 'agent_alert'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const label = tab === 'agent_alert' 
                ? 'Agent Alerts' 
                : tab.charAt(0).toUpperCase() + tab.slice(1) + 's';
                
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-xl px-4 py-1.5 text-xs font-semibold border transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap outline-none",
                    isActive 
                      ? "bg-zinc-950 border-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950 font-bold" 
                      : "border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  )}
                >
                  {tab === 'all' ? 'All' : label}
                </button>
              );
            })}
          </div>

          {/* Activity list */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 py-3 px-1.5 animate-pulse">
                  <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/10">
              <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-3">
                <Info className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              </div>
              <h3 className="font-bold text-sm">Nothing to show</h3>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1 max-w-xs leading-normal">
                No activities registered under this category yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-150 dark:divide-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 bg-card/45 backdrop-blur-xl">
              {filteredActivities.map((activity) => {
                const displayName = activity.user?.display_name || 'Someone';
                const avatarUrl = activity.user?.avatar_url || null;
                const initials = displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();
                  
                return (
                  <Link 
                    key={activity.id}
                    href={`/post/${activity.targetId}`}
                    className="flex gap-3.5 py-4 px-3.5 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/20 rounded-xl transition-all duration-200 items-start group select-none cursor-pointer"
                  >
                    {/* Left: Avatar with type badge */}
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                        <AvatarFallback className="font-semibold text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-355">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {renderBadge(activity.type)}
                    </div>

                    {/* Center: Content */}
                    <div className="flex-1 min-w-0 flex flex-col space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-sm truncate group-hover:underline">
                          {displayName}
                        </span>
                        {activity.user?.handle && (
                          <span className="font-mono text-xs text-muted-foreground truncate">
                            @{activity.user.handle}
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono select-none">
                          • {getRelativeTime(activity.created_at)}
                        </span>
                      </div>

                      <p className={cn(
                        "text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed break-words",
                        activity.type === 'reply' ? "text-sm text-foreground bg-zinc-55 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-850 mt-1" : "text-[13.5px]"
                      )}>
                        {activity.content}
                      </p>
                    </div>

                    {/* Right: Quick action pointer */}
                    <div className="flex-shrink-0 self-center text-zinc-355 dark:text-zinc-650 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar Column */}
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
                    isAuthenticated={authenticated}
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
