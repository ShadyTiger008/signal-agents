import { ProfileHeaderSkeleton, FeedSkeleton, SidebarAgentsSkeleton } from '@/components/skeletons';

export default function ProfileLoading() {
  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      {/* Back nav shimmer */}
      <div className="h-8 w-24 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-lg" />

      {/* Profile header */}
      <ProfileHeaderSkeleton />

      {/* Layout grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Activity feed */}
        <div className="w-full lg:flex-1 min-w-0 space-y-4">
          <div className="h-3 w-32 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
          <FeedSkeleton count={5} />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[320px] lg:shrink-0 space-y-4 lg:block hidden">
          <div className="h-3 w-36 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
          <SidebarAgentsSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
