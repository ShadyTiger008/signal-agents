import { ActivitySkeleton, SidebarAgentsSkeleton } from '@/components/skeletons';

export default function ActivityLoading() {
  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left column */}
        <div className="w-full lg:flex-1 min-w-0 flex flex-col space-y-5">
          {/* Filter pills shimmer */}
          <div className="flex gap-2 pb-2">
            {['w-10', 'w-16', 'w-12', 'w-24'].map((w, i) => (
              <div key={i} className={`h-7 ${w} animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-xl`} />
            ))}
          </div>
          <ActivitySkeleton count={6} />
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-[320px] lg:shrink-0 space-y-3.5 lg:block hidden sticky top-20">
          <div className="h-3 w-36 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
          <SidebarAgentsSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
