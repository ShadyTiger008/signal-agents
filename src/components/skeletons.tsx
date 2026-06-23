import { cn } from '@/lib/utils';

// ---------- Base shimmer primitive ----------
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800',
        className
      )}
    />
  );
}

// ---------- Post Card Skeleton ----------
export function PostCardSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b border-zinc-100 dark:border-zinc-900">
      {/* Avatar */}
      <Shimmer className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2.5 pt-0.5">
        {/* Name + time row */}
        <div className="flex items-center gap-2">
          <Shimmer className="h-3.5 w-24 rounded" />
          <Shimmer className="h-3 w-10 rounded" />
        </div>
        {/* Content lines */}
        <div className="space-y-1.5">
          <Shimmer className="h-3.5 w-full rounded" />
          <Shimmer className="h-3.5 w-5/6 rounded" />
          <Shimmer className="h-3.5 w-3/4 rounded" />
        </div>
        {/* Action bar */}
        <div className="flex items-center gap-4 pt-1">
          <Shimmer className="h-6 w-14 rounded-full" />
          <Shimmer className="h-6 w-10 rounded-full" />
          <Shimmer className="h-6 w-14 rounded-full" />
          <Shimmer className="h-6 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ---------- Feed Skeleton (list of cards) ----------
export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-card/30">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------- Profile Header Skeleton ----------
export function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-zinc-200 dark:border-zinc-800">
      {/* Avatar */}
      <Shimmer className="h-20 w-20 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-3 w-full">
        {/* Name */}
        <Shimmer className="h-6 w-40 rounded" />
        {/* Email + joined */}
        <div className="flex gap-3">
          <Shimmer className="h-3.5 w-32 rounded" />
          <Shimmer className="h-3.5 w-24 rounded" />
        </div>
        {/* Stats row */}
        <div className="flex gap-6 pt-1">
          <div className="flex flex-col items-center gap-1">
            <Shimmer className="h-4 w-8 rounded" />
            <Shimmer className="h-3 w-10 rounded" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Shimmer className="h-4 w-8 rounded" />
            <Shimmer className="h-3 w-10 rounded" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Shimmer className="h-4 w-8 rounded" />
            <Shimmer className="h-3 w-16 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Agent Row Skeleton (sidebar) ----------
function AgentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Shimmer className="h-9 w-9 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Shimmer className="h-3.5 w-24 rounded" />
        <Shimmer className="h-3 w-16 rounded" />
      </div>
      <Shimmer className="h-7 w-16 rounded-xl flex-shrink-0" />
    </div>
  );
}

// ---------- Sidebar Agents Skeleton ----------
export function SidebarAgentsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-card/45 backdrop-blur-xl space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <AgentRowSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------- Activity Item Skeleton ----------
function ActivityItemSkeleton() {
  return (
    <div className="flex gap-3.5 py-4 px-3.5">
      <div className="relative flex-shrink-0">
        <Shimmer className="h-10 w-10 rounded-full" />
        <Shimmer className="absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5 pt-1">
        <div className="flex items-center gap-2">
          <Shimmer className="h-3.5 w-28 rounded" />
          <Shimmer className="h-3 w-8 rounded" />
        </div>
        <Shimmer className="h-3.5 w-full rounded" />
        <Shimmer className="h-3.5 w-2/3 rounded" />
      </div>
    </div>
  );
}

// ---------- Activity Feed Skeleton ----------
export function ActivitySkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-zinc-150 dark:divide-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 bg-card/45 backdrop-blur-xl">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------- Search Skeleton ----------
export function SearchSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search bar shimmer */}
      <Shimmer className="h-12 w-full rounded-2xl" />
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:flex-1 min-w-0 space-y-3">
          <Shimmer className="h-4 w-32 rounded" />
          <div className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-card/30">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-900">
                <Shimmer className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Shimmer className="h-3.5 w-32 rounded" />
                  <Shimmer className="h-3 w-20 rounded" />
                </div>
                <Shimmer className="h-7 w-16 rounded-xl flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-[320px] lg:shrink-0 lg:block hidden">
          <SidebarAgentsSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}

// ---------- Post Detail Skeleton ----------
export function PostDetailSkeleton() {
  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      <Shimmer className="h-8 w-24 rounded-lg" />
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 bg-card/30">
        <div className="flex gap-3">
          <Shimmer className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Shimmer className="h-4 w-36 rounded" />
            <Shimmer className="h-3 w-20 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <Shimmer className="h-4 w-full rounded" />
          <Shimmer className="h-4 w-full rounded" />
          <Shimmer className="h-4 w-4/5 rounded" />
          <Shimmer className="h-4 w-3/5 rounded" />
        </div>
        <div className="flex gap-4">
          <Shimmer className="h-8 w-16 rounded-full" />
          <Shimmer className="h-8 w-12 rounded-full" />
          <Shimmer className="h-8 w-16 rounded-full" />
        </div>
      </div>
      {/* Replies */}
      <div className="space-y-3">
        <Shimmer className="h-3 w-20 rounded" />
        <FeedSkeleton count={3} />
      </div>
    </div>
  );
}
