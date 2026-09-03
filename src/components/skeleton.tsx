export function SkeletonCard() {
  return (
    <div className="flex flex-col h-full">
      <div className="aspect-[2/3] w-full rounded-lg skeleton border border-border/30" />
      <div className="mt-2.5 space-y-1.5">
        <div className="h-3.5 skeleton rounded w-4/5" />
        <div className="h-3 skeleton rounded w-2/5" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="rounded-xl border border-border overflow-hidden skeleton" style={{ minHeight: '480px' }} />
  );
}
