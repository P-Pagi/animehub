export default function WatchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-pulse">
      {/* Video Player Skeleton */}
      <div className="w-full aspect-video rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-neutral-800" />
      </div>
      {/* Episode Title */}
      <div className="h-6 w-2/3 rounded-xl bg-neutral-800" />
      <div className="h-4 w-1/3 rounded bg-neutral-800" />
      {/* Episode List */}
      <div className="space-y-2">
        <div className="h-5 w-32 rounded bg-neutral-800" />
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-neutral-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
