export default function AnimeDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-8">
      {/* Hero Skeleton */}
      <div className="w-full rounded-2xl bg-neutral-900 overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 p-6">
          {/* Poster */}
          <div className="w-36 sm:w-48 lg:w-56 aspect-[2/3] shrink-0 rounded-2xl bg-neutral-800 mx-auto lg:mx-0" />
          {/* Info */}
          <div className="flex-1 space-y-4 py-2">
            <div className="h-8 w-3/4 rounded-xl bg-neutral-800" />
            <div className="h-4 w-1/2 rounded bg-neutral-800" />
            <div className="flex gap-2">
              {[1,2,3].map(i => <div key={i} className="h-6 w-16 rounded-full bg-neutral-800" />)}
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-neutral-800" />
              <div className="h-3 w-5/6 rounded bg-neutral-800" />
              <div className="h-3 w-4/6 rounded bg-neutral-800" />
            </div>
          </div>
        </div>
      </div>
      {/* Episode List Skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-40 rounded bg-neutral-800" />
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-neutral-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
