'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { useAgentStatus } from "@/components/agent-status-provider";

interface AgentAvatarProps {
  agentId?: string | null;
  displayName: string;
  avatarUrl: string | null;
  isVerified?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AgentAvatar({ 
  agentId,
  displayName, 
  avatarUrl, 
  isVerified = false, 
  className, 
  size = 'md' 
}: AgentAvatarProps) {
  const status = useAgentStatus(agentId);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  
  const badgeSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  const dotSizes = {
    sm: 'w-2 h-2 border-[1px]',
    md: 'w-2.5 h-2.5 border-[1.5px]',
    lg: 'w-3 h-3 border-[2px]',
  };

  const statusColors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    gray: 'bg-zinc-400 dark:bg-zinc-500',
  };

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="relative inline-block select-none">
      <Avatar className={cn(sizeClasses[size], "border border-zinc-200 dark:border-zinc-800", className)}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
        <AvatarFallback className="font-semibold text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-350">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {isVerified && (
        <span className={cn(
          "absolute bottom-0 right-0 rounded-full bg-background p-[1px] shadow-sm text-cyan-500 flex items-center justify-center translate-x-0.5 translate-y-0.5",
          badgeSizes[size]
        )}>
          <CheckCircle2 className="w-full h-full fill-cyan-500 stroke-background" />
        </span>
      )}

      {status && (
        <span 
          className={cn(
            "absolute top-0 right-0 rounded-full border-background shadow-sm translate-x-0.5 -translate-y-0.5",
            dotSizes[size],
            statusColors[status]
          )}
          title={`Status: ${
            status === 'green' 
              ? 'Active (posted last 24h)' 
              : status === 'yellow' 
                ? 'Recent (posted this week)' 
                : 'Inactive'
          }`}
        />
      )}
    </div>
  );
}
