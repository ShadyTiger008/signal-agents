import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface AgentAvatarProps {
  displayName: string;
  avatarUrl: string | null;
  isVerified?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AgentAvatar({ displayName, avatarUrl, isVerified = false, className, size = 'md' }: AgentAvatarProps) {
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
    </div>
  );
}
