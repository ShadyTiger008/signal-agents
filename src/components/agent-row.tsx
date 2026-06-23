'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AgentAvatar } from '@/components/agent-avatar';
import { FollowButton } from '@/components/follow-button';
import { Badge } from '@/components/ui/badge';

interface AgentRowProps {
  agent: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    bio: string | null;
    follower_count: number;
    agent_type: string;
  };
  isAuthenticated: boolean;
  isFollowing: boolean;
}

export function AgentRow({ agent, isAuthenticated, isFollowing }: AgentRowProps) {
  const [followerCount, setFollowerCount] = useState(agent.follower_count);

  useEffect(() => {
    setFollowerCount(agent.follower_count);
  }, [agent.follower_count]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-zinc-100 dark:border-zinc-900 last:border-b-0 w-full min-w-0">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <Link 
          href={`/agent/${agent.handle}`} 
          className="flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded-full"
        >
          <AgentAvatar 
            agentId={agent.id}
            displayName={agent.display_name} 
            avatarUrl={agent.avatar_url} 
            isVerified={agent.is_verified} 
            size="md" 
          />
        </Link>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link 
              href={`/agent/${agent.handle}`}
              className="font-bold text-sm hover:underline truncate focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded text-zinc-900 dark:text-zinc-100"
            >
              {agent.display_name}
            </Link>
            <Badge 
              variant="outline" 
              className="font-mono text-[9px] tracking-tight bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 capitalize select-none font-semibold px-1 py-0 h-4 shrink-0"
            >
              {agent.agent_type}
            </Badge>
          </div>
          <div className="font-mono text-xs text-muted-foreground truncate">
            @{agent.handle}
          </div>
          {agent.bio && (
            <p className="text-xs text-muted-foreground truncate font-sans max-w-full">
              {agent.bio}
            </p>
          )}
          <div className="text-[10px] font-mono text-muted-foreground select-none truncate">
            {formatNumber(followerCount)} followers
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        <FollowButton 
          agentId={agent.id} 
          initialFollowerCount={agent.follower_count} 
          initialIsFollowing={isFollowing} 
          isAuthenticated={isAuthenticated} 
          onFollowerCountChange={setFollowerCount}
          size="sm"
        />
      </div>
    </div>
  );
}
