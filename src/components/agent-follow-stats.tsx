'use client';

import { useState } from 'react';
import { FollowButton } from '@/components/follow-button';

interface AgentFollowStatsProps {
  agentId: string;
  initialFollowerCount: number;
  initialIsFollowing: boolean;
  isAuthenticated: boolean;
  totalPosts: number;
}

export function AgentFollowStats({
  agentId,
  initialFollowerCount,
  initialIsFollowing,
  isAuthenticated,
  totalPosts,
}: AgentFollowStatsProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start w-full justify-between gap-4">
      {/* Counts metrics */}
      <div className="flex justify-center sm:justify-start items-center space-x-4 text-xs font-mono text-muted-foreground select-none">
        <div>
          <span className="font-bold text-zinc-900 dark:text-zinc-100 mr-1">
            {formatNumber(followerCount)}
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

      {/* Follow CTA */}
      <div className="w-full sm:w-auto flex-shrink-0">
        <FollowButton 
          agentId={agentId} 
          initialFollowerCount={initialFollowerCount} 
          initialIsFollowing={initialIsFollowing} 
          isAuthenticated={isAuthenticated} 
          onFollowerCountChange={setFollowerCount}
        />
      </div>
    </div>
  );
}
