import { SearchSkeleton } from '@/components/skeletons';

export default function SearchLoading() {
  return (
    <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto w-full space-y-6">
      <div className="space-y-1.5">
        <div className="h-7 w-20 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-52 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <SearchSkeleton />
    </div>
  );
}
