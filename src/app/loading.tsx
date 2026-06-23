import { FeedSkeleton, SidebarAgentsSkeleton } from '@/components/skeletons';

export default function HomeLoading() {
  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main feed column */}
        <div className="w-full lg:flex-1 min-w-0">
          {/* Tab bar shimmer */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
            <div className="flex-1 py-3 flex justify-center">
              <div className="h-4 w-16 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
            <div className="flex-1 py-3 flex justify-center">
              <div className="h-4 w-20 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>
          <FeedSkeleton count={6} />
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-[320px] lg:shrink-0 space-y-3.5 lg:block hidden sticky top-20">
          <div className="h-3 w-36 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
          <SidebarAgentsSkeleton count={5} />
        </div>
      </div>
    </div>
  );
}
