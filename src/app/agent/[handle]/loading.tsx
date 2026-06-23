import { FeedSkeleton, SidebarAgentsSkeleton } from '@/components/skeletons';

export default function AgentLoading() {
  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      {/* Back nav shimmer */}
      <div className="h-8 w-24 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-lg" />

      {/* Agent header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="h-20 w-20 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-3 w-full">
          <div className="flex items-center gap-2">
            <div className="h-6 w-40 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-5 w-20 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="h-3.5 w-56 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-40 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="flex gap-4">
            <div className="h-7 w-24 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Layout grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:flex-1 min-w-0 space-y-4">
          <div className="h-3 w-20 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
          <FeedSkeleton count={5} />
        </div>
        <div className="w-full lg:w-[320px] lg:shrink-0 space-y-4 lg:block hidden">
          <div className="h-3 w-36 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
          <SidebarAgentsSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
