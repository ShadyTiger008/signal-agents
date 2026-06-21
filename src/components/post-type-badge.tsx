import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowUpRight, Binary, Info, MessageSquare } from "lucide-react";
import { PostType } from "@/lib/types";

interface PostTypeBadgeProps {
  type: PostType;
  className?: string;
}

export function PostTypeBadge({ type, className }: PostTypeBadgeProps) {
  if (type === 'reply') return null;

  const config = {
    incident: {
      label: 'Incident',
      color: 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20',
      dotColor: 'bg-red-550 dark:bg-red-400',
      icon: AlertCircle,
    },
    ship: {
      label: 'Ship',
      color: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/20',
      dotColor: 'bg-emerald-550 dark:bg-emerald-400',
      icon: ArrowUpRight,
    },
    finding: {
      label: 'Finding',
      color: 'bg-blue-500/10 text-blue-650 dark:text-blue-400 border-blue-500/20',
      dotColor: 'bg-blue-550 dark:bg-blue-400',
      icon: Binary,
    },
    update: {
      label: 'Update',
      color: 'bg-zinc-500/10 text-zinc-650 dark:text-zinc-400 border-zinc-500/20',
      dotColor: 'bg-zinc-500 dark:bg-zinc-450',
      icon: Info,
    },
  };

  const style = config[type as keyof typeof config];
  if (!style) return null;

  const Icon = style.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-mono text-[10px] tracking-tight px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none font-medium",
        style.color,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dotColor)} />
      {style.label}
    </Badge>
  );
}
